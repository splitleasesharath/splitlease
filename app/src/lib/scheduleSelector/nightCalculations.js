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
 * Based on SearchScheduleSelector logic for wrap-around handling
 */
export const calculateCheckInCheckOut = (days) => {
  if (days.length === 0) {
    return { checkIn: null, checkOut: null };
  }

  if (days.length === 1) {
    return { checkIn: days[0], checkOut: days[0] };
  }

  const sorted = sortDays(days);
  const dayNumbers = sorted.map(d => d.dayOfWeek);
  const hasSunday = dayNumbers.includes(0);
  const hasSaturday = dayNumbers.includes(6);

  // Check if this is a wrap-around case
  if (hasSunday && hasSaturday && sorted.length < 7) {
    // Find the gap (unselected days) in the week
    let gapStart = -1;
    let gapEnd = -1;

    // Look for the gap in the sorted days
    for (let i = 0; i < dayNumbers.length - 1; i++) {
      if (dayNumbers[i + 1] - dayNumbers[i] > 1) {
        // Found the gap
        gapStart = dayNumbers[i] + 1;  // First unselected day
        gapEnd = dayNumbers[i + 1] - 1;  // Last unselected day
        break;
      }
    }

    if (gapStart !== -1 && gapEnd !== -1) {
      // Wrap-around case with a gap in the middle
      // Check-in: First selected day AFTER the gap ends
      // Check-out: Last selected day BEFORE the gap starts

      // Check-in is the smallest day after the gap
      let checkInDay = null;
      for (const day of sorted) {
        if (day.dayOfWeek > gapEnd) {
          checkInDay = day;
          break;
        }
      }
      if (!checkInDay) {
        // Wrap to Sunday
        checkInDay = sorted[0];
      }

      // Check-out is the largest day before the gap
      let checkOutDay = null;
      for (let i = sorted.length - 1; i >= 0; i--) {
        if (sorted[i].dayOfWeek < gapStart) {
          checkOutDay = sorted[i];
          break;
        }
      }
      if (!checkOutDay) {
        // Wrap to Saturday
        checkOutDay = sorted[sorted.length - 1];
      }

      return { checkIn: checkInDay, checkOut: checkOutDay };
    }
  }

  // Non-wrap-around case: use first and last in sorted order
  return { checkIn: sorted[0], checkOut: sorted[sorted.length - 1] };
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
