# Implementation Plan: Default Move-In Date Selection Consistency

## Overview

This plan extracts the smart default move-in date selection logic currently used on the ViewSplitLeasePage and applies it consistently to the FavoriteListingsPage and SearchPage Create Proposal flows. The goal is to ensure that when users open the Create Proposal modal, the move-in date is automatically pre-selected to the next available check-in date based on their selected schedule (2+ weeks from today, landing on the first day of their selected weekly pattern).

## Success Criteria

- [ ] Move-in date is automatically pre-populated when the Create Proposal modal opens on FavoriteListingsPage
- [ ] Move-in date is automatically pre-populated when the Create Proposal modal opens on SearchPage
- [ ] The pre-selected date follows the same logic as ViewSplitLeasePage:
  - Minimum 2 weeks from today
  - Falls on the first day of the selected weekly schedule
- [ ] The existing `calculateNextAvailableCheckIn` function is reused (no duplicate logic)
- [ ] Users can still modify the pre-selected move-in date if desired

## Context & References

### Relevant Files

| File | Purpose | Changes Needed |
|------|---------|----------------|
| `app/src/logic/calculators/scheduling/calculateNextAvailableCheckIn.js` | Calculator function for smart move-in date | **No changes** - Reuse existing function |
| `app/src/islands/pages/useViewSplitLeasePageLogic.js` | ViewSplitLeasePage logic hook - **Reference implementation** | **No changes** - Reference only |
| `app/src/islands/pages/FavoriteListingsPage/FavoriteListingsPage.jsx` | FavoriteListingsPage component with inline proposal modal | Update `handleOpenProposalModal` to use `calculateNextAvailableCheckIn` |
| `app/src/islands/pages/SearchPage.jsx` | SearchPage component with inline proposal modal | Update `handleOpenCreateProposalModal` to use `calculateNextAvailableCheckIn` |
| `app/src/islands/shared/CreateProposalFlowV2.jsx` | Shared proposal flow component | **No changes** - Already receives `moveInDate` prop |
| `app/src/islands/shared/CreateProposalFlowV2Components/MoveInSection.jsx` | Move-in date input section | **No changes** - Already displays pre-populated value |

### Related Documentation

- `app/src/islands/pages/CLAUDE.md` - Pages architecture documentation
- `app/src/logic/calculators/scheduling/calculateNextAvailableCheckIn.js` - Function documentation

### Existing Patterns to Follow

#### Pattern 1: Smart Move-In Date Calculation (ViewSplitLeasePage)

Located in `useViewSplitLeasePageLogic.js` lines 66-93 and 192-208:

```javascript
// Calculate minimum move-in date (2 weeks from today)
const minMoveInDate = useMemo(() => {
  const today = new Date()
  const twoWeeksFromNow = new Date(today)
  twoWeeksFromNow.setDate(today.getDate() + 14)
  return twoWeeksFromNow.toISOString().split('T')[0]
}, [])

// Calculate smart default move-in date using Logic Core
const smartMoveInDate = useMemo(() => {
  if (!selectedDayIndices || selectedDayIndices.length === 0) {
    return minMoveInDate
  }

  try {
    return calculateNextAvailableCheckIn({
      selectedDayIndices,
      minDate: minMoveInDate
    })
  } catch (err) {
    console.error('Error calculating smart move-in date:', err)
    return minMoveInDate
  }
}, [selectedDayIndices, minMoveInDate])
```

And when days are selected:

```javascript
// Automatically set smart default move-in date when days are selected
if (dayIndices.length > 0) {
  const smartDate = calculateNextAvailableCheckIn({
    selectedDayIndices: dayIndices,
    minDate: minMoveInDate
  })
  setMoveInDate(smartDate)
}
```

#### Pattern 2: Current FavoriteListingsPage Manual Calculation (To Be Replaced)

Located in `FavoriteListingsPage.jsx` lines 879-892 (inline calculation that should use the shared function):

```javascript
// Calculate default move-in date (2 weeks from now on the first selected day)
const today = new Date();
const twoWeeksFromNow = new Date(today);
twoWeeksFromNow.setDate(today.getDate() + 14);

// Find the next occurrence of the first selected day after 2 weeks
const firstSelectedDay = initialDays[0]?.dayOfWeek ?? 1;
while (twoWeeksFromNow.getDay() !== firstSelectedDay) {
  twoWeeksFromNow.setDate(twoWeeksFromNow.getDate() + 1);
}
```

#### Pattern 3: SearchPage Missing Move-In Date Calculation

Located in `SearchPage.jsx` lines 1923-1948:

```javascript
// Currently sets moveInDate to empty string
setIsCreateProposalModalOpen(true);
// ...
<CreateProposalFlowV2
  // ...
  moveInDate=""  // <-- This should be calculated using calculateNextAvailableCheckIn
  // ...
/>
```

## Implementation Steps

### Step 1: Update FavoriteListingsPage to Use Shared Calculator

**Files:** `app/src/islands/pages/FavoriteListingsPage/FavoriteListingsPage.jsx`

**Purpose:** Replace inline move-in date calculation with the shared `calculateNextAvailableCheckIn` function for consistency and maintainability.

**Details:**

1. Add import for `calculateNextAvailableCheckIn`:
   ```javascript
   import { calculateNextAvailableCheckIn } from '../../../logic/calculators/scheduling/calculateNextAvailableCheckIn.js';
   ```

2. Update the `handleOpenProposalModal` function (around line 856-896):
   - Replace the manual while-loop calculation with a call to `calculateNextAvailableCheckIn`
   - Keep the fallback to minMoveInDate if no days are selected

**Before (lines 879-892):**
```javascript
// Calculate default move-in date (2 weeks from now on the first selected day)
const today = new Date();
const twoWeeksFromNow = new Date(today);
twoWeeksFromNow.setDate(today.getDate() + 14);

// Find the next occurrence of the first selected day after 2 weeks
const firstSelectedDay = initialDays[0]?.dayOfWeek ?? 1;
while (twoWeeksFromNow.getDay() !== firstSelectedDay) {
  twoWeeksFromNow.setDate(twoWeeksFromNow.getDate() + 1);
}

setSelectedListingForProposal(listing);
setSelectedDayObjects(initialDays);
setMoveInDate(twoWeeksFromNow.toISOString().split('T')[0]);
```

**After:**
```javascript
// Calculate minimum move-in date (2 weeks from today)
const today = new Date();
const twoWeeksFromNow = new Date(today);
twoWeeksFromNow.setDate(today.getDate() + 14);
const minMoveInDate = twoWeeksFromNow.toISOString().split('T')[0];

// Calculate smart default move-in date using shared calculator
let smartMoveInDate = minMoveInDate;
if (initialDays.length > 0) {
  try {
    const selectedDayIndices = initialDays.map(d => d.dayOfWeek);
    smartMoveInDate = calculateNextAvailableCheckIn({
      selectedDayIndices,
      minDate: minMoveInDate
    });
  } catch (err) {
    console.error('Error calculating smart move-in date:', err);
    smartMoveInDate = minMoveInDate;
  }
}

setSelectedListingForProposal(listing);
setSelectedDayObjects(initialDays);
setMoveInDate(smartMoveInDate);
```

**Validation:**
- Open the FavoriteListingsPage
- Click "Create Proposal" on any listing
- Verify the move-in date input is pre-populated with a date that is:
  - At least 2 weeks from today
  - On the first day of the selected weekly schedule

### Step 2: Update SearchPage to Calculate Default Move-In Date

**Files:** `app/src/islands/pages/SearchPage.jsx`

**Purpose:** Add smart default move-in date calculation to the SearchPage Create Proposal flow (currently passes empty string).

**Details:**

1. Add import for `calculateNextAvailableCheckIn` (near line 11):
   ```javascript
   import { calculateNextAvailableCheckIn } from '../../logic/calculators/scheduling/calculateNextAvailableCheckIn.js';
   ```

2. Add state for storing the calculated move-in date (near line 847):
   ```javascript
   const [moveInDateForProposal, setMoveInDateForProposal] = useState('');
   ```

3. Update the `handleOpenCreateProposalModal` function (around line 1923-1948):
   - Add move-in date calculation logic
   - Set the calculated date in state

**Before (lines 1923-1948):**
```javascript
const handleOpenCreateProposalModal = (listing) => {
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

  // Default to weekdays (Mon-Fri) if no URL selection
  if (initialDays.length === 0) {
    initialDays = [1, 2, 3, 4, 5].map(dayIndex => createDay(dayIndex, true));
  }

  setSelectedListingForProposal(listing);
  setSelectedDayObjectsForProposal(initialDays);
  setIsCreateProposalModalOpen(true);
};
```

**After:**
```javascript
const handleOpenCreateProposalModal = (listing) => {
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

  // Default to weekdays (Mon-Fri) if no URL selection
  if (initialDays.length === 0) {
    initialDays = [1, 2, 3, 4, 5].map(dayIndex => createDay(dayIndex, true));
  }

  // Calculate minimum move-in date (2 weeks from today)
  const today = new Date();
  const twoWeeksFromNow = new Date(today);
  twoWeeksFromNow.setDate(today.getDate() + 14);
  const minMoveInDate = twoWeeksFromNow.toISOString().split('T')[0];

  // Calculate smart default move-in date using shared calculator
  let smartMoveInDate = minMoveInDate;
  if (initialDays.length > 0) {
    try {
      const selectedDayIndices = initialDays.map(d => d.dayOfWeek);
      smartMoveInDate = calculateNextAvailableCheckIn({
        selectedDayIndices,
        minDate: minMoveInDate
      });
    } catch (err) {
      console.error('Error calculating smart move-in date:', err);
      smartMoveInDate = minMoveInDate;
    }
  }

  setSelectedListingForProposal(listing);
  setSelectedDayObjectsForProposal(initialDays);
  setMoveInDateForProposal(smartMoveInDate);
  setIsCreateProposalModalOpen(true);
};
```

4. Update the `CreateProposalFlowV2` component invocation (around line 2464-2484):

**Before:**
```javascript
<CreateProposalFlowV2
  listing={transformListingForProposal(selectedListingForProposal)}
  moveInDate=""
  // ...
/>
```

**After:**
```javascript
<CreateProposalFlowV2
  listing={transformListingForProposal(selectedListingForProposal)}
  moveInDate={moveInDateForProposal}
  // ...
/>
```

**Validation:**
- Log in as a guest user with at least 1 existing proposal
- Navigate to the SearchPage
- Click "New Proposal" on any listing card
- Verify the move-in date input in the MoveInSection is pre-populated with a date that is:
  - At least 2 weeks from today
  - On the first day of the selected weekly schedule

### Step 3: Verify CreateProposalFlowV2 Handles Pre-Populated Date

**Files:** `app/src/islands/shared/CreateProposalFlowV2.jsx`

**Purpose:** Verify no changes are needed - the component already receives and uses the `moveInDate` prop.

**Details:**

The `CreateProposalFlowV2` component already handles the `moveInDate` prop correctly:

- Line 127-128: Receives `moveInDate` as a prop
- Line 308: Initializes `proposalData.moveInDate` from the prop: `moveInDate: moveInDate || ''`
- Line 627-632: Passes the data to `MoveInSection` which displays it in the date input

**No code changes needed for this file.**

**Validation:**
- This step is verification only
- Confirm that passing a non-empty `moveInDate` prop results in the date input being pre-populated

## Edge Cases & Error Handling

1. **No days selected**: Falls back to minimum move-in date (2 weeks from today)
2. **Invalid day indices**: The `calculateNextAvailableCheckIn` function will throw an error - catch and fall back to minMoveInDate
3. **URL parameter parsing fails**: Falls back to default weekdays (Mon-Fri)
4. **Empty initial days array**: Falls back to minMoveInDate

## Testing Considerations

### Manual Testing Checklist

1. **FavoriteListingsPage:**
   - [ ] Open Create Proposal modal with default days (Mon-Fri from URL or default)
   - [ ] Verify move-in date is pre-populated
   - [ ] Verify date is at least 2 weeks from today
   - [ ] Verify date falls on the first day of the selected schedule (Monday for Mon-Fri)
   - [ ] Change days in URL parameter (e.g., `?days-selected=4,5,6,7`) and verify date updates accordingly (should land on Wednesday)

2. **SearchPage:**
   - [ ] Log in as guest with 1+ proposals to see "New Proposal" button
   - [ ] Open Create Proposal modal from a listing card
   - [ ] Verify move-in date is pre-populated in the MoveInSection
   - [ ] Verify date follows same rules as FavoriteListingsPage

3. **ViewSplitLeasePage (Baseline - No Changes):**
   - [ ] Verify existing behavior still works correctly
   - [ ] Select days and confirm move-in date auto-updates

### Edge Case Testing

- [ ] Test with days-selected spanning Sunday (e.g., Sat-Sun-Mon)
- [ ] Test with single day selected
- [ ] Test with all 7 days selected
- [ ] Test when today is already the first selected day (should still be 2+ weeks out)

## Rollback Strategy

1. Revert the import statement in FavoriteListingsPage
2. Revert `handleOpenProposalModal` to use inline calculation
3. Revert the import and state changes in SearchPage
4. Revert `handleOpenCreateProposalModal` to not calculate move-in date
5. Revert `CreateProposalFlowV2` invocation to pass empty `moveInDate`

## Dependencies & Blockers

- None identified. The `calculateNextAvailableCheckIn` function already exists and is well-tested.

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Calculator function throws unexpected error | Low | Medium | Wrap in try-catch with fallback to minMoveInDate |
| Time zone issues with date calculations | Low | Low | Using ISO date strings consistently |
| Regression in ViewSplitLeasePage behavior | Very Low | Medium | No changes to ViewSplitLeasePage code |

---

## Files Referenced Summary

### Files to Modify

1. **`app/src/islands/pages/FavoriteListingsPage/FavoriteListingsPage.jsx`**
   - Add import for `calculateNextAvailableCheckIn`
   - Update `handleOpenProposalModal` function

2. **`app/src/islands/pages/SearchPage.jsx`**
   - Add import for `calculateNextAvailableCheckIn`
   - Add state `moveInDateForProposal`
   - Update `handleOpenCreateProposalModal` function
   - Update `CreateProposalFlowV2` component invocation

### Files to Reference (No Changes)

1. **`app/src/logic/calculators/scheduling/calculateNextAvailableCheckIn.js`** - Shared calculator function
2. **`app/src/islands/pages/useViewSplitLeasePageLogic.js`** - Reference implementation
3. **`app/src/islands/shared/CreateProposalFlowV2.jsx`** - Receives moveInDate prop
4. **`app/src/islands/shared/CreateProposalFlowV2Components/MoveInSection.jsx`** - Displays moveInDate

---

**Plan Version:** 1.0
**Created:** 2025-12-12
**Author:** Claude Code
