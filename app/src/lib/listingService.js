/**
 * Listing Service - Direct Supabase Operations for listing table
 *
 * Handles CRUD operations for self-listing form submissions.
 * Creates listings directly in the `listing` table using generate_bubble_id() RPC.
 *
 * NO FALLBACK: If operation fails, we fail. No workarounds.
 */

import { supabase } from './supabase.js';
import { getSessionId } from './secureStorage.js';
import { uploadPhotos } from './photoUpload.js';

/**
 * Create a new listing directly in the listing table
 *
 * Flow:
 * 1. Get current user ID from secure storage
 * 2. Generate Bubble-compatible _id via RPC
 * 3. Upload photos to Supabase Storage
 * 4. Insert directly into listing table with _id as primary key
 * 5. Link listing to account_host using _id
 * 6. Return the complete listing
 *
 * @param {object} formData - Complete form data from SelfListingPage
 * @returns {Promise<object>} - Created listing with _id
 */
export async function createListing(formData) {
  console.log('[ListingService] Creating listing directly in listing table');

  // Get current user ID
  const userId = getSessionId();
  console.log('[ListingService] Current user ID:', userId);

  // Step 1: Generate Bubble-compatible _id via RPC
  const { data: generatedId, error: rpcError } = await supabase.rpc('generate_bubble_id');

  if (rpcError || !generatedId) {
    console.error('[ListingService] ❌ Failed to generate listing ID:', rpcError);
    throw new Error('Failed to generate listing ID');
  }

  console.log('[ListingService] ✅ Generated listing _id:', generatedId);

  // Step 2: Process photos - they should already be uploaded to Supabase Storage
  // The Section6Photos component now uploads directly, so we just format them here
  let uploadedPhotos = [];
  if (formData.photos?.photos?.length > 0) {
    console.log('[ListingService] Processing photos...');

    // Check if photos already have Supabase URLs (uploaded during form editing)
    const allPhotosHaveUrls = formData.photos.photos.every(
      (p) => p.url && (p.url.startsWith('http://') || p.url.startsWith('https://'))
    );

    if (allPhotosHaveUrls) {
      // Photos are already uploaded - just format them
      console.log('[ListingService] ✅ Photos already uploaded to storage');
      uploadedPhotos = formData.photos.photos.map((p, i) => ({
        id: p.id,
        url: p.url,
        Photo: p.url,
        'Photo (thumbnail)': p.url,
        storagePath: p.storagePath || null,
        caption: p.caption || '',
        displayOrder: p.displayOrder ?? i,
        SortOrder: p.displayOrder ?? i,
        toggleMainPhoto: i === 0
      }));
    } else {
      // Legacy path: Some photos may still need uploading (shouldn't happen with new flow)
      console.log('[ListingService] Uploading remaining photos to Supabase Storage...');
      try {
        uploadedPhotos = await uploadPhotos(formData.photos.photos, generatedId);
        console.log('[ListingService] ✅ Photos uploaded:', uploadedPhotos.length);
      } catch (uploadError) {
        console.error('[ListingService] ❌ Photo upload failed:', uploadError);
        throw new Error('Failed to upload photos: ' + uploadError.message);
      }
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

  // Step 3: Map form data to listing table columns
  const listingData = mapFormDataToListingTable(formDataWithPhotos, userId, generatedId);

  // Step 4: Insert directly into listing table
  const { data, error } = await supabase
    .from('listing')
    .insert(listingData)
    .select()
    .single();

  if (error) {
    console.error('[ListingService] ❌ Error creating listing in Supabase:', error);
    throw new Error(error.message || 'Failed to create listing');
  }

  console.log('[ListingService] ✅ Listing created in listing table with _id:', data._id);

  // Step 5: Link listing to account_host using _id
  if (userId) {
    try {
      await linkListingToHost(userId, data._id);
      console.log('[ListingService] ✅ Listing linked to host account');
    } catch (linkError) {
      console.error('[ListingService] ⚠️ Failed to link listing to host:', linkError);
      // Continue - the listing exists, just not linked yet
    }
  }

  // NOTE: Bubble sync disabled - see /docs/tech-debt/BUBBLE_SYNC_DISABLED.md
  // The listing is now created directly in Supabase without Bubble synchronization

  return data;
}

/**
 * Link a listing to the host's account_host record
 * Adds the listing _id to the Listings array in account_host
 *
 * @param {string} userId - The user's Bubble _id
 * @param {string} listingId - The listing's _id (Bubble-compatible ID)
 * @returns {Promise<void>}
 */
async function linkListingToHost(userId, listingId) {
  console.log('[ListingService] Linking listing _id to host:', userId, listingId);

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
 * Map SelfListingPage form data to listing table columns
 * Creates a record ready for direct insertion into the listing table
 *
 * Column Mapping from listing_trial:
 * - form_metadata → Handled by localStorage (not stored in DB)
 * - address_validated → Stored in 'Location - Address' JSONB
 * - weekly_pattern → Mapped to 'Weeks offered'
 * - subsidy_agreement → Omitted (not in listing table)
 * - nightly_pricing → Mapped to individual '💰Nightly Host Rate for X nights' columns
 * - ideal_min_duration → Mapped to 'Minimum Months'
 * - ideal_max_duration → Mapped to 'Maximum Months'
 * - previous_reviews_link → Mapped to 'Source Link'
 * - optional_notes → Omitted (not in listing table)
 * - source_type → Omitted (Created By is for user ID)
 *
 * @param {object} formData - Form data from SelfListingPage
 * @param {string|null} userId - The current user's ID (for host linking)
 * @param {string} generatedId - The Bubble-compatible _id from generate_bubble_id()
 * @returns {object} - Database-ready object for listing table
 */
function mapFormDataToListingTable(formData, userId, generatedId) {
  const now = new Date().toISOString();

  // Map available nights from object to array of day numbers (1-based for Bubble compatibility)
  const daysAvailable = formData.leaseStyles?.availableNights
    ? mapAvailableNightsToArray(formData.leaseStyles.availableNights)
    : [];

  // Map available nights to day name strings (for Nights Available column)
  const nightsAvailableNames = formData.leaseStyles?.availableNights
    ? mapAvailableNightsToNames(formData.leaseStyles.availableNights)
    : [];

  // Build the listing table record
  return {
    // Primary key - generated Bubble-compatible ID
    _id: generatedId,

    // User/Host reference
    'Created By': userId || null,
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

    // Address (stored as JSONB with validated flag inside)
    'Location - Address': formData.spaceSnapshot?.address
      ? {
          address: formData.spaceSnapshot.address.fullAddress,
          number: formData.spaceSnapshot.address.number,
          street: formData.spaceSnapshot.address.street,
          lat: formData.spaceSnapshot.address.latitude,
          lng: formData.spaceSnapshot.address.longitude,
          validated: formData.spaceSnapshot.address.validated || false,
        }
      : null,
    'Location - City': formData.spaceSnapshot?.address?.city || null,
    'Location - State': formData.spaceSnapshot?.address?.state || null,
    'Location - Zip Code': formData.spaceSnapshot?.address?.zip || null,
    'neighborhood (manual input by user)':
      formData.spaceSnapshot?.address?.neighborhood || null,

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
    'Nights Available (List of Nights) ': nightsAvailableNames,
    // weekly_pattern → Mapped to 'Weeks offered'
    'Weeks offered': formData.leaseStyles?.weeklyPattern || 'Every week',

    // Section 4: Pricing
    '💰Damage Deposit': formData.pricing?.damageDeposit || 0,
    '💰Cleaning Cost / Maintenance Fee': formData.pricing?.maintenanceFee || 0,
    '💰Weekly Host Rate': formData.pricing?.weeklyCompensation || null,
    '💰Monthly Host Rate': formData.pricing?.monthlyCompensation || null,

    // Nightly rates from nightly_pricing.calculatedRates
    ...mapNightlyRatesToColumns(formData.pricing?.nightlyPricing),

    // Section 5: Rules
    'Cancellation Policy': formData.rules?.cancellationPolicy || null,
    'Preferred Gender': formData.rules?.preferredGender || 'No Preference',
    'Features - Qty Guests': formData.rules?.numberOfGuests || 2,
    'NEW Date Check-in Time': formData.rules?.checkInTime || '2:00 PM',
    'NEW Date Check-out Time': formData.rules?.checkOutTime || '11:00 AM',
    // ideal_min_duration → Mapped to Minimum Months/Weeks
    'Minimum Months': formData.rules?.idealMinDuration || null,
    'Maximum Months': formData.rules?.idealMaxDuration || null,
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
    // previous_reviews_link → Mapped to Source Link
    'Source Link': formData.review?.previousReviewsLink || null,

    // V2 fields
    host_type: formData.hostType || null,
    market_strategy: formData.marketStrategy || 'private',

    // Status defaults for new self-listings
    Active: false,
    Approved: false,
    Complete: formData.isSubmitted || false,

    // Required defaults for listing table
    'Features - Trial Periods Allowed': false,
    'Maximum Weeks': 52,
    'Minimum Nights': 1,
  };
}

/**
 * Map available nights object to array of day name strings
 * Used for 'Nights Available (List of Nights)' column
 *
 * @param {object} availableNights - {sunday: bool, monday: bool, ...}
 * @returns {string[]} - Array of day names like ["Monday", "Tuesday", ...]
 */
function mapAvailableNightsToNames(availableNights) {
  const dayNameMapping = {
    sunday: 'Sunday',
    monday: 'Monday',
    tuesday: 'Tuesday',
    wednesday: 'Wednesday',
    thursday: 'Thursday',
    friday: 'Friday',
    saturday: 'Saturday',
  };

  const result = [];
  // Maintain proper day order
  const dayOrder = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

  for (const day of dayOrder) {
    if (availableNights[day] && dayNameMapping[day]) {
      result.push(dayNameMapping[day]);
    }
  }

  return result;
}

// ============================================================================
// DISABLED FUNCTIONS - Moved to tech-debt
// See /docs/tech-debt/BUBBLE_SYNC_DISABLED.md for details
// ============================================================================

/*
 * [DISABLED] Sync a listing to the main Supabase `listing` table
 * This was used when listing_trial was the primary table
 * Now we insert directly into listing table, so this is no longer needed
 *
async function syncToListingTable(listingTrialData, bubbleId) {
  // ... see /docs/tech-debt/BUBBLE_SYNC_DISABLED.md
}
*/

/*
 * [DISABLED] Sync a listing from listing_trial to Bubble
 * Bubble sync is disabled - listings are now created directly in Supabase
 * See /docs/tech-debt/BUBBLE_SYNC_DISABLED.md for the original implementation
 *
async function syncListingToBubble(supabaseData, formData) {
  // ... see /docs/tech-debt/BUBBLE_SYNC_DISABLED.md
}
*/

/**
 * Update an existing listing in listing table
 * @param {string} listingId - The listing's _id (Bubble-compatible ID)
 * @param {object} formData - Updated form data (can be flat DB columns or nested SelfListingPage format)
 * @returns {Promise<object>} - Updated listing
 */
export async function updateListing(listingId, formData) {
  console.log('[ListingService] Updating listing:', listingId);

  if (!listingId) {
    throw new Error('Listing ID is required for update');
  }

  // Check if formData is already in flat database column format
  // (e.g., from EditListingDetails which uses DB column names directly)
  const isFlatDbFormat = isFlatDatabaseFormat(formData);

  let listingData;
  if (isFlatDbFormat) {
    // Already using database column names - normalize special columns
    listingData = normalizeDatabaseColumns(formData);
    console.log('[ListingService] Using flat DB format update');
  } else {
    // Nested SelfListingPage format - needs mapping
    // Note: For updates, we use the existing _id, not generate a new one
    listingData = mapFormDataToListingTableForUpdate(formData);
    console.log('[ListingService] Using mapped SelfListingPage format');
  }

  listingData['Modified Date'] = new Date().toISOString();

  const { data, error } = await supabase
    .from('listing')
    .update(listingData)
    .eq('_id', listingId)
    .select()
    .single();

  if (error) {
    console.error('[ListingService] ❌ Error updating listing:', error);
    throw new Error(error.message || 'Failed to update listing');
  }

  console.log('[ListingService] ✅ Listing updated:', data._id);
  return data;
}

/**
 * Map SelfListingPage form data to listing table columns for updates
 * Similar to mapFormDataToListingTable but without generating new _id
 *
 * @param {object} formData - Form data from SelfListingPage
 * @returns {object} - Database-ready object for listing table update
 */
function mapFormDataToListingTableForUpdate(formData) {
  // Map available nights from object to array of day numbers (1-based for Bubble compatibility)
  const daysAvailable = formData.leaseStyles?.availableNights
    ? mapAvailableNightsToArray(formData.leaseStyles.availableNights)
    : undefined;

  // Map available nights to day name strings (for Nights Available column)
  const nightsAvailableNames = formData.leaseStyles?.availableNights
    ? mapAvailableNightsToNames(formData.leaseStyles.availableNights)
    : undefined;

  // Build update object - only include fields that are present in formData
  const updateData = {};

  // Section 1: Space Snapshot
  if (formData.spaceSnapshot) {
    if (formData.spaceSnapshot.listingName !== undefined) updateData['Name'] = formData.spaceSnapshot.listingName;
    if (formData.spaceSnapshot.typeOfSpace !== undefined) updateData['Features - Type of Space'] = formData.spaceSnapshot.typeOfSpace;
    if (formData.spaceSnapshot.bedrooms !== undefined) updateData['Features - Qty Bedrooms'] = formData.spaceSnapshot.bedrooms;
    if (formData.spaceSnapshot.beds !== undefined) updateData['Features - Qty Beds'] = formData.spaceSnapshot.beds;
    if (formData.spaceSnapshot.bathrooms !== undefined) updateData['Features - Qty Bathrooms'] = formData.spaceSnapshot.bathrooms;
    if (formData.spaceSnapshot.typeOfKitchen !== undefined) updateData['Kitchen Type'] = formData.spaceSnapshot.typeOfKitchen;
    if (formData.spaceSnapshot.typeOfParking !== undefined) updateData['Features - Parking type'] = formData.spaceSnapshot.typeOfParking;

    if (formData.spaceSnapshot.address) {
      updateData['Location - Address'] = {
        address: formData.spaceSnapshot.address.fullAddress,
        number: formData.spaceSnapshot.address.number,
        street: formData.spaceSnapshot.address.street,
        lat: formData.spaceSnapshot.address.latitude,
        lng: formData.spaceSnapshot.address.longitude,
        validated: formData.spaceSnapshot.address.validated || false,
      };
      updateData['Location - City'] = formData.spaceSnapshot.address.city;
      updateData['Location - State'] = formData.spaceSnapshot.address.state;
      updateData['Location - Zip Code'] = formData.spaceSnapshot.address.zip;
      updateData['neighborhood (manual input by user)'] = formData.spaceSnapshot.address.neighborhood;
    }
  }

  // Section 2: Features
  if (formData.features) {
    if (formData.features.amenitiesInsideUnit !== undefined) updateData['Features - Amenities In-Unit'] = formData.features.amenitiesInsideUnit;
    if (formData.features.amenitiesOutsideUnit !== undefined) updateData['Features - Amenities In-Building'] = formData.features.amenitiesOutsideUnit;
    if (formData.features.descriptionOfLodging !== undefined) updateData['Description'] = formData.features.descriptionOfLodging;
    if (formData.features.neighborhoodDescription !== undefined) updateData['Description - Neighborhood'] = formData.features.neighborhoodDescription;
  }

  // Section 3: Lease Styles
  if (formData.leaseStyles) {
    if (formData.leaseStyles.rentalType !== undefined) updateData['rental type'] = formData.leaseStyles.rentalType;
    if (daysAvailable !== undefined) updateData['Days Available (List of Days)'] = daysAvailable;
    if (nightsAvailableNames !== undefined) updateData['Nights Available (List of Nights) '] = nightsAvailableNames;
    if (formData.leaseStyles.weeklyPattern !== undefined) updateData['Weeks offered'] = formData.leaseStyles.weeklyPattern;
  }

  // Section 4: Pricing
  if (formData.pricing) {
    if (formData.pricing.damageDeposit !== undefined) updateData['💰Damage Deposit'] = formData.pricing.damageDeposit;
    if (formData.pricing.maintenanceFee !== undefined) updateData['💰Cleaning Cost / Maintenance Fee'] = formData.pricing.maintenanceFee;
    if (formData.pricing.weeklyCompensation !== undefined) updateData['💰Weekly Host Rate'] = formData.pricing.weeklyCompensation;
    if (formData.pricing.monthlyCompensation !== undefined) updateData['💰Monthly Host Rate'] = formData.pricing.monthlyCompensation;
    if (formData.pricing.nightlyPricing) {
      Object.assign(updateData, mapNightlyRatesToColumns(formData.pricing.nightlyPricing));
    }
  }

  // Section 5: Rules
  if (formData.rules) {
    if (formData.rules.cancellationPolicy !== undefined) updateData['Cancellation Policy'] = formData.rules.cancellationPolicy;
    if (formData.rules.preferredGender !== undefined) updateData['Preferred Gender'] = formData.rules.preferredGender;
    if (formData.rules.numberOfGuests !== undefined) updateData['Features - Qty Guests'] = formData.rules.numberOfGuests;
    if (formData.rules.checkInTime !== undefined) updateData['NEW Date Check-in Time'] = formData.rules.checkInTime;
    if (formData.rules.checkOutTime !== undefined) updateData['NEW Date Check-out Time'] = formData.rules.checkOutTime;
    if (formData.rules.idealMinDuration !== undefined) updateData['Minimum Months'] = formData.rules.idealMinDuration;
    if (formData.rules.idealMaxDuration !== undefined) updateData['Maximum Months'] = formData.rules.idealMaxDuration;
    if (formData.rules.houseRules !== undefined) updateData['Features - House Rules'] = formData.rules.houseRules;
    if (formData.rules.blockedDates !== undefined) updateData['Dates - Blocked'] = formData.rules.blockedDates;
  }

  // Section 6: Photos
  if (formData.photos?.photos) {
    updateData['Features - Photos'] = formData.photos.photos.map((p, index) => ({
      id: p.id,
      url: p.url || p.Photo,
      Photo: p.url || p.Photo,
      'Photo (thumbnail)': p['Photo (thumbnail)'] || p.url || p.Photo,
      caption: p.caption || '',
      displayOrder: p.displayOrder ?? index,
      SortOrder: p.SortOrder ?? p.displayOrder ?? index,
      toggleMainPhoto: p.toggleMainPhoto ?? (index === 0),
      storagePath: p.storagePath || null
    }));
  }

  // Section 7: Review
  if (formData.review) {
    if (formData.review.safetyFeatures !== undefined) updateData['Features - Safety'] = formData.review.safetyFeatures;
    if (formData.review.squareFootage !== undefined) updateData['Features - SQFT Area'] = formData.review.squareFootage;
    if (formData.review.firstDayAvailable !== undefined) updateData[' First Available'] = formData.review.firstDayAvailable;
    if (formData.review.previousReviewsLink !== undefined) updateData['Source Link'] = formData.review.previousReviewsLink;
  }

  return updateData;
}

/**
 * Check if formData uses flat database column names
 * @param {object} formData - Form data to check
 * @returns {boolean} - True if using flat DB column format
 */
function isFlatDatabaseFormat(formData) {
  // Database column names have specific patterns
  const dbColumnPatterns = [
    'Name',
    'Description',
    'Features - ',
    'Location - ',
    'Description - ',
    'Kitchen Type',
    'Cancellation Policy',
    'First Available'
  ];

  const keys = Object.keys(formData);
  return keys.some(key =>
    dbColumnPatterns.some(pattern => key === pattern || key.startsWith(pattern))
  );
}

/**
 * Normalize database column names to handle quirks like leading/trailing spaces
 * Some Bubble-synced columns have unusual names that must be preserved exactly
 * @param {object} formData - Form data with database column names
 * @returns {object} - Normalized data ready for database update
 */
function normalizeDatabaseColumns(formData) {
  // Map of common field names to their actual database column names
  // (handles leading/trailing spaces from Bubble sync)
  const columnNameMap = {
    'First Available': ' First Available', // DB column has leading space
    'Nights Available (List of Nights)': 'Nights Available (List of Nights) ', // DB column has trailing space
    'Not Found - Location - Address': 'Not Found - Location - Address ' // DB column has trailing space
  };

  const normalized = {};

  for (const [key, value] of Object.entries(formData)) {
    // Check if this key needs to be remapped
    if (columnNameMap[key]) {
      normalized[columnNameMap[key]] = value;
    } else {
      normalized[key] = value;
    }
  }

  return normalized;
}

/**
 * Get a listing by _id from listing table
 * @param {string} listingId - The listing's _id (Bubble-compatible ID)
 * @returns {Promise<object|null>} - Listing data or null if not found
 */
export async function getListingById(listingId) {
  console.log('[ListingService] Fetching listing:', listingId);

  if (!listingId) {
    throw new Error('Listing ID is required');
  }

  const { data, error } = await supabase
    .from('listing')
    .select('*')
    .eq('_id', listingId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned
      console.log('[ListingService] Listing not found:', listingId);
      return null;
    }
    console.error('[ListingService] ❌ Error fetching listing:', error);
    throw new Error(error.message || 'Failed to fetch listing');
  }

  console.log('[ListingService] ✅ Listing fetched:', data._id);
  return data;
}

/**
 * @deprecated Use getListingById instead - listing_trial table is no longer used
 * Get a listing by UUID from listing_trial
 * @param {string} id - UUID of the listing
 * @returns {Promise<object|null>} - Listing data or null if not found
 */
export async function getListingTrialById(id) {
  console.warn('[ListingService] ⚠️ getListingTrialById is deprecated. Use getListingById instead.');
  console.log('[ListingService] Fetching from listing_trial:', id);

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
 * Save a draft listing
 * Note: Drafts are now primarily saved to localStorage via the store.
 * This function creates/updates a listing in the database if needed.
 *
 * @param {object} formData - Form data to save as draft
 * @param {string|null} existingId - Existing listing _id if updating
 * @returns {Promise<object>} - Saved listing
 */
export async function saveDraft(formData, existingId = null) {
  console.log('[ListingService] Saving draft, existingId:', existingId);

  if (existingId) {
    return updateListing(existingId, { ...formData, isDraft: true });
  }

  return createListing({ ...formData, isDraft: true });
}

// ============================================================================
// DEPRECATED FUNCTIONS - For backwards compatibility with listing_trial
// These will be removed in a future version
// ============================================================================

/**
 * @deprecated Use mapFormDataToListingTable instead - listing_trial table is no longer used
 * Map SelfListingPage form data to database columns (for listing_trial table)
 *
 * @param {object} formData - Form data from SelfListingPage
 * @param {string|null} userId - The current user's ID (for host linking)
 * @returns {object} - Database-ready object
 */
function mapFormDataToDatabase(formData, userId = null) {
  console.warn('[ListingService] ⚠️ mapFormDataToDatabase is deprecated. Use mapFormDataToListingTable instead.');
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

  // Note: Database only has columns for 2-7 nights, not 1 night
  return {
    '💰Nightly Host Rate for 2 nights': rates.night2 || null,
    '💰Nightly Host Rate for 3 nights': rates.night3 || null,
    '💰Nightly Host Rate for 4 nights': rates.night4 || null,
    '💰Nightly Host Rate for 5 nights': rates.night5 || null,
    '💰Nightly Host Rate for 7 nights': rates.night7 || rates.night5 || null, // Use night7 if available, fallback to night5
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
