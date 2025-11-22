/**
 * CreateDuplicateListingModal Component
 *
 * Reusable modal for creating new listings or duplicating existing ones.
 * Converted from Bubble.io element to match Split Lease architecture.
 *
 * Features:
 * - Create new listings with default values
 * - Duplicate existing listings with all properties
 * - Authentication-aware (hides copy option when not logged in)
 * - Profile completeness tracking
 * - Form validation
 * - Supabase integration
 * - Toast notifications
 */

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase.js';
import { showToast } from '../Toast.jsx';
import { createListingInCode } from '../../../lib/bubbleAPI.js';
import '../../../styles/components/create-listing-modal.css';

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
  const handleCreateNew = async () => {
    if (!listingName.trim()) {
      showToast('Please enter a listing title', 'error', 3000);
      return;
    }

    setIsLoading(true);

    try {
      console.log('🏠 CreateDuplicateListingModal: Creating new listing');
      console.log('Listing name:', listingName.trim());
      console.log('User email:', currentUser?.email || 'Not logged in');

      // Step 1: Trigger Bubble backend workflow
      const workflowResponse = await createListingInCode(
        listingName.trim(),
        currentUser?.email || null
      );

      console.log('✅ Bubble workflow response:', workflowResponse);

      // Extract listing ID from workflow response
      let listingId = workflowResponse?.listing_id || workflowResponse?.id;

      // Fallback: If Bubble doesn't return listing ID, query Supabase for the most recent listing
      if (!listingId) {
        console.log('⚠️ Listing ID not in workflow response, querying Supabase for newly created listing...');

        try {
          const { data: recentListings, error } = await supabase
            .from('zat_listings')
            .select('_id, Name, Created Date')
            .eq('Name', listingName.trim())
            .order('Created Date', { ascending: false })
            .limit(1);

          if (error) throw error;

          if (recentListings && recentListings.length > 0) {
            listingId = recentListings[0]._id;
            console.log('✅ Found newly created listing in Supabase:', listingId);
          } else {
            console.warn('⚠️ Could not find listing in Supabase');
            throw new Error('Listing was created but ID could not be retrieved');
          }
        } catch (supabaseError) {
          console.error('❌ Error querying Supabase for listing:', supabaseError);
          throw new Error('Listing was created but ID could not be retrieved');
        }
      }

      // Step 2: Hide modal
      onClose();

      // Step 3: Show success alert
      showToast('Listing created successfully! Redirecting...', 'success', 2000);

      // Step 4: Redirect to self-listing page with listing ID
      console.log('🔄 Redirecting to self-listing page with ID:', listingId);
      setTimeout(() => {
        window.location.href = `/self-listing.html?listing_id=${listingId}`;
      }, 500);

    } catch (error) {
      console.error('❌ Error creating listing:', error);
      showToast('Failed to create listing. Please try again.', 'error', 3000);
    } finally {
      setIsLoading(false);
    }
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

  // Determine header icon and title based on view mode
  const headerIcon = viewMode === 'create' ? '🏠' : '📋';
  const headerTitle = viewMode === 'create' ? 'Create New Listing' : 'Copy Existing Listing';
  const headerSubtitle = viewMode === 'create'
    ? 'Enter the title guests will see when browsing.'
    : 'Select a listing to duplicate and customize the name.';

  if (!isVisible) return null;

  return (
    <div className="create-listing-modal-overlay" onClick={handleOverlayClick}>
      <div className="create-listing-modal-container">
        {/* Header Section */}
        <div className="create-listing-header">
          <button
            className="create-listing-close-btn"
            onClick={handleClose}
            aria-label="Close modal"
          >
            ×
          </button>
          <div className="create-listing-header-top">
            <span className="create-listing-icon">{headerIcon}</span>
            <h2 className="create-listing-title">{headerTitle}</h2>
          </div>
          <p className="create-listing-subtitle">{headerSubtitle}</p>
        </div>

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

        {/* Button Section */}
        <div className="create-listing-buttons">
          {viewMode === 'create' ? (
            <>
              {/* Only show Copy Existing button when user is logged in */}
              {isLoggedIn && existingListings.length > 0 && (
                <button
                  className="create-listing-btn create-listing-btn-secondary"
                  onClick={handleShowCopyMode}
                  disabled={isLoading}
                >
                  Copy Existing
                </button>
              )}
              <button
                className="create-listing-btn create-listing-btn-primary"
                onClick={handleCreateNew}
                disabled={!listingName.trim() || isLoading}
              >
                {isLoading ? 'Creating...' : 'Create New'}
              </button>
            </>
          ) : (
            <>
              <button
                className="create-listing-btn create-listing-btn-back"
                onClick={handleBack}
                disabled={isLoading}
              >
                Back
              </button>
              <button
                className="create-listing-btn create-listing-btn-primary"
                onClick={handleDuplicate}
                disabled={!listingName.trim() || !selectedListingId || isLoading}
              >
                {isLoading ? 'Duplicating...' : 'Duplicate'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
