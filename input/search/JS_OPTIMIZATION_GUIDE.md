# JavaScript Optimization Guide

## Current Architecture Overview

The Split Lease Search application uses a hybrid architecture combining vanilla JavaScript with React islands for complex UI components.

## Core JavaScript Files

### 1. app.js (1,481 lines)
**Purpose**: Main application orchestration and state management

**Key Responsibilities**:
- Global state management (selectedDays, allListings)
- Lazy loading with Intersection Observer
- Dynamic price calculations
- Event listener setup
- Filter application
- Google Maps integration

**Optimization Opportunities**:
```javascript
// Current: Global variables scattered
let selectedDays = [1, 2, 3, 4, 5];
let allListings = [];
let loadedListingsCount = 0;

// Recommended: Centralized state object
const AppState = {
  selectedDays: [1, 2, 3, 4, 5],
  allListings: [],
  loadedListingsCount: 0,
  isLoading: false
};
```

**Modularization Plan**:
```
app.js (current) → Split into:
├── core/state.js           # State management
├── core/init.js            # Initialization
├── features/lazy-load.js   # Intersection Observer
├── features/pricing.js     # Price calculations
├── features/filters.js     # Filter logic
├── features/maps.js        # Google Maps
└── utils/dom.js            # DOM helpers
```

### 2. supabase-api.js (741 lines)
**Purpose**: Database API abstraction layer

**Key Responsibilities**:
- Supabase client initialization
- Query building with filters
- Data transformation
- Borough/neighborhood fetching
- Amenity parsing

**Current Structure**:
```javascript
class SupabaseAPI {
  async getListings(filters) {
    // Complex query building
    // Filter application
    // Data transformation
  }

  async getBoroughs() { }
  async getNeighborhoodsByBorough() { }
  async getAmenities() { }
}
```

**Optimization**:
```javascript
// Separate concerns
class SupabaseClient { /* Connection management */ }
class QueryBuilder { /* Query construction */ }
class DataTransformer { /* Data transformation */ }

// Usage
const api = new SupabaseAPI(
  new SupabaseClient(),
  new QueryBuilder(),
  new DataTransformer()
);
```

### 3. filter-config.js (297 lines)
**Purpose**: Filter definitions and mappings

**Key Responsibilities**:
- Borough/neighborhood mappings
- Price tier definitions
- Week pattern mappings
- Sort options configuration

**Current Structure**:
```javascript
const FilterConfig = {
  boroughs: [],
  neighborhoods: [],
  weekPatterns: {},
  priceRanges: {},

  async initializeFilterConfig() {
    // Fetch from database
  }
};
```

**Already Well-Structured**: This file is modular and follows good practices.

## Performance Optimizations

### 1. Debouncing & Throttling

**Current**: Immediate updates on every change
```javascript
// In schedule-selector-integration.js
window.handleScheduleChange = (days) => {
  selectedDays = days;
  updateAllDisplayedPrices(); // Immediate
  applyFilters(); // Immediate
};
```

**Recommended**: Add debouncing
```javascript
const debounce = (fn, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
};

window.handleScheduleChange = debounce((days) => {
  selectedDays = days;
  updateAllDisplayedPrices();
  applyFilters();
}, 300); // 300ms delay
```

### 2. Memoization for Expensive Calculations

**Current**: Recalculate every time
```javascript
function calculateDynamicPrice(listing, selectedDaysCount) {
  const nightsCount = Math.max(selectedDaysCount - 1, 1);
  // Calculation logic
}
```

**Recommended**: Cache results
```javascript
const priceCache = new Map();

function calculateDynamicPrice(listing, selectedDaysCount) {
  const cacheKey = `${listing.id}-${selectedDaysCount}`;

  if (priceCache.has(cacheKey)) {
    return priceCache.get(cacheKey);
  }

  const nightsCount = Math.max(selectedDaysCount - 1, 1);
  const price = /* calculation */;

  priceCache.set(cacheKey, price);
  return price;
}
```

### 3. Lazy Loading Optimization

**Current**: Good implementation with Intersection Observer
```javascript
const INITIAL_LOAD_COUNT = 6;
const LOAD_BATCH_SIZE = 6;
```

**Enhancement**: Add virtual scrolling for very large lists (100+ items)
```javascript
// Consider using libraries like:
// - react-window (for React components)
// - Virtual-Scroller (for vanilla JS)
```

### 4. Event Delegation

**Current**: Individual listeners per card
```javascript
document.querySelectorAll('.listing-card').forEach(card => {
  card.addEventListener('click', handleClick);
});
```

**Recommended**: Single listener on parent
```javascript
document.querySelector('.listings-grid').addEventListener('click', (e) => {
  const card = e.target.closest('.listing-card');
  if (card) handleClick(card);
});
```

## Code Quality Improvements

### 1. Add JSDoc Comments

**Current**:
```javascript
function calculateDynamicPrice(listing, selectedDaysCount) {
  // Implementation
}
```

**Recommended**:
```javascript
/**
 * Calculate dynamic price based on selected days count
 * @param {Object} listing - The listing object from Supabase
 * @param {number} selectedDaysCount - Number of selected days (2-7)
 * @returns {number} The calculated price per night
 */
function calculateDynamicPrice(listing, selectedDaysCount) {
  // Implementation
}
```

### 2. Extract Magic Numbers

**Current**:
```javascript
if (nightsCount >= 2 && nightsCount <= 7) {
  // Logic
}
```

**Recommended**:
```javascript
const MIN_NIGHTS = 2;
const MAX_NIGHTS = 7;

if (nightsCount >= MIN_NIGHTS && nightsCount <= MAX_NIGHTS) {
  // Logic
}
```

### 3. Error Handling

**Current**:
```javascript
async function fetchListings() {
  const data = await api.getListings();
  return data;
}
```

**Recommended**:
```javascript
async function fetchListings() {
  try {
    const data = await api.getListings();
    return data;
  } catch (error) {
    console.error('Failed to fetch listings:', error);
    // Show user-friendly error message
    showErrorToast('Unable to load listings. Please try again.');
    return [];
  }
}
```

## Testing Strategy

### Unit Tests (Recommended)
```javascript
// tests/pricing.test.js
import { calculateDynamicPrice } from '../js/features/pricing.js';

describe('calculateDynamicPrice', () => {
  it('should calculate correct price for 5 nights', () => {
    const listing = {
      'Price 5 nights selected': 150
    };
    const result = calculateDynamicPrice(listing, 6);
    expect(result).toBe(150);
  });
});
```

### Integration Tests
```javascript
// tests/filters.test.js
import { applyFilters } from '../js/features/filters.js';

describe('Filter System', () => {
  it('should filter by borough correctly', async () => {
    const listings = await fetchListings();
    const filtered = applyFilters(listings, {
      boroughs: ['Manhattan']
    });
    expect(filtered.every(l => l.Borough === 'Manhattan')).toBe(true);
  });
});
```

## Migration Path

### Phase 1: Add Tooling (✅ Complete)
- ✅ ESLint configuration
- ✅ Prettier configuration
- ✅ Enhanced package.json scripts

### Phase 2: Code Quality (Current)
1. Run `npm run format` to format all files
2. Run `npm run lint:fix` to fix auto-fixable issues
3. Add JSDoc comments to all functions
4. Extract constants and magic numbers

### Phase 3: Modularization
1. Create `js/utils/` directory
2. Extract utility functions
3. Create `js/features/` directory
4. Move feature-specific code
5. Update imports

### Phase 4: Performance
1. Add debouncing to user inputs
2. Implement memoization for calculations
3. Add virtual scrolling for large lists
4. Optimize image loading

### Phase 5: Testing
1. Install Vitest: `npm install -D vitest`
2. Write unit tests for utilities
3. Write integration tests for features
4. Add E2E tests with Playwright

## Best Practices Going Forward

### 1. Module Pattern
```javascript
// Good: Export specific functions
export function calculatePrice(listing, nights) { }
export function formatPrice(price) { }

// Avoid: Global namespace pollution
window.calculatePrice = function() { };
```

### 2. Async/Await over Promises
```javascript
// Good
async function loadData() {
  const listings = await fetchListings();
  return listings;
}

// Avoid
function loadData() {
  return fetchListings().then(listings => listings);
}
```

### 3. Const over Let
```javascript
// Good: Immutable by default
const listings = await fetchListings();

// Only use let when reassignment is needed
let count = 0;
count++;
```

### 4. Template Literals
```javascript
// Good
const html = `<div class="listing-card" data-id="${id}">`;

// Avoid
const html = '<div class="listing-card" data-id="' + id + '">';
```

### 5. Destructuring
```javascript
// Good
const { Borough, Neighborhood } = listing;

// Avoid
const borough = listing.Borough;
const neighborhood = listing.Neighborhood;
```

## Tools & Commands

### Lint Code
```bash
npm run lint        # Check for issues
npm run lint:fix    # Auto-fix issues
```

### Format Code
```bash
npm run format              # Format all files
npm run format:check        # Check formatting
```

### Type Check
```bash
npm run type-check   # TypeScript type checking
```

### Run All Checks
```bash
npm test   # Lint + Format + Type-check
```

## Resources

- [ESLint Rules](https://eslint.org/docs/rules/)
- [Prettier Options](https://prettier.io/docs/en/options.html)
- [JavaScript Best Practices](https://github.com/airbnb/javascript)
- [Web Performance](https://web.dev/performance/)
- [Testing Library](https://testing-library.com/)

## Summary

The current JavaScript code is functional and well-organized. The main improvements focus on:

1. **Modularity**: Break large files into smaller, focused modules
2. **Performance**: Add debouncing, memoization, and optimization
3. **Quality**: Consistent formatting, linting, and documentation
4. **Testing**: Add unit and integration tests
5. **Maintainability**: Extract utilities, constants, and improve error handling

Start with Phase 2 (Code Quality) and gradually progress through the phases as time and resources allow.

---

**Last Updated**: 2025-11-06
**Status**: ✅ Optimization guide complete
