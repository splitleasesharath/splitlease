/**
 * Extract coordinates from listing's JSONB location fields.
 * Priority: "Location - slightly different address" (privacy) → "Location - Address" (main).
 *
 * @intent Extract lat/lng coordinates from listing location data with privacy prioritization.
 * @rule NO FALLBACK: Returns null if no valid coordinates found (listings without coordinates must be filtered out).
 * @rule Priority 1: Use "Location - slightly different address" for privacy/pin separation.
 * @rule Priority 2: Use "Location - Address" as fallback.
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
  // No Fallback: Validate listing ID
  if (!listingId || typeof listingId !== 'string') {
    throw new Error(
      `extractListingCoordinates: listingId is required and must be a string`
    )
  }

  // Parse JSONB fields if they're strings
  let parsedSlightlyDifferent = locationSlightlyDifferent
  let parsedAddress = locationAddress

  if (typeof locationSlightlyDifferent === 'string') {
    try {
      parsedSlightlyDifferent = JSON.parse(locationSlightlyDifferent)
    } catch (error) {
      console.error(
        '❌ extractListingCoordinates: Failed to parse Location - slightly different address:',
        {
          listingId,
          rawValue: locationSlightlyDifferent,
          error: error.message
        }
      )
      parsedSlightlyDifferent = null
    }
  }

  if (typeof locationAddress === 'string') {
    try {
      parsedAddress = JSON.parse(locationAddress)
    } catch (error) {
      console.error('❌ extractListingCoordinates: Failed to parse Location - Address:', {
        listingId,
        rawValue: locationAddress,
        error: error.message
      })
      parsedAddress = null
    }
  }

  // Priority 1: Check slightly different address
  if (
    parsedSlightlyDifferent &&
    typeof parsedSlightlyDifferent.lat === 'number' &&
    typeof parsedSlightlyDifferent.lng === 'number'
  ) {
    return {
      lat: parsedSlightlyDifferent.lat,
      lng: parsedSlightlyDifferent.lng,
      source: 'slightly-different-address'
    }
  }

  // Priority 2: Check main address
  if (
    parsedAddress &&
    typeof parsedAddress.lat === 'number' &&
    typeof parsedAddress.lng === 'number'
  ) {
    return {
      lat: parsedAddress.lat,
      lng: parsedAddress.lng,
      source: 'main-address'
    }
  }

  // No Fallback: Return null if no valid coordinates found
  console.warn('⚠️ extractListingCoordinates: No valid coordinates found for listing:', {
    listingId,
    hasSlightlyDifferent: !!parsedSlightlyDifferent,
    hasMainAddress: !!parsedAddress
  })

  return null
}
