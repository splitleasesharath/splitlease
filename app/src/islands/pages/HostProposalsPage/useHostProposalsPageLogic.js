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
import { getAllHouseRules } from '../../shared/EditListingDetails/services/houseRulesService.js';
import { getVMStateInfo, VM_STATES } from '../../../logic/rules/proposals/virtualMeetingRules.js';
import { DAYS_OF_WEEK, nightNamesToIndices } from '../../shared/HostEditingProposal/types.js';
import { showToast } from '../../shared/Toast.jsx';

// ============================================================================
// DATA NORMALIZERS
// ============================================================================
// These functions transform Bubble-format field names to camelCase for V7 components

/**
 * Normalize listing data from Bubble format to V7 component format
 * @param {Object} listing - Raw listing from database
 * @returns {Object} Normalized listing
 */
function normalizeListing(listing) {
  if (!listing) return null;
  return {
    ...listing,
    // Keep original fields for backwards compatibility
    // Add normalized aliases for V7 components
    title: listing.Name || listing.title || listing.name || 'Unnamed Listing',
    name: listing.Name || listing.title || listing.name || 'Unnamed Listing',
    thumbnail: listing['Cover Photo'] || listing.thumbnail || listing.cover_photo || null,
    neighborhood: listing.Neighborhood || listing.neighborhood || null,
    address: listing['Full Address'] || listing.address || listing.full_address || null,
    bedrooms: listing['Bedrooms (number)'] || listing.bedrooms || 0,
    bathrooms: listing['Bathrooms (number)'] || listing.bathrooms || 0,
    monthly_rate: listing['Monthly Rate'] || listing.monthly_rate || 0
  };
}

/**
 * Normalize guest data from Bubble format to V7 component format
 * @param {Object} guest - Raw guest from database
 * @returns {Object} Normalized guest
 */
function normalizeGuest(guest) {
  if (!guest) return null;

  // Determine verification status from Bubble fields
  // "user verified?" is the main verification flag
  // "Selfie with ID" indicates ID verification was completed
  // "Verify - Linked In ID" indicates work/LinkedIn verification
  const isUserVerified = guest['user verified?'] || guest.id_verified || false;
  const hasIdVerification = !!(guest['Selfie with ID'] || guest.id_verified);
  const hasWorkVerification = !!(guest['Verify - Linked In ID'] || guest.work_verified);

  return {
    ...guest,
    // Add normalized aliases for V7 components
    name: guest['Name - Full'] || guest.name || guest.full_name || 'Guest',
    full_name: guest['Name - Full'] || guest.full_name || guest.name || 'Guest',
    first_name: guest['Name - First'] || guest.first_name || guest.firstName || 'Guest',
    profilePhoto: guest['Profile Photo'] || guest.profilePhoto || guest.profile_photo || null,
    avatar: guest['Profile Photo'] || guest.profilePhoto || guest.avatar || null,
    bio: guest['About Me / Bio'] || guest.Bio || guest.bio || guest.about || null,
    id_verified: hasIdVerification || isUserVerified,
    work_verified: hasWorkVerification,
    is_verified: isUserVerified,
    review_count: guest['Review Count'] || guest.review_count || 0,
    created_at: guest['Created Date'] || guest.created_at || null
  };
}

/**
 * Normalize proposal data from Bubble format to V7 component format
 * @param {Object} proposal - Raw proposal from database
 * @param {Object} normalizedGuest - Already normalized guest data
 * @returns {Object} Normalized proposal
 */
function normalizeProposal(proposal, normalizedGuest = null) {
  if (!proposal) return null;

  // Status normalization - handle both string and object formats
  const rawStatus = proposal.Status || proposal.status || '';
  const status = typeof rawStatus === 'string' ? rawStatus.toLowerCase().replace(/\s+/g, '_') : rawStatus;

  return {
    ...proposal,
    // Add normalized aliases for V7 components
    status: status,

    // Guest info (use normalized guest if provided, otherwise normalize inline)
    guest: normalizedGuest || normalizeGuest(proposal.guest),

    // Dates
    start_date: proposal['Move in range start'] || proposal.start_date || null,
    end_date: proposal['Move-out'] || proposal.end_date || null,
    move_in_range_start: proposal['Move in range start'] || proposal.move_in_range_start || null,
    move_in_range_end: proposal['Move in range end'] || proposal.move_in_range_end || null,
    created_at: proposal['Created Date'] || proposal.created_at || null,

    // Days/Schedule
    days_selected: proposal['Days Selected'] || proposal.days_selected || [],
    days_per_week: proposal['Days Selected'] || proposal.days_per_week || [],
    nights_selected: proposal['Nights Selected (Nights list)'] || proposal.nights_selected || [],
    nights_per_week: proposal['nights per week (num)'] || proposal.nights_per_week || 0,
    check_in_day: proposal['check in day'] || proposal.check_in_day || null,
    check_out_day: proposal['check out day'] || proposal.check_out_day || null,

    // Duration
    duration_weeks: proposal['Reservation Span (Weeks)'] || proposal.duration_weeks || proposal.total_weeks || 0,
    duration_months: proposal['Reservation Span'] || proposal.duration_months || 0,

    // Pricing - prioritize host compensation fields
    nightly_rate: proposal['proposal nightly price'] || proposal.nightly_rate || 0,
    total_price: proposal['Total Compensation (proposal - host)'] || proposal['host compensation'] || proposal.total_price || 0,
    host_compensation: proposal['host compensation'] || proposal['Total Compensation (proposal - host)'] || proposal.host_compensation || 0,
    four_week_rent: proposal['4 week rent'] || proposal.four_week_rent || 0,
    four_week_compensation: proposal['4 week compensation'] || proposal.four_week_compensation || 0,
    cleaning_fee: proposal['cleaning fee'] || proposal.cleaning_fee || 0,
    damage_deposit: proposal['damage deposit'] || proposal.damage_deposit || 0,

    // Guest info/message
    comment: proposal.Comment || proposal.comment || null,
    need_for_space: proposal['need for space'] || proposal.need_for_space || null,
    about_yourself: proposal.about_yourself || null,

    // Guest counteroffer detection
    last_modified_by: proposal['last_modified_by'] || proposal.last_modified_by || null,
    has_guest_counteroffer: proposal.has_guest_counteroffer || false
  };
}

/**
 * Hook for Host Proposals Page business logic
 * @param {Object} options - Hook options
 * @param {boolean} options.skipAuth - Skip authentication check (for demo mode)
 */
export function useHostProposalsPageLogic({ skipAuth = false } = {}) {
  // ============================================================================
  // AUTH STATE
  // ============================================================================
  const [authState, setAuthState] = useState({
    isChecking: !skipAuth,
    isAuthenticated: skipAuth,
    shouldRedirect: false,
    userType: skipAuth ? 'host' : null
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
  const [showRejectOnOpen, setShowRejectOnOpen] = useState(false);

  // ============================================================================
  // VIRTUAL MEETING STATE
  // ============================================================================
  const [isVirtualMeetingModalOpen, setIsVirtualMeetingModalOpen] = useState(false);
  const [virtualMeetingView, setVirtualMeetingView] = useState('');
  const [virtualMeetingProposal, setVirtualMeetingProposal] = useState(null);

  // ============================================================================
  // UI STATE
  // ============================================================================
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // ============================================================================
  // PROPOSAL COUNTS STATE (for pill selector badges)
  // ============================================================================
  const [proposalCountsByListing, setProposalCountsByListing] = useState({});

  // ============================================================================
  // REFERENCE DATA STATE
  // ============================================================================
  const [allHouseRules, setAllHouseRules] = useState([]);

  // ============================================================================
  // AUTH CHECK
  // ============================================================================
  useEffect(() => {
    // Skip auth check in demo mode
    if (skipAuth) {
      setIsLoading(false);
      return;
    }

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
  // LOAD REFERENCE DATA (House Rules)
  // ============================================================================
  useEffect(() => {
    async function loadReferenceData() {
      try {
        const rules = await getAllHouseRules();
        setAllHouseRules(rules);
        console.log('[HostProposals] Loaded all house rules:', rules.length);
      } catch (err) {
        console.error('[HostProposals] Failed to load house rules:', err);
      }
    }
    loadReferenceData();
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
        const countsMap = {}; // Simple count map for UI
        (proposalStats || []).forEach(p => {
          const listingId = p.Listing;
          if (!statsMap[listingId]) {
            statsMap[listingId] = { count: 0, mostRecent: null };
          }
          statsMap[listingId].count++;
          countsMap[listingId] = (countsMap[listingId] || 0) + 1;
          const createdDate = new Date(p['Created Date']);
          if (!statsMap[listingId].mostRecent || createdDate > statsMap[listingId].mostRecent) {
            statsMap[listingId].mostRecent = createdDate;
          }
        });

        // Store proposal counts for pill selector badges
        setProposalCountsByListing(countsMap);

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

        // Normalize listings for V7 components
        const normalizedListings = sortedListings.map(normalizeListing);
        setListings(normalizedListings);

        // Check for listingId URL parameter to pre-select a specific listing
        const urlParams = new URLSearchParams(window.location.search);
        const preselectedListingId = urlParams.get('listingId');

        let listingToSelect = normalizedListings[0];
        if (preselectedListingId) {
          const matchedListing = normalizedListings.find(l =>
            (l._id || l.id) === preselectedListingId
          );
          if (matchedListing) {
            listingToSelect = matchedListing;
            console.log('[useHostProposalsPageLogic] Pre-selected listing from URL:', preselectedListingId);
          }
        }

        setSelectedListing(listingToSelect);

        // Fetch proposals for the selected listing
        // Pass userId explicitly since user state may not be set yet (async state update)
        const proposalsResult = await fetchProposalsForListing(listingToSelect._id || listingToSelect.id, userId);
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
   * @param {string} listingId - The listing ID to fetch proposals for
   * @param {string} [hostUserIdOverride] - Optional host user ID (used when user state isn't set yet)
   */
  const fetchProposalsForListing = async (listingId, hostUserIdOverride = null) => {
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
          "Modified Date",
          "virtual meeting",
          "counter offer happened",
          "hc reservation span (weeks)",
          "hc nightly price",
          "hc total price",
          "hc move in date",
          "hc check in day",
          "hc check out day",
          "hc nights per week"
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
          console.log('[useHostProposalsPageLogic] Fetching guest data for IDs:', guestIds);

          const { data: guests, error: guestError } = await supabase
            .from('user')
            .select('_id, "Name - Full", "Name - First", "Name - Last", email, "Profile Photo", "About Me / Bio", "user verified?", "Verify - Linked In ID", "Verify - Phone", "Selfie with ID", "Created Date"')
            .in('_id', guestIds);

          if (guestError) {
            console.error('[useHostProposalsPageLogic] Error fetching guests:', guestError);
          }

          console.log('[useHostProposalsPageLogic] Raw guest data:', guests);

          const guestMap = {};
          guests?.forEach(g => { guestMap[g._id] = g; });

          // Attach normalized guest data to each proposal
          proposals.forEach(p => {
            if (p.Guest && guestMap[p.Guest]) {
              const normalized = normalizeGuest(guestMap[p.Guest]);
              console.log('[useHostProposalsPageLogic] Normalized guest:', {
                name: normalized.name,
                bio: normalized.bio ? normalized.bio.substring(0, 30) + '...' : 'NO BIO',
                id_verified: normalized.id_verified,
                work_verified: normalized.work_verified
              });
              p.guest = normalized;
            }
          });
        }

        // Enrich proposals with virtual meeting data
        const vmIds = [...new Set(proposals.map(p => p['virtual meeting']).filter(Boolean))];

        if (vmIds.length > 0) {
          const { data: virtualMeetings } = await supabase
            .from('virtualmeetingschedulesandlinks')
            .select(`
              _id,
              "requested by",
              "booked date",
              "meeting declined",
              "confirmedBySplitLease",
              "suggested dates and times",
              "meeting link"
            `)
            .in('_id', vmIds);

          const vmMap = {};
          virtualMeetings?.forEach(vm => { vmMap[vm._id] = vm; });

          // Attach virtual meeting data to each proposal (normalize field names)
          proposals.forEach(p => {
            if (p['virtual meeting'] && vmMap[p['virtual meeting']]) {
              const rawVm = vmMap[p['virtual meeting']];
              // Normalize field names for consistency with virtualMeetingRules.js
              p.virtualMeeting = {
                _id: rawVm._id,
                requestedBy: rawVm['requested by'],
                bookedDate: rawVm['booked date'],
                meetingDeclined: rawVm['meeting declined'],
                confirmedBySplitlease: rawVm['confirmedBySplitLease'],
                suggestedTimes: rawVm['suggested dates and times'],
                meetingLink: rawVm['meeting link']
              };
            }
          });
        }

        // Enrich proposals with negotiation summaries (host-directed)
        console.log('[useHostProposalsPageLogic] DEBUG: About to fetch negotiation summaries');
        const proposalIds = proposals.map(p => p._id);
        // Use override if provided (needed when called before user state is set), otherwise fall back to user state
        const hostUserId = hostUserIdOverride || user?._id || user?.userId;
        console.log('[useHostProposalsPageLogic] DEBUG: proposalIds:', proposalIds, 'hostUserId:', hostUserId, 'override:', hostUserIdOverride);

        if (proposalIds.length > 0 && hostUserId) {
          const { data: summariesData, error: summariesError } = await supabase
            .from('negotiationsummary')
            .select('*')
            .in('"Proposal associated"', proposalIds)
            .eq('"To Account"', hostUserId)
            .order('"Created Date"', { ascending: false });

          if (summariesError) {
            console.error('[useHostProposalsPageLogic] Error fetching negotiation summaries:', summariesError);
          } else {
            const summaryMap = {};
            summariesData?.forEach(summary => {
              const proposalId = summary['Proposal associated'];
              if (!summaryMap[proposalId]) {
                summaryMap[proposalId] = [];
              }
              summaryMap[proposalId].push(summary);
            });

            // Attach summaries to proposals
            proposals.forEach(p => {
              p.negotiationSummaries = summaryMap[p._id] || [];
            });

            console.log('[useHostProposalsPageLogic] Fetched negotiation summaries for', summariesData?.length || 0, 'proposals');
          }
        }
      }

      // Normalize all proposals for V7 components
      const normalizedProposals = (proposals || []).map(p => normalizeProposal(p, p.guest));
      return normalizedProposals;
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
   * Accepts either a listing object or a listing ID
   */
  const handleListingChange = useCallback(async (listingOrId) => {
    // Support both listing object and listing ID
    let listing = listingOrId;
    if (typeof listingOrId === 'string') {
      // Find the listing from the current listings array
      listing = listings.find(l => (l._id || l.id) === listingOrId);
      if (!listing) {
        console.warn('[useHostProposalsPageLogic] Listing not found:', listingOrId);
        return;
      }
    }

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
  }, [listings]);

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
      showToast({ title: 'Error', content: 'Failed to delete proposal. Please try again.', type: 'error' });
    }
  }, []);

  /**
   * Handle accept proposal
   */
  const handleAcceptProposal = useCallback(async (proposal) => {
    try {
      // Use proposal Edge Function to update status
      // Status must use full Bubble display format for status transition validation
      const { data, error } = await supabase.functions.invoke('proposal', {
        body: {
          action: 'update',
          payload: {
            proposal_id: proposal._id || proposal.id,
            status: 'Proposal or Counteroffer Accepted / Drafting Lease Documents'
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
      showToast({ title: 'Success!', content: 'Proposal accepted successfully!', type: 'success' });
      console.log('[useHostProposalsPageLogic] Proposal accepted:', proposal._id);

    } catch (err) {
      console.error('Failed to accept proposal:', err);
      showToast({ title: 'Error', content: 'Failed to accept proposal. Please try again.', type: 'error' });
    }
  }, [selectedListing, handleCloseModal]);

  /**
   * Handle reject proposal - opens HostEditingProposal with reject section visible
   */
  const handleRejectProposal = useCallback((proposal) => {
    setSelectedProposal(proposal);
    setIsModalOpen(false); // Close the details modal
    setShowRejectOnOpen(true); // Signal to open with reject section visible
    setIsEditingProposal(true); // Open the editing view
  }, []);

  /**
   * Handle modify proposal - open HostEditingProposal component
   */
  const handleModifyProposal = useCallback((proposal) => {
    setSelectedProposal(proposal);
    setIsModalOpen(false); // Close the details modal
    setShowRejectOnOpen(false); // Don't show reject section
    setIsEditingProposal(true); // Open the editing view
  }, []);

  /**
   * Handle closing the editing view
   */
  const handleCloseEditing = useCallback(() => {
    setIsEditingProposal(false);
    setSelectedProposal(null);
    setShowRejectOnOpen(false); // Reset reject section state
  }, []);

  /**
   * Handle accept proposal as-is from editing view
   */
  const handleAcceptAsIs = useCallback(async (proposal) => {
    await handleAcceptProposal(proposal);
    setIsEditingProposal(false);
  }, [handleAcceptProposal]);

  /**
   * Convert day name to 0-based day index
   * Handles string names ('Monday'), numeric indices (1), or undefined
   * @param {string|number|undefined} dayName - Day name or index
   * @returns {number|null} 0-based day index (0-6) or null if invalid
   */
  const dayNameToIndex = (dayName) => {
    if (typeof dayName === 'number') return dayName;
    if (typeof dayName !== 'string') return null;
    const day = DAYS_OF_WEEK.find(d =>
      d.name.toLowerCase() === dayName.toLowerCase()
    );
    return day?.dayIndex ?? null;
  };

  /**
   * Handle counteroffer submission from editing view
   *
   * Transforms frontend field names to Edge Function expected format:
   * - Frontend uses camelCase (numberOfWeeks, checkIn, etc.)
   * - Edge Function expects hc_ prefix snake_case (hc_reservation_span_weeks, hc_check_in, etc.)
   * - Day/night values come as strings ('Monday', 'Monday Night') and must be converted to indices
   *
   * IMPORTANT: ALL hc_ fields must be populated (with either new or original values)
   * to enable strikethrough comparison in the UI. If a field wasn't changed,
   * we copy the original value to the hc_ field.
   */
  const handleCounteroffer = useCallback(async (counterofferData) => {
    try {
      // Transform frontend field names to Edge Function expected format
      // The Edge Function expects hc_ prefixed snake_case fields
      const {
        proposal,
        numberOfWeeks,
        checkIn,
        checkOut,
        nightsSelected,
        daysSelected,
        moveInDate
      } = counterofferData;

      // Use the proposal from counterofferData or fall back to selectedProposal
      const originalProposal = proposal || selectedProposal;

      console.log('[useHostProposalsPageLogic] Counteroffer input:', {
        checkIn, checkOut, nightsSelected, daysSelected
      });

      // Get original values from proposal for fields not being changed
      const originalWeeks = originalProposal['Reservation Span (Weeks)'] || originalProposal.duration_weeks || 0;
      const originalCheckIn = originalProposal['check in day'] ?? originalProposal.check_in_day;
      const originalCheckOut = originalProposal['check out day'] ?? originalProposal.check_out_day;
      const originalNights = originalProposal['Nights Selected (Nights list)'] || originalProposal.nights_selected || [];
      const originalDays = originalProposal['Days Selected'] || originalProposal.days_selected || [];
      const originalMoveIn = originalProposal['Move in range start'] || originalProposal.move_in_range_start;
      const originalNightlyPrice = originalProposal['proposal nightly price'] || originalProposal.nightly_rate || 0;
      const originalCleaningFee = originalProposal['cleaning fee'] || originalProposal.cleaning_fee || 0;
      const originalDamageDeposit = originalProposal['damage deposit'] || originalProposal.damage_deposit || 0;
      const originalTotalPrice = originalProposal['Total Price for Reservation (guest)'] || originalProposal.total_price || 0;
      const originalFourWeekRent = originalProposal['4 week rent'] || originalProposal.four_week_rent || 0;

      // Convert day/night values to indices
      const convertedCheckIn = checkIn !== undefined ? dayNameToIndex(checkIn) : null;
      const convertedCheckOut = checkOut !== undefined ? dayNameToIndex(checkOut) : null;
      const convertedNights = nightsSelected !== undefined && Array.isArray(nightsSelected)
        ? nightNamesToIndices(nightsSelected)
        : null;
      const convertedDays = daysSelected !== undefined && Array.isArray(daysSelected)
        ? daysSelected.map(dayNameToIndex).filter(idx => idx !== null)
        : null;
      const convertedMoveIn = moveInDate !== undefined
        ? (moveInDate instanceof Date ? moveInDate.toISOString().split('T')[0] : moveInDate)
        : null;

      // Build the payload with ALL hc_ fields (new value or original)
      // This enables UI strikethrough comparison
      const payload = {
        proposal_id: originalProposal._id || originalProposal.id,
        status: 'Host Counteroffer Submitted / Awaiting Guest Review',

        // Schedule fields - use new value if provided, otherwise copy original
        hc_reservation_span_weeks: numberOfWeeks ?? originalWeeks,
        hc_check_in: convertedCheckIn ?? (typeof originalCheckIn === 'number' ? originalCheckIn : parseInt(originalCheckIn, 10) || 0),
        hc_check_out: convertedCheckOut ?? (typeof originalCheckOut === 'number' ? originalCheckOut : parseInt(originalCheckOut, 10) || 0),
        hc_nights_selected: convertedNights ?? originalNights,
        hc_days_selected: convertedDays ?? originalDays,
        hc_move_in_date: convertedMoveIn ?? originalMoveIn,

        // Financial fields - copy from original (host can't change these in current UI)
        hc_nightly_price: parseFloat(originalNightlyPrice) || 0,
        hc_cleaning_fee: parseFloat(originalCleaningFee) || 0,
        hc_damage_deposit: parseFloat(originalDamageDeposit) || 0,
        hc_total_price: parseFloat(originalTotalPrice) || 0,
        hc_four_week_rent: parseFloat(originalFourWeekRent) || 0
      };

      console.log('[useHostProposalsPageLogic] Converted payload with ALL hc_ fields:', payload);

      // Validate session exists before Edge Function call
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error('[useHostProposalsPageLogic] Session error:', sessionError);
      }
      console.log('[useHostProposalsPageLogic] Session exists:', !!session);
      console.log('[useHostProposalsPageLogic] Access token exists:', !!session?.access_token);

      if (!session?.access_token) {
        // Try to refresh the session
        console.log('[useHostProposalsPageLogic] No active session, attempting refresh...');
        const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError || !refreshedSession) {
          throw new Error('Session expired. Please refresh the page and try again.');
        }
        console.log('[useHostProposalsPageLogic] Session refreshed successfully');
      }

      // Get the latest session (might have been refreshed above)
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      const authToken = currentSession?.access_token;

      console.log('[useHostProposalsPageLogic] Auth token length:', authToken?.length);
      console.log('[useHostProposalsPageLogic] Invoking Edge Function with explicit auth...');

      const { data, error } = await supabase.functions.invoke('proposal', {
        headers: {
          Authorization: `Bearer ${authToken}`
        },
        body: {
          action: 'update',
          payload
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
      showToast({ title: 'Counteroffer Sent!', content: 'Your counteroffer has been submitted for guest review.', type: 'success' });
      console.log('[useHostProposalsPageLogic] Counteroffer sent:', selectedProposal._id);

    } catch (err) {
      console.error('Failed to send counteroffer:', err);
      // Extract proper error message
      const errorMessage = err?.message || err?.error?.message || err?.error ||
        (typeof err === 'string' ? err : 'Failed to send counteroffer. Please try again.');
      const displayMessage = typeof errorMessage === 'string' ? errorMessage : 'Failed to send counteroffer. Please try again.';
      showToast({ title: 'Error', content: displayMessage, type: 'error' });
    }
  }, [selectedProposal, selectedListing]);

  /**
   * Handle reject from editing view
   */
  const handleRejectFromEditing = useCallback(async (proposal, reason) => {
    try {
      // Status must use full Bubble display format for status transition validation
      const { data, error } = await supabase.functions.invoke('proposal', {
        body: {
          action: 'update',
          payload: {
            proposal_id: proposal._id || proposal.id,
            status: 'Proposal Rejected by Host',
            reason_for_cancellation: reason
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
      showToast({ title: 'Proposal Rejected', content: 'The proposal has been rejected.', type: 'info' });
      console.log('[useHostProposalsPageLogic] Proposal rejected from editing:', proposal._id);

    } catch (err) {
      console.error('Failed to reject proposal:', err);
      showToast({ title: 'Error', content: 'Failed to reject proposal. Please try again.', type: 'error' });
    }
  }, [selectedListing]);

  /**
   * Handle alert notifications from editing component
   * Supports object format { type, title, content } from HostEditingProposal
   */
  const handleEditingAlert = useCallback((alertData) => {
    // HostEditingProposal calls with object: { type, title, content }
    if (alertData && typeof alertData === 'object') {
      const toastType = alertData.type === 'information' ? 'info' : (alertData.type || 'info');
      showToast({
        title: alertData.title || 'Notification',
        content: alertData.content || '',
        type: toastType
      });
    } else if (typeof alertData === 'string') {
      // Fallback for string messages
      showToast({ title: alertData, type: 'info' });
    }
  }, []);

  /**
   * Handle send message
   */
  const handleSendMessage = useCallback((proposal) => {
    const guest = proposal.guest || proposal.Guest || proposal['Created By'] || {};
    const guestName = guest.firstName || guest['First Name'] || 'Guest';
    showToast({ title: 'Opening Messages', content: `Opening message thread with ${guestName}`, type: 'info' });
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
      showToast({ title: 'Coming Soon', content: 'Reminder feature coming soon! For urgent matters, please contact support@splitlease.com', type: 'info' });
    } catch (err) {
      console.error('Failed to send reminder:', err);
      showToast({ title: 'Error', content: 'Failed to send reminder. Please try again.', type: 'error' });
    }
  }, []);

  /**
   * Handle virtual meeting button click - opens VirtualMeetingManager modal
   * Determines the appropriate view based on VM state (request, respond, details, etc.)
   */
  const handleChooseVirtualMeeting = useCallback((proposal) => {
    if (!proposal) return;

    const vm = proposal.virtualMeeting;
    const currentUserId = user?._id || user?.userId;

    let view = 'request'; // Default: no VM exists, show request view

    if (!vm) {
      // No VM exists - show request view
      view = 'request';
    } else if (vm.meetingDeclined) {
      // VM was declined - show request alternative view
      view = 'request';
    } else if (vm.confirmedBySplitlease) {
      // VM confirmed - show details view
      view = 'details';
    } else if (vm.bookedDate && !vm.meetingDeclined) {
      // VM is booked but not confirmed
      if (vm.requestedBy === currentUserId) {
        // Host requested - show details (awaiting guest response)
        view = 'details';
      } else {
        // Guest requested - host needs to respond
        view = 'respond';
      }
    } else if (vm.requestedBy && vm.requestedBy !== currentUserId) {
      // Pending request from guest - host needs to respond
      view = 'respond';
    } else if (vm.requestedBy === currentUserId) {
      // Host already requested - show details/status
      view = 'details';
    }

    setVirtualMeetingProposal(proposal);
    setVirtualMeetingView(view);
    setIsVirtualMeetingModalOpen(true);
    setIsModalOpen(false); // Close the details modal
  }, [user]);

  /**
   * Handle closing the virtual meeting modal
   */
  const handleCloseVirtualMeetingModal = useCallback(() => {
    setIsVirtualMeetingModalOpen(false);
    setVirtualMeetingView('');
    setVirtualMeetingProposal(null);
  }, []);

  /**
   * Handle successful virtual meeting operation - refresh proposals
   */
  const handleVirtualMeetingSuccess = useCallback(async () => {
    // Refresh proposals to get updated VM data
    if (selectedListing) {
      const proposalsResult = await fetchProposalsForListing(selectedListing._id || selectedListing.id);
      setProposals(proposalsResult);
    }
    handleCloseVirtualMeetingModal();
  }, [selectedListing, handleCloseVirtualMeetingModal]);

  /**
   * Handle request rental application
   * Sends a reminder to the guest to submit their rental application
   */
  const handleRequestRentalApp = useCallback((proposal) => {
    const guest = proposal.guest || proposal.Guest || proposal['Created By'] || {};
    const guestName = guest.firstName || guest['First Name'] || 'Guest';
    showToast({ title: 'Request Sent!', content: `Rental application request sent to ${guestName}! They will be notified to complete their application.`, type: 'success' });
    // TODO: Call API to send rental app request notification to guest
  }, []);

  /**
   * Handle edit listing
   */
  const handleEditListing = useCallback(() => {
    if (selectedListing) {
      window.location.href = `/listing-dashboard?id=${selectedListing._id || selectedListing.id}`;
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
    showRejectOnOpen,

    // Virtual meeting state
    isVirtualMeetingModalOpen,
    virtualMeetingView,
    virtualMeetingProposal,

    // Reference data
    allHouseRules,

    // UI state
    isLoading,
    error,

    // Proposal counts for pill selector
    proposalCountsByListing,

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
    handleRequestRentalApp,
    handleEditListing,
    handleRetry,

    // Virtual meeting handlers
    handleCloseVirtualMeetingModal,
    handleVirtualMeetingSuccess,

    // Editing handlers
    handleCloseEditing,
    handleAcceptAsIs,
    handleCounteroffer,
    handleRejectFromEditing,
    handleEditingAlert
  };
}
