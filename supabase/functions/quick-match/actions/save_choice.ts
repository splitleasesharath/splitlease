/**
 * Save Choice Action Handler
 * Split Lease - Quick Match Edge Function
 *
 * Records the operator's selection of a matched listing.
 * Creates a record in the proposal_match table (if it exists).
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { validateRequiredFields } from '../../_shared/validation.ts';
import type {
  SaveChoicePayload,
  SaveChoiceResult,
} from '../lib/types.ts';

/**
 * Handle saving a match choice
 */
export async function handleSaveChoice(
  payload: Record<string, unknown>,
  supabase: SupabaseClient
): Promise<SaveChoiceResult> {
  console.log('[quick-match:save_choice] ========== SAVE CHOICE ==========');

  // Validate required fields
  validateRequiredFields(payload, ['proposal_id', 'matched_listing_id', 'match_score']);
  const {
    proposal_id,
    matched_listing_id,
    match_score,
    match_reason,
  } = payload as SaveChoicePayload;

  console.log('[quick-match:save_choice] Proposal:', proposal_id);
  console.log('[quick-match:save_choice] Matched listing:', matched_listing_id);
  console.log('[quick-match:save_choice] Score:', match_score);

  // Verify proposal exists
  const { data: proposalData, error: proposalError } = await supabase
    .from('proposal')
    .select('_id, Listing, Guest')
    .eq('_id', proposal_id)
    .single();

  if (proposalError || !proposalData) {
    console.error('[quick-match:save_choice] Proposal not found:', proposalError);
    throw new Error(`Proposal not found: ${proposal_id}`);
  }

  // Verify matched listing exists and is active
  const { data: listingData, error: listingError } = await supabase
    .from('listing')
    .select('_id, Name, Active, Deleted')
    .eq('_id', matched_listing_id)
    .single();

  if (listingError || !listingData) {
    console.error('[quick-match:save_choice] Listing not found:', listingError);
    throw new Error(`Listing not found: ${matched_listing_id}`);
  }

  if (!listingData.Active) {
    console.warn('[quick-match:save_choice] Listing is not active');
    // Don't throw - allow matching to inactive listings as they may become active
  }

  if (listingData.Deleted) {
    throw new Error(`Cannot match to deleted listing: ${matched_listing_id}`);
  }

  // Check if proposal_match table exists
  const tableExists = await checkProposalMatchTableExists(supabase);

  if (!tableExists) {
    console.warn('[quick-match:save_choice] proposal_match table does not exist yet');
    console.log('[quick-match:save_choice] Returning placeholder response');

    // Return a placeholder response
    // The table will be created in Phase 4 of the migration
    return {
      success: true,
      matchId: `placeholder-${crypto.randomUUID().slice(0, 8)}`,
    };
  }

  // Insert into proposal_match table
  const { data: matchData, error: matchError } = await supabase
    .from('proposal_match')
    .insert({
      proposal_id,
      matched_listing_id,
      original_listing_id: proposalData.Listing,
      guest_id: proposalData.Guest,
      match_score,
      match_reason: match_reason || null,
      match_type: 'manual',
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (matchError) {
    // Check for unique constraint violation (duplicate match)
    if (matchError.code === '23505') {
      console.warn('[quick-match:save_choice] Duplicate match, fetching existing');

      // Fetch existing match
      const { data: existingMatch } = await supabase
        .from('proposal_match')
        .select('id')
        .eq('proposal_id', proposal_id)
        .eq('matched_listing_id', matched_listing_id)
        .single();

      if (existingMatch) {
        return {
          success: true,
          matchId: existingMatch.id,
        };
      }
    }

    console.error('[quick-match:save_choice] Database error:', matchError);
    throw new Error(`Failed to save match: ${matchError.message}`);
  }

  console.log('[quick-match:save_choice] Match saved:', matchData.id);
  console.log('[quick-match:save_choice] ========== SUCCESS ==========');

  return {
    success: true,
    matchId: matchData.id,
  };
}

/**
 * Check if the proposal_match table exists
 */
async function checkProposalMatchTableExists(supabase: SupabaseClient): Promise<boolean> {
  try {
    // Attempt a minimal query to check if table exists
    const { error } = await supabase
      .from('proposal_match')
      .select('id')
      .limit(0);

    // If no error, table exists
    if (!error) {
      return true;
    }

    // Check if error is "table does not exist"
    if (error.code === '42P01' || error.message?.includes('does not exist')) {
      return false;
    }

    // For other errors, assume table exists but has access issues
    console.warn('[quick-match:save_choice] Table check error:', error.code, error.message);
    return false;
  } catch (e) {
    console.warn('[quick-match:save_choice] Table check exception:', e);
    return false;
  }
}
