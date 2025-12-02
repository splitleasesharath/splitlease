# Calculators - Logic Layer 1

**GENERATED**: 2025-11-26
**LAYER**: Calculators (Pure Functions)
**PARENT**: app/src/logic/

---

## ### DIRECTORY_INTENT ###

[PURPOSE]: Pure mathematical functions with no side effects
[LAYER]: Layer 1 of four-layer logic architecture
[PATTERN]: Deterministic output - same input always produces same output

---

## ### SUBDIRECTORIES ###

### pricing/
[INTENT]: Pricing calculations including nightly rates, fees, totals
[FILES]: 5 calculator functions
[KEY_EXPORTS]: calculatePricingBreakdown, calculateReservationTotal, getNightlyRateByFrequency

### scheduling/
[INTENT]: Date and scheduling calculations for check-in/out and night counts
[FILES]: 3 calculator functions
[KEY_EXPORTS]: calculateNightsFromDays, calculateNextAvailableCheckIn, calculateCheckInOutDays

---

## ### FILE_INVENTORY ###

### index.js
[INTENT]: Barrel export aggregating all calculator functions
[EXPORTS]: * from pricing/*, * from scheduling/*

---

## ### LAYER_RULES ###

[ALLOWED]: Pure math operations, array transformations, object mapping
[FORBIDDEN]: API calls, DOM access, state mutations, async operations
[TESTING]: All functions should have unit tests with deterministic assertions

---

## ### USAGE_PATTERN ###

[IMPORT_FROM]: import { calculatePricingBreakdown } from 'logic/calculators'
[CONSUMED_BY]: Rules, Processors, Workflows, UI Components

---

**SUBDIRECTORY_COUNT**: 2
**TOTAL_FILES**: 8
