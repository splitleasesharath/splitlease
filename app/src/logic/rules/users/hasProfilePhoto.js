// ─────────────────────────────────────────────────────────────
// Validation Predicates (Pure Functions)
// ─────────────────────────────────────────────────────────────
const isNullish = (value) => value === null || value === undefined
const isString = (value) => typeof value === 'string'
const isNonEmptyString = (value) => isString(value) && value.trim().length > 0

/**
 * Determines if a user has a valid profile photo URL.
 *
 * @function hasProfilePhoto
 * @intent Check if user has uploaded a profile photo to display in UI
 * @rule A profile photo is valid if the URL is a non-empty string
 * @rule Empty strings, null, and undefined are considered "no photo"
 * @pure Yes - deterministic, no side effects
 *
 * @param {object} params - Named parameters
 * @param {string|null|undefined} params.photoUrl - The profile photo URL from user data
 * @returns {boolean} True if user has a valid profile photo URL
 *
 * @example
 * hasProfilePhoto({ photoUrl: 'https://example.com/photo.jpg' }) // true
 * hasProfilePhoto({ photoUrl: '' }) // false
 * hasProfilePhoto({ photoUrl: null }) // false
 * hasProfilePhoto({ photoUrl: undefined }) // false
 */
export function hasProfilePhoto({ photoUrl }) {
  // Nullish values mean no photo
  if (isNullish(photoUrl)) {
    return false
  }

  // Non-string values mean no valid photo
  if (!isString(photoUrl)) {
    return false
  }

  // Predicate composition: non-empty trimmed string = valid photo URL
  return isNonEmptyString(photoUrl)
}
