/**
 * Initialize Simulation Handler
 *
 * Sets up the simulation context for a guest user.
 * Creates or loads test proposals for the simulation.
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

interface InitializePayload {
  guestId: string;
}

interface InitializeResult {
  simulationId: string;
  proposals: unknown[];
}

export async function handleInitialize(
  supabase: SupabaseClient,
  payload: InitializePayload
): Promise<InitializeResult> {
  const { guestId } = payload;

  if (!guestId) {
    throw new Error('guestId is required');
  }

  console.log(`[initialize] Setting up simulation for guest: ${guestId}`);

  // Generate a unique simulation ID
  const simulationId = `sim_guest_${guestId}_${Date.now()}`;

  // Check if there are existing test proposals for this guest
  const { data: existingProposals, error: fetchError } = await supabase
    .from('proposal')
    .select('*')
    .eq('guest_id', guestId)
    .ilike('notes', '%[SIMULATION]%')
    .limit(5);

  if (fetchError) {
    console.error('[initialize] Error fetching proposals:', fetchError);
    throw new Error('Failed to check existing proposals');
  }

  // If we have existing simulation proposals, use them
  if (existingProposals && existingProposals.length > 0) {
    console.log(`[initialize] Found ${existingProposals.length} existing simulation proposals`);
    return {
      simulationId,
      proposals: existingProposals
    };
  }

  // Otherwise, create mock proposals for the simulation
  // First, find a listing to use (prefer a test listing)
  const { data: listings, error: listingError } = await supabase
    .from('listing')
    .select('_id, title, host_id')
    .limit(1);

  if (listingError || !listings || listings.length === 0) {
    console.log('[initialize] No listings found, creating mock proposal data');
    // Return mock data if no real listings exist
    return {
      simulationId,
      proposals: [
        {
          _id: `mock_proposal_${Date.now()}`,
          guest_id: guestId,
          status: 'Pending Guest Deposit',
          schedule_type: 'nightly',
          days_per_week: 7,
          weeks_offset: 0,
          start_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
          end_date: new Date(Date.now() + 86400000 * 8).toISOString().split('T')[0],
          notes: '[SIMULATION] Test proposal for usability testing'
        }
      ]
    };
  }

  const listing = listings[0];

  // Create a simulation proposal
  const today = new Date();
  const startDate = new Date(today.getTime() + 86400000); // Tomorrow
  const endDate = new Date(startDate.getTime() + 86400000 * 28); // 4 weeks

  const { data: newProposal, error: createError } = await supabase
    .from('proposal')
    .insert({
      guest_id: guestId,
      listing_id: listing._id,
      host_id: listing.host_id,
      status: 'Pending Guest Deposit',
      schedule_type: 'nightly',
      days_per_week: 7,
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      notes: '[SIMULATION] Test proposal for usability testing',
      simulation_id: simulationId
    })
    .select()
    .single();

  if (createError) {
    console.error('[initialize] Error creating proposal:', createError);
    // Return mock data on error
    return {
      simulationId,
      proposals: [
        {
          _id: `mock_proposal_${Date.now()}`,
          guest_id: guestId,
          status: 'Pending Guest Deposit',
          schedule_type: 'nightly',
          days_per_week: 7,
          weeks_offset: 0,
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          notes: '[SIMULATION] Test proposal for usability testing'
        }
      ]
    };
  }

  console.log(`[initialize] Simulation initialized: ${simulationId}`);

  return {
    simulationId,
    proposals: newProposal ? [newProposal] : []
  };
}
