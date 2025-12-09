-- ============================================================================
-- Migration: Listing Bubble Sync Backend (pg_cron + pg_net)
-- Created: 2025-12-09
-- Purpose: Enable fully backend-driven sync from Supabase to Bubble for listings
--
-- This migration sets up:
-- 1. Database trigger to auto-queue new listings to sync_queue
-- 2. pg_cron job to periodically process the queue
-- 3. pg_net to invoke bubble_sync Edge Function from the database
--
-- Flow:
-- listingService.js INSERT → trigger → sync_queue → pg_cron → pg_net → Edge Function → Bubble
-- ============================================================================

-- ============================================================================
-- PART 1: Database Trigger - Auto-queue listing INSERTs
-- Only fires when bubble_id IS NULL (new Supabase-originated listings)
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_listing_sync_queue()
RETURNS TRIGGER AS $$
BEGIN
    -- Only queue if bubble_id is NULL (not yet synced to Bubble)
    IF NEW.bubble_id IS NULL THEN
        -- Insert into sync_queue
        INSERT INTO sync_queue (
            table_name,
            record_id,
            operation,
            payload,
            status,
            idempotency_key
        ) VALUES (
            'listing',
            NEW._id,
            'INSERT',
            to_jsonb(NEW),
            'pending',
            'listing:' || NEW._id || ':' || extract(epoch from now())::text
        )
        ON CONFLICT ON CONSTRAINT idx_sync_queue_pending_unique
        DO UPDATE SET
            payload = EXCLUDED.payload,
            created_at = NOW();

        RAISE NOTICE '[trigger_listing_sync_queue] Queued listing % for Bubble sync', NEW._id;
    ELSE
        RAISE NOTICE '[trigger_listing_sync_queue] Listing % already has bubble_id, skipping queue', NEW._id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger on listing table
DROP TRIGGER IF EXISTS listing_bubble_sync_trigger ON listing;
CREATE TRIGGER listing_bubble_sync_trigger
    AFTER INSERT ON listing
    FOR EACH ROW
    EXECUTE FUNCTION trigger_listing_sync_queue();

COMMENT ON FUNCTION trigger_listing_sync_queue() IS 'Auto-queues new listings to sync_queue for Bubble sync when bubble_id is NULL';
COMMENT ON TRIGGER listing_bubble_sync_trigger ON listing IS 'Fires after listing INSERT to queue for Bubble sync';

-- ============================================================================
-- PART 2: Enable sync_config for listing table
-- ============================================================================

UPDATE sync_config
SET enabled = TRUE, sync_on_insert = TRUE
WHERE supabase_table = 'listing';

-- If no config exists, create it
INSERT INTO sync_config (supabase_table, bubble_workflow, bubble_object_type, enabled, sync_on_insert, sync_on_update, sync_on_delete)
VALUES ('listing', 'sync_listing_from_supabase', 'listing', TRUE, TRUE, FALSE, FALSE)
ON CONFLICT (supabase_table) DO UPDATE SET
    enabled = TRUE,
    sync_on_insert = TRUE;

-- ============================================================================
-- PART 3: Enable pg_cron and pg_net extensions
-- These should already be available in Supabase but ensure they're enabled
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- ============================================================================
-- PART 4: pg_cron Function - Invoke bubble_sync Edge Function
-- ============================================================================

CREATE OR REPLACE FUNCTION invoke_bubble_sync_processor()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    pending_count INTEGER;
    supabase_url TEXT;
    service_key TEXT;
    response_id BIGINT;
BEGIN
    -- Check if there are pending items
    SELECT COUNT(*) INTO pending_count
    FROM sync_queue
    WHERE status = 'pending'
    OR (status = 'failed' AND retry_count < max_retries AND (next_retry_at IS NULL OR next_retry_at <= NOW()));

    IF pending_count = 0 THEN
        -- No pending items, skip silently
        RETURN;
    END IF;

    RAISE NOTICE '[bubble_sync_cron] Found % pending items, invoking Edge Function', pending_count;

    -- Get credentials from vault
    SELECT decrypted_secret INTO supabase_url
    FROM vault.decrypted_secrets
    WHERE name = 'supabase_url';

    SELECT decrypted_secret INTO service_key
    FROM vault.decrypted_secrets
    WHERE name = 'service_role_key';

    IF supabase_url IS NULL OR service_key IS NULL THEN
        RAISE WARNING '[bubble_sync_cron] Missing vault secrets (supabase_url or service_role_key), cannot invoke Edge Function';
        RETURN;
    END IF;

    -- Invoke Edge Function via pg_net (async, non-blocking)
    SELECT net.http_post(
        url := supabase_url || '/functions/v1/bubble_sync',
        headers := jsonb_build_object(
            'Authorization', 'Bearer ' || service_key,
            'Content-Type', 'application/json'
        ),
        body := jsonb_build_object(
            'action', 'process_queue_data_api',
            'payload', jsonb_build_object('batch_size', 10)
        ),
        timeout_milliseconds := 30000
    ) INTO response_id;

    RAISE NOTICE '[bubble_sync_cron] Edge Function invoked, request ID: %', response_id;
END;
$$;

COMMENT ON FUNCTION invoke_bubble_sync_processor() IS 'Invokes bubble_sync Edge Function via pg_net when sync_queue has pending items';

-- ============================================================================
-- PART 5: pg_cron Function - Retry failed items
-- ============================================================================

CREATE OR REPLACE FUNCTION invoke_bubble_sync_retry()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    failed_count INTEGER;
    supabase_url TEXT;
    service_key TEXT;
    response_id BIGINT;
BEGIN
    -- Check if there are failed items ready for retry
    SELECT COUNT(*) INTO failed_count
    FROM sync_queue
    WHERE status = 'failed'
    AND retry_count < max_retries
    AND (next_retry_at IS NULL OR next_retry_at <= NOW());

    IF failed_count = 0 THEN
        RETURN;
    END IF;

    RAISE NOTICE '[bubble_sync_retry] Found % failed items ready for retry', failed_count;

    -- Get credentials from vault
    SELECT decrypted_secret INTO supabase_url
    FROM vault.decrypted_secrets WHERE name = 'supabase_url';

    SELECT decrypted_secret INTO service_key
    FROM vault.decrypted_secrets WHERE name = 'service_role_key';

    IF supabase_url IS NULL OR service_key IS NULL THEN
        RETURN;
    END IF;

    -- Invoke retry action
    SELECT net.http_post(
        url := supabase_url || '/functions/v1/bubble_sync',
        headers := jsonb_build_object(
            'Authorization', 'Bearer ' || service_key,
            'Content-Type', 'application/json'
        ),
        body := jsonb_build_object(
            'action', 'retry_failed',
            'payload', jsonb_build_object('batch_size', 5)
        ),
        timeout_milliseconds := 30000
    ) INTO response_id;

    RAISE NOTICE '[bubble_sync_retry] Retry request sent, ID: %', response_id;
END;
$$;

COMMENT ON FUNCTION invoke_bubble_sync_retry() IS 'Invokes bubble_sync Edge Function to retry failed sync items';

-- ============================================================================
-- PART 6: Schedule pg_cron jobs
--
-- Note: pg_cron minimum granularity is 1 minute
-- We schedule the main processor every minute
-- Retry job runs every 5 minutes
-- ============================================================================

-- Remove existing jobs if they exist (idempotent)
SELECT cron.unschedule('bubble-sync-processor') WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'bubble-sync-processor'
);

SELECT cron.unschedule('bubble-sync-retry') WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'bubble-sync-retry'
);

-- Schedule main processor - every minute
SELECT cron.schedule(
    'bubble-sync-processor',
    '* * * * *',  -- Every minute
    $$SELECT invoke_bubble_sync_processor()$$
);

-- Schedule retry processor - every 5 minutes
SELECT cron.schedule(
    'bubble-sync-retry',
    '*/5 * * * *',  -- Every 5 minutes
    $$SELECT invoke_bubble_sync_retry()$$
);

-- ============================================================================
-- PART 7: Monitoring view
-- ============================================================================

CREATE OR REPLACE VIEW sync_queue_status AS
SELECT
    status,
    table_name,
    COUNT(*) as count,
    MIN(created_at) as oldest,
    MAX(created_at) as newest
FROM sync_queue
GROUP BY status, table_name
ORDER BY status, table_name;

COMMENT ON VIEW sync_queue_status IS 'Quick view of sync_queue status counts by table and status';

-- ============================================================================
-- PART 8: Vault secrets reminder
--
-- NOTE: You must manually create these secrets in the Supabase Dashboard
-- or via SQL Editor (DO NOT include actual keys in migration files!)
--
-- Run these commands separately in Supabase SQL Editor:
--
-- SELECT vault.create_secret(
--     'https://<YOUR-PROJECT-REF>.supabase.co',
--     'supabase_url',
--     'Supabase project URL for pg_net calls'
-- );
--
-- SELECT vault.create_secret(
--     '<YOUR-SERVICE-ROLE-KEY>',
--     'service_role_key',
--     'Service role key for Edge Function authentication'
-- );
-- ============================================================================

-- ============================================================================
-- DONE - Summary
--
-- Created:
-- - trigger_listing_sync_queue() function
-- - listing_bubble_sync_trigger on listing table
-- - invoke_bubble_sync_processor() function for pg_cron
-- - invoke_bubble_sync_retry() function for pg_cron
-- - bubble-sync-processor cron job (every minute)
-- - bubble-sync-retry cron job (every 5 minutes)
-- - sync_queue_status view
--
-- Required manual setup:
-- - Create vault secrets: supabase_url, service_role_key
-- ============================================================================
