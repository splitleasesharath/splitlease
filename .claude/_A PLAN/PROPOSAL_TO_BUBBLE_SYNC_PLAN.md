# Proposal to Bubble Sync Plan

**Created**: 2025-12-09
**Updated**: 2025-12-09 (Queue-based approach)
**Status**: Ready for Implementation
**Objective**: Propagate proposal creation from native Supabase back to Bubble via Data API

> **Recent Refactor (commit 9978710)**: Proposal creation now EXCLUSIVELY uses the `proposal` Edge Function.
> The duplicate `bubble-proxy/handlers/proposal.ts` has been removed. All changes go in `supabase/functions/proposal/`.

---

## Executive Summary

After the `proposal` Edge Function creates a proposal natively in Supabase, we need to sync the data back to Bubble. This plan uses the **existing `sync_queue` infrastructure** for reliable, sequential processing.

### Architecture: Queue-Based Backend Sync

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND                                        │
│                         (No sync logic here)                                 │
└─────────────────────────────┬───────────────────────────────────────────────┘
                              │ POST /functions/v1/proposal { action: 'create' }
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    proposal Edge Function (create.ts)                        │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ 1. Validate input                                                       │ │
│  │ 2. Fetch related data (listing, guest, host)                           │ │
│  │ 3. Calculate values                                                     │ │
│  │ 4. INSERT proposal to Supabase                                          │ │
│  │ 5. UPDATE guest user in Supabase                                        │ │
│  │ 6. UPDATE host user in Supabase                                         │ │
│  │ 7. ★ ENQUEUE sync items to sync_queue (NEW)                            │ │
│  │ 8. Return response to frontend                                          │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────┬───────────────────────────────────────────────┘
                              │ INSERT into sync_queue (3 items)
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         sync_queue TABLE                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ 1. { table: 'proposal', operation: 'INSERT', seq: 1 }               │    │
│  │ 2. { table: 'user', operation: 'UPDATE', seq: 2, bubble_id: guest } │    │
│  │ 3. { table: 'user', operation: 'UPDATE', seq: 3, bubble_id: host }  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────┬───────────────────────────────────────────────┘
                              │ Processed by bubble_sync Edge Function
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    bubble_sync Edge Function                                 │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ Sequential processing (respects order):                                 │ │
│  │                                                                          │ │
│  │ Step 1: Process proposal INSERT                                         │ │
│  │   └── POST /obj/proposal → Get bubble_id                                │ │
│  │   └── UPDATE proposal SET bubble_id = {returned_id}                     │ │
│  │                                                                          │ │
│  │ Step 2: Process guest UPDATE                                            │ │
│  │   └── PATCH /obj/user/{guest_bubble_id}                                 │ │
│  │                                                                          │ │
│  │ Step 3: Process host UPDATE                                             │ │
│  │   └── PATCH /obj/user/{host_bubble_id}                                  │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Order of Operations (CRITICAL)

```
1. SUPABASE NATIVE OPERATION (proposal Edge Function)
   └── All database operations complete natively in Supabase
   └── Proposal returned to frontend immediately

2. ENQUEUE TO sync_queue (proposal Edge Function)
   └── Add 3 queue items with sequence numbers:
       Item 1: proposal INSERT (seq: 1) - Creates get bubble_id
       Item 2: user UPDATE for guest (seq: 2) - Uses guest's bubble_id
       Item 3: user UPDATE for host (seq: 3) - Uses host's bubble_id

3. PROCESS QUEUE (bubble_sync Edge Function - triggered separately)
   └── Processes items IN ORDER by sequence number
   └── Phase 1: CREATE - POST /obj/proposal → Store returned bubble_id
   └── Phase 2: UPDATE - PATCH /obj/user/{bubble_id} for guest and host

⚠️ IMPORTANT: Always use bubble_id when making PATCH/PUT requests to Bubble.
```

---

## Current State Analysis

### What Proposal Edge Function Does (create.ts)

```
Tables Modified:
┌─────────────────────────────────────────────────────────────────────────┐
│  1. proposal (INSERT)                                                    │
│     - All proposal fields including relationships                        │
│     - _id generated via generate_bubble_id() RPC                         │
│     - bubble_id: LEFT BLANK (to be filled after Bubble sync)             │
│                                                                          │
│  2. user (UPDATE) - Guest                                                │
│     - "Proposals List": [...existing, newProposalId]                     │
│     - "Favorited Listings": [...existing, listingId]                     │
│     - "flexibility (last known)": guestFlexibility                       │
│     - "Recent Days Selected": daysSelected                               │
│     - Optional: "About Me / Bio", "need for Space", "special needs"      │
│                                                                          │
│  3. user (UPDATE) - Host                                                 │
│     - "Proposals List": [...existing, newProposalId]                     │
└─────────────────────────────────────────────────────────────────────────┘
```

### Current Edge Function Structure (Post-Refactor)

```
supabase/functions/
├── proposal/                    # DEDICATED proposal operations (commit 9978710)
│   ├── index.ts                 # Router: create, update, get, suggest
│   ├── actions/
│   │   ├── create.ts            # ← ADD BUBBLE SYNC HERE
│   │   ├── update.ts
│   │   ├── get.ts
│   │   └── suggest.ts
│   └── lib/
│       ├── types.ts
│       ├── validators.ts
│       ├── calculations.ts
│       ├── status.ts
│       ├── dayConversion.ts
│       └── bubbleSync.ts        # ← NEW FILE TO CREATE
│
├── listing/                     # DEDICATED listing operations (commit 9978710)
│   ├── index.ts
│   └── handlers/
│       ├── create.ts
│       ├── get.ts
│       └── submit.ts
│
├── bubble_sync/                 # Existing Supabase → Bubble infrastructure
│   ├── index.ts
│   ├── handlers/
│   │   └── processQueueDataApi.ts
│   └── lib/
│       ├── bubbleDataApi.ts     # createRecord, updateRecord (can reuse)
│       ├── fieldMapping.ts
│       ├── tableMapping.ts
│       └── queueManager.ts
│
└── bubble-proxy/                # Simplified after refactor
    └── handlers/
        ├── aiInquiry.ts         # Renamed from signup.ts (commit 9978710)
        ├── favorites.ts
        ├── messaging.ts
        ├── photos.ts
        └── referral.ts
```

---

## Implementation Plan

### Phase 1: Add Queue Enqueue Logic to Proposal Edge Function

**File**: `supabase/functions/proposal/actions/create.ts`

The current `create.ts` already has placeholder comments for async workflows at line ~392-408.
Add the queue enqueue logic in the same area, **BEFORE the RETURN RESPONSE section**.

```typescript
// ================================================
// LOCATION: After line 408, before "RETURN RESPONSE" section
// ADD: ENQUEUE BUBBLE SYNC ITEMS
// ================================================

// Import at top of file (add to existing imports)
import { enqueueBubbleSync } from '../lib/bubbleSyncQueue.ts';

// Insert this block after the "[ASYNC] Would trigger: proposal-suggestions" log
// and before the "RETURN RESPONSE" section:

// ================================================
// ENQUEUE BUBBLE SYNC (Supabase → Bubble via sync_queue)
// ================================================

// Enqueue sync items for sequential processing by bubble_sync Edge Function
// Order matters: CREATE proposal first, then UPDATE users
await enqueueBubbleSync(supabase, {
  // Correlation ID to group related sync items
  correlationId: proposalId,

  items: [
    // Item 1: CREATE proposal in Bubble (processed first)
    {
      sequence: 1,
      table: 'proposal',
      recordId: proposalId,
      operation: 'INSERT',
      payload: proposalData,
      // bubble_id will be retrieved from POST response and stored
    },

    // Item 2: UPDATE guest user in Bubble (processed second)
    {
      sequence: 2,
      table: 'user',
      recordId: guestData._id,           // This IS the guest's bubble_id
      operation: 'UPDATE',
      bubbleId: guestData._id,           // Explicit bubble_id for PATCH
      payload: {
        'Proposals List': updatedGuestProposals,
        'Favorited Listings': guestUpdates['Favorited Listings'] || currentFavorites,
        'flexibility (last known)': guestFlexibility,
        'Recent Days Selected': input.daysSelected,
      }
    },

    // Item 3: UPDATE host user in Bubble (processed third)
    {
      sequence: 3,
      table: 'user',
      recordId: hostUserData._id,        // This IS the host's bubble_id
      operation: 'UPDATE',
      bubbleId: hostUserData._id,        // Explicit bubble_id for PATCH
      payload: {
        'Proposals List': [...hostProposals, proposalId],
      }
    }
  ]
});

console.log(`[proposal:create] Bubble sync items enqueued (correlation: ${proposalId})`);

// ================================================
// RETURN RESPONSE (existing code at line ~416)
// ================================================
```

**Key Variables Available at Insertion Point:**
- `proposalId` - Generated via `generate_bubble_id()` RPC (used as correlation ID)
- `proposalData` - Full proposal object to sync
- `guestData._id` - Guest's bubble_id (already in Supabase from Bubble)
- `hostUserData._id` - Host's bubble_id (already in Supabase from Bubble)
- `updatedGuestProposals` - Updated proposals list array
- `guestUpdates` - Object containing Favorited Listings update
- `hostProposals` - Host's existing proposals list

### Phase 2: Create Queue Enqueue Helper

**File**: `supabase/functions/proposal/lib/bubbleSyncQueue.ts` (NEW)

```typescript
/**
 * Bubble Sync Queue Helper
 *
 * Enqueues sync operations to sync_queue table for sequential processing
 * by the bubble_sync Edge Function.
 *
 * Benefits:
 * - Decouples proposal creation from Bubble sync
 * - Automatic retry on failure
 * - Sequential processing guarantees order
 * - Non-blocking for frontend response
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

type OperationType = 'INSERT' | 'UPDATE' | 'DELETE';

interface SyncQueueItem {
  sequence: number;           // Order of processing (1, 2, 3...)
  table: string;              // Supabase table name
  recordId: string;           // The _id of the record
  operation: OperationType;   // INSERT, UPDATE, or DELETE
  bubbleId?: string;          // Explicit bubble_id for UPDATE/DELETE operations
  payload: Record<string, unknown>;
}

interface EnqueuePayload {
  correlationId: string;      // Groups related items (e.g., proposalId)
  items: SyncQueueItem[];
}

/**
 * Enqueue multiple sync items to the sync_queue table
 *
 * Items are ordered by sequence number and processed sequentially.
 * This ensures CREATE operations complete before UPDATE operations
 * that depend on the created records.
 */
export async function enqueueBubbleSync(
  supabase: SupabaseClient,
  payload: EnqueuePayload
): Promise<void> {
  console.log(`[BubbleSyncQueue] Enqueuing ${payload.items.length} items (correlation: ${payload.correlationId})`);

  // Sort items by sequence to ensure proper order
  const sortedItems = [...payload.items].sort((a, b) => a.sequence - b.sequence);

  for (const item of sortedItems) {
    const idempotencyKey = `${payload.correlationId}:${item.table}:${item.recordId}:${item.sequence}`;

    // Build the queue item payload
    // Include bubble_id in payload for UPDATE operations
    const queuePayload = {
      ...item.payload,
      _id: item.recordId,
      ...(item.bubbleId && { _bubble_id: item.bubbleId }),  // For UPDATE ops
    };

    try {
      const { error } = await supabase
        .from('sync_queue')
        .insert({
          table_name: item.table,
          record_id: item.recordId,
          operation: item.operation,
          payload: queuePayload,
          status: 'pending',
          idempotency_key: idempotencyKey,
        });

      if (error) {
        // Check if it's a duplicate (already queued)
        if (error.code === '23505') {  // Unique violation
          console.log(`[BubbleSyncQueue] Item already queued: ${idempotencyKey}`);
        } else {
          console.error(`[BubbleSyncQueue] Failed to enqueue item:`, error);
          throw error;
        }
      } else {
        console.log(`[BubbleSyncQueue] Enqueued: ${item.table}/${item.recordId} (${item.operation}, seq: ${item.sequence})`);
      }
    } catch (err) {
      // Log but continue - don't fail the proposal creation
      console.error(`[BubbleSyncQueue] Error enqueuing item:`, err);
    }
  }

  console.log(`[BubbleSyncQueue] Enqueue complete for correlation: ${payload.correlationId}`);
}
```

### Phase 3: Configure sync_config for Proposal Table

The existing `bubble_sync` Edge Function already handles queue processing via `processQueueDataApi.ts`.
We need to enable the proposal sync configuration.

**Action**: Run this SQL to enable proposal sync:

```sql
-- Enable proposal sync in sync_config
UPDATE sync_config
SET
  enabled = TRUE,
  sync_on_insert = TRUE,
  sync_on_update = TRUE
WHERE supabase_table = 'proposal';

-- Verify configuration
SELECT * FROM sync_config WHERE supabase_table = 'proposal';
```

### Phase 4: Trigger Queue Processing

The `bubble_sync` Edge Function needs to be triggered to process the queue.
Options for triggering:

**Option A: Call from proposal Edge Function (after enqueue)**
```typescript
// After enqueueBubbleSync(), trigger processing
await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/bubble_sync`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    action: 'process_queue_data_api',
    payload: { batch_size: 10 }
  })
});
```

**Option B: Cron job (recommended for production)**
- Use Supabase pg_cron or external scheduler
- Runs every minute to process pending queue items

**Option C: Database trigger + pg_net (most elegant)**
- Trigger on `sync_queue` INSERT automatically calls the Edge Function

For initial implementation, use **Option A** for immediate processing.

---

## Queue Processing Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         QUEUE-BASED SYNC FLOW                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Frontend (ViewSplitLeasePage.jsx)                                          │
│      │                                                                       │
│      │ POST { action: 'create', payload: {...} }                            │
│      ▼                                                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  proposal Edge Function (create.ts)                                  │    │
│  │                                                                       │    │
│  │  1. Validate input                                                    │    │
│  │  2. Fetch related data                                                │    │
│  │  3. Calculate values                                                  │    │
│  │  4. INSERT proposal to Supabase                                       │    │
│  │  5. UPDATE guest/host users in Supabase                               │    │
│  │  6. ★ ENQUEUE to sync_queue (3 items)                                │    │
│  │  7. Return response immediately                                       │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│      │                                                                       │
│      │ Response: { success: true } (fast!)                                  │
│      ▼                                                                       │
│  Frontend (redirect to guest-proposals)                                     │
│                                                                              │
│  ════════════════════════════════════════════════════════════════════════   │
│                    ASYNC QUEUE PROCESSING                                    │
│  ════════════════════════════════════════════════════════════════════════   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  sync_queue TABLE                                                     │    │
│  │  ┌─────────────────────────────────────────────────────────────┐     │    │
│  │  │ id=1: proposal/INSERT  status=pending  created_at=T1        │     │    │
│  │  │ id=2: user/UPDATE      status=pending  created_at=T1+1ms    │     │    │
│  │  │ id=3: user/UPDATE      status=pending  created_at=T1+2ms    │     │    │
│  │  └─────────────────────────────────────────────────────────────┘     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                              │                                               │
│                              │ Triggered by: Edge Function call / Cron      │
│                              ▼                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  bubble_sync Edge Function (processQueueDataApi.ts)                  │    │
│  │                                                                       │    │
│  │  Process items IN ORDER (by created_at):                             │    │
│  │                                                                       │    │
│  │  1. Process proposal INSERT:                                          │    │
│  │     └── POST /obj/proposal → Bubble                                   │    │
│  │     └── Response: { id: "bubble_id" }                                 │    │
│  │     └── UPDATE proposal SET bubble_id = {id} WHERE _id = {record_id} │    │
│  │     └── Mark queue item as 'completed'                                │    │
│  │                                                                       │    │
│  │  2. Process guest user UPDATE:                                        │    │
│  │     └── PATCH /obj/user/{bubble_id} → Bubble                          │    │
│  │     └── Mark queue item as 'completed'                                │    │
│  │                                                                       │    │
│  │  3. Process host user UPDATE:                                         │    │
│  │     └── PATCH /obj/user/{bubble_id} → Bubble                          │    │
│  │     └── Mark queue item as 'completed'                                │    │
│  │                                                                       │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

             ┌─────────────────┐        ┌─────────────────┐
             │    SUPABASE     │        │    BUBBLE.IO    │
             │   (Source of    │  ───▶  │   (Synced       │
             │    Truth)       │        │    Copy)        │
             └─────────────────┘        └─────────────────┘
```

---

## Field Mapping: Proposal Table

Based on `create.ts`, these fields are written to the proposal table and need to be synced:

| Supabase Field | Bubble Field | Notes |
|----------------|--------------|-------|
| `_id` | `_id` | READ-ONLY in Bubble - don't send |
| `Listing` | `Listing` | FK to listing._id |
| `Guest` | `Guest` | FK to user._id |
| `Host - Account` | `Host - Account` | FK to account_host._id |
| `Created By` | `Created By` | READ-ONLY in Bubble |
| `Guest email` | `Guest email` | Text |
| `Guest flexibility` | `Guest flexibility` | Text |
| `preferred gender` | `preferred gender` | Text |
| `need for space` | `need for space` | Text (nullable) |
| `About yourself` | `About yourself` | Text (nullable) |
| `Special needs` | `Special needs` | Text (nullable) |
| `Comment` | `Comment` | Text (nullable) |
| `Move in range start` | `Move in range start` | DateTime |
| `Move in range end` | `Move in range end` | DateTime |
| `Move-out` | `Move-out` | DateTime |
| `move-in range (text)` | `move-in range (text)` | Text (nullable) |
| `Reservation Span` | `Reservation Span` | Text |
| `Reservation Span (Weeks)` | `Reservation Span (Weeks)` | Number |
| `actual weeks during reservation span` | `actual weeks during reservation span` | Number |
| `duration in months` | `duration in months` | Number |
| `Days Selected` | `Days Selected` | Array |
| `Nights Selected (Nights list)` | `Nights Selected (Nights list)` | Array |
| `nights per week (num)` | `nights per week (num)` | Number |
| `check in day` | `check in day` | Number |
| `check out day` | `check out day` | Number |
| `Days Available` | `Days Available` | Array |
| `Complementary Nights` | `Complementary Nights` | Array |
| `proposal nightly price` | `proposal nightly price` | Number |
| `4 week rent` | `4 week rent` | Number |
| `Total Price for Reservation (guest)` | `Total Price for Reservation (guest)` | Number |
| `Total Compensation (proposal - host)` | `Total Compensation (proposal - host)` | Number |
| `host compensation` | `host compensation` | Number |
| `4 week compensation` | `4 week compensation` | Number |
| `cleaning fee` | `cleaning fee` | Number |
| `damage deposit` | `damage deposit` | Number |
| `nightly price for map (text)` | `nightly price for map (text)` | Text |
| `rental type` | `rental type` | Text |
| `House Rules` | `House Rules` | Array |
| `week selection` | `week selection` | Text (nullable) |
| `hc house rules` | `hc house rules` | Array |
| `Location - Address` | `Location - Address` | Object |
| `Location - Address slightly different` | `Location - Address slightly different` | Object |
| `Status` | `Status` | Text (Option Set) |
| `Order Ranking` | `Order Ranking` | Number |
| `History` | `History` | Array |
| `Is Finalized` | `Is Finalized` | Boolean |
| `Deleted` | `Deleted` | Boolean |
| `rental application` | `rental application` | FK (nullable) |
| `host email` | `host email` | Text |
| `suggested reason (benefits)` | `suggested reason (benefits)` | Text (nullable) |
| `origin proposal of this suggestion` | `origin proposal of this suggestion` | FK (nullable) |
| `number of matches` | `number of matches` | Number (nullable) |
| `Created Date` | `Created Date` | READ-ONLY in Bubble |
| `Modified Date` | `Modified Date` | READ-ONLY in Bubble |

---

## Implementation Tasks

### Task 1: Create bubbleSync.ts Library
**File**: `supabase/functions/proposal/lib/bubbleSync.ts`
**Priority**: P0
**Effort**: 2 hours

Create the sync orchestrator as documented above.

### Task 2: Modify create.ts to Call Sync
**File**: `supabase/functions/proposal/actions/create.ts`
**Priority**: P0
**Effort**: 1 hour

Add the sync call after Supabase operations complete.

### Task 3: Enable sync_config
**Priority**: P0
**Effort**: 15 min

Enable proposal sync configuration in the database.

### Task 4: Test End-to-End Flow
**Priority**: P0
**Effort**: 2 hours

1. Create proposal via Edge Function
2. Verify sync_queue has 3 pending items
3. Trigger bubble_sync Edge Function
4. Verify proposal appears in Bubble
5. Verify guest user updated in Bubble
6. Verify host user updated in Bubble
7. Verify all queue items marked as 'completed'

### Task 5: Add bubble_id Column to Proposal Table
**Priority**: P0
**Effort**: 15 min

Required to store Bubble's assigned ID after POST:
```sql
ALTER TABLE proposal ADD COLUMN IF NOT EXISTS bubble_id TEXT;
CREATE INDEX IF NOT EXISTS idx_proposal_bubble_id ON proposal (bubble_id);
```

---

## Key Decisions

### Decision 1: bubble_id Strategy (CRITICAL)
**Question**: What identifier to use when updating records in Bubble?

**Answer**: ALWAYS use `bubble_id` when making PATCH/PUT requests to Bubble.

**Implementation**:
```
For INSERT operations:
├── POST /obj/proposal (no _id in body - Bubble generates one)
├── Response: { id: "1733789xxxxxx..." }
└── UPDATE proposal SET bubble_id = {id} WHERE _id = {record_id}

For UPDATE operations:
├── For existing records (users, listings):
│   └── Their Supabase _id IS their bubble_id (came from Bubble)
├── For newly created records (proposal):
│   └── Use bubble_id stored from INSERT response
└── PATCH /obj/{table}/{bubble_id} with updates
```

### Decision 2: Sync Mode
**Question**: Synchronous or async (queue-based)?

**Answer**: Queue-based async sync using `sync_queue`.

**Why**:
- Sync happens entirely on backend (Edge Function to Edge Function)
- Frontend never waits for Bubble sync
- Automatic retry on failure (built into queue infrastructure)
- Sequential processing guaranteed by queue order
- Decoupled - proposal creation succeeds regardless of Bubble sync status

### Decision 3: Queue Processing Trigger
**Question**: How to trigger queue processing?

**Answer**: Call `bubble_sync` Edge Function from `proposal` Edge Function after enqueue.

**Alternative for production**: pg_cron job running every minute.

### Decision 4: Invocation Location
**Question**: Where does sync logic run?

**Answer**: 100% backend. The flow is:
```
Frontend → proposal Edge Function → sync_queue table → bubble_sync Edge Function → Bubble API
```
Frontend only calls `proposal` Edge Function. All sync orchestration happens server-side.

---

## Error Handling Strategy

The queue-based approach provides built-in error handling:

1. **Failed items remain in queue** with status='failed' and error_message
2. **Automatic retry** with exponential backoff (1min, 5min, 15min, 30min, 1hr)
3. **Max 3 retries** before permanent failure
4. **Non-blocking** - proposal creation always succeeds, sync is eventual

```typescript
// In proposal/actions/create.ts - enqueue is non-blocking
try {
  await enqueueBubbleSync(supabase, syncPayload);
  console.log('[proposal:create] Sync items enqueued');
} catch (error) {
  // Log but don't fail - items can be manually requeued if needed
  console.error('[proposal:create] Failed to enqueue sync (non-blocking):', error);
}
```

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `supabase/functions/proposal/lib/bubbleSyncQueue.ts` | CREATE | Queue enqueue helper |
| `supabase/functions/proposal/actions/create.ts` | MODIFY | Add enqueue call + trigger |
| `supabase/migrations/xxx_add_bubble_id_to_proposal.sql` | CREATE | Add bubble_id column |

---

## Summary

This plan provides a reliable, queue-based approach to propagating proposal data to Bubble:

1. **Backend-only sync** - Frontend never waits for or knows about Bubble sync
2. **Queue-based** - Uses existing `sync_queue` infrastructure for reliability
3. **Sequential processing** - Items processed in order (INSERT before UPDATE)
4. **Automatic retry** - Failed items retry with exponential backoff
5. **bubble_id handling** - INSERT gets bubble_id from response, UPDATE uses it

The implementation leverages existing infrastructure while ensuring reliable, ordered sync operations.

---

**Document Version**: 2.0
**Author**: Claude
**Status**: Ready for Implementation
