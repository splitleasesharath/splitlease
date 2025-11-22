# Comprehensive Refactoring Plan: Logic Core Framework Migration

**Project:** Split Lease Application
**Framework:** Logic Core Architecture (Calculators, Rules, Processors, Workflows)
**Date:** 2025-11-22
**Principle:** No Fallback Mechanisms - Build for Truth

---

## Executive Summary

This document provides a complete analysis of every file in the `app/src` directory that requires refactoring to align with the Logic Core Framework. The framework separates business logic into four distinct pillars:

1. **Calculators** (`src/logic/calculators/`) - Pure math & quantifiable logic
2. **Rules** (`src/logic/rules/`) - Business predicates (boolean logic)
3. **Processors** (`src/logic/processors/`) - Data transformation with "No Fallback" enforcement
4. **Workflows** (`src/logic/workflows/`) - State machines & orchestration

---

## Section 1: Current Business Logic Files (src/lib)

### 1.1 **priceCalculations.js** → CALCULATORS Pillar
**Current Location:** `app/src/lib/priceCalculations.js`
**Target Location:** `app/src/logic/calculators/pricing/`

**Business Logic to Extract:**

| Current Function | New Location | New Name | Pillar |
|-----------------|--------------|----------|--------|
| `calculate4WeekRent()` | `pricing/calculateFourWeekRent.js` | `calculateFourWeekRent()` | CALCULATOR |
| `calculateReservationTotal()` | `pricing/calculateReservationTotal.js` | `calculateReservationTotal()` | CALCULATOR |
| `getNightlyPriceForNights()` | `pricing/getNightlyRateByFrequency.js` | `getNightlyRateByFrequency()` | CALCULATOR |
| `calculatePricingBreakdown()` | `pricing/calculatePricingBreakdown.js` | `calculatePricingBreakdown()` | CALCULATOR |
| `isValidForPricing()` | Move to RULES | `rules/pricing/isValidDayCountForPricing.js` | RULE |
| `getPriceDisplayMessage()` | Keep in UI layer | Component concern | UI |
| `formatPrice()` | Keep in lib | Infrastructure (formatting utility) | LIB |

**Refactoring Notes:**
- Convert to named parameters: `({ nightlyRate, frequency })` instead of `(nightlyPrice, nightsPerWeek)`
- Add strict type checking: throw on NaN, null, or undefined
- Remove fallback `|| 0` patterns - throw descriptive errors instead
- Add JSDoc with `@intent` tags

**Priority:** HIGH - Used extensively in pricing calculations

---

### 1.2 **availabilityValidation.js** → RULES + CALCULATORS Pillars
**Current Location:** `app/src/lib/availabilityValidation.js`
**Target Locations:** `app/src/logic/rules/scheduling/` + `app/src/logic/calculators/scheduling/`

**Business Logic to Extract:**

| Current Function | New Location | New Name | Pillar |
|-----------------|--------------|----------|--------|
| `isContiguousSelection()` | `rules/scheduling/isScheduleContiguous.js` | `isScheduleContiguous()` | RULE |
| `calculateCheckInOutDays()` | `calculators/scheduling/calculateCheckInOutDays.js` | `calculateCheckInOutDays()` | CALCULATOR |
| `validateScheduleSelection()` | `workflows/scheduling/validateScheduleWorkflow.js` | `validateScheduleWorkflow()` | WORKFLOW |
| `isDateBlocked()` | `rules/scheduling/isDateBlocked.js` | `isDateBlocked()` | RULE |
| `isDateInRange()` | `rules/scheduling/isDateInRange.js` | `isDateInRange()` | RULE |
| `validateMoveInDate()` | `workflows/scheduling/validateMoveInDateWorkflow.js` | `validateMoveInDateWorkflow()` | WORKFLOW |
| `getBlockedDatesList()` | Keep in lib | Formatting utility | LIB |
| `calculateNightsFromDays()` | `calculators/scheduling/calculateNightsFromDays.js` | `calculateNightsFromDays()` | CALCULATOR |

**Refactoring Notes:**
- `isContiguousSelection()` is CRITICAL - handles week wrap-around logic
- Remove UI-specific error messages from rules (return boolean only)
- Workflows can compose rules and return rich validation objects
- Add strict parameter validation

**Priority:** HIGH - Core validation logic for booking system

---

### 1.3 **listingDataFetcher.js** → PROCESSORS Pillar
**Current Location:** `app/src/lib/listingDataFetcher.js`
**Target Location:** `app/src/logic/processors/listing/`

**Business Logic to Extract:**

| Current Function | New Location | New Name | Pillar |
|-----------------|--------------|----------|--------|
| `parseJsonField()` | `processors/listing/parseJsonField.js` | `parseJsonArrayField()` | PROCESSOR |
| `fetchListingComplete()` | SPLIT: Keep fetcher in lib, move transform to processor | `processListingData()` | PROCESSOR |
| `getListingIdFromUrl()` | Keep in lib | URL parsing is infrastructure | LIB |
| `getNightlyPrice()` | Move to CALCULATORS | `calculators/pricing/getNightlyRateByFrequency.js` | CALCULATOR |
| `fetchZatPriceConfiguration()` | Keep in lib | Infrastructure (data fetching) | LIB |

**Refactoring Pattern:**
```javascript
// OLD: fetchListingComplete() does both fetching AND transforming
export async function fetchListingComplete(listingId) {
  const { data } = await supabase.from('listing').select('*')...
  // Transform data inline
  return { ...data, resolvedNeighborhood, ... }
}

// NEW: Split into fetcher (lib) and processor (logic)
// lib/listingDataFetcher.js - Infrastructure
export async function fetchRawListingData(listingId) {
  const { data, error } = await supabase.from('listing').select('*')...
  if (error) throw error
  if (!data) throw new Error('Listing not found')
  return data
}

// logic/processors/listing/processListingData.js - Domain Logic
export function processListingData({ rawListing, photos, host }) {
  // No Fallback: Strict validation
  if (!rawListing) throw new Error('Listing data is missing')
  if (!rawListing._id) throw new Error('Listing missing critical ID')

  return {
    id: rawListing._id,
    title: assertNotEmpty(rawListing.Name, 'Listing Name'),
    // ... transform with strict validation
  }
}
```

**Refactoring Notes:**
- **CRITICAL:** `parseJsonField()` must be extracted as a reusable processor
- Fetcher stays in `lib` (infrastructure), processor goes to `logic`
- Processor must enforce "No Fallback" - throw on missing critical fields
- Coordinate transformation (lat/lng offset) is a CALCULATOR function

**Priority:** CRITICAL - Core data integrity layer

---

### 1.4 **proposalDataFetcher.js** → PROCESSORS Pillar
**Current Location:** `app/src/lib/proposalDataFetcher.js`
**Target Location:** `app/src/logic/processors/proposal/` + `app/src/logic/processors/user/`

**Business Logic to Extract:**

| Current Function | New Location | New Name | Pillar |
|-----------------|--------------|----------|--------|
| `getUserIdFromUrl()` | Keep in lib | URL parsing is infrastructure | LIB |
| `fetchUserById()` | Keep in lib | Data fetching is infrastructure | LIB |
| `fetchProposalsByGuest()` | Keep in lib | Data fetching is infrastructure | LIB |
| `loadProposalDetails()` | SPLIT: Keep fetcher, move enrichment to processor | `processProposalData()` | PROCESSOR |

**Refactoring Pattern:**
```javascript
// NEW: Processor validates and normalizes proposal data
// logic/processors/proposal/processProposalData.js
export function processProposalData({ rawProposal, listing, guest, host }) {
  if (!rawProposal) throw new Error('Proposal data is missing')
  if (!rawProposal._id) throw new Error('Proposal missing critical ID')

  // Determine current stage (1-6) based on status fields
  const stage = determineProposalStage(rawProposal) // <- RULE function

  // Merge original vs counteroffer terms into single "current terms"
  const currentTerms = mergeProposalTerms(rawProposal) // <- CALCULATOR

  return {
    id: rawProposal._id,
    stage,
    currentTerms,
    listing: processListingData({ rawListing: listing }),
    guest: processUserData({ rawUser: guest }),
    host: processUserData({ rawUser: host })
  }
}
```

**Priority:** MEDIUM - Needed for GuestProposalsPage refactoring

---

### 1.5 **auth.js** → WORKFLOWS + RULES Pillars
**Current Location:** `app/src/lib/auth.js`
**Target Locations:** `app/src/logic/workflows/auth/` + `app/src/logic/rules/auth/`

**Business Logic to Extract:**

| Current Function | New Location | New Name | Pillar |
|-----------------|--------------|----------|--------|
| `checkAuthStatus()` | `workflows/auth/checkAuthStatusWorkflow.js` | `checkAuthStatusWorkflow()` | WORKFLOW |
| `isSessionValid()` | `rules/auth/isSessionValid.js` | `isSessionValid()` | RULE |
| `validateTokenAndFetchUser()` | `workflows/auth/validateTokenWorkflow.js` | `validateTokenWorkflow()` | WORKFLOW |
| `isProtectedPage()` | `rules/auth/isProtectedPage.js` | `isProtectedPage()` | RULE |
| `getUsernameFromCookies()` | Keep in lib | Cookie parsing is infrastructure | LIB |
| `checkSplitLeaseCookies()` | Keep in lib | Cookie parsing is infrastructure | LIB |
| `loginUser()` | Keep in lib | API call is infrastructure | LIB |
| `signupUser()` | Keep in lib | API call is infrastructure | LIB |
| `logoutUser()` | Keep in lib | API call is infrastructure | LIB |

**Refactoring Notes:**
- Workflows orchestrate the multi-step auth checks
- Rules provide boolean decisions (is valid, is protected)
- Infrastructure (lib) handles actual API calls and storage
- Token management functions stay in lib (secureStorage.js)

**Priority:** MEDIUM - Auth is working, refactor for clarity

---

### 1.6 **dayUtils.js** → PROCESSORS Pillar
**Current Location:** `app/src/lib/dayUtils.js`
**Target Location:** `app/src/logic/processors/external/bubbleAdapter.js`

**Business Logic to Extract:**

| Current Function | New Location | New Name | Pillar |
|-----------------|--------------|----------|--------|
| `toBubbleDays()` | `processors/external/adaptDaysToBubble.js` | `adaptDaysToBubble()` | PROCESSOR |
| `fromBubbleDays()` | `processors/external/adaptDaysFromBubble.js` | `adaptDaysFromBubble()` | PROCESSOR |
| `dayToBubble()` | `processors/external/adaptDayToBubble.js` | `adaptDayToBubble()` | PROCESSOR |
| `dayFromBubble()` | `processors/external/adaptDayFromBubble.js` | `adaptDayFromBubble()` | PROCESSOR |
| `isValidDaysArray()` | `rules/scheduling/isValidDaysArray.js` | `isValidDaysArray()` | RULE |
| `isValidBubbleDaysArray()` | `rules/scheduling/isValidBubbleDaysArray.js` | `isValidBubbleDaysArray()` | RULE |

**Refactoring Notes:**
- These are **Anti-Corruption Layer (ACL)** functions for Bubble.io API
- They convert between 0-based (JS) and 1-based (Bubble) indexing
- Should be in `processors/external/` as they transform external data
- Add strict validation - throw on invalid input

**Priority:** MEDIUM - Required for Bubble API integration

---

### 1.7 **dataLookups.js** → INFRASTRUCTURE (Keep in lib)
**Current Location:** `app/src/lib/dataLookups.js`
**Status:** KEEP IN LIB - This is infrastructure code

**Reasoning:**
- Provides cached lookups for database IDs → human-readable names
- This is a **data access layer**, not business logic
- Acts as a performance optimization (caching)
- No business rules or calculations - just ID resolution

**No Changes Required** - This stays in `lib` as infrastructure

---

### 1.8 **scheduleSelector/** Directory → RULES + CALCULATORS
**Current Location:** `app/src/lib/scheduleSelector/`
**Target Locations:** Various under `app/src/logic/`

#### 1.8.1 **dayHelpers.js**
| Current Function | New Location | Pillar |
|-----------------|--------------|--------|
| `createDay()` | Keep in lib (factory function) | LIB |
| `sortDays()` | Keep in lib (utility) | LIB |
| `getNextDay()` | `calculators/scheduling/getNextDay.js` | CALCULATOR |
| `getPreviousDay()` | `calculators/scheduling/getPreviousDay.js` | CALCULATOR |
| `createNight()` | Keep in lib (factory function) | LIB |
| `isDayInRange()` | `rules/scheduling/isDayInRange.js` | RULE |

#### 1.8.2 **validators.js**
| Current Function | New Location | Pillar |
|-----------------|--------------|--------|
| `validateDaySelection()` | `workflows/scheduling/validateDaySelectionWorkflow.js` | WORKFLOW |
| `validateDayRemoval()` | `workflows/scheduling/validateDayRemovalWorkflow.js` | WORKFLOW |
| `isContiguous()` | `rules/scheduling/isScheduleContiguous.js` | RULE (duplicate) |
| `validateSchedule()` | `workflows/scheduling/validateScheduleWorkflow.js` | WORKFLOW |

**Priority:** HIGH - Core scheduling logic

---

## Section 2: React Islands/Components to Refactor

### 2.1 **ListingScheduleSelector.jsx** → Make "Hollow"
**Current Location:** `app/src/islands/shared/ListingScheduleSelector.jsx`
**Current Status:** "Smart Component" with embedded logic
**Target Status:** "Hollow Island" - presentation only

**Logic to Extract:**
- Price calculation logic → Use `calculators/pricing/` functions
- Validation logic → Use `rules/scheduling/` functions
- Schedule state management → Move to parent or custom hook

**Refactoring Pattern:**
```jsx
// BEFORE: Smart component with logic
export default function ListingScheduleSelector({ listing }) {
  const [selectedDays, setSelectedDays] = useState([])

  // LOGIC IN COMPONENT ❌
  const price = calculate4WeekRent(listing.price, selectedDays.length)
  const isValid = isContiguousSelection(selectedDays)

  return <div>{/* render */}</div>
}

// AFTER: Hollow component receiving props
export default function ListingScheduleSelector({
  daysGrid,          // Pre-processed day objects
  priceBreakdown,    // Pre-calculated pricing
  validationError,   // Error string or null
  onDayToggle        // Callback to parent
}) {
  return (
    <div className="selector-container">
      {daysGrid.map(day => (
        <DayButton day={day} onClick={() => onDayToggle(day.id)} />
      ))}
      {validationError && <div className="error">{validationError}</div>}
      <PriceDisplay breakdown={priceBreakdown} />
    </div>
  )
}
```

**Hook Pattern (Optional):**
```javascript
// islands/shared/useScheduleSelectorLogic.js
import { calculatePricingBreakdown } from '../../../logic/calculators/pricing/calculatePricingBreakdown.js'
import { isScheduleContiguous } from '../../../logic/rules/scheduling/isScheduleContiguous.js'

export function useScheduleSelectorLogic(listing) {
  const [selectedDays, setSelectedDays] = useState([])

  const priceBreakdown = calculatePricingBreakdown({
    listing,
    selectedDays: selectedDays.length,
    // ...
  })

  const isValid = isScheduleContiguous({ selectedDayIndices: selectedDays })

  return { selectedDays, priceBreakdown, isValid, setSelectedDays }
}
```

**Priority:** HIGH - Core user interaction component

---

### 2.2 **EditProposalModal.jsx** → Make "Hollow"
**Current Location:** `app/src/islands/modals/EditProposalModal.jsx`
**Logic to Extract:** Proposal editing logic, price recalculation

**Priority:** MEDIUM

---

### 2.3 **CreateProposalFlowV2.jsx** → Refactor to Workflow
**Current Location:** `app/src/islands/shared/CreateProposalFlowV2.jsx`
**Target:** Extract to `workflows/booking/createProposalWorkflow.js`

**Priority:** HIGH - Complex multi-step flow

---

### 2.4 **GuestProposalsPage.jsx** → Make "Hollow"
**Current Location:** `app/src/islands/pages/GuestProposalsPage.jsx`
**Logic to Extract:**
- Proposal stage determination (1-6) → `rules/proposals/determineProposalStage.js`
- Original vs Counteroffer terms merging → `processors/proposal/mergeProposalTerms.js`

**Priority:** MEDIUM

---

### 2.5 **ViewSplitLeasePage.jsx** → Make "Hollow"
**Current Location:** `app/src/islands/pages/ViewSplitLeasePage.jsx`
**Logic to Extract:**
- Use `processors/listing/processListingData.js` for data transformation
- Remove defensive `if (listing && listing.price)` checks (processor guarantees validity)

**Priority:** HIGH

---

## Section 3: New Logic Core Directory Structure

```
app/src/logic/
├── calculators/
│   ├── pricing/
│   │   ├── calculateFourWeekRent.js
│   │   ├── calculateReservationTotal.js
│   │   ├── getNightlyRateByFrequency.js
│   │   ├── calculatePricingBreakdown.js
│   │   └── calculateProratedFees.js
│   ├── scheduling/
│   │   ├── calculateCheckInOutDays.js
│   │   ├── calculateNightsFromDays.js
│   │   ├── getNextDay.js
│   │   ├── getPreviousDay.js
│   │   └── calculateWeekSpan.js
│   └── geo/
│       ├── calculateCoordinateOffset.js
│       └── calculateDistance.js
│
├── rules/
│   ├── proposals/
│   │   ├── canEditProposal.js
│   │   ├── canAcceptProposal.js
│   │   └── isProposalExpired.js
│   ├── scheduling/
│   │   ├── isScheduleContiguous.js
│   │   ├── isDateBlocked.js
│   │   ├── isDateInRange.js
│   │   ├── isDayInRange.js
│   │   ├── isValidDaysArray.js
│   │   └── isValidBubbleDaysArray.js
│   ├── users/
│   │   ├── isHost.js
│   │   ├── isGuest.js
│   │   └── canMessageHost.js
│   ├── auth/
│   │   ├── isSessionValid.js
│   │   ├── isProtectedPage.js
│   │   └── isTokenExpired.js
│   └── pricing/
│       └── isValidDayCountForPricing.js
│
├── processors/
│   ├── listing/
│   │   ├── processListingData.js
│   │   ├── parseJsonArrayField.js
│   │   └── normalizePhotos.js
│   ├── user/
│   │   ├── processUserData.js
│   │   └── normalizeProfilePhoto.js
│   ├── proposal/
│   │   ├── processProposalData.js
│   │   ├── mergeProposalTerms.js
│   │   └── determineProposalStage.js (could be RULE)
│   └── external/
│       ├── adaptDaysToBubble.js
│       ├── adaptDaysFromBubble.js
│       ├── adaptDayToBubble.js
│       └── adaptDayFromBubble.js
│
└── workflows/
    ├── booking/
    │   ├── createProposalWorkflow.js
    │   ├── editProposalWorkflow.js
    │   └── acceptProposalWorkflow.js
    ├── auth/
    │   ├── checkAuthStatusWorkflow.js
    │   ├── validateTokenWorkflow.js
    │   └── logoutWorkflow.js
    ├── messaging/
    │   └── sendMessageWorkflow.js
    └── scheduling/
        ├── validateScheduleWorkflow.js
        ├── validateDaySelectionWorkflow.js
        ├── validateDayRemovalWorkflow.js
        └── validateMoveInDateWorkflow.js
```

---

## Section 4: Migration Phases

### Phase 1: Foundation (Week 1)
**Goal:** Establish Logic Core structure and migrate pricing

**Tasks:**
1. Create directory structure: `app/src/logic/{calculators,rules,processors,workflows}`
2. Migrate pricing calculators (HIGH PRIORITY)
   - `calculateFourWeekRent.js`
   - `calculateReservationTotal.js`
   - `getNightlyRateByFrequency.js`
   - `calculatePricingBreakdown.js`
3. Update `ListingScheduleSelector.jsx` to use new calculators
4. Run tests to verify pricing accuracy

**Success Criteria:** All pricing functions work identically to before

---

### Phase 2: Scheduling Rules (Week 2)
**Goal:** Extract and test critical scheduling validation

**Tasks:**
1. Migrate scheduling rules
   - `isScheduleContiguous.js` (CRITICAL)
   - `isDateBlocked.js`
   - `isDateInRange.js`
2. Migrate scheduling calculators
   - `calculateCheckInOutDays.js`
   - `calculateNightsFromDays.js`
3. Create scheduling workflows
   - `validateScheduleWorkflow.js`
4. Update components using these rules

**Success Criteria:** All contiguous day validation works correctly, including wrap-around cases

---

### Phase 3: Data Processors (Week 3)
**Goal:** Enforce "No Fallback" on data layer

**Tasks:**
1. Create listing processor
   - `processListingData.js` with strict validation
   - `parseJsonArrayField.js`
2. Create user processor
   - `processUserData.js`
3. Create proposal processor
   - `processProposalData.js`
   - `mergeProposalTerms.js`
4. Split fetchers from processors in existing code
5. Update pages to use processors

**Success Criteria:** All data entering UI is validated, no `if (data && data.field)` checks in components

---

### Phase 4: Workflows & Islands (Week 4)
**Goal:** Make Islands "hollow" and extract workflows

**Tasks:**
1. Extract auth workflows
   - `checkAuthStatusWorkflow.js`
   - `validateTokenWorkflow.js`
2. Extract booking workflows
   - `createProposalWorkflow.js`
3. Refactor major islands
   - `ListingScheduleSelector.jsx` → Hollow
   - `GuestProposalsPage.jsx` → Hollow
   - `ViewSplitLeasePage.jsx` → Hollow
4. Create logic hooks for state management

**Success Criteria:** Components only handle rendering and user interaction

---

### Phase 5: External Adapters (Week 5)
**Goal:** Isolate Bubble.io integration

**Tasks:**
1. Create external processors
   - `adaptDaysToBubble.js`
   - `adaptDaysFromBubble.js`
2. Move day conversion logic from `dayUtils.js`
3. Add strict validation for Bubble API inputs/outputs

**Success Criteria:** All Bubble API interactions go through adapters

---

## Section 5: Testing Strategy

### Unit Tests (Logic Core - 100% Coverage Goal)

```javascript
// tests/logic/calculators/pricing/calculateFourWeekRent.test.js
import { calculateFourWeekRent } from '../../../../src/logic/calculators/pricing/calculateFourWeekRent.js'

describe('calculateFourWeekRent', () => {
  it('calculates correctly for 4 nights/week', () => {
    const result = calculateFourWeekRent({ nightlyRate: 100, frequency: 4 })
    expect(result).toBe(1600) // 100 * 4 * 4
  })

  it('throws on invalid nightlyRate', () => {
    expect(() => {
      calculateFourWeekRent({ nightlyRate: null, frequency: 4 })
    }).toThrow('calculateFourWeekRent expects numeric inputs')
  })

  it('throws on NaN', () => {
    expect(() => {
      calculateFourWeekRent({ nightlyRate: NaN, frequency: 4 })
    }).toThrow()
  })
})
```

### Integration Tests (Processors)

```javascript
// tests/logic/processors/listing/processListingData.test.js
describe('processListingData - No Fallback Enforcement', () => {
  it('throws when listing data is missing', () => {
    expect(() => {
      processListingData({ rawListing: null })
    }).toThrow('Listing data is missing')
  })

  it('throws when critical ID is missing', () => {
    expect(() => {
      processListingData({ rawListing: { Name: 'Test' } })
    }).toThrow('Listing missing critical ID')
  })

  it('processes valid listing data', () => {
    const raw = {
      _id: '123x456',
      Name: 'Test Listing',
      '💰Nightly Host Rate for 4 nights': 100
    }

    const result = processListingData({ rawListing: raw })
    expect(result.id).toBe('123x456')
    expect(result.title).toBe('Test Listing')
  })
})
```

---

## Section 6: ESLint Enforcement Rules

Create `.eslintrc.logic.json` for `src/logic/` directory:

```json
{
  "rules": {
    "no-restricted-imports": ["error", {
      "patterns": [
        "../islands/*",
        "../components/*",
        "react",
        "react-dom"
      ],
      "message": "Logic Core must not import UI framework code"
    }]
  }
}
```

---

## Section 7: File-by-File Checklist

### Files to Refactor (Priority Order)

#### HIGH Priority (Core Logic - Week 1-2)
- [ ] `priceCalculations.js` → Extract to `calculators/pricing/`
- [ ] `availabilityValidation.js` → Extract to `rules/scheduling/` + `calculators/scheduling/`
- [ ] `listingDataFetcher.js` → Split fetcher (lib) + processor (logic)
- [ ] `ListingScheduleSelector.jsx` → Make hollow
- [ ] `useScheduleSelector.js` → Refactor to use Logic Core
- [ ] `ViewSplitLeasePage.jsx` → Make hollow

#### MEDIUM Priority (Data & Workflows - Week 3-4)
- [ ] `proposalDataFetcher.js` → Split fetcher + processor
- [ ] `auth.js` → Extract workflows and rules
- [ ] `dayUtils.js` → Move to `processors/external/`
- [ ] `scheduleSelector/validators.js` → Extract to workflows
- [ ] `scheduleSelector/dayHelpers.js` → Extract calculators
- [ ] `CreateProposalFlowV2.jsx` → Extract workflow
- [ ] `GuestProposalsPage.jsx` → Make hollow
- [ ] `EditProposalModal.jsx` → Make hollow

#### LOW Priority (Polish - Week 5)
- [ ] `CompareTermsModal.jsx` → Make hollow
- [ ] `ProposalDetailsModal.jsx` → Make hollow
- [ ] All remaining islands → Audit for logic

### Files to Keep in Lib (Infrastructure)
- ✅ `supabase.js` - Database client configuration
- ✅ `config.js` - Environment configuration
- ✅ `constants.js` - Static constants
- ✅ `dataLookups.js` - Database ID resolution cache
- ✅ `sanitize.js` - Input sanitization utilities
- ✅ `secureStorage.js` - Storage encryption utilities
- ✅ `bubbleAPI.js` - API client (infrastructure)
- ✅ `hotjar.js` - Analytics integration
- ✅ `mapUtils.js` - Google Maps utilities
- ✅ `urlParams.js` - URL parsing utilities

---

## Section 8: Success Metrics

### Code Quality Metrics
- **Logic Core Test Coverage:** 100% unit test coverage on all calculators, rules, processors
- **No Fallback Violations:** 0 instances of `|| []`, `|| {}`, silent try-catch in Logic Core
- **ESLint Pass Rate:** 100% compliance with architectural boundaries
- **Component Complexity:** Average function length in islands < 20 lines

### Architectural Metrics
- **Logic Location:** 100% of business logic in `src/logic/`, 0% in islands
- **Function Purity:** 100% of calculators are pure functions (same input = same output)
- **Named Exports:** 100% of Logic Core uses named exports (no default exports)
- **Intent Documentation:** 100% of exported functions have JSDoc with `@intent` tag

### Performance Metrics
- **Build Time:** No regression (target: < 5 seconds)
- **Bundle Size:** No significant increase (monitor tree-shaking)
- **Runtime Performance:** No regression on critical paths (pricing, validation)

---

## Section 9: Risk Mitigation

### High Risk Areas
1. **Pricing Calculations** - Any error breaks core value prop
   - Mitigation: Extensive unit tests, parallel run during migration

2. **Contiguous Day Validation** - Complex wrap-around logic
   - Mitigation: Test all edge cases (Fri-Sat-Sun, Sat-Sun-Mon-Tue)

3. **Data Processors** - "No Fallback" could break UI if too strict
   - Mitigation: Gradual rollout, comprehensive error messages

### Rollback Plan
- Keep original `src/lib` files until all tests pass
- Use feature flags for Logic Core adoption per component
- Maintain parallel implementations during transition

---

## Appendix A: Naming Conventions

### Intent-Based Function Names

| Type | Pattern | Example |
|------|---------|---------|
| Calculator | `calculate{Result}` | `calculateFourWeekRent()` |
| Calculator | `compute{Result}` | `computeProratedFees()` |
| Calculator | `get{Derived}` | `getNightlyRateByFrequency()` |
| Rule | `is{Condition}` | `isScheduleContiguous()` |
| Rule | `can{Action}` | `canEditProposal()` |
| Rule | `should{Action}` | `shouldShowDiscount()` |
| Rule | `has{Feature}` | `hasValidToken()` |
| Processor | `process{Entity}` | `processListingData()` |
| Processor | `parse{Field}` | `parseJsonArrayField()` |
| Processor | `normalize{Field}` | `normalizeProfilePhoto()` |
| Processor | `adapt{External}` | `adaptDaysToBubble()` |
| Workflow | `{verb}{noun}Workflow` | `validateScheduleWorkflow()` |

---

## Appendix B: Code Examples

### Example: Pure Calculator Function

```javascript
// src/logic/calculators/pricing/calculateFourWeekRent.js
/**
 * Calculates the baseline rent for a standard 4-week period.
 *
 * @intent Determine the recurring monthly cost basis before fees.
 * @rule Four weeks is the standard billing cycle for split lease.
 *
 * @param {object} params - Named parameters for clarity.
 * @param {number} params.nightlyRate - The base cost per night in USD.
 * @param {number} params.frequency - The number of nights per week (2-7).
 * @returns {number} The total rent for a 4-week cycle.
 *
 * @throws {Error} If nightlyRate or frequency is not a number.
 * @throws {Error} If frequency is outside the valid range (2-7).
 */
export function calculateFourWeekRent({ nightlyRate, frequency }) {
  // No Fallback: Strict type validation
  if (typeof nightlyRate !== 'number' || isNaN(nightlyRate)) {
    throw new Error(
      `calculateFourWeekRent: nightlyRate must be a number, got ${typeof nightlyRate}`
    )
  }

  if (typeof frequency !== 'number' || isNaN(frequency)) {
    throw new Error(
      `calculateFourWeekRent: frequency must be a number, got ${typeof frequency}`
    )
  }

  // Business rule validation
  if (frequency < 2 || frequency > 7) {
    throw new Error(
      `calculateFourWeekRent: frequency must be between 2-7 nights, got ${frequency}`
    )
  }

  // Pure calculation
  return nightlyRate * frequency * 4
}
```

### Example: Boolean Rule Function

```javascript
// src/logic/rules/scheduling/isScheduleContiguous.js
/**
 * Validates if a set of selected days forms a contiguous block.
 *
 * @intent Enforce the business rule that split lease stays must be consecutive.
 * @rule Handles complex week wrap-around scenarios (e.g., Fri-Sat-Sun).
 *
 * @param {object} context - The validation context.
 * @param {number[]} context.selectedDayIndices - Array of 0-based day indices.
 * @returns {boolean} True if the schedule is valid and contiguous.
 */
export function isScheduleContiguous({ selectedDayIndices }) {
  if (!selectedDayIndices || selectedDayIndices.length === 0) return false
  if (selectedDayIndices.length === 1) return true

  // Sort indices to handle out-of-order selection
  const sorted = [...selectedDayIndices].sort((a, b) => a - b)

  // If 6 or more days selected, it's contiguous
  if (sorted.length >= 6) return true

  // Check standard contiguous sequence (no wrap around)
  let isStandardContiguous = true
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] !== sorted[i - 1] + 1) {
      isStandardContiguous = false
      break
    }
  }

  if (isStandardContiguous) return true

  // Check week wrap-around case
  const hasZero = sorted.includes(0)
  const hasSix = sorted.includes(6)

  if (hasZero && hasSix) {
    // Inverse logic: check not-selected days
    const allDays = [0, 1, 2, 3, 4, 5, 6]
    const notSelectedDays = allDays.filter(d => !sorted.includes(d))

    if (notSelectedDays.length === 0) return true

    // Check if not-selected days form a contiguous block
    const minNotSelected = Math.min(...notSelectedDays)
    const maxNotSelected = Math.max(...notSelectedDays)

    const expectedNotSelected = []
    for (let i = minNotSelected; i <= maxNotSelected; i++) {
      expectedNotSelected.push(i)
    }

    const notSelectedContiguous = notSelectedDays.length === expectedNotSelected.length &&
      notSelectedDays.every((day, index) => day === expectedNotSelected[index])

    return notSelectedContiguous
  }

  return false
}
```

### Example: No Fallback Processor

```javascript
// src/logic/processors/listing/processListingData.js
/**
 * Transforms a raw Supabase listing row into a verified Listing entity.
 *
 * @intent Create a safe, typed object for UI consumption, enforcing data integrity.
 * @rule NO FALLBACK - Throws explicit errors for missing critical fields.
 *
 * @param {object} context - The processing context.
 * @param {object} context.rawListing - Raw listing object from Supabase.
 * @returns {object} Validated and normalized listing object.
 *
 * @throws {Error} If rawListing is null/undefined.
 * @throws {Error} If critical fields are missing (ID, Name, pricing).
 */
export function processListingData({ rawListing }) {
  // No Fallback enforcement: Application cannot function without listing data
  if (!rawListing) {
    throw new Error('Listing data is missing - cannot process null listing')
  }

  if (!rawListing._id) {
    throw new Error('Listing missing critical ID field')
  }

  if (!rawListing.Name) {
    throw new Error(`Listing ${rawListing._id} missing required Name field`)
  }

  // Validate critical pricing fields
  const nightlyRate = rawListing['💰Nightly Host Rate for 4 nights']
  if (nightlyRate === null || nightlyRate === undefined) {
    throw new Error(
      `Listing ${rawListing._id} missing critical pricing data (nightlyRate)`
    )
  }

  return {
    id: rawListing._id,
    title: rawListing.Name,
    description: rawListing.Description || '',

    location: {
      borough: processBoroughField(rawListing['Location - Borough']),
      neighborhood: processNeighborhoodField(rawListing['Location - Hood']),
      coordinates: processCoordinatesField(rawListing)
    },

    pricing: {
      nightlyRate: Number(nightlyRate),
      securityDeposit: Number(rawListing['💰Damage Deposit'] || 0),
      cleaningFee: Number(rawListing['💰Cleaning Cost / Maintenance Fee'] || 0)
    },

    features: {
      bedrooms: rawListing['Features - Qty Bedrooms'] || 0,
      bathrooms: rawListing['Features - Qty Bathrooms'] || 0,
      amenities: parseJsonArrayField(rawListing['Features - Amenities In-Unit'])
    }
  }
}

function processBoroughField(boroughId) {
  if (!boroughId) {
    throw new Error('Borough ID is required for listing')
  }
  return getBoroughName(boroughId)
}

function processNeighborhoodField(neighborhoodId) {
  if (!neighborhoodId) {
    throw new Error('Neighborhood ID is required for listing')
  }
  return getNeighborhoodName(neighborhoodId)
}

function processCoordinatesField(rawListing) {
  const coords = rawListing['Location - slightly different address']

  if (!coords || !coords.lat || !coords.lng) {
    throw new Error('Listing missing valid coordinates')
  }

  return {
    lat: Number(coords.lat),
    lng: Number(coords.lng),
    address: coords.address || null
  }
}
```

---

**End of Comprehensive Refactoring Plan**

This plan provides a complete roadmap for migrating the Split Lease codebase to the Logic Core Framework while maintaining the "No Fallback" principle and ensuring all business logic is properly separated from the presentation layer.
