# Code Refactoring Plan - app/src/logic

Date: 2026-01-14
Audit Type: general

~~~~~

## PAGE GROUP: /guest-proposals, /host-proposals, /view-split-lease (Chunks: 1, 2, 3)

### CHUNK 1: Duplicate processProposalData implementations
**File:** app/src/logic/processors/proposal/processProposalData.js AND app/src/logic/processors/proposals/processProposalData.js
**Line:** 1-149 AND 1-330
**Issue:** Two completely different implementations of `processProposalData` exist in nearly identical directory paths (`proposal/` vs `proposals/`). This causes maintenance confusion, inconsistent data shapes, and potential runtime bugs when the wrong one is imported. The `proposal/processProposalData.js` uses named parameters `{ rawProposal }` while `proposals/processProposalData.js` uses positional `rawProposal`. They return different object shapes.
**Affected Pages:** /guest-proposals, /host-proposals, /view-split-lease

**Current Code:**
```javascript
// FILE 1: processors/proposal/processProposalData.js (lines 36-40)
export function processProposalData({ rawProposal, listing = null, guest = null, host = null }) {
  // No Fallback: Proposal data must exist
  if (!rawProposal) {
    throw new Error('processProposalData: rawProposal cannot be null or undefined')
  }

// FILE 2: processors/proposals/processProposalData.js (lines 133-140)
export function processProposalData(rawProposal) {
  if (!rawProposal) {
    throw new Error('processProposalData: Proposal data is required');
  }

  if (!rawProposal._id) {
    throw new Error('processProposalData: Proposal ID (_id) is required');
  }
```

**Refactored Code:**
```javascript
// CONSOLIDATE into single file: processors/proposal/processProposalData.js
// Remove the duplicate at processors/proposals/processProposalData.js
// Keep the named parameter version as the canonical implementation

/**
 * Process raw proposal data from Supabase into a clean, validated proposal object.
 * Unified implementation consolidating both previous implementations.
 */
export function processProposalData({ rawProposal, listing = null, guest = null, host = null }) {
  // No Fallback: Proposal data must exist
  if (!rawProposal) {
    throw new Error('processProposalData: rawProposal cannot be null or undefined')
  }

  // Validate critical ID field
  if (!rawProposal._id) {
    throw new Error('processProposalData: Proposal missing critical _id field')
  }

  // ... rest of implementation from proposal/processProposalData.js
}

// Add adapter for legacy callers expecting positional parameter
export function processProposalDataLegacy(rawProposal) {
  return processProposalData({ rawProposal });
}
```

**Testing:**
- [ ] Search all imports for `processProposalData` and update to use named parameter version
- [ ] Verify all proposal pages still render correctly
- [ ] Run existing unit tests

~~~~~

### CHUNK 2: Duplicate canCancelProposal rule implementations
**File:** app/src/logic/rules/proposals/canCancelProposal.js AND app/src/logic/rules/proposals/proposalRules.js
**Line:** canCancelProposal.js:27-47 AND proposalRules.js:26-54
**Issue:** Two implementations of `canCancelProposal` with different signatures and logic. The standalone version uses named parameters `{ proposalStatus, deleted }` while `proposalRules.js` version uses `(proposal)` and directly accesses `proposal.status`. Both are exported from the index.js, creating potential naming conflicts and inconsistent behavior.
**Affected Pages:** /guest-proposals, /host-proposals

**Current Code:**
```javascript
// FILE 1: canCancelProposal.js (lines 27-47)
export function canCancelProposal({ proposalStatus, deleted = false }) {
  // Deleted proposals cannot be cancelled
  if (deleted) {
    return false
  }

  // Validation
  if (!proposalStatus || typeof proposalStatus !== 'string') {
    return false
  }

  const status = proposalStatus.trim()

  if (isTerminalStatus(status) || isCompletedStatus(status)) {
    return false
  }

  // Can cancel if in any active state
  return true
}

// FILE 2: proposalRules.js (lines 26-54)
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

  // ... more checks
  return true;
}
```

**Refactored Code:**
```javascript
// Keep ONLY the named parameter version in canCancelProposal.js
// Remove the duplicate from proposalRules.js and update imports

// canCancelProposal.js - CANONICAL version
import { isTerminalStatus, isCompletedStatus } from '../../constants/proposalStatuses.js'

export function canCancelProposal({ proposalStatus, deleted = false }) {
  if (deleted) {
    return false
  }

  if (!proposalStatus || typeof proposalStatus !== 'string') {
    return false
  }

  const status = proposalStatus.trim()

  if (isTerminalStatus(status) || isCompletedStatus(status)) {
    return false
  }

  return true
}

// proposalRules.js - Remove duplicate, add adapter if needed for legacy code
import { canCancelProposal as canCancelProposalCore } from './canCancelProposal.js'

// Adapter for code expecting proposal object
export function canCancelProposalFromObject(proposal) {
  if (!proposal) return false;
  const status = proposal.status || proposal.Status;
  const deleted = proposal.Deleted || proposal.deleted || false;
  return canCancelProposalCore({ proposalStatus: status, deleted });
}
```

**Testing:**
- [ ] Update all callers to use consistent signature
- [ ] Verify cancel button visibility on proposal cards
- [ ] Run proposal workflow tests

~~~~~

### CHUNK 3: Duplicate cancelProposalWorkflow implementations
**File:** app/src/logic/workflows/booking/cancelProposalWorkflow.js AND app/src/logic/workflows/proposals/cancelProposalWorkflow.js
**Line:** booking/cancelProposalWorkflow.js:1-143 AND proposals/cancelProposalWorkflow.js:1-176
**Issue:** Two completely separate implementations of cancel proposal workflow in different directories. The `booking/` version is more generic with a decision tree, while `proposals/` version has Bubble.io-specific workflow names. This creates confusion about which to use and violates DRY principle.
**Affected Pages:** /guest-proposals, /host-proposals

**Current Code:**
```javascript
// FILE 1: booking/cancelProposalWorkflow.js (lines 38-69)
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
  // ... decision tree logic
}

// FILE 2: proposals/cancelProposalWorkflow.js (lines 95-128)
export async function executeCancelProposal(proposalId, reason = null) {
  if (!proposalId) {
    throw new Error('Proposal ID is required');
  }

  const now = new Date().toISOString();

  const updateData = {
    'Status': PROPOSAL_STATUSES.CANCELLED_BY_GUEST.key,
    'Modified Date': now
  };
  // ... direct supabase call
}
```

**Refactored Code:**
```javascript
// CONSOLIDATE into single file: workflows/proposals/cancelProposalWorkflow.js
// Remove the duplicate at workflows/booking/cancelProposalWorkflow.js

/**
 * Cancel Proposal Workflow - Unified Implementation
 *
 * Combines the decision tree logic from booking/ with the Bubble.io
 * workflow tracking from proposals/
 */
import { supabase } from '../../../lib/supabase.js';
import { canCancelProposal } from '../../rules/proposals/canCancelProposal.js';
import { PROPOSAL_STATUSES } from '../../constants/proposalStatuses.js';

export function determineCancellationCondition(proposal) {
  // Keep the determineCancellationCondition from proposals/
  // ... existing logic
}

export async function cancelProposalWorkflow({
  proposalId,
  proposal,
  source = 'main',
  reason = null
}) {
  // Unified validation
  if (!proposalId && !proposal?.id) {
    throw new Error('cancelProposalWorkflow: proposalId or proposal.id is required');
  }

  const id = proposalId || proposal.id;
  const status = proposal?.status || proposal?.Status;
  const deleted = proposal?.deleted || proposal?.Deleted || false;

  // Use the canCancelProposal rule
  if (!canCancelProposal({ proposalStatus: status, deleted })) {
    return {
      success: false,
      message: 'This proposal cannot be cancelled',
      updated: false
    };
  }

  // Execute cancellation
  const { data, error } = await supabase
    .from('proposal')
    .update({
      'Status': PROPOSAL_STATUSES.CANCELLED_BY_GUEST.key,
      'reason for cancellation': reason,
      'Modified Date': new Date().toISOString()
    })
    .eq('_id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to cancel proposal: ${error.message}`);
  }

  return { success: true, message: 'Proposal cancelled', updated: true, data };
}

// Keep soft delete as separate function
export async function executeDeleteProposal(proposalId) {
  // ... existing implementation
}
```

**Testing:**
- [ ] Update all imports to use the unified workflow
- [ ] Test cancel from proposal card
- [ ] Test cancel from compare modal
- [ ] Verify Supabase updates correctly

~~~~~

## PAGE GROUP: /search, /favorites (Chunks: 4, 5)

### CHUNK 4: Magic string arrays in validation rules
**File:** app/src/logic/rules/search/isValidPriceTier.js
**Line:** 28
**Issue:** Hardcoded magic string array for valid price tiers. Should be extracted to a constant for reusability and consistency with other validation patterns.
**Affected Pages:** /search

**Current Code:**
```javascript
// isValidPriceTier.js (lines 20-31)
export function isValidPriceTier({ priceTier }) {
  // No Fallback: Validate input
  if (typeof priceTier !== 'string') {
    throw new Error(
      `isValidPriceTier: priceTier must be a string, got ${typeof priceTier}`
    )
  }

  const validTiers = ['under-200', '200-350', '350-500', '500-plus', 'all']

  return validTiers.includes(priceTier)
}
```

**Refactored Code:**
```javascript
// Extract to constants/searchConstants.js
export const VALID_PRICE_TIERS = ['under-200', '200-350', '350-500', '500-plus', 'all'];
export const VALID_WEEK_PATTERNS = ['every-week', 'one-on-off', 'two-on-off', 'one-three-off'];
export const VALID_SORT_OPTIONS = ['recommended', 'price-low', 'most-viewed', 'recent'];

// isValidPriceTier.js - use the constant
import { VALID_PRICE_TIERS } from '../../constants/searchConstants.js'

export function isValidPriceTier({ priceTier }) {
  if (typeof priceTier !== 'string') {
    throw new Error(
      `isValidPriceTier: priceTier must be a string, got ${typeof priceTier}`
    )
  }

  return VALID_PRICE_TIERS.includes(priceTier)
}
```

**Testing:**
- [ ] Create new constants/searchConstants.js file
- [ ] Update isValidPriceTier.js, isValidWeekPattern.js, isValidSortOption.js
- [ ] Verify search filters still work correctly

~~~~~

### CHUNK 5: Inconsistent DAY_NAMES constant duplication
**File:** app/src/logic/workflows/scheduling/validateScheduleWorkflow.js AND app/src/logic/workflows/scheduling/validateMoveInDateWorkflow.js
**Line:** validateScheduleWorkflow.js:99 AND validateMoveInDateWorkflow.js:105
**Issue:** `DAY_NAMES` array is duplicated in two workflow files. Should be extracted to a shared constant.
**Affected Pages:** /search, /view-split-lease

**Current Code:**
```javascript
// validateScheduleWorkflow.js (line 99)
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

// validateMoveInDateWorkflow.js (line 105)
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
```

**Refactored Code:**
```javascript
// Add to existing lib/dayUtils.js or create constants/schedulingConstants.js
export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// validateScheduleWorkflow.js
import { DAY_NAMES } from '../../constants/schedulingConstants.js'
// Remove local DAY_NAMES definition

// validateMoveInDateWorkflow.js
import { DAY_NAMES } from '../../constants/schedulingConstants.js'
// Remove local DAY_NAMES definition
```

**Testing:**
- [ ] Create constants/schedulingConstants.js or add to existing dayUtils.js
- [ ] Update both workflow files to import the shared constant
- [ ] Verify schedule validation still works on view-split-lease page

~~~~~

## PAGE GROUP: /guest-proposals (Chunks: 6, 7)

### CHUNK 6: useProposalButtonStates hook placed in rules/ instead of hooks/
**File:** app/src/logic/rules/proposals/useProposalButtonStates.js
**Line:** 1-147
**Issue:** React hook (`useMemo` dependency) placed in the `rules/` directory which should contain pure business logic only (no React dependencies). This violates the architecture principle stated in `logic/index.js`: "No React dependencies".
**Affected Pages:** /guest-proposals

**Current Code:**
```javascript
// rules/proposals/useProposalButtonStates.js (lines 1-11)
/**
 * useProposalButtonStates Hook
 *
 * Computes button visibility and styling for guest proposal cards.
 * Maps Bubble.io conditional logic to React state.
 */

import { useMemo } from 'react';
import { getStatusConfig, PROPOSAL_STATUS } from '../../../config/proposalStatusConfig.js';
```

**Refactored Code:**
```javascript
// Move to islands/shared/hooks/useProposalButtonStates.js
// OR create logic/hooks/ directory for logic-tier hooks

// Option A: Move to islands/shared/hooks/
// islands/shared/hooks/useProposalButtonStates.js
import { useMemo } from 'react';
import { getStatusConfig, PROPOSAL_STATUS } from '../../../config/proposalStatusConfig.js';

export function useProposalButtonStates({ proposal, virtualMeeting, guest, listing, currentUserId }) {
  return useMemo(() => {
    // ... existing implementation
  }, [proposal, virtualMeeting, guest, listing, currentUserId]);
}

// Update rules/index.js - remove the export
// - export { useProposalButtonStates } from './proposals/useProposalButtonStates.js'

// Update logic/index.js comment to clarify hooks are not part of Logic Core
```

**Testing:**
- [ ] Move file to appropriate location
- [ ] Update imports in GuestProposalsPage components
- [ ] Remove from rules/index.js exports
- [ ] Verify proposal buttons render correctly

~~~~~

### CHUNK 7: Fallback pattern in processUserData violates NO FALLBACK principle
**File:** app/src/logic/processors/user/processUserData.js
**Line:** 56-59
**Issue:** Uses a fallback `fullName = 'Guest User'` with console.warn instead of throwing an error, violating the "NO FALLBACK" principle stated in the architecture. The Logic Core should surface errors explicitly, not silently default.
**Affected Pages:** /guest-proposals, /account-profile

**Current Code:**
```javascript
// processUserData.js (lines 48-60)
  if (!fullName || typeof fullName !== 'string' || fullName.trim().length === 0) {
    if (firstName && lastName) {
      fullName = `${firstName} ${lastName}`
    } else if (firstName) {
      fullName = firstName
    } else if (lastName) {
      fullName = lastName
    } else {
      // Use a default for users without any name fields
      fullName = 'Guest User'
      console.warn(`processUserData: User ${rawUser._id} has no name fields, using default`)
    }
  }
```

**Refactored Code:**
```javascript
// processUserData.js - enforce NO FALLBACK
  if (!fullName || typeof fullName !== 'string' || fullName.trim().length === 0) {
    if (firstName && lastName) {
      fullName = `${firstName} ${lastName}`
    } else if (firstName) {
      fullName = firstName
    } else if (lastName) {
      fullName = lastName
    } else {
      // NO FALLBACK: Throw error - caller must handle missing name scenario
      throw new Error(
        `processUserData: User ${rawUser._id} has no name fields (Name - Full, Name - First, Name - Last all missing/empty)`
      )
    }
  }

// Callers should wrap in try-catch and handle the UI fallback at presentation layer:
// try {
//   const user = processUserData({ rawUser });
// } catch (err) {
//   // UI layer decides to show "Guest User" or error state
//   setDisplayName('Guest User');
// }
```

**Testing:**
- [ ] Update processUserData to throw error
- [ ] Update all callers to handle the error gracefully
- [ ] Verify user display on proposal cards doesn't break
- [ ] Add unit test for missing name scenario

~~~~~

## PAGE GROUP: AUTO (Shared/Multiple Pages) (Chunks: 8, 9, 10)

### CHUNK 8: proposalStatuses.js imports from lib/ instead of logic/constants/
**File:** app/src/logic/rules/proposals/proposalRules.js
**Line:** 16-17
**Issue:** Imports `PROPOSAL_STATUSES` from `../../../lib/constants/proposalStatuses.js` instead of from `../../constants/proposalStatuses.js`. The logic core has its own constants directory but this file reaches outside to lib/. This creates confusion about the canonical source of truth for proposal statuses.
**Affected Pages:** AUTO (all proposal-related pages)

**Current Code:**
```javascript
// proposalRules.js (lines 16-17)
import { PROPOSAL_STATUSES, isTerminalStatus, isCompletedStatus, getActionsForStatus } from '../../../lib/constants/proposalStatuses.js';
import { getGuestCancellationReasons } from '../../../lib/dataLookups.js';
```

**Refactored Code:**
```javascript
// Verify logic/constants/proposalStatuses.js is the canonical source
// Update proposalRules.js to import from the correct location

import {
  PROPOSAL_STATUSES,
  isTerminalStatus,
  isCompletedStatus,
  getActionsForStatus
} from '../../constants/proposalStatuses.js';

// Note: getGuestCancellationReasons should stay in lib/dataLookups.js
// as it involves external data fetching (not pure logic)
import { getGuestCancellationReasons } from '../../../lib/dataLookups.js';

// If lib/constants/proposalStatuses.js exists separately, consolidate:
// 1. Identify which is canonical (logic/constants/ should be)
// 2. Update lib/constants/ to re-export from logic/constants/ for backwards compatibility
// 3. Update all direct lib/constants/ imports to use logic/constants/
```

**Testing:**
- [ ] Verify logic/constants/proposalStatuses.js has all needed exports
- [ ] Update proposalRules.js import path
- [ ] Search for other files importing from lib/constants/proposalStatuses.js
- [ ] Update or create re-export if needed

~~~~~

### CHUNK 9: getTermsComparison duplicates getEffectiveTerms logic
**File:** app/src/logic/workflows/proposals/counterofferWorkflow.js AND app/src/logic/processors/proposals/processProposalData.js
**Line:** counterofferWorkflow.js:123-192 AND processProposalData.js:295-329
**Issue:** `getTermsComparison` in counterofferWorkflow.js and `getEffectiveTerms` in processProposalData.js both implement similar logic for extracting original vs counteroffer terms, but with different field mappings and return shapes. This creates inconsistency in how terms are compared across the application.
**Affected Pages:** AUTO (proposal comparison modals)

**Current Code:**
```javascript
// counterofferWorkflow.js getTermsComparison (lines 128-145)
export function getTermsComparison(proposal) {
  const originalTerms = {
    daysSelected: proposal.daysSelected || proposal['Days Selected'] || [],
    nightsPerWeek: proposal.nightsPerWeek || proposal['nights per week (num)'] || 0,
    reservationWeeks: proposal.reservationWeeks || proposal['Reservation Span (Weeks)'] || 0,
    // ... more fields with || fallbacks
  };

// processProposalData.js getEffectiveTerms (lines 301-314)
export function getEffectiveTerms(proposal) {
  if (proposal.counterOfferHappened) {
    return {
      daysSelected: proposal.hcDaysSelected || proposal.daysSelected,
      reservationWeeks: proposal.hcReservationWeeks || proposal.reservationWeeks,
      // ... uses || fallbacks
    };
  }
```

**Refactored Code:**
```javascript
// Create a single source of truth in processors/proposal/
// processors/proposal/extractProposalTerms.js

/**
 * Extract original terms from a proposal object
 * Handles both raw Supabase format and processed format
 */
export function extractOriginalTerms(proposal) {
  if (!proposal) {
    throw new Error('extractOriginalTerms: proposal is required');
  }

  return {
    daysSelected: proposal.daysSelected ?? proposal['Days Selected'] ?? [],
    nightsPerWeek: proposal.nightsPerWeek ?? proposal['nights per week (num)'] ?? 0,
    reservationWeeks: proposal.reservationWeeks ?? proposal['Reservation Span (Weeks)'] ?? 0,
    checkInDay: proposal.checkInDay ?? proposal['check in day'] ?? null,
    checkOutDay: proposal.checkOutDay ?? proposal['check out day'] ?? null,
    totalPrice: proposal.totalPrice ?? proposal['Total Price for Reservation (guest)'] ?? 0,
    nightlyPrice: proposal.nightlyPrice ?? proposal['proposal nightly price'] ?? 0,
    damageDeposit: proposal.damageDeposit ?? proposal['damage deposit'] ?? 0,
    cleaningFee: proposal.cleaningFee ?? proposal['cleaning fee'] ?? 0
  };
}

/**
 * Extract counteroffer terms from a proposal object
 */
export function extractCounteroffer Terms(proposal) {
  const original = extractOriginalTerms(proposal);

  return {
    daysSelected: proposal.hcDaysSelected ?? proposal['hc days selected'] ?? original.daysSelected,
    nightsPerWeek: proposal.hcNightsPerWeek ?? proposal['hc nights per week'] ?? original.nightsPerWeek,
    // ... etc with proper nullish coalescing
  };
}

/**
 * Get effective terms (counteroffer if exists, else original)
 */
export function getEffectiveTerms(proposal) {
  const hasCounteroffer = proposal.counterOfferHappened || proposal['counter offer happened'];
  return hasCounteroffer ? extractCounterofferTerms(proposal) : extractOriginalTerms(proposal);
}

/**
 * Compare terms and return list of changes
 */
export function compareTerms(proposal) {
  const original = extractOriginalTerms(proposal);
  const current = extractCounterofferTerms(proposal);

  const changes = Object.keys(original)
    .filter(key => JSON.stringify(original[key]) !== JSON.stringify(current[key]))
    .map(key => ({
      field: key,
      original: original[key],
      modified: current[key]
    }));

  return { original, current, changes, hasChanges: changes.length > 0 };
}
```

**Testing:**
- [ ] Create processors/proposal/extractProposalTerms.js
- [ ] Update counterofferWorkflow.js to use the new functions
- [ ] Update processProposalData.js to use the new functions
- [ ] Test Compare Terms modal shows correct changes

~~~~~

### CHUNK 10: validateTokenWorkflow duplicates processProfilePhotoUrl logic
**File:** app/src/logic/workflows/auth/validateTokenWorkflow.js
**Line:** 91-95
**Issue:** Duplicates the protocol-relative URL handling that already exists in `processProfilePhotoUrl`. Should reuse the existing processor instead of inline logic.
**Affected Pages:** AUTO (all authenticated pages)

**Current Code:**
```javascript
// validateTokenWorkflow.js (lines 91-95)
  // Handle protocol-relative URLs for profile photos
  let profilePhoto = userData['Profile Photo']
  if (profilePhoto && profilePhoto.startsWith('//')) {
    profilePhoto = 'https:' + profilePhoto
  }
```

**Refactored Code:**
```javascript
// validateTokenWorkflow.js - use the existing processor
import { processProfilePhotoUrl } from '../../processors/user/processProfilePhotoUrl.js'

// ... in the function
  // Handle profile photo URL normalization
  const profilePhoto = processProfilePhotoUrl({
    photoUrl: userData['Profile Photo']
  })

  // Return user data object
  return {
    userId: userData._id,
    firstName: userData['Name - First'] || null,
    fullName: userData['Name - Full'] || null,
    profilePhoto,
    userType: userType
  }
```

**Testing:**
- [ ] Import processProfilePhotoUrl in validateTokenWorkflow.js
- [ ] Replace inline URL handling with processor call
- [ ] Verify profile photos display correctly after login

~~~~~

## PAGE GROUP: /host-proposals (Chunks: 11)

### CHUNK 11: VM_STATES has legacy aliases that should be deprecated
**File:** app/src/logic/rules/proposals/virtualMeetingRules.js
**Line:** 34-37
**Issue:** VM_STATES contains "legacy aliases" (`REQUESTED_BY_GUEST`, `REQUESTED_BY_HOST`) that point to the new perspective-neutral names. These should be removed or properly deprecated with console warnings, as they create confusion about which constants to use.
**Affected Pages:** /host-proposals

**Current Code:**
```javascript
// virtualMeetingRules.js (lines 26-37)
export const VM_STATES = {
  NO_MEETING: 'no_meeting',
  REQUESTED_BY_ME: 'requested_by_me',           // Current user requested
  REQUESTED_BY_OTHER: 'requested_by_other',     // Other party requested
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
// Option A: Remove legacy aliases if no longer used
export const VM_STATES = {
  NO_MEETING: 'no_meeting',
  REQUESTED_BY_ME: 'requested_by_me',
  REQUESTED_BY_OTHER: 'requested_by_other',
  BOOKED_AWAITING_CONFIRMATION: 'booked_awaiting_confirmation',
  CONFIRMED: 'confirmed',
  DECLINED: 'declined',
  EXPIRED: 'expired'
};

// Option B: Add deprecation warnings if still used
const createDeprecatedAlias = (newName, newValue) => {
  console.warn(`VM_STATES.${newName} is deprecated. Use the perspective-neutral constant instead.`);
  return newValue;
};

export const VM_STATES = {
  NO_MEETING: 'no_meeting',
  REQUESTED_BY_ME: 'requested_by_me',
  REQUESTED_BY_OTHER: 'requested_by_other',
  BOOKED_AWAITING_CONFIRMATION: 'booked_awaiting_confirmation',
  CONFIRMED: 'confirmed',
  DECLINED: 'declined',
  EXPIRED: 'expired',
  // Deprecated - log warning on access
  get REQUESTED_BY_GUEST() {
    console.warn('VM_STATES.REQUESTED_BY_GUEST is deprecated. Use VM_STATES.REQUESTED_BY_ME');
    return 'requested_by_me';
  },
  get REQUESTED_BY_HOST() {
    console.warn('VM_STATES.REQUESTED_BY_HOST is deprecated. Use VM_STATES.REQUESTED_BY_OTHER');
    return 'requested_by_other';
  }
};
```

**Testing:**
- [ ] Search codebase for usage of REQUESTED_BY_GUEST and REQUESTED_BY_HOST
- [ ] If unused, remove the legacy aliases
- [ ] If used, add deprecation warnings and update callers
- [ ] Verify virtual meeting button states work correctly

~~~~~

## Summary

| Chunk | Issue Type | Severity | Files Affected |
|-------|-----------|----------|----------------|
| 1 | Duplication | HIGH | 2 files |
| 2 | Duplication | HIGH | 2 files |
| 3 | Duplication | HIGH | 2 files |
| 4 | Maintainability | LOW | 3 files |
| 5 | Duplication | LOW | 2 files |
| 6 | Architecture | MEDIUM | 1 file |
| 7 | Anti-pattern | MEDIUM | 1 file |
| 8 | Architecture | MEDIUM | 1 file |
| 9 | Duplication | MEDIUM | 2 files |
| 10 | Duplication | LOW | 1 file |
| 11 | Maintainability | LOW | 1 file |

### Priority Order for Refactoring:
1. **HIGH** - Chunks 1, 2, 3 (Duplications causing potential runtime bugs)
2. **MEDIUM** - Chunks 6, 7, 8, 9 (Architecture violations and anti-patterns)
3. **LOW** - Chunks 4, 5, 10, 11 (Minor maintainability improvements)

### Key Files Referenced:
- `app/src/logic/processors/proposal/processProposalData.js`
- `app/src/logic/processors/proposals/processProposalData.js`
- `app/src/logic/rules/proposals/canCancelProposal.js`
- `app/src/logic/rules/proposals/proposalRules.js`
- `app/src/logic/workflows/booking/cancelProposalWorkflow.js`
- `app/src/logic/workflows/proposals/cancelProposalWorkflow.js`
- `app/src/logic/rules/search/isValidPriceTier.js`
- `app/src/logic/workflows/scheduling/validateScheduleWorkflow.js`
- `app/src/logic/workflows/scheduling/validateMoveInDateWorkflow.js`
- `app/src/logic/rules/proposals/useProposalButtonStates.js`
- `app/src/logic/processors/user/processUserData.js`
- `app/src/logic/workflows/auth/validateTokenWorkflow.js`
- `app/src/logic/rules/proposals/virtualMeetingRules.js`
