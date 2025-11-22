/**
 * Determines if a user has a valid profile photo URL.
 *
 * @function hasProfilePhoto
 * @intent Check if user has uploaded a profile photo to display in UI
 * @rule A profile photo is valid if the URL is a non-empty string
 * @rule Empty strings, null, and undefined are considered "no photo"
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
  // NO FALLBACK: Explicit check without defaulting
  if (photoUrl === null || photoUrl === undefined) {
    return false;
  }

  // Check if photoUrl is a non-empty string
  if (typeof photoUrl !== 'string') {
    return false;
  }

  // Empty string is considered "no photo"
  return photoUrl.trim().length > 0;
}
