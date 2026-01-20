import { useMemo } from 'react';
import { computeProposalButtonStates } from '../logic/rules/proposals/proposalButtonRules.js';

/**
 * Hook to compute button states for a proposal card.
 * @param {object} params - Named parameters
 * @returns {object} Button states
 */
export function useProposalButtonStates(params) {
  return useMemo(() => computeProposalButtonStates(params), [
    params.proposal,
    params.virtualMeeting,
    params.guest,
    params.listing,
    params.currentUserId
  ]);
}
