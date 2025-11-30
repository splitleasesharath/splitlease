/**
 * Guest Proposals Page Logic Hook
 *
 * Follows the Hollow Component Pattern:
 * - This hook contains ALL business logic
 * - The component contains ONLY JSX rendering
 *
 * Four-Layer Architecture:
 * - Uses constants from logic/constants/
 * - Uses queries from lib/proposals/
 * - Uses processors from lib/proposals/dataTransformers.js
 */

import { useState, useEffect, useCallback } from 'react';
import { fetchUserProposalsFromUrl } from '../../../lib/proposals/userProposalQueries.js';
import { updateUrlWithProposal, getUserIdFromPath } from '../../../lib/proposals/urlParser.js';
import { transformProposalData, getProposalDisplayText } from '../../../lib/proposals/dataTransformers.js';
import { getStatusConfig, getStageFromStatus } from '../../../logic/constants/proposalStatuses.js';
import { getAllStagesFormatted } from '../../../logic/constants/proposalStages.js';

/**
 * Main logic hook for Guest Proposals Page
 * @returns {Object} All state and handlers for the page
 */
export function useGuestProposalsPageLogic() {
  // ============================================================================
  // STATE
  // ============================================================================

  // Data state
  const [user, setUser] = useState(null);
  const [proposals, setProposals] = useState([]);
  const [selectedProposal, setSelectedProposal] = useState(null);

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  /**
   * Load user proposals from URL
   */
  const loadProposals = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchUserProposalsFromUrl();
      setUser(data.user);
      setProposals(data.proposals);
      setSelectedProposal(data.selectedProposal);
    } catch (err) {
      console.error('useGuestProposalsPageLogic: Error loading proposals:', err);
      setError(err.message || 'Failed to load proposals');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load data on mount
  useEffect(() => {
    loadProposals();
  }, [loadProposals]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  /**
   * Handle proposal selection change (from dropdown)
   * @param {string} proposalId - The ID of the selected proposal
   */
  const handleProposalSelect = useCallback((proposalId) => {
    const proposal = proposals.find(p => p._id === proposalId);
    if (proposal) {
      setSelectedProposal(proposal);

      // Update URL with selected proposal
      const userId = getUserIdFromPath();
      if (userId) {
        updateUrlWithProposal(userId, proposalId);
      }
    }
  }, [proposals]);

  /**
   * Retry loading after error
   */
  const handleRetry = useCallback(() => {
    loadProposals();
  }, [loadProposals]);

  // ============================================================================
  // DERIVED STATE
  // ============================================================================

  /**
   * Get transformed proposal data for display
   */
  const transformedProposal = selectedProposal
    ? transformProposalData(selectedProposal)
    : null;

  /**
   * Get status configuration for selected proposal
   */
  const statusConfig = selectedProposal
    ? getStatusConfig(selectedProposal.Status)
    : null;

  /**
   * Get current stage from status
   */
  const currentStage = selectedProposal
    ? getStageFromStatus(selectedProposal.Status)
    : null;

  /**
   * Get formatted stages for progress tracker
   */
  const formattedStages = currentStage
    ? getAllStagesFormatted(currentStage)
    : [];

  /**
   * Get dropdown options for proposal selector
   */
  const proposalOptions = proposals.map(p => ({
    id: p._id,
    label: getProposalDisplayText(transformProposalData(p))
  }));

  // ============================================================================
  // RETURN
  // ============================================================================

  return {
    // Raw data
    user,
    proposals,
    selectedProposal,

    // Transformed/derived data
    transformedProposal,
    statusConfig,
    currentStage,
    formattedStages,
    proposalOptions,

    // UI state
    isLoading,
    error,

    // Handlers
    handleProposalSelect,
    handleRetry
  };
}

export default useGuestProposalsPageLogic;
