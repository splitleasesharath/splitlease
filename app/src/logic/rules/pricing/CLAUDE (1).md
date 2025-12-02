# Pricing Rules - Logic Layer 2

**GENERATED**: 2025-11-26
**LAYER**: Rules (Boolean Predicates)
**PARENT**: app/src/logic/rules/

---

## ### DIRECTORY_INTENT ###

[PURPOSE]: Boolean predicates for pricing validation and tier eligibility
[LAYER]: Layer 2 - Rules (return true/false, express business rules)
[PATTERN]: All functions return boolean values for pricing decisions

---

## ### FILE_INVENTORY ###

### isValidDayCountForPricing.js
[INTENT]: Validate that day count has corresponding pricing data in listing
[EXPORTS]: isValidDayCountForPricing
[SIGNATURE]: (pricing: object, dayCount: number) => boolean
[RETURNS]: true if pricing tier exists for day count, false otherwise

---

## ### USAGE_PATTERN ###

[IMPORT_FROM]: import { isValidDayCountForPricing } from 'logic/rules/pricing/isValidDayCountForPricing'
[CONSUMED_BY]: Schedule selectors, proposal validation
[PATTERN]: if (!isValidDayCountForPricing(listing.pricing, selectedDays.length)) showError()

---

## ### PRICING_TIERS ###

[TYPICAL_TIERS]: 1-day, 2-day, 3-day, 4-day, 5-day, 6-day, 7-day
[VALIDATION]: Each listing defines which day counts are available with corresponding rates

---

**FILE_COUNT**: 1
**EXPORTS_COUNT**: 1
