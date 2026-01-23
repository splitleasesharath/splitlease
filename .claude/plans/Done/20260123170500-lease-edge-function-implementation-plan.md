# Implementation Plan: Lease Edge Function (CORE-create-lease Migration)

## Overview

This plan details the implementation of a new Supabase Edge Function called `lease` that handles the complete lease creation workflow. This function replaces the Bubble.io backend workflow "CORE-create-lease" that is triggered when a proposal or counteroffer is accepted.

## Success Criteria

- [ ] Edge Function `lease` created with action-based routing pattern
- [ ] `create` action implements all 7 phases of the Bubble workflow
- [ ] Lease record created with correct relationships and calculated values
- [ ] Payment records generated for both guest and host
- [ ] Stays (list of weekly stays) created for the reservation
- [ ] Magic links generated for host and guest
- [ ] Multi-channel notifications sent (email, SMS, in-app)
- [ ] Reservation dates recorded
- [ ] User associations updated (guest and host)
- [ ] Agreement number generated
- [ ] All operations properly logged and errors reported to Slack
- [ ] Bubble sync queue integration for bidirectional sync
- [ ] Frontend integration points updated (CompareTermsModal, GuestProposalsPage)

---

## Context & References

### Relevant Database Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `bookings_leases` | Main lease record | `_id`, `Proposal`, `Guest`, `Host`, `Listing`, `Agreement Number`, `First Payment Date`, `Total Compensation`, `Total Rent`, `List of Stays`, `Participants`, `Cancellation Policy` |
| `proposal` | Source of terms (original or HC) | `_id`, `hc *` fields (HC = Historical Copy for counteroffers), `Guest`, `Host User`, `Listing`, rental terms |
| `paymentrecords` | Payment schedule records | `Booking - Reservation`, `Payment #`, `Scheduled Date`, `Rent`, `Maintenance Fee`, `Total Paid by Guest`, `Total Paid to Host` |
| `bookings_stays` | Weekly stay records | `_id`, `Lease`, `Week Number`, `Guest`, `Host`, `listing`, `Dates - List of dates in this period` |
| `listing` | Property info | `House manual`, `users with permission`, listing details |
| `user` | User records | `_id`, `email`, notification preferences |
| `magic_link_audit` | Magic link tracking | `user_id`, `destination_page`, `attached_data`, `link_generated_at` |

### Existing Edge Functions to Reference

| Function | Relevance |
|----------|-----------|
| `supabase/functions/proposal/index.ts` | Action-based routing pattern, authentication |
| `supabase/functions/guest-payment-records/` | Guest payment record generation logic |
| `supabase/functions/host-payment-records/` | Host payment record generation logic |
| `supabase/functions/send-email/` | Email notification infrastructure |
| `supabase/functions/send-sms/` | SMS notification infrastructure |
| `supabase/functions/messages/` | In-app messaging, thread creation |
| `supabase/functions/auth-user/handlers/generateMagicLink.ts` | Magic link generation |
| `supabase/functions/_shared/queueSync.ts` | Bubble sync queue utilities |

### Existing Patterns to Follow

1. **Action-Based Routing**: `{ action, payload }` request format
2. **Dynamic Handler Loading**: Lazy imports for handlers to reduce cold start
3. **Authentication Pattern**: JWT token validation with user lookup
4. **Queue-Based Sync**: Use `enqueueBubbleSync()` for Bubble sync operations
5. **Error Collection**: Use `createErrorLog()` and `reportErrorLog()` for Slack reporting
6. **FP Architecture**: Pure functions, Result types where applicable

### Frontend Integration Points

| File | Integration |
|------|-------------|
| `app/src/islands/modals/useCompareTermsModalLogic.js` | Currently has TODO for CORE-create-lease (Step 7) |
| `app/src/logic/workflows/proposals/counterofferWorkflow.js` | `acceptCounteroffer()` needs to trigger lease creation |
| `app/src/islands/pages/proposals/` | Guest proposals page acceptance flow |

---

## Implementation Steps

### Step 1: Create Edge Function Directory Structure

**Files to Create:**
```
supabase/functions/lease/
├── index.ts                    # Main router
├── deno.json                   # Import map
├── handlers/
│   └── create.ts               # Main create lease handler
├── lib/
│   ├── types.ts                # TypeScript interfaces
│   ├── validators.ts           # Input validation
│   ├── calculations.ts         # Move-out date, 4-week rent calculations
│   ├── agreementNumber.ts      # Agreement number generation
│   └── staysGenerator.ts       # Weekly stays creation
```

**Purpose:** Establish the function structure following the established patterns.

**Validation:** Directory structure matches other Edge Functions like `proposal/` and `guest-payment-records/`.

---

### Step 2: Create Type Definitions

**File:** `supabase/functions/lease/lib/types.ts`

**Details:**

```typescript
export interface CreateLeasePayload {
  proposalId: string;
  isCounteroffer: boolean;          // "yes" or "no" from Bubble, convert to boolean
  fourWeekRent: number;             // Calculated from counteroffer terms
  fourWeekCompensation: number;     // Calculated from original proposal terms
  numberOfZeros?: number;           // For agreement number formatting
}

export interface LeaseData {
  _id: string;
  'Agreement Number': string;
  Proposal: string;
  Guest: string;
  Host: string;
  Listing: string;
  Participants: string[];
  'Cancellation Policy': string;
  'First Payment Date': string;
  'Move In Date': string;
  'Move-out': string;
  'Total Compensation': number;
  'Total Rent': number;
  'rental type': string;
  'List of Stays': string[];
  'Payment Records Guest-SL': string[];
  'Payment Records SL-Hosts': string[];
  'Lease Status': string;
  'Lease signed?': boolean;
  'were documents generated?': boolean;
  Thread: string | null;
}

export interface ProposalData {
  _id: string;
  Guest: string;
  'Host User': string;
  Listing: string;
  Status: string;
  'rental type': string;
  'Move in range start': string;
  'Move in range end': string;
  'Reservation Span (Weeks)': number;
  'duration in months': number;
  'nights per week (num)': number;
  'proposal nightly price': number;
  'damage deposit': number;
  'cleaning fee': number;
  'maintenance fee': number;
  'counter offer happened': boolean;
  // HC (Historical Copy) fields for counteroffers
  'hc move in date': string;
  'hc reservation span (weeks)': number;
  'hc nights per week': number;
  'hc nightly price': number;
  'hc 4 week rent': number;
  'hc 4 week compensation': number;
  'hc damage deposit': number;
  'hc cleaning fee': number;
  'hc maintenance fee': number;
  // Computed fields
  '4 week rent': number;
  '4 week compensation': number;
}

export interface StayData {
  _id: string;
  Lease: string;
  'Week Number': number;
  Guest: string;
  Host: string;
  listing: string;
  'Dates - List of dates in this period': string[];
  'Check In (night)': string;
  'Last Night (night)': string;
  'Stay Status': string;
}

export interface CreateLeaseResponse {
  leaseId: string;
  agreementNumber: string;
  staysCreated: number;
  guestPaymentRecordsCreated: number;
  hostPaymentRecordsCreated: number;
  magicLinks: {
    host: string;
    guest: string;
  };
}

export interface UserContext {
  id: string;
  email: string;
}
```

**Validation:** Types compile without errors; cover all fields from database schema queries.

---

### Step 3: Create Validators

**File:** `supabase/functions/lease/lib/validators.ts`

**Details:**

```typescript
import { ValidationError } from '../../_shared/errors.ts';

export function validateCreateLeasePayload(payload: Record<string, unknown>): void {
  if (!payload.proposalId || typeof payload.proposalId !== 'string') {
    throw new ValidationError('proposalId is required and must be a string');
  }

  if (payload.isCounteroffer === undefined) {
    throw new ValidationError('isCounteroffer is required');
  }

  if (typeof payload.fourWeekRent !== 'number' || payload.fourWeekRent < 0) {
    throw new ValidationError('fourWeekRent must be a non-negative number');
  }

  if (typeof payload.fourWeekCompensation !== 'number' || payload.fourWeekCompensation < 0) {
    throw new ValidationError('fourWeekCompensation must be a non-negative number');
  }
}
```

**Validation:** Validators throw clear errors for invalid inputs.

---

### Step 4: Create Calculation Utilities

**File:** `supabase/functions/lease/lib/calculations.ts`

**Details:**

```typescript
import { addWeeks, addDays, format } from 'https://esm.sh/date-fns@3';

/**
 * Calculate move-out date based on move-in and reservation span
 * Move-out = Move-in + (reservation weeks * 7 days) - 1 day
 */
export function calculateMoveOutDate(
  moveInDate: string | Date,
  reservationWeeks: number
): string {
  const moveIn = typeof moveInDate === 'string' ? new Date(moveInDate) : moveInDate;
  const totalDays = reservationWeeks * 7;
  const moveOut = addDays(moveIn, totalDays - 1);
  return moveOut.toISOString();
}

/**
 * Calculate first payment date (move-in + 2 days for host)
 * Guest first payment is 3 days BEFORE move-in (handled in guest-payment-records)
 */
export function calculateFirstPaymentDate(moveInDate: string | Date): string {
  const moveIn = typeof moveInDate === 'string' ? new Date(moveInDate) : moveInDate;
  const firstPayment = addDays(moveIn, 2);
  return firstPayment.toISOString();
}

/**
 * Calculate 4-week rent from nightly price and nights per week
 * 4-week rent = nightly price * nights per week * 4
 */
export function calculateFourWeekRent(
  nightlyPrice: number,
  nightsPerWeek: number
): number {
  return nightlyPrice * nightsPerWeek * 4;
}

/**
 * Determine which terms to use based on counteroffer status
 * If counteroffer: use HC (Historical Copy) fields
 * If no counteroffer: use original proposal fields
 */
export function getActiveTerms(proposal: Record<string, unknown>, isCounteroffer: boolean) {
  if (isCounteroffer) {
    return {
      moveInDate: proposal['hc move in date'] as string,
      reservationWeeks: proposal['hc reservation span (weeks)'] as number,
      nightsPerWeek: proposal['hc nights per week'] as number,
      nightlyPrice: proposal['hc nightly price'] as number,
      fourWeekRent: proposal['hc 4 week rent'] as number,
      damageDeposit: proposal['hc damage deposit'] as number,
      cleaningFee: proposal['hc cleaning fee'] as number,
      maintenanceFee: proposal['hc maintenance fee'] as number,
    };
  } else {
    return {
      moveInDate: proposal['Move in range start'] as string,
      reservationWeeks: proposal['Reservation Span (Weeks)'] as number,
      nightsPerWeek: proposal['nights per week (num)'] as number,
      nightlyPrice: proposal['proposal nightly price'] as number,
      fourWeekRent: proposal['4 week rent'] as number,
      damageDeposit: proposal['damage deposit'] as number,
      cleaningFee: proposal['cleaning fee'] as number,
      maintenanceFee: proposal['maintenance fee'] as number,
    };
  }
}
```

**Validation:** Unit test each calculation function with known inputs/outputs.

---

### Step 5: Create Agreement Number Generator

**File:** `supabase/functions/lease/lib/agreementNumber.ts`

**Details:**

```typescript
/**
 * Generate agreement number in format: SL-XXXXX
 * Where XXXXX is zero-padded based on lease count
 *
 * From Bubble: numberOfZeros = count < 10 ? 4 : count < 100 ? 3 : 2
 */
export function generateAgreementNumber(
  leaseCount: number,
  numberOfZeros?: number
): string {
  const zeros = numberOfZeros ?? (leaseCount < 10 ? 4 : leaseCount < 100 ? 3 : 2);
  const padded = String(leaseCount + 1).padStart(zeros + 1, '0');
  return `SL-${padded}`;
}
```

**Validation:**
- `generateAgreementNumber(0)` -> `"SL-00001"`
- `generateAgreementNumber(9)` -> `"SL-00010"`
- `generateAgreementNumber(99)` -> `"SL-0100"`

---

### Step 6: Create Stays Generator

**File:** `supabase/functions/lease/lib/staysGenerator.ts`

**Details:**

```typescript
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { addDays, addWeeks, eachDayOfInterval, format } from 'https://esm.sh/date-fns@3';
import type { StayData } from './types.ts';

/**
 * Generate weekly stay records for a lease
 * Each stay represents one week of the reservation
 */
export async function generateStays(
  supabase: SupabaseClient,
  leaseId: string,
  guestId: string,
  hostId: string,
  listingId: string,
  moveInDate: string,
  reservationWeeks: number,
  daysSelected: number[]  // 0-indexed (Sunday=0)
): Promise<string[]> {
  const stayIds: string[] = [];
  const now = new Date().toISOString();
  const moveIn = new Date(moveInDate);

  for (let week = 0; week < reservationWeeks; week++) {
    // Generate bubble-compatible ID
    const { data: stayId, error: idError } = await supabase.rpc('generate_bubble_id');
    if (idError || !stayId) {
      throw new Error(`Failed to generate stay ID: ${idError?.message}`);
    }

    // Calculate dates for this week
    const weekStart = addWeeks(moveIn, week);
    const weekEnd = addDays(weekStart, 6);

    // Get all dates in this week that match selected days
    const allDates = eachDayOfInterval({ start: weekStart, end: weekEnd });
    const selectedDates = allDates
      .filter(date => daysSelected.includes(date.getDay()))
      .map(date => date.toISOString());

    // Determine check-in and last night
    const checkInNight = selectedDates.length > 0 ? selectedDates[0] : weekStart.toISOString();
    const lastNight = selectedDates.length > 0
      ? selectedDates[selectedDates.length - 1]
      : weekEnd.toISOString();

    const stayRecord: StayData = {
      _id: stayId,
      Lease: leaseId,
      'Week Number': week + 1,  // 1-indexed
      Guest: guestId,
      Host: hostId,
      listing: listingId,
      'Dates - List of dates in this period': selectedDates,
      'Check In (night)': checkInNight,
      'Last Night (night)': lastNight,
      'Stay Status': 'Upcoming',
      'Created Date': now,
      'Modified Date': now,
    };

    const { error: insertError } = await supabase
      .from('bookings_stays')
      .insert(stayRecord);

    if (insertError) {
      throw new Error(`Failed to create stay ${week + 1}: ${insertError.message}`);
    }

    stayIds.push(stayId);
  }

  return stayIds;
}
```

**Validation:** Creates correct number of stays; date calculations are accurate.

---

### Step 7: Create Main Handler (Phase 1-2: Proposal Update & Lease Creation)

**File:** `supabase/functions/lease/handlers/create.ts`

**Details:**

```typescript
/**
 * Create Lease Handler
 *
 * Implements the complete CORE-create-lease workflow from Bubble:
 *
 * Phase 1: Proposal Status Update
 *   - Update status to "Proposal or Counteroffer Accepted / Drafting Lease Documents"
 *   - Save HC values (when NOT a counteroffer - copy original to HC)
 *   - Calculate move-out and 4-week rent
 *
 * Phase 2: Lease Creation
 *   - Create lease record
 *   - Set participants, cancellation policy, compensation
 *   - Calculate first payment date
 *
 * Phase 3: Auxiliary Setups (reservation dates, permissions, magic links)
 * Phase 4: Multi-Channel Communications (email, SMS, in-app)
 * Phase 5: User Association
 * Phase 6: Payment Records (via existing Edge Functions)
 * Phase 7: Additional Setups (agreement number, stays, house manual, reminders)
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SupabaseSyncError, ValidationError } from '../../_shared/errors.ts';
import { enqueueBubbleSync, triggerQueueProcessing } from '../../_shared/queueSync.ts';
import { validateCreateLeasePayload } from '../lib/validators.ts';
import {
  calculateMoveOutDate,
  calculateFirstPaymentDate,
  getActiveTerms
} from '../lib/calculations.ts';
import { generateAgreementNumber } from '../lib/agreementNumber.ts';
import { generateStays } from '../lib/staysGenerator.ts';
import type { CreateLeasePayload, CreateLeaseResponse, ProposalData, LeaseData } from '../lib/types.ts';

// Import sub-function handlers
import { triggerGuestPaymentRecords, triggerHostPaymentRecords } from './paymentRecords.ts';
import { sendLeaseNotifications } from './notifications.ts';
import { generateMagicLinks } from './magicLinks.ts';
import { grantListingPermission } from './permissions.ts';

export async function handleCreate(
  payload: Record<string, unknown>,
  user: { id: string; email: string } | null,
  supabase: SupabaseClient
): Promise<CreateLeaseResponse> {
  console.log('[lease:create] ========== CREATE LEASE ==========');

  // Validate input
  validateCreateLeasePayload(payload);

  const input: CreateLeasePayload = {
    proposalId: payload.proposalId as string,
    isCounteroffer: payload.isCounteroffer === 'yes' || payload.isCounteroffer === true,
    fourWeekRent: payload.fourWeekRent as number,
    fourWeekCompensation: payload.fourWeekCompensation as number,
    numberOfZeros: payload.numberOfZeros as number | undefined,
  };

  console.log('[lease:create] Input:', JSON.stringify(input, null, 2));

  // ═══════════════════════════════════════════════════════════════
  // PHASE 1: PROPOSAL STATUS UPDATE
  // ═══════════════════════════════════════════════════════════════

  console.log('[lease:create] Phase 1: Updating proposal status...');

  // Fetch proposal with all needed fields
  const { data: proposal, error: proposalError } = await supabase
    .from('proposal')
    .select(`
      *,
      listing:Listing (
        _id,
        Name,
        "House manual",
        "users with permission",
        "cancellation policy"
      )
    `)
    .eq('_id', input.proposalId)
    .single();

  if (proposalError || !proposal) {
    throw new SupabaseSyncError(`Failed to fetch proposal: ${proposalError?.message}`);
  }

  const proposalData = proposal as ProposalData;
  const now = new Date().toISOString();

  // Get active terms (HC if counteroffer, original if not)
  const activeTerms = getActiveTerms(proposalData, input.isCounteroffer);

  // Calculate move-out date
  const moveOutDate = calculateMoveOutDate(activeTerms.moveInDate, activeTerms.reservationWeeks);

  // Build proposal update
  const proposalUpdate: Record<string, unknown> = {
    'Status': 'Proposal or Counteroffer Accepted / Drafting Lease Documents',
    'Modified Date': now,
    'Is Finalized': true,
  };

  // If NOT a counteroffer, copy original values to HC fields
  if (!input.isCounteroffer) {
    proposalUpdate['hc move in date'] = proposalData['Move in range start'];
    proposalUpdate['hc reservation span (weeks)'] = proposalData['Reservation Span (Weeks)'];
    proposalUpdate['hc nights per week'] = proposalData['nights per week (num)'];
    proposalUpdate['hc nightly price'] = proposalData['proposal nightly price'];
    proposalUpdate['hc 4 week rent'] = input.fourWeekRent;
    proposalUpdate['hc 4 week compensation'] = input.fourWeekCompensation;
    proposalUpdate['hc damage deposit'] = proposalData['damage deposit'];
    proposalUpdate['hc cleaning fee'] = proposalData['cleaning fee'];
    proposalUpdate['hc maintenance fee'] = proposalData['maintenance fee'];
  }

  // Update proposal
  const { error: proposalUpdateError } = await supabase
    .from('proposal')
    .update(proposalUpdate)
    .eq('_id', input.proposalId);

  if (proposalUpdateError) {
    throw new SupabaseSyncError(`Failed to update proposal: ${proposalUpdateError.message}`);
  }

  console.log('[lease:create] Phase 1 complete: Proposal updated');

  // ═══════════════════════════════════════════════════════════════
  // PHASE 2: LEASE CREATION
  // ═══════════════════════════════════════════════════════════════

  console.log('[lease:create] Phase 2: Creating lease record...');

  // Generate lease ID
  const { data: leaseId, error: leaseIdError } = await supabase.rpc('generate_bubble_id');
  if (leaseIdError || !leaseId) {
    throw new SupabaseSyncError('Failed to generate lease ID');
  }

  // Count existing leases for agreement number
  const { count: leaseCount, error: countError } = await supabase
    .from('bookings_leases')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.warn('[lease:create] Could not count leases:', countError.message);
  }

  const agreementNumber = generateAgreementNumber(leaseCount || 0, input.numberOfZeros);
  const firstPaymentDate = calculateFirstPaymentDate(activeTerms.moveInDate);

  // Build lease record
  const leaseRecord: Partial<LeaseData> = {
    _id: leaseId,
    'Agreement Number': agreementNumber,
    Proposal: input.proposalId,
    Guest: proposalData.Guest,
    Host: proposalData['Host User'],
    Listing: proposalData.Listing,
    Participants: [proposalData.Guest, proposalData['Host User']],
    'Cancellation Policy': proposal.listing?.['cancellation policy'] || 'Standard',
    'First Payment Date': firstPaymentDate,
    'Move In Date': activeTerms.moveInDate,
    'Move-out': moveOutDate,
    'Total Compensation': input.fourWeekCompensation * (activeTerms.reservationWeeks / 4),
    'Total Rent': input.fourWeekRent * (activeTerms.reservationWeeks / 4),
    'rental type': proposalData['rental type'],
    'Lease Status': 'Drafting',
    'Lease signed?': false,
    'were documents generated?': false,
    'Created Date': now,
    'Modified Date': now,
  };

  // Insert lease
  const { error: leaseInsertError } = await supabase
    .from('bookings_leases')
    .insert(leaseRecord);

  if (leaseInsertError) {
    throw new SupabaseSyncError(`Failed to create lease: ${leaseInsertError.message}`);
  }

  console.log('[lease:create] Phase 2 complete: Lease created:', leaseId);

  // ═══════════════════════════════════════════════════════════════
  // PHASE 3: AUXILIARY SETUPS
  // ═══════════════════════════════════════════════════════════════

  console.log('[lease:create] Phase 3: Auxiliary setups...');

  // 3a: Grant guest permission to view listing address
  await grantListingPermission(supabase, proposalData.Listing, proposalData.Guest);

  // 3b: Generate magic links for host and guest
  const magicLinks = await generateMagicLinks(
    supabase,
    proposalData.Guest,
    proposalData['Host User'],
    leaseId
  );

  console.log('[lease:create] Phase 3 complete');

  // ═══════════════════════════════════════════════════════════════
  // PHASE 4: MULTI-CHANNEL COMMUNICATIONS
  // ═══════════════════════════════════════════════════════════════

  console.log('[lease:create] Phase 4: Sending notifications...');

  await sendLeaseNotifications(
    supabase,
    proposalData.Guest,
    proposalData['Host User'],
    leaseId,
    agreementNumber,
    magicLinks
  );

  console.log('[lease:create] Phase 4 complete');

  // ═══════════════════════════════════════════════════════════════
  // PHASE 5: USER ASSOCIATION
  // ═══════════════════════════════════════════════════════════════

  console.log('[lease:create] Phase 5: User associations...');

  // Add lease to guest's lease list
  await addLeaseToUser(supabase, proposalData.Guest, leaseId, 'guest');

  // Add lease to host's lease list
  await addLeaseToUser(supabase, proposalData['Host User'], leaseId, 'host');

  console.log('[lease:create] Phase 5 complete');

  // ═══════════════════════════════════════════════════════════════
  // PHASE 6: PAYMENT RECORDS
  // ═══════════════════════════════════════════════════════════════

  console.log('[lease:create] Phase 6: Creating payment records...');

  // Trigger EXISTING Edge Functions for payment record creation
  // These functions handle all the calculation logic internally

  // Build payment payload from proposal data
  const paymentPayload = {
    leaseId,
    rentalType: proposalData['rental type'],  // "Monthly" | "Weekly" | "Nightly"
    moveInDate: activeTerms.moveInDate,
    reservationSpanWeeks: activeTerms.reservationWeeks,
    reservationSpanMonths: proposalData['hc duration in months'] || proposalData['duration in months'],
    weekPattern: proposalData['hc weeks schedule']?.Display || proposalData['week selection']?.Display || 'Every week',
    fourWeekRent: activeTerms.fourWeekRent,
    rentPerMonth: proposalData['hc host compensation (per period)'] || proposalData['host compensation'],
    maintenanceFee: activeTerms.maintenanceFee,
    damageDeposit: activeTerms.damageDeposit,
  };

  // Call guest-payment-records Edge Function
  const guestPaymentResult = await triggerGuestPaymentRecords(paymentPayload);

  // Call host-payment-records Edge Function
  const hostPaymentResult = await triggerHostPaymentRecords(paymentPayload);

  console.log('[lease:create] Phase 6 complete');

  // ═══════════════════════════════════════════════════════════════
  // PHASE 7: ADDITIONAL SETUPS
  // ═══════════════════════════════════════════════════════════════

  console.log('[lease:create] Phase 7: Additional setups...');

  // 7a: Create list of stays
  const stayIds = await generateStays(
    supabase,
    leaseId,
    proposalData.Guest,
    proposalData['Host User'],
    proposalData.Listing,
    activeTerms.moveInDate,
    activeTerms.reservationWeeks,
    proposalData['Days Selected'] || []
  );

  // Update lease with stay IDs
  await supabase
    .from('bookings_leases')
    .update({ 'List of Stays': stayIds })
    .eq('_id', leaseId);

  // 7b: Link house manual if applicable
  if (proposal.listing?.['House manual']) {
    await supabase
      .from('bookings_leases')
      .update({ 'House Manual': proposal.listing['House manual'] })
      .eq('_id', leaseId);
  }

  // 7c: TODO - Schedule checkout reminders (would need a scheduled task system)

  console.log('[lease:create] Phase 7 complete');

  // ═══════════════════════════════════════════════════════════════
  // BUBBLE SYNC (Non-blocking)
  // ═══════════════════════════════════════════════════════════════

  console.log('[lease:create] Enqueueing Bubble sync...');

  try {
    await enqueueBubbleSync(supabase, {
      correlationId: `lease:${leaseId}`,
      items: [
        {
          sequence: 1,
          table: 'bookings_leases',
          recordId: leaseId,
          operation: 'INSERT',
          payload: leaseRecord,
        },
        {
          sequence: 2,
          table: 'proposal',
          recordId: input.proposalId,
          operation: 'UPDATE',
          payload: proposalUpdate,
        },
      ],
    });

    triggerQueueProcessing();
    console.log('[lease:create] Bubble sync enqueued');
  } catch (syncError) {
    console.warn('[lease:create] Bubble sync failed (non-blocking):', syncError);
  }

  // ═══════════════════════════════════════════════════════════════
  // RESPONSE
  // ═══════════════════════════════════════════════════════════════

  console.log('[lease:create] ========== COMPLETE ==========');

  return {
    leaseId,
    agreementNumber,
    staysCreated: stayIds.length,
    guestPaymentRecordsCreated: guestPaymentResult.recordCount,
    hostPaymentRecordsCreated: hostPaymentResult.recordCount,
    magicLinks,
  };
}

/**
 * Add lease to user's lease list
 */
async function addLeaseToUser(
  supabase: SupabaseClient,
  userId: string,
  leaseId: string,
  role: 'guest' | 'host'
): Promise<void> {
  const columnName = role === 'guest' ? 'Leases as Guest' : 'Leases as Host';

  // Fetch current leases
  const { data: user, error: fetchError } = await supabase
    .from('user')
    .select(columnName)
    .eq('_id', userId)
    .single();

  if (fetchError) {
    console.warn(`[lease:create] Could not fetch user ${userId}:`, fetchError.message);
    return;
  }

  const currentLeases = user?.[columnName] || [];
  const updatedLeases = [...currentLeases, leaseId];

  const { error: updateError } = await supabase
    .from('user')
    .update({ [columnName]: updatedLeases })
    .eq('_id', userId);

  if (updateError) {
    console.warn(`[lease:create] Could not update user ${userId}:`, updateError.message);
  }
}
```

**Validation:**
- Lease created with all required fields
- Proposal status updated correctly
- All phases execute in order

---

### Step 8: Create Notifications Handler

**File:** `supabase/functions/lease/handlers/notifications.ts`

**Details:**

```typescript
/**
 * Send lease creation notifications via multiple channels
 * Respects user notification preferences
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface UserNotificationPrefs {
  email_notifications: boolean;
  sms_notifications: boolean;
  phone_number?: string;
}

export async function sendLeaseNotifications(
  supabase: SupabaseClient,
  guestId: string,
  hostId: string,
  leaseId: string,
  agreementNumber: string,
  magicLinks: { host: string; guest: string }
): Promise<void> {
  // Fetch user preferences
  const { data: users } = await supabase
    .from('user')
    .select('_id, email, "First Name", "notification preferences", "Cell phone number"')
    .in('_id', [guestId, hostId]);

  const guest = users?.find(u => u._id === guestId);
  const host = users?.find(u => u._id === hostId);

  if (!guest || !host) {
    console.warn('[lease:notifications] Could not fetch user data');
    return;
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  // ─────────────────────────────────────────────────────────
  // EMAIL NOTIFICATIONS
  // ─────────────────────────────────────────────────────────

  // Email to Guest
  if (guest.email && shouldSendEmail(guest['notification preferences'])) {
    await sendEmail(supabaseUrl, serviceRoleKey, {
      template_id: 'LEASE_CREATED_GUEST_TEMPLATE_ID',  // TODO: Get actual template ID
      to_email: guest.email,
      to_name: guest['First Name'],
      variables: {
        guest_name: guest['First Name'] || 'Guest',
        agreement_number: agreementNumber,
        magic_link: magicLinks.guest,
      },
    });
  }

  // Email to Host
  if (host.email && shouldSendEmail(host['notification preferences'])) {
    await sendEmail(supabaseUrl, serviceRoleKey, {
      template_id: 'LEASE_CREATED_HOST_TEMPLATE_ID',  // TODO: Get actual template ID
      to_email: host.email,
      to_name: host['First Name'],
      variables: {
        host_name: host['First Name'] || 'Host',
        guest_name: guest['First Name'] || 'Guest',
        agreement_number: agreementNumber,
        magic_link: magicLinks.host,
      },
    });
  }

  // ─────────────────────────────────────────────────────────
  // SMS NOTIFICATIONS
  // ─────────────────────────────────────────────────────────

  // SMS to Guest
  if (guest['Cell phone number'] && shouldSendSms(guest['notification preferences'])) {
    await sendSms(supabaseUrl, serviceRoleKey, {
      to: guest['Cell phone number'],
      body: `Split Lease: Your lease (${agreementNumber}) is being drafted! Check your email for details.`,
    });
  }

  // SMS to Host
  if (host['Cell phone number'] && shouldSendSms(host['notification preferences'])) {
    await sendSms(supabaseUrl, serviceRoleKey, {
      to: host['Cell phone number'],
      body: `Split Lease: A lease (${agreementNumber}) with ${guest['First Name'] || 'a guest'} is being drafted!`,
    });
  }

  // ─────────────────────────────────────────────────────────
  // IN-APP NOTIFICATIONS
  // ─────────────────────────────────────────────────────────

  await sendInAppMessage(supabaseUrl, serviceRoleKey, {
    guestId,
    hostId,
    leaseId,
    agreementNumber,
  });
}

function shouldSendEmail(prefs: unknown): boolean {
  if (!prefs || typeof prefs !== 'object') return true;  // Default to yes
  return (prefs as UserNotificationPrefs).email_notifications !== false;
}

function shouldSendSms(prefs: unknown): boolean {
  if (!prefs || typeof prefs !== 'object') return false;  // Default to no
  return (prefs as UserNotificationPrefs).sms_notifications === true;
}

async function sendEmail(
  supabaseUrl: string,
  serviceRoleKey: string,
  payload: { template_id: string; to_email: string; to_name?: string; variables: Record<string, string> }
): Promise<void> {
  try {
    await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'send',
        payload,
      }),
    });
  } catch (err) {
    console.warn('[lease:notifications] Email send failed (non-blocking):', err);
  }
}

async function sendSms(
  supabaseUrl: string,
  serviceRoleKey: string,
  payload: { to: string; body: string }
): Promise<void> {
  try {
    await fetch(`${supabaseUrl}/functions/v1/send-sms`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'send',
        payload: {
          to: payload.to,
          from: '+14155692985',  // Split Lease Twilio number
          body: payload.body,
        },
      }),
    });
  } catch (err) {
    console.warn('[lease:notifications] SMS send failed (non-blocking):', err);
  }
}

async function sendInAppMessage(
  supabaseUrl: string,
  serviceRoleKey: string,
  payload: { guestId: string; hostId: string; leaseId: string; agreementNumber: string }
): Promise<void> {
  try {
    await fetch(`${supabaseUrl}/functions/v1/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'create_proposal_thread',
        payload: {
          proposalId: payload.leaseId,  // Using lease ID for thread context
          guestId: payload.guestId,
          hostId: payload.hostId,
          listingId: '',  // Will be looked up from lease
          proposalStatus: 'Lease Drafting',
          customMessageBody: `Your lease (${payload.agreementNumber}) is being drafted! We will notify you when the documents are ready for review.`,
        },
      }),
    });
  } catch (err) {
    console.warn('[lease:notifications] In-app message failed (non-blocking):', err);
  }
}
```

**Validation:** Notifications sent to correct channels based on user preferences.

---

### Step 9: Create Magic Links Handler

**File:** `supabase/functions/lease/handlers/magicLinks.ts`

**Details:**

```typescript
/**
 * Generate magic login links for host and guest
 * Uses Supabase Auth admin.generateLink()
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export async function generateMagicLinks(
  supabase: SupabaseClient,
  guestId: string,
  hostId: string,
  leaseId: string
): Promise<{ host: string; guest: string }> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  // Fetch user emails
  const { data: users } = await supabase
    .from('user')
    .select('_id, email')
    .in('_id', [guestId, hostId]);

  const guest = users?.find(u => u._id === guestId);
  const host = users?.find(u => u._id === hostId);

  let guestLink = '';
  let hostLink = '';

  // Generate guest magic link
  if (guest?.email) {
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/auth-user`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'generate_magic_link',
          payload: {
            email: guest.email,
            redirectTo: `/guest-proposals/${guestId}?lease=${leaseId}`,
          },
        }),
      });

      const result = await response.json();
      if (result.success && result.data?.action_link) {
        guestLink = result.data.action_link;

        // Audit the magic link
        await auditMagicLink(supabase, guestId, 'guest-proposals', { leaseId });
      }
    } catch (err) {
      console.warn('[lease:magicLinks] Guest link generation failed:', err);
    }
  }

  // Generate host magic link
  if (host?.email) {
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/auth-user`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'generate_magic_link',
          payload: {
            email: host.email,
            redirectTo: `/host-proposals/${hostId}?lease=${leaseId}`,
          },
        }),
      });

      const result = await response.json();
      if (result.success && result.data?.action_link) {
        hostLink = result.data.action_link;

        // Audit the magic link
        await auditMagicLink(supabase, hostId, 'host-proposals', { leaseId });
      }
    } catch (err) {
      console.warn('[lease:magicLinks] Host link generation failed:', err);
    }
  }

  return {
    host: hostLink,
    guest: guestLink,
  };
}

async function auditMagicLink(
  supabase: SupabaseClient,
  userId: string,
  destinationPage: string,
  attachedData: Record<string, unknown>
): Promise<void> {
  try {
    await supabase
      .from('magic_link_audit')
      .insert({
        user_id: userId,
        destination_page: destinationPage,
        attached_data: attachedData,
        link_generated_at: new Date().toISOString(),
        created_by: 'lease-edge-function',
        sent_via: 'email',
      });
  } catch (err) {
    console.warn('[lease:magicLinks] Audit insert failed:', err);
  }
}
```

**Validation:** Magic links generated and audited correctly.

---

### Step 10: Create Payment Records Handler (Edge Function Integration)

**File:** `supabase/functions/lease/handlers/paymentRecords.ts`

**Details:**

```typescript
/**
 * Payment Records Handler
 *
 * Triggers the EXISTING guest-payment-records and host-payment-records
 * Edge Functions to create payment schedules for the lease.
 *
 * IMPORTANT: This does NOT duplicate the payment calculation logic.
 * Instead, it calls the existing Edge Functions via HTTP.
 *
 * Existing Edge Functions:
 * - guest-payment-records: Creates guest payment records (first payment 3 days BEFORE move-in)
 * - host-payment-records: Creates host payment records (first payment 2 days AFTER move-in)
 */

interface PaymentPayload {
  leaseId: string;
  rentalType: string;        // "Monthly" | "Weekly" | "Nightly"
  moveInDate: string;        // ISO date string
  reservationSpanWeeks?: number;
  reservationSpanMonths?: number;
  weekPattern: string;       // "Every week" | "One week on, one week off" | etc.
  fourWeekRent?: number;     // For Weekly/Nightly
  rentPerMonth?: number;     // For Monthly
  maintenanceFee: number;
  damageDeposit?: number;
}

interface PaymentResult {
  success: boolean;
  recordCount: number;
  totalAmount: number;
  error?: string;
}

/**
 * Trigger the guest-payment-records Edge Function
 *
 * KEY BUSINESS RULES (from Bubble workflow):
 * - First payment: 3 days BEFORE move-in date
 * - Payment interval: 28 days (4-week cycles)
 * - Damage deposit: Added to FIRST payment only
 * - Total Rent: Sum of all payments MINUS damage deposit (it's refundable)
 */
export async function triggerGuestPaymentRecords(
  payload: PaymentPayload
): Promise<PaymentResult> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  console.log('[lease:paymentRecords] Triggering guest-payment-records...');
  console.log('[lease:paymentRecords] Payload:', JSON.stringify(payload, null, 2));

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/guest-payment-records`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'generate',
        payload: {
          leaseId: payload.leaseId,
          rentalType: payload.rentalType,
          moveInDate: payload.moveInDate,
          reservationSpanWeeks: payload.reservationSpanWeeks,
          reservationSpanMonths: payload.reservationSpanMonths,
          weekPattern: payload.weekPattern,
          fourWeekRent: payload.fourWeekRent,
          rentPerMonth: payload.rentPerMonth,
          maintenanceFee: payload.maintenanceFee,
          damageDeposit: payload.damageDeposit,
        },
      }),
    });

    const result = await response.json();

    if (!result.success) {
      console.error('[lease:paymentRecords] Guest payment records failed:', result.error);
      return {
        success: false,
        recordCount: 0,
        totalAmount: 0,
        error: result.error,
      };
    }

    console.log('[lease:paymentRecords] Guest payment records created:', result.data);

    return {
      success: true,
      recordCount: result.data?.recordCount || 0,
      totalAmount: result.data?.totalRent || 0,
    };

  } catch (error) {
    console.error('[lease:paymentRecords] Guest payment records exception:', error);
    return {
      success: false,
      recordCount: 0,
      totalAmount: 0,
      error: (error as Error).message,
    };
  }
}

/**
 * Trigger the host-payment-records Edge Function
 *
 * KEY BUSINESS RULES (from Bubble workflow):
 * - First payment: 2 days AFTER move-in date
 * - Payment interval: 28 days for Weekly/Nightly, 31 days for Monthly
 * - Maintenance fee: Added to each payment
 * - Week pattern: Affects proration for partial cycles
 * - Total Compensation: Sum of all host payments
 */
export async function triggerHostPaymentRecords(
  payload: PaymentPayload
): Promise<PaymentResult> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  console.log('[lease:paymentRecords] Triggering host-payment-records...');
  console.log('[lease:paymentRecords] Payload:', JSON.stringify(payload, null, 2));

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/host-payment-records`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'generate',
        payload: {
          leaseId: payload.leaseId,
          rentalType: payload.rentalType,
          moveInDate: payload.moveInDate,
          reservationSpanWeeks: payload.reservationSpanWeeks,
          reservationSpanMonths: payload.reservationSpanMonths,
          weekPattern: payload.weekPattern,
          fourWeekRent: payload.fourWeekRent,
          rentPerMonth: payload.rentPerMonth,
          maintenanceFee: payload.maintenanceFee,
          // Note: damageDeposit NOT passed to host - it's guest-only
        },
      }),
    });

    const result = await response.json();

    if (!result.success) {
      console.error('[lease:paymentRecords] Host payment records failed:', result.error);
      return {
        success: false,
        recordCount: 0,
        totalAmount: 0,
        error: result.error,
      };
    }

    console.log('[lease:paymentRecords] Host payment records created:', result.data);

    return {
      success: true,
      recordCount: result.data?.recordCount || 0,
      totalAmount: result.data?.totalCompensation || 0,
    };

  } catch (error) {
    console.error('[lease:paymentRecords] Host payment records exception:', error);
    return {
      success: false,
      recordCount: 0,
      totalAmount: 0,
      error: (error as Error).message,
    };
  }
}
```

**Validation:**
- Successfully calls existing `guest-payment-records` Edge Function
- Successfully calls existing `host-payment-records` Edge Function
- Handles errors gracefully (non-blocking)
- Returns record counts and totals for response

---

### Step 11: Create Permissions Handler

**File:** `supabase/functions/lease/handlers/permissions.ts`

**Details:**

```typescript
/**
 * Grant listing address permission to guest
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export async function grantListingPermission(
  supabase: SupabaseClient,
  listingId: string,
  guestId: string
): Promise<void> {
  // Fetch current permissions
  const { data: listing, error: fetchError } = await supabase
    .from('listing')
    .select('"users with permission"')
    .eq('_id', listingId)
    .single();

  if (fetchError) {
    console.warn('[lease:permissions] Could not fetch listing:', fetchError.message);
    return;
  }

  const currentPermissions = listing?.['users with permission'] || [];

  // Check if guest already has permission
  if (currentPermissions.includes(guestId)) {
    console.log('[lease:permissions] Guest already has permission');
    return;
  }

  // Add guest to permissions
  const updatedPermissions = [...currentPermissions, guestId];

  const { error: updateError } = await supabase
    .from('listing')
    .update({ 'users with permission': updatedPermissions })
    .eq('_id', listingId);

  if (updateError) {
    console.warn('[lease:permissions] Could not update permissions:', updateError.message);
  } else {
    console.log('[lease:permissions] Permission granted to guest:', guestId);
  }
}
```

**Validation:** Guest added to listing's permission list.

---

### Step 11: Create Main Router (index.ts)

**File:** `supabase/functions/lease/index.ts`

**Details:**

```typescript
/**
 * Lease Edge Function
 * Split Lease - Supabase Edge Functions
 *
 * Actions:
 * - create: Create a new lease from accepted proposal/counteroffer
 * - get: Fetch lease details
 * - update: Update lease status
 *
 * Request Format:
 * POST /functions/v1/lease
 * {
 *   "action": "create",
 *   "payload": {
 *     "proposalId": "...",
 *     "isCounteroffer": true,
 *     "fourWeekRent": 2000,
 *     "fourWeekCompensation": 1800
 *   }
 * }
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import {
  formatErrorResponse,
  getStatusCodeFromError,
  ValidationError,
  AuthenticationError,
} from "../_shared/errors.ts";

console.log("[lease] Edge Function initializing...");

const ALLOWED_ACTIONS = ['create', 'get'] as const;
type Action = typeof ALLOWED_ACTIONS[number];

// Actions that require authentication
const AUTH_REQUIRED_ACTIONS = new Set<Action>(['get']);

Deno.serve(async (req: Request) => {
  try {
    console.log(`[lease] ${req.method} request received`);

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      console.log(`[lease] CORS preflight - returning 200`);
      return new Response(null, { status: 200, headers: corsHeaders });
    }

    // Only allow POST
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ success: false, error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body = await req.json();
    const action = body.action || 'unknown';
    const payload = body.payload || {};

    console.log(`[lease] Action: ${action}`);

    // Validate action
    if (!ALLOWED_ACTIONS.includes(action as Action)) {
      throw new ValidationError(`Invalid action: ${action}. Allowed: ${ALLOWED_ACTIONS.join(', ')}`);
    }

    // Get Supabase config
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      throw new Error('Missing Supabase configuration');
    }

    // Create service client
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Authentication (for actions that require it)
    let user: { id: string; email: string } | null = null;

    if (AUTH_REQUIRED_ACTIONS.has(action as Action)) {
      user = await authenticateFromHeaders(req.headers, supabaseUrl, supabaseAnonKey);
      if (!user) {
        throw new AuthenticationError('Authentication required');
      }
    }

    let result: unknown;

    // Route to handler
    switch (action) {
      case 'create': {
        console.log('[lease] Loading create handler...');
        const { handleCreate } = await import("./handlers/create.ts");
        result = await handleCreate(payload, user, supabase);
        break;
      }

      case 'get': {
        console.log('[lease] Loading get handler...');
        const { handleGet } = await import("./handlers/get.ts");
        result = await handleGet(payload, user, supabase);
        break;
      }

      default:
        throw new ValidationError(`Unhandled action: ${action}`);
    }

    console.log('[lease] Handler completed successfully');

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[lease] Error:', error);

    const statusCode = getStatusCodeFromError(error as Error);

    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { status: statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function authenticateFromHeaders(
  headers: Headers,
  supabaseUrl: string,
  supabaseAnonKey: string
): Promise<{ id: string; email: string } | null> {
  const authHeader = headers.get('Authorization');

  if (!authHeader) {
    console.log('[lease:auth] No Authorization header');
    return null;
  }

  try {
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error } = await authClient.auth.getUser();

    if (error || !user) {
      console.error('[lease:auth] getUser failed:', error?.message);
      return null;
    }

    // Lookup application user ID by email
    const { data: appUser, error: appUserError } = await authClient
      .from('user')
      .select('_id')
      .eq('email', user.email?.toLowerCase())
      .maybeSingle();

    if (appUserError || !appUser) {
      console.error('[lease:auth] User lookup failed:', appUserError?.message);
      return null;
    }

    return { id: appUser._id, email: user.email ?? '' };

  } catch (err) {
    console.error('[lease:auth] Exception:', (err as Error).message);
    return null;
  }
}

console.log("[lease] Edge Function ready");
```

**Validation:** Router correctly dispatches to handlers; CORS and error handling work.

---

### Step 12: Create Deno Configuration

**File:** `supabase/functions/lease/deno.json`

**Details:**

```json
{
  "imports": {
    "@supabase/supabase-js": "https://esm.sh/@supabase/supabase-js@2"
  },
  "compilerOptions": {
    "strict": true,
    "lib": ["deno.ns", "esnext", "dom"]
  }
}
```

**Validation:** Function imports resolve correctly.

---

### Step 13: Update Frontend - useCompareTermsModalLogic.js

**File:** `app/src/islands/modals/useCompareTermsModalLogic.js`

**Changes:**

Replace the TODO comment at Step 7 with actual Edge Function call:

```javascript
// Step 7: Call lease creation Edge Function
const leaseResponse = await fetch(
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/lease`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'create',
      payload: {
        proposalId: proposal._id,
        isCounteroffer: 'yes',
        fourWeekRent,
        fourWeekCompensation,
        numberOfZeros,
      },
    }),
  }
);

const leaseResult = await leaseResponse.json();
if (!leaseResult.success) {
  throw new Error(leaseResult.error || 'Failed to create lease');
}

console.log('Lease created:', leaseResult.data);
```

**Validation:** Frontend successfully triggers lease creation and handles response.

---

### Step 14: Update counterofferWorkflow.js

**File:** `app/src/logic/workflows/proposals/counterofferWorkflow.js`

**Changes:**

Update `acceptCounteroffer` function to also trigger lease creation for non-modal flows:

```javascript
// Add at end of acceptCounteroffer function:
// Trigger lease creation via Edge Function
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const fourWeekCompensation = originalNightsPerWeek * 4 * originalNightlyPrice;
const fourWeekRent = originalNightsPerWeek * 4 * originalNightlyPrice;

fetch(`${supabaseUrl}/functions/v1/lease`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'create',
    payload: {
      proposalId,
      isCounteroffer: false,  // Not from CompareTermsModal
      fourWeekRent,
      fourWeekCompensation,
    },
  }),
}).catch(err => {
  console.warn('Lease creation trigger failed (non-blocking):', err);
});
```

**Validation:** Workflow triggers lease creation correctly.

---

## Edge Cases & Error Handling

| Edge Case | Handling |
|-----------|----------|
| Proposal already has lease | Check for existing lease before creation; return error if exists |
| Missing HC fields (no counteroffer) | Copy original terms to HC fields during Phase 1 |
| User missing email | Skip email notification, continue with other channels |
| User missing phone | Skip SMS notification, continue with other channels |
| Payment calculation errors | Fail fast with clear error message |
| Bubble sync failure | Log warning but don't fail main operation |
| Magic link generation failure | Log warning, continue without link |

---

## Testing Considerations

### Unit Tests

- [ ] `calculateMoveOutDate()` with various inputs
- [ ] `calculateFirstPaymentDate()` accuracy
- [ ] `generateAgreementNumber()` formatting
- [ ] `getActiveTerms()` correctly selects HC vs original
- [ ] `validateCreateLeasePayload()` rejects invalid input

### Integration Tests

- [ ] Create lease from regular proposal acceptance
- [ ] Create lease from counteroffer acceptance
- [ ] Verify all 7 phases execute
- [ ] Verify payment records created correctly
- [ ] Verify stays created for correct number of weeks
- [ ] Verify notifications sent (mock external services)

### E2E Tests

- [ ] CompareTermsModal acceptance flow creates lease
- [ ] Guest proposals page acceptance creates lease
- [ ] Host can view created lease
- [ ] Guest can view created lease

---

## Rollback Strategy

1. **Edge Function Rollback**: `supabase functions deploy lease --version [previous]`
2. **Frontend Rollback**: Revert changes to `useCompareTermsModalLogic.js` and `counterofferWorkflow.js`
3. **Data Cleanup**: Leases created during testing can be soft-deleted via `Lease Status = 'Cancelled'`

---

## Dependencies & Blockers

| Dependency | Status | Notes |
|------------|--------|-------|
| `generate_bubble_id` RPC function | Available | Already exists in database |
| Email templates for lease notifications | TBD | Need template IDs from `zat_email_html_template` |
| Twilio number for SMS | Available | `+14155692985` |
| Supabase Auth magic links | Available | Via `auth-user` function |

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Long execution time causing timeout | Medium | High | Use parallel operations where possible; consider breaking into async steps |
| Bubble sync queue backup | Low | Medium | Monitor queue depth; existing cron job handles processing |
| Notification delivery failures | Medium | Low | Non-blocking; user can still access lease manually |
| Incorrect payment calculations | Low | High | Reuse existing `guest-payment-records` and `host-payment-records` logic |
| Race condition on lease creation | Low | High | Check for existing lease before creation |

---

## Payment Records Edge Function Integration

### Existing Edge Functions (DO NOT RECREATE)

The lease creation workflow **orchestrates** the following existing Edge Functions for payment records:

| Edge Function | Purpose | Trigger From Lease |
|---------------|---------|-------------------|
| `guest-payment-records` | Creates guest payment schedule | HTTP POST with `action: 'generate'` |
| `host-payment-records` | Creates host payment schedule | HTTP POST with `action: 'generate'` |

### Integration Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    LEASE EDGE FUNCTION                          │
│                         (Phase 6)                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Build paymentPayload from proposal HC values                │
│                                                                 │
│  2. Call guest-payment-records Edge Function ───────────────►   │
│     POST /functions/v1/guest-payment-records                    │
│     {                                                           │
│       "action": "generate",                                     │
│       "payload": {                                              │
│         "leaseId": "...",                                       │
│         "rentalType": "Weekly",                                 │
│         "moveInDate": "2026-02-01",                             │
│         "reservationSpanWeeks": 12,                             │
│         "weekPattern": "Every week",                            │
│         "fourWeekRent": 2000,                                   │
│         "maintenanceFee": 100,                                  │
│         "damageDeposit": 500                                    │
│       }                                                         │
│     }                                                           │
│                                                                 │
│  3. Call host-payment-records Edge Function ────────────────►   │
│     POST /functions/v1/host-payment-records                     │
│     {                                                           │
│       "action": "generate",                                     │
│       "payload": { ... same but NO damageDeposit }              │
│     }                                                           │
│                                                                 │
│  4. Collect results for response                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Key Business Rules (from Bubble Workflow Analysis)

| Rule | Guest Payments | Host Payments |
|------|----------------|---------------|
| **First Payment Date** | 3 days BEFORE move-in | 2 days AFTER move-in |
| **Payment Interval** | 28 days (4-week cycles) | 28 days (Weekly/Nightly) or 31 days (Monthly) |
| **Damage Deposit** | Added to FIRST payment only | Not applicable |
| **Maintenance Fee** | Added to each payment | Added to each payment |
| **Total Calculation** | Total Rent = Sum - Damage Deposit | Total Compensation = Sum of all |

### Week Pattern Proration (Weekly Rentals)

| Pattern | Last Cycle Proration |
|---------|---------------------|
| "Every week" | `remainingWeeks / 4` |
| "One week on, one week off" | 50% if ≤2 remaining weeks |
| "Two weeks on, two weeks off" | 50% if only 1 remaining week |
| "One week on, three weeks off" | No proration (full payment) |

---

## File Summary

### Files to Create

| Path | Purpose |
|------|---------|
| `supabase/functions/lease/index.ts` | Main router |
| `supabase/functions/lease/deno.json` | Import map |
| `supabase/functions/lease/handlers/create.ts` | Main create handler (7 phases) |
| `supabase/functions/lease/handlers/notifications.ts` | Email/SMS/in-app notifications |
| `supabase/functions/lease/handlers/magicLinks.ts` | Magic link generation |
| `supabase/functions/lease/handlers/permissions.ts` | Listing permission grants |
| `supabase/functions/lease/handlers/paymentRecords.ts` | **HTTP wrapper to call existing payment Edge Functions** |
| `supabase/functions/lease/handlers/get.ts` | Get lease details |
| `supabase/functions/lease/lib/types.ts` | TypeScript interfaces |
| `supabase/functions/lease/lib/validators.ts` | Input validation |
| `supabase/functions/lease/lib/calculations.ts` | Date and rent calculations |
| `supabase/functions/lease/lib/agreementNumber.ts` | Agreement number generation |
| `supabase/functions/lease/lib/staysGenerator.ts` | Weekly stays creation |

### Files to Modify

| Path | Changes |
|------|---------|
| `app/src/islands/modals/useCompareTermsModalLogic.js` | Add lease creation Edge Function call |
| `app/src/logic/workflows/proposals/counterofferWorkflow.js` | Trigger lease creation after acceptance |
| `supabase/config.toml` | Add `lease` function entry |

### Existing Edge Functions to INVOKE (via HTTP)

| Path | Purpose | How It's Used |
|------|---------|---------------|
| `supabase/functions/guest-payment-records/` | Guest payment record creation | Called via HTTP POST from `paymentRecords.ts` |
| `supabase/functions/host-payment-records/` | Host payment record creation | Called via HTTP POST from `paymentRecords.ts` |
| `supabase/functions/send-email/` | Email delivery | Called via HTTP POST from `notifications.ts` |
| `supabase/functions/send-sms/` | SMS delivery | Called via HTTP POST from `notifications.ts` |
| `supabase/functions/messages/` | In-app messaging | Called via HTTP POST from `notifications.ts` |
| `supabase/functions/auth-user/` | Magic link generation | Called via HTTP POST from `magicLinks.ts` |

### Files Referenced (Read-Only, Pattern Reference)

| Path | Purpose |
|------|---------|
| `supabase/functions/proposal/index.ts` | Action-based routing pattern |
| `supabase/functions/_shared/queueSync.ts` | Bubble sync utilities |
| `supabase/functions/_shared/cors.ts` | CORS headers |
| `supabase/functions/_shared/errors.ts` | Error handling utilities |

---

## Post-Implementation Checklist

- [ ] Deploy Edge Function: `supabase functions deploy lease`
- [ ] Test in development environment
- [ ] Update Supabase secrets if needed
- [ ] Monitor Slack for error reports
- [ ] Verify Bubble sync queue processing
- [ ] Test email deliverability
- [ ] Test SMS deliverability (if enabled)
- [ ] Frontend deployment to staging
- [ ] E2E test full flow
- [ ] Production deployment

---

**VERSION**: 1.0
**CREATED**: 2026-01-23
**AUTHOR**: Implementation Planning Architect
