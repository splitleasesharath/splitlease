/**
 * Delete Proposal Action Handler
 * Deletes a proposal by ID (supports both _id and Unique ID)
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

interface DeleteProposalPayload {
  proposalId: string;
  deleteThread?: boolean;  // Whether to also delete the associated thread (default: true)
}

export async function handleDeleteProposal(
  payload: DeleteProposalPayload,
  supabase: SupabaseClient
) {
  const { proposalId, deleteThread = true } = payload;

  if (!proposalId) {
    throw new Error('proposalId is required');
  }

  console.log('[usability-data-admin] Deleting proposal:', proposalId);

  // First, try to find the proposal and get its thread ID
  let { data: proposal, error: fetchError } = await supabase
    .from('proposal')
    .select('_id, Thread')
    .eq('_id', proposalId)
    .single();

  // If not found by _id, try by Unique ID
  if (fetchError && fetchError.code === 'PGRST116') {
    const result = await supabase
      .from('proposal')
      .select('_id, Thread')
      .eq('Unique ID', proposalId)
      .single();

    proposal = result.data;
    fetchError = result.error;
  }

  if (fetchError) {
    if (fetchError.code === 'PGRST116') {
      throw new Error(`Proposal not found: ${proposalId}`);
    }
    console.error('[usability-data-admin] Fetch proposal error:', fetchError);
    throw new Error(`Failed to fetch proposal: ${fetchError.message}`);
  }

  const actualProposalId = proposal._id;
  const threadId = proposal.Thread;

  // Delete the proposal
  const { error: deleteError } = await supabase
    .from('proposal')
    .delete()
    .eq('_id', actualProposalId);

  if (deleteError) {
    console.error('[usability-data-admin] Delete proposal error:', deleteError);
    throw new Error(`Failed to delete proposal: ${deleteError.message}`);
  }

  console.log('[usability-data-admin] Proposal deleted:', actualProposalId);

  // Optionally delete the associated thread
  let threadDeleted = false;
  if (deleteThread && threadId) {
    const { error: threadDeleteError } = await supabase
      .from('message_threads')
      .delete()
      .eq('thread_id', threadId);

    if (threadDeleteError) {
      console.warn('[usability-data-admin] Failed to delete thread:', threadDeleteError);
    } else {
      threadDeleted = true;
      console.log('[usability-data-admin] Thread deleted:', threadId);
    }
  }

  const timestamp = new Date().toISOString();

  return {
    success: true,
    message: `Deleted proposal ${actualProposalId}`,
    proposalId: actualProposalId,
    threadId: threadId || null,
    threadDeleted,
    timestamp,
  };
}
