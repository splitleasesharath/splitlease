/**
 * Get Prefill Data Handler
 *
 * Retrieves a user's most recent proposal data for prefilling the suggested proposal form.
 * Uses service role to bypass RLS since hosts need to query other users' proposals.
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

interface GetPrefillDataPayload {
  guestId: string;
}

interface PrefillData {
  _id: string;
  daysSelected: number[];
  reservationSpanWeeks: number;
  moveInRangeStart: string | null;
}

export async function handleGetPrefillData(
  payload: GetPrefillDataPayload,
  supabase: SupabaseClient
): Promise<PrefillData | null> {
  console.log('[get_prefill_data] Starting with guestId:', payload.guestId);

  if (!payload.guestId) {
    throw new Error('guestId is required');
  }

  // Query the most recent non-deleted proposal for this guest
  const { data, error } = await supabase
    .from('proposal')
    .select(`
      _id,
      "Days Selected",
      "Reservation Span (Weeks)",
      "Move in range start"
    `)
    .eq('Guest', payload.guestId)
    .neq('Deleted', true)
    .order('"Created Date"', { ascending: false })
    .limit(1);

  if (error) {
    console.error('[get_prefill_data] Query error:', error);
    throw new Error(`Failed to fetch prefill data: ${error.message}`);
  }

  console.log('[get_prefill_data] Query result:', data);

  if (!data || data.length === 0) {
    console.log('[get_prefill_data] No proposals found for guest');
    return null;
  }

  const proposal = data[0];

  // Transform to a cleaner format
  const prefillData: PrefillData = {
    _id: proposal._id,
    daysSelected: proposal['Days Selected'] || [],
    reservationSpanWeeks: proposal['Reservation Span (Weeks)'] || 0,
    moveInRangeStart: proposal['Move in range start'] || null,
  };

  console.log('[get_prefill_data] Returning prefill data:', prefillData);

  return prefillData;
}
