-- Migration: Create pg_cron job to restore throttle ability after 24 hours
-- Runs every hour to check for blocked users whose 24-hour period has expired

-- Ensure pg_cron extension is enabled (should already be enabled in Supabase)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create function to restore throttle abilities
CREATE OR REPLACE FUNCTION restore_expired_throttle_blocks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_count integer;
BEGIN
  -- Update leases where guest has been blocked for more than 24 hours
  UPDATE bookings_leases
  SET
    "Throttling - guest ability to create requests?" = true,
    "Throttling - guest blocked at" = NULL
  WHERE
    "Throttling - guest ability to create requests?" = false
    AND "Throttling - guest blocked at" IS NOT NULL
    AND "Throttling - guest blocked at" < NOW() - INTERVAL '24 hours';

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  IF updated_count > 0 THEN
    RAISE NOTICE 'Restored % guest throttle blocks', updated_count;
  END IF;

  -- Update leases where host has been blocked for more than 24 hours
  UPDATE bookings_leases
  SET
    "Throttling - host ability to create requests?" = true,
    "Throttling - host blocked at" = NULL
  WHERE
    "Throttling - host ability to create requests?" = false
    AND "Throttling - host blocked at" IS NOT NULL
    AND "Throttling - host blocked at" < NOW() - INTERVAL '24 hours';

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  IF updated_count > 0 THEN
    RAISE NOTICE 'Restored % host throttle blocks', updated_count;
  END IF;
END;
$$;

-- Schedule the cron job to run every hour
-- Note: In Supabase, cron jobs need to be scheduled via the dashboard or using cron.schedule
-- This will attempt to create the schedule, but may need manual setup in Supabase dashboard
DO $$
BEGIN
  -- Remove existing job if it exists
  PERFORM cron.unschedule('restore-throttle-abilities');
EXCEPTION
  WHEN undefined_function THEN
    RAISE NOTICE 'pg_cron not available, skipping unschedule';
  WHEN others THEN
    RAISE NOTICE 'Could not unschedule existing job: %', SQLERRM;
END;
$$;

DO $$
BEGIN
  -- Schedule new job to run every hour at minute 0
  PERFORM cron.schedule(
    'restore-throttle-abilities',
    '0 * * * *',  -- Every hour at minute 0
    'SELECT restore_expired_throttle_blocks()'
  );
  RAISE NOTICE 'Successfully scheduled restore-throttle-abilities cron job';
EXCEPTION
  WHEN undefined_function THEN
    RAISE NOTICE 'pg_cron not available - please schedule manually via Supabase dashboard';
  WHEN others THEN
    RAISE NOTICE 'Could not schedule cron job: % - please schedule manually via Supabase dashboard', SQLERRM;
END;
$$;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION restore_expired_throttle_blocks() TO service_role;
