/**
 * Generate Guest Payment Records Handler
 * Split Lease - Supabase Edge Functions
 *
 * Creates payment records for a lease from the guest's perspective.
 * This replaces Bubble's CORE-create-guest-payment-records-recursive-javascript workflow.
 *
 * Business Rules (KEY DIFFERENCES FROM HOST):
 * - First payment scheduled 3 days BEFORE move-in (vs 2 days AFTER for host)
 * - Damage deposit added to first payment only
 * - Total Rent = sum of payments MINUS damage deposit (deposit is refundable)
 * - Updates 'Payment Records Guest-SL' and 'Total Rent' on lease
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseSyncError } from '../../_shared/errors.ts';
import {
  GenerateGuestPaymentRecordsInput,
  GenerateGuestPaymentRecordsResponse,
  UserContext,
  LeaseData,
  ProposalData,
  GuestPaymentRecord,
} from '../lib/types.ts';
import { validateGenerateInput, normalizeRentalType, normalizeWeekPattern } from '../lib/validators.ts';
import { calculateGuestPaymentSchedule } from '../lib/calculations.ts';

/**
 * Handle generate guest payment records request
 *
 * This function:
 * 1. Validates input
 * 2. Optionally fetches lease/proposal data if not provided
 * 3. Calculates guest payment schedule
 * 4. Creates payment records in Supabase
 * 5. Updates the lease with Total Rent and payment record IDs
 */
export async function handleGenerate(
  payload: Record<string, unknown>,
  _user: UserContext | null,
  supabase: SupabaseClient
): Promise<GenerateGuestPaymentRecordsResponse> {
  console.log(`[guest-payment-records:generate] Starting guest payment records generation`);

  // ================================================
  // INPUT NORMALIZATION & VALIDATION
  // ================================================

  const input: GenerateGuestPaymentRecordsInput = {
    leaseId: payload.leaseId as string,
    rentalType: normalizeRentalType(payload.rentalType as string),
    moveInDate: payload.moveInDate as string,
    reservationSpanWeeks: payload.reservationSpanWeeks as number | undefined,
    reservationSpanMonths: payload.reservationSpanMonths as number | undefined,
    weekPattern: normalizeWeekPattern(payload.weekPattern as string),
    fourWeekRent: payload.fourWeekRent as number | undefined,
    rentPerMonth: payload.rentPerMonth as number | undefined,
    maintenanceFee: Number(payload.maintenanceFee) || 0,
    damageDeposit: Number(payload.damageDeposit) || 0,
  };

  validateGenerateInput(input);

  console.log(`[guest-payment-records:generate] Validated input for lease: ${input.leaseId}`);

  // ================================================
  // FETCH LEASE DATA
  // ================================================

  const { data: lease, error: leaseError } = await supabase
    .from('bookings_leases')
    .select(`
      _id,
      Proposal,
      "rental type",
      "Move In Date",
      "Payment Records Guest-SL",
      "Total Rent"
    `)
    .eq('_id', input.leaseId)
    .single();

  if (leaseError) {
    console.error(`[guest-payment-records:generate] Lease fetch failed:`, leaseError);
    throw new SupabaseSyncError(`Failed to fetch lease: ${leaseError.message}`);
  }

  const leaseData = lease as unknown as LeaseData;
  console.log(`[guest-payment-records:generate] Found lease, proposal: ${leaseData.Proposal}`);

  // Fetch damage deposit from proposal if not provided
  let damageDeposit = input.damageDeposit;
  if (!damageDeposit && leaseData.Proposal) {
    const { data: proposal } = await supabase
      .from('proposal')
      .select(`_id, "hc damage deposit", "hc cleaning fee"`)
      .eq('_id', leaseData.Proposal)
      .single();

    if (proposal) {
      const proposalData = proposal as unknown as ProposalData;
      damageDeposit = proposalData['hc damage deposit'] || 0;
      console.log(`[guest-payment-records:generate] Fetched damage deposit from proposal: ${damageDeposit}`);
    }
  }

  // ================================================
  // CALCULATE GUEST PAYMENT SCHEDULE
  // ================================================

  console.log(`[guest-payment-records:generate] Calculating guest payment schedule...`);

  const schedule = calculateGuestPaymentSchedule(
    input.rentalType,
    input.moveInDate,
    input.reservationSpanWeeks,
    input.reservationSpanMonths,
    input.weekPattern,
    input.fourWeekRent,
    input.rentPerMonth,
    input.maintenanceFee,
    damageDeposit
  );

  console.log(`[guest-payment-records:generate] Calculated ${schedule.numberOfPaymentCycles} payment cycles`);
  console.log(`[guest-payment-records:generate] Total reservation price: ${schedule.totalReservationPrice}`);

  // ================================================
  // GENERATE PAYMENT RECORD IDs
  // ================================================

  const paymentRecordIds: string[] = [];
  for (let i = 0; i < schedule.numberOfPaymentCycles; i++) {
    const { data: recordId, error: idError } = await supabase.rpc('generate_bubble_id');
    if (idError || !recordId) {
      console.error(`[guest-payment-records:generate] ID generation failed:`, idError);
      throw new SupabaseSyncError('Failed to generate payment record ID');
    }
    paymentRecordIds.push(recordId);
  }

  console.log(`[guest-payment-records:generate] Generated ${paymentRecordIds.length} payment record IDs`);

  // ================================================
  // CREATE PAYMENT RECORDS
  // ================================================

  const now = new Date().toISOString();
  const paymentRecords: GuestPaymentRecord[] = [];

  for (let i = 0; i < schedule.numberOfPaymentCycles; i++) {
    const paymentNumber = i + 1; // 1-indexed like Bubble

    const record: GuestPaymentRecord = {
      _id: paymentRecordIds[i],
      'Booking - Reservation': input.leaseId,
      'Payment #': paymentNumber,
      'Scheduled Date': convertDateFormat(schedule.paymentDates[i]),
      Rent: schedule.rentList[i],
      'Maintenance Fee': input.maintenanceFee,
      'Total Paid by Guest': schedule.totalRentList[i],
      'Payment to Host?': false,
      'Payment from guest?': true,
      source_calculation: 'supabase-edge-function',
      'Created Date': now,
      'Modified Date': now,
    };

    // Add damage deposit to first payment only
    if (paymentNumber === 1 && damageDeposit > 0) {
      record['Damage Deposit'] = damageDeposit;
    }

    paymentRecords.push(record);
  }

  console.log(`[guest-payment-records:generate] Inserting ${paymentRecords.length} payment records...`);

  const { error: insertError } = await supabase
    .from('paymentrecords')
    .insert(paymentRecords);

  if (insertError) {
    console.error(`[guest-payment-records:generate] Insert failed:`, insertError);
    throw new SupabaseSyncError(`Failed to create payment records: ${insertError.message}`);
  }

  console.log(`[guest-payment-records:generate] Payment records created successfully`);

  // ================================================
  // UPDATE LEASE WITH PAYMENT RECORDS LIST & TOTAL RENT
  // ================================================

  const existingPaymentRecords = leaseData['Payment Records Guest-SL'] || [];
  const updatedPaymentRecords = [...existingPaymentRecords, ...paymentRecordIds];

  const { error: leaseUpdateError } = await supabase
    .from('bookings_leases')
    .update({
      'Payment Records Guest-SL': updatedPaymentRecords,
      'Total Rent': schedule.totalReservationPrice,
      'Modified Date': now,
    })
    .eq('_id', input.leaseId);

  if (leaseUpdateError) {
    console.error(`[guest-payment-records:generate] Lease update failed:`, leaseUpdateError);
    // Non-blocking - payment records were created, lease update is secondary
  } else {
    console.log(`[guest-payment-records:generate] Lease updated with payment records and Total Rent`);
  }

  // ================================================
  // RETURN RESPONSE
  // ================================================

  console.log(`[guest-payment-records:generate] Complete, returning response`);

  return {
    paymentRecordIds,
    totalReservationPrice: schedule.totalReservationPrice,
    recordCount: paymentRecordIds.length,
    leaseId: input.leaseId,
  };
}

/**
 * Convert date from mm-dd-yyyy to ISO format for database storage
 */
function convertDateFormat(dateStr: string): string {
  const [mm, dd, yyyy] = dateStr.split('-');
  return new Date(`${yyyy}-${mm}-${dd}`).toISOString();
}
