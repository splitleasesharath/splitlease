# Bubble Sync Disabled - Tech Debt Documentation

**Date**: 2025-12-06
**Status**: Disabled
**Reason**: Migration to direct Supabase listing table insertion

---

## Overview

The Bubble sync functionality for listing creation has been disabled. Listings are now created directly in the Supabase `listing` table using the `generate_bubble_id()` RPC function to generate Bubble-compatible primary keys.

---

## What Changed

### Before (Old Flow)
1. Insert listing into `listing_trial` table
2. Call Bubble API via `bubble-proxy` Edge Function to create listing in Bubble
3. Receive Bubble `_id` from response
4. Update `listing_trial` with Bubble `_id`
5. Sync data to `listing` table

### After (New Flow)
1. Generate Bubble-compatible `_id` via `generate_bubble_id()` RPC
2. Insert listing directly into `listing` table with generated `_id`
3. Link listing to `account_host.Listings` array using `_id`
4. Done - no Bubble sync required

---

## Disabled Functions

The following functions were disabled in `app/src/lib/listingService.js`:

### `syncToListingTable(listingTrialData, bubbleId)`

**Original Purpose**: Sync data from `listing_trial` to `listing` table after Bubble sync.

**Why Disabled**: No longer needed - we now insert directly into `listing` table.

```javascript
// ORIGINAL IMPLEMENTATION (for reference)
async function syncToListingTable(listingTrialData, bubbleId) {
  console.log('[ListingService] Syncing to listing table with _id:', bubbleId);

  const listingData = {
    _id: bubbleId,
    'Created By': listingTrialData['Created By'] || 'self-listing-form',
    'Created Date': listingTrialData['Created Date'] || new Date().toISOString(),
    'Modified Date': new Date().toISOString(),
    Name: listingTrialData.Name,
    'Features - Type of Space': listingTrialData['Features - Type of Space'],
    // ... all other field mappings
    Active: false,
    Approved: false,
    Complete: true,
  };

  const { data, error } = await supabase
    .from('listing')
    .upsert(listingData, { onConflict: '_id' })
    .select()
    .single();

  if (error) {
    console.error('[ListingService] Error syncing to listing table:', error);
    return null;
  }

  return data;
}
```

### `syncListingToBubble(supabaseData, formData)`

**Original Purpose**: Call Bubble API via Edge Function to create listing in Bubble and get Bubble `_id`.

**Why Disabled**: No longer syncing to Bubble - Supabase is now the source of truth.

```javascript
// ORIGINAL IMPLEMENTATION (for reference)
async function syncListingToBubble(supabaseData, formData) {
  console.log('[ListingService] Syncing listing to Bubble...');

  const payload = {
    listing_name: supabaseData.Name || formData.spaceSnapshot?.listingName,
    supabase_id: supabaseData.id,
    type_of_space: supabaseData['Features - Type of Space'],
    bedrooms: supabaseData['Features - Qty Bedrooms'],
    beds: supabaseData['Features - Qty Beds'],
    bathrooms: supabaseData['Features - Qty Bathrooms'],
    city: supabaseData['Location - City'],
    state: supabaseData['Location - State'],
    zip_code: supabaseData['Location - Zip Code'],
    rental_type: supabaseData['rental type'],
    description: supabaseData.Description,
  };

  const { data, error } = await supabase.functions.invoke('bubble-proxy', {
    body: {
      action: 'sync_listing_to_bubble',
      payload,
    },
  });

  if (error) {
    console.error('[ListingService] Bubble proxy error:', error);
    throw new Error(error.message || 'Failed to sync to Bubble');
  }

  if (!data.success) {
    console.error('[ListingService] Bubble sync failed:', data.error);
    throw new Error(data.error || 'Bubble sync returned error');
  }

  return data.data?.bubble_id || null;
}
```

---

## Edge Function Handler (Also Disabled)

The `listingSync.ts` handler in `supabase/functions/bubble-proxy/handlers/` is still present but no longer called from the frontend.

**Location**: `supabase/functions/bubble-proxy/handlers/listingSync.ts`

**Action**: `sync_listing_to_bubble`

This handler can be re-enabled if Bubble sync is needed in the future.

---

## Column Mapping Changes

When migrating from `listing_trial` to direct `listing` table insertion, some columns were mapped differently:

| listing_trial Column | listing Table Equivalent |
|---------------------|-------------------------|
| `form_metadata` | Handled by localStorage (not stored) |
| `address_validated` | Stored inside `Location - Address` JSONB |
| `weekly_pattern` | `Weeks offered` |
| `subsidy_agreement` | Omitted |
| `nightly_pricing` | Individual `💰Nightly Host Rate for X nights` columns |
| `ideal_min_duration` | `Minimum Months` |
| `ideal_max_duration` | `Maximum Months` |
| `previous_reviews_link` | `Source Link` |
| `optional_notes` | Omitted |
| `source_type` | Omitted (`Created By` is for user ID) |

---

## Re-enabling Bubble Sync

If you need to re-enable Bubble sync in the future:

1. Uncomment the `syncListingToBubble` and `syncToListingTable` functions in `listingService.js`
2. Add the sync call back to `createListing()` after inserting into `listing` table
3. Update the Edge Function handler if needed
4. Test thoroughly before deploying

---

## Related Files

- `app/src/lib/listingService.js` - Main listing service with disabled functions
- `supabase/functions/bubble-proxy/handlers/listingSync.ts` - Edge Function handler (still exists)
- `supabase/functions/bubble-proxy/index.ts` - Proxy router (still routes to listingSync)

---

## Impact

- **New listings**: Created directly in Supabase `listing` table
- **Existing listings**: Remain in both Bubble and Supabase (no migration needed)
- **Listing updates**: Will need similar migration (currently still uses `listing_trial`)
- **Search/Display**: Uses `listing` table (works with new listings)
