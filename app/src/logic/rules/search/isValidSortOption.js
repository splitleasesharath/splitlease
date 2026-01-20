import { VALID_SORT_OPTIONS } from '../../constants/searchConstants.js';

/**
 * Check if sort option value is valid.
 *
 * @intent Validate sort option selection for search results.
 * @rule Valid options: 'recommended', 'price-low', 'most-viewed', 'recent'.
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
  // No Fallback: Validate input
  if (typeof sortBy !== 'string') {
    throw new Error(
      `isValidSortOption: sortBy must be a string, got ${typeof sortBy}`
    )
  }

  return VALID_SORT_OPTIONS.includes(sortBy)
}
