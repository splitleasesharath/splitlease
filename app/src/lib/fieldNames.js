/**
 * Bubble.io field name constants
 * Centralized to prevent typos and enable refactoring
 */
export const BUBBLE_FIELDS = {
  // Pricing fields
  NIGHTLY_RATE_1: '💰Nightly Host Rate for 1 night',
  NIGHTLY_RATE_2: '💰Nightly Host Rate for 2 nights',
  NIGHTLY_RATE_3: '💰Nightly Host Rate for 3 nights',
  NIGHTLY_RATE_4: '💰Nightly Host Rate for 4 nights',
  NIGHTLY_RATE_5: '💰Nightly Host Rate for 5 nights',
  NIGHTLY_RATE_7: '💰Nightly Host Rate for 7 nights',
  WEEKLY_HOST_RATE: '💰Weekly Host Rate',
  MONTHLY_HOST_RATE: '💰Monthly Host Rate',
  CLEANING_FEE: '💰Cleaning Cost / Maintenance Fee',
  DAMAGE_DEPOSIT: '💰Damage Deposit',
  UNIT_MARKUP: '💰Unit Markup',
  PRICE_OVERRIDE: '💰Price Override',

  // Location fields
  ADDRESS: 'Location - Address',
  BOROUGH: 'Location - Borough',
  NEIGHBORHOOD: 'Location - Hood',
  CITY: 'Location - City',

  // Feature fields
  TYPE_OF_SPACE: 'Features - Type of Space',
  QTY_BEDROOMS: 'Features - Qty Bedrooms',
  QTY_BATHROOMS: 'Features - Qty Bathrooms',
  MAX_GUESTS: 'Features - Max Guests',
};

/**
 * Get nightly rate field name for given night count
 * @param {number} nights - Number of nights (1-7)
 * @returns {string} Field name
 */
export function getNightlyRateFieldName(nights) {
  const fieldMap = {
    1: BUBBLE_FIELDS.NIGHTLY_RATE_1,
    2: BUBBLE_FIELDS.NIGHTLY_RATE_2,
    3: BUBBLE_FIELDS.NIGHTLY_RATE_3,
    4: BUBBLE_FIELDS.NIGHTLY_RATE_4,
    5: BUBBLE_FIELDS.NIGHTLY_RATE_5,
    7: BUBBLE_FIELDS.NIGHTLY_RATE_7,
  };
  return fieldMap[nights] || BUBBLE_FIELDS.NIGHTLY_RATE_4;
}
