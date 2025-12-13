# Implementation Plan: Mockup Proposal Edge Function for First-Time Hosts

## Overview

This plan implements an edge function that automatically creates a mockup proposal when a host submits their first listing. The mockup proposal demonstrates how the negotiation and proposal review process works on the host proposals page, supporting all rental types (Monthly, Weekly, Nightly with >5 nights, Nightly with <=5 nights) with realistic pricing and date ranges populated from the listing configuration.

## Success Criteria

- [ ] Edge function triggers after listing submission when it's the host's first listing (listing count = 1)
- [ ] Mockup proposal created for ALL applicable rental types based on listing configuration
- [ ] Mock guest user data (splitleasefrederick@gmail.com) populated for guest profile fields
- [ ] Pricing calculated from listing's pricing_list configuration
- [ ] Move-in date range set to 14-20 days in the future (adjusted for check-in day)
- [ ] Duration set appropriately (13 weeks for Monthly, weeklypattern for Weekly, etc.)
- [ ] Proposal status set to "Host Review"
- [ ] Proposal appears on host's proposals page after listing submission
- [ ] Queue-based Bubble sync enqueued for proposal creation

## Context & References

### Relevant Files

| File | Purpose | Changes Needed |
|------|---------|----------------|
| `supabase/functions/listing/handlers/submit.ts` | Listing submission handler | Add mockup proposal trigger after successful submission |
| `supabase/functions/listing/index.ts` | Listing edge function router | Import and wire new action or internal call |
| `supabase/functions/proposal/actions/create.ts` | Existing proposal creation logic | Reference for proposal data structure |
| `supabase/functions/proposal/lib/types.ts` | Proposal type definitions | Reference for interfaces |
| `supabase/functions/proposal/lib/calculations.ts` | Pricing calculations | Reuse for mockup pricing |
| `supabase/functions/proposal/lib/status.ts` | Status constants | Use "Host Review" status |
| `supabase/functions/proposal/lib/dayConversion.ts` | Day index conversion utilities | Use for day/night calculations |
| `supabase/functions/_shared/queueSync.ts` | Queue-based Bubble sync | Enqueue mockup proposal sync |
| `supabase/functions/_shared/errors.ts` | Error handling | Reuse error types |
| `supabase/functions/_shared/jsonUtils.ts` | JSON parsing utilities | Reuse for JSONB parsing |

### Related Documentation

- [supabase/CLAUDE.md](../../supabase/CLAUDE.md) - Edge function patterns and architecture
- [.claude/Documentation/Database/DATABASE_TABLES_DETAILED.md](../Documentation/Database/DATABASE_TABLES_DETAILED.md) - Proposal table schema
- [.claude/Documentation/Database/REFERENCE_TABLES_FK_FIELDS.md](../Documentation/Database/REFERENCE_TABLES_FK_FIELDS.md) - FK relationships

### Existing Patterns to Follow

1. **Action-Based Routing**: Edge functions use `{ action, payload }` pattern
2. **Supabase-First Pattern**: Write to Supabase first, then queue Bubble sync
3. **Queue-Based Sync**: Use `enqueueBubbleSync()` for async Bubble sync
4. **Day Indexing**: Bubble uses 1-7 (Sun=1), JavaScript uses 0-6 (Sun=0)
5. **No Fallback Principle**: Fail fast without fallback logic

## Implementation Steps

### Step 1: Create Mockup Proposal Handler Module

**Files:** `supabase/functions/listing/handlers/createMockupProposal.ts` (NEW)

**Purpose:** Encapsulate all mockup proposal creation logic in a dedicated handler

**Details:**

1. Create new file at `supabase/functions/listing/handlers/createMockupProposal.ts`
2. Define interface for mockup proposal parameters:
   ```typescript
   interface CreateMockupProposalPayload {
     listingId: string;
     hostAccountId: string;
     hostUserId: string;
   }
   ```
3. Implement main handler function: `handleCreateMockupProposal()`
4. Import shared utilities:
   - `SupabaseClient` from supabase-js
   - `enqueueBubbleSync`, `triggerQueueProcessing` from `_shared/queueSync.ts`
   - Error types from `_shared/errors.ts`
   - `parseJsonArray` from `_shared/jsonUtils.ts`

**Validation:** Function compiles without errors

---

### Step 2: Implement Mock Guest Lookup

**Files:** `supabase/functions/listing/handlers/createMockupProposal.ts`

**Purpose:** Fetch the pre-configured mock guest user for populating proposal fields

**Details:**

1. Query `user` table for email `splitleasefrederick@gmail.com`:
   ```typescript
   const { data: mockGuest, error: guestError } = await supabase
     .from('user')
     .select(`
       _id,
       email,
       "About Me / Bio",
       "need for Space",
       "special needs",
       "About - reasons to host me",
       "Rental Application",
       "Proposals List"
     `)
     .eq('email', 'splitleasefrederick@gmail.com')
     .single();
   ```
2. If mock guest not found, log warning and skip mockup creation (non-blocking)
3. Extract guest profile data for proposal:
   - `comment`: From "About - reasons to host me" field
   - `aboutMe`: From "About Me / Bio" field
   - `needForSpace`: From "need for Space" field
   - `specialNeeds`: From "special needs" field

**Validation:** Mock guest data is retrieved successfully

---

### Step 3: Implement First Listing Check

**Files:** `supabase/functions/listing/handlers/submit.ts`

**Purpose:** Determine if this is the host's first listing (listing count = 1)

**Details:**

1. After successful listing submission, query `account_host.Listings` array:
   ```typescript
   const { data: hostAccount, error: hostError } = await supabase
     .from('account_host')
     .select('_id, Listings, User')
     .eq('_id', hostAccountId)
     .single();
   ```
2. Parse `Listings` JSONB array using `parseJsonArray()`
3. Check if `listings.length === 1` (current listing is the first)
4. If first listing, call `handleCreateMockupProposal()`

**Validation:** First listing detection works correctly

---

### Step 4: Implement Listing Data Fetch for Mockup

**Files:** `supabase/functions/listing/handlers/createMockupProposal.ts`

**Purpose:** Fetch listing configuration for pricing and availability

**Details:**

1. Query listing with all relevant pricing and availability fields:
   ```typescript
   const { data: listing, error: listingError } = await supabase
     .from('listing')
     .select(`
       _id,
       "rental type",
       "Days Available (List of Days)",
       "Nights Available (List of Nights) ",
       "💰Weekly Host Rate",
       "💰Monthly Host Rate",
       "💰Nightly Host Rate for 2 nights",
       "💰Nightly Host Rate for 3 nights",
       "💰Nightly Host Rate for 4 nights",
       "💰Nightly Host Rate for 5 nights",
       "💰Nightly Host Rate for 7 nights",
       "💰Cleaning Cost / Maintenance Fee",
       "💰Damage Deposit",
       "Features - House Rules",
       "Location - Address",
       "Location - slightly different address",
       "pricing_list"
     `)
     .eq('_id', listingId)
     .single();
   ```
2. Extract rental type: `listing["rental type"]` (Monthly, Weekly, or Nightly)
3. Extract available days/nights arrays
4. Extract pricing from host rate fields

**Validation:** Listing data fetched with all required fields

---

### Step 5: Implement Pricing Calculation Logic

**Files:** `supabase/functions/listing/handlers/createMockupProposal.ts`

**Purpose:** Calculate realistic pricing for each rental type

**Details:**

1. **Monthly Rental Type**:
   ```typescript
   // From Bubble workflow: pricing_list's Nightly Price:item #4's num
   // This refers to the 4th item in the Nightly Price array (4 nights/week rate)
   const nightlyPrice = listing['💰Nightly Host Rate for 4 nights'] || 0;
   const reservationSpanWeeks = 13; // 3 months
   const nightsPerWeek = 4; // Mon-Thu (weekday nights)
   const fourWeekRent = nightlyPrice * nightsPerWeek * 4;
   const estimatedBookingTotal = nightlyPrice * nightsPerWeek * reservationSpanWeeks;
   const hostCompensation = listing['💰Monthly Host Rate'] || estimatedBookingTotal;
   ```

2. **Weekly Rental Type**:
   ```typescript
   const nightlyPrice = listing['💰Nightly Host Rate for 5 nights'] || 0;
   const reservationSpanWeeks = 4; // 1 month
   const nightsPerWeek = 5;
   const fourWeekRent = nightlyPrice * nightsPerWeek * 4;
   const estimatedBookingTotal = nightlyPrice * nightsPerWeek * reservationSpanWeeks;
   const hostCompensation = listing['💰Weekly Host Rate'] * reservationSpanWeeks;
   ```

3. **Nightly (>5 nights available)**:
   ```typescript
   // Full availability
   const availableNights = listing['Nights Available (List of Nights) '] || [];
   const nightsCount = availableNights.length;
   const nightlyPrice = getNightlyRateForNights(listing, nightsCount);
   const reservationSpanWeeks = 4;
   const fourWeekRent = nightlyPrice * nightsCount * 4;
   const estimatedBookingTotal = fourWeekRent;
   ```

4. **Nightly (<=5 nights available)**:
   ```typescript
   // Use listing's actual availability
   const availableNights = listing['Nights Available (List of Nights) '] || [];
   const availableDays = listing['Days Available (List of Days)'] || [];
   const nightsCount = availableNights.length;
   const nightlyPrice = getNightlyRateForNights(listing, nightsCount);
   const reservationSpanWeeks = 4;
   const fourWeekRent = nightlyPrice * nightsCount * 4;
   const estimatedBookingTotal = fourWeekRent;
   // Check-in = first available day, Check-out = last available day
   ```

**Validation:** Pricing calculations match expected values for each rental type

---

### Step 6: Implement Date Calculation Logic

**Files:** `supabase/functions/listing/handlers/createMockupProposal.ts`

**Purpose:** Calculate move-in date range 14-20 days in future, adjusted for check-in day

**Details:**

1. Calculate base move-in start date (14 days from now):
   ```typescript
   const today = new Date();
   const moveInStart = new Date(today);
   moveInStart.setDate(today.getDate() + 14);
   ```

2. Adjust move-in start to correct check-in day (for Monthly = Monday):
   ```typescript
   // For Monthly: Check-in = Monday (JS day 1, Bubble day 2)
   const checkInDayJS = 1; // Monday in JS (0-6)
   const currentDayJS = moveInStart.getDay();
   const daysUntilCheckIn = (checkInDayJS - currentDayJS + 7) % 7;
   if (daysUntilCheckIn !== 0) {
     moveInStart.setDate(moveInStart.getDate() + daysUntilCheckIn);
   }
   ```

3. Calculate move-in end date (6 days after start = 20 days from today):
   ```typescript
   const moveInEnd = new Date(moveInStart);
   moveInEnd.setDate(moveInStart.getDate() + 6);
   ```

4. For different rental types:
   - **Monthly**: Check-in = Monday (Bubble 2), Check-out = Friday (Bubble 6)
   - **Weekly**: Check-in = Sunday (Bubble 1), Check-out = Saturday (Bubble 7)
   - **Nightly (>5)**: All days/nights available
   - **Nightly (<=5)**: First/last available day from listing

**Validation:** Move-in dates are correct and adjusted to check-in day

---

### Step 7: Implement Day/Night Selection Logic

**Files:** `supabase/functions/listing/handlers/createMockupProposal.ts`

**Purpose:** Determine days and nights selected based on rental type

**Details:**

1. **Monthly Rental Type**:
   ```typescript
   // Weekdays only (no Sat/Sun)
   // Bubble format: Sun=1, Mon=2, Tue=3, Wed=4, Thu=5, Fri=6, Sat=7
   const daysSelected = [2, 3, 4, 5, 6]; // Mon-Fri
   const nightsSelected = [2, 3, 4, 5]; // Mon-Thu nights
   const checkIn = 2; // Monday
   const checkOut = 6; // Friday
   ```

2. **Weekly Rental Type**:
   ```typescript
   const daysSelected = [2, 3, 4, 5, 6]; // Mon-Fri
   const nightsSelected = [2, 3, 4, 5, 6]; // Mon-Fri nights
   const checkIn = 2; // Monday
   const checkOut = 7; // Saturday (check out morning)
   ```

3. **Nightly (>5 nights)**:
   ```typescript
   // All available
   const daysSelected = [1, 2, 3, 4, 5, 6, 7]; // All days
   const nightsSelected = [1, 2, 3, 4, 5, 6, 7]; // All nights
   const checkIn = 1; // Sunday
   const checkOut = 1; // Sunday (next week)
   ```

4. **Nightly (<=5 nights)**:
   ```typescript
   // Use listing's actual availability
   const daysSelected = listing['Days Available (List of Days)'] || [];
   const nightsSelected = listing['Nights Available (List of Nights) '] || [];
   const checkIn = Math.min(...daysSelected);
   const checkOut = Math.max(...daysSelected) + 1;
   if (checkOut > 7) checkOut = 1;
   ```

**Validation:** Days/nights match rental type specifications

---

### Step 8: Implement Proposal Record Creation

**Files:** `supabase/functions/listing/handlers/createMockupProposal.ts`

**Purpose:** Create the mockup proposal record in Supabase

**Details:**

1. Generate proposal ID using RPC:
   ```typescript
   const { data: proposalId } = await supabase.rpc('generate_bubble_id');
   ```

2. Build proposal data object (following `proposal/actions/create.ts` pattern):
   ```typescript
   const now = new Date().toISOString();
   const historyEntry = `Mockup proposal created on ${new Date().toLocaleString("en-US", {
     month: "2-digit", day: "2-digit", year: "2-digit",
     hour: "numeric", minute: "2-digit", hour12: true,
   })} - This is a demonstration proposal to help you understand the proposal review process.`;

   const proposalData = {
     _id: proposalId,

     // Core relationships
     Listing: listingId,
     Guest: mockGuest._id,
     "Host - Account": hostAccountId,
     "Created By": mockGuest._id,

     // Guest info (from mock guest)
     "Guest email": mockGuest.email,
     "Guest flexibility": "Flexible",
     "preferred gender": "any",
     "need for space": mockGuest['need for Space'] || "Looking for a comfortable place to stay",
     about_yourself: mockGuest['About Me / Bio'] || "Split Lease Demo Guest",
     special_needs: mockGuest['special needs'] || null,
     Comment: mockGuest['About - reasons to host me'] || "This is a demonstration proposal to show you how the proposal review process works.",

     // Dates
     "Move in range start": moveInStart.toISOString(),
     "Move in range end": moveInEnd.toISOString(),
     "Move-out": moveOutDate.toISOString(),
     "move-in range (text)": `${moveInStart.toLocaleDateString()} - ${moveInEnd.toLocaleDateString()}`,

     // Duration
     "Reservation Span": reservationSpan,
     "Reservation Span (Weeks)": reservationSpanWeeks,
     "actual weeks during reservation span": reservationSpanWeeks,
     "duration in months": Math.floor(reservationSpanWeeks / 4),

     // Day/Night selection (Bubble format 1-7)
     "Days Selected": daysSelected,
     "Nights Selected (Nights list)": nightsSelected,
     "nights per week (num)": nightsSelected.length,
     "check in day": checkIn,
     "check out day": checkOut,
     "Days Available": listing['Days Available (List of Days)'],
     "Complementary Nights": complementaryNights,

     // Pricing
     "proposal nightly price": nightlyPrice,
     "4 week rent": fourWeekRent,
     "Total Price for Reservation (guest)": estimatedBookingTotal,
     "Total Compensation (proposal - host)": hostCompensation,
     "host compensation": hostCompensation,
     "4 week compensation": fourWeekRent,
     "cleaning fee": listing['💰Cleaning Cost / Maintenance Fee'] || 0,
     "damage deposit": listing['💰Damage Deposit'] || 0,
     "nightly price for map (text)": `$${Math.round(nightlyPrice)}`,

     // From listing
     "rental type": listing['rental type'],
     "House Rules": listing['Features - House Rules'],
     "Location - Address": listing['Location - Address'],
     "Location - Address slightly different": listing['Location - slightly different address'],

     // Status & metadata
     Status: "Host Review",
     "Order Ranking": 1,
     History: [historyEntry],
     "Is Finalized": false,
     Deleted: false,

     // Related records
     "rental application": mockGuest['Rental Application'],
     "rental app requested": false,
     "host email": hostEmail,

     // Mockup indicator flag (for potential cleanup/identification)
     "is_mockup_proposal": true,

     // Timestamps
     "Created Date": now,
     "Modified Date": now,
   };
   ```

3. Insert proposal into Supabase:
   ```typescript
   const { error: insertError } = await supabase
     .from('proposal')
     .insert(proposalData);
   ```

**Validation:** Proposal record created with all required fields

---

### Step 9: Implement Bubble Sync Queue

**Files:** `supabase/functions/listing/handlers/createMockupProposal.ts`

**Purpose:** Queue the mockup proposal for async sync to Bubble

**Details:**

1. Enqueue Bubble sync after successful Supabase insert:
   ```typescript
   try {
     await enqueueBubbleSync(supabase, {
       correlationId: `mockup_proposal:${proposalId}`,
       items: [
         {
           sequence: 1,
           table: 'proposal',
           recordId: proposalId,
           operation: 'INSERT',
           payload: proposalData,
         },
       ],
     });

     console.log(`[createMockupProposal] Bubble sync queued for ${proposalId}`);
     triggerQueueProcessing();
   } catch (syncError) {
     // Non-blocking - log but don't fail
     console.warn('[createMockupProposal] Queue sync failed (non-blocking):', syncError);
   }
   ```

**Validation:** Sync queue item created for proposal

---

### Step 10: Update Host User's Proposals List

**Files:** `supabase/functions/listing/handlers/createMockupProposal.ts`

**Purpose:** Add mockup proposal to host user's Proposals List

**Details:**

1. Fetch host user's current Proposals List:
   ```typescript
   const { data: hostUser, error: hostUserError } = await supabase
     .from('user')
     .select('_id, "Proposals List"')
     .eq('_id', hostUserId)
     .single();
   ```

2. Append new proposal ID to list:
   ```typescript
   const currentProposals = parseJsonArray(hostUser['Proposals List'], 'Host Proposals List');
   const updatedProposals = [...currentProposals, proposalId];

   await supabase
     .from('user')
     .update({
       "Proposals List": updatedProposals,
       "Modified Date": now
     })
     .eq('_id', hostUserId);
   ```

**Validation:** Host user's Proposals List updated

---

### Step 11: Integrate with Listing Submit Handler

**Files:** `supabase/functions/listing/handlers/submit.ts`

**Purpose:** Wire up mockup proposal creation after listing submission

**Details:**

1. Add import at top of file:
   ```typescript
   import { handleCreateMockupProposal } from './createMockupProposal.ts';
   ```

2. After successful listing update (Step 4 in current flow), add:
   ```typescript
   // Step 5: Check if first listing and create mockup proposal
   if (hostAccountId && createdById) {
     try {
       console.log('[listing:submit] Step 5/5: Checking for first listing...');

       // Get host account to check listings count
       const { data: hostAccountData } = await supabase
         .from('account_host')
         .select('Listings')
         .eq('_id', hostAccountId)
         .single();

       const listings = parseJsonArray(hostAccountData?.Listings, 'account_host.Listings');

       if (listings.length === 1) {
         console.log('[listing:submit] First listing detected, creating mockup proposal');

         // Get host user email
         const { data: hostUserData } = await supabase
           .from('user')
           .select('email')
           .eq('_id', createdById)
           .single();

         await handleCreateMockupProposal(supabase, {
           listingId: listing_id,
           hostAccountId: hostAccountId,
           hostUserId: createdById,
           hostEmail: hostUserData?.email || user_email,
         });

         console.log('[listing:submit] ✅ Step 5 complete - Mockup proposal created');
       } else {
         console.log('[listing:submit] ⏭️ Step 5 skipped - Not first listing');
       }
     } catch (mockupError) {
       // Non-blocking - log but don't fail listing submission
       console.warn('[listing:submit] ⚠️ Mockup proposal creation failed (non-blocking):', mockupError);
     }
   }
   ```

**Validation:** Mockup proposal created when listing is first listing

---

### Step 12: Add Column for Mockup Indicator (Optional)

**Files:** Database migration

**Purpose:** Add optional column to identify mockup proposals for cleanup

**Details:**

1. Create migration to add `is_mockup_proposal` column (if needed):
   ```sql
   -- Only if we need to identify mockup proposals for cleanup
   ALTER TABLE proposal ADD COLUMN IF NOT EXISTS is_mockup_proposal boolean DEFAULT false;
   ```

Note: This step is optional. The proposal can be identified by:
- Mock guest email (splitleasefrederick@gmail.com)
- History entry containing "Mockup proposal" or "demonstration"
- Created at same time as first listing submission

**Validation:** Migration runs successfully (if implemented)

---

## Edge Cases & Error Handling

| Edge Case | How to Handle |
|-----------|---------------|
| Mock guest user not found | Log warning, skip mockup creation (non-blocking) |
| Listing missing pricing data | Use sensible defaults (0 for missing prices) |
| Host account has >1 listing on first check | Skip mockup creation |
| Proposal creation fails | Log error, don't fail listing submission |
| Bubble sync fails | Log error, continue (will be retried by cron) |
| Missing rental type on listing | Default to "nightly" |
| Empty days/nights available arrays | Use all days [1-7] as fallback |

## Testing Considerations

### Unit Tests

1. **Pricing Calculation Tests**:
   - Monthly: 4 nights/week x 13 weeks
   - Weekly: 5 nights/week x 4 weeks
   - Nightly >5: All nights x 4 weeks
   - Nightly <=5: Actual nights x 4 weeks

2. **Date Calculation Tests**:
   - Move-in start is 14+ days in future
   - Move-in start adjusted to correct check-in day
   - Move-in end is move-in start + 6 days

3. **Day/Night Selection Tests**:
   - Monthly: Mon-Fri days, Mon-Thu nights
   - Weekly: Mon-Fri days, Mon-Fri nights
   - Nightly: Matches listing availability

### Integration Tests

1. Submit first listing -> Verify mockup proposal created
2. Submit second listing -> Verify no mockup proposal created
3. Verify mockup proposal appears on host proposals page
4. Verify mockup proposal has "Host Review" status
5. Verify Bubble sync queue item created

### Manual Testing

1. Create new host account
2. Submit first listing through self-listing flow
3. Navigate to Host Proposals page
4. Verify mockup proposal is visible
5. Review all proposal fields for accuracy

## Rollback Strategy

1. **Disable Mockup Creation**: Comment out call to `handleCreateMockupProposal` in `submit.ts`
2. **Cleanup Mockup Proposals** (if needed):
   ```sql
   -- Identify mockup proposals by mock guest
   SELECT * FROM proposal
   WHERE "Guest" IN (
     SELECT _id FROM "user" WHERE email = 'splitleasefrederick@gmail.com'
   );

   -- Delete if needed (soft delete)
   UPDATE proposal SET "Deleted" = true
   WHERE "Guest" IN (
     SELECT _id FROM "user" WHERE email = 'splitleasefrederick@gmail.com'
   );
   ```

## Dependencies & Blockers

### Prerequisites

1. **Mock Guest User Must Exist**: User with email `splitleasefrederick@gmail.com` must exist in database with:
   - `_id` - Bubble format ID
   - `About Me / Bio` - Profile bio text
   - `need for Space` - Space needs text
   - `special needs` - Special needs text
   - `About - reasons to host me` - Guest introduction text

2. **Listing Submit Handler Working**: Current listing submission flow must be functional

### Blockers

- None identified - all required infrastructure exists

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Mock guest user missing | Low | Medium | Pre-create mock guest in production DB; skip mockup if missing |
| Pricing data missing on listing | Medium | Low | Use sensible defaults; don't fail if prices are 0 |
| Bubble sync queue failure | Low | Low | Non-blocking; will be retried by cron job |
| Performance impact on listing submission | Low | Medium | Mockup creation is async/non-blocking |
| Duplicate mockup proposals | Low | Low | First listing check prevents duplicates |

## File Summary

### Files to Create

| Path | Purpose |
|------|---------|
| `supabase/functions/listing/handlers/createMockupProposal.ts` | Main mockup proposal handler |

### Files to Modify

| Path | Purpose |
|------|---------|
| `supabase/functions/listing/handlers/submit.ts` | Wire up mockup proposal trigger |

### Files to Reference (No Changes)

| Path | Purpose |
|------|---------|
| `supabase/functions/proposal/actions/create.ts` | Reference for proposal data structure |
| `supabase/functions/proposal/lib/types.ts` | Reference for interfaces |
| `supabase/functions/proposal/lib/calculations.ts` | Reuse pricing calculation utilities |
| `supabase/functions/proposal/lib/status.ts` | Use "Host Review" status constant |
| `supabase/functions/proposal/lib/dayConversion.ts` | Use day conversion utilities |
| `supabase/functions/_shared/queueSync.ts` | Use enqueueBubbleSync |
| `supabase/functions/_shared/errors.ts` | Use error types |
| `supabase/functions/_shared/jsonUtils.ts` | Use parseJsonArray |

---

**Plan Version**: 1.0
**Created**: 2025-12-13T17:55:00
**Author**: Claude Implementation Planner
**Status**: Ready for Execution

---

## Post-Implementation Reminders

1. **Deploy Edge Function**: After implementing, deploy the listing edge function:
   ```bash
   supabase functions deploy listing
   ```

2. **Verify Mock Guest Exists**: Ensure `splitleasefrederick@gmail.com` user exists in production

3. **Test End-to-End**: Create a new host account and submit first listing to verify flow

4. **Monitor Logs**: Watch Supabase Edge Function logs for any errors during initial rollout
