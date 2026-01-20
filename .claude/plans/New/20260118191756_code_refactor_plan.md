# Code Refactoring Plan - app/src/logic

Date: 2026-01-18
Audit Type: general
Files Audited: 68
Edge Reduction Target: 5%

## Executive Summary

This audit identified **12 refactoring chunks** across the `app/src/logic` directory. Issues span:
- **Duplicate implementations** (contiguity checking, proposal processing, cancel workflows)
- **Layer violations** (calculator file containing boolean predicate)
- **DRY violations** (wrap-around logic duplicated across 3 files)
- **Inconsistent error handling** (some processors use fallbacks, violating "No Fallback" principle)
- **Function duplication** (same `canCancelProposal` in rules vs workflows)

### HIGH IMPACT File Warning
- `constants/proposalStatuses.js` (16 dependents) - Changes affect ALL proposal-related pages

---

~~~~~

## PAGE GROUP: /search, /view-split-lease (Chunks: 1, 2, 3)

### CHUNK 1: Duplicate Contiguity Check Functions - Consolidate to Single Implementation
**Files:** `calculators/scheduling/isContiguousSelection.js`, `rules/scheduling/isScheduleContiguous.js`
**Line:** isContiguousSelection.js:1-31, isScheduleContiguous.js:1-108
**Issue:** Two near-identical implementations of contiguity checking exist. `isContiguousSelection.js` (31 lines) is a compact version, while `isScheduleContiguous.js` (108 lines) is the documented canonical version. Both use identical wrap-around logic. The compact version is in `calculators/` but returns a boolean (should be in `rules/`).
**Affected Pages:** /search, /view-split-lease

**Rationale:** These files implement the same business logic with different levels of documentation. Having both creates maintenance burden and potential for drift.

**Approach:**
1. Delete `calculators/scheduling/isContiguousSelection.js`
2. Update any imports to use `rules/scheduling/isScheduleContiguous.js`
3. The rules version has proper JSDoc, named parameters, and comprehensive validation

**Current Code (isContiguousSelection.js - TO BE DELETED):**
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

**Refactored Code (Keep isScheduleContiguous.js as canonical):**
```javascript
// No changes needed to isScheduleContiguous.js - it IS the canonical implementation
// Just delete isContiguousSelection.js and update imports

// Any file importing isContiguousSelection should change to:
import { isScheduleContiguous } from '../../logic/rules/scheduling/isScheduleContiguous.js'

// Usage change:
// Before: isContiguousSelection(selectedDays)
// After:  isScheduleContiguous({ selectedDayIndices: selectedDays })
```

**Testing:**
- [ ] Search for all imports of `isContiguousSelection`
- [ ] Update each import to use `isScheduleContiguous`
- [ ] Run tests for schedule selection on /search page
- [ ] Verify wrap-around selections (Fri-Sun) work correctly

~~~~~

### CHUNK 2: Inconsistent Check-In/Out Return Types
**Files:** `calculators/scheduling/calculateCheckInOutDays.js`, `calculators/scheduling/calculateCheckInOutFromDays.js`
**Line:** calculateCheckInOutDays.js:70-79, calculateCheckInOutFromDays.js:29-33
**Issue:** Both functions calculate check-in/out from selected days but return DIFFERENT data. `calculateCheckInOutDays` returns `checkOutDay` as day AFTER last selected (correct for actual checkout). `calculateCheckInOutFromDays` returns `checkOut` as the LAST selected day (incorrect semantically). This inconsistency causes bugs when mixing usage.
**Affected Pages:** /search, /view-split-lease

**Rationale:** The two functions have different semantic meanings for `checkOut` which is confusing and error-prone.

**Approach:**
1. Rename `calculateCheckInOutFromDays.js` return values to clarify they are bounds (first/last selected days)
2. Add JSDoc to clearly distinguish from `calculateCheckInOutDays`
3. Consider deprecating `calculateCheckInOutFromDays` in favor of the more explicit version

**Current Code (calculateCheckInOutFromDays.js):**
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
        checkOut: sortedDays[gapIndex - 1]  // BUG: This is LAST selected, not checkout day
      };
    }
  }

  return {
    checkIn: sortedDays[0],
    checkOut: sortedDays[sortedDays.length - 1]  // BUG: This is LAST selected, not checkout day
  };
}
```

**Refactored Code:**
```javascript
/**
 * Calculate the BOUNDARY days (first and last selected) from selected day indices.
 * Handles wrap-around scenarios (e.g., Fri-Mon selection).
 *
 * IMPORTANT: This returns the LAST SELECTED day, NOT the checkout day.
 * For actual checkout day (day AFTER last stay), use calculateCheckInOutDays instead.
 *
 * @param {number[]} selectedDays - Array of day indices (0=Sun, 6=Sat)
 * @returns {{ firstSelectedDay: number, lastSelectedDay: number } | null}
 *
 * @example
 * // Mon-Fri selection
 * calculateSelectedDayBounds([1, 2, 3, 4, 5])
 * // => { firstSelectedDay: 1, lastSelectedDay: 5 }
 *
 * @see calculateCheckInOutDays for actual check-in/check-out days
 */
export function calculateSelectedDayBounds(selectedDays) {
  if (!selectedDays || selectedDays.length < 2) {
    return null;
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
        firstSelectedDay: sortedDays[gapIndex],
        lastSelectedDay: sortedDays[gapIndex - 1]
      };
    }
  }

  return {
    firstSelectedDay: sortedDays[0],
    lastSelectedDay: sortedDays[sortedDays.length - 1]
  };
}

// Keep old function name as alias for backward compatibility
export function calculateCheckInOutFromDays(selectedDays) {
  const bounds = calculateSelectedDayBounds(selectedDays);
  if (!bounds) return null;
  return {
    checkIn: bounds.firstSelectedDay,
    checkOut: bounds.lastSelectedDay
  };
}
```

**Testing:**
- [ ] Update SearchPage.jsx imports to use new function name
- [ ] Update CompactScheduleIndicator.jsx to use new function name
- [ ] Verify schedule indicator displays correct check-in/out on /search
- [ ] Test wrap-around selection (Fri-Sun) displays correctly

~~~~~

### CHUNK 3: Extract Common Wrap-Around Logic to Shared Utility
**Files:** `calculators/scheduling/calculateCheckInOutDays.js`, `calculators/scheduling/calculateCheckInOutFromDays.js`, `rules/scheduling/isScheduleContiguous.js`
**Line:** calculateCheckInOutDays.js:52-81, calculateCheckInOutFromDays.js:14-34, isScheduleContiguous.js:75-104
**Issue:** All three files independently implement week wrap-around detection and gap-finding logic. This is a DRY violation that makes the codebase harder to maintain and introduces risk of inconsistent behavior.
**Affected Pages:** /search, /view-split-lease, schedule selector component

**Rationale:** The wrap-around detection algorithm is duplicated 3 times with slight variations. Extract to a shared utility.

**Approach:**
1. Create new utility file `calculators/scheduling/weekWrapAroundUtils.js`
2. Extract `findScheduleGap()` and `isWrapAroundSelection()` functions
3. Refactor all three files to use the shared utilities

**Current Code (duplicated in 3 files):**
```javascript
// This pattern appears in all 3 files:
const hasZero = sorted.includes(0);
const hasSix = sorted.includes(6);

if (hasZero && hasSix) {
  // Find gap to determine actual start/end
  let gapIndex = -1;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] !== sorted[i - 1] + 1) {
      gapIndex = i;
      break;
    }
  }
  // ... use gapIndex
}
```

**Refactored Code (new utility file):**
```javascript
// NEW FILE: calculators/scheduling/weekWrapAroundUtils.js

/**
 * Week Wrap-Around Utilities
 *
 * Shared logic for handling week wrap-around scenarios in day selections.
 * A "wrap-around" occurs when a selection includes both Saturday (6) and Sunday (0),
 * crossing the week boundary (e.g., Fri-Mon selection).
 */

/**
 * Check if a selection of days wraps around the week boundary.
 *
 * @param {number[]} sortedDays - Sorted array of day indices (0-6)
 * @returns {boolean} True if selection wraps around (includes both 0 and 6)
 */
export function isWrapAroundSelection(sortedDays) {
  if (!Array.isArray(sortedDays) || sortedDays.length < 2) {
    return false;
  }

  return sortedDays.includes(0) && sortedDays.includes(6) && sortedDays.length < 7;
}

/**
 * Find the gap index in a sorted day array.
 * The gap separates the "end" of the selection from the "start" in wrap-around cases.
 *
 * @param {number[]} sortedDays - Sorted array of day indices (0-6)
 * @returns {number} Index of first day after gap, or -1 if no gap found
 *
 * @example
 * findScheduleGap([0, 1, 5, 6]) // => 2 (gap between 1 and 5)
 * findScheduleGap([0, 1, 2, 3]) // => -1 (no gap)
 */
export function findScheduleGap(sortedDays) {
  for (let i = 1; i < sortedDays.length; i++) {
    if (sortedDays[i] - sortedDays[i - 1] > 1) {
      return i;
    }
  }
  return -1;
}

/**
 * Get the boundary indices for a wrap-around selection.
 * Returns the first and last day indices accounting for wrap-around.
 *
 * @param {number[]} sortedDays - Sorted array of day indices (0-6)
 * @returns {{ firstDay: number, lastDay: number, gapIndex: number } | null}
 */
export function getWrapAroundBounds(sortedDays) {
  if (!isWrapAroundSelection(sortedDays)) {
    return null;
  }

  const gapIndex = findScheduleGap(sortedDays);

  if (gapIndex === -1) {
    return null; // All 7 days selected, no gap
  }

  return {
    firstDay: sortedDays[gapIndex],        // First day after gap (start of selection)
    lastDay: sortedDays[gapIndex - 1],     // Last day before gap (end of selection)
    gapIndex
  };
}
```

**Testing:**
- [ ] Create weekWrapAroundUtils.js with extracted functions
- [ ] Update calculateCheckInOutDays.js to import and use utilities
- [ ] Update calculateCheckInOutFromDays.js to import and use utilities
- [ ] Update isScheduleContiguous.js to import and use utilities
- [ ] Test Fri-Sun selection on /search page
- [ ] Test Sat-Tue selection on schedule selector

~~~~~

## PAGE GROUP: /guest-proposals, /view-proposal (Chunks: 4, 5, 6)

### CHUNK 4: Duplicate Proposal Data Processors - Consolidate
**Files:** `processors/proposal/processProposalData.js`, `processors/proposals/processProposalData.js`
**Line:** processors/proposal/processProposalData.js:1-149, processors/proposals/processProposalData.js:1-330
**Issue:** Two files with identical names in different directories (`proposal/` vs `proposals/`). Both export `processProposalData()` but with different signatures and return shapes. This is extremely confusing and error-prone.
**Affected Pages:** /guest-proposals, /view-proposal, proposal modals

**Rationale:** Having two `processProposalData` functions creates import confusion and potential bugs when the wrong one is imported.

**Approach:**
1. Rename `processors/proposal/processProposalData.js` to `processors/proposal/mergeProposalTerms.js`
2. Keep `processors/proposals/processProposalData.js` as the canonical comprehensive processor
3. Update the renamed file's export to `mergeProposalTerms()`
4. Update imports across codebase

**Current Code (processors/proposal/processProposalData.js - TO BE RENAMED):**
```javascript
/**
 * Process raw proposal data from Supabase into a clean, validated proposal object.
 * ... (focused on term merging: original vs counteroffer)
 */
import { PROPOSAL_STATUSES, getUsualOrder } from '../../constants/proposalStatuses.js'

export function processProposalData({ rawProposal, listing = null, guest = null, host = null }) {
  // ... validation ...

  // Merge terms: Use host-changed (hc) fields if they exist
  const currentTerms = {
    moveInDate: hasHostCounteroffer && rawProposal['hc Move-In Date']
      ? rawProposal['hc Move-In Date']
      : rawProposal['Move-In Date'],
    // ... more term merging
  };

  return {
    id: rawProposal._id,
    // ... merged output
  };
}
```

**Refactored Code:**
```javascript
// RENAME FILE TO: processors/proposal/mergeProposalTerms.js

/**
 * Merge original proposal terms with host counteroffer terms.
 *
 * @intent Transform raw proposal with potential counteroffer into unified current terms.
 * @rule If host counteroffer exists (hc* fields), use those as current terms.
 * @rule Always preserve original terms for comparison UI.
 *
 * @param {object} params - Named parameters.
 * @param {object} params.rawProposal - Raw proposal from Supabase with Bubble field names.
 * @returns {object} Proposal with currentTerms and originalTerms separated.
 */
import { PROPOSAL_STATUSES, getUsualOrder } from '../../constants/proposalStatuses.js'

export function mergeProposalTerms({ rawProposal, listing = null, guest = null, host = null }) {
  // ... same implementation, just renamed
}

// Backward compatibility alias (deprecated)
export const processProposalData = mergeProposalTerms;
```

**Testing:**
- [ ] Rename file to mergeProposalTerms.js
- [ ] Update export name to mergeProposalTerms
- [ ] Search for imports of `processors/proposal/processProposalData`
- [ ] Update imports to use new name
- [ ] Test proposal detail view with counteroffer data

~~~~~

### CHUNK 5: Duplicate Cancel Proposal Workflows
**Files:** `workflows/booking/cancelProposalWorkflow.js`, `workflows/proposals/cancelProposalWorkflow.js`
**Line:** workflows/booking/cancelProposalWorkflow.js:1-144, workflows/proposals/cancelProposalWorkflow.js:1-176
**Issue:** Two cancel workflow files with overlapping but different implementations. `booking/` version requires `canCancelProposal` as dependency injection, while `proposals/` version imports it directly. Both update the same database table.
**Affected Pages:** /guest-proposals, /view-proposal, Compare Terms modal

**Rationale:** Duplicate workflows create confusion about which to use and risk inconsistent cancellation behavior.

**Approach:**
1. Keep `workflows/proposals/cancelProposalWorkflow.js` as canonical (more complete)
2. Delete `workflows/booking/cancelProposalWorkflow.js`
3. Update imports to use the proposals version
4. The proposals version has better condition evaluation (`determineCancellationCondition`)

**Current Code (workflows/booking/cancelProposalWorkflow.js - TO BE DELETED):**
```javascript
import { PROPOSAL_STATUSES } from '../../constants/proposalStatuses.js'

export async function cancelProposalWorkflow({
  supabase,
  proposal,
  source = 'main',
  canCancelProposal  // Requires dependency injection
}) {
  // ... validation requiring injected dependency

  const canCancel = canCancelProposal({
    proposalStatus: proposal.status,
    deleted: proposal.deleted
  })
  // ...
}
```

**Refactored Code (Keep workflows/proposals/cancelProposalWorkflow.js):**
```javascript
// Already has the correct implementation with:
// - determineCancellationCondition() for decision tree
// - executeCancelProposal() for database update
// - cancelProposalFromCompareTerms() for modal-specific flow
// - executeDeleteProposal() for soft-delete

// No changes needed to this file - just delete the booking/ version
// and update imports to point here
```

**Testing:**
- [ ] Search for imports of `workflows/booking/cancelProposalWorkflow`
- [ ] Update to import from `workflows/proposals/cancelProposalWorkflow`
- [ ] Test cancel from main proposal page
- [ ] Test cancel/decline from Compare Terms modal
- [ ] Test soft-delete on already-cancelled proposals

~~~~~

### CHUNK 6: Duplicate canCancelProposal in Rules vs proposalRules.js
**Files:** `rules/proposals/canCancelProposal.js`, `rules/proposals/proposalRules.js`
**Line:** canCancelProposal.js:1-48, proposalRules.js:26-54
**Issue:** `canCancelProposal` function is defined in both a standalone file AND in the comprehensive `proposalRules.js`. The standalone version uses named parameters `({ proposalStatus, deleted })` while proposalRules uses object parameter `(proposal)`. Different signatures for same rule.
**Affected Pages:** /guest-proposals, proposal cards, modals

**Rationale:** Having the same rule defined twice with different signatures is confusing and risks divergent behavior.

**Approach:**
1. Keep `rules/proposals/canCancelProposal.js` as the standalone canonical version (follows single-file-per-rule pattern)
2. Update `proposalRules.js` to import and re-export from standalone file
3. Standardize on named parameter signature `({ proposalStatus, deleted })`

**Current Code (proposalRules.js - duplicate definition):**
```javascript
/**
 * Check if a proposal can be cancelled by the guest
 */
export function canCancelProposal(proposal) {
  if (!proposal) {
    return false;
  }

  const status = proposal.status || proposal.Status;

  // Can't cancel if already cancelled or rejected
  if (
    status === PROPOSAL_STATUSES.CANCELLED_BY_GUEST.key ||
    status === PROPOSAL_STATUSES.CANCELLED_BY_SPLITLEASE.key ||
    status === PROPOSAL_STATUSES.REJECTED_BY_HOST.key
  ) {
    return false;
  }
  // ...
}
```

**Refactored Code (proposalRules.js - import instead of duplicate):**
```javascript
// At top of file, import the standalone version
import { canCancelProposal as canCancelProposalStandalone } from './canCancelProposal.js';

// Re-export with adapter for object parameter (backward compatibility)
export function canCancelProposal(proposal) {
  if (!proposal) return false;

  return canCancelProposalStandalone({
    proposalStatus: proposal.status || proposal.Status,
    deleted: proposal.deleted || proposal.Deleted || false
  });
}

// ... rest of proposalRules.js unchanged
```

**Testing:**
- [ ] Update proposalRules.js to import from standalone file
- [ ] Test cancel button visibility on proposal cards
- [ ] Test cancel functionality from Compare Terms modal
- [ ] Verify both `canCancelProposal(proposal)` and `canCancelProposal({ proposalStatus, deleted })` work

~~~~~

## PAGE GROUP: /host-proposals (Chunks: 7)

### CHUNK 7: proposalStatuses.js - Missing Exports for Suggested Proposal Helpers
**Files:** `constants/proposalStatuses.js`
**Line:** proposalStatuses.js:351-383
**Issue:** `isSuggestedProposal` and `isPendingConfirmationProposal` are defined in proposalStatuses.js but have DUPLICATE definitions in `proposalRules.js` (`isSLSuggestedProposal`, `canConfirmSuggestedProposal`). These should be single source of truth.
**Affected Pages:** /host-proposals, /guest-proposals, SuggestedProposals component

**Rationale:** Split Lease suggested proposal logic is duplicated between constants and rules files.

**Approach:**
1. Keep definitions in `proposalStatuses.js` (they're status-based checks)
2. Remove duplicate `isSLSuggestedProposal` from `proposalRules.js`
3. Import from proposalStatuses in proposalRules.js

**Current Code (proposalRules.js - duplicate):**
```javascript
/**
 * Check if this is a Split Lease suggested proposal
 * @param {Object} proposal - Proposal object
 * @returns {boolean} True if suggested by Split Lease
 */
export function isSLSuggestedProposal(proposal) {
  if (!proposal) return false;
  const status = proposal.status || proposal.Status;
  return status?.includes('Submitted for guest by Split Lease');
}
```

**Refactored Code (proposalRules.js):**
```javascript
// Import from constants instead of duplicating
import {
  PROPOSAL_STATUSES,
  isTerminalStatus,
  isCompletedStatus,
  getActionsForStatus,
  isSuggestedProposal  // Add this import
} from '../../constants/proposalStatuses.js';

// Remove duplicate isSLSuggestedProposal definition
// Re-export for backward compatibility if needed:
export { isSuggestedProposal as isSLSuggestedProposal };
```

**Testing:**
- [ ] Update proposalRules.js imports
- [ ] Remove duplicate function definition
- [ ] Test suggested proposals display on /host-proposals
- [ ] Test "Confirm" button on suggested proposal cards

~~~~~

## PAGE GROUP: /account-profile (Chunks: 8)

### CHUNK 8: processUserData Missing Graceful Handling for Corrupted JSDoc
**Files:** `calculators/scheduling/isContiguousSelection.js`
**Line:** isContiguousSelection.js:5
**Issue:** The file contains corrupted JSDoc: `@.claude\plans\Deprecated\Context\Option Sets\ZEP - Curation Parameters(OS).md {number[]} selectedDays`. This appears to be a copy-paste error mixing file path with JSDoc syntax.
**Affected Pages:** N/A (syntax issue, no runtime impact)

**Rationale:** Corrupted JSDoc will cause IDE issues and confuse developers.

**Approach:**
1. Fix the JSDoc syntax
2. This is in a file marked for deletion in Chunk 1, so will be resolved there

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
// This file will be DELETED as part of Chunk 1
// No separate fix needed - the canonical isScheduleContiguous.js has correct JSDoc
```

**Testing:**
- [ ] Verify file deleted as part of Chunk 1
- [ ] No additional testing needed

~~~~~

## PAGE GROUP: SHARED - Multiple Pages (Chunks: 9, 10)

### CHUNK 9: Inconsistent "No Fallback" Enforcement in Processors
**Files:** `processors/proposals/processProposalData.js`
**Line:** processProposalData.js:46-49, processProposalData.js:82-84
**Issue:** `processListingData` and `processHostData` return `null` for missing data (fallback), while `processUserData` throws errors (no fallback). This inconsistency violates the stated "No Fallback" principle.
**Affected Pages:** All proposal-related pages

**Rationale:** The codebase states "NO FALLBACK - Throws explicit errors" but some processors silently return null.

**Approach:**
1. Decide on consistent behavior: Should these throw or return null?
2. Given they're nested data (listing/host inside proposal), null may be acceptable
3. Add explicit JSDoc documenting that null return is intentional for optional nested data
4. Keep behavior but document it clearly

**Current Code (processListingData - returns null silently):**
```javascript
export function processListingData(rawListing) {
  if (!rawListing) {
    return null;  // Silent fallback - inconsistent with "No Fallback" principle
  }
  // ...
}
```

**Refactored Code:**
```javascript
/**
 * Transform raw listing data from Bubble.io format.
 *
 * @intent Transform listing for display, handling optional nested data gracefully.
 * @rule Returns null for missing listing (intentional - listing is optional nested data).
 * @rule This is NOT a fallback - null explicitly means "no listing data available".
 *
 * @param {Object|null} rawListing - Raw listing object from Supabase, or null
 * @returns {Object|null} Transformed listing object, or null if no data
 */
export function processListingData(rawListing) {
  // Explicit null return for optional nested data (documented behavior, not a fallback)
  if (!rawListing) {
    return null;
  }
  // ... rest unchanged
}
```

**Testing:**
- [ ] Add JSDoc clarifying null return is intentional
- [ ] Same for processHostData and processVirtualMeetingData
- [ ] Verify proposal views handle null listing/host gracefully

~~~~~

### CHUNK 10: Hardcoded Fallback in getCancellationReasonOptions
**Files:** `rules/proposals/proposalRules.js`
**Line:** proposalRules.js:297-317
**Issue:** `getCancellationReasonOptions()` has a hardcoded fallback array that violates "No Fallback" principle. While the function documents this as "resilience during initialization", it should either throw or wait for cache.
**Affected Pages:** /guest-proposals (cancel modal)

**Rationale:** Hardcoded fallback data can drift from actual database values, causing inconsistency.

**Approach:**
1. Option A: Remove fallback, throw if cache empty (strict "No Fallback")
2. Option B: Keep fallback but log warning (current behavior)
3. Recommend Option B for UX but improve logging

**Current Code:**
```javascript
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
    // ... hardcoded values
  ];
}
```

**Refactored Code:**
```javascript
/**
 * Get available cancellation reason options for guests.
 *
 * @intent Provide reason options from reference data cache.
 * @rule Prefers cached data from dataLookups.js.
 * @rule Falls back to hardcoded defaults ONLY during initial app load.
 * @warning Fallback values must be kept in sync with database reference_table.
 *
 * @returns {Array<string>} Array of reason option strings
 */
export function getCancellationReasonOptions() {
  const cachedReasons = getGuestCancellationReasons();

  if (cachedReasons.length > 0) {
    return cachedReasons.map(r => r.reason);
  }

  // Fallback for initial render before cache is populated
  // WARNING: These must match os_guest_cancellation_reason in reference_table
  // Last synced: 2026-01-18
  console.warn(
    '[getCancellationReasonOptions] Cache empty, using hardcoded fallback. ' +
    'If this persists after page load, check dataLookups initialization.'
  );

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

**Testing:**
- [ ] Update JSDoc and warning message
- [ ] Test cancel modal shows correct reasons after page fully loads
- [ ] Verify warning only appears during initial load, not persistently

~~~~~

## PAGE GROUP: AUTO (Chunks: 11, 12)

### CHUNK 11: Legacy VM_STATES Aliases Should Be Removed
**Files:** `rules/proposals/virtualMeetingRules.js`
**Line:** virtualMeetingRules.js:34-36
**Issue:** `VM_STATES` contains legacy aliases (`REQUESTED_BY_GUEST`, `REQUESTED_BY_HOST`) that point to the new perspective-neutral names. These should be removed to enforce migration to new names.
**Affected Pages:** /guest-proposals, /host-proposals, VirtualMeetingsSection

**Rationale:** Legacy aliases create confusion and should be deprecated after a migration period.

**Approach:**
1. Search for usages of legacy aliases
2. If no usages found, remove aliases
3. If usages exist, add deprecation comment with removal date

**Current Code:**
```javascript
export const VM_STATES = {
  NO_MEETING: 'no_meeting',
  REQUESTED_BY_ME: 'requested_by_me',
  REQUESTED_BY_OTHER: 'requested_by_other',
  BOOKED_AWAITING_CONFIRMATION: 'booked_awaiting_confirmation',
  CONFIRMED: 'confirmed',
  DECLINED: 'declined',
  EXPIRED: 'expired',
  // Legacy aliases (for backward compatibility - will be removed in future)
  REQUESTED_BY_GUEST: 'requested_by_me',
  REQUESTED_BY_HOST: 'requested_by_other'
};
```

**Refactored Code:**
```javascript
export const VM_STATES = {
  NO_MEETING: 'no_meeting',
  REQUESTED_BY_ME: 'requested_by_me',
  REQUESTED_BY_OTHER: 'requested_by_other',
  BOOKED_AWAITING_CONFIRMATION: 'booked_awaiting_confirmation',
  CONFIRMED: 'confirmed',
  DECLINED: 'declined',
  EXPIRED: 'expired'
  // Legacy aliases REMOVED - use REQUESTED_BY_ME and REQUESTED_BY_OTHER
};
```

**Testing:**
- [ ] Search codebase for `VM_STATES.REQUESTED_BY_GUEST`
- [ ] Search codebase for `VM_STATES.REQUESTED_BY_HOST`
- [ ] If usages found, update them to new names
- [ ] Remove legacy aliases
- [ ] Test VM button states on proposal pages

~~~~~

### CHUNK 12: Protocol-Relative URL Handling Duplicated
**Files:** `workflows/auth/validateTokenWorkflow.js`, `processors/user/processProfilePhotoUrl.js`
**Line:** validateTokenWorkflow.js:91-94, processProfilePhotoUrl.js (full file)
**Issue:** Protocol-relative URL handling (`//example.com` → `https://example.com`) is implemented in both files. `processProfilePhotoUrl.js` is the dedicated processor, but `validateTokenWorkflow.js` has inline logic that should use it.
**Affected Pages:** All authenticated pages (profile photos)

**Rationale:** URL processing should use the dedicated processor, not inline logic.

**Approach:**
1. Import `processProfilePhotoUrl` in validateTokenWorkflow.js
2. Replace inline protocol handling with processor call

**Current Code (validateTokenWorkflow.js):**
```javascript
// Handle protocol-relative URLs for profile photos
let profilePhoto = userData['Profile Photo']
if (profilePhoto && profilePhoto.startsWith('//')) {
  profilePhoto = 'https:' + profilePhoto
}
```

**Refactored Code:**
```javascript
import { processProfilePhotoUrl } from '../../processors/user/processProfilePhotoUrl.js'

// In the function:
// Use dedicated processor for photo URL handling
const profilePhoto = processProfilePhotoUrl(userData['Profile Photo'])
```

**Testing:**
- [ ] Import processProfilePhotoUrl in validateTokenWorkflow.js
- [ ] Replace inline URL handling with processor call
- [ ] Test login flow with user having protocol-relative photo URL
- [ ] Verify profile photos display correctly after authentication

~~~~~

## Execution Priority

### Phase 1: Critical (Eliminate Duplicates)
1. **Chunk 1**: Delete duplicate isContiguousSelection.js
2. **Chunk 4**: Rename duplicate processProposalData.js
3. **Chunk 5**: Delete duplicate cancelProposalWorkflow.js
4. **Chunk 6**: Consolidate canCancelProposal definitions

### Phase 2: High (DRY Refactoring)
5. **Chunk 3**: Extract wrap-around utilities
6. **Chunk 12**: Consolidate URL processing

### Phase 3: Medium (Clarity Improvements)
7. **Chunk 2**: Fix check-in/out return type confusion
8. **Chunk 7**: Consolidate suggested proposal helpers
9. **Chunk 9**: Document null return behavior

### Phase 4: Low (Cleanup)
10. **Chunk 10**: Improve fallback documentation
11. **Chunk 11**: Remove legacy VM_STATES aliases
12. **Chunk 8**: (Resolved by Chunk 1)

---

## File References

### Files to DELETE:
- `calculators/scheduling/isContiguousSelection.js`
- `workflows/booking/cancelProposalWorkflow.js`

### Files to RENAME:
- `processors/proposal/processProposalData.js` → `processors/proposal/mergeProposalTerms.js`

### Files to CREATE:
- `calculators/scheduling/weekWrapAroundUtils.js`

### Files to MODIFY:
- `calculators/scheduling/calculateCheckInOutDays.js`
- `calculators/scheduling/calculateCheckInOutFromDays.js`
- `rules/scheduling/isScheduleContiguous.js`
- `rules/proposals/proposalRules.js`
- `constants/proposalStatuses.js`
- `rules/proposals/virtualMeetingRules.js`
- `workflows/auth/validateTokenWorkflow.js`
- `processors/proposals/processProposalData.js`

### Import Updates Required:
- `app/src/islands/pages/SearchPage.jsx`
- `app/src/islands/pages/SearchPage/components/CompactScheduleIndicator.jsx`
- `app/src/islands/shared/useScheduleSelectorLogicCore.js`
- `app/src/islands/modals/GuestEditingProposalModal.jsx`
- `app/src/islands/pages/proposals/ProposalCard.jsx`
- `app/src/islands/pages/proposals/ExpandableProposalCard.jsx`
