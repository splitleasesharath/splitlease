/**
 * Format Host Name Processor
 *
 * PILLAR III: Processors (The "Transform" Layer)
 *
 * Format full host name to "FirstName L." format for privacy.
 *
 * @intent Format host name for display with privacy (show first name + last initial).
 * @rule NO FALLBACK: Throws error if name is invalid.
 * @rule Single name: Return as-is (e.g., "John" → "John").
 * @rule Multiple names: Return "FirstName L." (e.g., "John Smith" → "John S.").
 * @pure Yes - deterministic, no side effects
 */

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const WHITESPACE_REGEX = /\s+/
const INITIAL_SUFFIX = '.'

// ─────────────────────────────────────────────────────────────
// Validation Predicates (Pure Functions)
// ─────────────────────────────────────────────────────────────

const isString = (value) => typeof value === 'string'
const isNonEmptyString = (value) => isString(value) && value.trim().length > 0

// ─────────────────────────────────────────────────────────────
// Pure Transformation Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Trim whitespace from name
 * @pure
 */
const trimName = (name) => name.trim()

/**
 * Split name into parts by whitespace
 * @pure
 */
const splitNameParts = (name) => name.split(WHITESPACE_REGEX)

/**
 * Check if name has multiple parts
 * @pure
 */
const hasMultipleParts = (parts) => parts.length > 1

/**
 * Extract first name from parts
 * @pure
 */
const extractFirstName = (parts) => parts[0]

/**
 * Extract last name initial from parts
 * @pure
 */
const extractLastInitial = (parts) =>
  parts[parts.length - 1].charAt(0).toUpperCase()

/**
 * Format name with initial
 * @pure
 */
const formatNameWithInitial = (firstName, lastInitial) =>
  `${firstName} ${lastInitial}${INITIAL_SUFFIX}`

// ─────────────────────────────────────────────────────────────
// Main Processor
// ─────────────────────────────────────────────────────────────

/**
 * Format full host name to "FirstName L." format for privacy.
 * @pure
 *
 * @param {object} params - Named parameters.
 * @param {string} params.fullName - Full name of the host.
 * @returns {string} Formatted name with last initial.
 *
 * @throws {Error} If fullName is not a string or is empty.
 *
 * @example
 * const formatted = formatHostName({ fullName: 'John Smith' })
 * // => "John S."
 *
 * const single = formatHostName({ fullName: 'John' })
 * // => "John"
 */
export function formatHostName({ fullName }) {
  // Validation: Type check
  if (!isString(fullName)) {
    throw new Error(
      `formatHostName: fullName must be a string, got ${typeof fullName}`
    )
  }

  const trimmedName = trimName(fullName)

  // Validation: Non-empty check
  if (!isNonEmptyString(trimmedName)) {
    throw new Error('formatHostName: fullName cannot be empty or whitespace')
  }

  // Pure transformation pipeline
  const nameParts = splitNameParts(trimmedName)

  // Single name: return as-is
  if (!hasMultipleParts(nameParts)) {
    return extractFirstName(nameParts)
  }

  // Multiple names: "FirstName L."
  const firstName = extractFirstName(nameParts)
  const lastInitial = extractLastInitial(nameParts)

  return formatNameWithInitial(firstName, lastInitial)
}

// ─────────────────────────────────────────────────────────────
// Exported Constants (for testing)
// ─────────────────────────────────────────────────────────────
export { WHITESPACE_REGEX, INITIAL_SUFFIX }
