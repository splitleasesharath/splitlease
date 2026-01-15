# Code Refactoring Plan - app\src\logic\calculators

Date: 2026-01-14
Audit Type: general

~~~~~

## PAGE GROUP: /search (Chunks: 1, 2, 3)

### CHUNK 1: Centralize Pricing Constants
**File:** app\src\lib\constants.js
**Line:** 150
**Issue:** Pricing markup and discount rates are hardcoded in calculator functions.
**Affected Pages:** /search, /view-split-lease

**Current Code:**
```javascript
// Price field mappings for nights-based pricing
export const PRICE_FIELD_MAP = {
  2: 'Price 2 nights selected',
  3: 'Price 3 nights selected',
  4: 'Price 4 nights selected',
  5: 'Price 5 nights selected',
  6: 'Price 6 nights selected',
  7: 'Price 7 nights selected'
};
```

**Refactored Code:**
```javascript
// Price field mappings for nights-based pricing
export const PRICE_FIELD_MAP = {
  2: 'Price 2 nights selected',
  3: 'Price 3 nights selected',
  4: 'Price 4 nights selected',
  5: 'Price 5 nights selected',
  6: 'Price 6 nights selected',
  7: 'Price 7 nights selected'
};

// Global pricing configuration
export const PRICING_CONFIG = {
  SITE_MARKUP_RATE: 0.17,
  FULL_TIME_DISCOUNT_RATE: 0.13,
  FULL_TIME_NIGHTS_THRESHOLD: 7
};
```

**Testing:**
- [ ] Verify constants are exported correctly.
- [ ] Ensure no regressions in existing imports.

~~~~~

### CHUNK 2: Update Guest Facing Price to Use Constants
**File:** app\src\logic\calculators\pricing\calculateGuestFacingPrice.js
**Line:** 59
**Issue:** Hardcoded rates for site markup (17%) and full-time discount (13%).
**Affected Pages:** /search

**Current Code:**
```javascript
  // Step 1: Calculate base price (host rate × nights)
  const basePrice = hostNightlyRate * nightsCount

  // Step 2: Apply full-time discount (only for 7 nights, 13% discount)
  const fullTimeDiscount = nightsCount === 7 ? basePrice * 0.13 : 0

  // Step 3: Price after discounts
  const priceAfterDiscounts = basePrice - fullTimeDiscount

  // Step 4: Apply site markup (17%)
  const siteMarkup = priceAfterDiscounts * 0.17

  // Step 5: Calculate total price
  const totalPrice = basePrice - fullTimeDiscount + siteMarkup
```

**Refactored Code:**
```javascript
  import { PRICING_CONFIG } from '../../../lib/constants.js'

  // Step 1: Calculate base price (host rate × nights)
  const basePrice = hostNightlyRate * nightsCount

  // Step 2: Apply full-time discount (only for 7 nights)
  const fullTimeDiscount = nightsCount === PRICING_CONFIG.FULL_TIME_NIGHTS_THRESHOLD 
    ? basePrice * PRICING_CONFIG.FULL_TIME_DISCOUNT_RATE 
    : 0

  // Step 3: Price after discounts
  const priceAfterDiscounts = basePrice - fullTimeDiscount

  // Step 4: Apply site markup
  const siteMarkup = priceAfterDiscounts * PRICING_CONFIG.SITE_MARKUP_RATE

  // Step 5: Calculate total price
  const totalPrice = basePrice - fullTimeDiscount + siteMarkup
```

**Testing:**
- [ ] Run unit tests for calculateGuestFacingPrice.
- [ ] Verify search results still display correct pricing.

~~~~~

### CHUNK 3: Extract getNextOccurrenceOfDay Utility
**File:** app\src\logic\calculators\scheduling\getNextOccurrenceOfDay.js
**Line:** 1
**Issue:** Logic to find the next day of week is duplicated in calculateNextAvailableCheckIn and shiftMoveInDateIfPast.
**Affected Pages:** /search, /view-split-lease, /favorite-listings

**Current Code:**
```javascript
// New file creation - no current code in this path.
// Logic currently duplicated in:
// - calculateNextAvailableCheckIn.js
// - shiftMoveInDateIfPast.js
```

**Refactored Code:**
```javascript
/**
 * Calculate the next occurrence of a specific day-of-week on or after a starting date.
 * 
 * @param {Date} startDate - The date to start searching from.
 * @param {number} targetDayOfWeek - Day index (0-6, where 0=Sunday).
 * @returns {Date} The next occurrence of the target day.
 */
export function getNextOccurrenceOfDay(startDate, targetDayOfWeek) {
  const startDay = startDate.getDay();
  const daysToAdd = (targetDayOfWeek - startDay + 7) % 7;
  
  const resultDate = new Date(startDate);
  resultDate.setDate(startDate.getDate() + daysToAdd);
  resultDate.setHours(0, 0, 0, 0);
  
  return resultDate;
}
```

**Testing:**
- [ ] Create test for getNextOccurrenceOfDay.
- [ ] Verify correct handling of wrap-around (e.g., Sat to Mon).
- [ ] Verify same-day logic (e.g., Mon to Mon returns same day).

~~~~~

## PAGE GROUP: /view-split-lease (Chunks: 4, 5, 6)

### CHUNK 4: Port isContiguousSelection to Logic Core
**File:** app\src\logic\calculators\scheduling\isContiguousSelection.js
**Line:** 1
**Issue:** Core schedule validation logic is stuck in a lib utility instead of pure logic core.
**Affected Pages:** /search, /view-split-lease

**Current Code:**
```javascript
// New file creation - logic currently in app\src\lib\availabilityValidation.js
```

**Refactored Code:**
```javascript
/**
 * Check if selected days form a contiguous block.
 * Handles week wrap-around cases (e.g., Fri-Mon).
 * 
 * @param {number[]} selectedDays - Array of day indices (0-6).
 * @returns {boolean} True if days are contiguous.
 */
export function isContiguousSelection(selectedDays) {
  if (!selectedDays || selectedDays.length === 0) return false;
  if (selectedDays.length === 1) return true;
  if (selectedDays.length >= 6) return true;

  const sorted = [...selectedDays].sort((a, b) => a - b);
  const isStandardContiguous = sorted.every((day, i) => i === 0 || day === sorted[i - 1] + 1);
  if (isStandardContiguous) return true;

  // Wrap-around check
  const hasZero = sorted.includes(0);
  const hasSix = sorted.includes(6);
  if (hasZero && hasSix) {
    const allDays = [0, 1, 2, 3, 4, 5, 6];
    const notSelectedDays = allDays.filter(d => !sorted.includes(d));
    
    const minNotSelected = Math.min(...notSelectedDays);
    const maxNotSelected = Math.max(...notSelectedDays);
    
    return notSelectedDays.length === (maxNotSelected - minNotSelected + 1);
  }

  return false;
}
```

**Testing:**
- [ ] Port existing tests for isContiguousSelection to logic core.
- [ ] Verify wrap-around cases (Fri, Sat, Sun, Mon).

~~~~~

### CHUNK 5: Update calculateNextAvailableCheckIn to Use Utility
**File:** app\src\logic\calculators\scheduling\calculateNextAvailableCheckIn.js
**Line:** 55
**Issue:** Redundant day-of-week calculation logic.
**Affected Pages:** /search, /view-split-lease, /favorite-listings

**Current Code:**
```javascript
  // Get the first selected day (check-in day of week)
  // Days should already be sorted, but sort to be safe
  const sortedDays = [...selectedDayIndices].sort((a, b) => a - b)
  const firstDayOfWeek = sortedDays[0]

  // Get the day of week for the minimum date
  const minDayOfWeek = minDateObj.getDay()

  // Calculate days to add to get to the next occurrence of the first selected day
  const daysToAdd = (firstDayOfWeek - minDayOfWeek + 7) % 7

  // If daysToAdd is 0, we're already on the right day
  if (daysToAdd === 0) {
    return minDateObj.toISOString().split('T')[0]
  }

  // Add the days to get to the next occurrence of the selected day
  const nextCheckInDate = new Date(minDateObj)
  nextCheckInDate.setDate(minDateObj.getDate() + daysToAdd)

  return nextCheckInDate.toISOString().split('T')[0]
```

**Refactored Code:**
```javascript
  import { getNextOccurrenceOfDay } from './getNextOccurrenceOfDay.js'

  // Get the first selected day (check-in day of week)
  const sortedDays = [...selectedDayIndices].sort((a, b) => a - b)
  const firstDayOfWeek = sortedDays[0]

  const nextCheckInDate = getNextOccurrenceOfDay(minDateObj, firstDayOfWeek)

  return nextCheckInDate.toISOString().split('T')[0]
```

**Testing:**
- [ ] Verify smart move-in date calculation in SearchPage.
- [ ] Verify smart move-in date in ViewSplitLeasePage.

~~~~~

### CHUNK 6: Update shiftMoveInDateIfPast to Use Utility
**File:** app\src\logic\calculators\scheduling\shiftMoveInDateIfPast.js
**Line:** 48
**Issue:** Redundant day-of-week calculation and date sanitization logic.
**Affected Pages:** /search, /favorite-listings

**Current Code:**
```javascript
  // Reset time components for date-only comparison
  previousDate.setHours(0, 0, 0, 0);
  minDateObj.setHours(0, 0, 0, 0);

  // If previous date is still valid (>= minDate), use it
  if (previousDate >= minDateObj) {
    return previousMoveInDate.split('T')[0];
  }

  // Date has passed - find next occurrence of same day-of-week
  const targetDayOfWeek = previousDate.getDay();
  const minDayOfWeek = minDateObj.getDay();

  const daysToAdd = (targetDayOfWeek - minDayOfWeek + 7) % 7;
  if (daysToAdd === 0) {
    // Already on the right day
    return minDateObj.toISOString().split('T')[0];
  }

  const shiftedDate = new Date(minDateObj);
  shiftedDate.setDate(minDateObj.getDate() + daysToAdd);

  return shiftedDate.toISOString().split('T')[0];
```

**Refactored Code:**
```javascript
  import { getNextOccurrenceOfDay } from './getNextOccurrenceOfDay.js'

  // Reset time components for date-only comparison
  previousDate.setHours(0, 0, 0, 0);
  minDateObj.setHours(0, 0, 0, 0);

  // If previous date is still valid (>= minDate), use it
  if (previousDate >= minDateObj) {
    return previousMoveInDate.split('T')[0];
  }

  // Date has passed - find next occurrence of same day-of-week
  const targetDayOfWeek = previousDate.getDay();
  const shiftedDate = getNextOccurrenceOfDay(minDateObj, targetDayOfWeek)

  return shiftedDate.toISOString().split('T')[0];
```

**Testing:**
- [ ] Verify pre-filled move-in date shifts correctly when proposal is old.
- [ ] Ensure time component normalization is preserved via the utility.

~~~~~

### CHUNK 7: Export New Utilities from Logic Core Index
**File:** app\src\logic\calculators\index.js
**Line:** 18
**Issue:** New utilities and moved functions need to be exposed via the central index.
**Affected Pages:** AUTO

**Current Code:**
```javascript
export { calculateCheckInOutDays } from './scheduling/calculateCheckInOutDays.js'
export { calculateNightsFromDays } from './scheduling/calculateNightsFromDays.js'
export { calculateNextAvailableCheckIn } from './scheduling/calculateNextAvailableCheckIn.js'
```

**Refactored Code:**
```javascript
export { calculateCheckInOutDays } from './scheduling/calculateCheckInOutDays.js'
export { calculateNightsFromDays } from './scheduling/calculateNightsFromDays.js'
export { calculateNextAvailableCheckIn } from './scheduling/calculateNextAvailableCheckIn.js'
export { isContiguousSelection } from './scheduling/isContiguousSelection.js'
export { getNextOccurrenceOfDay } from './scheduling/getNextOccurrenceOfDay.js'
export { shiftMoveInDateIfPast } from './scheduling/shiftMoveInDateIfPast.js'
```

**Testing:**
- [ ] Verify all exports are resolvable from `../../logic/index.js`.
