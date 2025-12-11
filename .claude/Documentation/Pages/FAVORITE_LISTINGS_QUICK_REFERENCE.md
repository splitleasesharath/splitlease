# Favorite Listings Page - Quick Reference

**GENERATED**: 2025-12-11
**PAGE_URL**: `/favorite-listings`
**ENTRY_POINT**: `app/src/favorite-listings.jsx`

---

## ### ARCHITECTURE_OVERVIEW ###

```
favorite-listings.jsx (Entry Point)
    |
    +-- FavoriteListingsPage.jsx (Main Component - 968 lines)
            |
            +-- State Management
            |       +-- Auth validation via checkAuthStatus()
            |       +-- User ID via getSessionId()
            |       +-- User favorites via Supabase user table
            |       +-- Listings fetch via Supabase listing table
            |       +-- Batch photo/host data loading via supabaseUtils
            |       +-- Data lookups initialization
            |
            +-- Internal Components (defined in FavoriteListingsPage.jsx)
            |   +-- PropertyCard - Listing display with F7b layout
            |   +-- ListingsGrid - Grid of PropertyCards
            |   +-- LoadingState - Skeleton loader
            |   +-- ErrorState - Error display with retry
            |
            +-- Imported Components
            |   +-- EmptyState (local) - No favorites message
            |   +-- FavoriteButton (shared) - Toggle with API sync
            |   +-- GoogleMap (shared) - Map with markers
            |   +-- LoggedInAvatar (shared) - User menu
            |   +-- AuthAwareSearchScheduleSelector (shared) - Day selection
            |   +-- ContactHostMessaging (shared) - Host messaging modal
            |   +-- InformationalText (shared) - Price info tooltip
            |
            +-- API Layer
                +-- favoritesApi.js - Edge Function calls
                +-- supabase.functions.invoke('bubble-proxy') - toggle_favorite
```

---

## ### FILE_INVENTORY ###

### Entry Point
| File | Purpose |
|------|---------|
| `app/src/favorite-listings.jsx` | Mounts FavoriteListingsPage to #favorite-listings-page |

### Page Components
| File | Purpose |
|------|---------|
| `app/src/islands/pages/FavoriteListingsPage/FavoriteListingsPage.jsx` | Main page component (968 lines) |
| `app/src/islands/pages/FavoriteListingsPage/index.js` | Module exports (default + named) |

### Sub-Components
| File | Purpose |
|------|---------|
| `app/src/islands/pages/FavoriteListingsPage/components/EmptyState.jsx` | No favorites state with CTA |
| `app/src/islands/pages/FavoriteListingsPage/components/EmptyState.css` | Empty state styles |
| `app/src/islands/pages/FavoriteListingsPage/components/ListingCard.jsx` | Alternative listing card (not used) |
| `app/src/islands/pages/FavoriteListingsPage/components/ListingCard.css` | Listing card styles |
| `app/src/islands/pages/FavoriteListingsPage/components/FavoriteButton.jsx` | Local favorite button (not used) |
| `app/src/islands/pages/FavoriteListingsPage/components/FavoriteButton.css` | Local button styles |
| `app/src/islands/pages/FavoriteListingsPage/components/MapView.jsx` | Leaflet-based map (not used) |
| `app/src/islands/pages/FavoriteListingsPage/components/MapView.css` | MapView styles |
| `app/src/islands/pages/FavoriteListingsPage/components/SplitScheduleSelector.jsx` | Schedule selector (not used) |
| `app/src/islands/pages/FavoriteListingsPage/components/SplitScheduleSelector.css` | Selector styles |

### Shared Components (Primary)
| File | Purpose |
|------|---------|
| `app/src/islands/shared/FavoriteButton/FavoriteButton.jsx` | Primary FavoriteButton with API integration |
| `app/src/islands/shared/FavoriteButton/FavoriteButton.css` | Shared button styles |
| `app/src/islands/shared/GoogleMap.jsx` | Google Maps with listing markers |
| `app/src/islands/shared/LoggedInAvatar/LoggedInAvatar.jsx` | User dropdown menu |
| `app/src/islands/shared/AuthAwareSearchScheduleSelector.jsx` | Day selection filter |
| `app/src/islands/shared/ContactHostMessaging.jsx` | Host messaging modal |
| `app/src/islands/shared/InformationalText.jsx` | Info tooltip modal |

### API Layer
| File | Purpose |
|------|---------|
| `app/src/islands/pages/FavoriteListingsPage/favoritesApi.js` | Client-side API service (3 functions) |
| `supabase/functions/bubble-proxy/` | Edge Function: toggle_favorite, get_favorites |

### Utilities
| File | Purpose |
|------|---------|
| `app/src/islands/pages/FavoriteListingsPage/formatters.js` | Format bedrooms, price, location, dates, images |
| `app/src/islands/pages/FavoriteListingsPage/types.js` | JSDoc type definitions |

### Styles
| File | Purpose |
|------|---------|
| `app/src/islands/pages/FavoriteListingsPage/FavoriteListingsPage.css` | Page styles (imports search-page.css, listings.css, toast.css) |

---

## ### URL_ROUTING ###

```
/favorite-listings                    # User's favorited listings
```

### Route Configuration (`routes.config.js`)
```javascript
{
  path: '/favorite-listings',
  file: 'favorite-listings.html',
  aliases: ['/favorite-listings.html'],
  protected: true,                    // Requires authentication
  cloudflareInternal: false,
  hasDynamicSegment: false
}
```

### Navigation Function (`lib/navigation.js`)
```javascript
import { goToFavorites } from 'lib/navigation.js'

goToFavorites()  // Navigates to /favorite-listings
```

---

## ### STATE_MANAGEMENT ###

### Component State (useState)
```javascript
// Core data
const [listings, setListings] = useState([]);
const [isLoading, setIsLoading] = useState(true);
const [error, setError] = useState(null);
const [userId, setUserId] = useState(null);

// Auth state
const [isLoggedIn, setIsLoggedIn] = useState(false);
const [currentUser, setCurrentUser] = useState(null);
const [favoritedListingIds, setFavoritedListingIds] = useState(new Set());

// Modal state
const [isContactModalOpen, setIsContactModalOpen] = useState(false);
const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
const [selectedListing, setSelectedListing] = useState(null);
const [infoModalTriggerRef, setInfoModalTriggerRef] = useState(null);

// Toast notification state
const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

// Informational texts (from Supabase)
const [informationalTexts, setInformationalTexts] = useState({});

// Mobile UI
const [mobileMapVisible, setMobileMapVisible] = useState(false);
const [menuOpen, setMenuOpen] = useState(false);
```

### Refs
```javascript
const mapRef = useRef(null);  // Reference to GoogleMap component
```

---

## ### DATA_FLOW ###

### 1. Authentication Check
```javascript
// Check if user is logged in
const isAuthenticated = await checkAuthStatus();
setIsLoggedIn(isAuthenticated);

if (!isAuthenticated) {
  setError('Please log in to view your favorite listings.');
  return;
}

// Get user data
const userData = await validateTokenAndFetchUser();
const sessionId = getSessionId();  // Bubble user ID
setUserId(sessionId);

if (userData) {
  setCurrentUser({
    id: sessionId,
    name: userData.fullName || userData.firstName || '',
    email: userData.email || '',
    userType: userData.userType || 'GUEST',
    avatarUrl: userData.profilePhoto || null
  });
}
```

### 2. Fetch User's Favorite IDs
```javascript
// Get favorites array from user table
const { data: userFavorites, error: favError } = await supabase
  .from('user')
  .select('"Favorited Listings"')
  .eq('_id', sessionId)
  .single();

// Parse favorites (stored as JSON array or string)
const favorites = userFavorites?.['Favorited Listings'];
let favoritedIds = [];

if (typeof favorites === 'string') {
  try { favoritedIds = JSON.parse(favorites); } catch { favoritedIds = []; }
} else if (Array.isArray(favorites)) {
  favoritedIds = favorites;
}

// Filter to valid Bubble IDs (format: "123x456")
favoritedIds = favoritedIds.filter(id => typeof id === 'string' && /^\d+x\d+$/.test(id));
setFavoritedListingIds(new Set(favoritedIds));
```

### 3. Fetch Listings Data
```javascript
// Batch fetch listings from Supabase (all favorited, regardless of Active status)
const { data: listingsData, error: listingsError } = await supabase
  .from('listing')
  .select('*')
  .in('_id', favoritedIds);

// Collect legacy photo IDs for batch fetch
const legacyPhotoIds = new Set();
listingsData.forEach(listing => {
  const photos = listing['Features - Photos'];
  // Only collect string IDs (legacy format), not objects (new format)
  if (Array.isArray(photos)) {
    photos.forEach(photo => {
      if (typeof photo === 'string') legacyPhotoIds.add(photo);
    });
  }
});

// Batch fetch photo URLs (only for legacy IDs)
const photoMap = legacyPhotoIds.size > 0
  ? await fetchPhotoUrls(Array.from(legacyPhotoIds))
  : {};

// Extract photos per listing (handles both embedded objects and legacy IDs)
const resolvedPhotos = {};
listingsData.forEach(listing => {
  resolvedPhotos[listing._id] = extractPhotos(
    listing['Features - Photos'],
    photoMap,
    listing._id
  );
});

// Batch fetch host data
const hostIds = new Set();
listingsData.forEach(listing => {
  if (listing['Host / Landlord']) hostIds.add(listing['Host / Landlord']);
});
const hostMap = await fetchHostData(Array.from(hostIds));

// Transform listings with photos and host data
const transformedListings = listingsData
  .map(listing => transformListing(listing, resolvedPhotos[listing._id], hostMap[listing['Host / Landlord']]))
  .filter(listing => listing.coordinates?.lat && listing.coordinates?.lng)
  .filter(listing => listing.images?.length > 0);
```

### 4. Toggle Favorite (Optimistic UI via Shared FavoriteButton)
```javascript
// FavoriteButton handles this automatically with immediate visual feedback
// API call happens in background via bubble-proxy Edge Function

const { data, error } = await supabase.functions.invoke('bubble-proxy', {
  body: {
    action: 'toggle_favorite',
    payload: {
      userId,
      listingId,
      action: newState ? 'add' : 'remove',
    },
  },
});

// Parent callback updates local state
const handleToggleFavorite = (listingId, listingTitle, newState) => {
  if (!newState) {
    // Remove from displayed listings when unfavorited
    setListings(prev => prev.filter(l => l.id !== listingId));
    showToast(`${listingTitle} removed from favorites`, 'info');
  } else {
    showToast(`${listingTitle} added to favorites`, 'success');
  }
};
```

---

## ### FAVORITEBUTTON_STATES ###

The shared FavoriteButton component (`app/src/islands/shared/FavoriteButton/`) manages:

| State | Visual Style | Behavior |
|-------|--------------|----------|
| `not favorited` | White stroke, no fill | Click to add |
| `not favorited (hover)` | currentColor stroke | Hover effect |
| `favorited` | currentColor fill + stroke | Click to remove |
| `animating` | Scale animation (300ms) | Brief pop effect |
| `loading` | Disabled state | No pointer events |

### Button Sizes
| Size | Padding | Icon Size |
|------|---------|-----------|
| `small` | - | 16x16 |
| `medium` | - | 20x20 |
| `large` | - | 24x24 |

### Props
```jsx
<FavoriteButton
  listingId="123x456"          // Required: Bubble listing ID
  userId="789x012"             // Required: Bubble user ID (null shows auth prompt)
  initialFavorited={false}     // Initial state
  onToggle={(newState, id) => {}} // Callback after toggle
  onRequireAuth={() => {}}     // Called when userId is null
  disabled={false}             // Disable interactions
  size="medium"                // 'small' | 'medium' | 'large'
/>
```

---

## ### FAVORITES_API ###

Located in `favoritesApi.js`:

### getFavoritedListings(userId, options)
```javascript
// Request
{
  "action": "get_favorites",
  "payload": {
    "userId": "123x456",
    "page": 1,
    "perPage": 20,
    "sortBy": "price_asc"
  }
}

// Response
{
  "success": true,
  "data": {
    "listings": [...],
    "pagination": { total, page, perPage, totalPages }
  }
}
```

### removeFromFavorites(userId, listingId)
```javascript
// Request
{
  "action": "toggle_favorite",
  "payload": {
    "userId": "123x456",
    "listingId": "789x012",
    "action": "remove"
  }
}
```

### addToFavorites(userId, listingId)
```javascript
// Request
{
  "action": "toggle_favorite",
  "payload": {
    "userId": "123x456",
    "listingId": "789x012",
    "action": "add"
  }
}
```

---

## ### DATABASE_FIELDS ###

### User Table (`user`)
| Field | Type | Description |
|-------|------|-------------|
| `_id` | string | Bubble user ID (e.g., "123x456") |
| `Favorited Listings` | JSONB array | Array of listing IDs |

### Listing Table (`listing`)
| Field | Type | Description |
|-------|------|-------------|
| `_id` | string | Bubble listing ID |
| `Name` | string | Listing title |
| `Active` | boolean | Is listing active |
| `Location - Address` | JSON | `{ lat, lng, address }` |
| `Location - slightly different address` | JSON | Alternative coordinates (preferred) |
| `Location - Hood` | string | Neighborhood ID |
| `Location - Borough` | string | Borough ID |
| `Features - Photos` | array/string | Photo IDs or embedded objects |
| `Features - Type of Space` | string | Property type ID |
| `Features - SQFT Area` | number | Square footage |
| `Features - Qty Guests` | number | Max guests |
| `Features - Qty Bedrooms` | number | Bedrooms count |
| `Features - Qty Bathrooms` | number | Bathrooms count |
| `Standarized Minimum Nightly Price (Filter)` | number | Starting nightly rate |
| `Nightly Host Rate for 2-7 nights` | number | Price per night count |
| `Host / Landlord` | string | Host user ID |
| `Weeks offered` | string | Schedule pattern |

---

## ### LISTING_TRANSFORMATION ###

The `transformListing()` function (useCallback) converts raw Supabase data to display format:

```javascript
const transformListing = (dbListing, images, hostData) => ({
  id: dbListing._id,
  title: dbListing.Name || 'Unnamed Listing',
  location: formatLocation(neighborhoodName, boroughName),
  neighborhood: neighborhoodName,
  borough: boroughName,
  coordinates: { lat, lng },  // From Location - slightly different address (preferred) or Location - Address
  price: {
    starting: dbListing['Standarized Minimum Nightly Price (Filter)'],
    full: dbListing['Nightly Host Rate for 7 nights']
  },
  'Starting nightly price': dbListing['Standarized Minimum Nightly Price (Filter)'],
  'Price 2 nights selected': dbListing['Nightly Host Rate for 2 nights'],
  'Price 3 nights selected': dbListing['Nightly Host Rate for 3 nights'],
  'Price 4 nights selected': dbListing['Nightly Host Rate for 4 nights'],
  'Price 5 nights selected': dbListing['Nightly Host Rate for 5 nights'],
  'Price 6 nights selected': null,  // Not in database
  'Price 7 nights selected': dbListing['Nightly Host Rate for 7 nights'],
  type: propertyType,          // From dataLookups
  squareFeet: dbListing['Features - SQFT Area'],
  maxGuests: dbListing['Features - Qty Guests'] || 1,
  bedrooms: dbListing['Features - Qty Bedrooms'] || 0,
  bathrooms: dbListing['Features - Qty Bathrooms'] || 0,
  amenities: parseAmenities(dbListing),
  host: hostData || { name: null, image: null, verified: false },
  images: images || [],
  description: `${bedrooms === 0 ? 'Studio' : `${bedrooms} bedroom`} * ${bathrooms} bathroom`,
  weeks_offered: dbListing['Weeks offered'] || 'Every week',
  isNew: false
});
```

### Filter Requirements
Listings must have:
1. Valid coordinates (`coordinates.lat && coordinates.lng`)
2. At least one image (`images.length > 0`)

---

## ### PRICING_CALCULATION ###

Dynamic pricing based on 5 nights (Monday-Friday default):

```javascript
const calculateDynamicPrice = () => {
  const nightsCount = 5; // Default to 5 nights (Mon-Fri)

  const priceFieldMap = {
    2: 'Price 2 nights selected',
    3: 'Price 3 nights selected',
    4: 'Price 4 nights selected',
    5: 'Price 5 nights selected',
    6: 'Price 6 nights selected',
    7: 'Price 7 nights selected'
  };

  // Get host compensation rate for selected nights
  let nightlyHostRate = listing[priceFieldMap[nightsCount]] || 0;

  // Fallback to starting price
  if (!nightlyHostRate) {
    nightlyHostRate = listing['Starting nightly price'] || listing.price?.starting || 0;
  }

  // Apply markup calculation (same as priceCalculations.js)
  const basePrice = nightlyHostRate * nightsCount;
  const fullTimeDiscount = nightsCount === 7 ? basePrice * 0.13 : 0;
  const priceAfterDiscounts = basePrice - fullTimeDiscount;
  const siteMarkup = priceAfterDiscounts * 0.17;
  const totalPrice = basePrice - fullTimeDiscount + siteMarkup;
  const pricePerNight = totalPrice / nightsCount;

  return pricePerNight;
};
```

---

## ### LAYOUT_STRUCTURE ###

Two-column layout matching SearchPage (45% listings, 55% map):

```
+-------------------------------------------------------------+
| LISTINGS COLUMN (45%)           | MAP COLUMN (55%)          |
|                                 |                           |
| +---------------------------+   | +-------------------------+
| | Mobile Filter Bar (< 768) |   | | Map Header              |
| | [Map] button              |   | | Logo | Heart | Avatar   |
| +---------------------------+   | +-------------------------+
| | Mobile Schedule Selector  |   | |                         |
| +---------------------------+   | |    Google Map           |
| | Desktop Schedule Selector |   | |    with markers         |
| +---------------------------+   | |                         |
| | Listings Count            |   | |                         |
| | "X favorites"             |   | |                         |
| +---------------------------+   | |                         |
| |                           |   | |                         |
| | [LoadingState]            |   | |                         |
| | OR [ErrorState]           |   | |                         |
| | OR [EmptyState]           |   | |                         |
| | OR [ListingsGrid]         |   | |                         |
| |                           |   | |                         |
+-------------------------------------------------------------+
```

---

## ### PROPERTYCARD_STRUCTURE ###

Uses F7b Layout (same as SearchPage):

```
+---------------------------------------------------+
| [Image Carousel]                                   |
| [< prev] [next >]    [FavoriteButton]             |
| [1 / 5]              [New Listing badge]          |
+---------------------------------------------------+
| LISTING-MAIN-INFO          | PRICE-SIDEBAR        |
|                            |                      |
| [Location icon] Neighborhood, Borough             |
| Listing Title              | $XXX.XX              |
| Type | guests | bed | bath | /night               |
|                            | ---------------      |
| [Host Avatar] Host Name    | Starting at          |
| [Message] button           | $XX/night            |
|                            | Message Split Lease  |
|                            | for Availability     |
+---------------------------------------------------+
```

### PropertyCard Props
```jsx
<PropertyCard
  listing={listing}
  onLocationClick={(listing) => mapRef.current?.zoomToListing(listing.id)}
  onOpenContactModal={(listing) => handleOpenContactModal(listing)}
  onOpenInfoModal={(listing, triggerRef) => handleOpenInfoModal(listing, triggerRef)}
  isLoggedIn={isLoggedIn}
  isFavorited={true}  // Always true on favorites page
  onToggleFavorite={(listingId, title, newState) => handleToggleFavorite(listingId, title, newState)}
  userId={userId}
/>
```

---

## ### TOAST_NOTIFICATIONS ###

| Type | Border Color | Icon Color | Message Example |
|------|--------------|------------|-----------------|
| `success` | #22c55e (green) | #22c55e | "Listing added to favorites" |
| `info` | #3b82f6 (blue) | #3b82f6 | "Listing removed from favorites" |
| `error` | #ef4444 (red) | #ef4444 | "Failed to update favorites" |

```javascript
const showToast = (message, type = 'success') => {
  setToast({ show: true, message, type });
  setTimeout(() => {
    setToast({ show: false, message: '', type: 'success' });
  }, 3000);  // Auto-dismiss after 3 seconds
};
```

---

## ### EMPTY_STATE ###

Displayed when user has no favorites:

```jsx
<EmptyState
  message="You don't have any favorite listings yet. We invite you to search listings and submit proposals with the weekly schedule you have in mind"
  ctaText="Explore Rentals"
  ctaLink="/search"
/>
```

### Visual Elements
- Heart icon (64x64, gray stroke, strokeWidth 1.5)
- Message text (gray #6b7280, centered, line-height 1.6)
- Purple CTA button (#5b21b6, hover: #4c1d95)

---

## ### MOBILE_RESPONSIVENESS ###

### Breakpoints
| Breakpoint | Changes |
|------------|---------|
| `< 768px` | Mobile filter bar visible, mobile schedule selector, toast at bottom, hamburger menu hidden |
| `> 768px` | Two-column layout, desktop schedule selector, toast at top-right |

### Mobile Map Modal
Full-screen overlay triggered by "Map" button:
```jsx
{mobileMapVisible && (
  <div className="mobile-map-modal">
    <div className="mobile-map-header">
      <button className="mobile-map-close-btn" onClick={() => setMobileMapVisible(false)}>X</button>
      <h2>Map View</h2>
    </div>
    <div className="mobile-map-content">
      <GoogleMap
        ref={mapRef}
        listings={[]}
        filteredListings={listings}
        selectedListing={null}
        selectedBorough={null}
        onMarkerClick={(listing) => console.log('Marker clicked:', listing.title)}
        onMessageClick={(listing) => handleOpenContactModal(listing)}
        isLoggedIn={isLoggedIn}
        favoritedListingIds={favoritedListingIds}
        onToggleFavorite={handleToggleFavorite}
      />
    </div>
  </div>
)}
```

---

## ### KEY_IMPORTS ###

```javascript
// React
import { useState, useEffect, useRef, useCallback } from 'react';
import { createRoot } from 'react-dom/client';

// Shared components
import GoogleMap from '../../shared/GoogleMap.jsx';
import FavoriteButton from '../../shared/FavoriteButton/FavoriteButton.jsx';
import LoggedInAvatar from '../../shared/LoggedInAvatar/LoggedInAvatar.jsx';
import AuthAwareSearchScheduleSelector from '../../shared/AuthAwareSearchScheduleSelector.jsx';
import ContactHostMessaging from '../../shared/ContactHostMessaging.jsx';
import InformationalText from '../../shared/InformationalText.jsx';

// Local components
import EmptyState from './components/EmptyState';

// API
import { getFavoritedListings, removeFromFavorites } from './favoritesApi';

// Auth
import { checkAuthStatus, getSessionId, validateTokenAndFetchUser, getUserId, logoutUser } from '../../../lib/auth';

// Data utilities
import { getNeighborhoodName, getBoroughName, getPropertyTypeLabel, initializeLookups, isInitialized } from '../../../lib/dataLookups.js';
import { fetchPhotoUrls, extractPhotos, fetchHostData, parseAmenities } from '../../../lib/supabaseUtils.js';

// Supabase
import { supabase } from '../../../lib/supabase.js';

// Styles
import './FavoriteListingsPage.css';
```

---

## ### CSS_CLASSES ###

### Page Container
| Class | Purpose |
|-------|---------|
| `.favorites-page` | Main page wrapper (100vh, 100vw, no padding-top) |
| `.two-column-layout` | Flex container for columns |
| `.listings-column` | Left column (45%) |
| `.map-column` | Right column (55%) |

### Header Elements
| Class | Purpose |
|-------|---------|
| `.map-header` | Logo + auth actions row |
| `.map-logo` | Logo link with icon + text |
| `.logo-icon` | Logo image (36x36) |
| `.logo-text` | "Split Lease" text |
| `.map-header-actions` | Right-side actions container |
| `.favorites-link.active` | Filled orange heart icon (#FF6B35) |
| `.favorites-badge` | Count badge overlay |
| `.hamburger-menu` | Guest menu button (hidden on mobile) |

### Schedule Selectors
| Class | Purpose |
|-------|---------|
| `.mobile-filter-bar` | Mobile filter row |
| `.map-toggle-btn` | Mobile map button |
| `.mobile-schedule-selector` | Mobile selector container |
| `.inline-filters` | Desktop selector container |
| `.filter-group.schedule-selector-group` | Selector mount point |

### Listings
| Class | Purpose |
|-------|---------|
| `.listings-count` | "X favorites" counter |
| `.listings-content` | Main content area |
| `.listings-container` | Grid container |
| `.listing-card` | Individual card (link element) |
| `.listing-images` | Photo carousel container |
| `.image-nav.prev-btn/.next-btn` | Navigation buttons |
| `.image-counter` | "1 / 5" indicator |
| `.listing-content` | Card details section |
| `.listing-main-info` | Left side info |
| `.listing-info-top` | Location + title |
| `.listing-location` | Location row with icon |
| `.listing-title` | Listing name |
| `.listing-meta` | Type, guests, bed, bath row |
| `.listing-host-row` | Host + message button |
| `.listing-price-sidebar` | Right side pricing |

### Toast Notifications
| Class | Purpose |
|-------|---------|
| `.toast` | Base toast styles (fixed, top-right) |
| `.toast.show` | Visible state (transform) |
| `.toast-success` | Green left border (#22c55e) |
| `.toast-info` | Blue left border (#3b82f6) |
| `.toast-error` | Red left border (#ef4444) |
| `.toast-icon` | Icon container |
| `.toast-message` | Message text |

### Empty/Error States
| Class | Purpose |
|-------|---------|
| `.empty-state` | Centered flex container |
| `.empty-state-content` | Inner content wrapper (max-width 400px) |
| `.empty-state-icon` | Heart icon (64px, gray #9ca3af) |
| `.empty-state-message` | Gray text message |
| `.empty-state-cta` | Purple action button (#5b21b6) |
| `.error-message` | Error display container |
| `.retry-btn` | Retry action button |
| `.loading-skeleton.active` | Loading skeleton container |
| `.skeleton-card` | Individual skeleton card |
| `.skeleton-image` | Skeleton image placeholder |
| `.skeleton-content` | Skeleton content area |
| `.skeleton-line` | Skeleton text line |

### Mobile Map Modal
| Class | Purpose |
|-------|---------|
| `.mobile-map-modal` | Full-screen overlay |
| `.mobile-map-header` | Modal header with close button |
| `.mobile-map-close-btn` | Close button |
| `.mobile-map-content` | Map container |

---

## ### DATA_LOOKUP_FUNCTIONS ###

Used to convert IDs to display names:

```javascript
import {
  getNeighborhoodName,    // Hood ID -> name
  getBoroughName,         // Borough ID -> name
  getPropertyTypeLabel,   // Type ID -> label
  initializeLookups,      // Load lookup tables
  isInitialized           // Check if loaded
} from 'lib/dataLookups.js';

// Initialize on mount
useEffect(() => {
  const init = async () => {
    if (!isInitialized()) {
      await initializeLookups();
    }
  };
  init();
}, []);
```

---

## ### FORMATTERS ###

Located in `formatters.js`:

```javascript
// Bedroom/bathroom text with 4 conditional rules
formatBedroomBathroom(bedrooms, bathrooms, kitchenType)
// Returns: "* 2 bedrooms * 1.5 Baths * Full Kitchen"

// Bathroom display mapping
getBathroomDisplay(1.5)  // "1.5 Baths"

// Currency formatting
formatPrice(150)  // "$150/night"

// Location string
formatLocation(borough, hood, city)
// Returns: "Brooklyn, Williamsburg, New York"

// Date formatting
formatDate('2024-01-15')  // "Jan 15, 2024"

// Image URL with imgix processing
getProcessedImageUrl(url, width, height)
```

---

## ### INFORMATIONAL_TEXTS ###

Fetched from Supabase `informationaltexts` table on mount:

```javascript
async function fetchInformationalTexts() {
  const { data } = await supabase
    .from('informationaltexts')
    .select('_id, "Information Tag-Title", "Desktop copy", "Mobile copy", "Desktop+ copy", "show more available?"');

  // Transform to map keyed by tag title
  const textsMap = {};
  data.forEach(item => {
    textsMap[item['Information Tag-Title']] = {
      desktop: item['Desktop copy'],
      mobile: item['Mobile copy'],
      desktopPlus: item['Desktop+ copy'],
      showMore: item['show more available?']
    };
  });
  return textsMap;
}
```

Used in InformationalText modal:
```jsx
<InformationalText
  isOpen={isInfoModalOpen}
  onClose={handleCloseInfoModal}
  listing={selectedListing}
  triggerRef={infoModalTriggerRef}
  title="Pricing Information"
  content={informationalTexts['Price Starts']?.desktop || ''}
  expandedContent={informationalTexts['Price Starts']?.desktopPlus}
  showMoreAvailable={informationalTexts['Price Starts']?.showMore}
/>
```

---

## ### SCHEDULE_SELECTOR_MOUNTING ###

AuthAwareSearchScheduleSelector is mounted via createRoot in useEffect:

```javascript
useEffect(() => {
  const mountPointDesktop = document.getElementById('schedule-selector-mount-point');
  const mountPointMobile = document.getElementById('schedule-selector-mount-point-mobile');
  const roots = [];

  const selectorProps = {
    onSelectionChange: (days) => {
      console.log('Schedule selector changed:', days);
    },
    onError: (error) => console.error('AuthAwareSearchScheduleSelector error:', error)
  };

  if (mountPointDesktop) {
    const rootDesktop = createRoot(mountPointDesktop);
    rootDesktop.render(<AuthAwareSearchScheduleSelector {...selectorProps} />);
    roots.push(rootDesktop);
  }

  if (mountPointMobile) {
    const rootMobile = createRoot(mountPointMobile);
    rootMobile.render(<AuthAwareSearchScheduleSelector {...selectorProps} />);
    roots.push(rootMobile);
  }

  return () => {
    roots.forEach(root => root.unmount());
  };
}, []);
```

---

## ### TROUBLESHOOTING ###

| Issue | Check |
|-------|-------|
| No favorites showing | Verify user logged in, check sessionId |
| Login prompt appears | `userId` is null - auth token may be invalid |
| Empty favorites array | Check `Favorited Listings` field in user table |
| Listing not displaying | Verify has photos + coordinates |
| FavoriteButton not working | Check browser console for Edge Function errors |
| Toast not showing | Check `toast.show` state, verify 3s timeout |
| Map not loading | Check Google Maps API key in window.ENV |
| Slow loading | Photos batch fetched - check fetchPhotoUrls performance |
| Wrong price | Verify price field mapping for 5 nights default |
| Schedule selector not showing | Check mount point IDs exist in DOM |
| Host name missing | Check hostMap population from fetchHostData |

---

## ### RELATED_FILES ###

| Reference | Path |
|-----------|------|
| App CLAUDE.md | `app/CLAUDE.md` |
| Routes Config | `app/src/routes.config.js` |
| Navigation Utils | `app/src/lib/navigation.js` |
| Auth Library | `app/src/lib/auth.js` |
| Data Lookups | `app/src/lib/dataLookups.js` |
| Supabase Utils | `app/src/lib/supabaseUtils.js` |
| Supabase Client | `app/src/lib/supabase.js` |
| Edge Functions | `supabase/functions/bubble-proxy/` |
| Database Schema | `DATABASE_SCHEMA_OVERVIEW.md` |
| SearchPage (similar) | `app/src/islands/pages/SearchPage.jsx` |
| Shared FavoriteButton | `app/src/islands/shared/FavoriteButton/` |

---

**VERSION**: 2.0
**LAST_UPDATED**: 2025-12-11
**STATUS**: Updated to reflect current implementation
