/**
 * Accept Counteroffer Action Handler
 *
 * Accepts a host's counteroffer on behalf of the guest.
 * Used in usability simulations for the counteroffer path.
 *
 * @param payload - Contains proposalId and test flags
 * @param supabase - Supabase client with service role
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

interface AcceptCounterofferPayload {
  proposalId: string;
  isUsabilityTest?: boolean;
}

export async function handleAcceptCounteroffer(
  payload: AcceptCounterofferPayload,
  supabase: SupabaseClient
): Promise<{ success: boolean; message: string }> {
  console.log('[accept_counteroffer] Starting with proposalId:', payload.proposalId);

  const { proposalId, isUsabilityTest = false } = payload;

  if (!proposalId) {
    throw new Error('proposalId is required');
  }

  // Fetch proposal to get counteroffer terms
  const { data: proposal, error: fetchError } = await supabase
    .from('proposal')
    .select('*, "hc nightly price", "hc nights per week", "hc check in day", "hc check out day"')
    .eq('_id', proposalId)
    .single();

  if (fetchError) {
    console.error('[accept_counteroffer] Fetch error:', fetchError);
    throw new Error(`Failed to fetch proposal: ${fetchError.message}`);
  }

  // Accept the counteroffer - move to drafting lease status
  // Copy counteroffer terms to active terms
  const updateData: Record<string, unknown> = {
    Status: 'Accepted - Drafting Lease',
    'Modified Date': new Date().toISOString(),
    'last_modified_by': 'guest',
    'counteroffer_accepted': true,
    'counteroffer_accepted_date': new Date().toISOString()
  };

  // Apply counteroffer values as the final agreed terms
  if (proposal['hc nightly price']) {
    updateData['proposal nightly price'] = proposal['hc nightly price'];
  }
  if (proposal['hc nights per week']) {
    updateData['nights per week (num)'] = proposal['hc nights per week'];
  }
  if (proposal['hc check in day'] !== undefined) {
    updateData['check in day'] = proposal['hc check in day'];
  }
  if (proposal['hc check out day'] !== undefined) {
    updateData['check out day'] = proposal['hc check out day'];
  }

  const { error: updateError } = await supabase
    .from('proposal')
    .update(updateData)
    .eq('_id', proposalId);

  if (updateError) {
    console.error('[accept_counteroffer] Update error:', updateError);
    throw new Error(`Failed to accept counteroffer: ${updateError.message}`);
  }

  console.log('[accept_counteroffer] Counteroffer accepted for proposal:', proposalId);

  return {
    success: true,
    message: 'Counteroffer accepted - proceeding to lease drafting'
  };
}
