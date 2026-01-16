# Code Refactoring Plan - app

**Date:** 2026-01-16
**Audit Type:** General (Performance, Maintainability, Duplication, Anti-patterns)
**Total Chunks:** 28
**Priority Order:** CRITICAL → HIGH → MEDIUM → LOW

---

## PAGE GROUP: /search (Chunks: 1, 2, 3, 5, 7, 9, 13, 20, 24, 28)

### CHUNK 1: Consolidate multiple forEach loops into single pass
**File:** `app/src/islands/pages/useSearchPageLogic.js`
**Lines:** 245-268
**Issue:** Performance - O(3n) operations with 3 sequential forEach loops for photo resolution, host ID collection, and host mapping
**Affected Pages:** /search, /search-test, /favorite-listings
**Severity:** CRITICAL

**Current Code:**
```javascript
// Line 245-251: First forEach
data.forEach((listing) => {
  resolvedPhotos[listing._id] = extractPhotos(
    listing['Features - Photos'],
    photoMap,
    listing._id
  )
})

// Line 255-259: Second forEach for host IDs
data.forEach((listing) => {
  if (listing['Host User']) {
    hostIds.add(listing['Host User'])
  }
})

// Line 265-268: Third forEach for host mapping
data.forEach((listing) => {
  const hostId = listing['Host User']
  resolvedHosts[listing._id] = hostMap[hostId] || null
})
```

**Refactored Code:**
```javascript
// Single-pass consolidation using reduce
const { resolvedPhotos, hostIds } = data.reduce((acc, listing) => {
  // Resolve photos in same pass
  acc.resolvedPhotos[listing._id] = extractPhotos(
    listing['Features - Photos'],
    photoMap,
    listing._id
  );

  // Collect host IDs in same pass
  if (listing['Host User']) {
    acc.hostIds.add(listing['Host User']);
  }

  return acc;
}, { resolvedPhotos: {}, hostIds: new Set() });

// Single fetch after collection
const hostMap = await fetchHostData(Array.from(hostIds));

// Single pass for host mapping (must be separate due to async)
const resolvedHosts = {};
data.forEach((listing) => {
  resolvedHosts[listing._id] = hostMap[listing['Host User']] || null;
});
```

**Testing:**
- [ ] Load /search page and verify listings display correctly
- [ ] Verify host names appear on listing cards
- [ ] Verify photos load for all listings
- [ ] Performance: Measure render time before/after (target: 30% reduction)

~~~~~

### CHUNK 2: Add useMemo for expensive listing transformations
**File:** `app/src/islands/pages/useSearchPageLogic.js`
**Lines:** 155-211
**Issue:** Performance - transformListing called on every render for 100+ listings without memoization
**Affected Pages:** /search, /search-test
**Severity:** CRITICAL

**Current Code:**
```javascript
const transformListing = useCallback((dbListing, images, hostData) => {
  const neighborhoodName = getNeighborhoodName(dbListing['Location - Hood'])
  const boroughName = getBoroughName(dbListing['Location - Borough'])
  const propertyType = getPropertyTypeLabel(dbListing['Features - Type of Space'])

  const coordinatesResult = extractListingCoordinates({
    listing: dbListing,
    fallbackLat: null,
    fallbackLng: null
  })

  // ... 50+ more lines of transformation
  return transformedListing
}, []) // Empty dependency array

// Usage (called in map without memoization):
const listings = data.map((listing) =>
  transformListing(listing, resolvedPhotos[listing._id], resolvedHosts[listing._id])
)
```

**Refactored Code:**
```javascript
const transformListing = useCallback((dbListing, images, hostData) => {
  const neighborhoodName = getNeighborhoodName(dbListing['Location - Hood'])
  const boroughName = getBoroughName(dbListing['Location - Borough'])
  const propertyType = getPropertyTypeLabel(dbListing['Features - Type of Space'])

  const coordinatesResult = extractListingCoordinates({
    listing: dbListing,
    fallbackLat: null,
    fallbackLng: null
  })

  // ... transformation logic unchanged
  return transformedListing
}, [])

// Memoize the entire transformation result
const transformedListings = useMemo(() => {
  if (!data || data.length === 0) return [];

  return data.map((listing) =>
    transformListing(
      listing,
      resolvedPhotos[listing._id],
      resolvedHosts[listing._id]
    )
  );
}, [data, resolvedPhotos, resolvedHosts, transformListing]);
```

**Testing:**
- [ ] Verify listings render correctly after memoization
- [ ] Use React DevTools Profiler to confirm reduced re-renders
- [ ] Test filter changes still update listings properly
- [ ] Verify map markers update when filters change

~~~~~

### CHUNK 3: Reduce prop drilling with filter state consolidation
**File:** `app/src/islands/pages/SearchPage.jsx`
**Lines:** 47-63, 172-179
**Issue:** Maintainability - FilterPanel receives 15 props causing unnecessary re-renders
**Affected Pages:** /search
**Severity:** HIGH

**Current Code:**
```javascript
function FilterPanel({
  isActive,
  selectedDays,
  onDaysChange,
  boroughs,
  selectedBorough,
  onBoroughChange,
  neighborhoods,
  selectedNeighborhoods,
  onNeighborhoodsChange,
  weekPattern,
  onWeekPatternChange,
  priceTier,
  onPriceTierChange,
  sortBy,
  onSortByChange
}) {
  return (
    <div className="filter-panel">
      {/* Uses only 5 props directly, passes rest deeper */}
    </div>
  );
}

// In SearchPage render:
<FilterPanel
  isActive={isFilterActive}
  selectedDays={selectedDays}
  onDaysChange={setSelectedDays}
  boroughs={boroughs}
  selectedBorough={selectedBorough}
  onBoroughChange={setSelectedBorough}
  neighborhoods={neighborhoods}
  selectedNeighborhoods={selectedNeighborhoods}
  onNeighborhoodsChange={setSelectedNeighborhoods}
  weekPattern={weekPattern}
  onWeekPatternChange={setWeekPattern}
  priceTier={priceTier}
  onPriceTierChange={setPriceTier}
  sortBy={sortBy}
  onSortByChange={setSortBy}
/>
```

**Refactored Code:**
```javascript
// Define filter state shape
const initialFilters = {
  selectedDays: [],
  selectedBorough: null,
  selectedNeighborhoods: [],
  weekPattern: 'all',
  priceTier: 'all',
  sortBy: 'price-asc'
};

// In useSearchPageLogic.js - use useReducer
const filterReducer = (state, action) => {
  switch (action.type) {
    case 'SET_DAYS':
      return { ...state, selectedDays: action.value };
    case 'SET_BOROUGH':
      return { ...state, selectedBorough: action.value };
    case 'SET_NEIGHBORHOODS':
      return { ...state, selectedNeighborhoods: action.value };
    case 'SET_WEEK_PATTERN':
      return { ...state, weekPattern: action.value };
    case 'SET_PRICE_TIER':
      return { ...state, priceTier: action.value };
    case 'SET_SORT':
      return { ...state, sortBy: action.value };
    case 'RESET':
      return initialFilters;
    default:
      return state;
  }
};

const [filters, dispatch] = useReducer(filterReducer, initialFilters);

const handleFilterChange = useCallback((type, value) => {
  dispatch({ type, value });
}, []);

// Simplified FilterPanel props
function FilterPanel({ isActive, filters, onFilterChange, boroughs, neighborhoods }) {
  return (
    <div className="filter-panel">
      {/* Access via filters.selectedBorough, etc. */}
    </div>
  );
}

// In SearchPage render:
<FilterPanel
  isActive={isFilterActive}
  filters={filters}
  onFilterChange={handleFilterChange}
  boroughs={boroughs}
  neighborhoods={neighborhoods}
/>
```

**Testing:**
- [ ] Verify all filter interactions still work (borough, neighborhood, days, week pattern, price, sort)
- [ ] Confirm URL parameters still sync with filter state
- [ ] Test filter reset functionality
- [ ] Use React DevTools to verify reduced re-renders

~~~~~

### CHUNK 5: Wrap FilterPanel with React.memo
**File:** `app/src/islands/pages/SearchPage.jsx`
**Lines:** 47-180
**Issue:** Performance - Large nested component (130+ lines) re-renders on every parent state change
**Affected Pages:** /search
**Severity:** HIGH

**Current Code:**
```javascript
function FilterPanel({ isActive, selectedDays, onDaysChange, ... }) {
  return (
    <div className="filter-panel">
      {/* 130+ lines of JSX */}
    </div>
  );
}
```

**Refactored Code:**
```javascript
const FilterPanel = React.memo(function FilterPanel({
  isActive,
  filters,
  onFilterChange,
  boroughs,
  neighborhoods
}) {
  return (
    <div className="filter-panel">
      {/* 130+ lines of JSX */}
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison - only re-render if filters actually changed
  return (
    prevProps.isActive === nextProps.isActive &&
    prevProps.filters === nextProps.filters &&
    prevProps.boroughs === nextProps.boroughs &&
    prevProps.neighborhoods === nextProps.neighborhoods
  );
});
```

**Testing:**
- [ ] Verify FilterPanel renders correctly
- [ ] Use React DevTools Profiler to confirm FilterPanel doesn't re-render on unrelated state changes
- [ ] Test that filter changes still trigger proper re-renders
- [ ] Verify map interactions don't cause FilterPanel re-renders

~~~~~

### CHUNK 7: Consolidate duplicate fetch functions
**File:** `app/src/islands/pages/useSearchPageLogic.js`
**Lines:** 217-296, 302-448
**Issue:** Code Duplication - fetchAllActiveListings and fetchListings share 80% identical code
**Affected Pages:** /search, /search-test
**Severity:** HIGH

**Current Code:**
```javascript
// fetchAllActiveListings (lines 217-296):
const fetchAllActiveListings = async () => {
  const { data, error } = await supabase
    .from('listing')
    .select('*')
    .eq('Active?', true)

  // 70 lines of photo/host resolution
  // Transform and return
}

// fetchListings (lines 302-448):
const fetchListings = async () => {
  let query = supabase
    .from('listing')
    .select('*')
    .eq('Active?', true)

  if (borough) query = query.eq('"Location - Borough"', borough.id)
  if (weekPattern) query = query.eq('"Weeks offered"', weekPattern)
  // ... more conditions

  const { data, error } = await query

  // SAME 70 lines of photo/host resolution (duplicated)
  // Transform and return
}
```

**Refactored Code:**
```javascript
// Shared query builder
const buildListingQuery = (options = {}) => {
  let query = supabase.from('listing').select('*').eq('Active?', true);

  if (options.boroughId) {
    query = query.eq('"Location - Borough"', options.boroughId);
  }
  if (options.weekPattern && options.weekPattern !== 'all') {
    query = query.eq('"Weeks offered"', options.weekPattern);
  }
  if (options.minPrice !== undefined) {
    query = query.gte('"Pricing - Monthly"', options.minPrice);
  }
  if (options.maxPrice !== undefined) {
    query = query.lte('"Pricing - Monthly"', options.maxPrice);
  }

  return query;
};

// Shared enrichment function
const enrichListingsWithPhotosAndHosts = async (data) => {
  if (!data || data.length === 0) return [];

  // Consolidate photo and host resolution (from CHUNK 1)
  const { resolvedPhotos, hostIds } = data.reduce((acc, listing) => {
    acc.resolvedPhotos[listing._id] = extractPhotos(
      listing['Features - Photos'],
      photoMap,
      listing._id
    );
    if (listing['Host User']) {
      acc.hostIds.add(listing['Host User']);
    }
    return acc;
  }, { resolvedPhotos: {}, hostIds: new Set() });

  const hostMap = await fetchHostData(Array.from(hostIds));

  const resolvedHosts = {};
  data.forEach((listing) => {
    resolvedHosts[listing._id] = hostMap[listing['Host User']] || null;
  });

  return data.map((listing) =>
    transformListing(listing, resolvedPhotos[listing._id], resolvedHosts[listing._id])
  );
};

// Simplified fetch functions
const fetchAllActiveListings = async () => {
  const { data, error } = await buildListingQuery();
  if (error) throw error;
  return enrichListingsWithPhotosAndHosts(data);
};

const fetchListings = async (filterOptions) => {
  const { data, error } = await buildListingQuery(filterOptions);
  if (error) throw error;
  return enrichListingsWithPhotosAndHosts(data);
};
```

**Testing:**
- [ ] Verify /search page loads all active listings (green pins)
- [ ] Verify filtered listings (purple pins) update correctly
- [ ] Test borough filter changes
- [ ] Test week pattern filter changes
- [ ] Test price tier filter changes
- [ ] Verify both fetch paths produce identical data structure

~~~~~

### CHUNK 9: Add debounce to neighborhood search input
**File:** `app/src/islands/pages/SearchPage.jsx`
**Lines:** 118, 2520-2527
**Issue:** Performance - Each keystroke triggers full page re-render including map with 100+ markers
**Affected Pages:** /search
**Severity:** MEDIUM-HIGH

**Current Code:**
```javascript
// Line 118: state declared
const [neighborhoodSearch, setNeighborhoodSearch] = useState('')

// Line 2520-2527: Used in filter
<NeighborhoodDropdownFilter
  neighborhoodSearch={neighborhoodSearch}
  onNeighborhoodSearchChange={setNeighborhoodSearch}  // Direct setState
/>
```

**Refactored Code:**
```javascript
import { useMemo, useState, useCallback } from 'react';
import debounce from 'lodash/debounce';

// Local state for immediate UI feedback
const [localNeighborhoodSearch, setLocalNeighborhoodSearch] = useState('');

// Debounced state for actual filtering
const [neighborhoodSearch, setNeighborhoodSearch] = useState('');

// Debounced setter (300ms delay)
const debouncedSetSearch = useMemo(
  () => debounce((value) => setNeighborhoodSearch(value), 300),
  []
);

// Cleanup on unmount
useEffect(() => {
  return () => debouncedSetSearch.cancel();
}, [debouncedSetSearch]);

// Handler updates local immediately, debounces filter
const handleNeighborhoodSearchChange = useCallback((value) => {
  setLocalNeighborhoodSearch(value);
  debouncedSetSearch(value);
}, [debouncedSetSearch]);

// In render:
<NeighborhoodDropdownFilter
  neighborhoodSearch={localNeighborhoodSearch}
  onNeighborhoodSearchChange={handleNeighborhoodSearchChange}
/>
```

**Testing:**
- [ ] Verify typing in neighborhood search is responsive (no lag)
- [ ] Verify filtering happens after typing stops (300ms delay)
- [ ] Verify clearing search works correctly
- [ ] Use React DevTools to confirm reduced re-renders during typing

~~~~~

### CHUNK 13: Add debounce to URL parameter updates
**File:** `app/src/islands/pages/useSearchPageLogic.js`
**Lines:** 600+
**Issue:** Performance - Every filter change updates URL immediately, cluttering browser history
**Affected Pages:** /search
**Severity:** MEDIUM

**Current Code:**
```javascript
// URL updates on every filter state change (implied)
useEffect(() => {
  updateUrlParams({
    selectedBorough,
    selectedNeighborhoods,
    weekPattern,
    priceTier,
    sortBy
  });
}, [selectedBorough, selectedNeighborhoods, weekPattern, priceTier, sortBy]);
```

**Refactored Code:**
```javascript
import { useMemo, useEffect } from 'react';
import debounce from 'lodash/debounce';

// Debounced URL update (1 second delay)
const debouncedUrlUpdate = useMemo(
  () => debounce((params) => {
    const url = new URL(window.location.href);

    // Update only changed params
    Object.entries(params).forEach(([key, value]) => {
      if (value && value !== 'all' && (Array.isArray(value) ? value.length > 0 : true)) {
        url.searchParams.set(key, Array.isArray(value) ? value.join(',') : value);
      } else {
        url.searchParams.delete(key);
      }
    });

    // Replace instead of push to avoid history clutter
    window.history.replaceState({}, '', url.toString());
  }, 1000),
  []
);

// Cleanup on unmount
useEffect(() => {
  return () => debouncedUrlUpdate.cancel();
}, [debouncedUrlUpdate]);

// Update URL with debounce
useEffect(() => {
  debouncedUrlUpdate({
    borough: selectedBorough?.id,
    neighborhoods: selectedNeighborhoods.map(n => n.id),
    weekPattern,
    priceTier,
    sortBy
  });
}, [selectedBorough, selectedNeighborhoods, weekPattern, priceTier, sortBy, debouncedUrlUpdate]);
```

**Testing:**
- [ ] Verify URL updates after filter changes (with 1s delay)
- [ ] Verify browser back button works correctly
- [ ] Verify sharing URLs preserves filter state
- [ ] Verify rapid filter changes don't create multiple history entries

~~~~~

### CHUNK 20: Remove console.log statements
**File:** `app/src/islands/pages/useSearchPageLogic.js`
**Lines:** 218, 233, 238, 241, 288, 371, 375, 376, 379, 429
**Issue:** Code Quality - Excessive console.log left in production code
**Affected Pages:** /search
**Severity:** MEDIUM

**Current Code:**
```javascript
console.log('🌍 Fetching ALL active listings...')
console.log('📊 fetchAllActiveListings: Supabase returned', data.length, 'active listings')
console.log('📷 fetchAllActiveListings: Collected', photoIdsArray.length, 'unique photo IDs')
console.log('👤 fetchAllActiveListings: Collected', hostIds.size, 'unique host IDs')
console.log('🔄 fetchAllActiveListings: Transformed', transformedListings.length, 'listings')
```

**Refactored Code:**
```javascript
// Create a debug logger utility (app/src/lib/logger.js)
const isDev = import.meta.env.DEV;

export const logger = {
  debug: (...args) => {
    if (isDev) console.log(...args);
  },
  info: (...args) => {
    if (isDev) console.info(...args);
  },
  warn: (...args) => console.warn(...args),
  error: (...args) => console.error(...args)
};

// Usage in useSearchPageLogic.js:
import { logger } from '@/lib/logger';

logger.debug('🌍 Fetching ALL active listings...');
logger.debug('📊 fetchAllActiveListings: Supabase returned', data.length, 'active listings');
logger.debug('📷 fetchAllActiveListings: Collected', photoIdsArray.length, 'unique photo IDs');
logger.debug('👤 fetchAllActiveListings: Collected', hostIds.size, 'unique host IDs');
logger.debug('🔄 fetchAllActiveListings: Transformed', transformedListings.length, 'listings');
```

**Testing:**
- [ ] Verify no console.log output in production build
- [ ] Verify debug logs appear in development
- [ ] Check browser console is clean in production

~~~~~

### CHUNK 24: Consolidate filter validation patterns
**File:** `app/src/islands/pages/useSearchPageLogic.js`
**Lines:** 139-145
**Issue:** Code Duplication - Repetitive validation pattern
**Affected Pages:** /search
**Severity:** LOW

**Current Code:**
```javascript
const filterValidation = useMemo(() => {
  return {
    isPriceTierValid: isValidPriceTier({ priceTier }),
    isWeekPatternValid: isValidWeekPattern({ weekPattern }),
    isSortOptionValid: isValidSortOption({ sortBy })
  }
}, [priceTier, weekPattern, sortBy])
```

**Refactored Code:**
```javascript
// Define validators map
const FILTER_VALIDATORS = {
  priceTier: isValidPriceTier,
  weekPattern: isValidWeekPattern,
  sortBy: isValidSortOption
};

// Helper to capitalize first letter
const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);

// Dynamic validation
const filterValidation = useMemo(() => {
  const filterState = { priceTier, weekPattern, sortBy };

  return Object.entries(FILTER_VALIDATORS).reduce((acc, [key, validator]) => {
    acc[`is${capitalize(key)}Valid`] = validator({ [key]: filterState[key] });
    return acc;
  }, {});
}, [priceTier, weekPattern, sortBy]);
```

**Testing:**
- [ ] Verify all filter validations return correct boolean values
- [ ] Test with invalid filter values
- [ ] Verify UI responds correctly to invalid filters

~~~~~

### CHUNK 28: Add cleanup for Intersection Observer ref
**File:** `app/src/islands/pages/SearchPage.jsx`
**Lines:** 173
**Issue:** Memory Leak - Intersection Observer not cleaned up on unmount
**Affected Pages:** /search
**Severity:** LOW

**Current Code:**
```javascript
const sentinelRef = useRef(null);

useEffect(() => {
  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      loadMoreListings();
    }
  });

  if (sentinelRef.current) {
    observer.observe(sentinelRef.current);
  }
  // Missing cleanup
}, []);
```

**Refactored Code:**
```javascript
const sentinelRef = useRef(null);

useEffect(() => {
  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      loadMoreListings();
    }
  }, {
    root: null,
    rootMargin: '100px',
    threshold: 0.1
  });

  const currentRef = sentinelRef.current;

  if (currentRef) {
    observer.observe(currentRef);
  }

  // Cleanup on unmount
  return () => {
    if (currentRef) {
      observer.unobserve(currentRef);
    }
    observer.disconnect();
  };
}, [loadMoreListings]);
```

**Testing:**
- [ ] Verify infinite scroll still works
- [ ] Verify no memory leak warnings in React DevTools
- [ ] Test navigating away and back to /search page

~~~~~

## PAGE GROUP: /view-split-lease (Chunks: 8, 10, 17, 23, 25)

### CHUNK 8: Fix missing useEffect dependencies
**File:** `app/src/islands/pages/ViewSplitLeasePage.jsx`
**Lines:** 606-628
**Issue:** Logic Bug - useEffect calls function with dependencies but has empty dependency array
**Affected Pages:** /view-split-lease/:id
**Severity:** MEDIUM-HIGH

**Current Code:**
```javascript
useEffect(() => {
  if (selectedDayObjects.length > 0) {
    const dayNumbers = selectedDayObjects.map(day => day.dayOfWeek);
    const smartDate = calculateSmartMoveInDate(dayNumbers);
    setMoveInDate(smartDate);
  }
}, []); // Empty deps - stale closure risk

const calculateSmartMoveInDate = useCallback((selectedDayNumbers) => {
  const minDate = new Date(minMoveInDate); // References minMoveInDate
  // ...
}, [minMoveInDate]); // Has minMoveInDate dependency
```

**Refactored Code:**
```javascript
useEffect(() => {
  if (selectedDayObjects.length > 0) {
    const dayNumbers = selectedDayObjects.map(day => day.dayOfWeek);
    const smartDate = calculateSmartMoveInDate(dayNumbers);
    setMoveInDate(smartDate);
  }
}, [selectedDayObjects, calculateSmartMoveInDate]); // Include all dependencies

const calculateSmartMoveInDate = useCallback((selectedDayNumbers) => {
  const minDate = new Date(minMoveInDate);
  // ...
}, [minMoveInDate]);
```

**Testing:**
- [ ] Verify move-in date calculates correctly on page load
- [ ] Verify changing selected days updates move-in date
- [ ] Verify minMoveInDate changes (if possible) trigger recalculation
- [ ] Test with different day selections

~~~~~

### CHUNK 10: Consolidate useState calls with useReducer
**File:** `app/src/islands/pages/ViewSplitLeasePage.jsx`
**Lines:** 527-553
**Issue:** Maintainability - 27 separate useState calls create fragmented state
**Affected Pages:** /view-split-lease/:id
**Severity:** MEDIUM

**Current Code:**
```javascript
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);
const [listing, setListing] = useState(null);
const [zatConfig, setZatConfig] = useState(null);
const [moveInDate, setMoveInDate] = useState(getDefaultMoveInDate());
const [strictMode, setStrictMode] = useState(false);
const [selectedDayObjects, setSelectedDayObjects] = useState([]);
// ... 20 more useState calls
const [showTutorialModal, setShowTutorialModal] = useState(false);
const [showPhotoModal, setShowPhotoModal] = useState(false);
const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
const [expandedSections, setExpandedSections] = useState({
  description: false,
  neighborhood: false,
  blockedDates: false
});
```

**Refactored Code:**
```javascript
// Define initial state structure
const initialPageState = {
  // Data loading
  loading: true,
  error: null,

  // Listing data
  listing: null,
  zatConfig: null,
  photos: [],

  // Booking state
  moveInDate: getDefaultMoveInDate(),
  selectedDayObjects: [],
  reservationSpan: 13,
  strictMode: false,
  priceBreakdown: null,

  // UI state
  showTutorialModal: false,
  showPhotoModal: false,
  currentPhotoIndex: 0,
  expandedSections: {
    description: false,
    neighborhood: false,
    blockedDates: false
  },

  // Modals
  isProposalModalOpen: false,
  showAuthModal: false,
  showSuccessModal: false
};

// Define reducer
const pageReducer = (state, action) => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'SET_LISTING':
      return { ...state, listing: action.payload, loading: false };
    case 'SET_BOOKING':
      return { ...state, ...action.payload };
    case 'TOGGLE_SECTION':
      return {
        ...state,
        expandedSections: {
          ...state.expandedSections,
          [action.payload]: !state.expandedSections[action.payload]
        }
      };
    case 'OPEN_MODAL':
      return { ...state, [action.payload]: true };
    case 'CLOSE_MODAL':
      return { ...state, [action.payload]: false };
    case 'SET_PHOTO_INDEX':
      return { ...state, currentPhotoIndex: action.payload };
    default:
      return state;
  }
};

// Usage in component
const [state, dispatch] = useReducer(pageReducer, initialPageState);

// Destructure for convenience
const { loading, error, listing, moveInDate, selectedDayObjects } = state;

// Actions
const setMoveInDate = (date) => dispatch({ type: 'SET_BOOKING', payload: { moveInDate: date } });
const toggleSection = (section) => dispatch({ type: 'TOGGLE_SECTION', payload: section });
const openPhotoModal = () => dispatch({ type: 'OPEN_MODAL', payload: 'showPhotoModal' });
```

**Testing:**
- [ ] Verify page loads correctly with all state
- [ ] Test all modal open/close operations
- [ ] Test section expand/collapse
- [ ] Test booking state changes (days, move-in date)
- [ ] Verify no regressions in existing functionality

~~~~~

### CHUNK 17: Consolidate pricing calculation logic
**File:** `app/src/islands/shared/CreateProposalFlowV2.jsx`, `app/src/lib/scheduleSelector/priceCalculations.js`
**Lines:** Multiple
**Issue:** Code Duplication - Pricing calculations exist in 3 different places
**Affected Pages:** /view-split-lease/:id, /preview-split-lease/:id
**Severity:** MEDIUM

**Current Code:**
```javascript
// In CreateProposalFlowV2.jsx (embedded):
const calculatePrice = (days, span) => {
  const dailyRate = listing.pricing / 30;
  const weeksCount = Math.ceil(span / 7);
  // ... calculation logic
};

// In priceCalculations.js (shared):
export const calculateTotalPrice = (listing, selectedDays, reservationSpan) => {
  // Similar but slightly different calculation
};

// In ViewSplitLeasePage.jsx (own implementation):
const priceBreakdown = useMemo(() => {
  // Yet another calculation approach
}, [listing, selectedDays]);
```

**Refactored Code:**
```javascript
// Single source of truth: app/src/lib/scheduleSelector/priceCalculations.js

/**
 * Calculate price breakdown for a listing reservation
 * @param {Object} params
 * @param {Object} params.listing - Listing object with pricing info
 * @param {number[]} params.selectedDays - Array of day indices (0-6)
 * @param {number} params.reservationSpan - Number of weeks
 * @returns {Object} Price breakdown
 */
export const calculatePriceBreakdown = ({ listing, selectedDays, reservationSpan }) => {
  if (!listing || selectedDays.length === 0) {
    return {
      basePrice: 0,
      totalPrice: 0,
      pricePerDay: 0,
      daysPerWeek: 0,
      totalDays: 0,
      serviceFee: 0
    };
  }

  const monthlyRate = listing['Pricing - Monthly'] || 0;
  const daysPerWeek = selectedDays.length;
  const totalDays = daysPerWeek * reservationSpan;

  // Pro-rate monthly price by days selected
  const dailyRate = monthlyRate / 30;
  const weeklyRate = dailyRate * daysPerWeek;
  const basePrice = weeklyRate * reservationSpan;

  // Service fee calculation (configurable)
  const SERVICE_FEE_PERCENT = 0.10;
  const serviceFee = basePrice * SERVICE_FEE_PERCENT;

  const totalPrice = basePrice + serviceFee;

  return {
    basePrice: Math.round(basePrice * 100) / 100,
    totalPrice: Math.round(totalPrice * 100) / 100,
    pricePerDay: Math.round(dailyRate * 100) / 100,
    daysPerWeek,
    totalDays,
    serviceFee: Math.round(serviceFee * 100) / 100,
    reservationSpan
  };
};

// Usage everywhere:
import { calculatePriceBreakdown } from '@/lib/scheduleSelector/priceCalculations';

const priceBreakdown = useMemo(
  () => calculatePriceBreakdown({ listing, selectedDays, reservationSpan }),
  [listing, selectedDays, reservationSpan]
);
```

**Testing:**
- [ ] Verify price displays correctly on ViewSplitLeasePage
- [ ] Verify price in CreateProposalFlow matches
- [ ] Test with different day/week combinations
- [ ] Verify service fee calculation is consistent
- [ ] Test edge cases (0 days, 1 day, max days)

~~~~~

### CHUNK 23: Extract hardcoded timeout to constant
**File:** `app/src/islands/pages/ViewSplitLeasePage.jsx`
**Lines:** 558-560
**Issue:** Code Quality - Hardcoded timeout value
**Affected Pages:** /view-split-lease/:id
**Severity:** LOW

**Current Code:**
```javascript
const showToast = (message, type = 'success') => {
  setToast({ show: true, message, type });
  setTimeout(() => {
    setToast({ show: false, message: '', type: 'success' });
  }, 4000); // Hardcoded
};
```

**Refactored Code:**
```javascript
// Constants file or top of component
const UI_CONFIG = {
  TOAST_DURATION_MS: 4000,
  DEBOUNCE_DELAY_MS: 300,
  ANIMATION_DURATION_MS: 200
};

const showToast = useCallback((message, type = 'success') => {
  setToast({ show: true, message, type });

  const timeoutId = setTimeout(() => {
    setToast({ show: false, message: '', type: 'success' });
  }, UI_CONFIG.TOAST_DURATION_MS);

  // Return cleanup function for potential early dismissal
  return () => clearTimeout(timeoutId);
}, []);
```

**Testing:**
- [ ] Verify toast appears and disappears correctly
- [ ] Verify timing matches expected duration
- [ ] Test multiple rapid toasts

~~~~~

### CHUNK 25: Ensure consistent JSON parsing error handling
**File:** `app/src/islands/shared/CreateProposalFlowV2.jsx`
**Lines:** 73-81
**Issue:** Error Handling - JSON parsing pattern is good but ensure consistency
**Affected Pages:** /view-split-lease/:id, /preview-split-lease/:id
**Severity:** LOW

**Current Code:**
```javascript
const getSavedProposalDraft = (listingId) => {
  if (!listingId) return null;
  try {
    const saved = localStorage.getItem(`${PROPOSAL_DRAFT_KEY_PREFIX}${listingId}`);
    return saved ? JSON.parse(saved) : null;
  } catch (e) {
    console.warn('Failed to load proposal draft:', e);
    return null;
  }
};
```

**Refactored Code:**
```javascript
// Create a safe JSON parsing utility (app/src/lib/safeJson.js)
export const safeJsonParse = (jsonString, fallback = null) => {
  if (!jsonString) return fallback;

  try {
    return JSON.parse(jsonString);
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('JSON parse failed:', error.message);
    }
    return fallback;
  }
};

// Usage:
import { safeJsonParse } from '@/lib/safeJson';

const getSavedProposalDraft = (listingId) => {
  if (!listingId) return null;

  const saved = localStorage.getItem(`${PROPOSAL_DRAFT_KEY_PREFIX}${listingId}`);
  return safeJsonParse(saved, null);
};
```

**Testing:**
- [ ] Verify valid JSON parses correctly
- [ ] Verify invalid JSON returns fallback
- [ ] Verify no errors thrown on malformed data
- [ ] Test with empty localStorage

~~~~~

## PAGE GROUP: /listing-dashboard (Chunks: 4)

### CHUNK 4: Replace deprecated execCommand with Clipboard API
**File:** `app/src/islands/pages/ListingDashboardPage/useListingDashboardPageLogic.js`
**Lines:** 82-89
**Issue:** Anti-pattern - Using deprecated document.execCommand('copy') and direct DOM manipulation
**Affected Pages:** /listing-dashboard
**Severity:** HIGH

**Current Code:**
```javascript
const textArea = document.createElement('textarea');
textArea.value = listingUrl;
textArea.style.position = 'fixed';
textArea.style.left = '-9999px';
document.body.appendChild(textArea);
textArea.select();
document.execCommand('copy');
document.body.removeChild(textArea);
```

**Refactored Code:**
```javascript
/**
 * Copy text to clipboard using modern Clipboard API
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} - Success status
 */
const copyToClipboard = async (text) => {
  // Modern Clipboard API (preferred)
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      console.error('Clipboard API failed:', error);
      // Fall through to fallback only if API fails
    }
  }

  // Fallback for older browsers (Safari < 13.1, older mobile)
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.cssText = 'position:fixed;left:-9999px;top:-9999px';
    textArea.setAttribute('readonly', ''); // Prevent zoom on iOS
    document.body.appendChild(textArea);
    textArea.select();
    textArea.setSelectionRange(0, text.length); // iOS support
    const success = document.execCommand('copy');
    document.body.removeChild(textArea);
    return success;
  } catch (error) {
    console.error('Fallback copy failed:', error);
    return false;
  }
};

// Usage in component:
const handleCopyLink = async () => {
  const success = await copyToClipboard(listingUrl);
  if (success) {
    showToast('Link copied to clipboard!');
  } else {
    showToast('Failed to copy link', 'error');
  }
};
```

**Testing:**
- [ ] Test copy functionality in Chrome (modern API)
- [ ] Test copy functionality in Safari
- [ ] Test copy functionality on mobile
- [ ] Verify toast feedback appears
- [ ] Test with long URLs

~~~~~

## PAGE GROUP: /rental-application (Chunks: 14, 27)

### CHUNK 14: Add memoization to form field components
**File:** `app/src/islands/pages/RentalApplicationPage.jsx`
**Lines:** Throughout component
**Issue:** Performance - 50+ form field components re-render on every parent state change
**Affected Pages:** /rental-application
**Severity:** MEDIUM

**Current Code:**
```javascript
// Each render creates new objects for props:
{formSections.map(section => (
  <FormSection
    key={section.id}
    title={section.title}
    fields={section.fields}
    onChange={handleInputChange}
    onBlur={handleInputBlur}
  />
))}

const handleInputChange = (fieldName, value) => {
  setFormData(prev => ({...prev, [fieldName]: value}));
};
```

**Refactored Code:**
```javascript
// Memoize callbacks
const handleInputChange = useCallback((fieldName, value) => {
  setFormData(prev => ({ ...prev, [fieldName]: value }));
}, []);

const handleInputBlur = useCallback((fieldName) => {
  validateField(fieldName);
}, [validateField]);

// Memoize section data
const memoizedSections = useMemo(() => formSections, [formSections]);

// Wrap FormSection with React.memo
const FormSection = React.memo(function FormSection({
  title,
  fields,
  formData,
  errors,
  onChange,
  onBlur
}) {
  return (
    <div className="form-section">
      <h3>{title}</h3>
      {fields.map(field => (
        <FormField
          key={field.name}
          field={field}
          value={formData[field.name]}
          error={errors[field.name]}
          onChange={onChange}
          onBlur={onBlur}
        />
      ))}
    </div>
  );
});

// Also memoize individual fields
const FormField = React.memo(function FormField({
  field,
  value,
  error,
  onChange,
  onBlur
}) {
  const handleChange = useCallback((e) => {
    onChange(field.name, e.target.value);
  }, [field.name, onChange]);

  const handleBlur = useCallback(() => {
    onBlur(field.name);
  }, [field.name, onBlur]);

  return (
    <div className="form-field">
      <label>{field.label}</label>
      <input
        type={field.type}
        value={value || ''}
        onChange={handleChange}
        onBlur={handleBlur}
      />
      {error && <span className="error">{error}</span>}
    </div>
  );
});
```

**Testing:**
- [ ] Verify form fields render correctly
- [ ] Test typing in fields (should be responsive)
- [ ] Use React DevTools Profiler to confirm reduced re-renders
- [ ] Verify validation still works on blur
- [ ] Test form submission

~~~~~

### CHUNK 27: Add input validation attributes
**File:** `app/src/islands/pages/RentalApplicationPage.jsx`
**Lines:** Throughout form fields
**Issue:** Error Handling - Some inputs lack basic validation
**Affected Pages:** /rental-application
**Severity:** LOW

**Current Code:**
```javascript
<input
  type="text"
  value={formData.fullName}
  onChange={(e) => handleInputChange('fullName', e.target.value)}
/>
```

**Refactored Code:**
```javascript
// Define field configurations with validation rules
const FIELD_CONFIG = {
  fullName: {
    type: 'text',
    label: 'Full Name',
    maxLength: 100,
    pattern: "[a-zA-Z\\s\\-']+",
    required: true,
    sanitize: (value) => value.replace(/[^a-zA-Z\s\-']/g, '')
  },
  email: {
    type: 'email',
    label: 'Email Address',
    maxLength: 254,
    required: true,
    pattern: '[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,}$'
  },
  phone: {
    type: 'tel',
    label: 'Phone Number',
    maxLength: 20,
    pattern: '[0-9\\-\\+\\(\\)\\s]+',
    sanitize: (value) => value.replace(/[^0-9\-\+\(\)\s]/g, '')
  }
};

// Enhanced input component
const ValidatedInput = ({ fieldName, value, onChange, config }) => {
  const handleChange = (e) => {
    let newValue = e.target.value;

    // Apply sanitization if defined
    if (config.sanitize) {
      newValue = config.sanitize(newValue);
    }

    onChange(fieldName, newValue);
  };

  return (
    <input
      type={config.type}
      value={value || ''}
      onChange={handleChange}
      maxLength={config.maxLength}
      pattern={config.pattern}
      required={config.required}
      aria-label={config.label}
    />
  );
};

// Usage:
<ValidatedInput
  fieldName="fullName"
  value={formData.fullName}
  onChange={handleInputChange}
  config={FIELD_CONFIG.fullName}
/>
```

**Testing:**
- [ ] Verify maxLength prevents overly long input
- [ ] Verify pattern validation works on form submit
- [ ] Test sanitization removes invalid characters
- [ ] Verify required fields show validation errors
- [ ] Test with various input types (names, emails, phones)

~~~~~

## PAGE GROUP: AUTO - Shared/Multiple Pages (Chunks: 6, 11, 12, 15, 16, 18, 19, 21, 22, 26)

### CHUNK 6: Extract nested components from SearchPage
**File:** `app/src/islands/pages/SearchPage.jsx`
**Lines:** 1-2976
**Issue:** Maintainability - 2,976 line file violates hollow component pattern
**Affected Pages:** /search, /search-test
**Severity:** HIGH

**Current Code:**
```javascript
// SearchPage.jsx - 2976 lines with embedded components:
// Line 47+: Nested FilterPanel component (130 lines)
function FilterPanel({ ... }) { /* embedded */ }

// Line 180+: Nested MobileFilterBar component
function MobileFilterBar({ ... }) { /* embedded */ }

// Line 250+: Nested CompactScheduleIndicator component
function CompactScheduleIndicator({ ... }) { /* embedded */ }

// Line 318-398: 80 lines of state declarations
// Line 606+: Multiple massive useEffect hooks
```

**Refactored Code:**
```
// New file structure:
SearchPage/
├── SearchPage.jsx              // Pure render (100-200 lines)
├── useSearchPageLogic.js       // Already exists - state management
├── components/
│   ├── FilterPanel/
│   │   ├── FilterPanel.jsx
│   │   ├── FilterPanel.module.css
│   │   └── index.js
│   ├── MobileFilterBar/
│   │   ├── MobileFilterBar.jsx
│   │   └── index.js
│   ├── CompactScheduleIndicator/
│   │   ├── CompactScheduleIndicator.jsx
│   │   └── index.js
│   ├── SearchResultsGrid/
│   │   ├── SearchResultsGrid.jsx
│   │   └── index.js
│   └── index.js                // Barrel export
└── hooks/
    ├── useFilterState.js       // Filter reducer logic
    ├── useMapState.js          // Map-related state
    └── useInfiniteScroll.js    // Pagination logic
```

```javascript
// SearchPage.jsx after refactor:
import { FilterPanel, MobileFilterBar, SearchResultsGrid } from './components';
import { useSearchPageLogic } from './useSearchPageLogic';

export function SearchPage() {
  const logic = useSearchPageLogic();

  return (
    <div className="search-page">
      <Header />

      <div className="search-layout">
        <FilterPanel
          filters={logic.filters}
          onFilterChange={logic.handleFilterChange}
        />

        <MobileFilterBar
          isOpen={logic.isMobileFilterOpen}
          onToggle={logic.toggleMobileFilter}
        />

        <SearchResultsGrid
          listings={logic.listings}
          isLoading={logic.isLoading}
          onLoadMore={logic.loadMore}
        />

        <GoogleMap
          listings={logic.mapListings}
          selectedListing={logic.selectedListing}
          onMarkerClick={logic.handleMarkerClick}
        />
      </div>

      <Footer />
    </div>
  );
}
```

**Testing:**
- [ ] Verify all extracted components render correctly
- [ ] Test FilterPanel interactions
- [ ] Test MobileFilterBar toggle
- [ ] Test infinite scroll in SearchResultsGrid
- [ ] Verify no functionality regression
- [ ] Run existing tests

~~~~~

### CHUNK 11: Add loading states to GoogleMap
**File:** `app/src/islands/shared/GoogleMap.jsx`
**Lines:** ~1212
**Issue:** UX - No loading skeleton or error boundary when map markers are loading
**Affected Pages:** /search, /view-split-lease/:id, /favorite-listings
**Severity:** MEDIUM

**Current Code:**
```javascript
// GoogleMap renders without loading state
<div className="google-map-container">
  {/* Map renders immediately, markers pop in later */}
</div>
```

**Refactored Code:**
```javascript
// Add loading state prop and skeleton
const GoogleMap = React.memo(function GoogleMap({
  listings,
  isLoadingMarkers = false,
  onMarkerClick,
  ...props
}) {
  return (
    <div className="google-map-container">
      {isLoadingMarkers && (
        <div className="map-loading-overlay">
          <div className="map-skeleton">
            <div className="skeleton-pulse" />
            <span className="loading-text">Loading listings...</span>
          </div>
        </div>
      )}

      <div className={`map-content ${isLoadingMarkers ? 'loading' : ''}`}>
        {/* Existing map implementation */}
      </div>
    </div>
  );
});

// CSS for loading state
/*
.map-loading-overlay {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.map-content.loading {
  pointer-events: none;
  opacity: 0.5;
}

.skeleton-pulse {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
*/
```

**Testing:**
- [ ] Verify loading state appears when markers are loading
- [ ] Verify loading overlay disappears when markers load
- [ ] Test on slow network (throttled)
- [ ] Verify map is still interactive after loading

~~~~~

### CHUNK 12: Add lazy loading to listing card images
**File:** `app/src/islands/shared/ListingCard/PropertyCard.jsx`
**Lines:** ~1454
**Issue:** Performance - All listing card images load immediately, even if off-screen
**Affected Pages:** /search, /favorite-listings
**Severity:** MEDIUM

**Current Code:**
```javascript
<img
  src={listing.images[0]}
  alt={listing.title}
  className="listing-image"
/>
```

**Refactored Code:**
```javascript
// Option 1: Native lazy loading (simplest)
<img
  src={listing.images[0]}
  alt={listing.title}
  className="listing-image"
  loading="lazy"
  decoding="async"
/>

// Option 2: Custom hook with Intersection Observer (more control)
const useLazyImage = (src, options = {}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '100px', ...options }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return { imgRef, isInView, isLoaded, setIsLoaded };
};

// Usage:
const LazyImage = ({ src, alt, className, placeholder }) => {
  const { imgRef, isInView, isLoaded, setIsLoaded } = useLazyImage(src);

  return (
    <div ref={imgRef} className={`lazy-image-container ${className}`}>
      {!isLoaded && (
        <div className="image-placeholder">
          {placeholder || <div className="skeleton-image" />}
        </div>
      )}
      {isInView && (
        <img
          src={src}
          alt={alt}
          onLoad={() => setIsLoaded(true)}
          className={`lazy-image ${isLoaded ? 'loaded' : ''}`}
        />
      )}
    </div>
  );
};

// In PropertyCard:
<LazyImage
  src={listing.images[0]}
  alt={listing.title}
  className="listing-image"
  placeholder={<div className="image-skeleton" />}
/>
```

**Testing:**
- [ ] Verify images load only when scrolled into view
- [ ] Verify placeholder shows before image loads
- [ ] Test rapid scrolling behavior
- [ ] Verify no layout shift when images load
- [ ] Test on slow network

~~~~~

### CHUNK 15: Create constants file for database field names
**File:** Multiple pages
**Lines:** Throughout
**Issue:** Maintainability - Magic strings for field names scattered across codebase
**Affected Pages:** AUTO
**Severity:** MEDIUM

**Current Code:**
```javascript
// Different files use field name strings directly:
dbListing['Location - Hood']
dbListing['Location - Borough']
dbListing['Features - Type of Space']
dbListing['Features - Photos']
dbListing['Features - SQFT Area']
dbListing['Pricing - Monthly']
dbListing['Host User']
dbListing['Active?']
```

**Refactored Code:**
```javascript
// Create: app/src/lib/constants/listingFields.js

/**
 * Database field names for listings table
 * Single source of truth for all field references
 */
export const LISTING_FIELDS = {
  // Identification
  ID: '_id',
  ACTIVE: 'Active?',

  // Location
  LOCATION_HOOD: 'Location - Hood',
  LOCATION_BOROUGH: 'Location - Borough',
  LOCATION_ADDRESS: 'Location - Address',
  LOCATION_LAT: 'Location - Latitude',
  LOCATION_LNG: 'Location - Longitude',

  // Features
  FEATURE_TYPE: 'Features - Type of Space',
  FEATURE_PHOTOS: 'Features - Photos',
  FEATURE_SQFT: 'Features - SQFT Area',
  FEATURE_BEDROOMS: 'Features - Qty Bedrooms',
  FEATURE_BATHROOMS: 'Features - Qty Bathrooms',
  FEATURE_AMENITIES: 'Features - Amenities',

  // Pricing
  PRICING_MONTHLY: 'Pricing - Monthly',
  PRICING_WEEKLY: 'Pricing - Weekly',
  PRICING_DEPOSIT: 'Pricing - Deposit',

  // Scheduling
  WEEKS_OFFERED: 'Weeks offered',
  DAYS_AVAILABLE: 'Days Available',
  MIN_MOVE_IN: 'Min Move-In Date',

  // Host
  HOST_USER: 'Host User',
  HOST_NAME: 'Host Name'
};

// Also create type for TypeScript users (optional):
// export type ListingFieldKey = keyof typeof LISTING_FIELDS;

// Usage throughout codebase:
import { LISTING_FIELDS } from '@/lib/constants/listingFields';

// Before: dbListing['Location - Hood']
// After:
const neighborhoodId = dbListing[LISTING_FIELDS.LOCATION_HOOD];
const boroughId = dbListing[LISTING_FIELDS.LOCATION_BOROUGH];
const photos = dbListing[LISTING_FIELDS.FEATURE_PHOTOS];
const price = dbListing[LISTING_FIELDS.PRICING_MONTHLY];
```

**Testing:**
- [ ] Search codebase for direct string usage and replace
- [ ] Verify all field references resolve correctly
- [ ] Run existing tests to catch any mismatches
- [ ] Test critical flows (search, view listing, create proposal)

~~~~~

### CHUNK 16: Add error boundaries to major page sections
**File:** Multiple pages
**Lines:** Page component wrappers
**Issue:** Error Handling - Component crash crashes entire page
**Affected Pages:** AUTO
**Severity:** MEDIUM

**Current Code:**
```javascript
// Pages render without error boundaries
function SearchPage() {
  return (
    <div className="search-page">
      <Header />
      <FilterPanel />
      <ListingsGrid />
      <GoogleMap />
      <Footer />
    </div>
  );
}
```

**Refactored Code:**
```javascript
// Create: app/src/islands/shared/ErrorBoundary.jsx

import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log to error reporting service
    console.error('ErrorBoundary caught:', error, errorInfo);

    // Optional: Send to monitoring service
    // reportError(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="error-boundary-fallback">
          <h3>Something went wrong</h3>
          <p>Please try refreshing the page.</p>
          <button onClick={() => this.setState({ hasError: false })}>
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Section-specific fallbacks
const MapErrorFallback = ({ onRetry }) => (
  <div className="map-error">
    <p>Map failed to load</p>
    <button onClick={onRetry}>Reload Map</button>
  </div>
);

const ListingsErrorFallback = ({ onRetry }) => (
  <div className="listings-error">
    <p>Failed to load listings</p>
    <button onClick={onRetry}>Retry</button>
  </div>
);

// Usage in pages:
function SearchPage() {
  const { refetchListings, refetchMap } = useSearchPageLogic();

  return (
    <div className="search-page">
      <ErrorBoundary fallback={<div>Header error</div>}>
        <Header />
      </ErrorBoundary>

      <ErrorBoundary fallback={<ListingsErrorFallback onRetry={refetchListings} />}>
        <FilterPanel />
        <ListingsGrid />
      </ErrorBoundary>

      <ErrorBoundary fallback={<MapErrorFallback onRetry={refetchMap} />}>
        <GoogleMap />
      </ErrorBoundary>

      <Footer />
    </div>
  );
}
```

**Testing:**
- [ ] Test error boundary catches rendering errors
- [ ] Verify fallback UI displays correctly
- [ ] Test "Try Again" button resets error state
- [ ] Verify other sections remain functional when one fails
- [ ] Test with intentionally thrown errors

~~~~~

### CHUNK 18: Add safe navigation helper
**File:** Multiple pages
**Lines:** Throughout
**Issue:** Security - Links opened with window.location.href without validation
**Affected Pages:** AUTO
**Severity:** MEDIUM

**Current Code:**
```javascript
// Direct navigation without validation
window.location.href = `/guest-proposals?proposal=${proposalForListing._id}`;
window.location.href = listingUrl;
```

**Refactored Code:**
```javascript
// Create: app/src/lib/navigation.js

/**
 * Safely navigate to internal paths
 * Validates path before navigation to prevent open redirect vulnerabilities
 * @param {string} path - Internal path to navigate to
 * @returns {boolean} - Whether navigation was successful
 */
export const navigateTo = (path) => {
  // Validate path is internal (starts with /)
  if (typeof path !== 'string') {
    console.error('navigateTo: Invalid path type', typeof path);
    return false;
  }

  // Must start with / for internal routes
  if (!path.startsWith('/')) {
    console.error('navigateTo: Path must start with /', path);
    return false;
  }

  // Prevent protocol-relative URLs (//evil.com)
  if (path.startsWith('//')) {
    console.error('navigateTo: Protocol-relative URLs not allowed', path);
    return false;
  }

  // Sanitize path parameters (basic XSS prevention)
  const sanitizedPath = path.replace(/[<>"']/g, '');

  window.location.href = sanitizedPath;
  return true;
};

/**
 * Open external URL in new tab with security attributes
 * @param {string} url - External URL to open
 */
export const openExternal = (url) => {
  if (typeof url !== 'string') {
    console.error('openExternal: Invalid URL type');
    return;
  }

  // Validate URL format
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      console.error('openExternal: Invalid protocol', parsed.protocol);
      return;
    }
  } catch {
    console.error('openExternal: Invalid URL format', url);
    return;
  }

  // Open with security attributes
  window.open(url, '_blank', 'noopener,noreferrer');
};

// Usage:
import { navigateTo, openExternal } from '@/lib/navigation';

// Internal navigation
navigateTo(`/guest-proposals?proposal=${proposalId}`);
navigateTo(`/view-split-lease/${listingId}`);

// External links
openExternal('https://example.com/help');
```

**Testing:**
- [ ] Verify internal navigation works
- [ ] Test that invalid paths are rejected
- [ ] Test external links open in new tab
- [ ] Verify protocol-relative URLs are blocked
- [ ] Test with special characters in path

~~~~~

### CHUNK 19: Add ARIA labels to interactive elements
**File:** Multiple components
**Lines:** Throughout
**Issue:** Accessibility - Missing ARIA labels and keyboard navigation
**Affected Pages:** AUTO
**Severity:** MEDIUM

**Current Code:**
```javascript
// Missing accessibility attributes
<div
  className="clickable-card"
  onClick={handleClick}
>
  {content}
</div>

<button onClick={onClose}>
  <XIcon />
</button>
```

**Refactored Code:**
```javascript
// Create accessible interactive patterns

// Clickable card with full accessibility
<div
  className="clickable-card"
  onClick={handleClick}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  }}
  role="button"
  tabIndex={0}
  aria-label={`View ${listing.title} listing`}
>
  {content}
</div>

// Icon-only button with label
<button
  onClick={onClose}
  aria-label="Close modal"
  className="icon-button"
>
  <XIcon aria-hidden="true" />
</button>

// Create reusable accessible button component
const AccessibleButton = ({
  children,
  onClick,
  ariaLabel,
  disabled = false,
  className = ''
}) => (
  <button
    onClick={onClick}
    aria-label={ariaLabel}
    disabled={disabled}
    className={className}
    aria-disabled={disabled}
  >
    {children}
  </button>
);

// Accessible clickable div (when button isn't appropriate)
const ClickableDiv = ({
  children,
  onClick,
  ariaLabel,
  className = ''
}) => (
  <div
    role="button"
    tabIndex={0}
    onClick={onClick}
    onKeyDown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick(e);
      }
    }}
    aria-label={ariaLabel}
    className={className}
  >
    {children}
  </div>
);

// Usage:
<ClickableDiv
  onClick={() => navigateTo(`/view-split-lease/${listing.id}`)}
  ariaLabel={`View details for ${listing.title} in ${listing.neighborhood}`}
  className="listing-card"
>
  <ListingCardContent listing={listing} />
</ClickableDiv>

<AccessibleButton
  onClick={handleFavorite}
  ariaLabel={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
  className="favorite-button"
>
  <HeartIcon filled={isFavorited} aria-hidden="true" />
</AccessibleButton>
```

**Testing:**
- [ ] Test keyboard navigation (Tab, Enter, Space)
- [ ] Run accessibility audit (Lighthouse, axe)
- [ ] Test with screen reader (VoiceOver, NVDA)
- [ ] Verify focus indicators are visible
- [ ] Test skip links and focus trapping in modals

~~~~~

### CHUNK 21: Add skeleton loaders to profile cards
**File:** `app/src/islands/pages/AccountProfilePage/components/cards`
**Lines:** Throughout card components
**Issue:** UX - Cards don't show loading state, content pops in
**Affected Pages:** /account-profile/:userId
**Severity:** MEDIUM

**Current Code:**
```javascript
// Card renders empty until data loads
function ProfileCard({ userData, isLoading }) {
  if (isLoading) return null; // Or just blank

  return (
    <div className="profile-card">
      <h2>{userData.name}</h2>
      <p>{userData.email}</p>
    </div>
  );
}
```

**Refactored Code:**
```javascript
// Create: app/src/islands/shared/Skeleton.jsx

const Skeleton = ({ width = '100%', height = '1rem', className = '' }) => (
  <div
    className={`skeleton ${className}`}
    style={{ width, height }}
    aria-hidden="true"
  />
);

const SkeletonText = ({ lines = 3, className = '' }) => (
  <div className={`skeleton-text ${className}`}>
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton
        key={i}
        width={i === lines - 1 ? '60%' : '100%'}
        height="0.875rem"
        className="skeleton-line"
      />
    ))}
  </div>
);

// Profile card with loading state
function ProfileCard({ userData, isLoading }) {
  if (isLoading) {
    return (
      <div className="profile-card profile-card--loading" aria-busy="true">
        <Skeleton width="80px" height="80px" className="avatar-skeleton" />
        <div className="profile-card__content">
          <Skeleton width="150px" height="1.5rem" className="name-skeleton" />
          <Skeleton width="200px" height="1rem" className="email-skeleton" />
          <SkeletonText lines={2} />
        </div>
      </div>
    );
  }

  return (
    <div className="profile-card">
      <img src={userData.avatar} alt="" className="avatar" />
      <div className="profile-card__content">
        <h2>{userData.name}</h2>
        <p>{userData.email}</p>
        <p>{userData.bio}</p>
      </div>
    </div>
  );
}

// CSS for skeletons
/*
.skeleton {
  background: linear-gradient(
    90deg,
    #f0f0f0 25%,
    #e8e8e8 50%,
    #f0f0f0 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
  border-radius: 4px;
}

.skeleton-line {
  margin-bottom: 0.5rem;
}

.skeleton-line:last-child {
  margin-bottom: 0;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
*/
```

**Testing:**
- [ ] Verify skeleton appears during loading
- [ ] Verify smooth transition when data loads
- [ ] Test skeleton dimensions match actual content
- [ ] Verify no layout shift when content replaces skeleton
- [ ] Test with slow network

~~~~~

### CHUNK 22: Standardize error handling pattern
**File:** Multiple files
**Lines:** Throughout
**Issue:** Error Handling - Inconsistent try/catch, .catch(), and silent failures
**Affected Pages:** AUTO
**Severity:** LOW-MEDIUM

**Current Code:**
```javascript
// Style 1: try/catch
try {
  const result = await submitProposal(data);
} catch (error) {
  console.error('Error:', error);
}

// Style 2: .catch()
fetch(url).catch(error => {
  // Handle
});

// Style 3: Silent fail
updateListing(data); // If fails, no error message
```

**Refactored Code:**
```javascript
// Create: app/src/lib/result.js

/**
 * Result type for consistent error handling
 * Inspired by Rust's Result<T, E>
 */
export const Result = {
  ok: (data) => ({ ok: true, data, error: null }),
  err: (error) => ({ ok: false, data: null, error })
};

/**
 * Wrap async operations with consistent error handling
 * @param {Promise} promise - Promise to wrap
 * @returns {Promise<{ok: boolean, data: any, error: Error|null}>}
 */
export const tryCatch = async (promise) => {
  try {
    const data = await promise;
    return Result.ok(data);
  } catch (error) {
    return Result.err(error);
  }
};

/**
 * Handle API responses consistently
 */
export const handleApiResponse = async (response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    return Result.err({
      status: response.status,
      message: errorData.message || 'Request failed',
      ...errorData
    });
  }

  const data = await response.json();
  return Result.ok(data);
};

// Usage pattern:
import { tryCatch, Result } from '@/lib/result';

const handleSubmit = async () => {
  setIsSubmitting(true);

  const result = await tryCatch(submitProposal(proposalData));

  setIsSubmitting(false);

  if (!result.ok) {
    showToast(`Failed to submit: ${result.error.message}`, 'error');
    return;
  }

  showToast('Proposal submitted successfully!', 'success');
  navigateTo(`/guest-proposals?proposal=${result.data.id}`);
};

// API call wrapper
const fetchListings = async (filters) => {
  const result = await tryCatch(
    supabase
      .from('listing')
      .select('*')
      .eq('Active?', true)
  );

  if (!result.ok) {
    console.error('Failed to fetch listings:', result.error);
    return [];
  }

  return result.data;
};
```

**Testing:**
- [ ] Verify successful operations return ok: true
- [ ] Verify failed operations return ok: false with error
- [ ] Test error messages display correctly to user
- [ ] Verify no silent failures
- [ ] Test network error handling

~~~~~

### CHUNK 26: Add memoization to lookup functions
**File:** `app/src/lib/dataLookups.js`
**Lines:** Throughout
**Issue:** Performance - Lookup functions called thousands of times without caching
**Affected Pages:** AUTO
**Severity:** LOW

**Current Code:**
```javascript
// Called once per listing per render
const getNeighborhoodName = (hoodId) => {
  const neighborhood = NEIGHBORHOODS.find(n => n.id === hoodId);
  return neighborhood?.name || 'Unknown';
};

const getBoroughName = (boroughId) => {
  const borough = BOROUGHS.find(b => b.id === boroughId);
  return borough?.name || 'Unknown';
};
```

**Refactored Code:**
```javascript
// Create memoized lookup with LRU-like cache

/**
 * Create a memoized lookup function with cache
 * @param {Function} lookupFn - Original lookup function
 * @param {number} maxSize - Max cache size (default 1000)
 * @returns {Function} Memoized lookup function
 */
const createMemoizedLookup = (lookupFn, maxSize = 1000) => {
  const cache = new Map();

  return (key) => {
    if (key === null || key === undefined) {
      return lookupFn(key);
    }

    if (cache.has(key)) {
      return cache.get(key);
    }

    const result = lookupFn(key);

    // Simple LRU: delete oldest if at capacity
    if (cache.size >= maxSize) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }

    cache.set(key, result);
    return result;
  };
};

// Memoized lookups
export const getNeighborhoodName = createMemoizedLookup((hoodId) => {
  const neighborhood = NEIGHBORHOODS.find(n => n.id === hoodId);
  return neighborhood?.name || 'Unknown';
});

export const getBoroughName = createMemoizedLookup((boroughId) => {
  const borough = BOROUGHS.find(b => b.id === boroughId);
  return borough?.name || 'Unknown';
});

export const getPropertyTypeLabel = createMemoizedLookup((typeId) => {
  const type = PROPERTY_TYPES.find(t => t.id === typeId);
  return type?.label || 'Unknown';
});

// For even better performance, pre-build lookup maps
const buildLookupMap = (items, keyField = 'id', valueField = 'name') => {
  const map = new Map();
  items.forEach(item => {
    map.set(item[keyField], item[valueField]);
  });
  return map;
};

const NEIGHBORHOOD_MAP = buildLookupMap(NEIGHBORHOODS);
const BOROUGH_MAP = buildLookupMap(BOROUGHS);

// O(1) lookups
export const getNeighborhoodNameFast = (hoodId) =>
  NEIGHBORHOOD_MAP.get(hoodId) || 'Unknown';

export const getBoroughNameFast = (boroughId) =>
  BOROUGH_MAP.get(boroughId) || 'Unknown';
```

**Testing:**
- [ ] Verify lookups return correct values
- [ ] Verify cache hits on repeated lookups
- [ ] Benchmark performance improvement
- [ ] Test with unknown IDs (should return 'Unknown')
- [ ] Verify no memory issues with large datasets

~~~~~

## IMPLEMENTATION PRIORITY

### Phase 1: Critical Performance (Chunks 1, 2, 4)
- Single-pass data processing
- Memoization of expensive transforms
- Modern API usage

### Phase 2: High Impact Refactoring (Chunks 3, 5, 6, 7, 8)
- Prop drilling reduction
- Component extraction
- Code deduplication
- Bug fixes

### Phase 3: Medium Priority (Chunks 9-17)
- Debouncing
- State consolidation
- Loading states
- Constants extraction

### Phase 4: Polish (Chunks 18-28)
- Security improvements
- Accessibility
- Error handling standardization
- Code quality

---

## DEPENDENCIES

- Chunk 3 should be done before Chunk 5 (FilterPanel restructure before memo)
- Chunk 1 should be done before Chunk 7 (consolidation pattern needed for dedup)
- Chunk 6 can run parallel with other chunks (file restructure is independent)
- Chunks 15-22 are independent and can be done in any order

---

## ESTIMATED IMPACT

| Metric | Current | Expected After |
|--------|---------|----------------|
| SearchPage bundle size | ~180KB | ~120KB (33% reduction) |
| Initial render time | ~800ms | ~400ms (50% reduction) |
| Re-render on filter change | 15 components | 3 components |
| Lighthouse Performance | ~65 | ~85 |
| Lighthouse Accessibility | ~70 | ~95 |

---

**Plan Created:** 2026-01-16T09:23:50
**Total Chunks:** 28
**Estimated Implementation Time:** 3-4 sprints
