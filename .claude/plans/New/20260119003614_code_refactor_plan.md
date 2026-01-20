# Code Refactoring Plan - app/src/logic

Date: 2026-01-19
Audit Type: general

~~~~~

## PAGE GROUP: /search, /view-split-lease, /favorite-listings (Chunks: 1, 2, 3)

### CHUNK 1: Duplicate contiguous selection logic
**Files:** `calculators/scheduling/isContiguousSelection.js`, `rules/scheduling/isScheduleContiguous.js`
**Line:** 1-31 (isContiguousSelection.js), 1-108 (isScheduleContiguous.js)
**Issue:** Two files implement nearly identical contiguous selection logic. `isContiguousSelection.js` is a simpler version, while `isScheduleContiguous.js` includes input validation and better documentation. This causes code duplication and potential inconsistency.
**Affected Pages:** /search, /view-split-lease (via useScheduleSelectorLogicCore.js)

**Current Code:**
```javascript
// calculators/scheduling/isContiguousSelection.js
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
// DELETE calculators/scheduling/isContiguousSelection.js entirely
// Update all imports to use the canonical implementation:
// import { isScheduleContiguous } from '../../logic/rules/scheduling/isScheduleContiguous.js'

// If you need a simpler API without object parameter, add a wrapper:
// In rules/scheduling/isScheduleContiguous.js, add at the bottom:
/**
 * Simple wrapper for backward compatibility.
 * @deprecated Use isScheduleContiguous({ selectedDayIndices }) instead
 */
export function isContiguousSelection(selectedDays) {
  if (!selectedDays || !Array.isArray(selectedDays)) return false;
  return isScheduleContiguous({ selectedDayIndices: selectedDays });
}
```

**Testing:**
- [ ] Update imports in `useScheduleSelectorLogicCore.js` to use canonical `isScheduleContiguous`
- [ ] Remove `calculators/scheduling/isContiguousSelection.js`
- [ ] Run schedule selector tests with wrap-around cases (Fri-Sun, Sat-Tue)

~~~~~

### CHUNK 2: Duplicate processProposalData implementations
**Files:** `processors/proposal/processProposalData.js`, `processors/proposals/processProposalData.js`
**Line:** Full files
**Issue:** Two different `processProposalData` implementations exist in different directories (`proposal/` singular vs `proposals/` plural). This causes confusion and potential bugs if the wrong one is imported. They have different field mappings and processing logic.
**Affected Pages:** /guest-proposals, /view-split-lease, /host-proposals

**Current Code:**
```javascript
// processors/proposal/processProposalData.js (149 lines)
// Uses: Move-In Date, Days of Week, hc Move-In Date, etc.
export function processProposalData({ rawProposal, listing, guest, host }) {
  // Returns: { id, listingId, guestId, status, deleted, usualOrder, currentTerms, originalTerms, ... }
}

// processors/proposals/processProposalData.js (301 lines)
// Uses: Days Selected, Nights Selected, proposal nightly price, etc.
export function processProposalData(rawProposal) {
  // Returns: { id, _id, status, deleted, daysSelected, nightsSelected, totalPrice, ... }
}
```

**Refactored Code:**
```javascript
// STEP 1: Consolidate into processors/proposals/processProposalData.js (the more complete one)
// STEP 2: Add the field mappings from proposal/processProposalData.js as an alias function

// In processors/proposals/processProposalData.js, add:
/**
 * Alternative processor for workflows that need the currentTerms/originalTerms format.
 * @param {object} params - { rawProposal, listing, guest, host }
 * @returns {object} Proposal with merged terms
 */
export function processProposalDataWithTerms({ rawProposal, listing = null, guest = null, host = null }) {
  // Core processing from existing processProposalData
  const base = processProposalData(rawProposal);

  // Add the terms structure for comparison modals
  const hasHostCounteroffer = base.counterOfferHappened;

  return {
    ...base,
    currentTerms: hasHostCounteroffer ? {
      daysOfWeek: base.hcDaysSelected || base.daysSelected,
      totalRent: base.hcTotalPrice || base.totalPrice,
      // ... other term mappings
    } : {
      daysOfWeek: base.daysSelected,
      totalRent: base.totalPrice,
    },
    originalTerms: {
      daysOfWeek: base.daysSelected,
      totalRent: base.totalPrice,
    },
    _listing: listing,
    _guest: guest,
    _host: host,
  };
}

// STEP 3: Delete processors/proposal/processProposalData.js
// STEP 4: Update loadProposalDetailsWorkflow.js to use new function
```

**Testing:**
- [ ] Identify all imports of `processors/proposal/processProposalData.js`
- [ ] Update imports to use consolidated version
- [ ] Test proposal detail loading on guest proposals page
- [ ] Test counteroffer comparison modal

~~~~~

### CHUNK 3: Repeated price tier, week pattern, sort option validation pattern
**Files:** `rules/search/isValidPriceTier.js`, `rules/search/isValidSortOption.js`, `rules/search/isValidWeekPattern.js`
**Line:** Full files (32 lines each)
**Issue:** Three nearly identical validation functions with the same structure. Each imports a constant array and checks inclusion. This is boilerplate that could be generalized.
**Affected Pages:** /search

**Current Code:**
```javascript
// rules/search/isValidPriceTier.js
import { VALID_PRICE_TIERS } from '../../constants/searchConstants.js';
export function isValidPriceTier({ priceTier }) {
  if (typeof priceTier !== 'string') {
    throw new Error(`isValidPriceTier: priceTier must be a string, got ${typeof priceTier}`)
  }
  return VALID_PRICE_TIERS.includes(priceTier)
}

// rules/search/isValidSortOption.js - identical structure
// rules/search/isValidWeekPattern.js - identical structure
```

**Refactored Code:**
```javascript
// rules/search/searchValidators.js - Consolidated validator factory
import { VALID_PRICE_TIERS, VALID_SORT_OPTIONS, VALID_WEEK_PATTERNS } from '../../constants/searchConstants.js';

/**
 * Factory for creating search parameter validators.
 * @param {string} paramName - Parameter name for error messages
 * @param {string[]} validValues - Array of valid values
 * @returns {Function} Validator function
 */
function createSearchValidator(paramName, validValues) {
  return function({ [paramName]: value }) {
    if (typeof value !== 'string') {
      throw new Error(`isValid${paramName.charAt(0).toUpperCase() + paramName.slice(1)}: ${paramName} must be a string, got ${typeof value}`);
    }
    return validValues.includes(value);
  };
}

export const isValidPriceTier = createSearchValidator('priceTier', VALID_PRICE_TIERS);
export const isValidSortOption = createSearchValidator('sortBy', VALID_SORT_OPTIONS);
export const isValidWeekPattern = createSearchValidator('weekPattern', VALID_WEEK_PATTERNS);

// Re-export for backward compatibility (can be deleted after migration)
export { VALID_PRICE_TIERS, VALID_SORT_OPTIONS, VALID_WEEK_PATTERNS };
```

**Testing:**
- [ ] Update `useSearchPageLogic.js` imports
- [ ] Delete individual validator files after migration
- [ ] Test search filter application

~~~~~

## PAGE GROUP: /guest-proposals (Chunks: 4, 5, 6)

### CHUNK 4: Duplicate canCancelProposal implementations
**Files:** `rules/proposals/canCancelProposal.js`, `rules/proposals/proposalRules.js`
**Line:** 1-48 (canCancelProposal.js), 26-54 (proposalRules.js)
**Issue:** `canCancelProposal` is implemented twice with different signatures - one takes `{ proposalStatus, deleted }` object, the other takes a full `proposal` object. This causes confusion about which to use.
**Affected Pages:** /guest-proposals

**Current Code:**
```javascript
// rules/proposals/canCancelProposal.js
import { isTerminalStatus, isCompletedStatus } from '../../constants/proposalStatuses.js'
export function canCancelProposal({ proposalStatus, deleted = false }) {
  if (deleted) return false;
  if (!proposalStatus || typeof proposalStatus !== 'string') return false;
  const status = proposalStatus.trim();
  if (isTerminalStatus(status) || isCompletedStatus(status)) return false;
  return true;
}

// rules/proposals/proposalRules.js
import { PROPOSAL_STATUSES, isTerminalStatus, isCompletedStatus } from '../../constants/proposalStatuses.js';
export function canCancelProposal(proposal) {
  if (!proposal) return false;
  const status = proposal.status || proposal.Status;
  if (status === PROPOSAL_STATUSES.CANCELLED_BY_GUEST.key ||
      status === PROPOSAL_STATUSES.CANCELLED_BY_SPLITLEASE.key ||
      status === PROPOSAL_STATUSES.REJECTED_BY_HOST.key) return false;
  if (isCompletedStatus(status)) return false;
  if (status === PROPOSAL_STATUSES.EXPIRED.key) return false;
  return true;
}
```

**Refactored Code:**
```javascript
// KEEP: rules/proposals/proposalRules.js version (more explicit about statuses)
// DELETE: rules/proposals/canCancelProposal.js

// Update proposalRules.js to support both call signatures:
/**
 * Check if a proposal can be cancelled.
 * @param {object} proposalOrParams - Either full proposal object OR { proposalStatus, deleted }
 * @returns {boolean}
 */
export function canCancelProposal(proposalOrParams) {
  if (!proposalOrParams) return false;

  // Support both signatures
  let status, deleted;
  if ('proposalStatus' in proposalOrParams) {
    // New signature: { proposalStatus, deleted }
    status = proposalOrParams.proposalStatus;
    deleted = proposalOrParams.deleted ?? false;
  } else {
    // Legacy signature: full proposal object
    status = proposalOrParams.status || proposalOrParams.Status;
    deleted = proposalOrParams.deleted || proposalOrParams.Deleted || false;
  }

  if (deleted) return false;
  if (!status || typeof status !== 'string') return false;

  const trimmedStatus = status.trim();

  // Explicit terminal status checks
  if (trimmedStatus === PROPOSAL_STATUSES.CANCELLED_BY_GUEST.key ||
      trimmedStatus === PROPOSAL_STATUSES.CANCELLED_BY_SPLITLEASE.key ||
      trimmedStatus === PROPOSAL_STATUSES.REJECTED_BY_HOST.key ||
      trimmedStatus === PROPOSAL_STATUSES.EXPIRED.key) {
    return false;
  }

  if (isCompletedStatus(trimmedStatus)) return false;

  return true;
}
```

**Testing:**
- [ ] Update imports in `cancelProposalWorkflow.js` (both booking/ and proposals/ versions)
- [ ] Delete `rules/proposals/canCancelProposal.js`
- [ ] Test proposal cancellation flow end-to-end

~~~~~

### CHUNK 5: Duplicate cancelProposalWorkflow implementations
**Files:** `workflows/booking/cancelProposalWorkflow.js`, `workflows/proposals/cancelProposalWorkflow.js`
**Line:** Full files
**Issue:** Two cancel proposal workflow implementations in different directories. The `booking/` version is a simpler async workflow, while `proposals/` version has more condition handling but doesn't return promises. They should be consolidated.
**Affected Pages:** /guest-proposals

**Current Code:**
```javascript
// workflows/booking/cancelProposalWorkflow.js (144 lines)
// Async function with decision tree based on usualOrder and houseManualAccessed
export async function cancelProposalWorkflow({ supabase, proposal, source, canCancelProposal })

// workflows/proposals/cancelProposalWorkflow.js (176 lines)
// Sync determineCancellationCondition + async executeCancelProposal
export function determineCancellationCondition(proposal)
export async function executeCancelProposal(proposalId, reason)
```

**Refactored Code:**
```javascript
// KEEP: workflows/proposals/cancelProposalWorkflow.js (more modular design)
// DELETE: workflows/booking/cancelProposalWorkflow.js

// The proposals/ version has better separation:
// 1. determineCancellationCondition() - pure function for rules
// 2. executeCancelProposal() - async for DB update
// 3. cancelProposalFromCompareTerms() - variant for modal
// 4. executeDeleteProposal() - soft delete

// Update the booking/ version callers to use:
import {
  determineCancellationCondition,
  executeCancelProposal
} from '../../workflows/proposals/cancelProposalWorkflow.js';

// Compose them in the UI layer if needed:
async function handleCancelProposal(proposal, reason) {
  const condition = determineCancellationCondition(proposal);
  if (!condition.allowCancel) {
    return { success: false, message: condition.message };
  }
  if (condition.requiresConfirmation) {
    // Show confirmation dialog first
  }
  return executeCancelProposal(proposal._id, reason);
}
```

**Testing:**
- [ ] Identify imports of `workflows/booking/cancelProposalWorkflow.js`
- [ ] Migrate to `workflows/proposals/cancelProposalWorkflow.js`
- [ ] Delete booking/ version
- [ ] Test cancellation from both main page and compare modal

~~~~~

### CHUNK 6: Unused hasReviewableCounteroffer import in counterofferWorkflow.js
**Files:** `workflows/proposals/counterofferWorkflow.js`
**Line:** 19
**Issue:** `hasReviewableCounteroffer` is imported but never used in the file. This is dead code.
**Affected Pages:** /guest-proposals

**Current Code:**
```javascript
import { supabase } from '../../../lib/supabase.js';
import { hasReviewableCounteroffer } from '../../rules/proposals/proposalRules.js';
import { PROPOSAL_STATUSES } from '../../constants/proposalStatuses.js';

// hasReviewableCounteroffer is never called in this file
```

**Refactored Code:**
```javascript
import { supabase } from '../../../lib/supabase.js';
// REMOVED: import { hasReviewableCounteroffer } from '../../rules/proposals/proposalRules.js';
import { PROPOSAL_STATUSES } from '../../constants/proposalStatuses.js';
```

**Testing:**
- [ ] Remove unused import
- [ ] Run linter to verify no other unused imports

~~~~~

## PAGE GROUP: /host-proposals (Chunks: 7)

### CHUNK 7: VM_STATES legacy aliases cause confusion
**Files:** `rules/proposals/virtualMeetingRules.js`
**Line:** 26-37
**Issue:** `VM_STATES` object contains legacy aliases (`REQUESTED_BY_GUEST`, `REQUESTED_BY_HOST`) that point to the same values as their replacements (`REQUESTED_BY_ME`, `REQUESTED_BY_OTHER`). The comment says "will be removed in future" but they're still present, causing potential confusion.
**Affected Pages:** /host-proposals, /guest-proposals (VirtualMeetingsSection)

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
  REQUESTED_BY_GUEST: 'requested_by_me',        // Alias → REQUESTED_BY_ME
  REQUESTED_BY_HOST: 'requested_by_other'       // Alias → REQUESTED_BY_OTHER
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
  EXPIRED: 'expired',
};

// If legacy aliases are still needed, export them separately with deprecation warning:
/** @deprecated Use VM_STATES.REQUESTED_BY_ME instead */
export const VM_STATE_REQUESTED_BY_GUEST = VM_STATES.REQUESTED_BY_ME;
/** @deprecated Use VM_STATES.REQUESTED_BY_OTHER instead */
export const VM_STATE_REQUESTED_BY_HOST = VM_STATES.REQUESTED_BY_OTHER;
```

**Testing:**
- [ ] Search codebase for `VM_STATES.REQUESTED_BY_GUEST` and `VM_STATES.REQUESTED_BY_HOST`
- [ ] Update any usages to new names
- [ ] Remove legacy aliases or extract as deprecated exports

~~~~~

## PAGE GROUP: /house-manual (Chunks: 8)

### CHUNK 8: reminderAdapter missing adaptReminderUpdateForSubmission function
**Files:** `processors/reminders/reminderAdapter.js`
**Line:** N/A (missing function)
**Issue:** `reminderWorkflow.js` imports `adaptReminderUpdateForSubmission` from `reminderAdapter.js`, but this function doesn't exist in the adapter file. This will cause a runtime error when updating reminders.
**Affected Pages:** /house-manual (reminder editing)

**Current Code:**
```javascript
// workflows/reminders/reminderWorkflow.js line 8
import { adaptReminderForSubmission, adaptReminderUpdateForSubmission } from '../../processors/reminders/reminderAdapter.js';

// But processors/reminders/reminderAdapter.js only exports:
// - adaptReminderForSubmission
// - adaptReminderFromDatabase
// - adaptRemindersFromDatabase
```

**Refactored Code:**
```javascript
// Add to processors/reminders/reminderAdapter.js:

/**
 * Adapt reminder update data for API submission.
 * @param {object} params - { reminderId, updates }
 * @returns {object} API-ready update payload
 */
export function adaptReminderUpdateForSubmission({ reminderId, updates }) {
  if (!reminderId) {
    throw new Error('adaptReminderUpdateForSubmission: reminderId is required');
  }

  const payload = {
    id: reminderId,
    modified_date: new Date().toISOString(),
  };

  // Map update fields to database column names
  if (updates.message !== undefined) {
    payload.message = updates.message;
  }
  if (updates.scheduledDateTime !== undefined) {
    payload.scheduled_datetime = updates.scheduledDateTime;
  }
  if (updates.isEmailReminder !== undefined) {
    payload.is_email_reminder = updates.isEmailReminder;
  }
  if (updates.isSmsReminder !== undefined) {
    payload.is_sms_reminder = updates.isSmsReminder;
  }
  if (updates.fallbackEmail !== undefined) {
    payload.fallback_email = updates.fallbackEmail;
  }
  if (updates.fallbackPhone !== undefined) {
    payload.fallback_phone = updates.fallbackPhone;
  }

  return payload;
}
```

**Testing:**
- [ ] Add function to reminderAdapter.js
- [ ] Test reminder update flow in house manual page
- [ ] Verify field mappings match database schema

~~~~~

## PAGE GROUP: SHARED/AUTO (Chunks: 9, 10, 11)

### CHUNK 9: Protocol-relative URL handling scattered across codebase
**Files:** `workflows/auth/validateTokenWorkflow.js`, `processors/user/processProfilePhotoUrl.js`
**Line:** 92-95 (validateTokenWorkflow.js)
**Issue:** Protocol-relative URL handling (`//example.com` → `https://example.com`) is done inline in workflows instead of being delegated to the dedicated processor function. This duplicates logic.
**Affected Pages:** All pages using user profile photos

**Current Code:**
```javascript
// workflows/auth/validateTokenWorkflow.js lines 92-95
let profilePhoto = userData['Profile Photo']
if (profilePhoto && profilePhoto.startsWith('//')) {
  profilePhoto = 'https:' + profilePhoto
}
```

**Refactored Code:**
```javascript
// workflows/auth/validateTokenWorkflow.js
import { processProfilePhotoUrl } from '../../processors/user/processProfilePhotoUrl.js';

// Replace inline handling with:
const profilePhoto = processProfilePhotoUrl({ rawUrl: userData['Profile Photo'] });
```

**Testing:**
- [ ] Update validateTokenWorkflow.js to use processProfilePhotoUrl
- [ ] Test authentication flow with protocol-relative profile photo URLs
- [ ] Search for other `startsWith('//')` patterns in codebase

~~~~~

### CHUNK 10: Magic numbers in pricing calculations
**Files:** `calculators/pricing/calculateFourWeekRent.js`, `calculators/pricing/calculatePricingBreakdown.js`
**Line:** Various
**Issue:** Pricing calculations use magic numbers (4 weeks, 7 days) that should be constants from pricingConstants.js for maintainability.
**Affected Pages:** /search, /view-split-lease, /guest-proposals

**Current Code:**
```javascript
// calculators/pricing/calculateFourWeekRent.js
export function calculateFourWeekRent({ nightlyRate, nightsPerWeek }) {
  return nightlyRate * nightsPerWeek * 4; // Magic number 4
}
```

**Refactored Code:**
```javascript
import { WEEKS_PER_BILLING_CYCLE, DAYS_PER_WEEK } from '../../constants/pricingConstants.js';

export function calculateFourWeekRent({ nightlyRate, nightsPerWeek }) {
  return nightlyRate * nightsPerWeek * WEEKS_PER_BILLING_CYCLE;
}
```

**Testing:**
- [ ] Add WEEKS_PER_BILLING_CYCLE constant to pricingConstants.js if missing
- [ ] Update all pricing calculators to use constants
- [ ] Verify pricing calculations haven't changed

~~~~~

### CHUNK 11: DAY_NAMES array duplicated in multiple files
**Files:** `workflows/scheduling/validateMoveInDateWorkflow.js`, `workflows/scheduling/validateScheduleWorkflow.js`
**Line:** 105 (validateMoveInDateWorkflow.js), 99 (validateScheduleWorkflow.js)
**Issue:** `DAY_NAMES` array is defined inline in multiple workflow files instead of being imported from a shared constant.
**Affected Pages:** /search, /view-split-lease

**Current Code:**
```javascript
// validateMoveInDateWorkflow.js line 105
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

// validateScheduleWorkflow.js line 99
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
```

**Refactored Code:**
```javascript
// Add to constants/schedulingConstants.js (create if needed) or lib/dayUtils.js:
export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const DAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Update workflows:
import { DAY_NAMES } from '../../constants/schedulingConstants.js';
// OR
import { DAY_NAMES } from '../../../lib/dayUtils.js';
```

**Testing:**
- [ ] Create schedulingConstants.js or add to existing dayUtils.js
- [ ] Update both workflow files to import the constant
- [ ] Test schedule validation error messages

~~~~~

## SUMMARY

| Chunk | Issue Type | Files Affected | Complexity | Affected Pages |
|-------|------------|----------------|------------|----------------|
| 1 | Duplication | 2 | Medium | /search, /view-split-lease |
| 2 | Duplication | 2 | High | /guest-proposals, /host-proposals |
| 3 | Boilerplate | 3 | Low | /search |
| 4 | Duplication | 2 | Medium | /guest-proposals |
| 5 | Duplication | 2 | High | /guest-proposals |
| 6 | Dead code | 1 | Low | /guest-proposals |
| 7 | Maintainability | 1 | Low | /host-proposals |
| 8 | Missing function | 1 | Medium | /house-manual |
| 9 | Code smell | 2 | Low | All authenticated pages |
| 10 | Maintainability | 2 | Low | /search, /view-split-lease |
| 11 | Duplication | 2 | Low | /search, /view-split-lease |

## REFACTORING PRIORITY ORDER

1. **CHUNK 8** (Missing function) - Fix runtime error first
2. **CHUNK 6** (Dead code) - Quick win, reduces noise
3. **CHUNK 1** (Contiguous selection) - High impact, reduces confusion
4. **CHUNK 4** (canCancelProposal) - Medium impact, API consistency
5. **CHUNK 5** (cancelProposalWorkflow) - Depends on CHUNK 4
6. **CHUNK 2** (processProposalData) - High impact but complex
7. **CHUNK 3** (Search validators) - Nice-to-have consolidation
8. **CHUNK 7-11** (Misc cleanup) - Low priority maintainability

## REFERENCED FILES

- `app/src/logic/calculators/scheduling/isContiguousSelection.js`
- `app/src/logic/rules/scheduling/isScheduleContiguous.js`
- `app/src/logic/processors/proposal/processProposalData.js`
- `app/src/logic/processors/proposals/processProposalData.js`
- `app/src/logic/rules/search/isValidPriceTier.js`
- `app/src/logic/rules/search/isValidSortOption.js`
- `app/src/logic/rules/search/isValidWeekPattern.js`
- `app/src/logic/rules/proposals/canCancelProposal.js`
- `app/src/logic/rules/proposals/proposalRules.js`
- `app/src/logic/workflows/booking/cancelProposalWorkflow.js`
- `app/src/logic/workflows/proposals/cancelProposalWorkflow.js`
- `app/src/logic/workflows/proposals/counterofferWorkflow.js`
- `app/src/logic/rules/proposals/virtualMeetingRules.js`
- `app/src/logic/processors/reminders/reminderAdapter.js`
- `app/src/logic/workflows/reminders/reminderWorkflow.js`
- `app/src/logic/workflows/auth/validateTokenWorkflow.js`
- `app/src/logic/processors/user/processProfilePhotoUrl.js`
- `app/src/logic/calculators/pricing/calculateFourWeekRent.js`
- `app/src/logic/workflows/scheduling/validateMoveInDateWorkflow.js`
- `app/src/logic/workflows/scheduling/validateScheduleWorkflow.js`
- `app/src/logic/constants/pricingConstants.js`
- `app/src/logic/constants/searchConstants.js`
