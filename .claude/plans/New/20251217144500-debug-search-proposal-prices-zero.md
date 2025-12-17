# Debug Analysis: Proposal Flow Prices Showing as $0 on Search Page

**Created**: 2025-12-17 14:45:00
**Status**: Analysis Complete - Pending Implementation
**Severity**: High
**Affected Area**: Search Page > Create Proposal Flow > Days Selection Section

## 1. System Context (From Onboarding)

### 1.1 Architecture Understanding
- **Architecture Pattern**: Islands Architecture with Hollow Components
- **Tech Stack**: React 18, Vite, Supabase Edge Functions, Cloudflare Pages
- **Data Flow**:
  1. User clicks "Create Proposal" on SearchPage listing card
  2. `handleOpenCreateProposalModal(listing)` is called with transformed listing data
  3. `transformListingForProposal(listing)` converts listing to CreateProposalFlowV2 format
  4. CreateProposalFlowV2 renders DaysSelectionSection with listing data
  5. DaysSelectionSection uses ListingScheduleSelector with `scheduleSelectorListing`
  6. ListingScheduleSelector calls `useScheduleSelector` hook
  7. `useScheduleSelector` calls `calculatePrice()` from priceCalculations.js
  8. `calculatePrice()` extracts nightly rates via `getNightlyRateForNights()`

### 1.2 Domain Context
- **Feature Purpose**: Allow guests to create booking proposals from the search page
- **Related Documentation**:
  - `.claude/plans/Documents/20251212-FavoriteListingsPage-pricing-fix.md` (similar fix applied there)
- **Data Model**:
  - `listing` table contains pricing fields (`💰Nightly Host Rate for X nights`)
  - These must be passed through transformation chain to reach pricing calculation

### 1.3 Relevant Conventions
- **Day Indexing**: JavaScript 0-6 (database now uses 0-indexed natively)
- **Price Field Naming**: Original DB fields use emoji prefix (`💰Nightly Host Rate for X nights`)
- **Transformation Chain**: DB listing -> transformListing -> transformListingForProposal -> CreateProposalFlowV2 -> DaysSelectionSection -> scheduleSelectorListing

### 1.4 Entry Points & Dependencies
- **User Entry Point**: SearchPage.jsx -> PropertyCard -> "Create Proposal" button
- **Critical Path**: transformListing() -> transformListingForProposal() -> CreateProposalFlowV2 props -> DaysSelectionSection props -> ListingScheduleSelector -> priceCalculations.js
- **Dependencies**:
  - `app/src/lib/scheduleSelector/priceCalculations.js`
  - `app/src/islands/shared/useScheduleSelector.js`
  - `app/src/islands/shared/ListingScheduleSelector.jsx`
  - `app/src/islands/shared/CreateProposalFlowV2Components/DaysSelectionSection.jsx`

## 2. Problem Statement

When a user opens the Create Proposal flow from the Search page, the Days Selection section shows all prices as $0. This affects:
- Price per Night display
- Price per Four Weeks display
- Total Price display

The same issue was previously identified and fixed in `FavoriteListingsPage` (commit `914bb149`), but the fix was NOT applied to `SearchPage`.

## 3. Reproduction Context

- **Environment**: Production (splitlease.com/search)
- **Steps to reproduce**:
  1. Navigate to /search page
  2. View any listing card
  3. Click "Create Proposal" button
  4. Observe the Days Selection section
  5. All prices show as $0.00
- **Expected behavior**: Prices should reflect the listing's actual nightly rates based on number of days selected
- **Actual behavior**: All prices display as $0.00
- **Error messages/logs**: None visible (silent failure - values are `undefined` which coerce to 0)

## 4. Investigation Summary

### 4.1 Files Examined

| File | Relevance |
|------|-----------|
| `app/src/islands/pages/SearchPage.jsx` | Primary - contains both `transformListing` and `transformListingForProposal` functions |
| `app/src/islands/pages/FavoriteListingsPage/FavoriteListingsPage.jsx` | Reference - has the correct fix applied (commit 914bb149) |
| `app/src/islands/shared/CreateProposalFlowV2Components/DaysSelectionSection.jsx` | Receives listing data, creates `scheduleSelectorListing` object |
| `app/src/lib/scheduleSelector/priceCalculations.js` | Contains `calculatePrice()` and `getNightlyRateForNights()` functions |
| `app/src/islands/shared/useScheduleSelector.js` | Orchestrates price calculation |

### 4.2 Execution Flow Trace

```
1. User clicks "Create Proposal" on PropertyCard
   ↓
2. handleOpenCreateProposalModal(listing) called
   - listing = transformed listing from transformListing()
   - Has: 'Price 2 nights selected', 'Price 3 nights selected', etc.
   - Missing: '💰Nightly Host Rate for 2 nights', etc.
   ↓
3. setSelectedListingForProposal(listing) stores the listing
   ↓
4. CreateProposalFlowV2 rendered with:
   - listing={transformListingForProposal(selectedListingForProposal)}
   ↓
5. transformListingForProposal() maps fields:
   - '💰Nightly Host Rate for 2 nights': listing['Price 2 nights selected']
   - But listing ALSO has original fields MISSING!
   ↓
6. DaysSelectionSection receives listing, creates scheduleSelectorListing:
   - '💰Nightly Host Rate for 2 nights': listing['💰Nightly Host Rate for 2 nights']
   - This field is UNDEFINED because transformListingForProposal mapped wrong source
   ↓
7. priceCalculations.js getNightlyRateForNights():
   - Looks for: listing['💰Nightly Host Rate for X nights']
   - Finds: undefined
   - Returns: 0
   ↓
8. Price displays as $0.00
```

### 4.3 Git History Analysis

| Commit | Description | Impact |
|--------|-------------|--------|
| `914bb149` | "fix(FavoriteListingsPage): add original pricing fields for CreateProposalFlowV2" | Fixed exact same issue for FavoriteListingsPage |
| `a13f3a93` | "fix(SearchPage): align CreateProposalFlowV2 with FavoriteListingsPage behavior" | Added CreateProposalFlowV2 to SearchPage but did NOT copy pricing fix |
| `35684423` | "feat(SearchPage): add Create Proposal CTA button for returning guests" | Initial implementation without pricing fields |

The fix in commit `914bb149` was applied to `FavoriteListingsPage.jsx` but was never propagated to `SearchPage.jsx`.

## 5. Hypotheses

### Hypothesis 1: Missing Original Pricing Fields in transformListing (Likelihood: 95%)

**Theory**: The `transformListing()` function in SearchPage.jsx does not include the original `💰Nightly Host Rate for X nights` fields. When `transformListingForProposal()` tries to map `listing['Price 2 nights selected']` to `'💰Nightly Host Rate for 2 nights'`, it works, but DaysSelectionSection then tries to access `listing['💰Nightly Host Rate for 2 nights']` DIRECTLY (not via the mapped field), resulting in undefined values.

**Supporting Evidence**:
1. SearchPage `transformListing()` at line 1891-1896 has:
   ```javascript
   'Price 2 nights selected': dbListing['💰Nightly Host Rate for 2 nights'] || null,
   'Price 3 nights selected': dbListing['💰Nightly Host Rate for 3 nights'] || null,
   // ... etc
   ```
   But does NOT include the original `💰Nightly Host Rate for X nights` fields.

2. FavoriteListingsPage `transformDbListingToSearchFormat()` at lines 575-604 DOES include:
   ```javascript
   '💰Nightly Host Rate for 2 nights': dbListing['💰Nightly Host Rate for 2 nights'],
   '💰Nightly Host Rate for 3 nights': dbListing['💰Nightly Host Rate for 3 nights'],
   // ... etc
   ```

3. DaysSelectionSection.jsx `scheduleSelectorListing` at lines 163-167 expects:
   ```javascript
   '💰Nightly Host Rate for 2 nights': listing['💰Nightly Host Rate for 2 nights'],
   '💰Nightly Host Rate for 3 nights': listing['💰Nightly Host Rate for 3 nights'],
   // ... etc
   ```

4. priceCalculations.js `getNightlyRateForNights()` at lines 341-345 looks for:
   ```javascript
   2: listing['💰Nightly Host Rate for 2 nights'],
   3: listing['💰Nightly Host Rate for 3 nights'],
   // ... etc
   ```

**Contradicting Evidence**: None

**Verification Steps**:
1. Add console.log to DaysSelectionSection before creating scheduleSelectorListing
2. Check if `listing['💰Nightly Host Rate for X nights']` fields are undefined
3. Compare with FavoriteListingsPage where they should be defined

**Potential Fix**: Add original pricing fields to SearchPage's `transformListing()` function, matching the fix in FavoriteListingsPage (commit 914bb149).

**Convention Check**: This is a field passthrough issue at the transformation boundary - follows the principle of preserving original data structure.

### Hypothesis 2: Wrong Field Mapping in transformListingForProposal (Likelihood: 5%)

**Theory**: The `transformListingForProposal()` function maps fields incorrectly.

**Supporting Evidence**:
- The function at lines 2287-2291 maps:
  ```javascript
  '💰Nightly Host Rate for 2 nights': listing['Price 2 nights selected'],
  ```
- This creates a circular mapping where the field IS populated correctly.

**Contradicting Evidence**:
- DaysSelectionSection.jsx ALSO creates its own mapping at lines 163-167, bypassing transformListingForProposal's mapping
- The listing passed to DaysSelectionSection comes from transformListingForProposal, but DaysSelectionSection accesses fields directly, not via the mapped names

**Verification Steps**: Check if transformListingForProposal output has the correct values

**Potential Fix**: Not applicable if Hypothesis 1 is correct.

## 6. Recommended Action Plan

### Priority 1 (Try First) - HIGH CONFIDENCE FIX

Add the original pricing and availability fields to SearchPage's `transformListing()` function, exactly as done in FavoriteListingsPage (commit 914bb149).

**Implementation Details**:

**File**: `app/src/islands/pages/SearchPage.jsx`
**Location**: `transformListing()` function, around line 1914 (after `isNew: false`)

**Changes to add** (copy from FavoriteListingsPage lines 575-604):
```javascript
// After line 1914 (isNew: false,)
// Add these fields:

// Original pricing fields for CreateProposalFlowV2 / DaysSelectionSection
'💰Nightly Host Rate for 2 nights': dbListing['💰Nightly Host Rate for 2 nights'],
'💰Nightly Host Rate for 3 nights': dbListing['💰Nightly Host Rate for 3 nights'],
'💰Nightly Host Rate for 4 nights': dbListing['💰Nightly Host Rate for 4 nights'],
'💰Nightly Host Rate for 5 nights': dbListing['💰Nightly Host Rate for 5 nights'],
'💰Nightly Host Rate for 7 nights': dbListing['💰Nightly Host Rate for 7 nights'],
'💰Weekly Host Rate': dbListing['💰Weekly Host Rate'],
'💰Monthly Host Rate': dbListing['💰Monthly Host Rate'],
'💰Price Override': dbListing['💰Price Override'],
'💰Cleaning Cost / Maintenance Fee': dbListing['💰Cleaning Cost / Maintenance Fee'],
'💰Damage Deposit': dbListing['💰Damage Deposit'],
'💰Unit Markup': dbListing['💰Unit Markup'],
'rental type': dbListing['rental type'],
// Note: 'Weeks offered' already exists at line 1911, don't duplicate

// Availability fields for schedule selector
' First Available': dbListing[' First Available'],
'Last Available': dbListing['Last Available'],
'# of nights available': dbListing['# of nights available'],
'Active': dbListing['Active'],
'Approved': dbListing['Approved'],
'Dates - Blocked': dbListing['Dates - Blocked'],
'Complete': dbListing['Complete'],
'confirmedAvailability': dbListing['confirmedAvailability'],
'NEW Date Check-in Time': dbListing['NEW Date Check-in Time'],
'NEW Date Check-out Time': dbListing['NEW Date Check-out Time'],
'Nights Available (numbers)': dbListing['Nights Available (numbers)'],
'Minimum Nights': dbListing['Minimum Nights'],
'Maximum Nights': dbListing['Maximum Nights'],
'Days Available (List of Days)': dbListing['Days Available (List of Days)']
```

### Priority 2 (If Priority 1 Fails)

Update `transformListingForProposal()` to use the correct source field names that already exist in the transformed listing:

**File**: `app/src/islands/pages/SearchPage.jsx`
**Location**: `transformListingForProposal()` function, lines 2287-2291

Change:
```javascript
'💰Nightly Host Rate for 2 nights': listing['Price 2 nights selected'],
```
To:
```javascript
'💰Nightly Host Rate for 2 nights': listing['💰Nightly Host Rate for 2 nights'] || listing['Price 2 nights selected'],
```

This provides a fallback chain.

### Priority 3 (Deeper Investigation)

If both Priority 1 and 2 fail:
1. Add extensive console logging throughout the data transformation chain
2. Verify Supabase query is returning pricing fields
3. Check if field names have changed in the database schema
4. Compare raw DB response between SearchPage and FavoriteListingsPage

## 7. Prevention Recommendations

1. **Consolidate transformation functions**: Create a single shared `transformListingForDisplay()` utility in `app/src/lib/listingTransformers.js` used by both SearchPage and FavoriteListingsPage. This prevents drift between pages.

2. **Add TypeScript interfaces**: Define a `TransformedListing` interface that documents all required fields. This would catch missing fields at compile time.

3. **Add integration test**: Create a test that verifies the CreateProposalFlowV2 receives all required pricing fields from SearchPage.

4. **Code review checklist**: When adding CreateProposalFlowV2 to a new page, verify all pricing fields are passed through the transformation chain.

## 8. Related Files Reference

| File | Purpose | Lines to Check |
|------|---------|----------------|
| `app/src/islands/pages/SearchPage.jsx` | Primary fix location | 1879-1916 (transformListing), 2277-2296 (transformListingForProposal) |
| `app/src/islands/pages/FavoriteListingsPage/FavoriteListingsPage.jsx` | Reference implementation | 545-605 (transformDbListingToSearchFormat with fix) |
| `app/src/islands/shared/CreateProposalFlowV2Components/DaysSelectionSection.jsx` | Consumer of pricing fields | 137-174 (scheduleSelectorListing creation) |
| `app/src/lib/scheduleSelector/priceCalculations.js` | Price calculation logic | 338-356 (getNightlyRateForNights function) |
| `app/src/islands/shared/useScheduleSelector.js` | Price calculation orchestration | 89-92 (priceBreakdown calculation) |
| `app/src/islands/shared/ListingScheduleSelector.jsx` | Schedule selector UI | 116-117 (PriceDisplay rendering) |

---

## Changelog

| Date | Action |
|------|--------|
| 2025-12-17 14:45 | Initial analysis complete. Root cause identified as missing pricing fields in transformListing(). |
