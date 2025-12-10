-- ============================================================================
-- Queue Processing with pg_cron and pg_net
--
-- This migration sets up scheduled queue processing using:
-- - pg_cron: Schedules jobs to run at regular intervals
-- - pg_net: Makes HTTP calls to Edge Functions from within PostgreSQL
--
-- PURPOSE: Ensure reliable processing of sync_queue items even if
--          fire-and-forget triggers fail. This is the "belt and suspenders"
--          approach to queue reliability.
--
-- SCHEDULE: Every 1 minute, process pending queue items
-- ============================================================================

-- Enable required extensions (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ============================================================================
-- FUNCTION: Trigger queue processing via HTTP
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_bubble_sync_queue()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  supabase_url text;
  service_role_key text;
  pending_count integer;
BEGIN
  -- Get configuration from app settings
  supabase_url := current_setting('app.settings.supabase_url', true);
  service_role_key := current_setting('app.settings.service_role_key', true);

  -- Check if we have pending items to process
  SELECT COUNT(*) INTO pending_count
  FROM sync_queue
  WHERE status IN ('pending', 'failed')
    AND (next_retry_at IS NULL OR next_retry_at <= NOW())
    AND (retry_count < max_retries OR max_retries IS NULL);

  -- Only trigger if there are items to process
  IF pending_count > 0 THEN
    RAISE LOG 'trigger_bubble_sync_queue: Found % pending items, triggering processing', pending_count;

    -- Make HTTP call to bubble_sync Edge Function using pg_net
    PERFORM net.http_post(
      url := supabase_url || '/functions/v1/bubble_sync',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || service_role_key,
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object(
        'action', 'process_queue_data_api',
        'payload', jsonb_build_object('batch_size', 10)
      )
    );
  ELSE
    RAISE LOG 'trigger_bubble_sync_queue: No pending items, skipping';
  END IF;

EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail - cron will retry next interval
    RAISE WARNING 'trigger_bubble_sync_queue failed: %', SQLERRM;
END;
$$;

-- ============================================================================
-- CRON JOB: Process queue every 1 minute
-- ============================================================================

-- Remove existing job if it exists (for idempotent migrations)
SELECT cron.unschedule('process-bubble-sync-queue')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'process-bubble-sync-queue'
);

-- Schedule new cron job: every minute
SELECT cron.schedule(
  'process-bubble-sync-queue',  -- job name
  '* * * * *',                   -- every minute
  'SELECT trigger_bubble_sync_queue()'
);

-- ============================================================================
-- FUNCTION: Cleanup old completed/skipped queue items
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_old_queue_items()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count integer;
BEGIN
  -- Delete completed items older than 7 days
  WITH deleted AS (
    DELETE FROM sync_queue
    WHERE status IN ('completed', 'skipped')
      AND processed_at < NOW() - INTERVAL '7 days'
    RETURNING *
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;

  IF deleted_count > 0 THEN
    RAISE LOG 'cleanup_old_queue_items: Deleted % old items', deleted_count;
  END IF;

  -- Delete failed items older than 30 days (after max retries)
  WITH deleted AS (
    DELETE FROM sync_queue
    WHERE status = 'failed'
      AND retry_count >= COALESCE(max_retries, 3)
      AND processed_at < NOW() - INTERVAL '30 days'
    RETURNING *
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;

  IF deleted_count > 0 THEN
    RAISE LOG 'cleanup_old_queue_items: Deleted % permanently failed items', deleted_count;
  END IF;

EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'cleanup_old_queue_items failed: %', SQLERRM;
END;
$$;

-- ============================================================================
-- CRON JOB: Cleanup every day at 3 AM
-- ============================================================================

-- Remove existing cleanup job if it exists
SELECT cron.unschedule('cleanup-sync-queue')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'cleanup-sync-queue'
);

-- Schedule cleanup job: daily at 3 AM
SELECT cron.schedule(
  'cleanup-sync-queue',      -- job name
  '0 3 * * *',               -- 3 AM every day
  'SELECT cleanup_old_queue_items()'
);

-- ============================================================================
-- TRIGGER: Notify on new queue items (optional - for immediate processing)
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_new_queue_item()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Notify the cron system that there's work to do
  -- This is optional - the cron job will pick it up anyway
  PERFORM pg_notify('sync_queue_insert', NEW.id::text);
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS sync_queue_insert_trigger ON sync_queue;

-- Create trigger for new inserts
CREATE TRIGGER sync_queue_insert_trigger
  AFTER INSERT ON sync_queue
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_queue_item();

-- ============================================================================
-- VIEW: Queue status monitoring
-- ============================================================================

CREATE OR REPLACE VIEW sync_queue_status AS
SELECT
  status,
  COUNT(*) as count,
  MIN(created_at) as oldest,
  MAX(created_at) as newest,
  AVG(retry_count) as avg_retries
FROM sync_queue
GROUP BY status;

-- ============================================================================
-- GRANTS: Ensure proper permissions
-- ============================================================================

-- Grant execute on functions to the service role
GRANT EXECUTE ON FUNCTION trigger_bubble_sync_queue() TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_old_queue_items() TO service_role;
GRANT EXECUTE ON FUNCTION notify_new_queue_item() TO service_role;

-- ============================================================================
-- CONFIGURATION: Set app settings (run once manually)
--
-- IMPORTANT: These settings must be configured in Supabase Dashboard
-- or via SQL Editor. Replace with actual values:
--
-- ALTER DATABASE postgres SET app.settings.supabase_url = 'https://your-project.supabase.co';
-- ALTER DATABASE postgres SET app.settings.service_role_key = 'your-service-role-key';
-- ============================================================================

-- Log completion
DO $$
BEGIN
  RAISE LOG 'Queue processing cron jobs configured successfully';
  RAISE LOG 'Jobs scheduled:';
  RAISE LOG '  - process-bubble-sync-queue: every minute';
  RAISE LOG '  - cleanup-sync-queue: daily at 3 AM';
END $$;
