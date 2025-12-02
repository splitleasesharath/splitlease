# Scheduling Rules - Logic Layer 2

**GENERATED**: 2025-11-26
**LAYER**: Rules (Boolean Predicates)
**PARENT**: app/src/logic/rules/

---

## ### DIRECTORY_INTENT ###

[PURPOSE]: Boolean predicates for date and schedule validation
[LAYER]: Layer 2 - Rules (return true/false, express business rules)
[PATTERN]: All functions validate scheduling constraints

---

## ### FILE_INVENTORY ###

### isDateBlocked.js
[INTENT]: Check if specific date is unavailable due to existing bookings or host blocks
[EXPORTS]: isDateBlocked
[SIGNATURE]: (date: Date, blockedDates: array) => boolean
[RETURNS]: true if date is blocked, false if available

### isDateInRange.js
[INTENT]: Check if date falls within valid booking range (not too far future, not past)
[EXPORTS]: isDateInRange
[SIGNATURE]: (date: Date, minDate: Date, maxDate: Date) => boolean
[RETURNS]: true if date is within range

### isScheduleContiguous.js
[INTENT]: Verify selected schedule days are continuous without gaps
[EXPORTS]: isScheduleContiguous
[SIGNATURE]: (selectedDays: array) => boolean
[RETURNS]: true if days are contiguous (e.g., Mon-Tue-Wed)

---

## ### USAGE_PATTERN ###

[IMPORT_FROM]: import { isDateBlocked } from 'logic/rules/scheduling/isDateBlocked'
[CONSUMED_BY]: Calendar components, move-in date picker, schedule validation
[PATTERN]: if (isDateBlocked(selectedDate, listing.blockedDates)) disableDate()

---

## ### CRITICAL_NOTE ###

[DAY_FORMAT]: These rules use JavaScript day format (0=Sunday, 6=Saturday)
[CONVERSION]: Convert from Bubble format before validation using adaptDaysFromBubble

---

**FILE_COUNT**: 3
**EXPORTS_COUNT**: 3
