# Scheduling Calculators - Logic Layer 1

**GENERATED**: 2025-11-26
**LAYER**: Calculators (Pure Functions)
**PARENT**: app/src/logic/calculators/

---

## ### DIRECTORY_INTENT ###

[PURPOSE]: Pure mathematical functions for scheduling and date calculations
[LAYER]: Layer 1 - Calculators (no side effects, deterministic output)
[PATTERN]: All functions are pure - same input always produces same output

---

## ### FILE_INVENTORY ###

### calculateCheckInOutDays.js
[INTENT]: Calculate check-in and check-out days from selected day array
[EXPORTS]: calculateCheckInOutDays
[SIGNATURE]: (selectedDays: array) => { checkIn: number, checkOut: number }
[PURE]: Yes

### calculateNextAvailableCheckIn.js
[INTENT]: Find next available check-in date considering blocked dates and minimum notice
[EXPORTS]: calculateNextAvailableCheckIn
[SIGNATURE]: (blockedDates: array, minimumNotice: number) => Date
[PURE]: Yes

### calculateNightsFromDays.js
[INTENT]: Count number of nights from selected days array (nights = days - 1 for contiguous)
[EXPORTS]: calculateNightsFromDays
[SIGNATURE]: (selectedDays: array) => number
[PURE]: Yes

---

## ### USAGE_PATTERN ###

[IMPORT_FROM]: import { calculateNightsFromDays } from 'logic/calculators/scheduling/calculateNightsFromDays'
[CONSUMED_BY]: Schedule selectors, booking flows, pricing calculations
[NEVER]: Call external APIs, modify state, access storage

---

## ### CRITICAL_NOTE ###

[DAY_FORMAT]: These calculators use JavaScript day format (0=Sunday, 6=Saturday)
[CONVERSION_REQUIRED]: Convert from Bubble format (1-7) using processors/external/adaptDaysFromBubble before passing to these calculators

---

**FILE_COUNT**: 3
**EXPORTS_COUNT**: 3
