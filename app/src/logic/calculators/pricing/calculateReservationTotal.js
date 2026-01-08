// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────
const WEEKS_IN_BILLING_CYCLE = 4

// ─────────────────────────────────────────────────────────────
// Validation Helpers (Pure Predicates)
// ─────────────────────────────────────────────────────────────
const isValidNumber = (value) => typeof value === 'number' && !isNaN(value)
const isNonNegative = (value) => value >= 0
const isPositive = (value) => value > 0

/**
 * Calculate estimated reservation total for the full stay period.
 *
 * @intent Determine the total cost across all weeks of the reservation.
 * @rule Total is calculated as (4-week rent) * (total weeks / 4).
 * @pure Yes - deterministic, no side effects
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
  // Validation: Type checks
  if (!isValidNumber(fourWeekRent)) {
    throw new Error(
      `calculateReservationTotal: fourWeekRent must be a number, got ${typeof fourWeekRent}`
    )
  }

  if (!isValidNumber(totalWeeks)) {
    throw new Error(
      `calculateReservationTotal: totalWeeks must be a number, got ${typeof totalWeeks}`
    )
  }

  // Validation: Business rules
  if (!isNonNegative(fourWeekRent)) {
    throw new Error(
      `calculateReservationTotal: fourWeekRent cannot be negative, got ${fourWeekRent}`
    )
  }

  if (!isPositive(totalWeeks)) {
    throw new Error(
      `calculateReservationTotal: totalWeeks must be positive, got ${totalWeeks}`
    )
  }

  // Pure calculation: scale 4-week rent to total weeks
  return fourWeekRent * (totalWeeks / WEEKS_IN_BILLING_CYCLE)
}
