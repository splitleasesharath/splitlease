/**
 * Supabase Utilities Module
 *
 * Centralized data fetching logic for photos, hosts, and amenities.
 * Follows NO FALLBACK principle - returns real data or empty/null values.
 *
 * @module supabaseUtils
 */

import { supabase } from './supabase.js';
import { DATABASE } from './constants.js';

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const TABLE_NAMES = Object.freeze({
  LISTING_PHOTO: 'listing_photo',
  USER: 'user'
})

const FIELD_NAMES = Object.freeze({
  ID: '_id',
  PHOTO: 'Photo',
  FULL_NAME: 'Name - Full',
  PROFILE_PHOTO: 'Profile Photo',
  FEATURES: 'Features',
  KITCHEN_TYPE: 'Kitchen Type'
})

const URL_PROTOCOL = Object.freeze({
  HTTPS: 'https:',
  PROTOCOL_RELATIVE_PREFIX: '//'
})

const LOG_PREFIX = '[supabaseUtils]'

/**
 * Amenities configuration with icons and priority
 */
const AMENITIES_MAP = Object.freeze({
  'wifi': { icon: '📶', name: 'WiFi', priority: 1 },
  'furnished': { icon: '🛋️', name: 'Furnished', priority: 2 },
  'pet': { icon: '🐕', name: 'Pet-Friendly', priority: 3 },
  'dog': { icon: '🐕', name: 'Pet-Friendly', priority: 3 },
  'cat': { icon: '🐕', name: 'Pet-Friendly', priority: 3 },
  'washer': { icon: '🧺', name: 'Washer/Dryer', priority: 4 },
  'dryer': { icon: '🧺', name: 'Washer/Dryer', priority: 4 },
  'parking': { icon: '🅿️', name: 'Parking', priority: 5 },
  'elevator': { icon: '🏢', name: 'Elevator', priority: 6 },
  'gym': { icon: '💪', name: 'Gym', priority: 7 },
  'doorman': { icon: '🚪', name: 'Doorman', priority: 8 },
  'ac': { icon: '❄️', name: 'A/C', priority: 9 },
  'air conditioning': { icon: '❄️', name: 'A/C', priority: 9 },
  'kitchen': { icon: '🍳', name: 'Kitchen', priority: 10 },
  'balcony': { icon: '🌿', name: 'Balcony', priority: 11 },
  'workspace': { icon: '💻', name: 'Workspace', priority: 12 },
  'desk': { icon: '💻', name: 'Workspace', priority: 12 }
})

// ─────────────────────────────────────────────────────────────
// Validation Predicates (Pure Functions)
// ─────────────────────────────────────────────────────────────

/**
 * Check if value is an array
 * @pure
 */
const isArray = (value) => Array.isArray(value)

/**
 * Check if value is a string
 * @pure
 */
const isString = (value) => typeof value === 'string'

/**
 * Check if value is an object (not null)
 * @pure
 */
const isObject = (value) => typeof value === 'object' && value !== null

/**
 * Check if array has elements
 * @pure
 */
const hasElements = (arr) => isArray(arr) && arr.length > 0

/**
 * Check if URL starts with protocol-relative prefix
 * @pure
 */
const isProtocolRelativeUrl = (url) =>
  url.startsWith(URL_PROTOCOL.PROTOCOL_RELATIVE_PREFIX)

/**
 * Check if URL is valid (starts with http, https, or //)
 * @pure
 */
const isValidUrl = (url) =>
  url.startsWith('http://') ||
  url.startsWith('https://') ||
  isProtocolRelativeUrl(url)

// ─────────────────────────────────────────────────────────────
// Pure Helper Functions
// ─────────────────────────────────────────────────────────────

/**
 * Normalize URL by adding https: protocol if needed
 * @pure
 */
const normalizeUrl = (url) =>
  isProtocolRelativeUrl(url)
    ? URL_PROTOCOL.HTTPS + url
    : url

/**
 * Safe JSON parse with empty array fallback
 * @pure
 */
const safeJsonParse = (str) => {
  try {
    const parsed = JSON.parse(str)
    return isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/**
 * Sort amenities by priority
 * @pure
 */
const sortByPriority = (arr) =>
  [...arr].sort((a, b) => a.priority - b.priority)

// ─────────────────────────────────────────────────────────────
// Main Functions
// ─────────────────────────────────────────────────────────────

/**
 * Parse a value that may be a native array or stringified JSON array
 *
 * Supabase JSONB fields can be returned as either:
 * - Native JavaScript arrays: ["Monday", "Tuesday"]
 * - Stringified JSON arrays: '["Monday", "Tuesday"]'
 *
 * This utility handles both cases robustly, following the NO FALLBACK principle.
 * @pure
 * @param {any} value - Value from Supabase JSONB field
 * @returns {Array} - Parsed array or empty array if parsing fails
 */
export function parseJsonArray(value) {
  // Already a native array? Return as-is
  if (isArray(value)) {
    return value;
  }

  // Stringified JSON? Try to parse
  if (isString(value)) {
    const parsed = safeJsonParse(value)
    if (parsed.length === 0 && value.length > 0) {
      console.warn(`${LOG_PREFIX} Failed to parse JSON array:`, { value });
    }
    return parsed;
  }

  // Unexpected type (null, undefined, object, number, etc.)
  if (value != null) {
    console.warn(`${LOG_PREFIX} Unexpected type for JSONB array field:`, { type: typeof value, value });
  }
  return []; // Return empty array - NO FALLBACK
}

/**
 * Transform photo record to URL entry
 * @pure
 */
const transformPhotoRecord = (photo) => {
  if (!photo[FIELD_NAMES.PHOTO]) return null
  return normalizeUrl(photo[FIELD_NAMES.PHOTO])
}

/**
 * Build photo map from data array
 * @pure
 */
const buildPhotoMap = (data) =>
  data.reduce((acc, photo) => {
    const url = transformPhotoRecord(photo)
    if (url) {
      acc[photo[FIELD_NAMES.ID]] = url
    }
    return acc
  }, {})

/**
 * Fetch photo URLs in batch from database
 * @effectful - makes network request
 * @param {Array<string>} photoIds - Array of photo IDs to fetch
 * @returns {Promise<Object>} Map of photo ID to photo URL
 */
export async function fetchPhotoUrls(photoIds) {
  console.log(`${LOG_PREFIX} 🔍 fetchPhotoUrls called with`, photoIds?.length || 0, 'photo IDs');

  if (!hasElements(photoIds)) {
    console.log(`${LOG_PREFIX} ⚠️ fetchPhotoUrls: No photo IDs provided, returning empty map`);
    return {};
  }

  console.log(`${LOG_PREFIX} 🔍 fetchPhotoUrls: Sample IDs:`, photoIds.slice(0, 3));

  try {
    console.log(`${LOG_PREFIX} 🔍 fetchPhotoUrls: Querying listing_photo table...`);
    const { data, error } = await supabase
      .from(TABLE_NAMES.LISTING_PHOTO)
      .select(`${FIELD_NAMES.ID}, ${FIELD_NAMES.PHOTO}`)
      .in(FIELD_NAMES.ID, photoIds);

    console.log(`${LOG_PREFIX} 🔍 fetchPhotoUrls: Query completed`, {
      dataLength: data?.length || 0,
      error: error?.message || null
    });

    if (error) {
      console.error(`${LOG_PREFIX} ❌ Error fetching photos:`, error);
      return {};
    }

    if (!hasElements(data)) {
      console.warn(`${LOG_PREFIX} ⚠️ fetchPhotoUrls: Query returned no data for`, photoIds.length, 'IDs');
      return {};
    }

    const photoMap = buildPhotoMap(data)
    console.log(`${LOG_PREFIX} ✅ Fetched ${Object.keys(photoMap).length} photo URLs from ${data.length} records`);
    return photoMap;
  } catch (error) {
    console.error(`${LOG_PREFIX} ❌ Error in fetchPhotoUrls:`, error);
    return {};
  }
}

/**
 * Transform user record to host entry
 * @pure
 */
const transformUserToHost = (user) => {
  const profilePhoto = user[FIELD_NAMES.PROFILE_PHOTO]
  const normalizedPhoto = profilePhoto ? normalizeUrl(profilePhoto) : null

  return Object.freeze({
    name: user[FIELD_NAMES.FULL_NAME] || null,
    image: normalizedPhoto,
    verified: false,
    userId: user[FIELD_NAMES.ID]
  })
}

/**
 * Build host map from user data array
 * @pure
 */
const buildHostMap = (userData) =>
  userData.reduce((acc, user) => {
    acc[user[FIELD_NAMES.ID]] = transformUserToHost(user)
    return acc
  }, {})

/**
 * Fetch host data in batch from database
 * After migration, hostIds are always user._id values (Host User column)
 * @effectful - makes network request
 * @param {Array<string>} hostIds - Array of host IDs (user._id)
 * @returns {Promise<Object>} Map of host ID to host data {name, image, verified}
 */
export async function fetchHostData(hostIds) {
  if (!hasElements(hostIds)) {
    return {};
  }

  try {
    const { data: userData, error: userError } = await supabase
      .from(TABLE_NAMES.USER)
      .select(`${FIELD_NAMES.ID}, "${FIELD_NAMES.FULL_NAME}", "${FIELD_NAMES.PROFILE_PHOTO}"`)
      .in(FIELD_NAMES.ID, hostIds);

    if (userError) {
      console.error(`${LOG_PREFIX} ❌ Error fetching user data by _id:`, userError);
      return {};
    }

    if (!hasElements(userData)) {
      return {};
    }

    const hostMap = buildHostMap(userData)
    console.log(`${LOG_PREFIX} ✅ Fetched host data for ${Object.keys(hostMap).length} hosts`);
    return hostMap;
  } catch (error) {
    console.error(`${LOG_PREFIX} ❌ Error in fetchHostData:`, error);
    return {};
  }
}

/**
 * Extract URL from photo object
 * @pure
 */
const extractPhotoUrl = (photoObj) => {
  const rawUrl = photoObj.url || photoObj[FIELD_NAMES.PHOTO] || null
  return rawUrl ? normalizeUrl(rawUrl) : null
}

/**
 * Process a single photo item (object, URL string, or legacy ID)
 * @pure
 */
const processPhotoItem = (photo, photoMap) => {
  // New embedded format: photo is an object with url/Photo field
  if (isObject(photo)) {
    return extractPhotoUrl(photo)
  }

  // String format: could be a direct URL or a legacy ID
  if (isString(photo)) {
    // Check if it's already a valid URL
    if (isValidUrl(photo)) {
      return normalizeUrl(photo)
    }

    // Legacy format: photo is an ID string - look up in photoMap
    return photoMap[photo] || null
  }

  return null
}

/**
 * Extract photos from Supabase photos field.
 * Handles three formats:
 * 1. Embedded objects: [{id, url, Photo, ...}, ...]
 * 2. Direct URL strings: ["https://...", "https://...", ...]
 * 3. Legacy IDs (deprecated): ["photoId1", "photoId2"] - requires photoMap
 *
 * @pure
 * @param {Array|string} photosField - Array of photo objects/URLs/IDs or JSON string
 * @param {Object} photoMap - Map of photo IDs to URLs (only needed for legacy ID format)
 * @param {string} listingId - Listing ID for debugging purposes
 * @returns {Array<string>} Array of photo URLs (empty array if none found)
 */
export function extractPhotos(photosField, photoMap = {}, listingId = null) {
  const photos = parseJsonArray(photosField);

  if (!hasElements(photos)) {
    return [];
  }

  const photoUrls = photos
    .map(photo => processPhotoItem(photo, photoMap))
    .filter(Boolean)

  if (!hasElements(photoUrls)) {
    console.warn(`${LOG_PREFIX} ⚠️ Listing ${listingId}: NO VALID PHOTO URLS RESOLVED`);
  }

  return photoUrls;
}

/**
 * Extract features text from listing as lowercase string
 * @pure
 */
const extractFeaturesText = (dbListing) => {
  const features = dbListing[FIELD_NAMES.FEATURES]
  return isString(features) ? features.toLowerCase() : ''
}

/**
 * Check if kitchen amenity should be added based on Kitchen Type field
 * @pure
 */
const hasKitchenAmenity = (dbListing) => {
  const kitchenType = dbListing[FIELD_NAMES.KITCHEN_TYPE]
  return isString(kitchenType) && kitchenType.toLowerCase().includes('kitchen')
}

/**
 * Find matching amenities from features text
 * @pure
 */
const findMatchingAmenities = (featureText) => {
  const foundNames = new Set()
  const amenities = []

  for (const [key, amenity] of Object.entries(AMENITIES_MAP)) {
    if (featureText.includes(key) && !foundNames.has(amenity.name)) {
      amenities.push(amenity)
      foundNames.add(amenity.name)
    }
  }

  return { amenities, foundNames }
}

/**
 * Parse amenities from database fields and return prioritized list with icons
 * @pure
 * @param {Object} dbListing - Raw listing from database
 * @returns {Array} Array of amenity objects with icon, name, and priority
 */
export function parseAmenities(dbListing) {
  const featureText = extractFeaturesText(dbListing)
  const { amenities, foundNames } = findMatchingAmenities(featureText)

  // Add kitchen amenity if Kitchen Type field indicates it and not already found
  if (hasKitchenAmenity(dbListing) && !foundNames.has('Kitchen')) {
    amenities.push(AMENITIES_MAP['kitchen'])
  }

  return sortByPriority(amenities)
}

// ─────────────────────────────────────────────────────────────
// Exported Constants (for testing)
// ─────────────────────────────────────────────────────────────
export {
  TABLE_NAMES,
  FIELD_NAMES,
  URL_PROTOCOL,
  AMENITIES_MAP,
  LOG_PREFIX
}
