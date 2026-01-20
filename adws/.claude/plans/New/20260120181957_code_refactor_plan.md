# Code Refactoring Plan - ../app

Date: 2026-01-20
Audit Type: general

## Summary

This audit identified **6 chunks** of refactoring work focused on:
- Eliminating duplicate files (proposal processors, status constants, stages constants)
- Removing deprecated re-export files
- Consolidating price formatting utilities

**Files Analyzed:** 537
**Edge Reduction:** 19%
**Circular Dependencies:** None detected

---

~~~~~

## PAGE GROUP: GLOBAL (Chunks: 1, 2, 3, 4, 5, 6)

All chunks in this group affect shared code used across multiple pages. Changes must be applied atomically.

~~~~~

### CHUNK 1: Remove duplicate processProposalData.js in proposals/ directory
**File:** `src/logic/processors/proposals/processProposalData.js`
**Line:** 1-291
**Issue:** Duplicate file - there are TWO processProposalData.js files:
  - `src/logic/processors/proposal/processProposalData.js` (canonical - 149 lines, follows modern pattern)
  - `src/logic/processors/proposals/processProposalData.js` (duplicate - 291 lines, older pattern)
**Affected Pages:** /guest-proposals, /host-proposals, /view-split-lease, /messages

**Cascading Changes Required:**
- `src/logic/workflows/booking/loadProposalDetailsWorkflow.js` (line 27 imports from proposals/)

**Current Code:**
```javascript
/**
 * Proposal Data Processor
 *
 * PILLAR III: Data Processors (The "Truth" Layer)
 *
 * This processor transforms raw Supabase/Bubble.io data into clean,
 * validated internal shapes. It enforces the "No Fallback" principle
 * by throwing explicit errors for missing critical data.
 *
 * Intent: Create safe, typed objects for UI consumption, enforcing data integrity.
 */

import { formatPrice } from '../../../lib/priceCalculations.js';

// Re-export for backwards compatibility
export { formatPrice };

/**
 * Transform raw listing data from Bubble.io format
 * @param {Object} rawListing - Raw listing object from Supabase
 * @returns {Object} Transformed listing object
 * @throws {Error} If rawListing is null/undefined
 */
export function processListingData(rawListing) {
  // ... full 291 line file
}
```

**Refactored Code:**
```javascript
/**
 * @deprecated This file is scheduled for removal.
 * Use '../proposal/processProposalData.js' as the canonical location.
 *
 * Migration: Update all imports to use the proposal/ directory version.
 */

// Re-export from canonical location for backwards compatibility
export {
  processProposalData,
} from '../proposal/processProposalData.js';

// Re-export formatPrice from lib for any legacy imports
export { formatPrice } from '../../../lib/priceCalculations.js';

// Re-export additional functions that may be used
export {
  processListingData,
  processHostData,
  processVirtualMeetingData,
  getProposalDisplayText,
  formatDate,
  formatDateTime,
  getEffectiveTerms
} from '../proposal/processProposalData.js';
```

**Testing:**
- [ ] Verify all imports of processProposalData resolve correctly
- [ ] Run `bun run build` to check for import errors
- [ ] Test /guest-proposals page loads correctly
- [ ] Test /host-proposals page loads correctly

~~~~~

### CHUNK 2: Consolidate proposalStatuses.js to single canonical location
**File:** `src/logic/constants/proposalStatuses.js`
**Line:** 1-384
**Issue:** Duplicate proposal status constants in THREE locations:
  - `src/logic/constants/proposalStatuses.js` (canonical - has usualOrder field, most complete)
  - `src/lib/constants/proposalStatuses.js` (duplicate - missing usualOrder)
  - Partial definitions in `src/config/proposalStatusConfig.js`
**Affected Pages:** /guest-proposals, /host-proposals, /view-split-lease, /create-suggested-proposal

**Cascading Changes Required:**
- `src/logic/processors/proposal/processProposalData.js` (imports from logic/constants/)
- `src/logic/rules/proposals/proposalRules.js` (imports from logic/constants/)
- `src/lib/constants/proposalStatuses.js` (should become re-export)
- `src/logic/workflows/proposals/cancelProposalWorkflow.js`
- `src/logic/workflows/proposals/counterofferWorkflow.js`
- `src/logic/workflows/booking/acceptProposalWorkflow.js`
- `src/logic/rules/proposals/canAcceptProposal.js`
- `src/islands/shared/HostEditingProposal/HostEditingProposal.jsx`
- `src/islands/shared/HostEditingProposal/types.js`
- `src/islands/shared/RentalApplicationWizardModal/useRentalApplicationWizardLogic.js`
- `src/islands/shared/LoggedInAvatar/useLoggedInAvatarData.js`
- `src/islands/shared/Header/useGuestMenuData.js`
- `src/lib/proposals/statusButtonConfig.js`
- `src/islands/pages/HostProposalsPage/types.js`
- `src/islands/pages/CreateSuggestedProposalPage/useCreateSuggestedProposalLogic.js`
- `src/islands/pages/CreateSuggestedProposalPage/components/ProposalConfig.jsx`

**Current Code (src/lib/constants/proposalStatuses.js):**
```javascript
/**
 * Proposal Status Configuration System
 *
 * This module provides a centralized configuration for all proposal statuses,
 * replacing hardcoded status mappings throughout the application.
 *
 * Each status includes:
 * - key: The exact status string from the database
 * - color: UI color theme for the status
 * - label: User-friendly display text
 * - stage: The progress stage number (1-6) or null if not in active flow
 * - actions: Available actions for this status
 */

export const PROPOSAL_STATUSES = {
  // ... 163 lines of status definitions
};

function normalizeStatusKey(statusKey) {
  return typeof statusKey === 'string' ? statusKey.trim() : statusKey;
}

export function getStatusConfig(statusKey) {
  // ... implementation
}

// ... additional helper functions
```

**Refactored Code (src/lib/constants/proposalStatuses.js):**
```javascript
/**
 * @deprecated This file re-exports from the canonical location.
 * Import directly from 'src/logic/constants/proposalStatuses.js' instead.
 */

export {
  PROPOSAL_STATUSES,
  getStatusConfig,
  getStageFromStatus,
  getUsualOrder,
  shouldShowStatusBanner,
  getActionsForStatus,
  isActiveStatus,
  isTerminalStatus,
  isCompletedStatus,
  isSuggestedProposal,
  getStatusesByColor,
  getStatusesByStage,
  isPendingConfirmationProposal
} from '../../logic/constants/proposalStatuses.js';
```

**Testing:**
- [ ] Verify all 17 importing files resolve correctly
- [ ] Run `bun run build` to check for import errors
- [ ] Test proposal status display on /guest-proposals
- [ ] Test status banner visibility logic

~~~~~

### CHUNK 3: Consolidate proposalStages.js to single canonical location
**File:** `src/lib/constants/proposalStages.js`
**Line:** 1-161
**Issue:** Duplicate proposal stages constants in TWO locations:
  - `src/logic/constants/proposalStages.js` (canonical - has getStageProgress, more utilities)
  - `src/lib/constants/proposalStages.js` (duplicate - fewer utilities)
**Affected Pages:** /guest-proposals, /host-proposals

**Cascading Changes Required:**
- `src/islands/pages/proposals/useGuestProposalsPageLogic.js` (uses proposalStages)

**Current Code (src/lib/constants/proposalStages.js):**
```javascript
/**
 * Proposal Progress Stage Configuration System
 *
 * This module defines the 6 stages of the proposal-to-lease workflow,
 * replacing hardcoded stage arrays with rich configuration objects.
 */

export const PROPOSAL_STAGES = [
  // ... 6 stage objects
];

export function getStageById(stageId) {
  // ...
}

export function getStageByName(stageName) {
  // ...
}

// ... limited utilities (no getStageProgress, fewer helpers)
```

**Refactored Code (src/lib/constants/proposalStages.js):**
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
- [ ] Verify imports resolve correctly
- [ ] Run `bun run build`
- [ ] Test stage progress display on /guest-proposals

~~~~~

### CHUNK 4: Remove deprecated cancelProposalWorkflow.js re-export file
**File:** `src/logic/workflows/booking/cancelProposalWorkflow.js`
**Line:** 1-9
**Issue:** This file is marked @deprecated and only re-exports from proposals/cancelProposalWorkflow.js. Should be removed after updating all imports.
**Affected Pages:** /guest-proposals (via import chain)

**Cascading Changes Required:**
- Search for any imports from `workflows/booking/cancelProposalWorkflow`

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
// FILE SHOULD BE DELETED
// All imports should be updated to use:
// import { executeCancelProposal } from '../proposals/cancelProposalWorkflow.js'
```

**Testing:**
- [ ] Search codebase for imports from booking/cancelProposalWorkflow
- [ ] Update any found imports to use proposals/cancelProposalWorkflow
- [ ] Delete the file
- [ ] Run `bun run build`

~~~~~

### CHUNK 5: Consolidate formatPrice function to single canonical location
**File:** `src/logic/processors/proposals/processProposalData.js`
**Line:** 13-16
**Issue:** formatPrice is re-exported from this file but should be imported directly from lib/priceCalculations.js. Multiple files import formatPrice from different locations.
**Affected Pages:** /view-split-lease, /guest-proposals, /search, /favorite-listings

**Cascading Changes Required:**
Files importing formatPrice from processProposalData.js should import from lib/priceCalculations.js:
- Check all 14 files that use formatPrice

**Current Code (in processProposalData.js):**
```javascript
import { formatPrice } from '../../../lib/priceCalculations.js';

// Re-export for backwards compatibility
export { formatPrice };
```

**Refactored Code:**
```javascript
// Remove the re-export entirely - formatPrice should be imported directly
// from src/lib/priceCalculations.js by consumers

import { formatPrice } from '../../../lib/priceCalculations.js';

// REMOVED: export { formatPrice };
// Consumers should import directly:
// import { formatPrice } from '../lib/priceCalculations.js';
```

**Testing:**
- [ ] Identify all files importing formatPrice from processProposalData
- [ ] Update imports to use lib/priceCalculations.js directly
- [ ] Run `bun run build`
- [ ] Test price display on /view-split-lease

~~~~~

### CHUNK 6: Add barrel exports for logic/constants/ directory
**File:** `src/logic/constants/index.js` (NEW FILE)
**Line:** N/A (new file)
**Issue:** No barrel export file exists for logic/constants/, requiring consumers to know exact file paths. This makes refactoring harder and increases coupling.
**Affected Pages:** GLOBAL

**Current Code:**
```javascript
// File does not exist
```

**Refactored Code:**
```javascript
/**
 * Logic Constants Barrel Export
 *
 * Centralizes exports for all logic constants, making imports cleaner
 * and refactoring easier.
 *
 * Usage:
 *   import { PROPOSAL_STATUSES, PROPOSAL_STAGES, PRICING_CONSTANTS } from '../logic/constants';
 */

// Proposal Statuses
export {
  PROPOSAL_STATUSES,
  getStatusConfig,
  getStageFromStatus,
  getUsualOrder,
  shouldShowStatusBanner,
  getActionsForStatus,
  isActiveStatus,
  isTerminalStatus,
  isCompletedStatus,
  isSuggestedProposal,
  getStatusesByColor,
  getStatusesByStage,
  isPendingConfirmationProposal
} from './proposalStatuses.js';

// Proposal Stages
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
} from './proposalStages.js';

// Pricing Constants
export {
  DEFAULT_ZAT_CONFIG,
  PRICE_TIERS,
  RENTAL_TYPES
} from './pricingConstants.js';

// Search Constants
export {
  SORT_OPTIONS,
  DEFAULT_FILTERS
} from './searchConstants.js';

// Review Categories
export {
  REVIEW_CATEGORIES,
  REVIEW_RATING_SCALE
} from './reviewCategories.js';
```

**Testing:**
- [ ] Create the new index.js file
- [ ] Verify all re-exported modules exist
- [ ] Run `bun run build`

~~~~~

## Implementation Order

Based on dependency analysis and topological levels:

1. **CHUNK 6** - Create barrel export (no dependencies, enables cleaner future imports)
2. **CHUNK 2** - Consolidate proposalStatuses.js (high impact, 17 dependents)
3. **CHUNK 3** - Consolidate proposalStages.js (medium impact)
4. **CHUNK 1** - Remove duplicate processProposalData.js (depends on constants being consolidated)
5. **CHUNK 5** - Consolidate formatPrice imports (depends on processProposalData changes)
6. **CHUNK 4** - Remove deprecated cancelProposalWorkflow.js (final cleanup)

## Files Referenced

### Critical Impact (DO NOT MODIFY)
- `src/lib/supabase.js` (93 dependents)
- `src/lib/secureStorage.js` (89 dependents)
- `src/lib/auth.js` (79 dependents)
- `src/lib/constants.js` (52 dependents)
- `src/lib/dataLookups.js` (40 dependents)

### Files Modified in This Plan
- `src/logic/processors/proposals/processProposalData.js` (CHUNK 1, 5)
- `src/lib/constants/proposalStatuses.js` (CHUNK 2)
- `src/lib/constants/proposalStages.js` (CHUNK 3)
- `src/logic/workflows/booking/cancelProposalWorkflow.js` (CHUNK 4)
- `src/logic/constants/index.js` (CHUNK 6 - NEW)

### Files Requiring Import Updates
- `src/logic/workflows/booking/loadProposalDetailsWorkflow.js`
- `src/islands/pages/proposals/useGuestProposalsPageLogic.js`
- Multiple files importing formatPrice from processProposalData.js
