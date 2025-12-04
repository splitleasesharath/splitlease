# Logic Core Map

**TYPE**: BRANCH NODE (Top Level)
**PARENT**: app/src/

---

## ### DIRECTORY_INTENT ###

[PURPOSE]: Centralized business logic following Four-Layer Architecture
[PATTERN]: Separation of concerns with clear layer responsibilities
[BENEFIT]: Testable, maintainable, reusable logic independent of UI

---

## ### FOUR-LAYER ARCHITECTURE ###

```
┌─────────────────────────────────────────────────────────────┐
│ Layer 4: WORKFLOWS (async orchestration)                    │
│ [INTENT]: Multi-step operations with API calls              │
│ [LINK]: ./workflows/CLAUDE.md                               │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ Layer 3: PROCESSORS (data transformation)                   │
│ [INTENT]: Map, transform, validate data shapes              │
│ [LINK]: ./processors/CLAUDE.md                              │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ Layer 2: RULES (boolean predicates)                         │
│ [INTENT]: Business rules returning true/false               │
│ [LINK]: ./rules/CLAUDE.md                                   │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ Layer 1: CALCULATORS (pure math)                            │
│ [INTENT]: Deterministic mathematical operations             │
│ [LINK]: ./calculators/CLAUDE.md                             │
└─────────────────────────────────────────────────────────────┘
```

---

## ### SUB-MODULES ###

- **[calculators/](./calculators/CLAUDE.md)**: Pure math (pricing, scheduling) - 8 functions
- **[rules/](./rules/CLAUDE.md)**: Boolean predicates (auth, proposals, users) - 19 functions
- **[processors/](./processors/CLAUDE.md)**: Data transformation (external adapters, display) - 13 functions
- **[workflows/](./workflows/CLAUDE.md)**: Async orchestration (auth, booking, proposals) - 11 functions

---

## ### KEY_EXPORTS ###

[BARREL]: index.js re-exports from all layers
[IMPORT_PATTERN]: import { functionName } from 'logic'
[SPECIFIC_IMPORT]: import { functionName } from 'logic/layer/domain/file'

---

## ### CRITICAL_RULES ###

[DAY_INDEXING]: JavaScript uses 0-6 (Sun-Sat), Bubble uses 1-7
[CONVERTER]: Use processors/external/adaptDays* at API boundaries
[NO_FALLBACK]: All functions throw errors, never mask problems
[PURE_CALCULATORS]: Layer 1 has zero side effects
[BOOLEAN_RULES]: Layer 2 returns only true/false

---

## ### USAGE_PATTERN ###

```javascript
// Top-level import (tree-shaking friendly)
import { calculatePricingBreakdown, canCancelProposal } from 'logic'

// Specific imports (smaller bundle)
import { calculatePricingBreakdown } from 'logic/calculators/pricing/calculatePricingBreakdown'
import { canCancelProposal } from 'logic/rules/proposals/canCancelProposal'
```

---

## ### FILE_INVENTORY ###

### index.js
[INTENT]: Central barrel export for all logic layers
[EXPORTS]: * from calculators, rules, processors, workflows

---

**SUBDIRECTORY_COUNT**: 4
**TOTAL_FILES**: 51
