/**
 * Validate if enough days are selected for price calculation.
 *
 * @intent Enforce minimum and maximum day selection for pricing.
 * @rule Minimum 2 days required (2 nights).
 * @rule Maximum 7 days allowed (full week).
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
  // No Fallback: Validate input
  if (typeof daysSelected !== 'number' || isNaN(daysSelected)) {
    throw new Error(
      `isValidDayCountForPricing: daysSelected must be a number, got ${typeof daysSelected}`
    )
  }

  return daysSelected >= 2 && daysSelected <= 7
}
