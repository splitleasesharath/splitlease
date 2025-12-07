# Implementation Plan: Bypass `listing_trial` - Direct Write to `listing` Table

**Created**: 2025-12-06
**Status**: Planning
**Priority**: High
**Estimated Effort**: Medium (2-3 days)

---

## Executive Summary

This plan outlines how to modify the self-listing form submission flow to bypass the `listing_trial` table entirely and write directly to the main `listing` table on Step 7 submission. This simplifies the data architecture by eliminating an intermediate staging table.

---

## Current Architecture (Before)

```
SelfListingPage.tsx (Section 7 Submit)
         │
         ↓
handleSubmit() → proceedWithSubmit()
         │
         ↓
listingService.js::createListing()
         │
         ├──→ 1. Upload photos to Supabase Storage
         │
         ├──→ 2. Generate temp _id (self_timestamp_random)
         │
         ├──→ 3. INSERT into `listing_trial` table ← TARGET TO REMOVE
         │
         ├──→ 4. Link to account_host.Listings
         │
         ├──→ 5. Sync to Bubble (optional, best effort)
         │
         └──→ 6. Sync to `listing` table (optional, best effort)
                      └─→ Return UUID (listing_trial.id)
```

**Current Tables Involved:**
| Table | Role | Primary Key |
|-------|------|-------------|
| `listing_trial` | Staging table for new self-listings | `id` (UUID) |
| `listing` | Main production table | `_id` (Bubble format) |
| `account_host` | Host account with `Listings` array | `_id` |

---

## Target Architecture (After)

```
SelfListingPage.tsx (Section 7 Submit)
         │
         ↓
handleSubmit() → proceedWithSubmit()
         │
         ↓
listingService.js::createListing()
         │
         ├──→ 1. Upload photos to Supabase Storage
         │
         ├──→ 2. Generate Bubble-compatible _id via RPC
         │
         ├──→ 3. INSERT directly into `listing` table ← NEW
         │
         ├──→ 4. Link to account_host.Listings
         │
         └──→ 5. Sync to Bubble (optional, best effort)
                      └─→ Return _id (listing._id)
```

---

## Detailed Analysis

### 1. ID Generation Strategy

**Current**: `self_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

**Target**: Use `generate_bubble_id()` RPC function (already exists in Supabase)

```javascript
// Current (listingService.js:503)
const uniqueId = `self_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Target
const { data: uniqueId, error } = await supabase.rpc('generate_bubble_id');
```

**Rationale**: Bubble-compatible IDs ensure consistency with existing listings and allow future Bubble sync if needed.

---

### 2. Schema Compatibility Analysis

The `listing` and `listing_trial` tables share nearly identical schemas. The `syncToListingTable()` function in `listingService.js:196-293` already maps data between them.

**Key Column Mappings** (same in both tables):
| Form Field | Database Column |
|------------|-----------------|
| `spaceSnapshot.listingName` | `Name` |
| `spaceSnapshot.typeOfSpace` | `Features - Type of Space` |
| `spaceSnapshot.address` | `Location - Address` (JSONB) |
| `pricing.damageDeposit` | `💰Damage Deposit` |
| `photos.photos` | `Features - Photos` (JSONB) |

**Columns unique to `listing` table** (need defaults):
| Column | Required | Default Value |
|--------|----------|---------------|
| `Active` | YES | `false` |
| `Approved` | YES | `false` |
| `Complete` | YES | `true` |
| `Features - Trial Periods Allowed` | YES | `false` |
| `Maximum Weeks` | NO | `52` |
| `Minimum Nights` | NO | `1` |

---

### 3. Files Requiring Modification

#### Primary Changes (Core Flow)

| File | Changes Required | Complexity |
|------|------------------|------------|
| `app/src/lib/listingService.js` | Modify `createListing()` to write to `listing` | HIGH |
| `app/src/lib/listingService.js` | Remove `syncToListingTable()` function | LOW |
| `app/src/lib/listingService.js` | Update ID generation to use RPC | LOW |
| `app/src/lib/listingService.js` | Update `linkListingToHost()` to use `_id` | LOW |

#### Downstream Changes (Read Paths)

| File | Changes Required | Complexity |
|------|------------------|------------|
| `app/src/lib/listingDataFetcher.js` | Remove `listing_trial` fallback logic | LOW |
| `app/src/islands/pages/ListingDashboardPage/useListingDashboardPageLogic.js` | Simplify to only read from `listing` | MEDIUM |
| `app/src/islands/pages/HostOverviewPage/useHostOverviewPageLogic.js` | Remove `listing_trial` fallback | LOW |

#### URL Parameter Changes

| File | Changes Required | Complexity |
|------|------------------|------------|
| `app/src/islands/pages/SelfListingPage/SelfListingPage.tsx` | Update success redirect to use `_id` | LOW |

---

## Potential Conflicts & Breaking Changes

### 1. **ID Format Change** ⚠️ HIGH IMPACT

**Current**: Frontend expects UUID (`id`) for new listings
**After**: Frontend will receive Bubble-format ID (`_id`)

**Affected Components**:
- Success modal redirect: `listing-dashboard.html?listing_id=${listingId}`
- Preview button: `view-split-lease.html?listing_id=${listingId}`

**Resolution**:
- The `listing_id` URL parameter already supports both formats
- `useListingDashboardPageLogic.js` already tries `_id` lookup as fallback (line 339-351)
- No breaking change, but simplify by removing UUID-first logic

---

### 2. **Orphaned `listing_trial` Data** ⚠️ MEDIUM IMPACT

**Issue**: Existing entries in `listing_trial` will become orphaned.

**Resolution Options**:
1. **Migrate existing data**: Run one-time migration to move `listing_trial` → `listing`
2. **Deprecation period**: Keep dual-read logic for 30 days, then remove
3. **Clean break**: Delete `listing_trial` data if no active drafts exist

**Recommendation**: Option 2 (Deprecation period) - safest approach

---

### 3. **RLS Policies** ⚠️ LOW IMPACT

**Current `listing` table**: RLS Disabled (from DATABASE_TABLES_DETAILED.md)

**Implication**: No RLS changes needed. Direct inserts will work.

**Future consideration**: Enable RLS with user_id column for proper access control.

---

### 4. **Account Host Linking** ⚠️ MEDIUM IMPACT

**Current** (`listingService.js:148-186`):
```javascript
// Uses listing_trial.id (UUID)
const currentListings = hostData.Listings || [];
if (!currentListings.includes(listingId)) {
  currentListings.push(listingId);
}
```

**After**: Must use `listing._id` (Bubble format)

**Resolution**: Update `linkListingToHost()` to pass `_id` instead of `id`

---

### 5. **Photo Storage References** ⚠️ LOW IMPACT

**Current**: Photos uploaded with temp ID: `temp_${Date.now()}_${random}`

**After**: No change needed - photos are stored in Supabase Storage with unique paths. The listing record stores URLs, not references to temp IDs.

---

## Implementation Steps

### Phase 1: Core Service Changes (Day 1)

#### Step 1.1: Update ID Generation
**File**: `app/src/lib/listingService.js`

```javascript
// BEFORE (line 503)
const uniqueId = `self_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// AFTER
const { data: uniqueId, error: idError } = await supabase.rpc('generate_bubble_id');
if (idError || !uniqueId) {
  throw new Error('Failed to generate listing ID');
}
```

#### Step 1.2: Modify `createListing()` Function
**File**: `app/src/lib/listingService.js`

```javascript
// BEFORE (line 72-77)
const { data, error } = await supabase
  .from('listing_trial')
  .insert(listingData)
  .select()
  .single();

// AFTER
const { data, error } = await supabase
  .from('listing')
  .insert(listingData)
  .select()
  .single();
```

#### Step 1.3: Update Data Mapping Function
**File**: `app/src/lib/listingService.js`

Merge `mapFormDataToDatabase()` and the logic from `syncToListingTable()` into a single function that maps directly to `listing` table schema.

Key changes:
- Use generated `_id` instead of UUID `id`
- Set `Active: false`, `Approved: false`, `Complete: true`
- Include all required `listing` table defaults

#### Step 1.4: Update Host Account Linking
**File**: `app/src/lib/listingService.js`

```javascript
// BEFORE
await linkListingToHost(userId, data.id);

// AFTER
await linkListingToHost(userId, data._id);
```

#### Step 1.5: Remove `syncToListingTable()` Function
**File**: `app/src/lib/listingService.js`

Delete lines 196-293 (`syncToListingTable` function) - no longer needed.

#### Step 1.6: Remove Bubble Sync Call (Optional)
**File**: `app/src/lib/listingService.js`

The `syncListingToBubble()` function can remain for backward compatibility with Bubble, or be removed if Bubble sync is no longer needed.

---

### Phase 2: Downstream Read Path Updates (Day 2)

#### Step 2.1: Update `listingDataFetcher.js`
**File**: `app/src/lib/listingDataFetcher.js`

```javascript
// BEFORE (line 65-78): Try listing_trial first, then listing
// AFTER: Only query listing table, use unified ID lookup

export async function fetchListingById(listingId) {
  // Support both UUID and Bubble ID formats
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}/.test(listingId);
  const column = isUUID ? 'id' : '_id'; // Legacy UUID support

  const { data, error } = await supabase
    .from('listing')
    .select('*')
    .eq(column, listingId)
    .single();

  return { data, error };
}
```

#### Step 2.2: Simplify `useListingDashboardPageLogic.js`
**File**: `app/src/islands/pages/ListingDashboardPage/useListingDashboardPageLogic.js`

Remove all `listing_trial` references and fallback logic (approximately 12 locations).

Simplify `fetchListing()` to only query `listing` table.

#### Step 2.3: Simplify `useHostOverviewPageLogic.js`
**File**: `app/src/islands/pages/HostOverviewPage/useHostOverviewPageLogic.js`

Remove the `listing_trial` fallback query (lines 210-214).

---

### Phase 3: Frontend Updates (Day 2-3)

#### Step 3.1: Update Success Modal Redirect
**File**: `app/src/islands/pages/SelfListingPage/SelfListingPage.tsx`

```javascript
// BEFORE (line 504)
setCreatedListingId(newListing.id);

// AFTER
setCreatedListingId(newListing._id);
```

#### Step 3.2: Update Success Modal URLs
**File**: `app/src/islands/pages/SelfListingPage/SelfListingPage.tsx`

```javascript
// BEFORE (line 138)
window.location.href = `/listing-dashboard.html?listing_id=${listingId}`;

// AFTER (no change needed - listing_id param works with both formats)
window.location.href = `/listing-dashboard.html?listing_id=${listingId}`;
```

---

### Phase 4: Testing & Cleanup (Day 3)

#### Step 4.1: End-to-End Testing
- [ ] Create new listing via self-listing form
- [ ] Verify listing appears in `listing` table with correct `_id`
- [ ] Verify redirect to listing-dashboard works
- [ ] Verify host overview shows new listing
- [ ] Verify listing appears in search results
- [ ] Verify view-split-lease page displays listing

#### Step 4.2: Data Migration (If Needed)
If there are active listings in `listing_trial`:

```sql
-- Migrate existing listing_trial entries to listing table
INSERT INTO listing (
  "_id",
  "Name",
  "Features - Type of Space",
  -- ... all other columns
)
SELECT
  -- Generate new Bubble IDs or use existing _id
  COALESCE("_id", 'migrated_' || id::text) as "_id",
  "Name",
  "Features - Type of Space",
  -- ... map all columns
FROM listing_trial
WHERE "_id" IS NULL OR "_id" = '';
```

#### Step 4.3: Update Documentation
- [ ] Update `app/src/lib/listingService.js` header comments
- [ ] Update `.claude/CLAUDE.md` to remove `listing_trial` references
- [ ] Archive `listing-migration-to-native-supabase.md` (superseded by this plan)

---

## Rollback Plan

If issues arise:

1. **Revert code changes** via git
2. **No data loss**: New listings will already be in `listing` table
3. **Re-enable dual-write**: Temporarily write to both tables if needed

---

## Files Summary

### Files to Modify

| File | Action | Lines Changed |
|------|--------|---------------|
| `app/src/lib/listingService.js` | Major refactor | ~100 |
| `app/src/lib/listingDataFetcher.js` | Simplify | ~20 |
| `app/src/islands/pages/ListingDashboardPage/useListingDashboardPageLogic.js` | Remove fallbacks | ~80 |
| `app/src/islands/pages/HostOverviewPage/useHostOverviewPageLogic.js` | Remove fallback | ~5 |
| `app/src/islands/pages/SelfListingPage/SelfListingPage.tsx` | Update ID reference | ~2 |

### Files to Keep Unchanged

| File | Reason |
|------|--------|
| `prepareListingSubmission.ts` | Data transformation still valid |
| `useListingStore.ts` | Local state management unchanged |
| `listingLocalStore.ts` | Draft persistence unchanged |
| Edge Functions | Not directly affected (Bubble sync optional) |

### Files to Potentially Delete (Post-Migration)

| File/Table | Condition |
|------------|-----------|
| `listing_trial` table | After confirming no data loss |
| `syncToListingTable()` function | Removed in Phase 1 |
| `listing_trial` fallback code | Removed in Phase 2 |

---

## Success Criteria

1. ✅ New listings created via self-listing form are written directly to `listing` table
2. ✅ Listings receive Bubble-compatible `_id` via RPC
3. ✅ Host account correctly linked via `account_host.Listings`
4. ✅ Listing dashboard loads new listings correctly
5. ✅ Search page finds new listings
6. ✅ View listing page displays new listings
7. ✅ No orphaned data in `listing_trial` (migrated or cleaned up)

---

## Questions to Resolve Before Implementation

1. **Bubble Sync**: Should we keep the optional Bubble sync, or remove it entirely?
   - Keep: Maintains backward compatibility
   - Remove: Simplifies codebase, commits to Supabase-only

2. **Existing `listing_trial` Data**: What should happen to existing entries?
   - Migrate to `listing` table
   - Leave orphaned (if unused)
   - Delete after verification

3. **UUID Support**: Should we add a `uuid` column to `listing` table for backward compatibility with any components using UUIDs?
   - Yes: Add `id` column as secondary identifier
   - No: Use `_id` everywhere (cleaner long-term)

---

**Plan Version**: 1.0
**Last Updated**: 2025-12-06
**Author**: Claude Code
