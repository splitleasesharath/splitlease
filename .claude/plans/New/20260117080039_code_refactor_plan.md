# Code Refactoring Plan - app

**Date:** 2026-01-17
**Audit Type:** general
**Total Chunks:** 12
**Priority Areas:** Duplication, Maintainability, Performance

---

## PAGE GROUP: ALL PAGES (Chunks: 1, 2, 3, 4)

These issues affect the entire application through shared utilities.

~~~~~

### CHUNK 1: Duplicate proposalStages.js Constants
**File:** `app/src/lib/constants/proposalStages.js` AND `app/src/logic/constants/proposalStages.js`
**Line:** 1-161 (lib) and 1-243 (logic)
**Issue:** Two nearly identical files define `PROPOSAL_STAGES` and helper functions. The `logic/` version has additional functions (`getStageProgress`, `getCompletedStages`, `getRemainingStages`, `isStagePending`, `getPreviousStage`, `getNextStage`) while `lib/` has a subset. This causes confusion about which to import and risks divergent behavior.
**Affected Pages:** ALL - Any page using proposal stages

**Current Code:**
```javascript
// app/src/lib/constants/proposalStages.js (Lines 16-65)
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

// AND ALSO in app/src/logic/constants/proposalStages.js (Lines 16-65) - DUPLICATE
export const PROPOSAL_STAGES = [
  // ... exact same content
];
```

**Refactored Code:**
```javascript
// DELETE: app/src/lib/constants/proposalStages.js

// KEEP: app/src/logic/constants/proposalStages.js (canonical source)
// Add re-export in app/src/lib/constants/proposalStages.js for backwards compatibility:
export * from '../../../logic/constants/proposalStages.js';
```

**Testing:**
- [ ] Verify all imports of proposalStages resolve correctly
- [ ] Run `bun run build` to check for broken imports
- [ ] Test proposal progress tracking on /guest-proposals/:userId

~~~~~

### CHUNK 2: Duplicate proposalStatuses.js Constants
**File:** `app/src/lib/constants/proposalStatuses.js` AND `app/src/logic/constants/proposalStatuses.js`
**Line:** 1-251 (lib) and 1-384 (logic)
**Issue:** Two files define `PROPOSAL_STATUSES` with different content. The `logic/` version includes `usualOrder` fields and additional helper functions (`getUsualOrder`, `shouldShowStatusBanner`, `isSuggestedProposal`, `getStatusesByColor`, `getStatusesByStage`, `isPendingConfirmationProposal`). The `lib/` version lacks these critical fields causing inconsistent status handling.
**Affected Pages:** ALL - Any page using proposal statuses

**Current Code:**
```javascript
// app/src/lib/constants/proposalStatuses.js (Lines 15-23)
CANCELLED_BY_GUEST: {
  key: 'Proposal Cancelled by Guest',
  color: 'red',
  label: 'Cancelled by You',
  stage: null,
  actions: ['view_listing', 'explore_rentals']
},

// app/src/logic/constants/proposalStatuses.js (Lines 17-24) - HAS usualOrder
CANCELLED_BY_GUEST: {
  key: 'Proposal Cancelled by Guest',
  color: 'red',
  label: 'Cancelled by You',
  stage: null,
  usualOrder: 99,  // MISSING in lib version
  actions: ['view_listing', 'explore_rentals']
},
```

**Refactored Code:**
```javascript
// DELETE: app/src/lib/constants/proposalStatuses.js

// KEEP: app/src/logic/constants/proposalStatuses.js (canonical source with usualOrder)
// Add re-export in app/src/lib/constants/proposalStatuses.js:
export * from '../../../logic/constants/proposalStatuses.js';
```

**Testing:**
- [ ] Verify all imports of proposalStatuses resolve correctly
- [ ] Test status display on /guest-proposals/:userId and /host-proposals/:userId
- [ ] Verify `usualOrder` is available everywhere needed

~~~~~

### CHUNK 3: Duplicate processProposalData Functions
**File:** `app/src/logic/processors/proposal/processProposalData.js` AND `app/src/logic/processors/proposals/processProposalData.js`
**Line:** 1-149 (proposal/) and 1-330 (proposals/)
**Issue:** Two files in different directories (`proposal/` singular vs `proposals/` plural) both export `processProposalData`. They have completely different implementations - the singular version processes raw Supabase data into merged terms, while the plural version handles nested listing/host/virtualMeeting transformations. This causes silent bugs depending on which gets imported.
**Affected Pages:** ALL - Any page loading proposal data

**Current Code:**
```javascript
// app/src/logic/processors/proposal/processProposalData.js (Lines 36-148)
export function processProposalData({ rawProposal, listing = null, guest = null, host = null }) {
  // Validates and merges original vs counteroffer terms
  const currentTerms = {
    moveInDate: hasHostCounteroffer && rawProposal['hc Move-In Date']
      ? rawProposal['hc Move-In Date']
      : rawProposal['Move-In Date'],
    // ...
  };
  return { id, currentTerms, originalTerms, hasCounteroffer, ... };
}

// app/src/logic/processors/proposals/processProposalData.js (Lines 133-209)
export function processProposalData(rawProposal) {
  // Transforms nested data including listing, host, virtualMeeting
  const listing = processListingData(rawProposal.listing);
  const host = processHostData(rawProposal.listing?.host);
  const virtualMeeting = processVirtualMeetingData(rawProposal.virtualMeeting);
  return { id, listing, host, virtualMeeting, daysSelected, nightsSelected, ... };
}
```

**Refactored Code:**
```javascript
// RENAME: app/src/logic/processors/proposal/processProposalData.js
// TO: app/src/logic/processors/proposal/processProposalTerms.js
export function processProposalTerms({ rawProposal, listing = null, guest = null, host = null }) {
  // Same implementation focused on term merging
}

// KEEP: app/src/logic/processors/proposals/processProposalData.js
// This is the main processor - handles full proposal transformation

// UPDATE barrel export in app/src/logic/processors/index.js:
export { processProposalTerms } from './proposal/processProposalTerms.js';
export { processProposalData, processUserData, processListingData, ... } from './proposals/processProposalData.js';
```

**Testing:**
- [ ] Update all imports from `proposal/processProposalData` to use new name
- [ ] Verify term merging works on /guest-proposals/:userId (Compare Terms modal)
- [ ] Verify full proposal loading on /host-proposals/:userId

~~~~~

### CHUNK 4: Duplicate cancelProposalWorkflow Functions
**File:** `app/src/logic/workflows/booking/cancelProposalWorkflow.js` AND `app/src/logic/workflows/proposals/cancelProposalWorkflow.js`
**Line:** 1-143 (booking/) and 1-176 (proposals/)
**Issue:** Two files in different directories both handle proposal cancellation. The `booking/` version takes dependencies as parameters (supabase, canCancelProposal rule), while `proposals/` imports them directly. Different implementations for the same business logic creates maintenance burden.
**Affected Pages:** /guest-proposals/:userId, /host-proposals/:userId

**Current Code:**
```javascript
// app/src/logic/workflows/booking/cancelProposalWorkflow.js (Lines 38-143)
export async function cancelProposalWorkflow({
  supabase,        // Injected dependency
  proposal,
  source = 'main',
  canCancelProposal // Injected rule function
}) {
  // Implementation with injected dependencies
}

// app/src/logic/workflows/proposals/cancelProposalWorkflow.js (Lines 21-175)
import { supabase } from '../../../lib/supabase.js';  // Direct import
import { canCancelProposal } from '../../rules/proposals/proposalRules.js';

export function determineCancellationCondition(proposal) { ... }
export async function executeCancelProposal(proposalId, reason = null) { ... }
export async function cancelProposalFromCompareTerms(proposalId, reason) { ... }
export async function executeDeleteProposal(proposalId) { ... }
```

**Refactored Code:**
```javascript
// DELETE: app/src/logic/workflows/booking/cancelProposalWorkflow.js

// KEEP & ENHANCE: app/src/logic/workflows/proposals/cancelProposalWorkflow.js
// Add the decision tree from booking/ version as an option:

export async function cancelProposalWorkflow({
  proposalId,
  proposal = null,  // Optional full proposal for decision tree
  reason = null,
  source = 'main',  // 'main' | 'compare-modal'
  useDecisionTree = false  // When true, applies usualOrder/houseManual logic
}) {
  if (useDecisionTree && proposal) {
    // Decision tree logic from booking/ version
    const usualOrder = proposal.usualOrder || 0;
    const hasAccessedHouseManual = proposal.houseManualAccessed === true;
    // ... decision logic
  }

  return executeCancelProposal(proposalId, reason);
}
```

**Testing:**
- [ ] Test cancellation from Guest Proposals page (/guest-proposals/:userId)
- [ ] Test cancellation from Compare Terms modal
- [ ] Verify decision tree logic when usualOrder > 5

~~~~~

## PAGE GROUP: /search, /view-split-lease, /favorite-listings (Chunks: 5, 6)

~~~~~

### CHUNK 5: Duplicate DAY_NAMES Constants
**File:** `app/src/lib/dayUtils.js` AND `app/src/lib/scheduleSelector/dayHelpers.js`
**Line:** 24-32 (dayUtils) and 9-15 (dayHelpers)
**Issue:** Both files define `DAY_NAMES` array for day-of-week display. The `dayHelpers.js` also adds `DAY_LETTERS` and `DAY_ABBREV` which aren't in `dayUtils.js`. Inconsistent naming across the codebase.
**Affected Pages:** /search, /view-split-lease, /favorite-listings, /listing-dashboard

**Current Code:**
```javascript
// app/src/lib/dayUtils.js (Lines 24-32)
export const DAY_NAMES = [
  'Sunday',   // 0
  'Monday',   // 1
  'Tuesday',  // 2
  'Wednesday',// 3
  'Thursday', // 4
  'Friday',   // 5
  'Saturday'  // 6
];

// app/src/lib/scheduleSelector/dayHelpers.js (Lines 9-15)
export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
export const DAY_ABBREV = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
```

**Refactored Code:**
```javascript
// KEEP: app/src/lib/dayUtils.js as canonical source
// ADD missing exports:
export const DAY_NAMES = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
];

export const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export const DAY_ABBREV = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// UPDATE: app/src/lib/scheduleSelector/dayHelpers.js
// Remove duplicate constants, re-export from dayUtils:
import { DAY_NAMES, DAY_LETTERS, DAY_ABBREV } from '../dayUtils.js';
export { DAY_NAMES, DAY_LETTERS, DAY_ABBREV };
```

**Testing:**
- [ ] Verify schedule selector displays correct day names
- [ ] Test day selection on /search page
- [ ] Verify day display on /view-split-lease

~~~~~

### CHUNK 6: Duplicate formatPrice Functions
**File:** Multiple files define `formatPrice` with varying implementations
**Line:** Various
**Issue:** At least 5 different implementations of `formatPrice` exist:
  - `app/src/lib/priceCalculations.js:73` - returns '$0' for invalid
  - `app/src/islands/pages/FavoriteListingsPage/formatters.js:94` - appends '/night'
  - `app/src/logic/processors/proposals/processProposalData.js:234` - returns null for invalid
  - `app/src/islands/pages/HostProposalsPage/formatters.js:10` - `formatCurrency` (no $ prefix)
  - `app/src/islands/shared/PriceDisplay.jsx` - component wrapper

**Affected Pages:** /search, /view-split-lease, /favorite-listings, /guest-proposals, /host-proposals

**Current Code:**
```javascript
// app/src/lib/priceCalculations.js (Lines 73-86)
export function formatPrice(amount, showCents = false) {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '$0';
  }
  // Returns e.g., "$1,234"
}

// app/src/islands/pages/FavoriteListingsPage/formatters.js (Lines 94-103)
export const formatPrice = (price, currency = 'USD') => {
  // Returns e.g., "$1,234/night" - DIFFERENT BEHAVIOR
  return `${formatter.format(price)}/night`;
};

// app/src/logic/processors/proposals/processProposalData.js (Lines 234-245)
export function formatPrice(price, includeCents = true) {
  if (price === null || price === undefined) return null;  // Returns null, not '$0'
  // ...
}
```

**Refactored Code:**
```javascript
// CREATE: app/src/lib/formatters/priceFormatter.js
/**
 * Canonical price formatting utility
 * @param {number} amount - Amount to format
 * @param {Object} options - Formatting options
 * @param {boolean} options.showCents - Include decimal places (default: false)
 * @param {string} options.suffix - Suffix like '/night' (default: '')
 * @param {*} options.fallback - Value for null/undefined (default: null)
 */
export function formatPrice(amount, options = {}) {
  const { showCents = false, suffix = '', fallback = null } = options;

  if (amount === null || amount === undefined || isNaN(amount)) {
    return fallback;
  }

  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: showCents ? 2 : 0,
    maximumFractionDigits: showCents ? 2 : 0
  }).format(amount);

  return suffix ? `${formatted}${suffix}` : formatted;
}

// Convenience exports for common use cases
export const formatPricePerNight = (amount) => formatPrice(amount, { suffix: '/night' });
export const formatPriceWithCents = (amount) => formatPrice(amount, { showCents: true });
export const formatPriceOrZero = (amount) => formatPrice(amount, { fallback: '$0' });
```

**Testing:**
- [ ] Update imports across all files using formatPrice
- [ ] Verify price displays correctly on /search listing cards
- [ ] Verify price breakdown on /view-split-lease
- [ ] Test proposal cards on /guest-proposals and /host-proposals

~~~~~

## PAGE GROUP: /guest-proposals, /host-proposals (Chunks: 7, 8)

~~~~~

### CHUNK 7: Duplicate formatDate Functions
**File:** Multiple files define `formatDate` with varying implementations
**Line:** Various
**Issue:** At least 4 different `formatDate` implementations:
  - `app/src/islands/pages/HostProposalsPage/formatters.js:23` - M/D/YY format
  - `app/src/islands/pages/FavoriteListingsPage/formatters.js:127` - 'MMM d, yyyy'
  - `app/src/logic/processors/proposals/processProposalData.js:252` - 'MMM d, yyyy' with timezone
  - `app/src/islands/shared/DateChangeRequestManager/dateUtils.js:14` - configurable format

**Affected Pages:** /guest-proposals, /host-proposals, /favorite-listings

**Current Code:**
```javascript
// app/src/islands/pages/HostProposalsPage/formatters.js (Lines 23-31)
export function formatDate(date) {
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const year = d.getFullYear().toString().slice(-2);
  return `${month}/${day}/${year}`;  // Returns "1/15/25"
}

// app/src/islands/pages/FavoriteListingsPage/formatters.js (Lines 127-136)
export const formatDate = (dateString) => {
  return date.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });  // Returns "Jan 15, 2025"
};
```

**Refactored Code:**
```javascript
// CREATE: app/src/lib/formatters/dateFormatter.js
import { format } from 'date-fns';

/**
 * Parse date input to Date object
 */
const parseDate = (date) => {
  if (!date) return null;
  const d = typeof date === 'string' ? new Date(date) : date;
  return isNaN(d.getTime()) ? null : d;
};

/**
 * Format date with configurable presets
 */
export function formatDate(date, preset = 'medium') {
  const d = parseDate(date);
  if (!d) return '';

  const presets = {
    short: 'M/d/yy',        // 1/15/25
    medium: 'MMM d, yyyy',  // Jan 15, 2025
    long: 'MMMM d, yyyy',   // January 15, 2025
    full: 'EEEE, MMMM d, yyyy',  // Wednesday, January 15, 2025
  };

  return format(d, presets[preset] || preset);
}

export const formatDateShort = (date) => formatDate(date, 'short');
export const formatDateMedium = (date) => formatDate(date, 'medium');
export const formatDateLong = (date) => formatDate(date, 'long');
```

**Testing:**
- [ ] Update imports across all files using formatDate
- [ ] Verify date formats on proposal cards
- [ ] Test date display in Compare Terms modal

~~~~~

### CHUNK 8: Duplicate dateUtils.js Files
**File:** `app/src/islands/shared/VirtualMeetingManager/dateUtils.js` AND `app/src/islands/shared/DateChangeRequestManager/dateUtils.js`
**Line:** 1-219 (VirtualMeeting) and 1-218 (DateChange)
**Issue:** Two component directories have their own `dateUtils.js` with overlapping functions: `generateCalendarDays`, `getPreviousMonth`, `getNextMonth`, `isPastDate`, `isSameDate`, `toISOString`, `fromISOString`, `getMonthNames`, `getDayNames`. Both import from `date-fns` and implement the same logic.
**Affected Pages:** /guest-proposals (Virtual Meeting), proposal modals

**Current Code:**
```javascript
// BOTH files have nearly identical implementations of:
export const generateCalendarDays = (currentMonth) => {
  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDayOfMonth = startOfMonth(currentMonth);
  const startingDayOfWeek = getDay(firstDayOfMonth);
  // ... same logic
};

export const getPreviousMonth = (currentMonth) => subMonths(currentMonth, 1);
export const getNextMonth = (currentMonth) => addMonths(currentMonth, 1);
export const isSameDate = (date1, date2) => { /* same logic */ };
```

**Refactored Code:**
```javascript
// CREATE: app/src/lib/formatters/calendarUtils.js
import { format, addMonths, subMonths, getDaysInMonth, startOfMonth, getDay } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

export const EST_TIMEZONE = 'America/New_York';

// Calendar generation
export const generateCalendarDays = (currentMonth) => {
  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDayOfMonth = startOfMonth(currentMonth);
  const startingDayOfWeek = getDay(firstDayOfMonth);
  const days = [];
  for (let i = 0; i < startingDayOfWeek; i++) days.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day));
  }
  return days;
};

// Navigation
export const getPreviousMonth = (currentMonth) => subMonths(currentMonth, 1);
export const getNextMonth = (currentMonth) => addMonths(currentMonth, 1);

// Comparison
export const isSameDate = (date1, date2) => {
  const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
  const d2 = typeof date2 === 'string' ? new Date(date2) : date2;
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
};

export const isPastDate = (date) => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);
  return checkDate < now;
};

// Timezone conversions
export const toEST = (utcDate) => toZonedTime(utcDate, EST_TIMEZONE);
export const toUTC = (estDate) => fromZonedTime(estDate, EST_TIMEZONE);

// ISO helpers
export const toISOString = (date) => date.toISOString();
export const fromISOString = (isoString) => new Date(isoString);

// Names
export const getMonthNames = () => Array.from({ length: 12 }, (_, i) => format(new Date(2000, i, 1), 'MMMM'));
export const getDayNames = () => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// UPDATE both component dateUtils to re-export:
// VirtualMeetingManager/dateUtils.js & DateChangeRequestManager/dateUtils.js
export * from '../../../lib/formatters/calendarUtils.js';

// Add component-specific functions in their respective files
```

**Testing:**
- [ ] Test calendar navigation in Virtual Meeting booking modal
- [ ] Test calendar in Date Change Request modal
- [ ] Verify EST timezone display

~~~~~

## PAGE GROUP: /listing-dashboard (Chunks: 9, 10)

~~~~~

### CHUNK 9: Duplicate Price Calculation Functions
**File:** `app/src/lib/priceCalculations.js` AND `app/src/lib/scheduleSelector/priceCalculations.js`
**Line:** 1-146 (lib/) and 1-380 (scheduleSelector/)
**Issue:** Two files handle price calculations with different scopes:
  - `lib/priceCalculations.js` - Simple 4-week rent calculation
  - `lib/scheduleSelector/priceCalculations.js` - Full calculation with Monthly/Weekly/Nightly types, markups, discounts

The simpler version is used on /view-split-lease while the complex version powers the schedule selector. Overlapping function names (`calculate4WeekRent`, `calculateReservationTotal`, `getNightlyPriceForNights`) create import confusion.

**Affected Pages:** /listing-dashboard, /view-split-lease

**Current Code:**
```javascript
// app/src/lib/priceCalculations.js (Lines 16-31)
export function calculate4WeekRent(nightlyPrice, nightsPerWeek) {
  if (!nightlyPrice || !nightsPerWeek) return 0;
  return nightlyPrice * nightsPerWeek * 4;  // Simple multiplication
}

// app/src/lib/scheduleSelector/priceCalculations.js (Lines 33-112)
export const calculatePrice = (selectedNights, listing, reservationSpan = 13, zatConfig = null) => {
  // Complex calculation with rental types, markups, discounts
  if (rentalType === 'Monthly') { /* ... */ }
  else if (rentalType === 'Weekly') { /* ... */ }
  else { /* Nightly */ }
};
```

**Refactored Code:**
```javascript
// KEEP: app/src/lib/scheduleSelector/priceCalculations.js as canonical
// RENAME: app/src/lib/priceCalculations.js → app/src/lib/priceCalculationsSimple.js
// Or DELETE and update imports to use the full calculator

// Add simple helpers to the main calculator:
// In app/src/lib/scheduleSelector/priceCalculations.js:

/**
 * Simple 4-week rent calculation (legacy helper)
 * For new code, use calculatePrice() with full context
 */
export function calculateSimple4WeekRent(nightlyPrice, nightsPerWeek) {
  if (!nightlyPrice || !nightsPerWeek) return 0;
  return nightlyPrice * nightsPerWeek * 4;
}

// UPDATE: app/src/lib/priceCalculations.js to re-export
export { calculateSimple4WeekRent as calculate4WeekRent } from './scheduleSelector/priceCalculations.js';
export { calculatePrice, calculatePricingBreakdown } from './scheduleSelector/priceCalculations.js';
```

**Testing:**
- [ ] Verify pricing on /view-split-lease page
- [ ] Test pricing updates in schedule selector on /search
- [ ] Verify pricing section on /listing-dashboard

~~~~~

### CHUNK 10: Excessive Console Logging in Production Code
**File:** Multiple files (503 occurrences across 50+ files)
**Line:** Various
**Issue:** Over 500 `console.log`, `console.warn`, and `console.error` statements exist across the codebase. Many are debugging statements left in production code. This impacts performance and leaks internal information to browser console.

Key offenders:
- `lib/auth/tokenValidation.js`: 33 occurrences
- `lib/auth/login.js`: 29 occurrences
- `lib/dataLookups.js`: 35 occurrences
- `lib/proposals/userProposalQueries.js`: 41 occurrences
- `lib/listingDataFetcher.js`: 40 occurrences

**Affected Pages:** ALL

**Current Code:**
```javascript
// app/src/lib/scheduleSelector/priceCalculations.js (Lines 36-40)
console.log('=== CALCULATE PRICE ===');
console.log('nightsCount:', nightsCount);
console.log('listing rental type:', listing?.['rental type'] || listing?.rentalType);
console.log('reservationSpan:', reservationSpan);

// app/src/logic/workflows/proposals/cancelProposalWorkflow.js (Lines 112-127)
console.log('[cancelProposalWorkflow] Cancelling proposal:', proposalId);
// ...
console.log('[cancelProposalWorkflow] Proposal cancelled successfully:', proposalId);
```

**Refactored Code:**
```javascript
// CREATE: app/src/lib/logger.js (or update existing)
const isDev = import.meta.env.DEV;

export const logger = {
  debug: (...args) => isDev && console.log('[DEBUG]', ...args),
  info: (...args) => isDev && console.info('[INFO]', ...args),
  warn: (...args) => console.warn('[WARN]', ...args),  // Keep warnings in prod
  error: (...args) => console.error('[ERROR]', ...args),  // Keep errors in prod
};

// USAGE - replace console.log with logger.debug:
import { logger } from '../lib/logger.js';

logger.debug('=== CALCULATE PRICE ===', { nightsCount, rentalType, reservationSpan });

// For critical operations, keep structured logging:
logger.info('[cancelProposalWorkflow] Cancelling proposal:', proposalId);
```

**Testing:**
- [ ] Run `bun run build` and verify no console logs in production bundle
- [ ] Test that warnings/errors still appear in development
- [ ] Verify auth flow logs are removed from production

~~~~~

## PAGE GROUP: /account-profile (Chunks: 11)

~~~~~

### CHUNK 11: Component-Level Formatter Duplication
**File:** `app/src/islands/pages/HostProposalsPage/formatters.js` AND `app/src/islands/pages/FavoriteListingsPage/formatters.js`
**Line:** 1-87 (HostProposals) and 1-162 (FavoriteListings)
**Issue:** Two page-level formatter files with overlapping functionality. Both define `formatDate`, both format currencies. Creates maintenance burden - updating date formats requires changes in multiple places.
**Affected Pages:** /host-proposals, /favorite-listings, potentially others

**Current Code:**
```javascript
// app/src/islands/pages/HostProposalsPage/formatters.js
export function formatCurrency(amount) { /* ... */ }
export function formatDate(date) { /* returns M/D/YY */ }
export function formatFullDate(date) { /* returns 'Mar 28, 2025' */ }
export function formatDateTime(date) { /* ... */ }

// app/src/islands/pages/FavoriteListingsPage/formatters.js
export const getBathroomDisplay = (count) => { /* ... */ };
export const formatBedroomBathroom = (bedrooms, bathrooms, kitchenType) => { /* ... */ };
export const formatPrice = (price, currency = 'USD') => { /* ... */ };
export const formatLocation = (borough, hood, city) => { /* ... */ };
export const formatDate = (dateString) => { /* returns 'Jan 15, 2024' */ };
```

**Refactored Code:**
```javascript
// CREATE: app/src/lib/formatters/index.js (barrel export)
export * from './priceFormatter.js';
export * from './dateFormatter.js';
export * from './calendarUtils.js';
export * from './listingFormatter.js';

// CREATE: app/src/lib/formatters/listingFormatter.js
const bathroomDisplayMap = {
  1: '1 Bath', 1.5: '1.5 Baths', /* ... */
};

export const getBathroomDisplay = (count) => bathroomDisplayMap[count] || `${count} Baths`;

export const formatBedroomBathroom = (bedrooms, bathrooms, kitchenType) => {
  // Move implementation here
};

export const formatLocation = (borough, hood, city) => {
  return [borough, hood, city].filter(Boolean).join(', ');
};

// THEN DELETE page-level formatters and update imports:
// import { formatDate, formatPrice, formatLocation } from '../../../lib/formatters';
```

**Testing:**
- [ ] Update imports in HostProposalsPage components
- [ ] Update imports in FavoriteListingsPage components
- [ ] Verify all date/price displays render correctly

~~~~~

## PAGE GROUP: AUTO (Chunks: 12)

~~~~~

### CHUNK 12: Direct Supabase Imports in UI Components
**File:** Multiple UI component files
**Line:** Various (30+ files)
**Issue:** Many UI components directly import `supabase` client and make database calls. This violates separation of concerns - UI components should call service functions, not database directly. Makes testing harder and couples UI to data layer.

Examples:
- `islands/modals/EditProposalModal.jsx`
- `islands/shared/ContactHostMessaging.jsx`
- `islands/shared/GoogleMap.jsx`
- `islands/pages/WhySplitLeasePage.jsx`

**Affected Pages:** AUTO (multiple)

**Current Code:**
```javascript
// app/src/islands/modals/EditProposalModal.jsx (Line 19)
import { supabase } from '../../lib/supabase.js';

// Inside component:
const { data, error } = await supabase
  .from('proposal')
  .update({ /* fields */ })
  .eq('_id', proposalId);
```

**Refactored Code:**
```javascript
// MOVE database calls to service files:
// app/src/lib/proposalService.js (create or extend)
import { supabase } from './supabase.js';

export async function updateProposal(proposalId, updates) {
  const { data, error } = await supabase
    .from('proposal')
    .update(updates)
    .eq('_id', proposalId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// IN COMPONENT:
import { updateProposal } from '../../lib/proposalService.js';

// Inside component:
const updatedProposal = await updateProposal(proposalId, { /* fields */ });
```

**Testing:**
- [ ] Create service functions for all direct Supabase calls in UI
- [ ] Update component imports
- [ ] Verify CRUD operations still work correctly

~~~~~

---

## Summary by Priority

### High Priority (Address First)
1. **CHUNK 1 & 2**: Duplicate constants files - causes status/stage bugs
2. **CHUNK 3**: Duplicate processProposalData - causes data transformation bugs
3. **CHUNK 4**: Duplicate cancelProposalWorkflow - maintenance burden

### Medium Priority
4. **CHUNK 5**: Duplicate DAY_NAMES - inconsistent day displays
5. **CHUNK 6 & 7**: Duplicate formatters - inconsistent formatting
6. **CHUNK 8**: Duplicate dateUtils - maintenance burden
7. **CHUNK 9**: Duplicate price calculations - potential pricing bugs

### Lower Priority (Cleanup)
8. **CHUNK 10**: Console logging - performance/security
9. **CHUNK 11**: Component-level formatters - organization
10. **CHUNK 12**: Direct Supabase imports - architecture improvement

---

## File References

### Files to DELETE after refactoring:
- `app/src/lib/constants/proposalStages.js` → re-export from logic/
- `app/src/lib/constants/proposalStatuses.js` → re-export from logic/
- `app/src/logic/processors/proposal/processProposalData.js` → rename
- `app/src/logic/workflows/booking/cancelProposalWorkflow.js` → consolidated

### Files to CREATE:
- `app/src/lib/formatters/index.js` - barrel export
- `app/src/lib/formatters/priceFormatter.js` - canonical price formatting
- `app/src/lib/formatters/dateFormatter.js` - canonical date formatting
- `app/src/lib/formatters/calendarUtils.js` - calendar utilities
- `app/src/lib/formatters/listingFormatter.js` - listing display helpers

### Files to UPDATE:
- `app/src/lib/dayUtils.js` - add DAY_LETTERS, DAY_ABBREV
- `app/src/lib/logger.js` - enhance with environment-aware logging
- `app/src/lib/priceCalculations.js` - re-export from scheduleSelector
- All component files with direct Supabase imports
