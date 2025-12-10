# pg_cron Signup Sync Setup - Execution Guide

**Date**: 2025-12-09
**Status**: Ready for Manual Execution via Supabase SQL Editor
**Project**: Split Lease
**Supabase Project**: qcfifybkaddcoimjroca

---

## Prerequisites

- Supabase URL: https://qcfifybkaddcoimjroca.supabase.co
- Vault secrets already created: `supabase_url`, `service_role_key`
- sync_queue table exists (from migration 20251205_create_sync_queue_tables)
- bubble_sync Edge Function deployed

---

## Execution Steps

### Step 1: Access Supabase SQL Editor

1. Go to: https://app.supabase.com/project/qcfifybkaddcoimjroca/sql/new
2. Create a new SQL query

---

### Step 2: Verify sync_queue Table Exists

**Execute this query first:**

```sql
SELECT EXISTS (SELECT FROM pg_tables WHERE tablename = 'sync_queue') as table_exists;
```

**Expected Result**: `table_exists: true`

---

### Step 3: Enable Required Extensions

**Execute these statements:**

```sql
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
```

**Expected Result**: No errors, extensions created or already exist

---

### Step 4: Verify Extensions Are Enabled

**Execute this query:**

```sql
SELECT extname FROM pg_extension WHERE extname IN ('pg_cron', 'pg_net');
```

**Expected Result**:
```
extname
---------
pg_cron
pg_net
```

---

### Step 5: Create invoke_bubble_sync_processor() Function

**Copy and execute the complete function below:**

```sql
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
```

**Expected Result**: No errors, function created successfully

---

### Step 6: Create invoke_bubble_sync_retry() Function

**Copy and execute the complete function below:**

```sql
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
```

**Expected Result**: No errors, function created successfully

---

### Step 7: Unschedule Existing Jobs (if any)

**Execute these statements to clean up any existing jobs:**

```sql
SELECT cron.unschedule('bubble-sync-processor') WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'bubble-sync-processor'
);

SELECT cron.unschedule('bubble-sync-retry') WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'bubble-sync-retry'
);
```

**Expected Result**: Job unscheduled (if it existed) or no action

---

### Step 8: Schedule New Cron Jobs

**Execute both scheduling statements:**

```sql
-- Main processor - every minute
SELECT cron.schedule(
    'bubble-sync-processor',
    '* * * * *',
    $$SELECT invoke_bubble_sync_processor()$$
);

-- Retry processor - every 5 minutes
SELECT cron.schedule(
    'bubble-sync-retry',
    '*/5 * * * *',
    $$SELECT invoke_bubble_sync_retry()$$
);
```

**Expected Result**: Job IDs returned (e.g., `jobid: 1`, `jobid: 2`)

---

### Step 9: Verify Setup

**Execute this query to confirm jobs are scheduled and active:**

```sql
SELECT
    jobid,
    jobname,
    schedule,
    active,
    database
FROM cron.job
WHERE jobname LIKE 'bubble-sync%'
ORDER BY jobname;
```

**Expected Result**:
```
jobid | jobname                  | schedule    | active | database
------+--------------------------+-------------+--------+----------
  X   | bubble-sync-processor    | * * * * *   | true   | postgres
  Y   | bubble-sync-retry        | */5 * * * * | true   | postgres
```

---

### Step 10: Verify Vault Secrets Exist

**Execute this query:**

```sql
SELECT name, description FROM vault.secrets WHERE name IN ('supabase_url', 'service_role_key');
```

**Expected Result**:
```
name                | description
--------------------+--------------------------------------------
supabase_url        | Supabase project URL for pg_net calls...
service_role_key    | Service role key for authenticating...
```

---

### Step 11: Check sync_queue Status

**Execute this query to see current queue status:**

```sql
SELECT
    status,
    operation,
    COUNT(*) as count,
    MIN(created_at) as oldest_item,
    MAX(created_at) as newest_item
FROM sync_queue
GROUP BY status, operation
ORDER BY status, operation;
```

**Expected Result**: Shows breakdown of queue items by status and operation

---

### Step 12: Manual Test (Optional)

**To manually trigger the processor immediately:**

```sql
SELECT invoke_bubble_sync_processor();
```

**Expected Output**: Messages in Supabase function logs

---

## Troubleshooting

### Extension Installation Fails
- **Issue**: "permission denied to create extension"
- **Solution**: You need database owner/superuser role. Contact Supabase support or use the Supabase Dashboard to enable extensions through the UI.

### Functions Already Exist
- **Issue**: "function already exists"
- **Solution**: The `CREATE OR REPLACE` statement handles this. Execute again to update.

### Vault Secrets Not Found
- **Issue**: "Vault secrets not configured" warning in function logs
- **Solution**: Confirm secrets are created in Supabase Dashboard > Project Settings > Secrets
  - Required: `supabase_url` and `service_role_key`

### Cron Jobs Not Scheduling
- **Issue**: "pg_cron is not installed"
- **Solution**: Run the extension creation step again. May require restart.

---

## Success Checklist

- [x] sync_queue table exists
- [ ] pg_cron extension enabled
- [ ] pg_net extension enabled
- [ ] invoke_bubble_sync_processor() function created
- [ ] invoke_bubble_sync_retry() function created
- [ ] bubble-sync-processor job scheduled and active
- [ ] bubble-sync-retry job scheduled and active
- [ ] Vault secrets verified to exist
- [ ] Manual test runs without error

---

## Next Steps After Setup

1. **Wait 1 minute** for the first cron run (processor runs every minute)
2. **Check function logs**: https://app.supabase.com/project/qcfifybkaddcoimjroca/functions
3. **Monitor queue status** using the query in Step 11
4. **Test with a new signup** to verify the entire flow

---

## Architecture Overview

```
Signup → sync_queue (pending)
    ↓
[Every minute] → invoke_bubble_sync_processor()
    ↓
[pg_net] → bubble_sync Edge Function
    ↓
[Process] → Bubble API
    ↓
sync_queue (completed/failed)
    ↓
[Every 5 minutes] → invoke_bubble_sync_retry()
    ↓
[Retry failed items]
```

---

## Important Notes

1. **Vault Secrets**: Must already exist. User reported they're configured.
2. **Edge Function**: The `bubble_sync` function must exist and handle these actions:
   - `process_queue_data_api` - Process pending items
   - `retry_failed` - Retry failed items
3. **Timeout**: pg_net calls timeout after 30 seconds. Adjust if needed.
4. **Batch Processing**: Main processor processes up to 10 items with batch size of 5

---

**Document Version**: 1.0
**Created**: 2025-12-09
**Status**: Ready for execution
