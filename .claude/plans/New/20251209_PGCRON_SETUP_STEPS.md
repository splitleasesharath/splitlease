# pg_cron Setup - Step-by-Step Guide

**Date**: 2025-12-09
**Goal**: Schedule automated processing of signup sync queue
**Time Required**: 10-15 minutes

---

## Overview

You've confirmed:
- ✅ pg_cron is installed
- ❌ pg_cron jobs are NOT scheduled
- ❌ Supabase queues not configured

We need to:
1. Schedule pg_cron jobs
2. Configure vault secrets
3. Test the sync

---

## Step 1: Open Supabase SQL Editor

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Click **SQL Editor** in the left sidebar
4. Click **New query**

---

## Step 2: Run the Setup Script

**Option A: Run the prepared script**

1. Open the file: `.claude/plans/New/20251209_SETUP_PGCRON_SIGNUP_SYNC.sql`
2. Copy the **ENTIRE contents**
3. Paste into Supabase SQL Editor
4. **IMPORTANT**: Before running, find Step 3 in the script and:
   - Uncomment the two `vault.create_secret()` calls
   - Replace `YOUR-PROJECT-REF` with your actual project reference
   - Replace `YOUR-SERVICE-ROLE-KEY` with your actual service role key
5. Click **Run**

**Option B: Run step-by-step (recommended if cautious)**

Copy and run each section separately in order.

---

## Step 3: Get Your Credentials

### Find Your Project Reference

1. In Supabase Dashboard → Settings → API
2. Look at **Project URL**: `https://YOUR-PROJECT-REF.supabase.co`
3. Copy the part before `.supabase.co`
   - Example: If URL is `https://abcdefghijk.supabase.co`
   - Your project ref is: `abcdefghijk`

### Find Your Service Role Key

1. In Supabase Dashboard → Settings → API
2. Scroll to **Project API keys**
3. Find **service_role** (marked as secret)
4. Click **Reveal** and copy the key
5. **⚠️ KEEP THIS SECRET** - Never commit to git

---

## Step 4: Configure Vault Secrets

Run these commands in SQL Editor (replace placeholders):

```sql
-- Replace YOUR-PROJECT-REF with your actual project reference
SELECT vault.create_secret(
    'https://YOUR-PROJECT-REF.supabase.co',
    'supabase_url',
    'Supabase project URL for pg_net calls'
);

-- Replace YOUR-SERVICE-ROLE-KEY with your actual service role key
SELECT vault.create_secret(
    'YOUR-SERVICE-ROLE-KEY',
    'service_role_key',
    'Service role key for Edge Function authentication'
);
```

**Verify secrets created:**
```sql
SELECT name, description FROM vault.secrets
WHERE name IN ('supabase_url', 'service_role_key');
```

**Expected output:**
```
name              | description
------------------|------------------------------------------
supabase_url      | Supabase project URL for pg_net calls
service_role_key  | Service role key for Edge Function auth
```

---

## Step 5: Verify pg_cron Jobs Scheduled

```sql
SELECT jobid, jobname, schedule, active
FROM cron.job
WHERE jobname LIKE 'bubble-sync%';
```

**Expected output:**
```
jobid | jobname                | schedule    | active
------|------------------------|-------------|-------
1     | bubble-sync-processor  | * * * * *   | t
2     | bubble-sync-retry      | */5 * * * * | t
```

If you don't see this, the script didn't run correctly. Re-run Step 6 from the setup script.

---

## Step 6: Manual Test (Optional but Recommended)

Test the processor immediately without waiting:

```sql
-- This will process any pending items right now
SELECT invoke_bubble_sync_processor();
```

**Expected NOTICE messages:**
```
NOTICE: [bubble_sync_processor] Found X pending items, invoking Edge Function
NOTICE: [bubble_sync_processor] Edge Function invoked, request ID: 12345
```

**If you see**:
```
NOTICE: [bubble_sync_processor] No pending items in queue
```
That's fine - it means there are no pending signups to sync.

---

## Step 7: Check Sync Queue Status

```sql
SELECT
    status,
    operation,
    COUNT(*) as count,
    MIN(created_at) as oldest_item
FROM sync_queue
GROUP BY status, operation
ORDER BY status, operation;
```

**What to look for:**
- `pending` items should decrease over time
- `completed` items should increase
- `failed` items need investigation (check error_message)

---

## Step 8: Test with Real Signup

1. Go to your signup page
2. Create a new test account
3. Wait 1-2 minutes
4. Check sync status:

```sql
-- Find your test signup
SELECT
    id,
    record_id,
    operation,
    status,
    created_at,
    processed_at,
    error_message
FROM sync_queue
WHERE operation = 'SIGNUP_ATOMIC'
ORDER BY created_at DESC
LIMIT 1;
```

**Expected:**
- `status` = `'completed'`
- `processed_at` is within 1-2 minutes of `created_at`
- `error_message` is `NULL`

5. Verify bubble_id populated:

```sql
-- Replace with your test email
SELECT
    u._id,
    u.email,
    u.bubble_id as user_bubble_id,
    h.bubble_id as host_bubble_id,
    g.bubble_id as guest_bubble_id
FROM "user" u
LEFT JOIN account_host h ON h._id = u."Account - Host / Landlord"
LEFT JOIN account_guest g ON g._id = u."Account - Guest"
WHERE u.email = 'your-test-email@example.com';
```

**Expected:** All three `bubble_id` fields should have values (not NULL)

---

## Troubleshooting

### Issue: "vault.create_secret() does not exist"

**Cause**: Vault extension not enabled

**Fix:**
```sql
CREATE EXTENSION IF NOT EXISTS vault;
```

### Issue: "pg_cron extension does not exist"

**Cause**: pg_cron not available in your Supabase plan

**Fix**: Contact Supabase support or use manual processing

### Issue: Jobs not executing

**Check execution logs:**
```sql
SELECT
    j.jobname,
    r.status,
    r.return_message,
    r.start_time
FROM cron.job_run_details r
JOIN cron.job j ON j.jobid = r.jobid
WHERE j.jobname LIKE 'bubble-sync%'
ORDER BY r.start_time DESC
LIMIT 10;
```

### Issue: "Vault secrets not configured" warning

**Cause**: Step 4 vault secrets not created

**Fix**: Re-run Step 4 with correct credentials

### Issue: Sync fails with authentication error

**Cause**: Wrong service_role_key or Edge Function not deployed

**Fix:**
```bash
# Re-deploy Edge Function
supabase functions deploy bubble_sync

# Verify it's running
supabase functions list
```

---

## Monitoring Queries (Save These)

### Daily Queue Summary
```sql
SELECT
    status,
    COUNT(*) as count,
    MIN(created_at) as oldest,
    MAX(created_at) as newest
FROM sync_queue
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY status;
```

### Recent Sync Failures
```sql
SELECT
    id,
    operation,
    record_id,
    error_message,
    retry_count,
    created_at
FROM sync_queue
WHERE status = 'failed'
ORDER BY created_at DESC
LIMIT 10;
```

### Cron Job Performance
```sql
SELECT
    j.jobname,
    COUNT(*) as executions,
    AVG(EXTRACT(EPOCH FROM (r.end_time - r.start_time))) as avg_duration_seconds,
    COUNT(*) FILTER (WHERE r.status = 'failed') as failures
FROM cron.job_run_details r
JOIN cron.job j ON j.jobid = r.jobid
WHERE j.jobname LIKE 'bubble-sync%'
  AND r.start_time > NOW() - INTERVAL '24 hours'
GROUP BY j.jobname;
```

---

## Success Checklist

- [ ] pg_cron and pg_net extensions enabled
- [ ] Vault secrets created (supabase_url, service_role_key)
- [ ] Two cron jobs scheduled (processor, retry)
- [ ] Manual test successful (invoke_bubble_sync_processor)
- [ ] Test signup completed and synced
- [ ] All bubble_id fields populated

---

## What Happens Now (Timeline)

### When a user signs up:

**T+0 seconds**: User submits signup form
**T+1 second**: Supabase creates user/host/guest records, returns session
**T+1 second**: Queue item inserted with status='pending'
**T+5-60 seconds**: pg_cron job runs, detects pending item
**T+6-65 seconds**: pg_net calls bubble_sync Edge Function
**T+10-75 seconds**: Bubble records created, foreign keys updated
**T+10-75 seconds**: bubble_id fields updated in Supabase
**T+10-75 seconds**: Queue item marked 'completed'

### User never waits
- ✅ Logs in immediately after signup
- ✅ Can use all Supabase-based features
- ⏳ Bubble-dependent features available after 10-75 seconds
- ✅ Automatic retries if sync fails

---

## Next Steps After Setup

1. **Monitor for 24 hours**
   - Check queue status daily
   - Watch for failed items
   - Verify cron jobs executing

2. **Handle any failures**
   - Review error_message in failed items
   - Use retry action to reprocess
   - Investigate Bubble API issues

3. **Optional: Set up alerts**
   - Create a daily report of sync failures
   - Monitor queue depth (if growing, increase frequency)

---

## Files Reference

- **Setup Script**: `.claude/plans/New/20251209_SETUP_PGCRON_SIGNUP_SYNC.sql`
- **Troubleshooting Guide**: `.claude/plans/New/20251209102934_SIGNUP_BUBBLE_SYNC_TROUBLESHOOTING.md`
- **Edge Function**: `supabase/functions/bubble_sync/`
- **Sync Handler**: `supabase/functions/bubble_sync/handlers/syncSignupAtomic.ts`

---

**Document Version**: 1.0
**Last Updated**: 2025-12-09
**Status**: READY TO EXECUTE
