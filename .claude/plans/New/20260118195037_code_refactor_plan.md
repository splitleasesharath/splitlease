# Code Refactoring Plan - app/src/logic

Date: 2026-01-18
Audit Type: general
Files Analyzed: 68
Dependency Analysis: 4% edge reduction potential

---

## Executive Summary

This audit identified **8 major issues** across the `app/src/logic` directory:

1. **CRITICAL: Duplicate `processProposalData` functions** (2 different implementations)
2. **CRITICAL: Duplicate `cancelProposalWorkflow` functions** (2 different implementations)
3. **HIGH: Duplicate contiguity checking logic** (`isScheduleContiguous.js` vs `isContiguousSelection.js`)
4. **HIGH: Duplicate user data processing** (`processUserData` in two locations)
5. **MEDIUM: Inconsistent parameter patterns** (named params vs positional)
6. **MEDIUM: Hardcoded validation values** (price tiers, sort options, etc.)
7. **LOW: Unused timezone parameter** in `calculateNextSendTime.js`
8. **LOW: Redundant Split Lease user type checks** in `isGuest.js` and `isHost.js`

---

## PAGE GROUP: /guest-proposals, /proposals (Chunks: 1, 2, 4, 5)

### CHUNK 1: Consolidate duplicate processProposalData implementations
**Files:** `processors/proposal/processProposalData.js`, `processors/proposals/processProposalData.js`
**Line:** N/A (entire files)
**Issue:** Two completely different `processProposalData` functions exist with different signatures and behaviors. The `proposal/` version uses named parameters and focuses on status-based term merging, while `proposals/` uses a single raw object and includes nested processing.
**Affected Pages:** /guest-proposals, /proposals, /view-proposal

**Current Code (proposal/processProposalData.js signature):**
```javascript
export function processProposalData({ rawProposal, listing = null, guest = null, host = null }) {
  // Uses named params, expects enriched data to be passed in
  // Merges original and hc (host-changed) terms based on status
  // Returns { id, listingId, guestId, status, currentTerms, originalTerms, ... }
}
```

**Current Code (proposals/processProposalData.js signature):**
```javascript
export function processProposalData(rawProposal) {
  // Uses single positional param
  // Processes nested listing, host, virtualMeeting internally
  // Returns { id, _id, status, listing, host, virtualMeeting, houseRules, ... }
}
```

**Refactored Code:**
```javascript
// Keep ONLY processors/proposal/processProposalData.js
// Rename to be the canonical version with optional nested processing

/**
 * Process raw proposal data from Supabase into a clean, validated proposal object.
 *
 * @param {object} params - Named parameters.
 * @param {object} params.rawProposal - Raw proposal object from Supabase.
 * @param {object} [params.listing] - Pre-processed listing data (if already loaded).
 * @param {object} [params.guest] - Pre-processed guest user data (if already loaded).
 * @param {object} [params.host] - Pre-processed host user data (if already loaded).
 * @param {boolean} [params.processNested=false] - Whether to process nested objects inline.
 * @returns {object} Clean, validated proposal object with merged terms.
 */
export function processProposalData({
  rawProposal,
  listing = null,
  guest = null,
  host = null,
  processNested = false
}) {
  // No Fallback: Proposal data must exist
  if (!rawProposal) {
    throw new Error('processProposalData: rawProposal cannot be null or undefined')
  }

  // Validate critical ID field
  if (!rawProposal._id) {
    throw new Error('processProposalData: Proposal missing critical _id field')
  }

  // If processNested is true and nested data exists, process it
  let processedListing = listing;
  let processedGuest = guest;
  let processedHost = host;

  if (processNested) {
    if (!listing && rawProposal.listing) {
      processedListing = processListingDataInline(rawProposal.listing);
    }
    if (!host && rawProposal.listing?.host) {
      processedHost = processHostDataInline(rawProposal.listing.host);
    }
  }

  // ... rest of implementation merging both approaches
}
```

**Testing:**
- [ ] Search codebase for all imports of both files
- [ ] Update imports to use canonical `processors/proposal/processProposalData.js`
- [ ] Delete `processors/proposals/processProposalData.js`
- [ ] Run full test suite for proposal-related pages
- [ ] Verify /guest-proposals page loads correctly
- [ ] Verify proposal detail modals display correct data

~~~~~

### CHUNK 2: Consolidate duplicate cancelProposalWorkflow implementations
**Files:** `workflows/booking/cancelProposalWorkflow.js`, `workflows/proposals/cancelProposalWorkflow.js`
**Line:** N/A (entire files)
**Issue:** Two completely different cancel workflow implementations. The `booking/` version uses dependency injection for rules, while `proposals/` imports rules directly and includes additional functions like `determineCancellationCondition`, `executeCancelProposal`, `cancelProposalFromCompareTerms`, and `executeDeleteProposal`.
**Affected Pages:** /guest-proposals, /proposals, GuestEditingProposalModal, ExpandableProposalCard, ProposalCard

**Current Code (booking/cancelProposalWorkflow.js):**
```javascript
export async function cancelProposalWorkflow({
  supabase,
  proposal,
  source = 'main',
  canCancelProposal  // Injected dependency
}) {
  // Uses injected rule function
  // Implements 7-variation decision tree based on source and usualOrder
  // Returns { success, message, updated, requiresPhoneCall? }
}
```

**Current Code (proposals/cancelProposalWorkflow.js):**
```javascript
import { supabase } from '../../../lib/supabase.js';
import { canCancelProposal, requiresSpecialCancellationConfirmation } from '../../rules/proposals/proposalRules.js';

export function determineCancellationCondition(proposal) { ... }
export async function executeCancelProposal(proposalId, reason = null) { ... }
export async function cancelProposalFromCompareTerms(proposalId, reason) { ... }
export async function executeDeleteProposal(proposalId) { ... }
```

**Refactored Code:**
```javascript
// Consolidate into workflows/proposals/cancelProposalWorkflow.js
// Combine the decision tree logic with the execution functions

import { PROPOSAL_STATUSES } from '../../constants/proposalStatuses.js';

/**
 * Evaluate which cancellation workflow condition applies.
 */
export function determineCancellationCondition({ proposal, canCancelFn }) {
  if (!proposal) {
    return { condition: 'invalid', allowCancel: false, message: 'Invalid proposal data' };
  }
  // ... merged decision logic
}

/**
 * Cancel Proposal Workflow - Main orchestrator.
 * Implements the 7-variation decision tree.
 *
 * @param {object} params.supabase - Supabase client (injected for testability)
 * @param {object} params.proposal - Processed proposal object
 * @param {string} params.source - 'main' | 'compare-modal' | 'other'
 * @param {function} [params.canCancelProposal] - Optional injected rule (uses default if not provided)
 */
export async function cancelProposalWorkflow({
  supabase,
  proposal,
  source = 'main',
  canCancelProposal: injectedCanCancel = null
}) {
  // Use injected function or import default
  const canCancelFn = injectedCanCancel || defaultCanCancelProposal;
  // ... merged implementation
}

// Keep these as exported utilities for direct use
export async function executeCancelProposal(supabase, proposalId, reason = null) { ... }
export async function executeDeleteProposal(supabase, proposalId) { ... }
```

**Testing:**
- [ ] Update imports in GuestEditingProposalModal.jsx
- [ ] Update imports in ExpandableProposalCard.jsx
- [ ] Update imports in ProposalCard.jsx
- [ ] Delete workflows/booking/cancelProposalWorkflow.js
- [ ] Test cancel from main proposals page
- [ ] Test cancel from Compare Terms modal
- [ ] Test delete (soft-delete) functionality

~~~~~

### CHUNK 4: Standardize proposal rules export pattern
**Files:** `rules/proposals/proposalRules.js`, `rules/proposals/proposalButtonRules.js`
**Line:** proposalRules.js (entire file), proposalButtonRules.js (entire file)
**Issue:** Both files export proposal-related rules but with different patterns. `proposalRules.js` exports individual functions while `proposalButtonRules.js` exports a single `computeProposalButtonStates` that consolidates button visibility logic. The separation is logical but imports are inconsistent.
**Affected Pages:** /guest-proposals, /proposals, /host-proposals

**Current Code (proposalRules.js exports):**
```javascript
export function canCancelProposal({ proposalStatus, deleted }) { ... }
export function hasReviewableCounteroffer({ proposalStatus }) { ... }
export function isInActiveNegotiation({ proposalStatus }) { ... }
export function requiresSpecialCancellationConfirmation(proposal) { ... }
export function canConfirmSuggestedProposal(proposal) { ... }
export function getNextStatusAfterConfirmation(proposal) { ... }
```

**Current Code (proposalButtonRules.js):**
```javascript
export function computeProposalButtonStates({ proposal, userType, currentUserId }) {
  return {
    showCompareTerms: ...,
    showCancel: ...,
    showDelete: ...,
    showMessage: ...,
    ...
  };
}
```

**Refactored Code:**
```javascript
// proposalRules.js - Add index re-export at bottom
export { computeProposalButtonStates } from './proposalButtonRules.js';

// This allows consumers to import from one place:
// import { canCancelProposal, computeProposalButtonStates } from '../logic/rules/proposals/proposalRules.js';
```

**Testing:**
- [ ] Add re-export to proposalRules.js
- [ ] Verify existing imports still work
- [ ] Update any direct imports of proposalButtonRules to use proposalRules

~~~~~

### CHUNK 5: Remove duplicate useProposalButtonStates hook file
**Files:** `rules/proposals/useProposalButtonStates.js`, `hooks/useProposalButtonStates.js`
**Line:** rules/proposals/useProposalButtonStates.js (entire file)
**Issue:** A React hook file exists inside the rules directory which violates the four-layer architecture. Hooks should only exist in the `hooks/` directory. The file in `rules/` appears to be an older version or duplicate.
**Affected Pages:** /guest-proposals

**Current Code (rules/proposals/useProposalButtonStates.js):**
```javascript
// This file exists but should NOT be here - hooks don't belong in rules/
import { useState, useMemo } from 'react';
// ... hook implementation
```

**Current Code (hooks/useProposalButtonStates.js):**
```javascript
import { computeProposalButtonStates } from '../logic/rules/proposals/proposalButtonRules.js';
// Correct location for hook
```

**Refactored Code:**
```javascript
// DELETE rules/proposals/useProposalButtonStates.js entirely
// Keep ONLY hooks/useProposalButtonStates.js
```

**Testing:**
- [ ] Search for imports of `rules/proposals/useProposalButtonStates`
- [ ] Update any found imports to use `hooks/useProposalButtonStates`
- [ ] Delete `rules/proposals/useProposalButtonStates.js`
- [ ] Verify /guest-proposals page works correctly

~~~~~

## PAGE GROUP: /search, /favorite-listings (Chunks: 3)

### CHUNK 3: Consolidate duplicate contiguity checking logic
**Files:** `rules/scheduling/isScheduleContiguous.js`, `calculators/scheduling/isContiguousSelection.js`
**Line:** Both entire files
**Issue:** Two implementations of contiguous day selection checking. `isScheduleContiguous` is the newer, well-documented version using named params. `isContiguousSelection` appears to be an older version that should be deprecated.
**Affected Pages:** /search, /view-split-lease (ScheduleSelector component)

**Current Code (isScheduleContiguous.js):**
```javascript
/**
 * Check if selected days form a contiguous (consecutive) block.
 * Handles week wrap-around cases (Fri-Sun, Sat-Tue).
 */
export function isScheduleContiguous({ selectedDayIndices }) {
  // Named params pattern
  // Comprehensive week wrap-around logic using inverse checking
  // Throws on invalid input
}
```

**Current Code (isContiguousSelection.js):**
```javascript
// Likely older implementation - need to verify usage
export function isContiguousSelection(selectedDays) {
  // Positional param pattern
  // May have different wrap-around logic
}
```

**Refactored Code:**
```javascript
// Keep ONLY rules/scheduling/isScheduleContiguous.js as the canonical version
// Delete calculators/scheduling/isContiguousSelection.js

// If isContiguousSelection has unique logic, merge it into isScheduleContiguous
// Add deprecation re-export if needed for gradual migration:

// In calculators/scheduling/isContiguousSelection.js (temporary):
/**
 * @deprecated Use isScheduleContiguous from rules/scheduling instead
 */
export function isContiguousSelection(selectedDays) {
  console.warn('isContiguousSelection is deprecated, use isScheduleContiguous');
  return isScheduleContiguous({ selectedDayIndices: selectedDays });
}
```

**Testing:**
- [ ] Search for imports of `isContiguousSelection`
- [ ] Update to use `isScheduleContiguous` with named params
- [ ] Verify ScheduleSelector component works
- [ ] Test week wrap-around cases (Fri-Sun, Sat-Tue)
- [ ] Delete `isContiguousSelection.js` after migration

~~~~~

## PAGE GROUP: /account-profile, /host-dashboard (Chunks: 6)

### CHUNK 6: Consolidate duplicate user data processing
**Files:** `processors/user/processUserData.js`, `processors/proposals/processProposalData.js` (processUserData function)
**Line:** processUserData.js (entire file), processProposalData.js:18-39
**Issue:** The `processors/proposals/processProposalData.js` file contains a `processUserData` function that duplicates the standalone `processors/user/processUserData.js`. They have slightly different return shapes.
**Affected Pages:** /account-profile, /guest-proposals, /host-proposals

**Current Code (user/processUserData.js):**
```javascript
export function processUserData({ rawUser, requireVerification = false }) {
  // Named params
  // Returns: { id, fullName, firstName, profilePhoto, bio, email, phone, isVerified, ... }
}
```

**Current Code (proposals/processProposalData.js - embedded):**
```javascript
export function processUserData(rawUser) {
  // Positional param
  // Returns: { id, firstName, lastName, fullName, profilePhoto, bio, linkedInVerified, ... }
}
```

**Refactored Code:**
```javascript
// In processors/proposals/processProposalData.js:
// Remove the embedded processUserData function
// Import from the canonical location instead

import { processUserData as processUserDataCanonical } from '../user/processUserData.js';

// If the proposals version needs different fields, create a wrapper:
function processUserDataForProposal(rawUser) {
  const base = processUserDataCanonical({ rawUser });
  return {
    ...base,
    // Add any proposal-specific fields
    proposalsList: rawUser['Proposals List'] || []
  };
}
```

**Testing:**
- [ ] Compare return shapes of both implementations
- [ ] Update proposals/processProposalData.js to import canonical version
- [ ] Create adapter if field differences exist
- [ ] Test user display on /account-profile
- [ ] Test host/guest info display on proposal pages

~~~~~

## PAGE GROUP: /search (Chunks: 7)

### CHUNK 7: Extract hardcoded validation values to constants
**Files:** `rules/search/isValidPriceTier.js`, `rules/search/isValidSortOption.js`, `rules/search/isValidWeekPattern.js`
**Line:** isValidPriceTier.js:28, isValidSortOption.js:28, isValidWeekPattern.js:28
**Issue:** Validation values are hardcoded inline. Should be extracted to constants for maintainability and reuse (e.g., for populating dropdowns).
**Affected Pages:** /search

**Current Code (isValidPriceTier.js):**
```javascript
export function isValidPriceTier({ priceTier }) {
  if (typeof priceTier !== 'string') {
    throw new Error(`isValidPriceTier: priceTier must be a string, got ${typeof priceTier}`)
  }

  const validTiers = ['under-200', '200-350', '350-500', '500-plus', 'all']  // Hardcoded

  return validTiers.includes(priceTier)
}
```

**Refactored Code:**
```javascript
// Create constants/searchConstants.js
export const PRICE_TIERS = Object.freeze({
  UNDER_200: 'under-200',
  TIER_200_350: '200-350',
  TIER_350_500: '350-500',
  OVER_500: '500-plus',
  ALL: 'all'
});

export const VALID_PRICE_TIERS = Object.freeze(Object.values(PRICE_TIERS));

export const SORT_OPTIONS = Object.freeze({
  RECOMMENDED: 'recommended',
  PRICE_LOW: 'price-low',
  MOST_VIEWED: 'most-viewed',
  RECENT: 'recent'
});

export const VALID_SORT_OPTIONS = Object.freeze(Object.values(SORT_OPTIONS));

export const WEEK_PATTERNS = Object.freeze({
  EVERY_WEEK: 'every-week',
  ONE_ON_OFF: 'one-on-off',
  TWO_ON_OFF: 'two-on-off',
  ONE_THREE_OFF: 'one-three-off'
});

export const VALID_WEEK_PATTERNS = Object.freeze(Object.values(WEEK_PATTERNS));

// Update isValidPriceTier.js
import { VALID_PRICE_TIERS } from '../../constants/searchConstants.js';

export function isValidPriceTier({ priceTier }) {
  if (typeof priceTier !== 'string') {
    throw new Error(`isValidPriceTier: priceTier must be a string, got ${typeof priceTier}`)
  }
  return VALID_PRICE_TIERS.includes(priceTier)
}
```

**Testing:**
- [ ] Create constants/searchConstants.js with all values
- [ ] Update isValidPriceTier.js to use constants
- [ ] Update isValidSortOption.js to use constants
- [ ] Update isValidWeekPattern.js to use constants
- [ ] Update search page filter dropdowns to use constants (if applicable)
- [ ] Verify search filters work correctly

~~~~~

## PAGE GROUP: /house-manual (Chunks: 8)

### CHUNK 8: Remove unused timezone parameter
**Files:** `calculators/reminders/calculateNextSendTime.js`
**Line:** 19
**Issue:** The `timezone` parameter is accepted but never used. Either implement timezone conversion or remove the unused parameter.
**Affected Pages:** /house-manual (ReminderHouseManual component)

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

  return date;  // timezone parameter is NEVER USED
}
```

**Refactored Code:**
```javascript
/**
 * Calculate the next send time for a reminder.
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

// If timezone conversion IS needed in the future, use a separate function:
// export function formatScheduledTimeForDisplay({ scheduledDateTime, timezone = 'America/New_York' })
```

**Testing:**
- [ ] Remove unused timezone parameter
- [ ] Update JSDoc to remove timezone reference
- [ ] Search for any callers passing timezone (update if found)
- [ ] Test reminder scheduling functionality

~~~~~

## Summary of Changes by Impact Level

### CRITICAL (Must Fix)
| Chunk | Description | Files Affected |
|-------|-------------|----------------|
| 1 | Duplicate processProposalData | 2 files |
| 2 | Duplicate cancelProposalWorkflow | 2 files |

### HIGH (Should Fix)
| Chunk | Description | Files Affected |
|-------|-------------|----------------|
| 3 | Duplicate isContiguousSelection | 2 files |
| 6 | Duplicate processUserData | 2 files |

### MEDIUM (Nice to Fix)
| Chunk | Description | Files Affected |
|-------|-------------|----------------|
| 4 | Proposal rules export pattern | 2 files |
| 5 | Hook in wrong directory | 1 file |
| 7 | Hardcoded search constants | 3 files + 1 new |

### LOW (Optional)
| Chunk | Description | Files Affected |
|-------|-------------|----------------|
| 8 | Unused parameter | 1 file |

---

## Execution Order (Recommended)

1. **Chunk 5** - Delete misplaced hook file (quick win, no risk)
2. **Chunk 8** - Remove unused parameter (quick win)
3. **Chunk 7** - Extract search constants (foundational for other changes)
4. **Chunk 3** - Consolidate contiguity logic (affects scheduling)
5. **Chunk 6** - Consolidate user processing (affects multiple pages)
6. **Chunk 1** - Consolidate processProposalData (CRITICAL - affects proposals)
7. **Chunk 2** - Consolidate cancelProposalWorkflow (CRITICAL - affects proposals)
8. **Chunk 4** - Standardize exports (cleanup)

---

## Referenced Files

### Constants
- `constants/proposalStatuses.js` (21 dependents - DO NOT MODIFY)
- `constants/proposalStages.js`
- `constants/pricingConstants.js`
- `constants/reviewCategories.js`

### Calculators
- `calculators/pricing/calculateFourWeekRent.js`
- `calculators/pricing/calculatePricingBreakdown.js`
- `calculators/pricing/calculateReservationTotal.js`
- `calculators/pricing/getNightlyRateByFrequency.js`
- `calculators/pricing/calculateGuestFacingPrice.js`
- `calculators/scheduling/calculateCheckInOutDays.js`
- `calculators/scheduling/calculateCheckInOutFromDays.js`
- `calculators/scheduling/calculateNightsFromDays.js`
- `calculators/scheduling/calculateNextAvailableCheckIn.js`
- `calculators/scheduling/shiftMoveInDateIfPast.js`
- `calculators/scheduling/getNextOccurrenceOfDay.js`
- `calculators/scheduling/isContiguousSelection.js` (TO BE DELETED)
- `calculators/reminders/calculateNextSendTime.js`
- `calculators/reviews/calculateReviewScore.js`
- `calculators/reviews/calculateFormCompletion.js`

### Processors
- `processors/proposal/processProposalData.js` (CANONICAL)
- `processors/proposals/processProposalData.js` (TO BE DELETED)
- `processors/user/processUserData.js` (CANONICAL)
- `processors/user/processProfilePhotoUrl.js`
- `processors/user/processUserDisplayName.js`
- `processors/user/processUserInitials.js`
- `processors/listing/extractListingCoordinates.js`
- `processors/listing/parseJsonArrayField.js`
- `processors/display/formatHostName.js`
- `processors/reminders/reminderAdapter.js`
- `processors/reminders/reminderFormatter.js`
- `processors/reviews/reviewAdapter.js`

### Rules
- `rules/proposals/proposalRules.js`
- `rules/proposals/proposalButtonRules.js`
- `rules/proposals/canAcceptProposal.js`
- `rules/proposals/canCancelProposal.js`
- `rules/proposals/canEditProposal.js`
- `rules/proposals/determineProposalStage.js`
- `rules/proposals/virtualMeetingRules.js`
- `rules/proposals/useProposalButtonStates.js` (TO BE DELETED)
- `rules/scheduling/isScheduleContiguous.js` (CANONICAL)
- `rules/scheduling/isDateBlocked.js`
- `rules/scheduling/isDateInRange.js`
- `rules/search/isValidPriceTier.js`
- `rules/search/isValidSortOption.js`
- `rules/search/isValidWeekPattern.js`
- `rules/search/hasListingPhotos.js`
- `rules/auth/isSessionValid.js`
- `rules/auth/isProtectedPage.js`
- `rules/pricing/isValidDayCountForPricing.js`
- `rules/users/hasProfilePhoto.js`
- `rules/users/isGuest.js`
- `rules/users/isHost.js`
- `rules/users/shouldShowFullName.js`
- `rules/reminders/reminderScheduling.js`
- `rules/reminders/reminderValidation.js`
- `rules/reviews/reviewValidation.js`

### Workflows
- `workflows/booking/acceptProposalWorkflow.js`
- `workflows/booking/loadProposalDetailsWorkflow.js`
- `workflows/booking/cancelProposalWorkflow.js` (TO BE DELETED)
- `workflows/proposals/cancelProposalWorkflow.js` (CANONICAL)
- `workflows/proposals/navigationWorkflow.js`
- `workflows/proposals/counterofferWorkflow.js`
- `workflows/proposals/virtualMeetingWorkflow.js`
- `workflows/auth/checkAuthStatusWorkflow.js`
- `workflows/auth/validateTokenWorkflow.js`
- `workflows/scheduling/validateMoveInDateWorkflow.js`
- `workflows/scheduling/validateScheduleWorkflow.js`
- `workflows/reminders/reminderWorkflow.js`
