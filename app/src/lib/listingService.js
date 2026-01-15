/**
 * Listing Service - Direct Supabase Operations for listing table
 *
 * Handles CRUD operations for self-listing form submissions.
 * Creates listings directly in the `listing` table using generate_bubble_id() RPC.
 *
 * NO FALLBACK: If operation fails, we fail. No workarounds.
 */

import { supabase } from './supabase.js';
import { getUserId } from './secureStorage.js';
import { uploadPhotos } from './photoUpload.js';
import { logger } from './logger.js';

// ============================================================================
// GEO LOOKUP UTILITIES
// ============================================================================

/**
 * Look up borough ID by zip code from reference table
 * @param {string} zipCode - The zip code to look up
 * @returns {Promise<string|null>} Borough _id or null if not found
 */
async function getBoroughIdByZipCode(zipCode) {
  if (!zipCode) return null;

  const cleanZip = String(zipCode).trim().substring(0, 5);
  if (!/^\d{5}$/.test(cleanZip)) return null;

  try {
    const { data, error } = await supabase
      .schema('reference_table')
      .from('zat_geo_borough_toplevel')
      .select('_id, "Display Borough"')
      .contains('Zip Codes', [cleanZip])
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      logger.debug('[ListingService] No borough found for zip:', cleanZip);
      return null;
    }

    logger.debug('[ListingService] ✅ Found borough:', data['Display Borough'], 'for zip:', cleanZip);
    return data._id;
  } catch (err) {
    logger.error('[ListingService] Error looking up borough:', err);
    return null;
  }
}

/**
 * Look up hood (neighborhood) ID by zip code from reference table
 * @param {string} zipCode - The zip code to look up
 * @returns {Promise<string|null>} Hood _id or null if not found
 */
async function getHoodIdByZipCode(zipCode) {
  if (!zipCode) return null;

  const cleanZip = String(zipCode).trim().substring(0, 5);
  if (!/^\d{5}$/.test(cleanZip)) return null;

  try {
    const { data, error } = await supabase
      .schema('reference_table')
      .from('zat_geo_hood_mediumlevel')
      .select('_id, "Display"')
      .contains('Zips', [cleanZip])
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      logger.debug('[ListingService] No hood found for zip:', cleanZip);
      return null;
    }

    logger.debug('[ListingService] ✅ Found hood:', data['Display'], 'for zip:', cleanZip);
    return data._id;
  } catch (err) {
    logger.error('[ListingService] Error looking up hood:', err);
    return null;
  }
}

/**
 * Look up both borough and hood IDs by zip code
 * @param {string} zipCode - The zip code to look up
 * @returns {Promise<{boroughId: string|null, hoodId: string|null}>}
 */
async function getGeoIdsByZipCode(zipCode) {
  logger.debug('[ListingService] Looking up geo IDs for zip:', zipCode);

  const [boroughId, hoodId] = await Promise.all([
    getBoroughIdByZipCode(zipCode),
    getHoodIdByZipCode(zipCode)
  ]);

  return { boroughId, hoodId };
}

/**
 * Create a new listing directly in the listing table
 *
 * Flow:
 * 1. Get current user ID from secure storage
 * 2. Generate Bubble-compatible _id via RPC
 * 3. Upload photos to Supabase Storage
 * 4. Insert directly into listing table with _id as primary key
 * 5. Link listing to user's Listings array using _id
 * 6. Return the complete listing
 *
 * @param {object} formData - Complete form data from SelfListingPage
 * @returns {Promise<object>} - Created listing with _id
 */
export async function createListing(formData) {
  logger.debug('[ListingService] Creating listing directly in listing table');

  // Get current user ID from storage
  const storedUserId = getUserId();
  logger.debug('[ListingService] Stored user ID:', storedUserId);

  // Resolve user._id - this is used for BOTH "Created By" AND "Host User"
  // user._id is used directly as the host reference
  let userId = storedUserId;
  const isSupabaseUUID = storedUserId && storedUserId.includes('-');

  if (isSupabaseUUID) {
    logger.debug('[ListingService] Detected Supabase Auth UUID, resolving user._id by email...');
    const { data: { session } } = await supabase.auth.getSession();

    if (session?.user?.email) {
      // Fetch user._id - this is all we need since user._id = host account ID
      // Note: Some users have email in 'email' column, others in 'email as text' (legacy Bubble column)
      const { data: userData, error: userError } = await supabase
        .from('user')
        .select('_id')
        .or(`email.eq.${session.user.email},email as text.eq.${session.user.email}`)
        .maybeSingle();

      if (userData?._id) {
        userId = userData._id;
        logger.debug('[ListingService] ✅ Resolved user._id:', userId);
      } else {
        logger.warn('[ListingService] ⚠️ Could not resolve user data, using stored ID:', storedUserId);
      }
    }
  }

  logger.debug('[ListingService] User ID (for Created By and Host User):', userId);

  // Step 1: Generate Bubble-compatible _id via RPC
  const { data: generatedId, error: rpcError } = await supabase.rpc('generate_bubble_id');

  if (rpcError || !generatedId) {
    logger.error('[ListingService] ❌ Failed to generate listing ID:', rpcError);
    throw new Error('Failed to generate listing ID');
  }

  logger.debug('[ListingService] ✅ Generated listing _id:', generatedId);

  // Step 2: Process photos - they should already be uploaded to Supabase Storage
  // The Section6Photos component now uploads directly, so we just format them here
  let uploadedPhotos = [];
  if (formData.photos?.photos?.length > 0) {
    logger.debug('[ListingService] Processing photos...');

    // Check if photos already have Supabase URLs (uploaded during form editing)
    const allPhotosHaveUrls = formData.photos.photos.every(
      (p) => p.url && (p.url.startsWith('http://') || p.url.startsWith('https://'))
    );

    if (allPhotosHaveUrls) {
      // Photos are already uploaded - just format them
      logger.debug('[ListingService] ✅ Photos already uploaded to storage');
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
      logger.debug('[ListingService] Uploading remaining photos to Supabase Storage...');
      try {
        uploadedPhotos = await uploadPhotos(formData.photos.photos, generatedId);
        logger.debug('[ListingService] ✅ Photos uploaded:', uploadedPhotos.length);
      } catch (uploadError) {
        logger.error('[ListingService] ❌ Photo upload failed:', uploadError);
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

  // Step 2b: Look up borough and hood IDs from zip code
  const zipCode = formData.spaceSnapshot?.address?.zip;
  let boroughId = null;
  let hoodId = null;

  if (zipCode) {
    logger.debug('[ListingService] Looking up borough/hood for zip:', zipCode);
    const geoIds = await getGeoIdsByZipCode(zipCode);
    boroughId = geoIds.boroughId;
    hoodId = geoIds.hoodId;
  }

  // Step 3: Map form data to listing table columns
  // Pass userId for both "Created By" and "Host User", plus geo IDs
  const listingData = mapFormDataToListingTable(formDataWithPhotos, userId, generatedId, userId, boroughId, hoodId);

  // Debug: Log the cancellation policy value being inserted
  logger.debug('[ListingService] Cancellation Policy value to insert:', listingData['Cancellation Policy']);
  logger.debug('[ListingService] Rules from form:', formDataWithPhotos.rules);

  // Step 4: Insert directly into listing table
  const { data, error } = await supabase
    .from('listing')
    .insert(listingData)
    .select()
    .single();

  if (error) {
    logger.error('[ListingService] ❌ Error creating listing in Supabase:', error);
    logger.error('[ListingService] ❌ Full listing data that failed:', JSON.stringify(listingData, null, 2));
    throw new Error(error.message || 'Failed to create listing');
  }

  logger.debug('[ListingService] ✅ Listing created in listing table with _id:', data._id);

  // Step 5: Link listing to user's Listings array using _id
  // This MUST succeed - if it fails, the user won't see their listing
  if (!userId) {
    logger.error('[ListingService] ❌ No userId provided - cannot link listing to user');
    throw new Error('User ID is required to create a listing');
  }

  await linkListingToHost(userId, data._id);
  logger.debug('[ListingService] ✅ Listing linked to user account');

  // NOTE: Bubble sync disabled - see /docs/tech-debt/BUBBLE_SYNC_DISABLED.md
  // The listing is now created directly in Supabase without Bubble synchronization

  // Step 6: Trigger mockup proposal creation for first-time hosts (non-blocking)
  triggerMockupProposalIfFirstListing(userId, data._id).catch(err => {
    logger.warn('[ListingService] ⚠️ Mockup proposal creation failed (non-blocking):', err.message);
  });

  return data;
}

/**
 * Link a listing to the host's user record
 * Adds the listing _id to the Listings array in the user table
 *
 * Handles both Supabase Auth UUIDs and Bubble IDs:
 * - Supabase UUID (contains dashes): Look up user by email from auth session
 * - Bubble ID (timestamp format): Direct lookup by _id
 *
 * @param {string} userId - The user's Supabase Auth UUID or Bubble _id
 * @param {string} listingId - The listing's _id (Bubble-compatible ID)
 * @returns {Promise<void>}
 */
async function linkListingToHost(userId, listingId) {
  logger.debug('[ListingService] Linking listing _id to host:', userId, listingId);

  let userData = null;
  let fetchError = null;

  // Check if userId is a Supabase Auth UUID (contains dashes) or Bubble ID
  const isSupabaseUUID = userId && userId.includes('-');

  if (isSupabaseUUID) {
    // Get user email from Supabase Auth session
    logger.debug('[ListingService] Detected Supabase Auth UUID, looking up user by email...');
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user?.email) {
      logger.error('[ListingService] ❌ No email found in auth session');
      throw new Error('Could not retrieve user email from session');
    }

    const userEmail = session.user.email;
    logger.debug('[ListingService] Looking up user by email:', userEmail);

    // Look up user by email in public.user table
    // Note: Some users have email in 'email' column, others in 'email as text' (legacy Bubble column)
    const result = await supabase
      .from('user')
      .select('_id, Listings')
      .or(`email.eq.${userEmail},email as text.eq.${userEmail}`)
      .maybeSingle();

    userData = result.data;
    fetchError = result.error;
  } else {
    // Legacy path: Direct lookup by Bubble _id
    logger.debug('[ListingService] Using Bubble ID for user lookup');
    const result = await supabase
      .from('user')
      .select('_id, Listings')
      .eq('_id', userId)
      .maybeSingle();

    userData = result.data;
    fetchError = result.error;
  }

  if (fetchError) {
    logger.error('[ListingService] ❌ Error fetching user:', fetchError);
    throw fetchError;
  }

  if (!userData) {
    logger.error('[ListingService] ❌ No user found for userId:', userId);
    throw new Error(`User not found: ${userId}`);
  }

  logger.debug('[ListingService] ✅ Found user with Bubble _id:', userData._id);

  // Add the new listing ID to the array
  const currentListings = userData.Listings || [];
  if (!currentListings.includes(listingId)) {
    currentListings.push(listingId);
  }

  // Update the user with the new Listings array
  const { error: updateError } = await supabase
    .from('user')
    .update({ Listings: currentListings })
    .eq('_id', userData._id);

  if (updateError) {
    logger.error('[ListingService] ❌ Error updating user Listings:', updateError);
    throw updateError;
  }

  logger.debug('[ListingService] ✅ user Listings updated:', currentListings);
}

/**
 * Trigger mockup proposal creation for first-time hosts
 *
 * Non-blocking operation - failures don't affect listing creation.
 * Only triggers if this is the host's first listing.
 *
 * Handles both ID formats:
 * - Supabase Auth UUID (contains dashes): Lookup by email from auth session
 * - Bubble ID (timestamp format): Direct lookup by _id
 *
 * @param {string} userId - The user's Supabase Auth UUID or Bubble _id
 * @param {string} listingId - The newly created listing's _id
 * @returns {Promise<void>}
 */
async function triggerMockupProposalIfFirstListing(userId, listingId) {
  logger.debug('[ListingService] Step 6: Checking if first listing for mockup proposal...');

  let userData = null;
  let fetchError = null;

  // Check if userId is a Supabase Auth UUID (contains dashes) or Bubble ID
  const isSupabaseUUID = userId && userId.includes('-');

  if (isSupabaseUUID) {
    // Get user email from Supabase Auth session
    logger.debug('[ListingService] Detected Supabase Auth UUID, looking up user by email...');
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user?.email) {
      logger.warn('[ListingService] ⚠️ No email found in auth session for mockup proposal check');
      return;
    }

    const sessionEmail = session.user.email;
    logger.debug('[ListingService] Looking up user by email for mockup check:', sessionEmail);

    // Look up user by email in public.user table
    const result = await supabase
      .from('user')
      .select('_id, email, Listings')
      .eq('email', sessionEmail)
      .maybeSingle();

    userData = result.data;
    fetchError = result.error;
  } else {
    // Legacy path: Direct lookup by Bubble _id
    logger.debug('[ListingService] Using Bubble ID for mockup proposal user lookup');
    const result = await supabase
      .from('user')
      .select('_id, email, Listings')
      .eq('_id', userId)
      .maybeSingle();

    userData = result.data;
    fetchError = result.error;
  }

  // Handle case where user exists in Supabase Auth but not in legacy user table
  // This happens for users who signed up via native Supabase Auth (not legacy Bubble)
  let hostUserId = userData?._id;
  let hostEmail = userData?.email;
  let listings = userData?.Listings || [];

  if (!userData && isSupabaseUUID) {
    // User not in legacy table - use Supabase Auth data directly
    logger.debug('[ListingService] User not in legacy user table, using Supabase Auth session data');
    const { data: { session } } = await supabase.auth.getSession();

    if (session?.user) {
      // For Supabase Auth users, use the UUID as the host user ID
      // The Edge Function will handle this appropriately
      hostUserId = session.user.id;
      hostEmail = session.user.email;
      // Since this is a new Supabase Auth user not in legacy table, this is definitely their first listing
      listings = [listingId];
      logger.debug('[ListingService] ✅ Using Supabase Auth data for mockup proposal:', hostUserId);
    } else {
      logger.warn('[ListingService] ⚠️ No Supabase Auth session found for mockup proposal');
      return;
    }
  } else if (fetchError || !userData) {
    logger.warn('[ListingService] ⚠️ Could not fetch user for mockup proposal check:', fetchError?.message);
    return;
  } else {
    logger.debug('[ListingService] ✅ Found user for mockup check with Bubble _id:', userData._id);
  }

  // Only create mockup proposal for first listing
  if (listings.length !== 1) {
    logger.debug(`[ListingService] ⏭️ Skipping mockup proposal - not first listing (count: ${listings.length})`);
    return;
  }

  if (!hostEmail) {
    logger.warn('[ListingService] ⚠️ Missing email for mockup proposal');
    return;
  }

  logger.debug('[ListingService] 🎯 First listing detected, triggering mockup proposal creation...');

  // Get the Supabase URL from environment or config
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  // Call the listing edge function with createMockupProposal action
  // Uses hostUserId and hostEmail variables set above (from legacy table or Supabase Auth)
  const response = await fetch(`${supabaseUrl}/functions/v1/listing`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'createMockupProposal',
      payload: {
        listingId: listingId,
        hostUserId: hostUserId,
        hostEmail: hostEmail,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Edge function returned ${response.status}: ${errorText}`);
  }

  const result = await response.json();
  logger.debug('[ListingService] ✅ Mockup proposal creation triggered:', result);
}

/**
 * Map cancellation policy display name to its database FK ID
 * The 'Cancellation Policy' column has a foreign key constraint to reference_table.zat_features_cancellationpolicy
 *
 * @param {string|null} policyName - Human-readable policy name (e.g., 'Standard')
 * @returns {string|null} - The FK ID for the policy, or null if not found
 */
function mapCancellationPolicyToId(policyName) {
  const policyMap = {
    'Standard': '1665431440883x653177548350901500',
    'Additional Host Restrictions': '1665431684611x656977293321267800',
    'Prior to First-Time Arrival': '1599791792265x281203802121463780',
    'After First-Time Arrival': '1599791785559x603327510287017500',
  };

  const result = !policyName ? policyMap['Standard'] : (policyMap[policyName] || policyMap['Standard']);
  logger.debug('[ListingService] Cancellation policy mapping:', { input: policyName, output: result });
  return result;
}

/**
 * Map parking type display name to its database FK ID
 * The 'Features - Parking type' column has a foreign key constraint to reference_table.zat_features_parkingoptions
 *
 * @param {string|null} parkingType - Human-readable parking type (e.g., 'Street Parking')
 * @returns {string|null} - The FK ID for the parking type, or null if not provided
 */
function mapParkingTypeToId(parkingType) {
  const parkingMap = {
    'Street Parking': '1642428637379x970678957586007000',
    'No Parking': '1642428658755x946399373738815900',
    'Off-Street Parking': '1642428710705x523449235750343100',
    'Attached Garage': '1642428740411x489476808574605760',
    'Detached Garage': '1642428749714x405527148800546750',
    'Nearby Parking Structure': '1642428759346x972313924643388700',
  };

  if (!parkingType) return null; // Parking type is optional
  const result = parkingMap[parkingType] || null;
  logger.debug('[ListingService] Parking type mapping:', { input: parkingType, output: result });
  return result;
}

/**
 * Map listing type (Type of Space) display name to its database FK ID
 * The 'Features - Type of Space' column has a foreign key constraint to reference_table.zat_features_listingtype
 *
 * @param {string|null} spaceType - Human-readable space type (e.g., 'Private Room')
 * @returns {string|null} - The FK ID for the space type, or null if not provided
 */
function mapSpaceTypeToId(spaceType) {
  const spaceTypeMap = {
    'Private Room': '1569530159044x216130979074711000',
    'Entire Place': '1569530331984x152755544104023800',
    'Shared Room': '1585742011301x719941865479153400',
    'All Spaces': '1588063597111x228486447854442800',
  };

  if (!spaceType) return null; // Space type is optional
  const result = spaceTypeMap[spaceType] || null;
  logger.debug('[ListingService] Space type mapping:', { input: spaceType, output: result });
  return result;
}

/**
 * Map storage option display name to its database FK ID
 * The 'Features - Secure Storage Option' column has a foreign key constraint to reference_table.zat_features_storageoptions
 *
 * @param {string|null} storageOption - Human-readable storage option (e.g., 'In the room')
 * @returns {string|null} - The FK ID for the storage option, or null if not provided
 */
function mapStorageOptionToId(storageOption) {
  const storageMap = {
    'In the room': '1606866759190x694414586166435100',
    'In a locked closet': '1606866790336x155474305631091200',
    'In a suitcase': '1606866843299x274753427318384030',
  };

  if (!storageOption) return null; // Storage option is optional
  const result = storageMap[storageOption] || null;
  logger.debug('[ListingService] Storage option mapping:', { input: storageOption, output: result });
  return result;
}

/**
 * Map state abbreviation to full state name for FK constraint
 * The 'Location - State' column has a FK to reference_table.os_us_states.display
 * which expects full state names like "New York", not abbreviations like "NY"
 *
 * @param {string|null} stateInput - State abbreviation (e.g., 'NY') or full name
 * @returns {string|null} - Full state name for FK, or null if not provided
 */
function mapStateToDisplayName(stateInput) {
  if (!stateInput) return null;

  // If it's already a full state name (more than 2 chars), return as-is
  if (stateInput.length > 2) {
    return stateInput;
  }

  // Map of state abbreviations to full display names
  const stateAbbreviationMap = {
    'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas',
    'CA': 'California', 'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware',
    'FL': 'Florida', 'GA': 'Georgia', 'HI': 'Hawaii', 'ID': 'Idaho',
    'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa', 'KS': 'Kansas',
    'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
    'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi',
    'MO': 'Missouri', 'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada',
    'NH': 'New Hampshire', 'NJ': 'New Jersey', 'NM': 'New Mexico', 'NY': 'New York',
    'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio', 'OK': 'Oklahoma',
    'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
    'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah',
    'VT': 'Vermont', 'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia',
    'WI': 'Wisconsin', 'WY': 'Wyoming', 'DC': 'District of Columbia',
  };

  const result = stateAbbreviationMap[stateInput.toUpperCase()] || stateInput;
  logger.debug('[ListingService] State mapping:', { input: stateInput, output: result });
  return result;
}

/**
 * Map SelfListingPage form data to listing table columns
 * Creates a record ready for direct insertion into the listing table
 *
 * Column Mapping Notes:
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
 * @param {string|null} userId - The current user's _id (for Created By)
 * @param {string} generatedId - The Bubble-compatible _id from generate_bubble_id()
 * @param {string|null} hostAccountId - The user._id (for Host User FK)
 * @param {string|null} boroughId - The borough FK ID (from geo lookup)
 * @param {string|null} hoodId - The hood/neighborhood FK ID (from geo lookup)
 * @returns {object} - Database-ready object for listing table
 */
function mapFormDataToListingTable(formData, userId, generatedId, hostAccountId = null, boroughId = null, hoodId = null) {
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

    // User/Host reference - Host User contains user._id directly
    'Created By': userId || null,
    'Host User': hostAccountId || null, // user._id
    'Created Date': now,
    'Modified Date': now,

    // Section 1: Space Snapshot
    Name: formData.spaceSnapshot?.listingName || null,
    // Note: Type of Space is a FK reference to reference_table.zat_features_listingtype
    'Features - Type of Space': mapSpaceTypeToId(formData.spaceSnapshot?.typeOfSpace),
    'Features - Qty Bedrooms': formData.spaceSnapshot?.bedrooms || null,
    'Features - Qty Beds': formData.spaceSnapshot?.beds || null,
    'Features - Qty Bathrooms': formData.spaceSnapshot?.bathrooms
      ? Number(formData.spaceSnapshot.bathrooms)
      : null,
    // Note: Kitchen Type is a string FK to reference_table.os_kitchen_type.display (no mapping needed)
    'Kitchen Type': formData.spaceSnapshot?.typeOfKitchen || null,
    // Note: Parking type is a FK reference to reference_table.zat_features_parkingoptions
    'Features - Parking type': mapParkingTypeToId(formData.spaceSnapshot?.typeOfParking),

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
    // Note: Location - City is a FK to reference_table.zat_location._id - set to null for now
    // The city string is stored in 'Location - Address' JSONB field above
    'Location - City': null,
    // Note: Location - State is a string FK to reference_table.os_us_states.display
    // Google Maps returns abbreviation (e.g., 'NY'), but FK expects full name (e.g., 'New York')
    'Location - State': mapStateToDisplayName(formData.spaceSnapshot?.address?.state),
    'Location - Zip Code': formData.spaceSnapshot?.address?.zip || null,
    'neighborhood (manual input by user)':
      formData.spaceSnapshot?.address?.neighborhood || null,
    // Location - Borough and Location - Hood are FK columns populated from zip code lookup
    'Location - Borough': boroughId || null,
    'Location - Hood': hoodId || null,

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
    '💰Extra Charges': formData.pricing?.extraCharges || null,
    '💰Weekly Host Rate': formData.pricing?.weeklyCompensation || null,
    '💰Monthly Host Rate': formData.pricing?.monthlyCompensation || null,

    // Nightly rates from nightly_pricing.calculatedRates
    ...mapNightlyRatesToColumns(formData.pricing?.nightlyPricing),

    // Section 5: Rules
    // Note: Cancellation Policy is a FK reference to reference_table.zat_features_cancellationpolicy
    'Cancellation Policy': mapCancellationPolicyToId(formData.rules?.cancellationPolicy),
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

/**
 * Update an existing listing in listing table
 * @param {string} listingId - The listing's _id (Bubble-compatible ID)
 * @param {object} formData - Updated form data (can be flat DB columns or nested SelfListingPage format)
 * @returns {Promise<object>} - Updated listing
 */
export async function updateListing(listingId, formData) {
  logger.debug('[ListingService] Updating listing:', listingId);

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
    logger.debug('[ListingService] Using flat DB format update');
  } else {
    // Nested SelfListingPage format - needs mapping
    // Note: For updates, we use the existing _id, not generate a new one
    listingData = mapFormDataToListingTableForUpdate(formData);
    logger.debug('[ListingService] Using mapped SelfListingPage format');
  }

  listingData['Modified Date'] = new Date().toISOString();

  const { data, error } = await supabase
    .from('listing')
    .update(listingData)
    .eq('_id', listingId)
    .select()
    .single();

  if (error) {
    logger.error('[ListingService] ❌ Error updating listing:', error);
    throw new Error(error.message || 'Failed to update listing');
  }

  logger.debug('[ListingService] ✅ Listing updated:', data._id);
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
    if (formData.spaceSnapshot.typeOfSpace !== undefined) updateData['Features - Type of Space'] = mapSpaceTypeToId(formData.spaceSnapshot.typeOfSpace);
    if (formData.spaceSnapshot.bedrooms !== undefined) updateData['Features - Qty Bedrooms'] = formData.spaceSnapshot.bedrooms;
    if (formData.spaceSnapshot.beds !== undefined) updateData['Features - Qty Beds'] = formData.spaceSnapshot.beds;
    if (formData.spaceSnapshot.bathrooms !== undefined) updateData['Features - Qty Bathrooms'] = Number(formData.spaceSnapshot.bathrooms);
    if (formData.spaceSnapshot.typeOfKitchen !== undefined) updateData['Kitchen Type'] = formData.spaceSnapshot.typeOfKitchen;
    if (formData.spaceSnapshot.typeOfParking !== undefined) updateData['Features - Parking type'] = mapParkingTypeToId(formData.spaceSnapshot.typeOfParking);

    if (formData.spaceSnapshot.address) {
      updateData['Location - Address'] = {
        address: formData.spaceSnapshot.address.fullAddress,
        number: formData.spaceSnapshot.address.number,
        street: formData.spaceSnapshot.address.street,
        lat: formData.spaceSnapshot.address.latitude,
        lng: formData.spaceSnapshot.address.longitude,
        validated: formData.spaceSnapshot.address.validated || false,
      };
      // Note: Location - City is a FK - don't update from string value
      updateData['Location - State'] = mapStateToDisplayName(formData.spaceSnapshot.address.state);
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
    if (formData.pricing.extraCharges !== undefined) updateData['💰Extra Charges'] = formData.pricing.extraCharges;
    if (formData.pricing.weeklyCompensation !== undefined) updateData['💰Weekly Host Rate'] = formData.pricing.weeklyCompensation;
    if (formData.pricing.monthlyCompensation !== undefined) updateData['💰Monthly Host Rate'] = formData.pricing.monthlyCompensation;
    if (formData.pricing.nightlyPricing) {
      Object.assign(updateData, mapNightlyRatesToColumns(formData.pricing.nightlyPricing));
    }
  }

  // Section 5: Rules
  if (formData.rules) {
    if (formData.rules.cancellationPolicy !== undefined) updateData['Cancellation Policy'] = mapCancellationPolicyToId(formData.rules.cancellationPolicy);
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
  logger.debug('[ListingService] Fetching listing:', listingId);

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
      logger.debug('[ListingService] Listing not found:', listingId);
      return null;
    }
    logger.error('[ListingService] ❌ Error fetching listing:', error);
    throw new Error(error.message || 'Failed to fetch listing');
  }

  // Check if listing is soft-deleted
  if (data && data.Deleted === true) {
    logger.debug('[ListingService] Listing is soft-deleted:', listingId);
    return null;
  }

  logger.debug('[ListingService] ✅ Listing fetched:', data._id);
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
  logger.debug('[ListingService] Saving draft, existingId:', existingId);

  if (existingId) {
    return updateListing(existingId, { ...formData, isDraft: true });
  }

  return createListing({ ...formData, isDraft: true });
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Map available nights object to array of day numbers for database
 *
 * Day indices use JavaScript's 0-based standard (matching Date.getDay()):
 * 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday
 *
 * @param {object} availableNights - {sunday: bool, monday: bool, ...}
 * @returns {number[]} - Array of 0-based day numbers (0-6)
 */
function mapAvailableNightsToArray(availableNights) {
  const dayMapping = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  };

  const result = [];
  for (const [day, isSelected] of Object.entries(availableNights)) {
    if (isSelected && dayMapping[day] !== undefined) {
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
    '💰Nightly Host Rate for 1 night': rates.night1 || null,
    '💰Nightly Host Rate for 2 nights': rates.night2 || null,
    '💰Nightly Host Rate for 3 nights': rates.night3 || null,
    '💰Nightly Host Rate for 4 nights': rates.night4 || null,
    '💰Nightly Host Rate for 5 nights': rates.night5 || null,
    '💰Nightly Host Rate for 6 nights': rates.night6 || null,
    '💰Nightly Host Rate for 7 nights': rates.night7 || null,
  };
}

/**
 * Map database record back to form data structure
 * Used when loading an existing listing for editing
 *
 * @param {object} dbRecord - Database record from listing table
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
