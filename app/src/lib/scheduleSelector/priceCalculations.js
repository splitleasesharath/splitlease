/**
 * Complete Price Calculation Implementation
 * Based on Bubble.io Listing Schedule Selector formulas
 * Supports Monthly, Weekly, and Nightly rental types
 */

/**
 * Reservation span to 4-week period mapping
 */
const RESERVATION_SPAN_PERIODS = {
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
};

/**
 * Main price calculation function
 * @param {Array} selectedNights - Array of selected night objects
 * @param {Object} listing - Listing object with all pricing fields
 * @param {number} reservationSpan - Number of weeks for the reservation
 * @param {Object} zatConfig - ZAT price configuration object
 * @returns {Object} Price breakdown
 */
export const calculatePrice = (selectedNights, listing, reservationSpan = 13, zatConfig = null) => {
  const nightsCount = selectedNights.length;

  if (nightsCount === 0) {
    return createEmptyPriceBreakdown();
  }

  // Use default ZAT config if not provided
  const config = zatConfig || {
    overallSiteMarkup: 0.17,
    weeklyMarkup: 0,
    fullTimeDiscount: 0.13,
    unusedNightsDiscountMultiplier: 0.03,
    avgDaysPerMonth: 31
  };

  const rentalType = listing.rentalType || listing['rental type'] || 'Nightly';
  const weeksOffered = listing.weeksOffered || listing['Weeks offered'] || 'Every week';
  const unitMarkup = parseFloat(listing.unitMarkup || listing['💰Unit Markup'] || 0) / 100;
  const cleaningFee = parseFloat(listing.cleaningFee || listing['💰Cleaning Cost / Maintenance Fee'] || 0);
  const damageDeposit = parseFloat(listing.damageDeposit || listing['💰Damage Deposit'] || 0);

  let pricePerNight = 0;
  let fourWeekRent = 0;
  let reservationTotal = 0;

  if (rentalType === 'Monthly') {
    const result = calculateMonthlyPrice(nightsCount, listing, reservationSpan, config, unitMarkup, weeksOffered);
    pricePerNight = result.pricePerNight;
    fourWeekRent = result.fourWeekRent;
    reservationTotal = result.reservationTotal;

  } else if (rentalType === 'Weekly') {
    const result = calculateWeeklyPrice(nightsCount, listing, reservationSpan, config, unitMarkup, weeksOffered);
    pricePerNight = result.pricePerNight;
    fourWeekRent = result.fourWeekRent;
    reservationTotal = result.reservationTotal;

  } else {
    const result = calculateNightlyPrice(nightsCount, listing, reservationSpan, config, weeksOffered);
    pricePerNight = result.pricePerNight;
    fourWeekRent = result.fourWeekRent;
    reservationTotal = result.reservationTotal;
  }

  const initialPayment = fourWeekRent + cleaningFee + damageDeposit;

  return {
    basePrice: fourWeekRent,
    nightlyRate: Math.round(pricePerNight * 100) / 100,
    discountAmount: 0,
    markupAmount: 0,
    totalPrice: reservationTotal,
    pricePerNight: Math.round(pricePerNight * 100) / 100,
    numberOfNights: nightsCount,
    fourWeekRent: Math.round(fourWeekRent),
    reservationTotal: Math.round(reservationTotal),
    initialPayment: Math.round(initialPayment),
    cleaningFee,
    damageDeposit,
    rentalType,
    weeksOffered,
    reservationSpan,
    valid: true
  };
};

/**
 * Calculate Monthly rental price
 */
function calculateMonthlyPrice(nightsCount, listing, reservationSpan, config, unitMarkup, weeksOffered) {
  const monthlyHostRate = parseFloat(listing.monthlyHostRate || listing['💰Monthly Host Rate'] || 0);
  if (!monthlyHostRate) return { pricePerNight: 0, fourWeekRent: 0, reservationTotal: 0 };

  const monthlyAvgNightly = monthlyHostRate / config.avgDaysPerMonth;
  const averageWeeklyPrice = monthlyAvgNightly * 7;
  const nightlyHostRate = averageWeeklyPrice / nightsCount;
  const unusedNights = 7 - nightsCount;
  const unusedNightsDiscountValue = unusedNights * config.unusedNightsDiscountMultiplier;
  const multiplier = config.overallSiteMarkup + unitMarkup - unusedNightsDiscountValue + 1;
  const totalWeeklyPrice = nightlyHostRate * nightsCount * multiplier;
  const pricePerNight = totalWeeklyPrice / nightsCount;
  const weeklySchedulePeriod = getWeeklySchedulePeriod(weeksOffered);
  const fourWeekRent = (pricePerNight * nightsCount * 4) / weeklySchedulePeriod;
  const reservationTotal = calculateTotalReservationPrice(
    pricePerNight,
    nightsCount,
    reservationSpan,
    weeksOffered
  );

  return { pricePerNight, fourWeekRent, reservationTotal };
}

/**
 * Calculate Weekly rental price
 */
function calculateWeeklyPrice(nightsCount, listing, reservationSpan, config, unitMarkup, weeksOffered) {
  const weeklyHostRate = parseFloat(listing.weeklyHostRate || listing['💰Weekly Host Rate'] || 0);
  if (!weeklyHostRate) return { pricePerNight: 0, fourWeekRent: 0, reservationTotal: 0 };

  // Step 1: Calculate Prorated Nightly Host Rate
  const nightlyHostRate = weeklyHostRate / nightsCount;

  // Step 2: Calculate Unused Nights Discount
  const unusedNights = 7 - nightsCount;
  const unusedNightsDiscountValue = unusedNights * config.unusedNightsDiscountMultiplier;

  // Step 3: Calculate Markup & Discount Multiplier (INCLUDES Weekly Markup)
  const multiplier = config.overallSiteMarkup + unitMarkup - unusedNightsDiscountValue + config.weeklyMarkup + 1;

  // Step 4: Calculate Total Weekly Price
  const totalWeeklyPrice = nightlyHostRate * nightsCount * multiplier;

  // Step 5: Calculate Price Per Night
  const pricePerNight = totalWeeklyPrice / nightsCount;

  // Step 6: Get Weekly Schedule Period
  const weeklySchedulePeriod = getWeeklySchedulePeriod(weeksOffered);

  // Step 7: Calculate 4-Week Rent
  const fourWeekRent = (pricePerNight * nightsCount * 4) / weeklySchedulePeriod;

  // Step 9: Calculate Total Reservation Price
  const reservationTotal = calculateTotalReservationPrice(
    pricePerNight,
    nightsCount,
    reservationSpan,
    weeksOffered
  );

  return { pricePerNight, fourWeekRent, reservationTotal };
}

/**
 * Calculate Nightly rental price
 */
function calculateNightlyPrice(nightsCount, listing, reservationSpan, config, weeksOffered) {
  // Step 1: Get Nightly Host Rate
  const nightlyHostRate = getNightlyRateForNights(nightsCount, listing);
  if (!nightlyHostRate) return { pricePerNight: 0, fourWeekRent: 0, reservationTotal: 0 };

  // Step 2: Calculate Base Price
  const basePrice = nightlyHostRate * nightsCount;

  // Step 3: Calculate Discounts (Full-Time Discount for 7 nights only)
  const fullTimeDiscount = nightsCount === 7 ? basePrice * config.fullTimeDiscount : 0;

  // Step 4: Price After Discounts
  const priceAfterDiscounts = basePrice - fullTimeDiscount;

  // Step 5: Calculate Site Markup
  const siteMarkup = priceAfterDiscounts * config.overallSiteMarkup;

  // Step 6: Calculate Total Price
  const totalPrice = basePrice - fullTimeDiscount + siteMarkup;

  // Step 7: Calculate Price Per Night
  const pricePerNight = totalPrice / nightsCount;

  // Step 8: Get Weekly Schedule Period
  const weeklySchedulePeriod = getWeeklySchedulePeriod(weeksOffered);

  // Step 9: Calculate 4-Week Rent
  const fourWeekRent = (pricePerNight * nightsCount * 4) / weeklySchedulePeriod;

  // Step 10: Calculate Total Reservation Price
  const reservationTotal = calculateTotalReservationPrice(
    pricePerNight,
    nightsCount,
    reservationSpan,
    weeksOffered
  );

  return { pricePerNight, fourWeekRent, reservationTotal };
}

/**
 * Calculate total reservation price across all weeks
 */
function calculateTotalReservationPrice(pricePerNight, nightsCount, reservationSpan, weeksOffered) {
  // Get actual weeks during 4-week period
  const actualWeeksDuring4Week = getActualWeeksDuring4Week(weeksOffered);

  // Get 4-weeks per period from reservation span
  const fourWeeksPerPeriod = RESERVATION_SPAN_PERIODS[reservationSpan] || (reservationSpan / 4);

  // Calculate actual weeks during reservation span (with CEILING)
  const actualWeeksDuringReservation = Math.ceil(actualWeeksDuring4Week * fourWeeksPerPeriod);

  // Calculate total
  const totalReservationPrice = pricePerNight * nightsCount * actualWeeksDuringReservation;

  return totalReservationPrice;
}

/**
 * Get weekly schedule period based on "Weeks offered" pattern
 */
function getWeeklySchedulePeriod(weeksOffered) {
  const pattern = (weeksOffered || 'every week').toLowerCase();

  // Check for various patterns
  if (pattern.includes('1 on 1 off') || pattern.includes('1on1off') ||
      (pattern.includes('one week on') && pattern.includes('one week off')) ||
      (pattern.includes('1 week on') && pattern.includes('1 week off'))) {
    return 2;
  }

  if (pattern.includes('2 on 2 off') || pattern.includes('2on2off') ||
      (pattern.includes('two week') && pattern.includes('two week')) ||
      (pattern.includes('2 week on') && pattern.includes('2 week off'))) {
    return 2;
  }

  if (pattern.includes('1 on 3 off') || pattern.includes('1on3off') ||
      (pattern.includes('one week on') && pattern.includes('three week')) ||
      (pattern.includes('1 week on') && pattern.includes('3 week off'))) {
    return 4;
  }

  return 1; // Default: "Every week"
}

/**
 * Get actual weeks during 4-week period based on pattern
 */
function getActualWeeksDuring4Week(weeksOffered) {
  const pattern = (weeksOffered || 'every week').toLowerCase();

  // Check for various patterns
  if (pattern.includes('1 on 1 off') || pattern.includes('1on1off') ||
      (pattern.includes('one week on') && pattern.includes('one week off')) ||
      (pattern.includes('1 week on') && pattern.includes('1 week off'))) {
    return 2;
  }

  if (pattern.includes('2 on 2 off') || pattern.includes('2on2off') ||
      (pattern.includes('two week') && pattern.includes('two week')) ||
      (pattern.includes('2 week on') && pattern.includes('2 week off'))) {
    return 2;
  }

  if (pattern.includes('1 on 3 off') || pattern.includes('1on3off') ||
      (pattern.includes('one week on') && pattern.includes('three week')) ||
      (pattern.includes('1 week on') && pattern.includes('3 week off'))) {
    return 1;
  }

  return 4; // Default: "Every week" = present all 4 weeks
}

/**
 * Get nightly rate based on number of nights from listing
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
  };

  const rate = parseFloat(priceFieldMap[nightsCount] || 0);

  // If no rate found for exact nights, fall back to 4-night rate
  if (!rate || rate === 0) {
    return parseFloat(listing['💰Nightly Host Rate for 4 nights'] || 0);
  }

  return rate;
}

/**
 * Create empty price breakdown for invalid cases
 * @returns {Object} Empty price breakdown
 */
function createEmptyPriceBreakdown() {
  return {
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
  };
}
