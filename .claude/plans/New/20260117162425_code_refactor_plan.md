# Code Refactoring Plan - Codebase Audit Results

**Generated**: 2026-01-17 16:24:25
**Scope**: `app/src/**/*`
**Total Files Analyzed**: 595 files
**Total Issues Identified**: 12 refactoring chunks

---

## Executive Summary

This audit identified the following categories of issues:
1. **Code Duplication** (4 issues) - Repeated patterns and duplicate constants
2. **Performance Issues** (3 issues) - Console logging in production, unnecessary re-computations
3. **Maintainability Issues** (3 issues) - Large functions, boilerplate patterns
4. **Anti-Patterns** (2 issues) - Hardcoded values, mixed concerns

---

## Page Group: GLOBAL (Affects Multiple Pages)

### Chunk 1: Excessive Console Logging in Production Code
**Issue Type**: Performance
**Severity**: Medium
**Files Affected**: 125 files with 883 console.log/warn/debug occurrences
**Affected Pages**: ALL pages (Header, Footer, auth flows, search, proposals, listings)

The codebase contains 883 console statements across 125 files. While some are routed through a logger utility, many are direct console calls that should be removed or gated behind a development check.

~~~~~

**Current Code** (`app/src/lib/dataLookups.js:82-88`):
```javascript
    lookupCache.initialized = true;
    console.log('Data lookups initialized successfully');
  } catch (error) {
    console.error('Failed to initialize data lookups:', error);
    // Don't throw - allow app to continue with empty caches
    // This follows "No Fallback Mechanisms" - we show "Unknown" instead
  }
```

**Refactored Code** (`app/src/lib/dataLookups.js:82-88`):
```javascript
    lookupCache.initialized = true;
    logger.debug('Data lookups initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize data lookups:', error);
    // Don't throw - allow app to continue with empty caches
    // This follows "No Fallback Mechanisms" - we show "Unknown" instead
  }
```

~~~~~

### Chunk 2: Duplicate DAYS and DAY_NUMBERS Constants
**Issue Type**: Code Duplication
**Severity**: Low
**Files Affected**: `app/src/lib/constants.js`
**Affected Pages**: /search, /view-split-lease, /listing-dashboard, /self-listing (any page using day selection)

`DAYS` (lines 53-61) and `DAY_NUMBERS` (lines 77-85) are identical objects. One should be removed and the other aliased.

~~~~~

**Current Code** (`app/src/lib/constants.js:53-85`):
```javascript
export const DAYS = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6
};

export const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday'
];

export const DAY_ABBREVIATIONS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

// JavaScript day numbering (0-based, matching Date.getDay())
// NOTE: BUBBLE_DAY_NUMBERS removed - database now uses 0-indexed days natively
export const DAY_NUMBERS = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6
};
```

**Refactored Code** (`app/src/lib/constants.js:53-85`):
```javascript
export const DAYS = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6
};

export const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday'
];

export const DAY_ABBREVIATIONS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

// JavaScript day numbering (0-based, matching Date.getDay())
// NOTE: BUBBLE_DAY_NUMBERS removed - database now uses 0-indexed days natively
// DAY_NUMBERS is an alias for DAYS - kept for backward compatibility
export const DAY_NUMBERS = DAYS;
```

~~~~~

### Chunk 3: Price Field Map Duplicated Across Files
**Issue Type**: Code Duplication
**Severity**: Medium
**Files Affected**:
  - `app/src/lib/constants.js:123-130`
  - `app/src/lib/priceCalculations.js:49-56`
**Affected Pages**: /view-split-lease, /search, /listing-dashboard, /guest-proposals

The price field mapping is defined in both `constants.js` and `priceCalculations.js`, violating DRY.

~~~~~

**Current Code** (`app/src/lib/priceCalculations.js:40-56`):
```javascript
export function getNightlyPriceForNights(listing, nightsSelected) {
  if (!listing || !nightsSelected) return null;

  // Price override takes precedence
  if (listing['💰Price Override']) {
    return listing['💰Price Override'];
  }

  // Map nights to price fields
  const priceFieldMap = {
    1: '💰Nightly Host Rate for 1 night',
    2: '💰Nightly Host Rate for 2 nights',
    3: '💰Nightly Host Rate for 3 nights',
    4: '💰Nightly Host Rate for 4 nights',
    5: '💰Nightly Host Rate for 5 nights',
    7: '💰Nightly Host Rate for 7 nights'
  };
```

**Refactored Code** (`app/src/lib/priceCalculations.js:40-56`):
```javascript
import { NIGHTLY_PRICE_FIELD_MAP } from './constants.js';

export function getNightlyPriceForNights(listing, nightsSelected) {
  if (!listing || !nightsSelected) return null;

  // Price override takes precedence
  if (listing['💰Price Override']) {
    return listing['💰Price Override'];
  }

  // Use centralized price field map from constants
  const fieldName = NIGHTLY_PRICE_FIELD_MAP[nightsSelected];
```

~~~~~

---

## Page Group: /search

### Chunk 4: Duplicate Photo/Host Fetching Logic in useSearchPageLogic
**Issue Type**: Code Duplication
**Severity**: High
**Files Affected**: `app/src/islands/pages/useSearchPageLogic.js`
**Affected Pages**: /search

The `fetchAllActiveListings` (lines 217-296) and `fetchListings` (lines 302-456) functions contain nearly identical photo and host fetching logic. This should be extracted to a shared helper.

~~~~~

**Current Code** (`app/src/islands/pages/useSearchPageLogic.js:217-260`):
```javascript
  const fetchAllActiveListings = useCallback(async () => {
    console.log('📍 [fetchAllActiveListings] Starting fetch for all active listings');
    setIsLoading(true);

    try {
      // Fetch all active listings with unified query
      const { data: activeListings, error } = await supabase
        .from('listing')
        .select(`
          _id,
          "Listing Type",
          "Listing Description",
          "Price 4 nights selected",
          Neighborhood,
          "Host User",
          photos,
          "Listing Latitude",
          "Listing Longitude",
          "Kitchen Type",
          Features,
          "Search Enabled"
        `)
        .eq('"Search Enabled"', true)
        .order('"Modified Date"', { ascending: false });

      if (error) {
        console.error('Error fetching active listings:', error);
        throw error;
      }

      console.log('📍 [fetchAllActiveListings] Fetched listings:', activeListings?.length || 0);
```

**Refactored Code** (`app/src/islands/pages/useSearchPageLogic.js:217-260`):
```javascript
  // Extracted shared listing transformation logic
  const transformListingsWithLookups = useCallback(async (rawListings) => {
    if (!rawListings?.length) return [];

    // Extract all unique photo IDs and host IDs for batch fetching
    const photoIds = new Set();
    const hostIds = new Set();

    rawListings.forEach(listing => {
      const photos = parseJsonArray({ field: listing.photos, fieldName: 'photos' });
      photos.forEach(p => typeof p === 'string' && !p.startsWith('http') && photoIds.add(p));
      if (listing['Host User']) hostIds.add(listing['Host User']);
    });

    // Batch fetch photos and hosts
    const [photoMap, hostMap] = await Promise.all([
      fetchPhotoUrls([...photoIds]),
      fetchHostData([...hostIds])
    ]);

    // Transform listings
    return rawListings.map(listing => transformListing(listing, photoMap, hostMap));
  }, []);

  const fetchAllActiveListings = useCallback(async () => {
    logger.debug('[fetchAllActiveListings] Starting fetch for all active listings');
    setIsLoading(true);

    try {
      const { data: activeListings, error } = await supabase
        .from('listing')
        .select(LISTING_SELECT_FIELDS)
        .eq('"Search Enabled"', true)
        .order('"Modified Date"', { ascending: false });

      if (error) throw error;

      logger.debug('[fetchAllActiveListings] Fetched listings:', activeListings?.length || 0);
```

~~~~~

---

## Page Group: /view-split-lease

### Chunk 5: Hardcoded Amenities Emoji Map
**Issue Type**: Anti-Pattern
**Severity**: Low
**Files Affected**: `app/src/lib/supabaseUtils.js:193-211`
**Affected Pages**: /view-split-lease, /search (listing cards)

The amenities emoji map is hardcoded in JavaScript. This should be stored in the database for easier maintenance.

~~~~~

**Current Code** (`app/src/lib/supabaseUtils.js:193-211`):
```javascript
export function parseAmenities(dbListing) {
  // Amenities map with icons and priority (lower = higher priority)
  const amenitiesMap = {
    'wifi': { icon: '📶', name: 'WiFi', priority: 1 },
    'furnished': { icon: '🛋️', name: 'Furnished', priority: 2 },
    'pet': { icon: '🐕', name: 'Pet-Friendly', priority: 3 },
    'dog': { icon: '🐕', name: 'Pet-Friendly', priority: 3 },
    'cat': { icon: '🐕', name: 'Pet-Friendly', priority: 3 },
    'washer': { icon: '🧺', name: 'Washer/Dryer', priority: 4 },
    'dryer': { icon: '🧺', name: 'Washer/Dryer', priority: 4 },
    'parking': { icon: '🅿️', name: 'Parking', priority: 5 },
    'elevator': { icon: '🏢', name: 'Elevator', priority: 6 },
    'gym': { icon: '💪', name: 'Gym', priority: 7 },
    'doorman': { icon: '🚪', name: 'Doorman', priority: 8 },
    'ac': { icon: '❄️', name: 'A/C', priority: 9 },
    'air conditioning': { icon: '❄️', name: 'A/C', priority: 9 },
    'kitchen': { icon: '🍳', name: 'Kitchen', priority: 10 },
    'balcony': { icon: '🌿', name: 'Balcony', priority: 11 },
    'workspace': { icon: '💻', name: 'Workspace', priority: 12 },
    'desk': { icon: '💻', name: 'Workspace', priority: 12 }
  };
```

**Refactored Code** (`app/src/lib/supabaseUtils.js:193-211`):
```javascript
import { AMENITY_DISPLAY_MAP } from './constants.js';

export function parseAmenities(dbListing) {
  // Amenities map imported from constants for central maintenance
  // Consider migrating to database table for dynamic updates
  const amenitiesMap = AMENITY_DISPLAY_MAP;
```

~~~~~

---

## Page Group: Authentication (signup-login, account-profile)

### Chunk 6: Duplicated OAuth Flow Logic for Google and LinkedIn
**Issue Type**: Code Duplication
**Severity**: High
**Files Affected**: `app/src/lib/auth.js`
**Affected Pages**: /signup-login, /account-profile

The Google OAuth functions (lines 1692-1977) and LinkedIn OAuth functions (lines 1400-1679) are nearly identical. They should share a common base implementation.

~~~~~

**Current Code** (`app/src/lib/auth.js:1692-1718`):
```javascript
export async function initiateGoogleOAuth(userType) {
  logger.debug('[Auth] Initiating Google OAuth with userType:', userType);

  // Store user type before redirect
  setGoogleOAuthUserType(userType);

  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/account-profile`,
        scopes: 'openid profile email',
      }
    });

    if (error) {
      clearGoogleOAuthUserType();
      return { success: false, error: error.message };
    }

    // OAuth redirect will happen automatically
    return { success: true, data };
  } catch (err) {
    clearGoogleOAuthUserType();
    return { success: false, error: err.message };
  }
}
```

**Refactored Code** (`app/src/lib/auth.js:1692-1718`):
```javascript
// Generic OAuth signup initiator
async function initiateOAuthSignup(provider, userType, setOAuthUserType, clearOAuthUserType) {
  logger.debug(`[Auth] Initiating ${provider} OAuth with userType:`, userType);

  setOAuthUserType(userType);

  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/account-profile`,
        scopes: 'openid profile email',
      }
    });

    if (error) {
      clearOAuthUserType();
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err) {
    clearOAuthUserType();
    return { success: false, error: err.message };
  }
}

export const initiateGoogleOAuth = (userType) =>
  initiateOAuthSignup('google', userType, setGoogleOAuthUserType, clearGoogleOAuthUserType);

export const initiateLinkedInOAuth = (userType) =>
  initiateOAuthSignup('linkedin_oidc', userType, setLinkedInOAuthUserType, clearLinkedInOAuthUserType);
```

~~~~~

---

## Page Group: /listing-dashboard, /self-listing

### Chunk 7: Repetitive Lookup Initialization Functions
**Issue Type**: Maintainability
**Severity**: Medium
**Files Affected**: `app/src/lib/dataLookups.js`
**Affected Pages**: ALL pages (lookups are initialized globally)

The 10 `initialize*Lookups` functions (lines 94-376) follow an identical pattern. This could be generalized with a factory function.

~~~~~

**Current Code** (`app/src/lib/dataLookups.js:94-113`):
```javascript
async function initializeBoroughLookups() {
  try {
    const { data, error } = await supabase
      .schema('reference_table')
      .from(DATABASE.TABLES.BOROUGH)
      .select('_id, "Display Borough"');

    if (error) throw error;

    if (data && Array.isArray(data)) {
      data.forEach(borough => {
        const name = borough['Display Borough'] || 'Unknown Borough';
        lookupCache.boroughs.set(borough._id, name.trim());
      });
      console.log(`Cached ${lookupCache.boroughs.size} boroughs`);
    }
  } catch (error) {
    console.error('Failed to initialize borough lookups:', error);
  }
}
```

**Refactored Code** (`app/src/lib/dataLookups.js:94-113`):
```javascript
// Generic lookup initializer factory
function createLookupInitializer(config) {
  const { cacheName, table, schema, select, transform, entityName } = config;

  return async function() {
    try {
      let query = schema
        ? supabase.schema(schema).from(table)
        : supabase.from(table);

      const { data, error } = await query.select(select);

      if (error) throw error;

      if (data && Array.isArray(data)) {
        data.forEach(item => {
          const transformed = transform(item);
          if (transformed) {
            lookupCache[cacheName].set(item._id, transformed);
          }
        });
        logger.debug(`Cached ${lookupCache[cacheName].size} ${entityName}`);
      }
    } catch (error) {
      logger.error(`Failed to initialize ${entityName} lookups:`, error);
    }
  };
}

const initializeBoroughLookups = createLookupInitializer({
  cacheName: 'boroughs',
  table: DATABASE.TABLES.BOROUGH,
  schema: 'reference_table',
  select: '_id, "Display Borough"',
  transform: (borough) => (borough['Display Borough'] || 'Unknown Borough').trim(),
  entityName: 'boroughs'
});
```

~~~~~

---

## Page Group: /guest-proposals, /host-proposals

### Chunk 8: Repeated normalizeStatusKey Calls in Hot Paths
**Issue Type**: Performance
**Severity**: Low
**Files Affected**: `app/src/logic/constants/proposalStatuses.js`
**Affected Pages**: /guest-proposals, /host-proposals, /view-split-lease (proposal status display)

`normalizeStatusKey` is called repeatedly within `getStatusConfig`, `shouldShowStatusBanner`, and other functions. The result should be memoized.

~~~~~

**Current Code** (`app/src/logic/constants/proposalStatuses.js:240-267`):
```javascript
export function getStatusConfig(statusKey) {
  if (!statusKey) {
    return {
      key: 'Unknown',
      color: 'gray',
      label: 'Unknown Status',
      stage: null,
      usualOrder: 0,
      actions: []
    };
  }

  // Normalize status key to handle trailing spaces from Bubble data
  const normalizedKey = normalizeStatusKey(statusKey);

  const config = Object.values(PROPOSAL_STATUSES).find(
    s => normalizeStatusKey(s.key) === normalizedKey
  );

  return config || {
    key: normalizedKey,
    color: 'gray',
    label: normalizedKey,
    stage: null,
    usualOrder: 0,
    actions: []
  };
}
```

**Refactored Code** (`app/src/logic/constants/proposalStatuses.js:240-267`):
```javascript
// Pre-compute normalized keys for fast lookup
const STATUS_KEY_MAP = new Map(
  Object.values(PROPOSAL_STATUSES).map(status => [
    normalizeStatusKey(status.key),
    status
  ])
);

export function getStatusConfig(statusKey) {
  if (!statusKey) {
    return {
      key: 'Unknown',
      color: 'gray',
      label: 'Unknown Status',
      stage: null,
      usualOrder: 0,
      actions: []
    };
  }

  const normalizedKey = normalizeStatusKey(statusKey);
  const config = STATUS_KEY_MAP.get(normalizedKey);

  return config || {
    key: normalizedKey,
    color: 'gray',
    label: normalizedKey,
    stage: null,
    usualOrder: 0,
    actions: []
  };
}
```

~~~~~

---

## Page Group: secureStorage (Auth Core)

### Chunk 9: Redundant OAuth Storage Functions for Multiple Providers
**Issue Type**: Code Duplication
**Severity**: Medium
**Files Affected**: `app/src/lib/secureStorage.js`
**Affected Pages**: /signup-login, /account-profile

LinkedIn and Google OAuth storage functions (lines 300-404) are identical except for the key names. These should be generalized.

~~~~~

**Current Code** (`app/src/lib/secureStorage.js:300-351`):
```javascript
export function setLinkedInOAuthUserType(userType) {
  if (userType) {
    localStorage.setItem(STATE_KEYS.LINKEDIN_OAUTH_USER_TYPE, userType);
  }
}

export function getLinkedInOAuthUserType() {
  return localStorage.getItem(STATE_KEYS.LINKEDIN_OAUTH_USER_TYPE);
}

export function clearLinkedInOAuthUserType() {
  localStorage.removeItem(STATE_KEYS.LINKEDIN_OAUTH_USER_TYPE);
}

export function setLinkedInOAuthLoginFlow(isLoginFlow) {
  if (isLoginFlow) {
    localStorage.setItem(STATE_KEYS.LINKEDIN_OAUTH_LOGIN_FLOW, 'true');
  } else {
    localStorage.removeItem(STATE_KEYS.LINKEDIN_OAUTH_LOGIN_FLOW);
  }
}

export function getLinkedInOAuthLoginFlow() {
  return localStorage.getItem(STATE_KEYS.LINKEDIN_OAUTH_LOGIN_FLOW) === 'true';
}

export function clearLinkedInOAuthLoginFlow() {
  localStorage.removeItem(STATE_KEYS.LINKEDIN_OAUTH_LOGIN_FLOW);
}
```

**Refactored Code** (`app/src/lib/secureStorage.js:300-351`):
```javascript
// Generic OAuth storage factory
function createOAuthStorageFunctions(userTypeKey, loginFlowKey) {
  return {
    setUserType: (userType) => {
      if (userType) localStorage.setItem(userTypeKey, userType);
    },
    getUserType: () => localStorage.getItem(userTypeKey),
    clearUserType: () => localStorage.removeItem(userTypeKey),
    setLoginFlow: (isLoginFlow) => {
      if (isLoginFlow) {
        localStorage.setItem(loginFlowKey, 'true');
      } else {
        localStorage.removeItem(loginFlowKey);
      }
    },
    getLoginFlow: () => localStorage.getItem(loginFlowKey) === 'true',
    clearLoginFlow: () => localStorage.removeItem(loginFlowKey)
  };
}

const linkedInOAuth = createOAuthStorageFunctions(
  STATE_KEYS.LINKEDIN_OAUTH_USER_TYPE,
  STATE_KEYS.LINKEDIN_OAUTH_LOGIN_FLOW
);

const googleOAuth = createOAuthStorageFunctions(
  STATE_KEYS.GOOGLE_OAUTH_USER_TYPE,
  STATE_KEYS.GOOGLE_OAUTH_LOGIN_FLOW
);

// Export with original names for backward compatibility
export const setLinkedInOAuthUserType = linkedInOAuth.setUserType;
export const getLinkedInOAuthUserType = linkedInOAuth.getUserType;
export const clearLinkedInOAuthUserType = linkedInOAuth.clearUserType;
export const setLinkedInOAuthLoginFlow = linkedInOAuth.setLoginFlow;
export const getLinkedInOAuthLoginFlow = linkedInOAuth.getLoginFlow;
export const clearLinkedInOAuthLoginFlow = linkedInOAuth.clearLoginFlow;

export const setGoogleOAuthUserType = googleOAuth.setUserType;
export const getGoogleOAuthUserType = googleOAuth.getUserType;
export const clearGoogleOAuthUserType = googleOAuth.clearUserType;
export const setGoogleOAuthLoginFlow = googleOAuth.setLoginFlow;
export const getGoogleOAuthLoginFlow = googleOAuth.getLoginFlow;
export const clearGoogleOAuthLoginFlow = googleOAuth.clearLoginFlow;
```

~~~~~

---

## Page Group: Debug/Development Only

### Chunk 10: Debug Export Should Be Conditionally Included
**Issue Type**: Anti-Pattern
**Severity**: Low
**Files Affected**: `app/src/lib/secureStorage.js:409-417`
**Affected Pages**: None (development only)

The `__DEV__` export exposes sensitive token data and should be removed in production builds.

~~~~~

**Current Code** (`app/src/lib/secureStorage.js:406-418`):
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

**Refactored Code** (`app/src/lib/secureStorage.js:406-418`):
```javascript
/**
 * Export for debugging (only in development)
 */
export const __DEV__ = import.meta.env.DEV ? {
  dumpSecureStorage() {
    return {
      token: getAuthToken(),
      sessionId: getSessionId(),
      refreshData: getRefreshData()
    };
  }
} : null;
```

~~~~~

---

## Page Group: Logic Core (calculators, rules, processors)

### Chunk 11: Missing Nights Value in Price Field Map
**Issue Type**: Data Integrity
**Severity**: Medium
**Files Affected**: `app/src/lib/priceCalculations.js:49-56`
**Affected Pages**: /view-split-lease, /search, /listing-dashboard

The `priceFieldMap` is missing the mapping for 6 nights, which could cause pricing issues.

~~~~~

**Current Code** (`app/src/lib/priceCalculations.js:49-56`):
```javascript
  // Map nights to price fields
  const priceFieldMap = {
    1: '💰Nightly Host Rate for 1 night',
    2: '💰Nightly Host Rate for 2 nights',
    3: '💰Nightly Host Rate for 3 nights',
    4: '💰Nightly Host Rate for 4 nights',
    5: '💰Nightly Host Rate for 5 nights',
    7: '💰Nightly Host Rate for 7 nights'
  };
```

**Refactored Code** (`app/src/lib/priceCalculations.js:49-56`):
```javascript
  // Map nights to price fields (all supported values 1-7)
  const priceFieldMap = {
    1: '💰Nightly Host Rate for 1 night',
    2: '💰Nightly Host Rate for 2 nights',
    3: '💰Nightly Host Rate for 3 nights',
    4: '💰Nightly Host Rate for 4 nights',
    5: '💰Nightly Host Rate for 5 nights',
    6: '💰Nightly Host Rate for 6 nights',
    7: '💰Nightly Host Rate for 7 nights'
  };
```

~~~~~

---

## Page Group: Session Verification

### Chunk 12: Session Verification Loop Could Be Simplified
**Issue Type**: Maintainability
**Severity**: Low
**Files Affected**: `app/src/lib/auth.js:569-584`
**Affected Pages**: /signup-login (login flow)

The session verification loop is duplicated in both `loginUser` and `signupUser`. It should be extracted.

~~~~~

**Current Code** (`app/src/lib/auth.js:569-584`):
```javascript
      // CRITICAL: Verify the session is actually persisted before proceeding
      // This fixes a race condition where the page can reload before localStorage is written
      let verifyAttempts = 0;
      const maxVerifyAttempts = 5;
      while (verifyAttempts < maxVerifyAttempts) {
        const { data: { session: verifiedSession } } = await supabase.auth.getSession();
        if (verifiedSession && verifiedSession.access_token === access_token) {
          logger.debug('✅ Session verified and persisted');
          break;
        }
        verifyAttempts++;
        logger.debug(`⏳ Waiting for session to persist (attempt ${verifyAttempts}/${maxVerifyAttempts})...`);
        await delay(100);
      }

      if (verifyAttempts >= maxVerifyAttempts) {
        logger.warn('⚠️ Session may not be fully persisted, but continuing...');
      }
```

**Refactored Code** (`app/src/lib/auth.js:569-584`):
```javascript
// Extract to reusable helper at top of file
async function verifySessionPersisted(expectedAccessToken, maxAttempts = 5, delayMs = 100) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token === expectedAccessToken) {
      logger.debug('✅ Session verified and persisted');
      return true;
    }
    logger.debug(`⏳ Waiting for session to persist (attempt ${attempt}/${maxAttempts})...`);
    await delay(delayMs);
  }
  logger.warn('⚠️ Session may not be fully persisted, but continuing...');
  return false;
}

// Usage in loginUser/signupUser:
      await verifySessionPersisted(access_token);
```

~~~~~

---

## Implementation Priority

| Priority | Chunk | Effort | Impact |
|----------|-------|--------|--------|
| 1 | Chunk 4 (Duplicate fetch logic) | High | High |
| 2 | Chunk 6 (OAuth duplication) | High | High |
| 3 | Chunk 1 (Console logging) | Medium | Medium |
| 4 | Chunk 7 (Lookup factory) | Medium | Medium |
| 5 | Chunk 9 (OAuth storage factory) | Medium | Medium |
| 6 | Chunk 3 (Price field map) | Low | Medium |
| 7 | Chunk 8 (Status key memoization) | Low | Low |
| 8 | Chunk 11 (Missing 6 nights) | Low | Medium |
| 9 | Chunk 12 (Session verification) | Low | Low |
| 10 | Chunk 2 (Duplicate constants) | Low | Low |
| 11 | Chunk 5 (Amenities map) | Low | Low |
| 12 | Chunk 10 (Dev export) | Low | Low |

---

## Files Referenced

- `app/src/lib/constants.js` - Lines 53-85, 123-130
- `app/src/lib/priceCalculations.js` - Lines 40-56, 49-56
- `app/src/lib/supabaseUtils.js` - Lines 193-211
- `app/src/lib/dataLookups.js` - Lines 82-88, 94-113
- `app/src/lib/auth.js` - Lines 569-584, 1400-1679, 1692-1977
- `app/src/lib/secureStorage.js` - Lines 300-404, 406-418
- `app/src/logic/constants/proposalStatuses.js` - Lines 240-267
- `app/src/islands/pages/useSearchPageLogic.js` - Lines 217-296, 302-456
