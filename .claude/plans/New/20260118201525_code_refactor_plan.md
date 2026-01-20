# Code Refactoring Plan - app/src/logic

**Date:** 2026-01-18
**Audit Type:** General
**Files Analyzed:** 68
**Issues Found:** 24
**Chunks:** 18

---

## Executive Summary

This audit identified issues across the four-layer logic architecture:
- **3 CRITICAL** issues (duplicate files, broken imports)
- **7 HIGH** priority issues (inconsistent patterns, silent failures)
- **8 MEDIUM** priority issues (code duplication, magic strings)
- **6 LOW** priority issues (documentation, optimization)

---

## PAGE GROUP: /search (Chunks: 1, 5, 12, 16)

### CHUNK 1: Duplicate JSON Array Parsing Logic
**File:** `app/src/logic/rules/search/hasListingPhotos.js`
**Line:** 34-40
**Issue:** Duplicates JSON array parsing logic that already exists in `parseJsonArrayField.js`. This creates maintenance burden and inconsistent error handling.
**Affected Pages:** /search, /favorite-listings
**Priority:** MEDIUM

**Current Code:**
```javascript
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
import { parseJsonArrayFieldOptional } from '../../processors/listing/parseJsonArrayField.js'

export function hasListingPhotos({ listing }) {
  if (listing === null || listing === undefined) {
    throw new Error('hasListingPhotos: listing cannot be null or undefined')
  }

  const rawPhotos = listing['Features - Photos']
  const photos = parseJsonArrayFieldOptional({ field: rawPhotos, fieldName: 'Features - Photos' })

  return photos.length > 0
}
```

**Testing:**
- [ ] Verify search page displays listings with photos correctly
- [ ] Verify listings with JSON-encoded photo arrays are handled
- [ ] Verify listings with null photos are filtered out

~~~~~

### CHUNK 5: Silent Error Handling Violates No-Fallback Principle
**File:** `app/src/logic/processors/listing/extractListingCoordinates.js`
**Line:** 42-69
**Issue:** JSON parse failures log to console but silently return null, violating the "No Fallback" principle. This hides data quality issues that should be surfaced.
**Affected Pages:** /search (map display)
**Priority:** HIGH

**Current Code:**
```javascript
  if (typeof locationSlightlyDifferent === 'string') {
    try {
      parsedSlightlyDifferent = JSON.parse(locationSlightlyDifferent)
    } catch (error) {
      console.error(
        '❌ extractListingCoordinates: Failed to parse Location - slightly different address:',
        {
          listingId,
          rawValue: locationSlightlyDifferent,
          error: error.message
        }
      )
      parsedSlightlyDifferent = null
    }
  }
```

**Refactored Code:**
```javascript
  if (typeof locationSlightlyDifferent === 'string') {
    try {
      parsedSlightlyDifferent = JSON.parse(locationSlightlyDifferent)
    } catch (error) {
      // No Fallback: Surface data quality issue
      throw new Error(
        `extractListingCoordinates: Failed to parse Location - slightly different address for listing ${listingId}. ` +
        `Raw value: ${locationSlightlyDifferent.substring(0, 100)}... Error: ${error.message}`
      )
    }
  }

  if (typeof locationAddress === 'string') {
    try {
      parsedAddress = JSON.parse(locationAddress)
    } catch (error) {
      // No Fallback: Surface data quality issue
      throw new Error(
        `extractListingCoordinates: Failed to parse Location - Address for listing ${listingId}. ` +
        `Raw value: ${locationAddress.substring(0, 100)}... Error: ${error.message}`
      )
    }
  }
```

**Testing:**
- [ ] Verify search map handles valid coordinates
- [ ] Verify malformed JSON throws descriptive error
- [ ] Update calling code to handle/log thrown errors

~~~~~

### CHUNK 12: Wrap-Around Detection Bug in calculateCheckInOutFromDays
**File:** `app/src/logic/calculators/scheduling/calculateCheckInOutFromDays.js`
**Line:** 14-16
**Issue:** The wrap-around check `hasSaturday && hasSunday && sortedDays.length < 7` returns true for non-contiguous selections like [0, 6] (Sun, Sat with no days between).
**Affected Pages:** /search (schedule indicator)
**Priority:** HIGH

**Current Code:**
```javascript
  const sortedDays = [...selectedDays].sort((a, b) => a - b);
  const hasSaturday = sortedDays.includes(6);
  const hasSunday = sortedDays.includes(0);
  const isWrapAround = hasSaturday && hasSunday && sortedDays.length < 7;
```

**Refactored Code:**
```javascript
  const sortedDays = [...selectedDays].sort((a, b) => a - b);
  const hasSaturday = sortedDays.includes(6);
  const hasSunday = sortedDays.includes(0);

  // Wrap-around requires at least 3 days to form a contiguous selection
  // [0, 6] is NOT contiguous, but [5, 6, 0] IS (Fri-Sat-Sun wrapping)
  const isWrapAround = hasSaturday && hasSunday && sortedDays.length >= 3;
```

**Testing:**
- [ ] Verify [5, 6, 0, 1] returns checkIn: 5, checkOut: 2
- [ ] Verify [0, 6] returns null (non-contiguous)
- [ ] Verify [0, 1, 2] returns checkIn: 0, checkOut: 3

~~~~~

### CHUNK 16: Missing Constant Definitions for Search Validation
**File:** `app/src/logic/rules/search/isValidPriceTier.js`, `isValidSortOption.js`, `isValidWeekPattern.js`
**Line:** Various
**Issue:** These validation functions hardcode valid values instead of importing from a central constants file. Changes require updating multiple files.
**Affected Pages:** /search
**Priority:** MEDIUM

**Current Code (isValidPriceTier.js):**
```javascript
export function isValidPriceTier({ tier }) {
  if (!tier || typeof tier !== 'string') {
    return false
  }

  const validTiers = ['budget', 'moderate', 'premium', 'luxury']
  return validTiers.includes(tier.toLowerCase())
}
```

**Refactored Code:**
```javascript
import { VALID_PRICE_TIERS, VALID_SORT_OPTIONS, VALID_WEEK_PATTERNS } from '../../constants/searchConstants.js'

export function isValidPriceTier({ tier }) {
  if (!tier || typeof tier !== 'string') {
    return false
  }

  return VALID_PRICE_TIERS.includes(tier.toLowerCase())
}
```

**New File (searchConstants.js):**
```javascript
/**
 * Search validation constants
 * Single source of truth for valid filter values
 */
export const VALID_PRICE_TIERS = ['budget', 'moderate', 'premium', 'luxury']
export const VALID_SORT_OPTIONS = ['price-low', 'price-high', 'newest', 'rating']
export const VALID_WEEK_PATTERNS = ['weekdays', 'weekends', 'full-week', 'custom']
```

**Testing:**
- [ ] Verify search filters accept valid tier values
- [ ] Verify invalid tiers are rejected
- [ ] Update all three validation files to use constants

~~~~~

## PAGE GROUP: /guest-proposals (Chunks: 2, 3, 4, 6, 7)

### CHUNK 2: Duplicate processProposalData Files
**Files:**
- `app/src/logic/processors/proposal/processProposalData.js` (149 lines)
- `app/src/logic/processors/proposals/processProposalData.js` (302 lines)
**Line:** Entire files
**Issue:** Two files with identical names in different directories (`proposal/` vs `proposals/`). The `proposals/` version is more complete (302 lines vs 149 lines) with additional helper functions.
**Affected Pages:** /guest-proposals, /view-split-lease, /host-proposals
**Priority:** CRITICAL

**Current Code (proposal/processProposalData.js - shorter version):**
```javascript
// 149 lines - processes raw proposal, returns clean object
// Missing: processListingData, processHostData, getEffectiveTerms
export function processProposalData({ rawProposal, listing = null, guest = null, host = null }) {
  // ...
}
```

**Current Code (proposals/processProposalData.js - complete version):**
```javascript
// 302 lines - includes all helper functions
export function processListingData(rawListing) { ... }
export function processHostData(rawHost) { ... }
export function processVirtualMeetingData(rawVirtualMeeting) { ... }
export function processProposalData(rawProposal) { ... }
export function getProposalDisplayText(proposal) { ... }
export function formatPrice(price, includeCents = true) { ... }
export function formatDate(date) { ... }
export function formatDateTime(datetime) { ... }
export function getEffectiveTerms(proposal) { ... }
```

**Refactored Code:**
1. **DELETE** `app/src/logic/processors/proposal/processProposalData.js`
2. **KEEP** `app/src/logic/processors/proposals/processProposalData.js`
3. **UPDATE** all imports to use the `proposals/` path

**Testing:**
- [ ] Search codebase for imports from `proposal/processProposalData`
- [ ] Update imports to `proposals/processProposalData`
- [ ] Verify proposal cards render correctly on guest proposals page
- [ ] Verify proposal details modal works

~~~~~

### CHUNK 3: Duplicate canCancelProposal Functions
**Files:**
- `app/src/logic/rules/proposals/canCancelProposal.js` (48 lines)
- `app/src/logic/rules/proposals/proposalRules.js` (lines 26-54)
**Line:** 26-54 in proposalRules.js
**Issue:** Two implementations of `canCancelProposal` with different logic. The standalone file uses `isTerminalStatus()` predicate, while the one in proposalRules.js checks specific status constants.
**Affected Pages:** /guest-proposals, /view-split-lease
**Priority:** HIGH

**Current Code (canCancelProposal.js):**
```javascript
export function canCancelProposal({ proposalStatus, deleted = false }) {
  if (deleted) return false
  if (!proposalStatus || typeof proposalStatus !== 'string') return false
  const status = proposalStatus.trim()
  if (isTerminalStatus(status) || isCompletedStatus(status)) return false
  return true
}
```

**Current Code (proposalRules.js):**
```javascript
export function canCancelProposal(proposal) {
  if (!proposal) return false
  const status = proposal.status || proposal.Status
  if (
    status === PROPOSAL_STATUSES.CANCELLED_BY_GUEST.key ||
    status === PROPOSAL_STATUSES.CANCELLED_BY_SPLITLEASE.key ||
    status === PROPOSAL_STATUSES.REJECTED_BY_HOST.key
  ) return false
  if (isCompletedStatus(status)) return false
  if (status === PROPOSAL_STATUSES.EXPIRED.key) return false
  return true
}
```

**Refactored Code:**
1. **KEEP** `canCancelProposal.js` as the canonical implementation (uses predicates)
2. **DELETE** `canCancelProposal` from `proposalRules.js`
3. **RE-EXPORT** from proposalRules.js for backward compatibility:

```javascript
// In proposalRules.js - line 16, add import:
import { canCancelProposal } from './canCancelProposal.js'

// At bottom, re-export:
export { canCancelProposal }
```

**Testing:**
- [ ] Verify cancel button appears for active proposals
- [ ] Verify cancel button hidden for cancelled/completed proposals
- [ ] Run existing tests for proposal cancellation flow

~~~~~

### CHUNK 4: Duplicate Import Statement in proposalRules.js
**File:** `app/src/logic/rules/proposals/proposalRules.js`
**Line:** 16 and 352-358
**Issue:** The file imports from `proposalStatuses.js` twice - once at line 16 and again at lines 352-358. This causes a JavaScript syntax error and indicates incomplete refactoring.
**Affected Pages:** /guest-proposals, /view-split-lease
**Priority:** CRITICAL

**Current Code:**
```javascript
// Line 16:
import { PROPOSAL_STATUSES, isTerminalStatus, isCompletedStatus, getActionsForStatus } from '../../constants/proposalStatuses.js';

// Lines 351-358:
// Import from constants instead of duplicating
import {
  PROPOSAL_STATUSES,
  isTerminalStatus,
  isCompletedStatus,
  getActionsForStatus,
  isSuggestedProposal  // Add this import
} from '../../constants/proposalStatuses.js';
```

**Refactored Code:**
```javascript
// Single import at top of file (line 16):
import {
  PROPOSAL_STATUSES,
  isTerminalStatus,
  isCompletedStatus,
  getActionsForStatus,
  isSuggestedProposal
} from '../../constants/proposalStatuses.js';

// Delete lines 351-362 entirely
```

**Testing:**
- [ ] Verify file compiles without syntax errors
- [ ] Verify guest proposals page loads
- [ ] Verify isSLSuggestedProposal export works for backward compatibility

~~~~~

### CHUNK 6: Broken Import Path in proposalButtonRules.js
**File:** `app/src/logic/rules/proposals/proposalButtonRules.js`
**Line:** 1
**Issue:** Imports from `config/proposalStatusConfig.js` which likely doesn't exist. The actual status configuration is in `constants/proposalStatuses.js`.
**Affected Pages:** /guest-proposals (button states)
**Priority:** CRITICAL

**Current Code:**
```javascript
import { getStatusConfig, PROPOSAL_STATUS } from '../../../config/proposalStatusConfig.js';
```

**Refactored Code:**
```javascript
import { getStatusConfig, PROPOSAL_STATUSES } from '../../constants/proposalStatuses.js';

// Also update all references to PROPOSAL_STATUS to use PROPOSAL_STATUSES:
// Line 25-30: vmHiddenStatuses array
const vmHiddenStatuses = [
  PROPOSAL_STATUSES.REJECTED_BY_HOST.key,
  PROPOSAL_STATUSES.CANCELLED_BY_SPLITLEASE.key,
  PROPOSAL_STATUSES.INITIAL_PAYMENT_SUBMITTED_LEASE_ACTIVATED.key,
  PROPOSAL_STATUSES.SUGGESTED_PROPOSAL_AWAITING_RENTAL_APP.key,
  PROPOSAL_STATUSES.SUGGESTED_PROPOSAL_PENDING_CONFIRMATION.key,
].map(s => (typeof s === 'string' ? s.trim() : s));
```

**Testing:**
- [ ] Verify file compiles without import errors
- [ ] Verify proposal button states render correctly
- [ ] Test all button visibility conditions

~~~~~

### CHUNK 7: Inconsistent Status Field Access Pattern
**File:** `app/src/logic/rules/proposals/proposalRules.js`
**Lines:** 31, 68, 85, 124, 140, 157, 179, 196, 212, 231, 247, 281, 372
**Issue:** Status is accessed inconsistently as `proposal.status || proposal.Status` without trimming. Some locations trim, some don't.
**Affected Pages:** /guest-proposals, /view-split-lease
**Priority:** MEDIUM

**Current Code:**
```javascript
// Line 31 - no trim:
const status = proposal.status || proposal.Status;

// Line 68 - no trim:
const status = proposal.status || proposal.Status;

// etc. (13 occurrences)
```

**Refactored Code:**
Create a helper function and use consistently:

```javascript
/**
 * Extract and normalize proposal status
 * @param {Object} proposal - Proposal object
 * @returns {string} Trimmed status string or empty string
 */
function getProposalStatus(proposal) {
  const raw = proposal?.status || proposal?.Status || ''
  return typeof raw === 'string' ? raw.trim() : ''
}

// Usage throughout:
const status = getProposalStatus(proposal)
```

**Testing:**
- [ ] Verify status comparisons work with trimmed values
- [ ] Verify all proposal rule functions behave consistently
- [ ] Test with proposal data that has trailing spaces in status

~~~~~

## PAGE GROUP: /host-proposals (Chunks: 8, 9)

### CHUNK 8: Legacy VM_STATES Aliases Should Be Removed
**File:** `app/src/logic/rules/proposals/virtualMeetingRules.js`
**Line:** 34-36
**Issue:** Contains "legacy aliases for backward compatibility" that the comment says "will be removed in future." These create confusion about which constant to use.
**Affected Pages:** /host-proposals, /guest-proposals
**Priority:** MEDIUM

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
1. Search codebase for usages of `VM_STATES.REQUESTED_BY_GUEST` and `VM_STATES.REQUESTED_BY_HOST`
2. Replace with perspective-neutral equivalents
3. Remove aliases:

```javascript
export const VM_STATES = {
  NO_MEETING: 'no_meeting',
  REQUESTED_BY_ME: 'requested_by_me',
  REQUESTED_BY_OTHER: 'requested_by_other',
  BOOKED_AWAITING_CONFIRMATION: 'booked_awaiting_confirmation',
  CONFIRMED: 'confirmed',
  DECLINED: 'declined',
  EXPIRED: 'expired'
};
```

**Testing:**
- [ ] Grep for REQUESTED_BY_GUEST and REQUESTED_BY_HOST usages
- [ ] Update all usages to REQUESTED_BY_ME or REQUESTED_BY_OTHER
- [ ] Verify virtual meeting states display correctly

~~~~~

### CHUNK 9: JSON Parsing in virtualMeetingRules Not Reusing Utility
**File:** `app/src/logic/rules/proposals/virtualMeetingRules.js`
**Line:** 44-61
**Issue:** The `parseSuggestedDates` function duplicates JSON parsing logic instead of using `parseJsonArrayFieldOptional`.
**Affected Pages:** /host-proposals, /guest-proposals
**Priority:** LOW

**Current Code:**
```javascript
function parseSuggestedDates(suggestedDates) {
  if (!suggestedDates) return [];
  if (Array.isArray(suggestedDates)) return suggestedDates;
  if (typeof suggestedDates === 'string') {
    try {
      const parsed = JSON.parse(suggestedDates);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }
  return [];
}
```

**Refactored Code:**
```javascript
import { parseJsonArrayFieldOptional } from '../../processors/listing/parseJsonArrayField.js'

function parseSuggestedDates(suggestedDates) {
  return parseJsonArrayFieldOptional({
    field: suggestedDates,
    fieldName: 'suggested dates and times'
  })
}
```

**Testing:**
- [ ] Verify virtual meeting date parsing works
- [ ] Verify expired date detection works
- [ ] Test with JSON-encoded and array formats

~~~~~

## PAGE GROUP: /reminders (Chunks: 10, 11)

### CHUNK 10: Hardcoded Reminder Status Strings
**File:** `app/src/logic/rules/reminders/reminderValidation.js`
**Line:** 56, 131
**Issue:** Uses hardcoded status strings like `'sent'`, `'cancelled'`, `'pending'` instead of constants.
**Affected Pages:** /reminders, house-manual related pages
**Priority:** MEDIUM

**Current Code:**
```javascript
// Line 56:
if (status === 'sent' || status === 'cancelled') {
  return false;
}

// Line 131:
return status === 'pending';
```

**Refactored Code:**
Create constants file and use:

```javascript
// New file: app/src/logic/constants/reminderConstants.js
export const REMINDER_STATUSES = {
  PENDING: 'pending',
  SENT: 'sent',
  CANCELLED: 'cancelled',
  FAILED: 'failed'
}

// In reminderValidation.js:
import { REMINDER_STATUSES } from '../../constants/reminderConstants.js'

// Line 56:
if (status === REMINDER_STATUSES.SENT || status === REMINDER_STATUSES.CANCELLED) {
  return false;
}

// Line 131:
return status === REMINDER_STATUSES.PENDING;
```

**Testing:**
- [ ] Verify reminder validation works
- [ ] Verify reminder status checks are consistent
- [ ] Update reminderScheduling.js to use same constants

~~~~~

### CHUNK 11: Same Hardcoded Strings in reminderScheduling.js
**File:** `app/src/logic/rules/reminders/reminderScheduling.js`
**Line:** 112, 128
**Issue:** Same hardcoded `'pending'` string as reminderValidation.js.
**Affected Pages:** /reminders
**Priority:** MEDIUM

**Current Code:**
```javascript
// Line 112:
if (status !== 'pending') {
  return false;
}
```

**Refactored Code:**
```javascript
import { REMINDER_STATUSES } from '../../constants/reminderConstants.js'

// Line 112:
if (status !== REMINDER_STATUSES.PENDING) {
  return false;
}
```

**Testing:**
- [ ] Verify reminder due check works
- [ ] Verify all reminder scheduling functions use constants

~~~~~

## PAGE GROUP: /reviews (Chunks: 13)

### CHUNK 13: Review Score Allows Invalid State
**File:** `app/src/logic/calculators/reviews/calculateReviewScore.js`
**Line:** 33-37
**Issue:** If all ratings are valid but average is somehow < 1.0 (shouldn't happen with 1-5 scale but edge case), no validation catches this. Also no validation that expected category count is met.
**Affected Pages:** /reviews, host-review-guest
**Priority:** LOW

**Current Code:**
```javascript
  const sum = ratings.reduce((acc, r) => acc + r.value, 0);
  const average = sum / ratings.length;

  // Round to 1 decimal place
  return Math.round(average * 10) / 10;
```

**Refactored Code:**
```javascript
import { REVIEW_CATEGORIES } from '../constants/reviewCategories.js'

const sum = ratings.reduce((acc, r) => acc + r.value, 0);
const average = sum / ratings.length;

// Validate average is within valid range
if (average < 1.0 || average > 5.0) {
  throw new Error(
    `calculateReviewScore: computed average ${average} is outside valid range 1.0-5.0`
  );
}

// Warn if not all categories provided (but don't throw - partial reviews allowed)
if (ratings.length !== REVIEW_CATEGORIES.length) {
  console.warn(
    `calculateReviewScore: received ${ratings.length} ratings but expected ${REVIEW_CATEGORIES.length} categories`
  );
}

// Round to 1 decimal place
return Math.round(average * 10) / 10;
```

**Testing:**
- [ ] Verify review score calculation with full ratings
- [ ] Verify warning logged for partial ratings
- [ ] Verify error thrown for invalid average

~~~~~

## PAGE GROUP: /view-split-lease (Chunks: 14, 15)

### CHUNK 14: proposalStatuses.js Has Mixed Responsibilities
**File:** `app/src/logic/constants/proposalStatuses.js`
**Line:** 1-384 (entire file)
**Issue:** Single 384-line file handles: status definitions, normalization, lookups, filtering, and predicates. This violates single responsibility principle.
**Affected Pages:** All proposal-related pages
**Priority:** LOW (large refactor, defer)

**Current Structure:**
- Lines 15-223: Status key definitions
- Lines 226-233: Status normalization
- Lines 235-287: Status lookup functions
- Lines 310-345: Status predicates (isActiveStatus, isTerminalStatus, etc.)
- Lines 357-384: Status filtering/query functions

**Proposed Structure (for future refactor):**
```
app/src/logic/constants/
├── proposalStatusDefinitions.js  (status object definitions)
├── proposalStatusLookups.js      (getStatusConfig, getStageFromStatus, etc.)
├── proposalStatusPredicates.js   (isActiveStatus, isTerminalStatus, etc.)
└── proposalStatuses.js           (re-exports everything for backward compat)
```

**Testing:**
- [ ] This is a documentation chunk - no immediate action
- [ ] Add to technical debt backlog for future sprint

~~~~~

### CHUNK 15: Duplicate cancelProposalWorkflow Files
**Files:**
- `app/src/logic/workflows/booking/cancelProposalWorkflow.js`
- `app/src/logic/workflows/proposals/cancelProposalWorkflow.js`
**Line:** Entire files
**Issue:** Two workflow files for cancel proposal in different directories. Need to verify which is canonical.
**Affected Pages:** /guest-proposals, /view-split-lease
**Priority:** HIGH

**Current State:**
Need to read both files to determine which to keep.

**Refactored Code:**
1. **INVESTIGATE** both files to determine complete version
2. **DELETE** duplicate
3. **UPDATE** imports

**Testing:**
- [ ] Read both workflow files
- [ ] Determine canonical version
- [ ] Update all imports
- [ ] Verify cancel proposal flow works

~~~~~

## PAGE GROUP: Shared/Multiple Pages (Chunks: 17, 18)

### CHUNK 17: Inconsistent Parameter Patterns
**Files:** Multiple files across calculators and rules
**Issue:** Some functions use object destructuring `({ param1, param2 })`, others use positional parameters `(param1, param2)`. This inconsistency makes the API harder to use.
**Affected Pages:** All pages using logic functions
**Priority:** LOW (large scope)

**Examples:**
```javascript
// Object destructuring (preferred):
export function calculateCheckInOutDays({ selectedDays }) { ... }

// Positional parameters (inconsistent):
export function getNextOccurrenceOfDay(startDate, targetDayOfWeek) { ... }
```

**Refactored Pattern:**
All public functions should use object destructuring for:
- Self-documenting calls: `fn({ days: [1,2,3] })` vs `fn([1,2,3])`
- Easier to extend with optional params
- Consistent with project conventions

**Testing:**
- [ ] Document pattern in CLAUDE.md
- [ ] Gradually migrate positional functions in future PRs

~~~~~

### CHUNK 18: Date Calculation Utilities Should Be Consolidated
**Files:**
- `app/src/logic/calculators/scheduling/calculateCheckInOutDays.js` (line 72)
- `app/src/logic/calculators/scheduling/calculateNextAvailableCheckIn.js` (line 61)
- `app/src/logic/calculators/scheduling/shiftMoveInDateIfPast.js` (line 56)
- `app/src/logic/calculators/scheduling/getNextOccurrenceOfDay.js` (line 10)
**Issue:** Multiple files use the same modulo pattern for day-of-week calculation: `(targetDay - currentDay + 7) % 7`. Should be a shared utility.
**Affected Pages:** /search, /guest-proposals
**Priority:** LOW

**Current Code (duplicated pattern):**
```javascript
// In multiple files:
const daysUntil = (targetDayOfWeek - currentDayOfWeek + 7) % 7
```

**Refactored Code:**
```javascript
// New utility in app/src/lib/dayUtils.js:
/**
 * Calculate days until target day of week
 * @param {number} fromDay - Current day (0-6)
 * @param {number} toDay - Target day (0-6)
 * @returns {number} Days until target (0-6)
 */
export function daysUntilDayOfWeek(fromDay, toDay) {
  return (toDay - fromDay + 7) % 7
}

// Usage:
import { daysUntilDayOfWeek } from '../../../lib/dayUtils.js'
const daysUntil = daysUntilDayOfWeek(currentDayOfWeek, targetDayOfWeek)
```

**Testing:**
- [ ] Add to existing dayUtils.js
- [ ] Update scheduling calculators to use utility
- [ ] Verify date calculations remain correct

---

## Summary by Priority

### CRITICAL (Fix Immediately)
| Chunk | Issue | File |
|-------|-------|------|
| 2 | Duplicate processProposalData files | `processors/proposal/` vs `processors/proposals/` |
| 4 | Duplicate import statement | `proposalRules.js:352-358` |
| 6 | Broken import path | `proposalButtonRules.js:1` |

### HIGH (Fix This Sprint)
| Chunk | Issue | File |
|-------|-------|------|
| 3 | Duplicate canCancelProposal | `canCancelProposal.js` vs `proposalRules.js` |
| 5 | Silent error handling | `extractListingCoordinates.js:42-69` |
| 12 | Wrap-around detection bug | `calculateCheckInOutFromDays.js:14-16` |
| 15 | Duplicate cancelProposalWorkflow | `booking/` vs `proposals/` |

### MEDIUM (Fix Next Sprint)
| Chunk | Issue | File |
|-------|-------|------|
| 1 | Duplicate JSON parsing | `hasListingPhotos.js:34-40` |
| 7 | Inconsistent status access | `proposalRules.js` (13 locations) |
| 8 | Legacy VM_STATES aliases | `virtualMeetingRules.js:34-36` |
| 10 | Hardcoded reminder statuses | `reminderValidation.js:56,131` |
| 11 | Hardcoded reminder statuses | `reminderScheduling.js:112` |
| 16 | Missing search constants | `isValidPriceTier.js`, etc. |

### LOW (Backlog)
| Chunk | Issue | File |
|-------|-------|------|
| 9 | JSON parsing duplication | `virtualMeetingRules.js:44-61` |
| 13 | Review score edge case | `calculateReviewScore.js:33-37` |
| 14 | Mixed responsibilities | `proposalStatuses.js` (384 lines) |
| 17 | Inconsistent param patterns | Multiple files |
| 18 | Date calculation duplication | Multiple scheduling files |

---

## File References

### Files to Modify
- `app/src/logic/rules/search/hasListingPhotos.js`
- `app/src/logic/processors/listing/extractListingCoordinates.js`
- `app/src/logic/calculators/scheduling/calculateCheckInOutFromDays.js`
- `app/src/logic/rules/proposals/proposalRules.js`
- `app/src/logic/rules/proposals/proposalButtonRules.js`
- `app/src/logic/rules/proposals/virtualMeetingRules.js`
- `app/src/logic/rules/reminders/reminderValidation.js`
- `app/src/logic/rules/reminders/reminderScheduling.js`
- `app/src/logic/calculators/reviews/calculateReviewScore.js`

### Files to Delete
- `app/src/logic/processors/proposal/processProposalData.js` (duplicate)
- One of: `app/src/logic/workflows/booking/cancelProposalWorkflow.js` OR `app/src/logic/workflows/proposals/cancelProposalWorkflow.js`

### Files to Create
- `app/src/logic/constants/reminderConstants.js`
- `app/src/logic/constants/searchConstants.js` (may already exist - verify)

### Files with High Dependencies (Change with Caution)
- `app/src/logic/constants/proposalStatuses.js` (21 dependents)
