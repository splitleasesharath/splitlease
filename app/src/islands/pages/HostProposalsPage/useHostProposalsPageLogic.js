/**
 * Host Proposals Page Logic Hook
 *
 * Follows the Hollow Component Pattern:
 * - ALL business logic is contained in this hook
 * - Page component only handles rendering
 *
 * Architecture:
 * - Uses Supabase Edge Functions for API calls
 * - Delegates to four-layer logic architecture
 */

import { useState, useEffect, useCallback } from 'react';
import { checkAuthStatus, validateTokenAndFetchUser } from '../../../lib/auth.js';
import { supabase } from '../../../lib/supabase.js';
import { isHost } from '../../../logic/rules/users/isHost.js';

/**
 * Hook for Host Proposals Page business logic
 */
export function useHostProposalsPageLogic() {
  // ============================================================================
  // AUTH STATE
  // ============================================================================
  const [authState, setAuthState] = useState({
    isChecking: true,
    isAuthenticated: false,
    shouldRedirect: false,
    userType: null
  });

  // ============================================================================
  // DATA STATE
  // ============================================================================
  const [user, setUser] = useState(null);
  const [listings, setListings] = useState([]);
  const [selectedListing, setSelectedListing] = useState(null);
  const [proposals, setProposals] = useState([]);
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // ============================================================================
  // UI STATE
  // ============================================================================
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // ============================================================================
  // AUTH CHECK
  // ============================================================================
  useEffect(() => {
    async function checkAuth() {
      try {
        const isLoggedIn = await checkAuthStatus();

        if (!isLoggedIn) {
          setAuthState({
            isChecking: false,
            isAuthenticated: false,
            shouldRedirect: true,
            userType: null
          });
          // Redirect to home
          window.location.href = '/';
          return;
        }

        // Validate token and get user data
        const userData = await validateTokenAndFetchUser();

        if (!userData) {
          setAuthState({
            isChecking: false,
            isAuthenticated: false,
            shouldRedirect: true,
            userType: null
          });
          window.location.href = '/';
          return;
        }

        // Check if user is a host
        const userType = userData['User Type'] || userData.userType;
        if (!isHost({ userType })) {
          console.warn('User is not a Host, redirecting...');
          setAuthState({
            isChecking: false,
            isAuthenticated: false,
            shouldRedirect: true,
            userType: userType
          });
          window.location.href = '/';
          return;
        }

        setUser(userData);
        setAuthState({
          isChecking: false,
          isAuthenticated: true,
          shouldRedirect: false,
          userType: userType
        });

        // Load host data
        await loadHostData(userData._id || userData.id);

      } catch (err) {
        console.error('Auth check failed:', err);
        setError('Authentication failed. Please log in again.');
        setAuthState({
          isChecking: false,
          isAuthenticated: false,
          shouldRedirect: true,
          userType: null
        });
      }
    }

    checkAuth();
  }, []);

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  /**
   * Load host listings and proposals
   */
  const loadHostData = async (userId) => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch host's listings via Edge Function
      const listingsResult = await fetchHostListings(userId);

      if (listingsResult.length > 0) {
        setListings(listingsResult);
        setSelectedListing(listingsResult[0]);

        // Fetch proposals for the first listing
        const proposalsResult = await fetchProposalsForListing(listingsResult[0]._id || listingsResult[0].id);
        setProposals(proposalsResult);
      } else {
        setListings([]);
        setProposals([]);
      }

    } catch (err) {
      console.error('Failed to load host data:', err);
      setError('Failed to load your listings and proposals. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Fetch host's listings from API
   */
  const fetchHostListings = async (userId) => {
    try {
      const { data, error } = await supabase.functions.invoke('bubble-proxy', {
        body: {
          action: 'getHostListings',
          hostId: userId
        }
      });

      if (error) throw error;

      return data?.listings || data?.response?.results || [];
    } catch (err) {
      console.error('Failed to fetch listings:', err);
      return [];
    }
  };

  /**
   * Fetch proposals for a specific listing
   */
  const fetchProposalsForListing = async (listingId) => {
    try {
      const { data, error } = await supabase.functions.invoke('bubble-proxy', {
        body: {
          action: 'getProposalsForListing',
          listingId: listingId
        }
      });

      if (error) throw error;

      return data?.proposals || data?.response?.results || [];
    } catch (err) {
      console.error('Failed to fetch proposals:', err);
      return [];
    }
  };

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  /**
   * Handle listing selection change
   */
  const handleListingChange = useCallback(async (listing) => {
    setSelectedListing(listing);
    setIsLoading(true);

    try {
      const proposalsResult = await fetchProposalsForListing(listing._id || listing.id);
      setProposals(proposalsResult);
    } catch (err) {
      console.error('Failed to load proposals for listing:', err);
      setError('Failed to load proposals. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Handle proposal card click - open modal
   */
  const handleProposalClick = useCallback((proposal) => {
    setSelectedProposal(proposal);
    setIsModalOpen(true);
  }, []);

  /**
   * Handle modal close
   */
  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedProposal(null);
  }, []);

  /**
   * Handle proposal deletion
   */
  const handleDeleteProposal = useCallback(async (proposal) => {
    if (!confirm('Are you sure you want to delete this proposal?')) {
      return;
    }

    try {
      const { error } = await supabase.functions.invoke('bubble-proxy', {
        body: {
          action: 'deleteProposal',
          proposalId: proposal._id || proposal.id
        }
      });

      if (error) throw error;

      // Remove from local state
      setProposals(prev => prev.filter(p => (p._id || p.id) !== (proposal._id || proposal.id)));

    } catch (err) {
      console.error('Failed to delete proposal:', err);
      alert('Failed to delete proposal. Please try again.');
    }
  }, []);

  /**
   * Handle accept proposal
   */
  const handleAcceptProposal = useCallback(async (proposal) => {
    try {
      const { error } = await supabase.functions.invoke('bubble-proxy', {
        body: {
          action: 'acceptProposal',
          proposalId: proposal._id || proposal.id
        }
      });

      if (error) throw error;

      // Refresh proposals
      if (selectedListing) {
        const proposalsResult = await fetchProposalsForListing(selectedListing._id || selectedListing.id);
        setProposals(proposalsResult);
      }

      handleCloseModal();
      alert('Proposal accepted successfully!');

    } catch (err) {
      console.error('Failed to accept proposal:', err);
      alert('Failed to accept proposal. Please try again.');
    }
  }, [selectedListing, handleCloseModal]);

  /**
   * Handle reject proposal
   */
  const handleRejectProposal = useCallback(async (proposal) => {
    if (!confirm('Are you sure you want to reject this proposal?')) {
      return;
    }

    try {
      const { error } = await supabase.functions.invoke('bubble-proxy', {
        body: {
          action: 'rejectProposal',
          proposalId: proposal._id || proposal.id
        }
      });

      if (error) throw error;

      // Refresh proposals
      if (selectedListing) {
        const proposalsResult = await fetchProposalsForListing(selectedListing._id || selectedListing.id);
        setProposals(proposalsResult);
      }

      handleCloseModal();
      alert('Proposal rejected.');

    } catch (err) {
      console.error('Failed to reject proposal:', err);
      alert('Failed to reject proposal. Please try again.');
    }
  }, [selectedListing, handleCloseModal]);

  /**
   * Handle modify proposal - open edit flow
   */
  const handleModifyProposal = useCallback((proposal) => {
    const guest = proposal.guest || proposal.Guest || proposal['Created By'] || {};
    const guestName = guest.firstName || guest['First Name'] || 'Guest';
    alert(`Opening review/modify for proposal from ${guestName}`);
    // TODO: Navigate to edit proposal page or open edit modal
  }, []);

  /**
   * Handle send message
   */
  const handleSendMessage = useCallback((proposal) => {
    const guest = proposal.guest || proposal.Guest || proposal['Created By'] || {};
    const guestName = guest.firstName || guest['First Name'] || 'Guest';
    alert(`Opening message thread with ${guestName}`);
    // TODO: Navigate to messaging or open message modal
  }, []);

  /**
   * Handle remind Split Lease
   */
  const handleRemindSplitLease = useCallback(async (proposal) => {
    try {
      await supabase.functions.invoke('bubble-proxy', {
        body: {
          action: 'remindSplitLease',
          proposalId: proposal._id || proposal.id
        }
      });

      alert('Reminder sent to Split Lease team');

    } catch (err) {
      console.error('Failed to send reminder:', err);
      alert('Failed to send reminder. Please try again.');
    }
  }, []);

  /**
   * Handle virtual meeting selection
   */
  const handleChooseVirtualMeeting = useCallback((proposal, time) => {
    alert(`Selected meeting time: ${time.toLocaleString()}`);
    // TODO: Call API to confirm meeting time
  }, []);

  /**
   * Handle edit listing
   */
  const handleEditListing = useCallback(() => {
    if (selectedListing) {
      window.location.href = `/self-listing?id=${selectedListing._id || selectedListing.id}`;
    }
  }, [selectedListing]);

  /**
   * Handle retry after error
   */
  const handleRetry = useCallback(() => {
    if (user) {
      loadHostData(user._id || user.id);
    }
  }, [user]);

  // ============================================================================
  // RETURN HOOK API
  // ============================================================================
  return {
    // Auth state
    authState,

    // Data
    user,
    listings,
    selectedListing,
    proposals,
    selectedProposal,
    isModalOpen,

    // UI state
    isLoading,
    error,

    // Handlers
    handleListingChange,
    handleProposalClick,
    handleCloseModal,
    handleDeleteProposal,
    handleAcceptProposal,
    handleRejectProposal,
    handleModifyProposal,
    handleSendMessage,
    handleRemindSplitLease,
    handleChooseVirtualMeeting,
    handleEditListing,
    handleRetry
  };
}
