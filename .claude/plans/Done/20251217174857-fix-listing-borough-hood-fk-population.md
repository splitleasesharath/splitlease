# Fix Listing Borough/Hood FK Population

## Problem Statement

When listings are created via SelfListingPageV2, the `Location - Borough` and `Location - Hood` FK fields are **not being populated**. The system has proper reference tables with FK constraints, but the creation flow only saves text values (neighborhood name from Google Places), not the actual reference table IDs.

### Evidence
- All test listings have `Location - Borough = NULL` and `Location - Hood = NULL`
- Borough info exists only in the address string (e.g., "Brooklyn, NY")
- Host overview page shows "Location not specified" because FK lookup returns empty

## Root Cause Analysis

### Current Flow (Broken)
```
Google Places Autocomplete
    ↓
Extracts: neighborhood (text), zip, city, state
    ↓
Frontend sends: { neighborhood: "Brooklyn Heights", zip: "11201" }
    ↓
Edge Function maps: Location - Hood = "Brooklyn Heights" (text)
    ↓
Database: Location - Borough = NULL, Location - Hood = NULL (or text)
```

### Required Flow (Fixed)
```
Google Places Autocomplete
    ↓
Extracts: neighborhood (text), zip, city, state
    ↓
Edge Function:
  1. Look up borough ID from zip code OR derive from city name
  2. Look up hood ID from neighborhood name + borough
    ↓
Database: Location - Borough = FK_ID, Location - Hood = FK_ID
```

## Affected Files

### Frontend
- `app/src/islands/pages/SelfListingPageV2/SelfListingPageV2.tsx` (lines 40-52, 544-603, 985-1010)
- `app/src/lib/nycZipCodes.js` - has `getBoroughForZipCode()` but returns text, not ID

### Backend
- `supabase/functions/listing/handlers/submit.ts` (lines 118-145 - mapFieldsToSupabase)
- `supabase/functions/listing/handlers/create.ts` (similar mapping logic)

### Reference Tables
- `reference_table.zat_geo_borough_toplevel` - 7 boroughs with `_id` and `Display Borough`
- `reference_table.zat_geo_hood_mediumlevel` - neighborhoods with `_id` and `Display`

## Implementation Plan

### Option A: Backend Resolution (Recommended)
Resolve borough/hood IDs in the Edge Function when creating/updating listings.

**Pros**:
- Single source of truth
- Works for all clients (web, future mobile)
- Can validate against reference tables

**Cons**:
- Requires DB queries during submission

#### Steps:
1. **Create lookup helper in Edge Function** (`_shared/geo-lookup.ts`):
   ```typescript
   // Look up borough ID from borough name or zip code
   async function getBoroughId(boroughName: string, zipCode?: string): Promise<string | null>

   // Look up hood ID from neighborhood name within a borough
   async function getHoodId(neighborhoodName: string, boroughId: string): Promise<string | null>
   ```

2. **Update submit.ts handler**:
   - After receiving address data, call `getBoroughId()` with city name or zip
   - Call `getHoodId()` with neighborhood name
   - Map to `Location - Borough` and `Location - Hood` FK fields

3. **Create zip-to-borough mapping** (for NYC):
   - Query existing zip codes from `zat_geo_borough_toplevel.Zip Codes` field
   - Or create a static mapping based on `nycZipCodes.js`

### Option B: Frontend Resolution
Send borough/hood IDs from frontend after user confirms location.

**Pros**:
- Reduces backend complexity
- Can show user the resolved borough for confirmation

**Cons**:
- Requires frontend to have reference data
- Multiple clients need same logic

### Option C: Hybrid
Frontend sends best-guess borough from zip code, backend validates and resolves hood.

## Data Migration

Existing listings with NULL borough/hood fields need to be backfilled:
```sql
-- Backfill borough from address string (one-time migration)
UPDATE listing l
SET "Location - Borough" = b._id
FROM reference_table.zat_geo_borough_toplevel b
WHERE l."Location - Borough" IS NULL
  AND l."Location - Address"->>'address' ILIKE '%' || b."Display Borough" || '%';
```

## Testing Checklist
- [ ] Create new listing via SelfListingPageV2 - verify borough FK populated
- [ ] Edit existing listing - verify borough FK preserved
- [ ] Host overview shows correct borough name
- [ ] Search page filters by borough correctly
- [ ] Listings without valid zip codes gracefully handle missing borough

## Priority
**HIGH** - This affects core functionality (search filtering, location display)

## Estimated Effort
- Backend lookup helper: 2 hours
- Update submit/create handlers: 1 hour
- Testing: 1 hour
- Data migration: 30 minutes
- **Total: ~4.5 hours**
