/**
 * Delete Host Test Status Action Handler
 * Resets the usability test step for a host
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

interface DeleteHostTestStatusPayload {
  hostId: string;
}

export async function handleDeleteHostTestStatus(
  payload: DeleteHostTestStatusPayload,
  supabase: SupabaseClient
) {
  const { hostId } = payload;

  if (!hostId) {
    throw new Error('hostId is required');
  }

  console.log('[usability-data-admin] Resetting test status for host:', hostId);

  const timestamp = new Date().toISOString();

  const { data, error } = await supabase
    .from('user')
    .update({
      'Usability Step': 0,
      'Modified Date': timestamp,
    })
    .eq('_id', hostId)
    .select('_id, email, "Name - First", "Name - Last", "Usability Step"')
    .single();

  if (error) {
    console.error('[usability-data-admin] Reset test status error:', error);
    throw new Error(`Failed to reset test status: ${error.message}`);
  }

  console.log('[usability-data-admin] Host test status reset:', { hostId, timestamp });

  return {
    success: true,
    message: `Reset usability test status for host ${hostId}`,
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
