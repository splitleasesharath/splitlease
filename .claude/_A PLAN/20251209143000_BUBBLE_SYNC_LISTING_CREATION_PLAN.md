# Bubble Sync: Listing Creation Propagation Plan

**Created**: 2025-12-09 14:30:00
**Updated**: 2025-12-09 15:00:00
**Status**: Planning
**Priority**: HIGH
**Scope**: Propagate native Supabase listing creation to Bubble via Data API

---

## Executive Summary

When a listing is created natively in Supabase (via `listingService.js`), we need to propagate these changes to Bubble using the Data API. This plan covers:

1. **Phase 1 - CREATE**: POST the listing to Bubble, receive `bubble_id`, update Supabase
2. **Phase 2 - FK PROPAGATION**: Update `account_host.Listings` array in Bubble using the received `bubble_id`

---

## ID Strategy Clarification

| Field | Purpose | Origin |
|-------|---------|--------|
| `_id` | Supabase primary key | Generated via `generate_bubble_id()` RPC |
| `bubble_id` | Bubble's primary key for that record | Assigned by Bubble on POST, returned in response |

**Key Points**:
- `_id` is for Supabase operations ONLY
- `bubble_id` is for Bubble operations ONLY
- When calling Bubble APIs (PUT/PATCH), always use `bubble_id`, never `_id`
- `bubble_id` starts as NULL and is populated after Bubble POST response

---

## Sync Trigger Mechanism (RECOMMENDED)

### Approach: Database Trigger + Queue + Edge Function Processing

This approach uses the existing `sync_queue` infrastructure while keeping sync logic in Edge Functions (not frontend).

```
┌─────────────────────────────────────────────────────────────────────────┐
│  SYNC TRIGGER FLOW                                                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. listingService.js creates listing                                    │
│     INSERT INTO listing (..., bubble_id = NULL)                         │
│                                                                          │
│  2. Database Trigger fires (on INSERT where bubble_id IS NULL)          │
│     INSERT INTO sync_queue (table_name='listing', operation='INSERT')   │
│                                                                          │
│  3. listingService.js calls Edge Function (non-blocking)                │
│     supabase.functions.invoke('bubble_sync', {                          │
│       action: 'process_queue_data_api',                                 │
│       payload: { table_filter: 'listing' }                              │
│     })                                                                   │
│                                                                          │
│  4. Edge Function processes sync_queue                                   │
│     - Fetch pending items for 'listing' table                           │
│     - POST to Bubble Data API                                           │
│     - Receive bubble_id in response                                     │
│     - UPDATE Supabase listing.bubble_id = response.id                   │
│     - Process FK propagation (account_host.Listings)                    │
│     - Mark queue item as completed                                      │
│                                                                          │
│  5. If sync fails:                                                       │
│     - Queue item marked as 'failed' with retry_count++                  │
│     - Can be retried later via 'retry_failed' action                    │
│     - Listing still exists in Supabase (acceptable)                     │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Why This Approach?

| Requirement | How It's Met |
|-------------|--------------|
| Sync from Edge Functions, not frontend | ✅ listingService.js only triggers, Edge Function does sync |
| Use Supabase queues | ✅ Uses existing `sync_queue` table |
| Queue not mandatory | ✅ Queue provides tracking/retry, but sync is immediate |
| Error handling: retry later | ✅ Failed items stay in queue for retry |

---

## Current State Analysis

### Native Listing Creation Flow (Supabase)

From `app/src/lib/listingService.js`:

```
Step 1: getSessionId() → userId
Step 2: supabase.rpc('generate_bubble_id') → generatedId (_id)
Step 3: Process photos (Supabase Storage)
Step 4: mapFormDataToListingTable() → listingData
Step 5: INSERT into listing table (with _id, bubble_id = NULL)
Step 6: linkListingToHost() → UPDATE account_host.Listings array (NON-BLOCKING)
Step 7: Return listing
```

### Key Schema Facts (VERIFIED)

| Table | `_id` Column | `bubble_id` Column |
|-------|--------------|-------------------|
| `listing` | TEXT, NOT NULL (PK) | TEXT, NULLABLE |
| `account_host` | TEXT, NOT NULL (PK) | TEXT, NULLABLE |

- `_id` = Supabase primary key (generated via RPC, NOT from Bubble)
- `bubble_id` = NULL initially, populated AFTER Bubble POST returns the Bubble-assigned ID
- For existing hosts created via Bubble, `account_host.bubble_id` is already populated (from signup)

### Recent Architecture Changes (commit 9978710)

The `listing` Edge Function now has proper handlers:
- `listing/handlers/create.ts` - Creates in Bubble first, syncs to Supabase
- `listing/handlers/get.ts` - Fetches listing data
- `listing/handlers/submit.ts` - Full listing submission

**Important**: The current `listing` Edge Function creates listings in **Bubble first** (source of truth), then syncs to Supabase. Our new flow is the **reverse** - create in Supabase first, then sync to Bubble.

---

## Target Architecture

### New Flow: Supabase-First with Bubble Sync

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    SUPABASE-FIRST LISTING CREATION                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │  FRONTEND: createListing(formData)                                  │ │
│  │  Location: app/src/lib/listingService.js                           │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                              │                                           │
│                              ▼                                           │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │  STEP 1: Generate _id via RPC                                       │ │
│  │  supabase.rpc('generate_bubble_id') → "1733xxxxx123456789"         │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                              │                                           │
│                              ▼                                           │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │  STEP 2: INSERT into listing table                                  │ │
│  │  _id = generatedId                                                  │ │
│  │  bubble_id = NULL  ← Key: NULL until Bubble sync                    │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                              │                                           │
│                              ▼                                           │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │  STEP 3: Link to account_host in Supabase (NON-BLOCKING)           │ │
│  │  Append _id to account_host.Listings array                         │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                              │                                           │
│                              ▼                                           │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │  STEP 4: Return listing to frontend                                 │ │
│  │  (Supabase creation complete, Bubble sync pending)                 │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                              │                                           │
│                              ▼                                           │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │  STEP 5: Trigger Bubble Sync (ASYNC/QUEUED)                        │ │
│  │  Call bubble_sync Edge Function                                     │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    BUBBLE_SYNC EDGE FUNCTION                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │  PHASE 1: CREATE LISTING IN BUBBLE                                  │ │
│  │                                                                      │ │
│  │  1a. Fetch listing from Supabase (by _id)                          │ │
│  │  1b. Transform fields for Bubble format                             │ │
│  │  1c. POST /obj/listing                                              │ │
│  │      Body: { Name, Description, Features..., (NO _id) }            │ │
│  │  1d. Receive response: { status: "success", id: "173xxx999" }      │ │
│  │  1e. UPDATE Supabase: SET bubble_id = response.id                  │ │
│  │                                                                      │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                              │                                           │
│                              ▼                                           │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │  PHASE 2: UPDATE ACCOUNT_HOST IN BUBBLE (FK PROPAGATION)           │ │
│  │                                                                      │ │
│  │  2a. Fetch account_host from Supabase (by User = userId)           │ │
│  │  2b. Get host's bubble_id from account_host                        │ │
│  │  2c. Fetch current Listings array from Bubble                       │ │
│  │  2d. Append NEW listing's bubble_id to Listings array              │ │
│  │  2e. PATCH /obj/account_host/{host_bubble_id}                      │ │
│  │      Body: { Listings: [...existing, newListingBubbleId] }         │ │
│  │                                                                      │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                              │                                           │
│                              ▼                                           │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │  COMPLETE: Mark sync as successful                                  │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Critical Bug Fix Required

### Issue in `processQueueDataApi.ts`

**File**: `supabase/functions/bubble_sync/handlers/processQueueDataApi.ts`
**Lines**: 248-251

**Current (WRONG)**:
```typescript
const { error: idError } = await supabase
    .from(tableName)
    .update({ _id: bubbleId })  // ❌ WRONG - updating _id
    .eq('_id', recordId);
```

**Should Be**:
```typescript
const { error: idError } = await supabase
    .from(tableName)
    .update({ bubble_id: bubbleId })  // ✅ CORRECT - updating bubble_id
    .eq('_id', recordId);
```

**Reason**:
- `_id` is the Supabase primary key (must not change after creation)
- `bubble_id` is where Bubble's assigned ID should be stored
- After Bubble POST returns an ID, we store it in `bubble_id`, not `_id`

---

## Implementation Plan

### Phase 1: Create Database Trigger for sync_queue

**New Migration**: `supabase/migrations/YYYYMMDD_listing_sync_trigger.sql`

```sql
-- ============================================================================
-- Trigger: Auto-add listing INSERT to sync_queue
-- Only fires when bubble_id IS NULL (new Supabase-originated listings)
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_listing_sync_queue()
RETURNS TRIGGER AS $$
BEGIN
    -- Only queue if bubble_id is NULL (not yet synced to Bubble)
    IF NEW.bubble_id IS NULL THEN
        INSERT INTO sync_queue (
            table_name,
            record_id,
            operation,
            payload,
            status,
            idempotency_key
        ) VALUES (
            'listing',
            NEW._id,
            'INSERT',
            to_jsonb(NEW),
            'pending',
            'listing:' || NEW._id || ':' || extract(epoch from now())::text
        )
        ON CONFLICT ON CONSTRAINT idx_sync_queue_pending_unique
        DO UPDATE SET
            payload = EXCLUDED.payload,
            created_at = NOW();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER listing_bubble_sync_trigger
    AFTER INSERT ON listing
    FOR EACH ROW
    EXECUTE FUNCTION trigger_listing_sync_queue();

-- Also enable sync_config for listing table
UPDATE sync_config
SET enabled = TRUE, sync_on_insert = TRUE
WHERE supabase_table = 'listing';
```

### Phase 2: Fix processQueueDataApi.ts Bug

**File**: `supabase/functions/bubble_sync/handlers/processQueueDataApi.ts`

Fix the `updateSupabaseBubbleId` function to update `bubble_id` instead of `_id`:

```typescript
async function updateSupabaseBubbleId(
    supabase: SupabaseClient,
    tableName: string,
    recordId: string,
    bubbleId: string
): Promise<void> {
    console.log(`[processQueueDataApi] Updating ${tableName}/${recordId} with bubble_id: ${bubbleId}`);

    // Update the bubble_id field (NOT _id)
    const { error } = await supabase
        .from(tableName)
        .update({ bubble_id: bubbleId })
        .eq('_id', recordId);

    if (error) {
        console.error(`[processQueueDataApi] Failed to update bubble_id:`, error);
        // Don't throw - Bubble record was created successfully
        // This is a tracking update failure, not a sync failure
    } else {
        console.log(`[processQueueDataApi] ✅ Updated bubble_id successfully`);
    }
}
```

### Phase 3: Add FK Propagation Handler for Listing

**New File**: `supabase/functions/bubble_sync/handlers/propagateListingFK.ts`

This handler updates `account_host.Listings` in Bubble after a listing is created.

```typescript
/**
 * Propagate Listing FK to account_host in Bubble
 *
 * Called after listing is created in Bubble to update the host's Listings array.
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { BubbleDataApiConfig, getRecord, updateRecord } from '../lib/bubbleDataApi.ts';

export interface PropagateListingFKPayload {
    listing_id: string;      // Supabase _id of the listing
    listing_bubble_id: string; // Bubble-assigned ID of the listing
    user_id: string;         // Host's user _id (to find account_host)
}

export async function handlePropagateListingFK(
    supabase: SupabaseClient,
    bubbleConfig: BubbleDataApiConfig,
    payload: PropagateListingFKPayload
): Promise<{ success: boolean; host_updated: boolean }> {
    const { listing_id, listing_bubble_id, user_id } = payload;

    console.log('[propagateListingFK] Starting FK propagation');
    console.log('[propagateListingFK] Listing _id:', listing_id);
    console.log('[propagateListingFK] Listing bubble_id:', listing_bubble_id);
    console.log('[propagateListingFK] User _id:', user_id);

    // Step 1: Find host's account_host record in Supabase
    const { data: hostAccount, error: hostError } = await supabase
        .from('account_host')
        .select('_id, bubble_id, Listings')
        .eq('User', user_id)
        .single();

    if (hostError || !hostAccount) {
        console.warn('[propagateListingFK] ⚠️ No account_host found for user:', user_id);
        return { success: true, host_updated: false };
    }

    // Step 2: Check if host has bubble_id
    if (!hostAccount.bubble_id) {
        console.warn('[propagateListingFK] ⚠️ Host account has no bubble_id, skipping FK propagation');
        return { success: true, host_updated: false };
    }

    console.log('[propagateListingFK] Host bubble_id:', hostAccount.bubble_id);

    // Step 3: Fetch current Listings array from Bubble
    let currentListings: string[] = [];
    try {
        const hostBubbleData = await getRecord(bubbleConfig, 'account_host', hostAccount.bubble_id);
        currentListings = (hostBubbleData?.Listings as string[]) || [];
        console.log('[propagateListingFK] Current Bubble Listings:', currentListings.length);
    } catch (fetchError) {
        console.warn('[propagateListingFK] ⚠️ Failed to fetch host from Bubble, using empty array');
    }

    // Step 4: Append new listing's bubble_id if not already present
    if (!currentListings.includes(listing_bubble_id)) {
        currentListings.push(listing_bubble_id);
        console.log('[propagateListingFK] Adding listing to array, new count:', currentListings.length);
    } else {
        console.log('[propagateListingFK] Listing already in array, skipping');
        return { success: true, host_updated: false };
    }

    // Step 5: PATCH account_host in Bubble
    try {
        await updateRecord(
            bubbleConfig,
            'account_host',
            hostAccount.bubble_id,
            { Listings: currentListings }
        );
        console.log('[propagateListingFK] ✅ Host Listings updated in Bubble');

        // Step 6: Also update Supabase account_host.Listings for consistency
        await supabase
            .from('account_host')
            .update({ Listings: currentListings })
            .eq('_id', hostAccount._id);

        return { success: true, host_updated: true };
    } catch (updateError) {
        console.error('[propagateListingFK] ❌ Failed to update host Listings:', updateError);
        return { success: false, host_updated: false };
    }
}
```

### Phase 4: Integrate FK Propagation into Queue Processing

**File**: `supabase/functions/bubble_sync/handlers/processQueueDataApi.ts`

Add FK propagation call after successful INSERT for listing table:

```typescript
case 'INSERT': {
    // Create new record in Bubble
    const newBubbleId = await createRecord(
        bubbleConfig,
        item.table_name,
        item.payload,
        item.sync_config?.field_mapping || undefined
    );

    // Update Supabase record with the new bubble_id
    await updateSupabaseBubbleId(
        supabase,
        item.table_name,
        item.record_id,
        newBubbleId
    );

    // ===== NEW: FK Propagation for listing table =====
    if (item.table_name === 'listing') {
        const userId = item.payload?.['Created By'] as string ||
                       item.payload?.['Host / Landlord'] as string;

        if (userId) {
            try {
                await handlePropagateListingFK(supabase, bubbleConfig, {
                    listing_id: item.record_id,
                    listing_bubble_id: newBubbleId,
                    user_id: userId
                });
            } catch (fkError) {
                console.warn('[processQueueDataApi] FK propagation failed:', fkError);
                // Don't fail the main sync - listing was created successfully
            }
        }
    }
    // ===== END FK Propagation =====

    bubbleResponse = { id: newBubbleId, operation: 'CREATE' };
    console.log(`[processQueueDataApi] Created in Bubble, ID: ${newBubbleId}`);
    break;
}
```

### Phase 5: Update listingService.js to Trigger Sync

**File**: `app/src/lib/listingService.js`

Add sync trigger after successful insert (non-blocking):

```javascript
// After Step 5 (INSERT into listing) succeeds...

// Step 6: Link listing to account_host in Supabase (existing, NON-BLOCKING)
if (userId) {
    try {
        await linkListingToHost(userId, data._id);
        console.log('[ListingService] ✅ Listing linked to host account');
    } catch (linkError) {
        console.error('[ListingService] ⚠️ Failed to link listing to host:', linkError);
    }
}

// Step 7: Trigger Bubble sync (NEW, NON-BLOCKING)
// The database trigger already added the listing to sync_queue
// This call processes the queue immediately
triggerBubbleSync().catch(syncError => {
    console.error('[ListingService] ⚠️ Bubble sync trigger failed:', syncError);
    // Don't throw - listing exists in Supabase, sync will retry later
});

return data;

// ...

/**
 * Trigger Bubble sync for pending listings
 * Calls the bubble_sync Edge Function to process the queue
 */
async function triggerBubbleSync() {
    console.log('[ListingService] Triggering Bubble sync...');

    const { data, error } = await supabase.functions.invoke('bubble_sync', {
        body: {
            action: 'process_queue_data_api',
            payload: {
                table_filter: 'listing',
                batch_size: 1  // Process just the new listing
            }
        }
    });

    if (error) {
        throw new Error(`Bubble sync failed: ${error.message}`);
    }

    console.log('[ListingService] ✅ Bubble sync result:', data);
    return data;
}
```

---

## API Reference

### Bubble Data API Endpoints

| Operation | Method | Endpoint | Body |
|-----------|--------|----------|------|
| Create Listing | POST | `/obj/listing` | `{ Name, Description, ... }` |
| Update Host | PATCH | `/obj/account_host/{bubble_id}` | `{ Listings: [...] }` |
| Get Record | GET | `/obj/{table}/{bubble_id}` | - |

### Response Formats

**POST Success**:
```json
{
  "status": "success",
  "id": "1733123456789x987654321"
}
```

**PATCH Success**:
```json
{
  "status": "success"
}
```

---

## Error Handling Strategy

### Error Hierarchy

| Error Type | Action | Retry? |
|------------|--------|--------|
| Supabase fetch fails | Fail immediately | No |
| Bubble POST fails | Log, mark failed | Yes (via queue) |
| Supabase bubble_id update fails | Log warning, continue | Manual retry |
| Host account not found | Log warning, skip FK propagation | No |
| Bubble PATCH (host) fails | Log warning, continue | Yes (via queue) |

### Queue-Based Retry (Optional Enhancement)

If implementing full queue-based retry:

1. On failure, INSERT into `sync_queue` with `status: 'failed'`
2. Store error details in `error_message` and `error_details`
3. Set `next_retry_at` using exponential backoff
4. Scheduled job processes failed items

---

## Files to Create/Modify

### New Files

| File | Purpose |
|------|---------|
| `supabase/functions/bubble_sync/handlers/propagateListingFK.ts` | FK propagation handler for account_host.Listings |
| `supabase/migrations/YYYYMMDD_listing_sync_trigger.sql` | Database trigger for auto-queueing listing INSERTs |

### Modified Files

| File | Changes |
|------|---------|
| `supabase/functions/bubble_sync/handlers/processQueueDataApi.ts` | Fix `updateSupabaseBubbleId()` to update `bubble_id` (not `_id`), add FK propagation call |
| `app/src/lib/listingService.js` | Add `triggerBubbleSync()` call after listing creation |

### Reference Files (Read-Only)

| File | Purpose |
|------|---------|
| `supabase/functions/bubble_sync/lib/bubbleDataApi.ts` | Bubble Data API client (already has `createRecord`, `updateRecord`, `getRecord`) |
| `supabase/functions/bubble_sync/lib/transformer.ts` | Field type transformations |
| `supabase/functions/bubble_sync/lib/fieldMapping.ts` | Field name mappings |
| `supabase/functions/bubble_sync/lib/tableMapping.ts` | Table name mappings |
| `supabase/functions/bubble_sync/lib/queueManager.ts` | Queue operations |
| `supabase/migrations/20251205_create_sync_queue_tables.sql` | sync_queue and sync_config table definitions |
| `Documentation/Database/REFERENCE_TABLES_FK_FIELDS.md` | FK relationships reference |

---

## Testing Checklist

### Unit Tests

- [ ] `transformRecordForBubble()` correctly transforms listing data
- [ ] Day indices converted from 0-6 to 1-7
- [ ] Read-only fields excluded from Bubble payload
- [ ] Empty/null fields handled appropriately

### Integration Tests

- [ ] Create listing in Supabase → verify `bubble_id` is NULL
- [ ] POST to Bubble → verify listing created
- [ ] Update Supabase → verify `bubble_id` populated
- [ ] Update account_host in Bubble → verify Listings array updated

### End-to-End Tests

- [ ] Full flow: Frontend `createListing()` → Supabase → Bubble sync → verify both databases

---

## Rollback Plan

If issues arise:

1. **Disable sync trigger** in `listingService.js` (comment out `triggerBubbleSync()` call)
2. Listings will be created in Supabase only
3. Manual sync can be performed later via `sync_new_listing` action

---

## Open Questions

1. **Sync Timing**: Should sync be immediate (blocking) or queued (async)?
   - **Recommendation**: Immediate but non-blocking (fire-and-forget with error logging)

2. **Failure Notification**: Should users be notified if Bubble sync fails?
   - **Recommendation**: No - listing exists in Supabase, sync failures are internal

3. **Photos**: Are photos handled separately or included in listing sync?
   - **Current State**: Photos stored in Supabase Storage with URLs in `Features - Photos` JSONB
   - **Question**: Does Bubble need photo records in `listing_photo` table?

---

## Implementation Summary

### Order of Implementation

1. **Phase 1**: Create database trigger migration (listing → sync_queue)
2. **Phase 2**: Fix `processQueueDataApi.ts` bug (`_id` → `bubble_id`)
3. **Phase 3**: Create `propagateListingFK.ts` handler
4. **Phase 4**: Integrate FK propagation into `processQueueDataApi.ts`
5. **Phase 5**: Update `listingService.js` to trigger sync
6. **Phase 6**: Deploy Edge Function and run migration
7. **Phase 7**: Testing

### Sequence Diagram

```
listingService.js                 Supabase DB              bubble_sync EF           Bubble API
      │                               │                         │                       │
      │  1. INSERT listing            │                         │                       │
      │──────────────────────────────>│                         │                       │
      │                               │                         │                       │
      │                               │ 2. TRIGGER: INSERT      │                       │
      │                               │    into sync_queue      │                       │
      │                               │                         │                       │
      │  3. invoke('bubble_sync')     │                         │                       │
      │───────────────────────────────────────────────────────>│                       │
      │                               │                         │                       │
      │                               │ 4. SELECT from          │                       │
      │                               │<───────────────────────│                       │
      │                               │    sync_queue           │                       │
      │                               │                         │                       │
      │                               │                         │ 5. POST /obj/listing  │
      │                               │                         │──────────────────────>│
      │                               │                         │                       │
      │                               │                         │ 6. { id: bubble_id }  │
      │                               │                         │<──────────────────────│
      │                               │                         │                       │
      │                               │ 7. UPDATE listing       │                       │
      │                               │<───────────────────────│                       │
      │                               │    SET bubble_id = ...  │                       │
      │                               │                         │                       │
      │                               │                         │ 8. GET account_host   │
      │                               │                         │──────────────────────>│
      │                               │                         │                       │
      │                               │                         │ 9. PATCH account_host │
      │                               │                         │──────────────────────>│
      │                               │                         │    (add to Listings)  │
      │                               │                         │                       │
      │                               │ 10. Mark completed      │                       │
      │                               │<───────────────────────│                       │
      │                               │                         │                       │
      │  11. Return { success }       │                         │                       │
      │<──────────────────────────────────────────────────────│                       │
      │                               │                         │                       │
```

---

## Document Version

- **Version**: 2.0
- **Last Updated**: 2025-12-09 15:15:00
- **Author**: Claude Opus 4.5
- **Status**: Ready for Implementation

