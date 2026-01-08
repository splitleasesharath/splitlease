// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────
const PHOTOS_FIELD = 'Features - Photos'

// ─────────────────────────────────────────────────────────────
// Validation Predicates (Pure Functions)
// ─────────────────────────────────────────────────────────────
const isNullish = (value) => value === null || value === undefined
const isString = (value) => typeof value === 'string'
const isNonEmptyArray = (arr) => Array.isArray(arr) && arr.length > 0

// ─────────────────────────────────────────────────────────────
// Photo Helpers (Pure Functions)
// ─────────────────────────────────────────────────────────────

/**
 * Safely parse JSON string to array
 * Returns empty array on failure (pure, no exceptions)
 * @pure
 */
const safeParseJsonArray = (jsonString) => {
  try {
    const parsed = JSON.parse(jsonString)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/**
 * Normalize photos value to array (handles string or array input)
 * @pure
 */
const normalizePhotos = (photos) => {
  if (isNullish(photos)) {
    return []
  }
  if (isString(photos)) {
    return safeParseJsonArray(photos)
  }
  if (Array.isArray(photos)) {
    return photos
  }
  return []
}

/**
 * Check if a listing has photos.
 *
 * @intent Validate that a listing has at least one photo for search display.
 * @rule Listings without photos must not appear in search results.
 * @pure Yes - deterministic, no side effects
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
  // Validation: Listing must exist
  if (isNullish(listing)) {
    throw new Error('hasListingPhotos: listing cannot be null or undefined')
  }

  // Pure transformation pipeline
  const photos = listing[PHOTOS_FIELD]
  const normalizedPhotos = normalizePhotos(photos)

  return isNonEmptyArray(normalizedPhotos)
}

// ─────────────────────────────────────────────────────────────
// Exported Constants (for testing)
// ─────────────────────────────────────────────────────────────
export { PHOTOS_FIELD }
