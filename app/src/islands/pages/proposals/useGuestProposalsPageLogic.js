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
 *
 * Authentication:
 * - Page requires authenticated Guest user
 * - User ID comes from session, NOT URL
 * - Redirects to home if not authenticated or not a Guest
 */

import { useState, useEffect, useCallback } from 'react';
import { fetchUserProposalsFromUrl } from '../../../lib/proposals/userProposalQueries.js';
import { updateUrlWithProposal, cleanLegacyUserIdFromUrl } from '../../../lib/proposals/urlParser.js';
import { transformProposalData, getProposalDisplayText } from '../../../lib/proposals/dataTransformers.js';
import { getStatusConfig, getStageFromStatus } from '../../../logic/constants/proposalStatuses.js';
import { getAllStagesFormatted } from '../../../logic/constants/proposalStages.js';
import { fetchStatusConfigurations, getButtonConfigForProposal, isStatusConfigCacheReady } from '../../../lib/proposals/statusButtonConfig.js';
import { checkAuthStatus, getUserType } from '../../../lib/auth.js';

/**
 * Main logic hook for Guest Proposals Page
 * @returns {Object} All state and handlers for the page
 */
export function useGuestProposalsPageLogic() {
  // ============================================================================
  // STATE
  // ============================================================================

  // Auth state
  const [authState, setAuthState] = useState({
    isChecking: true,
    isAuthenticated: false,
    isGuest: false,
    shouldRedirect: false,
    redirectReason: null
  });

  // Data state
  const [user, setUser] = useState(null);
  const [proposals, setProposals] = useState([]);
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [statusConfigReady, setStatusConfigReady] = useState(false);

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // ============================================================================
  // AUTHENTICATION CHECK
  // ============================================================================

  /**
   * Check authentication status and user type
   * Redirects if not authenticated or not a Guest
   */
  useEffect(() => {
    async function checkAuth() {
      console.log('🔐 Guest Proposals: Checking authentication...');

      // Clean any legacy user ID from URL first
      cleanLegacyUserIdFromUrl();

      // Check if user is authenticated
      const isAuthenticated = await checkAuthStatus();

      if (!isAuthenticated) {
        console.log('❌ Guest Proposals: User not authenticated, redirecting to home');
        setAuthState({
          isChecking: false,
          isAuthenticated: false,
          isGuest: false,
          shouldRedirect: true,
          redirectReason: 'NOT_AUTHENTICATED'
        });
        // Redirect to home page
        window.location.href = '/';
        return;
      }

      // Check if user is a Guest (not a Host)
      const userType = getUserType();
      const isGuest = userType === 'Guest';

      if (!isGuest) {
        console.log('❌ Guest Proposals: User is not a Guest (type:', userType, '), redirecting to home');
        setAuthState({
          isChecking: false,
          isAuthenticated: true,
          isGuest: false,
          shouldRedirect: true,
          redirectReason: 'NOT_GUEST'
        });
        // Redirect to home page
        window.location.href = '/';
        return;
      }

      console.log('✅ Guest Proposals: User authenticated as Guest');
      setAuthState({
        isChecking: false,
        isAuthenticated: true,
        isGuest: true,
        shouldRedirect: false,
        redirectReason: null
      });
    }

    checkAuth();
  }, []);

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  /**
   * Load user proposals from session and status configurations
   */
  const loadProposals = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch proposals and status configurations in parallel
      const [proposalData] = await Promise.all([
        fetchUserProposalsFromUrl(),
        fetchStatusConfigurations() // Caches for later use
      ]);

      setUser(proposalData.user);
      setProposals(proposalData.proposals);
      setSelectedProposal(proposalData.selectedProposal);
      setStatusConfigReady(isStatusConfigCacheReady());
    } catch (err) {
      console.error('useGuestProposalsPageLogic: Error loading proposals:', err);

      // Handle specific error types
      if (err.message === 'NOT_AUTHENTICATED') {
        // This shouldn't happen since we check auth first, but handle it
        window.location.href = '/';
        return;
      }

      setError(err.message || 'Failed to load proposals');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load data after auth check passes
  useEffect(() => {
    // Only load proposals if authenticated as Guest
    if (authState.isAuthenticated && authState.isGuest && !authState.isChecking) {
      loadProposals();
    }
  }, [authState.isAuthenticated, authState.isGuest, authState.isChecking, loadProposals]);

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

      // Update URL with selected proposal (no user ID in URL)
      updateUrlWithProposal(proposalId);
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

  /**
   * Get button configuration for selected proposal
   * Uses cached os_proposal_status data for dynamic labels
   */
  const buttonConfig = selectedProposal && statusConfigReady
    ? getButtonConfigForProposal(selectedProposal)
    : null;

  // ============================================================================
  // COMPUTED LOADING STATE
  // ============================================================================

  // Show loading if checking auth OR loading proposals
  const isPageLoading = authState.isChecking || isLoading;

  // ============================================================================
  // RETURN
  // ============================================================================

  return {
    // Auth state
    authState,

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
    buttonConfig,

    // UI state
    isLoading: isPageLoading,
    error,

    // Handlers
    handleProposalSelect,
    handleRetry
  };
}

export default useGuestProposalsPageLogic;
