/**
 * Workflow: Accept a host's counteroffer proposal.
 *
 * @intent Orchestrate acceptance of host counteroffer following business rules.
 * @rule Only applicable when proposal status is "Host Countered".
 * @rule Updates status to "Accepted" and sets acceptance timestamp.
 * @rule Validates proposal can be accepted before attempting update.
 *
 * @param {object} params - Named parameters.
 * @param {object} params.supabase - Supabase client instance.
 * @param {object} params.proposal - Processed proposal object.
 * @param {function} params.canAcceptProposal - Rule function to check if acceptable.
 * @returns {Promise<object>} Result object with success status and message.
 *
 * @throws {Error} If required parameters are missing.
 *
 * @example
 * const result = await acceptProposalWorkflow({
 *   supabase,
 *   proposal: processedProposal,
 *   canAcceptProposal
 * })
 * // => { success: true, message: 'Proposal accepted', updated: true }
 */
import { PROPOSAL_STATUSES } from '../../constants/proposalStatuses.js'

export async function acceptProposalWorkflow({
  supabase,
  proposal,
  canAcceptProposal
}) {
  // Validation
  if (!supabase) {
    throw new Error('acceptProposalWorkflow: supabase client is required')
  }

  if (!proposal || !proposal.id) {
    throw new Error('acceptProposalWorkflow: proposal with id is required')
  }

  if (!canAcceptProposal) {
    throw new Error('acceptProposalWorkflow: canAcceptProposal rule function is required')
  }

  // Step 1: Check if acceptance is allowed
  const canAccept = canAcceptProposal({
    proposalStatus: proposal.status,
    deleted: proposal.deleted
  })

  if (!canAccept) {
    return {
      success: false,
      message: 'This proposal cannot be accepted (not in "Host Countered" status)',
      updated: false
    }
  }

  // Step 2: Update proposal status to "Accepted"
  try {
    const { error } = await supabase
      .from('proposal')
      .update({
        'Status': PROPOSAL_STATUSES.PROPOSAL_OR_COUNTEROFFER_ACCEPTED.key,
        'Modified Date': new Date().toISOString()
      })
      .eq('_id', proposal.id)

    if (error) {
      throw error
    }

    return {
      success: true,
      message: 'Proposal accepted successfully! The host will be notified.',
      updated: true
    }
  } catch (err) {
    return {
      success: false,
      message: `Failed to accept proposal: ${err.message}`,
      updated: false,
      error: err
    }
  }
}
