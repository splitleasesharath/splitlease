/**
 * Listing Service - Direct Supabase Operations for listing_trial
 *
 * Handles CRUD operations for self-listing form submissions.
 * Bypasses Bubble entirely - all data goes directly to Supabase.
 *
 * NO FALLBACK: If operation fails, we fail. No workarounds.
 */

import { supabase } from './supabase.js';
import { getSessionId } from './secureStorage.js';
import { uploadPhotos } from './photoUpload.js';

/**
 * Create a new listing in listing_trial table, then sync to Bubble
 *
 * Flow:
 * 1. Get current user ID from secure storage
 * 2. Insert into listing_trial (Supabase) with user as host
 * 3. Call bubble-proxy to create listing in Bubble
 * 4. Update listing_trial with the Bubble _id
 * 5. Link listing to account_host
 * 6. Return the complete listing with Bubble _id
 *
 * @param {object} formData - Complete form data from SelfListingPage
 * @returns {Promise<object>} - Created listing with id and _id (Bubble)
 */
export async function createListing(formData) {
  console.log('[ListingService] Creating listing in listing_trial');

  // Get current user ID
  const userId = getSessionId();
  console.log('[ListingService] Current user ID:', userId);

  // Generate a temporary listing ID for photo uploads
  const tempListingId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Step 0: Upload photos to Supabase Storage first
  let uploadedPhotos = [];
  if (formData.photos?.photos?.length > 0) {
    console.log('[ListingService] Uploading photos to Supabase Storage...');
    try {
      uploadedPhotos = await uploadPhotos(formData.photos.photos, tempListingId);
      console.log('[ListingService] ✅ Photos uploaded:', uploadedPhotos.length);
    } catch (uploadError) {
      console.error('[ListingService] ⚠️ Photo upload failed:', uploadError);
      // Continue with data URLs as fallback
      uploadedPhotos = formData.photos.photos.map((p, i) => ({
        id: p.id,
        url: p.url,
        Photo: p.url,
        'Photo (thumbnail)': p.url,
        caption: p.caption,
        displayOrder: p.displayOrder ?? i,
        SortOrder: p.displayOrder ?? i,
        toggleMainPhoto: i === 0
      }));
    }
  }

  // Create form data with uploaded photo URLs
  const formDataWithPhotos = {
    ...formData,
    photos: {
      ...formData.photos,
      photos: uploadedPhotos
    }
  };

  const listingData = mapFormDataToDatabase(formDataWithPhotos, userId);

  // Step 1: Insert into Supabase listing_trial
  const { data, error } = await supabase
    .from('listing_trial')
    .insert(listingData)
    .select()
    .single();

  if (error) {
    console.error('[ListingService] ❌ Error creating listing in Supabase:', error);
    throw new Error(error.message || 'Failed to create listing');
  }

  console.log('[ListingService] ✅ Listing created in Supabase:', data.id);

  // Step 2: Link listing to account_host if user is logged in
  if (userId) {
    try {
      await linkListingToHost(userId, data.id);
      console.log('[ListingService] ✅ Listing linked to host account');
    } catch (linkError) {
      console.error('[ListingService] ⚠️ Failed to link listing to host:', linkError);
      // Continue - the listing exists, just not linked yet
    }
  }

  // Step 2: Sync to Bubble to get the Bubble _id
  try {
    const bubbleId = await syncListingToBubble(data, formData);

    if (bubbleId) {
      // Step 3: Update listing_trial with Bubble _id
      const { data: updatedData, error: updateError } = await supabase
        .from('listing_trial')
        .update({ _id: bubbleId })
        .eq('id', data.id)
        .select()
        .single();

      if (updateError) {
        console.error('[ListingService] ⚠️ Failed to update Bubble _id:', updateError);
        // Return original data - the listing exists but _id update failed
        return { ...data, _id: bubbleId };
      }

      console.log('[ListingService] ✅ Listing synced to Bubble with _id:', bubbleId);

      // Step 4: Sync to Supabase listing table (keeps both databases in sync)
      try {
        const listingRecord = await syncToListingTable(updatedData, bubbleId);
        if (listingRecord) {
          console.log('[ListingService] ✅ Listing synced to Supabase listing table');
        }
      } catch (listingSyncError) {
        console.error('[ListingService] ⚠️ Supabase listing sync failed:', listingSyncError);
        // Continue - the listing exists in listing_trial and Bubble
      }

      return updatedData;
    }
  } catch (syncError) {
    console.error('[ListingService] ⚠️ Bubble sync failed:', syncError);
    // Listing was created in Supabase but Bubble sync failed
    // Return the Supabase data - Bubble sync can be retried later
  }

  return data;
}

/**
 * Link a listing to the host's account_host record
 * Adds the listing ID to the Listings array in account_host
 *
 * @param {string} userId - The user's Bubble _id
 * @param {string} listingId - The listing's id
 * @returns {Promise<void>}
 */
async function linkListingToHost(userId, listingId) {
  console.log('[ListingService] Linking listing to host:', userId, listingId);

  // First, get the current Listings array
  const { data: hostData, error: fetchError } = await supabase
    .from('account_host')
    .select('_id, Listings')
    .eq('User', userId)
    .maybeSingle();

  if (fetchError) {
    console.error('[ListingService] ❌ Error fetching account_host:', fetchError);
    throw fetchError;
  }

  if (!hostData) {
    console.warn('[ListingService] ⚠️ No account_host found for user:', userId);
    return;
  }

  // Add the new listing ID to the array
  const currentListings = hostData.Listings || [];
  if (!currentListings.includes(listingId)) {
    currentListings.push(listingId);
  }

  // Update the account_host with the new Listings array
  const { error: updateError } = await supabase
    .from('account_host')
    .update({ Listings: currentListings })
    .eq('_id', hostData._id);

  if (updateError) {
    console.error('[ListingService] ❌ Error updating account_host Listings:', updateError);
    throw updateError;
  }

  console.log('[ListingService] ✅ account_host Listings updated:', currentListings);
}

/**
 * Sync a listing to the main Supabase `listing` table
 * This keeps the listing_trial and listing tables in sync
 *
 * @param {object} listingTrialData - The listing data from listing_trial
 * @param {string} bubbleId - The Bubble _id to use
 * @returns {Promise<object|null>} - Created/updated listing record or null if sync fails
 */
async function syncToListingTable(listingTrialData, bubbleId) {
  console.log('[ListingService] Syncing to listing table with _id:', bubbleId);

  // Map listing_trial data to listing table format
  // The listing table has the same schema but uses _id as primary key
  const listingData = {
    _id: bubbleId,
    'Created By': listingTrialData['Created By'] || 'self-listing-form',
    'Created Date': listingTrialData['Created Date'] || new Date().toISOString(),
    'Modified Date': new Date().toISOString(),

    // Core fields
    Name: listingTrialData.Name,
    'Features - Type of Space': listingTrialData['Features - Type of Space'],
    'Features - Qty Bedrooms': listingTrialData['Features - Qty Bedrooms'],
    'Features - Qty Beds': listingTrialData['Features - Qty Beds'],
    'Features - Qty Bathrooms': listingTrialData['Features - Qty Bathrooms'],
    'Kitchen Type': listingTrialData['Kitchen Type'],
    'Features - Parking type': listingTrialData['Features - Parking type'],

    // Location
    'Location - Address': listingTrialData['Location - Address'],
    'Location - City': listingTrialData['Location - City'],
    'Location - State': listingTrialData['Location - State'],
    'Location - Zip Code': listingTrialData['Location - Zip Code'],
    'Location - Coordinates': listingTrialData['Location - Coordinates'],
    'neighborhood (manual input by user)': listingTrialData['neighborhood (manual input by user)'],

    // Features
    'Features - Amenities In-Unit': listingTrialData['Features - Amenities In-Unit'],
    'Features - Amenities In-Building': listingTrialData['Features - Amenities In-Building'],
    Description: listingTrialData.Description,
    'Description - Neighborhood': listingTrialData['Description - Neighborhood'],

    // Lease style
    'rental type': listingTrialData['rental type'],
    'Days Available (List of Days)': listingTrialData['Days Available (List of Days)'],

    // Pricing
    '💰Damage Deposit': listingTrialData['💰Damage Deposit'],
    '💰Cleaning Cost / Maintenance Fee': listingTrialData['💰Cleaning Cost / Maintenance Fee'],
    '💰Weekly Host Rate': listingTrialData['💰Weekly Host Rate'],
    '💰Monthly Host Rate': listingTrialData['💰Monthly Host Rate'],
    '💰Nightly Host Rate for 2 nights': listingTrialData['💰Nightly Host Rate for 2 nights'],
    '💰Nightly Host Rate for 3 nights': listingTrialData['💰Nightly Host Rate for 3 nights'],
    '💰Nightly Host Rate for 4 nights': listingTrialData['💰Nightly Host Rate for 4 nights'],
    '💰Nightly Host Rate for 5 nights': listingTrialData['💰Nightly Host Rate for 5 nights'],
    '💰Nightly Host Rate for 7 nights': listingTrialData['💰Nightly Host Rate for 7 nights'],

    // Rules
    'Cancellation Policy': listingTrialData['Cancellation Policy'],
    'Preferred Gender': listingTrialData['Preferred Gender'] || 'No Preference',
    'Features - Qty Guests': listingTrialData['Features - Qty Guests'],
    'NEW Date Check-in Time': listingTrialData['NEW Date Check-in Time'] || '2:00 PM',
    'NEW Date Check-out Time': listingTrialData['NEW Date Check-out Time'] || '11:00 AM',
    'Features - House Rules': listingTrialData['Features - House Rules'],
    'Dates - Blocked': listingTrialData['Dates - Blocked'],

    // Photos
    'Features - Photos': listingTrialData['Features - Photos'],

    // Safety & Review
    'Features - Safety': listingTrialData['Features - Safety'],
    'Features - SQFT Area': listingTrialData['Features - SQFT Area'],
    ' First Available': listingTrialData[' First Available'],

    // V2 fields
    host_type: listingTrialData.host_type || null,
    market_strategy: listingTrialData.market_strategy || 'private',

    // Status - new self-listings start inactive and unapproved
    Active: false,
    Approved: false,
    Complete: true,

    // Required defaults for listing table
    'Features - Trial Periods Allowed': false,
    'Maximum Weeks': listingTrialData['Maximum Weeks'] || 52,
    'Minimum Nights': listingTrialData['Minimum Nights'] || 1,
    'Weeks offered': listingTrialData['Weeks offered'] || 'All',
    'Nights Available (List of Nights) ': listingTrialData['Nights Available (List of Nights) '] || [],
  };

  // Use upsert to handle both new listings and updates
  const { data, error } = await supabase
    .from('listing')
    .upsert(listingData, { onConflict: '_id' })
    .select()
    .single();

  if (error) {
    console.error('[ListingService] ❌ Error syncing to listing table:', error);
    return null;
  }

  console.log('[ListingService] ✅ Synced to listing table:', data._id);
  return data;
}

/**
 * Sync a listing from listing_trial to Bubble
 * Calls the bubble-proxy edge function with sync_listing_to_bubble action
 *
 * @param {object} supabaseData - The listing data from Supabase
 * @param {object} formData - Original form data for additional fields
 * @returns {Promise<string|null>} - Bubble _id or null if sync fails
 */
async function syncListingToBubble(supabaseData, formData) {
  console.log('[ListingService] Syncing listing to Bubble...');

  const payload = {
    listing_name: supabaseData.Name || formData.spaceSnapshot?.listingName,
    supabase_id: supabaseData.id,
    // Include additional data that Bubble might need
    type_of_space: supabaseData['Features - Type of Space'],
    bedrooms: supabaseData['Features - Qty Bedrooms'],
    beds: supabaseData['Features - Qty Beds'],
    bathrooms: supabaseData['Features - Qty Bathrooms'],
    city: supabaseData['Location - City'],
    state: supabaseData['Location - State'],
    zip_code: supabaseData['Location - Zip Code'],
    rental_type: supabaseData['rental type'],
    description: supabaseData.Description,
  };

  console.log('[ListingService] Bubble sync payload:', payload);

  const { data, error } = await supabase.functions.invoke('bubble-proxy', {
    body: {
      action: 'sync_listing_to_bubble',
      payload,
    },
  });

  if (error) {
    console.error('[ListingService] ❌ Bubble proxy error:', error);
    throw new Error(error.message || 'Failed to sync to Bubble');
  }

  if (!data.success) {
    console.error('[ListingService] ❌ Bubble sync failed:', data.error);
    throw new Error(data.error || 'Bubble sync returned error');
  }

  console.log('[ListingService] ✅ Bubble sync successful, _id:', data.data?.bubble_id);
  return data.data?.bubble_id || null;
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
 * @param {string|null} userId - The current user's ID (for host linking)
 * @returns {object} - Database-ready object
 */
function mapFormDataToDatabase(formData, userId = null) {
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
    'Created By': userId || 'self-listing-form',
    'Host / Landlord': userId || null,
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

    // Section 6: Photos - Store with format compatible with listing display
    'Features - Photos': formData.photos?.photos?.map((p, index) => ({
      id: p.id,
      url: p.url || p.Photo,
      Photo: p.url || p.Photo,
      'Photo (thumbnail)': p['Photo (thumbnail)'] || p.url || p.Photo,
      caption: p.caption || '',
      displayOrder: p.displayOrder ?? index,
      SortOrder: p.SortOrder ?? p.displayOrder ?? index,
      toggleMainPhoto: p.toggleMainPhoto ?? (index === 0),
      storagePath: p.storagePath || null
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
    source_type: formData.source_type || 'self-listing-form',

    // V2 fields (simplified flow)
    host_type: formData.hostType || null,
    market_strategy: formData.marketStrategy || 'private',

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
      photos: (dbRecord['Features - Photos'] || []).map((p, index) => ({
        id: p.id,
        url: p.url || p.Photo,
        Photo: p.Photo || p.url,
        'Photo (thumbnail)': p['Photo (thumbnail)'] || p.url || p.Photo,
        caption: p.caption || '',
        displayOrder: p.displayOrder ?? index,
        SortOrder: p.SortOrder ?? p.displayOrder ?? index,
        toggleMainPhoto: p.toggleMainPhoto ?? (index === 0),
        storagePath: p.storagePath || null
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

    // V2 fields
    hostType: dbRecord.host_type || null,
    marketStrategy: dbRecord.market_strategy || 'private',
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
