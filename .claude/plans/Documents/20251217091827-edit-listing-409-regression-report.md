# EditListingDetails 409 Error - Regression Report & Prevention Guidelines

**Date**: December 17, 2025
**Tag**: `v1.34.0-edit-listing-fk-fix`
**Status**: RESOLVED

---

## Executive Summary

The EditListingDetails component repeatedly fails with a "failing to save changes" error (HTTP 409) when users attempt to save listing data. This regression has occurred multiple times because the root cause is architectural - a mismatch between how forms handle data and how PostgreSQL validates foreign key constraints.

---

## Root Cause Analysis

### The Technical Problem

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         THE 409 ERROR CHAIN                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. Form initializes with ALL listing fields (including FK columns)         │
│     └─→ Location - Borough: null                                           │
│     └─→ Location - Hood: null                                              │
│     └─→ Location - City: null                                              │
│                                                                             │
│  2. User edits ONE field (e.g., Description)                                │
│                                                                             │
│  3. handleSave() sends ENTIRE formData object to updateListing()            │
│     └─→ Includes ALL fields, even unchanged ones                           │
│                                                                             │
│  4. Supabase/PostgREST sends UPDATE with all columns                        │
│     └─→ PostgreSQL validates ALL FK constraints                            │
│                                                                             │
│  5. FK validation fails on "Location - Borough" (null or invalid value)     │
│     └─→ Error code: 23503                                                  │
│     └─→ Message: "violates foreign key constraint fk_listing_borough"      │
│                                                                             │
│  6. PostgREST returns HTTP 409 Conflict                                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Why This Keeps Happening

1. **Legacy Data**: Many listings have null or invalid FK values from:
   - Bubble.io migration (different ID formats)
   - Incomplete listing creation flows
   - Historical schema changes

2. **Form Design Pattern**: Forms typically:
   - Initialize with complete listing data
   - Track all fields in a single state object
   - Send entire state on save (for simplicity)

3. **PostgreSQL FK Behavior**: Even when a column value is unchanged:
   - The UPDATE statement includes it
   - PostgreSQL re-validates the FK constraint
   - Invalid/null values trigger errors

4. **Misleading Error**: HTTP 409 Conflict doesn't clearly indicate FK violation:
   - Developers often assume it's a concurrency issue
   - Or an RLS policy problem
   - The actual cause (FK constraint) requires digging into error details

---

## The Fix (v1.34.0)

**File**: `app/src/islands/shared/EditListingDetails/useEditListingDetailsLogic.js`

```javascript
const handleSave = useCallback(async () => {
  setIsLoading(true);
  try {
    // Only send fields that have actually changed to avoid FK constraint issues
    const changedFields = {};
    for (const [key, value] of Object.entries(formData)) {
      const originalValue = listing[key];

      // Handle array comparison (for amenities, rules, photos, etc.)
      if (Array.isArray(value) && Array.isArray(originalValue)) {
        if (JSON.stringify(value) !== JSON.stringify(originalValue)) {
          changedFields[key] = value;
        }
      } else if (value !== originalValue) {
        changedFields[key] = value;
      }
    }

    // If no changes, just close
    if (Object.keys(changedFields).length === 0) {
      showToast('No changes to save');
      setTimeout(onClose, 500);
      return;
    }

    console.log('📝 Saving only changed fields:', Object.keys(changedFields));
    const updatedListing = await updateListing(listing._id, changedFields);
    // ...
  }
}, [listing, formData, updateListing, onSave, onClose, showToast]);
```

---

## Prevention Guidelines

### Rule 1: Always Send Only Changed Fields

When updating database records, **never send unchanged fields**. This prevents:
- Unnecessary FK constraint validation
- Triggering unnecessary database triggers
- Overwriting concurrent changes

```javascript
// ❌ BAD - Sends all fields
await updateListing(id, formData);

// ✅ GOOD - Sends only changed fields
const changedFields = getChangedFields(formData, originalData);
await updateListing(id, changedFields);
```

### Rule 2: Add Enhanced Error Logging for Database Operations

Always log the full error details from Supabase/PostgREST:

```javascript
if (updateError) {
  console.error('❌ Error updating:', updateError);
  console.error('❌ Error code:', updateError.code);        // e.g., "23503"
  console.error('❌ Error message:', updateError.message);  // e.g., "violates FK constraint"
  console.error('❌ Error details:', updateError.details);  // e.g., "Key is not present in table"
  console.error('❌ Full error:', JSON.stringify(updateError, null, 2));
  throw updateError;
}
```

### Rule 3: Know the PostgREST Error Codes

| HTTP Code | PostgreSQL Code | Meaning |
|-----------|-----------------|---------|
| 409 | 23503 | Foreign Key Violation |
| 409 | 23505 | Uniqueness Violation |
| 403 | 42501 | RLS Policy Violation |
| 404 | - | Table/Column not found |

### Rule 4: Handle Null FK Values Gracefully

When FK columns can be null, ensure:
1. The FK constraint allows NULL (most do by default)
2. The UI doesn't accidentally set invalid non-null values
3. Updates exclude null FK fields unless explicitly changed

### Rule 5: Test Edit Flows with Legacy Data

Before deploying edit functionality:
1. Test with listings that have null FK values
2. Test with listings from Bubble migration
3. Test editing a single field, not the whole form

---

## Files Involved

| File | Purpose |
|------|---------|
| [useEditListingDetailsLogic.js](../../app/src/islands/shared/EditListingDetails/useEditListingDetailsLogic.js) | Contains handleSave - THE critical file |
| [useListingDashboardPageLogic.js](../../app/src/islands/pages/ListingDashboardPage/useListingDashboardPageLogic.js) | Contains updateListing function |
| [listingService.js](../../app/src/lib/listingService.js) | Alternative updateListing (used by SelfListingV2) |

---

## Database Constraints on Listing Table

The `listing` table has **12 foreign key constraints**:

| Column | References |
|--------|------------|
| Location - Borough | reference_table.zat_geo_borough_toplevel |
| Location - Hood | reference_table.zat_geo_hood_mediumlevel |
| Location - City | reference_table.zat_location |
| Location - State | reference_table.os_us_states |
| Cancellation Policy | reference_table.zat_features_cancellationpolicy |
| Features - Parking type | reference_table.zat_features_parkingoptions |
| Features - Secure Storage Option | reference_table.zat_features_storageoptions |
| Features - Type of Space | reference_table.zat_features_listingtype |
| Kitchen Type | reference_table.os_kitchen_type |
| rental type | reference_table.os_rental_type |

Any of these can cause a 409 if updated with an invalid value.

---

## Checklist for Future Edit Components

- [ ] Does the save function send only changed fields?
- [ ] Are FK columns excluded if unchanged?
- [ ] Is there enhanced error logging?
- [ ] Has it been tested with listings that have null FK values?
- [ ] Has it been tested with legacy Bubble-migrated data?

---

## Related Commits

- `16cf08e4` - fix(edit-listing): Send only changed fields to prevent FK constraint violations
- `v1.34.0-edit-listing-fk-fix` - Tag for this fix

---

**IMPORTANT**: If you see HTTP 409 errors on listing updates, check error code first:
- `23503` = FK constraint violation (this issue)
- `23505` = Unique constraint violation (check bubble_id)
- Other = Check RLS policies or schema
