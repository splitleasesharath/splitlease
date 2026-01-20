# Code Refactoring Plan - ../app

Date: 2026-01-20
Audit Type: general

---

## Executive Summary

This audit identified **significant code duplication** across the codebase, particularly in:
1. **Formatting utilities** - 7+ duplicate `formatDate`, 4+ duplicate `formatPrice` implementations
2. **Day constants** - 4 duplicate `DAY_NAMES` exports across different files
3. **Data transformers** - Duplicate `transformListingData`, `transformHostData`, `processProposalData` functions
4. **Cancel workflows** - 2 duplicate cancel proposal workflow implementations
5. **Price calculators** - Duplicate pricing logic in lib/ and logic/calculators/

### Dependency Impact Notes
- **CRITICAL IMPACT files (30+ dependents)**: `supabase.js`, `secureStorage.js`, `auth.js`, `constants.js` - NOT modified
- All chunks target **leaf files or low-impact files** to minimize regression risk
- Chunks are grouped by affected pages for atomic testing

~~~~~

## PAGE GROUP: GLOBAL (Chunks: 1, 2, 3, 4)

These chunks affect shared utilities used across multiple pages.

~~~~~

### CHUNK 1: Consolidate duplicate `formatPrice` implementations
**File:** `src/islands/shared/PriceDisplay.jsx`
**Line:** 12
**Issue:** Inline `formatPrice` function duplicates logic from `lib/priceCalculations.js`. The same pattern exists in `FavoriteListingsPage/formatters.js:94` and `HostProposalsPage/formatters.js:10`.
**Affected Pages:** /search, /view-split-lease, /favorite-listings, /host-proposals, /guest-proposals, /preview-split-lease

**Cascading Changes Required:**
- `src/islands/shared/PriceDisplay.jsx` (this file)
- `src/islands/pages/FavoriteListingsPage/formatters.js` (exports formatPrice)
- `src/islands/pages/HostProposalsPage/formatters.js` (exports formatCurrency)

**Current Code:**
```javascript
const formatPrice = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(amount);
};
```

**Refactored Code:**
```javascript
import { formatPrice } from '../../lib/priceCalculations.js';
// Remove inline formatPrice function - use imported version
// Note: formatPrice from lib/priceCalculations.js handles showCents parameter
```

**Testing:**
- [ ] Verify /search page price displays correctly
- [ ] Verify /view-split-lease price breakdown renders
- [ ] Verify /favorite-listings card prices display
- [ ] Verify /host-proposals modal prices display
- [ ] Run `bun run build` to check for import errors

~~~~~

### CHUNK 2: Consolidate duplicate `DAY_NAMES` constants
**File:** `src/lib/scheduleSelector/dayHelpers.js`
**Line:** 9
**Issue:** `DAY_NAMES` is exported from 4 different files: `lib/constants.js:63`, `lib/dayUtils.js:24`, `lib/scheduleSelector/dayHelpers.js:9`, and `islands/pages/proposals/displayUtils.js:14`. This creates maintenance burden and potential inconsistency.
**Affected Pages:** /search, /view-split-lease, /favorite-listings, /create-suggested-proposal, /guest-proposals

**Cascading Changes Required:**
- `src/lib/dayUtils.js` (exports DAY_NAMES)
- `src/lib/scheduleSelector/dayHelpers.js` (exports DAY_NAMES)
- `src/islands/pages/proposals/displayUtils.js` (exports DAY_NAMES)

**Current Code:**
```javascript
// In dayHelpers.js
export const DAY_NAMES = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
];
```

**Refactored Code:**
```javascript
// In dayHelpers.js - import from canonical source
import { DAY_NAMES } from '../constants.js';
export { DAY_NAMES }; // Re-export for backwards compatibility
```

**Testing:**
- [ ] Verify day names display correctly in schedule selector
- [ ] Verify /create-suggested-proposal day selection works
- [ ] Verify /guest-proposals day display is correct
- [ ] Run `bun run build` to check for import errors

~~~~~

### CHUNK 3: Remove duplicate `formatDate` implementations
**File:** `src/islands/pages/proposals/displayUtils.js`
**Line:** 37
**Issue:** 7 separate `formatDate` implementations exist across the codebase with slightly different formats. Should consolidate to a single source with format options.
**Affected Pages:** /guest-proposals, /host-proposals, /favorite-listings

**Cascading Changes Required:**
- `src/islands/pages/proposals/displayUtils.js` (has formatDate)
- `src/islands/pages/FavoriteListingsPage/formatters.js` (has formatDate)
- `src/islands/pages/HostProposalsPage/formatters.js` (has formatDate)
- `src/lib/proposals/dataTransformers.js` (has formatDate)
- `src/logic/processors/proposals/processProposalData.js` (has formatDate)

**Current Code:**
```javascript
// In displayUtils.js
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
// In displayUtils.js - import from centralized location
import { formatDate as formatDateCore } from '../../../lib/dateFormatters.js';

export function formatDate(dateValue) {
  return formatDateCore(dateValue, { fallback: 'TBD' });
}
```

**Testing:**
- [ ] Verify date formatting on /guest-proposals cards
- [ ] Verify date formatting on /host-proposals modal
- [ ] Verify date formatting on /favorite-listings cards
- [ ] Run `bun run build` to check for import errors

~~~~~

### CHUNK 4: Remove duplicate `transformListingData` functions
**File:** `src/lib/proposals/dataTransformers.js`
**Line:** 37
**Issue:** `transformListingData` duplicates logic from `logic/processors/proposals/processProposalData.js:processListingData`. Same for `transformHostData`, `transformGuestData`.
**Affected Pages:** /guest-proposals

**Cascading Changes Required:**
- `src/lib/proposals/dataTransformers.js` (this file)
- `src/logic/processors/proposals/processProposalData.js` (has processListingData)

**Current Code:**
```javascript
export function transformListingData(rawListing) {
  if (!rawListing) return null;

  const addressData = rawListing['Location - Address'];
  const addressString = typeof addressData === 'object' && addressData?.address
    ? addressData.address
    : (typeof addressData === 'string' ? addressData : null);

  return {
    id: rawListing._id,
    name: rawListing.Name,
    // ... duplicate field mappings
  };
}
```

**Refactored Code:**
```javascript
// Import from canonical location
import { processListingData } from '../../logic/processors/proposals/processProposalData.js';

// Re-export with original name for backwards compatibility
export const transformListingData = (rawListing) => {
  if (!rawListing) return null;
  try {
    return processListingData(rawListing);
  } catch {
    return null; // Maintain original behavior of returning null instead of throwing
  }
};
```

**Testing:**
- [ ] Verify /guest-proposals loads proposal data correctly
- [ ] Verify proposal cards display listing information
- [ ] Run `bun run build` to check for import errors

~~~~~

## PAGE GROUP: /guest-proposals (Chunks: 5, 6)

~~~~~

### CHUNK 5: Remove duplicate cancel workflow implementation
**File:** `src/logic/workflows/proposals/cancelProposalWorkflow.js`
**Line:** 1
**Issue:** Two cancel workflow files exist: `workflows/booking/cancelProposalWorkflow.js` and `workflows/proposals/cancelProposalWorkflow.js`. The proposals version is actively used (has imports), booking version appears unused.
**Affected Pages:** /guest-proposals

**Cascading Changes Required:**
- `src/logic/workflows/booking/cancelProposalWorkflow.js` (potentially remove)
- `src/logic/workflows/proposals/cancelProposalWorkflow.js` (keep as canonical)

**Current Code:**
```javascript
// In workflows/booking/cancelProposalWorkflow.js (UNUSED)
import { PROPOSAL_STATUSES } from '../../constants/proposalStatuses.js'

export async function cancelProposalWorkflow({
  supabase,
  proposal,
  source = 'main',
  canCancelProposal
}) {
  // ...implementation
}
```

**Refactored Code:**
```javascript
// workflows/booking/cancelProposalWorkflow.js should be deprecated
// Add deprecation comment at top of file:

/**
 * @deprecated Use workflows/proposals/cancelProposalWorkflow.js instead
 * This file is scheduled for removal. All imports should use:
 * import { executeCancelProposal } from '../proposals/cancelProposalWorkflow.js'
 */

// Re-export from canonical location for any remaining imports
export { executeCancelProposal as cancelProposalWorkflow } from '../proposals/cancelProposalWorkflow.js';
```

**Testing:**
- [ ] Verify cancel button works on /guest-proposals
- [ ] Verify delete button works on proposal cards
- [ ] Run `bun run build` to check for import errors

~~~~~

### CHUNK 6: Consolidate `processProposalData` implementations
**File:** `src/logic/processors/proposal/processProposalData.js`
**Line:** 1
**Issue:** Two `processProposalData.js` files exist at different paths: `processors/proposal/` and `processors/proposals/`. The `proposals` version is more complete but the `proposal` version has different logic for handling counteroffers.
**Affected Pages:** /guest-proposals, /view-split-lease

**Cascading Changes Required:**
- `src/logic/processors/proposal/processProposalData.js` (singular)
- `src/logic/processors/proposals/processProposalData.js` (plural - keep as canonical)
- `src/logic/workflows/booking/loadProposalDetailsWorkflow.js` (imports processor)

**Current Code:**
```javascript
// In processors/proposal/processProposalData.js (singular path)
import { PROPOSAL_STATUSES, getUsualOrder } from '../../constants/proposalStatuses.js'

export function processProposalData({ rawProposal, listing = null, guest = null, host = null }) {
  // Different implementation with currentTerms/originalTerms structure
}
```

**Refactored Code:**
```javascript
// processors/proposal/processProposalData.js should re-export from canonical
/**
 * @deprecated Use logic/processors/proposals/processProposalData.js instead
 * This file exists for backwards compatibility.
 */
export { processProposalData } from '../proposals/processProposalData.js';
```

**Testing:**
- [ ] Verify proposal data loads correctly on /guest-proposals
- [ ] Verify counteroffer terms display correctly
- [ ] Verify Compare Terms modal shows correct values
- [ ] Run `bun run build` to check for import errors

~~~~~

## PAGE GROUP: /view-split-lease (Chunks: 7, 8)

~~~~~

### CHUNK 7: Consolidate duplicate PriceDisplay components
**File:** `src/islands/shared/SuggestedProposals/components/PriceDisplay.jsx`
**Line:** 1
**Issue:** Two `PriceDisplay` components exist: `shared/PriceDisplay.jsx` (complex with breakdown) and `shared/SuggestedProposals/components/PriceDisplay.jsx` (simple). These serve different purposes but have confusing duplicate names.
**Affected Pages:** /view-split-lease, /create-suggested-proposal

**Current Code:**
```javascript
// In SuggestedProposals/components/PriceDisplay.jsx
import { formatPrice } from '../../../../lib/priceCalculations.js';

export default function PriceDisplay({ nightlyPrice, totalPrice }) {
  return (
    <div className="sp-pricing">
      <div className="sp-pricing-row">
        <span className="sp-pricing-label">Nightly Rate</span>
        <span className="sp-pricing-value">{formatPrice(nightlyPrice, false) || '$0'}</span>
      </div>
      // ...
    </div>
  );
}
```

**Refactored Code:**
```javascript
// Rename to SimplePriceDisplay for clarity
import { formatPrice } from '../../../../lib/priceCalculations.js';

/**
 * SimplePriceDisplay - Minimal price display for suggested proposals
 * For full breakdown display, use shared/PriceDisplay.jsx
 */
export default function SimplePriceDisplay({ nightlyPrice, totalPrice }) {
  return (
    <div className="sp-pricing">
      <div className="sp-pricing-row">
        <span className="sp-pricing-label">Nightly Rate</span>
        <span className="sp-pricing-value">{formatPrice(nightlyPrice, false) || '$0'}</span>
      </div>
      <div className="sp-pricing-row sp-pricing-row--total">
        <span className="sp-pricing-label">Total</span>
        <span className="sp-pricing-value sp-pricing-value--total">
          {formatPrice(totalPrice, false) || '$0'}
        </span>
      </div>
    </div>
  );
}
```

**Testing:**
- [ ] Verify price display on /view-split-lease suggested proposals
- [ ] Verify /create-suggested-proposal shows correct prices
- [ ] Run `bun run build` to check for import errors

~~~~~

### CHUNK 8: Consolidate duplicate pricing calculation logic
**File:** `src/lib/priceCalculations.js`
**Line:** 16
**Issue:** `lib/priceCalculations.js` has `calculate4WeekRent` and `calculateReservationTotal` which duplicate logic in `logic/calculators/pricing/calculateFourWeekRent.js` and `logic/calculators/pricing/calculateReservationTotal.js`. The logic/ versions follow the four-layer architecture with proper validation.
**Affected Pages:** /view-split-lease, /preview-split-lease

**Cascading Changes Required:**
- `src/lib/priceCalculations.js` (this file - should delegate to logic/)
- `src/logic/calculators/pricing/calculateFourWeekRent.js` (canonical)
- `src/logic/calculators/pricing/calculateReservationTotal.js` (canonical)

**Current Code:**
```javascript
// In lib/priceCalculations.js
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
// In lib/priceCalculations.js - delegate to canonical implementations
import { calculateFourWeekRent } from '../logic/calculators/pricing/calculateFourWeekRent.js';
import { calculateReservationTotal as calcReservationTotal } from '../logic/calculators/pricing/calculateReservationTotal.js';

/**
 * Calculate 4-week rent (wrapper for backwards compatibility)
 * @deprecated Prefer using calculateFourWeekRent from logic/calculators/pricing/
 */
export function calculate4WeekRent(nightlyPrice, nightsPerWeek) {
  if (!nightlyPrice || !nightsPerWeek) return 0;
  try {
    return calculateFourWeekRent({ nightlyRate: nightlyPrice, frequency: nightsPerWeek });
  } catch {
    return 0; // Maintain original behavior of returning 0 instead of throwing
  }
}

/**
 * Calculate reservation total (wrapper for backwards compatibility)
 * @deprecated Prefer using calculateReservationTotal from logic/calculators/pricing/
 */
export function calculateReservationTotal(fourWeekRent, totalWeeks) {
  if (!fourWeekRent || !totalWeeks) return 0;
  try {
    return calcReservationTotal({ fourWeekRent, totalWeeks });
  } catch {
    return 0; // Maintain original behavior of returning 0 instead of throwing
  }
}
```

**Testing:**
- [ ] Verify 4-week rent calculation on /view-split-lease
- [ ] Verify reservation total on /preview-split-lease
- [ ] Verify pricing breakdown shows correct values
- [ ] Run `bun run build` to check for import errors

~~~~~

## PAGE GROUP: /host-proposals (Chunks: 9)

~~~~~

### CHUNK 9: Remove duplicate formatCurrency in HostProposalsPage
**File:** `src/islands/pages/HostProposalsPage/formatters.js`
**Line:** 10
**Issue:** `formatCurrency` in HostProposalsPage duplicates `formatPrice` from lib/priceCalculations.js but with different formatting (always shows 2 decimal places, no currency symbol prefix).
**Affected Pages:** /host-proposals

**Cascading Changes Required:**
- `src/islands/pages/HostProposalsPage/formatters.js` (this file)
- `src/islands/pages/HostProposalsPage/ProposalCard.jsx` (imports formatCurrency)
- `src/islands/pages/HostProposalsPage/ProposalDetailsModal.jsx` (imports formatCurrency)

**Current Code:**
```javascript
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
 * Format currency for host proposals display
 * Uses formatPrice from lib but strips currency symbol for this UI
 */
export function formatCurrency(amount) {
  if (amount == null || isNaN(amount)) return '0.00';
  // Use formatPrice with cents, then strip the $ symbol
  const formatted = formatPrice(amount, true);
  return formatted.replace('$', '');
}
```

**Testing:**
- [ ] Verify currency displays correctly on /host-proposals cards
- [ ] Verify currency displays correctly in proposal details modal
- [ ] Run `bun run build` to check for import errors

~~~~~

## SUMMARY

| Chunk | Files Modified | Pages Affected | Priority |
|-------|---------------|----------------|----------|
| 1 | PriceDisplay.jsx | GLOBAL | High |
| 2 | dayHelpers.js, dayUtils.js, displayUtils.js | GLOBAL | Medium |
| 3 | displayUtils.js, formatters.js (x2), dataTransformers.js | GLOBAL | Medium |
| 4 | dataTransformers.js | /guest-proposals | Low |
| 5 | cancelProposalWorkflow.js (booking) | /guest-proposals | Low |
| 6 | processProposalData.js (proposal) | /guest-proposals, /view-split-lease | Medium |
| 7 | SuggestedProposals/PriceDisplay.jsx | /view-split-lease | Low |
| 8 | priceCalculations.js | /view-split-lease, /preview-split-lease | Medium |
| 9 | HostProposalsPage/formatters.js | /host-proposals | Low |

### Recommended Execution Order

1. **Chunk 8** (pricing calculations) - Foundation for other price-related chunks
2. **Chunk 1** (formatPrice consolidation) - Depends on Chunk 8
3. **Chunk 2** (DAY_NAMES consolidation) - Independent, low risk
4. **Chunk 3** (formatDate consolidation) - Requires creating new dateFormatters.js
5. **Chunk 9** (formatCurrency) - Depends on Chunk 1
6. **Chunk 7** (PriceDisplay rename) - Independent, low risk
7. **Chunk 4** (transformListingData) - Moderate risk, test thoroughly
8. **Chunk 6** (processProposalData) - Moderate risk, affects proposal flow
9. **Chunk 5** (cancelProposalWorkflow) - Low priority, deprecation only

### Files Not Modified (Critical Impact)

The following files have 30+ dependents and were intentionally NOT included in any refactoring chunks:

- `src/lib/supabase.js` (93 dependents)
- `src/lib/secureStorage.js` (89 dependents)
- `src/lib/auth.js` (79 dependents)
- `src/lib/constants.js` (52 dependents)
- `src/lib/dataLookups.js` (40 dependents)
- `src/logic/constants/proposalStatuses.js` (40 dependents)

### New File Required

**Chunk 3** requires creating a new centralized date formatter:

**File:** `src/lib/dateFormatters.js` (NEW)
```javascript
/**
 * Centralized date formatting utilities
 * Consolidates 7+ duplicate formatDate implementations
 */

/**
 * Format date for display
 * @param {string|Date} date - Date value
 * @param {Object} options - Formatting options
 * @param {string} options.fallback - Value to return if date is invalid (default: null)
 * @param {string} options.format - 'short' | 'medium' | 'long' (default: 'medium')
 * @returns {string|null} Formatted date string
 */
export function formatDate(date, options = {}) {
  const { fallback = null, format = 'medium' } = options;

  if (!date) return fallback;

  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) return fallback;

  const formats = {
    short: { month: 'numeric', day: 'numeric', year: '2-digit' },
    medium: { month: 'short', day: 'numeric', year: 'numeric' },
    long: { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }
  };

  return dateObj.toLocaleDateString('en-US', formats[format] || formats.medium);
}

/**
 * Format datetime for display
 * @param {string|Date} datetime - Datetime value
 * @param {Object} options - Formatting options
 * @returns {string|null} Formatted datetime string
 */
export function formatDateTime(datetime, options = {}) {
  const { fallback = null, timeZone = 'America/New_York' } = options;

  if (!datetime) return fallback;

  const dateObj = typeof datetime === 'string' ? new Date(datetime) : datetime;
  if (isNaN(dateObj.getTime())) return fallback;

  return dateObj.toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone,
    timeZoneName: 'short'
  });
}
```
