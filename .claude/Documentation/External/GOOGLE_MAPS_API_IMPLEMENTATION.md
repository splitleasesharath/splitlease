# Google Maps API Implementation Guide

**GENERATED**: 2026-01-20
**SCOPE**: Comprehensive documentation for Google Maps JavaScript API integration in Split Lease
**VERSION**: 1.0

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Configuration](#configuration)
4. [Core Components](#core-components)
5. [API Loading Strategy](#api-loading-strategy)
6. [Use Cases](#use-cases)
7. [Utilities and Helpers](#utilities-and-helpers)
8. [Borough Map Configurations](#borough-map-configurations)
9. [Styling and Markers](#styling-and-markers)
10. [Best Practices](#best-practices)
11. [Troubleshooting](#troubleshooting)
12. [File Reference](#file-reference)

---

## Overview

Split Lease integrates Google Maps JavaScript API for:
- **Interactive listing maps** on search and listing detail pages
- **Address autocomplete** for listing creation (Places API)
- **Location display** with custom price markers
- **Borough-specific map configurations** for NYC/NJ area

### Google Maps APIs Used

| API | Purpose | Pages Using |
|-----|---------|-------------|
| **Maps JavaScript API** | Interactive map display | SearchPage, ViewSplitLeasePage, FavoriteListingsPage |
| **Places API** | Address autocomplete, validation | SelfListingPage (Section 1) |
| **Places Library** | Address components extraction | SelfListingPage (Section 1) |

---

## Architecture

### Data Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         HTML Page Load                                   │
├─────────────────────────────────────────────────────────────────────────┤
│  1. Load config.js (ES module)                                          │
│     └─> Sets window.ENV.GOOGLE_MAPS_API_KEY from Vite env vars          │
│                                                                          │
│  2. Listen for 'env-config-loaded' event                                │
│                                                                          │
│  3. Dynamically inject Google Maps script                               │
│     └─> URL: maps.googleapis.com/maps/api/js?key={KEY}&libraries=places │
│                                                                          │
│  4. Google Maps callback → window.initMap()                             │
│     └─> Dispatches 'google-maps-loaded' event                           │
│                                                                          │
│  5. React components listen for 'google-maps-loaded'                    │
│     └─> Initialize map instances and autocomplete                       │
└─────────────────────────────────────────────────────────────────────────┘
```

### Component Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     React Component Layer                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  GoogleMap.jsx (shared/GoogleMap.jsx)                                   │
│  └─ Primary map component for SearchPage                                │
│  └─ Uses OverlayView for custom price markers                           │
│  └─ ListingCardForMap overlay on marker click                           │
│                                                                          │
│  Section1SpaceSnapshot.tsx (SelfListingPage)                            │
│  └─ Places Autocomplete for address input                               │
│  └─ NYC bounds restriction (strictBounds: true)                         │
│                                                                          │
│  MapModal.jsx (modals/MapModal.jsx)                                     │
│  └─ UI-only placeholder modal (no Maps integration)                     │
│  └─ Links to Google Maps search URL                                     │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      Utility Layer                                       │
├─────────────────────────────────────────────────────────────────────────┤
│  mapUtils.js - Helper functions                                         │
│  └─ fitBoundsToMarkers, calculateMapCenter, createMarkerIcon            │
│  └─ isValidCoordinates, isGoogleMapsLoaded, waitForGoogleMaps           │
│                                                                          │
│  constants.js - Configuration                                           │
│  └─ BOROUGH_MAP_CONFIG - Center/zoom per NYC borough                    │
│  └─ getBoroughMapConfig() - Retrieve config by borough name             │
│  └─ COLORS.SECONDARY, COLORS.SUCCESS - Marker colors                    │
│                                                                          │
│  config.js - Environment Bridge                                         │
│  └─ Exposes VITE_GOOGLE_MAPS_API_KEY to window.ENV                      │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Configuration

### Environment Variables

| Variable | Location | Purpose |
|----------|----------|---------|
| `VITE_GOOGLE_MAPS_API_KEY` | `app/.env` | Google Maps API key |

### Setting Up API Key

**Local Development:**
```bash
# app/.env
VITE_GOOGLE_MAPS_API_KEY=AIzaSyC...your-key-here
```

**Production (Cloudflare Pages):**
1. Go to Cloudflare Pages Dashboard
2. Select project → Settings → Environment Variables
3. Add `VITE_GOOGLE_MAPS_API_KEY` with your production API key

### Google Cloud Console Setup

1. Create/select project at [Google Cloud Console](https://console.cloud.google.com)
2. Enable required APIs:
   - **Maps JavaScript API**
   - **Places API**
3. Create API key under Credentials
4. **Restrict API key** (recommended):
   - Application restrictions: HTTP referrers
   - Add domains: `*.split.lease/*`, `localhost:*`
   - API restrictions: Select Maps JavaScript API, Places API only

---

## Core Components

### GoogleMap.jsx

**Location:** `app/src/islands/shared/GoogleMap.jsx`

**Purpose:** Main interactive map component for displaying listings with price markers.

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `listings` | Array | `[]` | All listings to show as green markers |
| `filteredListings` | Array | `[]` | Filtered listings to show as purple markers |
| `selectedListing` | Object | `null` | Currently highlighted listing |
| `onMarkerClick` | Function | `null` | Callback when marker clicked |
| `selectedBorough` | String | `null` | Borough for map centering |
| `simpleMode` | Boolean | `false` | Simple marker without price/card |
| `initialZoom` | Number | `null` | Initial zoom level |
| `disableAutoZoom` | Boolean | `false` | Disable auto-fit bounds |
| `onAIResearchClick` | Function | `null` | AI Research button callback |
| `onMessageClick` | Function | `null` | Message button callback |
| `isLoggedIn` | Boolean | `false` | User authentication state |
| `favoritedListingIds` | Set | `new Set()` | Set of favorited listing IDs |
| `onToggleFavorite` | Function | `null` | Favorite toggle callback |
| `userId` | String | `null` | Current user ID |
| `onRequireAuth` | Function | `null` | Auth required callback |

**Features:**

1. **Two Marker Types:**
   - Purple markers (COLORS.SECONDARY) - Filtered/search results
   - Green markers (COLORS.SUCCESS) - All active listings

2. **Custom Price Markers:**
   - Uses `google.maps.OverlayView` for custom HTML markers
   - Price label with hover effects
   - GPU-accelerated with `transform3d`

3. **Listing Card Overlay:**
   - `ListingCardForMap` appears on marker click
   - Auto-pans map if card would be outside viewport
   - Photo gallery navigation

4. **Imperative API:**
   - `zoomToListing(listingId)` - Zoom and highlight specific listing
   - Exposed via `forwardRef` and `useImperativeHandle`

**Usage Example:**
```jsx
import GoogleMap from '../shared/GoogleMap.jsx';

<GoogleMap
  listings={allListings}
  filteredListings={filteredListings}
  selectedBorough="manhattan"
  onMarkerClick={(listing) => console.log('Clicked:', listing)}
/>
```

---

### Section1SpaceSnapshot.tsx

**Location:** `app/src/islands/pages/SelfListingPage/sections/Section1SpaceSnapshot.tsx`

**Purpose:** Address input with Google Places Autocomplete for listing creation.

**Key Implementation:**

```typescript
// Initialize autocomplete with NYC bounds restriction
const nycBounds = new window.google.maps.LatLngBounds(
  new window.google.maps.LatLng(NYC_BOUNDS.south, NYC_BOUNDS.west),
  new window.google.maps.LatLng(NYC_BOUNDS.north, NYC_BOUNDS.east)
);

const autocomplete = new window.google.maps.places.Autocomplete(
  addressInputRef.current,
  {
    types: ['address'],
    componentRestrictions: { country: 'us' },
    bounds: nycBounds,
    strictBounds: true,  // Only NYC/Hudson County NJ results
    fields: ['address_components', 'formatted_address', 'geometry', 'name', 'place_id']
  }
);
```

**Address Component Extraction:**
- Street number & name
- City/Borough
- State
- ZIP code
- Neighborhood
- Latitude/Longitude

---

### mapUtils.js

**Location:** `app/src/lib/mapUtils.js`

**Exported Functions:**

| Function | Parameters | Returns | Description |
|----------|------------|---------|-------------|
| `fitBoundsToMarkers` | `map, markers` | void | Fit map bounds to show all markers |
| `calculateMapCenter` | `listings` | `{lat, lng}` or `null` | Calculate center from listings array |
| `createMarkerIcon` | `color, scale=10` | icon config | Create circular marker icon |
| `createPriceLabel` | `price` | label config | Create price text label |
| `isValidCoordinates` | `coordinates` | boolean | Validate lat/lng object |
| `isGoogleMapsLoaded` | none | boolean | Check if API is loaded |
| `waitForGoogleMaps` | `timeout=10000` | Promise\<boolean\> | Wait for API load |

---

## API Loading Strategy

### HTML Loading Pattern

Each HTML page that needs Google Maps includes this pattern:

```html
<!-- Load environment config first -->
<script type="module" src="/src/lib/config.js"></script>

<!-- Google Maps API with dynamic loading -->
<script>
  // Initialize callback before loading API
  window.initMap = function() {
    console.log('Google Maps API loaded successfully');
    window.dispatchEvent(new Event('google-maps-loaded'));
  };

  // Load Google Maps API dynamically
  function loadGoogleMaps() {
    const apiKey = window.ENV?.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.error('Google Maps API key not configured');
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initMap&loading=async`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  }

  // Wait for config.js to set window.ENV
  if (window.ENV) {
    loadGoogleMaps();
  } else {
    window.addEventListener('env-config-loaded', loadGoogleMaps, { once: true });

    // Fallback timeout
    setTimeout(() => {
      if (!window.ENV) {
        console.error('window.ENV not available');
      } else if (!document.querySelector('script[src*="maps.googleapis.com"]')) {
        loadGoogleMaps();
      }
    }, 2000);
  }
</script>
```

### React Component Initialization

```javascript
// GoogleMap.jsx - Listen for API load event
useEffect(() => {
  const initMap = () => {
    if (!mapRef.current || !window.google) return;
    // Initialize map...
  };

  // Check if already loaded
  if (window.google && window.google.maps && window.google.maps.ControlPosition) {
    initMap();
  } else {
    // Wait for load event
    window.addEventListener('google-maps-loaded', initMap);
    return () => window.removeEventListener('google-maps-loaded', initMap);
  }
}, []);
```

---

## Use Cases

### 1. Search Page Map

**Page:** `SearchPage.jsx`
**Component:** `GoogleMap.jsx`
**Features:**
- Display all active listings as green markers
- Display filtered results as purple markers
- Click marker to show listing card
- Borough-based centering
- "Show all listings" toggle
- AI Research Report button

### 2. Listing Detail Map

**Page:** `ViewSplitLeasePage.jsx`
**Component:** `GoogleMap.jsx` with `simpleMode=true`
**Features:**
- Single listing marker (red Google Maps pin)
- Static display, no info windows
- Zoom to listing coordinates

### 3. Address Autocomplete (Listing Creation)

**Page:** `SelfListingPage`
**Component:** `Section1SpaceSnapshot.tsx`
**Features:**
- NYC/Hudson County NJ restricted results
- Address component parsing
- Coordinate extraction for map placement
- Validation (NYC ZIP code check)

### 4. Map Modal (UI Only)

**Component:** `MapModal.jsx`
**Features:**
- Placeholder modal (no embedded map)
- Address display
- "Open in Google Maps" external link

---

## Borough Map Configurations

**Location:** `app/src/lib/constants.js`

```javascript
export const BOROUGH_MAP_CONFIG = {
  'manhattan': {
    center: { lat: 40.7580, lng: -73.9855 },
    zoom: 13,
    name: 'Manhattan'
  },
  'brooklyn': {
    center: { lat: 40.6782, lng: -73.9442 },
    zoom: 12,
    name: 'Brooklyn'
  },
  'queens': {
    center: { lat: 40.7282, lng: -73.7949 },
    zoom: 11,
    name: 'Queens'
  },
  'bronx': {
    center: { lat: 40.8448, lng: -73.8648 },
    zoom: 12,
    name: 'Bronx'
  },
  'staten-island': {
    center: { lat: 40.5795, lng: -74.1502 },
    zoom: 11,
    name: 'Staten Island'
  },
  'hudson': {
    center: { lat: 40.7357, lng: -74.0339 },
    zoom: 13,
    name: 'Hudson County NJ'
  },
  'default': {
    center: { lat: 40.7580, lng: -73.9855 },
    zoom: 11,
    name: 'New York City'
  }
};

export function getBoroughMapConfig(boroughValue) {
  if (!boroughValue) return BOROUGH_MAP_CONFIG.default;
  const config = BOROUGH_MAP_CONFIG[boroughValue.toLowerCase()];
  return config || BOROUGH_MAP_CONFIG.default;
}
```

---

## Styling and Markers

### Price Marker Styling

Custom price markers are created using `google.maps.OverlayView`:

```javascript
const createPriceMarker = (map, coordinates, price, color, listing) => {
  const markerOverlay = new window.google.maps.OverlayView();

  markerOverlay.onAdd = function() {
    const priceTag = document.createElement('div');
    priceTag.innerHTML = `$${parseFloat(price).toFixed(2)}`;
    priceTag.className = 'map-price-marker';
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
      transform: translate(-50%, -50%);
      z-index: ${color === '#31135D' ? '1002' : '1001'};
    `;

    // Add to overlayMouseTarget pane for click handling
    const panes = this.getPanes();
    panes.overlayMouseTarget.appendChild(priceTag);
    this.div = priceTag;
  };

  markerOverlay.draw = function() {
    const projection = this.getProjection();
    const position = projection.fromLatLngToDivPixel(
      new window.google.maps.LatLng(coordinates.lat, coordinates.lng)
    );
    // GPU-accelerated positioning
    this.div.style.transform = `translate3d(${position.x}px, ${position.y}px, 0) translate(-50%, -50%)`;
  };

  markerOverlay.setMap(map);
  return markerOverlay;
};
```

### Marker Colors

```javascript
export const COLORS = {
  PRIMARY: '#31135d',      // Deep purple
  SECONDARY: '#5B21B6',     // Purple (filtered listings)
  SUCCESS: '#00C851',       // Green (all listings)
  // ...
};
```

### Map Styling

```javascript
const map = new window.google.maps.Map(mapRef.current, {
  center: initialCenter,
  zoom: initialZoomLevel,
  mapTypeControl: true,
  streetViewControl: true,
  fullscreenControl: true,
  zoomControl: true,
  zoomControlOptions: {
    position: window.google.maps.ControlPosition.RIGHT_CENTER
  },
  styles: [
    {
      featureType: 'poi',
      elementType: 'labels',
      stylers: [{ visibility: 'off' }]  // Hide POI labels
    }
  ]
});
```

---

## Best Practices

### 1. Always Validate Coordinates

```javascript
// Before creating markers
if (!listing.coordinates || !listing.coordinates.lat || !listing.coordinates.lng) {
  console.error('Skipping listing - invalid coordinates:', listing.id);
  return;
}
```

### 2. Use Event-Based Loading

```javascript
// Don't assume Google Maps is loaded
window.addEventListener('google-maps-loaded', initMap);
```

### 3. Prevent Duplicate Marker Updates

```javascript
// Track last marker update signature
const markerSignature = `${listings.map(l => l.id).join(',')}-${showAllListings}`;
if (lastMarkersUpdateRef.current === markerSignature) {
  return; // Skip duplicate update
}
```

### 4. Clean Up Markers

```javascript
// Always clear existing markers before creating new ones
markersRef.current.forEach(marker => marker.setMap(null));
markersRef.current = [];
```

### 5. Handle No Fallback

```javascript
// Per project philosophy - no fallback coordinates
export function calculateMapCenter(listings) {
  if (!listings || listings.length === 0) {
    return null;  // Return null, not hardcoded default
  }
  // ...
}
```

---

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Map not loading | API key missing/invalid | Check `window.ENV.GOOGLE_MAPS_API_KEY` in browser console |
| "Google Maps API key not configured" | config.js not loaded | Ensure `<script type="module" src="/src/lib/config.js">` loads first |
| Autocomplete not working | Places library not loaded | Verify `&libraries=places` in script URL |
| Markers not appearing | Invalid coordinates | Check listing `coordinates.lat` and `coordinates.lng` |
| 403 Forbidden | API key restrictions | Check Google Cloud Console referrer restrictions |
| Browser console API errors | API disabled | Enable Maps JavaScript API in Google Cloud Console |

### Debug Logging

The GoogleMap component includes extensive logging:
- `🗺️ GoogleMap:` - General component info
- `✅ GoogleMap:` - Success states
- `⚠️ GoogleMap:` - Warning conditions
- `❌ GoogleMap:` - Errors
- `📊 GoogleMap:` - Marker creation summaries

### Checking API Load Status

```javascript
// In browser console
console.log('Google Maps loaded:', !!window.google?.maps);
console.log('Places loaded:', !!window.google?.maps?.places);
console.log('API Key:', window.ENV?.GOOGLE_MAPS_API_KEY?.substring(0, 20) + '...');
```

---

## File Reference

### Core Implementation Files

| File | Purpose |
|------|---------|
| `app/src/islands/shared/GoogleMap.jsx` | Main interactive map component |
| `app/src/lib/mapUtils.js` | Map utility functions |
| `app/src/lib/constants.js` | Borough configs, colors, defaults |
| `app/src/lib/config.js` | Environment variable bridge |
| `app/src/islands/shared/ListingCard/ListingCardForMap.jsx` | Marker overlay card |
| `app/src/islands/pages/SelfListingPage/sections/Section1SpaceSnapshot.tsx` | Address autocomplete |
| `app/src/islands/modals/MapModal.jsx` | UI-only map modal |

### HTML Pages Loading Google Maps

| HTML File | Use Case |
|-----------|----------|
| `app/public/search.html` | Search page map |
| `app/public/view-split-lease.html` | Listing detail map |
| `app/public/self-listing.html` | Address autocomplete |
| `app/public/self-listing-v2.html` | Address autocomplete (v2) |
| `app/public/search-test.html` | Test search page |
| `app/public/favorite-listings.html` | Favorites page map |
| `app/public/preview-split-lease.html` | Host preview map |

### NPM Dependencies

```json
{
  "@react-google-maps/api": "^2.20.7"
}
```

**Note:** While `@react-google-maps/api` is installed, the current implementation primarily uses vanilla Google Maps JavaScript API directly.

---

## Related Documentation

- [Google Maps JavaScript API Documentation](https://developers.google.com/maps/documentation/javascript)
- [Google Places API Documentation](https://developers.google.com/maps/documentation/places/web-service)
- Project: `.claude/CLAUDE.md` - Main project guide
- Project: `app/CLAUDE.md` - Frontend architecture
- Project: `app/src/CLAUDE.md` - Source code structure

---

**VERSION**: 1.0
**LAST_UPDATED**: 2026-01-20
**MAINTAINER**: Claude Code
