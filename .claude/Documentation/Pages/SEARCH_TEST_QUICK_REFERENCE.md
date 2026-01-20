# Search Test Page - Quick Reference Guide

**GENERATED**: 2026-01-20
**PAGE URL**: `/search-test.html`
**ENTRY POINT**: `app/src/search-test.jsx`
**MAIN COMPONENT**: `app/src/islands/pages/SearchPageTest.jsx`

---

## Page Purpose

The Search Test page is a **development/testing variant** of the main Search page, designed to display **all Supabase listings with a complete 4-layer filtering architecture**. It serves as:

- **Testing Ground**: Validating listing data transformations and map integrations
- **Filter Architecture Demo**: Full implementation of 4-layer cascading filter system
- **Debug Tool**: Extensive console logging for filter cascade visualization
- **Reference Implementation**: Monolithic component showing all logic in one file

---

## Architecture Overview

### Pattern: Monolithic Component (NOT Hollow Component)

Unlike the production `SearchPage.jsx` which uses the Hollow Component Pattern with a separate `useSearchPageLogic.js` hook, **SearchPageTest.jsx is a self-contained, single-file component** with:

- All sub-components defined inline
- Business logic embedded directly in the main component
- State management co-located with UI rendering
- No external logic hook dependency

```
SearchPageTest.jsx (Single File - 1722 lines)
   MobileFilterBar (inline component)
   NeighborhoodDropdown (inline component)
   FilterPanel (inline component)
   PropertyCard (inline component)
   ListingsGrid (inline component)
   LoadingState (inline component)
   ErrorState (inline component)
   EmptyState (inline component)
   SearchPage (main export - orchestration)
```

---

## File Structure

### Entry Point
```
app/src/search-test.jsx
   Imports SearchPageTest from './islands/pages/SearchPageTest.jsx'
   Mounts to #search-test-page using createRoot
```

### HTML Template
```
app/public/search-test.html
   Google Maps API loading (dynamic via window.ENV)
   Lottie animation initialization (atom animation)
   Environment config loading via /src/lib/config.js
   <div id="search-test-page"></div>
```

### Main Component
```
app/src/islands/pages/SearchPageTest.jsx
   Internal Sub-Components:
      MobileFilterBar - Sticky mobile filter/map toggle buttons
      NeighborhoodDropdown - Multi-select dropdown with search
      FilterPanel - Desktop sidebar filters (unused in current layout)
      PropertyCard - Individual listing card with image carousel
      ListingsGrid - Lazy-loading grid with IntersectionObserver
      LoadingState - Skeleton loading cards
      ErrorState - Error display with retry button
      EmptyState - No results with reset filters button
   Main SearchPage Export
```

---

## Shared Component Dependencies

| Component | Import Path | Purpose |
|-----------|-------------|---------|
| `GoogleMap` | `../shared/GoogleMap.jsx` | Interactive map with dual-layer markers |
| `InformationalText` | `../shared/InformationalText.jsx` | Price info modal |
| `ContactHostMessaging` | `../shared/ContactHostMessaging.jsx` | Contact host modal |
| `AiSignupMarketReport` | `../shared/AiSignupMarketReport` | AI market research signup modal |
| `SearchScheduleSelector` | `../shared/SearchScheduleSelector.jsx` | Day selection component |

---

## State Management

### Core State Variables

```javascript
// Loading & Error
const [isLoading, setIsLoading] = useState(true)
const [error, setError] = useState(null)

// Listings Data (4-layer architecture)
const [allActiveListings, setAllActiveListings] = useState([])     // ALL active (green pins)
const [allListings, setAllListings] = useState([])                 // Final filtered (purple pins)
const [displayedListings, setDisplayedListings] = useState([])     // Lazy-loaded subset for cards
const [loadedCount, setLoadedCount] = useState(0)

// 4-Layer Cascading Filter Results
const [primaryFilteredListings, setPrimaryFilteredListings] = useState([])   // Layer 1
const [secondaryFilteredListings, setSecondaryFilteredListings] = useState([]) // Layer 2
const [tertiaryFilteredListings, setTertiaryFilteredListings] = useState([])  // Layer 3

// Geography
const [boroughs, setBoroughs] = useState([])
const [neighborhoods, setNeighborhoods] = useState([])

// Filters (initialized from URL via parseUrlToFilters())
const [selectedDays, setSelectedDays] = useState(urlFilters.selectedDays)
const [selectedBorough, setSelectedBorough] = useState(urlFilters.selectedBorough)
const [selectedNeighborhoods, setSelectedNeighborhoods] = useState(urlFilters.selectedNeighborhoods)
const [weekPattern, setWeekPattern] = useState(urlFilters.weekPattern)
const [priceTier, setPriceTier] = useState(urlFilters.priceTier)
const [sortBy, setSortBy] = useState(urlFilters.sortBy)
const [neighborhoodSearch, setNeighborhoodSearch] = useState('')

// UI State
const [filterPanelActive, setFilterPanelActive] = useState(false)
const [mapSectionActive, setMapSectionActive] = useState(false)
const [menuOpen, setMenuOpen] = useState(false)

// Modal State
const [isContactModalOpen, setIsContactModalOpen] = useState(false)
const [isInfoModalOpen, setIsInfoModalOpen] = useState(false)
const [isAIResearchModalOpen, setIsAIResearchModalOpen] = useState(false)
const [selectedListing, setSelectedListing] = useState(null)
const [infoModalTriggerRef, setInfoModalTriggerRef] = useState(null)
```

---

## 4-Layer Filter Architecture

The Search Test page implements a **cascading filter system** with explicit layer separation:

### Layer 1: Primary Filters (Database Query)
- **Borough** (required) - Manhattan, Brooklyn, Queens, etc.
- **Week Pattern** - Every week, One week on/off, etc.
- **Sort Order** - Recommended, Price Low-High, Most Popular, Newest
- **Complete + Active** - Only complete and active listings
- **Has Address** - Only listings with location data

### Layer 2: Secondary Filters (Client-side)
- **Neighborhoods** - Multi-select within selected borough
- Filters Layer 1 results by `neighborhoodId`

### Layer 3: Tertiary Filters (Client-side)
- **Price Tier** - Under $200, $200-350, $350-500, $500+
- Filters Layer 2 results by price range

### Layer 4: Display Layer (Routing)
- Routes to appropriate layer based on active filter combination
- Logic: If neighborhoods + price -> Layer 3, if price only -> Layer 3, if neighborhoods only -> Layer 2, else Layer 1

### Final Filter: Schedule/Days
- Applied AFTER all 4 layers
- Filters by `days_available` field
- Empty days_available means available ALL days

### Console Logging for Cascade Visualization

```javascript
console.log('\n=== STARTING 4-LAYER CASCADE =====');
console.log(' LAYER 1 (PRIMARY): Fetching listings with Borough + Week + Sort');
console.log(' LAYER 2 (SECONDARY): Filtering by neighborhoods');
console.log(' LAYER 3 (TERTIARY): Filtering by price');
console.log(' LAYER 4 (DISPLAY): Determining which layer to display');
console.log(' FINAL FILTER: Applying schedule/days filter');
console.log('\n ===== CASCADE SUMMARY =====');
```

---

## URL Parameter Sync

### Supported Parameters

| Parameter | Example | Description |
|-----------|---------|-------------|
| `borough` | `?borough=manhattan` | Selected borough (lowercase, hyphenated) |
| `weekly-frequency` | `?weekly-frequency=one-on-off` | Week pattern filter |
| `pricetier` | `?pricetier=200-350` | Price tier filter |
| `sort` | `?sort=price-low` | Sort option |
| `neighborhoods` | `?neighborhoods=abc123,def456` | Comma-separated IDs |
| `days-selected` | `?days-selected=2,3,4,5,6` | 1-based day indices |

### URL Functions (from `lib/urlParams.js`)

```javascript
// Parse URL to filter state
const filters = parseUrlToFilters()

// Update URL without page reload (uses history.pushState)
updateUrlParams(filters, false)

// Watch for browser back/forward navigation
const cleanup = watchUrlChanges((newFilters) => { ... })

// Check if URL has any filters
const hasFilters = hasUrlFilters()
```

### URL Sync Behavior
- Filters are synced to URL on change (except initial mount)
- Browser back/forward navigation updates filter state
- `isInitialMount` ref prevents URL update on initial load

---

## Data Flow

### 1. Initial Load Sequence

```
1. Component Mount
      Initialize data lookups (if not initialized)
      Parse URL parameters for initial filter state

2. Load ALL Active Listings (once, for green markers)
      Query listing table with Active=true, isForUsability=false
      No filters applied - used for map background

3. Load Boroughs
      Query zat_geo_borough_toplevel table
      Set default to Manhattan if not in URL

4. Load Neighborhoods (on borough change)
      Query zat_geo_hood_mediumlevel filtered by borough
      Clear selected neighborhoods on borough change

5. Fetch Filtered Listings (on any filter change)
      Apply 4-layer cascade
      Transform and display results
```

### 2. Listing Transformation Pipeline

```javascript
const transformListing = (dbListing, images, hostData) => ({
  id: dbListing._id,
  title: dbListing.Name || 'Unnamed Listing',
  location: `${neighborhoodName}, ${boroughName}`,
  neighborhood: neighborhoodName,
  neighborhoodId: dbListing['Location - Hood'],  // For filtering
  borough: boroughName,
  coordinates: { lat, lng },  // Parsed from JSONB 'Location - Address'
  price: {
    starting: dbListing['Standarized Minimum Nightly Price (Filter)'],
    full: dbListing['Nightly Host Rate for 7 nights']
  },
  'Starting nightly price': ...,
  'Price 2 nights selected': ...,
  'Price 3 nights selected': ...,
  'Price 4 nights selected': ...,
  'Price 5 nights selected': ...,
  'Price 6 nights selected': null,  // Note: No 6-night field
  'Price 7 nights selected': ...,
  type: propertyType,
  squareFeet: dbListing['Features - SQFT Area'],
  maxGuests: dbListing['Features - Qty Guests'],
  bedrooms: dbListing['Features - Qty Bedrooms'],
  bathrooms: dbListing['Features - Qty Bathrooms'],
  amenities: parseAmenities(dbListing),
  host: hostData,
  images: images,
  description: `${bedrooms} bedroom * ${bathrooms} bathroom`,
  weeks_offered: dbListing['Weeks offered'],
  days_available: parseJsonArray(dbListing['Days Available (List of Days)']),
  isNew: false
})
```

---

## Map Integration

### Dual-Layer Marker System

| Layer | Color | Data Source | Purpose |
|-------|-------|-------------|---------|
| Background | Green (`#00C851`) | `allActiveListings` | All active listings context |
| Foreground | Purple (`#31135D`) | `allListings` (filtered) | Current search results |

### Map Component Props

```jsx
<GoogleMap
  ref={mapRef}
  listings={allActiveListings}           // Green markers (all active)
  filteredListings={allListings}         // Purple markers (filtered)
  selectedListing={null}
  selectedBorough={selectedBorough}
  onMarkerClick={(listing) => console.log('Marker clicked:', listing.title)}
  onAIResearchClick={handleOpenAIResearchModal}
  onMessageClick={(listing) => handleOpenContactModal(listing)}
/>
```

### Map Header Integration
- Logo and hamburger menu integrated into map column
- Dropdown menu with navigation links (Success Stories, Sign In, Why Split Lease, FAQs)

---

## Two-Column Layout

### Structure

```jsx
<main className="two-column-layout">
  {/* LEFT COLUMN: Listings with filters */}
  <section className="listings-column">
    <MobileFilterBar />
    <div className="mobile-schedule-selector" />
    <div className="inline-filters">
      {/* Schedule Selector Mount Point */}
      <NeighborhoodDropdown />
      {/* Borough, Week Pattern, Price Tier, Sort By selects */}
    </div>
    <div className="listings-count" />
    <div className="listings-content">
      {/* LoadingState | ErrorState | EmptyState | ListingsGrid */}
    </div>
  </section>

  {/* RIGHT COLUMN: Map with header */}
  <section className="map-column">
    <div className="map-header">
      {/* Logo + Hamburger Menu */}
    </div>
    <GoogleMap />
  </section>
</main>
```

### Mobile Behavior
- MobileFilterBar shows filter and map toggle buttons
- Separate mobile schedule selector mount point
- Filter panel slides in as overlay when active

---

## Filter Components

### Inline Filters (Primary UI)

All filters displayed in a horizontal flex container:
1. SearchScheduleSelector (mounted via createRoot)
2. NeighborhoodDropdown (multi-select)
3. Borough select
4. Week Pattern select
5. Price Tier select
6. Sort By select

### NeighborhoodDropdown Features

- Search-as-you-type filtering with sanitization
- Multi-select with checkboxes
- Selected items shown as removable chips
- Dropdown trigger shows count ("3 selected")
- Click outside to close

### FilterPanel (Desktop Sidebar - Currently Unused)

A more detailed filter panel component exists but is not currently rendered in the main layout. Contains:
- Full neighborhood list with checkboxes
- All filter options in vertical layout

---

## PropertyCard Component

### Features
- Image carousel with prev/next buttons
- Image counter (e.g., "3 / 8")
- Favorite button (local state only)
- "New Listing" badge support
- Location with map icon (clickable to zoom on map)
- Title, type, max guests
- Amenity icons (max 6 visible + "+X more")
- Description (bedroom/bathroom count)
- Host info with avatar
- Message button
- Pricing display (starting price + dynamic price)
- Price info icon (opens InformationalText modal)

### Dynamic Price Calculation

```javascript
const calculateDynamicPrice = () => {
  const nightsCount = Math.max(selectedDaysCount - 1, 1);

  // Get host rate for selected nights
  let nightlyHostRate = listing[`Price ${nightsCount} nights selected`] || 0;

  // Fallback to starting price
  if (!nightlyHostRate) {
    nightlyHostRate = listing['Starting nightly price'];
  }

  // Apply pricing formula
  const basePrice = nightlyHostRate * nightsCount;
  const fullTimeDiscount = nightsCount === 7 ? basePrice * 0.13 : 0;
  const priceAfterDiscounts = basePrice - fullTimeDiscount;
  const siteMarkup = priceAfterDiscounts * 0.17;
  const totalPrice = basePrice - fullTimeDiscount + siteMarkup;

  return totalPrice / nightsCount;  // Price per night
}
```

---

## Modals

### 1. Contact Host Modal

```javascript
<ContactHostMessaging
  isOpen={isContactModalOpen}
  onClose={handleCloseContactModal}
  listing={selectedListing}
  userEmail={null}
/>
```

### 2. Price Info Modal

```javascript
<InformationalText
  isOpen={isInfoModalOpen}
  onClose={handleCloseInfoModal}
  listing={selectedListing}
  selectedDaysCount={selectedDays.length}
  triggerRef={infoModalTriggerRef}
/>
```

### 3. AI Research Modal

```javascript
<AiSignupMarketReport
  isOpen={isAIResearchModalOpen}
  onClose={handleCloseAIResearchModal}
/>
```

---

## Lazy Loading

### Configuration (from constants.js)

```javascript
LISTING_CONFIG: {
  INITIAL_LOAD_COUNT: 6,     // Initial listings to display
  LOAD_BATCH_SIZE: 6         // Additional listings per "Load More"
}
```

### Implementation

```javascript
// IntersectionObserver for lazy loading
useEffect(() => {
  if (!sentinelRef.current || !hasMore || isLoading) return;

  const observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting) {
        onLoadMore();
      }
    },
    { root: null, rootMargin: '100px', threshold: 0.1 }
  );

  observer.observe(sentinelRef.current);
  return () => observer.unobserve(sentinelRef.current);
}, [hasMore, isLoading, onLoadMore]);

// Load more handler
const handleLoadMore = useCallback(() => {
  const batchSize = LISTING_CONFIG.LOAD_BATCH_SIZE;
  const nextCount = Math.min(loadedCount + batchSize, allListings.length);
  setDisplayedListings(allListings.slice(0, nextCount));
  setLoadedCount(nextCount);
}, [loadedCount, allListings]);
```

---

## Database Queries

### All Active Listings Query (Green Markers)

```javascript
const { data, error } = await supabase
  .from('listing')
  .select('*')
  .eq('Active', true)
  .eq('isForUsability', false)
  .not('Location - Address', 'is', null);
```

### Boroughs Query

```javascript
const { data, error } = await supabase
  .from('zat_geo_borough_toplevel')
  .select('_id, "Display Borough"')
  .order('"Display Borough"', { ascending: true });
```

### Neighborhoods Query

```javascript
const { data, error } = await supabase
  .from('zat_geo_hood_mediumlevel')
  .select('_id, Display, "Geo-Borough"')
  .eq('"Geo-Borough"', borough.id)
  .order('Display', { ascending: true });
```

### Layer 1 Filtered Listings Query

```javascript
let query = supabase
  .from('listing')
  .select('*')
  .eq('"Complete"', true)
  .or('"Active".eq.true,"Active".is.null')
  .eq('"Location - Borough"', borough.id)
  .not('Location - Address', 'is', null);

// Apply week pattern filter
if (weekPattern !== 'every-week') {
  query = query.eq('"Weeks offered"', WEEK_PATTERNS[weekPattern]);
}

// Apply sorting
const sortConfig = SORT_OPTIONS[sortBy] || SORT_OPTIONS.recommended;
query = query.order(sortConfig.field, { ascending: sortConfig.ascending });
```

---

## Day Indexing

### Critical: Two Systems

| System | Sun | Mon | Tue | Wed | Thu | Fri | Sat |
|--------|-----|-----|-----|-----|-----|-----|-----|
| **JavaScript (internal)** | 0 | 1 | 2 | 3 | 4 | 5 | 6 |
| **URL Parameter (1-based)** | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
| **Bubble API** | 1 | 2 | 3 | 4 | 5 | 6 | 7 |

### Days Filter Logic

```javascript
// Convert selected day indices to day names
const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const selectedDayNames = selectedDays.map(idx => dayNames[idx]);

// Filter listings
finalListings = displayListings.filter(listing => {
  const listingDays = Array.isArray(listing.days_available) ? listing.days_available : [];

  // Empty/null days = available ALL days
  if (listingDays.length === 0) return true;

  const normalizedListingDays = listingDays.map(d => d.toLowerCase().trim());

  // Check if all required days are available
  const missingDays = selectedDayNames.filter(requiredDay =>
    !normalizedListingDays.some(listingDay => listingDay === requiredDay.toLowerCase())
  );

  return missingDays.length === 0;
});
```

---

## SearchScheduleSelector Mounting

The SearchScheduleSelector component is mounted separately via `createRoot` to both desktop and mobile mount points:

```javascript
useEffect(() => {
  const mountPointDesktop = document.getElementById('schedule-selector-mount-point');
  const mountPointMobile = document.getElementById('schedule-selector-mount-point-mobile');
  const roots = [];

  const selectorProps = {
    onSelectionChange: (days) => {
      const dayIndices = days.map(d => d.index);
      setSelectedDays(dayIndices);
    },
    onError: (error) => console.error('SearchScheduleSelector error:', error)
    // NOTE: Not passing initialSelection - component reads from URL internally
  };

  if (mountPointDesktop) {
    const rootDesktop = createRoot(mountPointDesktop);
    rootDesktop.render(<SearchScheduleSelector {...selectorProps} />);
    roots.push(rootDesktop);
  }

  if (mountPointMobile) {
    const rootMobile = createRoot(mountPointMobile);
    rootMobile.render(<SearchScheduleSelector {...selectorProps} />);
    roots.push(rootMobile);
  }

  return () => roots.forEach(root => root.unmount());
}, []);
```

---

## Utility Imports

```javascript
// React
import { useState, useEffect, useRef, useCallback } from 'react';
import { createRoot } from 'react-dom/client';

// Supabase client
import { supabase } from '../../lib/supabase.js';

// Constants
import {
  PRICE_TIERS,
  SORT_OPTIONS,
  WEEK_PATTERNS,
  LISTING_CONFIG,
  VIEW_LISTING_URL,
  SIGNUP_LOGIN_URL,
  SEARCH_URL
} from '../../lib/constants.js';

// Data lookups
import {
  initializeLookups,
  getNeighborhoodName,
  getBoroughName,
  getPropertyTypeLabel,
  isInitialized
} from '../../lib/dataLookups.js';

// URL management
import {
  parseUrlToFilters,
  updateUrlParams,
  watchUrlChanges,
  hasUrlFilters
} from '../../lib/urlParams.js';

// Supabase utilities
import {
  fetchPhotoUrls,
  fetchHostData,
  extractPhotos,
  parseAmenities,
  parseJsonArray
} from '../../lib/supabaseUtils.js';

// Sanitization
import { sanitizeNeighborhoodSearch, sanitizeSearchQuery } from '../../lib/sanitize.js';
```

---

## Differences from Production SearchPage

| Aspect | SearchPage.jsx | SearchPageTest.jsx |
|--------|---------------|-------------------|
| **Pattern** | Hollow Component | Monolithic |
| **Logic Location** | `useSearchPageLogic.js` | Inline in component |
| **Sub-components** | External files | Inline definitions |
| **Testing** | Production-ready | Development/debugging |
| **URL** | `/search.html` | `/search-test.html` |
| **Console Logging** | Minimal | Extensive cascade logging |
| **Layer Tracking** | Implicit | Explicit state variables |

---

## Reset Filters

```javascript
const handleResetFilters = () => {
  setSelectedDays([1, 2, 3, 4, 5]);  // Mon-Fri (0-based)
  const manhattan = boroughs.find(b => b.value === 'manhattan');
  if (manhattan) {
    setSelectedBorough(manhattan.value);
  }
  setSelectedNeighborhoods([]);
  setWeekPattern('every-week');
  setPriceTier('all');
  setSortBy('recommended');
  setNeighborhoodSearch('');
};
```

---

## Console Debugging

The Search Test page includes extensive console logging for debugging the 4-layer cascade:

```javascript
// Layer indicators
console.log(' LAYER 1 (PRIMARY): ...');
console.log(' LAYER 2 (SECONDARY): ...');
console.log(' LAYER 3 (TERTIARY): ...');
console.log(' LAYER 4 (DISPLAY): ...');

// Listing transformation
console.log(' SearchPage: Transforming listing:', { id, name, coordinates });
console.log(' SearchPage: Valid coordinates found:', { id, lat, lng });
console.log(' SearchPage: Missing coordinates for listing:', { id, name });

// Days filter debugging
console.log(`    Listing: "${listing.title}"`);
console.log(`      Raw days_available:`, listing.days_available);
console.log(`      Normalized listing days:`, normalizedListingDays);
console.log(`       PASS` or `       FAIL`);

// Cascade summary
console.log(' Layer 1 (Primary):', layer1Results.length);
console.log(' Layer 2 (Secondary):', layer2Results.length);
console.log(' Layer 3 (Tertiary):', layer3Results.length);
console.log(' Layer 4 (Display):', displayListings.length);
console.log(' Final (After days):', finalListings.length);
```

Enable browser DevTools console to see detailed data flow and filter operations.

---

## Related Files

| File | Purpose |
|------|---------|
| `app/src/search-test.jsx` | Entry point |
| `app/public/search-test.html` | HTML template with Google Maps and Lottie setup |
| `app/src/islands/pages/SearchPageTest.jsx` | Main component (1722 lines) |
| `app/src/islands/shared/GoogleMap.jsx` | Map component |
| `app/src/islands/shared/SearchScheduleSelector.jsx` | Day selector |
| `app/src/islands/shared/ContactHostMessaging.jsx` | Contact host modal |
| `app/src/islands/shared/InformationalText.jsx` | Price info modal |
| `app/src/islands/shared/AiSignupMarketReport.jsx` | AI signup modal |
| `app/src/lib/constants.js` | Configuration (PRICE_TIERS, SORT_OPTIONS, etc.) |
| `app/src/lib/urlParams.js` | URL parameter utilities |
| `app/src/lib/dataLookups.js` | Geography data lookups |
| `app/src/lib/supabaseUtils.js` | Database utilities |
| `app/src/lib/sanitize.js` | Input sanitization |

---

**DOCUMENT VERSION**: 2.0
**LAST UPDATED**: 2026-01-20
**STATUS**: Complete
