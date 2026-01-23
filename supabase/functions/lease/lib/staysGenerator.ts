/**
 * Stays Generator for Lease Edge Function
 * Split Lease - Supabase Edge Functions
 *
 * Generates weekly stay records for a lease.
 * Each stay represents one week of the reservation.
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { addDays, addWeeks, eachDayOfInterval } from './calculations.ts';
import type { StayData } from './types.ts';

/**
 * Generate weekly stay records for a lease
 *
 * Each stay represents one week of the reservation with:
 * - The specific dates the guest is staying
 * - Check-in and check-out times
 * - Links to lease, guest, host, and listing
 *
 * @param supabase - Supabase client
 * @param leaseId - ID of the lease
 * @param guestId - ID of the guest
 * @param hostId - ID of the host
 * @param listingId - ID of the listing
 * @param moveInDate - Move-in date (ISO string)
 * @param reservationWeeks - Number of weeks in the reservation
 * @param daysSelected - Array of day indices (0-6, where 0=Sunday)
 * @returns Array of created stay IDs
 */
export async function generateStays(
  supabase: SupabaseClient,
  leaseId: string,
  guestId: string,
  hostId: string,
  listingId: string,
  moveInDate: string,
  reservationWeeks: number,
  daysSelected: number[]
): Promise<string[]> {
  console.log('[lease:stays] Generating stays for lease:', leaseId);
  console.log('[lease:stays] Parameters:', {
    reservationWeeks,
    daysSelected,
    moveInDate,
  });

  const stayIds: string[] = [];
  const now = new Date().toISOString();
  const moveIn = new Date(moveInDate);

  // Validate days selected
  const validDays = (daysSelected || []).filter(
    (day) => typeof day === 'number' && day >= 0 && day <= 6
  );

  if (validDays.length === 0) {
    console.warn('[lease:stays] No valid days selected, defaulting to all days');
    // Default to all days if none selected
    validDays.push(0, 1, 2, 3, 4, 5, 6);
  }

  for (let week = 0; week < reservationWeeks; week++) {
    // Generate bubble-compatible ID using the RPC function
    const { data: stayId, error: idError } = await supabase.rpc('generate_bubble_id');

    if (idError || !stayId) {
      console.error('[lease:stays] Failed to generate stay ID:', idError?.message);
      throw new Error(`Failed to generate stay ID: ${idError?.message}`);
    }

    // Calculate week boundaries
    const weekStart = addWeeks(moveIn, week);
    const weekEnd = addDays(weekStart, 6);

    // Get all dates in this week
    const allDates = eachDayOfInterval(weekStart, weekEnd);

    // Filter to only selected days
    const selectedDates = allDates
      .filter((date) => validDays.includes(date.getDay()))
      .map((date) => date.toISOString());

    // Determine check-in and last night
    const checkInNight =
      selectedDates.length > 0 ? selectedDates[0] : weekStart.toISOString();
    const lastNight =
      selectedDates.length > 0
        ? selectedDates[selectedDates.length - 1]
        : weekEnd.toISOString();

    // Build stay record
    const stayRecord: Partial<StayData> = {
      _id: stayId,
      Lease: leaseId,
      'Week Number': week + 1, // 1-indexed
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

    // Insert stay record
    const { error: insertError } = await supabase
      .from('bookings_stays')
      .insert(stayRecord);

    if (insertError) {
      console.error(
        `[lease:stays] Failed to create stay ${week + 1}:`,
        insertError.message
      );
      throw new Error(`Failed to create stay ${week + 1}: ${insertError.message}`);
    }

    console.log(`[lease:stays] Created stay ${week + 1}/${reservationWeeks}:`, stayId);
    stayIds.push(stayId);
  }

  console.log(`[lease:stays] Created ${stayIds.length} stays for lease:`, leaseId);
  return stayIds;
}

/**
 * Calculate the dates for a single week stay
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
  const weekEnd = addDays(weekStart, 6);
  const allDates = eachDayOfInterval(weekStart, weekEnd);

  const selectedDates = allDates
    .filter((date) => daysSelected.includes(date.getDay()))
    .map((date) => date.toISOString());

  const checkInNight =
    selectedDates.length > 0 ? selectedDates[0] : weekStart.toISOString();
  const lastNight =
    selectedDates.length > 0
      ? selectedDates[selectedDates.length - 1]
      : weekEnd.toISOString();

  return {
    selectedDates,
    checkInNight,
    lastNight,
  };
}
