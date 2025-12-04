# Pricing Rules Context

**TYPE**: LEAF NODE
**PARENT**: app/src/logic/rules/

---

## ### DIRECTORY_INTENT ###

[PURPOSE]: Boolean predicates for pricing validation
[LAYER]: Layer 2 - Rules (return true/false)
[PATTERN]: Validate day count against allowed pricing tiers

---

## ### RULE_CONTRACTS ###

### isValidDayCountForPricing
[PATH]: ./isValidDayCountForPricing.js
[INTENT]: Validate if enough days selected for price calculation
[SIGNATURE]: ({ daysSelected: number }) => boolean
[INPUT]:
  - daysSelected: number (req) - Number of days selected
[OUTPUT]: boolean - true if 2-7 days, false otherwise
[THROWS]: Error when daysSelected is not a number
[BUSINESS_RULES]:
  - Minimum 2 days required (2 nights)
  - Maximum 7 days allowed (full week)
[EXAMPLE]:
  - `isValidDayCountForPricing({ daysSelected: 4 })` => true
  - `isValidDayCountForPricing({ daysSelected: 1 })` => false
  - `isValidDayCountForPricing({ daysSelected: 8 })` => false
[DEPENDS_ON]: None (pure function)

---

## ### CRITICAL_USAGE_RULES ###

[RULE_1]: Always validate day count BEFORE calculating pricing
[RULE_2]: Use with schedule selectors to prevent invalid selections
[RULE_3]: Frontend must enforce this - backend also validates

---

## ### COMMON_PATTERNS ###

### Validation Before Pricing
```javascript
import { isValidDayCountForPricing } from 'logic/rules/pricing/isValidDayCountForPricing'
import { getNightlyRateByFrequency } from 'logic/calculators/pricing/getNightlyRateByFrequency'

const selectedDays = [1, 2, 3, 4, 5] // Mon-Fri
const dayCount = selectedDays.length

if (!isValidDayCountForPricing({ daysSelected: dayCount })) {
  // Show error: "Please select 2-7 days"
  return
}

const nightlyRate = getNightlyRateByFrequency({ listing, nightsSelected: dayCount })
```

---

## ### DEPENDENCIES ###

[LOCAL]: None
[EXTERNAL]: None
[EXPORTS]: isValidDayCountForPricing

---

## ### SHARED_CONVENTIONS ###

[NO_FALLBACK]: Throws error on invalid input type
[PURE]: No side effects, deterministic output
[VALIDATION]: Strict number validation (no NaN, no undefined)

---

**FILE_COUNT**: 1
**EXPORTS_COUNT**: 1
