/**
 * Send Counteroffer Action Handler
 * Host sends a counteroffer, then guest automatically rejects it (simulated)
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

interface SendCounterofferPayload {
  simulationId: string;
  proposalId: string;
  counterofferData?: {
    nightlyPrice?: number;
    nightsPerWeek?: number;
    checkInDay?: number;
    checkOutDay?: number;
  };
}

interface AuthUser {
  id: string;
  email: string;
}

interface CounterofferResult {
  proposalId: string;
  status: string;
  counterofferSent: boolean;
  guestRejected: boolean;
  simulationId: string;
}

export async function handleSendCounteroffer(
  payload: SendCounterofferPayload,
  user: AuthUser,
  supabase: SupabaseClient
): Promise<CounterofferResult> {
  console.log('[sendCounteroffer] Starting for proposal:', payload.proposalId);

  const { simulationId, proposalId, counterofferData } = payload;

  if (!simulationId || !proposalId) {
    throw new Error('simulationId and proposalId are required');
  }

  // Verify proposal exists and belongs to this simulation
  const { data: proposal, error: fetchError } = await supabase
    .from('proposal')
    .select('_id, Status, simulation_id, "Guest Nightly Price", "Guest Nights per Week"')
    .eq('_id', proposalId)
    .single();

  if (fetchError || !proposal) {
    console.error('[sendCounteroffer] Proposal not found:', fetchError);
    throw new Error('Proposal not found');
  }

  if (proposal.simulation_id !== simulationId) {
    throw new Error('Proposal does not belong to this simulation');
  }

  // Default counteroffer values (10% higher price)
  const defaultCounteroffer = {
    nightlyPrice: Math.round((proposal['Guest Nightly Price'] || 100) * 1.1),
    nightsPerWeek: (proposal['Guest Nights per Week'] || 4) - 1,
    checkInDay: 3, // Wednesday
    checkOutDay: 0, // Sunday
  };

  const offer = { ...defaultCounteroffer, ...counterofferData };

  // Step 1: Update proposal with host counteroffer
  const { error: counterError } = await supabase
    .from('proposal')
    .update({
      'hc nightly price': offer.nightlyPrice,
      'hc nights per week': offer.nightsPerWeek,
      'hc check in day': offer.checkInDay,
      'hc check out day': offer.checkOutDay,
      Status: 'Host Counteroffer Sent',
      'Modified Date': new Date().toISOString(),
    })
    .eq('_id', proposalId);

  if (counterError) {
    console.error('[sendCounteroffer] Error sending counteroffer:', counterError);
    throw new Error('Failed to send counteroffer');
  }

  console.log('[sendCounteroffer] Counteroffer sent, simulating guest rejection...');

  // Step 2: Simulate guest rejection (after a brief pause conceptually)
  const { error: rejectError } = await supabase
    .from('proposal')
    .update({
      Status: 'Guest Rejected Host Counteroffer',
      'Modified Date': new Date().toISOString(),
    })
    .eq('_id', proposalId);

  if (rejectError) {
    console.error('[sendCounteroffer] Error simulating rejection:', rejectError);
    throw new Error('Failed to simulate guest rejection');
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
      .update({ 'Usability Step': 3 })
      .eq('_id', hostUser._id);
  }

  console.log('[sendCounteroffer] Completed - guest rejected counteroffer');

  return {
    proposalId,
    status: 'Guest Rejected Host Counteroffer',
    counterofferSent: true,
    guestRejected: true,
    simulationId,
  };
}
