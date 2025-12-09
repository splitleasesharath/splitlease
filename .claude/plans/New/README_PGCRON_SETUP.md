# pg_cron Signup Sync Setup - Complete Package

**Date**: 2025-12-09
**Status**: Ready for Execution
**Project**: Split Lease

---

## Quick Start

To set up pg_cron for automated signup sync:

1. Open: https://app.supabase.com/project/qcfifybkaddcoimjroca/sql/new
2. Copy contents of: **PGCRON_COMPLETE_SETUP.sql** (see below)
3. Paste into Supabase SQL Editor
4. Click "Run"
5. Verify results using queries in **PGCRON_SETUP_EXECUTION_GUIDE.md** (Step 9)

---

## Package Contents

This setup package includes 5 comprehensive documents:

### 1. PGCRON_COMPLETE_SETUP.sql
**File**: `.claude/plans/New/PGCRON_COMPLETE_SETUP.sql`

Complete SQL script ready to copy-paste into Supabase SQL Editor.

**Contains**:
- Extension enablement (pg_cron, pg_net)
- Function definitions (invoke_bubble_sync_processor, invoke_bubble_sync_retry)
- Cron job scheduling
- Verification queries

**How to Use**:
1. Open Supabase SQL Editor
2. Copy entire file contents
3. Paste into editor
4. Click "Run"
5. Review results

**Execution Time**: ~5-10 seconds

---

### 2. PGCRON_SETUP_EXECUTION_GUIDE.md
**File**: `.claude/plans/New/PGCRON_SETUP_EXECUTION_GUIDE.md`

Step-by-step manual execution guide with detailed instructions.

**Contains**:
- 12 numbered steps with explanations
- SQL code for each step
- Expected results
- Troubleshooting section
- Success checklist

**How to Use**:
1. Open this file
2. Follow steps 1-12 sequentially
3. Execute each SQL statement in Supabase SQL Editor
4. Verify expected results
5. Check success checklist

**Execution Time**: ~15-20 minutes (slower but thorough)

---

### 3. PGCRON_MONITORING_QUERIES.sql
**File**: `.claude/plans/New/PGCRON_MONITORING_QUERIES.sql`

Comprehensive monitoring and troubleshooting queries.

**Contains**:
- Cron job status checks
- Execution log queries
- Queue monitoring
- pg_net HTTP request tracking
- Vault secret verification
- Error analysis
- Performance metrics
- System health dashboard
- Recovery procedures

**How to Use**:
1. After setup is complete
2. Run individual queries as needed
3. Use dashboard query for daily health checks
4. Use error analysis for troubleshooting

**When to Use**:
- Daily: Run dashboard query
- On Issues: Use error analysis queries
- For Optimization: Use performance metrics queries
- For Recovery: Use recovery procedures

---

### 4. PGCRON_SETUP_SUMMARY.md
**File**: `.claude/plans/New/PGCRON_SETUP_SUMMARY.md`

Overview document with architecture, prerequisites, and next steps.

**Contains**:
- Setup overview and what gets created
- Architecture diagram
- Prerequisites checklist
- How to execute (2 options)
- Verification steps
- Monitoring instructions
- Troubleshooting guide
- Timeline and success criteria

**How to Use**:
1. Read for understanding before executing
2. Reference during execution for context
3. Use troubleshooting section if issues arise

---

### 5. This File - README_PGCRON_SETUP.md
**File**: `.claude/plans/New/README_PGCRON_SETUP.md`

Package index and quick navigation guide.

---

## What Gets Created

### Extensions
- `pg_cron`: PostgreSQL job scheduling
- `pg_net`: HTTP calls from PostgreSQL

### Functions
1. **invoke_bubble_sync_processor()**
   - Processes pending sync_queue items
   - Runs every minute
   - Batch processes up to 10 items

2. **invoke_bubble_sync_retry()**
   - Retries failed sync_queue items
   - Runs every 5 minutes
   - Respects retry limits and timing

### Cron Jobs
- `bubble-sync-processor`: Every minute (1 min interval)
- `bubble-sync-retry`: Every 5 minutes (5 min interval)

---

## Prerequisites

All prerequisites are already configured:

- [x] Supabase project: qcfifybkaddcoimjroca
- [x] Vault secrets created:
  - `supabase_url`: https://qcfifybkaddcoimjroca.supabase.co
  - `service_role_key`: [Configured in Supabase Dashboard]
- [x] sync_queue table exists
- [ ] bubble_sync Edge Function deployed (must handle):
  - `process_queue_data_api` action
  - `retry_failed` action

---

## Recommended Execution Path

### For Quick Setup
1. Copy **PGCRON_COMPLETE_SETUP.sql**
2. Paste into Supabase SQL Editor
3. Execute
4. Verify using Step 9 from **PGCRON_SETUP_EXECUTION_GUIDE.md**

### For Learning/Manual Control
1. Follow **PGCRON_SETUP_EXECUTION_GUIDE.md** steps 1-12
2. Execute each step individually
3. Verify results for each step
4. Reference **PGCRON_SETUP_SUMMARY.md** for context

### After Setup
1. Wait 1 minute for first cron run
2. Use **PGCRON_MONITORING_QUERIES.sql** to monitor
3. Check Supabase function logs
4. Verify sync_queue is being processed

---

## Verification Steps

After execution, verify:

```sql
-- Check extensions
SELECT extname FROM pg_extension WHERE extname IN ('pg_cron', 'pg_net');
-- Expected: pg_cron, pg_net

-- Check functions
SELECT proname FROM pg_proc
WHERE proname IN ('invoke_bubble_sync_processor', 'invoke_bubble_sync_retry');
-- Expected: Both functions listed

-- Check cron jobs
SELECT jobname, schedule, active FROM cron.job WHERE jobname LIKE 'bubble-sync%';
-- Expected: Both jobs active

-- Check vault secrets
SELECT name FROM vault.secrets WHERE name IN ('supabase_url', 'service_role_key');
-- Expected: Both secrets listed
```

---

## Monitoring

### Daily Check
Run this daily to monitor system health:
```sql
SELECT
    (SELECT COUNT(*) FROM cron.job WHERE jobname LIKE 'bubble-sync%' AND active) as active_jobs,
    (SELECT COUNT(*) FROM sync_queue WHERE status = 'pending') as pending_items,
    (SELECT COUNT(*) FROM sync_queue WHERE status = 'failed') as failed_items,
    (SELECT COUNT(*) FROM sync_queue WHERE status = 'completed' AND created_at >= NOW() - INTERVAL '24 hours') as completed_today;
```

### For Detailed Monitoring
See **PGCRON_MONITORING_QUERIES.sql** for comprehensive monitoring queries.

---

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| "permission denied to create extension" | Need superuser role; contact Supabase |
| "function already exists" | Normal - will be replaced by CREATE OR REPLACE |
| "Vault secrets not configured" | Verify secrets exist: Run query in PGCRON_SETUP_EXECUTION_GUIDE Step 10 |
| "No items being processed" | Check if pending items exist and Edge Function is deployed |
| "Edge Function not responding" | Check Supabase function logs and pg_net request queue |

For more troubleshooting, see **PGCRON_SETUP_EXECUTION_GUIDE.md** Troubleshooting section.

---

## Architecture

```
User Signup
    ↓
sync_queue (pending)
    ↓
[Every 1 minute] ← pg_cron
    ↓
invoke_bubble_sync_processor()
    ↓
pg_net → bubble_sync Edge Function
    ↓
Bubble API (CREATE/UPDATE user)
    ↓
sync_queue (completed OR failed)
    ↓
[Every 5 minutes] ← pg_cron
    ↓
invoke_bubble_sync_retry() [for failed items]
    ↓
Retry or give up
```

---

## File Locations

All files are in: `.claude/plans/New/`

```
.claude/
└── plans/
    └── New/
        ├── 20251209_SETUP_PGCRON_SIGNUP_SYNC.sql (original setup script)
        ├── PGCRON_COMPLETE_SETUP.sql (main setup)
        ├── PGCRON_SETUP_EXECUTION_GUIDE.md (step-by-step)
        ├── PGCRON_MONITORING_QUERIES.sql (monitoring)
        ├── PGCRON_SETUP_SUMMARY.md (overview)
        └── README_PGCRON_SETUP.md (this file)
```

---

## Timeline

| Step | Time | Action |
|------|------|--------|
| 1 | Now | Read this file |
| 2 | ~5 min | Choose execution method (quick or manual) |
| 3 | ~5-20 min | Execute setup SQL |
| 4 | Immediate | Verify extensions, functions, cron jobs |
| 5 | 1 minute | Wait for first cron run |
| 6 | Ongoing | Monitor with PGCRON_MONITORING_QUERIES.sql |

---

## Success Criteria

Setup is successful when:

- [x] Documentation prepared
- [ ] Extensions created (pg_cron, pg_net)
- [ ] Functions created (2 functions)
- [ ] Cron jobs scheduled (2 jobs, both active)
- [ ] Vault secrets verified
- [ ] Manual test passes
- [ ] Queue processing begins
- [ ] First items synced successfully

---

## Support & Next Steps

1. **For Setup**: Use PGCRON_COMPLETE_SETUP.sql or PGCRON_SETUP_EXECUTION_GUIDE.md
2. **For Monitoring**: Use PGCRON_MONITORING_QUERIES.sql
3. **For Reference**: Use PGCRON_SETUP_SUMMARY.md
4. **For Troubleshooting**: See PGCRON_SETUP_EXECUTION_GUIDE.md

---

## Key Information

- **Supabase Project**: qcfifybkaddcoimjroca
- **Function Processing Frequency**: Every 1 minute (main), every 5 minutes (retry)
- **Batch Size**: Up to 10 items per run
- **Retry Policy**: Respects retry_count and next_retry_at
- **Vault Secrets**: supabase_url, service_role_key

---

**Setup Package Version**: 1.0
**Created**: 2025-12-09
**Status**: Ready for Execution
**Next Action**: Execute PGCRON_COMPLETE_SETUP.sql
