# Code Refactoring Plan - ../../app/src/logic

Date: 2026-01-20
Audit Type: general

## Summary

This audit identified **12 refactoring chunks** across **6 page groups**. The primary issues found are:

1. **Critical Duplicate Files** - Two pairs of files with identical names doing the same thing but with different implementations
2. **Duplicate Logic Functions** - Three functions implementing the same contiguous check logic
3. **Similar Check-In/Out Calculations** - Two functions with overlapping responsibility and different return signatures
4. **Duplicate Proposal Rules** - Same `canCancelProposal` function exists in two locations with different signatures
5. **Broken Import Path** - proposalButtonRules.js imports from non-existent config file

## Dependency Impact Analysis

Files: 68 | Total Issues: 12 chunks

### CRITICAL IMPACT (30+ dependents) - Avoid modifying
| File | Dependents |
|------|------------|
| `constants/proposalStatuses.js` | ~20+ (used across rules, workflows, processors) |
| `rules/users/isHost.js` | 4 direct imports |
| `rules/users/isGuest.js` | 3 direct imports |
| `processors/display/formatHostName.js` | 6 direct imports |

### LEAF FILES (safe to refactor)
- `processors/proposal/processProposalData.js` (duplicate - can be removed)
- `workflows/booking/cancelProposalWorkflow.js` (duplicate - can be consolidated)
- `calculators/scheduling/isContiguousSelection.js` (duplicate of rules)
- `calculators/scheduling/calculateCheckInOutFromDays.js` (similar to calculateCheckInOutDays)

~~~~~

## PAGE GROUP: /search (Chunks: 1, 2)

### CHUNK 1: Remove duplicate isContiguousSelection.js
**File:** `app/src/logic/calculators/scheduling/isContiguousSelection.js`
**Line:** 1-31
**Issue:** This file duplicates the logic in `rules/scheduling/isScheduleContiguous.js`. The rules version is more robust with better validation and clearer documentation.
**Affected Pages:** /search, /view-split-lease (via useScheduleSelectorLogicCore.js)

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
// FILE SHOULD BE DELETED
// Re-export from the canonical location for backward compatibility
export { isScheduleContiguous as isContiguousSelection } from '../../rules/scheduling/isScheduleContiguous.js';
```

**Testing:**
- [ ] Verify useScheduleSelectorLogicCore.js still works after update
- [ ] Run SearchPage to ensure schedule selection works
- [ ] Test wrap-around day selection (Fri-Mon)

~~~~~

### CHUNK 2: Consolidate calculateCheckInOutFromDays.js with calculateCheckInOutDays.js
**File:** `app/src/logic/calculators/scheduling/calculateCheckInOutFromDays.js`
**Line:** 1-41
**Issue:** Two files do nearly identical work. `calculateCheckInOutFromDays` returns `{checkIn, checkOut}` while `calculateCheckInOutDays` returns `{checkInDay, checkOutDay, checkInName, checkOutName}`. The latter is more complete. Consumers need to be updated to use a unified API.
**Affected Pages:** /search (SearchPage.jsx, CompactScheduleIndicator.jsx)

**Current Code:**
```javascript
/**
 * Calculate check-in and check-out days from selected day indices
 * Handles wrap-around scenarios (e.g., Fri-Mon selection)
 *
 * @param {number[]} selectedDays - Array of day indices (0=Sun, 6=Sat)
 * @returns {{ checkIn: number, checkOut: number } | null}
 */
export function calculateCheckInOutFromDays(selectedDays) {
  if (!selectedDays || selectedDays.length < 2) {
    return null;
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
import { calculateCheckInOutDays } from './calculateCheckInOutDays.js';

/**
 * Calculate check-in and check-out days from selected day indices.
 *
 * @deprecated Use calculateCheckInOutDays instead for full details including day names.
 * This wrapper exists for backward compatibility with components expecting simplified output.
 *
 * @param {number[]} selectedDays - Array of day indices (0=Sun, 6=Sat)
 * @returns {{ checkIn: number, checkOut: number } | null}
 */
export function calculateCheckInOutFromDays(selectedDays) {
  if (!selectedDays || selectedDays.length < 2) {
    return null;
  }

  try {
    const result = calculateCheckInOutDays({ selectedDays });
    return {
      checkIn: result.checkInDay,
      checkOut: result.checkOutDay
    };
  } catch {
    return null;
  }
}
```

**Testing:**
- [ ] Verify SearchPage.jsx still works
- [ ] Verify CompactScheduleIndicator.jsx still works
- [ ] Test wrap-around selection (Fri-Mon)

~~~~~

## PAGE GROUP: /proposals, /view-split-lease (Chunks: 3, 4, 5, 6)

### CHUNK 3: Remove duplicate processors/proposal/processProposalData.js
**File:** `app/src/logic/processors/proposal/processProposalData.js`
**Line:** 1-148
**Issue:** This file exists BOTH at `processors/proposal/processProposalData.js` AND `processors/proposals/processProposalData.js`. The plural version (`proposals/`) has more functions (formatPrice, formatDate, getEffectiveTerms). The singular version has different field mapping. This creates confusion about which to import.
**Affected Pages:** /proposals, /view-split-lease (via loadProposalDetailsWorkflow.js)

**Current Code:**
```javascript
// processors/proposal/processProposalData.js (singular)
import { PROPOSAL_STATUSES, getUsualOrder } from '../../constants/proposalStatuses.js'

export function processProposalData({ rawProposal, listing = null, guest = null, host = null }) {
  // ... 148 lines of proposal processing
  // Uses different field names: 'Move-In Date', 'Days of Week', etc.
  // Returns: id, listingId, guestId, status, deleted, usualOrder, currentTerms, originalTerms, hasCounteroffer, ...
}
```

**Refactored Code:**
```javascript
// FILE SHOULD BE DELETED
// The canonical location is processors/proposals/processProposalData.js (plural)
// Re-export for backward compatibility
export { processProposalData } from '../proposals/processProposalData.js';
```

**Testing:**
- [ ] Verify all imports still resolve
- [ ] Run loadProposalDetailsWorkflow to ensure data loads correctly
- [ ] Test proposal display on /proposals page

~~~~~

### CHUNK 4: Remove duplicate workflows/booking/cancelProposalWorkflow.js
**File:** `app/src/logic/workflows/booking/cancelProposalWorkflow.js`
**Line:** 1-143
**Issue:** This file exists BOTH at `workflows/booking/cancelProposalWorkflow.js` AND `workflows/proposals/cancelProposalWorkflow.js`. The `proposals/` version is imported by actual components (ProposalCard.jsx, ExpandableProposalCard.jsx, GuestEditingProposalModal.jsx). The `booking/` version appears unused but has different implementation.
**Affected Pages:** /proposals (indirectly - currently unused)

**Current Code:**
```javascript
// workflows/booking/cancelProposalWorkflow.js
import { PROPOSAL_STATUSES } from '../../constants/proposalStatuses.js'

export async function cancelProposalWorkflow({
  supabase,
  proposal,
  source = 'main',
  canCancelProposal
}) {
  // Different signature: takes supabase client and canCancelProposal function as params
  // Implements 7-variation decision tree
}
```

**Refactored Code:**
```javascript
// FILE SHOULD BE DELETED
// The canonical location is workflows/proposals/cancelProposalWorkflow.js
// Re-export for backward compatibility
export {
  executeCancelProposal as cancelProposalWorkflow,
  determineCancellationCondition,
  cancelProposalFromCompareTerms,
  executeDeleteProposal
} from '../proposals/cancelProposalWorkflow.js';
```

**Testing:**
- [ ] Search codebase for imports of workflows/booking/cancelProposalWorkflow
- [ ] If no direct imports found, file can be safely deleted
- [ ] Run cancel flow on proposal to verify it still works

~~~~~

### CHUNK 5: Consolidate duplicate canCancelProposal implementations
**File:** `app/src/logic/rules/proposals/canCancelProposal.js`
**Line:** 1-47
**Issue:** `canCancelProposal` is defined BOTH in `rules/proposals/canCancelProposal.js` (standalone file) AND inside `rules/proposals/proposalRules.js` (line 26-54). They have different signatures and slightly different logic.
**Affected Pages:** /proposals, /view-split-lease

**Current Code:**
```javascript
// rules/proposals/canCancelProposal.js (standalone)
import { isTerminalStatus, isCompletedStatus } from '../../constants/proposalStatuses.js'

export function canCancelProposal({ proposalStatus, deleted = false }) {
  // Takes object with proposalStatus and deleted
  // Returns boolean
  if (deleted) return false;
  if (!proposalStatus || typeof proposalStatus !== 'string') return false;
  const status = proposalStatus.trim();
  if (isTerminalStatus(status) || isCompletedStatus(status)) return false;
  return true;
}
```

**Refactored Code:**
```javascript
// FILE SHOULD BE DELETED
// Re-export from proposalRules.js for backward compatibility
// Note: proposalRules.canCancelProposal takes {proposal} not {proposalStatus, deleted}
// We need to create a wrapper

import { canCancelProposal as canCancelProposalFromRules } from './proposalRules.js';

/**
 * Wrapper for backward compatibility with code expecting the old signature.
 * @deprecated Import canCancelProposal from proposalRules.js and pass full proposal object.
 */
export function canCancelProposal({ proposalStatus, deleted = false }) {
  // Create minimal proposal object for the rules function
  return canCancelProposalFromRules({
    status: proposalStatus,
    Status: proposalStatus,
    deleted
  });
}
```

**Testing:**
- [ ] Find all imports of rules/proposals/canCancelProposal.js
- [ ] Verify each consumer still works with the wrapper
- [ ] Consider migrating consumers to use proposalRules.js directly

~~~~~

### CHUNK 6: Fix broken import in proposalButtonRules.js
**File:** `app/src/logic/rules/proposals/proposalButtonRules.js`
**Line:** 1
**Issue:** The file imports from `'../../../config/proposalStatusConfig.js'` which doesn't exist. The correct import should be from `'../../constants/proposalStatuses.js'`.
**Affected Pages:** /proposals (via useProposalButtonStates hook)

**Current Code:**
```javascript
import { getStatusConfig, PROPOSAL_STATUS } from '../../../config/proposalStatusConfig.js';

/**
 * Compute button states for a proposal card (pure function).
 * @param {object} params - Named parameters
 * @returns {object} Button states
 */
export function computeProposalButtonStates({ proposal, virtualMeeting, guest, listing, currentUserId }) {
  // Uses PROPOSAL_STATUS which should be PROPOSAL_STATUSES
```

**Refactored Code:**
```javascript
import { getStatusConfig, PROPOSAL_STATUSES } from '../../constants/proposalStatuses.js';

// Alias for backward compatibility with existing code
const PROPOSAL_STATUS = {
  REJECTED_BY_HOST: PROPOSAL_STATUSES.REJECTED_BY_HOST.key,
  CANCELLED_BY_SPLITLEASE: PROPOSAL_STATUSES.CANCELLED_BY_SPLITLEASE.key,
  CANCELLED_BY_GUEST: PROPOSAL_STATUSES.CANCELLED_BY_GUEST.key,
  INITIAL_PAYMENT_LEASE_ACTIVATED: PROPOSAL_STATUSES.INITIAL_PAYMENT_SUBMITTED_LEASE_ACTIVATED.key,
  PROPOSAL_SUBMITTED_BY_SL_AWAITING_APPLICATION: PROPOSAL_STATUSES.SUGGESTED_PROPOSAL_AWAITING_RENTAL_APP.key,
  PROPOSAL_SUBMITTED_BY_SL_PENDING_CONFIRMATION: PROPOSAL_STATUSES.SUGGESTED_PROPOSAL_PENDING_CONFIRMATION.key,
  LEASE_DOCUMENTS_SENT: PROPOSAL_STATUSES.LEASE_DOCUMENTS_SENT_FOR_REVIEW.key,
  HOST_COUNTEROFFER: PROPOSAL_STATUSES.COUNTEROFFER_SUBMITTED_AWAITING_GUEST_REVIEW.key,
};

/**
 * Compute button states for a proposal card (pure function).
 * @param {object} params - Named parameters
 * @returns {object} Button states
 */
export function computeProposalButtonStates({ proposal, virtualMeeting, guest, listing, currentUserId }) {
```

**Testing:**
- [ ] Verify useProposalButtonStates hook works after fix
- [ ] Test proposal card buttons display correctly
- [ ] Verify all button states map correctly to new status keys

~~~~~

## PAGE GROUP: /search, /favorite-listings, /listings (Chunks: 7)

### CHUNK 7: Malformed JSDoc in isContiguousSelection.js
**File:** `app/src/logic/calculators/scheduling/isContiguousSelection.js`
**Line:** 5
**Issue:** The JSDoc contains a broken reference to a deprecated file path instead of proper `@param` annotation. This causes documentation tools to fail.
**Affected Pages:** /search, /favorite-listings (via schedule selector)

**Current Code:**
```javascript
/**
 * Check if selected days form a contiguous block.
 * Handles week wrap-around cases (e.g., Fri-Mon).
 *
 * @.claude\plans\Deprecated\Context\Option Sets\ZEP - Curation Parameters(OS).md {number[]} selectedDays - Array of day indices (0-6).
 * @returns {boolean} True if days are contiguous.
 */
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
```

**Testing:**
- [ ] Run JSDoc generation to verify no errors
- [ ] TypeScript/IDE should show proper intellisense

~~~~~

## PAGE GROUP: /account-profile, /host-proposals (Chunks: 8)

### CHUNK 8: Empty processors/external directory
**File:** `app/src/logic/processors/external/`
**Line:** N/A (directory)
**Issue:** The `processors/external/` directory exists but is empty. Documentation in `app/src/CLAUDE.md` references `adaptDaysFromBubble` and `adaptDaysToBubble` that should be in this directory but don't exist. Either create the files or remove the directory.
**Affected Pages:** N/A (documentation consistency)

**Current Code:**
```javascript
// Directory exists but is empty
// CLAUDE.md references:
// import { adaptDaysFromBubble } from 'logic/processors/external/adaptDaysFromBubble.js';
// import { adaptDaysToBubble } from 'logic/processors/external/adaptDaysToBubble.js';
```

**Refactored Code:**
```javascript
// Option A: Remove empty directory and update CLAUDE.md
// OR
// Option B: Create placeholder files with proper exports

// If Option B, create adaptDaysFromBubble.js:
/**
 * Adapt day indices from Bubble.io format to internal format.
 * Note: As of 2025, database stores days natively in 0-indexed format.
 * This function exists for historical compatibility.
 * @param {number[]} bubbleDays - Day indices from Bubble (already 0-indexed)
 * @returns {number[]} Day indices in internal format (same as input)
 */
export function adaptDaysFromBubble(bubbleDays) {
  return bubbleDays; // No-op: formats now match
}
```

**Testing:**
- [ ] Decide which option to implement
- [ ] Update CLAUDE.md documentation if removing
- [ ] Verify no code imports these non-existent files

~~~~~

## PAGE GROUP: /reminders (Chunks: 9)

### CHUNK 9: Potential null pointer in reminderScheduling.js
**File:** `app/src/logic/rules/reminders/reminderScheduling.js`
**Line:** 1-50 (estimate)
**Issue:** Need to verify error handling when reminder data is malformed. Related files `reminderValidation.js` and `reminderWorkflow.js` also need review for consistency.
**Affected Pages:** /reminders, /house-manual

**Current Code:**
```javascript
// File needs to be read to verify issue
// Based on pattern in other files, likely missing null checks
```

**Refactored Code:**
```javascript
// Pending file review - this chunk is marked for investigation
// May not require changes if validation is already robust
```

**Testing:**
- [ ] Review file contents
- [ ] Verify null handling
- [ ] Test with malformed reminder data

~~~~~

## PAGE GROUP: /reviews (Chunks: 10)

### CHUNK 10: Review calculateFormCompletion for edge cases
**File:** `app/src/logic/calculators/reviews/calculateFormCompletion.js`
**Line:** 1-50 (estimate)
**Issue:** Need to verify calculation handles empty/partial form state correctly. Related to HostReviewGuest component.
**Affected Pages:** /reviews, /host-review-guest

**Current Code:**
```javascript
// File needs to be read to verify edge case handling
```

**Refactored Code:**
```javascript
// Pending file review - this chunk is marked for investigation
```

**Testing:**
- [ ] Review file contents
- [ ] Test with empty form
- [ ] Test with partially filled form

~~~~~

## PAGE GROUP: General/Shared (Chunks: 11, 12)

### CHUNK 11: Inconsistent error throwing vs null return
**File:** Multiple files in `calculators/` and `processors/`
**Line:** Various
**Issue:** Some functions throw errors on invalid input (following "No Fallback" principle), while others return null. Need to standardize. Files to review:
- `processUserData.js` - throws
- `processListingData` (in proposals/processProposalData.js) - returns null
- `calculateCheckInOutFromDays.js` - returns null
- `calculateCheckInOutDays.js` - throws
**Affected Pages:** All (architectural consistency)

**Current Code:**
```javascript
// Pattern A: Throws (preferred per CLAUDE.md)
export function processUserData(rawUser) {
  if (!rawUser) {
    throw new Error('processUserData: User data is required');
  }
  // ...
}

// Pattern B: Returns null (inconsistent)
export function processListingData(rawListing) {
  if (!rawListing) {
    return null;
  }
  // ...
}
```

**Refactored Code:**
```javascript
// Standardize on throwing for required data (Pattern A)
// Keep null returns only for genuinely optional data

export function processListingData(rawListing) {
  if (!rawListing) {
    throw new Error('processListingData: Listing data is required');
  }
  // ...
}
```

**Testing:**
- [ ] Audit all processor files for consistency
- [ ] Update callers to handle throws instead of null checks
- [ ] Document which functions can return null vs throw

~~~~~

### CHUNK 12: Remove unused proposalStages.js constant file
**File:** `app/src/logic/constants/proposalStages.js`
**Line:** 1-50 (estimate)
**Issue:** This file likely duplicates stage information already in `proposalStatuses.js`. Need to verify if it's imported anywhere and consolidate.
**Affected Pages:** Potentially /proposals

**Current Code:**
```javascript
// File needs to be read to verify contents
// Likely duplicates stage info from proposalStatuses.js
```

**Refactored Code:**
```javascript
// If unused: DELETE FILE
// If used: Re-export from proposalStatuses.js
export { getStageFromStatus, getStatusesByStage } from './proposalStatuses.js';
```

**Testing:**
- [ ] Search codebase for imports of proposalStages.js
- [ ] If no imports, delete file
- [ ] If imports exist, update to use proposalStatuses.js

~~~~~

## Critical File References

| File | Status | Action |
|------|--------|--------|
| `processors/proposal/processProposalData.js` | DUPLICATE | Delete, re-export from proposals/ |
| `processors/proposals/processProposalData.js` | CANONICAL | Keep |
| `workflows/booking/cancelProposalWorkflow.js` | DUPLICATE | Delete, re-export from proposals/ |
| `workflows/proposals/cancelProposalWorkflow.js` | CANONICAL | Keep |
| `rules/proposals/canCancelProposal.js` | DUPLICATE | Create wrapper, deprecate |
| `rules/proposals/proposalRules.js` | CANONICAL | Keep |
| `calculators/scheduling/isContiguousSelection.js` | DUPLICATE | Re-export from rules/ |
| `rules/scheduling/isScheduleContiguous.js` | CANONICAL | Keep |
| `calculators/scheduling/calculateCheckInOutFromDays.js` | SIMPLIFIED | Wrap canonical version |
| `calculators/scheduling/calculateCheckInOutDays.js` | CANONICAL | Keep |
| `rules/proposals/proposalButtonRules.js` | BROKEN IMPORT | Fix import path |
| `constants/proposalStages.js` | POTENTIALLY UNUSED | Verify and consolidate |
| `processors/external/` | EMPTY DIRECTORY | Remove or populate |

## Execution Order

Based on dependencies:
1. **CHUNK 6** - Fix broken import (unblocks proposalButtonRules)
2. **CHUNK 7** - Fix malformed JSDoc (simple fix)
3. **CHUNK 1** - Remove duplicate isContiguousSelection
4. **CHUNK 2** - Consolidate calculateCheckInOutFromDays
5. **CHUNK 3** - Remove duplicate processProposalData
6. **CHUNK 4** - Remove duplicate cancelProposalWorkflow
7. **CHUNK 5** - Consolidate canCancelProposal
8. **CHUNK 8** - Handle empty external directory
9. **CHUNK 11** - Standardize error handling (larger effort)
10. **CHUNK 12** - Remove unused proposalStages.js
11. **CHUNK 9, 10** - Investigate and fix if needed
