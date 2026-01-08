/**
 * Price calculation utilities for schedule selectors
 *
 * Complete price calculation implementation based on Bubble.io formulas.
 * Supports Monthly, Weekly, and Nightly rental types with:
 * - Unused nights discounts
 * - Full-time discounts (7 nights)
 * - Site and unit markups
 * - Various week patterns (every week, 1on1off, etc.)
 *
 * @module lib/scheduleSelector/priceCalculations
 */

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const LOG_PREFIX = '[priceCalculations]'

const RENTAL_TYPES = Object.freeze({
  MONTHLY: 'Monthly',
  WEEKLY: 'Weekly',
  NIGHTLY: 'Nightly'
})

const DEFAULT_RENTAL_TYPE = RENTAL_TYPES.NIGHTLY
const DEFAULT_WEEKS_OFFERED = 'Every week'
const DEFAULT_RESERVATION_SPAN = 13
const FULL_WEEK_NIGHTS = 7
const FOUR_WEEK_PERIOD = 4

/**
 * Reservation span to 4-week period mapping
 * @constant
 */
const RESERVATION_SPAN_PERIODS = Object.freeze({
  6: 1.5,
  7: 1.75,
  8: 2,
  9: 2.25,
  10: 2.5,
  12: 3,
  13: 3.25,
  16: 4,
  17: 4.25,
  20: 5,
  22: 5.5,
  26: 6.5
})

/**
 * Default ZAT configuration
 * @constant
 */
const DEFAULT_ZAT_CONFIG = Object.freeze({
  overallSiteMarkup: 0.17,
  weeklyMarkup: 0,
  fullTimeDiscount: 0.13,
  unusedNightsDiscountMultiplier: 0.03,
  avgDaysPerMonth: 31
})

// ─────────────────────────────────────────────────────────────
// Validation Predicates
// ─────────────────────────────────────────────────────────────

/**
 * Check if nights count is zero
 * @pure
 */
const hasNoNights = (nightsCount) => nightsCount === 0

/**
 * Check if rate is valid (non-zero)
 * @pure
 */
const isValidRate = (rate) => rate && rate !== 0

/**
 * Check if this is a full week selection (7 nights)
 * @pure
 */
const isFullWeek = (nightsCount) => nightsCount === FULL_WEEK_NIGHTS

/**
 * Check if rental type is Monthly
 * @pure
 */
const isMonthlyRental = (rentalType) => rentalType === RENTAL_TYPES.MONTHLY

/**
 * Check if rental type is Weekly
 * @pure
 */
const isWeeklyRental = (rentalType) => rentalType === RENTAL_TYPES.WEEKLY

// ─────────────────────────────────────────────────────────────
// Logging Helpers
// ─────────────────────────────────────────────────────────────

/**
 * @effectful
 */
const logInfo = (message, data) => {
  if (data !== undefined) {
    console.log(`${LOG_PREFIX} ${message}:`, data)
  } else {
    console.log(`${LOG_PREFIX} ${message}`)
  }
}

// ─────────────────────────────────────────────────────────────
// Pure Helper Functions
// ─────────────────────────────────────────────────────────────

/**
 * Round to 2 decimal places
 * @pure
 */
const roundTo2Decimals = (value) => Math.round(value * 100) / 100

/**
 * Round to integer
 * @pure
 */
const roundToInt = (value) => Math.round(value)

/**
 * Safe parse float with fallback
 * @pure
 */
const safeParseFloat = (value, fallback = 0) =>
  parseFloat(value) || fallback

/**
 * Calculate unused nights
 * @pure
 */
const calculateUnusedNights = (nightsCount) =>
  FULL_WEEK_NIGHTS - nightsCount

/**
 * Get rental type from listing
 * @pure
 */
const extractRentalType = (listing) =>
  listing.rentalType || listing['rental type'] || DEFAULT_RENTAL_TYPE

/**
 * Get weeks offered from listing
 * @pure
 */
const extractWeeksOffered = (listing) =>
  listing.weeksOffered || listing['Weeks offered'] || DEFAULT_WEEKS_OFFERED

/**
 * Get unit markup from listing (as decimal)
 * @pure
 */
const extractUnitMarkup = (listing) =>
  safeParseFloat(listing.unitMarkup || listing['💰Unit Markup'] || 0) / 100

/**
 * Get cleaning fee from listing
 * @pure
 */
const extractCleaningFee = (listing) =>
  safeParseFloat(listing.cleaningFee || listing['💰Cleaning Cost / Maintenance Fee'] || 0)

/**
 * Get damage deposit from listing
 * @pure
 */
const extractDamageDeposit = (listing) =>
  safeParseFloat(listing.damageDeposit || listing['💰Damage Deposit'] || 0)

/**
 * Get monthly host rate from listing
 * @pure
 */
const extractMonthlyHostRate = (listing) =>
  safeParseFloat(listing.monthlyHostRate || listing['💰Monthly Host Rate'] || 0)

/**
 * Get weekly host rate from listing
 * @pure
 */
const extractWeeklyHostRate = (listing) =>
  safeParseFloat(listing.weeklyHostRate || listing['💰Weekly Host Rate'] || 0)

/**
 * Build empty price result
 * @pure
 */
const buildEmptyPriceResult = () =>
  Object.freeze({ pricePerNight: 0, fourWeekRent: 0, reservationTotal: 0 })

/**
 * Build price result
 * @pure
 */
const buildPriceResult = (pricePerNight, fourWeekRent, reservationTotal) =>
  Object.freeze({ pricePerNight, fourWeekRent, reservationTotal })

// ─────────────────────────────────────────────────────────────
// Pure Functions
// ─────────────────────────────────────────────────────────────

/**
 * Main price calculation function
 * @effectful (logging)
 * @param {Array} selectedNights - Array of selected night objects
 * @param {Object} listing - Listing object with all pricing fields
 * @param {number} reservationSpan - Number of weeks for the reservation
 * @param {Object} zatConfig - ZAT price configuration object
 * @returns {Object} Price breakdown
 */
export const calculatePrice = (selectedNights, listing, reservationSpan = DEFAULT_RESERVATION_SPAN, zatConfig = null) => {
  const nightsCount = selectedNights.length

  logInfo('=== CALCULATE PRICE ===')
  logInfo('nightsCount', nightsCount)
  logInfo('listing rental type', listing?.['rental type'] || listing?.rentalType)
  logInfo('reservationSpan', reservationSpan)

  if (hasNoNights(nightsCount)) {
    return createEmptyPriceBreakdown()
  }

  // Use default ZAT config if not provided
  const config = zatConfig || DEFAULT_ZAT_CONFIG

  const rentalType = extractRentalType(listing)
  const weeksOffered = extractWeeksOffered(listing)
  const unitMarkup = extractUnitMarkup(listing)
  const cleaningFee = extractCleaningFee(listing)
  const damageDeposit = extractDamageDeposit(listing)

  // Calculate based on rental type
  const priceResult = isMonthlyRental(rentalType)
    ? calculateMonthlyPrice(nightsCount, listing, reservationSpan, config, unitMarkup, weeksOffered)
    : isWeeklyRental(rentalType)
      ? calculateWeeklyPrice(nightsCount, listing, reservationSpan, config, unitMarkup, weeksOffered)
      : calculateNightlyPrice(nightsCount, listing, reservationSpan, config, weeksOffered)

  const { pricePerNight, fourWeekRent, reservationTotal } = priceResult
  const initialPayment = fourWeekRent + cleaningFee + damageDeposit

  logInfo('=== PRICE CALCULATION RESULT ===')
  logInfo('pricePerNight', pricePerNight)
  logInfo('fourWeekRent', fourWeekRent)
  logInfo('reservationTotal', reservationTotal)
  logInfo('initialPayment', initialPayment)

  return Object.freeze({
    basePrice: fourWeekRent,
    nightlyRate: roundTo2Decimals(pricePerNight),
    discountAmount: 0,
    markupAmount: 0,
    totalPrice: reservationTotal,
    pricePerNight: roundTo2Decimals(pricePerNight),
    numberOfNights: nightsCount,
    fourWeekRent: roundToInt(fourWeekRent),
    reservationTotal: roundToInt(reservationTotal),
    initialPayment: roundToInt(initialPayment),
    cleaningFee,
    damageDeposit,
    rentalType,
    weeksOffered,
    reservationSpan,
    valid: true
  })
}

/**
 * Calculate Monthly rental price
 * @effectful (logging)
 */
function calculateMonthlyPrice(nightsCount, listing, reservationSpan, config, unitMarkup, weeksOffered) {
  const monthlyHostRate = extractMonthlyHostRate(listing)
  if (!isValidRate(monthlyHostRate)) return buildEmptyPriceResult()

  // Step 1: Calculate Monthly Average Nightly Price
  const monthlyAvgNightly = monthlyHostRate / config.avgDaysPerMonth

  // Step 2: Calculate Average Weekly Price
  const averageWeeklyPrice = monthlyAvgNightly * FULL_WEEK_NIGHTS

  // Step 3: Calculate Prorated Nightly Host Rate
  const nightlyHostRate = averageWeeklyPrice / nightsCount

  // Step 4: Calculate Unused Nights Discount
  const unusedNights = calculateUnusedNights(nightsCount)
  const unusedNightsDiscountValue = unusedNights * config.unusedNightsDiscountMultiplier

  // Step 5: Calculate Markup & Discount Multiplier (NO Weekly Markup for Monthly)
  const multiplier = config.overallSiteMarkup + unitMarkup - unusedNightsDiscountValue + 1

  // Step 6: Calculate Total Weekly Price
  const totalWeeklyPrice = nightlyHostRate * nightsCount * multiplier

  // Step 7: Calculate Price Per Night
  const pricePerNight = totalWeeklyPrice / nightsCount

  // Step 8: Get Weekly Schedule Period
  const weeklySchedulePeriod = getWeeklySchedulePeriod(weeksOffered)

  // Step 9: Calculate 4-Week Rent
  const fourWeekRent = (pricePerNight * nightsCount * FOUR_WEEK_PERIOD) / weeklySchedulePeriod

  // Step 11: Calculate Total Reservation Price
  const reservationTotal = calculateTotalReservationPrice(
    pricePerNight,
    nightsCount,
    reservationSpan,
    weeksOffered
  )

  logInfo('Monthly calculation', {
    monthlyAvgNightly,
    averageWeeklyPrice,
    nightlyHostRate,
    unusedNights,
    unusedNightsDiscountValue,
    multiplier,
    totalWeeklyPrice,
    pricePerNight,
    weeklySchedulePeriod,
    fourWeekRent,
    reservationTotal
  })

  return buildPriceResult(pricePerNight, fourWeekRent, reservationTotal)
}

/**
 * Calculate Weekly rental price
 * @pure
 */
function calculateWeeklyPrice(nightsCount, listing, reservationSpan, config, unitMarkup, weeksOffered) {
  const weeklyHostRate = extractWeeklyHostRate(listing)
  if (!isValidRate(weeklyHostRate)) return buildEmptyPriceResult()

  // Step 1: Calculate Prorated Nightly Host Rate
  const nightlyHostRate = weeklyHostRate / nightsCount

  // Step 2: Calculate Unused Nights Discount
  const unusedNights = calculateUnusedNights(nightsCount)
  const unusedNightsDiscountValue = unusedNights * config.unusedNightsDiscountMultiplier

  // Step 3: Calculate Markup & Discount Multiplier (INCLUDES Weekly Markup)
  const multiplier = config.overallSiteMarkup + unitMarkup - unusedNightsDiscountValue + config.weeklyMarkup + 1

  // Step 4: Calculate Total Weekly Price
  const totalWeeklyPrice = nightlyHostRate * nightsCount * multiplier

  // Step 5: Calculate Price Per Night
  const pricePerNight = totalWeeklyPrice / nightsCount

  // Step 6: Get Weekly Schedule Period
  const weeklySchedulePeriod = getWeeklySchedulePeriod(weeksOffered)

  // Step 7: Calculate 4-Week Rent
  const fourWeekRent = (pricePerNight * nightsCount * FOUR_WEEK_PERIOD) / weeklySchedulePeriod

  // Step 9: Calculate Total Reservation Price
  const reservationTotal = calculateTotalReservationPrice(
    pricePerNight,
    nightsCount,
    reservationSpan,
    weeksOffered
  )

  return buildPriceResult(pricePerNight, fourWeekRent, reservationTotal)
}

/**
 * Calculate Nightly rental price
 * @pure
 */
function calculateNightlyPrice(nightsCount, listing, reservationSpan, config, weeksOffered) {
  // Step 1: Get Nightly Host Rate
  const nightlyHostRate = getNightlyRateForNights(nightsCount, listing)
  if (!isValidRate(nightlyHostRate)) return buildEmptyPriceResult()

  // Step 2: Calculate Base Price
  const basePrice = nightlyHostRate * nightsCount

  // Step 3: Calculate Discounts (Full-Time Discount for 7 nights only)
  const fullTimeDiscount = isFullWeek(nightsCount) ? basePrice * config.fullTimeDiscount : 0

  // Step 4: Price After Discounts
  const priceAfterDiscounts = basePrice - fullTimeDiscount

  // Step 5: Calculate Site Markup
  const siteMarkup = priceAfterDiscounts * config.overallSiteMarkup

  // Step 6: Calculate Total Price
  const totalPrice = basePrice - fullTimeDiscount + siteMarkup

  // Step 7: Calculate Price Per Night
  const pricePerNight = totalPrice / nightsCount

  // Step 8: Get Weekly Schedule Period
  const weeklySchedulePeriod = getWeeklySchedulePeriod(weeksOffered)

  // Step 9: Calculate 4-Week Rent
  const fourWeekRent = (pricePerNight * nightsCount * FOUR_WEEK_PERIOD) / weeklySchedulePeriod

  // Step 10: Calculate Total Reservation Price
  const reservationTotal = calculateTotalReservationPrice(
    pricePerNight,
    nightsCount,
    reservationSpan,
    weeksOffered
  )

  return buildPriceResult(pricePerNight, fourWeekRent, reservationTotal)
}

/**
 * Calculate total reservation price across all weeks
 * @pure
 */
function calculateTotalReservationPrice(pricePerNight, nightsCount, reservationSpan, weeksOffered) {
  // Get actual weeks during 4-week period
  const actualWeeksDuring4Week = getActualWeeksDuring4Week(weeksOffered)

  // Get 4-weeks per period from reservation span
  const fourWeeksPerPeriod = RESERVATION_SPAN_PERIODS[reservationSpan] || (reservationSpan / FOUR_WEEK_PERIOD)

  // Calculate actual weeks during reservation span (with CEILING)
  const actualWeeksDuringReservation = Math.ceil(actualWeeksDuring4Week * fourWeeksPerPeriod)

  // Calculate total
  return pricePerNight * nightsCount * actualWeeksDuringReservation
}

/**
 * Get weekly schedule period based on "Weeks offered" pattern
 * @pure
 */
function getWeeklySchedulePeriod(weeksOffered) {
  const pattern = (weeksOffered || DEFAULT_WEEKS_OFFERED).toLowerCase()

  // Check for various patterns
  if (pattern.includes('1 on 1 off') || pattern.includes('1on1off') ||
      (pattern.includes('one week on') && pattern.includes('one week off')) ||
      (pattern.includes('1 week on') && pattern.includes('1 week off'))) {
    return 2
  }

  if (pattern.includes('2 on 2 off') || pattern.includes('2on2off') ||
      (pattern.includes('two week') && pattern.includes('two week')) ||
      (pattern.includes('2 week on') && pattern.includes('2 week off'))) {
    return 2
  }

  if (pattern.includes('1 on 3 off') || pattern.includes('1on3off') ||
      (pattern.includes('one week on') && pattern.includes('three week')) ||
      (pattern.includes('1 week on') && pattern.includes('3 week off'))) {
    return 4
  }

  return 1 // Default: "Every week"
}

/**
 * Get actual weeks during 4-week period based on pattern
 * @pure
 */
function getActualWeeksDuring4Week(weeksOffered) {
  const pattern = (weeksOffered || DEFAULT_WEEKS_OFFERED).toLowerCase()

  // Check for various patterns
  if (pattern.includes('1 on 1 off') || pattern.includes('1on1off') ||
      (pattern.includes('one week on') && pattern.includes('one week off')) ||
      (pattern.includes('1 week on') && pattern.includes('1 week off'))) {
    return 2
  }

  if (pattern.includes('2 on 2 off') || pattern.includes('2on2off') ||
      (pattern.includes('two week') && pattern.includes('two week')) ||
      (pattern.includes('2 week on') && pattern.includes('2 week off'))) {
    return 2
  }

  if (pattern.includes('1 on 3 off') || pattern.includes('1on3off') ||
      (pattern.includes('one week on') && pattern.includes('three week')) ||
      (pattern.includes('1 week on') && pattern.includes('3 week off'))) {
    return 1
  }

  return FOUR_WEEK_PERIOD // Default: "Every week" = present all 4 weeks
}

/**
 * Get nightly rate based on number of nights from listing
 * @pure
 * @param {number} nightsCount - Number of nights selected
 * @param {Object} listing - Listing object with price fields
 * @returns {number} Base nightly rate from host
 */
function getNightlyRateForNights(nightsCount, listing) {
  // Map nights to price fields
  const priceFieldMap = {
    1: listing.nightlyHostRateFor1Night || listing['💰Nightly Host Rate for 1 night'],
    2: listing.nightlyHostRateFor2Nights || listing['💰Nightly Host Rate for 2 nights'],
    3: listing.nightlyHostRateFor3Nights || listing['💰Nightly Host Rate for 3 nights'],
    4: listing.nightlyHostRateFor4Nights || listing['💰Nightly Host Rate for 4 nights'],
    5: listing.nightlyHostRateFor5Nights || listing['💰Nightly Host Rate for 5 nights'],
    7: listing.nightlyHostRateFor7Nights || listing['💰Nightly Host Rate for 7 nights']
  }

  const rate = safeParseFloat(priceFieldMap[nightsCount])

  // If no rate found for exact nights, fall back to 4-night rate
  if (!isValidRate(rate)) {
    return safeParseFloat(listing['💰Nightly Host Rate for 4 nights'])
  }

  return rate
}

/**
 * Create empty price breakdown for invalid cases
 * @pure
 * @returns {Object} Empty price breakdown
 */
function createEmptyPriceBreakdown() {
  return Object.freeze({
    basePrice: 0,
    nightlyRate: 0,
    discountAmount: 0,
    markupAmount: 0,
    totalPrice: 0,
    pricePerNight: 0,
    numberOfNights: 0,
    fourWeekRent: 0,
    reservationTotal: 0,
    initialPayment: 0,
    cleaningFee: 0,
    damageDeposit: 0,
    valid: false
  })
}

// ─────────────────────────────────────────────────────────────
// Exported Test Constants
// ─────────────────────────────────────────────────────────────

/**
 * Exported for testing purposes
 * @test
 */
export const __test__ = Object.freeze({
  // Constants
  LOG_PREFIX,
  RENTAL_TYPES,
  DEFAULT_RENTAL_TYPE,
  DEFAULT_WEEKS_OFFERED,
  DEFAULT_RESERVATION_SPAN,
  FULL_WEEK_NIGHTS,
  FOUR_WEEK_PERIOD,
  RESERVATION_SPAN_PERIODS,
  DEFAULT_ZAT_CONFIG,

  // Predicates
  hasNoNights,
  isValidRate,
  isFullWeek,
  isMonthlyRental,
  isWeeklyRental,

  // Helpers
  roundTo2Decimals,
  roundToInt,
  safeParseFloat,
  calculateUnusedNights,
  extractRentalType,
  extractWeeksOffered,
  extractUnitMarkup,
  extractCleaningFee,
  extractDamageDeposit,
  extractMonthlyHostRate,
  extractWeeklyHostRate,
  buildEmptyPriceResult,
  buildPriceResult,

  // Internal functions
  getWeeklySchedulePeriod,
  getActualWeeksDuring4Week,
  getNightlyRateForNights,
  calculateTotalReservationPrice,
  createEmptyPriceBreakdown
})
