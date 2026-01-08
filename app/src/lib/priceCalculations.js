/**
 * Price Calculation Utilities
 * Handles all pricing logic for view-split-lease page
 *
 * Usage:
 *   import { calculate4WeekRent, calculateReservationTotal } from './priceCalculations.js';
 */

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const PRICING_CONSTANTS = Object.freeze({
  WEEKS_IN_PERIOD: 4,
  MIN_NIGHTS_FOR_PRICING: 2,
  MAX_NIGHTS_FOR_PRICING: 7
})

/**
 * Field names for nightly rate by night count
 */
const PRICE_FIELD_MAP = Object.freeze({
  1: '💰Nightly Host Rate for 1 night',
  2: '💰Nightly Host Rate for 2 nights',
  3: '💰Nightly Host Rate for 3 nights',
  4: '💰Nightly Host Rate for 4 nights',
  5: '💰Nightly Host Rate for 5 nights',
  7: '💰Nightly Host Rate for 7 nights'
})

const FIELD_NAMES = Object.freeze({
  PRICE_OVERRIDE: '💰Price Override',
  DEFAULT_RATE: '💰Nightly Host Rate for 4 nights',
  CLEANING_FEE: '💰Cleaning Cost / Maintenance Fee',
  DAMAGE_DEPOSIT: '💰Damage Deposit'
})

const PRICE_MESSAGES = Object.freeze({
  SELECT_MORE: 'Please Select More Days',
  SELECT_LESS: 'Please Select 7 Days or Less'
})

const CURRENCY_CONFIG = Object.freeze({
  LOCALE: 'en-US',
  STYLE: 'currency',
  CURRENCY: 'USD'
})

const LOG_PREFIX = '[priceCalculations]'

// ─────────────────────────────────────────────────────────────
// Validation Predicates (Pure Functions)
// ─────────────────────────────────────────────────────────────

/**
 * Check if value is a positive number
 * @pure
 */
const isPositiveNumber = (value) =>
  typeof value === 'number' && value > 0

/**
 * Check if value is truthy
 * @pure
 */
const isTruthy = (value) =>
  Boolean(value)

/**
 * Check if night count is valid for pricing
 * @pure
 */
const isNightCountValid = (nights) =>
  nights >= PRICING_CONSTANTS.MIN_NIGHTS_FOR_PRICING &&
  nights <= PRICING_CONSTANTS.MAX_NIGHTS_FOR_PRICING

// ─────────────────────────────────────────────────────────────
// Pure Calculation Functions
// ─────────────────────────────────────────────────────────────

/**
 * Calculate 4-week rent based on nightly price and selected nights
 * Formula: nightly price × nights per week × 4 weeks
 * @pure
 * @param {number} nightlyPrice - Price per night
 * @param {number} nightsPerWeek - Number of nights selected per week
 * @returns {number} 4-week rent amount
 */
export function calculate4WeekRent(nightlyPrice, nightsPerWeek) {
  if (!isPositiveNumber(nightlyPrice) || !isPositiveNumber(nightsPerWeek)) return 0;
  return nightlyPrice * nightsPerWeek * PRICING_CONSTANTS.WEEKS_IN_PERIOD;
}

/**
 * Calculate estimated reservation total
 * Formula: 4-week rent × (total weeks / 4)
 * @pure
 * @param {number} fourWeekRent - 4-week rent amount
 * @param {number} totalWeeks - Total reservation span in weeks
 * @returns {number} Estimated total cost
 */
export function calculateReservationTotal(fourWeekRent, totalWeeks) {
  if (!isPositiveNumber(fourWeekRent) || !isPositiveNumber(totalWeeks)) return 0;
  return fourWeekRent * (totalWeeks / PRICING_CONSTANTS.WEEKS_IN_PERIOD);
}

/**
 * Get nightly price based on number of nights selected
 * Matches Bubble logic for price field selection
 * @pure
 * @param {object} listing - Listing object with price fields
 * @param {number} nightsSelected - Number of nights per week (2-7)
 * @returns {number|null} Nightly price
 */
export function getNightlyPriceForNights(listing, nightsSelected) {
  if (!isTruthy(listing) || !isTruthy(nightsSelected)) return null;

  // Price override takes precedence
  if (listing[FIELD_NAMES.PRICE_OVERRIDE]) {
    return listing[FIELD_NAMES.PRICE_OVERRIDE];
  }

  // Get field name for selected night count
  const fieldName = PRICE_FIELD_MAP[nightsSelected];
  if (fieldName && listing[fieldName]) {
    return listing[fieldName];
  }

  // Default to 4-night rate if available
  return listing[FIELD_NAMES.DEFAULT_RATE] || null;
}

/**
 * Check if amount is a valid number for formatting
 * @pure
 */
const isValidAmount = (amount) =>
  amount !== null && amount !== undefined && !isNaN(amount)

/**
 * Format price as currency string
 * @pure
 * @param {number} amount - Dollar amount
 * @param {boolean} showCents - Whether to show cents (default: false)
 * @returns {string} Formatted price (e.g., "$1,234" or "$1,234.56")
 */
export function formatPrice(amount, showCents = false) {
  if (!isValidAmount(amount)) {
    return '$0';
  }

  const fractionDigits = showCents ? 2 : 0

  return new Intl.NumberFormat(CURRENCY_CONFIG.LOCALE, {
    style: CURRENCY_CONFIG.STYLE,
    currency: CURRENCY_CONFIG.CURRENCY,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits
  }).format(amount);
}

/**
 * Extract listing fees
 * @pure
 */
const extractListingFees = (listing) => ({
  cleaningFee: listing[FIELD_NAMES.CLEANING_FEE] || 0,
  damageDeposit: listing[FIELD_NAMES.DAMAGE_DEPOSIT] || 0
})

/**
 * Create invalid pricing breakdown result
 * @pure
 */
const createInvalidBreakdown = (listing) =>
  Object.freeze({
    nightlyPrice: null,
    fourWeekRent: null,
    reservationTotal: null,
    ...extractListingFees(listing),
    valid: false
  })

/**
 * Create valid pricing breakdown result
 * @pure
 */
const createValidBreakdown = (nightlyPrice, fourWeekRent, reservationTotal, listing) => {
  const fees = extractListingFees(listing)
  return Object.freeze({
    nightlyPrice,
    fourWeekRent,
    reservationTotal,
    ...fees,
    grandTotal: reservationTotal + fees.cleaningFee,
    valid: true
  })
}

/**
 * Calculate complete pricing breakdown
 * @pure
 * @param {object} listing - Listing object
 * @param {number} nightsPerWeek - Nights selected per week
 * @param {number} reservationWeeks - Total reservation span in weeks
 * @returns {object} Complete pricing breakdown
 */
export function calculatePricingBreakdown(listing, nightsPerWeek, reservationWeeks) {
  const nightlyPrice = getNightlyPriceForNights(listing, nightsPerWeek);

  if (!nightlyPrice) {
    return createInvalidBreakdown(listing);
  }

  const fourWeekRent = calculate4WeekRent(nightlyPrice, nightsPerWeek);
  const reservationTotal = calculateReservationTotal(fourWeekRent, reservationWeeks);

  return createValidBreakdown(nightlyPrice, fourWeekRent, reservationTotal, listing);
}

/**
 * Validate if enough days are selected for price calculation
 * @pure
 * @param {number} daysSelected - Number of days selected
 * @returns {boolean} True if valid for pricing
 */
export function isValidForPricing(daysSelected) {
  return isNightCountValid(daysSelected);
}

/**
 * Get price display message based on selection state
 * @pure
 * @param {number|null} daysSelected - Number of days selected
 * @returns {string} Display message
 */
export function getPriceDisplayMessage(daysSelected) {
  if (!daysSelected || daysSelected < PRICING_CONSTANTS.MIN_NIGHTS_FOR_PRICING) {
    return PRICE_MESSAGES.SELECT_MORE;
  }
  if (daysSelected > PRICING_CONSTANTS.MAX_NIGHTS_FOR_PRICING) {
    return PRICE_MESSAGES.SELECT_LESS;
  }
  return null; // Valid selection
}

// ─────────────────────────────────────────────────────────────
// Exported Constants (for testing)
// ─────────────────────────────────────────────────────────────
export {
  PRICING_CONSTANTS,
  PRICE_FIELD_MAP,
  FIELD_NAMES,
  PRICE_MESSAGES,
  CURRENCY_CONFIG,
  LOG_PREFIX
}
