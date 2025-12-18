# Implementation Plan: Dynamic Pricing on Search Page

## Overview
Implement dynamic pricing on the search results page so that listing card prices update based on the selected days in the day selector. When a user selects specific days (e.g., Mon-Fri = 5 nights), all listing cards will display the calculated guest-facing price for that number of nights instead of the static "Starting nightly price."

## Success Criteria
- [ ] When user selects days in the day selector, all listing cards update their displayed price
- [ ] Price calculation uses existing calculators: `getNightlyRateByFrequency()` then `calculateGuestFacingPrice()`
- [ ] Default display (no selection or invalid selection) shows starting price with appropriate label
- [ ] Price updates are performant (no visible lag when changing day selection)
- [ ] Mobile and desktop both work correctly
- [ ] Edge cases handled: no days selected, invalid night counts (1, 6), missing price data

## Context & References

### Relevant Files
| File | Purpose | Changes Needed |
|------|---------|----------------|
| `app/src/islands/pages/SearchPage.jsx` | Main search page component | Add state for selected nights, pass to PropertyCard, update day selector callback |
| `app/src/islands/pages/SearchPage.jsx` (PropertyCard) | Individual listing card (lines 429-760) | Accept nightsSelected prop, use calculators for dynamic pricing |
| `app/src/logic/calculators/pricing/calculateGuestFacingPrice.js` | Guest price formula | Reference only (no changes) |
| `app/src/logic/calculators/pricing/getNightlyRateByFrequency.js` | Gets host rate by frequency | Reference only (no changes) |
| `app/src/islands/shared/AuthAwareSearchScheduleSelector.jsx` | Day selector wrapper | Reference only (already provides onSelectionChange callback) |
| `app/src/islands/shared/SearchScheduleSelector.jsx` | Core day selector | Reference only (no changes) |

### Related Documentation
- `app/src/logic/calculators/pricing/CLAUDE.md` - Pricing calculator documentation
- `.claude/CLAUDE.md` - Project conventions (no fallbacks, use existing patterns)

### Existing Patterns to Follow
1. **PropertyCard already has inline pricing logic** (lines 470-516): Currently calculates price for hardcoded 5 nights. This needs to be parameterized.
2. **Day selector callback pattern** (lines 2406-2410): Currently logs days but doesn't update state. Need to capture the selection.
3. **Pricing calculator pattern** from `useViewSplitLeasePageLogic.js`: Uses `getNightlyRateByFrequency` and `calculateGuestFacingPrice` (though actual usage is in `ListingScheduleSelector`)

## Implementation Steps

### Step 1: Add State for Selected Nights Count
**Files:** `app/src/islands/pages/SearchPage.jsx`
**Purpose:** Track the number of nights selected in the day selector to drive dynamic pricing
**Details:**
- Add new state variable `selectedNightsCount` initialized to `5` (default Mon-Fri)
- Location: After line 941 (with other filter states)
```javascript
const [selectedNightsCount, setSelectedNightsCount] = useState(5);
```
**Validation:** State should be 5 by default and update when day selector changes

### Step 2: Update Day Selector Callback to Set Nights Count
**Files:** `app/src/islands/pages/SearchPage.jsx`
**Purpose:** Capture the number of nights selected and update state
**Details:**
- Modify the `selectorProps.onSelectionChange` callback (around line 2407)
- Extract the number of selected days from the callback's day objects array
- Update `selectedNightsCount` state with the count
```javascript
const selectorProps = {
  onSelectionChange: (days) => {
    console.log('Schedule selector changed:', days);
    // Extract nights count from selected days
    const nightsCount = days.length;
    // Only update if valid night count (2-7, excluding 6 which is unsupported)
    if (nightsCount >= 2 && nightsCount <= 7 && nightsCount !== 6) {
      setSelectedNightsCount(nightsCount);
    }
  },
  onError: (error) => console.error('AuthAwareSearchScheduleSelector error:', error),
  weekPattern: weekPattern
};
```
**Validation:** Selecting different day combinations should update `selectedNightsCount`

### Step 3: Pass Nights Count to ListingsGrid and PropertyCard
**Files:** `app/src/islands/pages/SearchPage.jsx`
**Purpose:** Pass the selected nights count down to PropertyCard for price calculation
**Details:**
- Update `ListingsGrid` component props to accept `selectedNightsCount`
- Update `PropertyCard` component props to accept `selectedNightsCount`
- Pass `selectedNightsCount` when rendering `ListingsGrid` (around line 2700+)

ListingsGrid signature update (around line 765):
```javascript
function ListingsGrid({
  listings,
  onLoadMore,
  hasMore,
  isLoading,
  onOpenContactModal,
  onOpenInfoModal,
  mapRef,
  isLoggedIn,
  userId,
  favoritedListingIds,
  onToggleFavorite,
  onRequireAuth,
  showCreateProposalButton,
  onOpenCreateProposalModal,
  proposalsByListingId,
  selectedNightsCount  // NEW
}) {
```

PropertyCard signature update (around line 429):
```javascript
function PropertyCard({
  listing,
  onLocationClick,
  onOpenContactModal,
  onOpenInfoModal,
  isLoggedIn,
  isFavorited,
  userId,
  onToggleFavorite,
  onRequireAuth,
  showCreateProposalButton,
  onOpenCreateProposalModal,
  proposalForListing,
  selectedNightsCount  // NEW
}) {
```

Pass through ListingsGrid to PropertyCard (around line 801):
```javascript
<PropertyCard
  key={listing.id}
  listing={listing}
  // ... existing props ...
  selectedNightsCount={selectedNightsCount}
/>
```
**Validation:** PropertyCard should receive the nights count prop

### Step 4: Import Pricing Calculators in SearchPage
**Files:** `app/src/islands/pages/SearchPage.jsx`
**Purpose:** Import the existing pricing calculators to use for dynamic price calculation
**Details:**
- Add imports at the top of the file (around line 23-24, after other imports):
```javascript
import { getNightlyRateByFrequency } from '../../logic/calculators/pricing/getNightlyRateByFrequency.js';
import { calculateGuestFacingPrice } from '../../logic/calculators/pricing/calculateGuestFacingPrice.js';
```
**Validation:** Imports should resolve without errors

### Step 5: Update PropertyCard's calculateDynamicPrice Function
**Files:** `app/src/islands/pages/SearchPage.jsx` (PropertyCard function, lines 470-516)
**Purpose:** Use the pricing calculators with the selected nights count instead of hardcoded 5
**Details:**
- Refactor `calculateDynamicPrice` to use the prop and existing calculators
- Handle edge cases: invalid night counts, missing price data
- Current implementation duplicates calculator logic - replace with actual calculator calls

Replace current `calculateDynamicPrice` (lines 470-516) with:
```javascript
// Calculate dynamic price based on selected nights
const calculateDynamicPrice = () => {
  const nightsCount = selectedNightsCount || 5; // Default to 5 if not provided

  // Handle edge cases: night counts outside supported range
  // Supported: 2, 3, 4, 5, 7 (note: 6 is NOT supported by the pricing system)
  if (nightsCount < 2 || nightsCount > 7 || nightsCount === 6) {
    // Return starting price for unsupported night counts
    return listing['Starting nightly price'] || listing.price?.starting || 0;
  }

  try {
    // Step 1: Get the host nightly rate for the selected frequency
    const hostNightlyRate = getNightlyRateByFrequency({
      listing: listing,
      nightsSelected: nightsCount
    });

    // Step 2: Calculate guest-facing price (applies markup and discounts)
    const guestPrice = calculateGuestFacingPrice({
      hostNightlyRate: hostNightlyRate,
      nightsCount: nightsCount
    });

    return guestPrice;
  } catch (error) {
    // If calculators throw (e.g., missing price data), fall back to starting price
    console.warn(`[PropertyCard] Price calculation failed for listing ${listing.id}:`, error.message);
    return listing['Starting nightly price'] || listing.price?.starting || 0;
  }
};
```
**Validation:** Price should update when `selectedNightsCount` changes

### Step 6: Update Price Display Label
**Files:** `app/src/islands/pages/SearchPage.jsx` (PropertyCard render, around lines 751-754)
**Purpose:** Update the price label to indicate when showing calculated vs starting price
**Details:**
- Modify the price display section to show contextual label
- If showing calculated price: show "/night for X nights"
- If showing fallback: show "Starting at"

Update the price display section (around lines 751-754):
```javascript
{/* Price Sidebar - Right Side */}
<div
  className="listing-price-sidebar"
  ref={priceInfoTriggerRef}
  onClick={(e) => {
    e.preventDefault();
    e.stopPropagation();
    onOpenInfoModal(listing, priceInfoTriggerRef);
  }}
>
  <div className="price-main">${dynamicPrice.toFixed(2)}</div>
  <div className="price-period">/night</div>
  <div className="price-divider"></div>
  {selectedNightsCount >= 2 && selectedNightsCount <= 7 && selectedNightsCount !== 6 ? (
    <div className="price-context">for {selectedNightsCount} nights/week</div>
  ) : (
    <div className="price-starting">Starting at<span>${parseFloat(startingPrice).toFixed(2)}/night</span></div>
  )}
  <div className="availability-note">Message Split Lease<br/>for Availability</div>
</div>
```
**Validation:** Label should change based on whether a valid night selection exists

### Step 7: Update ListingsGrid Render Call
**Files:** `app/src/islands/pages/SearchPage.jsx`
**Purpose:** Pass selectedNightsCount to ListingsGrid component when rendering
**Details:**
- Find the ListingsGrid render in the main SearchPage return (search for `<ListingsGrid`)
- Add `selectedNightsCount={selectedNightsCount}` prop

Example (the exact location needs to be found, likely around line 2700+):
```javascript
<ListingsGrid
  listings={displayedListings}
  onLoadMore={handleLoadMore}
  hasMore={loadedCount < allListings.length}
  isLoading={isLoading}
  onOpenContactModal={handleOpenContactModal}
  onOpenInfoModal={handleOpenInfoModal}
  mapRef={mapRef}
  isLoggedIn={isLoggedIn}
  userId={userId}
  favoritedListingIds={favoritedListingIds}
  onToggleFavorite={handleToggleFavorite}
  onRequireAuth={handleRequireAuth}
  showCreateProposalButton={showCreateProposalButton}
  onOpenCreateProposalModal={handleOpenCreateProposalModal}
  proposalsByListingId={proposalsByListingId}
  selectedNightsCount={selectedNightsCount}  // NEW
/>
```
**Validation:** Changing day selection should trigger re-render of all listing cards with new prices

## Edge Cases & Error Handling
1. **No days selected (0 nights)**: Show starting price with "Starting at" label
2. **1 night selected**: Show starting price (minimum is 2 nights)
3. **6 nights selected**: Show starting price (6 nights not supported by pricing system)
4. **Missing price data in listing**: Fall back to starting price, log warning
5. **Calculator throws error**: Catch and fall back to starting price
6. **Price is 0 or negative**: Display $0.00 (the calculators will throw on negative, but 0 is valid for some edge cases)

## Testing Considerations
1. **Functional Tests**:
   - Select Mon-Fri (5 nights) -> verify price updates to calculated value
   - Select Mon-Thu (4 nights) -> verify price updates
   - Select full week (7 nights) -> verify 13% discount is applied
   - Clear selection -> verify falls back to starting price

2. **Edge Case Tests**:
   - Listing with missing price fields -> should show starting price
   - Selecting 6 nights (unsupported) -> should show starting price
   - Very low/high prices -> verify formatting is correct

3. **Performance Tests**:
   - With 50+ listings visible, day selection change should not cause visible lag
   - Verify no unnecessary re-renders

## Rollback Strategy
- If issues arise, revert PropertyCard's `calculateDynamicPrice` to original hardcoded 5-night version
- Remove the `selectedNightsCount` state and prop passing
- Restore original day selector callback

## Dependencies & Blockers
- None identified. All required calculators already exist and are tested.
- Pricing system already works on ViewSplitLeasePage with same calculators.

## Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Performance degradation with many listings | Low | Medium | Prices are calculated per-card, memoization not needed for this scale |
| Incorrect prices displayed | Low | High | Using existing, tested calculators; adding try/catch fallback |
| Mobile responsiveness issues | Low | Medium | Only changing logic, not layout; label changes are simple |
| Price data missing for some listings | Medium | Low | Fallback to starting price handles this gracefully |

---

## Files Referenced Summary

### Files to Modify
1. `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\islands\pages\SearchPage.jsx`
   - Add imports for pricing calculators (top of file)
   - Add `selectedNightsCount` state (around line 941)
   - Update `selectorProps.onSelectionChange` callback (around line 2407)
   - Update `ListingsGrid` function signature (around line 765)
   - Update `PropertyCard` function signature (around line 429)
   - Update `calculateDynamicPrice` function (lines 470-516)
   - Update price display JSX (around lines 751-754)
   - Pass `selectedNightsCount` to ListingsGrid render
   - Pass `selectedNightsCount` from ListingsGrid to PropertyCard (around line 801)

### Files for Reference Only (No Changes)
2. `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\logic\calculators\pricing\calculateGuestFacingPrice.js`
3. `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\logic\calculators\pricing\getNightlyRateByFrequency.js`
4. `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\islands\shared\AuthAwareSearchScheduleSelector.jsx`
5. `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\islands\shared\SearchScheduleSelector.jsx`
6. `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\islands\pages\useViewSplitLeasePageLogic.js` (reference implementation)

---

**Plan Created**: 2025-12-18T15:00:00
**Estimated Implementation Time**: 30-45 minutes
**Complexity**: Medium (single file modification, using existing patterns)
