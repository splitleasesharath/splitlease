/**
 * Listing Service - Direct Supabase Operations for listing table
 *
 * Handles CRUD operations for self-listing form submissions.
 * Creates listings directly in the `listing` table using generate_bubble_id() RPC.
 *
 * NO FALLBACK: If operation fails, we fail. No workarounds.
 *
 * @module lib/listingService
 */

import { supabase } from './supabase.js';
import { getUserId } from './secureStorage.js';
import { uploadPhotos } from './photoUpload.js';

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const LOG_PREFIX = '[ListingService]'

const ZIP_CODE_PATTERN = /^\d{5}$/

const CANCELLATION_POLICY_MAP = Object.freeze({
  'Standard': '1665431440883x653177548350901500',
  'Additional Host Restrictions': '1665431684611x656977293321267800',
  'Prior to First-Time Arrival': '1599791792265x281203802121463780',
  'After First-Time Arrival': '1599791785559x603327510287017500'
})

const PARKING_TYPE_MAP = Object.freeze({
  'Street Parking': '1642428637379x970678957586007000',
  'No Parking': '1642428658755x946399373738815900',
  'Off-Street Parking': '1642428710705x523449235750343100',
  'Attached Garage': '1642428740411x489476808574605760',
  'Detached Garage': '1642428749714x405527148800546750',
  'Nearby Parking Structure': '1642428759346x972313924643388700'
})

const SPACE_TYPE_MAP = Object.freeze({
  'Private Room': '1569530159044x216130979074711000',
  'Entire Place': '1569530331984x152755544104023800',
  'Shared Room': '1585742011301x719941865479153400',
  'All Spaces': '1588063597111x228486447854442800'
})

const STORAGE_OPTION_MAP = Object.freeze({
  'In the room': '1606866759190x694414586166435100',
  'In a locked closet': '1606866790336x155474305631091200',
  'In a suitcase': '1606866843299x274753427318384030'
})

const STATE_ABBREVIATION_MAP = Object.freeze({
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
  'WI': 'Wisconsin', 'WY': 'Wyoming', 'DC': 'District of Columbia'
})

const DAY_INDEX_MAP = Object.freeze({
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6
})

const DAY_NAME_MAP = Object.freeze({
  sunday: 'Sunday',
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday'
})

const DAY_ORDER = Object.freeze([
  'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'
])

const DB_COLUMN_PATTERNS = Object.freeze([
  'Name',
  'Description',
  'Features - ',
  'Location - ',
  'Description - ',
  'Kitchen Type',
  'Cancellation Policy',
  'First Available'
])

const COLUMN_NAME_NORMALIZATION_MAP = Object.freeze({
  'First Available': ' First Available',
  'Nights Available (List of Nights)': 'Nights Available (List of Nights) ',
  'Not Found - Location - Address': 'Not Found - Location - Address '
})

const DEFAULT_VALUES = Object.freeze({
  RENTAL_TYPE: 'Monthly',
  PREFERRED_GENDER: 'No Preference',
  NUMBER_OF_GUESTS: 2,
  CHECK_IN_TIME: '2:00 PM',
  CHECK_OUT_TIME: '11:00 AM',
  MAXIMUM_WEEKS: 52,
  MINIMUM_NIGHTS: 1,
  WEEKS_OFFERED: 'Every week',
  MARKET_STRATEGY: 'private'
})

// ─────────────────────────────────────────────────────────────
// Validation Predicates (Pure Functions)
// ─────────────────────────────────────────────────────────────

/**
 * Check if value is a valid 5-digit zip code
 * @pure
 */
const isValidZipCode = (zipCode) => {
  if (!zipCode) return false
  const cleanZip = String(zipCode).trim().substring(0, 5)
  return ZIP_CODE_PATTERN.test(cleanZip)
}

/**
 * Check if user ID is a Supabase UUID (contains dashes)
 * @pure
 */
const isSupabaseUUID = (userId) =>
  userId && userId.includes('-')

/**
 * Check if formData uses flat database column names
 * @pure
 */
const isFlatDatabaseFormat = (formData) => {
  const keys = Object.keys(formData)
  return keys.some(key =>
    DB_COLUMN_PATTERNS.some(pattern => key === pattern || key.startsWith(pattern))
  )
}

/**
 * Check if listing is deleted
 * @pure
 */
const isDeleted = (listing) =>
  listing?.Deleted === true

/**
 * Check if all photos have URLs
 * @pure
 */
const allPhotosHaveUrls = (photos) =>
  photos.every(p => p.url && (p.url.startsWith('http://') || p.url.startsWith('https://')))

// ─────────────────────────────────────────────────────────────
// Pure Mapping Functions
// ─────────────────────────────────────────────────────────────

/**
 * Clean zip code to 5 digits
 * @pure
 */
const cleanZipCode = (zipCode) =>
  String(zipCode).trim().substring(0, 5)

/**
 * Map cancellation policy display name to FK ID
 * @pure
 */
const mapCancellationPolicyToId = (policyName) => {
  const result = !policyName
    ? CANCELLATION_POLICY_MAP['Standard']
    : (CANCELLATION_POLICY_MAP[policyName] || CANCELLATION_POLICY_MAP['Standard'])
  return result
}

/**
 * Map parking type display name to FK ID
 * @pure
 */
const mapParkingTypeToId = (parkingType) =>
  parkingType ? (PARKING_TYPE_MAP[parkingType] || null) : null

/**
 * Map space type display name to FK ID
 * @pure
 */
const mapSpaceTypeToId = (spaceType) =>
  spaceType ? (SPACE_TYPE_MAP[spaceType] || null) : null

/**
 * Map storage option display name to FK ID
 * @pure
 */
const mapStorageOptionToId = (storageOption) =>
  storageOption ? (STORAGE_OPTION_MAP[storageOption] || null) : null

/**
 * Map state abbreviation to full name
 * @pure
 */
const mapStateToDisplayName = (stateInput) => {
  if (!stateInput) return null
  if (stateInput.length > 2) return stateInput
  return STATE_ABBREVIATION_MAP[stateInput.toUpperCase()] || stateInput
}

/**
 * Map available nights object to array of day indices
 * @pure
 */
const mapAvailableNightsToArray = (availableNights) => {
  const result = []
  for (const [day, isSelected] of Object.entries(availableNights)) {
    if (isSelected && DAY_INDEX_MAP[day] !== undefined) {
      result.push(DAY_INDEX_MAP[day])
    }
  }
  return result.sort((a, b) => a - b)
}

/**
 * Map available nights object to day name strings
 * @pure
 */
const mapAvailableNightsToNames = (availableNights) => {
  const result = []
  for (const day of DAY_ORDER) {
    if (availableNights[day] && DAY_NAME_MAP[day]) {
      result.push(DAY_NAME_MAP[day])
    }
  }
  return result
}

/**
 * Map nightly pricing to rate columns
 * @pure
 */
const mapNightlyRatesToColumns = (nightlyPricing) => {
  if (!nightlyPricing?.calculatedRates) return {}

  const rates = nightlyPricing.calculatedRates
  return Object.freeze({
    '💰Nightly Host Rate for 1 night': rates.night1 || null,
    '💰Nightly Host Rate for 2 nights': rates.night2 || null,
    '💰Nightly Host Rate for 3 nights': rates.night3 || null,
    '💰Nightly Host Rate for 4 nights': rates.night4 || null,
    '💰Nightly Host Rate for 5 nights': rates.night5 || null,
    '💰Nightly Host Rate for 6 nights': rates.night6 || null,
    '💰Nightly Host Rate for 7 nights': rates.night7 || null
  })
}

/**
 * Normalize database column names
 * @pure
 */
const normalizeDatabaseColumns = (formData) => {
  const normalized = {}
  for (const [key, value] of Object.entries(formData)) {
    if (COLUMN_NAME_NORMALIZATION_MAP[key]) {
      normalized[COLUMN_NAME_NORMALIZATION_MAP[key]] = value
    } else {
      normalized[key] = value
    }
  }
  return normalized
}

/**
 * Build photo object for storage
 * @pure
 */
const buildPhotoObject = (photo, index) =>
  Object.freeze({
    id: photo.id,
    url: photo.url || photo.Photo,
    Photo: photo.url || photo.Photo,
    'Photo (thumbnail)': photo['Photo (thumbnail)'] || photo.url || photo.Photo,
    caption: photo.caption || '',
    displayOrder: photo.displayOrder ?? index,
    SortOrder: photo.SortOrder ?? photo.displayOrder ?? index,
    toggleMainPhoto: photo.toggleMainPhoto ?? (index === 0),
    storagePath: photo.storagePath || null
  })

/**
 * Build address JSONB object
 * @pure
 */
const buildAddressObject = (address) =>
  Object.freeze({
    address: address.fullAddress,
    number: address.number,
    street: address.street,
    lat: address.latitude,
    lng: address.longitude,
    validated: address.validated || false
  })

// ─────────────────────────────────────────────────────────────
// Logging Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Log info message
 * @effectful
 */
const logInfo = (message, data) => {
  if (data !== undefined) {
    console.log(`${LOG_PREFIX} ${message}:`, data)
  } else {
    console.log(`${LOG_PREFIX} ${message}`)
  }
}

/**
 * Log error message
 * @effectful
 */
const logError = (message, error) => {
  console.error(`${LOG_PREFIX} ${message}:`, error)
}

/**
 * Log warning message
 * @effectful
 */
const logWarning = (message, data) => {
  if (data !== undefined) {
    console.warn(`${LOG_PREFIX} ${message}:`, data)
  } else {
    console.warn(`${LOG_PREFIX} ${message}`)
  }
}

// ─────────────────────────────────────────────────────────────
// GEO LOOKUP UTILITIES
// ─────────────────────────────────────────────────────────────

/**
 * Look up borough ID by zip code from reference table
 * @effectful
 * @param {string} zipCode - The zip code to look up
 * @returns {Promise<string|null>} Borough _id or null if not found
 */
async function getBoroughIdByZipCode(zipCode) {
  if (!isValidZipCode(zipCode)) return null

  const cleanZip = cleanZipCode(zipCode)

  try {
    const { data, error } = await supabase
      .schema('reference_table')
      .from('zat_geo_borough_toplevel')
      .select('_id, "Display Borough"')
      .contains('Zip Codes', [cleanZip])
      .limit(1)
      .maybeSingle()

    if (error || !data) {
      logInfo('No borough found for zip', cleanZip)
      return null
    }

    logInfo(`Found borough: ${data['Display Borough']} for zip`, cleanZip)
    return data._id
  } catch (err) {
    logError('Error looking up borough', err)
    return null
  }
}

/**
 * Look up hood (neighborhood) ID by zip code from reference table
 * @effectful
 * @param {string} zipCode - The zip code to look up
 * @returns {Promise<string|null>} Hood _id or null if not found
 */
async function getHoodIdByZipCode(zipCode) {
  if (!isValidZipCode(zipCode)) return null

  const cleanZip = cleanZipCode(zipCode)

  try {
    const { data, error } = await supabase
      .schema('reference_table')
      .from('zat_geo_hood_mediumlevel')
      .select('_id, "Display"')
      .contains('Zips', [cleanZip])
      .limit(1)
      .maybeSingle()

    if (error || !data) {
      logInfo('No hood found for zip', cleanZip)
      return null
    }

    logInfo(`Found hood: ${data['Display']} for zip`, cleanZip)
    return data._id
  } catch (err) {
    logError('Error looking up hood', err)
    return null
  }
}

/**
 * Look up both borough and hood IDs by zip code
 * @effectful
 * @param {string} zipCode - The zip code to look up
 * @returns {Promise<{boroughId: string|null, hoodId: string|null}>}
 */
async function getGeoIdsByZipCode(zipCode) {
  logInfo('Looking up geo IDs for zip', zipCode)

  const [boroughId, hoodId] = await Promise.all([
    getBoroughIdByZipCode(zipCode),
    getHoodIdByZipCode(zipCode)
  ])

  return { boroughId, hoodId }
}

// ─────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────

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
 * @effectful
 * @param {object} formData - Complete form data from SelfListingPage
 * @returns {Promise<object>} - Created listing with _id
 */
export async function createListing(formData) {
  logInfo('Creating listing directly in listing table')

  // Get current user ID from storage
  const storedUserId = getUserId()
  logInfo('Stored user ID', storedUserId)

  // Resolve user._id - this is used for BOTH "Created By" AND "Host User"
  // user._id is used directly as the host reference
  let userId = storedUserId

  if (isSupabaseUUID(storedUserId)) {
    logInfo('Detected Supabase Auth UUID, resolving user._id by email...')
    const { data: { session } } = await supabase.auth.getSession()

    if (session?.user?.email) {
      // Fetch user._id - this is all we need since user._id = host account ID
      // Note: Some users have email in 'email' column, others in 'email as text' (legacy Bubble column)
      const { data: userData } = await supabase
        .from('user')
        .select('_id')
        .or(`email.eq.${session.user.email},email as text.eq.${session.user.email}`)
        .maybeSingle()

      if (userData?._id) {
        userId = userData._id
        logInfo('Resolved user._id', userId)
      } else {
        logWarning('Could not resolve user data, using stored ID', storedUserId)
      }
    }
  }

  logInfo('User ID (for Created By and Host User)', userId)

  // Step 1: Generate Bubble-compatible _id via RPC
  const { data: generatedId, error: rpcError } = await supabase.rpc('generate_bubble_id')

  if (rpcError || !generatedId) {
    logError('Failed to generate listing ID', rpcError)
    throw new Error('Failed to generate listing ID')
  }

  logInfo('Generated listing _id', generatedId)

  // Step 2: Process photos - they should already be uploaded to Supabase Storage
  // The Section6Photos component now uploads directly, so we just format them here
  let uploadedPhotos = []
  if (formData.photos?.photos?.length > 0) {
    logInfo('Processing photos...')

    // Check if photos already have Supabase URLs (uploaded during form editing)
    if (allPhotosHaveUrls(formData.photos.photos)) {
      // Photos are already uploaded - just format them
      logInfo('Photos already uploaded to storage')
      uploadedPhotos = formData.photos.photos.map(buildPhotoObject)
    } else {
      // Legacy path: Some photos may still need uploading (shouldn't happen with new flow)
      logInfo('Uploading remaining photos to Supabase Storage...')
      try {
        uploadedPhotos = await uploadPhotos(formData.photos.photos, generatedId)
        logInfo('Photos uploaded', uploadedPhotos.length)
      } catch (uploadError) {
        logError('Photo upload failed', uploadError)
        throw new Error('Failed to upload photos: ' + uploadError.message)
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
  const zipCode = formData.spaceSnapshot?.address?.zip
  let boroughId = null
  let hoodId = null

  if (zipCode) {
    logInfo('Looking up borough/hood for zip', zipCode)
    const geoIds = await getGeoIdsByZipCode(zipCode)
    boroughId = geoIds.boroughId
    hoodId = geoIds.hoodId
  }

  // Step 3: Map form data to listing table columns
  // Pass userId for both "Created By" and "Host User", plus geo IDs
  const listingData = mapFormDataToListingTable(formDataWithPhotos, userId, generatedId, userId, boroughId, hoodId)

  // Debug: Log the cancellation policy value being inserted
  logInfo('Cancellation Policy value to insert', listingData['Cancellation Policy'])
  logInfo('Rules from form', formDataWithPhotos.rules)

  // Step 4: Insert directly into listing table
  const { data, error } = await supabase
    .from('listing')
    .insert(listingData)
    .select()
    .single()

  if (error) {
    logError('Error creating listing in Supabase', error)
    logError('Full listing data that failed', JSON.stringify(listingData, null, 2))
    throw new Error(error.message || 'Failed to create listing')
  }

  logInfo('Listing created in listing table with _id', data._id)

  // Step 5: Link listing to user's Listings array using _id
  // This MUST succeed - if it fails, the user won't see their listing
  if (!userId) {
    logError('No userId provided - cannot link listing to user')
    throw new Error('User ID is required to create a listing')
  }

  await linkListingToHost(userId, data._id)
  logInfo('Listing linked to user account')

  // NOTE: Bubble sync disabled - see /docs/tech-debt/BUBBLE_SYNC_DISABLED.md
  // The listing is now created directly in Supabase without Bubble synchronization

  // Step 6: Trigger mockup proposal creation for first-time hosts (non-blocking)
  triggerMockupProposalIfFirstListing(userId, data._id).catch(err => {
    logWarning('Mockup proposal creation failed (non-blocking)', err.message)
  })

  return data
}

/**
 * Append listing ID to array if not already present
 * @pure
 */
const appendListingId = (currentListings, listingId) => {
  if (!currentListings) return [listingId]
  if (currentListings.includes(listingId)) return currentListings
  return [...currentListings, listingId]
}

/**
 * Link a listing to the host's user record
 * Adds the listing _id to the Listings array in the user table
 *
 * Handles both Supabase Auth UUIDs and Bubble IDs:
 * - Supabase UUID (contains dashes): Look up user by email from auth session
 * - Bubble ID (timestamp format): Direct lookup by _id
 *
 * @effectful
 * @param {string} userId - The user's Supabase Auth UUID or Bubble _id
 * @param {string} listingId - The listing's _id (Bubble-compatible ID)
 * @returns {Promise<void>}
 */
async function linkListingToHost(userId, listingId) {
  logInfo('Linking listing _id to host', { userId, listingId })

  let userData = null
  let fetchError = null

  if (isSupabaseUUID(userId)) {
    // Get user email from Supabase Auth session
    logInfo('Detected Supabase Auth UUID, looking up user by email...')
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user?.email) {
      logError('No email found in auth session')
      throw new Error('Could not retrieve user email from session')
    }

    const userEmail = session.user.email
    logInfo('Looking up user by email', userEmail)

    // Look up user by email in public.user table
    // Note: Some users have email in 'email' column, others in 'email as text' (legacy Bubble column)
    const result = await supabase
      .from('user')
      .select('_id, Listings')
      .or(`email.eq.${userEmail},email as text.eq.${userEmail}`)
      .maybeSingle()

    userData = result.data
    fetchError = result.error
  } else {
    // Legacy path: Direct lookup by Bubble _id
    logInfo('Using Bubble ID for user lookup')
    const result = await supabase
      .from('user')
      .select('_id, Listings')
      .eq('_id', userId)
      .maybeSingle()

    userData = result.data
    fetchError = result.error
  }

  if (fetchError) {
    logError('Error fetching user', fetchError)
    throw fetchError
  }

  if (!userData) {
    logError('No user found for userId', userId)
    throw new Error(`User not found: ${userId}`)
  }

  logInfo('Found user with Bubble _id', userData._id)

  // Add the new listing ID to the array (pure operation)
  const updatedListings = appendListingId(userData.Listings, listingId)

  // Update the user with the new Listings array
  const { error: updateError } = await supabase
    .from('user')
    .update({ Listings: updatedListings })
    .eq('_id', userData._id)

  if (updateError) {
    logError('Error updating user Listings', updateError)
    throw updateError
  }

  logInfo('User Listings updated', updatedListings)
}

/**
 * Check if this is the user's first listing
 * @pure
 */
const isFirstListing = (listings) =>
  Array.isArray(listings) && listings.length === 1

/**
 * Build mockup proposal request payload
 * @pure
 */
const buildMockupProposalPayload = (listingId, hostUserId, hostEmail) =>
  Object.freeze({
    action: 'createMockupProposal',
    payload: Object.freeze({
      listingId,
      hostUserId,
      hostEmail,
    }),
  })

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
 * @effectful
 * @param {string} userId - The user's Supabase Auth UUID or Bubble _id
 * @param {string} listingId - The newly created listing's _id
 * @returns {Promise<void>}
 */
async function triggerMockupProposalIfFirstListing(userId, listingId) {
  logInfo('Step 6: Checking if first listing for mockup proposal...')

  let userData = null
  let fetchError = null

  if (isSupabaseUUID(userId)) {
    // Get user email from Supabase Auth session
    logInfo('Detected Supabase Auth UUID, looking up user by email...')
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user?.email) {
      logWarning('No email found in auth session for mockup proposal check')
      return
    }

    const sessionEmail = session.user.email
    logInfo('Looking up user by email for mockup check', sessionEmail)

    // Look up user by email in public.user table
    const result = await supabase
      .from('user')
      .select('_id, email, Listings')
      .or(`email.eq.${sessionEmail},email as text.eq.${sessionEmail}`)
      .maybeSingle()

    userData = result.data
    fetchError = result.error
  } else {
    // Legacy path: Direct lookup by Bubble _id
    logInfo('Using Bubble ID for mockup proposal user lookup')
    const result = await supabase
      .from('user')
      .select('_id, email, Listings')
      .eq('_id', userId)
      .maybeSingle()

    userData = result.data
    fetchError = result.error
  }

  if (fetchError || !userData) {
    logWarning('Could not fetch user for mockup proposal check', fetchError?.message)
    return
  }

  logInfo('Found user for mockup check with Bubble _id', userData._id)

  const listings = userData.Listings || []
  const userEmail = userData.email

  // Only create mockup proposal for first listing
  if (!isFirstListing(listings)) {
    logInfo(`Skipping mockup proposal - not first listing (count: ${listings.length})`)
    return
  }

  if (!userEmail) {
    logWarning('Missing email for mockup proposal')
    return
  }

  logInfo('First listing detected, triggering mockup proposal creation...')

  // Get the Supabase URL from environment or config
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL

  // Call the listing edge function with createMockupProposal action
  // IMPORTANT: Use userData._id (Bubble-compatible ID), not userId (may be Supabase UUID)
  const requestPayload = buildMockupProposalPayload(listingId, userData._id, userEmail)

  const response = await fetch(`${supabaseUrl}/functions/v1/listing`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestPayload),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Edge function returned ${response.status}: ${errorText}`)
  }

  const result = await response.json()
  logInfo('Mockup proposal creation triggered', result)
}

// NOTE: Mapping functions (mapCancellationPolicyToId, mapParkingTypeToId, mapSpaceTypeToId,
// mapStorageOptionToId, mapStateToDisplayName) are defined above in the Pure Mapping Functions section

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

// NOTE: mapAvailableNightsToNames is defined above in the Pure Mapping Functions section

// ============================================================================
// DISABLED FUNCTIONS - Moved to tech-debt
// See /docs/tech-debt/BUBBLE_SYNC_DISABLED.md for details
// ============================================================================

/**
 * Add modified date timestamp to listing data
 * @pure
 */
const addModifiedTimestamp = (listingData) => ({
  ...listingData,
  'Modified Date': new Date().toISOString()
})

/**
 * Update an existing listing in listing table
 * @effectful
 * @param {string} listingId - The listing's _id (Bubble-compatible ID)
 * @param {object} formData - Updated form data (can be flat DB columns or nested SelfListingPage format)
 * @returns {Promise<object>} - Updated listing
 */
export async function updateListing(listingId, formData) {
  logInfo('Updating listing', listingId)

  if (!listingId) {
    throw new Error('Listing ID is required for update')
  }

  // Transform data based on format (pure operations)
  const rawListingData = isFlatDatabaseFormat(formData)
    ? normalizeDatabaseColumns(formData)
    : mapFormDataToListingTableForUpdate(formData)

  logInfo(isFlatDatabaseFormat(formData)
    ? 'Using flat DB format update'
    : 'Using mapped SelfListingPage format')

  const listingData = addModifiedTimestamp(rawListingData)

  const { data, error } = await supabase
    .from('listing')
    .update(listingData)
    .eq('_id', listingId)
    .select()
    .single()

  if (error) {
    logError('Error updating listing', error)
    throw new Error(error.message || 'Failed to update listing')
  }

  logInfo('Listing updated', data._id)
  return data
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

// NOTE: isFlatDatabaseFormat and normalizeDatabaseColumns are defined above in the Pure Mapping Functions section

/**
 * Check if error is a "not found" PostgreSQL error
 * @pure
 */
const isNotFoundError = (error) =>
  error?.code === 'PGRST116'

/**
 * Get a listing by _id from listing table
 * @effectful
 * @param {string} listingId - The listing's _id (Bubble-compatible ID)
 * @returns {Promise<object|null>} - Listing data or null if not found
 */
export async function getListingById(listingId) {
  logInfo('Fetching listing', listingId)

  if (!listingId) {
    throw new Error('Listing ID is required')
  }

  const { data, error } = await supabase
    .from('listing')
    .select('*')
    .eq('_id', listingId)
    .single()

  if (error) {
    if (isNotFoundError(error)) {
      logInfo('Listing not found', listingId)
      return null
    }
    logError('Error fetching listing', error)
    throw new Error(error.message || 'Failed to fetch listing')
  }

  // Check if listing is soft-deleted
  if (isDeleted(data)) {
    logInfo('Listing is soft-deleted', listingId)
    return null
  }

  logInfo('Listing fetched', data._id)
  return data
}

/**
 * Create draft form data by merging with isDraft flag
 * @pure
 */
const createDraftFormData = (formData) => ({
  ...formData,
  isDraft: true
})

/**
 * Save a draft listing
 * Note: Drafts are now primarily saved to localStorage via the store.
 * This function creates/updates a listing in the database if needed.
 *
 * @effectful
 * @param {object} formData - Form data to save as draft
 * @param {string|null} existingId - Existing listing _id if updating
 * @returns {Promise<object>} - Saved listing
 */
export async function saveDraft(formData, existingId = null) {
  logInfo('Saving draft, existingId', existingId)

  const draftFormData = createDraftFormData(formData)

  return existingId
    ? updateListing(existingId, draftFormData)
    : createListing(draftFormData)
}

// ============================================================================
// DATABASE → FORM DATA MAPPING
// NOTE: mapAvailableNightsToArray and mapNightlyRatesToColumns are defined
// above in the Pure Mapping Functions section
// ============================================================================

/**
 * Map for converting 1-based day numbers back to day names
 * @constant
 */
const DAY_NUMBER_TO_NAME_MAP = Object.freeze({
  1: 'sunday',
  2: 'monday',
  3: 'tuesday',
  4: 'wednesday',
  5: 'thursday',
  6: 'friday',
  7: 'saturday',
})

/**
 * Default available nights object (all false)
 * @pure
 */
const createDefaultAvailableNights = () =>
  Object.freeze({
    sunday: false,
    monday: false,
    tuesday: false,
    wednesday: false,
    thursday: false,
    friday: false,
    saturday: false,
  })

/**
 * Map array of 1-based day numbers to available nights object
 * @pure
 * @param {number[]} daysArray - Array of 1-based day numbers
 * @returns {object} - {sunday: bool, monday: bool, ...}
 */
const mapArrayToAvailableNights = (daysArray) => {
  const defaults = createDefaultAvailableNights()

  if (!Array.isArray(daysArray)) return defaults

  const result = { ...defaults }
  for (const dayNum of daysArray) {
    const dayName = DAY_NUMBER_TO_NAME_MAP[dayNum]
    if (dayName) {
      result[dayName] = true
    }
  }

  return Object.freeze(result)
}

/**
 * Build space snapshot section from database record
 * @pure
 */
const buildSpaceSnapshotFromDb = (dbRecord) => {
  const address = dbRecord['Location - Address'] || {}
  const coordinates = dbRecord['Location - Coordinates'] || {}

  return Object.freeze({
    listingName: dbRecord.Name || '',
    typeOfSpace: dbRecord['Features - Type of Space'] || '',
    bedrooms: dbRecord['Features - Qty Bedrooms'] || 2,
    beds: dbRecord['Features - Qty Beds'] || 2,
    bathrooms: dbRecord['Features - Qty Bathrooms'] || 2.5,
    typeOfKitchen: dbRecord['Kitchen Type'] || '',
    typeOfParking: dbRecord['Features - Parking type'] || '',
    address: Object.freeze({
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
    }),
  })
}

/**
 * Build features section from database record
 * @pure
 */
const buildFeaturesFromDb = (dbRecord) =>
  Object.freeze({
    amenitiesInsideUnit: dbRecord['Features - Amenities In-Unit'] || [],
    amenitiesOutsideUnit: dbRecord['Features - Amenities In-Building'] || [],
    descriptionOfLodging: dbRecord.Description || '',
    neighborhoodDescription: dbRecord['Description - Neighborhood'] || '',
  })

/**
 * Build lease styles section from database record
 * @pure
 */
const buildLeaseStylesFromDb = (dbRecord) =>
  Object.freeze({
    rentalType: dbRecord['rental type'] || DEFAULT_VALUES.RENTAL_TYPE,
    availableNights: mapArrayToAvailableNights(dbRecord['Days Available (List of Days)']),
    weeklyPattern: dbRecord.weekly_pattern || '',
    subsidyAgreement: dbRecord.subsidy_agreement || false,
  })

/**
 * Build pricing section from database record
 * @pure
 */
const buildPricingFromDb = (dbRecord) =>
  Object.freeze({
    damageDeposit: dbRecord['💰Damage Deposit'] || 500,
    maintenanceFee: dbRecord['💰Cleaning Cost / Maintenance Fee'] || 0,
    weeklyCompensation: dbRecord['💰Weekly Host Rate'] || null,
    monthlyCompensation: dbRecord['💰Monthly Host Rate'] || null,
    nightlyPricing: dbRecord.nightly_pricing || null,
  })

/**
 * Build rules section from database record
 * @pure
 */
const buildRulesFromDb = (dbRecord) =>
  Object.freeze({
    cancellationPolicy: dbRecord['Cancellation Policy'] || '',
    preferredGender: dbRecord['Preferred Gender'] || DEFAULT_VALUES.PREFERRED_GENDER,
    numberOfGuests: dbRecord['Features - Qty Guests'] || DEFAULT_VALUES.NUMBER_OF_GUESTS,
    checkInTime: dbRecord['NEW Date Check-in Time'] || DEFAULT_VALUES.CHECK_IN_TIME,
    checkOutTime: dbRecord['NEW Date Check-out Time'] || DEFAULT_VALUES.CHECK_OUT_TIME,
    idealMinDuration: dbRecord.ideal_min_duration || 2,
    idealMaxDuration: dbRecord.ideal_max_duration || 6,
    houseRules: dbRecord['Features - House Rules'] || [],
    blockedDates: dbRecord['Dates - Blocked'] || [],
  })

/**
 * Build photos section from database record
 * @pure
 */
const buildPhotosFromDb = (dbRecord) =>
  Object.freeze({
    photos: (dbRecord['Features - Photos'] || []).map(buildPhotoObject),
    minRequired: 3,
  })

/**
 * Build review section from database record
 * @pure
 */
const buildReviewFromDb = (dbRecord) =>
  Object.freeze({
    safetyFeatures: dbRecord['Features - Safety'] || [],
    squareFootage: dbRecord['Features - SQFT Area'] || null,
    firstDayAvailable: dbRecord[' First Available'] || '',
    agreedToTerms: dbRecord.agreed_to_terms || false,
    optionalNotes: dbRecord.optional_notes || '',
    previousReviewsLink: dbRecord.previous_reviews_link || '',
  })

/**
 * Map database record back to form data structure
 * Used when loading an existing listing for editing
 * @pure
 * @param {object} dbRecord - Database record from listing table
 * @returns {object|null} - Form data structure for SelfListingPage
 */
export function mapDatabaseToFormData(dbRecord) {
  if (!dbRecord) return null

  const formMetadata = dbRecord.form_metadata || {}

  return Object.freeze({
    id: dbRecord.id,
    spaceSnapshot: buildSpaceSnapshotFromDb(dbRecord),
    features: buildFeaturesFromDb(dbRecord),
    leaseStyles: buildLeaseStylesFromDb(dbRecord),
    pricing: buildPricingFromDb(dbRecord),
    rules: buildRulesFromDb(dbRecord),
    photos: buildPhotosFromDb(dbRecord),
    review: buildReviewFromDb(dbRecord),
    currentSection: formMetadata.currentSection || 1,
    completedSections: formMetadata.completedSections || [],
    isDraft: formMetadata.isDraft !== false,
    isSubmitted: formMetadata.isSubmitted || false,
    hostType: dbRecord.host_type || null,
    marketStrategy: dbRecord.market_strategy || DEFAULT_VALUES.MARKET_STRATEGY,
  })
}

// ─────────────────────────────────────────────────────────────
// Exported Constants (for testing)
// ─────────────────────────────────────────────────────────────

export const __test__ = Object.freeze({
  // Constants
  CANCELLATION_POLICY_MAP,
  PARKING_TYPE_MAP,
  SPACE_TYPE_MAP,
  STORAGE_OPTION_MAP,
  STATE_ABBREVIATION_MAP,
  DAY_INDEX_MAP,
  DAY_NAME_MAP,
  DAY_ORDER,
  DAY_NUMBER_TO_NAME_MAP,
  DEFAULT_VALUES,

  // Validation predicates
  isValidZipCode,
  isSupabaseUUID,
  isFlatDatabaseFormat,
  isDeleted,
  allPhotosHaveUrls,
  isNotFoundError,
  isFirstListing,

  // Pure mapping functions
  cleanZipCode,
  mapCancellationPolicyToId,
  mapParkingTypeToId,
  mapSpaceTypeToId,
  mapStorageOptionToId,
  mapStateToDisplayName,
  mapAvailableNightsToArray,
  mapAvailableNightsToNames,
  mapNightlyRatesToColumns,
  mapArrayToAvailableNights,
  normalizeDatabaseColumns,
  buildPhotoObject,
  buildAddressObject,
  appendListingId,
  buildMockupProposalPayload,
  addModifiedTimestamp,
  createDraftFormData,

  // Database to form data builders
  buildSpaceSnapshotFromDb,
  buildFeaturesFromDb,
  buildLeaseStylesFromDb,
  buildPricingFromDb,
  buildRulesFromDb,
  buildPhotosFromDb,
  buildReviewFromDb,
  createDefaultAvailableNights,
})
