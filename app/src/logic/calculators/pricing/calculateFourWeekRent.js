// ─────────────────────────────────────────────────────────────
// Constants (Extracted Magic Numbers)
// ─────────────────────────────────────────────────────────────
const WEEKS_IN_BILLING_CYCLE = 4
const MIN_NIGHTS_PER_WEEK = 2
const MAX_NIGHTS_PER_WEEK = 7

// ─────────────────────────────────────────────────────────────
// Validation Helpers (Pure Functions)
// ─────────────────────────────────────────────────────────────
const isValidNumber = (value) => typeof value === 'number' && !isNaN(value)
const isNonNegative = (value) => value >= 0
const isInRange = (value, min, max) => value >= min && value <= max

/**
 * Calculates the baseline rent for a standard 4-week period.
 *
 * @intent Determine the recurring monthly cost basis before fees.
 * @rule Four weeks is the standard billing cycle for split lease.
 * @pure Yes - deterministic, no side effects
 *
 * @param {object} params - Named parameters for clarity.
 * @param {number} params.nightlyRate - The base cost per night in USD.
 * @param {number} params.frequency - The number of nights per week (2-7).
 * @returns {number} The total rent for a 4-week cycle.
 *
 * @throws {Error} If nightlyRate or frequency is not a number.
 * @throws {Error} If nightlyRate is negative or NaN.
 * @throws {Error} If frequency is outside the valid range (2-7).
 *
 * @example
 * const rent = calculateFourWeekRent({ nightlyRate: 100, frequency: 4 })
 * // => 1600 (100 * 4 * 4)
 */
export function calculateFourWeekRent({ nightlyRate, frequency }) {
  // Validation: Type checks
  if (!isValidNumber(nightlyRate)) {
    throw new Error(
      `calculateFourWeekRent: nightlyRate must be a number, got ${typeof nightlyRate}`
    )
  }

  if (!isValidNumber(frequency)) {
    throw new Error(
      `calculateFourWeekRent: frequency must be a number, got ${typeof frequency}`
    )
  }

  // Validation: Business rules
  if (!isNonNegative(nightlyRate)) {
    throw new Error(
      `calculateFourWeekRent: nightlyRate cannot be negative, got ${nightlyRate}`
    )
  }

  if (!isInRange(frequency, MIN_NIGHTS_PER_WEEK, MAX_NIGHTS_PER_WEEK)) {
    throw new Error(
      `calculateFourWeekRent: frequency must be between ${MIN_NIGHTS_PER_WEEK}-${MAX_NIGHTS_PER_WEEK} nights, got ${frequency}`
    )
  }

  // Pure calculation (no mutations, explicit formula)
  return nightlyRate * frequency * WEEKS_IN_BILLING_CYCLE
}

// ─────────────────────────────────────────────────────────────
// Exported Constants (for testing and reuse)
// ─────────────────────────────────────────────────────────────
export const PRICING_CONSTANTS = Object.freeze({
  WEEKS_IN_BILLING_CYCLE,
  MIN_NIGHTS_PER_WEEK,
  MAX_NIGHTS_PER_WEEK,
})
