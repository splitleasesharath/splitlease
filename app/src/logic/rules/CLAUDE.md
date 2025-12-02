# Rules - Logic Layer 2

**GENERATED**: 2025-11-26
**LAYER**: Rules (Boolean Predicates)
**PARENT**: app/src/logic/

---

## ### DIRECTORY_INTENT ###

[PURPOSE]: Boolean predicate functions expressing business rules
[LAYER]: Layer 2 of four-layer logic architecture
[PATTERN]: All functions return true/false based on input state

---

## ### SUBDIRECTORIES ###

### auth/
[INTENT]: Authentication and authorization predicates
[FILES]: 2 rule functions
[KEY_EXPORTS]: isProtectedPage, isSessionValid

### pricing/
[INTENT]: Pricing validation predicates
[FILES]: 1 rule function
[KEY_EXPORTS]: isValidDayCountForPricing

### proposals/
[INTENT]: Proposal state and action eligibility predicates
[FILES]: 6 rule functions
[KEY_EXPORTS]: canAcceptProposal, canCancelProposal, canEditProposal, determineProposalStage

### scheduling/
[INTENT]: Date and schedule validation predicates
[FILES]: 3 rule functions
[KEY_EXPORTS]: isDateBlocked, isDateInRange, isScheduleContiguous

### search/
[INTENT]: Search filter validation predicates
[FILES]: 3 rule functions
[KEY_EXPORTS]: isValidPriceTier, isValidSortOption, isValidWeekPattern

### users/
[INTENT]: User type and profile state predicates
[FILES]: 4 rule functions
[KEY_EXPORTS]: isGuest, isHost, hasProfilePhoto, shouldShowFullName

---

## ### LAYER_RULES ###

[ALLOWED]: Boolean logic, comparisons, type checks
[ALLOWED]: Calling calculators for computed values
[FORBIDDEN]: API calls, state mutations, side effects
[TESTING]: All functions should have clear true/false test cases

---

## ### USAGE_PATTERN ###

[IMPORT_FROM]: import { canAcceptProposal } from 'logic/rules/proposals/canAcceptProposal'
[PATTERN]: if (ruleFunction(data)) { /* action */ }

---

**SUBDIRECTORY_COUNT**: 6
**TOTAL_FILES**: 19
