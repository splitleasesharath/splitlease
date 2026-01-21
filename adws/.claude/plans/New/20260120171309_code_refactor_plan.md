# Code Refactoring Plan - ../app

Date: 2026-01-20
Audit Type: general

## Executive Summary

This audit identified **9 critical issues** involving code duplication, inconsistent patterns, and architectural violations across the `app/src` directory. The most significant findings involve duplicate implementations of:

1. **proposalStatuses.js** - Two divergent implementations (lib/ vs logic/)
2. **proposalStages.js** - Two divergent implementations (lib/ vs logic/)
3. **priceCalculations** - Multiple implementations across codebase
4. **formatPrice** - 4 separate implementations
5. **dateUtils** - 2 duplicate implementations in different shared components
6. **processProposalData** - 2 completely different implementations
7. **cancelProposalWorkflow** - 2 completely different implementations

These duplications violate the four-layer logic architecture and create maintenance burdens.

~~~~~

## PAGE GROUP: GLOBAL (Chunks: 1, 2, 3, 4)

### CHUNK 1: Consolidate proposalStatuses.js duplicates
**File:** `src/lib/constants/proposalStatuses.js` and `src/logic/constants/proposalStatuses.js`
**Line:** 1-251 (lib) and 1-384 (logic)
**Issue:** Two divergent implementations of the same module with different features. The `logic/` version has additional fields (`usualOrder`, `isSuggestedBySL`, `guestConfirmed`) and more functions (`getUsualOrder`, `shouldShowStatusBanner`, `isSuggestedProposal`, `isPendingConfirmationProposal`, `getStatusesByColor`, `getStatusesByStage`).
**Affected Pages:** /guest-proposals, /host-proposals, /view-split-lease, /messages, /preview-split-lease

**Current Code (lib/constants/proposalStatuses.js):**
```javascript
// 251 lines - Missing usualOrder, isSuggestedBySL, guestConfirmed fields
// Missing getUsualOrder, shouldShowStatusBanner, isSuggestedProposal functions
export const PROPOSAL_STATUSES = {
  CANCELLED_BY_GUEST: {
    key: 'Proposal Cancelled by Guest',
    color: 'red',
    label: 'Cancelled by You',
    stage: null,
    actions: ['view_listing', 'explore_rentals']
  },
  // ... (less complete version)
};
```

**Refactored Code:**
```javascript
// DELETE src/lib/constants/proposalStatuses.js entirely
// Keep only src/logic/constants/proposalStatuses.js which has the complete implementation
// Update all imports across the codebase to point to the logic/ version
```

**Cascading Changes Required:**
- Search for: `import.*from.*['"].*lib/constants/proposalStatuses`
- Files that may need import updates: Check all guest-proposals, host-proposals, view-split-lease components

**Testing:**
- [ ] Verify all status-dependent UI renders correctly
- [ ] Test proposal flow from creation to completion
- [ ] Verify counteroffer and cancellation flows

~~~~~

### CHUNK 2: Consolidate proposalStages.js duplicates
**File:** `src/lib/constants/proposalStages.js` and `src/logic/constants/proposalStages.js`
**Line:** 1-161 (lib) and 1-244 (logic)
**Issue:** Two implementations of PROPOSAL_STAGES. The `logic/` version has additional functions (`getStageProgress`, `getCompletedStages`, `getRemainingStages`, `isStagePending`, `getPreviousStage`, `getNextStage`).
**Affected Pages:** /guest-proposals, /host-proposals, /view-split-lease, /messages

**Current Code (lib/constants/proposalStages.js):**
```javascript
// 161 lines - Missing getStageProgress, getCompletedStages, getRemainingStages,
// isStagePending, getPreviousStage, getNextStage
export const PROPOSAL_STAGES = [
  {
    id: 1,
    name: 'Proposal Submitted',
    shortName: 'Submitted',
    icon: '1',
    description: 'Your proposal has been submitted to the host',
    helpText: 'The next step is to complete your rental application so the host can review your profile.'
  },
  // ...
];
```

**Refactored Code:**
```javascript
// DELETE src/lib/constants/proposalStages.js entirely
// Keep only src/logic/constants/proposalStages.js which has the complete implementation
// Update all imports across the codebase to point to the logic/ version
```

**Cascading Changes Required:**
- Search for: `import.*from.*['"].*lib/constants/proposalStages`
- Update imports in all proposal-related components

**Testing:**
- [ ] Verify ProgressTracker component renders correctly
- [ ] Test stage progression through proposal flow
- [ ] Verify stage display on all proposal pages

~~~~~

### CHUNK 3: Consolidate formatPrice implementations
**File:** Multiple files contain `formatPrice` function
**Line:**
- `src/lib/priceCalculations.js:73`
- `src/lib/proposals/dataTransformers.js:216`
- `src/logic/processors/proposals/processProposalData.js:209`
- `src/islands/pages/FavoriteListingsPage/formatters.js:94`
**Issue:** 4 separate implementations of formatPrice with slightly different behavior. This violates DRY principle and the four-layer architecture.
**Affected Pages:** ALL pages that display pricing (/search, /view-split-lease, /guest-proposals, /host-proposals, /favorite-listings, /preview-split-lease)

**Current Code (lib/priceCalculations.js:73-86):**
```javascript
export function formatPrice(amount, showCents = false) {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '$0';
  }

  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: showCents ? 2 : 0,
    maximumFractionDigits: showCents ? 2 : 0
  }).format(amount);

  return formatted;
}
```

**Current Code (logic/processors/proposals/processProposalData.js:209-220):**
```javascript
export function formatPrice(price, includeCents = true) {
  if (price === null || price === undefined) return null;

  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: includeCents ? 2 : 0,
    maximumFractionDigits: includeCents ? 2 : 0
  });

  return formatter.format(price);
}
```

**Current Code (islands/pages/FavoriteListingsPage/formatters.js:94-103):**
```javascript
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
// CREATE NEW: src/logic/processors/display/formatPrice.js
/**
 * Format currency value for display
 *
 * @param {object} params - Named parameters
 * @param {number} params.amount - Amount to format
 * @param {boolean} [params.showCents=false] - Whether to show decimal places
 * @param {string} [params.currency='USD'] - Currency code
 * @param {string} [params.suffix=''] - Suffix to append (e.g., '/night')
 * @returns {string|null} Formatted price string or null if invalid
 */
export function formatPrice({ amount, showCents = false, currency = 'USD', suffix = '' }) {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return null;
  }

  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: showCents ? 2 : 0,
    maximumFractionDigits: showCents ? 2 : 0
  }).format(amount);

  return suffix ? `${formatted}${suffix}` : formatted;
}
```

**Cascading Changes Required:**
- `src/lib/priceCalculations.js` - Remove formatPrice, re-export from new location
- `src/lib/proposals/dataTransformers.js` - Import from new location
- `src/logic/processors/proposals/processProposalData.js` - Import from new location
- `src/islands/pages/FavoriteListingsPage/formatters.js` - Import from new location
- All consuming components need import updates

**Testing:**
- [ ] Verify price display on search page
- [ ] Verify price display on view-split-lease
- [ ] Verify price display in proposal cards
- [ ] Verify nightly rate formatting in favorites page

~~~~~

### CHUNK 4: Consolidate priceCalculation functions
**File:** `src/lib/priceCalculations.js` and `src/logic/calculators/pricing/`
**Line:**
- `src/lib/priceCalculations.js:16-31` (calculate4WeekRent, calculateReservationTotal)
- `src/logic/calculators/pricing/calculateFourWeekRent.js` (complete file)
- `src/logic/calculators/pricing/calculateReservationTotal.js` (complete file)
**Issue:** Duplicate pricing calculation implementations. The `lib/` version is older and less robust. The `logic/calculators/` version follows the four-layer architecture with proper validation.
**Affected Pages:** /view-split-lease, /preview-split-lease, /create-suggested-proposal, /guest-proposals, /host-proposals

**Current Code (lib/priceCalculations.js:16-31):**
```javascript
export function calculate4WeekRent(nightlyPrice, nightsPerWeek) {
  if (!nightlyPrice || !nightsPerWeek) return 0;
  return nightlyPrice * nightsPerWeek * 4;
}

export function calculateReservationTotal(fourWeekRent, totalWeeks) {
  if (!fourWeekRent || !totalWeeks) return 0;
  return fourWeekRent * (totalWeeks / 4);
}
```

**Refactored Code:**
```javascript
// DELETE calculate4WeekRent and calculateReservationTotal from src/lib/priceCalculations.js
// Keep the implementations in src/logic/calculators/pricing/
// Re-export from lib/priceCalculations.js if needed for backwards compatibility:

// src/lib/priceCalculations.js (updated)
export { calculateFourWeekRent as calculate4WeekRent } from '../logic/calculators/pricing/calculateFourWeekRent.js';
export { calculateReservationTotal } from '../logic/calculators/pricing/calculateReservationTotal.js';
// OR: Update all imports to use logic/calculators/pricing directly
```

**Cascading Changes Required:**
- Search for: `import.*calculate4WeekRent.*from.*priceCalculations`
- Search for: `import.*calculateReservationTotal.*from.*priceCalculations`
- Update all imports to use logic/calculators/pricing versions

**Testing:**
- [ ] Verify 4-week rent calculation on view-split-lease
- [ ] Verify reservation total calculation
- [ ] Test pricing breakdown on proposal creation flow

~~~~~

## PAGE GROUP: /guest-proposals, /host-proposals (Chunks: 5, 6)

### CHUNK 5: Consolidate processProposalData implementations
**File:** `src/logic/processors/proposal/processProposalData.js` and `src/logic/processors/proposals/processProposalData.js`
**Line:** Complete files (149 lines vs 305 lines)
**Issue:** Two completely different implementations with different signatures and return shapes. The singular `proposal/` version uses destructured params and focuses on currentTerms/originalTerms. The plural `proposals/` version uses positional params and includes nested processListingData/processHostData/processVirtualMeetingData.
**Affected Pages:** /guest-proposals, /host-proposals, /view-split-lease, /preview-split-lease, /messages

**Current Code (logic/processors/proposal/processProposalData.js signature):**
```javascript
export function processProposalData({ rawProposal, listing = null, guest = null, host = null }) {
  // Returns: { id, listingId, guestId, status, currentTerms, originalTerms, hasCounteroffer, ... }
}
```

**Current Code (logic/processors/proposals/processProposalData.js signature):**
```javascript
export function processProposalData(rawProposal) {
  // Returns: { id, _id, status, listing: processListingData(...), host: processHostData(...), ... }
}
```

**Refactored Code:**
```javascript
// KEEP: src/logic/processors/proposals/processProposalData.js (the more complete version)
// DELETE: src/logic/processors/proposal/ directory entirely (singular form)
// The plural "proposals" version includes all necessary transformations and nested processors

// Update all imports that use the singular form to use the plural form:
// FROM: import { processProposalData } from '../../logic/processors/proposal/processProposalData.js'
// TO:   import { processProposalData } from '../../logic/processors/proposals/processProposalData.js'
```

**Cascading Changes Required:**
- `src/logic/workflows/booking/loadProposalDetailsWorkflow.js` - Verify correct import
- All pages that import from `processors/proposal/` (singular)
- Search for: `from.*processors/proposal/processProposalData`

**Testing:**
- [ ] Verify proposal data loading on guest-proposals page
- [ ] Verify proposal data loading on host-proposals page
- [ ] Test compare terms modal data
- [ ] Verify counteroffer display

~~~~~

### CHUNK 6: Consolidate cancelProposalWorkflow implementations
**File:** `src/logic/workflows/booking/cancelProposalWorkflow.js` and `src/logic/workflows/proposals/cancelProposalWorkflow.js`
**Line:** Complete files (144 lines vs 176 lines)
**Issue:** Two completely different implementations. The `booking/` version uses dependency injection for supabase and canCancelProposal rule. The `proposals/` version imports supabase directly and calls the rule inline. Different return shapes and decision trees.
**Affected Pages:** /guest-proposals, /host-proposals, /view-split-lease

**Current Code (logic/workflows/booking/cancelProposalWorkflow.js signature):**
```javascript
export async function cancelProposalWorkflow({
  supabase,
  proposal,
  source = 'main',
  canCancelProposal
}) {
  // Dependency injection pattern
  // Returns: { success, message, updated, requiresPhoneCall? }
}
```

**Current Code (logic/workflows/proposals/cancelProposalWorkflow.js exports):**
```javascript
export function determineCancellationCondition(proposal) { ... }
export async function executeCancelProposal(proposalId, reason = null) { ... }
export async function cancelProposalFromCompareTerms(proposalId, reason = 'Counteroffer declined') { ... }
export async function executeDeleteProposal(proposalId) { ... }
```

**Refactored Code:**
```javascript
// KEEP: src/logic/workflows/proposals/cancelProposalWorkflow.js (more complete API)
// DELETE: src/logic/workflows/booking/cancelProposalWorkflow.js

// The proposals/ version has:
// - determineCancellationCondition (pure function for business logic)
// - executeCancelProposal (database operation)
// - cancelProposalFromCompareTerms (specialized for compare modal)
// - executeDeleteProposal (soft delete)

// Update booking/ to re-export or inline redirect if needed for backwards compat
```

**Cascading Changes Required:**
- Search for: `from.*workflows/booking/cancelProposalWorkflow`
- Update imports to use `workflows/proposals/cancelProposalWorkflow`
- Check CancelProposalModal.jsx for correct import

**Testing:**
- [ ] Test cancel proposal from main guest-proposals page
- [ ] Test cancel from compare terms modal
- [ ] Test soft-delete of already-cancelled proposal
- [ ] Verify high-order cancellation confirmation flow

~~~~~

## PAGE GROUP: /view-split-lease, /virtual-meeting (Chunks: 7, 8)

### CHUNK 7: Consolidate dateUtils implementations
**File:** `src/islands/shared/VirtualMeetingManager/dateUtils.js` and `src/islands/shared/DateChangeRequestManager/dateUtils.js`
**Line:** Complete files (219 lines vs 218 lines)
**Issue:** Two nearly identical dateUtils files in different feature directories. Both implement: generateCalendarDays, getPreviousMonth, getNextMonth, isPastDate, isSameDate, toISOString, fromISOString, getMonthNames, getDayNames. Virtual Meeting version has EST timezone utilities; DateChangeRequest version has expiration utilities.
**Affected Pages:** /guest-proposals (virtual meetings), /host-proposals (date change requests), /messages

**Current Code (VirtualMeetingManager/dateUtils.js unique functions):**
```javascript
export const toUTC = (estDate) => { ... };
export const toEST = (utcDate) => { ... };
export const formatTimeEST = (date, formatString = 'MMM d, yyyy h:mm a') => { ... };
export const formatTimeOnlyEST = (date) => { ... };
export const formatDateOnlyEST = (date) => { ... };
export const generateTimeSlots = (date, startHour = 8, endHour = 20, interval = 30) => { ... };
export const isSameDateTime = (date1, date2) => { ... };
export const generateGoogleCalendarUrl = (meeting, proposal) => { ... };
```

**Current Code (DateChangeRequestManager/dateUtils.js unique functions):**
```javascript
export const formatDate = (date, formatString = 'MMM d, yyyy') => { ... };
export const formatMonthYear = (date) => { ... };
export const isDateInRange = (date, startDate, endDate) => { ... };
export const isDateInList = (date, dateList) => { ... };
export const getExpirationDate = (hoursFromNow = 48) => { ... };
export const isExpiringSoon = (expirationDate, hoursThreshold = 6) => { ... };
export const hasExpired = (expirationDate) => { ... };
export const getTimeRemaining = (expirationDate) => { ... };
```

**Refactored Code:**
```javascript
// CREATE NEW: src/lib/dateUtils.js (consolidate all functions)
// This becomes the single source of truth for date utilities

// Export all shared functions:
export { generateCalendarDays, getPreviousMonth, getNextMonth, isPastDate,
         isSameDate, toISOString, fromISOString, getMonthNames, getDayNames } from './dateUtils/core.js';

// Export timezone utilities:
export { toUTC, toEST, formatTimeEST, formatTimeOnlyEST, formatDateOnlyEST } from './dateUtils/timezone.js';

// Export calendar utilities:
export { generateTimeSlots, isSameDateTime, generateGoogleCalendarUrl } from './dateUtils/calendar.js';

// Export expiration utilities:
export { getExpirationDate, isExpiringSoon, hasExpired, getTimeRemaining } from './dateUtils/expiration.js';

// DELETE: src/islands/shared/VirtualMeetingManager/dateUtils.js
// DELETE: src/islands/shared/DateChangeRequestManager/dateUtils.js
// Update all imports to use src/lib/dateUtils.js
```

**Cascading Changes Required:**
- `VirtualMeetingManager/BookTimeSlot.jsx` - Update import
- `VirtualMeetingManager/*.jsx` files - Update imports
- `DateChangeRequestManager/*.jsx` files - Update imports
- `ScheduleCohost/` files - Check for dateUtils usage

**Testing:**
- [ ] Test virtual meeting booking calendar
- [ ] Test date change request calendar
- [ ] Verify timezone conversions for EST
- [ ] Test expiration warnings

~~~~~

### CHUNK 8: Consolidate DAY_NAMES definitions
**File:** Multiple locations define DAY_NAMES
**Line:**
- `src/lib/constants.js:63-71` (DAY_NAMES array)
- `src/lib/dayUtils.js:24-32` (DAY_NAMES array)
- `src/islands/shared/VirtualMeetingManager/dateUtils.js:216-218` (getDayNames function)
- `src/islands/shared/DateChangeRequestManager/dateUtils.js:214-217` (getDayNames function)
**Issue:** DAY_NAMES defined in multiple places. Constants should be defined once in lib/constants.js and imported elsewhere.
**Affected Pages:** ALL scheduling-related pages

**Current Code (lib/constants.js:63-71):**
```javascript
export const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday'
];
```

**Current Code (lib/dayUtils.js:24-32):**
```javascript
export const DAY_NAMES = [
  'Sunday',   // 0
  'Monday',   // 1
  'Tuesday',  // 2
  'Wednesday',// 3
  'Thursday', // 4
  'Friday',   // 5
  'Saturday'  // 6
];
```

**Current Code (VirtualMeetingManager/dateUtils.js:216-218):**
```javascript
export const getDayNames = () => {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
};
```

**Refactored Code:**
```javascript
// KEEP: src/lib/constants.js as the single source of truth for DAY_NAMES
// UPDATE: src/lib/dayUtils.js to import from constants.js

// src/lib/dayUtils.js (updated)
import { DAY_NAMES } from './constants.js';
export { DAY_NAMES }; // Re-export for convenience

// For short day names, add to constants.js:
export const DAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// DELETE getDayNames() from dateUtils files - use constants directly
```

**Cascading Changes Required:**
- `src/lib/dayUtils.js` - Import from constants instead of defining
- `src/islands/shared/VirtualMeetingManager/dateUtils.js` - Import from constants
- `src/islands/shared/DateChangeRequestManager/dateUtils.js` - Import from constants

**Testing:**
- [ ] Verify day picker displays correct names
- [ ] Verify calendar headers show correct day names
- [ ] Test schedule selector day labels

~~~~~

## PAGE GROUP: /favorite-listings (Chunk: 9)

### CHUNK 9: Move FavoriteListingsPage formatters to logic layer
**File:** `src/islands/pages/FavoriteListingsPage/formatters.js`
**Line:** 1-162
**Issue:** This file contains business logic (formatBedroomBathroom, formatLocation, getProcessedImageUrl) colocated with a page component. Per the four-layer architecture, these should be in the logic/ directory.
**Affected Pages:** /favorite-listings

**Current Code (formatters.js location):**
```
src/islands/pages/FavoriteListingsPage/formatters.js
```

**Refactored Code:**
```javascript
// MOVE TO: src/logic/processors/display/formatListingDisplay.js

/**
 * Display formatting utilities for listing data
 *
 * @fileoverview Pure functions for formatting listing properties for UI display
 */

// Move from formatters.js:
export const getBathroomDisplay = (count) => { ... };
export const formatBedroomBathroom = (bedrooms, bathrooms, kitchenType) => { ... };
export const formatLocation = (borough, hood, city) => { ... };
export const formatDate = (dateString) => { ... };
export const getProcessedImageUrl = (imageUrl, width, height) => { ... };

// formatPrice moved to formatPrice.js (Chunk 3)

// UPDATE: src/islands/pages/FavoriteListingsPage/FavoriteListingsPage.jsx imports
// FROM: import { formatBedroomBathroom, formatLocation } from './formatters.js'
// TO:   import { formatBedroomBathroom, formatLocation } from '../../../logic/processors/display/formatListingDisplay.js'
```

**Cascading Changes Required:**
- `FavoriteListingsPage.jsx` - Update import path
- `ListingCard.jsx` (if it exists in that directory) - Update import path

**Testing:**
- [ ] Verify bedroom/bathroom display formatting
- [ ] Verify location display formatting
- [ ] Verify image processing URLs

~~~~~

## Dependency Impact Summary

| File Pattern | Dependents | Refactor Risk |
|--------------|------------|---------------|
| `lib/constants.js` | 52 | CRITICAL - Do not modify exports, only add |
| `logic/constants/proposalStatuses.js` | 40 | HIGH - Consolidation affects many files |
| `lib/priceCalculations.js` | ~15 | MEDIUM - Re-export pattern recommended |
| `logic/processors/proposals/*` | ~10 | MEDIUM - Single directory, clear ownership |

## Recommended Execution Order

1. **Chunk 8** (DAY_NAMES) - Lowest risk, pure constants
2. **Chunk 2** (proposalStages) - Moderate risk, clear path
3. **Chunk 1** (proposalStatuses) - Higher complexity due to function differences
4. **Chunk 3** (formatPrice) - High impact, many consumers
5. **Chunk 4** (priceCalculations) - Depends on Chunk 3
6. **Chunk 9** (FavoriteListingsPage formatters) - Isolated page
7. **Chunk 7** (dateUtils) - Feature-specific, contained
8. **Chunk 5** (processProposalData) - Affects proposal pages
9. **Chunk 6** (cancelProposalWorkflow) - Most complex, affects critical flows

## File References

### Critical Files (DO NOT MODIFY STRUCTURE)
- `src/lib/supabase.js` (93 dependents)
- `src/lib/secureStorage.js` (89 dependents)
- `src/lib/auth.js` (79 dependents)
- `src/lib/constants.js` (52 dependents)

### Files to Delete After Consolidation
- `src/lib/constants/proposalStatuses.js`
- `src/lib/constants/proposalStages.js`
- `src/logic/processors/proposal/` (entire directory)
- `src/logic/workflows/booking/cancelProposalWorkflow.js`
- `src/islands/shared/VirtualMeetingManager/dateUtils.js`
- `src/islands/shared/DateChangeRequestManager/dateUtils.js`
- `src/islands/pages/FavoriteListingsPage/formatters.js`

### Files to Create
- `src/logic/processors/display/formatPrice.js`
- `src/logic/processors/display/formatListingDisplay.js`
- `src/lib/dateUtils/` (directory with core.js, timezone.js, calendar.js, expiration.js)
