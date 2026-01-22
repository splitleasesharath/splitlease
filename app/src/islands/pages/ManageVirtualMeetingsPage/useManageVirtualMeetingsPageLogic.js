/**
 * useManageVirtualMeetingsPageLogic - All business logic for ManageVirtualMeetingsPage
 *
 * This hook follows the Hollow Component pattern - ALL logic lives here,
 * the page component is purely presentational.
 *
 * State Management:
 * - newRequests: Virtual meetings pending confirmation
 * - confirmedMeetings: Confirmed virtual meetings
 * - blockedSlots: Host availability blocks
 * - filters: Search/filter state
 * - modals: Modal open/close state with associated data
 *
 * @param {Object} options
 * @param {Function} options.showToast - Toast notification function
 * @returns {Object} All state and handlers for the page
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { checkAuthStatus } from '../../../lib/auth';
import {
  canConfirmMeeting,
  canDeleteMeeting,
  canEditMeetingDates
} from '../../../logic/rules/admin/virtualMeetingAdminRules';
import {
  filterMeetings,
  extractUniqueHosts
} from '../../../logic/processors/meetings/filterMeetings';
import {
  getStartOfWeek,
  addWeeks
} from '../../../logic/calculators/availability/calculateAvailableSlots';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

/**
 * @typedef {Object} VirtualMeeting
 * @property {string} _id - Unique meeting ID
 * @property {string} status - Meeting status (new_request, confirmed, cancelled, completed)
 * @property {Array<string>} suggested_dates_and_times - Guest's suggested dates
 * @property {string|null} booked_date - Confirmed meeting date
 * @property {string|null} meeting_link - Video meeting link
 * @property {Object} guest - Guest user data
 * @property {Object} host - Host user data
 * @property {string} proposal_unique_id - Associated proposal ID
 * @property {Date} created_at - Request creation date
 */

export function useManageVirtualMeetingsPageLogic({ showToast }) {
  // ===== STATE =====
  const [newRequests, setNewRequests] = useState([]);
  const [confirmedMeetings, setConfirmedMeetings] = useState([]);
  const [blockedSlots, setBlockedSlots] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingBlockedSlots, setIsLoadingBlockedSlots] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [accessToken, setAccessToken] = useState(null);

  // Filters
  const [filters, setFilters] = useState({
    guestSearch: '',
    hostId: '',
    proposalId: '',
    dateRange: null
  });

  // Selected host for availability calendar
  const [selectedHost, setSelectedHost] = useState(null);

  // Calendar navigation
  const [calendarWeekStart, setCalendarWeekStart] = useState(() => getStartOfWeek(new Date()));

  // Modal states (centralized)
  const [modals, setModals] = useState({
    confirm: { isOpen: false, meeting: null },
    edit: { isOpen: false, meeting: null },
    delete: { isOpen: false, meeting: null },
    reschedule: { isOpen: false, meeting: null }
  });

  // ===== DERIVED STATE =====

  // Extract unique hosts from all meetings for filter dropdown
  const hostOptions = useMemo(() => {
    const allMeetings = [...newRequests, ...confirmedMeetings];
    return extractUniqueHosts(allMeetings);
  }, [newRequests, confirmedMeetings]);

  // Filtered new requests
  const filteredNewRequests = useMemo(() => {
    return filterMeetings(newRequests, filters);
  }, [newRequests, filters]);

  // Filtered confirmed meetings
  const filteredConfirmedMeetings = useMemo(() => {
    return filterMeetings(confirmedMeetings, filters);
  }, [confirmedMeetings, filters]);

  // Statistics
  const stats = useMemo(() => ({
    totalRequests: newRequests.length + confirmedMeetings.length,
    pendingRequests: newRequests.length,
    confirmedMeetings: confirmedMeetings.filter(m => m.status === 'confirmed').length,
    completedMeetings: confirmedMeetings.filter(m => m.status === 'completed').length
  }), [newRequests, confirmedMeetings]);

  // ===== AUTH CHECK =====
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { user, session } = await checkAuthStatus();
        if (!user || !session) {
          showToast({ title: 'Authentication required', type: 'error' });
          window.location.href = '/?auth=login&redirect=' + encodeURIComponent(window.location.pathname);
          return;
        }
        // TODO: Add admin role check when auth supports roles
        setAccessToken(session.access_token);
      } catch (err) {
        console.error('[ManageVirtualMeetings] Auth check failed:', err);
        showToast({ title: 'Authentication failed', type: 'error' });
        window.location.href = '/';
      }
    };
    checkAuth();
  }, [showToast]);

  // ===== EDGE FUNCTION CALLER =====
  const callEdgeFunction = useCallback(async (action, payload) => {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/virtual-meeting`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ action, payload }),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || `Action ${action} failed`);
    }

    return result.data;
  }, [accessToken]);

  // ===== DATA FETCHING =====
  const fetchAllMeetings = useCallback(async () => {
    if (!accessToken) return;

    setIsLoading(true);
    setError(null);

    try {
      // Parallel fetch for new requests and confirmed meetings
      const [newRes, confirmedRes] = await Promise.all([
        callEdgeFunction('admin_fetch_new_requests', {}),
        callEdgeFunction('admin_fetch_confirmed', {})
      ]);

      setNewRequests(newRes || []);
      setConfirmedMeetings(confirmedRes || []);

    } catch (err) {
      console.error('[ManageVirtualMeetings] Fetch error:', err);
      setError(err.message);
      showToast({ title: 'Failed to load meetings', content: err.message, type: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, callEdgeFunction, showToast]);

  // Fetch blocked slots for selected host
  const fetchBlockedSlots = useCallback(async (hostId) => {
    if (!accessToken || !hostId) return;

    setIsLoadingBlockedSlots(true);

    try {
      const data = await callEdgeFunction('admin_fetch_blocked_slots', { hostId });
      setBlockedSlots(data || []);
    } catch (err) {
      console.error('[ManageVirtualMeetings] Fetch blocked slots error:', err);
      showToast({ title: 'Failed to load availability', content: err.message, type: 'error' });
    } finally {
      setIsLoadingBlockedSlots(false);
    }
  }, [accessToken, callEdgeFunction, showToast]);

  // Initial data load
  useEffect(() => {
    if (accessToken) {
      fetchAllMeetings();
    }
  }, [accessToken, fetchAllMeetings]);

  // Load blocked slots when host changes
  useEffect(() => {
    if (selectedHost) {
      fetchBlockedSlots(selectedHost.id);
    } else {
      setBlockedSlots([]);
    }
  }, [selectedHost, fetchBlockedSlots]);

  // ===== MEETING ACTIONS =====

  const handleConfirmMeeting = useCallback(async (meetingId, bookedDate, meetingLink) => {
    const meeting = newRequests.find(m => m._id === meetingId);
    if (!canConfirmMeeting(meeting)) {
      showToast({ title: 'Cannot confirm this meeting', type: 'error' });
      return;
    }

    setIsSubmitting(true);

    try {
      const updatedMeeting = await callEdgeFunction('admin_confirm_meeting', {
        meetingId,
        bookedDate,
        meetingLink
      });

      // Move from newRequests to confirmedMeetings
      setNewRequests(prev => prev.filter(m => m._id !== meetingId));
      setConfirmedMeetings(prev => [...prev, updatedMeeting]);

      showToast({ title: 'Meeting confirmed successfully', type: 'success' });
      handleCloseConfirmModal();

    } catch (err) {
      console.error('[ManageVirtualMeetings] Confirm error:', err);
      showToast({ title: 'Failed to confirm meeting', content: err.message, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  }, [newRequests, callEdgeFunction, showToast]);

  const handleUpdateMeetingDates = useCallback(async (meetingId, suggestedDates) => {
    const meeting = newRequests.find(m => m._id === meetingId);
    if (!canEditMeetingDates(meeting)) {
      showToast({ title: 'Cannot edit dates for this meeting', type: 'error' });
      return;
    }

    setIsSubmitting(true);

    try {
      const updatedMeeting = await callEdgeFunction('admin_update_meeting_dates', {
        meetingId,
        suggestedDates
      });

      // Update in newRequests
      setNewRequests(prev => prev.map(m =>
        m._id === meetingId ? updatedMeeting : m
      ));

      showToast({ title: 'Meeting dates updated', type: 'success' });
      handleCloseEditModal();

    } catch (err) {
      console.error('[ManageVirtualMeetings] Update dates error:', err);
      showToast({ title: 'Failed to update dates', content: err.message, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  }, [newRequests, callEdgeFunction, showToast]);

  const handleDeleteMeeting = useCallback(async (meetingId) => {
    const meeting = newRequests.find(m => m._id === meetingId) ||
                    confirmedMeetings.find(m => m._id === meetingId);

    if (!canDeleteMeeting(meeting)) {
      showToast({ title: 'Cannot delete this meeting', type: 'error' });
      return;
    }

    setIsSubmitting(true);

    try {
      await callEdgeFunction('admin_delete_meeting', { meetingId });

      // Remove from appropriate list
      setNewRequests(prev => prev.filter(m => m._id !== meetingId));
      setConfirmedMeetings(prev => prev.filter(m => m._id !== meetingId));

      showToast({ title: 'Meeting deleted', type: 'success' });
      handleCloseDeleteModal();

    } catch (err) {
      console.error('[ManageVirtualMeetings] Delete error:', err);
      showToast({ title: 'Failed to delete meeting', content: err.message, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  }, [newRequests, confirmedMeetings, callEdgeFunction, showToast]);

  // ===== AVAILABILITY ACTIONS =====

  const handleBlockSlot = useCallback(async (date, startTime, endTime) => {
    if (!selectedHost) {
      showToast({ title: 'Select a host first', type: 'warning' });
      return;
    }

    try {
      await callEdgeFunction('admin_block_time_slot', {
        hostId: selectedHost.id,
        date,
        startTime,
        endTime
      });

      // Refetch blocked slots
      await fetchBlockedSlots(selectedHost.id);
      showToast({ title: 'Time slot blocked', type: 'success' });

    } catch (err) {
      console.error('[ManageVirtualMeetings] Block slot error:', err);
      showToast({ title: 'Failed to block slot', content: err.message, type: 'error' });
    }
  }, [selectedHost, callEdgeFunction, fetchBlockedSlots, showToast]);

  const handleUnblockSlot = useCallback(async (slotId) => {
    try {
      await callEdgeFunction('admin_unblock_time_slot', { slotId });

      // Remove from local state
      setBlockedSlots(prev => prev.filter(s => s.id !== slotId));
      showToast({ title: 'Time slot unblocked', type: 'success' });

    } catch (err) {
      console.error('[ManageVirtualMeetings] Unblock slot error:', err);
      showToast({ title: 'Failed to unblock slot', content: err.message, type: 'error' });
    }
  }, [callEdgeFunction, showToast]);

  const handleBlockFullDay = useCallback(async (date) => {
    if (!selectedHost) {
      showToast({ title: 'Select a host first', type: 'warning' });
      return;
    }

    try {
      await callEdgeFunction('admin_block_full_day', {
        hostId: selectedHost.id,
        date
      });

      await fetchBlockedSlots(selectedHost.id);
      showToast({ title: 'Full day blocked', type: 'success' });

    } catch (err) {
      console.error('[ManageVirtualMeetings] Block full day error:', err);
      showToast({ title: 'Failed to block day', content: err.message, type: 'error' });
    }
  }, [selectedHost, callEdgeFunction, fetchBlockedSlots, showToast]);

  const handleUnblockFullDay = useCallback(async (date) => {
    if (!selectedHost) return;

    try {
      await callEdgeFunction('admin_unblock_full_day', {
        hostId: selectedHost.id,
        date
      });

      await fetchBlockedSlots(selectedHost.id);
      showToast({ title: 'Day unblocked', type: 'success' });

    } catch (err) {
      console.error('[ManageVirtualMeetings] Unblock full day error:', err);
      showToast({ title: 'Failed to unblock day', content: err.message, type: 'error' });
    }
  }, [selectedHost, callEdgeFunction, fetchBlockedSlots, showToast]);

  // ===== FILTER HANDLERS =====

  const handleFilterChange = useCallback((filterName, value) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters({
      guestSearch: '',
      hostId: '',
      proposalId: '',
      dateRange: null
    });
  }, []);

  // ===== HOST SELECTION =====

  const handleSelectHost = useCallback((host) => {
    setSelectedHost(host);
  }, []);

  // ===== CALENDAR NAVIGATION =====

  const handleNavigateWeek = useCallback((direction) => {
    setCalendarWeekStart(prev => addWeeks(prev, direction === 'next' ? 1 : -1));
  }, []);

  // ===== MODAL HANDLERS =====

  const handleOpenConfirmModal = useCallback((meeting) => {
    setModals(prev => ({
      ...prev,
      confirm: { isOpen: true, meeting }
    }));
  }, []);

  const handleCloseConfirmModal = useCallback(() => {
    setModals(prev => ({
      ...prev,
      confirm: { isOpen: false, meeting: null }
    }));
  }, []);

  const handleOpenEditModal = useCallback((meeting) => {
    setModals(prev => ({
      ...prev,
      edit: { isOpen: true, meeting }
    }));
  }, []);

  const handleCloseEditModal = useCallback(() => {
    setModals(prev => ({
      ...prev,
      edit: { isOpen: false, meeting: null }
    }));
  }, []);

  const handleOpenDeleteModal = useCallback((meeting) => {
    setModals(prev => ({
      ...prev,
      delete: { isOpen: true, meeting }
    }));
  }, []);

  const handleCloseDeleteModal = useCallback(() => {
    setModals(prev => ({
      ...prev,
      delete: { isOpen: false, meeting: null }
    }));
  }, []);

  const handleOpenRescheduleModal = useCallback((meeting) => {
    setModals(prev => ({
      ...prev,
      reschedule: { isOpen: true, meeting }
    }));
  }, []);

  const handleCloseRescheduleModal = useCallback(() => {
    setModals(prev => ({
      ...prev,
      reschedule: { isOpen: false, meeting: null }
    }));
  }, []);

  // ===== UI HANDLERS =====

  const handleRetry = useCallback(() => {
    fetchAllMeetings();
  }, [fetchAllMeetings]);

  const handleDismissError = useCallback(() => {
    setError(null);
  }, []);

  // ===== RETURN PUBLIC API =====
  return {
    // Data
    newRequests,
    confirmedMeetings,
    blockedSlots,
    stats,
    hostOptions,

    // Filtered data
    filteredNewRequests,
    filteredConfirmedMeetings,

    // Loading & Error
    isLoading,
    isLoadingBlockedSlots,
    isSubmitting,
    error,

    // Filters
    filters,
    handleFilterChange,
    handleClearFilters,

    // Host & Calendar
    selectedHost,
    handleSelectHost,
    calendarWeekStart,
    handleNavigateWeek,

    // Meeting Actions
    handleConfirmMeeting,
    handleUpdateMeetingDates,
    handleDeleteMeeting,

    // Availability Actions
    handleBlockSlot,
    handleUnblockSlot,
    handleBlockFullDay,
    handleUnblockFullDay,

    // Modal State & Handlers
    modals,
    handleOpenConfirmModal,
    handleCloseConfirmModal,
    handleOpenEditModal,
    handleCloseEditModal,
    handleOpenDeleteModal,
    handleCloseDeleteModal,
    handleOpenRescheduleModal,
    handleCloseRescheduleModal,

    // UI
    handleRetry,
    handleDismissError
  };
}
