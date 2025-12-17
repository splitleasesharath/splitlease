# Implementation Plan: Pre-populate Move-in and Reservation Span from Last Proposal

## Overview
Implement automatic pre-population of the Move-in date and Reservation Span fields in the CreateProposalFlowV2 component using values from the user's most recently submitted proposal. This enhancement improves UX by reducing repetitive data entry for returning users across both SearchPage and FavoriteListingsPage proposal flows.

## Success Criteria
- [ ] Move-in date pre-populated from user's last proposal (with smart date shifting if past)
- [ ] Reservation span (weeks) pre-populated from user's last proposal
- [ ] Pre-population works on SearchPage proposal creation flow
- [ ] Pre-population works on FavoriteListingsPage proposal creation flow
- [ ] Fallback to current defaults when no previous proposal exists
- [ ] Days of week selection NOT pre-populated (sourced from schedule selector as before)

## Context & References

### Relevant Files

| File | Purpose | Changes Needed |
|------|---------|----------------|
| `app/src/lib/proposalDataFetcher.js` | Fetches proposals by guest ID | Add new function to fetch user's last submitted proposal |
| `app/src/islands/shared/CreateProposalFlowV2.jsx` | Main proposal wizard component | Accept and use lastProposalDefaults prop |
| `app/src/islands/shared/CreateProposalFlowV2Components/MoveInSection.jsx` | Move-in date and reservation span input | No changes (receives data via props) |
| `app/src/islands/pages/SearchPage.jsx` | Search page with proposal modal | Fetch last proposal and pass to CreateProposalFlowV2 |
| `app/src/islands/pages/FavoriteListingsPage/FavoriteListingsPage.jsx` | Favorites page with proposal modal | Fetch last proposal and pass to CreateProposalFlowV2 |
| `app/src/logic/calculators/scheduling/calculateNextAvailableCheckIn.js` | Calculate smart move-in date | Use for date shifting logic |

### Database Schema Context

The `proposal` table contains these relevant fields:
- `Move in range start` (text) - The proposed move-in date
- `Reservation Span (Weeks)` (integer) - Reservation length in weeks
- `Reservation Span` (text) - Human-readable reservation span (e.g., "13 weeks (3 months)")
- `Created Date` (timestamp) - For sorting to find most recent
- `Guest` (text) - User ID for filtering
- `Status` (text) - Proposal status
- `Deleted` (boolean) - Soft delete flag

### Existing Patterns to Follow
- **fetchProposalsByGuest pattern**: Already fetches proposals sorted by `Created Date DESC` - we can derive the "last submitted" from this
- **calculateNextAvailableCheckIn**: Existing calculator for computing a valid check-in date given a minimum date and selected days
- **Prop passing to CreateProposalFlowV2**: Already receives `existingUserData`, `moveInDate`, `reservationSpan` props - we extend this pattern

---

## Implementation Steps

### Step 1: Add Helper Function to Fetch Last Submitted Proposal Defaults

**Files:** `app/src/lib/proposalDataFetcher.js`

**Purpose:** Create a lightweight function that fetches only the fields needed for pre-population from the user's most recent non-deleted proposal.

**Details:**
1. Add new exported function `fetchLastProposalDefaults(userId)`
2. Query `proposal` table for the user's most recent proposal:
   - Filter: `Guest = userId` and `(Deleted IS NULL OR Deleted = false)`
   - Order: `Created Date DESC`
   - Limit: 1
   - Select only: `Move in range start`, `Reservation Span (Weeks)`
3. Return structured object:
   ```javascript
   {
     moveInDate: string | null,      // 'Move in range start' value
     reservationSpanWeeks: number | null  // 'Reservation Span (Weeks)' value
   }
   ```
4. Return null if no previous proposal exists

**Code Pattern:**
```javascript
/**
 * Fetch move-in date and reservation span from user's most recent proposal
 * for pre-populating new proposal creation flows.
 *
 * @param {string} userId - The user's _id
 * @returns {Promise<{moveInDate: string|null, reservationSpanWeeks: number|null}|null>}
 */
export async function fetchLastProposalDefaults(userId) {
  try {
    const { data, error } = await supabase
      .from('proposal')
      .select('"Move in range start", "Reservation Span (Weeks)"')
      .eq('Guest', userId)
      .or('Deleted.is.null,Deleted.eq.false')
      .order('Created Date', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      console.log('No previous proposal found for pre-population');
      return null;
    }

    return {
      moveInDate: data['Move in range start'] || null,
      reservationSpanWeeks: data['Reservation Span (Weeks)'] || null
    };
  } catch (err) {
    console.warn('Error fetching last proposal defaults:', err);
    return null;
  }
}
```

**Validation:** Test with a user who has proposals and one who doesn't.

---

### Step 2: Create Date Shifting Calculator

**Files:** `app/src/logic/calculators/scheduling/shiftMoveInDateIfPast.js` (NEW FILE)

**Purpose:** Calculate a valid future move-in date if the previous proposal's date has passed, using the same day-of-week.

**Details:**
1. Create new calculator following four-layer logic pattern
2. Accept parameters: `{ previousMoveInDate, selectedDayIndices, minDate }`
3. Logic flow:
   - If `previousMoveInDate` is already >= `minDate` (2 weeks from today), return it as-is
   - If `previousMoveInDate` is in the past, calculate next occurrence of the same day-of-week from `minDate`
   - Use existing `calculateNextAvailableCheckIn` for consistency if days are provided
4. Return ISO date string (YYYY-MM-DD)

**Code Pattern:**
```javascript
/**
 * Shift a move-in date forward if it has passed.
 * Preserves the day-of-week from the original date.
 *
 * @param {object} params - Named parameters
 * @param {string} params.previousMoveInDate - Original move-in date (YYYY-MM-DD)
 * @param {Date|string} params.minDate - Minimum allowed date (typically 2 weeks from today)
 * @returns {string} Valid move-in date (YYYY-MM-DD)
 */
export function shiftMoveInDateIfPast({ previousMoveInDate, minDate }) {
  if (!previousMoveInDate) {
    return null;
  }

  const previousDate = new Date(previousMoveInDate);
  const minDateObj = new Date(minDate);

  // Reset time components for date-only comparison
  previousDate.setHours(0, 0, 0, 0);
  minDateObj.setHours(0, 0, 0, 0);

  // If previous date is still valid (>= minDate), use it
  if (previousDate >= minDateObj) {
    return previousMoveInDate.split('T')[0];
  }

  // Date has passed - find next occurrence of same day-of-week
  const targetDayOfWeek = previousDate.getDay();
  const minDayOfWeek = minDateObj.getDay();

  let daysToAdd = (targetDayOfWeek - minDayOfWeek + 7) % 7;
  if (daysToAdd === 0) {
    // Already on the right day
    return minDateObj.toISOString().split('T')[0];
  }

  const shiftedDate = new Date(minDateObj);
  shiftedDate.setDate(minDateObj.getDate() + daysToAdd);

  return shiftedDate.toISOString().split('T')[0];
}
```

**Validation:** Test with dates in past, present, and future; verify day-of-week preservation.

---

### Step 3: Update SearchPage to Fetch and Pass Last Proposal Defaults

**Files:** `app/src/islands/pages/SearchPage.jsx`

**Purpose:** Fetch the user's last proposal defaults during page initialization and pass them to CreateProposalFlowV2.

**Details:**
1. Add import for `fetchLastProposalDefaults` from `lib/proposalDataFetcher.js`
2. Add import for `shiftMoveInDateIfPast` from `logic/calculators/scheduling/shiftMoveInDateIfPast.js`
3. Add state: `const [lastProposalDefaults, setLastProposalDefaults] = useState(null);`
4. In the existing user data fetch (around line 2220-2247 based on context), add:
   ```javascript
   // Fetch last proposal defaults for pre-population
   const proposalDefaults = await fetchLastProposalDefaults(sessionId);
   if (proposalDefaults) {
     setLastProposalDefaults(proposalDefaults);
   }
   ```
5. Update `handleOpenProposalModal` function to use last proposal defaults:
   - If `lastProposalDefaults.moveInDate` exists, call `shiftMoveInDateIfPast` to get valid date
   - If `lastProposalDefaults.reservationSpanWeeks` exists, use it instead of default 13
6. Update CreateProposalFlowV2 invocation to pass computed values:
   ```jsx
   <CreateProposalFlowV2
     // ... existing props ...
     moveInDate={computedMoveInDate}  // Now considers lastProposalDefaults
     reservationSpan={lastProposalDefaults?.reservationSpanWeeks || 13}
     // ... rest ...
   />
   ```

**Key Code Changes in handleOpenProposalModal:**
```javascript
const handleOpenProposalModal = async (listing) => {
  // ... existing day selection code ...

  // Calculate minimum move-in date (2 weeks from today)
  const today = new Date();
  const twoWeeksFromNow = new Date(today);
  twoWeeksFromNow.setDate(today.getDate() + 14);
  const minMoveInDate = twoWeeksFromNow.toISOString().split('T')[0];

  // Determine move-in date: prefer last proposal's date (shifted if needed), fallback to smart calculation
  let smartMoveInDate = minMoveInDate;

  if (lastProposalDefaults?.moveInDate) {
    // Use previous proposal's move-in date, shifted forward if necessary
    smartMoveInDate = shiftMoveInDateIfPast({
      previousMoveInDate: lastProposalDefaults.moveInDate,
      minDate: minMoveInDate
    }) || minMoveInDate;
    console.log('📅 Pre-filling move-in from last proposal:', lastProposalDefaults.moveInDate, '→', smartMoveInDate);
  } else if (initialDays.length > 0) {
    // Fallback: calculate based on selected days
    try {
      const selectedDayIndices = initialDays.map(d => d.dayOfWeek);
      smartMoveInDate = calculateNextAvailableCheckIn({
        selectedDayIndices,
        minDate: minMoveInDate
      });
    } catch (err) {
      console.error('Error calculating smart move-in date:', err);
    }
  }

  // Determine reservation span: prefer last proposal's span, fallback to default
  const prefillReservationSpan = lastProposalDefaults?.reservationSpanWeeks || 13;

  setMoveInDateForProposal(smartMoveInDate);
  setReservationSpanForProposal(prefillReservationSpan);
  // ... rest of modal state setup ...
};
```

**Validation:**
- Log in as user with previous proposals, verify pre-population
- Log in as new user, verify fallback to smart calculation

---

### Step 4: Update FavoriteListingsPage to Fetch and Pass Last Proposal Defaults

**Files:** `app/src/islands/pages/FavoriteListingsPage/FavoriteListingsPage.jsx`

**Purpose:** Same as Step 3, but for FavoriteListingsPage.

**Details:**
1. Add import for `fetchLastProposalDefaults` from `../../../lib/proposalDataFetcher.js`
2. Add import for `shiftMoveInDateIfPast` from `../../../logic/calculators/scheduling/shiftMoveInDateIfPast.js`
3. Add state: `const [lastProposalDefaults, setLastProposalDefaults] = useState(null);`
4. In the `initializePage` function (around line 640-830), after fetching user data, add:
   ```javascript
   // Fetch last proposal defaults for pre-population
   const proposalDefaults = await fetchLastProposalDefaults(sessionId);
   if (proposalDefaults) {
     setLastProposalDefaults(proposalDefaults);
     console.log('📋 Loaded last proposal defaults:', proposalDefaults);
   }
   ```
5. Update `handleOpenProposalModal` function (around line 880-930) to use last proposal defaults:
   - Same logic as SearchPage for date shifting
   - Use `lastProposalDefaults.reservationSpanWeeks` for reservation span
6. Update CreateProposalFlowV2 invocation (around line 1458-1486) to pass computed values

**Key Code Changes in handleOpenProposalModal:**
```javascript
const handleOpenProposalModal = async (listing) => {
  // ... existing day selection code ...

  // Calculate minimum move-in date (2 weeks from today)
  const today = new Date();
  const twoWeeksFromNow = new Date(today);
  twoWeeksFromNow.setDate(today.getDate() + 14);
  const minMoveInDate = twoWeeksFromNow.toISOString().split('T')[0];

  // Determine move-in date: prefer last proposal's date (shifted if needed), fallback to smart calculation
  let smartMoveInDate = minMoveInDate;

  if (lastProposalDefaults?.moveInDate) {
    smartMoveInDate = shiftMoveInDateIfPast({
      previousMoveInDate: lastProposalDefaults.moveInDate,
      minDate: minMoveInDate
    }) || minMoveInDate;
    console.log('📅 Pre-filling move-in from last proposal:', lastProposalDefaults.moveInDate, '→', smartMoveInDate);
  } else if (initialDays.length > 0) {
    try {
      const selectedDayIndices = initialDays.map(d => d.dayOfWeek);
      smartMoveInDate = calculateNextAvailableCheckIn({
        selectedDayIndices,
        minDate: minMoveInDate
      });
    } catch (err) {
      console.error('Error calculating smart move-in date:', err);
    }
  }

  // Determine reservation span: prefer last proposal's span, fallback to default
  const prefillReservationSpan = lastProposalDefaults?.reservationSpanWeeks || 13;

  setMoveInDate(smartMoveInDate);
  setReservationSpan(prefillReservationSpan);
  // ... rest of modal state setup ...
};
```

**Validation:** Same as Step 3.

---

### Step 5: Export New Calculator from Logic Index

**Files:** `app/src/logic/calculators/scheduling/index.js` (if exists) or update barrel exports

**Purpose:** Ensure the new calculator is properly exported for consumption.

**Details:**
1. If `app/src/logic/calculators/scheduling/index.js` exists, add export
2. Otherwise, direct imports are acceptable (already the pattern used)

**Validation:** Import succeeds without errors.

---

## Edge Cases & Error Handling

| Edge Case | Handling |
|-----------|----------|
| User has no previous proposals | Return null from `fetchLastProposalDefaults`, use existing default behavior |
| Previous move-in date is in past | `shiftMoveInDateIfPast` calculates next occurrence of same day-of-week |
| Previous move-in date is still valid | Use as-is without shifting |
| `Reservation Span (Weeks)` is null in DB | Fallback to default of 13 weeks |
| Database query fails | Log warning, return null, use fallback behavior |
| User is not logged in | Don't fetch last proposal (no user ID), use defaults |

## Testing Considerations

### Unit Tests (if test framework exists)
- `shiftMoveInDateIfPast`:
  - Date in past → shifts to next occurrence of same day-of-week
  - Date >= minDate → returns original
  - Null input → returns null
  - Day-of-week preservation across month/year boundaries

### Manual Testing Scenarios
1. **New user (no proposals)**: Should see default move-in calculation (2 weeks out, smart day selection)
2. **Returning user (has proposals)**:
   - Previous move-in date still valid → pre-filled as-is
   - Previous move-in date passed → shifted to next occurrence
   - Previous reservation span → pre-filled
3. **User with deleted proposals only**: Should behave like new user
4. **Both pages**: Verify behavior on SearchPage and FavoriteListingsPage

## Rollback Strategy

1. Revert changes to `SearchPage.jsx` and `FavoriteListingsPage.jsx`
2. Remove `fetchLastProposalDefaults` from `proposalDataFetcher.js`
3. Remove `shiftMoveInDateIfPast.js` calculator file
4. Both pages will fall back to existing smart calculation logic automatically

## Dependencies & Blockers

- None - all dependencies (Supabase client, existing calculators) already in place
- Feature is additive - no breaking changes to existing flows

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Database query performance | Low | Low | Single row query with index on Guest column |
| Date shifting logic edge cases | Medium | Low | Comprehensive edge case handling, fallback to defaults |
| UX confusion if shifted date unexpected | Low | Medium | Console logging for debugging; date is editable by user |

---

## Files Referenced Summary

### Files to Modify
1. `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\lib\proposalDataFetcher.js`
2. `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\islands\pages\SearchPage.jsx`
3. `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\islands\pages\FavoriteListingsPage\FavoriteListingsPage.jsx`

### Files to Create
1. `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\logic\calculators\scheduling\shiftMoveInDateIfPast.js`

### Files Referenced (Read-Only)
1. `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\islands\shared\CreateProposalFlowV2.jsx`
2. `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\islands\shared\CreateProposalFlowV2Components\MoveInSection.jsx`
3. `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\logic\calculators\scheduling\calculateNextAvailableCheckIn.js`
4. `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\logic\workflows\scheduling\validateMoveInDateWorkflow.js`
5. `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\supabase\functions\proposal\index.ts`

### Database Tables Referenced
- `proposal` - Source of last proposal data (fields: `Move in range start`, `Reservation Span (Weeks)`, `Guest`, `Created Date`, `Deleted`)
