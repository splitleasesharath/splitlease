/**
 * Day helper utilities for schedule selectors
 *
 * Day indices use JavaScript's 0-based standard (matching Date.getDay()):
 * 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday
 */

// Re-export day constants from canonical source (dayUtils.js)
import { DAY_NAMES, DAY_LETTERS, DAY_ABBREV } from '../dayUtils.js';
export { DAY_NAMES, DAY_LETTERS, DAY_ABBREV };

/**
 * Create a Day object from day of week
 * @param {number} dayOfWeek - 0-6 (Sunday-Saturday)
 * @param {boolean} isAvailable - Whether the day is available
 */
export const createDay = (dayOfWeek, isAvailable = true) => {
  const nextDay = (dayOfWeek + 1) % 7;
  const previousNight = (dayOfWeek - 1 + 7) % 7;

  return {
    id: `day-${dayOfWeek}`,
    name: DAY_NAMES[dayOfWeek],
    dayOfWeek,
    singleLetter: DAY_LETTERS[dayOfWeek],
    first3Letters: DAY_ABBREV[dayOfWeek],
    dayIndex: dayOfWeek,  // 0-based day index (0=Sunday through 6=Saturday)
    nextDay,
    previousNight,
    associatedNight: dayOfWeek,
    isAvailable
  };
};

/**
 * Sort days by day of week
 */
export const sortDays = (days) => {
  return [...days].sort((a, b) => a.dayOfWeek - b.dayOfWeek);
};

/**
 * Get next day
 */
export const getNextDay = (day) => {
  const nextDayOfWeek = (day.dayOfWeek + 1) % 7;
  return createDay(nextDayOfWeek);
};

/**
 * Get previous day
 */
export const getPreviousDay = (day) => {
  const previousDayOfWeek = (day.dayOfWeek - 1 + 7) % 7;
  return createDay(previousDayOfWeek);
};

/**
 * Convert day to number
 */
export const dayToNumber = (day) => day.dayOfWeek;

/**
 * Create all 7 days
 */
export const createAllDays = (availableDays = [0, 1, 2, 3, 4, 5, 6]) => {
  return Array.from({ length: 7 }, (_, i) => {
    return createDay(i, availableDays.includes(i));
  });
};

/**
 * Create Night object from day of week (0-6 indexing)
 * @param {number} nightNumber - 0-6 (Sunday-Saturday)
 */
export const createNight = (nightNumber) => {
  const nextDay = (nightNumber + 1) % 7;
  const nextNight = (nightNumber + 1) % 7;
  const previousDay = (nightNumber - 1 + 7) % 7;

  return {
    id: `night-${nightNumber}`,
    name: DAY_NAMES[nightNumber],
    nightNumber,
    dayIndex: nightNumber,  // 0-based day index (0=Sunday through 6=Saturday)
    associatedCheckin: nightNumber,
    associatedCheckout: nextDay,
    nextDay,
    nextNight,
    previousDay,
    sameDay: nightNumber,
    first3Letters: DAY_ABBREV[nightNumber],
    singleLetter: DAY_LETTERS[nightNumber]
  };
};

/**
 * Create nights from selected days
 */
export const createNightsFromDays = (days) => {
  if (days.length < 2) return [];

  const sortedDays = sortDays(days);
  const nights = [];

  // Nights are between check-in and check-out (days - 1)
  for (let i = 0; i < sortedDays.length - 1; i++) {
    nights.push(createNight(sortedDays[i].dayOfWeek));
  }

  return nights;
};

/**
 * Get unused nights from all available nights
 */
export const getUnusedNights = (allNights, selectedNights) => {
  const selectedNightNumbers = selectedNights.map(n => n.nightNumber);
  return allNights.filter(night => !selectedNightNumbers.includes(night.nightNumber));
};

/**
 * Get not selected days
 */
export const getNotSelectedDays = (allDays, selectedDays) => {
  const selectedDayNumbers = selectedDays.map(d => d.dayOfWeek);
  return allDays.filter(day => !selectedDayNumbers.includes(day.dayOfWeek));
};

/**
 * Check if a day is in range
 */
export const isDayInRange = (day, startDay, endDay) => {
  const dayNum = day.dayOfWeek;
  const start = startDay.dayOfWeek;
  const end = endDay.dayOfWeek;

  if (start <= end) {
    return dayNum >= start && dayNum <= end;
  } else {
    // Wraps around week
    return dayNum >= start || dayNum <= end;
  }
};
