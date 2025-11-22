# Architecture Transformation: Before → After

## Current Architecture (Monolithic Mix)

```
┌─────────────────────────────────────────────────────────────────┐
│                         React Islands                           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  ListingScheduleSelector.jsx                             │  │
│  │  • Contains pricing calculations                         │  │
│  │  • Contains validation logic                             │  │
│  │  • Contains data transformation                          │  │
│  │  • Contains UI rendering                                 │  │
│  │                                                           │  │
│  │  const price = calculate4WeekRent(...)  ← MIXED         │  │
│  │  const valid = isContiguous(...)        ← MIXED         │  │
│  │  return <div>...</div>                   ← MIXED         │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  ViewSplitLeasePage.jsx                                  │  │
│  │  • Fetches data                                          │  │
│  │  • Transforms data inline                                │  │
│  │  • Defensive null checks (if listing && listing.price)  │  │
│  │  • Renders UI                                            │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                          src/lib/                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  priceCalculations.js                                    │  │
│  │  • Business logic (calculate4WeekRent)                   │  │
│  │  • Fallback patterns (|| 0)                              │  │
│  │  • Mixed concerns                                        │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  listingDataFetcher.js                                   │  │
│  │  • Data fetching                                         │  │
│  │  • Data transformation (mixed in)                        │  │
│  │  • Silent error handling                                 │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  availabilityValidation.js                               │  │
│  │  • Validation rules                                      │  │
│  │  • UI error messages (mixed in)                          │  │
│  │  • Complex wrap-around logic                             │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘

PROBLEMS:
❌ Logic scattered across islands and lib
❌ Defensive coding masks data issues
❌ Hard to test (need to mount React components)
❌ Hard for AI to find specific logic (generic names)
❌ Components do too much (violate Single Responsibility)
```

---

## Target Architecture (Logic Core)

```
┌─────────────────────────────────────────────────────────────────┐
│                    React Islands (HOLLOW)                       │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  ListingScheduleSelector.jsx                             │  │
│  │  • ONLY renders props                                    │  │
│  │  • ONLY handles user interactions                        │  │
│  │  • NO business logic                                     │  │
│  │                                                           │  │
│  │  return (                                                 │  │
│  │    <div>                                                  │  │
│  │      {daysGrid.map(day => ...)}  ← Props                │  │
│  │      <PriceDisplay breakdown={priceBreakdown} />         │  │
│  │      {validationError && <Error />}                      │  │
│  │    </div>                                                 │  │
│  │  )                                                        │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              ↑                                   │
│                   Receives pre-processed data                   │
└─────────────────────────────────────────────────────────────────┘
                              ↑
┌─────────────────────────────────────────────────────────────────┐
│                   Logic Hooks (Optional)                        │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  useScheduleSelectorLogic.js                             │  │
│  │  • Orchestrates Logic Core functions                     │  │
│  │  • Manages state                                         │  │
│  │  • Returns pre-calculated data to component              │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↑
                     Calls Logic Core ↓
┌─────────────────────────────────────────────────────────────────┐
│                         src/logic/                              │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  CALCULATORS (Pure Math)                                 │  │
│  │  ├── pricing/                                            │  │
│  │  │   ├── calculateFourWeekRent.js                        │  │
│  │  │   ├── calculateReservationTotal.js                    │  │
│  │  │   └── getNightlyRateByFrequency.js                    │  │
│  │  ├── scheduling/                                         │  │
│  │  │   ├── calculateCheckInOutDays.js                      │  │
│  │  │   └── calculateNightsFromDays.js                      │  │
│  │  └── geo/                                                 │  │
│  │      └── calculateCoordinateOffset.js                    │  │
│  │                                                           │  │
│  │  ✅ Pure functions (same input = same output)           │  │
│  │  ✅ Strict type checking (throw on invalid)             │  │
│  │  ✅ Named parameters for clarity                        │  │
│  │  ✅ 100% unit testable                                  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  RULES (Boolean Predicates)                              │  │
│  │  ├── scheduling/                                         │  │
│  │  │   ├── isScheduleContiguous.js                         │  │
│  │  │   ├── isDateBlocked.js                                │  │
│  │  │   └── isDateInRange.js                                │  │
│  │  ├── pricing/                                            │  │
│  │  │   └── isValidDayCountForPricing.js                    │  │
│  │  ├── proposals/                                          │  │
│  │  │   ├── canEditProposal.js                              │  │
│  │  │   └── canAcceptProposal.js                            │  │
│  │  └── auth/                                               │  │
│  │      ├── isSessionValid.js                               │  │
│  │      └── isProtectedPage.js                              │  │
│  │                                                           │  │
│  │  ✅ Return strict boolean (no side effects)             │  │
│  │  ✅ Naming: is*, can*, should*, has*                    │  │
│  │  ✅ Isolated business rules                             │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  PROCESSORS (Data Transformation - "Truth" Layer)        │  │
│  │  ├── listing/                                            │  │
│  │  │   ├── processListingData.js                           │  │
│  │  │   └── parseJsonArrayField.js                          │  │
│  │  ├── user/                                               │  │
│  │  │   └── processUserData.js                              │  │
│  │  ├── proposal/                                           │  │
│  │  │   ├── processProposalData.js                          │  │
│  │  │   └── mergeProposalTerms.js                           │  │
│  │  └── external/                                           │  │
│  │      ├── adaptDaysToBubble.js                            │  │
│  │      └── adaptDaysFromBubble.js                          │  │
│  │                                                           │  │
│  │  ✅ NO FALLBACK - throw on invalid data                 │  │
│  │  ✅ Fail loud with descriptive errors                   │  │
│  │  ✅ Guarantee data shape before UI                      │  │
│  │  ✅ Anti-Corruption Layer for external APIs             │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  WORKFLOWS (Orchestration)                               │  │
│  │  ├── booking/                                            │  │
│  │  │   ├── createProposalWorkflow.js                       │  │
│  │  │   └── editProposalWorkflow.js                         │  │
│  │  ├── scheduling/                                         │  │
│  │  │   ├── validateScheduleWorkflow.js                     │  │
│  │  │   └── validateDaySelectionWorkflow.js                 │  │
│  │  └── auth/                                               │  │
│  │      ├── checkAuthStatusWorkflow.js                      │  │
│  │      └── validateTokenWorkflow.js                        │  │
│  │                                                           │  │
│  │  ✅ Compose calculators, rules, processors              │  │
│  │  ✅ Multi-step orchestration                            │  │
│  │  ✅ State machine logic                                 │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  🚫 NO React imports allowed                                   │
│  🚫 NO JSX allowed                                             │
│  🚫 NO fallback patterns (||, ??, try-catch silencing)        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    Uses infrastructure ↓
┌─────────────────────────────────────────────────────────────────┐
│                          src/lib/                               │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  INFRASTRUCTURE (Framework Adapters)                     │  │
│  │  ├── supabase.js          (Database client)              │  │
│  │  ├── bubbleAPI.js         (API client)                   │  │
│  │  ├── secureStorage.js     (Encryption)                   │  │
│  │  ├── dataLookups.js       (ID → Name cache)             │  │
│  │  ├── config.js            (Environment)                  │  │
│  │  └── constants.js         (Static data)                  │  │
│  │                                                           │  │
│  │  ✅ Knows HOW to talk to external systems               │  │
│  │  ✅ Knows NOTHING about business rules                  │  │
│  │  ✅ Provides raw data to processors                     │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘

BENEFITS:
✅ Clear separation of concerns
✅ 100% testable business logic (no React needed)
✅ AI can find logic by semantic names
✅ "No Fallback" enforced at processor layer
✅ Components are simple and focused
✅ Business rules in one place
✅ Easy to reason about and maintain
```

---

## Data Flow Examples

### Example 1: Pricing Calculation

#### BEFORE (Monolithic)
```
User clicks day
    ↓
ListingScheduleSelector.jsx
    ├── Updates selectedDays state
    ├── Calls calculate4WeekRent(price, days) ← Logic in component
    ├── Calls getNightlyPrice(listing, days)  ← Logic in component
    ├── Formats price with formatPrice()       ← Utility in component
    └── Renders <div>{formattedPrice}</div>
```

#### AFTER (Logic Core)
```
User clicks day
    ↓
ListingScheduleSelector.jsx (HOLLOW)
    └── Calls onDayToggle(dayId) → Parent
            ↓
        useScheduleSelectorLogic.js (Hook)
            ├── Updates selectedDays state
            ├── Calls calculatePricingBreakdown() ← Logic Core
            │       └── logic/calculators/pricing/calculatePricingBreakdown.js
            │           ├── Calls calculateFourWeekRent({ nightlyRate, frequency })
            │           ├── Calls calculateReservationTotal({ fourWeekRent, totalWeeks })
            │           └── Returns { nightlyPrice, fourWeekRent, grandTotal, valid }
            └── Returns { priceBreakdown } to component
                    ↓
        ListingScheduleSelector.jsx
            └── Renders <PriceDisplay breakdown={priceBreakdown} />
```

---

### Example 2: Schedule Validation

#### BEFORE (Monolithic)
```
User selects days
    ↓
ListingScheduleSelector.jsx
    ├── Calls isContiguousSelection(days) ← From lib/availabilityValidation.js
    ├── If invalid:
    │   └── Sets error state with UI message ← Business logic mixed with UI
    └── Renders <div className="error">{errorMessage}</div>
```

#### AFTER (Logic Core)
```
User selects days
    ↓
ListingScheduleSelector.jsx (HOLLOW)
    └── Calls onDaysChange(newDays) → Parent
            ↓
        useScheduleSelectorLogic.js (Hook)
            ├── Calls validateScheduleWorkflow({ selectedDays, listing })
            │       └── logic/workflows/scheduling/validateScheduleWorkflow.js
            │           ├── Calls isScheduleContiguous({ selectedDayIndices })
            │           │   └── logic/rules/scheduling/isScheduleContiguous.js
            │           │       └── Returns boolean (no UI concern)
            │           ├── Calls isDateInRange(), isDateBlocked(), etc.
            │           └── Returns { valid: false, errorCode: 'NOT_CONTIGUOUS' }
            │
            ├── Maps errorCode to UI message (presentation concern)
            │   └── 'NOT_CONTIGUOUS' → 'Please select consecutive days'
            └── Returns { validationError } to component
                    ↓
        ListingScheduleSelector.jsx
            └── Renders {validationError && <ErrorBanner>{validationError}</ErrorBanner>}
```

---

### Example 3: Listing Data Loading

#### BEFORE (Monolithic)
```
ViewSplitLeasePage.jsx loads
    ↓
Calls fetchListingComplete(listingId)
    └── lib/listingDataFetcher.js
        ├── Fetches from Supabase
        ├── Transforms data inline (mixed fetching + transforming)
        ├── Parses JSONB fields with parseJsonField()
        ├── Handles missing fields silently (fallback || [])
        └── Returns enriched object
            ↓
ViewSplitLeasePage.jsx
    ├── Defensive checks: if (listing && listing.price) ← Uncertainty
    └── Renders listing
```

#### AFTER (Logic Core)
```
ViewSplitLeasePage.jsx loads
    ↓
Calls fetchRawListingData(listingId)  ← Infrastructure (lib)
    └── lib/listingDataFetcher.js
        ├── Fetches from Supabase
        ├── Returns raw data (NO transformation)
        └── Throws if not found
            ↓
Calls processListingData({ rawListing }) ← Logic Core
    └── logic/processors/listing/processListingData.js
        ├── Validates critical fields (NO FALLBACK)
        │   ├── if (!rawListing._id) throw Error('Missing ID')
        │   └── if (!rawListing.Name) throw Error('Missing Name')
        ├── Parses JSONB with parseJsonArrayField() ← Reusable processor
        ├── Normalizes field names (camelCase)
        └── Returns guaranteed-valid listing object
            ↓
ViewSplitLeasePage.jsx (HOLLOW)
    ├── NO defensive checks needed ← Processor guarantees validity
    └── Renders listing (listing.price is guaranteed to exist)
```

---

## Code Comparison: Before → After

### Pricing Calculation

#### BEFORE
```javascript
// lib/priceCalculations.js - Mixed concerns
export function calculate4WeekRent(nightlyPrice, nightsPerWeek) {
  if (!nightlyPrice || !nightsPerWeek) return 0; // ❌ Fallback hides issues
  return nightlyPrice * nightsPerWeek * 4;
}

// ListingScheduleSelector.jsx - Logic in component
function ListingScheduleSelector({ listing }) {
  const [selectedDays, setSelectedDays] = useState([]);

  // ❌ Business logic in component
  const fourWeekRent = calculate4WeekRent(
    listing.price,
    selectedDays.length
  );

  return <div>Rent: ${fourWeekRent}</div>;
}
```

#### AFTER
```javascript
// logic/calculators/pricing/calculateFourWeekRent.js - Pure function
/**
 * @intent Determine the recurring monthly cost basis before fees.
 */
export function calculateFourWeekRent({ nightlyRate, frequency }) {
  // ✅ No Fallback: Strict validation
  if (typeof nightlyRate !== 'number' || isNaN(nightlyRate)) {
    throw new Error('nightlyRate must be a number')
  }
  if (frequency < 2 || frequency > 7) {
    throw new Error('frequency must be between 2-7')
  }

  return nightlyRate * frequency * 4;
}

// ListingScheduleSelector.jsx - Hollow component
function ListingScheduleSelector({ priceBreakdown, onDayToggle }) {
  // ✅ NO business logic - only rendering
  return (
    <div>
      <PriceDisplay breakdown={priceBreakdown} />
    </div>
  );
}

// useScheduleSelectorLogic.js - Logic hook
function useScheduleSelectorLogic(listing) {
  const [selectedDays, setSelectedDays] = useState([]);

  // ✅ Calls Logic Core
  const priceBreakdown = calculatePricingBreakdown({
    listing,
    nightsPerWeek: selectedDays.length,
    reservationWeeks: 4
  });

  return { priceBreakdown, selectedDays, setSelectedDays };
}
```

---

### Validation Logic

#### BEFORE
```javascript
// lib/availabilityValidation.js - Returns UI message (mixed concern)
export function validateScheduleSelection(selectedDays, listing) {
  const result = { valid: true, errors: [] };

  if (!isContiguousSelection(selectedDays)) {
    result.valid = false;
    result.errors.push('Please check for contiguous nights'); // ❌ UI message
  }

  return result;
}

// ListingScheduleSelector.jsx
const validation = validateScheduleSelection(selectedDays, listing);
if (!validation.valid) {
  return <div className="error">{validation.errors[0]}</div>;
}
```

#### AFTER
```javascript
// logic/rules/scheduling/isScheduleContiguous.js - Pure boolean
/**
 * @intent Enforce the business rule that split lease stays must be consecutive.
 */
export function isScheduleContiguous({ selectedDayIndices }) {
  if (selectedDayIndices.length === 0) return false;
  // ... complex logic ...
  return notSelectedContiguous; // ✅ Just returns boolean
}

// logic/workflows/scheduling/validateScheduleWorkflow.js
export function validateScheduleWorkflow({ selectedDays, listing }) {
  if (!isScheduleContiguous({ selectedDayIndices: selectedDays })) {
    return { valid: false, errorCode: 'NOT_CONTIGUOUS' }; // ✅ Error code, not UI message
  }

  return { valid: true };
}

// ListingScheduleSelector.jsx - UI decides message
const ERROR_MESSAGES = {
  NOT_CONTIGUOUS: 'Please select consecutive days'
};

const validation = validateScheduleWorkflow({ selectedDays, listing });
if (!validation.valid) {
  const message = ERROR_MESSAGES[validation.errorCode];
  return <div className="error">{message}</div>;
}
```

---

## Testing Comparison

### BEFORE: Testing Business Logic Requires React
```javascript
// ❌ Need to mount React component to test pricing logic
import { render } from '@testing-library/react';

test('calculates correct rent', () => {
  const { getByText } = render(
    <ListingScheduleSelector listing={mockListing} />
  );

  // Click days...
  // Hard to test just the calculation
});
```

### AFTER: Pure Unit Tests
```javascript
// ✅ Fast, pure unit tests - no React needed
import { calculateFourWeekRent } from '../logic/calculators/pricing/calculateFourWeekRent.js';

test('calculates correct rent', () => {
  const result = calculateFourWeekRent({
    nightlyRate: 100,
    frequency: 4
  });

  expect(result).toBe(1600); // 100 * 4 * 4
});

test('throws on invalid input', () => {
  expect(() => {
    calculateFourWeekRent({ nightlyRate: null, frequency: 4 });
  }).toThrow('nightlyRate must be a number');
});

// Test 100s of cases in milliseconds
```

---

## AI Discoverability Improvement

### BEFORE: Generic Names (Hard for AI to find)
```
File: lib/utils.js
Function: handleData(data)
Function: check(user)
Function: calc(a, b)

❌ AI search for "pricing calculation" → Hard to find
❌ AI search for "contiguous validation" → Finds nothing
❌ AI search for "can user edit proposal" → Unclear location
```

### AFTER: Intent-Based Names (AI-Friendly)
```
File: logic/calculators/pricing/calculateFourWeekRent.js
Function: calculateFourWeekRent({ nightlyRate, frequency })
JSDoc: @intent Determine the recurring monthly cost basis before fees.

File: logic/rules/scheduling/isScheduleContiguous.js
Function: isScheduleContiguous({ selectedDayIndices })
JSDoc: @intent Enforce the business rule that split lease stays must be consecutive.

File: logic/rules/proposals/canEditProposal.js
Function: canEditProposal({ proposal, user })
JSDoc: @intent Determine if user has permission to edit this proposal.

✅ AI search for "pricing calculation" → Finds calculators/pricing/
✅ AI search for "contiguous validation" → Finds rules/scheduling/isScheduleContiguous.js
✅ AI search for "can user edit proposal" → Finds rules/proposals/canEditProposal.js
```

---

## Summary: Key Transformations

| Aspect | Before | After |
|--------|--------|-------|
| **Logic Location** | Scattered in lib/ and islands/ | Centralized in logic/ |
| **Component Role** | "Smart" - fetch, validate, calculate, render | "Hollow" - only render props |
| **Data Integrity** | Defensive coding (if x && x.y) | Processors guarantee shape |
| **Testability** | Need React to test logic | Pure JS unit tests |
| **Searchability** | Generic names (utils.js, handler) | Intent-based names (calculateFourWeekRent) |
| **No Fallback** | Scattered || fallbacks | Enforced in processors |
| **Dependencies** | Logic → React (can't test without it) | Logic → No dependencies |
| **AI Discoverability** | Hard to find specific logic | Semantic names + JSDoc @intent |
| **Reusability** | Logic tied to components | Logic is portable |
| **Maintainability** | Changes require touching multiple files | Changes isolated to single pillar |

---

**This transformation elevates the codebase from a monolithic mix to a structured, AI-native, maintainable architecture that embodies the "No Fallback" principle and makes the application's business logic explicit, testable, and discoverable.**
