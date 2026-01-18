# Code Refactoring Plan - app

**Date:** 2026-01-18
**Audit Type:** General
**Files Analyzed:** 519
**Edge Reduction Target:** 20%

---

## Executive Summary

This audit identified **12 actionable chunks** across **6 page groups**. The primary issues fall into three categories:

1. **Code Duplication** - Multiple implementations of pricing and user data processing
2. **Console Logging** - Excessive debug logging in production code
3. **ESLint Suppression** - Disabled React hooks rules creating stale closure risks

### Impact Analysis

| Category | Files Affected | Severity |
|----------|---------------|----------|
| Pricing Duplication | 13 files | HIGH |
| Console Logging | 50+ files | MEDIUM |
| Processor Duplication | 4 files | HIGH |
| ESLint Suppression | 3 files | MEDIUM |

---

## PAGE GROUP: /search, /view-split-lease, /preview-split-lease (Chunks: 1, 2, 3)

### CHUNK 1: Remove debug console.log statements from priceCalculations.js

**Files:** `src\lib\scheduleSelector\priceCalculations.js`
**Line:** 36-40, 88-93, 157-169
**Issue:** Heavy debug logging in pricing calculations pollutes browser console and impacts performance
**Affected Pages:** /search, /view-split-lease, /preview-split-lease, /guest-proposals, /host-proposals

**Rationale:** This file is imported by 8 components across all listing-related pages. Console statements execute on every price calculation.

**Approach:** Remove all console.log statements. If debugging is needed, use a conditional logger that respects NODE_ENV.

**Current Code:**
```javascript
export const calculatePrice = (selectedNights, listing, reservationSpan = 13, zatConfig = null) => {
  const nightsCount = selectedNights.length;

  console.log('=== CALCULATE PRICE ===');
  console.log('nightsCount:', nightsCount);
  console.log('listing rental type:', listing?.['rental type'] || listing?.rentalType);
  console.log('reservationSpan:', reservationSpan);

  if (nightsCount === 0) {
    return createEmptyPriceBreakdown();
  }
```

**Refactored Code:**
```javascript
export const calculatePrice = (selectedNights, listing, reservationSpan = 13, zatConfig = null) => {
  const nightsCount = selectedNights.length;

  if (nightsCount === 0) {
    return createEmptyPriceBreakdown();
  }
```

**Testing:**
- [ ] Run `bun run build` to verify no syntax errors
- [ ] Navigate to /search and verify pricing still displays correctly
- [ ] Navigate to /view-split-lease and test schedule selector pricing
- [ ] Check browser console for absence of pricing debug logs

~~~~~

### CHUNK 2: Remove result logging from priceCalculations.js

**Files:** `src\lib\scheduleSelector\priceCalculations.js`
**Line:** 88-93
**Issue:** Result logging after every calculation adds overhead
**Affected Pages:** /search, /view-split-lease, /preview-split-lease

**Rationale:** Groups with CHUNK 1 - same file, same category of change.

**Approach:** Remove console statements from the result section.

**Current Code:**
```javascript
  const initialPayment = fourWeekRent + cleaningFee + damageDeposit;

  console.log('=== PRICE CALCULATION RESULT ===');
  console.log('pricePerNight:', pricePerNight);
  console.log('fourWeekRent:', fourWeekRent);
  console.log('reservationTotal:', reservationTotal);
  console.log('initialPayment:', initialPayment);

  return {
    basePrice: fourWeekRent,
```

**Refactored Code:**
```javascript
  const initialPayment = fourWeekRent + cleaningFee + damageDeposit;

  return {
    basePrice: fourWeekRent,
```

**Testing:**
- [ ] Verify price breakdown shows correct values on /view-split-lease
- [ ] Confirm no console output during price calculations

~~~~~

### CHUNK 3: Remove Monthly calculation logging from priceCalculations.js

**Files:** `src\lib\scheduleSelector\priceCalculations.js`
**Line:** 157-169
**Issue:** Verbose logging inside monthly rental calculation
**Affected Pages:** /search, /view-split-lease (Monthly rental type listings)

**Rationale:** Continues cleanup of same file.

**Approach:** Remove the console.log statement inside calculateMonthlyPrice function.

**Current Code:**
```javascript
  // Step 9: Calculate 4-Week Rent
  const fourWeekRent = (pricePerNight * nightsCount * 4) / weeklySchedulePeriod;

  console.log('Monthly calculation:', {
    monthlyAvgNightly,
    averageWeeklyPrice,
    nightlyHostRate,
    unusedNights,
    unusedNightsDiscountValue,
    multiplier,
    totalWeeklyPrice,
    pricePerNight,
    weeklySchedulePeriod,
    fourWeekRent,
    reservationTotal
  });

  return { pricePerNight, fourWeekRent, reservationTotal };
```

**Refactored Code:**
```javascript
  // Step 9: Calculate 4-Week Rent
  const fourWeekRent = (pricePerNight * nightsCount * 4) / weeklySchedulePeriod;

  // Step 11: Calculate Total Reservation Price
  const reservationTotal = calculateTotalReservationPrice(
    pricePerNight,
    nightsCount,
    reservationSpan,
    weeksOffered
  );

  return { pricePerNight, fourWeekRent, reservationTotal };
```

**Testing:**
- [ ] Test with a Monthly rental type listing
- [ ] Verify pricing displays correctly

~~~~~

## PAGE GROUP: /view-split-lease (Chunks: 4, 5)

### CHUNK 4: Fix ESLint-disabled hooks in useScheduleSelector.js (onSelectionChange)

**Files:** `src\islands\shared\useScheduleSelector.js`
**Line:** 154-157
**Issue:** ESLint react-hooks/exhaustive-deps rule disabled - risk of stale closures
**Affected Pages:** /view-split-lease, /search (any page using schedule selector)

**Rationale:** The callback `onSelectionChange` is intentionally excluded from deps because we only want to notify when `selectedDays` changes, not when the callback reference changes. However, this pattern should be explicit.

**Approach:** Document the intentional exclusion with a clear comment explaining why.

**Current Code:**
```javascript
  // Notify parent components of changes
  useEffect(() => {
    onSelectionChange?.(selectedDays);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDays]);
```

**Refactored Code:**
```javascript
  // Notify parent components of changes
  // Note: onSelectionChange is intentionally excluded from deps.
  // We only want to trigger when selectedDays changes, not when the callback
  // reference changes (which would cause unnecessary notifications).
  // Parent components should memoize their callbacks if needed.
  useEffect(() => {
    onSelectionChange?.(selectedDays);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: notify on data change only
  }, [selectedDays]);
```

**Testing:**
- [ ] Verify schedule selector still calls parent callbacks on day selection
- [ ] Test that changing parent component state doesn't cause extra notifications

~~~~~

### CHUNK 5: Fix ESLint-disabled hooks in useScheduleSelector.js (onPriceChange)

**Files:** `src\islands\shared\useScheduleSelector.js`
**Line:** 159-164
**Issue:** Debug logging + ESLint rule disabled
**Affected Pages:** /view-split-lease, /search

**Rationale:** Remove debug logs and document the intentional deps exclusion.

**Approach:** Remove console.log statements and add explanatory comment.

**Current Code:**
```javascript
  useEffect(() => {
    console.log('useEffect onPriceChange - priceBreakdown:', priceBreakdown);
    console.log('useEffect onPriceChange - callback exists:', !!onPriceChange);
    onPriceChange?.(priceBreakdown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priceBreakdown]);
```

**Refactored Code:**
```javascript
  // Note: onPriceChange is intentionally excluded from deps.
  // We only want to trigger when priceBreakdown changes.
  useEffect(() => {
    onPriceChange?.(priceBreakdown);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: notify on data change only
  }, [priceBreakdown]);
```

**Testing:**
- [ ] Verify price breakdown updates trigger parent callbacks
- [ ] Check browser console for absence of debug logs

~~~~~

## PAGE GROUP: /guest-proposals, /host-proposals (Chunks: 6, 7)

### CHUNK 6: Remove verbose logging from counterofferWorkflow.js

**Files:** `src\logic\workflows\proposals\counterofferWorkflow.js`
**Line:** 34, 67, 71, 91, 109, 113
**Issue:** Extensive console.log/error statements in workflow
**Affected Pages:** /guest-proposals, /host-proposals

**Rationale:** Workflow files log every action and result. While useful for debugging, this creates noise in production.

**Approach:** Replace console.log with a no-op in production, keep console.error for actual errors.

**Current Code:**
```javascript
export async function acceptCounteroffer(proposalId, supabaseClient) {
  console.log('[counterofferWorkflow] Accepting counteroffer for proposal:', proposalId);

  // ... function body ...

  if (error) {
    console.error('[counterofferWorkflow] Error accepting counteroffer:', error);
    throw error;
  }

  console.log('[counterofferWorkflow] Counteroffer accepted successfully:', proposalId);
  return data;
}
```

**Refactored Code:**
```javascript
export async function acceptCounteroffer(proposalId, supabaseClient) {
  // ... function body ...

  if (error) {
    console.error('[counterofferWorkflow] Error accepting counteroffer:', error);
    throw error;
  }

  return data;
}
```

**Testing:**
- [ ] Test accepting a counteroffer on /guest-proposals
- [ ] Verify error is still logged when API fails
- [ ] Check console for absence of success/info logs

~~~~~

### CHUNK 7: Remove verbose logging from cancelProposalWorkflow.js

**Files:** `src\logic\workflows\proposals\cancelProposalWorkflow.js`
**Line:** 112, 122, 126, 139, 159, 170, 174
**Issue:** Excessive logging in cancellation workflow
**Affected Pages:** /guest-proposals, /host-proposals

**Rationale:** Same pattern as CHUNK 6 - workflow logs every step.

**Approach:** Keep only error logging.

**Current Code:**
```javascript
export async function cancelProposal(proposalId, reason, supabaseClient) {
  console.log('[cancelProposalWorkflow] Cancelling proposal:', proposalId);

  // ... function body ...

  if (error) {
    console.error('[cancelProposalWorkflow] Error cancelling proposal:', error);
    throw error;
  }

  console.log('[cancelProposalWorkflow] Proposal cancelled successfully:', proposalId);
  return data;
}
```

**Refactored Code:**
```javascript
export async function cancelProposal(proposalId, reason, supabaseClient) {
  // ... function body ...

  if (error) {
    console.error('[cancelProposalWorkflow] Error cancelling proposal:', error);
    throw error;
  }

  return data;
}
```

**Testing:**
- [ ] Test cancelling a proposal
- [ ] Verify errors are still logged
- [ ] Confirm no success logs in console

~~~~~

## PAGE GROUP: /guest-proposals (Chunks: 8, 9)

### CHUNK 8: Remove verbose logging from virtualMeetingWorkflow.js

**Files:** `src\logic\workflows\proposals\virtualMeetingWorkflow.js`
**Line:** 29, 53, 66, 84, 112, 126, 130, 145, 158, 162, 178, 191, 195
**Issue:** 13 console statements in virtual meeting workflow
**Affected Pages:** /guest-proposals (virtual meeting feature)

**Rationale:** Virtual meeting workflows log heavily during every operation.

**Approach:** Remove all console.log statements, keep console.error for failures.

**Current Code:**
```javascript
export async function requestVirtualMeeting(proposalId, suggestedTimes, supabaseClient) {
  console.log('[virtualMeetingWorkflow] Requesting virtual meeting for proposal:', proposalId);

  // ... API call ...

  if (error) {
    console.error('[virtualMeetingWorkflow] Error requesting virtual meeting:', error);
    throw error;
  }

  console.log('[virtualMeetingWorkflow] Virtual meeting requested:', data._id);
  return data;
}
```

**Refactored Code:**
```javascript
export async function requestVirtualMeeting(proposalId, suggestedTimes, supabaseClient) {
  // ... API call ...

  if (error) {
    console.error('[virtualMeetingWorkflow] Error requesting virtual meeting:', error);
    throw error;
  }

  return data;
}
```

**Testing:**
- [ ] Test requesting a virtual meeting
- [ ] Test declining a virtual meeting
- [ ] Test booking a virtual meeting date
- [ ] Verify errors still appear in console

~~~~~

### CHUNK 9: Remove verbose logging from navigationWorkflow.js

**Files:** `src\logic\workflows\proposals\navigationWorkflow.js`
**Line:** 17, 24, 36, 55, 66, 72, 83, 89, 100, 106, 117, 123, 132, 143, 147, 165
**Issue:** 16 console statements for navigation actions
**Affected Pages:** /guest-proposals, /host-proposals (navigation between pages)

**Rationale:** Navigation logging is especially noisy as it fires on every link click.

**Approach:** Remove all logging, let browser devtools network tab track navigation.

**Current Code:**
```javascript
export function navigateToListing(proposal) {
  const listingId = proposal?.listing?.id || proposal?.listingId;

  if (!listingId) {
    console.error('[navigationWorkflow] No listing ID found for navigation');
    return null;
  }

  const url = `/view-split-lease/${listingId}`;
  console.log('[navigationWorkflow] Navigating to listing:', url);

  window.location.href = url;
  return url;
}
```

**Refactored Code:**
```javascript
export function navigateToListing(proposal) {
  const listingId = proposal?.listing?.id || proposal?.listingId;

  if (!listingId) {
    console.error('[navigationWorkflow] No listing ID found for navigation');
    return null;
  }

  const url = `/view-split-lease/${listingId}`;
  window.location.href = url;
  return url;
}
```

**Testing:**
- [ ] Test navigation from proposal card to listing
- [ ] Test navigation to messaging
- [ ] Verify console.error still fires for missing IDs

~~~~~

## PAGE GROUP: AUTO (Shared Logic - Multiple Pages) (Chunks: 10, 11, 12)

### CHUNK 10: Consolidate duplicate processUserData implementations

**Files:** `src\logic\processors\user\processUserData.js`, `src\logic\processors\proposals\processProposalData.js`
**Line:** user/processUserData.js:30-93, proposals/processProposalData.js:18-39
**Issue:** Two implementations of processUserData with different behavior
**Affected Pages:** AUTO (all pages that display user information)

**Rationale:** The `proposals/processProposalData.js` has an inline `processUserData` function that differs from the dedicated `user/processUserData.js`. This causes inconsistent name derivation.

**Approach:** Update `proposals/processProposalData.js` to import from `user/processUserData.js` instead of defining its own version.

**Current Code (proposals/processProposalData.js lines 18-39):**
```javascript
export function processUserData(rawUser) {
  if (!rawUser) {
    throw new Error('processUserData: User data is required');
  }

  if (!rawUser._id) {
    throw new Error('processUserData: User ID (_id) is required');
  }

  return {
    id: rawUser._id,
    firstName: rawUser['Name - First'] || null,
    lastName: rawUser['Name - Last'] || null,
    fullName: rawUser['Name - Full'] || null,
    profilePhoto: rawUser['Profile Photo'] || null,
    bio: rawUser['About Me / Bio'] || null,
    linkedInVerified: rawUser['Verify - Linked In ID'] || false,
    phoneVerified: rawUser['Verify - Phone'] || false,
    userVerified: rawUser['user verified?'] || false,
    proposalsList: rawUser['Proposals List'] || []
  };
}
```

**Refactored Code:**
```javascript
// Import from canonical source
import { processUserData } from '../user/processUserData.js';

// Re-export for backwards compatibility
export { processUserData };
```

**Testing:**
- [ ] Verify user names display correctly on /guest-proposals
- [ ] Verify user names display correctly on /host-proposals
- [ ] Test with users that have incomplete name fields
- [ ] Run `bun run build` to verify no import errors

~~~~~

### CHUNK 11: Remove duplicate proposal processor directory

**Files:** `src\logic\processors\proposal\processProposalData.js`
**Line:** Entire file (148 lines)
**Issue:** Duplicate proposal processor exists in singular `proposal/` alongside plural `proposals/`
**Affected Pages:** AUTO (any page importing from wrong path)

**Rationale:** Two directories exist: `processors/proposal/` (singular, 148 lines) and `processors/proposals/` (plural, 330 lines). The plural version is more complete and follows the naming convention.

**Approach:**
1. Verify no files import from `proposal/` (singular)
2. If imports exist, update them to use `proposals/` (plural)
3. Delete the `proposal/` directory

**Current Code (directory structure):**
```
src/logic/processors/
├── proposal/           <- DELETE THIS
│   └── processProposalData.js (148 lines, less complete)
├── proposals/          <- KEEP THIS
│   └── processProposalData.js (330 lines, canonical)
```

**Refactored Code:**
```
src/logic/processors/
├── proposals/          <- Single source of truth
│   └── processProposalData.js
```

**Testing:**
- [ ] Run `bun run build` to verify no broken imports
- [ ] Search codebase for imports from `proposal/` (singular) and update
- [ ] Test proposal loading on /guest-proposals and /host-proposals

~~~~~

### CHUNK 12: Silent failure in lib/priceCalculations.js

**Files:** `src\lib\priceCalculations.js`
**Line:** 16-19, 28-30
**Issue:** Functions return 0 silently on invalid input instead of throwing
**Affected Pages:** /view-split-lease, /preview-split-lease

**Rationale:** The lib/priceCalculations.js has functions that silently return 0 for invalid inputs, violating the "No Fallback" principle documented in the codebase.

**Approach:** Add explicit error throwing for invalid inputs to surface bugs early.

**Current Code:**
```javascript
export function calculate4WeekRent(nightlyPrice, nightsPerWeek) {
  if (!nightlyPrice || !nightsPerWeek) return 0;
  return nightlyPrice * nightsPerWeek * 4;
}

export function calculateReservationTotal(fourWeekRent, totalWeeks) {
  if (!fourWeekRent || !totalWeeks) return 0;
  return fourWeekRent * (totalWeeks / 4);
}
```

**Refactored Code:**
```javascript
export function calculate4WeekRent(nightlyPrice, nightsPerWeek) {
  if (typeof nightlyPrice !== 'number' || isNaN(nightlyPrice) || nightlyPrice <= 0) {
    throw new Error(`calculate4WeekRent: nightlyPrice must be a positive number, got ${nightlyPrice}`);
  }
  if (typeof nightsPerWeek !== 'number' || isNaN(nightsPerWeek) || nightsPerWeek < 1) {
    throw new Error(`calculate4WeekRent: nightsPerWeek must be at least 1, got ${nightsPerWeek}`);
  }
  return nightlyPrice * nightsPerWeek * 4;
}

export function calculateReservationTotal(fourWeekRent, totalWeeks) {
  if (typeof fourWeekRent !== 'number' || isNaN(fourWeekRent) || fourWeekRent < 0) {
    throw new Error(`calculateReservationTotal: fourWeekRent must be non-negative, got ${fourWeekRent}`);
  }
  if (typeof totalWeeks !== 'number' || isNaN(totalWeeks) || totalWeeks <= 0) {
    throw new Error(`calculateReservationTotal: totalWeeks must be positive, got ${totalWeeks}`);
  }
  return fourWeekRent * (totalWeeks / 4);
}
```

**Testing:**
- [ ] Test with valid inputs on /view-split-lease
- [ ] Verify error is thrown for undefined nightlyPrice
- [ ] Verify error is thrown for 0 nights
- [ ] Check that calling components have try/catch or handle errors appropriately

---

## Implementation Priority

### Phase 1: Console Logging Cleanup (Low Risk, High Impact)
- CHUNK 1, 2, 3 - priceCalculations.js logging
- CHUNK 5 - useScheduleSelector.js logging
- CHUNK 6, 7, 8, 9 - Workflow logging

### Phase 2: Code Consolidation (Medium Risk, High Impact)
- CHUNK 10 - Consolidate processUserData
- CHUNK 11 - Remove duplicate proposal directory

### Phase 3: Error Handling (Medium Risk, Medium Impact)
- CHUNK 12 - Silent failure fixes
- CHUNK 4, 5 - ESLint comments documentation

---

## Dependency Graph Impact

Files modified in this plan:

| File | Dependents | Risk Level |
|------|------------|------------|
| `src\lib\scheduleSelector\priceCalculations.js` | 8 | MEDIUM |
| `src\islands\shared\useScheduleSelector.js` | 5+ | MEDIUM |
| `src\logic\workflows\proposals\*.js` | 3-5 each | LOW |
| `src\logic\processors\proposals\processProposalData.js` | 10+ | HIGH |
| `src\lib\priceCalculations.js` | 4 | MEDIUM |

---

## Files Referenced

- `src\lib\scheduleSelector\priceCalculations.js`
- `src\lib\priceCalculations.js`
- `src\islands\shared\useScheduleSelector.js`
- `src\logic\workflows\proposals\counterofferWorkflow.js`
- `src\logic\workflows\proposals\cancelProposalWorkflow.js`
- `src\logic\workflows\proposals\virtualMeetingWorkflow.js`
- `src\logic\workflows\proposals\navigationWorkflow.js`
- `src\logic\processors\user\processUserData.js`
- `src\logic\processors\proposals\processProposalData.js`
- `src\logic\processors\proposal\processProposalData.js` (to be deleted)
- `src\logic\calculators\pricing\calculateFourWeekRent.js` (reference for good patterns)
- `src\logic\calculators\pricing\calculatePricingBreakdown.js` (reference for good patterns)
- `src\routes.config.js` (reference for page routing)
