/**
 * Stays Generator for Lease Edge Function
 * Split Lease - Supabase Edge Functions
 *
 * Generates weekly stay records for a lease using pre-generated dates
 * from the dateGenerator module. Each stay represents one check-in period.
 *
 * NO FALLBACK PRINCIPLE: Fails fast on invalid input.
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { StayData } from './types.ts';
import type { DateGenerationResult } from './dateGenerator.ts';

/**
 * Generate weekly stay records for a lease
 *
 * Each stay represents one check-in period of the reservation with:
 * - The specific dates the guest is staying
 * - Check-in and check-out times
 * - Links to lease, guest, host, and listing
 *
 * @param supabase - Supabase client
 * @param leaseId - ID of the lease
 * @param guestId - ID of the guest
 * @param hostId - ID of the host
 * @param listingId - ID of the listing
 * @param dateResult - Pre-generated dates from dateGenerator
 * @returns Array of created stay IDs
 */
export async function generateStays(
  supabase: SupabaseClient,
  leaseId: string,
  guestId: string,
  hostId: string,
  listingId: string,
  dateResult: DateGenerationResult
): Promise<string[]> {
  console.log('[lease:stays] Generating stays for lease:', leaseId);
  console.log('[lease:stays] Date result:', {
    checkInDatesCount: dateResult.checkInDates.length,
    checkOutDatesCount: dateResult.checkOutDates.length,
    allBookedDatesCount: dateResult.allBookedDates.length,
    totalNights: dateResult.totalNights,
  });

  const stayIds: string[] = [];
  const now = new Date().toISOString();

  // Parse dates from the pre-generated result
  const allDates = dateResult.allBookedDates.map((d) => new Date(d));
  const checkInDates = dateResult.checkInDates.map((d) => new Date(d));
  const checkOutDates = dateResult.checkOutDates.map((d) => new Date(d));

  // If no check-in dates, no stays to create
  if (checkInDates.length === 0) {
    console.warn('[lease:stays] No check-in dates provided, no stays will be created');
    return stayIds;
  }

  // Create one stay per check-in date
  for (let i = 0; i < checkInDates.length; i++) {
    const checkInDate = checkInDates[i];
    const checkOutDate = checkOutDates[i]; // Corresponding check-out
    const nextCheckIn = checkInDates[i + 1]; // Next check-in (undefined for last stay)

    // Generate bubble-compatible ID using the RPC function
    const { data: stayId, error: idError } = await supabase.rpc('generate_bubble_id');

    if (idError || !stayId) {
      console.error('[lease:stays] Failed to generate stay ID:', idError?.message);
      throw new Error(`Failed to generate stay ID: ${idError?.message}`);
    }

    // Find all booked dates for this stay period
    // Dates between this check-in and the next check-in (or end of reservation)
    const stayDates = allDates.filter((d) => {
      // Date must be on or after this check-in
      if (d < checkInDate) return false;
      // Date must be before the next check-in (if there is one)
      if (nextCheckIn && d >= nextCheckIn) return false;
      return true;
    });

    // Determine check-in night and last night
    const checkInNight = stayDates.length > 0 ? stayDates[0] : checkInDate;
    const lastNight = stayDates.length > 0 ? stayDates[stayDates.length - 1] : checkInDate;

    // Build stay record
    const stayRecord: Partial<StayData> = {
      _id: stayId,
      Lease: leaseId,
      'Week Number': i + 1, // 1-indexed
      Guest: guestId,
      Host: hostId,
      listing: listingId,
      'Dates - List of dates in this period': stayDates.map((d) => d.toISOString().split('T')[0]),
      'Check In (night)': checkInNight.toISOString().split('T')[0],
      'Last Night (night)': lastNight.toISOString().split('T')[0],
      'Stay Status': 'Upcoming',
      'Created Date': now,
      'Modified Date': now,
    };

    // Insert stay record
    const { error: insertError } = await supabase.from('bookings_stays').insert(stayRecord);

    if (insertError) {
      console.error(`[lease:stays] Failed to create stay ${i + 1}:`, insertError.message);
      throw new Error(`Failed to create stay ${i + 1}: ${insertError.message}`);
    }

    console.log(
      `[lease:stays] Created stay ${i + 1}/${checkInDates.length}:`,
      stayId,
      `(${stayDates.length} nights)`
    );
    stayIds.push(stayId);
  }

  console.log(`[lease:stays] Created ${stayIds.length} stays for lease:`, leaseId);
  return stayIds;
}

/**
 * Calculate the dates for a single week stay (utility function)
 *
 * @param weekStart - Start date of the week
 * @param daysSelected - Array of day indices (0-6)
 * @returns Object with selected dates, check-in, and last night
 */
export function calculateWeekDates(
  weekStart: Date,
  daysSelected: number[]
): {
  selectedDates: string[];
  checkInNight: string;
  lastNight: string;
} {
  const dates: Date[] = [];
  const current = new Date(weekStart);

  // Get all 7 days of this week
  for (let i = 0; i < 7; i++) {
    if (daysSelected.includes(current.getDay())) {
      dates.push(new Date(current));
    }
    current.setDate(current.getDate() + 1);
  }

  const selectedDates = dates.map((d) => d.toISOString().split('T')[0]);
  const checkInNight = selectedDates.length > 0 ? selectedDates[0] : weekStart.toISOString().split('T')[0];
  const lastNight =
    selectedDates.length > 0
      ? selectedDates[selectedDates.length - 1]
      : weekStart.toISOString().split('T')[0];

  return {
    selectedDates,
    checkInNight,
    lastNight,
  };
}
