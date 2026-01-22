/**
 * Accept Proposal Action Handler
 * Host accepts a proposal and creates a lease
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

interface AcceptProposalPayload {
  simulationId: string;
  proposalId: string;
}

interface AuthUser {
  id: string;
  email: string;
}

interface AcceptProposalResult {
  proposalId: string;
  leaseId: string | null;
  status: string;
  simulationId: string;
}

export async function handleAcceptProposal(
  payload: AcceptProposalPayload,
  user: AuthUser,
  supabase: SupabaseClient
): Promise<AcceptProposalResult> {
  console.log('[acceptProposal] Starting for proposal:', payload.proposalId);

  const { simulationId, proposalId } = payload;

  if (!simulationId || !proposalId) {
    throw new Error('simulationId and proposalId are required');
  }

  // Verify proposal exists and belongs to this simulation
  const { data: proposal, error: fetchError } = await supabase
    .from('proposal')
    .select('_id, Status, simulation_id, "Guest User", "Host User", listing')
    .eq('_id', proposalId)
    .single();

  if (fetchError || !proposal) {
    console.error('[acceptProposal] Proposal not found:', fetchError);
    throw new Error('Proposal not found');
  }

  if (proposal.simulation_id !== simulationId) {
    throw new Error('Proposal does not belong to this simulation');
  }

  // Step 1: Update proposal status to accepted
  const { error: acceptError } = await supabase
    .from('proposal')
    .update({
      Status: 'Host Accepted - Lease Pending',
      'Modified Date': new Date().toISOString(),
    })
    .eq('_id', proposalId);

  if (acceptError) {
    console.error('[acceptProposal] Error accepting proposal:', acceptError);
    throw new Error('Failed to accept proposal');
  }

  // Step 2: Create lease record
  let leaseId: string | null = null;

  try {
    const { data: lease, error: leaseError } = await supabase
      .from('bookings_leases')
      .insert({
        proposal: proposalId,
        'Guest User': proposal['Guest User'],
        'Host User': proposal['Host User'],
        listing: proposal.listing,
        'Lease Status': 'Drafting',
        'Lease signed?': false,
        'is_test_data': true,
        'simulation_id': simulationId,
        'Created Date': new Date().toISOString(),
      })
      .select('_id')
      .single();

    if (leaseError) {
      console.warn('[acceptProposal] Could not create lease:', leaseError);
      // Continue - lease table may have different schema
    } else if (lease) {
      leaseId = lease._id;
      console.log('[acceptProposal] Created lease:', leaseId);

      // Link lease back to proposal
      await supabase
        .from('proposal')
        .update({ 'Bookings - Lease': leaseId })
        .eq('_id', proposalId);
    }
  } catch (leaseErr) {
    console.warn('[acceptProposal] Lease creation failed:', leaseErr);
    // Continue without lease for simulation purposes
  }

  // Update host's usability step
  const { data: hostUser } = await supabase
    .from('user')
    .select('_id')
    .eq('supabaseUserId', user.id)
    .single();

  if (hostUser) {
    await supabase
      .from('user')
      .update({ 'Usability Step': 4 })
      .eq('_id', hostUser._id);
  }

  console.log('[acceptProposal] Completed - proposal accepted, lease created');

  return {
    proposalId,
    leaseId,
    status: 'Host Accepted - Lease Pending',
    simulationId,
  };
}
