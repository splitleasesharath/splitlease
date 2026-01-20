# Code Refactoring Plan - ../../app/src/logic

Date: 2026-01-20
Audit Type: general

## Summary

This audit identified **9 refactoring chunks** across the `app/src/logic` directory, focusing on:
- Duplicate file resolution (critical)
- Import path corrections
- Malformed JSDoc cleanup
- Function consolidation

## Dependency Impact Analysis

Files: 67 | Edge reduction: N/A (no circular dependencies detected)

### CRITICAL IMPACT - Duplicate Files
| File | Issue |
|------|-------|
| `processors/proposal/processProposalData.js` | Duplicate of `processors/proposals/processProposalData.js` |
| `workflows/booking/cancelProposalWorkflow.js` | Duplicate of `workflows/proposals/cancelProposalWorkflow.js` |

### HIGH IMPACT - Broken Imports
| File | Issue |
|------|-------|
| `rules/proposals/proposalButtonRules.js` | Imports from non-existent `../../../config/proposalStatusConfig.js` |

### LEAF FILES (safe to refactor)
- `calculators/scheduling/isContiguousSelection.js` (duplicate of rule)
- `calculators/scheduling/getNextOccurrenceOfDay.js` (malformed JSDoc)

~~~~~

## PAGE GROUP: /view-split-lease, /account-profile, /host-dashboard (Chunks: 1, 2)

### CHUNK 1: Remove duplicate processProposalData.js in processors/proposal/
**File:** `app/src/logic/processors/proposal/processProposalData.js`
**Line:** 1-149
**Issue:** Duplicate file. The `processors/proposals/processProposalData.js` (with 's') is the comprehensive version containing additional utilities like `processListingData`, `processHostData`, `formatPrice`, `formatDate`, `getEffectiveTerms`. The singular `proposal/` version is a subset that should be removed or consolidated.
**Affected Pages:** /view-split-lease, /account-profile, /host-dashboard

**Current Code:**
```javascript
/**
 * Process raw proposal data from Supabase into a clean, validated proposal object.
 *
 * @intent Transform raw proposal rows from Supabase into consistent, UI-ready format.
 * @rule NO FALLBACK - Throws explicit errors for missing critical fields.
 * @rule Merges original terms and counteroffer (host-changed) terms into single current terms.
 * @rule Handles dual proposal system (original vs host counteroffer).
 *
 * @param {object} params - Named parameters.
 * @param {object} params.rawProposal - Raw proposal object from Supabase.
 * @param {object} [params.listing] - Processed listing data (if already loaded).
 * @param {object} [params.guest] - Processed guest user data (if already loaded).
 * @param {object} [params.host] - Processed host user data (if already loaded).
 * @returns {object} Clean, validated proposal object with merged terms.
 *
 * @throws {Error} If rawProposal is null/undefined.
 * @throws {Error} If critical _id field is missing.
 * @throws {Error} If Listing or Guest reference is missing.
 *
 * @example
 * const proposal = processProposalData({
 *   rawProposal: {
 *     _id: 'abc123',
 *     Listing: 'listing123',
 *     Guest: 'user456',
 *     'Move-In Date': '2025-01-15',
 *     'Days of Week': [1, 2, 3],
 *     'hc Days of Week': null,
 *     'Proposal Status': 'Host Countered',
 *     ...
 *   }
 * })
 */
import { PROPOSAL_STATUSES, getUsualOrder } from '../../constants/proposalStatuses.js'

export function processProposalData({ rawProposal, listing = null, guest = null, host = null }) {
  // ... (149 lines)
}
```

**Refactored Code:**
```javascript
// DELETE THIS FILE
// All functionality has been consolidated into:
// app/src/logic/processors/proposals/processProposalData.js
//
// Update imports in consuming files to use:
// import { processProposalData } from '../../logic/processors/proposals/processProposalData.js'
```

**Testing:**
- [ ] Search codebase for imports from `processors/proposal/processProposalData`
- [ ] Update any imports to use `processors/proposals/processProposalData`
- [ ] Run build to verify no broken imports
- [ ] Delete the `processors/proposal/` directory if empty after removal

~~~~~

### CHUNK 2: Remove duplicate cancelProposalWorkflow.js in workflows/booking/
**File:** `app/src/logic/workflows/booking/cancelProposalWorkflow.js`
**Line:** 1-144
**Issue:** Duplicate workflow file. `workflows/proposals/cancelProposalWorkflow.js` has a more complete implementation with Supabase integration and additional helper functions (`executeCancelProposal`, `cancelProposalFromCompareTerms`, `executeDeleteProposal`). The `booking/` version should be removed.
**Affected Pages:** /view-split-lease, /account-profile

**Current Code:**
```javascript
/**
 * Workflow: Cancel a proposal with complex decision tree.
 *
 * @intent Orchestrate proposal cancellation following business rules.
 * @rule Implements complete cancellation decision tree (7 variations).
 * @rule Different actions based on: source, current status, usual order, house manual access.
 * @rule Updates Supabase with appropriate status and cancellation reason.
 *
 * Decision Tree (from WORKFLOW-PASS2-ASSIMILATION.md):
 * 1. Already cancelled → Show alert, no action
 * 2. Compare modal source + Usual Order ≤5 → Status: "Cancelled by Guest"
 * ...
 */
import { PROPOSAL_STATUSES } from '../../constants/proposalStatuses.js'

export async function cancelProposalWorkflow({
  supabase,
  proposal,
  source = 'main',
  canCancelProposal
}) {
  // ... (144 lines)
}
```

**Refactored Code:**
```javascript
// DELETE THIS FILE
// All functionality has been consolidated into:
// app/src/logic/workflows/proposals/cancelProposalWorkflow.js
//
// The proposals/ version exports:
// - determineCancellationCondition()
// - executeCancelProposal()
// - cancelProposalFromCompareTerms()
// - executeDeleteProposal()
//
// Update imports in consuming files to use:
// import { executeCancelProposal } from '../../logic/workflows/proposals/cancelProposalWorkflow.js'
```

**Testing:**
- [ ] Search codebase for imports from `workflows/booking/cancelProposalWorkflow`
- [ ] Update any imports to use `workflows/proposals/cancelProposalWorkflow`
- [ ] Run build to verify no broken imports
- [ ] Delete the file after verifying no references remain

~~~~~

## PAGE GROUP: /search, /view-listing (Chunks: 3)

### CHUNK 3: Fix broken import in proposalButtonRules.js
**File:** `app/src/logic/rules/proposals/proposalButtonRules.js`
**Line:** 1
**Issue:** File imports from a non-existent path `../../../config/proposalStatusConfig.js`. Should import from `../../constants/proposalStatuses.js` which is the correct location of `PROPOSAL_STATUSES` and `getStatusConfig`.
**Affected Pages:** /view-split-lease, /account-profile

**Current Code:**
```javascript
import { getStatusConfig, PROPOSAL_STATUS } from '../../../config/proposalStatusConfig.js';

/**
 * Compute button states for a proposal card (pure function).
 * @param {object} params - Named parameters
 * @returns {object} Button states
 */
export function computeProposalButtonStates({ proposal, virtualMeeting, guest, listing, currentUserId }) {
```

**Refactored Code:**
```javascript
import { getStatusConfig, PROPOSAL_STATUSES } from '../../constants/proposalStatuses.js';

// Also need to update PROPOSAL_STATUS to PROPOSAL_STATUSES throughout the file
// Update all references like PROPOSAL_STATUS.REJECTED_BY_HOST to PROPOSAL_STATUSES.REJECTED_BY_HOST.key

/**
 * Compute button states for a proposal card (pure function).
 * @param {object} params - Named parameters
 * @returns {object} Button states
 */
export function computeProposalButtonStates({ proposal, virtualMeeting, guest, listing, currentUserId }) {
```

**Testing:**
- [ ] Verify `PROPOSAL_STATUSES` is exported from `constants/proposalStatuses.js`
- [ ] Update all `PROPOSAL_STATUS.*` references to `PROPOSAL_STATUSES.*.key`
- [ ] Run build to verify no runtime errors
- [ ] Test proposal card button states on /view-split-lease page

~~~~~

## PAGE GROUP: /create-proposal, /edit-proposal (Chunks: 4, 5)

### CHUNK 4: Fix malformed JSDoc in getNextOccurrenceOfDay.js
**File:** `app/src/logic/calculators/scheduling/getNextOccurrenceOfDay.js`
**Line:** 6-7
**Issue:** JSDoc contains embedded file paths instead of proper @param tags. This is likely from a copy-paste error or tool corruption.
**Affected Pages:** /create-proposal, /edit-proposal

**Current Code:**
```javascript
import { daysUntilDayOfWeek } from '../../../lib/dayUtils.js'

/**
 * Calculate the next occurrence of a specific day-of-week on or after a starting date.
 *
 * @.claude\plans\Deprecated\Context\Option Sets\ZEP - Curation Parameters(OS).md {Date} startDate - The date to start searching from.
 * @.claude\plans\Deprecated\Context\Option Sets\ZEP - Curation Parameters(OS).md {number} targetDayOfWeek - Day index (0-6, where 0=Sunday).
 * @returns {Date} The next occurrence of the target day.
 */
export function getNextOccurrenceOfDay(startDate, targetDayOfWeek) {
```

**Refactored Code:**
```javascript
import { daysUntilDayOfWeek } from '../../../lib/dayUtils.js'

/**
 * Calculate the next occurrence of a specific day-of-week on or after a starting date.
 *
 * @param {Date} startDate - The date to start searching from.
 * @param {number} targetDayOfWeek - Day index (0-6, where 0=Sunday).
 * @returns {Date} The next occurrence of the target day.
 */
export function getNextOccurrenceOfDay(startDate, targetDayOfWeek) {
```

**Testing:**
- [ ] Verify function still works correctly after JSDoc fix
- [ ] Run linter to confirm JSDoc is now valid

~~~~~

### CHUNK 5: Fix malformed JSDoc in isContiguousSelection.js
**File:** `app/src/logic/calculators/scheduling/isContiguousSelection.js`
**Line:** 5-6
**Issue:** JSDoc contains embedded file paths instead of proper @param tags. Same corruption pattern as getNextOccurrenceOfDay.js.
**Affected Pages:** /create-proposal, /edit-proposal

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
 * Handles week wrap-around cases (e.g., Fri-Mon).
 *
 * @param {number[]} selectedDays - Array of day indices (0-6).
 * @returns {boolean} True if days are contiguous.
 */
export function isContiguousSelection(selectedDays) {
```

**Testing:**
- [ ] Verify function still works correctly after JSDoc fix
- [ ] Run linter to confirm JSDoc is now valid

~~~~~

## PAGE GROUP: /create-proposal, /search (Chunks: 6)

### CHUNK 6: Consolidate duplicate contiguous selection validators
**File:** `app/src/logic/calculators/scheduling/isContiguousSelection.js`
**Line:** 1-31
**Issue:** This file duplicates functionality from `rules/scheduling/isScheduleContiguous.js`. The rule version has more comprehensive validation (throws on invalid input) and better documentation. The calculator version should be deprecated in favor of the rule.
**Affected Pages:** /create-proposal, /search

**Current Code:**
```javascript
/**
 * Check if selected days form a contiguous block.
 * Handles week wrap-around cases (e.g., Fri-Mon).
 *
 * @param {number[]} selectedDays - Array of day indices (0-6).
 * @returns {boolean} True if days are contiguous.
 */
export function isContiguousSelection(selectedDays) {
  if (!selectedDays || selectedDays.length === 0) return false;
  if (selectedDays.length === 1) return true;
  if (selectedDays.length >= 6) return true;

  const sorted = [...selectedDays].sort((a, b) => a - b);
  const isStandardContiguous = sorted.every((day, i) => i === 0 || day === sorted[i - 1] + 1);
  if (isStandardContiguous) return true;

  // Wrap-around check
  const hasZero = sorted.includes(0);
  const hasSix = sorted.includes(6);
  if (hasZero && hasSix) {
    const allDays = [0, 1, 2, 3, 4, 5, 6];
    const notSelectedDays = allDays.filter(d => !sorted.includes(d));

    const minNotSelected = Math.min(...notSelectedDays);
    const maxNotSelected = Math.max(...notSelectedDays);

    return notSelectedDays.length === (maxNotSelected - minNotSelected + 1);
  }

  return false;
}
```

**Refactored Code:**
```javascript
/**
 * @deprecated Use isScheduleContiguous from rules/scheduling/isScheduleContiguous.js instead.
 * This function is maintained for backward compatibility only.
 *
 * Check if selected days form a contiguous block.
 * Handles week wrap-around cases (e.g., Fri-Mon).
 *
 * @param {number[]} selectedDays - Array of day indices (0-6).
 * @returns {boolean} True if days are contiguous.
 */
import { isScheduleContiguous } from '../../rules/scheduling/isScheduleContiguous.js';

export function isContiguousSelection(selectedDays) {
  // Delegate to canonical implementation
  // Wrap in try-catch to maintain backward compatibility (returns false instead of throwing)
  try {
    return isScheduleContiguous({ selectedDayIndices: selectedDays });
  } catch {
    return false;
  }
}
```

**Testing:**
- [ ] Verify both functions produce identical results for valid input
- [ ] Update consuming files to import from `rules/scheduling/isScheduleContiguous.js`
- [ ] Run unit tests for scheduling functionality

~~~~~

## PAGE GROUP: /create-proposal (Chunks: 7)

### CHUNK 7: Consolidate duplicate check-in/check-out calculators
**File:** `app/src/logic/calculators/scheduling/calculateCheckInOutFromDays.js`
**Line:** 1-42
**Issue:** This file has overlapping functionality with `calculateCheckInOutDays.js`. Key differences: (1) FromDays requires at least 2 days, Days allows 1, (2) FromDays returns `{checkIn, checkOut}`, Days returns `{checkInDay, checkOutDay, checkInName, checkOutName}`, (3) FromDays doesn't include the "+1 for checkout" logic. These should be unified with a single canonical version.
**Affected Pages:** /create-proposal, /edit-proposal

**Current Code:**
```javascript
/**
 * Calculate check-in and check-out days from selected day indices
 * Handles wrap-around scenarios (e.g., Fri-Mon selection)
 *
 * @param {number[]} selectedDays - Array of day indices (0=Sun, 6=Sat)
 * @returns {{ checkIn: number, checkOut: number }}
 * @throws {Error} If selectedDays is null/undefined or has less than 2 days
 */
export function calculateCheckInOutFromDays(selectedDays) {
  if (!selectedDays || selectedDays.length < 2) {
    throw new Error('calculateCheckInOutFromDays: selectedDays must contain at least 2 days');
  }

  const sortedDays = [...selectedDays].sort((a, b) => a - b);
  const hasSaturday = sortedDays.includes(6);
  const hasSunday = sortedDays.includes(0);
  const isWrapAround = hasSaturday && hasSunday && sortedDays.length < 7;

  if (isWrapAround) {
    // Find the gap to determine actual boundaries
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
 * Handles wrap-around scenarios (e.g., Fri-Mon selection).
 *
 * NOTE: checkOut is the LAST SELECTED day, not the day AFTER.
 * For checkout as the day after the last stay, use calculateCheckInOutDays.js
 *
 * @param {number[]} selectedDays - Array of day indices (0=Sun, 6=Sat)
 * @returns {{ checkIn: number, checkOut: number }}
 * @throws {Error} If selectedDays is null/undefined or has less than 2 days
 *
 * @see calculateCheckInOutDays for a version that returns checkout as day AFTER last selected
 */
export function calculateCheckInOutFromDays(selectedDays) {
  if (!selectedDays || selectedDays.length < 2) {
    throw new Error('calculateCheckInOutFromDays: selectedDays must contain at least 2 days');
  }

  const sortedDays = [...selectedDays].sort((a, b) => a - b);
  const hasSaturday = sortedDays.includes(6);
  const hasSunday = sortedDays.includes(0);
  const isWrapAround = hasSaturday && hasSunday && sortedDays.length < 7;

  if (isWrapAround) {
    // Find the gap to determine actual boundaries
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

**Testing:**
- [ ] Document the semantic difference between the two functions
- [ ] Verify which version is used where in the codebase
- [ ] Consider whether to merge or keep both with clear naming

~~~~~

## PAGE GROUP: /account-profile, /host-dashboard (Chunks: 8)

### CHUNK 8: Add missing exports to proposalStatuses.js for proposalButtonRules compatibility
**File:** `app/src/logic/constants/proposalStatuses.js`
**Line:** 384 (end of file)
**Issue:** `proposalButtonRules.js` expects a `PROPOSAL_STATUS` constant with direct key access (e.g., `PROPOSAL_STATUS.REJECTED_BY_HOST`). The current export is `PROPOSAL_STATUSES` which is an object of objects. Need to either add a compatibility export or update proposalButtonRules.js.
**Affected Pages:** /account-profile, /host-dashboard

**Current Code:**
```javascript
// End of proposalStatuses.js - current exports
export function isPendingConfirmationProposal(statusKey) {
  const config = getStatusConfig(statusKey);
  return config.isSuggestedBySL === true && config.guestConfirmed === false;
}
```

**Refactored Code:**
```javascript
// End of proposalStatuses.js - add compatibility export
export function isPendingConfirmationProposal(statusKey) {
  const config = getStatusConfig(statusKey);
  return config.isSuggestedBySL === true && config.guestConfirmed === false;
}

/**
 * Flat key-to-key mapping for direct status access.
 * @deprecated Prefer PROPOSAL_STATUSES for full configuration access.
 * This export maintains backward compatibility with proposalButtonRules.js
 */
export const PROPOSAL_STATUS = Object.fromEntries(
  Object.entries(PROPOSAL_STATUSES).map(([enumKey, config]) => [enumKey, config.key])
);
```

**Testing:**
- [ ] Verify `PROPOSAL_STATUS.REJECTED_BY_HOST` returns the correct status key string
- [ ] Test proposalButtonRules.js with the new export
- [ ] Run build to verify no broken imports

~~~~~

## PAGE GROUP: AUTO (Chunks: 9)

### CHUNK 9: Remove empty processors/proposal/ directory
**File:** `app/src/logic/processors/proposal/` (directory)
**Line:** N/A
**Issue:** After removing the duplicate `processProposalData.js`, this directory will be empty. Empty directories should be removed to maintain clean project structure.
**Affected Pages:** AUTO

**Current Code:**
```
app/src/logic/processors/proposal/
└── processProposalData.js  (to be deleted in Chunk 1)
```

**Refactored Code:**
```
(Directory removed entirely)
```

**Testing:**
- [ ] Verify no other files exist in the directory
- [ ] Remove the directory
- [ ] Verify build still succeeds

~~~~~

## Chunk Summary by Dependency Level

| Level | Chunk | Files | Rationale |
|-------|-------|-------|-----------|
| 0 (Leaf) | 4, 5 | `getNextOccurrenceOfDay.js`, `isContiguousSelection.js` | JSDoc fixes, no dependencies |
| 0 (Leaf) | 8 | `proposalStatuses.js` | Add export, no code changes |
| 1 | 3 | `proposalButtonRules.js` | Fix import after Chunk 8 |
| 1 | 6 | `isContiguousSelection.js` | Delegate to rule after JSDoc fix |
| 1 | 7 | `calculateCheckInOutFromDays.js` | Document distinction |
| 2 | 1, 2 | Duplicate files | Remove after updating imports |
| 3 | 9 | Directory cleanup | After file removal |

## Execution Order

1. **Phase 1** (Leaf fixes): Chunks 4, 5, 8
2. **Phase 2** (Import fixes): Chunk 3
3. **Phase 3** (Consolidation): Chunks 6, 7
4. **Phase 4** (Cleanup): Chunks 1, 2, 9

## Files Referenced

- `app/src/logic/processors/proposal/processProposalData.js` (DELETE)
- `app/src/logic/processors/proposals/processProposalData.js` (KEEP)
- `app/src/logic/workflows/booking/cancelProposalWorkflow.js` (DELETE)
- `app/src/logic/workflows/proposals/cancelProposalWorkflow.js` (KEEP)
- `app/src/logic/rules/proposals/proposalButtonRules.js` (FIX IMPORT)
- `app/src/logic/calculators/scheduling/getNextOccurrenceOfDay.js` (FIX JSDOC)
- `app/src/logic/calculators/scheduling/isContiguousSelection.js` (FIX JSDOC + DEPRECATE)
- `app/src/logic/calculators/scheduling/calculateCheckInOutFromDays.js` (DOCUMENT)
- `app/src/logic/constants/proposalStatuses.js` (ADD EXPORT)
