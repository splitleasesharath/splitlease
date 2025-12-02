/**
 * Host Overview Page Logic Hook
 *
 * Contains all business logic for the Host Overview page:
 * - Data fetching for listings, house manuals, virtual meetings
 * - CRUD operations for listings and house manuals
 * - Toast notifications
 * - Modal state management
 *
 * Database Tables Used:
 * - listing: Property listings owned by host
 * - House manual: Documentation for guests
 * - virtualmeetingschedulesandlinks: Scheduled virtual meetings
 * - user: Current user data
 */

import { useState, useEffect, useCallback } from 'react';
import { validateTokenAndFetchUser } from '../../../lib/auth.js';
import { supabase } from '../../../lib/supabase.js';

export function useHostOverviewPageLogic() {
  // ============================================================================
  // STATE
  // ============================================================================

  // User data
  const [user, setUser] = useState(null);

  // Data lists
  const [listingsToClaim, setListingsToClaim] = useState([]);
  const [myListings, setMyListings] = useState([]);
  const [houseManuals, setHouseManuals] = useState([]);
  const [virtualMeetings, setVirtualMeetings] = useState([]);

  // Loading and error states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // UI state
  const [showHelpBanner, setShowHelpBanner] = useState(true);
  const [toasts, setToasts] = useState([]);

  // Modal state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [deleteType, setDeleteType] = useState(null);

  // ============================================================================
  // TOAST NOTIFICATIONS
  // ============================================================================

  const showToast = useCallback((title, message, type = 'information', duration = 3000) => {
    const id = Date.now();
    const newToast = { id, title, message, type, duration };
    setToasts(prev => [...prev, newToast]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  const fetchUserData = useCallback(async () => {
    try {
      const userData = await validateTokenAndFetchUser();
      if (userData) {
        setUser({
          id: userData._id || userData.id,
          firstName: userData['Name - First'] || userData.firstName || 'Host',
          lastName: userData['Name - Last'] || userData.lastName || '',
          email: userData.email || '',
          accountHostId: userData['Account - Host / Landlord'] || userData.accountHostId
        });
        return userData;
      }
      return null;
    } catch (err) {
      console.error('Error fetching user data:', err);
      return null;
    }
  }, []);

  const fetchHostListings = useCallback(async (hostAccountId) => {
    if (!hostAccountId) return [];

    try {
      // Fetch listings from Bubble via Edge Function
      const { data, error: fetchError } = await supabase.functions.invoke('bubble-proxy', {
        body: {
          endpoint: 'listing',
          method: 'GET',
          params: {
            constraints: JSON.stringify([
              { key: 'Creator', constraint_type: 'equals', value: hostAccountId },
              { key: 'Complete', constraint_type: 'equals', value: true }
            ])
          }
        }
      });

      if (fetchError) throw fetchError;

      const listings = data?.response?.results || [];
      return listings.map(listing => ({
        id: listing._id,
        _id: listing._id,
        name: listing.Name || listing.name || 'Unnamed Listing',
        Name: listing.Name,
        complete: listing.Complete || listing.complete,
        location: {
          borough: listing['Location - Borough']?.Display || listing.borough || ''
        },
        leasesCount: listing['Leases Count'] || 0,
        proposalsCount: listing['Proposals Count'] || 0,
        photos: listing['Features - Photos'] || []
      }));
    } catch (err) {
      console.error('Error fetching host listings:', err);
      return [];
    }
  }, []);

  const fetchListingsToClaim = useCallback(async (hostAccountId) => {
    if (!hostAccountId) return [];

    try {
      // Fetch unclaimed listings assigned to this host
      const { data, error: fetchError } = await supabase.functions.invoke('bubble-proxy', {
        body: {
          endpoint: 'listing',
          method: 'GET',
          params: {
            constraints: JSON.stringify([
              { key: 'Complete', constraint_type: 'equals', value: true },
              { key: 'Claimable By', constraint_type: 'contains', value: hostAccountId }
            ])
          }
        }
      });

      if (fetchError) throw fetchError;

      const listings = data?.response?.results || [];
      return listings.map(listing => ({
        id: listing._id,
        _id: listing._id,
        name: listing.Name || listing.name || 'Unnamed Listing',
        Name: listing.Name,
        complete: listing.Complete || listing.complete,
        location: {
          borough: listing['Location - Borough']?.Display || listing.borough || ''
        }
      }));
    } catch (err) {
      console.error('Error fetching listings to claim:', err);
      return [];
    }
  }, []);

  const fetchHouseManuals = useCallback(async (hostAccountId) => {
    if (!hostAccountId) return [];

    try {
      const { data, error: fetchError } = await supabase.functions.invoke('bubble-proxy', {
        body: {
          endpoint: 'House manual',
          method: 'GET',
          params: {
            constraints: JSON.stringify([
              { key: 'Host', constraint_type: 'equals', value: hostAccountId }
            ])
          }
        }
      });

      if (fetchError) throw fetchError;

      const manuals = data?.response?.results || [];
      return manuals.map(manual => ({
        id: manual._id,
        _id: manual._id,
        display: manual.Display || manual.display || 'House Manual',
        Display: manual.Display,
        audience: manual.Audience?.Display || manual.audience || 'Guests',
        createdOn: manual['Created Date'] || manual.createdOn
      }));
    } catch (err) {
      console.error('Error fetching house manuals:', err);
      return [];
    }
  }, []);

  const fetchVirtualMeetings = useCallback(async (hostAccountId) => {
    if (!hostAccountId) return [];

    try {
      // Fetch virtual meetings where host is involved
      const { data, error: fetchError } = await supabase
        .from('virtualmeetingschedulesandlinks')
        .select('*')
        .eq('host_account_id', hostAccountId)
        .order('booked_date', { ascending: true });

      if (fetchError) throw fetchError;

      return (data || []).map(meeting => ({
        id: meeting.id,
        _id: meeting.id,
        guest: {
          firstName: meeting.guest_first_name || 'Guest'
        },
        listing: {
          name: meeting.listing_name || 'Listing'
        },
        bookedDate: meeting.booked_date,
        notifications: meeting.notifications || []
      }));
    } catch (err) {
      console.error('Error fetching virtual meetings:', err);
      return [];
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch user first
      const userData = await fetchUserData();

      if (!userData) {
        // For demo/development, use mock data if no user
        setUser({
          id: 'demo',
          firstName: 'Demo',
          lastName: 'Host',
          email: 'demo@example.com'
        });

        // Set empty arrays - user will see empty states
        setListingsToClaim([]);
        setMyListings([]);
        setHouseManuals([]);
        setVirtualMeetings([]);
        setLoading(false);
        return;
      }

      const hostAccountId = userData['Account - Host / Landlord'] || userData.accountHostId;

      // Fetch all data in parallel
      const [listings, claimListings, manuals, meetings] = await Promise.all([
        fetchHostListings(hostAccountId),
        fetchListingsToClaim(hostAccountId),
        fetchHouseManuals(hostAccountId),
        fetchVirtualMeetings(hostAccountId)
      ]);

      setMyListings(listings);
      setListingsToClaim(claimListings);
      setHouseManuals(manuals);
      setVirtualMeetings(meetings);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load your dashboard. Please try again.');
      showToast('Error', 'Failed to load dashboard data', 'error', 5000);
    } finally {
      setLoading(false);
    }
  }, [fetchUserData, fetchHostListings, fetchListingsToClaim, fetchHouseManuals, fetchVirtualMeetings, showToast]);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ============================================================================
  // ACTION HANDLERS
  // ============================================================================

  const handleCreateNewListing = useCallback(() => {
    showToast('Creating Listing', 'Redirecting to listing creation page...', 'information');
    // Navigate to self-listing page
    window.location.href = '/self-listing';
  }, [showToast]);

  const handleImportListing = useCallback(() => {
    showToast('Import Listing', 'Import listing feature coming soon', 'information');
    // TODO: Open import listing modal or navigate to import page
  }, [showToast]);

  const handleCreateNewManual = useCallback(async () => {
    try {
      showToast('Creating Manual', 'Creating new house manual...', 'information');

      // Create new house manual via Bubble API
      const { data, error: createError } = await supabase.functions.invoke('bubble-proxy', {
        body: {
          endpoint: 'House manual',
          method: 'POST',
          body: {
            Host: user?.accountHostId,
            'Host Name': user?.firstName
          }
        }
      });

      if (createError) throw createError;

      const newManualId = data?.id || data?._id;

      if (newManualId) {
        showToast('Success', 'House manual created! Redirecting...', 'success');
        // Navigate to edit the new manual
        window.location.href = `/host-house-manual/${newManualId}`;
      } else {
        // For now, just show success and reload
        showToast('Success', 'House manual created!', 'success');
        await loadData();
      }
    } catch (err) {
      console.error('Error creating house manual:', err);
      showToast('Error', 'Failed to create house manual', 'error', 5000);
    }
  }, [user, showToast, loadData]);

  const handleEditListing = useCallback((listing) => {
    showToast('Opening Listing', `Opening ${listing.name || listing.Name}...`, 'information');
    // Navigate to listing dashboard or edit page
    window.location.href = `/listing-dashboard?id=${listing.id || listing._id}`;
  }, [showToast]);

  const handlePreviewListing = useCallback((listing) => {
    showToast('Preview', `Previewing ${listing.name || listing.Name}...`, 'information');
    // Open listing preview in new tab
    window.open(`/view-split-lease/${listing.id || listing._id}`, '_blank');
  }, [showToast]);

  const handleSeeDetails = useCallback((listing) => {
    showToast('Details', `Viewing details for ${listing.name || listing.Name}...`, 'information');
    // Navigate to claim listing details
    window.location.href = `/view-split-lease/${listing.id || listing._id}?claim=true`;
  }, [showToast]);

  const handleEditManual = useCallback((manual) => {
    showToast('Opening Manual', `Opening ${manual.display || manual.Display}...`, 'information');
    // Navigate to house manual edit page
    window.location.href = `/host-house-manual/${manual.id || manual._id}`;
  }, [showToast]);

  const handleViewVisits = useCallback((manual) => {
    showToast('Visits', `Viewing visit statistics for ${manual.display || manual.Display}...`, 'information');
    // TODO: Open visits modal or navigate to visits page
  }, [showToast]);

  const handleRespondToVirtualMeeting = useCallback((meeting) => {
    showToast('Virtual Meeting', 'Opening virtual meeting...', 'information');
    // TODO: Navigate to virtual meeting page or open modal
    if (meeting.meetingLink) {
      window.open(meeting.meetingLink, '_blank');
    }
  }, [showToast]);

  // ============================================================================
  // DELETE HANDLERS
  // ============================================================================

  const handleDeleteClick = useCallback((item, type) => {
    setItemToDelete(item);
    setDeleteType(type);
    setShowDeleteConfirm(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!itemToDelete) return;

    try {
      const itemId = itemToDelete.id || itemToDelete._id;
      const itemName = itemToDelete.name || itemToDelete.Name || itemToDelete.display || itemToDelete.Display || 'item';

      if (deleteType === 'listing') {
        // Delete listing via Bubble API
        await supabase.functions.invoke('bubble-proxy', {
          body: {
            endpoint: `listing/${itemId}`,
            method: 'DELETE'
          }
        });

        setMyListings(prev => prev.filter(l => (l.id || l._id) !== itemId));
        showToast('Success', `${itemName} deleted successfully`, 'success');
      } else if (deleteType === 'claim') {
        // Remove from claim list (don't actually delete the listing)
        await supabase.functions.invoke('bubble-proxy', {
          body: {
            endpoint: `listing/${itemId}`,
            method: 'PATCH',
            body: {
              'Claimable By': [] // Clear the claimable by list
            }
          }
        });

        setListingsToClaim(prev => prev.filter(l => (l.id || l._id) !== itemId));
        showToast('Success', `${itemName} removed from claim list`, 'success');
      } else if (deleteType === 'manual') {
        // Delete house manual
        await supabase.functions.invoke('bubble-proxy', {
          body: {
            endpoint: `House manual/${itemId}`,
            method: 'DELETE'
          }
        });

        setHouseManuals(prev => prev.filter(m => (m.id || m._id) !== itemId));
        showToast('Success', `${itemName} deleted successfully`, 'success');
      }

      setShowDeleteConfirm(false);
      setItemToDelete(null);
      setDeleteType(null);
    } catch (err) {
      console.error('Error deleting item:', err);
      showToast('Error', 'Failed to delete item. Please try again.', 'error', 5000);
    }
  }, [itemToDelete, deleteType, showToast]);

  const handleCancelDelete = useCallback(() => {
    setShowDeleteConfirm(false);
    setItemToDelete(null);
    setDeleteType(null);
  }, []);

  // ============================================================================
  // RETURN
  // ============================================================================

  return {
    // Core data
    user,
    listingsToClaim,
    myListings,
    houseManuals,
    virtualMeetings,
    loading,
    error,

    // UI State
    showHelpBanner,
    setShowHelpBanner,
    toasts,
    removeToast,

    // Modal state
    showDeleteConfirm,
    itemToDelete,
    deleteType,

    // Action handlers
    handleCreateNewListing,
    handleImportListing,
    handleCreateNewManual,
    handleEditListing,
    handlePreviewListing,
    handleSeeDetails,
    handleEditManual,
    handleViewVisits,
    handleDeleteClick,
    handleConfirmDelete,
    handleCancelDelete,
    handleRespondToVirtualMeeting,

    // Utility
    loadData
  };
}
