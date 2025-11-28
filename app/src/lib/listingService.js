/**
 * Listing Service - Direct Supabase Operations for listing_trial
 *
 * Handles CRUD operations for self-listing form submissions.
 * Bypasses Bubble entirely - all data goes directly to Supabase.
 *
 * NO FALLBACK: If operation fails, we fail. No workarounds.
 */

import { supabase } from './supabase.js';

/**
 * Create a new listing in listing_trial table
 * @param {object} formData - Complete form data from SelfListingPage
 * @returns {Promise<object>} - Created listing with id
 */
export async function createListing(formData) {
  console.log('[ListingService] Creating listing in listing_trial');

  const listingData = mapFormDataToDatabase(formData);

  const { data, error } = await supabase
    .from('listing_trial')
    .insert(listingData)
    .select()
    .single();

  if (error) {
    console.error('[ListingService] ❌ Error creating listing:', error);
    throw new Error(error.message || 'Failed to create listing');
  }

  console.log('[ListingService] ✅ Listing created:', data.id);
  return data;
}

/**
 * Update an existing listing in listing_trial table
 * @param {string} id - UUID of the listing
 * @param {object} formData - Updated form data
 * @returns {Promise<object>} - Updated listing
 */
export async function updateListing(id, formData) {
  console.log('[ListingService] Updating listing:', id);

  if (!id) {
    throw new Error('Listing ID is required for update');
  }

  const listingData = mapFormDataToDatabase(formData);
  listingData['Modified Date'] = new Date().toISOString();

  const { data, error } = await supabase
    .from('listing_trial')
    .update(listingData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[ListingService] ❌ Error updating listing:', error);
    throw new Error(error.message || 'Failed to update listing');
  }

  console.log('[ListingService] ✅ Listing updated:', data.id);
  return data;
}

/**
 * Get a listing by UUID from listing_trial
 * @param {string} id - UUID of the listing
 * @returns {Promise<object|null>} - Listing data or null if not found
 */
export async function getListingTrialById(id) {
  console.log('[ListingService] Fetching listing:', id);

  if (!id) {
    throw new Error('Listing ID is required');
  }

  const { data, error } = await supabase
    .from('listing_trial')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned
      console.log('[ListingService] Listing not found:', id);
      return null;
    }
    console.error('[ListingService] ❌ Error fetching listing:', error);
    throw new Error(error.message || 'Failed to fetch listing');
  }

  console.log('[ListingService] ✅ Listing fetched:', data.id);
  return data;
}

/**
 * Save a draft listing (upsert based on form_metadata)
 * @param {object} formData - Form data to save as draft
 * @param {string|null} existingId - Existing listing ID if updating
 * @returns {Promise<object>} - Saved listing
 */
export async function saveDraft(formData, existingId = null) {
  console.log('[ListingService] Saving draft, existingId:', existingId);

  if (existingId) {
    return updateListing(existingId, { ...formData, isDraft: true });
  }

  return createListing({ ...formData, isDraft: true });
}

/**
 * Map SelfListingPage form data to database columns
 * Handles the translation between React form structure and Bubble-compatible schema
 *
 * @param {object} formData - Form data from SelfListingPage
 * @returns {object} - Database-ready object
 */
function mapFormDataToDatabase(formData) {
  const now = new Date().toISOString();

  // Generate a unique _id for Bubble compatibility (even though not syncing)
  const uniqueId = `self_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Map available nights from object to array of day numbers (1-based for Bubble compatibility)
  const daysAvailable = formData.leaseStyles?.availableNights
    ? mapAvailableNightsToArray(formData.leaseStyles.availableNights)
    : [];

  // Build the database record
  return {
    // Required fields
    _id: uniqueId,
    'Created By': 'self-listing-form',
    'Created Date': now,
    'Modified Date': now,

    // Section 1: Space Snapshot
    Name: formData.spaceSnapshot?.listingName || null,
    'Features - Type of Space': formData.spaceSnapshot?.typeOfSpace || null,
    'Features - Qty Bedrooms': formData.spaceSnapshot?.bedrooms || null,
    'Features - Qty Beds': formData.spaceSnapshot?.beds || null,
    'Features - Qty Bathrooms': formData.spaceSnapshot?.bathrooms || null,
    'Kitchen Type': formData.spaceSnapshot?.typeOfKitchen || null,
    'Features - Parking type': formData.spaceSnapshot?.typeOfParking || null,

    // Address (stored as JSONB)
    'Location - Address': formData.spaceSnapshot?.address
      ? {
          address: formData.spaceSnapshot.address.fullAddress,
          number: formData.spaceSnapshot.address.number,
          street: formData.spaceSnapshot.address.street,
          lat: formData.spaceSnapshot.address.latitude,
          lng: formData.spaceSnapshot.address.longitude,
        }
      : null,
    'Location - City': formData.spaceSnapshot?.address?.city || null,
    'Location - State': formData.spaceSnapshot?.address?.state || null,
    'Location - Zip Code': formData.spaceSnapshot?.address?.zip || null,
    'Location - Coordinates': formData.spaceSnapshot?.address?.latitude
      ? {
          lat: formData.spaceSnapshot.address.latitude,
          lng: formData.spaceSnapshot.address.longitude,
        }
      : null,
    'neighborhood (manual input by user)':
      formData.spaceSnapshot?.address?.neighborhood || null,
    address_validated: formData.spaceSnapshot?.address?.validated || false,

    // Section 2: Features
    'Features - Amenities In-Unit': formData.features?.amenitiesInsideUnit || [],
    'Features - Amenities In-Building':
      formData.features?.amenitiesOutsideUnit || [],
    Description: formData.features?.descriptionOfLodging || null,
    'Description - Neighborhood':
      formData.features?.neighborhoodDescription || null,

    // Section 3: Lease Styles
    'rental type': formData.leaseStyles?.rentalType || 'Monthly',
    'Days Available (List of Days)': daysAvailable,
    weekly_pattern: formData.leaseStyles?.weeklyPattern || null,
    subsidy_agreement: formData.leaseStyles?.subsidyAgreement || false,

    // Section 4: Pricing
    '💰Damage Deposit': formData.pricing?.damageDeposit || 0,
    '💰Cleaning Cost / Maintenance Fee': formData.pricing?.maintenanceFee || 0,
    '💰Weekly Host Rate': formData.pricing?.weeklyCompensation || null,
    '💰Monthly Host Rate': formData.pricing?.monthlyCompensation || null,
    nightly_pricing: formData.pricing?.nightlyPricing || null,

    // Calculate nightly rates if nightlyPricing exists
    ...mapNightlyRatesToColumns(formData.pricing?.nightlyPricing),

    // Section 5: Rules
    'Cancellation Policy': formData.rules?.cancellationPolicy || null,
    'Preferred Gender': formData.rules?.preferredGender || 'No Preference',
    'Features - Qty Guests': formData.rules?.numberOfGuests || 2,
    'NEW Date Check-in Time': formData.rules?.checkInTime || '2:00 PM',
    'NEW Date Check-out Time': formData.rules?.checkOutTime || '11:00 AM',
    ideal_min_duration: formData.rules?.idealMinDuration || null,
    ideal_max_duration: formData.rules?.idealMaxDuration || null,
    'Features - House Rules': formData.rules?.houseRules || [],
    'Dates - Blocked': formData.rules?.blockedDates || [],

    // Section 6: Photos
    'Features - Photos': formData.photos?.photos?.map((p) => ({
      id: p.id,
      url: p.url,
      caption: p.caption,
      displayOrder: p.displayOrder,
    })) || [],

    // Section 7: Review
    'Features - Safety': formData.review?.safetyFeatures || [],
    'Features - SQFT Area': formData.review?.squareFootage || null,
    ' First Available': formData.review?.firstDayAvailable || null,
    agreed_to_terms: formData.review?.agreedToTerms || false,
    optional_notes: formData.review?.optionalNotes || null,
    previous_reviews_link: formData.review?.previousReviewsLink || null,

    // Form metadata
    form_metadata: {
      currentSection: formData.currentSection || 1,
      completedSections: formData.completedSections || [],
      isDraft: formData.isDraft !== false,
      isSubmitted: formData.isSubmitted || false,
    },

    // Source identification
    source_type: 'self-listing-form',

    // Status defaults for new self-listings
    Active: false,
    Approved: false,
    Complete: formData.isSubmitted || false,
    'Features - Trial Periods Allowed': false,
    'Maximum Weeks': 52,
    'Minimum Nights': 1,
    'Weeks offered': 'All',
    'Nights Available (List of Nights) ': [],
  };
}

/**
 * Map available nights object to array of 1-based day numbers
 * Internal (JS) uses 0-based, Bubble uses 1-based
 *
 * @param {object} availableNights - {sunday: bool, monday: bool, ...}
 * @returns {number[]} - Array of 1-based day numbers
 */
function mapAvailableNightsToArray(availableNights) {
  const dayMapping = {
    sunday: 1,
    monday: 2,
    tuesday: 3,
    wednesday: 4,
    thursday: 5,
    friday: 6,
    saturday: 7,
  };

  const result = [];
  for (const [day, isSelected] of Object.entries(availableNights)) {
    if (isSelected && dayMapping[day]) {
      result.push(dayMapping[day]);
    }
  }

  return result.sort((a, b) => a - b);
}

/**
 * Map nightly pricing object to individual rate columns
 * Used for search/filtering on price fields
 *
 * @param {object|null} nightlyPricing - Pricing object with calculatedRates
 * @returns {object} - Individual rate columns
 */
function mapNightlyRatesToColumns(nightlyPricing) {
  if (!nightlyPricing?.calculatedRates) {
    return {};
  }

  const rates = nightlyPricing.calculatedRates;

  return {
    '💰Nightly Host Rate for 2 nights': rates.night2 || null,
    '💰Nightly Host Rate for 3 nights': rates.night3 || null,
    '💰Nightly Host Rate for 4 nights': rates.night4 || null,
    '💰Nightly Host Rate for 5 nights': rates.night5 || null,
    '💰Nightly Host Rate for 7 nights': rates.night5 || null, // Use night5 as fallback
  };
}

/**
 * Map database record back to form data structure
 * Used when loading an existing listing for editing
 *
 * @param {object} dbRecord - Database record from listing_trial
 * @returns {object} - Form data structure for SelfListingPage
 */
export function mapDatabaseToFormData(dbRecord) {
  if (!dbRecord) return null;

  const address = dbRecord['Location - Address'] || {};
  const coordinates = dbRecord['Location - Coordinates'] || {};
  const formMetadata = dbRecord.form_metadata || {};

  return {
    id: dbRecord.id,
    spaceSnapshot: {
      listingName: dbRecord.Name || '',
      typeOfSpace: dbRecord['Features - Type of Space'] || '',
      bedrooms: dbRecord['Features - Qty Bedrooms'] || 2,
      beds: dbRecord['Features - Qty Beds'] || 2,
      bathrooms: dbRecord['Features - Qty Bathrooms'] || 2.5,
      typeOfKitchen: dbRecord['Kitchen Type'] || '',
      typeOfParking: dbRecord['Features - Parking type'] || '',
      address: {
        fullAddress: address.address || '',
        number: address.number || '',
        street: address.street || '',
        city: dbRecord['Location - City'] || '',
        state: dbRecord['Location - State'] || '',
        zip: dbRecord['Location - Zip Code'] || '',
        neighborhood: dbRecord['neighborhood (manual input by user)'] || '',
        latitude: coordinates.lat || address.lat || null,
        longitude: coordinates.lng || address.lng || null,
        validated: dbRecord.address_validated || false,
      },
    },
    features: {
      amenitiesInsideUnit: dbRecord['Features - Amenities In-Unit'] || [],
      amenitiesOutsideUnit: dbRecord['Features - Amenities In-Building'] || [],
      descriptionOfLodging: dbRecord.Description || '',
      neighborhoodDescription: dbRecord['Description - Neighborhood'] || '',
    },
    leaseStyles: {
      rentalType: dbRecord['rental type'] || 'Monthly',
      availableNights: mapArrayToAvailableNights(
        dbRecord['Days Available (List of Days)']
      ),
      weeklyPattern: dbRecord.weekly_pattern || '',
      subsidyAgreement: dbRecord.subsidy_agreement || false,
    },
    pricing: {
      damageDeposit: dbRecord['💰Damage Deposit'] || 500,
      maintenanceFee: dbRecord['💰Cleaning Cost / Maintenance Fee'] || 0,
      weeklyCompensation: dbRecord['💰Weekly Host Rate'] || null,
      monthlyCompensation: dbRecord['💰Monthly Host Rate'] || null,
      nightlyPricing: dbRecord.nightly_pricing || null,
    },
    rules: {
      cancellationPolicy: dbRecord['Cancellation Policy'] || '',
      preferredGender: dbRecord['Preferred Gender'] || 'No Preference',
      numberOfGuests: dbRecord['Features - Qty Guests'] || 2,
      checkInTime: dbRecord['NEW Date Check-in Time'] || '2:00 PM',
      checkOutTime: dbRecord['NEW Date Check-out Time'] || '11:00 AM',
      idealMinDuration: dbRecord.ideal_min_duration || 2,
      idealMaxDuration: dbRecord.ideal_max_duration || 6,
      houseRules: dbRecord['Features - House Rules'] || [],
      blockedDates: dbRecord['Dates - Blocked'] || [],
    },
    photos: {
      photos: (dbRecord['Features - Photos'] || []).map((p) => ({
        id: p.id,
        url: p.url,
        caption: p.caption || '',
        displayOrder: p.displayOrder || 0,
      })),
      minRequired: 3,
    },
    review: {
      safetyFeatures: dbRecord['Features - Safety'] || [],
      squareFootage: dbRecord['Features - SQFT Area'] || null,
      firstDayAvailable: dbRecord[' First Available'] || '',
      agreedToTerms: dbRecord.agreed_to_terms || false,
      optionalNotes: dbRecord.optional_notes || '',
      previousReviewsLink: dbRecord.previous_reviews_link || '',
    },
    currentSection: formMetadata.currentSection || 1,
    completedSections: formMetadata.completedSections || [],
    isDraft: formMetadata.isDraft !== false,
    isSubmitted: formMetadata.isSubmitted || false,
  };
}

/**
 * Map array of 1-based day numbers to available nights object
 *
 * @param {number[]} daysArray - Array of 1-based day numbers
 * @returns {object} - {sunday: bool, monday: bool, ...}
 */
function mapArrayToAvailableNights(daysArray) {
  const dayMapping = {
    1: 'sunday',
    2: 'monday',
    3: 'tuesday',
    4: 'wednesday',
    5: 'thursday',
    6: 'friday',
    7: 'saturday',
  };

  const result = {
    sunday: false,
    monday: false,
    tuesday: false,
    wednesday: false,
    thursday: false,
    friday: false,
    saturday: false,
  };

  if (Array.isArray(daysArray)) {
    for (const dayNum of daysArray) {
      const dayName = dayMapping[dayNum];
      if (dayName) {
        result[dayName] = true;
      }
    }
  }

  return result;
}
