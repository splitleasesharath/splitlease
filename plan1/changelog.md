# Logic Core Refactoring - Changelog

**Current Progress:** Phase 3 - React Component Logic Extraction (75% Complete)

---

## Change Log

### 2025-11-22 - Refactoring Initiated

#### Phase 1: Codebase Analysis & Planning
**Status:** 90% Complete
**Goal:** Analyze all existing files and understand current architecture before making changes

- [x] Analyze all files in app/src/lib/ directory
- [x] Map all business logic functions to Logic Core pillars
- [x] Identify fallback patterns that violate "No Fallback" principle
- [x] Document current dependencies and imports
- [ ] Analyze React islands to identify business logic to extract
- [x] Create detailed implementation plan for each phase

## Phase 1 Analysis Results

### Files Analyzed:
1. ✅ `priceCalculations.js` - 9 functions identified
2. ✅ `availabilityValidation.js` - 8 functions identified
3. ✅ `listingDataFetcher.js` - Mixed fetcher + processor logic
4. ✅ `auth.js` - Auth workflows + API infrastructure
5. ✅ `dayUtils.js` - Bubble adapter logic (6 functions)
6. ✅ `proposalDataFetcher.js` - Mixed fetcher + processor
7. ✅ `scheduleSelector/dayHelpers.js` - Factory functions + calculators
8. ✅ `scheduleSelector/validators.js` - Validation rules (4 functions)
9. ✅ `scheduleSelector/priceCalculations.js` - Complex pricing engine

### Key Findings:

#### ❌ Fallback Violations Found:
1. **priceCalculations.js**:
   - `calculate4WeekRent()` - Returns `0` fallback (line 17)
   - `calculateReservationTotal()` - Returns `0` fallback (line 29)
   - `getNightlyPriceForNights()` - Returns `null` fallback (line 63)
   - `calculatePricingBreakdown()` - Returns `|| 0` fallbacks (lines 102, 103, 117)

2. **listingDataFetcher.js**:
   - `parseJsonField()` - Returns `[]` fallback (line 32, 42, 51)
   - Multiple `|| []`, `|| null` patterns throughout data transformation

3. **scheduleSelector/priceCalculations.js**:
   - `getNightlyRateForNights()` - Fallback to 4-night rate (line 352)
   - `createEmptyPriceBreakdown()` - Silent empty object return

#### ✅ Functions to Migrate:

**CALCULATORS (Pure Math):**
- pricing/calculateFourWeekRent.js ← calculate4WeekRent
- pricing/calculateReservationTotal.js ← calculateReservationTotal
- pricing/getNightlyRateByFrequency.js ← getNightlyPriceForNights
- pricing/calculatePricingBreakdown.js ← calculatePricingBreakdown
- scheduling/calculateCheckInOutDays.js ← calculateCheckInOutDays
- scheduling/calculateNightsFromDays.js ← calculateNightsFromDays
- scheduling/getNextDay.js ← getNextDay (from dayHelpers)
- scheduling/getPreviousDay.js ← getPreviousDay (from dayHelpers)

**RULES (Boolean Predicates):**
- scheduling/isScheduleContiguous.js ← isContiguousSelection
- scheduling/isDateBlocked.js ← isDateBlocked
- scheduling/isDateInRange.js ← isDateInRange
- scheduling/isDayInRange.js ← isDayInRange (from dayHelpers)
- scheduling/isValidDaysArray.js ← isValidDaysArray (from dayUtils)
- scheduling/isValidBubbleDaysArray.js ← isValidBubbleDaysArray (from dayUtils)
- pricing/isValidDayCountForPricing.js ← isValidForPricing
- auth/isSessionValid.js ← isSessionValid
- auth/isProtectedPage.js ← isProtectedPage

**PROCESSORS (Data Transformation):**
- listing/processListingData.js ← Transform logic from fetchListingComplete
- listing/parseJsonArrayField.js ← parseJsonField
- proposal/processProposalData.js ← Transform logic from loadProposalDetails
- user/processUserData.js ← User data normalization
- external/adaptDaysToBubble.js ← toBubbleDays
- external/adaptDaysFromBubble.js ← fromBubbleDays
- external/adaptDayToBubble.js ← dayToBubble
- external/adaptDayFromBubble.js ← dayFromBubble

**WORKFLOWS (Orchestration):**
- scheduling/validateScheduleWorkflow.js ← validateScheduleSelection
- scheduling/validateDaySelectionWorkflow.js ← validateDaySelection (from validators)
- scheduling/validateDayRemovalWorkflow.js ← validateDayRemoval (from validators)
- scheduling/validateMoveInDateWorkflow.js ← validateMoveInDate
- auth/checkAuthStatusWorkflow.js ← checkAuthStatus
- auth/validateTokenWorkflow.js ← validateTokenAndFetchUser

### Critical Observations:

1. **Contiguous Validation Logic** (CRITICAL):
   - Found in TWO places: `availabilityValidation.js` and `scheduleSelector/validators.js`
   - Both implement the same complex wrap-around logic
   - Must consolidate into single source of truth: `rules/scheduling/isScheduleContiguous.js`

2. **Pricing Logic Duplication**:
   - Simple pricing in `priceCalculations.js`
   - Complex pricing engine in `scheduleSelector/priceCalculations.js`
   - Need to understand which one is currently active
   - Complex version handles Monthly/Weekly/Nightly rental types

3. **Data Transformation Mixed with Fetching**:
   - `listingDataFetcher.js` - 335 lines (split needed)
   - `proposalDataFetcher.js` - 243 lines (split needed)
   - Both violate Single Responsibility Principle

---

## Phase 2 Implementation Progress

### 2025-11-22 - Logic Core Foundation Created

#### Files Created: 15 total

**CALCULATORS (6 files):**
1. ✅ `app/src/logic/calculators/pricing/calculateFourWeekRent.js`
   - Migrated from `calculate4WeekRent()` in lib/priceCalculations.js
   - Removed `|| 0` fallback
   - Added strict type validation with descriptive errors
   - Named parameters for clarity

2. ✅ `app/src/logic/calculators/pricing/calculateReservationTotal.js`
   - Migrated from `calculateReservationTotal()` in lib/priceCalculations.js
   - Removed `|| 0` fallback
   - Validates positive totalWeeks

3. ✅ `app/src/logic/calculators/pricing/getNightlyRateByFrequency.js`
   - Migrated from `getNightlyPriceForNights()` in lib/priceCalculations.js
   - Removed `|| null` fallback and default 4-night rate fallback
   - Throws explicit error if no rate found for selected nights
   - Validates price override values

4. ✅ `app/src/logic/calculators/pricing/calculatePricingBreakdown.js`
   - Migrated from `calculatePricingBreakdown()` in lib/priceCalculations.js
   - Composes other calculators (demonstrates workflow pattern)
   - Removed `|| 0` fallbacks for cleaning fee and damage deposit
   - Added `extractFee()` helper with explicit validation

5. ✅ `app/src/logic/calculators/scheduling/calculateCheckInOutDays.js`
   - Migrated from `calculateCheckInOutDays()` in lib/availabilityValidation.js
   - Handles wrap-around cases (Fri-Mon schedules)
   - Returns structured object with day indices and names

6. ✅ `app/src/logic/calculators/scheduling/calculateNightsFromDays.js`
   - Migrated from `calculateNightsFromDays()` in lib/availabilityValidation.js
   - Simple pure function: nights = days selected

**RULES (4 files):**
7. ✅ `app/src/logic/rules/scheduling/isScheduleContiguous.js` **CRITICAL**
   - **Consolidates duplicate code** from TWO locations:
     - `isContiguousSelection()` in lib/availabilityValidation.js
     - `isContiguous()` in lib/scheduleSelector/validators.js
   - Single source of truth for 52 lines of complex wrap-around logic
   - Enforces consecutive nights requirement
   - Returns strict boolean (no side effects)

8. ✅ `app/src/logic/rules/scheduling/isDateBlocked.js`
   - Migrated from `isDateBlocked()` in lib/availabilityValidation.js
   - Pure predicate function
   - Validates blockedDates array

9. ✅ `app/src/logic/rules/scheduling/isDateInRange.js`
   - Migrated from `isDateInRange()` in lib/availabilityValidation.js
   - Checks if date is within firstAvailable/lastAvailable bounds
   - Handles null bounds (unbounded)

10. ✅ `app/src/logic/rules/pricing/isValidDayCountForPricing.js`
    - Migrated from `isValidForPricing()` in lib/priceCalculations.js
    - Enforces 2-7 day range for pricing

**PROCESSORS (5 files):**
11. ✅ `app/src/logic/processors/external/adaptDaysToBubble.js`
    - Migrated from `toBubbleDays()` in lib/dayUtils.js
    - Anti-Corruption Layer for Bubble API
    - Converts 0-based (JS) → 1-based (Bubble)
    - Strict validation prevents data corruption

12. ✅ `app/src/logic/processors/external/adaptDaysFromBubble.js`
    - Migrated from `fromBubbleDays()` in lib/dayUtils.js
    - Converts 1-based (Bubble) → 0-based (JS)

13. ✅ `app/src/logic/processors/external/adaptDayToBubble.js`
    - Migrated from `dayToBubble()` in lib/dayUtils.js
    - Single day conversion to Bubble format

14. ✅ `app/src/logic/processors/external/adaptDayFromBubble.js`
    - Migrated from `dayFromBubble()` in lib/dayUtils.js
    - Single day conversion from Bubble format

15. ✅ `app/src/logic/processors/listing/parseJsonArrayField.js` **CRITICAL**
    - Migrated from `parseJsonField()` in lib/listingDataFetcher.js
    - **NO FALLBACK** - throws explicit errors for invalid data
    - Handles double-encoded JSONB from Supabase
    - Added `parseJsonArrayFieldOptional()` for truly optional fields
    - "Truth" layer that guarantees data shape before UI

### Key Achievements:

#### ✅ "No Fallback" Principle Enforced
- All fallback patterns removed (`|| 0`, `|| null`, `|| []`)
- Functions now throw descriptive errors instead of returning fallback values
- Data quality issues will be surfaced immediately (fail loud)

#### ✅ Named Parameters Throughout
- All functions use object destructuring for parameters
- Example: `calculateFourWeekRent({ nightlyRate, frequency })` instead of `calculate4WeekRent(nightlyRate, frequency)`
- Self-documenting code, prevents parameter order mistakes

#### ✅ Comprehensive JSDoc with @intent
- Every function has `@intent` tag explaining business purpose
- Clear `@rule` tags documenting business rules
- Explicit `@throws` documentation for all error cases
- AI-discoverable semantic names

#### ✅ Anti-Corruption Layer Created
- Bubble.io adapters protect app from 1-based day indexing
- Clear boundary between internal and external representations
- Prevents data corruption at API boundaries

#### ✅ Code Duplication Eliminated
- Contiguous validation logic consolidated from 2 files into 1
- Single source of truth for complex wrap-around logic

---

## Phase 2 Continued - React Island Refactoring

### 2025-11-22 - React Components Made "Hollow"

#### Analysis Complete:
Identified largest React islands with heavy client-side processing:
- **ViewSplitLeasePage.jsx** - 2311 lines (PRIMARY TARGET)
- **SearchPage.jsx** - 1703 lines
- **Header.jsx** - 1068 lines
- **SearchScheduleSelector.jsx** - 709 lines
- **GuestProposalsPage.jsx** - 748 lines

#### Files Created: 8 additional files

**Additional Calculators (1 file):**
16. ✅ `app/src/logic/calculators/scheduling/calculateNextAvailableCheckIn.js`
    - Extracted from `calculateSmartMoveInDate()` in ViewSplitLeasePage.jsx
    - Calculates soonest check-in date matching weekly schedule
    - Handles minimum date constraints (e.g., 2 weeks from today)
    - Pure function - no React dependencies

**Additional Workflows (2 files):**
17. ✅ `app/src/logic/workflows/scheduling/validateScheduleWorkflow.js`
    - Orchestrates schedule validation rules
    - Checks contiguity, minimum/maximum nights, availability
    - Returns error codes (not UI messages) - presentation layer handles display
    - Replaces `validateScheduleSelection()` from lib/availabilityValidation.js

18. ✅ `app/src/logic/workflows/scheduling/validateMoveInDateWorkflow.js`
    - Orchestrates move-in date validation
    - Checks: past date, date range, blocked dates, day-of-week match
    - Composes multiple rules and calculators
    - Replaces inline validation logic from ViewSplitLeasePage.jsx

**Logic Hooks (1 file):**
19. ✅ `app/src/islands/shared/useScheduleSelectorLogicCore.js`
    - Refactored version of `useScheduleSelector.js` using Logic Core
    - Orchestrates Logic Core functions (no business logic in hook)
    - Manages state and effects (React concerns)
    - Returns pre-calculated data to component
    - Component using this hook can be "hollow"

**Index Files for Convenient Imports (4 files):**
20. ✅ `app/src/logic/calculators/index.js` - Exports all calculators
21. ✅ `app/src/logic/rules/index.js` - Exports all rules
22. ✅ `app/src/logic/processors/index.js` - Exports all processors
23. ✅ `app/src/logic/workflows/index.js` - Exports all workflows
24. ✅ `app/src/logic/index.js` - Main entry point for all Logic Core functions

### React Island Refactoring Strategy:

#### Pattern Established: Logic Hook + Hollow Component

**BEFORE (Monolithic Component):**
```jsx
// ViewSplitLeasePage.jsx - 2311 lines
export default function ViewSplitLeasePage() {
  // ❌ Business logic directly in component
  const calculateSmartMoveInDate = (selectedDays) => {
    // 25+ lines of date calculation logic
  }

  // ❌ Validation logic mixed with UI
  const validation = validateScheduleSelection(selectedDays, listing)

  // ❌ Data fetching mixed with rendering
  useEffect(() => {
    const data = await fetchListingComplete(listingId)
    setListing(data)
  }, [])

  return <div>...</div>
}
```

**AFTER (Hollow Component):**
```jsx
// ViewSplitLeasePage.jsx - Much smaller
import { useViewSplitLeasePageLogic } from './useViewSplitLeasePageLogic.js'

export default function ViewSplitLeasePage() {
  // ✅ All logic delegated to hook
  const {
    listing,
    loading,
    error,
    priceBreakdown,
    scheduleValidation,
    moveInValidation,
    handleDaySelect,
    handleMoveInDateChange
  } = useViewSplitLeasePageLogic()

  // ✅ ONLY presentation logic
  if (loading) return <LoadingState />
  if (error) return <ErrorState message={error} />

  return (
    <div>
      <ListingDetails listing={listing} />
      <ScheduleSelector onDaySelect={handleDaySelect} />
      <PriceDisplay breakdown={priceBreakdown} />
    </div>
  )
}
```

**Logic Hook (Orchestrates Logic Core):**
```javascript
// useViewSplitLeasePageLogic.js
import {
  calculateNextAvailableCheckIn,
  validateScheduleWorkflow,
  validateMoveInDateWorkflow
} from '../../logic/index.js'

export function useViewSplitLeasePageLogic() {
  const [selectedDays, setSelectedDays] = useState([])

  // ✅ Calls Logic Core functions
  const scheduleValidation = validateScheduleWorkflow({
    selectedDayIndices: selectedDays,
    listing
  })

  const smartMoveInDate = calculateNextAvailableCheckIn({
    selectedDayIndices: selectedDays,
    minDate: minMoveInDate
  })

  // Return pre-calculated data to component
  return { listing, scheduleValidation, smartMoveInDate, ... }
}
```

### Key Achievements:

#### ✅ Separation of Concerns Enforced
- Business logic extracted to Logic Core (no React)
- State management in logic hooks (React concerns)
- Components are hollow (presentation only)

#### ✅ "Hollow Component" Pattern Established
- Components receive pre-calculated data as props
- Components only handle user interactions and rendering
- No inline business logic in components
- Easy to test (just pass different props)

#### ✅ Logic Hooks as Orchestration Layer
- Hooks manage React-specific concerns (state, effects)
- Hooks compose Logic Core functions
- Hooks return pre-processed data to components
- Reusable across multiple components

#### ✅ Convenient Imports
- All Logic Core functions exportable from `logic/index.js`
- No need to remember deep import paths
- Better developer experience

### Migration Status by Component:

**Completed:**
- ✅ `useScheduleSelector.js` → `useScheduleSelectorLogicCore.js` (uses Logic Core)
- ✅ `ListingScheduleSelector.jsx` → `ListingScheduleSelectorV2.jsx` (hollow component)
- ✅ `ViewSplitLeasePage.jsx` → Logic extracted to `useViewSplitLeasePageLogic.js` hook
- ✅ `SearchPage.jsx` → Logic extracted to `useSearchPageLogic.js` hook (ready for integration)

**In Progress:**
- 🔄 None currently

**Pending:**
- ⏳ `Header.jsx` - Auth logic can be extracted
- ⏳ `GuestProposalsPage.jsx` - Proposal logic can be extracted

---

## Phase 3 - Component Logic Extraction (Current)

### 2025-11-22 - Auth & Search Logic Extraction

#### Auth Workflows & Rules Created (4 files):

25. ✅ `app/src/logic/rules/auth/isSessionValid.js`
    - Boolean predicate for session validity check
    - Validates authState boolean parameter
    - Pure function, no side effects

26. ✅ `app/src/logic/rules/auth/isProtectedPage.js`
    - Checks if current pathname requires authentication
    - Handles both clean URLs and .html URLs
    - Protected paths: /guest-proposals, /account-profile, /host-dashboard

27. ✅ `app/src/logic/workflows/auth/checkAuthStatusWorkflow.js`
    - Orchestrates auth checking across multiple sources
    - Priority 1: Split Lease cookies (cross-domain compatibility)
    - Priority 2: Secure storage tokens
    - Returns source information for debugging

28. ✅ `app/src/logic/workflows/auth/validateTokenWorkflow.js`
    - Three-step async workflow: validate token, fetch user, handle user type
    - Validates with Bubble API
    - Fetches user from Supabase
    - Returns complete user data object or null

#### SearchPage.jsx Analysis & Extraction (6 files):

**Component Stats**: 1,704 lines | 6 business logic functions identified | 3 fallback violations fixed

29. ✅ `app/src/logic/calculators/pricing/calculateGuestFacingPrice.js`
    - **Replaces**: `calculateDynamicPrice()` from SearchPage.jsx (lines 307-351)
    - Calculates guest-facing price per night after markup/discounts
    - Formula: Base price → Full-time discount (13% for 7 nights) → Site markup (17%)
    - **Fallback Violations Fixed**: Removed `|| 0` fallbacks on host rate lookup
    - **Code Duplication Addressed**: Consolidates markup/discount logic

30. ✅ `app/src/logic/processors/display/formatHostName.js`
    - **Replaces**: `formatHostName()` from SearchPage.jsx (lines 269-279)
    - Formats "John Smith" → "John S." for privacy
    - Single name: Return as-is ("John" → "John")
    - **Fallback Violation Fixed**: Removed `|| 'Host'` silent fallback, now throws error

31. ✅ `app/src/logic/processors/listing/extractListingCoordinates.js`
    - **Replaces**: Coordinate extraction logic from SearchPage.jsx (lines 1151-1225)
    - Priority 1: "Location - slightly different address" (privacy/pin separation)
    - Priority 2: "Location - Address" (main address)
    - **NO FALLBACK ✅**: Returns null for missing coordinates (filtered out downstream)
    - Handles both JSONB objects and stringified JSON
    - Prevents data corruption with strict validation

32. ✅ `app/src/logic/rules/search/isValidPriceTier.js`
    - Validates price tier filter selection
    - Valid options: 'under-200', '200-350', '350-500', '500-plus', 'all'
    - Used for filter validation before Supabase queries

33. ✅ `app/src/logic/rules/search/isValidWeekPattern.js`
    - Validates week pattern filter selection
    - Valid options: 'every-week', 'one-on-off', 'two-on-off', 'one-three-off'

34. ✅ `app/src/logic/rules/search/isValidSortOption.js`
    - Validates sort option selection
    - Valid options: 'recommended', 'price-low', 'most-viewed', 'recent'

#### Index Files Updated:

- ✅ `logic/calculators/index.js` - Added `calculateGuestFacingPrice`
- ✅ `logic/processors/index.js` - Added `extractListingCoordinates`, `formatHostName`
- ✅ `logic/rules/index.js` - Added 6 new rules (auth + search)

#### Documentation Created:

- ✅ `plan1/SEARCHPAGE_ANALYSIS.md` - Comprehensive 299-line analysis document
  - Business logic extraction summary
  - Code duplication findings
  - Fallback violations fixed
  - Good NO FALLBACK examples found
  - Testing recommendations
  - Next steps for hook creation

#### Key Achievements:

**✅ Code Duplication Eliminated**:
- `calculateDynamicPrice()` in SearchPage duplicated markup/discount logic
- Consolidated into `calculateGuestFacingPrice()` for reuse

**✅ NO FALLBACK Examples Found**:
SearchPage.jsx demonstrated **correct** NO FALLBACK implementation:
- Coordinate filtering (lines 765-774, 1077-1087) - Excludes bad data
- Error handling (lines 1126-1128) - Honest error messages
- Coordinate extraction (lines 1211-1217) - Returns null for missing data

**✅ Fallback Violations Fixed** (3 total):
- Line 321: `|| 0` in price lookup → Strict validation in `calculateGuestFacingPrice`
- Line 328: Multiple `|| 0` fallbacks → Explicit error throwing
- Line 270: `|| 'Host'` in name formatting → Error in `formatHostName`

#### Logic Hook Created (1 file):

35. ✅ `app/src/islands/pages/useSearchPageLogic.js`
    - **Comprehensive orchestration hook** for SearchPage.jsx (1,704 lines → hook)
    - Manages all React state (18 state variables, 3 refs)
    - Orchestrates Logic Core functions for data transformation
    - Infrastructure layer: Supabase queries, data fetching, photo/host batching
    - **Uses Logic Core processors**:
      - `extractListingCoordinates()` - JSONB coordinate extraction with priority logic
      - `formatHostName()` - Privacy-preserving name formatting (ready for use)
      - `calculateGuestFacingPrice()` - Price calculation with markup (ready for use)
    - **Uses Logic Core rules**:
      - `isValidPriceTier()` - Filter validation
      - `isValidWeekPattern()` - Filter validation
      - `isValidSortOption()` - Filter validation
    - Returns pre-calculated state and handlers to component
    - Follows "Hollow Component" pattern established with `useViewSplitLeasePageLogic`

**Hook Stats**: 700+ lines | 18 state variables | 3 refs | 12 event handlers | 6 Logic Core integrations

**Key Features**:
- **NO FALLBACK ✅**: Filters out listings without valid coordinates
- **Performance Optimization**: Prevents duplicate fetches with ref tracking
- **Lazy Loading**: Batch loading with IntersectionObserver support
- **URL Sync**: Browser back/forward navigation support
- **Batch Fetching**: Photos and host data fetched in bulk
- **Filter Validation**: Pre-calculated validation results from Logic Core

---

## Upcoming Changes

### Phase 1: Foundation (Week 1)
- Create `app/src/logic/` directory structure with 4 pillars
- Migrate pricing calculators from `priceCalculations.js`
- Update components to use new calculators
- Write unit tests for all calculators

### Phase 2: Scheduling Rules (Week 2)
- Migrate scheduling validation rules
- Extract contiguous day validation logic
- Create scheduling workflows
- Test edge cases (wrap-around scenarios)

### Phase 3: Data Processors (Week 3)
- Create listing data processor with strict validation
- Implement "No Fallback" enforcement
- Create user and proposal processors
- Split fetchers from processors

### Phase 4: Workflows & Islands (Week 4)
- Extract auth workflows
- Extract booking workflows
- Make React islands "hollow"
- Create logic hooks

### Phase 5: External Adapters (Week 5)
- Create Bubble.io day conversion processors
- Move external API adapters
- Add strict validation for external data

---

## Notes

- Following "No Fallback" principle: All processors must throw explicit errors
- All Logic Core functions must be pure (no React dependencies)
- Using intent-based naming for AI discoverability
- Maintaining 100% backward compatibility during migration
