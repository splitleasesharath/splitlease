/**
 * Process User Initials Processor
 *
 * PILLAR III: Processors (The "Transform" Layer)
 *
 * Generates user initials from first and last name for avatar display.
 *
 * @intent Create 1-2 letter initials for avatar when no profile photo available
 * @rule If both names provided, use first letter of each (uppercase)
 * @rule If only firstName, use first letter (uppercase)
 * @rule NO FALLBACK: firstName is required, throw if missing
 * @pure Yes - deterministic, no side effects
 */

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const FIRST_CHAR_INDEX = 0

// ─────────────────────────────────────────────────────────────
// Validation Predicates (Pure Functions)
// ─────────────────────────────────────────────────────────────

const isString = (value) => typeof value === 'string'
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
 * Extract and uppercase the first character of a string
 * @pure
 */
const extractInitial = (name) =>
  name.trim().charAt(FIRST_CHAR_INDEX).toUpperCase()

/**
 * Combine two initials
 * @pure
 */
const combineInitials = (firstInitial, lastInitial) =>
  firstInitial + lastInitial

// ─────────────────────────────────────────────────────────────
// Main Processor
// ─────────────────────────────────────────────────────────────

/**
 * Generates user initials from first and last name for avatar display.
 * @pure
 *
 * @param {object} params - Named parameters
 * @param {string} params.firstName - User's first name (required)
 * @param {string|null|undefined} params.lastName - User's last name (optional)
 * @returns {string} 1-2 letter initials (e.g., "JD" or "J")
 * @throws {Error} If firstName is missing or invalid
 *
 * @example
 * processUserInitials({ firstName: 'John', lastName: 'Doe' })
 * // => "JD"
 *
 * processUserInitials({ firstName: 'Jane', lastName: null })
 * // => "J"
 */
export function processUserInitials({ firstName, lastName }) {
  // Validation: firstName is required
  if (!isNonEmptyString(firstName)) {
    throw new Error('processUserInitials requires a valid firstName. Cannot generate initials without user name.')
  }

  // Extract first initial
  const firstInitial = extractInitial(firstName)

  // Early return: No valid lastName
  if (!hasValidLastName(lastName)) {
    return firstInitial
  }

  // Combine both initials
  const lastInitial = extractInitial(lastName)
  return combineInitials(firstInitial, lastInitial)
}

// ─────────────────────────────────────────────────────────────
// Exported Constants (for testing)
// ─────────────────────────────────────────────────────────────
export { FIRST_CHAR_INDEX }
