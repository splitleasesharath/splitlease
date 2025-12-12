# Implementation Plan: Prefill Days Selection in CreateProposalFlowV2 from Search Schedule Selector

## Overview

This plan implements prefilling of the Days Selection section in CreateProposalFlowV2 modal when opened from Search Page or Favorite Listings Page. The modal should automatically populate with days selected in the Search Schedule Selector, calculate pricing for the specific listing, and display the number of nights.

## Success Criteria

- [ ] Days Selection section automatically prefills with days selected in the Search Schedule Selector
- [ ] Pricing calculations run automatically for the specific listing using the prefilled days
- [ ] Number of nights displays correctly (nights = selected days - 1)
- [ ] Check-in and check-out days are calculated from the prefilled selection
- [ ] Section order in CreateProposalFlowV2 is maintained (User Details -> Move-in -> Days -> Review)
- [ ] Works consistently on both Search Page and Favorite Listings Page
- [ ] Existing functionality remains intact when no days are pre-selected

## Context & References

### Relevant Files

| File | Purpose | Changes Needed |
|------|---------|----------------|
| `app/src/islands/pages/SearchPage.jsx` | Search page with schedule selector | Modify `handleOpenCreateProposalModal` to read days from URL and pass to modal |
| `app/src/islands/pages/FavoriteListingsPage/FavoriteListingsPage.jsx` | Favorites page with schedule selector | Modify `handleOpenProposalModal` to pass correct days format (already partially implemented) |
| `app/src/islands/shared/CreateProposalFlowV2.jsx` | Proposal creation modal | No changes needed - already accepts `daysSelected` prop |
| `app/src/islands/shared/CreateProposalFlowV2Components/DaysSelectionSection.jsx` | Days selection step | No changes needed - already uses `data.daysSelected` for initialization |
| `app/src/islands/shared/SearchScheduleSelector.jsx` | Day selector UI on search/favorites pages | Reference only - stores selection in URL `?days-selected=` param |
| `app/src/lib/scheduleSelector/dayHelpers.js` | Day object creation utilities | Reference for `createDay()` function |
| `app/src/lib/scheduleSelector/priceCalculations.js` | Price calculation logic | Reference for pricing calculation |
| `app/src/lib/scheduleSelector/nightCalculations.js` | Nights calculation | Reference for calculating nights from days |

### Related Documentation

- [miniCLAUDE.md](../Documentation/miniCLAUDE.md) - Project architecture overview
- Day Indexing: JavaScript uses 0-6 (Sun=0), Bubble uses 1-7 (Sun=1) - conversion needed at API boundaries

### Existing Patterns to Follow

1. **URL Parameter Storage**: SearchScheduleSelector stores selected days in URL as `?days-selected=2,3,4,5,6` (1-based format)
2. **Day Object Structure**: Day objects use `{ id, dayOfWeek, name, abbreviation, isSelected }` format via `createDay()` helper
3. **FavoriteListingsPage Pattern**: Already implements partial prefilling - reads from URL and creates day objects

## Implementation Steps

### Step 1: Update SearchPage - Read Days from URL and Create Day Objects

**Files:** `app/src/islands/pages/SearchPage.jsx`

**Purpose:** When opening the CreateProposalFlowV2 modal, read the currently selected days from the URL parameter and convert them to day objects.

**Details:**

1. Locate the `handleOpenCreateProposalModal` function (around line 1931)
2. Add logic to read `days-selected` URL parameter at the time of opening the modal
3. Convert 1-based URL values to 0-based day indices
4. Create day objects using the `createDay` helper function
5. Pass the day objects to the `CreateProposalFlowV2` component

**Code Pattern (from FavoriteListingsPage):**
```javascript
// Get default schedule from URL params or use default weekdays
const urlParams = new URLSearchParams(window.location.search);
const daysParam = urlParams.get('days-selected');

let initialDays = [];
if (daysParam) {
  try {
    const oneBased = daysParam.split(',').map(d => parseInt(d.trim(), 10));
    initialDays = oneBased
      .filter(d => d >= 1 && d <= 7)
      .map(d => d - 1)  // Convert to 0-based
      .map(dayIndex => createDay(dayIndex, true));
  } catch (e) {
    console.warn('Failed to parse days from URL:', e);
  }
}

// Default to weekdays (Mon-Fri) if no URL selection
if (initialDays.length === 0) {
  initialDays = [1, 2, 3, 4, 5].map(dayIndex => createDay(dayIndex, true));
}
```

**Validation:** After step, opening Create Proposal modal should log day objects from URL selection.

### Step 2: Update SearchPage - Calculate Nights from Days

**Files:** `app/src/islands/pages/SearchPage.jsx`

**Purpose:** Calculate the number of nights from the selected days to pass to CreateProposalFlowV2.

**Details:**

1. After creating day objects in Step 1, calculate nights count
2. Nights = Number of selected days - 1 (last day is checkout)
3. Store this value to pass to the modal

**Code Pattern:**
```javascript
const nightsSelected = initialDays.length > 0 ? initialDays.length - 1 : 0;
```

**Validation:** Verify nightsSelected is correctly calculated (e.g., 5 days = 4 nights).

### Step 3: Update SearchPage - Pass Days and Nights to CreateProposalFlowV2

**Files:** `app/src/islands/pages/SearchPage.jsx`

**Purpose:** Update the CreateProposalFlowV2 component props to pass the prefilled days and nights.

**Details:**

1. Locate the `<CreateProposalFlowV2>` component rendering (around line 2450)
2. Change `daysSelected={[]}` to use the computed day objects
3. Change `nightsSelected={0}` to use the computed nights count
4. Add state variables to store the selected days and nights between modal opens
5. Ensure the transformListingForProposal function is still used for the listing prop

**Current Code (to modify):**
```jsx
<CreateProposalFlowV2
  listing={transformListingForProposal(selectedListingForProposal)}
  moveInDate=""
  daysSelected={[]}  // <-- Change this
  nightsSelected={0}  // <-- Change this
  reservationSpan={13}
  pricingBreakdown={null}
  zatConfig={zatConfig}
  ...
/>
```

**Target Code:**
```jsx
<CreateProposalFlowV2
  listing={transformListingForProposal(selectedListingForProposal)}
  moveInDate=""
  daysSelected={selectedDayObjects}  // <-- State variable with day objects
  nightsSelected={selectedDayObjects.length > 0 ? selectedDayObjects.length - 1 : 0}
  reservationSpan={13}
  pricingBreakdown={null}
  zatConfig={zatConfig}
  ...
/>
```

**Validation:** Verify CreateProposalFlowV2 receives non-empty daysSelected array when schedule selector has days chosen.

### Step 4: Add State Variable for Selected Days in SearchPage

**Files:** `app/src/islands/pages/SearchPage.jsx`

**Purpose:** Add state to store the day objects computed when opening the modal.

**Details:**

1. Add new state variable near other modal state (around line 1855):
   ```javascript
   const [selectedDayObjectsForProposal, setSelectedDayObjectsForProposal] = useState([]);
   ```
2. Update `handleOpenCreateProposalModal` to set this state
3. Reference this state in the CreateProposalFlowV2 props

**Validation:** State updates correctly when modal opens with selected days.

### Step 5: Update SearchPage - Import createDay Helper

**Files:** `app/src/islands/pages/SearchPage.jsx`

**Purpose:** Import the createDay helper function needed to create day objects.

**Details:**

1. Add import at the top of the file:
   ```javascript
   import { createDay } from '../../lib/scheduleSelector/dayHelpers.js';
   ```

**Validation:** No import errors; function is available in handleOpenCreateProposalModal.

### Step 6: Verify FavoriteListingsPage Implementation

**Files:** `app/src/islands/pages/FavoriteListingsPage/FavoriteListingsPage.jsx`

**Purpose:** Confirm FavoriteListingsPage already implements this pattern correctly.

**Details:**

1. Review `handleOpenProposalModal` function (around line 856)
2. Confirm it reads from URL and creates day objects correctly
3. Confirm it passes day objects to CreateProposalFlowV2

**Current Implementation (already correct):**
```javascript
// Get default schedule from URL params or use default weekdays
const urlParams = new URLSearchParams(window.location.search);
const daysParam = urlParams.get('days-selected');

let initialDays = [];
if (daysParam) {
  try {
    const oneBased = daysParam.split(',').map(d => parseInt(d.trim(), 10));
    initialDays = oneBased
      .filter(d => d >= 1 && d <= 7)
      .map(d => d - 1)
      .map(dayIndex => createDay(dayIndex, true));
  } catch (e) {
    console.warn('Failed to parse days from URL:', e);
  }
}
```

**Validation:** FavoriteListingsPage behavior matches SearchPage after changes.

### Step 7: Test End-to-End Flow

**Purpose:** Verify the complete prefilling flow works correctly.

**Details:**

1. Navigate to Search Page
2. Select specific days in the Search Schedule Selector (e.g., Mon-Wed-Fri)
3. Click "Create Proposal" on a listing card
4. Verify Days Selection section shows the selected days
5. Verify nights count is correct (days - 1)
6. Verify pricing calculation runs for the listing
7. Navigate to Reservation Span section, then to Days Selection - verify prefill persists

**Validation Scenarios:**
- Default selection (Mon-Fri) = 5 days, 4 nights
- Custom selection (Mon-Wed) = 3 days, 2 nights
- Wrap-around selection (Sat-Sun-Mon) = 3 days, 2 nights
- Full week (Sun-Sat) = 7 days, 6 nights

## Edge Cases & Error Handling

1. **No URL parameter present**: Default to Monday-Friday selection (already handled)
2. **Invalid URL parameter values**: Filter out invalid day indices (already handled)
3. **Empty selection after parse**: Fall back to default weekdays (already handled)
4. **Modal closed and reopened**: Should re-read URL parameter each time for fresh data

## Testing Considerations

- Test on Search Page with various day selections
- Test on Favorite Listings Page with various day selections
- Test default behavior when no days are explicitly selected
- Verify pricing calculations match expected values for different night counts
- Test wrap-around day selections (e.g., Sat-Sun-Mon)
- Verify mobile schedule selector works the same as desktop

## Rollback Strategy

If issues arise:
1. Revert to passing `daysSelected={[]}` and `nightsSelected={0}` in SearchPage
2. This restores original behavior where Days Selection starts empty

## Dependencies & Blockers

- None - all required utilities (`createDay`, URL parsing) already exist
- FavoriteListingsPage already implements this pattern successfully

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| URL parsing fails | Low | Low | Default fallback to weekdays implemented |
| Day object format mismatch | Low | Medium | Use existing `createDay` helper for consistency |
| Pricing calculation error | Low | Medium | Existing price calculation code handles edge cases |

---

## Files Referenced Summary

| File Path | Action |
|-----------|--------|
| `app/src/islands/pages/SearchPage.jsx` | **MODIFY** - Add createDay import, update handleOpenCreateProposalModal, add state, update props |
| `app/src/islands/pages/FavoriteListingsPage/FavoriteListingsPage.jsx` | **VERIFY** - Confirm existing implementation is correct |
| `app/src/islands/shared/CreateProposalFlowV2.jsx` | Reference - Already accepts daysSelected/nightsSelected props |
| `app/src/islands/shared/CreateProposalFlowV2Components/DaysSelectionSection.jsx` | Reference - Uses initialSelectedDays from data.daysSelected |
| `app/src/islands/shared/SearchScheduleSelector.jsx` | Reference - URL parameter format |
| `app/src/lib/scheduleSelector/dayHelpers.js` | Reference - createDay function |
| `app/src/lib/scheduleSelector/priceCalculations.js` | Reference - calculatePrice function |
| `app/src/lib/scheduleSelector/nightCalculations.js` | Reference - calculateNightsFromDays function |
