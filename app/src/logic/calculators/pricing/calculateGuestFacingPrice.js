/**
 * Calculate guest-facing price per night after markup and discounts.
 * This is the price displayed on listing cards in search results.
 *
 * @intent Calculate final guest-facing price from host compensation rate.
 * @rule Apply 13% full-time discount for 7 nights only.
 * @rule Apply 17% site markup to all prices.
 * @rule Return price per night (total price / nights).
 *
 * Formula:
 * 1. Base price = host rate × nights
 * 2. Full-time discount = base price × 0.13 (only if 7 nights)
 * 3. Price after discounts = base price - discount
 * 4. Site markup = price after discounts × 0.17
 * 5. Total price = base price - discount + markup
 * 6. Price per night = total price / nights
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
import { PRICING_CONSTANTS } from '../../constants/pricingConstants.js';

export function calculateGuestFacingPrice({ hostNightlyRate, nightsCount }) {
  // No Fallback: Strict validation
  if (
    typeof hostNightlyRate !== 'number' ||
    isNaN(hostNightlyRate) ||
    hostNightlyRate < 0
  ) {
    throw new Error(
      `calculateGuestFacingPrice: hostNightlyRate must be a positive number, got ${hostNightlyRate}`
    )
  }

  if (
    typeof nightsCount !== 'number' ||
    isNaN(nightsCount) ||
    nightsCount < 2 ||
    nightsCount > 7
  ) {
    throw new Error(
      `calculateGuestFacingPrice: nightsCount must be between 2-7, got ${nightsCount}`
    )
  }

  // Step 1: Calculate base price (host rate × nights)
  const basePrice = hostNightlyRate * nightsCount

  // Step 2: Apply full-time discount (only for 7 nights)
  const fullTimeDiscount = nightsCount === PRICING_CONSTANTS.FULL_TIME_NIGHTS_THRESHOLD
    ? basePrice * PRICING_CONSTANTS.FULL_TIME_DISCOUNT_RATE
    : 0;

  // Step 3: Price after discounts
  const priceAfterDiscounts = basePrice - fullTimeDiscount;

  // Step 4: Apply site markup
  const siteMarkup = priceAfterDiscounts * PRICING_CONSTANTS.SITE_MARKUP_RATE;

  // Step 5: Calculate total price
  const totalPrice = basePrice - fullTimeDiscount + siteMarkup

  // Step 6: Calculate price per night (guest-facing price)
  const pricePerNight = totalPrice / nightsCount

  return pricePerNight
}
