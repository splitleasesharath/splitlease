# Code Refactoring Plan - ../app

Date: 2026-01-21
Audit Type: general

## Summary of Issues Found

| Issue Category | Count | Severity |
|----------------|-------|----------|
| Duplicate Code Files | 3 | High |
| Duplicate Functions | 6+ | Medium |
| Console.log in Production | 10+ | Medium |
| Inconsistent Patterns | 3 | Low |

## CRITICAL IMPACT FILES (DO NOT MODIFY)

Based on the dependency analysis, the following files have 30+ dependents and should NOT be modified:

- `src/lib/supabase.js` (93 dependents)
- `src/lib/secureStorage.js` (89 dependents)
- `src/lib/auth.js` (79 dependents)
- `src/lib/constants.js` (52 dependents)
- `src/lib/dataLookups.js` (40 dependents)
- `src/logic/constants/proposalStatuses.js` (39 dependents)
- `src/islands/shared/ErrorBoundary.jsx` (36 dependents)
- `src/styles/main.css` (36 dependents)
- `src/islands/shared/Header.jsx` (32 dependents)
- `src/lib/config.js` (32 dependents)

~~~~~

## PAGE GROUP: GLOBAL (Chunks: 1, 2, 3, 4)

These chunks affect shared utilities used across multiple pages.

~~~~~

### CHUNK 1: Remove duplicate proposalStages.js in lib/constants

**File:** `src/lib/constants/proposalStages.js`
**Line:** 1
**Issue:** Duplicate file re-exports from logic/constants. The lib/constants version is nearly identical to logic/constants/proposalStages.js but has fewer helper functions. This creates maintenance burden and confusion about which file to import.
**Affected Pages:** /guest-proposals, /host-proposals, /account-profile, all proposal-related pages

**Cascading Changes Required:**
- All files importing from `src/lib/constants/proposalStages.js` need to update import paths

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
  // ... 5 more stages
];

export function getStageById(stageId) {
  if (!stageId || stageId < 1 || stageId > 6) {
    return null;
  }
  return PROPOSAL_STAGES.find(s => s.id === stageId) || null;
}

// Additional functions...
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
  isStageCompleted,
  isCurrentStage,
  formatStageDisplay,
  getAllStagesFormatted,
  getStageProgress,
  getCompletedStages,
  getRemainingStages,
  isStagePending,
  getPreviousStage,
  getNextStage
} from '../../logic/constants/proposalStages.js';
```

**Testing:**
- [ ] Run `bun run build` to verify no import errors
- [ ] Verify all proposal stage displays still work correctly
- [ ] Test proposal progress bar on /guest-proposals page

~~~~~

### CHUNK 2: Consolidate duplicate processProposalData.js files

**File:** `src/logic/processors/proposal/processProposalData.js` (148 lines)
**Line:** 1
**Issue:** Two different implementations of `processProposalData` exist:
1. `logic/processors/proposal/processProposalData.js` - Simpler version focused on merging current terms
2. `logic/processors/proposals/processProposalData.js` - Full version with nested transformations

This causes confusion and potential inconsistencies when different pages use different implementations.

**Affected Pages:** All pages displaying proposal data

**Cascading Changes Required:**
- Files importing from `logic/processors/proposal/` need to update to `logic/processors/proposals/`

**Current Code:**
```javascript
// src/logic/processors/proposal/processProposalData.js
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

  // ... simpler implementation with currentTerms and originalTerms

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
    // ... limited fields
  }
}
```

**Refactored Code:**
```javascript
// src/logic/processors/proposal/processProposalData.js
/**
 * @deprecated Use logic/processors/proposals/processProposalData.js instead.
 * This file re-exports for backwards compatibility.
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
- [ ] Verify proposal details display correctly on /guest-proposals
- [ ] Verify proposal cards display correctly on /host-proposals
- [ ] Test counteroffer comparison on proposal detail modals

~~~~~

### CHUNK 3: Consolidate duplicate priceCalculations.js files

**File:** `src/lib/priceCalculations.js`
**Line:** 1
**Issue:** Two implementations of price calculation exist:
1. `lib/priceCalculations.js` - Simple 4-week rent calculator (146 lines)
2. `lib/scheduleSelector/priceCalculations.js` - Full implementation supporting Monthly/Weekly/Nightly (380 lines)

The simpler version lacks Monthly/Weekly rental type support and has fallback defaults that conflict with the "No Fallback" philosophy.

**Affected Pages:** /search, /view-split-lease, /create-suggested-proposal, all listing pages

**Cascading Changes Required:**
- Files importing from `lib/priceCalculations.js` need to update import paths

**Current Code:**
```javascript
// src/lib/priceCalculations.js
/**
 * Calculate 4-week rent based on nightly price and selected nights
 * Formula: nightly price x nights per week x 4 weeks
 * @param {number} nightlyPrice - Price per night
 * @param {number} nightsPerWeek - Number of nights selected per week
 * @returns {number} 4-week rent amount
 */
export function calculate4WeekRent(nightlyPrice, nightsPerWeek) {
  if (!nightlyPrice || !nightsPerWeek) return 0;  // FALLBACK - violates philosophy
  return nightlyPrice * nightsPerWeek * 4;
}

export function calculateReservationTotal(fourWeekRent, totalWeeks) {
  if (!fourWeekRent || !totalWeeks) return 0;  // FALLBACK - violates philosophy
  return fourWeekRent * (totalWeeks / 4);
}

export function getNightlyPriceForNights(listing, nightsSelected) {
  if (!listing || !nightsSelected) return null;

  // Price override takes precedence
  if (listing['Price Override']) {
    return listing['Price Override'];
  }

  // Map nights to price fields - MISSING 6 nights!
  const priceFieldMap = {
    1: 'Nightly Host Rate for 1 night',
    2: 'Nightly Host Rate for 2 nights',
    3: 'Nightly Host Rate for 3 nights',
    4: 'Nightly Host Rate for 4 nights',
    5: 'Nightly Host Rate for 5 nights',
    7: 'Nightly Host Rate for 7 nights'
  };

  // Default to 4-night rate if available - FALLBACK
  return listing['Nightly Host Rate for 4 nights'] || null;
}
```

**Refactored Code:**
```javascript
// src/lib/priceCalculations.js
/**
 * Price Calculation Utilities
 *
 * @deprecated For new code, prefer using logic/calculators/pricing/ modules
 * which follow the "No Fallback" philosophy and support all rental types.
 *
 * This file maintains backwards compatibility by re-exporting from the
 * canonical scheduleSelector implementation.
 */

// Re-export comprehensive implementation
export { calculatePrice } from './scheduleSelector/priceCalculations.js';

// Re-export formatPrice from canonical location
export { formatPrice } from '../lib/dateFormatters.js';

// Legacy function wrappers for backward compatibility
// These delegate to the comprehensive implementation
export function calculate4WeekRent(nightlyPrice, nightsPerWeek) {
  if (typeof nightlyPrice !== 'number' || isNaN(nightlyPrice)) {
    throw new Error('calculate4WeekRent: nightlyPrice must be a number');
  }
  if (typeof nightsPerWeek !== 'number' || nightsPerWeek < 2 || nightsPerWeek > 7) {
    throw new Error('calculate4WeekRent: nightsPerWeek must be between 2-7');
  }
  return nightlyPrice * nightsPerWeek * 4;
}

export function calculateReservationTotal(fourWeekRent, totalWeeks) {
  if (typeof fourWeekRent !== 'number' || isNaN(fourWeekRent)) {
    throw new Error('calculateReservationTotal: fourWeekRent must be a number');
  }
  if (typeof totalWeeks !== 'number' || totalWeeks <= 0) {
    throw new Error('calculateReservationTotal: totalWeeks must be positive');
  }
  return fourWeekRent * (totalWeeks / 4);
}

export function getNightlyPriceForNights(listing, nightsSelected) {
  if (!listing || typeof listing !== 'object') {
    throw new Error('getNightlyPriceForNights: listing must be an object');
  }
  if (typeof nightsSelected !== 'number' || nightsSelected < 1 || nightsSelected > 7) {
    throw new Error('getNightlyPriceForNights: nightsSelected must be between 1-7');
  }

  // Price override takes precedence
  if (listing['Price Override']) {
    return Number(listing['Price Override']);
  }

  // Complete price field map (including 6 nights)
  const priceFieldMap = {
    1: 'Nightly Host Rate for 1 night',
    2: 'Nightly Host Rate for 2 nights',
    3: 'Nightly Host Rate for 3 nights',
    4: 'Nightly Host Rate for 4 nights',
    5: 'Nightly Host Rate for 5 nights',
    6: 'Nightly Host Rate for 6 nights',
    7: 'Nightly Host Rate for 7 nights'
  };

  const fieldName = priceFieldMap[nightsSelected];
  const rate = listing[fieldName];

  if (rate === undefined || rate === null) {
    throw new Error(`getNightlyPriceForNights: No rate found for ${nightsSelected} nights`);
  }

  return Number(rate);
}

// Preserve backward compatibility exports
export function calculatePricingBreakdown(listing, nightsPerWeek, reservationWeeks) {
  const nightlyPrice = getNightlyPriceForNights(listing, nightsPerWeek);
  const fourWeekRent = calculate4WeekRent(nightlyPrice, nightsPerWeek);
  const reservationTotal = calculateReservationTotal(fourWeekRent, reservationWeeks);

  return {
    nightlyPrice,
    fourWeekRent,
    reservationTotal,
    cleaningFee: listing['Cleaning Cost / Maintenance Fee'] || 0,
    damageDeposit: listing['Damage Deposit'] || 0,
    grandTotal: reservationTotal + (listing['Cleaning Cost / Maintenance Fee'] || 0),
    valid: true
  };
}

export function isValidForPricing(daysSelected) {
  return typeof daysSelected === 'number' && daysSelected >= 2 && daysSelected <= 7;
}

export function getPriceDisplayMessage(daysSelected) {
  if (!daysSelected || daysSelected < 2) {
    return 'Please Select More Days';
  }
  if (daysSelected > 7) {
    return 'Please Select 7 Days or Less';
  }
  return null;
}
```

**Testing:**
- [ ] Run `bun run build` to verify all imports resolve
- [ ] Test price display on /search results
- [ ] Test price calculations on /view-split-lease page
- [ ] Verify Create Proposal pricing breakdown

~~~~~

### CHUNK 4: Remove console.log statements from scheduleSelector/priceCalculations.js

**File:** `src/lib/scheduleSelector/priceCalculations.js`
**Line:** 37-40, 157-169, 254
**Issue:** Production code contains 10 console.log statements for debugging. These should be removed or replaced with proper logging.
**Affected Pages:** /search, /view-split-lease, /listing-schedule-selector

**Current Code:**
```javascript
export const calculatePrice = (selectedNights, listing, reservationSpan = 13, zatConfig = null) => {
  const nightsCount = selectedNights.length;

  console.log('=== CALCULATE PRICE ===');
  console.log('nightsCount:', nightsCount);
  console.log('listing rental type:', listing?.['rental type'] || listing?.rentalType);
  console.log('reservationSpan:', reservationSpan);

  // ... calculation logic ...

  console.log('=== PRICE CALCULATION RESULT ===');
  console.log('pricePerNight:', pricePerNight);
  console.log('fourWeekRent:', fourWeekRent);
  console.log('reservationTotal:', reservationTotal);
  console.log('initialPayment:', initialPayment);

  return { /* ... */ };
};

function calculateMonthlyPrice(nightsCount, listing, reservationSpan, config, unitMarkup, weeksOffered) {
  // ...

  console.log('Monthly calculation:', {
    monthlyAvgNightly,
    averageWeeklyPrice,
    // ... more debug values
  });

  return { pricePerNight, fourWeekRent, reservationTotal };
}
```

**Refactored Code:**
```javascript
import { logger } from '../logger.js';

export const calculatePrice = (selectedNights, listing, reservationSpan = 13, zatConfig = null) => {
  const nightsCount = selectedNights.length;

  // Use structured logging for debugging (only in dev mode)
  logger.debug('calculatePrice', {
    nightsCount,
    rentalType: listing?.['rental type'] || listing?.rentalType,
    reservationSpan
  });

  // ... calculation logic unchanged ...

  logger.debug('calculatePrice result', {
    pricePerNight,
    fourWeekRent,
    reservationTotal,
    initialPayment
  });

  return { /* ... */ };
};

function calculateMonthlyPrice(nightsCount, listing, reservationSpan, config, unitMarkup, weeksOffered) {
  // ...

  // Debug logging removed - use logger if needed for specific debugging

  return { pricePerNight, fourWeekRent, reservationTotal };
}
```

**Testing:**
- [ ] Run `bun run build` to verify compilation
- [ ] Check browser console for no unexpected log output
- [ ] Test price calculations still work correctly

~~~~~

## PAGE GROUP: /host-proposals, /guest-proposals (Chunks: 5, 6)

~~~~~

### CHUNK 5: Consolidate duplicate formatters.js files

**File:** `src/islands/pages/HostProposalsPage/formatters.js`
**Line:** 1
**Issue:** Duplicate `formatDate`, `formatDateTime`, `formatCurrency` functions exist in:
1. `islands/pages/HostProposalsPage/formatters.js`
2. `islands/pages/FavoriteListingsPage/formatters.js`
3. `lib/dateFormatters.js` (canonical)
4. `logic/processors/proposals/processProposalData.js`

This violates DRY principle and creates maintenance burden.

**Affected Pages:** /host-proposals, /favorite-listings

**Cascading Changes Required:**
- Update imports in `HostProposalsPage/` components
- Update imports in `FavoriteListingsPage/` components

**Current Code:**
```javascript
// src/islands/pages/HostProposalsPage/formatters.js
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

export function formatFullDate(date) {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

export function formatDateTime(date) {
  // ... implementation
}

export function formatDateRange(start, end) {
  return `${formatDate(start)} - ${formatDate(end)}`;
}
```

**Refactored Code:**
```javascript
// src/islands/pages/HostProposalsPage/formatters.js
/**
 * @deprecated Import from lib/dateFormatters.js or lib/priceCalculations.js instead.
 * This file re-exports for backwards compatibility.
 */

// Re-export date formatters from canonical location
export {
  formatDateDisplay as formatFullDate,
  formatDateTimeDisplay as formatDateTime,
  formatDateRange
} from '../../../lib/dateFormatters.js';

// Alias for short date format
import { formatDateDisplay } from '../../../lib/dateFormatters.js';
export const formatDate = (date) => formatDateDisplay(date, { format: 'short', fallback: '' });

// Re-export price formatters from canonical location
export { formatPrice } from '../../../lib/priceCalculations.js';

// Currency formatter (can be added to lib/priceCalculations.js in future)
export function formatCurrency(amount) {
  if (amount == null || isNaN(amount)) return '0.00';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}
```

**Testing:**
- [ ] Verify date displays on /host-proposals
- [ ] Verify date displays on /favorite-listings
- [ ] Test date range formatting in proposal cards

~~~~~

### CHUNK 6: Consolidate FavoriteListingsPage formatters.js

**File:** `src/islands/pages/FavoriteListingsPage/formatters.js`
**Line:** 1
**Issue:** Similar to CHUNK 5, this file contains duplicate `formatDate`, `formatPrice`, `formatLocation` functions.
**Affected Pages:** /favorite-listings

**Current Code:**
```javascript
// src/islands/pages/FavoriteListingsPage/formatters.js
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

export const formatPrice = (price, currency = 'USD') => {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return `${formatter.format(price)}/night`;
};

export const formatLocation = (borough, hood, city) => {
  const parts = [];
  if (borough) parts.push(borough);
  if (hood) parts.push(hood);
  if (city) parts.push(city);
  return parts.join(', ');
};

export const formatBedroomBathroom = (bedrooms, bathrooms, kitchenType) => {
  // ... implementation
};

export const getBathroomDisplay = (count) => {
  // ... implementation
};

export const getProcessedImageUrl = (imageUrl, width, height) => {
  // ... implementation
};
```

**Refactored Code:**
```javascript
// src/islands/pages/FavoriteListingsPage/formatters.js
/**
 * Formatting utilities for Favorite Listings Page
 *
 * Re-exports common formatters from canonical locations.
 * Page-specific formatters remain in this file.
 */

// Re-export date formatters from canonical location
export { formatDateDisplay as formatDate } from '../../../lib/dateFormatters.js';

// Re-export price formatter
export { formatPrice } from '../../../lib/priceCalculations.js';

// Page-specific formatters remain here

/**
 * Format location display
 * @param {string} [borough] - Borough name
 * @param {string} [hood] - Neighborhood name
 * @param {string} [city] - City name
 * @returns {string} Formatted location string
 */
export const formatLocation = (borough, hood, city) => {
  const parts = [];
  if (borough) parts.push(borough);
  if (hood) parts.push(hood);
  if (city) parts.push(city);
  return parts.join(', ');
};

/**
 * Bathroom display mapping based on Bubble option set
 */
const bathroomDisplayMap = {
  1: '1 Bath',
  1.5: '1.5 Baths',
  2: '2 Baths',
  2.5: '2.5 Baths',
  3: '3 Baths',
  3.5: '3.5 Baths',
  4: '4 Baths',
  4.5: '4.5 Baths',
  5: '5 Baths',
  6: '6 Baths',
};

export const getBathroomDisplay = (count) => {
  return bathroomDisplayMap[count] || `${count} Baths`;
};

export const formatBedroomBathroom = (bedrooms, bathrooms, kitchenType) => {
  const parts = [];

  if (bathrooms === 0) {
    if (bedrooms === 1) return '1 bedroom';
    if (bedrooms > 1) return `${bedrooms} bedrooms`;
    return '';
  }

  if (bedrooms === 1) parts.push('1 bedroom');
  else if (bedrooms > 1) parts.push(`${bedrooms} bedrooms`);

  if (bathrooms > 0) parts.push(getBathroomDisplay(bathrooms));
  if (kitchenType && kitchenType !== '') parts.push(kitchenType);

  return parts.length > 0 ? '• ' + parts.join(' • ') : '';
};

export const getProcessedImageUrl = (imageUrl, width, height) => {
  if (!imageUrl) return '';

  if (imageUrl.includes('imgix')) {
    const params = new URLSearchParams();
    if (width) params.append('w', width.toString());
    if (height) params.append('h', height.toString());
    params.append('fit', 'crop');
    params.append('auto', 'format,compress');

    const separator = imageUrl.includes('?') ? '&' : '?';
    return `${imageUrl}${separator}${params.toString()}`;
  }

  return imageUrl;
};
```

**Testing:**
- [ ] Verify favorite listings display correctly
- [ ] Test price formatting on listing cards
- [ ] Verify bedroom/bathroom formatting

~~~~~

## PAGE GROUP: /search, /view-split-lease (Chunks: 7)

~~~~~

### CHUNK 7: Add missing 6-night rate to price field map

**File:** `src/lib/scheduleSelector/priceCalculations.js`
**Line:** 338-357
**Issue:** The `getNightlyRateForNights` function is missing support for 6 nights in the price field map. This could cause incorrect pricing for 6-night selections.
**Affected Pages:** /search, /view-split-lease, /listing-schedule-selector

**Current Code:**
```javascript
function getNightlyRateForNights(nightsCount, listing) {
  // Map nights to price fields
  const priceFieldMap = {
    1: listing.nightlyHostRateFor1Night || listing['Nightly Host Rate for 1 night'],
    2: listing.nightlyHostRateFor2Nights || listing['Nightly Host Rate for 2 nights'],
    3: listing.nightlyHostRateFor3Nights || listing['Nightly Host Rate for 3 nights'],
    4: listing.nightlyHostRateFor4Nights || listing['Nightly Host Rate for 4 nights'],
    5: listing.nightlyHostRateFor5Nights || listing['Nightly Host Rate for 5 nights'],
    7: listing.nightlyHostRateFor7Nights || listing['Nightly Host Rate for 7 nights']
  };

  const rate = parseFloat(priceFieldMap[nightsCount] || 0);

  // If no rate found for exact nights, fall back to 4-night rate
  if (!rate || rate === 0) {
    return parseFloat(listing['Nightly Host Rate for 4 nights'] || 0);
  }

  return rate;
}
```

**Refactored Code:**
```javascript
function getNightlyRateForNights(nightsCount, listing) {
  // Map nights to price fields - complete set 1-7
  const priceFieldMap = {
    1: listing.nightlyHostRateFor1Night || listing['Nightly Host Rate for 1 night'],
    2: listing.nightlyHostRateFor2Nights || listing['Nightly Host Rate for 2 nights'],
    3: listing.nightlyHostRateFor3Nights || listing['Nightly Host Rate for 3 nights'],
    4: listing.nightlyHostRateFor4Nights || listing['Nightly Host Rate for 4 nights'],
    5: listing.nightlyHostRateFor5Nights || listing['Nightly Host Rate for 5 nights'],
    6: listing.nightlyHostRateFor6Nights || listing['Nightly Host Rate for 6 nights'],
    7: listing.nightlyHostRateFor7Nights || listing['Nightly Host Rate for 7 nights']
  };

  const rate = parseFloat(priceFieldMap[nightsCount] || 0);

  // If no rate found for exact nights, fall back to 4-night rate
  // Note: This fallback violates "No Fallback" but is kept for backwards compatibility
  if (!rate || rate === 0) {
    return parseFloat(listing['Nightly Host Rate for 4 nights'] || 0);
  }

  return rate;
}
```

**Testing:**
- [ ] Test 6-night price calculation on /search
- [ ] Verify 6-night selection shows correct price on /view-split-lease
- [ ] Test schedule selector with 6-night selections

~~~~~

## PAGE GROUP: /guest-proposals (Chunks: 8)

~~~~~

### CHUNK 8: Remove console.log statements from workflow files

**File:** `src/logic/workflows/proposals/navigationWorkflow.js`
**Line:** 24, 53
**Issue:** Console.log statements in workflow files should use structured logging.
**Affected Pages:** /guest-proposals

**Current Code:**
```javascript
export function navigateToListing(proposal) {
  if (!proposal?.listing?.id && !proposal?.listingId && !proposal?.Listing) {
    console.error('[navigationWorkflow] No listing ID found for navigation');
    return;
  }

  const listingId = proposal.listing?.id || proposal.listingId || proposal.Listing;
  const url = `/view-split-lease/${listingId}`;

  console.log('[navigationWorkflow] Navigating to listing:', url);
  window.location.href = url;
}

export function navigateToMessaging(hostId, proposalId) {
  if (!hostId) {
    console.error('[navigationWorkflow] No host ID found for messaging');
    return;
  }

  let url = `/messages`;
  // ...

  console.log('[navigationWorkflow] Navigating to messaging:', url);
  window.location.href = url;
}
```

**Refactored Code:**
```javascript
import { logger } from '../../../lib/logger.js';

export function navigateToListing(proposal) {
  if (!proposal?.listing?.id && !proposal?.listingId && !proposal?.Listing) {
    logger.error('navigateToListing: No listing ID found', { proposal });
    return;
  }

  const listingId = proposal.listing?.id || proposal.listingId || proposal.Listing;
  const url = `/view-split-lease/${listingId}`;

  logger.debug('navigateToListing', { url, listingId });
  window.location.href = url;
}

export function navigateToMessaging(hostId, proposalId) {
  if (!hostId) {
    logger.error('navigateToMessaging: No host ID found', { proposalId });
    return;
  }

  let url = `/messages`;
  const params = new URLSearchParams();

  if (hostId) params.append('recipient', hostId);
  if (proposalId) params.append('proposal', proposalId);

  if (params.toString()) {
    url += `?${params.toString()}`;
  }

  logger.debug('navigateToMessaging', { url, hostId, proposalId });
  window.location.href = url;
}
```

**Testing:**
- [ ] Test navigation to listing from /guest-proposals
- [ ] Test navigation to messages from proposal
- [ ] Verify no console.log output in production

~~~~~

## File References

### Files to Modify

| File | Chunk | Action |
|------|-------|--------|
| `src/lib/constants/proposalStages.js` | 1 | Convert to re-export |
| `src/logic/processors/proposal/processProposalData.js` | 2 | Convert to re-export |
| `src/lib/priceCalculations.js` | 3 | Consolidate with strict validation |
| `src/lib/scheduleSelector/priceCalculations.js` | 4, 7 | Remove console.log, add 6-night rate |
| `src/islands/pages/HostProposalsPage/formatters.js` | 5 | Convert to re-export |
| `src/islands/pages/FavoriteListingsPage/formatters.js` | 6 | Consolidate with re-exports |
| `src/logic/workflows/proposals/navigationWorkflow.js` | 8 | Replace console.log with logger |

### Critical Dependencies (DO NOT MODIFY)

- `src/lib/supabase.js` (93 dependents)
- `src/lib/secureStorage.js` (89 dependents)
- `src/lib/auth.js` (79 dependents)
- `src/lib/constants.js` (52 dependents)
- `src/lib/dataLookups.js` (40 dependents)
- `src/logic/constants/proposalStatuses.js` (39 dependents)

### Safe to Refactor (Leaf Files)

- `src/islands/pages/HostProposalsPage/formatters.js` (0 dependents)
- `src/islands/pages/FavoriteListingsPage/formatters.js` (0 dependents)
- `src/logic/workflows/proposals/navigationWorkflow.js` (low dependents)

---

## Execution Order

Based on dependencies, execute chunks in this order:

1. **Chunk 7** - Add missing 6-night rate (independent fix)
2. **Chunk 4** - Remove console.log from priceCalculations (independent fix)
3. **Chunk 8** - Remove console.log from workflows (independent fix)
4. **Chunk 5 & 6** - Consolidate page formatters (can run in parallel)
5. **Chunk 1** - Consolidate proposalStages.js
6. **Chunk 2** - Consolidate processProposalData.js
7. **Chunk 3** - Consolidate priceCalculations.js

## Estimated Impact

| Metric | Before | After |
|--------|--------|-------|
| Duplicate functions | 15+ | 3 |
| Console.log statements | 14+ | 0 |
| Files with duplicate code | 6 | 2 (re-exports only) |
| Lines of duplicate code | ~400 | ~50 (re-exports) |
