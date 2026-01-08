// ─────────────────────────────────────────────────────────────
// Constants (Business Rules Extracted)
// ─────────────────────────────────────────────────────────────
const FULL_TIME_NIGHTS = 7
const FULL_TIME_DISCOUNT_RATE = 0.13  // 13% discount for 7 nights
const SITE_MARKUP_RATE = 0.17         // 17% markup on all prices
const MIN_NIGHTS = 2
const MAX_NIGHTS = 7

// ─────────────────────────────────────────────────────────────
// Validation Helpers (Pure Predicates)
// ─────────────────────────────────────────────────────────────
const isValidNumber = (value) => typeof value === 'number' && !isNaN(value)
const isNonNegative = (value) => value >= 0
const isInRange = (value, min, max) => value >= min && value <= max

// ─────────────────────────────────────────────────────────────
// Calculation Helpers (Pure Functions - Single Responsibility)
// ─────────────────────────────────────────────────────────────

/**
 * Calculate base price from nightly rate and count
 * @pure
 */
const calculateBasePrice = (nightlyRate, nightsCount) =>
  nightlyRate * nightsCount

/**
 * Calculate full-time discount (only for 7 nights)
 * @pure
 */
const calculateFullTimeDiscount = (basePrice, nightsCount) =>
  nightsCount === FULL_TIME_NIGHTS ? basePrice * FULL_TIME_DISCOUNT_RATE : 0

/**
 * Calculate site markup on price after discounts
 * @pure
 */
const calculateSiteMarkup = (priceAfterDiscounts) =>
  priceAfterDiscounts * SITE_MARKUP_RATE

/**
 * Calculate guest-facing price per night after markup and discounts.
 * This is the price displayed on listing cards in search results.
 *
 * @intent Calculate final guest-facing price from host compensation rate.
 * @rule Apply 13% full-time discount for 7 nights only.
 * @rule Apply 17% site markup to all prices.
 * @rule Return price per night (total price / nights).
 * @pure Yes - deterministic, no side effects
 *
 * Formula Pipeline:
 * hostRate → basePrice → discount → markup → totalPrice → pricePerNight
 *
 * @param {object} params - Named parameters.
 * @param {number} params.hostNightlyRate - Host compensation rate per night.
 * @param {number} params.nightsCount - Number of nights selected (2-7).
 * @returns {number} Guest-facing price per night.
 *
 * @throws {Error} If hostNightlyRate is not a valid positive number.
 * @throws {Error} If nightsCount is not between 2-7.
 *
 * @example
 * const price = calculateGuestFacingPrice({ hostNightlyRate: 100, nightsCount: 5 })
 * // => 117 (per night, after markup)
 *
 * const fullWeekPrice = calculateGuestFacingPrice({ hostNightlyRate: 100, nightsCount: 7 })
 * // => 102.35 (per night, with 13% discount + 17% markup)
 */
export function calculateGuestFacingPrice({ hostNightlyRate, nightsCount }) {
  // Validation
  if (!isValidNumber(hostNightlyRate) || !isNonNegative(hostNightlyRate)) {
    throw new Error(
      `calculateGuestFacingPrice: hostNightlyRate must be a positive number, got ${hostNightlyRate}`
    )
  }

  if (!isValidNumber(nightsCount) || !isInRange(nightsCount, MIN_NIGHTS, MAX_NIGHTS)) {
    throw new Error(
      `calculateGuestFacingPrice: nightsCount must be between ${MIN_NIGHTS}-${MAX_NIGHTS}, got ${nightsCount}`
    )
  }

  // Calculation pipeline (composed from pure functions)
  const basePrice = calculateBasePrice(hostNightlyRate, nightsCount)
  const fullTimeDiscount = calculateFullTimeDiscount(basePrice, nightsCount)
  const priceAfterDiscounts = basePrice - fullTimeDiscount
  const siteMarkup = calculateSiteMarkup(priceAfterDiscounts)
  const totalPrice = priceAfterDiscounts + siteMarkup
  const pricePerNight = totalPrice / nightsCount

  return pricePerNight
}

// ─────────────────────────────────────────────────────────────
// Exported Constants (for testing and reuse)
// ─────────────────────────────────────────────────────────────
export const GUEST_PRICING_CONSTANTS = Object.freeze({
  FULL_TIME_NIGHTS,
  FULL_TIME_DISCOUNT_RATE,
  SITE_MARKUP_RATE,
  MIN_NIGHTS,
  MAX_NIGHTS,
})
