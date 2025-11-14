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
  getParkingOption
} from './dataLookups.js';

/**
 * Fetch complete listing data with all enrichments
 * @param {string} listingId - The listing _id
 * @returns {Promise<object>} Enriched listing object
 */
export async function fetchListingComplete(listingId) {
  try {
    // 1. Fetch main listing data
    const { data: listingData, error: listingError } = await supabase
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
    if (!listingData) throw new Error('Listing not found');

    // 2. Fetch photos
    const { data: photosData, error: photosError } = await supabase
      .from('listing_photo')
      .select('_id, Photo, "Photo (thumbnail)", SortOrder, toggleMainPhoto, Caption')
      .eq('Listing', listingId)
      .order('SortOrder', { ascending: true, nullsLast: true });

    if (photosError) console.error('Photos fetch error:', photosError);

    // 3. Sort photos (main photo first, then by SortOrder, then by _id)
    const sortedPhotos = (photosData || []).sort((a, b) => {
      if (a.toggleMainPhoto) return -1;
      if (b.toggleMainPhoto) return 1;
      if (a.SortOrder !== null && b.SortOrder === null) return -1;
      if (a.SortOrder === null && b.SortOrder !== null) return 1;
      if (a.SortOrder !== null && b.SortOrder !== null) {
        return a.SortOrder - b.SortOrder;
      }
      return a._id.localeCompare(b._id);
    });

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

    // 6. Resolve amenities (JSONB arrays)
    const amenitiesInUnit = listingData['Features - Amenities In-Unit']
      ? getAmenities(listingData['Features - Amenities In-Unit'])
      : [];

    const amenitiesInBuilding = listingData['Features - Amenities In-Building']
      ? getAmenities(listingData['Features - Amenities In-Building'])
      : [];

    const safetyFeatures = listingData['Features - Safety']
      ? getSafetyFeatures(listingData['Features - Safety'])
      : [];

    const houseRules = listingData['Features - House Rules']
      ? getHouseRules(listingData['Features - House Rules'])
      : [];

    // 7. Resolve parking option
    const parkingOption = listingData['Features - Parking type']
      ? getParkingOption(listingData['Features - Parking type'])
      : null;

    // 8. Fetch host data
    let hostData = null;
    if (listingData['Host / Landlord']) {
      // First get the account_host record to find the linked User
      const { data: accountHost, error: accountHostError } = await supabase
        .from('account_host')
        .select('_id, User')
        .eq('_id', listingData['Host / Landlord'])
        .single();

      if (accountHostError) {
        console.error('Account host fetch error:', accountHostError);
      } else if (accountHost?.User) {
        // Then fetch the user data using the User foreign key
        const { data: userData, error: userError } = await supabase
          .from('user')
          .select('"Name - First", "Name - Last", "Profile Photo", "email as text"')
          .eq('_id', accountHost.User)
          .single();

        if (userError) {
          console.error('User fetch error:', userError);
        } else if (userData) {
          // Combine the data for backward compatibility
          hostData = {
            _id: accountHost._id,
            'Name - First': userData['Name - First'],
            'Name - Last': userData['Name - Last'],
            'Profile Photo': userData['Profile Photo'],
            Email: userData['email as text']
          };
        }
      }
    }

    // 9. Fetch reviews if any
    let reviewsData = [];
    if (listingData.Reviews && Array.isArray(listingData.Reviews) && listingData.Reviews.length > 0) {
      const { data: reviews, error: reviewsError } = await supabase
        .from('mainreview')
        .select('_id, Comment, "Overall Score", Reviewer, "Created Date", "Is Published?"')
        .in('_id', listingData.Reviews)
        .eq('Is Published?', true)
        .order('"Created Date"', { ascending: false });

      if (reviewsError) {
        console.error('Reviews fetch error:', reviewsError);
      } else {
        reviewsData = reviews || [];
      }
    }

    // 10. Extract coordinates from "Location - Address" JSONB field
    let coordinates = null;
    let locationAddress = listingData['Location - Address'];

    // Parse if it's a string
    if (typeof locationAddress === 'string') {
      try {
        locationAddress = JSON.parse(locationAddress);
      } catch (error) {
        console.error('Failed to parse Location - Address:', error);
        locationAddress = null;
      }
    }

    // Extract lat/lng if available
    if (locationAddress?.lat && locationAddress?.lng) {
      coordinates = {
        lat: locationAddress.lat,
        lng: locationAddress.lng
      };
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
 * @returns {string|null} Listing ID or null
 */
export function getListingIdFromUrl() {
  // 1. Check query string: ?id=listingId
  const urlParams = new URLSearchParams(window.location.search);
  const idFromQuery = urlParams.get('id');
  if (idFromQuery) return idFromQuery;

  // 2. Parse pathname for segment after 'view-split-lease'
  const pathSegments = window.location.pathname.split('/').filter(segment => segment);
  const viewSegmentIndex = pathSegments.findIndex(segment =>
    segment === 'view-split-lease' ||
    segment === 'view-split-lease.html' ||
    segment === 'view-split-lease-1'
  );

  if (viewSegmentIndex !== -1 && pathSegments[viewSegmentIndex + 1]) {
    const nextSegment = pathSegments[viewSegmentIndex + 1];
    if (!nextSegment.includes('.')) {
      return nextSegment;
    }
  }

  // 3. Fallback: Check if first segment matches listing ID pattern
  if (pathSegments.length > 0) {
    const firstSegment = pathSegments[0];
    if (/^\d+x\d+$/.test(firstSegment)) {
      return firstSegment;
    }
  }

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
