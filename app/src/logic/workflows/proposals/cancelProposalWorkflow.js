/**
 * Cancel Proposal Workflow
 *
 * PILLAR IV: Workflow Orchestrators (The "Flow" Layer)
 *
 * Implements the 7 variations of the cancel proposal workflow from Bubble.io:
 * - crkec5: Cancel Proposal (Condition 1) - Basic cancellation
 * - crswt2: Cancel Proposal (Condition 2) - Usual Order > 5 and House manual not empty
 * - crtCg2: Cancel Proposal (Condition 3) - Status is Cancelled or Rejected
 * - curuC4: Cancel Proposal (Condition 4) - Additional variation
 * - curuK4: Cancel Proposal (Condition 5) - Same as condition 2
 * - curua4: Cancel Proposal (Condition 6) - Same as condition 3
 * - crkZs5: Cancel Proposal in Compare Terms popup
 *
 * All cancellations result in:
 * - Status: 'Proposal Cancelled by Guest'
 * - Modified Date: current timestamp
 * - Optional: reason for cancellation
 */

import { supabase } from '../../../lib/supabase.js';
import { canCancelProposal, requiresSpecialCancellationConfirmation } from '../../rules/proposals/proposalRules.js';
import { PROPOSAL_STATUSES } from '../../constants/proposalStatuses.js';

/**
 * Evaluate which cancellation workflow condition applies
 *
 * @param {Object} proposal - Full proposal object
 * @returns {Object} Condition details with workflow info
 */
export function determineCancellationCondition(proposal) {
  if (!proposal) {
    return {
      condition: 'invalid',
      workflow: null,
      allowCancel: false,
      message: 'Invalid proposal data'
    };
  }

  const status = proposal.status || proposal.Status;

  // Condition 3 & 6: Already cancelled or rejected - just inform user
  if (
    status === PROPOSAL_STATUSES.CANCELLED_BY_GUEST.key ||
    status === PROPOSAL_STATUSES.CANCELLED_BY_SPLITLEASE.key ||
    status === PROPOSAL_STATUSES.REJECTED_BY_HOST.key
  ) {
    return {
      condition: 'already_cancelled',
      workflow: 'crtCg2',
      allowCancel: false,
      message: 'This proposal is already cancelled or rejected'
    };
  }

  // Check if can cancel based on rules
  if (!canCancelProposal(proposal)) {
    return {
      condition: 'not_cancellable',
      workflow: null,
      allowCancel: false,
      message: 'This proposal cannot be cancelled at this stage'
    };
  }

  // Condition 2 & 5: Usual Order > 5 AND House manual not empty
  if (requiresSpecialCancellationConfirmation(proposal)) {
    return {
      condition: 'high_order_with_manual',
      workflow: 'crswt2',
      allowCancel: true,
      requiresConfirmation: true,
      confirmationMessage: 'You have an active rental history. Are you sure you want to cancel? This may affect your standing with the host and future rental opportunities.'
    };
  }

  // Condition 1, 4, and default: Standard cancellation
  return {
    condition: 'standard',
    workflow: 'crkec5',
    allowCancel: true,
    requiresConfirmation: true,
    confirmationMessage: 'Are you sure you want to cancel this proposal? This action cannot be undone.'
  };
}

/**
 * Execute proposal cancellation in database
 *
 * @param {string} proposalId - Proposal ID to cancel
 * @param {string} reason - Optional reason for cancellation
 * @returns {Promise<Object>} Updated proposal data
 */
export async function executeCancelProposal(proposalId, reason = null) {
  if (!proposalId) {
    throw new Error('Proposal ID is required');
  }

  const now = new Date().toISOString();

  const updateData = {
    'Status': PROPOSAL_STATUSES.CANCELLED_BY_GUEST.key,
    'Modified Date': now
  };

  // Add reason if provided
  if (reason) {
    updateData['reason for cancellation'] = reason;
  }

  console.log('[cancelProposalWorkflow] Cancelling proposal:', proposalId);

  const { data, error } = await supabase
    .from('proposal')
    .update(updateData)
    .eq('_id', proposalId)
    .select()
    .single();

  if (error) {
    console.error('[cancelProposalWorkflow] Error cancelling proposal:', error);
    throw new Error(`Failed to cancel proposal: ${error.message}`);
  }

  console.log('[cancelProposalWorkflow] Proposal cancelled successfully:', proposalId);
  return data;
}

/**
 * Cancel proposal from Compare Terms modal (workflow crkZs5)
 * Same as regular cancellation but triggered from different UI location
 *
 * @param {string} proposalId - Proposal ID to cancel
 * @param {string} reason - Reason for cancellation
 * @returns {Promise<Object>} Updated proposal data
 */
export async function cancelProposalFromCompareTerms(proposalId, reason = 'Counteroffer declined') {
  console.log('[cancelProposalWorkflow] Cancel triggered from Compare Terms modal (workflow crkZs5)');
  return executeCancelProposal(proposalId, reason);
}

/**
 * Soft-delete a proposal (hide from user's list)
 *
 * Used for already-cancelled/rejected proposals where the guest just wants
 * to remove it from their view. Sets deleted = true without changing status.
 *
 * @param {string} proposalId - Proposal ID to delete
 * @returns {Promise<Object>} Updated proposal data
 */
export async function executeDeleteProposal(proposalId) {
  if (!proposalId) {
    throw new Error('Proposal ID is required');
  }

  const now = new Date().toISOString();

  console.log('[cancelProposalWorkflow] Soft-deleting proposal:', proposalId);

  const { data, error } = await supabase
    .from('proposal')
    .update({
      'Deleted': true,
      'Modified Date': now
    })
    .eq('_id', proposalId)
    .select()
    .single();

  if (error) {
    console.error('[cancelProposalWorkflow] Error deleting proposal:', error);
    throw new Error(`Failed to delete proposal: ${error.message}`);
  }

  console.log('[cancelProposalWorkflow] Proposal deleted successfully:', proposalId);
  return data;
}
