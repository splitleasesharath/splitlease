# Logic Layer - Four-Layer Architecture

**GENERATED**: 2025-11-26
**PARENT**: app/src/

---

## ### DIRECTORY_INTENT ###

[PURPOSE]: Centralized business logic following four-layer architecture
[PATTERN]: Separation of concerns with clear layer responsibilities
[BENEFIT]: Testable, maintainable, reusable logic

---

## ### FOUR_LAYER_ARCHITECTURE ###

### Layer 1: Calculators
[PATH]: logic/calculators/
[PURPOSE]: Pure mathematical functions
[CHARACTERISTICS]: No side effects, deterministic output
[EXAMPLE]: calculatePricingBreakdown, calculateNightsFromDays

### Layer 2: Rules
[PATH]: logic/rules/
[PURPOSE]: Boolean predicates expressing business rules
[CHARACTERISTICS]: Return true/false, may call calculators
[EXAMPLE]: canAcceptProposal, isDateBlocked

### Layer 3: Processors
[PATH]: logic/processors/
[PURPOSE]: Data transformation and adaptation
[CHARACTERISTICS]: Map/transform data, may call calculators and rules
[EXAMPLE]: processProposalData, adaptDaysFromBubble

### Layer 4: Workflows
[PATH]: logic/workflows/
[PURPOSE]: Multi-step orchestration with async operations
[CHARACTERISTICS]: Combine all layers, handle API calls
[EXAMPLE]: acceptProposalWorkflow, checkAuthStatusWorkflow

---

## ### SUBDIRECTORIES ###

### calculators/
[INTENT]: Pure math functions for pricing and scheduling
[SUBDIRS]: pricing/, scheduling/
[FILE_COUNT]: 8

### rules/
[INTENT]: Boolean predicates for all business rules
[SUBDIRS]: auth/, pricing/, proposals/, scheduling/, search/, users/
[FILE_COUNT]: 19

### processors/
[INTENT]: Data transformation functions
[SUBDIRS]: display/, external/, listing/, proposal/, proposals/, user/
[FILE_COUNT]: 13

### workflows/
[INTENT]: Orchestration functions with async operations
[SUBDIRS]: auth/, booking/, proposals/, scheduling/
[FILE_COUNT]: 11

---

## ### FILE_INVENTORY ###

### index.js
[INTENT]: Central barrel export for all logic layers
[EXPORTS]: * from calculators, rules, processors, workflows

---

## ### DEPENDENCY_FLOW ###

```
UI Components
    │
    ▼
Workflows (Layer 4) ───> API calls via lib/
    │
    ▼
Processors (Layer 3)
    │
    ▼
Rules (Layer 2)
    │
    ▼
Calculators (Layer 1)
```

---

## ### USAGE_PATTERN ###

[IMPORT_FROM]: import { calculatePricingBreakdown, canAcceptProposal } from 'logic'
[ALTERNATIVE]: import from specific layer for smaller bundles

---

## ### CRITICAL_NOTES ###

[DAY_INDEXING]: Always convert days at system boundaries
[JS_FORMAT]: 0=Sunday, 6=Saturday (internal)
[BUBBLE_FORMAT]: 1=Sunday, 7=Saturday (external API)
[CONVERTER]: logic/processors/external/adaptDays*

---

**TOTAL_FILES**: 51
**ARCHITECTURE**: Four-Layer Logic System
