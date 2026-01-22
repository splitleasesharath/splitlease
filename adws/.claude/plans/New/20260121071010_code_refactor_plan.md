# Code Refactoring Plan - ../app

Date: 2026-01-21
Audit Type: general

## Summary

This audit identified **10 refactoring chunks** organized by affected page groups. Key findings:

| Category | Count | Severity |
|----------|-------|----------|
| Code Duplication | 3 major areas | HIGH |
| ESLint Disables (exhaustive-deps) | 7 occurrences | MEDIUM |
| Excessive Console Logging | 27+ files in lib/ | MEDIUM |
| TODO Items | 17 actionable items | MEDIUM |
| Oversized Hook Files | 4 hooks > 475 lines | LOW (refactor later) |

~~~~~

## PAGE GROUP: GLOBAL (Chunks: 1, 2, 3)

These chunks affect multiple pages and should be addressed as cross-cutting concerns.

### CHUNK 1: Replace raw console.log with logger utility in bubbleAPI.js
**File:** `src/lib/bubbleAPI.js`
**Line:** 39-42
**Issue:** Raw console.log statements instead of using the logger utility that gates output by environment.
**Affected Pages:** All pages that use Bubble API (search, view-split-lease, listing-dashboard, host-proposals)

**Current Code:**
```javascript
export async function createListingInCode(listingName, userEmail = null) {
  console.log('[Bubble API] Creating listing via Edge Function');
  console.log('[Bubble API] Listing name:', listingName);
  console.log('[Bubble API] User email:', userEmail || 'Not provided (logged out)');
```

**Refactored Code:**
```javascript
import logger from './logger.js';

export async function createListingInCode(listingName, userEmail = null) {
  logger.debug('[Bubble API] Creating listing via Edge Function');
  logger.debug('[Bubble API] Listing name:', listingName);
  logger.debug('[Bubble API] User email:', userEmail || 'Not provided (logged out)');
```

**Testing:**
- [ ] Verify logger import works correctly
- [ ] Verify logs only appear in development mode
- [ ] Verify listing creation still works

~~~~~

### CHUNK 2: Replace raw console.log with logger in scheduleSelector/priceCalculations.js
**File:** `src/lib/scheduleSelector/priceCalculations.js`
**Line:** 36-42, 88-93, 157-169
**Issue:** Multiple raw console.log statements for debugging that should use logger utility.
**Affected Pages:** /search, /view-split-lease, /preview-split-lease

**Current Code:**
```javascript
export const calculatePrice = (selectedNights, listing, reservationSpan = 13, zatConfig = null) => {
  const nightsCount = selectedNights.length;

  console.log('=== CALCULATE PRICE ===');
  console.log('nightsCount:', nightsCount);
  console.log('listing rental type:', listing?.['rental type'] || listing?.rentalType);
  console.log('reservationSpan:', reservationSpan);
```

**Refactored Code:**
```javascript
import logger from '../logger.js';

export const calculatePrice = (selectedNights, listing, reservationSpan = 13, zatConfig = null) => {
  const nightsCount = selectedNights.length;

  logger.debug('=== CALCULATE PRICE ===');
  logger.debug('nightsCount:', nightsCount);
  logger.debug('listing rental type:', listing?.['rental type'] || listing?.rentalType);
  logger.debug('reservationSpan:', reservationSpan);
```

**Cascading Changes Required:**
- Lines 88-93: Update result logging to use logger.debug
- Lines 157-169: Update monthly calculation logging to use logger.debug

**Testing:**
- [ ] Verify price calculations still work correctly
- [ ] Verify debug logs only appear in development

~~~~~

### CHUNK 3: Replace raw console.log with logger in useScheduleSelector.js
**File:** `src/islands/shared/useScheduleSelector.js`
**Line:** 46, 160-161
**Issue:** Raw console.log statements that pollute production logs.
**Affected Pages:** /view-split-lease, /preview-split-lease, /proposals (via CreateProposalFlow)

**Current Code:**
```javascript
  useEffect(() => {
    if (initialSelectedDays && initialSelectedDays.length > 0) {
      console.log('📅 useScheduleSelector: Syncing with initialSelectedDays:', initialSelectedDays.map(d => d.name || d.dayOfWeek));
      setSelectedDays(initialSelectedDays);
    }
  }, [initialSelectedDays]);
```

**Refactored Code:**
```javascript
import logger from '../../lib/logger.js';

  useEffect(() => {
    if (initialSelectedDays && initialSelectedDays.length > 0) {
      logger.debug('📅 useScheduleSelector: Syncing with initialSelectedDays:', initialSelectedDays.map(d => d.name || d.dayOfWeek));
      setSelectedDays(initialSelectedDays);
    }
  }, [initialSelectedDays]);
```

**Testing:**
- [ ] Verify schedule selector still works
- [ ] Verify initial day selection syncs correctly

~~~~~

## PAGE GROUP: /search, /, /favorites (Chunks: 4, 5)

### CHUNK 4: Fix eslint-disable for exhaustive-deps in useScheduleSelector.js
**File:** `src/islands/shared/useScheduleSelector.js`
**Line:** 156, 163, 168
**Issue:** Three eslint-disable comments hiding potential stale closure bugs. The callbacks (onSelectionChange, onPriceChange, onScheduleChange) should be in dependency arrays or wrapped with useRef.
**Affected Pages:** /view-split-lease, /preview-split-lease

**Current Code:**
```javascript
  useEffect(() => {
    onSelectionChange?.(selectedDays);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDays]);

  useEffect(() => {
    console.log('useEffect onPriceChange - priceBreakdown:', priceBreakdown);
    console.log('useEffect onPriceChange - callback exists:', !!onPriceChange);
    onPriceChange?.(priceBreakdown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priceBreakdown]);

  useEffect(() => {
    onScheduleChange?.(scheduleState);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduleState]);
```

**Refactored Code:**
```javascript
  // Use refs to avoid unnecessary re-renders when callbacks change
  const onSelectionChangeRef = useRef(onSelectionChange);
  const onPriceChangeRef = useRef(onPriceChange);
  const onScheduleChangeRef = useRef(onScheduleChange);

  // Keep refs updated
  useEffect(() => {
    onSelectionChangeRef.current = onSelectionChange;
    onPriceChangeRef.current = onPriceChange;
    onScheduleChangeRef.current = onScheduleChange;
  });

  useEffect(() => {
    onSelectionChangeRef.current?.(selectedDays);
  }, [selectedDays]);

  useEffect(() => {
    logger.debug('useEffect onPriceChange - priceBreakdown:', priceBreakdown);
    onPriceChangeRef.current?.(priceBreakdown);
  }, [priceBreakdown]);

  useEffect(() => {
    onScheduleChangeRef.current?.(scheduleState);
  }, [scheduleState]);
```

**Testing:**
- [ ] Verify callbacks still fire on state changes
- [ ] Verify no infinite re-render loops
- [ ] Test schedule selection flow on view-split-lease page

~~~~~

### CHUNK 5: Fix eslint-disable for exhaustive-deps in useScheduleSelectorLogicCore.js
**File:** `src/islands/shared/useScheduleSelectorLogicCore.js`
**Line:** 173, 178, 183
**Issue:** Same pattern as Chunk 4 - three eslint-disable comments for callback effects.
**Affected Pages:** /view-split-lease (via ListingScheduleSelectorV2)

**Current Code:**
```javascript
  useEffect(() => {
    onSelectionChange?.(selectedDays)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDays])

  useEffect(() => {
    onPriceChange?.(priceBreakdown)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priceBreakdown])

  useEffect(() => {
    onScheduleChange?.(scheduleState)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduleState])
```

**Refactored Code:**
```javascript
  // Use refs to avoid unnecessary re-renders when callbacks change
  const onSelectionChangeRef = useRef(onSelectionChange)
  const onPriceChangeRef = useRef(onPriceChange)
  const onScheduleChangeRef = useRef(onScheduleChange)

  // Keep refs updated
  useEffect(() => {
    onSelectionChangeRef.current = onSelectionChange
    onPriceChangeRef.current = onPriceChange
    onScheduleChangeRef.current = onScheduleChange
  })

  useEffect(() => {
    onSelectionChangeRef.current?.(selectedDays)
  }, [selectedDays])

  useEffect(() => {
    onPriceChangeRef.current?.(priceBreakdown)
  }, [priceBreakdown])

  useEffect(() => {
    onScheduleChangeRef.current?.(scheduleState)
  }, [scheduleState])
```

**Testing:**
- [ ] Verify ListingScheduleSelectorV2 still works correctly
- [ ] Test price updates when selection changes

~~~~~

### CHUNK 6: Fix eslint-disable for exhaustive-deps in SearchScheduleSelector.jsx
**File:** `src/islands/shared/SearchScheduleSelector.jsx`
**Line:** 726
**Issue:** Single eslint-disable hiding potential stale closure in contiguity validation effect.
**Affected Pages:** /search, /, /favorites, /why-split-lease

**Current Code:**
```javascript
    } else {
      setHasContiguityError(false);
      // Hide error if selection becomes valid (has enough nights)
      if (showError && selectionIsValid) {
        if (errorTimeout) {
          clearTimeout(errorTimeout);
        }
        setShowError(false);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDays]);
```

**Refactored Code:**
```javascript
    } else {
      setHasContiguityError(false);
      // Hide error if selection becomes valid (has enough nights)
      if (showError && selectionIsValid) {
        if (errorTimeout) {
          clearTimeout(errorTimeout);
        }
        setShowError(false);
      }
    }
  }, [selectedDays, showError, errorTimeout, requireContiguousDays, minNights]);
```

**Testing:**
- [ ] Verify contiguity error shows/hides correctly
- [ ] Verify no infinite loops with full dependency array
- [ ] Test on search page with various day selections

~~~~~

## PAGE GROUP: /view-split-lease, /preview-split-lease (Chunks: 7)

### CHUNK 7: Consolidate TODO - Migrate pricing to Logic Core
**File:** `src/islands/shared/useScheduleSelectorLogicCore.js`
**Line:** 18, 108
**Issue:** TODO comments indicate price calculation should use Logic Core architecture but still uses legacy lib/scheduleSelector/priceCalculations.js
**Affected Pages:** /view-split-lease (via ListingScheduleSelectorV2)

**Current Code:**
```javascript
import { calculatePrice } from '../../lib/scheduleSelector/priceCalculations.js' // TODO: Migrate to Logic Core

// ... later in file ...

  // Calculate pricing (TODO: Migrate pricing to Logic Core)
  const priceBreakdown = useMemo(() => {
    if (selectedDays.length === 0) {
      return createEmptyPriceBreakdown()
    }
    const nights = createNightsFromDays(selectedDays)
    return calculatePrice(nights, listing, reservationSpan, zatConfig)
  }, [selectedDays, listing, reservationSpan, zatConfig])
```

**Refactored Code:**
```javascript
import { calculatePricingBreakdown } from '../../logic/calculators/pricing/calculatePricingBreakdown.js'
import { createEmptyPriceBreakdown } from '../../logic/calculators/pricing/createEmptyPriceBreakdown.js'

// ... later in file ...

  // Calculate pricing using Logic Core
  const priceBreakdown = useMemo(() => {
    if (selectedDays.length === 0) {
      return createEmptyPriceBreakdown()
    }

    try {
      const breakdown = calculatePricingBreakdown({
        listing,
        nightsPerWeek: nightsCount,
        reservationWeeks: reservationSpan
      })
      return {
        ...breakdown,
        numberOfNights: nightsCount,
        reservationSpan,
        valid: true
      }
    } catch (error) {
      logger.debug('Pricing calculation failed:', error.message)
      return createEmptyPriceBreakdown()
    }
  }, [selectedDays, listing, reservationSpan, nightsCount])
```

**Cascading Changes Required:**
- May need to create `createEmptyPriceBreakdown.js` in logic/calculators/pricing/ if it doesn't exist
- Verify return shape matches what ListingScheduleSelectorV2 expects

**Testing:**
- [ ] Verify pricing displays correctly on view-split-lease
- [ ] Test with various night selections (2-7 nights)
- [ ] Verify error handling for edge cases

~~~~~

## PAGE GROUP: /host-proposals (Chunks: 8)

### CHUNK 8: Extract normalizer functions to processors layer
**File:** `src/islands/pages/HostProposalsPage/useHostProposalsPageLogic.js`
**Line:** 31-100
**Issue:** Data normalizer functions (normalizeListing, normalizeGuest, normalizeProposal) are defined inline in the hook file instead of in the four-layer logic architecture (processors layer).
**Affected Pages:** /host-proposals

**Current Code:**
```javascript
// ============================================================================
// DATA NORMALIZERS
// ============================================================================
// These functions transform Bubble-format field names to camelCase for V7 components

/**
 * Normalize listing data from Bubble format to V7 component format
 * @param {Object} listing - Raw listing from database
 * @returns {Object} Normalized listing
 */
function normalizeListing(listing) {
  if (!listing) return null;
  return {
    ...listing,
    // Keep original fields for backwards compatibility
    // Add normalized aliases for V7 components
    title: listing.Name || listing.title || listing.name || 'Unnamed Listing',
    // ... more fields
  };
}
```

**Refactored Code:**
```javascript
// In new file: src/logic/processors/proposals/normalizeListingData.js
/**
 * Normalize listing data from Bubble format to V7 component format
 *
 * @intent Transform Bubble-format field names to camelCase for V7 components
 * @rule Always preserves original fields for backwards compatibility
 * @rule Returns null for null/undefined input
 *
 * @param {Object} listing - Raw listing from database
 * @returns {Object|null} Normalized listing or null
 */
export function normalizeListingData(listing) {
  if (!listing) return null;
  return {
    ...listing,
    title: listing.Name || listing.title || listing.name || 'Unnamed Listing',
    name: listing.Name || listing.title || listing.name || 'Unnamed Listing',
    thumbnail: listing['Cover Photo'] || listing.thumbnail || listing.cover_photo || null,
    neighborhood: listing.Neighborhood || listing.neighborhood || null,
    address: listing['Full Address'] || listing.address || listing.full_address || null,
    bedrooms: listing['Bedrooms (number)'] || listing.bedrooms || 0,
    bathrooms: listing['Bathrooms (number)'] || listing.bathrooms || 0,
    monthly_rate: listing['Monthly Rate'] || listing.monthly_rate || 0
  };
}

// In useHostProposalsPageLogic.js - replace inline function with import:
import { normalizeListingData } from '../../../logic/processors/proposals/normalizeListingData.js';
import { normalizeGuestData } from '../../../logic/processors/proposals/normalizeGuestData.js';
import { normalizeProposalData } from '../../../logic/processors/proposals/normalizeProposalData.js';

// Remove inline function definitions (lines 31-100)
```

**Testing:**
- [ ] Create normalizeListingData.js in logic/processors/proposals/
- [ ] Create normalizeGuestData.js in logic/processors/proposals/
- [ ] Create normalizeProposalData.js in logic/processors/proposals/
- [ ] Update imports in useHostProposalsPageLogic.js
- [ ] Verify host proposals page still renders correctly

~~~~~

## PAGE GROUP: /create-suggested-proposal (Chunks: 9)

### CHUNK 9: Implement TODO for WhyThisProposal summary display
**File:** `src/islands/shared/SuggestedProposals/components/WhyThisProposal.jsx`
**Line:** 13
**Issue:** TODO comment indicates missing implementation for summary display logic.
**Affected Pages:** /create-suggested-proposal

**Current Code:**
```javascript
// TODO(human): Implement the summary display logic
```

**Refactored Code:**
```javascript
// This requires human decision on what summary should display
// Marking as DEFERRED - needs product requirements clarification
```

**Testing:**
- [ ] This chunk is DEFERRED pending product requirements

~~~~~

## PAGE GROUP: /listing-dashboard (Chunks: 10)

### CHUNK 10: Implement TODO for photo type change handler
**File:** `src/islands/pages/ListingDashboardPage/components/PhotosSection.jsx`
**Line:** 260
**Issue:** TODO comment indicates missing handler for photo type changes.
**Affected Pages:** /listing-dashboard

**Current Code:**
```javascript
                    // TODO: Handle photo type change
```

**Refactored Code:**
```javascript
// This requires understanding of photo type workflow
// Marking as DEFERRED - needs architecture review of photo management
```

**Testing:**
- [ ] This chunk is DEFERRED pending photo management architecture review

~~~~~

## Files Referenced

### CRITICAL IMPACT (Do Not Modify)
- `src/lib/supabase.js` (93 dependents)
- `src/lib/secureStorage.js` (89 dependents)
- `src/lib/auth.js` (79 dependents)
- `src/lib/constants.js` (52 dependents)

### Files to Modify
| File | Chunk(s) |
|------|----------|
| `src/lib/bubbleAPI.js` | 1 |
| `src/lib/scheduleSelector/priceCalculations.js` | 2 |
| `src/islands/shared/useScheduleSelector.js` | 3, 4 |
| `src/islands/shared/useScheduleSelectorLogicCore.js` | 5, 7 |
| `src/islands/shared/SearchScheduleSelector.jsx` | 6 |
| `src/islands/pages/HostProposalsPage/useHostProposalsPageLogic.js` | 8 |

### New Files to Create
| File | Chunk |
|------|-------|
| `src/logic/processors/proposals/normalizeListingData.js` | 8 |
| `src/logic/processors/proposals/normalizeGuestData.js` | 8 |
| `src/logic/processors/proposals/normalizeProposalData.js` | 8 |

~~~~~

## Execution Order

Based on topological analysis, execute chunks in this order:

1. **Chunk 1** (bubbleAPI.js) - No dependencies
2. **Chunk 2** (priceCalculations.js) - No dependencies
3. **Chunk 3** (useScheduleSelector.js - logging) - No dependencies
4. **Chunk 4** (useScheduleSelector.js - eslint) - Depends on Chunk 3
5. **Chunk 5** (useScheduleSelectorLogicCore.js - eslint) - No dependencies
6. **Chunk 6** (SearchScheduleSelector.jsx) - No dependencies
7. **Chunk 7** (Logic Core pricing migration) - Depends on Chunk 5
8. **Chunk 8** (Extract normalizers) - No dependencies

Chunks 9 and 10 are DEFERRED pending requirements clarification.

~~~~~

## Summary Statistics

| Metric | Value |
|--------|-------|
| Total Actionable Chunks | 8 |
| Deferred Chunks | 2 |
| Files to Modify | 6 |
| New Files to Create | 3 |
| Pages Affected | 10+ |
