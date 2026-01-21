/**
 * Step A: Lease Documents Signed Handler
 *
 * Simulates the guest signing lease documents.
 * Creates or updates a lease record from the selected proposal.
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

interface StepAPayload {
  simulationId: string;
  proposalId: string;
}

interface StepAResult {
  lease: {
    id: string;
    proposalId: string;
    status: string;
    startDate: string;
    endDate: string;
    signedAt: string;
  };
}

export async function handleStepA(
  supabase: SupabaseClient,
  payload: StepAPayload
): Promise<StepAResult> {
  const { simulationId, proposalId } = payload;

  if (!simulationId || !proposalId) {
    throw new Error('simulationId and proposalId are required');
  }

  console.log(`[step_a] Processing lease signing for simulation: ${simulationId}`);

  // Fetch the proposal
  const { data: proposal, error: fetchError } = await supabase
    .from('proposal')
    .select('*')
    .eq('_id', proposalId)
    .single();

  if (fetchError || !proposal) {
    console.log('[step_a] Proposal not found, using mock data');
    // Return mock lease data
    const mockLease = {
      id: `mock_lease_${Date.now()}`,
      proposalId,
      status: 'Active',
      startDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      endDate: new Date(Date.now() + 86400000 * 29).toISOString().split('T')[0],
      signedAt: new Date().toISOString()
    };

    return { lease: mockLease };
  }

  // Check if a lease already exists for this proposal
  const { data: existingLease, error: leaseCheckError } = await supabase
    .from('lease')
    .select('*')
    .eq('proposal_id', proposalId)
    .single();

  if (existingLease) {
    console.log('[step_a] Existing lease found, returning it');
    return {
      lease: {
        id: existingLease._id || existingLease.id,
        proposalId,
        status: existingLease.status || 'Active',
        startDate: existingLease.start_date,
        endDate: existingLease.end_date,
        signedAt: existingLease.signed_at || existingLease.created_at
      }
    };
  }

  // Create a new lease (simulated)
  const leaseData = {
    proposal_id: proposalId,
    guest_id: proposal.guest_id,
    host_id: proposal.host_id,
    listing_id: proposal.listing_id,
    status: 'Active',
    start_date: proposal.start_date,
    end_date: proposal.end_date,
    signed_at: new Date().toISOString(),
    simulation_id: simulationId,
    notes: '[SIMULATION] Test lease for usability testing'
  };

  const { data: newLease, error: createError } = await supabase
    .from('lease')
    .insert(leaseData)
    .select()
    .single();

  if (createError) {
    console.error('[step_a] Error creating lease:', createError);
    // Return mock data on error
    return {
      lease: {
        id: `mock_lease_${Date.now()}`,
        proposalId,
        status: 'Active',
        startDate: proposal.start_date,
        endDate: proposal.end_date,
        signedAt: new Date().toISOString()
      }
    };
  }

  // Update proposal status
  await supabase
    .from('proposal')
    .update({ status: 'Lease Signed' })
    .eq('_id', proposalId);

  console.log(`[step_a] Lease created: ${newLease?._id || newLease?.id}`);

  return {
    lease: {
      id: newLease?._id || newLease?.id || `lease_${Date.now()}`,
      proposalId,
      status: 'Active',
      startDate: proposal.start_date,
      endDate: proposal.end_date,
      signedAt: new Date().toISOString()
    }
  };
}
