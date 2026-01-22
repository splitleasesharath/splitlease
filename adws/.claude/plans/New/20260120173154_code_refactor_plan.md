# Code Refactoring Plan - ../app

Date: 2026-01-20
Audit Type: general

## Summary

This audit identified **12 refactoring chunks** across **8 page groups**, focusing on:
- **Duplicate code removal** (3 chunks)
- **Code consolidation** (4 chunks)
- **Pattern standardization** (3 chunks)
- **File organization** (2 chunks)

### Dependency Impact Summary
- Files with 30+ dependents (CRITICAL) are avoided unless absolutely necessary
- All changes target leaf files or low-impact modules
- No circular dependencies detected in target files

---

~~~~~

## PAGE GROUP: GLOBAL (Chunks: 1, 2, 3, 4)

### CHUNK 1: Remove duplicate processProposalData.js from proposal/ directory
**File:** `src/logic/processors/proposal/processProposalData.js`
**Line:** 1-149
**Issue:** Duplicate of `src/logic/processors/proposals/processProposalData.js` with less functionality. The `proposals/` version (291 LOC) is more complete with nested data processing, date formatting utilities, and effective terms calculation.
**Affected Pages:** /guest-proposals, /host-proposals, /view-split-lease, /listing-dashboard

**Cascading Changes Required:**
- `src/logic/workflows/booking/loadProposalDetailsWorkflow.js` (imports from proposal/)

**Current Code:**
```javascript
/**
 * Process raw proposal data from Supabase into a clean, validated proposal object.
 *
 * @intent Transform raw proposal rows from Supabase into consistent, UI-ready format.
 * @rule NO FALLBACK - Throws explicit errors for missing critical fields.
 * @rule Merges original terms and counteroffer (host-changed) terms into single current terms.
 * @rule Handles dual proposal system (original vs host counteroffer).
 *
 * @param {object} params - Named parameters.
 * @param {object} params.rawProposal - Raw proposal object from Supabase.
 * @param {object} [params.listing] - Processed listing data (if already loaded).
 * @param {object} [params.guest] - Processed guest user data (if already loaded).
 * @param {object} [params.host] - Processed host user data (if already loaded).
 * @returns {object} Clean, validated proposal object with merged terms.
 *
 * @throws {Error} If rawProposal is null/undefined.
 * @throws {Error} If critical _id field is missing.
 * @throws {Error} If Listing or Guest reference is missing.
 *
 * @example
 * const proposal = processProposalData({
 *   rawProposal: {
 *     _id: 'abc123',
 *     Listing: 'listing123',
 *     Guest: 'user456',
 *     'Move-In Date': '2025-01-15',
 *     'Days of Week': [1, 2, 3],
 *     'hc Days of Week': null,
 *     'Proposal Status': 'Host Countered',
 *     ...
 *   }
 * })
 */
import { PROPOSAL_STATUSES, getUsualOrder } from '../../constants/proposalStatuses.js'

export function processProposalData({ rawProposal, listing = null, guest = null, host = null }) {
  // ... (149 lines of code)
}
```

**Refactored Code:**
```javascript
// DELETE THIS FILE ENTIRELY
//
// This file is a duplicate of src/logic/processors/proposals/processProposalData.js
// The proposals/ version is more complete and should be used instead.
//
// Update import in loadProposalDetailsWorkflow.js:
// - FROM: import { processProposalData } from '../../processors/proposal/processProposalData.js'
// - TO:   import { processProposalData } from '../../processors/proposals/processProposalData.js'
```

**Testing:**
- [ ] Update import in `loadProposalDetailsWorkflow.js` to use `proposals/` version
- [ ] Run `bun run build` to verify no import errors
- [ ] Delete `src/logic/processors/proposal/` directory
- [ ] Run tests for guest-proposals and host-proposals pages

~~~~~

### CHUNK 2: Remove duplicate cancelProposalWorkflow.js from booking/ directory
**File:** `src/logic/workflows/booking/cancelProposalWorkflow.js`
**Line:** 1-143
**Issue:** Duplicate of `src/logic/workflows/proposals/cancelProposalWorkflow.js`. The `proposals/` version (176 LOC) has more complete implementation with `executeCancelProposal`, `cancelProposalFromCompareTerms`, and `executeDeleteProposal` functions.
**Affected Pages:** /guest-proposals, /host-proposals

**Cascading Changes Required:**
- None identified (need to verify no imports exist)

**Current Code:**
```javascript
/**
 * Workflow: Cancel a proposal with complex decision tree.
 *
 * @intent Orchestrate proposal cancellation following business rules.
 * @rule Implements complete cancellation decision tree (7 variations).
 * @rule Different actions based on: source, current status, usual order, house manual access.
 * @rule Updates Supabase with appropriate status and cancellation reason.
 *
 * Decision Tree (from WORKFLOW-PASS2-ASSIMILATION.md):
 * 1. Already cancelled → Show alert, no action
 * 2. Compare modal source + Usual Order ≤5 → Status: "Cancelled by Guest"
 * ... (143 lines)
 */
import { PROPOSAL_STATUSES } from '../../constants/proposalStatuses.js'

export async function cancelProposalWorkflow({
  supabase,
  proposal,
  source = 'main',
  canCancelProposal
}) {
  // ...
}
```

**Refactored Code:**
```javascript
// DELETE THIS FILE
//
// This is a duplicate of src/logic/workflows/proposals/cancelProposalWorkflow.js
// The proposals/ version is the canonical implementation with:
// - determineCancellationCondition()
// - executeCancelProposal()
// - cancelProposalFromCompareTerms()
// - executeDeleteProposal()
//
// Any code using this file should import from proposals/ instead.
```

**Testing:**
- [ ] Search for imports of `workflows/booking/cancelProposalWorkflow`
- [ ] Update any imports to use `workflows/proposals/cancelProposalWorkflow`
- [ ] Delete `src/logic/workflows/booking/cancelProposalWorkflow.js`
- [ ] Run `bun run build` to verify no import errors

~~~~~

### CHUNK 3: Consolidate formatPrice imports to single source
**File:** `src/lib/proposals/dataTransformers.js`
**Line:** 12-15
**Issue:** Re-exports `formatPrice` from `priceCalculations.js` for "backward compatibility", creating confusion about the canonical source. Multiple files import from different locations.
**Affected Pages:** /guest-proposals, /host-proposals, /search, /view-split-lease

**Cascading Changes Required:**
- `src/islands/shared/SuggestedProposals/components/PriceDisplay.jsx`
- `src/islands/pages/proposals/ProposalCard.jsx`
- `src/islands/pages/proposals/ExpandableProposalCard.jsx`
- `src/islands/modals/FullscreenProposalMapModal.jsx`
- `src/logic/processors/proposals/processProposalData.js`

**Current Code:**
```javascript
import { formatPrice } from '../priceCalculations.js';

// Re-export for backwards compatibility
export { formatPrice };
```

**Refactored Code:**
```javascript
// REMOVE these lines - formatPrice should always be imported from lib/priceCalculations.js
//
// The re-export pattern creates import path confusion. All files should import directly:
// import { formatPrice } from '@/lib/priceCalculations.js';
//
// Delete lines 12-15 from this file.
```

**Testing:**
- [ ] Update all files importing `formatPrice` from `dataTransformers.js` to import from `priceCalculations.js`
- [ ] Remove re-export from `dataTransformers.js`
- [ ] Remove re-export from `processProposalData.js` (proposals/)
- [ ] Run `bun run build` to verify no import errors

~~~~~

### CHUNK 4: Standardize status field access pattern
**File:** `src/logic/rules/proposals/proposalRules.js`
**Line:** 31, 68, 85, 124, etc.
**Issue:** Inconsistent status field access using fallback pattern `proposal.status || proposal.Status` repeated throughout the file (11 occurrences). Should be normalized once at entry point.
**Affected Pages:** /guest-proposals, /host-proposals, /view-split-lease, /listing-dashboard

**Current Code:**
```javascript
export function canCancelProposal(proposal) {
  if (!proposal) {
    return false;
  }

  const status = proposal.status || proposal.Status;

  // Can't cancel if already cancelled or rejected
  if (
    status === PROPOSAL_STATUSES.CANCELLED_BY_GUEST.key ||
    // ...
```

**Refactored Code:**
```javascript
/**
 * Normalize proposal status field access.
 * Handles both camelCase (status) and PascalCase (Status) field names.
 * @param {Object} proposal - Proposal object
 * @returns {string|null} Normalized status string or null
 */
function getProposalStatus(proposal) {
  if (!proposal) return null;
  return (proposal.status || proposal.Status || '').trim();
}

export function canCancelProposal(proposal) {
  const status = getProposalStatus(proposal);
  if (!status) return false;

  // Can't cancel if already cancelled or rejected
  if (
    status === PROPOSAL_STATUSES.CANCELLED_BY_GUEST.key ||
    // ...
```

**Testing:**
- [ ] Add `getProposalStatus` helper function at top of file
- [ ] Replace all 11 occurrences of `proposal.status || proposal.Status` with `getProposalStatus(proposal)`
- [ ] Run `bun run build` to verify no errors
- [ ] Test proposal cancellation flow

~~~~~

## PAGE GROUP: /view-split-lease (Chunks: 5, 6)

### CHUNK 5: Remove fallback pattern from priceCalculations.js
**File:** `src/lib/priceCalculations.js`
**Line:** 95-121
**Issue:** `calculatePricingBreakdown` returns `{ valid: false, nightlyPrice: null }` on invalid input (fallback pattern) instead of throwing. This contradicts the "No Fallback" philosophy in CLAUDE.md and differs from the strict version in `logic/calculators/pricing/calculatePricingBreakdown.js`.
**Affected Pages:** /view-split-lease, /preview-split-lease

**Current Code:**
```javascript
export function calculatePricingBreakdown(listing, nightsPerWeek, reservationWeeks) {
  const nightlyPrice = getNightlyPriceForNights(listing, nightsPerWeek);

  if (!nightlyPrice) {
    return {
      nightlyPrice: null,
      fourWeekRent: null,
      reservationTotal: null,
      cleaningFee: listing['💰Cleaning Cost / Maintenance Fee'] || 0,
      damageDeposit: listing['💰Damage Deposit'] || 0,
      valid: false
    };
  }

  const fourWeekRent = calculate4WeekRent(nightlyPrice, nightsPerWeek);
  const reservationTotal = calculateReservationTotal(fourWeekRent, reservationWeeks);

  return {
    nightlyPrice,
    fourWeekRent,
    reservationTotal,
    cleaningFee: listing['💰Cleaning Cost / Maintenance Fee'] || 0,
    damageDeposit: listing['💰Damage Deposit'] || 0,
    grandTotal: reservationTotal + (listing['💰Cleaning Cost / Maintenance Fee'] || 0),
    valid: true
  };
}
```

**Refactored Code:**
```javascript
/**
 * Calculate complete pricing breakdown for a listing rental.
 * @param {object} listing - Listing object with all pricing fields.
 * @param {number} nightsPerWeek - Nights selected per week (2-7).
 * @param {number} reservationWeeks - Total reservation span in weeks.
 * @returns {object} Complete pricing breakdown with all calculated values.
 * @throws {Error} If listing is missing or invalid.
 * @throws {Error} If nightsPerWeek or reservationWeeks is invalid.
 * @throws {Error} If no nightly price can be determined.
 */
export function calculatePricingBreakdown(listing, nightsPerWeek, reservationWeeks) {
  if (!listing || typeof listing !== 'object') {
    throw new Error('calculatePricingBreakdown: listing must be a valid object');
  }

  if (!nightsPerWeek || nightsPerWeek < 1 || nightsPerWeek > 7) {
    throw new Error(`calculatePricingBreakdown: nightsPerWeek must be 1-7, got ${nightsPerWeek}`);
  }

  if (!reservationWeeks || reservationWeeks < 1) {
    throw new Error(`calculatePricingBreakdown: reservationWeeks must be positive, got ${reservationWeeks}`);
  }

  const nightlyPrice = getNightlyPriceForNights(listing, nightsPerWeek);

  if (!nightlyPrice) {
    throw new Error(`calculatePricingBreakdown: No nightly price found for ${nightsPerWeek} nights`);
  }

  const fourWeekRent = calculate4WeekRent(nightlyPrice, nightsPerWeek);
  const reservationTotal = calculateReservationTotal(fourWeekRent, reservationWeeks);
  const cleaningFee = Number(listing['💰Cleaning Cost / Maintenance Fee']) || 0;
  const damageDeposit = Number(listing['💰Damage Deposit']) || 0;

  return {
    nightlyPrice,
    fourWeekRent,
    reservationTotal,
    cleaningFee,
    damageDeposit,
    grandTotal: reservationTotal + cleaningFee
  };
}
```

**Testing:**
- [ ] Update callers to wrap in try/catch if they need graceful handling
- [ ] Run `bun run build` to verify no errors
- [ ] Test view-split-lease page pricing display

~~~~~

### CHUNK 6: Remove fallback from getNightlyPriceForNights
**File:** `src/lib/priceCalculations.js`
**Line:** 40-65
**Issue:** Returns `null` on invalid input instead of throwing. Should throw for invalid listing or nightsSelected to surface errors early.
**Affected Pages:** /view-split-lease, /preview-split-lease, /search

**Current Code:**
```javascript
export function getNightlyPriceForNights(listing, nightsSelected) {
  if (!listing || !nightsSelected) return null;

  // Price override takes precedence
  if (listing['💰Price Override']) {
    return listing['💰Price Override'];
  }

  // Map nights to price fields
  const priceFieldMap = {
    1: '💰Nightly Host Rate for 1 night',
    2: '💰Nightly Host Rate for 2 nights',
    3: '💰Nightly Host Rate for 3 nights',
    4: '💰Nightly Host Rate for 4 nights',
    5: '💰Nightly Host Rate for 5 nights',
    7: '💰Nightly Host Rate for 7 nights'
  };

  const fieldName = priceFieldMap[nightsSelected];
  if (fieldName && listing[fieldName]) {
    return listing[fieldName];
  }

  // Default to 4-night rate if available
  return listing['💰Nightly Host Rate for 4 nights'] || null;
}
```

**Refactored Code:**
```javascript
/**
 * Get nightly price based on number of nights selected.
 * Matches Bubble logic for price field selection.
 * @param {object} listing - Listing object with price fields
 * @param {number} nightsSelected - Number of nights per week (1-7)
 * @returns {number} Nightly price
 * @throws {Error} If listing is invalid
 * @throws {Error} If nightsSelected is invalid
 * @throws {Error} If no price is available for the selected nights
 */
export function getNightlyPriceForNights(listing, nightsSelected) {
  if (!listing || typeof listing !== 'object') {
    throw new Error('getNightlyPriceForNights: listing must be a valid object');
  }

  if (!nightsSelected || nightsSelected < 1 || nightsSelected > 7) {
    throw new Error(`getNightlyPriceForNights: nightsSelected must be 1-7, got ${nightsSelected}`);
  }

  // Price override takes precedence
  if (listing['💰Price Override']) {
    return listing['💰Price Override'];
  }

  // Map nights to price fields
  const priceFieldMap = {
    1: '💰Nightly Host Rate for 1 night',
    2: '💰Nightly Host Rate for 2 nights',
    3: '💰Nightly Host Rate for 3 nights',
    4: '💰Nightly Host Rate for 4 nights',
    5: '💰Nightly Host Rate for 5 nights',
    7: '💰Nightly Host Rate for 7 nights'
  };

  const fieldName = priceFieldMap[nightsSelected];
  if (fieldName && listing[fieldName]) {
    return listing[fieldName];
  }

  // Try 4-night rate as fallback (common default)
  const defaultRate = listing['💰Nightly Host Rate for 4 nights'];
  if (defaultRate) {
    return defaultRate;
  }

  throw new Error(`getNightlyPriceForNights: No price available for ${nightsSelected} nights`);
}
```

**Testing:**
- [ ] Update callers to handle thrown errors appropriately
- [ ] Run `bun run build` to verify no errors
- [ ] Test search page price display

~~~~~

## PAGE GROUP: /guest-proposals (Chunks: 7, 8)

### CHUNK 7: Remove console.log statements from proposalDataFetcher.js
**File:** `src/lib/proposalDataFetcher.js`
**Line:** 110, 125, 163-166
**Issue:** Production code contains multiple `console.log` statements for debugging. These should be removed or replaced with the `logger` utility.
**Affected Pages:** /guest-proposals

**Current Code:**
```javascript
console.log(`📋 Found ${proposalIds.length} proposal IDs in user's Proposals List`);

// ...

console.log(`✅ Successfully fetched ${proposalsData?.length || 0} proposals from ${proposalIds.length} IDs`);

// ...

console.log('Found last proposal defaults:', {
  moveInDate: data['Move in range start'],
  reservationSpanWeeks: data['Reservation Span (Weeks)']
});
```

**Refactored Code:**
```javascript
import { logger } from './logger.js';

// Replace line 110:
logger.debug('Fetched proposal IDs from user Proposals List', { count: proposalIds.length });

// Replace line 125:
logger.debug('Successfully fetched proposals', {
  fetched: proposalsData?.length || 0,
  requested: proposalIds.length
});

// Replace lines 163-166:
logger.debug('Found last proposal defaults', {
  moveInDate: data['Move in range start'],
  reservationSpanWeeks: data['Reservation Span (Weeks)']
});
```

**Testing:**
- [ ] Import `logger` from `./logger.js` at top of file
- [ ] Replace all `console.log` with `logger.debug`
- [ ] Run `bun run build` to verify no errors

~~~~~

### CHUNK 8: Remove console.warn from proposalRules.js
**File:** `src/logic/rules/proposals/proposalRules.js`
**Line:** 306
**Issue:** Uses `console.warn` for cache miss fallback. Should use `logger` utility.
**Affected Pages:** /guest-proposals

**Current Code:**
```javascript
export function getCancellationReasonOptions() {
  const cachedReasons = getGuestCancellationReasons();

  if (cachedReasons.length > 0) {
    return cachedReasons.map(r => r.reason);
  }

  // Fallback for initial render before cache is populated
  console.warn('[getCancellationReasonOptions] Cache empty, using fallback values');
  return [
    'Found another property',
    // ...
  ];
}
```

**Refactored Code:**
```javascript
import { logger } from '../../../lib/logger.js';

export function getCancellationReasonOptions() {
  const cachedReasons = getGuestCancellationReasons();

  if (cachedReasons.length > 0) {
    return cachedReasons.map(r => r.reason);
  }

  // Fallback for initial render before cache is populated
  logger.warn('getCancellationReasonOptions: Cache empty, using fallback values');
  return [
    'Found another property',
    // ...
  ];
}
```

**Testing:**
- [ ] Import `logger` from `../../../lib/logger.js`
- [ ] Replace `console.warn` with `logger.warn`
- [ ] Run `bun run build` to verify no errors

~~~~~

## PAGE GROUP: /search (Chunks: 9)

### CHUNK 9: Remove redundant priceCalculations.js imports
**File:** `src/lib/scheduleSelector/priceCalculations.js`
**Line:** 1-*
**Issue:** Appears to be a duplicate/subset of `src/lib/priceCalculations.js`. Need to verify and consolidate.
**Affected Pages:** /search, /view-split-lease

**Current Code:**
```javascript
// Need to read file to determine exact content
```

**Refactored Code:**
```javascript
// If this is a subset, re-export from main priceCalculations.js:
export {
  calculatePricingBreakdown,
  formatPrice,
  // ... only what's needed
} from '../priceCalculations.js';

// Or delete if completely redundant
```

**Testing:**
- [ ] Compare with `src/lib/priceCalculations.js`
- [ ] Identify unique functions (if any)
- [ ] Consolidate or delete
- [ ] Run `bun run build` to verify no import errors

~~~~~

## PAGE GROUP: /listing-dashboard (Chunks: 10)

### CHUNK 10: Consolidate dataTransformers.js redundant functions
**File:** `src/lib/proposals/dataTransformers.js`
**Line:** 23-195
**Issue:** Contains `transformUserData`, `transformListingData`, `transformHostData`, `transformGuestData`, `transformVirtualMeetingData`, and `transformProposalData` - many of which duplicate functions in `src/logic/processors/proposals/processProposalData.js` (`processListingData`, `processHostData`, `processVirtualMeetingData`).
**Affected Pages:** /guest-proposals, /listing-dashboard

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
    description: rawListing.Description,
    // ... 15 more fields
  };
}
```

**Refactored Code:**
```javascript
// Re-export from canonical source instead of duplicating
export {
  processListingData as transformListingData,
  processHostData as transformHostData,
  processVirtualMeetingData as transformVirtualMeetingData,
  processProposalData as transformProposalData
} from '../../logic/processors/proposals/processProposalData.js';

// Keep only truly unique transformers
export function transformUserData(rawUser) {
  if (!rawUser) return null;
  // ... (unique logic)
}

export function transformGuestData(rawGuest) {
  if (!rawGuest) return null;
  // ... (unique logic if different from transformHostData)
}
```

**Testing:**
- [ ] Compare function signatures between dataTransformers.js and processProposalData.js
- [ ] Identify truly unique functions
- [ ] Consolidate duplicates via re-exports
- [ ] Update imports in consuming files
- [ ] Run `bun run build` to verify no errors

~~~~~

## PAGE GROUP: /account-profile (Chunks: 11)

### CHUNK 11: Remove debug export from secureStorage.js
**File:** `src/lib/secureStorage.js`
**Line:** 406-417
**Issue:** Contains `__DEV__` export with `dumpSecureStorage()` function that exposes auth tokens. Should be removed for production or properly guarded.
**Affected Pages:** All authenticated pages

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
// REMOVED: __DEV__ export
// Security risk: This exposed auth tokens via console
//
// If debugging is needed, use browser DevTools:
// - Application > Local Storage > inspect keys directly
// - Or add temporary console.log in development only
```

**Testing:**
- [ ] Remove `__DEV__` export
- [ ] Search for any usages of `__DEV__.dumpSecureStorage()`
- [ ] Run `bun run build` to verify no import errors

~~~~~

## PAGE GROUP: AUTH (Chunks: 12)

### CHUNK 12: Remove legacy auth storage keys handling
**File:** `src/lib/secureStorage.js`
**Line:** 225-231
**Issue:** `clearAllAuthData()` still clears legacy keys (`splitlease_auth_token`, `splitlease_session_id`, etc.) that were migrated away. This legacy cleanup code can be removed after confirming no users have old keys.
**Affected Pages:** All authenticated pages (logout flow)

**Current Code:**
```javascript
// Clear legacy keys
localStorage.removeItem('splitlease_auth_token');
localStorage.removeItem('splitlease_session_id');
localStorage.removeItem('splitlease_last_auth');
localStorage.removeItem('splitlease_user_type');
localStorage.removeItem('userEmail');
localStorage.removeItem('splitlease_supabase_user_id');
```

**Refactored Code:**
```javascript
// LEGACY KEY CLEANUP - Can be removed after 2026-06-01
// These keys were migrated to new format. Keeping for transition period.
// TODO: Remove this block after migration period ends
const LEGACY_KEYS = [
  'splitlease_auth_token',
  'splitlease_session_id',
  'splitlease_last_auth',
  'splitlease_user_type',
  'userEmail',
  'splitlease_supabase_user_id'
];
LEGACY_KEYS.forEach(key => localStorage.removeItem(key));
```

**Testing:**
- [ ] Verify no users have old keys (check analytics/logs)
- [ ] Keep with TODO comment for now
- [ ] Schedule removal for Q2 2026

---

## File References

### Files Modified in This Plan
| File | Chunk(s) | Action |
|------|----------|--------|
| `src/logic/processors/proposal/processProposalData.js` | 1 | DELETE |
| `src/logic/workflows/booking/cancelProposalWorkflow.js` | 2 | DELETE |
| `src/logic/workflows/booking/loadProposalDetailsWorkflow.js` | 1 | UPDATE IMPORT |
| `src/lib/proposals/dataTransformers.js` | 3, 10 | MODIFY |
| `src/logic/processors/proposals/processProposalData.js` | 3 | MODIFY |
| `src/logic/rules/proposals/proposalRules.js` | 4, 8 | MODIFY |
| `src/lib/priceCalculations.js` | 5, 6 | MODIFY |
| `src/lib/proposalDataFetcher.js` | 7 | MODIFY |
| `src/lib/scheduleSelector/priceCalculations.js` | 9 | VERIFY/CONSOLIDATE |
| `src/lib/secureStorage.js` | 11, 12 | MODIFY |

### Critical Files NOT Modified (30+ dependents)
- `src/lib/supabase.js` (93 dependents)
- `src/lib/secureStorage.js` (89 dependents) - only minor changes
- `src/lib/auth.js` (79 dependents)
- `src/lib/constants.js` (52 dependents)
- `src/lib/dataLookups.js` (40 dependents)
- `src/logic/constants/proposalStatuses.js` (40 dependents)

---

## Implementation Order

1. **Phase 1 - Deletions** (Chunks 1, 2): Remove duplicate files
2. **Phase 2 - Consolidation** (Chunks 3, 10): Consolidate imports and re-exports
3. **Phase 3 - Standardization** (Chunks 4, 5, 6): Apply consistent patterns
4. **Phase 4 - Cleanup** (Chunks 7, 8, 9, 11, 12): Remove debug code and console statements

---

## Rollback Strategy

All changes are reversible via git:
```bash
git checkout HEAD -- src/logic/processors/proposal/
git checkout HEAD -- src/logic/workflows/booking/cancelProposalWorkflow.js
# etc.
```

No database migrations or breaking API changes in this refactor.
