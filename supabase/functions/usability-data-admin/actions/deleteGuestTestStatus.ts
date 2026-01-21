/**
 * Delete Guest Test Status Action Handler
 * Resets the usability test step for a guest
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

interface DeleteGuestTestStatusPayload {
  guestId: string;
}

export async function handleDeleteGuestTestStatus(
  payload: DeleteGuestTestStatusPayload,
  supabase: SupabaseClient
) {
  const { guestId } = payload;

  if (!guestId) {
    throw new Error('guestId is required');
  }

  console.log('[usability-data-admin] Resetting test status for guest:', guestId);

  const timestamp = new Date().toISOString();

  const { data, error } = await supabase
    .from('user')
    .update({
      'Usability Step': 0,
      'Modified Date': timestamp,
    })
    .eq('_id', guestId)
    .select('_id, email, "Name - First", "Name - Last", "Usability Step"')
    .single();

  if (error) {
    console.error('[usability-data-admin] Reset test status error:', error);
    throw new Error(`Failed to reset test status: ${error.message}`);
  }

  console.log('[usability-data-admin] Guest test status reset:', { guestId, timestamp });

  return {
    success: true,
    message: `Reset usability test status for guest ${guestId}`,
    user: {
      id: data._id,
      email: data.email,
      firstName: data['Name - First'],
      lastName: data['Name - Last'],
      usabilityStep: data['Usability Step'],
    },
    timestamp,
  };
}
