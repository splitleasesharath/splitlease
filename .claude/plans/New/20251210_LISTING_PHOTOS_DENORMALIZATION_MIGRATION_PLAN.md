# Listing Photos Denormalization Migration Plan

**Date**: 2025-12-10
**Author**: Claude (AI Assistant)
**Status**: Ready for Implementation
**Priority**: HIGH
**Estimated Effort**: 3-5 development sessions

---

## Executive Summary

This plan outlines the migration strategy to move from a separate `listing_photo` table to storing photo data directly in the `listing` table's `Features - Photos` JSONB column. This denormalization will:

1. Eliminate the need for JOIN queries when fetching listings with photos
2. Simplify the data model by consolidating to a single table
3. Align legacy listings with the new self-listing flow which already uses embedded photos
4. Reduce database complexity and potential sync issues

---

## Current State Analysis

### Database Statistics

| Metric | Value |
|--------|-------|
| Total Listings | 272 |
| Total Photos in `listing_photo` | 4,604 |
| Photos with Listing Reference | 1,140 (24.8%) |
| Orphaned Photos | 3,464 (75.2%) |
| Listings with Legacy ID Format | 189 (69.5%) |
| Listings with New JSONB Format | 8 (2.9%) |
| Listings with NULL Photos | 75 (27.6%) |

### Current Data Formats

**Legacy Format** (in `listing."Features - Photos"`):
```json
"[\"1586391785470x371462843257323500\", \"1586391740751x387828075706187800\"]"
```
These are stringified JSON arrays containing `listing_photo._id` values.

**New Format** (already in use for self-listings):
```json
[
  {
    "id": "photo_1765143358830_0_lr03wz31t",
    "url": "https://qcfifybkaddcoimjroca.supabase.co/storage/v1/object/public/...",
    "Photo": "https://...",
    "Photo (thumbnail)": "https://...",
    "caption": "",
    "SortOrder": 0,
    "displayOrder": 0,
    "toggleMainPhoto": true,
    "storagePath": "listings/.../0_1765143590705.png"
  }
]
```

---

## Target JSONB Schema

```typescript
interface ListingPhoto {
  // Required Fields
  id: string;                    // Unique identifier (preserve original or generate)
  url: string;                   // Full-size photo URL from `Photo` column

  // Compatibility Fields (for existing code)
  Photo: string;                 // Same as url (backward compatibility)
  "Photo (thumbnail)": string;   // Thumbnail URL

  // Display Control
  SortOrder: number;             // Display order (0-based)
  displayOrder: number;          // Alias for SortOrder
  toggleMainPhoto: boolean;      // Primary listing photo flag

  // Optional Metadata
  caption?: string;              // User-provided caption
  storagePath?: string;          // Supabase storage path (for new uploads)

  // Preserved from listing_photo (optional)
  gptDescription?: string;       // AI-generated description
  type?: string;                 // Photo category (bedroom, kitchen, etc.)
  createdAt?: string;            // Original creation timestamp
}
```

---

## Files Requiring Modification

### Priority 1: Core Data Layer

| File | Changes Required | Impact |
|------|------------------|--------|
| `app/src/lib/listingDataFetcher.js:163-206` | Remove `listing_photo` query, read directly from JSONB | HIGH |
| `app/src/lib/supabaseUtils.js:55-106` | Remove or deprecate `fetchPhotoUrls()` function | MEDIUM |
| `app/src/lib/listingService.js` | No changes needed (already uses JSONB format) | NONE |
| `app/src/lib/photoUpload.js` | No changes needed (uploads to Supabase Storage) | NONE |

### Priority 2: Frontend Components

| File | Changes Required | Impact |
|------|------------------|--------|
| `app/src/islands/pages/ViewSplitLeasePage.jsx` | Update to use inline photos | LOW |
| `app/src/islands/pages/SearchPage.jsx` | Verify photo extraction logic | LOW |
| `app/src/islands/pages/FavoriteListingsPage/` | Update photo access pattern | LOW |
| `app/src/logic/rules/search/hasListingPhotos.js` | Update to check JSONB array | LOW |

### Priority 3: Edge Functions

| File | Changes Required | Impact |
|------|------------------|--------|
| `supabase/functions/bubble-proxy/handlers/photos.ts` | Deprecate or modify to update JSONB | MEDIUM |
| `supabase/functions/bubble_sync/lib/tableMapping.ts` | Update photo sync logic | MEDIUM |

### Priority 4: Proposal/Display Components

| File | Changes Required | Impact |
|------|------------------|--------|
| `app/src/lib/proposals/dataTransformers.js` | Update photo extraction | LOW |
| `app/src/lib/proposals/userProposalQueries.js` | Update photo field references | LOW |
| `app/src/islands/modals/GuestEditingProposalModal.jsx` | Verify photo access | LOW |

---

## Migration Implementation

### Phase 1: Database Migration (Supabase)

#### Step 1.1: Create Migration SQL

```sql
-- Migration: Denormalize listing photos from listing_photo table to listing JSONB
-- Date: 2025-12-10
-- Name: 20251210_denormalize_listing_photos

-- First, create a function to convert legacy ID arrays to embedded JSONB
CREATE OR REPLACE FUNCTION migrate_listing_photos_to_jsonb()
RETURNS void AS $$
DECLARE
  rec RECORD;
  photo_ids text[];
  photo_data jsonb;
  photo_rec RECORD;
  new_photos jsonb[];
BEGIN
  -- Process each listing with legacy format (stringified JSON array of IDs)
  FOR rec IN
    SELECT _id, "Features - Photos"
    FROM listing
    WHERE "Features - Photos" IS NOT NULL
      AND jsonb_typeof("Features - Photos") = 'string'
  LOOP
    BEGIN
      -- Parse the stringified JSON array
      photo_ids := ARRAY(
        SELECT jsonb_array_elements_text(("Features - Photos")::text::jsonb)
      );

      new_photos := ARRAY[]::jsonb[];

      -- For each photo ID, fetch the photo data and build the embedded object
      FOR i IN 1..array_length(photo_ids, 1) LOOP
        SELECT * INTO photo_rec
        FROM listing_photo
        WHERE _id = photo_ids[i];

        IF FOUND THEN
          new_photos := new_photos || jsonb_build_object(
            'id', photo_rec._id,
            'url', COALESCE(photo_rec."Photo", photo_rec."URL"),
            'Photo', COALESCE(photo_rec."Photo", photo_rec."URL"),
            'Photo (thumbnail)', COALESCE(photo_rec."Photo (thumbnail)", photo_rec."Photo", photo_rec."URL"),
            'caption', COALESCE(photo_rec."Caption", ''),
            'SortOrder', COALESCE(photo_rec."SortOrder", i - 1),
            'displayOrder', COALESCE(photo_rec."SortOrder", i - 1),
            'toggleMainPhoto', COALESCE(photo_rec."toggleMainPhoto", i = 1),
            'gptDescription', photo_rec."GPT Description",
            'type', photo_rec."Type",
            'createdAt', photo_rec."Created Date"
          );
        END IF;
      END LOOP;

      -- Update the listing with the new JSONB array
      IF array_length(new_photos, 1) > 0 THEN
        UPDATE listing
        SET "Features - Photos" = to_jsonb(new_photos)
        WHERE _id = rec._id;
      END IF;

    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to migrate listing %: %', rec._id, SQLERRM;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Execute the migration
SELECT migrate_listing_photos_to_jsonb();

-- Clean up the function
DROP FUNCTION migrate_listing_photos_to_jsonb();
```

#### Step 1.2: Alternative Migration (Safer - Row by Row)

```sql
-- Create backup table first
CREATE TABLE listing_photo_backup AS SELECT * FROM listing_photo;

-- Create migration tracking table
CREATE TABLE listing_photo_migration_log (
  listing_id text PRIMARY KEY,
  original_format text,
  photo_count integer,
  migrated_at timestamp DEFAULT now(),
  success boolean
);
```

### Phase 2: Application Code Updates

#### Step 2.1: Update `listingDataFetcher.js`

**Current Code (lines 163-206)**:
```javascript
// For listing, fetch from listing_photo table
const { data: photosData, error: photosError } = await supabase
  .from('listing_photo')
  .select('_id, Photo, "Photo (thumbnail)", SortOrder, toggleMainPhoto, Caption')
  .eq('Listing', listingId)
  .order('SortOrder', { ascending: true, nullsLast: true });
```

**Updated Code**:
```javascript
// Photos are now stored inline in "Features - Photos" JSONB column
// Parse and normalize the photo data
const inlinePhotos = parseJsonField(listingData['Features - Photos']);
sortedPhotos = inlinePhotos.map((photo, index) => ({
  _id: photo.id || photo._id || `inline_${index}`,
  Photo: photo.Photo || photo.url || photo,
  'Photo (thumbnail)': photo['Photo (thumbnail)'] || photo.Photo || photo.url || photo,
  toggleMainPhoto: photo.toggleMainPhoto ?? (index === 0),
  SortOrder: photo.SortOrder ?? photo.sortOrder ?? photo.displayOrder ?? index,
  Caption: photo.caption || photo.Caption || ''
}));

// Sort by main photo first, then by SortOrder
sortedPhotos.sort((a, b) => {
  if (a.toggleMainPhoto) return -1;
  if (b.toggleMainPhoto) return 1;
  return (a.SortOrder ?? 0) - (b.SortOrder ?? 0);
});
console.log('Photos from embedded JSONB:', sortedPhotos.length);
```

#### Step 2.2: Update `supabaseUtils.js`

Mark `fetchPhotoUrls()` as deprecated:

```javascript
/**
 * @deprecated Photos are now stored inline in listing."Features - Photos" JSONB
 * This function will be removed in a future version.
 * Use parseJsonArray(listing['Features - Photos']) instead.
 */
export async function fetchPhotoUrls(photoIds) {
  console.warn('[DEPRECATED] fetchPhotoUrls is deprecated. Photos are now embedded in listing table.');
  // ... existing implementation for backward compatibility
}
```

#### Step 2.3: Update `hasListingPhotos.js`

```javascript
/**
 * Check if a listing has photos
 * @param {object} listing - Listing object with "Features - Photos" field
 * @returns {boolean} - True if listing has at least one photo
 */
export function hasListingPhotos(listing) {
  const photos = listing?.['Features - Photos'];

  if (!photos) return false;

  // Handle JSONB array
  if (Array.isArray(photos)) {
    return photos.length > 0 && photos.some(p => p.url || p.Photo);
  }

  // Handle stringified JSON (shouldn't happen after migration)
  if (typeof photos === 'string') {
    try {
      const parsed = JSON.parse(photos);
      return Array.isArray(parsed) && parsed.length > 0;
    } catch {
      return false;
    }
  }

  return false;
}
```

### Phase 3: Edge Function Updates

#### Step 3.1: Update Photo Upload Handler

The existing `photos.ts` handler uploads to Bubble. For the denormalized approach, photos should be uploaded to Supabase Storage and the listing's JSONB field should be updated directly:

```typescript
// New approach: Update listing's JSONB directly after Supabase Storage upload
export async function handlePhotoUploadDirect(
  payload: Record<string, any>,
  supabaseClient: SupabaseClient
): Promise<any> {
  const { listing_id, photos } = payload;

  // 1. Get existing photos from listing
  const { data: listing } = await supabaseClient
    .from('listing')
    .select('"Features - Photos"')
    .eq('_id', listing_id)
    .single();

  const existingPhotos = listing?.['Features - Photos'] || [];

  // 2. Merge new photos with existing
  const mergedPhotos = [...existingPhotos, ...photos];

  // 3. Update the listing
  const { error } = await supabaseClient
    .from('listing')
    .update({ 'Features - Photos': mergedPhotos })
    .eq('_id', listing_id);

  if (error) throw error;

  return { success: true, count: mergedPhotos.length };
}
```

### Phase 4: Testing & Validation

#### Test Cases

| Test Case | Description | Expected Result |
|-----------|-------------|-----------------|
| TC-01 | View listing with migrated photos | Photos display correctly |
| TC-02 | View listing with new JSONB format | Photos display correctly |
| TC-03 | Search page photo thumbnails | All thumbnails load |
| TC-04 | Self-listing photo upload | Photos saved to JSONB |
| TC-05 | Edit listing photos | Add/remove/reorder works |
| TC-06 | Proposal with listing photos | Photos shown in proposal |

#### Validation Queries

```sql
-- Check migration completeness
SELECT
  CASE
    WHEN jsonb_typeof("Features - Photos") = 'array' THEN 'JSONB Array'
    WHEN "Features - Photos" IS NULL THEN 'NULL'
    ELSE 'Other'
  END as format,
  COUNT(*) as count
FROM listing
GROUP BY 1;

-- Verify photo counts match
SELECT
  l._id,
  jsonb_array_length(l."Features - Photos") as inline_count,
  COUNT(lp._id) as table_count
FROM listing l
LEFT JOIN listing_photo lp ON lp."Listing" = l._id
WHERE l."Features - Photos" IS NOT NULL
GROUP BY l._id, l."Features - Photos"
HAVING jsonb_array_length(l."Features - Photos") != COUNT(lp._id);
```

### Phase 5: Cleanup

#### Step 5.1: Archive `listing_photo` Table

```sql
-- Rename to archive
ALTER TABLE listing_photo RENAME TO listing_photo_archive_20251210;

-- Drop indexes (keep primary key on archive)
DROP INDEX IF EXISTS idx_listing_photo_created_date;
DROP INDEX IF EXISTS idx_listing_photo_modified_date;
```

#### Step 5.2: Remove Deprecated Code

- Remove `fetchPhotoUrls()` from `supabaseUtils.js`
- Remove `listing_photo` queries from `listingDataFetcher.js`
- Remove Bubble photo sync handlers if no longer needed

---

## Rollback Plan

If issues are discovered after migration:

1. **Immediate**: Revert application code changes
2. **Data**: Restore from `listing_photo_backup` table
3. **Index**: Recreate indexes on `listing_photo` table

```sql
-- Rollback: Restore listing_photo table
ALTER TABLE listing_photo_archive_20251210 RENAME TO listing_photo;

-- Recreate indexes
CREATE INDEX idx_listing_photo_created_date ON listing_photo ("Created Date");
CREATE INDEX idx_listing_photo_modified_date ON listing_photo ("Modified Date");
```

---

## Implementation Timeline

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1: DB Migration | 1 session | Database backup |
| Phase 2: Code Updates | 1-2 sessions | Phase 1 complete |
| Phase 3: Edge Functions | 1 session | Phase 2 complete |
| Phase 4: Testing | 1 session | Phase 3 complete |
| Phase 5: Cleanup | 1 session | Phase 4 verified |

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Data loss during migration | LOW | HIGH | Create backup table first |
| Missing photos after migration | MEDIUM | MEDIUM | Validate counts before/after |
| Performance degradation | LOW | MEDIUM | JSONB is well-indexed by PostgreSQL |
| Frontend display issues | MEDIUM | LOW | Thorough testing on all pages |
| Orphaned photos cleanup | LOW | LOW | Defer to separate cleanup task |

---

## Key Files Reference

### Files to Modify
- `app/src/lib/listingDataFetcher.js:163-206` - Remove listing_photo query
- `app/src/lib/supabaseUtils.js:55-106` - Deprecate fetchPhotoUrls
- `app/src/logic/rules/search/hasListingPhotos.js` - Update logic
- `supabase/functions/bubble-proxy/handlers/photos.ts` - Update or deprecate

### Files Already Correct (No Changes)
- `app/src/lib/listingService.js` - Already uses JSONB format
- `app/src/lib/photoUpload.js` - Uploads to Supabase Storage

### Database Tables
- `listing` - Target table with `Features - Photos` JSONB column
- `listing_photo` - Source table to be deprecated
- `listing_photo_backup` - To be created for safety

---

## Approval Checklist

- [ ] Database backup created
- [ ] Migration SQL reviewed
- [ ] Application code changes identified
- [ ] Test plan approved
- [ ] Rollback plan verified
- [ ] Timeline agreed upon

---

**Document Version**: 1.0
**Last Updated**: 2025-12-10
