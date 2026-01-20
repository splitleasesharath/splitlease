# Code Refactoring Plan - app/src/logic

**Date:** 2026-01-18
**Audit Type:** general
**Files Analyzed:** 68
**Edge Reduction Potential:** 4%

---

## EXECUTIVE SUMMARY

### Critical Issues Found
| Issue Type | Count | Priority |
|------------|-------|----------|
| Duplicate Import Statements | 1 | CRITICAL |
| Duplicate Function Implementations | 3 | HIGH |
| React Hook in Rules Layer (Architecture Violation) | 2 | HIGH |
| Missing JSDoc Parameter Annotation | 1 | MEDIUM |
| Duplicate cancelProposalWorkflow Files | 2 | HIGH |
| Duplicate processProposalData Files | 2 | HIGH |

### Files with HIGH IMPACT (15+ dependents)
- `constants/proposalStatuses.js` (21 dependents) - **AVOID MODIFYING**

### Circular Dependencies
None detected.

---

## PAGE GROUP: /guest-proposals (Chunks: 1, 2, 3, 4, 5)

This page group includes:
- `/guest-proposals` - Main guest proposals page
- `ProposalCard.jsx` - Proposal card component
- `ExpandableProposalCard.jsx` - Expandable proposal card component

~~~~~

### CHUNK 1: Duplicate Import in proposalRules.js (CRITICAL)
**File:** `app/src/logic/rules/proposals/proposalRules.js`
**Line:** 16 and 352-358
**Issue:** The file has DUPLICATE import statements for the same module. Lines 16 and 352-358 both import from `../../constants/proposalStatuses.js`. This is a JavaScript syntax error that could cause runtime failures or bundler issues.
**Affected Pages:** /guest-proposals, /view-split-lease, /create-suggested-proposal

**Current Code:**
```javascript
// Line 16
import { PROPOSAL_STATUSES, isTerminalStatus, isCompletedStatus, getActionsForStatus } from '../../constants/proposalStatuses.js';

// Lines 351-358 (DUPLICATE - violates JS module rules)
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

**Refactored Code:**
```javascript
// Line 16 - Single, consolidated import
import {
  PROPOSAL_STATUSES,
  isTerminalStatus,
  isCompletedStatus,
  getActionsForStatus,
  isSuggestedProposal
} from '../../constants/proposalStatuses.js';

// Remove lines 351-362 entirely

// At the end of the file, add re-export for backward compatibility:
export { isSuggestedProposal as isSLSuggestedProposal };
```

**Testing:**
- [ ] Run `bun run build` to verify no syntax errors
- [ ] Check that `/guest-proposals` page loads without errors
- [ ] Verify `isSLSuggestedProposal` is still accessible from existing imports

~~~~~

### CHUNK 2: Duplicate useProposalButtonStates Hook and proposalButtonRules
**Files:** `app/src/logic/rules/proposals/useProposalButtonStates.js`, `app/src/logic/rules/proposals/proposalButtonRules.js`
**Line:** Entire files
**Issue:** These two files contain nearly IDENTICAL implementations of the same button state logic. `useProposalButtonStates.js` (148 lines) is a React hook that wraps `useMemo`, while `proposalButtonRules.js` (129 lines) is a pure function `computeProposalButtonStates`. The logic inside both is 95% identical. This violates DRY and creates maintenance burden.
**Affected Pages:** /guest-proposals

**Current Code (useProposalButtonStates.js):**
```javascript
import { useMemo } from 'react';
import { getStatusConfig, PROPOSAL_STATUS } from '../../../config/proposalStatusConfig.js';

export function useProposalButtonStates({ proposal, virtualMeeting, guest, listing, currentUserId }) {
  return useMemo(() => {
    if (!proposal) {
      return {
        virtualMeeting: { visible: false },
        guestAction1: { visible: false },
        guestAction2: { visible: false },
        cancelProposal: { visible: false },
      };
    }
    // ... 120+ lines of button logic
  }, [proposal, virtualMeeting, guest, listing, currentUserId]);
}
```

**Current Code (proposalButtonRules.js):**
```javascript
import { getStatusConfig, PROPOSAL_STATUS } from '../../../config/proposalStatusConfig.js';

export function computeProposalButtonStates({ proposal, virtualMeeting, guest, listing, currentUserId }) {
  if (!proposal) {
    return {
      virtualMeeting: { visible: false },
      guestAction1: { visible: false },
      guestAction2: { visible: false },
      cancelProposal: { visible: false },
    };
  }
  // ... 120+ lines of identical button logic
}
```

**Refactored Code:**
```javascript
// proposalButtonRules.js - Keep only the pure function
import { getStatusConfig, PROPOSAL_STATUS } from '../../../config/proposalStatusConfig.js';

/**
 * Compute button states for a proposal card (pure function).
 * @param {object} params - Named parameters
 * @param {object} params.proposal - The proposal object
 * @param {object} params.virtualMeeting - Virtual meeting data
 * @param {object} params.guest - Guest user object
 * @param {object} params.listing - Listing object
 * @param {string} params.currentUserId - Current user's ID
 * @returns {object} Button states
 */
export function computeProposalButtonStates({ proposal, virtualMeeting, guest, listing, currentUserId }) {
  // ... single implementation of button logic
}

// useProposalButtonStates.js - Thin wrapper that calls the pure function
import { useMemo } from 'react';
import { computeProposalButtonStates } from './proposalButtonRules.js';

/**
 * React hook wrapper for proposal button states with memoization.
 */
export function useProposalButtonStates(params) {
  return useMemo(
    () => computeProposalButtonStates(params),
    [params.proposal, params.virtualMeeting, params.guest, params.listing, params.currentUserId]
  );
}
```

**Testing:**
- [ ] Verify `app/src/hooks/useProposalButtonStates.js` still works
- [ ] Test ProposalCard button visibility on `/guest-proposals`
- [ ] Test ExpandableProposalCard button visibility

~~~~~

### CHUNK 3: Architecture Violation - React Hook in Rules Layer
**File:** `app/src/logic/rules/proposals/useProposalButtonStates.js`
**Line:** 1-148
**Issue:** This file is a React hook (`useMemo` import on line 11) placed in the `rules/` layer. The four-layer architecture specifies that rules should be pure boolean predicates with NO React dependencies. React hooks belong in `app/src/hooks/`. This violates the architecture and makes the rules layer impure.
**Affected Pages:** /guest-proposals

**Current Code:**
```javascript
// File location: app/src/logic/rules/proposals/useProposalButtonStates.js
import { useMemo } from 'react';  // React import in rules layer!
import { getStatusConfig, PROPOSAL_STATUS } from '../../../config/proposalStatusConfig.js';

export function useProposalButtonStates({ proposal, virtualMeeting, guest, listing, currentUserId }) {
  return useMemo(() => {
    // ...
  }, [proposal, virtualMeeting, guest, listing, currentUserId]);
}
```

**Refactored Code:**
```javascript
// MOVE file to: app/src/hooks/useProposalButtonStates.js
// (Note: A wrapper already exists at this location - consolidate them)

// Keep pure logic in: app/src/logic/rules/proposals/proposalButtonRules.js
// as computeProposalButtonStates (pure function, no React)

// The existing app/src/hooks/useProposalButtonStates.js already does this correctly:
import { computeProposalButtonStates } from '../logic/rules/proposals/proposalButtonRules.js';
// Just delete the rules layer file after consolidation
```

**Testing:**
- [ ] Delete `app/src/logic/rules/proposals/useProposalButtonStates.js`
- [ ] Verify `app/src/hooks/useProposalButtonStates.js` is used everywhere
- [ ] Run build to ensure no broken imports

~~~~~

### CHUNK 4: Duplicate cancelProposalWorkflow Implementations
**Files:** `app/src/logic/workflows/booking/cancelProposalWorkflow.js`, `app/src/logic/workflows/proposals/cancelProposalWorkflow.js`
**Line:** Entire files
**Issue:** Two files with IDENTICAL names implementing the same cancellation workflow. The `booking/` version (144 lines) uses dependency injection pattern for `canCancelProposal`, while the `proposals/` version (176 lines) imports it directly. Both update the same `proposal` table with the same status. This creates confusion and maintenance burden.
**Affected Pages:** /guest-proposals, /view-split-lease

**Current Code (workflows/booking/cancelProposalWorkflow.js):**
```javascript
import { PROPOSAL_STATUSES } from '../../constants/proposalStatuses.js'

export async function cancelProposalWorkflow({
  supabase,
  proposal,
  source = 'main',
  canCancelProposal  // Dependency injection
}) {
  // Uses passed-in canCancelProposal function
  const canCancel = canCancelProposal({
    proposalStatus: proposal.status,
    deleted: proposal.deleted
  })
  // ...
}
```

**Current Code (workflows/proposals/cancelProposalWorkflow.js):**
```javascript
import { supabase } from '../../../lib/supabase.js';
import { canCancelProposal, requiresSpecialCancellationConfirmation } from '../../rules/proposals/proposalRules.js';
import { PROPOSAL_STATUSES } from '../../constants/proposalStatuses.js';

export function determineCancellationCondition(proposal) { /* ... */ }
export async function executeCancelProposal(proposalId, reason = null) { /* ... */ }
export async function cancelProposalFromCompareTerms(proposalId, reason = 'Counteroffer declined') { /* ... */ }
export async function executeDeleteProposal(proposalId) { /* ... */ }
```

**Refactored Code:**
```javascript
// KEEP: app/src/logic/workflows/proposals/cancelProposalWorkflow.js
// (More comprehensive with determineCancellationCondition, soft-delete, etc.)

// DEPRECATE: app/src/logic/workflows/booking/cancelProposalWorkflow.js
// Update any imports from booking/ to proposals/

// The proposals/ version has:
// - determineCancellationCondition() - business logic
// - executeCancelProposal() - actual DB update
// - cancelProposalFromCompareTerms() - modal-specific variant
// - executeDeleteProposal() - soft delete

// These are used by:
// - ProposalCard.jsx (executeDeleteProposal)
// - ExpandableProposalCard.jsx (executeDeleteProposal)
// - GuestEditingProposalModal.jsx (executeCancelProposal)
```

**Testing:**
- [ ] Search for imports from `workflows/booking/cancelProposalWorkflow`
- [ ] Update to use `workflows/proposals/cancelProposalWorkflow`
- [ ] Delete `workflows/booking/cancelProposalWorkflow.js`
- [ ] Test cancel flow on ProposalCard
- [ ] Test cancel flow on GuestEditingProposalModal

~~~~~

### CHUNK 5: Duplicate processProposalData Implementations
**Files:** `app/src/logic/processors/proposal/processProposalData.js`, `app/src/logic/processors/proposals/processProposalData.js`
**Line:** Entire files
**Issue:** Two directories (`proposal/` singular vs `proposals/` plural) with DIFFERENT implementations of the same function name. The `proposal/` version (149 lines) has a cleaner structure with `currentTerms`/`originalTerms`, while `proposals/` (330 lines) has more functions including `formatPrice`, `formatDate`, `getEffectiveTerms`. This creates import confusion.
**Affected Pages:** /guest-proposals, /view-split-lease, /host-proposals

**Current Code (processors/proposal/processProposalData.js):**
```javascript
// Cleaner, focused implementation
import { PROPOSAL_STATUSES, getUsualOrder } from '../../constants/proposalStatuses.js'

export function processProposalData({ rawProposal, listing = null, guest = null, host = null }) {
  // Returns: { id, currentTerms, originalTerms, hasCounteroffer, ... }
}
```

**Current Code (processors/proposals/processProposalData.js):**
```javascript
// More comprehensive with nested processors
export function processUserData(rawUser) { /* ... */ }
export function processListingData(rawListing) { /* ... */ }
export function processHostData(rawHost) { /* ... */ }
export function processVirtualMeetingData(rawVirtualMeeting) { /* ... */ }
export function processProposalData(rawProposal) { /* ... */ }
export function getProposalDisplayText(proposal) { /* ... */ }
export function formatPrice(price, includeCents = true) { /* ... */ }
export function formatDate(date) { /* ... */ }
export function formatDateTime(datetime) { /* ... */ }
export function getEffectiveTerms(proposal) { /* ... */ }
```

**Refactored Code:**
```javascript
// CONSOLIDATE INTO: app/src/logic/processors/proposals/processProposalData.js

// Split into separate files for clarity:
// 1. processProposalData.js - just processProposalData function
// 2. processUserData.js - move to processors/user/ (already exists!)
// 3. formatters.js - move formatPrice, formatDate, formatDateTime
// 4. getEffectiveTerms.js - keep with proposal processing

// DELETE: app/src/logic/processors/proposal/ (singular) directory
// Update all imports to use processors/proposals/
```

**Testing:**
- [ ] Search for imports from `processors/proposal/processProposalData`
- [ ] Update to use `processors/proposals/processProposalData`
- [ ] Delete `processors/proposal/` directory
- [ ] Test proposal data processing on all pages

~~~~~

## PAGE GROUP: /search (Chunks: 6)

~~~~~

### CHUNK 6: Missing JSDoc Parameter in isContiguousSelection
**File:** `app/src/logic/calculators/scheduling/isContiguousSelection.js`
**Line:** 5
**Issue:** Malformed JSDoc comment. The `@param` annotation contains a file path reference instead of proper parameter documentation: `@.claude\plans\Deprecated\Context\Option Sets\ZEP - Curation Parameters(OS).md {number[]} selectedDays`. This is likely a copy-paste error that broke the JSDoc.
**Affected Pages:** /search, /create-split-lease

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
 * @param {number[]} selectedDays - Array of day indices (0-6, where 0=Sunday).
 * @returns {boolean} True if days are contiguous.
 *
 * @example
 * isContiguousSelection([1, 2, 3, 4]) // => true (Mon-Thu)
 * isContiguousSelection([5, 6, 0, 1]) // => true (Fri-Mon, wraps around)
 * isContiguousSelection([1, 3, 5])    // => false (non-contiguous)
 */
export function isContiguousSelection(selectedDays) {
```

**Testing:**
- [ ] Run `bun run lint` to verify JSDoc is valid
- [ ] Verify function still works correctly with day selection on /search

~~~~~

## PAGE GROUP: /view-split-lease (Chunks: 7)

~~~~~

### CHUNK 7: Unused Import in counterofferWorkflow
**File:** `app/src/logic/workflows/proposals/counterofferWorkflow.js`
**Line:** 19
**Issue:** The `hasReviewableCounteroffer` function is imported but never used in the file. The workflow directly checks `proposal['counter offer happened']` instead of using the rule function. This is inconsistent with the four-layer architecture where workflows should use rules, not raw field checks.
**Affected Pages:** /view-split-lease, /guest-proposals

**Current Code:**
```javascript
import { supabase } from '../../../lib/supabase.js';
import { hasReviewableCounteroffer } from '../../rules/proposals/proposalRules.js';  // Imported but unused
import { PROPOSAL_STATUSES } from '../../constants/proposalStatuses.js';

export async function acceptCounteroffer(proposalId) {
  // ...
  if (!proposal['counter offer happened']) {  // Raw field check instead of using rule
    throw new Error('Proposal does not have a counteroffer to accept');
  }
  // ...
}
```

**Refactored Code:**
```javascript
import { supabase } from '../../../lib/supabase.js';
import { hasReviewableCounteroffer } from '../../rules/proposals/proposalRules.js';
import { PROPOSAL_STATUSES } from '../../constants/proposalStatuses.js';

export async function acceptCounteroffer(proposalId) {
  // ...
  // Use the rule function for consistency
  if (!hasReviewableCounteroffer(proposal)) {
    throw new Error('Proposal does not have a reviewable counteroffer');
  }
  // ...
}
```

**Testing:**
- [ ] Test accept counteroffer flow on /view-split-lease
- [ ] Verify error message displays correctly when no counteroffer exists

~~~~~

## PAGE GROUP: /host-proposals (Chunks: 8)

~~~~~

### CHUNK 8: Duplicate User Processing Functions
**File:** `app/src/logic/processors/proposals/processProposalData.js`
**Line:** 18-39, 81-99
**Issue:** The file contains `processUserData` and `processHostData` functions that are nearly identical (same field mappings, same structure). Additionally, `processUserData` already exists in `processors/user/processUserData.js` with a more robust implementation. This violates DRY.
**Affected Pages:** /host-proposals, /guest-proposals

**Current Code (in processors/proposals/processProposalData.js):**
```javascript
export function processUserData(rawUser) {
  if (!rawUser) { throw new Error('processUserData: User data is required'); }
  if (!rawUser._id) { throw new Error('processUserData: User ID (_id) is required'); }

  return {
    id: rawUser._id,
    firstName: rawUser['Name - First'] || null,
    lastName: rawUser['Name - Last'] || null,
    fullName: rawUser['Name - Full'] || null,
    profilePhoto: rawUser['Profile Photo'] || null,
    // ... more fields
  };
}

export function processHostData(rawHost) {
  if (!rawHost) { return null; }

  return {
    id: rawHost._id,
    firstName: rawHost['Name - First'] || null,  // Same fields!
    lastName: rawHost['Name - Last'] || null,
    fullName: rawHost['Name - Full'] || null,
    profilePhoto: rawHost['Profile Photo'] || null,
    // ... identical to processUserData
  };
}
```

**Refactored Code:**
```javascript
// In processors/proposals/processProposalData.js:
// REMOVE processUserData and processHostData functions
// IMPORT from the canonical location instead:

import { processUserData } from '../user/processUserData.js';

// processHostData is just processUserData with different null handling
// Inline it or create a thin wrapper:
function processHostData(rawHost) {
  if (!rawHost) return null;
  return processUserData({ rawUser: rawHost, requireVerification: false });
}
```

**Testing:**
- [ ] Update imports in files using processHostData
- [ ] Verify host data displays correctly on /host-proposals
- [ ] Verify guest data displays correctly on /guest-proposals

~~~~~

## PAGE GROUP: AUTO (Shared/Multiple Pages) (Chunks: 9, 10)

~~~~~

### CHUNK 9: Inconsistent Status Field Access Pattern
**Files:** Multiple files across rules and workflows
**Line:** Various
**Issue:** Throughout the codebase, proposal status is accessed inconsistently: sometimes as `proposal.status`, sometimes as `proposal.Status` (capital S), and sometimes with a fallback `proposal.status || proposal.Status`. This pattern repeats in 15+ locations and should be standardized.
**Affected Pages:** AUTO (all proposal-related pages)

**Current Code (example from proposalRules.js):**
```javascript
const status = proposal.status || proposal.Status;  // Repeated 10+ times
```

**Current Code (example from processProposalData.js):**
```javascript
const status = typeof rawProposal.Status === 'string'
  ? rawProposal.Status.trim()
  : (typeof rawProposal.status === 'string' ? rawProposal.status.trim() : 'Draft')
```

**Refactored Code:**
```javascript
// Create a utility function in processors/proposal/
/**
 * Safely extract and normalize proposal status from raw data.
 * Handles both 'status' and 'Status' field names, trims whitespace.
 * @param {object} proposal - Raw or processed proposal object
 * @returns {string} Normalized status string
 */
export function getProposalStatus(proposal) {
  if (!proposal) return 'Unknown';
  const rawStatus = proposal.status ?? proposal.Status;
  return typeof rawStatus === 'string' ? rawStatus.trim() : 'Unknown';
}

// Then use consistently:
const status = getProposalStatus(proposal);
```

**Testing:**
- [ ] Create `getProposalStatus` utility function
- [ ] Update all status access patterns to use it
- [ ] Run full test suite to verify no regressions

~~~~~

### CHUNK 10: Console Warnings Without Structured Logging
**Files:** Multiple workflow files
**Line:** Various
**Issue:** Workflow files use bare `console.log` and `console.warn` for logging without structured context. This makes debugging difficult in production. Should use a consistent logging pattern with context objects.
**Affected Pages:** AUTO (all pages with async operations)

**Current Code (from counterofferWorkflow.js):**
```javascript
console.log('[counterofferWorkflow] Accepting counteroffer for proposal:', proposalId);
// ...
console.error('[counterofferWorkflow] Error accepting counteroffer:', error);
```

**Refactored Code:**
```javascript
// Create a logging utility (optional enhancement)
const log = {
  info: (message, context) => console.log(`[counterofferWorkflow] ${message}`, context),
  error: (message, error, context) => console.error(`[counterofferWorkflow] ${message}`, { error: error.message, ...context }),
  warn: (message, context) => console.warn(`[counterofferWorkflow] ${message}`, context)
};

// Usage:
log.info('Accepting counteroffer', { proposalId });
log.error('Failed to accept counteroffer', error, { proposalId });
```

**Testing:**
- [ ] Verify logs appear correctly in browser console
- [ ] Test error scenarios to ensure context is captured

~~~~~

---

## DEPENDENCY IMPACT SUMMARY

### Files to Modify (Sorted by Impact)

| File | Dependents | Risk Level | Chunks |
|------|------------|------------|--------|
| `constants/proposalStatuses.js` | 21 | CRITICAL | None (avoid) |
| `rules/proposals/proposalRules.js` | 4 | HIGH | 1 |
| `rules/proposals/proposalButtonRules.js` | 1 | LOW | 2, 3 |
| `rules/proposals/useProposalButtonStates.js` | 0 | LOW | 2, 3 |
| `workflows/proposals/cancelProposalWorkflow.js` | 3 | MEDIUM | 4 |
| `workflows/booking/cancelProposalWorkflow.js` | 0 | LOW | 4 |
| `processors/proposal/processProposalData.js` | 0 | LOW | 5 |
| `processors/proposals/processProposalData.js` | 0 | LOW | 5, 8 |
| `calculators/scheduling/isContiguousSelection.js` | 0 | LOW | 6 |
| `workflows/proposals/counterofferWorkflow.js` | 0 | LOW | 7 |

### Leaf Files (Safe to Refactor): 54 files
Most files in the `calculators/` and individual `rules/` modules are leaf files with 0 dependents.

### Recommended Execution Order
1. **Chunk 1** (CRITICAL) - Fix duplicate import syntax error
2. **Chunk 6** (EASY) - Fix malformed JSDoc
3. **Chunk 7** (EASY) - Use imported rule function
4. **Chunk 2, 3** - Consolidate button state logic
5. **Chunk 4** - Consolidate cancel workflows
6. **Chunk 5, 8** - Consolidate processors
7. **Chunk 9, 10** - Cross-cutting improvements

---

## REFERENCED FILES

### Primary Files to Modify
- `app/src/logic/rules/proposals/proposalRules.js`
- `app/src/logic/rules/proposals/proposalButtonRules.js`
- `app/src/logic/rules/proposals/useProposalButtonStates.js`
- `app/src/logic/workflows/proposals/cancelProposalWorkflow.js`
- `app/src/logic/workflows/booking/cancelProposalWorkflow.js`
- `app/src/logic/workflows/proposals/counterofferWorkflow.js`
- `app/src/logic/processors/proposal/processProposalData.js`
- `app/src/logic/processors/proposals/processProposalData.js`
- `app/src/logic/calculators/scheduling/isContiguousSelection.js`

### Dependent Files (Will Need Import Updates)
- `app/src/islands/pages/proposals/ProposalCard.jsx`
- `app/src/islands/pages/proposals/ExpandableProposalCard.jsx`
- `app/src/islands/modals/GuestEditingProposalModal.jsx`
- `app/src/hooks/useProposalButtonStates.js`

### High-Impact File (DO NOT MODIFY)
- `app/src/logic/constants/proposalStatuses.js` (21 dependents)
