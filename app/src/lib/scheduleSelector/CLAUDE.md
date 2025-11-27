# Schedule Selector Utilities

**GENERATED**: 2025-11-26
**PARENT**: app/src/lib/

---

## ### DIRECTORY_INTENT ###

[PURPOSE]: Utility functions specific to schedule selector component
[PATTERN]: Pure functions for day calculations, validation, and pricing

---

## ### FILE_INVENTORY ###

### dayHelpers.js
[INTENT]: Day calculation helpers for contiguous day detection and gap analysis
[EXPORTS]: areContiguousDays, findGaps, mergeDayRanges

### nightCalculations.js
[INTENT]: Calculate number of nights from selected day array
[EXPORTS]: calculateNights, getNightRange

### priceCalculations.js
[INTENT]: Pricing calculations for schedule selector total cost
[IMPORTS]: lib/priceCalculations
[EXPORTS]: calculateTotalPrice, getPricePerNight

### validators.js
[INTENT]: Schedule validation for minimum stay and contiguity requirements
[EXPORTS]: isValidSchedule, validateMinimumNights, validateContiguity

---

## ### CALCULATION_EXAMPLES ###

```javascript
// Night calculation
selectedDays = [1, 2, 3] // Mon, Tue, Wed
nights = calculateNights(selectedDays) // 2 nights (Mon-Tue, Tue-Wed)

// Contiguity check
areContiguousDays([1, 2, 3]) // true
areContiguousDays([1, 3, 5]) // false (gaps)
```

---

## ### USAGE_PATTERN ###

[IMPORT_FROM]: import { calculateNights } from 'lib/scheduleSelector/nightCalculations'
[CONSUMED_BY]: useScheduleSelector hook, ListingScheduleSelector component

---

**FILE_COUNT**: 4
**EXPORTS_COUNT**: 8
