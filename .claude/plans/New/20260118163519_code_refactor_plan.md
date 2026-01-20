# Code Refactoring Plan - app/src/logic/rules

Date: 2026-01-18
Audit Type: general

---

## Executive Summary

**Files Audited:** 24
**Issues Found:** 12
**Chunks:** 8

### Issue Categories
- **CRITICAL**: Duplicate function definitions with different signatures (1 issue)
- **HIGH**: Inconsistent API patterns across similar functions (3 issues)
- **MEDIUM**: Code duplication and magic strings (5 issues)
- **LOW**: Verbose null checks, minor optimizations (3 issues)

### Page Impact Summary
| Page Group | Files Affected | Chunks |
|------------|----------------|--------|
| /guest-proposals, /view-proposal | 5 | 1, 2, 3, 4 |
| /search | 3 | 5 |
| /host-dashboard, /host-proposals | 2 | 2, 3 |
| /account-profile | 2 | 6 |
| AUTO (shared utilities) | 4 | 7, 8 |

---

~~~~~

## PAGE GROUP: /guest-proposals, /view-proposal (Chunks: 1, 2, 3, 4)

### CHUNK 1: Remove duplicate canCancelProposal function
**File:** `app/src/logic/rules/proposals/proposalRules.js`
**Line:** 26-54
**Issue:** **CRITICAL** - `canCancelProposal` is defined in BOTH `proposalRules.js` (takes `proposal` object) AND `canCancelProposal.js` (takes `{ proposalStatus, deleted }` named params). This creates API confusion and potential bugs.
**Affected Pages:** /guest-proposals, /view-proposal, /host-proposals

**Current Code:**
```javascript
/**
 * Check if a proposal can be cancelled by the guest
 * Based on Bubble.io workflows crkec5, crswt2, crtCg2, curuC4, curuK4, curua4
 *
 * @param {Object} proposal - Proposal object
 * @returns {boolean} True if proposal can be cancelled
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
// DELETE this function entirely from proposalRules.js
// The canonical version is in canCancelProposal.js with named parameters
// Re-export from canCancelProposal.js to maintain backward compatibility:
export { canCancelProposal } from './canCancelProposal.js';
```

**Testing:**
- [ ] Search for all imports of `canCancelProposal` from `proposalRules.js`
- [ ] Update imports to use `canCancelProposal.js` directly
- [ ] Verify cancel button works on /guest-proposals page
- [ ] Run unit tests for proposal cancellation

~~~~~

### CHUNK 2: Standardize proposal rule function signatures
**Files:** `app/src/logic/rules/proposals/canAcceptProposal.js`, `app/src/logic/rules/proposals/canCancelProposal.js`, `app/src/logic/rules/proposals/canEditProposal.js`
**Line:** Multiple (function signatures)
**Issue:** **HIGH** - These 3 files use consistent `{ proposalStatus, deleted }` params, but `proposalRules.js` functions use `(proposal)` object. The inconsistency causes cognitive overhead when using these rules.
**Affected Pages:** /guest-proposals, /view-proposal, /host-proposals

**Current Code (proposalRules.js lines 63-72):**
```javascript
export function canModifyProposal(proposal) {
  if (!proposal) {
    return false;
  }

  const status = proposal.status || proposal.Status;

  // Can only modify if in initial submission stage
  return status === PROPOSAL_STATUSES.PROPOSAL_SUBMITTED_AWAITING_RENTAL_APP.key;
}
```

**Refactored Code:**
```javascript
/**
 * Check if a proposal can be modified/edited by the guest.
 * Only allowed in early stages before rental application submission.
 *
 * @param {object} params - Named parameters.
 * @param {string} params.proposalStatus - The "Proposal Status" field from Supabase.
 * @param {boolean} [params.deleted=false] - Whether proposal is soft-deleted.
 * @returns {boolean} True if proposal can be modified.
 */
export function canModifyProposal({ proposalStatus, deleted = false }) {
  if (deleted) {
    return false;
  }

  if (!proposalStatus || typeof proposalStatus !== 'string') {
    return false;
  }

  const status = proposalStatus.trim();
  return status === PROPOSAL_STATUSES.PROPOSAL_SUBMITTED_AWAITING_RENTAL_APP.key;
}
```

**Testing:**
- [ ] Update all call sites to pass named parameters
- [ ] Verify proposal edit button visibility on /guest-proposals
- [ ] Run unit tests for proposal modification

~~~~~

### CHUNK 3: Consolidate duplicate status extraction pattern
**File:** `app/src/logic/rules/proposals/proposalRules.js`
**Lines:** 31, 68, 85, 124, 141, 157, 179, 196, 213, 231, 247, 264, 281, 358
**Issue:** **MEDIUM** - The pattern `proposal.status || proposal.Status` is repeated 14+ times. Should extract to a utility function for DRY principle.
**Affected Pages:** /guest-proposals, /view-proposal, /host-proposals

**Current Code:**
```javascript
// Repeated 14+ times throughout the file:
const status = proposal.status || proposal.Status;
```

**Refactored Code:**
```javascript
// Add at top of file or in a shared utility:
/**
 * Extract status from proposal object, handling both casing conventions.
 * @param {Object} proposal - Proposal object
 * @returns {string|undefined} Status string or undefined
 */
function getProposalStatus(proposal) {
  if (!proposal) return undefined;
  return proposal.status || proposal.Status;
}

// Then replace all occurrences:
const status = getProposalStatus(proposal);
```

**Testing:**
- [ ] Create utility function in proposalRules.js (private)
- [ ] Replace all 14 occurrences
- [ ] Run all proposal-related tests

~~~~~

### CHUNK 4: Remove fallback cache in getCancellationReasonOptions
**File:** `app/src/logic/rules/proposals/proposalRules.js`
**Line:** 298-317
**Issue:** **MEDIUM** - The `getCancellationReasonOptions()` function has hardcoded fallback values which violates the "Building for Truth" principle. If cache is empty, the error should surface, not be masked.
**Affected Pages:** /guest-proposals (cancel modal)

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
 * Get available cancellation reason options for guests.
 * Fetches from cached reference data (initialized via dataLookups.js).
 *
 * @returns {Array<string>} Array of reason option strings.
 * @throws {Error} If cache is not initialized (caller should handle loading state).
 */
export function getCancellationReasonOptions() {
  const cachedReasons = getGuestCancellationReasons();

  if (cachedReasons.length === 0) {
    throw new Error('[getCancellationReasonOptions] Cache not initialized. Ensure dataLookups is loaded before calling.');
  }

  return cachedReasons.map(r => r.reason);
}
```

**Testing:**
- [ ] Update cancel modal to handle loading state when cache not ready
- [ ] Verify error surfaces properly in dev mode
- [ ] Test cancel flow on /guest-proposals

~~~~~

## PAGE GROUP: /search (Chunks: 5)

### CHUNK 5: Extract validation arrays to constants
**Files:** `app/src/logic/rules/search/isValidPriceTier.js`, `app/src/logic/rules/search/isValidSortOption.js`, `app/src/logic/rules/search/isValidWeekPattern.js`
**Lines:** 28 (each file)
**Issue:** **MEDIUM** - Magic strings for valid options are defined inline. These should be exported constants for reuse in UI components (e.g., dropdown options).
**Affected Pages:** /search

**Current Code (isValidPriceTier.js):**
```javascript
export function isValidPriceTier({ priceTier }) {
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
/**
 * Valid price tier filter options.
 * Export for reuse in UI dropdown components.
 */
export const VALID_PRICE_TIERS = ['under-200', '200-350', '350-500', '500-plus', 'all'];

/**
 * Check if price tier filter value is valid.
 *
 * @param {object} params - Named parameters.
 * @param {string} params.priceTier - Price tier value to validate.
 * @returns {boolean} True if valid price tier.
 *
 * @throws {Error} If priceTier is not a string.
 */
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
- [ ] Apply same pattern to isValidSortOption.js and isValidWeekPattern.js
- [ ] Update any UI components to import constants instead of duplicating
- [ ] Verify search filters work on /search page

~~~~~

## PAGE GROUP: /account-profile (Chunks: 6)

### CHUNK 6: Consolidate isHost/isGuest duplicate logic
**Files:** `app/src/logic/rules/users/isHost.js`, `app/src/logic/rules/users/isGuest.js`
**Lines:** 31-34 in both files
**Issue:** **MEDIUM** - Both files have identical logic for handling "Split Lease" internal users. Should extract to shared utility.
**Affected Pages:** /account-profile, /host-dashboard, /search

**Current Code (isGuest.js lines 31-34):**
```javascript
  // Split Lease internal users have both Host and Guest privileges
  if (type === 'Split Lease') {
    return true
  }
```

**Refactored Code:**
```javascript
// Create new file: app/src/logic/rules/users/userTypeUtils.js

/**
 * Internal user type that has both Host and Guest privileges.
 */
export const INTERNAL_USER_TYPE = 'Split Lease';

/**
 * Check if user type is an internal Split Lease user.
 * @param {string} userType - Normalized user type string.
 * @returns {boolean} True if internal user.
 */
export function isInternalUser(userType) {
  return userType === INTERNAL_USER_TYPE;
}

// Then in isGuest.js and isHost.js:
import { isInternalUser } from './userTypeUtils.js';

export function isGuest({ userType }) {
  if (!userType || typeof userType !== 'string') {
    return false;
  }

  const type = userType.trim();

  // Internal users have both Host and Guest privileges
  if (isInternalUser(type)) {
    return true;
  }

  return type.includes('Guest');
}
```

**Testing:**
- [ ] Create userTypeUtils.js with shared logic
- [ ] Update isHost.js and isGuest.js to use shared utility
- [ ] Verify user role detection on /account-profile

~~~~~

## PAGE GROUP: AUTO (Shared Utilities) (Chunks: 7, 8)

### CHUNK 7: Simplify verbose null checks in hasProfilePhoto
**File:** `app/src/logic/rules/users/hasProfilePhoto.js`
**Line:** 19-31
**Issue:** **LOW** - Overly verbose null/undefined checks can be simplified while maintaining clarity.
**Affected Pages:** AUTO (used in profile displays across app)

**Current Code:**
```javascript
export function hasProfilePhoto({ photoUrl }) {
  // NO FALLBACK: Explicit check without defaulting
  if (photoUrl === null || photoUrl === undefined) {
    return false;
  }

  // Check if photoUrl is a non-empty string
  if (typeof photoUrl !== 'string') {
    return false;
  }

  // Empty string is considered "no photo"
  return photoUrl.trim().length > 0;
}
```

**Refactored Code:**
```javascript
export function hasProfilePhoto({ photoUrl }) {
  // Falsy values (null, undefined, '') mean no photo
  if (!photoUrl || typeof photoUrl !== 'string') {
    return false;
  }

  return photoUrl.trim().length > 0;
}
```

**Testing:**
- [ ] Verify behavior is identical for all edge cases
- [ ] Check profile photo display in header/account page

~~~~~

### CHUNK 8: Add JSDoc return type refinement for virtualMeetingRules
**File:** `app/src/logic/rules/proposals/virtualMeetingRules.js`
**Lines:** 26-37 (VM_STATES)
**Issue:** **LOW** - `VM_STATES` has legacy aliases that should be marked deprecated to guide developers toward the correct enum values.
**Affected Pages:** /guest-proposals, /host-proposals (virtual meeting section)

**Current Code:**
```javascript
export const VM_STATES = {
  NO_MEETING: 'no_meeting',
  REQUESTED_BY_ME: 'requested_by_me',           // Current user requested
  REQUESTED_BY_OTHER: 'requested_by_other',     // Other party requested
  BOOKED_AWAITING_CONFIRMATION: 'booked_awaiting_confirmation',
  CONFIRMED: 'confirmed',
  DECLINED: 'declined',
  EXPIRED: 'expired',                           // All suggested dates passed without booking
  // Legacy aliases (for backward compatibility - will be removed in future)
  REQUESTED_BY_GUEST: 'requested_by_me',        // Alias → REQUESTED_BY_ME
  REQUESTED_BY_HOST: 'requested_by_other'       // Alias → REQUESTED_BY_OTHER
};
```

**Refactored Code:**
```javascript
/**
 * Virtual Meeting State Enum
 *
 * IMPORTANT: State names are PERSPECTIVE-NEUTRAL
 * - REQUESTED_BY_ME: Current user requested, waiting for other party's response
 * - REQUESTED_BY_OTHER: Other party requested, current user should respond
 */
export const VM_STATES = {
  NO_MEETING: 'no_meeting',
  REQUESTED_BY_ME: 'requested_by_me',
  REQUESTED_BY_OTHER: 'requested_by_other',
  BOOKED_AWAITING_CONFIRMATION: 'booked_awaiting_confirmation',
  CONFIRMED: 'confirmed',
  DECLINED: 'declined',
  EXPIRED: 'expired',
};

/**
 * @deprecated Use VM_STATES.REQUESTED_BY_ME instead
 */
export const VM_STATES_LEGACY = {
  REQUESTED_BY_GUEST: VM_STATES.REQUESTED_BY_ME,
  REQUESTED_BY_HOST: VM_STATES.REQUESTED_BY_OTHER,
};
```

**Testing:**
- [ ] Search for usages of REQUESTED_BY_GUEST and REQUESTED_BY_HOST
- [ ] Migrate any usages to REQUESTED_BY_ME / REQUESTED_BY_OTHER
- [ ] Add console.warn in legacy getters during transition period

~~~~~

---

## Chunk Summary

| Chunk | Files | Rationale | Approach |
|-------|-------|-----------|----------|
| 1 | `app/src/logic/rules/proposals/proposalRules.js` | Critical duplicate function causing API confusion | Remove duplicate, re-export from canonical source |
| 2 | `app/src/logic/rules/proposals/proposalRules.js` | Inconsistent API signatures vs standalone rule files | Migrate to named parameter pattern |
| 3 | `app/src/logic/rules/proposals/proposalRules.js` | DRY violation - status extraction repeated 14x | Extract private utility function |
| 4 | `app/src/logic/rules/proposals/proposalRules.js` | Fallback mechanism violates "Building for Truth" | Remove fallback, surface error properly |
| 5 | `app/src/logic/rules/search/isValidPriceTier.js`, `app/src/logic/rules/search/isValidSortOption.js`, `app/src/logic/rules/search/isValidWeekPattern.js` | Magic strings should be exported constants | Export arrays as named constants |
| 6 | `app/src/logic/rules/users/isHost.js`, `app/src/logic/rules/users/isGuest.js` | Duplicate logic for internal users | Extract to shared userTypeUtils.js |
| 7 | `app/src/logic/rules/users/hasProfilePhoto.js` | Verbose null checks | Simplify while maintaining behavior |
| 8 | `app/src/logic/rules/proposals/virtualMeetingRules.js` | Legacy aliases should be deprecated properly | Split into main enum and deprecated aliases |

---

## File References

### Files to Modify
- `app/src/logic/rules/proposals/proposalRules.js` (Chunks 1, 2, 3, 4)
- `app/src/logic/rules/search/isValidPriceTier.js` (Chunk 5)
- `app/src/logic/rules/search/isValidSortOption.js` (Chunk 5)
- `app/src/logic/rules/search/isValidWeekPattern.js` (Chunk 5)
- `app/src/logic/rules/users/isHost.js` (Chunk 6)
- `app/src/logic/rules/users/isGuest.js` (Chunk 6)
- `app/src/logic/rules/users/hasProfilePhoto.js` (Chunk 7)
- `app/src/logic/rules/proposals/virtualMeetingRules.js` (Chunk 8)

### Files to Create
- `app/src/logic/rules/users/userTypeUtils.js` (Chunk 6)

### Files with Good Code (No Changes Needed)
- `app/src/logic/rules/auth/isSessionValid.js` - Clean, focused, proper validation
- `app/src/logic/rules/auth/isProtectedPage.js` - Well-documented, correct logic
- `app/src/logic/rules/pricing/isValidDayCountForPricing.js` - Simple, correct
- `app/src/logic/rules/scheduling/isDateBlocked.js` - Proper validation, handles edge cases
- `app/src/logic/rules/scheduling/isDateInRange.js` - Thorough, well-documented
- `app/src/logic/rules/scheduling/isScheduleContiguous.js` - Complex but correct wrap-around logic
- `app/src/logic/rules/proposals/canAcceptProposal.js` - Follows named param pattern correctly
- `app/src/logic/rules/proposals/canCancelProposal.js` - Follows named param pattern correctly
- `app/src/logic/rules/proposals/canEditProposal.js` - Follows named param pattern correctly
- `app/src/logic/rules/proposals/determineProposalStage.js` - Clean, uses constants properly
- `app/src/logic/rules/proposals/useProposalButtonStates.js` - Complex but necessary hook
- `app/src/logic/rules/reminders/reminderScheduling.js` - Well-structured predicates
- `app/src/logic/rules/reminders/reminderValidation.js` - Clean validation rules
- `app/src/logic/rules/reviews/reviewValidation.js` - Simple, correct
- `app/src/logic/rules/users/shouldShowFullName.js` - Proper validation
- `app/src/logic/rules/search/hasListingPhotos.js` - Handles JSON string edge case

---

## Implementation Priority

1. **Chunk 1** - CRITICAL: Fix duplicate function before other work
2. **Chunk 2** - HIGH: Standardize signatures after removing duplicate
3. **Chunk 3** - MEDIUM: DRY improvement, easy win
4. **Chunk 5** - MEDIUM: Export constants for UI reuse
5. **Chunk 6** - MEDIUM: Consolidate user type logic
6. **Chunk 4** - MEDIUM: Remove fallback (may need UI updates)
7. **Chunk 7** - LOW: Minor optimization
8. **Chunk 8** - LOW: Deprecation cleanup
