/**
 * useUsabilityDataManagementPageLogic Hook
 *
 * Contains ALL business logic for the UsabilityDataManagementPage.
 * Following Hollow Component Pattern - page component contains no logic.
 */

import { useState, useEffect, useCallback } from 'react';
import { checkAuthStatus, validateTokenAndFetchUser } from '../../../lib/auth.js';
import {
  listHosts,
  listGuests,
  clearHostData,
  deleteHostListings,
  deleteHostTestStatus,
  clearGuestData,
  deleteGuestTestStatus,
  fetchListing,
  createQuickProposal,
  deleteProposal,
} from '../../../lib/usabilityDataService.js';
import {
  calculateQuickProposal,
  formatDayPattern,
  dayLabelToIndex,
  getAllDayIndices,
} from '../../../logic/calculators/pricing/calculateQuickProposal.js';

/**
 * Reservation span options (weeks)
 */
const RESERVATION_SPANS = [
  { value: 4, label: '4 weeks (1 month)' },
  { value: 8, label: '8 weeks (2 months)' },
  { value: 13, label: '13 weeks (3 months)' },
  { value: 26, label: '26 weeks (6 months)' },
  { value: 52, label: '52 weeks (1 year)' },
];

/**
 * Day labels for the day selector
 */
const DAY_LABELS = ['S', 'M', 'T', 'W', 'Th', 'F', 'Sa'];

export function useUsabilityDataManagementPageLogic() {
  // ============================================================================
  // Authentication State
  // ============================================================================
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // ============================================================================
  // Data State
  // ============================================================================
  const [hosts, setHosts] = useState([]);
  const [guests, setGuests] = useState([]);
  const [hostsLoading, setHostsLoading] = useState(false);
  const [guestsLoading, setGuestsLoading] = useState(false);

  // ============================================================================
  // Host Section State
  // ============================================================================
  const [selectedHost, setSelectedHost] = useState(null);
  const [hostActionLoading, setHostActionLoading] = useState(null);

  // ============================================================================
  // Guest Section State
  // ============================================================================
  const [selectedGuest, setSelectedGuest] = useState(null);
  const [guestActionLoading, setGuestActionLoading] = useState(null);

  // ============================================================================
  // Proposal Creation State
  // ============================================================================
  const [listingIdInput, setListingIdInput] = useState('');
  const [selectedListing, setSelectedListing] = useState(null);
  const [listingLoading, setListingLoading] = useState(false);
  const [selectedProposalGuest, setSelectedProposalGuest] = useState(null);
  const [moveInDate, setMoveInDate] = useState('');
  const [selectedDayIndices, setSelectedDayIndices] = useState([]);
  const [reservationWeeks, setReservationWeeks] = useState(13);
  const [proposalNotes, setProposalNotes] = useState('');
  const [proposalLoading, setProposalLoading] = useState(false);
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [recentProposalId, setRecentProposalId] = useState(null);
  const [recentThreadId, setRecentThreadId] = useState(null);

  // ============================================================================
  // Proposal Deletion State
  // ============================================================================
  const [deleteProposalIdInput, setDeleteProposalIdInput] = useState('');
  const [deleteProposalLoading, setDeleteProposalLoading] = useState(false);

  // ============================================================================
  // Alert State
  // ============================================================================
  const [alert, setAlert] = useState(null);

  // ============================================================================
  // Calculated Values
  // ============================================================================
  const pricing = calculateQuickProposal({
    nightlyPrice: selectedListing?.nightlyPrice || 0,
    selectedDayIndices,
    reservationWeeks,
  });

  const dayPattern = formatDayPattern(selectedDayIndices);

  // ============================================================================
  // Authentication
  // ============================================================================
  useEffect(() => {
    async function checkAuth() {
      try {
        setAuthLoading(true);
        const isLoggedIn = await checkAuthStatus();

        if (!isLoggedIn) {
          setAuthError('Please log in to access this page.');
          setIsAuthenticated(false);
          setIsAuthorized(false);
          return;
        }

        setIsAuthenticated(true);

        // Validate token and check authorization
        // The Edge Function will verify admin/corporate status
        const userData = await validateTokenAndFetchUser();
        if (!userData) {
          setAuthError('Session expired. Please log in again.');
          setIsAuthenticated(false);
          setIsAuthorized(false);
          return;
        }

        // Assume authorized for now - actual check happens on first API call
        setIsAuthorized(true);

      } catch (error) {
        console.error('[Auth] Error:', error);
        setAuthError(error.message);
        setIsAuthenticated(false);
        setIsAuthorized(false);
      } finally {
        setAuthLoading(false);
      }
    }

    checkAuth();
  }, []);

  // ============================================================================
  // Load Initial Data
  // ============================================================================
  useEffect(() => {
    if (isAuthenticated && isAuthorized) {
      loadHosts();
      loadGuests();
      setDefaultMoveInDate();
    }
  }, [isAuthenticated, isAuthorized]);

  const setDefaultMoveInDate = useCallback(() => {
    const today = new Date();
    today.setDate(today.getDate() + 7); // Default to 1 week from now
    setMoveInDate(today.toISOString().split('T')[0]);
  }, []);

  // ============================================================================
  // Host Operations
  // ============================================================================
  const loadHosts = useCallback(async () => {
    try {
      setHostsLoading(true);
      const result = await listHosts();
      setHosts(result.users || []);
    } catch (error) {
      console.error('[Hosts] Load error:', error);
      if (error.message.includes('Admin or corporate')) {
        setIsAuthorized(false);
        setAuthError('Admin or corporate access required.');
      } else {
        showAlertMessage('Error', `Failed to load hosts: ${error.message}`);
      }
    } finally {
      setHostsLoading(false);
    }
  }, []);

  const handleHostSelection = useCallback((hostId) => {
    const host = hosts.find(h => h.id === hostId);
    setSelectedHost(host || null);
  }, [hosts]);

  const handleClearHostData = useCallback(async () => {
    if (!selectedHost) {
      showAlertMessage('Error', 'Please select a host account first.');
      return;
    }

    try {
      setHostActionLoading('clearData');
      const result = await clearHostData(selectedHost.id);
      showAlertMessage('Success', `Cleared all threads, proposals, and data for ${selectedHost.fullName || selectedHost.email}.

Deleted ${result.deletedCounts.proposals} proposals and ${result.deletedCounts.threads} threads.`);
    } catch (error) {
      showAlertMessage('Error', `Failed to clear host data: ${error.message}`);
    } finally {
      setHostActionLoading(null);
    }
  }, [selectedHost]);

  const handleDeleteHostListings = useCallback(async () => {
    if (!selectedHost) {
      showAlertMessage('Error', 'Please select a host account first.');
      return;
    }

    try {
      setHostActionLoading('deleteListings');
      const result = await deleteHostListings(selectedHost.id);
      showAlertMessage('Success', `Deleted ${result.deletedCounts.listings} listings for ${selectedHost.fullName || selectedHost.email}.

Also deleted ${result.deletedCounts.proposals} associated proposals.`);
    } catch (error) {
      showAlertMessage('Error', `Failed to delete host listings: ${error.message}`);
    } finally {
      setHostActionLoading(null);
    }
  }, [selectedHost]);

  const handleDeleteHostTestStatus = useCallback(async () => {
    if (!selectedHost) {
      showAlertMessage('Error', 'Please select a host account first.');
      return;
    }

    try {
      setHostActionLoading('deleteTestStatus');
      const result = await deleteHostTestStatus(selectedHost.id);
      showAlertMessage('Success', `Reset usability test status for ${result.user.firstName || result.user.email}.`);
    } catch (error) {
      showAlertMessage('Error', `Failed to reset host test status: ${error.message}`);
    } finally {
      setHostActionLoading(null);
    }
  }, [selectedHost]);

  // ============================================================================
  // Guest Operations
  // ============================================================================
  const loadGuests = useCallback(async () => {
    try {
      setGuestsLoading(true);
      const result = await listGuests();
      setGuests(result.users || []);
    } catch (error) {
      console.error('[Guests] Load error:', error);
      showAlertMessage('Error', `Failed to load guests: ${error.message}`);
    } finally {
      setGuestsLoading(false);
    }
  }, []);

  const handleGuestSelection = useCallback((guestId) => {
    const guest = guests.find(g => g.id === guestId);
    setSelectedGuest(guest || null);
  }, [guests]);

  const handleClearGuestData = useCallback(async () => {
    if (!selectedGuest) {
      showAlertMessage('Error', 'Please select a guest account first.');
      return;
    }

    try {
      setGuestActionLoading('clearData');
      const result = await clearGuestData(selectedGuest.id);
      showAlertMessage('Success', `Cleared all threads, proposals, and data for ${selectedGuest.fullName || selectedGuest.email}.

Deleted ${result.deletedCounts.proposals} proposals and ${result.deletedCounts.threads} threads.`);
    } catch (error) {
      showAlertMessage('Error', `Failed to clear guest data: ${error.message}`);
    } finally {
      setGuestActionLoading(null);
    }
  }, [selectedGuest]);

  const handleDeleteGuestTestStatus = useCallback(async () => {
    if (!selectedGuest) {
      showAlertMessage('Error', 'Please select a guest account first.');
      return;
    }

    try {
      setGuestActionLoading('deleteTestStatus');
      const result = await deleteGuestTestStatus(selectedGuest.id);
      showAlertMessage('Success', `Reset usability test status for ${result.user.firstName || result.user.email}.`);
    } catch (error) {
      showAlertMessage('Error', `Failed to reset guest test status: ${error.message}`);
    } finally {
      setGuestActionLoading(null);
    }
  }, [selectedGuest]);

  // ============================================================================
  // Listing Operations
  // ============================================================================
  const handleLoadListing = useCallback(async () => {
    if (!listingIdInput.trim()) {
      showAlertMessage('Error', 'Please enter a listing ID.');
      return;
    }

    try {
      setListingLoading(true);
      const result = await fetchListing(listingIdInput.trim());
      setSelectedListing(result.listing);
    } catch (error) {
      showAlertMessage('Error', `Failed to load listing: ${error.message}`);
      setSelectedListing(null);
    } finally {
      setListingLoading(false);
    }
  }, [listingIdInput]);

  // ============================================================================
  // Day Selection Operations
  // ============================================================================
  const handleDayToggle = useCallback((dayLabel) => {
    const dayIndex = dayLabelToIndex(dayLabel);
    if (dayIndex === -1) return;

    setSelectedDayIndices(prev => {
      if (prev.includes(dayIndex)) {
        return prev.filter(d => d !== dayIndex);
      } else {
        return [...prev, dayIndex].sort((a, b) => a - b);
      }
    });
  }, []);

  const handleSelectFullTime = useCallback(() => {
    setSelectedDayIndices(getAllDayIndices());
  }, []);

  // ============================================================================
  // Proposal Creation Operations
  // ============================================================================
  const handleProposalGuestSelection = useCallback((guestId) => {
    const guest = guests.find(g => g.id === guestId);
    setSelectedProposalGuest(guest || null);
  }, [guests]);

  const handleOpenProposalModal = useCallback(() => {
    if (!selectedListing) {
      showAlertMessage('Error', 'Please load a listing first.');
      return;
    }

    if (!selectedProposalGuest) {
      showAlertMessage('Error', 'Please select a guest.');
      return;
    }

    if (selectedDayIndices.length === 0) {
      showAlertMessage('Error', 'Please select at least one day.');
      return;
    }

    setShowProposalModal(true);
  }, [selectedListing, selectedProposalGuest, selectedDayIndices]);

  const handleCloseProposalModal = useCallback(() => {
    setShowProposalModal(false);
    setProposalNotes('');
  }, []);

  const handleConfirmProposal = useCallback(async () => {
    try {
      setProposalLoading(true);

      const result = await createQuickProposal({
        listingId: selectedListing.id,
        guestId: selectedProposalGuest.id,
        moveInDate,
        selectedDayIndices,
        reservationWeeks,
        totalPrice: pricing.totalPrice,
        fourWeeksRent: pricing.fourWeeksRent,
        nightlyPrice: pricing.nightlyPrice,
        notes: proposalNotes,
      });

      setRecentProposalId(result.proposalId);
      setRecentThreadId(result.threadId);

      handleCloseProposalModal();
      showAlertMessage('Success', `Proposal created successfully!

Proposal ID: ${result.proposalId}
Thread ID: ${result.threadId}`);

    } catch (error) {
      showAlertMessage('Error', `Failed to create proposal: ${error.message}`);
    } finally {
      setProposalLoading(false);
    }
  }, [selectedListing, selectedProposalGuest, moveInDate, selectedDayIndices, reservationWeeks, pricing, proposalNotes, handleCloseProposalModal]);

  // ============================================================================
  // Proposal Deletion Operations
  // ============================================================================
  const handleDeleteProposal = useCallback(async () => {
    if (!deleteProposalIdInput.trim()) {
      showAlertMessage('Error', 'Please enter a proposal ID to delete.');
      return;
    }

    try {
      setDeleteProposalLoading(true);
      const result = await deleteProposal(deleteProposalIdInput.trim());
      setDeleteProposalIdInput('');
      showAlertMessage('Success', `Proposal ${result.proposalId} has been deleted.${result.threadDeleted ? ' Associated thread was also deleted.' : ''}`);
    } catch (error) {
      showAlertMessage('Error', `Failed to delete proposal: ${error.message}`);
    } finally {
      setDeleteProposalLoading(false);
    }
  }, [deleteProposalIdInput]);

  // ============================================================================
  // Alert Operations
  // ============================================================================
  const showAlertMessage = useCallback((title, content) => {
    setAlert({ title, content });
  }, []);

  const closeAlert = useCallback(() => {
    setAlert(null);
  }, []);

  // ============================================================================
  // Return API
  // ============================================================================
  return {
    // Auth
    isAuthenticated,
    isAuthorized,
    authLoading,
    authError,

    // Constants
    reservationSpans: RESERVATION_SPANS,
    dayLabels: DAY_LABELS,

    // Host Section
    hosts,
    hostsLoading,
    selectedHost,
    hostActionLoading,
    handleHostSelection,
    handleClearHostData,
    handleDeleteHostListings,
    handleDeleteHostTestStatus,

    // Guest Section
    guests,
    guestsLoading,
    selectedGuest,
    guestActionLoading,
    handleGuestSelection,
    handleClearGuestData,
    handleDeleteGuestTestStatus,

    // Listing Section
    listingIdInput,
    setListingIdInput,
    selectedListing,
    listingLoading,
    handleLoadListing,

    // Proposal Creation
    selectedProposalGuest,
    handleProposalGuestSelection,
    moveInDate,
    setMoveInDate,
    selectedDayIndices,
    handleDayToggle,
    handleSelectFullTime,
    reservationWeeks,
    setReservationWeeks,
    proposalNotes,
    setProposalNotes,
    pricing,
    dayPattern,
    recentProposalId,
    recentThreadId,
    proposalLoading,
    showProposalModal,
    handleOpenProposalModal,
    handleCloseProposalModal,
    handleConfirmProposal,

    // Proposal Deletion
    deleteProposalIdInput,
    setDeleteProposalIdInput,
    deleteProposalLoading,
    handleDeleteProposal,

    // Alert
    alert,
    closeAlert,
  };
}
