import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { mockListing, mockCounts } from './data/mockListing';

/**
 * Safely parse a JSON string or return the value if already an array
 */
function safeParseJsonArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.warn('Failed to parse JSON array:', e);
      return [];
    }
  }
  return [];
}

/**
 * Fetch all lookup tables needed for resolving feature names
 */
async function fetchLookupTables() {
  const lookups = {
    amenities: {},
    safetyFeatures: {},
    houseRules: {},
    listingTypes: {},
    parkingOptions: {},
    storageOptions: {},
  };

  try {
    // Fetch amenities
    const { data: amenities } = await supabase
      .from('zat_features_amenity')
      .select('_id, "Name", "Icon"');
    if (amenities) {
      amenities.forEach((a) => {
        lookups.amenities[a._id] = { name: a.Name, icon: a.Icon };
      });
    }

    // Fetch safety features
    const { data: safety } = await supabase
      .from('zfut_safetyfeatures')
      .select('_id, "Name", "Icon"');
    if (safety) {
      safety.forEach((s) => {
        lookups.safetyFeatures[s._id] = { name: s.Name, icon: s.Icon };
      });
    }

    // Fetch house rules
    const { data: rules } = await supabase
      .from('zat_features_houserule')
      .select('_id, "Name", "Icon"');
    if (rules) {
      rules.forEach((r) => {
        lookups.houseRules[r._id] = { name: r.Name, icon: r.Icon };
      });
    }

    // Fetch listing types (Label has trailing space in column name)
    const { data: types } = await supabase
      .from('zat_features_listingtype')
      .select('_id, "Label ", "Icon"');
    if (types) {
      types.forEach((t) => {
        lookups.listingTypes[t._id] = { name: t['Label '], icon: t.Icon };
      });
    }

    // Fetch parking options
    const { data: parking } = await supabase
      .from('zat_features_parkingoptions')
      .select('_id, "Label"');
    if (parking) {
      parking.forEach((p) => {
        lookups.parkingOptions[p._id] = { name: p.Label };
      });
    }

    // Fetch storage options
    const { data: storage } = await supabase
      .from('zat_features_storageoptions')
      .select('_id, "Title"');
    if (storage) {
      storage.forEach((s) => {
        lookups.storageOptions[s._id] = { name: s.Title };
      });
    }

    console.log('📚 Lookup tables loaded');
  } catch (err) {
    console.warn('⚠️ Failed to fetch lookup tables:', err);
  }

  return lookups;
}

/**
 * Transform Supabase listing data to component-friendly format
 * @param {Object} dbListing - Raw listing data from Supabase
 * @param {Array} photos - Array of photo objects
 * @param {Object} lookups - Lookup tables for resolving IDs to names
 * @param {boolean} isListingTrial - Whether this is from listing_trial table (uses 'id' instead of '_id')
 */
function transformListingData(dbListing, photos = [], lookups = {}, isListingTrial = false) {
  if (!dbListing) return null;

  // listing_trial uses 'id' (UUID), listing uses '_id' (Bubble ID)
  const listingId = isListingTrial ? dbListing.id : dbListing._id;

  // Parse location address if it's a JSON string
  let locationAddress = {};
  try {
    if (typeof dbListing['Location - Address'] === 'string') {
      locationAddress = JSON.parse(dbListing['Location - Address']);
    } else if (dbListing['Location - Address']) {
      locationAddress = dbListing['Location - Address'];
    }
  } catch (e) {
    console.warn('Failed to parse location address:', e);
  }

  // Transform amenities from JSON strings (stored as text) to component format
  const inUnitAmenities = safeParseJsonArray(dbListing['Features - Amenities In-Unit']).map((id) => ({
    id: id,
    name: lookups.amenities?.[id]?.name || id,
    icon: lookups.amenities?.[id]?.icon || null,
  }));

  const buildingAmenities = safeParseJsonArray(dbListing['Features - Amenities In-Building']).map((id) => ({
    id: id,
    name: lookups.amenities?.[id]?.name || id,
    icon: lookups.amenities?.[id]?.icon || null,
  }));

  const safetyFeatures = safeParseJsonArray(dbListing['Features - Safety']).map((id) => ({
    id: id,
    name: lookups.safetyFeatures?.[id]?.name || id,
    icon: lookups.safetyFeatures?.[id]?.icon || null,
  }));

  const houseRules = safeParseJsonArray(dbListing['Features - House Rules']).map((id) => ({
    id: id,
    name: lookups.houseRules?.[id]?.name || id,
    icon: lookups.houseRules?.[id]?.icon || null,
  }));

  // Transform photos
  const transformedPhotos = photos.map((photo, index) => ({
    id: photo._id,
    url: photo.Photo || photo.URL || '',
    isCover: photo.toggleMainPhoto || index === 0,
    photoType: photo.Type || 'Other',
  }));

  // Parse available days (1-7 Bubble format to 0-6 JS format)
  const availableDays = safeParseJsonArray(dbListing['Days Available (List of Days)']).map(day => {
    // Bubble uses 1-7, JS uses 0-6
    const numDay = typeof day === 'number' ? day : parseInt(day, 10);
    return numDay - 1; // Convert to 0-indexed
  });

  // Convert Bubble day numbers to night IDs for HostScheduleSelector
  // Bubble uses 1=Sunday, 2=Monday... 7=Saturday
  const NIGHT_IDS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const nightsAvailable = safeParseJsonArray(dbListing['Days Available (List of Days)']).map(day => {
    const numDay = typeof day === 'number' ? day : parseInt(day, 10);
    // Bubble uses 1-7, night IDs use 0-indexed array
    return NIGHT_IDS[numDay - 1];
  }).filter(Boolean);

  return {
    id: listingId,

    // Property Info
    title: dbListing.Name || 'Untitled Listing',
    description: dbListing.Description || '',
    descriptionNeighborhood: dbListing['Description - Neighborhood'] || '',

    // Location
    location: {
      id: listingId,
      address: locationAddress.address || dbListing['Not Found - Location - Address '] || '',
      hoodsDisplay: dbListing['Location - Hood'] || '',
      city: dbListing['Location - City'] || '',
      state: dbListing['Location - State'] || '',
      zipCode: dbListing['Location - Zip Code'] || '',
      latitude: locationAddress.lat || null,
      longitude: locationAddress.lng || null,
    },

    // Status
    status: dbListing.Active ? 'Online' : 'Offline',
    isOnline: dbListing.Active || false,
    createdAt: dbListing['Created Date'] ? new Date(dbListing['Created Date']) : null,
    activeSince: dbListing['Created Date'] ? new Date(dbListing['Created Date']) : null,
    updatedAt: dbListing['Modified Date'] ? new Date(dbListing['Modified Date']) : null,

    // Property Details
    features: {
      id: listingId,
      typeOfSpace: {
        id: dbListing['Features - Type of Space'],
        label: lookups.listingTypes?.[dbListing['Features - Type of Space']]?.name || dbListing['Features - Type of Space'] || 'N/A',
      },
      parkingType: {
        id: dbListing['Features - Parking type'],
        label: lookups.parkingOptions?.[dbListing['Features - Parking type']]?.name || dbListing['Features - Parking type'] || 'No parking',
      },
      kitchenType: {
        id: dbListing['Kitchen Type'],
        display: dbListing['Kitchen Type'] || 'No kitchen',
      },
      storageType: {
        id: dbListing['Features - Secure Storage Option'],
        label: lookups.storageOptions?.[dbListing['Features - Secure Storage Option']]?.name || dbListing['Features - Secure Storage Option'] || 'No storage',
      },
      qtyGuests: dbListing['Features - Qty Guests'] || 1,
      bedrooms: dbListing['Features - Qty Bedrooms'] || 0,
      bathrooms: dbListing['Features - Qty Bathrooms'] || 0,
      squareFootage: dbListing['Features - SQFT Area'] || dbListing['Features - SQFT of Room'] || 0,
    },

    // Amenities
    inUnitAmenities,
    buildingAmenities,
    safetyFeatures,
    houseRules,

    // Guest Preferences
    preferredGender: {
      id: dbListing['Preferred Gender'],
      display: dbListing['Preferred Gender'] || 'Any',
    },
    maxGuests: dbListing['Features - Qty Guests'] || 2,

    // Pricing and Lease Style
    leaseStyle: dbListing['rental type'] || 'Nightly',
    nightsPerWeekMin: dbListing['Minimum Nights'] || 2,
    nightsPerWeekMax: dbListing['Maximum Nights'] || 7,
    availableDays,
    nightsAvailable, // Night IDs for HostScheduleSelector

    pricing: {
      2: dbListing['💰Nightly Host Rate for 2 nights'] || 0,
      3: dbListing['💰Nightly Host Rate for 3 nights'] || 0,
      4: dbListing['💰Nightly Host Rate for 4 nights'] || 0,
      5: dbListing['💰Nightly Host Rate for 5 nights'] || 0,
      6: dbListing['💰Nightly Host Rate for 5 nights'] || 0, // Use 5-night rate for 6
      7: dbListing['💰Nightly Host Rate for 7 nights'] || 0,
    },

    weeklyCompensation: {
      2: (dbListing['💰Nightly Host Rate for 2 nights'] || 0) * 2,
      3: (dbListing['💰Nightly Host Rate for 3 nights'] || 0) * 3,
      4: (dbListing['💰Nightly Host Rate for 4 nights'] || 0) * 4,
      5: (dbListing['💰Nightly Host Rate for 5 nights'] || 0) * 5,
      6: (dbListing['💰Nightly Host Rate for 5 nights'] || 0) * 6,
      7: (dbListing['💰Nightly Host Rate for 7 nights'] || 0) * 7,
    },

    damageDeposit: dbListing['💰Damage Deposit'] || 0,
    maintenanceFee: dbListing['💰Cleaning Cost / Maintenance Fee'] || 0,

    // Availability
    leaseTermMin: dbListing['Minimum Weeks'] || 6,
    leaseTermMax: dbListing['Maximum Weeks'] || 52,
    earliestAvailableDate: dbListing[' First Available'] ? new Date(dbListing[' First Available']) : new Date(),
    checkInTime: dbListing['NEW Date Check-in Time'] || '1:00 pm',
    checkOutTime: dbListing['NEW Date Check-out Time'] || '1:00 pm',
    blockedDates: safeParseJsonArray(dbListing['Dates - Blocked']),

    // Cancellation Policy
    cancellationPolicy: dbListing['Cancellation Policy'] || 'Standard',

    // Photos
    photos: transformedPhotos,

    // Virtual Tour
    virtualTourUrl: dbListing['video tour'] || null,
  };
}

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

  // Edit modal state
  const [editSection, setEditSection] = useState(null); // null = closed, or section name

  // Get listing ID from URL - support both 'id' and 'listing_id' params
  const getListingIdFromUrl = useCallback(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('id') || params.get('listing_id');
  }, []);

  // Fetch listing data from Supabase
  const fetchListing = useCallback(async (listingId) => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('🔍 Fetching listing:', listingId);

      // Try listing_trial first (by id column), then fall back to listing table (by _id column)
      // This handles both new self-listing submissions (stored in listing_trial) and
      // existing Bubble listings (stored in listing table)

      // First, try listing_trial table by 'id' column
      console.log('📋 Trying listing_trial table with id=' + listingId);
      const trialResult = await supabase
        .from('listing_trial')
        .select('*')
        .eq('id', listingId)
        .maybeSingle();

      let listingData = trialResult.data;
      let isListingTrial = true;

      // If not found in listing_trial, try the listing table by '_id' column
      if (!listingData) {
        console.log('📋 Not found in listing_trial, trying listing table with _id=' + listingId);
        const listingResult = await supabase
          .from('listing')
          .select('*')
          .eq('_id', listingId)
          .maybeSingle();

        if (listingResult.error) {
          throw new Error(`Failed to fetch listing: ${listingResult.error.message}`);
        }

        listingData = listingResult.data;
        isListingTrial = false;
      }

      if (!listingData) {
        throw new Error('Listing not found in either listing_trial or listing table');
      }

      console.log(`✅ Found listing in ${isListingTrial ? 'listing_trial' : 'listing'} table:`, listingData);

      // Fetch lookup tables and related data in parallel
      const [lookups, photosResult, proposalsResult, leasesResult, meetingsResult] = await Promise.all([
        fetchLookupTables(),
        // For listing_trial, photos are stored inline in 'Features - Photos' column, not a separate table
        isListingTrial
          ? Promise.resolve({ data: [], error: null })
          : supabase.from('listing_photo').select('*').eq('Listing', listingId).eq('Active', true).order('SortOrder', { ascending: true }),
        // For listing_trial, proposals/leases/meetings may not exist yet
        isListingTrial
          ? Promise.resolve({ count: 0, error: null })
          : supabase.from('proposal').select('*', { count: 'exact', head: true }).eq('Listing', listingId),
        isListingTrial
          ? Promise.resolve({ count: 0, error: null })
          : supabase.from('bookings_leases').select('*', { count: 'exact', head: true }).eq('Listing', listingId),
        isListingTrial
          ? Promise.resolve({ count: 0, error: null })
          : supabase.from('virtualmeetingschedulesandlinks').select('*', { count: 'exact', head: true }).eq('Listing', listingId),
      ]);

      // For listing_trial, extract photos from inline 'Features - Photos' JSON column
      let photos = [];
      if (isListingTrial) {
        const inlinePhotos = safeParseJsonArray(listingData['Features - Photos']);
        // Transform inline photos to match expected format
        photos = inlinePhotos.map((photo, index) => ({
          _id: `inline_${index}`,
          Photo: photo.url || photo.Photo || photo,
          URL: photo.url || photo.Photo || photo,
          toggleMainPhoto: photo.isCover || index === 0,
          Type: photo.type || photo.Type || 'Other',
          SortOrder: photo.sortOrder || index,
          Active: true,
        }));
        console.log('📷 Inline photos from listing_trial:', photos.length);
      } else {
        const { data: photosData, error: photosError } = photosResult;
        if (photosError) {
          console.warn('⚠️ Failed to fetch photos:', photosError);
        }
        photos = photosData || [];
        console.log('📷 Photos from listing_photo table:', photos.length);
      }

      const { count: proposalsCount, error: proposalsError } = proposalsResult;
      if (proposalsError) {
        console.warn('⚠️ Failed to fetch proposals count:', proposalsError);
      }

      const { count: leasesCount, error: leasesError } = leasesResult;
      if (leasesError) {
        console.warn('⚠️ Failed to fetch leases count:', leasesError);
      }

      const { count: meetingsCount, error: meetingsError } = meetingsResult;
      if (meetingsError) {
        console.warn('⚠️ Failed to fetch meetings count:', meetingsError);
      }

      // Pass isListingTrial to handle listing_trial (uses 'id') vs listing (uses '_id')
      const transformedListing = transformListingData(listingData, photos || [], lookups, isListingTrial);

      setListing(transformedListing);
      setCounts({
        proposals: proposalsCount || 0,
        virtualMeetings: meetingsCount || 0,
        leases: leasesCount || 0,
      });

      console.log('✅ Listing loaded successfully');
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
      console.log('⚠️ No listing ID in URL, using mock data');
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
          window.open(`/view-split-lease.html?id=${listing.id}`, '_blank');
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
          window.open(`/view-split-lease.html?id=${listing.id}`, '_blank');
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

  // Edit modal handlers
  const handleEditSection = useCallback((section) => {
    setEditSection(section);
  }, []);

  const handleCloseEdit = useCallback(() => {
    setEditSection(null);
  }, []);

  // Update listing in database and local state
  const updateListing = useCallback(async (listingId, updates) => {
    console.log('📝 Updating listing:', listingId, updates);

    // Try listing_trial first (by id column), then fall back to listing table (by _id column)
    // First check if the listing exists in listing_trial
    const { data: trialCheck } = await supabase
      .from('listing_trial')
      .select('id')
      .eq('id', listingId)
      .maybeSingle();

    const tableName = trialCheck ? 'listing_trial' : 'listing';
    const idColumn = trialCheck ? 'id' : '_id';

    console.log(`📋 Updating ${tableName} table with ${idColumn}=${listingId}`);

    const { data, error: updateError } = await supabase
      .from(tableName)
      .update(updates)
      .eq(idColumn, listingId)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Error updating listing:', updateError);
      throw updateError;
    }

    console.log('✅ Listing updated:', data);
    return data;
  }, []);

  // Handle save from edit modal - update local state
  const handleSaveEdit = useCallback((updatedData) => {
    // Refresh listing data after save
    const listingId = getListingIdFromUrl();
    if (listingId) {
      fetchListing(listingId);
    }
  }, [fetchListing, getListingIdFromUrl]);

  return {
    // State
    activeTab,
    listing,
    counts,
    isLoading,
    error,
    editSection,

    // Handlers
    handleTabChange,
    handleCardClick,
    handleBackClick,
    handleDescriptionChange,
    handleCancellationPolicyChange,
    handleCopyLink,
    handleAIAssistant,

    // Edit modal handlers
    handleEditSection,
    handleCloseEdit,
    handleSaveEdit,
    updateListing,
  };
}
