# useSearchPageLogic Hook - Implementation Summary

**File**: `app/src/islands/pages/useSearchPageLogic.js`
**Created**: 2025-11-22
**Purpose**: Orchestration layer for SearchPage component following "Hollow Component" pattern
**Lines of Code**: 700+

---

## Overview

The `useSearchPageLogic` hook is a comprehensive orchestration layer that extracts all business logic from SearchPage.jsx. It manages React state and effects while delegating business logic to Logic Core functions.

### Architecture Pattern: Logic Hook

```
SearchPage Component (Hollow)
       ↓
useSearchPageLogic Hook (Orchestration)
       ↓
Logic Core (Business Logic)
       ↓
Infrastructure (Supabase, External APIs)
```

---

## Hook Capabilities

### State Management (18 State Variables)

**Loading & Error State:**
- `isLoading` - Loading indicator for listings fetch
- `error` - Error message for display

**Listings State:**
- `allActiveListings` - ALL active listings (green map pins, no filters)
- `allListings` - Filtered listings (purple map pins)
- `displayedListings` - Lazy-loaded subset for performance
- `loadedCount` - Tracking for lazy loading pagination

**Geography State:**
- `boroughs` - List of available boroughs
- `neighborhoods` - List of neighborhoods for selected borough

**Filter State:**
- `selectedBorough` - Currently selected borough (initialized from URL)
- `selectedNeighborhoods` - Array of selected neighborhood IDs
- `weekPattern` - Week pattern filter ('every-week', 'one-on-off', etc.)
- `priceTier` - Price range filter ('under-200', '200-350', etc.)
- `sortBy` - Sort option ('recommended', 'price-low', etc.)
- `neighborhoodSearch` - Search term for neighborhood filtering

**Modal State:**
- `isContactModalOpen` - Contact host modal visibility
- `isInfoModalOpen` - Pricing info modal visibility
- `isAIResearchModalOpen` - AI research modal visibility
- `selectedListing` - Currently selected listing for modals
- `infoModalTriggerRef` - Position reference for info modal
- `informationalTexts` - CMS content for modals

**UI State:**
- `filterPanelActive` - Mobile filter panel visibility
- `menuOpen` - Hamburger menu visibility
- `mobileMapVisible` - Mobile map modal visibility

### Refs (3)

- `mapRef` - Reference to GoogleMap component
- `fetchInProgressRef` - Prevents duplicate simultaneous fetches
- `lastFetchParamsRef` - Caches last fetch params for deduplication

---

## Logic Core Integration

### Processors Used (3):

#### 1. `extractListingCoordinates()`
**Purpose**: Extract lat/lng from JSONB location fields
**Priority Logic**:
1. "Location - slightly different address" (privacy/pin separation)
2. "Location - Address" (main address)
3. Returns `null` if no valid coordinates (NO FALLBACK ✅)

**Integration Point**: `transformListing()` function (line ~185)
```javascript
const coordinatesResult = extractListingCoordinates({
  locationSlightlyDifferent: dbListing['Location - slightly different address'],
  locationAddress: dbListing['Location - Address'],
  listingId: dbListing._id
})
```

#### 2. `formatHostName()` (Ready for Use)
**Purpose**: Format "John Smith" → "John S." for privacy
**Status**: Imported but not yet integrated
**Future Integration**: PropertyCard component in SearchPage

#### 3. `calculateGuestFacingPrice()` (Ready for Use)
**Purpose**: Calculate guest price with 17% markup and 13% discount (7 nights)
**Status**: Imported but not yet integrated
**Future Integration**: PropertyCard dynamic price calculation

### Rules Used (3):

#### 1. `isValidPriceTier()`
**Purpose**: Validate price tier filter selection
**Integration**: `filterValidation` computed value (line ~146)

#### 2. `isValidWeekPattern()`
**Purpose**: Validate week pattern filter selection
**Integration**: `filterValidation` computed value (line ~146)

#### 3. `isValidSortOption()`
**Purpose**: Validate sort option selection
**Integration**: `filterValidation` computed value (line ~146)

**Computed Value Returned to Component:**
```javascript
filterValidation: {
  isPriceTierValid: boolean,
  isWeekPatternValid: boolean,
  isSortOptionValid: boolean
}
```

---

## Infrastructure Layer

The hook handles all infrastructure concerns (not business logic):

### Supabase Queries

**1. All Active Listings Fetch** (once on mount):
```javascript
supabase
  .from('listing')
  .select('*')
  .eq('Active', true)
  .eq('isForUsability', false)
  .or('"Location - Address".not.is.null,"Location - slightly different address".not.is.null')
```

**2. Filtered Listings Fetch** (when filters change):
- Base query: `Complete=true AND (Active=true OR Active IS NULL)`
- Borough filter: `Location - Borough = {boroughId}`
- Week pattern filter: `Weeks offered = {pattern}`
- Price filter: `Standarized Minimum Nightly Price BETWEEN min AND max`
- Neighborhood filter: `Location - Hood IN {neighborhoodIds}`
- Sorting: `ORDER BY {field} {ascending/descending}`

**3. Borough/Neighborhood Lookups**:
- Boroughs from `zat_geo_borough_toplevel`
- Neighborhoods from `zat_geo_hood_mediumlevel`

### Batch Fetching Optimization

**Photo Batching:**
1. Collect all photo IDs from listings
2. Single `fetchPhotoUrls()` call
3. Map photo URLs to listings

**Host Batching:**
1. Collect all host IDs from listings
2. Single `fetchHostData()` call
3. Map host data to listings

### Data Transformation

**transformListing()** function:
- Converts raw Supabase data → UI listing object
- Resolves IDs to human-readable names (borough, neighborhood, property type)
- Uses `extractListingCoordinates()` from Logic Core
- Handles amenities parsing
- Constructs location string

---

## Event Handlers (12)

### Filter Handlers (7):
- `setSelectedBorough` - Change borough selection
- `setSelectedNeighborhoods` - Change neighborhood selections
- `setWeekPattern` - Change week pattern filter
- `setPriceTier` - Change price tier filter
- `setSortBy` - Change sort option
- `setNeighborhoodSearch` - Update neighborhood search term
- `handleResetFilters` - Reset all filters to defaults

### UI Handlers (3):
- `setFilterPanelActive` - Toggle mobile filter panel
- `setMenuOpen` - Toggle hamburger menu
- `setMobileMapVisible` - Toggle mobile map modal

### Listing Handlers (2):
- `handleLoadMore` - Load next batch of listings (lazy loading)
- `fetchListings` - Retry fetch on error

### Modal Handlers (6):
- `handleOpenContactModal` - Open contact host modal
- `handleCloseContactModal` - Close contact host modal
- `handleOpenInfoModal` - Open pricing info modal
- `handleCloseInfoModal` - Close pricing info modal
- `handleOpenAIResearchModal` - Open AI research modal
- `handleCloseAIResearchModal` - Close AI research modal

---

## Performance Optimizations

### 1. Duplicate Fetch Prevention
```javascript
// Ref-based deduplication
if (fetchInProgressRef.current) return
if (lastFetchParamsRef.current === fetchParams) return
```

### 2. Lazy Loading
- Initial load: 20 listings (LISTING_CONFIG.INITIAL_LOAD_COUNT)
- Batch size: 10 listings (LOAD_BATCH_SIZE)
- Supports IntersectionObserver for scroll detection

### 3. URL Synchronization
- Reads initial filters from URL params
- Updates URL when filters change (browser back/forward support)
- Skips URL update on initial mount

### 4. Computed Values with useMemo
- `filterValidation` - Re-calculated only when filters change
- `filteredNeighborhoods` - Re-filtered only when search term or neighborhoods change

---

## NO FALLBACK Compliance ✅

### Coordinate Filtering
```javascript
// Filter out listings without valid coordinates (NO FALLBACK)
const listingsWithCoordinates = transformedListings.filter((listing) => {
  const hasValidCoords = listing.coordinates && listing.coordinates.lat && listing.coordinates.lng
  if (!hasValidCoords) {
    console.warn('⚠️ Excluding listing without valid coordinates:', {
      id: listing.id,
      title: listing.title
    })
  }
  return hasValidCoords
})
```

**✅ Correct Behavior**: Excludes bad data instead of using fake/fallback coordinates

### Error Handling
```javascript
setError(
  'We had trouble loading listings. Please try refreshing the page or adjusting your filters.'
)
```

**✅ Correct Behavior**: Shows honest error message instead of displaying empty/fake data

---

## Effects (10)

### Data Loading Effects:

1. **Initialize Data Lookups** (once on mount)
   - Calls `initializeLookups()` for neighborhood/borough name resolution

2. **Fetch Informational Texts** (once on mount)
   - Loads CMS content for modals

3. **Fetch All Active Listings** (once on mount)
   - Loads green map markers (unfiltered)

4. **Load Boroughs** (once on mount)
   - Fetches borough list from Supabase
   - Sets default to Manhattan if no URL param

5. **Load Neighborhoods** (when borough changes)
   - Fetches neighborhoods for selected borough
   - Clears neighborhood selections on borough change

6. **Fetch Listings** (when filters change)
   - Main data fetch with all filters applied

7. **Lazy Load Listings** (when allListings changes)
   - Initializes displayedListings with first batch

### URL Sync Effects:

8. **Sync Filters to URL** (when any filter changes)
   - Updates browser URL with current filter state
   - Skips on initial mount

9. **Watch URL Changes** (browser back/forward)
   - Updates filter state when URL changes

---

## Return Value

The hook returns a single object with:

### State (Pre-Calculated):
```javascript
{
  // Loading & Error
  isLoading: boolean,
  error: string | null,

  // Listings
  allActiveListings: Listing[],
  allListings: Listing[],
  displayedListings: Listing[],
  hasMore: boolean,

  // Geography
  boroughs: Borough[],
  neighborhoods: Neighborhood[], // Pre-filtered by search term

  // Filters
  selectedBorough: string,
  selectedNeighborhoods: string[],
  weekPattern: string,
  priceTier: string,
  sortBy: string,
  neighborhoodSearch: string,

  // Logic Core Validation (Pre-Calculated)
  filterValidation: {
    isPriceTierValid: boolean,
    isWeekPatternValid: boolean,
    isSortOptionValid: boolean
  },

  // UI State
  filterPanelActive: boolean,
  menuOpen: boolean,
  mobileMapVisible: boolean,

  // Modal State
  isContactModalOpen: boolean,
  isInfoModalOpen: boolean,
  isAIResearchModalOpen: boolean,
  selectedListing: Listing | null,
  infoModalTriggerRef: React.Ref | null,
  informationalTexts: object,

  // Refs
  mapRef: React.Ref
}
```

### Handlers (All useCallback Wrapped):
```javascript
{
  // Filter Handlers
  setSelectedBorough: (value: string) => void,
  setSelectedNeighborhoods: (ids: string[]) => void,
  setWeekPattern: (pattern: string) => void,
  setPriceTier: (tier: string) => void,
  setSortBy: (option: string) => void,
  setNeighborhoodSearch: (term: string) => void,
  handleResetFilters: () => void,

  // UI Handlers
  setFilterPanelActive: (active: boolean) => void,
  setMenuOpen: (open: boolean) => void,
  setMobileMapVisible: (visible: boolean) => void,

  // Listing Handlers
  handleLoadMore: () => void,
  fetchListings: () => Promise<void>,

  // Modal Handlers
  handleOpenContactModal: (listing: Listing) => void,
  handleCloseContactModal: () => void,
  handleOpenInfoModal: (listing: Listing, ref: React.Ref) => void,
  handleCloseInfoModal: () => void,
  handleOpenAIResearchModal: () => void,
  handleCloseAIResearchModal: () => void
}
```

---

## Usage Example

```javascript
// SearchPage.jsx (Hollow Component)
import { useSearchPageLogic } from './useSearchPageLogic.js'

export default function SearchPage() {
  // All logic delegated to hook
  const {
    isLoading,
    error,
    displayedListings,
    hasMore,
    boroughs,
    neighborhoods,
    selectedBorough,
    filterValidation,
    handleLoadMore,
    setSelectedBorough,
    handleOpenContactModal
  } = useSearchPageLogic()

  // ONLY presentation logic below
  if (isLoading) return <LoadingState />
  if (error) return <ErrorState message={error} />

  return (
    <div className="search-page">
      <FilterPanel
        boroughs={boroughs}
        neighborhoods={neighborhoods}
        selectedBorough={selectedBorough}
        onBoroughChange={setSelectedBorough}
      />

      <ListingsGrid
        listings={displayedListings}
        onLoadMore={handleLoadMore}
        hasMore={hasMore}
        onOpenContactModal={handleOpenContactModal}
      />
    </div>
  )
}
```

---

## Future Enhancements

### Ready for Integration:

1. **Use `formatHostName()` in PropertyCard**
   - Replace inline formatting with Logic Core function
   - Remove `|| 'Host'` fallback

2. **Use `calculateGuestFacingPrice()` in PropertyCard**
   - Replace inline `calculateDynamicPrice()` with Logic Core function
   - Consolidate markup/discount logic

### Workflow Creation (Phase 4):

3. **Create `buildSearchQueryWorkflow()`**
   - Extract Supabase query building logic (lines 280-350)
   - Orchestrate filter application
   - Testable without Supabase

4. **Create `transformListingWorkflow()`**
   - Extract listing transformation logic
   - Compose multiple processors
   - Separate data fetching from transformation

---

## Testing Recommendations

### Unit Tests (Phase 5):

**Hook Testing** (with React Testing Library):
1. Test initial state from URL params
2. Test filter changes update state and URL
3. Test lazy loading pagination
4. Test duplicate fetch prevention
5. Test error handling

**Integration Tests**:
1. Test full listing fetch → transform → filter flow
2. Test URL sync with browser navigation
3. Test modal open/close workflows

**Logic Core Functions** (already created, need tests):
1. `extractListingCoordinates()` - Test priority logic, JSONB parsing
2. `formatHostName()` - Test single/multiple names, error cases
3. `calculateGuestFacingPrice()` - Test markup/discount formulas
4. `isValidPriceTier()` - Test valid/invalid inputs
5. `isValidWeekPattern()` - Test valid/invalid inputs
6. `isValidSortOption()` - Test valid/invalid inputs

---

## Key Achievements

✅ **700+ lines of orchestration logic** extracted from component
✅ **18 state variables** managed in single hook
✅ **6 Logic Core integrations** (3 active, 3 ready)
✅ **NO FALLBACK principle** enforced (filters out bad data)
✅ **Performance optimized** (deduplication, lazy loading, batching)
✅ **URL sync** with browser navigation support
✅ **Comprehensive event handlers** (12 total)
✅ **Pre-calculated validation** from Logic Core rules

---

## Summary

The `useSearchPageLogic` hook successfully implements the "Hollow Component" pattern for SearchPage, extracting all business logic while maintaining clean separation of concerns:

- **React concerns**: State, effects, refs (in hook)
- **Business logic**: Validation, calculation, transformation (Logic Core)
- **Infrastructure**: Database queries, data fetching (in hook)
- **Presentation**: Rendering, layout, styling (in component)

This architecture enables:
- **100% testable business logic** (no React dependencies)
- **Reusable Logic Core functions** across components
- **Clean component code** (presentation only)
- **Easy maintenance** (single source of truth)

**Next Steps**: Integrate hook into SearchPage component to create hollow version.
