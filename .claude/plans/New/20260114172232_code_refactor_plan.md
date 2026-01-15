# Code Refactoring Plan - app/src/logic

Date: 2026-01-14
Audit Type: general
Scope: app/src/logic/**/*.js (52 files scanned)

~~~~~

## PAGE GROUP: /search, /view-split-lease, /favorites (Chunks: 1, 2, 3, 4)

### CHUNK 1: Corrupted JSDoc in getNextOccurrenceOfDay.js
**File:** app/src/logic/calculators/scheduling/getNextOccurrenceOfDay.js
**Line:** 4-5
**Issue:** JSDoc parameter annotations are corrupted with file path garbage from a deprecated context file. This breaks documentation tools and IDE intellisense.
**Affected Pages:** /search, /view-split-lease, /favorites

**Current Code:**
```javascript
/**
 * Calculate the next occurrence of a specific day-of-week on or after a starting date.
 *
 * @.claude\plans\Deprecated\Context\Option Sets\ZEP - Curation Parameters(OS).md {Date} startDate - The date to start searching from.
 * @.claude\plans\Deprecated\Context\Option Sets\ZEP - Curation Parameters(OS).md {number} targetDayOfWeek - Day index (0-6, where 0=Sunday).
 * @returns {Date} The next occurrence of the target day.
 */
```

**Refactored Code:**
```javascript
/**
 * Calculate the next occurrence of a specific day-of-week on or after a starting date.
 *
 * @param {Date} startDate - The date to start searching from.
 * @param {number} targetDayOfWeek - Day index (0-6, where 0=Sunday).
 * @returns {Date} The next occurrence of the target day.
 */
```

**Testing:**
- [ ] Run IDE intellisense check on functions using getNextOccurrenceOfDay
- [ ] Verify documentation renders correctly in JSDoc output

~~~~~

### CHUNK 2: Missing Input Validation in getNextOccurrenceOfDay.js
**File:** app/src/logic/calculators/scheduling/getNextOccurrenceOfDay.js
**Line:** 8-16
**Issue:** No parameter validation. Calling `getDay()` on invalid date will cause silent failures. Violates the "No Fallback" principle stated in the logic core index.js (line 14).
**Affected Pages:** /search, /view-split-lease, /favorites

**Current Code:**
```javascript
export function getNextOccurrenceOfDay(startDate, targetDayOfWeek) {
  const startDay = startDate.getDay();
  const daysToAdd = (targetDayOfWeek - startDay + 7) % 7;

  const resultDate = new Date(startDate);
  resultDate.setDate(startDate.getDate() + daysToAdd);
  resultDate.setHours(0, 0, 0, 0);

  return resultDate;
}
```

**Refactored Code:**
```javascript
export function getNextOccurrenceOfDay(startDate, targetDayOfWeek) {
  // No Fallback: Validate startDate
  if (!(startDate instanceof Date) || isNaN(startDate.getTime())) {
    throw new Error(
      `getNextOccurrenceOfDay: startDate must be a valid Date object, got ${typeof startDate}`
    )
  }

  // No Fallback: Validate targetDayOfWeek
  if (typeof targetDayOfWeek !== 'number' || isNaN(targetDayOfWeek) || targetDayOfWeek < 0 || targetDayOfWeek > 6) {
    throw new Error(
      `getNextOccurrenceOfDay: targetDayOfWeek must be 0-6, got ${targetDayOfWeek}`
    )
  }

  const startDay = startDate.getDay();
  const daysToAdd = (targetDayOfWeek - startDay + 7) % 7;

  const resultDate = new Date(startDate);
  resultDate.setDate(startDate.getDate() + daysToAdd);
  resultDate.setHours(0, 0, 0, 0);

  return resultDate;
}
```

**Testing:**
- [ ] Add unit tests for invalid Date input
- [ ] Add unit tests for out-of-range targetDayOfWeek
- [ ] Verify calculateNextAvailableCheckIn still works correctly

~~~~~

### CHUNK 3: Corrupted JSDoc in isContiguousSelection.js
**File:** app/src/logic/calculators/scheduling/isContiguousSelection.js
**Line:** 5
**Issue:** JSDoc parameter annotation is corrupted with file path garbage. Same issue as CHUNK 1.
**Affected Pages:** /search, /view-split-lease

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
 */
```

**Testing:**
- [ ] Verify IDE intellisense shows correct parameter types

~~~~~

### CHUNK 4: Missing Strict Validation in isContiguousSelection.js
**File:** app/src/logic/calculators/scheduling/isContiguousSelection.js
**Line:** 8-11
**Issue:** Function silently returns false for invalid inputs instead of throwing errors. Inconsistent with the strict validation pattern used in isScheduleContiguous.js (lines 28-52). Violates "No Fallback" principle.
**Affected Pages:** /search, /view-split-lease

**Current Code:**
```javascript
export function isContiguousSelection(selectedDays) {
  if (!selectedDays || selectedDays.length === 0) return false;
  if (selectedDays.length === 1) return true;
  if (selectedDays.length >= 6) return true;
```

**Refactored Code:**
```javascript
export function isContiguousSelection(selectedDays) {
  // No Fallback: Validate input type
  if (!Array.isArray(selectedDays)) {
    throw new Error(
      `isContiguousSelection: selectedDays must be an array, got ${typeof selectedDays}`
    )
  }

  // Empty array is technically invalid for contiguous check
  if (selectedDays.length === 0) {
    throw new Error('isContiguousSelection: selectedDays cannot be empty')
  }

  // Validate all day indices
  for (const day of selectedDays) {
    if (typeof day !== 'number' || isNaN(day) || day < 0 || day > 6) {
      throw new Error(
        `isContiguousSelection: Invalid day index ${day}, must be 0-6`
      )
    }
  }

  if (selectedDays.length === 1) return true;
  if (selectedDays.length >= 6) return true;
```

**Testing:**
- [ ] Add unit tests for null/undefined input (expect throw)
- [ ] Add unit tests for invalid day indices (expect throw)
- [ ] Verify all callers handle potential throws

~~~~~

## PAGE GROUP: /guest-proposals, /host-proposals (Chunks: 5, 6, 7, 8)

### CHUNK 5: React Hook in Logic Core Violates Architecture
**File:** app/src/logic/rules/proposals/useProposalButtonStates.js
**Line:** 1, 11
**Issue:** This file imports React and uses useMemo hook, violating the architecture principle stated in logic/index.js line 12: "No React dependencies". Logic Core must be pure JavaScript with no framework dependencies.
**Affected Pages:** /guest-proposals

**Current Code:**
```javascript
import { useMemo } from 'react';
import { getStatusConfig, PROPOSAL_STATUS } from '../../../config/proposalStatusConfig.js';

export function useProposalButtonStates({ proposal, virtualMeeting, guest, listing, currentUserId }) {
  return useMemo(() => {
    if (!proposal) {
      return {
        virtualMeeting: { visible: false },
        guestAction1: { visible: false },
        guestAction2: { visible: false },
        cancelProposal: { visible: false },
      };
    }
    // ... rest of logic
  }, [proposal, virtualMeeting, guest, listing, currentUserId]);
}
```

**Refactored Code:**
```javascript
// FILE: app/src/logic/rules/proposals/proposalButtonStates.js (NEW - pure logic)
import { getStatusConfig, PROPOSAL_STATUS } from '../../../config/proposalStatusConfig.js';

/**
 * Compute button states for a proposal card.
 * Pure function - no React dependencies.
 *
 * @param {object} params
 * @param {object} params.proposal - The proposal object
 * @param {object} params.virtualMeeting - Virtual meeting data
 * @param {object} params.guest - Guest user object
 * @param {object} params.listing - Listing object
 * @param {string} params.currentUserId - Current user's ID
 * @returns {object} Button states for virtualMeeting, guestAction1, guestAction2, cancelProposal
 */
export function getProposalButtonStates({ proposal, virtualMeeting, guest, listing, currentUserId }) {
  if (!proposal) {
    return {
      virtualMeeting: { visible: false },
      guestAction1: { visible: false },
      guestAction2: { visible: false },
      cancelProposal: { visible: false },
    };
  }
  // ... rest of logic (move entire function body here)
}
```

```javascript
// FILE: app/src/islands/hooks/useProposalButtonStates.js (NEW - React wrapper)
import { useMemo } from 'react';
import { getProposalButtonStates } from '../../logic/rules/proposals/proposalButtonStates.js';

/**
 * React hook wrapper for proposal button state computation.
 * Memoizes the pure function result.
 */
export function useProposalButtonStates(params) {
  return useMemo(
    () => getProposalButtonStates(params),
    [params.proposal, params.virtualMeeting, params.guest, params.listing, params.currentUserId]
  );
}
```

**Testing:**
- [ ] Update all imports in islands/ to use the new hook location
- [ ] Verify button states render correctly on guest proposals page
- [ ] Add unit tests for getProposalButtonStates (pure function)

~~~~~

### CHUNK 6: Duplicate Proposal Processors - Naming Collision
**File:** app/src/logic/processors/index.js
**Line:** 25, 28-39
**Issue:** Two separate implementations of `processProposalData` exist with different signatures and return structures. The index.js exports both with confusing aliases (`processFullProposalData`). This creates maintenance burden and potential bugs.
**Affected Pages:** /guest-proposals, /host-proposals

**Current Code:**
```javascript
// Proposal Processors
export { processProposalData } from './proposal/processProposalData.js'

// Proposal Processors - Extended (from new implementation)
export {
  processUserData as processProposalUserData,
  processListingData,
  processHostData,
  processVirtualMeetingData,
  processProposalData as processFullProposalData,
  getProposalDisplayText,
  formatPrice,
  formatDate,
  formatDateTime,
  getEffectiveTerms
} from './proposals/processProposalData.js'
```

**Refactored Code:**
```javascript
// Proposal Processors - Consolidated
// NOTE: processProposalData from ./proposal/ is the PRIMARY implementation
// for transforming raw Supabase data with terms merging logic
export { processProposalData } from './proposal/processProposalData.js'

// Proposal Utility Processors (formatting and display helpers)
export {
  processListingData,
  processHostData,
  processVirtualMeetingData,
  getProposalDisplayText,
  formatPrice,
  formatDate,
  formatDateTime,
  getEffectiveTerms
} from './proposals/processProposalData.js'

// DEPRECATED: processFullProposalData - use processProposalData instead
// Keeping export for backward compatibility, will be removed in next major version
export { processProposalData as processFullProposalData } from './proposals/processProposalData.js'

// User data processor - renamed to avoid collision with user/processUserData.js
export { processUserData as processProposalUserData } from './proposals/processProposalData.js'
```

**Testing:**
- [ ] Search codebase for `processFullProposalData` usage and update
- [ ] Verify proposal loading still works correctly
- [ ] Add deprecation warning console.log in processFullProposalData

~~~~~

### CHUNK 7: Silent Error Swallowing in hasListingPhotos.js
**File:** app/src/logic/rules/search/hasListingPhotos.js
**Line:** 38-40
**Issue:** JSON parse error caught and swallowed silently without any logging. Consumer has no way to know parsing failed. Violates "No Fallback" principle - should at least log the error.
**Affected Pages:** /search

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
  // Handle string representation (JSON array from database)
  if (typeof photos === 'string') {
    try {
      const parsed = JSON.parse(photos)
      if (!Array.isArray(parsed)) {
        console.warn('hasListingPhotos: Photos field parsed but is not an array', {
          listingId: listing._id || 'unknown',
          parsedType: typeof parsed
        })
        return false
      }
      return parsed.length > 0
    } catch (error) {
      console.error('hasListingPhotos: Failed to parse photos field as JSON', {
        listingId: listing._id || 'unknown',
        rawValue: photos.substring(0, 100), // Truncate for logging
        error: error.message
      })
      return false
    }
  }
```

**Testing:**
- [ ] Add unit test with malformed JSON string
- [ ] Verify console.error is called with details
- [ ] Check search results still filter correctly

~~~~~

### CHUNK 8: Fallback to Hardcoded Values in getCancellationReasonOptions
**File:** app/src/logic/rules/proposals/proposalRules.js
**Line:** 297-317
**Issue:** Function has fallback to hardcoded values when cache is empty. While documented, this violates the "No Fallback" principle. Should throw or use a more explicit pattern.
**Affected Pages:** /guest-proposals

**Current Code:**
```javascript
export function getCancellationReasonOptions() {
  const cachedReasons = getGuestCancellationReasons();

  if (cachedReasons.length > 0) {
    return cachedReasons.map(r => r.reason);
  }

  // Fallback for initial render before cache is populated
  // Note: If logging is needed for empty cache, the caller (workflow layer) should handle it
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
 * Default cancellation reasons - used as explicit constant, not hidden fallback
 */
export const DEFAULT_CANCELLATION_REASONS = [
  'Found another property',
  'Changed move-in dates',
  'Changed budget',
  'Changed location preference',
  'No longer need housing',
  'Host not responsive',
  'Terms not acceptable',
  'Other'
];

/**
 * Get available cancellation reason options for guests
 * Returns cached reasons if available, throws if cache not initialized
 *
 * @param {object} options - Options object
 * @param {boolean} options.allowDefaults - If true, use DEFAULT_CANCELLATION_REASONS when cache empty
 * @returns {Array<string>} Array of reason option strings
 * @throws {Error} If cache empty and allowDefaults is false
 */
export function getCancellationReasonOptions({ allowDefaults = true } = {}) {
  const cachedReasons = getGuestCancellationReasons();

  if (cachedReasons.length > 0) {
    return cachedReasons.map(r => r.reason);
  }

  if (allowDefaults) {
    console.warn('getCancellationReasonOptions: Using default reasons - cache not populated');
    return DEFAULT_CANCELLATION_REASONS;
  }

  throw new Error(
    'getCancellationReasonOptions: Cancellation reasons cache is empty and defaults not allowed'
  );
}
```

**Testing:**
- [ ] Update callers to pass `{ allowDefaults: true }` explicitly
- [ ] Add unit test for empty cache scenario
- [ ] Verify cancel proposal modal shows reasons

~~~~~

## PAGE GROUP: /view-split-lease (Chunks: 9, 10)

### CHUNK 9: Mutable Variable Reassignment in extractListingCoordinates.js
**File:** app/src/logic/processors/listing/extractListingCoordinates.js
**Line:** 39-40, 54, 67
**Issue:** Variables `parsedSlightlyDifferent` and `parsedAddress` are reassigned multiple times using `let`, violating the immutability principle in FP architecture.
**Affected Pages:** /view-split-lease, /search

**Current Code:**
```javascript
  // Parse JSONB fields if they're strings
  let parsedSlightlyDifferent = locationSlightlyDifferent
  let parsedAddress = locationAddress

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

  if (typeof locationAddress === 'string') {
    try {
      parsedAddress = JSON.parse(locationAddress)
    } catch (error) {
      console.error('❌ extractListingCoordinates: Failed to parse Location - Address:', {
        listingId,
        rawValue: locationAddress,
        error: error.message
      })
      parsedAddress = null
    }
  }
```

**Refactored Code:**
```javascript
/**
 * Parse a location JSONB field that may be a string or object.
 * @param {string|object|null} value - The location value to parse
 * @param {string} fieldName - Field name for error logging
 * @param {string} listingId - Listing ID for error logging
 * @returns {object|null} Parsed location object or null
 */
function parseLocationField(value, fieldName, listingId) {
  if (value === null || value === undefined) {
    return null
  }

  if (typeof value === 'object') {
    return value
  }

  if (typeof value === 'string') {
    try {
      return JSON.parse(value)
    } catch (error) {
      console.error(`❌ extractListingCoordinates: Failed to parse ${fieldName}:`, {
        listingId,
        rawValue: value.substring(0, 100),
        error: error.message
      })
      return null
    }
  }

  return null
}

export function extractListingCoordinates({
  locationSlightlyDifferent,
  locationAddress,
  listingId
}) {
  // No Fallback: Validate listing ID
  if (!listingId || typeof listingId !== 'string') {
    throw new Error(
      `extractListingCoordinates: listingId is required and must be a string`
    )
  }

  // Parse JSONB fields immutably
  const parsedSlightlyDifferent = parseLocationField(
    locationSlightlyDifferent,
    'Location - slightly different address',
    listingId
  )
  const parsedAddress = parseLocationField(
    locationAddress,
    'Location - Address',
    listingId
  )

  // Priority 1: Check slightly different address
  // ... rest unchanged
```

**Testing:**
- [ ] Verify map coordinates display correctly on listing page
- [ ] Add unit test for string parsing
- [ ] Add unit test for malformed JSON string

~~~~~

### CHUNK 10: Fallback Default in processUserData.js
**File:** app/src/logic/processors/user/processUserData.js
**Line:** 56-59
**Issue:** Uses "Guest User" as fallback when no name fields exist. This violates the "No Fallback" principle - missing name data is a data quality issue that should be surfaced, not hidden.
**Affected Pages:** /view-split-lease, /guest-proposals, /host-proposals

**Current Code:**
```javascript
    } else {
      // Use a default for users without any name fields
      fullName = 'Guest User'
      console.warn(`processUserData: User ${rawUser._id} has no name fields, using default`)
    }
```

**Refactored Code:**
```javascript
    } else {
      // No Fallback: Missing name is a data quality issue that must be addressed
      throw new Error(
        `processUserData: User ${rawUser._id} has no name fields (Name - Full, Name - First, or Name - Last). ` +
        `This indicates a data integrity issue that should be fixed at the source.`
      )
    }
```

**Testing:**
- [ ] Verify users with name fields still process correctly
- [ ] Add migration script to fix users without name fields
- [ ] Add data validation check in Supabase

~~~~~

## PAGE GROUP: /search (Chunks: 11, 12)

### CHUNK 11: Silent Error in parseSuggestedDates (virtualMeetingRules.js)
**File:** app/src/logic/rules/proposals/virtualMeetingRules.js
**Line:** 51-61
**Issue:** JSON.parse error is swallowed silently, returning empty array. This hides data quality issues.
**Affected Pages:** /guest-proposals, /host-proposals

**Current Code:**
```javascript
function parseSuggestedDates(suggestedDates) {
  if (!suggestedDates) return [];

  // If already an array, return as-is
  if (Array.isArray(suggestedDates)) return suggestedDates;

  // If it's a string, try to parse it as JSON
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
/**
 * Parse suggested dates - handles both array and JSON string formats
 * @param {Array|string} suggestedDates - Dates as array or JSON string
 * @param {string} [virtualMeetingId] - VM ID for error logging
 * @returns {Array} Array of date strings
 */
function parseSuggestedDates(suggestedDates, virtualMeetingId = 'unknown') {
  if (!suggestedDates) return [];

  // If already an array, return as-is
  if (Array.isArray(suggestedDates)) return suggestedDates;

  // If it's a string, try to parse it as JSON
  if (typeof suggestedDates === 'string') {
    try {
      const parsed = JSON.parse(suggestedDates);
      if (!Array.isArray(parsed)) {
        console.warn('parseSuggestedDates: Parsed value is not an array', {
          virtualMeetingId,
          parsedType: typeof parsed
        });
        return [];
      }
      return parsed;
    } catch (error) {
      console.error('parseSuggestedDates: Failed to parse JSON string', {
        virtualMeetingId,
        rawValue: suggestedDates.substring(0, 100),
        error: error.message
      });
      return [];
    }
  }

  console.warn('parseSuggestedDates: Unexpected type', {
    virtualMeetingId,
    type: typeof suggestedDates
  });
  return [];
}
```

**Testing:**
- [ ] Add unit test for malformed JSON
- [ ] Verify VM state detection still works
- [ ] Check console logs appear with correct details

~~~~~

### CHUNK 12: Inefficient Array Creation in isScheduleContiguous.js
**File:** app/src/logic/rules/scheduling/isScheduleContiguous.js
**Line:** 94-97
**Issue:** Creates unnecessary intermediate array using `Array.from` when a simpler range check would suffice. Minor performance impact but inconsistent with FP principles of minimal computation.
**Affected Pages:** /search, /view-split-lease

**Current Code:**
```javascript
    // Generate expected contiguous range for not-selected days
    const expectedNotSelected = Array.from(
      { length: maxNotSelected - minNotSelected + 1 },
      (_, i) => minNotSelected + i
    )

    // If not-selected days are contiguous, then selected days wrap around properly
    const notSelectedContiguous = notSelectedDays.length === expectedNotSelected.length &&
      notSelectedDays.every((day, index) => day === expectedNotSelected[index])
```

**Refactored Code:**
```javascript
    // Check if not-selected days form a contiguous range without creating intermediate array
    // Range is contiguous if: count === (max - min + 1) AND each element equals its expected position
    const expectedCount = maxNotSelected - minNotSelected + 1
    const notSelectedContiguous = notSelectedDays.length === expectedCount &&
      notSelectedDays.every((day, index) => day === minNotSelected + index)
```

**Testing:**
- [ ] Add performance benchmark for wrap-around case
- [ ] Verify all existing unit tests still pass
- [ ] Test edge cases: [0,6], [5,6,0,1,2]

~~~~~

## PAGE GROUP: AUTO (Shared/Utility) (Chunks: 13, 14)

### CHUNK 13: Magic Strings for Proposal Status
**File:** app/src/logic/processors/proposal/processProposalData.js
**Line:** 63
**Issue:** Uses 'Draft' as magic string fallback instead of importing from constants. This could lead to inconsistency if the status name changes.
**Affected Pages:** AUTO (all proposal-related pages)

**Current Code:**
```javascript
  const status = typeof rawProposal.Status === 'string'
    ? rawProposal.Status.trim()
    : (typeof rawProposal.status === 'string' ? rawProposal.status.trim() : 'Draft')
```

**Refactored Code:**
```javascript
import { PROPOSAL_STATUSES } from '../../constants/proposalStatuses.js'

// At the status determination point:
const rawStatus = rawProposal.Status || rawProposal.status
if (!rawStatus || typeof rawStatus !== 'string') {
  throw new Error(
    `processProposalData: Proposal ${rawProposal._id} has invalid Status field: ${rawStatus}`
  )
}
const status = rawStatus.trim()
```

**Testing:**
- [ ] Verify proposals with Status field process correctly
- [ ] Add unit test for missing Status field (expect throw)
- [ ] Check backward compatibility with lowercase 'status' field

~~~~~

### CHUNK 14: Inconsistent || Operator Usage in processors/proposals/processProposalData.js
**File:** app/src/logic/processors/proposals/processProposalData.js
**Line:** 18-37, 153-207
**Issue:** Heavy use of `||` operator for optional fields creates implicit fallbacks throughout the function. This violates the "No Fallback" principle. Should use explicit null checks or separate optional/required field handling.
**Affected Pages:** AUTO (all proposal-related pages)

**Current Code:**
```javascript
export function processUserData(rawUser) {
  if (!rawUser) {
    throw new Error('processUserData: User data is required');
  }

  if (!rawUser._id) {
    throw new Error('processUserData: User ID (_id) is required');
  }

  return {
    id: rawUser._id,
    firstName: rawUser['Name - First'] || null,
    lastName: rawUser['Name - Last'] || null,
    fullName: rawUser['Name - Full'] || null,
    profilePhoto: rawUser['Profile Photo'] || null,
    bio: rawUser['About Me / Bio'] || null,
    linkedInVerified: rawUser['Verify - Linked In ID'] || false,
    phoneVerified: rawUser['Verify - Phone'] || false,
    userVerified: rawUser['user verified?'] || false,
    proposalsList: rawUser['Proposals List'] || []
  };
}
```

**Refactored Code:**
```javascript
/**
 * Helper to extract optional string field
 * @param {object} obj - Source object
 * @param {string} key - Field key
 * @returns {string|null} Field value or null if missing/empty
 */
function getOptionalString(obj, key) {
  const value = obj[key]
  if (value === undefined || value === null || value === '') {
    return null
  }
  if (typeof value !== 'string') {
    console.warn(`processUserData: ${key} has unexpected type ${typeof value}`)
    return null
  }
  return value
}

/**
 * Helper to extract optional boolean field
 * @param {object} obj - Source object
 * @param {string} key - Field key
 * @returns {boolean} Field value or false if missing
 */
function getOptionalBoolean(obj, key) {
  return obj[key] === true
}

export function processUserData(rawUser) {
  if (!rawUser) {
    throw new Error('processUserData: User data is required');
  }

  if (!rawUser._id) {
    throw new Error('processUserData: User ID (_id) is required');
  }

  return {
    id: rawUser._id,
    firstName: getOptionalString(rawUser, 'Name - First'),
    lastName: getOptionalString(rawUser, 'Name - Last'),
    fullName: getOptionalString(rawUser, 'Name - Full'),
    profilePhoto: getOptionalString(rawUser, 'Profile Photo'),
    bio: getOptionalString(rawUser, 'About Me / Bio'),
    linkedInVerified: getOptionalBoolean(rawUser, 'Verify - Linked In ID'),
    phoneVerified: getOptionalBoolean(rawUser, 'Verify - Phone'),
    userVerified: getOptionalBoolean(rawUser, 'user verified?'),
    proposalsList: Array.isArray(rawUser['Proposals List']) ? rawUser['Proposals List'] : []
  };
}
```

**Testing:**
- [ ] Add unit tests for each field type
- [ ] Verify type warnings appear in console for unexpected types
- [ ] Check proposal loading still works end-to-end

~~~~~

## SUMMARY

| Priority | Chunk | Issue Type | File | Affected Pages |
|----------|-------|------------|------|----------------|
| CRITICAL | 1 | Documentation | getNextOccurrenceOfDay.js | /search, /view-split-lease, /favorites |
| CRITICAL | 2 | Validation | getNextOccurrenceOfDay.js | /search, /view-split-lease, /favorites |
| CRITICAL | 3 | Documentation | isContiguousSelection.js | /search, /view-split-lease |
| CRITICAL | 4 | Validation | isContiguousSelection.js | /search, /view-split-lease |
| HIGH | 5 | Architecture | useProposalButtonStates.js | /guest-proposals |
| HIGH | 6 | Duplication | processors/index.js | /guest-proposals, /host-proposals |
| MODERATE | 7 | Error Handling | hasListingPhotos.js | /search |
| MODERATE | 8 | Fallback | proposalRules.js | /guest-proposals |
| MODERATE | 9 | Mutability | extractListingCoordinates.js | /view-split-lease, /search |
| MODERATE | 10 | Fallback | processUserData.js | /view-split-lease, /guest-proposals |
| LOW | 11 | Error Handling | virtualMeetingRules.js | /guest-proposals, /host-proposals |
| LOW | 12 | Performance | isScheduleContiguous.js | /search, /view-split-lease |
| LOW | 13 | Magic Strings | processProposalData.js | AUTO |
| LOW | 14 | Consistency | proposals/processProposalData.js | AUTO |

~~~~~

## REFERENCED FILES

- app/src/logic/index.js (lines 12-18: architecture principles)
- app/src/logic/calculators/scheduling/getNextOccurrenceOfDay.js
- app/src/logic/calculators/scheduling/isContiguousSelection.js
- app/src/logic/calculators/scheduling/calculateNextAvailableCheckIn.js
- app/src/logic/rules/scheduling/isScheduleContiguous.js
- app/src/logic/rules/proposals/useProposalButtonStates.js
- app/src/logic/rules/proposals/proposalRules.js
- app/src/logic/rules/proposals/virtualMeetingRules.js
- app/src/logic/rules/search/hasListingPhotos.js
- app/src/logic/processors/index.js
- app/src/logic/processors/proposal/processProposalData.js
- app/src/logic/processors/proposals/processProposalData.js
- app/src/logic/processors/user/processUserData.js
- app/src/logic/processors/listing/extractListingCoordinates.js
- app/src/logic/constants/proposalStatuses.js
- app/src/islands/pages/SearchPage.jsx (consumer)
- app/src/islands/pages/useViewSplitLeasePageLogic.js (consumer)
- app/src/islands/pages/FavoriteListingsPage/FavoriteListingsPage.jsx (consumer)
- app/src/islands/pages/proposals/ProposalCard.jsx (consumer)
- app/src/islands/shared/useScheduleSelectorLogicCore.js (consumer)
