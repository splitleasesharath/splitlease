/**
 * Process User Display Name Processor
 *
 * PILLAR III: Processors (The "Transform" Layer)
 *
 * Formats user's display name for UI presentation.
 *
 * @intent Transform user name data into formatted display string
 * @rule If showFull is true and lastName exists, return "FirstName LastName"
 * @rule If showFull is false or no lastName, return "FirstName"
 * @rule NO FALLBACK: firstName is required, throw if missing
 * @pure Yes - deterministic, no side effects
 */

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const NAME_SEPARATOR = ' '

// ─────────────────────────────────────────────────────────────
// Validation Predicates (Pure Functions)
// ─────────────────────────────────────────────────────────────

const isString = (value) => typeof value === 'string'
const isBoolean = (value) => typeof value === 'boolean'
const isNonEmptyString = (value) => isString(value) && value.trim().length > 0

/**
 * Check if lastName is valid and usable
 * @pure
 */
const hasValidLastName = (lastName) => isNonEmptyString(lastName)

// ─────────────────────────────────────────────────────────────
// Pure Transformation Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Normalize name by trimming whitespace
 * @pure
 */
const normalizeName = (name) => name.trim()

/**
 * Combine first and last name with separator
 * @pure
 */
const combineNames = (firstName, lastName) =>
  `${firstName}${NAME_SEPARATOR}${lastName}`

// ─────────────────────────────────────────────────────────────
// Main Processor
// ─────────────────────────────────────────────────────────────

/**
 * Formats user's display name for UI presentation.
 * @pure
 *
 * @param {object} params - Named parameters
 * @param {string} params.firstName - User's first name (required)
 * @param {string|null|undefined} params.lastName - User's last name (optional)
 * @param {boolean} params.showFull - Whether to show full name (first + last)
 * @returns {string} Formatted display name
 * @throws {Error} If firstName is missing or invalid
 * @throws {Error} If showFull is not a boolean
 *
 * @example
 * processUserDisplayName({ firstName: 'John', lastName: 'Doe', showFull: true })
 * // => "John Doe"
 *
 * processUserDisplayName({ firstName: 'John', lastName: 'Doe', showFull: false })
 * // => "John"
 */
export function processUserDisplayName({ firstName, lastName, showFull }) {
  // Validation: firstName is required
  if (!isNonEmptyString(firstName)) {
    throw new Error('processUserDisplayName requires a valid firstName. Cannot display user without name.')
  }

  // Validation: showFull must be boolean
  if (!isBoolean(showFull)) {
    throw new Error('processUserDisplayName requires showFull to be a boolean')
  }

  // Normalize firstName
  const normalizedFirstName = normalizeName(firstName)

  // Early return: First name only when not showing full or no valid lastName
  if (!showFull || !hasValidLastName(lastName)) {
    return normalizedFirstName
  }

  // Combine names
  const normalizedLastName = normalizeName(lastName)
  return combineNames(normalizedFirstName, normalizedLastName)
}

// ─────────────────────────────────────────────────────────────
// Exported Constants (for testing)
// ─────────────────────────────────────────────────────────────
export { NAME_SEPARATOR }
