# Code Refactoring Plan - ../app

**Date:** 2026-01-20
**Audit Type:** general
**Total Chunks:** 15
**Estimated Files Affected:** 32

---

## Summary

| Category | Issue Count | Chunks |
|----------|-------------|--------|
| Dead Code (Delete) | 4 | 1-4 |
| Duplicate Formatters | 2 | 5-6 |
| Duplicate Constants | 1 | 7 |
| Duplicate Components | 1 | 8 |
| Duplicate Display Utils | 1 | 9 |
| God Component Extraction | 3 | 10-12 |
| Unused Exports Cleanup | 1 | 13 |
| Debug Statement Cleanup | 1 | 14 |
| Missing Error Boundaries | 1 | 15 |

---

## PAGE GROUP: GLOBAL (Chunks: 1, 2, 3, 4, 5, 6, 7)

These chunks affect shared code used across all pages.

~~~~~

### CHUNK 1: Delete duplicate `processProposalData.js` in wrong directory
**File:** `src/logic/processors/proposal/processProposalData.js`
**Line:** 1-148
**Issue:** Duplicate file exists - the correct version is in `proposals/` (plural) directory. This file has no imports pointing to it and is dead code.
**Affected Pages:** GLOBAL (proposals)
**Cascading Changes:** None - this file is unused

**Current Code:**
```javascript
/**
 * @file processProposalData.js
 * @description Processes raw proposal data from the database into display-ready format.
 * Follows the functional programming principles and four-layer logic architecture.
 */

import { getEffectiveTermsForProposal } from '../../../lib/proposals/terms';

/**
 * Calculates the nightly rate from total price and number of nights.
 * @param {number} totalPrice - The total price
 * @param {number} nights - Number of nights
 * @returns {number} - Nightly rate
 */
export const calculateNightlyRate = (totalPrice, nights) => {
  if (!nights || nights <= 0) return 0;
  return Math.round(totalPrice / nights);
};

// ... rest of file (148 lines total)
```

**Refactored Code:**
```javascript
// DELETE THIS FILE ENTIRELY
// The correct implementation is at: src/logic/processors/proposals/processProposalData.js
```

**Testing:**
- [ ] Run `grep -rn "processors/proposal/processProposalData" app/src/` to confirm no imports
- [ ] Delete file
- [ ] Run `bun run build` to confirm no breaking changes

~~~~~

### CHUNK 2: Delete duplicate `cancelProposalWorkflow.js` in booking directory
**File:** `src/logic/workflows/booking/cancelProposalWorkflow.js`
**Line:** 1-144
**Issue:** Duplicate file exists - the correct version is in `proposals/` directory and is actively imported. This file has a different signature and is unused.
**Affected Pages:** GLOBAL (proposals)
**Cascading Changes:** None - this file is unused

**Current Code:**
```javascript
/**
 * @file cancelProposalWorkflow.js
 * @description Handles the cancellation of proposals, including both user-initiated
 * cancellations and expired proposal handling.
 */

/**
 * Cancels a proposal and updates all related state
 * @param {Object} options - Options object
 * @param {string} options.proposalId - The ID of the proposal to cancel
 * @param {string} options.reason - The reason for cancellation
 * @param {Object} options.supabase - Supabase client instance
 * @returns {Promise<Object>} - Result of the cancellation
 */
export async function cancelProposal({ proposalId, reason, supabase }) {
  // Implementation uses supabase parameter
  // ...
}

// ... rest of file (144 lines total)
```

**Refactored Code:**
```javascript
// DELETE THIS FILE ENTIRELY
// The correct implementation is at: src/logic/workflows/proposals/cancelProposalWorkflow.js
```

**Testing:**
- [ ] Run `grep -rn "workflows/booking/cancelProposalWorkflow" app/src/` to confirm no imports
- [ ] Delete file
- [ ] Run `bun run build` to confirm no breaking changes

~~~~~

### CHUNK 3: Delete standalone `canCancelProposal.js` rule file
**File:** `src/logic/rules/proposals/canCancelProposal.js`
**Line:** 1-47
**Issue:** This standalone file defines `canCancelProposal` but the function is also defined in `proposalRules.js` which is the one actually imported elsewhere. This file is dead code.
**Affected Pages:** GLOBAL (proposals)
**Cascading Changes:** None - this file is unused

**Current Code:**
```javascript
/**
 * @file canCancelProposal.js
 * @description Rule to determine if a proposal can be cancelled
 */

import { PROPOSAL_STATUS } from '../../constants/proposalStatuses';

/**
 * Determines if a proposal can be cancelled.
 * A proposal can be cancelled if:
 * - It is not already cancelled
 * - It is not deleted
 * - It has a cancellable status (pending, negotiating)
 *
 * @param {Object} params - Parameters
 * @param {string} params.proposalStatus - Current status of the proposal
 * @param {boolean} params.deleted - Whether the proposal is deleted
 * @returns {boolean} - Whether the proposal can be cancelled
 */
export const canCancelProposal = ({ proposalStatus, deleted }) => {
  if (deleted) return false;

  const cancellableStatuses = [
    PROPOSAL_STATUS.PENDING,
    PROPOSAL_STATUS.NEGOTIATING,
    PROPOSAL_STATUS.ACCEPTED,
  ];

  return cancellableStatuses.includes(proposalStatus);
};

export default canCancelProposal;
```

**Refactored Code:**
```javascript
// DELETE THIS FILE ENTIRELY
// The canonical implementation is in: src/logic/rules/proposals/proposalRules.js
// Import from there: import { canCancelProposal } from '../rules/proposals/proposalRules';
```

**Testing:**
- [ ] Run `grep -rn "rules/proposals/canCancelProposal" app/src/` to confirm no direct imports
- [ ] Delete file
- [ ] Run `bun run build` to confirm no breaking changes

~~~~~

### CHUNK 4: Delete duplicate `ViewSplitLeasePage.jsx` at root of pages directory
**File:** `src/islands/pages/ViewSplitLeasePage.jsx`
**Line:** 1-2688
**Issue:** A duplicate file exists at the root of pages directory. The correct version is in `ViewSplitLeasePage/ViewSplitLeasePage.jsx` subdirectory. The subdirectory version is what's imported.
**Affected Pages:** /view-split-lease
**Cascading Changes:** None - this file is unused

**Current Code:**
```javascript
// This is a 2688 line duplicate file at:
// src/islands/pages/ViewSplitLeasePage.jsx
//
// The correct file is at:
// src/islands/pages/ViewSplitLeasePage/ViewSplitLeasePage.jsx (3030 lines)
```

**Refactored Code:**
```javascript
// DELETE THIS FILE ENTIRELY
// The correct implementation is at: src/islands/pages/ViewSplitLeasePage/ViewSplitLeasePage.jsx
```

**Testing:**
- [ ] Run `grep -rn "from.*islands/pages/ViewSplitLeasePage['\"]" app/src/` to verify imports use subdirectory
- [ ] Delete `src/islands/pages/ViewSplitLeasePage.jsx`
- [ ] Run `bun run build` to confirm no breaking changes

~~~~~

### CHUNK 5: Create canonical `formatPrice` utility and consolidate implementations
**File:** `src/lib/formatters.js` (NEW FILE)
**Line:** N/A (new file)
**Issue:** `formatPrice` function is duplicated in 19+ files. Need to create a single canonical implementation.
**Affected Pages:** GLOBAL (all price displays)
**Cascading Changes Required:**
- `src/logic/processors/proposals/processProposalData.js` (lines 209-220)
- `src/lib/proposals/dataTransformers.js` (line 219)
- `src/lib/priceCalculations.js` (line 78)
- `src/islands/shared/PriceDisplay.jsx` (lines 12-17)
- `src/islands/shared/SuggestedProposals/components/PriceDisplay.jsx` (lines 12-21)
- `src/islands/pages/proposals/displayUtils.js` (lines 22-30)
- `src/islands/pages/HostProposalsPage/formatters.js` (lines 10-16)
- `src/islands/pages/FavoriteListingsPage/formatters.js` (lines 94-103)

**Current Code:**
```javascript
// Example from src/islands/pages/proposals/displayUtils.js:22-30
export const formatCurrency = (amount) => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
};

// Example from src/logic/processors/proposals/processProposalData.js:209-220
const formatPrice = (price) => {
  if (price === null || price === undefined) return 'N/A';
  const numPrice = typeof price === 'number' ? price : parseFloat(price);
  if (isNaN(numPrice)) return 'N/A';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numPrice);
};
```

**Refactored Code:**
```javascript
// NEW FILE: src/lib/formatters.js

/**
 * @file formatters.js
 * @description Canonical formatting utilities for the application.
 * All price, date, and currency formatting should use these functions.
 */

/**
 * Formats a number as USD currency.
 * @param {number|string|null|undefined} amount - The amount to format
 * @param {Object} options - Formatting options
 * @param {boolean} options.showCents - Whether to show cents (default: false)
 * @param {string} options.fallback - Fallback value for invalid input (default: '$0')
 * @returns {string} - Formatted currency string
 */
export const formatPrice = (amount, { showCents = false, fallback = '$0' } = {}) => {
  if (amount === null || amount === undefined) return fallback;

  const num = typeof amount === 'number' ? amount : parseFloat(amount);
  if (isNaN(num)) return fallback;

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: showCents ? 2 : 0,
    maximumFractionDigits: showCents ? 2 : 0,
  }).format(num);
};

/**
 * Alias for formatPrice for backwards compatibility
 * @deprecated Use formatPrice instead
 */
export const formatCurrency = formatPrice;
```

**Testing:**
- [ ] Create new `src/lib/formatters.js` file
- [ ] Update imports in all affected files to use `import { formatPrice } from '../lib/formatters'`
- [ ] Remove local `formatPrice`/`formatCurrency` definitions from each file
- [ ] Run `bun run build` to verify
- [ ] Test price displays on /search, /view-split-lease, /host-proposals

~~~~~

### CHUNK 6: Create canonical `formatDate` utility and consolidate implementations
**File:** `src/lib/formatters.js` (ADD TO EXISTING)
**Line:** After formatPrice
**Issue:** `formatDate` function is duplicated in 23+ files with different output formats.
**Affected Pages:** GLOBAL (all date displays)
**Cascading Changes Required:**
- `src/logic/processors/proposals/processProposalData.js` (lines 227-239)
- `src/islands/pages/proposals/displayUtils.js` (lines 37-48)
- `src/islands/pages/HostProposalsPage/formatters.js` (lines 23-31)
- `src/islands/pages/FavoriteListingsPage/formatters.js` (lines 127-136)

**Current Code:**
```javascript
// Example from src/logic/processors/proposals/processProposalData.js:227-239
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

// Example from src/islands/pages/HostProposalsPage/formatters.js:23-31
export const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
};
```

**Refactored Code:**
```javascript
// ADD TO: src/lib/formatters.js

/**
 * Date format presets
 */
export const DATE_FORMATS = {
  SHORT: { month: 'short', day: 'numeric' },                    // "Jan 15"
  MEDIUM: { month: 'short', day: 'numeric', year: 'numeric' },  // "Jan 15, 2026"
  LONG: { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }, // "Mon, Jan 15, 2026"
  FULL: { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' },   // "Monday, January 15, 2026"
};

/**
 * Formats a date string or Date object.
 * @param {string|Date|null|undefined} date - The date to format
 * @param {Object} options - Formatting options
 * @param {Object} options.format - Intl.DateTimeFormat options (default: DATE_FORMATS.MEDIUM)
 * @param {string} options.fallback - Fallback value for invalid input (default: '')
 * @returns {string} - Formatted date string
 */
export const formatDate = (date, { format = DATE_FORMATS.MEDIUM, fallback = '' } = {}) => {
  if (!date) return fallback;

  const dateObj = date instanceof Date ? date : new Date(date);
  if (isNaN(dateObj.getTime())) return fallback;

  return dateObj.toLocaleDateString('en-US', format);
};

/**
 * Formats a date as a short string (e.g., "Jan 15")
 * @param {string|Date} date - The date to format
 * @returns {string} - Formatted date string
 */
export const formatDateShort = (date) => formatDate(date, { format: DATE_FORMATS.SHORT });

/**
 * Formats a date range
 * @param {string|Date} startDate - Start date
 * @param {string|Date} endDate - End date
 * @param {Object} options - Formatting options
 * @returns {string} - Formatted date range (e.g., "Jan 15 - Jan 22, 2026")
 */
export const formatDateRange = (startDate, endDate, { format = DATE_FORMATS.SHORT } = {}) => {
  const start = formatDate(startDate, { format });
  const end = formatDate(endDate, { format: DATE_FORMATS.MEDIUM });
  return `${start} - ${end}`;
};
```

**Testing:**
- [ ] Add functions to `src/lib/formatters.js`
- [ ] Update imports in all affected files
- [ ] Remove local `formatDate` definitions from each file
- [ ] Run `bun run build` to verify
- [ ] Test date displays on proposal pages, listings

~~~~~

### CHUNK 7: Consolidate `DAY_NAMES` constant to single source
**File:** `src/lib/dayUtils.js`
**Line:** 24-32
**Issue:** `DAY_NAMES` is defined in multiple places. Should import from single source.
**Affected Pages:** GLOBAL (all scheduling)
**Cascading Changes Required:**
- `src/logic/workflows/scheduling/validateScheduleWorkflow.js` (line 99)
- `src/logic/workflows/scheduling/validateMoveInDateWorkflow.js` (line 105)
- `src/islands/pages/proposals/displayUtils.js` (line 14)
- `src/islands/pages/WhySplitLeasePage.jsx` (line 506)

**Current Code:**
```javascript
// In src/lib/dayUtils.js:24-32
export const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

// In src/logic/workflows/scheduling/validateScheduleWorkflow.js:99
const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// In src/islands/pages/proposals/displayUtils.js:14
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
```

**Refactored Code:**
```javascript
// src/lib/dayUtils.js remains the canonical source (already exports DAY_NAMES)

// In src/logic/workflows/scheduling/validateScheduleWorkflow.js
// CHANGE line 99 FROM:
// const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
// TO:
import { DAY_NAMES } from '../../../lib/dayUtils';
// Then use DAY_NAMES instead of dayNames

// In src/islands/pages/proposals/displayUtils.js
// REMOVE line 14:
// const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
// ADD import:
import { DAY_NAMES } from '../../../lib/dayUtils';
```

**Testing:**
- [ ] Update imports in affected files
- [ ] Remove local DAY_NAMES definitions
- [ ] Run `bun run build` to verify
- [ ] Test scheduling displays

~~~~~

## PAGE GROUP: /view-split-lease, /search (Chunks: 8, 9)

~~~~~

### CHUNK 8: Consolidate duplicate `PriceDisplay` components
**File:** `src/islands/shared/SuggestedProposals/components/PriceDisplay.jsx`
**Line:** 1-43
**Issue:** Two PriceDisplay components exist with different implementations. The shared version (72 lines) is more complete.
**Affected Pages:** /view-split-lease (ListingScheduleSelector), SuggestedProposalPopup
**Cascading Changes Required:**
- `src/islands/shared/SuggestedProposals/components/SuggestedProposalItem.jsx`

**Current Code:**
```javascript
// src/islands/shared/SuggestedProposals/components/PriceDisplay.jsx (43 lines)
import React from 'react';

const formatPrice = (price) => {
  if (!price && price !== 0) return null;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
};

const PriceDisplay = ({ totalPrice, nightlyRate, nights }) => {
  const formattedTotal = formatPrice(totalPrice);
  const formattedNightly = formatPrice(nightlyRate);

  if (!formattedTotal) return null;

  return (
    <div className="price-display">
      <span className="total-price">{formattedTotal}</span>
      {nights && formattedNightly && (
        <span className="nightly-breakdown">
          ({formattedNightly}/night × {nights} nights)
        </span>
      )}
    </div>
  );
};

export default PriceDisplay;
```

**Refactored Code:**
```javascript
// DELETE src/islands/shared/SuggestedProposals/components/PriceDisplay.jsx

// In src/islands/shared/SuggestedProposals/components/SuggestedProposalItem.jsx
// CHANGE import FROM:
// import PriceDisplay from './PriceDisplay';
// TO:
import PriceDisplay from '../../PriceDisplay';

// The shared PriceDisplay at src/islands/shared/PriceDisplay.jsx should be used
// It already has more features and follows the same interface
```

**Testing:**
- [ ] Update import in SuggestedProposalItem.jsx
- [ ] Delete `src/islands/shared/SuggestedProposals/components/PriceDisplay.jsx`
- [ ] Run `bun run build` to verify
- [ ] Test SuggestedProposalPopup on /view-split-lease

~~~~~

### CHUNK 9: Delete page-specific formatters.js files
**Files:**
- `src/islands/pages/HostProposalsPage/formatters.js`
- `src/islands/pages/FavoriteListingsPage/formatters.js`
**Line:** Entire files
**Issue:** These page-specific formatter files duplicate functionality that should come from `src/lib/formatters.js`. After Chunk 5 and 6 are implemented, these can be deleted.
**Affected Pages:** /host-proposals, /favorite-listings
**Cascading Changes Required:**
- `src/islands/pages/HostProposalsPage/useHostProposalsPageLogic.js`
- `src/islands/pages/FavoriteListingsPage/useFavoriteListingsPageLogic.js`

**Current Code:**
```javascript
// src/islands/pages/HostProposalsPage/formatters.js (87 lines)
export const formatCurrency = (amount) => {
  // ... duplicate implementation
};

export const formatDate = (dateString) => {
  // ... duplicate implementation
};

export const formatShortDate = (dateString) => {
  // ... duplicate implementation
};

// src/islands/pages/FavoriteListingsPage/formatters.js (162 lines)
// Similar duplicate implementations
```

**Refactored Code:**
```javascript
// DELETE both formatters.js files

// In src/islands/pages/HostProposalsPage/useHostProposalsPageLogic.js
// CHANGE:
// import { formatCurrency, formatDate } from './formatters';
// TO:
import { formatPrice, formatDate } from '../../../lib/formatters';
// Then use formatPrice instead of formatCurrency

// In src/islands/pages/FavoriteListingsPage/useFavoriteListingsPageLogic.js
// CHANGE:
// import { formatCurrency, formatDate } from './formatters';
// TO:
import { formatPrice, formatDate } from '../../../lib/formatters';
```

**Testing:**
- [ ] Update imports in logic hooks
- [ ] Delete `src/islands/pages/HostProposalsPage/formatters.js`
- [ ] Delete `src/islands/pages/FavoriteListingsPage/formatters.js`
- [ ] Run `bun run build` to verify
- [ ] Test /host-proposals and /favorite-listings pages

~~~~~

## PAGE GROUP: /proposals (Chunks: 10)

~~~~~

### CHUNK 10: Consolidate proposals displayUtils.js to use shared formatters
**File:** `src/islands/pages/proposals/displayUtils.js`
**Line:** 1-274
**Issue:** This file contains duplicate formatting functions that should use shared utilities. After Chunks 5-7, most functions here become thin wrappers.
**Affected Pages:** /guest-proposals, /host-proposals (ProposalCard, ExpandableProposalCard)
**Cascading Changes Required:**
- `src/islands/pages/proposals/ProposalCard.jsx`
- `src/islands/pages/proposals/ExpandableProposalCard.jsx`

**Current Code:**
```javascript
// src/islands/pages/proposals/displayUtils.js (partial)
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const formatCurrency = (amount) => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
};

export const formatDate = (dateString, options = {}) => {
  // ... implementation
};

// Plus getStatusBadgeClass, getCounterStatusBadgeClass, etc.
```

**Refactored Code:**
```javascript
// src/islands/pages/proposals/displayUtils.js (refactored)
/**
 * @file displayUtils.js
 * @description Display utilities specific to proposal pages.
 * Uses shared formatters from lib/formatters.js for consistency.
 */

import { formatPrice, formatDate, DATE_FORMATS } from '../../../lib/formatters';
import { DAY_NAMES } from '../../../lib/dayUtils';

// Re-export shared formatters for backwards compatibility
export { formatPrice as formatCurrency, formatDate };

/**
 * Gets CSS class for proposal status badge
 * @param {string} status - Proposal status
 * @returns {string} - CSS class name
 */
export const getStatusBadgeClass = (status) => {
  const statusClasses = {
    pending: 'status-badge-pending',
    accepted: 'status-badge-accepted',
    declined: 'status-badge-declined',
    cancelled: 'status-badge-cancelled',
    expired: 'status-badge-expired',
    negotiating: 'status-badge-negotiating',
    confirmed: 'status-badge-confirmed',
  };
  return statusClasses[status?.toLowerCase()] || 'status-badge-default';
};

/**
 * Gets CSS class for counter offer status badge
 * @param {string} counterStatus - Counter offer status
 * @returns {string} - CSS class name
 */
export const getCounterStatusBadgeClass = (counterStatus) => {
  const statusClasses = {
    pending: 'counter-badge-pending',
    accepted: 'counter-badge-accepted',
    declined: 'counter-badge-declined',
    expired: 'counter-badge-expired',
  };
  return statusClasses[counterStatus?.toLowerCase()] || 'counter-badge-default';
};

/**
 * Formats selected days for display
 * @param {number[]} dayIndices - Array of 0-indexed day numbers
 * @returns {string} - Formatted day string (e.g., "Mon, Wed, Fri")
 */
export const formatSelectedDays = (dayIndices) => {
  if (!Array.isArray(dayIndices) || dayIndices.length === 0) return '';

  const sortedDays = [...dayIndices].sort((a, b) => a - b);
  return sortedDays
    .map(index => DAY_NAMES[index]?.slice(0, 3))
    .filter(Boolean)
    .join(', ');
};

/**
 * Gets human-readable status text
 * @param {string} status - Raw status
 * @returns {string} - Display text
 */
export const getStatusDisplayText = (status) => {
  const displayText = {
    pending: 'Pending',
    accepted: 'Accepted',
    declined: 'Declined',
    cancelled: 'Cancelled',
    expired: 'Expired',
    negotiating: 'Negotiating',
    confirmed: 'Confirmed',
    active: 'Active',
  };
  return displayText[status?.toLowerCase()] || status || 'Unknown';
};
```

**Testing:**
- [ ] Refactor `src/islands/pages/proposals/displayUtils.js` to use shared formatters
- [ ] Run `bun run build` to verify
- [ ] Test ProposalCard and ExpandableProposalCard rendering

~~~~~

## PAGE GROUP: /view-split-lease (Chunks: 11)

~~~~~

### CHUNK 11: Extract inline functions from ViewSplitLeasePage to useCallback
**File:** `src/islands/pages/ViewSplitLeasePage/ViewSplitLeasePage.jsx`
**Line:** Multiple inline function definitions
**Issue:** Multiple inline handler functions create new references on each render, potentially causing unnecessary re-renders in child components.
**Affected Pages:** /view-split-lease
**Cascading Changes:** None - changes are internal to component

**Current Code:**
```javascript
// Example from ViewSplitLeasePage.jsx - inline functions
const ViewSplitLeasePage = () => {
  // ... state declarations

  // Inline function - creates new reference each render
  const handleFavoriteClick = () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    toggleFavorite(listingId);
  };

  // Another inline function
  const handleShareClick = () => {
    setShowShareModal(true);
  };

  // And many more...

  return (
    <div>
      <button onClick={handleFavoriteClick}>Favorite</button>
      <button onClick={handleShareClick}>Share</button>
    </div>
  );
};
```

**Refactored Code:**
```javascript
// ViewSplitLeasePage.jsx - with useCallback
import { useCallback } from 'react';

const ViewSplitLeasePage = () => {
  // ... state declarations

  // Memoized handler - stable reference
  const handleFavoriteClick = useCallback(() => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    toggleFavorite(listingId);
  }, [user, listingId, toggleFavorite]);

  // Memoized handler
  const handleShareClick = useCallback(() => {
    setShowShareModal(true);
  }, []);

  return (
    <div>
      <button onClick={handleFavoriteClick}>Favorite</button>
      <button onClick={handleShareClick}>Share</button>
    </div>
  );
};
```

**Testing:**
- [ ] Identify all inline handlers in ViewSplitLeasePage.jsx
- [ ] Wrap each with useCallback and appropriate dependencies
- [ ] Run `bun run build` to verify
- [ ] Test /view-split-lease page interactions

~~~~~

## PAGE GROUP: /search (Chunks: 12)

~~~~~

### CHUNK 12: Extract inline functions from SearchPage to useCallback
**File:** `src/islands/pages/SearchPage.jsx`
**Line:** Multiple inline function definitions
**Issue:** Multiple inline handler functions create new references on each render.
**Affected Pages:** /search
**Cascading Changes:** None - changes are internal to component

**Current Code:**
```javascript
// SearchPage.jsx - inline functions
const SearchPage = () => {
  // ... state declarations

  // Inline function
  const handleFilterChange = (filters) => {
    setActiveFilters(filters);
    refetchListings();
  };

  // Inline function
  const handleMapMove = (bounds) => {
    setMapBounds(bounds);
  };

  // ... many more inline handlers
};
```

**Refactored Code:**
```javascript
// SearchPage.jsx - with useCallback
import { useCallback } from 'react';

const SearchPage = () => {
  // ... state declarations

  // Memoized handler
  const handleFilterChange = useCallback((filters) => {
    setActiveFilters(filters);
    refetchListings();
  }, [refetchListings]);

  // Memoized handler
  const handleMapMove = useCallback((bounds) => {
    setMapBounds(bounds);
  }, []);

  // ... refactor all inline handlers
};
```

**Testing:**
- [ ] Identify all inline handlers in SearchPage.jsx
- [ ] Wrap each with useCallback and appropriate dependencies
- [ ] Run `bun run build` to verify
- [ ] Test /search page interactions

~~~~~

## PAGE GROUP: GLOBAL - Auth Modal (Chunks: 13)

~~~~~

### CHUNK 13: Remove debug console.log statements from SignUpLoginModal
**File:** `src/islands/shared/SignUpLoginModal.jsx`
**Line:** Multiple (22+ console.log statements)
**Issue:** Debug logging statements with emojis should be removed for production.
**Affected Pages:** GLOBAL (all pages - modal is shared)
**Cascading Changes:** None - changes are internal to component

**Current Code:**
```javascript
// SignUpLoginModal.jsx - scattered debug logs
const SignUpLoginModal = ({ isOpen, onClose }) => {
  console.log('🔐 SignUpLoginModal mounted', { isOpen });

  const handleLogin = async () => {
    console.log('🔑 Login attempt started');
    try {
      const result = await signIn(email, password);
      console.log('✅ Login successful', result);
    } catch (error) {
      console.log('❌ Login failed', error);
      // ...
    }
  };

  // ... 20+ more console.log statements
};
```

**Refactored Code:**
```javascript
// SignUpLoginModal.jsx - debug logs removed
const SignUpLoginModal = ({ isOpen, onClose }) => {
  // Remove: console.log('🔐 SignUpLoginModal mounted', { isOpen });

  const handleLogin = async () => {
    // Remove: console.log('🔑 Login attempt started');
    try {
      const result = await signIn(email, password);
      // Remove: console.log('✅ Login successful', result);
    } catch (error) {
      // Keep error logging for production debugging, but without emoji
      console.error('Auth error:', error.message);
      // ...
    }
  };

  // Remove all other debug console.log statements
  // Keep only console.error for actual error conditions
};
```

**Testing:**
- [ ] Remove all `console.log` statements from SignUpLoginModal.jsx
- [ ] Keep `console.error` for actual errors (without emojis)
- [ ] Run `bun run build` to verify
- [ ] Test login/signup flows

~~~~~

## PAGE GROUP: GLOBAL - Debug Cleanup (Chunks: 14)

~~~~~

### CHUNK 14: Remove emoji debug logging from ViewSplitLeasePage
**File:** `src/islands/pages/ViewSplitLeasePage/ViewSplitLeasePage.jsx`
**Line:** 11-12 and others
**Issue:** Debug logging with emojis should be removed.
**Affected Pages:** /view-split-lease
**Cascading Changes:** None

**Current Code:**
```javascript
// ViewSplitLeasePage.jsx lines 11-12
console.log('🔄 ViewSplitLeasePage v4 - FavoriteButton ACTIVE');
console.log('📍 Component mounting...');

// And other debug statements throughout the file
```

**Refactored Code:**
```javascript
// Remove all debug console.log statements
// Keep only console.error for actual error conditions
```

**Testing:**
- [ ] Remove all `console.log` debug statements from ViewSplitLeasePage.jsx
- [ ] Run `bun run build` to verify
- [ ] Test /view-split-lease page

~~~~~

## PAGE GROUP: Multiple Pages - Error Handling (Chunks: 15)

~~~~~

### CHUNK 15: Add ErrorBoundary wrapper to pages missing it
**Files:** Multiple entry point files
**Line:** Component root level
**Issue:** Some page entry points don't use ErrorBoundary wrapper.
**Affected Pages:** Multiple (pages without error boundaries)
**Cascading Changes:** None

**Current Code:**
```javascript
// Example page without ErrorBoundary
// src/page-entry.jsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import SomePage from './islands/pages/SomePage';

const root = createRoot(document.getElementById('root'));
root.render(<SomePage />);
```

**Refactored Code:**
```javascript
// Page with ErrorBoundary
// src/page-entry.jsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import ErrorBoundary from './islands/shared/ErrorBoundary';
import SomePage from './islands/pages/SomePage';

const root = createRoot(document.getElementById('root'));
root.render(
  <ErrorBoundary>
    <SomePage />
  </ErrorBoundary>
);
```

**Testing:**
- [ ] Audit all entry point files in `src/` for ErrorBoundary usage
- [ ] Add ErrorBoundary wrapper where missing
- [ ] Run `bun run build` to verify
- [ ] Test error handling on affected pages

---

## Implementation Order

### Phase 1: Delete Dead Code (Chunks 1-4)
Safe deletions with no downstream impact:
1. Chunk 1: Delete duplicate `processProposalData.js`
2. Chunk 2: Delete duplicate `cancelProposalWorkflow.js`
3. Chunk 3: Delete standalone `canCancelProposal.js`
4. Chunk 4: Delete duplicate `ViewSplitLeasePage.jsx`

### Phase 2: Create Shared Utilities (Chunks 5-7)
Foundation for deduplication:
5. Chunk 5: Create `formatPrice` in `src/lib/formatters.js`
6. Chunk 6: Add `formatDate` to `src/lib/formatters.js`
7. Chunk 7: Consolidate `DAY_NAMES` imports

### Phase 3: Consolidate Components (Chunks 8-10)
Depends on Phase 2:
8. Chunk 8: Delete duplicate `PriceDisplay` component
9. Chunk 9: Delete page-specific `formatters.js` files
10. Chunk 10: Refactor `displayUtils.js` to use shared formatters

### Phase 4: Performance Optimization (Chunks 11-12)
Can run in parallel:
11. Chunk 11: Add useCallback to ViewSplitLeasePage handlers
12. Chunk 12: Add useCallback to SearchPage handlers

### Phase 5: Cleanup (Chunks 13-15)
Final polish:
13. Chunk 13: Remove debug logs from SignUpLoginModal
14. Chunk 14: Remove debug logs from ViewSplitLeasePage
15. Chunk 15: Add ErrorBoundary to pages missing it

---

## Files Referenced

### To Delete:
- `src/logic/processors/proposal/processProposalData.js`
- `src/logic/workflows/booking/cancelProposalWorkflow.js`
- `src/logic/rules/proposals/canCancelProposal.js`
- `src/islands/pages/ViewSplitLeasePage.jsx` (root level duplicate)
- `src/islands/shared/SuggestedProposals/components/PriceDisplay.jsx`
- `src/islands/pages/HostProposalsPage/formatters.js`
- `src/islands/pages/FavoriteListingsPage/formatters.js`

### To Create:
- `src/lib/formatters.js`

### To Modify:
- `src/logic/processors/proposals/processProposalData.js`
- `src/logic/workflows/scheduling/validateScheduleWorkflow.js`
- `src/logic/workflows/scheduling/validateMoveInDateWorkflow.js`
- `src/islands/pages/proposals/displayUtils.js`
- `src/islands/pages/ViewSplitLeasePage/ViewSplitLeasePage.jsx`
- `src/islands/pages/SearchPage.jsx`
- `src/islands/shared/SignUpLoginModal.jsx`
- `src/islands/pages/HostProposalsPage/useHostProposalsPageLogic.js`
- `src/islands/pages/FavoriteListingsPage/useFavoriteListingsPageLogic.js`
- `src/islands/shared/SuggestedProposals/components/SuggestedProposalItem.jsx`
- Various entry point files for ErrorBoundary

---

## Dependency Graph (Relevant Subset)

```
src/lib/formatters.js (NEW)
├── src/logic/processors/proposals/processProposalData.js
├── src/islands/pages/proposals/displayUtils.js
├── src/islands/pages/HostProposalsPage/useHostProposalsPageLogic.js
├── src/islands/pages/FavoriteListingsPage/useFavoriteListingsPageLogic.js
└── src/islands/shared/PriceDisplay.jsx

src/lib/dayUtils.js (EXISTING - canonical source for DAY_NAMES)
├── src/logic/workflows/scheduling/validateScheduleWorkflow.js
├── src/logic/workflows/scheduling/validateMoveInDateWorkflow.js
└── src/islands/pages/proposals/displayUtils.js

src/islands/shared/PriceDisplay.jsx (EXISTING - canonical component)
└── src/islands/shared/SuggestedProposals/components/SuggestedProposalItem.jsx
```

---

## Risk Assessment

| Chunk | Risk | Mitigation |
|-------|------|------------|
| 1-4 | LOW | Dead code deletion - verify no imports first |
| 5-6 | MEDIUM | New utility file - comprehensive import updates needed |
| 7 | LOW | Import consolidation only |
| 8 | LOW | Component consolidation - verify interface compatibility |
| 9 | MEDIUM | File deletion - ensure all imports updated first |
| 10 | MEDIUM | Logic changes - test proposal displays thoroughly |
| 11-12 | LOW | Performance optimization - no functional changes |
| 13-14 | LOW | Debug cleanup - no functional changes |
| 15 | LOW | Error handling improvement |
