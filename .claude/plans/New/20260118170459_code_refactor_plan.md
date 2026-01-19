# Code Refactoring Plan - app/src/logic

Date: 2026-01-18
Audit Type: general

## Summary

Audited 66 files across the four-layer logic architecture:
- **calculators/** (15 files): Pure math/computations
- **constants/** (3 files): Application-wide constants
- **processors/** (16 files): Data transformation
- **rules/** (24 files): Boolean predicates/validation
- **workflows/** (8 files): Business logic orchestration

## Critical Issues Identified

1. **Duplicate processProposalData functions** - Two files with same name but different implementations
2. **Duplicate cancelProposalWorkflow files** - Two files in different directories doing similar things
3. **Duplicate proposal directories** - Both `processors/proposal/` and `processors/proposals/` exist
4. **Hardcoded magic numbers** - Discount (0.13) and markup (0.17) rates not centralized
5. **Unused rule in useProposalButtonStates.js** - React hook in rules directory violates layer architecture
6. **DAY_NAMES constant duplication** - Defined locally in multiple files instead of shared

~~~~~

## PAGE GROUP: /guest-proposals, /view-proposal (Chunks: 1, 2, 4)

### CHUNK 1: Consolidate duplicate processProposalData functions
**Files:** `processors/proposal/processProposalData.js`, `processors/proposals/processProposalData.js`
**Line:** N/A (whole files)
**Issue:** Two files with the same function name exist in almost-identical directories (`proposal/` vs `proposals/`). The `proposals/` version has additional utilities like `formatPrice`, `formatDate`, `getEffectiveTerms`, while `proposal/` version is focused purely on the processor pattern. This causes confusion and potential import errors.
**Affected Pages:** /guest-proposals, /view-proposal

**Current Code:**
```javascript
// In processors/proposal/processProposalData.js (149 lines)
import { PROPOSAL_STATUSES, getUsualOrder } from '../../constants/proposalStatuses.js'

export function processProposalData({ rawProposal, listing = null, guest = null, host = null }) {
  // No Fallback: Proposal data must exist
  if (!rawProposal) {
    throw new Error('processProposalData: rawProposal cannot be null or undefined')
  }
  // ... focused on clean merge of original/counteroffer terms
}

// In processors/proposals/processProposalData.js (330 lines)
export function processProposalData(rawProposal) {
  // Different signature - takes raw proposal directly
  // Includes nested processListingData, processHostData calls
  // Also exports: formatPrice, formatDate, formatDateTime, getEffectiveTerms, getProposalDisplayText
}
```

**Refactored Code:**
```javascript
// Delete processors/proposals/ directory entirely
// Keep processors/proposal/processProposalData.js as the single source of truth

// Move utility functions from processors/proposals/processProposalData.js to:
// - formatPrice, formatDate, formatDateTime → processors/display/formatters.js (new file)
// - getEffectiveTerms → processors/proposal/getEffectiveTerms.js (new file)
// - getProposalDisplayText → processors/proposal/getProposalDisplayText.js (new file)
// - processUserData already exists at processors/user/processUserData.js
// - processListingData already exists conceptually (should be created properly)

// Update import in loadProposalDetailsWorkflow.js:
import { processProposalData } from '../../processors/proposal/processProposalData.js'
```

**Testing:**
- [ ] Search codebase for all imports of `processors/proposals/`
- [ ] Update imports to use `processors/proposal/`
- [ ] Verify /guest-proposals page renders correctly
- [ ] Verify proposal data displays correctly in all proposal-related pages

~~~~~

### CHUNK 2: Consolidate duplicate cancelProposalWorkflow files
**Files:** `workflows/booking/cancelProposalWorkflow.js`, `workflows/proposals/cancelProposalWorkflow.js`
**Line:** N/A (whole files)
**Issue:** Two workflow files handle proposal cancellation with overlapping but different implementations. `booking/` version uses dependency injection pattern, `proposals/` version imports supabase directly. This violates DRY and creates confusion about which to use.
**Affected Pages:** /guest-proposals, /view-proposal

**Current Code:**
```javascript
// workflows/booking/cancelProposalWorkflow.js (dependency injection - pure)
export async function cancelProposalWorkflow({
  supabase,  // Injected dependency
  proposal,
  source = 'main',
  canCancelProposal  // Injected rule function
}) {
  // Clean, testable implementation
}

// workflows/proposals/cancelProposalWorkflow.js (direct import - impure)
import { supabase } from '../../../lib/supabase.js';
import { canCancelProposal } from '../../rules/proposals/proposalRules.js';

export async function executeCancelProposal(proposalId, reason = null) {
  // Direct supabase calls, not testable
}
export function determineCancellationCondition(proposal) { /* ... */ }
export async function cancelProposalFromCompareTerms(proposalId, reason) { /* ... */ }
export async function executeDeleteProposal(proposalId) { /* ... */ }
```

**Refactored Code:**
```javascript
// Keep workflows/proposals/cancelProposalWorkflow.js as the canonical location
// But refactor to use dependency injection pattern from booking/ version

// workflows/proposals/cancelProposalWorkflow.js
import { PROPOSAL_STATUSES } from '../../constants/proposalStatuses.js';

// Pure functions (no supabase import at module level)
export function determineCancellationCondition(proposal, canCancelProposal, requiresSpecialCancellationConfirmation) {
  // ... keep existing logic but take rule functions as params
}

export async function executeCancelProposal({ supabase, proposalId, reason = null }) {
  // Inject supabase, keep existing logic
}

export async function cancelProposalFromCompareTerms({ supabase, proposalId, reason = 'Counteroffer declined' }) {
  return executeCancelProposal({ supabase, proposalId, reason });
}

export async function executeDeleteProposal({ supabase, proposalId }) {
  // Inject supabase
}

// Delete workflows/booking/cancelProposalWorkflow.js after migration
```

**Testing:**
- [ ] Update GuestEditingProposalModal.jsx imports
- [ ] Update ProposalCard.jsx imports
- [ ] Update ExpandableProposalCard.jsx imports
- [ ] Verify cancel functionality works from guest proposals page
- [ ] Verify delete (soft-delete) functionality works

~~~~~

### CHUNK 4: Move React hook out of rules directory
**File:** `rules/proposals/useProposalButtonStates.js`
**Line:** 1-100+ (entire file)
**Issue:** This file contains a React hook (`useProposalButtonStates`) but is located in the `rules/` directory which should only contain pure boolean predicates. React hooks are UI concerns and belong in `islands/shared/` or `hooks/`.
**Affected Pages:** /guest-proposals, /host-proposals

**Current Code:**
```javascript
// rules/proposals/useProposalButtonStates.js
import { useMemo } from 'react';
import { canAcceptProposal, canCancelProposal /* ... */ } from './proposalRules.js';

export function useProposalButtonStates(proposal, userType) {
  return useMemo(() => {
    // Returns UI-specific button states
    return {
      showAcceptButton: canAcceptProposal(proposal),
      showCancelButton: canCancelProposal(proposal),
      // ... more UI states
    };
  }, [proposal, userType]);
}
```

**Refactored Code:**
```javascript
// Move to: islands/shared/hooks/useProposalButtonStates.js
import { useMemo } from 'react';
import { canAcceptProposal, canCancelProposal } from '../../../logic/rules/proposals/proposalRules.js';

export function useProposalButtonStates(proposal, userType) {
  return useMemo(() => {
    return {
      showAcceptButton: canAcceptProposal(proposal),
      showCancelButton: canCancelProposal(proposal),
      // ... keep existing logic
    };
  }, [proposal, userType]);
}

// Delete rules/proposals/useProposalButtonStates.js after migration
```

**Testing:**
- [ ] Create islands/shared/hooks/ directory if doesn't exist
- [ ] Move useProposalButtonStates.js
- [ ] Update all imports referencing the old location
- [ ] Verify proposal button states work correctly

~~~~~

## PAGE GROUP: /search, /favorite-listings (Chunks: 3)

### CHUNK 3: Centralize pricing constants (magic numbers)
**File:** `calculators/pricing/calculateGuestFacingPrice.js`
**Line:** 60-66
**Issue:** The 13% full-time discount and 17% site markup are hardcoded magic numbers. These business-critical rates should be centralized in constants for easy updates and consistency.
**Affected Pages:** /search, /view-split-lease, /favorite-listings

**Current Code:**
```javascript
// calculators/pricing/calculateGuestFacingPrice.js lines 60-66
  // Step 2: Apply full-time discount (only for 7 nights, 13% discount)
  const fullTimeDiscount = nightsCount === 7 ? basePrice * 0.13 : 0

  // Step 3: Price after discounts
  const priceAfterDiscounts = basePrice - fullTimeDiscount

  // Step 4: Apply site markup (17%)
  const siteMarkup = priceAfterDiscounts * 0.17
```

**Refactored Code:**
```javascript
// NEW FILE: constants/pricingConstants.js
/**
 * Centralized pricing constants for the Split Lease platform.
 * These values affect guest-facing prices across the application.
 */
export const PRICING_CONSTANTS = {
  /** Full-time stay discount (7 nights/week) as decimal */
  FULL_TIME_DISCOUNT_RATE: 0.13,

  /** Site markup applied to all bookings as decimal */
  SITE_MARKUP_RATE: 0.17,

  /** Minimum nights for full-time discount eligibility */
  FULL_TIME_NIGHTS_THRESHOLD: 7,

  /** Valid night range for pricing calculations */
  MIN_NIGHTS: 2,
  MAX_NIGHTS: 7,

  /** Standard billing cycle in weeks */
  BILLING_CYCLE_WEEKS: 4
};

// UPDATED: calculators/pricing/calculateGuestFacingPrice.js
import { PRICING_CONSTANTS } from '../../constants/pricingConstants.js';

// Step 2: Apply full-time discount (only for 7 nights)
const fullTimeDiscount = nightsCount === PRICING_CONSTANTS.FULL_TIME_NIGHTS_THRESHOLD
  ? basePrice * PRICING_CONSTANTS.FULL_TIME_DISCOUNT_RATE
  : 0;

// Step 3: Price after discounts
const priceAfterDiscounts = basePrice - fullTimeDiscount;

// Step 4: Apply site markup
const siteMarkup = priceAfterDiscounts * PRICING_CONSTANTS.SITE_MARKUP_RATE;
```

**Testing:**
- [ ] Create constants/pricingConstants.js
- [ ] Update calculateGuestFacingPrice.js to use new constants
- [ ] Update calculateFourWeekRent.js validation to use PRICING_CONSTANTS
- [ ] Verify search page pricing displays correctly
- [ ] Verify listing cards show correct prices

~~~~~

## PAGE GROUP: /view-split-lease, /search (Chunks: 5)

### CHUNK 5: Centralize DAY_NAMES constant
**Files:** `calculators/scheduling/calculateCheckInOutDays.js`, `workflows/scheduling/validateMoveInDateWorkflow.js`, `workflows/scheduling/validateScheduleWorkflow.js`
**Line:** Multiple
**Issue:** DAY_NAMES is imported from lib/constants.js in some files but defined inline in others. This creates inconsistency and potential for drift.
**Affected Pages:** /search, /view-split-lease, /favorite-listings

**Current Code:**
```javascript
// calculators/scheduling/calculateCheckInOutDays.js line 1
import { DAY_NAMES } from '../../../lib/constants.js'

// workflows/scheduling/validateMoveInDateWorkflow.js line 105
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

// workflows/scheduling/validateScheduleWorkflow.js line 99
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
```

**Refactored Code:**
```javascript
// All files should import from the single source of truth:
// lib/constants.js (already exists)

// workflows/scheduling/validateMoveInDateWorkflow.js
import { DAY_NAMES } from '../../../lib/constants.js'

// Remove local definition at line 105, use imported constant

// workflows/scheduling/validateScheduleWorkflow.js
import { DAY_NAMES } from '../../../lib/constants.js'

// Remove local definition at line 99, use imported constant
```

**Testing:**
- [ ] Update validateMoveInDateWorkflow.js to import DAY_NAMES
- [ ] Update validateScheduleWorkflow.js to import DAY_NAMES
- [ ] Verify schedule validation still works correctly
- [ ] Verify move-in date validation displays correct day names in errors

~~~~~

## PAGE GROUP: AUTO (Chunks: 6, 7)

### CHUNK 6: Remove empty processors/external directory
**File:** `processors/external/`
**Line:** N/A (empty directory)
**Issue:** The processors/external/ directory appears empty based on exploration. Empty directories add noise to the codebase. The CLAUDE.md references suggest these files should exist (adaptDaysFromBubble.js, adaptDaysToBubble.js) but they may have been moved or deleted.
**Affected Pages:** AUTO

**Current Code:**
```javascript
// Directory exists but no files found during exploration
// CLAUDE.md references:
// import { adaptDaysFromBubble } from 'logic/processors/external/adaptDaysFromBubble.js';
// import { adaptDaysToBubble } from 'logic/processors/external/adaptDaysToBubble.js';
```

**Refactored Code:**
```javascript
// Option A: Delete empty directory if truly empty
// rmdir processors/external/

// Option B: If files exist elsewhere, update CLAUDE.md documentation to reflect actual locations

// Verify by running:
// ls -la app/src/logic/processors/external/
```

**Testing:**
- [ ] Verify directory is actually empty
- [ ] Search codebase for any imports from processors/external/
- [ ] If no imports exist, delete directory
- [ ] If imports exist, locate the actual files and update imports

~~~~~

### CHUNK 7: Extract reusable status normalization
**File:** `constants/proposalStatuses.js`
**Line:** 231-233
**Issue:** The `normalizeStatusKey` function is defined locally but provides valuable functionality for handling Bubble's trailing whitespace issues. It should be exported for use in other files that deal with status strings.
**Affected Pages:** AUTO (all proposal-related pages)

**Current Code:**
```javascript
// constants/proposalStatuses.js line 231-233
/**
 * Normalize status key by trimming whitespace
 * Database values from Bubble may have trailing spaces
 * @param {string} statusKey - The raw status string
 * @returns {string} Trimmed status string
 */
function normalizeStatusKey(statusKey) {
  return typeof statusKey === 'string' ? statusKey.trim() : statusKey;
}
```

**Refactored Code:**
```javascript
// constants/proposalStatuses.js - export the function
/**
 * Normalize status key by trimming whitespace
 * Database values from Bubble may have trailing spaces
 * @param {string} statusKey - The raw status string
 * @returns {string} Trimmed status string
 */
export function normalizeStatusKey(statusKey) {
  return typeof statusKey === 'string' ? statusKey.trim() : statusKey;
}

// This allows other files dealing with Bubble data to use consistent normalization:
// import { normalizeStatusKey } from '../constants/proposalStatuses.js';
```

**Testing:**
- [ ] Change function declaration from `function` to `export function`
- [ ] Verify all existing usages within the file still work
- [ ] Consider using in processProposalData.js for status handling

~~~~~

## Dependency Impact Analysis Reference

| File | Dependents | Safe to Modify |
|------|------------|----------------|
| `constants/proposalStatuses.js` | 16 | HIGH IMPACT - Change with caution |
| All other files | 0-5 | SAFE - Leaf files |

## Recommended Execution Order

1. **Chunk 3** (pricingConstants.js) - Create new file, no breaking changes
2. **Chunk 5** (DAY_NAMES centralization) - Simple import changes
3. **Chunk 7** (export normalizeStatusKey) - Non-breaking addition
4. **Chunk 6** (empty directory cleanup) - Housekeeping
5. **Chunk 1** (processProposalData consolidation) - Requires careful import updates
6. **Chunk 2** (cancelProposalWorkflow consolidation) - Requires careful import updates
7. **Chunk 4** (move React hook) - Architectural fix, requires import updates

## Files Referenced

- `app/src/logic/calculators/pricing/calculateGuestFacingPrice.js`
- `app/src/logic/calculators/pricing/calculateFourWeekRent.js`
- `app/src/logic/calculators/scheduling/calculateCheckInOutDays.js`
- `app/src/logic/constants/proposalStatuses.js`
- `app/src/logic/processors/proposal/processProposalData.js`
- `app/src/logic/processors/proposals/processProposalData.js` (TO DELETE)
- `app/src/logic/workflows/booking/cancelProposalWorkflow.js` (TO DELETE)
- `app/src/logic/workflows/proposals/cancelProposalWorkflow.js`
- `app/src/logic/workflows/scheduling/validateMoveInDateWorkflow.js`
- `app/src/logic/workflows/scheduling/validateScheduleWorkflow.js`
- `app/src/logic/rules/proposals/useProposalButtonStates.js` (TO MOVE)
- `app/src/logic/processors/external/` (TO DELETE if empty)
- `app/src/lib/constants.js`
- `app/src/islands/modals/GuestEditingProposalModal.jsx`
- `app/src/islands/pages/proposals/ProposalCard.jsx`
- `app/src/islands/pages/proposals/ExpandableProposalCard.jsx`
