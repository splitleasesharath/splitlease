# Proposal Creation: Supabase-Native Migration Plan

**Document Version**: 1.1
**Created**: 2025-12-06
**Updated**: 2025-12-06
**Status**: Ready for Review
**Objective**: Migrate proposal creation from Bubble.io API to fully Supabase-native operation

---

## Executive Summary

This plan migrates the proposal creation flow from the current Bubble-dependent architecture to a fully Supabase-native implementation. The existing `proposal` Edge Function (`supabase/functions/proposal/`) already contains most of the required logic - this migration focuses on:

1. **Frontend Routing Change**: Route calls from `bubble-proxy` to `proposal` Edge Function
2. **Edge Function Adaptation**: Update Edge Function to accept frontend's camelCase payload
3. **Missing Fields**: Add `guestFlexibility` and `preferredGender` to frontend payload
4. **RPC ID Generation**: Use existing `generate_bubble_id()` RPC function

### Current vs Target Architecture

```
CURRENT FLOW (Bubble-dependent):
┌─────────────────┐    ┌──────────────────┐    ┌────────────────┐    ┌──────────────┐
│ ViewSplitLease  │───>│ bubble-proxy     │───>│ Bubble.io API  │───>│ Supabase     │
│ Page.jsx        │    │ create_proposal  │    │ CORE-create-   │    │ (sync copy)  │
│                 │    │                  │    │ proposal-code  │    │              │
└─────────────────┘    └──────────────────┘    └────────────────┘    └──────────────┘

TARGET FLOW (Supabase-native):
┌─────────────────┐    ┌──────────────────┐    ┌──────────────┐
│ ViewSplitLease  │───>│ proposal         │───>│ Supabase     │
│ Page.jsx        │    │ action: create   │    │ (source of   │
│                 │    │                  │    │ truth)       │
└─────────────────┘    └──────────────────┘    └──────────────┘
```

---

## Current Implementation Status

### Already Completed

| Component | File | Status |
|-----------|------|--------|
| Router | `supabase/functions/proposal/index.ts` | ✅ COMPLETE |
| Create Handler | `supabase/functions/proposal/actions/create.ts` | ✅ COMPLETE |
| Update Handler | `supabase/functions/proposal/actions/update.ts` | ✅ COMPLETE |
| Get Handler | `supabase/functions/proposal/actions/get.ts` | ✅ COMPLETE |
| Suggest Handler | `supabase/functions/proposal/actions/suggest.ts` | ✅ COMPLETE |
| Types | `supabase/functions/proposal/lib/types.ts` | ✅ COMPLETE |
| Validators | `supabase/functions/proposal/lib/validators.ts` | ✅ COMPLETE |
| Calculations | `supabase/functions/proposal/lib/calculations.ts` | ✅ COMPLETE |
| Status Management | `supabase/functions/proposal/lib/status.ts` | ✅ COMPLETE |
| Day Conversion | `supabase/functions/proposal/lib/dayConversion.ts` | ✅ COMPLETE |
| RPC Function | `generate_bubble_id()` | ✅ COMPLETE (migration `20251205165755`) |

### Gaps to Address

| Gap | Description | Priority |
|-----|-------------|----------|
| Frontend Routing | ViewSplitLeasePage calls `bubble-proxy` not `proposal` | P0 |
| Payload Acceptance | Edge Function expects snake_case but frontend sends camelCase | P0 |
| Missing Fields | `guestFlexibility`, `preferredGender` not sent from frontend | P0 |
| RPC Usage | Edge Function uses inline ID generator instead of RPC | P1 |
| Deployment | Ensure `proposal` function is deployed | P0 |

---

## Implementation Tasks

### Task 1: Update Edge Function Types to Accept camelCase
**Priority**: P0
**Location**: `supabase/functions/proposal/lib/types.ts`

**Rationale**: The frontend already sends camelCase. Rather than forcing frontend changes, we adapt the Edge Function to accept what the frontend sends. This is less disruptive and follows the principle of backend flexibility.

#### Current Types (snake_case)
```typescript
export interface CreateProposalInput {
  listing_id: string;
  guest_id: string;
  estimated_booking_total: number;
  guest_flexibility: string;
  // ... etc
}
```

#### Updated Types (camelCase to match frontend)
```typescript
export interface CreateProposalInput {
  // Required Identifiers
  listingId: string;
  guestId: string;

  // Required Pricing
  estimatedBookingTotal: number;
  guestFlexibility: string;
  preferredGender: string;

  // Dates & Duration
  moveInStartRange: string;
  moveInEndRange: string;
  reservationSpanWeeks: number;
  reservationSpan: string;
  actualWeeks?: number;

  // Day/Night Selection (Bubble format: 1-7)
  daysSelected: number[];
  nightsSelected: number[];
  checkIn: number;
  checkOut: number;

  // Pricing Details
  proposalPrice: number;
  fourWeekRent?: number;
  fourWeekCompensation?: number;
  hostCompensation?: number;

  // Guest Information
  comment?: string;
  needForSpace?: string;
  aboutMe?: string;
  specialNeeds?: string;

  // Optional
  moveInRangeText?: string;
  flexibleMoveIn?: boolean;
  status?: string;
  suggestedReason?: string;
  originProposalId?: string;
  numberOfMatches?: number;
}
```

---

### Task 2: Update Validators to Use camelCase
**Priority**: P0
**Location**: `supabase/functions/proposal/lib/validators.ts`

Update all field references from snake_case to camelCase:

```typescript
export function validateCreateProposalInput(input: CreateProposalInput): void {
  if (!input.listingId) {
    throw new ValidationError('listingId is required');
  }
  if (!input.guestId) {
    throw new ValidationError('guestId is required');
  }
  if (typeof input.estimatedBookingTotal !== 'number') {
    throw new ValidationError('estimatedBookingTotal must be a number');
  }
  if (!input.guestFlexibility) {
    throw new ValidationError('guestFlexibility is required');
  }
  if (!input.preferredGender) {
    throw new ValidationError('preferredGender is required');
  }
  // ... update all other field references
}
```

---

### Task 3: Update Create Handler Field Mappings
**Priority**: P0
**Location**: `supabase/functions/proposal/actions/create.ts`

Update all references from snake_case input fields to camelCase:

```typescript
// BEFORE
const { data: listing } = await supabase
  .from("listing")
  .select("...")
  .eq("_id", input.listing_id)  // snake_case
  .single();

// AFTER
const { data: listing } = await supabase
  .from("listing")
  .select("...")
  .eq("_id", input.listingId)   // camelCase
  .single();
```

**Key mappings to update:**
- `input.listing_id` → `input.listingId`
- `input.guest_id` → `input.guestId`
- `input.move_in_start_range` → `input.moveInStartRange`
- `input.move_in_end_range` → `input.moveInEndRange`
- `input.days_selected` → `input.daysSelected`
- `input.nights_selected` → `input.nightsSelected`
- `input.reservation_span_weeks` → `input.reservationSpanWeeks`
- `input.reservation_span` → `input.reservationSpan`
- `input.check_in` → `input.checkIn`
- `input.check_out` → `input.checkOut`
- `input.proposal_price` → `input.proposalPrice`
- `input.four_week_rent` → `input.fourWeekRent`
- `input.four_week_compensation` → `input.fourWeekCompensation`
- `input.host_compensation` → `input.hostCompensation`
- `input.need_for_space` → `input.needForSpace`
- `input.about_me` → `input.aboutMe`
- `input.special_needs` → `input.specialNeeds`
- `input.estimated_booking_total` → `input.estimatedBookingTotal`
- `input.guest_flexibility` → `input.guestFlexibility`
- `input.preferred_gender` → `input.preferredGender`
- `input.move_in_range_text` → `input.moveInRangeText`
- `input.flexible_move_in` → `input.flexibleMoveIn`

---

### Task 4: Update Edge Function to Use RPC for ID Generation
**Priority**: P1
**Location**: `supabase/functions/proposal/actions/create.ts`

The `generate_bubble_id()` RPC function already exists (created by migration `20251205165755`).

#### Current Code (inline function)
```typescript
function generateBubbleId(): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000000000);
  return `${timestamp}x${random}`;
}
```

#### Updated Code (use RPC)
```typescript
// Remove inline generateBubbleId function

// In handleCreate function, replace:
const proposalId = generateBubbleId();

// With:
const { data: proposalId, error: idError } = await supabase.rpc('generate_bubble_id');
if (idError || !proposalId) {
  console.error(`[proposal:create] ID generation failed:`, idError);
  throw new SupabaseSyncError('Failed to generate proposal ID');
}
```

---

### Task 5: Add Missing Fields to Frontend Payload
**Priority**: P0
**Location**: `app/src/islands/pages/ViewSplitLeasePage.jsx`

The Edge Function requires `guestFlexibility` and `preferredGender` but the frontend doesn't currently send them.

#### Add to payload (with defaults for MVP):
```javascript
const edgeFunctionPayload = {
  // ... existing fields ...
  guestFlexibility: 'Flexible',  // Default value
  preferredGender: 'any',        // Default value
};
```

**Future Enhancement**: Add proper UI fields to `CreateProposalFlowV2/UserDetailsSection.jsx` to collect these from user.

---

### Task 6: Update Frontend to Call `proposal` Edge Function
**Priority**: P0
**Location**: `app/src/islands/pages/ViewSplitLeasePage.jsx:1079-1084`

#### Current Code
```javascript
const { data, error } = await supabase.functions.invoke('bubble-proxy', {
  body: {
    action: 'create_proposal',
    payload: edgeFunctionPayload
  }
});
```

#### Updated Code
```javascript
const { data, error } = await supabase.functions.invoke('proposal', {
  body: {
    action: 'create',
    payload: edgeFunctionPayload  // No changes needed - still camelCase
  }
});
```

---

### Task 7: Update Response Field Name
**Priority**: P0
**Location**: `app/src/islands/pages/ViewSplitLeasePage.jsx:1086-1108`

The Edge Function returns `proposal_id` (snake_case). Either:

**Option A**: Update frontend to read snake_case
```javascript
console.log('Proposal ID:', data.data?.proposal_id);
```

**Option B**: Update Edge Function response to return camelCase
```typescript
// In actions/create.ts
return {
  proposalId: proposalId,  // camelCase for frontend
  status: status,
  // ...
};
```

**Recommendation**: Option B - keep frontend/backend contract consistent in camelCase.

---

### Task 8: Deploy and Test
**Priority**: P0

#### Deployment Command
```bash
supabase functions deploy proposal
```

#### Verification
1. Check deployment: `supabase functions list`
2. Check logs: `supabase functions logs proposal`
3. Test end-to-end in browser

---

## Implementation Order

### Phase 1: Backend Updates (Tasks 1-4, 7b)
1. Update `lib/types.ts` - camelCase types
2. Update `lib/validators.ts` - camelCase validation
3. Update `actions/create.ts` - camelCase field access + RPC ID generation + camelCase response
4. Deploy Edge Function

### Phase 2: Frontend Updates (Tasks 5-6, 7a)
1. Add `guestFlexibility` and `preferredGender` to payload
2. Change function call from `bubble-proxy` to `proposal`
3. Update action from `create_proposal` to `create`

### Phase 3: Validation
1. Test complete flow in development
2. Verify proposal appears in `proposal` table
3. Verify user updates work

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/proposal/lib/types.ts` | Change interface to camelCase |
| `supabase/functions/proposal/lib/validators.ts` | Change field references to camelCase |
| `supabase/functions/proposal/actions/create.ts` | Change field access to camelCase, use RPC, return camelCase |
| `app/src/islands/pages/ViewSplitLeasePage.jsx` | Add missing fields, change function call |

---

## Testing Checklist

- [ ] `generate_bubble_id()` RPC returns valid Bubble-format ID
- [ ] Edge Function accepts camelCase payload
- [ ] Edge Function creates proposal in `proposal` table
- [ ] Edge Function updates guest user's `Proposals List`
- [ ] Edge Function updates host user's `Proposals List`
- [ ] Edge Function updates guest's `Favorited Listings`
- [ ] Frontend receives correct response with `proposalId`
- [ ] Frontend redirects to guest-proposals page on success
- [ ] Toast notification appears on success
- [ ] Error handling works for validation failures

---

## Rollback Plan

If issues are discovered:
1. **Quick Rollback**: Revert frontend to call `bubble-proxy` (single line change)
2. Bubble workflow remains active, so reverting is safe

---

## Summary of Changes

| What | From | To |
|------|------|-----|
| Edge Function called | `bubble-proxy` | `proposal` |
| Action name | `create_proposal` | `create` |
| Payload format | camelCase | camelCase (unchanged) |
| Edge Function types | snake_case | camelCase |
| ID generation | Inline function | RPC `generate_bubble_id()` |
| Response format | snake_case | camelCase |

---

**Document Status**: Ready for Review
**Estimated Effort**: 2 hours implementation + testing
