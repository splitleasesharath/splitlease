# Code Refactoring Plan - app

**Date:** 2026-01-17
**Audit Type:** general
**Scope:** app/src/islands/, app/src/lib/, app/src/logic/, app/src/hooks/
**Total Issues Identified:** 15 chunks across 8 page groups

---

## PAGE GROUP: /favorite-listings, /search (Chunks: 1, 2, 3)

### CHUNK 1: Remove hardcoded mock data in ListingCard
**File:** app/src/islands/pages/FavoriteListingsPage/components/ListingCard.jsx
**Lines:** 70-76
**Issue:** Production code contains mock data for host name, verification status, and proposal logic. This causes incorrect UI display with fake information.
**Affected Pages:** /favorite-listings, /search

**Current Code:**
```javascript
  // Mock data for host and proposal (in production, this would come from the listing data)
  const hasProposal = listing.id?.includes('1'); // Mock logic
  const hostName = 'Charlie S';
  const hostInitial = hostName.charAt(0);
  const isHostVerified = true;
  const guestCapacity = listing.features?.maxGuests || listing.features?.qtyGuests || 2;
  const originalPrice = Math.floor((listing.listerPriceDisplay || 100) * 1.4); // Mock original price
```

**Refactored Code:**
```javascript
  // Extract host and proposal data from listing object
  const hasProposal = listing.hasActiveProposal || listing.proposalCount > 0;
  const hostName = listing.host?.firstName
    ? `${listing.host.firstName} ${(listing.host.lastName || '').charAt(0)}.`
    : 'Host';
  const hostInitial = hostName.charAt(0);
  const isHostVerified = listing.host?.isVerified ?? false;
  const guestCapacity = listing.features?.maxGuests || listing.features?.qtyGuests || 2;
  const originalPrice = listing.pricingList?.originalNightlyPrice || null;
```

**Testing:**
- [ ] Verify FavoriteListingsPage shows real host data from API response
- [ ] Verify SearchPage listing cards display correct host information
- [ ] Confirm proposal badge only shows when listing has actual proposal

~~~~~

### CHUNK 2: Add useCallback to prevent carousel re-renders
**File:** app/src/islands/pages/FavoriteListingsPage/components/ListingCard.jsx
**Lines:** 28-40
**Issue:** Image carousel handlers create new function references on every render, causing unnecessary re-renders of child components when ListingCard is memoized.
**Affected Pages:** /favorite-listings, /search

**Current Code:**
```javascript
  const handlePreviousPhoto = (e) => {
    e.stopPropagation();
    if (imageIndex > 0) {
      setImageIndex(imageIndex - 1);
    }
  };

  const handleNextPhoto = (e) => {
    e.stopPropagation();
    if (imageIndex < photos.length - 1) {
      setImageIndex(imageIndex + 1);
    }
  };
```

**Refactored Code:**
```javascript
  const handlePreviousPhoto = useCallback((e) => {
    e.stopPropagation();
    setImageIndex(prev => prev > 0 ? prev - 1 : prev);
  }, []);

  const handleNextPhoto = useCallback((e) => {
    e.stopPropagation();
    setImageIndex(prev => prev < photos.length - 1 ? prev + 1 : prev);
  }, [photos.length]);
```

**Testing:**
- [ ] Verify carousel still navigates correctly forward and backward
- [ ] Use React DevTools Profiler to confirm reduced re-renders
- [ ] Test with 20+ listings to verify performance improvement

~~~~~

### CHUNK 3: Add useCallback import to ListingCard
**File:** app/src/islands/pages/FavoriteListingsPage/components/ListingCard.jsx
**Lines:** 7
**Issue:** Missing useCallback import required for Chunk 2 optimization.
**Affected Pages:** /favorite-listings, /search

**Current Code:**
```javascript
import { useState } from 'react';
```

**Refactored Code:**
```javascript
import { useState, useCallback } from 'react';
```

**Testing:**
- [ ] Verify no import errors after change
- [ ] Confirm component renders without errors

~~~~~

## PAGE GROUP: /guest-proposals, /host-proposals, /host-overview, /listing-dashboard, /account-profile (Chunks: 4, 5)

### CHUNK 4: Add async cleanup to prevent stale auth updates
**File:** app/src/hooks/useAuthenticatedUser.js
**Lines:** 26-88
**Issue:** Sequential async calls without cleanup can cause memory leaks and stale state updates if component unmounts between authentication steps.
**Affected Pages:** /guest-proposals, /host-proposals, /host-overview, /listing-dashboard, /account-profile, /favorite-listings, /search

**Current Code:**
```javascript
  useEffect(() => {
    const authenticate = async () => {
      try {
        // ========================================================================
        // GOLD STANDARD AUTH PATTERN - Step 1: Token validation with clearOnFailure: false
        // ========================================================================
        const userData = await validateTokenAndFetchUser({ clearOnFailure: false });
        const sessionId = getSessionId();

        if (userData) {
          // Success path: Use validated user data
          const finalUserId = sessionId || userData.userId || userData._id;
          setUser({
            id: finalUserId,
            name: userData.fullName || userData.firstName || '',
            email: userData.email || '',
            userType: userData.userType || 'GUEST',
            avatarUrl: userData.profilePhoto || null,
            proposalCount: userData.proposalCount ?? 0
          });
          setUserId(finalUserId);
          setLoading(false);
          return;
        }

        // ========================================================================
        // GOLD STANDARD AUTH PATTERN - Step 2: Fallback to Supabase session metadata
        // ========================================================================
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          // Session valid but profile fetch failed - use session metadata
          const finalUserId = session.user.user_metadata?.user_id || getUserId() || session.user.id;
          setUser({
            id: finalUserId,
            name: session.user.user_metadata?.full_name || session.user.user_metadata?.first_name || getFirstName() || session.user.email?.split('@')[0] || 'User',
            email: session.user.email || '',
            userType: session.user.user_metadata?.user_type || 'GUEST',
            avatarUrl: session.user.user_metadata?.avatar_url || null,
            proposalCount: 0
          });
          setUserId(finalUserId);
          setLoading(false);
          return;
        }

        // ========================================================================
        // Step 3: No auth found
        // ========================================================================
        setUser(null);
        setUserId(null);
        setLoading(false);
      } catch (err) {
        console.error('[useAuthenticatedUser] Authentication error:', err);
        setError(err);
        setUser(null);
        setUserId(null);
        setLoading(false);
      }
    };

    authenticate();
  }, []);
```

**Refactored Code:**
```javascript
  useEffect(() => {
    let isMounted = true;

    const authenticate = async () => {
      try {
        // ========================================================================
        // GOLD STANDARD AUTH PATTERN - Step 1: Token validation with clearOnFailure: false
        // ========================================================================
        const userData = await validateTokenAndFetchUser({ clearOnFailure: false });

        // Prevent stale updates if component unmounted
        if (!isMounted) return;

        const sessionId = getSessionId();

        if (userData) {
          // Success path: Use validated user data
          const finalUserId = sessionId || userData.userId || userData._id;
          setUser({
            id: finalUserId,
            name: userData.fullName || userData.firstName || '',
            email: userData.email || '',
            userType: userData.userType || 'GUEST',
            avatarUrl: userData.profilePhoto || null,
            proposalCount: userData.proposalCount ?? 0
          });
          setUserId(finalUserId);
          setLoading(false);
          return;
        }

        // ========================================================================
        // GOLD STANDARD AUTH PATTERN - Step 2: Fallback to Supabase session metadata
        // ========================================================================
        const { data: { session } } = await supabase.auth.getSession();

        // Prevent stale updates if component unmounted during async call
        if (!isMounted) return;

        if (session?.user) {
          // Session valid but profile fetch failed - use session metadata
          const finalUserId = session.user.user_metadata?.user_id || getUserId() || session.user.id;
          setUser({
            id: finalUserId,
            name: session.user.user_metadata?.full_name || session.user.user_metadata?.first_name || getFirstName() || session.user.email?.split('@')[0] || 'User',
            email: session.user.email || '',
            userType: session.user.user_metadata?.user_type || 'GUEST',
            avatarUrl: session.user.user_metadata?.avatar_url || null,
            proposalCount: 0
          });
          setUserId(finalUserId);
          setLoading(false);
          return;
        }

        // ========================================================================
        // Step 3: No auth found
        // ========================================================================
        setUser(null);
        setUserId(null);
        setLoading(false);
      } catch (err) {
        if (!isMounted) return;
        console.error('[useAuthenticatedUser] Authentication error:', err);
        setError(err);
        setUser(null);
        setUserId(null);
        setLoading(false);
      }
    };

    authenticate();

    return () => {
      isMounted = false;
    };
  }, []);
```

**Testing:**
- [ ] Verify auth flow still works normally on protected pages
- [ ] Navigate rapidly between pages and check for React state warnings in console
- [ ] Use React DevTools to verify no memory leaks

~~~~~

### CHUNK 5: Add error boundary logging for global toast failures
**File:** app/src/islands/shared/Header.jsx
**Lines:** Throughout (multiple window.showToast calls)
**Issue:** Global `window.showToast` calls fail silently if the toast system hasn't initialized. No fallback or console warning is provided.
**Affected Pages:** All pages using Header component

**Current Code:**
```javascript
window.showToast?.({
  title: 'Error',
  content: 'No listing ID available',
  type: 'error'
});
```

**Refactored Code:**
```javascript
const showToastSafe = (options) => {
  if (typeof window.showToast === 'function') {
    window.showToast(options);
  } else {
    console.warn('[Header] Toast system not initialized:', options.title, options.content);
  }
};

// Usage:
showToastSafe({
  title: 'Error',
  content: 'No listing ID available',
  type: 'error'
});
```

**Testing:**
- [ ] Temporarily disable toast initialization to verify console warning appears
- [ ] Verify normal toast functionality still works
- [ ] Check that warning provides enough context for debugging

~~~~~

## PAGE GROUP: /view-split-lease, /listing-dashboard, /self-listing (Chunks: 6, 7, 8)

### CHUNK 6: Consolidate pricing calculations - deprecate legacy file
**File:** app/src/lib/priceCalculations.js
**Lines:** 1-128 (entire file)
**Issue:** Duplicate pricing logic exists in three locations. This file duplicates logic from `logic/calculators/pricing/` and should be deprecated. The canonical source is `logic/calculators/pricing/calculatePricingBreakdown.js`.
**Affected Pages:** /view-split-lease, /listing-dashboard, /self-listing

**Current Code:**
```javascript
/**
 * Price Calculation Utilities
 * Handles all pricing logic for view-split-lease page
 *
 * Usage:
 *   import { calculate4WeekRent, calculateReservationTotal } from './priceCalculations.js';
 */

/**
 * Calculate 4-week rent based on nightly price and selected nights
 * Formula: nightly price × nights per week × 4 weeks
 * @param {number} nightlyPrice - Price per night
 * @param {number} nightsPerWeek - Number of nights selected per week
 * @returns {number} 4-week rent amount
 */
export function calculate4WeekRent(nightlyPrice, nightsPerWeek) {
  if (!nightlyPrice || !nightsPerWeek) return 0;
  return nightlyPrice * nightsPerWeek * 4;
}
// ... (rest of file)
```

**Refactored Code:**
```javascript
/**
 * @deprecated This file is deprecated. Use logic/calculators/pricing/ instead.
 *
 * Migration guide:
 *   - calculate4WeekRent → import { calculateFourWeekRent } from '../logic/calculators/pricing/calculateFourWeekRent.js'
 *   - calculateReservationTotal → import { calculateReservationTotal } from '../logic/calculators/pricing/calculateReservationTotal.js'
 *   - calculatePricingBreakdown → import { calculatePricingBreakdown } from '../logic/calculators/pricing/calculatePricingBreakdown.js'
 *   - getNightlyPriceForNights → import { getNightlyRateByFrequency } from '../logic/calculators/pricing/getNightlyRateByFrequency.js'
 *
 * This file will be removed in a future release.
 */

// Re-export from canonical source for backward compatibility
export { calculateFourWeekRent as calculate4WeekRent } from '../logic/calculators/pricing/calculateFourWeekRent.js';
export { calculateReservationTotal } from '../logic/calculators/pricing/calculateReservationTotal.js';
export { calculatePricingBreakdown } from '../logic/calculators/pricing/calculatePricingBreakdown.js';
export { getNightlyRateByFrequency as getNightlyPriceForNights } from '../logic/calculators/pricing/getNightlyRateByFrequency.js';

// Keep formatPrice export for backward compatibility
export { formatPriceOrZero as formatPrice } from './formatters/priceFormatter.js';

// Helper functions that don't exist in new location - keep temporarily
export function isValidForPricing(daysSelected) {
  return daysSelected >= 2 && daysSelected <= 7;
}

export function getPriceDisplayMessage(daysSelected) {
  if (!daysSelected || daysSelected < 2) {
    return 'Please Select More Days';
  }
  if (daysSelected > 7) {
    return 'Please Select 7 Days or Less';
  }
  return null;
}
```

**Testing:**
- [ ] Verify view-split-lease pricing displays correctly
- [ ] Verify listing-dashboard pricing matches
- [ ] Run existing pricing tests if available
- [ ] Check console for no import errors

~~~~~

### CHUNK 7: Remove duplicate console.log statements in priceCalculations
**File:** app/src/lib/scheduleSelector/priceCalculations.js
**Lines:** 36-40, 88-92, 157-169
**Issue:** Verbose console.log statements left in production code for debugging. These clutter the console and leak implementation details.
**Affected Pages:** /view-split-lease, /listing-dashboard

**Current Code:**
```javascript
  console.log('=== CALCULATE PRICE ===');
  console.log('nightsCount:', nightsCount);
  console.log('listing rental type:', listing?.['rental type'] || listing?.rentalType);
  console.log('reservationSpan:', reservationSpan);
  // ... later in file
  console.log('=== PRICE CALCULATION RESULT ===');
  console.log('pricePerNight:', pricePerNight);
  console.log('fourWeekRent:', fourWeekRent);
  console.log('reservationTotal:', reservationTotal);
  console.log('initialPayment:', initialPayment);
  // ... and in calculateMonthlyPrice
  console.log('Monthly calculation:', {
    monthlyAvgNightly,
    averageWeeklyPrice,
    // ... etc
  });
```

**Refactored Code:**
```javascript
  // Remove all console.log statements from production code
  // If debugging is needed, use conditional logging:
  const DEBUG_PRICING = false; // Set to true only during development

  if (DEBUG_PRICING) {
    console.log('=== CALCULATE PRICE ===', { nightsCount, rentalType: listing?.rentalType, reservationSpan });
  }

  // ... calculation logic without logging ...

  if (DEBUG_PRICING) {
    console.log('=== PRICE RESULT ===', { pricePerNight, fourWeekRent, reservationTotal, initialPayment });
  }
```

**Testing:**
- [ ] Verify pricing calculations still work correctly
- [ ] Confirm console is clean of pricing debug logs in production
- [ ] Enable DEBUG_PRICING flag and verify logging works when needed

~~~~~

### CHUNK 8: Centralize day index conversion utilities
**File:** app/src/lib/scheduleSelector/dayHelpers.js
**Lines:** 8-10
**Issue:** Day constants are re-exported from dayUtils.js, which is good. However, some files still import directly from dayUtils.js while others import from dayHelpers.js, creating confusion. Standardize imports.
**Affected Pages:** /listing-dashboard, /self-listing, /view-split-lease

**Current Code:**
```javascript
// Re-export day constants from canonical source (dayUtils.js)
import { DAY_NAMES, DAY_LETTERS, DAY_ABBREV } from '../dayUtils.js';
export { DAY_NAMES, DAY_LETTERS, DAY_ABBREV };
```

**Refactored Code:**
```javascript
// Re-export day constants from canonical source (dayUtils.js)
// NOTE: Always import day utilities from this file (dayHelpers.js) for schedule-related code.
// For general day utilities, import directly from lib/dayUtils.js.
import { DAY_NAMES, DAY_LETTERS, DAY_ABBREV } from '../dayUtils.js';
export { DAY_NAMES, DAY_LETTERS, DAY_ABBREV };

// Also re-export commonly used day utility functions
export {
  getDayName,
  getDayAbbrev,
  getDayLetter,
  isValidDayIndex
} from '../dayUtils.js';
```

**Testing:**
- [ ] Verify all schedule selectors still display correct day names
- [ ] Check imports across codebase for consistency
- [ ] Verify no circular import issues

~~~~~

## PAGE GROUP: /self-listing, /self-listing-v2, /rental-application (Chunks: 9, 10)

### CHUNK 9: Standardize form state pattern documentation
**File:** app/src/islands/pages/SelfListingPage/README.md (new file)
**Lines:** N/A (new file)
**Issue:** Three different form state patterns are used across pages (Zustand, useState, useState+context). This causes developer confusion. Document the recommended pattern.
**Affected Pages:** /self-listing, /self-listing-v2, /rental-application, /listing-dashboard

**Current Code:**
```javascript
// No documentation exists for form state pattern decisions
```

**Refactored Code:**
```markdown
# SelfListingPage Form State Architecture

## Pattern: Zustand Store

This page uses Zustand for form state management. This is the **recommended pattern** for multi-section forms in this codebase.

### Why Zustand?

1. **Persistence**: Easy to persist form state across page refreshes
2. **Cross-component access**: Any component can access/update form state without prop drilling
3. **DevTools**: Zustand DevTools integration for debugging
4. **Performance**: Selective subscriptions prevent unnecessary re-renders

### Usage

\`\`\`javascript
import { useListingStore } from './stores/useListingStore';

function MySection() {
  // Subscribe to specific slice to minimize re-renders
  const amenities = useListingStore(state => state.amenities);
  const setAmenities = useListingStore(state => state.setAmenities);

  return <AmenitySelector value={amenities} onChange={setAmenities} />;
}
\`\`\`

### Other Pages

- **ListingDashboardPage**: Uses useState with context (legacy pattern)
- **RentalApplicationPage**: Uses useState with computed state (simpler forms)

When creating new multi-section forms, prefer the Zustand pattern demonstrated here.
```

**Testing:**
- [ ] Verify README is created in correct location
- [ ] Review documentation for accuracy
- [ ] Share with team for feedback

~~~~~

### CHUNK 10: Add TypeScript migration note for shared utilities
**File:** app/src/lib/README.md (new or update)
**Lines:** N/A
**Issue:** Mixed TypeScript/JavaScript in shared code creates type safety gaps. Document migration strategy.
**Affected Pages:** All pages using shared utilities

**Current Code:**
```javascript
// No documentation on TypeScript migration strategy
```

**Refactored Code:**
```markdown
# app/src/lib - Shared Utilities

## TypeScript Migration Status

This directory contains shared utilities used across the application. We are migrating to TypeScript for improved type safety.

### Migration Priority

1. **High Priority** (type errors cause runtime bugs):
   - `auth.js` → `auth.ts`
   - `priceCalculations.js` → Use `logic/calculators/pricing/` (already typed)
   - `dayUtils.js` → `dayUtils.ts`

2. **Medium Priority** (improved DX):
   - `supabase.js` → `supabase.ts`
   - `secureStorage.js` → `secureStorage.ts`

3. **Low Priority** (stable, rarely changed):
   - `constants.js` → `constants.ts`
   - `formatters/` → Already well-documented

### Migration Guidelines

1. Create `.d.ts` file first if full migration isn't possible
2. Add JSDoc types to existing JS files as intermediate step
3. Use strict mode in new TypeScript files
4. Export types alongside implementations

### Already Migrated

- `logic/calculators/` - All files use strict typing patterns
- `logic/rules/` - All files use strict typing patterns
```

**Testing:**
- [ ] Verify README provides useful guidance
- [ ] Review with team for accuracy

~~~~~

## PAGE GROUP: All Protected Pages (Chunks: 11, 12)

### CHUNK 11: Add ARIA labels to carousel navigation buttons
**File:** app/src/islands/pages/FavoriteListingsPage/components/ListingCard.jsx
**Lines:** 132-147
**Issue:** Carousel navigation buttons already have aria-label attributes. This is correctly implemented. No change needed.
**Affected Pages:** /favorite-listings, /search

**Current Code:**
```javascript
        {hasMultiplePhotos && (
          <div className="photo-navigation">
            <button
              className={`photo-nav-button prev ${imageIndex === 0 ? 'disabled' : ''}`}
              onClick={handlePreviousPhoto}
              disabled={imageIndex === 0}
              aria-label="Previous photo"
            >
              ‹
            </button>
            <button
              className={`photo-nav-button next ${imageIndex === photos.length - 1 ? 'disabled' : ''}`}
              onClick={handleNextPhoto}
              disabled={imageIndex === photos.length - 1}
              aria-label="Next photo"
            >
              ›
            </button>
          </div>
        )}
```

**Refactored Code:**
```javascript
// NO CHANGE NEEDED - Already has proper ARIA labels
// This chunk documents that accessibility was audited and found compliant
```

**Testing:**
- [ ] Verify with screen reader that labels are announced
- [ ] Run accessibility audit tool (axe, WAVE)

~~~~~

### CHUNK 12: Add keyboard navigation to photo carousel
**File:** app/src/islands/pages/FavoriteListingsPage/components/ListingCard.jsx
**Lines:** 28-48
**Issue:** Photo carousel supports mouse navigation but lacks keyboard support. Users should be able to use arrow keys when carousel is focused.
**Affected Pages:** /favorite-listings, /search

**Current Code:**
```javascript
  const handlePreviousPhoto = (e) => {
    e.stopPropagation();
    if (imageIndex > 0) {
      setImageIndex(imageIndex - 1);
    }
  };

  const handleNextPhoto = (e) => {
    e.stopPropagation();
    if (imageIndex < photos.length - 1) {
      setImageIndex(imageIndex + 1);
    }
  };

  const handleCardClick = () => {
    onNavigateToDetail(listing.id);
  };
```

**Refactored Code:**
```javascript
  const handlePreviousPhoto = useCallback((e) => {
    e.stopPropagation();
    setImageIndex(prev => prev > 0 ? prev - 1 : prev);
  }, []);

  const handleNextPhoto = useCallback((e) => {
    e.stopPropagation();
    setImageIndex(prev => prev < photos.length - 1 ? prev + 1 : prev);
  }, [photos.length]);

  const handleCardClick = () => {
    onNavigateToDetail(listing.id);
  };

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setImageIndex(prev => prev > 0 ? prev - 1 : prev);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      setImageIndex(prev => prev < photos.length - 1 ? prev + 1 : prev);
    }
  }, [photos.length]);
```

**Testing:**
- [ ] Verify left/right arrow keys navigate carousel when focused
- [ ] Ensure keyboard nav doesn't interfere with page scrolling
- [ ] Test with screen reader for proper announcements

~~~~~

## PAGE GROUP: /listing-dashboard (Chunks: 13, 14)

### CHUNK 13: Replace string-based field names with constants
**File:** app/src/lib/constants.js (or new fieldNames.js)
**Lines:** N/A (new addition)
**Issue:** Hardcoded string field names with emoji prefixes are fragile and error-prone. Centralize into typed constants.
**Affected Pages:** /listing-dashboard, /self-listing, /view-split-lease

**Current Code:**
```javascript
// Scattered across files:
'💰Nightly Host Rate for 4 nights'
'💰Cleaning Cost / Maintenance Fee'
'Location - Address'
'Features - Type of Space'
```

**Refactored Code:**
```javascript
// New file: app/src/lib/fieldNames.js

/**
 * Bubble.io field name constants
 * Centralized to prevent typos and enable refactoring
 */
export const BUBBLE_FIELDS = {
  // Pricing fields
  NIGHTLY_RATE_1: '💰Nightly Host Rate for 1 night',
  NIGHTLY_RATE_2: '💰Nightly Host Rate for 2 nights',
  NIGHTLY_RATE_3: '💰Nightly Host Rate for 3 nights',
  NIGHTLY_RATE_4: '💰Nightly Host Rate for 4 nights',
  NIGHTLY_RATE_5: '💰Nightly Host Rate for 5 nights',
  NIGHTLY_RATE_7: '💰Nightly Host Rate for 7 nights',
  WEEKLY_HOST_RATE: '💰Weekly Host Rate',
  MONTHLY_HOST_RATE: '💰Monthly Host Rate',
  CLEANING_FEE: '💰Cleaning Cost / Maintenance Fee',
  DAMAGE_DEPOSIT: '💰Damage Deposit',
  UNIT_MARKUP: '💰Unit Markup',
  PRICE_OVERRIDE: '💰Price Override',

  // Location fields
  ADDRESS: 'Location - Address',
  BOROUGH: 'Location - Borough',
  NEIGHBORHOOD: 'Location - Hood',
  CITY: 'Location - City',

  // Feature fields
  TYPE_OF_SPACE: 'Features - Type of Space',
  QTY_BEDROOMS: 'Features - Qty Bedrooms',
  QTY_BATHROOMS: 'Features - Qty Bathrooms',
  MAX_GUESTS: 'Features - Max Guests',
};

/**
 * Get nightly rate field name for given night count
 * @param {number} nights - Number of nights (1-7)
 * @returns {string} Field name
 */
export function getNightlyRateFieldName(nights) {
  const fieldMap = {
    1: BUBBLE_FIELDS.NIGHTLY_RATE_1,
    2: BUBBLE_FIELDS.NIGHTLY_RATE_2,
    3: BUBBLE_FIELDS.NIGHTLY_RATE_3,
    4: BUBBLE_FIELDS.NIGHTLY_RATE_4,
    5: BUBBLE_FIELDS.NIGHTLY_RATE_5,
    7: BUBBLE_FIELDS.NIGHTLY_RATE_7,
  };
  return fieldMap[nights] || BUBBLE_FIELDS.NIGHTLY_RATE_4;
}
```

**Testing:**
- [ ] Update one file to use BUBBLE_FIELDS constants
- [ ] Verify no regressions in data fetching
- [ ] Gradually migrate other files

~~~~~

### CHUNK 14: Add defensive null checks to listing data access
**File:** app/src/islands/pages/ListingDashboardPage/ListingDashboardPage.jsx
**Lines:** 210-242 (EditListingDetails fetch logic)
**Issue:** Listing data access doesn't handle missing or malformed fields gracefully. Can cause runtime errors on legacy data.
**Affected Pages:** /listing-dashboard

**Current Code:**
```javascript
// Example pattern found in codebase (generalized):
const address = listing['Location - Address'];
const price = listing['💰Nightly Host Rate for 4 nights'];
```

**Refactored Code:**
```javascript
// Use optional chaining and provide defaults
import { BUBBLE_FIELDS } from '../../lib/fieldNames.js';

const address = listing?.[BUBBLE_FIELDS.ADDRESS] ?? '';
const price = listing?.[BUBBLE_FIELDS.NIGHTLY_RATE_4] ?? 0;

// Or create a helper function for repeated access:
const getField = (obj, field, defaultValue = null) => obj?.[field] ?? defaultValue;

const address = getField(listing, BUBBLE_FIELDS.ADDRESS, '');
const price = getField(listing, BUBBLE_FIELDS.NIGHTLY_RATE_4, 0);
```

**Testing:**
- [ ] Test with listing that has null/missing fields
- [ ] Verify no runtime errors on legacy data
- [ ] Check that default values display appropriately

~~~~~

## PAGE GROUP: AUTO - Shared Utilities (Chunk: 15)

### CHUNK 15: Add structured logging utility for auth module
**File:** app/src/lib/logger.js (new or update)
**Lines:** N/A
**Issue:** Auth module uses emoji-prefixed unstructured logging that's hard to parse with log aggregation services. Create structured logging utility.
**Affected Pages:** All pages with authentication

**Current Code:**
```javascript
// In lib/auth.js (pattern observed):
logger.error('❌ Edge Function error:', error);
logger.error('   Error context:', error.context);
console.log('[Header] ✅ Found Supabase session after brief wait');
```

**Refactored Code:**
```javascript
// New structured logging utility: app/src/lib/logger.js

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

const currentLevel = process.env.NODE_ENV === 'production'
  ? LOG_LEVELS.WARN
  : LOG_LEVELS.DEBUG;

/**
 * Structured logger with consistent format for log aggregation
 */
export const logger = {
  debug: (message, data = {}) => {
    if (currentLevel <= LOG_LEVELS.DEBUG) {
      console.log(JSON.stringify({ level: 'DEBUG', message, ...data, timestamp: new Date().toISOString() }));
    }
  },

  info: (message, data = {}) => {
    if (currentLevel <= LOG_LEVELS.INFO) {
      console.log(JSON.stringify({ level: 'INFO', message, ...data, timestamp: new Date().toISOString() }));
    }
  },

  warn: (message, data = {}) => {
    if (currentLevel <= LOG_LEVELS.WARN) {
      console.warn(JSON.stringify({ level: 'WARN', message, ...data, timestamp: new Date().toISOString() }));
    }
  },

  error: (message, error = null, data = {}) => {
    console.error(JSON.stringify({
      level: 'ERROR',
      message,
      error: error?.message || error,
      stack: error?.stack,
      ...data,
      timestamp: new Date().toISOString()
    }));
  }
};

// Usage example:
// logger.error('Edge Function failed', error, { userId, action: 'validateToken' });
```

**Testing:**
- [ ] Verify log output is valid JSON
- [ ] Test log level filtering in production vs development
- [ ] Confirm existing functionality not broken

~~~~~

---

## Summary

| Page Group | Chunks | Priority |
|------------|--------|----------|
| /favorite-listings, /search | 1, 2, 3, 11, 12 | High |
| Protected Pages (auth) | 4, 5 | High |
| Pricing Pages | 6, 7, 8 | Medium |
| Multi-step Forms | 9, 10 | Low (documentation) |
| /listing-dashboard | 13, 14 | Medium |
| Shared Utilities | 15 | Low |

## Recommended Execution Order

1. **Chunk 3** → **Chunk 2** → **Chunk 1** (ListingCard improvements - interdependent)
2. **Chunk 4** (Auth race condition fix - critical)
3. **Chunk 5** (Toast fallback - quick win)
4. **Chunk 7** (Remove console.log - quick cleanup)
5. **Chunk 6** (Pricing consolidation - requires testing)
6. **Chunk 13** → **Chunk 14** (Field name constants - interdependent)
7. **Chunk 8** (Day helpers export)
8. **Chunk 12** (Keyboard navigation - accessibility)
9. **Chunk 15** (Structured logging - foundation)
10. **Chunks 9, 10** (Documentation - whenever convenient)

---

## File References

| File | Chunks |
|------|--------|
| app/src/islands/pages/FavoriteListingsPage/components/ListingCard.jsx | 1, 2, 3, 11, 12 |
| app/src/hooks/useAuthenticatedUser.js | 4 |
| app/src/islands/shared/Header.jsx | 5 |
| app/src/lib/priceCalculations.js | 6 |
| app/src/lib/scheduleSelector/priceCalculations.js | 7 |
| app/src/lib/scheduleSelector/dayHelpers.js | 8 |
| app/src/islands/pages/SelfListingPage/README.md | 9 |
| app/src/lib/README.md | 10 |
| app/src/lib/fieldNames.js | 13 |
| app/src/islands/pages/ListingDashboardPage/ListingDashboardPage.jsx | 14 |
| app/src/lib/logger.js | 15 |
