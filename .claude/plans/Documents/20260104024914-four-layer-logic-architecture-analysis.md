# Four-Layer Logic Architecture Analysis

**Document ID**: 20260104024914
**Analysis Date**: 2026-01-04
**Scope**: `app/src/logic/` directory
**Purpose**: Comprehensive audit of the four-layer logic architecture for purity, naming conventions, and layer responsibility adherence

---

## Executive Summary

The four-layer logic architecture is **well-implemented overall**, with strong adherence to functional programming principles in the core layers. However, there are several violations and opportunities for improvement:

| Layer | Files | Compliant | Violations | Purity Score |
|-------|-------|-----------|------------|--------------|
| Calculators | 9 | 8 | 1 | 89% |
| Rules | 22+ | 18 | 4 | 82% |
| Processors | 14+ | 12 | 2 | 86% |
| Workflows | 12+ | N/A (expected impure) | 0 | N/A |

---

## Layer 1: Calculators Analysis

**Location**: `app/src/logic/calculators/`

**Expected Pattern**:
- Pure functions performing mathematical calculations
- Naming: `calculate*`, `get*`
- No side effects, same input always produces same output
- No external dependencies (except constants)

### Compliant Functions (8/9)

| File | Function | Purity | Naming | Notes |
|------|----------|--------|--------|-------|
| `pricing/calculateFourWeekRent.js` | `calculateFourWeekRent` | PURE | calculate* | Exemplary implementation with strict validation |
| `pricing/calculateGuestFacingPrice.js` | `calculateGuestFacingPrice` | PURE | calculate* | Clear step-by-step calculation with business rules |
| `pricing/calculateReservationTotal.js` | `calculateReservationTotal` | PURE | calculate* | Proper validation, pure math |
| `pricing/getNightlyRateByFrequency.js` | `getNightlyRateByFrequency` | PURE | get* | Lookup + validation, no side effects |
| `pricing/calculatePricingBreakdown.js` | `calculatePricingBreakdown` | PURE | calculate* | Composes other calculators correctly |
| `scheduling/calculateCheckInOutDays.js` | `calculateCheckInOutDays` | PURE | calculate* | Complex week wrap-around logic, pure |
| `scheduling/calculateNightsFromDays.js` | `calculateNightsFromDays` | PURE | calculate* | Simple pure function |
| `scheduling/shiftMoveInDateIfPast.js` | `shiftMoveInDateIfPast` | PURE | shift* (naming violation) | Pure but naming doesn't follow convention |

### Violations (1/9)

#### 1. `calculateNextAvailableCheckIn.js` - Date Object Side Effect

**File**: `c:\Users\Split Lease\Documents\Split Lease\app\src\logic\calculators\scheduling\calculateNextAvailableCheckIn.js`

**Issue**: Uses `new Date()` which introduces time-dependent behavior. While the function itself doesn't have side effects, it relies on the system clock for date parsing.

```javascript
// Line 45
const minDateObj = new Date(minDate)

// Line 69
const nextCheckInDate = new Date(minDateObj)
nextCheckInDate.setDate(minDateObj.getDate() + daysToAdd)
```

**Assessment**: This is acceptable for a date calculator - the function is deterministic given the same inputs. However, it mutates the `nextCheckInDate` object internally, which is a minor impurity (though the mutation is isolated).

**Recommendation**: Consider returning a new Date via arithmetic rather than mutating:
```javascript
const nextCheckInDate = new Date(minDateObj.getTime() + daysToAdd * 24 * 60 * 60 * 1000)
```

### Naming Convention Violations

#### 1. `shiftMoveInDateIfPast.js`

**Issue**: Function uses `shift*` prefix instead of `calculate*` or `get*`

**Current**: `shiftMoveInDateIfPast`

**Recommended**: `calculateNextValidMoveInDate` or `getAdjustedMoveInDate`

---

## Layer 2: Rules Analysis

**Location**: `app/src/logic/rules/`

**Expected Pattern**:
- Boolean predicates for business logic
- Naming: `is*`, `can*`, `has*`, `should*`
- Return strict boolean values
- May call calculators, no side effects

### Compliant Functions (18+)

All files in these directories are compliant:

| Directory | Files | Status |
|-----------|-------|--------|
| `auth/` | `isSessionValid.js`, `isProtectedPage.js` | COMPLIANT |
| `pricing/` | `isValidDayCountForPricing.js` | COMPLIANT |
| `scheduling/` | `isDateBlocked.js`, `isDateInRange.js`, `isScheduleContiguous.js` | COMPLIANT |
| `search/` | `isValidPriceTier.js`, `isValidSortOption.js`, `isValidWeekPattern.js`, `hasListingPhotos.js` | COMPLIANT |
| `users/` | `isHost.js`, `isGuest.js`, `hasProfilePhoto.js`, `shouldShowFullName.js` | COMPLIANT |
| `proposals/` | `canAcceptProposal.js`, `canCancelProposal.js`, `canEditProposal.js`, `determineProposalStage.js` | COMPLIANT |

### Violations (4)

#### 1. `proposalRules.js` - Returns Non-Boolean Values

**File**: `c:\Users\Split Lease\Documents\Split Lease\app\src\logic\rules\proposals\proposalRules.js`

**Issue**: Contains functions that return strings and arrays, not booleans:

```javascript
// Line 275-288: Returns string, not boolean
export function getCancelButtonText(proposal) {
  // ...
  return 'Cancel Proposal';  // String return!
}

// Line 295-306: Returns array, not boolean
export function getCancellationReasonOptions() {
  return [
    'Found another property',
    // ... array of strings
  ];
}
```

**Assessment**: These are **processor functions**, not rules. They transform data rather than evaluate predicates.

**Recommendation**: Move `getCancelButtonText` and `getCancellationReasonOptions` to `processors/proposals/`.

#### 2. `virtualMeetingRules.js` - Mixed Concerns

**File**: `c:\Users\Split Lease\Documents\Split Lease\app\src\logic\rules\proposals\virtualMeetingRules.js`

**Issues**:
1. `getVirtualMeetingState()` returns a string enum value, not boolean (lines 45-73)
2. `getVMButtonText()` returns string (lines 199-225)
3. `getVMButtonStyle()` returns string (lines 233-252)
4. `getVMStateInfo()` returns complex object (lines 261-276)

```javascript
// Line 45-73: Returns string enum, not boolean
export function getVirtualMeetingState(virtualMeeting, currentUserId) {
  if (!virtualMeeting) {
    return VM_STATES.NO_MEETING;  // String return!
  }
  // ...
}
```

**Assessment**: This file mixes rules (boolean predicates) with processors (data transformers). The `can*` and `is*` functions are proper rules; the `get*` functions returning strings should be processors.

**Recommendation**: Split into:
- `rules/proposals/virtualMeetingRules.js` - Keep only boolean predicates
- `processors/proposals/processVirtualMeetingDisplay.js` - Move `getVMButtonText`, `getVMButtonStyle`, `getVMStateInfo`

#### 3. `useProposalButtonStates.js` - React Hook in Rules Layer

**File**: `c:\Users\Split Lease\Documents\Split Lease\app\src\logic\rules\proposals\useProposalButtonStates.js`

**Issue**: This is a React hook (uses `useMemo`), not a pure rule function.

```javascript
import { useMemo } from 'react';

export function useProposalButtonStates({ proposal, virtualMeeting, guest, listing, currentUserId }) {
  return useMemo(() => {
    // ...
  }, [proposal, virtualMeeting, guest, listing, currentUserId]);
}
```

**Assessment**: This is a **React hook** that should live in the component layer, not the logic layer. Hooks are inherently tied to React's component lifecycle.

**Recommendation**: Move to `islands/shared/hooks/useProposalButtonStates.js` or create a pure function version that the hook wraps.

#### 4. `determineProposalStage.js` - Returns Number, Not Boolean

**File**: `c:\Users\Split Lease\Documents\Split Lease\app\src\logic\rules\proposals\determineProposalStage.js`

**Issue**: Returns a stage number (1-6), not a boolean:

```javascript
// Line 26-45
export function determineProposalStage({ proposalStatus, deleted = false }) {
  // ...
  return 6  // Number return, not boolean!
}
```

**Assessment**: This is a **calculator** or **processor** function, not a rule. It determines a value based on inputs.

**Recommendation**: Move to `calculators/proposals/calculateProposalStage.js` (since it's computing a value) or `processors/proposals/determineProposalStage.js`.

---

## Layer 3: Processors Analysis

**Location**: `app/src/logic/processors/`

**Expected Pattern**:
- Data transformation functions
- Naming: `adapt*`, `extract*`, `process*`, `format*`
- Guarantee data shape before UI consumption
- May throw errors for invalid data (no fallbacks)

### Compliant Functions (12+)

| File | Function | Pattern | Notes |
|------|----------|---------|-------|
| `display/formatHostName.js` | `formatHostName` | format* | Pure transformation |
| `listing/extractListingCoordinates.js` | `extractListingCoordinates` | extract* | Proper priority logic |
| `listing/parseJsonArrayField.js` | `parseJsonArrayField`, `parseJsonArrayFieldOptional` | parse* | Strong validation |
| `user/processProfilePhotoUrl.js` | `processProfilePhotoUrl` | process* | XSS prevention included |
| `user/processUserDisplayName.js` | `processUserDisplayName` | process* | Pure with validation |
| `user/processUserInitials.js` | `processUserInitials` | process* | Pure |
| `user/processUserData.js` | `processUserData` | process* | Comprehensive transformation |
| `proposal/processProposalData.js` | `processProposalData` | process* | Handles counteroffer merging |

### Violations (2)

#### 1. `extractListingCoordinates.js` - Console Side Effects

**File**: `c:\Users\Split Lease\Documents\Split Lease\app\src\logic\processors\listing\extractListingCoordinates.js`

**Issue**: Uses `console.error` and `console.warn` which are side effects:

```javascript
// Line 46-55
} catch (error) {
  console.error(  // SIDE EFFECT
    '❌ extractListingCoordinates: Failed to parse Location - slightly different address:',
    { listingId, rawValue: locationSlightlyDifferent, error: error.message }
  )
}

// Line 98-102
console.warn('⚠️ extractListingCoordinates: No valid coordinates found for listing:', {  // SIDE EFFECT
  listingId,
  hasSlightlyDifferent: !!parsedSlightlyDifferent,
  hasMainAddress: !!parsedAddress
})
```

**Assessment**: This is a **minor impurity**. Console logging is often acceptable for debugging, but pure processors should ideally return error information rather than log it.

**Recommendation**: Return an object with `{ coordinates, warnings, errors }` structure, letting the caller decide whether to log.

#### 2. `proposals/processProposalData.js` - Fallback Default Values

**File**: `c:\Users\Split Lease\Documents\Split Lease\app\src\logic\processors\proposals\processProposalData.js`

**Issue**: Uses `|| null` and `|| []` fallbacks extensively, which contradicts "NO FALLBACK" principle:

```javascript
// Lines 28-39 - Uses || fallbacks
return {
  id: rawUser._id,
  firstName: rawUser['Name - First'] || null,
  lastName: rawUser['Name - Last'] || null,
  // ...
};

// Line 69 - Uses || 'Untitled Listing' fallback
name: rawListing.Name || 'Untitled Listing',
```

**Assessment**: This file uses **fallback patterns** rather than throwing errors for missing data. This is inconsistent with the project's "NO FALLBACK" philosophy documented in CLAUDE.md.

**Recommendation**:
1. Throw explicit errors for required fields
2. Document which fields are truly optional
3. Use a separate "safe" processor for UI display that handles missing data gracefully

---

## Layer 4: Workflows Analysis

**Location**: `app/src/logic/workflows/`

**Expected Pattern**:
- Orchestration of multiple operations
- Naming: `*Workflow` suffix
- May have side effects (database calls, API calls)
- Compose calculators, rules, and processors

### Overall Assessment: COMPLIANT

Workflows are expected to be impure (they interact with databases, APIs, and browser APIs). All workflow files correctly:

1. **Compose lower layers**:
   - `validateMoveInDateWorkflow` uses `isDateInRange`, `isDateBlocked`, `calculateCheckInOutDays`
   - `validateScheduleWorkflow` uses `isScheduleContiguous`

2. **Handle async operations**:
   - Database calls via Supabase client
   - Proper error handling

3. **Follow naming convention**: All use `*Workflow` suffix or action-verb naming

### Side Effects Inventory

| Workflow | Side Effects | Appropriate? |
|----------|--------------|--------------|
| `checkAuthStatusWorkflow.js` | None (pure orchestration) | YES |
| `validateTokenWorkflow.js` | API calls via injected functions | YES (dependency injection) |
| `validateMoveInDateWorkflow.js` | None (pure validation) | YES |
| `validateScheduleWorkflow.js` | None (pure validation) | YES |
| `loadProposalDetailsWorkflow.js` | Supabase queries | YES |
| `cancelProposalWorkflow.js` | Supabase updates, console.log | YES |
| `acceptProposalWorkflow.js` | Supabase updates | YES |
| `proposals/cancelProposalWorkflow.js` | Supabase updates, console.log | YES |
| `proposals/virtualMeetingWorkflow.js` | Supabase CRUD, console.log | YES |
| `proposals/counterofferWorkflow.js` | Supabase updates, console.log | YES |
| `proposals/navigationWorkflow.js` | `window.location.href` changes | YES |

### Observations

1. **Duplicate workflows**: There are two `cancelProposalWorkflow.js` files:
   - `booking/cancelProposalWorkflow.js`
   - `proposals/cancelProposalWorkflow.js`

   This is **technical debt** that should be consolidated.

2. **Console.log in production code**: Many workflows use `console.log` for debugging. Consider using a proper logging utility that can be disabled in production.

3. **Direct Supabase import**: Some workflows import `supabase` directly instead of receiving it via dependency injection:
   ```javascript
   // proposals/cancelProposalWorkflow.js line 21
   import { supabase } from '../../../lib/supabase.js';
   ```

   This makes testing harder. Consider passing `supabase` as a parameter (like `booking/cancelProposalWorkflow.js` does).

---

## Constants Layer

**Location**: `app/src/logic/constants/`

### Files Present

| File | Purpose | Assessment |
|------|---------|------------|
| `proposalStatuses.js` | Proposal status configuration | WELL-STRUCTURED |
| `proposalStages.js` | (referenced but not read) | - |

### Observations

`proposalStatuses.js` is well-designed with:
- Comprehensive status enum
- Helper functions for common queries
- Proper normalization for trailing spaces from Bubble data
- Clear documentation

However, some helper functions like `getStatusConfig`, `getActionsForStatus`, `getStatusesByColor`, `getStatusesByStage` could be considered **processors** since they transform data.

---

## Summary of Issues

### Critical Issues (Architectural Violations)

| Issue | Location | Recommendation |
|-------|----------|----------------|
| React hook in rules layer | `rules/proposals/useProposalButtonStates.js` | Move to `islands/shared/hooks/` |
| Non-boolean returns in rules | `rules/proposals/proposalRules.js` (`getCancelButtonText`, `getCancellationReasonOptions`) | Move to processors |
| Non-boolean returns in rules | `rules/proposals/virtualMeetingRules.js` (`getVMButtonText`, `getVMButtonStyle`, `getVMStateInfo`) | Split file, move getters to processors |
| Number return in rules | `rules/proposals/determineProposalStage.js` | Move to calculators or processors |

### Moderate Issues (Naming/Convention)

| Issue | Location | Recommendation |
|-------|----------|----------------|
| Naming convention violation | `calculators/scheduling/shiftMoveInDateIfPast.js` | Rename to `calculateNextValidMoveInDate` |
| Console side effects | `processors/listing/extractListingCoordinates.js` | Return errors in object, don't log |
| Fallback patterns | `processors/proposals/processProposalData.js` | Throw for required fields or document optionality |

### Technical Debt

| Issue | Location | Recommendation |
|-------|----------|----------------|
| Duplicate workflows | `booking/cancelProposalWorkflow.js` vs `proposals/cancelProposalWorkflow.js` | Consolidate into single file |
| Direct Supabase imports | Multiple workflow files | Use dependency injection consistently |
| Console.log in production | Multiple workflow files | Use logging utility |

---

## Recommended Refactoring Priority

### High Priority (Architectural Clarity)

1. **Move `useProposalButtonStates.js`** out of logic layer to component layer
2. **Split `virtualMeetingRules.js`** into rules (booleans) and processors (display helpers)
3. **Move `determineProposalStage.js`** to calculators as `calculateProposalStage.js`
4. **Move `getCancelButtonText`, `getCancellationReasonOptions`** from rules to processors

### Medium Priority (Code Quality)

5. **Rename `shiftMoveInDateIfPast`** to follow `calculate*` convention
6. **Consolidate duplicate cancel proposal workflows**
7. **Apply dependency injection** to workflows that directly import supabase

### Low Priority (Polish)

8. **Remove console logging** from processors (return structured errors instead)
9. **Review fallback patterns** in processProposalData.js

---

## Positive Patterns to Preserve

1. **Strict input validation** in calculators (throwing descriptive errors)
2. **Named parameter objects** throughout (`{ nightlyRate, frequency }` instead of positional args)
3. **JSDoc documentation** with `@intent`, `@rule`, `@example` tags
4. **"NO FALLBACK" comments** as explicit design decisions
5. **Separation of concerns** in workflow orchestration
6. **Constants centralization** in `logic/constants/`
7. **Composition over inheritance** (workflows compose rules and calculators)

---

## Files Referenced

### Calculators
- `c:\Users\Split Lease\Documents\Split Lease\app\src\logic\calculators\index.js`
- `c:\Users\Split Lease\Documents\Split Lease\app\src\logic\calculators\pricing\calculateFourWeekRent.js`
- `c:\Users\Split Lease\Documents\Split Lease\app\src\logic\calculators\pricing\calculateGuestFacingPrice.js`
- `c:\Users\Split Lease\Documents\Split Lease\app\src\logic\calculators\pricing\calculatePricingBreakdown.js`
- `c:\Users\Split Lease\Documents\Split Lease\app\src\logic\calculators\pricing\calculateReservationTotal.js`
- `c:\Users\Split Lease\Documents\Split Lease\app\src\logic\calculators\pricing\getNightlyRateByFrequency.js`
- `c:\Users\Split Lease\Documents\Split Lease\app\src\logic\calculators\scheduling\calculateCheckInOutDays.js`
- `c:\Users\Split Lease\Documents\Split Lease\app\src\logic\calculators\scheduling\calculateNextAvailableCheckIn.js`
- `c:\Users\Split Lease\Documents\Split Lease\app\src\logic\calculators\scheduling\calculateNightsFromDays.js`
- `c:\Users\Split Lease\Documents\Split Lease\app\src\logic\calculators\scheduling\shiftMoveInDateIfPast.js`

### Rules
- `c:\Users\Split Lease\Documents\Split Lease\app\src\logic\rules\index.js`
- `c:\Users\Split Lease\Documents\Split Lease\app\src\logic\rules\auth\isSessionValid.js`
- `c:\Users\Split Lease\Documents\Split Lease\app\src\logic\rules\auth\isProtectedPage.js`
- `c:\Users\Split Lease\Documents\Split Lease\app\src\logic\rules\pricing\isValidDayCountForPricing.js`
- `c:\Users\Split Lease\Documents\Split Lease\app\src\logic\rules\scheduling\isDateBlocked.js`
- `c:\Users\Split Lease\Documents\Split Lease\app\src\logic\rules\scheduling\isDateInRange.js`
- `c:\Users\Split Lease\Documents\Split Lease\app\src\logic\rules\scheduling\isScheduleContiguous.js`
- `c:\Users\Split Lease\Documents\Split Lease\app\src\logic\rules\search\isValidPriceTier.js`
- `c:\Users\Split Lease\Documents\Split Lease\app\src\logic\rules\search\isValidSortOption.js`
- `c:\Users\Split Lease\Documents\Split Lease\app\src\logic\rules\search\isValidWeekPattern.js`
- `c:\Users\Split Lease\Documents\Split Lease\app\src\logic\rules\search\hasListingPhotos.js`
- `c:\Users\Split Lease\Documents\Split Lease\app\src\logic\rules\users\isHost.js`
- `c:\Users\Split Lease\Documents\Split Lease\app\src\logic\rules\users\isGuest.js`
- `c:\Users\Split Lease\Documents\Split Lease\app\src\logic\rules\users\hasProfilePhoto.js`
- `c:\Users\Split Lease\Documents\Split Lease\app\src\logic\rules\users\shouldShowFullName.js`
- `c:\Users\Split Lease\Documents\Split Lease\app\src\logic\rules\proposals\determineProposalStage.js`
- `c:\Users\Split Lease\Documents\Split Lease\app\src\logic\rules\proposals\canAcceptProposal.js`
- `c:\Users\Split Lease\Documents\Split Lease\app\src\logic\rules\proposals\canCancelProposal.js`
- `c:\Users\Split Lease\Documents\Split Lease\app\src\logic\rules\proposals\canEditProposal.js`
- `c:\Users\Split Lease\Documents\Split Lease\app\src\logic\rules\proposals\proposalRules.js`
- `c:\Users\Split Lease\Documents\Split Lease\app\src\logic\rules\proposals\virtualMeetingRules.js`
- `c:\Users\Split Lease\Documents\Split Lease\app\src\logic\rules\proposals\useProposalButtonStates.js`

### Processors
- `c:\Users\Split Lease\Documents\Split Lease\app\src\logic\processors\index.js`
- `c:\Users\Split Lease\Documents\Split Lease\app\src\logic\processors\display\formatHostName.js`
- `c:\Users\Split Lease\Documents\Split Lease\app\src\logic\processors\listing\extractListingCoordinates.js`
- `c:\Users\Split Lease\Documents\Split Lease\app\src\logic\processors\listing\parseJsonArrayField.js`
- `c:\Users\Split Lease\Documents\Split Lease\app\src\logic\processors\user\processProfilePhotoUrl.js`
- `c:\Users\Split Lease\Documents\Split Lease\app\src\logic\processors\user\processUserDisplayName.js`
- `c:\Users\Split Lease\Documents\Split Lease\app\src\logic\processors\user\processUserInitials.js`
- `c:\Users\Split Lease\Documents\Split Lease\app\src\logic\processors\user\processUserData.js`
- `c:\Users\Split Lease\Documents\Split Lease\app\src\logic\processors\proposal\processProposalData.js`
- `c:\Users\Split Lease\Documents\Split Lease\app\src\logic\processors\proposals\processProposalData.js`

### Workflows
- `c:\Users\Split Lease\Documents\Split Lease\app\src\logic\workflows\index.js`
- `c:\Users\Split Lease\Documents\Split Lease\app\src\logic\workflows\auth\checkAuthStatusWorkflow.js`
- `c:\Users\Split Lease\Documents\Split Lease\app\src\logic\workflows\auth\validateTokenWorkflow.js`
- `c:\Users\Split Lease\Documents\Split Lease\app\src\logic\workflows\scheduling\validateMoveInDateWorkflow.js`
- `c:\Users\Split Lease\Documents\Split Lease\app\src\logic\workflows\scheduling\validateScheduleWorkflow.js`
- `c:\Users\Split Lease\Documents\Split Lease\app\src\logic\workflows\booking\loadProposalDetailsWorkflow.js`
- `c:\Users\Split Lease\Documents\Split Lease\app\src\logic\workflows\booking\cancelProposalWorkflow.js`
- `c:\Users\Split Lease\Documents\Split Lease\app\src\logic\workflows\booking\acceptProposalWorkflow.js`
- `c:\Users\Split Lease\Documents\Split Lease\app\src\logic\workflows\proposals\cancelProposalWorkflow.js`
- `c:\Users\Split Lease\Documents\Split Lease\app\src\logic\workflows\proposals\virtualMeetingWorkflow.js`
- `c:\Users\Split Lease\Documents\Split Lease\app\src\logic\workflows\proposals\counterofferWorkflow.js`
- `c:\Users\Split Lease\Documents\Split Lease\app\src\logic\workflows\proposals\navigationWorkflow.js`

### Constants
- `c:\Users\Split Lease\Documents\Split Lease\app\src\logic\constants\proposalStatuses.js`
