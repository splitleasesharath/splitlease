/**
 * Proposal Handler
 * Creates a new proposal via Bubble workflow, then syncs to Supabase
 *
 * Flow:
 * 1. Call Bubble workflow CORE-create-proposal-code to create proposal (returns proposal_id)
 * 2. Sync the proposal to Supabase using the returned ID
 * 3. Update user's proposal list in Supabase
 *
 * Adapted from Bubble workflow: CORE-create_proposal-NEW
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { validateRequiredFields } from '../../_shared/validation.ts';
import { BubbleApiError } from '../../_shared/errors.ts';

// ============================================================================
// TYPES
// ============================================================================

interface CreateProposalPayload {
  // Required fields
  guestId: string;              // Bubble user _id
  listingId: string;            // Bubble listing _id
  moveInStartRange: string;     // ISO date string
  moveInEndRange: string;       // ISO date string
  daysSelected: number[];       // Array of day numbers (Bubble format: 1-7)
  nightsSelected: number[];     // Array of night numbers (Bubble format: 1-7)
  reservationSpan: string;      // "13 weeks (3 months)", "20 weeks", etc.
  reservationSpanWeeks: number; // Number of weeks
  checkInDay: number;           // Day number (Bubble format: 1-7)
  checkOutDay: number;          // Day number (Bubble format: 1-7)
  proposalPrice: number;        // Nightly price proposed
  fourWeekRent: number;         // 4-week rental price
  hostCompensation: number;     // Per-period host compensation
  needForSpace: string;         // Guest's reason for needing space
  aboutMe: string;              // Guest's bio/about text
  estimatedBookingTotal: number; // Total estimated cost
  numberOfMatches?: number;     // Number of listing matches

  // Optional fields
  guestFlexibility?: string;
  preferredGender?: string;
  specialNeeds?: string;
  fourWeekCompensation?: number;
  moveInRangeText?: string;
  flexibleMoveIn?: boolean;
  status?: string;              // Override status if provided
  suggestedReason?: string;
  originProposal?: string;
}

interface ProposalResult {
  proposalId: string;
  status: string;
  success: boolean;
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

export async function handleCreateProposal(
  payload: CreateProposalPayload
): Promise<ProposalResult> {
  console.log('[Proposal Handler] ========== CREATE PROPOSAL ==========');
  console.log('[Proposal Handler] Guest ID:', payload.guestId);
  console.log('[Proposal Handler] Listing ID:', payload.listingId);

  // Validate required fields
  validateRequiredFields(payload, [
    'guestId',
    'listingId',
    'moveInStartRange',
    'moveInEndRange',
    'daysSelected',
    'nightsSelected',
    'reservationSpan',
    'reservationSpanWeeks',
    'checkInDay',
    'checkOutDay',
    'proposalPrice',
    'fourWeekRent',
    'hostCompensation',
    'needForSpace',
    'aboutMe',
    'estimatedBookingTotal'
  ]);

  // Get environment variables
  const bubbleBaseUrl = Deno.env.get('BUBBLE_API_BASE_URL');
  const bubbleApiKey = Deno.env.get('BUBBLE_API_KEY');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!bubbleBaseUrl || !bubbleApiKey) {
    throw new Error('Bubble API configuration missing');
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase configuration missing');
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    // ========================================================================
    // STEP 1: Call Bubble workflow to create proposal
    // ========================================================================
    console.log('[Proposal Handler] Step 1: Calling Bubble workflow CORE-create-proposal-code...');

    const bubbleWorkflowUrl = `${bubbleBaseUrl}/wf/CORE-create-proposal-code`;

    // Prepare Bubble workflow parameters
    // Map our payload to Bubble's expected parameter names
    const bubbleParams = {
      comment: payload.aboutMe,
      listing: payload.listingId,
      guest: payload.guestId,
      'proposal price': payload.proposalPrice,
      'move in start range': payload.moveInStartRange,
      'move in end range': payload.moveInEndRange,
      'days selected': payload.daysSelected,
      'reservation span': payload.reservationSpanWeeks,
      'reservation span (option set)': payload.reservationSpan,
      'estimated booking total': payload.estimatedBookingTotal,
      'guest flexibility': payload.guestFlexibility || '',
      'preferred gender': payload.preferredGender || '',
      'need for space': payload.needForSpace,
      'host compensation': payload.hostCompensation,
      'about me': payload.aboutMe,
      'special needs': payload.specialNeeds || '',
      'nights selected': payload.nightsSelected,
      'check out': payload.checkOutDay,
      'check in': payload.checkInDay,
      'number of matches': payload.numberOfMatches || 0,
      '4 week rent': payload.fourWeekRent,
      'status': payload.status || '',
      'suggested reason': payload.suggestedReason || '',
      'origin proposal': payload.originProposal || '',
      '4 week compensation': payload.fourWeekCompensation || 0,
      'move-in range text': payload.moveInRangeText || '',
      'flexible move in': payload.flexibleMoveIn || false,
    };

    console.log('[Proposal Handler] Bubble workflow params:', JSON.stringify(bubbleParams, null, 2));

    const bubbleResponse = await fetch(bubbleWorkflowUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${bubbleApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bubbleParams),
    });

    console.log('[Proposal Handler] Bubble response status:', bubbleResponse.status);

    if (!bubbleResponse.ok) {
      const errorText = await bubbleResponse.text();
      console.error('[Proposal Handler] Bubble workflow failed:', errorText);
      throw new BubbleApiError(
        `Bubble workflow failed: ${bubbleResponse.status} ${bubbleResponse.statusText}`,
        bubbleResponse.status,
        errorText
      );
    }

    const bubbleData = await bubbleResponse.json();
    console.log('[Proposal Handler] Bubble response data:', JSON.stringify(bubbleData, null, 2));

    // Extract proposal_id from response
    // The workflow returns { response: { proposal_id: "..." } } or { proposal_id: "..." }
    const proposalId = bubbleData?.response?.proposal_id
      || bubbleData?.proposal_id
      || bubbleData?.response?.id
      || bubbleData?.id;

    if (!proposalId) {
      console.error('[Proposal Handler] No proposal_id in Bubble response:', bubbleData);
      throw new BubbleApiError(
        'Bubble workflow did not return proposal_id',
        500,
        bubbleData
      );
    }

    console.log('[Proposal Handler] Proposal created in Bubble with ID:', proposalId);

    // ========================================================================
    // STEP 2: Fetch the proposal from Bubble and sync to Supabase
    // ========================================================================
    console.log('[Proposal Handler] Step 2: Fetching proposal from Bubble Data API...');

    const bubbleFetchUrl = `${bubbleBaseUrl}/obj/proposal/${proposalId}`;
    const fetchResponse = await fetch(bubbleFetchUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${bubbleApiKey}`,
      },
    });

    if (!fetchResponse.ok) {
      console.error('[Proposal Handler] Failed to fetch proposal from Bubble');
      // Don't fail - the proposal was created, just log warning
      console.warn('[Proposal Handler] Warning: Could not sync to Supabase, but proposal was created in Bubble');
    } else {
      const proposalData = await fetchResponse.json();
      const proposalRecord = proposalData.response || proposalData;

      console.log('[Proposal Handler] Fetched proposal data, syncing to Supabase...');

      // Sync to Supabase
      const { error: syncError } = await supabase
        .from('proposal')
        .upsert(proposalRecord, { onConflict: '_id' });

      if (syncError) {
        console.error('[Proposal Handler] Supabase sync error:', syncError);
        console.warn('[Proposal Handler] Warning: Failed to sync to Supabase, but proposal was created in Bubble');
      } else {
        console.log('[Proposal Handler] Proposal synced to Supabase');
      }
    }

    // ========================================================================
    // STEP 3: Update guest's proposal list in Supabase
    // ========================================================================
    console.log('[Proposal Handler] Step 3: Updating guest proposal list in Supabase...');

    // Fetch current guest data
    const { data: guestData, error: guestFetchError } = await supabase
      .from('user')
      .select('"_id", "Proposals List"')
      .eq('_id', payload.guestId)
      .single();

    if (guestFetchError) {
      console.warn('[Proposal Handler] Could not fetch guest data:', guestFetchError);
    } else if (guestData) {
      const currentProposals: string[] = guestData['Proposals List'] || [];

      // Only add if not already in list
      if (!currentProposals.includes(proposalId)) {
        const updatedProposals = [...currentProposals, proposalId];

        const { error: updateError } = await supabase
          .from('user')
          .update({
            'Proposals List': updatedProposals,
            'updated_at': new Date().toISOString(),
          })
          .eq('_id', payload.guestId);

        if (updateError) {
          console.warn('[Proposal Handler] Failed to update guest proposal list:', updateError);
        } else {
          console.log('[Proposal Handler] Guest proposal list updated');
        }
      }
    }

    // ========================================================================
    // SUCCESS
    // ========================================================================
    console.log('[Proposal Handler] ========== SUCCESS ==========');
    console.log('[Proposal Handler] Proposal ID:', proposalId);

    return {
      proposalId,
      status: 'created',
      success: true,
    };

  } catch (error) {
    console.error('[Proposal Handler] ========== ERROR ==========');
    console.error('[Proposal Handler] Failed to create proposal:', error);
    throw error;
  }
}
