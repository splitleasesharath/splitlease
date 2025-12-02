# Scheduling Workflows - Logic Layer 4

**GENERATED**: 2025-11-26
**LAYER**: Workflows (Orchestration)
**PARENT**: app/src/logic/workflows/

---

## ### DIRECTORY_INTENT ###

[PURPOSE]: Schedule and date validation workflows combining rules and calculators
[LAYER]: Layer 4 - Workflows (orchestrate scheduling validation)
[PATTERN]: Validate user schedule selections against availability and business rules

---

## ### FILE_INVENTORY ###

### validateMoveInDateWorkflow.js
[INTENT]: Validate move-in date against availability, minimum notice, and lease terms
[EXPORTS]: validateMoveInDateWorkflow
[IMPORTS]: ../../rules/scheduling/isDateBlocked, ../../calculators/scheduling/calculateNextAvailableCheckIn
[SIGNATURE]: (date: Date, listing: object) => Promise<ValidationResult>
[ASYNC]: Yes

### validateScheduleWorkflow.js
[INTENT]: Validate complete day selection against availability and booking rules
[EXPORTS]: validateScheduleWorkflow
[IMPORTS]: ../../rules/scheduling/isScheduleContiguous, ../../rules/pricing/isValidDayCountForPricing
[SIGNATURE]: (selectedDays: array, listing: object) => Promise<ValidationResult>
[ASYNC]: Yes

---

## ### WORKFLOW_SEQUENCES ###

### validateMoveInDateWorkflow
```
1. Check if date is in valid range
2. Check if date is blocked
3. Verify minimum notice period met
4. Check against listing availability calendar
5. Return { valid: boolean, errors: string[] }
```

### validateScheduleWorkflow
```
1. Verify days array is not empty
2. Check isScheduleContiguous
3. Check isValidDayCountForPricing
4. Verify all selected days are available
5. Return { valid: boolean, errors: string[], suggestedAlternatives?: array }
```

---

## ### USAGE_PATTERN ###

[IMPORT_FROM]: import { validateScheduleWorkflow } from 'logic/workflows/scheduling/validateScheduleWorkflow'
[CONSUMED_BY]: ListingScheduleSelector, CreateProposalFlowV2
[PATTERN]: const result = await validateScheduleWorkflow(days, listing); if (!result.valid) showErrors(result.errors)

---

## ### VALIDATION_RESULT_SHAPE ###

```javascript
{
  valid: boolean,
  errors: string[],        // Human-readable error messages
  errorCodes: string[],    // Machine-readable error codes
  suggestedAlternatives?: Date[] // Alternative available dates
}
```

---

**FILE_COUNT**: 2
**EXPORTS_COUNT**: 2
