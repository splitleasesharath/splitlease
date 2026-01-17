/**
 * Cancel Proposal Workflow
 *
 * PILLAR IV: Workflow Orchestrators (The "Flow" Layer)
 *
 * Consolidated workflow supporting multiple cancellation patterns:
 * - Standard cancellation with condition checking
 * - Compare Terms modal cancellation
 * - Decision tree mode (from booking/) with injected dependencies
 * - Soft-delete for already-cancelled proposals
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
 * Consolidated cancel proposal workflow with decision tree support
 *
 * Supports two modes:
 * 1. Simple mode (useDecisionTree=false): Direct cancellation via executeCancelProposal
 * 2. Decision tree mode (useDecisionTree=true): Complex business logic from booking/ version
 *
 * Decision Tree (when useDecisionTree=true):
 * 1. Already cancelled → Return message, no action
 * 2. Compare modal source + Usual Order ≤5 → Status: "Cancelled by Guest"
 * 3. Compare modal source + Usual Order >5 → Alert to call, no DB update
 * 4. Main page + Usual Order ≤5 + No house manual → Status: "Cancelled by Guest"
 * 5. Main page + Usual Order >5 + No house manual → Alert to call, no DB update
 * 6. Main page + Usual Order ≤5 + Has house manual → Alert to call, no DB update
 * 7. Main page + Usual Order >5 + Has house manual → Alert to call, no DB update
 *
 * @param {Object} params - Named parameters
 * @param {string} params.proposalId - Proposal ID to cancel
 * @param {Object} params.proposal - Optional full proposal for decision tree
 * @param {string} params.reason - Optional cancellation reason
 * @param {string} params.source - 'main' | 'compare-modal'
 * @param {boolean} params.useDecisionTree - When true, applies decision tree logic
 * @param {Object} params.supabase - Optional injected Supabase client (for testing)
 * @param {Function} params.canCancelProposal - Optional injected rule function (for testing)
 * @returns {Promise<Object>} Result with success status and message
 *
 * @example
 * // Simple mode
 * await cancelProposalWorkflow({ proposalId: 'abc123', reason: 'Changed plans' })
 *
 * // Decision tree mode
 * await cancelProposalWorkflow({
 *   proposalId: 'abc123',
 *   proposal: fullProposal,
 *   source: 'main',
 *   useDecisionTree: true
 * })
 */
export async function cancelProposalWorkflow({
  proposalId,
  proposal = null,
  reason = null,
  source = 'main',
  useDecisionTree = false,
  supabase: injectedSupabase = null,
  canCancelProposal: injectedCanCancelProposal = null
}) {
  // Use injected dependencies or defaults
  const supabaseClient = injectedSupabase || supabase;
  const canCancelFn = injectedCanCancelProposal || canCancelProposal;

  // Decision tree mode requires full proposal
  if (useDecisionTree && proposal) {
    // Validation
    if (!supabaseClient) {
      throw new Error('cancelProposalWorkflow: supabase client is required');
    }

    if (!proposal.id && !proposalId) {
      throw new Error('cancelProposalWorkflow: proposal with id is required');
    }

    if (!canCancelFn) {
      throw new Error('cancelProposalWorkflow: canCancelProposal rule function is required');
    }

    // Step 1: Check if cancellation is allowed
    const canCancel = canCancelFn({
      proposalStatus: proposal.status || proposal.Status,
      deleted: proposal.deleted || proposal.Deleted
    });

    if (!canCancel) {
      return {
        success: false,
        message: 'This proposal cannot be cancelled (already in terminal state)',
        updated: false
      };
    }

    // Step 2: Extract decision factors
    const usualOrder = proposal.usualOrder || proposal['Usual Order'] || 0;
    const hasAccessedHouseManual = proposal.houseManualAccessed === true || proposal['House Manual Accessed'] === true;
    const isFromCompareModal = source === 'compare-modal';

    // Step 3: Apply decision tree
    let shouldUpdateDatabase = false;
    let alertMessage = null;

    if (isFromCompareModal) {
      // Compare Modal Source
      if (usualOrder <= 5) {
        // Variation 2: Update database
        shouldUpdateDatabase = true;
      } else {
        // Variation 3: Alert to call
        alertMessage = 'Please call Split Lease to cancel this proposal (Usual Order > 5)';
      }
    } else {
      // Main Page Source
      if (!hasAccessedHouseManual) {
        if (usualOrder <= 5) {
          // Variation 4: Update database
          shouldUpdateDatabase = true;
        } else {
          // Variation 5: Alert to call
          alertMessage = 'Please call Split Lease to cancel this proposal (Usual Order > 5)';
        }
      } else {
        // Has accessed house manual - always alert to call (Variations 6 & 7)
        alertMessage = 'Please call Split Lease to cancel this proposal (House Manual accessed)';
      }
    }

    // Step 4: Execute action
    if (shouldUpdateDatabase) {
      try {
        const { error } = await supabaseClient
          .from('proposal')
          .update({
            'Status': PROPOSAL_STATUSES.CANCELLED_BY_GUEST.key,
            'reason for cancellation': reason || 'Guest initiated cancellation',
            'Modified Date': new Date().toISOString()
          })
          .eq('_id', proposal.id || proposalId);

        if (error) {
          throw error;
        }

        return {
          success: true,
          message: 'Proposal cancelled successfully',
          updated: true
        };
      } catch (err) {
        return {
          success: false,
          message: `Failed to cancel proposal: ${err.message}`,
          updated: false,
          error: err
        };
      }
    } else {
      // Alert only, no database update
      return {
        success: true,
        message: alertMessage,
        updated: false,
        requiresPhoneCall: true
      };
    }
  }

  // Simple mode: Direct cancellation
  if (!proposalId) {
    throw new Error('Proposal ID is required for simple cancellation');
  }

  try {
    await executeCancelProposal(proposalId, reason);
    return {
      success: true,
      message: 'Proposal cancelled successfully',
      updated: true
    };
  } catch (err) {
    return {
      success: false,
      message: err.message,
      updated: false,
      error: err
    };
  }
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

  const { error } = await supabase
    .from('proposal')
    .update({
      'Deleted': true,
      'Modified Date': now
    })
    .eq('_id', proposalId);

  if (error) {
    console.error('[cancelProposalWorkflow] Error deleting proposal:', error);
    throw new Error(`Failed to delete proposal: ${error.message}`);
  }

  console.log('[cancelProposalWorkflow] Proposal deleted successfully:', proposalId);
}
