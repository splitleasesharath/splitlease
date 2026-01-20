# Code Refactoring Plan - app/src/logic

Date: 2026-01-18
Audit Type: general
Files Analyzed: 67
Layers Covered: calculators, constants, processors, rules, workflows

~~~~~

## Summary of Issues Found

| Category | Count | Severity |
|----------|-------|----------|
| Duplicate Logic | 2 | Medium |
| Architecture Violation | 1 | High |
| Unused/Dead Code Import | 1 | Low |
| Missing Input Validation | 3 | Medium |
| Inconsistent Naming | 2 | Low |
| Side Effect in Pure Layer | 3 | High |

~~~~~

## PAGE GROUP: /guest-proposals (Chunks: 1, 2, 3, 4)

### CHUNK 1: Duplicate cancelProposalWorkflow implementations
- **Files**: `app/src/logic/workflows/booking/cancelProposalWorkflow.js`, `app/src/logic/workflows/proposals/cancelProposalWorkflow.js`
- **Rationale**: Two files implement cancel proposal workflows with overlapping functionality. The `booking/` version is cleaner and more generic, while `proposals/` version has Bubble.io-specific variations but also directly imports supabase client (violating pure logic principles).
- **Approach**: Consolidate into a single file, extracting the decision-tree logic from `proposals/` into the cleaner `booking/` structure. The `proposals/` version should be deprecated and imports redirected.

**File:** `app/src/logic/workflows/proposals/cancelProposalWorkflow.js`
**Line:** 21-23
**Issue:** Imports supabase client directly - workflows should receive dependencies as parameters for testability
**Affected Pages:** /guest-proposals, /view-proposal

**Current Code:**
```javascript
import { supabase } from '../../../lib/supabase.js';
import { canCancelProposal, requiresSpecialCancellationConfirmation } from '../../rules/proposals/proposalRules.js';
import { PROPOSAL_STATUSES } from '../../constants/proposalStatuses.js';
```

**Refactored Code:**
```javascript
import { canCancelProposal, requiresSpecialCancellationConfirmation } from '../../rules/proposals/proposalRules.js';
import { PROPOSAL_STATUSES } from '../../constants/proposalStatuses.js';

// supabase should be passed as parameter to workflow functions
// See booking/cancelProposalWorkflow.js for correct pattern
```

**Testing:**
- [ ] Verify all cancel proposal flows work on /guest-proposals page
- [ ] Verify cancel from Compare Terms modal still functions
- [ ] Run unit tests for cancel workflow

~~~~~

### CHUNK 2: Duplicate canCancelProposal implementations
- **Files**: `app/src/logic/rules/proposals/canCancelProposal.js`, `app/src/logic/rules/proposals/proposalRules.js`
- **Rationale**: The `canCancelProposal` function exists in both files with slightly different implementations. The standalone file takes `{ proposalStatus, deleted }` while `proposalRules.js` takes the full proposal object. This creates confusion and potential inconsistencies.
- **Approach**: Keep the standalone file as the canonical pure implementation, update `proposalRules.js` to use it internally.

**File:** `app/src/logic/rules/proposals/proposalRules.js`
**Line:** 26-54
**Issue:** Duplicate implementation of canCancelProposal that differs from standalone version
**Affected Pages:** /guest-proposals, /view-proposal, /host-proposals

**Current Code:**
```javascript
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

  // Can't cancel if lease is already activated
  if (isCompletedStatus(status)) {
    return false;
  }

  // Can't cancel if expired
  if (status === PROPOSAL_STATUSES.EXPIRED.key) {
    return false;
  }

  // Otherwise, can cancel
  return true;
}
```

**Refactored Code:**
```javascript
import { canCancelProposal as canCancelProposalCore } from './canCancelProposal.js';

/**
 * Check if a proposal can be cancelled by the guest
 * Wrapper that extracts status from proposal object and delegates to core rule
 */
export function canCancelProposal(proposal) {
  if (!proposal) {
    return false;
  }

  const proposalStatus = proposal.status || proposal.Status;
  const deleted = proposal.deleted || proposal.Deleted || false;

  return canCancelProposalCore({ proposalStatus, deleted });
}
```

**Testing:**
- [ ] Verify cancel button visibility on proposal cards
- [ ] Test with various proposal statuses
- [ ] Verify terminal status proposals show correct state

~~~~~

### CHUNK 3: Side effect in virtualMeetingWorkflow (supabase import)
- **Files**: `app/src/logic/workflows/proposals/virtualMeetingWorkflow.js`
- **Rationale**: Workflow directly imports supabase client, coupling infrastructure to domain logic. This violates the four-layer architecture principle where workflows should receive dependencies.
- **Approach**: Refactor to receive supabase client as a parameter, matching the pattern in `booking/` workflows.

**File:** `app/src/logic/workflows/proposals/virtualMeetingWorkflow.js`
**Line:** 14
**Issue:** Direct supabase import violates dependency injection principle
**Affected Pages:** /guest-proposals, /host-proposals

**Current Code:**
```javascript
import { supabase } from '../../../lib/supabase.js';

/**
 * Create a new virtual meeting request
 */
export async function requestVirtualMeeting(proposalId, guestId) {
  // ... uses imported supabase directly
  const { data, error } = await supabase
    .from('virtualmeetingschedulesandlinks')
    .insert(vmData)
```

**Refactored Code:**
```javascript
// Remove global import, pass as parameter

/**
 * Create a new virtual meeting request
 * @param {object} params - Named parameters
 * @param {object} params.supabase - Supabase client instance
 * @param {string} params.proposalId - Proposal ID
 * @param {string} params.guestId - Guest user ID
 */
export async function requestVirtualMeeting({ supabase, proposalId, guestId }) {
  if (!supabase) {
    throw new Error('requestVirtualMeeting: supabase client is required');
  }
  // ... uses passed supabase client
  const { data, error } = await supabase
    .from('virtualmeetingschedulesandlinks')
    .insert(vmData)
```

**Testing:**
- [ ] Test virtual meeting request flow on /guest-proposals
- [ ] Test VM response flow on /host-proposals
- [ ] Verify VM status display updates correctly

~~~~~

### CHUNK 4: Side effect in counterofferWorkflow (supabase import)
- **Files**: `app/src/logic/workflows/proposals/counterofferWorkflow.js`
- **Rationale**: Same issue as virtualMeetingWorkflow - direct supabase import.
- **Approach**: Refactor all exported functions to receive supabase as parameter.

**File:** `app/src/logic/workflows/proposals/counterofferWorkflow.js`
**Line:** 18
**Issue:** Direct supabase import violates dependency injection principle
**Affected Pages:** /guest-proposals

**Current Code:**
```javascript
import { supabase } from '../../../lib/supabase.js';
import { hasReviewableCounteroffer } from '../../rules/proposals/proposalRules.js';
import { PROPOSAL_STATUSES } from '../../constants/proposalStatuses.js';

export async function acceptCounteroffer(proposalId) {
  // uses imported supabase
```

**Refactored Code:**
```javascript
import { hasReviewableCounteroffer } from '../../rules/proposals/proposalRules.js';
import { PROPOSAL_STATUSES } from '../../constants/proposalStatuses.js';

/**
 * @param {object} params - Named parameters
 * @param {object} params.supabase - Supabase client instance
 * @param {string} params.proposalId - Proposal ID
 */
export async function acceptCounteroffer({ supabase, proposalId }) {
  if (!supabase) {
    throw new Error('acceptCounteroffer: supabase client is required');
  }
  // uses passed supabase
```

**Testing:**
- [ ] Test counteroffer acceptance flow
- [ ] Test counteroffer decline flow
- [ ] Verify terms comparison displays correctly

~~~~~

## PAGE GROUP: /search (Chunks: 5, 6)

### CHUNK 5: Inconsistent naming in scheduling calculators
- **Files**: `app/src/logic/calculators/scheduling/isContiguousSelection.js`
- **Rationale**: This file is named with `is` prefix (suggesting a rule/predicate) but lives in `calculators/`. It duplicates logic already in `rules/scheduling/isScheduleContiguous.js`. The calculators layer should contain pure mathematical functions (calculate*, get*), not boolean predicates.
- **Approach**: Deprecate this file, redirect imports to the rules layer implementation.

**File:** `app/src/logic/calculators/scheduling/isContiguousSelection.js`
**Line:** 1-50 (entire file)
**Issue:** Misplaced predicate function in calculators layer, duplicates isScheduleContiguous
**Affected Pages:** /search, /view-split-lease

**Current Code:**
```javascript
/**
 * Check if selected days are contiguous (form consecutive sequence).
 * Exists in calculators but should be in rules layer.
 */
export function isContiguousSelection(selectedDays) {
  // ... implementation
}
```

**Refactored Code:**
```javascript
/**
 * @deprecated Use isScheduleContiguous from rules/scheduling instead
 * This file will be removed in a future release.
 */
export { isScheduleContiguous as isContiguousSelection } from '../../rules/scheduling/isScheduleContiguous.js';
```

**Testing:**
- [ ] Verify schedule selector validation on /search
- [ ] Verify schedule selection on /view-split-lease
- [ ] Run build to check for import errors

~~~~~

### CHUNK 6: Missing validation in calculateFormCompletion
- **Files**: `app/src/logic/calculators/reviews/calculateFormCompletion.js`
- **Rationale**: Returns 0 silently for invalid input instead of throwing, inconsistent with other calculators that throw on invalid input. This could mask bugs.
- **Approach**: Add explicit validation with throw for consistency, or document the lenient behavior if intentional.

**File:** `app/src/logic/calculators/reviews/calculateFormCompletion.js`
**Line:** 12-19
**Issue:** Silently returns 0 for invalid input instead of throwing like other calculators
**Affected Pages:** /guest-proposals (review flow), /host-proposals (review flow)

**Current Code:**
```javascript
export function calculateFormCompletion({ ratings, totalCategories = 12 }) {
  if (!Array.isArray(ratings)) {
    return 0;
  }

  const completed = ratings.filter(r => r.value > 0).length;
  return Math.round((completed / totalCategories) * 100);
}
```

**Refactored Code:**
```javascript
/**
 * Calculate form completion percentage for review submission.
 *
 * @throws {Error} If ratings is not an array (consistency with other calculators)
 */
export function calculateFormCompletion({ ratings, totalCategories = 12 }) {
  // No Fallback: Validate input for consistency with other calculators
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

  const completed = ratings.filter(r => r.value > 0).length;
  return Math.round((completed / totalCategories) * 100);
}
```

**Testing:**
- [ ] Test review form progress indicator
- [ ] Verify error handling in HostReviewGuest component

~~~~~

## PAGE GROUP: /favorite-listings (Chunks: 7)

### CHUNK 7: Unused parameter in calculateNextSendTime
- **Files**: `app/src/logic/calculators/reminders/calculateNextSendTime.js`
- **Rationale**: The `timezone` parameter is declared but never used. Either implement timezone conversion or remove the parameter to avoid confusion.
- **Approach**: Remove unused parameter (timezone conversion should happen at display layer, not calculation layer).

**File:** `app/src/logic/calculators/reminders/calculateNextSendTime.js`
**Line:** 19
**Issue:** Unused timezone parameter creates confusion about function's actual behavior
**Affected Pages:** /house-manual (reminder system)

**Current Code:**
```javascript
export function calculateNextSendTime({ scheduledDateTime, timezone = 'America/New_York' }) {
  if (!scheduledDateTime) {
    throw new Error('calculateNextSendTime: scheduledDateTime is required');
  }

  const date = scheduledDateTime instanceof Date
    ? scheduledDateTime
    : new Date(scheduledDateTime);

  if (isNaN(date.getTime())) {
    throw new Error('calculateNextSendTime: invalid scheduledDateTime format');
  }

  return date;
}
```

**Refactored Code:**
```javascript
/**
 * Calculate the next send time for a reminder.
 *
 * @intent Convert scheduled datetime to Date object for comparison.
 * @rule All times are stored and compared in UTC.
 * @rule Timezone conversion happens at display layer, not here.
 *
 * @param {object} params - Named parameters.
 * @param {string|Date} params.scheduledDateTime - The scheduled date/time (ISO string or Date).
 * @returns {Date} The scheduled time as a Date object.
 */
export function calculateNextSendTime({ scheduledDateTime }) {
  if (!scheduledDateTime) {
    throw new Error('calculateNextSendTime: scheduledDateTime is required');
  }

  const date = scheduledDateTime instanceof Date
    ? scheduledDateTime
    : new Date(scheduledDateTime);

  if (isNaN(date.getTime())) {
    throw new Error('calculateNextSendTime: invalid scheduledDateTime format');
  }

  return date;
}
```

**Testing:**
- [ ] Verify reminder scheduling still works
- [ ] Check reminder display times are correct

~~~~~

## PAGE GROUP: /self-listing (Chunks: 8)

### CHUNK 8: Duplicate processProposalData files
- **Files**: `app/src/logic/processors/proposal/processProposalData.js`, `app/src/logic/processors/proposals/processProposalData.js`
- **Rationale**: Two directories (`proposal/` singular and `proposals/` plural) contain the same file. This is confusing and could lead to inconsistent behavior if one is updated but not the other.
- **Approach**: Consolidate to `proposals/` (plural, matching other directories like `rules/proposals/`), update all imports.

**File:** `app/src/logic/processors/proposal/processProposalData.js`
**Line:** 1 (entire file location)
**Issue:** Duplicate directory structure - `proposal/` vs `proposals/`
**Affected Pages:** AUTO (affects import resolution)

**Current Code:**
```
app/src/logic/processors/
├── proposal/           # Singular - inconsistent
│   └── processProposalData.js
├── proposals/          # Plural - matches rules/proposals/, workflows/proposals/
│   └── processProposalData.js
```

**Refactored Code:**
```
app/src/logic/processors/
├── proposals/          # Consolidated - consistent naming
│   └── processProposalData.js
```

**Testing:**
- [ ] Search for imports from `processors/proposal/`
- [ ] Update all imports to use `processors/proposals/`
- [ ] Delete duplicate directory
- [ ] Run build to verify no broken imports

~~~~~

## PAGE GROUP: /account-profile (Chunks: 9)

### CHUNK 9: Missing null check in processUserDisplayName edge case
- **Files**: `app/src/logic/processors/user/processUserDisplayName.js`
- **Rationale**: Need to verify this file handles edge cases properly. Referenced from profile pages.
- **Approach**: Review and add defensive checks if missing.

**File:** `app/src/logic/processors/user/processUserDisplayName.js`
**Line:** Needs review
**Issue:** Potential edge case handling for empty/whitespace-only names
**Affected Pages:** /account-profile, user displays across app

**Testing:**
- [ ] Test with empty string names
- [ ] Test with whitespace-only names
- [ ] Verify fallback behavior

~~~~~

## Chunk Summary

| Chunk | Files | Page Group | Priority |
|-------|-------|------------|----------|
| 1 | `workflows/booking/cancelProposalWorkflow.js`, `workflows/proposals/cancelProposalWorkflow.js` | /guest-proposals | High |
| 2 | `rules/proposals/canCancelProposal.js`, `rules/proposals/proposalRules.js` | /guest-proposals | Medium |
| 3 | `workflows/proposals/virtualMeetingWorkflow.js` | /guest-proposals | High |
| 4 | `workflows/proposals/counterofferWorkflow.js` | /guest-proposals | High |
| 5 | `calculators/scheduling/isContiguousSelection.js` | /search | Medium |
| 6 | `calculators/reviews/calculateFormCompletion.js` | /guest-proposals | Low |
| 7 | `calculators/reminders/calculateNextSendTime.js` | /house-manual | Low |
| 8 | `processors/proposal/processProposalData.js`, `processors/proposals/processProposalData.js` | AUTO | Medium |
| 9 | `processors/user/processUserDisplayName.js` | /account-profile | Low |

~~~~~

## File References

### Files to Modify
- `app/src/logic/workflows/proposals/cancelProposalWorkflow.js`
- `app/src/logic/workflows/proposals/virtualMeetingWorkflow.js`
- `app/src/logic/workflows/proposals/counterofferWorkflow.js`
- `app/src/logic/rules/proposals/proposalRules.js`
- `app/src/logic/calculators/scheduling/isContiguousSelection.js`
- `app/src/logic/calculators/reviews/calculateFormCompletion.js`
- `app/src/logic/calculators/reminders/calculateNextSendTime.js`

### Files to Delete
- `app/src/logic/processors/proposal/` (entire directory - consolidate to `proposals/`)

### Files to Update Imports
- `app/src/islands/modals/GuestEditingProposalModal.jsx`
- `app/src/islands/pages/proposals/ProposalCard.jsx`
- `app/src/islands/pages/proposals/ExpandableProposalCard.jsx`

### Related Documentation
- `.claude/Documentation/largeCLAUDE.md` - Four-layer architecture reference
- `app/CLAUDE.md` - Frontend patterns

~~~~~

## Execution Order

1. **Phase 1: High Priority - Architecture Violations** (Chunks 1, 3, 4)
   - Fix supabase import violations in workflows
   - Consolidate duplicate cancelProposalWorkflow

2. **Phase 2: Medium Priority - Duplication** (Chunks 2, 5, 8)
   - Consolidate canCancelProposal implementations
   - Fix misplaced isContiguousSelection
   - Consolidate proposal/proposals directories

3. **Phase 3: Low Priority - Code Quality** (Chunks 6, 7, 9)
   - Add missing validation
   - Remove unused parameters
   - Add defensive edge case handling
