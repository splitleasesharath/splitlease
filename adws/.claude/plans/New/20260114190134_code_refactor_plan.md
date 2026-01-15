# Code Refactoring Plan - app/src/logic

Date: 2026-01-14
Audit Type: general
Target Directory: app/src/logic

~~~~~

## PAGE GROUP: /guest-proposals, /host-proposals (Chunks: 1, 2, 3, 4, 5, 6, 7, 8)

### CHUNK 1: Duplicate processProposalData functions in separate directories
**File:** app/src/logic/processors/proposal/processProposalData.js (149 lines)
         app/src/logic/processors/proposals/processProposalData.js (330 lines)
**Line:** N/A (architectural issue)
**Issue:** Two files with the same function name `processProposalData` exist in separate directories (`proposal/` vs `proposals/`). The index.js attempts to export both by aliasing one as `processFullProposalData`, but this creates confusion about which is canonical and maintenance burden as both must be kept in sync.
**Affected Pages:** /guest-proposals, /host-proposals, all proposal modals

**Current Code:**
```javascript
// processors/index.js lines 25-39
// Proposal Processors
export { processProposalData } from './proposal/processProposalData.js'

// Proposal Processors - Extended (from new implementation)
export {
  processUserData as processProposalUserData,
  processListingData,
  processHostData,
  processVirtualMeetingData,
  processProposalData as processFullProposalData,
  getProposalDisplayText,
  formatPrice,
  formatDate,
  formatDateTime,
  getEffectiveTerms
} from './proposals/processProposalData.js'
```

**Refactored Code:**
```javascript
// processors/index.js - Consolidated exports from single file
// Proposal Processors - All exports from unified file
export {
  processProposalData,
  processUserData as processProposalUserData,
  processListingData,
  processHostData,
  processVirtualMeetingData,
  getProposalDisplayText,
  formatPrice,
  formatDate,
  formatDateTime,
  getEffectiveTerms
} from './proposal/processProposalData.js'

// DELETE: processors/proposals/processProposalData.js (merge into proposal/)
```

**Testing:**
- [ ] Verify all imports still resolve after consolidation
- [ ] Run `bun run build` to check for broken imports
- [ ] Test /guest-proposals page loads correctly
- [ ] Test /host-proposals page loads correctly

~~~~~

### CHUNK 2: Duplicate cancelProposalWorkflow in booking/ and proposals/
**File:** app/src/logic/workflows/booking/cancelProposalWorkflow.js (144 lines)
         app/src/logic/workflows/proposals/cancelProposalWorkflow.js (176 lines)
**Line:** N/A (architectural issue)
**Issue:** Two cancel proposal workflows exist with different implementations. The `booking/` version uses dependency injection (testable), while `proposals/` version imports supabase directly (harder to test). Both are exported from workflows/index.js creating potential conflicts.
**Affected Pages:** /guest-proposals, /view-split-lease (GuestEditingProposalModal)

**Current Code:**
```javascript
// workflows/booking/cancelProposalWorkflow.js line 38-43
export async function cancelProposalWorkflow({
  supabase,
  proposal,
  source = 'main',
  canCancelProposal
}) {
  // Uses dependency injection - testable

// workflows/proposals/cancelProposalWorkflow.js line 21, 95
import { supabase } from '../../../lib/supabase.js';
// ...
export async function executeCancelProposal(proposalId, reason = null) {
  // Imports supabase directly - harder to test
```

**Refactored Code:**
```javascript
// workflows/proposals/cancelProposalWorkflow.js - Add dependency injection
// Keep all functions but accept supabase as parameter for testability
export async function executeCancelProposal(supabaseClient, proposalId, reason = null) {
  if (!supabaseClient) {
    throw new Error('supabaseClient is required');
  }
  if (!proposalId) {
    throw new Error('Proposal ID is required');
  }
  // ... rest of implementation using supabaseClient instead of supabase
}

// Delete workflows/booking/cancelProposalWorkflow.js
// OR merge unique decision tree logic into proposals/ version
```

**Testing:**
- [ ] Verify GuestEditingProposalModal still cancels proposals correctly
- [ ] Verify ProposalCard delete functionality works
- [ ] Write unit test for executeCancelProposal with mocked supabase

~~~~~

### CHUNK 3: React hook in Logic Core violates architecture principles
**File:** app/src/logic/rules/proposals/useProposalButtonStates.js
**Line:** 1-147
**Issue:** This file is a React hook (uses `useMemo` from React) placed in the Logic Core which should be React-agnostic. The Logic Core principles state: "No React dependencies", "No JSX allowed". This violates separation of concerns and reduces reusability.
**Affected Pages:** /guest-proposals

**Current Code:**
```javascript
// rules/proposals/useProposalButtonStates.js lines 1-12
/**
 * useProposalButtonStates Hook
 *
 * Computes button visibility and styling for guest proposal cards.
 * Maps Bubble.io conditional logic to React state.
 */

import { useMemo } from 'react';
import { getStatusConfig, PROPOSAL_STATUS } from '../../../config/proposalStatusConfig.js';

export function useProposalButtonStates({ proposal, virtualMeeting, guest, listing, currentUserId }) {
  return useMemo(() => {
```

**Refactored Code:**
```javascript
// MOVE TO: app/src/islands/shared/hooks/useProposalButtonStates.js
// OR: app/src/hooks/useProposalButtonStates.js

/**
 * useProposalButtonStates Hook
 *
 * Computes button visibility and styling for guest proposal cards.
 * Maps Bubble.io conditional logic to React state.
 *
 * NOTE: Moved from logic/rules/ to maintain Logic Core as React-agnostic
 */

import { useMemo } from 'react';
import { getStatusConfig, PROPOSAL_STATUS } from '../../config/proposalStatusConfig.js';

// Import pure logic functions from Logic Core
import { isTerminalStatus } from '../../logic/constants/proposalStatuses.js';

export function useProposalButtonStates({ proposal, virtualMeeting, guest, listing, currentUserId }) {
  return useMemo(() => {
    // ... existing implementation
  }, [proposal, virtualMeeting, guest, listing, currentUserId]);
}

// ALSO UPDATE: rules/index.js - Remove the export
// DELETE LINE 66: export { useProposalButtonStates } from './proposals/useProposalButtonStates.js'
```

**Testing:**
- [ ] Update all imports from logic/ to new location
- [ ] Verify /guest-proposals page still works with new import path
- [ ] Run `bun run build` to verify no broken imports

~~~~~

### CHUNK 4: Corrupted JSDoc comments with malformed file paths
**File:** app/src/logic/calculators/scheduling/getNextOccurrenceOfDay.js
**Line:** 4-5
**Issue:** JSDoc parameter documentation references a malformed/corrupted path `.claude\plans\Deprecated\Context\Option Sets\ZEP - Curation Parameters(OS).md` instead of proper `@param` syntax. This breaks documentation tooling and is misleading.
**Affected Pages:** /view-split-lease, /search, /favorites

**Current Code:**
```javascript
/**
 * Calculate the next occurrence of a specific day-of-week on or after a starting date.
 *
 * @.claude\plans\Deprecated\Context\Option Sets\ZEP - Curation Parameters(OS).md {Date} startDate - The date to start searching from.
 * @.claude\plans\Deprecated\Context\Option Sets\ZEP - Curation Parameters(OS).md {number} targetDayOfWeek - Day index (0-6, where 0=Sunday).
 * @returns {Date} The next occurrence of the target day.
 */
```

**Refactored Code:**
```javascript
/**
 * Calculate the next occurrence of a specific day-of-week on or after a starting date.
 *
 * @param {Date} startDate - The date to start searching from.
 * @param {number} targetDayOfWeek - Day index (0-6, where 0=Sunday).
 * @returns {Date} The next occurrence of the target day.
 */
```

**Testing:**
- [ ] Verify JSDoc renders correctly in IDE
- [ ] Run any documentation generation tools if applicable

~~~~~

### CHUNK 5: Corrupted JSDoc comments in isContiguousSelection
**File:** app/src/logic/calculators/scheduling/isContiguousSelection.js
**Line:** 5
**Issue:** Same JSDoc corruption as CHUNK 4 - uses malformed path instead of `@param`.
**Affected Pages:** AUTO (shared utility)

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
- [ ] Verify JSDoc renders correctly in IDE

~~~~~

### CHUNK 6: Duplicate canCancelProposal logic in two files
**File:** app/src/logic/rules/proposals/canCancelProposal.js (48 lines)
         app/src/logic/rules/proposals/proposalRules.js (lines 26-54)
**Line:** canCancelProposal.js:27-47, proposalRules.js:26-54
**Issue:** The `canCancelProposal` function is implemented in two places with slightly different signatures. The standalone file uses named parameters `{ proposalStatus, deleted }` while proposalRules.js uses `(proposal)` object. Both are exported from rules/index.js creating ambiguity.
**Affected Pages:** /guest-proposals, /view-split-lease

**Current Code:**
```javascript
// rules/proposals/canCancelProposal.js line 27
export function canCancelProposal({ proposalStatus, deleted = false }) {
  // Uses named parameters - explicit
  if (deleted) {
    return false
  }
  const status = proposalStatus.trim()
  // ...
}

// rules/proposals/proposalRules.js line 26
export function canCancelProposal(proposal) {
  // Uses proposal object - implicit
  if (!proposal) {
    return false;
  }
  const status = proposal.status || proposal.Status;
  // ...
}
```

**Refactored Code:**
```javascript
// Keep ONLY rules/proposals/canCancelProposal.js with named parameters
// It follows the Logic Core convention of explicit named parameters

// rules/proposals/proposalRules.js - DELETE the duplicate function (lines 19-54)
// The file should import from canCancelProposal.js if needed internally

// rules/index.js - Ensure single export
export { canCancelProposal } from './proposals/canCancelProposal.js'
// Remove from proposalRules.js re-exports if duplicated
```

**Testing:**
- [ ] Search codebase for all usages of canCancelProposal
- [ ] Update callers using `canCancelProposal(proposal)` to use `canCancelProposal({ proposalStatus: proposal.status, deleted: proposal.deleted })`
- [ ] Verify /guest-proposals page cancel button works

~~~~~

### CHUNK 7: Fallback pattern in getCancellationReasonOptions violates "No Fallback" principle
**File:** app/src/logic/rules/proposals/proposalRules.js
**Line:** 298-317
**Issue:** The function includes a hardcoded fallback array when cache is empty, violating the Logic Core's "No fallback patterns" principle. The comment acknowledges this is for "resilience during initialization" but this masks potential data loading issues.
**Affected Pages:** /guest-proposals (cancellation modal)

**Current Code:**
```javascript
export function getCancellationReasonOptions() {
  const cachedReasons = getGuestCancellationReasons();

  if (cachedReasons.length > 0) {
    return cachedReasons.map(r => r.reason);
  }

  // Fallback for initial render before cache is populated
  // Note: If logging is needed for empty cache, the caller (workflow layer) should handle it
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
 * Get available cancellation reason options for guests
 * Fetches from cached reference data (initialized via dataLookups.js)
 *
 * @throws {Error} If cache is empty and not yet initialized
 * @returns {Array<string>} Array of reason option strings
 */
export function getCancellationReasonOptions() {
  const cachedReasons = getGuestCancellationReasons();

  if (cachedReasons.length === 0) {
    throw new Error(
      'getCancellationReasonOptions: Cancellation reasons cache is empty. ' +
      'Ensure dataLookups.js has initialized before calling this function.'
    );
  }

  return cachedReasons.map(r => r.reason);
}

// Caller (workflow/UI) should handle the loading state and only call
// this function after cache is confirmed populated
```

**Testing:**
- [ ] Ensure dataLookups.js initializes before cancellation modal opens
- [ ] Add loading state to cancel modal if reasons not yet available
- [ ] Verify error is properly caught and displayed if cache fails

~~~~~

### CHUNK 8: Hardcoded supabase import in workflow files reduces testability
**File:** app/src/logic/workflows/proposals/counterofferWorkflow.js
**Line:** 18
**Issue:** Directly imports supabase client, making the workflow hard to unit test. Should use dependency injection pattern like booking/cancelProposalWorkflow.js for consistency and testability.
**Affected Pages:** /guest-proposals (Compare Terms modal)

**Current Code:**
```javascript
// counterofferWorkflow.js line 18
import { supabase } from '../../../lib/supabase.js';

// acceptCounteroffer function line 29-76
export async function acceptCounteroffer(proposalId) {
  // ...
  const { data, error } = await supabase
    .from('proposal')
    // ...
}
```

**Refactored Code:**
```javascript
// counterofferWorkflow.js - Use dependency injection
// Remove line 18: import { supabase } from '../../../lib/supabase.js';

/**
 * Accept a counteroffer
 * @param {Object} supabaseClient - Supabase client instance (injected for testability)
 * @param {string} proposalId - Proposal ID
 * @returns {Promise<Object>} Updated proposal data
 */
export async function acceptCounteroffer(supabaseClient, proposalId) {
  if (!supabaseClient) {
    throw new Error('supabaseClient is required');
  }
  if (!proposalId) {
    throw new Error('Proposal ID is required');
  }

  console.log('[counterofferWorkflow] Accepting counteroffer for proposal:', proposalId);

  const { data: proposal, error: fetchError } = await supabaseClient
    .from('proposal')
    .select('*')
    .eq('_id', proposalId)
    .single();
  // ... rest using supabaseClient
}

// Similarly update declineCounteroffer(supabaseClient, proposalId, reason)
```

**Testing:**
- [ ] Update all callers to pass supabase client
- [ ] Write unit tests with mocked supabase client
- [ ] Verify Compare Terms modal accept/decline works

~~~~~

## PAGE GROUP: /view-split-lease (Chunks: 9, 10)

### CHUNK 9: ES2023 toSorted() may have compatibility issues
**File:** app/src/logic/rules/scheduling/isScheduleContiguous.js
**Line:** 55
**Issue:** Uses `.toSorted()` which is an ES2023 feature. While modern browsers support it, older Node.js versions or certain build targets may not. Should verify build target or use compatible alternative.
**Affected Pages:** /view-split-lease, /search (schedule selector)

**Current Code:**
```javascript
// isScheduleContiguous.js line 55
const sorted = selectedDayIndices.toSorted((a, b) => a - b)
```

**Refactored Code:**
```javascript
// Use spread operator + sort for broader compatibility
const sorted = [...selectedDayIndices].sort((a, b) => a - b)
```

**Testing:**
- [ ] Check package.json/vite.config.js for build target
- [ ] If build target supports ES2023, this change is optional
- [ ] Verify schedule selector still validates correctly after change

~~~~~

### CHUNK 10: Inconsistent validation - isContiguousSelection returns false vs throwing
**File:** app/src/logic/calculators/scheduling/isContiguousSelection.js
**Line:** 9
**Issue:** When `selectedDays` is null/empty, this function returns `false` silently instead of throwing an error. Other Logic Core functions (like `isScheduleContiguous`) throw errors for invalid input. This inconsistency can mask bugs.
**Affected Pages:** AUTO (shared utility)

**Current Code:**
```javascript
// isContiguousSelection.js lines 8-11
export function isContiguousSelection(selectedDays) {
  if (!selectedDays || selectedDays.length === 0) return false;
  if (selectedDays.length === 1) return true;
  if (selectedDays.length >= 6) return true;
```

**Refactored Code:**
```javascript
/**
 * Check if selected days form a contiguous block.
 * Handles week wrap-around cases (e.g., Fri-Mon).
 *
 * @param {number[]} selectedDays - Array of day indices (0-6).
 * @returns {boolean} True if days are contiguous.
 * @throws {Error} If selectedDays is not a valid array.
 */
export function isContiguousSelection(selectedDays) {
  if (!Array.isArray(selectedDays)) {
    throw new Error(
      `isContiguousSelection: selectedDays must be an array, got ${typeof selectedDays}`
    );
  }

  if (selectedDays.length === 0) {
    return false; // Empty selection is definitionally not contiguous
  }

  if (selectedDays.length === 1) return true;
  if (selectedDays.length >= 6) return true;
  // ... rest of logic
```

**Testing:**
- [ ] Update any callers passing null to handle error or guard before call
- [ ] Verify schedule selector still works correctly

~~~~~

## PAGE GROUP: /search (Chunks: 11)

### CHUNK 11: shiftMoveInDateIfPast doesn't export from calculators index
**File:** app/src/logic/calculators/scheduling/shiftMoveInDateIfPast.js
**Line:** N/A (missing export)
**Issue:** The `shiftMoveInDateIfPast` function exists but is NOT exported from `calculators/index.js`. It's imported directly by FavoriteListingsPage and SearchPage via full path, bypassing the central export point. This inconsistency makes it harder to discover available functions.
**Affected Pages:** /search, /favorites

**Current Code:**
```javascript
// FavoriteListingsPage.jsx line 29
import { shiftMoveInDateIfPast } from '../../../logic/calculators/scheduling/shiftMoveInDateIfPast.js';

// SearchPage.jsx line 24
import { shiftMoveInDateIfPast } from '../../logic/calculators/scheduling/shiftMoveInDateIfPast.js';

// calculators/index.js - MISSING export for shiftMoveInDateIfPast
```

**Refactored Code:**
```javascript
// calculators/index.js - Add missing export
// Scheduling Calculators
export { calculateCheckInOutDays } from './scheduling/calculateCheckInOutDays.js'
export { calculateNextAvailableCheckIn } from './scheduling/calculateNextAvailableCheckIn.js'
export { calculateNightsFromDays } from './scheduling/calculateNightsFromDays.js'
export { getNextOccurrenceOfDay } from './scheduling/getNextOccurrenceOfDay.js'
export { isContiguousSelection } from './scheduling/isContiguousSelection.js'
export { shiftMoveInDateIfPast } from './scheduling/shiftMoveInDateIfPast.js'  // ADD THIS

// Then update imports in consuming files:
// FavoriteListingsPage.jsx
import { shiftMoveInDateIfPast } from '../../../logic/index.js';

// SearchPage.jsx
import { shiftMoveInDateIfPast } from '../../logic/index.js';
```

**Testing:**
- [ ] Add export to calculators/index.js
- [ ] Update imports in SearchPage.jsx and FavoriteListingsPage.jsx
- [ ] Run `bun run build` to verify

~~~~~

## PAGE GROUP: /host-proposals (Chunks: 12)

### CHUNK 12: virtualMeetingWorkflow imports supabase directly
**File:** app/src/logic/workflows/proposals/virtualMeetingWorkflow.js
**Line:** 14
**Issue:** Same testability issue as CHUNK 8 - directly imports supabase client instead of using dependency injection. All 6 exported functions use the hardcoded import.
**Affected Pages:** /host-proposals, /guest-proposals (Virtual Meeting modals)

**Current Code:**
```javascript
// virtualMeetingWorkflow.js line 14
import { supabase } from '../../../lib/supabase.js';

// All functions use `supabase` directly
export async function requestVirtualMeeting(proposalId, guestId) {
  // ...
  const { data, error } = await supabase
    .from('virtualmeetingschedulesandlinks')
    // ...
}
```

**Refactored Code:**
```javascript
// virtualMeetingWorkflow.js - Use dependency injection for all functions
// Remove direct supabase import

/**
 * Create a new virtual meeting request
 * @param {Object} supabaseClient - Supabase client instance
 * @param {string} proposalId - Proposal ID
 * @param {string} guestId - Guest user ID who is requesting the meeting
 * @returns {Promise<Object>} Created virtual meeting object
 */
export async function requestVirtualMeeting(supabaseClient, proposalId, guestId) {
  if (!supabaseClient) {
    throw new Error('supabaseClient is required');
  }
  if (!proposalId || !guestId) {
    throw new Error('Proposal ID and Guest ID are required');
  }
  // ... use supabaseClient instead of supabase
}

// Apply same pattern to all 6 functions:
// - requestVirtualMeeting(supabaseClient, proposalId, guestId)
// - requestAlternativeMeeting(supabaseClient, existingVmId, proposalId, guestId)
// - respondToVirtualMeeting(supabaseClient, vmId, bookedDate)
// - declineVirtualMeeting(supabaseClient, vmId)
// - cancelVirtualMeetingRequest(supabaseClient, vmId)
// - fetchVirtualMeetingByProposalId(supabaseClient, proposalId)
```

**Testing:**
- [ ] Update all callers to pass supabase client
- [ ] Write unit tests with mocked supabase
- [ ] Verify VM request/respond/cancel flows work

~~~~~

## PAGE GROUP: AUTO - Shared Utilities (Chunks: 13)

### CHUNK 13: proposalRules.js imports from wrong location
**File:** app/src/logic/rules/proposals/proposalRules.js
**Line:** 16-17
**Issue:** Imports `PROPOSAL_STATUSES` and related functions from `../../../lib/constants/proposalStatuses.js` instead of the Logic Core path `../../constants/proposalStatuses.js`. This creates inconsistent import paths and potential for circular dependencies.
**Affected Pages:** All proposal-related pages

**Current Code:**
```javascript
// proposalRules.js lines 16-17
import { PROPOSAL_STATUSES, isTerminalStatus, isCompletedStatus, getActionsForStatus } from '../../../lib/constants/proposalStatuses.js';
import { getGuestCancellationReasons } from '../../../lib/dataLookups.js';
```

**Refactored Code:**
```javascript
// proposalRules.js - Use Logic Core path
import { PROPOSAL_STATUSES, isTerminalStatus, isCompletedStatus, getActionsForStatus } from '../../constants/proposalStatuses.js';
// dataLookups is external dependency - keep as is since it's not part of Logic Core
import { getGuestCancellationReasons } from '../../../lib/dataLookups.js';
```

**Testing:**
- [ ] Verify the Logic Core constants/proposalStatuses.js has all needed exports
- [ ] Run `bun run build` to check import resolution
- [ ] Ensure no circular dependency warnings

~~~~~

## Summary

| Chunk | Issue Type | Severity | Affected Pages |
|-------|-----------|----------|----------------|
| 1 | Duplicate files | HIGH | /guest-proposals, /host-proposals |
| 2 | Duplicate workflow | HIGH | /guest-proposals, /view-split-lease |
| 3 | Architecture violation | MEDIUM | /guest-proposals |
| 4 | Documentation bug | LOW | /view-split-lease, /search |
| 5 | Documentation bug | LOW | AUTO |
| 6 | Duplicate function | MEDIUM | /guest-proposals, /view-split-lease |
| 7 | Fallback pattern | MEDIUM | /guest-proposals |
| 8 | Testability | MEDIUM | /guest-proposals |
| 9 | Compatibility | LOW | /view-split-lease, /search |
| 10 | Inconsistent validation | LOW | AUTO |
| 11 | Missing export | LOW | /search, /favorites |
| 12 | Testability | MEDIUM | /host-proposals, /guest-proposals |
| 13 | Wrong import path | LOW | All proposal pages |

## Recommended Execution Order

1. **CHUNK 4, 5** - Quick JSDoc fixes (no risk)
2. **CHUNK 11** - Add missing export (no risk)
3. **CHUNK 9, 10** - Compatibility and validation fixes (low risk)
4. **CHUNK 13** - Fix import path (low risk)
5. **CHUNK 6** - Consolidate canCancelProposal (medium risk, test thoroughly)
6. **CHUNK 3** - Move React hook (medium risk, update imports)
7. **CHUNK 7** - Remove fallback (medium risk, ensure cache init)
8. **CHUNK 1** - Consolidate processProposalData (high risk, many consumers)
9. **CHUNK 2** - Consolidate cancelProposalWorkflow (high risk)
10. **CHUNK 8, 12** - Dependency injection refactor (high risk, many changes)

## File References

### Files to Modify
- `app/src/logic/processors/index.js` (CHUNK 1)
- `app/src/logic/workflows/index.js` (CHUNK 2)
- `app/src/logic/rules/index.js` (CHUNK 3, 6)
- `app/src/logic/calculators/scheduling/getNextOccurrenceOfDay.js` (CHUNK 4)
- `app/src/logic/calculators/scheduling/isContiguousSelection.js` (CHUNK 5, 10)
- `app/src/logic/rules/proposals/proposalRules.js` (CHUNK 6, 7, 13)
- `app/src/logic/workflows/proposals/counterofferWorkflow.js` (CHUNK 8)
- `app/src/logic/rules/scheduling/isScheduleContiguous.js` (CHUNK 9)
- `app/src/logic/calculators/index.js` (CHUNK 11)
- `app/src/logic/workflows/proposals/virtualMeetingWorkflow.js` (CHUNK 12)

### Files to Delete (After Consolidation)
- `app/src/logic/processors/proposals/processProposalData.js` (CHUNK 1)
- `app/src/logic/workflows/booking/cancelProposalWorkflow.js` (CHUNK 2)
- `app/src/logic/rules/proposals/useProposalButtonStates.js` (CHUNK 3 - move, not delete)

### Files to Create/Move
- `app/src/islands/shared/hooks/useProposalButtonStates.js` (CHUNK 3 - new location)
