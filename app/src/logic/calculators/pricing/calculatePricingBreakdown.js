import { getNightlyRateByFrequency } from './getNightlyRateByFrequency.js'
import { calculateFourWeekRent } from './calculateFourWeekRent.js'
import { calculateReservationTotal } from './calculateReservationTotal.js'

// ─────────────────────────────────────────────────────────────
// Constants (Bubble Field Names)
// ─────────────────────────────────────────────────────────────
const CLEANING_FEE_FIELD = '💰Cleaning Cost / Maintenance Fee'
const DAMAGE_DEPOSIT_FIELD = '💰Damage Deposit'

// ─────────────────────────────────────────────────────────────
// Validation Helpers (Pure Predicates)
// ─────────────────────────────────────────────────────────────
const isValidObject = (value) => value !== null && typeof value === 'object'
const isValidNumber = (value) => typeof value === 'number' && !isNaN(value)
const isNonNegative = (value) => value >= 0
const isNullish = (value) => value === null || value === undefined

// ─────────────────────────────────────────────────────────────
// Fee Extraction (Pure Function)
// ─────────────────────────────────────────────────────────────

/**
 * Extract and validate a fee value from listing.
 * Returns 0 for explicitly missing optional fees (null/undefined).
 * Throws for invalid fee values.
 * @pure Yes - deterministic, no side effects
 *
 * @param {any} feeValue - The fee value from listing
 * @param {string} feeName - Name of fee for error messages
 * @returns {number} Validated fee amount (0 if optional and missing)
 * @throws {Error} If fee value is invalid (e.g., negative, NaN)
 */
const extractFee = (feeValue, feeName) => {
  // Optional fees can be null/undefined - default to 0
  if (isNullish(feeValue)) {
    return 0
  }

  const fee = Number(feeValue)

  if (!isValidNumber(fee)) {
    throw new Error(
      `calculatePricingBreakdown: ${feeName} has invalid value ${feeValue}`
    )
  }

  if (!isNonNegative(fee)) {
    throw new Error(
      `calculatePricingBreakdown: ${feeName} cannot be negative, got ${fee}`
    )
  }

  return fee
}

// ─────────────────────────────────────────────────────────────
// Result Builder (Pure Function)
// ─────────────────────────────────────────────────────────────

/**
 * Build immutable pricing breakdown result object
 * @pure
 */
const buildPricingResult = ({
  nightlyPrice,
  fourWeekRent,
  reservationTotal,
  cleaningFee,
  damageDeposit,
}) => Object.freeze({
  nightlyPrice,
  fourWeekRent,
  reservationTotal,
  cleaningFee,
  damageDeposit,
  grandTotal: reservationTotal + cleaningFee,
  valid: true,
})

/**
 * Calculate complete pricing breakdown for a listing rental.
 *
 * @intent Provide comprehensive price calculation including all fees.
 * @rule Combines nightly rate, 4-week rent, reservation total, and fees.
 * @rule All calculations must succeed or throw - no partial results.
 * @pure Yes - deterministic, composes pure functions, no side effects
 *
 * @param {object} params - Named parameters.
 * @param {object} params.listing - Listing object with all pricing fields.
 * @param {number} params.nightsPerWeek - Nights selected per week (2-7).
 * @param {number} params.reservationWeeks - Total reservation span in weeks.
 * @returns {object} Complete pricing breakdown with all calculated values (frozen).
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
  // Validation: All inputs
  if (!isValidObject(listing)) {
    throw new Error(
      'calculatePricingBreakdown: listing must be a valid object'
    )
  }

  if (!isValidNumber(nightsPerWeek)) {
    throw new Error(
      `calculatePricingBreakdown: nightsPerWeek must be a number, got ${typeof nightsPerWeek}`
    )
  }

  if (!isValidNumber(reservationWeeks)) {
    throw new Error(
      `calculatePricingBreakdown: reservationWeeks must be a number, got ${typeof reservationWeeks}`
    )
  }

  // Calculation pipeline: Compose pure functions
  // Step 1: Get nightly rate (throws if not found)
  const nightlyPrice = getNightlyRateByFrequency({
    listing,
    nightsSelected: nightsPerWeek
  })

  // Step 2: Calculate 4-week rent
  const fourWeekRent = calculateFourWeekRent({
    nightlyRate: nightlyPrice,
    frequency: nightsPerWeek
  })

  // Step 3: Calculate reservation total
  const reservationTotal = calculateReservationTotal({
    fourWeekRent,
    totalWeeks: reservationWeeks
  })

  // Step 4: Extract optional fees
  const cleaningFee = extractFee(listing[CLEANING_FEE_FIELD], 'Cleaning Fee')
  const damageDeposit = extractFee(listing[DAMAGE_DEPOSIT_FIELD], 'Damage Deposit')

  // Step 5: Build and return immutable result
  return buildPricingResult({
    nightlyPrice,
    fourWeekRent,
    reservationTotal,
    cleaningFee,
    damageDeposit,
  })
}

// ─────────────────────────────────────────────────────────────
// Exported Constants (for testing and reuse)
// ─────────────────────────────────────────────────────────────
export const PRICING_FIELDS = Object.freeze({
  CLEANING_FEE_FIELD,
  DAMAGE_DEPOSIT_FIELD,
})
