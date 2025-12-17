# Cleanup Plan: Consolidate Wrap-Around Day Logic

**Created**: 2025-12-17 15:00:00
**Type**: CLEANUP
**Priority**: Medium
**Status**: Ready for execution

---

## Problem Statement

The wrap-around day selection logic (detecting when a selection spans Saturday→Sunday) is duplicated in **4 different locations**:

1. `ViewSplitLeasePage.jsx` (lines 1145-1193)
2. `SearchPage.jsx` (lines 2114-2156) — just fixed
3. `FavoriteListingsPage.jsx` (lines 975-1017) — just fixed
4. `CreateProposalFlowV2.jsx` (lines 249-290)
5. `DaysSelectionSection.jsx` (lines 58-99)

This violates DRY (Don't Repeat Yourself) and creates maintenance burden — when the logic needs to change, it must be updated in all locations.

---

## Proposed Solution

### Create a Shared Utility Function

**File**: `app/src/lib/dayUtils.js` (already exists, add to it)

```javascript
/**
 * Calculates check-in day, check-out day, and nights from selected days.
 * Handles wrap-around weeks (e.g., Fri-Sat-Sun where Sunday is day 0).
 *
 * @param {number[]} selectedDays - Array of day indices (0=Sunday, 6=Saturday)
 * @returns {{ checkInDay: number, checkOutDay: number, nightsSelected: number[] }}
 */
export function calculateCheckInCheckOutFromDays(selectedDays) {
  if (!selectedDays || selectedDays.length === 0) {
    return { checkInDay: null, checkOutDay: null, nightsSelected: [] };
  }

  // Sort days numerically first
  const sortedDays = [...selectedDays].sort((a, b) => a - b);

  // Check for wrap-around case (both Saturday=6 and Sunday=0 present, but not all 7 days)
  const hasSaturday = sortedDays.includes(6);
  const hasSunday = sortedDays.includes(0);
  const isWrapAround = hasSaturday && hasSunday && selectedDays.length < 7;

  let checkInDay, checkOutDay, nightsSelected;

  if (isWrapAround) {
    // Find the gap in the sorted selection to determine wrap-around point
    let gapIndex = -1;
    for (let i = 0; i < sortedDays.length - 1; i++) {
      if (sortedDays[i + 1] - sortedDays[i] > 1) {
        gapIndex = i + 1;
        break;
      }
    }

    if (gapIndex !== -1) {
      // Wrap-around: check-in is the first day after the gap, check-out is the last day before gap
      checkInDay = sortedDays[gapIndex];
      checkOutDay = sortedDays[gapIndex - 1];

      // Reorder days to be in actual sequence (check-in to check-out)
      const reorderedDays = [...sortedDays.slice(gapIndex), ...sortedDays.slice(0, gapIndex)];

      // Nights = all days except the last one (checkout day)
      nightsSelected = reorderedDays.slice(0, -1);
    } else {
      // No gap found, use standard logic
      checkInDay = sortedDays[0];
      checkOutDay = sortedDays[sortedDays.length - 1];
      nightsSelected = sortedDays.slice(0, -1);
    }
  } else {
    // Standard case: check-in = first day, check-out = last day
    checkInDay = sortedDays[0];
    checkOutDay = sortedDays[sortedDays.length - 1];
    // Nights = all days except the last one (checkout day)
    nightsSelected = sortedDays.slice(0, -1);
  }

  return { checkInDay, checkOutDay, nightsSelected };
}
```

---

## Implementation Steps

### Step 1: Add Utility Function to dayUtils.js

- [ ] Add `calculateCheckInCheckOutFromDays()` to `app/src/lib/dayUtils.js`
- [ ] Add JSDoc documentation
- [ ] Add unit tests in `app/src/lib/__tests__/dayUtils.test.js`

### Step 2: Refactor ViewSplitLeasePage.jsx

- [ ] Import `calculateCheckInCheckOutFromDays` from `lib/dayUtils`
- [ ] Replace lines 1145-1193 with:
  ```javascript
  const daysInJsFormat = proposalData.daysSelectedObjects?.map(d => d.dayOfWeek) || selectedDays;
  const { checkInDay, checkOutDay, nightsSelected } = calculateCheckInCheckOutFromDays(daysInJsFormat);
  ```

### Step 3: Refactor SearchPage.jsx

- [ ] Import `calculateCheckInCheckOutFromDays` from `lib/dayUtils`
- [ ] Replace lines 2114-2156 with the utility call

### Step 4: Refactor FavoriteListingsPage.jsx

- [ ] Import `calculateCheckInCheckOutFromDays` from `lib/dayUtils`
- [ ] Replace lines 975-1017 with the utility call

### Step 5: Refactor CreateProposalFlowV2.jsx

- [ ] Import `calculateCheckInCheckOutFromDays` from `lib/dayUtils`
- [ ] Replace lines 249-290 with the utility call

### Step 6: Refactor DaysSelectionSection.jsx

- [ ] Import `calculateCheckInCheckOutFromDays` from `lib/dayUtils`
- [ ] Replace lines 58-99 with the utility call

---

## Test Cases for Unit Tests

```javascript
describe('calculateCheckInCheckOutFromDays', () => {
  // Standard consecutive days
  test('Mon-Fri returns Mon check-in, Fri check-out', () => {
    expect(calculateCheckInCheckOutFromDays([1, 2, 3, 4, 5]))
      .toEqual({ checkInDay: 1, checkOutDay: 5, nightsSelected: [1, 2, 3, 4] });
  });

  // Wrap-around: Fri-Sat-Sun
  test('Fri-Sat-Sun returns Fri check-in, Sun check-out', () => {
    expect(calculateCheckInCheckOutFromDays([5, 6, 0]))
      .toEqual({ checkInDay: 5, checkOutDay: 0, nightsSelected: [5, 6] });
  });

  // Wrap-around: Wed-Thu-Fri-Sat-Sun
  test('Wed-Sun returns Wed check-in, Sun check-out', () => {
    expect(calculateCheckInCheckOutFromDays([3, 4, 5, 6, 0]))
      .toEqual({ checkInDay: 3, checkOutDay: 0, nightsSelected: [3, 4, 5, 6] });
  });

  // All 7 days (not wrap-around)
  test('All 7 days returns Sun check-in, Sat check-out', () => {
    expect(calculateCheckInCheckOutFromDays([0, 1, 2, 3, 4, 5, 6]))
      .toEqual({ checkInDay: 0, checkOutDay: 6, nightsSelected: [0, 1, 2, 3, 4, 5] });
  });

  // Single day
  test('Single day returns same day for check-in/check-out', () => {
    expect(calculateCheckInCheckOutFromDays([3]))
      .toEqual({ checkInDay: 3, checkOutDay: 3, nightsSelected: [] });
  });

  // Empty array
  test('Empty array returns nulls', () => {
    expect(calculateCheckInCheckOutFromDays([]))
      .toEqual({ checkInDay: null, checkOutDay: null, nightsSelected: [] });
  });
});
```

---

## Files to Modify

| File | Action | Lines to Replace |
|------|--------|------------------|
| `app/src/lib/dayUtils.js` | Add function | N/A (append) |
| `app/src/islands/pages/ViewSplitLeasePage.jsx` | Refactor | 1145-1193 |
| `app/src/islands/pages/SearchPage.jsx` | Refactor | 2114-2156 |
| `app/src/islands/pages/FavoriteListingsPage/FavoriteListingsPage.jsx` | Refactor | 975-1017 |
| `app/src/islands/shared/CreateProposalFlowV2.jsx` | Refactor | 249-290 |
| `app/src/islands/shared/CreateProposalFlowV2Components/DaysSelectionSection.jsx` | Refactor | 58-99 |

---

## Benefits

1. **Single source of truth**: Logic lives in one place
2. **Easier testing**: Unit test the utility function once
3. **Reduced maintenance**: Fix bugs in one place, not 5
4. **Better readability**: Page components become cleaner

---

## Estimated Effort

- **Utility function + tests**: 30 minutes
- **Refactor 5 components**: 45 minutes
- **Integration testing**: 30 minutes
- **Total**: ~2 hours

---

## Dependencies

- None — this is a pure refactoring task with no external dependencies
