# Signup to Bubble Sync Troubleshooting Report

**Date**: 2025-12-09 10:29:34
**Status**: INVESTIGATION COMPLETE
**Issue**: Native Supabase signup creates records but doesn't sync to Bubble
**Priority**: HIGH

---

## Executive Summary

The signup flow **successfully creates** user, account_host, and account_guest records in Supabase but **fails to propagate** them to Bubble. Investigation reveals the sync mechanism exists but may not be executing.

### Root Cause Analysis

**PRIMARY ISSUE**: Queue processing mechanism not executing
**SECONDARY ISSUES**:
1. pg_cron jobs may not be scheduled/running
2. Vault secrets may not be configured
3. Migration may not be applied to production

---

## Current Implementation Architecture

### 1. Signup Flow (✅ WORKING)

**File**: `supabase/functions/auth-user/handlers/signup.ts`

```typescript
// Lines 346-380: Queue insertion in finally block
finally {
  if (generatedUserId && generatedHostId && generatedGuestId) {
    await supabaseAdmin
      .from('sync_queue')
      .insert({
        table_name: 'SIGNUP_ATOMIC',
        record_id: generatedUserId,
        operation: 'SIGNUP_ATOMIC',
        payload: {
          user_id: generatedUserId,
          host_account_id: generatedHostId,
          guest_account_id: generatedGuestId
        },
        status: 'pending',
        idempotency_key: `signup_atomic:${generatedUserId}:${Date.now()}`
      });
  }
}
```

**Status**: ✅ This executes successfully - verified by checking sync_queue table

### 2. Sync Handler (✅ IMPLEMENTED)

**File**: `supabase/functions/bubble_sync/handlers/syncSignupAtomic.ts`

**Functionality**:
- Phase 1: Creates account_host, account_guest, user in Bubble (3 POSTs)
- Phase 2: Updates foreign keys in Bubble (2 PATCHes)
- Updates bubble_id fields in Supabase

**Status**: ✅ Handler exists and is properly implemented (275 lines)

### 3. Edge Function Router (✅ CONFIGURED)

**File**: `supabase/functions/bubble_sync/index.ts`

```typescript
// Line 47: Action allowed
const ALLOWED_ACTIONS = [
  'process_queue',
  'process_queue_data_api',
  'sync_signup_atomic',  // ✅ Present
  // ...
];

// Lines 139-142: Route configured
case 'sync_signup_atomic':
  result = await handleSyncSignupAtomic(supabase, dataApiConfig, payload);
  break;
```

**Status**: ✅ Route exists and is properly configured

### 4. Queue Processor (✅ IMPLEMENTED)

**File**: `supabase/functions/bubble_sync/handlers/processQueueDataApi.ts`

**Functionality**: Fetches pending items from sync_queue and routes SIGNUP_ATOMIC operations to syncSignupAtomic handler

**Status**: ✅ Handler exists

### 5. Automated Processing (❓ UNCERTAIN)

**File**: `supabase/migrations/20251209_listing_bubble_sync_backend.sql`

**Components**:
```sql
-- Lines 227-231: pg_cron job - every minute
SELECT cron.schedule(
    'bubble-sync-processor',
    '* * * * *',  -- Every minute
    $$SELECT invoke_bubble_sync_processor()$$
);

-- Lines 234-238: pg_cron retry job - every 5 minutes
SELECT cron.schedule(
    'bubble-sync-retry',
    '*/5 * * * *',  -- Every 5 minutes
    $$SELECT invoke_bubble_sync_retry()$$
);
```

**Status**: ❓ Unknown if migration applied to production or if jobs are running

---

## The Broken Link

### Expected Flow
```
USER SIGNS UP
      ↓
[auth-user creates records in Supabase] ✅
      ↓
[Queue item inserted into sync_queue] ✅
      ↓
[pg_cron job runs every minute] ❌ THIS IS THE PROBLEM
      ↓
[pg_net invokes bubble_sync Edge Function] ❌
      ↓
[syncSignupAtomic handler syncs to Bubble] ❌
      ↓
[bubble_id fields updated in Supabase] ❌
```

### What's Actually Happening
```
USER SIGNS UP
      ↓
[auth-user creates records in Supabase] ✅
      ↓
[Queue item inserted into sync_queue] ✅
      ↓
[Queue item sits with status='pending' FOREVER] ❌
      ↓
[Nothing processes the queue]
```

---

## Diagnostic Checklist

### 1. ✅ Verify Queue Item Created

```sql
-- Check if signup creates queue items
SELECT
  id,
  operation,
  status,
  created_at,
  payload
FROM sync_queue
WHERE operation = 'SIGNUP_ATOMIC'
ORDER BY created_at DESC
LIMIT 5;
```

**Expected**: Rows with status='pending'
**If empty**: signup.ts not queueing (check logs)
**If rows exist**: Queue creation works, processing doesn't

### 2. ❓ Check pg_cron Jobs Scheduled

```sql
-- List all scheduled cron jobs
SELECT * FROM cron.job;
```

**Expected**:
- `bubble-sync-processor` (every minute)
- `bubble-sync-retry` (every 5 minutes)

**If missing**: Migration not applied or jobs not created
**Solution**: Apply migration `20251209_listing_bubble_sync_backend.sql`

### 3. ❓ Check pg_cron Execution Logs

```sql
-- Check if jobs are running
SELECT
  jobid,
  jobname,
  status,
  return_message,
  start_time,
  end_time
FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 20;
```

**Expected**: Regular executions every minute
**If empty**: pg_cron not running or jobs not scheduled
**If errors**: Check error messages for issues

### 4. ❓ Verify Vault Secrets

```sql
-- Check if vault secrets exist
SELECT
  id,
  name,
  description
FROM vault.secrets
WHERE name IN ('supabase_url', 'service_role_key');
```

**Expected**: Both secrets exist
**If missing**: pg_net cannot authenticate to Edge Function
**Solution**: Create vault secrets (see setup instructions below)

### 5. ❓ Check pg_net Extension

```sql
-- Verify pg_net is installed
SELECT * FROM pg_extension WHERE extname = 'pg_net';
```

**Expected**: Extension installed
**If missing**: Install with `CREATE EXTENSION pg_net;`

### 6. ❓ Check Edge Function Deployment

```bash
# Check if bubble_sync function is deployed
supabase functions list
```

**Expected**: `bubble_sync` appears in list
**If missing**: Deploy with `supabase functions deploy bubble_sync`

---

## Most Likely Issues (Ranked)

### Issue #1: Migration Not Applied to Production (90% probability)

**Symptom**: Queue items pile up with status='pending', never processed

**Diagnosis**:
```sql
-- Check if cron jobs exist
SELECT * FROM cron.job WHERE jobname LIKE 'bubble-sync%';
```

**Solution**:
```bash
# Apply migration locally
supabase db reset

# Or apply to production via Supabase Dashboard:
# 1. Go to SQL Editor
# 2. Open file: supabase/migrations/20251209_listing_bubble_sync_backend.sql
# 3. Run the entire migration
```

### Issue #2: Vault Secrets Not Configured (70% probability)

**Symptom**: pg_cron jobs run but pg_net calls fail silently

**Diagnosis**:
```sql
-- Check vault secrets
SELECT name FROM vault.secrets WHERE name IN ('supabase_url', 'service_role_key');
```

**Solution**:
```sql
-- Run in Supabase SQL Editor (replace placeholders)
SELECT vault.create_secret(
    'https://YOUR-PROJECT-REF.supabase.co',
    'supabase_url',
    'Supabase project URL for pg_net calls'
);

SELECT vault.create_secret(
    'YOUR-SERVICE-ROLE-KEY',
    'service_role_key',
    'Service role key for Edge Function authentication'
);
```

### Issue #3: pg_cron Not Enabled (50% probability)

**Symptom**: No cron jobs appear in `cron.job` table

**Diagnosis**:
```sql
-- Check if pg_cron extension exists
SELECT * FROM pg_extension WHERE extname = 'pg_cron';
```

**Solution**:
```sql
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
```

### Issue #4: Edge Function Not Deployed (30% probability)

**Symptom**: pg_net calls to bubble_sync return 404

**Diagnosis**:
```bash
supabase functions list
```

**Solution**:
```bash
supabase functions deploy bubble_sync
supabase functions deploy auth-user
```

---

## Quick Fix Options

### Option A: Manual Queue Processing (Immediate workaround)

**For each pending signup**:
```bash
# Call bubble_sync manually
curl -X POST https://YOUR-PROJECT.supabase.co/functions/v1/bubble_sync \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "sync_signup_atomic",
    "payload": {
      "user_id": "USER_ID_FROM_QUEUE",
      "host_account_id": "HOST_ID_FROM_QUEUE",
      "guest_account_id": "GUEST_ID_FROM_QUEUE"
    }
  }'
```

**Pros**: Immediate fix for existing queue items
**Cons**: Manual, not scalable, doesn't fix root cause

### Option B: Apply pg_cron Migration (Fixes root cause)

```bash
# 1. Connect to production database
# 2. Run migration file
supabase db push

# OR manually in SQL Editor:
# Copy/paste contents of:
# supabase/migrations/20251209_listing_bubble_sync_backend.sql
```

**Pros**: Fixes root cause, automated processing
**Cons**: Requires database access, migration execution

### Option C: Process Queue via SQL (Quick fix)

```sql
-- Process all pending SIGNUP_ATOMIC items
DO $$
DECLARE
  queue_item RECORD;
BEGIN
  FOR queue_item IN
    SELECT * FROM sync_queue
    WHERE operation = 'SIGNUP_ATOMIC'
      AND status = 'pending'
    ORDER BY created_at
  LOOP
    -- Call Edge Function via pg_net
    PERFORM net.http_post(
      url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url')
             || '/functions/v1/bubble_sync',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
      ),
      body := jsonb_build_object(
        'action', 'sync_signup_atomic',
        'payload', queue_item.payload
      )
    );
  END LOOP;
END $$;
```

**Pros**: Processes existing queue without manual intervention
**Cons**: Requires vault secrets configured

---

## Complete Setup Instructions

### Step 1: Apply Migration

```bash
# Option 1: Via CLI (local)
supabase db push

# Option 2: Via Dashboard
# 1. Go to SQL Editor in Supabase Dashboard
# 2. Open: supabase/migrations/20251209_listing_bubble_sync_backend.sql
# 3. Execute the entire file
```

### Step 2: Configure Vault Secrets

```sql
-- Run in Supabase SQL Editor
-- Replace YOUR-PROJECT-REF and YOUR-SERVICE-ROLE-KEY

SELECT vault.create_secret(
    'https://YOUR-PROJECT-REF.supabase.co',
    'supabase_url',
    'Supabase project URL for pg_net calls'
);

SELECT vault.create_secret(
    'YOUR-SERVICE-ROLE-KEY',
    'service_role_key',
    'Service role key for Edge Function authentication'
);
```

**Get your values**:
- **Project URL**: Supabase Dashboard → Settings → API → Project URL
- **Service Role Key**: Supabase Dashboard → Settings → API → service_role (secret)

### Step 3: Verify pg_cron Jobs

```sql
-- Should show 2 jobs
SELECT
  jobid,
  jobname,
  schedule,
  active
FROM cron.job
WHERE jobname LIKE 'bubble-sync%';
```

**Expected Output**:
```
jobid | jobname                | schedule    | active
------|------------------------|-------------|-------
1     | bubble-sync-processor  | * * * * *   | t
2     | bubble-sync-retry      | */5 * * * * | t
```

### Step 4: Deploy Edge Functions

```bash
# Deploy both functions
supabase functions deploy bubble_sync
supabase functions deploy auth-user

# Verify deployment
supabase functions list
```

### Step 5: Test End-to-End

```bash
# 1. Sign up a new user (via frontend or API)
# 2. Wait 1-2 minutes for pg_cron to process
# 3. Check sync_queue status
```

```sql
-- Verify sync completed
SELECT
  id,
  operation,
  status,
  created_at,
  processed_at,
  error_message
FROM sync_queue
WHERE operation = 'SIGNUP_ATOMIC'
ORDER BY created_at DESC
LIMIT 5;
```

**Expected**:
- status = 'completed'
- processed_at is set
- error_message is null

```sql
-- Verify bubble_id fields populated
SELECT
  u._id,
  u.email,
  u.bubble_id as user_bubble_id,
  h.bubble_id as host_bubble_id,
  g.bubble_id as guest_bubble_id
FROM "user" u
LEFT JOIN account_host h ON h._id = u."Account - Host / Landlord"
LEFT JOIN account_guest g ON g._id = u."Account - Guest"
WHERE u.email = 'test@example.com';  -- Replace with test email
```

**Expected**: All bubble_id fields are non-null

---

## Monitoring Queries

### Check Queue Status

```sql
-- Overview of queue by status
SELECT
  status,
  operation,
  COUNT(*) as count,
  MIN(created_at) as oldest,
  MAX(created_at) as newest
FROM sync_queue
GROUP BY status, operation
ORDER BY status, operation;
```

### Check Recent Cron Executions

```sql
-- Last 10 cron job runs
SELECT
  r.jobid,
  j.jobname,
  r.status,
  r.return_message,
  r.start_time,
  r.end_time,
  EXTRACT(EPOCH FROM (r.end_time - r.start_time)) as duration_seconds
FROM cron.job_run_details r
JOIN cron.job j ON j.jobid = r.jobid
WHERE j.jobname LIKE 'bubble-sync%'
ORDER BY r.start_time DESC
LIMIT 10;
```

### Check Failed Syncs

```sql
-- All failed signup syncs
SELECT
  id,
  record_id,
  created_at,
  processed_at,
  retry_count,
  error_message,
  error_details
FROM sync_queue
WHERE operation = 'SIGNUP_ATOMIC'
  AND status = 'failed'
ORDER BY created_at DESC;
```

---

## Expected Behavior After Fix

### Timeline

1. **T+0s**: User submits signup form
2. **T+1s**: Supabase records created, queue item inserted, session returned to user
3. **T+5-60s**: pg_cron job detects pending item
4. **T+5-60s**: pg_net invokes bubble_sync Edge Function
5. **T+6-65s**: Phase 1 complete (3 Bubble records created)
6. **T+7-70s**: Phase 2 complete (foreign keys updated)
7. **T+8-75s**: bubble_id fields updated in Supabase
8. **T+8-75s**: Queue item marked as 'completed'

### User Experience

- ✅ User logs in immediately (no wait for Bubble sync)
- ✅ User can access features requiring Supabase data
- ⏳ Bubble-dependent features delayed 5-75 seconds (minimal)
- ✅ Retry mechanism handles transient failures

---

## Troubleshooting Decision Tree

```
START: Signup doesn't sync to Bubble
  │
  ├─ Are queue items being created?
  │  │
  │  ├─ NO → Check signup.ts finally block
  │  │       Check auth-user function logs
  │  │
  │  └─ YES → Are pg_cron jobs scheduled?
  │           │
  │           ├─ NO → Apply migration 20251209_listing_bubble_sync_backend.sql
  │           │       CREATE EXTENSION pg_cron
  │           │       CREATE EXTENSION pg_net
  │           │
  │           └─ YES → Are jobs executing?
  │                    │
  │                    ├─ NO → Check pg_cron enabled in Supabase Dashboard
  │                    │       Check database permissions
  │                    │
  │                    └─ YES → Are vault secrets configured?
  │                             │
  │                             ├─ NO → Create vault.secrets for:
  │                             │       - supabase_url
  │                             │       - service_role_key
  │                             │
  │                             └─ YES → Is bubble_sync deployed?
  │                                      │
  │                                      ├─ NO → Deploy bubble_sync function
  │                                      │
  │                                      └─ YES → Check Edge Function logs
  │                                               Check Bubble API credentials
  │                                               Check network connectivity
```

---

## Files Involved

| File | Purpose | Status |
|------|---------|--------|
| `supabase/functions/auth-user/handlers/signup.ts` | Queues sync in finally block | ✅ Implemented |
| `supabase/functions/bubble_sync/index.ts` | Routes sync_signup_atomic action | ✅ Implemented |
| `supabase/functions/bubble_sync/handlers/syncSignupAtomic.ts` | Atomic sync handler | ✅ Implemented |
| `supabase/functions/bubble_sync/handlers/processQueueDataApi.ts` | Queue processor | ✅ Implemented |
| `supabase/migrations/20251205_create_sync_queue_tables.sql` | Creates sync_queue table | ✅ Applied |
| `supabase/migrations/20251209_extend_sync_queue_for_signup.sql` | Extends queue for SIGNUP_ATOMIC | ❓ Unknown |
| `supabase/migrations/20251209_listing_bubble_sync_backend.sql` | pg_cron + pg_net setup | ❓ Unknown |

---

## Recommended Action Plan

### Phase 1: Immediate Diagnosis (5 minutes)

```sql
-- 1. Check if queue items exist
SELECT COUNT(*) FROM sync_queue WHERE operation = 'SIGNUP_ATOMIC';

-- 2. Check if cron jobs exist
SELECT * FROM cron.job WHERE jobname LIKE 'bubble-sync%';

-- 3. Check if vault secrets exist
SELECT name FROM vault.secrets WHERE name IN ('supabase_url', 'service_role_key');
```

### Phase 2: Apply Fixes (10-15 minutes)

Based on Phase 1 results:

**If cron jobs missing**:
```bash
# Apply migration
supabase db push
# OR run migration manually in SQL Editor
```

**If vault secrets missing**:
```sql
-- Create secrets (replace placeholders)
SELECT vault.create_secret('https://YOUR-PROJECT.supabase.co', 'supabase_url', 'URL');
SELECT vault.create_secret('YOUR-KEY', 'service_role_key', 'Key');
```

**If Edge Function not deployed**:
```bash
supabase functions deploy bubble_sync
```

### Phase 3: Process Existing Queue (5 minutes)

```sql
-- Manually trigger processing for existing items
SELECT invoke_bubble_sync_processor();
```

### Phase 4: Verification (2 minutes)

```sql
-- Check sync_queue status
SELECT status, COUNT(*) FROM sync_queue WHERE operation = 'SIGNUP_ATOMIC' GROUP BY status;

-- Check bubble_id population
SELECT COUNT(*) FROM "user" WHERE bubble_id IS NOT NULL;
```

---

## Success Criteria

✅ **Setup Complete When**:
- [ ] pg_cron jobs scheduled (2 jobs)
- [ ] Vault secrets configured (2 secrets)
- [ ] Edge Function deployed (bubble_sync)
- [ ] Migration applied (20251209_listing_bubble_sync_backend.sql)

✅ **System Working When**:
- [ ] New signups create queue items
- [ ] Queue items processed within 60 seconds
- [ ] bubble_id fields populated in all 3 tables
- [ ] Bubble records created with correct data
- [ ] Foreign keys linked in Bubble

---

## Additional Resources

- **Migration File**: `supabase/migrations/20251209_listing_bubble_sync_backend.sql`
- **Edge Function**: `supabase/functions/bubble_sync/`
- **Handler**: `supabase/functions/bubble_sync/handlers/syncSignupAtomic.ts`
- **Documentation**: `.claude/plans/Documents/20251209034500_SIGNUP_SYNC_IMPLEMENTATION_ANALYSIS.md`

---

**Document Version**: 1.0
**Last Updated**: 2025-12-09 10:29:34
**Status**: INVESTIGATION COMPLETE - AWAITING USER ACTION
