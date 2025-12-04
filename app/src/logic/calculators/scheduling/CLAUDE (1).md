# Scheduling Calculators Context

**TYPE**: LEAF NODE
**PARENT**: app/src/logic/calculators/

---

## ### LOGIC_CONTRACTS ###

### calculateNightsFromDays
[PATH]: ./calculateNightsFromDays.js
[INTENT]: Calculate number of nights from selected days (nights = days.length)
[SIGNATURE]: ({ selectedDays: number[] }) => number
[INPUT]:
  - selectedDays: number[] (req) - Array of day indices 0-6 (JS format)
[OUTPUT]: number - Number of nights in the stay (equals array length)
[THROWS]:
  - Error: "selectedDays must be an array" - When not array
  - Error: "Invalid day index N" - When day < 0 or > 6
[RULE]: In split lease, nights = days selected (continuous selection)
[EXAMPLE]: calculateNightsFromDays({ selectedDays: [1, 2, 3, 4, 5] }) => 5
[DEPENDS_ON]: None (pure function)
[USED_BY]: Pricing calculations, Schedule selectors

### calculateCheckInOutDays
[PATH]: ./calculateCheckInOutDays.js
[INTENT]: Calculate check-in and check-out days from selected days
[SIGNATURE]: ({ selectedDays: number[] }) => { checkInDay: number, checkOutDay: number, checkInName: string, checkOutName: string }
[INPUT]:
  - selectedDays: number[] (req) - Array of day indices 0-6 (JS format)
[OUTPUT]: object
  ```
  {
    checkInDay: number,    // First selected day
    checkOutDay: number,   // Day AFTER last selected (mod 7)
    checkInName: string,   // e.g., "Monday"
    checkOutName: string   // e.g., "Saturday"
  }
  ```
[THROWS]:
  - Error: "selectedDays must be an array" - When not array
  - Error: "selectedDays cannot be empty" - When array empty
  - Error: "Invalid day index N" - When day < 0 or > 6
[RULES]:
  - Check-in = first selected day in sequence
  - Check-out = day AFTER last selected day (wraps around week)
  - Handles wrap-around (e.g., Fri-Mon) by finding gap
[EXAMPLE]:
  - Standard: calculateCheckInOutDays({ selectedDays: [1, 2, 3, 4, 5] }) => { checkInDay: 1, checkOutDay: 6, ... }
  - Wrapped: calculateCheckInOutDays({ selectedDays: [5, 6, 0, 1] }) => { checkInDay: 5, checkOutDay: 2, ... }
[DEPENDS_ON]: lib/constants.js (DAY_NAMES)
[USED_BY]: Schedule display, Booking confirmation

### calculateNextAvailableCheckIn
[PATH]: ./calculateNextAvailableCheckIn.js
[INTENT]: Find next available check-in date matching selected day-of-week pattern
[SIGNATURE]: ({ selectedDayIndices: number[], minDate: Date|string }) => string
[INPUT]:
  - selectedDayIndices: number[] (req) - Sorted array of day indices 0-6
  - minDate: Date|string (req) - Minimum allowed check-in date
[OUTPUT]: string - ISO date string (YYYY-MM-DD) for next available check-in
[THROWS]:
  - Error: "selectedDayIndices must be a non-empty array" - When invalid
  - Error: "Invalid day index N" - When day < 0 or > 6
  - Error: "minDate is not a valid date" - When unparseable
[RULES]:
  - Check-in must be on first day of selected weekly pattern
  - Check-in must be on or after minDate
  - If minDate is already on correct day, returns minDate
  - Otherwise, finds next occurrence
[EXAMPLE]: calculateNextAvailableCheckIn({ selectedDayIndices: [3, 4, 5, 6], minDate: '2025-12-01' }) => '2025-12-03'
[DEPENDS_ON]: None (pure function)
[USED_BY]: Move-in date picker, Booking workflows

---

## ### CRITICAL_NOTES ###

[DAY_FORMAT]: All functions use JavaScript day format (0=Sunday, 6=Saturday)
[CONVERSION_REQUIRED]: Convert from Bubble format (1-7) before use:
  ```
  import { adaptDaysFromBubble } from 'logic/processors/external/adaptDaysFromBubble'
  const jsDays = adaptDaysFromBubble({ bubbleDays }) // 1-7 -> 0-6
  ```
[DAY_NAMES_CONSTANT]: Uses lib/constants.js DAY_NAMES array:
  ```
  ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  ```

---

## ### DEPENDENCIES ###

[LOCAL]: ./index.js (barrel export)
[EXTERNAL]: lib/constants.js (DAY_NAMES)
[EXPORTS]: calculateNightsFromDays, calculateCheckInOutDays, calculateNextAvailableCheckIn

---

## ### SHARED_CONVENTIONS ###

[NO_FALLBACK]: All functions throw errors, never return defaults
[PURE]: No side effects, deterministic output
[VALIDATION]: Input validation before any calculation
[NAMING]: calculate* for all derived values

---

**FILE_COUNT**: 3
**EXPORTS_COUNT**: 3
