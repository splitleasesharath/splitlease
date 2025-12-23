# Implementation Changelog

**Plan Executed**: 20251219120000-add-1-night-base-rate-database-column.md
**Execution Date**: 2025-12-19
**Status**: Complete

## Summary

Added database column support for storing the 1-night base rate from which longer-stay discounts are calculated. Updated all relevant code paths including the Edge Function, frontend services, pricing calculators, and dashboard components to save and retrieve this value from the database.

## Files Modified

| File | Change Type | Description |
|------|-------------|-------------|
| `supabase/migrations/20251219_add_1_night_rate_column.sql` | Created | Migration to add 1-night rate column |
| `app/src/lib/listingService.js` | Modified | Added night1 to mapNightlyRatesToColumns() |
| `supabase/functions/listing/handlers/submit.ts` | Modified | Added mapping for 'Price 1 night selected' |
| `app/src/islands/pages/ListingDashboardPage/useListingDashboardPageLogic.js` | Modified | Added 1-night rate to pricing and weeklyCompensation objects |
| `app/src/islands/pages/ListingDashboardPage/components/PricingEditSection.jsx` | Modified | Added preservation of 1-night rate on save |
| `app/src/lib/listingDataFetcher.js` | Modified | Added 1-night rate to query and getNightlyPrice() |
| `app/src/logic/calculators/pricing/getNightlyRateByFrequency.js` | Modified | Added 1-night rate to priceFieldMap |
| `app/src/lib/priceCalculations.js` | Modified | Added 1-night rate to priceFieldMap |
| `app/src/lib/scheduleSelector/priceCalculations.js` | Modified | Added 1-night rate to priceFieldMap |

## Detailed Changes

### Step 1: Database Migration
- **File**: `supabase/migrations/20251219_add_1_night_rate_column.sql`
  - Created new migration file to add column
  - Column type: `numeric` (matching existing rate columns)
  - Column is nullable (same as existing rate columns)
  - Added descriptive comment for documentation

### Step 2: mapNightlyRatesToColumns() in listingService.js
- **File**: `app/src/lib/listingService.js` (lines 1099-1100)
  - Added `'💰Nightly Host Rate for 1 night': rates.night1 || null` to return object
  - Removed outdated comment about database not having 1-night column

### Step 3: SelfListingPage V1 - No Changes Needed
- **Verification**: `app/src/islands/pages/SelfListingPage/store/prepareListingSubmission.ts`
  - Already includes `'Price 1 night selected': nightlyPrices.price1` at line 190
  - Already calculates `price1: oneNightPrice` at line 120

### Step 4: Edge Function submit.ts
- **File**: `supabase/functions/listing/handlers/submit.ts` (lines 217-219)
  - Added mapping for `'Price 1 night selected'` to `'💰Nightly Host Rate for 1 night'`

### Step 5: ListingDashboardPage Read Logic
- **File**: `app/src/islands/pages/ListingDashboardPage/useListingDashboardPageLogic.js` (lines 296-314)
  - Added `1: dbListing['💰Nightly Host Rate for 1 night'] || 0` to pricing object
  - Added `1: (dbListing['💰Nightly Host Rate for 1 night'] || 0) * 1` to weeklyCompensation object

### Step 6: PricingEditSection.jsx
- **File**: `app/src/islands/pages/ListingDashboardPage/components/PricingEditSection.jsx` (lines 410-414)
  - Added preservation logic: if `listing?.pricing?.[1]` exists, include it in updates
  - Note: Dashboard UI does not currently allow editing 1-night rate directly (set during listing creation)

### Step 7: listingDataFetcher.js
- **File**: `app/src/lib/listingDataFetcher.js` (lines 93, 426-427)
  - Added `"💰Nightly Host Rate for 1 night"` to SELECT clause
  - Added `1: listing['💰Nightly Host Rate for 1 night']` to getNightlyPrice() priceMap

### Step 8: getNightlyRateByFrequency.js
- **File**: `app/src/logic/calculators/pricing/getNightlyRateByFrequency.js` (line 60)
  - Added `1: '💰Nightly Host Rate for 1 night'` to priceFieldMap

### Step 9: priceCalculations.js (Legacy)
- **File**: `app/src/lib/priceCalculations.js` (line 50)
  - Added `1: '💰Nightly Host Rate for 1 night'` to priceFieldMap

### Step 10: scheduleSelector/priceCalculations.js
- **File**: `app/src/lib/scheduleSelector/priceCalculations.js` (line 341)
  - Added `1: listing.nightlyHostRateFor1Night || listing['💰Nightly Host Rate for 1 night']` to priceFieldMap

### Step 11: SelfListingPageV2 - No Changes Needed
- **Verification**: `app/src/islands/pages/SelfListingPageV2/SelfListingPageV2.tsx`
  - Already includes `night1: nightlyPricesRef.current[0]` in calculatedRates at line 975
  - Values flow through `mapNightlyRatesToColumns()` which now includes night1

## Database Changes

- **Table**: `public.listing`
- **New Column**: `"💰Nightly Host Rate for 1 night"` (numeric, nullable)
- **Comment**: 'Base nightly rate for 1-night stays (no discount)'

## Edge Function Changes

- **Function**: `listing/handlers/submit.ts`
  - Added mapping for 1-night price field

**REMINDER**: Edge function requires manual deployment:
```bash
supabase functions deploy listing
```

## Git Commits

1. `0c2db24d` - feat(pricing): Add 1-night base rate database column support
2. `7c7bd6c5` - chore: Move completed 1-night rate plan to Done

## Verification Steps Completed

- [x] Migration file created with correct SQL syntax
- [x] mapNightlyRatesToColumns() includes night1 mapping
- [x] Edge Function submit.ts maps 'Price 1 night selected'
- [x] ListingDashboardPage reads 1-night rate from database
- [x] PricingEditSection preserves 1-night rate on save
- [x] listingDataFetcher includes 1-night rate in queries
- [x] getNightlyRateByFrequency supports 1-night lookup
- [x] Legacy priceCalculations.js updated
- [x] scheduleSelector priceCalculations.js updated
- [x] SelfListingPage V1 already sends 'Price 1 night selected' (verified)
- [x] SelfListingPageV2 already includes night1 in calculatedRates (verified)

## Notes & Observations

- **Existing Listings**: Listings without 1-night rate will return `null`/`0`, which is handled gracefully by `|| 0` fallbacks in the read logic
- **No Breaking Changes**: All changes are additive and backward compatible
- **Dashboard Editing**: The 1-night rate is currently only set during listing creation. The PricingEditSection preserves the existing rate but does not provide UI to modify it. This is intentional per the plan.

## Manual Steps Required

1. **Apply Migration**: Run the migration via Supabase CLI or dashboard:
   ```bash
   supabase db push
   # or apply manually in Supabase SQL Editor
   ```

2. **Deploy Edge Function**: Deploy the updated listing edge function:
   ```bash
   supabase functions deploy listing
   ```

---

**Changelog Version**: 1.0
**Created**: 2025-12-19
**Author**: Claude Code (plan-executor)
