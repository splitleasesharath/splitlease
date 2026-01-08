// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────
const MIN_NIGHTS = 2
const MAX_NIGHTS = 7

/**
 * Immutable mapping of night count to Bubble price field name
 * @type {Readonly<Record<number, string>>}
 */
const PRICE_FIELD_MAP = Object.freeze({
  1: '💰Nightly Host Rate for 1 night',
  2: '💰Nightly Host Rate for 2 nights',
  3: '💰Nightly Host Rate for 3 nights',
  4: '💰Nightly Host Rate for 4 nights',
  5: '💰Nightly Host Rate for 5 nights',
  6: '💰Nightly Host Rate for 6 nights',
  7: '💰Nightly Host Rate for 7 nights'
})

const PRICE_OVERRIDE_FIELD = '💰Price Override'

// ─────────────────────────────────────────────────────────────
// Validation Helpers (Pure Predicates)
// ─────────────────────────────────────────────────────────────
const isValidObject = (value) => value !== null && typeof value === 'object'
const isValidNumber = (value) => typeof value === 'number' && !isNaN(value)
const isNonNegative = (value) => value >= 0
const isInRange = (value, min, max) => value >= min && value <= max

// ─────────────────────────────────────────────────────────────
// Price Extraction Helpers (Pure Functions)
// ─────────────────────────────────────────────────────────────

/**
 * Attempt to extract price override from listing
 * @pure
 * @param {object} listing - Listing object
 * @returns {{ hasOverride: boolean, value: number | null }}
 */
const extractPriceOverride = (listing) => {
  const overrideValue = listing[PRICE_OVERRIDE_FIELD]
  if (!overrideValue) {
    return { hasOverride: false, value: null }
  }
  const numericValue = Number(overrideValue)
  return { hasOverride: true, value: numericValue }
}

/**
 * Extract rate from listing by night count
 * @pure
 * @param {object} listing - Listing object
 * @param {number} nightsSelected - Number of nights
 * @returns {{ found: boolean, value: number | null, fieldName: string | null }}
 */
const extractRateByNights = (listing, nightsSelected) => {
  const fieldName = PRICE_FIELD_MAP[nightsSelected]
  if (!fieldName || !listing[fieldName]) {
    return { found: false, value: null, fieldName }
  }
  return { found: true, value: Number(listing[fieldName]), fieldName }
}

/**
 * Get nightly price based on number of nights selected.
 * Matches Bubble logic for price field selection.
 *
 * @intent Retrieve the appropriate nightly rate tier based on frequency.
 * @rule Price override takes precedence over frequency-based rates.
 * @rule Frequency-specific rates (2, 3, 4, 5, 7 nights) map to specific price fields.
 * @rule No fallback to default rate - throws if no valid rate found.
 * @pure Yes - deterministic, no side effects
 *
 * @param {object} params - Named parameters.
 * @param {object} params.listing - Listing object with price fields.
 * @param {number} params.nightsSelected - Number of nights per week (2-7).
 * @returns {number} Nightly price for the selected frequency.
 *
 * @throws {Error} If listing is missing or invalid.
 * @throws {Error} If nightsSelected is not a number or out of range.
 * @throws {Error} If no valid price found for the selected nights.
 *
 * @example
 * const rate = getNightlyRateByFrequency({
 *   listing: { '💰Nightly Host Rate for 4 nights': 100 },
 *   nightsSelected: 4
 * })
 * // => 100
 */
export function getNightlyRateByFrequency({ listing, nightsSelected }) {
  // Validation: Listing object
  if (!isValidObject(listing)) {
    throw new Error(
      'getNightlyRateByFrequency: listing must be a valid object'
    )
  }

  // Validation: nightsSelected type and range
  if (!isValidNumber(nightsSelected)) {
    throw new Error(
      `getNightlyRateByFrequency: nightsSelected must be a number, got ${typeof nightsSelected}`
    )
  }

  if (!isInRange(nightsSelected, MIN_NIGHTS, MAX_NIGHTS)) {
    throw new Error(
      `getNightlyRateByFrequency: nightsSelected must be between ${MIN_NIGHTS}-${MAX_NIGHTS}, got ${nightsSelected}`
    )
  }

  // Check for price override first (takes precedence)
  const override = extractPriceOverride(listing)
  if (override.hasOverride) {
    if (!isValidNumber(override.value) || !isNonNegative(override.value)) {
      throw new Error(
        `getNightlyRateByFrequency: Invalid price override value ${listing[PRICE_OVERRIDE_FIELD]}`
      )
    }
    return override.value
  }

  // Extract rate by night count
  const rate = extractRateByNights(listing, nightsSelected)
  if (!rate.found) {
    throw new Error(
      `getNightlyRateByFrequency: No price found for ${nightsSelected} nights in listing`
    )
  }

  if (!isValidNumber(rate.value) || !isNonNegative(rate.value)) {
    throw new Error(
      `getNightlyRateByFrequency: Invalid rate value ${listing[rate.fieldName]} for ${nightsSelected} nights`
    )
  }

  return rate.value
}

// ─────────────────────────────────────────────────────────────
// Exported Constants (for testing and reuse)
// ─────────────────────────────────────────────────────────────
export { PRICE_FIELD_MAP }
