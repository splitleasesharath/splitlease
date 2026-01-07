/**
 * Suggested Proposal Service
 *
 * API layer for fetching and managing suggested proposals.
 * Uses native Supabase field names throughout.
 */

import { supabase } from '../../../lib/supabase.js';
import { loadProposalDetails } from '../../../lib/proposalDataFetcher.js';
import { isSuggestedProposal } from '../../../logic/constants/proposalStatuses.js';

/**
 * Fetch all suggested proposals for a user
 *
 * @param {string} userId - The user's _id
 * @returns {Promise<Array>} Array of enriched proposal objects
 */
export async function fetchSuggestedProposals(userId) {
  if (!userId) {
    console.warn('fetchSuggestedProposals: No userId provided');
    return [];
  }

  try {
    // Step 1: Fetch user's proposals list
    const { data: userData, error: userError } = await supabase
      .from('user')
      .select('"Proposals List"')
      .eq('_id', userId)
      .single();

    if (userError) {
      console.error('Error fetching user proposals list:', userError);
      return [];
    }

    const proposalIds = userData?.['Proposals List'];

    if (!proposalIds || !Array.isArray(proposalIds) || proposalIds.length === 0) {
      console.log('No proposals found in user\'s Proposals List');
      return [];
    }

    // Step 2: Fetch all proposals
    const { data: proposalsData, error: proposalsError } = await supabase
      .from('proposal')
      .select('*')
      .in('_id', proposalIds)
      .or('Deleted.is.null,Deleted.eq.false')
      .order('Created Date', { ascending: false });

    if (proposalsError) {
      console.error('Error fetching proposals:', proposalsError);
      return [];
    }

    // Step 3: Filter to only suggested proposals
    const suggestedProposals = (proposalsData || []).filter(
      p => isSuggestedProposal(p.Status)
    );

    console.log(`Found ${suggestedProposals.length} suggested proposals out of ${proposalsData?.length || 0} total`);

    if (suggestedProposals.length === 0) {
      return [];
    }

    // Step 4: Enrich each proposal with listing, guest, host data
    const enrichedProposals = await Promise.all(
      suggestedProposals.map(proposal => loadProposalDetails(proposal))
    );

    // Step 5: Fetch negotiation summaries if available
    const proposalIdsForSummaries = enrichedProposals.map(p => p._id);
    const { data: summariesData } = await supabase
      .from('negotiationsummary')
      .select('*')
      .in('proposal_associated', proposalIdsForSummaries)
      .order('Created Date', { ascending: false });

    // Attach summaries to proposals
    if (summariesData && summariesData.length > 0) {
      const summaryMap = {};
      summariesData.forEach(summary => {
        const proposalId = summary.proposal_associated;
        if (!summaryMap[proposalId]) {
          summaryMap[proposalId] = [];
        }
        summaryMap[proposalId].push(summary);
      });

      enrichedProposals.forEach(proposal => {
        proposal._negotiationSummaries = summaryMap[proposal._id] || [];
      });
    }

    return enrichedProposals;
  } catch (err) {
    console.error('Exception in fetchSuggestedProposals:', err);
    return [];
  }
}

/**
 * Mark a suggested proposal as "interested"
 *
 * This transitions the proposal from suggested status to active status,
 * indicating the guest wants to proceed with this suggestion.
 *
 * @param {string} proposalId - The proposal's _id
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function markProposalInterested(proposalId) {
  if (!proposalId) {
    return { success: false, error: 'No proposal ID provided' };
  }

  try {
    // Update proposal status to indicate guest interest
    // This moves it from "Suggested" to "Awaiting Rental Application"
    const { error } = await supabase
      .from('proposal')
      .update({
        Status: 'Proposal Submitted by guest - Awaiting Rental Application',
        'Modified Date': new Date().toISOString()
      })
      .eq('_id', proposalId);

    if (error) {
      console.error('Error marking proposal interested:', error);
      return { success: false, error: error.message };
    }

    console.log(`Marked proposal ${proposalId} as interested`);
    return { success: true };
  } catch (err) {
    console.error('Exception marking proposal interested:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Dismiss/remove a suggested proposal
 *
 * This soft-deletes the proposal or marks it as not interested,
 * removing it from the suggestions list.
 *
 * @param {string} proposalId - The proposal's _id
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function dismissProposal(proposalId) {
  if (!proposalId) {
    return { success: false, error: 'No proposal ID provided' };
  }

  try {
    // Soft delete the proposal
    const { error } = await supabase
      .from('proposal')
      .update({
        Deleted: true,
        'Modified Date': new Date().toISOString()
      })
      .eq('_id', proposalId);

    if (error) {
      console.error('Error dismissing proposal:', error);
      return { success: false, error: error.message };
    }

    console.log(`Dismissed proposal ${proposalId}`);
    return { success: true };
  } catch (err) {
    console.error('Exception dismissing proposal:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Get a single suggested proposal by ID with full details
 *
 * @param {string} proposalId - The proposal's _id
 * @returns {Promise<Object|null>} Enriched proposal or null
 */
export async function getSuggestedProposal(proposalId) {
  if (!proposalId) return null;

  try {
    const { data, error } = await supabase
      .from('proposal')
      .select('*')
      .eq('_id', proposalId)
      .single();

    if (error || !data) {
      console.error('Error fetching proposal:', error);
      return null;
    }

    // Verify it's a suggested proposal
    if (!isSuggestedProposal(data.Status)) {
      console.warn('Proposal is not a suggested proposal:', data.Status);
      return null;
    }

    // Enrich with related data
    return await loadProposalDetails(data);
  } catch (err) {
    console.error('Exception fetching suggested proposal:', err);
    return null;
  }
}
