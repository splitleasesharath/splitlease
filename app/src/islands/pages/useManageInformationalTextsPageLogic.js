import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../../lib/supabase.js';
import { useToast } from '../shared/Toast';

/**
 * useManageInformationalTextsPageLogic - Logic hook for Manage Informational Texts Page
 *
 * Handles:
 * - Fetching all informational text entries via Edge Function
 * - Creating new entries
 * - Updating existing entries
 * - Deleting entries
 * - Form state management
 * - Device preview toggling
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Default form state for creating/editing entries
 */
const EMPTY_FORM = {
  tagTitle: '',
  desktop: '',
  desktopPlus: '',
  mobile: '',
  ipad: '',
  showMore: false,
  hasLink: false,
};

export default function useManageInformationalTextsPageLogic() {
  const { showToast } = useToast();

  // ===== ENTRIES STATE =====
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ===== FORM STATE =====
  const [mode, setMode] = useState('list'); // 'list' | 'create' | 'edit'
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  // ===== UI STATE =====
  const [searchQuery, setSearchQuery] = useState('');
  const [previewDevice, setPreviewDevice] = useState('desktop'); // 'desktop' | 'desktopPlus' | 'ipad' | 'mobile'
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  // Filtered entries based on search
  const filteredEntries = useMemo(() => {
    if (!searchQuery.trim()) return entries;
    const query = searchQuery.toLowerCase();
    return entries.filter(entry =>
      entry.tagTitle?.toLowerCase().includes(query) ||
      entry.desktop?.toLowerCase().includes(query)
    );
  }, [entries, searchQuery]);

  // Check if form can be submitted
  const canSubmit = useMemo(() => {
    return (
      formData.tagTitle?.trim() &&
      formData.desktop?.trim() &&
      !isSubmitting
    );
  }, [formData.tagTitle, formData.desktop, isSubmitting]);

  // Load entries on mount
  useEffect(() => {
    loadEntries();
  }, []);

  /**
   * Call the Edge Function with an action
   */
  async function callEdgeFunction(action, payload = {}) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('You must be logged in to perform this action');
    }

    const response = await fetch(`${SUPABASE_URL}/functions/v1/informational-texts`, {
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

  /**
   * Fetch all entries from the Edge Function
   */
  async function loadEntries() {
    try {
      setLoading(true);
      setError(null);

      const data = await callEdgeFunction('list', { limit: 500 });
      setEntries(data.entries || []);
    } catch (err) {
      console.error('[useManageInformationalTextsPageLogic] Error loading entries:', err);
      setError(err.message || 'Failed to load entries');
      showToast(err.message || 'Failed to load entries', 'error');
    } finally {
      setLoading(false);
    }
  }

  /**
   * Handle form field change
   */
  function handleFieldChange(field, value) {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear field error when user types
    if (formErrors[field]) {
      setFormErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }

  /**
   * Validate form before submission
   */
  function validateForm() {
    const errors = {};

    if (!formData.tagTitle?.trim()) {
      errors.tagTitle = 'Tag title is required';
    }

    if (!formData.desktop?.trim()) {
      errors.desktop = 'Desktop content is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  /**
   * Switch to create mode
   */
  function startCreate() {
    setMode('create');
    setFormData(EMPTY_FORM);
    setSelectedEntry(null);
    setFormErrors({});
  }

  /**
   * Switch to edit mode with selected entry
   */
  function startEdit(entry) {
    setMode('edit');
    setSelectedEntry(entry);
    setFormData({
      tagTitle: entry.tagTitle || '',
      desktop: entry.desktop || '',
      desktopPlus: entry.desktopPlus || '',
      mobile: entry.mobile || '',
      ipad: entry.ipad || '',
      showMore: entry.showMore || false,
      hasLink: entry.hasLink || false,
    });
    setFormErrors({});
  }

  /**
   * Cancel create/edit and return to list
   */
  function cancelForm() {
    setMode('list');
    setFormData(EMPTY_FORM);
    setSelectedEntry(null);
    setFormErrors({});
  }

  /**
   * Submit the form (create or update)
   */
  async function handleSubmit() {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      if (mode === 'create') {
        const created = await callEdgeFunction('create', formData);
        setEntries(prev => [created, ...prev]);
        showToast(`Created "${formData.tagTitle}"`, 'success');
      } else {
        const updated = await callEdgeFunction('update', {
          id: selectedEntry._id,
          ...formData
        });
        setEntries(prev => prev.map(e => e._id === updated._id ? updated : e));
        showToast(`Updated "${formData.tagTitle}"`, 'success');
      }

      cancelForm();
    } catch (err) {
      console.error('[useManageInformationalTextsPageLogic] Submit error:', err);
      showToast(err.message || 'Failed to save', 'error');

      // Show specific field errors if duplicate tag
      if (err.message?.includes('already exists')) {
        setFormErrors({ tagTitle: err.message });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  /**
   * Show delete confirmation
   */
  function confirmDelete(id) {
    setDeleteConfirmId(id);
  }

  /**
   * Cancel delete confirmation
   */
  function cancelDelete() {
    setDeleteConfirmId(null);
  }

  /**
   * Execute delete after confirmation
   */
  async function executeDelete() {
    if (!deleteConfirmId) return;

    setIsSubmitting(true);

    try {
      const result = await callEdgeFunction('delete', { id: deleteConfirmId });
      setEntries(prev => prev.filter(e => e._id !== deleteConfirmId));
      showToast(`Deleted "${result.tagTitle}"`, 'success');
      setDeleteConfirmId(null);

      // If editing the deleted entry, go back to list
      if (selectedEntry?._id === deleteConfirmId) {
        cancelForm();
      }
    } catch (err) {
      console.error('[useManageInformationalTextsPageLogic] Delete error:', err);
      showToast(err.message || 'Failed to delete', 'error');
    } finally {
      setIsSubmitting(false);
    }
  }

  /**
   * Get preview content for current device
   */
  const getPreviewContent = useCallback(() => {
    const content = {
      desktop: formData.desktop || '(No desktop content)',
      desktopPlus: formData.desktopPlus || formData.desktop || '(Falls back to desktop)',
      mobile: formData.mobile || formData.desktop || '(Falls back to desktop)',
      ipad: formData.ipad || formData.desktop || '(Falls back to desktop)',
    };
    return content[previewDevice] || content.desktop;
  }, [formData, previewDevice]);

  return {
    // ===== ENTRIES STATE =====
    entries,
    filteredEntries,
    loading,
    error,

    // ===== FORM STATE =====
    mode,
    formData,
    selectedEntry,
    isSubmitting,
    formErrors,
    canSubmit,

    // ===== UI STATE =====
    searchQuery,
    setSearchQuery,
    previewDevice,
    setPreviewDevice,
    deleteConfirmId,

    // ===== HANDLERS =====
    loadEntries,
    handleFieldChange,
    startCreate,
    startEdit,
    cancelForm,
    handleSubmit,
    confirmDelete,
    cancelDelete,
    executeDelete,
    getPreviewContent,
  };
}
