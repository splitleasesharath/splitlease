# Code Refactoring Plan - app/src/

**Date:** 2026-01-16
**Audit Type:** general
**Scope:** Performance, maintainability, duplication, anti-patterns, general issues
**Total Files Scanned:** 625 files across lib/, logic/, hooks/, islands/, styles/

---

## Executive Summary

This audit identified **28 actionable refactoring chunks** organized by affected page groups. Key findings:

- **Critical:** Duplicate processor/workflow implementations causing maintenance burden
- **Performance:** Sequential database updates in loops, missing memoization
- **Architecture:** React hooks in pure logic layer, Hollow Component pattern violations
- **Security:** Ineffective client-side rate limiting
- **Maintainability:** 1,900+ line monolithic files needing decomposition

---

## CASCADING DEPENDENCY ANALYSIS

Before implementing any chunk, verify these critical dependencies:

### Files That Import `processProposalData` (from proposal/)
```
app/src/islands/pages/HostProposalsPage/useHostProposalsPageLogic.js
app/src/islands/pages/GuestProposalsPage/useGuestProposalsPageLogic.js
app/src/lib/proposalDataFetcher.js
```

### Files That Import `processProposalData` (from proposals/)
```
app/src/islands/pages/ViewSplitLeasePage/useViewSplitLeasePageLogic.js
app/src/islands/modals/ProposalDetailsModal.jsx
```

### Files That Import from `logic/index.js`
```
All page logic hooks (33+ files)
All workflow files
```

---

## PAGE GROUP: GLOBAL (Chunks: 1-8)

These chunks affect ALL pages or are in shared infrastructure.

~~~~~

### CHUNK 1: Remove Duplicate processProposalData Processor

**File:** `app/src/logic/processors/proposal/processProposalData.js`
**Line:** 1-149
**Issue:** Duplicate implementation exists at `processors/proposals/processProposalData.js`. The `proposals/` version (330 lines) is more complete with additional utilities like `formatPrice`, `formatDate`, `getEffectiveTerms`.
**Affected Pages:** /host-proposals, /guest-proposals, /view-split-lease, AUTO
**Cascading Changes Required:**
- `app/src/logic/processors/index.js` - Update export
- `app/src/lib/proposalDataFetcher.js` - Verify import path

**Current Code:**
```javascript
// app/src/logic/processors/proposal/processProposalData.js (ENTIRE FILE - DELETE)
/**
 * Process raw proposal data from Supabase into a clean, validated proposal object.
 * ... 149 lines
 */
export function processProposalData({ rawProposal, listing = null, guest = null, host = null }) {
  // ... implementation
}
```

**Refactored Code:**
```javascript
// DELETE THIS FILE ENTIRELY
// Keep only: app/src/logic/processors/proposals/processProposalData.js
// Update imports in processors/index.js:
export {
  processProposalData,
  processUserData,
  processListingData,
  processHostData,
  processVirtualMeetingData,
  getProposalDisplayText,
  formatPrice,
  formatDate,
  formatDateTime,
  getEffectiveTerms
} from './proposals/processProposalData.js'
```

**Testing:**
- [ ] Run `bun run build` to verify no broken imports
- [ ] Test /host-proposals page loads proposals correctly
- [ ] Test /guest-proposals page loads proposals correctly
- [ ] Test /view-split-lease page displays proposal details

~~~~~

### CHUNK 2: Fix Missing ErrorBoundary in house-manual.jsx

**File:** `app/src/house-manual.jsx`
**Line:** 7-17
**Issue:** This entry point is missing the `ErrorBoundary` wrapper that ALL other 36 entry points use. Unhandled errors will crash the entire React tree.
**Affected Pages:** /house-manual

**Current Code:**
```javascript
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <ToastProvider>
        <HouseManualPage />
      </ToastProvider>
    </React.StrictMode>
  );
}
```

**Refactored Code:**
```javascript
import React from 'react';
import { createRoot } from 'react-dom/client';
import HouseManualPage from './islands/pages/HouseManualPage';
import { ToastProvider } from './islands/shared/Toast';
import { ErrorBoundary } from './islands/shared/ErrorBoundary';

// Mount the HouseManualPage component
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <ToastProvider>
          <HouseManualPage />
        </ToastProvider>
      </ErrorBoundary>
    </React.StrictMode>
  );
}
```

**Testing:**
- [ ] Navigate to /house-manual page
- [ ] Verify page loads without errors
- [ ] Intentionally trigger an error to verify ErrorBoundary catches it

~~~~~

### CHUNK 3: Remove Duplicate .sr-only CSS Definition

**File:** `app/src/styles/main.css`
**Line:** 528-538
**Issue:** The `.sr-only` utility class is defined multiple times in main.css and rental-application.css. Keep only the first definition.
**Affected Pages:** ALL (global CSS)

**Current Code:**
```css
/* Line 528-538 in main.css - KEEP THIS ONE */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

/* Line ~957 in main.css - DELETE THIS DUPLICATE */
/* Also check rental-application.css for duplicate */
```

**Refactored Code:**
```css
/* Keep ONLY the definition at line 528-538 */
/* Search and delete any other .sr-only definitions in: */
/* - main.css (around line 957) */
/* - components/rental-application.css */
```

**Testing:**
- [ ] Run `bun run build` to verify CSS compiles
- [ ] Verify screen reader elements still work on /rental-application page
- [ ] Check accessibility with browser dev tools

~~~~~

### CHUNK 4: Move React Hook Out of Pure Logic Layer

**File:** `app/src/logic/rules/proposals/useProposalButtonStates.js`
**Line:** 1-145
**Issue:** React hook (`useMemo`) in `rules/` directory violates "No React dependencies" principle. The logic layer should contain only pure functions.
**Affected Pages:** /host-proposals, /guest-proposals
**Cascading Changes Required:**
- `app/src/logic/rules/proposals/index.js` - Remove export
- `app/src/logic/rules/index.js` - Remove re-export
- Any files importing from logic that use this hook

**Current Code:**
```javascript
// app/src/logic/rules/proposals/useProposalButtonStates.js
import { useMemo } from 'react'  // ❌ React dependency in logic layer

export function useProposalButtonStates(proposal, config, currentUserId) {
  return useMemo(() => {
    // ... 100+ lines of button state logic
  }, [proposal, config, currentUserId])
}
```

**Refactored Code:**
```javascript
// MOVE TO: app/src/islands/shared/hooks/useProposalButtonStates.js
import { useMemo } from 'react'

/**
 * Calculate button states for proposal actions.
 * Moved from logic/rules/ to islands/shared/hooks/ because it uses React hooks.
 */
export function useProposalButtonStates(proposal, config, currentUserId) {
  return useMemo(() => {
    // ... same logic
  }, [proposal, config, currentUserId])
}

// Update logic/rules/proposals/index.js to remove this export
// Update any imports to use new path
```

**Testing:**
- [ ] Verify /host-proposals button states work correctly
- [ ] Verify /guest-proposals button states work correctly
- [ ] Run `bun run build` to catch any broken imports

~~~~~

### CHUNK 5: Fix Ineffective Client-Side Rate Limiting

**File:** `app/src/lib/sanitize.js`
**Line:** 221-262
**Issue:** In-memory rate limiting using JavaScript `Map` is ineffective - state resets on every page load and doesn't work across browser tabs. This provides false security.
**Affected Pages:** ALL (any page using sanitize functions)

**Current Code:**
```javascript
const rateLimitMap = new Map();

export function checkRateLimit(key, maxRequests = 10, windowMs = 60000) {
  const now = Date.now();

  if (!rateLimitMap.has(key)) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  const record = rateLimitMap.get(key);

  if (now > record.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= maxRequests) {
    return false;
  }

  record.count++;
  return true;
}
```

**Refactored Code:**
```javascript
/**
 * Rate limit check using localStorage for persistence across page loads.
 * NOTE: For production security, rate limiting should be in Edge Functions.
 * This is a UX-level throttle, not a security measure.
 */
const RATE_LIMIT_STORAGE_KEY = 'sl_rate_limits';

export function checkRateLimit(key, maxRequests = 10, windowMs = 60000) {
  const now = Date.now();

  // Read from localStorage for cross-tab/reload persistence
  let rateLimits = {};
  try {
    const stored = localStorage.getItem(RATE_LIMIT_STORAGE_KEY);
    rateLimits = stored ? JSON.parse(stored) : {};
  } catch {
    rateLimits = {};
  }

  const record = rateLimits[key];

  if (!record || now > record.resetTime) {
    rateLimits[key] = { count: 1, resetTime: now + windowMs };
    localStorage.setItem(RATE_LIMIT_STORAGE_KEY, JSON.stringify(rateLimits));
    return true;
  }

  if (record.count >= maxRequests) {
    return false;
  }

  record.count++;
  localStorage.setItem(RATE_LIMIT_STORAGE_KEY, JSON.stringify(rateLimits));
  return true;
}

export function cleanupRateLimits() {
  const now = Date.now();
  try {
    const stored = localStorage.getItem(RATE_LIMIT_STORAGE_KEY);
    if (!stored) return;

    const rateLimits = JSON.parse(stored);
    for (const key of Object.keys(rateLimits)) {
      if (now > rateLimits[key].resetTime) {
        delete rateLimits[key];
      }
    }
    localStorage.setItem(RATE_LIMIT_STORAGE_KEY, JSON.stringify(rateLimits));
  } catch {
    // Ignore storage errors
  }
}
```

**Testing:**
- [ ] Test rate limiting persists across page refresh
- [ ] Test rate limiting works across browser tabs
- [ ] Verify no localStorage errors in incognito mode

~~~~~

### CHUNK 6: Add Missing Calculator Exports to Index

**File:** `app/src/logic/calculators/index.js`
**Line:** 7-17
**Issue:** Three scheduling calculators are not exported from the barrel file: `shiftMoveInDateIfPast`, `calculateCheckInOutFromDays`, `getNextOccurrenceOfDay`.
**Affected Pages:** AUTO (any page using scheduling logic)
**Cascading Changes Required:** None (additive change)

**Current Code:**
```javascript
// app/src/logic/calculators/index.js
export { calculateFourWeekRent } from './pricing/calculateFourWeekRent.js'
export { calculateGuestFacingPrice } from './pricing/calculateGuestFacingPrice.js'
export { calculatePricingBreakdown } from './pricing/calculatePricingBreakdown.js'
export { calculateReservationTotal } from './pricing/calculateReservationTotal.js'
export { getNightlyRateByFrequency } from './pricing/getNightlyRateByFrequency.js'
export { calculateCheckInOutDays } from './scheduling/calculateCheckInOutDays.js'
export { calculateNextAvailableCheckIn } from './scheduling/calculateNextAvailableCheckIn.js'
export { calculateNightsFromDays } from './scheduling/calculateNightsFromDays.js'
// MISSING: shiftMoveInDateIfPast, calculateCheckInOutFromDays, getNextOccurrenceOfDay
```

**Refactored Code:**
```javascript
// app/src/logic/calculators/index.js
// Pricing calculators
export { calculateFourWeekRent } from './pricing/calculateFourWeekRent.js'
export { calculateGuestFacingPrice } from './pricing/calculateGuestFacingPrice.js'
export { calculatePricingBreakdown } from './pricing/calculatePricingBreakdown.js'
export { calculateReservationTotal } from './pricing/calculateReservationTotal.js'
export { getNightlyRateByFrequency } from './pricing/getNightlyRateByFrequency.js'

// Scheduling calculators
export { calculateCheckInOutDays } from './scheduling/calculateCheckInOutDays.js'
export { calculateNextAvailableCheckIn } from './scheduling/calculateNextAvailableCheckIn.js'
export { calculateNightsFromDays } from './scheduling/calculateNightsFromDays.js'
export { shiftMoveInDateIfPast } from './scheduling/shiftMoveInDateIfPast.js'
export { calculateCheckInOutFromDays } from './scheduling/calculateCheckInOutFromDays.js'
export { getNextOccurrenceOfDay } from './scheduling/getNextOccurrenceOfDay.js'
```

**Testing:**
- [ ] Run `bun run build` to verify exports work
- [ ] Test importing from `logic/calculators` barrel export

~~~~~

### CHUNK 7: Standardize Entry Point Container Check Pattern

**File:** `app/src/listing-dashboard.jsx`, `app/src/account-profile.jsx`
**Line:** Various
**Issue:** 3 entry points use `if (container)` pattern while 34 others render directly. Inconsistent patterns add cognitive overhead. Standardize to direct pattern since missing `#root` is a critical build error that should fail loudly.
**Affected Pages:** /listing-dashboard, /account-profile, /house-manual

**Current Code:**
```javascript
// listing-dashboard.jsx (example)
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <ListingDashboardPage />
      </ErrorBoundary>
    </React.StrictMode>
  );
}
```

**Refactored Code:**
```javascript
// listing-dashboard.jsx (standardized)
createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ListingDashboardPage />
    </ErrorBoundary>
  </React.StrictMode>
);
```

**Testing:**
- [ ] Verify /listing-dashboard loads correctly
- [ ] Verify /account-profile loads correctly
- [ ] Verify /house-manual loads correctly

~~~~~

### CHUNK 8: Fix Duplicate cancelProposalWorkflow

**File:** `app/src/logic/workflows/booking/cancelProposalWorkflow.js`
**Line:** 1-144
**Issue:** Duplicate implementation exists at `workflows/proposals/cancelProposalWorkflow.js`. The `proposals/` version has better separation of concerns with `determineCancellationCondition` and `executeCancelProposal`.
**Affected Pages:** /host-proposals, /guest-proposals
**Cascading Changes Required:**
- `app/src/logic/workflows/index.js` - Update export
- Any files importing from `workflows/booking/`

**Current Code:**
```javascript
// app/src/logic/workflows/booking/cancelProposalWorkflow.js (DELETE)
// 144 lines with 7-variation decision tree
```

**Refactored Code:**
```javascript
// DELETE: app/src/logic/workflows/booking/cancelProposalWorkflow.js
// KEEP: app/src/logic/workflows/proposals/cancelProposalWorkflow.js

// Update workflows/index.js:
export { cancelProposalWorkflow } from './proposals/cancelProposalWorkflow.js'
// Remove: export { ... } from './booking/cancelProposalWorkflow.js'
```

**Testing:**
- [ ] Test cancel proposal flow from /host-proposals
- [ ] Test cancel proposal flow from /guest-proposals
- [ ] Verify all 7 cancellation variations work correctly

~~~~~

## PAGE GROUP: /listing-dashboard (Chunks: 9-13)

~~~~~

### CHUNK 9: Parallelize Photo Reorder Database Updates

**File:** `app/src/islands/pages/ListingDashboardPage/hooks/usePhotoManagement.js`
**Line:** 79-87
**Issue:** Sequential `await` in for-loop causes O(n) database writes. For 10 photos, this means 10 sequential API calls (~2-3 seconds) instead of parallel calls (~300ms).
**Affected Pages:** /listing-dashboard

**Current Code:**
```javascript
try {
  for (let i = 0; i < newPhotos.length; i++) {
    await supabase
      .from('listing_photo')
      .update({
        SortOrder: i,
        toggleMainPhoto: i === 0,
      })
      .eq('_id', newPhotos[i].id);
  }

  logger.debug('✅ Photos reordered in listing_photo table');
} catch (err) {
  logger.error('❌ Error reordering photos:', err);
  fetchListing(true);
}
```

**Refactored Code:**
```javascript
try {
  const updatePromises = newPhotos.map((photo, i) =>
    supabase
      .from('listing_photo')
      .update({
        SortOrder: i,
        toggleMainPhoto: i === 0,
      })
      .eq('_id', photo.id)
  );

  await Promise.all(updatePromises);

  logger.debug('✅ Photos reordered in listing_photo table');
} catch (err) {
  logger.error('❌ Error reordering photos:', err);
  fetchListing(true);
}
```

**Testing:**
- [ ] Reorder photos on /listing-dashboard
- [ ] Verify order persists after page refresh
- [ ] Measure time improvement (should be ~5-10x faster)

~~~~~

### CHUNK 10: Parallelize Cover Photo Update

**File:** `app/src/islands/pages/ListingDashboardPage/hooks/usePhotoManagement.js`
**Line:** 44-51
**Issue:** Same sequential await pattern when setting cover photo.
**Affected Pages:** /listing-dashboard

**Current Code:**
```javascript
for (let i = 0; i < newPhotos.length; i++) {
  if (newPhotos[i].id !== photoId) {
    await supabase
      .from('listing_photo')
      .update({ SortOrder: i })
      .eq('_id', newPhotos[i].id);
  }
}
```

**Refactored Code:**
```javascript
const updatePromises = newPhotos
  .filter((photo, i) => photo.id !== photoId)
  .map((photo, i) =>
    supabase
      .from('listing_photo')
      .update({ SortOrder: i + 1 }) // +1 because cover photo is at 0
      .eq('_id', photo.id)
  );

await Promise.all(updatePromises);
```

**Testing:**
- [ ] Set different cover photo on /listing-dashboard
- [ ] Verify cover photo changes correctly
- [ ] Verify other photo order is preserved

~~~~~

### CHUNK 11: Fix Hollow Component Pattern Violation

**File:** `app/src/islands/pages/ListingDashboardPage/ListingDashboardPage.jsx`
**Line:** 30-68
**Issue:** `ListingDashboardContent` has local `useState` for `showReferralModal` which should be in the logic hook per Hollow Component Pattern.
**Affected Pages:** /listing-dashboard

**Current Code:**
```javascript
function ListingDashboardContent() {
  const [showReferralModal, setShowReferralModal] = useState(false); // ❌ Local state
  const {
    activeTab,
    listing,
    // ...
  } = useListingDashboard();
  // ...
}
```

**Refactored Code:**
```javascript
// In useListingDashboardPageLogic.js - ADD:
const [showReferralModal, setShowReferralModal] = useState(false);
const handleOpenReferralModal = useCallback(() => setShowReferralModal(true), []);
const handleCloseReferralModal = useCallback(() => setShowReferralModal(false), []);

// Return in hook:
return {
  // ... existing returns
  showReferralModal,
  handleOpenReferralModal,
  handleCloseReferralModal,
};

// In ListingDashboardPage.jsx - CHANGE:
function ListingDashboardContent() {
  const {
    activeTab,
    listing,
    showReferralModal,           // ✅ From hook
    handleOpenReferralModal,      // ✅ From hook
    handleCloseReferralModal,     // ✅ From hook
    // ...
  } = useListingDashboard();
  // ... remove local useState
}
```

**Testing:**
- [ ] Verify referral modal opens/closes on /listing-dashboard
- [ ] Verify no regression in other modal functionality

~~~~~

### CHUNK 12: Add Abort Controller to AI Generation

**File:** `app/src/islands/pages/ListingDashboardPage/hooks/useAIImportAssistant.js`
**Line:** 106-313
**Issue:** 7 sequential API calls without abort mechanism. If user closes modal mid-generation, requests continue executing.
**Affected Pages:** /listing-dashboard

**Current Code:**
```javascript
const handleStartAIGeneration = useCallback(async () => {
  setIsAIGenerating(true);

  // 7 sequential API calls without abort check...
  await getCommonInUnitAmenities();
  await getCommonBuildingAmenities();
  // ... etc
}, [listing, updateListing]);
```

**Refactored Code:**
```javascript
const abortControllerRef = useRef(null);

const handleStartAIGeneration = useCallback(async () => {
  // Cancel any previous generation
  abortControllerRef.current?.abort();
  abortControllerRef.current = new AbortController();
  const { signal } = abortControllerRef.current;

  setIsAIGenerating(true);

  try {
    if (signal.aborted) return;
    const commonInUnit = await getCommonInUnitAmenities();

    if (signal.aborted) return;
    const commonBuilding = await getCommonBuildingAmenities();

    // ... check signal.aborted before each operation

  } catch (err) {
    if (err.name === 'AbortError') {
      logger.debug('AI generation cancelled by user');
      return;
    }
    throw err;
  } finally {
    setIsAIGenerating(false);
  }
}, [listing, updateListing]);

const handleCancelAIGeneration = useCallback(() => {
  abortControllerRef.current?.abort();
  setIsAIGenerating(false);
}, []);
```

**Testing:**
- [ ] Start AI generation, close modal, verify no errors
- [ ] Start AI generation, wait for completion, verify all fields populated
- [ ] Rapidly start/cancel AI generation multiple times

~~~~~

### CHUNK 13: Aggregate Parallel API Errors

**File:** `app/src/islands/pages/ListingDashboardPage/hooks/useListingData.js`
**Line:** 383-390
**Issue:** Six parallel queries with `Promise.all` but errors are only logged individually, not aggregated for user notification.
**Affected Pages:** /listing-dashboard

**Current Code:**
```javascript
const [lookups, photosResult, proposalsResult, leasesResult, meetingsResult, reviewsResult] = await Promise.all([
  fetchLookupTables(),
  supabase.from('listing_photo').select('*')...,
  supabase.from('proposal').select('*', { count: 'exact', head: true })...,
  // ...
]);

// Later, individual logging:
if (proposalsError) {
  logger.warn('⚠️ Failed to fetch proposals count:', proposalsError);
}
```

**Refactored Code:**
```javascript
const [lookups, photosResult, proposalsResult, leasesResult, meetingsResult, reviewsResult] = await Promise.all([
  fetchLookupTables(),
  supabase.from('listing_photo').select('*')...,
  supabase.from('proposal').select('*', { count: 'exact', head: true })...,
  // ...
]);

// Aggregate errors for user feedback
const failedQueries = [];
if (proposalsError) {
  logger.warn('⚠️ Failed to fetch proposals count:', proposalsError);
  failedQueries.push('proposals');
}
if (leasesError) {
  logger.warn('⚠️ Failed to fetch leases count:', leasesError);
  failedQueries.push('leases');
}
if (meetingsError) {
  logger.warn('⚠️ Failed to fetch meetings:', meetingsError);
  failedQueries.push('meetings');
}
if (reviewsError) {
  logger.warn('⚠️ Failed to fetch reviews:', reviewsError);
  failedQueries.push('reviews');
}

if (failedQueries.length > 0) {
  // Surface to UI via toast or error state
  showToast(`Some data failed to load: ${failedQueries.join(', ')}`, 'warning');
}
```

**Testing:**
- [ ] Simulate API failure for one query (use network throttling)
- [ ] Verify warning toast appears with specific failed queries
- [ ] Verify page still displays available data

~~~~~

## PAGE GROUP: /search (Chunks: 14-16)

~~~~~

### CHUNK 14: Memoize Transformed Listings Array

**File:** `app/src/islands/pages/SearchPage/useSearchPageLogic.js`
**Line:** 155-211
**Issue:** `transformListing` callback is recreated on each render because dependency array references `data.listing` object. Transform results are not memoized, causing re-computation on every filter change.
**Affected Pages:** /search

**Current Code:**
```javascript
const transformListing = useCallback((dbListing, images, hostData) => {
  // Multiple expensive operations:
  // - getNeighborhoodName(dbListing['Location - Hood'])
  // - getBoroughName(dbListing['Location - Borough'])
  // - extractListingCoordinates({ ... })
  // - parseJsonArray(dbListing['Days Available (List of Days)'])
  return transformedListing;
}, []); // Called for each listing on every filter change
```

**Refactored Code:**
```javascript
const transformListing = useCallback((dbListing, images, hostData) => {
  // ... same transformation logic
  return transformedListing;
}, []);

// Memoize the entire transformed array
const transformedListings = useMemo(() => {
  if (!data || !resolvedPhotos || !resolvedHosts) return [];

  return data.map((listing) =>
    transformListing(
      listing,
      resolvedPhotos[listing._id],
      resolvedHosts[listing._id]
    )
  );
}, [data, resolvedPhotos, resolvedHosts, transformListing]);
```

**Testing:**
- [ ] Load /search page with 100+ listings
- [ ] Apply filters, verify no lag
- [ ] Use React DevTools Profiler to verify reduced re-renders

~~~~~

### CHUNK 15: Add useCallback to GoogleMap handleMapClick

**File:** `app/src/islands/shared/GoogleMap.jsx`
**Line:** 1095
**Issue:** `handleMapClick` function is recreated on every render, potentially causing event listener re-attachment.
**Affected Pages:** /search (and any page with map)

**Current Code:**
```javascript
const handleMapClick = () => {
  logger.debug('🗺️ handleMapClick: Map clicked, closing card');
  setCardVisible(false);
  setSelectedListingForCard(null);
};
```

**Refactored Code:**
```javascript
const handleMapClick = useCallback(() => {
  logger.debug('🗺️ handleMapClick: Map clicked, closing card');
  setCardVisible(false);
  setSelectedListingForCard(null);
}, []);
```

**Testing:**
- [ ] Click on map to dismiss listing card
- [ ] Verify card closes correctly
- [ ] Use React DevTools to verify function reference stability

~~~~~

### CHUNK 16: Extract Header Inline Functions

**File:** `app/src/islands/shared/Header.jsx`
**Line:** 565-570, 711-716 (and 20+ similar)
**Issue:** 20+ inline arrow functions in onClick handlers create new function references on every render. Header renders on EVERY page.
**Affected Pages:** ALL

**Current Code:**
```javascript
onClick={(e) => {
  e.preventDefault();
  toggleDropdown('host');
}}
```

**Refactored Code:**
```javascript
// Add near top of component:
const handleHostDropdownClick = useCallback((e) => {
  e.preventDefault();
  toggleDropdown('host');
}, [toggleDropdown]);

const handleGuestDropdownClick = useCallback((e) => {
  e.preventDefault();
  toggleDropdown('guest');
}, [toggleDropdown]);

// ... similar for other handlers

// In JSX:
onClick={handleHostDropdownClick}
```

**Testing:**
- [ ] Test all dropdown menus open/close correctly
- [ ] Test mobile menu functionality
- [ ] Use React DevTools Profiler to measure re-render reduction

~~~~~

## PAGE GROUP: /host-proposals, /guest-proposals (Chunks: 17-18)

~~~~~

### CHUNK 17: Fix Stale Closure in useScheduleSelector

**File:** `app/src/islands/shared/useScheduleSelector.js`
**Line:** 154-169
**Issue:** Callbacks `onSelectionChange`, `onPriceChange`, `onScheduleChange` are called without being in dependency array, risking stale closures if parent passes inline functions.
**Affected Pages:** /host-proposals, /guest-proposals, /create-suggested-proposal

**Current Code:**
```javascript
useEffect(() => {
  onSelectionChange?.(selectedDays);
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [selectedDays]);
```

**Refactored Code:**
```javascript
// Use ref pattern to always call latest callback
const onSelectionChangeRef = useRef(onSelectionChange);
useEffect(() => {
  onSelectionChangeRef.current = onSelectionChange;
}, [onSelectionChange]);

useEffect(() => {
  onSelectionChangeRef.current?.(selectedDays);
}, [selectedDays]);

// Apply same pattern to onPriceChange and onScheduleChange
```

**Testing:**
- [ ] Test schedule selection on /create-suggested-proposal
- [ ] Verify parent component receives updated selection values
- [ ] Test rapid selection/deselection doesn't cause stale data

~~~~~

### CHUNK 18: Consolidate Duplicate Schedule Selector Hooks

**File:** `app/src/islands/shared/useScheduleSelector.js` and `useScheduleSelectorLogicCore.js`
**Line:** Both files (~350 lines each)
**Issue:** Two nearly identical hooks exist with ~90% overlapping logic. `useScheduleSelectorLogicCore.js` is the "Logic Core" version but both are actively used.
**Affected Pages:** /host-proposals, /guest-proposals, /view-split-lease, /create-suggested-proposal
**Cascading Changes Required:**
- Search all files importing `useScheduleSelector`
- Update imports to use consolidated version

**Current Code:**
```javascript
// useScheduleSelector.js - Original version
export function useScheduleSelector(...) {
  // Uses lib/scheduleSelector/* helpers
}

// useScheduleSelectorLogicCore.js - Logic Core version
export function useScheduleSelectorLogicCore(...) {
  // Uses logic/calculators/* functions
}
```

**Refactored Code:**
```javascript
// STEP 1: Add deprecation warning to useScheduleSelector.js
export function useScheduleSelector(...args) {
  console.warn(
    '[DEPRECATED] useScheduleSelector is deprecated. ' +
    'Use useScheduleSelectorLogicCore instead. ' +
    'This will be removed in a future release.'
  );
  return useScheduleSelectorLogicCore(...args);
}

// STEP 2: Update all imports to use useScheduleSelectorLogicCore
// STEP 3: After migration complete, delete useScheduleSelector.js
```

**Testing:**
- [ ] Verify schedule selector works on all affected pages
- [ ] Check browser console for deprecation warnings
- [ ] Verify no functionality regression

~~~~~

## PAGE GROUP: /account-profile (Chunks: 19-20)

~~~~~

### CHUNK 19: Optimize Day Name Conversion with Map Lookup

**File:** `app/src/islands/pages/AccountProfilePage/useAccountProfilePageLogic.js`
**Line:** 148-165
**Issue:** `dayNamesToIndices` uses `indexOf` in a loop, causing O(n²) complexity. Use Map for O(1) lookups.
**Affected Pages:** /account-profile

**Current Code:**
```javascript
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function dayNamesToIndices(dayNames) {
  if (!Array.isArray(dayNames)) return [];
  return dayNames
    .map(name => DAY_NAMES.indexOf(name)) // ❌ O(n) per item
    .filter(idx => idx !== -1);
}
```

**Refactored Code:**
```javascript
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_NAME_TO_INDEX = {
  'Sunday': 0,
  'Monday': 1,
  'Tuesday': 2,
  'Wednesday': 3,
  'Thursday': 4,
  'Friday': 5,
  'Saturday': 6
};

function dayNamesToIndices(dayNames) {
  if (!Array.isArray(dayNames)) return [];
  return dayNames
    .map(name => DAY_NAME_TO_INDEX[name]) // ✅ O(1) per item
    .filter(idx => idx !== undefined);
}
```

**Testing:**
- [ ] Verify day selection works on /account-profile
- [ ] Test with all 7 days selected
- [ ] Verify conversion is correct (Sunday=0, Saturday=6)

~~~~~

### CHUNK 20: Remove Unused Props from useAuthenticatedUser

**File:** `app/src/hooks/useAuthenticatedUser.js`
**Line:** 26-88
**Issue:** Hook accepts `requireGuest` and `requireHost` props but they're unused. This creates confusion and potential bugs if props are added to dependency array later.
**Affected Pages:** ALL authenticated pages

**Current Code:**
```javascript
export function useAuthenticatedUser({ requireGuest = false, requireHost = false } = {}) {
  // ... requireGuest and requireHost are NEVER used
  useEffect(() => {
    const authenticate = async () => {
      // ... no reference to requireGuest or requireHost
    };
    authenticate();
  }, []); // Empty deps - props not used
}
```

**Refactored Code:**
```javascript
/**
 * Hook for authenticated user state.
 * Fetches and validates current user session.
 */
export function useAuthenticatedUser() {
  // Remove unused props entirely
  // OR if planning to use them:
  // export function useAuthenticatedUser({ requireGuest = false, requireHost = false } = {}) {
  //   useEffect(() => {
  //     // ... implementation that uses requireGuest/requireHost
  //   }, [requireGuest, requireHost]);
  // }
}
```

**Testing:**
- [ ] Verify authentication works on protected pages
- [ ] Check no console warnings about unused props

~~~~~

## PAGE GROUP: /host-overview (Chunks: 21-22)

~~~~~

### CHUNK 21: Add Error Handling to Async Auth Check

**File:** `app/src/host-overview.jsx`
**Line:** 11-30
**Issue:** Async IIFE has no error handling. If `checkAuthStatus()` throws, page never renders.
**Affected Pages:** /host-overview

**Current Code:**
```javascript
(async () => {
  const isLoggedIn = await checkAuthStatus();

  console.log('Host Overview Auth Check:', { isLoggedIn });

  createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <ErrorBoundary>
        <HostOverviewPage requireAuth={true} isAuthenticated={isLoggedIn} />
      </ErrorBoundary>
    </React.StrictMode>
  );
})();
```

**Refactored Code:**
```javascript
(async () => {
  let isLoggedIn = false;

  try {
    isLoggedIn = await checkAuthStatus();
    console.log('Host Overview Auth Check:', { isLoggedIn });
  } catch (error) {
    console.error('Failed to check authentication status:', error);
    // Continue with isLoggedIn=false, let page handle unauthenticated state
  }

  createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <ErrorBoundary>
        <HostOverviewPage requireAuth={true} isAuthenticated={isLoggedIn} />
      </ErrorBoundary>
    </React.StrictMode>
  );
})();
```

**Testing:**
- [ ] Navigate to /host-overview when logged in
- [ ] Navigate to /host-overview when logged out
- [ ] Simulate network failure during auth check

~~~~~

### CHUNK 22: Move Async Auth to Component (Pattern Consistency)

**File:** `app/src/host-overview.jsx`
**Line:** 11-30
**Issue:** This is the ONLY entry point with async initialization. All other protected pages handle auth inside components/hooks.
**Affected Pages:** /host-overview

**Current Code:**
```javascript
// Async auth check in entry point - inconsistent with other pages
(async () => {
  const isLoggedIn = await checkAuthStatus();
  // ...
})();
```

**Refactored Code:**
```javascript
// host-overview.jsx - SIMPLIFIED (matches other entry points)
import React from 'react';
import { createRoot } from 'react-dom/client';
import HostOverviewPage from './islands/pages/HostOverviewPage/HostOverviewPage.jsx';
import { ErrorBoundary } from './islands/shared/ErrorBoundary';
import './styles/components/host-overview.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <HostOverviewPage />
    </ErrorBoundary>
  </React.StrictMode>
);

// Then move auth check INTO HostOverviewPage component or its usePageLogic hook
```

**Testing:**
- [ ] Verify /host-overview still requires authentication
- [ ] Verify auth modal appears for unauthenticated users
- [ ] Verify authenticated users see the page correctly

~~~~~

## PAGE GROUP: LIB INFRASTRUCTURE (Chunks: 23-28)

~~~~~

### CHUNK 23: Replace Hardcoded FK Mappings with Database Lookups

**File:** `app/src/lib/listingService.js`
**Line:** 490-603
**Issue:** FK ID mappings for cancellation policies, parking types, space types, and storage options are hardcoded. Database changes require code updates.
**Affected Pages:** /self-listing, /listing-dashboard

**Current Code:**
```javascript
function mapCancellationPolicyToId(policyName) {
  const policyMap = {
    'Standard': '1665431440883x653177548350901500',
    'Additional Host Restrictions': '1665431684611x656977293321267800',
    'Prior to First-Time Arrival': '1599791792265x281203802121463780',
    'After First-Time Arrival': '1599791785559x603327510287017500',
  };
  return !policyName ? policyMap['Standard'] : (policyMap[policyName] || policyMap['Standard']);
}
```

**Refactored Code:**
```javascript
import { getAllCancellationPolicies } from './dataLookups.js';

// Cache for lookup results
let cancellationPolicyCache = null;

async function mapCancellationPolicyToId(policyName) {
  if (!cancellationPolicyCache) {
    cancellationPolicyCache = await getAllCancellationPolicies();
  }

  const policy = cancellationPolicyCache.find(p => p.display === policyName);
  const defaultPolicy = cancellationPolicyCache.find(p => p.display === 'Standard');

  return policy?._id || defaultPolicy?._id || null;
}

// Apply same pattern to:
// - mapParkingTypeToId
// - mapSpaceTypeToId
// - mapStorageOptionToId
```

**Testing:**
- [ ] Create new listing with all policy types
- [ ] Verify correct FK IDs are saved to database
- [ ] Test with newly added policy types in database

~~~~~

### CHUNK 24: Add Geo Lookup Validation with Warning

**File:** `app/src/lib/listingService.js`
**Line:** 209-218
**Issue:** If `getGeoIdsByZipCode` returns null IDs, listing is created without location data. Should warn user.
**Affected Pages:** /self-listing

**Current Code:**
```javascript
const zipCode = formData.spaceSnapshot?.address?.zip;
let boroughId = null;
let hoodId = null;

if (zipCode) {
  logger.debug('[ListingService] Looking up borough/hood for zip:', zipCode);
  const geoIds = await getGeoIdsByZipCode(zipCode);
  boroughId = geoIds.boroughId;
  hoodId = geoIds.hoodId;
}

// No validation - nulls inserted silently
```

**Refactored Code:**
```javascript
const zipCode = formData.spaceSnapshot?.address?.zip;
let boroughId = null;
let hoodId = null;
let geoWarning = null;

if (zipCode) {
  logger.debug('[ListingService] Looking up borough/hood for zip:', zipCode);
  const geoIds = await getGeoIdsByZipCode(zipCode);
  boroughId = geoIds.boroughId;
  hoodId = geoIds.hoodId;

  if (!boroughId || !hoodId) {
    geoWarning = `Could not determine location for zip code ${zipCode}. Listing may not appear in location filters.`;
    logger.warn(`[ListingService] ⚠️ ${geoWarning}`);
  }
}

// Return warning with result so UI can display it
return {
  success: true,
  listingId: result._id,
  warning: geoWarning
};
```

**Testing:**
- [ ] Create listing with valid NYC zip code
- [ ] Create listing with invalid/unknown zip code
- [ ] Verify warning is displayed to user

~~~~~

### CHUNK 25: Add Debouncing to Draft Save

**File:** `app/src/lib/listingService.js`
**Line:** 1062-1070
**Issue:** `saveDraft()` saves directly without debouncing. If called on every input change, causes excessive database writes.
**Affected Pages:** /self-listing

**Current Code:**
```javascript
export async function saveDraft(formData, existingId = null) {
  logger.debug('[ListingService] Saving draft, existingId:', existingId);

  if (existingId) {
    return updateListing(existingId, { ...formData, isDraft: true });
  }
  return createListing({ ...formData, isDraft: true });
}
```

**Refactored Code:**
```javascript
// Add at top of file:
function debounce(fn, delay) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    return new Promise((resolve) => {
      timeoutId = setTimeout(async () => {
        resolve(await fn(...args));
      }, delay);
    });
  };
}

export async function saveDraft(formData, existingId = null) {
  logger.debug('[ListingService] Saving draft, existingId:', existingId);

  if (existingId) {
    return updateListing(existingId, { ...formData, isDraft: true });
  }
  return createListing({ ...formData, isDraft: true });
}

// Debounced version for auto-save (2 second delay)
export const saveDraftDebounced = debounce(saveDraft, 2000);
```

**Testing:**
- [ ] Type rapidly in draft form fields
- [ ] Verify only one save after 2 seconds of inactivity
- [ ] Verify data persists correctly

~~~~~

### CHUNK 26: Optimize CTA Config Cache Check

**File:** `app/src/lib/ctaConfig.js`
**Line:** 190-241
**Issue:** `getCTAConfig()` calls `fetchCTAConfig()` for every CTA type even when cache is valid. Should check cache first.
**Affected Pages:** ALL (CTAs on multiple pages)

**Current Code:**
```javascript
export async function getCTAConfig(ctaType) {
  const config = await fetchCTAConfig();  // Always fetches, even if cached
  return config.get(ctaType) || null;
}
```

**Refactored Code:**
```javascript
export async function getCTAConfig(ctaType) {
  // Check cache first before triggering fetch
  if (ctaConfigCache && cacheTimestamp && (Date.now() - cacheTimestamp < CACHE_TTL)) {
    return ctaConfigCache.get(ctaType) || null;
  }

  // Cache expired or doesn't exist, fetch fresh
  const config = await fetchCTAConfig();
  return config.get(ctaType) || null;
}
```

**Testing:**
- [ ] Load page with multiple CTAs
- [ ] Verify only one network request for CTA config
- [ ] Verify cache expires after TTL

~~~~~

### CHUNK 27: Optimize JSONB Parsing

**File:** `app/src/lib/listingDataFetcher.js`
**Line:** 30-52
**Issue:** `parseJsonField()` is called multiple times on data that Supabase already parses. JSONB fields are objects, not strings.
**Affected Pages:** /search, /view-split-lease, /listing-dashboard

**Current Code:**
```javascript
function parseJsonField(field) {
  if (!field) return [];
  if (Array.isArray(field)) return field;

  if (typeof field === 'string') {
    try {
      const parsed = JSON.parse(field);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error('Failed to parse JSONB field:', field, e);
      return [];
    }
  }
  return [];
}

// Called multiple times:
const embeddedPhotos = parseJsonField(listingData['Features - Photos']);
const amenitiesInUnit = getAmenities(parseJsonField(listingData['Features - Amenities In-Unit']));
```

**Refactored Code:**
```javascript
/**
 * Normalize a JSONB field to an array.
 * Supabase returns JSONB as already-parsed objects, so string parsing
 * is only needed for edge cases (direct API responses, legacy data).
 */
function normalizeJsonArray(field) {
  if (!field) return [];
  if (Array.isArray(field)) return field;

  // Handle edge case: double-encoded strings from legacy Bubble data
  if (typeof field === 'string') {
    try {
      const parsed = JSON.parse(field);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      // Not valid JSON, return empty array
      return [];
    }
  }

  // Object but not array - wrap in array or return empty
  return [];
}

// Memoize results for repeated calls on same data
const jsonFieldCache = new WeakMap();

function parseJsonField(field) {
  if (jsonFieldCache.has(field)) {
    return jsonFieldCache.get(field);
  }
  const result = normalizeJsonArray(field);
  if (field && typeof field === 'object') {
    jsonFieldCache.set(field, result);
  }
  return result;
}
```

**Testing:**
- [ ] Load /search page and verify photos display
- [ ] Verify amenities display correctly on listings
- [ ] Check no console errors for JSON parsing

~~~~~

### CHUNK 28: Fix Malformed JSDoc in Scheduling Calculators

**File:** `app/src/logic/calculators/scheduling/getNextOccurrenceOfDay.js`
**Line:** 4
**Issue:** JSDoc syntax is corrupted with file paths instead of proper `@param` syntax. Blocks documentation generation.
**Affected Pages:** AUTO

**Current Code:**
```javascript
/**
 * Get the next occurrence of a specific day of the week.
 *
 * @.claude\plans\Deprecated\Context\Option Sets\ZEP - Curation Parameters(OS).md {Date} startDate - The date to start from
 * @.claude\plans\Deprecated\Context\Option Sets\ZEP - Curation Parameters(OS).md {number} targetDay - Target day (0=Sunday, 6=Saturday)
 * @returns {Date} The next occurrence of the target day
 */
```

**Refactored Code:**
```javascript
/**
 * Get the next occurrence of a specific day of the week.
 *
 * @param {Date} startDate - The date to start from
 * @param {number} targetDay - Target day (0=Sunday, 6=Saturday)
 * @returns {Date} The next occurrence of the target day
 */
```

**Testing:**
- [ ] Run `bun run build` to verify no syntax errors
- [ ] Generate docs (if applicable) and verify JSDoc renders
- [ ] Verify IDE tooltips show correct parameter info

~~~~~

## Implementation Priority

### Phase 1: Critical Fixes (Do First)
1. **Chunk 1** - Remove duplicate processProposalData
2. **Chunk 2** - Add ErrorBoundary to house-manual.jsx
3. **Chunk 8** - Remove duplicate cancelProposalWorkflow
4. **Chunk 4** - Move React hook out of logic layer

### Phase 2: Performance Improvements
5. **Chunk 9** - Parallelize photo reorder
6. **Chunk 10** - Parallelize cover photo update
7. **Chunk 14** - Memoize transformed listings
8. **Chunk 16** - Extract Header inline functions

### Phase 3: Code Quality
9. **Chunk 3** - Remove duplicate CSS
10. **Chunk 6** - Add missing calculator exports
11. **Chunk 7** - Standardize entry points
12. **Chunk 18** - Consolidate schedule selector hooks

### Phase 4: Infrastructure
13. **Chunk 5** - Fix rate limiting
14. **Chunk 23** - Replace hardcoded FK mappings
15. **Chunk 26** - Optimize CTA cache
16. **Chunk 27** - Optimize JSONB parsing

### Phase 5: Cleanup
17. Remaining chunks (11-13, 17, 19-22, 24-25, 28)

---

## File References

All files referenced in this plan:

### Logic Layer
- `app/src/logic/processors/proposal/processProposalData.js` (DELETE)
- `app/src/logic/processors/proposals/processProposalData.js` (KEEP)
- `app/src/logic/workflows/booking/cancelProposalWorkflow.js` (DELETE)
- `app/src/logic/workflows/proposals/cancelProposalWorkflow.js` (KEEP)
- `app/src/logic/rules/proposals/useProposalButtonStates.js` (MOVE)
- `app/src/logic/calculators/index.js`
- `app/src/logic/calculators/scheduling/getNextOccurrenceOfDay.js`

### Lib Layer
- `app/src/lib/sanitize.js`
- `app/src/lib/listingService.js`
- `app/src/lib/ctaConfig.js`
- `app/src/lib/listingDataFetcher.js`

### Entry Points
- `app/src/house-manual.jsx`
- `app/src/listing-dashboard.jsx`
- `app/src/account-profile.jsx`
- `app/src/host-overview.jsx`

### Page Logic
- `app/src/islands/pages/ListingDashboardPage/hooks/usePhotoManagement.js`
- `app/src/islands/pages/ListingDashboardPage/hooks/useAIImportAssistant.js`
- `app/src/islands/pages/ListingDashboardPage/hooks/useListingData.js`
- `app/src/islands/pages/ListingDashboardPage/ListingDashboardPage.jsx`
- `app/src/islands/pages/SearchPage/useSearchPageLogic.js`
- `app/src/islands/pages/AccountProfilePage/useAccountProfilePageLogic.js`

### Shared Components
- `app/src/islands/shared/Header.jsx`
- `app/src/islands/shared/GoogleMap.jsx`
- `app/src/islands/shared/useScheduleSelector.js`
- `app/src/islands/shared/useScheduleSelectorLogicCore.js`

### Hooks
- `app/src/hooks/useAuthenticatedUser.js`

### Styles
- `app/src/styles/main.css`
