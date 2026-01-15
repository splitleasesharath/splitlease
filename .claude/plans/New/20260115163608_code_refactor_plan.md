# Code Refactoring Plan - app

Date: 2026-01-15
Audit Type: general

~~~~~

## PAGE GROUP: AUTO (Global/Utility Files)

### CHUNK 1: Remove Production Console Logs from config.js
**File:** app/src/lib/config.js
**Line:** 57-61
**Issue:** Production code contains debug console.log statements that expose configuration details and add noise to console output. These should be removed or converted to debug-only logging.
**Affected Pages:** AUTO (all pages that load this config)

**Current Code:**
```javascript
// Log configuration loaded (useful for debugging)
console.log('✅ Environment configuration loaded');
console.log('  Environment:', window.ENV.ENVIRONMENT);
console.log('  Google Maps API Key:', window.ENV.GOOGLE_MAPS_API_KEY ?
  window.ENV.GOOGLE_MAPS_API_KEY.substring(0, 20) + '...' : 'NOT SET');
console.log('  Supabase URL:', window.ENV.SUPABASE_URL || 'NOT SET');
```

**Refactored Code:**
```javascript
// Only log in development mode
if (window.ENV.ENVIRONMENT === 'development') {
  console.log('✅ Environment configuration loaded');
  console.log('  Environment:', window.ENV.ENVIRONMENT);
  console.log('  Google Maps API Key:', window.ENV.GOOGLE_MAPS_API_KEY ?
    window.ENV.GOOGLE_MAPS_API_KEY.substring(0, 20) + '...' : 'NOT SET');
  console.log('  Supabase URL:', window.ENV.SUPABASE_URL || 'NOT SET');
}
```

**Testing:**
- [ ] Run dev server and verify logs appear in development
- [ ] Build and preview production - verify logs do not appear

~~~~~

### CHUNK 2: Remove Duplicate Files - Clean Up Legacy Copies
**File:** Multiple files with (1), (2) suffixes
**Line:** N/A (entire files)
**Issue:** 13 duplicate files exist with parenthetical suffixes indicating copy-paste remnants. These create confusion, potential import errors, and technical debt.
**Affected Pages:** AUTO

**Files to Delete:**
```
app/src/islands/modals/EditPhoneNumberModal (1) (1).jsx
app/src/islands/modals/EditPhoneNumberModal (1).jsx
app/src/islands/modals/NotificationSettingsModal (1).jsx
app/src/islands/shared/AuthAwareSearchScheduleSelector (1) (1).jsx
app/src/islands/shared/AuthAwareSearchScheduleSelector (1).jsx
app/src/lib/proposalDataFetcher (1).js
app/src/lib/secureStorage (1).js
app/src/lib/SECURE_AUTH_README (1).md
app/src/styles/components/create-listing-modal (1) (1).css
app/src/styles/components/create-listing-modal (1).css
app/src/styles/components/create-listing-modal (2).css
app/src/islands/shared/CreateDuplicateListingModal (1).README.md
app/src/islands/shared/CreateDuplicateListingModal (1).jsx
```

**Current Code:**
```javascript
// Files exist as duplicates - no single code block
```

**Refactored Code:**
```javascript
// Delete all files with (1), (2) etc. suffixes
// Ensure no imports reference these duplicate files first
```

**Testing:**
- [ ] Run `bun run build` to verify no import errors
- [ ] Search codebase for imports referencing these files
- [ ] Run dev server and test affected pages

~~~~~

## PAGE GROUP: /host-overview (Chunks: 3)

### CHUNK 3: Remove Debug Console Logs from host-overview.jsx
**File:** app/src/host-overview.jsx
**Line:** 12-17
**Issue:** Entry point contains verbose debug console.log statements that should not appear in production. These log authentication state on every page load.
**Affected Pages:** /host-overview

**Current Code:**
```javascript
  console.log('Host Overview Auth Check:', { isLoggedIn });

  if (!isLoggedIn) {
    console.log('User not authenticated - will show auth modal');
  } else {
    console.log('User authenticated - rendering Host Overview page');
  }
```

**Refactored Code:**
```javascript
  // Auth state logging removed - use browser DevTools for debugging
  // The AuthModal component handles unauthenticated state display
```

**Testing:**
- [ ] Load /host-overview when logged out - verify auth modal appears
- [ ] Load /host-overview when logged in - verify page renders
- [ ] Verify console is clean of debug logs

~~~~~

## PAGE GROUP: /self-listing, /listing-dashboard, /view-split-lease (Chunks: 4, 5)

### CHUNK 4: Remove Excessive Console Logs from aiService.js
**File:** app/src/lib/aiService.js
**Line:** 28, 53, 75, 144, 168, 194, 211, 220, 242
**Issue:** AI service contains 9+ console.log statements that log sensitive data including listing details, AI prompts, and generated content. These should use a proper logger with conditional output.
**Affected Pages:** /self-listing, /listing-dashboard, EditListingDetails modal

**Current Code:**
```javascript
export async function generateListingDescription(listingData) {
  console.log('[aiService] Generating listing description with data:', listingData);
  // ... more code ...
  console.log('[aiService] Calling ai-gateway with variables:', variables);
  // ... more code ...
  console.log('[aiService] Generated description:', data.data?.content);
  return data.data?.content || '';
}
```

**Refactored Code:**
```javascript
import { logger } from './logger.js';

export async function generateListingDescription(listingData) {
  logger.debug('[aiService] Generating listing description', {
    listingName: listingData.listingName
  });
  // ... more code ...
  logger.debug('[aiService] Called ai-gateway');
  // ... more code ...
  logger.debug('[aiService] Generated description', {
    length: data.data?.content?.length
  });
  return data.data?.content || '';
}
```

**Testing:**
- [ ] Test AI description generation in self-listing flow
- [ ] Verify no sensitive data logged in production
- [ ] Verify debug logs work in development mode

~~~~~

### CHUNK 5: Remove Excessive Console Logs from bubbleAPI.js
**File:** app/src/lib/bubbleAPI.js
**Line:** 39-41, 67, 84-85, 110, 130-132, 162, 183-186
**Issue:** Bubble API client logs every request with sensitive data including user emails and listing IDs. Production code should not expose this information.
**Affected Pages:** /self-listing (listing creation)

**Current Code:**
```javascript
export async function createListingInCode(listingName, userEmail = null) {
  console.log('[Bubble API] Creating listing via Edge Function');
  console.log('[Bubble API] Listing name:', listingName);
  console.log('[Bubble API] User email:', userEmail || 'Not provided (logged out)');
  // ... more code ...
    console.log('[Bubble API] ✅ Listing created and synced:', data.data);
```

**Refactored Code:**
```javascript
import { logger } from './logger.js';

export async function createListingInCode(listingName, userEmail = null) {
  logger.debug('[Bubble API] Creating listing', { hasEmail: !!userEmail });
  // ... more code ...
    logger.debug('[Bubble API] Listing created', { id: data.data?.id });
```

**Testing:**
- [ ] Create a new listing via /self-listing
- [ ] Verify no PII logged in production console
- [ ] Verify listing syncs correctly to Bubble

~~~~~

## PAGE GROUP: /search, /view-split-lease, /why-split-lease, /favorite-listings, / (Chunks: 6)

### CHUNK 6: Remove Excessive Console Logs from dataLookups.js
**File:** app/src/lib/dataLookups.js
**Line:** 82, 108, 133, 162, 168, 198, 224, 251, 277, 307, 334, 370-371
**Issue:** Data lookup initialization logs cache sizes for every data type. This creates 12+ log entries on every page load that uses lookups.
**Affected Pages:** /search, /view-split-lease, /why-split-lease, /favorite-listings, / (homepage)

**Current Code:**
```javascript
async function initializeBoroughLookups() {
  try {
    // ... fetch code ...
      console.log(`Cached ${lookupCache.boroughs.size} boroughs`);
    }
  }
}
// Similar console.log in 11 other initialize* functions
```

**Refactored Code:**
```javascript
import { logger } from './logger.js';

async function initializeBoroughLookups() {
  try {
    // ... fetch code ...
      logger.debug(`Cached ${lookupCache.boroughs.size} boroughs`);
    }
  }
}

// In initializeLookups():
export async function initializeLookups() {
  // ... existing code ...
  lookupCache.initialized = true;
  logger.info('Data lookups initialized', {
    boroughs: lookupCache.boroughs.size,
    neighborhoods: lookupCache.neighborhoods.size,
    propertyTypes: lookupCache.propertyTypes.size,
    // ... etc
  });
}
```

**Testing:**
- [ ] Load /search and verify lookups initialize silently in production
- [ ] Verify all lookup data is correctly fetched
- [ ] Check debug logs appear in development mode only

~~~~~

## PAGE GROUP: AUTO (Code Duplication)

### CHUNK 7: Consolidate Duplicate availabilityValidation Functions
**File:** app/src/lib/availabilityValidation.js
**Line:** 26-77 (isContiguousSelection), 87-153 (calculateCheckInOutDays), 341+ (calculateNightsFromDays)
**Issue:** Three critical functions are duplicated between lib/availabilityValidation.js and logic/calculators/scheduling/. This violates DRY principle and creates maintenance burden. The logic layer should be the single source of truth.
**Affected Pages:** AUTO (any page using schedule validation)

**Duplicate Locations:**
- `lib/availabilityValidation.js:26` - isContiguousSelection
- `logic/calculators/scheduling/isContiguousSelection.js:8` - isContiguousSelection
- `lib/availabilityValidation.js:87` - calculateCheckInOutDays
- `logic/calculators/scheduling/calculateCheckInOutDays.js:27` - calculateCheckInOutDays
- `lib/availabilityValidation.js:341` - calculateNightsFromDays
- `logic/calculators/scheduling/calculateNightsFromDays.js:19` - calculateNightsFromDays

**Current Code:**
```javascript
// lib/availabilityValidation.js - DUPLICATE
export function isContiguousSelection(selectedDays) {
  if (!selectedDays || selectedDays.length === 0) return false;
  if (selectedDays.length === 1) return true;
  // ... 50+ lines of logic ...
}
```

**Refactored Code:**
```javascript
// lib/availabilityValidation.js - RE-EXPORT from logic layer
export {
  isContiguousSelection
} from '../logic/calculators/scheduling/isContiguousSelection.js';

export {
  calculateCheckInOutDays
} from '../logic/calculators/scheduling/calculateCheckInOutDays.js';

export {
  calculateNightsFromDays
} from '../logic/calculators/scheduling/calculateNightsFromDays.js';

// Keep unique functions like validateScheduleSelection, isDateBlocked, etc.
```

**Testing:**
- [ ] Run all pages that import from availabilityValidation.js
- [ ] Verify schedule selection works correctly on /view-split-lease
- [ ] Test wrap-around day selection (Fri-Sun-Mon)

~~~~~

## PAGE GROUP: /view-split-lease, /guest-proposals, /host-proposals (Chunks: 8)

### CHUNK 8: Optimize map().filter() Chain to filter().map()
**File:** app/src/islands/pages/ViewSplitLeasePage.jsx
**Line:** 878
**Issue:** Using .map().filter() is less performant than .filter().map() because it creates intermediate array elements that are then discarded. Filter first to reduce the number of map operations.
**Affected Pages:** /view-split-lease

**Current Code:**
```javascript
const numbers = dayNames.map(name => dayNameMap[name]).filter(num => num !== undefined);
```

**Refactored Code:**
```javascript
const numbers = dayNames.filter(name => dayNameMap[name] !== undefined).map(name => dayNameMap[name]);
```

**Testing:**
- [ ] Load /view-split-lease with a listing that has day schedule
- [ ] Verify day numbers display correctly
- [ ] No functional change expected - performance micro-optimization

~~~~~

### CHUNK 9: Optimize map().filter() Chain - ViewSplitLeasePage Component
**File:** app/src/islands/pages/ViewSplitLeasePage/ViewSplitLeasePage.jsx
**Line:** 486
**Issue:** Same pattern as Chunk 8 - map().filter() should be filter().map() for performance.
**Affected Pages:** /view-split-lease

**Current Code:**
```javascript
const numbers = dayNames.map(name => dayNameMap[name]).filter(num => num !== undefined);
```

**Refactored Code:**
```javascript
const numbers = dayNames.filter(name => dayNameMap[name] !== undefined).map(name => dayNameMap[name]);
```

**Testing:**
- [ ] Load /view-split-lease and verify schedule display

~~~~~

### CHUNK 10: Optimize map().filter() Chain - DaysSelectionSection
**File:** app/src/islands/shared/CreateProposalFlowV2Components/DaysSelectionSection.jsx
**Line:** 132
**Issue:** Same performance anti-pattern in proposal creation flow.
**Affected Pages:** /view-split-lease (proposal modal)

**Current Code:**
```javascript
const numbers = dayNames.map(name => dayNameMap[name]).filter(num => num !== undefined);
```

**Refactored Code:**
```javascript
const numbers = dayNames.filter(name => dayNameMap[name] !== undefined).map(name => dayNameMap[name]);
```

**Testing:**
- [ ] Open proposal creation modal on /view-split-lease
- [ ] Select days and verify calculation works

~~~~~

### CHUNK 11: Optimize map().filter() Chain - PreviewSplitLeasePage
**File:** app/src/islands/pages/PreviewSplitLeasePage.jsx
**Line:** 708
**Issue:** Same performance anti-pattern in preview page.
**Affected Pages:** /preview-split-lease

**Current Code:**
```javascript
const numbers = dayNames.map(name => dayNameMap[name]).filter(num => num !== undefined);
```

**Refactored Code:**
```javascript
const numbers = dayNames.filter(name => dayNameMap[name] !== undefined).map(name => dayNameMap[name]);
```

**Testing:**
- [ ] Load /preview-split-lease/:id with a listing
- [ ] Verify schedule displays correctly

~~~~~

## PAGE GROUP: /host-proposals (Chunks: 12, 13)

### CHUNK 12: Optimize map().filter() Chain - HostProposalsPageLogic (Guest IDs)
**File:** app/src/islands/pages/HostProposalsPage/useHostProposalsPageLogic.js
**Line:** 395
**Issue:** Guest ID extraction uses map().filter() pattern. Should filter first.
**Affected Pages:** /host-proposals

**Current Code:**
```javascript
const guestIds = [...new Set(proposals.map(p => p.Guest).filter(Boolean))];
```

**Refactored Code:**
```javascript
const guestIds = [...new Set(proposals.filter(p => p.Guest).map(p => p.Guest))];
```

**Testing:**
- [ ] Load /host-proposals with proposals that have guests
- [ ] Verify guest information loads correctly

~~~~~

### CHUNK 13: Optimize map().filter() Chain - HostProposalsPageLogic (VM IDs)
**File:** app/src/islands/pages/HostProposalsPage/useHostProposalsPageLogic.js
**Line:** 415
**Issue:** Virtual meeting ID extraction uses map().filter() pattern.
**Affected Pages:** /host-proposals

**Current Code:**
```javascript
const vmIds = [...new Set(proposals.map(p => p['virtual meeting']).filter(Boolean))];
```

**Refactored Code:**
```javascript
const vmIds = [...new Set(proposals.filter(p => p['virtual meeting']).map(p => p['virtual meeting']))];
```

**Testing:**
- [ ] Load /host-proposals with proposals that have virtual meetings
- [ ] Verify meeting information loads

~~~~~

## PAGE GROUP: AUTO (Shared Queries)

### CHUNK 14: Optimize Multiple map().filter() Chains - userProposalQueries.js
**File:** app/src/lib/proposals/userProposalQueries.js
**Line:** 162, 254, 255, 330, 360, 420
**Issue:** Multiple instances of map().filter() pattern in proposal data queries. These run on every proposal page load and process arrays multiple times.
**Affected Pages:** /guest-proposals, /host-proposals

**Current Code:**
```javascript
const listingIds = [...new Set(validProposals.map(p => p.Listing).filter(Boolean))];
// ... and 5 more similar lines
```

**Refactored Code:**
```javascript
const listingIds = [...new Set(validProposals.filter(p => p.Listing).map(p => p.Listing))];
const boroughIds = [...new Set((listings || []).filter(l => l['Location - Borough']).map(l => l['Location - Borough']))];
const hoodIds = [...new Set((listings || []).filter(l => l['Location - Hood']).map(l => l['Location - Hood']))];
const hostUserIds = [...new Set((listings || []).filter(l => l['Host User']).map(l => l['Host User']))];
const guestIds = [...new Set(validProposals.filter(p => p.Guest).map(p => p.Guest))];
const proposalIdsForVM = validProposals.filter(p => p._id).map(p => p._id);
```

**Testing:**
- [ ] Load /guest-proposals with multiple proposals
- [ ] Load /host-proposals with multiple proposals
- [ ] Verify all related data (listings, guests, hosts, VMs) loads correctly

~~~~~

## PAGE GROUP: /search-test (Chunks: 15)

### CHUNK 15: Fix filter().map() Order Already Correct but Optimize Logic
**File:** app/src/islands/pages/SearchPageTest.jsx
**Line:** 1220
**Issue:** This page correctly uses filter().map() but the filter condition could be simplified. Also, this appears to be a test page that may not need to exist in production.
**Affected Pages:** /search-test

**Current Code:**
```javascript
const normalizedListingDays = listingDays.filter(d => d && typeof d === 'string').map(d => d.toLowerCase().trim());
```

**Refactored Code:**
```javascript
// Simplified type check - truthy string check covers both null/undefined and non-string
const normalizedListingDays = listingDays.filter(d => typeof d === 'string' && d).map(d => d.toLowerCase().trim());
```

**Testing:**
- [ ] Verify /search-test page filtering works
- [ ] Consider deprecating this test page if /search is stable

~~~~~

## PAGE GROUP: AUTO (Incomplete TODO Comments)

### CHUNK 16: Address Critical TODO - NotificationSettingsModal API Call
**File:** app/src/islands/modals/NotificationSettingsModal (1).jsx
**Line:** 24
**Issue:** TODO comment indicates incomplete implementation - notification settings API not connected.
**Affected Pages:** Account settings modal (triggered from multiple pages)

**Current Code:**
```javascript
// TODO: Call core-notification-settings API
```

**Refactored Code:**
```javascript
// Implementation depends on backend API availability
// Either implement the API call or remove the feature
const saveNotificationSettings = async (settings) => {
  const { data, error } = await supabase.functions.invoke('user-settings', {
    body: { action: 'update-notifications', payload: settings }
  });
  if (error) throw error;
  return data;
};
```

**Testing:**
- [ ] Open notification settings modal
- [ ] Toggle settings and save
- [ ] Verify settings persist on reload

~~~~~

### CHUNK 17: Address TODO - CompareTermsModal Backend Workflow
**File:** app/src/islands/modals/CompareTermsModal.jsx
**Line:** 60
**Issue:** TODO indicates backend workflow scheduling not implemented for compare terms feature.
**Affected Pages:** /view-split-lease (compare terms modal)

**Current Code:**
```javascript
// TODO: Implement proper backend API workflow scheduling in production
```

**Refactored Code:**
```javascript
// Document whether this TODO is still relevant or if feature is complete
// If needed, implement:
const scheduleTermsComparison = async (proposalId, terms) => {
  return supabase.functions.invoke('proposal', {
    body: { action: 'compare-terms', payload: { proposalId, terms } }
  });
};
```

**Testing:**
- [ ] Open compare terms modal on /view-split-lease
- [ ] Verify comparison functionality works
- [ ] Determine if backend integration is needed

~~~~~

## PAGE GROUP: AUTO (setInterval Memory Leak Risk)

### CHUNK 18: Ensure setInterval Cleanup in sanitize.js
**File:** app/src/lib/sanitize.js
**Line:** 261
**Issue:** setInterval runs every 5 minutes globally without cleanup. In Islands architecture with page reloads this is less problematic, but still represents potential memory leak pattern.
**Affected Pages:** AUTO (any page using sanitize.js)

**Current Code:**
```javascript
setInterval(cleanupRateLimits, 5 * 60 * 1000);
```

**Refactored Code:**
```javascript
// Only start interval once, track if already running
let cleanupIntervalId = null;

export function startRateLimitCleanup() {
  if (cleanupIntervalId === null) {
    cleanupIntervalId = setInterval(cleanupRateLimits, 5 * 60 * 1000);
  }
}

// Call in module initialization but allow cleanup if needed
if (typeof window !== 'undefined') {
  startRateLimitCleanup();
}
```

**Testing:**
- [ ] Verify rate limiting still works after refactor
- [ ] Check no duplicate intervals are created

~~~~~

## PAGE GROUP: AUTO (Deep Import Paths)

### CHUNK 19: Create Re-export Barrel for Deep Imports
**File:** Multiple files with 4+ level imports
**Line:** Various (see list below)
**Issue:** Many files have deep relative imports like `../../../../lib/supabase.js`. This makes refactoring difficult and code harder to read. Consider adding barrel exports.
**Affected Pages:** AUTO

**Files with Deep Imports:**
```
app/src/islands/pages/AccountProfilePage/components/RentalApplicationWizardModal/useRentalApplicationWizardLogic.js
app/src/islands/shared/EditListingDetails/services/*.js (4 files)
app/src/islands/pages/ViewSplitLeasePage/components/*.jsx (2 files)
app/src/islands/pages/SearchPage/components/CompactScheduleIndicator.jsx
app/src/islands/pages/HostOverviewPage/components/HostOverviewCards.jsx
app/src/islands/pages/CreateSuggestedProposalPage/components/*.jsx (3 files)
app/src/islands/pages/SelfListingPage/utils/*.ts (3 files)
app/src/islands/pages/SelfListingPage/sections/*.tsx (3 files)
```

**Current Code:**
```javascript
import { supabase } from '../../../../../lib/supabase.js';
import { checkAuthStatus, getSessionId, getAuthToken } from '../../../../../lib/auth.js';
```

**Refactored Code:**
```javascript
// Option 1: Use Vite aliases (already configured)
import { supabase } from 'lib/supabase.js';
import { checkAuthStatus, getSessionId, getAuthToken } from 'lib/auth.js';

// Option 2: Create a barrel export at islands level
// app/src/islands/imports.js
export * from '../lib/supabase.js';
export * from '../lib/auth.js';
// etc.
```

**Testing:**
- [ ] Update Vite alias configuration if needed
- [ ] Update imports incrementally
- [ ] Run build to verify no broken imports

~~~~~

## Summary

| Priority | Chunks | Category | Impact |
|----------|--------|----------|--------|
| HIGH | 1, 3, 4, 5, 6 | Console Log Removal | Security/Performance - removes PII exposure and console noise |
| HIGH | 2 | File Cleanup | Maintainability - removes 13 duplicate files |
| HIGH | 7 | Code Deduplication | Maintainability - single source of truth for scheduling logic |
| MEDIUM | 8-15 | Performance | Minor performance gains from filter-first pattern |
| MEDIUM | 16, 17 | Incomplete Features | Technical debt - address or document TODOs |
| LOW | 18 | Memory Management | Defensive coding for setInterval |
| LOW | 19 | Code Organization | DX improvement - cleaner imports |

**Total Chunks:** 19
**Estimated Effort:** 4-6 hours for full implementation
**Risk Level:** Low (mostly refactoring, no business logic changes)

---

## References

### Key Files Analyzed
- `app/src/lib/config.js` - Environment configuration
- `app/src/lib/dataLookups.js` - Reference data caching
- `app/src/lib/aiService.js` - AI integration
- `app/src/lib/bubbleAPI.js` - Bubble.io API client
- `app/src/lib/availabilityValidation.js` - Schedule validation (duplicated)
- `app/src/logic/calculators/scheduling/*.js` - Canonical scheduling functions
- `app/src/islands/pages/ViewSplitLeasePage/*.jsx` - Listing detail page
- `app/src/islands/pages/HostProposalsPage/*.js` - Host proposals page
- `app/src/lib/proposals/userProposalQueries.js` - Proposal data queries

### Documentation Referenced
- `.claude/CLAUDE.md` - Project architecture documentation
- `app/CLAUDE.md` - Frontend architecture details
- `app/src/logic/CLAUDE.md` - Four-layer logic architecture
