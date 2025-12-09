# PROPOSAL EDGE FUNCTION: 400 Bad Request Analysis

**Analysis Date**: 2025-12-09T09:35:45Z
**Updated**: 2025-12-09
**Status**: ROOT CAUSE IDENTIFIED - Frontend Field Name Mismatch
**Severity**: MEDIUM - Simple fix required in frontend code

---

## EXECUTIVE SUMMARY

The proposal Edge Function (v5) is **correctly deployed and operational**, but the frontend is sending incorrect field names in the payload, causing a 400 Bad Request validation error.

**Issue**: Frontend sends `checkInDay` and `checkOutDay`, but Edge Function expects `checkIn` and `checkOut`.

---

## DEPLOYMENT STATUS (Updated)

The proposal Edge Function has been updated to **version 5** and is now operational:

| Property | Value |
|----------|-------|
| **Function ID** | e97eba2a-3f34-4391-a097-9494eb555c81 |
| **Version** | 5 (ACTIVE) |
| **Status** | Operational (returns 400 for validation errors) |
| **Last Updated** | 2025-12-15 |

---

## ROOT CAUSE: Field Name Mismatch

### Frontend Payload (ViewSplitLeasePage.jsx:1052-1074)

The frontend builds a payload with **incorrect field names**:

```javascript
const edgeFunctionPayload = {
  guestId: guestId,
  listingId: proposalData.listingId,
  moveInStartRange: proposalData.moveInDate,
  moveInEndRange: proposalData.moveInDate,
  daysSelected: daysInBubbleFormat,
  nightsSelected: nightsInBubbleFormat,
  reservationSpan: reservationSpanText,
  reservationSpanWeeks: reservationSpanWeeks,
  checkInDay: checkInDayBubble,        // ❌ WRONG: should be 'checkIn'
  checkOutDay: checkOutDayBubble,      // ❌ WRONG: should be 'checkOut'
  proposalPrice: proposalData.pricePerNight,
  fourWeekRent: proposalData.pricePerFourWeeks,
  hostCompensation: proposalData.pricePerFourWeeks,
  needForSpace: proposalData.needForSpace || '',
  aboutMe: proposalData.aboutYourself || '',
  estimatedBookingTotal: proposalData.totalPrice,
  specialNeeds: proposalData.hasUniqueRequirements ? proposalData.uniqueRequirements : '',
  moveInRangeText: proposalData.moveInRange || '',
  flexibleMoveIn: !!proposalData.moveInRange,
  fourWeekCompensation: proposalData.pricePerFourWeeks
};
```

### Edge Function Expected Input (types.ts:39-42)

```typescript
export interface CreateProposalInput {
  // ...
  checkIn: number;    // ✅ Expected field name
  checkOut: number;   // ✅ Expected field name
  // ...
}
```

### Validator Code (validators.ts:139-151)

```typescript
// Check-in/out validation
if (
  typeof input.checkIn !== "number" ||
  !validateDayIndices([input.checkIn], "bubble")
) {
  throw new ValidationError("checkIn must be an integer value 1-7");
}

if (
  typeof input.checkOut !== "number" ||
  !validateDayIndices([input.checkOut], "bubble")
) {
  throw new ValidationError("checkOut must be an integer value 1-7");
}
```

---

## FIX REQUIRED

**File**: `app/src/islands/pages/ViewSplitLeasePage.jsx`
**Location**: Lines 1061-1062

### Change From:
```javascript
checkInDay: checkInDayBubble,
checkOutDay: checkOutDayBubble,
```

### Change To:
```javascript
checkIn: checkInDayBubble,
checkOut: checkOutDayBubble,
```

---

## FILES INVOLVED

| File | Purpose |
|------|---------|
| `app/src/islands/pages/ViewSplitLeasePage.jsx:1052-1074` | Frontend - builds payload (**NEEDS FIX**) |
| `supabase/functions/proposal/index.ts` | Edge Function router |
| `supabase/functions/proposal/actions/create.ts` | Create handler |
| `supabase/functions/proposal/lib/types.ts:39-42` | Type definitions (expects `checkIn`, `checkOut`) |
| `supabase/functions/proposal/lib/validators.ts:139-151` | Input validation |

---

## VERIFICATION STEPS

1. Apply the fix to `ViewSplitLeasePage.jsx`
2. Rebuild the frontend (`npm run build`)
3. Test proposal creation from the view-split-lease page
4. Verify no 400 errors in console
5. Check Supabase Edge Function logs for successful creation

---

## CONCLUSION

The issue is a **simple field name mismatch** between frontend and backend. The Edge Function is correctly deployed and operational. The fix requires changing two field names in the frontend code:
- `checkInDay` → `checkIn`
- `checkOutDay` → `checkOut`
