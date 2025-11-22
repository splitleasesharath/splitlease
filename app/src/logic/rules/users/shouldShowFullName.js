/**
 * Determines if the full user name (first + last) should be displayed.
 *
 * @function shouldShowFullName
 * @intent Business rule for when to show full name vs first name only
 * @rule Show full name only if lastName exists and viewport is not mobile
 * @rule Mobile viewports show first name only for space conservation
 * @rule If no lastName, always show first name only
 *
 * @param {object} params - Named parameters
 * @param {string} params.firstName - User's first name (required)
 * @param {string|null|undefined} params.lastName - User's last name (optional)
 * @param {boolean} params.isMobile - Whether the viewport is mobile sized
 * @returns {boolean} True if full name should be displayed
 *
 * @example
 * shouldShowFullName({ firstName: 'John', lastName: 'Doe', isMobile: false }) // true
 * shouldShowFullName({ firstName: 'John', lastName: 'Doe', isMobile: true }) // false
 * shouldShowFullName({ firstName: 'John', lastName: null, isMobile: false }) // false
 */
export function shouldShowFullName({ firstName, lastName, isMobile }) {
  // NO FALLBACK: firstName is required
  if (typeof firstName !== 'string' || firstName.trim().length === 0) {
    throw new Error('shouldShowFullName requires a valid firstName');
  }

  // Validate isMobile is a boolean
  if (typeof isMobile !== 'boolean') {
    throw new Error('shouldShowFullName requires isMobile to be a boolean');
  }

  // Don't show full name on mobile (space constraints)
  if (isMobile) {
    return false;
  }

  // Don't show full name if lastName is missing or empty
  if (lastName === null || lastName === undefined) {
    return false;
  }

  if (typeof lastName !== 'string' || lastName.trim().length === 0) {
    return false;
  }

  // Show full name: not mobile AND has valid lastName
  return true;
}
