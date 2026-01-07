import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { checkAuthStatus, validateTokenAndFetchUser, getFirstName, getAvatarUrl } from '../../../lib/auth';
import { getUserId } from '../../../lib/secureStorage';
import { generateListingDescription, generateListingTitle } from '../../../lib/aiService';
import { getCommonHouseRules } from '../../shared/EditListingDetails/services/houseRulesService';
import { getCommonSafetyFeatures } from '../../shared/EditListingDetails/services/safetyFeaturesService';
import { getCommonInUnitAmenities, getCommonBuildingAmenities } from '../../shared/EditListingDetails/services/amenitiesService';
import { getNeighborhoodByZipCode, getNeighborhoodByName } from '../../shared/EditListingDetails/services/neighborhoodService';
import { generateNeighborhoodDescription } from '../../../lib/aiService';
import { getBoroughForZipCode } from '../../../lib/nycZipCodes';

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
        // Index by both ID and Name to support both lookup patterns
        lookups.amenities[a._id] = { name: a.Name, icon: a.Icon };
        lookups.amenities[a.Name] = { name: a.Name, icon: a.Icon };
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
      .schema('reference_table')
      .from('zat_features_houserule')
      .select('_id, "Name", "Icon"');
    if (rules) {
      rules.forEach((r) => {
        // Normalize protocol-relative URLs (//...) to https://
        const icon = r.Icon && r.Icon.startsWith('//') ? 'https:' + r.Icon : r.Icon;
        // Index by both ID and Name to support both lookup patterns
        lookups.houseRules[r._id] = { name: r.Name, icon };
        lookups.houseRules[r.Name] = { name: r.Name, icon };
      });
    }

    // Fetch listing types (Label has trailing space in column name)
    const { data: types } = await supabase
      .schema('reference_table')
      .from('zat_features_listingtype')
      .select('_id, "Label ", "Icon"');
    if (types) {
      types.forEach((t) => {
        lookups.listingTypes[t._id] = { name: t['Label '], icon: t.Icon };
      });
    }

    // Fetch parking options
    const { data: parking } = await supabase
      .schema('reference_table')
      .from('zat_features_parkingoptions')
      .select('_id, "Label"');
    if (parking) {
      parking.forEach((p) => {
        lookups.parkingOptions[p._id] = { name: p.Label };
      });
    }

    // Fetch storage options
    const { data: storage } = await supabase
      .schema('reference_table')
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
 */
function transformListingData(dbListing, photos = [], lookups = {}) {
  if (!dbListing) return null;

  const listingId = dbListing._id;

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

  // Parse available days (database now stores 0-6 JS format natively)
  const availableDays = safeParseJsonArray(dbListing['Days Available (List of Days)']).map(day => {
    // Database uses 0-6 (JS standard: 0=Sunday through 6=Saturday)
    const numDay = typeof day === 'number' ? day : parseInt(day, 10);
    return numDay; // Already 0-indexed
  });

  // Convert day indices to night IDs for HostScheduleSelector
  // Database now uses 0=Sunday, 1=Monday... 6=Saturday (JS standard)
  const NIGHT_IDS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const nightsAvailable = safeParseJsonArray(dbListing['Days Available (List of Days)']).map(day => {
    const numDay = typeof day === 'number' ? day : parseInt(day, 10);
    // Day indices use 0-indexed array directly
    return NIGHT_IDS[numDay];
  }).filter(Boolean);

  return {
    id: listingId,
    _id: listingId, // Alias for compatibility with EditListingDetails modal

    // Property Info
    title: dbListing.Name || 'Untitled Listing',
    description: dbListing.Description || '',
    descriptionNeighborhood: dbListing['Description - Neighborhood'] || '',

    // Raw DB fields for EditListingDetails modal compatibility
    Name: dbListing.Name || '',
    Description: dbListing.Description || '',
    'Description - Neighborhood': dbListing['Description - Neighborhood'] || '',
    'Location - City': dbListing['Location - City'] || '',
    'Location - State': dbListing['Location - State'] || '',
    'Location - Zip Code': dbListing['Location - Zip Code'] || '',
    'Location - Borough': dbListing['Location - Borough'] || '',
    'Location - Hood': dbListing['Location - Hood'] || '',
    'Features - Type of Space': dbListing['Features - Type of Space'] || '',
    'Features - Qty Bedrooms': dbListing['Features - Qty Bedrooms'] || 0,
    'Features - Qty Bathrooms': dbListing['Features - Qty Bathrooms'] || 0,
    'Features - Qty Beds': dbListing['Features - Qty Beds'] || 0,
    'Features - Qty Guests': dbListing['Features - Qty Guests'] || 1,
    'Features - SQFT Area': dbListing['Features - SQFT Area'] || 0,
    'Features - SQFT of Room': dbListing['Features - SQFT of Room'] || 0,
    'Kitchen Type': dbListing['Kitchen Type'] || '',
    'Features - Parking type': dbListing['Features - Parking type'] || '',
    'Features - Secure Storage Option': dbListing['Features - Secure Storage Option'] || '',
    'Features - House Rules': dbListing['Features - House Rules'] || [],
    'Features - Photos': dbListing['Features - Photos'] || [],
    'Features - Amenities In-Unit': dbListing['Features - Amenities In-Unit'] || [],
    'Features - Amenities In-Building': dbListing['Features - Amenities In-Building'] || [],
    'Features - Safety': dbListing['Features - Safety'] || [],
    'First Available': dbListing[' First Available'] || '',
    'Minimum Nights': dbListing['Minimum Nights'] || 2,
    'Maximum Nights': dbListing['Maximum Nights'] || 7,
    'Cancellation Policy': dbListing['Cancellation Policy'] || '',

    // Location
    location: {
      id: listingId,
      address: locationAddress.address || dbListing['Not Found - Location - Address '] || '',
      hoodsDisplay: dbListing['Location - Hood'] || '',
      // Resolve borough display name from zip code (since DB stores FK ID)
      boroughDisplay: getBoroughForZipCode(dbListing['Location - Zip Code']) || '',
      city: dbListing['Location - City'] || '',
      state: dbListing['Location - State'] || '',
      zipCode: dbListing['Location - Zip Code'] || '',
      latitude: locationAddress.lat || null,
      longitude: locationAddress.lng || null,
    },

    // Status
    status: dbListing.Active ? 'Online' : 'Offline',
    isOnline: dbListing.Active || false,
    isApproved: dbListing.Approved || false,
    isComplete: dbListing.Complete || false,
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
      squareFootage: dbListing['Features - SQFT Area'] || 0,
      squareFootageRoom: dbListing['Features - SQFT of Room'] || 0,
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
      1: dbListing['💰Nightly Host Rate for 1 night'] || 0,
      2: dbListing['💰Nightly Host Rate for 2 nights'] || 0,
      3: dbListing['💰Nightly Host Rate for 3 nights'] || 0,
      4: dbListing['💰Nightly Host Rate for 4 nights'] || 0,
      5: dbListing['💰Nightly Host Rate for 5 nights'] || 0,
      6: dbListing['💰Nightly Host Rate for 5 nights'] || 0, // Use 5-night rate for 6
      7: dbListing['💰Nightly Host Rate for 7 nights'] || 0,
    },

    weeklyCompensation: {
      1: (dbListing['💰Nightly Host Rate for 1 night'] || 0) * 1,
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
    weeklyHostRate: dbListing['💰Weekly Host Rate'] || 0,
    weeksOffered: dbListing['Weeks offered'] || '',

    // Availability
    leaseTermMin: dbListing['Minimum Weeks'] || 6,
    leaseTermMax: dbListing['Maximum Weeks'] || 52,
    earliestAvailableDate: dbListing[' First Available'] ? new Date(dbListing[' First Available']) : new Date(),
    checkInTime: dbListing['NEW Date Check-in Time'] || '1:00 pm',
    checkOutTime: dbListing['NEW Date Check-out Time'] || '1:00 pm',
    // Normalize blocked dates to YYYY-MM-DD format (handles both ISO timestamps and plain dates)
    blockedDates: safeParseJsonArray(dbListing['Dates - Blocked']).map(dateStr => {
      if (typeof dateStr === 'string') {
        // Extract YYYY-MM-DD from ISO timestamp or return as-is if already YYYY-MM-DD
        return dateStr.split('T')[0];
      }
      return dateStr;
    }),

    // Cancellation Policy
    cancellationPolicy: dbListing['Cancellation Policy'] || 'Standard',
    cancellationPolicyAdditionalRestrictions: dbListing['Cancellation Policy - Additional Restrictions'] || '',

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
  const [counts, setCounts] = useState({ proposals: 0, virtualMeetings: 0, leases: 0, reviews: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Edit modal state
  const [editSection, setEditSection] = useState(null); // null = closed, or section name
  const [editFocusField, setEditFocusField] = useState(null); // Optional field to focus/scroll to in modal

  // Get listing ID from URL - support both 'id' and 'listing_id' params
  const getListingIdFromUrl = useCallback(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('id') || params.get('listing_id');
  }, []);

  // Fetch listing data from Supabase
  // When silent=true, don't show loading state (used for background refreshes after edits)
  const fetchListing = useCallback(async (listingId, { silent = false } = {}) => {
    if (!silent) {
      setIsLoading(true);
    }
    setError(null);

    try {
      console.log('🔍 Fetching listing:', listingId);

      // Fetch from listing table
      const listingResult = await supabase
        .from('listing')
        .select('*')
        .eq('_id', listingId)
        .maybeSingle();

      if (listingResult.error) {
        throw new Error(`Failed to fetch listing: ${listingResult.error.message}`);
      }

      const listingData = listingResult.data;

      if (!listingData) {
        throw new Error('Listing not found');
      }

      console.log('✅ Found listing:', listingData._id);

      // Fetch lookup tables and related data in parallel
      const [lookups, photosResult, proposalsResult, leasesResult, meetingsResult, reviewsResult] = await Promise.all([
        fetchLookupTables(),
        supabase.from('listing_photo').select('*').eq('Listing', listingId).eq('Active', true).order('SortOrder', { ascending: true }),
        supabase.from('proposal').select('*', { count: 'exact', head: true }).eq('Listing', listingId),
        supabase.from('bookings_leases').select('*', { count: 'exact', head: true }).eq('Listing', listingId),
        supabase.from('virtualmeetingschedulesandlinks').select('*', { count: 'exact', head: true }).eq('Listing', listingId),
        supabase.from('external_reviews').select('*', { count: 'exact', head: true }).eq('listing_id', listingId),
      ]);

      // Extract photos - check if embedded in Features - Photos or in listing_photo table
      let photos = [];
      const inlinePhotos = safeParseJsonArray(listingData['Features - Photos']);

      if (inlinePhotos.length > 0) {
        // Features - Photos can contain either:
        // 1. Array of objects: [{url: "...", isCover: true}, ...]
        // 2. Array of URL strings: ["https://...", "https://..."]
        const firstItem = inlinePhotos[0];
        const isObjectArray = typeof firstItem === 'object' && firstItem !== null;

        photos = inlinePhotos.map((photo, index) => {
          // Handle both string URLs and object formats
          const photoUrl = isObjectArray
            ? (photo.url || photo.Photo || photo.URL || String(photo))
            : String(photo);

          return {
            _id: isObjectArray ? (photo.id || `inline_${index}`) : `inline_${index}`,
            Photo: photoUrl,
            URL: photoUrl,
            toggleMainPhoto: isObjectArray ? (photo.toggleMainPhoto ?? photo.isCover ?? (index === 0)) : (index === 0),
            Type: isObjectArray ? (photo.type || photo.Type || 'Other') : 'Other',
            SortOrder: isObjectArray ? (photo.SortOrder ?? photo.sortOrder ?? index) : index,
            Active: true,
          };
        });
        console.log('📷 Embedded photos from Features - Photos:', photos.length, isObjectArray ? '(objects)' : '(URLs)');
      } else {
        // Legacy: fetch from listing_photo table
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

      const { count: reviewsCount, error: reviewsError } = reviewsResult;
      if (reviewsError) {
        console.warn('⚠️ Failed to fetch reviews count:', reviewsError);
      }

      const transformedListing = transformListingData(listingData, photos || [], lookups);

      setListing(transformedListing);
      setCounts({
        proposals: proposalsCount || 0,
        virtualMeetings: meetingsCount || 0,
        leases: leasesCount || 0,
        reviews: reviewsCount || 0,
      });

      console.log('✅ Listing loaded successfully');

      // Fetch existing cohost request for this listing
      try {
        const { data: cohostRequest, error: cohostError } = await supabase
          .from('co_hostrequest')
          .select('*')
          .eq('Listing', listingId)
          .order('"Created Date"', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (cohostError) {
          console.warn('⚠️ Failed to fetch cohost request:', cohostError);
        } else if (cohostRequest) {
          console.log('📋 Found existing cohost request:', cohostRequest._id);
          setExistingCohostRequest(cohostRequest);
        }
      } catch (cohostErr) {
        console.warn('⚠️ Error fetching cohost request:', cohostErr);
      }
    } catch (err) {
      console.error('❌ Error fetching listing:', err);
      if (!silent) {
        setError(err.message || 'Failed to load listing');
      }
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  }, []);

  // Initialize on mount
  useEffect(() => {
    const listingId = getListingIdFromUrl();
    if (listingId) {
      fetchListing(listingId);
    } else {
      // No listing ID provided - show error
      console.error('❌ No listing ID in URL');
      setError('No listing ID provided. Please access this page from your listings.');
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

  // Copy link handler - defined before handleCardClick so it can be used in the switch
  const handleCopyLink = useCallback(async () => {
    if (!listing?.id) {
      window.showToast?.({
        title: 'Error',
        content: 'No listing ID available',
        type: 'error'
      });
      return;
    }

    const listingUrl = `${window.location.origin}/view-split-lease/${listing.id}`;

    try {
      // Modern Clipboard API (preferred)
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(listingUrl);
      } else {
        // Fallback for older browsers or non-secure contexts
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
      console.error('Failed to copy link:', err);
      window.showToast?.({
        title: 'Copy Failed',
        content: 'Unable to copy link to clipboard',
        type: 'error'
      });
    }
  }, [listing?.id]);

  // Action card click handler
  const handleCardClick = useCallback((cardId) => {
    switch (cardId) {
      case 'preview':
        if (listing) {
          window.open(`/preview-split-lease.html?id=${listing.id}`, '_blank');
        }
        break;
      case 'copy-link':
        handleCopyLink();
        break;
      case 'proposals':
        // Navigate to host proposals page filtered to this listing
        if (listing) {
          window.location.href = `/host-proposals?listingId=${listing.id}`;
        }
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
  }, [listing, handleCopyLink]);

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
  const [existingCohostRequest, setExistingCohostRequest] = useState(null);

  // Auth state (Gold Standard pattern)
  const [authState, setAuthState] = useState({
    isChecking: true,
    shouldRedirect: false
  });

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

  // Track which fields were modified by AI for highlighting
  const [highlightedFields, setHighlightedFields] = useState(new Set());

  // ============================================================================
  // GOLD STANDARD AUTH PATTERN - Fetch current user data with fallback
  // ============================================================================
  useEffect(() => {
    const fetchUser = async () => {
      try {
        // Step 1: Quick auth check
        const isAuthenticated = await checkAuthStatus();

        if (!isAuthenticated) {
          console.log('[ListingDashboard] User not authenticated, redirecting to home');
          setAuthState({ isChecking: false, shouldRedirect: true });
          setTimeout(() => {
            window.location.href = '/?login=true';
          }, 100);
          return;
        }

        // Step 2: Deep validation with clearOnFailure: false
        const userData = await validateTokenAndFetchUser({ clearOnFailure: false });

        if (userData) {
          // Success path: Use validated user data
          setCurrentUser(userData);
          setAuthState({ isChecking: false, shouldRedirect: false });
          console.log('[ListingDashboard] User data loaded:', userData['Name - First'] || userData.firstName);
        } else {
          // Step 3: Fallback to Supabase session metadata
          const { data: { session } } = await supabase.auth.getSession();

          if (session?.user) {
            // Session valid but profile fetch failed - use session metadata
            const fallbackUser = {
              _id: session.user.user_metadata?.user_id || getUserId() || session.user.id,
              id: session.user.id,
              'Name - First': session.user.user_metadata?.first_name || getFirstName() || session.user.email?.split('@')[0] || 'Host',
              'Name - Last': session.user.user_metadata?.last_name || '',
              email: session.user.email,
              firstName: session.user.user_metadata?.first_name || getFirstName() || session.user.email?.split('@')[0] || 'Host',
              lastName: session.user.user_metadata?.last_name || ''
            };
            setCurrentUser(fallbackUser);
            setAuthState({ isChecking: false, shouldRedirect: false });
            console.log('[ListingDashboard] Using fallback user data from session:', fallbackUser.firstName);
          } else {
            // No valid session - redirect
            console.log('[ListingDashboard] No valid session, redirecting');
            setAuthState({ isChecking: false, shouldRedirect: true });
            setTimeout(() => {
              window.location.href = '/?login=true';
            }, 100);
          }
        }
      } catch (err) {
        console.warn('[ListingDashboard] Could not fetch user data:', err);
        setAuthState({ isChecking: false, shouldRedirect: false });
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

  const handleCohostRequestSubmitted = useCallback((requestData) => {
    console.log('✅ Co-host request submitted:', requestData);
    // Store the request so UI shows tracking view on next open
    if (requestData) {
      setExistingCohostRequest({
        _id: requestData.requestId || requestData._id,
        status: 'pending',
        createdAt: requestData.createdAt || new Date().toISOString(),
        ...requestData,
      });
    }
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
    console.log('✅ AI Import complete, updating local state instantly...');
    console.log('📋 Generated data:', generatedData);

    // Build set of changed fields for highlighting
    const changedFields = new Set();

    // Update listing state instantly with generated data
    setListing(prev => {
      if (!prev) return prev;

      const updates = { ...prev };

      // Update title if generated
      if (generatedData.name && generatedData.name !== prev.title) {
        updates.title = generatedData.name;
        updates.Name = generatedData.name;
        changedFields.add('name');
      }

      // Update description if generated
      if (generatedData.description && generatedData.description !== prev.description) {
        updates.description = generatedData.description;
        updates.Description = generatedData.description;
        changedFields.add('description');
      }

      // Update neighborhood description if generated
      if (generatedData.neighborhood && generatedData.neighborhood !== prev.descriptionNeighborhood) {
        updates.descriptionNeighborhood = generatedData.neighborhood;
        updates['Description - Neighborhood'] = generatedData.neighborhood;
        changedFields.add('neighborhood');
      }

      // Mark amenities/rules/safety as changed if counts > 0
      if (generatedData.inUnitAmenitiesCount > 0 || generatedData.buildingAmenitiesCount > 0) {
        changedFields.add('amenities');
      }
      if (generatedData.houseRulesCount > 0) {
        changedFields.add('rules');
      }
      if (generatedData.safetyFeaturesCount > 0) {
        changedFields.add('safety');
      }

      return updates;
    });

    // Set highlighted fields for visual feedback
    setHighlightedFields(changedFields);
    console.log('✨ Highlighting changed fields:', [...changedFields]);

    // Auto-clear highlights after 8 seconds
    setTimeout(() => {
      setHighlightedFields(new Set());
    }, 8000);

    // Silent background refresh to sync any related data (like resolved amenity names)
    const listingId = getListingIdFromUrl();
    if (listingId) {
      // Small delay to let state update complete first
      setTimeout(() => {
        fetchListing(listingId);
      }, 500);
    }
  }, [fetchListing, getListingIdFromUrl]);

  // Update listing in database and local state
  // NOTE: This is defined here (before handleStartAIGeneration) to avoid temporal dead zone issues
  const updateListing = useCallback(async (listingId, updates) => {
    console.log('📝 Updating listing:', listingId, updates);

    // Map UI field names to database column names (handles quirky column names with leading spaces)
    const fieldMapping = {
      'First Available': ' First Available', // DB column has leading space
    };

    // Transform updates to use correct database column names
    const dbUpdates = {};
    for (const [key, value] of Object.entries(updates)) {
      const dbColumnName = fieldMapping[key] || key;
      dbUpdates[dbColumnName] = value;
    }

    console.log(`📋 Updating listing table with _id=${listingId}`);
    console.log('📋 DB updates:', dbUpdates);

    // Perform the update without .select() to avoid 409 conflicts from PostgREST
    // The .select().maybeSingle() pattern can fail when:
    // 1. Multiple concurrent updates occur (React StrictMode double-mounting)
    // 2. PostgREST has timing issues between UPDATE and SELECT
    const { error: updateError } = await supabase
      .from('listing')
      .update(dbUpdates)
      .eq('_id', listingId);

    if (updateError) {
      console.error('❌ Error updating listing:', updateError);
      console.error('❌ Error code:', updateError.code);
      console.error('❌ Error message:', updateError.message);
      console.error('❌ Error details:', updateError.details);
      console.error('❌ Error hint:', updateError.hint);
      console.error('❌ Full error object:', JSON.stringify(updateError, null, 2));
      throw updateError;
    }

    // Fetch the updated row separately for reliable data retrieval
    const { data, error: fetchError } = await supabase
      .from('listing')
      .select('*')
      .eq('_id', listingId)
      .maybeSingle();

    if (fetchError) {
      console.warn('⚠️ Update succeeded but failed to fetch updated data:', fetchError);
      // Return partial data - the update still succeeded
      return { _id: listingId, ...dbUpdates };
    }

    console.log('✅ Listing updated:', data);
    return data;
  }, []);

  // Cancellation policy change handler - saves policy ID to database
  const handleCancellationPolicyChange = useCallback(async (policyId) => {
    const listingId = getListingIdFromUrl();
    if (!listingId) {
      console.error('❌ No listing ID found for cancellation policy update');
      return;
    }

    console.log('📋 Updating cancellation policy to:', policyId);

    try {
      await updateListing(listingId, {
        'Cancellation Policy': policyId,
      });

      // Update local state
      setListing((prev) => ({
        ...prev,
        cancellationPolicy: policyId,
        'Cancellation Policy': policyId,
      }));

      console.log('✅ Cancellation policy saved successfully');
    } catch (error) {
      console.error('❌ Failed to save cancellation policy:', error);
    }
  }, [getListingIdFromUrl, updateListing]);

  // Cancellation policy additional restrictions change handler
  const handleCancellationRestrictionsChange = useCallback(async (restrictionsText) => {
    const listingId = getListingIdFromUrl();
    if (!listingId) {
      console.error('❌ No listing ID found for cancellation restrictions update');
      return;
    }

    console.log('📋 Updating cancellation restrictions:', restrictionsText);

    try {
      await updateListing(listingId, {
        'Cancellation Policy - Additional Restrictions': restrictionsText,
      });

      // Update local state
      setListing((prev) => ({
        ...prev,
        cancellationPolicyAdditionalRestrictions: restrictionsText,
        'Cancellation Policy - Additional Restrictions': restrictionsText,
      }));

      console.log('✅ Cancellation restrictions saved successfully');
    } catch (error) {
      console.error('❌ Failed to save cancellation restrictions:', error);
    }
  }, [getListingIdFromUrl, updateListing]);

  /**
   * Start the AI generation process for all fields
   * This runs each generation task sequentially to show progress
   *
   * IMPORTANT: Order matters! We first load all data (amenities, neighborhood, rules, safety)
   * THEN generate the title and description so they have full context for better results.
   */
  const handleStartAIGeneration = useCallback(async () => {
    if (!listing) {
      console.error('❌ No listing data available for AI generation');
      return;
    }

    setIsAIGenerating(true);
    const listingId = getListingIdFromUrl();
    const generatedResults = {};

    // Track enriched data as we load it - this will be used for AI title/description generation
    const enrichedAmenities = {
      inUnit: listing.inUnitAmenities?.map(a => a.name) || [],
      building: listing.buildingAmenities?.map(a => a.name) || [],
    };
    let enrichedNeighborhood = listing.location?.hoodsDisplay || '';

    try {
      console.log('🤖 Starting AI Import Assistant generation...');
      console.log('📋 Step 1: Loading common features and data first...');

      // ========================================
      // PHASE 1: Load all data first (so AI has full context)
      // ========================================

      // 1. Load Common In-Unit Amenities
      setAiGenerationStatus(prev => ({ ...prev, inUnitAmenities: 'loading' }));
      try {
        const commonAmenities = await getCommonInUnitAmenities();
        if (commonAmenities.length > 0) {
          const currentAmenities = listing.inUnitAmenities?.map(a => a.name) || [];
          const newAmenities = [...new Set([...currentAmenities, ...commonAmenities])];
          enrichedAmenities.inUnit = newAmenities;
          generatedResults.inUnitAmenities = newAmenities;
          generatedResults.inUnitAmenitiesCount = commonAmenities.length;
          await updateListing(listingId, { 'Features - Amenities In-Unit': newAmenities });
        }
        setAiGenerationStatus(prev => ({ ...prev, inUnitAmenities: 'complete' }));
      } catch (err) {
        console.error('❌ Error loading in-unit amenities:', err);
        setAiGenerationStatus(prev => ({ ...prev, inUnitAmenities: 'complete' }));
      }

      // 2. Load Common Building Amenities
      setAiGenerationStatus(prev => ({ ...prev, buildingAmenities: 'loading' }));
      try {
        const commonAmenities = await getCommonBuildingAmenities();
        if (commonAmenities.length > 0) {
          const currentAmenities = listing.buildingAmenities?.map(a => a.name) || [];
          const newAmenities = [...new Set([...currentAmenities, ...commonAmenities])];
          enrichedAmenities.building = newAmenities;
          generatedResults.buildingAmenities = newAmenities;
          generatedResults.buildingAmenitiesCount = commonAmenities.length;
          await updateListing(listingId, { 'Features - Amenities In-Building': newAmenities });
        }
        setAiGenerationStatus(prev => ({ ...prev, buildingAmenities: 'complete' }));
      } catch (err) {
        console.error('❌ Error loading building amenities:', err);
        setAiGenerationStatus(prev => ({ ...prev, buildingAmenities: 'complete' }));
      }

      // 3. Load Neighborhood Description (cascade: Name → ZIP → AI)
      setAiGenerationStatus(prev => ({ ...prev, neighborhood: 'loading' }));
      try {
        let neighborhoodResult = null;

        // First, try by neighborhood name (Location - Hood)
        const hoodName = listing.location?.hoodsDisplay;
        if (hoodName) {
          console.log('🏘️ Trying neighborhood lookup by name:', hoodName);
          neighborhoodResult = await getNeighborhoodByName(hoodName);
          if (neighborhoodResult?.description) {
            console.log('✅ Found neighborhood by name:', hoodName);
          }
        }

        // Second, fallback to ZIP code lookup
        if (!neighborhoodResult?.description) {
          const zipCode = listing.location?.zipCode;
          if (zipCode) {
            console.log('🏘️ Trying neighborhood lookup by ZIP:', zipCode);
            neighborhoodResult = await getNeighborhoodByZipCode(zipCode);
            if (neighborhoodResult?.description) {
              console.log('✅ Found neighborhood by ZIP:', zipCode);
            }
          }
        }

        // Third, fallback to AI generation
        if (!neighborhoodResult?.description) {
          console.log('🏘️ No database match, trying AI generation...');
          const addressData = {
            fullAddress: listing.location?.address || '',
            city: listing.location?.city || '',
            state: listing.location?.state || '',
            zip: listing.location?.zipCode || '',
          };

          if (addressData.city || addressData.fullAddress) {
            const aiDescription = await generateNeighborhoodDescription(addressData);
            if (aiDescription) {
              neighborhoodResult = {
                description: aiDescription,
                neighborhoodName: hoodName || '',
              };
              console.log('✅ Generated neighborhood via AI');
            }
          }
        }

        // Save result if we have one
        if (neighborhoodResult?.description) {
          generatedResults.neighborhood = neighborhoodResult.description;
          generatedResults.neighborhoodName = neighborhoodResult.neighborhoodName;
          enrichedNeighborhood = neighborhoodResult.neighborhoodName || enrichedNeighborhood;
          await updateListing(listingId, { 'Description - Neighborhood': neighborhoodResult.description });
        } else {
          console.warn('⚠️ No neighborhood description found via any method');
        }

        setAiGenerationStatus(prev => ({ ...prev, neighborhood: 'complete' }));
      } catch (err) {
        console.error('❌ Error loading neighborhood:', err);
        setAiGenerationStatus(prev => ({ ...prev, neighborhood: 'complete' }));
      }

      // 4. Load Common House Rules
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

      // 5. Load Common Safety Features
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

      // ========================================
      // PHASE 2: Generate AI content with enriched data
      // ========================================

      console.log('📋 Step 2: Generating AI content with enriched data...');

      // Build enriched listing data for AI generation (using all loaded amenities)
      const enrichedListingData = {
        listingName: listing.title || '',
        address: `${listing.location?.city || ''}, ${listing.location?.state || ''}`,
        neighborhood: enrichedNeighborhood,
        typeOfSpace: listing.features?.typeOfSpace?.label || '',
        bedrooms: listing.features?.bedrooms ?? 0,
        beds: listing.features?.bedrooms ?? 0,
        bathrooms: listing.features?.bathrooms ?? 0,
        kitchenType: listing.features?.kitchenType?.display || '',
        amenitiesInsideUnit: enrichedAmenities.inUnit,
        amenitiesOutsideUnit: enrichedAmenities.building,
      };

      console.log('🤖 Generating AI content with enriched data:', enrichedListingData);

      // 6. Generate Description (uses AI - better with full amenities)
      setAiGenerationStatus(prev => ({ ...prev, description: 'loading' }));
      try {
        const generatedDescription = await generateListingDescription(enrichedListingData);
        if (generatedDescription) {
          generatedResults.description = generatedDescription;
          await updateListing(listingId, { Description: generatedDescription });
        }
        setAiGenerationStatus(prev => ({ ...prev, description: 'complete' }));
      } catch (err) {
        console.error('❌ Error generating description:', err);
        setAiGenerationStatus(prev => ({ ...prev, description: 'complete' }));
      }

      // 7. Generate Listing Name (uses AI - better with full context)
      setAiGenerationStatus(prev => ({ ...prev, name: 'loading' }));
      try {
        const generatedName = await generateListingTitle(enrichedListingData);
        if (generatedName) {
          generatedResults.name = generatedName;
          await updateListing(listingId, { Name: generatedName });
        }
        setAiGenerationStatus(prev => ({ ...prev, name: 'complete' }));
      } catch (err) {
        console.error('❌ Error generating name:', err);
        setAiGenerationStatus(prev => ({ ...prev, name: 'complete' }));
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

      // Update the listing_photo table
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

      // Update the listing_photo table sort orders
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

      // Soft-delete by setting Active to false
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
    } catch (err) {
      console.error('❌ Error deleting photo:', err);
      // Revert local state on error
      fetchListing(getListingIdFromUrl());
    }
  }, [listing, getListingIdFromUrl, fetchListing]);

  // Edit modal handlers
  const handleEditSection = useCallback((section, focusField = null) => {
    setEditSection(section);
    setEditFocusField(focusField);
  }, []);

  const handleCloseEdit = useCallback(() => {
    setEditSection(null);
    setEditFocusField(null);
    // Silently refresh listing data after modal closes to sync any saved changes
    const listingId = getListingIdFromUrl();
    if (listingId) {
      fetchListing(listingId, { silent: true });
    }
  }, [fetchListing, getListingIdFromUrl]);

  // Handle save from edit modal - data is already saved to database
  // Update local state to reflect the changes immediately
  const handleSaveEdit = useCallback((updatedData) => {
    // Update local listing state with the saved data
    if (updatedData && typeof updatedData === 'object') {
      setListing((prev) => {
        if (!prev) return prev;

        // Map the raw DB field names back to transformed property names
        const updates = { ...prev };

        // Update Name/title
        if (updatedData.Name !== undefined) {
          updates.title = updatedData.Name;
          updates.Name = updatedData.Name;
        }

        // Update Description
        if (updatedData.Description !== undefined) {
          updates.description = updatedData.Description;
          updates.Description = updatedData.Description;
        }

        // Update other fields as needed
        if (updatedData['Description - Neighborhood'] !== undefined) {
          updates.descriptionNeighborhood = updatedData['Description - Neighborhood'];
          updates['Description - Neighborhood'] = updatedData['Description - Neighborhood'];
        }

        return updates;
      });
    }
  }, []);

  // Handle availability field changes - save to database
  const handleAvailabilityChange = useCallback(async (fieldName, value) => {
    const listingId = getListingIdFromUrl();
    if (!listingId) {
      window.showToast?.({
        title: 'Error',
        content: 'No listing ID available',
        type: 'error'
      });
      return;
    }

    try {
      // Map UI field names to database column names
      const fieldMapping = {
        'checkInTime': 'NEW Date Check-in Time',
        'checkOutTime': 'NEW Date Check-out Time',
        'earliestAvailableDate': ' First Available', // DB column has leading space
        'leaseTermMin': 'Minimum Weeks',
        'leaseTermMax': 'Maximum Weeks'
      };

      const dbFieldName = fieldMapping[fieldName];
      if (!dbFieldName) {
        console.error('Unknown availability field:', fieldName);
        return;
      }

      await updateListing(listingId, { [dbFieldName]: value });

      // Update local state
      setListing((prev) => ({
        ...prev,
        [fieldName]: value
      }));

      window.showToast?.({
        title: 'Changes Saved',
        content: 'Availability settings updated successfully',
        type: 'success'
      });
    } catch (error) {
      console.error('Failed to save availability field:', error);
      window.showToast?.({
        title: 'Save Failed',
        content: 'Could not save changes. Please try again.',
        type: 'error'
      });
    }
  }, [getListingIdFromUrl, updateListing]);

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
    // Auth state
    authState,

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
    existingCohostRequest,

    // Handlers
    handleTabChange,
    handleCardClick,
    handleBackClick,
    handleDescriptionChange,
    handleCancellationPolicyChange,
    handleCancellationRestrictionsChange,
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
    highlightedFields,

    // Photo management handlers
    handleSetCoverPhoto,
    handleDeletePhoto,
    handleReorderPhotos,

    // Edit modal handlers
    handleEditSection,
    handleCloseEdit,
    handleSaveEdit,
    updateListing,
    editFocusField,

    // Blocked dates handler
    handleBlockedDatesChange,

    // Availability fields handler
    handleAvailabilityChange,
  };
}
