/**
 * useQRCodeDashboardLogic Hook
 *
 * Business logic hook for the QRCodeDashboard component.
 * Follows the Hollow Component pattern - all state and handlers are here.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import qrCodeDashboardService from './qrCodeDashboardService.js';
import { QR_CODE_USE_CASES } from './qrCodeUseCases.js';

/**
 * Dashboard mode type
 * @typedef {'view' | 'create' | 'edit' | 'preview'} DashboardMode
 */

/**
 * Custom hook for QR Code Dashboard logic.
 *
 * @param {object} options
 * @param {string} options.houseManualId - Required house manual ID
 * @param {string} [options.listingId] - Optional listing ID for context
 * @param {string} [options.hostId] - Optional host ID for creating QR codes
 * @param {DashboardMode} [options.initialMode='view'] - Initial mode
 * @param {Function} [options.onQRCodesChanged] - Callback when QR codes are modified
 * @param {Function} [options.showToast] - Toast notification function
 * @returns {object} All state and handlers for the dashboard
 */
export function useQRCodeDashboardLogic({
  houseManualId,
  listingId,
  hostId,
  initialMode = 'view',
  onQRCodesChanged,
  showToast
}) {
  // ============================================================================
  // STATE
  // ============================================================================

  // Data state
  const [qrCodes, setQRCodes] = useState([]);
  const [houseManual, setHouseManual] = useState(null);

  // UI state
  const [mode, setMode] = useState(initialMode);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [editingQRCode, setEditingQRCode] = useState(null);

  // Loading/error state
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  /**
   * Get array of selected QR code objects.
   */
  const selectedQRCodes = useMemo(() => {
    return qrCodes.filter(qr => selectedIds.has(qr.id));
  }, [qrCodes, selectedIds]);

  /**
   * Check if all QR codes are selected.
   */
  const allSelected = useMemo(() => {
    return qrCodes.length > 0 && selectedIds.size === qrCodes.length;
  }, [qrCodes.length, selectedIds.size]);

  /**
   * Check if any QR codes are selected.
   */
  const hasSelection = useMemo(() => {
    return selectedIds.size > 0;
  }, [selectedIds.size]);

  /**
   * Available use cases for creating new QR codes.
   */
  const availableUseCases = useMemo(() => {
    return QR_CODE_USE_CASES;
  }, []);

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  /**
   * Fetch QR codes and house manual data.
   */
  const fetchData = useCallback(async (silent = false) => {
    if (!houseManualId) {
      setError('No house manual ID provided');
      setIsLoading(false);
      return;
    }

    if (!silent) {
      setIsLoading(true);
    }
    setError(null);

    try {
      // Fetch QR codes and house manual in parallel
      const [qrResult, manualResult] = await Promise.all([
        qrCodeDashboardService.fetchQRCodes(houseManualId),
        qrCodeDashboardService.fetchHouseManual(houseManualId)
      ]);

      if (qrResult.status === 'error') {
        throw new Error(qrResult.message);
      }

      if (manualResult.status === 'error') {
        throw new Error(manualResult.message);
      }

      setQRCodes(qrResult.data || []);
      setHouseManual(manualResult.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load data';
      setError(message);
      if (showToast) {
        showToast({ title: 'Error', content: message, type: 'error' });
      }
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  }, [houseManualId, showToast]);

  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ============================================================================
  // SELECTION HANDLERS
  // ============================================================================

  /**
   * Toggle selection of a single QR code.
   */
  const handleSelect = useCallback((qrCodeId) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(qrCodeId)) {
        next.delete(qrCodeId);
      } else {
        next.add(qrCodeId);
      }
      return next;
    });
  }, []);

  /**
   * Select all QR codes.
   */
  const handleSelectAll = useCallback(() => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(qrCodes.map(qr => qr.id)));
    }
  }, [allSelected, qrCodes]);

  /**
   * Clear all selections.
   */
  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // ============================================================================
  // CRUD HANDLERS
  // ============================================================================

  /**
   * Create a new QR code.
   */
  const handleCreate = useCallback(async (qrCodeData) => {
    setIsSaving(true);
    setError(null);

    try {
      const result = await qrCodeDashboardService.createQRCode(
        qrCodeData,
        houseManualId,
        hostId
      );

      if (result.status === 'error') {
        throw new Error(result.message);
      }

      // Add to local state
      setQRCodes(prev => [result.data, ...prev]);
      setMode('view');

      if (showToast) {
        showToast({
          title: 'Success',
          content: 'QR code created successfully',
          type: 'success'
        });
      }

      if (onQRCodesChanged) {
        onQRCodesChanged();
      }

      return result.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create QR code';
      setError(message);
      if (showToast) {
        showToast({ title: 'Error', content: message, type: 'error' });
      }
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [houseManualId, hostId, showToast, onQRCodesChanged]);

  /**
   * Update an existing QR code.
   */
  const handleUpdate = useCallback(async (qrCodeId, updates) => {
    setIsSaving(true);
    setError(null);

    try {
      const result = await qrCodeDashboardService.updateQRCode(qrCodeId, updates);

      if (result.status === 'error') {
        throw new Error(result.message);
      }

      // Update local state
      setQRCodes(prev => prev.map(qr =>
        qr.id === qrCodeId ? result.data : qr
      ));
      setMode('view');
      setEditingQRCode(null);

      if (showToast) {
        showToast({
          title: 'Success',
          content: 'QR code updated successfully',
          type: 'success'
        });
      }

      if (onQRCodesChanged) {
        onQRCodesChanged();
      }

      return result.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update QR code';
      setError(message);
      if (showToast) {
        showToast({ title: 'Error', content: message, type: 'error' });
      }
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [showToast, onQRCodesChanged]);

  /**
   * Delete a single QR code.
   */
  const handleDelete = useCallback(async (qrCodeId) => {
    setIsSaving(true);
    setError(null);

    try {
      const result = await qrCodeDashboardService.deleteQRCode(qrCodeId);

      if (result.status === 'error') {
        throw new Error(result.message);
      }

      // Remove from local state
      setQRCodes(prev => prev.filter(qr => qr.id !== qrCodeId));
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(qrCodeId);
        return next;
      });

      if (showToast) {
        showToast({
          title: 'Success',
          content: 'QR code deleted',
          type: 'success'
        });
      }

      if (onQRCodesChanged) {
        onQRCodesChanged();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete QR code';
      setError(message);
      if (showToast) {
        showToast({ title: 'Error', content: message, type: 'error' });
      }
    } finally {
      setIsSaving(false);
    }
  }, [showToast, onQRCodesChanged]);

  /**
   * Delete all selected QR codes.
   */
  const handleDeleteSelected = useCallback(async () => {
    if (selectedIds.size === 0) return;

    setIsSaving(true);
    setError(null);

    try {
      const idsToDelete = Array.from(selectedIds);
      const result = await qrCodeDashboardService.deleteMultipleQRCodes(idsToDelete);

      if (result.status === 'error') {
        throw new Error(result.message);
      }

      // Remove from local state
      setQRCodes(prev => prev.filter(qr => !selectedIds.has(qr.id)));
      setSelectedIds(new Set());

      if (showToast) {
        showToast({
          title: 'Success',
          content: `${result.deletedCount} QR code(s) deleted`,
          type: 'success'
        });
      }

      if (onQRCodesChanged) {
        onQRCodesChanged();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete QR codes';
      setError(message);
      if (showToast) {
        showToast({ title: 'Error', content: message, type: 'error' });
      }
    } finally {
      setIsSaving(false);
    }
  }, [selectedIds, showToast, onQRCodesChanged]);

  // ============================================================================
  // MODE HANDLERS
  // ============================================================================

  /**
   * Enter create mode.
   */
  const handleStartCreate = useCallback(() => {
    setMode('create');
    setEditingQRCode(null);
    setError(null);
  }, []);

  /**
   * Enter edit mode for a specific QR code.
   */
  const handleStartEdit = useCallback((qrCode) => {
    setMode('edit');
    setEditingQRCode(qrCode);
    setError(null);
  }, []);

  /**
   * Enter print preview mode.
   */
  const handleStartPreview = useCallback(() => {
    if (selectedIds.size === 0) {
      if (showToast) {
        showToast({
          title: 'No Selection',
          content: 'Please select at least one QR code to print',
          type: 'warning'
        });
      }
      return;
    }
    setMode('preview');
  }, [selectedIds.size, showToast]);

  /**
   * Exit current mode and return to view mode.
   */
  const handleCancelMode = useCallback(() => {
    setMode('view');
    setEditingQRCode(null);
    setError(null);
  }, []);

  // ============================================================================
  // RETURN API
  // ============================================================================

  return {
    // Data
    qrCodes,
    houseManual,
    selectedQRCodes,
    editingQRCode,
    availableUseCases,

    // Selection state
    selectedIds,
    allSelected,
    hasSelection,

    // UI state
    mode,
    isLoading,
    isSaving,
    error,

    // Selection handlers
    handleSelect,
    handleSelectAll,
    handleClearSelection,

    // CRUD handlers
    handleCreate,
    handleUpdate,
    handleDelete,
    handleDeleteSelected,

    // Mode handlers
    handleStartCreate,
    handleStartEdit,
    handleStartPreview,
    handleCancelMode,

    // Data refresh
    refreshData: fetchData
  };
}

export default useQRCodeDashboardLogic;
