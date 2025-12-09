# pg_cron Signup Sync Setup - Summary

**Date**: 2025-12-09
**Status**: Ready for Implementation
**Project**: Split Lease
**Objective**: Complete pg_cron setup for automated signup sync to Bubble

---

## What Was Prepared

Three complete SQL scripts and one execution guide have been created:

### 1. **PGCRON_COMPLETE_SETUP.sql** (Main Setup Script)
- **Location**: `.claude/plans/New/PGCRON_COMPLETE_SETUP.sql`
- **Purpose**: Complete setup script for Supabase SQL Editor
- **Contains**:
  - Extension enablement (pg_cron, pg_net)
  - Function creation (invoke_bubble_sync_processor, invoke_bubble_sync_retry)
  - Cron job scheduling (every 1 min and every 5 min)
  - Verification queries
- **How to Use**: Copy entire script into Supabase SQL Editor and execute

### 2. **PGCRON_SETUP_EXECUTION_GUIDE.md** (Step-by-Step Guide)
- **Location**: `.claude/plans/New/PGCRON_SETUP_EXECUTION_GUIDE.md`
- **Purpose**: Detailed walkthrough with expected results for each step
- **Contains**: 12 numbered steps with SQL code and expected outputs
- **How to Use**: Follow step-by-step for manual execution

### 3. **PGCRON_MONITORING_QUERIES.sql** (Monitoring & Troubleshooting)
- **Location**: `.claude/plans/New/PGCRON_MONITORING_QUERIES.sql`
- **Purpose**: SQL queries for ongoing monitoring and troubleshooting
- **Contains**:
  - Job status checks
  - Queue monitoring
  - HTTP request tracking
  - Error analysis
  - Performance metrics
  - Recovery procedures
- **How to Use**: Use these queries after setup to monitor system health

### 4. **PGCRON_SETUP_SUMMARY.md** (This Document)
- **Location**: `.claude/plans/New/PGCRON_SETUP_SUMMARY.md`
- **Purpose**: Overview and quick reference

---

## Setup Overview

### What Gets Created

#### Extensions
- **pg_cron**: Enables PostgreSQL scheduled jobs
- **pg_net**: Enables HTTP calls from PostgreSQL via pg_net

#### Functions
1. **invoke_bubble_sync_processor()**
   - Runs: Every minute (cron: `* * * * *`)
   - Does: Processes pending items from sync_queue
   - Calls: bubble_sync Edge Function with `process_queue_data_api` action
   - Batch Size: Up to 10 items, processed in batches of 5

2. **invoke_bubble_sync_retry()**
   - Runs: Every 5 minutes (cron: `*/5 * * * *`)
   - Does: Retries failed items that haven't exceeded max retries
   - Calls: bubble_sync Edge Function with `retry_failed` action
   - Respects: next_retry_at timestamp and max_retries limit

#### Cron Jobs
- **bubble-sync-processor**: Main processor (every minute)
- **bubble-sync-retry**: Retry processor (every 5 minutes)

---

## Architecture

```
User Signup
    ↓
sync_queue table (status: pending)
    ↓
[Every minute] ← pg_cron triggers
    ↓
invoke_bubble_sync_processor()
    ↓
[Gets vault secrets]
    ↓
pg_net.http_post() to Edge Function
    ↓
bubble_sync Edge Function
    ↓
Bubble API (CREATE/UPDATE user)
    ↓
sync_queue (status: completed OR failed)
    ↓
[Every 5 minutes] ← pg_cron triggers
    ↓
invoke_bubble_sync_retry() [for failed items]
    ↓
[Retry if retry_count < max_retries and next_retry_at <= NOW()]
    ↓
Process again or stay failed
```

---

## Prerequisites (Already Configured)

- Supabase project: qcfifybkaddcoimjroca
- Vault secrets created:
  - `supabase_url`: https://qcfifybkaddcoimjroca.supabase.co
  - `service_role_key`: [Already configured in Supabase Dashboard]
- sync_queue table: Already exists
- bubble_sync Edge Function: Must be deployed with handlers for:
  - `process_queue_data_api` action
  - `retry_failed` action

---

## How to Execute the Setup

### Option A: Quick Copy-Paste (Recommended)

1. Go to: https://app.supabase.com/project/qcfifybkaddcoimjroca/sql/new
2. Open file: `.claude/plans/New/PGCRON_COMPLETE_SETUP.sql`
3. Copy entire contents
4. Paste into Supabase SQL Editor
5. Click "Run" button
6. Check results in "Results" tab

### Option B: Step-by-Step

1. Follow: `.claude/plans/New/PGCRON_SETUP_EXECUTION_GUIDE.md`
2. Execute each step individually in Supabase SQL Editor
3. Verify expected results after each step

---

## Verification Steps

After execution, verify with these queries:

```sql
-- Check cron jobs are scheduled and active
SELECT jobid, jobname, schedule, active
FROM cron.job
WHERE jobname LIKE 'bubble-sync%';

-- Expected output:
-- jobid | jobname                 | schedule    | active
-- ------+-------------------------+-------------+--------
--     X | bubble-sync-processor   | * * * * *   | t
--     Y | bubble-sync-retry       | */5 * * * * | t

-- Check vault secrets exist
SELECT name FROM vault.secrets
WHERE name IN ('supabase_url', 'service_role_key');

-- Expected output: both secrets listed

-- Check sync_queue status
SELECT status, COUNT(*) FROM sync_queue GROUP BY status;

-- Check functions exist
SELECT proname FROM pg_proc
WHERE proname IN ('invoke_bubble_sync_processor', 'invoke_bubble_sync_retry');
```

---

## Monitoring After Setup

### First Run
- Wait 1 minute after setup for first processor execution
- Check Supabase function logs for invocation messages
- Look for "Found X pending items" messages

### Ongoing Monitoring
Use queries from `PGCRON_MONITORING_QUERIES.sql`:
- Check cron job execution logs
- Monitor sync_queue status
- Track pg_net HTTP requests
- Analyze processing metrics

### Daily Health Check
```sql
-- Run this daily to verify system health
SELECT
    (SELECT COUNT(*) FROM cron.job WHERE jobname LIKE 'bubble-sync%' AND active) as active_jobs,
    (SELECT COUNT(*) FROM sync_queue WHERE status = 'pending') as pending_items,
    (SELECT COUNT(*) FROM sync_queue WHERE status = 'failed') as failed_items,
    (SELECT COUNT(*) FROM sync_queue WHERE status = 'completed' AND created_at >= NOW() - INTERVAL '24 hours') as completed_today;
```

---

## Troubleshooting

### Issue: Functions show "already exists" error
**Solution**: This is normal. The `CREATE OR REPLACE` statement will update existing functions.

### Issue: "permission denied to create extension"
**Solution**: May need database owner role. Contact Supabase support or enable through Supabase Dashboard UI.

### Issue: Vault secrets not found warnings
**Solution**: Verify secrets exist:
```sql
SELECT name FROM vault.secrets WHERE name IN ('supabase_url', 'service_role_key');
```
If missing, create via Supabase Dashboard > Settings > Secrets

### Issue: No items being processed
**Solution**:
1. Check if sync_queue has pending items:
   ```sql
   SELECT COUNT(*) FROM sync_queue WHERE status = 'pending';
   ```
2. Check bubble_sync Edge Function is deployed
3. Check vault secrets are configured correctly
4. Manually test:
   ```sql
   SELECT invoke_bubble_sync_processor();
   ```

### Issue: Edge Function calls failing
**Solution**: Check:
1. Vault secrets contain correct Supabase URL and service_role_key
2. bubble_sync Edge Function is deployed and accessible
3. Function logs for error details:
   https://app.supabase.com/project/qcfifybkaddcoimjroca/functions
4. pg_net HTTP request queue:
   ```sql
   SELECT * FROM net.http_request_queue ORDER BY id DESC LIMIT 5;
   ```

---

## Files Included

| File | Location | Purpose |
|------|----------|---------|
| PGCRON_COMPLETE_SETUP.sql | .claude/plans/New/ | Main setup script for SQL Editor |
| PGCRON_SETUP_EXECUTION_GUIDE.md | .claude/plans/New/ | Step-by-step execution guide |
| PGCRON_MONITORING_QUERIES.sql | .claude/plans/New/ | Monitoring and troubleshooting queries |
| PGCRON_SETUP_SUMMARY.md | .claude/plans/New/ | This document |
| 20251209_SETUP_PGCRON_SIGNUP_SYNC.sql | .claude/plans/New/ | Original setup script |

---

## Timeline

- **Preparation**: 2025-12-09
- **Execution**: [User runs PGCRON_COMPLETE_SETUP.sql]
- **First Run**: 1 minute after execution
- **Verification**: Check sync_queue status
- **Ongoing**: Monitor with PGCRON_MONITORING_QUERIES.sql

---

## Success Criteria

- [x] Preparation complete
- [ ] Extensions enabled (pg_cron, pg_net)
- [ ] Functions created (invoke_bubble_sync_processor, invoke_bubble_sync_retry)
- [ ] Cron jobs scheduled and active
- [ ] Vault secrets verified
- [ ] Manual test executed
- [ ] Queue status shows processing

---

## Key Implementation Details

### Function Behavior

**invoke_bubble_sync_processor()**
```
1. Count pending items
2. If 0 pending: Exit with notice
3. If >0 pending:
   - Get secrets from vault
   - Call Edge Function via pg_net
   - Edge Function processes items
   - Updates sync_queue status
```

**invoke_bubble_sync_retry()**
```
1. Count failed items eligible for retry
2. If 0 eligible: Exit with notice
3. If >0 eligible:
   - Get secrets from vault
   - Call Edge Function via pg_net
   - Edge Function retries items
   - Updates sync_queue status
```

### Retry Logic
- Failed items only retry if:
  - `retry_count < max_retries` (not exceeded limit)
  - `next_retry_at IS NULL OR next_retry_at <= NOW()` (time has passed)
- Exponential backoff or fixed delays handled by Edge Function

### Vault Secret Usage
- Secrets are decrypted and used to authenticate Edge Function calls
- Secrets are never logged or exposed
- Required secrets:
  - `supabase_url`: Base URL for Edge Function invocation
  - `service_role_key`: Authorization token for Edge Function

---

## Next Actions

1. **Execute Setup**: Run PGCRON_COMPLETE_SETUP.sql in Supabase SQL Editor
2. **Verify**: Use queries in Step 8 of PGCRON_SETUP_EXECUTION_GUIDE.md
3. **Test**: Wait 1 minute, check function logs
4. **Monitor**: Set up monitoring with PGCRON_MONITORING_QUERIES.sql
5. **Validate**: Perform end-to-end signup test

---

## Support Resources

- **Setup Script**: PGCRON_COMPLETE_SETUP.sql
- **Manual Guide**: PGCRON_SETUP_EXECUTION_GUIDE.md
- **Monitoring**: PGCRON_MONITORING_QUERIES.sql
- **Supabase Docs**: https://supabase.com/docs/guides/database/extensions/pgsql_cron
- **pg_net Docs**: https://supabase.com/docs/guides/database/extensions/http

---

**Document Version**: 1.0
**Created**: 2025-12-09
**Status**: Ready for Implementation
**Next Step**: Execute PGCRON_COMPLETE_SETUP.sql
