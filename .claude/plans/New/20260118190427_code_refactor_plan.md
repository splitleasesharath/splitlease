# Code Refactoring Plan - app/src/logic

Date: 2026-01-18
Audit Type: general

~~~~~

## PAGE GROUP: /guest-proposals, /view-proposal (Chunks: 1, 2, 3, 4)

### CHUNK 1: Deduplicate processProposalData Functions
**Files:** `processors/proposal/processProposalData.js`, `processors/proposals/processProposalData.js`
**Line:** N/A (entire files)
**Issue:** Two separate implementations of `processProposalData` exist with different behavior. `processor/proposal/` version uses named parameters and has stricter validation. `processors/proposals/` version is more complete with nested transforms but has a different function signature. This creates confusion about which to use and risks inconsistent proposal processing.
**Affected Pages:** /guest-proposals, /view-proposal, /messages

**Current Code:**
```javascript
// processors/proposal/processProposalData.js (149 lines)
export function processProposalData({ rawProposal, listing = null, guest = null, host = null }) {
  // Strict validation with throws
  if (!rawProposal) {
    throw new Error('processProposalData: rawProposal cannot be null or undefined')
  }
  // ... returns flat object with currentTerms/originalTerms
}

// processors/proposals/processProposalData.js (330 lines)
export function processProposalData(rawProposal) {
  // Also strict validation but different signature
  if (!rawProposal) {
    throw new Error('processProposalData: Proposal data is required');
  }
  // ... returns object with nested listing/host/virtualMeeting transforms
}
```

**Refactored Code:**
```javascript
// Single unified file: processors/proposal/processProposalData.js
// Keep the richer implementation from processors/proposals/ but adopt named params pattern

/**
 * Transform raw proposal data from Supabase into a clean, validated proposal object.
 * Supports both raw proposal with FK IDs and pre-joined nested data.
 *
 * @param {object} params - Named parameters.
 * @param {object} params.rawProposal - Raw proposal object from Supabase.
 * @param {object} [params.listing] - Pre-processed listing (if available).
 * @param {object} [params.guest] - Pre-processed guest (if available).
 * @param {object} [params.host] - Pre-processed host (if available).
 * @returns {object} Clean, validated proposal object.
 */
export function processProposalData({ rawProposal, listing = null, guest = null, host = null }) {
  if (!rawProposal) {
    throw new Error('processProposalData: rawProposal cannot be null or undefined');
  }

  if (!rawProposal._id) {
    throw new Error('processProposalData: Proposal missing critical _id field');
  }

  // Transform nested data if present and not pre-processed
  const processedListing = listing ?? processListingData(rawProposal.listing);
  const processedHost = host ?? processHostData(rawProposal.listing?.host);
  const processedVirtualMeeting = processVirtualMeetingData(rawProposal.virtualMeeting);

  // ... merge both implementations
}

// Delete: processors/proposals/processProposalData.js (after migration)
// Update all imports to use the single canonical location
```

**Testing:**
- [ ] Search codebase for all imports of both files
- [ ] Update imports to use single canonical path
- [ ] Verify guest-proposals page loads proposals correctly
- [ ] Verify proposal detail modal shows all fields
- [ ] Run existing tests

~~~~~

### CHUNK 2: Deduplicate cancelProposalWorkflow
**Files:** `workflows/booking/cancelProposalWorkflow.js`, `workflows/proposals/cancelProposalWorkflow.js`
**Line:** N/A (entire files)
**Issue:** Two cancel proposal workflows exist with overlapping but different implementations. The `booking/` version implements a decision tree approach while `proposals/` version implements Bubble workflow mapping. Both export similarly named functions but with different signatures.
**Affected Pages:** /guest-proposals

**Current Code:**
```javascript
// workflows/booking/cancelProposalWorkflow.js
export async function cancelProposalWorkflow({
  supabase,
  proposal,
  source = 'main',
  canCancelProposal  // Rule function passed in
}) {
  // Implements 7-variation decision tree
  // Returns { success, message, updated, requiresPhoneCall }
}

// workflows/proposals/cancelProposalWorkflow.js
import { supabase } from '../../../lib/supabase.js';  // Imports supabase directly

export function determineCancellationCondition(proposal) { ... }
export async function executeCancelProposal(proposalId, reason = null) { ... }
export async function cancelProposalFromCompareTerms(proposalId, reason) { ... }
export async function executeDeleteProposal(proposalId) { ... }
```

**Refactored Code:**
```javascript
// Single unified file: workflows/proposals/cancelProposalWorkflow.js
// Combine both approaches - keep dependency injection pattern from booking/ version
// but include the richer condition evaluation from proposals/ version

import { canCancelProposal, requiresSpecialCancellationConfirmation } from '../../rules/proposals/proposalRules.js';
import { PROPOSAL_STATUSES } from '../../constants/proposalStatuses.js';

/**
 * Evaluate which cancellation workflow condition applies.
 * @param {Object} proposal - Full proposal object
 * @returns {Object} Condition details with workflow info
 */
export function determineCancellationCondition(proposal) {
  // Keep existing implementation
}

/**
 * Cancel proposal workflow with full decision tree.
 *
 * @param {object} params - Named parameters.
 * @param {object} params.supabase - Supabase client (dependency injection).
 * @param {object} params.proposal - Processed proposal object.
 * @param {string} [params.source='main'] - Source context.
 * @param {string} [params.reason] - Cancellation reason.
 * @returns {Promise<object>} Result with success, message, updated flags.
 */
export async function cancelProposalWorkflow({
  supabase,
  proposal,
  source = 'main',
  reason = null
}) {
  // Combine decision tree from booking/ with Bubble workflow mapping from proposals/
  const condition = determineCancellationCondition(proposal);

  if (!condition.allowCancel) {
    return {
      success: false,
      message: condition.message,
      updated: false
    };
  }

  // Execute cancellation with injected supabase client
  return await executeCancelProposal({ supabase, proposalId: proposal.id, reason });
}

// Delete: workflows/booking/cancelProposalWorkflow.js (after migration)
```

**Testing:**
- [ ] Verify cancel proposal button works on guest-proposals page
- [ ] Test cancellation from Compare Terms modal
- [ ] Test soft-delete of rejected/cancelled proposals
- [ ] Verify decision tree conditions (usualOrder, houseManualAccessed)

~~~~~

### CHUNK 3: Move useProposalButtonStates from rules to hooks
**File:** `rules/proposals/useProposalButtonStates.js`
**Line:** 1-148
**Issue:** This file is a React hook (uses `useMemo` from React) but is placed in the `rules/` directory. The rules layer should contain pure predicate functions only. React hooks belong in the hooks layer or colocated with components.
**Affected Pages:** /guest-proposals

**Current Code:**
```javascript
// rules/proposals/useProposalButtonStates.js
import { useMemo } from 'react';
import { getStatusConfig, PROPOSAL_STATUS } from '../../../config/proposalStatusConfig.js';

export function useProposalButtonStates({ proposal, virtualMeeting, guest, listing, currentUserId }) {
  return useMemo(() => {
    // ... button state computation
  }, [proposal, virtualMeeting, guest, listing, currentUserId]);
}
```

**Refactored Code:**
```javascript
// Step 1: Extract pure logic to rules/proposals/proposalButtonRules.js
/**
 * Compute button states for a proposal card (pure function).
 * @param {object} params - Named parameters
 * @returns {object} Button states
 */
export function computeProposalButtonStates({ proposal, virtualMeeting, guest, listing, currentUserId }) {
  if (!proposal) {
    return {
      virtualMeeting: { visible: false },
      guestAction1: { visible: false },
      guestAction2: { visible: false },
      cancelProposal: { visible: false },
    };
  }
  // ... same logic but without useMemo wrapper
}

// Step 2: Create hook in src/hooks/useProposalButtonStates.js
import { useMemo } from 'react';
import { computeProposalButtonStates } from '../logic/rules/proposals/proposalButtonRules.js';

export function useProposalButtonStates(params) {
  return useMemo(() => computeProposalButtonStates(params), [
    params.proposal,
    params.virtualMeeting,
    params.guest,
    params.listing,
    params.currentUserId
  ]);
}

// Delete: rules/proposals/useProposalButtonStates.js (after migration)
```

**Testing:**
- [ ] Verify ProposalCard buttons display correctly
- [ ] Test button visibility for different proposal statuses
- [ ] Ensure memoization still works (no unnecessary re-renders)

~~~~~

### CHUNK 4: Extract validation constants from search rules
**Files:** `rules/search/isValidPriceTier.js`, `rules/search/isValidSortOption.js`, `rules/search/isValidWeekPattern.js`
**Line:** Multiple (each file has hardcoded arrays)
**Issue:** Three search validation rules each define their valid options as inline arrays. These should be extracted to `constants/searchConstants.js` for centralized maintenance and reuse in dropdowns.
**Affected Pages:** /search

**Current Code:**
```javascript
// rules/search/isValidPriceTier.js (line 28)
const validTiers = ['under-200', '200-350', '350-500', '500-plus', 'all']

// rules/search/isValidSortOption.js (line 28)
const validOptions = ['recommended', 'price-low', 'most-viewed', 'recent']

// rules/search/isValidWeekPattern.js (line 28)
const validPatterns = ['every-week', 'one-on-off', 'two-on-off', 'one-three-off']
```

**Refactored Code:**
```javascript
// NEW FILE: constants/searchConstants.js
/**
 * Search filter constants.
 * Single source of truth for valid filter values.
 */

export const PRICE_TIERS = ['under-200', '200-350', '350-500', '500-plus', 'all'];
export const SORT_OPTIONS = ['recommended', 'price-low', 'most-viewed', 'recent'];
export const WEEK_PATTERNS = ['every-week', 'one-on-off', 'two-on-off', 'one-three-off'];

// Optional: Add display labels for dropdowns
export const PRICE_TIER_LABELS = {
  'under-200': 'Under $200/night',
  '200-350': '$200 - $350/night',
  '350-500': '$350 - $500/night',
  '500-plus': '$500+/night',
  'all': 'All Prices'
};

// UPDATED: rules/search/isValidPriceTier.js
import { PRICE_TIERS } from '../../constants/searchConstants.js';

export function isValidPriceTier({ priceTier }) {
  if (typeof priceTier !== 'string') {
    throw new Error(`isValidPriceTier: priceTier must be a string, got ${typeof priceTier}`);
  }
  return PRICE_TIERS.includes(priceTier);
}

// Similar updates for isValidSortOption.js and isValidWeekPattern.js
```

**Testing:**
- [ ] Search page filters work correctly
- [ ] Dropdown options match constant arrays
- [ ] Invalid filter values are rejected

~~~~~

## PAGE GROUP: /view-split-lease, /search (Chunks: 5)

### CHUNK 5: JSON parsing duplication in hasListingPhotos and parseJsonArrayField
**Files:** `rules/search/hasListingPhotos.js`, `processors/listing/parseJsonArrayField.js`
**Line:** hasListingPhotos.js:33-40
**Issue:** `hasListingPhotos` contains inline JSON parsing logic that duplicates what `parseJsonArrayField` already does. The rule should use the existing processor.
**Affected Pages:** /search, /view-split-lease

**Current Code:**
```javascript
// rules/search/hasListingPhotos.js (lines 33-40)
// Handle string representation (JSON array from database)
if (typeof photos === 'string') {
  try {
    const parsed = JSON.parse(photos)
    return Array.isArray(parsed) && parsed.length > 0
  } catch {
    return false
  }
}
```

**Refactored Code:**
```javascript
// rules/search/hasListingPhotos.js
import { parseJsonArrayField } from '../../processors/listing/parseJsonArrayField.js';

export function hasListingPhotos({ listing }) {
  if (listing === null || listing === undefined) {
    throw new Error('hasListingPhotos: listing cannot be null or undefined');
  }

  const photos = listing['Features - Photos'];

  // Use centralized JSON parsing processor
  const parsedPhotos = parseJsonArrayField({ value: photos });

  return parsedPhotos.length > 0;
}
```

**Testing:**
- [ ] Search results show only listings with photos
- [ ] Listings with JSON string photos display correctly
- [ ] Listings with array photos display correctly

~~~~~

## PAGE GROUP: /guest-proposals, /view-proposal (Chunks: 6)

### CHUNK 6: Consolidate proposal status checking in proposalRules.js
**Files:** `rules/proposals/proposalRules.js`, `rules/proposals/canAcceptProposal.js`, `rules/proposals/canCancelProposal.js`, `rules/proposals/canEditProposal.js`
**Line:** Multiple
**Issue:** There are two `canCancelProposal` implementations - one in `proposalRules.js` (takes whole proposal object) and one in `canCancelProposal.js` (takes status/deleted params). Similar inconsistency exists for accept/edit. This violates DRY and causes import confusion.
**Affected Pages:** /guest-proposals, /view-proposal

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

// rules/proposals/proposalRules.js (lines 26-54)
export function canCancelProposal(proposal) {
  if (!proposal) return false;
  const status = proposal.status || proposal.Status;
  // Different implementation with more specific status checks
  if (status === PROPOSAL_STATUSES.CANCELLED_BY_GUEST.key || ...) return false;
  if (isCompletedStatus(status)) return false;
  if (status === PROPOSAL_STATUSES.EXPIRED.key) return false;
  return true;
}
```

**Refactored Code:**
```javascript
// Keep ONLY rules/proposals/proposalRules.js as canonical source
// Update it to support both call patterns via overloading

/**
 * Check if a proposal can be cancelled.
 *
 * @param {object} proposalOrParams - Either full proposal object OR { proposalStatus, deleted }
 * @returns {boolean} True if cancellable
 */
export function canCancelProposal(proposalOrParams) {
  // Support both call patterns
  let status, deleted;

  if (proposalOrParams.proposalStatus !== undefined) {
    // Named params style: { proposalStatus, deleted }
    status = proposalOrParams.proposalStatus;
    deleted = proposalOrParams.deleted ?? false;
  } else {
    // Object style: full proposal
    status = proposalOrParams.status || proposalOrParams.Status;
    deleted = proposalOrParams.Deleted || proposalOrParams.deleted || false;
  }

  if (deleted) return false;
  if (!status || typeof status !== 'string') return false;

  const trimmedStatus = status.trim();

  if (isTerminalStatus(trimmedStatus) || isCompletedStatus(trimmedStatus)) {
    return false;
  }

  return true;
}

// Delete: rules/proposals/canCancelProposal.js (move imports to proposalRules.js)
// Delete: rules/proposals/canAcceptProposal.js
// Delete: rules/proposals/canEditProposal.js
// Update all imports across codebase
```

**Testing:**
- [ ] Cancel button visibility works correctly
- [ ] Accept counteroffer button visibility works correctly
- [ ] Edit proposal button visibility works correctly
- [ ] Test with both call patterns (object and named params)

~~~~~

## PAGE GROUP: /house-manual, /reminders (Chunks: 7)

### CHUNK 7: Unused timezone parameter in calculateNextSendTime
**File:** `calculators/reminders/calculateNextSendTime.js`
**Line:** 19
**Issue:** The `timezone` parameter is accepted but never used. Either implement timezone conversion or remove the parameter to avoid confusion.
**Affected Pages:** /house-manual, /reminders

**Current Code:**
```javascript
// calculators/reminders/calculateNextSendTime.js (line 19)
export function calculateNextSendTime({ scheduledDateTime, timezone = 'America/New_York' }) {
  // ... timezone is never used in the function body
  const date = scheduledDateTime instanceof Date
    ? scheduledDateTime
    : new Date(scheduledDateTime);
  return date;
}
```

**Refactored Code:**
```javascript
/**
 * Calculate the next send time for a reminder.
 * Note: All times are stored and compared in UTC. Timezone display
 * is handled at the presentation layer via formatters.
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

// Note: Timezone was removed as it was unused.
// If timezone conversion is needed in the future, implement it properly
// or use the existing reminderFormatter.js for display formatting.
```

**Testing:**
- [ ] Reminder scheduling continues to work
- [ ] Reminder display shows correct times

~~~~~

## PAGE GROUP: AUTO (Chunks: 8)

### CHUNK 8: Inconsistent error handling pattern in virtualMeetingRules.js
**File:** `rules/proposals/virtualMeetingRules.js`
**Line:** 55-57
**Issue:** The `parseSuggestedDates` helper function silently swallows JSON parse errors with an empty catch block. This violates the "No Fallback" principle - parsing errors should be surfaced, not hidden.
**Affected Pages:** /guest-proposals, /view-proposal

**Current Code:**
```javascript
// rules/proposals/virtualMeetingRules.js (lines 51-58)
if (typeof suggestedDates === 'string') {
  try {
    const parsed = JSON.parse(suggestedDates);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];  // Silent failure - hides parsing errors
  }
}
```

**Refactored Code:**
```javascript
/**
 * Parse suggested dates - handles both array and JSON string formats.
 * @param {Array|string} suggestedDates - Dates as array or JSON string
 * @returns {Array} Array of date strings
 * @throws {Error} If string cannot be parsed as JSON array
 */
function parseSuggestedDates(suggestedDates) {
  if (!suggestedDates) return [];

  // If already an array, return as-is
  if (Array.isArray(suggestedDates)) return suggestedDates;

  // If it's a string, try to parse it as JSON
  if (typeof suggestedDates === 'string') {
    // Empty string is valid (no dates)
    if (suggestedDates.trim() === '') return [];

    try {
      const parsed = JSON.parse(suggestedDates);
      if (!Array.isArray(parsed)) {
        console.warn('[parseSuggestedDates] Parsed value is not an array:', typeof parsed);
        return [];
      }
      return parsed;
    } catch (e) {
      // Log the error for debugging but return empty array
      // This is a data quality issue that should be investigated
      console.error('[parseSuggestedDates] Failed to parse JSON:', suggestedDates, e.message);
      return [];
    }
  }

  return [];
}
```

**Testing:**
- [ ] Virtual meeting dates display correctly
- [ ] Invalid JSON data triggers console warning
- [ ] Empty/null dates handled gracefully

~~~~~

## Chunk 1 of 8
- **Files**: `processors/proposal/processProposalData.js`, `processors/proposals/processProposalData.js`
- **Rationale**: Duplicate implementations of the same function with different signatures - must be consolidated to single source of truth
- **Approach**: Keep richer implementation from processors/proposals/, adopt named params pattern, delete duplicate file

## Chunk 2 of 8
- **Files**: `workflows/booking/cancelProposalWorkflow.js`, `workflows/proposals/cancelProposalWorkflow.js`
- **Rationale**: Two overlapping workflow implementations for same domain action - violates DRY principle
- **Approach**: Merge decision tree from booking/ with Bubble workflow mapping from proposals/, use dependency injection pattern

## Chunk 3 of 8
- **Files**: `rules/proposals/useProposalButtonStates.js`
- **Rationale**: React hook placed in rules layer - rules must be pure functions without React dependencies
- **Approach**: Extract pure computation to rules/, create new hook in src/hooks/

## Chunk 4 of 8
- **Files**: `rules/search/isValidPriceTier.js`, `rules/search/isValidSortOption.js`, `rules/search/isValidWeekPattern.js`
- **Rationale**: Hardcoded validation arrays duplicated across files - should be centralized constants
- **Approach**: Create constants/searchConstants.js, update rules to import from constants

## Chunk 5 of 8
- **Files**: `rules/search/hasListingPhotos.js`, `processors/listing/parseJsonArrayField.js`
- **Rationale**: JSON parsing logic duplicated instead of reusing existing processor
- **Approach**: Update hasListingPhotos to use parseJsonArrayField processor

## Chunk 6 of 8
- **Files**: `rules/proposals/proposalRules.js`, `rules/proposals/canAcceptProposal.js`, `rules/proposals/canCancelProposal.js`, `rules/proposals/canEditProposal.js`
- **Rationale**: Same proposal rules implemented in multiple files with different signatures - HIGH IMPACT (proposalStatuses.js has 16 dependents)
- **Approach**: Consolidate to proposalRules.js with overloaded function signatures supporting both patterns

## Chunk 7 of 8
- **Files**: `calculators/reminders/calculateNextSendTime.js`
- **Rationale**: Unused timezone parameter creates false API expectations
- **Approach**: Remove unused parameter, add clarifying documentation

## Chunk 8 of 8
- **Files**: `rules/proposals/virtualMeetingRules.js`
- **Rationale**: Silent error swallowing violates "No Fallback" principle
- **Approach**: Add console.error logging for debugging while maintaining graceful degradation

---

## Summary

| Chunk | Priority | Impact | Files Modified | Files Deleted |
|-------|----------|--------|----------------|---------------|
| 1 | High | Medium | 1 | 1 |
| 2 | High | Medium | 1 | 1 |
| 3 | Medium | Low | 2 (new hook) | 1 |
| 4 | Low | Low | 4 (3 existing + 1 new) | 0 |
| 5 | Low | Low | 1 | 0 |
| 6 | High | High | 1 | 3 |
| 7 | Low | Low | 1 | 0 |
| 8 | Low | Low | 1 | 0 |

**Recommended Execution Order:** 6 → 1 → 2 → 3 → 4 → 5 → 7 → 8

Chunk 6 should be done first as proposalStatuses.js has 16 dependents - consolidating the rules reduces the surface area for future changes.

---

## File References

**Files to Modify:**
- `app/src/logic/processors/proposal/processProposalData.js`
- `app/src/logic/workflows/proposals/cancelProposalWorkflow.js`
- `app/src/logic/rules/proposals/proposalRules.js`
- `app/src/logic/rules/search/isValidPriceTier.js`
- `app/src/logic/rules/search/isValidSortOption.js`
- `app/src/logic/rules/search/isValidWeekPattern.js`
- `app/src/logic/rules/search/hasListingPhotos.js`
- `app/src/logic/calculators/reminders/calculateNextSendTime.js`
- `app/src/logic/rules/proposals/virtualMeetingRules.js`

**Files to Delete:**
- `app/src/logic/processors/proposals/processProposalData.js`
- `app/src/logic/workflows/booking/cancelProposalWorkflow.js`
- `app/src/logic/rules/proposals/useProposalButtonStates.js`
- `app/src/logic/rules/proposals/canAcceptProposal.js`
- `app/src/logic/rules/proposals/canCancelProposal.js`
- `app/src/logic/rules/proposals/canEditProposal.js`

**Files to Create:**
- `app/src/logic/constants/searchConstants.js`
- `app/src/logic/rules/proposals/proposalButtonRules.js`
- `app/src/hooks/useProposalButtonStates.js`
