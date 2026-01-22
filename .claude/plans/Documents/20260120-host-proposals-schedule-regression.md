# Host Proposals Schedule Display Regression Report

**Date:** 2026-01-20
**Issue Type:** UI Display Regression
**Severity:** Medium (Functional but Displaying Incorrect Information)
**Status:** FIXED

---

## Executive Summary

The Host Proposals page was displaying incorrect schedule information for proposals with wrap-around schedules (schedules that span the Saturday-Sunday boundary). The SCHEDULE column showed "Sun - Sat" when it should have shown "Thu - Mon" for a Thursday check-in, Monday check-out schedule.

---

## Symptoms Observed

From the user's screenshot:
- **Days pill selector**: S M T F S (correctly highlighted Sunday, Monday, Thursday, Friday, Saturday)
- **SCHEDULE column**: "Sun - Sat" (INCORRECT)
- **Check-in/out text**: "Thu check-in, Mon check-out" (CORRECT)
- **Nights display**: "4/week" and "5 days, 4 nights" (CORRECT)

The inconsistency was confusing because the day pills and check-in/out text showed the real schedule, but the SCHEDULE column showed a misleading range.

---

## Root Cause Analysis

### The Bug

Two functions were using naive sorting logic that assumed schedules are always contiguous within a week:

1. **`formatSchedule()`** in `ProposalCardHeader.jsx:54-67`
2. **`formatScheduleRange()`** in `InfoGrid.jsx:38-51`

Both functions did this:
```javascript
const sorted = [...daysSelected].sort((a, b) => a - b);
const first = dayNames[sorted[0]];        // Takes smallest index
const last = dayNames[sorted[sorted.length - 1]]; // Takes largest index
return `${first}-${last}`;
```

### Why This Fails for Wrap-Around Schedules

For a schedule of Thu, Fri, Sat, Sun, Mon (days_selected = [0, 1, 4, 5, 6]):

| Step | Result |
|------|--------|
| Sort array | [0, 1, 4, 5, 6] |
| First element | 0 → "Sun" |
| Last element | 6 → "Sat" |
| Output | "Sun - Sat" ❌ |

But the actual check-in is **Thursday** (index 4) and check-out is **Monday** (index 1), which spans the week boundary.

### The Correct Solution

The `getCheckInOutFromDays()` function in `types.js` already handles this correctly by:
1. Detecting if the schedule wraps (contains both 0/Sunday and 6/Saturday)
2. Finding the "gap" in the sorted array to identify where the week boundary is
3. Returning the actual check-in (first day after gap) and check-out (last day before gap)

---

## Files Changed

### 1. ProposalCardHeader.jsx

**Path**: `app/src/islands/pages/HostProposalsPage/ProposalCardHeader.jsx`

**Change**: Updated `formatSchedule()` to use `getCheckInOutFromDays()` instead of naive sorting.

```javascript
// Before (BUGGY)
function formatSchedule(daysSelected) {
  const sorted = [...daysSelected].sort((a, b) => a - b);
  const first = dayNames[sorted[0]];
  const last = dayNames[sorted[sorted.length - 1]];
  return `${first}-${last}`;
}

// After (FIXED)
function formatSchedule(daysSelected) {
  const { checkInDay, checkOutDay } = getCheckInOutFromDays(daysSelected);
  return `${checkInDay.slice(0, 3)}-${checkOutDay.slice(0, 3)}`;
}
```

### 2. InfoGrid.jsx

**Path**: `app/src/islands/pages/HostProposalsPage/InfoGrid.jsx`

**Change**: Updated `formatScheduleRange()` to use `getCheckInOutFromDays()` instead of naive sorting.

Same pattern as above - the SCHEDULE column in the expanded card now displays correctly.

---

## Days vs Nights Clarification

The user also asked about the relationship between days and nights:

| Concept | Description | Example |
|---------|-------------|---------|
| **Days Selected** | Days the guest is physically present (includes checkout day) | [4, 5, 6, 0, 1] = 5 days |
| **Nights Selected** | Nights the guest sleeps (always days - 1) | [4, 5, 6, 0] = 4 nights |
| **Check-in Day** | First day of presence | Thursday (index 4) |
| **Check-out Day** | Last day of presence (guest leaves this day) | Monday (index 1) |

The formula: **Nights = Days - 1** because the guest doesn't sleep on their checkout day.

---

## Verification

After the fix, the Host Proposals page should display:

- ✅ SCHEDULE column: "Thu - Mon" (not "Sun - Sat")
- ✅ Meta line in header: "Thu-Mon" (not "Sun-Sat")
- ✅ Day pills: S M T F S (unchanged - was already correct)
- ✅ Check-in/out text: "Thu check-in, Mon check-out" (unchanged - was already correct)

---

## Related Files

- [ProposalCardHeader.jsx](../../../app/src/islands/pages/HostProposalsPage/ProposalCardHeader.jsx) - Fixed
- [InfoGrid.jsx](../../../app/src/islands/pages/HostProposalsPage/InfoGrid.jsx) - Fixed
- [types.js](../../../app/src/islands/pages/HostProposalsPage/types.js) - Contains the correct `getCheckInOutFromDays()` function
- [DayPillsRow.jsx](../../../app/src/islands/pages/HostProposalsPage/DayPillsRow.jsx) - Was already using `getCheckInOutFromDays()` correctly

---

## Lessons Learned

1. **Reuse existing utilities**: The `getCheckInOutFromDays()` function already existed and handled edge cases properly. The bug occurred because new code duplicated functionality with a simpler (broken) implementation.

2. **Week wrap-around is a common edge case**: Any day-of-week calculation that involves sorting should consider schedules that span the Saturday-Sunday boundary.

3. **Consistency matters**: When multiple UI elements display the same data, they should use the same calculation logic to avoid confusing users with inconsistent displays.
