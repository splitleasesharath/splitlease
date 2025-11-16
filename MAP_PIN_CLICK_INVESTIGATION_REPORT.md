# Map Pin Click Behavior Investigation Report
**Date:** 2025-11-16
**Component:** Search Page - Google Map Pin Interactions
**Status:** ⚠️ Issue Identified - Unintended Map Viewport Changes on Filter Updates

---

## Executive Summary

When users click on map pins on the search page, they experience erratic behavior including:
- **Pins appearing to relocate or jump**
- **Pins temporarily disappearing/hiding**
- **Map viewport unexpectedly recentering**
- **Listing cards becoming misaligned with their pins**

**Root Cause:** The marker recreation effect is triggered by filter changes that happen concurrently with pin clicks, causing the map to auto-fit bounds and shift the viewport. While the effect has safeguards to prevent duplicate updates, any legitimate filter change clears all markers, recreates them, and calls `fitBounds()`, which disrupts the user's current view.

---

## Architecture Overview

### Component Hierarchy

```
SearchPage.jsx (C:\Users\Split Lease\...\SearchPage.jsx)
├── GoogleMap.jsx (C:\Users\Split Lease\...\GoogleMap.jsx)
│   ├── Price Markers (OverlayView)
│   └── ListingCardForMap.jsx (popup card on pin click)
```

### Data Flow

```
SearchPage → allActiveListings → GoogleMap → Green Pins (background layer)
SearchPage → allListings (filtered) → GoogleMap → Purple Pins (search results)
```

---

## Map Configuration & Setup

### Initial Configuration
**File:** `GoogleMap.jsx:263-334`

```javascript
// Map initialization settings
{
  center: initialCenter,           // Default or listing-specific
  zoom: initialZoomLevel,          // Auto or specified
  mapTypeControl: true,            // Map/Satellite toggle
  streetViewControl: true,         // Street view enabled
  fullscreenControl: true,         // Fullscreen button
  zoomControl: true,              // Zoom +/- buttons
  zoomControlOptions: {
    position: window.google.maps.ControlPosition.RIGHT_CENTER
  },
  styles: [
    {
      featureType: 'poi',          // Hide POI labels
      elementType: 'labels',
      stylers: [{ visibility: 'off' }]
    }
  ]
}
```

**Default Center:** Based on `getBoroughMapConfig()` from constants
**Initial Zoom:** Auto-fit to show all markers (unless `initialZoom` specified)
**Search Page Usage:** Standard mode (not simple mode), no `disableAutoZoom` flag

---

## Two-Layer Pin System

### Layer 1: Green Pins (Background Context)
- **Source:** `allActiveListings` prop from SearchPage.jsx:1644
- **Data Origin:** Fetched from Supabase with minimal filters:
  - `Active = true`
  - `isForUsability = false`
  - NO borough, price, schedule, or neighborhood filters
- **Color:** `#00C851` (green)
- **Z-Index:** 1001
- **Purpose:** Show all available properties for market context
- **Toggle:** Controlled by "Show all listings" checkbox in map legend

### Layer 2: Purple Pins (Search Results)
- **Source:** `filteredListings` prop from SearchPage.jsx:1645
- **Data Origin:** Fetched from Supabase with ALL active filters:
  - Borough selection
  - Neighborhood selection
  - Price range (min/max)
  - Week pattern (7-day, alternating, custom)
  - Schedule (start/end dates)
- **Color:** `#31135D` (purple)
- **Z-Index:** 1002 (renders above green pins)
- **Purpose:** Show properties matching current search criteria

### Marker Creation Logic
**File:** `GoogleMap.jsx:337-604`

**Effect Dependencies:**
```javascript
useEffect(() => {
  // Create/update markers
}, [listings, filteredListings, mapLoaded, showAllListings]);
```

**Process Flow:**
1. **Signature Check** (line 346): Prevent duplicate updates
   ```javascript
   const markerSignature = `${listings.map(l => l.id).join(',')}-${filteredListings.map(l => l.id).join(',')}-${showAllListings}`;
   if (lastMarkersUpdateRef.current === markerSignature) return;
   ```

2. **Clear All Markers** (lines 371-373):
   ```javascript
   markersRef.current.forEach(marker => marker.setMap(null));
   markersRef.current = [];
   ```
   ⚠️ **CRITICAL:** ALL markers are removed from the map

3. **Create Purple Markers** (lines 380-461):
   - Iterate through `filteredListings`
   - Skip listings without valid coordinates
   - Create price marker with purple color
   - Add to bounds for auto-fit

4. **Create Green Markers** (lines 464-552):
   - Iterate through `listings` (allActiveListings)
   - Skip if already shown as purple marker
   - Skip listings without valid coordinates
   - Create price marker with green color
   - Add to bounds for auto-fit

5. **Auto-Fit Bounds** (lines 555-599):
   ```javascript
   if (hasValidMarkers) {
     if (simpleMode && markersRef.current.length === 1) {
       // Force center on single pin (view-split-lease page only)
       map.setCenter({ lat: ..., lng: ... });
       map.setZoom(targetZoom);
     } else if (!disableAutoZoom) {
       // Normal auto-fit behavior for search page
       map.fitBounds(bounds);

       // Prevent over-zooming
       if (!initialZoom) {
         const listener = window.google.maps.event.addListener(map, 'idle', () => {
           if (map.getZoom() > 16) map.setZoom(16);
           window.google.maps.event.removeListener(listener);
         });
       }
     }
   }
   ```
   ⚠️ **CRITICAL:** `fitBounds()` changes the map viewport to show all markers

---

## Pin Click Behavior - Expected Flow

### User Action: Click on Map Pin

**Handler:** `handlePinClick()` - GoogleMap.jsx:193-260

### Step 1: Calculate Card Position (lines 199-234)
```javascript
// Get map container and pin element positions
const mapRect = mapContainer.getBoundingClientRect();
const priceTagRect = priceTag.getBoundingClientRect();

// Calculate center position
const pinCenterX = priceTagRect.left - mapRect.left + (priceTagRect.width / 2);
const pinTop = priceTagRect.top - mapRect.top;

// Card dimensions
const cardWidth = 340;
const cardHeight = 340;
const arrowHeight = 10;
const gapFromPin = 5;
const margin = 20;

// Position card above pin, centered
let cardLeft = pinCenterX;
let cardTop = pinTop - cardHeight - arrowHeight - gapFromPin;

// Keep within bounds
cardLeft = Math.max(minLeft, Math.min(maxLeft, cardLeft));
if (cardTop < margin) {
  // Flip below pin if would go above map
  cardTop = pinTop + priceTagRect.height + arrowHeight + gapFromPin;
}
```

### Step 2: Update React State (lines 237-243)
```javascript
setCardPosition({ x: cardLeft, y: cardTop });  // Position calculated
setCardVisible(true);                           // Show card
```

**State Changes Triggered:**
- `cardPosition`: Object with {x, y} coordinates
- `cardVisible`: Boolean, false → true
- Component re-renders

**Important:** These states are NOT dependencies of the marker creation effect, so markers should NOT recreate.

### Step 3: Fetch Listing Details (lines 245-253)
```javascript
const detailedListing = await fetchDetailedListingData(listing.id);
if (detailedListing) {
  setSelectedListingForCard(detailedListing);
} else {
  setCardVisible(false);
}
```

**Async Operation:**
1. Query Supabase for full listing data
2. Fetch photos from storage
3. Build detailed listing object
4. Update `selectedListingForCard` state
5. Loading state manages spinner display

### Step 4: Call Parent Callback (lines 256-259)
```javascript
if (onMarkerClick) {
  onMarkerClick(listing);
}
```

**SearchPage Handler:** SearchPage.jsx:1648-1650
```javascript
onMarkerClick={(listing) => {
  console.log('Marker clicked:', listing.title);
}}
```

Currently just logs to console, no state changes.

### Step 5: Display Card (GoogleMap.jsx:941-973)

**Conditional Rendering:**
```javascript
{mapLoaded && cardVisible && !simpleMode && (
  <>
    {isLoadingListingDetails && (
      // Loading spinner at calculated position
    )}
    {!isLoadingListingDetails && selectedListingForCard && (
      <ListingCardForMap
        listing={selectedListingForCard}
        onClose={() => {
          setCardVisible(false);
          setSelectedListingForCard(null);
        }}
        isVisible={cardVisible}
        position={cardPosition}
      />
    )}
  </>
)}
```

**Card Animation:** ListingCardForMap.css:53-62
```css
@keyframes cardFadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
```

**Animation Duration:** 0.2s ease-out
**Effect:** Card fades in and slides down from above pin

---

## The Problem: Why Pins Relocate and Hide

### Issue #1: Marker Recreation on Filter Changes

**Trigger Scenarios:**
1. **User changes borough** → `selectedBorough` changes → SearchPage refetches filtered listings → `filteredListings` prop changes
2. **User adjusts price range** → SearchPage refetches filtered listings → `filteredListings` prop changes
3. **User changes schedule** → SearchPage refetches filtered listings → `filteredListings` prop changes
4. **User toggles "Show all listings"** → `showAllListings` state changes
5. **Initial data fetch completes** → `listings` or `filteredListings` prop changes

**What Happens:**
```
Filter Change → Effect Triggered → Clear ALL Markers → Recreate Markers → Auto-Fit Bounds
```

**Marker Effect:** GoogleMap.jsx:337-604
```javascript
useEffect(() => {
  // 1. Signature check
  const markerSignature = `${listings.map(l => l.id).join(',')}-...`;
  if (lastMarkersUpdateRef.current === markerSignature) return;

  // 2. Clear existing markers
  markersRef.current.forEach(marker => marker.setMap(null));  // ALL PINS DISAPPEAR
  markersRef.current = [];

  // 3. Create new markers
  // ... marker creation logic ...

  // 4. Auto-fit map to show all markers
  if (!disableAutoZoom) {
    map.fitBounds(bounds);  // MAP VIEWPORT CHANGES
  }
}, [listings, filteredListings, mapLoaded, showAllListings]);
```

### Issue #2: Auto-Fit Bounds Disrupts User View

**Code:** GoogleMap.jsx:585-596
```javascript
} else if (!disableAutoZoom) {
  // Normal auto-fit behavior
  map.fitBounds(bounds);  // ⚠️ CHANGES VIEWPORT

  // Prevent over-zooming on single marker
  if (!initialZoom) {
    const listener = window.google.maps.event.addListener(map, 'idle', () => {
      if (map.getZoom() > 16) map.setZoom(16);
      window.google.maps.event.removeListener(listener);
    });
  }
}
```

**Impact:**
- `fitBounds()` calculates new center and zoom to show ALL markers
- Map viewport pans and zooms
- User's current view changes unexpectedly
- Pins appear to "relocate" (they haven't moved, viewport changed)
- Card position becomes misaligned (calculated before viewport shift)

### Issue #3: Visual Glitches During Recreation

**Sequence of Visual Events:**
1. User clicks pin → Card starts to appear (fade-in animation)
2. Concurrent filter change triggers marker effect
3. **All markers removed** → Pins disappear (including clicked pin)
4. New markers created → Pins reappear at same coordinates
5. `fitBounds()` called → Map viewport shifts
6. Card position is now wrong (calculated for old viewport)
7. User sees pins "jump" and card "float" away from pin

**Timing:**
- Card animation: 200ms
- Marker recreation: Synchronous, but depends on listing count
- Map `fitBounds()`: Animated transition (default ~400ms)
- **Result:** Visual inconsistencies during overlapping animations

---

## SearchPage Filter Behavior

### Filter State Management

**SearchPage.jsx** manages these filter states:
- `selectedBorough` (line ~580)
- `selectedNeighborhood` (line ~581)
- `selectedPriceRange` (line ~582)
- `selectedWeekPattern` (line ~583)
- `selectedSchedule` (line ~584)

### Data Fetching Strategy

**Two Separate Fetches:**

1. **All Active Listings** (lines 654-742):
   ```javascript
   // Fetch once on mount, no filters
   const { data, error } = await supabase
     .from('listing')
     .select('*')
     .eq('Active', true)
     .eq('isForUsability', false);
   ```
   - Sets `allActiveListings` state
   - Used for green pins (background layer)
   - Only refetches on mount

2. **Filtered Listings** (lines 865-1162):
   ```javascript
   // Refetch whenever filters change
   let query = supabase
     .from('listing')
     .select('*')
     .eq('Active', true);

   // Apply all active filters
   if (selectedBorough) query = query.eq('Location - Borough', selectedBorough);
   if (selectedNeighborhood) query = query.eq('Location - Neighborhood', selectedNeighborhood);
   // ... more filters ...
   ```
   - Sets `allListings` state (confusing name - actually filtered results)
   - Used for purple pins (search results)
   - **Refetches on ANY filter change**

### Effect Hook for Filtered Listings

**SearchPage.jsx** (approximate line 865):
```javascript
useEffect(() => {
  fetchFilteredListings();
}, [selectedBorough, selectedNeighborhood, selectedPriceRange, selectedWeekPattern, selectedSchedule]);
```

**Consequence:**
- Every filter change triggers a Supabase query
- Query results update `allListings` state
- `allListings` is passed as `filteredListings` prop to GoogleMap
- GoogleMap marker effect detects prop change
- Markers recreate → Auto-fit bounds → Viewport changes

---

## Borough Recenter Behavior

**Additional Map Movement:** GoogleMap.jsx:607-620

```javascript
useEffect(() => {
  if (!mapLoaded || !googleMapRef.current || !selectedBorough) return;

  const boroughConfig = getBoroughMapConfig(selectedBorough);
  const map = googleMapRef.current;

  // Smoothly pan to new borough center
  map.panTo(boroughConfig.center);
  map.setZoom(boroughConfig.zoom);
}, [selectedBorough, mapLoaded]);
```

**When Borough Changes:**
1. Marker effect triggers (new filtered listings)
2. Borough recenter effect triggers (selectedBorough changed)
3. **Two concurrent map movements:**
   - Auto-fit bounds from marker effect
   - Pan to borough center from recenter effect
4. Potential race condition: which one wins?

**Result:** Inconsistent map positioning when borough filter changes

---

## Pin Rendering Implementation

### Custom Price Marker (OverlayView)

**Function:** `createPriceMarker()` - GoogleMap.jsx:669-756

**Technology:** Google Maps OverlayView API (not standard Marker)

**Advantages:**
- Custom HTML/CSS rendering
- Full styling control
- Price label directly on pin
- GPU-accelerated positioning (transform3d)

**Structure:**
```javascript
markerOverlay.onAdd = function() {
  const priceTag = document.createElement('div');
  priceTag.innerHTML = `$${parseFloat(price).toFixed(2)}`;
  priceTag.className = 'map-price-marker';
  priceTag.style.cssText = `
    position: absolute;
    background: ${color};              // #00C851 or #31135D
    color: white;
    padding: 6px 12px;
    border-radius: 20px;
    font-weight: 600;
    font-size: 14px;
    white-space: nowrap;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
    cursor: pointer;
    transition: background-color 0.2s ease;
    transform: translate(-50%, -50%);
    z-index: ${color === '#31135D' ? '1002' : '1001'};
    will-change: transform;
    pointer-events: auto;
  `;

  // Event listeners
  this.div = priceTag;
  const panes = this.getPanes();
  panes.overlayMouseTarget.appendChild(priceTag);
};
```

### Draw Function (Position Updates)

**GoogleMap.jsx:728-743**
```javascript
markerOverlay.draw = function() {
  if (!this.div) return;

  const projection = this.getProjection();
  if (!projection) return;

  const position = projection.fromLatLngToDivPixel(
    new window.google.maps.LatLng(coordinates.lat, coordinates.lng)
  );

  if (this.div) {
    // Use transform3d for GPU acceleration
    this.div.style.transform = `translate3d(${position.x}px, ${position.y}px, 0) translate(-50%, -50%)`;
  }
};
```

**When draw() is Called:**
- Map initialization
- Map pan
- Map zoom
- Map resize
- Overlay position changes

**During `fitBounds()`:**
- draw() is called multiple times during animation
- Pins smoothly move to new screen positions
- **User sees pins "relocating" during viewport transition**

### Pin Hover Effects

**GoogleMap.jsx:700-714**
```javascript
priceTag.addEventListener('mouseenter', () => {
  priceTag.style.background = hoverColor;
  priceTag.style.transform = 'translate(-50%, -50%) scale(1.1)';
  priceTag.style.zIndex = '1010';
});

priceTag.addEventListener('mouseleave', () => {
  priceTag.style.background = color;
  priceTag.style.transform = 'translate(-50%, -50%) scale(1)';
  priceTag.style.zIndex = color === '#31135D' ? '1002' : '1001';
});
```

**Effect:** Pins grow 10% and change color on hover

---

## ListingCardForMap Component

### Card Positioning

**File:** ListingCardForMap.jsx:82-92
```javascript
<div
  className="listing-card-for-map-wrapper"
  style={{
    position: 'absolute',
    left: `${position.x}px`,           // X coordinate from handlePinClick
    top: `${position.y}px`,            // Y coordinate from handlePinClick
    transform: 'translate(-50%, 0)',   // Center horizontally on pin
    zIndex: 1000,
  }}
  onClick={(e) => e.stopPropagation()}
>
```

**Position Calculation Origin:** GoogleMap.jsx:199-234
**Reference Frame:** Map container's bounding rect
**Alignment:** Horizontally centered on pin, vertically above pin

**Pointer Arrow:** ListingCardForMap.css:12-37
```css
.listing-card-arrow {
  position: absolute;
  bottom: -10px;                /* Points down from card */
  left: 50%;
  transform: translateX(-50%);   /* Center on card */
  border-top: 10px solid #FFFFFF;
}
```

### Card Dimensions

**Width:** 340px (320px on mobile, 280px on small mobile)
**Height:** ~340px (estimated, depends on content)
**Arrow Height:** 10px
**Gap from Pin:** 5px
**Margin from Map Edge:** 20px

### Card Content

**Structure:**
1. **Image Section** (180px height)
   - Main photo with gallery navigation
   - Close button (top-right)
   - Favorite button (top-left)
   - NEW badge (if applicable)

2. **Content Section** (padding: 12px)
   - Title and price (header row)
   - Location with icon
   - Features (bedrooms, bathrooms, sqft)
   - Divider
   - Action buttons (View Details, Message)

### Event Handling

**Click Event Propagation:**
```javascript
onClick={(e) => e.stopPropagation()}  // Prevent map click
```

**Close Actions:**
1. **X button click** → `onClose()` → `setCardVisible(false)` + `setSelectedListingForCard(null)`
2. **Map container click** → `handleMapClick()` → Same effect

---

## State Management Analysis

### GoogleMap Component State

```javascript
const [mapLoaded, setMapLoaded] = useState(false);
const [showAllListings, setShowAllListings] = useState(true);
const [selectedListingForCard, setSelectedListingForCard] = useState(null);
const [cardVisible, setCardVisible] = useState(false);
const [cardPosition, setCardPosition] = useState({ x: 0, y: 0 });
const [isLoadingListingDetails, setIsLoadingListingDetails] = useState(false);
```

### Refs (Non-Reactive)

```javascript
const mapRef = useRef(null);                    // Map container div
const googleMapRef = useRef(null);              // Google Maps instance
const markersRef = useRef([]);                  // Array of marker overlays
const infoWindowRef = useRef(null);             // Info window instance
const lastMarkersUpdateRef = useRef(null);      // Signature for dedup
```

### State Update Sequence on Pin Click

1. `setCardPosition({ x, y })` → Component rerenders
2. `setCardVisible(true)` → Component rerenders
3. `setIsLoadingListingDetails(true)` → Component rerenders
4. (Async fetch)
5. `setIsLoadingListingDetails(false)` → Component rerenders
6. `setSelectedListingForCard(listing)` → Component rerenders

**Total Rerenders on Pin Click:** ~5 times

**Effect Dependencies Check:**
- Marker creation effect depends on: `[listings, filteredListings, mapLoaded, showAllListings]`
- Pin click only changes: `cardPosition`, `cardVisible`, `selectedListingForCard`, `isLoadingListingDetails`
- **No overlap** → Marker effect should NOT trigger on pin click

### Potential Race Conditions

**Scenario:** User clicks pin while filter change is in progress

**Timeline:**
```
T=0ms    User adjusts price filter
T=10ms   SearchPage starts Supabase query
T=50ms   User clicks map pin
T=55ms   handlePinClick calculates card position (based on current viewport)
T=60ms   Card state updates, card starts fade-in animation
T=200ms  Supabase query completes
T=205ms  filteredListings prop changes
T=210ms  Marker effect triggers (new signature detected)
T=215ms  All markers removed (pins disappear)
T=250ms  New markers created (pins reappear)
T=255ms  fitBounds() called (viewport starts changing)
T=500ms  Map animation completes (viewport fully changed)
```

**Result:**
- Card position calculated at T=55ms is for OLD viewport
- Viewport changes at T=255ms
- Card is now misaligned with pin
- User sees weird behavior

---

## Map Legend and Controls

### Map Legend Component

**File:** GoogleMap.jsx:838-868

**Content:**
- Header: "Map Legend"
- Purple marker indicator: "Search Results"
- Green marker indicator: "All Active Listings"
- Checkbox toggle: "Show all listings"

**Toggle Behavior:**
```javascript
<input
  type="checkbox"
  checked={showAllListings}
  onChange={(e) => setShowAllListings(e.target.checked)}
/>
```

**Impact on Markers:**
- Unchecking removes green markers
- Checking adds green markers back
- Triggers marker recreation effect (dependency change)
- Calls `fitBounds()` → Viewport changes

### AI Research Button

**File:** GoogleMap.jsx:873-897

**Visibility:** Only shown in normal mode (not simple mode)
**Action:** Opens AI Research Report signup modal
**Position:** Absolute positioned on map

---

## Recent Code Changes

### Commit 5beb5b0: Force Map Centering Fix

**File:** GoogleMap.jsx:566-584

**Before:**
```javascript
if (simpleMode && initialZoom && markersRef.current.length === 1) {
  // Force center only if initialZoom specified
}
```

**After:**
```javascript
if (simpleMode && markersRef.current.length === 1) {
  // Always force center in simple mode (removed initialZoom condition)
  const targetZoom = initialZoom || 17;
  map.setCenter({ lat: ..., lng: ... });
  map.setZoom(targetZoom);
}
```

**Impact on Search Page:**
- None (search page doesn't use simple mode)
- Change only affects view-split-lease page

---

## Performance Considerations

### Marker Creation Performance

**Current Implementation:**
- Synchronous marker creation in effect
- No lazy loading or virtualization
- All markers created immediately
- Can be slow with 100+ listings

**Optimization Present:**
- Signature-based deduplication (line 346)
- Prevents duplicate marker recreation
- Early return if listings haven't changed

### Draw Call Frequency

**OverlayView.draw()** called on:
- Every map pan/zoom
- Window resize
- Marker position change

**Optimization:**
- Uses `transform3d` for GPU acceleration (line 741)
- Uses `will-change: transform` CSS hint (line 695)
- No layout thrashing (no DOM reads during writes)

### React Rerender Optimization

**Current Issues:**
- Multiple state updates on pin click (5+ rerenders)
- No React.memo on GoogleMap component
- No useCallback on most handlers (except handlePinClick)

---

## Diagnostic Findings

### Console Logging

**Extensive logging present throughout:**
- Map initialization (lines 265-322)
- Marker creation (lines 358-599)
- Pin click handling (lines 194-254)
- Card rendering (lines 930-940)
- Borough recentering (lines 610-619)

**Log Prefixes:**
- `🗺️` Map-related operations
- `✅` Successful operations
- `❌` Errors
- `⚠️` Warnings
- `📊` Summaries
- `🔍` Data fetching
- `🖱️` User interactions

### Performance Monitoring Points

**To diagnose issue, monitor:**
1. Console logs during pin click for unexpected marker recreation
2. Chrome DevTools Performance tab for layout thrashing
3. React DevTools Profiler for component rerenders
4. Network tab for concurrent Supabase requests
5. State changes in sequence after pin click
6. Map event listeners (pan, zoom, idle)

---

## Root Cause Summary

### Primary Issue: Concurrent Filter Changes

**The weird pin behavior occurs when:**

1. **User is interacting with filters** (borough, price, schedule, etc.)
2. **SearchPage refetches filtered listings** (Supabase query)
3. **User clicks a pin** during or shortly after filter change
4. **Marker effect detects prop change** (`filteredListings` different)
5. **All markers are cleared** (pins disappear)
6. **New markers are created** (pins reappear)
7. **Auto-fit bounds is called** (viewport changes)
8. **Card position is wrong** (calculated for old viewport)

### Secondary Issue: No Safeguards for User Interactions

**Missing protections:**
- No check if card is currently visible before recentering
- No `disableAutoZoom` flag when user is interacting
- No debouncing or throttling on filter changes
- No cancellation of pending viewport changes
- No viewport lock during card display

### Tertiary Issue: Visual Inconsistencies

**Overlapping animations:**
- Card fade-in (200ms)
- Map fitBounds transition (~400ms)
- Pin draw() calls during fitBounds
- Result: Jarring visual experience

---

## Recommendations for Fix

### Option 1: Disable Auto-Fit During Card Display

**Concept:** Don't recenter map when listing card is visible

```javascript
// In marker creation effect
if (hasValidMarkers && !cardVisible) {  // Only auto-fit if card not shown
  if (!disableAutoZoom) {
    map.fitBounds(bounds);
  }
}
```

**Pros:**
- Simple fix
- Preserves user's current view
- Card stays aligned

**Cons:**
- New filtered results might be off-screen
- User won't see all results without manual panning

### Option 2: Recalculate Card Position After Viewport Change

**Concept:** Update card position after fitBounds completes

```javascript
// After fitBounds
if (cardVisible) {
  google.maps.event.addListenerOnce(map, 'idle', () => {
    // Recalculate card position for new viewport
    // Update cardPosition state
  });
}
```

**Pros:**
- Card stays aligned with pin
- User sees all filtered results

**Cons:**
- Card will "jump" during viewport change
- More complex implementation
- Requires storing clicked listing reference

### Option 3: Debounce Filter Changes

**Concept:** Wait for user to finish adjusting filters before refetching

```javascript
// In SearchPage
const debouncedFetchFilteredListings = useMemo(
  () => debounce(fetchFilteredListings, 500),
  []
);

useEffect(() => {
  debouncedFetchFilteredListings();
}, [selectedBorough, selectedPriceRange, ...]);
```

**Pros:**
- Reduces number of Supabase queries
- Reduces marker recreation frequency
- Better performance

**Cons:**
- Doesn't eliminate the issue
- Delay before results appear
- Stale data during debounce period

### Option 4: Partial Marker Updates (Add/Remove Only Changed)

**Concept:** Instead of clearing all markers, only add/remove changed ones

```javascript
// Diff algorithm to find added/removed listings
const addedListings = newListings.filter(nl => !oldListings.some(ol => ol.id === nl.id));
const removedListings = oldListings.filter(ol => !newListings.some(nl => nl.id === ol.id));

// Only remove specific markers
removedListings.forEach(listing => {
  const marker = markersRef.current.find(m => m.listingId === listing.id);
  if (marker) marker.setMap(null);
});

// Only add new markers
addedListings.forEach(listing => {
  const marker = createPriceMarker(...);
  markersRef.current.push(marker);
});
```

**Pros:**
- Minimizes visual disruption
- Pins don't disappear/reappear
- Better user experience

**Cons:**
- More complex logic
- Still need to handle auto-fit bounds intelligently
- Edge cases (color changes when filtering)

### Option 5: Add disableAutoZoom Flag from SearchPage

**Concept:** Let SearchPage control when map should auto-fit

```javascript
// In SearchPage
const [allowMapAutoZoom, setAllowMapAutoZoom] = useState(true);

// Disable auto-zoom when user is interacting
<GoogleMap
  disableAutoZoom={!allowMapAutoZoom}
  // ... other props
/>
```

**Pros:**
- Gives parent component full control
- Can implement sophisticated zoom logic
- Easy to toggle on/off

**Cons:**
- Requires SearchPage to manage more state
- Need to determine when to enable/disable

---

## Testing Recommendations

### Manual Testing Steps

1. **Load search page** → Verify all green pins appear
2. **Apply borough filter** → Verify purple pins appear, map recenters
3. **Click purple pin** → Verify card appears above pin
4. **While card is visible, change price filter** → Check if pins relocate/card misaligns
5. **Click green pin** → Verify card appears
6. **Toggle "Show all listings" while card visible** → Check behavior
7. **Rapidly change multiple filters** → Check for visual glitches
8. **Click pin, immediately pan map** → Check if card follows pin

### Automated Testing

**Playwright test scenarios:**
1. Assert marker count matches listing count
2. Measure card position relative to pin
3. Detect unexpected viewport changes
4. Verify markers don't disappear during interactions
5. Check z-index stacking (purple > green)

### Performance Testing

**Metrics to monitor:**
1. Time to create 100 markers
2. Frame rate during fitBounds animation
3. React rerender count on pin click
4. Supabase query time for filtered listings
5. Total time from filter change to map update

---

## Files Reference

### Primary Files

| File | Path | Lines | Purpose |
|------|------|-------|---------|
| GoogleMap.jsx | `app/src/islands/shared/GoogleMap.jsx` | 981 | Main map component |
| SearchPage.jsx | `app/src/islands/pages/SearchPage.jsx` | 1677 | Search page with filters |
| ListingCardForMap.jsx | `app/src/islands/shared/ListingCard/ListingCardForMap.jsx` | 219 | Popup card on pin click |
| ListingCardForMap.css | `app/src/islands/shared/ListingCard/ListingCardForMap.css` | 347 | Card styling |

### Key Code Locations

| Feature | File | Lines |
|---------|------|-------|
| Map initialization | GoogleMap.jsx | 263-334 |
| Marker creation effect | GoogleMap.jsx | 337-604 |
| Pin click handler | GoogleMap.jsx | 193-260 |
| Price marker creation | GoogleMap.jsx | 669-756 |
| Auto-fit bounds logic | GoogleMap.jsx | 555-599 |
| Borough recenter | GoogleMap.jsx | 607-620 |
| Card positioning | GoogleMap.jsx | 199-234 |
| Card rendering | GoogleMap.jsx | 941-973 |
| Fetch detailed listing | GoogleMap.jsx | 135-187 |
| Map legend | GoogleMap.jsx | 838-868 |
| Card component | ListingCardForMap.jsx | 25-218 |
| Card animation | ListingCardForMap.css | 53-62 |
| All active listings fetch | SearchPage.jsx | 654-742 |
| Filtered listings fetch | SearchPage.jsx | 865-1162 |
| Map component usage | SearchPage.jsx | 1642-1652 |

---

## Conclusion

The map pin click behavior issues stem from the **marker recreation effect's auto-fit bounds behavior** conflicting with user interactions. When filters change (which happens frequently during normal search usage), the map viewport is repositioned to show all results, causing pins to appear to relocate and cards to become misaligned.

The issue is **NOT a bug in the code logic** - the marker effect is working as designed. Rather, it's a **UX design issue** where the automatic viewport adjustment conflicts with the user's expectation that the map should remain stable during interactions.

**Recommended Fix:** Implement **Option 1** (disable auto-fit during card display) combined with **Option 3** (debounce filter changes) for immediate improvement. Consider **Option 4** (partial marker updates) for a more sophisticated long-term solution.

**Priority:** Medium-High (impacts user experience but doesn't break functionality)

**Estimated Fix Time:** 2-4 hours for Option 1+3, 8-12 hours for Option 4

---

**Report Generated:** 2025-11-16
**Investigator:** Claude Code
**Status:** Complete
