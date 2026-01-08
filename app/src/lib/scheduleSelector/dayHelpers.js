/**
 * Day helper utilities for schedule selectors
 *
 * Day indices use JavaScript's 0-based standard (matching Date.getDay()):
 * 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday
 *
 * @module lib/scheduleSelector/dayHelpers
 */

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

export const DAY_NAMES = Object.freeze([
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
])

export const DAY_LETTERS = Object.freeze(['S', 'M', 'T', 'W', 'T', 'F', 'S'])

export const DAY_ABBREV = Object.freeze(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'])

const ALL_DAYS = Object.freeze([0, 1, 2, 3, 4, 5, 6])

// ─────────────────────────────────────────────────────────────
// Pure Functions
// ─────────────────────────────────────────────────────────────

/**
 * Create a Day object from day of week
 * @pure
 * @param {number} dayOfWeek - 0-6 (Sunday-Saturday)
 * @param {boolean} isAvailable - Whether the day is available
 */
export const createDay = (dayOfWeek, isAvailable = true) => {
  const nextDay = (dayOfWeek + 1) % 7
  const previousNight = (dayOfWeek - 1 + 7) % 7

  return Object.freeze({
    id: `day-${dayOfWeek}`,
    name: DAY_NAMES[dayOfWeek],
    dayOfWeek,
    singleLetter: DAY_LETTERS[dayOfWeek],
    first3Letters: DAY_ABBREV[dayOfWeek],
    dayIndex: dayOfWeek,
    nextDay,
    previousNight,
    associatedNight: dayOfWeek,
    isAvailable
  })
}

/**
 * Sort days by day of week
 * @pure
 */
export const sortDays = (days) =>
  [...days].sort((a, b) => a.dayOfWeek - b.dayOfWeek)

/**
 * Get next day
 * @pure
 */
export const getNextDay = (day) => {
  const nextDayOfWeek = (day.dayOfWeek + 1) % 7
  return createDay(nextDayOfWeek)
}

/**
 * Get previous day
 * @pure
 */
export const getPreviousDay = (day) => {
  const previousDayOfWeek = (day.dayOfWeek - 1 + 7) % 7
  return createDay(previousDayOfWeek)
}

/**
 * Convert day to number
 * @pure
 */
export const dayToNumber = (day) => day.dayOfWeek

/**
 * Create all 7 days
 * @pure
 */
export const createAllDays = (availableDays = ALL_DAYS) =>
  Object.freeze(Array.from({ length: 7 }, (_, i) =>
    createDay(i, availableDays.includes(i))
  ))

/**
 * Create Night object from day of week (0-6 indexing)
 * @pure
 * @param {number} nightNumber - 0-6 (Sunday-Saturday)
 */
export const createNight = (nightNumber) => {
  const nextDay = (nightNumber + 1) % 7
  const nextNight = (nightNumber + 1) % 7
  const previousDay = (nightNumber - 1 + 7) % 7

  return Object.freeze({
    id: `night-${nightNumber}`,
    name: DAY_NAMES[nightNumber],
    nightNumber,
    dayIndex: nightNumber,
    associatedCheckin: nightNumber,
    associatedCheckout: nextDay,
    nextDay,
    nextNight,
    previousDay,
    sameDay: nightNumber,
    first3Letters: DAY_ABBREV[nightNumber],
    singleLetter: DAY_LETTERS[nightNumber]
  })
}

/**
 * Create nights from selected days
 * @pure
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
 * @pure
 */
export const getUnusedNights = (allNights, selectedNights) => {
  const selectedNightNumbers = selectedNights.map(n => n.nightNumber);
  return allNights.filter(night => !selectedNightNumbers.includes(night.nightNumber));
};

/**
 * Get not selected days
 * @pure
 */
export const getNotSelectedDays = (allDays, selectedDays) => {
  const selectedDayNumbers = selectedDays.map(d => d.dayOfWeek);
  return allDays.filter(day => !selectedDayNumbers.includes(day.dayOfWeek));
};

/**
 * Check if a day is in range
 * @pure
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

// ─────────────────────────────────────────────────────────────
// Exported Test Constants
// ─────────────────────────────────────────────────────────────

/**
 * Exported for testing purposes
 * @test
 */
export const __test__ = Object.freeze({
  // Constants
  DAY_NAMES,
  DAY_LETTERS,
  DAY_ABBREV,
  ALL_DAYS
})
