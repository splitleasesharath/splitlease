# Queueing Standardization Analysis: Edge Functions Data Propagation

**Date:** 2025-12-10
**Status:** Analysis Complete
**Scope:** auth-user, bubble_sync, proposal, listing Edge Functions

---

## Executive Summary

The codebase exhibits **three distinct patterns** for Supabase → Bubble data propagation. Only `bubble_sync` implements proper native queueing with retry mechanisms. The other edge functions use ad-hoc approaches with varying levels of robustness.

**Recommendation:** Standardize all data propagation to use `bubble_sync` with native Supabase queueing (`sync_queue` table).

---

## Current State Analysis

### Pattern 1: Native Supabase Queue (bubble_sync) ✅ RECOMMENDED

**Used by:** `bubble_sync` (primary), `auth-user/signup.ts`, `proposal/create.ts`

**Architecture:**
```
                                    ┌─────────────────┐
                                    │   sync_queue    │
┌──────────────────┐               │   (Database)    │
│   Edge Function  │──INSERT──────▶│                 │
│   (auth/proposal)│               │  status: pending│
└──────────────────┘               └────────┬────────┘
                                            │
                                   ┌────────▼────────┐
                                   │  bubble_sync    │
                                   │  Edge Function  │
                                   │ (process_queue) │
                                   └────────┬────────┘
                                            │
                                   ┌────────▼────────┐
                                   │   Bubble API    │
                                   │   (Data API)    │
                                   └─────────────────┘
```

**Features:**
- Exponential backoff retry (1min → 5min → 15min → 30min → 1hr)
- Idempotency via unique keys
- Batch processing (configurable batch_size)
- Status tracking (pending/processing/completed/failed/skipped)
- Sync configuration via `sync_config` table
- Field mapping and transformation
- Bubble Data API support (POST/PATCH/DELETE)

**Implementation Files:**
- `supabase/functions/bubble_sync/index.ts:1-172`
- `supabase/functions/bubble_sync/lib/queueManager.ts:1-402`
- `supabase/functions/bubble_sync/handlers/processQueueDataApi.ts:1-307`

---

### Pattern 2: BubbleSyncService Direct Call (listing) ⚠️ NOT RECOMMENDED

**Used by:** `listing/handlers/create.ts`, `listing/handlers/submit.ts`

**Architecture:**
```
┌──────────────────┐     DIRECT     ┌─────────────────┐
│   Edge Function  │───────────────▶│   Bubble API    │
│   (listing)      │                │ (Workflow API)  │
└──────────────────┘                └─────────────────┘
        │
        │ Best Effort
        ▼
┌──────────────────┐
│    Supabase      │
│    (upsert)      │
└──────────────────┘
```

**Issues:**
- **No retry mechanism** - if Bubble API fails, data is lost
- **No queueing** - synchronous call blocks response
- **Best-effort Supabase sync** - can result in data inconsistency
- **No idempotency** - retry could create duplicates

**Code Evidence (listing/handlers/create.ts:72-104):**
```typescript
// Step 1: Create in Bubble (REQUIRED)
const listingId = await syncService.triggerWorkflow(...);

// Step 3: Sync to Supabase (BEST EFFORT - don't fail if this fails)
try {
  await syncService.syncToSupabase('listing', dataToSync);
} catch (syncError) {
  console.error('[listing:create] ⚠️ Step 3 failed...');
  console.log('[listing:create] Continuing without Supabase sync...');
}
```

---

### Pattern 3: Hybrid Queue + Fire-and-Forget (proposal) ⚠️ PARTIAL IMPLEMENTATION

**Used by:** `proposal/actions/create.ts`

**Architecture:**
```
┌──────────────────┐               ┌─────────────────┐
│   Edge Function  │──INSERT──────▶│   sync_queue    │
│   (proposal)     │               │   (Database)    │
└──────────────────┘               └────────┬────────┘
        │                                   │
        │ Fire & Forget                     │
        ▼                                   ▼
┌──────────────────┐               ┌─────────────────┐
│  bubble_sync     │◀──────────────│  bubble_sync    │
│  (HTTP trigger)  │               │ (queue process) │
└──────────────────┘               └─────────────────┘
```

**Features (Good):**
- Uses `enqueueBubbleSync()` helper
- Sequential processing via `sequence` field
- Correlation ID for grouped operations
- Filters incompatible fields

**Issues:**
- Fire-and-forget trigger (`triggerQueueProcessing()`) is unreliable
- If trigger fails, items sit in queue until manual/cron processing
- No verification that queue processing started
- `update.ts` has **NO bubble sync** at all

**Code Evidence (proposal/lib/bubbleSyncQueue.ts:131-163):**
```typescript
// Fire and forget - don't await the response
fetch(`${supabaseUrl}/functions/v1/bubble_sync`, {
  method: 'POST',
  ...
}).catch(err => {
  console.warn('[BubbleSyncQueue] Queue trigger failed (non-blocking):', err.message);
});
```

---

### Pattern 4: Queue Insert Only (auth-user/signup) ⚠️ PARTIAL IMPLEMENTATION

**Used by:** `auth-user/handlers/signup.ts`

**Implementation (signup.ts:345-381):**
```typescript
// Insert into sync_queue (backend database operation)
const { data: queueItem, error: queueError } = await supabaseAdmin
  .from('sync_queue')
  .insert({
    table_name: 'SIGNUP_ATOMIC',
    record_id: generatedUserId,
    operation: 'SIGNUP_ATOMIC',
    payload: {...},
    status: 'pending',
    idempotency_key: `signup_atomic:${generatedUserId}:${Date.now()}`
  });
```

**Features (Good):**
- Properly uses sync_queue table
- Idempotency key
- Atomic signup operation type
- Handler exists in `bubble_sync/handlers/syncSignupAtomic.ts`

**Issues:**
- **No trigger mechanism** - relies on external cron/manual processing
- Unlike proposal, doesn't call `triggerQueueProcessing()`

---

## Comparison Matrix

| Feature | bubble_sync | auth-user | proposal | listing |
|---------|-------------|-----------|----------|---------|
| Uses sync_queue table | ✅ | ✅ | ✅ | ❌ |
| Retry mechanism | ✅ (5 levels) | Via bubble_sync | Via bubble_sync | ❌ |
| Idempotency | ✅ | ✅ | ✅ | ❌ |
| Batch processing | ✅ | N/A | N/A | N/A |
| Status tracking | ✅ | Via bubble_sync | Via bubble_sync | ❌ |
| Triggers processing | N/A | ❌ | ✅ (fire-and-forget) | N/A |
| Field mapping | ✅ | Manual | Manual | N/A |
| Handles UPDATE ops | ✅ | ❌ | ❌ (update.ts has no sync) | ❌ |
| Non-blocking | ✅ | ✅ | ✅ | ❌ (blocking) |

---

## Database Schema Reference

### sync_queue Table
```sql
CREATE TABLE sync_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  operation TEXT NOT NULL,  -- INSERT, UPDATE, DELETE, SIGNUP_ATOMIC
  payload JSONB,
  status TEXT DEFAULT 'pending' NOT NULL,  -- pending, processing, completed, failed, skipped
  error_message TEXT,
  error_details JSONB,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ,
  next_retry_at TIMESTAMPTZ,
  bubble_response JSONB,
  idempotency_key TEXT UNIQUE
);

-- Indexes for efficient queue processing
CREATE INDEX idx_sync_queue_status_created ON sync_queue (status, created_at)
  WHERE status IN ('pending', 'failed');
CREATE INDEX idx_sync_queue_retry ON sync_queue (next_retry_at)
  WHERE status = 'failed' AND retry_count < 3;
CREATE UNIQUE INDEX idx_sync_queue_pending_unique ON sync_queue (table_name, record_id)
  WHERE status = 'pending';
```

### sync_config Table
```sql
CREATE TABLE sync_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  supabase_table TEXT NOT NULL UNIQUE,
  bubble_workflow TEXT NOT NULL,
  bubble_object_type TEXT,
  enabled BOOLEAN DEFAULT true,
  sync_on_insert BOOLEAN DEFAULT true,
  sync_on_update BOOLEAN DEFAULT true,
  sync_on_delete BOOLEAN DEFAULT false,
  field_mapping JSONB,
  excluded_fields TEXT[]
);
```

---

## Identified Issues

### Critical Issues

1. **listing edge function has NO queueing**
   - Direct API calls with no retry
   - Data loss on transient failures
   - No idempotency protection

2. **proposal/update.ts has NO bubble sync**
   - Updates in Supabase don't propagate to Bubble
   - Data drift between systems

3. **No scheduled queue processor**
   - Items in queue rely on fire-and-forget triggers
   - If trigger fails, items remain pending indefinitely

### Medium Issues

4. **Inconsistent trigger mechanisms**
   - auth-user: No trigger
   - proposal: Fire-and-forget HTTP call
   - bubble_sync: Manual invocation only

5. **Field filtering duplication**
   - `bubbleSyncQueue.ts` filters fields manually
   - `fieldMapping.ts` in bubble_sync has its own filtering
   - Potential for inconsistency

### Low Issues

6. **No monitoring/alerting**
   - Failed items not reported
   - No visibility into queue health

---

## Standardization Recommendations

### 1. Adopt Single Queue Pattern

All edge functions should use the same pattern:

```typescript
// Standard helper function (new file: _shared/queueSync.ts)
export async function queueBubbleSync(
  supabase: SupabaseClient,
  items: QueueSyncItem[]
): Promise<void> {
  for (const item of items) {
    const idempotencyKey = generateIdempotencyKey(item);

    await supabase.from('sync_queue').insert({
      table_name: item.table,
      record_id: item.recordId,
      operation: item.operation,
      payload: item.payload,
      status: 'pending',
      idempotency_key: idempotencyKey,
    });
  }
}
```

### 2. Implement Scheduled Processing

Options for reliable queue processing:

**Option A: Supabase pg_cron (Recommended)**
```sql
-- Process queue every 1 minute
SELECT cron.schedule(
  'process-bubble-sync-queue',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/bubble_sync',
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')),
    body := '{"action":"process_queue_data_api","payload":{"batch_size":10}}'::jsonb
  );
  $$
);
```

**Option B: Database Trigger + pg_net**
```sql
CREATE OR REPLACE FUNCTION notify_bubble_sync()
RETURNS trigger AS $$
BEGIN
  PERFORM net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/bubble_sync',
    headers := '{"Authorization": "Bearer " || service_key}',
    body := '{"action":"process_queue_data_api"}'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_bubble_sync
  AFTER INSERT ON sync_queue
  FOR EACH STATEMENT
  EXECUTE FUNCTION notify_bubble_sync();
```

### 3. Refactor listing Edge Function

```typescript
// listing/handlers/create.ts - PROPOSED REFACTOR
import { queueBubbleSync } from '../../_shared/queueSync.ts';

export async function handleCreate(payload, supabase) {
  // 1. Generate ID
  const { data: listingId } = await supabase.rpc('generate_bubble_id');

  // 2. Insert into Supabase (source of truth during migration)
  await supabase.from('listing').insert({ _id: listingId, ...listingData });

  // 3. Queue sync to Bubble
  await queueBubbleSync(supabase, [{
    table: 'listing',
    recordId: listingId,
    operation: 'INSERT',
    payload: listingData,
  }]);

  // 4. Return immediately
  return { _id: listingId, ...listingData };
}
```

### 4. Add Bubble Sync to proposal/update.ts

```typescript
// proposal/actions/update.ts - ADD AT END
// Queue sync to Bubble
try {
  await enqueueBubbleSync(supabase, {
    correlationId: input.proposal_id,
    items: [{
      sequence: 1,
      table: 'proposal',
      recordId: input.proposal_id,
      operation: 'UPDATE',
      bubbleId: proposalData._id,  // Use existing Bubble ID
      payload: updates,
    }]
  });
  triggerQueueProcessing();
} catch (err) {
  console.error('[proposal:update] Failed to queue sync:', err);
}
```

---

## Migration Path

### Phase 1: Add Scheduled Processing
1. Enable `pg_cron` and `pg_net` extensions
2. Create cron job for queue processing (every 1 minute)
3. Verify existing queued items are processed

### Phase 2: Standardize Shared Utilities
1. Create `_shared/queueSync.ts` with unified helper
2. Move field filtering logic to shared location
3. Add common types and interfaces

### Phase 3: Refactor Edge Functions
1. Update `listing` to use queue pattern
2. Add sync to `proposal/update.ts`
3. Verify `auth-user` queue integration

### Phase 4: Monitoring & Alerting
1. Create dashboard for queue health
2. Add Slack notification for failed items
3. Implement dead letter queue for permanent failures

---

## Affected Files Summary

| File | Current Pattern | Recommended Action |
|------|-----------------|-------------------|
| `bubble_sync/index.ts` | ✅ Good | Keep as primary processor |
| `bubble_sync/lib/queueManager.ts` | ✅ Good | Extract shared utilities |
| `auth-user/handlers/signup.ts` | ⚠️ Partial | Add trigger mechanism |
| `proposal/actions/create.ts` | ⚠️ Partial | Keep, verify trigger reliability |
| `proposal/actions/update.ts` | ❌ Missing | Add bubble sync |
| `listing/handlers/create.ts` | ❌ None | Full refactor to queue pattern |
| `listing/handlers/submit.ts` | ❌ None | Full refactor to queue pattern |

---

## Appendix: Key File References

- `supabase/functions/bubble_sync/index.ts` - Main queue processor
- `supabase/functions/bubble_sync/lib/queueManager.ts` - Queue operations
- `supabase/functions/bubble_sync/handlers/processQueueDataApi.ts` - Data API handler
- `supabase/functions/bubble_sync/handlers/syncSignupAtomic.ts` - Atomic signup handler
- `supabase/functions/proposal/lib/bubbleSyncQueue.ts` - Proposal queue helper
- `supabase/functions/auth-user/handlers/signup.ts` - Signup queue insertion
- `supabase/functions/listing/handlers/create.ts` - No queueing (needs refactor)
- `supabase/functions/_shared/bubbleSync.ts` - BubbleSyncService class (direct calls)
