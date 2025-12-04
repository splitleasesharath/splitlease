# Scheduling Rules Context

**TYPE**: LEAF NODE
**PARENT**: app/src/logic/rules/

---

## ### DIRECTORY_INTENT ###

[PURPOSE]: Boolean predicates for date and schedule validation
[LAYER]: Layer 2 - Rules (return true/false)
[PATTERN]: Validate dates, ranges, and contiguity for scheduling

---

## ### RULE_CONTRACTS ###

### isDateBlocked
[PATH]: ./isDateBlocked.js
[INTENT]: Check if specific date is unavailable
[SIGNATURE]: ({ date: Date, blockedDates: (string|Date)[] }) => boolean
[INPUT]:
  - date: Date (req) - Date to check
  - blockedDates: Array (req) - Array of blocked date strings (YYYY-MM-DD) or Date objects
[OUTPUT]: boolean - true if date is blocked, false if available
[THROWS]:
  - Error when date is not valid Date object
  - Error when blockedDates is not an array
[BEHAVIOR]:
  - Compares dates in YYYY-MM-DD format (ignoring time)
  - Empty blockedDates array returns false (nothing blocked)
  - Invalid entries in array are skipped silently
[EXAMPLE]:
  ```javascript
  isDateBlocked({
    date: new Date('2025-12-25'),
    blockedDates: ['2025-12-25', '2025-12-26']
  }) // => true
  ```
[DEPENDS_ON]: None (pure function)

---

### isDateInRange
[PATH]: ./isDateInRange.js
[INTENT]: Check if date falls within availability window
[SIGNATURE]: ({ date: Date, firstAvailable: string|Date|null, lastAvailable: string|Date|null }) => boolean
[INPUT]:
  - date: Date (req) - Date to check
  - firstAvailable: string|Date|null (opt) - Start of range (inclusive), null means unbounded
  - lastAvailable: string|Date|null (opt) - End of range (inclusive), null means unbounded
[OUTPUT]: boolean - true if date within range
[THROWS]:
  - Error when date is not valid Date object
  - Error when firstAvailable/lastAvailable are invalid dates
[BEHAVIOR]:
  - Ignores time component (compares dates only)
  - Null/undefined bounds treated as unbounded
[EXAMPLE]:
  ```javascript
  isDateInRange({
    date: new Date('2025-12-15'),
    firstAvailable: '2025-12-01',
    lastAvailable: '2026-01-31'
  }) // => true
  ```
[DEPENDS_ON]: None (pure function)

---

### isScheduleContiguous
[PATH]: ./isScheduleContiguous.js
[INTENT]: Verify selected days form consecutive block
[SIGNATURE]: ({ selectedDayIndices: number[] }) => boolean
[INPUT]:
  - selectedDayIndices: number[] (req) - Day indices (0=Sun, 1=Mon... 6=Sat)
[OUTPUT]: boolean - true if days are consecutive
[THROWS]:
  - Error when selectedDayIndices is not an array
  - Error when any day index is not 0-6
[BUSINESS_RULES]:
  - Days must be consecutive (Mon-Fri OK, Mon+Wed NOT OK)
  - Handles week wrap-around (Fri-Sun OK, Sat-Tue OK)
  - 6+ days always contiguous (only 1 gap max possible)
  - Empty selection returns false
  - Single day returns true
[WRAP_AROUND_LOGIC]: Uses inverse logic - if unselected days are contiguous, selected days wrap properly
[EXAMPLE]:
  ```javascript
  isScheduleContiguous({ selectedDayIndices: [1, 2, 3, 4, 5] }) // true (Mon-Fri)
  isScheduleContiguous({ selectedDayIndices: [1, 3, 5] }) // false (Mon, Wed, Fri)
  isScheduleContiguous({ selectedDayIndices: [5, 6, 0] }) // true (Fri-Sun wrap)
  isScheduleContiguous({ selectedDayIndices: [6, 0, 1, 2] }) // true (Sat-Tue wrap)
  ```
[DEPENDS_ON]: None (pure function)

---

## ### CRITICAL_USAGE_RULES ###

[RULE_1]: All day indices use JavaScript format (0=Sunday, 6=Saturday)
[RULE_2]: Convert from Bubble format using adaptDaysFromBubble BEFORE validation
[RULE_3]: Use isScheduleContiguous to enforce "consecutive nights" business rule

---

## ### COMMON_PATTERNS ###

### Move-In Date Validation
```javascript
import { isDateBlocked } from 'logic/rules/scheduling/isDateBlocked'
import { isDateInRange } from 'logic/rules/scheduling/isDateInRange'

function canSelectMoveInDate(date, listing) {
  // Check if date is blocked
  if (isDateBlocked({ date, blockedDates: listing.blockedDates || [] })) {
    return false
  }

  // Check if date is within availability range
  if (!isDateInRange({
    date,
    firstAvailable: listing.firstAvailable,
    lastAvailable: listing.lastAvailable
  })) {
    return false
  }

  return true
}
```

### Schedule Selection Validation
```javascript
import { isScheduleContiguous } from 'logic/rules/scheduling/isScheduleContiguous'
import { adaptDaysFromBubble } from 'logic/processors/external/adaptDaysFromBubble'

// Validate user's day selection
const userSelectedDays = [1, 2, 3, 4, 5] // Mon-Fri in JS format

if (!isScheduleContiguous({ selectedDayIndices: userSelectedDays })) {
  showError('Please select consecutive days')
}
```

---

## ### DEPENDENCIES ###

[LOCAL]: None
[EXTERNAL]: None
[EXPORTS]: isDateBlocked, isDateInRange, isScheduleContiguous

---

## ### SHARED_CONVENTIONS ###

[NO_FALLBACK]: All functions throw errors on invalid input types
[PURE]: No side effects, deterministic output
[DAY_FORMAT]: JavaScript 0-6 (Sun-Sat), NOT Bubble 1-7

---

**FILE_COUNT**: 3
**EXPORTS_COUNT**: 3
