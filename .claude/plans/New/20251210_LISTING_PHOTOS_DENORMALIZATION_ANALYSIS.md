# Listing Photos Denormalization Analysis

**Date**: 2025-12-10
**Status**: Analysis Complete
**Purpose**: Evaluate migration from separate `listing_photo` table to denormalized JSONB field in `listing` table

---

## Executive Summary

The database currently has **two approaches** for storing listing photos:
1. **Legacy**: `listing_photo` table with references stored as ID strings in `listing."Features - Photos"`
2. **New**: Embedded JSONB objects directly in `listing."Features - Photos"`

This analysis supports a full migration to the denormalized JSONB approach.

---

## Current Schema Analysis

### 1. `listing` Table

**Record Count**: 272 listings

**Relevant Column**:
| Column Name | Data Type | Nullable | Description |
|-------------|-----------|----------|-------------|
| `Features - Photos` | jsonb | YES | Stores photo references or embedded photo data |

**Current Data Format Distribution**:
| Format Type | Count | Percentage |
|-------------|-------|------------|
| String/ID Array (legacy) | 189 | 69.5% |
| NULL | 75 | 27.6% |
| JSONB Array (new format) | 8 | 2.9% |

### 2. `listing_photo` Table

**Record Count**: 4,604 photos

**Complete Column Schema**:
| Column Name | Data Type | Nullable | Default |
|-------------|-----------|----------|---------|
| `_id` | text | NO | - |
| `Active` | boolean | YES | - |
| `Caption` | text | YES | - |
| `Created By` | text | YES | - |
| `Created Date` | timestamptz | NO | - |
| `GPT Description` | text | YES | - |
| `Listing` | text | YES | - |
| `Modified Date` | timestamptz | NO | - |
| `Name` | text | YES | - |
| `Passed Image Check?` | text | YES | - |
| `Photo` | text | YES | - |
| `Photo (thumbnail)` | text | YES | - |
| `SortOrder` | integer | YES | - |
| `Type` | text | YES | - |
| `URL` | text | YES | - |
| `View Counter` | integer | YES | - |
| `bulk_upload_listing_id` | text | YES | - |
| `toggleMainPhoto` | boolean | YES | - |
| `created_at` | timestamptz | YES | now() |
| `updated_at` | timestamptz | YES | now() |
| `pending` | boolean | YES | false |
| `bubble_id` | text | YES | - |

**Listing Reference Distribution**:
| Status | Count | Percentage |
|--------|-------|------------|
| No Listing Reference | 3,464 | 75.2% |
| Has Listing Reference | 1,140 | 24.8% |

---

## Relationship Analysis

### Current Foreign Key Constraints

**No direct foreign key** exists between `listing_photo` and `listing` tables.

The relationship is maintained through:
1. `listing_photo."Listing"` column contains the `listing._id` value
2. `listing."Features - Photos"` contains an array of `listing_photo._id` values (legacy format)

### Existing Indexes on `listing_photo`

| Index Name | Definition |
|------------|------------|
| `listing_photo_pkey` | PRIMARY KEY (_id) |
| `listing_photo_bubble_id_key` | UNIQUE (bubble_id) |
| `idx_listing_photo_created_date` | btree ("Created Date") |
| `idx_listing_photo_modified_date` | btree ("Modified Date") |

### Existing Indexes on `listing`

| Index Name | Definition |
|------------|------------|
| `listing_pkey` | PRIMARY KEY (_id) |
| `listing_bubble_id_key` | UNIQUE (bubble_id) |
| `idx_listing_active_usability` | btree (Active, isForUsability) |
| `idx_listing_borough_filter` | btree (Location - Borough) |
| `idx_listing_hood_filter` | btree (Location - Hood) |
| `idx_listing_price_filter` | btree (Standarized Minimum Nightly Price) |
| `idx_listing_created_date` | btree (Created Date) |
| `idx_listing_modified_date` | btree (Modified Date) |

---

## Data Format Examples

### Legacy Format (String/ID Array)
The `"Features - Photos"` column contains a JSON-encoded string of photo IDs:
```json
"[\"1586391785470x371462843257323500\", \"1586391740751x387828075706187800\", ...]"
```

These IDs reference `listing_photo._id` values.

### New Format (Embedded JSONB Array)
The `"Features - Photos"` column contains full photo objects:
```json
[
  {
    "id": "photo_1765143358830_0_lr03wz31t",
    "url": "https://qcfifybkaddcoimjroca.supabase.co/storage/v1/object/public/listing-photos/...",
    "Photo": "https://...",
    "caption": "",
    "SortOrder": 0,
    "storagePath": "listings/1765143590645x21800434891268216/0_1765143590705.png",
    "displayOrder": 0,
    "toggleMainPhoto": true,
    "Photo (thumbnail)": "https://..."
  },
  ...
]
```

---

## Migration Considerations

### Benefits of Denormalization

1. **Single Query Access**: No JOIN needed to fetch listing with photos
2. **Reduced Complexity**: One table to manage instead of two
3. **Better Performance**: JSONB indexed queries can be very fast
4. **Atomic Updates**: Photos updated together with listing
5. **Simplified Sync**: Already supports new self-listing flow

### Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Data loss during migration | Keep `listing_photo` table as backup |
| Large JSONB fields | Compress images, use thumbnail URLs |
| Query complexity for photo-only operations | Create views if needed |
| Orphaned photos | 75% of photos have no listing reference - audit needed |

### Data Quality Issues Identified

1. **Orphaned Photos**: 3,464 photos (75.2%) have NULL `Listing` reference
2. **Mixed Formats**: 189 listings use legacy ID format vs 8 using new JSONB format
3. **Missing Thumbnails**: Many photos lack `Photo (thumbnail)` values

---

## Recommended JSONB Schema for Photos

```typescript
interface ListingPhoto {
  id: string;                    // Unique photo identifier
  url: string;                   // Full-size photo URL
  thumbnail?: string;            // Thumbnail URL
  caption?: string;              // User-provided caption
  sortOrder: number;             // Display order (0-based)
  isMain: boolean;               // Primary listing photo flag
  storagePath?: string;          // Supabase storage path
  gptDescription?: string;       // AI-generated description
  type?: string;                 // Photo category (bedroom, kitchen, etc.)
  createdAt?: string;            // ISO timestamp
}
```

---

## Migration Strategy

### Phase 1: Data Audit
- Identify all orphaned photos
- Map legacy ID references to actual photo data
- Validate existing JSONB format entries

### Phase 2: Migration Script
- Convert legacy ID arrays to embedded JSONB
- Preserve all photo metadata
- Handle edge cases (missing photos, duplicates)

### Phase 3: Application Updates
- Update listing CRUD operations
- Remove listing_photo table dependencies
- Update Bubble sync handlers

### Phase 4: Cleanup
- Archive listing_photo table
- Remove orphaned photos
- Update indexes if needed

---

## Files Concerned with This Change

### Edge Functions
- `supabase/functions/listing/handlers/create.ts` - Creates listings with photos
- `supabase/functions/listing/handlers/submit.ts` - Submits listings
- `supabase/functions/listing/handlers/update.ts` - Updates listings

### Frontend Components
- `app/src/features/self-listing/` - Self-listing photo upload flow
- `app/src/components/listing/` - Listing display components

### Sync Services
- `supabase/functions/_shared/bubbleSync.ts` - Bubble.io data sync
- Any photo-specific sync handlers

---

## Next Steps

1. [ ] Decide on migration approach (big-bang vs incremental)
2. [ ] Create migration script for legacy ID format to JSONB
3. [ ] Audit orphaned photos for cleanup
4. [ ] Update application code to use new format exclusively
5. [ ] Plan `listing_photo` table deprecation timeline
