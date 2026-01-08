// ─────────────────────────────────────────────────────────────
// Validation Predicates (Pure Functions)
// ─────────────────────────────────────────────────────────────
const isString = (value) => typeof value === 'string'
const isBoolean = (value) => typeof value === 'boolean'
const isNullish = (value) => value === null || value === undefined
const isNonEmptyString = (value) => isString(value) && value.trim().length > 0
const hasValidLastName = (lastName) =>
  !isNullish(lastName) && isNonEmptyString(lastName)

/**
 * Determines if the full user name (first + last) should be displayed.
 *
 * @function shouldShowFullName
 * @intent Business rule for when to show full name vs first name only
 * @rule Show full name only if lastName exists and viewport is not mobile
 * @rule Mobile viewports show first name only for space conservation
 * @rule If no lastName, always show first name only
 * @pure Yes - deterministic, no side effects
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
  // Validation: firstName is required
  if (!isNonEmptyString(firstName)) {
    throw new Error('shouldShowFullName requires a valid firstName')
  }

  // Validation: isMobile must be boolean
  if (!isBoolean(isMobile)) {
    throw new Error('shouldShowFullName requires isMobile to be a boolean')
  }

  // Predicate composition: show full name = NOT mobile AND has valid lastName
  return !isMobile && hasValidLastName(lastName)
}
