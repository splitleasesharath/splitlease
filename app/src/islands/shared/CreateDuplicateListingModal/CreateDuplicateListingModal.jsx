/**
 * CreateDuplicateListingModal Component
 *
 * Reusable modal for creating new listings or duplicating existing ones.
 * Converted from Bubble.io element to match Split Lease architecture.
 * Updated to follow POPUP_REPLICATION_PROTOCOL.md design system.
 *
 * Features:
 * - Create new listings with default values
 * - Duplicate existing listings with all properties
 * - Authentication-aware (hides copy option when not logged in)
 * - Profile completeness tracking
 * - Form validation
 * - Supabase integration
 * - Toast notifications
 * - Mobile bottom sheet behavior (< 480px)
 * - Monochromatic purple color scheme
 * - Feather icons (stroke-only)
 */

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase.js';
import { showToast } from '../Toast.jsx';
// TODO: Re-add when Bubble integration is restored
// import { createListingInCode } from '../../../lib/bubbleAPI.js';
import '../../../styles/components/create-listing-modal.css';

/**
 * Feather Icons as inline SVG components
 * Following POPUP_REPLICATION_PROTOCOL.md: Monochromatic, stroke-width: 2, no fill
 */
const HomeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const CopyIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const XIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export default function CreateDuplicateListingModal({
  isVisible,
  onClose,
  onSuccess,
  currentUser,
  existingListings = [],
  onNavigateToListing,
}) {
  // State management
  const [viewMode, setViewMode] = useState('create'); // 'create' or 'copy'
  const [listingName, setListingName] = useState('');
  const [selectedListingId, setSelectedListingId] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isVisible) {
      console.log('🏠 CreateDuplicateListingModal: Modal opened');
      setViewMode('create');
      setListingName('');
      setSelectedListingId('');
    }
  }, [isVisible]);

  // Update listing name when switching to copy mode with a selected listing
  useEffect(() => {
    if (viewMode === 'copy' && selectedListingId) {
      const selectedListing = existingListings.find(l => l._id === selectedListingId);
      if (selectedListing) {
        setListingName(`${selectedListing.Name} copy`);
      }
    }
  }, [viewMode, selectedListingId, existingListings]);

  // Check if user is logged in
  const isLoggedIn = !!currentUser;

  // WORKFLOW #4: B: Create New is clicked
  const handleCreateNew = () => {
    if (!listingName.trim()) {
      showToast('Please enter a listing title', 'error', 3000);
      return;
    }

    console.log('🏠 CreateDuplicateListingModal: Starting new listing flow');
    console.log('Listing name:', listingName.trim());

    // Store the listing name in localStorage for the self-listing page to use
    localStorage.setItem('pendingListingName', listingName.trim());

    // Close modal
    onClose();

    // Show success message
    showToast('Redirecting to listing form...', 'success', 2000);

    // Redirect to self-listing page
    console.log('🔄 Redirecting to self-listing page');
    setTimeout(() => {
      window.location.href = `/self-listing.html`;
    }, 500);
  };

  // WORKFLOW #5: B: Duplicate is clicked
  const handleDuplicate = async () => {
    if (!selectedListingId) {
      showToast('Please select a listing to duplicate', 'error', 3000);
      return;
    }

    if (!listingName.trim()) {
      showToast('Please enter a listing title', 'error', 3000);
      return;
    }

    setIsLoading(true);

    try {
      const originalListing = existingListings.find(l => l._id === selectedListingId);
      if (!originalListing) {
        throw new Error('Selected listing not found');
      }

      // Create duplicate with all properties from original
      const duplicateData = {
        ...originalListing,
        _id: undefined, // Remove ID to create new record
        Name: listingName.trim(),
        active: false, // Set to inactive by default
        'Operator Last Updated AUT': new Date().toISOString(),
        'Created Date': undefined,
        'Modified Date': undefined,
      };

      // Remove fields that shouldn't be duplicated
      delete duplicateData._id;
      delete duplicateData['Created Date'];
      delete duplicateData['Modified Date'];

      const { data: newListing, error } = await supabase
        .from('zat_listings')
        .insert(duplicateData)
        .select()
        .single();

      if (error) throw error;

      // Update profile completeness if needed
      if (currentUser && !currentUser.tasksCompleted?.includes('listing')) {
        await updateProfileCompleteness(currentUser._id, 'listing');
      }

      onClose();

      showToast('Listing duplicated successfully!', 'success', 3000);

      if (onSuccess) {
        onSuccess(newListing);
      }

      if (onNavigateToListing) {
        onNavigateToListing(newListing._id);
      }
    } catch (error) {
      console.error('Error duplicating listing:', error);
      showToast('Failed to duplicate listing. Please try again.', 'error', 3000);
    } finally {
      setIsLoading(false);
    }
  };

  // WORKFLOW #3: B: Copy is clicked
  const handleShowCopyMode = () => {
    setViewMode('copy');
    setListingName('');
    setSelectedListingId('');
  };

  // WORKFLOW #2: B: Back is clicked
  const handleBack = () => {
    setViewMode('create');
    setListingName('');
    setSelectedListingId('');
  };

  // WORKFLOW #7: I: Close Create New Listing is clicked
  const handleClose = () => {
    onClose();
  };

  // Helper function to update profile completeness
  const updateProfileCompleteness = async (userId, task) => {
    try {
      const { error } = await supabase
        .from('zat_user')
        .update({
          tasksCompleted: supabase.raw(`array_append(tasksCompleted, '${task}')`),
        })
        .eq('_id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating profile completeness:', error);
    }
  };

  // Handle overlay click
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  // Handle Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isVisible) {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isVisible]);

  // Determine header title based on view mode
  const HeaderIcon = viewMode === 'create' ? HomeIcon : CopyIcon;
  const headerTitle = viewMode === 'create' ? 'Create New Listing' : 'Copy Existing Listing';
  const headerSubtitle = viewMode === 'create'
    ? 'Enter the title guests will see when browsing.'
    : 'Select a listing to duplicate and customize the name.';

  if (!isVisible) return null;

  return (
    <div
      className="create-listing-modal-overlay"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-listing-modal-title"
    >
      <div
        className="create-listing-modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile grab handle - visible only on mobile */}
        <div className="create-listing-grab-handle" aria-hidden="true" />

        {/* Header Section */}
        <header className="create-listing-header">
          <div className="create-listing-header-content">
            <div className="create-listing-header-top">
              <span className="create-listing-icon" aria-hidden="true">
                <HeaderIcon />
              </span>
              <h2 id="create-listing-modal-title" className="create-listing-title">
                {headerTitle}
              </h2>
            </div>
            <p className="create-listing-subtitle">{headerSubtitle}</p>
          </div>
          <button
            className="create-listing-close-btn"
            onClick={handleClose}
            aria-label="Close modal"
            type="button"
          >
            <XIcon />
          </button>
        </header>

        {/* Scrollable Body */}
        <div className="create-listing-body">
          {/* Copy Mode: Dropdown to select listing */}
          {viewMode === 'copy' && (
            <div className="create-listing-section">
              <label htmlFor="listing-select" className="create-listing-label">
                Select Listing to Copy
              </label>
              <select
                id="listing-select"
                className="create-listing-select"
                value={selectedListingId}
                onChange={(e) => setSelectedListingId(e.target.value)}
              >
                <option value="">-- Select a listing --</option>
                {existingListings.map(listing => (
                  <option key={listing._id} value={listing._id}>
                    {listing.Name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Input Section */}
          <div className="create-listing-section">
            <label htmlFor="listing-title" className="create-listing-label">
              Listing Title
            </label>
            <input
              id="listing-title"
              type="text"
              className="create-listing-input"
              value={listingName}
              onChange={(e) => setListingName(e.target.value)}
              placeholder="Enter listing title"
              disabled={isLoading}
            />
            <p className="create-listing-helper">Don't worry, you can change it later</p>
          </div>
        </div>

        {/* Footer with Action Buttons */}
        <footer className="create-listing-footer">
          {viewMode === 'create' ? (
            <>
              {/* Only show Copy Existing button when user is logged in */}
              {isLoggedIn && existingListings.length > 0 && (
                <button
                  type="button"
                  className="create-listing-btn create-listing-btn-secondary"
                  onClick={handleShowCopyMode}
                  disabled={isLoading}
                >
                  Copy Existing
                </button>
              )}
              <button
                type="button"
                className="create-listing-btn create-listing-btn-primary"
                onClick={handleCreateNew}
                disabled={!listingName.trim() || isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="spinner" aria-hidden="true" />
                    Creating...
                  </>
                ) : (
                  'Create New'
                )}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="create-listing-btn create-listing-btn-back"
                onClick={handleBack}
                disabled={isLoading}
              >
                Back
              </button>
              <button
                type="button"
                className="create-listing-btn create-listing-btn-primary"
                onClick={handleDuplicate}
                disabled={!listingName.trim() || !selectedListingId || isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="spinner" aria-hidden="true" />
                    Duplicating...
                  </>
                ) : (
                  'Duplicate'
                )}
              </button>
            </>
          )}
        </footer>
      </div>
    </div>
  );
}
