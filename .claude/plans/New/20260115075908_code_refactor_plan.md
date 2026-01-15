# Code Refactoring Plan - app

**Date:** 2026-01-15
**Audit Type:** General (Performance, Maintainability, Duplication, Anti-patterns)
**Total Chunks:** 25
**Priority Order:** High-impact quick wins → Toast system → Code deduplication → Component refactoring → Performance → Maintainability

---

## PAGE GROUP: GLOBAL (All Pages)

> These chunks affect ALL pages in the application due to shared utilities or global components.

~~~~~

### CHUNK 1: Delete Duplicate Modal Files
**File:** `app/src/islands/modals/`
**Line:** N/A (entire files)
**Issue:** Duplicate files with `(1).jsx` and `(1) (1).jsx` suffixes exist, creating confusion and potential import errors.
**Affected Pages:** GLOBAL (All Pages)

**Current Code:**
```
app/src/islands/modals/
├── EditPhoneNumberModal.jsx
├── EditPhoneNumberModal (1).jsx        ← DELETE
├── EditPhoneNumberModal (1) (1).jsx    ← DELETE
├── NotificationSettingsModal.jsx
└── NotificationSettingsModal (1).jsx   ← DELETE
```

**Refactored Code:**
```
app/src/islands/modals/
├── EditPhoneNumberModal.jsx
└── NotificationSettingsModal.jsx
```

**Testing:**
- [ ] Run `bun run build` to ensure no broken imports
- [ ] Search codebase for imports of deleted files: `grep -r "EditPhoneNumberModal (1)" app/src/`
- [ ] Verify modals still work on /account-profile page

~~~~~

### CHUNK 2: Delete Deprecated ViewSplitLeasePage-old.jsx
**File:** `app/src/islands/pages/ViewSplitLeasePage-old.jsx`
**Line:** N/A (entire file)
**Issue:** Deprecated file left in codebase, adding confusion and dead code.
**Affected Pages:** GLOBAL (dead code cleanup)

**Current Code:**
```javascript
// File exists: app/src/islands/pages/ViewSplitLeasePage-old.jsx
// 1500+ lines of outdated code
```

**Refactored Code:**
```javascript
// DELETE entire file
// Verify no imports exist first:
// grep -r "ViewSplitLeasePage-old" app/src/
```

**Testing:**
- [ ] Search for imports: `grep -r "ViewSplitLeasePage-old" app/src/`
- [ ] Run `bun run build` to confirm no broken references
- [ ] Verify /view-split-lease/:id still works

~~~~~

### CHUNK 3: Add Conditional Logging Utility
**File:** `app/src/lib/logger.js` (NEW FILE)
**Line:** N/A
**Issue:** 50+ files have console.log statements that run in production, impacting performance and exposing debug info.
**Affected Pages:** GLOBAL (All Pages)

**Current Code:**
```javascript
// Scattered across 50+ files:
console.log('🗺️ GoogleMap: Component rendered with props:', {
  listingsCount: listings.length,
  filteredListingsCount: filteredListings.length,
});

console.log('Initializing data lookups...');

console.log('🔍 fetchDetailedListingData: Starting fetch for listing:', listingId);
```

**Refactored Code:**
```javascript
// NEW FILE: app/src/lib/logger.js
const IS_DEV = import.meta.env.DEV;

/**
 * Conditional logger that only outputs in development mode
 * @example
 * logger.debug('🗺️ GoogleMap:', { props });
 * logger.info('Data loaded');
 * logger.warn('Deprecated usage'); // Always shows
 * logger.error('Failed to fetch'); // Always shows
 */
export const logger = {
  debug: (...args) => IS_DEV && console.log(...args),
  info: (...args) => IS_DEV && console.info(...args),
  warn: (...args) => console.warn(...args),
  error: (...args) => console.error(...args),

  // Grouped logging for complex objects
  group: (label, fn) => {
    if (IS_DEV) {
      console.group(label);
      fn();
      console.groupEnd();
    }
  },
};

export default logger;
```

**Testing:**
- [ ] Create file and import in one component (e.g., GoogleMap.jsx)
- [ ] Verify logs appear in dev mode (`bun run dev`)
- [ ] Verify logs are suppressed in production build (`bun run build && bun run preview`)

~~~~~

### CHUNK 4: Centralize Session Access with Retry
**File:** `app/src/lib/auth.js`
**Line:** After line 166
**Issue:** Session access with retry logic is duplicated in 3+ files (Header.jsx, useGuestProposalsPageLogic.js, auth.js).
**Affected Pages:** GLOBAL (All authenticated pages)

**Current Code:**
```javascript
// Repeated in Header.jsx (lines 62-90), useGuestProposalsPageLogic.js (lines 117-151)
const { data } = await supabase.auth.getSession();
session = data?.session;

if (!session) {
  await new Promise(resolve => setTimeout(resolve, 200));
  const { data: retryData } = await supabase.auth.getSession();
  session = retryData?.session;
}
```

**Refactored Code:**
```javascript
// ADD to app/src/lib/auth.js after line 166

/**
 * Get Supabase session with automatic retry for race conditions
 * @param {number} retryDelayMs - Delay before retry (default: 200ms)
 * @returns {Promise<{session: Session|null, error: Error|null}>}
 */
export async function getSessionWithRetry(retryDelayMs = 200) {
  let { data: { session }, error } = await supabase.auth.getSession();

  // Retry once if no session and no error (race condition)
  if (!session && !error) {
    await new Promise(resolve => setTimeout(resolve, retryDelayMs));
    const retryResult = await supabase.auth.getSession();
    session = retryResult.data?.session;
    error = retryResult.error;
  }

  return { session, error };
}
```

**Testing:**
- [ ] Add function to auth.js
- [ ] Update Header.jsx to use `getSessionWithRetry()`
- [ ] Update useGuestProposalsPageLogic.js to use `getSessionWithRetry()`
- [ ] Test login flow on /guest-proposals
- [ ] Test header auth state on page refresh

~~~~~

### CHUNK 5: Create Standardized API Error Handler
**File:** `app/src/lib/apiErrorHandler.js` (NEW FILE)
**Line:** N/A
**Issue:** Inconsistent error handling patterns across the codebase (throw, alert, setState, console.error used interchangeably).
**Affected Pages:** GLOBAL (All pages with API calls)

**Current Code:**
```javascript
// Pattern 1 (VirtualMeetingModal.jsx):
alert('Failed to submit request');
return;

// Pattern 2 (userProposalQueries.js):
if (error) throw error;

// Pattern 3 (useGuestProposalsPageLogic.js):
setError(err.message || 'Failed to load');
console.error('Error:', err);
```

**Refactored Code:**
```javascript
// NEW FILE: app/src/lib/apiErrorHandler.js

/**
 * Custom error class for API operations
 */
export class ApiError extends Error {
  constructor(message, code = null, details = {}) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * User-friendly error messages by error code
 */
const ERROR_MESSAGES = {
  '23503': 'This operation references data that no longer exists.',
  '23505': 'This record already exists.',
  'PGRST116': 'Record not found.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/wrong-password': 'Incorrect password.',
  'network': 'Network error. Please check your connection.',
  'default': 'Something went wrong. Please try again.',
};

/**
 * Get user-friendly message from error
 */
export function getUserFriendlyMessage(error) {
  if (error?.code && ERROR_MESSAGES[error.code]) {
    return ERROR_MESSAGES[error.code];
  }
  if (error?.message?.includes('fetch')) {
    return ERROR_MESSAGES.network;
  }
  return error?.message || ERROR_MESSAGES.default;
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error) {
  const retryableCodes = ['network', 'ETIMEDOUT', 'ECONNRESET'];
  return retryableCodes.some(code =>
    error?.code === code || error?.message?.includes(code)
  );
}

/**
 * Handle API errors consistently
 * @param {Error} error - The error object
 * @param {string} context - Where the error occurred (for logging)
 * @returns {{userMessage: string, shouldRetry: boolean, logDetails: object}}
 */
export function handleApiError(error, context) {
  const userMessage = getUserFriendlyMessage(error);
  const shouldRetry = isRetryableError(error);
  const logDetails = {
    context,
    message: error?.message,
    code: error?.code,
    details: error?.details,
    timestamp: new Date().toISOString(),
  };

  // Always log errors (logger will handle dev vs prod)
  if (import.meta.env.DEV) {
    console.error(`[API Error: ${context}]`, logDetails);
  }

  return { userMessage, shouldRetry, logDetails };
}

export default { ApiError, handleApiError, getUserFriendlyMessage, isRetryableError };
```

**Testing:**
- [ ] Create the new file
- [ ] Update one modal (VirtualMeetingModal.jsx) to use the new pattern
- [ ] Verify error messages display correctly
- [ ] Test with network disconnected to verify retry detection

~~~~~

## PAGE GROUP: /search (Chunks: 6, 7, 8, 9, 10)

~~~~~

### CHUNK 6: Extract Photo ID Collection Utility
**File:** `app/src/lib/supabaseUtils.js`
**Line:** End of file (add new function)
**Issue:** Photo ID extraction logic is duplicated in 4 files with identical 15-line patterns.
**Affected Pages:** /search, /, /favorite-listings

**Current Code:**
```javascript
// useSearchPageLogic.js lines 221-240 (also in SearchPageTest.jsx, HomePage.jsx, FavoriteListingsPage.jsx)
const allPhotoIds = new Set()
data.forEach((listing) => {
  const photosField = listing['Features - Photos']
  if (Array.isArray(photosField)) {
    photosField.forEach((id) => allPhotoIds.add(id))
  } else if (typeof photosField === 'string') {
    try {
      const parsed = JSON.parse(photosField)
      if (Array.isArray(parsed)) {
        parsed.forEach((id) => allPhotoIds.add(id))
      }
    } catch (e) {
      // Ignore parse errors
    }
  }
})
```

**Refactored Code:**
```javascript
// ADD to app/src/lib/supabaseUtils.js

/**
 * Extract all unique photo IDs from an array of listings
 * Handles both array and JSON string formats for the photos field
 *
 * @param {Array<Object>} listings - Array of listing objects
 * @param {string} photoField - Field name containing photos (default: 'Features - Photos')
 * @returns {Set<string>} Set of unique photo IDs
 *
 * @example
 * const photoIds = extractPhotoIdsFromListings(listings);
 * const photoUrls = await fetchPhotoUrls(Array.from(photoIds));
 */
export function extractPhotoIdsFromListings(listings, photoField = 'Features - Photos') {
  const photoIds = new Set();

  if (!Array.isArray(listings)) return photoIds;

  listings.forEach((listing) => {
    const photosValue = listing[photoField];

    // Handle array format
    if (Array.isArray(photosValue)) {
      photosValue.forEach((id) => {
        if (typeof id === 'string' && id.trim()) {
          photoIds.add(id);
        }
      });
      return;
    }

    // Handle JSON string format
    if (typeof photosValue === 'string') {
      const parsed = parseJsonArray(photosValue);
      parsed.forEach((id) => {
        if (typeof id === 'string' && id.trim()) {
          photoIds.add(id);
        }
      });
    }
  });

  return photoIds;
}
```

**Testing:**
- [ ] Add function to supabaseUtils.js
- [ ] Update useSearchPageLogic.js to use `extractPhotoIdsFromListings(data)`
- [ ] Update HomePage.jsx to use the utility
- [ ] Update FavoriteListingsPage.jsx to use the utility
- [ ] Verify photos still load on /search page
- [ ] Verify photos still load on home page

~~~~~

### CHUNK 7: Extract Host Data Fetching Utilities
**File:** `app/src/lib/supabaseUtils.js`
**Line:** End of file (add new functions)
**Issue:** Host ID extraction and mapping logic duplicated in 3 files.
**Affected Pages:** /search, /favorite-listings

**Current Code:**
```javascript
// useSearchPageLogic.js lines 256-270 (also in SearchPageTest.jsx, FavoriteListingsPage.jsx)
const hostIds = new Set()
data.forEach((listing) => {
  if (listing['Host User']) {
    hostIds.add(listing['Host User'])
  }
})

const hostMap = await fetchHostData(Array.from(hostIds))

const resolvedHosts = {}
data.forEach((listing) => {
  const hostId = listing['Host User']
  resolvedHosts[listing._id] = hostMap[hostId] || null
})
```

**Refactored Code:**
```javascript
// ADD to app/src/lib/supabaseUtils.js

/**
 * Extract unique host IDs from an array of listings
 * @param {Array<Object>} listings - Array of listing objects
 * @param {string} hostField - Field name containing host ID (default: 'Host User')
 * @returns {Array<string>} Array of unique host IDs
 */
export function extractHostIdsFromListings(listings, hostField = 'Host User') {
  const hostIds = new Set();

  if (!Array.isArray(listings)) return [];

  listings.forEach((listing) => {
    const hostId = listing[hostField];
    if (hostId && typeof hostId === 'string') {
      hostIds.add(hostId);
    }
  });

  return Array.from(hostIds);
}

/**
 * Map host data to listings by listing ID
 * @param {Array<Object>} listings - Array of listing objects
 * @param {Object} hostMap - Map of hostId -> host data
 * @param {string} hostField - Field name containing host ID (default: 'Host User')
 * @returns {Object} Map of listingId -> host data
 */
export function mapHostsToListings(listings, hostMap, hostField = 'Host User') {
  const result = {};

  if (!Array.isArray(listings)) return result;

  listings.forEach((listing) => {
    const hostId = listing[hostField];
    result[listing._id] = hostMap[hostId] || null;
  });

  return result;
}
```

**Testing:**
- [ ] Add functions to supabaseUtils.js
- [ ] Update useSearchPageLogic.js:
  ```javascript
  const hostIds = extractHostIdsFromListings(data);
  const hostMap = await fetchHostData(hostIds);
  const resolvedHosts = mapHostsToListings(data, hostMap);
  ```
- [ ] Update FavoriteListingsPage.jsx similarly
- [ ] Verify host avatars display on /search
- [ ] Verify host avatars display on /favorite-listings

~~~~~

### CHUNK 8: Fix Default Parameter Creating New Set on Every Render
**File:** `app/src/islands/shared/GoogleMap.jsx`
**Line:** 117
**Issue:** Default parameter `favoritedListingIds = new Set()` creates a new Set on every render, causing unnecessary re-renders.
**Affected Pages:** /search, /favorite-listings

**Current Code:**
```javascript
// GoogleMap.jsx line 117
const GoogleMap = forwardRef(({
  listings = [],
  filteredListings = [],
  selectedListing = null,
  favoritedListingIds = new Set(), // ❌ Creates new Set every render
  onListingSelect,
  onListingHover,
  onListingUnhover,
  onFavoriteToggle,
  isVisible = true,
}, ref) => {
```

**Refactored Code:**
```javascript
// GoogleMap.jsx - Add at top of file (after imports, before component)
const EMPTY_ARRAY = [];
const EMPTY_SET = new Set();
Object.freeze(EMPTY_SET); // Prevent accidental mutations

// Line 117 - Update component definition
const GoogleMap = forwardRef(({
  listings = EMPTY_ARRAY,
  filteredListings = EMPTY_ARRAY,
  selectedListing = null,
  favoritedListingIds = EMPTY_SET, // ✅ Stable reference
  onListingSelect,
  onListingHover,
  onListingUnhover,
  onFavoriteToggle,
  isVisible = true,
}, ref) => {
```

**Testing:**
- [ ] Update GoogleMap.jsx with stable defaults
- [ ] Open /search page with React DevTools
- [ ] Verify GoogleMap doesn't re-render when parent re-renders (if favoritedListingIds not passed)
- [ ] Verify favorites still work correctly

~~~~~

### CHUNK 9: Add Missing useCallback to GoogleMap fetchDetailedListingData
**File:** `app/src/islands/shared/GoogleMap.jsx`
**Line:** 243-300
**Issue:** `fetchDetailedListingData` function is recreated on every render, potentially causing unnecessary API calls.
**Affected Pages:** /search, /favorite-listings

**Current Code:**
```javascript
// GoogleMap.jsx lines 243-250
const fetchDetailedListingData = async (listingId) => {
  console.log('🔍 fetchDetailedListingData: Starting fetch for listing:', listingId);
  setIsLoadingListingDetails(true);
  setListingDetailsError(null);

  try {
    // ... fetch logic
  }
};
```

**Refactored Code:**
```javascript
// GoogleMap.jsx lines 243-250 - Wrap with useCallback
const fetchDetailedListingData = useCallback(async (listingId) => {
  // Use logger instead of console.log (after CHUNK 3)
  // logger.debug('🔍 fetchDetailedListingData: Starting fetch for listing:', listingId);
  console.log('🔍 fetchDetailedListingData: Starting fetch for listing:', listingId);
  setIsLoadingListingDetails(true);
  setListingDetailsError(null);

  try {
    // ... existing fetch logic unchanged
  } catch (err) {
    // ... existing error handling unchanged
  } finally {
    setIsLoadingListingDetails(false);
  }
}, []); // Empty deps - function doesn't depend on any props/state
```

**Testing:**
- [ ] Add useCallback wrapper to fetchDetailedListingData
- [ ] Verify useCallback is imported at top of file
- [ ] Click on map markers on /search page
- [ ] Verify listing details popup still loads correctly

~~~~~

### CHUNK 10: Create useDataLookups Hook
**File:** `app/src/hooks/useDataLookups.js` (NEW FILE)
**Line:** N/A
**Issue:** Data lookup initialization pattern is duplicated in 4+ files with identical useEffect logic.
**Affected Pages:** /search, /, /view-split-lease, /favorite-listings

**Current Code:**
```javascript
// useSearchPageLogic.js lines 482-490 (also in HomePage.jsx, ViewSplitLeasePage.jsx, etc.)
useEffect(() => {
  const init = async () => {
    if (!isInitialized()) {
      console.log('Initializing data lookups...')
      await initializeLookups()
    }
  }
  init()
}, [])
```

**Refactored Code:**
```javascript
// NEW FILE: app/src/hooks/useDataLookups.js
import { useState, useEffect } from 'react';
import { initializeLookups, isInitialized } from '../lib/dataLookups.js';

/**
 * Hook to ensure data lookups are initialized before rendering
 * Returns true when lookups are ready, false while loading
 *
 * @returns {boolean} Whether lookups are initialized and ready
 *
 * @example
 * function SearchPage() {
 *   const lookupsReady = useDataLookups();
 *   if (!lookupsReady) return <LoadingSpinner />;
 *   // ... rest of component
 * }
 */
export function useDataLookups() {
  const [isReady, setIsReady] = useState(isInitialized());

  useEffect(() => {
    let mounted = true;

    async function init() {
      if (!isInitialized()) {
        // Use logger after CHUNK 3 is implemented
        console.log('Initializing data lookups...');
        await initializeLookups();
        if (mounted) {
          setIsReady(true);
        }
      }
    }

    init();

    return () => {
      mounted = false;
    };
  }, []);

  return isReady;
}

export default useDataLookups;
```

**Testing:**
- [ ] Create new hook file
- [ ] Update useSearchPageLogic.js to use `useDataLookups()`
- [ ] Update HomePage.jsx to use `useDataLookups()`
- [ ] Verify /search page loads correctly
- [ ] Verify home page loads correctly
- [ ] Check that lookups are only initialized once (check console for single log)

~~~~~

## PAGE GROUP: /view-split-lease (Chunks: 11, 12, 13)

~~~~~

### CHUNK 11: Remove Duplicate fetchInformationalTexts Function
**File:** `app/src/islands/pages/ViewSplitLeasePage.jsx`
**Line:** 207-287
**Issue:** 80-line `fetchInformationalTexts` function duplicates existing `app/src/lib/informationalTextsFetcher.js`.
**Affected Pages:** /view-split-lease

**Current Code:**
```javascript
// ViewSplitLeasePage.jsx lines 207-287
async function fetchInformationalTexts() {
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/informational_text?select=*`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
      }
    );
    // ... 70 more lines of fetch/transform logic
  } catch (error) {
    console.error('Error fetching informational texts:', error);
    return {};
  }
}
```

**Refactored Code:**
```javascript
// ViewSplitLeasePage.jsx - Replace lines 207-287 with import
import { fetchInformationalTexts } from '../../lib/informationalTextsFetcher.js';

// DELETE the entire local fetchInformationalTexts function (lines 207-287)
// The imported version already exists and is maintained centrally
```

**Testing:**
- [ ] Verify `app/src/lib/informationalTextsFetcher.js` exists and exports `fetchInformationalTexts`
- [ ] Add import statement to ViewSplitLeasePage.jsx
- [ ] Delete local function definition (lines 207-287)
- [ ] Navigate to /view-split-lease/[any-listing-id]
- [ ] Verify informational text modals still work (click ? icons)

~~~~~

### CHUNK 12: Extract ViewSplitLeasePage Internal Components
**File:** `app/src/islands/pages/ViewSplitLeasePage.jsx`
**Line:** 95-205 (internal components)
**Issue:** 2000+ line file contains 4 internal components that should be extracted for maintainability.
**Affected Pages:** /view-split-lease

**Current Code:**
```javascript
// ViewSplitLeasePage.jsx lines 95-205
// Internal components defined inside the main file:

function LoadingState() {
  return (
    <div className="vsl-loading">
      {/* ... 20 lines */}
    </div>
  );
}

function ErrorState({ error, onRetry }) {
  return (
    <div className="vsl-error">
      {/* ... 25 lines */}
    </div>
  );
}

function PhotoGallery({ photos, onPhotoClick }) {
  return (
    <div className="vsl-gallery">
      {/* ... 40 lines */}
    </div>
  );
}

function SchedulePatternHighlight({ pattern }) {
  return (
    <div className="schedule-highlight">
      {/* ... 25 lines */}
    </div>
  );
}
```

**Refactored Code:**
```javascript
// NEW DIRECTORY STRUCTURE:
// app/src/islands/pages/ViewSplitLeasePage/
// ├── ViewSplitLeasePage.jsx (main component)
// ├── useViewSplitLeasePageLogic.js (already exists, move here)
// ├── components/
// │   ├── LoadingState.jsx
// │   ├── ErrorState.jsx
// │   ├── PhotoGallery.jsx
// │   ├── SchedulePatternHighlight.jsx
// │   └── index.js
// └── ViewSplitLeasePage.css

// NEW FILE: app/src/islands/pages/ViewSplitLeasePage/components/LoadingState.jsx
export function LoadingState() {
  return (
    <div className="vsl-loading">
      {/* ... existing JSX */}
    </div>
  );
}

// NEW FILE: app/src/islands/pages/ViewSplitLeasePage/components/index.js
export { LoadingState } from './LoadingState.jsx';
export { ErrorState } from './ErrorState.jsx';
export { PhotoGallery } from './PhotoGallery.jsx';
export { SchedulePatternHighlight } from './SchedulePatternHighlight.jsx';

// UPDATED: app/src/islands/pages/ViewSplitLeasePage/ViewSplitLeasePage.jsx
import { LoadingState, ErrorState, PhotoGallery, SchedulePatternHighlight } from './components';
```

**Testing:**
- [ ] Create ViewSplitLeasePage/ directory
- [ ] Create components/ subdirectory
- [ ] Extract each internal component to its own file
- [ ] Create index.js barrel export
- [ ] Update imports in ViewSplitLeasePage.jsx
- [ ] Update routes.config.js if entry point path changed
- [ ] Navigate to /view-split-lease/[any-id] and verify all states work

~~~~~

### CHUNK 13: Fix ESLint-Disabled Hook Dependencies in Schedule Selectors
**File:** `app/src/islands/shared/useScheduleSelectorLogicCore.js`
**Line:** 173, 178, 183
**Issue:** ESLint disable comments suppress legitimate hook dependency warnings, potentially causing stale closure bugs.
**Affected Pages:** /view-split-lease, /search, /self-listing, /listing-dashboard

**Current Code:**
```javascript
// useScheduleSelectorLogicCore.js lines 173-185
useEffect(() => {
  // Effect logic that may use stale values
  someFunction(prop1, prop2);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [prop1]); // Missing prop2 in dependencies
```

**Refactored Code:**
```javascript
// useScheduleSelectorLogicCore.js - Option 1: Include all dependencies
useEffect(() => {
  someFunction(prop1, prop2);
}, [prop1, prop2]); // All dependencies included

// OR Option 2: Use useRef for values that shouldn't trigger re-runs
const prop2Ref = useRef(prop2);
useEffect(() => {
  prop2Ref.current = prop2;
});

useEffect(() => {
  someFunction(prop1, prop2Ref.current);
}, [prop1]); // Now correctly depends only on prop1
```

**Testing:**
- [ ] Review each eslint-disable comment in useScheduleSelectorLogicCore.js
- [ ] Determine if missing dependencies are intentional or bugs
- [ ] Fix each case appropriately (add deps or use refs)
- [ ] Remove eslint-disable comments
- [ ] Run `bun run lint` to verify no new warnings
- [ ] Test schedule selector on /view-split-lease
- [ ] Test schedule selector on /search (SearchScheduleSelector)

~~~~~

## PAGE GROUP: /guest-proposals, /host-proposals (Chunks: 14, 15, 16, 17)

~~~~~

### CHUNK 14: Replace alert() with Toast in VirtualMeetingModal
**File:** `app/src/islands/modals/VirtualMeetingModal.jsx`
**Line:** 35, 86, 91, 112, 117, 137, 142, 171, 176
**Issue:** Native `alert()` used for user feedback instead of consistent Toast component.
**Affected Pages:** /guest-proposals, /host-proposals

**Current Code:**
```javascript
// VirtualMeetingModal.jsx lines 86-91
try {
  // ... API call
  alert('Virtual meeting request sent!');
  if (onSuccess) onSuccess();
  onClose();
} catch (error) {
  console.error('Error submitting VM request:', error);
  alert('Failed to submit request. Please try again.');
}
```

**Refactored Code:**
```javascript
// VirtualMeetingModal.jsx - Add state and Toast component
import { useState } from 'react';
import Toast from '../shared/Toast/Toast.jsx';

// Inside component, add state:
const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

const showToast = (message, type = 'success') => {
  setToast({ show: true, message, type });
};

// Replace alert calls:
try {
  // ... API call
  showToast('Virtual meeting request sent!', 'success');
  if (onSuccess) onSuccess();
  // Delay close to show toast
  setTimeout(() => onClose(), 1500);
} catch (error) {
  console.error('Error submitting VM request:', error);
  showToast('Failed to submit request. Please try again.', 'error');
}

// In JSX, add Toast:
{toast.show && (
  <Toast
    message={toast.message}
    type={toast.type}
    onClose={() => setToast({ ...toast, show: false })}
  />
)}
```

**Testing:**
- [ ] Update VirtualMeetingModal.jsx with Toast integration
- [ ] Open /guest-proposals page
- [ ] Click "Request Virtual Meeting" on a proposal
- [ ] Submit the form
- [ ] Verify Toast appears instead of browser alert
- [ ] Verify error Toast appears on failure (test with network offline)

~~~~~

### CHUNK 15: Replace alert() with Toast in EditProposalModal
**File:** `app/src/islands/modals/EditProposalModal.jsx`
**Line:** 153, 159
**Issue:** Native `alert()` used for user feedback.
**Affected Pages:** /guest-proposals

**Current Code:**
```javascript
// EditProposalModal.jsx lines 153-159
if (success) {
  alert('Proposal updated successfully!');
  onClose();
} else {
  alert('Failed to update proposal. Please try again.');
}
```

**Refactored Code:**
```javascript
// EditProposalModal.jsx - Same pattern as CHUNK 14
import Toast from '../shared/Toast/Toast.jsx';

const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

// Replace alert calls:
if (success) {
  setToast({ show: true, message: 'Proposal updated successfully!', type: 'success' });
  setTimeout(() => onClose(), 1500);
} else {
  setToast({ show: true, message: 'Failed to update proposal. Please try again.', type: 'error' });
}

// Add Toast to JSX
```

**Testing:**
- [ ] Update EditProposalModal.jsx
- [ ] Open /guest-proposals
- [ ] Edit a proposal
- [ ] Verify Toast appears on success/failure

~~~~~

### CHUNK 16: Fix setTimeout Without Cleanup in useGuestProposalsPageLogic
**File:** `app/src/islands/pages/proposals/useGuestProposalsPageLogic.js`
**Line:** 275-300
**Issue:** `setTimeout` calls without cleanup can fire after component unmounts, causing memory leaks and state updates on unmounted components.
**Affected Pages:** /guest-proposals

**Current Code:**
```javascript
// useGuestProposalsPageLogic.js lines 275-300
useEffect(() => {
  // ... some logic

  setTimeout(() => {
    window.history.replaceState({}, '', window.location.pathname);
  }, 600);

  setTimeout(() => {
    setHighlightVMButton(false);
  }, 5000);

  // No cleanup!
}, [isLoading, proposals]);
```

**Refactored Code:**
```javascript
// useGuestProposalsPageLogic.js lines 275-300
useEffect(() => {
  let urlCleanupTimer = null;
  let highlightTimer = null;

  // ... existing logic

  urlCleanupTimer = setTimeout(() => {
    window.history.replaceState({}, '', window.location.pathname);
  }, 600);

  highlightTimer = setTimeout(() => {
    setHighlightVMButton(false);
  }, 5000);

  // Cleanup function
  return () => {
    if (urlCleanupTimer) clearTimeout(urlCleanupTimer);
    if (highlightTimer) clearTimeout(highlightTimer);
  };
}, [isLoading, proposals]);
```

**Testing:**
- [ ] Update the useEffect with cleanup
- [ ] Navigate to /guest-proposals
- [ ] Quickly navigate away before 5 seconds
- [ ] Verify no console warnings about state updates on unmounted components
- [ ] Verify highlight animation still works when staying on page

~~~~~

### CHUNK 17: Extract useRequireGuestAuth Hook
**File:** `app/src/hooks/useRequireGuestAuth.js` (NEW FILE)
**Line:** N/A
**Issue:** 105-line authentication effect in useGuestProposalsPageLogic could be reused across guest-only pages.
**Affected Pages:** /guest-proposals (and future guest-only pages)

**Current Code:**
```javascript
// useGuestProposalsPageLogic.js lines 76-181
useEffect(() => {
  async function checkAuthAndFetch() {
    // 100+ lines of auth checking logic
    const { data } = await supabase.auth.getSession();
    // ... role checking, redirect logic, etc.
  }
  checkAuthAndFetch();
}, []);
```

**Refactored Code:**
```javascript
// NEW FILE: app/src/hooks/useRequireGuestAuth.js
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.js';
import { getSessionWithRetry } from '../lib/auth.js'; // From CHUNK 4

/**
 * Hook that requires guest authentication
 * Redirects to login if not authenticated or not a guest
 *
 * @returns {{
 *   isChecking: boolean,
 *   isAuthenticated: boolean,
 *   isGuest: boolean,
 *   guestId: string|null,
 *   error: string|null
 * }}
 */
export function useRequireGuestAuth() {
  const [state, setState] = useState({
    isChecking: true,
    isAuthenticated: false,
    isGuest: false,
    guestId: null,
    error: null,
  });

  useEffect(() => {
    let mounted = true;

    async function checkAuth() {
      try {
        const { session, error } = await getSessionWithRetry();

        if (error || !session) {
          if (mounted) {
            setState({
              isChecking: false,
              isAuthenticated: false,
              isGuest: false,
              guestId: null,
              error: 'Not authenticated',
            });
          }
          // Redirect to login
          window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
          return;
        }

        // Check if user is a guest
        const { data: guestData } = await supabase
          .from('guest')
          .select('_id')
          .eq('auth_user_id', session.user.id)
          .single();

        if (!guestData && mounted) {
          setState({
            isChecking: false,
            isAuthenticated: true,
            isGuest: false,
            guestId: null,
            error: 'User is not a guest',
          });
          return;
        }

        if (mounted) {
          setState({
            isChecking: false,
            isAuthenticated: true,
            isGuest: true,
            guestId: guestData._id,
            error: null,
          });
        }
      } catch (err) {
        if (mounted) {
          setState({
            isChecking: false,
            isAuthenticated: false,
            isGuest: false,
            guestId: null,
            error: err.message,
          });
        }
      }
    }

    checkAuth();

    return () => {
      mounted = false;
    };
  }, []);

  return state;
}

export default useRequireGuestAuth;
```

**Testing:**
- [ ] Create new hook file
- [ ] Update useGuestProposalsPageLogic.js to use the hook
- [ ] Test /guest-proposals when logged in as guest
- [ ] Test /guest-proposals when not logged in (should redirect)
- [ ] Test /guest-proposals when logged in as host (should show error)

~~~~~

## PAGE GROUP: /listing-dashboard (Chunks: 18, 19)

~~~~~

### CHUNK 18: Replace alert() with Toast in useListingDashboardPageLogic
**File:** `app/src/islands/pages/ListingDashboardPage/useListingDashboardPageLogic.js`
**Line:** 826, 830
**Issue:** Native `alert()` used for user feedback.
**Affected Pages:** /listing-dashboard

**Current Code:**
```javascript
// useListingDashboardPageLogic.js lines 826-830
if (success) {
  alert('Settings saved successfully!');
} else {
  alert('Failed to save settings.');
}
```

**Refactored Code:**
```javascript
// Return toast state from hook instead of calling alert
// useListingDashboardPageLogic.js

const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

const showToast = useCallback((message, type = 'success') => {
  setToast({ show: true, message, type });
}, []);

const hideToast = useCallback(() => {
  setToast(prev => ({ ...prev, show: false }));
}, []);

// Replace alert calls:
if (success) {
  showToast('Settings saved successfully!', 'success');
} else {
  showToast('Failed to save settings.', 'error');
}

// Add to return object:
return {
  // ... existing returns
  toast,
  hideToast,
};

// In ListingDashboardPage.jsx, consume the toast:
const { toast, hideToast, /* ... */ } = useListingDashboardPageLogic();

// In JSX:
{toast.show && (
  <Toast message={toast.message} type={toast.type} onClose={hideToast} />
)}
```

**Testing:**
- [ ] Update useListingDashboardPageLogic.js to return toast state
- [ ] Update ListingDashboardPage.jsx to render Toast
- [ ] Test saving settings on /listing-dashboard
- [ ] Verify Toast appears instead of browser alert

~~~~~

### CHUNK 19: Replace alert() with Toast in HostProposalsPage
**File:** `app/src/islands/pages/HostProposalsPage/useHostProposalsPageLogic.js`
**Line:** 546, 575, 580, 647, 652, 682, 687
**Issue:** 7 instances of native `alert()` for user feedback.
**Affected Pages:** /host-proposals

**Current Code:**
```javascript
// useHostProposalsPageLogic.js - multiple locations
alert('Proposal accepted successfully!');
alert('Failed to accept proposal.');
alert('Proposal rejected.');
alert('Failed to reject proposal.');
// ... etc
```

**Refactored Code:**
```javascript
// Same pattern as CHUNK 18:
// 1. Add toast state to hook
// 2. Create showToast helper
// 3. Replace all alert() calls
// 4. Return toast state from hook
// 5. Render Toast in page component
```

**Testing:**
- [ ] Update useHostProposalsPageLogic.js with toast state
- [ ] Update HostProposalsPage.jsx to render Toast
- [ ] Test accepting a proposal
- [ ] Test rejecting a proposal
- [ ] Verify all actions show Toast instead of alert

~~~~~

## PAGE GROUP: / (Home Page) (Chunks: 20, 21)

~~~~~

### CHUNK 20: Move Hardcoded Bubble CDN URLs to Constants
**File:** `app/src/islands/pages/HomePage.jsx`
**Line:** 67-84
**Issue:** Hardcoded external CDN URLs in component make maintenance difficult and create external dependencies.
**Affected Pages:** /

**Current Code:**
```javascript
// HomePage.jsx lines 67-84
const valueProps = [
  {
    icon: 'https://50bf0464e4735aabad1cc8848a0e8b8a.cdn.bubble.io/cdn-cgi/image/w=192,h=192,f=auto,dpr=1,fit=contain/f1621245433645x903943195219269100/Icon-OnlineSelect%201%20%281%29.png',
    title: '100s of Split Leases, or source off market',
  },
  {
    icon: 'https://50bf0464e4735aabad1cc8848a0e8b8a.cdn.bubble.io/cdn-cgi/image/w=192,h=192,f=auto,dpr=1,fit=contain/f1621245434055x339929910498691140/Icon-skyline%201.png',
    title: 'Financially optimal and curated for your schedule',
  },
  // ... more
];
```

**Refactored Code:**
```javascript
// NEW FILE: app/src/data/homePageContent.js
export const VALUE_PROPS = [
  {
    id: 'online-select',
    // Option 1: Keep CDN URLs but centralize
    icon: 'https://50bf0464e4735aabad1cc8848a0e8b8a.cdn.bubble.io/cdn-cgi/image/w=192,h=192,f=auto,dpr=1,fit=contain/f1621245433645x903943195219269100/Icon-OnlineSelect%201%20%281%29.png',
    // Option 2 (preferred): Move to local assets
    // icon: '/assets/icons/online-select.png',
    title: '100s of Split Leases, or source off market',
    description: 'Access the largest marketplace of split leases in NYC.',
  },
  {
    id: 'skyline',
    icon: 'https://50bf0464e4735aabad1cc8848a0e8b8a.cdn.bubble.io/cdn-cgi/image/w=192,h=192,f=auto,dpr=1,fit=contain/f1621245434055x339929910498691140/Icon-skyline%201.png',
    title: 'Financially optimal and curated for your schedule',
    description: 'Find rentals that match your specific needs.',
  },
  // ... rest of props
];

// HomePage.jsx - Import from data file
import { VALUE_PROPS } from '../../data/homePageContent.js';

// Use VALUE_PROPS instead of inline array
```

**Testing:**
- [ ] Create app/src/data/homePageContent.js
- [ ] Move valueProps array to the new file
- [ ] Update HomePage.jsx to import VALUE_PROPS
- [ ] Verify home page still displays icons correctly

~~~~~

### CHUNK 21: Fix Array Index Keys in HomePage
**File:** `app/src/islands/pages/HomePage.jsx`
**Line:** 90, 252
**Issue:** Using array index as React key can cause rendering issues when list items change.
**Affected Pages:** /

**Current Code:**
```javascript
// HomePage.jsx line 90
{valueProps.map((prop, index) => (
  <div key={index} className="value-card">
    {/* ... */}
  </div>
))}
```

**Refactored Code:**
```javascript
// After CHUNK 20, valueProps has id field:
{VALUE_PROPS.map((prop) => (
  <div key={prop.id} className="value-card">
    {/* ... */}
  </div>
))}

// For static content without IDs, use stable identifiers:
{staticItems.map((item) => (
  <div key={item.title || item.name} className="item">
    {/* ... */}
  </div>
))}
```

**Testing:**
- [ ] Update valueProps.map to use prop.id as key
- [ ] Check other .map() calls in HomePage.jsx for index keys
- [ ] Run `bun run lint` to verify no key warnings
- [ ] Verify home page renders correctly

~~~~~

## PAGE GROUP: Shared Components (Chunks: 22, 23, 24, 25)

~~~~~

### CHUNK 22: Split Header.jsx into Hollow Component Pattern
**File:** `app/src/islands/shared/Header.jsx`
**Line:** 1-765 (entire file)
**Issue:** 765-line component violates Hollow Component pattern - contains all logic inline instead of in a separate hook.
**Affected Pages:** GLOBAL (All Pages)

**Current Code:**
```javascript
// Header.jsx - 765 lines mixing logic and render
export default function Header({ autoShowLogin = false }) {
  const [mobileMenuActive, setMobileMenuActive] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [headerVisible, setHeaderVisible] = useState(true);
  // ... 50+ more useState calls

  useEffect(() => {
    // ... scroll handling logic
  }, []);

  useEffect(() => {
    // ... auth checking logic
  }, []);

  // ... 400+ lines of handlers and logic

  return (
    <header>
      {/* ... 300+ lines of JSX */}
    </header>
  );
}
```

**Refactored Code:**
```javascript
// NEW FILE: app/src/islands/shared/useHeaderLogic.js
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../lib/supabase.js';
import { getSessionWithRetry, logoutUser } from '../../lib/auth.js';

export function useHeaderLogic({ autoShowLogin = false }) {
  // All state
  const [mobileMenuActive, setMobileMenuActive] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [headerVisible, setHeaderVisible] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(autoShowLogin);
  // ... rest of state

  // All effects
  useEffect(() => {
    // Scroll handling
  }, []);

  useEffect(() => {
    // Auth checking
  }, []);

  // All handlers
  const handleLogout = useCallback(async () => {
    await logoutUser();
    setCurrentUser(null);
  }, []);

  const toggleMobileMenu = useCallback(() => {
    setMobileMenuActive(prev => !prev);
  }, []);

  // ... rest of handlers

  return {
    // State
    mobileMenuActive,
    activeDropdown,
    headerVisible,
    currentUser,
    showAuthModal,

    // Handlers
    handleLogout,
    toggleMobileMenu,
    setActiveDropdown,
    setShowAuthModal,
    // ... rest of exports
  };
}

// UPDATED: app/src/islands/shared/Header.jsx (~200 lines)
import { useHeaderLogic } from './useHeaderLogic.js';

export default function Header({ autoShowLogin = false }) {
  const {
    mobileMenuActive,
    activeDropdown,
    headerVisible,
    currentUser,
    showAuthModal,
    handleLogout,
    toggleMobileMenu,
    setActiveDropdown,
    setShowAuthModal,
  } = useHeaderLogic({ autoShowLogin });

  return (
    <header className={headerVisible ? 'visible' : 'hidden'}>
      {/* Pure JSX only - no logic */}
    </header>
  );
}
```

**Testing:**
- [ ] Create useHeaderLogic.js with all state and handlers
- [ ] Update Header.jsx to use the hook (pure render only)
- [ ] Test header on multiple pages
- [ ] Test mobile menu toggle
- [ ] Test login/logout flow
- [ ] Test dropdown menus
- [ ] Verify scroll hide/show behavior

~~~~~

### CHUNK 23: Add UI Constants File
**File:** `app/src/lib/constants.js` (NEW FILE)
**Line:** N/A
**Issue:** Magic numbers scattered throughout codebase for timeouts, thresholds, and animation durations.
**Affected Pages:** GLOBAL

**Current Code:**
```javascript
// Scattered across files:
// Header.jsx line 324
if (currentScrollY > lastScrollY && currentScrollY > 100) {

// useGuestProposalsPageLogic.js line 280
setTimeout(() => { ... }, 5000);

// Various files
setTimeout(() => { ... }, 300);
setTimeout(() => { ... }, 600);
```

**Refactored Code:**
```javascript
// NEW FILE: app/src/lib/constants.js

/**
 * UI-related constants for consistent behavior across the app
 */
export const UI_CONSTANTS = {
  // Header behavior
  HEADER_HIDE_SCROLL_THRESHOLD: 100,

  // Toast/notification timing
  TOAST_AUTO_DISMISS_MS: 5000,
  TOAST_ANIMATION_MS: 300,

  // Animation durations
  ANIMATION_FAST_MS: 150,
  ANIMATION_NORMAL_MS: 300,
  ANIMATION_SLOW_MS: 600,

  // Highlight durations
  VM_HIGHLIGHT_DURATION_MS: 5000,
  URL_CLEANUP_DELAY_MS: 600,

  // Retry/polling
  SESSION_RETRY_DELAY_MS: 200,
  POLLING_INTERVAL_MS: 30000,
};

/**
 * API-related constants
 */
export const API_CONSTANTS = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  REQUEST_TIMEOUT_MS: 30000,
};

/**
 * Feature flags (can be moved to environment variables later)
 */
export const FEATURE_FLAGS = {
  ENABLE_VIRTUAL_MEETINGS: true,
  ENABLE_FAVORITES: true,
  ENABLE_MESSAGING: true,
};

export default { UI_CONSTANTS, API_CONSTANTS, FEATURE_FLAGS };
```

**Testing:**
- [ ] Create constants.js file
- [ ] Update Header.jsx to use `UI_CONSTANTS.HEADER_HIDE_SCROLL_THRESHOLD`
- [ ] Update useGuestProposalsPageLogic.js to use `UI_CONSTANTS.VM_HIGHLIGHT_DURATION_MS`
- [ ] Verify behavior unchanged

~~~~~

### CHUNK 24: Replace alert() in CompareTermsModal
**File:** `app/src/islands/modals/CompareTermsModal.jsx`
**Line:** 71, 78
**Issue:** Native `alert()` used for user feedback.
**Affected Pages:** /view-split-lease (modal accessible from listing view)

**Current Code:**
```javascript
// CompareTermsModal.jsx lines 71-78
try {
  // ... comparison logic
  alert('Comparison saved!');
} catch (error) {
  alert('Failed to save comparison.');
}
```

**Refactored Code:**
```javascript
// Same Toast pattern as previous chunks
import Toast from '../shared/Toast/Toast.jsx';

const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

// Replace alerts with toast
try {
  // ... comparison logic
  setToast({ show: true, message: 'Comparison saved!', type: 'success' });
} catch (error) {
  setToast({ show: true, message: 'Failed to save comparison.', type: 'error' });
}
```

**Testing:**
- [ ] Update CompareTermsModal.jsx
- [ ] Test comparison feature on /view-split-lease
- [ ] Verify Toast appears

~~~~~

### CHUNK 25: Replace alert() in EditPhoneNumberModal
**File:** `app/src/islands/modals/EditPhoneNumberModal.jsx`
**Line:** 24, 33
**Issue:** Native `alert()` used for user feedback.
**Affected Pages:** /account-profile

**Current Code:**
```javascript
// EditPhoneNumberModal.jsx lines 24-33
const handleSave = async () => {
  try {
    // ... save logic
    alert('Phone number updated!');
    onClose();
  } catch (error) {
    alert('Failed to update phone number.');
  }
};
```

**Refactored Code:**
```javascript
// Same Toast pattern
import Toast from '../shared/Toast/Toast.jsx';

const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

const handleSave = async () => {
  try {
    // ... save logic
    setToast({ show: true, message: 'Phone number updated!', type: 'success' });
    setTimeout(() => onClose(), 1500);
  } catch (error) {
    setToast({ show: true, message: 'Failed to update phone number.', type: 'error' });
  }
};
```

**Testing:**
- [ ] Update EditPhoneNumberModal.jsx
- [ ] Test on /account-profile page
- [ ] Verify Toast appears on save

~~~~~

---

## Summary

| Page Group | Chunk Numbers | Total Chunks |
|------------|---------------|--------------|
| GLOBAL (All Pages) | 1, 2, 3, 4, 5, 22, 23 | 7 |
| /search | 6, 7, 8, 9, 10 | 5 |
| /view-split-lease | 11, 12, 13 | 3 |
| /guest-proposals, /host-proposals | 14, 15, 16, 17, 19 | 5 |
| /listing-dashboard | 18 | 1 |
| / (Home) | 20, 21 | 2 |
| Shared Components | 24, 25 | 2 |

**Recommended Implementation Order:**
1. **Quick Wins (Chunks 1-3):** Delete duplicates, add logger
2. **Infrastructure (Chunks 4-5):** Centralize session access, error handling
3. **Search Page (Chunks 6-10):** Extract utilities, fix performance
4. **View Split Lease (Chunks 11-13):** Remove duplication, extract components
5. **Proposals (Chunks 14-19):** Replace all alerts with Toast
6. **Home Page (Chunks 20-21):** Extract content, fix keys
7. **Header Refactor (Chunk 22):** Major refactor - do last
8. **Polish (Chunks 23-25):** Constants, remaining alerts

---

**Plan Created:** 2026-01-15T07:59:08
**Total Issues Found:** 25
**Estimated Impact:** High (affects all pages through shared components)
