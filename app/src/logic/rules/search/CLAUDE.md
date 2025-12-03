# Search Rules Context

**TYPE**: LEAF NODE
**PARENT**: app/src/logic/rules/

---

## ### DIRECTORY_INTENT ###

[PURPOSE]: Boolean predicates for validating search filter parameters
[LAYER]: Layer 2 - Rules (return true/false)
[PATTERN]: Validate URL params and filter values against allowed options

---

## ### RULE_CONTRACTS ###

### isValidPriceTier
[PATH]: ./isValidPriceTier.js
[INTENT]: Validate price range filter value
[SIGNATURE]: ({ priceTier: string }) => boolean
[INPUT]:
  - priceTier: string (req) - Price tier value to validate
[OUTPUT]: boolean - true if valid tier
[THROWS]: Error when priceTier is not a string
[VALID_VALUES]: 'under-200', '200-350', '350-500', '500-plus', 'all'
[EXAMPLE]:
  - `isValidPriceTier({ priceTier: 'under-200' })` => true
  - `isValidPriceTier({ priceTier: 'invalid' })` => false
[DEPENDS_ON]: None (pure function)

---

### isValidSortOption
[PATH]: ./isValidSortOption.js
[INTENT]: Validate sort option parameter
[SIGNATURE]: ({ sortBy: string }) => boolean
[INPUT]:
  - sortBy: string (req) - Sort option value to validate
[OUTPUT]: boolean - true if valid sort option
[THROWS]: Error when sortBy is not a string
[VALID_VALUES]: 'recommended', 'price-low', 'most-viewed', 'recent'
[EXAMPLE]:
  - `isValidSortOption({ sortBy: 'price-low' })` => true
  - `isValidSortOption({ sortBy: 'invalid' })` => false
[DEPENDS_ON]: None (pure function)

---

### isValidWeekPattern
[PATH]: ./isValidWeekPattern.js
[INTENT]: Validate week pattern filter value
[SIGNATURE]: ({ weekPattern: string }) => boolean
[INPUT]:
  - weekPattern: string (req) - Week pattern value to validate
[OUTPUT]: boolean - true if valid pattern
[THROWS]: Error when weekPattern is not a string
[VALID_VALUES]: 'every-week', 'one-on-off', 'two-on-off', 'one-three-off'
[EXAMPLE]:
  - `isValidWeekPattern({ weekPattern: 'one-on-off' })` => true
  - `isValidWeekPattern({ weekPattern: 'invalid' })` => false
[DEPENDS_ON]: None (pure function)

---

### hasListingPhotos
[PATH]: ./hasListingPhotos.js
[INTENT]: Check if a listing has at least one photo for search display
[SIGNATURE]: ({ listing: object }) => boolean
[INPUT]:
  - listing: object (req) - The listing object to check
[OUTPUT]: boolean - true if listing has at least one photo
[THROWS]: Error when listing is null or undefined
[CRITICAL]: Listings without photos MUST NOT appear in search results
[EXAMPLE]:
  - `hasListingPhotos({ listing: { 'Features - Photos': ['photo1'] } })` => true
  - `hasListingPhotos({ listing: { 'Features - Photos': [] } })` => false
  - `hasListingPhotos({ listing: { 'Features - Photos': null } })` => false
[DEPENDS_ON]: None (pure function)

---

## ### VALUE_REFERENCE ###

| Rule | Valid Values |
|------|--------------|
| isValidPriceTier | 'under-200', '200-350', '350-500', '500-plus', 'all' |
| isValidSortOption | 'recommended', 'price-low', 'most-viewed', 'recent' |
| isValidWeekPattern | 'every-week', 'one-on-off', 'two-on-off', 'one-three-off' |

---

## ### CRITICAL_USAGE_RULES ###

[RULE_1]: Always validate URL params before using in API calls
[RULE_2]: Invalid values should fall back to defaults in UI, not throw
[RULE_3]: These are the SOURCE OF TRUTH for allowed filter values

---

## ### COMMON_PATTERNS ###

### URL Parameter Validation
```javascript
import { isValidPriceTier } from 'logic/rules/search/isValidPriceTier'
import { isValidSortOption } from 'logic/rules/search/isValidSortOption'
import { isValidWeekPattern } from 'logic/rules/search/isValidWeekPattern'

function parseSearchParams(urlParams) {
  const priceTier = urlParams.get('price')
  const sortBy = urlParams.get('sort')
  const weekPattern = urlParams.get('pattern')

  return {
    priceTier: isValidPriceTier({ priceTier }) ? priceTier : 'all',
    sortBy: isValidSortOption({ sortBy }) ? sortBy : 'recommended',
    weekPattern: isValidWeekPattern({ weekPattern }) ? weekPattern : 'every-week'
  }
}
```

---

## ### DEPENDENCIES ###

[LOCAL]: None
[EXTERNAL]: None
[EXPORTS]: isValidPriceTier, isValidSortOption, isValidWeekPattern, hasListingPhotos

---

## ### SHARED_CONVENTIONS ###

[NO_FALLBACK]: Functions throw on invalid input TYPE, return false for invalid VALUE
[PURE]: No side effects, deterministic output
[SOURCE_OF_TRUTH]: Internal arrays define valid options

---

## ### SEARCH_CONSTRAINTS ###

Listings MUST satisfy ALL of the following to appear in search results:
1. `Complete = true`
2. `Active = true OR Active IS NULL`
3. Has valid coordinates (`Location - Address` or `Location - slightly different address`)
4. **Has at least one photo** (`Features - Photos` is not null and not empty)

---

**FILE_COUNT**: 4
**EXPORTS_COUNT**: 4
