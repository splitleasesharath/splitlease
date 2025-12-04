# Calculators Map

**TYPE**: BRANCH NODE
**PARENT**: app/src/logic/

---

## ### DIRECTORY_INTENT ###

[PURPOSE]: Pure mathematical functions with no side effects
[PATTERN]: Layer 1 of Four-Layer Logic Architecture
[LAYER]: Calculators (bottom layer - most foundational)

---

## ### SUB-MODULES ###

- **[pricing/](./pricing/CLAUDE.md)**: Rental pricing calculations (getNightlyRateByFrequency, calculatePricingBreakdown, calculateFourWeekRent, calculateReservationTotal, calculateGuestFacingPrice)
- **[scheduling/](./scheduling/CLAUDE.md)**: Date and scheduling calculations (calculateNightsFromDays, calculateCheckInOutDays, calculateNextAvailableCheckIn)

---

## ### KEY_EXPORTS ###

[FROM_PRICING]: getNightlyRateByFrequency, calculateFourWeekRent, calculateReservationTotal, calculateGuestFacingPrice, calculatePricingBreakdown
[FROM_SCHEDULING]: calculateNightsFromDays, calculateCheckInOutDays, calculateNextAvailableCheckIn
[BARREL]: index.js re-exports all

---

## ### SHARED_CONVENTIONS ###

[CRITICAL]: All functions are PURE - no side effects, deterministic output
[NO_FALLBACK]: Throw errors for invalid input, never return defaults
[NAMING]: calculate* for derived values, get* for lookups
[VALIDATION]: All inputs validated before calculation
[TESTING]: Unit tests with deterministic assertions

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
Rules (Layer 2)
    │
    ▼
CALCULATORS (Layer 1) ← YOU ARE HERE
    │
    ▼
(No dependencies - foundational)
```

---

## ### USAGE_PATTERN ###

[IMPORT_FROM]: import { calculatePricingBreakdown } from 'logic/calculators'
[ALTERNATIVE]: import { calculatePricingBreakdown } from 'logic/calculators/pricing/calculatePricingBreakdown'
[CONSUMED_BY]: Rules, Processors, Workflows, UI Components

---

**SUBDIRECTORY_COUNT**: 2
**TOTAL_FILES**: 8
