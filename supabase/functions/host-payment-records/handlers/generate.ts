/**
 * Generate Host Payment Records Handler
 * Split Lease - Supabase Edge Functions
 *
 * Creates payment records for a lease based on the payment schedule calculation.
 * This replaces Bubble's recursive workflow with efficient batch operations.
 *
 * Business Rules:
 * - First payment scheduled 2 days after move-in
 * - Payment intervals: Monthly = 31 days, Weekly/Nightly = 28 days
 * - Partial periods are prorated based on rental type and week pattern
 * - Damage deposit only added to first payment
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseSyncError } from '../../_shared/errors.ts';
import {
  GeneratePaymentRecordsInput,
  GeneratePaymentRecordsResponse,
  UserContext,
  LeaseData,
  ProposalData,
  PaymentRecord,
} from '../lib/types.ts';
import { validateGenerateInput, normalizeRentalType, normalizeWeekPattern } from '../lib/validators.ts';
import { calculatePaymentSchedule, parseDate } from '../lib/calculations.ts';
import { enqueueBubbleSync, triggerQueueProcessing } from '../../_shared/queueSync.ts';

/**
 * Handle generate payment records request
 *
 * This function:
 * 1. Validates input
 * 2. Optionally fetches lease/proposal data if not provided
 * 3. Calculates payment schedule
 * 4. Creates payment records in Supabase
 * 5. Updates the lease with total compensation
 * 6. Queues Bubble sync
 */
export async function handleGenerate(
  payload: Record<string, unknown>,
  _user: UserContext | null,
  supabase: SupabaseClient
): Promise<GeneratePaymentRecordsResponse> {
  console.log(`[host-payment-records:generate] Starting payment records generation`);

  // ================================================
  // INPUT NORMALIZATION & VALIDATION
  // ================================================

  const input: GeneratePaymentRecordsInput = {
    leaseId: payload.leaseId as string,
    rentalType: normalizeRentalType(payload.rentalType as string),
    moveInDate: payload.moveInDate as string,
    reservationSpanWeeks: payload.reservationSpanWeeks as number | undefined,
    reservationSpanMonths: payload.reservationSpanMonths as number | undefined,
    weekPattern: normalizeWeekPattern(payload.weekPattern as string),
    fourWeekRent: payload.fourWeekRent as number | undefined,
    rentPerMonth: payload.rentPerMonth as number | undefined,
    maintenanceFee: Number(payload.maintenanceFee) || 0,
    damageDeposit: payload.damageDeposit as number | undefined,
  };

  validateGenerateInput(input);

  console.log(`[host-payment-records:generate] Validated input for lease: ${input.leaseId}`);

  // ================================================
  // FETCH LEASE DATA (for additional context if needed)
  // ================================================

  const { data: lease, error: leaseError } = await supabase
    .from('bookings_leases')
    .select(`
      _id,
      Proposal,
      "rental type",
      "Move In Date",
      "Payment Records SL-Hosts",
      "Total Compensation"
    `)
    .eq('_id', input.leaseId)
    .single();

  if (leaseError) {
    console.error(`[host-payment-records:generate] Lease fetch failed:`, leaseError);
    throw new SupabaseSyncError(`Failed to fetch lease: ${leaseError.message}`);
  }

  const leaseData = lease as unknown as LeaseData;
  console.log(`[host-payment-records:generate] Found lease, proposal: ${leaseData.Proposal}`);

  // Optionally fetch proposal for damage deposit if not provided
  let damageDeposit = input.damageDeposit || 0;
  if (!damageDeposit && leaseData.Proposal) {
    const { data: proposal } = await supabase
      .from('proposal')
      .select(`_id, "hc damage deposit", "hc cleaning fee"`)
      .eq('_id', leaseData.Proposal)
      .single();

    if (proposal) {
      const proposalData = proposal as unknown as ProposalData;
      damageDeposit = proposalData['hc damage deposit'] || 0;
      console.log(`[host-payment-records:generate] Fetched damage deposit from proposal: ${damageDeposit}`);
    }
  }

  // ================================================
  // CALCULATE PAYMENT SCHEDULE
  // ================================================

  console.log(`[host-payment-records:generate] Calculating payment schedule...`);

  const schedule = calculatePaymentSchedule(
    input.rentalType,
    input.moveInDate,
    input.reservationSpanWeeks,
    input.reservationSpanMonths,
    input.weekPattern,
    input.fourWeekRent,
    input.rentPerMonth,
    input.maintenanceFee
  );

  console.log(`[host-payment-records:generate] Calculated ${schedule.numberOfPaymentCycles} payment cycles`);
  console.log(`[host-payment-records:generate] Total compensation: ${schedule.totalCompensationAmount}`);

  // ================================================
  // GENERATE PAYMENT RECORD IDs
  // ================================================

  const paymentRecordIds: string[] = [];
  for (let i = 0; i < schedule.numberOfPaymentCycles; i++) {
    const { data: recordId, error: idError } = await supabase.rpc('generate_bubble_id');
    if (idError || !recordId) {
      console.error(`[host-payment-records:generate] ID generation failed:`, idError);
      throw new SupabaseSyncError('Failed to generate payment record ID');
    }
    paymentRecordIds.push(recordId);
  }

  console.log(`[host-payment-records:generate] Generated ${paymentRecordIds.length} payment record IDs`);

  // ================================================
  // CREATE PAYMENT RECORDS
  // ================================================

  const now = new Date().toISOString();
  const paymentRecords: PaymentRecord[] = [];

  for (let i = 0; i < schedule.numberOfPaymentCycles; i++) {
    const paymentNumber = i + 1; // 1-indexed like Bubble

    const record: PaymentRecord = {
      _id: paymentRecordIds[i],
      'Booking - Reservation': input.leaseId,
      'Payment #': paymentNumber,
      'Scheduled Date': convertDateFormat(schedule.paymentDates[i]),
      Rent: schedule.rentList[i],
      'Maintenance Fee': input.maintenanceFee,
      'Total Paid to Host': schedule.totalRentList[i],
      'Payment to Host?': true,
      'Payment from guest?': false,
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

  console.log(`[host-payment-records:generate] Inserting ${paymentRecords.length} payment records...`);

  const { error: insertError } = await supabase
    .from('paymentrecords')
    .insert(paymentRecords);

  if (insertError) {
    console.error(`[host-payment-records:generate] Insert failed:`, insertError);
    throw new SupabaseSyncError(`Failed to create payment records: ${insertError.message}`);
  }

  console.log(`[host-payment-records:generate] Payment records created successfully`);

  // ================================================
  // UPDATE LEASE WITH PAYMENT RECORDS LIST & TOTAL
  // ================================================

  const existingPaymentRecords = leaseData['Payment Records SL-Hosts'] || [];
  const updatedPaymentRecords = [...existingPaymentRecords, ...paymentRecordIds];

  const { error: leaseUpdateError } = await supabase
    .from('bookings_leases')
    .update({
      'Payment Records SL-Hosts': updatedPaymentRecords,
      'Total Compensation': schedule.totalCompensationAmount,
      'Modified Date': now,
    })
    .eq('_id', input.leaseId);

  if (leaseUpdateError) {
    console.error(`[host-payment-records:generate] Lease update failed:`, leaseUpdateError);
    // Non-blocking - payment records were created, lease update is secondary
  } else {
    console.log(`[host-payment-records:generate] Lease updated with payment records`);
  }

  // ================================================
  // ENQUEUE BUBBLE SYNC
  // ================================================

  try {
    const syncItems = paymentRecords.map((record, index) => ({
      sequence: index + 1,
      table: 'paymentrecords',
      recordId: record._id,
      operation: 'INSERT' as const,
      payload: record,
    }));

    // Add lease update to sync queue
    syncItems.push({
      sequence: paymentRecords.length + 1,
      table: 'bookings_leases',
      recordId: input.leaseId,
      operation: 'UPDATE' as const,
      payload: {
        'Payment Records SL-Hosts': updatedPaymentRecords,
        'Total Compensation': schedule.totalCompensationAmount,
      },
    });

    await enqueueBubbleSync(supabase, {
      correlationId: input.leaseId,
      items: syncItems,
    });

    console.log(`[host-payment-records:generate] Bubble sync items enqueued (correlation: ${input.leaseId})`);

    // Trigger queue processing (fire and forget)
    triggerQueueProcessing();

  } catch (syncError) {
    // Log but don't fail - items can be manually requeued if needed
    console.error(`[host-payment-records:generate] Failed to enqueue Bubble sync (non-blocking):`, syncError);
  }

  // ================================================
  // RETURN RESPONSE
  // ================================================

  console.log(`[host-payment-records:generate] Complete, returning response`);

  return {
    paymentRecordIds,
    totalCompensation: schedule.totalCompensationAmount,
    recordCount: paymentRecordIds.length,
    leaseId: input.leaseId,
  };
}

/**
 * Convert date from mm-dd-yyyy to ISO format for database storage
 */
function convertDateFormat(dateStr: string): string {
  // dateStr is in mm-dd-yyyy format
  const [mm, dd, yyyy] = dateStr.split('-');
  return new Date(`${yyyy}-${mm}-${dd}`).toISOString();
}
