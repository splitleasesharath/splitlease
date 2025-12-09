# Comprehensive Plan: Direct Listing Creation to `listing` Table

**Created**: 2025-12-06
**Status**: Ready for Implementation
**Priority**: High
**Supersedes**: `bypass-listing-trial-direct-to-listing.md`

---

## Executive Summary

This plan details the complete flow for creating a listing directly in the `listing` table, bypassing `listing_trial` entirely. It includes:

1. **Photo uploads** to Supabase Storage
2. **ID generation** via `generate_bubble_id()` RPC
3. **Direct write** to `listing` table
4. **Host account linking** via `account_host.Listings`
5. **Queued Bubble sync** via `sync_queue` table (non-blocking)

---

## Architecture Overview

### Current Flow (Before)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        SELF-LISTING PAGE (Section 7)                         │
│                                                                              │
│  User clicks "Submit"                                                        │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           listingService.js                                  │
│                                                                              │
│  1. Upload photos → Supabase Storage                                        │
│  2. Generate temp ID: `self_${timestamp}_${random}`                         │
│  3. INSERT → listing_trial ←────────────────────── TARGET TO REMOVE         │
│  4. Link to account_host                                                     │
│  5. Sync to Bubble (blocking, can fail) ←───────── TARGET TO CHANGE         │
│  6. Update listing_trial with Bubble _id                                     │
│  7. Sync to listing table (best effort)                                      │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
                              Returns listing_trial.id
```

### Target Flow (After)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        SELF-LISTING PAGE (Section 7)                         │
│                                                                              │
│  User clicks "Submit"                                                        │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           listingService.js                                  │
│                                                                              │
│  1. Upload photos → Supabase Storage                                        │
│  2. Generate _id via RPC: generate_bubble_id() ←────── NEW                  │
│  3. INSERT → listing table ←────────────────────────── CHANGED              │
│  4. Link to account_host (using _id)                                        │
│  5. Queue Bubble sync → sync_queue (non-blocking) ←─── NEW                  │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
                              Returns listing._id
```

---

## Detailed Data Flow

### Step 0: Form Validation (Frontend)

**Location**: `SelfListingPage.tsx` → `handleSubmit()`

```
User in Section 7 (Review)
         │
         ▼
stageForSubmission() validates:
  ├── Required fields present
  ├── At least 3 photos
  ├── Terms agreed
  └── All sections completed
         │
         ▼
Auth check:
  ├── If logged in → proceedWithSubmit()
  └── If not → Show SignUpLoginModal → After auth → proceedWithSubmit()
```

**No changes needed** in this step.

---

### Step 1: Photo Upload

**Location**: `app/src/lib/photoUpload.js` → `uploadPhotos()`

**Current Flow** (Keep as-is):
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SUPABASE STORAGE                                     │
│                         Bucket: listing-photos                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  For each photo in formData.photos.photos:                                   │
│                                                                              │
│  1. Check if already URL (skip upload)                                       │
│  2. If File object → upload directly                                         │
│  3. If data URL → convert to Blob → upload                                   │
│                                                                              │
│  Upload path: listings/{tempListingId}/{index}_{timestamp}.{ext}            │
│                                                                              │
│  Return: Array of photo objects with:                                        │
│    - url: Public Supabase Storage URL                                        │
│    - Photo: Same URL (Bubble compatibility)                                  │
│    - Photo (thumbnail): Same URL                                             │
│    - storagePath: Storage path for deletion                                  │
│    - displayOrder: Sort order                                                │
│    - toggleMainPhoto: true for first photo                                   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Consideration**: Currently uses `tempListingId` for folder path. After change, we'll have the real `_id` BEFORE upload.

**Decision**: Generate `_id` FIRST, then use it for photo paths. This means:
1. Call `generate_bubble_id()` RPC at the very start
2. Use the real `_id` for photo storage paths
3. Photos will be organized by actual listing ID, not temp ID

---

### Step 2: ID Generation

**Current**: `self_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

**Target**: Use `generate_bubble_id()` RPC function

```sql
-- Existing RPC function (already in database)
CREATE OR REPLACE FUNCTION generate_bubble_id()
RETURNS TEXT AS $$
BEGIN
  RETURN (
    EXTRACT(EPOCH FROM NOW()) * 1000
  )::BIGINT::TEXT || 'x' || (
    floor(random() * 1000000000000)::BIGINT::TEXT
  );
END;
$$ LANGUAGE plpgsql;
```

**Example output**: `1733500000000x123456789012`

**Usage in listingService.js**:
```javascript
// Generate Bubble-compatible _id via RPC
const { data: listingId, error: idError } = await supabase.rpc('generate_bubble_id');
if (idError || !listingId) {
  throw new Error('Failed to generate listing ID');
}
console.log('[ListingService] Generated _id:', listingId);
```

---

### Step 3: Data Mapping

**Current function**: `mapFormDataToDatabase(formData, userId)`

**Changes needed**:

1. Accept `_id` as parameter (instead of generating internally)
2. Add required `listing` table columns with defaults
3. Remove `listing_trial`-specific fields

**New signature**:
```javascript
function mapFormDataToDatabase(formData, userId, listingId) {
  return {
    _id: listingId,  // Passed in, not generated

    // ... existing field mappings ...

    // Required listing table columns
    Active: false,
    Approved: false,
    Complete: true,
    'Features - Trial Periods Allowed': false,
    'Maximum Weeks': 52,
    'Minimum Nights': 1,
    'Weeks offered': 'All',
    'Nights Available (List of Nights) ': [],

    // Remove form_metadata (listing_trial-specific)
    // form_metadata: { ... }  ← REMOVE
  };
}
```

---

### Step 4: Database Insert

**Current target**: `listing_trial`
**New target**: `listing`

```javascript
// Current
const { data, error } = await supabase
  .from('listing_trial')
  .insert(listingData)
  .select()
  .single();

// New
const { data, error } = await supabase
  .from('listing')
  .insert(listingData)
  .select()
  .single();
```

**RLS Consideration**: `listing` table has RLS disabled, so direct inserts work.

---

### Step 5: Host Account Linking

**Current function**: `linkListingToHost(userId, listingId)`

**Changes needed**: Use `_id` instead of UUID `id`

```javascript
// Current (uses listing_trial.id which is UUID)
const currentListings = hostData.Listings || [];
if (!currentListings.includes(listingId)) {
  currentListings.push(listingId);
}

// No change needed - just pass listing._id instead of listing_trial.id
// The function already adds any string ID to the Listings array
```

**Call site change**:
```javascript
// Before
await linkListingToHost(userId, data.id);

// After
await linkListingToHost(userId, data._id);
```

---

### Step 6: Queue Bubble Sync (Non-Blocking)

**Instead of** calling `bubble-proxy` directly, **queue the sync** via `sync_queue` table.

**New function**: `queueBubbleSync(listing)`

```javascript
/**
 * Queue a listing for Bubble sync (non-blocking)
 * The sync_queue table is processed by the bubble_sync Edge Function
 *
 * @param {object} listing - The created listing record
 */
async function queueBubbleSync(listing) {
  console.log('[ListingService] Queueing Bubble sync for listing:', listing._id);

  const { error } = await supabase
    .from('sync_queue')
    .insert({
      table_name: 'listing',
      record_id: listing._id,
      operation: 'INSERT',
      payload: listing,
      status: 'pending',
      idempotency_key: `listing_create_${listing._id}`
    });

  if (error) {
    console.warn('[ListingService] ⚠️ Failed to queue Bubble sync:', error);
    // Non-blocking - don't throw, just log
  } else {
    console.log('[ListingService] ✅ Bubble sync queued');
  }
}
```

**Processing**: The `bubble_sync` Edge Function (already exists) will:
1. Pick up pending items from `sync_queue`
2. Transform data for Bubble API
3. POST to Bubble via Data API or Workflow API
4. Update status to `completed` or `failed`
5. Write `bubble_id` back to listing (if needed later)

---

## Complete New Flow

```javascript
/**
 * Create a new listing directly in the listing table
 *
 * Flow:
 * 1. Generate Bubble-compatible _id via RPC
 * 2. Upload photos to Supabase Storage using _id
 * 3. Map form data to database columns
 * 4. INSERT into listing table
 * 5. Link listing to account_host
 * 6. Queue Bubble sync (non-blocking)
 * 7. Return the complete listing
 */
export async function createListing(formData) {
  console.log('[ListingService] Creating listing directly in listing table');

  // Get current user ID
  const userId = getSessionId();
  console.log('[ListingService] Current user ID:', userId);

  // Step 1: Generate Bubble-compatible _id via RPC
  const { data: listingId, error: idError } = await supabase.rpc('generate_bubble_id');
  if (idError || !listingId) {
    throw new Error('Failed to generate listing ID');
  }
  console.log('[ListingService] Generated _id:', listingId);

  // Step 2: Upload photos to Supabase Storage (using real _id for path)
  let uploadedPhotos = [];
  if (formData.photos?.photos?.length > 0) {
    console.log('[ListingService] Uploading photos to Supabase Storage...');
    try {
      uploadedPhotos = await uploadPhotos(formData.photos.photos, listingId);
      console.log('[ListingService] ✅ Photos uploaded:', uploadedPhotos.length);
    } catch (uploadError) {
      console.error('[ListingService] ❌ Photo upload failed:', uploadError);
      throw new Error('Failed to upload photos: ' + uploadError.message);
    }
  }

  // Create form data with uploaded photo URLs
  const formDataWithPhotos = {
    ...formData,
    photos: {
      ...formData.photos,
      photos: uploadedPhotos
    }
  };

  // Step 3: Map form data to database columns
  const listingData = mapFormDataToDatabase(formDataWithPhotos, userId, listingId);

  // Step 4: INSERT into listing table
  const { data, error } = await supabase
    .from('listing')
    .insert(listingData)
    .select()
    .single();

  if (error) {
    console.error('[ListingService] ❌ Error creating listing:', error);
    throw new Error(error.message || 'Failed to create listing');
  }

  console.log('[ListingService] ✅ Listing created in listing table:', data._id);

  // Step 5: Link listing to account_host
  if (userId) {
    try {
      await linkListingToHost(userId, data._id);
      console.log('[ListingService] ✅ Listing linked to host account');
    } catch (linkError) {
      console.error('[ListingService] ⚠️ Failed to link listing to host:', linkError);
      // Non-blocking - listing exists, just not linked yet
    }
  }

  // Step 6: Queue Bubble sync (non-blocking)
  await queueBubbleSync(data);

  // Step 7: Return the complete listing
  return data;
}
```

---

## Files to Modify

### Primary Changes

| File | Changes | Lines |
|------|---------|-------|
| `app/src/lib/listingService.js` | Major refactor of `createListing()` | ~150 |
| `app/src/lib/listingService.js` | Delete `syncToListingTable()` | -100 |
| `app/src/lib/listingService.js` | Delete `syncListingToBubble()` | -40 |
| `app/src/lib/listingService.js` | Add `queueBubbleSync()` | +20 |
| `app/src/lib/listingService.js` | Modify `mapFormDataToDatabase()` | ~30 |
| `app/src/islands/pages/SelfListingPage/SelfListingPage.tsx` | Update success handler to use `_id` | ~5 |

### Downstream Changes (Read Paths)

| File | Changes | Lines |
|------|---------|-------|
| `app/src/lib/listingDataFetcher.js` | Remove `listing_trial` fallback | ~15 |
| `app/src/islands/pages/ListingDashboardPage/useListingDashboardPageLogic.js` | Simplify to only query `listing` | ~80 |
| `app/src/islands/pages/HostOverviewPage/useHostOverviewPageLogic.js` | Remove `listing_trial` fallback | ~10 |

### No Changes Required

| File | Reason |
|------|--------|
| `app/src/lib/photoUpload.js` | Already works with any listingId string |
| `Section6Photos.tsx` | Local state management unchanged |
| `prepareListingSubmission.ts` | Data transformation still valid |
| `useListingStore.ts` | Local state unchanged |
| `sync_queue` table | Already exists and configured |
| `bubble_sync` Edge Function | Already processes queue |

---

## Implementation Order

### Phase 1: Core Service Changes

**Step 1.1**: Update `mapFormDataToDatabase()` to accept `_id` as parameter

**Step 1.2**: Create `queueBubbleSync()` function

**Step 1.3**: Rewrite `createListing()` with new flow

**Step 1.4**: Update `linkListingToHost()` call to pass `_id`

**Step 1.5**: Delete `syncToListingTable()` function (no longer needed)

**Step 1.6**: Delete `syncListingToBubble()` function (replaced by queue)

### Phase 2: Frontend Updates

**Step 2.1**: Update `SelfListingPage.tsx` success handler
```javascript
// Before
setCreatedListingId(newListing.id);

// After
setCreatedListingId(newListing._id);
```

### Phase 3: Downstream Read Paths

**Step 3.1**: Update `listingDataFetcher.js` to only query `listing` table

**Step 3.2**: Simplify `useListingDashboardPageLogic.js` by removing `listing_trial` queries

**Step 3.3**: Simplify `useHostOverviewPageLogic.js` by removing `listing_trial` fallback

### Phase 4: Testing

**Step 4.1**: Create new listing via self-listing form
- Verify photos upload to correct path
- Verify listing created in `listing` table with generated `_id`
- Verify host account linked correctly
- Verify item added to `sync_queue`

**Step 4.2**: Verify downstream pages
- Listing Dashboard loads new listing
- Host Overview shows new listing
- Search finds new listing
- View listing page displays correctly

**Step 4.3**: Verify Bubble sync (if queue processor enabled)
- Check `sync_queue` item processed
- Verify listing exists in Bubble (optional)

---

## Error Handling

### Critical Errors (Fail Fast)

| Error | Action |
|-------|--------|
| ID generation fails | Throw error, stop |
| Photo upload fails | Throw error, stop |
| Database insert fails | Throw error, stop |

### Non-Critical Errors (Log and Continue)

| Error | Action |
|-------|--------|
| Host account linking fails | Log warning, continue |
| Bubble sync queue fails | Log warning, continue |

**Rationale**: The listing exists in Supabase. Host linking and Bubble sync can be retried/fixed later.

---

## Bubble Sync Queue Configuration

Ensure `sync_config` has entry for `listing` table:

```sql
INSERT INTO sync_config (
  supabase_table,
  bubble_workflow,
  bubble_object_type,
  enabled,
  sync_on_insert,
  sync_on_update,
  sync_on_delete
) VALUES (
  'listing',
  'sync_listing_from_supabase',
  'listing',
  TRUE,  -- Enable for new listings
  TRUE,  -- Sync on insert
  TRUE,  -- Sync on update
  FALSE  -- Don't sync deletes
) ON CONFLICT (supabase_table)
  DO UPDATE SET enabled = TRUE, sync_on_insert = TRUE;
```

---

## Database Schema Considerations

### `listing` Table Required Columns

| Column | Type | Default | Source |
|--------|------|---------|--------|
| `_id` | TEXT | - | `generate_bubble_id()` RPC |
| `Active` | BOOLEAN | `false` | Code default |
| `Approved` | BOOLEAN | `false` | Code default |
| `Complete` | BOOLEAN | `true` | Code default |
| `Created Date` | TIMESTAMPTZ | `NOW()` | Code default |
| `Modified Date` | TIMESTAMPTZ | `NOW()` | Code default |
| `Created By` | TEXT | - | userId or `'self-listing-form'` |
| `Host / Landlord` | TEXT | - | userId |

### RLS Status

- `listing` table: **RLS Disabled** (confirmed)
- Direct inserts will work without policy changes

---

## Photo Storage Structure

### Before (temp ID)
```
listing-photos/
└── listings/
    └── temp_1733500000000_abc123def/
        ├── 0_1733500001000.jpg
        ├── 1_1733500002000.jpg
        └── 2_1733500003000.jpg
```

### After (real _id)
```
listing-photos/
└── listings/
    └── 1733500000000x123456789012/
        ├── 0_1733500001000.jpg
        ├── 1_1733500002000.jpg
        └── 2_1733500003000.jpg
```

**Benefit**: Photos organized by actual listing ID, easier to manage/delete.

---

## Rollback Plan

If issues arise after deployment:

1. **Revert code changes** via git
2. **No data loss**: New listings already in `listing` table
3. **Queue cleanup**: Mark failed `sync_queue` items as `skipped`
4. **Temporary dual-write**: If needed, add write-through to both tables

---

## Success Criteria

1. New listings created via self-listing form appear in `listing` table
2. Listings receive Bubble-compatible `_id` via RPC
3. Photos stored under real `_id` path in Supabase Storage
4. Host account correctly linked via `account_host.Listings`
5. Sync item created in `sync_queue` with `pending` status
6. Listing Dashboard loads new listings correctly
7. Search page finds new listings
8. View listing page displays new listings
9. No references to `listing_trial` in create path

---

## Appendix A: Complete `createListing()` Function

```javascript
/**
 * Create a new listing directly in the listing table
 *
 * @param {object} formData - Complete form data from SelfListingPage
 * @returns {Promise<object>} - Created listing with _id
 */
export async function createListing(formData) {
  console.log('[ListingService] ========== CREATE LISTING START ==========');

  // Get current user ID
  const userId = getSessionId();
  console.log('[ListingService] User ID:', userId);

  // Step 1: Generate Bubble-compatible _id via RPC
  console.log('[ListingService] Step 1/5: Generating listing ID...');
  const { data: listingId, error: idError } = await supabase.rpc('generate_bubble_id');
  if (idError || !listingId) {
    console.error('[ListingService] ❌ ID generation failed:', idError);
    throw new Error('Failed to generate listing ID');
  }
  console.log('[ListingService] ✅ Generated _id:', listingId);

  // Step 2: Upload photos to Supabase Storage
  console.log('[ListingService] Step 2/5: Uploading photos...');
  let uploadedPhotos = [];
  if (formData.photos?.photos?.length > 0) {
    try {
      uploadedPhotos = await uploadPhotos(formData.photos.photos, listingId);
      console.log('[ListingService] ✅ Photos uploaded:', uploadedPhotos.length);
    } catch (uploadError) {
      console.error('[ListingService] ❌ Photo upload failed:', uploadError);
      throw new Error('Failed to upload photos: ' + uploadError.message);
    }
  }

  // Merge uploaded photos into form data
  const formDataWithPhotos = {
    ...formData,
    photos: { ...formData.photos, photos: uploadedPhotos }
  };

  // Step 3: Map form data to database columns
  console.log('[ListingService] Step 3/5: Mapping form data...');
  const listingData = mapFormDataToDatabase(formDataWithPhotos, userId, listingId);

  // Step 4: INSERT into listing table
  console.log('[ListingService] Step 4/5: Inserting into listing table...');
  const { data, error } = await supabase
    .from('listing')
    .insert(listingData)
    .select()
    .single();

  if (error) {
    console.error('[ListingService] ❌ Database insert failed:', error);
    throw new Error(error.message || 'Failed to create listing');
  }
  console.log('[ListingService] ✅ Listing created:', data._id);

  // Step 5: Post-creation tasks (non-blocking)
  console.log('[ListingService] Step 5/5: Post-creation tasks...');

  // 5a: Link to host account
  if (userId) {
    try {
      await linkListingToHost(userId, data._id);
      console.log('[ListingService] ✅ Linked to host account');
    } catch (linkError) {
      console.warn('[ListingService] ⚠️ Host linking failed:', linkError.message);
    }
  }

  // 5b: Queue Bubble sync
  try {
    await queueBubbleSync(data);
    console.log('[ListingService] ✅ Bubble sync queued');
  } catch (queueError) {
    console.warn('[ListingService] ⚠️ Queue sync failed:', queueError.message);
  }

  console.log('[ListingService] ========== CREATE LISTING COMPLETE ==========');
  return data;
}
```

---

## Appendix B: Updated `mapFormDataToDatabase()`

```javascript
/**
 * Map SelfListingPage form data to listing table columns
 *
 * @param {object} formData - Form data from SelfListingPage
 * @param {string|null} userId - Current user's ID
 * @param {string} listingId - Generated Bubble-compatible _id
 * @returns {object} - Database-ready object for listing table
 */
function mapFormDataToDatabase(formData, userId, listingId) {
  const now = new Date().toISOString();

  // Map available nights from object to array of day numbers (1-based)
  const daysAvailable = formData.leaseStyles?.availableNights
    ? mapAvailableNightsToArray(formData.leaseStyles.availableNights)
    : [];

  return {
    // Primary key
    _id: listingId,

    // Ownership
    'Created By': userId || 'self-listing-form',
    'Host / Landlord': userId || null,
    'Created Date': now,
    'Modified Date': now,

    // Section 1: Space Snapshot
    Name: formData.spaceSnapshot?.listingName || null,
    'Features - Type of Space': formData.spaceSnapshot?.typeOfSpace || null,
    'Features - Qty Bedrooms': formData.spaceSnapshot?.bedrooms || null,
    'Features - Qty Beds': formData.spaceSnapshot?.beds || null,
    'Features - Qty Bathrooms': formData.spaceSnapshot?.bathrooms || null,
    'Kitchen Type': formData.spaceSnapshot?.typeOfKitchen || null,
    'Features - Parking type': formData.spaceSnapshot?.typeOfParking || null,

    // Location
    'Location - Address': formData.spaceSnapshot?.address
      ? {
          address: formData.spaceSnapshot.address.fullAddress,
          number: formData.spaceSnapshot.address.number,
          street: formData.spaceSnapshot.address.street,
          lat: formData.spaceSnapshot.address.latitude,
          lng: formData.spaceSnapshot.address.longitude,
        }
      : null,
    'Location - City': formData.spaceSnapshot?.address?.city || null,
    'Location - State': formData.spaceSnapshot?.address?.state || null,
    'Location - Zip Code': formData.spaceSnapshot?.address?.zip || null,
    'Location - Coordinates': formData.spaceSnapshot?.address?.latitude
      ? {
          lat: formData.spaceSnapshot.address.latitude,
          lng: formData.spaceSnapshot.address.longitude,
        }
      : null,
    'neighborhood (manual input by user)': formData.spaceSnapshot?.address?.neighborhood || null,

    // Section 2: Features
    'Features - Amenities In-Unit': formData.features?.amenitiesInsideUnit || [],
    'Features - Amenities In-Building': formData.features?.amenitiesOutsideUnit || [],
    Description: formData.features?.descriptionOfLodging || null,
    'Description - Neighborhood': formData.features?.neighborhoodDescription || null,

    // Section 3: Lease Styles
    'rental type': formData.leaseStyles?.rentalType || 'Monthly',
    'Days Available (List of Days)': daysAvailable,

    // Section 4: Pricing
    '💰Damage Deposit': formData.pricing?.damageDeposit || 0,
    '💰Cleaning Cost / Maintenance Fee': formData.pricing?.maintenanceFee || 0,
    '💰Weekly Host Rate': formData.pricing?.weeklyCompensation || null,
    '💰Monthly Host Rate': formData.pricing?.monthlyCompensation || null,
    ...mapNightlyRatesToColumns(formData.pricing?.nightlyPricing),

    // Section 5: Rules
    'Cancellation Policy': formData.rules?.cancellationPolicy || null,
    'Preferred Gender': formData.rules?.preferredGender || 'No Preference',
    'Features - Qty Guests': formData.rules?.numberOfGuests || 2,
    'NEW Date Check-in Time': formData.rules?.checkInTime || '2:00 PM',
    'NEW Date Check-out Time': formData.rules?.checkOutTime || '11:00 AM',
    'Features - House Rules': formData.rules?.houseRules || [],
    'Dates - Blocked': formData.rules?.blockedDates || [],

    // Section 6: Photos
    'Features - Photos': formData.photos?.photos?.map((p, index) => ({
      id: p.id,
      url: p.url || p.Photo,
      Photo: p.url || p.Photo,
      'Photo (thumbnail)': p['Photo (thumbnail)'] || p.url || p.Photo,
      caption: p.caption || '',
      displayOrder: p.displayOrder ?? index,
      SortOrder: p.SortOrder ?? p.displayOrder ?? index,
      toggleMainPhoto: p.toggleMainPhoto ?? (index === 0),
      storagePath: p.storagePath || null
    })) || [],

    // Section 7: Review
    'Features - Safety': formData.review?.safetyFeatures || [],
    'Features - SQFT Area': formData.review?.squareFootage || null,
    ' First Available': formData.review?.firstDayAvailable || null,

    // Status defaults for new listings
    Active: false,
    Approved: false,
    Complete: true,
    'Features - Trial Periods Allowed': false,
    'Maximum Weeks': 52,
    'Minimum Nights': 1,
    'Weeks offered': 'All',
    'Nights Available (List of Nights) ': [],

    // Source identification
    source_type: 'self-listing-form',
  };
}
```

---

## Appendix C: `queueBubbleSync()` Function

```javascript
/**
 * Queue a listing for Bubble sync via sync_queue table
 * This is non-blocking - the bubble_sync Edge Function processes the queue
 *
 * @param {object} listing - The created listing record
 */
async function queueBubbleSync(listing) {
  const { error } = await supabase
    .from('sync_queue')
    .insert({
      table_name: 'listing',
      record_id: listing._id,
      operation: 'INSERT',
      payload: listing,
      status: 'pending',
      max_retries: 3,
      idempotency_key: `listing_insert_${listing._id}`
    });

  if (error) {
    // Log but don't throw - this is non-blocking
    console.warn('[ListingService] Failed to queue Bubble sync:', error.message);
  }
}
```

---

**Plan Version**: 1.0
**Last Updated**: 2025-12-06
**Author**: Claude Code
**Status**: Ready for Implementation
