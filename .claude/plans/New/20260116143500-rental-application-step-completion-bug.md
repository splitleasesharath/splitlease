# Bug Analysis: Rental Application Steps Not Showing as Completed

**Date**: 2026-01-16
**Reported By**: User (terrencegrey@test.com)
**Component**: `RentalApplicationWizardModal`
**Severity**: Medium (UI display issue, functionality works)

---

## Problem Statement

When opening a submitted rental application, steps 3 (Occupants), 5 (Details), and 6 (Docs) do not show green checkmarks even though:
- The application is fully submitted (`submitted: true`)
- The completion percentage is 100% (`percentage % done: 100`)
- The user completed all sections

## Database Evidence

```sql
SELECT * FROM rentalapplication WHERE email = 'terrencegrey@test.com'
```

| Field | Value |
|-------|-------|
| `submitted` | `true` |
| `percentage % done` | `100` |
| `progress NEW (list)` | `null` (not used) |
| `permanent address` | `{"address": "123 Broadway, Seattle, WA 98122, USA"}` |
| `length resided` | `"1-2-years"` |
| `renting` | `false` |
| `employment status` | `"student"` |
| `pets` | `false` |
| `smoking` | `false` |
| `parking` | `false` |
| `signature` | `"terrence gray"` |
| `occupants list` | `[{"id":"occupant-1768002000154","name":"theodoro","relationship":"brother-sister"}]` |

---

## Root Cause Analysis

### The Core Issue

The `mapDatabaseToFormData` function in [rentalApplicationFieldMapper.ts](../../../app/src/islands/pages/RentalApplicationPage/utils/rentalApplicationFieldMapper.ts) was simplified and no longer returns `completedSteps` or `lastStep`. However, the logic hook at lines 312-316 in [useRentalApplicationWizardLogic.js](../../../app/src/islands/shared/RentalApplicationWizardModal/useRentalApplicationWizardLogic.js) still expects them:

```javascript
const {
  formData: mappedFormData,
  occupants: mappedOccupants,
  completedSteps: dbCompletedSteps,  // ← UNDEFINED
  lastStep: dbLastStep               // ← UNDEFINED
} = mapDatabaseToFormData(result.data, userProfileData?.email || '');
```

### Why Optional Steps Fail

The step completion logic at lines 537-539 states:

```javascript
// For optional steps (3=Occupants, 5=Details, 6=Documents): only show as complete
// if user has actually visited them.
if (stepFields.length === 0) {
  return visitedStepsArray.includes(stepNumber);
}
```

For **optional steps** (steps with no required fields), a step only shows as "completed" if it's in the `visitedSteps` array.

### The Timing Problem

When loading from database (lines 268-348):

1. **Line 320**: `loadFromDatabase(mappedFormData, mappedOccupants)` updates the Zustand-like store
2. **Line 324**: `setVisitedSteps([1, 2, 3, 4, 5, 6, 7])` marks all steps as visited
3. **Lines 327-329**: Tries to initialize `completedSteps` from `dbCompletedSteps` which is `undefined`
4. **Lines 549-562**: The useEffect that recalculates `completedSteps` runs on the next render

The issue is that when `dbCompletedSteps` is undefined, lines 327-329 don't execute:

```javascript
// Initialize completed steps from database data
if (dbCompletedSteps && dbCompletedSteps.length > 0) {
  setCompletedSteps(dbCompletedSteps);  // Never runs!
}
```

So `completedSteps` starts as `[]` and waits for the useEffect to recalculate it.

### The Race Condition

The useEffect at lines 549-562 depends on `[formData, visitedSteps, checkStepComplete]`:

```javascript
useEffect(() => {
  const newCompleted = [];
  for (let step = 1; step <= TOTAL_STEPS; step++) {
    if (checkStepComplete(step, visitedSteps)) {
      newCompleted.push(step);
    }
  }
  setCompletedSteps(prev => { ... });
}, [formData, visitedSteps, checkStepComplete]);
```

The `checkStepComplete` callback has `[formData]` as its dependency (line 546). When `visitedSteps` changes BEFORE `formData` updates from the store subscription, the useEffect runs with stale `formData`.

**Timeline:**
1. `loadFromDatabase()` called → store updates internally
2. `setVisitedSteps([1,2,3,4,5,6,7])` called → triggers re-render
3. useEffect runs with **old formData** (from before store notified React)
4. Optional steps check: `visitedSteps.includes(3)` → `true` ✅
5. BUT `formData` might still be empty, so required steps fail
6. Store subscription fires → `formData` updates → another render
7. useEffect runs again with **new formData**
8. Now all steps should be complete... but are they?

---

## Verification Needed

The actual bug may be one of:

1. **Missing dependency**: The `checkStepComplete` useCallback should depend on the right values
2. **Stale closure**: The useEffect captures an old `checkStepComplete` function
3. **React batching**: Multiple state updates in `fetchFromDatabase` aren't being batched correctly

---

## Proposed Fix Options

### Option 1: Calculate completedSteps in mapDatabaseToFormData (Recommended)

Restore the `completedSteps` and `lastStep` calculation in the mapper function:

```typescript
export function mapDatabaseToFormData(
  dbRecord: Record<string, unknown>,
  userEmail?: string
): {
  formData: Partial<RentalApplicationFormData>;
  occupants: Occupant[];
  completedSteps: number[];
  lastStep: number;
} {
  // ... existing mapping code ...

  // Calculate completed steps based on data
  const completedSteps: number[] = [];

  // Step 1: Personal Info
  if (formData.fullName && formData.dob && formData.email && formData.phone) {
    completedSteps.push(1);
  }

  // Step 2: Address
  if (formData.currentAddress && formData.lengthResided && formData.renting) {
    completedSteps.push(2);
  }

  // Step 3: Occupants (optional - mark complete if submitted)
  if (db.submitted) {
    completedSteps.push(3);
  }

  // Step 4: Employment
  if (formData.employmentStatus) {
    completedSteps.push(4);
  }

  // Step 5: Details (optional - mark complete if submitted)
  if (db.submitted) {
    completedSteps.push(5);
  }

  // Step 6: Documents (optional - mark complete if submitted)
  if (db.submitted) {
    completedSteps.push(6);
  }

  // Step 7: Review & Sign
  if (formData.signature) {
    completedSteps.push(7);
  }

  return {
    formData,
    occupants,
    completedSteps,
    lastStep: db.submitted ? 7 : Math.max(...completedSteps, 1)
  };
}
```

### Option 2: Fix the timing in useRentalApplicationWizardLogic

Use a single state update or ensure proper sequencing:

```javascript
// After loading from database, calculate completed steps immediately
const calculatedCompletedSteps = [];
for (let step = 1; step <= TOTAL_STEPS; step++) {
  if (checkStepComplete(step, [1, 2, 3, 4, 5, 6, 7])) {
    calculatedCompletedSteps.push(step);
  }
}

// Batch all state updates
setVisitedSteps([1, 2, 3, 4, 5, 6, 7]);
setCompletedSteps(calculatedCompletedSteps);
```

### Option 3: Simplify optional step completion logic

For submitted applications, always mark optional steps as complete:

```javascript
const checkStepComplete = useCallback((stepNumber, visitedStepsArray) => {
  // For submitted applications, all steps are complete
  if (applicationStatus === 'submitted') {
    return true;
  }

  // ... existing logic for in-progress applications ...
}, [formData, applicationStatus]);
```

---

## Recommended Solution

**Option 3** is the simplest and most robust:
- A submitted application by definition has all steps "complete"
- No need to recalculate based on field values
- Eliminates race conditions entirely

---

## Files to Modify

1. [useRentalApplicationWizardLogic.js](../../../app/src/islands/shared/RentalApplicationWizardModal/useRentalApplicationWizardLogic.js) - Lines 525-546 (checkStepComplete function)
2. Optionally: [rentalApplicationFieldMapper.ts](../../../app/src/islands/pages/RentalApplicationPage/utils/rentalApplicationFieldMapper.ts) - Add completedSteps calculation

---

## Testing Checklist

- [ ] Open rental application for `terrencegrey@test.com`
- [ ] Verify all 7 steps show green checkmarks
- [ ] Test with a new user (not submitted) - verify optional steps show as incomplete until visited
- [ ] Test with an in-progress application - verify step completion shows correctly
- [ ] Test navigation between steps doesn't break completion state
