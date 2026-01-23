/**
 * Payment Records Handler
 * Split Lease - Supabase Edge Functions
 *
 * Triggers the EXISTING guest-payment-records and host-payment-records
 * Edge Functions to create payment schedules for the lease.
 *
 * IMPORTANT: This does NOT duplicate the payment calculation logic.
 * Instead, it calls the existing Edge Functions via HTTP, following DRY.
 *
 * KEY BUSINESS RULES (from Bubble workflow):
 * - Guest first payment: 3 days BEFORE move-in
 * - Host first payment: 2 days AFTER move-in
 * - Payment interval: 28 days for Weekly/Nightly, 31 days for Monthly
 * - Damage deposit: Added to FIRST guest payment only
 * - Maintenance fee: Added to each payment
 */

import type { PaymentPayload, PaymentResult } from '../lib/types.ts';

/**
 * Trigger the guest-payment-records Edge Function
 *
 * Creates guest payment records for a lease.
 * First payment is 3 days BEFORE move-in date.
 * Damage deposit is added to the first payment only.
 *
 * @param payload - Payment configuration
 * @returns Payment result with record count and totals
 */
export async function triggerGuestPaymentRecords(
  payload: PaymentPayload
): Promise<PaymentResult> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[lease:paymentRecords] Missing environment variables');
    return {
      success: false,
      recordCount: 0,
      totalAmount: 0,
      error: 'Missing environment configuration',
    };
  }

  console.log('[lease:paymentRecords] Triggering guest-payment-records...');
  console.log('[lease:paymentRecords] Payload:', JSON.stringify(payload, null, 2));

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/guest-payment-records`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
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
        error: result.error || 'Unknown error',
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
 * Creates host payment records for a lease.
 * First payment is 2 days AFTER move-in date.
 * Damage deposit is NOT passed to host payments.
 *
 * @param payload - Payment configuration
 * @returns Payment result with record count and totals
 */
export async function triggerHostPaymentRecords(
  payload: PaymentPayload
): Promise<PaymentResult> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[lease:paymentRecords] Missing environment variables');
    return {
      success: false,
      recordCount: 0,
      totalAmount: 0,
      error: 'Missing environment configuration',
    };
  }

  console.log('[lease:paymentRecords] Triggering host-payment-records...');
  console.log('[lease:paymentRecords] Payload:', JSON.stringify(payload, null, 2));

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/host-payment-records`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
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
        error: result.error || 'Unknown error',
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
