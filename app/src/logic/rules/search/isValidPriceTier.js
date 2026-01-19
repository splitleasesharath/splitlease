import { VALID_PRICE_TIERS } from '../../constants/searchConstants.js';

/**
 * Check if price tier filter value is valid.
 *
 * @intent Validate price tier selection for search filters.
 * @rule Valid tiers: 'under-200', '200-350', '350-500', '500-plus', 'all'.
 *
 * @param {object} params - Named parameters.
 * @param {string} params.priceTier - Price tier value to validate.
 * @returns {boolean} True if valid price tier.
 *
 * @throws {Error} If priceTier is not a string.
 *
 * @example
 * const valid = isValidPriceTier({ priceTier: 'under-200' })
 * // => true
 *
 * const invalid = isValidPriceTier({ priceTier: 'invalid' })
 * // => false
 */
export function isValidPriceTier({ priceTier }) {
  // No Fallback: Validate input
  if (typeof priceTier !== 'string') {
    throw new Error(
      `isValidPriceTier: priceTier must be a string, got ${typeof priceTier}`
    )
  }

  return VALID_PRICE_TIERS.includes(priceTier)
}
