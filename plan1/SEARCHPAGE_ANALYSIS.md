# SearchPage.jsx Analysis - Business Logic Extraction

**File**: `app/src/islands/pages/SearchPage.jsx`
**Size**: 1,704 lines
**Date**: 2025-11-22
**Status**: Phase 3 - Logic Core Extraction Complete

---

## Executive Summary

SearchPage.jsx is a complex search and listing display component with significant business logic that has been successfully extracted to Logic Core. The component handles:

- **Listing Search & Filtering**: Borough, neighborhood, price tier, week pattern filters
- **Price Calculation**: Guest-facing price calculation with markup and discounts
- **Coordinate Extraction**: JSONB parsing for map display with privacy prioritization
- **Data Transformation**: Raw Supabase data → UI listing objects
- **Lazy Loading**: Performance optimization for large result sets

**Key Finding**: The `calculateDynamicPrice()` function (lines 307-351) is **duplicate logic** that already exists in the Logic Core as `getNightlyRateByFrequency.js`. This duplication has been addressed by creating `calculateGuestFacingPrice.js` which consolidates the markup/discount logic.

---

## Business Logic Extracted

### ✅ 1. Price Calculation - `calculateGuestFacingPrice()` (Lines 307-351)

**Original Location**: Inside `PropertyCard` component
**New Location**: `logic/calculators/pricing/calculateGuestFacingPrice.js`

**Purpose**: Calculate guest-facing price per night after applying:
- 13% full-time discount (7 nights only)
- 17% site markup (all prices)

**Fallback Violations Fixed**:
```javascript
// BEFORE (SearchPage.jsx:321, 328)
nightlyHostRate = listing[fieldName] || 0  // ❌ Silent fallback
nightlyHostRate = listing['Starting nightly price'] || listing.price?.starting || 0  // ❌ Multiple fallbacks

// AFTER (calculateGuestFacingPrice.js)
if (typeof hostNightlyRate !== 'number' || isNaN(hostNightlyRate) || hostNightlyRate < 0) {
  throw new Error(...)  // ✅ Explicit error
}
```

**Formula Preserved**:
```
1. basePrice = hostRate × nights
2. fullTimeDiscount = basePrice × 0.13 (if 7 nights)
3. priceAfterDiscounts = basePrice - discount
4. siteMarkup = priceAfterDiscounts × 0.17
5. totalPrice = basePrice - discount + markup
6. pricePerNight = totalPrice / nights
```

---

### ✅ 2. Host Name Formatting - `formatHostName()` (Lines 269-279)

**Original Location**: Inside `PropertyCard` component
**New Location**: `logic/processors/display/formatHostName.js`

**Purpose**: Format "John Smith" → "John S." for privacy

**Fallback Violation Fixed**:
```javascript
// BEFORE (SearchPage.jsx:270)
if (!fullName || fullName === 'Host') return 'Host'  // ❌ Silent fallback

// AFTER (formatHostName.js)
if (!trimmedName || trimmedName.length === 0) {
  throw new Error('formatHostName: fullName cannot be empty or whitespace')  // ✅ Explicit error
}
```

**Logic**:
- Single name: Return as-is ("John" → "John")
- Multiple names: "FirstName L." ("John Smith" → "John S.")

---

### ✅ 3. Coordinate Extraction - Inside `transformListing()` (Lines 1151-1225)

**Original Location**: Inside `transformListing()` function
**New Location**: `logic/processors/listing/extractListingCoordinates.js`

**Purpose**: Extract lat/lng from JSONB fields with privacy prioritization

**Priority Logic** (NO FALLBACK ✅):
1. **Priority 1**: "Location - slightly different address" (privacy/pin separation)
2. **Priority 2**: "Location - Address" (main address)
3. **No Valid Coordinates**: Return `null` (listings filtered out downstream)

**Key Feature**: Correctly implements NO FALLBACK principle:
```javascript
// BEFORE (SearchPage.jsx:1184)
let coordinates = null  // Returns null if no coordinates

// AFTER (extractListingCoordinates.js)
return null  // ✅ Explicit null for missing data
```

**JSONB Parsing**:
- Handles both native JSONB objects and stringified JSON
- Logs errors for debugging
- Never returns fake/fallback coordinates

---

### ✅ 4. Search Filter Validation Rules

**New Files Created**:

#### `isValidPriceTier.js`
**Valid Options**: 'under-200', '200-350', '350-500', '500-plus', 'all'

#### `isValidWeekPattern.js`
**Valid Options**: 'every-week', 'one-on-off', 'two-on-off', 'one-three-off'

#### `isValidSortOption.js`
**Valid Options**: 'recommended', 'price-low', 'most-viewed', 'recent'

**Purpose**: Validate user input before applying filters to Supabase queries

---

## Logic Core Functions Created

| File | Type | Lines | Purpose |
|------|------|-------|---------|
| `calculateGuestFacingPrice.js` | Calculator | 67 | Calculate guest price with markup/discounts |
| `formatHostName.js` | Processor | 45 | Format host name for privacy |
| `extractListingCoordinates.js` | Processor | 103 | Extract coordinates from JSONB fields |
| `isValidPriceTier.js` | Rule | 28 | Validate price tier filter |
| `isValidWeekPattern.js` | Rule | 28 | Validate week pattern filter |
| `isValidSortOption.js` | Rule | 28 | Validate sort option filter |

**Total**: 6 new Logic Core functions (299 lines)

---

## Index Files Updated

### `logic/calculators/index.js`
```javascript
export { calculateGuestFacingPrice } from './pricing/calculateGuestFacingPrice.js'
```

### `logic/processors/index.js`
```javascript
export { extractListingCoordinates } from './listing/extractListingCoordinates.js'
export { formatHostName } from './display/formatHostName.js'
```

### `logic/rules/index.js`
```javascript
export { isValidPriceTier } from './search/isValidPriceTier.js'
export { isValidWeekPattern } from './search/isValidWeekPattern.js'
export { isValidSortOption } from './search/isValidSortOption.js'
```

---

## Good NO FALLBACK Examples Found

SearchPage.jsx demonstrates **correct NO FALLBACK implementation** in several places:

### ✅ Example 1: Coordinate Filtering (Lines 765-774, 1077-1087)
```javascript
// Filter out listings without valid coordinates (NO FALLBACK)
const listingsWithCoordinates = transformedListings.filter(listing => {
  const hasValidCoords = listing.coordinates && listing.coordinates.lat && listing.coordinates.lng
  if (!hasValidCoords) {
    console.warn('⚠️ Excluding listing without valid coordinates:', {
      id: listing.id,
      title: listing.title
    })
  }
  return hasValidCoords
})
```
**✅ Correct**: Excludes bad data instead of using fake coordinates

### ✅ Example 2: Error Handling (Lines 1126-1128)
```javascript
// Show user-friendly error message (NO FALLBACK - acknowledge the real problem)
setError('We had trouble loading listings. Please try refreshing the page or adjusting your filters.')
```
**✅ Correct**: Shows honest error instead of displaying empty/fake data

### ✅ Example 3: Coordinate Extraction (Lines 1211-1217)
```javascript
if (!coordinates) {
  console.error('❌ Missing coordinates for listing - will be filtered out:', {
    id: dbListing._id,
    name: dbListing.Name
  })
}
```
**✅ Correct**: Logs missing data and allows filtering downstream

---

## Remaining Logic to Extract (Next Phase)

### 🔄 Complex Supabase Query Building (Lines 942-980)
**Should Become**: `logic/workflows/search/buildSearchQueryWorkflow.js`

**Purpose**: Orchestrate filter application to Supabase query
- Borough filter
- Week pattern filter
- Price tier filter
- Neighborhood filter
- Sort option

**Complexity**: 38 lines of conditional query building

### 🔄 Listing Transformation (Lines 1135-1270)
**Current**: 135-line function mixing multiple concerns

**Should Split Into**:
- ✅ `extractListingCoordinates.js` (DONE)
- 🔄 `transformSupabaseToListingDisplay.js` - Thin processor
- 🔄 Use data lookup functions from `dataLookups.js`

### 🔄 Lazy Loading Logic (Lines 1289-1296)
**Decision**: Keep in React hook (UI performance concern, not business logic)

---

## Next Steps

1. ✅ **Create Logic Core functions** - COMPLETED
2. ✅ **Update index files** - COMPLETED
3. 🔄 **Create `useSearchPageLogic` hook** - IN PROGRESS
4. 🔄 **Create search workflow** - Next phase

---

## Fallback Violations Summary

| Location | Violation | Status |
|----------|-----------|--------|
| Line 321 | `\|\| 0` in price lookup | ✅ Fixed in `calculateGuestFacingPrice.js` |
| Line 328 | `\|\| 0` with multiple fallbacks | ✅ Fixed in `calculateGuestFacingPrice.js` |
| Line 270 | `\|\| 'Host'` in name formatting | ✅ Fixed in `formatHostName.js` |

**Total Violations Fixed**: 3

---

## Architecture Compliance

### ✅ Follows "No Fallback" Principle
All Logic Core functions throw explicit errors instead of using silent fallbacks.

### ✅ Named Parameters
All functions use object destructuring for clarity.

### ✅ Intent-Based Documentation
All functions have `@intent` JSDoc tags explaining business purpose.

### ✅ Single Responsibility
Each function has one clear purpose (calculator, rule, or processor).

### ✅ Anti-Corruption Layer
Coordinate extraction protects from JSONB format inconsistencies.

---

## Performance Notes

**Lazy Loading**: SearchPage implements efficient lazy loading:
- Initial load: 20 listings (INITIAL_LOAD_COUNT)
- Batch size: 10 listings (LOAD_BATCH_SIZE)
- Uses IntersectionObserver for scroll detection

**Batch Fetching**: Photos and host data fetched in bulk to reduce database calls.

**Deduplication**: `fetchInProgressRef` prevents duplicate simultaneous fetches.

---

## Testing Recommendations

### Unit Tests Needed (Phase 5)

1. **calculateGuestFacingPrice.js**:
   - Test 5-night price (no discount, 17% markup)
   - Test 7-night price (13% discount + 17% markup)
   - Test edge cases (2 nights, invalid inputs)

2. **formatHostName.js**:
   - Test single name ("John" → "John")
   - Test two names ("John Smith" → "John S.")
   - Test multiple names ("John Q. Public" → "John P.")
   - Test empty string (should throw)

3. **extractListingCoordinates.js**:
   - Test priority 1 (slightly different address)
   - Test priority 2 (main address fallback)
   - Test no coordinates (returns null)
   - Test JSONB string parsing
   - Test invalid JSON (error logging)

4. **Search Validation Rules**:
   - Test valid inputs (should return true)
   - Test invalid inputs (should return false)
   - Test invalid types (should throw)

---

## Summary

SearchPage.jsx had 6 distinct pieces of business logic that have been successfully extracted to Logic Core:

- **1 Calculator**: Guest-facing price calculation
- **2 Processors**: Coordinate extraction, host name formatting
- **3 Rules**: Filter validation (price tier, week pattern, sort option)

All violations of the "No Fallback" principle have been fixed. The component is ready for the next step: creating a logic hook (`useSearchPageLogic.js`) to orchestrate these Logic Core functions.

**Progress**: Phase 3 analysis and extraction complete. Ready for Phase 3 hook creation.
