# View Split Lease Page - Routing Documentation

## Overview

The `view-split-lease` page uses a **dynamic routing architecture** powered by Cloudflare Pages Functions to handle unique listing IDs in the URL path. This document explains how the routing is configured and how the dynamic ID is extracted and used to retrieve listing information.

---

## Architecture Components

### 1. Cloudflare Pages Function (Server-Side)
**Location**: `app/functions/view-split-lease/[id].js`

This is a Cloudflare Pages Function that intercepts all requests matching the pattern `/view-split-lease/*` and serves the HTML file while preserving the URL structure.

```javascript
// app/functions/view-split-lease/[id].js
export async function onRequest(context) {
  const { request, env, params } = context;

  // Get the listing ID from the URL parameter
  const listingId = params.id;

  // Fetch the view-split-lease.html file from the static assets
  const url = new URL(request.url);
  url.pathname = '/view-split-lease.html';

  // Forward the request to get the HTML file
  const response = await env.ASSETS.fetch(url);

  // Clone the response so we can modify headers
  const newResponse = new Response(response.body, response);

  // Set cache headers for better performance
  newResponse.headers.set('Cache-Control', 'public, max-age=3600');

  return newResponse;
}
```

**Key Points**:
- The `[id]` in the folder name creates a dynamic route parameter
- Cloudflare automatically captures anything after `/view-split-lease/` as `params.id`
- The function serves `view-split-lease.html` for **all** matching routes
- The original URL (with the ID) is preserved for client-side JavaScript to parse

---

### 2. Static HTML Entry Point
**Location**: `app/public/view-split-lease.html`

This is the HTML file served to the browser. It includes:
- Configuration loading (`/src/lib/config.js`)
- Google Maps API initialization
- React mount point (`#view-split-lease-page`)
- Entry script loading (`/src/view-split-lease.jsx`)

**Key Points**:
- The same HTML file is served regardless of which listing ID is in the URL
- The URL remains unchanged (e.g., `/view-split-lease/12x34`)
- Client-side JavaScript is responsible for parsing the ID from the URL

---

### 3. React Entry Point
**Location**: `app/src/view-split-lease.jsx`

Simple entry point that mounts the main React component:

```javascript
import { createRoot } from 'react-dom/client';
import ViewSplitLeasePage from './islands/pages/ViewSplitLeasePage.jsx';

createRoot(document.getElementById('view-split-lease-page')).render(<ViewSplitLeasePage />);
```

---

### 4. Main Page Component
**Location**: `app/src/islands/pages/ViewSplitLeasePage.jsx`

The React component that renders the listing details page. On initialization, it:
1. Calls `getListingIdFromUrl()` to extract the listing ID from the URL
2. Calls `fetchListingComplete(listingId)` to retrieve listing data from Supabase
3. Renders the listing information with booking widgets

**Initialization Flow** (ViewSplitLeasePage.jsx:197-248):
```javascript
useEffect(() => {
  async function initialize() {
    try {
      // Initialize lookup caches
      await initializeLookups();

      // Fetch ZAT price configuration
      const zatConfigData = await fetchZatPriceConfiguration();
      setZatConfig(zatConfigData);

      // Get listing ID from URL
      const listingId = getListingIdFromUrl();
      if (!listingId) {
        throw new Error('No listing ID provided in URL');
      }

      // Fetch complete listing data
      const listingData = await fetchListingComplete(listingId);
      setListing(listingData);
      setLoading(false);

    } catch (err) {
      console.error('Error initializing page:', err);
      setError(err.message);
      setLoading(false);
    }
  }

  initialize();
}, []);
```

---

## Dynamic ID Extraction

### URL Parsing Function
**Location**: `app/src/lib/listingDataFetcher.js:344-374`

The `getListingIdFromUrl()` function extracts the listing ID from the URL using a **three-tier fallback strategy**:

```javascript
export function getListingIdFromUrl() {
  // 1. Check query string: ?id=listingId
  const urlParams = new URLSearchParams(window.location.search);
  const idFromQuery = urlParams.get('id');
  if (idFromQuery) return idFromQuery;

  // 2. Parse pathname for segment after 'view-split-lease'
  const pathSegments = window.location.pathname.split('/').filter(segment => segment);
  const viewSegmentIndex = pathSegments.findIndex(segment =>
    segment === 'view-split-lease' ||
    segment === 'view-split-lease.html' ||
    segment === 'view-split-lease-1'
  );

  if (viewSegmentIndex !== -1 && pathSegments[viewSegmentIndex + 1]) {
    const nextSegment = pathSegments[viewSegmentIndex + 1];
    if (!nextSegment.includes('.')) {
      return nextSegment;
    }
  }

  // 3. Fallback: Check if first segment matches listing ID pattern
  if (pathSegments.length > 0) {
    const firstSegment = pathSegments[0];
    if (/^\d+x\d+$/.test(firstSegment)) {
      return firstSegment;
    }
  }

  return null;
}
```

### Extraction Strategy

**Tier 1: Query String Parameter**
- Pattern: `/view-split-lease?id=12x34`
- Extraction: `URLSearchParams.get('id')`
- Priority: Highest

**Tier 2: Path Segment After view-split-lease**
- Pattern: `/view-split-lease/12x34`
- Extraction: Find `view-split-lease` in path segments, return next segment
- Validation: Next segment must not contain `.` (to avoid matching filenames)
- Priority: Medium

**Tier 3: First Segment Pattern Match**
- Pattern: `/12x34` (if somehow routed directly)
- Extraction: Test first path segment against listing ID pattern `^\d+x\d+$`
- Priority: Lowest (fallback)

---

## Supported URL Formats

The routing system supports multiple URL formats for flexibility:

| URL Format | Extraction Method | Example |
|------------|-------------------|---------|
| `/view-split-lease/12x34` | Path segment (Tier 2) | Main production format |
| `/view-split-lease.html/12x34` | Path segment (Tier 2) | Alternative format |
| `/view-split-lease?id=12x34` | Query string (Tier 1) | Legacy/fallback format |
| `/view-split-lease-1/12x34` | Path segment (Tier 2) | Alternative naming |

---

## Data Fetching

### Listing Data Retrieval
**Location**: `app/src/lib/listingDataFetcher.js:59-265`

Once the listing ID is extracted, `fetchListingComplete(listingId)` performs a comprehensive data fetch from Supabase:

```javascript
export async function fetchListingComplete(listingId) {
  // 1. Fetch main listing data from 'listing' table
  const { data: listingData, error: listingError } = await supabase
    .from('listing')
    .select(`/* extensive field list */`)
    .eq('_id', listingId)
    .single();

  // 2. Fetch related photos
  const { data: photos } = await supabase
    .from('listing_photos')
    .select('*')
    .eq('_listing', listingId)
    .order('_Order');

  // 3. Fetch host information
  const { data: hostData } = await supabase
    .from('_User')
    .select('*')
    .eq('_id', listingData._Host)
    .single();

  // 4. Parse coordinates
  const coordinates = parseCoordinates(listingData['Map HTML Web']);

  // 5. Enrich with lookup data
  const enrichedListing = {
    ...listingData,
    photos: photos || [],
    host: hostData,
    coordinates,
    resolvedNeighborhood: getNeighborhoodName(listingData['Location - Hood']),
    resolvedBorough: getBoroughName(listingData['Location - Borough']),
    resolvedTypeOfSpace: getPropertyTypeLabel(listingData['Features - Type of Space']),
    amenitiesInUnit: getAmenities(listingData['Features - Amenities In-Unit']),
    safetyFeatures: getSafetyFeatures(listingData['Features - Safety']),
    houseRules: getHouseRules(listingData['Features - House Rules']),
    parkingOption: getParkingOption(listingData['Features - Parking type']),
    storageOption: getStorageOption(listingData['Features - Secure Storage Option']),
    cancellationPolicy: getCancellationPolicy(listingData._Cancellation)
  };

  return enrichedListing;
}
```

**Key Operations**:
1. Fetch listing record using `_id` field
2. Join with photos table
3. Join with host user record
4. Parse geographical coordinates
5. Resolve lookup IDs to human-readable values (neighborhoods, amenities, etc.)

---

## Error Handling

### Missing Listing ID
If no listing ID is found in the URL:
```javascript
if (!listingId) {
  throw new Error('No listing ID provided in URL');
}
```
Result: Error state shown with message "Property Not Found"

### Invalid Listing ID
If the listing ID doesn't exist in the database:
- Supabase query returns `null`
- Error state shown with message from error handler

### Error UI
**Location**: `ViewSplitLeasePage.jsx:65-108`

```javascript
function ErrorState({ message }) {
  return (
    <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
      <div style={{ fontSize: '4rem' }}>⚠️</div>
      <h2>Property Not Found</h2>
      <p>{message || 'The property you are looking for does not exist or has been removed.'}</p>
      <a href="/search.html">Browse All Listings</a>
    </div>
  );
}
```

---

## Deployment Configuration

### Cloudflare Pages Setup
The dynamic routing works because of Cloudflare Pages' automatic function detection:

1. **Directory Structure**: `functions/view-split-lease/[id].js`
   - `[id]` denotes a dynamic segment
   - Cloudflare automatically creates route `/view-split-lease/:id`

2. **Function Priority**:
   - Functions take precedence over static files
   - Request hits function first, which serves HTML

3. **Asset Serving**:
   - `env.ASSETS.fetch(url)` accesses static assets
   - Bypasses function routing for internal fetch

### Build Process
**vite.config.js** handles the bundling:
```javascript
build: {
  rollupOptions: {
    input: {
      // ... other entries
      'view-split-lease': resolve(__dirname, 'public/view-split-lease.html'),
    }
  }
}
```

---

## Flow Diagram

```
1. User navigates to:
   /view-split-lease/12x34

2. Cloudflare Pages receives request
   → Matches function pattern: /view-split-lease/[id]
   → Captures params.id = "12x34"

3. Function executes:
   → Fetches /view-split-lease.html from assets
   → Returns HTML with preserved URL (/view-split-lease/12x34)

4. Browser receives HTML:
   → Loads view-split-lease.jsx
   → Mounts ViewSplitLeasePage component

5. React component initializes:
   → Calls getListingIdFromUrl()
   → Parses window.location.pathname
   → Extracts "12x34"

6. Data fetching:
   → Calls fetchListingComplete("12x34")
   → Queries Supabase for listing with _id = "12x34"
   → Enriches data with joins and lookups
   → Renders listing details
```

---

## Key Benefits of This Architecture

1. **SEO-Friendly URLs**: Clean paths like `/view-split-lease/12x34` instead of query strings
2. **Shareable Links**: Direct linking to specific listings
3. **Client-Side Routing**: No page reload when navigating between listings
4. **Caching**: Static HTML cached by Cloudflare CDN
5. **Flexibility**: Multiple URL formats supported for backwards compatibility
6. **Type Safety**: Listing ID validation happens in multiple layers

---

## Related Files

| File | Purpose |
|------|---------|
| `app/functions/view-split-lease/[id].js` | Cloudflare Pages Function for dynamic routing |
| `app/public/view-split-lease.html` | Static HTML entry point |
| `app/src/view-split-lease.jsx` | React entry point |
| `app/src/islands/pages/ViewSplitLeasePage.jsx` | Main page component (1983 lines) |
| `app/src/lib/listingDataFetcher.js` | URL parsing and data fetching utilities |
| `app/src/lib/dataLookups.js` | Lookup resolution (neighborhoods, amenities, etc.) |

---

## Testing the Routing

### Test Cases

**1. Primary Format**
```
URL: /view-split-lease/12x34
Expected: Listing 12x34 loads successfully
```

**2. Query String Format**
```
URL: /view-split-lease?id=12x34
Expected: Listing 12x34 loads successfully
```

**3. Invalid ID**
```
URL: /view-split-lease/999x999
Expected: "Property Not Found" error displayed
```

**4. Missing ID**
```
URL: /view-split-lease
Expected: "No listing ID provided in URL" error displayed
```

---

## Future Improvements

1. **ID Validation**: Add server-side validation in Cloudflare Function
2. **Redirect Handling**: Redirect legacy formats to primary format
3. **404 Optimization**: Custom 404 page for invalid listings
4. **Metadata Injection**: Dynamic meta tags for better SEO (title, description, OG tags)
5. **Error Telemetry**: Track invalid ID requests for monitoring
