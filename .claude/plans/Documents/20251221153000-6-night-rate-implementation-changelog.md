# Implementation Changelog

**Plan Executed**: 20251221120000-add-6-night-rate-support.md
**Execution Date**: 2025-12-21
**Status**: Complete

## Summary
Added complete support for 6-night pricing rates throughout the Split Lease system. This fills the gap in the pricing tier range (1-7 nights) where night 6 was previously missing, ensuring the NightlyPriceSlider's n6 output is properly persisted and retrievable.

## Files Modified
| File | Change Type | Description |
|------|-------------|-------------|
| `supabase/migrations/20251221_add_6_night_rate_column.sql` | Created | Database migration for new column |
| `supabase/functions/listing/handlers/submit.ts` | Modified | Add Price 6 nights field mapping |
| `app/src/lib/listingService.js` | Modified | Add night6 to rate column mapping |
| `app/src/logic/calculators/pricing/getNightlyRateByFrequency.js` | Modified | Add key 6 to priceFieldMap |
| `app/src/islands/pages/SelfListingPage/types/listing.types.ts` | Modified | Add night6/night7 to NightlyPricing interface |
| `app/src/islands/pages/SelfListingPage/sections/Section4Pricing.tsx` | Modified | Capture n6/n7 from slider callback |
| `app/src/islands/pages/SelfListingPage/store/prepareListingSubmission.ts` | Modified | Add price6 to payload |
| `app/src/islands/pages/ListingDashboardPage/components/PricingEditSection.jsx` | Modified | Add 6-night rate handling |

## Detailed Changes

### Step 1: Database Migration
- **File**: `supabase/migrations/20251221_add_6_night_rate_column.sql`
  - Change: Created new migration adding `💰Nightly Host Rate for 6 nights` column
  - Reason: Store nightly rate for 6-night stays
  - Impact: Completes pricing tier columns (1-7 nights)

### Step 2: Edge Function Submit Handler
- **File**: `supabase/functions/listing/handlers/submit.ts`
  - Change: Added `'Price 6 nights selected'?: number;` to interface
  - Change: Added mapping for `Price 6 nights selected` to `💰Nightly Host Rate for 6 nights`
  - Reason: Map frontend field to database column during listing submission
  - Impact: Edge function now accepts and persists 6-night rates

### Step 3: Frontend listingService
- **File**: `app/src/lib/listingService.js`
  - Change: Added `'💰Nightly Host Rate for 6 nights': rates.night6 || null` to mapNightlyRatesToColumns
  - Change: Removed fallback `|| rates.night5` from night7 mapping
  - Reason: Include 6-night rate in database writes
  - Impact: All 7 rate tiers now explicitly mapped without fallbacks

### Step 4: Price Calculator
- **File**: `app/src/logic/calculators/pricing/getNightlyRateByFrequency.js`
  - Change: Added `6: '💰Nightly Host Rate for 6 nights'` to priceFieldMap
  - Reason: Enable price lookup for 6-night stays
  - Impact: getNightlyRateByFrequency now supports nightsSelected=6

### Step 5: TypeScript Types
- **File**: `app/src/islands/pages/SelfListingPage/types/listing.types.ts`
  - Change: Added `night6: number` and `night7: number` to calculatedRates
  - Change: Added `cumulativeNight6: number` and `cumulativeNight7: number`
  - Reason: Type definitions for complete pricing data
  - Impact: Full TypeScript support for nights 1-7

### Step 6: Section4Pricing Component
- **File**: `app/src/islands/pages/SelfListingPage/sections/Section4Pricing.tsx`
  - Change: Capture `prices.n6` and `prices.n7` from NightlyPriceSlider
  - Change: Calculate cumulativeNight6 and cumulativeNight7
  - Reason: Store 6-night and 7-night rates from slider
  - Impact: Form now captures all pricing tiers from slider

### Step 7: Payload Preparation
- **File**: `app/src/islands/pages/SelfListingPage/store/prepareListingSubmission.ts`
  - Change: Added `'Price 6 nights selected': number | null` to BubbleListingPayload
  - Change: Extended calculateNightlyPrices to return price6
  - Change: Added `'Price 6 nights selected': nightlyPrices.price6` to payload
  - Reason: Include 6-night cumulative price in API submission
  - Impact: Full pricing data sent to backend

### Step 8: Dashboard Pricing Editor
- **File**: `app/src/islands/pages/ListingDashboardPage/components/PricingEditSection.jsx`
  - Change: Added 6-night rate calculation using 5-night weekly compensation
  - Reason: Dashboard uses different pricing model (weekly compensation input)
  - Impact: Dashboard now saves 6-night rate alongside other tiers

## Database Changes
- **Column Added**: `public.listing."💰Nightly Host Rate for 6 nights"` (numeric)
- **Comment Added**: 'Nightly rate for 6-night stays'
- **Migration Applied**: Via Supabase MCP apply_migration tool

## Edge Function Changes
- **listing/handlers/submit.ts**: Added field mapping for 6-night price
- **Deployment Required**: Manual deployment needed via `supabase functions deploy listing`

## Git Commits
1. `7cb1175e` - feat(db): Add 6-night rate column to listing table
2. `148c8e7d` - feat(edge-function): Add Price 6 nights selected mapping to submit handler
3. `f1b8d299` - feat(listing-service): Add night6 to mapNightlyRatesToColumns
4. `155442cd` - feat(pricing): Add key 6 to getNightlyRateByFrequency priceFieldMap
5. `8e245a74` - feat(types): Add night6/night7 to NightlyPricing interface
6. `49c15c88` - feat(pricing): Capture night6/night7 from NightlyPriceSlider
7. `a2670c31` - feat(submission): Add Price 6 nights selected to Bubble payload
8. `7beba237` - feat(dashboard): Add 6-night rate handling to PricingEditSection
9. `f61e832b` - chore(plans): Move 6-night rate plan to Done

## Verification Steps Completed
- [x] Database migration applied via Supabase MCP
- [x] All 8 implementation steps completed
- [x] Changes committed to git after each step
- [x] Plan moved to Done directory

## Notes & Observations
- The database migration was applied directly via Supabase MCP (production database)
- NightlyPriceSlider already outputs n6 and n7 values, no changes needed there
- Dashboard uses weekly compensation model, so night6/night7 use 5-night compensation value
- The fallback from night7 to night5 in listingService was removed since all values are now explicit

## Manual Actions Required
- **IMPORTANT**: Edge Function requires manual deployment:
  ```bash
  supabase functions deploy listing
  ```
