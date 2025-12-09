# Proposal to Bubble Sync Plan

**Created**: 2025-12-09
**Status**: Ready for Review
**Objective**: Propagate proposal creation from native Supabase back to Bubble via Data API

---

## Executive Summary

After the `proposal` Edge Function creates a proposal natively in Supabase, we need to sync the data back to Bubble to maintain bi-directional consistency during the migration period. This plan leverages the existing `bubble_sync` Edge Function infrastructure.

### Order of Operations (CRITICAL)

```
1. SUPABASE NATIVE OPERATION (already implemented)
   └── proposal Edge Function creates:
       - proposal row (with `_id` from generate_bubble_id())
       - Updates guest user's "Proposals List"
       - Updates host user's "Proposals List"
       - Updates guest's "Favorited Listings"

2. BUBBLE SYNC PHASE 1: CREATE (POST)
   └── For each NEW row created in Supabase:
       a. POST to /obj/proposal → Get Bubble _id back
       b. Store returned Bubble _id in Supabase `bubble_id` field
       c. Use this bubble_id for ALL subsequent Bubble operations

3. BUBBLE SYNC PHASE 2: UPDATE (PATCH)
   └── Update foreign key relationships using bubble_id:
       a. PATCH /obj/user/{guest_bubble_id} → Add proposal to "Proposals List"
       b. PATCH /obj/user/{host_bubble_id} → Add proposal to "Proposals List"
       c. PATCH /obj/user/{guest_bubble_id} → Add listing to "Favorited Listings"

⚠️ IMPORTANT: Always use bubble_id (the ID from Bubble's database) when making
   PATCH/PUT requests to Bubble. Never use Supabase's internal _id for updates.
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

### Existing bubble_sync Infrastructure

```
supabase/functions/bubble_sync/
├── index.ts                     # Router with process_queue_data_api action
├── handlers/
│   ├── processQueueDataApi.ts   # Main queue processor for Data API
│   └── ...
└── lib/
    ├── bubbleDataApi.ts         # createRecord, updateRecord, deleteRecord
    ├── fieldMapping.ts          # Field name transformations
    ├── tableMapping.ts          # Table name mappings
    ├── transformer.ts           # Type conversions
    └── queueManager.ts          # Queue operations (addToQueue, etc.)
```

---

## Implementation Plan

### Phase 1: Modify Proposal Edge Function to Trigger Bubble Sync

**File**: `supabase/functions/proposal/actions/create.ts`

After the native Supabase operations complete successfully, add a call to orchestrate Bubble sync.

```typescript
// ================================================
// AFTER: RETURN RESPONSE (line ~415)
// ADD: TRIGGER BUBBLE SYNC
// ================================================

// Import at top of file
import { triggerBubbleSync } from '../lib/bubbleSync.ts';

// After all Supabase operations complete, before returning:
// IMPORTANT: Use bubble_id for ALL Bubble API operations

await triggerBubbleSync(serviceClient, {
  // Phase 1: CREATE operations (POST - no bubble_id yet, will receive it)
  creates: [
    {
      table: 'proposal',
      supabaseId: proposalId,      // Our internal ID (for updating Supabase after)
      data: proposalData,          // The full proposal data object
    }
  ],
  // Phase 2: UPDATE operations (PATCH - MUST use bubble_id from existing records)
  updates: [
    {
      table: 'user',
      bubbleId: guestData._id,     // Guest's bubble_id from Supabase record
      data: {
        'Proposals List': updatedGuestProposals,
        'Favorited Listings': guestUpdates['Favorited Listings'],
        'flexibility (last known)': guestFlexibility,
        'Recent Days Selected': input.daysSelected,
      }
    },
    {
      table: 'user',
      bubbleId: hostUserData._id,  // Host's bubble_id from Supabase record
      data: {
        'Proposals List': [...hostProposals, proposalId],
      }
    }
  ]
});

// NOTE: The guest and host user records already exist in Bubble.
// Their _id field in Supabase IS their bubble_id (synced from Bubble).
// Always use this _id when making PATCH requests to Bubble.
```

### Phase 2: Create Bubble Sync Orchestrator

**File**: `supabase/functions/proposal/lib/bubbleSync.ts` (NEW)

```typescript
/**
 * Bubble Sync Orchestrator for Proposal Creation
 *
 * Handles the two-phase sync:
 * 1. CREATE: POST new records to Bubble, retrieve Bubble _id
 * 2. UPDATE: PATCH existing records with foreign key updates
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

interface CreateOperation {
  table: string;
  recordId: string;  // Supabase _id (generated by generate_bubble_id())
  data: Record<string, unknown>;
}

interface UpdateOperation {
  table: string;
  bubbleId: string;  // Existing Bubble _id
  data: Record<string, unknown>;
}

interface SyncPayload {
  creates: CreateOperation[];
  updates: UpdateOperation[];
}

interface BubbleDataApiConfig {
  baseUrl: string;
  apiKey: string;
}

/**
 * Main orchestrator function
 *
 * Order of Operations:
 * 1. Execute all CREATE operations first
 * 2. For each CREATE, if Bubble returns different ID, update Supabase
 * 3. Execute all UPDATE operations
 */
export async function triggerBubbleSync(
  supabase: SupabaseClient,
  payload: SyncPayload
): Promise<void> {
  console.log('[BubbleSync] Starting proposal sync orchestration');

  const bubbleBaseUrl = Deno.env.get('BUBBLE_API_BASE_URL');
  const bubbleApiKey = Deno.env.get('BUBBLE_API_KEY');

  if (!bubbleBaseUrl || !bubbleApiKey) {
    console.error('[BubbleSync] Missing Bubble configuration, skipping sync');
    return; // Non-blocking - don't fail the proposal creation
  }

  const config: BubbleDataApiConfig = {
    baseUrl: bubbleBaseUrl,
    apiKey: bubbleApiKey,
  };

  try {
    // ======================================
    // PHASE 1: CREATE OPERATIONS
    // ======================================
    console.log(`[BubbleSync] Phase 1: Processing ${payload.creates.length} CREATE operations`);

    for (const create of payload.creates) {
      await processCreate(supabase, config, create);
    }

    // ======================================
    // PHASE 2: UPDATE OPERATIONS
    // ======================================
    console.log(`[BubbleSync] Phase 2: Processing ${payload.updates.length} UPDATE operations`);

    for (const update of payload.updates) {
      await processUpdate(config, update);
    }

    console.log('[BubbleSync] Sync orchestration complete');

  } catch (error) {
    // Log but don't throw - Bubble sync is best-effort
    console.error('[BubbleSync] Sync failed (non-blocking):', error);
  }
}

/**
 * Process a CREATE operation
 *
 * 1. POST to Bubble Data API
 * 2. Retrieve the Bubble _id from response
 * 3. If different from Supabase _id, update Supabase record
 */
async function processCreate(
  supabase: SupabaseClient,
  config: BubbleDataApiConfig,
  operation: CreateOperation
): Promise<string | null> {
  console.log(`[BubbleSync:CREATE] Table: ${operation.table}, ID: ${operation.recordId}`);

  const bubbleTable = getBubbleTableName(operation.table);
  const url = `${config.baseUrl}/obj/${bubbleTable}`;

  // Prepare data for Bubble (exclude read-only fields)
  const bubbleData = prepareDataForBubble(operation.data);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bubbleData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[BubbleSync:CREATE] Failed: ${response.status} - ${errorText}`);
      return null;
    }

    const result = await response.json();
    const bubbleId = result.id;

    console.log(`[BubbleSync:CREATE] Success, Bubble ID: ${bubbleId}`);

    // If Bubble assigned a different ID, update Supabase
    // (This handles the case where Supabase used generate_bubble_id() but
    //  Bubble creates its own ID on POST)
    if (bubbleId && bubbleId !== operation.recordId) {
      console.log(`[BubbleSync:CREATE] Updating Supabase with Bubble ID: ${bubbleId}`);
      await supabase
        .from(operation.table)
        .update({ bubble_id: bubbleId })
        .eq('_id', operation.recordId);
    }

    return bubbleId;

  } catch (error) {
    console.error(`[BubbleSync:CREATE] Error:`, error);
    return null;
  }
}

/**
 * Process an UPDATE operation
 *
 * PATCH to Bubble Data API with the provided data
 */
async function processUpdate(
  config: BubbleDataApiConfig,
  operation: UpdateOperation
): Promise<boolean> {
  console.log(`[BubbleSync:UPDATE] Table: ${operation.table}, Bubble ID: ${operation.bubbleId}`);

  const bubbleTable = getBubbleTableName(operation.table);
  const url = `${config.baseUrl}/obj/${bubbleTable}/${operation.bubbleId}`;

  // Prepare data for Bubble
  const bubbleData = prepareDataForBubble(operation.data);

  try {
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bubbleData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[BubbleSync:UPDATE] Failed: ${response.status} - ${errorText}`);
      return false;
    }

    console.log(`[BubbleSync:UPDATE] Success`);
    return true;

  } catch (error) {
    console.error(`[BubbleSync:UPDATE] Error:`, error);
    return false;
  }
}

/**
 * Prepare data for Bubble by removing read-only fields
 */
function prepareDataForBubble(data: Record<string, unknown>): Record<string, unknown> {
  const readOnlyFields = new Set([
    '_id',
    'Created Date',
    'Modified Date',
    'Created By',
    'Modified By',
    '_type',
  ]);

  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    if (readOnlyFields.has(key)) continue;
    if (value === null || value === undefined) continue;
    result[key] = value;
  }

  return result;
}

/**
 * Map Supabase table name to Bubble table name
 */
function getBubbleTableName(supabaseTable: string): string {
  const mapping: Record<string, string> = {
    'proposal': 'proposal',
    'user': 'user',
    'listing': 'listing',
    // Add more as needed
  };
  return mapping[supabaseTable] || supabaseTable;
}
```

---

## Alternative Approach: Queue-Based Async Sync

Instead of synchronous sync, use the existing `sync_queue` infrastructure for reliability:

### Option A: Direct Sync (Recommended for MVP)
- Pro: Simpler, immediate
- Pro: No additional database tables needed
- Con: Slightly slower proposal creation response

### Option B: Queue-Based Async Sync
- Pro: Proposal creation returns faster
- Pro: Automatic retry on failure
- Con: More complexity
- Con: Eventual consistency (slight delay)

For MVP, recommend **Option A** (Direct Sync) with non-blocking error handling.

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PROPOSAL CREATION FLOW                               │
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
│  │  2. Fetch related data (listing, guest, host)                        │    │
│  │  3. Calculate values (compensation, move-out, status)                │    │
│  │  4. Generate _id via generate_bubble_id() RPC                         │    │
│  │  5. INSERT proposal to Supabase                                       │    │
│  │  6. UPDATE guest user in Supabase                                     │    │
│  │  7. UPDATE host user in Supabase                                      │    │
│  │                                                                       │    │
│  │  ════════════════════════════════════════════════════════════════    │    │
│  │                      BUBBLE SYNC (NEW)                                │    │
│  │  ════════════════════════════════════════════════════════════════    │    │
│  │                                                                       │    │
│  │  8. PHASE 1 - CREATE:                                                 │    │
│  │     └── POST /obj/proposal → Bubble                                   │    │
│  │         └── Response: { id: "bubble_id" }                             │    │
│  │         └── If different: UPDATE Supabase with bubble_id              │    │
│  │                                                                       │    │
│  │  9. PHASE 2 - UPDATE:                                                 │    │
│  │     ├── PATCH /obj/user/{guest_id} → Update Proposals List            │    │
│  │     └── PATCH /obj/user/{host_id} → Update Proposals List             │    │
│  │                                                                       │    │
│  │  10. Return response to frontend                                      │    │
│  │                                                                       │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│      │ Response: { success: true, data: { proposalId, status, ... } }       │
│      ▼                                                                       │
│  Frontend (redirect to guest-proposals)                                     │
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

### Task 3: Test End-to-End Flow
**Priority**: P0
**Effort**: 2 hours

1. Create proposal via Edge Function
2. Verify proposal appears in Supabase
3. Verify proposal appears in Bubble
4. Verify guest user updated in both systems
5. Verify host user updated in both systems

### Task 4: Add bubble_id Column (if needed)
**Priority**: P1
**Effort**: 30 min

If we need to track Bubble's assigned ID separately:
```sql
ALTER TABLE proposal ADD COLUMN IF NOT EXISTS bubble_id TEXT;
```

---

## Key Decisions

### Decision 1: bubble_id Strategy (CRITICAL)
**Question**: What identifier to use when updating records in Bubble?

**Answer**: ALWAYS use `bubble_id` when making PATCH/PUT requests to Bubble.

**Why**:
- Records already existing in Bubble have their own `_id` assigned by Bubble
- When synced to Supabase, this Bubble `_id` is stored in Supabase's `_id` field
- For NEW records created in Supabase first, Bubble assigns its own `_id` on POST
- We must use Bubble's assigned `_id` for all subsequent updates

**Implementation**:
```
Phase 1 (CREATE):
├── POST /obj/proposal (no _id in body - Bubble generates one)
├── Response: { id: "1733789xxxxxx..." }
└── Store this bubble_id in Supabase for future reference

Phase 2 (UPDATE):
├── For existing records (users, listings):
│   └── Their Supabase _id IS their bubble_id (came from Bubble)
├── For newly created records (proposal):
│   └── Use the bubble_id returned from Phase 1 POST
└── PATCH /obj/{table}/{bubble_id} with updates
```

**Key Rule**: Never assume Supabase's `_id` equals Bubble's `_id` for new records.
Always retrieve and use the `bubble_id` from:
1. The POST response (for new records)
2. The existing `_id` field (for records that originated in Bubble)

### Decision 2: Sync Mode
**Question**: Synchronous or async (queue-based)?

**Recommendation**: Synchronous (non-blocking) for MVP.

**Rationale**:
- Simpler implementation
- Immediate consistency
- Errors logged but don't fail the operation
- Can migrate to queue-based later if needed

### Decision 3: Foreign Key Updates
**Question**: Should user updates be part of the sync?

**Recommendation**: Yes, PATCH user records to maintain Bubble relationships.

**Rationale**:
- Keeps Bubble's "Proposals List" arrays in sync
- Required for Bubble workflows that read from user records
- Uses existing Bubble _id (no new ID generation needed)

---

## Error Handling Strategy

```typescript
// Non-blocking pattern - log errors but don't fail
try {
  await triggerBubbleSync(supabase, syncPayload);
} catch (error) {
  console.error('[BubbleSync] Failed (non-blocking):', error);
  // Consider: Add to retry queue for later processing
}
```

Bubble sync failures should NOT fail the proposal creation. The Supabase record is the source of truth.

---

## Future Enhancements

1. **Queue-Based Retry**: Add failed syncs to `sync_queue` for automatic retry
2. **Webhook Verification**: Add Bubble webhook to verify sync completed
3. **Conflict Resolution**: Handle case where Bubble has newer data
4. **Batch Sync**: Group multiple updates into single API call

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `supabase/functions/proposal/lib/bubbleSync.ts` | CREATE | Sync orchestrator |
| `supabase/functions/proposal/actions/create.ts` | MODIFY | Add sync call |
| `supabase/migrations/xxx_add_bubble_id.sql` | CREATE | Optional: Add bubble_id column |

---

## Summary

This plan provides a straightforward approach to propagating proposal data to Bubble:

1. **Phase 1 (CREATE)**: POST new proposal to Bubble, handle ID response
2. **Phase 2 (UPDATE)**: PATCH user records with updated relationship arrays
3. **Non-blocking**: Sync failures don't prevent proposal creation
4. **Order preserved**: Creates before updates, foreign keys after primary records

The implementation leverages existing infrastructure while keeping the solution simple and maintainable.

---

**Document Version**: 1.0
**Author**: Claude
**Status**: Ready for Implementation
