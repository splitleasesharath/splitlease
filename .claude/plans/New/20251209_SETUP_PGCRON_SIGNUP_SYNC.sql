-- ============================================================================
-- Setup pg_cron for Signup to Bubble Sync
-- Date: 2025-12-09
-- Purpose: Schedule automated processing of signup sync queue
-- ============================================================================
--
-- IMPORTANT: Run this in Supabase SQL Editor
--
-- Prerequisites:
-- - sync_queue table exists (from earlier migrations)
-- - bubble_sync Edge Function deployed
-- - BUBBLE_API_BASE_URL and BUBBLE_API_KEY configured in Edge Function secrets
--
-- This will:
-- 1. Verify sync_queue table exists
-- 2. Enable pg_cron and pg_net extensions
-- 3. Create vault secrets for pg_net authentication
-- 4. Create functions to invoke bubble_sync Edge Function
-- 5. Schedule pg_cron jobs to process queue every minute
-- ============================================================================

-- ============================================================================
-- STEP 1: Verify sync_queue table exists
-- ============================================================================

-- Check if sync_queue exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'sync_queue') THEN
        RAISE EXCEPTION 'sync_queue table does not exist. Please apply migration 20251205_create_sync_queue_tables.sql first';
    END IF;
    RAISE NOTICE '✅ sync_queue table exists';
END $$;

-- ============================================================================
-- STEP 2: Enable required extensions
-- ============================================================================

-- Enable pg_cron (for scheduled jobs)
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

-- Enable pg_net (for HTTP calls to Edge Functions)
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Verify extensions
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_extension WHERE extname = 'pg_cron') THEN
        RAISE EXCEPTION 'pg_cron extension failed to install';
    END IF;
    IF NOT EXISTS (SELECT FROM pg_extension WHERE extname = 'pg_net') THEN
        RAISE EXCEPTION 'pg_net extension failed to install';
    END IF;
    RAISE NOTICE '✅ pg_cron and pg_net extensions enabled';
END $$;

-- ============================================================================
-- STEP 3: Create vault secrets
-- ============================================================================
--
-- CRITICAL: Replace the placeholder values below with your actual values:
-- - YOUR-PROJECT-REF: Your Supabase project reference (e.g., abcdefghijk)
-- - YOUR-SERVICE-ROLE-KEY: Your service_role key from Supabase Dashboard
--
-- Find these at: https://app.supabase.com/project/YOUR-PROJECT/settings/api
-- ============================================================================

-- IMPORTANT: Uncomment and modify the lines below with your actual values

-- SELECT vault.create_secret(
--     'https://YOUR-PROJECT-REF.supabase.co',
--     'supabase_url',
--     'Supabase project URL for pg_net calls to Edge Functions'
-- );

-- SELECT vault.create_secret(
--     'YOUR-SERVICE-ROLE-KEY',
--     'service_role_key',
--     'Service role key for authenticating Edge Function calls from pg_net'
-- );

-- Verify secrets were created (uncomment after creating secrets)
-- SELECT name, description FROM vault.secrets WHERE name IN ('supabase_url', 'service_role_key');

-- ============================================================================
-- STEP 4: Create function to invoke bubble_sync Edge Function via pg_net
-- ============================================================================

CREATE OR REPLACE FUNCTION invoke_bubble_sync_processor()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    response_id BIGINT;
    supabase_url TEXT;
    service_role_key TEXT;
    pending_count INTEGER;
BEGIN
    -- Check if there are pending items
    SELECT COUNT(*) INTO pending_count
    FROM sync_queue
    WHERE status = 'pending'
      AND operation IN ('SIGNUP_ATOMIC', 'INSERT', 'UPDATE');

    -- Exit early if no pending items
    IF pending_count = 0 THEN
        RAISE NOTICE '[bubble_sync_processor] No pending items in queue';
        RETURN;
    END IF;

    RAISE NOTICE '[bubble_sync_processor] Found % pending items, invoking Edge Function', pending_count;

    -- Get secrets from vault
    SELECT decrypted_secret INTO supabase_url
    FROM vault.decrypted_secrets
    WHERE name = 'supabase_url';

    SELECT decrypted_secret INTO service_role_key
    FROM vault.decrypted_secrets
    WHERE name = 'service_role_key';

    -- Validate secrets exist
    IF supabase_url IS NULL OR service_role_key IS NULL THEN
        RAISE WARNING '[bubble_sync_processor] Vault secrets not configured. Please create supabase_url and service_role_key';
        RETURN;
    END IF;

    -- Invoke bubble_sync Edge Function via pg_net
    SELECT net.http_post(
        url := supabase_url || '/functions/v1/bubble_sync',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || service_role_key
        ),
        body := jsonb_build_object(
            'action', 'process_queue_data_api',
            'payload', jsonb_build_object(
                'limit', 10,
                'batch_size', 5
            )
        ),
        timeout_milliseconds := 30000
    ) INTO response_id;

    RAISE NOTICE '[bubble_sync_processor] Edge Function invoked, request ID: %', response_id;
END;
$$;

COMMENT ON FUNCTION invoke_bubble_sync_processor() IS 'Invokes bubble_sync Edge Function to process pending sync_queue items (main processor)';

-- ============================================================================
-- STEP 5: Create function to retry failed items
-- ============================================================================

CREATE OR REPLACE FUNCTION invoke_bubble_sync_retry()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    response_id BIGINT;
    supabase_url TEXT;
    service_role_key TEXT;
    failed_count INTEGER;
BEGIN
    -- Check if there are failed items ready for retry
    SELECT COUNT(*) INTO failed_count
    FROM sync_queue
    WHERE status = 'failed'
      AND retry_count < max_retries
      AND (next_retry_at IS NULL OR next_retry_at <= NOW());

    -- Exit early if no failed items
    IF failed_count = 0 THEN
        RAISE NOTICE '[bubble_sync_retry] No failed items to retry';
        RETURN;
    END IF;

    RAISE NOTICE '[bubble_sync_retry] Found % failed items to retry', failed_count;

    -- Get secrets from vault
    SELECT decrypted_secret INTO supabase_url
    FROM vault.decrypted_secrets
    WHERE name = 'supabase_url';

    SELECT decrypted_secret INTO service_role_key
    FROM vault.decrypted_secrets
    WHERE name = 'service_role_key';

    -- Validate secrets exist
    IF supabase_url IS NULL OR service_role_key IS NULL THEN
        RAISE WARNING '[bubble_sync_retry] Vault secrets not configured';
        RETURN;
    END IF;

    -- Invoke bubble_sync Edge Function to retry failed items
    SELECT net.http_post(
        url := supabase_url || '/functions/v1/bubble_sync',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || service_role_key
        ),
        body := jsonb_build_object(
            'action', 'retry_failed',
            'payload', jsonb_build_object()
        ),
        timeout_milliseconds := 30000
    ) INTO response_id;

    RAISE NOTICE '[bubble_sync_retry] Retry request sent, ID: %', response_id;
END;
$$;

COMMENT ON FUNCTION invoke_bubble_sync_retry() IS 'Invokes bubble_sync Edge Function to retry failed sync items';

-- ============================================================================
-- STEP 6: Schedule pg_cron jobs
-- ============================================================================

-- Remove existing jobs if they exist (idempotent)
SELECT cron.unschedule('bubble-sync-processor') WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'bubble-sync-processor'
);

SELECT cron.unschedule('bubble-sync-retry') WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'bubble-sync-retry'
);

-- Schedule main processor - runs every minute
SELECT cron.schedule(
    'bubble-sync-processor',
    '* * * * *',  -- Every minute
    $$SELECT invoke_bubble_sync_processor()$$
);

-- Schedule retry processor - runs every 5 minutes
SELECT cron.schedule(
    'bubble-sync-retry',
    '*/5 * * * *',  -- Every 5 minutes
    $$SELECT invoke_bubble_sync_retry()$$
);

-- ============================================================================
-- STEP 7: Verify setup
-- ============================================================================

-- Check scheduled jobs
SELECT
    jobid,
    jobname,
    schedule,
    active,
    database
FROM cron.job
WHERE jobname LIKE 'bubble-sync%'
ORDER BY jobname;

-- Check sync_queue status
SELECT
    status,
    operation,
    COUNT(*) as count,
    MIN(created_at) as oldest_item,
    MAX(created_at) as newest_item
FROM sync_queue
GROUP BY status, operation
ORDER BY status, operation;

-- ============================================================================
-- STEP 8: Manual test (optional)
-- ============================================================================

-- Manually trigger the processor to test immediately
-- Uncomment to run:
-- SELECT invoke_bubble_sync_processor();

-- Check pg_net response status
-- SELECT * FROM net.http_request_queue ORDER BY id DESC LIMIT 5;

-- ============================================================================
-- DONE
-- ============================================================================

-- Summary of what was created:
-- ✅ pg_cron extension enabled
-- ✅ pg_net extension enabled
-- ✅ invoke_bubble_sync_processor() function created
-- ✅ invoke_bubble_sync_retry() function created
-- ✅ bubble-sync-processor cron job scheduled (every minute)
-- ✅ bubble-sync-retry cron job scheduled (every 5 minutes)

-- Next steps:
-- 1. ⚠️  UNCOMMENT and RUN Step 3 with your actual Supabase URL and service_role key
-- 2. Wait 1 minute for first cron run
-- 3. Check sync_queue status to verify processing
-- 4. Test with a new signup
