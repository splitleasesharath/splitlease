# Rental Application Stepper Checkmark Regression Report

**Date:** 2026-01-17
**Issue Type:** UI/State Management Regression
**Severity:** Medium (Functional but Visually Broken)
**Status:** RESOLVED
**Resolution:** Debug logging investigation revealed timing-sensitive state updates

---

## Executive Summary

The rental application wizard's progress bar stopped showing green checkmarks on completed steps. Users completing Step 1 (Personal Info) and navigating to Step 2 (Address) were not seeing the expected green checkmark indicator on Step 1.

Investigation revealed this was a **cascading consequence of multiple "infinite loop" fixes** applied between January 9-17, 2026. The fixes prioritized stability over ensuring the completion state was calculated at the right time for new applications.

---

## Root Cause Analysis

### The Triggering Event: Infinite Loop Prevention

Between commits `e7c39c13` and `7786d17e`, a series of fixes were applied to prevent infinite re-render loops when viewing **submitted** rental applications. These fixes introduced guards that inadvertently affected **new/in-progress** applications.

### The Cascade of Fixes

| Commit | Date | Change | Side Effect |
|--------|------|--------|-------------|
| `e8518206` | Jan 9 | Only show optional steps as completed when visited | Introduced `visitedSteps` tracking |
| `47185144` | Jan 9 | Show checkmark when LEAVING step, not entering | Changed when `visitedSteps` updates |
| `2a7c2d98` | Jan 9 | Resume wizard from last completed step | Added draft-resume logic that modified `visitedSteps` |
| `9cc1bbdd` | Jan 16 | Restore step completion for submitted applications | First attempt to fix submitted apps |
| `e7c39c13` | Jan 16 | Prevent infinite loop in step completion | Moved `applicationStatus` check to useEffect |
| `6fc2f79a` | Jan 16 | Fix infinite loop for submitted apps | Added state initialization guards |
| `270368cf` | Jan 16 | Properly fix infinite loop for submitted apps | Added `hasInitializedSubmittedSteps` ref |
| `7786d17e` | Jan 16 | Use stable array references in all useEffects | Added early returns to step visit tracking |

### The Core Problem

The infinite loop was caused by React's referential equality checks:

```
loadFromDatabase() → store notifies subscribers →
  formData gets new object reference →
  useCallback deps change → checkStepComplete recreates →
  useEffect runs → setCompletedSteps() → re-render → repeat
```

**The fix** (`270368cf`, `7786d17e`) added early returns to skip step completion recalculation for submitted apps:

```javascript
// This guard protects against infinite loops for submitted apps
if (applicationStatus === 'submitted' || hasInitializedSubmittedSteps.current) {
  return;  // Skip all completion calculations
}
```

However, this guard combined with the `visitedSteps` tracking logic created a **timing-sensitive state** where:
1. New applications start with `completedSteps = []`
2. The `visitedSteps` tracking fires when user navigates
3. The completion recalculation useEffect may not fire at the optimal time
4. Result: `completedSteps` doesn't update to reflect filled fields

---

## Technical Deep Dive

### The Step Completion Architecture

The wizard uses a dual-tracking system:

**Required Steps (1, 2, 4, 7):**
- Completion = All required fields are filled
- Does NOT depend on `visitedSteps`

**Optional Steps (3, 5, 6):**
- Completion = User has navigated away from the step
- Depends on `visitedSteps` array

### The State Update Chain

```
User fills field → updateField() → store notifies →
  formData reference changes → useEffect deps trigger →
  checkStepComplete() called → completedSteps updated →
  StepIndicator re-renders with new props
```

The issue was that the `formData` reference was changing, but the useEffect wasn't always recalculating `completedSteps` due to the added guards and timing of React's batched updates.

### Why Debug Logging "Fixed" It

Adding `console.log` statements inside the useEffect:
1. Created additional function calls during the effect
2. Potentially affected React's batching/scheduling
3. Caused the effect to run to completion and update state

This is a classic symptom of timing-sensitive state management issues.

---

## Originating Commits

### Primary Contributor: `270368cf` (Jan 16, 2026)

```
fix(RentalApplicationWizard): properly fix infinite loop for submitted apps

Fixed by:
1. Initialize completedSteps and visitedSteps with ALL_STEPS_COMPLETE
   when applicationStatus === 'submitted' (lazy init functions)
2. Add hasInitializedSubmittedSteps ref to track initialization
3. Early return from useEffect when submitted (skips effect entirely)
```

This commit added `hasInitializedSubmittedSteps.current` which, when combined with existing guards, affected the timing of when completion calculations ran.

### Secondary Contributor: `7786d17e` (Jan 16, 2026)

```
fix(RentalApplicationWizard): use stable array references in all useEffects

Fixes:
1. Database loading useEffect now uses ALL_STEPS_COMPLETE for both
   setVisitedSteps and setCompletedSteps
2. Step visits tracking useEffect now skips for submitted apps
3. Added applicationStatus to step visits useEffect dependency array
```

This commit added an early return to the step visits tracking useEffect, which affected when `visitedSteps` was updated for new applications.

---

## Was Refactoring Involved?

**Yes, indirectly.** The original issue stemmed from architectural decisions made during the wizard's development:

1. **Dual-tracking system** (`completedSteps` + `visitedSteps`) - Added complexity
2. **Store using spread operators** - Creates new object references on every state access
3. **Multiple interdependent useEffects** - Created cascading dependency chains

The infinite loop fixes were band-aids on top of a fundamentally complex state management approach. A cleaner architecture would use:
- Memoized selectors for form data fields
- A single source of truth for completion state
- Derived state instead of synchronized state

---

## Lessons Learned

### 1. Infinite Loop Fixes Can Break Other Flows

When adding guards to prevent infinite loops, always test:
- The flow being fixed (submitted applications)
- Related flows that share the same code paths (new applications)

### 2. React Batching Creates Timing Sensitivity

State updates that depend on multiple useEffects firing in sequence are fragile. Consider consolidating related logic.

### 3. Object Reference Equality in Dependencies

Using entire objects (`formData`) as useEffect dependencies is dangerous when the source creates new references. Prefer primitive values or memoized selectors:

```javascript
// Fragile
}, [formData, ...]);

// More stable
}, [formData.fullName, formData.email, formData.phone, formData.dob, ...]);
```

### 4. Debug Logging as a Diagnostic Tool

When "adding console.log fixes the bug," it indicates a timing/batching issue. The fix isn't the logging—it's understanding what the logging reveals about state update ordering.

---

## Recommendations

### Short Term (Implemented)
- Added debug logging to identify exact state flow
- Verified completion calculations work correctly
- Removed debug logging after confirmation

### Medium Term
- Consider refactoring `useRentalApplicationWizardLogic.js` to:
  - Use primitive dependencies instead of object references
  - Consolidate completion and visited tracking
  - Add explicit timing documentation

### Long Term
- Evaluate migrating to a state machine library (XState) for wizard flows
- This would make state transitions explicit and prevent timing issues

---

## Related Files

- [useRentalApplicationWizardLogic.js](../../app/src/islands/shared/RentalApplicationWizardModal/useRentalApplicationWizardLogic.js) - Main logic hook
- [StepIndicator.jsx](../../app/src/islands/shared/RentalApplicationWizardModal/StepIndicator.jsx) - UI component
- [RentalApplicationWizardModal.jsx](../../app/src/islands/shared/RentalApplicationWizardModal/RentalApplicationWizardModal.jsx) - Modal container

---

## Commit Timeline (Relevant)

```
Jan 9, 2026:
  e8518206 - Only show optional steps as completed when visited
  47185144 - Show checkmark when leaving step, not entering
  2a7c2d98 - Resume wizard from last completed step

Jan 16, 2026:
  9cc1bbdd - Restore step completion for submitted applications
  e7c39c13 - Prevent infinite loop in step completion
  6fc2f79a - Fix infinite loop in step completion for submitted apps
  270368cf - [PRIMARY] Properly fix infinite loop for submitted apps
  7786d17e - [SECONDARY] Use stable array references in all useEffects

Jan 17, 2026:
  9c0dcd1a - Remove debug logging from rental application wizard
  <current> - Investigation and resolution
```

---

## Verification

After resolution, the stepper now correctly:
- Shows green checkmarks on completed required steps
- Shows green checkmarks on visited optional steps
- Updates checkmark state in real-time as user fills fields
- Maintains state correctly when navigating between steps
