/**
 * useLeasesOverviewPageLogic - All business logic for LeasesOverviewPage
 *
 * This hook follows the Hollow Component pattern - ALL logic lives here,
 * the page component is purely presentational.
 *
 * State Management:
 * - leases: Raw lease data from API
 * - filteredLeases: Filtered/sorted view of leases
 * - selectedLeases: IDs of selected leases for bulk operations
 * - UI state: loading, error, pagination, filters
 *
 * @param {Object} options
 * @param {Function} options.showToast - Toast notification function
 * @returns {Object} All state and handlers for the page
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { checkAuthStatus } from '../../../lib/auth';
import { adaptLeaseFromSupabase } from '../../../logic/processors/leases/adaptLeaseFromSupabase';
import { filterLeases } from '../../../logic/processors/leases/filterLeases';
import { sortLeases } from '../../../logic/processors/leases/sortLeases';
import { canDeleteLease } from '../../../logic/rules/leases/canDeleteLease';
import { canHardDeleteLease } from '../../../logic/rules/leases/canHardDeleteLease';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const PAGE_SIZE = 20;

/**
 * @typedef {Object} Lease
 * @property {string} id - Bubble-format ID (_id)
 * @property {string} agreementNumber - Human-readable agreement number
 * @property {string} status - Lease status (active, completed, cancelled, etc.)
 * @property {Date} startDate - Reservation start date
 * @property {Date} endDate - Reservation end date
 * @property {number} totalRent - Total rent amount
 * @property {number} totalCompensation - Total compensation amount
 * @property {Object|null} guest - Guest user data
 * @property {Object|null} host - Host user data
 * @property {Object|null} listing - Listing data
 * @property {Array} stays - Associated stays
 * @property {Date} createdAt - Record creation date
 * @property {Date} modifiedAt - Last modification date
 */

export function useLeasesOverviewPageLogic({ showToast }) {
  // ===== STATE =====
  const [leases, setLeases] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [accessToken, setAccessToken] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortField, setSortField] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Pagination
  const [page, setPage] = useState(1);

  // Selection for bulk operations
  const [selectedLeases, setSelectedLeases] = useState([]);

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState(null);

  // ===== FILTER & SORT OPTIONS =====
  const statusOptions = useMemo(() => [
    { value: 'all', label: 'All Statuses' },
    { value: 'active', label: 'Active' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'pending', label: 'Pending' },
  ], []);

  const sortOptions = useMemo(() => [
    { value: 'createdAt', label: 'Created Date' },
    { value: 'startDate', label: 'Start Date' },
    { value: 'endDate', label: 'End Date' },
    { value: 'totalRent', label: 'Total Rent' },
    { value: 'agreementNumber', label: 'Agreement #' },
  ], []);

  const bulkStatusOptions = useMemo(() => [
    { value: 'active', label: 'Mark Active' },
    { value: 'completed', label: 'Mark Completed' },
    { value: 'cancelled', label: 'Mark Cancelled' },
  ], []);

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
        setAccessToken(session.access_token);
      } catch (err) {
        console.error('[LeasesOverview] Auth check failed:', err);
        showToast({ title: 'Authentication failed', type: 'error' });
        window.location.href = '/';
      }
    };
    checkAuth();
  }, [showToast]);

  // ===== FETCH LEASES =====
  const fetchLeases = useCallback(async () => {
    if (!accessToken) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/leases-admin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          action: 'list',
          payload: {
            limit: 500, // Fetch all for client-side filtering
            offset: 0,
          },
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to fetch leases');
      }

      // Adapt raw Supabase data to our frontend model
      const adaptedLeases = (result.data || []).map(adaptLeaseFromSupabase);
      setLeases(adaptedLeases);
    } catch (err) {
      console.error('[LeasesOverview] Fetch error:', err);
      setError(err.message);
      showToast({ title: 'Failed to load leases', content: err.message, type: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, showToast]);

  useEffect(() => {
    if (accessToken) {
      fetchLeases();
    }
  }, [accessToken, fetchLeases]);

  // ===== FILTERED & SORTED LEASES =====
  const filteredLeases = useMemo(() => {
    let result = filterLeases(leases, { searchQuery, statusFilter });
    result = sortLeases(result, { field: sortField, order: sortOrder });
    return result;
  }, [leases, searchQuery, statusFilter, sortField, sortOrder]);

  // ===== PAGINATION =====
  const totalPages = Math.ceil(filteredLeases.length / PAGE_SIZE);
  const paginatedLeases = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredLeases.slice(start, start + PAGE_SIZE);
  }, [filteredLeases, page]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [searchQuery, statusFilter, sortField, sortOrder]);

  // ===== STATS =====
  const stats = useMemo(() => ({
    total: leases.length,
    active: leases.filter(l => l.status === 'active').length,
    completed: leases.filter(l => l.status === 'completed').length,
    cancelled: leases.filter(l => l.status === 'cancelled').length,
    pending: leases.filter(l => l.status === 'pending').length,
  }), [leases]);

  // ===== SELECTION HANDLERS =====
  const handleSelectLease = useCallback((leaseId) => {
    setSelectedLeases(prev =>
      prev.includes(leaseId)
        ? prev.filter(id => id !== leaseId)
        : [...prev, leaseId]
    );
  }, []);

  const handleSelectAll = useCallback(() => {
    const allIds = paginatedLeases.map(l => l.id);
    setSelectedLeases(prev => {
      const allSelected = allIds.every(id => prev.includes(id));
      if (allSelected) {
        return prev.filter(id => !allIds.includes(id));
      } else {
        return [...new Set([...prev, ...allIds])];
      }
    });
  }, [paginatedLeases]);

  const handleClearSelection = useCallback(() => {
    setSelectedLeases([]);
  }, []);

  const isAllSelected = useMemo(() => {
    const allIds = paginatedLeases.map(l => l.id);
    return allIds.length > 0 && allIds.every(id => selectedLeases.includes(id));
  }, [paginatedLeases, selectedLeases]);

  // ===== ACTION HANDLERS =====
  const callEdgeFunction = useCallback(async (action, payload) => {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/leases-admin`, {
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

  const handleStatusChange = useCallback(async (leaseId, newStatus) => {
    try {
      setIsLoading(true);
      await callEdgeFunction('updateStatus', { leaseId, status: newStatus });

      // Update local state
      setLeases(prev =>
        prev.map(l => l.id === leaseId ? { ...l, status: newStatus } : l)
      );

      showToast({ title: 'Status updated', type: 'success' });
    } catch (err) {
      console.error('[LeasesOverview] Status update error:', err);
      showToast({ title: 'Failed to update status', content: err.message, type: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, [callEdgeFunction, showToast]);

  const handleSoftDelete = useCallback((leaseId) => {
    const lease = leases.find(l => l.id === leaseId);
    if (!lease) return;

    if (!canDeleteLease(lease)) {
      showToast({
        title: 'Cannot cancel this lease',
        content: 'Only draft or pending leases can be cancelled',
        type: 'warning',
      });
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: 'Cancel Lease',
      message: `Are you sure you want to cancel lease ${lease.agreementNumber || lease.id}? This will set the status to "cancelled" but the record will be preserved.`,
      confirmLabel: 'Cancel Lease',
      confirmType: 'warning',
      requiresDoubleConfirm: false,
      onConfirm: async () => {
        try {
          setIsLoading(true);
          await callEdgeFunction('softDelete', { leaseId });

          setLeases(prev =>
            prev.map(l => l.id === leaseId ? { ...l, status: 'cancelled' } : l)
          );

          showToast({ title: 'Lease cancelled', type: 'success' });
          setConfirmDialog(null);
        } catch (err) {
          console.error('[LeasesOverview] Soft delete error:', err);
          showToast({ title: 'Failed to cancel lease', content: err.message, type: 'error' });
        } finally {
          setIsLoading(false);
        }
      },
    });
  }, [leases, callEdgeFunction, showToast]);

  const handleHardDelete = useCallback((leaseId) => {
    const lease = leases.find(l => l.id === leaseId);
    if (!lease) return;

    if (!canHardDeleteLease(lease)) {
      showToast({
        title: 'Cannot permanently delete this lease',
        content: 'Only cancelled leases with no active stays can be permanently deleted',
        type: 'warning',
      });
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: 'Permanently Delete Lease',
      message: `WARNING: This will PERMANENTLY delete lease ${lease.agreementNumber || lease.id} and all associated data. This action cannot be undone!`,
      confirmLabel: 'Delete Forever',
      confirmType: 'danger',
      requiresDoubleConfirm: true,
      onConfirm: async () => {
        try {
          setIsLoading(true);
          await callEdgeFunction('hardDelete', { leaseId });

          setLeases(prev => prev.filter(l => l.id !== leaseId));
          setSelectedLeases(prev => prev.filter(id => id !== leaseId));

          showToast({ title: 'Lease permanently deleted', type: 'success' });
          setConfirmDialog(null);
        } catch (err) {
          console.error('[LeasesOverview] Hard delete error:', err);
          showToast({ title: 'Failed to delete lease', content: err.message, type: 'error' });
        } finally {
          setIsLoading(false);
        }
      },
    });
  }, [leases, callEdgeFunction, showToast]);

  // ===== BULK HANDLERS =====
  const handleBulkStatusChange = useCallback(async (newStatus) => {
    if (selectedLeases.length === 0) return;

    try {
      setIsLoading(true);
      await callEdgeFunction('bulkUpdateStatus', {
        leaseIds: selectedLeases,
        status: newStatus,
      });

      setLeases(prev =>
        prev.map(l =>
          selectedLeases.includes(l.id) ? { ...l, status: newStatus } : l
        )
      );

      showToast({
        title: `${selectedLeases.length} leases updated`,
        type: 'success',
      });
      setSelectedLeases([]);
    } catch (err) {
      console.error('[LeasesOverview] Bulk status update error:', err);
      showToast({ title: 'Bulk update failed', content: err.message, type: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, [selectedLeases, callEdgeFunction, showToast]);

  const handleBulkExport = useCallback(async (format = 'csv') => {
    if (selectedLeases.length === 0) return;

    try {
      setIsLoading(true);
      const data = await callEdgeFunction('bulkExport', {
        leaseIds: selectedLeases,
        format,
      });

      // Trigger download
      const blob = new Blob([data.content], {
        type: format === 'csv' ? 'text/csv' : 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `leases-export-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast({ title: 'Export complete', type: 'success' });
    } catch (err) {
      console.error('[LeasesOverview] Export error:', err);
      showToast({ title: 'Export failed', content: err.message, type: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, [selectedLeases, callEdgeFunction, showToast]);

  const handleBulkSoftDelete = useCallback(() => {
    if (selectedLeases.length === 0) return;

    const deletableLeases = selectedLeases.filter(id => {
      const lease = leases.find(l => l.id === id);
      return lease && canDeleteLease(lease);
    });

    if (deletableLeases.length === 0) {
      showToast({
        title: 'No leases can be cancelled',
        content: 'Selected leases are not eligible for cancellation',
        type: 'warning',
      });
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: 'Cancel Multiple Leases',
      message: `Are you sure you want to cancel ${deletableLeases.length} lease(s)? ${
        deletableLeases.length < selectedLeases.length
          ? `(${selectedLeases.length - deletableLeases.length} leases are not eligible)`
          : ''
      }`,
      confirmLabel: 'Cancel Leases',
      confirmType: 'warning',
      requiresDoubleConfirm: false,
      onConfirm: async () => {
        try {
          setIsLoading(true);
          await callEdgeFunction('bulkSoftDelete', { leaseIds: deletableLeases });

          setLeases(prev =>
            prev.map(l =>
              deletableLeases.includes(l.id) ? { ...l, status: 'cancelled' } : l
            )
          );

          showToast({
            title: `${deletableLeases.length} leases cancelled`,
            type: 'success',
          });
          setSelectedLeases([]);
          setConfirmDialog(null);
        } catch (err) {
          console.error('[LeasesOverview] Bulk soft delete error:', err);
          showToast({ title: 'Bulk cancel failed', content: err.message, type: 'error' });
        } finally {
          setIsLoading(false);
        }
      },
    });
  }, [selectedLeases, leases, callEdgeFunction, showToast]);

  // ===== DOCUMENT HANDLERS =====
  const handleViewDocuments = useCallback((leaseId) => {
    // TODO: Open document viewer modal
    console.log('[LeasesOverview] View documents for:', leaseId);
    showToast({ title: 'Document viewer coming soon', type: 'info' });
  }, [showToast]);

  const handleUploadDocument = useCallback((leaseId) => {
    // TODO: Open document upload modal
    console.log('[LeasesOverview] Upload document for:', leaseId);
    showToast({ title: 'Document upload coming soon', type: 'info' });
  }, [showToast]);

  // ===== UI HANDLERS =====
  const toggleSortOrder = useCallback(() => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearchQuery('');
    setStatusFilter('all');
    setSortField('createdAt');
    setSortOrder('desc');
  }, []);

  const handleRetry = useCallback(() => {
    fetchLeases();
  }, [fetchLeases]);

  const handleCloseConfirmDialog = useCallback(() => {
    setConfirmDialog(null);
  }, []);

  // ===== RETURN =====
  return {
    // Data
    leases,
    filteredLeases: paginatedLeases,
    stats,

    // Loading & Error
    isLoading,
    error,

    // Filters
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    sortField,
    setSortField,
    sortOrder,
    toggleSortOrder,
    statusOptions,
    sortOptions,
    bulkStatusOptions,

    // Pagination
    page,
    setPage,
    totalPages,

    // Selection
    selectedLeases,
    handleSelectLease,
    handleSelectAll,
    handleClearSelection,
    isAllSelected,

    // Actions
    handleStatusChange,
    handleSoftDelete,
    handleHardDelete,

    // Bulk Actions
    handleBulkStatusChange,
    handleBulkExport,
    handleBulkSoftDelete,

    // Documents
    handleViewDocuments,
    handleUploadDocument,

    // UI
    handleClearFilters,
    handleRetry,
    confirmDialog,
    handleCloseConfirmDialog,
  };
}
