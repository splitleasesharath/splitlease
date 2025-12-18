# Implementation Plan: Soft-Delete Column for Listings

## Overview

Migrate from the current `Active=false` approach to a dedicated `Deleted` boolean column for soft-delete functionality. This provides clearer separation between "inactive but not deleted" listings and "soft-deleted" listings, enabling future data restoration and retention analysis capabilities.

## Success Criteria

- [ ] New `Deleted` boolean column exists in `listing` table (default: `false`)
- [ ] Delete handler sets `Deleted=true` instead of `Active=false`
- [ ] All listing queries filter out `Deleted=true` records
- [ ] Backwards compatibility maintained (`Deleted IS NULL` treated as not deleted)
- [ ] Bubble sync queue updated to propagate `Deleted` field
- [ ] No regression in existing functionality (search, host overview, favorites)

## Context & References

### Relevant Files

| File | Purpose | Changes Needed |
|------|---------|----------------|
| `supabase/functions/listing/handlers/delete.ts` | Listing deletion handler | Update to set `Deleted=true` |
| `supabase/functions/listing/handlers/get.ts` | Single listing fetch | Add `Deleted` filter |
| `app/src/islands/pages/useSearchPageLogic.js` | Search page listing queries | Add `Deleted` filter to queries |
| `app/src/islands/pages/HostOverviewPage/useHostOverviewPageLogic.js` | Host dashboard listings | Add `Deleted` filter to RPC and direct queries |
| `app/src/lib/listingDataFetcher.js` | View listing data fetch | Add `Deleted` filter to `fetchListingComplete` |
| `app/src/lib/listingService.js` | Listing CRUD operations | Add `Deleted` filter to `getListingById` |
| `app/src/islands/pages/FavoriteListingsPage/FavoriteListingsPage.jsx` | Favorites page | Add `Deleted` filter to favorites query |
| `supabase/functions/proposal/actions/create.ts` | Proposal creation | Add `Deleted` check when validating listing |
| `supabase/functions/proposal/actions/suggest.ts` | Proposal suggestions | Filter out deleted listings |
| `app/src/lib/proposals/userProposalQueries.js` | Proposal listing lookups | May need `Deleted` filter |

### Database RPC Function

The `get_host_listings` RPC function is called in `useHostOverviewPageLogic.js`. This function needs to be updated to filter out soft-deleted records.

### Existing Patterns to Follow

- **Queue-based Bubble sync**: Changes to listings use `enqueueBubbleSync()` from `_shared/queueSync.ts`
- **Migration pattern**: Use `apply_migration` MCP tool for DDL changes
- **Filter pattern**: Search queries use `.eq('Active', true)` or `.or('"Active".eq.true,"Active".is.null')`
- **Backwards compatibility**: Use `OR column IS NULL` for nullable boolean columns

## Implementation Steps

### Step 1: Create Database Migration

**Action**: Add `Deleted` column to `listing` table
**Method**: Use Supabase MCP `apply_migration` tool
**SQL**:
```sql
-- Add Deleted column for soft-delete functionality
-- Default to false, nullable for backwards compatibility
ALTER TABLE public.listing
ADD COLUMN IF NOT EXISTS "Deleted" boolean DEFAULT false;

-- Add comment explaining the column's purpose
COMMENT ON COLUMN public.listing."Deleted" IS 'Soft-delete flag. When true, the listing is considered deleted but retained for restoration/analysis. NULL treated as false.';

-- Create index for query performance (filtering by Deleted status is common)
CREATE INDEX IF NOT EXISTS idx_listing_deleted ON public.listing ("Deleted") WHERE "Deleted" IS NOT TRUE;
```

**Validation**:
- Query `SELECT column_name FROM information_schema.columns WHERE table_name = 'listing' AND column_name = 'Deleted'`
- Verify column exists with correct default

### Step 2: Update Delete Handler

**File**: `supabase/functions/listing/handlers/delete.ts`
**Purpose**: Set `Deleted=true` instead of `Active=false`
**Details**:
- Change line 77-79 from updating `Active: false` to `Deleted: true`
- Update Bubble sync payload (line 100) to include `Deleted: true`
- Keep `Active` unchanged (listing could be restored later)
- Update comments at lines 5, 28-29, 73, 88 to reflect new pattern

**Current code (lines 73-80)**:
```typescript
// Step 2: Soft delete (set Active=false)
const now = new Date().toISOString();
const { error: updateError } = await supabase
  .from('listing')
  .update({
    Active: false,
    'Modified Date': now,
  })
```

**New code**:
```typescript
// Step 2: Soft delete (set Deleted=true)
const now = new Date().toISOString();
const { error: updateError } = await supabase
  .from('listing')
  .update({
    Deleted: true,
    'Modified Date': now,
  })
```

**Bubble sync update (line 100)**:
```typescript
payload: { Deleted: true, 'Modified Date': now },
```

**Validation**:
- Test delete action via edge function
- Verify listing has `Deleted=true` in database
- Verify Bubble sync queue entry has correct payload

### Step 3: Update Search Page Queries

**File**: `app/src/islands/pages/useSearchPageLogic.js`
**Purpose**: Filter out soft-deleted listings from search results
**Details**:

**Location 1: `fetchAllActiveListings` function (lines 206-209)**:
Current:
```javascript
const { data, error } = await supabase
  .from('listing')
  .select('*')
  .eq('Active', true)
```

New (add filter after `.eq('Active', true)`):
```javascript
const { data, error } = await supabase
  .from('listing')
  .select('*')
  .eq('Active', true)
  .or('"Deleted".is.null,"Deleted".eq.false')
```

**Location 2: `fetchListings` function (lines 330-338)**:
Current:
```javascript
let query = supabase
  .from('listing')
  .select('*')
  .eq('"Complete"', true)
  .or('"Active".eq.true,"Active".is.null')
```

New (add filter):
```javascript
let query = supabase
  .from('listing')
  .select('*')
  .eq('"Complete"', true)
  .or('"Active".eq.true,"Active".is.null')
  .or('"Deleted".is.null,"Deleted".eq.false')
```

**Note**: The `.or()` pattern handles NULL values for backwards compatibility.

**Validation**:
- Soft-delete a listing
- Verify it no longer appears in search results
- Verify non-deleted listings still appear

### Step 4: Update Host Overview Page Queries

**File**: `app/src/islands/pages/HostOverviewPage/useHostOverviewPageLogic.js`
**Purpose**: Filter out soft-deleted listings from host dashboard
**Details**:

**Location 1: RPC call (lines 136-145)**:
The `get_host_listings` RPC function needs to be updated in the database. Since the RPC is in Supabase, we need a separate migration.

**Location 2: Direct listing query for missing listings (lines 247-250)**:
Current:
```javascript
const { data: missingListings } = await supabase
  .from('listing')
  .select('*')
  .in('_id', missingIds);
```

New:
```javascript
const { data: missingListings } = await supabase
  .from('listing')
  .select('*')
  .in('_id', missingIds)
  .or('"Deleted".is.null,"Deleted".eq.false');
```

**Validation**:
- Host overview page loads successfully
- Soft-deleted listings don't appear
- Non-deleted listings still appear

### Step 5: Update RPC Function `get_host_listings`

**Action**: Create migration to update RPC function
**Method**: Use Supabase MCP `apply_migration` tool
**SQL**:
```sql
-- Update get_host_listings to filter out soft-deleted listings
CREATE OR REPLACE FUNCTION public.get_host_listings(host_user_id text)
RETURNS TABLE (
  id uuid,
  _id text,
  "Name" text,
  "Complete" boolean,
  source text,
  "Location - Borough" text,
  "Location - City" text,
  "Location - State" text,
  "Features - Photos" jsonb,
  rental_type text,
  monthly_rate numeric,
  weekly_rate numeric,
  rate_2_nights numeric,
  rate_3_nights numeric,
  rate_4_nights numeric,
  rate_5_nights numeric,
  rate_7_nights numeric,
  cleaning_fee numeric,
  damage_deposit numeric,
  pricing_list jsonb
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    l.id,
    l._id,
    l."Name",
    l."Complete",
    'listing' as source,
    l."Location - Borough",
    l."Location - City",
    l."Location - State",
    l."Features - Photos",
    l."rental type" as rental_type,
    l."💰Monthly Host Rate" as monthly_rate,
    l."💰Weekly Host Rate" as weekly_rate,
    l."💰Nightly Host Rate for 2 nights" as rate_2_nights,
    l."💰Nightly Host Rate for 3 nights" as rate_3_nights,
    l."💰Nightly Host Rate for 4 nights" as rate_4_nights,
    l."💰Nightly Host Rate for 5 nights" as rate_5_nights,
    l."💰Nightly Host Rate for 7 nights" as rate_7_nights,
    l."💰Cleaning Cost / Maintenance Fee" as cleaning_fee,
    l."💰Damage Deposit" as damage_deposit,
    l.pricing_list
  FROM public.listing l
  WHERE (l."Host User" = host_user_id OR l."Created By" = host_user_id)
    AND (l."Deleted" IS NULL OR l."Deleted" = false);
$$;
```

**Validation**:
- RPC returns expected listings
- Soft-deleted listings are excluded

### Step 6: Update Listing Data Fetcher

**File**: `app/src/lib/listingDataFetcher.js`
**Purpose**: Single listing fetch should check if deleted
**Details**:

**Location: `fetchListingComplete` function (lines 64-133)**:
Add filter to prevent fetching soft-deleted listings for viewing.

Current query structure:
```javascript
const { data: listingData, error: listingError } = await supabase
  .from('listing')
  .select(`...`)
  .eq('_id', listingId)
  .single();
```

New (add check after fetch):
```javascript
const { data: listingData, error: listingError } = await supabase
  .from('listing')
  .select(`...`)
  .eq('_id', listingId)
  .single();

if (listingError) throw listingError;
if (!listingData) throw new Error('Listing not found');

// Check if listing is soft-deleted
if (listingData.Deleted === true) {
  throw new Error('Listing has been deleted');
}
```

**Location: `fetchListingBasic` function (lines 446-480)**:
Same pattern - check `Deleted` after fetch.

**Validation**:
- Trying to view a soft-deleted listing shows appropriate error
- Non-deleted listings load normally

### Step 7: Update Listing Service

**File**: `app/src/lib/listingService.js`
**Purpose**: Filter deleted listings from getListingById
**Details**:

**Location: `getListingById` function (lines 897-922)**:
Current:
```javascript
const { data, error } = await supabase
  .from('listing')
  .select('*')
  .eq('_id', listingId)
  .single();
```

Add check after fetch:
```javascript
// Check if listing is soft-deleted
if (data && data.Deleted === true) {
  console.log('[ListingService] Listing is soft-deleted:', listingId);
  return null;
}
```

**Validation**:
- `getListingById` returns null for deleted listings
- Non-deleted listings return normally

### Step 8: Update Favorites Page Query

**File**: `app/src/islands/pages/FavoriteListingsPage/FavoriteListingsPage.jsx`
**Purpose**: Filter out soft-deleted favorites
**Details**:

**Location: Listing fetch (lines 735-738)**:
Current:
```javascript
const { data: listingsData, error: listingsError } = await supabase
  .from('listing')
  .select('*')
  .in('_id', favoritedIds);
```

New:
```javascript
const { data: listingsData, error: listingsError } = await supabase
  .from('listing')
  .select('*')
  .in('_id', favoritedIds)
  .or('"Deleted".is.null,"Deleted".eq.false');
```

**Validation**:
- Favorites page loads successfully
- Soft-deleted listings don't appear in favorites
- Users may see fewer favorites if some were deleted

### Step 9: Update Proposal Creation Validation

**File**: `supabase/functions/proposal/actions/create.ts`
**Purpose**: Prevent proposals on deleted listings
**Details**:

Add check when fetching listing:
```typescript
// Verify listing exists and is not deleted
const { data: listing, error: listingError } = await supabase
  .from('listing')
  .select('_id, Name, "Host User", Active, Deleted')
  .eq('_id', payload.listing_id)
  .single();

if (listingError || !listing) {
  throw new ValidationError('Listing not found');
}

if (listing.Deleted === true) {
  throw new ValidationError('Cannot create proposal for deleted listing');
}
```

**Validation**:
- Creating proposal on deleted listing fails with clear error
- Proposals on active listings succeed

### Step 10: Update Proposal Suggestions

**File**: `supabase/functions/proposal/actions/suggest.ts`
**Purpose**: Exclude deleted listings from suggestions
**Details**:

Any listing query in this file needs `.or('"Deleted".is.null,"Deleted".eq.false')` filter.

**Validation**:
- Suggestions don't include deleted listings

## Edge Cases & Error Handling

| Edge Case | Handling |
|-----------|----------|
| Existing NULL values | `OR "Deleted" IS NULL` treats NULL as not deleted |
| Listing viewed via direct URL | `fetchListingComplete` throws "Listing has been deleted" |
| Favorite listing deleted | Listing removed from favorites display silently |
| Proposal on deleted listing | ValidationError with clear message |
| Host views deleted listing | Should be filtered out of host dashboard |

## Testing Considerations

1. **Create a test listing** via self-listing flow
2. **Soft-delete it** via the delete action
3. **Verify invisibility**:
   - Does NOT appear in search results
   - Does NOT appear in host overview
   - Does NOT appear in favorites (if favorited)
   - Cannot create proposal on it
   - Direct URL shows error message
4. **Verify data retention**:
   - Record still exists in database with `Deleted=true`
   - `Active` column is unchanged
5. **Verify backwards compatibility**:
   - Existing listings without `Deleted` column (NULL) still appear

## Rollback Strategy

1. **Database**: Column is additive, no data loss
2. **Code**: Revert to previous query patterns (remove `.or('"Deleted"...')` filters)
3. **Delete handler**: Revert to setting `Active=false`

## Dependencies & Blockers

- **Supabase MCP access**: Required for `apply_migration` tool
- **Edge function redeployment**: After delete handler changes
- **RPC function update**: Requires migration

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Query performance degradation | Low | Medium | Index on `Deleted` column |
| Existing NULL values break queries | Low | High | Use `OR IS NULL` pattern |
| Bubble sync fails | Medium | Low | Sync is non-blocking, errors logged |
| Direct URL access to deleted listing | Medium | Low | Clear error message shown |

---

## Files Summary

### Backend (Edge Functions)
- `supabase/functions/listing/handlers/delete.ts` - Core deletion logic
- `supabase/functions/listing/handlers/get.ts` - Single listing fetch
- `supabase/functions/proposal/actions/create.ts` - Proposal validation
- `supabase/functions/proposal/actions/suggest.ts` - Suggestion filtering

### Frontend (React)
- `app/src/islands/pages/useSearchPageLogic.js` - Search queries
- `app/src/islands/pages/HostOverviewPage/useHostOverviewPageLogic.js` - Host dashboard
- `app/src/islands/pages/FavoriteListingsPage/FavoriteListingsPage.jsx` - Favorites queries
- `app/src/lib/listingDataFetcher.js` - View listing data
- `app/src/lib/listingService.js` - Listing CRUD

### Database
- New migration for `Deleted` column + index
- New migration for `get_host_listings` RPC update

### Related Documentation
- `supabase/CLAUDE.md` - Edge function patterns
- `app/src/CLAUDE.md` - Frontend architecture
- `.claude/CLAUDE.md` - Project conventions

---

**PLAN VERSION**: 1.0
**CREATED**: 2025-12-17T18:20:00
**AUTHOR**: Claude Opus 4.5
