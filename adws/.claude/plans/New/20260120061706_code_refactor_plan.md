# Code Refactoring Plan - ../app/src/logic

Date: 2026-01-20
Audit Type: general

## Summary

**Total Chunks:** 8
**Total Files Affected:** 12
**Pages Affected:** /my-proposals, /view-split-lease, /search, /create-proposal

## Dependency Impact Notes

- `constants/proposalStatuses.js` (17 dependents) - **HIGH IMPACT** - NOT modifying this file
- All chunks target leaf files or low-impact files to minimize regression risk
- No circular dependencies detected

~~~~~

## PAGE GROUP: /my-proposals, /view-split-lease (Chunks: 1, 2, 3, 4)

### CHUNK 1: Consolidate duplicate processProposalData processors
**Files:** `processors/proposal/processProposalData.js`, `processors/proposals/processProposalData.js`
**Rationale:** Two nearly identical files exist with different implementations. The `processors/proposal/` version is newer with better validation while `processors/proposals/` has more helper functions. Should consolidate into single authoritative version.
**Approach:** Keep `processors/proposals/processProposalData.js` as canonical (it has formatPrice, formatDate, getEffectiveTerms helpers), merge strict validation from `processors/proposal/`, then delete duplicate and update imports.

**Current Code (processors/proposal/processProposalData.js lines 1-40):**
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
  // No Fallback: Proposal data must exist
  if (!rawProposal) {
    throw new Error('processProposalData: rawProposal cannot be null or undefined')
  }
```

**Refactored Code:**
```javascript
// DELETE THIS FILE - consolidated into processors/proposals/processProposalData.js
// All imports should be updated to use:
// import { processProposalData } from '../logic/processors/proposals/processProposalData.js'
```

**Testing:**
- [ ] Run `bun run build` to verify no import errors
- [ ] Test /my-proposals page loads proposals correctly
- [ ] Test /view-split-lease page displays proposal details

~~~~~

### CHUNK 2: Consolidate duplicate cancelProposalWorkflow workflows
**Files:** `workflows/booking/cancelProposalWorkflow.js`, `workflows/proposals/cancelProposalWorkflow.js`
**Rationale:** Two workflow files with overlapping cancellation logic. The `booking/` version accepts dependencies as parameters (better testability), while `proposals/` version imports supabase directly.
**Approach:** Keep `workflows/booking/cancelProposalWorkflow.js` (pure, testable), add missing helper functions from `proposals/`, delete duplicate.

**Current Code (workflows/proposals/cancelProposalWorkflow.js lines 21-24):**
```javascript
import { supabase } from '../../../lib/supabase.js';
import { canCancelProposal, requiresSpecialCancellationConfirmation } from '../../rules/proposals/proposalRules.js';
import { PROPOSAL_STATUSES } from '../../constants/proposalStatuses.js';
```

**Refactored Code:**
```javascript
// DELETE THIS FILE - consolidated into workflows/booking/cancelProposalWorkflow.js
// The booking/ version accepts supabase as a parameter for better testability
// Helper functions (determineCancellationCondition, executeDeleteProposal)
// should be added to workflows/booking/cancelProposalWorkflow.js
```

**Testing:**
- [ ] Run `bun run build` to verify no import errors
- [ ] Test cancel proposal from /my-proposals
- [ ] Test cancel from Compare Terms modal on /view-split-lease

~~~~~

### CHUNK 3: Consolidate duplicate canCancelProposal rule functions
**Files:** `rules/proposals/canCancelProposal.js`, `rules/proposals/proposalRules.js`
**Rationale:** `canCancelProposal` function exists twice with different signatures: standalone version takes `{proposalStatus, deleted}`, while proposalRules version takes full `proposal` object.
**Approach:** Keep the standalone `canCancelProposal.js` (cleaner signature), update proposalRules.js to re-export it instead of defining duplicate.

**Current Code (rules/proposals/proposalRules.js lines 26-54):**
```javascript
/**
 * Check if a proposal can be cancelled by the guest
 * Based on Bubble.io workflows crkec5, crswt2, crtCg2, curuC4, curuK4, curua4
 *
 * @param {Object} proposal - Proposal object
 * @returns {boolean} True if proposal can be cancelled
 */
export function canCancelProposal(proposal) {
  if (!proposal) {
    return false;
  }

  const status = proposal.status || proposal.Status;

  // Can't cancel if already cancelled or rejected
  if (
    status === PROPOSAL_STATUSES.CANCELLED_BY_GUEST.key ||
    status === PROPOSAL_STATUSES.CANCELLED_BY_SPLITLEASE.key ||
    status === PROPOSAL_STATUSES.REJECTED_BY_HOST.key
  ) {
    return false;
  }

  // Can't cancel if lease is already activated
  if (isCompletedStatus(status)) {
    return false;
  }

  // Can't cancel if expired
  if (status === PROPOSAL_STATUSES.EXPIRED.key) {
    return false;
  }

  // Otherwise, can cancel
  return true;
}
```

**Refactored Code:**
```javascript
// Re-export from standalone module for consistency
import { canCancelProposal as canCancelProposalStandalone } from './canCancelProposal.js';

/**
 * Check if a proposal can be cancelled by the guest
 * Adapter that extracts status from full proposal object
 *
 * @param {Object} proposal - Proposal object
 * @returns {boolean} True if proposal can be cancelled
 */
export function canCancelProposal(proposal) {
  if (!proposal) {
    return false;
  }

  const status = proposal.status || proposal.Status;
  const deleted = proposal.Deleted || proposal.deleted || false;

  return canCancelProposalStandalone({ proposalStatus: status, deleted });
}
```

**Testing:**
- [ ] Run `bun run build` to verify no import errors
- [ ] Test cancel button visibility on /my-proposals
- [ ] Test cancellation flow on /view-split-lease

~~~~~

### CHUNK 4: Fix broken import in proposalButtonRules.js
**File:** `rules/proposals/proposalButtonRules.js`
**Line:** 1
**Issue:** Imports from non-existent `../../../config/proposalStatusConfig.js` instead of `../../constants/proposalStatuses.js`. This is a critical bug that would cause runtime errors.
**Affected Pages:** /my-proposals (proposal cards with buttons)

**Current Code:**
```javascript
import { getStatusConfig, PROPOSAL_STATUS } from '../../../config/proposalStatusConfig.js';
```

**Refactored Code:**
```javascript
import { getStatusConfig, PROPOSAL_STATUSES as PROPOSAL_STATUS } from '../../constants/proposalStatuses.js';
```

**Testing:**
- [ ] Run `bun run build` to verify import resolves
- [ ] Test proposal card buttons render on /my-proposals
- [ ] Test button states change correctly based on proposal status

~~~~~

## PAGE GROUP: /search, /create-proposal (Chunks: 5, 6)

### CHUNK 5: Consolidate duplicate check-in/out calculation functions
**Files:** `calculators/scheduling/calculateCheckInOutDays.js`, `calculators/scheduling/calculateCheckInOutFromDays.js`
**Rationale:** Two functions performing similar wrap-around detection for check-in/out days. `calculateCheckInOutDays` returns day names, `calculateCheckInOutFromDays` returns only indices. Both have similar gap-detection logic.
**Approach:** Keep `calculateCheckInOutDays.js` (more complete with day names), update consumers of `calculateCheckInOutFromDays` to use the consolidated version.

**Current Code (calculateCheckInOutFromDays.js lines 1-41):**
```javascript
/**
 * Calculate check-in and check-out days from selected day indices
 * Handles wrap-around scenarios (e.g., Fri-Mon selection)
 *
 * @param {number[]} selectedDays - Array of day indices (0=Sun, 6=Sat)
 * @returns {{ checkIn: number, checkOut: number } | null}
 */
export function calculateCheckInOutFromDays(selectedDays) {
  if (!selectedDays || selectedDays.length < 2) {
    return null;
  }

  const sortedDays = [...selectedDays].sort((a, b) => a - b);
  const hasSaturday = sortedDays.includes(6);
  const hasSunday = sortedDays.includes(0);
  const isWrapAround = hasSaturday && hasSunday && sortedDays.length < 7;

  if (isWrapAround) {
    // Find the gap to determine actual boundaries
    let gapIndex = -1;
    for (let i = 1; i < sortedDays.length; i++) {
      if (sortedDays[i] - sortedDays[i - 1] > 1) {
        gapIndex = i;
        break;
      }
    }

    if (gapIndex !== -1) {
      return {
        checkIn: sortedDays[gapIndex],
        checkOut: sortedDays[gapIndex - 1]
      };
    }
  }

  return {
    checkIn: sortedDays[0],
    checkOut: sortedDays[sortedDays.length - 1]
  };
}
```

**Refactored Code:**
```javascript
// DELETE THIS FILE - consolidated into calculateCheckInOutDays.js
// Consumers should use:
// import { calculateCheckInOutDays } from './calculateCheckInOutDays.js'
// And extract just .checkInDay and .checkOutDay if only indices needed
```

**Testing:**
- [ ] Run `bun run build` to verify no import errors
- [ ] Test day selection on /create-proposal shows correct check-in/out
- [ ] Test wrap-around selection (Fri-Mon) calculates correctly

~~~~~

### CHUNK 6: Use PRICING_CONSTANTS in calculateFourWeekRent
**File:** `calculators/pricing/calculateFourWeekRent.js`
**Line:** 48
**Issue:** Hardcodes `4` for billing cycle weeks instead of using `PRICING_CONSTANTS.BILLING_CYCLE_WEEKS`. This violates DRY principle and makes future changes error-prone.
**Affected Pages:** /search (listing cards), /create-proposal (pricing display)

**Current Code:**
```javascript
  // Pure calculation
  return nightlyRate * frequency * 4
```

**Refactored Code:**
```javascript
import { PRICING_CONSTANTS } from '../../constants/pricingConstants.js'

// ... (at function top, add import)

  // Pure calculation using centralized constant
  return nightlyRate * frequency * PRICING_CONSTANTS.BILLING_CYCLE_WEEKS
```

**Testing:**
- [ ] Run `bun run build` to verify no errors
- [ ] Test listing card prices on /search match expected values
- [ ] Test pricing breakdown on /create-proposal

~~~~~

## PAGE GROUP: AUTO (Chunks: 7, 8)

### CHUNK 7: Fix malformed JSDoc in isContiguousSelection
**File:** `calculators/scheduling/isContiguousSelection.js`
**Line:** 5
**Issue:** JSDoc `@param` annotation contains corrupted path reference instead of proper type. This breaks IDE tooltips and documentation generation.
**Affected Pages:** AUTO (shared utility)

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
- [ ] Run `bun run build` to verify no errors
- [ ] Verify IDE shows correct param tooltip
- [ ] Test contiguous selection validation works

~~~~~

### CHUNK 8: Add barrel exports for logic layer
**File:** `index.js` (NEW FILE - create at app/src/logic/index.js)
**Line:** N/A (new file)
**Issue:** No centralized barrel export for the logic layer. Consumers must know exact paths to import individual modules. A barrel export improves discoverability and simplifies imports.
**Affected Pages:** All pages using logic functions

**Current Code:**
```javascript
// No index.js exists - consumers must use full paths:
// import { calculateFourWeekRent } from '../logic/calculators/pricing/calculateFourWeekRent.js'
// import { canCancelProposal } from '../logic/rules/proposals/canCancelProposal.js'
```

**Refactored Code:**
```javascript
/**
 * Logic Layer Barrel Exports
 *
 * Provides centralized access to all business logic functions.
 * Organized by domain for discoverability.
 */

// ============================================================================
// CALCULATORS
// ============================================================================

// Pricing
export { calculateFourWeekRent } from './calculators/pricing/calculateFourWeekRent.js';
export { calculatePricingBreakdown } from './calculators/pricing/calculatePricingBreakdown.js';
export { calculateReservationTotal } from './calculators/pricing/calculateReservationTotal.js';
export { getNightlyRateByFrequency } from './calculators/pricing/getNightlyRateByFrequency.js';
export { calculateGuestFacingPrice } from './calculators/pricing/calculateGuestFacingPrice.js';

// Scheduling
export { calculateCheckInOutDays } from './calculators/scheduling/calculateCheckInOutDays.js';
export { calculateNightsFromDays } from './calculators/scheduling/calculateNightsFromDays.js';
export { calculateNextAvailableCheckIn } from './calculators/scheduling/calculateNextAvailableCheckIn.js';
export { isContiguousSelection } from './calculators/scheduling/isContiguousSelection.js';

// Reviews
export { calculateFormCompletion } from './calculators/reviews/calculateFormCompletion.js';
export { calculateReviewScore } from './calculators/reviews/calculateReviewScore.js';

// ============================================================================
// CONSTANTS
// ============================================================================

export { PRICING_CONSTANTS } from './constants/pricingConstants.js';
export { PROPOSAL_STAGES } from './constants/proposalStages.js';
export { PROPOSAL_STATUSES, getStatusConfig, isTerminalStatus, isCompletedStatus } from './constants/proposalStatuses.js';
export { REVIEW_CATEGORIES, REVIEW_CATEGORY_COUNT, RATING_SCALE_LABELS } from './constants/reviewCategories.js';
export { PRICE_TIERS, SORT_OPTIONS, WEEK_PATTERNS } from './constants/searchConstants.js';

// ============================================================================
// RULES
// ============================================================================

// Proposals
export { canAcceptProposal } from './rules/proposals/canAcceptProposal.js';
export { canCancelProposal } from './rules/proposals/canCancelProposal.js';
export { canEditProposal } from './rules/proposals/canEditProposal.js';

// Auth
export { isProtectedPage } from './rules/auth/isProtectedPage.js';
export { isSessionValid } from './rules/auth/isSessionValid.js';

// Users
export { isGuest } from './rules/users/isGuest.js';
export { isHost } from './rules/users/isHost.js';
export { hasProfilePhoto } from './rules/users/hasProfilePhoto.js';

// ============================================================================
// PROCESSORS
// ============================================================================

export { processProposalData, getEffectiveTerms, formatPrice, formatDate } from './processors/proposals/processProposalData.js';
export { formatHostName } from './processors/display/formatHostName.js';
export { processUserData } from './processors/user/processUserData.js';
export { processUserDisplayName } from './processors/user/processUserDisplayName.js';

// ============================================================================
// WORKFLOWS
// ============================================================================

export { cancelProposalWorkflow } from './workflows/booking/cancelProposalWorkflow.js';
export { checkAuthStatusWorkflow } from './workflows/auth/checkAuthStatusWorkflow.js';
export { validateScheduleWorkflow } from './workflows/scheduling/validateScheduleWorkflow.js';
```

**Testing:**
- [ ] Run `bun run build` to verify barrel export compiles
- [ ] Test importing via `import { calculateFourWeekRent } from '../logic'`
- [ ] Verify tree-shaking works (unused exports not bundled)

~~~~~

## Implementation Order

Based on dependency analysis and topological levels:

1. **Chunk 7** - Fix JSDoc (no dependencies, safe)
2. **Chunk 6** - Add constant usage (leaf change)
3. **Chunk 4** - Fix broken import (critical bug fix)
4. **Chunk 5** - Consolidate scheduling calculators
5. **Chunk 3** - Consolidate canCancelProposal rules
6. **Chunk 2** - Consolidate cancelProposalWorkflow
7. **Chunk 1** - Consolidate processProposalData processors
8. **Chunk 8** - Add barrel exports (depends on all consolidations)

## Files Referenced

| File | Purpose | Chunk |
|------|---------|-------|
| `calculators/pricing/calculateFourWeekRent.js` | 4-week rent calculation | 6 |
| `calculators/scheduling/calculateCheckInOutDays.js` | Check-in/out with day names | 5 |
| `calculators/scheduling/calculateCheckInOutFromDays.js` | Check-in/out indices only | 5 |
| `calculators/scheduling/isContiguousSelection.js` | Contiguous day validation | 7 |
| `constants/pricingConstants.js` | Pricing constants | 6 |
| `constants/proposalStatuses.js` | Status config (HIGH IMPACT) | 4 |
| `processors/proposal/processProposalData.js` | Legacy proposal processor | 1 |
| `processors/proposals/processProposalData.js` | Current proposal processor | 1 |
| `rules/proposals/canCancelProposal.js` | Standalone cancel rule | 3 |
| `rules/proposals/proposalRules.js` | Aggregated proposal rules | 3 |
| `rules/proposals/proposalButtonRules.js` | Button visibility rules | 4 |
| `workflows/booking/cancelProposalWorkflow.js` | Testable cancel workflow | 2 |
| `workflows/proposals/cancelProposalWorkflow.js` | Legacy cancel workflow | 2 |
