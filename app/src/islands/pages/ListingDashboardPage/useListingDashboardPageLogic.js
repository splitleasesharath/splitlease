import { useState, useCallback } from 'react';
import { logger } from '../../../lib/logger';
import { useListingAuth } from './hooks/useListingAuth';
import { useListingData } from './hooks/useListingData';
import { usePhotoManagement } from './hooks/usePhotoManagement';
import { useAIImportAssistant } from './hooks/useAIImportAssistant';

/**
 * Custom hook for ListingDashboardPage logic - Orchestrator Pattern
 * Composes focused hooks for auth, data, photos, and AI functionality
 * Follows the Hollow Component Pattern - all business logic is here
 */
export default function useListingDashboardPageLogic() {
  // Get listing ID from URL
  const getListingIdFromUrl = useCallback(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('id') || params.get('listing_id');
  }, []);

  const listingId = getListingIdFromUrl();

  // Compose focused hooks
  const auth = useListingAuth();
  const data = useListingData(listingId);
  const photos = usePhotoManagement(
    data.listing,
    data.setListing,
    (silent) => data.fetchListing(silent),
    listingId
  );
  const ai = useAIImportAssistant(
    data.listing,
    data.updateListing,
    data.setListing,
    (silent) => data.fetchListing(silent),
    listingId
  );

  // Local UI state
  const [activeTab, setActiveTab] = useState('manage');
  const [editSection, setEditSection] = useState(null);
  const [editFocusField, setEditFocusField] = useState(null);
  const [showScheduleCohost, setShowScheduleCohost] = useState(false);
  const [showImportReviews, setShowImportReviews] = useState(false);
  const [isImportingReviews, setIsImportingReviews] = useState(false);

  // Tab change handler
  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);

    switch (tab) {
      case 'preview':
        if (data.listing) {
          window.open(`/preview-split-lease.html?id=${data.listing.id}`, '_blank');
        }
        break;
      case 'proposals':
      case 'virtual-meetings':
      case 'leases':
      default:
        break;
    }
  }, [data.listing]);

  // Copy link handler
  const handleCopyLink = useCallback(async () => {
    if (!data.listing?.id) {
      window.showToast?.({
        title: 'Error',
        content: 'No listing ID available',
        type: 'error'
      });
      return;
    }

    const listingUrl = `${window.location.origin}/view-split-lease/${data.listing.id}`;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(listingUrl);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = listingUrl;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }

      window.showToast?.({
        title: 'Link Copied!',
        content: 'Listing link has been copied to your clipboard',
        type: 'success'
      });
    } catch (err) {
      logger.error('Failed to copy link:', err);
      window.showToast?.({
        title: 'Copy Failed',
        content: 'Unable to copy link to clipboard',
        type: 'error'
      });
    }
  }, [data.listing?.id]);

  // Action card click handler
  const handleCardClick = useCallback((cardId) => {
    switch (cardId) {
      case 'preview':
        if (data.listing) {
          window.open(`/preview-split-lease.html?id=${data.listing.id}`, '_blank');
        }
        break;
      case 'copy-link':
        handleCopyLink();
        break;
      case 'proposals':
        if (data.listing) {
          window.location.href = `/host-proposals?listingId=${data.listing.id}`;
        }
        break;
      case 'meetings':
        setActiveTab('virtual-meetings');
        break;
      case 'manage':
        setActiveTab('manage');
        break;
      case 'leases':
        setActiveTab('leases');
        break;
      default:
        logger.debug('Unknown card clicked:', cardId);
    }
  }, [data.listing, handleCopyLink]);

  // Back to all listings handler
  const handleBackClick = useCallback(() => {
    window.location.href = '/host-dashboard';
  }, []);

  // Description change handler
  const handleDescriptionChange = useCallback((newDescription) => {
    data.setListing((prev) => ({
      ...prev,
      description: newDescription,
    }));
  }, [data.setListing]);

  // Cancellation policy handlers
  const handleCancellationPolicyChange = useCallback(async (policyId) => {
    if (!listingId) {
      logger.error('❌ No listing ID found for cancellation policy update');
      return;
    }

    logger.debug('📋 Updating cancellation policy to:', policyId);

    try {
      await data.updateListing({ 'Cancellation Policy': policyId });

      data.setListing((prev) => ({
        ...prev,
        cancellationPolicy: policyId,
        'Cancellation Policy': policyId,
      }));

      logger.debug('✅ Cancellation policy saved successfully');
    } catch (error) {
      logger.error('❌ Failed to save cancellation policy:', error);
    }
  }, [listingId, data]);

  const handleCancellationRestrictionsChange = useCallback(async (restrictionsText) => {
    if (!listingId) {
      logger.error('❌ No listing ID found for cancellation restrictions update');
      return;
    }

    logger.debug('📋 Updating cancellation restrictions:', restrictionsText);

    try {
      await data.updateListing({ 'Cancellation Policy - Additional Restrictions': restrictionsText });

      data.setListing((prev) => ({
        ...prev,
        cancellationPolicyAdditionalRestrictions: restrictionsText,
        'Cancellation Policy - Additional Restrictions': restrictionsText,
      }));

      logger.debug('✅ Cancellation restrictions saved successfully');
    } catch (error) {
      logger.error('❌ Failed to save cancellation restrictions:', error);
    }
  }, [listingId, data]);

  // Schedule Cohost handlers
  const handleScheduleCohost = useCallback(() => {
    setShowScheduleCohost(true);
  }, []);

  const handleCloseScheduleCohost = useCallback(() => {
    setShowScheduleCohost(false);
  }, []);

  const handleCohostRequestSubmitted = useCallback((requestData) => {
    logger.debug('✅ Co-host request submitted:', requestData);
    if (requestData) {
      data.setExistingCohostRequest({
        _id: requestData.requestId || requestData._id,
        status: 'pending',
        createdAt: requestData.createdAt || new Date().toISOString(),
        ...requestData,
      });
    }
  }, [data]);

  // Import Reviews handlers
  const handleImportReviews = useCallback(() => {
    setShowImportReviews(true);
  }, []);

  const handleCloseImportReviews = useCallback(() => {
    setShowImportReviews(false);
  }, []);

  const handleSubmitImportReviews = useCallback(async (formData) => {
    setIsImportingReviews(true);
    try {
      logger.debug('📥 Submitting import reviews request:', formData);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/slack`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            action: 'faq_inquiry',
            payload: {
              name: auth.currentUser?.firstName || auth.currentUser?.name || 'Host',
              email: formData.emailAddress,
              inquiry: `📥 **Import Reviews Request**\n\n**Listing ID:** ${formData.listingId || 'N/A'}\n**Reviews URL:** ${formData.reviewsUrl}\n**Requested by:** ${formData.emailAddress}\n\nPlease import reviews from the above URL for this listing.`
            }
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit request');
      }

      logger.debug('✅ Import reviews request submitted successfully');
      alert('Your request has been submitted! Our team will import your reviews within 24-48 hours.');
      setShowImportReviews(false);
    } catch (err) {
      logger.error('❌ Error submitting import reviews request:', err);
      alert('Failed to submit request. Please try again later.');
    } finally {
      setIsImportingReviews(false);
    }
  }, [auth.currentUser]);

  // Edit modal handlers
  const handleEditSection = useCallback((section, focusField = null) => {
    setEditSection(section);
    setEditFocusField(focusField);
  }, []);

  const handleCloseEdit = useCallback(() => {
    setEditSection(null);
    setEditFocusField(null);
    if (listingId) {
      data.fetchListing(true);
    }
  }, [listingId, data]);

  const handleSaveEdit = useCallback((updatedData) => {
    if (updatedData && typeof updatedData === 'object') {
      data.setListing((prev) => {
        if (!prev) return prev;

        const updates = { ...prev };

        if (updatedData.Name !== undefined) {
          updates.title = updatedData.Name;
          updates.Name = updatedData.Name;
        }

        if (updatedData.Description !== undefined) {
          updates.description = updatedData.Description;
          updates.Description = updatedData.Description;
        }

        if (updatedData['Description - Neighborhood'] !== undefined) {
          updates.descriptionNeighborhood = updatedData['Description - Neighborhood'];
          updates['Description - Neighborhood'] = updatedData['Description - Neighborhood'];
        }

        return updates;
      });
    }
  }, [data]);

  // Availability handlers
  const handleAvailabilityChange = useCallback(async (fieldName, value) => {
    if (!listingId) {
      window.showToast?.({
        title: 'Error',
        content: 'No listing ID available',
        type: 'error'
      });
      return;
    }

    try {
      const fieldMapping = {
        'checkInTime': 'NEW Date Check-in Time',
        'checkOutTime': 'NEW Date Check-out Time',
        'earliestAvailableDate': ' First Available',
        'leaseTermMin': 'Minimum Weeks',
        'leaseTermMax': 'Maximum Weeks'
      };

      const dbFieldName = fieldMapping[fieldName];
      if (!dbFieldName) {
        logger.error('Unknown availability field:', fieldName);
        return;
      }

      await data.updateListing({ [dbFieldName]: value });

      data.setListing((prev) => ({
        ...prev,
        [fieldName]: value
      }));

      window.showToast?.({
        title: 'Changes Saved',
        content: 'Availability settings updated successfully',
        type: 'success'
      });
    } catch (error) {
      logger.error('Failed to save availability field:', error);
      window.showToast?.({
        title: 'Save Failed',
        content: 'Could not save changes. Please try again.',
        type: 'error'
      });
    }
  }, [listingId, data]);

  const handleBlockedDatesChange = useCallback(async (newBlockedDates) => {
    if (!listingId) {
      logger.error('❌ No listing ID found for blocked dates update');
      return;
    }

    logger.debug('📅 Saving blocked dates:', newBlockedDates);

    try {
      await data.updateListing({ 'Dates - Blocked': JSON.stringify(newBlockedDates) });

      data.setListing((prev) => ({
        ...prev,
        blockedDates: newBlockedDates,
      }));

      logger.debug('✅ Blocked dates saved successfully');
    } catch (error) {
      logger.error('❌ Failed to save blocked dates:', error);
    }
  }, [listingId, data]);

  return {
    // Auth state from useListingAuth
    authState: auth.authState,
    currentUser: auth.currentUser,

    // Data state from useListingData
    listing: data.listing,
    counts: data.counts,
    isLoading: data.isLoading,
    error: data.error,
    existingCohostRequest: data.existingCohostRequest,

    // Photo handlers from usePhotoManagement
    handleSetCoverPhoto: photos.handleSetCoverPhoto,
    handleDeletePhoto: photos.handleDeletePhoto,
    handleReorderPhotos: photos.handleReorderPhotos,

    // AI handlers from useAIImportAssistant
    showAIImportAssistant: ai.showAIImportAssistant,
    aiGenerationStatus: ai.aiGenerationStatus,
    isAIGenerating: ai.isAIGenerating,
    isAIComplete: ai.isAIComplete,
    aiGeneratedData: ai.aiGeneratedData,
    highlightedFields: ai.highlightedFields,
    handleAIAssistant: ai.handleAIAssistant,
    handleCloseAIImportAssistant: ai.handleCloseAIImportAssistant,
    handleAIImportComplete: ai.handleAIImportComplete,
    handleStartAIGeneration: ai.handleStartAIGeneration,

    // Local UI state
    activeTab,
    editSection,
    editFocusField,
    showScheduleCohost,
    showImportReviews,
    isImportingReviews,

    // UI handlers
    handleTabChange,
    handleCardClick,
    handleBackClick,
    handleDescriptionChange,
    handleCancellationPolicyChange,
    handleCancellationRestrictionsChange,
    handleCopyLink,
    handleScheduleCohost,
    handleCloseScheduleCohost,
    handleCohostRequestSubmitted,
    handleImportReviews,
    handleCloseImportReviews,
    handleSubmitImportReviews,
    handleEditSection,
    handleCloseEdit,
    handleSaveEdit,
    handleAvailabilityChange,
    handleBlockedDatesChange,

    // Expose updateListing for modal compatibility
    updateListing: data.updateListing,
  };
}
