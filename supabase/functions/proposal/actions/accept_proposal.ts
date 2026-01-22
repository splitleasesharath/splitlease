/**
 * Accept Proposal Action Handler
 *
 * Accepts a proposal on behalf of the host.
 * Used in usability simulations to simulate host acceptance.
 *
 * @param payload - Contains proposalId and test flags
 * @param supabase - Supabase client with service role
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

interface AcceptProposalPayload {
  proposalId: string;
  isUsabilityTest?: boolean;
  hostPersona?: string; // e.g., "Host #2" for simulation tracking
}

export async function handleAcceptProposal(
  payload: AcceptProposalPayload,
  supabase: SupabaseClient
): Promise<{ success: boolean; message: string }> {
  console.log('[accept_proposal] Starting with proposalId:', payload.proposalId);

  const { proposalId, isUsabilityTest = false, hostPersona } = payload;

  if (!proposalId) {
    throw new Error('proposalId is required');
  }

  // Update proposal status to accepted
  const { error: updateError } = await supabase
    .from('proposal')
    .update({
      Status: 'Accepted - Drafting Lease',
      'acceptance_date': new Date().toISOString(),
      'Modified Date': new Date().toISOString(),
      ...(hostPersona && { 'accepted_by_persona': hostPersona })
    })
    .eq('_id', proposalId);

  if (updateError) {
    console.error('[accept_proposal] Update error:', updateError);
    throw new Error(`Failed to accept proposal: ${updateError.message}`);
  }

  console.log('[accept_proposal] Proposal accepted:', proposalId);

  // For usability tests, we may want to trigger notifications
  // but since requirements say "no, the contrary" for email suppression,
  // we keep notifications enabled

  return {
    success: true,
    message: `Proposal accepted${hostPersona ? ` by ${hostPersona}` : ''}`
  };
}
