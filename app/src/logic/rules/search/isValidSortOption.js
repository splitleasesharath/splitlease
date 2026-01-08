// ─────────────────────────────────────────────────────────────
// Constants (Immutable)
// ─────────────────────────────────────────────────────────────
const VALID_SORT_OPTIONS = Object.freeze([
  'recommended',
  'price-low',
  'most-viewed',
  'recent'
])

// ─────────────────────────────────────────────────────────────
// Validation Predicates (Pure Functions)
// ─────────────────────────────────────────────────────────────
const isString = (value) => typeof value === 'string'

/**
 * Check if sort option value is valid.
 *
 * @intent Validate sort option selection for search results.
 * @rule Valid options: 'recommended', 'price-low', 'most-viewed', 'recent'.
 * @pure Yes - deterministic, no side effects
 *
 * @param {object} params - Named parameters.
 * @param {string} params.sortBy - Sort option value to validate.
 * @returns {boolean} True if valid sort option.
 *
 * @throws {Error} If sortBy is not a string.
 *
 * @example
 * const valid = isValidSortOption({ sortBy: 'price-low' })
 * // => true
 *
 * const invalid = isValidSortOption({ sortBy: 'invalid' })
 * // => false
 */
export function isValidSortOption({ sortBy }) {
  // Validation: Type check
  if (!isString(sortBy)) {
    throw new Error(
      `isValidSortOption: sortBy must be a string, got ${typeof sortBy}`
    )
  }

  // Declarative membership check
  return VALID_SORT_OPTIONS.includes(sortBy)
}

// ─────────────────────────────────────────────────────────────
// Exported Constants (for testing and reuse)
// ─────────────────────────────────────────────────────────────
export { VALID_SORT_OPTIONS }
