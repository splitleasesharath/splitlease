# Fix Mockup Proposal Monthly Compensation Bug

**Date:** 2026-01-17
**Issue Type:** Bug Fix
**Classification:** DEBUG
**Severity:** High (Functional bug affecting host compensation display)
**Status:** PARTIALLY RESOLVED

---

## Resolution Summary

**Backend: FIXED** - Commit `f6754263` deployed at 23:37:43 UTC fixes the compensation calculation.

**Frontend: STILL NEEDS FIX** - The `calculatePricing()` function in the mockup proposal UI doesn't handle monthly rentals.

---

## Executive Summary

Mockup proposals for **monthly listings** are showing `$0.00/month` for host compensation. The root cause is that both the frontend `calculatePricing()` function and the backend `create_suggested.ts` action don't properly handle monthly rental types when calculating host compensation.

---

## Evidence from Database

**Proposal ID**: `1768692310718x47855761031839016`

| Field | Actual | Expected |
|-------|--------|----------|
| `rental type` | Monthly | Monthly |
| `💰Monthly Host Rate` (listing) | $5,000 | $5,000 |
| `Total Compensation (proposal - host)` | $16,250 ✓ | $16,250 |
| `host compensation` | **$0** ✗ | $5,000/month |
| `4 week rent` | **$0** ✗ | $5,000 |
| `4 week compensation` | **$0** ✗ | $5,000 |

---

## Root Cause Analysis

### Issue 1: Frontend `calculatePricing()` Doesn't Support Monthly

**File**: [useCreateSuggestedProposalLogic.js](../../../app/src/islands/pages/CreateSuggestedProposalPage/useCreateSuggestedProposalLogic.js)

Lines 79-115 only look for nightly rate fields:

```javascript
// ❌ PROBLEM: Only looks for nightly rates
const nightlyPrice =
  listing[`💰Nightly Host Rate for ${nightsPerWeek} nights`] ||
  listing['💰Nightly Host Rate for 4 nights'] ||
  listing['nightly price'] ||
  0;  // Falls through to 0 for monthly listings!

const hostCompensation = grandTotal * 0.85;  // 0 * 0.85 = $0.00
```

**Missing**: No check for `listing["rental type"]` or `listing["💰Monthly Host Rate"]`.

### Issue 2: Backend Passes Wrong Rate for Monthly

**File**: [create_suggested.ts](../../../supabase/functions/proposal/actions/create_suggested.ts)

Lines 353-365:

```typescript
const rentalType = listingData["rental type"];  // "monthly"
const nightsPerWeek = input.nightsSelected.length;
const hostNightlyRate = getNightlyRateForNights(listingData, nightsPerWeek);  // Returns 0 for monthly!

const compensation = calculateCompensation(
  rentalType,
  ...
  hostNightlyRate,  // ← 0 passed here
  ...
  listingData["💰Monthly Host Rate"]  // $5,000 available but hostNightlyRate=0
);
```

The issue is that `getNightlyRateForNights()` returns `0` for monthly listings because they don't have nightly rate fields. The `calculateCompensation()` function then correctly calculates `totalCompensation` using the monthly rate, but sets `hostCompensationPerPeriod = hostNightlyRate` which is `0`.

### Issue 3: `calculateCompensation()` for Monthly Case

**File**: [calculations.ts](../../../supabase/functions/proposal/lib/calculations.ts)

Lines 78-100:

```typescript
case "monthly": {
  const effectiveMonthlyRate = monthlyRate || (weeklyRate * 4);
  hostCompensationPerPeriod = effectiveMonthlyRate;  // ✓ This IS correct
  totalCompensation = effectiveMonthlyRate * durationMonths;  // ✓ This IS correct
  fourWeekRent = effectiveMonthlyRate;  // ✓ This IS correct
  // ...
}
```

Wait - the calculation function itself looks correct! Let me re-examine...

**AH!** The issue is in `create_suggested.ts` line 458:

```typescript
"host compensation": compensation.host_compensation_per_night,  // For monthly, this IS $5,000
```

But `compensation.host_compensation_per_night` is returned from `calculateCompensation()` as `hostCompensationPerPeriod` which IS set to `effectiveMonthlyRate` ($5,000) for monthly.

**Wait, let me re-check the calculations.ts return:**

```typescript
return {
  total_compensation: roundToTwoDecimals(totalCompensation),  // $16,250 ✓
  // ...
  host_compensation_per_night: roundToTwoDecimals(hostCompensationPerPeriod),  // Should be $5,000
};
```

**The calculation logic is correct!** So why is the database showing $0?

### ACTUAL Root Cause Found

Looking at `create_suggested.ts` more carefully at lines 352-365:

```typescript
// Compensation calculation
const rentalType = ((listingData["rental type"] || "nightly").toLowerCase()) as RentalType;
const nightsPerWeek = input.nightsSelected.length;
const hostNightlyRate = getNightlyRateForNights(listingData, nightsPerWeek);  // Returns 0

const compensation = calculateCompensation(
  rentalType,
  (input.reservationSpan || "other") as ReservationSpan,
  nightsPerWeek,
  listingData["💰Weekly Host Rate"] || 0,
  hostNightlyRate,  // ← This is 0, passed as hostNightlyRate parameter
  input.reservationSpanWeeks,
  listingData["💰Monthly Host Rate"] || 0
);
```

Now in `calculations.ts` line 53:

```typescript
// Host compensation per period - the value depends on rental type:
let hostCompensationPerPeriod = hostNightlyRate;  // ← Initialized to 0!
```

Then for monthly (line 82):

```typescript
hostCompensationPerPeriod = effectiveMonthlyRate;  // $5,000 - This SHOULD override it
```

**This should work!** Let me check if there's a logging issue or if the DB is truly not receiving the value...

Actually, looking at the proposal insert at line 458:

```typescript
"host compensation": compensation.host_compensation_per_night,
```

And the data shows `host compensation = 0`. This means `compensation.host_compensation_per_night` is `0`.

**THE BUG**: The issue must be that `rentalType` is not being recognized as "monthly" properly. Let me check:

Line 353: `const rentalType = ((listingData["rental type"] || "nightly").toLowerCase()) as RentalType;`

If `listingData["rental type"]` is "Monthly" (capitalized), `.toLowerCase()` makes it "monthly" which should match the case statement. Unless...

**TypeScript Type Issue?** The `RentalType` type might not include "monthly" or the cast might be failing silently.

Let me check the type definition:

```typescript
// In types.ts
export type RentalType = "nightly" | "weekly" | "monthly";
```

If this exists, it should work. If not, TypeScript would cast it but the switch statement might fall through to default.

**Most Likely Bug**: Looking at line 102-111 in calculations.ts:

```typescript
default:
  // Default to nightly if unknown type
  console.warn(`[calculations] Unknown rental type "${rentalType}", defaulting to nightly`);
  hostCompensationPerPeriod = hostNightlyRate;  // ← This is 0!
  // ...
```

If the rental type is not matching "monthly" exactly (case sensitivity, whitespace, etc.), it falls through to `default` and uses `hostNightlyRate` which is `0`.

---

## Fix Plan

### Fix 1: Frontend - Add Monthly Support to `calculatePricing()`

**File**: `app/src/islands/pages/CreateSuggestedProposalPage/useCreateSuggestedProposalLogic.js`

```javascript
function calculatePricing(listing, nightsPerWeek, weeks) {
  if (!listing || !nightsPerWeek || !weeks) {
    return null;
  }

  const rentalType = (listing["rental type"] || "nightly").toLowerCase();
  const cleaningFee = listing['💰Cleaning Cost / Maintenance Fee'] || 0;
  const damageDeposit = listing['💰Damage Deposit'] || 0;

  // Monthly rental type uses monthly rate directly
  if (rentalType === 'monthly') {
    const monthlyRate = listing['💰Monthly Host Rate'] || 0;
    const durationMonths = weeks / 4;
    const totalCompensation = monthlyRate * durationMonths;
    const grandTotal = totalCompensation + cleaningFee;

    return {
      nightlyPrice: 0,  // Not applicable for monthly
      nightsPerWeek,
      numberOfWeeks: weeks,
      totalNights: nightsPerWeek * weeks,
      fourWeekRent: monthlyRate,
      cleaningFee,
      damageDeposit,
      reservationTotal: totalCompensation,
      grandTotal,
      hostCompensation: totalCompensation,  // For monthly, host gets full amount
      initialPayment: monthlyRate + damageDeposit
    };
  }

  // Nightly/Weekly rental types
  const nightlyPrice =
    listing[`💰Nightly Host Rate for ${nightsPerWeek} nights`] ||
    listing['💰Nightly Host Rate for 4 nights'] ||
    listing['nightly price'] ||
    0;

  const totalNights = nightsPerWeek * weeks;
  const fourWeekRent = nightlyPrice * nightsPerWeek * 4;
  const reservationTotal = nightlyPrice * totalNights;
  const grandTotal = reservationTotal + cleaningFee;
  const hostCompensation = reservationTotal;  // For nightly, host compensation = nightly rate × nights

  return {
    nightlyPrice,
    nightsPerWeek,
    numberOfWeeks: weeks,
    totalNights,
    fourWeekRent,
    cleaningFee,
    damageDeposit,
    reservationTotal,
    grandTotal,
    hostCompensation,
    initialPayment: fourWeekRent + damageDeposit
  };
}
```

### Fix 2: Backend - Add Logging to Debug Rental Type

**File**: `supabase/functions/proposal/actions/create_suggested.ts`

Add logging before the compensation calculation:

```typescript
console.log(`[proposal:create_suggested] Compensation inputs:`, {
  rentalType,
  nightsPerWeek,
  hostNightlyRate,
  weeklyRate: listingData["💰Weekly Host Rate"],
  monthlyRate: listingData["💰Monthly Host Rate"],
});
```

And after:

```typescript
console.log(`[proposal:create_suggested] Compensation result:`, compensation);
```

### Fix 3: Verify Type Definition

**File**: `supabase/functions/proposal/lib/types.ts`

Ensure `RentalType` is defined:

```typescript
export type RentalType = "nightly" | "weekly" | "monthly";
```

---

## Files to Modify

1. **[useCreateSuggestedProposalLogic.js](../../../app/src/islands/pages/CreateSuggestedProposalPage/useCreateSuggestedProposalLogic.js)** - Lines 79-115: Add monthly rental type support
2. **[create_suggested.ts](../../../supabase/functions/proposal/actions/create_suggested.ts)** - Lines 352-365: Add debug logging
3. **[types.ts](../../../supabase/functions/proposal/lib/types.ts)** - Verify RentalType definition

---

## Testing Plan

1. Create a mockup proposal for a monthly listing
2. Verify the UI shows correct host compensation (not $0.00)
3. Verify the database record has correct values:
   - `host compensation` = monthly rate ($5,000)
   - `4 week rent` = monthly rate ($5,000)
   - `4 week compensation` = monthly rate ($5,000)
   - `Total Compensation` = monthly rate × (weeks ÷ 4)

---

## Related Files Reference

- [useCreateSuggestedProposalLogic.js](../../../app/src/islands/pages/CreateSuggestedProposalPage/useCreateSuggestedProposalLogic.js) - Frontend pricing calculation
- [create_suggested.ts](../../../supabase/functions/proposal/actions/create_suggested.ts) - Backend mockup proposal creation
- [calculations.ts](../../../supabase/functions/proposal/lib/calculations.ts) - Compensation calculation logic
- [types.ts](../../../supabase/functions/proposal/lib/types.ts) - TypeScript type definitions
