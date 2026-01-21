import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { supabase } from '../../lib/supabase.js';
import { useToast } from '../shared/Toast';

/**
 * useVerifyUsersPageLogic - Logic hook for Verify Users Admin Page
 *
 * Handles:
 * - Searching users by email/name
 * - Selecting a user to view verification documents
 * - Toggling verification status
 * - Opening image modal for document review
 * - Tracking verification audit history
 *
 * Database fields used (from public.user table):
 * - `user verified?` - boolean verification status
 * - `Profile Photo` - profile photo URL
 * - `Selfie with ID` - selfie with ID URL
 * - `ID front` - front of ID URL
 * - `ID Back` - back of ID URL
 * - `profile completeness` - percentage (0-100)
 * - `Tasks Completed` - JSON array of completed tasks
 * - `Phone Number (as text)` - user phone number
 * - `Name - Full` - user full name
 * - `email` - user email
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

/**
 * @typedef {Object} User
 * @property {string} _id - User ID (Bubble format)
 * @property {string} email - User email
 * @property {string} fullName - User full name
 * @property {string|null} profilePhoto - Profile photo URL
 * @property {string|null} selfieWithId - Selfie with ID URL
 * @property {string|null} idFront - Front of ID URL
 * @property {string|null} idBack - Back of ID URL
 * @property {boolean} isVerified - Whether user is verified
 * @property {string|null} phoneNumber - User phone number
 * @property {number} profileCompleteness - Profile completion percentage
 * @property {string[]} tasksCompleted - Array of completed task names
 * @property {string} createdAt - User creation timestamp
 */

/**
 * @typedef {Object} ImageModalState
 * @property {string} url - Image URL
 * @property {string} title - Modal title
 */

export default function useVerifyUsersPageLogic() {
  const { showToast } = useToast();

  // ===== USER SELECTION STATE =====
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // ===== VERIFICATION STATE =====
  const [isProcessing, setIsProcessing] = useState(false);

  // ===== IMAGE MODAL STATE =====
  const [modalImage, setModalImage] = useState(null);

  // ===== LOADING/ERROR STATE =====
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Ref for dropdown click-outside handling
  const dropdownRef = useRef(null);

  // ===== EFFECTS =====

  // Check for user ID in URL params on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('user');
    if (userId) {
      loadUserById(userId);
    }
  }, []);

  // Search users when query changes (with debounce)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        searchUsers(searchQuery);
      } else if (searchQuery.trim().length === 0 && isDropdownOpen) {
        // Load recent users when dropdown opens with empty query
        loadRecentUsers();
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, isDropdownOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ===== API HELPERS =====

  /**
   * Call the Edge Function with an action
   */
  async function callEdgeFunction(action, payload = {}) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('You must be logged in to perform this action');
    }

    const response = await fetch(`${SUPABASE_URL}/functions/v1/verify-users`, {
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

  // ===== USER SEARCH & SELECTION =====

  /**
   * Search users by email or name
   */
  async function searchUsers(query) {
    try {
      setIsSearching(true);
      setError(null);

      const data = await callEdgeFunction('search_users', { query });
      setSearchResults(data.users || []);
    } catch (err) {
      console.error('[useVerifyUsersPageLogic] Search error:', err);
      setError(err.message);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }

  /**
   * Load recent users (for empty dropdown)
   */
  async function loadRecentUsers() {
    try {
      setIsSearching(true);
      const data = await callEdgeFunction('list_users', { limit: 20 });
      setSearchResults(data.users || []);
    } catch (err) {
      console.error('[useVerifyUsersPageLogic] Load recent users error:', err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }

  /**
   * Load a specific user by ID (for URL param)
   */
  async function loadUserById(userId) {
    try {
      setLoading(true);
      setError(null);

      const data = await callEdgeFunction('get_user', { userId });
      if (data.user) {
        setSelectedUser(data.user);
        setSearchQuery(data.user.email || '');
      }
    } catch (err) {
      console.error('[useVerifyUsersPageLogic] Load user error:', err);
      setError(err.message);
      showToast(err.message || 'Failed to load user', 'error');
    } finally {
      setLoading(false);
    }
  }

  /**
   * Handle selecting a user from search results
   */
  const handleSelectUser = useCallback((user) => {
    setSelectedUser(user);
    setSearchQuery(user.email || '');
    setIsDropdownOpen(false);

    // Update URL with user ID for sharing/bookmarking
    const url = new URL(window.location.href);
    url.searchParams.set('user', user._id);
    window.history.replaceState({}, '', url);
  }, []);

  /**
   * Clear the current user selection
   */
  const clearSelection = useCallback(() => {
    setSelectedUser(null);
    setSearchQuery('');
    setSearchResults([]);

    // Remove user ID from URL
    const url = new URL(window.location.href);
    url.searchParams.delete('user');
    window.history.replaceState({}, '', url);
  }, []);

  /**
   * Handle search input change
   */
  const handleSearchChange = useCallback((value) => {
    setSearchQuery(value);
    if (value.length > 0) {
      setIsDropdownOpen(true);
    }
  }, []);

  /**
   * Toggle dropdown open state
   */
  const handleDropdownToggle = useCallback(() => {
    setIsDropdownOpen(prev => !prev);
    if (!isDropdownOpen && searchResults.length === 0) {
      loadRecentUsers();
    }
  }, [isDropdownOpen, searchResults.length]);

  // ===== VERIFICATION TOGGLE =====

  /**
   * Toggle user verification status
   */
  const toggleVerification = useCallback(async (newVerifiedStatus) => {
    if (!selectedUser) return;

    setIsProcessing(true);

    try {
      const data = await callEdgeFunction('toggle_verification', {
        userId: selectedUser._id,
        isVerified: newVerifiedStatus,
      });

      // Update local state with new user data
      setSelectedUser(data.user);

      // Update in search results too
      setSearchResults(prev =>
        prev.map(u => u._id === data.user._id ? data.user : u)
      );

      showToast(
        newVerifiedStatus
          ? `${selectedUser.fullName || 'User'} has been verified`
          : `Verification removed for ${selectedUser.fullName || 'User'}`,
        'success'
      );
    } catch (err) {
      console.error('[useVerifyUsersPageLogic] Toggle verification error:', err);
      showToast(err.message || 'Failed to update verification', 'error');
    } finally {
      setIsProcessing(false);
    }
  }, [selectedUser, showToast]);

  // ===== IMAGE MODAL =====

  /**
   * Open the image modal
   */
  const openImageModal = useCallback((imageUrl, title) => {
    if (!imageUrl) return;
    setModalImage({ url: imageUrl, title });
  }, []);

  /**
   * Close the image modal
   */
  const closeImageModal = useCallback(() => {
    setModalImage(null);
  }, []);

  /**
   * Open image in new tab
   */
  const openImageExternal = useCallback((imageUrl) => {
    if (imageUrl) {
      window.open(imageUrl, '_blank', 'noopener,noreferrer');
    }
  }, []);

  // ===== COMPUTED VALUES =====

  /**
   * Get profile completeness color based on percentage
   */
  const getCompletenessColor = useCallback((percentage) => {
    if (percentage >= 80) return '#059669'; // green
    if (percentage >= 50) return '#d97706'; // amber
    return '#dc2626'; // red
  }, []);

  /**
   * Document sections configuration
   */
  const documentSections = useMemo(() => [
    { key: 'profilePhoto', label: 'Profile Picture', title: 'Profile Photo' },
    { key: 'selfieWithId', label: 'Selfie with ID', title: 'Selfie with ID' },
    { key: 'idFront', label: 'Front of ID', title: 'Front of Government ID' },
    { key: 'idBack', label: 'Back of ID', title: 'Back of Government ID' },
  ], []);

  return {
    // ===== USER SELECTION STATE =====
    selectedUser,
    searchQuery,
    searchResults,
    isSearching,
    isDropdownOpen,
    dropdownRef,

    // ===== VERIFICATION STATE =====
    isProcessing,

    // ===== IMAGE MODAL STATE =====
    modalImage,

    // ===== LOADING/ERROR STATE =====
    loading,
    error,

    // ===== USER SELECTION HANDLERS =====
    handleSelectUser,
    clearSelection,
    handleSearchChange,
    handleDropdownToggle,
    setIsDropdownOpen,

    // ===== VERIFICATION HANDLERS =====
    toggleVerification,

    // ===== IMAGE MODAL HANDLERS =====
    openImageModal,
    closeImageModal,
    openImageExternal,

    // ===== COMPUTED VALUES =====
    getCompletenessColor,
    documentSections,
  };
}
