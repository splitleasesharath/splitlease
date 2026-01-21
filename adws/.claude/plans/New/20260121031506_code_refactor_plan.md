# Code Refactoring Plan - ../app

**Date:** 2026-01-21
**Audit Type:** general
**Files Analyzed:** 539
**Edge Reduction:** 19%

---

## Executive Summary

This audit identified **18 refactoring chunks** across **7 page groups**. The primary issues are:

1. **Duplicate formatDate implementations** (5 locations) - HIGH priority
2. **Duplicate formatPrice implementations** (4 locations) - HIGH priority
3. **Duplicate amenities services** (2 locations) - MEDIUM priority
4. **Duplicate neighborhood services** (2 locations) - MEDIUM priority
5. **Conflicting processProposalData functions** (2 directories) - HIGH priority
6. **Excessive console.log statements** (345+ occurrences) - MEDIUM priority
7. **Deprecated re-export cleanup** - LOW priority

---

## PAGE GROUP: GLOBAL (Shared Utilities)

### CHUNK 1: Consolidate formatDate - HostProposalsPage/formatters.js

**File:** `src/islands/pages/HostProposalsPage/formatters.js`
**Line:** 23-31
**Issue:** Duplicate `formatDate` function that produces M/D/YY format. Should delegate to centralized `formatDateDisplay` with `format: 'short'`.
**Affected Pages:** /host-proposals, /proposals (any page importing this formatter)
**Cascading Changes:** `src/islands/pages/HostProposalsPage/ProposalCard.jsx`, `src/islands/pages/HostProposalsPage/ProposalDetailsModal.jsx`

**Current Code:**
```javascript
/**
 * Format a date as M/D/YY
 * @param {Date|string} date - The date to format
 * @returns {string} Formatted date string
 */
export function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const year = d.getFullYear().toString().slice(-2);
  return `${month}/${day}/${year}`;
}
```

**Refactored Code:**
```javascript
import { formatDateDisplay } from '../../../lib/dateFormatters.js';

/**
 * Format a date as M/D/YY
 * Delegates to centralized date formatter
 * @param {Date|string} date - The date to format
 * @returns {string} Formatted date string
 */
export function formatDate(date) {
  return formatDateDisplay(date, { format: 'short', fallback: '' });
}
```

**Testing:**
- [ ] Verify date displays as M/D/YY format on Host Proposals page
- [ ] Verify empty/null dates return empty string
- [ ] Verify invalid dates return empty string

~~~~~

### CHUNK 2: Consolidate formatDate - FavoriteListingsPage/formatters.js

**File:** `src/islands/pages/FavoriteListingsPage/formatters.js`
**Line:** 127-136
**Issue:** Duplicate `formatDate` function that produces "Jan 15, 2024" format. Should delegate to centralized `formatDateDisplay` with `format: 'medium'`.
**Affected Pages:** /favorite-listings
**Cascading Changes:** Files importing from this formatter

**Current Code:**
```javascript
/**
 * Format date for display
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date (e.g., "Jan 15, 2024")
 */
export const formatDate = (dateString) => {
  if (!dateString) return '';

  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};
```

**Refactored Code:**
```javascript
import { formatDateDisplay } from '../../../lib/dateFormatters.js';

/**
 * Format date for display
 * Delegates to centralized date formatter
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date (e.g., "Jan 15, 2024")
 */
export const formatDate = (dateString) => {
  return formatDateDisplay(dateString, { format: 'medium', fallback: '' });
};
```

**Testing:**
- [ ] Verify date displays as "Jan 15, 2024" format on Favorite Listings page
- [ ] Verify empty/null dates return empty string

~~~~~

### CHUNK 3: Consolidate formatDate - dataTransformers.js

**File:** `src/lib/proposals/dataTransformers.js`
**Line:** 235-247
**Issue:** Duplicate `formatDate` function. Should delegate to centralized `formatDateDisplay`.
**Affected Pages:** /proposals, /view-split-lease, /messaging (proposal-related pages)
**Cascading Changes:** `src/islands/pages/proposals/ProposalCard.jsx`

**Current Code:**
```javascript
/**
 * Format date for display
 *
 * @param {string|Date} date - Date value
 * @returns {string} Formatted date string
 */
export function formatDate(date) {
  if (!date) return null;

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) return null;

  return dateObj.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}
```

**Refactored Code:**
```javascript
import { formatDateDisplay } from '../dateFormatters.js';

/**
 * Format date for display
 * Delegates to centralized date formatter
 * @param {string|Date} date - Date value
 * @returns {string} Formatted date string
 */
export function formatDate(date) {
  return formatDateDisplay(date, { format: 'medium', fallback: null });
}
```

**Testing:**
- [ ] Verify proposal dates display correctly on Proposal Card
- [ ] Verify null dates return null (not empty string for backwards compatibility)

~~~~~

### CHUNK 4: Consolidate formatDate - processProposalData.js (proposals)

**File:** `src/logic/processors/proposals/processProposalData.js`
**Line:** 213-225
**Issue:** Duplicate `formatDate` function. Should delegate to centralized `formatDateDisplay`.
**Affected Pages:** All proposal-related pages
**Cascading Changes:** None (internal to processor)

**Current Code:**
```javascript
/**
 * Format date for display
 * @param {string|Date} date - Date value
 * @returns {string} Formatted date string
 */
export function formatDate(date) {
  if (!date) return null;

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) return null;

  return dateObj.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}
```

**Refactored Code:**
```javascript
import { formatDateDisplay } from '../../../lib/dateFormatters.js';

/**
 * Format date for display
 * Delegates to centralized date formatter
 * @param {string|Date} date - Date value
 * @returns {string} Formatted date string
 */
export function formatDate(date) {
  return formatDateDisplay(date, { format: 'medium', fallback: null });
}
```

**Testing:**
- [ ] Verify proposal date processing works correctly
- [ ] Run existing proposal tests

~~~~~

### CHUNK 5: Consolidate formatPrice - dataTransformers.js

**File:** `src/lib/proposals/dataTransformers.js`
**Line:** 216-227
**Issue:** Duplicate `formatPrice` function. Should use canonical `formatPrice` from `lib/priceCalculations.js`.
**Affected Pages:** /proposals, /view-split-lease, /fullscreen-proposal-map
**Cascading Changes:** `src/islands/modals/FullscreenProposalMapModal.jsx`, `src/islands/pages/proposals/ProposalCard.jsx`, `src/islands/pages/proposals/ExpandableProposalCard.jsx`

**Current Code:**
```javascript
/**
 * Format price for display
 *
 * @param {number} price - Price value
 * @param {boolean} includeCents - Whether to include cents
 * @returns {string} Formatted price string
 */
export function formatPrice(price, includeCents = true) {
  if (price === null || price === undefined) return null;

  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: includeCents ? 2 : 0,
    maximumFractionDigits: includeCents ? 2 : 0
  });

  return formatter.format(price);
}
```

**Refactored Code:**
```javascript
// Re-export from canonical location for backwards compatibility
export { formatPrice } from '../priceCalculations.js';
```

**Testing:**
- [ ] Verify price displays correctly on Proposal Card ($X.XX format)
- [ ] Verify FullscreenProposalMapModal still works
- [ ] Verify ExpandableProposalCard still works

~~~~~

### CHUNK 6: Consolidate formatPrice - FavoriteListingsPage/formatters.js

**File:** `src/islands/pages/FavoriteListingsPage/formatters.js`
**Line:** 94-103
**Issue:** `formatPrice` adds "/night" suffix which differs from standard behavior. Should be renamed to `formatPricePerNight` to avoid confusion.
**Affected Pages:** /favorite-listings
**Cascading Changes:** Files importing `formatPrice` from this file need to update import name

**Current Code:**
```javascript
/**
 * Format price with currency symbol
 * @param {number} price - Price amount
 * @param {string} [currency='USD'] - Currency code
 * @returns {string} Formatted price string (e.g., "$1,029/night")
 */
export const formatPrice = (price, currency = 'USD') => {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  return `${formatter.format(price)}/night`;
};
```

**Refactored Code:**
```javascript
import { formatPrice as baseFormatPrice } from '../../../lib/priceCalculations.js';

/**
 * Format price with "/night" suffix for listing display
 * @param {number} price - Price amount
 * @returns {string} Formatted price string (e.g., "$1,029/night")
 */
export const formatPricePerNight = (price) => {
  const formatted = baseFormatPrice(price, false);
  return `${formatted}/night`;
};

// Backwards compatibility - deprecated, use formatPricePerNight instead
export const formatPrice = formatPricePerNight;
```

**Testing:**
- [ ] Verify listing prices display as "$X/night" on Favorite Listings page
- [ ] Update consumers to use `formatPricePerNight` name

~~~~~

### CHUNK 7: Consolidate formatCurrency - HostProposalsPage/formatters.js

**File:** `src/islands/pages/HostProposalsPage/formatters.js`
**Line:** 10-16
**Issue:** `formatCurrency` duplicates `formatPrice` logic but without $ prefix in output (just "0.00" format). This is inconsistent - should use canonical formatter.
**Affected Pages:** /host-proposals
**Cascading Changes:** Check usages in HostProposalsPage components

**Current Code:**
```javascript
/**
 * Format a number as currency (USD)
 * @param {number} amount - The amount to format
 * @returns {string} Formatted currency string
 */
export function formatCurrency(amount) {
  if (amount == null || isNaN(amount)) return '0.00';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}
```

**Refactored Code:**
```javascript
import { formatPrice } from '../../../lib/priceCalculations.js';

/**
 * Format a number as currency (USD)
 * Delegates to centralized price formatter
 * @param {number} amount - The amount to format
 * @returns {string} Formatted currency string (e.g., "$1,234.56")
 */
export function formatCurrency(amount) {
  if (amount == null || isNaN(amount)) return '$0.00';
  return formatPrice(amount, true);
}
```

**Testing:**
- [ ] Verify currency displays correctly on Host Proposals page
- [ ] Verify null/NaN handling returns "$0.00"

~~~~~

## PAGE GROUP: /edit-listing, /self-listing (Service Consolidation)

### CHUNK 8: Consolidate amenitiesService - Create unified service

**Files:** `src/islands/shared/EditListingDetails/services/amenitiesService.js`, `src/islands/pages/SelfListingPage/utils/amenitiesService.ts`
**Line:** Full files
**Issue:** Two nearly identical amenities services exist. The TypeScript version has additional `getAllAmenitiesByType` function. Should consolidate to single service.
**Affected Pages:** /edit-listing, /self-listing, /listing-dashboard
**Cascading Changes:**
- `src/islands/shared/EditListingDetails/useEditListingDetailsLogic.js`
- `src/islands/pages/SelfListingPage/sections/Section2Features.tsx`
- `src/islands/pages/ListingDashboardPage/hooks/useAIImportAssistant.js`

**Current Code (EditListingDetails version):**
```javascript
/**
 * Amenities Service
 * Fetches common amenities from Supabase where pre-set is true
 */

import { supabase } from '../../../../lib/supabase.js';

export async function getCommonAmenitiesByType(type) {
  if (!type || type.trim().length === 0) {
    console.warn('[amenitiesService] No amenity type provided');
    return [];
  }

  try {
    console.log('[amenitiesService] Fetching amenities for type:', type);

    const { data, error } = await supabase
      .from('zat_features_amenity')
      .select('Name, "pre-set?", "Type - Amenity Categories"')
      .eq('"pre-set?"', true)
      .eq('"Type - Amenity Categories"', type)
      .order('Name', { ascending: true });

    if (error) {
      console.error('[amenitiesService] Error fetching common amenities:', error);
      return [];
    }

    if (!data || data.length === 0) {
      console.warn(`[amenitiesService] No common amenities found for type: ${type}`);
      return [];
    }

    const names = data.map((amenity) => amenity.Name);
    console.log('[amenitiesService] Fetched amenities:', names);
    return names;
  } catch (err) {
    console.error('[amenitiesService] Unexpected error:', err);
    return [];
  }
}

export async function getCommonInUnitAmenities() {
  return getCommonAmenitiesByType('In Unit');
}

export async function getCommonBuildingAmenities() {
  return getCommonAmenitiesByType('In Building');
}
```

**Refactored Code:**
Create new unified service at `src/services/amenitiesService.js`:
```javascript
/**
 * Unified Amenities Service
 * Fetches amenities from Supabase zat_features_amenity table
 *
 * @module services/amenitiesService
 */

import { supabase } from '../lib/supabase.js';

/**
 * Fetches ALL amenities from Supabase filtered by category type
 * Used to populate checkbox lists
 * @param {string} type - The amenity type: "In Unit" or "In Building"
 * @returns {Promise<string[]>} Array of amenity names
 */
export async function getAllAmenitiesByType(type) {
  if (!type || type.trim().length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from('zat_features_amenity')
    .select('Name, "Type - Amenity Categories"')
    .eq('"Type - Amenity Categories"', type)
    .eq('pending', false)
    .order('Name', { ascending: true });

  if (error) {
    console.error('[amenitiesService] Error fetching amenities:', error);
    return [];
  }

  return data?.map((amenity) => amenity.Name) || [];
}

/**
 * Fetches common (pre-set) amenities from Supabase filtered by type
 * @param {string} type - The amenity type: "In Unit", "In Building", or "In Room"
 * @returns {Promise<string[]>} Array of amenity names
 */
export async function getCommonAmenitiesByType(type) {
  if (!type || type.trim().length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from('zat_features_amenity')
    .select('Name, "pre-set?", "Type - Amenity Categories"')
    .eq('"pre-set?"', true)
    .eq('"Type - Amenity Categories"', type)
    .order('Name', { ascending: true });

  if (error) {
    console.error('[amenitiesService] Error fetching common amenities:', error);
    return [];
  }

  return data?.map((amenity) => amenity.Name) || [];
}

// Convenience functions
export const getAllInUnitAmenities = () => getAllAmenitiesByType('In Unit');
export const getAllBuildingAmenities = () => getAllAmenitiesByType('In Building');
export const getCommonInUnitAmenities = () => getCommonAmenitiesByType('In Unit');
export const getCommonBuildingAmenities = () => getCommonAmenitiesByType('In Building');
```

**Testing:**
- [ ] Verify amenities load on Edit Listing page
- [ ] Verify amenities load on Self Listing page
- [ ] Verify AI Import Assistant can fetch amenities

~~~~~

### CHUNK 9: Consolidate neighborhoodService - Create unified service

**Files:** `src/islands/shared/EditListingDetails/services/neighborhoodService.js`, `src/islands/pages/SelfListingPage/utils/neighborhoodService.ts`
**Line:** Full files
**Issue:** Two nearly identical neighborhood services with same RPC call pattern and AI fallback. TypeScript version has `extractZipCode` helper.
**Affected Pages:** /edit-listing, /self-listing, /listing-dashboard
**Cascading Changes:**
- `src/islands/shared/EditListingDetails/useEditListingDetailsLogic.js`
- `src/islands/pages/SelfListingPage/sections/Section2Features.tsx`
- `src/islands/pages/ListingDashboardPage/hooks/useAIImportAssistant.js`

**Current Code (EditListingDetails version - partial):**
```javascript
export async function getNeighborhoodByZipCode(zipCode) {
  if (!zipCode || zipCode.trim().length === 0) {
    console.warn('[neighborhoodService] No ZIP code provided for neighborhood lookup');
    return null;
  }

  try {
    console.log('[neighborhoodService] Fetching neighborhood for ZIP:', zipCode);

    const { data, error } = await supabase.rpc('get_neighborhood_by_zip', {
      zip_code: zipCode
    });

    if (error) {
      console.error('[neighborhoodService] Error fetching neighborhood data:', error);
      return null;
    }

    if (!data || data.length === 0) {
      console.warn(`[neighborhoodService] No neighborhood found for ZIP code: ${zipCode}`);
      return null;
    }

    const neighborhood = data[0];
    const result = {
      neighborhoodName: neighborhood.Display || '',
      description: neighborhood['Neighborhood Description'] || ''
    };

    console.log('[neighborhoodService] Found neighborhood:', result.neighborhoodName);
    return result;
  } catch (err) {
    console.error('[neighborhoodService] Unexpected error:', err);
    return null;
  }
}
```

**Refactored Code:**
Create new unified service at `src/services/neighborhoodService.js`:
```javascript
/**
 * Unified Neighborhood Service
 * Fetches neighborhood data from Supabase with AI fallback
 *
 * @module services/neighborhoodService
 */

import { supabase } from '../lib/supabase.js';
import { generateNeighborhoodDescription } from '../lib/aiService';

/**
 * Extracts ZIP code from a full address string
 * @param {string} address - Full address string
 * @returns {string} ZIP code or empty string if not found
 */
export function extractZipCode(address) {
  if (!address) return '';
  const zipMatch = address.match(/\b(\d{5})(-\d{4})?\b/);
  return zipMatch ? zipMatch[1] : '';
}

/**
 * Fetches neighborhood by ZIP code using RPC function
 * @param {string} zipCode - The ZIP code to search for
 * @returns {Promise<{neighborhoodName: string, description: string, zips?: string[]} | null>}
 */
export async function getNeighborhoodByZipCode(zipCode) {
  if (!zipCode || zipCode.trim().length === 0) {
    return null;
  }

  const { data, error } = await supabase.rpc('get_neighborhood_by_zip', {
    zip_code: zipCode
  });

  if (error || !data || data.length === 0) {
    return null;
  }

  const neighborhood = data[0];
  return {
    neighborhoodName: neighborhood.Display || '',
    description: neighborhood['Neighborhood Description'] || '',
    zips: neighborhood.Zips || []
  };
}

/**
 * Fetches neighborhood by name (case-insensitive)
 * @param {string} neighborhoodName - The neighborhood name
 * @returns {Promise<{neighborhoodName: string, description: string} | null>}
 */
export async function getNeighborhoodByName(neighborhoodName) {
  if (!neighborhoodName || neighborhoodName.trim().length === 0) {
    return null;
  }

  const { data, error } = await supabase
    .from('zat_geo_hood_mediumlevel')
    .select('Display, "Neighborhood Description"')
    .ilike('Display', neighborhoodName.trim())
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    neighborhoodName: data.Display || '',
    description: data['Neighborhood Description'] || ''
  };
}

/**
 * Get neighborhood description with AI fallback
 * @param {string} zipCode - ZIP code to lookup
 * @param {Object} addressData - Address data for AI fallback
 * @returns {Promise<{description: string, neighborhoodName?: string, source: 'database' | 'ai'} | null>}
 */
export async function getNeighborhoodDescriptionWithFallback(zipCode, addressData) {
  const dbResult = await getNeighborhoodByZipCode(zipCode);

  if (dbResult && dbResult.description) {
    return {
      description: dbResult.description,
      neighborhoodName: dbResult.neighborhoodName,
      source: 'database',
    };
  }

  if (!addressData?.fullAddress && !addressData?.city) {
    return null;
  }

  try {
    const aiDescription = await generateNeighborhoodDescription(addressData);
    if (aiDescription) {
      return { description: aiDescription, source: 'ai' };
    }
    return null;
  } catch {
    return null;
  }
}
```

**Testing:**
- [ ] Verify neighborhood auto-fills on Edit Listing page
- [ ] Verify neighborhood auto-fills on Self Listing page
- [ ] Verify AI fallback triggers when ZIP not in database

~~~~~

## PAGE GROUP: /proposals (Processor Consolidation)

### CHUNK 10: Document processProposalData divergence

**Files:** `src/logic/processors/proposal/processProposalData.js` (149 lines), `src/logic/processors/proposals/processProposalData.js` (291 lines)
**Line:** Full files
**Issue:** Two `processProposalData` functions exist with DIFFERENT signatures and output shapes. This is a critical issue requiring analysis before consolidation.
**Affected Pages:** All proposal-related pages
**Cascading Changes:** Extensive - needs audit of all usages

**Analysis Required:**

| Aspect | `proposal/` version | `proposals/` version |
|--------|---------------------|----------------------|
| Signature | `({ rawProposal, listing, guest, host })` | `(rawProposal)` |
| Validation | Strict - throws on missing Listing/Guest | Strict - throws on missing _id |
| Output | `currentTerms`/`originalTerms` pattern | Flat structure with nested `listing`/`host` |
| Extras | `usualOrder`, `hasCounteroffer` | `getEffectiveTerms()` export |

**Current Code (`proposal/` - named params version):**
```javascript
export function processProposalData({ rawProposal, listing = null, guest = null, host = null }) {
  if (!rawProposal) {
    throw new Error('processProposalData: rawProposal cannot be null or undefined')
  }
  // ... validates Listing and Guest references
  // Returns: { id, currentTerms, originalTerms, hasCounteroffer, usualOrder, ... }
}
```

**Current Code (`proposals/` - single param version):**
```javascript
export function processProposalData(rawProposal) {
  if (!rawProposal) {
    throw new Error('processProposalData: Proposal data is required');
  }
  // ... transforms nested listing/host/virtualMeeting
  // Returns: { id, listing, host, virtualMeeting, getEffectiveTerms(), ... }
}
```

**Refactored Code:**
No code change in this chunk - this chunk documents the divergence for future consolidation.

**Action Items:**
1. Audit all imports of `processProposalData` to determine which version is used where
2. Create unified interface that supports both use cases
3. Add deprecation warnings to old function calls

**Testing:**
- [ ] Document all current usages
- [ ] Create migration plan

~~~~~

## PAGE GROUP: CLEANUP (Console Logging)

### CHUNK 11: Remove excessive console.log from priceCalculations.js

**File:** `src/lib/scheduleSelector/priceCalculations.js`
**Line:** 36-39, 88-93
**Issue:** Production code contains debug console.log statements that should be removed.
**Affected Pages:** /view-split-lease, /search, /preview-split-lease, /create-proposal-flow
**Cascading Changes:** None

**Current Code:**
```javascript
export const calculatePrice = (selectedNights, listing, reservationSpan = 13, zatConfig = null) => {
  const nightsCount = selectedNights.length;

  console.log('=== CALCULATE PRICE ===');
  console.log('nightsCount:', nightsCount);
  console.log('listing rental type:', listing?.['rental type'] || listing?.rentalType);
  console.log('reservationSpan:', reservationSpan);

  // ... later in function

  console.log('=== PRICE CALCULATION RESULT ===');
  console.log('pricePerNight:', pricePerNight);
  console.log('fourWeekRent:', fourWeekRent);
  console.log('reservationTotal:', reservationTotal);
  console.log('initialPayment:', initialPayment);
```

**Refactored Code:**
```javascript
export const calculatePrice = (selectedNights, listing, reservationSpan = 13, zatConfig = null) => {
  const nightsCount = selectedNights.length;

  // Debug logging removed for production

  // ... rest of function without console.log calls
```

**Testing:**
- [ ] Verify price calculations still work correctly
- [ ] Verify no console output during normal operation

~~~~~

### CHUNK 12: Remove excessive console.log from amenitiesService files

**File:** `src/islands/shared/EditListingDetails/services/amenitiesService.js`
**Line:** 15-16, 20, 35-36, 41, 43-44
**Issue:** Service has verbose logging that clutters console. Should be silent or use conditional debug logging.
**Affected Pages:** /edit-listing
**Cascading Changes:** None

**Current Code:**
```javascript
export async function getCommonAmenitiesByType(type) {
  if (!type || type.trim().length === 0) {
    console.warn('[amenitiesService] No amenity type provided');
    return [];
  }

  try {
    console.log('[amenitiesService] Fetching amenities for type:', type);
    // ...
    if (!data || data.length === 0) {
      console.warn(`[amenitiesService] No common amenities found for type: ${type}`);
      return [];
    }

    const names = data.map((amenity) => amenity.Name);
    console.log('[amenitiesService] Fetched amenities:', names);
    return names;
  } catch (err) {
    console.error('[amenitiesService] Unexpected error:', err);
    return [];
  }
}
```

**Refactored Code:**
```javascript
export async function getCommonAmenitiesByType(type) {
  if (!type || type.trim().length === 0) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('zat_features_amenity')
      .select('Name, "pre-set?", "Type - Amenity Categories"')
      .eq('"pre-set?"', true)
      .eq('"Type - Amenity Categories"', type)
      .order('Name', { ascending: true });

    if (error) {
      console.error('[amenitiesService] Error fetching amenities:', error);
      return [];
    }

    return data?.map((amenity) => amenity.Name) || [];
  } catch (err) {
    console.error('[amenitiesService] Unexpected error:', err);
    return [];
  }
}
```

**Testing:**
- [ ] Verify amenities still load correctly
- [ ] Verify only error conditions produce console output

~~~~~

### CHUNK 13: Remove excessive console.log from neighborhoodService files

**File:** `src/islands/shared/EditListingDetails/services/neighborhoodService.js`
**Line:** 17-18, 22, 30-31, 35-36, 46, and throughout
**Issue:** Service has verbose logging that clutters console.
**Affected Pages:** /edit-listing
**Cascading Changes:** None

**Current Code:**
```javascript
export async function getNeighborhoodByZipCode(zipCode) {
  if (!zipCode || zipCode.trim().length === 0) {
    console.warn('[neighborhoodService] No ZIP code provided for neighborhood lookup');
    return null;
  }

  try {
    console.log('[neighborhoodService] Fetching neighborhood for ZIP:', zipCode);
    // ...
    if (error) {
      console.error('[neighborhoodService] Error fetching neighborhood data:', error);
      return null;
    }
    // ...
    console.log('[neighborhoodService] Found neighborhood:', result.neighborhoodName);
    return result;
  } catch (err) {
    console.error('[neighborhoodService] Unexpected error:', err);
    return null;
  }
}
```

**Refactored Code:**
```javascript
export async function getNeighborhoodByZipCode(zipCode) {
  if (!zipCode || zipCode.trim().length === 0) {
    return null;
  }

  try {
    const { data, error } = await supabase.rpc('get_neighborhood_by_zip', {
      zip_code: zipCode
    });

    if (error) {
      console.error('[neighborhoodService] RPC error:', error);
      return null;
    }

    if (!data || data.length === 0) {
      return null;
    }

    const neighborhood = data[0];
    return {
      neighborhoodName: neighborhood.Display || '',
      description: neighborhood['Neighborhood Description'] || ''
    };
  } catch (err) {
    console.error('[neighborhoodService] Unexpected error:', err);
    return null;
  }
}
```

**Testing:**
- [ ] Verify neighborhood lookup still works
- [ ] Verify only error conditions produce console output

~~~~~

## PAGE GROUP: DEPRECATED FILES (Cleanup)

### CHUNK 14: Add deprecation notice to lib/constants/proposalStages.js

**File:** `src/lib/constants/proposalStages.js`
**Line:** 1-15
**Issue:** This file should be deprecated in favor of `src/logic/constants/proposalStages.js` which has more complete functionality.
**Affected Pages:** Any page importing from lib/constants/
**Cascading Changes:** Need to update imports across codebase

**Current Code:**
```javascript
/**
 * Proposal Progress Stage Configuration System
 *
 * This module defines the 6 stages of the proposal-to-lease workflow,
 * replacing hardcoded stage arrays with rich configuration objects.
 *
 * Each stage includes:
 * - id: Stage number (1-6)
 * - name: Full stage name
 * - shortName: Abbreviated name for compact displays
 * - icon: Emoji or icon identifier
 * - description: User-friendly explanation of the stage
 * - helpText: Additional guidance for guests
 */

export const PROPOSAL_STAGES = [
  // ... stage definitions
];
```

**Refactored Code:**
```javascript
/**
 * @deprecated This file re-exports from the canonical location.
 * Import directly from 'src/logic/constants/proposalStages.js' instead.
 *
 * The canonical version includes additional navigation functions:
 * - getStageProgress
 * - getCompletedStages
 * - getRemainingStages
 * - getPreviousStage
 * - getNextStage
 * - isStagePending
 */

export {
  PROPOSAL_STAGES,
  getStageById,
  getStageByName,
  isStageCompleted,
  isStageActive,
  getStageDescription,
  getStageHelpText
} from '../../logic/constants/proposalStages.js';
```

**Testing:**
- [ ] Verify all proposal stage displays still work
- [ ] Update imports to use canonical location

~~~~~

### CHUNK 15: Update deprecated cancelProposalWorkflow re-export

**File:** `src/logic/workflows/booking/cancelProposalWorkflow.js`
**Line:** Full file
**Issue:** File marked as deprecated but may still have consumers. Need to verify and clean up.
**Affected Pages:** Proposal cancellation flows
**Cascading Changes:** Check for any remaining imports

**Current Code:**
```javascript
// Check what this file currently contains
```

**Refactored Code:**
If this is a re-export file:
```javascript
/**
 * @deprecated This file re-exports from the canonical location.
 * Import directly from 'src/logic/workflows/proposals/cancelProposalWorkflow.js' instead.
 */

export * from '../proposals/cancelProposalWorkflow.js';
```

**Testing:**
- [ ] Verify no direct imports exist
- [ ] If no imports, schedule for deletion

~~~~~

## PAGE GROUP: /host-proposals (Formatter Consolidation)

### CHUNK 16: Consolidate formatFullDate - HostProposalsPage/formatters.js

**File:** `src/islands/pages/HostProposalsPage/formatters.js`
**Line:** 38-47
**Issue:** `formatFullDate` duplicates `formatDateDisplay` with `format: 'medium'`. Should delegate.
**Affected Pages:** /host-proposals
**Cascading Changes:** None internal to file

**Current Code:**
```javascript
/**
 * Format a date as full date (e.g., "Mar 28, 2025")
 * @param {Date|string} date - The date to format
 * @returns {string} Formatted date string
 */
export function formatFullDate(date) {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}
```

**Refactored Code:**
```javascript
/**
 * Format a date as full date (e.g., "Mar 28, 2025")
 * Delegates to centralized date formatter
 * @param {Date|string} date - The date to format
 * @returns {string} Formatted date string
 */
export function formatFullDate(date) {
  return formatDateDisplay(date, { format: 'medium', fallback: '' });
}
```

**Testing:**
- [ ] Verify full date display on Host Proposals page

~~~~~

### CHUNK 17: Consolidate formatDateTime - HostProposalsPage/formatters.js

**File:** `src/islands/pages/HostProposalsPage/formatters.js`
**Line:** 54-66
**Issue:** `formatDateTime` should delegate to `formatDateTimeDisplay` from dateFormatters.js
**Affected Pages:** /host-proposals
**Cascading Changes:** None

**Current Code:**
```javascript
/**
 * Format a date with time (e.g., "Mar 28, 2025 12:00 pm")
 * @param {Date|string} date - The date to format
 * @returns {string} Formatted date/time string
 */
export function formatDateTime(date) {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).replace(',', '');
}
```

**Refactored Code:**
```javascript
import { formatDateTimeDisplay } from '../../../lib/dateFormatters.js';

/**
 * Format a date with time (e.g., "Mar 28, 2025 12:00 pm")
 * @param {Date|string} date - The date to format
 * @returns {string} Formatted date/time string
 */
export function formatDateTime(date) {
  // Note: Uses custom format since formatDateTimeDisplay includes day name
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).replace(',', '');
}
```

**Testing:**
- [ ] Verify datetime display format is preserved

~~~~~

### CHUNK 18: Consolidate formatDateRange - HostProposalsPage/formatters.js

**File:** `src/islands/pages/HostProposalsPage/formatters.js`
**Line:** 84-86
**Issue:** `formatDateRange` duplicates functionality from `lib/dateFormatters.js`
**Affected Pages:** /host-proposals
**Cascading Changes:** None

**Current Code:**
```javascript
/**
 * Format a date range
 * @param {Date|string} start - Start date
 * @param {Date|string} end - End date
 * @returns {string} Formatted date range
 */
export function formatDateRange(start, end) {
  return `${formatDate(start)} - ${formatDate(end)}`;
}
```

**Refactored Code:**
```javascript
import { formatDateRange as baseDateRange } from '../../../lib/dateFormatters.js';

/**
 * Format a date range using short format (M/D/YY)
 * @param {Date|string} start - Start date
 * @param {Date|string} end - End date
 * @returns {string} Formatted date range
 */
export function formatDateRange(start, end) {
  return baseDateRange(start, end, { format: 'short' });
}
```

**Testing:**
- [ ] Verify date range displays correctly on Host Proposals page

~~~~~

---

## Summary

| Page Group | Chunks | Priority |
|------------|--------|----------|
| GLOBAL (Formatters) | 1-7 | HIGH |
| /edit-listing, /self-listing | 8-9 | MEDIUM |
| /proposals | 10 | HIGH (Analysis) |
| CLEANUP (Console.log) | 11-13 | MEDIUM |
| DEPRECATED | 14-15 | LOW |
| /host-proposals | 16-18 | LOW |

## Implementation Order

1. **Phase 1:** Chunks 1-7 (Formatter consolidation) - No breaking changes
2. **Phase 2:** Chunks 11-13 (Console.log cleanup) - No functional changes
3. **Phase 3:** Chunks 8-9 (Service consolidation) - Requires import updates
4. **Phase 4:** Chunks 14-15 (Deprecated file cleanup) - Low risk
5. **Phase 5:** Chunks 16-18 (Additional formatter cleanup) - Low risk
6. **Phase 6:** Chunk 10 (processProposalData analysis) - Requires careful planning

## Files Referenced

### CRITICAL IMPACT (Do Not Modify)
- `src/lib/supabase.js` (93 dependents)
- `src/lib/secureStorage.js` (89 dependents)
- `src/lib/auth.js` (79 dependents)
- `src/lib/constants.js` (52 dependents)

### Files to Create
- `src/services/amenitiesService.js` (Chunk 8)
- `src/services/neighborhoodService.js` (Chunk 9)

### Files to Modify
- `src/islands/pages/HostProposalsPage/formatters.js` (Chunks 1, 7, 16-18)
- `src/islands/pages/FavoriteListingsPage/formatters.js` (Chunks 2, 6)
- `src/lib/proposals/dataTransformers.js` (Chunks 3, 5)
- `src/logic/processors/proposals/processProposalData.js` (Chunk 4)
- `src/lib/scheduleSelector/priceCalculations.js` (Chunk 11)
- `src/islands/shared/EditListingDetails/services/amenitiesService.js` (Chunk 12)
- `src/islands/shared/EditListingDetails/services/neighborhoodService.js` (Chunk 13)
- `src/lib/constants/proposalStages.js` (Chunk 14)
- `src/logic/workflows/booking/cancelProposalWorkflow.js` (Chunk 15)

### Files to Delete (After Migration)
- `src/islands/shared/EditListingDetails/services/amenitiesService.js` (after Chunk 8 migration)
- `src/islands/pages/SelfListingPage/utils/amenitiesService.ts` (after Chunk 8 migration)
- `src/islands/shared/EditListingDetails/services/neighborhoodService.js` (after Chunk 9 migration)
- `src/islands/pages/SelfListingPage/utils/neighborhoodService.ts` (after Chunk 9 migration)
