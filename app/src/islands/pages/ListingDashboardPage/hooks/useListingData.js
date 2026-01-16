import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../../lib/supabase';
import { logger } from '../../../../lib/logger';
import { getBoroughForZipCode } from '../../../../lib/nycZipCodes';

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
      logger.warn('Failed to parse JSON array:', e);
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
        const icon = r.Icon && r.Icon.startsWith('//') ? 'https:' + r.Icon : r.Icon;
        lookups.houseRules[r._id] = { name: r.Name, icon };
        lookups.houseRules[r.Name] = { name: r.Name, icon };
      });
    }

    // Fetch listing types
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

    logger.debug('📚 Lookup tables loaded');
  } catch (err) {
    logger.warn('⚠️ Failed to fetch lookup tables:', err);
  }

  return lookups;
}

/**
 * Transform Supabase listing data to component-friendly format
 */
function transformListingData(dbListing, photos = [], lookups = {}) {
  if (!dbListing) return null;

  const listingId = dbListing._id;

  // Parse location address
  let locationAddress = {};
  try {
    if (typeof dbListing['Location - Address'] === 'string') {
      locationAddress = JSON.parse(dbListing['Location - Address']);
    } else if (dbListing['Location - Address']) {
      locationAddress = dbListing['Location - Address'];
    }
  } catch (e) {
    logger.warn('Failed to parse location address:', e);
  }

  // Transform amenities
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

  // Parse available days
  const availableDays = safeParseJsonArray(dbListing['Days Available (List of Days)']).map(day => {
    const numDay = typeof day === 'number' ? day : parseInt(day, 10);
    return numDay;
  });

  // Convert day indices to night IDs
  const NIGHT_IDS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const nightsAvailable = safeParseJsonArray(dbListing['Days Available (List of Days)']).map(day => {
    const numDay = typeof day === 'number' ? day : parseInt(day, 10);
    return NIGHT_IDS[numDay];
  }).filter(Boolean);

  return {
    id: listingId,
    _id: listingId,

    // Property Info
    title: dbListing.Name || 'Untitled Listing',
    description: dbListing.Description || '',
    descriptionNeighborhood: dbListing['Description - Neighborhood'] || '',

    // Raw DB fields for compatibility
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
    // DEBUG: Log rental type value
    ...((() => {
      console.log('🔍 DEBUG rental type raw value:', dbListing['rental type']);
      console.log('🔍 DEBUG rental type typeof:', typeof dbListing['rental type']);
      console.log('🔍 DEBUG all keys with rental:', Object.keys(dbListing).filter(k => k.toLowerCase().includes('rental')));
      return {};
    })()),
    leaseStyle: dbListing['rental type'] || 'Nightly',
    nightsPerWeekMin: dbListing['Minimum Nights'] || 2,
    nightsPerWeekMax: dbListing['Maximum Nights'] || 7,
    availableDays,
    nightsAvailable,

    pricing: {
      1: dbListing['💰Nightly Host Rate for 1 night'] || 0,
      2: dbListing['💰Nightly Host Rate for 2 nights'] || 0,
      3: dbListing['💰Nightly Host Rate for 3 nights'] || 0,
      4: dbListing['💰Nightly Host Rate for 4 nights'] || 0,
      5: dbListing['💰Nightly Host Rate for 5 nights'] || 0,
      6: dbListing['💰Nightly Host Rate for 5 nights'] || 0,
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
    blockedDates: safeParseJsonArray(dbListing['Dates - Blocked']).map(dateStr => {
      if (typeof dateStr === 'string') {
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
 * Hook for fetching and managing listing data
 * Handles data fetching, transformation, and related counts (proposals, meetings, etc.)
 */
export function useListingData(listingId) {
  const [listing, setListing] = useState(null);
  const [counts, setCounts] = useState({ proposals: 0, virtualMeetings: 0, leases: 0, reviews: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [existingCohostRequest, setExistingCohostRequest] = useState(null);

  const fetchListing = useCallback(async (silent = false) => {
    if (!listingId) {
      logger.error('❌ No listing ID provided to useListingData');
      setError('No listing ID provided. Please access this page from your listings.');
      setIsLoading(false);
      return;
    }

    if (!silent) {
      setIsLoading(true);
    }
    setError(null);

    try {
      logger.debug('🔍 Fetching listing:', listingId);

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

      logger.debug('✅ Found listing:', listingData._id);

      // Fetch lookup tables and related data in parallel
      const [lookups, photosResult, proposalsResult, leasesResult, meetingsResult, reviewsResult] = await Promise.all([
        fetchLookupTables(),
        supabase.from('listing_photo').select('*').eq('Listing', listingId).eq('Active', true).order('SortOrder', { ascending: true }),
        supabase.from('proposal').select('*', { count: 'exact', head: true }).eq('Listing', listingId),
        supabase.from('bookings_leases').select('*', { count: 'exact', head: true }).eq('Listing', listingId),
        supabase.from('virtualmeetingschedulesandlinks').select('*', { count: 'exact', head: true }).eq('Listing', listingId),
        supabase.from('external_reviews').select('*', { count: 'exact', head: true }).eq('listing_id', listingId),
      ]);

      // Extract photos
      let photos = [];
      const inlinePhotos = safeParseJsonArray(listingData['Features - Photos']);

      if (inlinePhotos.length > 0) {
        const firstItem = inlinePhotos[0];
        const isObjectArray = typeof firstItem === 'object' && firstItem !== null;

        photos = inlinePhotos.map((photo, index) => {
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
        logger.debug('📷 Embedded photos from Features - Photos:', photos.length);
      } else {
        const { data: photosData, error: photosError } = photosResult;
        if (photosError) {
          logger.warn('⚠️ Failed to fetch photos:', photosError);
        }
        photos = photosData || [];
        logger.debug('📷 Photos from listing_photo table:', photos.length);
      }

      const { count: proposalsCount, error: proposalsError } = proposalsResult;
      if (proposalsError) {
        logger.warn('⚠️ Failed to fetch proposals count:', proposalsError);
      }

      const { count: leasesCount, error: leasesError } = leasesResult;
      if (leasesError) {
        logger.warn('⚠️ Failed to fetch leases count:', leasesError);
      }

      const { count: meetingsCount, error: meetingsError } = meetingsResult;
      if (meetingsError) {
        logger.warn('⚠️ Failed to fetch meetings count:', meetingsError);
      }

      const { count: reviewsCount, error: reviewsError } = reviewsResult;
      if (reviewsError) {
        logger.warn('⚠️ Failed to fetch reviews count:', reviewsError);
      }

      const transformedListing = transformListingData(listingData, photos || [], lookups);

      setListing(transformedListing);
      setCounts({
        proposals: proposalsCount || 0,
        virtualMeetings: meetingsCount || 0,
        leases: leasesCount || 0,
        reviews: reviewsCount || 0,
      });

      logger.debug('✅ Listing loaded successfully');

      // Fetch existing cohost request
      try {
        const { data: cohostRequest, error: cohostError } = await supabase
          .from('co_hostrequest')
          .select('*')
          .eq('Listing', listingId)
          .order('"Created Date"', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (cohostError) {
          logger.warn('⚠️ Failed to fetch cohost request:', cohostError);
        } else if (cohostRequest) {
          logger.debug('📋 Found existing cohost request:', cohostRequest._id);
          setExistingCohostRequest(cohostRequest);
        }
      } catch (cohostErr) {
        logger.warn('⚠️ Error fetching cohost request:', cohostErr);
      }
    } catch (err) {
      logger.error('❌ Error fetching listing:', err);
      if (!silent) {
        setError(err.message || 'Failed to load listing');
      }
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  }, [listingId]);

  // Update listing function
  const updateListing = useCallback(async (updates) => {
    logger.debug('📝 Updating listing:', listingId, updates);

    const fieldMapping = {
      'First Available': ' First Available',
    };

    const dbUpdates = {};
    for (const [key, value] of Object.entries(updates)) {
      const dbColumnName = fieldMapping[key] || key;
      dbUpdates[dbColumnName] = value;
    }

    logger.debug(`📋 Updating listing table with _id=${listingId}`);
    logger.debug('📋 DB updates:', dbUpdates);

    const { error: updateError } = await supabase
      .from('listing')
      .update(dbUpdates)
      .eq('_id', listingId);

    if (updateError) {
      logger.error('❌ Error updating listing:', updateError);
      logger.error('❌ Full error:', JSON.stringify(updateError, null, 2));
      throw updateError;
    }

    const { data, error: fetchError } = await supabase
      .from('listing')
      .select('*')
      .eq('_id', listingId)
      .maybeSingle();

    if (fetchError) {
      logger.warn('⚠️ Update succeeded but failed to fetch updated data:', fetchError);
      return { _id: listingId, ...dbUpdates };
    }

    logger.debug('✅ Listing updated:', data);
    return data;
  }, [listingId]);

  // Initialize on mount
  useEffect(() => {
    fetchListing();
  }, [fetchListing]);

  return {
    listing,
    setListing,
    counts,
    isLoading,
    error,
    existingCohostRequest,
    setExistingCohostRequest,
    fetchListing,
    updateListing
  };
}
