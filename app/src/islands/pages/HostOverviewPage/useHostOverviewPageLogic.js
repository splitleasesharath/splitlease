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

  // Create listing modal state
  const [showCreateListingModal, setShowCreateListingModal] = useState(false);

  // Import listing modal state
  const [showImportListingModal, setShowImportListingModal] = useState(false);
  const [importListingLoading, setImportListingLoading] = useState(false);

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
          // After migration, user._id serves as host reference directly
          accountHostId: userData.accountHostId || userData._id
        });
        return userData;
      }
      return null;
    } catch (err) {
      console.error('Error fetching user data:', err);
      return null;
    }
  }, []);

  const fetchHostListings = useCallback(async (hostAccountId, userId) => {
    if (!hostAccountId && !userId) return [];

    try {
      // First, fetch borough reference table to map IDs to display names
      const { data: boroughs } = await supabase
        .from('zat_geo_borough_toplevel')
        .select('_id, "Display Borough"');

      const boroughMap = {};
      if (boroughs) {
        boroughs.forEach(b => {
          boroughMap[b._id] = b['Display Borough'];
        });
      }

      // Fetch listings from multiple sources in parallel:
      // 1. Bubble API (existing synced listings)
      // 2. listing table via RPC (self-listing submissions)
      // 3. user.Listings array (linked listings)

      const fetchPromises = [];

      // 1. Try Bubble API (only if hostAccountId is available)
      if (hostAccountId) {
        fetchPromises.push(
          supabase.functions.invoke('bubble-proxy', {
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
          }).then(result => {
            if (result.error) {
              console.warn('Bubble listings fetch failed:', result.error);
              return { type: 'bubble', data: { response: { results: [] } } };
            }
            return { type: 'bubble', ...result };
          }).catch(err => {
            console.warn('Bubble listings fetch failed:', err);
            return { type: 'bubble', data: { response: { results: [] } } };
          })
        );
      }

      // 2. Fetch from listing table where Host User = userId or Created By = userId
      // Using RPC function to handle column names with special characters
      if (userId) {
        fetchPromises.push(
          supabase
            .rpc('get_host_listings', { host_user_id: userId })
            .then(result => {
              console.log('[HostOverview] listing query result:', result);
              return { type: 'listing_rpc', ...result };
            })
            .catch(err => {
              console.warn('listing fetch failed:', err);
              return { type: 'listing_rpc', data: [], error: err };
            })
        );
      }

      // 3. Fetch listing IDs from user.Listings array
      if (userId) {
        fetchPromises.push(
          supabase
            .from('user')
            .select('Listings')
            .eq('_id', userId)
            .maybeSingle()
            .then(result => ({ type: 'user_listings', ...result }))
            .catch(err => {
              console.warn('user Listings fetch failed:', err);
              return { type: 'user_listings', data: null, error: err };
            })
        );
      }

      const results = await Promise.all(fetchPromises);

      // Process Bubble listings
      const bubbleResult = results.find(r => r?.type === 'bubble');
      const bubbleListings = bubbleResult?.data?.response?.results || [];
      const mappedBubbleListings = bubbleListings.map(listing => ({
        id: listing._id,
        _id: listing._id,
        name: listing.Name || listing.name || 'Unnamed Listing',
        Name: listing.Name,
        complete: listing.Complete || listing.complete,
        source: 'bubble',
        location: {
          borough: listing['Location - Borough']?.Display || listing.borough || ''
        },
        leasesCount: listing['Leases Count'] || 0,
        proposalsCount: listing['Proposals Count'] || 0,
        photos: listing['Features - Photos'] || [],
        // Pricing fields
        rental_type: listing['rental type'] || 'Nightly',
        monthly_rate: listing['💰Monthly Host Rate'],
        weekly_rate: listing['💰Weekly Host Rate'],
        // Nightly rates for each night count
        nightly_rate_2: listing['💰Nightly Host Rate for 2 nights'],
        nightly_rate_3: listing['💰Nightly Host Rate for 3 nights'],
        nightly_rate_4: listing['💰Nightly Host Rate for 4 nights'],
        nightly_rate_5: listing['💰Nightly Host Rate for 5 nights'],
        nightly_rate_7: listing['💰Nightly Host Rate for 7 nights'],
        cleaning_fee: listing['💰Cleaning Cost / Maintenance Fee'],
        damage_deposit: listing['💰Damage Deposit']
      }));

      // Process listings from RPC
      let rpcListings = [];
      const rpcResult = results.find(r => r?.type === 'listing_rpc');
      if (rpcResult?.data && !rpcResult.error) {
        rpcListings = rpcResult.data.map(listing => ({
          id: listing.id,
          _id: listing._id,
          name: listing.Name || 'Unnamed Listing',
          Name: listing.Name,
          complete: listing.Complete || false,
          source: listing.source || 'listing',
          location: {
            borough: boroughMap[listing['Location - Borough']] || listing['Location - Borough'] || '',
            city: listing['Location - City'] || '',
            state: listing['Location - State'] || ''
          },
          leasesCount: 0,
          proposalsCount: 0,
          photos: listing['Features - Photos'] || [],
          // Pricing fields from RPC
          rental_type: listing.rental_type,
          monthly_rate: listing.monthly_rate,
          weekly_rate: listing.weekly_rate,
          // Individual nightly rates from RPC
          nightly_rate_2: listing.rate_2_nights,
          nightly_rate_3: listing.rate_3_nights,
          nightly_rate_4: listing.rate_4_nights,
          nightly_rate_5: listing.rate_5_nights,
          nightly_rate_7: listing.rate_7_nights,
          rate_5_nights: listing.rate_5_nights,
          cleaning_fee: listing.cleaning_fee,
          damage_deposit: listing.damage_deposit,
          pricing_list: listing.pricing_list
        }));
      }

      // Check if we need to fetch additional listings from user.Listings
      const userListingsResult = results.find(r => r?.type === 'user_listings');
      const linkedListingIds = userListingsResult?.data?.Listings || [];

      // Fetch any linked listings that aren't already in our results
      const existingIds = new Set([
        ...mappedBubbleListings.map(l => l.id),
        ...rpcListings.map(l => l.id)
      ]);

      const missingIds = linkedListingIds.filter(id => !existingIds.has(id));

      if (missingIds.length > 0) {
        // Fetch missing listings from listing table
        const { data: missingListings } = await supabase
          .from('listing')
          .select('*')
          .in('_id', missingIds);

        if (missingListings) {
          const mappedMissing = missingListings.map(listing => ({
            id: listing._id,
            _id: listing._id,
            name: listing.Name || 'Unnamed Listing',
            Name: listing.Name,
            complete: listing.Complete || false,
            source: 'listing',
            location: {
              borough: boroughMap[listing['Location - Borough']] || listing['Location - Borough'] || '',
              city: listing['Location - City'] || '',
              state: listing['Location - State'] || ''
            },
            leasesCount: 0,
            proposalsCount: 0,
            photos: listing['Features - Photos'] || [],
            // Pricing fields (using original column names from direct query)
            rental_type: listing['rental type'],
            monthly_rate: listing['💰Monthly Host Rate'],
            weekly_rate: listing['💰Weekly Host Rate'],
            // Individual nightly rates
            nightly_rate_2: listing['💰Nightly Host Rate for 2 nights'],
            nightly_rate_3: listing['💰Nightly Host Rate for 3 nights'],
            nightly_rate_4: listing['💰Nightly Host Rate for 4 nights'],
            nightly_rate_5: listing['💰Nightly Host Rate for 5 nights'],
            nightly_rate_7: listing['💰Nightly Host Rate for 7 nights'],
            rate_5_nights: listing['💰Nightly Host Rate for 5 nights'],
            cleaning_fee: listing['💰Cleaning Cost / Maintenance Fee'],
            damage_deposit: listing['💰Damage Deposit'],
            pricing_list: listing.pricing_list
          }));
          rpcListings = [...rpcListings, ...mappedMissing];
        }
      }

      // Combine all listings, deduplicated by id
      const allListings = [...mappedBubbleListings, ...rpcListings];
      const uniqueListings = allListings.filter((listing, index, self) =>
        index === self.findIndex(l => l.id === listing.id)
      );

      console.log('[HostOverview] Fetched listings:', {
        bubble: mappedBubbleListings.length,
        rpc: rpcListings.length,
        total: uniqueListings.length
      });

      return uniqueListings;
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

      // After migration, user._id serves as host reference directly
      const hostAccountId = userData.accountHostId || userData._id;
      const userId = userData.userId || userData._id || userData.id;

      console.log('[HostOverview] loadData - hostAccountId:', hostAccountId, 'userId:', userId);

      // Fetch all data in parallel
      const [listings, claimListings, manuals, meetings] = await Promise.all([
        fetchHostListings(hostAccountId, userId),
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
    // Show the CreateDuplicateListingModal instead of navigating directly
    // This allows the user to enter a listing name before being redirected to self-listing (v1)
    setShowCreateListingModal(true);
  }, []);

  const handleCloseCreateListingModal = useCallback(() => {
    setShowCreateListingModal(false);
  }, []);

  const handleImportListing = useCallback(() => {
    setShowImportListingModal(true);
  }, []);

  const handleCloseImportListingModal = useCallback(() => {
    setShowImportListingModal(false);
  }, []);

  const handleImportListingSubmit = useCallback(async ({ listingUrl, emailAddress }) => {
    setImportListingLoading(true);
    try {
      // Send import request to Cloudflare Pages Function (same-origin, no CORS issues)
      const response = await fetch('/api/import-listing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingUrl,
          emailAddress,
          userId: user?.id,
          userName: `${user?.firstName || ''} ${user?.lastName || ''}`.trim()
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to submit import request');
      }

      showToast('Success', 'Import request submitted! We\'ll notify you when your listing is ready.', 'success', 5000);
      setShowImportListingModal(false);
    } catch (err) {
      console.error('Error submitting import request:', err);
      showToast('Error', 'Failed to submit import request. Please try again.', 'error', 5000);
    } finally {
      setImportListingLoading(false);
    }
  }, [user, showToast]);

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
    window.open(`/preview-split-lease/${listing.id || listing._id}`, '_blank');
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
        // Delete listing via listing edge function
        const { data, error } = await supabase.functions.invoke('listing', {
          body: {
            action: 'delete',
            payload: {
              listing_id: itemId,
              user_email: user?.email,
            }
          }
        });

        if (error) {
          throw new Error(error.message || 'Failed to delete listing');
        }

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
    showCreateListingModal,
    showImportListingModal,
    importListingLoading,

    // Action handlers
    handleCreateNewListing,
    handleCloseCreateListingModal,
    handleImportListing,
    handleCloseImportListingModal,
    handleImportListingSubmit,
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
