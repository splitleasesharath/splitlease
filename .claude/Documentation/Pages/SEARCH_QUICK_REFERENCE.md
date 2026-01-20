# Search Page Quick Reference

**GENERATED**: 2026-01-20
**PAGE_URL**: /search
**ENTRY_POINT**: app/src/search.jsx
**COMPONENT**: app/src/islands/pages/SearchPage.jsx
**LOGIC_HOOK**: app/src/islands/pages/useSearchPageLogic.js

---

## Page Purpose

The Search page is the primary listing discovery interface for Split Lease. It enables guests to:
- Browse available listings with advanced filtering
- View listings on an interactive Google Map with price markers
- Filter by borough, neighborhood, week pattern, and price tier
- Select specific days of the week for their stay (display-only, not used for filtering)
- Access AI-powered market research reports
- Navigate to listing details or message hosts directly
- Manage favorites (authenticated users)

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
| **Hollow Component** | SearchPage.jsx contains UI + inline helper components; useSearchPageLogic.js handles data fetching and state |
| **Logic Core** | Business logic delegated to calculators/rules/processors via `logic/index.js` |
| **Two-Panel Layout** | 45% listings column (left), 55% map column (right) |
| **Dual Listing States** | `allActiveListings` (green pins), `allListings` (filtered purple pins) |
| **URL State Sync** | Filters persist to URL for shareable search results |
| **Fallback Display** | Shows all listings when filtered results are empty |

---

## Component Structure

### Layout Components

```
.search-page (Full viewport container)
+-- .two-column-layout (45%-55% split)
|   +-- .listings-column (Left panel)
|   |   +-- MobileFilterBar (Mobile only - fixed top)
|   |   +-- .mobile-schedule-selector (Mobile only)
|   |   +-- .inline-filters (Filter controls)
|   |   +-- .listings-count (Results count)
|   |   +-- .listings-content (Scrollable listing cards)
|   |
|   +-- .map-column (Right panel)
|       +-- .map-header (Logo, favorites, hamburger menu / LoggedInAvatar)
|       +-- GoogleMap (Interactive map)
|
+-- Modals
|   +-- ContactHostMessaging
|   +-- InformationalText
|   +-- AiSignupMarketReport
|   +-- SignUpLoginModal
|
+-- .mobile-map-modal (Mobile fullscreen map overlay)
```

### Internal Components (Defined in SearchPage.jsx)

| Component | Purpose |
|-----------|---------|
| `MobileFilterBar` | Sticky filter/map toggle buttons for mobile |
| `NeighborhoodCheckboxList` | Scrollable checkbox list for neighborhood selection |
| `NeighborhoodDropdownFilter` | Multi-select dropdown with chips and search |
| `FilterPanel` | Mobile filter panel with all filter controls |
| `PropertyCard` | Individual listing card with image carousel |
| `ListingsGrid` | Grid of property cards with infinite scroll |
| `LoadingState` | Loading skeleton component |
| `ErrorState` | Error message with retry button |
| `EmptyState` | No results message with reset filters button |

### Core Shared Components Used

| Component | Path | Purpose |
|-----------|------|---------|
| `GoogleMap` | shared/GoogleMap.jsx | Interactive map with price markers |
| `AuthAwareSearchScheduleSelector` | shared/AuthAwareSearchScheduleSelector.jsx | Day-of-week selection with auth check |
| `ContactHostMessaging` | shared/ContactHostMessaging.jsx | Message host modal |
| `InformationalText` | shared/InformationalText.jsx | Info tooltip/modal component |
| `AiSignupMarketReport` | shared/AiSignupMarketReport.jsx | AI research signup modal |
| `SignUpLoginModal` | shared/SignUpLoginModal.jsx | Authentication modal |
| `LoggedInAvatar` | shared/LoggedInAvatar/LoggedInAvatar.jsx | User avatar with dropdown menu |
| `FavoriteButton` | shared/FavoriteButton.jsx | Heart toggle for favorites |

---

## File Inventory

### Primary Files

| File | Purpose |
|------|---------|
| `app/src/search.jsx` | Entry point - mounts SearchPage to DOM (`#search-page`) |
| `app/src/islands/pages/SearchPage.jsx` | Main page component (UI + internal components) |
| `app/src/islands/pages/useSearchPageLogic.js` | Business logic hook (state, data fetching, handlers) |
| `app/src/styles/components/search-page.css` | Page-specific styling |

### Supporting Files

| File | Purpose |
|------|---------|
| `app/src/lib/urlParams.js` | URL parameter parsing/serialization |
| `app/src/lib/dataLookups.js` | Cached lookups for boroughs/neighborhoods |
| `app/src/lib/constants.js` | Filter configurations (PRICE_TIERS, SORT_OPTIONS, etc.) |
| `app/src/lib/supabaseUtils.js` | Photo URL fetching, host data, utility functions |
| `app/src/lib/sanitize.js` | Input sanitization for search |
| `app/src/lib/auth.js` | Authentication utilities |
| `app/src/lib/informationalTextsFetcher.js` | Fetch CMS content |
| `app/src/logic/index.js` | Logic Core exports |

---

## State Management

### Filter State (SearchPage.jsx)

```javascript
// Initialized from URL parameters on mount
const urlFilters = parseUrlToFilters();
const [selectedBorough, setSelectedBorough] = useState(urlFilters.selectedBorough)
const [selectedNeighborhoods, setSelectedNeighborhoods] = useState(urlFilters.selectedNeighborhoods)
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
// Fallback listings when filtered results are empty
const [fallbackListings, setFallbackListings] = useState([])
const [fallbackDisplayedListings, setFallbackDisplayedListings] = useState([])
const [fallbackLoadedCount, setFallbackLoadedCount] = useState(0)
```

### UI State

```javascript
const [filterPanelActive, setFilterPanelActive] = useState(false)  // Mobile filter panel
const [menuOpen, setMenuOpen] = useState(false)                    // Hamburger menu
const [mobileMapVisible, setMobileMapVisible] = useState(false)    // Mobile map modal
const [mapSectionActive, setMapSectionActive] = useState(false)    // Map section toggle
```

### Auth State

```javascript
const [isLoggedIn, setIsLoggedIn] = useState(false)
const [currentUser, setCurrentUser] = useState(null)
const [favoritesCount, setFavoritesCount] = useState(0)
const [favoritedListingIds, setFavoritedListingIds] = useState(new Set())
```

### Modal State

```javascript
const [isContactModalOpen, setIsContactModalOpen] = useState(false)
const [isInfoModalOpen, setIsInfoModalOpen] = useState(false)
const [isAIResearchModalOpen, setIsAIResearchModalOpen] = useState(false)
const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
const [authModalView, setAuthModalView] = useState('login')
const [selectedListing, setSelectedListing] = useState(null)
const [infoModalTriggerRef, setInfoModalTriggerRef] = useState(null)
const [informationalTexts, setInformationalTexts] = useState({})
```

### Toast Notification State

```javascript
const [toast, setToast] = useState({ show: false, message: '', type: 'success' })
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
| `days-selected` | (preserved) | Managed by SearchScheduleSelector, preserved but not used for filtering |

### URL Example
```
/search?borough=brooklyn&weekly-frequency=one-on-off&pricetier=200-350&sort=price-low&neighborhoods=id1,id2
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
| `price-low` | Standarized Minimum Nightly Price | Ascending | Price: Low to High |
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
    +-- checkAuth() -------------------> Check auth status and fetch favorites
    +-- fetchInformationalTexts() -----> Load CMS content
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
            +-- fetchPhotoUrls() batch (legacy photo IDs only)
            +-- fetchHostData() batch
            +-- transformListing() --> Convert to UI format
            +-- Filter for valid coordinates
            +-- Filter for photos
```

### 3. Listing Transform

```javascript
transformListing(dbListing, images, hostData) {
  // Resolve IDs to names
  const neighborhoodName = getNeighborhoodName(dbListing['Location - Hood'])
  const boroughName = getBoroughName(dbListing['Location - Borough'])
  const propertyType = getPropertyTypeLabel(dbListing['Features - Type of Space'])

  // Extract coordinates (Logic Core - priority: slightly different address > main address)
  // Parse JSONB fields if strings
  let locationSlightlyDifferent = dbListing['Location - slightly different address']
  let locationAddress = dbListing['Location - Address']

  // Use slightly different address if available, otherwise fallback to main address
  let coordinates = null
  if (locationSlightlyDifferent?.lat && locationSlightlyDifferent?.lng) {
    coordinates = { lat, lng }
  } else if (locationAddress?.lat && locationAddress?.lng) {
    coordinates = { lat, lng }
  }

  return {
    id, title, location, neighborhood, borough, coordinates,
    price: { starting, full },
    'Starting nightly price', 'Price N nights selected' fields,
    type, squareFeet, maxGuests, bedrooms, bathrooms,
    amenities, host, images, description,
    weeks_offered, days_available, isNew
  }
}
```

### 4. Photo Processing

Photos can be in two formats:
- **Legacy format**: Array of string IDs requiring lookup from `listing_photo` table
- **New format**: Array of objects with embedded URLs (no fetch needed)

```javascript
// Collect only legacy photo IDs (strings)
const legacyPhotoIds = new Set()
photos.forEach(photo => {
  if (typeof photo === 'string') {
    legacyPhotoIds.add(photo)
  }
})

// Only fetch from listing_photo if there are legacy IDs
const photoMap = legacyPhotoIds.size > 0
  ? await fetchPhotoUrls(Array.from(legacyPhotoIds))
  : {}

// extractPhotos() handles both formats
```

---

## GoogleMap Component

### Props Interface

```javascript
<GoogleMap
  ref={mapRef}
  listings={allActiveListings}           // Green markers (all active)
  filteredListings={allListings}         // Purple markers (filtered results)
  selectedListing={null}                 // Highlighted listing
  selectedBorough={selectedBorough}      // For map centering
  onMarkerClick={(listing) => {}}        // Pin click handler
  onMessageClick={handleOpenContactModal} // Message button handler
  onAIResearchClick={handleOpenAIResearchModal}
  isLoggedIn={isLoggedIn}
  favoritedListingIds={favoritedListingIds}
  onToggleFavorite={handleToggleFavorite}
  userId={currentUser?.id}
  onRequireAuth={() => {
    setAuthModalView('signup')
    setIsAuthModalOpen(true)
  }}
/>
```

### Marker Types

| Type | Color | Description |
|------|-------|-------------|
| Purple | `#5B21B6` | Filtered search results |
| Green | `#00C851` | All active listings (background) |

### Borough Map Configuration

```javascript
// From lib/constants.js - BOROUGH_MAP_CONFIG
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

## AuthAwareSearchScheduleSelector Component

The schedule selector is mounted via `createRoot` to designated mount points:
- Desktop: `#schedule-selector-mount-point`
- Mobile: `#schedule-selector-mount-point-mobile`

**Note**: Schedule selection is display-only and does NOT affect listing filtering. The `days-selected` URL parameter is preserved but not used for search queries.

```javascript
const selectorProps = {
  onSelectionChange: (days) => {
    console.log('Schedule selector changed (display only, not used for filtering):', days)
    // No state update - schedule selection is for display purposes only
  },
  onError: (error) => console.error('AuthAwareSearchScheduleSelector error:', error)
}
```

---

## Responsive Behavior

### Desktop (> 768px)

```
+-----------------------------+--------------------------------+
|     LISTINGS (45%)          |          MAP (55%)             |
|                             |                                |
|  +- Inline Filters -------+ |  +- Map Header --------------+ |
|  | Schedule | Neighborhood| |  | Logo  | Favorites | Menu  | |
|  | Borough | Week | Price | |  +----------------------------+ |
|  | Sort                   | |                                |
|  +------------------------+ |  +- Google Map --------------+ |
|                             |  |                           | |
|  +- Listings Count -------+ |  |     Price Markers         | |
|  | X listings found       | |  |         $150              | |
|  +------------------------+ |  |              $200          | |
|                             |  |                           | |
|  +- Listing Cards --------+ |  |  +- Legend ----+          | |
|  | [Card 1]               | |  |  | Purple=Match|          | |
|  | [Card 2]               | |  |  | Green=All   |          | |
|  | [Card 3]               | |  |  +-------------+          | |
|  | ...                    | |  +----------------------------+ |
|  +------------------------+ |                                |
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
  .not('"Features - Photos"', 'is', null)  // PHOTO CONSTRAINT

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

### Fetch Fallback Listings (When Filtered Empty)

```javascript
// Basic constraints only - no borough, neighborhood, price, or week pattern
const query = supabase
  .from('listing')
  .select('*')
  .eq('"Complete"', true)
  .or('"Active".eq.true,"Active".is.null')
  .or('"Location - Address".not.is.null,"Location - slightly different address".not.is.null')
  .not('"Features - Photos"', 'is', null)
  .order('"Modified Date"', { ascending: false })
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
| `isForUsability` | Flag for test/usability listings |
| `Location - Borough` | Borough foreign key |
| `Location - Hood` | Neighborhood foreign key |
| `Location - Address` | Primary address (JSONB with lat/lng) |
| `Location - slightly different address` | Alternate address for privacy (JSONB with lat/lng) |
| `Standarized Minimum Nightly Price (Filter)` | Starting nightly price |
| `Weeks offered` | Week pattern text |
| `Days Available (List of Days)` | JSON array of available days |
| `Features - Photos` | JSON array of photo IDs or objects |
| `Features - Type of Space` | Property type FK |
| `Features - Qty Bedrooms` | Bedroom count |
| `Features - Qty Bathrooms` | Bathroom count |
| `Features - SQFT Area` | Square footage |
| `Features - Qty Guests` | Max guest count |
| `Host / Landlord` | Host user foreign key |
| `Metrics - Click Counter` | View count for sorting |
| `Modified Date` | Last update timestamp |
| `Created Date` | Creation timestamp |
| `💰Nightly Host Rate for N nights` | Price fields for 2-7 nights |

### Lookup Tables

| Table | Purpose |
|-------|---------|
| `zat_geo_borough_toplevel` | Borough names and IDs |
| `zat_geo_hood_mediumlevel` | Neighborhood names linked to boroughs |
| `zat_features_listingtype` | Property type labels |
| `zat_features_amenity` | Amenity names and icons |
| `listing_photo` | Photo URLs by ID (legacy format) |
| `user` | Host profile data and favorites |
| `informationaltexts` | CMS content for tooltips |

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
handleFallbackLoadMore()        // Load next batch of fallback listings
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

### Auth Handlers

```javascript
handleNavigate(path)            // Navigate to path
handleLogout()                  // Logout user and reload
handleToggleFavorite(listingId, listingTitle, newState)  // Update favorites
```

### UI Handlers

```javascript
setFilterPanelActive(bool)      // Toggle mobile filter panel
setMenuOpen(bool)               // Toggle hamburger menu
setMobileMapVisible(bool)       // Toggle mobile map modal
showToast(message, type)        // Show toast notification
```

---

## Logic Core Integration

### From `logic/index.js`

```javascript
import {
  calculateGuestFacingPrice,
  formatHostName,
  extractListingCoordinates,
  isValidPriceTier,
  isValidWeekPattern,
  isValidSortOption
} from 'logic/index.js'
```

### Calculators Used

```javascript
// calculateGuestFacingPrice - Calculates display price based on selected nights
// (Used in PropertyCard for dynamic pricing)
```

### Processors Used

```javascript
// formatHostName - Clean host display name (FirstName L.)
// extractListingCoordinates - Extract lat/lng with priority logic
```

### Rules Used

```javascript
// isValidPriceTier - Validate price tier selection
// isValidWeekPattern - Validate week pattern selection
// isValidSortOption - Validate sort option selection
// (Used in useSearchPageLogic for filter validation)
```

---

## Error Handling

### Loading States

- `isLoading`: True during listing fetch
- `isFallbackLoading`: True during fallback listing fetch
- Skeleton cards displayed while loading

### Error States

- `error`: Error message string if fetch fails
- Error card with retry button displayed

### No Results

- Empty state message with reset filters button
- Fallback section shows "Browse All Available Listings" when filtered results are empty
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
- Legacy photo IDs collected and fetched only when needed

### IntersectionObserver for Infinite Scroll

```javascript
const observer = new IntersectionObserver(
  (entries) => {
    if (entries[0].isIntersecting) {
      onLoadMore()
    }
  },
  { root: null, rootMargin: '100px', threshold: 0.1 }
)
observer.observe(sentinelRef.current)
```

---

## CSS Classes Reference

### Container Classes

| Class | Description |
|-------|-------------|
| `.search-page` | Root container (100vh, 100vw) |
| `.two-column-layout` | Flexbox 45%-55% split |
| `.listings-column` | Left panel (45%) |
| `.map-column` | Right panel (55%) |

### Filter Classes

| Class | Description |
|-------|-------------|
| `.inline-filters` | Horizontal filter bar |
| `.filter-group` | Individual filter wrapper |
| `.filter-group.compact` | Compact filter styling |
| `.filter-group.schedule-selector-group` | Schedule selector wrapper |
| `.filter-select` | Dropdown select element |
| `.neighborhood-dropdown-container` | Multi-select with chips |
| `.selected-neighborhoods-chips` | Selected chips container |
| `.neighborhood-chip` | Selected neighborhood tag |
| `.neighborhood-chip-remove` | Remove chip button |
| `.neighborhood-search` | Search input |
| `.neighborhood-list` | Dropdown options list |
| `.neighborhood-checkbox-list` | Checkbox list variant |
| `.neighborhood-checkbox-item` | Individual checkbox item |
| `.neighborhood-selection-count` | Selection count display |

### Map Classes

| Class | Description |
|-------|-------------|
| `.map-header` | Top bar with logo/actions |
| `.map-logo` | Logo link |
| `.map-header-actions` | Right side actions container |
| `.favorites-link` | Favorites heart link |
| `.favorites-badge` | Favorites count badge |
| `.hamburger-menu` | Menu toggle button |
| `.header-dropdown` | Dropdown menu |

### Listing Card Classes

| Class | Description |
|-------|-------------|
| `.listing-card` | Card container (clickable link) |
| `.listing-images` | Image carousel container |
| `.image-nav` | Carousel navigation buttons |
| `.image-counter` | Image count display |
| `.new-badge` | "New Listing" badge |
| `.listing-content` | Card content wrapper |
| `.listing-main-info` | Left side content |
| `.listing-info-top` | Location and title |
| `.listing-location` | Location with icon |
| `.listing-title` | Listing name |
| `.listing-meta` | Property details |
| `.listing-host-row` | Host info and message button |
| `.host-avatar` | Host photo |
| `.host-name` | Host name with verified badge |
| `.message-btn` | Message host button |
| `.listing-price-sidebar` | Right side pricing |
| `.price-main` | Main price display |
| `.price-period` | "/night" label |
| `.price-divider` | Separator line |
| `.price-starting` | Starting price text |
| `.availability-note` | Availability message |
| `.listing-amenities` | Amenity icons row |
| `.amenity-icon` | Individual amenity icon |
| `.amenity-more-count` | "+X more" indicator |

### Mobile Classes

| Class | Description |
|-------|-------------|
| `.mobile-filter-bar` | Fixed top filter buttons |
| `.filter-toggle-btn` | Open filters button |
| `.map-toggle-btn` | Open map button |
| `.mobile-schedule-selector` | Fixed day selector |
| `.mobile-filter-close-btn` | Close filters button |
| `.mobile-map-modal` | Fullscreen map overlay |
| `.mobile-map-header` | Modal header |
| `.mobile-map-close-btn` | Close map button |
| `.mobile-map-content` | Map container |

### State Classes

| Class | Description |
|-------|-------------|
| `.loading-skeleton` | Loading state container |
| `.skeleton-card` | Loading placeholder card |
| `.skeleton-image` | Image placeholder |
| `.skeleton-line` | Text placeholder |
| `.error-message` | Error state container |
| `.retry-btn` | Retry button |
| `.no-results-notice` | Empty state container |
| `.reset-filters-btn` | Reset filters button |
| `.lazy-load-sentinel` | Infinite scroll trigger |
| `.loading-more` | Loading more indicator |
| `.spinner` | Loading spinner |
| `.fallback-listings-section` | Fallback listings container |
| `.fallback-header` | Fallback section header |
| `.fallback-loading` | Fallback loading state |

### Toast Classes

| Class | Description |
|-------|-------------|
| `.toast` | Toast container |
| `.toast-success` | Success variant |
| `.toast-info` | Info variant |
| `.toast-error` | Error variant |
| `.toast-icon` | Icon container |
| `.toast-message` | Message text |
| `.show` | Visible state |

---

## Related Documentation

- [GoogleMap Component](../../app/src/islands/shared/GoogleMap.jsx)
- [AuthAwareSearchScheduleSelector Component](../../app/src/islands/shared/AuthAwareSearchScheduleSelector.jsx)
- [FavoriteButton Component](../../app/src/islands/shared/FavoriteButton.jsx)
- [URL Params Utility](../../app/src/lib/urlParams.js)
- [Data Lookups Utility](../../app/src/lib/dataLookups.js)
- [Constants Configuration](../../app/src/lib/constants.js)
- [Logic Core Index](../../app/src/logic/index.js)
- [Main App CLAUDE.md](../../app/CLAUDE.md)

---

**DOCUMENT_VERSION**: 2.0
**LAST_UPDATED**: 2026-01-20
**STATUS**: Comprehensive Quick Reference - Updated to reflect current implementation
