# Implementation Plan: Refactor Mockup Proposal Creation into Proposal Edge Function

## Overview

Move mockup proposal creation from the listing edge function into the proposal edge function as a new `action: "create_mockup"` action. This consolidates all proposal creation logic into a single location, eliminates duplicate pricing calculations, and ensures consistent behavior across all proposal types.

## Success Criteria

- [ ] New `create_mockup` action added to proposal edge function
- [ ] Uses shared `lib/calculations.ts` for all pricing (no duplicate code)
- [ ] Listing edge function calls proposal edge function for mockup creation
- [ ] Mockup creation remains NON-BLOCKING (failures do not affect listing activation)
- [ ] Works for all rental types: Monthly, Weekly, Nightly
- [ ] Host compensation displays correct values (fixes $0.00 bug)
- [ ] Thread and SplitBot messages created correctly
- [ ] Old `createMockupProposal.ts` handler deleted or deprecated

## Context & References

### Relevant Files

| File | Purpose | Changes Needed |
|------|---------|----------------|
| `supabase/functions/proposal/index.ts` | Main router for proposal actions | Add `create_mockup` to ALLOWED_ACTIONS and route to new handler |
| `supabase/functions/proposal/actions/create_mockup.ts` | **NEW FILE** | Implement mockup proposal creation using shared calculations |
| `supabase/functions/proposal/lib/calculations.ts` | Shared pricing calculations | No changes - reuse as-is |
| `supabase/functions/proposal/lib/types.ts` | Type definitions | Add `CreateMockupProposalInput` and `CreateMockupProposalResponse` types |
| `supabase/functions/listing/handlers/submit.ts` | Triggers mockup creation | Replace direct handler call with edge function call |
| `supabase/functions/listing/handlers/createMockupProposal.ts` | **DELETE** | Current mockup logic (has duplicate calculations - the source of bugs) |
| `supabase/functions/_shared/queueSync.ts` | Queue utilities | No changes - reuse `triggerProposalMessaging` |

### Related Documentation

- `supabase/CLAUDE.md` - Edge Functions architecture reference
- `.claude/plans/Done/20260117175500-fix-duplicate-splitbot-messages.md` - Related fix for messaging

### Existing Patterns to Follow

1. **Action-Based Routing Pattern** - Used in `proposal/index.ts`:
   - Dynamic import: `const { handleCreateMockup } = await import("./actions/create_mockup.ts");`
   - No auth required for internal operations

2. **Internal Edge Function Call Pattern** - Used in `_shared/queueSync.ts`:
   ```typescript
   fetch(`${supabaseUrl}/functions/v1/proposal`, {
     method: 'POST',
     headers: {
       'Authorization': `Bearer ${serviceRoleKey}`,
       'Content-Type': 'application/json',
     },
     body: JSON.stringify({
       action: 'create_mockup',
       payload: { ... }
     })
   })
   ```

3. **Shared Calculation Usage** - Used in `create.ts` and `create_suggested.ts`:
   ```typescript
   import {
     calculateCompensation,
     calculateMoveOutDate,
     calculateComplementaryNights,
     getNightlyRateForNights,
   } from "../lib/calculations.ts";
   ```

## Implementation Steps

### Step 1: Add Types for Mockup Proposal

**Files:** `supabase/functions/proposal/lib/types.ts`
**Purpose:** Define input/output types for the new create_mockup action
**Details:**
- Add `CreateMockupProposalInput` interface with minimal required fields:
  - `listingId: string`
  - `hostUserId: string`
  - `hostEmail: string`
- Add `CreateMockupProposalResponse` interface:
  - `proposalId: string`
  - `threadId: string | null`
  - `status: string`
  - `createdAt: string`

**Validation:** TypeScript compilation succeeds

---

### Step 2: Create the New Handler

**Files:** `supabase/functions/proposal/actions/create_mockup.ts` (NEW)
**Purpose:** Implement mockup proposal creation using shared calculations
**Details:**

The handler should:

1. **Accept minimal payload:**
   ```typescript
   interface CreateMockupProposalPayload {
     listingId: string;
     hostUserId: string;
     hostEmail: string;
   }
   ```

2. **Fetch mock guest user** (`splitleasefrederick@gmail.com`):
   - If not found, return gracefully (non-blocking)

3. **Fetch listing data** with all pricing fields:
   - Same SELECT as `createMockupProposal.ts` lines 376-398

4. **Determine day/night configuration** based on rental type:
   - Reuse logic from `createMockupProposal.ts` `getDayNightConfig()` function
   - Monthly: 4 nights/week, 13 weeks
   - Weekly: 5 nights/week, 4 weeks
   - Nightly: Variable based on availability

5. **Calculate pricing using shared calculations:**
   ```typescript
   import {
     calculateCompensation,
     calculateMoveOutDate,
     calculateComplementaryNights,
     calculateOrderRanking,
     formatPriceForDisplay,
     getNightlyRateForNights,
   } from "../lib/calculations.ts";

   const hostNightlyRate = getNightlyRateForNights(listingData, nightsPerWeek);
   const compensation = calculateCompensation(
     rentalType,
     reservationSpan,
     nightsPerWeek,
     listingData["Weekly Host Rate"] || 0,
     hostNightlyRate,
     reservationSpanWeeks,
     listingData["Monthly Host Rate"] || 0
   );
   ```

6. **Build proposal data** with:
   - Status: `"Host Review"`
   - Created By: mock guest ID
   - Use `compensation.host_compensation_per_night` for "host compensation" field
   - Use `compensation.total_compensation` for "Total Compensation" field

7. **Insert proposal** into database

8. **Update host user's Proposals List** (with junction table dual-write)

9. **Trigger messaging** via `triggerProposalMessaging()`:
   ```typescript
   import { triggerProposalMessaging } from "../../_shared/queueSync.ts";

   triggerProposalMessaging({
     proposalId,
     guestId: mockGuestId,
     hostId: hostUserId,
     listingId,
     proposalStatus: 'Host Review',
   });
   ```

10. **Return response** with proposal ID and thread info

**Key Difference from Current Implementation:**
- Uses `calculateCompensation()` from shared lib instead of local `calculatePricing()`
- This ensures consistent calculations with regular and suggested proposals

**Validation:**
- Create a test listing and verify proposal is created
- Check that "host compensation" and "Total Compensation" fields have correct values

---

### Step 3: Update Proposal Router

**Files:** `supabase/functions/proposal/index.ts`
**Purpose:** Add routing for the new create_mockup action
**Details:**

1. **Update validActions array** (line 38):
   ```typescript
   const validActions = ['create', 'update', 'get', 'suggest', 'create_suggested', 'create_mockup'];
   ```

2. **Add case to switch statement** (after `create_suggested` case, around line 127):
   ```typescript
   case 'create_mockup': {
     console.log('[proposal] Loading create_mockup handler...');
     const { handleCreateMockup } = await import("./actions/create_mockup.ts");
     console.log('[proposal] Create_mockup handler loaded');

     // No authentication required - internal service call only
     // Access control via service role key
     result = await handleCreateMockup(payload, supabase);
     break;
   }
   ```

**Validation:**
- Manual test with curl/Postman to verify routing works
- Check that unauthorized calls are rejected (service role key required)

---

### Step 4: Update Listing Submit Handler

**Files:** `supabase/functions/listing/handlers/submit.ts`
**Purpose:** Replace direct handler call with edge function call
**Details:**

1. **Remove import** (line 18):
   ```typescript
   // REMOVE: import { handleCreateMockupProposal } from './createMockupProposal.ts';
   ```

2. **Replace direct call** (lines 398-402) with edge function call:
   ```typescript
   // OLD:
   await handleCreateMockupProposal(supabase, {
     listingId: listing_id,
     hostUserId: userId,
     hostEmail: user_email,
   });

   // NEW:
   const supabaseUrl = Deno.env.get('SUPABASE_URL');
   const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

   if (supabaseUrl && serviceRoleKey) {
     // Fire and forget - mockup creation is non-blocking
     fetch(`${supabaseUrl}/functions/v1/proposal`, {
       method: 'POST',
       headers: {
         'Authorization': `Bearer ${serviceRoleKey}`,
         'Content-Type': 'application/json',
       },
       body: JSON.stringify({
         action: 'create_mockup',
         payload: {
           listingId: listing_id,
           hostUserId: userId,
           hostEmail: user_email,
         }
       })
     }).then(response => {
       if (response.ok) {
         console.log('[listing:submit] Mockup proposal creation triggered');
       } else {
         console.warn('[listing:submit] Mockup trigger returned:', response.status);
       }
     }).catch(err => {
       console.warn('[listing:submit] Mockup trigger failed (non-blocking):', err.message);
     });
   }
   ```

3. **Update log messages** to reflect new pattern

**Validation:**
- Submit a new listing as a first-time host
- Verify mockup proposal is created correctly
- Verify listing submission completes even if mockup fails

---

### Step 5: Delete Old Handler

**Files:** `supabase/functions/listing/handlers/createMockupProposal.ts`
**Purpose:** Remove duplicate code
**Details:**
- Delete the entire file (665 lines)
- The duplicate `calculatePricing()` function (lines 259-318) is eliminated
- The duplicate `getNightlyRateForNights()` function (lines 77-98) is eliminated

**Validation:**
- Build succeeds without the file
- No imports reference the deleted file

---

### Step 6: Add Helper Function for Day/Night Config

**Files:** `supabase/functions/proposal/lib/mockupHelpers.ts` (NEW)
**Purpose:** Extract reusable helper for determining mockup day/night configuration
**Details:**

Move the `getDayNightConfig()` function from the old handler to a shared location:

```typescript
/**
 * Get day/night configuration based on rental type for mockup proposals
 * All values in 0-indexed format (JavaScript standard: Sun=0, Sat=6)
 */
export function getMockupDayNightConfig(
  rentalType: string,
  availableNights: number[]
): {
  daysSelected: number[];
  nightsSelected: number[];
  checkIn: number;
  checkOut: number;
  nightsPerWeek: number;
  reservationSpanWeeks: number;
} {
  // ... implementation
}
```

**Note:** Convert from Bubble format (1-7) to JavaScript format (0-6) since the database now uses JS format.

**Validation:**
- Unit test or manual verification that configs match expected values

## Edge Cases & Error Handling

| Edge Case | How to Handle |
|-----------|---------------|
| Mock guest not found | Log warning, return gracefully (non-blocking) |
| Listing not found | Log error, return gracefully (non-blocking) |
| ID generation fails | Log error, return gracefully (non-blocking) |
| Proposal insert fails | Log error, return gracefully (non-blocking) |
| Messaging trigger fails | Fire-and-forget, log warning only |
| Edge function call fails | Catch error, log warning, continue with listing submission |

**Non-Blocking Pattern:**
```typescript
try {
  // ... mockup creation logic
} catch (error) {
  console.error('[proposal:create_mockup] Failed:', error);
  // Do NOT throw - this is a non-blocking operation
  return { success: false, error: error.message };
}
```

## Testing Considerations

1. **Unit Tests:**
   - Verify `calculateCompensation()` returns correct values for all rental types
   - Verify day/night config helper returns expected configurations

2. **Integration Tests:**
   - Create a new listing as a first-time host
   - Verify mockup proposal appears in host's proposal list
   - Verify pricing displays correctly (not $0.00)
   - Verify thread and SplitBot message are created

3. **Edge Function Tests:**
   - Call `create_mockup` action directly with test payload
   - Verify response structure matches expected format
   - Verify service role key is required (unauthorized calls rejected)

4. **Regression Tests:**
   - Existing `create` action still works
   - Existing `create_suggested` action still works
   - Listing submission still works when mockup creation fails

## Rollback Strategy

If issues arise after deployment:

1. **Quick Rollback:** Revert the changes to `submit.ts` to use the old direct handler call
2. **Keep Old Handler:** Don't delete `createMockupProposal.ts` until new implementation is verified in production
3. **Feature Flag:** Consider adding a feature flag to toggle between old/new implementations

## Dependencies & Blockers

- None identified - all required utilities and patterns already exist

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Edge function cold start adds latency | Low | Low | Fire-and-forget pattern, doesn't block listing submission |
| Shared calculations have bugs | Very Low | Medium | Same calculations already used by create and create_suggested |
| Day index conversion issues | Low | Medium | All values now use JS 0-indexed format consistently |
| Missing mock guest in production | Low | Low | Non-blocking, logs warning and continues |

## Files Summary

### New Files
- `supabase/functions/proposal/actions/create_mockup.ts` - New handler for mockup creation
- `supabase/functions/proposal/lib/mockupHelpers.ts` - Helper for day/night configuration

### Modified Files
- `supabase/functions/proposal/index.ts` - Add routing for create_mockup action
- `supabase/functions/proposal/lib/types.ts` - Add new input/output types
- `supabase/functions/listing/handlers/submit.ts` - Replace direct call with edge function call

### Deleted Files
- `supabase/functions/listing/handlers/createMockupProposal.ts` - Old handler with duplicate code

---

**DOCUMENT_VERSION**: 1.0
**CREATED**: 2026-01-17
**AUTHOR**: Claude Opus 4.5
