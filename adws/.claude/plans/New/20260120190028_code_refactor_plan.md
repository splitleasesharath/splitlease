# Code Refactoring Plan - ../app

Date: 2026-01-20
Audit Type: general

~~~~~

## Executive Summary

This audit identified **6 major issue categories** across the `app/` codebase affecting **526 JavaScript/TypeScript files**:

1. **Duplicate `DAY_NAMES` Constants** - 11 separate declarations
2. **Duplicate `formatDate` Functions** - 9 separate implementations
3. **Duplicate `formatCurrency` Functions** - 3 separate implementations
4. **Duplicate `processProposalData` Modules** - 2 separate files
5. **Deprecated Re-export Files** - 3 wrapper files in `lib/constants/`
6. **Duplicate `formatPrice` Functions** - 3 separate implementations

### Impact Assessment
- **CRITICAL files avoided**: `supabase.js` (93 deps), `secureStorage.js` (89 deps), `auth.js` (79 deps), `constants.js` (52 deps)
- **Focus on LEAF files**: All changes target files with 0-11 dependents (safe to modify)

~~~~~

## PAGE GROUP: GLOBAL (Chunks: 1, 2, 3, 4, 5, 6)

These chunks affect multiple pages across the application due to their location in shared utility modules.

### Affected Pages:
- `/guest-proposals` (ProposalCard, ExpandableProposalCard, displayUtils)
- `/host-proposals` (formatters.js, types.js)
- `/favorite-listings` (formatters.js)
- `/view-split-lease` (ViewSplitLeasePage)
- `/preview-split-lease` (PreviewSplitLeasePage)
- `/account-profile` (useAccountProfilePageLogic, ScheduleCommuteCard, PublicView)
- `/_internal/create-suggested-proposal` (ProposalConfig, useCreateSuggestedProposalLogic)
- `/search` (CreateProposalFlowV2, DaysSelectionSection)

~~~~~

## Chunk 1 of 6
- **Files**: `src/islands/pages/proposals/displayUtils.js`, `src/islands/pages/proposals/ProposalCard.jsx`, `src/islands/pages/proposals/ExpandableProposalCard.jsx`
- **Rationale**: `displayUtils.js` defines its own `DAY_NAMES` with 3-letter abbreviations (`['Sun', 'Mon', ...]`) which differs from the canonical full names. Both ProposalCard and ExpandableProposalCard also define their own `DAY_NAMES` locally.
- **Approach**:
  1. Update `displayUtils.js` to import `DAY_NAMES` from `lib/dayUtils.js` and create derived `DAY_ABBREVS_SHORT` (3-letter) locally
  2. Remove local `DAY_NAMES` from ProposalCard.jsx and ExpandableProposalCard.jsx, import from `lib/dayUtils.js`
  3. Keep `DAY_ABBREVS` in displayUtils.js as it's a 1-letter abbreviation not available elsewhere

~~~~~

## Chunk 2 of 6
- **Files**: `src/islands/pages/AccountProfilePage/useAccountProfilePageLogic.js`, `src/islands/pages/AccountProfilePage/components/PublicView.jsx`, `src/islands/pages/AccountProfilePage/components/cards/ScheduleCommuteCard.jsx`
- **Rationale**: All three files define their own `DAY_NAMES` constant locally instead of importing from the centralized `lib/dayUtils.js` or `lib/constants.js`
- **Approach**:
  1. Remove local `DAY_NAMES` declarations from all three files
  2. Add import `{ DAY_NAMES } from '../../../lib/dayUtils.js'` (adjust path per file depth)
  3. No logic changes required - just import consolidation

~~~~~

## Chunk 3 of 6
- **Files**: `src/logic/workflows/scheduling/validateScheduleWorkflow.js`, `src/logic/workflows/scheduling/validateMoveInDateWorkflow.js`
- **Rationale**: Both workflow files define `DAY_NAMES` locally inside functions instead of importing from centralized location
- **Approach**:
  1. Add import `{ DAY_NAMES } from '../../../lib/dayUtils.js'` to both files
  2. Remove local `const DAY_NAMES = [...]` declarations from inside functions
  3. No logic changes - just import consolidation

~~~~~

## Chunk 4 of 6
- **Files**: `src/islands/shared/CreateProposalFlowV2Components/DaysSelectionSection.jsx`
- **Rationale**: Defines its own local `DAY_NAMES` constant at line 10 instead of importing
- **Approach**:
  1. Add import `{ DAY_NAMES } from '../../../lib/dayUtils.js'`
  2. Remove local `const DAY_NAMES = [...]` declaration
  3. No logic changes required

~~~~~

## Chunk 5 of 6
- **Files**: `src/logic/processors/proposal/processProposalData.js`, `src/logic/processors/proposals/processProposalData.js`
- **Rationale**: Two separate files exist with overlapping but different implementations. `proposal/` (singular) has 1 dependent, `proposals/` (plural) has 0 dependents but is the canonical location per the comment in `loadProposalDetailsWorkflow.js`
- **Approach**:
  1. Keep `proposals/processProposalData.js` as canonical (matches workflow import pattern)
  2. Update `proposal/processProposalData.js` to re-export from canonical location with deprecation notice
  3. Add any unique exports from `proposal/` to `proposals/` if needed

~~~~~

## Chunk 6 of 6
- **Files**: `src/lib/constants/proposalStatuses.js`, `src/lib/constants/proposalStages.js`
- **Rationale**: These files are marked as deprecated and re-export from `logic/constants/`. They add unnecessary indirection and confusion about canonical import paths
- **Approach**:
  1. Find all imports using `lib/constants/proposalStatuses.js` path (1 file: `lib/proposals/statusButtonConfig.js`)
  2. Update imports to use canonical `logic/constants/proposalStatuses.js` path
  3. After migration verification, files can be deleted in a separate cleanup

~~~~~

## Testing Checklist

For each chunk:
- [ ] Verify `bun run build` completes without errors
- [ ] Verify no runtime errors on affected pages
- [ ] Verify day display formatting is unchanged
- [ ] Verify date/currency formatting is unchanged

## Cascading Changes Summary

### Chunk 1 Cascading Changes:
- `src/islands/pages/proposals/ExpandableProposalCard.jsx` imports from `displayUtils.js`

### Chunk 5 Cascading Changes:
- `src/logic/workflows/booking/loadProposalDetailsWorkflow.js` comments reference `proposals/processProposalData.js`

### Chunk 6 Cascading Changes:
- `src/lib/proposals/statusButtonConfig.js` imports from `lib/constants/proposalStatuses.js`

## Files Referenced

### Critical Files (DO NOT MODIFY):
- `src/lib/supabase.js` - 93 dependents
- `src/lib/secureStorage.js` - 89 dependents
- `src/lib/auth.js` - 79 dependents
- `src/lib/constants.js` - 52 dependents
- `src/logic/constants/proposalStatuses.js` - 39 dependents

### Files to Modify (Safe - Low/No Dependents):
- `src/islands/pages/proposals/displayUtils.js` - 2 dependents
- `src/islands/pages/proposals/ProposalCard.jsx` - 0 dependents (leaf)
- `src/islands/pages/proposals/ExpandableProposalCard.jsx` - 0 dependents (leaf)
- `src/islands/pages/AccountProfilePage/useAccountProfilePageLogic.js` - 0 dependents (leaf)
- `src/islands/pages/AccountProfilePage/components/PublicView.jsx` - 0 dependents (leaf)
- `src/islands/pages/AccountProfilePage/components/cards/ScheduleCommuteCard.jsx` - 0 dependents (leaf)
- `src/logic/workflows/scheduling/validateScheduleWorkflow.js` - 0 dependents (leaf)
- `src/logic/workflows/scheduling/validateMoveInDateWorkflow.js` - 0 dependents (leaf)
- `src/islands/shared/CreateProposalFlowV2Components/DaysSelectionSection.jsx` - 0 dependents (leaf)
- `src/logic/processors/proposal/processProposalData.js` - 1 dependent
- `src/logic/processors/proposals/processProposalData.js` - 0 dependents (leaf)
- `src/lib/constants/proposalStatuses.js` - 0 dependents (leaf, re-export only)
- `src/lib/constants/proposalStages.js` - 0 dependents (leaf, re-export only)
- `src/lib/proposals/statusButtonConfig.js` - 0 dependents (leaf)

### Centralized Utilities (Import Sources):
- `src/lib/dayUtils.js` - Canonical DAY_NAMES and day utilities
- `src/lib/dateFormatters.js` - Canonical date formatting
- `src/lib/priceCalculations.js` - Canonical formatPrice
- `src/logic/constants/proposalStatuses.js` - Canonical proposal status config
- `src/logic/constants/proposalStages.js` - Canonical proposal stage config
