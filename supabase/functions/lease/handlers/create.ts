/**
 * Create Lease Handler
 * Split Lease - Supabase Edge Functions
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
import { SupabaseSyncError } from '../../_shared/errors.ts';
import { enqueueBubbleSync, triggerQueueProcessing } from '../../_shared/queueSync.ts';
import { validateCreateLeasePayload, normalizeIsCounteroffer } from '../lib/validators.ts';
import {
  calculateMoveOutDate,
  calculateFirstPaymentDate,
  getActiveTerms,
  calculateTotalRent,
  calculateTotalCompensation,
} from '../lib/calculations.ts';
import { generateAgreementNumber } from '../lib/agreementNumber.ts';
import { generateStays } from '../lib/staysGenerator.ts';
import { triggerGuestPaymentRecords, triggerHostPaymentRecords } from './paymentRecords.ts';
import { sendLeaseNotifications } from './notifications.ts';
import { generateMagicLinks } from './magicLinks.ts';
import { grantListingPermission } from './permissions.ts';
import type {
  CreateLeasePayload,
  CreateLeaseResponse,
  ProposalData,
  LeaseData,
  UserContext,
  PaymentPayload,
} from '../lib/types.ts';

/**
 * Handle lease creation - main orchestrator
 *
 * @param payload - Request payload with proposal details
 * @param user - Authenticated user context (optional)
 * @param supabase - Supabase client
 * @returns Lease creation response
 */
export async function handleCreate(
  payload: Record<string, unknown>,
  user: UserContext | null,
  supabase: SupabaseClient
): Promise<CreateLeaseResponse> {
  console.log('[lease:create] ========== CREATE LEASE ==========');

  // Validate input
  validateCreateLeasePayload(payload);

  const input: CreateLeasePayload = {
    proposalId: payload.proposalId as string,
    isCounteroffer: normalizeIsCounteroffer(payload.isCounteroffer),
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
    Status: 'Proposal or Counteroffer Accepted / Drafting Lease Documents',
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

  // Calculate totals
  const totalRent = calculateTotalRent(input.fourWeekRent, activeTerms.reservationWeeks);
  const totalCompensation = calculateTotalCompensation(
    input.fourWeekCompensation,
    activeTerms.reservationWeeks
  );

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
    'Total Compensation': totalCompensation,
    'Total Rent': totalRent,
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

  // Build payment payload from proposal data
  const paymentPayload: PaymentPayload = {
    leaseId,
    rentalType: proposalData['rental type'],
    moveInDate: activeTerms.moveInDate,
    reservationSpanWeeks: activeTerms.reservationWeeks,
    reservationSpanMonths: proposalData['hc duration in months'] || proposalData['duration in months'],
    weekPattern:
      proposalData['hc weeks schedule']?.Display ||
      proposalData['week selection']?.Display ||
      'Every week',
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
  const daysSelected = proposalData['hc days selected'] || proposalData['Days Selected'] || [];
  const stayIds = await generateStays(
    supabase,
    leaseId,
    proposalData.Guest,
    proposalData['Host User'],
    proposalData.Listing,
    activeTerms.moveInDate,
    activeTerms.reservationWeeks,
    daysSelected
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
          payload: leaseRecord as Record<string, unknown>,
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
 *
 * @param supabase - Supabase client
 * @param userId - User ID
 * @param leaseId - Lease ID
 * @param role - User role ('guest' or 'host')
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

  const currentLeases: string[] = user?.[columnName] || [];
  const updatedLeases = [...currentLeases, leaseId];

  const { error: updateError } = await supabase
    .from('user')
    .update({ [columnName]: updatedLeases })
    .eq('_id', userId);

  if (updateError) {
    console.warn(`[lease:create] Could not update user ${userId}:`, updateError.message);
  }
}
