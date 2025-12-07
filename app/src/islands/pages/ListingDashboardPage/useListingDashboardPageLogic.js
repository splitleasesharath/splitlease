import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { validateTokenAndFetchUser } from '../../../lib/auth';
import { mockListing, mockCounts } from './data/mockListing';
import { generateListingDescription, generateListingTitle } from '../../../lib/aiService';
import { getCommonHouseRules } from '../../shared/EditListingDetails/services/houseRulesService';
import { getCommonSafetyFeatures } from '../../shared/EditListingDetails/services/safetyFeaturesService';
import { getCommonInUnitAmenities, getCommonBuildingAmenities } from '../../shared/EditListingDetails/services/amenitiesService';
import { getNeighborhoodByZipCode } from '../../shared/EditListingDetails/services/neighborhoodService';

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
    monthlyHostRate: dbListing['💰Monthly Host Rate'] || 0,

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
        // Open preview page in new tab
        if (listing) {
          window.open(`/preview-split-lease.html?id=${listing.id}`, '_blank');
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
          window.open(`/preview-split-lease.html?id=${listing.id}`, '_blank');
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

  // AI Assistant handler - opens the AI Import Assistant modal
  const handleAIAssistant = useCallback(() => {
    // Reset state and open modal
    setAiGenerationStatus({
      name: 'pending',
      description: 'pending',
      neighborhood: 'pending',
      inUnitAmenities: 'pending',
      buildingAmenities: 'pending',
      houseRules: 'pending',
      safetyFeatures: 'pending',
    });
    setIsAIGenerating(false);
    setIsAIComplete(false);
    setAiGeneratedData({});
    setShowAIImportAssistant(true);
    console.log('🤖 AI Import Assistant opened');
  }, []);

  // Schedule Cohost state
  const [showScheduleCohost, setShowScheduleCohost] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  // Import Reviews modal state
  const [showImportReviews, setShowImportReviews] = useState(false);
  const [isImportingReviews, setIsImportingReviews] = useState(false);

  // AI Import Assistant modal state
  const [showAIImportAssistant, setShowAIImportAssistant] = useState(false);
  const [aiGenerationStatus, setAiGenerationStatus] = useState({
    name: 'pending',
    description: 'pending',
    neighborhood: 'pending',
    inUnitAmenities: 'pending',
    buildingAmenities: 'pending',
    houseRules: 'pending',
    safetyFeatures: 'pending',
  });
  const [isAIGenerating, setIsAIGenerating] = useState(false);
  const [isAIComplete, setIsAIComplete] = useState(false);
  const [aiGeneratedData, setAiGeneratedData] = useState({});

  // Fetch current user data
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userData = await validateTokenAndFetchUser();
        if (userData) {
          setCurrentUser(userData);
        }
      } catch (err) {
        console.warn('⚠️ Could not fetch user data:', err);
      }
    };
    fetchUser();
  }, []);

  // Schedule Cohost handlers
  const handleScheduleCohost = useCallback(() => {
    setShowScheduleCohost(true);
  }, []);

  const handleCloseScheduleCohost = useCallback(() => {
    setShowScheduleCohost(false);
  }, []);

  const handleCohostRequestSubmitted = useCallback((requestId, virtualMeetingId) => {
    console.log('✅ Co-host request submitted:', { requestId, virtualMeetingId });
    // Optionally refresh data or show success notification
  }, []);

  // Import Reviews handlers
  const handleImportReviews = useCallback(() => {
    setShowImportReviews(true);
  }, []);

  const handleCloseImportReviews = useCallback(() => {
    setShowImportReviews(false);
  }, []);

  // Submit import reviews request to Slack
  const handleSubmitImportReviews = useCallback(async (data) => {
    setIsImportingReviews(true);
    try {
      console.log('📥 Submitting import reviews request:', data);

      // Send to Slack via Edge Function
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
              name: currentUser?.firstName || currentUser?.name || 'Host',
              email: data.emailAddress,
              inquiry: `📥 **Import Reviews Request**\n\n**Listing ID:** ${data.listingId || 'N/A'}\n**Reviews URL:** ${data.reviewsUrl}\n**Requested by:** ${data.emailAddress}\n\nPlease import reviews from the above URL for this listing.`
            }
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit request');
      }

      console.log('✅ Import reviews request submitted successfully');
      alert('Your request has been submitted! Our team will import your reviews within 24-48 hours.');
      setShowImportReviews(false);
    } catch (err) {
      console.error('❌ Error submitting import reviews request:', err);
      alert('Failed to submit request. Please try again later.');
    } finally {
      setIsImportingReviews(false);
    }
  }, [currentUser]);

  // AI Import Assistant handlers
  const handleCloseAIImportAssistant = useCallback(() => {
    setShowAIImportAssistant(false);
  }, []);

  const handleAIImportComplete = useCallback((generatedData) => {
    console.log('✅ AI Import complete, refreshing listing data...');
    // Refresh listing data to show updated values
    const listingId = getListingIdFromUrl();
    if (listingId) {
      fetchListing(listingId);
    }
  }, [fetchListing, getListingIdFromUrl]);

  // Update listing in database and local state
  // NOTE: This is defined here (before handleStartAIGeneration) to avoid temporal dead zone issues
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

  /**
   * Start the AI generation process for all fields
   * This runs each generation task sequentially to show progress
   */
  const handleStartAIGeneration = useCallback(async () => {
    if (!listing) {
      console.error('❌ No listing data available for AI generation');
      return;
    }

    setIsAIGenerating(true);
    const listingId = getListingIdFromUrl();
    const generatedResults = {};

    try {
      console.log('🤖 Starting AI Import Assistant generation...');

      // Extract listing data for AI generation
      const listingData = {
        listingName: listing.title || '',
        address: `${listing.location?.city || ''}, ${listing.location?.state || ''}`,
        neighborhood: listing.location?.hoodsDisplay || '',
        typeOfSpace: listing.features?.typeOfSpace?.label || '',
        bedrooms: listing.features?.bedrooms ?? 0,
        beds: listing.features?.bedrooms ?? 0,
        bathrooms: listing.features?.bathrooms ?? 0,
        kitchenType: listing.features?.kitchenType?.display || '',
        amenitiesInsideUnit: listing.inUnitAmenities?.map(a => a.name) || [],
        amenitiesOutsideUnit: listing.buildingAmenities?.map(a => a.name) || [],
      };

      // 1. Generate Listing Name
      setAiGenerationStatus(prev => ({ ...prev, name: 'loading' }));
      try {
        const generatedName = await generateListingTitle(listingData);
        if (generatedName) {
          generatedResults.name = generatedName;
          await updateListing(listingId, { Name: generatedName });
        }
        setAiGenerationStatus(prev => ({ ...prev, name: 'complete' }));
      } catch (err) {
        console.error('❌ Error generating name:', err);
        setAiGenerationStatus(prev => ({ ...prev, name: 'complete' }));
      }

      // 2. Generate Description
      setAiGenerationStatus(prev => ({ ...prev, description: 'loading' }));
      try {
        const generatedDescription = await generateListingDescription(listingData);
        if (generatedDescription) {
          generatedResults.description = generatedDescription;
          await updateListing(listingId, { Description: generatedDescription });
        }
        setAiGenerationStatus(prev => ({ ...prev, description: 'complete' }));
      } catch (err) {
        console.error('❌ Error generating description:', err);
        setAiGenerationStatus(prev => ({ ...prev, description: 'complete' }));
      }

      // 3. Load Neighborhood Description
      setAiGenerationStatus(prev => ({ ...prev, neighborhood: 'loading' }));
      try {
        const zipCode = listing.location?.zipCode;
        if (zipCode) {
          const neighborhood = await getNeighborhoodByZipCode(zipCode);
          if (neighborhood && neighborhood.description) {
            generatedResults.neighborhood = neighborhood.description;
            generatedResults.neighborhoodName = neighborhood.neighborhoodName;
            await updateListing(listingId, { 'Description - Neighborhood': neighborhood.description });
          }
        }
        setAiGenerationStatus(prev => ({ ...prev, neighborhood: 'complete' }));
      } catch (err) {
        console.error('❌ Error loading neighborhood:', err);
        setAiGenerationStatus(prev => ({ ...prev, neighborhood: 'complete' }));
      }

      // 4. Load Common In-Unit Amenities
      setAiGenerationStatus(prev => ({ ...prev, inUnitAmenities: 'loading' }));
      try {
        const commonAmenities = await getCommonInUnitAmenities();
        if (commonAmenities.length > 0) {
          const currentAmenities = listing.inUnitAmenities?.map(a => a.name) || [];
          const newAmenities = [...new Set([...currentAmenities, ...commonAmenities])];
          generatedResults.inUnitAmenities = newAmenities;
          generatedResults.inUnitAmenitiesCount = commonAmenities.length;
          await updateListing(listingId, { 'Features - Amenities In-Unit': newAmenities });
        }
        setAiGenerationStatus(prev => ({ ...prev, inUnitAmenities: 'complete' }));
      } catch (err) {
        console.error('❌ Error loading in-unit amenities:', err);
        setAiGenerationStatus(prev => ({ ...prev, inUnitAmenities: 'complete' }));
      }

      // 5. Load Common Building Amenities
      setAiGenerationStatus(prev => ({ ...prev, buildingAmenities: 'loading' }));
      try {
        const commonAmenities = await getCommonBuildingAmenities();
        if (commonAmenities.length > 0) {
          const currentAmenities = listing.buildingAmenities?.map(a => a.name) || [];
          const newAmenities = [...new Set([...currentAmenities, ...commonAmenities])];
          generatedResults.buildingAmenities = newAmenities;
          generatedResults.buildingAmenitiesCount = commonAmenities.length;
          await updateListing(listingId, { 'Features - Amenities In-Building': newAmenities });
        }
        setAiGenerationStatus(prev => ({ ...prev, buildingAmenities: 'complete' }));
      } catch (err) {
        console.error('❌ Error loading building amenities:', err);
        setAiGenerationStatus(prev => ({ ...prev, buildingAmenities: 'complete' }));
      }

      // 6. Load Common House Rules
      setAiGenerationStatus(prev => ({ ...prev, houseRules: 'loading' }));
      try {
        const commonRules = await getCommonHouseRules();
        if (commonRules.length > 0) {
          const currentRules = listing.houseRules?.map(r => r.name) || [];
          const newRules = [...new Set([...currentRules, ...commonRules])];
          generatedResults.houseRules = newRules;
          generatedResults.houseRulesCount = commonRules.length;
          await updateListing(listingId, { 'Features - House Rules': newRules });
        }
        setAiGenerationStatus(prev => ({ ...prev, houseRules: 'complete' }));
      } catch (err) {
        console.error('❌ Error loading house rules:', err);
        setAiGenerationStatus(prev => ({ ...prev, houseRules: 'complete' }));
      }

      // 7. Load Common Safety Features
      setAiGenerationStatus(prev => ({ ...prev, safetyFeatures: 'loading' }));
      try {
        const commonFeatures = await getCommonSafetyFeatures();
        if (commonFeatures.length > 0) {
          const currentFeatures = listing.safetyFeatures?.map(s => s.name) || [];
          const newFeatures = [...new Set([...currentFeatures, ...commonFeatures])];
          generatedResults.safetyFeatures = newFeatures;
          generatedResults.safetyFeaturesCount = commonFeatures.length;
          await updateListing(listingId, { 'Features - Safety': newFeatures });
        }
        setAiGenerationStatus(prev => ({ ...prev, safetyFeatures: 'complete' }));
      } catch (err) {
        console.error('❌ Error loading safety features:', err);
        setAiGenerationStatus(prev => ({ ...prev, safetyFeatures: 'complete' }));
      }

      console.log('✅ AI Import Assistant generation complete:', generatedResults);
      setAiGeneratedData(generatedResults);
      setIsAIComplete(true);
    } catch (err) {
      console.error('❌ AI generation error:', err);
    } finally {
      setIsAIGenerating(false);
    }
  }, [listing, getListingIdFromUrl, updateListing]);

  // Photo management handlers
  const handleSetCoverPhoto = useCallback(async (photoId) => {
    if (!listing || !photoId) return;

    console.log('⭐ Setting cover photo:', photoId);

    // Find the photo to set as cover
    const photoIndex = listing.photos.findIndex(p => p.id === photoId);
    if (photoIndex === -1 || photoIndex === 0) {
      console.log('Photo not found or already first');
      return;
    }

    // Create new photos array with selected photo first
    const newPhotos = [...listing.photos];
    const [selectedPhoto] = newPhotos.splice(photoIndex, 1);
    selectedPhoto.isCover = true;

    // Reset isCover on other photos
    newPhotos.forEach(p => { p.isCover = false; });

    // Put selected photo at the beginning
    newPhotos.unshift(selectedPhoto);

    // Update local state immediately for responsive UI
    setListing(prev => ({
      ...prev,
      photos: newPhotos,
    }));

    // Persist to database
    try {
      const listingId = getListingIdFromUrl();

      // Check if this is a listing_trial
      const { data: trialCheck } = await supabase
        .from('listing_trial')
        .select('id')
        .eq('id', listingId)
        .maybeSingle();

      if (trialCheck) {
        // For listing_trial, update the inline 'Features - Photos' JSON
        const photosJson = newPhotos.map((p, idx) => ({
          url: p.url,
          isCover: idx === 0,
          type: p.photoType || 'Other',
          sortOrder: idx,
        }));

        await supabase
          .from('listing_trial')
          .update({ 'Features - Photos': JSON.stringify(photosJson) })
          .eq('id', listingId);

        console.log('✅ Cover photo updated in listing_trial');
      } else {
        // For regular listing, update the listing_photo table
        // First, reset all photos' toggleMainPhoto to false
        await supabase
          .from('listing_photo')
          .update({ toggleMainPhoto: false })
          .eq('Listing', listingId);

        // Set the selected photo as cover
        await supabase
          .from('listing_photo')
          .update({ toggleMainPhoto: true, SortOrder: 0 })
          .eq('_id', photoId);

        // Update sort order for other photos
        for (let i = 0; i < newPhotos.length; i++) {
          if (newPhotos[i].id !== photoId) {
            await supabase
              .from('listing_photo')
              .update({ SortOrder: i })
              .eq('_id', newPhotos[i].id);
          }
        }

        console.log('✅ Cover photo updated in listing_photo table');
      }
    } catch (err) {
      console.error('❌ Error updating cover photo:', err);
      // Revert local state on error
      fetchListing(getListingIdFromUrl());
    }
  }, [listing, getListingIdFromUrl, fetchListing]);

  const handleReorderPhotos = useCallback(async (fromIndex, toIndex) => {
    if (!listing || fromIndex === toIndex) return;

    console.log('🔀 Reordering photos:', fromIndex, '→', toIndex);

    // Create new photos array with reordered items
    const newPhotos = [...listing.photos];
    const [movedPhoto] = newPhotos.splice(fromIndex, 1);
    newPhotos.splice(toIndex, 0, movedPhoto);

    // Update isCover - first photo is always cover
    newPhotos.forEach((p, idx) => {
      p.isCover = idx === 0;
    });

    // Update local state immediately for responsive UI
    setListing(prev => ({
      ...prev,
      photos: newPhotos,
    }));

    // Persist to database
    try {
      const listingId = getListingIdFromUrl();

      // Check if this is a listing_trial
      const { data: trialCheck } = await supabase
        .from('listing_trial')
        .select('id')
        .eq('id', listingId)
        .maybeSingle();

      if (trialCheck) {
        // For listing_trial, update the inline 'Features - Photos' JSON
        const photosJson = newPhotos.map((p, idx) => ({
          url: p.url,
          isCover: idx === 0,
          type: p.photoType || 'Other',
          sortOrder: idx,
        }));

        await supabase
          .from('listing_trial')
          .update({ 'Features - Photos': JSON.stringify(photosJson) })
          .eq('id', listingId);

        console.log('✅ Photos reordered in listing_trial');
      } else {
        // For regular listing, update the listing_photo table sort orders
        for (let i = 0; i < newPhotos.length; i++) {
          await supabase
            .from('listing_photo')
            .update({
              SortOrder: i,
              toggleMainPhoto: i === 0,
            })
            .eq('_id', newPhotos[i].id);
        }

        console.log('✅ Photos reordered in listing_photo table');
      }
    } catch (err) {
      console.error('❌ Error reordering photos:', err);
      // Revert local state on error
      fetchListing(getListingIdFromUrl());
    }
  }, [listing, getListingIdFromUrl, fetchListing]);

  const handleDeletePhoto = useCallback(async (photoId) => {
    if (!listing || !photoId) return;

    console.log('🗑️ Deleting photo:', photoId);

    // Find the photo to delete
    const photoIndex = listing.photos.findIndex(p => p.id === photoId);
    if (photoIndex === -1) {
      console.log('Photo not found');
      return;
    }

    // Create new photos array without the deleted photo
    const newPhotos = listing.photos.filter(p => p.id !== photoId);

    // If we deleted the cover photo, make the first remaining photo the cover
    if (newPhotos.length > 0 && listing.photos[photoIndex].isCover) {
      newPhotos[0].isCover = true;
    }

    // Update local state immediately for responsive UI
    setListing(prev => ({
      ...prev,
      photos: newPhotos,
    }));

    // Persist to database
    try {
      const listingId = getListingIdFromUrl();

      // Check if this is a listing_trial
      const { data: trialCheck } = await supabase
        .from('listing_trial')
        .select('id')
        .eq('id', listingId)
        .maybeSingle();

      if (trialCheck) {
        // For listing_trial, update the inline 'Features - Photos' JSON
        const photosJson = newPhotos.map((p, idx) => ({
          url: p.url,
          isCover: idx === 0,
          type: p.photoType || 'Other',
          sortOrder: idx,
        }));

        await supabase
          .from('listing_trial')
          .update({ 'Features - Photos': JSON.stringify(photosJson) })
          .eq('id', listingId);

        console.log('✅ Photo deleted from listing_trial');
      } else {
        // For regular listing, soft-delete by setting Active to false
        await supabase
          .from('listing_photo')
          .update({ Active: false })
          .eq('_id', photoId);

        // If this was the cover photo, set the first remaining photo as cover
        if (newPhotos.length > 0 && listing.photos[photoIndex].isCover) {
          await supabase
            .from('listing_photo')
            .update({ toggleMainPhoto: true })
            .eq('_id', newPhotos[0].id);
        }

        console.log('✅ Photo deleted from listing_photo table');
      }
    } catch (err) {
      console.error('❌ Error deleting photo:', err);
      // Revert local state on error
      fetchListing(getListingIdFromUrl());
    }
  }, [listing, getListingIdFromUrl, fetchListing]);

  // Edit modal handlers
  const handleEditSection = useCallback((section) => {
    setEditSection(section);
  }, []);

  const handleCloseEdit = useCallback(() => {
    setEditSection(null);
  }, []);

  // Handle save from edit modal - update local state
  const handleSaveEdit = useCallback((updatedData) => {
    // Refresh listing data after save
    const listingId = getListingIdFromUrl();
    if (listingId) {
      fetchListing(listingId);
    }
  }, [fetchListing, getListingIdFromUrl]);

  // Handle blocked dates change - save to database
  const handleBlockedDatesChange = useCallback(async (newBlockedDates) => {
    const listingId = getListingIdFromUrl();
    if (!listingId) {
      console.error('❌ No listing ID found for blocked dates update');
      return;
    }

    console.log('📅 Saving blocked dates:', newBlockedDates);

    try {
      // Update the database with the new blocked dates
      await updateListing(listingId, {
        'Dates - Blocked': JSON.stringify(newBlockedDates),
      });

      // Update local state
      setListing((prev) => ({
        ...prev,
        blockedDates: newBlockedDates,
      }));

      console.log('✅ Blocked dates saved successfully');
    } catch (error) {
      console.error('❌ Failed to save blocked dates:', error);
    }
  }, [getListingIdFromUrl, updateListing]);

  return {
    // State
    activeTab,
    listing,
    counts,
    isLoading,
    error,
    editSection,
    showScheduleCohost,
    showImportReviews,
    currentUser,

    // Handlers
    handleTabChange,
    handleCardClick,
    handleBackClick,
    handleDescriptionChange,
    handleCancellationPolicyChange,
    handleCopyLink,
    handleAIAssistant,

    // Schedule Cohost handlers
    handleScheduleCohost,
    handleCloseScheduleCohost,
    handleCohostRequestSubmitted,

    // Import Reviews handlers
    handleImportReviews,
    handleCloseImportReviews,
    handleSubmitImportReviews,
    isImportingReviews,

    // AI Import Assistant handlers
    showAIImportAssistant,
    handleCloseAIImportAssistant,
    handleAIImportComplete,
    handleStartAIGeneration,
    aiGenerationStatus,
    isAIGenerating,
    isAIComplete,
    aiGeneratedData,

    // Photo management handlers
    handleSetCoverPhoto,
    handleDeletePhoto,
    handleReorderPhotos,

    // Edit modal handlers
    handleEditSection,
    handleCloseEdit,
    handleSaveEdit,
    updateListing,

    // Blocked dates handler
    handleBlockedDatesChange,
  };
}
