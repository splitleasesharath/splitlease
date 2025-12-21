# Implementation Plan: Add 6-Night Rate Support

## Overview
Add complete support for 6-night pricing rates throughout the Split Lease system. Currently, the pricing discount tool (NightlyPriceSlider) calculates a 6-night rate and passes it via the `n6` callback parameter, but this value is not persisted to the database or retrieved by the frontend. This plan implements the complete data pipeline to store and retrieve 6-night rates alongside existing nightly rate columns.

## Success Criteria
- [ ] Database column `💰Nightly Host Rate for 6 nights` exists in the listing table
- [ ] Edge function submit handler maps `Price 6 nights selected` to the database column
- [ ] Frontend `mapNightlyRatesToColumns()` includes night6 rate mapping
- [ ] Price calculator `getNightlyRateByFrequency.js` includes key 6 in priceFieldMap
- [ ] TypeScript types include night6 and cumulativeNight6 in NightlyPricing interface
- [ ] SelfListingPage Section4Pricing captures and stores night6 rate
- [ ] BubbleListingPayload includes `Price 6 nights selected` field

## Context & References

### Relevant Files
| File | Purpose | Changes Needed |
|------|---------|----------------|
| `supabase/migrations/20251219_add_1_night_rate_column.sql` | Migration pattern reference | Reference only - copy pattern |
| `supabase/functions/listing/handlers/submit.ts` | Edge function handler | Add `Price 6 nights selected` mapping (line 147-154 area) |
| `app/src/lib/listingService.js` | Frontend listing service | Add night6 to `mapNightlyRatesToColumns()` (lines 1099-1106) |
| `app/src/logic/calculators/pricing/getNightlyRateByFrequency.js` | Price calculator | Add key 6 to priceFieldMap (lines 59-66) |
| `app/src/islands/pages/SelfListingPage/types/listing.types.ts` | TypeScript types | Add night6, cumulativeNight6 to NightlyPricing interface (lines 97-107) |
| `app/src/islands/pages/SelfListingPage/sections/Section4Pricing.tsx` | Pricing section component | Add night6 to calculatedRates object (lines 102-111) |
| `app/src/islands/pages/SelfListingPage/store/prepareListingSubmission.ts` | API payload preparation | Add price6 to calculateNightlyPrices and payload (lines 106-125, 190-194) |
| `app/src/islands/pages/ListingDashboardPage/components/PricingEditSection.jsx` | Dashboard pricing editor | Review if night6 handling needed (currently uses night5 rate for night7) |

### Related Documentation
- [1-night rate migration](supabase/migrations/20251219_add_1_night_rate_column.sql) - Pattern for column addition
- [1-night implementation changelog](.claude/plans/Documents/20251219175000-1-night-rate-implementation-changelog.md) - Previous similar work

### Existing Patterns to Follow
- Database column naming: `💰Nightly Host Rate for X nights` (uses emoji prefix)
- Frontend payload key: `Price X nights selected`
- Calculator priceFieldMap uses numeric keys (1, 2, 3, 4, 5, 7)
- NightlyPriceSlider already outputs n6 in callback data

## Implementation Steps

### Step 1: Create Database Migration
**Files:** New migration file in `supabase/migrations/`
**Purpose:** Add the `💰Nightly Host Rate for 6 nights` column to the listing table
**Details:**
- Create file `supabase/migrations/20251221_add_6_night_rate_column.sql`
- Add column with numeric type (matches other rate columns)
- Include descriptive comment

**Code:**
```sql
-- Add 6-night rate column to listing table
-- This stores the nightly rate for 6-night stays

ALTER TABLE public.listing
ADD COLUMN IF NOT EXISTS "💰Nightly Host Rate for 6 nights" numeric;

COMMENT ON COLUMN public.listing."💰Nightly Host Rate for 6 nights" IS 'Nightly rate for 6-night stays';
```

**Validation:** Run migration via Supabase CLI or dashboard, verify column exists in listing table

---

### Step 2: Update Edge Function Submit Handler
**Files:** `supabase/functions/listing/handlers/submit.ts`
**Purpose:** Map frontend `Price 6 nights selected` field to database column
**Details:**
- Add mapping at lines 217-231 (after Price 5 nights selected mapping)
- Follow exact pattern of existing price mappings

**Current code (lines 217-231):**
```typescript
  if (data['Price 1 night selected'] !== undefined) {
    mapped['💰Nightly Host Rate for 1 night'] = data['Price 1 night selected'];
  }
  if (data['Price 2 nights selected'] !== undefined) {
    mapped['💰Nightly Host Rate for 2 nights'] = data['Price 2 nights selected'];
  }
  if (data['Price 3 nights selected'] !== undefined) {
    mapped['💰Nightly Host Rate for 3 nights'] = data['Price 3 nights selected'];
  }
  if (data['Price 4 nights selected'] !== undefined) {
    mapped['💰Nightly Host Rate for 4 nights'] = data['Price 4 nights selected'];
  }
  if (data['Price 5 nights selected'] !== undefined) {
    mapped['💰Nightly Host Rate for 5 nights'] = data['Price 5 nights selected'];
  }
```

**Add after line 231:**
```typescript
  if (data['Price 6 nights selected'] !== undefined) {
    mapped['💰Nightly Host Rate for 6 nights'] = data['Price 6 nights selected'];
  }
```

**Also add to interface ListingSubmissionData (around line 66-71):**
```typescript
  'Price 6 nights selected'?: number;
```

**Validation:** Deploy edge function, test listing submission with 6-night rate

---

### Step 3: Update Frontend mapNightlyRatesToColumns Function
**Files:** `app/src/lib/listingService.js`
**Purpose:** Include night6 rate when mapping nightly pricing to database columns
**Details:**
- Modify `mapNightlyRatesToColumns()` function (lines 1092-1107)
- Add night6 mapping after night5

**Current code (lines 1099-1106):**
```javascript
function mapNightlyRatesToColumns(nightlyPricing) {
  if (!nightlyPricing?.calculatedRates) {
    return {};
  }

  const rates = nightlyPricing.calculatedRates;

  return {
    '💰Nightly Host Rate for 1 night': rates.night1 || null,
    '💰Nightly Host Rate for 2 nights': rates.night2 || null,
    '💰Nightly Host Rate for 3 nights': rates.night3 || null,
    '💰Nightly Host Rate for 4 nights': rates.night4 || null,
    '💰Nightly Host Rate for 5 nights': rates.night5 || null,
    '💰Nightly Host Rate for 7 nights': rates.night7 || rates.night5 || null,
  };
}
```

**Change to:**
```javascript
function mapNightlyRatesToColumns(nightlyPricing) {
  if (!nightlyPricing?.calculatedRates) {
    return {};
  }

  const rates = nightlyPricing.calculatedRates;

  return {
    '💰Nightly Host Rate for 1 night': rates.night1 || null,
    '💰Nightly Host Rate for 2 nights': rates.night2 || null,
    '💰Nightly Host Rate for 3 nights': rates.night3 || null,
    '💰Nightly Host Rate for 4 nights': rates.night4 || null,
    '💰Nightly Host Rate for 5 nights': rates.night5 || null,
    '💰Nightly Host Rate for 6 nights': rates.night6 || null,
    '💰Nightly Host Rate for 7 nights': rates.night7 || null,
  };
}
```

**Note:** Also remove the fallback `|| rates.night5` from night7 since we now have all values

**Validation:** Create listing, verify all 7 rate columns populated in database

---

### Step 4: Update Price Calculator priceFieldMap
**Files:** `app/src/logic/calculators/pricing/getNightlyRateByFrequency.js`
**Purpose:** Enable price lookup for 6-night stays
**Details:**
- Add key 6 to priceFieldMap object (lines 59-66)

**Current code:**
```javascript
  const priceFieldMap = {
    1: '💰Nightly Host Rate for 1 night',
    2: '💰Nightly Host Rate for 2 nights',
    3: '💰Nightly Host Rate for 3 nights',
    4: '💰Nightly Host Rate for 4 nights',
    5: '💰Nightly Host Rate for 5 nights',
    7: '💰Nightly Host Rate for 7 nights'
  }
```

**Change to:**
```javascript
  const priceFieldMap = {
    1: '💰Nightly Host Rate for 1 night',
    2: '💰Nightly Host Rate for 2 nights',
    3: '💰Nightly Host Rate for 3 nights',
    4: '💰Nightly Host Rate for 4 nights',
    5: '💰Nightly Host Rate for 5 nights',
    6: '💰Nightly Host Rate for 6 nights',
    7: '💰Nightly Host Rate for 7 nights'
  }
```

**Validation:** Call getNightlyRateByFrequency with nightsSelected=6, verify no error thrown

---

### Step 5: Update TypeScript NightlyPricing Interface
**Files:** `app/src/islands/pages/SelfListingPage/types/listing.types.ts`
**Purpose:** Add type definitions for night6 rate
**Details:**
- Add night6 to calculatedRates interface (lines 97-107)
- Add cumulativeNight6 for consistency

**Current code (lines 93-108):**
```typescript
export interface NightlyPricing {
  oneNightPrice: number;
  decayPerNight: number;
  fiveNightTotal: number;
  calculatedRates: {
    night1: number;
    night2: number;
    night3: number;
    night4: number;
    night5: number;
    cumulativeNight2: number;
    cumulativeNight3: number;
    cumulativeNight4: number;
    cumulativeNight5: number;
  };
}
```

**Change to:**
```typescript
export interface NightlyPricing {
  oneNightPrice: number;
  decayPerNight: number;
  fiveNightTotal: number;
  calculatedRates: {
    night1: number;
    night2: number;
    night3: number;
    night4: number;
    night5: number;
    night6: number;
    night7: number;
    cumulativeNight2: number;
    cumulativeNight3: number;
    cumulativeNight4: number;
    cumulativeNight5: number;
    cumulativeNight6: number;
    cumulativeNight7: number;
  };
}
```

**Validation:** TypeScript compilation succeeds

---

### Step 6: Update Section4Pricing Component
**Files:** `app/src/islands/pages/SelfListingPage/sections/Section4Pricing.tsx`
**Purpose:** Capture night6 rate from NightlyPriceSlider callback
**Details:**
- Modify onPricesChange handler to include night6 and night7 (lines 97-115)
- NightlyPriceSlider already outputs n6 and n7, just need to store them

**Current code (lines 97-115):**
```typescript
onPricesChange={(prices) => {
  const nightlyPricing: NightlyPricing = {
    oneNightPrice: prices.p1,
    decayPerNight: prices.decay,
    fiveNightTotal: prices.n1 + prices.n2 + prices.n3 + prices.n4 + prices.n5,
    calculatedRates: {
      night1: prices.n1,
      night2: prices.n2,
      night3: prices.n3,
      night4: prices.n4,
      night5: prices.n5,
      cumulativeNight2: prices.n1 + prices.n2,
      cumulativeNight3: prices.n1 + prices.n2 + prices.n3,
      cumulativeNight4: prices.n1 + prices.n2 + prices.n3 + prices.n4,
      cumulativeNight5: prices.n1 + prices.n2 + prices.n3 + prices.n4 + prices.n5
    }
  };
  onChange({ ...data, nightlyPricing });
}}
```

**Change to:**
```typescript
onPricesChange={(prices) => {
  const nightlyPricing: NightlyPricing = {
    oneNightPrice: prices.p1,
    decayPerNight: prices.decay,
    fiveNightTotal: prices.n1 + prices.n2 + prices.n3 + prices.n4 + prices.n5,
    calculatedRates: {
      night1: prices.n1,
      night2: prices.n2,
      night3: prices.n3,
      night4: prices.n4,
      night5: prices.n5,
      night6: prices.n6,
      night7: prices.n7,
      cumulativeNight2: prices.n1 + prices.n2,
      cumulativeNight3: prices.n1 + prices.n2 + prices.n3,
      cumulativeNight4: prices.n1 + prices.n2 + prices.n3 + prices.n4,
      cumulativeNight5: prices.n1 + prices.n2 + prices.n3 + prices.n4 + prices.n5,
      cumulativeNight6: prices.n1 + prices.n2 + prices.n3 + prices.n4 + prices.n5 + prices.n6,
      cumulativeNight7: prices.n1 + prices.n2 + prices.n3 + prices.n4 + prices.n5 + prices.n6 + prices.n7
    }
  };
  onChange({ ...data, nightlyPricing });
}}
```

**Validation:** Create nightly listing, verify formData includes night6 and night7 rates

---

### Step 7: Update prepareListingSubmission Payload
**Files:** `app/src/islands/pages/SelfListingPage/store/prepareListingSubmission.ts`
**Purpose:** Include Price 6 nights selected in Bubble API payload
**Details:**
- Update BubbleListingPayload interface (add `'Price 6 nights selected'`)
- Update calculateNightlyPrices function to return price6
- Update payload mapping

**Add to BubbleListingPayload interface (around line 58):**
```typescript
  'Price 6 nights selected': number | null;
```

**Update calculateNightlyPrices function (lines 106-126):**
```typescript
function calculateNightlyPrices(nightlyPricing: NightlyPricing | undefined): {
  price1: number | null;
  price2: number | null;
  price3: number | null;
  price4: number | null;
  price5: number | null;
  price6: number | null;
} {
  if (!nightlyPricing || !nightlyPricing.oneNightPrice) {
    return { price1: null, price2: null, price3: null, price4: null, price5: null, price6: null };
  }

  const { oneNightPrice, calculatedRates } = nightlyPricing;

  return {
    price1: oneNightPrice,
    price2: calculatedRates?.cumulativeNight2 ?? null,
    price3: calculatedRates?.cumulativeNight3 ?? null,
    price4: calculatedRates?.cumulativeNight4 ?? null,
    price5: calculatedRates?.cumulativeNight5 ?? null,
    price6: calculatedRates?.cumulativeNight6 ?? null,
  };
}
```

**Add to payload object (around line 194):**
```typescript
    'Price 6 nights selected': nightlyPrices.price6,
```

**Validation:** Submit listing, verify API payload includes Price 6 nights selected

---

### Step 8: Update PricingEditSection (Dashboard)
**Files:** `app/src/islands/pages/ListingDashboardPage/components/PricingEditSection.jsx`
**Purpose:** Handle 6-night rate in dashboard pricing editor (if applicable)
**Details:**
- Review current implementation - currently handles nights 2-5 with 5-night rate used for 7
- The dashboard currently uses weekly compensation model, not the decay curve
- Consider if 6-night UI is needed or if backend-only is sufficient

**Current handling (lines 418-437):**
```javascript
// Calculate nightly rates from weekly compensation
updates['💰Nightly Host Rate for 2 nights'] = calculateNightlyRate(nightlyPricing[2], 2);
updates['💰Nightly Host Rate for 3 nights'] = calculateNightlyRate(nightlyPricing[3], 3);
updates['💰Nightly Host Rate for 4 nights'] = calculateNightlyRate(nightlyPricing[4], 4);
updates['💰Nightly Host Rate for 5 nights'] = calculateNightlyRate(nightlyPricing[5], 5);
updates['💰Nightly Host Rate for 7 nights'] = calculateNightlyRate(nightlyPricing[5], 7); // Use 5-night rate for 7
```

**Decision:** The dashboard uses a different pricing model (weekly compensation) than SelfListingPage (decay curve). For consistency, add 6-night handling:

```javascript
updates['💰Nightly Host Rate for 6 nights'] = calculateNightlyRate(nightlyPricing[5], 6); // Use 5-night rate for 6
```

**Note:** This maintains the existing pattern where night6 and night7 fall back to the 5-night weekly compensation value. A future enhancement could add dedicated 6-night input to the dashboard.

**Validation:** Edit listing pricing in dashboard, verify 6-night rate is saved

## Edge Cases & Error Handling
- **Missing night6 rate for existing listings:** Return null from calculator (existing behavior)
- **Old listings without night6:** getNightlyRateByFrequency will throw error if nightsSelected=6 and no rate exists - consider fallback to night5 or night7
- **TypeScript strict mode:** Ensure all new properties are properly typed

## Testing Considerations
- Create new listing via SelfListingPage with Nightly type, verify all 7 rates saved
- Create new listing via Edge Function submit handler, verify all 7 rates saved
- Edit existing listing via ListingDashboardPage, verify 6-night rate updated
- Call getNightlyRateByFrequency with nightsSelected=6, verify correct rate returned
- Verify TypeScript compilation passes with no errors

## Rollback Strategy
- Database: Column can be dropped via `ALTER TABLE public.listing DROP COLUMN IF EXISTS "💰Nightly Host Rate for 6 nights";`
- Code: Revert commits for each file changed
- Edge Function: Redeploy previous version

## Dependencies & Blockers
- Supabase migration must be applied before testing frontend changes
- Edge function must be manually deployed after code changes (reminder: `supabase functions deploy listing`)

## Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Database migration failure | Low | High | Test in staging first |
| TypeScript type errors | Medium | Low | Run `tsc --noEmit` before committing |
| Existing listings break | Low | Medium | night6 is optional, defaults to null |
| Edge function deploy forgotten | Medium | Medium | Add reminder in PR description |

---

## File Summary

### Files to Create
1. `supabase/migrations/20251221_add_6_night_rate_column.sql` - Database migration

### Files to Modify
1. `supabase/functions/listing/handlers/submit.ts` - Add Price 6 nights mapping
2. `app/src/lib/listingService.js` - Add night6 to mapNightlyRatesToColumns
3. `app/src/logic/calculators/pricing/getNightlyRateByFrequency.js` - Add key 6 to priceFieldMap
4. `app/src/islands/pages/SelfListingPage/types/listing.types.ts` - Add night6/night7 to NightlyPricing
5. `app/src/islands/pages/SelfListingPage/sections/Section4Pricing.tsx` - Capture night6 from slider
6. `app/src/islands/pages/SelfListingPage/store/prepareListingSubmission.ts` - Add price6 to payload
7. `app/src/islands/pages/ListingDashboardPage/components/PricingEditSection.jsx` - Add 6-night rate handling

### Files Referenced (Read-Only)
- `supabase/migrations/20251219_add_1_night_rate_column.sql` - Pattern reference
- `app/src/islands/pages/SelfListingPage/components/NightlyPriceSlider.tsx` - Already outputs n6/n7
