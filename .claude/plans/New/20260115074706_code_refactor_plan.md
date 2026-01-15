# Code Refactoring Plan - app

**Date:** 2026-01-15
**Audit Type:** General (performance, maintainability, duplication, anti-patterns)
**Files Audited:** app/src/**
**Total Issues Found:** 14
**Severity Breakdown:** HIGH: 2 | MEDIUM: 9 | LOW: 3

---

## PAGE GROUP: GLOBAL (All Pages) (Chunks: 1, 2, 3)

These issues affect all pages in the application.

~~~~~

### CHUNK 1: Remove debug export exposing auth tokens
**File:** app/src/lib/secureStorage.js
**Line:** 354
**Issue:** Security vulnerability - Debug export `__DEV__.dumpSecureStorage()` exposes raw auth tokens in production
**Severity:** HIGH
**Affected Pages:** All pages

**Current Code:**
```javascript
/**
 * Export for debugging (REMOVE IN PRODUCTION)
 */
export const __DEV__ = {
  dumpSecureStorage() {
    return {
      token: getAuthToken(),
      sessionId: getSessionId(),
      refreshData: getRefreshData()
    };
  }
};
```

**Refactored Code:**
```javascript
/**
 * Debug utilities - only available in development mode
 */
export const __DEV__ = import.meta.env.DEV ? {
  dumpSecureStorage() {
    return {
      token: getAuthToken(),
      sessionId: getSessionId(),
      refreshData: getRefreshData()
    };
  }
} : {};
```

**Testing:**
- [ ] Verify `__DEV__.dumpSecureStorage` returns data in dev mode (`bun run dev`)
- [ ] Verify `__DEV__` is empty object `{}` in production build (`bun run build && bun run preview`)
- [ ] Check no auth tokens appear in browser console in production

~~~~~

### CHUNK 2: Remove backup/duplicate files with (1) suffix
**File:** Multiple files
**Line:** N/A
**Issue:** Accidental backup files polluting the codebase
**Severity:** MEDIUM
**Affected Pages:** All pages

**Current Code:**
```
Files to delete:
- app/src/lib/proposalDataFetcher (1).js
- app/src/lib/secureStorage (1).js
- app/src/islands/shared/AuthAwareSearchScheduleSelector (1).jsx
- app/src/islands/shared/AuthAwareSearchScheduleSelector (1) (1).jsx
- app/src/islands/shared/EditPhoneNumberModal (1).jsx (if exists)
- app/src/islands/shared/NotificationSettingsModal (1).jsx (if exists)
```

**Refactored Code:**
```bash
# Delete all backup files (run from project root)
rm "app/src/lib/proposalDataFetcher (1).js"
rm "app/src/lib/secureStorage (1).js"
rm "app/src/islands/shared/AuthAwareSearchScheduleSelector (1).jsx"
rm "app/src/islands/shared/AuthAwareSearchScheduleSelector (1) (1).jsx"
# Delete any other files matching pattern: *\ \(1\)*.js or *\ \(1\)*.jsx
```

**Testing:**
- [ ] Run `bun run build` to ensure no imports reference deleted files
- [ ] Verify app loads correctly on all major pages
- [ ] Check git status shows only deletions, no untracked (1) files remain

~~~~~

### CHUNK 3: Replace excessive console.log with conditional logger
**File:** app/src/lib/auth.js
**Line:** Multiple (93+ occurrences)
**Issue:** Excessive debug logging in production affects performance and leaks auth flow details
**Severity:** MEDIUM
**Affected Pages:** All authenticated pages

**Current Code:**
```javascript
// Scattered throughout auth.js
console.log('[Auth] validateAndSetAuth: Starting validation');
console.log('[Auth] Token found:', token ? 'yes' : 'no');
console.log('[Auth] Session validated:', session);
// ... 90+ more console.log statements
```

**Refactored Code:**
```javascript
// At top of auth.js, add:
const DEBUG_AUTH = import.meta.env.DEV;
const log = (...args) => DEBUG_AUTH && console.log(...args);

// Then replace all console.log with log:
log('[Auth] validateAndSetAuth: Starting validation');
log('[Auth] Token found:', token ? 'yes' : 'no');
log('[Auth] Session validated:', session);
```

**Testing:**
- [ ] Verify auth logging appears in dev mode
- [ ] Verify NO auth logging appears in production build
- [ ] Test login/logout flow works correctly
- [ ] Test session restoration on page refresh

~~~~~

## PAGE GROUP: /guest-proposals, /host-proposals (Chunks: 4, 5, 6)

~~~~~

### CHUNK 4: Consolidate duplicate processProposalData.js files
**File:** app/src/logic/processors/proposal/processProposalData.js AND app/src/logic/processors/proposals/processProposalData.js
**Line:** 1
**Issue:** Two different implementations of processProposalData exist - causes confusion and inconsistent behavior
**Severity:** HIGH
**Affected Pages:** /guest-proposals, /host-proposals, /view-split-lease

**Current Code:**
```
Directory structure showing duplication:
app/src/logic/processors/
├── proposal/
│   └── processProposalData.js    ← Handles single proposal with counteroffer merging
└── proposals/
    └── processProposalData.js    ← Contains processUserData, processListingData, etc.
```

**Refactored Code:**
```
Consolidated structure:
app/src/logic/processors/
└── proposals/
    ├── processProposalData.js    ← Keep: main proposal processor with counteroffer logic
    ├── processUserData.js        ← Extract from old proposals/ file
    └── processListingData.js     ← Extract from old proposals/ file

# Delete: app/src/logic/processors/proposal/ directory entirely
# Update: app/src/logic/processors/index.js to export from proposals/
```

**Testing:**
- [ ] Update all imports from `logic/processors/proposal/` to `logic/processors/proposals/`
- [ ] Run `bun run build` to catch any broken imports
- [ ] Test /guest-proposals page loads and displays proposals
- [ ] Test /host-proposals page loads and displays proposals
- [ ] Test proposal detail modals open correctly

~~~~~

### CHUNK 5: Remove duplicate proposalStages.js
**File:** app/src/lib/constants/proposalStages.js
**Line:** 1
**Issue:** Duplicate file exists in lib/constants/ and logic/constants/ violating four-layer architecture
**Severity:** MEDIUM
**Affected Pages:** /guest-proposals, /host-proposals

**Current Code:**
```javascript
// Duplicate exists at two locations:
// app/src/lib/constants/proposalStages.js
// app/src/logic/constants/proposalStages.js (canonical location per architecture)
```

**Refactored Code:**
```javascript
// 1. Delete: app/src/lib/constants/proposalStages.js

// 2. Update any imports from lib/constants/proposalStages to logic/constants/proposalStages:
// Before:
import { PROPOSAL_STAGES } from '../../lib/constants/proposalStages.js';

// After:
import { PROPOSAL_STAGES } from '../../logic/constants/proposalStages.js';
```

**Testing:**
- [ ] Search for imports: `grep -r "lib/constants/proposalStages" app/src/`
- [ ] Update all found imports to use logic/constants/
- [ ] Run `bun run build` to verify no broken imports
- [ ] Test proposal stage badges render correctly

~~~~~

### CHUNK 6: Optimize getStageById with O(1) lookup
**File:** app/src/logic/constants/proposalStages.js
**Line:** 72
**Issue:** Array.find() used on every call instead of O(1) object lookup
**Severity:** LOW
**Affected Pages:** /guest-proposals, /host-proposals

**Current Code:**
```javascript
/**
 * Get stage configuration by ID
 * @param {number} stageId - Stage ID (1-6)
 * @returns {Object|null} Stage configuration object or null if not found
 */
export function getStageById(stageId) {
  if (!stageId || stageId < 1 || stageId > 6) {
    return null;
  }
  return PROPOSAL_STAGES.find(s => s.id === stageId) || null;
}
```

**Refactored Code:**
```javascript
// Create lookup map once at module load (after PROPOSAL_STAGES definition)
const STAGES_BY_ID = Object.fromEntries(
  PROPOSAL_STAGES.map(stage => [stage.id, stage])
);

/**
 * Get stage configuration by ID
 * @param {number} stageId - Stage ID (1-6)
 * @returns {Object|null} Stage configuration object or null if not found
 */
export function getStageById(stageId) {
  if (!stageId || stageId < 1 || stageId > 6) {
    return null;
  }
  return STAGES_BY_ID[stageId] || null;
}
```

**Testing:**
- [ ] Verify getStageById(1) returns stage 1 config
- [ ] Verify getStageById(6) returns stage 6 config
- [ ] Verify getStageById(0) returns null
- [ ] Verify getStageById(7) returns null
- [ ] Test proposal stage badges render correctly on /guest-proposals

~~~~~

## PAGE GROUP: /search, /view-split-lease, /favorite-listings (Chunks: 7, 8, 9)

~~~~~

### CHUNK 7: Remove verbose GoogleMap render logging
**File:** app/src/islands/shared/GoogleMap.jsx
**Line:** 122
**Issue:** Detailed console.log on every render creates performance overhead and console spam
**Severity:** MEDIUM
**Affected Pages:** /search, /view-split-lease, /favorite-listings

**Current Code:**
```javascript
}, ref) => {
  console.log('🗺️ GoogleMap: Component rendered with props:', {
    listingsCount: listings.length,
    filteredListingsCount: filteredListings.length,
    selectedBorough,
    hasMessageCallback: !!onMessageClick,
    messageCallbackType: typeof onMessageClick,
    listingsSample: listings.slice(0, 2).map(l => ({
      id: l.id,
      title: l.title,
      coordinates: l.coordinates,
      hasValidCoords: !!(l.coordinates?.lat && l.coordinates?.lng)
    })),
    filteredListingsSample: filteredListings.slice(0, 2).map(l => ({
      id: l.id,
      title: l.title,
      coordinates: l.coordinates,
      hasValidCoords: !!(l.coordinates?.lat && l.coordinates?.lng)
    }))
  });
```

**Refactored Code:**
```javascript
}, ref) => {
  // Debug logging removed - use React DevTools for component inspection
  // To enable temporarily: const DEBUG_MAP = true; if (DEBUG_MAP) console.log(...)
```

**Testing:**
- [ ] Open /search page with map visible
- [ ] Verify no GoogleMap console.log spam appears
- [ ] Verify map renders listings correctly
- [ ] Verify map markers are clickable
- [ ] Test filtering updates map correctly

~~~~~

### CHUNK 8: Consolidate price calculation functions
**File:** app/src/lib/priceCalculations.js
**Line:** 1
**Issue:** Price calculations exist in both lib/priceCalculations.js and logic/calculators/pricing/, violating four-layer architecture
**Severity:** MEDIUM
**Affected Pages:** /view-split-lease, /search, /self-listing

**Current Code:**
```javascript
// app/src/lib/priceCalculations.js exports:
export function calculate4WeekRent(...) { ... }
export function calculateReservationTotal(...) { ... }
export function getNightlyPriceForNights(...) { ... }
export function calculatePricingBreakdown(...) { ... }

// Duplicated/similar in logic/calculators/pricing/:
// - calculateFourWeekRent.js
// - calculateReservationTotal.js
// - etc.
```

**Refactored Code:**
```javascript
// app/src/lib/priceCalculations.js - Convert to re-export facade
/**
 * @deprecated Use imports from logic/calculators/pricing/ directly
 * This file remains for backwards compatibility during migration
 */
export { calculateFourWeekRent as calculate4WeekRent } from '../logic/calculators/pricing/calculateFourWeekRent.js';
export { calculateReservationTotal } from '../logic/calculators/pricing/calculateReservationTotal.js';
// ... map other exports

// Then gradually update consumers to import from logic/calculators/pricing/ directly
```

**Testing:**
- [ ] Search for imports: `grep -r "lib/priceCalculations" app/src/`
- [ ] Verify re-exports work correctly
- [ ] Test pricing displays on /view-split-lease
- [ ] Test pricing in proposal flow
- [ ] Gradually migrate direct imports in future PRs

~~~~~

### CHUNK 9: Remove duplicate fetchInformationalTexts in SearchPage
**File:** app/src/islands/pages/SearchPage.jsx
**Line:** 37
**Issue:** fetchInformationalTexts function duplicated inline when it exists in lib/informationalTextsFetcher.js
**Severity:** LOW
**Affected Pages:** /search

**Current Code:**
```javascript
// SearchPage.jsx - inline function
async function fetchInformationalTexts() {
  const { data, error } = await supabase
    .from('informationaltexts')
    .select('*');
  // ... implementation
}
```

**Refactored Code:**
```javascript
// SearchPage.jsx - import from shared module
import { fetchInformationalTexts } from '../../lib/informationalTextsFetcher.js';

// Remove the inline function definition
// Use the imported function directly
```

**Testing:**
- [ ] Verify informational text popups work on /search page
- [ ] Test clicking `?` icons opens correct text
- [ ] Verify no console errors related to informational texts

~~~~~

## PAGE GROUP: All Pages with Header (Chunks: 10)

~~~~~

### CHUNK 10: Replace setTimeout polling with onAuthStateChange listener
**File:** app/src/islands/shared/Header.jsx
**Line:** 57-84
**Issue:** Auth validation uses setTimeout polling instead of Supabase's event-based onAuthStateChange
**Severity:** MEDIUM
**Affected Pages:** All pages with Header component

**Current Code:**
```javascript
useEffect(() => {
  const token = getAuthToken();

  const performBackgroundValidation = async () => {
    let hasSupabaseSession = false;
    let session = null;
    try {
      const { data } = await supabase.auth.getSession();
      session = data?.session;
      hasSupabaseSession = !!session;

      // If no session on first check, wait briefly for Supabase to initialize
      if (!hasSupabaseSession) {
        console.log('[Header] No immediate Supabase session, waiting briefly for initialization...');
        await new Promise(resolve => setTimeout(resolve, 200));
        const { data: retryData } = await supabase.auth.getSession();
        session = retryData?.session;
        hasSupabaseSession = !!session;
        if (hasSupabaseSession) {
          console.log('[Header] ✅ Found Supabase session after brief wait');
```

**Refactored Code:**
```javascript
useEffect(() => {
  let isMounted = true;

  // Use Supabase's built-in auth state listener instead of polling
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    async (event, session) => {
      if (!isMounted) return;

      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
        if (session) {
          // Session is ready, perform validation
          await performValidation(session);
        }
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
      }
    }
  );

  // Also check for existing session immediately (in case listener was set up after init)
  const checkExistingSession = async () => {
    const { data } = await supabase.auth.getSession();
    if (data?.session && isMounted) {
      await performValidation(data.session);
    }
  };
  checkExistingSession();

  return () => {
    isMounted = false;
    subscription.unsubscribe();
  };
}, []);
```

**Testing:**
- [ ] Test fresh page load - user should appear logged in without flicker
- [ ] Test login flow - header should update immediately after login
- [ ] Test logout flow - header should update immediately after logout
- [ ] Test page refresh with active session - no 200ms delay visible
- [ ] Test incognito mode - no console errors for missing session

~~~~~

## PAGE GROUP: /guest-proposals (Chunks: 11)

~~~~~

### CHUNK 11: Remove duplicate useGuestProposalsPageLogic.js
**File:** app/src/islands/pages/useGuestProposalsPageLogic.js AND app/src/islands/pages/proposals/useGuestProposalsPageLogic.js
**Line:** 1
**Issue:** Same hook file exists in two locations
**Severity:** MEDIUM
**Affected Pages:** /guest-proposals

**Current Code:**
```
Duplicate files:
- app/src/islands/pages/useGuestProposalsPageLogic.js
- app/src/islands/pages/proposals/useGuestProposalsPageLogic.js
```

**Refactored Code:**
```
Keep only: app/src/islands/pages/proposals/useGuestProposalsPageLogic.js

Update GuestProposalsPage.jsx import:
// Before (if importing from pages/):
import { useGuestProposalsPageLogic } from './useGuestProposalsPageLogic.js';

// After:
import { useGuestProposalsPageLogic } from './proposals/useGuestProposalsPageLogic.js';

Delete: app/src/islands/pages/useGuestProposalsPageLogic.js
```

**Testing:**
- [ ] Verify GuestProposalsPage.jsx imports from correct location
- [ ] Run `bun run build` to catch any broken imports
- [ ] Test /guest-proposals page loads correctly
- [ ] Test proposal cards render with correct data
- [ ] Test proposal detail modal opens correctly

~~~~~

## PAGE GROUP: /search (Chunks: 12)

~~~~~

### CHUNK 12: Optimize URL parsing in CompactScheduleIndicator
**File:** app/src/islands/pages/SearchPage.jsx (CompactScheduleIndicator component)
**Line:** 72
**Issue:** URLSearchParams parsed on every render instead of receiving selectedDays as prop
**Severity:** LOW
**Affected Pages:** /search

**Current Code:**
```javascript
// Inside CompactScheduleIndicator component
const urlParams = new URLSearchParams(window.location.search);
const daysSelected = urlParams.get('days-selected') || '';
```

**Refactored Code:**
```javascript
// Option A: Receive as prop from parent (preferred)
function CompactScheduleIndicator({ selectedDays, onClick }) {
  // Use selectedDays directly instead of parsing URL
}

// Option B: Use useMemo if must remain self-contained
function CompactScheduleIndicator({ onClick }) {
  const daysSelected = useMemo(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('days-selected') || '';
  }, [window.location.search]); // Note: location.search should come from a hook/prop
}
```

**Testing:**
- [ ] Verify compact schedule indicator shows correct days
- [ ] Test clicking indicator opens schedule selector
- [ ] Test changing days updates indicator correctly
- [ ] Profile component to verify reduced re-render overhead

~~~~~

## Summary

| Priority | Chunk | Issue | Severity |
|----------|-------|-------|----------|
| 1 | CHUNK 1 | Security: Debug export exposing auth tokens | HIGH |
| 2 | CHUNK 4 | Duplicate processProposalData.js with different implementations | HIGH |
| 3 | CHUNK 2 | Remove backup files with (1) suffix | MEDIUM |
| 4 | CHUNK 3 | Replace console.log with conditional logger in auth.js | MEDIUM |
| 5 | CHUNK 5 | Remove duplicate proposalStages.js | MEDIUM |
| 6 | CHUNK 7 | Remove verbose GoogleMap render logging | MEDIUM |
| 7 | CHUNK 8 | Consolidate price calculation functions | MEDIUM |
| 8 | CHUNK 10 | Replace setTimeout polling with onAuthStateChange | MEDIUM |
| 9 | CHUNK 11 | Remove duplicate useGuestProposalsPageLogic.js | MEDIUM |
| 10 | CHUNK 6 | Optimize getStageById with O(1) lookup | LOW |
| 11 | CHUNK 9 | Remove duplicate fetchInformationalTexts | LOW |
| 12 | CHUNK 12 | Optimize URL parsing in CompactScheduleIndicator | LOW |

---

## File References

**Files to DELETE:**
- `app/src/lib/proposalDataFetcher (1).js`
- `app/src/lib/secureStorage (1).js`
- `app/src/islands/shared/AuthAwareSearchScheduleSelector (1).jsx`
- `app/src/islands/shared/AuthAwareSearchScheduleSelector (1) (1).jsx`
- `app/src/lib/constants/proposalStages.js`
- `app/src/logic/processors/proposal/` (entire directory)
- `app/src/islands/pages/useGuestProposalsPageLogic.js`

**Files to MODIFY:**
- `app/src/lib/secureStorage.js` (CHUNK 1)
- `app/src/lib/auth.js` (CHUNK 3)
- `app/src/logic/constants/proposalStages.js` (CHUNK 6)
- `app/src/islands/shared/GoogleMap.jsx` (CHUNK 7)
- `app/src/lib/priceCalculations.js` (CHUNK 8)
- `app/src/islands/pages/SearchPage.jsx` (CHUNK 9, 12)
- `app/src/islands/shared/Header.jsx` (CHUNK 10)
- `app/src/logic/processors/index.js` (CHUNK 4)

**Files to VERIFY imports:**
- All files importing from `logic/processors/proposal/`
- All files importing from `lib/constants/proposalStages`
- `app/src/islands/pages/GuestProposalsPage.jsx`
