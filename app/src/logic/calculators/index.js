/**
 * Logic Core - Calculators Index
 * Pure functions that perform mathematical calculations.
 * No side effects, same input always produces same output.
 *
 * @module calculators
 * @layer 1 - Calculator (Pure Math)
 */

// ─────────────────────────────────────────────────────────────
// Pricing Calculators
// ─────────────────────────────────────────────────────────────
export {
  calculateFourWeekRent,
  PRICING_CONSTANTS,
} from './pricing/calculateFourWeekRent.js'

export { calculateReservationTotal } from './pricing/calculateReservationTotal.js'

export {
  getNightlyRateByFrequency,
  PRICE_FIELD_MAP,
} from './pricing/getNightlyRateByFrequency.js'

export {
  calculatePricingBreakdown,
  PRICING_FIELDS,
} from './pricing/calculatePricingBreakdown.js'

export {
  calculateGuestFacingPrice,
  GUEST_PRICING_CONSTANTS,
} from './pricing/calculateGuestFacingPrice.js'

// ─────────────────────────────────────────────────────────────
// Scheduling Calculators
// ─────────────────────────────────────────────────────────────
export { calculateCheckInOutDays } from './scheduling/calculateCheckInOutDays.js'
export { calculateNightsFromDays } from './scheduling/calculateNightsFromDays.js'
export { calculateNextAvailableCheckIn } from './scheduling/calculateNextAvailableCheckIn.js'
export { shiftMoveInDateIfPast } from './scheduling/shiftMoveInDateIfPast.js'
