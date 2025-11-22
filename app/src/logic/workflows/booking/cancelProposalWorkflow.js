/**
 * Workflow: Cancel a proposal with complex decision tree.
 *
 * @intent Orchestrate proposal cancellation following business rules.
 * @rule Implements complete cancellation decision tree (7 variations).
 * @rule Different actions based on: source, current status, usual order, house manual access.
 * @rule Updates Supabase with appropriate status and cancellation reason.
 *
 * Decision Tree (from WORKFLOW-PASS2-ASSIMILATION.md):
 * 1. Already cancelled → Show alert, no action
 * 2. Compare modal source + Usual Order ≤5 → Status: "Cancelled by Guest"
 * 3. Compare modal source + Usual Order >5 → Alert to call, no DB update
 * 4. Main page + Usual Order ≤5 + No house manual → Status: "Cancelled by Guest"
 * 5. Main page + Usual Order >5 + No house manual → Alert to call, no DB update
 * 6. Main page + Usual Order ≤5 + Has house manual → Alert to call, no DB update
 * 7. Main page + Usual Order >5 + Has house manual → Alert to call, no DB update
 *
 * @param {object} params - Named parameters.
 * @param {object} params.supabase - Supabase client instance.
 * @param {object} params.proposal - Processed proposal object.
 * @param {string} params.source - 'main' | 'compare-modal' | 'other'.
 * @param {function} params.canCancelProposal - Rule function to check if cancellable.
 * @returns {Promise<object>} Result object with success status and message.
 *
 * @throws {Error} If required parameters are missing.
 *
 * @example
 * const result = await cancelProposalWorkflow({
 *   supabase,
 *   proposal: processedProposal,
 *   source: 'main',
 *   canCancelProposal
 * })
 * // => { success: true, message: 'Proposal cancelled', updated: true }
 */
export async function cancelProposalWorkflow({
  supabase,
  proposal,
  source = 'main',
  canCancelProposal
}) {
  // Validation
  if (!supabase) {
    throw new Error('cancelProposalWorkflow: supabase client is required')
  }

  if (!proposal || !proposal.id) {
    throw new Error('cancelProposalWorkflow: proposal with id is required')
  }

  if (!canCancelProposal) {
    throw new Error('cancelProposalWorkflow: canCancelProposal rule function is required')
  }

  // Step 1: Check if cancellation is allowed
  const canCancel = canCancelProposal({
    proposalStatus: proposal.status,
    deleted: proposal.deleted
  })

  if (!canCancel) {
    return {
      success: false,
      message: 'This proposal cannot be cancelled (already in terminal state)',
      updated: false
    }
  }

  // Step 2: Extract decision factors
  const usualOrder = proposal.usualOrder || 0
  const hasAccessedHouseManual = proposal.houseManualAccessed === true
  const isFromCompareModal = source === 'compare-modal'

  // Step 3: Apply decision tree
  let shouldUpdateDatabase = false
  let alertMessage = null

  if (isFromCompareModal) {
    // Compare Modal Source
    if (usualOrder <= 5) {
      // Variation 2: Update database
      shouldUpdateDatabase = true
    } else {
      // Variation 3: Alert to call
      alertMessage = 'Please call Split Lease to cancel this proposal (Usual Order > 5)'
    }
  } else {
    // Main Page Source
    if (!hasAccessedHouseManual) {
      if (usualOrder <= 5) {
        // Variation 4: Update database
        shouldUpdateDatabase = true
      } else {
        // Variation 5: Alert to call
        alertMessage = 'Please call Split Lease to cancel this proposal (Usual Order > 5)'
      }
    } else {
      // Has accessed house manual - always alert to call (Variations 6 & 7)
      alertMessage = 'Please call Split Lease to cancel this proposal (House Manual accessed)'
    }
  }

  // Step 4: Execute action
  if (shouldUpdateDatabase) {
    try {
      const { error } = await supabase
        .from('proposal')
        .update({
          'Proposal Status': 'Cancelled by Guest',
          'Cancellation Reason': 'Guest initiated cancellation',
          'Modified Date': new Date().toISOString()
        })
        .eq('_id', proposal.id)

      if (error) {
        throw error
      }

      return {
        success: true,
        message: 'Proposal cancelled successfully',
        updated: true
      }
    } catch (err) {
      return {
        success: false,
        message: `Failed to cancel proposal: ${err.message}`,
        updated: false,
        error: err
      }
    }
  } else {
    // Alert only, no database update
    return {
      success: true,
      message: alertMessage,
      updated: false,
      requiresPhoneCall: true
    }
  }
}
