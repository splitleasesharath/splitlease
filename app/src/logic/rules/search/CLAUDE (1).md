# Search Rules - Logic Layer 2

**GENERATED**: 2025-11-26
**LAYER**: Rules (Boolean Predicates)
**PARENT**: app/src/logic/rules/

---

## ### DIRECTORY_INTENT ###

[PURPOSE]: Boolean predicates for validating search filter parameters
[LAYER]: Layer 2 - Rules (return true/false, express business rules)
[PATTERN]: All functions validate search input against allowed values

---

## ### FILE_INVENTORY ###

### isValidPriceTier.js
[INTENT]: Validate price range filter value against allowed price tiers
[EXPORTS]: isValidPriceTier
[IMPORTS]: lib/constants
[SIGNATURE]: (priceTier: string) => boolean
[RETURNS]: true if tier is valid (e.g., "budget", "mid", "premium")

### isValidSortOption.js
[INTENT]: Validate sort option parameter against allowed sort values
[EXPORTS]: isValidSortOption
[IMPORTS]: lib/constants
[SIGNATURE]: (sortOption: string) => boolean
[RETURNS]: true if sort option is valid (e.g., "price-asc", "price-desc", "newest")

### isValidWeekPattern.js
[INTENT]: Validate week pattern filter value for scheduling filter
[EXPORTS]: isValidWeekPattern
[IMPORTS]: lib/constants
[SIGNATURE]: (weekPattern: string) => boolean
[RETURNS]: true if pattern is valid (e.g., "every-week", "alternating", "custom")

---

## ### USAGE_PATTERN ###

[IMPORT_FROM]: import { isValidPriceTier } from 'logic/rules/search/isValidPriceTier'
[CONSUMED_BY]: SearchPage, useSearchPageLogic hook
[PATTERN]: if (!isValidPriceTier(urlParam)) useDefaultTier()

---

## ### VALIDATION_CONTEXT ###

[SOURCE]: URL parameters, filter dropdowns
[PURPOSE]: Prevent invalid filter combinations, sanitize user input

---

**FILE_COUNT**: 3
**EXPORTS_COUNT**: 3
