# Rules Map

**TYPE**: BRANCH NODE
**PARENT**: app/src/logic/

---

## ### DIRECTORY_INTENT ###

[PURPOSE]: Boolean predicate functions expressing business rules
[PATTERN]: Layer 2 of Four-Layer Logic Architecture
[LAYER]: Rules (returns true/false, may call calculators)

---

## ### SUB-MODULES ###

- **[auth/](./auth/CLAUDE.md)**: Authentication & authorization (isProtectedPage, isSessionValid)
- **[pricing/](./pricing/CLAUDE.md)**: Pricing validation (isValidDayCountForPricing)
- **[proposals/](./proposals/CLAUDE.md)**: Proposal state & actions (canCancelProposal, canAcceptProposal, canEditProposal, determineProposalStage, proposalRules)
- **[scheduling/](./scheduling/CLAUDE.md)**: Date & schedule validation (isDateBlocked, isDateInRange, isScheduleContiguous)
- **[search/](./search/CLAUDE.md)**: Search filter validation (isValidPriceTier, isValidSortOption, isValidWeekPattern)
- **[users/](./users/CLAUDE.md)**: User type & profile checks (isGuest, isHost, hasProfilePhoto, shouldShowFullName)

---

## ### KEY_EXPORTS ###

[FROM_AUTH]: isProtectedPage, isSessionValid
[FROM_PROPOSALS]: canCancelProposal, canAcceptProposal, canEditProposal, determineProposalStage, proposalRules (all exports)
[FROM_SCHEDULING]: isDateBlocked, isDateInRange, isScheduleContiguous
[FROM_USERS]: isGuest, isHost, hasProfilePhoto, shouldShowFullName
[BARREL]: index.js re-exports all

---

## ### SHARED_CONVENTIONS ###

[CRITICAL]: All functions return boolean (true/false) OR throw errors
[NO_FALLBACK]: Return false for invalid input, throw for critical errors
[NAMING]: can* for permissions, is* for state checks, has* for property checks, should* for recommendations
[LAYER]: May call calculators, NOT workflows or processors

---

## ### DEPENDENCY_FLOW ###

```
UI Components / Hooks
    │
    ▼
Workflows (Layer 4)
    │
    ▼
Processors (Layer 3)
    │
    ▼
RULES (Layer 2) ← YOU ARE HERE
    │
    ▼
Calculators (Layer 1)
```

---

## ### USAGE_PATTERN ###

[IMPORT_FROM]: import { canCancelProposal } from 'logic/rules/proposals/canCancelProposal'
[PATTERN]: if (ruleFunction(data)) { /* allowed */ } else { /* denied */ }
[CONSUMED_BY]: UI Components (button visibility), Workflows (validation), Processors (filtering)

---

**SUBDIRECTORY_COUNT**: 6
**TOTAL_FILES**: 19
