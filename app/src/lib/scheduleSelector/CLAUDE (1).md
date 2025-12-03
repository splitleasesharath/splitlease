# Schedule Selector Utilities Context

**TYPE**: LEAF NODE
**PARENT**: app/src/lib/

---

## ### DIRECTORY_INTENT ###

[PURPOSE]: Utility functions specific to schedule selector component
[PATTERN]: Pure functions for day calculations, validation, and pricing
[CONSUMED_BY]: useScheduleSelector hook, ListingScheduleSelector component

---

## ### MODULE_CONTRACTS ###

### dayHelpers.js
[PATH]: ./dayHelpers.js
[INTENT]: Day calculation helpers for contiguous day detection and gap analysis
[EXPORTS]:
  - areContiguousDays: (days: number[]) => boolean
  - findGaps: (days: number[]) => number[][]
  - mergeDayRanges: (ranges: number[][]) => number[]
[SYNC]: Yes (pure functions)

---

### nightCalculations.js
[PATH]: ./nightCalculations.js
[INTENT]: Calculate number of nights from selected day array
[EXPORTS]:
  - calculateNights: (selectedDays: number[]) => number
  - getNightRange: (selectedDays: number[]) => { start: number, end: number }
[EXAMPLE]:
```javascript
// Night calculation
selectedDays = [1, 2, 3] // Mon, Tue, Wed
nights = calculateNights(selectedDays) // 2 nights (Mon-Tue, Tue-Wed)
```
[SYNC]: Yes (pure functions)

---

### priceCalculations.js
[PATH]: ./priceCalculations.js
[INTENT]: Pricing calculations for schedule selector total cost
[EXPORTS]:
  - calculateTotalPrice: (listing: object, selectedDays: number[], weeks: number) => number
  - getPricePerNight: (listing: object, nightCount: number) => number
[DEPENDS_ON]: lib/priceCalculations
[SYNC]: Yes (pure functions)

---

### validators.js
[PATH]: ./validators.js
[INTENT]: Schedule validation for minimum stay and contiguity requirements
[EXPORTS]:
  - isValidSchedule: (days: number[], listing: object) => boolean
  - validateMinimumNights: (days: number[], minNights: number) => boolean
  - validateContiguity: (days: number[]) => boolean
[SYNC]: Yes (pure functions)

---

## ### CONTIGUITY_LOGIC ###

```javascript
// Days are contiguous if no gaps exist
areContiguousDays([1, 2, 3]) // true - Mon, Tue, Wed
areContiguousDays([1, 3, 5]) // false - gaps exist

// Week wrap-around handling
areContiguousDays([5, 6, 0]) // true - Fri, Sat, Sun (wraps)
```

---

## ### CRITICAL_USAGE_RULES ###

[RULE_1]: Day indices use JavaScript format (0-6, Sun=0)
[RULE_2]: Night count = days - 1 (3 days = 2 nights)
[RULE_3]: Week wrap-around must be handled for Fri-Sat-Sun selections

---

## ### DEPENDENCIES ###

[LOCAL]: lib/priceCalculations
[EXTERNAL]: None

---

**FILE_COUNT**: 4
**EXPORTS_COUNT**: 8
