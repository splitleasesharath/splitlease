# Code Refactoring Plan - ../app

Date: 2026-01-20
Audit Type: general

## Summary of Issues Found

This audit identified the following categories of issues:

1. **Duplicate proposalStages.js files** - Two nearly identical files exist in different locations
2. **Duplicate processProposalData.js files** - Two different implementations in logic/processors
3. **Duplicate formatPrice functions** - Multiple implementations across lib/ and islands/
4. **Duplicate formatDate functions** - 8+ different implementations scattered throughout codebase
5. **Duplicate formatCurrency functions** - Multiple implementations in formatters.js files
6. **Debug console.log statements** - FORCE RELOAD comments and debug logs in production code
7. **Deprecated re-export wrapper files** - Files that should be consolidated

~~~~~

## PAGE GROUP: /guest-proposals, /host-proposals, /view-split-lease (Chunks: 1, 2, 3)

### CHUNK 1: Remove duplicate proposalStages.js - consolidate to logic/constants
**File:** src/lib/constants/proposalStages.js
**Line:** 1-161
**Issue:** This file is a near-duplicate of `src/logic/constants/proposalStages.js` but with fewer functions. The logic/ version has additional functions like `getStageProgress`, `getCompletedStages`, `getRemainingStages`, `isStagePending`, `getPreviousStage`, `getNextStage`. The lib/ version should re-export from the canonical location.
**Affected Pages:** /guest-proposals, /host-proposals, /view-split-lease

**Current Code:**
```javascript
/**
 * Proposal Progress Stage Configuration System
 *
 * This module defines the 6 stages of the proposal-to-lease workflow,
 * replacing hardcoded stage arrays with rich configuration objects.
 *
 * Each stage includes:
 * - id: Stage number (1-6)
 * - name: Full stage name
 * - shortName: Abbreviated name for compact displays
 * - icon: Emoji or icon identifier
 * - description: User-friendly explanation of the stage
 * - helpText: Additional guidance for guests
 */

export const PROPOSAL_STAGES = [
  {
    id: 1,
    name: 'Proposal Submitted',
    shortName: 'Submitted',
    icon: '1',
    description: 'Your proposal has been submitted to the host',
    helpText: 'The next step is to complete your rental application so the host can review your profile.'
  },
  // ... (full content truncated for brevity)
];

export function getStageById(stageId) {
  if (!stageId || stageId < 1 || stageId > 6) {
    return null;
  }
  return PROPOSAL_STAGES.find(s => s.id === stageId) || null;
}

export function getStageByName(stageName) {
  if (!stageName) {
    return null;
  }
  const normalizedName = stageName.toLowerCase();
  return PROPOSAL_STAGES.find(
    s => s.name.toLowerCase() === normalizedName || s.shortName.toLowerCase() === normalizedName
  ) || null;
}

export function isStageCompleted(stageId, currentStage) {
  if (!stageId || !currentStage) {
    return false;
  }
  return stageId < currentStage;
}

export function isCurrentStage(stageId, currentStage) {
  if (!stageId || !currentStage) {
    return false;
  }
  return stageId === currentStage;
}

export function formatStageDisplay(stageId, currentStage) {
  const stage = getStageById(stageId);
  if (!stage) {
    return null;
  }

  let status = 'pending';
  let statusLabel = 'Pending';

  if (isStageCompleted(stageId, currentStage)) {
    status = 'completed';
    statusLabel = 'Completed';
  } else if (isCurrentStage(stageId, currentStage)) {
    status = 'current';
    statusLabel = 'In Progress';
  }

  return {
    ...stage,
    status,
    statusLabel,
    isCompleted: status === 'completed',
    isCurrent: status === 'current',
    isPending: status === 'pending'
  };
}

export function getAllStagesFormatted(currentStage) {
  return PROPOSAL_STAGES.map(stage => formatStageDisplay(stage.id, currentStage));
}
```

**Refactored Code:**
```javascript
/**
 * @deprecated This file re-exports from the canonical location.
 * Import directly from 'src/logic/constants/proposalStages.js' instead.
 */

export {
  PROPOSAL_STAGES,
  getStageById,
  getStageByName,
  getStageProgress,
  getCompletedStages,
  getRemainingStages,
  isStageCompleted,
  isCurrentStage,
  isStagePending,
  getPreviousStage,
  getNextStage,
  formatStageDisplay,
  getAllStagesFormatted
} from '../../logic/constants/proposalStages.js';
```

**Testing:**
- [ ] Verify all imports from lib/constants/proposalStages.js still work
- [ ] Check guest-proposals page loads correctly
- [ ] Check host-proposals page loads correctly
- [ ] Run build to verify no import errors

~~~~~

### CHUNK 2: Remove duplicate processProposalData - make proposal/ re-export from proposals/
**File:** src/logic/processors/proposal/processProposalData.js
**Line:** 1-149
**Issue:** Two files exist: `logic/processors/proposal/processProposalData.js` and `logic/processors/proposals/processProposalData.js`. The `proposals/` version is more comprehensive with additional functions like `processListingData`, `processHostData`, `processVirtualMeetingData`, `getProposalDisplayText`, `formatDate`, `formatDateTime`, `getEffectiveTerms`. The singular `proposal/` version should re-export from the canonical `proposals/` location.
**Affected Pages:** /guest-proposals, /host-proposals, /view-split-lease

**Current Code:**
```javascript
/**
 * Process raw proposal data from Supabase into a clean, validated proposal object.
 *
 * @intent Transform raw proposal rows from Supabase into consistent, UI-ready format.
 * @rule NO FALLBACK - Throws explicit errors for missing critical fields.
 * @rule Merges original terms and counteroffer (host-changed) terms into single current terms.
 * @rule Handles dual proposal system (original vs host counteroffer).
 */
import { PROPOSAL_STATUSES, getUsualOrder } from '../../constants/proposalStatuses.js'

export function processProposalData({ rawProposal, listing = null, guest = null, host = null }) {
  // No Fallback: Proposal data must exist
  if (!rawProposal) {
    throw new Error('processProposalData: rawProposal cannot be null or undefined')
  }

  // Validate critical ID field
  if (!rawProposal._id) {
    throw new Error('processProposalData: Proposal missing critical _id field')
  }

  // ... (implementation details)

  return {
    id: rawProposal._id,
    listingId: rawProposal.Listing,
    guestId: rawProposal.Guest,
    status,
    deleted: rawProposal.Deleted === true,
    usualOrder: getUsualOrder(status),
    currentTerms,
    originalTerms,
    hasCounteroffer: hasHostCounteroffer,
    virtualMeetingId: rawProposal['virtual meeting'] || null,
    houseManualAccessed: rawProposal['Did user access house manual?'] === true,
    cancellationReason: rawProposal['reason for cancellation'] || null,
    createdDate: rawProposal['Created Date'],
    modifiedDate: rawProposal['Modified Date'],
    _listing: listing,
    _guest: guest,
    _host: host
  }
}
```

**Refactored Code:**
```javascript
/**
 * @deprecated This file re-exports from the canonical location.
 * Import directly from 'src/logic/processors/proposals/processProposalData.js' instead.
 */

export {
  processProposalData,
  processListingData,
  processHostData,
  processVirtualMeetingData,
  getProposalDisplayText,
  formatDate,
  formatDateTime,
  getEffectiveTerms,
  formatPrice
} from '../proposals/processProposalData.js';
```

**Testing:**
- [ ] Verify loadProposalDetailsWorkflow still works
- [ ] Check imports in guest-proposals page
- [ ] Check imports in host-proposals page
- [ ] Run build to verify no import errors

~~~~~

### CHUNK 3: Remove debug console.log and FORCE RELOAD comment from ViewSplitLeasePage
**File:** src/islands/pages/ViewSplitLeasePage/ViewSplitLeasePage.jsx
**Line:** 10-12
**Issue:** Debug console.log statements and FORCE RELOAD comments should not be in production code. These were likely added during development and forgotten.
**Affected Pages:** /view-split-lease

**Current Code:**
```javascript
// FORCE RELOAD v4 - timestamp: 1768673500000
console.log('🔄 ViewSplitLeasePage v4 - FavoriteButton ACTIVE - ' + new Date().toISOString());
console.log('🔄 If you see this, the correct file is loaded!');
```

**Refactored Code:**
```javascript
// Component last updated: 2026-01-17 - Added FavoriteButton to price display section
```

**Testing:**
- [ ] Verify /view-split-lease page loads correctly
- [ ] Verify FavoriteButton still renders
- [ ] Check browser console has no unnecessary debug output

~~~~~

## PAGE GROUP: /guest-proposals (Chunks: 4, 5)

### CHUNK 4: Consolidate formatDate implementations - create centralized date formatting utility
**File:** src/islands/pages/proposals/displayUtils.js
**Line:** 37-48
**Issue:** There are 8+ different `formatDate` implementations across the codebase (in `displayUtils.js`, `HostProposalsPage/formatters.js`, `FavoriteListingsPage/formatters.js`, `logic/processors/proposals/processProposalData.js`, `lib/proposals/dataTransformers.js`, `HostEditingProposal/types.js`, `DateChangeRequestManager/dateUtils.js`). These should all use a single centralized utility. This file is a LEAF FILE (0 dependents) so safe to refactor.
**Affected Pages:** /guest-proposals

**Current Code:**
```javascript
/**
 * Format date for display
 * @param {string|Date} dateValue - Date to format
 * @returns {string} Formatted date string (e.g., "Jan 15, 2025")
 */
export function formatDate(dateValue) {
  if (!dateValue) return 'TBD';

  const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
  if (isNaN(date.getTime())) return 'TBD';

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}
```

**Refactored Code:**
```javascript
import { formatDateDisplay } from '../../../lib/dateFormatters.js';

/**
 * Format date for display
 * @param {string|Date} dateValue - Date to format
 * @returns {string} Formatted date string (e.g., "Jan 15, 2025")
 */
export function formatDate(dateValue) {
  return formatDateDisplay(dateValue, { fallback: 'TBD' });
}
```

**Testing:**
- [ ] Create new src/lib/dateFormatters.js with centralized date formatting
- [ ] Verify /guest-proposals page displays dates correctly
- [ ] Check that 'TBD' fallback still works for null/invalid dates

~~~~~

### CHUNK 5: Consolidate formatCurrency in displayUtils.js to use centralized utility
**File:** src/islands/pages/proposals/displayUtils.js
**Line:** 22-30
**Issue:** This `formatCurrency` function duplicates the one in `HostProposalsPage/formatters.js` and overlaps with `formatPrice` in `lib/priceCalculations.js`. Should use centralized utility.
**Affected Pages:** /guest-proposals

**Current Code:**
```javascript
/**
 * Format currency for display
 * @param {number|string} amount - Amount to format
 * @param {boolean} [showCents=false] - Whether to show cents
 * @returns {string} Formatted currency string
 */
export function formatCurrency(amount, showCents = false) {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num) || num === null || num === undefined) return '$0';

  if (showCents) {
    return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `$${Math.round(num).toLocaleString('en-US')}`;
}
```

**Refactored Code:**
```javascript
import { formatPrice } from '../../../lib/priceCalculations.js';

/**
 * Format currency for display
 * @param {number|string} amount - Amount to format
 * @param {boolean} [showCents=false] - Whether to show cents
 * @returns {string} Formatted currency string
 */
export function formatCurrency(amount, showCents = false) {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return formatPrice(num, showCents);
}
```

**Testing:**
- [ ] Verify /guest-proposals page displays prices correctly
- [ ] Check that '$0' fallback still works for null/invalid amounts
- [ ] Verify both cents and no-cents formatting works

~~~~~

## PAGE GROUP: /host-proposals (Chunks: 6, 7)

### CHUNK 6: Consolidate formatDate in HostProposalsPage/formatters.js
**File:** src/islands/pages/HostProposalsPage/formatters.js
**Line:** 23-31
**Issue:** Another duplicate `formatDate` implementation. This one formats as M/D/YY which is different from other implementations that use "Jan 15, 2025" format. This inconsistency should be resolved by using a centralized utility with format options.
**Affected Pages:** /host-proposals

**Current Code:**
```javascript
/**
 * Format a date as M/D/YY
 * @param {Date|string} date - The date to format
 * @returns {string} Formatted date string
 */
export function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const year = d.getFullYear().toString().slice(-2);
  return `${month}/${day}/${year}`;
}
```

**Refactored Code:**
```javascript
import { formatDateDisplay } from '../../../lib/dateFormatters.js';

/**
 * Format a date as M/D/YY
 * @param {Date|string} date - The date to format
 * @returns {string} Formatted date string
 */
export function formatDate(date) {
  return formatDateDisplay(date, { format: 'short', fallback: '' });
}
```

**Testing:**
- [ ] Verify /host-proposals page displays dates in M/D/YY format
- [ ] Check that empty string fallback works for null dates
- [ ] Ensure DateRange formatting still works

~~~~~

### CHUNK 7: Consolidate formatCurrency in HostProposalsPage/formatters.js
**File:** src/islands/pages/HostProposalsPage/formatters.js
**Line:** 10-16
**Issue:** Duplicate `formatCurrency` function that could use centralized `formatPrice` from lib/priceCalculations.js
**Affected Pages:** /host-proposals

**Current Code:**
```javascript
/**
 * Format a number as currency (USD)
 * @param {number} amount - The amount to format
 * @returns {string} Formatted currency string
 */
export function formatCurrency(amount) {
  if (amount == null || isNaN(amount)) return '0.00';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}
```

**Refactored Code:**
```javascript
import { formatPrice } from '../../../lib/priceCalculations.js';

/**
 * Format a number as currency (USD)
 * @param {number} amount - The amount to format
 * @returns {string} Formatted currency string (without $ sign, with cents)
 */
export function formatCurrency(amount) {
  if (amount == null || isNaN(amount)) return '0.00';
  // Note: formatPrice returns with $ sign, we strip it for backwards compatibility
  return formatPrice(amount, true).replace('$', '');
}
```

**Testing:**
- [ ] Verify /host-proposals page displays currency correctly
- [ ] Check that '0.00' fallback works for null amounts
- [ ] Ensure PricingRow component renders correctly

~~~~~

## PAGE GROUP: /favorite-listings (Chunks: 8, 9)

### CHUNK 8: Consolidate formatPrice in FavoriteListingsPage/formatters.js
**File:** src/islands/pages/FavoriteListingsPage/formatters.js
**Line:** 94-103
**Issue:** Duplicate `formatPrice` function that adds "/night" suffix. This could use the centralized `formatPrice` with an optional suffix parameter.
**Affected Pages:** /favorite-listings

**Current Code:**
```javascript
/**
 * Format price with currency symbol
 * @param {number} price - Price amount
 * @param {string} [currency='USD'] - Currency code
 * @returns {string} Formatted price string (e.g., "$1,029/night")
 */
export const formatPrice = (price, currency = 'USD') => {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  return `${formatter.format(price)}/night`;
};
```

**Refactored Code:**
```javascript
import { formatPrice as baseFormatPrice } from '../../../lib/priceCalculations.js';

/**
 * Format price with currency symbol and /night suffix
 * @param {number} price - Price amount
 * @param {string} [currency='USD'] - Currency code (currently only USD supported)
 * @returns {string} Formatted price string (e.g., "$1,029/night")
 */
export const formatPrice = (price, currency = 'USD') => {
  return `${baseFormatPrice(price, false)}/night`;
};
```

**Testing:**
- [ ] Verify /favorite-listings page displays prices with "/night" suffix
- [ ] Check ListingCard component renders correctly
- [ ] Ensure price fallback to "$0/night" works for invalid prices

~~~~~

### CHUNK 9: Consolidate formatDate in FavoriteListingsPage/formatters.js
**File:** src/islands/pages/FavoriteListingsPage/formatters.js
**Line:** 127-136
**Issue:** Another duplicate `formatDate` implementation that should use centralized utility.
**Affected Pages:** /favorite-listings

**Current Code:**
```javascript
/**
 * Format date for display
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date (e.g., "Jan 15, 2024")
 */
export const formatDate = (dateString) => {
  if (!dateString) return '';

  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};
```

**Refactored Code:**
```javascript
import { formatDateDisplay } from '../../../lib/dateFormatters.js';

/**
 * Format date for display
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date (e.g., "Jan 15, 2024")
 */
export const formatDate = (dateString) => {
  return formatDateDisplay(dateString, { fallback: '' });
};
```

**Testing:**
- [ ] Verify /favorite-listings page displays dates correctly
- [ ] Check that empty string fallback works for null dates

~~~~~

## PAGE GROUP: Internal/Infrastructure (Chunks: 10, 11)

### CHUNK 10: Create centralized dateFormatters.js utility
**File:** src/lib/dateFormatters.js
**Line:** 1 (NEW FILE)
**Issue:** Multiple formatDate implementations exist with slight variations. Need a centralized utility that supports different formats and fallback values.
**Affected Pages:** All pages using date formatting

**Current Code:**
```javascript
// File does not exist - this is a new file
```

**Refactored Code:**
```javascript
/**
 * Centralized Date Formatting Utilities
 *
 * Consolidates all date formatting logic to ensure consistency across the application.
 * All formatDate implementations throughout the codebase should delegate to these functions.
 *
 * @module lib/dateFormatters
 */

/**
 * Format a date for display with configurable format and fallback
 * @param {string|Date|null|undefined} dateValue - Date to format
 * @param {Object} [options] - Formatting options
 * @param {string} [options.format='medium'] - Format type: 'short' (M/D/YY), 'medium' (Jan 15, 2025), 'long' (January 15, 2025), 'iso' (2025-01-15)
 * @param {string} [options.fallback=''] - Value to return for invalid/null dates
 * @returns {string} Formatted date string
 */
export function formatDateDisplay(dateValue, options = {}) {
  const { format = 'medium', fallback = '' } = options;

  if (!dateValue) return fallback;

  const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
  if (isNaN(date.getTime())) return fallback;

  switch (format) {
    case 'short':
      // M/D/YY format
      const month = date.getMonth() + 1;
      const day = date.getDate();
      const year = date.getFullYear().toString().slice(-2);
      return `${month}/${day}/${year}`;

    case 'medium':
      // Jan 15, 2025 format
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });

    case 'long':
      // January 15, 2025 format
      return date.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });

    case 'iso':
      // 2025-01-15 format
      return date.toISOString().split('T')[0];

    default:
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
  }
}

/**
 * Format a datetime for display
 * @param {string|Date|null|undefined} dateValue - Datetime to format
 * @param {Object} [options] - Formatting options
 * @param {string} [options.fallback=''] - Value to return for invalid/null dates
 * @param {boolean} [options.includeTimezone=false] - Whether to include timezone
 * @returns {string} Formatted datetime string
 */
export function formatDateTimeDisplay(dateValue, options = {}) {
  const { fallback = '', includeTimezone = false } = options;

  if (!dateValue) return fallback;

  const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
  if (isNaN(date.getTime())) return fallback;

  const formatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/New_York'
  };

  if (includeTimezone) {
    formatOptions.timeZoneName = 'short';
  }

  return date.toLocaleString('en-US', formatOptions);
}

/**
 * Format a date range for display
 * @param {string|Date} start - Start date
 * @param {string|Date} end - End date
 * @param {Object} [options] - Formatting options
 * @returns {string} Formatted date range (e.g., "1/15/25 - 2/28/25")
 */
export function formatDateRange(start, end, options = {}) {
  const { format = 'short' } = options;
  const startFormatted = formatDateDisplay(start, { format, fallback: '' });
  const endFormatted = formatDateDisplay(end, { format, fallback: '' });

  if (!startFormatted && !endFormatted) return '';
  if (!startFormatted) return endFormatted;
  if (!endFormatted) return startFormatted;

  return `${startFormatted} - ${endFormatted}`;
}
```

**Testing:**
- [ ] Unit test all format options (short, medium, long, iso)
- [ ] Test fallback values for null/undefined/invalid dates
- [ ] Test formatDateTimeDisplay with and without timezone
- [ ] Test formatDateRange with various input combinations

~~~~~

### CHUNK 11: Remove deprecated cancelProposalWorkflow re-export file
**File:** src/logic/workflows/booking/cancelProposalWorkflow.js
**Line:** 1-9
**Issue:** This file is marked as deprecated and only re-exports from another location. Files that import from here should be updated to import from the canonical location directly, then this file can be removed.
**Affected Pages:** Any page using proposal cancellation

**Current Code:**
```javascript
/**
 * @deprecated Use workflows/proposals/cancelProposalWorkflow.js instead
 * This file is scheduled for removal. All imports should use:
 * import { executeCancelProposal } from '../proposals/cancelProposalWorkflow.js'
 */

// Re-export from canonical location for any remaining imports
export { executeCancelProposal as cancelProposalWorkflow } from '../proposals/cancelProposalWorkflow.js';
```

**Refactored Code:**
```javascript
// This file has been removed. Import directly from:
// import { executeCancelProposal } from '../logic/workflows/proposals/cancelProposalWorkflow.js'
//
// If you see this comment, the file should be deleted after updating all imports.
```

**Testing:**
- [ ] Search for all imports of 'workflows/booking/cancelProposalWorkflow'
- [ ] Update each import to use 'workflows/proposals/cancelProposalWorkflow'
- [ ] Delete this file after all imports are updated
- [ ] Run build to verify no broken imports

~~~~~

## PAGE GROUP: /view-split-lease (Chunks: 12)

### CHUNK 12: Remove duplicate ViewSplitLeasePage.jsx file
**File:** src/islands/pages/ViewSplitLeasePage.jsx
**Line:** 1-150 (partial file shown)
**Issue:** Two versions of ViewSplitLeasePage exist: `ViewSplitLeasePage.jsx` (root) and `ViewSplitLeasePage/ViewSplitLeasePage.jsx` (subfolder). The subfolder version is the newer one with component extraction (LoadingState, ErrorState, PhotoGallery, SchedulePatternHighlight). The root file should be removed or converted to a re-export.
**Affected Pages:** /view-split-lease

**Current Code:**
```javascript
// File: src/islands/pages/ViewSplitLeasePage.jsx (root level)
// This is the older version without extracted components
// Note: This file is very large (30177 tokens) and duplicates the subfolder version
```

**Refactored Code:**
```javascript
/**
 * @deprecated This file re-exports from the canonical location.
 * Import directly from 'islands/pages/ViewSplitLeasePage/ViewSplitLeasePage.jsx' instead.
 */

export { default } from './ViewSplitLeasePage/ViewSplitLeasePage.jsx';
```

**Testing:**
- [ ] Find all imports of ViewSplitLeasePage that use the root file
- [ ] Update entry point (view-split-lease.jsx) to use correct import
- [ ] Verify /view-split-lease page loads correctly
- [ ] Verify all functionality (schedule selector, pricing, favorites, etc.)

~~~~~

## Dependencies and Execution Order

The chunks should be executed in the following order:

1. **CHUNK 10** (dateFormatters.js) - Create new centralized utility first
2. **CHUNK 1** (proposalStages re-export) - Safe, simple re-export
3. **CHUNK 2** (processProposalData re-export) - Safe, simple re-export
4. **CHUNK 3** (remove debug logs) - Safe, no dependencies
5. **CHUNK 4-9** (formatDate/formatCurrency consolidations) - Depend on CHUNK 10
6. **CHUNK 11** (cancelProposalWorkflow cleanup) - Requires import updates first
7. **CHUNK 12** (ViewSplitLeasePage consolidation) - Large impact, do last

## Risk Assessment

| Chunk | Risk Level | Reason |
|-------|------------|--------|
| 1 | Low | Simple re-export, no behavior change |
| 2 | Low | Simple re-export, no behavior change |
| 3 | Very Low | Removing debug code only |
| 4-9 | Medium | Format changes could affect display |
| 10 | Low | New file, no existing dependencies |
| 11 | Medium | Requires import updates across codebase |
| 12 | High | Large file, many features, needs thorough testing |

## Files Referenced

- `src/lib/constants/proposalStages.js`
- `src/logic/constants/proposalStages.js`
- `src/logic/processors/proposal/processProposalData.js`
- `src/logic/processors/proposals/processProposalData.js`
- `src/islands/pages/ViewSplitLeasePage/ViewSplitLeasePage.jsx`
- `src/islands/pages/ViewSplitLeasePage.jsx`
- `src/islands/pages/proposals/displayUtils.js`
- `src/islands/pages/HostProposalsPage/formatters.js`
- `src/islands/pages/FavoriteListingsPage/formatters.js`
- `src/logic/workflows/booking/cancelProposalWorkflow.js`
- `src/lib/priceCalculations.js`
- `src/lib/dateFormatters.js` (NEW)
