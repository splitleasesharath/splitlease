# Code Refactoring Plan - app/src/logic

Date: 2026-01-18
Audit Type: general
Files Analyzed: 68
Edge Reduction Target: 4%

## Executive Summary

This audit identified **12 refactoring chunks** across **5 page groups**. Critical issues include:
- **1 syntax error** (duplicate imports causing build failure)
- **2 duplicate file structures** requiring consolidation
- **1 non-standard import path** breaking architectural conventions
- **3 code duplication patterns** affecting maintainability
- **5 minor consistency/documentation issues**

### Priority Classification
| Priority | Count | Description |
|----------|-------|-------------|
| CRITICAL | 1 | Build-breaking syntax error |
| HIGH | 3 | Duplicate code/files causing confusion |
| MEDIUM | 5 | Non-standard patterns, minor issues |
| LOW | 3 | Documentation, style consistency |

---

## PAGE GROUP: /guest-proposals, /host-proposals (Chunks: 1, 2, 3, 4, 5, 6, 7)

~~~~~

### CHUNK 1: Fix duplicate import statement (CRITICAL - BUILD BREAKING)
**Files**: `rules/proposals/proposalRules.js`
**Line:** 352-358
**Issue:** Duplicate import statement causes JavaScript syntax error. The file imports from `../../constants/proposalStatuses.js` at line 16, then again at lines 352-358. This is a build-breaking error.
**Affected Pages:** /guest-proposals, /host-proposals, all proposal-related pages

**Current Code:**
```javascript
// Line 16 - First import
import { PROPOSAL_STATUSES, isTerminalStatus, isCompletedStatus, getActionsForStatus } from '../../constants/proposalStatuses.js';

// Lines 352-358 - DUPLICATE import (SYNTAX ERROR)
// Import from constants instead of duplicating
import {
  PROPOSAL_STATUSES,
  isTerminalStatus,
  isCompletedStatus,
  getActionsForStatus,
  isSuggestedProposal  // Add this import
} from '../../constants/proposalStatuses.js';
```

**Refactored Code:**
```javascript
// Line 16 - Single consolidated import
import {
  PROPOSAL_STATUSES,
  isTerminalStatus,
  isCompletedStatus,
  getActionsForStatus,
  isSuggestedProposal
} from '../../constants/proposalStatuses.js';

// Lines 352-362 - Remove duplicate import, keep only re-export
// Re-export for backward compatibility if needed:
export { isSuggestedProposal as isSLSuggestedProposal };
```

**Testing:**
- [ ] Run `bun run build` to verify no syntax errors
- [ ] Run `bun run dev` and navigate to /guest-proposals
- [ ] Verify proposal cards render correctly

~~~~~

### CHUNK 2: Consolidate duplicate processProposalData files
**Files**: `processors/proposal/processProposalData.js`, `processors/proposals/processProposalData.js`
**Line:** Entire files
**Issue:** Two versions of `processProposalData` exist in different directories (`proposal/` singular and `proposals/` plural). This creates confusion about which to import and risks data inconsistency. The `proposals/` (plural) directory follows project conventions.
**Affected Pages:** /guest-proposals, /host-proposals, /view-split-lease

**Current Code:**
```javascript
// File: processors/proposal/processProposalData.js (149 lines)
// Uses named params: { rawProposal, listing, guest, host }
// Validates Listing and Guest references
// Returns different shape with currentTerms/originalTerms

// File: processors/proposals/processProposalData.js (330 lines)
// Uses positional param: (rawProposal)
// More comprehensive, handles nested data
// Returns different shape with listing, host, virtualMeeting embedded
```

**Refactored Code:**
```javascript
// Keep ONLY: processors/proposals/processProposalData.js
// Delete: processors/proposal/processProposalData.js (entire directory)

// Update any imports from:
import { processProposalData } from '../../logic/processors/proposal/processProposalData.js';
// To:
import { processProposalData } from '../../logic/processors/proposals/processProposalData.js';
```

**Testing:**
- [ ] Search codebase for imports from `processors/proposal/`
- [ ] Update all imports to use `processors/proposals/`
- [ ] Delete `processors/proposal/` directory
- [ ] Run build and verify no broken imports

~~~~~

### CHUNK 3: Consolidate duplicate cancelProposalWorkflow files
**Files**: `workflows/booking/cancelProposalWorkflow.js`, `workflows/proposals/cancelProposalWorkflow.js`
**Line:** Entire files
**Issue:** Two versions of `cancelProposalWorkflow` exist. One in `booking/` (144 lines, comprehensive decision tree) and one in `proposals/` (176 lines, with `executeDeleteProposal`). Both implement similar logic with different APIs.
**Affected Pages:** /guest-proposals, proposal card components

**Current Code:**
```javascript
// File: workflows/booking/cancelProposalWorkflow.js
// - Takes { supabase, proposal, source, canCancelProposal }
// - Implements 7-variation decision tree
// - Returns { success, message, updated, requiresPhoneCall? }

// File: workflows/proposals/cancelProposalWorkflow.js
// - Has determineCancellationCondition(), executeCancelProposal(), executeDeleteProposal()
// - Takes proposalId directly
// - Also has cancelProposalFromCompareTerms()
```

**Refactored Code:**
```javascript
// Consolidate into: workflows/proposals/cancelProposalWorkflow.js
// Merge the decision tree from booking/ into proposals/
// Keep all exports: determineCancellationCondition, executeCancelProposal,
//                   executeDeleteProposal, cancelProposalFromCompareTerms
// Delete: workflows/booking/cancelProposalWorkflow.js
```

**Testing:**
- [ ] Search for imports from `workflows/booking/cancelProposalWorkflow`
- [ ] Update imports to use `workflows/proposals/cancelProposalWorkflow`
- [ ] Verify cancel functionality works in guest proposals page
- [ ] Test cancel from Compare Terms modal

~~~~~

### CHUNK 4: Fix non-standard import path in proposalButtonRules.js
**Files**: `rules/proposals/proposalButtonRules.js`, `rules/proposals/useProposalButtonStates.js`
**Line:** 1 (both files)
**Issue:** Both files import from `../../../config/proposalStatusConfig.js` which is outside the `logic/` architecture. Should use `../../constants/proposalStatuses.js` per project conventions.
**Affected Pages:** /guest-proposals (ProposalCard component)

**Current Code:**
```javascript
// rules/proposals/proposalButtonRules.js:1
import { getStatusConfig, PROPOSAL_STATUS } from '../../../config/proposalStatusConfig.js';

// rules/proposals/useProposalButtonStates.js:12
import { getStatusConfig, PROPOSAL_STATUS } from '../../../config/proposalStatusConfig.js';
```

**Refactored Code:**
```javascript
// rules/proposals/proposalButtonRules.js:1
import { getStatusConfig, PROPOSAL_STATUSES } from '../../constants/proposalStatuses.js';

// rules/proposals/useProposalButtonStates.js:12
import { getStatusConfig, PROPOSAL_STATUSES } from '../../constants/proposalStatuses.js';

// Note: Update PROPOSAL_STATUS references to PROPOSAL_STATUSES throughout files
// e.g., PROPOSAL_STATUS.REJECTED_BY_HOST → PROPOSAL_STATUSES.REJECTED_BY_HOST.key
```

**Testing:**
- [ ] Update all PROPOSAL_STATUS references to use PROPOSAL_STATUSES.*.key pattern
- [ ] Run build to verify no import errors
- [ ] Test button states render correctly on guest proposals page

~~~~~

### CHUNK 5: Consolidate duplicate canCancelProposal functions
**Files**: `rules/proposals/canCancelProposal.js`, `rules/proposals/proposalRules.js`
**Line:** canCancelProposal.js:27, proposalRules.js:26
**Issue:** `canCancelProposal` is defined in two places with slightly different signatures. Standalone file takes `{ proposalStatus, deleted }`, while proposalRules.js version takes `(proposal)` object.
**Affected Pages:** /guest-proposals, cancel proposal workflows

**Current Code:**
```javascript
// rules/proposals/canCancelProposal.js:27
export function canCancelProposal({ proposalStatus, deleted = false }) {
  if (deleted) return false;
  if (!proposalStatus || typeof proposalStatus !== 'string') return false;
  const status = proposalStatus.trim();
  if (isTerminalStatus(status) || isCompletedStatus(status)) return false;
  return true;
}

// rules/proposals/proposalRules.js:26
export function canCancelProposal(proposal) {
  if (!proposal) return false;
  const status = proposal.status || proposal.Status;
  if (status === PROPOSAL_STATUSES.CANCELLED_BY_GUEST.key || ...) return false;
  if (isCompletedStatus(status)) return false;
  if (status === PROPOSAL_STATUSES.EXPIRED.key) return false;
  return true;
}
```

**Refactored Code:**
```javascript
// Keep: rules/proposals/canCancelProposal.js as the canonical version
// Update proposalRules.js to re-export:

// In proposalRules.js - Remove function definition, add:
export { canCancelProposal } from './canCancelProposal.js';

// Or update standalone to accept both signatures:
export function canCancelProposal(input) {
  const proposal = input?.proposalStatus ? null : input;
  const { proposalStatus, deleted = false } = input?.proposalStatus
    ? input
    : { proposalStatus: proposal?.status || proposal?.Status, deleted: proposal?.deleted };
  // ... rest of logic
}
```

**Testing:**
- [ ] Update callers to use consistent signature
- [ ] Test cancel proposal from guest proposals page
- [ ] Test cancel from Compare Terms modal

~~~~~

### CHUNK 6: Consolidate duplicate useProposalButtonStates and computeProposalButtonStates
**Files**: `rules/proposals/useProposalButtonStates.js`, `rules/proposals/proposalButtonRules.js`
**Line:** Entire files
**Issue:** `useProposalButtonStates` (hook) and `computeProposalButtonStates` (pure function) contain nearly identical logic (~100 lines duplicated). The hook just wraps the pure function in useMemo.
**Affected Pages:** /guest-proposals (ProposalCard component)

**Current Code:**
```javascript
// useProposalButtonStates.js - React hook with useMemo
export function useProposalButtonStates({ proposal, virtualMeeting, guest, listing, currentUserId }) {
  return useMemo(() => {
    // ~100 lines of button state computation
  }, [proposal, virtualMeeting, guest, listing, currentUserId]);
}

// proposalButtonRules.js - Pure function
export function computeProposalButtonStates({ proposal, virtualMeeting, guest, listing, currentUserId }) {
  // Same ~100 lines of button state computation
}
```

**Refactored Code:**
```javascript
// Keep ONLY: rules/proposals/proposalButtonRules.js (pure function)
// Update useProposalButtonStates.js to use it:

import { useMemo } from 'react';
import { computeProposalButtonStates } from './proposalButtonRules.js';

export function useProposalButtonStates(params) {
  return useMemo(
    () => computeProposalButtonStates(params),
    [params.proposal, params.virtualMeeting, params.guest, params.listing, params.currentUserId]
  );
}
```

**Testing:**
- [ ] Replace hook logic with call to pure function
- [ ] Verify button states work identically
- [ ] Test all button variations on guest proposals page

~~~~~

### CHUNK 7: Fix malformed JSDoc in isContiguousSelection.js
**Files**: `calculators/scheduling/isContiguousSelection.js`
**Line:** 5
**Issue:** JSDoc has corrupted @param tag containing file path fragment instead of parameter documentation.
**Affected Pages:** /search, /view-split-lease (schedule selector)

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
 * @param {number[]} selectedDays - Array of day indices (0-6, where 0=Sunday).
 * @returns {boolean} True if days are contiguous, false otherwise.
 *
 * @example
 * isContiguousSelection([1, 2, 3, 4, 5]) // => true (Mon-Fri)
 * isContiguousSelection([5, 6, 0, 1])    // => true (Fri-Mon, wrapped)
 * isContiguousSelection([1, 3, 5])       // => false (gaps)
 */
```

**Testing:**
- [ ] Verify JSDoc renders correctly in IDE
- [ ] Run any doc generation tools if present

~~~~~

## PAGE GROUP: /search, /view-split-lease (Chunks: 8, 9)

~~~~~

### CHUNK 8: Add explicit error handling to calculateFormCompletion
**Files**: `calculators/reviews/calculateFormCompletion.js`
**Line:** 13-14
**Issue:** Returns 0 for invalid input instead of throwing error, inconsistent with "no fallback" philosophy used in other calculators like `calculatePricingBreakdown`.
**Affected Pages:** /reviews (review form progress)

**Current Code:**
```javascript
export function calculateFormCompletion({ ratings, totalCategories = 12 }) {
  if (!Array.isArray(ratings)) {
    return 0;  // Silent fallback - inconsistent with other calculators
  }

  const completed = ratings.filter(r => r.value > 0).length;
  return Math.round((completed / totalCategories) * 100);
}
```

**Refactored Code:**
```javascript
export function calculateFormCompletion({ ratings, totalCategories = 12 }) {
  // No Fallback: Validate input
  if (!Array.isArray(ratings)) {
    throw new Error(
      `calculateFormCompletion: ratings must be an array, got ${typeof ratings}`
    );
  }

  if (typeof totalCategories !== 'number' || totalCategories <= 0) {
    throw new Error(
      `calculateFormCompletion: totalCategories must be a positive number, got ${totalCategories}`
    );
  }

  const completed = ratings.filter(r => r?.value > 0).length;
  return Math.round((completed / totalCategories) * 100);
}
```

**Testing:**
- [ ] Update callers to handle potential errors
- [ ] Verify review form progress calculation still works
- [ ] Test with empty/invalid ratings array

~~~~~

### CHUNK 9: Add missing validation to isContiguousSelection
**Files**: `calculators/scheduling/isContiguousSelection.js`
**Line:** 8-9
**Issue:** Missing input validation for day indices (should be 0-6). Other scheduling calculators like `calculateCheckInOutDays` validate this.
**Affected Pages:** /search, /view-split-lease (schedule selector)

**Current Code:**
```javascript
export function isContiguousSelection(selectedDays) {
  if (!selectedDays || selectedDays.length === 0) return false;
  if (selectedDays.length === 1) return true;
  if (selectedDays.length >= 6) return true;

  const sorted = [...selectedDays].sort((a, b) => a - b);
  // No validation of day indices
```

**Refactored Code:**
```javascript
export function isContiguousSelection(selectedDays) {
  // No Fallback: Validate input
  if (!Array.isArray(selectedDays)) {
    throw new Error(
      `isContiguousSelection: selectedDays must be an array, got ${typeof selectedDays}`
    );
  }

  if (selectedDays.length === 0) return false;
  if (selectedDays.length === 1) return true;

  // Validate all day indices
  for (const day of selectedDays) {
    if (typeof day !== 'number' || isNaN(day) || day < 0 || day > 6) {
      throw new Error(
        `isContiguousSelection: Invalid day index ${day}, must be 0-6`
      );
    }
  }

  if (selectedDays.length >= 6) return true;

  const sorted = [...selectedDays].sort((a, b) => a - b);
  // ... rest unchanged
```

**Testing:**
- [ ] Verify schedule selector works with valid inputs
- [ ] Test wrap-around cases (Fri-Mon)
- [ ] Verify error thrown for invalid day indices

~~~~~

## PAGE GROUP: /messages (Chunks: 10)

~~~~~

### CHUNK 10: Remove console.log statements from navigationWorkflow
**Files**: `workflows/proposals/navigationWorkflow.js`
**Line:** 24, 55, 73, 90, 107, 124, 133, 148, 165
**Issue:** Multiple console.log statements left in production code. Should use proper logging or remove entirely.
**Affected Pages:** /guest-proposals, /messages (navigation)

**Current Code:**
```javascript
export function navigateToListing(proposal) {
  // ...
  console.log('[navigationWorkflow] Navigating to listing:', url);  // Line 24
  window.location.href = url;
}

export function navigateToMessaging(hostId, proposalId) {
  // ...
  console.log('[navigationWorkflow] Navigating to messaging:', url);  // Line 55
  window.location.href = url;
}
// ... 7 more console.log statements
```

**Refactored Code:**
```javascript
// Option A: Remove all console.logs
export function navigateToListing(proposal) {
  // ...validation...
  window.location.href = url;
}

// Option B: Use debug flag
const DEBUG = false; // or import from config

export function navigateToListing(proposal) {
  // ...validation...
  if (DEBUG) console.log('[navigationWorkflow] Navigating to listing:', url);
  window.location.href = url;
}
```

**Testing:**
- [ ] Remove or conditionally disable console.logs
- [ ] Verify navigation still works
- [ ] Check browser console is clean in production

~~~~~

## PAGE GROUP: AUTO (Shared utilities) (Chunks: 11, 12)

~~~~~

### CHUNK 11: Add missing exports to proposalStatuses.js index
**Files**: `constants/proposalStatuses.js`
**Line:** End of file (after line 383)
**Issue:** The `normalizeStatusKey` function is defined but not exported, yet it's useful for external callers needing to compare status strings.
**Affected Pages:** AUTO (all proposal-related pages)

**Current Code:**
```javascript
// Line 231-233 - Private function, not exported
function normalizeStatusKey(statusKey) {
  return typeof statusKey === 'string' ? statusKey.trim() : statusKey;
}
```

**Refactored Code:**
```javascript
// Export the utility function for consistent status comparison
export function normalizeStatusKey(statusKey) {
  return typeof statusKey === 'string' ? statusKey.trim() : statusKey;
}
```

**Testing:**
- [ ] Export the function
- [ ] Update any hardcoded .trim() calls to use normalizeStatusKey

~~~~~

### CHUNK 12: Standardize error message format in calculators
**Files**: `calculators/pricing/calculateGuestFacingPrice.js`, `calculators/scheduling/calculateCheckInOutDays.js`, `calculators/pricing/calculatePricingBreakdown.js`
**Line:** Various throw statements
**Issue:** Error messages have inconsistent formats. Some use template literals, some use string concatenation. All should follow pattern: `functionName: description, got ${value}`.
**Affected Pages:** AUTO (pricing, scheduling)

**Current Code:**
```javascript
// calculateGuestFacingPrice.js:42
throw new Error(
  `calculateGuestFacingPrice: hostNightlyRate must be a positive number, got ${hostNightlyRate}`
)

// calculateCheckInOutDays.js:30
throw new Error(
  `calculateCheckInOutDays: selectedDays must be an array, got ${typeof selectedDays}`
)

// calculatePricingBreakdown.js:33 - Different format
throw new Error(
  'calculatePricingBreakdown: listing must be a valid object'
)
```

**Refactored Code:**
```javascript
// Standardize all to include the actual value received:
// calculatePricingBreakdown.js:33
throw new Error(
  `calculatePricingBreakdown: listing must be a valid object, got ${typeof listing}`
)
```

**Testing:**
- [ ] Update all error messages to include received value
- [ ] Verify errors are helpful for debugging

~~~~~

## Summary

| Chunk | Priority | Files | Issue Type | Affected Pages |
|-------|----------|-------|------------|----------------|
| 1 | CRITICAL | 1 | Syntax Error | /guest-proposals, /host-proposals |
| 2 | HIGH | 2 | Duplicate Files | /guest-proposals, /view-split-lease |
| 3 | HIGH | 2 | Duplicate Files | /guest-proposals |
| 4 | MEDIUM | 2 | Non-standard Import | /guest-proposals |
| 5 | HIGH | 2 | Duplicate Functions | /guest-proposals |
| 6 | MEDIUM | 2 | Code Duplication | /guest-proposals |
| 7 | LOW | 1 | Documentation | /search, /view-split-lease |
| 8 | MEDIUM | 1 | Inconsistent Pattern | /reviews |
| 9 | MEDIUM | 1 | Missing Validation | /search |
| 10 | LOW | 1 | Debug Logging | /messages |
| 11 | LOW | 1 | Missing Export | AUTO |
| 12 | MEDIUM | 3 | Inconsistent Format | AUTO |

## Recommended Execution Order

1. **Chunk 1** (CRITICAL) - Fix build-breaking duplicate import
2. **Chunks 2, 3, 5, 6** (HIGH) - Consolidate duplicates
3. **Chunk 4** (MEDIUM) - Fix non-standard imports
4. **Chunks 8, 9, 12** (MEDIUM) - Standardize patterns
5. **Chunks 7, 10, 11** (LOW) - Documentation and cleanup

## Key Files Referenced

- `app/src/logic/rules/proposals/proposalRules.js` - Chunks 1, 5
- `app/src/logic/processors/proposal/processProposalData.js` - Chunk 2
- `app/src/logic/processors/proposals/processProposalData.js` - Chunk 2
- `app/src/logic/workflows/booking/cancelProposalWorkflow.js` - Chunk 3
- `app/src/logic/workflows/proposals/cancelProposalWorkflow.js` - Chunk 3
- `app/src/logic/rules/proposals/proposalButtonRules.js` - Chunks 4, 6
- `app/src/logic/rules/proposals/useProposalButtonStates.js` - Chunks 4, 6
- `app/src/logic/rules/proposals/canCancelProposal.js` - Chunk 5
- `app/src/logic/calculators/scheduling/isContiguousSelection.js` - Chunks 7, 9
- `app/src/logic/calculators/reviews/calculateFormCompletion.js` - Chunk 8
- `app/src/logic/workflows/proposals/navigationWorkflow.js` - Chunk 10
- `app/src/logic/constants/proposalStatuses.js` - Chunk 11
- `app/src/logic/calculators/pricing/calculateGuestFacingPrice.js` - Chunk 12
- `app/src/logic/calculators/scheduling/calculateCheckInOutDays.js` - Chunk 12
- `app/src/logic/calculators/pricing/calculatePricingBreakdown.js` - Chunk 12
