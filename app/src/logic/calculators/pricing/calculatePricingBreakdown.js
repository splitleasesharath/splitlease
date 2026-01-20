import { getNightlyRateByFrequency } from './getNightlyRateByFrequency.js'
import { calculateFourWeekRent } from './calculateFourWeekRent.js'
import { calculateReservationTotal } from './calculateReservationTotal.js'
import { validateNumber } from '../../validators/pricingValidators.js'

/**
 * Calculate complete pricing breakdown for a listing rental.
 *
 * @intent Provide comprehensive price calculation including all fees.
 * @rule Combines nightly rate, 4-week rent, reservation total, and fees.
 * @rule All calculations must succeed or throw - no partial results.
 *
 * @param {object} params - Named parameters.
 * @param {object} params.listing - Listing object with all pricing fields.
 * @param {number} params.nightsPerWeek - Nights selected per week (2-7).
 * @param {number} params.reservationWeeks - Total reservation span in weeks.
 * @returns {object} Complete pricing breakdown with all calculated values.
 *
 * @throws {Error} If any required parameter is missing or invalid.
 * @throws {Error} If any calculation in the chain fails.
 *
 * @example
 * const breakdown = calculatePricingBreakdown({
 *   listing: { '💰Nightly Host Rate for 4 nights': 100, '💰Cleaning Cost / Maintenance Fee': 50 },
 *   nightsPerWeek: 4,
 *   reservationWeeks: 13
 * })
 * // => { nightlyPrice: 100, fourWeekRent: 1600, reservationTotal: 5200, ... }
 */
export function calculatePricingBreakdown({ listing, nightsPerWeek, reservationWeeks }) {
  // No Fallback: Validate all inputs
  if (!listing || typeof listing !== 'object') {
    throw new Error(
      'calculatePricingBreakdown: listing must be a valid object'
    )
  }

  validateNumber(nightsPerWeek, 'nightsPerWeek', 'calculatePricingBreakdown')
  validateNumber(reservationWeeks, 'reservationWeeks', 'calculatePricingBreakdown')

  // Get nightly rate (throws if not found)
  const nightlyPrice = getNightlyRateByFrequency({
    listing,
    nightsSelected: nightsPerWeek
  })

  // Calculate 4-week rent (throws on invalid input)
  const fourWeekRent = calculateFourWeekRent({
    nightlyRate: nightlyPrice,
    frequency: nightsPerWeek
  })

  // Calculate reservation total (throws on invalid input)
  const reservationTotal = calculateReservationTotal({
    fourWeekRent,
    totalWeeks: reservationWeeks
  })

  // Extract fees (with explicit validation)
  const cleaningFee = extractFee(
    listing['💰Cleaning Cost / Maintenance Fee'],
    'Cleaning Fee'
  )

  const damageDeposit = extractFee(
    listing['💰Damage Deposit'],
    'Damage Deposit'
  )

  // Calculate grand total
  const grandTotal = reservationTotal + cleaningFee

  return {
    nightlyPrice,
    fourWeekRent,
    reservationTotal,
    cleaningFee,
    damageDeposit,
    grandTotal,
    valid: true
  }
}

/**
 * Extract and validate a fee value from listing.
 * Returns 0 for explicitly missing optional fees (null/undefined).
 * Throws for invalid fee values.
 *
 * @param {any} feeValue - The fee value from listing
 * @param {string} feeName - Name of fee for error messages
 * @returns {number} Validated fee amount (0 if optional and missing)
 * @throws {Error} If fee value is invalid (e.g., negative, NaN)
 */
function extractFee(feeValue, feeName) {
  // Optional fees can be null/undefined - default to 0
  if (feeValue === null || feeValue === undefined) {
    return 0
  }

  const fee = Number(feeValue)

  if (isNaN(fee)) {
    throw new Error(
      `calculatePricingBreakdown: ${feeName} has invalid value ${feeValue}`
    )
  }

  if (fee < 0) {
    throw new Error(
      `calculatePricingBreakdown: ${feeName} cannot be negative, got ${fee}`
    )
  }

  return fee
}
