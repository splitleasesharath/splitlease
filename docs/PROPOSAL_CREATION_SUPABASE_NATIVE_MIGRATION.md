# Proposal Creation: Supabase-Native Migration Plan

**Document Version**: 1.0
**Created**: 2025-12-06
**Status**: Ready for Review
**Objective**: Migrate proposal creation from Bubble.io API to fully Supabase-native operation

---

## Executive Summary

This plan migrates the proposal creation flow from the current Bubble-dependent architecture to a fully Supabase-native implementation. The existing `proposal` Edge Function (`supabase/functions/proposal/`) already contains most of the required logic - this migration focuses on:

1. **Frontend Routing Change**: Route calls from `bubble-proxy` to `proposal` Edge Function
2. **Payload Mapping**: Align frontend payload with Edge Function input schema
3. **RPC ID Generation**: Use `generate_bubble_id()` RPC instead of client-side generation
4. **Missing Fields**: Add `guestFlexibility` and `preferredGender` to frontend payload

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

### Already Completed (in `supabase/functions/proposal/`)

| Component | File | Status |
|-----------|------|--------|
| Router | `index.ts` | COMPLETE |
| Create Handler | `actions/create.ts` | COMPLETE |
| Update Handler | `actions/update.ts` | COMPLETE |
| Get Handler | `actions/get.ts` | COMPLETE |
| Suggest Handler | `actions/suggest.ts` | COMPLETE |
| Types | `lib/types.ts` | COMPLETE |
| Validators | `lib/validators.ts` | COMPLETE |
| Calculations | `lib/calculations.ts` | COMPLETE |
| Status Management | `lib/status.ts` | COMPLETE |
| Day Conversion | `lib/dayConversion.ts` | COMPLETE |

### Gaps to Address

| Gap | Description | Priority |
|-----|-------------|----------|
| Frontend Routing | ViewSplitLeasePage calls `bubble-proxy` not `proposal` | P0 |
| Payload Mapping | Frontend payload fields don't match Edge Function input | P0 |
| Missing Fields | `guestFlexibility`, `preferredGender` not sent from frontend | P0 |
| RPC ID Generation | Use `generate_bubble_id()` RPC instead of inline function | P1 |
| Edge Function Deployment | Ensure `proposal` function is deployed | P0 |

---

## Implementation Tasks

### Task 1: Verify/Create `generate_bubble_id()` RPC Function
**Priority**: P1
**Location**: Supabase Database Functions

The Edge Function currently uses an inline `generateBubbleId()` function. We should use the RPC function for consistency:

**Current (in `actions/create.ts:38-42`):**
```typescript
function generateBubbleId(): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000000000);
  return `${timestamp}x${random}`;
}
```

**Target: Use RPC call:**
```typescript
const { data: newId, error } = await supabaseAdmin.rpc('generate_bubble_id');
if (error || !newId) {
  throw new SupabaseSyncError('Failed to generate proposal ID');
}
const proposalId = newId;
```

**Action**: Create migration if RPC doesn't exist, or update `create.ts` to use existing RPC.

---

### Task 2: Update Frontend Payload Structure
**Priority**: P0
**Location**: `app/src/islands/pages/ViewSplitLeasePage.jsx`

#### Current Frontend Payload (lines 1052-1074)
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
  checkInDay: checkInDayBubble,
  checkOutDay: checkOutDayBubble,
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

#### Required Edge Function Payload (`CreateProposalInput`)
```typescript
interface CreateProposalInput {
  // Required Identifiers
  listing_id: string;           // Currently: listingId
  guest_id: string;             // Currently: guestId

  // Required Pricing
  estimated_booking_total: number;  // Currently: estimatedBookingTotal
  guest_flexibility: string;        // MISSING - need to add
  preferred_gender: string;         // MISSING - need to add

  // Dates & Duration
  move_in_start_range: string;      // Currently: moveInStartRange
  move_in_end_range: string;        // Currently: moveInEndRange
  reservation_span_weeks: number;   // Currently: reservationSpanWeeks
  reservation_span: string;         // Currently: reservationSpan

  // Day/Night Selection (Bubble format: 1-7)
  days_selected: number[];          // Currently: daysSelected
  nights_selected: number[];        // Currently: nightsSelected
  check_in: number;                 // Currently: checkInDay
  check_out: number;                // Currently: checkOutDay

  // Pricing Details
  proposal_price: number;           // Currently: proposalPrice
  four_week_rent?: number;          // Currently: fourWeekRent
  four_week_compensation?: number;  // Currently: fourWeekCompensation
  host_compensation?: number;       // Currently: hostCompensation

  // Guest Information
  comment?: string;                 // Currently: NOT SENT (proposalData has no comment)
  need_for_space?: string;          // Currently: needForSpace
  about_me?: string;                // Currently: aboutMe
  special_needs?: string;           // Currently: specialNeeds

  // Optional fields
  move_in_range_text?: string;      // Currently: moveInRangeText
  flexible_move_in?: boolean;       // Currently: flexibleMoveIn
}
```

#### Field Mapping Table

| Frontend Field | Edge Function Field | Transformation | Status |
|----------------|---------------------|----------------|--------|
| `guestId` | `guest_id` | Rename (camelCase → snake_case) | CHANGE |
| `listingId` | `listing_id` | Rename | CHANGE |
| `moveInStartRange` | `move_in_start_range` | Rename | CHANGE |
| `moveInEndRange` | `move_in_end_range` | Rename | CHANGE |
| `daysSelected` | `days_selected` | Rename | CHANGE |
| `nightsSelected` | `nights_selected` | Rename | CHANGE |
| `reservationSpan` | `reservation_span` | Rename | CHANGE |
| `reservationSpanWeeks` | `reservation_span_weeks` | Rename | CHANGE |
| `checkInDay` | `check_in` | Rename | CHANGE |
| `checkOutDay` | `check_out` | Rename | CHANGE |
| `proposalPrice` | `proposal_price` | Rename | CHANGE |
| `fourWeekRent` | `four_week_rent` | Rename | CHANGE |
| `hostCompensation` | `host_compensation` | Rename | CHANGE |
| `needForSpace` | `need_for_space` | Rename | CHANGE |
| `aboutMe` | `about_me` | Rename | CHANGE |
| `estimatedBookingTotal` | `estimated_booking_total` | Rename | CHANGE |
| `specialNeeds` | `special_needs` | Rename | CHANGE |
| `moveInRangeText` | `move_in_range_text` | Rename | CHANGE |
| `flexibleMoveIn` | `flexible_move_in` | Rename | CHANGE |
| `fourWeekCompensation` | `four_week_compensation` | Rename | CHANGE |
| N/A | `guest_flexibility` | **ADD** | NEW |
| N/A | `preferred_gender` | **ADD** | NEW |

---

### Task 3: Add Missing Fields to Frontend
**Priority**: P0
**Location**: `app/src/islands/pages/ViewSplitLeasePage.jsx`

The Edge Function requires `guest_flexibility` and `preferred_gender` but the frontend doesn't currently send them.

#### Options:

**Option A: Default Values (Recommended for MVP)**
```javascript
const edgeFunctionPayload = {
  // ... existing fields ...
  guest_flexibility: 'Flexible',  // Default value
  preferred_gender: 'any',        // Default value
};
```

**Option B: Add to CreateProposalFlowV2 Modal**
Add new form fields to collect this data from the user in `UserDetailsSection.jsx`.

**Recommendation**: Use Option A for initial migration, then add proper UI in a follow-up task.

---

### Task 4: Update Frontend to Call `proposal` Edge Function
**Priority**: P0
**Location**: `app/src/islands/pages/ViewSplitLeasePage.jsx:1079-1084`

#### Current Code
```javascript
// Call the Edge Function
const { data, error } = await supabase.functions.invoke('bubble-proxy', {
  body: {
    action: 'create_proposal',
    payload: edgeFunctionPayload
  }
});
```

#### Updated Code
```javascript
// Call the proposal Edge Function directly
const { data, error } = await supabase.functions.invoke('proposal', {
  body: {
    action: 'create',
    payload: {
      // Snake_case field names for Edge Function
      listing_id: proposalData.listingId,
      guest_id: guestId,
      estimated_booking_total: proposalData.totalPrice,
      guest_flexibility: 'Flexible',  // Default for now
      preferred_gender: 'any',        // Default for now
      move_in_start_range: proposalData.moveInDate,
      move_in_end_range: proposalData.moveInDate,
      reservation_span_weeks: reservationSpanWeeks,
      reservation_span: reservationSpanText,
      days_selected: daysInBubbleFormat,
      nights_selected: nightsInBubbleFormat,
      check_in: checkInDayBubble,
      check_out: checkOutDayBubble,
      proposal_price: proposalData.pricePerNight,
      four_week_rent: proposalData.pricePerFourWeeks,
      four_week_compensation: proposalData.pricePerFourWeeks,
      host_compensation: proposalData.pricePerFourWeeks,
      need_for_space: proposalData.needForSpace || '',
      about_me: proposalData.aboutYourself || '',
      special_needs: proposalData.hasUniqueRequirements ? proposalData.uniqueRequirements : '',
      move_in_range_text: proposalData.moveInRange || '',
      flexible_move_in: !!proposalData.moveInRange
    }
  }
});
```

---

### Task 5: Update Response Handling
**Priority**: P0
**Location**: `app/src/islands/pages/ViewSplitLeasePage.jsx:1086-1108`

#### Current Response Handling
```javascript
if (error) {
  console.error('Edge Function error:', error);
  throw new Error(error.message || 'Failed to submit proposal');
}

if (!data?.success) {
  console.error('Proposal submission failed:', data?.error);
  throw new Error(data?.error || 'Failed to submit proposal');
}

console.log('Proposal submitted successfully:', data);
console.log('Proposal ID:', data.data?.proposalId);
```

#### Updated Response Handling
```javascript
if (error) {
  console.error('Edge Function error:', error);
  throw new Error(error.message || 'Failed to submit proposal');
}

if (!data?.success) {
  console.error('Proposal submission failed:', data?.error);
  throw new Error(data?.error || 'Failed to submit proposal');
}

console.log('Proposal submitted successfully:', data);
console.log('Proposal ID:', data.data?.proposal_id);  // Note: snake_case
console.log('Status:', data.data?.status);
```

---

### Task 6: Update Edge Function to Use RPC for ID Generation
**Priority**: P1
**Location**: `supabase/functions/proposal/actions/create.ts`

#### Current Code (lines 38-42)
```typescript
function generateBubbleId(): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000000000);
  return `${timestamp}x${random}`;
}
```

#### Updated Code
```typescript
// Remove inline function, use RPC instead

// In handleCreate function:
const { data: proposalId, error: idError } = await supabase.rpc('generate_bubble_id');
if (idError || !proposalId) {
  console.error(`[proposal:create] ID generation failed:`, idError);
  throw new SupabaseSyncError('Failed to generate proposal ID');
}
```

**Note**: This assumes `generate_bubble_id()` RPC function exists. If not, we need to create it via migration.

---

### Task 7: Create RPC Function (if not exists)
**Priority**: P1
**Location**: Supabase Migration

#### Migration SQL
```sql
-- Migration: create_generate_bubble_id_function
-- Purpose: Generate Bubble-compatible unique IDs

CREATE OR REPLACE FUNCTION generate_bubble_id()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  timestamp_ms bigint;
  random_part bigint;
BEGIN
  -- Get current timestamp in milliseconds
  timestamp_ms := (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::bigint;

  -- Generate random number (0 to 999999999)
  random_part := floor(random() * 1000000000)::bigint;

  -- Return Bubble-compatible format: {timestamp}x{random}
  RETURN timestamp_ms::text || 'x' || random_part::text;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION generate_bubble_id() TO anon, authenticated, service_role;
```

---

### Task 8: Deploy and Test Edge Function
**Priority**: P0

#### Deployment Command
```bash
supabase functions deploy proposal
```

#### Verification Steps
1. Check function is deployed: `supabase functions list`
2. Check function logs: `supabase functions logs proposal`
3. Test with curl:
```bash
curl -X POST \
  'https://<project>.supabase.co/functions/v1/proposal' \
  -H 'Authorization: Bearer <anon-key>' \
  -H 'Content-Type: application/json' \
  -d '{
    "action": "create",
    "payload": {
      "listing_id": "test",
      "guest_id": "test",
      "estimated_booking_total": 100,
      "guest_flexibility": "Flexible",
      "preferred_gender": "any",
      "move_in_start_range": "2025-01-15",
      "move_in_end_range": "2025-01-15",
      "reservation_span_weeks": 4,
      "reservation_span": "4 weeks",
      "days_selected": [2,3,4,5,6],
      "nights_selected": [2,3,4,5],
      "check_in": 2,
      "check_out": 6,
      "proposal_price": 75
    }
  }'
```

---

## Implementation Order

### Phase 1: Backend Preparation (Tasks 6, 7, 8)
1. Create `generate_bubble_id()` RPC migration if needed
2. Update `actions/create.ts` to use RPC
3. Deploy `proposal` Edge Function
4. Test Edge Function independently

### Phase 2: Frontend Migration (Tasks 2, 3, 4, 5)
1. Update payload structure with snake_case field names
2. Add missing fields (`guest_flexibility`, `preferred_gender`)
3. Change function invocation from `bubble-proxy` to `proposal`
4. Update response handling

### Phase 3: Validation
1. Test complete flow in development
2. Verify proposal appears in Supabase `proposal` table
3. Verify guest user's `Proposals List` is updated
4. Verify host user's `Proposals List` is updated

---

## Rollback Plan

If issues are discovered after deployment:

1. **Quick Rollback**: Revert frontend to call `bubble-proxy` (single file change)
2. **Full Rollback**: Revert all changes and redeploy

The Bubble workflow remains active during migration, so reverting is safe.

---

## Files to Modify

| File | Type | Changes |
|------|------|---------|
| `supabase/functions/proposal/actions/create.ts` | Edit | Use RPC for ID generation |
| `app/src/islands/pages/ViewSplitLeasePage.jsx` | Edit | Update payload, function call, response handling |
| `supabase/migrations/YYYYMMDD_create_generate_bubble_id.sql` | Create | RPC function (if needed) |

---

## Testing Checklist

- [ ] `generate_bubble_id()` RPC returns valid Bubble-format ID
- [ ] `proposal` Edge Function is deployed and accessible
- [ ] Edge Function validates all required fields
- [ ] Edge Function creates proposal in `proposal` table
- [ ] Edge Function updates guest user's `Proposals List`
- [ ] Edge Function updates host user's `Proposals List`
- [ ] Edge Function updates guest's `Favorited Listings`
- [ ] Frontend payload maps correctly to Edge Function input
- [ ] Frontend receives correct response with `proposal_id`
- [ ] Frontend redirects to guest-proposals page on success
- [ ] Toast notification appears on success
- [ ] Error handling works for validation failures
- [ ] Error handling works for database errors

---

## Success Criteria

1. **Proposal Creation**: New proposals are created directly in Supabase without Bubble API calls
2. **ID Format**: Proposal IDs match Bubble format (`{timestamp}x{random}`)
3. **Data Integrity**: All 50+ proposal fields are correctly populated
4. **User Updates**: Guest and host `Proposals List` are updated
5. **No Regressions**: Existing functionality works as before
6. **Bubble Independence**: No calls to Bubble workflow for proposal creation

---

## Post-Migration Cleanup (Future)

Once migration is stable:

1. Remove `create_proposal` action from `bubble-proxy/index.ts`
2. Remove `bubble-proxy/handlers/proposal.ts`
3. Update documentation to reflect new architecture
4. Consider deprecating remaining Bubble API calls

---

**Document Status**: Ready for Review
**Next Step**: Approval, then begin Phase 1 implementation
**Estimated Effort**: 2-3 hours implementation + testing

---

## Appendix: Current File Locations

### Edge Function Files
- `supabase/functions/proposal/index.ts` - Router
- `supabase/functions/proposal/actions/create.ts` - Create handler
- `supabase/functions/proposal/actions/update.ts` - Update handler
- `supabase/functions/proposal/actions/get.ts` - Get handler
- `supabase/functions/proposal/actions/suggest.ts` - Suggest handler
- `supabase/functions/proposal/lib/types.ts` - Type definitions
- `supabase/functions/proposal/lib/validators.ts` - Input validation
- `supabase/functions/proposal/lib/calculations.ts` - Pricing calculations
- `supabase/functions/proposal/lib/status.ts` - Status management
- `supabase/functions/proposal/lib/dayConversion.ts` - Day index conversion

### Frontend Files
- `app/src/islands/pages/ViewSplitLeasePage.jsx` - Main page with proposal submission (lines 1014-1116)
- `app/src/islands/shared/CreateProposalFlowV2.jsx` - Proposal modal component

### Legacy Files (to be deprecated)
- `supabase/functions/bubble-proxy/handlers/proposal.ts` - Current Bubble-dependent handler
- `supabase/functions/bubble-proxy/index.ts` - Contains `create_proposal` action routing
