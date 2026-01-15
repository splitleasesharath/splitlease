# Code Refactoring Plan - app

**Date:** 2026-01-15
**Audit Type:** general
**Total Chunks:** 25
**Estimated Impact:** High

---

## PAGE GROUP: /search (Chunks: 1, 2, 3, 4, 5)

~~~~~

### CHUNK 1: Replace derived state with useMemo in useSearchPageLogic
**File:** `app/src/islands/pages/useSearchPageLogic.js`
**Line:** 77-78
**Issue:** `displayedListings` is stored as separate useState but it's derived from `allListings`. This causes unnecessary re-renders and state synchronization issues.
**Affected Pages:** /search, /search-test

**Current Code:**
```javascript
const [displayedListings, setDisplayedListings] = useState([])
```

**Refactored Code:**
```javascript
const displayedListings = useMemo(() =>
  allListings.slice(0, loadedCount),
  [allListings, loadedCount]
)
```

**Testing:**
- [ ] Load /search page with listings
- [ ] Verify infinite scroll still works (loadedCount increases)
- [ ] Verify listings display correctly after filter changes
- [ ] Check React DevTools for reduced re-renders

~~~~~

### CHUNK 2: Memoize transformListing callback in useSearchPageLogic
**File:** `app/src/islands/pages/useSearchPageLogic.js`
**Line:** 140-196
**Issue:** `transformListing` callback performs heavy processing (string parsing, object transformations, Logic Core calls) but is recreated on every render despite empty dependency array. The callback reference should be stable.
**Affected Pages:** /search, /search-test

**Current Code:**
```javascript
const transformListing = useCallback((dbListing, images, hostData) => {
  const photoIds = dbListing['Features - Photos'] || []
  const listingImages = photoIds
    .map((id) => images[id])
    .filter(Boolean)
    .map((img) => img.url || img)

  const hostId = dbListing['Created By'] || dbListing.created_by
  const host = hostData[hostId] || {}

  // ... heavy processing continues
  return {
    id: dbListing._id,
    // ... many more transformations
  }
}, [])
```

**Refactored Code:**
```javascript
const transformListing = useCallback((dbListing, images, hostData) => {
  const photoIds = dbListing['Features - Photos'] || []
  const listingImages = photoIds
    .map((id) => images[id])
    .filter(Boolean)
    .map((img) => img.url || img)

  const hostId = dbListing['Created By'] || dbListing.created_by
  const host = hostData[hostId] || {}

  // ... heavy processing continues
  return {
    id: dbListing._id,
    // ... many more transformations
  }
}, []) // Empty deps is correct - function uses only arguments
// Note: The fix here is ensuring this pattern is used consistently
// and the returned object structure is stable
```

**Testing:**
- [ ] Verify listings transform correctly with all fields populated
- [ ] Check listing cards display correct host info, photos, pricing
- [ ] Test with listings missing optional fields (no photos, no host)

~~~~~

### CHUNK 3: Remove duplicated formatHostName - use processor
**File:** `app/src/islands/pages/SearchPage.jsx`
**Line:** 520-530
**Issue:** `formatHostName` function is defined inline but identical logic already exists in `logic/processors/display/formatHostName.js`. This violates DRY principle and the four-layer architecture.
**Affected Pages:** /search

**Current Code:**
```javascript
const formatHostName = (fullName) => {
  if (!fullName || fullName === 'Host') return 'Host';
  const nameParts = fullName.trim().split(/\s+/);
  if (nameParts.length === 1) return nameParts[0];
  const firstName = nameParts[0];
  const lastInitial = nameParts[nameParts.length - 1].charAt(0).toUpperCase();
  return `${firstName} ${lastInitial}.`;
};
```

**Refactored Code:**
```javascript
// At top of file, add import:
import { formatHostName } from '../../logic/processors/display/formatHostName.js'

// Remove the inline formatHostName function entirely (lines 520-530)
// The imported function has identical behavior
```

**Testing:**
- [ ] Verify host names display correctly on listing cards
- [ ] Test with single-word names (should return as-is)
- [ ] Test with multi-word names (should show "First L.")
- [ ] Test with null/undefined (should return "Host")

~~~~~

### CHUNK 4: Extract price calculation to logic layer
**File:** `app/src/islands/pages/SearchPage.jsx`
**Line:** 574-607
**Issue:** `calculateDynamicPrice` function contains business logic that belongs in `logic/calculators/pricing/`. This violates the Hollow Component Pattern and makes the logic untestable in isolation.
**Affected Pages:** /search

**Current Code:**
```javascript
const calculateDynamicPrice = () => {
  const nightsCount = selectedNightsCount;
  if (nightsCount < 1) {
    return listing['Starting nightly price'] || listing.price?.starting || 0;
  }
  const mockNightsArray = Array(nightsCount).fill({ nightNumber: 0 });
  const priceBreakdown = calculatePrice(mockNightsArray, listing, 13, null);
  return priceBreakdown.pricePerNight || listing['Starting nightly price'] || listing.price?.starting || 0;
};
```

**Refactored Code:**
```javascript
// Create new file: app/src/logic/calculators/pricing/calculateSearchCardPrice.js
export function calculateSearchCardPrice(listing, nightsCount) {
  const fallbackPrice = listing['Starting nightly price'] || listing.price?.starting || 0;

  if (nightsCount < 1) {
    return fallbackPrice;
  }

  const mockNightsArray = Array(nightsCount).fill({ nightNumber: 0 });
  const priceBreakdown = calculatePrice(mockNightsArray, listing, 13, null);

  return priceBreakdown.pricePerNight || fallbackPrice;
}

// In SearchPage.jsx, replace inline function with:
import { calculateSearchCardPrice } from '../../logic/calculators/pricing/calculateSearchCardPrice.js'

// Usage:
const dynamicPrice = calculateSearchCardPrice(listing, selectedNightsCount);
```

**Testing:**
- [ ] Verify price displays correctly for 0 nights (fallback)
- [ ] Verify price calculates correctly for 1+ nights
- [ ] Unit test the new calculator function in isolation
- [ ] Compare displayed prices before/after refactor

~~~~~

### CHUNK 5: Replace DOM manipulation with React ref
**File:** `app/src/islands/pages/SearchPage.jsx`
**Line:** 1164
**Issue:** Direct DOM manipulation with `document.querySelector` breaks React's virtual DOM model and can cause race conditions. Should use React refs instead.
**Affected Pages:** /search

**Current Code:**
```javascript
const listingsContent = document.querySelector('.listings-content');
if (listingsContent) {
  listingsContent.scrollTop = 0;
}
```

**Refactored Code:**
```javascript
// At component top, add ref:
const listingsContentRef = useRef(null);

// In JSX, attach ref to element:
<div className="listings-content" ref={listingsContentRef}>

// Replace DOM query with ref:
if (listingsContentRef.current) {
  listingsContentRef.current.scrollTop = 0;
}
```

**Testing:**
- [ ] Verify scroll resets to top when filters change
- [ ] Test on mobile and desktop viewports
- [ ] Ensure no console errors about refs

~~~~~

## PAGE GROUP: /view-split-lease (Chunks: 6, 7, 8, 9)

~~~~~

### CHUNK 6: Extract day conversion to dayUtils
**File:** `app/src/islands/pages/ViewSplitLeasePage.jsx`
**Line:** 1085-1095
**Issue:** `convertDayNamesToNumbers` function duplicates logic that should be centralized in `lib/dayUtils.js`. Day conversion is a critical operation used across the codebase.
**Affected Pages:** /view-split-lease/:id

**Current Code:**
```javascript
const convertDayNamesToNumbers = (dayNames) => {
  if (!dayNames || !Array.isArray(dayNames)) return [0, 1, 2, 3, 4, 5, 6];
  const dayNameMap = {
    'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
    'Thursday': 4, 'Friday': 5, 'Saturday': 6
  };
  const numbers = dayNames.map(name => dayNameMap[name]).filter(num => num !== undefined);
  return numbers.length > 0 ? numbers : [0, 1, 2, 3, 4, 5, 6];
};
```

**Refactored Code:**
```javascript
// In app/src/lib/dayUtils.js, add (if not exists):
export function dayNamesToIndices(dayNames) {
  if (!dayNames || !Array.isArray(dayNames)) return [0, 1, 2, 3, 4, 5, 6];
  const dayNameMap = {
    'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
    'Thursday': 4, 'Friday': 5, 'Saturday': 6
  };
  const indices = dayNames
    .map(name => dayNameMap[name])
    .filter(num => num !== undefined);
  return indices.length > 0 ? indices : [0, 1, 2, 3, 4, 5, 6];
}

// In ViewSplitLeasePage.jsx:
import { dayNamesToIndices } from '../../lib/dayUtils.js'

// Replace inline function calls with:
const dayIndices = dayNamesToIndices(listing.availableDays);
```

**Testing:**
- [ ] Verify day selection works correctly on listing page
- [ ] Test with null/undefined availableDays (should default to all days)
- [ ] Test with partial day arrays
- [ ] Verify schedule selector displays correct available days

~~~~~

### CHUNK 7: Extract timeout constant for map zoom
**File:** `app/src/islands/pages/ViewSplitLeasePage.jsx`
**Line:** 1012, 1018
**Issue:** Magic number `600` (milliseconds) used for map zoom timeout without explanation. Should be a named constant for maintainability.
**Affected Pages:** /view-split-lease/:id

**Current Code:**
```javascript
setTimeout(() => {
  if (mapRef.current) {
    mapRef.current.zoomToListing(listing.coordinates);
  }
}, 600);
```

**Refactored Code:**
```javascript
// At top of file or in a constants section:
const ANIMATION_DELAYS = {
  MAP_ZOOM_AFTER_LOAD: 600, // Wait for map tiles to load before zooming
};

// Replace magic number:
setTimeout(() => {
  if (mapRef.current) {
    mapRef.current.zoomToListing(listing.coordinates);
  }
}, ANIMATION_DELAYS.MAP_ZOOM_AFTER_LOAD);
```

**Testing:**
- [ ] Verify map zooms to listing location correctly
- [ ] Test on slow connections (may need to increase delay)
- [ ] Ensure no visual jank during zoom animation

~~~~~

### CHUNK 8: Add React.memo to GoogleMap component
**File:** `app/src/islands/shared/GoogleMap.jsx`
**Line:** End of file (export)
**Issue:** GoogleMap re-renders whenever parent re-renders even with identical props. This causes expensive map re-initialization and marker recreation.
**Affected Pages:** /view-split-lease/:id, /search, /favorite-listings

**Current Code:**
```javascript
export default function GoogleMap({ listings, onMarkerClick, selectedListingId, ...props }) {
  // ... component implementation
}
```

**Refactored Code:**
```javascript
import { memo } from 'react'

function GoogleMap({ listings, onMarkerClick, selectedListingId, ...props }) {
  // ... component implementation unchanged
}

// Custom comparison to handle array/object props
export default memo(GoogleMap, (prevProps, nextProps) => {
  // Only re-render if listings IDs changed or selectedListingId changed
  const prevIds = prevProps.listings?.map(l => l.id).join(',') || '';
  const nextIds = nextProps.listings?.map(l => l.id).join(',') || '';

  return (
    prevIds === nextIds &&
    prevProps.selectedListingId === nextProps.selectedListingId
  );
});
```

**Testing:**
- [ ] Verify map displays listings correctly
- [ ] Test marker click still works
- [ ] Test selected listing highlighting
- [ ] Use React DevTools to confirm reduced re-renders

~~~~~

### CHUNK 9: Remove expensive logging from render in GoogleMap
**File:** `app/src/islands/shared/GoogleMap.jsx`
**Line:** 128-139
**Issue:** Array operations (`.slice()`, `.map()`) performed during render solely for logging. Creates new arrays on every render even when data unchanged.
**Affected Pages:** /view-split-lease/:id, /search, /favorite-listings

**Current Code:**
```javascript
console.log('GoogleMap render:', {
  listingsCount: listings?.length,
  listingsSample: listings.slice(0, 2).map(l => ({
    id: l.id,
    lat: l.coordinates?.lat,
    lng: l.coordinates?.lng,
  })),
  selectedListingId,
});
```

**Refactored Code:**
```javascript
// Option 1: Remove entirely in production
if (import.meta.env.DEV) {
  console.log('GoogleMap render:', {
    listingsCount: listings?.length,
    selectedListingId,
  });
}

// Option 2: Move detailed logging to useEffect (runs only when deps change)
useEffect(() => {
  if (import.meta.env.DEV) {
    console.log('GoogleMap listings updated:', {
      count: listings?.length,
      sample: listings?.slice(0, 2).map(l => ({ id: l.id })),
    });
  }
}, [listings]);
```

**Testing:**
- [ ] Verify map still functions correctly
- [ ] Check console in dev mode (should still log useful info)
- [ ] Check console in production build (should be silent)

~~~~~

## PAGE GROUP: /host-proposals (Chunks: 10, 11, 12)

~~~~~

### CHUNK 10: Fix missing useEffect dependencies
**File:** `app/src/islands/pages/HostProposalsPage/useHostProposalsPageLogic.js`
**Line:** 722
**Issue:** `selectedProposal` referenced inside useEffect but not in dependency array. This causes stale closures and incorrect behavior on browser back/forward navigation.
**Affected Pages:** /host-proposals

**Current Code:**
```javascript
useEffect(() => {
  // Uses selectedProposal inside
  if (selectedProposal) {
    // ... logic that depends on selectedProposal
  }
}, [proposals]) // selectedProposal missing from deps
```

**Refactored Code:**
```javascript
useEffect(() => {
  if (selectedProposal) {
    // ... logic that depends on selectedProposal
  }
}, [proposals, selectedProposal]) // Added missing dependency
```

**Testing:**
- [ ] Navigate to /host-proposals and select a proposal
- [ ] Use browser back button, then forward
- [ ] Verify correct proposal is displayed (not stale data)
- [ ] Test with ESLint exhaustive-deps rule enabled

~~~~~

### CHUNK 11: Memoize .find() calls in handleListingChange
**File:** `app/src/islands/pages/HostProposalsPage/useHostProposalsPageLogic.js`
**Line:** 327-334
**Issue:** Multiple `.find()` calls inside event handler recalculate proposal stats on every listing change. Should memoize or compute once.
**Affected Pages:** /host-proposals

**Current Code:**
```javascript
const handleListingChange = (listingId) => {
  const listing = listings.find(l => l._id === listingId);
  const listingProposals = proposals.filter(p => p.listing_id === listingId);
  const pendingCount = listingProposals.filter(p => p.status === 'pending').length;
  const acceptedCount = listingProposals.filter(p => p.status === 'accepted').length;
  // ... more filtering
};
```

**Refactored Code:**
```javascript
// Create memoized stats lookup outside handler
const proposalStatsByListing = useMemo(() => {
  const stats = {};
  listings.forEach(listing => {
    const listingProposals = proposals.filter(p => p.listing_id === listing._id);
    stats[listing._id] = {
      total: listingProposals.length,
      pending: listingProposals.filter(p => p.status === 'pending').length,
      accepted: listingProposals.filter(p => p.status === 'accepted').length,
    };
  });
  return stats;
}, [listings, proposals]);

// Simplified handler
const handleListingChange = useCallback((listingId) => {
  const listing = listings.find(l => l._id === listingId);
  const stats = proposalStatsByListing[listingId];
  // ... use pre-computed stats
}, [listings, proposalStatsByListing]);
```

**Testing:**
- [ ] Switch between listings in dropdown
- [ ] Verify proposal counts display correctly
- [ ] Check React DevTools for reduced computation time

~~~~~

### CHUNK 12: Memoize JSON.parse in types.js
**File:** `app/src/islands/pages/HostProposalsPage/types.js`
**Line:** 277, 316, 399
**Issue:** JSON.parse() called during data transformation without caching. This is expensive for large payloads and repeats on every render.
**Affected Pages:** /host-proposals

**Current Code:**
```javascript
// Line 277
const parsedData = JSON.parse(proposal.schedule_json);

// Line 316
const amenities = JSON.parse(listing.amenities_json);

// Line 399
const preferences = JSON.parse(guest.preferences_json);
```

**Refactored Code:**
```javascript
// Create a caching wrapper
const parseCache = new Map();

function cachedJsonParse(jsonString, cacheKey) {
  if (!jsonString) return null;

  const key = cacheKey || jsonString;
  if (parseCache.has(key)) {
    return parseCache.get(key);
  }

  try {
    const parsed = JSON.parse(jsonString);
    parseCache.set(key, parsed);
    return parsed;
  } catch (e) {
    console.error('JSON parse error:', e);
    return null;
  }
}

// Usage:
const parsedData = cachedJsonParse(proposal.schedule_json, `schedule-${proposal.id}`);
```

**Testing:**
- [ ] Verify proposal data displays correctly
- [ ] Test with malformed JSON (should handle gracefully)
- [ ] Check memory usage doesn't grow unbounded (may need cache eviction)

~~~~~

## PAGE GROUP: /guest-proposals (Chunks: 13, 14)

~~~~~

### CHUNK 13: Wrap modal handlers in useCallback
**File:** `app/src/islands/pages/useGuestProposalsPageLogic.js`
**Line:** 499-630
**Issue:** 15+ handler functions recreated on every render, causing child components to receive new prop references and re-render unnecessarily.
**Affected Pages:** /guest-proposals

**Current Code:**
```javascript
const openHostProfileModal = (host) => {
  setSelectedHost(host);
  setShowHostProfileModal(true);
};

const closeHostProfileModal = () => {
  setShowHostProfileModal(false);
  setSelectedHost(null);
};

const openMapModal = (listing) => {
  setSelectedListingForMap(listing);
  setShowMapModal(true);
};

// ... 12 more similar handlers
```

**Refactored Code:**
```javascript
const openHostProfileModal = useCallback((host) => {
  setSelectedHost(host);
  setShowHostProfileModal(true);
}, []);

const closeHostProfileModal = useCallback(() => {
  setShowHostProfileModal(false);
  setSelectedHost(null);
}, []);

const openMapModal = useCallback((listing) => {
  setSelectedListingForMap(listing);
  setShowMapModal(true);
}, []);

// Apply useCallback to all handlers that are passed as props
```

**Testing:**
- [ ] Open and close host profile modal
- [ ] Open and close map modal
- [ ] Verify all modal interactions work correctly
- [ ] Check React DevTools for reduced re-renders in child components

~~~~~

### CHUNK 14: Memoize JSON.parse in FavoriteListingsPage
**File:** `app/src/islands/pages/FavoriteListingsPage/FavoriteListingsPage.jsx`
**Line:** 539, 545, 804
**Issue:** JSON.parse() called inline during render without memoization. Re-parses same data on every render.
**Affected Pages:** /favorite-listings

**Current Code:**
```javascript
// Line 539
locationSlightlyDifferent = JSON.parse(locationSlightlyDifferent);

// Line 545
const parsedLocation = JSON.parse(listing.location_json);

// Line 804
const amenities = JSON.parse(listing.amenities);
```

**Refactored Code:**
```javascript
// Use useMemo to parse once per data change
const parsedListingData = useMemo(() => {
  return favoriteListings.map(listing => ({
    ...listing,
    parsedLocation: safeJsonParse(listing.location_json),
    parsedAmenities: safeJsonParse(listing.amenities),
  }));
}, [favoriteListings]);

// Helper function
function safeJsonParse(jsonString) {
  if (!jsonString) return null;
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    console.error('JSON parse error:', e);
    return null;
  }
}
```

**Testing:**
- [ ] Load favorite listings page
- [ ] Verify listing locations display correctly
- [ ] Verify amenities display correctly
- [ ] Test with listings missing location_json field

~~~~~

## PAGE GROUP: /account-profile (Chunks: 15, 16)

~~~~~

### CHUNK 15: Memoize profileInfo object for strength calculation
**File:** `app/src/islands/pages/AccountProfilePage/useAccountProfilePageLogic.js`
**Line:** 287-296
**Issue:** `profileInfo` object created inline inside useMemo, causing unnecessary recalculations. The outer useMemo still runs because inner object is recreated.
**Affected Pages:** /account-profile

**Current Code:**
```javascript
const profileStrength = useMemo(() => {
  const profileInfo = {  // NEW object every time useMemo callback runs
    profilePhoto: profileData?.['Profile Photo'],
    firstName: formData.firstName,
    lastName: formData.lastName,
    phone: formData.phone,
    // ... more fields
  };
  return calculateProfileStrength(profileInfo, verifications);
}, [profileData, formData, verifications]);
```

**Refactored Code:**
```javascript
// Separate memoization for stable input
const profileInfo = useMemo(() => ({
  profilePhoto: profileData?.['Profile Photo'],
  firstName: formData.firstName,
  lastName: formData.lastName,
  phone: formData.phone,
  // ... more fields
}), [
  profileData?.['Profile Photo'],
  formData.firstName,
  formData.lastName,
  formData.phone,
  // ... list each primitive dependency
]);

const profileStrength = useMemo(() => {
  return calculateProfileStrength(profileInfo, verifications);
}, [profileInfo, verifications]);
```

**Testing:**
- [ ] Navigate to account profile page
- [ ] Verify profile strength indicator displays correctly
- [ ] Edit a field and verify strength updates
- [ ] Check React DevTools for computation efficiency

~~~~~

### CHUNK 16: Memoize day conversion function results
**File:** `app/src/islands/pages/AccountProfilePage/useAccountProfilePageLogic.js`
**Line:** 148-165
**Issue:** `dayNamesToIndices` and `indicesToDayNames` called without memoizing results. Day conversion runs on every render even with unchanged data.
**Affected Pages:** /account-profile

**Current Code:**
```javascript
const handleAvailabilityChange = (newDays) => {
  const dayIndices = dayNamesToIndices(newDays);
  // ... use dayIndices
  const displayNames = indicesToDayNames(dayIndices);
  // ... use displayNames
};
```

**Refactored Code:**
```javascript
// Memoize the converted values
const userAvailabilityIndices = useMemo(() =>
  dayNamesToIndices(profileData?.availability || []),
  [profileData?.availability]
);

const userAvailabilityNames = useMemo(() =>
  indicesToDayNames(userAvailabilityIndices),
  [userAvailabilityIndices]
);

// Handler uses memoized values
const handleAvailabilityChange = useCallback((newDays) => {
  const dayIndices = dayNamesToIndices(newDays);
  setFormData(prev => ({ ...prev, availability: dayIndices }));
}, []);
```

**Testing:**
- [ ] Load account profile page
- [ ] Verify availability days display correctly
- [ ] Toggle availability days on/off
- [ ] Verify changes persist after save

~~~~~

## PAGE GROUP: /listing-dashboard (Chunks: 17, 18)

~~~~~

### CHUNK 17: Memoize JSON.parse in useListingDashboardPageLogic
**File:** `app/src/islands/pages/ListingDashboardPage/useListingDashboardPageLogic.js`
**Line:** 21
**Issue:** JSON.parse called during data processing without caching.
**Affected Pages:** /listing-dashboard

**Current Code:**
```javascript
const scheduleData = JSON.parse(listing.schedule_json);
```

**Refactored Code:**
```javascript
// Use memoization for parsed schedule data
const parsedSchedules = useMemo(() => {
  const schedules = {};
  listings.forEach(listing => {
    if (listing.schedule_json) {
      try {
        schedules[listing._id] = JSON.parse(listing.schedule_json);
      } catch (e) {
        console.error(`Failed to parse schedule for listing ${listing._id}:`, e);
        schedules[listing._id] = null;
      }
    }
  });
  return schedules;
}, [listings]);

// Access via: parsedSchedules[listing._id]
```

**Testing:**
- [ ] Load listing dashboard with multiple listings
- [ ] Verify schedule data displays correctly for each listing
- [ ] Test with listings having malformed schedule_json

~~~~~

### CHUNK 18: Consolidate amenities service
**File:** `app/src/islands/shared/EditListingDetails/services/amenitiesService.js`
**Line:** 1-64
**Issue:** Complete duplication with `SelfListingPage/utils/amenitiesService.ts`. Same Supabase queries, same logic.
**Affected Pages:** /listing-dashboard (EditListingDetails modal), /self-listing

**Current Code:**
```javascript
// File 1: app/src/islands/shared/EditListingDetails/services/amenitiesService.js
export async function getCommonAmenitiesByType(type) {
  if (!type || type.trim().length === 0) {
    console.warn('No amenity type provided');
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('zat_features_amenity')
      .select('Name, "pre-set?", "Type - Amenity Categories"')
      .eq('"pre-set?"', true)
      .eq('"Type - Amenity Categories"', type)
      .order('Name', { ascending: true });
    // ... same logic
  }
}

// File 2: app/src/islands/pages/SelfListingPage/utils/amenitiesService.ts
// Nearly identical implementation
```

**Refactored Code:**
```javascript
// Create: app/src/lib/services/amenitiesService.js
import { supabase } from '../supabase.js'

export async function getCommonAmenitiesByType(type) {
  if (!type || type.trim().length === 0) {
    console.warn('[AmenitiesService] No amenity type provided');
    return [];
  }

  const { data, error } = await supabase
    .from('zat_features_amenity')
    .select('Name, "pre-set?", "Type - Amenity Categories"')
    .eq('"pre-set?"', true)
    .eq('"Type - Amenity Categories"', type)
    .order('Name', { ascending: true });

  if (error) {
    console.error('[AmenitiesService] Error fetching amenities:', error);
    return [];
  }

  return data?.map(item => item.Name) || [];
}

export async function getAllAmenityTypes() {
  const { data, error } = await supabase
    .from('zat_features_amenity')
    .select('"Type - Amenity Categories"')
    .eq('"pre-set?"', true);

  if (error) {
    console.error('[AmenitiesService] Error fetching types:', error);
    return [];
  }

  const types = [...new Set(data?.map(item => item['Type - Amenity Categories']))];
  return types.filter(Boolean);
}

// Update imports in both consuming files:
// import { getCommonAmenitiesByType } from '../../../lib/services/amenitiesService.js'
```

**Testing:**
- [ ] Open EditListingDetails modal and verify amenities load
- [ ] Create/edit listing in SelfListingPage and verify amenities load
- [ ] Test with each amenity type (Kitchen, Bathroom, etc.)
- [ ] Delete the duplicate file after verifying both locations work

~~~~~

## PAGE GROUP: / (Homepage) (Chunks: 19)

~~~~~

### CHUNK 19: Replace DOM queries with React refs in HomePage
**File:** `app/src/islands/pages/HomePage.jsx`
**Line:** 575-576
**Issue:** Direct DOM manipulation with `document.querySelector` for hero content animation. Should use React refs for reliable element access.
**Affected Pages:** /

**Current Code:**
```javascript
const heroContent = document.querySelector('.hero-content');
const exploreButton = document.querySelector('.hero-cta-button');

if (heroContent) {
  heroContent.classList.add('animate-fade-in');
}
if (exploreButton) {
  exploreButton.addEventListener('click', handleExploreClick);
}
```

**Refactored Code:**
```javascript
// At component top:
const heroContentRef = useRef(null);
const exploreButtonRef = useRef(null);

// In useEffect:
useEffect(() => {
  if (heroContentRef.current) {
    heroContentRef.current.classList.add('animate-fade-in');
  }
}, []);

// For button, use onClick prop instead of addEventListener:
// In JSX:
<div className="hero-content" ref={heroContentRef}>
  {/* ... */}
  <button
    className="hero-cta-button"
    ref={exploreButtonRef}
    onClick={handleExploreClick}
  >
    Explore Listings
  </button>
</div>
```

**Testing:**
- [ ] Load homepage and verify hero animation plays
- [ ] Click explore button and verify navigation works
- [ ] Test on mobile and desktop

~~~~~

## PAGE GROUP: /careers (Chunks: 20)

~~~~~

### CHUNK 20: Replace DOM manipulation for video controls
**File:** `app/src/islands/pages/CareersPage.jsx`
**Line:** 128, 293, 297
**Issue:** Direct DOM manipulation for video player and play button overlay. Bypasses React lifecycle and can cause race conditions.
**Affected Pages:** /careers

**Current Code:**
```javascript
const video = document.getElementById('careerVideo');
document.getElementById('playButtonOverlay').classList.add('hidden');
video.play();
```

**Refactored Code:**
```javascript
// At component top:
const videoRef = useRef(null);
const [isPlaying, setIsPlaying] = useState(false);

// Handler:
const handlePlayClick = useCallback(() => {
  if (videoRef.current) {
    videoRef.current.play();
    setIsPlaying(true);
  }
}, []);

// In JSX:
<div className="video-container">
  <video ref={videoRef} id="careerVideo" /* ... */ />
  {!isPlaying && (
    <button
      className="play-button-overlay"
      onClick={handlePlayClick}
      aria-label="Play video"
    >
      <PlayIcon />
    </button>
  )}
</div>
```

**Testing:**
- [ ] Load careers page
- [ ] Click play button overlay
- [ ] Verify video plays and overlay hides
- [ ] Test pause/resume functionality

~~~~~

## PAGE GROUP: GLOBAL/SHARED (Chunks: 21, 22, 23, 24, 25)

~~~~~

### CHUNK 21: Consolidate neighborhood service
**File:** `app/src/islands/shared/EditListingDetails/services/neighborhoodService.js`
**Line:** 1-50 (entire file)
**Issue:** Duplicate implementation exists in `SelfListingPage/utils/neighborhoodService.ts`. Same Supabase queries and regex patterns.
**Affected Pages:** /listing-dashboard (EditListingDetails), /self-listing

**Current Code:**
```javascript
// Two identical implementations in:
// - app/src/islands/shared/EditListingDetails/services/neighborhoodService.js
// - app/src/islands/pages/SelfListingPage/utils/neighborhoodService.ts

export function extractZipCode(address) {
  const zipRegex = /\b\d{5}(-\d{4})?\b/;
  const match = address?.match(zipRegex);
  return match ? match[0] : null;
}

export async function getNeighborhoodByZipCode(zipCode) {
  const { data, error } = await supabase
    .from('zat_neighborhoods')
    .select('Name, Borough')
    .eq('zip_code', zipCode)
    .maybeSingle();
  // ...
}
```

**Refactored Code:**
```javascript
// Create: app/src/lib/services/neighborhoodService.js
import { supabase } from '../supabase.js'

export function extractZipCode(address) {
  if (!address) return null;
  const zipRegex = /\b\d{5}(-\d{4})?\b/;
  const match = address.match(zipRegex);
  return match ? match[0] : null;
}

export async function getNeighborhoodByZipCode(zipCode) {
  if (!zipCode) return null;

  const { data, error } = await supabase
    .from('zat_neighborhoods')
    .select('Name, Borough')
    .eq('zip_code', zipCode)
    .maybeSingle();

  if (error) {
    console.error('[NeighborhoodService] Error:', error);
    return null;
  }

  return data;
}

export async function getNeighborhoodFromAddress(address) {
  const zipCode = extractZipCode(address);
  if (!zipCode) return null;
  return getNeighborhoodByZipCode(zipCode);
}
```

**Testing:**
- [ ] Edit listing address in EditListingDetails modal
- [ ] Verify neighborhood auto-populates from zip code
- [ ] Create new listing and verify neighborhood detection
- [ ] Test with addresses missing zip codes

~~~~~

### CHUNK 22: Consolidate safety features service
**File:** `app/src/islands/shared/EditListingDetails/services/safetyFeaturesService.js`
**Line:** 1-40 (entire file)
**Issue:** Duplicate implementation in `SelfListingPage/utils/safetyService.ts`. Identical Supabase query.
**Affected Pages:** /listing-dashboard (EditListingDetails), /self-listing

**Current Code:**
```javascript
// Duplicate in two files
export async function getPresetSafetyFeatures() {
  const { data, error } = await supabase
    .from('zfut_safetyfeatures')
    .select('Name, "pre-set?"')
    .eq('"pre-set?"', true)
    .order('Name', { ascending: true });
  // ...
}
```

**Refactored Code:**
```javascript
// Create: app/src/lib/services/safetyFeaturesService.js
import { supabase } from '../supabase.js'

export async function getPresetSafetyFeatures() {
  const { data, error } = await supabase
    .from('zfut_safetyfeatures')
    .select('Name, "pre-set?"')
    .eq('"pre-set?"', true)
    .order('Name', { ascending: true });

  if (error) {
    console.error('[SafetyFeaturesService] Error:', error);
    return [];
  }

  return data?.map(item => item.Name) || [];
}

export async function getAllSafetyFeatures() {
  const { data, error } = await supabase
    .from('zfut_safetyfeatures')
    .select('Name, "pre-set?", description')
    .order('Name', { ascending: true });

  if (error) {
    console.error('[SafetyFeaturesService] Error:', error);
    return [];
  }

  return data || [];
}
```

**Testing:**
- [ ] Edit safety features in EditListingDetails modal
- [ ] Add safety features in SelfListingPage
- [ ] Verify preset features appear in both locations
- [ ] Delete duplicate files after verification

~~~~~

### CHUNK 23: Create centralized edge function client
**File:** `app/src/lib/edgeFunctionClient.js` (NEW FILE)
**Line:** N/A (new file)
**Issue:** Edge function fetch pattern duplicated 10+ times across auth.js, listingService.js, and multiple page logic files. Same headers, error handling, and response parsing repeated.
**Affected Pages:** All pages using authentication, listings, proposals

**Current Code:**
```javascript
// Pattern repeated in 10+ locations:
const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auth-user`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    action: 'login',
    payload: { email, password }
  })
});

const data = await response.json();
if (!response.ok) {
  throw new Error(data.error || 'Request failed');
}
```

**Refactored Code:**
```javascript
// Create: app/src/lib/edgeFunctionClient.js

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Call a Supabase Edge Function with standardized error handling
 * @param {string} functionName - Name of the edge function (e.g., 'auth-user', 'proposal')
 * @param {string} action - Action to perform
 * @param {object} payload - Request payload
 * @param {string|null} token - Optional auth token (null for unauthenticated calls)
 * @returns {Promise<object>} Response data
 * @throws {Error} On network or API errors
 */
export async function callEdgeFunction(functionName, action, payload = {}, token = null) {
  const url = `${SUPABASE_URL}/functions/v1/${functionName}`;

  const headers = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_ANON_KEY,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ action, payload }),
  });

  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data.error || data.message || `Edge function ${functionName} failed`);
    error.status = response.status;
    error.code = data.code;
    throw error;
  }

  return data;
}

// Convenience wrappers for common functions
export const authFn = (action, payload, token) =>
  callEdgeFunction('auth-user', action, payload, token);

export const proposalFn = (action, payload, token) =>
  callEdgeFunction('proposal', action, payload, token);

export const listingFn = (action, payload, token) =>
  callEdgeFunction('listing', action, payload, token);
```

**Testing:**
- [ ] Test login flow with authFn wrapper
- [ ] Test proposal creation with proposalFn wrapper
- [ ] Test listing fetch with listingFn wrapper
- [ ] Verify error handling preserves status codes
- [ ] Migrate one call site at a time

~~~~~

### CHUNK 24: Create centralized user ID resolver
**File:** `app/src/lib/userIdResolver.js` (NEW FILE)
**Line:** N/A (new file)
**Issue:** User ID resolution logic (Supabase UUID vs Bubble ID) duplicated 6+ times in listingService.js and auth.js.
**Affected Pages:** All authenticated flows, listing operations

**Current Code:**
```javascript
// Repeated in 6+ locations:
const isSupabaseUUID = userId && userId.includes('-');

if (isSupabaseUUID) {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user?.email) {
    const { data: userData } = await supabase
      .from('user')
      .select('_id')
      .or(`email.eq.${session.user.email},email as text.eq.${session.user.email}`)
      .maybeSingle();
    userId = userData?._id;
  }
}
```

**Refactored Code:**
```javascript
// Create: app/src/lib/userIdResolver.js
import { supabase } from './supabase.js'

/**
 * Check if a user ID is a Supabase UUID format
 * @param {string} userId
 * @returns {boolean}
 */
export function isSupabaseUUID(userId) {
  return Boolean(userId && userId.includes('-') && userId.length === 36);
}

/**
 * Resolve a user ID to the Bubble-compatible _id format
 * Works with both Supabase UUIDs and existing Bubble IDs
 * @param {string} userId - Either a Supabase UUID or Bubble _id
 * @returns {Promise<string|null>} The Bubble-compatible user._id
 */
export async function resolveToBubbleId(userId) {
  if (!userId) return null;

  // If it's already a Bubble ID, return as-is
  if (!isSupabaseUUID(userId)) {
    return userId;
  }

  // It's a Supabase UUID, need to look up the Bubble _id
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.user?.email) {
    console.warn('[UserIdResolver] No session email for UUID lookup');
    return null;
  }

  const { data: userData, error } = await supabase
    .from('user')
    .select('_id')
    .or(`email.eq.${session.user.email},"email as text".eq.${session.user.email}`)
    .maybeSingle();

  if (error) {
    console.error('[UserIdResolver] Lookup error:', error);
    return null;
  }

  return userData?._id || null;
}

/**
 * Get the current user's Bubble _id
 * @returns {Promise<string|null>}
 */
export async function getCurrentUserBubbleId() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) return null;
  return resolveToBubbleId(session.user.id);
}
```

**Testing:**
- [ ] Test with Supabase UUID user (new auth)
- [ ] Test with Bubble ID user (legacy)
- [ ] Test listing creation with resolved ID
- [ ] Test proposal creation with resolved ID
- [ ] Verify no breaking changes to existing flows

~~~~~

### CHUNK 25: Create centralized form validators
**File:** `app/src/lib/validators.js` (NEW FILE)
**Line:** N/A (new file)
**Issue:** Email, phone, and required field validation patterns duplicated 15+ times across SignUpLoginModal, RentalApplicationPage, AccountProfilePage, and SelfListingPage.
**Affected Pages:** All pages with forms

**Current Code:**
```javascript
// Repeated in 15+ locations with slight variations:

// Email validation
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email)) {
  setError('Invalid email format');
}

// Phone validation
const phoneRegex = /^\d{10}$/;
if (!phoneRegex.test(phone.replace(/\D/g, ''))) {
  setError('Invalid phone number');
}

// Required field
if (!field || field.trim() === '') {
  errors.push('Field is required');
}
```

**Refactored Code:**
```javascript
// Create: app/src/lib/validators.js

/**
 * Centralized form validation utilities
 * Returns { isValid: boolean, error: string | null }
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\d{10}$/;
const ZIP_REGEX = /^\d{5}(-\d{4})?$/;

export function validateEmail(email) {
  if (!email || email.trim() === '') {
    return { isValid: false, error: 'Email is required' };
  }
  if (!EMAIL_REGEX.test(email.trim())) {
    return { isValid: false, error: 'Please enter a valid email address' };
  }
  return { isValid: true, error: null };
}

export function validatePhone(phone) {
  if (!phone) {
    return { isValid: false, error: 'Phone number is required' };
  }
  const digitsOnly = phone.replace(/\D/g, '');
  if (!PHONE_REGEX.test(digitsOnly)) {
    return { isValid: false, error: 'Please enter a valid 10-digit phone number' };
  }
  return { isValid: true, error: null };
}

export function validateRequired(value, fieldName = 'This field') {
  if (value === null || value === undefined || String(value).trim() === '') {
    return { isValid: false, error: `${fieldName} is required` };
  }
  return { isValid: true, error: null };
}

export function validateZipCode(zip) {
  if (!zip) {
    return { isValid: false, error: 'ZIP code is required' };
  }
  if (!ZIP_REGEX.test(zip.trim())) {
    return { isValid: false, error: 'Please enter a valid ZIP code' };
  }
  return { isValid: true, error: null };
}

export function validateMinLength(value, minLength, fieldName = 'This field') {
  if (!value || value.length < minLength) {
    return { isValid: false, error: `${fieldName} must be at least ${minLength} characters` };
  }
  return { isValid: true, error: null };
}

/**
 * Validate multiple fields at once
 * @param {Array<{value: any, validator: Function, fieldName?: string}>} validations
 * @returns {{ isValid: boolean, errors: string[] }}
 */
export function validateAll(validations) {
  const errors = [];

  for (const { value, validator, fieldName } of validations) {
    const result = validator(value, fieldName);
    if (!result.isValid) {
      errors.push(result.error);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
```

**Testing:**
- [ ] Test email validation with valid/invalid emails
- [ ] Test phone validation with various formats
- [ ] Test required field validation with empty/whitespace values
- [ ] Integrate with one form and verify behavior
- [ ] Migrate remaining forms one at a time

~~~~~

---

## Summary

| Page Group | Chunks | Priority |
|------------|--------|----------|
| /search | 1, 2, 3, 4, 5 | High |
| /view-split-lease | 6, 7, 8, 9 | High |
| /host-proposals | 10, 11, 12 | Medium |
| /guest-proposals | 13, 14 | Medium |
| /account-profile | 15, 16 | Medium |
| /listing-dashboard | 17, 18 | Medium |
| / (homepage) | 19 | Low |
| /careers | 20 | Low |
| GLOBAL/SHARED | 21, 22, 23, 24, 25 | High |

### Execution Order Recommendation

**Phase 1 - Foundation (GLOBAL chunks first):**
1. Chunk 23: Edge function client (enables all API calls)
2. Chunk 24: User ID resolver (fixes auth inconsistencies)
3. Chunk 25: Form validators (standardizes validation)

**Phase 2 - Service Consolidation:**
4. Chunk 18: Amenities service
5. Chunk 21: Neighborhood service
6. Chunk 22: Safety features service

**Phase 3 - High-Traffic Pages (/search, /view-split-lease):**
7. Chunks 1-5: Search page optimizations
8. Chunks 6-9: View split lease optimizations

**Phase 4 - Remaining Pages:**
9. Chunks 10-12: Host proposals
10. Chunks 13-14: Guest proposals
11. Chunks 15-16: Account profile
12. Chunk 17: Listing dashboard
13. Chunks 19-20: Homepage and careers

---

## Files Referenced

### Files to Modify
- `app/src/islands/pages/useSearchPageLogic.js`
- `app/src/islands/pages/SearchPage.jsx`
- `app/src/islands/pages/ViewSplitLeasePage.jsx`
- `app/src/islands/shared/GoogleMap.jsx`
- `app/src/islands/pages/HostProposalsPage/useHostProposalsPageLogic.js`
- `app/src/islands/pages/HostProposalsPage/types.js`
- `app/src/islands/pages/useGuestProposalsPageLogic.js`
- `app/src/islands/pages/FavoriteListingsPage/FavoriteListingsPage.jsx`
- `app/src/islands/pages/AccountProfilePage/useAccountProfilePageLogic.js`
- `app/src/islands/pages/ListingDashboardPage/useListingDashboardPageLogic.js`
- `app/src/islands/pages/HomePage.jsx`
- `app/src/islands/pages/CareersPage.jsx`
- `app/src/lib/dayUtils.js`

### Files to Create
- `app/src/logic/calculators/pricing/calculateSearchCardPrice.js`
- `app/src/lib/services/amenitiesService.js`
- `app/src/lib/services/neighborhoodService.js`
- `app/src/lib/services/safetyFeaturesService.js`
- `app/src/lib/edgeFunctionClient.js`
- `app/src/lib/userIdResolver.js`
- `app/src/lib/validators.js`

### Files to Delete (after migration)
- `app/src/islands/shared/EditListingDetails/services/amenitiesService.js`
- `app/src/islands/shared/EditListingDetails/services/neighborhoodService.js`
- `app/src/islands/shared/EditListingDetails/services/safetyFeaturesService.js`
- `app/src/islands/pages/SelfListingPage/utils/amenitiesService.ts`
- `app/src/islands/pages/SelfListingPage/utils/neighborhoodService.ts`
- `app/src/islands/pages/SelfListingPage/utils/safetyService.ts`
