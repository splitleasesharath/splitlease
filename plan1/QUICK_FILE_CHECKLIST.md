# Quick File Refactoring Checklist

## Files to Refactor (Business Logic → Logic Core)

### HIGH PRIORITY - Core Business Logic

#### Pricing & Calculations
- [ ] `app/src/lib/priceCalculations.js` → `logic/calculators/pricing/`
  - [ ] calculate4WeekRent → calculateFourWeekRent.js
  - [ ] calculateReservationTotal → calculateReservationTotal.js
  - [ ] getNightlyPriceForNights → getNightlyRateByFrequency.js
  - [ ] calculatePricingBreakdown → calculatePricingBreakdown.js
  - [ ] isValidForPricing → `logic/rules/pricing/isValidDayCountForPricing.js`

#### Scheduling & Validation
- [ ] `app/src/lib/availabilityValidation.js` → `logic/rules/scheduling/` + `logic/calculators/scheduling/`
  - [ ] isContiguousSelection → `logic/rules/scheduling/isScheduleContiguous.js`
  - [ ] calculateCheckInOutDays → `logic/calculators/scheduling/calculateCheckInOutDays.js`
  - [ ] validateScheduleSelection → `logic/workflows/scheduling/validateScheduleWorkflow.js`
  - [ ] isDateBlocked → `logic/rules/scheduling/isDateBlocked.js`
  - [ ] isDateInRange → `logic/rules/scheduling/isDateInRange.js`
  - [ ] validateMoveInDate → `logic/workflows/scheduling/validateMoveInDateWorkflow.js`
  - [ ] calculateNightsFromDays → `logic/calculators/scheduling/calculateNightsFromDays.js`

#### Data Processing (CRITICAL - No Fallback)
- [ ] `app/src/lib/listingDataFetcher.js` → SPLIT
  - [ ] Keep: `fetchRawListingData()` → stays in lib (infrastructure)
  - [ ] Extract: `parseJsonField()` → `logic/processors/listing/parseJsonArrayField.js`
  - [ ] Extract: Data transformation → `logic/processors/listing/processListingData.js`
  - [ ] Extract: getNightlyPrice → `logic/calculators/pricing/getNightlyRateByFrequency.js`

### MEDIUM PRIORITY - Workflows & Data

#### Proposal Data
- [ ] `app/src/lib/proposalDataFetcher.js` → SPLIT
  - [ ] Keep: `fetchUserById()`, `fetchProposalsByGuest()` → stays in lib
  - [ ] Extract: `loadProposalDetails()` → `logic/processors/proposal/processProposalData.js`

#### Authentication
- [ ] `app/src/lib/auth.js` → `logic/workflows/auth/` + `logic/rules/auth/`
  - [ ] checkAuthStatus → `logic/workflows/auth/checkAuthStatusWorkflow.js`
  - [ ] isSessionValid → `logic/rules/auth/isSessionValid.js`
  - [ ] validateTokenAndFetchUser → `logic/workflows/auth/validateTokenWorkflow.js`
  - [ ] isProtectedPage → `logic/rules/auth/isProtectedPage.js`
  - [ ] Keep: loginUser, signupUser, logoutUser → stays in lib (API calls)

#### External Adapters (Bubble.io)
- [ ] `app/src/lib/dayUtils.js` → `logic/processors/external/`
  - [ ] toBubbleDays → `adaptDaysToBubble.js`
  - [ ] fromBubbleDays → `adaptDaysFromBubble.js`
  - [ ] dayToBubble → `adaptDayToBubble.js`
  - [ ] dayFromBubble → `adaptDayFromBubble.js`
  - [ ] isValidDaysArray → `logic/rules/scheduling/isValidDaysArray.js`
  - [ ] isValidBubbleDaysArray → `logic/rules/scheduling/isValidBubbleDaysArray.js`

#### Schedule Selector Utilities
- [ ] `app/src/lib/scheduleSelector/dayHelpers.js` → SPLIT
  - [ ] Keep: createDay, sortDays, createNight → stays in lib (factories)
  - [ ] Extract: getNextDay → `logic/calculators/scheduling/getNextDay.js`
  - [ ] Extract: getPreviousDay → `logic/calculators/scheduling/getPreviousDay.js`
  - [ ] Extract: isDayInRange → `logic/rules/scheduling/isDayInRange.js`

- [ ] `app/src/lib/scheduleSelector/validators.js` → `logic/workflows/scheduling/`
  - [ ] validateDaySelection → `validateDaySelectionWorkflow.js`
  - [ ] validateDayRemoval → `validateDayRemovalWorkflow.js`
  - [ ] isContiguous → `logic/rules/scheduling/isScheduleContiguous.js` (duplicate)
  - [ ] validateSchedule → `validateScheduleWorkflow.js`

### React Islands to Make "Hollow"

#### HIGH Priority Islands
- [ ] `app/src/islands/shared/ListingScheduleSelector.jsx`
  - Remove: Price calculation logic
  - Remove: Validation logic
  - Make: Pure presentation component receiving props

- [ ] `app/src/islands/shared/useScheduleSelector.js`
  - Refactor to use Logic Core functions
  - Keep only state management

- [ ] `app/src/islands/pages/ViewSplitLeasePage.jsx`
  - Remove: Data transformation logic
  - Remove: Defensive null checks (processor guarantees validity)
  - Use: `processListingData()` processor

#### MEDIUM Priority Islands
- [ ] `app/src/islands/shared/CreateProposalFlowV2.jsx`
  - Extract: Multi-step flow → `logic/workflows/booking/createProposalWorkflow.js`

- [ ] `app/src/islands/pages/GuestProposalsPage.jsx`
  - Extract: Stage determination (1-6) → `logic/rules/proposals/determineProposalStage.js`
  - Extract: Terms merging → `logic/processors/proposal/mergeProposalTerms.js`

- [ ] `app/src/islands/modals/EditProposalModal.jsx`
  - Extract: Proposal editing logic
  - Extract: Price recalculation

#### LOW Priority Islands
- [ ] `app/src/islands/modals/CompareTermsModal.jsx`
- [ ] `app/src/islands/modals/ProposalDetailsModal.jsx`

---

## Files to KEEP in lib (Infrastructure - No Changes)

### Database & API
- ✅ `app/src/lib/supabase.js` - Supabase client configuration
- ✅ `app/src/lib/bubbleAPI.js` - Bubble.io API client

### Configuration & Constants
- ✅ `app/src/lib/config.js` - Environment configuration
- ✅ `app/src/lib/constants.js` - Static constants (DAY_NAMES, etc.)

### Data Lookups (Infrastructure)
- ✅ `app/src/lib/dataLookups.js` - Database ID → name resolution cache
  - This is infrastructure, not business logic
  - Provides performance optimization (caching)

### Utilities (Infrastructure)
- ✅ `app/src/lib/sanitize.js` - Input sanitization
- ✅ `app/src/lib/secureStorage.js` - Storage encryption
- ✅ `app/src/lib/hotjar.js` - Analytics integration
- ✅ `app/src/lib/mapUtils.js` - Google Maps utilities
- ✅ `app/src/lib/urlParams.js` - URL parsing utilities
- ✅ `app/src/lib/supabaseUtils.js` - Supabase helper utilities

---

## New Files to Create (Logic Core)

### Calculators (Pure Math)
```
app/src/logic/calculators/
├── pricing/
│   ├── calculateFourWeekRent.js          [NEW]
│   ├── calculateReservationTotal.js      [NEW]
│   ├── getNightlyRateByFrequency.js      [NEW]
│   ├── calculatePricingBreakdown.js      [NEW]
│   └── calculateProratedFees.js          [NEW - optional]
│
├── scheduling/
│   ├── calculateCheckInOutDays.js        [NEW]
│   ├── calculateNightsFromDays.js        [NEW]
│   ├── getNextDay.js                     [NEW]
│   ├── getPreviousDay.js                 [NEW]
│   └── calculateWeekSpan.js              [NEW - optional]
│
└── geo/
    ├── calculateCoordinateOffset.js      [NEW]
    └── calculateDistance.js              [NEW - optional]
```

### Rules (Boolean Logic)
```
app/src/logic/rules/
├── scheduling/
│   ├── isScheduleContiguous.js           [NEW]
│   ├── isDateBlocked.js                  [NEW]
│   ├── isDateInRange.js                  [NEW]
│   ├── isDayInRange.js                   [NEW]
│   ├── isValidDaysArray.js               [NEW]
│   └── isValidBubbleDaysArray.js         [NEW]
│
├── pricing/
│   └── isValidDayCountForPricing.js      [NEW]
│
├── proposals/
│   ├── canEditProposal.js                [NEW]
│   ├── canAcceptProposal.js              [NEW]
│   └── isProposalExpired.js              [NEW]
│
├── auth/
│   ├── isSessionValid.js                 [NEW]
│   ├── isProtectedPage.js                [NEW]
│   └── isTokenExpired.js                 [NEW]
│
└── users/
    ├── isHost.js                         [NEW]
    ├── isGuest.js                        [NEW]
    └── canMessageHost.js                 [NEW]
```

### Processors (Data Transformation - No Fallback)
```
app/src/logic/processors/
├── listing/
│   ├── processListingData.js             [NEW - CRITICAL]
│   ├── parseJsonArrayField.js            [NEW - CRITICAL]
│   └── normalizePhotos.js                [NEW]
│
├── user/
│   ├── processUserData.js                [NEW]
│   └── normalizeProfilePhoto.js          [NEW]
│
├── proposal/
│   ├── processProposalData.js            [NEW]
│   ├── mergeProposalTerms.js             [NEW]
│   └── determineProposalStage.js         [NEW]
│
└── external/
    ├── adaptDaysToBubble.js              [NEW]
    ├── adaptDaysFromBubble.js            [NEW]
    ├── adaptDayToBubble.js               [NEW]
    └── adaptDayFromBubble.js             [NEW]
```

### Workflows (Orchestration)
```
app/src/logic/workflows/
├── booking/
│   ├── createProposalWorkflow.js         [NEW]
│   ├── editProposalWorkflow.js           [NEW]
│   └── acceptProposalWorkflow.js         [NEW]
│
├── scheduling/
│   ├── validateScheduleWorkflow.js       [NEW]
│   ├── validateDaySelectionWorkflow.js   [NEW]
│   ├── validateDayRemovalWorkflow.js     [NEW]
│   └── validateMoveInDateWorkflow.js     [NEW]
│
├── auth/
│   ├── checkAuthStatusWorkflow.js        [NEW]
│   ├── validateTokenWorkflow.js          [NEW]
│   └── logoutWorkflow.js                 [NEW]
│
└── messaging/
    └── sendMessageWorkflow.js            [NEW]
```

---

## Migration Phases Summary

### Phase 1: Foundation (Week 1) - CRITICAL
**Focus:** Pricing calculators
- [ ] Create `app/src/logic/` directory structure
- [ ] Migrate all pricing functions from `priceCalculations.js`
- [ ] Update `ListingScheduleSelector.jsx` to use new calculators
- [ ] Write unit tests for all calculators (100% coverage)

### Phase 2: Scheduling Rules (Week 2) - CRITICAL
**Focus:** Validation logic
- [ ] Migrate `isScheduleContiguous` and all scheduling rules
- [ ] Migrate scheduling calculators (checkInOutDays, etc.)
- [ ] Create scheduling workflows
- [ ] Test all edge cases (wrap-around, contiguous validation)

### Phase 3: Data Processors (Week 3) - CRITICAL
**Focus:** "No Fallback" enforcement
- [ ] Create `processListingData.js` with strict validation
- [ ] Create `parseJsonArrayField.js`
- [ ] Create user and proposal processors
- [ ] Update all data fetchers to use processors

### Phase 4: Workflows & Islands (Week 4)
**Focus:** Make islands "hollow"
- [ ] Extract auth workflows
- [ ] Extract booking workflows
- [ ] Refactor major islands to be presentation-only
- [ ] Create logic hooks for state management

### Phase 5: External Adapters (Week 5)
**Focus:** Bubble.io integration
- [ ] Create Bubble day conversion processors
- [ ] Move all external API adapters to `processors/external/`
- [ ] Add strict validation for all external data

---

## Verification Checklist

After migration, verify:
- [ ] All business logic is in `src/logic/` (0% in islands)
- [ ] All calculators are pure functions (unit testable)
- [ ] All processors throw on invalid data (no silent failures)
- [ ] All islands are "hollow" (< 20 lines per function)
- [ ] 100% test coverage on Logic Core
- [ ] ESLint passes (no React imports in Logic Core)
- [ ] Build succeeds with no errors
- [ ] All E2E tests pass

---

**Total Files to Refactor:** 16 lib files + 6-8 major islands
**Total New Files to Create:** ~60 Logic Core modules
**Estimated Timeline:** 5 weeks for complete migration
