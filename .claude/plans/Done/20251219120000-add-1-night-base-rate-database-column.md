# Implementation Plan: Add 1-Night Base Rate Database Column Support

## Overview
This plan adds database column support for storing the 1-night base rate and updates all relevant code paths in the self-listing pages (V1 and V2), listing dashboard, and listing service to save and retrieve this value from the database.

## Success Criteria
- [ ] Database column `💰Nightly Host Rate for 1 night` exists in the `listing` table
- [ ] Self-listing pages (V1) save the 1-night base rate to the database
- [ ] Self-listing pages (V2) save the 1-night base rate to the database
- [ ] Listing dashboard reads and displays the 1-night rate correctly
- [ ] `mapNightlyRatesToColumns()` includes the 1-night rate
- [ ] All pricing read logic retrieves the 1-night rate from the database

## Context & References

### Relevant Files
| File | Purpose | Changes Needed |
|------|---------|----------------|
| `supabase/migrations/` | Database migrations | Add new migration for 1-night column |
| `app/src/lib/listingService.js` (lines 1092-1107) | Maps nightly pricing to DB columns | Add `💰Nightly Host Rate for 1 night` mapping |
| `app/src/islands/pages/SelfListingPage/store/prepareListingSubmission.ts` (lines 53, 117-125, 190) | Transforms form data for DB | Map `price1` to new column |
| `app/src/islands/pages/SelfListingPageV2/SelfListingPageV2.tsx` (lines 970-983) | V2 form submission | Already has `night1` in calculatedRates |
| `app/src/islands/pages/ListingDashboardPage/useListingDashboardPageLogic.js` (lines 296-312) | Reads pricing from DB | Add 1-night rate mapping |
| `app/src/islands/pages/ListingDashboardPage/components/PricingEditSection.jsx` (lines 69-74, 410-430) | Pricing edit UI & save | Add 1-night rate handling |
| `supabase/functions/listing/handlers/submit.ts` (lines 216-228) | Edge function submit handler | Add 1-night rate mapping |
| `app/src/lib/listingDataFetcher.js` (lines 93-97, 426-430) | Fetches listing data | Add 1-night rate to queries |
| `app/src/logic/calculators/pricing/getNightlyRateByFrequency.js` (lines 60-64) | Rate lookup by frequency | Add 1-night mapping |
| `app/src/lib/priceCalculations.js` (lines 50-54) | Legacy price calculations | Add 1-night mapping |
| `app/src/lib/scheduleSelector/priceCalculations.js` (lines 341-345) | Schedule selector pricing | Add 1-night mapping |

### Related Documentation
- `.claude/plans/Documents/20251216143000_get_host_listings_analysis.md` - Existing rate columns documentation
- `.claude/Documentation/Database/DATABASE_TABLES_DETAILED.md` - Table schema reference
- `app/src/islands/pages/SelfListingPage/types/listing.types.ts` - TypeScript types for pricing

### Existing Patterns to Follow
- Database column naming: `💰Nightly Host Rate for X nights` (emoji prefix, space-separated)
- Pricing tiers: 2, 3, 4, 5, 7 nights currently exist (1 night will be added)
- Form field naming: `Price X nights selected` in Bubble API payload

## Implementation Steps

### Step 1: Create Database Migration
**Files:** New file in `supabase/migrations/`
**Purpose:** Add the `💰Nightly Host Rate for 1 night` column to the `listing` table
**Details:**
- Create migration file: `20251219_add_1_night_rate_column.sql`
- Add column with type `numeric` (matching existing rate columns)
- Column should be nullable (same as existing rate columns)
- Add appropriate comment for documentation

**SQL Migration:**
```sql
-- Add 1-night base rate column to listing table
-- This stores the base price from which longer-stay discounts are calculated

ALTER TABLE public.listing
ADD COLUMN IF NOT EXISTS "💰Nightly Host Rate for 1 night" numeric;

COMMENT ON COLUMN public.listing."💰Nightly Host Rate for 1 night" IS 'Base nightly rate for 1-night stays (no discount)';
```

**Validation:** Run `SELECT column_name FROM information_schema.columns WHERE table_name = 'listing' AND column_name LIKE '%1 night%';` to confirm column exists

---

### Step 2: Update `mapNightlyRatesToColumns()` in listingService.js
**Files:** `app/src/lib/listingService.js`
**Purpose:** Include 1-night rate when mapping pricing to database columns
**Details:**
- Line ~1092: Update function to include `night1` mapping
- Add `'💰Nightly Host Rate for 1 night': rates.night1 || null` to return object

**Code Change (around line 1100):**
```javascript
function mapNightlyRatesToColumns(nightlyPricing) {
  if (!nightlyPricing?.calculatedRates) {
    return {};
  }

  const rates = nightlyPricing.calculatedRates;

  return {
    '💰Nightly Host Rate for 1 night': rates.night1 || null,  // NEW
    '💰Nightly Host Rate for 2 nights': rates.night2 || null,
    '💰Nightly Host Rate for 3 nights': rates.night3 || null,
    '💰Nightly Host Rate for 4 nights': rates.night4 || null,
    '💰Nightly Host Rate for 5 nights': rates.night5 || null,
    '💰Nightly Host Rate for 7 nights': rates.night7 || rates.night5 || null,
  };
}
```

**Validation:** Log output of function with test data containing `night1`

---

### Step 3: Update prepareListingSubmission.ts (SelfListingPage V1)
**Files:** `app/src/islands/pages/SelfListingPage/store/prepareListingSubmission.ts`
**Purpose:** Map the 1-night price to the Bubble API payload
**Details:**
- The `calculateNightlyPrices()` function already returns `price1: oneNightPrice` (line 120)
- The payload already includes `'Price 1 night selected': nightlyPrices.price1` (line 190)
- This is already correctly implemented! Just need to ensure the DB column exists.

**No code changes needed** - the V1 self-listing page already sends `'Price 1 night selected'` in the payload.

**Validation:** Verify by checking console log: "Prepared Bubble submission payload" should show `Price 1 night selected`

---

### Step 4: Update Edge Function submit.ts Handler
**Files:** `supabase/functions/listing/handlers/submit.ts`
**Purpose:** Map `Price 1 night selected` to the database column
**Details:**
- Add mapping for 1-night rate similar to existing 2-5 night mappings (around line 216)
- Insert after the existing mappings

**Code Change (after line 215):**
```typescript
  // Map nightly prices
  if (data['Price 1 night selected'] !== undefined) {
    mapped['💰Nightly Host Rate for 1 night'] = data['Price 1 night selected'];
  }
  if (data['Price 2 nights selected'] !== undefined) {
    mapped['💰Nightly Host Rate for 2 nights'] = data['Price 2 nights selected'];
  }
  // ... rest of existing mappings
```

**Validation:** Deploy edge function and test listing submission with pricing

---

### Step 5: Update ListingDashboardPage Read Logic
**Files:** `app/src/islands/pages/ListingDashboardPage/useListingDashboardPageLogic.js`
**Purpose:** Read and display the 1-night rate from the database
**Details:**
- Update `pricing` object (around line 296) to include 1-night rate
- Update `weeklyCompensation` object (around line 305) to include 1-night calculation

**Code Change (around line 296):**
```javascript
    pricing: {
      1: dbListing['💰Nightly Host Rate for 1 night'] || 0,  // NEW
      2: dbListing['💰Nightly Host Rate for 2 nights'] || 0,
      3: dbListing['💰Nightly Host Rate for 3 nights'] || 0,
      4: dbListing['💰Nightly Host Rate for 4 nights'] || 0,
      5: dbListing['💰Nightly Host Rate for 5 nights'] || 0,
      6: dbListing['💰Nightly Host Rate for 5 nights'] || 0,
      7: dbListing['💰Nightly Host Rate for 7 nights'] || 0,
    },

    weeklyCompensation: {
      1: (dbListing['💰Nightly Host Rate for 1 night'] || 0) * 1,  // NEW
      2: (dbListing['💰Nightly Host Rate for 2 nights'] || 0) * 2,
      // ... rest of existing
    },
```

**Validation:** Load listing dashboard and verify 1-night rate appears in UI

---

### Step 6: Update PricingEditSection.jsx Save Handler
**Files:** `app/src/islands/pages/ListingDashboardPage/components/PricingEditSection.jsx`
**Purpose:** Save 1-night rate when editing pricing from dashboard
**Details:**
- The current implementation uses weekly compensation inputs for 2-5 nights
- Need to decide: Should 1-night editing be supported in the dashboard?
- For now, just ensure the 1-night rate is saved if it exists in the form data

**Code Change (around line 410):**
```javascript
      if (selectedRentalType === 'Nightly') {
        // ... existing day mapping code ...

        // Add 1-night rate if available (primarily set during listing creation)
        // Note: Dashboard currently doesn't have UI to edit 1-night rate directly
        if (listing?.pricing?.[1]) {
          updates['💰Nightly Host Rate for 1 night'] = listing.pricing[1];
        }

        updates['💰Nightly Host Rate for 2 nights'] = calculateNightlyRate(
          nightlyPricing[2],
          2
        );
        // ... rest of existing
      }
```

**Validation:** Edit pricing in dashboard and verify 1-night rate is preserved

---

### Step 7: Update listingDataFetcher.js Query
**Files:** `app/src/lib/listingDataFetcher.js`
**Purpose:** Include 1-night rate in listing fetch queries
**Details:**
- Add column to SELECT clause (around line 93)
- Add to pricing transformation (around line 426)

**Code Change (around line 93):**
```javascript
        "💰Nightly Host Rate for 1 night",  // NEW
        "💰Nightly Host Rate for 2 nights",
        "💰Nightly Host Rate for 3 nights",
        "💰Nightly Host Rate for 4 nights",
        "💰Nightly Host Rate for 5 nights",
        "💰Nightly Host Rate for 7 nights",
```

**Code Change (around line 426):**
```javascript
    pricing: {
      1: listing['💰Nightly Host Rate for 1 night'],  // NEW
      2: listing['💰Nightly Host Rate for 2 nights'],
      3: listing['💰Nightly Host Rate for 3 nights'],
      4: listing['💰Nightly Host Rate for 4 nights'],
      5: listing['💰Nightly Host Rate for 5 nights'],
      7: listing['💰Nightly Host Rate for 7 nights']
    },
```

**Validation:** Fetch a listing and verify 1-night rate is present in response

---

### Step 8: Update getNightlyRateByFrequency.js
**Files:** `app/src/logic/calculators/pricing/getNightlyRateByFrequency.js`
**Purpose:** Add 1-night rate lookup capability
**Details:**
- Add `1: '💰Nightly Host Rate for 1 night'` to the column mapping (around line 60)

**Code Change (around line 60):**
```javascript
  const columnNameMap = {
    1: '💰Nightly Host Rate for 1 night',  // NEW
    2: '💰Nightly Host Rate for 2 nights',
    3: '💰Nightly Host Rate for 3 nights',
    4: '💰Nightly Host Rate for 4 nights',
    5: '💰Nightly Host Rate for 5 nights',
    7: '💰Nightly Host Rate for 7 nights'
  };
```

**Validation:** Call function with `nightsCount: 1` and verify correct column lookup

---

### Step 9: Update priceCalculations.js (Legacy)
**Files:** `app/src/lib/priceCalculations.js`
**Purpose:** Update legacy pricing module for 1-night support
**Details:**
- Add 1-night mapping to column name map (around line 50)

**Code Change (around line 50):**
```javascript
const NIGHTS_TO_COLUMN = {
  1: '💰Nightly Host Rate for 1 night',  // NEW
  2: '💰Nightly Host Rate for 2 nights',
  3: '💰Nightly Host Rate for 3 nights',
  4: '💰Nightly Host Rate for 4 nights',
  5: '💰Nightly Host Rate for 5 nights',
  7: '💰Nightly Host Rate for 7 nights'
};
```

**Validation:** Import and test function with 1-night pricing data

---

### Step 10: Update scheduleSelector/priceCalculations.js
**Files:** `app/src/lib/scheduleSelector/priceCalculations.js`
**Purpose:** Support 1-night pricing in schedule selector
**Details:**
- Add 1-night mapping to pricing object (around line 341)

**Code Change (around line 341):**
```javascript
  const nightlyPricing = {
    1: listing.nightlyHostRateFor1Night || listing['💰Nightly Host Rate for 1 night'],  // NEW
    2: listing.nightlyHostRateFor2Nights || listing['💰Nightly Host Rate for 2 nights'],
    3: listing.nightlyHostRateFor3Nights || listing['💰Nightly Host Rate for 3 nights'],
    4: listing.nightlyHostRateFor4Nights || listing['💰Nightly Host Rate for 4 nights'],
    5: listing.nightlyHostRateFor5Nights || listing['💰Nightly Host Rate for 5 nights'],
    7: listing.nightlyHostRateFor7Nights || listing['💰Nightly Host Rate for 7 nights']
  };
```

**Validation:** Test schedule selector with listing that has 1-night rate

---

### Step 11: Update SelfListingPageV2 (Optional Enhancement)
**Files:** `app/src/islands/pages/SelfListingPageV2/SelfListingPageV2.tsx`
**Purpose:** Ensure V2 page saves 1-night rate to correct field
**Details:**
- The V2 page already captures `nightlyBaseRate` (line 971) and `night1` (line 975)
- These values flow through the same `prepareListingSubmission` path
- No changes needed if V2 uses the same submission endpoint

**Validation:** Create listing via V2 flow and verify 1-night rate is saved

---

## Edge Cases & Error Handling
- **Existing listings without 1-night rate**: Will return `null`/`0` - handled by `|| 0` fallbacks
- **Listings created via legacy Bubble UI**: May not have 1-night rate - handled gracefully
- **Database migration rollback**: Column can be dropped if needed without breaking existing functionality

## Testing Considerations
- Create new listing via SelfListingPage V1 with nightly pricing - verify 1-night rate saved
- Create new listing via SelfListingPage V2 with nightly pricing - verify 1-night rate saved
- Load existing listing in ListingDashboard - verify 1-night rate displays (may be 0 for old listings)
- Edit pricing in ListingDashboard - verify 1-night rate preserved
- Search page pricing calculations - verify 1-night rate used when applicable

## Rollback Strategy
1. Remove database column: `ALTER TABLE public.listing DROP COLUMN IF EXISTS "💰Nightly Host Rate for 1 night";`
2. Revert code changes in order: Edge function, frontend files
3. Code changes are backward compatible - removing them won't break existing functionality

## Dependencies & Blockers
- Supabase MCP access needed to apply migration
- Edge function deployment required after submit.ts changes
- No blockers identified

## Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Migration fails | Low | Medium | Test in local Supabase first |
| Existing data inconsistency | Low | Low | 1-night rate defaults to 0/null |
| Edge function deployment issues | Low | Medium | Test locally before production deploy |
| Breaking price calculations | Low | High | Thorough testing with existing listings |

---

## Files Referenced Summary

### Database
- `supabase/migrations/20251219_add_1_night_rate_column.sql` (NEW)

### Frontend - Core Services
- `app/src/lib/listingService.js` - Lines 1092-1107
- `app/src/lib/listingDataFetcher.js` - Lines 93-97, 426-430
- `app/src/lib/priceCalculations.js` - Lines 50-54
- `app/src/lib/scheduleSelector/priceCalculations.js` - Lines 341-345

### Frontend - Logic Layer
- `app/src/logic/calculators/pricing/getNightlyRateByFrequency.js` - Lines 60-64

### Frontend - Self Listing Pages
- `app/src/islands/pages/SelfListingPage/store/prepareListingSubmission.ts` - Lines 53, 117-125, 190
- `app/src/islands/pages/SelfListingPageV2/SelfListingPageV2.tsx` - Lines 970-983

### Frontend - Listing Dashboard
- `app/src/islands/pages/ListingDashboardPage/useListingDashboardPageLogic.js` - Lines 296-312
- `app/src/islands/pages/ListingDashboardPage/components/PricingEditSection.jsx` - Lines 69-74, 410-430

### Backend - Edge Functions
- `supabase/functions/listing/handlers/submit.ts` - Lines 216-228

### Types (Reference Only)
- `app/src/islands/pages/SelfListingPage/types/listing.types.ts` - Lines 94, 98

---

**Plan Version**: 1.0
**Created**: 2025-12-19
**Author**: Claude Code Implementation Planner
