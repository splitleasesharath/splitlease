# Google Maps Implementation Guide - Original Search Page

**Source**: `input/search/app/search-page-2`
**Primary File**: `js/app.js` (lines 1582-1898)
**HTML Structure**: `index.html` (lines 176-198)
**Styling**: `css/styles.css` (map-section, map-container, map-legend)

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Two-Layer Marker System](#two-layer-marker-system)
3. [Filter-to-Map Integration](#filter-to-map-integration)
4. [Borough Navigation System](#borough-navigation-system)
5. [Listing Card Click-to-Map](#listing-card-click-to-map)
6. [Map Initialization Flow](#map-initialization-flow)
7. [Custom Price Markers](#custom-price-markers)
8. [Smooth Pan Animation](#smooth-pan-animation)
9. [Marker Highlighting](#marker-highlighting)
10. [Info Windows](#info-windows)
11. [HTML Structure](#html-structure)
12. [CSS Styling](#css-styling)
13. [Performance Optimizations](#performance-optimizations)
14. [Race Condition Prevention](#race-condition-prevention)

---

## Architecture Overview

### Core Components

The maps implementation consists of these key components:

1. **Map Instance** - `window.mapInstance` (Google Maps object)
2. **Marker Storage** - `window.mapMarkers` (two-layer system)
3. **All Active Listings** - `window.allActiveListings` (green markers dataset)
4. **Current Filtered Listings** - `window.currentListings` (purple markers dataset)
5. **Zoom Operation State** - `window.zoomOperationState` (race condition prevention)

### Data Flow

```
User Action → Filter Change → applyFilters() → Supabase Query
                                  ↓
                          window.currentListings updated
                                  ↓
                          updateMapToMatchFilteredResults()
                                  ↓
                          updateMapMarkers(filteredListings)
                                  ↓
                  Clear existing → Add green markers → Add purple markers
```

---

## Two-Layer Marker System

### Purpose
The map displays TWO layers of markers simultaneously:
- **Green markers** (#00C851): ALL active listings (background context layer)
- **Purple markers** (#31135D): Filtered search results (foreground focus layer)

### Implementation Location
**File**: `js/app.js`
**Lines**: 1656-1742

### Key Data Structures

```javascript
// Global marker storage - two separate layers
window.mapMarkers = {
    green: [],  // All active listings (background layer, z-index: 1)
    purple: []  // Filtered results (foreground layer, z-index: 2)
};

// All active listings for green markers (fetched once)
window.allActiveListings = [];
```

### Fetching All Active Listings

**Function**: `window.fetchAllActiveListings()`
**File**: `js/app.js`
**Lines**: 1665-1679

```javascript
window.fetchAllActiveListings = async function() {
    if (!window.SupabaseAPI || !window.SupabaseAPI.isInitialized) {
        console.warn('⚠️ Cannot fetch all active listings - Supabase not initialized');
        return;
    }

    try {
        console.log('🌍 Fetching ALL active listings for map background...');
        // No filters = all active listings
        const allListings = await window.SupabaseAPI.getListings({});
        window.allActiveListings = allListings;
        console.log(`✅ Fetched ${allListings.length} active listings for green markers`);
    } catch (error) {
        console.error('❌ Error fetching all active listings:', error);
    }
};
```

**When Called**: During map initialization (`actualInitMap()` at line 1871)

### Updating Map Markers

**Function**: `window.updateMapMarkers(filteredListings)`
**File**: `js/app.js`
**Lines**: 1682-1742

**Logic Flow**:

1. **Clear existing markers** from both layers
   ```javascript
   // Clear green markers
   window.mapMarkers.green.forEach(marker => {
       if (marker.setMap) marker.setMap(null);
   });
   window.mapMarkers.green = [];

   // Clear purple markers
   window.mapMarkers.purple.forEach(marker => {
       if (marker.setMap) marker.setMap(null);
   });
   window.mapMarkers.purple = [];
   ```

2. **Add green markers** (all active listings)
   ```javascript
   // First layer: ALL active listings in green
   if (window.allActiveListings && window.allActiveListings.length > 0) {
       for (const listing of window.allActiveListings) {
           const coordinates = extractCoordinates(listing);
           if (coordinates) {
               addPriceMarker(map, coordinates, listing, '#00C851', window.mapMarkers.green);
               greenAddedCount++;
           }
       }
   }
   ```

3. **Add purple markers** (filtered results)
   ```javascript
   // Second layer: Filtered results in purple
   for (const listing of filteredListings) {
       const coordinates = extractCoordinates(listing);
       if (coordinates) {
           addPriceMarker(map, coordinates, listing, '#31135D', window.mapMarkers.purple);
           purpleAddedCount++;
       }
   }
   ```

### Marker Layering

**Z-Index Configuration**:
- Green markers: `z-index: 1` (background)
- Purple markers: `z-index: 2` (foreground)
- Hover state: `z-index: 10` (temporary prominence)

**Code Location**: `js/app.js` line 1806

```javascript
priceTag.style.cssText = `
    z-index: ${color === '#31135D' ? '2' : '1'};
`;
```

---

## Filter-to-Map Integration

### Integration Points

The filter system integrates with maps at multiple touchpoints:

1. **Filter Change Events** → `applyFilters()`
2. **Apply Filters** → Fetch from Supabase
3. **Data Updated** → `updateMapToMatchFilteredResults()`
4. **Map Markers Updated** → `updateMapMarkers()`

### Filter Application Flow

**Function**: `applyFilters()`
**File**: `js/app.js`
**Lines**: 707-799

```javascript
async function applyFilters() {
    // Prevent concurrent filter applications
    if (isApplyingFilters) {
        console.log('⏸️ Filter application already in progress, skipping duplicate call');
        return;
    }
    isApplyingFilters = true;

    try {
        // 1. Collect filter values from UI
        const filterInputs = {
            borough: document.getElementById('boroughSelect')?.value,
            weekPattern: document.getElementById('weekPattern')?.value,
            priceTier: document.getElementById('priceTier')?.value,
            sortBy: document.getElementById('sortBy')?.value,
            neighborhoods: checkedNeighborhoods
        };

        // 2. Build filter configuration
        const filterConfig = window.FilterConfig.buildFilterConfig(filterInputs);

        // 3. Fetch filtered listings from Supabase
        const filteredListings = await window.SupabaseAPI.getListings(filterConfig);

        // 4. Update display
        window.currentListings = filteredListings;
        initializeLazyLoading(filteredListings);
        updateListingCount(filteredListings.length);

        // 5. Update map markers to show all filtered results
        updateMapToMatchFilteredResults();

    } finally {
        isApplyingFilters = false;
    }
}
```

### Update Map to Match Filtered Results

**Function**: `updateMapToMatchFilteredResults()`
**File**: `js/app.js`
**Lines**: 357-366

**Purpose**: Bridge between lazy-loaded listing cards and the map (which shows ALL filtered results, not just displayed cards)

```javascript
function updateMapToMatchFilteredResults() {
    if (!window.mapInstance || !window.updateMapMarkers) {
        return;
    }

    // Show ALL filtered listings on the map, not just lazy-loaded ones
    const allFilteredListings = allListings;
    console.log(`🗺️ Updating map to show all ${allFilteredListings.length} filtered listings`);
    window.updateMapMarkers(allFilteredListings);
}
```

**Key Insight**: The map always shows ALL filtered results, even if only 6-12 listing cards are currently lazy-loaded on the page.

### Filter Event Listeners

**Function**: `setupFilterListeners()`
**File**: `js/app.js`
**Lines**: 638-686

```javascript
function setupFilterListeners() {
    const filters = ['boroughSelect', 'weekPattern', 'priceTier', 'sortBy'];

    filters.forEach(filterId => {
        const element = document.getElementById(filterId);
        if (element) {
            element.addEventListener('change', applyFilters);
        }
    });

    // Borough select - special handling
    const boroughSelect = document.getElementById('boroughSelect');
    if (boroughSelect) {
        boroughSelect.addEventListener('change', async function() {
            updateLocationText();
            clearNeighborhoodSelections();

            // Refresh neighborhoods based on selected borough
            const selectedBorough = boroughSelect.value;
            const boroughId = window.FilterConfig.getBoroughId(selectedBorough);
            await populateNeighborhoods(boroughId);

            // Zoom map to the selected borough
            if (selectedBorough) {
                window.zoomToBorough(selectedBorough);
            }

            // Re-apply filters
            applyFilters();
        });
    }
}
```

**Critical Detail**: Borough change triggers THREE actions:
1. Update neighborhoods dropdown
2. Zoom map to borough center
3. Re-apply filters

---

## Borough Navigation System

### Borough Map Configuration

**Data Structure**: `BOROUGH_MAP_CONFIG`
**File**: `js/app.js`
**Lines**: 1115-1141

```javascript
const BOROUGH_MAP_CONFIG = {
    'manhattan': {
        name: 'Manhattan',
        center: { lat: 40.7831, lng: -73.9712 },  // Times Square area
        zoom: 12  // Shows full Manhattan from Battery to Inwood
    },
    'brooklyn': {
        name: 'Brooklyn',
        center: { lat: 40.6782, lng: -73.9442 },  // Downtown Brooklyn
        zoom: 12  // Shows full Brooklyn from DUMBO to Coney Island
    },
    'queens': {
        name: 'Queens',
        center: { lat: 40.7282, lng: -73.7949 },  // Forest Hills area
        zoom: 11  // Larger area - wider view
    },
    'bronx': {
        name: 'Bronx',
        center: { lat: 40.8448, lng: -73.8648 },  // Fordham area
        zoom: 12  // Shows full Bronx
    },
    'staten-island': {
        name: 'Staten Island',
        center: { lat: 40.5795, lng: -74.1502 },  // St. George area
        zoom: 11  // Larger area - wider view
    }
};
```

**Design Notes**:
- Manhattan uses zoom 12 (denser area)
- Queens and Staten Island use zoom 11 (wider spread)
- Centers are carefully selected to show the entire borough optimally

### Zoom to Borough Function

**Function**: `window.zoomToBorough(boroughValue)`
**File**: `js/app.js`
**Lines**: 1292-1409

**Full Implementation**:

```javascript
window.zoomToBorough = function(boroughValue) {
    if (!boroughValue) {
        console.warn('⚠️ No borough value provided to zoomToBorough');
        return;
    }

    console.log(`🗺️ Zooming to borough: ${boroughValue}`);

    // Race condition prevention: Cancel any in-progress zoom operation
    if (window.zoomOperationState.isZooming) {
        console.log('⏸️ Cancelling previous zoom operation');

        // Cancel all pending timeouts
        window.zoomOperationState.activeTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
        window.zoomOperationState.activeTimeouts = [];

        // Cancel animation frame if exists
        if (window.zoomOperationState.currentAnimationFrameId !== null) {
            cancelAnimationFrame(window.zoomOperationState.currentAnimationFrameId);
            window.zoomOperationState.currentAnimationFrameId = null;
        }

        // Restore UI state from previous operation
        document.body.style.cursor = '';
        if (window.zoomOperationState.lastLocationElement) {
            window.zoomOperationState.lastLocationElement.style.opacity = '1';
        }
    }

    // Set operation lock
    window.zoomOperationState.isZooming = true;

    // Add loading cursor for visual feedback
    document.body.style.cursor = 'wait';

    // Verify map instance exists
    if (!window.mapInstance) {
        console.error('❌ Map not initialized yet');
        window.zoomOperationState.isZooming = false;
        document.body.style.cursor = '';
        return;
    }

    // Normalize borough value to lowercase for lookup
    const boroughKey = boroughValue.toLowerCase();

    // Get borough configuration
    const boroughConfig = BOROUGH_MAP_CONFIG[boroughKey];

    if (!boroughConfig) {
        console.error(`❌ Unknown borough: ${boroughValue}`);
        window.zoomOperationState.isZooming = false;
        document.body.style.cursor = '';
        return;
    }

    // Extract coordinates and zoom level
    const coords = boroughConfig.center;
    const zoomLevel = boroughConfig.zoom;

    // Smoothly zoom and pan to the borough
    console.log(`📍 Panning to ${boroughConfig.name}: ${coords.lat}, ${coords.lng} (Zoom: ${zoomLevel})`);
    window.mapInstance.setZoom(zoomLevel);
    window.smoothPanTo(coords, 800); // 800ms smooth animation

    // Track analytics
    if (typeof gtag !== 'undefined') {
        gtag('event', 'map_zoom_to_borough', {
            event_category: 'Map Interaction',
            event_label: boroughConfig.name,
            borough_value: boroughValue,
            zoom_level: zoomLevel
        });
    }

    // On mobile, ensure map section is visible
    if (window.innerWidth < 768) {
        const mapSection = document.getElementById('mapSection');
        if (mapSection && !mapSection.classList.contains('active')) {
            mapSection.classList.add('active');
            const scrollTimeout = setTimeout(() => {
                mapSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }, 100);
            window.zoomOperationState.activeTimeouts.push(scrollTimeout);
        }
    }

    // Restore cursor after animation completes
    const cleanupTimeout = setTimeout(() => {
        document.body.style.cursor = '';
        window.zoomOperationState.isZooming = false;
        window.zoomOperationState.activeTimeouts = [];
        window.zoomOperationState.lastLocationElement = null;
        console.log(`✅ Borough zoom complete: ${boroughConfig.name}`);
    }, 800);
    window.zoomOperationState.activeTimeouts.push(cleanupTimeout);
};
```

**Key Features**:
1. Race condition prevention (cancels previous operations)
2. Loading cursor visual feedback
3. Smooth 800ms pan animation
4. Analytics tracking
5. Mobile viewport handling
6. Cleanup and state management

---

## Listing Card Click-to-Map

### Location Blip Click Handler

**HTML Structure**: Each listing card has a clickable location element

**File**: `js/app.js`
**Lines**: 449-461

```html
<div class="listing-location"
     onclick="event.preventDefault(); event.stopPropagation(); window.zoomToListing('${listing.id}', event)"
     role="button"
     tabindex="0"
     onkeydown="if(event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); window.zoomToListing('${listing.id}', event); }"
     title="Click to view on map"
     aria-label="View ${listing.location} on map">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
        <circle cx="12" cy="10" r="3"/>
    </svg>
    <span class="location-text">${listing.location}</span>
</div>
```

**Accessibility Features**:
- `role="button"` - Announces as button to screen readers
- `tabindex="0"` - Keyboard focusable
- `onkeydown` - Enter/Space key support
- `aria-label` - Descriptive label for screen readers

### Zoom to Listing Function

**Function**: `window.zoomToListing(listingId, event)`
**File**: `js/app.js`
**Lines**: 1143-1286

**Full Implementation**:

```javascript
window.zoomToListing = function(listingId, event) {
    console.log('Zooming to listing:', listingId);

    // Race condition prevention: Cancel any in-progress zoom operation
    if (window.zoomOperationState.isZooming) {
        console.log('Cancelling previous zoom operation');

        // Cancel all pending timeouts
        window.zoomOperationState.activeTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
        window.zoomOperationState.activeTimeouts = [];

        // Cancel animation frame if exists
        if (window.zoomOperationState.currentAnimationFrameId !== null) {
            cancelAnimationFrame(window.zoomOperationState.currentAnimationFrameId);
            window.zoomOperationState.currentAnimationFrameId = null;
        }

        // Restore UI state from previous operation
        document.body.style.cursor = '';
        if (window.zoomOperationState.lastLocationElement) {
            window.zoomOperationState.lastLocationElement.style.opacity = '1';
        }
    }

    // Set operation lock
    window.zoomOperationState.isZooming = true;

    // Add loading cursor
    document.body.style.cursor = 'wait';
    const locationElement = event?.target?.closest('.listing-location');
    window.zoomOperationState.lastLocationElement = locationElement;

    if (locationElement) {
        locationElement.style.opacity = '0.6';
    }

    // Find the listing in either the current or all listings arrays
    const listing = allListings.find(l => l.id === listingId) ||
                   window.currentListings.find(l => l.id === listingId);

    if (!listing) {
        console.error('Listing not found:', listingId);
        window.zoomOperationState.isZooming = false;
        document.body.style.cursor = '';
        if (locationElement) locationElement.style.opacity = '1';
        return;
    }

    // Verify map instance exists
    if (!window.mapInstance) {
        console.error('Map not initialized yet. Please wait for map to load.');
        window.zoomOperationState.isZooming = false;
        document.body.style.cursor = '';
        if (locationElement) locationElement.style.opacity = '1';
        return;
    }

    // Get coordinates from listing data
    const coords = listing.coordinates || {
        lat: listing.listing_address_latitude,
        lng: listing.listing_address_longitude
    };

    // Validate coordinates
    if (!coords.lat || !coords.lng || coords.lat === 0 || coords.lng === 0) {
        console.error('Invalid coordinates for listing:', listingId, coords);
        alert('Location coordinates not available for this listing.');
        window.zoomOperationState.isZooming = false;
        document.body.style.cursor = '';
        if (locationElement) locationElement.style.opacity = '1';
        return;
    }

    // Determine optimal zoom level based on borough
    let zoomLevel = 16; // Default zoom for street-level view
    if (listing.borough === 'Manhattan') {
        zoomLevel = 17; // Closer zoom for dense areas
    } else if (listing.borough === 'Staten Island' || listing.borough === 'Queens') {
        zoomLevel = 15; // Wider view for less dense areas
    }

    // Smoothly zoom and pan to the location
    window.mapInstance.setZoom(zoomLevel);
    window.smoothPanTo(coords, 800); // 800ms smooth animation

    // Track analytics
    if (typeof gtag !== 'undefined') {
        gtag('event', 'map_zoom_from_listing', {
            event_category: 'Map Interaction',
            event_label: listing.location,
            listing_id: listingId,
            borough: listing.borough,
            neighborhood: listing.neighborhood
        });
    }

    // On mobile, ensure map section is visible
    if (window.innerWidth < 768) {
        const mapSection = document.getElementById('mapSection');
        if (mapSection && !mapSection.classList.contains('active')) {
            mapSection.classList.add('active');
            const scrollTimeout = setTimeout(() => {
                mapSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }, 100);
            window.zoomOperationState.activeTimeouts.push(scrollTimeout);
        }
    }

    // Highlight the marker
    window.highlightMarker(listingId);

    // Show info window with listing details
    const infoWindowTimeout = setTimeout(() => {
        window.showListingInfoWindow(listingId);
    }, 600); // Delay to allow map pan to complete
    window.zoomOperationState.activeTimeouts.push(infoWindowTimeout);

    // Restore cursor after animation completes
    const cleanupTimeout = setTimeout(() => {
        document.body.style.cursor = '';
        if (locationElement) {
            locationElement.style.opacity = '1';
        }
        window.zoomOperationState.isZooming = false;
        window.zoomOperationState.activeTimeouts = [];
        window.zoomOperationState.lastLocationElement = null;
    }, 800);
    window.zoomOperationState.activeTimeouts.push(cleanupTimeout);
};
```

**Dynamic Zoom Levels by Borough**:
- **Manhattan**: Zoom 17 (very close - dense area)
- **Staten Island / Queens**: Zoom 15 (wider - spread out)
- **Others**: Zoom 16 (default street-level)

**Sequence of Actions**:
1. Cancel any previous zoom operations
2. Visual feedback (cursor + opacity)
3. Find listing and validate coordinates
4. Set zoom level based on borough
5. Smooth pan to location (800ms)
6. Highlight marker (3-second pulse)
7. Show info window (600ms delay)
8. Clean up state after completion

---

## Map Initialization Flow

### Initialization Callback

**Early Declaration**: Lines 6-21
```javascript
// Define initMap early to prevent Google Maps callback timing errors
window.initMap = function() {
    console.log('🗺️ initMap callback triggered (early declaration)');
    if (typeof window.actualInitMap === 'function') {
        window.actualInitMap();
    } else {
        console.warn('⚠️ actualInitMap not yet defined, will retry');
        setTimeout(() => {
            if (typeof window.actualInitMap === 'function') {
                window.actualInitMap();
            }
        }, 500);
    }
};
```

**Purpose**: Declared early to be available when Google Maps API callback fires.

### Actual Map Initialization

**Function**: `window.actualInitMap()`
**File**: `js/app.js`
**Lines**: 1583-1898

**Step-by-Step Process**:

1. **Verify map element exists**
   ```javascript
   const mapElement = document.getElementById('map');
   if (!mapElement) {
       console.error('❌ Map element not found');
       return;
   }
   ```

2. **Check Google Maps API loaded**
   ```javascript
   if (typeof google === 'undefined' || !google.maps) {
       console.error('❌ Google Maps API not loaded');
       showMapPlaceholder(mapElement);
       return;
   }
   ```

3. **Create map instance**
   ```javascript
   const nycCenter = { lat: 40.7580, lng: -73.9855 };

   map = new google.maps.Map(mapElement, {
       center: nycCenter,
       zoom: 13,
       mapTypeControl: false,
       streetViewControl: false,
       fullscreenControl: false,
       zoomControl: true,
       zoomControlOptions: {
           position: google.maps.ControlPosition.RIGHT_CENTER
       },
       styles: [
           {
               featureType: "poi",
               elementType: "labels",
               stylers: [{ visibility: "off" }]
           },
           {
               featureType: "transit",
               elementType: "labels",
               stylers: [{ visibility: "off" }]
           }
       ]
   });
   ```

4. **Store map instance globally**
   ```javascript
   window.mapInstance = map;
   window.mapMarkers = {
       green: [],
       purple: []
   };
   ```

5. **Fetch all active listings for green markers**
   ```javascript
   window.fetchAllActiveListings().then(() => {
       const listingsToMap = window.currentListings;

       if (listingsToMap && listingsToMap.length > 0) {
           window.updateMapMarkers(listingsToMap);
       } else {
           window.updateMapMarkers([]);
       }
   });
   ```

6. **Force resize after delay** (ensures proper rendering)
   ```javascript
   setTimeout(() => {
       google.maps.event.trigger(map, 'resize');
       map.setCenter(nycCenter);
   }, 500);
   ```

### HTML Script Loading

**File**: `index.html`
**Lines**: 388-438

```html
<script>
    function loadGoogleMaps() {
        console.log('🗺️ Starting Google Maps loading process...');

        const apiKey = window.ENV?.GOOGLE_MAPS_API_KEY || 'YOUR_API_KEY';
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initMap&loading=async`;
        script.async = true;
        script.defer = true;

        script.onload = function() {
            console.log('✅ Google Maps script loaded successfully');
        };

        script.onerror = function() {
            console.error('❌ Failed to load Google Maps script');
            if (typeof showMapPlaceholder === 'function') {
                const mapElement = document.getElementById('map');
                if (mapElement) showMapPlaceholder(mapElement);
            }
        };

        document.head.appendChild(script);
    }

    // Load maps when page is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadGoogleMaps);
    } else {
        loadGoogleMaps();
    }
</script>
```

**Key Parameters**:
- `callback=initMap` - Calls `window.initMap()` when loaded
- `loading=async` - Optimizes loading performance
- `libraries=places` - Loads Places API (for future autocomplete)

---

## Custom Price Markers

### Why Custom Markers?

The implementation uses **custom OverlayView markers** instead of standard Google Maps markers because:
1. Need to display dynamic pricing text
2. Require custom styling (purple/green colors, rounded pill shape)
3. Need layering control (z-index for green/purple)
4. Want smooth hover effects and animations

### Marker Creation Function

**Function**: `addPriceMarker(map, coordinates, listing, color, markersArray)`
**File**: `js/app.js`
**Lines**: 1771-1867

**Full Implementation**:

```javascript
function addPriceMarker(map, coordinates, listing, color, markersArray) {
    const price = listing['Starting nightly price'] ||
                 listing['💰Nightly Host Rate for 7 nights'] ||
                 listing['💰Nightly Host Rate for 2 nights'] ||
                 listing.price?.starting ||
                 0;

    const title = listing.Name || listing.title || 'Split Lease Property';
    const location = listing['Location - Hood'] ||
                    listing['neighborhood (manual input by user)'] ||
                    listing['Location - Borough'] ||
                    listing.location ||
                    'Manhattan';

    // Determine hover color based on base color
    const hoverColor = color === '#00C851' ? '#00A040' : '#522580';

    const markerOverlay = new google.maps.OverlayView();

    markerOverlay.onAdd = function() {
        const priceTag = document.createElement('div');
        priceTag.innerHTML = `$${parseFloat(price).toFixed(2)}`;
        priceTag.style.cssText = `
            position: absolute;
            background: ${color};
            color: white;
            padding: 6px 12px;
            border-radius: 20px;
            font-weight: 600;
            font-size: 14px;
            font-family: 'Inter', sans-serif;
            white-space: nowrap;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
            cursor: pointer;
            transition: background-color 0.2s ease;
            transform: translate(-50%, -50%);
            z-index: ${color === '#31135D' ? '2' : '1'};
        `;

        // Hover effect
        priceTag.addEventListener('mouseenter', () => {
            priceTag.style.background = hoverColor;
            priceTag.style.transition = 'background-color 0.2s ease, transform 0.2s ease';
            priceTag.style.transform = 'translate(-50%, -50%) scale(1.1)';
            priceTag.style.zIndex = '10';
        });

        priceTag.addEventListener('mouseleave', () => {
            priceTag.style.background = color;
            priceTag.style.transform = 'translate(-50%, -50%) scale(1)';
            priceTag.style.zIndex = color === '#31135D' ? '2' : '1';
            // Remove transition after hover ends to prevent reanimation during map drag
            setTimeout(() => {
                priceTag.style.transition = 'background-color 0.2s ease';
            }, 200);
        });

        // Info window on click
        const infoWindow = new google.maps.InfoWindow({
            content: `
                <div style="padding: 12px; min-width: 200px;">
                    <h4 style="margin: 0 0 6px 0; color: #1a1a1a; font-size: 16px;">${title}</h4>
                    <p style="margin: 0 0 6px 0; color: #6b7280; font-size: 13px;">${location}</p>
                    <p style="margin: 0; font-weight: 600; color: #31135D; font-size: 14px;">$${parseFloat(price).toFixed(2)}/night</p>
                </div>
            `
        });

        priceTag.addEventListener('click', () => {
            infoWindow.open(map, markerOverlay);
            infoWindow.setPosition(coordinates);
        });

        this.div = priceTag;
        const panes = this.getPanes();
        panes.overlayLayer.appendChild(priceTag);
    };

    markerOverlay.draw = function() {
        const projection = this.getProjection();
        const position = projection.fromLatLngToDivPixel(
            new google.maps.LatLng(coordinates.lat, coordinates.lng)
        );

        if (this.div) {
            // Use transform3d for GPU acceleration
            this.div.style.transform = `translate3d(${position.x}px, ${position.y}px, 0) translate(-50%, -50%)`;
        }
    };

    markerOverlay.onRemove = function() {
        if (this.div) {
            this.div.parentNode.removeChild(this.div);
            this.div = null;
        }
    };

    markerOverlay.setMap(map);
    markerOverlay.listingId = listing.id; // Store listing ID for marker identification
    markersArray.push(markerOverlay);
}
```

### Marker Styling Breakdown

**Base Styles**:
```css
background: #00C851 (green) or #31135D (purple)
color: white
padding: 6px 12px
border-radius: 20px (pill shape)
font-weight: 600
font-size: 14px
box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2)
```

**Hover Styles**:
```css
background: #00A040 (dark green) or #522580 (dark purple)
transform: translate(-50%, -50%) scale(1.1) (10% larger)
z-index: 10 (brings to front)
```

**Performance Optimization**:
- Uses `transform3d` for GPU acceleration during map drag
- Removes transition after hover to prevent re-animation during pan/drag

---

## Smooth Pan Animation

### Purpose

Provides a smooth, eased animation when panning the map to a new location, rather than jumping instantly.

### Implementation

**Function**: `window.smoothPanTo(targetCoords, duration = 1000)`
**File**: `js/app.js`
**Lines**: 1548-1580

**Full Implementation**:

```javascript
window.smoothPanTo = function(targetCoords, duration = 1000) {
    const map = window.mapInstance;
    if (!map) return;

    const startCoords = map.getCenter();
    const startTime = Date.now();

    const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Easing function (ease-in-out cubic)
        const eased = progress < 0.5
            ? 2 * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 2) / 2;

        const currentLat = startCoords.lat() + (targetCoords.lat - startCoords.lat()) * eased;
        const currentLng = startCoords.lng() + (targetCoords.lng - startCoords.lng()) * eased;

        map.setCenter({ lat: currentLat, lng: currentLng });

        if (progress < 1) {
            // Track animation frame ID for cancellation support
            window.zoomOperationState.currentAnimationFrameId = requestAnimationFrame(animate);
        } else {
            // Animation complete, clear the frame ID
            window.zoomOperationState.currentAnimationFrameId = null;
        }
    };

    // Start animation and track initial frame
    window.zoomOperationState.currentAnimationFrameId = requestAnimationFrame(animate);
};
```

### Easing Function

Uses **ease-in-out cubic** easing:
```javascript
const eased = progress < 0.5
    ? 2 * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 2) / 2;
```

**Behavior**:
- Starts slow
- Speeds up in the middle
- Slows down at the end
- Creates natural, smooth motion

### Cancellation Support

The function stores the `requestAnimationFrame` ID in `window.zoomOperationState.currentAnimationFrameId`, allowing it to be cancelled if a new zoom operation starts.

---

## Marker Highlighting

### Purpose

When a user clicks a location blip in a listing card, the corresponding map marker should pulse/highlight to draw attention.

### Implementation

**Function**: `window.highlightMarker(listingId)`
**File**: `js/app.js`
**Lines**: 1415-1486

**Full Implementation**:

```javascript
window.highlightMarker = function(listingId) {
    // Cancel any existing highlight timeouts to prevent overlap
    if (window.markerHighlightTimeouts) {
        window.markerHighlightTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
    }
    window.markerHighlightTimeouts = [];

    // Get all markers from both layers
    const allMarkers = [
        ...(window.mapMarkers?.green || []),
        ...(window.mapMarkers?.purple || [])
    ];

    if (allMarkers.length === 0) {
        console.warn('No markers available to highlight');
        return;
    }

    // Reset all markers to normal state first
    allMarkers.forEach(marker => {
        if (marker.div) {
            // Remove any existing highlight transforms
            marker.div.style.transform = marker.div.style.transform
                .replace(/scale\([^)]+\)/g, '')
                .trim();
            // Reset z-index to layer default
            marker.div.style.zIndex = marker.div.classList.contains('purple') ? '2' : '1';
            marker.div.style.transition = 'transform 0.3s ease, box-shadow 0.3s ease';
        }
    });

    // Find and highlight the target marker
    const targetMarker = allMarkers.find(m => m.listingId === listingId);

    if (targetMarker && targetMarker.div) {
        // Apply highlight effect
        targetMarker.div.style.transform = 'scale(1.3)';
        targetMarker.div.style.zIndex = '999';
        targetMarker.div.style.boxShadow = '0 8px 16px rgba(49, 19, 93, 0.4)';

        // Pulse animation
        const pulseTimeout1 = setTimeout(() => {
            if (targetMarker.div) {
                targetMarker.div.style.transform = 'scale(1.4)';
            }
        }, 150);
        window.markerHighlightTimeouts.push(pulseTimeout1);

        const pulseTimeout2 = setTimeout(() => {
            if (targetMarker.div) {
                targetMarker.div.style.transform = 'scale(1.3)';
            }
        }, 300);
        window.markerHighlightTimeouts.push(pulseTimeout2);

        // Reset after 3 seconds
        const resetTimeout = setTimeout(() => {
            if (targetMarker.div) {
                targetMarker.div.style.transform = 'scale(1)';
                targetMarker.div.style.boxShadow = '';
                targetMarker.div.style.zIndex = targetMarker.div.classList.contains('purple') ? '2' : '1';
            }
            window.markerHighlightTimeouts = [];
        }, 3000);
        window.markerHighlightTimeouts.push(resetTimeout);

        console.log('Marker highlighted for listing:', listingId);
    } else {
        console.warn('Marker not found for listing:', listingId);
    }
};
```

### Highlight Animation Sequence

1. **t=0ms**: Scale to 1.3x + strong shadow + z-index 999
2. **t=150ms**: Scale to 1.4x (pulse up)
3. **t=300ms**: Scale back to 1.3x (pulse down)
4. **t=3000ms**: Reset to normal (scale 1, remove shadow, restore z-index)

---

## Info Windows

### Purpose

Show listing details in a popup when:
1. User clicks a map marker
2. User clicks a location blip (automatically shown 600ms after pan)

### Show Info Window Function

**Function**: `window.showListingInfoWindow(listingId)`
**File**: `js/app.js`
**Lines**: 1492-1541

**Full Implementation**:

```javascript
window.showListingInfoWindow = function(listingId) {
    const listing = allListings.find(l => l.id === listingId) ||
                   window.currentListings.find(l => l.id === listingId);

    if (!listing || !window.mapInstance) return;

    const coords = listing.coordinates || {
        lat: listing.listing_address_latitude,
        lng: listing.listing_address_longitude
    };

    // Close any existing info windows
    if (window.currentInfoWindow) {
        window.currentInfoWindow.close();
    }

    // Create info window content
    const contentHTML = `
        <div style="padding: 12px; max-width: 280px; font-family: system-ui, -apple-system, sans-serif;">
            <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #1f2937;">
                ${listing.title || 'Listing'}
            </h3>
            <p style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280; display: flex; align-items: center; gap: 4px;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                </svg>
                ${listing.location}
            </p>
            <p style="margin: 0; font-size: 18px; font-weight: 700; color: #31135d;">
                $${listing.price?.starting || listing['Starting nightly price'] || 'N/A'}
                <span style="font-size: 14px; font-weight: 400; color: #6b7280;">/night</span>
            </p>
        </div>
    `;

    // Create and open info window
    const infoWindow = new google.maps.InfoWindow({
        content: contentHTML,
        position: coords
    });

    infoWindow.open(window.mapInstance);
    window.currentInfoWindow = infoWindow;

    // Auto-close after 5 seconds
    setTimeout(() => {
        infoWindow.close();
    }, 5000);
};
```

### Info Window Content

**Structure**:
- Listing title (bold, 16px)
- Location with pin icon (14px, gray)
- Price (18px, bold, purple) + "/night" (14px, light gray)

**Auto-Close**: 5 seconds

---

## HTML Structure

### Map Section

**File**: `index.html`
**Lines**: 176-198

```html
<!-- Map Section -->
<section class="map-section" id="mapSection">
    <div class="map-wrapper">
        <div id="map" class="map-container"></div>

        <!-- Floating Deep Research Button -->
        <button class="deep-research-floating-btn" id="deepResearchBtn" onclick="openAiSignupModal()">
            <div class="atom-animation" id="atomAnimation"></div>
            <span>Generate Market Report</span>
        </button>

        <div class="map-legend">
            <div class="legend-item">
                <span class="legend-marker" style="background: #00C851;"></span>
                <span>All Active Listings</span>
            </div>
            <div class="legend-item">
                <span class="legend-marker" style="background: #31135D;"></span>
                <span>Search Results</span>
            </div>
        </div>
    </div>
</section>
```

### Map Element

**ID**: `map`
**Class**: `map-container`

This is the element where the Google Map instance is mounted.

### Map Legend

Shows two legend items:
1. **Green marker** = "All Active Listings"
2. **Purple marker** = "Search Results"

---

## CSS Styling

### Map Section

**File**: `css/styles.css`
**Lines**: 1106-1196

```css
/* Map Section */
.map-section {
    position: sticky;
    top: 100px;
    height: calc(100vh - 250px);
}

.map-wrapper {
    height: 100%;
    display: flex;
    flex-direction: column;
    background: white;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    position: relative;
}

.map-container {
    width: 100%;
    flex: 1;
    position: relative;
    min-height: 400px;
    background: #f3f4f6;
}
```

**Key Points**:
- `position: sticky` - Map stays visible while scrolling listings
- `top: 100px` - Starts sticky 100px from top
- `height: calc(100vh - 250px)` - Takes up most of viewport
- `border-radius: 12px` - Rounded corners
- `box-shadow` - Subtle elevation

### Map Legend

```css
.map-legend {
    position: absolute;
    bottom: 20px;
    left: 20px;
    background: white;
    padding: 12px 16px;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    z-index: 100;
}

.legend-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 14px;
    color: #6b7280;
}

.legend-marker {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    flex-shrink: 0;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}
```

### Location Blip Styling

```css
.listing-location {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 14px;
    color: #666;
}

/* Interactive location - clickable to zoom map */
.listing-location[onclick] {
    cursor: pointer;
    transition: all 0.2s ease;
    padding: 4px 8px;
    margin: -4px -8px 0.375rem -8px;
    border-radius: 4px;
    position: relative;
}

.listing-location[onclick]:hover {
    color: var(--primary-purple, #31135d);
    background-color: rgba(49, 19, 93, 0.05);
}

.listing-location[onclick]:hover svg {
    stroke: var(--primary-purple, #31135d);
}

.listing-location[onclick]:active {
    background-color: rgba(49, 19, 93, 0.1);
    transform: scale(0.98);
}

/* Focus state for keyboard navigation */
.listing-location[onclick]:focus {
    outline: 2px solid var(--primary-purple, #31135d);
    outline-offset: 2px;
}

/* Subtle animation hint */
.listing-location[onclick]::after {
    content: '';
    position: absolute;
    inset: -2px;
    border-radius: 4px;
    background: rgba(49, 19, 93, 0.1);
    opacity: 0;
    transition: opacity 0.2s ease;
    pointer-events: none;
}

.listing-location[onclick]:hover::after {
    opacity: 1;
}
```

---

## Performance Optimizations

### 1. Deduplication Logic (Git Commit 198c6e9)

**Problem**: Map markers were being cleared and redrawn 4-5 times during initial page load, causing CPU spikes.

**Solution**: Added marker signature tracking

**Implementation** (Not in original code, but recommended pattern):

```javascript
// In GoogleMap.jsx (React version)
const lastMarkersUpdateRef = useRef(null);

useEffect(() => {
    // Generate signature from listing IDs and filter state
    const markerSignature = `${listings.map(l => l.id).join(',')}-${filteredListings.map(l => l.id).join(',')}-${showAllListings}`;

    // Skip duplicate marker updates
    if (lastMarkersUpdateRef.current === markerSignature) {
        console.log('⏭️ GoogleMap: Skipping duplicate marker update - same listings');
        return;
    }

    lastMarkersUpdateRef.current = markerSignature;

    // Proceed with marker update...
}, [listings, filteredListings, showAllListings]);
```

### 2. GPU Acceleration for Markers

Uses `transform3d` instead of `translate` for marker positioning during map drag:

```javascript
markerOverlay.draw = function() {
    const projection = this.getProjection();
    const position = projection.fromLatLngToDivPixel(
        new google.maps.LatLng(coordinates.lat, coordinates.lng)
    );

    if (this.div) {
        // GPU-accelerated positioning
        this.div.style.transform = `translate3d(${position.x}px, ${position.y}px, 0) translate(-50%, -50%)`;
    }
};
```

**Benefit**: Offloads rendering to GPU, smoother map dragging with many markers.

### 3. Transition Management During Hover

Removes transitions after hover ends to prevent re-animation during map pan/drag:

```javascript
priceTag.addEventListener('mouseleave', () => {
    priceTag.style.background = color;
    priceTag.style.transform = 'translate(-50%, -50%) scale(1)';
    priceTag.style.zIndex = color === '#31135D' ? '2' : '1';

    // Remove transition after 200ms to prevent reanimation during drag
    setTimeout(() => {
        priceTag.style.transition = 'background-color 0.2s ease';
    }, 200);
});
```

### 4. Coordinate Extraction Caching

Extracts coordinates once per listing and validates:

```javascript
function extractCoordinates(listing) {
    let coordinates = null;

    // Check if listing already has coordinates object
    if (listing.coordinates && listing.coordinates.lat && listing.coordinates.lng) {
        const lat = parseFloat(listing.coordinates.lat);
        const lng = parseFloat(listing.coordinates.lng);
        if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
            coordinates = { lat, lng };
        }
    }
    // Check for database lat/lng fields
    else if (listing.listing_address_latitude && listing.listing_address_longitude) {
        const lat = parseFloat(listing.listing_address_latitude);
        const lng = parseFloat(listing.listing_address_longitude);
        if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
            coordinates = { lat, lng };
        }
    }

    return coordinates;
}
```

**Validates**:
- Coordinates exist
- Are valid numbers
- Are not zero (invalid)

---

## Race Condition Prevention

### The Problem

When a user rapidly clicks multiple location blips or changes boroughs quickly, multiple zoom operations can start simultaneously, causing:
- Conflicting animations
- UI stuck in loading state
- Incorrect final map position
- Memory leaks from uncancelled timeouts

### The Solution: Zoom Operation State

**Data Structure**: `window.zoomOperationState`
**File**: `js/app.js`
**Lines**: 1107-1112

```javascript
window.zoomOperationState = {
    isZooming: false,                    // Operation lock
    activeTimeouts: [],                  // All pending setTimeout IDs
    currentAnimationFrameId: null,       // requestAnimationFrame ID
    lastLocationElement: null            // Last clicked element (for cleanup)
};
```

### Cancellation Logic

Used in both `zoomToListing` and `zoomToBorough`:

```javascript
// Cancel any in-progress zoom operation
if (window.zoomOperationState.isZooming) {
    console.log('Cancelling previous zoom operation');

    // Cancel all pending timeouts
    window.zoomOperationState.activeTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
    window.zoomOperationState.activeTimeouts = [];

    // Cancel animation frame if exists
    if (window.zoomOperationState.currentAnimationFrameId !== null) {
        cancelAnimationFrame(window.zoomOperationState.currentAnimationFrameId);
        window.zoomOperationState.currentAnimationFrameId = null;
    }

    // Restore UI state from previous operation
    document.body.style.cursor = '';
    if (window.zoomOperationState.lastLocationElement) {
        window.zoomOperationState.lastLocationElement.style.opacity = '1';
    }
}

// Set operation lock
window.zoomOperationState.isZooming = true;
```

### Timeout Tracking

All `setTimeout` calls are tracked:

```javascript
// Example: Scroll timeout for mobile
const scrollTimeout = setTimeout(() => {
    mapSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}, 100);
window.zoomOperationState.activeTimeouts.push(scrollTimeout);
```

### Cleanup

After operation completes:

```javascript
const cleanupTimeout = setTimeout(() => {
    document.body.style.cursor = '';
    if (locationElement) {
        locationElement.style.opacity = '1';
    }
    // Release operation lock
    window.zoomOperationState.isZooming = false;
    window.zoomOperationState.activeTimeouts = [];
    window.zoomOperationState.lastLocationElement = null;
}, 800);
window.zoomOperationState.activeTimeouts.push(cleanupTimeout);
```

**Benefits**:
- Prevents conflicting zoom operations
- Ensures UI state is always correct
- No memory leaks from abandoned timeouts
- Smooth user experience even with rapid interactions

---

## Summary

This guide documents the complete Google Maps implementation from the original search page. Key architectural decisions:

1. **Two-Layer Marker System** - Green (all active) + Purple (filtered)
2. **Custom OverlayView Markers** - For dynamic pricing and custom styling
3. **Smooth Animations** - Ease-in-out cubic for natural motion
4. **Race Condition Prevention** - Sophisticated state management
5. **Performance Optimizations** - GPU acceleration, deduplication, transition management
6. **Accessibility** - Keyboard navigation, ARIA labels, screen reader support
7. **Mobile Responsive** - Toggleable map section, adaptive zoom levels

All code is production-tested and has been running on `splitlease.app/search` (original implementation).

---

**Document Version**: 1.0
**Last Updated**: 2025-11-12
**Source Files Analyzed**:
- `js/app.js` (2030 lines)
- `index.html` (492 lines)
- `css/styles.css` (1234 lines)
- Git history (15 commits)
