# Complete Fix Plan: Re-render Issues & Hover Bug

## Investigation Summary

Found **22 critical issues** causing:
- Infinite re-render loops
- Marker recreation on hover
- Performance degradation
- Unstable component references

## Core Principles

1. ✅ Fix root causes, not symptoms
2. ✅ No fallback mechanisms or workarounds
3. ✅ No hardcoded data
4. ✅ Proper React patterns (memo, useCallback, useMemo)
5. ✅ Clean component lifecycle

---

## Fix Strategy

### Phase 1: Stabilize Component References (CRITICAL)
**Fixes Issues:** #1, #2, #3, #4, #5, #6, #10, #15, #16

**Changes to SearchPage.jsx:**

1. Wrap ALL modal handlers in `useCallback`
2. Create stable `handleMarkerClick` with `useCallback`
3. Create stable `onLocationClick` with `useCallback`
4. Memoize `selectorProps` object
5. Memoize neighborhood filter operations

**Changes to GoogleMap.jsx:**

6. Wrap component export in `React.memo()` with custom comparator
7. Remove or stabilize `onMarkerClick` dependency

---

### Phase 2: Optimize Marker Management (CRITICAL)
**Fixes Issues:** #13, #14, #19, #21, #22

**Changes to GoogleMap.jsx:**

8. Remove `filteredListings` from map initialization effect deps
9. Implement **marker UPDATE** instead of destroy/recreate:
   - Track marker refs by listing ID
   - Only add new markers
   - Only remove deleted markers
   - Update existing markers (color change if needed)
10. Move signature check BEFORE effect execution

---

### Phase 3: Performance Optimizations (HIGH)
**Fixes Issues:** #8, #9, #12

**Changes to SearchPage.jsx:**

11. Memoize `filteredNeighborhoods` calculation
12. Memoize `calculateDynamicPrice` in PropertyCard
13. Remove/disable console.log in production (wrap in DEV check)

---

### Phase 4: Clean Up State Cascades (MEDIUM)
**Fixes Issues:** #7, #11, #18

**Changes to SearchPage.jsx:**

14. Optimize `fetchListings` dependencies (reduce from 7 to necessary ones)
15. Batch state updates where possible
16. Prevent unnecessary `selectedNeighborhoods` array recreation

---

### Phase 5: Event Listener Cleanup (MEDIUM)
**Fixes Issues:** #17, #20

**Changes to GoogleMap.jsx:**

17. Explicitly remove event listeners in marker cleanup
18. Add cleanup return functions to effects

---

## Detailed Implementation Plan

### File 1: GoogleMap.jsx

#### Change #1: Wrap in React.memo
**Location:** Line 29 (component declaration) and Line 978 (export)

**Before:**
```javascript
const GoogleMap = forwardRef((props, ref) => {
  // ...
});

export default GoogleMap;
```

**After:**
```javascript
const GoogleMap = forwardRef((props, ref) => {
  // ...
});

// Custom comparison function - only re-render if critical props change
const arePropsEqual = (prevProps, nextProps) => {
  // Compare array contents, not references
  const listingsEqual =
    prevProps.listings.length === nextProps.listings.length &&
    prevProps.listings.every((listing, i) => listing.id === nextProps.listings[i]?.id);

  const filteredListingsEqual =
    prevProps.filteredListings.length === nextProps.filteredListings.length &&
    prevProps.filteredListings.every((listing, i) => listing.id === nextProps.filteredListings[i]?.id);

  return (
    listingsEqual &&
    filteredListingsEqual &&
    prevProps.selectedBorough === nextProps.selectedBorough &&
    prevProps.simpleMode === nextProps.simpleMode &&
    prevProps.disableAutoZoom === nextProps.disableAutoZoom
    // Ignore onMarkerClick and onAIResearchClick changes
  );
};

export default React.memo(GoogleMap, arePropsEqual);
```

**Rationale:**
- Prevents re-renders when only function props change
- Compares array CONTENTS, not references
- Blocks cascading re-renders from parent

---

#### Change #2: Remove filteredListings from Map Init Effect
**Location:** Line 334 (effect dependency array)

**Before:**
```javascript
useEffect(() => {
  // Initialize map
}, [filteredListings, listings, simpleMode, initialZoom]);
```

**After:**
```javascript
useEffect(() => {
  // Initialize map
}, [simpleMode, initialZoom]);
// Map only initializes once, markers handle listing updates
```

**Rationale:**
- Map initialization should happen once
- Marker updates are separate concern
- filteredListings changing should NOT recreate entire map

---

#### Change #3: Implement Marker UPDATE Logic
**Location:** Lines 337-604 (entire marker update effect)

**Current Approach:**
```javascript
useEffect(() => {
  // 1. Clear ALL markers
  markersRef.current.forEach(marker => marker.setMap(null));
  markersRef.current = [];

  // 2. Create ALL markers from scratch
  // ...
}, [listings, filteredListings, mapLoaded, showAllListings]);
```

**New Approach:**
```javascript
useEffect(() => {
  if (!mapLoaded || !googleMapRef.current) return;

  const map = googleMapRef.current;

  // Create marker ID map for quick lookup
  const existingMarkers = new Map(
    markersRef.current.map(m => [m.listingId, m])
  );

  // Determine which markers to show
  const markersToShow = new Map();

  // Add filtered listings (purple)
  filteredListings.forEach(listing => {
    if (listing.coordinates?.lat && listing.coordinates?.lng) {
      markersToShow.set(listing.id, {
        listing,
        color: COLORS.SECONDARY, // Purple
        zIndex: 1002
      });
    }
  });

  // Add all listings (green) if enabled
  if (showAllListings) {
    listings.forEach(listing => {
      if (listing.coordinates?.lat && listing.coordinates?.lng) {
        // Skip if already shown as purple
        if (!markersToShow.has(listing.id)) {
          markersToShow.set(listing.id, {
            listing,
            color: COLORS.SUCCESS, // Green
            zIndex: 1001
          });
        }
      }
    });
  }

  // REMOVE markers that shouldn't exist
  existingMarkers.forEach((marker, listingId) => {
    if (!markersToShow.has(listingId)) {
      marker.setMap(null);
      markersRef.current = markersRef.current.filter(m => m.listingId !== listingId);
    }
  });

  // ADD new markers or UPDATE existing ones
  const bounds = new window.google.maps.LatLngBounds();
  let hasValidMarkers = false;

  markersToShow.forEach(({ listing, color, zIndex }, listingId) => {
    const position = {
      lat: listing.coordinates.lat,
      lng: listing.coordinates.lng
    };

    bounds.extend(position);
    hasValidMarkers = true;

    const existingMarker = existingMarkers.get(listingId);

    if (existingMarker) {
      // UPDATE existing marker (color might have changed)
      const priceTag = existingMarker.div;
      if (priceTag) {
        const currentColor = priceTag.dataset.color;
        if (currentColor !== color) {
          // Color changed (purple ↔ green), update styles
          priceTag.style.background = color;
          priceTag.style.zIndex = zIndex;
          priceTag.dataset.color = color;
          priceTag.dataset.hoverColor = color === '#00C851' ? '#00A040' : '#522580';
        }
      }
    } else {
      // ADD new marker
      const price = listing.price?.starting || listing['Starting nightly price'] || 0;
      const marker = createPriceMarker(map, position, price, color, listing);
      markersRef.current.push(marker);
    }
  });

  // Auto-fit bounds (only if not in simple mode and auto-zoom enabled)
  if (hasValidMarkers && !simpleMode && !disableAutoZoom) {
    map.fitBounds(bounds);

    if (!initialZoom) {
      const listener = window.google.maps.event.addListener(map, 'idle', () => {
        if (map.getZoom() > 16) map.setZoom(16);
        window.google.maps.event.removeListener(listener);
      });
    }
  }
}, [listings, filteredListings, mapLoaded, showAllListings, simpleMode, disableAutoZoom, initialZoom]);
```

**Rationale:**
- Only creates/removes markers that actually changed
- Preserves DOM elements and event listeners for unchanged markers
- Prevents flicker during hover
- Much better performance

---

#### Change #4: Explicit Event Listener Cleanup
**Location:** Lines 745-749 (marker onRemove)

**Before:**
```javascript
markerOverlay.onRemove = function() {
  if (this.div) {
    this.div.parentNode.removeChild(this.div);
    this.div = null;
  }
};
```

**After:**
```javascript
markerOverlay.onRemove = function() {
  if (this.div) {
    // Remove event listeners explicitly
    const priceTag = this.div;
    priceTag.replaceWith(priceTag.cloneNode(true)); // Removes all listeners
    // OR manually track and remove each listener

    this.div.parentNode.removeChild(this.div);
    this.div = null;
  }
};
```

**Rationale:**
- Explicit cleanup prevents memory leaks
- Removes lingering event handlers
- Prevents hover events on destroyed elements

---

#### Change #5: Move handlePinClick Dependencies
**Location:** Line 260 (useCallback dependency array)

**Before:**
```javascript
const handlePinClick = useCallback(async (listing, priceTag) => {
  // ...
  if (onMarkerClick) {
    onMarkerClick(listing);
  }
}, [onMarkerClick]);
```

**After:**
```javascript
const handlePinClick = useCallback(async (listing, priceTag) => {
  // ... all the existing logic ...

  // Don't depend on unstable onMarkerClick prop
  // Let parent handle marker click via ref or other stable mechanism
}, []); // No dependencies - stable function
```

**Rationale:**
- Removes dependency on unstable prop
- Function only uses refs and internal state
- Prevents recreation on parent re-renders

---

#### Change #6: Wrap Console Logs in DEV Check
**Location:** Throughout file (40+ log statements)

**Before:**
```javascript
console.log('🗺️ GoogleMap: Component rendered');
```

**After:**
```javascript
if (import.meta.env.DEV) {
  console.log('🗺️ GoogleMap: Component rendered');
}
```

**Rationale:**
- Removes performance overhead in production
- Keeps debugging capability in development
- Already using Vite's DEV flag

---

### File 2: SearchPage.jsx

#### Change #7: Wrap Modal Handlers in useCallback
**Location:** Lines 1299, 1313, 1318, 1323, 1329, 1335, 1339

**Before:**
```javascript
const handleOpenContactModal = (listing) => {
  setSelectedListing(listing);
  setIsContactModalOpen(true);
};

const handleCloseContactModal = () => {
  setIsContactModalOpen(false);
  setSelectedListing(null);
};

// ... etc for all 7 handlers
```

**After:**
```javascript
const handleOpenContactModal = useCallback((listing) => {
  setSelectedListing(listing);
  setIsContactModalOpen(true);
}, []);

const handleCloseContactModal = useCallback(() => {
  setIsContactModalOpen(false);
  setSelectedListing(null);
}, []);

const handleOpenInfoModal = useCallback((listing, triggerRef) => {
  setSelectedListing(listing);
  setInfoModalTriggerRef(triggerRef);
  setIsInfoModalOpen(true);
}, []);

const handleCloseInfoModal = useCallback(() => {
  setIsInfoModalOpen(false);
  setSelectedListing(null);
  setInfoModalTriggerRef(null);
}, []);

const handleOpenAIResearchModal = useCallback(() => {
  setIsAIResearchModalOpen(true);
}, []);

const handleCloseAIResearchModal = useCallback(() => {
  setIsAIResearchModalOpen(false);
}, []);

const handleResetFilters = useCallback(() => {
  setSelectedBorough('');
  setSelectedNeighborhoods([]);
  setWeekPattern('7-day');
  setPriceTier('all');
  setSortBy('default');
}, []);
```

**Rationale:**
- Prevents recreation on every render
- Stable references for child components
- setState functions are stable, no dependencies needed

---

#### Change #8: Create Stable onMarkerClick
**Location:** Lines 1642-1652 (GoogleMap usage)

**Before:**
```javascript
<GoogleMap
  ref={mapRef}
  listings={allActiveListings}
  filteredListings={allListings}
  selectedListing={null}
  selectedBorough={selectedBorough}
  onMarkerClick={(listing) => {
    console.log('Marker clicked:', listing.title);
  }}
  onAIResearchClick={handleOpenAIResearchModal}
/>
```

**After (Option A - Remove):**
```javascript
<GoogleMap
  ref={mapRef}
  listings={allActiveListings}
  filteredListings={allListings}
  selectedListing={null}
  selectedBorough={selectedBorough}
  // Remove onMarkerClick entirely - not used
  onAIResearchClick={handleOpenAIResearchModal}
/>
```

**After (Option B - If needed, make stable):**
```javascript
// Add near other useCallback declarations
const handleMarkerClick = useCallback((listing) => {
  if (import.meta.env.DEV) {
    console.log('Marker clicked:', listing.title);
  }
  // Add actual functionality here if needed
}, []);

<GoogleMap
  ref={mapRef}
  listings={allActiveListings}
  filteredListings={allListings}
  selectedListing={null}
  selectedBorough={selectedBorough}
  onMarkerClick={handleMarkerClick}
  onAIResearchClick={handleOpenAIResearchModal}
/>
```

**Rationale:**
- Option A: Removes unused callback (RECOMMENDED)
- Option B: Stabilizes if actually needed
- Breaks re-render loop

---

#### Change #9: Create Stable onLocationClick
**Location:** Line 513-516 (PropertyCard prop)

**Before:**
```javascript
<PropertyCard
  listing={listing}
  selectedDaysCount={selectedDays.length}
  onLocationClick={(listing) => {
    if (mapRef.current) {
      mapRef.current.zoomToListing(listing.id);
    }
  }}
  onOpenContactModal={handleOpenContactModal}
  onOpenInfoModal={handleOpenInfoModal}
/>
```

**After:**
```javascript
// Add near other useCallback declarations (around line 1290)
const handleLocationClick = useCallback((listing) => {
  if (mapRef.current) {
    mapRef.current.zoomToListing(listing.id);
  }
}, []); // mapRef is stable

<PropertyCard
  listing={listing}
  selectedDaysCount={selectedDays.length}
  onLocationClick={handleLocationClick}
  onOpenContactModal={handleOpenContactModal}
  onOpenInfoModal={handleOpenInfoModal}
/>
```

**Rationale:**
- Single stable function shared by all PropertyCards
- Prevents ALL cards from re-rendering
- mapRef is stable, no dependencies needed

---

#### Change #10: Memoize selectorProps
**Location:** Lines 1349-1358 (SearchScheduleSelector props)

**Before:**
```javascript
const selectorProps = {
  selectedDays: selectedDays,
  onSelectionChange: (days) => {
    setSelectedDays(days);
  },
  onError: (error) => console.error('SearchScheduleSelector error:', error),
  ...
};
```

**After:**
```javascript
const handleScheduleChange = useCallback((days) => {
  setSelectedDays(days);
}, []);

const handleScheduleError = useCallback((error) => {
  if (import.meta.env.DEV) {
    console.error('SearchScheduleSelector error:', error);
  }
}, []);

const selectorProps = useMemo(() => ({
  selectedDays: selectedDays,
  onSelectionChange: handleScheduleChange,
  onError: handleScheduleError,
  // ... other props
}), [selectedDays, handleScheduleChange, handleScheduleError]);
```

**Rationale:**
- Stable object reference
- Prevents SearchScheduleSelector from re-mounting
- Callbacks memoized separately for reusability

---

#### Change #11: Memoize filteredNeighborhoods
**Location:** Lines 1462-1466 (duplicated at 64-67)

**Before:**
```javascript
const filteredNeighborhoods = neighborhoods.filter(n => {
  const sanitizedSearch = sanitizeNeighborhoodSearch(neighborhoodSearch);
  return n.name.toLowerCase().includes(sanitizedSearch.toLowerCase());
});
```

**After:**
```javascript
const filteredNeighborhoods = useMemo(() => {
  if (!neighborhoodSearch) return neighborhoods;

  const sanitizedSearch = sanitizeNeighborhoodSearch(neighborhoodSearch);
  const lowerSearch = sanitizedSearch.toLowerCase();

  return neighborhoods.filter(n =>
    n.name.toLowerCase().includes(lowerSearch)
  );
}, [neighborhoods, neighborhoodSearch]);
```

**Rationale:**
- Calculated once per search change
- Early return if no search term
- Removes duplicate computation

---

#### Change #12: Memoize Dynamic Price Calculation
**Location:** Lines 274-320 in PropertyCard

**Before:**
```javascript
function PropertyCard({ listing, ... }) {
  const calculateDynamicPrice = () => {
    // ... 44 lines of calculation
  };
  const dynamicPrice = calculateDynamicPrice();

  // ... render using dynamicPrice
}
```

**After:**
```javascript
function PropertyCard({ listing, selectedDaysCount, ... }) {
  const dynamicPrice = useMemo(() => {
    // ... move calculation logic here
    return calculatedPrice;
  }, [listing, selectedDaysCount]);

  // ... render using dynamicPrice
}
```

**Rationale:**
- Expensive calculation only runs when inputs change
- Prevents recalculation on every render
- Major performance improvement for large lists

---

#### Change #13: Optimize fetchListings Dependencies
**Location:** Line 866 (useCallback dependency array)

**Before:**
```javascript
const fetchListings = useCallback(async () => {
  // ... fetch logic
}, [boroughs, selectedBorough, selectedNeighborhoods, weekPattern, priceTier, sortBy, selectedDays]);
```

**After:**
```javascript
const fetchListings = useCallback(async () => {
  // ... fetch logic using latest state via refs or direct state access
}, [selectedBorough, weekPattern, priceTier, sortBy]);
// Remove: boroughs (lookup data, not filter)
// selectedNeighborhoods and selectedDays should trigger fetch via separate effect
```

**Rationale:**
- Reduces callback recreation frequency
- boroughs is lookup data, not a filter parameter
- State accessed directly in callback is always current

---

#### Change #14: Wrap Console Logs in DEV Check
**Location:** Throughout file (50+ log statements)

**Before:**
```javascript
console.log('Fetching listings...');
```

**After:**
```javascript
if (import.meta.env.DEV) {
  console.log('Fetching listings...');
}
```

**Rationale:**
- Same as GoogleMap - remove production overhead
- Keep debug capability in development

---

### File 3: PropertyCard Component (nested in SearchPage.jsx)

#### Change #15: Memoize PropertyCard Component
**Location:** Line 227 (component declaration)

**Before:**
```javascript
function PropertyCard({ listing, selectedDaysCount, onLocationClick, onOpenContactModal, onOpenInfoModal }) {
  // ...
}
```

**After:**
```javascript
const PropertyCard = React.memo(function PropertyCard({
  listing,
  selectedDaysCount,
  onLocationClick,
  onOpenContactModal,
  onOpenInfoModal
}) {
  // ... existing logic
}, (prevProps, nextProps) => {
  // Custom comparison - only re-render if listing or count changed
  return (
    prevProps.listing.id === nextProps.listing.id &&
    prevProps.selectedDaysCount === nextProps.selectedDaysCount
    // Ignore function prop changes (they should be stable now)
  );
});
```

**Rationale:**
- Prevents cards from re-rendering when parent re-renders
- Only re-renders when actual listing data or selection changes
- Major performance improvement for large lists

---

## Summary of Changes

### GoogleMap.jsx (7 changes)
1. Wrap export in `React.memo()` with custom comparator
2. Remove `filteredListings` from map init effect deps
3. Implement marker UPDATE instead of destroy/recreate
4. Explicit event listener cleanup in `onRemove`
5. Remove `onMarkerClick` from `handlePinClick` deps
6. Wrap console.log in DEV checks
7. Add effect cleanup functions

### SearchPage.jsx (9 changes)
1. Wrap 7 modal handlers in `useCallback`
2. Remove or stabilize `onMarkerClick` prop
3. Create stable `handleLocationClick` with `useCallback`
4. Create stable `handleScheduleChange` and `handleScheduleError`
5. Memoize `selectorProps` object
6. Memoize `filteredNeighborhoods` calculation
7. Memoize `calculateDynamicPrice` in PropertyCard
8. Optimize `fetchListings` dependencies
9. Wrap console.log in DEV checks

### PropertyCard (nested) (1 change)
1. Wrap in `React.memo()` with custom comparator

---

## Expected Results After Fix

### Hover Behavior
- ✅ Markers stay stable when hovering
- ✅ No flicker or disappearing pins
- ✅ Smooth hover effects

### Click Behavior
- ✅ Card appears immediately on first click
- ✅ No pin relocation
- ✅ Stable map viewport

### Filter Changes
- ✅ Markers update efficiently (add/remove only changed)
- ✅ Map auto-fits to new results
- ✅ No unnecessary re-renders

### Performance
- ✅ 70-80% reduction in re-renders
- ✅ 90% reduction in console.log overhead
- ✅ Faster filter response time
- ✅ Smoother scrolling and interactions

---

## Testing Checklist

### Before Fix
- [ ] Count re-renders on filter change (expect 10-15)
- [ ] Check hover causes marker recreation (console logs)
- [ ] Verify pin click requires 2 clicks sometimes
- [ ] Measure filter change response time

### After Fix
- [ ] Count re-renders on filter change (expect 2-3)
- [ ] Verify hover does NOT trigger marker recreation
- [ ] Verify pin click works on first click every time
- [ ] Confirm map stays stable during card display
- [ ] Measure filter change response time (should be faster)
- [ ] Test with 100+ listings (performance)
- [ ] Verify no console errors
- [ ] Check all modal handlers still work
- [ ] Verify neighborhood search still works
- [ ] Test price calculation displays correctly

---

## Implementation Order

### Phase 1 (CRITICAL - Fixes hover bug)
1. GoogleMap.jsx: Change #3 (marker UPDATE logic)
2. GoogleMap.jsx: Change #1 (React.memo wrapper)
3. SearchPage.jsx: Change #2 (remove/stabilize onMarkerClick)

**Test:** Hover bug should be fixed after these 3 changes

### Phase 2 (HIGH - Performance)
4. SearchPage.jsx: Change #1 (useCallback all handlers)
5. SearchPage.jsx: Change #3 (stable handleLocationClick)
6. SearchPage.jsx: Changes #6, #7 (useMemo optimizations)

**Test:** Re-renders should drop significantly

### Phase 3 (MEDIUM - Clean up)
7. Both files: Changes #6, #9 (wrap console.log)
8. GoogleMap.jsx: Changes #4, #5, #7 (cleanup improvements)
9. SearchPage.jsx: Changes #4, #5, #8 (remaining optimizations)

**Test:** Production performance, no regressions

---

## Risk Assessment

### Low Risk Changes
- Wrapping functions in `useCallback` (no behavior change)
- Wrapping calculations in `useMemo` (no behavior change)
- Console.log guards (no functional impact)

### Medium Risk Changes
- React.memo wrappers (test comparison logic carefully)
- Removing `onMarkerClick` dependency (verify no side effects)

### High Risk Changes
- Marker UPDATE logic (complete rewrite of marker management)
  - **Mitigation:** Keep old code commented for easy rollback
  - **Testing:** Extensive testing with filter changes, zoom, pan
  - **Validation:** Verify marker count matches listing count

---

## Rollback Plan

If issues occur:
1. Comment out React.memo wrappers first
2. If still broken, revert marker UPDATE logic
3. Keep useCallback/useMemo changes (they're safe)
4. Investigate specific failure point

---

## Files to Modify

1. `app/src/islands/shared/GoogleMap.jsx` (7 changes)
2. `app/src/islands/pages/SearchPage.jsx` (9 changes + PropertyCard)

**Total lines changed:** ~200-300 lines
**Estimated time:** 2-3 hours for implementation + 1-2 hours testing
**Risk level:** Medium (mostly safe changes with 1 high-risk rewrite)

---

**Ready to implement?** This plan addresses ALL 22 issues with proper React patterns, no patches or workarounds.
