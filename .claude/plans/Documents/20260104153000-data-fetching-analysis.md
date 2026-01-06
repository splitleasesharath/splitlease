# Data Fetching and Management Analysis

**Generated**: 2026-01-04
**Scope**: Frontend data fetching patterns, caching, state management, and error handling

---

## Executive Summary

The Split Lease frontend implements a well-structured data fetching architecture using:
- **Supabase client** as the primary data layer
- **Edge Functions** for secure API proxying (Bubble.io integration)
- **Module-level caching** for reference data lookups
- **Hollow Component Pattern** with logic hooks for state management
- **No fallback philosophy** - surface real errors, no synthetic data

This analysis identifies patterns that could be more functional and areas for improvement.

---

## 1. API Layer Structure

### 1.1 Core API Clients

**File**: `c:\Users\Split Lease\Documents\Split Lease\app\src\lib\supabase.js`

```javascript
// Simple Supabase client initialization
import { createClient } from '@supabase/supabase-js';
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

- Minimal, single-instance client pattern
- Environment variables for configuration
- No request interceptors or global error handling

**File**: `c:\Users\Split Lease\Documents\Split Lease\app\src\lib\bubbleAPI.js`

```javascript
// All Bubble API calls proxy through Edge Functions
export async function createListingInCode(listingName, userEmail = null) {
  const { data, error } = await supabase.functions.invoke('bubble-proxy', {
    body: { action: 'create_listing', payload: { ... } }
  });
  // Error handling inline
}
```

- **Pattern**: Action-based Edge Function invocation
- **NO FALLBACK**: If Edge Function fails, we fail
- Throws errors directly, no retry logic

### 1.2 Data Fetcher Modules

**File**: `c:\Users\Split Lease\Documents\Split Lease\app\src\lib\listingDataFetcher.js`

Key functions:
- `fetchListingComplete(listingId)` - Comprehensive listing with enrichments
- `fetchListingBasic(listingId)` - Minimal listing data
- `fetchZatPriceConfiguration()` - Global pricing config (cached)

```javascript
// Example: Module-level caching for pricing config
let zatConfigCache = null;
export async function fetchZatPriceConfiguration() {
  if (zatConfigCache) return zatConfigCache;
  // Fetch and cache...
  zatConfigCache = { ... };
  return zatConfigCache;
}
```

**File**: `c:\Users\Split Lease\Documents\Split Lease\app\src\lib\proposalDataFetcher.js`

Key functions:
- `fetchProposalsByGuest(userId)` - User's proposals
- `loadProposalDetails(proposal)` - Enriched proposal with related data
- `fetchLastProposalDefaults(userId)` - Pre-population data

### 1.3 Data Lookup Service

**File**: `c:\Users\Split Lease\Documents\Split Lease\app\src\lib\dataLookups.js`

Implements a **memory cache pattern** with eager initialization:

```javascript
const lookupCache = {
  neighborhoods: new Map(),
  boroughs: new Map(),
  propertyTypes: new Map(),
  amenities: new Map(),
  // ... more lookup tables
  initialized: false
};

export async function initializeLookups() {
  if (lookupCache.initialized) return;
  await Promise.all([
    initializeBoroughLookups(),
    initializeNeighborhoodLookups(),
    // ...
  ]);
  lookupCache.initialized = true;
}

// Synchronous lookups after initialization
export function getNeighborhoodName(neighborhoodId) {
  return lookupCache.neighborhoods.get(neighborhoodId) || neighborhoodId;
}
```

**Strengths**:
- Fast synchronous lookups after initial load
- Parallel initialization
- Cache statistics for debugging

**Weaknesses**:
- No cache invalidation strategy
- No TTL (time-to-live)
- Initialization must complete before lookups work

---

## 2. Data Hooks Pattern

### 2.1 Hollow Component Pattern

**File**: `c:\Users\Split Lease\Documents\Split Lease\app\src\islands\pages\useViewSplitLeasePageLogic.js`

```javascript
export function useViewSplitLeasePageLogic() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [listing, setListing] = useState(null)

  useEffect(() => {
    async function initialize() {
      try {
        await initializeLookups()
        const listingData = await fetchListingComplete(listingId)
        setListing(listingData)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    initialize()
  }, [])

  return { loading, error, listing, ... }
}
```

**Pattern characteristics**:
- All state management in hooks
- Components receive pre-calculated data
- Effects handle data fetching
- Error state managed locally

### 2.2 Search Page Logic Hook

**File**: `c:\Users\Split Lease\Documents\Split Lease\app\src\islands\pages\useSearchPageLogic.js`

More complex data fetching with:
- **Deduplication**: `fetchInProgressRef` prevents duplicate requests
- **URL state sync**: Filters persist to URL parameters
- **Lazy loading**: `displayedListings` subset of `allListings`
- **Batch operations**: Photo and host data fetched in batches

```javascript
const fetchInProgressRef = useRef(false)
const lastFetchParamsRef = useRef(null)

const fetchListings = useCallback(async () => {
  const fetchParams = `${selectedBorough}-${selectedNeighborhoods.join(',')}-${weekPattern}`

  if (fetchInProgressRef.current) return // Prevent duplicate
  if (lastFetchParamsRef.current === fetchParams) return // Skip same params

  fetchInProgressRef.current = true
  lastFetchParamsRef.current = fetchParams
  // ... fetch logic
}, [dependencies])
```

---

## 3. Caching Strategies

### 3.1 Module-Level Caching

| Location | Cache Type | Invalidation |
|----------|------------|--------------|
| `dataLookups.js` | In-memory Map | Manual via `refreshLookups()` |
| `listingDataFetcher.js` | Module variable | None (app restart) |
| `auth.js` | localStorage + cookies | On logout |

### 3.2 Secure Storage

**File**: `c:\Users\Split Lease\Documents\Split Lease\app\src\lib\secureStorage.js`

```javascript
// Separate keys for sensitive vs. public data
const SECURE_KEYS = {
  AUTH_TOKEN: '__sl_at__',
  SESSION_ID: '__sl_sid__',
};

const STATE_KEYS = {
  IS_AUTHENTICATED: 'sl_auth_state',
  USER_ID: 'sl_user_id',
  FIRST_NAME: 'sl_first_name',  // Optimistic UI
  AVATAR_URL: 'sl_avatar_url',  // Optimistic UI
};
```

**Optimistic UI pattern**: First name and avatar cached for instant header display.

### 3.3 React State as Cache

Logic hooks maintain local state that serves as cache:
- `allActiveListings` - All map pins (fetched once)
- `allListings` - Filtered results
- `displayedListings` - Lazy-loaded subset

---

## 4. Error Handling Patterns

### 4.1 No Fallback Philosophy

Throughout the codebase:

```javascript
// From bubbleAPI.js
if (!data.success) {
  throw new Error(data.error || 'Unknown error');
}

// From supabaseUtils.js - parseJsonArray
if (typeof value === 'string') {
  try {
    return JSON.parse(value);
  } catch (error) {
    return []; // Return empty - NO FALLBACK to hardcoded data
  }
}
```

### 4.2 Component-Level Error State

```javascript
// Standard pattern in logic hooks
const [error, setError] = useState(null)

try {
  const data = await fetchData()
  setState(data)
} catch (err) {
  setError(err.message)
} finally {
  setLoading(false)
}

// Component renders error state
if (error) return <ErrorState message={error} onRetry={fetchListings} />
```

### 4.3 Error Logging

Extensive console logging throughout:

```javascript
console.log('[Bubble API] Creating listing via Edge Function')
console.error('[Bubble API] Failed to create listing:', error)
console.warn('Neighborhood ID not found in cache:', neighborhoodId)
```

---

## 5. Opportunities for More Functional Patterns

### 5.1 Imperative Data Fetching Could Be Declarative

**Current Pattern** (imperative):

```javascript
useEffect(() => {
  async function initialize() {
    setLoading(true)
    try {
      const data = await fetchListingComplete(listingId)
      setListing(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }
  initialize()
}, [listingId])
```

**Declarative Alternative** (using a custom hook or library like SWR/React Query):

```javascript
// Custom useAsync hook pattern
function useAsync(asyncFn, deps) {
  const [state, setState] = useState({ loading: true, data: null, error: null })

  useEffect(() => {
    setState(s => ({ ...s, loading: true }))
    asyncFn()
      .then(data => setState({ loading: false, data, error: null }))
      .catch(error => setState({ loading: false, data: null, error }))
  }, deps)

  return state
}

// Usage
const { loading, data: listing, error } = useAsync(
  () => fetchListingComplete(listingId),
  [listingId]
)
```

**Files affected**:
- `c:\Users\Split Lease\Documents\Split Lease\app\src\islands\pages\useViewSplitLeasePageLogic.js`
- `c:\Users\Split Lease\Documents\Split Lease\app\src\islands\pages\useSearchPageLogic.js`
- All other `use*PageLogic.js` files

### 5.2 Side Effects Could Be Isolated

**Current Pattern**: Side effects mixed with data transformation

```javascript
// In fetchListings (useSearchPageLogic.js)
const transformedListings = data.map((listing) =>
  transformListing(listing, resolvedPhotos[listing._id], resolvedHosts[listing._id])
)

// Filter happens inline with fetch
const listingsWithCoordinates = transformedListings.filter(...)

setAllListings(listingsWithCoordinates)  // Side effect
setLoadedCount(0)  // Side effect
```

**Functional Alternative**: Separate pure transformations from effects

```javascript
// Pure transformation pipeline
const processListings = pipe(
  mapListings(transformListing),
  filterByCoordinates,
  sortByRecommended
)

// Effect isolated
useEffect(() => {
  fetchRawListings()
    .then(processListings)
    .then(setAllListings)
}, [filters])
```

### 5.3 Missing Data Transformation Layer

**Current Pattern**: Transformations scattered across fetchers

```javascript
// In listingDataFetcher.js - inline transformation
return {
  ...listingData,
  photos: sortedPhotos,
  resolvedNeighborhood,
  resolvedBorough,
  amenitiesInUnit: getAmenities(parseJsonField(listingData['Features - Amenities In-Unit'])),
  // ... more transformations
}
```

**Functional Alternative**: Dedicated processor layer

```javascript
// c:\Users\Split Lease\Documents\Split Lease\app\src\logic\processors\listing\transformListingData.js
export function transformListingData(rawListing, lookups) {
  return {
    id: rawListing._id,
    name: rawListing.Name,
    location: resolveLocation(rawListing, lookups),
    amenities: resolveAmenities(rawListing, lookups),
    photos: transformPhotos(rawListing['Features - Photos']),
    // ... consistent structure
  }
}
```

### 5.4 Cache Layer Could Be More Functional

**Current Pattern**: Mutable module-level cache

```javascript
// Mutates external state
lookupCache.neighborhoods.set(neighborhood._id, name);
```

**Functional Alternative**: Immutable cache with explicit updates

```javascript
// Using a closure or atom-like pattern
const createCache = () => {
  let state = { neighborhoods: {}, boroughs: {} }

  return {
    get: (key) => state[key],
    update: (key, value) => {
      state = { ...state, [key]: value }
    },
    clear: () => {
      state = { neighborhoods: {}, boroughs: {} }
    }
  }
}
```

### 5.5 Error Handling Could Use Result Types

**Current Pattern**: Try/catch with thrown errors

```javascript
try {
  const listing = await fetchListingComplete(id)
  return listing
} catch (err) {
  setError(err.message)
  return null
}
```

**Functional Alternative**: Result type pattern

```javascript
// Result type
const Ok = (value) => ({ ok: true, value })
const Err = (error) => ({ ok: false, error })

// Fetcher returns Result
async function fetchListingComplete(id) {
  const { data, error } = await supabase.from('listing').select('*').eq('_id', id)
  if (error) return Err(error.message)
  if (!data) return Err('Listing not found')
  return Ok(transformListing(data))
}

// Consumer pattern matching
const result = await fetchListingComplete(id)
if (result.ok) {
  setListing(result.value)
} else {
  setError(result.error)
}
```

---

## 6. Summary of Key Files

### API Layer
| File | Purpose |
|------|---------|
| `app/src/lib/supabase.js` | Supabase client initialization |
| `app/src/lib/bubbleAPI.js` | Bubble API proxy via Edge Functions |
| `app/src/lib/auth.js` | Authentication API calls |
| `app/src/lib/listingDataFetcher.js` | Listing data fetching |
| `app/src/lib/proposalDataFetcher.js` | Proposal data fetching |
| `app/src/lib/listingService.js` | Listing CRUD operations |

### Data Transformation
| File | Purpose |
|------|---------|
| `app/src/lib/dataLookups.js` | Reference data caching and lookups |
| `app/src/lib/supabaseUtils.js` | Photo/host batch fetching, JSON parsing |

### State Management (Hooks)
| File | Purpose |
|------|---------|
| `app/src/islands/pages/useViewSplitLeasePageLogic.js` | Listing detail page state |
| `app/src/islands/pages/useSearchPageLogic.js` | Search page state |
| `app/src/islands/pages/proposals/useGuestProposalsPageLogic.js` | Guest proposals state |

### Storage
| File | Purpose |
|------|---------|
| `app/src/lib/secureStorage.js` | Auth token and user state persistence |

---

## 7. Recommendations

1. **Create a useAsync hook** - Encapsulate loading/error/data pattern for reuse
2. **Add a transformation layer** - Centralize data transformations in `logic/processors/`
3. **Consider React Query or SWR** - For automatic caching, revalidation, and deduplication
4. **Implement cache invalidation** - Add TTL or event-based invalidation to `dataLookups.js`
5. **Adopt Result types** - For more explicit error handling without exceptions
6. **Extract pure functions** - Move data transformations out of hooks into testable modules

---

**Document Status**: Analysis complete, no action required unless implementation requested.
