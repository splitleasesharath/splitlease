# Favorite Listings Page - Quick Reference

**GENERATED**: 2025-12-04
**PAGE_URL**: `/favorite-listings`
**ENTRY_POINT**: `app/src/favorite-listings.jsx`

---

## ### ARCHITECTURE_OVERVIEW ###

```
favorite-listings.jsx (Entry Point)
    |
    +-- FavoriteListingsPage.jsx (Main Component)
            |
            +-- State Management
            |       +-- Auth validation via checkAuthStatus()
            |       +-- User favorites via Supabase user table
            |       +-- Listings fetch via Supabase listing table
            |       +-- Batch photo/host data loading
            |
            +-- UI Components
            |   +-- PropertyCard (inline) - Listing display
            |   +-- ListingsGrid - Grid of PropertyCards
            |   +-- GoogleMap (shared) - Map with markers
            |   +-- EmptyState - No favorites message
            |   +-- LoadingState - Skeleton loader
            |   +-- ErrorState - Error display with retry
            |   +-- LoggedInAvatar (shared) - User menu
            |   +-- AuthAwareSearchScheduleSelector (shared)
            |
            +-- Modals
                +-- ContactHostMessaging (shared) - Message host
                +-- InformationalText (shared) - Price info tooltip
                +-- Mobile Map Modal - Full-screen mobile map

            +-- API Layer
                +-- favoritesApi.js - Edge Function calls
                +-- FavoriteButton (shared) - Toggle with API sync
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
| `app/src/islands/pages/FavoriteListingsPage/FavoriteListingsPage.jsx` | Main page component (912 lines) |
| `app/src/islands/pages/FavoriteListingsPage/index.js` | Module exports |

### Sub-Components
| File | Purpose |
|------|---------|
| `app/src/islands/pages/FavoriteListingsPage/components/EmptyState.jsx` | No favorites state with CTA |
| `app/src/islands/pages/FavoriteListingsPage/components/ListingCard.jsx` | Enhanced listing card (alternative) |
| `app/src/islands/pages/FavoriteListingsPage/components/FavoriteButton.jsx` | Local favorite button (simple) |
| `app/src/islands/pages/FavoriteListingsPage/components/MapView.jsx` | Leaflet-based map (alternative) |

### Shared Components (Primary)
| File | Purpose |
|------|---------|
| `app/src/islands/shared/FavoriteButton/FavoriteButton.jsx` | Primary FavoriteButton with API integration |
| `app/src/islands/shared/GoogleMap.jsx` | Google Maps with listing markers |
| `app/src/islands/shared/LoggedInAvatar/LoggedInAvatar.jsx` | User dropdown menu |
| `app/src/islands/shared/AuthAwareSearchScheduleSelector.jsx` | Day selection filter |
| `app/src/islands/shared/ContactHostMessaging.jsx` | Host messaging modal |
| `app/src/islands/shared/InformationalText.jsx` | Info tooltip modal |

### API Layer
| File | Purpose |
|------|---------|
| `app/src/islands/pages/FavoriteListingsPage/favoritesApi.js` | Client-side API service |
| `supabase/functions/bubble-proxy/handlers/favorites.ts` | Edge Function: toggle_favorite |
| `supabase/functions/bubble-proxy/handlers/getFavorites.ts` | Edge Function: get_favorites |

### Utilities
| File | Purpose |
|------|---------|
| `app/src/islands/pages/FavoriteListingsPage/formatters.js` | Format bedrooms, price, location |
| `app/src/islands/pages/FavoriteListingsPage/types.js` | JSDoc type definitions |

### Styles
| File | Purpose |
|------|---------|
| `app/src/islands/pages/FavoriteListingsPage/FavoriteListingsPage.css` | Page styles (imports search-page.css) |
| `app/src/islands/pages/FavoriteListingsPage/components/EmptyState.css` | Empty state styles |
| `app/src/islands/pages/FavoriteListingsPage/components/ListingCard.css` | Listing card styles |
| `app/src/islands/pages/FavoriteListingsPage/components/FavoriteButton.css` | Local button styles |
| `app/src/islands/shared/FavoriteButton/FavoriteButton.css` | Shared button styles |

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

## ### DATA_FLOW ###

### 1. Authentication Check
```javascript
// Check if user is logged in
const isAuthenticated = await checkAuthStatus()
if (!isAuthenticated) {
  setError('Please log in to view your favorite listings.')
  return
}

// Get user data
const userData = await validateTokenAndFetchUser()
const sessionId = getSessionId()  // Bubble user ID
```

### 2. Fetch User's Favorite IDs
```javascript
// Get favorites array from user table
const { data: userFavorites } = await supabase
  .from('user')
  .select('"Favorited Listings"')
  .eq('_id', sessionId)
  .single()

// Parse favorites (stored as JSON array or string)
const favoritedIds = userFavorites?.['Favorited Listings'] || []
// Filter to valid Bubble IDs (format: "123x456")
favoritedIds.filter(id => /^\d+x\d+$/.test(id))
```

### 3. Fetch Listings Data
```javascript
// Batch fetch listings from Supabase
const { data: listingsData } = await supabase
  .from('listing')
  .select('*')
  .in('_id', favoritedIds)
  .eq('Active', true)

// Batch fetch photos and host data
const photoMap = await fetchPhotoUrls(photoIds)
const hostMap = await fetchHostData(hostIds)

// Transform to display format
const transformedListings = listingsData.map(listing =>
  transformListing(listing, photos, hostData)
)
```

### 4. Toggle Favorite (Optimistic UI)
```javascript
// FavoriteButton handles this automatically with immediate visual feedback
// API call happens in background via bubble-proxy Edge Function

const { data } = await supabase.functions.invoke('bubble-proxy', {
  body: {
    action: 'toggle_favorite',
    payload: {
      userId,
      listingId,
      action: newState ? 'add' : 'remove',
    },
  },
})
```

---

## ### FAVORITEBUTTON_STATES ###

The shared FavoriteButton component (`app/src/islands/shared/FavoriteButton/`) manages:

| State | Icon Style | Background |
|-------|------------|------------|
| `not favorited` | White stroke, no fill | Semi-transparent black |
| `not favorited (hover)` | Orange (#FF6B35) stroke | Semi-transparent black |
| `favorited` | Orange (#FF6B35) fill + stroke | Semi-transparent black |
| `favorited (hover)` | Darker orange (#e55a2b) | Semi-transparent black |
| `animating` | Scale animation (1 -> 1.3 -> 1) | - |
| `loading` | Reduced opacity, no pointer events | - |

### Button Sizes
| Size | Padding | Icon Size |
|------|---------|-----------|
| `small` | 4px | 16x16 |
| `medium` | 6px | 20x20 |
| `large` | 8px | 24x24 |

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

## ### EDGE_FUNCTION_API ###

### toggle_favorite Action
**Endpoint**: `POST /functions/v1/bubble-proxy`

```javascript
// Request
{
  "action": "toggle_favorite",
  "payload": {
    "userId": "123x456",
    "listingId": "789x012",
    "action": "add" | "remove"
  }
}

// Response (success)
{
  "success": true,
  "data": {
    "favorites": ["123x456", "789x012", ...]
  }
}
```

### get_favorites Action
**Endpoint**: `POST /functions/v1/bubble-proxy`

```javascript
// Request
{
  "action": "get_favorites",
  "payload": {
    "userId": "123x456",
    "page": 1,
    "perPage": 20,
    "sortBy": "price_asc" | "price_desc"
  }
}

// Response (success)
{
  "success": true,
  "data": {
    "listings": [...],
    "pagination": {
      "total": 15,
      "page": 1,
      "perPage": 20,
      "totalPages": 1
    }
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
| `Location - slightly different address` | JSON | Alternative coordinates |
| `Location - Hood` | string | Neighborhood ID |
| `Location - Borough` | string | Borough ID |
| `Features - Photos` | array/string | Photo IDs array |
| `Features - Type of Space` | string | Property type ID |
| `Features - SQFT Area` | number | Square footage |
| `Features - Qty Guests` | number | Max guests |
| `Features - Qty Bedrooms` | number | Bedrooms count |
| `Features - Qty Bathrooms` | number | Bathrooms count |
| `Starting nightly price` | number | Base nightly rate |
| `Price 2-7 nights selected` | number | Price per night count |
| `Host / Landlord` | string | Host user ID |
| `Weeks offered` | string | Schedule pattern |

---

## ### LISTING_TRANSFORMATION ###

The `transformListing()` function converts raw Supabase data to display format:

```javascript
const transformListing = (dbListing, images, hostData) => ({
  id: dbListing._id,
  title: dbListing.Name || 'Unnamed Listing',
  location: formatLocation(neighborhoodName, boroughName),
  neighborhood: neighborhoodName,
  borough: boroughName,
  coordinates: { lat, lng },  // From Location - Address or slightly different
  price: {
    starting: dbListing['Standarized Minimum Nightly Price (Filter)'],
    full: dbListing['Nightly Host Rate for 7 nights']
  },
  'Starting nightly price': ...,
  'Price 2-7 nights selected': ...,
  type: propertyType,          // From dataLookups
  squareFeet: dbListing['Features - SQFT Area'],
  maxGuests: dbListing['Features - Qty Guests'],
  bedrooms: dbListing['Features - Qty Bedrooms'],
  bathrooms: dbListing['Features - Qty Bathrooms'],
  amenities: parseAmenities(dbListing),
  host: hostData,              // { name, image, verified }
  images: images,              // Array of photo URLs
  description: "X bedroom * Y bathroom",
  weeks_offered: dbListing['Weeks offered'],
  isNew: false
})
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
  const nightsCount = 5
  const priceFieldMap = {
    2: 'Price 2 nights selected',
    3: 'Price 3 nights selected',
    // ... up to 7
  }

  // Get host rate for night count
  let nightlyHostRate = listing[priceFieldMap[nightsCount]] || 0

  // Fallback to starting price
  if (!nightlyHostRate) {
    nightlyHostRate = listing['Starting nightly price'] || 0
  }

  // Calculate with markups
  const basePrice = nightlyHostRate * nightsCount
  const fullTimeDiscount = nightsCount === 7 ? basePrice * 0.13 : 0
  const priceAfterDiscounts = basePrice - fullTimeDiscount
  const siteMarkup = priceAfterDiscounts * 0.17
  const totalPrice = basePrice - fullTimeDiscount + siteMarkup
  const pricePerNight = totalPrice / nightsCount

  return pricePerNight
}
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
| | Schedule Selector         |   | |                         |
| +---------------------------+   | |    Google Map           |
| | Listings Count            |   | |    with markers         |
| | "X favorites"             |   | |                         |
| +---------------------------+   | |                         |
| |                           |   | |                         |
| | [Loading State]           |   | |                         |
| | OR [Error State]          |   | |                         |
| | OR [Empty State]          |   | |                         |
| | OR [Listings Grid]        |   | |                         |
| |                           |   | |                         |
+-------------------------------------------------------------+
```

---

## ### PROPERTYCARD_STRUCTURE ###

```
+---------------------------------------------------+
| [Image Carousel]                                   |
| [< prev] [next >]    [FavoriteButton]             |
| [1 / 5]              [New Listing badge]          |
+---------------------------------------------------+
| [Location icon] Neighborhood, Borough              |
| Listing Title (clickable -> new tab)               |
| Property Type (SQFT) - X guests max                |
| [Amenity icons] +N more                            |
| Bedroom * Bathroom                                 |
+---------------------------------------------------+
| [Host Avatar] Host Name [Verified]   Starting at $X|
|               [Message]              $Y/night      |
|                                      Message SL    |
+---------------------------------------------------+
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
  setToast({ show: true, message, type })
  setTimeout(() => {
    setToast({ show: false, message: '', type: 'success' })
  }, 3000)  // Auto-dismiss after 3 seconds
}
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
- Heart icon (64x64, gray stroke)
- Message text (gray, centered)
- Purple CTA button (#5b21b6)

---

## ### MOBILE_RESPONSIVENESS ###

### Breakpoints
| Breakpoint | Changes |
|------------|---------|
| `< 768px` | Mobile filter bar visible, toast at bottom, hide hamburger menu |
| `> 768px` | Two-column layout, toast at top-right |

### Mobile Map Modal
Full-screen overlay triggered by "Map" button:
```jsx
<div className="mobile-map-modal">
  <div className="mobile-map-header">
    <button className="mobile-map-close-btn"></button>
    <h2>Map View</h2>
  </div>
  <div className="mobile-map-content">
    <GoogleMap ... />
  </div>
</div>
```

---

## ### KEY_IMPORTS ###

```javascript
// Page component
import FavoriteListingsPage from './islands/pages/FavoriteListingsPage'

// Shared components
import GoogleMap from '../../shared/GoogleMap.jsx'
import FavoriteButton from '../../shared/FavoriteButton/FavoriteButton.jsx'
import LoggedInAvatar from '../../shared/LoggedInAvatar/LoggedInAvatar.jsx'
import AuthAwareSearchScheduleSelector from '../../shared/AuthAwareSearchScheduleSelector.jsx'
import ContactHostMessaging from '../../shared/ContactHostMessaging.jsx'
import InformationalText from '../../shared/InformationalText.jsx'

// Local components
import EmptyState from './components/EmptyState'

// API
import { getFavoritedListings, removeFromFavorites, addToFavorites } from './favoritesApi'

// Auth
import { checkAuthStatus, getSessionId, validateTokenAndFetchUser, logoutUser } from '../../../lib/auth'

// Data lookups
import { getNeighborhoodName, getBoroughName, getPropertyTypeLabel, initializeLookups } from '../../../lib/dataLookups.js'

// Supabase
import { supabase } from '../../../lib/supabase.js'

// Navigation
import { goToFavorites } from 'lib/navigation.js'
```

---

## ### CSS_CLASSES ###

### Page Container
| Class | Purpose |
|-------|---------|
| `.favorites-page` | Main page wrapper (100vh, 100vw) |
| `.two-column-layout` | Flex container for columns |
| `.listings-column` | Left column (45%) |
| `.map-column` | Right column (55%) |

### Header Elements
| Class | Purpose |
|-------|---------|
| `.map-header` | Logo + auth actions row |
| `.map-logo` | Logo link with icon + text |
| `.map-header-actions` | Right-side actions container |
| `.favorites-link.active` | Filled orange heart icon |
| `.favorites-badge` | Count badge overlay |
| `.hamburger-menu` | Guest menu button |

### Listing Cards
| Class | Purpose |
|-------|---------|
| `.listings-container` | Grid container |
| `.listing-card` | Individual card (link element) |
| `.listing-images` | Photo carousel container |
| `.image-nav` | Prev/next buttons |
| `.image-counter` | "1 / 5" indicator |
| `.listing-content` | Card details section |
| `.listing-location` | Location row with icon |
| `.listing-title` | Listing name |
| `.listing-type` | Property type + guests |
| `.listing-amenities` | Amenity icons row |
| `.listing-footer` | Host + pricing section |
| `.host-info` | Host avatar + name |
| `.pricing-info` | Price display |

### Toast Notifications
| Class | Purpose |
|-------|---------|
| `.toast` | Base toast styles |
| `.toast.show` | Visible state (transform) |
| `.toast-success` | Green left border |
| `.toast-info` | Blue left border |
| `.toast-error` | Red left border |

### Empty/Error States
| Class | Purpose |
|-------|---------|
| `.empty-state` | Centered flex container |
| `.empty-state-content` | Inner content wrapper |
| `.empty-state-icon` | Heart icon (64px) |
| `.empty-state-message` | Gray text message |
| `.empty-state-cta` | Purple action button |
| `.error-message` | Error display container |
| `.retry-btn` | Retry action button |

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
} from 'lib/dataLookups.js'

// Initialize on mount
useEffect(() => {
  if (!isInitialized()) {
    await initializeLookups()
  }
}, [])
```

---

## ### FORMATTERS ###

Located in `formatters.js`:

```javascript
// Bedroom/bathroom text with 4 conditional rules
formatBedroomBathroom(bedrooms, bathrooms, kitchenType)
// Returns: "* 2 bedrooms * 1.5 Baths * Full Kitchen"

// Currency formatting
formatPrice(150)  // "$150/night"

// Location string
formatLocation('Brooklyn', 'Williamsburg', 'New York')
// Returns: "Brooklyn, Williamsburg, New York"

// Date formatting
formatDate('2024-01-15')  // "Jan 15, 2024"

// Image URL with imgix processing
getProcessedImageUrl(url, 400, 300)
```

---

## ### TROUBLESHOOTING ###

| Issue | Check |
|-------|-------|
| No favorites showing | Verify user logged in, check sessionId |
| Login prompt appears | `userId` is null - auth token may be invalid |
| Empty favorites array | Check `Favorited Listings` field in user table |
| Listing not displaying | Verify `Active = true` and has photos + coordinates |
| FavoriteButton not working | Check browser console for Edge Function errors |
| Toast not showing | Check `toast.show` state, verify 3s timeout |
| Map not loading | Check Google Maps API key in window.ENV |
| Slow loading | Photos batch fetched - check fetchPhotoUrls performance |
| Wrong price | Verify price field mapping for night count |

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
| Edge Functions | `supabase/functions/bubble-proxy/` |
| Database Schema | `DATABASE_SCHEMA_OVERVIEW.md` |
| SearchPage (similar) | `app/src/islands/pages/SearchPage.jsx` |

---

**VERSION**: 1.0
**LAST_UPDATED**: 2025-12-04
**STATUS**: Comprehensive after initial documentation
