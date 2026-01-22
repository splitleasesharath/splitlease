/**
 * useModifyListingsPageLogic - Business logic hook for ModifyListingsPage
 *
 * Follows the Hollow Component Pattern - all business logic is here,
 * the page component contains only JSX.
 *
 * Implements FK-safe database updates by only sending changed fields.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../../lib/supabase.js';
import { getListingById, updateListing } from '../../../lib/listingService.js';
import { uploadPhoto, deletePhoto } from '../../../lib/photoUpload.js';
import {
  initializeLookups,
  isInitialized,
  getAllCancellationPolicies
} from '../../../lib/dataLookups.js';

// ============================================================================
// TYPES (JSDoc)
// ============================================================================

/**
 * @typedef {object} Listing
 * @property {string} _id - Listing ID
 * @property {string} Name - Listing name
 * @property {string} Description - Listing description
 * @property {boolean} Approved - Approval status
 * @property {boolean} Active - Active status
 * ... other properties
 */

/**
 * @typedef {object} Alert
 * @property {'success'|'error'|'warning'|'info'} type - Alert type
 * @property {string} message - Alert message
 */

/**
 * @typedef {object} SectionStatus
 * @property {boolean} isComplete - Section has required data
 * @property {boolean} hasChanges - Section has unsaved changes
 */

// ============================================================================
// CONSTANTS
// ============================================================================

const SECTIONS = [
  { id: 'address', label: 'Address & Space', icon: 'home' },
  { id: 'features', label: 'Features', icon: 'star' },
  { id: 'leaseStyles', label: 'Lease & Pricing', icon: 'calendar' },
  { id: 'photos', label: 'Photos', icon: 'camera' },
  { id: 'rules', label: 'Rules', icon: 'clipboard' },
  { id: 'reviews', label: 'Safety & Details', icon: 'shield' }
];

const AUTO_SAVE_DELAY = 30000; // 30 seconds

// ============================================================================
// HOOK
// ============================================================================

/**
 * Page logic hook for ModifyListingsPage
 * @returns {object} State and handlers for the page
 */
export default function useModifyListingsPageLogic() {
  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------

  // Core data
  const [listing, setListing] = useState(null);
  const [originalListing, setOriginalListing] = useState(null);
  const [listingId, setListingId] = useState(null);

  // UI state
  const [activeSection, setActiveSection] = useState('address');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState(null);
  const [alert, setAlert] = useState(null);
  const [lastSaved, setLastSaved] = useState(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  // Lookup data
  const [amenitiesInUnit, setAmenitiesInUnit] = useState([]);
  const [amenitiesInBuilding, setAmenitiesInBuilding] = useState([]);
  const [houseRules, setHouseRules] = useState([]);
  const [safetyFeatures, setSafetyFeatures] = useState([]);
  const [cancellationPolicyOptions, setCancellationPolicyOptions] = useState([]);

  // Refs for auto-save
  const autoSaveTimerRef = useRef(null);
  const hasChangesRef = useRef(false);

  // ---------------------------------------------------------------------------
  // INITIALIZATION
  // ---------------------------------------------------------------------------

  // Get listing ID from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (id) {
      setListingId(id);
    }
  }, []);

  // Initialize lookups on mount
  useEffect(() => {
    async function loadLookups() {
      if (!isInitialized()) {
        await initializeLookups();
      }
      loadAmenities();
      loadHouseRules();
      loadSafetyFeatures();
      loadCancellationPolicies();
    }
    loadLookups();
  }, []);

  // Load listing when ID changes
  useEffect(() => {
    if (listingId) {
      loadListing(listingId);
    }
  }, [listingId]);

  // Setup beforeunload warning
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasChangesRef.current) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // ---------------------------------------------------------------------------
  // LOOKUP DATA LOADERS
  // ---------------------------------------------------------------------------

  async function loadAmenities() {
    try {
      const { data: inUnit } = await supabase
        .from('zat_features_amenities')
        .select('_id, Name, "In unit?"')
        .eq('In unit?', true);

      const { data: inBuilding } = await supabase
        .from('zat_features_amenities')
        .select('_id, Name, "In unit?"')
        .eq('In unit?', false);

      setAmenitiesInUnit(inUnit || []);
      setAmenitiesInBuilding(inBuilding || []);
    } catch (err) {
      console.error('Failed to load amenities:', err);
    }
  }

  async function loadHouseRules() {
    try {
      const { data } = await supabase
        .schema('reference_table')
        .from('zat_features_houserules')
        .select('_id, Name, Icon');

      setHouseRules(data || []);
    } catch (err) {
      console.error('Failed to load house rules:', err);
    }
  }

  async function loadSafetyFeatures() {
    try {
      const { data } = await supabase
        .from('zat_features_safety')
        .select('_id, Name, Icon');

      setSafetyFeatures(data || []);
    } catch (err) {
      console.error('Failed to load safety features:', err);
    }
  }

  function loadCancellationPolicies() {
    const policies = getAllCancellationPolicies();
    setCancellationPolicyOptions(policies);
  }

  // ---------------------------------------------------------------------------
  // LISTING OPERATIONS
  // ---------------------------------------------------------------------------

  /**
   * Load a listing by ID
   * @param {string} id - Listing ID
   */
  async function loadListing(id) {
    setIsLoading(true);
    setError(null);

    try {
      const data = await getListingById(id);

      if (!data) {
        setError('Listing not found');
        setListing(null);
        setOriginalListing(null);
        return;
      }

      setListing(data);
      setOriginalListing(structuredClone(data));
      hasChangesRef.current = false;
      setLastSaved(data['Modified Date'] ? new Date(data['Modified Date']) : null);

      // Update URL
      const params = new URLSearchParams(window.location.search);
      params.set('id', id);
      window.history.replaceState({}, '', `?${params.toString()}`);

    } catch (err) {
      console.error('Failed to load listing:', err);
      setError(err.message || 'Failed to load listing');
    } finally {
      setIsLoading(false);
    }
  }

  /**
   * Search for listings by name or ID
   * @param {string} query - Search query
   */
  async function searchListings(query) {
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);

    try {
      const { data, error: searchError } = await supabase
        .from('listing')
        .select('_id, Name, "Address - Full Street Address", Active, Approved')
        .or(`Name.ilike.%${query}%,_id.ilike.%${query}%`)
        .limit(20)
        .order('Modified Date', { ascending: false });

      if (searchError) throw searchError;

      setSearchResults(data || []);
    } catch (err) {
      console.error('Search failed:', err);
      showAlert('error', 'Search failed: ' + err.message);
    } finally {
      setIsSearching(false);
    }
  }

  /**
   * Update listing with partial data (FK-safe pattern)
   * @param {object} partialData - Fields to update
   */
  const updateListingData = useCallback((partialData) => {
    setListing(prev => {
      if (!prev) return prev;
      const updated = { ...prev, ...partialData };
      hasChangesRef.current = true;
      return updated;
    });

    // Reset auto-save timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    autoSaveTimerRef.current = setTimeout(() => {
      if (hasChangesRef.current) {
        saveChanges();
      }
    }, AUTO_SAVE_DELAY);
  }, []);

  /**
   * Save changes to database using FK-safe pattern
   * Only sends fields that actually changed
   */
  async function saveChanges() {
    if (!listing || !originalListing) return;

    // Calculate changed fields only
    const changedFields = {};
    for (const [key, value] of Object.entries(listing)) {
      if (JSON.stringify(value) !== JSON.stringify(originalListing[key])) {
        changedFields[key] = value;
      }
    }

    if (Object.keys(changedFields).length === 0) {
      showAlert('info', 'No changes to save');
      return;
    }

    setIsSaving(true);

    try {
      console.log('[ModifyListings] Saving changed fields:', Object.keys(changedFields));

      await updateListing(listing._id, changedFields);

      // Update original to match current
      setOriginalListing(structuredClone(listing));
      hasChangesRef.current = false;
      setLastSaved(new Date());

      showAlert('success', 'Changes saved successfully');
    } catch (err) {
      console.error('[ModifyListings] Save failed:', err);

      // Log full error details for FK violations
      if (err.code === '23503') {
        console.error('[ModifyListings] FK violation details:', {
          code: err.code,
          message: err.message,
          details: err.details,
          hint: err.hint
        });
      }

      showAlert('error', 'Failed to save: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  }

  /**
   * Save a specific section
   * @param {string} sectionId - Section to save
   */
  async function saveSection(sectionId) {
    // For now, just save all changes
    await saveChanges();
  }

  // ---------------------------------------------------------------------------
  // PHOTO OPERATIONS
  // ---------------------------------------------------------------------------

  /**
   * Upload a photo for the listing
   * @param {File} file - File to upload
   */
  async function handleUploadPhoto(file) {
    if (!listing) return;

    try {
      const photos = listing['Features - Photos'] || [];
      const index = photos.length;

      const result = await uploadPhoto({ file }, listing._id, index);

      const newPhoto = {
        id: `photo_${Date.now()}`,
        url: result.url,
        Photo: result.url,
        'Photo (thumbnail)': result.url,
        storagePath: result.path,
        SortOrder: index,
        toggleMainPhoto: index === 0
      };

      updateListingData({
        'Features - Photos': [...photos, newPhoto]
      });

      showAlert('success', 'Photo uploaded');
    } catch (err) {
      console.error('Photo upload failed:', err);
      showAlert('error', 'Failed to upload photo: ' + err.message);
    }
  }

  /**
   * Delete a photo from the listing
   * @param {string} photoId - Photo ID to delete
   */
  async function handleDeletePhoto(photoId) {
    if (!listing) return;

    const photos = listing['Features - Photos'] || [];
    const photo = photos.find(p => p.id === photoId);

    if (photo?.storagePath) {
      await deletePhoto(photo.storagePath);
    }

    const updatedPhotos = photos
      .filter(p => p.id !== photoId)
      .map((p, i) => ({
        ...p,
        SortOrder: i,
        toggleMainPhoto: i === 0
      }));

    updateListingData({ 'Features - Photos': updatedPhotos });
    showAlert('success', 'Photo deleted');
  }

  // ---------------------------------------------------------------------------
  // UI HELPERS
  // ---------------------------------------------------------------------------

  /**
   * Show an alert notification
   * @param {'success'|'error'|'warning'|'info'} type - Alert type
   * @param {string} message - Alert message
   */
  function showAlert(type, message) {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 5000);
  }

  /**
   * Check if there are unsaved changes
   * @returns {boolean}
   */
  function hasUnsavedChanges() {
    if (!listing || !originalListing) return false;

    for (const [key, value] of Object.entries(listing)) {
      if (JSON.stringify(value) !== JSON.stringify(originalListing[key])) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get completion status for each section
   * @returns {object} Map of section ID to completion status
   */
  function getSectionStatus() {
    if (!listing) return {};

    return {
      address: {
        isComplete: Boolean(listing.Name && listing['Address - Full Street Address']),
        hasChanges: false
      },
      features: {
        isComplete: Boolean(listing.Description),
        hasChanges: false
      },
      leaseStyles: {
        isComplete: Boolean(listing['rental type']),
        hasChanges: false
      },
      photos: {
        isComplete: (listing['Features - Photos'] || []).length >= 3,
        hasChanges: false
      },
      rules: {
        isComplete: Boolean(listing['Cancellation Policy']),
        hasChanges: false
      },
      reviews: {
        isComplete: true, // Optional section
        hasChanges: false
      }
    };
  }

  /**
   * Select a listing from search results
   * @param {object} result - Search result item
   */
  function selectSearchResult(result) {
    setListingId(result._id);
    setSearchQuery('');
    setSearchResults([]);
  }

  /**
   * Clear the current listing and show search
   */
  function clearListing() {
    if (hasUnsavedChanges()) {
      if (!window.confirm('You have unsaved changes. Discard them?')) {
        return;
      }
    }
    setListing(null);
    setOriginalListing(null);
    setListingId(null);
    hasChangesRef.current = false;

    // Update URL
    const params = new URLSearchParams(window.location.search);
    params.delete('id');
    window.history.replaceState({}, '', window.location.pathname);
  }

  // ---------------------------------------------------------------------------
  // CLEANUP
  // ---------------------------------------------------------------------------

  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, []);

  // ---------------------------------------------------------------------------
  // RETURN
  // ---------------------------------------------------------------------------

  return {
    // State
    listing,
    listingId,
    isLoading,
    isSaving,
    isSearching,
    error,
    alert,
    lastSaved,

    // Search
    searchQuery,
    searchResults,
    setSearchQuery,
    searchListings,
    selectSearchResult,

    // Navigation
    activeSection,
    setActiveSection,
    sections: SECTIONS,
    sectionStatus: getSectionStatus(),

    // Listing operations
    loadListing,
    updateListingData,
    saveChanges,
    saveSection,
    clearListing,
    hasUnsavedChanges: hasUnsavedChanges(),

    // Photo operations
    onUploadPhoto: handleUploadPhoto,
    onDeletePhoto: handleDeletePhoto,

    // Lookup data
    amenitiesInUnit,
    amenitiesInBuilding,
    houseRules,
    safetyFeatures,
    cancellationPolicyOptions,

    // Alert
    showAlert,
    dismissAlert: () => setAlert(null)
  };
}
