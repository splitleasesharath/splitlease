# Code Refactoring Plan - app

Date: 2026-01-15
Audit Type: general

---

## Executive Summary

This audit identified **27 refactoring chunks** across the `app/src` directory, grouped by affected pages. Key issues include:

1. **Duplicate Constants (HIGH)**: `DAY_NAMES`, `DAYS_OF_WEEK`, `DAY_ABBREV` defined in 8+ locations
2. **Duplicate Files (HIGH)**: 12 files with `(1)` suffix indicating copy-paste redundancy
3. **Console.log Pollution (MEDIUM)**: 50+ console statements in production code
4. **Inline Styles (MEDIUM)**: 840 inline style occurrences across 50 files
5. **Duplicate Utility Functions (MEDIUM)**: `formatCurrency`, `formatDate` defined in multiple files
6. **Missing Memoization (LOW)**: Only 24 files use `useMemo` despite complex calculations

---

## PAGE GROUP: /search (Chunks: 1, 2, 7)

### CHUNK 1: Remove duplicate DAY_ABBREV constant
**File:** app/src/islands/pages/SearchPage.jsx
**Line:** N/A (import from centralized constants)
**Issue:** DAY_ABBREV is defined locally in multiple files instead of importing from `lib/constants.js`
**Affected Pages:** /search

**Current Code:**
```javascript
// In app/src/islands/pages/SearchPage.jsx - no local definition but other files have:
// app/src/lib/scheduleSelector/dayHelpers.js:15
export const DAY_ABBREV = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// app/src/islands/pages/AccountProfilePage/components/cards/ScheduleCommuteCard.jsx:16
const DAY_ABBREV = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// app/src/islands/pages/AccountProfilePage/components/cards/ScheduleCard.jsx:12
const DAY_ABBREV = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// app/src/islands/shared/ScheduleCohost/ScheduleCohost.jsx:44
const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// app/src/islands/shared/DateChangeRequestManager/dateUtils.js:216
return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// app/src/islands/shared/VirtualMeetingManager/dateUtils.js:217
return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// app/src/islands/pages/ListingDashboardPage/components/AvailabilitySection.jsx:21
const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
```

**Refactored Code:**
```javascript
// Step 1: Add to lib/constants.js (if not present)
export const DAY_ABBREV = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Step 2: In all affected files, replace local definition with import:
import { DAY_ABBREV } from '../../lib/constants.js';
// or appropriate relative path

// For files using different names like DAY_HEADERS or DAYS_OF_WEEK for abbreviations:
import { DAY_ABBREV as DAY_HEADERS } from '../../../lib/constants.js';
```

**Testing:**
- [ ] Verify all 7 files render days correctly after refactor
- [ ] Check ScheduleCohost component displays days properly
- [ ] Validate ListingDashboard availability section headers
- [ ] Test DateChangeRequestManager and VirtualMeetingManager date displays

~~~~~

### CHUNK 2: Consolidate .toFixed(2) price formatting
**File:** app/src/islands/pages/SearchPage.jsx
**Line:** 775, 787, 870, 876
**Issue:** Price formatting with `.toFixed(2)` is repeated inline instead of using a shared utility
**Affected Pages:** /search, /view-split-lease, /favorite-listings

**Current Code:**
```javascript
// app/src/islands/pages/SearchPage.jsx:775
<span className="price-current">${dynamicPrice.toFixed(2)}</span>

// app/src/islands/pages/SearchPage.jsx:787
from ${parseFloat(startingPrice).toFixed(2)}/night

// app/src/islands/pages/SearchPage.jsx:870
<div className="price-main">${dynamicPrice.toFixed(2)}</div>

// app/src/islands/pages/SearchPage.jsx:876
<div className="price-starting">Starting at<span>${parseFloat(startingPrice).toFixed(2)}/night</span></div>
```

**Refactored Code:**
```javascript
// Step 1: Create or use existing formatCurrency in lib/formatters.js
export function formatPrice(value, includeSymbol = true) {
  if (value === undefined || value === null || isNaN(value)) {
    return includeSymbol ? '$0.00' : '0.00';
  }
  const formatted = parseFloat(value).toFixed(2);
  return includeSymbol ? `$${formatted}` : formatted;
}

// Step 2: In SearchPage.jsx
import { formatPrice } from '../../lib/formatters.js';

// Line 775
<span className="price-current">{formatPrice(dynamicPrice)}</span>

// Line 787
from {formatPrice(startingPrice)}/night

// Line 870
<div className="price-main">{formatPrice(dynamicPrice)}</div>

// Line 876
<div className="price-starting">Starting at<span>{formatPrice(startingPrice)}/night</span></div>
```

**Testing:**
- [ ] Verify price displays correctly on search results
- [ ] Check price formatting with various values (0, null, decimals)
- [ ] Test mobile and desktop price displays

~~~~~

### CHUNK 7: Remove console.log statements from search page logic
**File:** app/src/islands/pages/useSearchPageLogic.js
**Line:** Multiple locations
**Issue:** Debug console.log statements left in production code
**Affected Pages:** /search

**Current Code:**
```javascript
// These console statements should be removed or converted to proper logging
console.log('Search page loaded');
console.log('Filters applied:', filters);
console.log('Results fetched:', results.length);
```

**Refactored Code:**
```javascript
// Option 1: Remove entirely for production
// (delete the console.log lines)

// Option 2: Use conditional logging with environment check
const isDev = import.meta.env.DEV;
if (isDev) {
  console.log('Search page loaded');
}

// Option 3: Use a proper logger utility
import { logger } from '../../lib/logger.js';
logger.debug('Search page loaded');
```

**Testing:**
- [ ] Verify search page functionality unchanged
- [ ] Check browser console is clean in production build
- [ ] Run `bun run build` and verify no console warnings

~~~~~

## PAGE GROUP: /view-split-lease (Chunks: 3, 4, 5, 8)

### CHUNK 3: Consolidate DAY_NAMES constant definitions
**File:** app/src/islands/pages/ViewSplitLeasePage.jsx
**Line:** N/A (uses from constants)
**Issue:** DAY_NAMES is defined in 6+ different locations across the codebase
**Affected Pages:** /view-split-lease, /search, /account-profile, /favorite-listings

**Current Code:**
```javascript
// app/src/lib/constants.js:63
export const DAY_NAMES = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
];

// app/src/lib/dayUtils.js:24 (DUPLICATE!)
export const DAY_NAMES = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
];

// app/src/lib/scheduleSelector/dayHelpers.js:9 (DUPLICATE!)
export const DAY_NAMES = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
];

// app/src/islands/shared/CreateProposalFlowV2.jsx:21 (DUPLICATE!)
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// app/src/islands/shared/CreateProposalFlowV2Components/DaysSelectionSection.jsx:10 (DUPLICATE!)
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// app/src/islands/pages/AccountProfilePage/useAccountProfilePageLogic.js:23 (DUPLICATE!)
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
```

**Refactored Code:**
```javascript
// Step 1: Keep ONLY in lib/constants.js as single source of truth
// lib/constants.js (keep existing)
export const DAY_NAMES = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
];

// Step 2: In lib/dayUtils.js - import instead of defining
import { DAY_NAMES } from './constants.js';
export { DAY_NAMES }; // Re-export for backwards compatibility

// Step 3: In lib/scheduleSelector/dayHelpers.js
import { DAY_NAMES } from '../constants.js';
export { DAY_NAMES }; // Re-export for backwards compatibility

// Step 4: In islands/shared/CreateProposalFlowV2.jsx
import { DAY_NAMES } from '../../lib/constants.js';
// Remove local const DAY_NAMES = [...]

// Step 5: In islands/shared/CreateProposalFlowV2Components/DaysSelectionSection.jsx
import { DAY_NAMES } from '../../../../lib/constants.js';
// Remove local const DAY_NAMES = [...]

// Step 6: In islands/pages/AccountProfilePage/useAccountProfilePageLogic.js
import { DAY_NAMES } from '../../../lib/constants.js';
// Remove local const DAY_NAMES = [...]
```

**Testing:**
- [ ] Test ViewSplitLeasePage day display
- [ ] Test CreateProposalFlowV2 day selection
- [ ] Test DaysSelectionSection rendering
- [ ] Test AccountProfilePage schedule display
- [ ] Run full test suite

~~~~~

### CHUNK 4: Consolidate DAYS_OF_WEEK constant (rich object array)
**File:** app/src/islands/modals/GuestEditingProposalModal.jsx
**Line:** 40-48
**Issue:** DAYS_OF_WEEK rich object array is duplicated in multiple files
**Affected Pages:** /view-split-lease (modal), /host-proposals (modal)

**Current Code:**
```javascript
// app/src/islands/modals/GuestEditingProposalModal.jsx:40-48
const DAYS_OF_WEEK = [
  { id: 0, name: 'Sunday', shortName: 'Sun', singleLetter: 'S', dayIndex: 0 },
  { id: 1, name: 'Monday', shortName: 'Mon', singleLetter: 'M', dayIndex: 1 },
  { id: 2, name: 'Tuesday', shortName: 'Tue', singleLetter: 'T', dayIndex: 2 },
  { id: 3, name: 'Wednesday', shortName: 'Wed', singleLetter: 'W', dayIndex: 3 },
  { id: 4, name: 'Thursday', shortName: 'Thu', singleLetter: 'T', dayIndex: 4 },
  { id: 5, name: 'Friday', shortName: 'Fri', singleLetter: 'F', dayIndex: 5 },
  { id: 6, name: 'Saturday', shortName: 'Sat', singleLetter: 'S', dayIndex: 6 }
]

// app/src/islands/shared/HostEditingProposal/types.js:12-20 (EXACT DUPLICATE!)
export const DAYS_OF_WEEK = [
  { id: 0, name: 'Sunday', shortName: 'Sun', singleLetter: 'S', dayIndex: 0 },
  { id: 1, name: 'Monday', shortName: 'Mon', singleLetter: 'M', dayIndex: 1 },
  // ... same structure
]
```

**Refactored Code:**
```javascript
// Step 1: Add to lib/constants.js as canonical source
/**
 * Days of the week with rich metadata for UI components
 * All indices are 0-based (matching JavaScript Date.getDay())
 */
export const DAYS_OF_WEEK = [
  { id: 0, name: 'Sunday', shortName: 'Sun', singleLetter: 'S', dayIndex: 0 },
  { id: 1, name: 'Monday', shortName: 'Mon', singleLetter: 'M', dayIndex: 1 },
  { id: 2, name: 'Tuesday', shortName: 'Tue', singleLetter: 'T', dayIndex: 2 },
  { id: 3, name: 'Wednesday', shortName: 'Wed', singleLetter: 'W', dayIndex: 3 },
  { id: 4, name: 'Thursday', shortName: 'Thu', singleLetter: 'T', dayIndex: 4 },
  { id: 5, name: 'Friday', shortName: 'Fri', singleLetter: 'F', dayIndex: 5 },
  { id: 6, name: 'Saturday', shortName: 'Sat', singleLetter: 'S', dayIndex: 6 }
];

// Step 2: In GuestEditingProposalModal.jsx
import { DAYS_OF_WEEK } from '../../lib/constants.js';
// Remove local const DAYS_OF_WEEK = [...]

// Step 3: In HostEditingProposal/types.js
import { DAYS_OF_WEEK } from '../../../lib/constants.js';
export { DAYS_OF_WEEK }; // Re-export for backwards compatibility
// Remove local export const DAYS_OF_WEEK = [...]
```

**Testing:**
- [ ] Test GuestEditingProposalModal day selector
- [ ] Test HostEditingProposal day selector
- [ ] Verify day indexing works correctly (0=Sunday)

~~~~~

### CHUNK 5: Remove duplicate formatCurrency functions
**File:** app/src/islands/modals/GuestEditingProposalModal.jsx
**Line:** 67-72
**Issue:** formatCurrency is defined locally in multiple files
**Affected Pages:** /view-split-lease, /host-proposals, /guest-proposals

**Current Code:**
```javascript
// app/src/islands/modals/GuestEditingProposalModal.jsx:67-72
function formatCurrency(value) {
  if (value === undefined || value === null || isNaN(value)) {
    return '$0.00'
  }
  return '$' + value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

// app/src/islands/shared/HostEditingProposal/types.js:170-179 (DUPLICATE with different impl!)
export function formatCurrency(amount) {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return '$0.00'
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount)
}
```

**Refactored Code:**
```javascript
// Step 1: Create lib/formatters.js (or add to existing utility file)
/**
 * Format a number as US currency
 * @param {number} amount - Amount to format
 * @returns {string} Formatted currency string (e.g., "$1,234.56")
 */
export function formatCurrency(amount) {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return '$0.00';
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount);
}

// Step 2: In GuestEditingProposalModal.jsx
import { formatCurrency } from '../../lib/formatters.js';
// Remove local function formatCurrency(value) {...}

// Step 3: In HostEditingProposal/types.js
import { formatCurrency } from '../../../lib/formatters.js';
export { formatCurrency }; // Re-export for backwards compatibility
// Remove local export function formatCurrency(amount) {...}
```

**Testing:**
- [ ] Verify currency displays correctly in GuestEditingProposalModal
- [ ] Verify currency displays correctly in HostEditingProposal
- [ ] Test with edge cases: 0, null, undefined, negative numbers, large numbers

~~~~~

### CHUNK 8: Remove duplicate formatDate functions
**File:** app/src/islands/modals/GuestEditingProposalModal.jsx
**Line:** 74-96
**Issue:** Date formatting functions duplicated across files
**Affected Pages:** /view-split-lease, /host-proposals

**Current Code:**
```javascript
// app/src/islands/modals/GuestEditingProposalModal.jsx:74-96
function formatDateFull(date) {
  if (!date || !(date instanceof Date)) return ''
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(date)
}

function formatDateShort(date) {
  if (!date || !(date instanceof Date)) return ''
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(date)
}

function formatDate(date, isSmallScreen = false) {
  return isSmallScreen ? formatDateShort(date) : formatDateFull(date)
}

// app/src/islands/shared/HostEditingProposal/types.js:187-205 (DUPLICATE!)
export function formatDate(date, format = 'full') {
  // Similar implementation
}
```

**Refactored Code:**
```javascript
// Step 1: Add to lib/formatters.js
/**
 * Format date for display
 * @param {Date} date - Date to format
 * @param {'full'|'short'} format - Output format
 * @returns {string} Formatted date string
 */
export function formatDate(date, format = 'full') {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    return '';
  }

  const options = format === 'short'
    ? { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }
    : { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };

  return new Intl.DateTimeFormat('en-US', options).format(date);
}

/**
 * Format date for HTML input element (YYYY-MM-DD)
 */
export function formatDateForInput(date) {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) return '';
  return date.toISOString().split('T')[0];
}

// Step 2: In GuestEditingProposalModal.jsx
import { formatDate } from '../../lib/formatters.js';

// Adjust usage if needed for isSmallScreen:
// formatDate(date, isSmallScreen ? 'short' : 'full')
```

**Testing:**
- [ ] Verify date displays in GuestEditingProposalModal
- [ ] Verify date displays in HostEditingProposal
- [ ] Test with invalid dates

~~~~~

## PAGE GROUP: /host-overview (Chunks: 9, 10)

### CHUNK 9: Remove debug console.log statements from host-overview entry
**File:** app/src/host-overview.jsx
**Line:** 12, 15, 17
**Issue:** Console.log statements left in production entry point
**Affected Pages:** /host-overview

**Current Code:**
```javascript
// app/src/host-overview.jsx:12-17
console.log('Host Overview Auth Check:', { isLoggedIn });

if (!isLoggedIn) {
  console.log('User not authenticated - will show auth modal');
} else {
  console.log('User authenticated - rendering Host Overview page');
}
```

**Refactored Code:**
```javascript
// Option 1: Remove entirely
// Check authentication status (async)
(async () => {
  const isLoggedIn = await checkAuthStatus();

  // Always render the page - Header will show auth modal if not logged in
  createRoot(document.getElementById('host-overview-page')).render(
    <HostOverviewPage requireAuth={true} isAuthenticated={isLoggedIn} />
  );
})();

// Option 2: Conditional logging for development only
(async () => {
  const isLoggedIn = await checkAuthStatus();

  if (import.meta.env.DEV) {
    console.log('Host Overview Auth Check:', { isLoggedIn });
  }

  createRoot(document.getElementById('host-overview-page')).render(
    <HostOverviewPage requireAuth={true} isAuthenticated={isLoggedIn} />
  );
})();
```

**Testing:**
- [ ] Verify host-overview page loads correctly
- [ ] Check console is clean in production build
- [ ] Test auth flow still works (redirects unauthenticated users)

~~~~~

### CHUNK 10: Remove verbose auth logging from lib/auth.js
**File:** app/src/lib/auth.js
**Line:** 105-108, 131-210
**Issue:** Extensive console.log statements for auth debugging
**Affected Pages:** /host-overview, /listing-dashboard, /account-profile, ALL protected pages

**Current Code:**
```javascript
// app/src/lib/auth.js:105-108
console.log('🔐 Split Lease Cookie Auth Check:');
console.log('   Logged In:', isLoggedIn);
console.log('   Username:', username || 'not set');
console.log('   Raw Cookies:', { loggedInCookie, usernameCookie });

// app/src/lib/auth.js:131-210 (partial)
console.log('🔍 Checking authentication status...');
console.log('✅ Migrated from legacy storage');
console.log('✅ User authenticated via Split Lease cookies');
console.log('   Username:', splitLeaseAuth.username);
// ... many more
```

**Refactored Code:**
```javascript
// Step 1: Create or use existing logger utility in lib/logger.js
const isDev = import.meta.env.DEV;

export const logger = {
  debug: (...args) => isDev && console.log(...args),
  info: (...args) => isDev && console.info(...args),
  warn: (...args) => console.warn(...args), // Always show warnings
  error: (...args) => console.error(...args), // Always show errors
};

// Step 2: In lib/auth.js replace console.log with logger.debug
import { logger } from './logger.js';

// Replace:
// console.log('🔐 Split Lease Cookie Auth Check:');
// With:
logger.debug('🔐 Split Lease Cookie Auth Check:', { isLoggedIn, username });
```

**Testing:**
- [ ] Verify all auth flows work (login, logout, session check)
- [ ] Verify console is clean in production
- [ ] Test protected page access

~~~~~

## PAGE GROUP: /account-profile (Chunks: 11, 12, 13)

### CHUNK 11: Remove duplicate DaySelectorPills DAY_LABELS constant
**File:** app/src/islands/pages/AccountProfilePage/components/shared/DaySelectorPills.jsx
**Line:** 12
**Issue:** DAY_LABELS duplicates DAY_ABBREV from constants
**Affected Pages:** /account-profile

**Current Code:**
```javascript
// app/src/islands/pages/AccountProfilePage/components/shared/DaySelectorPills.jsx:12
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
```

**Refactored Code:**
```javascript
// Import from constants instead
import { DAY_ABBREV } from '../../../../../lib/constants.js';

// Use DAY_ABBREV instead of local DAY_LABELS
// OR if you prefer the name DAY_LABELS:
import { DAY_ABBREV as DAY_LABELS } from '../../../../../lib/constants.js';
```

**Testing:**
- [ ] Verify day pills display correctly
- [ ] Test day selection functionality

~~~~~

### CHUNK 12: Remove duplicate DAY_ABBREV in ScheduleCard
**File:** app/src/islands/pages/AccountProfilePage/components/cards/ScheduleCard.jsx
**Line:** 12
**Issue:** Local DAY_ABBREV duplicates lib/constants.js
**Affected Pages:** /account-profile

**Current Code:**
```javascript
// app/src/islands/pages/AccountProfilePage/components/cards/ScheduleCard.jsx:12
const DAY_ABBREV = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
```

**Refactored Code:**
```javascript
import { DAY_ABBREV } from '../../../../../lib/constants.js';
// Remove local const DAY_ABBREV = [...]
```

**Testing:**
- [ ] Verify schedule card displays correctly
- [ ] Test schedule editing functionality

~~~~~

### CHUNK 13: Remove duplicate DAY_ABBREV in ScheduleCommuteCard
**File:** app/src/islands/pages/AccountProfilePage/components/cards/ScheduleCommuteCard.jsx
**Line:** 16
**Issue:** Local DAY_ABBREV duplicates lib/constants.js
**Affected Pages:** /account-profile

**Current Code:**
```javascript
// app/src/islands/pages/AccountProfilePage/components/cards/ScheduleCommuteCard.jsx:16
const DAY_ABBREV = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
```

**Refactored Code:**
```javascript
import { DAY_ABBREV } from '../../../../../lib/constants.js';
// Remove local const DAY_ABBREV = [...]
```

**Testing:**
- [ ] Verify schedule commute card displays correctly
- [ ] Test commute schedule functionality

~~~~~

## PAGE GROUP: /listing-dashboard (Chunks: 14, 15)

### CHUNK 14: Remove duplicate DAY_HEADERS constant
**File:** app/src/islands/pages/ListingDashboardPage/components/AvailabilitySection.jsx
**Line:** 21
**Issue:** DAY_HEADERS is same as DAY_ABBREV
**Affected Pages:** /listing-dashboard

**Current Code:**
```javascript
// app/src/islands/pages/ListingDashboardPage/components/AvailabilitySection.jsx:21
const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
```

**Refactored Code:**
```javascript
import { DAY_ABBREV as DAY_HEADERS } from '../../../../lib/constants.js';
// Remove local const DAY_HEADERS = [...]
```

**Testing:**
- [ ] Verify availability section header displays correctly
- [ ] Test availability editing

~~~~~

### CHUNK 15: Console.log cleanup in useListingDashboardPageLogic
**File:** app/src/islands/pages/ListingDashboardPage/useListingDashboardPageLogic.js
**Line:** Multiple
**Issue:** Debug logging in production
**Affected Pages:** /listing-dashboard

**Current Code:**
```javascript
// Various console.log statements throughout the file
console.log('Loading listings...');
console.log('Listing data:', data);
```

**Refactored Code:**
```javascript
import { logger } from '../../../lib/logger.js';

// Replace console.log with logger.debug
logger.debug('Loading listings...');
logger.debug('Listing data:', data);
```

**Testing:**
- [ ] Verify listing dashboard loads correctly
- [ ] Check console is clean

~~~~~

## PAGE GROUP: /favorite-listings (Chunks: 16, 17)

### CHUNK 16: Consolidate price formatting in FavoriteListingsPage
**File:** app/src/islands/pages/FavoriteListingsPage/FavoriteListingsPage.jsx
**Line:** 360, 363
**Issue:** Inline .toFixed(2) price formatting
**Affected Pages:** /favorite-listings

**Current Code:**
```javascript
// app/src/islands/pages/FavoriteListingsPage/FavoriteListingsPage.jsx:360
<div className="price-main">${dynamicPrice.toFixed(2)}</div>

// app/src/islands/pages/FavoriteListingsPage/FavoriteListingsPage.jsx:363
<div className="price-starting">Starting at<span>${parseFloat(startingPrice).toFixed(2)}/night</span></div>
```

**Refactored Code:**
```javascript
import { formatPrice } from '../../../lib/formatters.js';

// Line 360
<div className="price-main">{formatPrice(dynamicPrice)}</div>

// Line 363
<div className="price-starting">Starting at<span>{formatPrice(startingPrice)}/night</span></div>
```

**Testing:**
- [ ] Verify prices display correctly
- [ ] Test with various price values

~~~~~

### CHUNK 17: Excessive useState declarations
**File:** app/src/islands/pages/FavoriteListingsPage/FavoriteListingsPage.jsx
**Line:** Multiple (10 useState for false, 3 for arrays)
**Issue:** 13 useState declarations could be consolidated using useReducer
**Affected Pages:** /favorite-listings

**Current Code:**
```javascript
// Multiple boolean states that could be a single state object
const [isLoading, setIsLoading] = useState(false);
const [isRefreshing, setIsRefreshing] = useState(false);
const [showFilters, setShowFilters] = useState(false);
const [showSort, setShowSort] = useState(false);
// ... more
```

**Refactored Code:**
```javascript
// Option 1: Group related boolean states
const [uiState, setUiState] = useState({
  isLoading: false,
  isRefreshing: false,
  showFilters: false,
  showSort: false,
});

// Helper to update single property
const setUiFlag = (key, value) => {
  setUiState(prev => ({ ...prev, [key]: value }));
};

// Usage:
setUiFlag('isLoading', true);

// Option 2: useReducer for complex state (better for many interdependent states)
const initialState = {
  isLoading: false,
  isRefreshing: false,
  // ...
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_REFRESHING':
      return { ...state, isRefreshing: action.payload };
    // ...
  }
}

const [state, dispatch] = useReducer(reducer, initialState);
```

**Testing:**
- [ ] Verify all UI states work correctly
- [ ] Test loading states
- [ ] Test filter/sort toggles

~~~~~

## PAGE GROUP: SHARED COMPONENTS (Chunks: 18, 19, 20, 21)

### CHUNK 18: Delete duplicate backup files with (1) suffix
**File:** Multiple files
**Line:** N/A
**Issue:** 12 files with (1) or (1)(1) suffix indicating copy-paste duplication
**Affected Pages:** AUTO (shared components)

**Current Code:**
```
Files to review and likely delete:
- app/src/styles/components/create-listing-modal (1).css
- app/src/styles/components/create-listing-modal (1) (1).css
- app/src/islands/modals/EditPhoneNumberModal (1).jsx
- app/src/islands/modals/EditPhoneNumberModal (1) (1).jsx
- app/src/islands/modals/NotificationSettingsModal (1).jsx
- app/src/islands/shared/AuthAwareSearchScheduleSelector (1).jsx
- app/src/islands/shared/AuthAwareSearchScheduleSelector (1) (1).jsx
- app/src/lib/SECURE_AUTH_README (1).md
- app/src/lib/proposalDataFetcher (1).js
- app/src/lib/secureStorage (1).js
- app/src/islands/shared/CreateDuplicateListingModal (1).README.md
- app/src/islands/shared/CreateDuplicateListingModal (1).jsx
```

**Refactored Code:**
```bash
# Step 1: Review each file to confirm it's a duplicate
# Step 2: Delete duplicate files
git rm "app/src/styles/components/create-listing-modal (1).css"
git rm "app/src/styles/components/create-listing-modal (1) (1).css"
git rm "app/src/islands/modals/EditPhoneNumberModal (1).jsx"
git rm "app/src/islands/modals/EditPhoneNumberModal (1) (1).jsx"
git rm "app/src/islands/modals/NotificationSettingsModal (1).jsx"
git rm "app/src/islands/shared/AuthAwareSearchScheduleSelector (1).jsx"
git rm "app/src/islands/shared/AuthAwareSearchScheduleSelector (1) (1).jsx"
git rm "app/src/lib/SECURE_AUTH_README (1).md"
git rm "app/src/lib/proposalDataFetcher (1).js"
git rm "app/src/lib/secureStorage (1).js"
git rm "app/src/islands/shared/CreateDuplicateListingModal (1).README.md"
git rm "app/src/islands/shared/CreateDuplicateListingModal (1).jsx"
```

**Testing:**
- [ ] Verify build still works after deletion
- [ ] Verify no imports reference deleted files
- [ ] Run `bun run build` successfully

~~~~~

### CHUNK 19: Consolidate body scroll lock hook
**File:** app/src/islands/shared/CreateProposalFlowV2.jsx
**Line:** 42-63
**Issue:** useBodyScrollLock is defined inline, should be a shared hook
**Affected Pages:** AUTO (any modal using this component)

**Current Code:**
```javascript
// app/src/islands/shared/CreateProposalFlowV2.jsx:42-63
const useBodyScrollLock = () => {
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, []);
};
```

**Refactored Code:**
```javascript
// Step 1: Create hooks/useBodyScrollLock.js
import { useEffect } from 'react';

/**
 * Hook to lock body scroll when a modal is open
 * Prevents background content from scrolling and handles scrollbar width compensation
 */
export function useBodyScrollLock() {
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, []);
}

// Step 2: In CreateProposalFlowV2.jsx
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock.js';
// Remove local const useBodyScrollLock = () => {...}
```

**Testing:**
- [ ] Verify modal scroll lock works
- [ ] Test on pages with and without scrollbars
- [ ] Test mobile behavior

~~~~~

### CHUNK 20: Create shared lib/formatters.js utility
**File:** NEW: app/src/lib/formatters.js
**Line:** N/A (new file)
**Issue:** Price and date formatting scattered across codebase
**Affected Pages:** AUTO (multiple pages use formatting)

**Current Code:**
```javascript
// Scattered across multiple files:
// - GuestEditingProposalModal.jsx: formatCurrency, formatDate
// - HostEditingProposal/types.js: formatCurrency, formatDate
// - Various inline .toFixed(2) calls
```

**Refactored Code:**
```javascript
// NEW FILE: app/src/lib/formatters.js

/**
 * Formatting utilities for Split Lease application
 * Centralizes currency, date, and number formatting
 */

/**
 * Format a number as US currency
 * @param {number} amount - Amount to format
 * @returns {string} Formatted currency string (e.g., "$1,234.56")
 */
export function formatCurrency(amount) {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return '$0.00';
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount);
}

/**
 * Format price for display (shorthand for common use case)
 * @param {number} value - Price value
 * @param {boolean} includeSymbol - Include $ symbol (default: true)
 * @returns {string} Formatted price
 */
export function formatPrice(value, includeSymbol = true) {
  if (value === undefined || value === null || isNaN(value)) {
    return includeSymbol ? '$0.00' : '0.00';
  }
  const formatted = parseFloat(value).toFixed(2);
  return includeSymbol ? `$${formatted}` : formatted;
}

/**
 * Format date for display
 * @param {Date} date - Date to format
 * @param {'full'|'short'} format - Output format
 * @returns {string} Formatted date string
 */
export function formatDate(date, format = 'full') {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    return '';
  }

  const options = format === 'short'
    ? { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }
    : { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };

  return new Intl.DateTimeFormat('en-US', options).format(date);
}

/**
 * Format date for HTML input element (YYYY-MM-DD)
 * @param {Date} date - Date to format
 * @returns {string} Date string in YYYY-MM-DD format
 */
export function formatDateForInput(date) {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    return '';
  }
  return date.toISOString().split('T')[0];
}

/**
 * Add weeks to a date
 * @param {Date} date - Starting date
 * @param {number} weeks - Number of weeks to add
 * @returns {Date} New date
 */
export function addWeeks(date, weeks) {
  if (!date || !(date instanceof Date)) return new Date();
  const result = new Date(date);
  result.setDate(result.getDate() + (weeks * 7));
  return result;
}
```

**Testing:**
- [ ] Unit test all formatting functions
- [ ] Verify formatting matches existing behavior
- [ ] Test edge cases (null, undefined, NaN, negative)

~~~~~

### CHUNK 21: Console cleanup in aiService.js
**File:** app/src/lib/aiService.js
**Line:** 28, 53, 66, 71, 75, 144, 168, 181, 186, 194, 211, 220, 233, 238, 242, 256, 276
**Issue:** 17 console.log/warn/error statements in AI service
**Affected Pages:** AUTO (listing creation, AI features)

**Current Code:**
```javascript
// app/src/lib/aiService.js - many console statements
console.log('[aiService] Generating listing description with data:', listingData);
console.log('[aiService] Calling ai-gateway with variables:', variables);
console.error('[aiService] Edge Function error:', error);
console.error('[aiService] AI Gateway error:', data?.error);
console.log('[aiService] Generated description:', data.data?.content);
// ... 12 more
```

**Refactored Code:**
```javascript
import { logger } from './logger.js';

// Replace all console.log with logger.debug
logger.debug('[aiService] Generating listing description with data:', listingData);
logger.debug('[aiService] Calling ai-gateway with variables:', variables);

// Keep console.error as logger.error (these should always show)
logger.error('[aiService] Edge Function error:', error);
logger.error('[aiService] AI Gateway error:', data?.error);
```

**Testing:**
- [ ] Verify AI description generation works
- [ ] Verify AI title generation works
- [ ] Verify neighborhood description works
- [ ] Check console is cleaner in production

~~~~~

## PAGE GROUP: /create-suggested-proposal (Chunks: 22, 23)

### CHUNK 22: Excessive useState in useCreateSuggestedProposalLogic
**File:** app/src/islands/pages/CreateSuggestedProposalPage/useCreateSuggestedProposalLogic.js
**Line:** Multiple (5 array states, many boolean states)
**Issue:** Too many individual useState declarations
**Affected Pages:** /create-suggested-proposal

**Current Code:**
```javascript
// 5+ array states
const [listingSearchResults, setListingSearchResults] = useState([]);
const [guestSearchResults, setGuestSearchResults] = useState([]);
// ... etc

// Multiple loading/searching states
const [isSearchingListings, setIsSearchingListings] = useState(false);
const [isSearchingGuests, setIsSearchingGuests] = useState(false);
```

**Refactored Code:**
```javascript
// Group search-related states
const [searchState, setSearchState] = useState({
  listings: { results: [], isSearching: false, query: '' },
  guests: { results: [], isSearching: false, query: '' }
});

// Helper functions
const setListingSearching = (isSearching) => {
  setSearchState(prev => ({
    ...prev,
    listings: { ...prev.listings, isSearching }
  }));
};

const setListingResults = (results) => {
  setSearchState(prev => ({
    ...prev,
    listings: { ...prev.listings, results, isSearching: false }
  }));
};
```

**Testing:**
- [ ] Verify listing search works
- [ ] Verify guest search works
- [ ] Test step navigation
- [ ] Test form validation

~~~~~

### CHUNK 23: Multiple useEffect with potential race conditions
**File:** app/src/islands/pages/CreateSuggestedProposalPage/useCreateSuggestedProposalLogic.js
**Line:** 224, 274, 375
**Issue:** Multiple useEffects that fetch data without proper cleanup
**Affected Pages:** /create-suggested-proposal

**Current Code:**
```javascript
// app/src/islands/pages/CreateSuggestedProposalPage/useCreateSuggestedProposalLogic.js:274
useEffect(() => {
  const loadDefaults = async () => {
    setIsSearchingListings(true);
    try {
      const { data, error } = await getDefaultListings();
      if (error) {
        // ... error handling
      }
      // No cleanup check - potential race condition
      setListingSearchResults(data || []);
    } finally {
      setIsSearchingListings(false);
    }
  };
  loadDefaults();
}, []); // Empty deps - runs once

// Similar pattern at line 375 for guests
```

**Refactored Code:**
```javascript
useEffect(() => {
  let isMounted = true; // Cleanup flag

  const loadDefaults = async () => {
    setIsSearchingListings(true);
    try {
      const { data, error } = await getDefaultListings();

      // Check if component is still mounted before updating state
      if (!isMounted) return;

      if (error) {
        console.error('Failed to load default listings:', error);
        return;
      }
      setListingSearchResults(data || []);
    } finally {
      if (isMounted) {
        setIsSearchingListings(false);
      }
    }
  };

  loadDefaults();

  return () => {
    isMounted = false; // Cleanup on unmount
  };
}, []);
```

**Testing:**
- [ ] Verify default listings load
- [ ] Verify default guests load
- [ ] Test rapid navigation (mount/unmount)
- [ ] Check for React warnings about state updates on unmounted components

~~~~~

## PAGE GROUP: /guest-proposals & /host-proposals (Chunks: 24, 25, 26)

### CHUNK 24: Duplicate .map().filter() pattern
**File:** app/src/lib/proposals/userProposalQueries.js
**Line:** 162, 254, 255, 330, 360, 420
**Issue:** Inefficient .map().filter() chains should be .flatMap() or combined
**Affected Pages:** /guest-proposals, /host-proposals

**Current Code:**
```javascript
// app/src/lib/proposals/userProposalQueries.js:162
const listingIds = [...new Set(validProposals.map(p => p.Listing).filter(Boolean))];

// app/src/lib/proposals/userProposalQueries.js:254-255
const boroughIds = [...new Set((listings || []).map(l => l['Location - Borough']).filter(Boolean))];
const hoodIds = [...new Set((listings || []).map(l => l['Location - Hood']).filter(Boolean))];
```

**Refactored Code:**
```javascript
// Use flatMap or reduce for better efficiency
const listingIds = [...new Set(
  validProposals.flatMap(p => p.Listing ? [p.Listing] : [])
)];

// Or use reduce for single pass
const listingIds = [...new Set(
  validProposals.reduce((acc, p) => {
    if (p.Listing) acc.push(p.Listing);
    return acc;
  }, [])
)];

// Helper function for reuse
function extractUniqueValues(items, key) {
  return [...new Set(
    items.flatMap(item => item[key] ? [item[key]] : [])
  )];
}

// Usage:
const listingIds = extractUniqueValues(validProposals, 'Listing');
const boroughIds = extractUniqueValues(listings || [], 'Location - Borough');
```

**Testing:**
- [ ] Verify proposal data loads correctly
- [ ] Check listing/borough/hood extraction
- [ ] Performance test with large proposal lists

~~~~~

### CHUNK 25: Duplicate data fetching pattern in useHostProposalsPageLogic
**File:** app/src/islands/pages/HostProposalsPage/useHostProposalsPageLogic.js
**Line:** 395, 415
**Issue:** Same .map().filter() pattern repeated for guest/VM fetching
**Affected Pages:** /host-proposals

**Current Code:**
```javascript
// app/src/islands/pages/HostProposalsPage/useHostProposalsPageLogic.js:395
const guestIds = [...new Set(proposals.map(p => p.Guest).filter(Boolean))];

// app/src/islands/pages/HostProposalsPage/useHostProposalsPageLogic.js:415
const vmIds = [...new Set(proposals.map(p => p['virtual meeting']).filter(Boolean))];
```

**Refactored Code:**
```javascript
// Import shared utility
import { extractUniqueValues } from '../../../lib/utils.js';

// Usage:
const guestIds = extractUniqueValues(proposals, 'Guest');
const vmIds = extractUniqueValues(proposals, 'virtual meeting');
```

**Testing:**
- [ ] Verify guest data loads
- [ ] Verify virtual meeting data loads
- [ ] Test with proposals missing guest/VM data

~~~~~

### CHUNK 26: Duplicate day name mapping pattern
**File:** app/src/islands/pages/ViewSplitLeasePage.jsx
**Line:** 1041
**Issue:** Same dayNames.map().filter() pattern in 4 files
**Affected Pages:** /view-split-lease, /preview-split-lease, /favorite-listings

**Current Code:**
```javascript
// app/src/islands/pages/ViewSplitLeasePage.jsx:1041
const numbers = dayNames.map(name => dayNameMap[name]).filter(num => num !== undefined);

// Same pattern in:
// app/src/islands/pages/ViewSplitLeasePage/ViewSplitLeasePage.jsx:486
// app/src/islands/pages/PreviewSplitLeasePage.jsx:708
// app/src/islands/shared/CreateProposalFlowV2Components/DaysSelectionSection.jsx:132
```

**Refactored Code:**
```javascript
// Add to lib/dayUtils.js
/**
 * Convert day names to 0-based indices
 * @param {string[]} dayNames - Array of day names
 * @param {Object} dayNameMap - Map of name to index (optional, uses default)
 * @returns {number[]} Array of day indices
 */
export function dayNamesToIndices(dayNames, dayNameMap = null) {
  const defaultMap = {
    'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
    'Thursday': 4, 'Friday': 5, 'Saturday': 6
  };
  const map = dayNameMap || defaultMap;
  return dayNames
    .map(name => map[name])
    .filter(num => num !== undefined);
}

// Usage in ViewSplitLeasePage.jsx:
import { dayNamesToIndices } from '../../lib/dayUtils.js';
const numbers = dayNamesToIndices(dayNames);
```

**Testing:**
- [ ] Test day name to index conversion
- [ ] Verify ViewSplitLeasePage day selection
- [ ] Verify PreviewSplitLeasePage
- [ ] Verify DaysSelectionSection

~~~~~

## PAGE GROUP: CROSS-CUTTING (Chunks: 27)

### CHUNK 27: Create centralized logger utility
**File:** NEW: app/src/lib/logger.js
**Line:** N/A (new file)
**Issue:** Need conditional logging to replace 50+ console statements
**Affected Pages:** AUTO (all pages benefit)

**Current Code:**
```javascript
// Scattered across codebase:
console.log('Debug message');
console.error('Error message');
console.warn('Warning message');
```

**Refactored Code:**
```javascript
// NEW FILE: app/src/lib/logger.js

/**
 * Centralized logging utility for Split Lease
 * - Suppresses debug/info logs in production
 * - Always shows warnings and errors
 * - Provides consistent logging interface
 */

const isDev = import.meta.env.DEV;

export const logger = {
  /**
   * Debug-level logging (dev only)
   */
  debug: (...args) => {
    if (isDev) console.log(...args);
  },

  /**
   * Info-level logging (dev only)
   */
  info: (...args) => {
    if (isDev) console.info(...args);
  },

  /**
   * Warning-level logging (always shown)
   */
  warn: (...args) => {
    console.warn(...args);
  },

  /**
   * Error-level logging (always shown)
   */
  error: (...args) => {
    console.error(...args);
  },

  /**
   * Group-related logs (dev only)
   */
  group: (label) => {
    if (isDev) console.group(label);
  },

  groupEnd: () => {
    if (isDev) console.groupEnd();
  }
};

// Default export for convenience
export default logger;
```

**Testing:**
- [ ] Verify dev logs show in development
- [ ] Verify logs are suppressed in production build
- [ ] Test error logging always works
- [ ] Integration test with existing code

~~~~~

---

## Implementation Priority

### HIGH PRIORITY (Do First)
1. **CHUNK 18**: Delete duplicate files with (1) suffix - reduces noise
2. **CHUNK 3**: Consolidate DAY_NAMES - highest impact, 6 locations
3. **CHUNK 4**: Consolidate DAYS_OF_WEEK - affects proposal modals
4. **CHUNK 27**: Create logger.js - enables other cleanup

### MEDIUM PRIORITY
5. **CHUNK 1**: Consolidate DAY_ABBREV - 7 locations
6. **CHUNK 5**: Consolidate formatCurrency - 2 implementations
7. **CHUNK 8**: Consolidate formatDate - 2 implementations
8. **CHUNK 20**: Create lib/formatters.js - enables other refactors
9. **CHUNK 9, 10, 15, 21**: Console.log cleanup (after logger exists)

### LOW PRIORITY
10. **CHUNK 2, 16**: Inline .toFixed(2) cleanup
11. **CHUNK 11, 12, 13, 14**: Minor constant duplications
12. **CHUNK 17, 22**: useState consolidation
13. **CHUNK 19**: useBodyScrollLock extraction
14. **CHUNK 23**: useEffect race condition fixes
15. **CHUNK 24, 25, 26**: .map().filter() optimizations

---

## File References

### Files to Create
- `app/src/lib/formatters.js` (CHUNK 20)
- `app/src/lib/logger.js` (CHUNK 27)
- `app/src/hooks/useBodyScrollLock.js` (CHUNK 19)

### Files to Delete
- 12 duplicate files with (1) suffix (CHUNK 18)

### Files to Modify (Major)
- `app/src/lib/constants.js` - Add DAYS_OF_WEEK, ensure DAY_ABBREV exists
- `app/src/lib/dayUtils.js` - Import instead of define DAY_NAMES
- `app/src/lib/scheduleSelector/dayHelpers.js` - Import instead of define
- `app/src/lib/auth.js` - Replace console with logger

### Files to Modify (Minor - Import Updates)
- All files listed in individual chunks

---

## Estimated Impact

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Duplicate DAY_NAMES definitions | 6 | 1 | 83% reduction |
| Duplicate DAYS_OF_WEEK definitions | 2 | 1 | 50% reduction |
| Duplicate formatCurrency definitions | 2 | 1 | 50% reduction |
| Console.log statements | 50+ | 0 (in prod) | 100% reduction |
| Duplicate backup files | 12 | 0 | 100% reduction |
| Lines of duplicate code | ~200 | ~0 | 100% reduction |

---

## Notes

- All day indices use 0-based JavaScript standard (0=Sunday through 6=Saturday)
- Maintain backwards compatibility by re-exporting from original locations
- Run `bun run build` after each chunk to verify no breaks
- Test affected pages after each change
