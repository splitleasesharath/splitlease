/**
 * Create Quick Proposal Action Handler
 * Creates a proposal for usability testing
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

interface CreateQuickProposalPayload {
  listingId: string;
  guestId: string;
  moveInDate: string;
  selectedDayIndices: number[];  // 0-indexed (Sun=0, Sat=6)
  reservationWeeks: number;
  totalPrice: number;
  fourWeeksRent: number;
  nightlyPrice: number;
  notes?: string;
}

/**
 * Generate a unique Bubble-compatible ID
 */
async function generateBubbleId(supabase: SupabaseClient): Promise<string> {
  const { data, error } = await supabase.rpc('generate_bubble_id');
  if (error) {
    throw new Error(`Failed to generate ID: ${error.message}`);
  }
  return data;
}

export async function handleCreateQuickProposal(
  payload: CreateQuickProposalPayload,
  supabase: SupabaseClient
) {
  const {
    listingId,
    guestId,
    moveInDate,
    selectedDayIndices,
    reservationWeeks,
    totalPrice,
    fourWeeksRent,
    nightlyPrice,
    notes,
  } = payload;

  // Validate required fields
  if (!listingId) throw new Error('listingId is required');
  if (!guestId) throw new Error('guestId is required');
  if (!moveInDate) throw new Error('moveInDate is required');
  if (!selectedDayIndices || selectedDayIndices.length === 0) {
    throw new Error('selectedDayIndices must contain at least one day');
  }
  if (!reservationWeeks || reservationWeeks <= 0) {
    throw new Error('reservationWeeks must be a positive number');
  }

  console.log('[usability-data-admin] Creating quick proposal:', {
    listingId,
    guestId,
    moveInDate,
    selectedDayIndices,
    reservationWeeks,
  });

  // Get listing details to find the host
  const { data: listing, error: listingError } = await supabase
    .from('listing')
    .select('_id, "Host", "Unique ID", "Listing Name"')
    .eq('_id', listingId)
    .single();

  if (listingError) {
    console.error('[usability-data-admin] Fetch listing error:', listingError);
    throw new Error(`Failed to fetch listing: ${listingError.message}`);
  }

  const hostId = listing['Host'];
  if (!hostId) {
    throw new Error('Listing does not have a host');
  }

  // Generate unique IDs for proposal and thread
  const proposalId = await generateBubbleId(supabase);
  const threadId = await generateBubbleId(supabase);

  const timestamp = new Date().toISOString();

  // Create the proposal
  const proposalData = {
    _id: proposalId,
    'Unique ID': proposalId,
    Guest: guestId,
    Host: hostId,
    Listing: listingId,
    'Move in From': moveInDate,
    'Reservation Days (text)': JSON.stringify(selectedDayIndices),
    'Reservation Span': reservationWeeks,
    'T: 4 x weeks\' rent': fourWeeksRent,
    'Actual Reservation Price': totalPrice,
    'Nightly Rate': nightlyPrice,
    notes: notes || '',
    Status: 'Pending',
    'Status for Host': 'Pending',
    'Status for Guest': 'Pending',
    'Created Date': timestamp,
    'Modified Date': timestamp,
    Thread: threadId,
  };

  const { error: proposalError } = await supabase
    .from('proposal')
    .insert(proposalData);

  if (proposalError) {
    console.error('[usability-data-admin] Create proposal error:', proposalError);
    throw new Error(`Failed to create proposal: ${proposalError.message}`);
  }

  console.log('[usability-data-admin] Proposal created:', proposalId);

  // Create the message thread
  const threadData = {
    thread_id: threadId,
    host_id: hostId,
    guest_id: guestId,
    listing_id: listingId,
    proposal_id: proposalId,
    created_at: timestamp,
    updated_at: timestamp,
  };

  const { error: threadError } = await supabase
    .from('message_threads')
    .insert(threadData);

  if (threadError) {
    console.error('[usability-data-admin] Create thread error:', threadError);
    // Don't fail the whole operation if thread creation fails
    // The proposal is already created
    console.warn('[usability-data-admin] Thread creation failed, but proposal was created');
  } else {
    console.log('[usability-data-admin] Thread created:', threadId);
  }

  return {
    success: true,
    message: 'Proposal created successfully',
    proposalId,
    threadId,
    proposal: {
      id: proposalId,
      listingId,
      listingName: listing['Listing Name'],
      guestId,
      hostId,
      moveInDate,
      selectedDayIndices,
      reservationWeeks,
      totalPrice,
      fourWeeksRent,
      nightlyPrice,
      status: 'Pending',
    },
    timestamp,
  };
}
