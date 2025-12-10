# Listing Photos Migration Plan

## Overview

Migrate the `Features - Photos` column in the `Listing data` table from storing foreign key references (ID strings) to storing the actual photo details as embedded JSON objects.

---

## Current State

### Format 1: Legacy (To Migrate)
```json
"[\"1743791123373x937776532534587500\", \"1743791123699x143119357130560020\"]"
```
- JSON-encoded string containing array of photo IDs
- References records in `listing_photo` table

### Format 2: Modern (Target Format)
```json
[
  {
    "id": "photo_1765294145685_0_xs3il2etr",
    "url": "https://...",
    "Photo": "https://...",
    "caption": "",
    "SortOrder": 0,
    "storagePath": "listings/xxx/0_timestamp.png",
    "displayOrder": 0,
    "toggleMainPhoto": true,
    "Photo (thumbnail)": "https://..."
  }
]
```

---

## Migration Strategy

### Phase 1: Analysis & Backup

**Step 1.1: Count affected listings**
```sql
-- Count listings with legacy format (string starting with "[\"")
SELECT COUNT(*) as legacy_count
FROM "Listing data"
WHERE "Features - Photos" IS NOT NULL
  AND jsonb_typeof("Features - Photos") = 'string'
  AND "Features - Photos"::text LIKE '"%[%"';

-- Count listings already in modern format
SELECT COUNT(*) as modern_count
FROM "Listing data"
WHERE "Features - Photos" IS NOT NULL
  AND jsonb_typeof("Features - Photos") = 'array';
```

**Step 1.2: Create backup table**
```sql
CREATE TABLE IF NOT EXISTS "Listing data_photos_backup" AS
SELECT "_id", "Features - Photos", NOW() as backup_date
FROM "Listing data"
WHERE "Features - Photos" IS NOT NULL;
```

### Phase 2: Migration Function

**Step 2.1: Create migration function**
```sql
CREATE OR REPLACE FUNCTION migrate_listing_photos()
RETURNS TABLE(listing_id text, status text, photo_count int) AS $$
DECLARE
  listing_record RECORD;
  photo_ids text[];
  photo_id text;
  photo_record RECORD;
  new_photos jsonb;
  photo_obj jsonb;
  sort_index int;
BEGIN
  -- Loop through listings with legacy format
  FOR listing_record IN
    SELECT "_id", "Features - Photos"
    FROM "Listing data"
    WHERE "Features - Photos" IS NOT NULL
      AND jsonb_typeof("Features - Photos") = 'string'
  LOOP
    BEGIN
      -- Parse the JSON string to extract photo IDs
      SELECT array_agg(elem::text) INTO photo_ids
      FROM jsonb_array_elements_text(
        (listing_record."Features - Photos"#>>'{}')::jsonb
      ) AS elem;

      IF photo_ids IS NULL OR array_length(photo_ids, 1) IS NULL THEN
        listing_id := listing_record."_id";
        status := 'skipped_empty';
        photo_count := 0;
        RETURN NEXT;
        CONTINUE;
      END IF;

      -- Build new photos array
      new_photos := '[]'::jsonb;
      sort_index := 0;

      FOREACH photo_id IN ARRAY photo_ids
      LOOP
        -- Remove quotes from photo_id
        photo_id := TRIM(BOTH '"' FROM photo_id);

        -- Fetch photo details from listing_photo table
        SELECT * INTO photo_record
        FROM "listing_photo"
        WHERE "_id" = photo_id;

        IF photo_record IS NOT NULL THEN
          -- Build photo object in target format
          photo_obj := jsonb_build_object(
            'id', COALESCE(photo_record."_id", 'photo_' || sort_index),
            'url', COALESCE(photo_record."Photo", photo_record."URL", ''),
            'Photo', COALESCE(photo_record."Photo", ''),
            'caption', COALESCE(photo_record."Caption", ''),
            'SortOrder', COALESCE(photo_record."SortOrder", sort_index),
            'storagePath', NULL,  -- Legacy Bubble photos don't have storage paths
            'displayOrder', sort_index,
            'toggleMainPhoto', COALESCE(photo_record."toggleMainPhoto", sort_index = 0),
            'Photo (thumbnail)', COALESCE(photo_record."Photo (thumbnail)", photo_record."Photo", '')
          );

          new_photos := new_photos || photo_obj;
        END IF;

        sort_index := sort_index + 1;
      END LOOP;

      -- Update the listing with new format
      UPDATE "Listing data"
      SET "Features - Photos" = new_photos
      WHERE "_id" = listing_record."_id";

      listing_id := listing_record."_id";
      status := 'migrated';
      photo_count := jsonb_array_length(new_photos);
      RETURN NEXT;

    EXCEPTION WHEN OTHERS THEN
      listing_id := listing_record."_id";
      status := 'error: ' || SQLERRM;
      photo_count := 0;
      RETURN NEXT;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
```

### Phase 3: Execute Migration

**Step 3.1: Dry run (verify function works)**
```sql
-- Test on a single listing first
SELECT * FROM migrate_listing_photos() LIMIT 1;
```

**Step 3.2: Full migration**
```sql
-- Execute full migration
SELECT * FROM migrate_listing_photos();
```

**Step 3.3: Verify migration**
```sql
-- Check all listings now have array format
SELECT
  jsonb_typeof("Features - Photos") as type,
  COUNT(*) as count
FROM "Listing data"
WHERE "Features - Photos" IS NOT NULL
GROUP BY jsonb_typeof("Features - Photos");
```

### Phase 4: Cleanup

**Step 4.1: Verify and cleanup**
```sql
-- After verification, drop the migration function
DROP FUNCTION IF EXISTS migrate_listing_photos();

-- Keep backup for 30 days, then:
-- DROP TABLE IF EXISTS "Listing data_photos_backup";
```

---

## Rollback Plan

If migration needs to be reverted:

```sql
-- Restore from backup
UPDATE "Listing data" ld
SET "Features - Photos" = backup."Features - Photos"
FROM "Listing data_photos_backup" backup
WHERE ld."_id" = backup."_id";
```

---

## Frontend Considerations

### Files That May Need Updates

1. **Photo parsing utilities** - Should handle both formats gracefully
2. **Listing display components** - May need adapter functions
3. **Photo upload/edit flows** - Should already produce new format

### Recommended Adapter Function

```typescript
// app/src/logic/processors/photoProcessor.ts

interface PhotoObject {
  id: string;
  url: string;
  Photo: string;
  caption: string;
  SortOrder: number;
  storagePath: string | null;
  displayOrder: number;
  toggleMainPhoto: boolean;
  'Photo (thumbnail)': string;
}

export function normalizeListingPhotos(
  featuresPhotos: unknown
): PhotoObject[] {
  if (!featuresPhotos) return [];

  // Already in correct format
  if (Array.isArray(featuresPhotos)) {
    return featuresPhotos as PhotoObject[];
  }

  // Legacy string format - shouldn't exist after migration
  // but keeping for backwards compatibility
  if (typeof featuresPhotos === 'string') {
    try {
      const parsed = JSON.parse(featuresPhotos);
      if (Array.isArray(parsed) && typeof parsed[0] === 'string') {
        // Legacy ID array - return empty, data needs migration
        console.warn('Legacy photo format detected, migration needed');
        return [];
      }
      return parsed as PhotoObject[];
    } catch {
      return [];
    }
  }

  return [];
}
```

---

## Execution Checklist

- [ ] Run Phase 1 analysis queries to understand scope
- [ ] Create backup table
- [ ] Create migration function
- [ ] Test on single listing
- [ ] Execute full migration
- [ ] Verify all listings converted
- [ ] Test frontend photo display
- [ ] Monitor for issues (24-48 hours)
- [ ] Cleanup migration artifacts

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Data loss | High | Backup table created before migration |
| Missing photos | Medium | Function handles NULL gracefully |
| Performance | Low | Migration runs sequentially, can be batched |
| Frontend breaks | Medium | Adapter function handles both formats |

---

## Related Files

| File | Relevance |
|------|-----------|
| `app/src/logic/` | Photo processing logic |
| `supabase/migrations/` | Migration SQL files |
| `listing_photo` table | Source of photo metadata |
| `Listing data` table | Target of migration |

---

**Author:** Claude Code
**Created:** 2024-12-10
**Status:** Ready for Review
