// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────
const MIN_DAYS_FOR_PRICING = 2 // Minimum 2 days (2 nights)
const MAX_DAYS_FOR_PRICING = 7 // Maximum 7 days (full week)

// ─────────────────────────────────────────────────────────────
// Validation Predicates (Pure Functions)
// ─────────────────────────────────────────────────────────────
const isValidNumber = (value) => typeof value === 'number' && !isNaN(value)
const isInRange = (value, min, max) => value >= min && value <= max

/**
 * Validate if enough days are selected for price calculation.
 *
 * @intent Enforce minimum and maximum day selection for pricing.
 * @rule Minimum 2 days required (2 nights).
 * @rule Maximum 7 days allowed (full week).
 * @pure Yes - deterministic, no side effects
 *
 * @param {object} params - Named parameters.
 * @param {number} params.daysSelected - Number of days selected.
 * @returns {boolean} True if valid for pricing, false otherwise.
 *
 * @throws {Error} If daysSelected is not a number.
 *
 * @example
 * isValidDayCountForPricing({ daysSelected: 4 }) // => true
 * isValidDayCountForPricing({ daysSelected: 1 }) // => false
 * isValidDayCountForPricing({ daysSelected: 8 }) // => false
 */
export function isValidDayCountForPricing({ daysSelected }) {
  // Validation: Type check
  if (!isValidNumber(daysSelected)) {
    throw new Error(
      `isValidDayCountForPricing: daysSelected must be a number, got ${typeof daysSelected}`
    )
  }

  // Pure predicate composition
  return isInRange(daysSelected, MIN_DAYS_FOR_PRICING, MAX_DAYS_FOR_PRICING)
}

// ─────────────────────────────────────────────────────────────
// Exported Constants (for testing)
// ─────────────────────────────────────────────────────────────
export const PRICING_DAY_LIMITS = Object.freeze({
  MIN_DAYS_FOR_PRICING,
  MAX_DAYS_FOR_PRICING,
})
