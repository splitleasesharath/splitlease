// ─────────────────────────────────────────────────────────────
// Constants (Immutable)
// ─────────────────────────────────────────────────────────────
const VALID_PRICE_TIERS = Object.freeze([
  'under-200',
  '200-350',
  '350-500',
  '500-plus',
  'all'
])

// ─────────────────────────────────────────────────────────────
// Validation Predicates (Pure Functions)
// ─────────────────────────────────────────────────────────────
const isString = (value) => typeof value === 'string'

/**
 * Check if price tier filter value is valid.
 *
 * @intent Validate price tier selection for search filters.
 * @rule Valid tiers: 'under-200', '200-350', '350-500', '500-plus', 'all'.
 * @pure Yes - deterministic, no side effects
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
  // Validation: Type check
  if (!isString(priceTier)) {
    throw new Error(
      `isValidPriceTier: priceTier must be a string, got ${typeof priceTier}`
    )
  }

  // Declarative membership check
  return VALID_PRICE_TIERS.includes(priceTier)
}

// ─────────────────────────────────────────────────────────────
// Exported Constants (for testing and reuse)
// ─────────────────────────────────────────────────────────────
export { VALID_PRICE_TIERS }
