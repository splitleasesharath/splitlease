/**
 * Extract Listing Coordinates Processor
 *
 * PILLAR III: Processors (The "Transform" Layer)
 *
 * Extract coordinates from listing's JSONB location fields.
 * Priority: "Location - slightly different address" (privacy) → "Location - Address" (main).
 *
 * @intent Extract lat/lng coordinates from listing location data with privacy prioritization.
 * @rule NO FALLBACK: Returns null if no valid coordinates found.
 * @rule Priority 1: Use "Location - slightly different address" for privacy/pin separation.
 * @rule Priority 2: Use "Location - Address" as fallback.
 * @pure Yes - deterministic (console logs are for debugging only)
 */

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const COORDINATE_SOURCES = Object.freeze({
  SLIGHTLY_DIFFERENT: 'slightly-different-address',
  MAIN_ADDRESS: 'main-address'
})

// ─────────────────────────────────────────────────────────────
// Validation Predicates (Pure Functions)
// ─────────────────────────────────────────────────────────────

const isString = (value) => typeof value === 'string'
const isNumber = (value) => typeof value === 'number'
const isNonEmptyString = (value) => isString(value) && value.length > 0
const isNullish = (value) => value === null || value === undefined

/**
 * Check if location object has valid coordinates
 * @pure
 */
const hasValidCoordinates = (location) =>
  !isNullish(location) &&
  isNumber(location.lat) &&
  isNumber(location.lng)

// ─────────────────────────────────────────────────────────────
// Pure Transformation Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Safely parse JSON string
 * @pure (returns null on failure instead of throwing)
 */
const safeParseJson = (jsonString) => {
  try {
    return JSON.parse(jsonString)
  } catch {
    return null
  }
}

/**
 * Parse location field - handles both object and string formats
 * @pure
 */
const parseLocationField = (field) => {
  if (isNullish(field)) {
    return null
  }
  if (isString(field)) {
    return safeParseJson(field)
  }
  return field
}

/**
 * Build coordinates result object
 * @pure
 */
const buildCoordinatesResult = (location, source) =>
  Object.freeze({
    lat: location.lat,
    lng: location.lng,
    source
  })

/**
 * Try to extract coordinates from a location with given source
 * @pure
 */
const tryExtractCoordinates = (location, source) =>
  hasValidCoordinates(location)
    ? buildCoordinatesResult(location, source)
    : null

// ─────────────────────────────────────────────────────────────
// Main Processor
// ─────────────────────────────────────────────────────────────

/**
 * Extract coordinates from listing's JSONB location fields.
 * @pure
 *
 * @param {object} params - Named parameters.
 * @param {object|string|null} params.locationSlightlyDifferent - JSONB field for privacy-adjusted address.
 * @param {object|string|null} params.locationAddress - JSONB field for main address.
 * @param {string} params.listingId - Listing ID for error logging.
 * @returns {object|null} Coordinates object { lat, lng, source } or null if invalid.
 *
 * @throws {Error} If listingId is not provided.
 *
 * @example
 * const coords = extractListingCoordinates({
 *   locationSlightlyDifferent: { lat: 40.7128, lng: -74.0060 },
 *   locationAddress: { lat: 40.7127, lng: -74.0061 },
 *   listingId: 'listing_123'
 * })
 * // => { lat: 40.7128, lng: -74.0060, source: 'slightly-different-address' }
 */
export function extractListingCoordinates({
  locationSlightlyDifferent,
  locationAddress,
  listingId
}) {
  // Validation: listingId is required
  if (!isNonEmptyString(listingId)) {
    throw new Error(
      'extractListingCoordinates: listingId is required and must be a string'
    )
  }

  // Parse both location fields
  const parsedSlightlyDifferent = parseLocationField(locationSlightlyDifferent)
  const parsedAddress = parseLocationField(locationAddress)

  // Priority 1: Try slightly different address (privacy)
  const slightlyDifferentCoords = tryExtractCoordinates(
    parsedSlightlyDifferent,
    COORDINATE_SOURCES.SLIGHTLY_DIFFERENT
  )

  if (slightlyDifferentCoords) {
    return slightlyDifferentCoords
  }

  // Priority 2: Try main address
  const mainAddressCoords = tryExtractCoordinates(
    parsedAddress,
    COORDINATE_SOURCES.MAIN_ADDRESS
  )

  if (mainAddressCoords) {
    return mainAddressCoords
  }

  // No valid coordinates found - log warning for debugging
  console.warn('⚠️ extractListingCoordinates: No valid coordinates found for listing:', {
    listingId,
    hasSlightlyDifferent: !isNullish(parsedSlightlyDifferent),
    hasMainAddress: !isNullish(parsedAddress)
  })

  return null
}

// ─────────────────────────────────────────────────────────────
// Exported Constants (for testing)
// ─────────────────────────────────────────────────────────────
export { COORDINATE_SOURCES }
