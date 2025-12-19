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
import { checkAuthStatus, validateTokenAndFetchUser, getFirstName, getUserType } from '../../../lib/auth.js';
import { getUserId } from '../../../lib/secureStorage.js';
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
  const [isEditingProposal, setIsEditingProposal] = useState(false);

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

        // ========================================================================
        // GOLD STANDARD AUTH PATTERN - Step 2: Deep validation with clearOnFailure: false
        // ========================================================================
        const userData = await validateTokenAndFetchUser({ clearOnFailure: false });

        let userType = null;
        let finalUserData = null;

        if (userData) {
          // Success path: Use validated user data
          userType = userData['User Type'] || userData.userType;
          finalUserData = userData;
          console.log('[HostProposals] User data loaded, userType:', userType);
        } else {
          // ========================================================================
          // GOLD STANDARD AUTH PATTERN - Step 3: Fallback to Supabase session metadata
          // ========================================================================
          const { data: { session } } = await supabase.auth.getSession();

          if (session?.user) {
            // Session valid but profile fetch failed - use session metadata
            userType = session.user.user_metadata?.user_type || getUserType() || null;
            console.log('[HostProposals] Using fallback session data, userType:', userType);

            // Create minimal user data from session for loadHostData
            if (userType && isHost({ userType })) {
              finalUserData = {
                userId: session.user.user_metadata?.user_id || getUserId() || session.user.id,
                _id: session.user.user_metadata?.user_id || getUserId() || session.user.id,
                firstName: session.user.user_metadata?.first_name || getFirstName() || session.user.email?.split('@')[0] || 'Host',
                email: session.user.email,
                userType: userType
              };
            }

            // If we can't determine userType from session, redirect
            if (!userType) {
              console.log('[HostProposals] Cannot determine user type from session, redirecting');
              setAuthState({
                isChecking: false,
                isAuthenticated: true,
                shouldRedirect: true,
                userType: null
              });
              window.location.href = '/';
              return;
            }
          } else {
            // No valid session - redirect
            console.log('[HostProposals] No valid session, redirecting');
            setAuthState({
              isChecking: false,
              isAuthenticated: false,
              shouldRedirect: true,
              userType: null
            });
            window.location.href = '/';
            return;
          }
        }

        // Check if user is a host
        if (!isHost({ userType })) {
          console.warn('[HostProposals] User is not a Host, redirecting...');
          setAuthState({
            isChecking: false,
            isAuthenticated: false,
            shouldRedirect: true,
            userType: userType
          });
          window.location.href = '/';
          return;
        }

        setUser(finalUserData);
        setAuthState({
          isChecking: false,
          isAuthenticated: true,
          shouldRedirect: false,
          userType: userType
        });

        // Load host data
        await loadHostData(finalUserData.userId || finalUserData._id);

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
   * Sorts listings by proposal count (most proposals first) and selects the one with most recent proposals
   */
  const loadHostData = async (userId) => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch host's listings via Edge Function
      const listingsResult = await fetchHostListings(userId);

      if (listingsResult.length > 0) {
        // Fetch proposal counts for all listings to determine sort order
        const listingIds = listingsResult.map(l => l._id || l.id);

        // Get proposal counts and most recent proposal date for each listing
        const { data: proposalStats, error: statsError } = await supabase
          .from('proposal')
          .select('Listing, "Created Date"')
          .in('Listing', listingIds)
          .or('"Deleted".is.null,"Deleted".eq.false');

        if (statsError) {
          console.warn('[useHostProposalsPageLogic] Could not fetch proposal stats:', statsError);
        }

        // Calculate stats per listing
        const statsMap = {};
        (proposalStats || []).forEach(p => {
          const listingId = p.Listing;
          if (!statsMap[listingId]) {
            statsMap[listingId] = { count: 0, mostRecent: null };
          }
          statsMap[listingId].count++;
          const createdDate = new Date(p['Created Date']);
          if (!statsMap[listingId].mostRecent || createdDate > statsMap[listingId].mostRecent) {
            statsMap[listingId].mostRecent = createdDate;
          }
        });

        // Sort listings: most recent proposal first, then by proposal count
        const sortedListings = [...listingsResult].sort((a, b) => {
          const aId = a._id || a.id;
          const bId = b._id || b.id;
          const aStats = statsMap[aId] || { count: 0, mostRecent: null };
          const bStats = statsMap[bId] || { count: 0, mostRecent: null };

          // First, prioritize listings with proposals
          if (aStats.count > 0 && bStats.count === 0) return -1;
          if (bStats.count > 0 && aStats.count === 0) return 1;

          // Then sort by most recent proposal date
          if (aStats.mostRecent && bStats.mostRecent) {
            return bStats.mostRecent - aStats.mostRecent;
          }
          if (aStats.mostRecent) return -1;
          if (bStats.mostRecent) return 1;

          // Finally, sort by proposal count
          return bStats.count - aStats.count;
        });

        console.log('[useHostProposalsPageLogic] Sorted listings by proposals:',
          sortedListings.map(l => ({ id: l._id || l.id, name: l.Name, proposals: statsMap[l._id || l.id]?.count || 0 }))
        );

        setListings(sortedListings);
        setSelectedListing(sortedListings[0]);

        // Fetch proposals for the first (most relevant) listing
        const proposalsResult = await fetchProposalsForListing(sortedListings[0]._id || sortedListings[0].id);
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
   * Fetch host's listings using RPC function
   *
   * Uses get_host_listings RPC to handle column names with special characters
   * (like "Host User") that cause issues with PostgREST .or() filters.
   *
   * Pattern: RPC handles finding listings where:
   * - "Host User" = user._id, OR
   * - "Created By" = user._id
   */
  const fetchHostListings = async (userId) => {
    try {
      console.log('[useHostProposalsPageLogic] Fetching listings for user:', userId);

      // Use RPC function to fetch listings (handles special characters in column names)
      const { data: listings, error } = await supabase
        .rpc('get_host_listings', { host_user_id: userId });

      if (error) {
        console.error('[useHostProposalsPageLogic] Error fetching listings:', error);
        throw error;
      }

      console.log('[useHostProposalsPageLogic] Found listings:', listings?.length || 0);
      return listings || [];
    } catch (err) {
      console.error('Failed to fetch listings:', err);
      return [];
    }
  };

  /**
   * Fetch proposals for a specific listing directly from Supabase
   * Includes guest information for display
   */
  const fetchProposalsForListing = async (listingId) => {
    try {
      console.log('[useHostProposalsPageLogic] Fetching proposals for listing:', listingId);

      const { data: proposals, error } = await supabase
        .from('proposal')
        .select(`
          _id,
          "Status",
          "Guest",
          "Host User",
          "Listing",
          "Move in range start",
          "Move in range end",
          "Move-out",
          "Reservation Span",
          "Reservation Span (Weeks)",
          "nights per week (num)",
          "Nights Selected (Nights list)",
          "Days Selected",
          "check in day",
          "check out day",
          "hc nights selected",
          "hc days selected",
          "proposal nightly price",
          "4 week rent",
          "Total Price for Reservation (guest)",
          "Total Compensation (proposal - host)",
          "host compensation",
          "4 week compensation",
          "cleaning fee",
          "damage deposit",
          "Guest email",
          "need for space",
          "about_yourself",
          "Comment",
          "Created Date",
          "Modified Date"
        `)
        .eq('Listing', listingId)
        .neq('Deleted', true)
        .order('Created Date', { ascending: false });

      if (error) {
        console.error('[useHostProposalsPageLogic] Error fetching proposals:', error);
        throw error;
      }

      console.log('[useHostProposalsPageLogic] Found proposals:', proposals?.length || 0);

      // Enrich proposals with guest data
      if (proposals && proposals.length > 0) {
        const guestIds = [...new Set(proposals.map(p => p.Guest).filter(Boolean))];

        if (guestIds.length > 0) {
          const { data: guests } = await supabase
            .from('user')
            .select('_id, "Name - Full", "Name - First", "Name - Last", email, "Profile Photo"')
            .in('_id', guestIds);

          const guestMap = {};
          guests?.forEach(g => { guestMap[g._id] = g; });

          // Attach guest data to each proposal
          proposals.forEach(p => {
            if (p.Guest && guestMap[p.Guest]) {
              p.guest = guestMap[p.Guest];
            }
          });
        }
      }

      return proposals || [];
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
   * Handle proposal deletion (soft delete via status update)
   */
  const handleDeleteProposal = useCallback(async (proposal) => {
    if (!confirm('Are you sure you want to delete this proposal?')) {
      return;
    }

    try {
      // Use proposal Edge Function to update status
      const { data, error } = await supabase.functions.invoke('proposal', {
        body: {
          action: 'update',
          payload: {
            proposalId: proposal._id || proposal.id,
            status: 'Deleted'
          }
        }
      });

      if (error) throw error;

      // Remove from local state
      setProposals(prev => prev.filter(p => (p._id || p.id) !== (proposal._id || proposal.id)));
      console.log('[useHostProposalsPageLogic] Proposal deleted:', proposal._id);

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
      // Use proposal Edge Function to update status
      const { data, error } = await supabase.functions.invoke('proposal', {
        body: {
          action: 'update',
          payload: {
            proposalId: proposal._id || proposal.id,
            status: 'Accepted'
          }
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
      console.log('[useHostProposalsPageLogic] Proposal accepted:', proposal._id);

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
      // Use proposal Edge Function to update status
      const { data, error } = await supabase.functions.invoke('proposal', {
        body: {
          action: 'update',
          payload: {
            proposalId: proposal._id || proposal.id,
            status: 'Declined'
          }
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
      console.log('[useHostProposalsPageLogic] Proposal rejected:', proposal._id);

    } catch (err) {
      console.error('Failed to reject proposal:', err);
      alert('Failed to reject proposal. Please try again.');
    }
  }, [selectedListing, handleCloseModal]);

  /**
   * Handle modify proposal - open HostEditingProposal component
   */
  const handleModifyProposal = useCallback((proposal) => {
    setSelectedProposal(proposal);
    setIsModalOpen(false); // Close the details modal
    setIsEditingProposal(true); // Open the editing view
  }, []);

  /**
   * Handle closing the editing view
   */
  const handleCloseEditing = useCallback(() => {
    setIsEditingProposal(false);
    setSelectedProposal(null);
  }, []);

  /**
   * Handle accept proposal as-is from editing view
   */
  const handleAcceptAsIs = useCallback(async (proposal) => {
    await handleAcceptProposal(proposal);
    setIsEditingProposal(false);
  }, [handleAcceptProposal]);

  /**
   * Handle counteroffer submission from editing view
   */
  const handleCounteroffer = useCallback(async (counterofferData) => {
    try {
      // Use proposal Edge Function to create counteroffer
      const { data, error } = await supabase.functions.invoke('proposal', {
        body: {
          action: 'counteroffer',
          payload: {
            proposalId: selectedProposal._id || selectedProposal.id,
            ...counterofferData
          }
        }
      });

      if (error) throw error;

      // Refresh proposals
      if (selectedListing) {
        const proposalsResult = await fetchProposalsForListing(selectedListing._id || selectedListing.id);
        setProposals(proposalsResult);
      }

      setIsEditingProposal(false);
      setSelectedProposal(null);
      alert('Counteroffer sent successfully!');
      console.log('[useHostProposalsPageLogic] Counteroffer sent:', selectedProposal._id);

    } catch (err) {
      console.error('Failed to send counteroffer:', err);
      alert('Failed to send counteroffer. Please try again.');
    }
  }, [selectedProposal, selectedListing]);

  /**
   * Handle reject from editing view
   */
  const handleRejectFromEditing = useCallback(async (proposal, reason) => {
    try {
      const { data, error } = await supabase.functions.invoke('proposal', {
        body: {
          action: 'update',
          payload: {
            proposalId: proposal._id || proposal.id,
            status: 'Declined',
            rejectionReason: reason
          }
        }
      });

      if (error) throw error;

      // Refresh proposals
      if (selectedListing) {
        const proposalsResult = await fetchProposalsForListing(selectedListing._id || selectedListing.id);
        setProposals(proposalsResult);
      }

      setIsEditingProposal(false);
      setSelectedProposal(null);
      alert('Proposal rejected.');
      console.log('[useHostProposalsPageLogic] Proposal rejected from editing:', proposal._id);

    } catch (err) {
      console.error('Failed to reject proposal:', err);
      alert('Failed to reject proposal. Please try again.');
    }
  }, [selectedListing]);

  /**
   * Handle alert notifications from editing component
   */
  const handleEditingAlert = useCallback((message, type = 'info') => {
    // For now, use simple alert. Can be replaced with toast system later.
    alert(message);
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
   * TODO: Implement proper reminder system (email/notification)
   */
  const handleRemindSplitLease = useCallback(async (proposal) => {
    try {
      // For now, just show a confirmation - can be connected to a notification system later
      console.log('[useHostProposalsPageLogic] Reminder requested for proposal:', proposal._id);
      alert('Reminder feature coming soon! For urgent matters, please contact support@splitlease.com');
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
      loadHostData(user.userId);
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
    isEditingProposal,

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
    handleRetry,

    // Editing handlers
    handleCloseEditing,
    handleAcceptAsIs,
    handleCounteroffer,
    handleRejectFromEditing,
    handleEditingAlert
  };
}
