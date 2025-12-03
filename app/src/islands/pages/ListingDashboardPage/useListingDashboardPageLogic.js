import { useState, useEffect, useCallback } from 'react';
import { mockListing, mockCounts } from './data/mockListing';

/**
 * Custom hook for ListingDashboardPage logic
 * Follows the Hollow Component Pattern - all business logic is here
 */
export default function useListingDashboardPageLogic() {
  // State
  const [activeTab, setActiveTab] = useState('manage');
  const [listing, setListing] = useState(null);
  const [counts, setCounts] = useState({ proposals: 0, virtualMeetings: 0, leases: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Get listing ID from URL
  const getListingIdFromUrl = useCallback(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
  }, []);

  // Fetch listing data
  const fetchListing = useCallback(async (listingId) => {
    setIsLoading(true);
    setError(null);

    try {
      // TODO: Replace with actual API call to Supabase Edge Function
      // For now, use mock data
      await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate network delay

      setListing(mockListing);
      setCounts(mockCounts);
    } catch (err) {
      console.error('❌ Error fetching listing:', err);
      setError(err.message || 'Failed to load listing');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initialize on mount
  useEffect(() => {
    const listingId = getListingIdFromUrl();
    if (listingId) {
      fetchListing(listingId);
    } else {
      // Use mock data if no ID provided (for development)
      setListing(mockListing);
      setCounts(mockCounts);
      setIsLoading(false);
    }
  }, [fetchListing, getListingIdFromUrl]);

  // Tab change handler
  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);

    // Handle tab-specific navigation
    switch (tab) {
      case 'preview':
        // Could open in new tab or navigate
        if (listing) {
          window.open(`/view-split-lease?id=${listing.id}`, '_blank');
        }
        break;
      case 'proposals':
        // Navigate to proposals section or page
        break;
      case 'virtual-meetings':
        // Navigate to virtual meetings section
        break;
      case 'leases':
        // Navigate to leases section
        break;
      default:
        // Stay on manage tab
        break;
    }
  }, [listing]);

  // Action card click handler
  const handleCardClick = useCallback((cardId) => {
    switch (cardId) {
      case 'preview':
        if (listing) {
          window.open(`/view-split-lease?id=${listing.id}`, '_blank');
        }
        break;
      case 'copy-link':
        // Handled by SecondaryActions component
        break;
      case 'proposals':
        setActiveTab('proposals');
        // TODO: Navigate to proposals or scroll to section
        break;
      case 'meetings':
        setActiveTab('virtual-meetings');
        // TODO: Navigate to meetings or scroll to section
        break;
      case 'manage':
        setActiveTab('manage');
        break;
      case 'leases':
        setActiveTab('leases');
        // TODO: Navigate to leases or scroll to section
        break;
      default:
        console.log('Unknown card clicked:', cardId);
    }
  }, [listing]);

  // Back to all listings handler
  const handleBackClick = useCallback(() => {
    // Navigate to host dashboard or listings page
    window.location.href = '/host-dashboard';
  }, []);

  // Description change handler
  const handleDescriptionChange = useCallback((newDescription) => {
    setListing((prev) => ({
      ...prev,
      description: newDescription,
    }));
    // TODO: Debounce and save to backend
  }, []);

  // Cancellation policy change handler
  const handleCancellationPolicyChange = useCallback((policy) => {
    // TODO: Save to backend
    console.log('Cancellation policy changed to:', policy);
  }, []);

  // Copy link handler
  const handleCopyLink = useCallback(() => {
    console.log('Link copied');
  }, []);

  // AI Assistant handler
  const handleAIAssistant = useCallback(() => {
    // TODO: Open AI assistant modal or navigate
    console.log('AI Assistant requested');
  }, []);

  return {
    // State
    activeTab,
    listing,
    counts,
    isLoading,
    error,

    // Handlers
    handleTabChange,
    handleCardClick,
    handleBackClick,
    handleDescriptionChange,
    handleCancellationPolicyChange,
    handleCopyLink,
    handleAIAssistant,
  };
}
