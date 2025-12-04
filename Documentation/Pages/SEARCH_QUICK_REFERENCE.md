# Search Page Quick Reference

**GENERATED**: 2025-12-04
**PAGE_URL**: /search.html
**ENTRY_POINT**: app/src/search.jsx
**COMPONENT**: app/src/islands/pages/SearchPage.jsx
**LOGIC_HOOK**: app/src/islands/pages/useSearchPageLogic.js

---

## Page Purpose

The Search page is the primary listing discovery interface for Split Lease. It enables guests to:
- Browse available listings with advanced filtering
- View listings on an interactive Google Map with price markers
- Filter by borough, neighborhood, week pattern, and price tier
- Select specific days of the week for their stay
- Access AI-powered market research reports
- Navigate to listing details or message hosts directly

---

## Architecture Overview

```
SearchPage.jsx (UI Container - Hollow Component)
    |
    +-- useSearchPageLogic.js (Logic Hook - State & Handlers)
            |
            +-- Supabase Queries (Infrastructure)
            +-- Logic Core Functions (Business Logic)
            +-- URL Parameter Management (Shareable State)
```

### Key Architectural Patterns

| Pattern | Implementation |
|---------|----------------|
| **Hollow Component** | SearchPage.jsx contains only JSX; all logic in useSearchPageLogic.js |
| **Logic Core** | Business logic delegated to calculators/rules/processors/workflows |
| **Two-Panel Layout** | 45% listings column (left), 55% map column (right) |
| **Dual Listing States** | `allActiveListings` (green pins), `allListings` (filtered purple pins) |
| **URL State Sync** | Filters persist to URL for shareable search results |

---

## Component Structure

### Layout Components

```
.search-page (Full viewport container)
+-- .two-column-layout (45%-55% split)
|   +-- .listings-column (Left panel)
|   |   +-- .inline-filters (Filter controls)
|   |   +-- .listings-count (Results count)
|   |   +-- .listings-content (Scrollable listing cards)
|   |
|   +-- .map-column (Right panel)
|       +-- .map-header (Logo, favorites, hamburger menu)
|       +-- .google-map-container (Interactive map)
|
+-- Mobile-specific components (hidden on desktop)
    +-- .mobile-filter-bar (Fixed top bar)
    +-- .mobile-schedule-selector (Day selector)
    +-- .mobile-map-modal (Fullscreen map view)
```

### Core Components Used

| Component | Path | Purpose |
|-----------|------|---------|
| `SearchScheduleSelector` | shared/SearchScheduleSelector.jsx | Day-of-week selection with drag support |
| `GoogleMap` | shared/GoogleMap.jsx | Interactive map with price markers |
| `ListingCardForMap` | shared/ListingCard/ListingCardForMap.jsx | Popup card on map pin click |
| `SignUpLoginModal` | shared/SignUpLoginModal.jsx | Authentication modal |
| `AuthAwareSearchScheduleSelector` | shared/AuthAwareSearchScheduleSelector.jsx | Schedule selector with auth check |

---

## File Inventory

### Primary Files

| File | Purpose |
|------|---------|
| `app/src/search.jsx` | Entry point - mounts SearchPage to DOM |
| `app/src/islands/pages/SearchPage.jsx` | Main page component (UI only) |
| `app/src/islands/pages/useSearchPageLogic.js` | All business logic and state management |
| `app/src/styles/components/search-page.css` | Page-specific styling |

### Supporting Files

| File | Purpose |
|------|---------|
| `app/src/lib/urlParams.js` | URL parameter parsing/serialization |
| `app/src/lib/dataLookups.js` | Cached lookups for boroughs/neighborhoods |
| `app/src/lib/constants.js` | Filter configurations (PRICE_TIERS, SORT_OPTIONS, etc.) |
| `app/src/lib/supabaseUtils.js` | Photo URL fetching, host data |
| `app/src/lib/sanitize.js` | Input sanitization for search |
| `app/src/logic/index.js` | Logic Core exports |

---

## State Management

### Filter State

```javascript
// Initialized from URL parameters on mount
const [selectedBorough, setSelectedBorough] = useState(urlFilters.selectedBorough)
const [selectedNeighborhoods, setSelectedNeighborhoods] = useState([])
const [weekPattern, setWeekPattern] = useState(urlFilters.weekPattern)
const [priceTier, setPriceTier] = useState(urlFilters.priceTier)
const [sortBy, setSortBy] = useState(urlFilters.sortBy)
const [neighborhoodSearch, setNeighborhoodSearch] = useState('')
```

### Listing State

```javascript
const [allActiveListings, setAllActiveListings] = useState([])  // ALL active (green pins)
const [allListings, setAllListings] = useState([])              // Filtered (purple pins)
const [displayedListings, setDisplayedListings] = useState([])  // Lazy-loaded subset
const [loadedCount, setLoadedCount] = useState(0)
```

### UI State

```javascript
const [filterPanelActive, setFilterPanelActive] = useState(false)  // Mobile filter panel
const [menuOpen, setMenuOpen] = useState(false)                    // Hamburger menu
const [mobileMapVisible, setMobileMapVisible] = useState(false)    // Mobile map modal
```

### Modal State

```javascript
const [isContactModalOpen, setIsContactModalOpen] = useState(false)
const [isInfoModalOpen, setIsInfoModalOpen] = useState(false)
const [isAIResearchModalOpen, setIsAIResearchModalOpen] = useState(false)
const [selectedListing, setSelectedListing] = useState(null)
```

---

## URL Parameters

Filters sync bidirectionally with URL for shareable searches.

| Parameter | Default | Description |
|-----------|---------|-------------|
| `borough` | `manhattan` | Selected borough (kebab-case) |
| `neighborhoods` | (empty) | Comma-separated neighborhood IDs |
| `weekly-frequency` | `every-week` | Week pattern filter |
| `pricetier` | `all` | Price tier filter |
| `sort` | `recommended` | Sort order |
| `days-selected` | `2,3,4,5,6` | 1-based day indices (1=Sunday) |

### URL Example
```
/search.html?borough=brooklyn&weekly-frequency=one-on-off&pricetier=200-350&sort=price-low&neighborhoods=id1,id2
```

---

## Filter Options

### Boroughs
Fetched from `zat_geo_borough_toplevel` table:
- Manhattan
- Brooklyn
- Queens
- Bronx
- Staten Island
- Hudson County NJ

### Week Patterns (`WEEK_PATTERNS`)

| Value | Display |
|-------|---------|
| `every-week` | Every week |
| `one-on-off` | One week on, one week off |
| `two-on-off` | Two weeks on, two weeks off |
| `one-three-off` | One week on, three weeks off |

### Price Tiers (`PRICE_TIERS`)

| Value | Range | Label |
|-------|-------|-------|
| `under-200` | $0 - $199.99 | Under $200 |
| `200-350` | $200 - $350 | $200 - $350 |
| `350-500` | $350.01 - $500 | $350 - $500 |
| `500-plus` | $500.01+ | $500+ |
| `all` | (no filter) | All Prices |

### Sort Options (`SORT_OPTIONS`)

| Value | Field | Direction | Label |
|-------|-------|-----------|-------|
| `recommended` | Modified Date | Descending | Recommended |
| `price-low` | Min Nightly Price | Ascending | Price: Low to High |
| `most-viewed` | Click Counter | Descending | Most Popular |
| `recent` | Created Date | Descending | Newest |

---

## Data Flow

### 1. Initial Load

```
Page Mount
    |
    +-- initializeLookups() ----------> Cache boroughs/neighborhoods
    +-- loadBoroughs() ----------------> Fetch from zat_geo_borough_toplevel
    +-- fetchAllActiveListings() ------> ALL active listings (green pins)
    +-- parseUrlToFilters() -----------> Initialize filter state from URL
```

### 2. Filter Change

```
User Changes Filter
    |
    +-- Update State (setSelectedBorough, etc.)
    +-- updateUrlParams() -----------> Sync to browser URL
    +-- fetchListings() -------------> Query filtered listings
            |
            +-- Build Supabase query with filters
            +-- fetchPhotoUrls() batch
            +-- fetchHostData() batch
            +-- transformListing() --> Convert to UI format
```

### 3. Listing Transform

```javascript
transformListing(dbListing, images, hostData) {
  // Resolve IDs to names
  const neighborhoodName = getNeighborhoodName(dbListing['Location - Hood'])
  const boroughName = getBoroughName(dbListing['Location - Borough'])

  // Extract coordinates (Logic Core)
  const coordinates = extractListingCoordinates({
    locationSlightlyDifferent: dbListing['Location - slightly different address'],
    locationAddress: dbListing['Location - Address'],
    listingId: dbListing._id
  })

  return {
    id, title, location, neighborhood, borough, coordinates,
    price: { starting, full },
    type, squareFeet, maxGuests, bedrooms, bathrooms,
    amenities, host, images, description,
    weeks_offered, days_available, isNew
  }
}
```

---

## GoogleMap Component

### Props Interface

```javascript
<GoogleMap
  listings={allActiveListings}           // Green markers (all active)
  filteredListings={allListings}         // Purple markers (filtered results)
  selectedListing={selectedListing}      // Highlighted listing
  onMarkerClick={handleMarkerClick}      // Pin click handler
  selectedBorough={selectedBorough}      // For map centering
  simpleMode={false}                     // Full mode with price tags
  onAIResearchClick={handleOpenAIResearchModal}
  onMessageClick={handleOpenContactModal}
  isLoggedIn={isLoggedIn}
  favoritedListingIds={favoritedIds}
  onToggleFavorite={handleToggleFavorite}
/>
```

### Marker Types

| Type | Color | Description |
|------|-------|-------------|
| Purple | `#5B21B6` | Filtered search results |
| Green | `#00C851` | All active listings (background) |

### Map Features

- **Price Labels**: Custom OverlayView markers showing nightly price
- **Listing Cards**: Popup card appears on marker click with photo gallery
- **Map Legend**: Toggle to show/hide all active listings
- **AI Research Button**: Centered button to generate market report
- **Auto-Zoom**: Fits bounds to show all visible markers
- **Borough Centering**: Re-centers map when borough changes

### Borough Map Configuration

```javascript
// From lib/constants.js
const BOROUGH_MAP_CONFIG = {
  'manhattan': { center: { lat: 40.7580, lng: -73.9855 }, zoom: 13 },
  'brooklyn': { center: { lat: 40.6782, lng: -73.9442 }, zoom: 12 },
  'queens': { center: { lat: 40.7282, lng: -73.7949 }, zoom: 11 },
  'bronx': { center: { lat: 40.8448, lng: -73.8648 }, zoom: 12 },
  'staten-island': { center: { lat: 40.5795, lng: -74.1502 }, zoom: 11 },
  'hudson': { center: { lat: 40.7357, lng: -74.0339 }, zoom: 13 },
  'default': { center: { lat: 40.7580, lng: -73.9855 }, zoom: 11 }
}
```

---

## SearchScheduleSelector Component

### Day Selection System

| Index (0-based) | Index (1-based URL) | Day |
|-----------------|---------------------|-----|
| 0 | 1 | Sunday |
| 1 | 2 | Monday |
| 2 | 3 | Tuesday |
| 3 | 4 | Wednesday |
| 4 | 5 | Thursday |
| 5 | 6 | Friday |
| 6 | 7 | Saturday |

### Props Interface

```javascript
<SearchScheduleSelector
  onSelectionChange={(days) => handleDaysChange(days)}
  onError={(error) => handleError(error)}
  minDays={2}                    // Minimum nights required
  requireContiguous={true}       // Days must be adjacent
  initialSelection={[1,2,3,4,5]} // Default Mon-Fri
  updateUrl={true}               // Sync to URL parameter
/>
```

### Validation Rules

- **Minimum Nights**: At least 2 nights required (3 days selected)
- **Contiguous Days**: Selected days must be adjacent (handles wrap-around)
- **Check-in/Check-out**: First day = check-in, last day = check-out

### Drag Selection

- **Click**: Toggle single day
- **Drag**: Fill range from start to end point
- **Wrap-around**: Supports Fri-Sat-Sun-Mon selections

---

## Responsive Behavior

### Desktop (> 768px)

```
+-----------------------------+--------------------------------+
|     LISTINGS (45%)          |          MAP (55%)             |
|                             |                                |
|  +- Inline Filters -------+ |  +- Map Header --------------+ |
|  | Schedule | Borough |   | |  | Logo  | Favorites | Menu  | |
|  | Hood | Price | Sort    | |  +----------------------------+ |
|  +------------------------+ |                                |
|                             |  +- Google Map --------------+ |
|  +- Listings Count -------+ |  |                           | |
|  | X listings found       | |  |     Price Markers         | |
|  +------------------------+ |  |         $150              | |
|                             |  |              $200          | |
|  +- Listing Cards --------+ |  |                           | |
|  | [Card 1]               | |  |  +- Legend ----+          | |
|  | [Card 2]               | |  |  | Purple=Match|          | |
|  | [Card 3]               | |  |  | Green=All   |          | |
|  | ...                    | |  |  +-------------+          | |
|  +------------------------+ |  +----------------------------+ |
+-----------------------------+--------------------------------+
```

### Mobile (< 768px)

```
+----------------------------+
| +- Mobile Filter Bar ----+ | (Fixed top)
| | [Filters] [Map View]   | |
| +------------------------+ |
+----------------------------+
| +- Schedule Selector ----+ | (Fixed below filter bar)
| | S M T W T F S          | |
| | Check-in: Mon...       | |
| +------------------------+ |
+----------------------------+
|                            |
|  +- Listing Cards -------+ | (Scrollable)
|  | [Card 1]              | |
|  | [Card 2]              | |
|  | [Card 3]              | |
|  +-----------------------+ |
|                            |
+----------------------------+

Mobile Map Modal (fullscreen overlay):
+----------------------------+
| [X] Map View               |
+----------------------------+
|                            |
|       Google Map           |
|       (fullscreen)         |
|                            |
|    +- Legend ----+         |
|    | Colors...   |         |
|    +-------------+         |
+----------------------------+
```

---

## Supabase Queries

### Fetch All Active Listings (Green Pins)

```javascript
// One-time fetch on mount - no filters
const { data } = await supabase
  .from('listing')
  .select('*')
  .eq('Active', true)
  .eq('isForUsability', false)
  .or('"Location - Address".not.is.null,"Location - slightly different address".not.is.null')
```

### Fetch Filtered Listings (Purple Pins)

```javascript
let query = supabase
  .from('listing')
  .select('*')
  .eq('"Complete"', true)
  .or('"Active".eq.true,"Active".is.null')
  .eq('"Location - Borough"', borough.id)
  .or('"Location - Address".not.is.null,"Location - slightly different address".not.is.null')

// Apply week pattern filter
if (weekPattern !== 'every-week') {
  query = query.eq('"Weeks offered"', WEEK_PATTERNS[weekPattern])
}

// Apply price filter
if (priceTier !== 'all') {
  const range = PRICE_TIERS[priceTier]
  query = query
    .gte('"Standarized Minimum Nightly Price (Filter)"', range.min)
    .lte('"Standarized Minimum Nightly Price (Filter)"', range.max)
}

// Apply neighborhood filter
if (selectedNeighborhoods.length > 0) {
  query = query.in('"Location - Hood"', selectedNeighborhoods)
}

// Apply sorting
query = query.order(sortConfig.field, { ascending: sortConfig.ascending })
```

---

## Key Database Fields

### Listing Table Fields Used

| Field | Purpose |
|-------|---------|
| `_id` | Unique listing identifier |
| `Name` | Listing title |
| `Active` | Active status boolean |
| `Complete` | Listing completion status |
| `Location - Borough` | Borough foreign key |
| `Location - Hood` | Neighborhood foreign key |
| `Location - Address` | Primary address (geocoded) |
| `Location - slightly different address` | Alternate address (priority) |
| `Standarized Minimum Nightly Price (Filter)` | Starting nightly price |
| `Weeks offered` | Week pattern text |
| `Days Available (List of Days)` | JSON array of available days |
| `Features - Photos` | JSON array of photo IDs |
| `Features - Type of Space` | Property type FK |
| `Features - Qty Bedrooms` | Bedroom count |
| `Features - Qty Bathrooms` | Bathroom count |
| `Features - SQFT Area` | Square footage |
| `Features - Qty Guests` | Max guest count |
| `Host / Landlord` | Host user foreign key |
| `Metrics - Click Counter` | View count for sorting |
| `Modified Date` | Last update timestamp |
| `Created Date` | Creation timestamp |

### Lookup Tables

| Table | Purpose |
|-------|---------|
| `zat_geo_borough_toplevel` | Borough names and IDs |
| `zat_geo_hood_mediumlevel` | Neighborhood names linked to boroughs |
| `zat_features_listingtype` | Property type labels |
| `zat_features_amenity` | Amenity names and icons |
| `photo` | Photo URLs by ID |
| `user` | Host profile data |

---

## Event Handlers

### Filter Handlers

```javascript
setSelectedBorough(value)       // Change borough filter
setSelectedNeighborhoods(ids)   // Update neighborhood selections
setWeekPattern(pattern)         // Change week pattern
setPriceTier(tier)              // Change price tier
setSortBy(option)               // Change sort order
setNeighborhoodSearch(text)     // Filter neighborhood list
handleResetFilters()            // Reset all filters to defaults
```

### Listing Handlers

```javascript
handleLoadMore()                // Load next batch of listings
fetchListings()                 // Retry fetching listings
```

### Modal Handlers

```javascript
handleOpenContactModal(listing)     // Open message modal for listing
handleCloseContactModal()           // Close message modal
handleOpenInfoModal(listing, ref)   // Open info tooltip
handleCloseInfoModal()              // Close info tooltip
handleOpenAIResearchModal()         // Open AI research signup
handleCloseAIResearchModal()        // Close AI research modal
```

### UI Handlers

```javascript
setFilterPanelActive(bool)      // Toggle mobile filter panel
setMenuOpen(bool)               // Toggle hamburger menu
setMobileMapVisible(bool)       // Toggle mobile map modal
```

---

## Logic Core Integration

### Calculators Used

```javascript
import { calculateGuestFacingPrice } from 'logic/calculators/pricing/'
// Calculates display price based on selected nights
```

### Processors Used

```javascript
import { formatHostName, extractListingCoordinates } from 'logic/processors/'
// formatHostName: Clean host display name
// extractListingCoordinates: Extract lat/lng with priority logic
```

### Rules Used

```javascript
import { isValidPriceTier, isValidWeekPattern, isValidSortOption } from 'logic/rules/'
// Filter validation predicates
```

---

## Error Handling

### Loading States

- `isLoading`: True during listing fetch
- Skeleton cards displayed while loading

### Error States

- `error`: Error message string if fetch fails
- Error card with retry button displayed

### No Results

- Empty state message with reset filters button
- Displayed when `allListings.length === 0` and `!isLoading`

---

## Performance Optimizations

### Duplicate Fetch Prevention

```javascript
const fetchInProgressRef = useRef(false)
const lastFetchParamsRef = useRef(null)

// Check before fetching
if (fetchInProgressRef.current) return
if (lastFetchParamsRef.current === fetchParams) return
```

### Lazy Loading

```javascript
const LISTING_CONFIG = {
  INITIAL_LOAD_COUNT: 6,    // Initial batch
  LOAD_BATCH_SIZE: 6        // Per-scroll batch
}
```

### Batch Data Fetching

- Photo URLs fetched in single batch query
- Host data fetched in single batch query
- Data lookups cached on initialization

### Map Marker Optimization

```javascript
// Performance: Prevent duplicate marker updates
const markerSignature = `${listings.map(l => l.id).join(',')}-${filteredListings...}`
if (lastMarkersUpdateRef.current === markerSignature) return
```

---

## CSS Classes Reference

### Container Classes

| Class | Description |
|-------|-------------|
| `.search-page` | Root container (100vh, 100vw) |
| `.two-column-layout` | Flexbox 45%-55% split |
| `.listings-column` | Left panel |
| `.map-column` | Right panel |

### Filter Classes

| Class | Description |
|-------|-------------|
| `.inline-filters` | Horizontal filter bar |
| `.filter-group` | Individual filter wrapper |
| `.filter-select` | Dropdown select element |
| `.neighborhood-dropdown-container` | Multi-select with chips |
| `.neighborhood-chip` | Selected neighborhood tag |
| `.neighborhood-list` | Dropdown options list |

### Map Classes

| Class | Description |
|-------|-------------|
| `.map-header` | Top bar with logo/actions |
| `.google-map-container` | Map wrapper |
| `.map-legend` | Bottom-left legend panel |
| `.ai-research-button` | Centered top button |
| `.map-price-marker` | Custom price pin overlay |

### Mobile Classes

| Class | Description |
|-------|-------------|
| `.mobile-filter-bar` | Fixed top filter buttons |
| `.mobile-schedule-selector` | Fixed day selector |
| `.mobile-map-modal` | Fullscreen map overlay |
| `.filter-toggle-btn` | Open filters button |
| `.map-toggle-btn` | Open map button |

---

## Related Documentation

- [GoogleMap Component](../../app/src/islands/shared/GoogleMap.jsx)
- [SearchScheduleSelector Component](../../app/src/islands/shared/SearchScheduleSelector.jsx)
- [ListingCardForMap Component](../../app/src/islands/shared/ListingCard/ListingCardForMap.jsx)
- [URL Params Utility](../../app/src/lib/urlParams.js)
- [Data Lookups Utility](../../app/src/lib/dataLookups.js)
- [Constants Configuration](../../app/src/lib/constants.js)
- [Logic Core Index](../../app/src/logic/index.js)
- [Main App CLAUDE.md](../../app/CLAUDE.md)

---

**DOCUMENT_VERSION**: 1.0
**LAST_UPDATED**: 2025-12-04
**STATUS**: Comprehensive Quick Reference
