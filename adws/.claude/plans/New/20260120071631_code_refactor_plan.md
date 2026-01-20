# Code Refactoring Plan - app/src/logic

Date: 2026-01-20
Audit Type: general

## Executive Summary

**Files Audited:** 68 JavaScript files
**Issues Identified:** 7 major refactoring opportunities
**Critical Findings:**
- 2 duplicate processor implementations (processProposalData)
- 2 duplicate workflow implementations (cancelProposalWorkflow)
- 1 malformed JSDoc comment
- 1 fallback logic violation (against "Building for Truth" principle)
- 1 redundant function duplication in proposalRules.js

---

~~~~~

## PAGE GROUP: /my-proposals, /proposal (Chunks: 1, 2, 3, 4, 5)

### CHUNK 1: Consolidate duplicate processProposalData processors
**File:** `app/src/logic/processors/proposal/processProposalData.js`, `app/src/logic/processors/proposals/processProposalData.js`
**Line:** 1-149 (proposal), 1-305 (proposals)
**Issue:** Two completely different implementations of the same processor exist in nearly identical directory paths (`proposal/` vs `proposals/`). They have incompatible APIs and return different data shapes:
- `processors/proposal/processProposalData.js` (149 lines): Takes `{rawProposal, listing, guest, host}`, returns `{id, currentTerms, originalTerms, hasCounteroffer, ...}`
- `processors/proposals/processProposalData.js` (305 lines): Takes `rawProposal` only, auto-processes nested `listing`, `host`, `virtualMeeting`, returns `{id, daysSelected, nightsSelected, ...}`

**Affected Pages:** /my-proposals, /proposal, /view-split-lease

**Current Code:**
```javascript
// File: app/src/logic/processors/proposal/processProposalData.js (NEWER - 149 lines)
export function processProposalData({ rawProposal, listing = null, guest = null, host = null }) {
  if (!rawProposal) {
    throw new Error('processProposalData: rawProposal cannot be null or undefined')
  }
  // ... returns currentTerms/originalTerms shape
  return {
    id: rawProposal._id,
    listingId: rawProposal.Listing,
    guestId: rawProposal.Guest,
    status,
    currentTerms,
    originalTerms,
    hasCounteroffer: hasHostCounteroffer,
    // ...
  }
}

// File: app/src/logic/processors/proposals/processProposalData.js (OLDER - 305 lines)
export function processProposalData(rawProposal) {
  if (!rawProposal) {
    throw new Error('processProposalData: Proposal data is required');
  }
  // Auto-processes nested listing, host, virtualMeeting
  const listing = processListingData(rawProposal.listing);
  const host = processHostData(rawProposal.listing?.host);
  const virtualMeeting = processVirtualMeetingData(rawProposal.virtualMeeting);
  // ... returns flat shape with daysSelected, nightsSelected, etc.
  return {
    id: rawProposal._id,
    daysSelected: rawProposal['Days Selected'] || [],
    nightsSelected: rawProposal['Nights Selected (Nights list)'] || [],
    listing,
    host,
    virtualMeeting,
    // ...
  }
}
```

**Refactored Code:**
```javascript
// STEP 1: Keep ONLY app/src/logic/processors/proposal/processProposalData.js
// STEP 2: Delete app/src/logic/processors/proposals/processProposalData.js entirely
// STEP 3: Move helper functions (processListingData, processHostData, processVirtualMeetingData,
//         formatPrice, formatDate, formatDateTime, getProposalDisplayText, getEffectiveTerms)
//         to separate files if needed elsewhere

// The newer implementation in processors/proposal/ is preferred because:
// 1. It uses named parameters (more explicit)
// 2. It properly handles counteroffer merging via currentTerms/originalTerms
// 3. It follows the "No Fallback" principle with explicit error messages
// 4. It doesn't auto-process nested data (allows for lazy loading)

// If helper functions are needed, create:
// app/src/logic/processors/listing/processListingData.js
// app/src/logic/processors/user/processHostData.js
// app/src/logic/processors/virtualMeeting/processVirtualMeetingData.js
```

**Testing:**
- [ ] Search for all imports of `from '../../processors/proposals/processProposalData'`
- [ ] Update imports to use `from '../../processors/proposal/processProposalData'`
- [ ] Run `bun run build` to verify no import errors
- [ ] Test /my-proposals page loads correctly
- [ ] Test /proposal page displays proposal details correctly

~~~~~

### CHUNK 2: Consolidate duplicate cancelProposalWorkflow workflows
**File:** `app/src/logic/workflows/booking/cancelProposalWorkflow.js`, `app/src/logic/workflows/proposals/cancelProposalWorkflow.js`
**Line:** 1-143 (booking), 1-176 (proposals)
**Issue:** Two completely different cancellation workflow implementations with different business logic:
- `workflows/booking/cancelProposalWorkflow.js` (143 lines): Complex 7-variation decision tree based on source, usualOrder, and house manual access. Requires `canCancelProposal` rule function as parameter.
- `workflows/proposals/cancelProposalWorkflow.js` (176 lines): Simpler implementation with `determineCancellationCondition`, `executeCancelProposal`, `cancelProposalFromCompareTerms`, and `executeDeleteProposal` functions.

**Affected Pages:** /my-proposals, /proposal

**Current Code:**
```javascript
// File: app/src/logic/workflows/booking/cancelProposalWorkflow.js (Complex decision tree)
export async function cancelProposalWorkflow({
  supabase,
  proposal,
  source = 'main',
  canCancelProposal
}) {
  // Decision tree: 7 variations based on source, usualOrder, houseManualAccessed
  // Returns: { success, message, updated, requiresPhoneCall }
}

// File: app/src/logic/workflows/proposals/cancelProposalWorkflow.js (Multiple exports)
export function determineCancellationCondition(proposal) { /* ... */ }
export async function executeCancelProposal(proposalId, reason = null) { /* ... */ }
export async function cancelProposalFromCompareTerms(proposalId, reason) { /* ... */ }
export async function executeDeleteProposal(proposalId) { /* ... */ }
```

**Refactored Code:**
```javascript
// KEEP: app/src/logic/workflows/booking/cancelProposalWorkflow.js (the complex decision tree)
// REASON: It implements the full 7-variation business logic from Bubble.io

// MIGRATE from proposals/cancelProposalWorkflow.js:
// - Move determineCancellationCondition() to booking/cancelProposalWorkflow.js
// - Move executeDeleteProposal() to booking/cancelProposalWorkflow.js
// - executeCancelProposal() is already handled by the main workflow

// DELETE: app/src/logic/workflows/proposals/cancelProposalWorkflow.js

// Final consolidated file: app/src/logic/workflows/booking/cancelProposalWorkflow.js
import { PROPOSAL_STATUSES } from '../../constants/proposalStatuses.js'
import { canCancelProposal as canCancelProposalRule } from '../../rules/proposals/canCancelProposal.js'

export async function cancelProposalWorkflow({
  supabase,
  proposal,
  source = 'main',
  canCancelProposal = canCancelProposalRule
}) {
  // ... existing 7-variation decision tree
}

export function determineCancellationCondition(proposal) {
  // Migrated from proposals/cancelProposalWorkflow.js
}

export async function executeDeleteProposal(supabase, proposalId) {
  // Migrated from proposals/cancelProposalWorkflow.js
  // Added supabase parameter for consistency
}
```

**Testing:**
- [ ] Search for all imports of `from '../../workflows/proposals/cancelProposalWorkflow'`
- [ ] Update imports to use `from '../../workflows/booking/cancelProposalWorkflow'`
- [ ] Run `bun run build` to verify no import errors
- [ ] Test cancel proposal flow from /my-proposals
- [ ] Test cancel proposal flow from Compare Terms modal

~~~~~

### CHUNK 3: Fix malformed JSDoc in isContiguousSelection.js
**File:** `app/src/logic/calculators/scheduling/isContiguousSelection.js`
**Line:** 5
**Issue:** Line 5 contains a malformed JSDoc `@param` tag that references a deprecated file path instead of proper parameter documentation: `@.claude\plans\Deprecated\Context\Option Sets\ZEP - Curation Parameters(OS).md {number[]} selectedDays`

**Affected Pages:** /search, /view-split-lease, /proposal (any page using day selection)

**Current Code:**
```javascript
/**
 * Check if selected days form a contiguous block.
 * Handles week wrap-around cases (e.g., Fri-Mon).
 *
 * @.claude\plans\Deprecated\Context\Option Sets\ZEP - Curation Parameters(OS).md {number[]} selectedDays - Array of day indices (0-6).
 * @returns {boolean} True if days are contiguous.
 */
export function isContiguousSelection(selectedDays) {
```

**Refactored Code:**
```javascript
/**
 * Check if selected days form a contiguous block.
 * Handles week wrap-around cases (e.g., Fri-Mon selection spans Sat/Sun boundary).
 *
 * @param {number[]} selectedDays - Array of day indices (0=Sunday through 6=Saturday).
 * @returns {boolean} True if days form a contiguous block, false otherwise.
 *
 * @example
 * isContiguousSelection([1, 2, 3]) // => true (Mon-Wed)
 * isContiguousSelection([5, 6, 0, 1]) // => true (Fri-Mon wrap-around)
 * isContiguousSelection([1, 3, 5]) // => false (gaps)
 */
export function isContiguousSelection(selectedDays) {
```

**Testing:**
- [ ] Run `bun run build` to verify no syntax errors
- [ ] Verify JSDoc renders correctly in IDE tooltips

~~~~~

### CHUNK 4: Remove fallback logic from getCancellationReasonOptions
**File:** `app/src/logic/rules/proposals/proposalRules.js`
**Line:** 298-316
**Issue:** The `getCancellationReasonOptions()` function includes hardcoded fallback values, which violates the "Building for Truth" / "No Fallback" principle documented in CLAUDE.md. If the cache is empty, the function should throw an explicit error rather than silently returning stale data.

**Affected Pages:** /my-proposals (cancel modal)

**Current Code:**
```javascript
/**
 * Get available cancellation reason options for guests
 * Fetches from cached reference data (initialized via dataLookups.js)
 * Falls back to hardcoded values if cache is empty (for resilience during initialization)
 *
 * @returns {Array<string>} Array of reason option strings
 */
export function getCancellationReasonOptions() {
  const cachedReasons = getGuestCancellationReasons();

  if (cachedReasons.length > 0) {
    return cachedReasons.map(r => r.reason);
  }

  // Fallback for initial render before cache is populated
  console.warn('[getCancellationReasonOptions] Cache empty, using fallback values');
  return [
    'Found another property',
    'Changed move-in dates',
    'Changed budget',
    'Changed location preference',
    'No longer need housing',
    'Host not responsive',
    'Terms not acceptable',
    'Other'
  ];
}
```

**Refactored Code:**
```javascript
/**
 * Get available cancellation reason options for guests.
 * Fetches from cached reference data (initialized via dataLookups.js).
 *
 * @intent Return authoritative cancellation reasons from the database.
 * @rule NO FALLBACK - Throws if cache is not populated.
 * @returns {Array<string>} Array of reason option strings.
 * @throws {Error} If cancellation reasons cache is empty (not initialized).
 *
 * @example
 * const reasons = getCancellationReasonOptions();
 * // => ['Found another property', 'Changed move-in dates', ...]
 */
export function getCancellationReasonOptions() {
  const cachedReasons = getGuestCancellationReasons();

  if (cachedReasons.length === 0) {
    throw new Error(
      'getCancellationReasonOptions: Cancellation reasons cache is empty. ' +
      'Ensure dataLookups.initializeReferenceData() is called before accessing this function.'
    );
  }

  return cachedReasons.map(r => r.reason);
}
```

**Testing:**
- [ ] Verify `initializeReferenceData()` is called in app bootstrap
- [ ] Test cancel modal loads reasons correctly on /my-proposals
- [ ] Verify explicit error is thrown if cache is empty (dev environment test)

~~~~~

### CHUNK 5: Consolidate duplicate canCancelProposal rule functions
**File:** `app/src/logic/rules/proposals/proposalRules.js`, `app/src/logic/rules/proposals/canCancelProposal.js`
**Line:** 26-54 (proposalRules.js), 1-48 (canCancelProposal.js)
**Issue:** The `canCancelProposal` function is implemented twice with slightly different APIs:
- `proposalRules.js:26-54`: Takes `proposal` object, accesses `proposal.status || proposal.Status`
- `canCancelProposal.js:27-47`: Takes `{proposalStatus, deleted}` named parameters

This violates the Single Responsibility Principle and creates confusion about which implementation to use.

**Affected Pages:** /my-proposals, /proposal

**Current Code:**
```javascript
// File: app/src/logic/rules/proposals/proposalRules.js (lines 26-54)
export function canCancelProposal(proposal) {
  if (!proposal) {
    return false;
  }
  const status = proposal.status || proposal.Status;
  // ... check terminal/completed/expired statuses
  return true;
}

// File: app/src/logic/rules/proposals/canCancelProposal.js (lines 27-47)
export function canCancelProposal({ proposalStatus, deleted = false }) {
  if (deleted) {
    return false;
  }
  if (!proposalStatus || typeof proposalStatus !== 'string') {
    return false;
  }
  const status = proposalStatus.trim();
  if (isTerminalStatus(status) || isCompletedStatus(status)) {
    return false;
  }
  return true;
}
```

**Refactored Code:**
```javascript
// KEEP: app/src/logic/rules/proposals/canCancelProposal.js (the dedicated rule file)
// REASON: It follows the four-layer architecture (dedicated rule files) and uses named parameters

// DELETE from proposalRules.js: canCancelProposal function (lines 26-54)

// UPDATE proposalRules.js to re-export from the dedicated file:
// File: app/src/logic/rules/proposals/proposalRules.js
import { canCancelProposal } from './canCancelProposal.js';

// Re-export for backward compatibility
export { canCancelProposal };

// Also update workflows/proposals/cancelProposalWorkflow.js import:
// FROM: import { canCancelProposal, requiresSpecialCancellationConfirmation } from '../../rules/proposals/proposalRules.js';
// TO: import { canCancelProposal } from '../../rules/proposals/canCancelProposal.js';
//     import { requiresSpecialCancellationConfirmation } from '../../rules/proposals/proposalRules.js';
```

**Testing:**
- [ ] Search for all imports of `canCancelProposal from proposalRules`
- [ ] Verify re-export works for backward compatibility
- [ ] Run `bun run build` to verify no import errors
- [ ] Test cancel button visibility on /my-proposals

~~~~~

## PAGE GROUP: /search, /view-split-lease (Chunks: 6)

### CHUNK 6: Extract shared validation utility for pricing calculators
**File:** `app/src/logic/calculators/pricing/calculatePricingBreakdown.js`, `app/src/logic/calculators/pricing/calculateReservationTotal.js`, `app/src/logic/calculators/pricing/calculateGuestFacingPrice.js`, `app/src/logic/calculators/pricing/calculateFourWeekRent.js`
**Line:** Various (validation boilerplate at start of each function)
**Issue:** Repeated input validation patterns across pricing calculators (type checks, range checks, null guards). Each calculator independently validates numeric inputs with similar boilerplate. This could be consolidated into a shared validation utility.

**Affected Pages:** /search, /view-split-lease, /proposal

**Current Code:**
```javascript
// Pattern repeated in multiple pricing calculators:
export function calculatePricingBreakdown({ nightlyRate, nights, cleaningFee, securityDeposit }) {
  if (typeof nightlyRate !== 'number' || nightlyRate < 0) {
    throw new Error('calculatePricingBreakdown: nightlyRate must be a non-negative number');
  }
  if (typeof nights !== 'number' || nights < 1) {
    throw new Error('calculatePricingBreakdown: nights must be a positive number');
  }
  // ... similar validation for other params
}

export function calculateReservationTotal({ baseRent, serviceFee, cleaningFee }) {
  if (typeof baseRent !== 'number' || baseRent < 0) {
    throw new Error('calculateReservationTotal: baseRent must be a non-negative number');
  }
  // ... similar validation
}
```

**Refactored Code:**
```javascript
// NEW FILE: app/src/logic/validators/pricingValidators.js

/**
 * Validate that a value is a non-negative number.
 * @param {*} value - Value to validate
 * @param {string} paramName - Parameter name for error message
 * @param {string} functionName - Function name for error message
 * @throws {Error} If validation fails
 */
export function validateNonNegativeNumber(value, paramName, functionName) {
  if (typeof value !== 'number' || isNaN(value) || value < 0) {
    throw new Error(`${functionName}: ${paramName} must be a non-negative number, got ${typeof value}: ${value}`);
  }
}

/**
 * Validate that a value is a positive integer.
 * @param {*} value - Value to validate
 * @param {string} paramName - Parameter name for error message
 * @param {string} functionName - Function name for error message
 * @throws {Error} If validation fails
 */
export function validatePositiveInteger(value, paramName, functionName) {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    throw new Error(`${functionName}: ${paramName} must be a positive integer, got ${typeof value}: ${value}`);
  }
}

// UPDATED: app/src/logic/calculators/pricing/calculatePricingBreakdown.js
import { validateNonNegativeNumber, validatePositiveInteger } from '../../validators/pricingValidators.js';

export function calculatePricingBreakdown({ nightlyRate, nights, cleaningFee, securityDeposit }) {
  validateNonNegativeNumber(nightlyRate, 'nightlyRate', 'calculatePricingBreakdown');
  validatePositiveInteger(nights, 'nights', 'calculatePricingBreakdown');
  validateNonNegativeNumber(cleaningFee, 'cleaningFee', 'calculatePricingBreakdown');
  validateNonNegativeNumber(securityDeposit, 'securityDeposit', 'calculatePricingBreakdown');
  // ... rest of function
}
```

**Testing:**
- [ ] Create new validators file
- [ ] Update each pricing calculator to use shared validators
- [ ] Run `bun run build` to verify no import errors
- [ ] Verify pricing calculations work on /search and /view-split-lease

~~~~~

## PAGE GROUP: AUTO (Chunks: 7)

### CHUNK 7: Fix calculateCheckInOutFromDays edge case handling
**File:** `app/src/logic/calculators/scheduling/calculateCheckInOutFromDays.js`
**Line:** 9-41
**Issue:** The function throws an error if `selectedDays.length < 2`, but single-day rentals are valid in some contexts. Additionally, the wrap-around detection could produce incorrect results for certain edge cases (e.g., `[0, 6]` where both days are selected but they're not actually contiguous in a wrap-around sense).

**Affected Pages:** /search, /view-split-lease, /proposal (any page with day selection)

**Current Code:**
```javascript
export function calculateCheckInOutFromDays(selectedDays) {
  if (!selectedDays || selectedDays.length < 2) {
    throw new Error('calculateCheckInOutFromDays: selectedDays must contain at least 2 days');
  }

  const sortedDays = [...selectedDays].sort((a, b) => a - b);
  const hasSaturday = sortedDays.includes(6);
  const hasSunday = sortedDays.includes(0);
  const isWrapAround = hasSaturday && hasSunday && sortedDays.length < 7;

  if (isWrapAround) {
    let gapIndex = -1;
    for (let i = 1; i < sortedDays.length; i++) {
      if (sortedDays[i] - sortedDays[i - 1] > 1) {
        gapIndex = i;
        break;
      }
    }
    if (gapIndex !== -1) {
      return {
        checkIn: sortedDays[gapIndex],
        checkOut: sortedDays[gapIndex - 1]
      };
    }
  }

  return {
    checkIn: sortedDays[0],
    checkOut: sortedDays[sortedDays.length - 1]
  };
}
```

**Refactored Code:**
```javascript
/**
 * Calculate check-in and check-out days from selected day indices.
 * Handles wrap-around scenarios (e.g., Fri-Mon selection spans Sat/Sun boundary).
 *
 * @param {number[]} selectedDays - Array of day indices (0=Sun, 6=Sat)
 * @returns {{ checkIn: number, checkOut: number } | null} Check-in/out days, or null for single-day
 * @throws {Error} If selectedDays is null/undefined or empty
 *
 * @example
 * calculateCheckInOutFromDays([1, 2, 3]) // => { checkIn: 1, checkOut: 3 }
 * calculateCheckInOutFromDays([5, 6, 0, 1]) // => { checkIn: 5, checkOut: 1 } (wrap-around)
 * calculateCheckInOutFromDays([3]) // => null (single-day, no check-in/out distinction)
 */
export function calculateCheckInOutFromDays(selectedDays) {
  if (!selectedDays || selectedDays.length === 0) {
    throw new Error('calculateCheckInOutFromDays: selectedDays must be a non-empty array');
  }

  // Single-day selection: no check-in/out distinction
  if (selectedDays.length === 1) {
    return null;
  }

  const sortedDays = [...selectedDays].sort((a, b) => a - b);

  // Check for wrap-around: has both 0 (Sun) and 6 (Sat), and not all 7 days
  const hasSunday = sortedDays.includes(0);
  const hasSaturday = sortedDays.includes(6);
  const isWrapAround = hasSunday && hasSaturday && sortedDays.length < 7;

  if (isWrapAround) {
    // Find the gap in the sorted array
    for (let i = 1; i < sortedDays.length; i++) {
      if (sortedDays[i] - sortedDays[i - 1] > 1) {
        // Gap found: check-in is after the gap, check-out is before the gap
        return {
          checkIn: sortedDays[i],
          checkOut: sortedDays[i - 1]
        };
      }
    }
    // No gap found but has wrap-around markers: edge case [0, 6] only
    // In this case, treat as non-contiguous selection
    return {
      checkIn: sortedDays[0],
      checkOut: sortedDays[sortedDays.length - 1]
    };
  }

  // Standard case: first day is check-in, last day is check-out
  return {
    checkIn: sortedDays[0],
    checkOut: sortedDays[sortedDays.length - 1]
  };
}
```

**Testing:**
- [ ] Test standard contiguous selection: `[1, 2, 3]` => `{ checkIn: 1, checkOut: 3 }`
- [ ] Test wrap-around selection: `[5, 6, 0, 1]` => `{ checkIn: 5, checkOut: 1 }`
- [ ] Test single-day selection: `[3]` => `null`
- [ ] Test edge case: `[0, 6]` => `{ checkIn: 0, checkOut: 6 }`
- [ ] Run `bun run build` to verify no errors

~~~~~

## Summary of Changes

| Chunk | Type | Files Affected | Priority |
|-------|------|----------------|----------|
| 1 | Duplicate Removal | 2 | HIGH |
| 2 | Duplicate Removal | 2 | HIGH |
| 3 | JSDoc Fix | 1 | LOW |
| 4 | Fallback Violation | 1 | MEDIUM |
| 5 | Duplicate Removal | 2 | MEDIUM |
| 6 | Refactor | 4+ | LOW |
| 7 | Edge Case Fix | 1 | MEDIUM |

## Dependency Order

1. **Chunk 1** (processProposalData) - No dependencies
2. **Chunk 5** (canCancelProposal) - No dependencies
3. **Chunk 2** (cancelProposalWorkflow) - Depends on Chunk 5 being resolved
4. **Chunk 4** (fallback removal) - No dependencies
5. **Chunk 3** (JSDoc fix) - No dependencies
6. **Chunk 7** (edge case fix) - No dependencies
7. **Chunk 6** (validation utility) - No dependencies

## File References

### Critical Files (Modify with Caution)
- `app/src/logic/processors/proposal/processProposalData.js` - Core proposal processor
- `app/src/logic/workflows/booking/cancelProposalWorkflow.js` - Core cancellation workflow
- `app/src/logic/rules/proposals/proposalRules.js` - Central proposal rules
- `app/src/logic/constants/proposalStatuses.js` - Proposal status constants

### Files to Delete
- `app/src/logic/processors/proposals/processProposalData.js`
- `app/src/logic/workflows/proposals/cancelProposalWorkflow.js`

### Files to Create
- `app/src/logic/validators/pricingValidators.js` (optional, for Chunk 6)

### Import Chain Analysis
```
my-proposals page
  └── useMyProposalsPageLogic hook
      ├── processors/proposal/processProposalData.js (KEEP)
      ├── processors/proposals/processProposalData.js (DELETE)
      ├── workflows/booking/cancelProposalWorkflow.js (KEEP)
      ├── workflows/proposals/cancelProposalWorkflow.js (DELETE)
      └── rules/proposals/proposalRules.js
          └── rules/proposals/canCancelProposal.js
```
