/**
 * Price Calculation Utilities
 * Handles all pricing logic for view-split-lease page
 *
 * Usage:
 *   import { calculate4WeekRent, calculateReservationTotal } from './priceCalculations.js';
 */

/**
 * Calculate 4-week rent based on nightly price and selected nights
 * Formula: nightly price × nights per week × 4 weeks
 * @param {number} nightlyPrice - Price per night
 * @param {number} nightsPerWeek - Number of nights selected per week
 * @returns {number} 4-week rent amount
 */
export function calculate4WeekRent(nightlyPrice, nightsPerWeek) {
  if (!nightlyPrice || !nightsPerWeek) return 0;
  return nightlyPrice * nightsPerWeek * 4;
}

/**
 * Calculate estimated reservation total
 * Formula: 4-week rent × (total weeks / 4)
 * @param {number} fourWeekRent - 4-week rent amount
 * @param {number} totalWeeks - Total reservation span in weeks
 * @returns {number} Estimated total cost
 */
export function calculateReservationTotal(fourWeekRent, totalWeeks) {
  if (!fourWeekRent || !totalWeeks) return 0;
  return fourWeekRent * (totalWeeks / 4);
}

/**
 * Get nightly price based on number of nights selected
 * Matches Bubble logic for price field selection
 * @param {object} listing - Listing object with price fields
 * @param {number} nightsSelected - Number of nights per week (2-7)
 * @returns {number|null} Nightly price
 */
export function getNightlyPriceForNights(listing, nightsSelected) {
  if (!listing || !nightsSelected) return null;

  // Price override takes precedence
  if (listing['💰Price Override']) {
    return listing['💰Price Override'];
  }

  // Map nights to price fields
  const priceFieldMap = {
    2: '💰Nightly Host Rate for 2 nights',
    3: '💰Nightly Host Rate for 3 nights',
    4: '💰Nightly Host Rate for 4 nights',
    5: '💰Nightly Host Rate for 5 nights',
    7: '💰Nightly Host Rate for 7 nights'
  };

  const fieldName = priceFieldMap[nightsSelected];
  if (fieldName && listing[fieldName]) {
    return listing[fieldName];
  }

  // Default to 4-night rate if available
  return listing['💰Nightly Host Rate for 4 nights'] || null;
}

/**
 * Format price as currency string
 * @param {number} amount - Dollar amount
 * @param {boolean} showCents - Whether to show cents (default: false)
 * @returns {string} Formatted price (e.g., "$1,234" or "$1,234.56")
 */
export function formatPrice(amount, showCents = false) {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '$0';
  }

  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: showCents ? 2 : 0,
    maximumFractionDigits: showCents ? 2 : 0
  }).format(amount);

  return formatted;
}

/**
 * Calculate complete pricing breakdown
 * @param {object} listing - Listing object
 * @param {number} nightsPerWeek - Nights selected per week
 * @param {number} reservationWeeks - Total reservation span in weeks
 * @returns {object} Complete pricing breakdown
 */
export function calculatePricingBreakdown(listing, nightsPerWeek, reservationWeeks) {
  const nightlyPrice = getNightlyPriceForNights(listing, nightsPerWeek);

  if (!nightlyPrice) {
    return {
      nightlyPrice: null,
      fourWeekRent: null,
      reservationTotal: null,
      cleaningFee: listing['💰Cleaning Cost / Maintenance Fee'] || 0,
      damageDeposit: listing['💰Damage Deposit'] || 0,
      valid: false
    };
  }

  const fourWeekRent = calculate4WeekRent(nightlyPrice, nightsPerWeek);
  const reservationTotal = calculateReservationTotal(fourWeekRent, reservationWeeks);

  return {
    nightlyPrice,
    fourWeekRent,
    reservationTotal,
    cleaningFee: listing['💰Cleaning Cost / Maintenance Fee'] || 0,
    damageDeposit: listing['💰Damage Deposit'] || 0,
    grandTotal: reservationTotal + (listing['💰Cleaning Cost / Maintenance Fee'] || 0),
    valid: true
  };
}

/**
 * Validate if enough days are selected for price calculation
 * @param {number} daysSelected - Number of days selected
 * @returns {boolean} True if valid for pricing
 */
export function isValidForPricing(daysSelected) {
  return daysSelected >= 2 && daysSelected <= 7;
}

/**
 * Get price display message based on selection state
 * @param {number|null} daysSelected - Number of days selected
 * @returns {string} Display message
 */
export function getPriceDisplayMessage(daysSelected) {
  if (!daysSelected || daysSelected < 2) {
    return 'Please Select More Days';
  }
  if (daysSelected > 7) {
    return 'Please Select 7 Days or Less';
  }
  return null; // Valid selection
}
