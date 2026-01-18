/**
 * Guest Proposals Page Logic Hook (V7)
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
 * V7 Changes:
 * - Added expandedProposalId for accordion pattern
 * - Added proposal categorization (suggested vs user-created)
 * - Removed single selectedProposal in favor of all-visible cards
 *
 * Authentication:
 * - Page requires authenticated Guest user
 * - User ID comes from session, NOT URL
 * - Redirects to home if not authenticated or not a Guest
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchUserProposalsFromUrl } from '../../../lib/proposals/userProposalQueries.js';
import { updateUrlWithProposal, cleanLegacyUserIdFromUrl, getProposalIdFromQuery } from '../../../lib/proposals/urlParser.js';
import { transformProposalData, getProposalDisplayText } from '../../../lib/proposals/dataTransformers.js';
import { getStatusConfig, getStageFromStatus } from '../../../logic/constants/proposalStatuses.js';
import { getAllStagesFormatted } from '../../../logic/constants/proposalStages.js';
import { fetchStatusConfigurations, getButtonConfigForProposal, isStatusConfigCacheReady } from '../../../lib/proposals/statusButtonConfig.js';
import { checkAuthStatus, validateTokenAndFetchUser, getFirstName, getUserType } from '../../../lib/auth.js';
import { getUserId } from '../../../lib/secureStorage.js';
import { supabase } from '../../../lib/supabase.js';
import { isSLSuggested, isPendingConfirmation, isTerminalStatus } from './displayUtils.js';

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
  const [selectedProposal, setSelectedProposal] = useState(null); // Legacy: kept for backward compatibility
  const [statusConfigReady, setStatusConfigReady] = useState(false);

  // V7 UI state: Accordion pattern - only one card expanded at a time
  const [expandedProposalId, setExpandedProposalId] = useState(null);

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // ============================================================================
  // AUTHENTICATION CHECK
  // ============================================================================

  /**
   * Check authentication status and user type
   * Redirects if not authenticated or not a Guest
   *
   * Uses two-step auth pattern (same as FavoriteListingsPage, SearchPage, ViewSplitLeasePage):
   * 1. checkAuthStatus() - lightweight check for tokens/cookies
   * 2. validateTokenAndFetchUser() - validates token AND fetches user data including userType
   */
  useEffect(() => {
    async function checkAuth() {
      console.log('🔐 Guest Proposals: Checking authentication...');

      // Clean any legacy user ID from URL first
      cleanLegacyUserIdFromUrl();

      // Step 1: Lightweight auth check (tokens/cookies exist)
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

      // ========================================================================
      // GOLD STANDARD AUTH PATTERN - Step 2: Deep validation with clearOnFailure: false
      // ========================================================================
      const userData = await validateTokenAndFetchUser({ clearOnFailure: false });

      let userType = null;
      let isGuest = false;

      if (userData) {
        // Success path: Use validated user data
        userType = userData.userType;
        isGuest = userType === 'Guest' || userType?.includes('Guest');
        console.log('✅ Guest Proposals: User data loaded, userType:', userType);
      } else {
        // ========================================================================
        // GOLD STANDARD AUTH PATTERN - Step 3: Fallback to Supabase session metadata
        // ========================================================================
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          // Session valid but profile fetch failed - use session metadata
          userType = session.user.user_metadata?.user_type || getUserType() || null;
          isGuest = userType === 'Guest' || userType?.includes?.('Guest');
          console.log('⚠️ Guest Proposals: Using fallback session data, userType:', userType);

          // If we can't determine userType from session, redirect
          if (!userType) {
            console.log('❌ Guest Proposals: Cannot determine user type from session, redirecting');
            setAuthState({
              isChecking: false,
              isAuthenticated: true,
              isGuest: false,
              shouldRedirect: true,
              redirectReason: 'USER_TYPE_UNKNOWN'
            });
            window.location.href = '/';
            return;
          }
        } else {
          // No valid session - redirect
          console.log('❌ Guest Proposals: No valid session, redirecting to home');
          setAuthState({
            isChecking: false,
            isAuthenticated: false,
            isGuest: false,
            shouldRedirect: true,
            redirectReason: 'TOKEN_INVALID'
          });
          window.location.href = '/';
          return;
        }
      }

      // Check if user is a Guest (not a Host)
      // Database has inconsistent values: 'Guest' OR 'A Guest (I would like to rent a space)'

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
  // URL-BASED AUTO-EXPAND
  // ============================================================================

  /**
   * Auto-expand proposal card if proposal ID is in URL query parameter
   * This enables deep linking: /guest-proposals?proposal=<id> opens the card
   */
  useEffect(() => {
    // Wait until proposals are loaded
    if (proposals.length === 0 || isLoading) return;

    const proposalIdFromUrl = getProposalIdFromQuery();
    if (!proposalIdFromUrl) return;

    // Verify the proposal exists in the user's proposals
    const proposalExists = proposals.some(p => p._id === proposalIdFromUrl);
    if (proposalExists) {
      console.log('📂 Auto-expanding proposal from URL:', proposalIdFromUrl);
      setExpandedProposalId(proposalIdFromUrl);
    } else {
      console.warn('⚠️ Proposal ID from URL not found in user proposals:', proposalIdFromUrl);
    }
  }, [proposals, isLoading]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  /**
   * Handle proposal selection change (from dropdown) - Legacy support
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
   * V7: Toggle accordion card expansion
   * Only one card can be expanded at a time (accordion pattern)
   * @param {string} proposalId - The ID of the proposal to toggle
   */
  const handleToggleExpand = useCallback((proposalId) => {
    setExpandedProposalId(prevId => {
      const newId = prevId === proposalId ? null : proposalId;
      // Also update URL when expanding a card
      if (newId) {
        updateUrlWithProposal(newId);
      }
      return newId;
    });
  }, []);

  /**
   * Retry loading after error
   */
  const handleRetry = useCallback(() => {
    loadProposals();
  }, [loadProposals]);

  /**
   * Handle proposal deletion (soft-delete)
   * Removes proposal from UI state without requiring page reload
   * @param {string} proposalId - The ID of the deleted proposal
   */
  const handleProposalDeleted = useCallback((proposalId) => {
    // Remove deleted proposal from local state and update selected proposal atomically
    setProposals(prevProposals => {
      const remaining = prevProposals.filter(p => p._id !== proposalId);

      // If the deleted proposal was selected, select the first remaining one
      setSelectedProposal(prev => {
        if (prev?._id === proposalId) {
          return remaining.length > 0 ? remaining[0] : null;
        }
        return prev;
      });

      // V7: If the deleted proposal was expanded, collapse
      setExpandedProposalId(prevExpanded => {
        if (prevExpanded === proposalId) {
          return null;
        }
        return prevExpanded;
      });

      return remaining;
    });
  }, []);

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
  // V7: CATEGORIZED PROPOSALS
  // ============================================================================

  /**
   * Categorize proposals into "Suggested for You" and "Your Proposals"
   * - Suggested: SL-created proposals pending guest confirmation
   * - User: All other proposals (guest-submitted, confirmed, etc.)
   *
   * Sort order within each category:
   * - Non-terminal proposals first (active/pending)
   * - Then by creation date (newest first)
   */
  const categorizedProposals = useMemo(() => {
    const suggested = [];
    const userCreated = [];

    proposals.forEach(proposal => {
      const status = proposal.Status || '';

      // SL-suggested = has "Split Lease" in status AND pending confirmation
      // Once confirmed, it moves to "Your Proposals"
      const isSuggested = isSLSuggested(status) && isPendingConfirmation(status);

      if (isSuggested) {
        suggested.push(proposal);
      } else {
        userCreated.push(proposal);
      }
    });

    // Sort function: non-terminal first, then by date descending
    const sortProposals = (a, b) => {
      const aTerminal = isTerminalStatus(a.Status);
      const bTerminal = isTerminalStatus(b.Status);

      // Non-terminal comes first
      if (aTerminal !== bTerminal) {
        return aTerminal ? 1 : -1;
      }

      // Then by creation date (newest first)
      const aDate = new Date(a['Created Date'] || a.createdAt || 0);
      const bDate = new Date(b['Created Date'] || b.createdAt || 0);
      return bDate - aDate;
    };

    return {
      suggested: suggested.sort(sortProposals),
      userCreated: userCreated.sort(sortProposals)
    };
  }, [proposals]);

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

    // V7: Categorized proposals for section rendering
    categorizedProposals,

    // V7: Accordion state
    expandedProposalId,

    // Transformed/derived data (legacy support)
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
    handleToggleExpand, // V7: Accordion toggle
    handleRetry,
    handleProposalDeleted
  };
}

export default useGuestProposalsPageLogic;
