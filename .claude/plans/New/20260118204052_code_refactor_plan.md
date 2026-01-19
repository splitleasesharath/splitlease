# Code Refactoring Plan - app/src/logic

**Date:** 2026-01-18
**Audit Type:** general
**Files Analyzed:** 68
**Issues Found:** 11

## Executive Summary

This audit identified several issues across the `app/src/logic` directory:
1. **Critical**: Duplicate import statement in `proposalRules.js` causing potential runtime errors
2. **High**: Duplicate `cancelProposalWorkflow.js` files with overlapping functionality
3. **High**: Duplicate `processProposalData.js` files in different directories
4. **Medium**: Duplicate contiguous selection logic across multiple files
5. **Low**: Inconsistent parameter validation patterns

---

~~~~~

## PAGE GROUP: /guest-proposals, /proposals (Chunks: 1, 2, 3, 4)

### CHUNK 1: Fix duplicate import in proposalRules.js
**File:** `rules/proposals/proposalRules.js`
**Line:** 351-358
**Issue:** Duplicate import statement - PROPOSAL_STATUSES is imported twice (lines 16 and 352-358), which causes a SyntaxError in strict mode ES modules
**Affected Pages:** /guest-proposals, /proposals, /view-split-lease

**Current Code:**
```javascript
// Line 16:
import { PROPOSAL_STATUSES, isTerminalStatus, isCompletedStatus, getActionsForStatus } from '../../constants/proposalStatuses.js';

// ... 335 lines of code ...

// Lines 351-358 (DUPLICATE IMPORT - ERROR):
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
// Line 16 - consolidate all imports here:
import {
  PROPOSAL_STATUSES,
  isTerminalStatus,
  isCompletedStatus,
  getActionsForStatus,
  isSuggestedProposal
} from '../../constants/proposalStatuses.js';

// ... code remains the same ...

// Lines 351-363: REMOVE the duplicate import block entirely
// Keep only the re-export:
export { isSuggestedProposal as isSLSuggestedProposal };
```

**Testing:**
- [ ] Run `bun run build` to verify no syntax errors
- [ ] Test proposal status determination on /guest-proposals page
- [ ] Verify suggested proposal detection works correctly

~~~~~

### CHUNK 2: Consolidate duplicate cancelProposalWorkflow files
**Files:** `workflows/booking/cancelProposalWorkflow.js`, `workflows/proposals/cancelProposalWorkflow.js`
**Line:** N/A (entire files)
**Issue:** Two separate files implementing cancel proposal workflow with overlapping but slightly different logic. The `booking/` version is simpler and takes rule functions as parameters. The `proposals/` version imports rules directly and has more complex decision logic. This creates confusion about which to use.
**Affected Pages:** /guest-proposals, /proposals

**Current Code:**
```javascript
// workflows/booking/cancelProposalWorkflow.js (67 lines)
// - Takes canCancelProposal as a parameter
// - Simpler decision tree
// - Used in: (appears to be unused based on grep)

// workflows/proposals/cancelProposalWorkflow.js (176 lines)
// - Imports rules directly from proposalRules.js
// - Has 7 workflow variations mapped to Bubble.io
// - Used in: GuestEditingProposalModal.jsx, ExpandableProposalCard.jsx, ProposalCard.jsx
```

**Refactored Code:**
```javascript
// DECISION: Keep workflows/proposals/cancelProposalWorkflow.js as the canonical version
// REASON: It has full Bubble.io workflow mapping and is actively used

// ACTION 1: Delete workflows/booking/cancelProposalWorkflow.js (unused)

// ACTION 2: Update imports if any code references the booking version
// (None found in grep search - safe to delete)
```

**Testing:**
- [ ] Verify no imports reference `workflows/booking/cancelProposalWorkflow.js`
- [ ] Test cancel proposal flow on /guest-proposals page
- [ ] Test delete proposal flow for terminal-state proposals

~~~~~

### CHUNK 3: Consolidate duplicate processProposalData files
**Files:** `processors/proposal/processProposalData.js`, `processors/proposals/processProposalData.js`
**Line:** N/A (entire files)
**Issue:** Two `processProposalData.js` files exist in different directories (`proposal/` singular vs `proposals/` plural). This naming inconsistency can cause import confusion and maintenance issues.
**Affected Pages:** /guest-proposals, /proposals, /view-split-lease

**Current Code:**
```javascript
// processors/proposal/processProposalData.js
// - Contains the actual implementation
// - Referenced in loadProposalDetailsWorkflow.js JSDoc example

// processors/proposals/processProposalData.js
// - Duplicate/alternate version
// - Listed in git status as modified
```

**Refactored Code:**
```javascript
// DECISION: Keep processors/proposals/processProposalData.js (plural, matches directory convention)
// REASON: Other processor directories use plural form (e.g., reminders/, reviews/)

// ACTION 1: Compare both files for differences
// ACTION 2: Merge any unique functionality into proposals/processProposalData.js
// ACTION 3: Delete processors/proposal/ directory entirely
// ACTION 4: Update any imports pointing to proposal/ to use proposals/

// Update in loadProposalDetailsWorkflow.js JSDoc:
// FROM: import { processProposalData } from '../logic/processors/proposal/processProposalData.js'
// TO:   import { processProposalData } from '../logic/processors/proposals/processProposalData.js'
```

**Testing:**
- [ ] Compare both files for differences before merge
- [ ] Update all imports after consolidation
- [ ] Test proposal loading on /view-split-lease page
- [ ] Test proposal list display on /guest-proposals page

~~~~~

### CHUNK 4: Consolidate duplicate contiguous selection logic
**Files:** `calculators/scheduling/isContiguousSelection.js`, `rules/scheduling/isScheduleContiguous.js`
**Line:** N/A (entire files)
**Issue:** Two functions implementing the same contiguous day selection logic:
- `isContiguousSelection()` in calculators (31 lines, simpler)
- `isScheduleContiguous()` in rules (108 lines, more documented)

The rules version has better documentation, validation, and follows the named parameter pattern. The calculator version is legacy.
**Affected Pages:** /search, /view-split-lease, /create-proposal

**Current Code:**
```javascript
// calculators/scheduling/isContiguousSelection.js (31 lines)
export function isContiguousSelection(selectedDays) {
  if (!selectedDays || selectedDays.length === 0) return false;
  // ... simpler implementation, positional parameters
}

// rules/scheduling/isScheduleContiguous.js (108 lines)
export function isScheduleContiguous({ selectedDayIndices }) {
  // ... named parameters, full validation, better documentation
}
```

**Refactored Code:**
```javascript
// DECISION: Keep rules/scheduling/isScheduleContiguous.js as canonical
// REASON: Better documentation, validation, follows project conventions

// ACTION 1: Create backward-compatible wrapper in calculators/
// calculators/scheduling/isContiguousSelection.js:
import { isScheduleContiguous } from '../../rules/scheduling/isScheduleContiguous.js';

/**
 * @deprecated Use isScheduleContiguous from rules/scheduling instead
 * Kept for backward compatibility with existing imports
 */
export function isContiguousSelection(selectedDays) {
  if (!selectedDays) return false;
  return isScheduleContiguous({ selectedDayIndices: selectedDays });
}

// ACTION 2: Update lib/availabilityValidation.js to use isScheduleContiguous
```

**Testing:**
- [ ] Update availabilityValidation.js to use new import
- [ ] Test schedule selection on /view-split-lease page
- [ ] Test proposal creation schedule validation

~~~~~

## PAGE GROUP: /search (Chunks: 5)

### CHUNK 5: Extract hardcoded DAY_NAMES constant
**Files:** `workflows/scheduling/validateMoveInDateWorkflow.js`, `workflows/scheduling/validateScheduleWorkflow.js`
**Line:** 105, 99
**Issue:** `DAY_NAMES` array is defined inline in multiple files instead of being imported from a shared constant. This violates DRY and creates maintenance burden if day names need to change.
**Affected Pages:** /search, /view-split-lease, /create-proposal

**Current Code:**
```javascript
// validateMoveInDateWorkflow.js:105
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

// validateScheduleWorkflow.js:99
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
```

**Refactored Code:**
```javascript
// NEW FILE: constants/schedulingConstants.js
/**
 * Day name constants for scheduling logic.
 * Index 0 = Sunday (matches JavaScript Date.getDay())
 */
export const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday'
];

// Abbreviated day names for compact UI display
export const DAY_ABBREVIATIONS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// In validateMoveInDateWorkflow.js and validateScheduleWorkflow.js:
import { DAY_NAMES } from '../../constants/schedulingConstants.js';
// Remove local const declaration
```

**Testing:**
- [ ] Create constants/schedulingConstants.js
- [ ] Update both workflow files to import DAY_NAMES
- [ ] Verify date display on /search page calendar
- [ ] Verify move-in date validation messages

~~~~~

## PAGE GROUP: /house-manual, /reminders (Chunks: 6)

### CHUNK 6: Fix malformed JSDoc in isContiguousSelection.js
**File:** `calculators/scheduling/isContiguousSelection.js`
**Line:** 5
**Issue:** JSDoc @param annotation contains corrupted file path reference instead of proper type annotation: `@.claude\plans\Deprecated\Context\Option Sets\ZEP - Curation Parameters(OS).md {number[]}`
**Affected Pages:** AUTO (affects JSDoc tooling and documentation generation)

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
 *
 * @deprecated Use isScheduleContiguous from rules/scheduling instead
 */
```

**Testing:**
- [ ] Fix the JSDoc annotation
- [ ] Run linter to verify JSDoc is valid
- [ ] Verify IDE intellisense shows correct parameter info

~~~~~

## PAGE GROUP: /view-split-lease (Chunks: 7)

### CHUNK 7: Simplify reviewAdapter.js duplicate REVIEW_CATEGORIES lookup
**File:** `processors/reviews/reviewAdapter.js`
**Line:** 81-84
**Issue:** In `adaptReviewFromApi`, REVIEW_CATEGORIES.find() is called twice for each rating - once for title and once for question. This is inefficient and should use a single lookup.
**Affected Pages:** /view-split-lease, /reviews

**Current Code:**
```javascript
ratings: (apiReview.ratings || []).map(r => ({
  categoryId: r.category_id,
  title: REVIEW_CATEGORIES.find(c => c.id === r.category_id)?.title || r.category_id,
  question: REVIEW_CATEGORIES.find(c => c.id === r.category_id)?.question || '',
  value: r.value
})),
```

**Refactored Code:**
```javascript
ratings: (apiReview.ratings || []).map(r => {
  const category = REVIEW_CATEGORIES.find(c => c.id === r.category_id);
  return {
    categoryId: r.category_id,
    title: category?.title || r.category_id,
    question: category?.question || '',
    value: r.value
  };
}),
```

**Testing:**
- [ ] Test review display on listing detail page
- [ ] Verify all 12 review categories render correctly

~~~~~

## PAGE GROUP: /guest-proposals (Chunks: 8)

### CHUNK 8: Remove redundant trim() in canAcceptProposal.js
**File:** `rules/proposals/canAcceptProposal.js`
**Line:** 42
**Issue:** The status is already trimmed on line 38, but PROPOSAL_STATUSES.COUNTEROFFER_SUBMITTED_AWAITING_GUEST_REVIEW.key is also trimmed. The `.key` property is a constant and doesn't need trimming - this is defensive but unnecessary.
**Affected Pages:** /guest-proposals, /proposals

**Current Code:**
```javascript
const status = proposalStatus.trim()

// Can only accept when host has countered
// This is the only status where guest needs to make an "accept" decision
return status === PROPOSAL_STATUSES.COUNTEROFFER_SUBMITTED_AWAITING_GUEST_REVIEW.key.trim()
```

**Refactored Code:**
```javascript
const status = proposalStatus.trim()

// Can only accept when host has countered
// This is the only status where guest needs to make an "accept" decision
return status === PROPOSAL_STATUSES.COUNTEROFFER_SUBMITTED_AWAITING_GUEST_REVIEW.key
```

**Testing:**
- [ ] Test accepting counteroffer on /guest-proposals page
- [ ] Verify button state changes correctly after acceptance

~~~~~

## PAGE GROUP: AUTO - Cross-cutting concerns (Chunks: 9, 10, 11)

### CHUNK 9: Standardize directory naming convention
**Files:** `processors/proposal/` vs `processors/proposals/`
**Line:** N/A (directory structure)
**Issue:** Inconsistent directory naming - some use singular (`proposal/`), others use plural (`proposals/`, `reminders/`, `reviews/`). The codebase should follow one convention.
**Affected Pages:** AUTO

**Current Code:**
```
processors/
├── display/        (singular concept)
├── listing/        (singular)
├── proposal/       (singular) ← INCONSISTENT
├── proposals/      (plural)   ← INCONSISTENT
├── reminders/      (plural)
├── reviews/        (plural)
└── user/           (singular)
```

**Refactored Code:**
```
processors/
├── display/        (keep - single purpose)
├── listing/        (keep - single purpose)
├── proposals/      (keep plural - consolidate from proposal/)
├── reminders/      (keep plural)
├── reviews/        (keep plural)
└── user/           (keep - single purpose)
```

**Testing:**
- [ ] Consolidate proposal/ into proposals/
- [ ] Update all imports
- [ ] Run build to verify no broken imports

~~~~~

### CHUNK 10: Add missing type validation in virtualMeetingRules.js
**File:** `rules/proposals/virtualMeetingRules.js`
**Line:** 100-104
**Issue:** `getVirtualMeetingState` doesn't validate that `currentUserId` is a string, but it uses it in comparisons. Other rule functions in the codebase validate all inputs.
**Affected Pages:** /guest-proposals, /proposals

**Current Code:**
```javascript
export function getVirtualMeetingState(virtualMeeting, currentUserId) {
  // State 1: No VM exists
  if (!virtualMeeting) {
    return VM_STATES.NO_MEETING;
  }
  // ... uses currentUserId without validation
```

**Refactored Code:**
```javascript
export function getVirtualMeetingState(virtualMeeting, currentUserId) {
  // Validate currentUserId if virtualMeeting exists (it's used in comparisons)
  if (virtualMeeting && (!currentUserId || typeof currentUserId !== 'string')) {
    console.warn('getVirtualMeetingState: currentUserId should be a string when virtualMeeting exists');
  }

  // State 1: No VM exists
  if (!virtualMeeting) {
    return VM_STATES.NO_MEETING;
  }
  // ... rest remains the same
```

**Testing:**
- [ ] Test virtual meeting button states on /guest-proposals page
- [ ] Test with null/undefined currentUserId

~~~~~

### CHUNK 11: Remove console.log statements from production code
**Files:** Multiple workflow files
**Line:** Various
**Issue:** Several workflow files contain console.log statements that should be removed or converted to conditional debug logging for production builds.
**Affected Pages:** AUTO

**Current Code:**
```javascript
// virtualMeetingWorkflow.js:29
console.log('[virtualMeetingWorkflow] Requesting virtual meeting for proposal:', proposalId);

// cancelProposalWorkflow.js:112
console.log('[cancelProposalWorkflow] Cancelling proposal:', proposalId);

// counterofferWorkflow.js:34
console.log('[counterofferWorkflow] Accepting counteroffer for proposal:', proposalId);
```

**Refactored Code:**
```javascript
// Option A: Remove all console.log statements in workflows
// Option B: Use conditional logging based on environment

// If keeping logs, wrap in environment check:
const DEBUG = import.meta.env.DEV;

if (DEBUG) {
  console.log('[virtualMeetingWorkflow] Requesting virtual meeting for proposal:', proposalId);
}

// Recommendation: For now, keep logs but ensure they're prefixed with [module] for filtering
// These are useful for debugging production issues
```

**Testing:**
- [ ] Decide on logging strategy (keep/remove/conditional)
- [ ] If removing, search for all console.log in logic/ directory
- [ ] If keeping, ensure consistent prefix format

~~~~~

## Summary of Changes

| Chunk | Priority | Files Modified | Type |
|-------|----------|----------------|------|
| 1 | CRITICAL | 1 | Bug fix |
| 2 | HIGH | 1 deleted | Deduplication |
| 3 | HIGH | 2+ | Deduplication |
| 4 | MEDIUM | 2 | Deduplication |
| 5 | MEDIUM | 3 (1 new) | DRY |
| 6 | LOW | 1 | Documentation |
| 7 | LOW | 1 | Performance |
| 8 | LOW | 1 | Cleanup |
| 9 | MEDIUM | Directory | Structure |
| 10 | LOW | 1 | Robustness |
| 11 | LOW | Multiple | Logging |

## Execution Order

1. **Chunk 1** (CRITICAL) - Fix duplicate import to prevent runtime errors
2. **Chunk 3** - Consolidate processProposalData files
3. **Chunk 2** - Remove duplicate cancelProposalWorkflow
4. **Chunk 9** - Fix directory naming (part of chunk 3)
5. **Chunk 4** - Consolidate contiguous selection logic
6. **Chunk 5** - Extract DAY_NAMES constant
7. **Chunks 6-8, 10-11** - Minor cleanups (can be done in any order)

## File References

### Critical Files (HIGH impact - 15+ dependents)
- `constants/proposalStatuses.js` (21 dependents) - DO NOT MODIFY unless necessary

### Files to Modify
- `rules/proposals/proposalRules.js`
- `rules/proposals/canAcceptProposal.js`
- `rules/proposals/virtualMeetingRules.js`
- `calculators/scheduling/isContiguousSelection.js`
- `processors/reviews/reviewAdapter.js`
- `workflows/scheduling/validateMoveInDateWorkflow.js`
- `workflows/scheduling/validateScheduleWorkflow.js`

### Files to Delete
- `workflows/booking/cancelProposalWorkflow.js`
- `processors/proposal/` directory (after merging)

### Files to Create
- `constants/schedulingConstants.js`
