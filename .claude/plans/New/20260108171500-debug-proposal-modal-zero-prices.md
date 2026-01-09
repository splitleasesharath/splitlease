# Debug Analysis: Proposal Modal Price Calculation Returns $0.00

**Created**: 2026-01-08T17:15:00
**Status**: Analysis Complete - Pending Implementation
**Severity**: High
**Affected Area**: CreateProposalFlowV2 modal on SearchPage

## 1. System Context (From Onboarding)

### 1.1 Architecture Understanding
- **Architecture Pattern**: Islands Architecture with Hollow Components
- **Tech Stack**: React 18, Vite, Supabase Edge Functions
- **Data Flow**: SearchPage fetches listings from Supabase -> transforms to card format -> CreateProposalFlowV2 modal receives transformed listing -> `calculatePrice()` computes pricing

### 1.2 Domain Context
- **Feature Purpose**: Allow guests to create booking proposals directly from the search results page
- **Related Documentation**:
  - `.claude/Documentation/miniCLAUDE.md` - Pricing calculations location
  - `app/CLAUDE.md` - Frontend architecture
- **Data Model**:
  - `listing` table with pricing fields: `💰Nightly Host Rate for X nights` (X = 2,3,4,5,7)
  - `rental type` field determines calculation path (Monthly/Weekly/Nightly)

### 1.3 Relevant Conventions
- **Key Patterns**: Four-layer logic architecture (calculators -> rules -> processors -> workflows)
- **Pricing Calculation**: Located in `app/src/lib/scheduleSelector/priceCalculations.js`
- **Field Naming**:
  - Database uses `💰Nightly Host Rate for X nights` format
  - Some UI components use `Price X nights selected` format (legacy naming)

### 1.4 Entry Points & Dependencies
- **User/Request Entry Point**: User clicks "Create Proposal" button on PropertyCard in SearchPage
- **Critical Path**:
  1. `SearchPage.jsx` -> `selectedListingForProposal` state
  2. `transformListingForProposal()` -> transforms listing data
  3. `CreateProposalFlowV2` component receives transformed listing
  4. `pricingListing` useMemo extracts pricing fields
  5. `calculatePrice()` in `priceCalculations.js` calculates final prices
- **Dependencies**:
  - `app/src/lib/scheduleSelector/priceCalculations.js`
  - `app/src/lib/scheduleSelector/nightCalculations.js`

## 2. Problem Statement

When a user clicks "Create Proposal" on the search page, the "Adjust Proposal" modal shows all prices as $0.00 (Base Price, Nightly Rate, Total Price, Per Night). However, the PropertyCard on the search page correctly displays the prices for the same listing.

**Impact**: Users cannot see accurate pricing when creating proposals from the search page, which may lead to confusion and abandoned proposal submissions.

## 3. Reproduction Context

- **Environment**: Development (localhost:8000), also affects production
- **Steps to reproduce**:
  1. Navigate to /search
  2. Use the schedule selector to select days (e.g., Mon-Fri = 4 nights)
  3. Observe PropertyCard shows correct dynamic price
  4. Click "Create Proposal" on any listing
  5. In the "Adjust Proposal" modal, observe all prices show $0.00
- **Expected behavior**: Modal should display the same calculated prices as the PropertyCard
- **Actual behavior**: Modal displays $0.00 for all price fields
- **Error messages/logs**:
```
📋 CreateProposalFlowV2 initialized with data from View page: Object
📊 Recalculating prices due to reservationSpan change: 13
=== CALCULATE PRICE ===
nightsCount: 4
listing rental type: Nightly
reservationSpan: 13
=== PRICE CALCULATION RESULT ===
pricePerNight: 0
fourWeekRent: 0
reservationTotal: 0
initialPayment: 0
```

## 4. Investigation Summary

### 4.1 Files Examined

| File | Path | Relevance |
|------|------|-----------|
| SearchPage.jsx | `app/src/islands/pages/SearchPage.jsx` | Contains `transformListingForProposal()` function - **ROOT CAUSE** |
| CreateProposalFlowV2.jsx | `app/src/islands/shared/CreateProposalFlowV2.jsx` | Receives transformed listing, creates `pricingListing` memo |
| priceCalculations.js | `app/src/lib/scheduleSelector/priceCalculations.js` | Calculates prices using nightly rates |
| nightCalculations.js | `app/src/lib/scheduleSelector/nightCalculations.js` | Calculates nights from selected days |

### 4.2 Execution Flow Trace

```
1. SearchPage.jsx: transformDbListingToCardFormat() (line 2069)
   - Creates listing object with CORRECT fields:
     - '💰Nightly Host Rate for 2 nights': dbListing['💰Nightly Host Rate for 2 nights']
     - '💰Nightly Host Rate for 3 nights': dbListing['💰Nightly Host Rate for 3 nights']
     - (etc.)

2. User clicks "Create Proposal"

3. SearchPage.jsx: transformListingForProposal(selectedListingForProposal) (line 2515)
   - INCORRECTLY maps fields:
     - '💰Nightly Host Rate for 2 nights': listing['Price 2 nights selected']  ← WRONG SOURCE
     - '💰Nightly Host Rate for 3 nights': listing['Price 3 nights selected']  ← WRONG SOURCE
   - The listing object does NOT have 'Price X nights selected' fields
   - Result: All nightly rate fields are UNDEFINED

4. CreateProposalFlowV2.jsx receives listing with undefined pricing fields

5. CreateProposalFlowV2.jsx: pricingListing useMemo (line 393)
   - Reads listing['💰Nightly Host Rate for X nights']
   - All values are undefined

6. priceCalculations.js: calculatePrice() (line 33)
   - getNightlyRateForNights() returns 0 (fallback)
   - All calculations return 0
```

### 4.3 Git History Analysis

The issue appears to be a field naming mismatch that was introduced when the SearchPage was updated to fetch from Supabase directly. The listing transformation function was not updated to match the new field naming convention.

**Key difference**:
- `transformDbListingToCardFormat()` uses `'💰Nightly Host Rate for X nights'`
- `transformListingForProposal()` expects `'Price X nights selected'` which does not exist on the listing object

## 5. Hypotheses

### Hypothesis 1: Field Name Mismatch in transformListingForProposal (Likelihood: 99%)

**Theory**: The `transformListingForProposal` function reads from non-existent fields on the listing object, causing all pricing data to be `undefined`.

**Supporting Evidence**:
1. PropertyCard works correctly by using `listing['💰Nightly Host Rate for X nights']` directly (line 594)
2. `transformListingForProposal` maps from `listing['Price X nights selected']` which does NOT exist on the listing object
3. The listing object returned by `transformDbListingToCardFormat` does NOT include `'Price X nights selected'` fields
4. Console logs show `listing rental type: Nightly` but all prices are 0, indicating the rental type is read correctly but nightly rates are not

**Contradicting Evidence**: None

**Verification Steps**:
1. Add console.log in `transformListingForProposal` to show input listing fields
2. Confirm that `listing['Price 2 nights selected']` is `undefined`
3. Confirm that `listing['💰Nightly Host Rate for 2 nights']` has the correct value

**Potential Fix**:
Change `transformListingForProposal` to read from the correct source fields:

```javascript
// BEFORE (line 2525-2529):
'💰Nightly Host Rate for 2 nights': listing['Price 2 nights selected'],
'💰Nightly Host Rate for 3 nights': listing['Price 3 nights selected'],
'💰Nightly Host Rate for 4 nights': listing['Price 4 nights selected'],
'💰Nightly Host Rate for 5 nights': listing['Price 5 nights selected'],
'💰Nightly Host Rate for 7 nights': listing['Price 7 nights selected'],

// AFTER:
'💰Nightly Host Rate for 2 nights': listing['💰Nightly Host Rate for 2 nights'],
'💰Nightly Host Rate for 3 nights': listing['💰Nightly Host Rate for 3 nights'],
'💰Nightly Host Rate for 4 nights': listing['💰Nightly Host Rate for 4 nights'],
'💰Nightly Host Rate for 5 nights': listing['💰Nightly Host Rate for 5 nights'],
'💰Nightly Host Rate for 7 nights': listing['💰Nightly Host Rate for 7 nights'],
```

**Convention Check**: The fix aligns with the database field naming convention documented in the codebase.

### Hypothesis 2: Missing Fields for Monthly/Weekly Listings (Likelihood: 70%)

**Theory**: If the listing's `rental type` is "Monthly" or "Weekly", the transform function hardcodes `'rental type': 'Nightly'`, which may cause incorrect calculation paths.

**Supporting Evidence**:
1. Line 2522: `'rental type': 'Nightly'` is hardcoded instead of using `listing.rentalType || listing['rental type']`
2. The logs show `listing rental type: Nightly` for all listings

**Contradicting Evidence**:
1. The provided logs show a Nightly listing, so this may not be the primary issue
2. PropertyCard likely has the same issue but still works for Nightly listings

**Verification Steps**:
1. Test with a Monthly or Weekly rental type listing
2. Check if the rental type is being passed correctly

**Potential Fix**:
```javascript
// BEFORE:
'rental type': 'Nightly',

// AFTER:
'rental type': listing.rentalType || listing['rental type'] || 'Nightly',
```

### Hypothesis 3: Missing Weekly/Monthly Rate Fields (Likelihood: 60%)

**Theory**: For Monthly or Weekly rental types, the transform function does not include the `💰Monthly Host Rate` or `💰Weekly Host Rate` fields.

**Supporting Evidence**:
1. `transformListingForProposal` does not include `'💰Monthly Host Rate'` or `'💰Weekly Host Rate'`
2. These are required by `calculateMonthlyPrice()` and `calculateWeeklyPrice()` in priceCalculations.js

**Contradicting Evidence**:
1. The current issue is with Nightly listings based on the logs
2. This would only affect Monthly/Weekly listings

**Potential Fix**:
Add missing rate fields:
```javascript
'💰Monthly Host Rate': listing['💰Monthly Host Rate'],
'💰Weekly Host Rate': listing['💰Weekly Host Rate'],
```

### Hypothesis 4: Missing Unit Markup and Fee Fields (Likelihood: 40%)

**Theory**: Some secondary pricing fields may be incorrectly sourced or missing.

**Supporting Evidence**:
1. Line 2524: `'💰Unit Markup': 0` is hardcoded to 0 instead of using listing value
2. Line 2530: `'💰Cleaning Cost / Maintenance Fee': 0` is hardcoded to 0
3. Line 2531: `'💰Damage Deposit': 0` is hardcoded to 0

**Contradicting Evidence**:
1. These fields don't affect the base price calculation (they are added later)
2. The main issue is that pricePerNight is 0, which depends on nightly rates

**Potential Fix**:
```javascript
'💰Unit Markup': listing['💰Unit Markup'] || 0,
'💰Cleaning Cost / Maintenance Fee': listing['💰Cleaning Cost / Maintenance Fee'] || 0,
'💰Damage Deposit': listing['💰Damage Deposit'] || 0,
```

## 6. Recommended Action Plan

### Priority 1 (Try First) - Fix Field Name Mapping

**File**: `app/src/islands/pages/SearchPage.jsx`
**Location**: Lines 2515-2534 (`transformListingForProposal` function)

Replace the entire function with:

```javascript
// Transform listing data from SearchPage format to CreateProposalFlowV2 expected format
const transformListingForProposal = (listing) => {
  if (!listing) return null;
  return {
    _id: listing.id,
    Name: listing.title,
    'Minimum Nights': 2,
    'Maximum Nights': 7,
    // Use actual rental type from listing, not hardcoded value
    'rental type': listing.rentalType || listing['rental type'] || 'Nightly',
    'Weeks offered': listing.weeksOffered || listing['Weeks offered'] || 'Every week',
    // Use actual unit markup from listing
    '💰Unit Markup': listing['💰Unit Markup'] || 0,
    // FIX: Use correct source field names (these ARE the fields on the listing object)
    '💰Nightly Host Rate for 2 nights': listing['💰Nightly Host Rate for 2 nights'],
    '💰Nightly Host Rate for 3 nights': listing['💰Nightly Host Rate for 3 nights'],
    '💰Nightly Host Rate for 4 nights': listing['💰Nightly Host Rate for 4 nights'],
    '💰Nightly Host Rate for 5 nights': listing['💰Nightly Host Rate for 5 nights'],
    '💰Nightly Host Rate for 7 nights': listing['💰Nightly Host Rate for 7 nights'],
    // Add Monthly and Weekly rates for non-Nightly rental types
    '💰Monthly Host Rate': listing['💰Monthly Host Rate'],
    '💰Weekly Host Rate': listing['💰Weekly Host Rate'],
    // Use actual fee values from listing
    '💰Cleaning Cost / Maintenance Fee': listing['💰Cleaning Cost / Maintenance Fee'] || 0,
    '💰Damage Deposit': listing['💰Damage Deposit'] || 0,
    host: listing.host
  };
};
```

### Priority 2 (Verification Step)

After applying the fix, verify:
1. Open the browser dev console
2. Navigate to /search
3. Select days (e.g., Mon-Fri)
4. Click "Create Proposal" on a listing
5. Confirm the logs show non-zero prices:
```
=== PRICE CALCULATION RESULT ===
pricePerNight: [non-zero value]
fourWeekRent: [non-zero value]
reservationTotal: [non-zero value]
```

### Priority 3 (Test Edge Cases)

Test with different listing types:
1. Nightly rental type listing
2. Weekly rental type listing (if available)
3. Monthly rental type listing (if available)

Verify that each rental type calculates prices correctly.

## 7. Prevention Recommendations

### 7.1 Field Naming Consistency

**Recommendation**: Create a centralized field name mapping utility that ensures consistency between:
- Database column names
- UI display names
- API response field names

**Location**: Could be added to `app/src/lib/constants.js`

### 7.2 Data Transformation Validation

**Recommendation**: Add runtime validation when transforming listing data to ensure required pricing fields are present. Log warnings if fields are missing.

```javascript
const validatePricingFields = (listing) => {
  const requiredFields = [
    '💰Nightly Host Rate for 2 nights',
    '💰Nightly Host Rate for 3 nights',
    '💰Nightly Host Rate for 4 nights',
    '💰Nightly Host Rate for 5 nights',
    '💰Nightly Host Rate for 7 nights'
  ];

  const missingFields = requiredFields.filter(field => listing[field] === undefined);
  if (missingFields.length > 0) {
    console.warn('[transformListingForProposal] Missing pricing fields:', missingFields);
  }
  return missingFields.length === 0;
};
```

### 7.3 Type Safety

**Recommendation**: Consider adding TypeScript types for listing data structures to catch field name mismatches at compile time.

## 8. Related Files Reference

| File | Line Numbers | Purpose |
|------|--------------|---------|
| `app/src/islands/pages/SearchPage.jsx` | 2069-2118 | `transformDbListingToCardFormat()` - creates listing with correct fields |
| `app/src/islands/pages/SearchPage.jsx` | 2515-2534 | `transformListingForProposal()` - **BUG LOCATION** - uses wrong source fields |
| `app/src/islands/pages/SearchPage.jsx` | 3047-3066 | `CreateProposalFlowV2` invocation |
| `app/src/islands/shared/CreateProposalFlowV2.jsx` | 393-413 | `pricingListing` useMemo - reads pricing fields |
| `app/src/islands/shared/CreateProposalFlowV2.jsx` | 415-443 | Price recalculation effect |
| `app/src/lib/scheduleSelector/priceCalculations.js` | 33-112 | `calculatePrice()` main function |
| `app/src/lib/scheduleSelector/priceCalculations.js` | 217-255 | `calculateNightlyPrice()` - returns 0 when no rate found |
| `app/src/lib/scheduleSelector/priceCalculations.js` | 369-388 | `getNightlyRateForNights()` - returns 0 for undefined rates |

---

## Quick Reference: The Fix

**Root Cause**: `transformListingForProposal` function at line 2515 in SearchPage.jsx reads from non-existent fields (`listing['Price X nights selected']`) instead of the actual fields on the listing object (`listing['💰Nightly Host Rate for X nights']`).

**Solution**: Update lines 2525-2529 to use the correct source field names that match what `transformDbListingToCardFormat` produces.
