/**
 * Logic Core - Calculators Index
 * Pure functions that perform mathematical calculations.
 * No side effects, same input always produces same output.
 */

// Pricing Calculators
export { calculateFourWeekRent } from './pricing/calculateFourWeekRent.js'
export { calculateReservationTotal } from './pricing/calculateReservationTotal.js'
export { getNightlyRateByFrequency } from './pricing/getNightlyRateByFrequency.js'
export { calculatePricingBreakdown } from './pricing/calculatePricingBreakdown.js'
export { calculateGuestFacingPrice } from './pricing/calculateGuestFacingPrice.js'

// Scheduling Calculators
export { calculateCheckInOutDays } from './scheduling/calculateCheckInOutDays.js'
export { calculateNightsFromDays } from './scheduling/calculateNightsFromDays.js'
export { calculateNextAvailableCheckIn } from './scheduling/calculateNextAvailableCheckIn.js'
