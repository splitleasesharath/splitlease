# Code Refactoring Plan: app/src/logic

**Audit Date**: 2026-01-18
**Target Directory**: `app/src/logic/`
**Analysis Method**: Full recursive scan with import tracing

---

## Executive Summary

This audit identified **5 priority issues** across the logic layer requiring consolidation and cleanup:

| Issue # | Category | Severity | Files Affected | Pages Impacted |
|---------|----------|----------|----------------|----------------|
| 1 | **Duplication** | HIGH | 3 files | /view-split-lease, /preview-split-lease, /search |
| 2 | **Duplication** | MEDIUM | 2 files | /guest-proposals, /host-proposals |
| 3 | **Duplication** | MEDIUM | 2 files | /guest-proposals |
| 4 | **Dead Code** | LOW | 1 file | None (unused) |
| 5 | **Unused Parameter** | LOW | 1 file | Internal only |

---

## PAGE GROUP: View & Preview Listing Pages

**Affected Pages**: `/view-split-lease`, `/preview-split-lease`

~~~~~

### CHUNK 1: Consolidate Contiguous Day Validation (HIGH PRIORITY)

**Issue**: Three separate implementations of the same contiguous day validation logic exist:
1. `app/src/logic/calculators/scheduling/isContiguousSelection.js` (31 lines)
2. `app/src/logic/rules/scheduling/isScheduleContiguous.js` (108 lines)
3. `app/src/lib/availabilityValidation.js` lines 26-77 (inline)

**Impact**:
- Code duplication violates DRY principle
- Different validation behavior between views (rules version has stricter validation)
- Maintenance burden when business rules change

**Affected Files**:
- `app/src/islands/pages/ViewSplitLeasePage.jsx:29` - imports from availabilityValidation
- `app/src/islands/pages/ViewSplitLeasePage/ViewSplitLeasePage.jsx:34` - imports from availabilityValidation
- `app/src/islands/pages/PreviewSplitLeasePage.jsx:26` - imports from availabilityValidation
- `app/src/islands/shared/useScheduleSelectorLogicCore.js:15` - imports from rules/scheduling
- `app/src/logic/workflows/scheduling/validateScheduleWorkflow.js:1` - imports from rules/scheduling

**Current Code** (`app/src/logic/calculators/scheduling/isContiguousSelection.js`):
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

**Refactored Code** (Keep `app/src/logic/rules/scheduling/isScheduleContiguous.js` as canonical):
```javascript
/**
 * Check if selected days form a contiguous (consecutive) block.
 *
 * @intent Enforce the business rule that split lease stays must be consecutive nights.
 * @rule Days must be consecutive (Mon-Fri ✓, Mon+Wed ✗).
 * @rule Handles week wrap-around cases (Fri-Sun ✓, Sat-Tue ✓).
 * @rule For wrap-around, uses inverse logic: if unselected days are contiguous, selected days wrap around properly.
 * @rule 6 or more days is always contiguous (only 1 gap maximum).
 *
 * @param {object} params - Named parameters.
 * @param {number[]} params.selectedDayIndices - Array of day indices (0=Sunday, 1=Monday, ..., 6=Saturday).
 * @returns {boolean} True if days are contiguous, false otherwise.
 *
 * @throws {Error} If selectedDayIndices is not an array.
 * @throws {Error} If any day index is invalid (not 0-6).
 *
 * @example
 * isScheduleContiguous({ selectedDayIndices: [1, 2, 3, 4, 5] }) // => true (Mon-Fri)
 * isScheduleContiguous({ selectedDayIndices: [1, 3, 5] }) // => false (Mon, Wed, Fri - not contiguous)
 * isScheduleContiguous({ selectedDayIndices: [5, 6, 0] }) // => true (Fri-Sun, wraps around week)
 */
export function isScheduleContiguous({ selectedDayIndices }) {
  // No Fallback: Validate input
  if (!Array.isArray(selectedDayIndices)) {
    throw new Error(
      `isScheduleContiguous: selectedDayIndices must be an array, got ${typeof selectedDayIndices}`
    )
  }

  // Empty selection is not contiguous
  if (selectedDayIndices.length === 0) {
    return false
  }

  // Single day is contiguous
  if (selectedDayIndices.length === 1) {
    return true
  }

  // Validate all day indices
  for (const day of selectedDayIndices) {
    if (typeof day !== 'number' || isNaN(day) || day < 0 || day > 6) {
      throw new Error(
        `isScheduleContiguous: Invalid day index ${day}, must be 0-6`
      )
    }
  }

  // Sort the selected days
  const sorted = [...selectedDayIndices].sort((a, b) => a - b)

  // If 6 or more days selected, it's contiguous (only 1 gap or no gaps)
  if (sorted.length >= 6) {
    return true
  }

  // Check for standard contiguous sequence (no wrap around)
  let isStandardContiguous = true
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] !== sorted[i - 1] + 1) {
      isStandardContiguous = false
      break
    }
  }

  if (isStandardContiguous) {
    return true
  }

  // Check if selection includes both Sunday (0) and Saturday (6) - wrap-around case
  const hasZero = sorted.includes(0)
  const hasSix = sorted.includes(6)

  if (hasZero && hasSix) {
    // Week wrap-around case: use inverse logic (check not-selected days)
    const allDays = [0, 1, 2, 3, 4, 5, 6]
    const notSelectedDays = allDays.filter(d => !sorted.includes(d))

    if (notSelectedDays.length === 0) {
      return true // All days selected
    }

    // Check if not-selected days form a contiguous block
    const minNotSelected = Math.min(...notSelectedDays)
    const maxNotSelected = Math.max(...notSelectedDays)

    const expectedNotSelected = []
    for (let i = minNotSelected; i <= maxNotSelected; i++) {
      expectedNotSelected.push(i)
    }

    return notSelectedDays.length === expectedNotSelected.length &&
      notSelectedDays.every((day, index) => day === expectedNotSelected[index])
  }

  return false
}

/**
 * Adapter function for legacy callers expecting simple array input.
 * DEPRECATION NOTICE: Migrate to isScheduleContiguous({ selectedDayIndices }) directly.
 *
 * @param {number[]} selectedDays - Array of day indices (0-6).
 * @returns {boolean} True if days are contiguous.
 */
export function isContiguousSelection(selectedDays) {
  if (!selectedDays || selectedDays.length === 0) return false;
  return isScheduleContiguous({ selectedDayIndices: selectedDays });
}
```

**Migration Steps**:
1. Add `isContiguousSelection` adapter to `isScheduleContiguous.js`
2. Update `availabilityValidation.js` to re-export from canonical source
3. Delete `app/src/logic/calculators/scheduling/isContiguousSelection.js`
4. Update imports in ViewSplitLeasePage, PreviewSplitLeasePage to use rules version

~~~~~

---

## PAGE GROUP: Guest Proposals Management

**Affected Pages**: `/guest-proposals`

~~~~~

### CHUNK 2: Consolidate processProposalData Processors (MEDIUM PRIORITY)

**Issue**: Two distinct `processProposalData.js` files exist with different implementations:
1. `app/src/logic/processors/proposal/processProposalData.js` (148 lines) - Stricter validation, returns `currentTerms`/`originalTerms` structure
2. `app/src/logic/processors/proposals/processProposalData.js` (330 lines) - Looser validation, returns flat structure with nested transforms

**Impact**:
- Different data shapes cause confusion for consumers
- Inconsistent validation behavior (one throws errors, one returns nulls)
- Singular vs plural directory naming is confusing

**Affected Files**:
- `app/src/logic/workflows/booking/loadProposalDetailsWorkflow.js:27` - references proposal (singular)
- Neither file is currently imported directly by page components (used via workflows)

**Current Code** (`app/src/logic/processors/proposal/processProposalData.js` - stricter version):
```javascript
import { PROPOSAL_STATUSES, getUsualOrder } from '../../constants/proposalStatuses.js'

export function processProposalData({ rawProposal, listing = null, guest = null, host = null }) {
  // No Fallback: Proposal data must exist
  if (!rawProposal) {
    throw new Error('processProposalData: rawProposal cannot be null or undefined')
  }

  // Validate critical ID field
  if (!rawProposal._id) {
    throw new Error('processProposalData: Proposal missing critical _id field')
  }

  // Validate required foreign key references
  if (!rawProposal.Listing) {
    throw new Error(
      `processProposalData: Proposal ${rawProposal._id} missing required Listing reference`
    )
  }

  if (!rawProposal.Guest) {
    throw new Error(
      `processProposalData: Proposal ${rawProposal._id} missing required Guest reference`
    )
  }

  // Determine which terms are current (original or host-changed)
  const status = typeof rawProposal.Status === 'string'
    ? rawProposal.Status.trim()
    : (typeof rawProposal.status === 'string' ? rawProposal.status.trim() : 'Draft')

  const hasHostCounteroffer = status === PROPOSAL_STATUSES.COUNTEROFFER_SUBMITTED_AWAITING_GUEST_REVIEW.key.trim()

  // Merge terms: Use host-changed (hc) fields if they exist, otherwise use original
  const currentTerms = {
    moveInDate: hasHostCounteroffer && rawProposal['hc Move-In Date']
      ? rawProposal['hc Move-In Date']
      : rawProposal['Move-In Date'],
    daysOfWeek: hasHostCounteroffer && rawProposal['hc Days of Week']
      ? rawProposal['hc Days of Week']
      : rawProposal['Days of Week'],
    // ... more fields
  }

  return {
    id: rawProposal._id,
    listingId: rawProposal.Listing,
    guestId: rawProposal.Guest,
    status,
    deleted: rawProposal.Deleted === true,
    usualOrder: getUsualOrder(status),
    currentTerms,
    originalTerms,
    hasCounteroffer: hasHostCounteroffer,
    // ...
  }
}
```

**Refactored Code** (Consolidate into `app/src/logic/processors/proposals/processProposalData.js`):
```javascript
/**
 * Proposal Data Processor
 *
 * PILLAR III: Data Processors (The "Truth" Layer)
 *
 * This processor transforms raw Supabase/Bubble.io data into clean,
 * validated internal shapes. Supports two modes:
 * - Full mode: Complete nested transformation with listing/host/virtualMeeting
 * - Lean mode: Basic transformation for workflows that provide context separately
 */
import { PROPOSAL_STATUSES, getUsualOrder } from '../../constants/proposalStatuses.js'

/**
 * Transform raw proposal data - FULL mode with nested transformations.
 * Use when you need complete proposal with listing, host, virtualMeeting resolved.
 *
 * @param {Object} rawProposal - Raw proposal with nested objects already joined
 * @returns {Object} Fully transformed proposal with nested data
 * @throws {Error} If proposal data is missing or invalid
 */
export function processProposalData(rawProposal) {
  if (!rawProposal) {
    throw new Error('processProposalData: Proposal data is required');
  }

  if (!rawProposal._id) {
    throw new Error('processProposalData: Proposal ID (_id) is required');
  }

  // Extract and transform nested data
  const listing = processListingData(rawProposal.listing);
  const host = processHostData(rawProposal.listing?.host);
  const virtualMeeting = processVirtualMeetingData(rawProposal.virtualMeeting);

  return {
    // Core identifiers
    id: rawProposal._id,
    _id: rawProposal._id,

    // Status and state
    status: rawProposal.Status || 'Unknown',
    deleted: rawProposal.Deleted || false,
    usualOrder: getUsualOrder(rawProposal.Status),

    // Schedule - Original proposal terms
    daysSelected: rawProposal['Days Selected'] || [],
    // ... full structure from proposals version

    // Nested transformed data
    listing,
    host,
    virtualMeeting,
  };
}

/**
 * Transform raw proposal data - LEAN mode for workflow orchestration.
 * Use when listing/guest/host are provided separately by the workflow.
 *
 * @param {object} params - Named parameters.
 * @param {object} params.rawProposal - Raw proposal object from Supabase.
 * @param {object} [params.listing] - Pre-processed listing data.
 * @param {object} [params.guest] - Pre-processed guest user data.
 * @param {object} [params.host] - Pre-processed host user data.
 * @returns {object} Clean proposal with currentTerms/originalTerms structure.
 * @throws {Error} If rawProposal is null/undefined or missing critical fields.
 */
export function processProposalDataLean({ rawProposal, listing = null, guest = null, host = null }) {
  if (!rawProposal) {
    throw new Error('processProposalDataLean: rawProposal cannot be null or undefined')
  }

  if (!rawProposal._id) {
    throw new Error('processProposalDataLean: Proposal missing critical _id field')
  }

  if (!rawProposal.Listing) {
    throw new Error(
      `processProposalDataLean: Proposal ${rawProposal._id} missing required Listing reference`
    )
  }

  if (!rawProposal.Guest) {
    throw new Error(
      `processProposalDataLean: Proposal ${rawProposal._id} missing required Guest reference`
    )
  }

  const status = typeof rawProposal.Status === 'string'
    ? rawProposal.Status.trim()
    : (typeof rawProposal.status === 'string' ? rawProposal.status.trim() : 'Draft')

  const hasHostCounteroffer = status === PROPOSAL_STATUSES.COUNTEROFFER_SUBMITTED_AWAITING_GUEST_REVIEW.key.trim()

  const currentTerms = {
    moveInDate: hasHostCounteroffer && rawProposal['hc Move-In Date']
      ? rawProposal['hc Move-In Date']
      : rawProposal['Move-In Date'],
    // ... merge logic
  }

  const originalTerms = {
    moveInDate: rawProposal['Move-In Date'],
    // ...
  }

  return {
    id: rawProposal._id,
    listingId: rawProposal.Listing,
    guestId: rawProposal.Guest,
    status,
    deleted: rawProposal.Deleted === true,
    usualOrder: getUsualOrder(status),
    currentTerms,
    originalTerms,
    hasCounteroffer: hasHostCounteroffer,
    _listing: listing,
    _guest: guest,
    _host: host
  }
}

// Keep existing helper functions: processUserData, processListingData, processHostData, etc.
```

**Migration Steps**:
1. Add `processProposalDataLean` function to `processors/proposals/processProposalData.js`
2. Update `loadProposalDetailsWorkflow.js` to import `processProposalDataLean`
3. Delete `app/src/logic/processors/proposal/` directory (singular)
4. Update any other imports to use `processors/proposals/`

~~~~~

### CHUNK 3: Consolidate cancelProposalWorkflow (MEDIUM PRIORITY)

**Issue**: Two `cancelProposalWorkflow.js` files with overlapping functionality:
1. `app/src/logic/workflows/booking/cancelProposalWorkflow.js` (143 lines) - Complex decision tree, dependency injection
2. `app/src/logic/workflows/proposals/cancelProposalWorkflow.js` (176 lines) - Direct Supabase calls, simpler API

**Impact**:
- Confusion about which workflow to use
- `booking/` version has more complex business rules but isn't used
- `proposals/` version is actually used by UI components

**Affected Files**:
- `app/src/islands/pages/proposals/ProposalCard.jsx:23` - imports from proposals/
- `app/src/islands/pages/proposals/ExpandableProposalCard.jsx:36` - imports from proposals/
- `app/src/islands/modals/GuestEditingProposalModal.jsx:28` - imports from proposals/
- `booking/` version appears UNUSED in page components

**Current Code** (`app/src/logic/workflows/booking/cancelProposalWorkflow.js` - UNUSED):
```javascript
import { PROPOSAL_STATUSES } from '../../constants/proposalStatuses.js'

export async function cancelProposalWorkflow({
  supabase,
  proposal,
  source = 'main',
  canCancelProposal
}) {
  // Validation
  if (!supabase) {
    throw new Error('cancelProposalWorkflow: supabase client is required')
  }

  if (!proposal || !proposal.id) {
    throw new Error('cancelProposalWorkflow: proposal with id is required')
  }

  if (!canCancelProposal) {
    throw new Error('cancelProposalWorkflow: canCancelProposal rule function is required')
  }

  // Step 1: Check if cancellation is allowed
  const canCancel = canCancelProposal({
    proposalStatus: proposal.status,
    deleted: proposal.deleted
  })

  // ... decision tree based on source, usualOrder, houseManualAccessed
}
```

**Refactored Code** (Merge into `app/src/logic/workflows/proposals/cancelProposalWorkflow.js`):
```javascript
/**
 * Cancel Proposal Workflow
 *
 * PILLAR IV: Workflow Orchestrators (The "Flow" Layer)
 *
 * Implements proposal cancellation with decision tree logic:
 * - Standard cancellation: Direct DB update to "Cancelled by Guest"
 * - Protected cancellation: Requires phone call based on usualOrder/houseManual
 *
 * Exports:
 * - determineCancellationCondition: Evaluate which workflow applies
 * - executeCancelProposal: Simple DB update
 * - executeDeleteProposal: Soft-delete for already-terminal proposals
 * - cancelProposalWithRules: Full decision tree orchestration (from booking/)
 */

import { supabase } from '../../../lib/supabase.js';
import { canCancelProposal, requiresSpecialCancellationConfirmation } from '../../rules/proposals/proposalRules.js';
import { PROPOSAL_STATUSES } from '../../constants/proposalStatuses.js';

// Existing functions: determineCancellationCondition, executeCancelProposal,
// cancelProposalFromCompareTerms, executeDeleteProposal
// ... (keep as-is)

/**
 * Cancel proposal with full decision tree orchestration.
 * Migrated from booking/cancelProposalWorkflow.js
 *
 * @param {object} params - Named parameters.
 * @param {object} params.proposal - Processed proposal object.
 * @param {string} [params.source='main'] - 'main' | 'compare-modal'.
 * @returns {Promise<object>} Result with success, message, updated flags.
 */
export async function cancelProposalWithRules({
  proposal,
  source = 'main'
}) {
  if (!proposal || !proposal.id) {
    throw new Error('cancelProposalWithRules: proposal with id is required')
  }

  // Step 1: Check if cancellation is allowed using rule
  if (!canCancelProposal(proposal)) {
    return {
      success: false,
      message: 'This proposal cannot be cancelled (already in terminal state)',
      updated: false
    }
  }

  // Step 2: Extract decision factors
  const usualOrder = proposal.usualOrder || 0
  const hasAccessedHouseManual = proposal.houseManualAccessed === true
  const isFromCompareModal = source === 'compare-modal'

  // Step 3: Apply decision tree
  let shouldUpdateDatabase = false
  let alertMessage = null

  if (isFromCompareModal) {
    if (usualOrder <= 5) {
      shouldUpdateDatabase = true
    } else {
      alertMessage = 'Please call Split Lease to cancel this proposal (Usual Order > 5)'
    }
  } else {
    if (!hasAccessedHouseManual) {
      if (usualOrder <= 5) {
        shouldUpdateDatabase = true
      } else {
        alertMessage = 'Please call Split Lease to cancel this proposal (Usual Order > 5)'
      }
    } else {
      alertMessage = 'Please call Split Lease to cancel this proposal (House Manual accessed)'
    }
  }

  // Step 4: Execute action
  if (shouldUpdateDatabase) {
    try {
      await executeCancelProposal(proposal.id, 'Guest initiated cancellation')
      return {
        success: true,
        message: 'Proposal cancelled successfully',
        updated: true
      }
    } catch (err) {
      return {
        success: false,
        message: `Failed to cancel proposal: ${err.message}`,
        updated: false,
        error: err
      }
    }
  } else {
    return {
      success: true,
      message: alertMessage,
      updated: false,
      requiresPhoneCall: true
    }
  }
}
```

**Migration Steps**:
1. Add `cancelProposalWithRules` to `workflows/proposals/cancelProposalWorkflow.js`
2. Verify no imports exist for `workflows/booking/cancelProposalWorkflow.js`
3. Delete `app/src/logic/workflows/booking/cancelProposalWorkflow.js`

~~~~~

---

## PAGE GROUP: Search & Scheduling

**Affected Pages**: `/search`

~~~~~

### CHUNK 4: Delete Dead Code - isContiguousSelection Calculator (LOW PRIORITY)

**Issue**: `app/src/logic/calculators/scheduling/isContiguousSelection.js` is a duplicate that should be deleted after Chunk 1 migration.

**Current Code**:
```javascript
// ENTIRE FILE - 31 lines
// This is a duplicate of isScheduleContiguous.js with less robust validation
```

**Refactored Code**:
```javascript
// DELETE THIS FILE
// All functionality consolidated in app/src/logic/rules/scheduling/isScheduleContiguous.js
```

**Migration Steps**:
1. Complete Chunk 1 migration first
2. Verify no imports remain for this file
3. Delete `app/src/logic/calculators/scheduling/isContiguousSelection.js`

~~~~~

---

## PAGE GROUP: Internal/Utility

**Affected Pages**: None (internal only)

~~~~~

### CHUNK 5: Remove Unused timezone Parameter (LOW PRIORITY)

**Issue**: `calculateNextSendTime` accepts a `timezone` parameter that is never used in the function body.

**File**: `app/src/logic/calculators/reminders/calculateNextSendTime.js`

**Current Code**:
```javascript
export function calculateNextSendTime({ scheduledDateTime, timezone = 'America/New_York' }) {
  if (!scheduledDateTime) {
    throw new Error('calculateNextSendTime: scheduledDateTime is required');
  }

  const scheduledDate = new Date(scheduledDateTime);

  if (isNaN(scheduledDate.getTime())) {
    throw new Error('calculateNextSendTime: invalid scheduledDateTime format');
  }

  const now = new Date();

  // If scheduled time is in the future, use it
  if (scheduledDate > now) {
    return scheduledDate;
  }

  // Otherwise, return null (already past)
  return null;
}
```

**Refactored Code**:
```javascript
/**
 * Calculate next send time for a reminder.
 *
 * @intent Determine if a scheduled reminder time is still in the future.
 * @rule Returns the scheduledDateTime if it's in the future.
 * @rule Returns null if the scheduled time has already passed.
 *
 * @param {object} params - Named parameters.
 * @param {string} params.scheduledDateTime - ISO 8601 datetime string.
 * @returns {Date|null} The scheduled date if in future, null if past.
 *
 * @throws {Error} If scheduledDateTime is missing.
 * @throws {Error} If scheduledDateTime is invalid format.
 *
 * @example
 * calculateNextSendTime({ scheduledDateTime: '2026-01-20T14:00:00Z' })
 * // => Date object if future, null if past
 */
export function calculateNextSendTime({ scheduledDateTime }) {
  if (!scheduledDateTime) {
    throw new Error('calculateNextSendTime: scheduledDateTime is required');
  }

  const scheduledDate = new Date(scheduledDateTime);

  if (isNaN(scheduledDate.getTime())) {
    throw new Error('calculateNextSendTime: invalid scheduledDateTime format');
  }

  const now = new Date();

  // If scheduled time is in the future, use it
  if (scheduledDate > now) {
    return scheduledDate;
  }

  // Otherwise, return null (already past)
  return null;
}
```

**Migration Steps**:
1. Remove `timezone` parameter from function signature
2. Update JSDoc to remove timezone reference
3. Search for callers passing timezone (likely none)

~~~~~

---

## Implementation Order

Execute chunks in this sequence to minimize breakage:

| Order | Chunk | Reason |
|-------|-------|--------|
| 1 | Chunk 1 | Highest impact - consolidates core validation |
| 2 | Chunk 4 | Cleanup dead code from Chunk 1 |
| 3 | Chunk 2 | Medium complexity, processor consolidation |
| 4 | Chunk 3 | Medium complexity, workflow consolidation |
| 5 | Chunk 5 | Low priority, simple parameter removal |

---

## File References

### Files to DELETE after migration:
- `app/src/logic/calculators/scheduling/isContiguousSelection.js`
- `app/src/logic/processors/proposal/processProposalData.js` (entire directory)
- `app/src/logic/workflows/booking/cancelProposalWorkflow.js`

### Files to MODIFY:
- `app/src/logic/rules/scheduling/isScheduleContiguous.js` - Add adapter function
- `app/src/lib/availabilityValidation.js` - Re-export from canonical source
- `app/src/logic/processors/proposals/processProposalData.js` - Add lean variant
- `app/src/logic/workflows/proposals/cancelProposalWorkflow.js` - Add rules-based variant
- `app/src/logic/calculators/reminders/calculateNextSendTime.js` - Remove unused param

### Import updates needed:
- `app/src/islands/pages/ViewSplitLeasePage.jsx`
- `app/src/islands/pages/ViewSplitLeasePage/ViewSplitLeasePage.jsx`
- `app/src/islands/pages/PreviewSplitLeasePage.jsx`
- `app/src/logic/workflows/booking/loadProposalDetailsWorkflow.js`

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Breaking contiguous validation | Add adapter function for backwards compatibility |
| Different processProposalData return shapes | Keep both variants (full vs lean) with clear naming |
| Unused cancelProposalWorkflow removal | Verify no imports exist before deletion |
| Regression in page components | Run full E2E test suite after each chunk |

---

**Plan Created**: 2026-01-18T18:32:43
**Author**: Claude Opus 4.5 (code audit)
