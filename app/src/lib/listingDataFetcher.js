/**
 * Listing Data Fetcher
 * Comprehensive data fetching for view-split-lease page
 * Handles all joins, lookups, and data enrichment
 *
 * Usage:
 *   import { fetchListingComplete } from './listingDataFetcher.js';
 *   const listing = await fetchListingComplete(listingId);
 */

import { supabase } from './supabase.js';
import {
  getNeighborhoodName,
  getBoroughName,
  getPropertyTypeLabel,
  getAmenities,
  getSafetyFeatures,
  getHouseRules,
  getParkingOption,
  getCancellationPolicy,
  getStorageOption
} from './dataLookups.js';

/**
 * Parse JSONB field that may be double-encoded as JSON string
 * Handles both native arrays and JSON-stringified arrays from Supabase
 * @param {any} field - JSONB field value from Supabase
 * @returns {Array} Parsed array or empty array
 */
function parseJsonField(field) {
  // Already null/undefined
  if (!field) return [];

  // Already an array (direct JSONB array)
  if (Array.isArray(field)) return field;

  // String that needs parsing (double-encoded JSONB)
  if (typeof field === 'string') {
    try {
      const parsed = JSON.parse(field);
      // Ensure result is array
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error('Failed to parse JSONB field:', field, e);
      return [];
    }
  }

  // Unexpected type
  console.warn('Unexpected JSONB field type:', typeof field, field);
  return [];
}

/**
 * Fetch complete listing data with all enrichments
 * Supports both listing table (Bubble) and listing_trial table (self-listing)
 * @param {string} listingId - The listing _id or id (for listing_trial)
 * @returns {Promise<object>} Enriched listing object
 */
export async function fetchListingComplete(listingId) {
  try {
    // 1. Try listing_trial first (for self-listing submissions), then fall back to listing table
    console.log('🔍 fetchListingComplete: Trying listing_trial table first with id=' + listingId);

    const { data: trialData, error: trialError } = await supabase
      .from('listing_trial')
      .select('*')
      .eq('id', listingId)
      .maybeSingle();

    let listingData = null;
    let isListingTrial = false;

    if (trialData) {
      console.log('✅ Found listing in listing_trial table');
      listingData = trialData;
      isListingTrial = true;
      // Map listing_trial fields to standard listing format for compatibility
      // listing_trial uses 'id' as UUID, listing uses '_id' as Bubble ID
      listingData._id = listingData.id;
    } else {
      // Fall back to listing table
      console.log('📋 Not found in listing_trial, trying listing table with _id=' + listingId);
      const { data: mainListingData, error: listingError } = await supabase
        .from('listing')
        .select(`
          _id,
          Name,
          Description,
          "Description - Neighborhood",
          "Features - Qty Bedrooms",
          "Features - Qty Bathrooms",
          "Features - Qty Beds",
          "Features - Qty Guests",
          "Features - SQFT Area",
          "Kitchen Type",
          "Features - Type of Space",
          "Features - Amenities In-Unit",
          "Features - Amenities In-Building",
          "Features - Safety",
          "Features - House Rules",
          "Features - Parking type",
          "Features - Secure Storage Option",
          "Features - Trial Periods Allowed",
          "Features - Photos",
          "Location - Address",
          "Location - slightly different address",
          "Location - Hood",
          "Location - Borough",
          "neighborhood (manual input by user)",
          "Time to Station (commute)",
          "Map HTML Web",
          "💰Nightly Host Rate for 2 nights",
          "💰Nightly Host Rate for 3 nights",
          "💰Nightly Host Rate for 4 nights",
          "💰Nightly Host Rate for 5 nights",
          "💰Nightly Host Rate for 7 nights",
          "💰Weekly Host Rate",
          "💰Monthly Host Rate",
          "💰Damage Deposit",
          "💰Cleaning Cost / Maintenance Fee",
          "💰Price Override",
          "Days Available (List of Days)",
          "Nights Available (List of Nights) ",
          "Days Not Available",
          "Nights Not Available",
          "Dates - Blocked",
          " First Available",
          "Last Available",
          "Minimum Nights",
          "Maximum Nights",
          "Minimum Weeks",
          "Maximum Weeks",
          "Minimum Months",
          "Maximum Months",
          "Weeks offered",
          "rental type",
          "💰Unit Markup",
          "NEW Date Check-in Time",
          "NEW Date Check-out Time",
          "Host / Landlord",
          "host name",
          "host restrictions",
          "Cancellation Policy",
          "video tour",
          "Reviews",
          Active,
          Complete,
          "Preferred Gender",
          "allow alternating roommates?"
        `)
        .eq('_id', listingId)
        .single();

      if (listingError) throw listingError;
      if (!mainListingData) throw new Error('Listing not found in either listing_trial or listing table');

      listingData = mainListingData;
    }

    if (!listingData) throw new Error('Listing not found');

    // 2. Fetch photos - handle differently for listing_trial vs listing
    let sortedPhotos = [];

    if (isListingTrial) {
      // For listing_trial, photos are stored inline in 'Features - Photos' JSON column
      const inlinePhotos = parseJsonField(listingData['Features - Photos']);
      sortedPhotos = inlinePhotos.map((photo, index) => ({
        _id: photo.id || `inline_${index}`,
        Photo: photo.Photo || photo.url || photo,
        'Photo (thumbnail)': photo['Photo (thumbnail)'] || photo.Photo || photo.url || photo,
        toggleMainPhoto: photo.toggleMainPhoto ?? photo.isCover ?? (index === 0),
        SortOrder: photo.SortOrder ?? photo.sortOrder ?? photo.displayOrder ?? index,
        Caption: photo.caption || photo.Caption || ''
      }));
      // Sort by SortOrder
      sortedPhotos.sort((a, b) => {
        if (a.toggleMainPhoto) return -1;
        if (b.toggleMainPhoto) return 1;
        return (a.SortOrder ?? 0) - (b.SortOrder ?? 0);
      });
      console.log('📷 Inline photos from listing_trial:', sortedPhotos.length);
    } else {
      // For listing, first check if photos are embedded in Features - Photos (new format)
      const embeddedPhotos = parseJsonField(listingData['Features - Photos']);
      const hasEmbeddedObjects = embeddedPhotos.length > 0 &&
        typeof embeddedPhotos[0] === 'object' &&
        embeddedPhotos[0] !== null;

      if (hasEmbeddedObjects) {
        // New format: photos are embedded objects with URLs
        sortedPhotos = embeddedPhotos.map((photo, index) => ({
          _id: photo.id || `embedded_${index}`,
          Photo: photo.Photo || photo.url || '',
          'Photo (thumbnail)': photo['Photo (thumbnail)'] || photo.Photo || photo.url || '',
          toggleMainPhoto: photo.toggleMainPhoto ?? (index === 0),
          SortOrder: photo.SortOrder ?? photo.displayOrder ?? index,
          Caption: photo.caption || photo.Caption || ''
        }));
        console.log('📷 Embedded photos from Features - Photos:', sortedPhotos.length);
      } else {
        // Legacy: fetch from listing_photo table
        const { data: photosData, error: photosError } = await supabase
          .from('listing_photo')
          .select('_id, Photo, "Photo (thumbnail)", SortOrder, toggleMainPhoto, Caption')
          .eq('Listing', listingId)
          .order('SortOrder', { ascending: true, nullsLast: true });

        if (photosError) console.error('Photos fetch error:', photosError);
        sortedPhotos = photosData || [];
        console.log('📷 Photos from listing_photo table:', sortedPhotos.length);
      }

      // Sort photos (main photo first, then by SortOrder, then by _id)
      sortedPhotos = sortedPhotos.sort((a, b) => {
        if (a.toggleMainPhoto) return -1;
        if (b.toggleMainPhoto) return 1;
        if (a.SortOrder !== null && b.SortOrder === null) return -1;
        if (a.SortOrder === null && b.SortOrder !== null) return 1;
        if (a.SortOrder !== null && b.SortOrder !== null) {
          return a.SortOrder - b.SortOrder;
        }
        return (a._id || '').localeCompare(b._id || '');
      });
    }

    // 4. Resolve geographic data
    const resolvedNeighborhood = listingData['Location - Hood']
      ? getNeighborhoodName(listingData['Location - Hood'])
      : null;

    const resolvedBorough = listingData['Location - Borough']
      ? getBoroughName(listingData['Location - Borough'])
      : null;

    // 5. Resolve property type
    const resolvedTypeOfSpace = listingData['Features - Type of Space']
      ? getPropertyTypeLabel(listingData['Features - Type of Space'])
      : null;

    // 6. Resolve amenities (JSONB arrays) - with double-encoding fix
    const amenitiesInUnit = listingData['Features - Amenities In-Unit']
      ? getAmenities(parseJsonField(listingData['Features - Amenities In-Unit']))
      : [];

    const amenitiesInBuilding = listingData['Features - Amenities In-Building']
      ? getAmenities(parseJsonField(listingData['Features - Amenities In-Building']))
      : [];

    const safetyFeatures = listingData['Features - Safety']
      ? getSafetyFeatures(parseJsonField(listingData['Features - Safety']))
      : [];

    const houseRules = listingData['Features - House Rules']
      ? getHouseRules(parseJsonField(listingData['Features - House Rules']))
      : [];

    // 7. Resolve parking option
    const parkingOption = listingData['Features - Parking type']
      ? getParkingOption(listingData['Features - Parking type'])
      : null;

    // 7a. Resolve cancellation policy
    const cancellationPolicy = listingData['Cancellation Policy']
      ? getCancellationPolicy(listingData['Cancellation Policy'])
      : null;

    // 7b. Resolve storage option
    const storageOption = listingData['Features - Secure Storage Option']
      ? getStorageOption(listingData['Features - Secure Storage Option'])
      : null;

    // 8. Fetch host data - query user table via Account - Host / Landlord FK
    // NOTE: Listings should have Host / Landlord = user["Account - Host / Landlord"] (the host account ID)
    // However, some older self-listings may have Host / Landlord = user._id (legacy bug, now fixed)
    // We try the correct lookup first, then fallback to direct user._id lookup for compatibility
    let hostData = null;
    if (listingData['Host / Landlord']) {
      const hostLandlordValue = listingData['Host / Landlord'];

      // First try: Correct lookup - Host / Landlord should equal user["Account - Host / Landlord"]
      const { data: userData, error: userError } = await supabase
        .from('user')
        .select('_id, "Name - First", "Name - Last", "Profile Photo", "email as text", "Account - Host / Landlord"')
        .filter('"Account - Host / Landlord"', 'eq', hostLandlordValue)
        .maybeSingle();

      if (userError) {
        console.error('User fetch error (by host account):', userError);
      }

      if (userData) {
        hostData = {
          _id: userData['Account - Host / Landlord'],
          'Name - First': userData['Name - First'],
          'Name - Last': userData['Name - Last'],
          'Profile Photo': userData['Profile Photo'],
          Email: userData['email as text']
        };
        console.log('📍 Host found via Account - Host / Landlord lookup');
      } else {
        // Fallback: Legacy listings may have Host / Landlord = user._id (the bug we fixed)
        // Try looking up user directly by _id
        console.log('📍 Host not found via Account - Host / Landlord, trying direct _id lookup...');
        const { data: fallbackUser, error: fallbackError } = await supabase
          .from('user')
          .select('_id, "Name - First", "Name - Last", "Profile Photo", "email as text", "Account - Host / Landlord"')
          .eq('_id', hostLandlordValue)
          .maybeSingle();

        if (fallbackError) {
          console.error('User fetch error (by _id fallback):', fallbackError);
        } else if (fallbackUser) {
          hostData = {
            _id: fallbackUser['Account - Host / Landlord'] || fallbackUser._id,
            'Name - First': fallbackUser['Name - First'],
            'Name - Last': fallbackUser['Name - Last'],
            'Profile Photo': fallbackUser['Profile Photo'],
            Email: fallbackUser['email as text']
          };
          console.log('📍 Host found via _id fallback (legacy listing data)');
        }
      }
    }

    // 9. Fetch reviews if any - with double-encoding fix
    let reviewsData = [];
    const reviewIds = parseJsonField(listingData.Reviews);
    if (reviewIds.length > 0) {
      const { data: reviews, error: reviewsError } = await supabase
        .from('mainreview')
        .select('_id, Comment, "Overall Score", Reviewer, "Created Date", "Is Published?"')
        .in('_id', reviewIds)
        .eq('Is Published?', true)
        .order('"Created Date"', { ascending: false });

      if (reviewsError) {
        console.error('Reviews fetch error:', reviewsError);
      } else {
        reviewsData = reviews || [];
      }
    }

    // 10. Extract coordinates from "Location - slightly different address" JSONB field
    // Fallback to "Location - Address" if slightly different is not available
    let coordinates = null;
    let locationSlightlyDifferent = listingData['Location - slightly different address'];
    let locationAddress = listingData['Location - Address'];

    // Parse slightly different address if it's a string
    if (typeof locationSlightlyDifferent === 'string') {
      try {
        locationSlightlyDifferent = JSON.parse(locationSlightlyDifferent);
      } catch (error) {
        console.error('Failed to parse Location - slightly different address:', error);
        locationSlightlyDifferent = null;
      }
    }

    // Parse regular address if it's a string
    if (typeof locationAddress === 'string') {
      try {
        locationAddress = JSON.parse(locationAddress);
      } catch (error) {
        console.error('Failed to parse Location - Address:', error);
        locationAddress = null;
      }
    }

    // Extract lat/lng - prefer slightly different address, fallback to regular address
    if (locationSlightlyDifferent?.lat && locationSlightlyDifferent?.lng) {
      coordinates = {
        lat: locationSlightlyDifferent.lat,
        lng: locationSlightlyDifferent.lng,
        address: locationSlightlyDifferent.address || null
      };
      console.log('📍 Using "Location - slightly different address" for coordinates:', coordinates);
    } else if (locationAddress?.lat && locationAddress?.lng) {
      // Generate slightly offset coordinates from the main address
      // Offset by ~50-100 meters (approximately 0.0005 to 0.001 degrees)
      const latOffset = (Math.random() - 0.5) * 0.001;
      const lngOffset = (Math.random() - 0.5) * 0.001;

      coordinates = {
        lat: locationAddress.lat + latOffset,
        lng: locationAddress.lng + lngOffset,
        address: locationAddress.address || null,
        isGenerated: true
      };
      console.log('📍 Generated slightly different coordinates from "Location - Address":', {
        original: { lat: locationAddress.lat, lng: locationAddress.lng },
        offset: { lat: latOffset, lng: lngOffset },
        generated: coordinates
      });
    } else {
      console.warn('⚠️ No valid coordinates found in listing data');
    }

    // 11. Return enriched listing
    return {
      ...listingData,
      photos: sortedPhotos,
      resolvedNeighborhood,
      resolvedBorough,
      resolvedTypeOfSpace,
      amenitiesInUnit,
      amenitiesInBuilding,
      safetyFeatures,
      houseRules,
      parkingOption,
      cancellationPolicy,
      storageOption,
      host: hostData,
      reviews: reviewsData,
      coordinates
    };

  } catch (error) {
    console.error('Error fetching listing data:', error);
    throw error;
  }
}

/**
 * Parse listing ID from URL
 * Supports multiple URL formats:
 * - ?id=listingId
 * - /view-split-lease/listingId
 * - /view-split-lease.html/listingId
 * - /preview-split-lease/listingId
 * - /preview-split-lease.html/listingId
 * @returns {string|null} Listing ID or null
 */
export function getListingIdFromUrl() {
  // Debug logging
  console.log('🔍 [getListingIdFromUrl] Current URL:', window.location.href);
  console.log('🔍 [getListingIdFromUrl] Pathname:', window.location.pathname);
  console.log('🔍 [getListingIdFromUrl] Search:', window.location.search);

  // 1. Check query string: ?id=listingId
  const urlParams = new URLSearchParams(window.location.search);
  const idFromQuery = urlParams.get('id');
  if (idFromQuery) {
    console.log('✅ [getListingIdFromUrl] Found ID in query string:', idFromQuery);
    return idFromQuery;
  }

  // 2. Parse pathname for segment after 'view-split-lease' or 'preview-split-lease'
  const pathSegments = window.location.pathname.split('/').filter(segment => segment);
  console.log('🔍 [getListingIdFromUrl] Path segments:', pathSegments);

  const viewSegmentIndex = pathSegments.findIndex(segment =>
    segment === 'view-split-lease' ||
    segment === 'view-split-lease.html' ||
    segment === 'view-split-lease-1' ||
    segment === 'preview-split-lease' ||
    segment === 'preview-split-lease.html'
  );
  console.log('🔍 [getListingIdFromUrl] View segment index:', viewSegmentIndex);

  if (viewSegmentIndex !== -1 && pathSegments[viewSegmentIndex + 1]) {
    const nextSegment = pathSegments[viewSegmentIndex + 1];
    console.log('🔍 [getListingIdFromUrl] Next segment after view-split-lease:', nextSegment);
    if (!nextSegment.includes('.')) {
      console.log('✅ [getListingIdFromUrl] Found ID in path:', nextSegment);
      return nextSegment;
    }
  }

  // 3. Fallback: Check if first segment matches listing ID pattern
  if (pathSegments.length > 0) {
    const firstSegment = pathSegments[0];
    if (/^\d+x\d+$/.test(firstSegment)) {
      console.log('✅ [getListingIdFromUrl] Found ID as first segment:', firstSegment);
      return firstSegment;
    }
  }

  console.error('❌ [getListingIdFromUrl] No listing ID found in URL');
  return null;
}

/**
 * Calculate standardized nightly price based on selected nights
 * @param {object} listing - Listing object with price fields
 * @param {number} nightsSelected - Number of nights selected (2-7)
 * @returns {number|null} Nightly price or null
 */
export function getNightlyPrice(listing, nightsSelected) {
  const priceMap = {
    2: listing['💰Nightly Host Rate for 2 nights'],
    3: listing['💰Nightly Host Rate for 3 nights'],
    4: listing['💰Nightly Host Rate for 4 nights'],
    5: listing['💰Nightly Host Rate for 5 nights'],
    7: listing['💰Nightly Host Rate for 7 nights']
  };

  // Use price override if available
  if (listing['💰Price Override']) {
    return listing['💰Price Override'];
  }

  // Return price for exact nights match
  if (priceMap[nightsSelected]) {
    return priceMap[nightsSelected];
  }

  // Fallback: use 4-night rate as default
  return priceMap[4] || null;
}

/**
 * Fetch basic listing data by ID (minimal data for quick loading)
 * @param {string} listingId - The listing _id
 * @returns {Promise<object>} Basic listing object with Name and other essential fields
 */
export async function fetchListingBasic(listingId) {
  console.log('📊 fetchListingBasic: Starting fetch for listing ID:', listingId);
  console.log('📊 Table to query: listing');

  try {
    console.log('📊 Calling Supabase...');
    const { data: listingData, error: listingError } = await supabase
      .from('listing')
      .select('_id, Name, Description, Active')
      .eq('_id', listingId)
      .single();

    console.log('📊 Supabase response - data:', listingData);
    console.log('📊 Supabase response - error:', listingError);

    if (listingError) {
      console.error('❌ Supabase error details:', JSON.stringify(listingError, null, 2));
      throw listingError;
    }
    if (!listingData) {
      console.error('❌ No listing data returned');
      throw new Error('Listing not found');
    }

    console.log('✅ fetchListingBasic: Successfully fetched listing');
    console.log('✅ Listing Name:', listingData.Name);
    return listingData;
  } catch (error) {
    console.error('❌ Error in fetchListingBasic:', error);
    console.error('❌ Error type:', error.constructor.name);
    console.error('❌ Error message:', error.message);
    console.error('❌ Full error:', JSON.stringify(error, null, 2));
    throw error;
  }
}

/**
 * Fetch ZAT price configuration (global pricing settings)
 * Cached for performance since it's a single row table
 * @returns {Promise<object>} ZAT price configuration object
 */
let zatConfigCache = null;
export async function fetchZatPriceConfiguration() {
  // Return cached version if available
  if (zatConfigCache) {
    return zatConfigCache;
  }

  try {
    const { data, error } = await supabase
      .schema('reference_table')
      .from('zat_priceconfiguration')
      .select(`
        "Overall Site Markup",
        "Weekly Markup",
        "full time (7 nights) Discount",
        "Unused Nights Discount Multiplier",
        "Avg days per month",
        "Min Price per night",
        "Max Price per night"
      `)
      .limit(1)
      .single();

    if (error) throw error;
    if (!data) throw new Error('ZAT price configuration not found');

    // Cache the result
    zatConfigCache = {
      overallSiteMarkup: parseFloat(data['Overall Site Markup']) || 0,
      weeklyMarkup: parseFloat(data['Weekly Markup']) || 0,
      fullTimeDiscount: parseFloat(data['full time (7 nights) Discount']) || 0,
      unusedNightsDiscountMultiplier: parseFloat(data['Unused Nights Discount Multiplier']) || 0,
      avgDaysPerMonth: parseInt(data['Avg days per month']) || 31,
      minPricePerNight: parseFloat(data['Min Price per night']) || 0,
      maxPricePerNight: parseFloat(data['Max Price per night']) || 0
    };

    return zatConfigCache;
  } catch (error) {
    console.error('Error fetching ZAT price configuration:', error);
    // Return defaults if fetch fails
    return {
      overallSiteMarkup: 0.17,
      weeklyMarkup: 0,
      fullTimeDiscount: 0.13,
      unusedNightsDiscountMultiplier: 0.03,
      avgDaysPerMonth: 31,
      minPricePerNight: 100,
      maxPricePerNight: 1000
    };
  }
}
