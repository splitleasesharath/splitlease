/**
 * Mark Tester Action Handler
 * Updates user.isUsabilityTester flag to true
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

interface MarkTesterPayload {
  simulationId: string;
}

interface AuthUser {
  id: string;
  email: string;
}

interface MarkTesterResult {
  success: boolean;
  userId: string;
  isUsabilityTester: boolean;
}

export async function handleMarkTester(
  payload: MarkTesterPayload,
  user: AuthUser,
  supabase: SupabaseClient
): Promise<MarkTesterResult> {
  console.log('[markTester] Starting for user:', user.id);

  const { simulationId } = payload;

  if (!simulationId) {
    throw new Error('simulationId is required');
  }

  // Get user's _id from supabaseUserId
  const { data: userData, error: fetchError } = await supabase
    .from('user')
    .select('_id')
    .eq('supabaseUserId', user.id)
    .single();

  if (fetchError || !userData) {
    console.error('[markTester] Error fetching user:', fetchError);
    throw new Error('User not found');
  }

  // Update user record
  const { error: updateError } = await supabase
    .from('user')
    .update({
      'is usability tester': true,
      'Usability Step': 1,
      'Modified Date': new Date().toISOString()
    })
    .eq('_id', userData._id);

  if (updateError) {
    console.error('[markTester] Error updating user:', updateError);
    throw new Error('Failed to mark user as tester');
  }

  console.log('[markTester] Successfully marked user as tester:', userData._id);

  return {
    success: true,
    userId: userData._id,
    isUsabilityTester: true
  };
}
