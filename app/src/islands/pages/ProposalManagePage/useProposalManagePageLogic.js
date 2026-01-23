/**
 * Proposal Management Page Logic Hook
 *
 * Follows the Hollow Component Pattern:
 * - ALL business logic is contained in this hook
 * - Page component only handles rendering
 *
 * Features:
 * - Admin-only access (Gold Standard Auth Pattern)
 * - Advanced proposal filtering
 * - Status management
 * - Quick proposal creation
 *
 * Architecture:
 * - Uses Supabase for database queries
 * - Uses Edge Functions for proposal operations
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { checkAuthStatus, validateTokenAndFetchUser } from '../../../lib/auth.js';
import { supabase } from '../../../lib/supabase.js';

// ============================================================================
// CONSTANTS
// ============================================================================

const PROPOSAL_STATUSES = [
  'Proposal Submitted for guest by Split Lease - Awaiting Rental Application',
  'Proposal Submitted by guest - Awaiting Rental Application',
  'Proposal Submitted for guest by Split Lease - Pending Confirmation',
  'Host Review',
  'Host Counteroffer Submitted / Awaiting Guest Review',
  'Proposal or Counteroffer Accepted / Drafting Lease Documents',
  'Lease Documents Sent for Review',
  'Lease Documents Sent for Signatures',
  'Lease Documents Signed / Awaiting Initial payment',
  'Initial Payment Submitted / Lease activated',
  'Proposal Cancelled by Guest',
  'Proposal Rejected by Host',
  'Proposal Cancelled by Split Lease',
  'Guest Ignored Suggestion'
];

// ============================================================================
// DATA NORMALIZERS
// ============================================================================

/**
 * Normalize guest data from database format
 * @param {Object} guest - Raw guest from database
 * @returns {Object} Normalized guest
 */
function normalizeGuest(guest) {
  if (!guest) return null;

  return {
    _id: guest._id,
    firstName: guest['Name - First'] || guest.firstName || '',
    lastName: guest['Name - Last'] || guest.lastName || '',
    fullName: guest['Name - Full'] || guest.fullName || '',
    email: guest.email || '',
    phoneNumber: guest['Phone Number'] || guest.phoneNumber || '',
    profilePhoto: guest['Profile Photo'] || guest.profilePhoto || null,
    aboutMe: guest['About Me / Bio'] || guest.aboutMe || '',
    isUsabilityTester: guest['is usability tester'] || guest.isUsabilityTester || false,
    isVerified: guest['user verified?'] || false
  };
}

/**
 * Normalize host data from database format
 * @param {Object} host - Raw host from database
 * @returns {Object} Normalized host
 */
function normalizeHost(host) {
  if (!host) return null;

  return {
    _id: host._id,
    firstName: host['Name - First'] || host.firstName || '',
    lastName: host['Name - Last'] || host.lastName || '',
    fullName: host['Name - Full'] || host.fullName || '',
    email: host.email || '',
    phoneNumber: host['Phone Number'] || host.phoneNumber || '',
    profilePhoto: host['Profile Photo'] || host.profilePhoto || null,
    isUsabilityTester: host['is usability tester'] || host.isUsabilityTester || false
  };
}

/**
 * Normalize listing data from database format
 * @param {Object} listing - Raw listing from database
 * @returns {Object} Normalized listing
 */
function normalizeListing(listing) {
  if (!listing) return null;

  return {
    _id: listing._id,
    name: listing.Name || listing.name || 'Unnamed Listing',
    address: listing['Full Address'] || listing.address || '',
    rentalType: listing['rental type'] || listing.rentalType || '',
    coverPhoto: listing['Cover Photo'] || listing.coverPhoto || null,
    damageDeposit: listing['Damage Deposit'] || listing.damageDeposit || 0,
    cleaningCost: listing['Cleaning Cost / Maintenance Fee'] || listing.cleaningCost || 0,
    houseRules: listing['House Rules'] || listing.houseRules || []
  };
}

/**
 * Normalize proposal data from database format
 * @param {Object} proposal - Raw proposal from database
 * @param {Object} guest - Normalized guest data
 * @param {Object} host - Normalized host data
 * @param {Object} listing - Normalized listing data
 * @returns {Object} Normalized proposal
 */
function normalizeProposal(proposal, guest, host, listing) {
  if (!proposal) return null;

  // Parse days selected - handle both array and JSON string formats
  let daysSelected = proposal['Days Selected'] || proposal.daysSelected || [];
  if (typeof daysSelected === 'string') {
    try {
      daysSelected = JSON.parse(daysSelected);
    } catch {
      daysSelected = [];
    }
  }

  // Create weekly schedule array (7 booleans for Sun-Sat)
  const weeklySchedule = [false, false, false, false, false, false, false];
  if (Array.isArray(daysSelected)) {
    daysSelected.forEach(day => {
      if (typeof day === 'number' && day >= 0 && day <= 6) {
        weeklySchedule[day] = true;
      }
    });
  }

  return {
    _id: proposal._id,
    status: proposal.Status || proposal.status || '',
    createdDate: proposal['Created Date'] || proposal.createdDate || null,
    modifiedDate: proposal['Modified Date'] || proposal.modifiedDate || null,

    guest,
    host,
    listing,

    // Pricing
    pricing: {
      nightlyPrice: proposal['proposal nightly price'] || proposal.nightlyPrice || 0,
      totalReservationPrice: proposal['Total Price for Reservation (guest)'] || proposal.totalReservationPrice || 0,
      hostCompensation: proposal['host compensation'] || proposal.hostCompensation || 0,
      totalCompensation: proposal['Total Compensation (proposal - host)'] || proposal.totalCompensation || 0,
      pricePerFourWeeks: proposal['4 week rent'] || proposal.pricePerFourWeeks || 0,
      fourWeekCompensation: proposal['4 week compensation'] || proposal.fourWeekCompensation || 0
    },

    // Reservation details
    reservation: {
      moveInDate: proposal['Move in range start'] || proposal.moveInDate || null,
      checkInDate: proposal['check in day'] || proposal.checkInDate || null,
      checkOutDate: proposal['check out day'] || proposal.checkOutDate || null,
      reservationSpanWeeks: proposal['Reservation Span (Weeks)'] || proposal.reservationSpanWeeks || 0,
      weeklySchedule,
      daysSelected
    },

    // Guest info
    guestAbout: proposal.about_yourself || '',
    guestNeedForSpace: proposal['need for space'] || '',
    comment: proposal.Comment || ''
  };
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook for Proposal Management Page business logic
 */
export function useProposalManagePageLogic() {
  // ============================================================================
  // AUTH STATE
  // ============================================================================
  const [authState, setAuthState] = useState({
    isChecking: true,
    isAuthenticated: false,
    isAdmin: false,
    shouldRedirect: false
  });

  // ============================================================================
  // FILTER STATE
  // ============================================================================
  const [filters, setFilters] = useState({
    guestSearch: '',
    hostSearch: '',
    status: '',
    proposalId: '',
    listingSearch: '',
    startDate: null,
    endDate: null,
    sortDirection: 'desc'
  });

  // ============================================================================
  // DATA STATE
  // ============================================================================
  const [proposals, setProposals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalCount, setTotalCount] = useState(0);

  // ============================================================================
  // CREATION FORM STATE
  // ============================================================================
  const [isCreationFormOpen, setIsCreationFormOpen] = useState(false);

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
            isAdmin: false,
            shouldRedirect: true
          });
          window.location.href = '/';
          return;
        }

        // Gold Standard Auth Pattern - Step 2: Deep validation
        const userData = await validateTokenAndFetchUser({ clearOnFailure: false });

        if (!userData) {
          // Fallback to session metadata
          const { data: { session } } = await supabase.auth.getSession();

          if (!session?.user) {
            console.log('[ProposalManage] No valid session, redirecting');
            setAuthState({
              isChecking: false,
              isAuthenticated: false,
              isAdmin: false,
              shouldRedirect: true
            });
            window.location.href = '/';
            return;
          }
        }

        // Check admin status via user table
        const userId = userData?.userId || userData?._id;
        if (!userId) {
          console.log('[ProposalManage] No user ID, redirecting');
          window.location.href = '/';
          return;
        }

        // Query user table for admin status
        const { data: userRecord, error: userError } = await supabase
          .from('user')
          .select('_id, "Admin?"')
          .eq('_id', userId)
          .single();

        if (userError) {
          console.error('[ProposalManage] Error checking admin status:', userError);
        }

        const isAdmin = userRecord?.['Admin?'] === true;

        if (!isAdmin) {
          console.warn('[ProposalManage] User is not admin, redirecting...');
          setAuthState({
            isChecking: false,
            isAuthenticated: true,
            isAdmin: false,
            shouldRedirect: true
          });
          window.location.href = '/';
          return;
        }

        setAuthState({
          isChecking: false,
          isAuthenticated: true,
          isAdmin: true,
          shouldRedirect: false
        });

        // Load proposals
        await loadProposals();

      } catch (err) {
        console.error('[ProposalManage] Auth check failed:', err);
        setError('Authentication failed. Please log in again.');
        setAuthState({
          isChecking: false,
          isAuthenticated: false,
          isAdmin: false,
          shouldRedirect: true
        });
      }
    }

    checkAuth();
  }, []);

  // ============================================================================
  // LOAD PROPOSALS WHEN FILTERS CHANGE
  // ============================================================================
  useEffect(() => {
    if (authState.isAdmin && !authState.isChecking) {
      loadProposals();
    }
  }, [filters, authState.isAdmin, authState.isChecking]);

  // ============================================================================
  // CHECK URL FOR PROPOSAL ID
  // ============================================================================
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const proposalId = urlParams.get('proposal');
    if (proposalId && proposalId !== filters.proposalId) {
      setFilters(prev => ({ ...prev, proposalId }));
    }
  }, []);

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  /**
   * Load proposals with current filters
   */
  const loadProposals = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Build query
      let query = supabase
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
          "proposal nightly price",
          "4 week rent",
          "Total Price for Reservation (guest)",
          "Total Compensation (proposal - host)",
          "host compensation",
          "4 week compensation",
          "cleaning fee",
          "damage deposit",
          "need for space",
          "about_yourself",
          "Comment",
          "Created Date",
          "Modified Date"
        `, { count: 'exact' })
        .or('"Deleted".is.null,"Deleted".eq.false');

      // Apply filters
      if (filters.proposalId) {
        query = query.ilike('_id', `%${filters.proposalId}%`);
      }

      if (filters.status) {
        query = query.eq('Status', filters.status);
      }

      if (filters.startDate) {
        const startDateStr = filters.startDate instanceof Date
          ? filters.startDate.toISOString()
          : filters.startDate;
        query = query.gte('"Modified Date"', startDateStr);
      }

      if (filters.endDate) {
        const endDateStr = filters.endDate instanceof Date
          ? filters.endDate.toISOString()
          : filters.endDate;
        query = query.lte('"Modified Date"', endDateStr);
      }

      // Sort
      query = query.order('Modified Date', { ascending: filters.sortDirection === 'asc' });

      // Limit results
      query = query.limit(100);

      const { data: proposalsData, error: proposalsError, count } = await query;

      if (proposalsError) {
        console.error('[ProposalManage] Error fetching proposals:', proposalsError);
        throw proposalsError;
      }

      // Fetch related data (guests, hosts, listings)
      const guestIds = [...new Set(proposalsData?.map(p => p.Guest).filter(Boolean))];
      const hostIds = [...new Set(proposalsData?.map(p => p['Host User']).filter(Boolean))];
      const listingIds = [...new Set(proposalsData?.map(p => p.Listing).filter(Boolean))];

      // Fetch guests
      const guestMap = {};
      if (guestIds.length > 0) {
        const { data: guests } = await supabase
          .from('user')
          .select('_id, "Name - Full", "Name - First", "Name - Last", email, "Phone Number", "Profile Photo", "About Me / Bio", "user verified?", "is usability tester"')
          .in('_id', guestIds);

        guests?.forEach(g => { guestMap[g._id] = normalizeGuest(g); });
      }

      // Fetch hosts (also from user table)
      const hostMap = {};
      if (hostIds.length > 0) {
        const { data: hosts } = await supabase
          .from('user')
          .select('_id, "Name - Full", "Name - First", "Name - Last", email, "Phone Number", "Profile Photo", "is usability tester"')
          .in('_id', hostIds);

        hosts?.forEach(h => { hostMap[h._id] = normalizeHost(h); });
      }

      // Fetch listings
      const listingMap = {};
      if (listingIds.length > 0) {
        const { data: listings } = await supabase
          .from('listing')
          .select('_id, Name, "Full Address", "rental type", "Cover Photo", "Damage Deposit", "Cleaning Cost / Maintenance Fee"')
          .in('_id', listingIds);

        listings?.forEach(l => { listingMap[l._id] = normalizeListing(l); });
      }

      // Normalize and combine data
      const normalizedProposals = proposalsData?.map(p => {
        const guest = guestMap[p.Guest] || null;
        const host = hostMap[p['Host User']] || null;
        const listing = listingMap[p.Listing] || null;
        return normalizeProposal(p, guest, host, listing);
      }) || [];

      // Apply text search filters (client-side since they require joins)
      let filteredProposals = normalizedProposals;

      if (filters.guestSearch) {
        const searchLower = filters.guestSearch.toLowerCase();
        filteredProposals = filteredProposals.filter(p =>
          p.guest?.fullName?.toLowerCase().includes(searchLower) ||
          p.guest?.firstName?.toLowerCase().includes(searchLower) ||
          p.guest?.lastName?.toLowerCase().includes(searchLower) ||
          p.guest?.email?.toLowerCase().includes(searchLower) ||
          p.guest?.phoneNumber?.includes(filters.guestSearch)
        );
      }

      if (filters.hostSearch) {
        const searchLower = filters.hostSearch.toLowerCase();
        filteredProposals = filteredProposals.filter(p =>
          p.host?.fullName?.toLowerCase().includes(searchLower) ||
          p.host?.firstName?.toLowerCase().includes(searchLower) ||
          p.host?.lastName?.toLowerCase().includes(searchLower) ||
          p.host?.email?.toLowerCase().includes(searchLower) ||
          p.host?.phoneNumber?.includes(filters.hostSearch)
        );
      }

      if (filters.listingSearch) {
        const searchLower = filters.listingSearch.toLowerCase();
        filteredProposals = filteredProposals.filter(p =>
          p.listing?.name?.toLowerCase().includes(searchLower) ||
          p.listing?._id?.toLowerCase().includes(searchLower) ||
          p.listing?.rentalType?.toLowerCase().includes(searchLower)
        );
      }

      setProposals(filteredProposals);
      setTotalCount(filteredProposals.length);

    } catch (err) {
      console.error('[ProposalManage] Failed to load proposals:', err);
      setError('Failed to load proposals. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  /**
   * Handle filter change
   */
  const handleFilterChange = useCallback((filterName, value) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
  }, []);

  /**
   * Handle clear all filters
   */
  const handleClearFilters = useCallback(() => {
    setFilters({
      guestSearch: '',
      hostSearch: '',
      status: '',
      proposalId: '',
      listingSearch: '',
      startDate: null,
      endDate: null,
      sortDirection: 'desc'
    });
  }, []);

  /**
   * Handle status change for a proposal
   */
  const handleStatusChange = useCallback(async (proposalId, newStatus) => {
    try {
      // Optimistic update
      setProposals(prev =>
        prev.map(p =>
          p._id === proposalId
            ? { ...p, status: newStatus, modifiedDate: new Date().toISOString() }
            : p
        )
      );

      // Call Edge Function to update status
      const { error } = await supabase.functions.invoke('proposal', {
        body: {
          action: 'update',
          payload: {
            proposal_id: proposalId,
            status: newStatus
          }
        }
      });

      if (error) throw error;

      console.log('[ProposalManage] Status updated:', proposalId, newStatus);

    } catch (err) {
      console.error('[ProposalManage] Failed to update status:', err);
      alert('Failed to update status. Please try again.');
      // Revert optimistic update by reloading
      loadProposals();
    }
  }, [loadProposals]);

  /**
   * Handle various proposal actions
   */
  const handleAction = useCallback(async (action, proposal) => {
    switch (action) {
      case 'viewListing':
        window.open(`/view-split-lease?id=${proposal.listing?._id}`, '_blank');
        break;

      case 'modifyAsHost':
        // TODO: Open host editing modal
        alert('Host modification feature coming soon');
        break;

      case 'modifyAsGuest':
        // TODO: Open guest editing modal
        alert('Guest modification feature coming soon');
        break;

      case 'sendReminderGuest':
        try {
          alert(`Reminder sent to ${proposal.guest?.firstName || 'Guest'}`);
          // TODO: Implement actual reminder via messaging Edge Function
        } catch (err) {
          alert('Failed to send reminder');
        }
        break;

      case 'sendReminderHost':
        try {
          alert(`Reminder sent to ${proposal.host?.firstName || 'Host'}`);
          // TODO: Implement actual reminder via messaging Edge Function
        } catch (err) {
          alert('Failed to send reminder');
        }
        break;

      case 'cancelProposal':
        if (window.confirm(`Are you sure you want to cancel proposal ${proposal._id}?`)) {
          try {
            await handleStatusChange(proposal._id, 'Proposal Cancelled by Split Lease');
          } catch (err) {
            alert('Failed to cancel proposal');
          }
        }
        break;

      default:
        console.log('[ProposalManage] Unknown action:', action);
    }
  }, [handleStatusChange]);

  /**
   * Handle retry after error
   */
  const handleRetry = useCallback(() => {
    loadProposals();
  }, [loadProposals]);

  /**
   * Toggle creation form visibility
   */
  const handleToggleCreationForm = useCallback(() => {
    setIsCreationFormOpen(prev => !prev);
  }, []);

  /**
   * Handle proposal creation
   */
  const handleCreateProposal = useCallback(async (proposalData) => {
    try {
      const { data, error } = await supabase.functions.invoke('proposal', {
        body: {
          action: 'create_suggested',
          payload: {
            guestId: proposalData.selectedGuest._id,
            listingId: proposalData.selectedListing._id,
            moveInStartRange: proposalData.moveInDate,
            daysSelected: proposalData.weeklySchedule
              .map((active, i) => active ? i : null)
              .filter(i => i !== null),
            reservationSpanWeeks: proposalData.reservationSpanWeeks,
            aboutMe: proposalData.guestAbout,
            needForSpace: proposalData.guestNeedForSpace,
            specialNeeds: proposalData.guestSpecialNeeds,
            status: proposalData.proposalStatus
          }
        }
      });

      if (error) throw error;

      // Reload proposals to show the new one
      await loadProposals();

      return {
        success: true,
        proposalId: data?.data?.proposalId,
        threadId: data?.data?.threadId
      };

    } catch (err) {
      console.error('[ProposalManage] Failed to create proposal:', err);
      return { success: false, error: err.message };
    }
  }, [loadProposals]);

  // ============================================================================
  // MEMOIZED VALUES
  // ============================================================================

  const statusOptions = useMemo(() =>
    PROPOSAL_STATUSES.map(status => ({
      value: status,
      label: status || '(empty)'
    })),
    []
  );

  // ============================================================================
  // RETURN HOOK API
  // ============================================================================
  return {
    // Auth state
    authState,

    // Data
    proposals,
    filters,
    totalCount,
    statusOptions,

    // UI state
    isLoading,
    error,
    isCreationFormOpen,

    // Handlers
    handleFilterChange,
    handleClearFilters,
    handleStatusChange,
    handleAction,
    handleRetry,

    // Quick creation
    handleToggleCreationForm,
    handleCreateProposal
  };
}
