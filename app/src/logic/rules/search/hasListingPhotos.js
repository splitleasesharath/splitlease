/**
 * Check if a listing has photos.
 *
 * @intent Validate that a listing has at least one photo for search display.
 * @rule Listings without photos must not appear in search results.
 *
 * @param {object} params - Named parameters.
 * @param {object} params.listing - The listing object to check.
 * @returns {boolean} True if listing has at least one photo.
 *
 * @throws {Error} If listing is null or undefined.
 *
 * @example
 * const valid = hasListingPhotos({ listing: { 'Features - Photos': ['photo1'] } })
 * // => true
 *
 * const invalid = hasListingPhotos({ listing: { 'Features - Photos': [] } })
 * // => false
 */
export function hasListingPhotos({ listing }) {
  // No Fallback: Validate input
  if (listing === null || listing === undefined) {
    throw new Error('hasListingPhotos: listing cannot be null or undefined')
  }

  const photos = listing['Features - Photos']

  // Check for null, undefined, or empty array
  if (!photos) {
    return false
  }

  // Handle string representation (JSON array from database)
  if (typeof photos === 'string') {
    try {
      const parsed = JSON.parse(photos)
      return Array.isArray(parsed) && parsed.length > 0
    } catch {
      return false
    }
  }

  // Handle array directly
  if (Array.isArray(photos)) {
    return photos.length > 0
  }

  return false
}
