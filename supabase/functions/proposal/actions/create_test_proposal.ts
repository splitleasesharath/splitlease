/**
 * Create Test Proposal Action Handler
 *
 * Creates a test proposal for usability testing simulations.
 * Marks the proposal with isUsabilityTest flag for later cleanup.
 *
 * @param payload - Contains guestId, listingId, hostId, and proposal data
 * @param supabase - Supabase client with service role
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

interface CreateTestProposalPayload {
  guestId: string;
  listingId: string;
  hostId: string;
  isUsabilityTest: boolean;
  proposalData?: {
    moveInStart?: string;
    moveInEnd?: string;
    moveOut?: string;
    nightsPerWeek?: number;
    checkInDay?: number;
    checkOutDay?: number;
    nightlyPrice?: number;
  };
}

export async function handleCreateTestProposal(
  payload: CreateTestProposalPayload,
  supabase: SupabaseClient
): Promise<{ proposalId: string }> {
  console.log('[create_test_proposal] Starting with payload:', JSON.stringify(payload, null, 2));

  const { guestId, listingId, hostId, proposalData = {} } = payload;

  if (!guestId || !listingId) {
    throw new Error('guestId and listingId are required');
  }

  // Calculate default dates if not provided
  const now = new Date();
  const moveInStart = proposalData.moveInStart || new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const moveInEnd = proposalData.moveInEnd || new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const moveOut = proposalData.moveOut || new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Default proposal values for testing
  const nightsPerWeek = proposalData.nightsPerWeek || 4;
  const checkInDay = proposalData.checkInDay || 2; // Tuesday
  const checkOutDay = proposalData.checkOutDay || 6; // Saturday
  const nightlyPrice = proposalData.nightlyPrice || 125;

  // Calculate derived values
  const daysSelected = [];
  for (let d = checkInDay; d <= checkInDay + nightsPerWeek; d++) {
    daysSelected.push(d % 7); // 0-indexed day
  }

  // Create the test proposal
  const { data: proposal, error } = await supabase
    .from('proposal')
    .insert({
      Guest: guestId,
      Listing: listingId,
      'Host User': hostId,
      'Move in range start': moveInStart,
      'Move in range end': moveInEnd,
      'Move-out': moveOut,
      'nights per week (num)': nightsPerWeek,
      'check in day': checkInDay,
      'check out day': checkOutDay,
      'Days Selected': daysSelected,
      'proposal nightly price': nightlyPrice,
      Status: 'Host Review',
      'Created Date': new Date().toISOString(),
      'is_usability_test': true, // Mark as test data
      Comment: 'Test proposal created for usability simulation'
    })
    .select('_id')
    .single();

  if (error) {
    console.error('[create_test_proposal] Insert error:', error);
    throw new Error(`Failed to create test proposal: ${error.message}`);
  }

  console.log('[create_test_proposal] Created proposal:', proposal._id);

  return { proposalId: proposal._id };
}
