/**
 * Calculates the baseline rent for a standard 4-week period.
 *
 * @intent Determine the recurring monthly cost basis before fees.
 * @rule Four weeks is the standard billing cycle for split lease.
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
  // No Fallback: Strict type validation
  if (typeof nightlyRate !== 'number' || isNaN(nightlyRate)) {
    throw new Error(
      `calculateFourWeekRent: nightlyRate must be a number, got ${typeof nightlyRate}`
    )
  }

  if (typeof frequency !== 'number' || isNaN(frequency)) {
    throw new Error(
      `calculateFourWeekRent: frequency must be a number, got ${typeof frequency}`
    )
  }

  // Business rule validation
  if (nightlyRate < 0) {
    throw new Error(
      `calculateFourWeekRent: nightlyRate cannot be negative, got ${nightlyRate}`
    )
  }

  if (frequency < 2 || frequency > 7) {
    throw new Error(
      `calculateFourWeekRent: frequency must be between 2-7 nights, got ${frequency}`
    )
  }

  // Pure calculation
  return nightlyRate * frequency * 4
}
