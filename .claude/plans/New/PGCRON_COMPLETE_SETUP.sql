-- ============================================================================
-- pg_cron Complete Setup for Signup Sync
-- Date: 2025-12-09
-- This script should be executed in Supabase SQL Editor in order
-- ============================================================================

-- ============================================================================
-- SECTION 1: Verify Prerequisites
-- ============================================================================

-- Verify sync_queue table exists
SELECT EXISTS (SELECT FROM pg_tables WHERE tablename = 'sync_queue') as "✓ sync_queue_exists";

-- ============================================================================
-- SECTION 2: Enable Required Extensions
-- ============================================================================

-- Enable pg_cron (for scheduled jobs)
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

-- Enable pg_net (for HTTP calls to Edge Functions)
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- ============================================================================
-- SECTION 3: Verify Extensions Are Enabled
-- ============================================================================

SELECT extname FROM pg_extension WHERE extname IN ('pg_cron', 'pg_net');

-- ============================================================================
-- SECTION 4: Create invoke_bubble_sync_processor() Function
-- ============================================================================
-- This function:
-- 1. Checks for pending items in sync_queue
-- 2. Retrieves vault secrets (supabase_url, service_role_key)
-- 3. Invokes bubble_sync Edge Function via pg_net
-- 4. Processes up to 10 items with batch size of 5
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
-- SECTION 5: Create invoke_bubble_sync_retry() Function
-- ============================================================================
-- This function:
-- 1. Checks for failed items ready for retry
-- 2. Verifies retry_count < max_retries
-- 3. Checks next_retry_at timestamp
-- 4. Invokes bubble_sync Edge Function with retry_failed action
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
-- SECTION 6: Unschedule Existing Jobs (if any)
-- ============================================================================

SELECT cron.unschedule('bubble-sync-processor') WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'bubble-sync-processor'
);

SELECT cron.unschedule('bubble-sync-retry') WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'bubble-sync-retry'
);

-- ============================================================================
-- SECTION 7: Schedule New Cron Jobs
-- ============================================================================

-- Main processor - runs every minute
SELECT cron.schedule(
    'bubble-sync-processor',
    '* * * * *',
    $$SELECT invoke_bubble_sync_processor()$$
);

-- Retry processor - runs every 5 minutes
SELECT cron.schedule(
    'bubble-sync-retry',
    '*/5 * * * *',
    $$SELECT invoke_bubble_sync_retry()$$
);

-- ============================================================================
-- SECTION 8: Verify Setup
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

-- Check vault secrets exist
SELECT name, description FROM vault.secrets WHERE name IN ('supabase_url', 'service_role_key');

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
-- SECTION 9: Manual Test (Uncomment to run)
-- ============================================================================

-- Manually trigger the processor to test immediately
-- SELECT invoke_bubble_sync_processor();

-- Check pg_net response status
-- SELECT * FROM net.http_request_queue ORDER BY id DESC LIMIT 5;

-- ============================================================================
-- DONE
-- ============================================================================
-- Summary of what was created:
-- ✓ pg_cron extension enabled
-- ✓ pg_net extension enabled
-- ✓ invoke_bubble_sync_processor() function created
-- ✓ invoke_bubble_sync_retry() function created
-- ✓ bubble-sync-processor cron job scheduled (every minute)
-- ✓ bubble-sync-retry cron job scheduled (every 5 minutes)

-- Next steps:
-- 1. Copy this entire script into Supabase SQL Editor
-- 2. Execute it (will run all sections in order)
-- 3. Check the results in Section 8 to verify setup
-- 4. Wait 1 minute for first cron run
-- 5. Check function logs to confirm processing
