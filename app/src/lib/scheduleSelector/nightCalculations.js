import { sortDays, getNextDay, createNight } from './dayHelpers.js';

/**
 * Calculate nights from selected days
 */
export const calculateNightsFromDays = (days) => {
  if (days.length < 2) return [];

  const sorted = sortDays(days);
  const nights = [];

  // Nights are the periods between consecutive days
  // For example: Mon, Tue, Wed selected = Mon night, Tue night (2 nights)
  for (let i = 0; i < sorted.length - 1; i++) {
    nights.push(createNight(sorted[i].dayOfWeek));
  }

  return nights;
};

/**
 * Calculate check-in and check-out days
 * Handles wrap-around cases (e.g., Sat-Sun-Mon-Tue-Wed)
 *
 * For wrap-around selections with both Saturday (6) and Sunday (0):
 * - Find the gap in the selection
 * - Check-in is the first day AFTER the gap
 * - Check-out is the last day BEFORE the gap
 *
 * @example
 * Sat(6), Sun(0), Mon(1), Tue(2), Wed(3) -> Check-in: Sat, Check-out: Wed
 * Mon(1), Tue(2), Wed(3), Thu(4), Fri(5) -> Check-in: Mon, Check-out: Fri
 */
export const calculateCheckInCheckOut = (days) => {
  if (days.length === 0) {
    return { checkIn: null, checkOut: null };
  }

  const sorted = sortDays(days);
  const dayNumbers = sorted.map(d => d.dayOfWeek);

  // Check if we have a wrap-around case (both Saturday and Sunday present)
  const hasSaturday = dayNumbers.includes(6);
  const hasSunday = dayNumbers.includes(0);

  if (hasSaturday && hasSunday && days.length < 7) {
    // This is a wrap-around case - find the gap
    let gapStart = -1;

    for (let i = 0; i < dayNumbers.length - 1; i++) {
      if (dayNumbers[i + 1] - dayNumbers[i] > 1) {
        // Found a gap
        gapStart = i + 1;
        break;
      }
    }

    if (gapStart !== -1) {
      // The selection wraps around
      // Check-in is the first day after the gap (e.g., Saturday)
      // Check-out is the last day before the gap (e.g., Wednesday)
      const checkIn = sorted[gapStart];
      const checkOut = sorted[gapStart - 1];

      return { checkIn, checkOut };
    }
  }

  // Standard case: no wrap-around
  const checkIn = sorted[0];
  const checkOut = sorted[sorted.length - 1];

  return { checkIn, checkOut };
};

/**
 * Handle Sunday corner case for check-in/check-out
 */
export const handleSundayTransition = (days) => {
  const sorted = sortDays(days);
  const checkInDay = sorted[0];
  const checkOutDay = sorted[sorted.length - 1];

  // Start night is the first selected day's night
  const startNight = checkInDay.dayOfWeek;

  // End night is the last night before checkout
  const endNight = checkOutDay.dayOfWeek;

  return {
    checkInDay,
    checkOutDay,
    startNight,
    endNight
  };
};

/**
 * Calculate unused nights based on available nights
 */
export const calculateUnusedNights = (availableNights, selectedNights) => {
  return Math.max(0, availableNights - selectedNights.length);
};

/**
 * Calculate start and end night numbers
 */
export const calculateStartEndNightNumbers = (days) => {
  if (days.length === 0) {
    return { startNightNumber: null, endNightNumber: null };
  }

  const sorted = sortDays(days);
  const startNightNumber = sorted[0].dayOfWeek;
  const endNightNumber = sorted[sorted.length - 1].dayOfWeek;

  return { startNightNumber, endNightNumber };
};

/**
 * Calculate days as numbers array
 */
export const calculateDaysAsNumbers = (days) => {
  return sortDays(days).map(day => day.dayOfWeek);
};

/**
 * Calculate selected nights as numbers
 */
export const calculateSelectedNightsAsNumbers = (nights) => {
  return nights.map(night => night.nightNumber);
};

/**
 * Count number of selected nights
 */
export const countSelectedNights = (days) => {
  // Nights = Days - 1 (because nights are between check-in and check-out)
  return Math.max(0, days.length - 1);
};
