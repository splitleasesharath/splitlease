import { validateNonNegativeNumber, validatePositiveNumber } from '../../validators/pricingValidators.js'

/**
 * Calculate estimated reservation total for the full stay period.
 *
 * @intent Determine the total cost across all weeks of the reservation.
 * @rule Total is calculated as (4-week rent) * (total weeks / 4).
 *
 * @param {object} params - Named parameters for clarity.
 * @param {number} params.fourWeekRent - The calculated 4-week rent amount.
 * @param {number} params.totalWeeks - Total reservation span in weeks.
 * @returns {number} Estimated total cost for the entire reservation.
 *
 * @throws {Error} If fourWeekRent or totalWeeks is not a number.
 * @throws {Error} If fourWeekRent is negative or NaN.
 * @throws {Error} If totalWeeks is less than or equal to 0.
 *
 * @example
 * const total = calculateReservationTotal({ fourWeekRent: 1600, totalWeeks: 13 })
 * // => 5200 (1600 * 13 / 4)
 */
export function calculateReservationTotal({ fourWeekRent, totalWeeks }) {
  // No Fallback: Strict type validation
  validateNonNegativeNumber(fourWeekRent, 'fourWeekRent', 'calculateReservationTotal')
  validatePositiveNumber(totalWeeks, 'totalWeeks', 'calculateReservationTotal')

  // Pure calculation
  return fourWeekRent * (totalWeeks / 4)
}
