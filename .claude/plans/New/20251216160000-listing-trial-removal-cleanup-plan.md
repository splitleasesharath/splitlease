# Listing Trial Table Removal Cleanup Plan

**Created**: 2025-12-16 16:00:00
**Status**: Ready for Implementation
**Priority**: HIGH

---

## Executive Summary

The `listing_trial` table has been deleted from Supabase. This plan documents all code locations that still reference this table and provides step-by-step instructions to remove these references, migrating the functionality to use the `listing` table exclusively.

---

## Current State Analysis

### Table Deleted
- **Table Name**: `listing_trial`
- **Schema**: `public`
- **Status**: ❌ DELETED from Supabase

### RPC Function Affected
- **Function Name**: `get_host_listings`
- **Current Behavior**: Queries both `listing_trial` and `listing` tables
- **Action Required**: Update to query `listing` table only

---

## Files Requiring Changes

### 1. Frontend Source Files (8 files with actual code references)

| File | Lines | Impact | Changes Required |
|------|-------|--------|------------------|
| [listingDataFetcher.js](../../../app/src/lib/listingDataFetcher.js) | 56-183 | HIGH | Remove dual-table fallback logic |
| [listingService.js](../../../app/src/lib/listingService.js) | 950-980, 1002-1209 | MEDIUM | Remove deprecated functions |
| [useHostOverviewPageLogic.js](../../../app/src/islands/pages/HostOverviewPage/useHostOverviewPageLogic.js) | 99-284 | HIGH | Remove `listing_trial` fetch & mapping |
| [useListingDashboardPageLogic.js](../../../app/src/islands/pages/ListingDashboardPage/useListingDashboardPageLogic.js) | 364-466, 727-1158 | HIGH | Remove trial table queries & photo handling |
| [useAccountProfilePageLogic.js](../../../app/src/islands/pages/AccountProfilePage/useAccountProfilePageLogic.js) | 440 | LOW | Remove source field reference |
| [useLoggedInAvatarData.js](../../../app/src/islands/shared/LoggedInAvatar/useLoggedInAvatarData.js) | 163, 268 | LOW | Update comments |
| [HostOverviewCards.jsx](../../../app/src/islands/pages/HostOverviewPage/components/HostOverviewCards.jsx) | 59 | LOW | Update comment |
| [SelfListingPage.tsx](../../../app/src/islands/pages/SelfListingPage/SelfListingPage.tsx) | 535, 579 | LOW | Update comments |

### 2. Database RPC Function

| Function | Location | Changes Required |
|----------|----------|------------------|
| `get_host_listings` | Supabase Database | Remove `listing_trial` UNION, query `listing` only |

### 3. Documentation Files (Will be outdated)

These documentation files reference `listing_trial` and should be updated after code changes:

- `.claude/Documentation/Pages/LISTING_DASHBOARD_QUICK_REFERENCE.md`
- `.claude/Documentation/Pages/LISTING_DASHBOARD_PAGE_CONTEXT.md`
- `.claude/Documentation/Pages/HOST_OVERVIEW_QUICK_REFERENCE.md`
- `.claude/Documentation/Database/REFERENCE_TABLES_FK_FIELDS.md`
- `.claude/Documentation/Database/DATABASE_OPTION_SETS_QUICK_REFERENCE.md`
- `app/src/islands/pages/ListingDashboardPage/CLAUDE.md`
- `app/src/islands/pages/SelfListingPage/CLAUDE.md`
- `app/src/islands/pages/SelfListingPage/store/CLAUDE.md`

---

## Detailed Changes Per File

### Phase 1: Database RPC Update

#### `get_host_listings` RPC Function

**Current Logic** (queries both tables):
```sql
-- UNION from listing_trial
SELECT ... FROM listing_trial WHERE ...
UNION ALL
-- And from listing
SELECT ... FROM listing WHERE ...
```

**New Logic** (listing table only):
```sql
CREATE OR REPLACE FUNCTION public.get_host_listings(host_user_id text)
RETURNS TABLE (
  id text,
  _id text,
  "Name" text,
  "Complete" boolean,
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
  nightly_pricing jsonb,
  source text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    l._id::text as id,
    l._id::text as _id,
    l."Name",
    l."Complete",
    l."Location - Borough",
    NULL::text as "Location - City",  -- Not used in listing table
    NULL::text as "Location - State", -- Not used in listing table
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
    l.nightly_pricing,
    'listing'::text as source
  FROM listing l
  WHERE l."Host User" = host_user_id
     OR l."Created By" = host_user_id;
END;
$$;
```

---

### Phase 2: Core Data Fetching Files

#### 2.1 `listingDataFetcher.js`

**File**: [app/src/lib/listingDataFetcher.js](../../../app/src/lib/listingDataFetcher.js)

**Changes**:
1. Remove lines 62-80 (listing_trial first attempt)
2. Simplify to only query `listing` table
3. Remove `isListingTrial` flag and conditional photo handling
4. Update photo handling to use unified approach (embedded photos OR listing_photo table)

**Before** (lines 62-80):
```javascript
// 1. Try listing_trial first (for self-listing submissions), then fall back to listing table
console.log('🔍 fetchListingComplete: Trying listing_trial table first with id=' + listingId);

const { data: trialData, error: trialError } = await supabase
  .from('listing_trial')
  .select('*')
  .eq('id', listingId)
  .maybeSingle();

let listingData = null;
let isListingTrial = false;

if (trialData) {
  console.log('✅ Found listing in listing_trial table');
  listingData = trialData;
  isListingTrial = true;
  // Map listing_trial fields to standard listing format for compatibility
  // listing_trial uses 'id' as UUID, listing uses '_id' as Bubble ID
  listingData._id = listingData.id;
} else {
```

**After**:
```javascript
// Query listing table by _id
console.log('🔍 fetchListingComplete: Fetching listing with _id=' + listingId);

const { data: listingData, error: listingError } = await supabase
  .from('listing')
  .select(`
    _id,
    Name,
    // ... all other fields
  `)
  .eq('_id', listingId)
  .single();

if (listingError) throw listingError;
if (!listingData) throw new Error('Listing not found');
```

---

#### 2.2 `useHostOverviewPageLogic.js`

**File**: [app/src/islands/pages/HostOverviewPage/useHostOverviewPageLogic.js](../../../app/src/islands/pages/HostOverviewPage/useHostOverviewPageLogic.js)

**Changes**:
1. Remove comment about `listing_trial` (line 99)
2. Remove the separate `listing_trial` fetch via RPC (lines 131-145)
3. Remove `trialListings` processing (lines 196-230)
4. Remove fetching missing listings from `listing_trial` (lines 244-284)
5. Simplify to use only `get_host_listings` RPC (which will only return `listing` data)

**Key removals**:
```javascript
// REMOVE: Comment and listing_trial fetch
// 2. listing_trial table (new self-listing submissions)
.rpc('get_host_listings', { host_user_id: userId })
  .then(result => {
    console.log('[HostOverview] listing_trial query result:', result);
    return { type: 'listing_trial', ...result };
  })

// REMOVE: Trial listings processing
const trialResult = results.find(r => r?.type === 'listing_trial');

// REMOVE: Missing listings fetch from listing_trial
const { data: missingListings } = await supabase
  .from('listing_trial')
  .select('*')
  .in('id', missingIds);
```

---

#### 2.3 `useListingDashboardPageLogic.js`

**File**: [app/src/islands/pages/ListingDashboardPage/useListingDashboardPageLogic.js](../../../app/src/islands/pages/ListingDashboardPage/useListingDashboardPageLogic.js)

**Changes**:
1. Remove dual-table fetch logic (lines 364-400)
2. Remove `isListingTrial` flag and all conditional logic
3. Simplify photo operations to use unified approach
4. Remove all `listing_trial` queries in photo handlers (lines 984-1158)

**Key sections to modify**:

**fetchListing function** (lines 354-487):
- Remove `listing_trial` query attempt
- Query `listing` table directly
- Use consistent photo handling

**handleSetCoverPhoto** (lines 984-1036):
- Remove `listing_trial` check and JSON update path

**handleReorderPhotos** (lines 1039-1105):
- Remove `listing_trial` check and JSON update path

**handleDeletePhoto** (lines 1107-1169):
- Remove `listing_trial` check and JSON update path

---

### Phase 3: Service Layer

#### 3.1 `listingService.js`

**File**: [app/src/lib/listingService.js](../../../app/src/lib/listingService.js)

**Changes**:
1. Remove `getListingTrialById` function (lines 949-980)
2. Remove deprecated section comment (lines 1001-1004)
3. Remove `mapFormDataToDatabase` function (lines 1006-1209+)
4. Update any remaining comments referencing `listing_trial`

**Functions to DELETE**:
```javascript
// DELETE: getListingTrialById (lines 949-980)
export async function getListingTrialById(id) { ... }

// DELETE: mapFormDataToDatabase (lines 1006+)
function mapFormDataToDatabase(formData, userId = null) { ... }
```

---

### Phase 4: Minor References

#### 4.1 `useAccountProfilePageLogic.js`

**File**: [app/src/islands/pages/AccountProfilePage/useAccountProfilePageLogic.js](../../../app/src/islands/pages/AccountProfilePage/useAccountProfilePageLogic.js)

**Line 440**: Update source field
```javascript
// BEFORE
source: listing.source || 'listing_trial'

// AFTER
source: listing.source || 'listing'
```

#### 4.2 `useLoggedInAvatarData.js`

**File**: [app/src/islands/shared/LoggedInAvatar/useLoggedInAvatarData.js](../../../app/src/islands/shared/LoggedInAvatar/useLoggedInAvatarData.js)

**Lines 163, 268**: Update comments
```javascript
// BEFORE
//    This queries both listing_trial and listing tables,
// The RPC returns results from both listing_trial and listing tables

// AFTER
//    This queries the listing table
// The RPC returns results from the listing table
```

#### 4.3 `HostOverviewCards.jsx`

**File**: [app/src/islands/pages/HostOverviewPage/components/HostOverviewCards.jsx](../../../app/src/islands/pages/HostOverviewPage/components/HostOverviewCards.jsx)

**Line 59**: Update comment
```javascript
// BEFORE
// Collect all nightly rates (from both Bubble and listing_trial sources)

// AFTER
// Collect all nightly rates
```

#### 4.4 `SelfListingPage.tsx`

**File**: [app/src/islands/pages/SelfListingPage/SelfListingPage.tsx](../../../app/src/islands/pages/SelfListingPage/SelfListingPage.tsx)

**Lines 535, 579**: Update comments
```javascript
// BEFORE
// Submit to listing_trial table via listingService

// AFTER
// Submit to listing table via listingService
```

---

## Implementation Order

### Step 1: Update RPC Function (Supabase)
1. Modify `get_host_listings` to query only `listing` table
2. Test the function returns correct data

### Step 2: Update Core Fetching Logic
1. `listingDataFetcher.js` - Remove dual-table logic
2. `useHostOverviewPageLogic.js` - Remove trial table processing
3. `useListingDashboardPageLogic.js` - Remove trial table queries

### Step 3: Clean Up Service Layer
1. `listingService.js` - Remove deprecated functions

### Step 4: Minor Updates
1. Update comments in `useAccountProfilePageLogic.js`
2. Update comments in `useLoggedInAvatarData.js`
3. Update comments in `HostOverviewCards.jsx`
4. Update comments in `SelfListingPage.tsx`

### Step 5: Documentation Updates
1. Update CLAUDE.md files
2. Update quick reference docs
3. Archive or remove `listing_trial` specific plans

---

## Testing Checklist

After implementation, verify:

- [ ] Host Overview page loads listings correctly
- [ ] Listing Dashboard fetches listing data
- [ ] Photo operations work (set cover, reorder, delete)
- [ ] Self-listing form creates listings in `listing` table
- [ ] Account Profile shows listings correctly
- [ ] Logged-in avatar menu shows listing count
- [ ] No console errors referencing `listing_trial`

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Breaking existing listing queries | LOW | HIGH | Thorough testing after RPC update |
| Photo handling inconsistencies | MEDIUM | MEDIUM | Unified photo approach already works |
| Edge cases with older data | LOW | LOW | All data already in `listing` table |

---

## Rollback Plan

If issues arise:
1. RPC function can be reverted via Supabase migrations
2. Frontend code changes can be git reverted
3. No data migration needed (table was deleted, not migrated)

---

## File References

### Primary Files to Modify
- [app/src/lib/listingDataFetcher.js](../../../app/src/lib/listingDataFetcher.js)
- [app/src/lib/listingService.js](../../../app/src/lib/listingService.js)
- [app/src/islands/pages/HostOverviewPage/useHostOverviewPageLogic.js](../../../app/src/islands/pages/HostOverviewPage/useHostOverviewPageLogic.js)
- [app/src/islands/pages/ListingDashboardPage/useListingDashboardPageLogic.js](../../../app/src/islands/pages/ListingDashboardPage/useListingDashboardPageLogic.js)
- [app/src/islands/pages/AccountProfilePage/useAccountProfilePageLogic.js](../../../app/src/islands/pages/AccountProfilePage/useAccountProfilePageLogic.js)
- [app/src/islands/shared/LoggedInAvatar/useLoggedInAvatarData.js](../../../app/src/islands/shared/LoggedInAvatar/useLoggedInAvatarData.js)
- [app/src/islands/pages/HostOverviewPage/components/HostOverviewCards.jsx](../../../app/src/islands/pages/HostOverviewPage/components/HostOverviewCards.jsx)
- [app/src/islands/pages/SelfListingPage/SelfListingPage.tsx](../../../app/src/islands/pages/SelfListingPage/SelfListingPage.tsx)

### RPC Function
- Database function: `public.get_host_listings`

### Documentation to Update (After Code Changes)
- `.claude/Documentation/Pages/LISTING_DASHBOARD_QUICK_REFERENCE.md`
- `.claude/Documentation/Pages/LISTING_DASHBOARD_PAGE_CONTEXT.md`
- `.claude/Documentation/Pages/HOST_OVERVIEW_QUICK_REFERENCE.md`
- `app/src/islands/pages/ListingDashboardPage/CLAUDE.md`
- `app/src/islands/pages/SelfListingPage/CLAUDE.md`
