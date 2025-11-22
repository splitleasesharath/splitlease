/**
 * Format full host name to "FirstName L." format for privacy.
 *
 * @intent Format host name for display with privacy (show first name + last initial).
 * @rule NO FALLBACK: Throws error if name is invalid.
 * @rule Single name: Return as-is (e.g., "John" → "John").
 * @rule Multiple names: Return "FirstName L." (e.g., "John Smith" → "John S.").
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
  // No Fallback: Strict validation
  if (typeof fullName !== 'string') {
    throw new Error(
      `formatHostName: fullName must be a string, got ${typeof fullName}`
    )
  }

  const trimmedName = fullName.trim()

  if (!trimmedName || trimmedName.length === 0) {
    throw new Error('formatHostName: fullName cannot be empty or whitespace')
  }

  // Split name into parts
  const nameParts = trimmedName.split(/\s+/)

  // Single name: return as-is
  if (nameParts.length === 1) {
    return nameParts[0]
  }

  // Multiple names: "FirstName L."
  const firstName = nameParts[0]
  const lastInitial = nameParts[nameParts.length - 1].charAt(0).toUpperCase()

  return `${firstName} ${lastInitial}.`
}
