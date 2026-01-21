import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../../../lib/supabase.js';
import { useToast } from '../../shared/Toast';

/**
 * useCoHostRequestsPageLogic - Logic hook for Co-Host Requests Admin Page
 *
 * Hollow Component Pattern: ALL business logic lives here.
 * The page component only handles rendering.
 *
 * Handles:
 * - Fetching and displaying co-host requests with pagination
 * - Filtering by status and search text
 * - Sorting by date, status, etc.
 * - Updating request status
 * - Assigning co-hosts to requests
 * - Adding admin/request notes
 * - Statistics dashboard
 * - Detail modal management
 *
 * Database table: co_hostrequest
 * Edge Function: co-host-requests
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

// Items per page for pagination
const PAGE_SIZE = 25;

/**
 * @typedef {Object} CoHostRequest
 * @property {string} id - Request ID
 * @property {string} status - DB status value
 * @property {string} statusLabel - Display label
 * @property {string} statusColor - UI color
 * @property {boolean} canAssign - Whether co-host can be assigned
 * @property {boolean} canClose - Whether request can be closed
 * @property {string} subject - Request subject
 * @property {string} details - Request details
 * @property {string} hostName - Host user name
 * @property {string} hostEmail - Host email
 * @property {string|null} cohostName - Assigned co-host name
 * @property {string|null} listingName - Listing name
 * @property {string|null} listingBorough - Listing borough
 * @property {string} createdDate - Creation date
 * @property {string} modifiedDate - Last modified date
 * @property {string|null} adminNotes - Admin notes
 * @property {string|null} requestNotes - Request notes
 * @property {string|null} meetingLink - Meeting link
 */

/**
 * @typedef {Object} Statistics
 * @property {Record<string, number>} counts - Counts by status
 * @property {number} total - Total requests
 * @property {Record<string, {label: string, color: string}>} statusConfig - Status display config
 */

export default function useCoHostRequestsPageLogic() {
  const { showToast } = useToast();

  // ===== LIST STATE =====
  const [requests, setRequests] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  // ===== FILTER STATE =====
  const [statusFilter, setStatusFilter] = useState(''); // Empty = all statuses
  const [searchText, setSearchText] = useState('');
  const [sortField, setSortField] = useState('createdDate');
  const [sortOrder, setSortOrder] = useState('desc');

  // ===== STATISTICS STATE =====
  const [statistics, setStatistics] = useState(null);
  const [statusConfig, setStatusConfig] = useState({});

  // ===== DETAIL MODAL STATE =====
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // ===== ASSIGN CO-HOST STATE =====
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assigningRequestId, setAssigningRequestId] = useState(null);
  const [availableCoHosts, setAvailableCoHosts] = useState([]);
  const [isLoadingCoHosts, setIsLoadingCoHosts] = useState(false);

  // ===== NOTES STATE =====
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const [editingNotesRequest, setEditingNotesRequest] = useState(null);

  // ===== PROCESSING STATE =====
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  // ===== EFFECTS =====

  // Initial data fetch
  useEffect(() => {
    fetchRequests();
    fetchStatistics();
  }, []);

  // Refetch when filters/pagination change
  useEffect(() => {
    fetchRequests();
  }, [statusFilter, searchText, sortField, sortOrder, currentPage]);

  // ===== API HELPERS =====

  /**
   * Call the Edge Function with an action
   */
  async function callEdgeFunction(action, payload = {}) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('You must be logged in to perform this action');
    }

    const response = await fetch(`${SUPABASE_URL}/functions/v1/co-host-requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ action, payload }),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Request failed');
    }

    return result.data;
  }

  // ===== DATA FETCHING =====

  /**
   * Fetch co-host requests with current filters
   */
  const fetchRequests = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const data = await callEdgeFunction('list', {
        limit: PAGE_SIZE,
        offset: (currentPage - 1) * PAGE_SIZE,
        filters: {
          status: statusFilter || undefined,
          searchText: searchText || undefined,
        },
        sortField,
        sortOrder,
      });

      setRequests(data.requests || []);
      setTotalCount(data.total || 0);
      if (data.statusConfig) {
        setStatusConfig(data.statusConfig);
      }
    } catch (err) {
      console.error('[useCoHostRequestsPageLogic] Fetch error:', err);
      setError(err.message);
      showToast(err.message || 'Failed to fetch requests', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, statusFilter, searchText, sortField, sortOrder, showToast]);

  /**
   * Fetch statistics (counts by status)
   */
  const fetchStatistics = useCallback(async () => {
    try {
      const data = await callEdgeFunction('getStatistics');
      setStatistics(data);
      if (data.statusConfig) {
        setStatusConfig(data.statusConfig);
      }
    } catch (err) {
      console.error('[useCoHostRequestsPageLogic] Stats error:', err);
      // Don't show error toast for stats - not critical
    }
  }, []);

  /**
   * Fetch single request details
   */
  const fetchRequestDetails = useCallback(async (requestId) => {
    try {
      setIsProcessing(true);
      const data = await callEdgeFunction('getById', { requestId });
      return data.request;
    } catch (err) {
      console.error('[useCoHostRequestsPageLogic] Fetch details error:', err);
      showToast(err.message || 'Failed to fetch request details', 'error');
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [showToast]);

  /**
   * Fetch available co-hosts for assignment
   */
  const fetchAvailableCoHosts = useCallback(async (searchText = '') => {
    try {
      setIsLoadingCoHosts(true);
      const data = await callEdgeFunction('getAvailableCoHosts', { searchText });
      setAvailableCoHosts(data.cohosts || []);
    } catch (err) {
      console.error('[useCoHostRequestsPageLogic] Fetch co-hosts error:', err);
      showToast(err.message || 'Failed to fetch co-hosts', 'error');
    } finally {
      setIsLoadingCoHosts(false);
    }
  }, [showToast]);

  // ===== ACTION HANDLERS =====

  /**
   * Update request status
   */
  const updateStatus = useCallback(async (requestId, newStatus, adminNotes) => {
    try {
      setIsProcessing(true);
      const data = await callEdgeFunction('updateStatus', {
        requestId,
        newStatus,
        adminNotes,
      });

      // Update local state
      setRequests(prev => prev.map(r => r.id === requestId ? data.request : r));

      // Update selected request if open
      if (selectedRequest?.id === requestId) {
        setSelectedRequest(data.request);
      }

      // Refresh statistics
      fetchStatistics();

      showToast('Status updated successfully', 'success');
      return data.request;
    } catch (err) {
      console.error('[useCoHostRequestsPageLogic] Update status error:', err);
      showToast(err.message || 'Failed to update status', 'error');
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [selectedRequest, fetchStatistics, showToast]);

  /**
   * Assign co-host to request
   */
  const assignCoHost = useCallback(async (requestId, cohostUserId) => {
    try {
      setIsProcessing(true);
      const data = await callEdgeFunction('assignCoHost', {
        requestId,
        cohostUserId,
      });

      // Update local state
      setRequests(prev => prev.map(r => r.id === requestId ? data.request : r));

      // Update selected request if open
      if (selectedRequest?.id === requestId) {
        setSelectedRequest(data.request);
      }

      // Close assign modal
      setIsAssignModalOpen(false);
      setAssigningRequestId(null);

      // Refresh statistics
      fetchStatistics();

      showToast('Co-host assigned successfully', 'success');
      return data.request;
    } catch (err) {
      console.error('[useCoHostRequestsPageLogic] Assign co-host error:', err);
      showToast(err.message || 'Failed to assign co-host', 'error');
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [selectedRequest, fetchStatistics, showToast]);

  /**
   * Add notes to request
   */
  const addNotes = useCallback(async (requestId, adminNotes, requestNotes) => {
    try {
      setIsProcessing(true);
      const data = await callEdgeFunction('addNotes', {
        requestId,
        adminNotes,
        requestNotes,
      });

      // Update local state
      setRequests(prev => prev.map(r => r.id === requestId ? data.request : r));

      // Update selected request if open
      if (selectedRequest?.id === requestId) {
        setSelectedRequest(data.request);
      }

      // Close notes modal
      setIsNotesModalOpen(false);
      setEditingNotesRequest(null);

      showToast('Notes saved successfully', 'success');
      return data.request;
    } catch (err) {
      console.error('[useCoHostRequestsPageLogic] Add notes error:', err);
      showToast(err.message || 'Failed to save notes', 'error');
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [selectedRequest, showToast]);

  /**
   * Close request (set status to "Request closed")
   */
  const closeRequest = useCallback(async (requestId, adminNotes) => {
    return updateStatus(requestId, 'Request closed', adminNotes);
  }, [updateStatus]);

  // ===== UI HANDLERS =====

  /**
   * Open detail modal for a request
   */
  const openDetailModal = useCallback(async (request) => {
    // Fetch fresh details
    const details = await fetchRequestDetails(request.id);
    if (details) {
      setSelectedRequest(details);
      setIsDetailModalOpen(true);
    }
  }, [fetchRequestDetails]);

  /**
   * Close detail modal
   */
  const closeDetailModal = useCallback(() => {
    setIsDetailModalOpen(false);
    setSelectedRequest(null);
  }, []);

  /**
   * Open assign co-host modal
   */
  const openAssignModal = useCallback((requestId) => {
    setAssigningRequestId(requestId);
    setIsAssignModalOpen(true);
    fetchAvailableCoHosts();
  }, [fetchAvailableCoHosts]);

  /**
   * Close assign co-host modal
   */
  const closeAssignModal = useCallback(() => {
    setIsAssignModalOpen(false);
    setAssigningRequestId(null);
    setAvailableCoHosts([]);
  }, []);

  /**
   * Open notes modal
   */
  const openNotesModal = useCallback((request) => {
    setEditingNotesRequest(request);
    setIsNotesModalOpen(true);
  }, []);

  /**
   * Close notes modal
   */
  const closeNotesModal = useCallback(() => {
    setIsNotesModalOpen(false);
    setEditingNotesRequest(null);
  }, []);

  /**
   * Handle status filter change
   */
  const handleStatusFilterChange = useCallback((status) => {
    setStatusFilter(status);
    setCurrentPage(1); // Reset to first page
  }, []);

  /**
   * Handle search text change
   */
  const handleSearchChange = useCallback((text) => {
    setSearchText(text);
    setCurrentPage(1); // Reset to first page
  }, []);

  /**
   * Handle sort change
   */
  const handleSortChange = useCallback((field) => {
    if (field === sortField) {
      // Toggle sort order
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
    setCurrentPage(1);
  }, [sortField]);

  /**
   * Handle page change
   */
  const handlePageChange = useCallback((page) => {
    setCurrentPage(page);
  }, []);

  /**
   * Clear all filters
   */
  const clearFilters = useCallback(() => {
    setStatusFilter('');
    setSearchText('');
    setSortField('createdDate');
    setSortOrder('desc');
    setCurrentPage(1);
  }, []);

  // ===== COMPUTED VALUES =====

  /**
   * Total number of pages
   */
  const totalPages = useMemo(() => {
    return Math.ceil(totalCount / PAGE_SIZE);
  }, [totalCount]);

  /**
   * Available status options for filter
   */
  const statusOptions = useMemo(() => {
    return Object.entries(statusConfig).map(([value, config]) => ({
      value,
      label: config.label,
      color: config.color,
    }));
  }, [statusConfig]);

  /**
   * Formatted statistics for display
   */
  const formattedStats = useMemo(() => {
    if (!statistics) return [];

    return Object.entries(statistics.counts || {}).map(([status, count]) => {
      const config = statusConfig[status] || { label: status, color: 'gray' };
      return {
        status,
        label: config.label,
        color: config.color,
        count,
      };
    });
  }, [statistics, statusConfig]);

  /**
   * Get status badge color class
   */
  const getStatusColor = useCallback((status) => {
    const config = statusConfig[status];
    return config?.color || 'gray';
  }, [statusConfig]);

  /**
   * Get status display label
   */
  const getStatusLabel = useCallback((status) => {
    const config = statusConfig[status];
    return config?.label || status;
  }, [statusConfig]);

  /**
   * Format date for display
   */
  const formatDate = useCallback((dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, []);

  return {
    // ===== LIST STATE =====
    requests,
    totalCount,
    currentPage,
    totalPages,
    isLoading,

    // ===== FILTER STATE =====
    statusFilter,
    searchText,
    sortField,
    sortOrder,
    statusOptions,

    // ===== STATISTICS STATE =====
    statistics,
    formattedStats,

    // ===== DETAIL MODAL STATE =====
    selectedRequest,
    isDetailModalOpen,

    // ===== ASSIGN MODAL STATE =====
    isAssignModalOpen,
    assigningRequestId,
    availableCoHosts,
    isLoadingCoHosts,

    // ===== NOTES MODAL STATE =====
    isNotesModalOpen,
    editingNotesRequest,

    // ===== PROCESSING STATE =====
    isProcessing,
    error,

    // ===== DATA FETCHING =====
    fetchRequests,
    fetchStatistics,
    fetchAvailableCoHosts,

    // ===== ACTION HANDLERS =====
    updateStatus,
    assignCoHost,
    addNotes,
    closeRequest,

    // ===== UI HANDLERS =====
    openDetailModal,
    closeDetailModal,
    openAssignModal,
    closeAssignModal,
    openNotesModal,
    closeNotesModal,
    handleStatusFilterChange,
    handleSearchChange,
    handleSortChange,
    handlePageChange,
    clearFilters,

    // ===== COMPUTED VALUES =====
    getStatusColor,
    getStatusLabel,
    formatDate,
  };
}
