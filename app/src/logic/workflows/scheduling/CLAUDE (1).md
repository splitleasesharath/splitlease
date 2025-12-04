# Scheduling Workflows Context

**TYPE**: LEAF NODE
**PARENT**: app/src/logic/workflows/

---

## ### DIRECTORY_INTENT ###

[PURPOSE]: Schedule and date validation orchestration combining rules and calculators
[LAYER]: Layer 4 - Workflows (orchestrate scheduling validation)
[PATTERN]: Return error codes (not UI messages) for presentation layer to map

---

## ### WORKFLOW_CONTRACTS ###

### validateScheduleWorkflow
[PATH]: ./validateScheduleWorkflow.js
[INTENT]: Validate complete day selection against all business rules
[SIGNATURE]: ({ selectedDayIndices: number[], listing?: object }) => ValidationResult
[INPUT]:
  - selectedDayIndices: number[] (req) - Array of day indices (0=Sun, 6=Sat)
  - listing: object (opt) - Listing with minimumNights, maximumNights, daysNotAvailable
[OUTPUT]: { valid: boolean, errorCode: string|null, nightsCount: number, isContiguous: boolean, ...metadata }
[THROWS]: Error when selectedDayIndices is not an array
[VALIDATION_CHECKS]:
  1. Days selected (NO_DAYS_SELECTED if empty)
  2. Contiguity (NOT_CONTIGUOUS if gaps)
  3. Minimum nights (BELOW_MINIMUM_NIGHTS)
  4. Maximum nights (ABOVE_MAXIMUM_NIGHTS)
  5. Days availability (DAYS_NOT_AVAILABLE)
[SYNC]: Yes (pure validation)
[EXAMPLE]:
  ```javascript
  validateScheduleWorkflow({
    selectedDayIndices: [1, 2, 3, 4, 5],
    listing: { minimumNights: 2, maximumNights: 7 }
  })
  // => { valid: true, errorCode: null, nightsCount: 5, isContiguous: true }

  validateScheduleWorkflow({
    selectedDayIndices: [1, 3, 5],
    listing: {}
  })
  // => { valid: false, errorCode: 'NOT_CONTIGUOUS', nightsCount: 3, isContiguous: false }
  ```
[DEPENDS_ON]: rules/scheduling/isScheduleContiguous

---

### validateMoveInDateWorkflow
[PATH]: ./validateMoveInDateWorkflow.js
[INTENT]: Validate move-in date against availability and notice requirements
[SIGNATURE]: ({ date: Date, listing: object }) => Promise<ValidationResult>
[INPUT]:
  - date: Date (req) - Proposed move-in date
  - listing: object (req) - Listing with availability info
[OUTPUT]: { valid: boolean, errorCode: string|null, suggestedAlternatives?: Date[] }
[VALIDATION_CHECKS]:
  1. Date in valid range
  2. Date not blocked
  3. Minimum notice period
  4. Listing availability calendar
[ASYNC]: Yes (may check external availability)
[DEPENDS_ON]: rules/scheduling/isDateBlocked, rules/scheduling/isDateInRange

---

## ### ERROR_CODES ###

| Code | Description | Metadata |
|------|-------------|----------|
| NO_DAYS_SELECTED | Empty selection array | nightsCount: 0 |
| NOT_CONTIGUOUS | Days have gaps | isContiguous: false |
| BELOW_MINIMUM_NIGHTS | Less than listing minimum | minimumNights: n |
| ABOVE_MAXIMUM_NIGHTS | More than listing maximum | maximumNights: n |
| DAYS_NOT_AVAILABLE | Selected unavailable days | unavailableDays: number[] |
| DATE_BLOCKED | Move-in date is blocked | - |
| DATE_OUT_OF_RANGE | Move-in date outside availability | - |
| INSUFFICIENT_NOTICE | Not enough advance notice | - |

---

## ### VALIDATION_RESULT_SHAPE ###

```javascript
{
  valid: boolean,           // Overall validation pass/fail
  errorCode: string | null, // Machine-readable error code
  nightsCount: number,      // Number of nights selected
  isContiguous: boolean,    // Whether days are consecutive

  // Optional metadata (depends on errorCode)
  minimumNights?: number,   // When BELOW_MINIMUM_NIGHTS
  maximumNights?: number,   // When ABOVE_MAXIMUM_NIGHTS
  unavailableDays?: number[], // When DAYS_NOT_AVAILABLE
  suggestedAlternatives?: Date[] // Alternative dates
}
```

---

## ### CRITICAL_USAGE_RULES ###

[RULE_1]: All day indices use JavaScript format (0-6)
[RULE_2]: Error codes are for logic, NOT for display (map in UI layer)
[RULE_3]: Include metadata for building error messages
[RULE_4]: Always return nightsCount even on error (for UI display)

---

## ### COMMON_PATTERNS ###

### Schedule Selector Validation
```javascript
import { validateScheduleWorkflow } from 'logic/workflows/scheduling/validateScheduleWorkflow'

const ERROR_MESSAGES = {
  NO_DAYS_SELECTED: 'Please select at least one day',
  NOT_CONTIGUOUS: 'Selected days must be consecutive',
  BELOW_MINIMUM_NIGHTS: (min) => `Minimum ${min} nights required`,
  ABOVE_MAXIMUM_NIGHTS: (max) => `Maximum ${max} nights allowed`,
  DAYS_NOT_AVAILABLE: 'Some selected days are not available'
}

function validateSelection(selectedDays, listing) {
  const result = validateScheduleWorkflow({
    selectedDayIndices: selectedDays,
    listing
  })

  if (!result.valid) {
    const errorFn = ERROR_MESSAGES[result.errorCode]
    const message = typeof errorFn === 'function'
      ? errorFn(result.minimumNights || result.maximumNights)
      : errorFn
    showError(message)
    return false
  }

  return true
}
```

### Move-In Date Picker
```javascript
import { validateMoveInDateWorkflow } from 'logic/workflows/scheduling/validateMoveInDateWorkflow'

async function handleDateSelect(date, listing) {
  const result = await validateMoveInDateWorkflow({ date, listing })

  if (!result.valid) {
    if (result.suggestedAlternatives?.length > 0) {
      showSuggestedDates(result.suggestedAlternatives)
    }
    disableDate(date)
  }
}
```

---

## ### DEPENDENCIES ###

[LOCAL]: rules/scheduling/isScheduleContiguous, rules/scheduling/isDateBlocked, rules/scheduling/isDateInRange
[EXTERNAL]: None
[EXPORTS]: validateScheduleWorkflow, validateMoveInDateWorkflow

---

## ### SHARED_CONVENTIONS ###

[ERROR_CODES]: Machine-readable, not user messages
[METADATA]: Include for building UI messages
[DAY_FORMAT]: JavaScript 0-6 (Sun-Sat)
[PURE_VALIDATION]: validateScheduleWorkflow is synchronous

---

**FILE_COUNT**: 2
**EXPORTS_COUNT**: 2
