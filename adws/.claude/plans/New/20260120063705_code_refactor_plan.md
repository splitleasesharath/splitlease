# Code Refactoring Plan - ../app/src/logic

Date: 2026-01-20
Audit Type: general

---

## Executive Summary

**Total Files Analyzed**: 68 files across 4 layers (calculators, rules, processors, workflows)

**Critical Findings**:
- DUPLICATE CODE: Two `cancelProposalWorkflow.js` files and duplicate `isContiguous` logic
- WRONG IMPORT PATH: `proposalButtonRules.js` imports from wrong location
- HIGH IMPACT FILE: `constants/proposalStatuses.js` (17 dependents) - DO NOT MODIFY without coordination

**Refactoring Chunks**: 10 total chunks organized by affected page groups

---

~~~~~

## PAGE GROUP: /guest-proposals, /proposals (Chunks: 1, 2, 3)

### CHUNK 1: Consolidate duplicate cancelProposalWorkflow.js files
**File:** `workflows/booking/cancelProposalWorkflow.js`, `workflows/proposals/cancelProposalWorkflow.js`
**Line:** 1-143 (booking), 1-176 (proposals)
**Issue:** Two files with same name but different implementations - code divergence risk
**Affected Pages:** /guest-proposals, /proposals

**Current Code (workflows/booking/cancelProposalWorkflow.js):**
```javascript
/**
 * Cancel Proposal Workflow
 *
 * Handles the cancellation of proposals with proper validation and UI feedback.
 * This workflow consolidates the business rules and execution logic for proposal cancellation.
 */

import { PROPOSAL_STATUSES } from '../../constants/proposalStatuses.js';

/**
 * Execute the proposal cancellation
 * @param {Object} params - Cancellation parameters
 * @param {Object} params.supabase - Supabase client instance
 * @param {Object} params.proposal - The proposal to cancel
 * @param {string} [params.source='main'] - Source context of cancellation
 * @param {Function} params.canCancelProposal - Validation function
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function cancelProposalWorkflow({
  supabase,
  proposal,
  source = 'main',
  canCancelProposal
}) {
  // Validate proposal exists
  if (!proposal) {
    return { success: false, error: 'No proposal provided' };
  }

  // Check if cancellation is allowed using business rules
  if (canCancelProposal && !canCancelProposal({
    proposalStatus: proposal.proposal_status,
    deleted: proposal.deleted
  })) {
    return { success: false, error: 'Proposal cannot be cancelled in current state' };
  }

  try {
    // Update proposal status to cancelled
    const { error } = await supabase
      .from('proposals')
      .update({
        proposal_status: PROPOSAL_STATUSES.PROPOSAL_CANCELLED_BY_GUEST.key,
        updated_at: new Date().toISOString()
      })
      .eq('id', proposal.id);

    if (error) {
      console.error('[cancelProposalWorkflow] Error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('[cancelProposalWorkflow] Unexpected error:', err);
    return { success: false, error: err.message };
  }
}
```

**Current Code (workflows/proposals/cancelProposalWorkflow.js):**
```javascript
/**
 * Cancel Proposal Workflow
 *
 * Orchestrates proposal cancellation operations with proper validation,
 * database updates, and UI feedback patterns.
 */

import { supabase } from '../../../lib/supabase.js';
import { PROPOSAL_STATUSES, getStatusConfig } from '../../constants/proposalStatuses.js';

/**
 * Determine if a proposal can be cancelled based on its current state
 * @param {Object} proposal - The proposal object
 * @returns {{ canCancel: boolean, reason?: string }}
 */
export function determineCancellationCondition(proposal) {
  if (!proposal) {
    return { canCancel: false, reason: 'No proposal provided' };
  }

  if (proposal.deleted) {
    return { canCancel: false, reason: 'Proposal has been deleted' };
  }

  const statusConfig = getStatusConfig(proposal.proposal_status);

  // Check if status allows cancellation
  if (statusConfig?.guestAction1 === 'Cancel' || statusConfig?.guestAction2 === 'Cancel') {
    return { canCancel: true };
  }

  return { canCancel: false, reason: 'Current status does not allow cancellation' };
}

/**
 * Execute the cancellation of a proposal
 * @param {string} proposalId - ID of the proposal to cancel
 * @param {string|null} reason - Optional cancellation reason
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function executeCancelProposal(proposalId, reason = null) {
  console.log('[cancelProposalWorkflow] Cancelling proposal:', proposalId);

  try {
    const updateData = {
      proposal_status: PROPOSAL_STATUSES.PROPOSAL_CANCELLED_BY_GUEST.key,
      updated_at: new Date().toISOString()
    };

    if (reason) {
      updateData.cancellation_reason = reason;
    }

    const { error } = await supabase
      .from('proposals')
      .update(updateData)
      .eq('id', proposalId);

    if (error) {
      console.log('[cancelProposalWorkflow] Error:', error);
      return { success: false, error: error.message };
    }

    console.log('[cancelProposalWorkflow] Successfully cancelled proposal');
    return { success: true };
  } catch (err) {
    console.log('[cancelProposalWorkflow] Unexpected error:', err);
    return { success: false, error: err.message };
  }
}

// ... additional functions
```

**Refactored Code (single consolidated workflows/proposals/cancelProposalWorkflow.js):**
```javascript
/**
 * Cancel Proposal Workflow
 *
 * Orchestrates proposal cancellation operations with proper validation,
 * database updates, and UI feedback patterns.
 *
 * Uses dependency injection for supabase client to enable testing.
 */

import { PROPOSAL_STATUSES, getStatusConfig } from '../../constants/proposalStatuses.js';

/**
 * Determine if a proposal can be cancelled based on its current state
 * @param {Object} proposal - The proposal object
 * @returns {{ canCancel: boolean, reason?: string }}
 */
export function determineCancellationCondition(proposal) {
  if (!proposal) {
    return { canCancel: false, reason: 'No proposal provided' };
  }

  if (proposal.deleted) {
    return { canCancel: false, reason: 'Proposal has been deleted' };
  }

  const statusConfig = getStatusConfig(proposal.proposal_status);

  if (statusConfig?.guestAction1 === 'Cancel' || statusConfig?.guestAction2 === 'Cancel') {
    return { canCancel: true };
  }

  return { canCancel: false, reason: 'Current status does not allow cancellation' };
}

/**
 * Execute the cancellation of a proposal
 * @param {Object} params - Cancellation parameters
 * @param {Object} params.supabase - Supabase client instance (dependency injection)
 * @param {string} params.proposalId - ID of the proposal to cancel
 * @param {string|null} [params.reason=null] - Optional cancellation reason
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function executeCancelProposal({ supabase, proposalId, reason = null }) {
  if (!supabase) {
    return { success: false, error: 'Supabase client required' };
  }

  try {
    const updateData = {
      proposal_status: PROPOSAL_STATUSES.PROPOSAL_CANCELLED_BY_GUEST.key,
      updated_at: new Date().toISOString()
    };

    if (reason) {
      updateData.cancellation_reason = reason;
    }

    const { error } = await supabase
      .from('proposals')
      .update(updateData)
      .eq('id', proposalId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Cancel proposal from compare terms flow
 * @param {Object} params - Parameters
 * @param {Object} params.supabase - Supabase client
 * @param {string} params.proposalId - Proposal ID
 * @param {string} params.reason - Cancellation reason
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function cancelProposalFromCompareTerms({ supabase, proposalId, reason }) {
  return executeCancelProposal({ supabase, proposalId, reason });
}

/**
 * Execute deletion of a proposal (soft delete)
 * @param {Object} params - Parameters
 * @param {Object} params.supabase - Supabase client
 * @param {string} params.proposalId - Proposal ID
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function executeDeleteProposal({ supabase, proposalId }) {
  if (!supabase) {
    return { success: false, error: 'Supabase client required' };
  }

  try {
    const { error } = await supabase
      .from('proposals')
      .update({
        deleted: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', proposalId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Main workflow function - wrapper for backward compatibility
 * @param {Object} params - Workflow parameters
 * @param {Object} params.supabase - Supabase client instance
 * @param {Object} params.proposal - The proposal to cancel
 * @param {string} [params.source='main'] - Source context of cancellation
 * @param {Function} [params.canCancelProposal] - Optional validation function override
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function cancelProposalWorkflow({
  supabase,
  proposal,
  source = 'main',
  canCancelProposal
}) {
  if (!proposal) {
    return { success: false, error: 'No proposal provided' };
  }

  // Use provided validator or built-in determination
  if (canCancelProposal) {
    const canCancel = canCancelProposal({
      proposalStatus: proposal.proposal_status,
      deleted: proposal.deleted
    });
    if (!canCancel) {
      return { success: false, error: 'Proposal cannot be cancelled in current state' };
    }
  } else {
    const { canCancel, reason } = determineCancellationCondition(proposal);
    if (!canCancel) {
      return { success: false, error: reason };
    }
  }

  return executeCancelProposal({ supabase, proposalId: proposal.id });
}
```

**Testing:**
- [ ] Verify ProposalCard.jsx cancellation still works
- [ ] Verify ExpandableProposalCard.jsx cancellation still works
- [ ] Verify GuestEditingProposalModal.jsx cancellation still works
- [ ] Run `bun run build` to check for import errors
- [ ] Test cancel action on /guest-proposals page

~~~~~

### CHUNK 2: Fix proposalButtonRules.js wrong import path
**File:** `rules/proposals/proposalButtonRules.js`
**Line:** 1
**Issue:** Imports from `../../../config/proposalStatusConfig.js` which doesn't exist - should import from `constants/proposalStatuses.js`
**Affected Pages:** /guest-proposals

**Current Code:**
```javascript
import { getStatusConfig, PROPOSAL_STATUS } from '../../../config/proposalStatusConfig.js';
```

**Refactored Code:**
```javascript
import { getStatusConfig, PROPOSAL_STATUSES } from '../../constants/proposalStatuses.js';
```

**Note:** Also need to update all references in the file from `PROPOSAL_STATUS` (singular) to `PROPOSAL_STATUSES` (plural).

**Testing:**
- [ ] Run `bun run build` to verify import resolves
- [ ] Test proposal button visibility on /guest-proposals page
- [ ] Verify all proposal status checks still work correctly

~~~~~

### CHUNK 3: Remove duplicate canCancelProposal functions
**File:** `rules/proposals/canCancelProposal.js`, `rules/proposals/proposalRules.js`
**Line:** canCancelProposal.js: 1-47, proposalRules.js: 26-54
**Issue:** Two functions with same name but different signatures - causes confusion
**Affected Pages:** /guest-proposals, /proposals

**Current Code (canCancelProposal.js):**
```javascript
/**
 * Determines if a proposal can be cancelled based on its current status and state.
 *
 * @param {Object} params - The parameters object
 * @param {string} params.proposalStatus - Current status of the proposal
 * @param {boolean} params.deleted - Whether the proposal has been deleted
 * @returns {boolean} True if the proposal can be cancelled
 */
export function canCancelProposal({ proposalStatus, deleted }) {
  // Cannot cancel if already deleted
  if (deleted) {
    return false;
  }

  // List of statuses that allow cancellation
  const cancellableStatuses = [
    'Pending Host Approval',
    'Schedule Accepted by Host',
    'Guest Has Counter Offer',
    'Counter-Offer: Guest Reviewing'
  ];

  return cancellableStatuses.includes(proposalStatus);
}
```

**Current Code (proposalRules.js - lines 26-54):**
```javascript
/**
 * Determines if a proposal can be cancelled
 * @param {Object} proposal - The proposal object
 * @returns {boolean}
 */
export function canCancelProposal(proposal) {
  if (!proposal) return false;
  if (proposal.deleted) return false;

  const status = proposal.proposal_status;
  const cancellableStatuses = [
    'Pending Host Approval',
    'Schedule Accepted by Host',
    'Guest Has Counter Offer',
    'Counter-Offer: Guest Reviewing'
  ];

  return cancellableStatuses.includes(status);
}
```

**Refactored Code (keep only canCancelProposal.js, update proposalRules.js to re-export):**

**canCancelProposal.js (no change needed - it's the better version):**
```javascript
/**
 * Determines if a proposal can be cancelled based on its current status and state.
 *
 * @param {Object} params - The parameters object
 * @param {string} params.proposalStatus - Current status of the proposal
 * @param {boolean} params.deleted - Whether the proposal has been deleted
 * @returns {boolean} True if the proposal can be cancelled
 */
export function canCancelProposal({ proposalStatus, deleted }) {
  if (deleted) {
    return false;
  }

  const cancellableStatuses = [
    'Pending Host Approval',
    'Schedule Accepted by Host',
    'Guest Has Counter Offer',
    'Counter-Offer: Guest Reviewing'
  ];

  return cancellableStatuses.includes(proposalStatus);
}
```

**proposalRules.js (remove duplicate, add re-export):**
```javascript
// Re-export from dedicated module for backward compatibility
export { canCancelProposal } from './canCancelProposal.js';

// ... rest of file without the duplicate canCancelProposal function
```

**Testing:**
- [ ] Verify all callers of canCancelProposal still work
- [ ] Update callers using proposal object to destructure: `canCancelProposal({ proposalStatus: proposal.proposal_status, deleted: proposal.deleted })`
- [ ] Test cancel functionality on both pages

~~~~~

## PAGE GROUP: /search, /view-split-lease (Chunks: 4)

### CHUNK 4: Remove duplicate isContiguous logic
**File:** `calculators/scheduling/isContiguousSelection.js`, `rules/scheduling/isScheduleContiguous.js`
**Line:** isContiguousSelection.js: 1-40, isScheduleContiguous.js: 1-60
**Issue:** Both files implement contiguous day checking - redundant code
**Affected Pages:** /search, /view-split-lease

**Current Code (isContiguousSelection.js):**
```javascript
/**
 * Checks if a selection of day indices represents contiguous days.
 * Handles wrap-around from Saturday (6) to Sunday (0).
 *
 * @param {number[]} selectedDays - Array of selected day indices (0-6)
 * @returns {boolean} True if the selection is contiguous
 */
export function isContiguousSelection(selectedDays) {
  if (!selectedDays || selectedDays.length === 0) {
    return true;
  }

  if (selectedDays.length === 1) {
    return true;
  }

  // Sort the days
  const sorted = [...selectedDays].sort((a, b) => a - b);

  // Check for simple contiguous sequence
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] - sorted[i - 1] !== 1) {
      // Check for wrap-around (e.g., [5, 6, 0, 1])
      if (!(sorted[i - 1] === sorted[sorted.length - 1] && sorted[0] === 0 && sorted[i] === sorted[i - 1] + 1)) {
        return false;
      }
    }
  }

  return true;
}
```

**Current Code (isScheduleContiguous.js - better version with wrap-around):**
```javascript
/**
 * Checks if selected days form a contiguous block.
 * This function consolidates the contiguous validation logic that previously existed in:
 * - availabilityValidation.js (isContiguousSelection)
 * - scheduleSelector/validators.js (isContiguous)
 *
 * Handles wrap-around (e.g., Fri-Sat-Sun-Mon is contiguous).
 *
 * @param {number[]} selectedDays - Array of selected day indices (0=Sunday, 6=Saturday)
 * @returns {boolean} True if days form a contiguous block
 */
export function isScheduleContiguous(selectedDays) {
  if (!selectedDays || selectedDays.length <= 1) {
    return true;
  }

  const sorted = [...selectedDays].sort((a, b) => a - b);

  // Check simple contiguous case
  let isSimpleContiguous = true;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] - sorted[i - 1] !== 1) {
      isSimpleContiguous = false;
      break;
    }
  }

  if (isSimpleContiguous) {
    return true;
  }

  // Check wrap-around case (e.g., [0, 1, 5, 6] = Sun-Mon-Fri-Sat)
  // Valid wrap-around: gap must be exactly at one point, and ends must connect via wrap
  const firstDay = sorted[0];
  const lastDay = sorted[sorted.length - 1];

  // For wrap-around: first must be 0 (Sunday) and last must be 6 (Saturday), or close
  if (firstDay === 0 && lastDay === 6) {
    // Check if there's only one gap
    let gapCount = 0;
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] - sorted[i - 1] > 1) {
        gapCount++;
      }
    }
    return gapCount === 1;
  }

  return false;
}
```

**Refactored Code:**

**isContiguousSelection.js (deprecate and re-export):**
```javascript
/**
 * @deprecated Use isScheduleContiguous from rules/scheduling/isScheduleContiguous.js
 * This file is kept for backward compatibility only.
 */
export { isScheduleContiguous as isContiguousSelection } from '../../rules/scheduling/isScheduleContiguous.js';
```

**Testing:**
- [ ] Update imports in schedule selector components to use isScheduleContiguous
- [ ] Test day selection on /search page
- [ ] Test schedule selection on /view-split-lease page
- [ ] Verify wrap-around selections work (Fri-Sat-Sun-Mon)

~~~~~

## PAGE GROUP: AUTO (Shared Utilities) (Chunks: 5, 6, 7)

### CHUNK 5: Add magic number constants to proposalButtonRules.js
**File:** `rules/proposals/proposalButtonRules.js`
**Line:** 62, 112-116
**Issue:** Magic numbers (3, 5) make business logic unclear
**Affected Pages:** /guest-proposals

**Current Code:**
```javascript
// Line 62
if (config.guestAction1 === 'Remind Split Lease' && (proposal['remindersByGuest (number)'] || 0) > 3) {
  ga1Button.visible = false;
}

// Lines 112-116
} else if (config.usualOrder > 5 && listing?.['House manual']) {
  // Show house manual link for high-priority orders
}
```

**Refactored Code:**
```javascript
// Add at top of file after imports
const MAX_GUEST_REMINDERS = 3;
const HIGH_PRIORITY_ORDER_THRESHOLD = 5;

// Line 62
if (config.guestAction1 === 'Remind Split Lease' && (proposal['remindersByGuest (number)'] || 0) > MAX_GUEST_REMINDERS) {
  ga1Button.visible = false;
}

// Lines 112-116
} else if (config.usualOrder > HIGH_PRIORITY_ORDER_THRESHOLD && listing?.['House manual']) {
  // Show house manual link for high-priority orders
}
```

**Testing:**
- [ ] Verify reminder button visibility logic unchanged
- [ ] Verify house manual link visibility unchanged
- [ ] Test on /guest-proposals with various proposal states

~~~~~

### CHUNK 6: Convert Supabase imports to dependency injection in counterofferWorkflow.js
**File:** `workflows/proposals/counterofferWorkflow.js`
**Line:** 18
**Issue:** Direct import of supabase client reduces testability
**Affected Pages:** /guest-proposals, /proposals

**Current Code:**
```javascript
import { supabase } from '../../../lib/supabase.js';

export async function submitCounteroffer(proposalId, counterofferData) {
  const { error } = await supabase
    .from('proposals')
    .update(counterofferData)
    .eq('id', proposalId);
  // ...
}
```

**Refactored Code:**
```javascript
// Remove: import { supabase } from '../../../lib/supabase.js';

/**
 * Submit a counteroffer for a proposal
 * @param {Object} params - Parameters
 * @param {Object} params.supabase - Supabase client instance
 * @param {string} params.proposalId - Proposal ID
 * @param {Object} params.counterofferData - Counteroffer data
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function submitCounteroffer({ supabase, proposalId, counterofferData }) {
  if (!supabase) {
    return { success: false, error: 'Supabase client required' };
  }

  const { error } = await supabase
    .from('proposals')
    .update(counterofferData)
    .eq('id', proposalId);
  // ...
}
```

**Testing:**
- [ ] Update all callers to pass supabase client
- [ ] Test counteroffer submission on /guest-proposals
- [ ] Verify counteroffer flow works end-to-end

~~~~~

### CHUNK 7: Convert Supabase imports to dependency injection in virtualMeetingWorkflow.js
**File:** `workflows/proposals/virtualMeetingWorkflow.js`
**Line:** 14
**Issue:** Direct import of supabase client reduces testability
**Affected Pages:** /guest-proposals, /proposals

**Current Code:**
```javascript
import { supabase } from '../../../lib/supabase.js';

export async function scheduleVirtualMeeting(proposalId, meetingDetails) {
  const { error } = await supabase
    .from('proposals')
    .update({ virtual_meeting: meetingDetails })
    .eq('id', proposalId);
  // ...
}
```

**Refactored Code:**
```javascript
// Remove: import { supabase } from '../../../lib/supabase.js';

/**
 * Schedule a virtual meeting for a proposal
 * @param {Object} params - Parameters
 * @param {Object} params.supabase - Supabase client instance
 * @param {string} params.proposalId - Proposal ID
 * @param {Object} params.meetingDetails - Meeting details
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function scheduleVirtualMeeting({ supabase, proposalId, meetingDetails }) {
  if (!supabase) {
    return { success: false, error: 'Supabase client required' };
  }

  const { error } = await supabase
    .from('proposals')
    .update({ virtual_meeting: meetingDetails })
    .eq('id', proposalId);
  // ...
}
```

**Testing:**
- [ ] Update all callers to pass supabase client
- [ ] Test virtual meeting scheduling flow
- [ ] Verify meeting details saved correctly

~~~~~

## PAGE GROUP: ALL PAGES (Performance) (Chunks: 8)

### CHUNK 8: Optimize getStatusConfig with lookup map
**File:** `constants/proposalStatuses.js`
**Line:** 254-257
**Issue:** Repeated Object.values() iteration on every call - performance concern
**Affected Pages:** All pages displaying proposal status

**Current Code:**
```javascript
export function getStatusConfig(statusKey) {
  if (!statusKey) {
    return {
      key: 'Unknown',
      displayName: 'Unknown',
      guestAction1: null,
      guestAction2: null,
      hostAction1: null,
      hostAction2: null,
      usualOrder: 999
    };
  }

  const normalizedKey = normalizeStatusKey(statusKey);

  const config = Object.values(PROPOSAL_STATUSES).find(
    s => normalizeStatusKey(s.key) === normalizedKey
  );

  return config || {
    key: statusKey,
    displayName: statusKey,
    guestAction1: null,
    guestAction2: null,
    hostAction1: null,
    hostAction2: null,
    usualOrder: 999
  };
}
```

**Refactored Code:**
```javascript
// Create lookup map at module load time (after PROPOSAL_STATUSES definition)
const STATUS_KEY_MAP = Object.values(PROPOSAL_STATUSES).reduce((acc, status) => {
  acc[normalizeStatusKey(status.key)] = status;
  return acc;
}, {});

const DEFAULT_STATUS_CONFIG = {
  key: 'Unknown',
  displayName: 'Unknown',
  guestAction1: null,
  guestAction2: null,
  hostAction1: null,
  hostAction2: null,
  usualOrder: 999
};

/**
 * Get the configuration for a proposal status
 * @param {string} statusKey - The status key to look up
 * @returns {Object} The status configuration
 */
export function getStatusConfig(statusKey) {
  if (!statusKey) {
    return DEFAULT_STATUS_CONFIG;
  }

  const normalizedKey = normalizeStatusKey(statusKey);
  const config = STATUS_KEY_MAP[normalizedKey];

  return config || {
    ...DEFAULT_STATUS_CONFIG,
    key: statusKey,
    displayName: statusKey
  };
}
```

**Testing:**
- [ ] Verify all proposal status displays work correctly
- [ ] Test status lookup performance (should be O(1) instead of O(n))
- [ ] Check all pages that display proposal status

~~~~~

## PAGE GROUP: Cleanup (Chunks: 9, 10)

### CHUNK 9: Remove console.log statements from workflows
**File:** `workflows/proposals/cancelProposalWorkflow.js`, `workflows/proposals/counterofferWorkflow.js`, `workflows/proposals/virtualMeetingWorkflow.js`, `workflows/proposals/navigationWorkflow.js`
**Line:** Multiple (see issue 2.2 in audit)
**Issue:** Console.log statements in production code - performance overhead and information leakage
**Affected Pages:** AUTO

**Current Code (example from cancelProposalWorkflow.js):**
```javascript
console.log('[cancelProposalWorkflow] Cancelling proposal:', proposalId);
// ... more console.log statements
console.log('[cancelProposalWorkflow] Successfully cancelled proposal');
console.log('[cancelProposalWorkflow] Error:', error);
```

**Refactored Code:**
```javascript
// Remove all console.log statements or replace with environment-aware logging
// Option 1: Remove entirely (recommended for production)
// Option 2: Use environment check
if (import.meta.env.DEV) {
  console.log('[cancelProposalWorkflow] Cancelling proposal:', proposalId);
}
```

**Testing:**
- [ ] Run `bun run build` to verify no syntax errors
- [ ] Verify no console output in production build
- [ ] Test all affected workflows still function correctly

~~~~~

### CHUNK 10: Fix trailing space in status key
**File:** `constants/proposalStatuses.js`
**Line:** 196-197
**Issue:** Trailing space in status key could cause matching issues
**Affected Pages:** Pages showing activated leases

**Current Code:**
```javascript
INITIAL_PAYMENT_SUBMITTED_LEASE_ACTIVATED: {
  key: 'Initial Payment Submitted / Lease activated ',  // Note trailing space!
  displayName: 'Lease Activated',
  // ...
}
```

**Refactored Code:**
```javascript
INITIAL_PAYMENT_SUBMITTED_LEASE_ACTIVATED: {
  key: 'Initial Payment Submitted / Lease activated',  // Trailing space removed
  displayName: 'Lease Activated',
  // ...
}
```

**Note:** The `normalizeStatusKey` function handles this via `.trim()`, but source data should be clean.

**Testing:**
- [ ] Verify activated lease status displays correctly
- [ ] Check database values match (may need migration if DB has trailing space)
- [ ] Test status matching in all proposal flows

~~~~~

---

## Summary

| Priority | Chunks | Description |
|----------|--------|-------------|
| CRITICAL | 1, 2 | Duplicate files and wrong imports - blocks functionality |
| HIGH | 3, 4 | Redundant functions - maintenance burden |
| MEDIUM | 5, 6, 7 | Code quality - testability improvements |
| LOW | 8, 9, 10 | Performance and cleanup - polish |

## Files Referenced

### To Modify
- `workflows/booking/cancelProposalWorkflow.js` (DELETE after consolidation)
- `workflows/proposals/cancelProposalWorkflow.js`
- `rules/proposals/proposalButtonRules.js`
- `rules/proposals/canCancelProposal.js`
- `rules/proposals/proposalRules.js`
- `calculators/scheduling/isContiguousSelection.js`
- `rules/scheduling/isScheduleContiguous.js`
- `workflows/proposals/counterofferWorkflow.js`
- `workflows/proposals/virtualMeetingWorkflow.js`
- `workflows/proposals/navigationWorkflow.js`
- `constants/proposalStatuses.js`

### DO NOT MODIFY (High Impact)
- `constants/proposalStatuses.js` structure (only fix trailing space in Chunk 10)

### Safe Leaf Files for Future Refactoring
- All files in `calculators/pricing/`
- All files in `calculators/reviews/`
- Most files in `calculators/scheduling/`
- All workflow files (low dependents)
