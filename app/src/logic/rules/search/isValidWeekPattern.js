/**
 * Check if week pattern filter value is valid.
 *
 * @intent Validate week pattern selection for search filters.
 * @rule Valid patterns: 'every-week', 'one-on-off', 'two-on-off', 'one-three-off'.
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
  // No Fallback: Validate input
  if (typeof weekPattern !== 'string') {
    throw new Error(
      `isValidWeekPattern: weekPattern must be a string, got ${typeof weekPattern}`
    )
  }

  const validPatterns = ['every-week', 'one-on-off', 'two-on-off', 'one-three-off']

  return validPatterns.includes(weekPattern)
}
