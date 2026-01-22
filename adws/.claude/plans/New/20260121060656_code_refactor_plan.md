# Code Refactoring Plan - ../app

Date: 2026-01-21
Audit Type: general

---

## Executive Summary

This plan addresses **12 refactoring chunks** organized by affected page groups. The primary issues identified are:

1. **Code Duplication** - formatPrice, isContiguousSelection, formatDate, processProposalData
2. **Deprecated Files** - Files marked deprecated but still present
3. **Dead Code** - Unused exports with 0 imports
4. **Security Concern** - Debug exports in production code
5. **Console Logging** - Excessive debug statements

**Total Chunks:** 12
**Estimated Affected Files:** 25+
**Safe Leaf Files Identified:** 5

---

## Dependency Impact Summary

Files marked **CRITICAL (30+ dependents)** - DO NOT MODIFY:
- `src/lib/supabase.js` (93 dependents)
- `src/lib/secureStorage.js` (89 dependents) - except security fix
- `src/lib/auth.js` (79 dependents)
- `src/lib/constants.js` (52 dependents)

Files in this plan are LEAF or LOW IMPACT (< 15 dependents).

~~~~~

## PAGE GROUP: GLOBAL (Chunks: 1, 2, 3, 4, 5)

These chunks affect multiple pages or are foundational utilities.

~~~~~

### CHUNK 1: Consolidate formatPrice to canonical implementation
**File:** `src/lib/formatters/priceFormatter.js` (NEW FILE)
**Line:** N/A (new file)
**Issue:** 5+ implementations of formatPrice with inconsistent signatures and behavior
**Affected Pages:** /view-split-lease, /guest-proposals, /host-proposals, /search
**Cascading Changes Required:**
- `src/lib/priceCalculations.js` - re-export from new location
- `src/lib/proposals/dataTransformers.js` - import from new location
- `src/islands/shared/SuggestedProposals/components/PriceDisplay.jsx` - import from new location
- `src/islands/shared/PriceDisplay.jsx` - import from new location

**Current Code (lib/priceCalculations.js:73-85):**
```javascript
export function formatPrice(amount, showCents = false) {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '$0';
  }
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: showCents ? 2 : 0,
    maximumFractionDigits: showCents ? 2 : 0
  }).format(num);
}
```

**Current Code (proposals/dataTransformers.js:216-228):**
```javascript
export function formatPrice(price, includeCents = true) {
  if (price === null || price === undefined) return null;
  const numericPrice = typeof price === 'string' ? parseFloat(price) : price;
  if (isNaN(numericPrice)) return null;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: includeCents ? 2 : 0,
    maximumFractionDigits: includeCents ? 2 : 0
  }).format(numericPrice);
}
```

**Refactored Code (NEW: src/lib/formatters/priceFormatter.js):**
```javascript
/**
 * @fileoverview Canonical price formatting utility.
 * Consolidates multiple formatPrice implementations across the codebase.
 *
 * @module lib/formatters/priceFormatter
 */

/**
 * Formats a numeric amount as USD currency string.
 *
 * @param {number|string|null|undefined} amount - The amount to format
 * @param {Object} options - Formatting options
 * @param {boolean} [options.showCents=false] - Whether to display cents
 * @param {string|null} [options.fallback='$0'] - Value to return for invalid input (null returns null)
 * @returns {string|null} Formatted price string or fallback
 *
 * @example
 * formatPrice(1234.56) // "$1,235"
 * formatPrice(1234.56, { showCents: true }) // "$1,234.56"
 * formatPrice(null) // "$0"
 * formatPrice(null, { fallback: null }) // null
 */
export function formatPrice(amount, { showCents = false, fallback = '$0' } = {}) {
  if (amount === null || amount === undefined) {
    return fallback;
  }

  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

  if (isNaN(numericAmount)) {
    return fallback;
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: showCents ? 2 : 0,
    maximumFractionDigits: showCents ? 2 : 0
  }).format(numericAmount);
}

/**
 * Formats price with cents (convenience wrapper).
 * @param {number|string|null|undefined} amount - The amount to format
 * @returns {string|null} Formatted price with cents
 */
export function formatPriceWithCents(amount) {
  return formatPrice(amount, { showCents: true });
}
```

**Testing:**
- [ ] Verify formatPrice(1234.56) returns "$1,235"
- [ ] Verify formatPrice(1234.56, { showCents: true }) returns "$1,234.56"
- [ ] Verify formatPrice(null) returns "$0"
- [ ] Verify formatPrice(null, { fallback: null }) returns null
- [ ] Verify formatPrice("1234.56") handles string input
- [ ] Run build to check for import errors
- [ ] Visual check price displays on /view-split-lease

~~~~~

### CHUNK 2: Update priceCalculations.js to re-export formatPrice
**File:** `src/lib/priceCalculations.js`
**Line:** 73-85
**Issue:** Local implementation should be replaced with re-export to maintain backward compatibility
**Affected Pages:** /view-split-lease, /search
**Cascading Changes Required:** None (re-export maintains API)

**Current Code:**
```javascript
export function formatPrice(amount, showCents = false) {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '$0';
  }
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: showCents ? 2 : 0,
    maximumFractionDigits: showCents ? 2 : 0
  }).format(num);
}
```

**Refactored Code:**
```javascript
// Re-export canonical formatPrice for backward compatibility
// Consumers importing from priceCalculations.js continue to work
import { formatPrice as _formatPrice } from './formatters/priceFormatter.js';

/**
 * @deprecated Import from 'lib/formatters/priceFormatter.js' instead
 * @param {number|string} amount
 * @param {boolean} showCents
 * @returns {string}
 */
export function formatPrice(amount, showCents = false) {
  return _formatPrice(amount, { showCents });
}
```

**Testing:**
- [ ] Verify existing imports from priceCalculations.js still work
- [ ] Run build to check for type errors

~~~~~

### CHUNK 3: Update dataTransformers.js to use canonical formatPrice
**File:** `src/lib/proposals/dataTransformers.js`
**Line:** 216-228
**Issue:** Duplicate formatPrice implementation with different fallback behavior
**Affected Pages:** /guest-proposals, /host-proposals

**Current Code:**
```javascript
export function formatPrice(price, includeCents = true) {
  if (price === null || price === undefined) return null;
  const numericPrice = typeof price === 'string' ? parseFloat(price) : price;
  if (isNaN(numericPrice)) return null;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: includeCents ? 2 : 0,
    maximumFractionDigits: includeCents ? 2 : 0
  }).format(numericPrice);
}
```

**Refactored Code:**
```javascript
// Re-export canonical formatPrice with null fallback for backward compatibility
import { formatPrice as _formatPrice } from '../formatters/priceFormatter.js';

/**
 * @deprecated Import from 'lib/formatters/priceFormatter.js' instead
 * @param {number|string|null} price
 * @param {boolean} includeCents
 * @returns {string|null}
 */
export function formatPrice(price, includeCents = true) {
  return _formatPrice(price, { showCents: includeCents, fallback: null });
}
```

**Testing:**
- [ ] Verify formatPrice(null) returns null (not '$0')
- [ ] Verify formatPrice(1234, false) returns "$1,234"
- [ ] Run build to check for errors

~~~~~

### CHUNK 4: Remove deprecated re-export file - lib/constants/proposalStatuses.js
**File:** `src/lib/constants/proposalStatuses.js`
**Line:** 1-15
**Issue:** Deprecated re-export file that just forwards to canonical location
**Affected Pages:** GLOBAL (verify no direct imports first)
**Cascading Changes Required:** Check for and update any direct imports

**Current Code:**
```javascript
/**
 * @deprecated This file is deprecated. Import from 'logic/constants/proposalStatuses.js' instead.
 * This file exists only for backward compatibility.
 */

// Re-export everything from the canonical location
export * from '../../logic/constants/proposalStatuses.js';

// Also export the default if there is one
export { default } from '../../logic/constants/proposalStatuses.js';
```

**Refactored Code:**
```javascript
// FILE DELETED - No longer needed
// All imports should use: import { ... } from 'logic/constants/proposalStatuses.js'
```

**Pre-Deletion Verification:**
```bash
# Run this to verify no direct imports
grep -rn "from.*lib/constants/proposalStatuses" app/src/
grep -rn "from.*lib\\\\constants\\\\proposalStatuses" app/src/
```

**Testing:**
- [ ] Verify no files import from lib/constants/proposalStatuses
- [ ] Run build to verify no missing imports
- [ ] Check all proposal-related pages load correctly

~~~~~

### CHUNK 5: Remove dead code - hasProfilePhoto.js (0 imports)
**File:** `src/logic/rules/users/hasProfilePhoto.js`
**Line:** 1-47
**Issue:** Function is well-documented but has 0 imports anywhere in the codebase
**Affected Pages:** None (dead code)

**Current Code:**
```javascript
/**
 * @fileoverview User profile photo validation rule
 *
 * Determines whether a user has a valid profile photo set.
 * Handles various edge cases: null, undefined, empty string, placeholder URLs.
 *
 * @module logic/rules/users/hasProfilePhoto
 */

/**
 * Checks if a user has a valid profile photo URL
 *
 * @param {Object} params - Function parameters
 * @param {string|null|undefined} params.photoUrl - The user's profile photo URL
 * @returns {boolean} True if user has a valid, non-placeholder photo
 *
 * @example
 * hasProfilePhoto({ photoUrl: 'https://storage.example.com/photo.jpg' }) // true
 * hasProfilePhoto({ photoUrl: null }) // false
 * hasProfilePhoto({ photoUrl: '' }) // false
 * hasProfilePhoto({ photoUrl: 'placeholder.png' }) // false
 */
export function hasProfilePhoto({ photoUrl }) {
  // Null/undefined check
  if (photoUrl === null || photoUrl === undefined) {
    return false;
  }

  // Empty string check
  if (typeof photoUrl === 'string' && photoUrl.trim() === '') {
    return false;
  }

  // Placeholder URL patterns to reject
  const placeholderPatterns = [
    /placeholder/i,
    /default.*avatar/i,
    /no.*photo/i,
    /blank.*profile/i
  ];

  for (const pattern of placeholderPatterns) {
    if (pattern.test(photoUrl)) {
      return false;
    }
  }

  return true;
}
```

**Refactored Code:**
```javascript
// FILE DELETED - Unused code with 0 imports
// If needed in future, re-implement with proper integration
```

**Pre-Deletion Verification:**
```bash
# Verify 0 imports
grep -rn "hasProfilePhoto" app/src/
```

**Testing:**
- [ ] Verify grep returns 0 results (except the file itself)
- [ ] Run build to confirm no missing imports

~~~~~

## PAGE GROUP: /view-split-lease (Chunks: 6, 7)

~~~~~

### CHUNK 6: Consolidate isContiguousSelection implementations
**File:** `src/lib/availabilityValidation.js`
**Line:** 26-77
**Issue:** Duplicate implementation of isContiguousSelection; canonical is in logic/rules/scheduling/isScheduleContiguous.js
**Affected Pages:** /view-split-lease, /search

**Current Code:**
```javascript
export function isContiguousSelection(selectedDays) {
  if (!selectedDays || selectedDays.length === 0) return false;
  if (selectedDays.length === 1) return true;

  const sortedDays = [...selectedDays].sort((a, b) => a - b);

  // Check if days wrap around week (e.g., Fri, Sat, Sun, Mon)
  const hasWeekWrap = sortedDays.includes(0) && sortedDays.includes(6);

  if (hasWeekWrap) {
    // Split into two groups: days touching 0 and days touching 6
    const lowDays = sortedDays.filter(d => d <= 3);
    const highDays = sortedDays.filter(d => d >= 4);

    // Check both groups are internally contiguous
    for (let i = 1; i < lowDays.length; i++) {
      if (lowDays[i] - lowDays[i - 1] !== 1) return false;
    }
    for (let i = 1; i < highDays.length; i++) {
      if (highDays[i] - highDays[i - 1] !== 1) return false;
    }

    // Check that high group ends at 6 and low group starts at 0
    if (highDays.length > 0 && highDays[highDays.length - 1] !== 6) return false;
    if (lowDays.length > 0 && lowDays[0] !== 0) return false;

    return true;
  }

  // Standard contiguity check
  for (let i = 1; i < sortedDays.length; i++) {
    if (sortedDays[i] - sortedDays[i - 1] !== 1) return false;
  }

  return true;
}
```

**Refactored Code:**
```javascript
// Re-export from canonical location for backward compatibility
import { isScheduleContiguous } from '../logic/rules/scheduling/isScheduleContiguous.js';

/**
 * @deprecated Import { isScheduleContiguous } from 'logic/rules/scheduling/isScheduleContiguous.js' instead
 * @param {number[]} selectedDays - Array of day indices (0-6)
 * @returns {boolean}
 */
export function isContiguousSelection(selectedDays) {
  return isScheduleContiguous({ selectedDays });
}
```

**Testing:**
- [ ] Verify isContiguousSelection([0, 1, 2]) returns true
- [ ] Verify isContiguousSelection([0, 5, 6]) returns true (week wrap)
- [ ] Verify isContiguousSelection([1, 3, 5]) returns false
- [ ] Run build and check /view-split-lease day selection

~~~~~

### CHUNK 7: Remove duplicate isContiguousSelection in calculators
**File:** `src/logic/calculators/scheduling/isContiguousSelection.js`
**Line:** 1-31
**Issue:** Duplicate of logic/rules/scheduling/isScheduleContiguous.js
**Affected Pages:** /view-split-lease (if any imports exist)

**Current Code:**
```javascript
/**
 * Checks if selected days form a contiguous block
 * @param {number[]} selectedDays - Array of day indices (0=Sun, 6=Sat)
 * @returns {boolean}
 */
export function isContiguousSelection(selectedDays) {
  if (!selectedDays || selectedDays.length === 0) return false;
  if (selectedDays.length === 1) return true;

  const sorted = [...selectedDays].sort((a, b) => a - b);

  // Check for week wrap
  if (sorted.includes(0) && sorted.includes(6)) {
    // Complex week-wrap logic...
  }

  // Linear check
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] - sorted[i - 1] !== 1) return false;
  }
  return true;
}
```

**Refactored Code:**
```javascript
// FILE DELETED - Use logic/rules/scheduling/isScheduleContiguous.js instead

// If any imports exist, they should be updated to:
// import { isScheduleContiguous } from '../../rules/scheduling/isScheduleContiguous.js';
```

**Pre-Deletion Verification:**
```bash
grep -rn "from.*calculators/scheduling/isContiguousSelection" app/src/
```

**Testing:**
- [ ] Verify no files import from this location
- [ ] Run build to confirm

~~~~~

## PAGE GROUP: /guest-proposals, /host-proposals (Chunks: 8, 9)

~~~~~

### CHUNK 8: Consolidate processProposalData implementations
**File:** `src/logic/processors/proposal/processProposalData.js` (singular directory)
**Line:** 1-149
**Issue:** Two versions exist in `proposals/` (plural) and `proposal/` (singular) with different signatures
**Affected Pages:** /guest-proposals, /host-proposals, /view-split-lease
**Cascading Changes Required:**
- Check all imports and standardize to `proposals/` (plural) directory

**Current Code (proposal/ - singular):**
```javascript
export function processProposalData({ rawProposal, listing = null, guest = null, host = null }) {
  // Named parameters version - 149 lines
}
```

**Current Code (proposals/ - plural):**
```javascript
export function processProposalData(rawProposal) {
  // Positional parameter version - 291 lines
}
```

**Refactored Code:**
Keep `proposals/` (plural) as canonical, update to support optional named params:

```javascript
// In src/logic/processors/proposals/processProposalData.js

/**
 * Processes raw proposal data into standardized format.
 *
 * @param {Object|{rawProposal: Object}} input - Either raw proposal object OR options object
 * @param {Object} [input.rawProposal] - Raw proposal data (when using named params)
 * @param {Object} [input.listing] - Associated listing data
 * @param {Object} [input.guest] - Guest user data
 * @param {Object} [input.host] - Host user data
 * @returns {Object} Processed proposal data
 */
export function processProposalData(input) {
  // Detect if called with named params or positional
  const isNamedParams = input && typeof input === 'object' && 'rawProposal' in input;

  const rawProposal = isNamedParams ? input.rawProposal : input;
  const listing = isNamedParams ? input.listing : null;
  const guest = isNamedParams ? input.guest : null;
  const host = isNamedParams ? input.host : null;

  // ... existing processing logic ...
}
```

Delete `src/logic/processors/proposal/` directory after migration.

**Testing:**
- [ ] Verify processProposalData(rawData) still works (positional)
- [ ] Verify processProposalData({ rawProposal, listing }) works (named)
- [ ] Check /guest-proposals page loads
- [ ] Check /host-proposals page loads

~~~~~

### CHUNK 9: Remove duplicate proposal directory (singular)
**File:** `src/logic/processors/proposal/` (entire directory)
**Line:** N/A (directory removal)
**Issue:** Inconsistent naming - should use `proposals/` (plural) to match other directories
**Affected Pages:** /guest-proposals, /host-proposals

**Current Structure:**
```
src/logic/processors/
├── proposal/           # SINGULAR - to be removed
│   └── processProposalData.js
└── proposals/          # PLURAL - canonical
    └── processProposalData.js
```

**Refactored Structure:**
```
src/logic/processors/
└── proposals/          # PLURAL - canonical
    └── processProposalData.js
```

**Pre-Deletion Steps:**
1. Update any imports from `proposal/` to `proposals/`
2. Verify build passes
3. Delete `proposal/` directory

**Testing:**
- [ ] Grep for imports from `processors/proposal/` (not proposals)
- [ ] Update all found imports
- [ ] Run build
- [ ] Delete directory

~~~~~

## PAGE GROUP: SECURITY (Chunks: 10)

~~~~~

### CHUNK 10: Conditionally export __DEV__ debug utilities
**File:** `src/lib/secureStorage.js`
**Line:** 409-417
**Issue:** Debug export with comment "REMOVE IN PRODUCTION" but still present
**Affected Pages:** GLOBAL (security concern)

**Current Code:**
```javascript
/**
 * Export for debugging (REMOVE IN PRODUCTION)
 */
export const __DEV__ = {
  dumpSecureStorage() {
    return {
      token: getAuthToken(),
      sessionId: getSessionId(),
      refreshData: getRefreshData()
    };
  }
};
```

**Refactored Code:**
```javascript
/**
 * Debug utilities - only available in development mode.
 * These are tree-shaken out of production builds by Vite.
 */
export const __DEV__ = import.meta.env.DEV ? {
  /**
   * Dumps current secure storage state for debugging.
   * @returns {Object} Current auth state (token, sessionId, refreshData)
   */
  dumpSecureStorage() {
    return {
      token: getAuthToken(),
      sessionId: getSessionId(),
      refreshData: getRefreshData()
    };
  }
} : Object.freeze({});
```

**Testing:**
- [ ] Verify __DEV__.dumpSecureStorage works in dev mode
- [ ] Run production build and verify __DEV__ is empty object
- [ ] Check no console errors accessing __DEV__ in production

~~~~~

## PAGE GROUP: CODE QUALITY (Chunks: 11, 12)

~~~~~

### CHUNK 11: Remove dead code - shouldShowFullName.js
**File:** `src/logic/rules/users/shouldShowFullName.js`
**Line:** 1-35
**Issue:** 0 imports found - unused rule function
**Affected Pages:** None (dead code)

**Current Code:**
```javascript
/**
 * @fileoverview Rule for determining when to show user's full name
 *
 * @module logic/rules/users/shouldShowFullName
 */

/**
 * Determines if a user's full name should be displayed based on context.
 *
 * @param {Object} params
 * @param {boolean} params.isVerified - Whether user is verified
 * @param {boolean} params.hasActiveBooking - Whether viewing in context of active booking
 * @param {boolean} params.isHost - Whether the user is a host
 * @returns {boolean} True if full name should be shown
 */
export function shouldShowFullName({ isVerified, hasActiveBooking, isHost }) {
  // Hosts always show full name
  if (isHost) return true;

  // Verified users with active booking show full name
  if (isVerified && hasActiveBooking) return true;

  // Default: show first name only
  return false;
}
```

**Refactored Code:**
```javascript
// FILE DELETED - No imports found
// Re-implement if needed with proper integration point
```

**Pre-Deletion Verification:**
```bash
grep -rn "shouldShowFullName" app/src/
```

**Testing:**
- [ ] Verify grep returns 0 results (except file itself)
- [ ] Run build

~~~~~

### CHUNK 12: Remove deprecated cancelProposalWorkflow.js re-export
**File:** `src/logic/workflows/booking/cancelProposalWorkflow.js`
**Line:** 1-20
**Issue:** Deprecated file that only re-exports from another location
**Affected Pages:** /guest-proposals, /host-proposals (verify imports first)

**Current Code:**
```javascript
/**
 * @deprecated This file is deprecated.
 * Import from 'logic/workflows/proposals/cancelProposalWorkflow.js' instead.
 *
 * This re-export exists only for backward compatibility during migration.
 */

export { cancelProposalWorkflow } from '../proposals/cancelProposalWorkflow.js';
export { default } from '../proposals/cancelProposalWorkflow.js';
```

**Refactored Code:**
```javascript
// FILE DELETED
// All imports should use: import { cancelProposalWorkflow } from 'logic/workflows/proposals/cancelProposalWorkflow.js'
```

**Pre-Deletion Verification:**
```bash
grep -rn "from.*workflows/booking/cancelProposalWorkflow" app/src/
```

**Testing:**
- [ ] Verify no imports from this deprecated location
- [ ] Run build
- [ ] Test cancel functionality on /guest-proposals

~~~~~

## Summary

| Chunk | File | Type | Impact | Status |
|-------|------|------|--------|--------|
| 1 | lib/formatters/priceFormatter.js | NEW | GLOBAL | Pending |
| 2 | lib/priceCalculations.js | MODIFY | LOW | Pending |
| 3 | lib/proposals/dataTransformers.js | MODIFY | LOW | Pending |
| 4 | lib/constants/proposalStatuses.js | DELETE | LOW | Pending |
| 5 | logic/rules/users/hasProfilePhoto.js | DELETE | NONE | Pending |
| 6 | lib/availabilityValidation.js | MODIFY | LOW | Pending |
| 7 | logic/calculators/scheduling/isContiguousSelection.js | DELETE | NONE | Pending |
| 8 | logic/processors/proposals/processProposalData.js | MODIFY | MEDIUM | Pending |
| 9 | logic/processors/proposal/ | DELETE DIR | LOW | Pending |
| 10 | lib/secureStorage.js | MODIFY | CRITICAL* | Pending |
| 11 | logic/rules/users/shouldShowFullName.js | DELETE | NONE | Pending |
| 12 | logic/workflows/booking/cancelProposalWorkflow.js | DELETE | LOW | Pending |

*Note: Chunk 10 modifies a CRITICAL impact file but the change is isolated to the __DEV__ export and improves security.

---

## File References

### Files to CREATE:
- `src/lib/formatters/priceFormatter.js`

### Files to MODIFY:
- `src/lib/priceCalculations.js`
- `src/lib/proposals/dataTransformers.js`
- `src/lib/availabilityValidation.js`
- `src/logic/processors/proposals/processProposalData.js`
- `src/lib/secureStorage.js`

### Files to DELETE:
- `src/lib/constants/proposalStatuses.js`
- `src/logic/rules/users/hasProfilePhoto.js`
- `src/logic/calculators/scheduling/isContiguousSelection.js`
- `src/logic/rules/users/shouldShowFullName.js`
- `src/logic/workflows/booking/cancelProposalWorkflow.js`
- `src/logic/processors/proposal/` (entire directory)

### Canonical Files (DO NOT MODIFY - referenced only):
- `src/logic/rules/scheduling/isScheduleContiguous.js`
- `src/logic/constants/proposalStatuses.js`
- `src/logic/workflows/proposals/cancelProposalWorkflow.js`
