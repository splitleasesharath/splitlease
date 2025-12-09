# Bubble Sync: Listing Creation Propagation Plan

**Created**: 2025-12-09 14:30:00
**Status**: Planning
**Priority**: HIGH
**Scope**: Propagate native Supabase listing creation to Bubble via Data API

---

## Executive Summary

When a listing is created natively in Supabase (via `listingService.js`), we need to propagate these changes to Bubble using the Data API. This plan covers:

1. **Phase 1 - CREATE**: POST the listing to Bubble, receive `bubble_id`, update Supabase
2. **Phase 2 - FK PROPAGATION**: Update `account_host.Listings` array in Bubble using the received `bubble_id`

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

### Key Schema Facts

| Table | `_id` Column | `bubble_id` Column |
|-------|--------------|-------------------|
| `listing` | TEXT, NOT NULL (PK) | TEXT, NULLABLE |
| `account_host` | TEXT, NOT NULL (PK) | TEXT, NULLABLE |

- `_id` = Generated via `generate_bubble_id()` RPC (looks like Bubble format but is NOT from Bubble)
- `bubble_id` = NULL initially, populated AFTER Bubble POST returns the real Bubble-assigned ID

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

## Implementation Plan

### Phase 1: Add New Action to bubble_sync Edge Function

**File**: `supabase/functions/bubble_sync/index.ts`

Add new action: `sync_new_listing`

```typescript
case 'sync_new_listing':
  result = await handleSyncNewListing(payload);
  break;
```

### Phase 2: Create Handler for New Listing Sync

**New File**: `supabase/functions/bubble_sync/handlers/syncNewListing.ts`

```typescript
/**
 * Sync New Listing to Bubble
 *
 * Called after a listing is created natively in Supabase.
 *
 * Flow:
 * 1. Fetch listing from Supabase (by _id)
 * 2. Transform fields for Bubble Data API
 * 3. POST to Bubble /obj/listing
 * 4. Update Supabase listing.bubble_id with response
 * 5. Update account_host.Listings in Bubble (FK propagation)
 */

interface SyncNewListingPayload {
  listing_id: string;    // The Supabase _id
  user_id: string;       // The host's user _id (for account_host lookup)
}

export async function handleSyncNewListing(
  payload: Record<string, unknown>
): Promise<SyncNewListingResult> {
  // Implementation details below
}
```

### Phase 3: Detailed Handler Implementation

#### Step 1: Fetch Listing from Supabase

```typescript
// Fetch the listing that was just created
const { data: listing, error: fetchError } = await supabase
  .from('listing')
  .select('*')
  .eq('_id', listing_id)
  .single();

if (fetchError || !listing) {
  throw new Error(`Listing not found: ${listing_id}`);
}

// Verify bubble_id is NULL (not yet synced)
if (listing.bubble_id) {
  console.log('[syncNewListing] Listing already synced, bubble_id:', listing.bubble_id);
  return { already_synced: true, bubble_id: listing.bubble_id };
}
```

#### Step 2: Transform Fields for Bubble

```typescript
import { transformRecordForBubble } from '../lib/transformer.ts';
import { applyFieldMappingToBubble, BUBBLE_READ_ONLY_FIELDS } from '../lib/fieldMapping.ts';

// Transform data types (day indices, booleans, etc.)
const transformedData = transformRecordForBubble(listing, 'listing');

// Apply field name mapping and remove read-only fields
const bubbleData = applyFieldMappingToBubble(transformedData, 'listing');

// Explicitly remove fields Bubble manages
delete bubbleData['_id'];           // Bubble will assign its own
delete bubbleData['Created Date'];  // Bubble manages
delete bubbleData['Modified Date']; // Bubble manages
delete bubbleData['bubble_id'];     // Not a Bubble field
```

#### Step 3: POST to Bubble Data API

```typescript
import { BubbleDataApiClient } from '../lib/bubbleDataApi.ts';

const bubbleClient = new BubbleDataApiClient(bubbleBaseUrl, bubbleApiKey);

// POST /obj/listing
const createResponse = await bubbleClient.create('listing', bubbleData);

if (!createResponse.success || !createResponse.id) {
  throw new Error(`Bubble POST failed: ${createResponse.error}`);
}

const bubbleId = createResponse.id;
console.log('[syncNewListing] ✅ Created in Bubble with ID:', bubbleId);
```

#### Step 4: Update Supabase with bubble_id

```typescript
// Update the listing with the Bubble-assigned ID
const { error: updateError } = await supabase
  .from('listing')
  .update({ bubble_id: bubbleId })
  .eq('_id', listing_id);

if (updateError) {
  console.error('[syncNewListing] ⚠️ Failed to update bubble_id:', updateError);
  // Don't throw - the Bubble record exists, just tracking failed
}
```

#### Step 5: FK Propagation - Update account_host.Listings in Bubble

```typescript
// Fetch host's account_host record from Supabase
const { data: hostAccount, error: hostError } = await supabase
  .from('account_host')
  .select('_id, bubble_id, Listings')
  .eq('User', user_id)
  .single();

if (hostError || !hostAccount) {
  console.warn('[syncNewListing] ⚠️ No account_host found for user:', user_id);
  return { bubble_id: bubbleId, host_updated: false };
}

// Check if host has bubble_id (required for Bubble update)
if (!hostAccount.bubble_id) {
  console.warn('[syncNewListing] ⚠️ Host account has no bubble_id, skipping FK propagation');
  return { bubble_id: bubbleId, host_updated: false };
}

// Fetch current Listings array from Bubble
const hostBubbleData = await bubbleClient.get('account_host', hostAccount.bubble_id);
const currentListings = (hostBubbleData?.Listings as string[]) || [];

// Append new listing's bubble_id
if (!currentListings.includes(bubbleId)) {
  currentListings.push(bubbleId);
}

// PATCH account_host in Bubble
const patchResponse = await bubbleClient.update(
  'account_host',
  hostAccount.bubble_id,
  { Listings: currentListings }
);

if (!patchResponse.success) {
  console.error('[syncNewListing] ⚠️ Failed to update host Listings:', patchResponse.error);
}

console.log('[syncNewListing] ✅ Host Listings updated in Bubble');
```

### Phase 4: Update listingService.js to Trigger Sync

**File**: `app/src/lib/listingService.js`

Add sync trigger after Step 5 (link to host):

```javascript
// Step 6: Trigger Bubble sync (NON-BLOCKING)
// This queues the listing for propagation to Bubble
try {
  await triggerBubbleSync(data._id, userId);
  console.log('[ListingService] ✅ Bubble sync triggered');
} catch (syncError) {
  console.error('[ListingService] ⚠️ Bubble sync trigger failed:', syncError);
  // Continue - listing exists in Supabase, sync will retry later
}

return data;
```

New function:

```javascript
/**
 * Trigger Bubble sync for a newly created listing
 * Calls the bubble_sync Edge Function asynchronously
 */
async function triggerBubbleSync(listingId, userId) {
  const { data, error } = await supabase.functions.invoke('bubble_sync', {
    body: {
      action: 'sync_new_listing',
      payload: {
        listing_id: listingId,
        user_id: userId
      }
    }
  });

  if (error) {
    throw new Error(`Bubble sync failed: ${error.message}`);
  }

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
| `supabase/functions/bubble_sync/handlers/syncNewListing.ts` | Main handler for new listing sync |

### Modified Files

| File | Changes |
|------|---------|
| `supabase/functions/bubble_sync/index.ts` | Add `sync_new_listing` action route |
| `supabase/functions/bubble_sync/lib/bubbleDataApi.ts` | Ensure `create()`, `update()`, `get()` methods exist |
| `app/src/lib/listingService.js` | Add `triggerBubbleSync()` call after listing creation |

### Reference Files (Read-Only)

| File | Purpose |
|------|---------|
| `supabase/functions/bubble_sync/lib/transformer.ts` | Field type transformations |
| `supabase/functions/bubble_sync/lib/fieldMapping.ts` | Field name mappings |
| `supabase/functions/bubble_sync/lib/tableMapping.ts` | Table name mappings |
| `supabase/functions/bubble_sync/lib/queueManager.ts` | Queue operations (if using queue) |
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

## Timeline

| Phase | Description | Estimate |
|-------|-------------|----------|
| Phase 1 | Add action route to bubble_sync | 15 min |
| Phase 2 | Create syncNewListing handler | 2 hrs |
| Phase 3 | Update bubbleDataApi if needed | 30 min |
| Phase 4 | Update listingService.js | 30 min |
| Phase 5 | Testing | 1-2 hrs |
| **Total** | | **4-5 hrs** |

---

## Document Version

- **Version**: 1.0
- **Last Updated**: 2025-12-09 14:30:00
- **Author**: Claude Opus 4.5

