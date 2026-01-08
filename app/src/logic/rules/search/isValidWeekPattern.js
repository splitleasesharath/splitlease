// ─────────────────────────────────────────────────────────────
// Constants (Immutable)
// ─────────────────────────────────────────────────────────────
const VALID_WEEK_PATTERNS = Object.freeze([
  'every-week',
  'one-on-off',
  'two-on-off',
  'one-three-off'
])

// ─────────────────────────────────────────────────────────────
// Validation Predicates (Pure Functions)
// ─────────────────────────────────────────────────────────────
const isString = (value) => typeof value === 'string'

/**
 * Check if week pattern filter value is valid.
 *
 * @intent Validate week pattern selection for search filters.
 * @rule Valid patterns: 'every-week', 'one-on-off', 'two-on-off', 'one-three-off'.
 * @pure Yes - deterministic, no side effects
 *
 * @param {object} params - Named parameters.
 * @param {string} params.weekPattern - Week pattern value to validate.
 * @returns {boolean} True if valid week pattern.
 *
 * @throws {Error} If weekPattern is not a string.
 *
 * @example
 * const valid = isValidWeekPattern({ weekPattern: 'one-on-off' })
 * // => true
 *
 * const invalid = isValidWeekPattern({ weekPattern: 'invalid' })
 * // => false
 */
export function isValidWeekPattern({ weekPattern }) {
  // Validation: Type check
  if (!isString(weekPattern)) {
    throw new Error(
      `isValidWeekPattern: weekPattern must be a string, got ${typeof weekPattern}`
    )
  }

  // Declarative membership check
  return VALID_WEEK_PATTERNS.includes(weekPattern)
}

// ─────────────────────────────────────────────────────────────
// Exported Constants (for testing and reuse)
// ─────────────────────────────────────────────────────────────
export { VALID_WEEK_PATTERNS }
