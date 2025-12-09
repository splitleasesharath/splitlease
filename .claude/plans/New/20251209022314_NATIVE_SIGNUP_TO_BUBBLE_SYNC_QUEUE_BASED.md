# Native Signup to Bubble Sync - Queue-Based Implementation Plan (REVISED)

**Date**: 2025-12-09 02:23:14
**Status**: Analysis Complete - Ready for Implementation
**Author**: Claude Sonnet 4.5
**Architecture**: Queue-Based + Backend-to-Backend + Separation of Concerns

---

## Executive Summary

This plan implements **bidirectional sync** between native Supabase signup and Bubble database using:
1. **sync_queue infrastructure** (leveraging existing queue system)
2. **Backend-to-backend communication** (no frontend involvement)
3. **Sequential atomic processing** (queue handles ordering + retry)
4. **Two-phase Data API sync** (handles circular foreign keys)

**Key Improvement Over Previous Plan**: Instead of direct edge function invocation, we use the **sync_queue table** as a persistent, retriable, monitorable queue.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Why Queue-Based?](#why-queue-based)
3. [Implementation Strategy](#implementation-strategy)
4. [Detailed Implementation](#detailed-implementation)
5. [Testing & Deployment](#testing--deployment)
6. [File References](#file-references)

---

## Architecture Overview

### 🔄 Complete Flow (Backend-to-Backend Only)

```
┌────────────────────────────────────────────────────────────────┐
│  PHASE 1: NATIVE SIGNUP (Completes Immediately)                │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  User → Frontend → auth-user Edge Function (BACKEND)           │
│                                                                │
│  1. Create auth.users record                                   │
│  2. Create account_host (bubble_id = null)                     │
│  3. Create account_guest (bubble_id = null)                    │
│  4. Create user (bubble_id = null)                             │
│  5. Return session tokens → User logged in immediately  ✅     │
│                                                                │
│  6. INSERT into sync_queue (BACKEND operation) ────────────┐   │
│     - operation: 'SIGNUP_ATOMIC'                           │   │
│     - payload: { user_id, host_account_id, guest_account_id }│  │
│     - status: 'pending'                                    │   │
│                                                            │   │
└────────────────────────────────────────────────────────────┼───┘
                                                             │
                                                             ▼
┌────────────────────────────────────────────────────────────────┐
│  PHASE 2: QUEUE PROCESSING (Background, Backend-only)          │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  sync_queue table (PostgreSQL persistent queue)                │
│  - Stores pending sync operations                             │
│  - Survives crashes, can be retried                           │
│  - Backend database operation only                            │
│                                                                │
│  ↓                                                             │
│                                                                │
│  bubble_sync Edge Function (BACKEND) - Scheduled/Triggered     │
│  - Fetches pending items from sync_queue                      │
│  - Detects SIGNUP_ATOMIC operation                            │
│  - Routes to handleSyncSignupAtomic()                         │
│                                                                │
│  ========== PHASE 2A: CREATE RECORDS ==========                │
│  POST /obj/account_host → Get Bubble ID                       │
│  POST /obj/account_guest → Get Bubble ID                      │
│  POST /obj/user (with Bubble host/guest IDs) → Get Bubble ID  │
│                                                                │
│  ========== PHASE 2B: UPDATE FOREIGN KEYS ==========           │
│  PATCH /obj/account_host (set User FK)                        │
│  PATCH /obj/account_guest (set User FK)                       │
│                                                                │
│  ✅ Mark queue item as 'completed'                             │
│  ✅ Update bubble_id fields in Supabase                        │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### 🎯 Key Architectural Principles

| Principle | Implementation | Benefit |
|-----------|----------------|---------|
| **Backend-to-Backend** | signup.ts → sync_queue → bubble_sync | No frontend exposure |
| **Queue-Based** | sync_queue table (PostgreSQL) | Persistent, retriable |
| **Sequential** | Queue processes one item at a time | Natural ordering |
| **Atomic** | Single queue item = entire signup sync | All-or-nothing |
| **Monitored** | sync_queue status tracking | Visibility into sync state |

---

## Why Queue-Based?

### ❌ Problems with Direct Invocation (Previous Plan)

| Issue | Impact |
|-------|--------|
| **Non-persistent** | If bubble_sync crashes mid-sync, no record of failure |
| **No retry** | Failed syncs require manual intervention |
| **No visibility** | Can't query "which signups are pending sync?" |
| **Race conditions** | Multiple signups could overwhelm bubble_sync |
| **No ordering** | Can't guarantee FIFO processing |

### ✅ Benefits of Queue-Based Approach

| Benefit | Description |
|---------|-------------|
| **Persistent** | Queue items survive crashes, restarts, deployments |
| **Automatic retry** | Built-in exponential backoff (1min → 5min → 15min → 30min → 1hr) |
| **Queryable** | `SELECT * FROM sync_queue WHERE status='failed'` |
| **Rate limiting** | Process N items at a time, prevent overload |
| **Ordered** | FIFO processing with `ORDER BY created_at` |
| **Monitored** | Status tracking: pending → processing → completed/failed |
| **Idempotent** | Duplicate prevention via idempotency_key |

---

## Implementation Strategy

### Strategy: Extended Queue with Special Operation Type

The existing `sync_queue` table supports standard CRUD operations (INSERT, UPDATE, DELETE). We'll **extend** it to support a special operation type: **`SIGNUP_ATOMIC`**.

#### Queue Item Structure

```sql
-- Standard queue item (for individual table sync)
INSERT INTO sync_queue (
    table_name,      -- 'user', 'listing', etc.
    record_id,       -- The _id of the record
    operation,       -- 'INSERT', 'UPDATE', 'DELETE'
    payload,         -- JSONB snapshot of record
    status           -- 'pending', 'processing', 'completed', 'failed'
)

-- NEW: Atomic signup queue item
INSERT INTO sync_queue (
    table_name,      -- 'SIGNUP_ATOMIC' (special marker)
    record_id,       -- user._id (primary record)
    operation,       -- 'SIGNUP_ATOMIC' (special operation)
    payload,         -- { user_id, host_account_id, guest_account_id }
    status           -- 'pending'
)
```

#### Queue Processing Logic

```typescript
// In bubble_sync/handlers/processQueueDataApi.ts (modified)

for (const item of queueItems) {
    // Check for special operation types
    if (item.operation === 'SIGNUP_ATOMIC') {
        // Route to atomic signup handler
        await handleSyncSignupAtomic(supabase, bubbleConfig, item.payload);
    } else {
        // Standard single-record sync
        await processItemDataApi(supabase, bubbleConfig, item);
    }
}
```

---

## Detailed Implementation

### Step 1: Extend sync_queue Operation Types

**File**: `supabase/migrations/20251209_extend_sync_queue_for_signup.sql` **(NEW)**

```sql
-- ============================================================================
-- Migration: Extend sync_queue for Atomic Signup Sync
-- Created: 2025-12-09
-- Purpose: Support SIGNUP_ATOMIC operation type
-- ============================================================================

-- Update operation constraint to include SIGNUP_ATOMIC
ALTER TABLE sync_queue
DROP CONSTRAINT IF EXISTS sync_queue_operation_check;

ALTER TABLE sync_queue
ADD CONSTRAINT sync_queue_operation_check
CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE', 'SIGNUP_ATOMIC'));

-- Add index for SIGNUP_ATOMIC operations
CREATE INDEX IF NOT EXISTS idx_sync_queue_signup_atomic
    ON sync_queue (operation, created_at)
    WHERE operation = 'SIGNUP_ATOMIC' AND status = 'pending';

-- Comment
COMMENT ON CONSTRAINT sync_queue_operation_check ON sync_queue IS
'Allowed operations: INSERT, UPDATE, DELETE (standard CRUD), SIGNUP_ATOMIC (special atomic signup sync)';
```

---

### Step 2: Update Signup Handler to Queue Sync

**File**: `supabase/functions/auth-user/handlers/signup.ts`

**Replace the direct invocation block with queue insertion:**

```typescript
// ========== EXISTING CODE (lines 310-330) ==========
console.log('[signup] ========== SIGNUP COMPLETE ==========');
console.log(`[signup]    User ID (_id): ${generatedUserId}`);
console.log(`[signup]    Host Account ID: ${generatedHostId}`);
console.log(`[signup]    Guest Account ID: ${generatedGuestId}`);
console.log(`[signup]    Supabase Auth ID: ${supabaseUserId}`);
console.log(`[signup]    public.user created: yes`);
console.log(`[signup]    account_host created: yes`);
console.log(`[signup]    account_guest created: yes`);

// Return session and user data
return {
  access_token,
  refresh_token,
  expires_in,
  user_id: generatedUserId,
  host_account_id: generatedHostId,
  guest_account_id: generatedGuestId,
  supabase_user_id: supabaseUserId,
  user_type: userType
};

// ========== ADD THIS AFTER RETURN (in finally block) ==========
  } catch (error) {
    // ... existing error handling ...
  } finally {
    // ========== QUEUE BUBBLE SYNC (BACKEND-TO-BACKEND) ==========
    // Only queue if signup was successful
    if (generatedUserId && generatedHostId && generatedGuestId) {
      console.log('[signup] Queueing Bubble sync for background processing...');

      try {
        // Insert into sync_queue (backend database operation)
        const { data: queueItem, error: queueError } = await supabaseAdmin
          .from('sync_queue')
          .insert({
            table_name: 'SIGNUP_ATOMIC',           // Special marker
            record_id: generatedUserId,            // Primary record ID
            operation: 'SIGNUP_ATOMIC',            // Special operation type
            payload: {
              user_id: generatedUserId,
              host_account_id: generatedHostId,
              guest_account_id: generatedGuestId
            },
            status: 'pending',
            idempotency_key: `signup_atomic:${generatedUserId}:${Date.now()}`
          })
          .select('id')
          .single();

        if (queueError) {
          console.error('[signup] Failed to queue Bubble sync:', queueError);
          // Log but don't fail signup - can be retried manually
        } else {
          console.log('[signup] ✅ Bubble sync queued:', queueItem.id);
          console.log('[signup] Queue processing will handle sync in background');
        }
      } catch (err) {
        console.error('[signup] Error queueing Bubble sync:', err);
        // Log but don't fail signup
      }
    }
  }
}
```

**⚠️ KEY DIFFERENCE**: We're doing a **database INSERT** (backend operation), NOT invoking an edge function. This is backend-to-backend via PostgreSQL.

---

### Step 3: Update Queue Processor to Handle SIGNUP_ATOMIC

**File**: `supabase/functions/bubble_sync/handlers/processQueueDataApi.ts`

**Modify to detect and route SIGNUP_ATOMIC operations:**

```typescript
/**
 * Process queue items using Bubble Data API
 */
export async function handleProcessQueueDataApi(
    supabase: SupabaseClient,
    bubbleConfig: BubbleDataApiConfig,
    payload: ProcessQueueDataApiPayload
): Promise<ProcessResult> {
    const batchSize = payload?.batch_size || 10;
    const tableFilter = payload?.table_filter;

    console.log('[processQueueDataApi] Starting Data API queue processing');
    console.log('[processQueueDataApi] Batch size:', batchSize);
    if (tableFilter) {
        console.log('[processQueueDataApi] Table filter:', tableFilter);
    }

    const result: ProcessResult = {
        processed: 0,
        success: 0,
        failed: 0,
        skipped: 0,
    };

    try {
        // Fetch pending items
        let items = await fetchPendingItems(supabase, batchSize);

        // Apply table filter if specified
        if (tableFilter) {
            items = items.filter(item => item.table_name === tableFilter);
        }

        if (items.length === 0) {
            console.log('[processQueueDataApi] No pending items found');
            return result;
        }

        console.log(`[processQueueDataApi] Processing ${items.length} items via Data API`);

        // Process each item
        for (const item of items) {
            result.processed++;

            try {
                // ========== NEW: DETECT SIGNUP_ATOMIC ==========
                if (item.operation === 'SIGNUP_ATOMIC') {
                    console.log('[processQueueDataApi] Detected SIGNUP_ATOMIC operation');

                    // Mark as processing
                    await markAsProcessing(supabase, item.id);

                    // Route to atomic signup handler
                    const syncResult = await handleSyncSignupAtomic(
                        supabase,
                        bubbleConfig,
                        item.payload
                    );

                    // Mark as completed
                    await markAsCompleted(supabase, item.id, syncResult);

                    result.success++;
                } else {
                    // Standard single-record sync
                    await processItemDataApi(supabase, bubbleConfig, item);
                    result.success++;
                }
            } catch (error) {
                if (error.message?.includes('skipped')) {
                    result.skipped++;
                } else {
                    result.failed++;
                }
            }
        }

        console.log('[processQueueDataApi] Processing complete:', result);
        return result;

    } catch (error) {
        console.error('[processQueueDataApi] Fatal error:', error);
        throw error;
    }
}
```

**Add import at top of file:**
```typescript
import { handleSyncSignupAtomic } from './syncSignupAtomic.ts';
```

---

### Step 4: Create Atomic Signup Handler (Same as Before)

**File**: `supabase/functions/bubble_sync/handlers/syncSignupAtomic.ts` **(NEW)**

**(Implementation is identical to previous plan - see previous plan document for full code)**

Key points:
- Fetches 3 records from Supabase (account_host, account_guest, user)
- Phase 1: POSTs to Bubble (3 API calls)
- Phase 2: PATCHes foreign keys (2 API calls)
- Updates bubble_id fields in Supabase
- Returns success/failure result

---

### Step 5: Schedule Queue Processing

**Option A: Periodic Processing (RECOMMENDED)**

Use a **cron job** or **scheduled function** to process the queue every 30 seconds:

```typescript
// NEW FILE: supabase/functions/bubble_sync_cron/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  console.log('[bubble_sync_cron] Running scheduled queue processing...');

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Invoke bubble_sync to process queue
  const { data, error } = await supabase.functions.invoke('bubble_sync', {
    body: {
      action: 'process_queue_data_api',
      payload: {
        batch_size: 10
      }
    }
  });

  if (error) {
    console.error('[bubble_sync_cron] Error:', error);
    return new Response(JSON.stringify({ error }), { status: 500 });
  }

  console.log('[bubble_sync_cron] Queue processing complete:', data);
  return new Response(JSON.stringify({ success: true, result: data }), { status: 200 });
});
```

**Configure in Supabase Dashboard**:
- Function: `bubble_sync_cron`
- Schedule: `*/30 * * * *` (every 30 seconds)
- OR: `0 * * * *` (every hour) for less frequent processing

**Option B: Webhook Trigger**

Configure a webhook that calls `process_queue_data_api` whenever signup occurs:

```typescript
// In signup.ts, after queueing:
await fetch('https://{project}.supabase.co/functions/v1/bubble_sync', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${supabaseServiceKey}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    action: 'process_queue_data_api',
    payload: { batch_size: 1 }
  })
});
```

**Option C: Database Trigger + pg_notify (Advanced)**

Use PostgreSQL `NOTIFY` to trigger queue processing when items are added.

---

## Backend-to-Backend Communication Flow

### 🔐 Security: No Frontend Involvement

```
┌─────────────────────────────────────────────────────────────┐
│  Frontend                                                    │
│  - Sends signup request to auth-user edge function          │
│  - Receives session tokens                                  │
│  - DONE (no further involvement)                            │
└─────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│  Backend: auth-user Edge Function                           │
│  - Creates Supabase records (auth.users, account_*, user)   │
│  - INSERTs into sync_queue (PostgreSQL operation)           │
│  - Returns session to frontend                              │
└─────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│  Backend: PostgreSQL Database                               │
│  - sync_queue table stores pending operation                │
│  - Persistent, queryable, retriable                         │
└─────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│  Backend: bubble_sync Edge Function (Scheduled)             │
│  - SELECTs from sync_queue (PostgreSQL operation)           │
│  - Processes SIGNUP_ATOMIC operation                        │
│  - Makes Bubble API calls                                   │
│  - UPDATEs sync_queue status (PostgreSQL operation)         │
└─────────────────────────────────────────────────────────────┘
```

**✅ Advantages:**
- No API keys exposed to frontend
- No direct Bubble API access from frontend
- All sensitive operations in backend
- Queue visible only to service role (RLS enabled)

---

## Testing & Deployment

### Testing Queue-Based Sync

**1. Test Queue Insertion**
```sql
-- After signup, verify queue item created
SELECT * FROM sync_queue
WHERE operation = 'SIGNUP_ATOMIC'
ORDER BY created_at DESC
LIMIT 1;

-- Expected: 1 row with status = 'pending'
```

**2. Test Queue Processing (Manual)**
```bash
# Manually trigger queue processing
curl -X POST https://{project}.supabase.co/functions/v1/bubble_sync \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "process_queue_data_api",
    "payload": { "batch_size": 10 }
  }'
```

**3. Verify Queue Status**
```sql
-- Check queue item was processed
SELECT * FROM sync_queue
WHERE operation = 'SIGNUP_ATOMIC'
ORDER BY created_at DESC
LIMIT 1;

-- Expected: status = 'completed', processed_at populated
```

**4. Verify Bubble IDs Updated**
```sql
-- Check bubble_id fields populated
SELECT _id, bubble_id FROM "user" WHERE email = 'test@example.com';
SELECT _id, bubble_id FROM account_host WHERE "User" = (SELECT _id FROM "user" WHERE email = 'test@example.com');
SELECT _id, bubble_id FROM account_guest WHERE "User" = (SELECT _id FROM "user" WHERE email = 'test@example.com');

-- Expected: All bubble_id fields populated
```

---

### Monitoring Queue Health

**Dashboard Queries:**

```sql
-- Queue status overview
SELECT status, COUNT(*) as count
FROM sync_queue
GROUP BY status;

-- Pending signup syncs
SELECT id, record_id, created_at, retry_count
FROM sync_queue
WHERE operation = 'SIGNUP_ATOMIC' AND status = 'pending'
ORDER BY created_at ASC;

-- Failed signup syncs (needs attention)
SELECT id, record_id, error_message, retry_count, next_retry_at
FROM sync_queue
WHERE operation = 'SIGNUP_ATOMIC' AND status = 'failed'
ORDER BY created_at DESC;

-- Recent completed syncs
SELECT id, record_id, processed_at
FROM sync_queue
WHERE operation = 'SIGNUP_ATOMIC' AND status = 'completed'
ORDER BY processed_at DESC
LIMIT 10;

-- Sync success rate (last 24 hours)
SELECT
  COUNT(*) FILTER (WHERE status = 'completed') as completed,
  COUNT(*) FILTER (WHERE status = 'failed') as failed,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE status = 'completed') / NULLIF(COUNT(*), 0),
    2
  ) as success_rate_pct
FROM sync_queue
WHERE operation = 'SIGNUP_ATOMIC'
  AND created_at > NOW() - INTERVAL '24 hours';
```

---

### Retry Failed Syncs

**Manual Retry:**
```bash
# Retry all failed SIGNUP_ATOMIC operations
curl -X POST https://{project}.supabase.co/functions/v1/bubble_sync \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "retry_failed",
    "payload": {}
  }'
```

**Automated Retry (Built-in):**
- Queue automatically retries failed items based on `next_retry_at`
- Exponential backoff: 1min → 5min → 15min → 30min → 1hr
- After `max_retries` (default 3), marked as permanently failed

---

## Deployment Checklist

### Pre-Deployment

- [ ] Review updated plan
- [ ] Understand queue-based architecture
- [ ] Verify sync_queue table exists (migration 20251205)

### Deployment Steps

**1. Deploy Database Migration**
```bash
# Apply new migration to extend sync_queue
supabase migration new extend_sync_queue_for_signup
# (Copy SQL from Step 1 above)
supabase db push
```

**2. Deploy bubble_sync Function**
```bash
# Deploy updated bubble_sync with signup handler
supabase functions deploy bubble_sync
```

**3. Deploy auth-user Function**
```bash
# Deploy updated signup.ts with queue insertion
supabase functions deploy auth-user
```

**4. (Optional) Deploy Scheduled Queue Processor**
```bash
# If using cron approach
supabase functions deploy bubble_sync_cron
# Configure schedule in Supabase Dashboard
```

**5. Test End-to-End**
```bash
# Create test user
POST /functions/v1/auth-user (action: signup)

# Verify queue item created
SELECT * FROM sync_queue WHERE operation = 'SIGNUP_ATOMIC' ORDER BY created_at DESC LIMIT 1;

# Manually trigger processing (if not using cron)
POST /functions/v1/bubble_sync (action: process_queue_data_api)

# Verify sync completed
SELECT * FROM sync_queue WHERE operation = 'SIGNUP_ATOMIC' AND status = 'completed';
```

---

## File References

### Files to Create

```
supabase/migrations/20251209_extend_sync_queue_for_signup.sql    NEW
supabase/functions/bubble_sync/handlers/syncSignupAtomic.ts     NEW
supabase/functions/bubble_sync_cron/index.ts                    NEW (optional)
```

### Files to Modify

```
supabase/config.toml                                             ADD bubble_sync, bubble_sync_cron
supabase/functions/bubble_sync/handlers/processQueueDataApi.ts   ADD SIGNUP_ATOMIC detection
supabase/functions/auth-user/handlers/signup.ts                  ADD queue insertion
```

### Database Tables

```
sync_queue                                                       ADD SIGNUP_ATOMIC items
account_host                                                     UPDATE bubble_id (after sync)
account_guest                                                    UPDATE bubble_id (after sync)
user                                                             UPDATE bubble_id (after sync)
```

---

## Advantages Over Direct Invocation

| Aspect | Direct Invocation | Queue-Based | Winner |
|--------|-------------------|-------------|--------|
| **Persistence** | Lost if edge function crashes | Survives in database | ✅ Queue |
| **Retry Logic** | Manual implementation required | Built-in exponential backoff | ✅ Queue |
| **Monitoring** | Edge function logs only | Queryable queue status | ✅ Queue |
| **Rate Limiting** | Can overwhelm edge function | Process N at a time | ✅ Queue |
| **Ordering** | No guarantees | FIFO via created_at | ✅ Queue |
| **Idempotency** | Manual tracking | Built-in idempotency_key | ✅ Queue |
| **Debugging** | Check logs for specific time | Query by record_id | ✅ Queue |
| **Recovery** | Lost operations | Reprocess failed items | ✅ Queue |

---

## Success Criteria

Implementation is successful when:

- [x] Signup completes in <2 seconds (user experience unchanged)
- [x] Queue item created in sync_queue table (backend operation)
- [x] No frontend involvement after signup completes
- [x] Queue processing detects SIGNUP_ATOMIC operation
- [x] Atomic sync completes (all 5 Bubble API calls)
- [x] bubble_id fields populated in Supabase
- [x] Queue item marked as 'completed'
- [x] Failed syncs automatically retry with backoff
- [x] Queue health visible via SQL queries
- [x] Backend-to-backend communication only (no frontend exposure)

---

## Architecture Alignment

### ✅ Follows ALL Best Practices

| Best Practice | Implementation | Status |
|---------------|----------------|--------|
| **Separation of Concerns** | Dedicated bubble_sync function | ✅ |
| **Backend-to-Backend** | PostgreSQL queue, no frontend | ✅ |
| **Queue-Based** | sync_queue table (persistent) | ✅ |
| **Sequential** | Queue processes FIFO | ✅ |
| **Atomic** | Single SIGNUP_ATOMIC operation | ✅ |
| **Retriable** | Built-in retry with backoff | ✅ |
| **Monitored** | Queryable queue status | ✅ |
| **Idempotent** | idempotency_key prevents duplicates | ✅ |

---

## Performance Expectations

| Metric | Target | Notes |
|--------|--------|-------|
| Signup response time | <2s | Unchanged (queue insertion is fast) |
| Queue insertion time | <50ms | Simple database INSERT |
| Sync processing time | <30s | 5 Bubble API calls + Supabase updates |
| Queue polling frequency | 30s-1min | Configurable (cron schedule) |
| Sync success rate | >95% | With automatic retry |
| Max queue depth | <100 items | Alert if queue backs up |

---

**END OF IMPLEMENTATION PLAN (REVISED)**

**Key Improvements:**
1. ✅ **Backend-to-Backend**: Uses PostgreSQL queue, no frontend involvement
2. ✅ **Persistent**: Queue survives crashes, can be retried
3. ✅ **Monitored**: Query queue status anytime
4. ✅ **Sequential**: Natural FIFO processing
5. ✅ **Robust**: Built-in retry, idempotency, error tracking

**Next Steps:**
1. Review updated plan
2. Deploy database migration (extend sync_queue)
3. Implement queue insertion in signup.ts
4. Implement SIGNUP_ATOMIC handler
5. Update queue processor to route SIGNUP_ATOMIC
6. Configure scheduled queue processing
7. Test end-to-end
8. Monitor queue health in production

**Estimated Implementation Time**: 5-7 hours
**Estimated Testing Time**: 2-3 hours
**Total**: 1-1.5 working days
