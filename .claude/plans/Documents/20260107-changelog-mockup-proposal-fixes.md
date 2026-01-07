# Implementation Changelog

**Plan Executed**: 20260107093155-debug-mockup-proposal-generation-bugs.md
**Execution Date**: 2026-01-07
**Status**: Complete

## Summary

Fixed three bugs in mockup proposal generation for nightly listings: (1) added missing 6-night rate support to ensure correct compensation rates, (2) changed reservation span from 4 weeks to 13 weeks to match real proposal requirements, and (3) updated night selection logic for full availability cases to use a realistic weekday pattern (Mon-Fri checkout = 4 nights) instead of selecting all 7 nights.

## Files Modified

| File | Change Type | Description |
|------|-------------|-------------|
| `supabase/functions/listing/handlers/createMockupProposal.ts` | Modified | Fixed all three bugs in mockup proposal generation |

## Detailed Changes

### 1. ListingData Interface (Lines 44-64)

- **File**: `supabase/functions/listing/handlers/createMockupProposal.ts`
- **Change**: Added `'💰Nightly Host Rate for 6 nights'?: number;` field to the interface
- **Reason**: The 6-night rate column was added in migration `20251221_add_6_night_rate_column.sql` but the interface was not updated
- **Impact**: TypeScript now recognizes the 6-night rate field

### 2. getNightlyRateForNights() Function (Lines 76-97)

- **File**: `supabase/functions/listing/handlers/createMockupProposal.ts`
- **Change**:
  - Added `6: listing['💰Nightly Host Rate for 6 nights']` to the rateMap
  - Removed the hardcoded fallback that used 7-night rate for 6-night requests
- **Reason**: With the 6-night rate now available in the database, we should use the actual rate instead of falling back to 7-night rate
- **Impact**: 6-night proposals will now use the correct 6-night rate (e.g., $232/nt instead of $224/nt)

### 3. Listing Query (Lines 374-398)

- **File**: `supabase/functions/listing/handlers/createMockupProposal.ts`
- **Change**: Added `"💰Nightly Host Rate for 6 nights"` to the SELECT query
- **Reason**: The field must be fetched from the database to be available in the ListingData object
- **Impact**: The 6-night rate value is now available for rate calculations

### 4. getDayNightConfig() - Full Availability Case (Lines 205-216)

- **File**: `supabase/functions/listing/handlers/createMockupProposal.ts`
- **Change**:
  - Changed from selecting all 7 days/nights (Sun-Sat) to weekday pattern (Mon-Fri, 4 nights)
  - Changed `reservationSpanWeeks` from `4` to `13`
  - Changed `nightsPerWeek` from `7` to `4`
  - Updated check-in/check-out from Sunday/Sunday to Monday/Friday
- **Reason**: Creates realistic demonstration proposals matching typical guest booking patterns and real proposal requirements
- **Impact**: Full availability nightly listings will now show weekday bookings with 13-week duration

### 5. getDayNightConfig() - Limited Availability Case (Lines 217-244)

- **File**: `supabase/functions/listing/handlers/createMockupProposal.ts`
- **Change**:
  - Changed night selection logic to use `availableNights.length - 1` nights (minus one for flexibility)
  - Changed `reservationSpanWeeks` from `4` to `13`
  - Improved checkout day calculation based on last selected night
- **Reason**: Limited availability mockups should leave room for flexibility and match real proposal requirements
- **Impact**: Limited availability nightly listings will now have correct duration and logical night selection

## Database Changes

None - all changes are in the Edge Function code only.

## Edge Function Changes

- **listing/handlers/createMockupProposal.ts**: All three bugs fixed in this single file

## Git Commits

1. `03af69dd` - fix: correct mockup proposal generation for nightly listings
2. `bd05a75a` - chore: move mockup proposal debug plan to Done

## Verification Steps Completed

- [x] ListingData interface includes 6-night rate field
- [x] Supabase query fetches 6-night rate field
- [x] rateMap includes 6-night rate entry
- [x] 6-night fallback to 7-night rate removed
- [x] Full availability case uses weekday pattern (4 nights)
- [x] Full availability case uses 13-week duration
- [x] Limited availability case uses 13-week duration
- [x] Limited availability case uses nights minus one logic

## Notes & Observations

- The fix aligns the nightly full-availability case with the monthly rental type, which also uses Mon-Fri weekday pattern with 13 weeks
- The 4-night rate lookup will now correctly return the 4-night rate for the weekday pattern mockups
- Manual testing recommended after Edge Function deployment to verify the pricing displays correctly in the Host Proposals page

## Deployment Reminder

**IMPORTANT**: The `listing` Edge Function requires manual deployment to production:

```bash
supabase functions deploy listing
```

After deployment, test by creating a new nightly listing with all nights available to verify:
1. Mockup proposal shows 4-night rate (not 7-night rate)
2. Reservation duration is 13 weeks (not 4 weeks)
3. Days selected are Mon-Fri (not Sun-Sat)
