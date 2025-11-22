# Phase 1 Analysis Report: Current Architecture Assessment

**Date:** November 22, 2025
**Status:** Analysis Complete
**Next Phase:** Begin Implementation

---

## Executive Summary

Phase 1 analysis has identified **60+ functions** across **9 key files** that require migration to the Logic Core architecture. The analysis revealed significant violations of the "No Fallback" principle and identified areas where business logic is tightly coupled with infrastructure code.

### High-Level Statistics:
- **Total Functions Analyzed:** 60+
- **Calculators to Create:** 8 files
- **Rules to Create:** 9 files
- **Processors to Create:** 8 files
- **Workflows to Create:** 6 files
- **Fallback Violations Found:** 15+
- **Code Duplication Issues:** 2 critical (contiguous validation, pricing)

---

## Detailed File Analysis

### 1. priceCalculations.js
**Location:** `app/src/lib/priceCalculations.js`
**Lines of Code:** 145
**Priority:** HIGH - Core business logic for pricing

#### Functions Identified:

| Function | Type | Target Location | Fallback Issues |
|----------|------|----------------|-----------------|
| `calculate4WeekRent()` | CALCULATOR | `logic/calculators/pricing/calculateFourWeekRent.js` | ❌ Returns `0` fallback |
| `calculateReservationTotal()` | CALCULATOR | `logic/calculators/pricing/calculateReservationTotal.js` | ❌ Returns `0` fallback |
| `getNightlyPriceForNights()` | CALCULATOR | `logic/calculators/pricing/getNightlyRateByFrequency.js` | ❌ Returns `null` fallback |
| `calculatePricingBreakdown()` | CALCULATOR | `logic/calculators/pricing/calculatePricingBreakdown.js` | ❌ Multiple `|| 0` patterns |
| `isValidForPricing()` | RULE | `logic/rules/pricing/isValidDayCountForPricing.js` | ✅ No fallback |
| `formatPrice()` | KEEP IN LIB | Infrastructure (formatting utility) | N/A |
| `getPriceDisplayMessage()` | KEEP IN LIB | UI concern | N/A |

#### Refactoring Strategy:
1. Extract all calculation functions to `logic/calculators/pricing/`
2. Convert positional parameters to named parameters
3. Add strict type checking with descriptive errors
4. Remove all `|| 0` fallback patterns
5. Add comprehensive JSDoc with `@intent` tags

#### Example Migration:
```javascript
// BEFORE (lib/priceCalculations.js):
export function calculate4WeekRent(nightlyPrice, nightsPerWeek) {
  if (!nightlyPrice || !nightsPerWeek) return 0; // ❌ Fallback
  return nightlyPrice * nightsPerWeek * 4;
}

// AFTER (logic/calculators/pricing/calculateFourWeekRent.js):
/**
 * Calculates the baseline rent for a standard 4-week period.
 * @intent Determine the recurring monthly cost basis before fees.
 * @param {object} params - Named parameters for clarity.
 * @param {number} params.nightlyRate - The base cost per night in USD.
 * @param {number} params.frequency - The number of nights per week (2-7).
 * @returns {number} The total rent for a 4-week cycle.
 * @throws {Error} If nightlyRate or frequency is invalid.
 */
export function calculateFourWeekRent({ nightlyRate, frequency }) {
  if (typeof nightlyRate !== 'number' || isNaN(nightlyRate)) {
    throw new Error('calculateFourWeekRent: nightlyRate must be a valid number')
  }
  if (typeof frequency !== 'number' || isNaN(frequency)) {
    throw new Error('calculateFourWeekRent: frequency must be a valid number')
  }
  if (frequency < 2 || frequency > 7) {
    throw new Error('calculateFourWeekRent: frequency must be between 2-7 nights')
  }
  return nightlyRate * frequency * 4
}
```

---

### 2. availabilityValidation.js
**Location:** `app/src/lib/availabilityValidation.js`
**Lines of Code:** 345
**Priority:** CRITICAL - Core validation logic

#### Functions Identified:

| Function | Type | Target Location | Status |
|----------|------|----------------|--------|
| `isContiguousSelection()` | RULE | `logic/rules/scheduling/isScheduleContiguous.js` | ⚠️ DUPLICATE (also in validators.js) |
| `calculateCheckInOutDays()` | CALCULATOR | `logic/calculators/scheduling/calculateCheckInOutDays.js` | ✅ Ready to migrate |
| `validateScheduleSelection()` | WORKFLOW | `logic/workflows/scheduling/validateScheduleWorkflow.js` | ⚠️ Contains UI messages |
| `isDateBlocked()` | RULE | `logic/rules/scheduling/isDateBlocked.js` | ✅ Ready to migrate |
| `isDateInRange()` | RULE | `logic/rules/scheduling/isDateInRange.js` | ✅ Ready to migrate |
| `validateMoveInDate()` | WORKFLOW | `logic/workflows/scheduling/validateMoveInDateWorkflow.js` | ⚠️ Contains UI messages |
| `getBlockedDatesList()` | KEEP IN LIB | Formatting utility | N/A |
| `calculateNightsFromDays()` | CALCULATOR | `logic/calculators/scheduling/calculateNightsFromDays.js` | ✅ Ready to migrate |

#### Critical Issue - Code Duplication:
The `isContiguousSelection()` function appears in **TWO** locations:
1. `availabilityValidation.js` (lines 26-77)
2. `scheduleSelector/validators.js` (lines 74-122)

Both implementations are nearly identical (52 lines of complex wrap-around logic).

**Resolution:** Create single source of truth in `logic/rules/scheduling/isScheduleContiguous.js`

---

### 3. listingDataFetcher.js
**Location:** `app/src/lib/listingDataFetcher.js`
**Lines of Code:** 461
**Priority:** CRITICAL - Violates "No Fallback" + Single Responsibility

#### Split Strategy:

**KEEP IN LIB (Infrastructure):**
- `fetchListingComplete()` - Renamed to `fetchRawListingData()`
- `getListingIdFromUrl()` - URL parsing
- `fetchZatPriceConfiguration()` - API call
- `getNightlyPrice()` - Move to CALCULATOR

**MOVE TO LOGIC (Processors):**
- `parseJsonField()` → `logic/processors/listing/parseJsonArrayField.js`
- Data transformation logic (lines 157-327) → `logic/processors/listing/processListingData.js`

#### Fallback Violations:
```javascript
// ❌ CURRENT (line 32):
function parseJsonField(field) {
  if (!field) return []; // Silent fallback
  if (Array.isArray(field)) return field;
  // ...
  return []; // Multiple fallback points
}

// ✅ TARGET:
export function parseJsonArrayField({ field, fieldName }) {
  if (field === null || field === undefined) {
    throw new Error(`parseJsonArrayField: ${fieldName} is null or undefined`)
  }
  if (Array.isArray(field)) return field
  if (typeof field === 'string') {
    try {
      const parsed = JSON.parse(field)
      if (!Array.isArray(parsed)) {
        throw new Error(`parseJsonArrayField: ${fieldName} did not parse to array`)
      }
      return parsed
    } catch (e) {
      throw new Error(`parseJsonArrayField: Failed to parse ${fieldName} - ${e.message}`)
    }
  }
  throw new Error(`parseJsonArrayField: ${fieldName} has unexpected type ${typeof field}`)
}
```

---

### 4. auth.js
**Location:** `app/src/lib/auth.js`
**Lines of Code:** 781
**Priority:** MEDIUM - Mix of workflows and infrastructure

#### Split Strategy:

**KEEP IN LIB (API Calls - Infrastructure):**
- `loginUser()` - Bubble API call
- `signupUser()` - Bubble API call
- `logoutUser()` - Bubble API call
- `getUsernameFromCookies()` - Cookie parsing
- `checkSplitLeaseCookies()` - Cookie parsing
- All token getter/setter functions (delegate to secureStorage)

**MOVE TO LOGIC (Workflows & Rules):**
- `checkAuthStatus()` → `logic/workflows/auth/checkAuthStatusWorkflow.js`
- `isSessionValid()` → `logic/rules/auth/isSessionValid.js`
- `isProtectedPage()` → `logic/rules/auth/isProtectedPage.js`
- `validateTokenAndFetchUser()` → `logic/workflows/auth/validateTokenWorkflow.js`

---

### 5. dayUtils.js
**Location:** `app/src/lib/dayUtils.js`
**Lines of Code:** 111
**Priority:** HIGH - Bubble API adapter (Anti-Corruption Layer)

#### All Functions Move to Processors:

| Function | Target | Purpose |
|----------|--------|---------|
| `toBubbleDays()` | `logic/processors/external/adaptDaysToBubble.js` | Convert 0-based → 1-based |
| `fromBubbleDays()` | `logic/processors/external/adaptDaysFromBubble.js` | Convert 1-based → 0-based |
| `dayToBubble()` | `logic/processors/external/adaptDayToBubble.js` | Single day conversion |
| `dayFromBubble()` | `logic/processors/external/adaptDayFromBubble.js` | Single day conversion |
| `isValidDaysArray()` | `logic/rules/scheduling/isValidDaysArray.js` | Validation rule |
| `isValidBubbleDaysArray()` | `logic/rules/scheduling/isValidBubbleDaysArray.js` | Validation rule |

#### Note:
These are **Anti-Corruption Layer** functions that protect the application from Bubble's 1-based indexing. Critical for maintaining data integrity.

---

### 6. proposalDataFetcher.js
**Location:** `app/src/lib/proposalDataFetcher.js`
**Lines of Code:** 243
**Priority:** MEDIUM

#### Split Strategy:

**KEEP IN LIB:**
- `getUserIdFromUrl()` - URL parsing
- `fetchUserById()` - Raw data fetching
- `fetchProposalsByGuest()` - Raw data fetching

**MOVE TO LOGIC:**
- `loadProposalDetails()` → Split into processor `logic/processors/proposal/processProposalData.js`

---

### 7. scheduleSelector/dayHelpers.js
**Location:** `app/src/lib/scheduleSelector/dayHelpers.js`
**Lines of Code:** 144
**Priority:** MEDIUM

#### Split Strategy:

**KEEP IN LIB (Factory Functions):**
- `createDay()` - Object factory
- `createNight()` - Object factory
- `createAllDays()` - Object factory
- `createNightsFromDays()` - Object factory
- `sortDays()` - Utility function
- `DAY_NAMES`, `DAY_LETTERS`, `DAY_ABBREV` - Constants

**MOVE TO LOGIC (Calculators):**
- `getNextDay()` → `logic/calculators/scheduling/getNextDay.js`
- `getPreviousDay()` → `logic/calculators/scheduling/getPreviousDay.js`

**MOVE TO LOGIC (Rules):**
- `isDayInRange()` → `logic/rules/scheduling/isDayInRange.js`

---

### 8. scheduleSelector/validators.js
**Location:** `app/src/lib/scheduleSelector/validators.js`
**Lines of Code:** 156
**Priority:** HIGH

#### All Functions Move to Logic:

| Function | Type | Target |
|----------|------|--------|
| `validateDaySelection()` | WORKFLOW | `logic/workflows/scheduling/validateDaySelectionWorkflow.js` |
| `validateDayRemoval()` | WORKFLOW | `logic/workflows/scheduling/validateDayRemovalWorkflow.js` |
| `isContiguous()` | RULE | `logic/rules/scheduling/isScheduleContiguous.js` (DUPLICATE) |
| `validateSchedule()` | WORKFLOW | `logic/workflows/scheduling/validateScheduleWorkflow.js` |

---

### 9. scheduleSelector/priceCalculations.js
**Location:** `app/src/lib/scheduleSelector/priceCalculations.js`
**Lines of Code:** 379
**Priority:** HIGH - Complex pricing engine

#### Analysis:
This file contains a **complete alternative pricing implementation** that handles:
- Monthly rental calculations
- Weekly rental calculations
- Nightly rental calculations
- Complex multiplier and discount logic
- ZAT configuration integration

**Question to Resolve:** Is this the active pricing engine, or is `lib/priceCalculations.js` active?

**Migration Strategy:**
If this is active, migrate entire engine to `logic/calculators/pricing/` as a comprehensive pricing module.

---

## Summary: Migration Scope

### By Pillar:

#### CALCULATORS (8 files to create):
1. `pricing/calculateFourWeekRent.js`
2. `pricing/calculateReservationTotal.js`
3. `pricing/getNightlyRateByFrequency.js`
4. `pricing/calculatePricingBreakdown.js`
5. `scheduling/calculateCheckInOutDays.js`
6. `scheduling/calculateNightsFromDays.js`
7. `scheduling/getNextDay.js`
8. `scheduling/getPreviousDay.js`

#### RULES (9 files to create):
1. `scheduling/isScheduleContiguous.js` ⚠️ Consolidate duplicates
2. `scheduling/isDateBlocked.js`
3. `scheduling/isDateInRange.js`
4. `scheduling/isDayInRange.js`
5. `scheduling/isValidDaysArray.js`
6. `scheduling/isValidBubbleDaysArray.js`
7. `pricing/isValidDayCountForPricing.js`
8. `auth/isSessionValid.js`
9. `auth/isProtectedPage.js`

#### PROCESSORS (8 files to create):
1. `listing/processListingData.js` ⚠️ Complex, 200+ lines
2. `listing/parseJsonArrayField.js` ⚠️ Critical for data integrity
3. `proposal/processProposalData.js`
4. `user/processUserData.js`
5. `external/adaptDaysToBubble.js`
6. `external/adaptDaysFromBubble.js`
7. `external/adaptDayToBubble.js`
8. `external/adaptDayFromBubble.js`

#### WORKFLOWS (6 files to create):
1. `scheduling/validateScheduleWorkflow.js`
2. `scheduling/validateDaySelectionWorkflow.js`
3. `scheduling/validateDayRemovalWorkflow.js`
4. `scheduling/validateMoveInDateWorkflow.js`
5. `auth/checkAuthStatusWorkflow.js`
6. `auth/validateTokenWorkflow.js`

---

## Critical Issues to Address

### 1. Code Duplication - Contiguous Validation
**Impact:** HIGH
**Issue:** Same 52-line function exists in 2 files
**Resolution:** Create single source in `logic/rules/scheduling/isScheduleContiguous.js`

### 2. Pricing Logic Ambiguity
**Impact:** HIGH
**Issue:** Two separate pricing implementations exist
**Resolution:** Determine which is active, migrate the correct one

### 3. Fallback Violations
**Impact:** CRITICAL
**Count:** 15+ violations found
**Resolution:** All violations must be removed during migration

### 4. Mixed Concerns
**Impact:** MEDIUM
**Issue:** Fetching + Processing in same files
**Resolution:** Split into separate lib (fetch) and logic (process) files

---

## Next Steps: Phase 2 Implementation

### Week 1: Foundation & Pricing
1. Create `app/src/logic/` directory structure
2. Migrate all pricing calculators
3. Write comprehensive unit tests
4. Update imports in components

### Week 2: Scheduling & Validation
1. Consolidate contiguous validation
2. Migrate all scheduling rules
3. Migrate scheduling calculators
4. Test wrap-around edge cases

### Week 3: Data Processors
1. Create `parseJsonArrayField.js` with strict validation
2. Create `processListingData.js` with No Fallback enforcement
3. Create user and proposal processors
4. Update all data fetchers

### Week 4: Workflows & External Adapters
1. Migrate auth workflows
2. Migrate scheduling workflows
3. Create Bubble.io adapters
4. Make React islands "hollow"

---

## Conclusion

Phase 1 analysis is complete. The codebase is ready for Logic Core migration. All business logic has been mapped, fallback violations have been identified, and a clear migration path has been established.

**Ready to proceed to Phase 2: Implementation.**
