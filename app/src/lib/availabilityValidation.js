/**
 * Availability Validation Utilities
 * CRITICAL: Validates contiguous night selection for weekly schedule
 * Handles blackout dates, availability checking, and schedule validation
 *
 * Usage:
 *   import { isContiguousSelection, validateScheduleSelection } from './availabilityValidation.js';
 */

import { DAY_NAMES } from './constants.js';

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const WEEK_BOUNDS = Object.freeze({
  DAYS_IN_WEEK: 7,
  MIN_DAY_INDEX: 0,
  MAX_DAY_INDEX: 6,
  NEARLY_FULL_WEEK: 6
})

const ALL_DAYS = Object.freeze([0, 1, 2, 3, 4, 5, 6])

const ERROR_MESSAGES = Object.freeze({
  NO_DAYS_SELECTED: 'Please select at least one day',
  NOT_CONTIGUOUS: 'Please check for contiguous nights to continue with your proposal',
  DAYS_UNAVAILABLE: 'Some selected days are not available for this listing',
  NO_MOVE_IN_DATE: 'Please select a move-in date',
  PAST_DATE: 'Move-in date cannot be in the past',
  OUTSIDE_RANGE: 'Move-in date is outside available range',
  DATE_BLOCKED: 'Selected move-in date is not available'
})

const LOG_PREFIX = '[availabilityValidation]'

// ─────────────────────────────────────────────────────────────
// Validation Predicates (Pure Functions)
// ─────────────────────────────────────────────────────────────

/**
 * Check if array has elements
 * @pure
 */
const hasElements = (arr) =>
  Array.isArray(arr) && arr.length > 0

/**
 * Check if array includes value
 * @pure
 */
const includesValue = (arr, value) =>
  arr.includes(value)

/**
 * Check if selection includes both weekend edges (wrap-around indicator)
 * @pure
 */
const hasWeekendEdges = (sortedDays) =>
  includesValue(sortedDays, WEEK_BOUNDS.MIN_DAY_INDEX) &&
  includesValue(sortedDays, WEEK_BOUNDS.MAX_DAY_INDEX)

/**
 * Check if selection is nearly full week (6+ days)
 * @pure
 */
const isNearlyFullWeek = (arr) =>
  arr.length >= WEEK_BOUNDS.NEARLY_FULL_WEEK

// ─────────────────────────────────────────────────────────────
// Pure Helper Functions
// ─────────────────────────────────────────────────────────────

/**
 * Sort days array in ascending order
 * @pure
 */
const sortDays = (days) =>
  [...days].sort((a, b) => a - b)

/**
 * Check if consecutive elements differ by exactly 1
 * @pure
 */
const areConsecutive = (arr) =>
  arr.every((day, i) => i === 0 || day === arr[i - 1] + 1)

/**
 * Get days not in selection
 * @pure
 */
const getNotSelectedDays = (sortedDays) =>
  ALL_DAYS.filter(d => !sortedDays.includes(d))

/**
 * Build expected contiguous range
 * @pure
 */
const buildExpectedRange = (min, max) => {
  const range = []
  for (let i = min; i <= max; i++) {
    range.push(i)
  }
  return range
}

/**
 * Create default validation result
 * @pure
 */
const createValidationResult = (overrides = {}) =>
  Object.freeze({
    valid: true,
    errors: [],
    warnings: [],
    showTutorial: false,
    nightsCount: 0,
    isContiguous: false,
    ...overrides
  })

/**
 * Create check-in/out result
 * @pure
 */
const createCheckInOutResult = (checkInDay, checkOutDay) =>
  Object.freeze({
    checkInDay,
    checkOutDay,
    checkInName: checkInDay !== null ? DAY_NAMES[checkInDay] : null,
    checkOutName: checkOutDay !== null ? DAY_NAMES[checkOutDay] : null
  })

/**
 * Calculate next day with week wrap-around
 * @pure
 */
const getNextDay = (dayIndex) =>
  (dayIndex + 1) % WEEK_BOUNDS.DAYS_IN_WEEK

// ─────────────────────────────────────────────────────────────
// Core Validation Functions
// ─────────────────────────────────────────────────────────────

/**
 * Check if selected days form a contiguous block
 * CRITICAL FUNCTION: Must be consecutive days (Mon-Fri ✓, Mon+Wed ✗)
 * Based on Bubble implementation that handles week wrap-around cases
 * @pure
 * @param {number[]} selectedDays - Array of day indices (0=Sunday, 1=Monday, ... 6=Saturday)
 * @returns {boolean} True if days are contiguous
 *
 * @example
 * isContiguousSelection([1, 2, 3, 4, 5]) // true (Mon-Fri)
 * isContiguousSelection([1, 3, 5]) // false (Mon, Wed, Fri - not contiguous)
 * isContiguousSelection([5, 6, 0]) // true (Fri-Sun, wraps around week)
 * isContiguousSelection([6, 0, 1, 2]) // true (Sat-Tue, wraps around week)
 */
export function isContiguousSelection(selectedDays) {
  if (!hasElements(selectedDays)) return false;
  if (selectedDays.length === 1) return true;

  const sorted = sortDays(selectedDays);

  // If 6 or more days selected, it's contiguous
  if (isNearlyFullWeek(sorted)) return true;

  // Check for standard contiguous sequence (no wrap around)
  if (areConsecutive(sorted)) return true;

  // Check if selection includes both Sunday (0) and Saturday (6) - wrap-around case
  if (hasWeekendEdges(sorted)) {
    // Week wrap-around case: use inverse logic (check not-selected days)
    // If the NOT selected days are contiguous, then selected days wrap around and are contiguous
    const notSelectedDays = getNotSelectedDays(sorted);

    if (notSelectedDays.length === 0) return true; // All days selected

    // Check if not-selected days form a contiguous block
    const minNotSelected = Math.min(...notSelectedDays);
    const maxNotSelected = Math.max(...notSelectedDays);
    const expectedNotSelected = buildExpectedRange(minNotSelected, maxNotSelected);

    // If not-selected days are contiguous, then selected days wrap around properly
    const notSelectedContiguous = notSelectedDays.length === expectedNotSelected.length &&
      notSelectedDays.every((day, index) => day === expectedNotSelected[index]);

    return notSelectedContiguous;
  }

  return false;
}

/**
 * Find gap index in sorted array (where consecutive difference is not 1)
 * @pure
 */
const findGapIndex = (sorted) => {
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] !== sorted[i - 1] + 1) {
      return i;
    }
  }
  return -1;
}

/**
 * Calculate check-in and check-out days from selected days
 * Check-in is the first selected day, check-out is the day AFTER the last selected day
 * Based on SearchScheduleSelector logic for wrap-around handling
 * @pure
 * @param {number[]} selectedDays - Array of day indices (0-based)
 * @returns {object} { checkInDay: number, checkOutDay: number, checkInName: string, checkOutName: string }
 */
export function calculateCheckInOutDays(selectedDays) {
  if (!hasElements(selectedDays)) {
    return createCheckInOutResult(null, null);
  }

  const sorted = sortDays(selectedDays);

  // Handle wrap-around case (e.g., Fri, Sat, Sun, Mon)
  if (hasWeekendEdges(sorted)) {
    const gapIndex = findGapIndex(sorted);

    if (gapIndex !== -1) {
      // Wrapped selection: check-in is after the gap (first day in wrap)
      const checkInDay = sorted[gapIndex];
      const lastSelectedDay = sorted[gapIndex - 1];
      const checkOutDay = getNextDay(lastSelectedDay);

      return createCheckInOutResult(checkInDay, checkOutDay);
    }
  }

  // Standard case: first selected day to day after last selected day
  const checkInDay = sorted[0];
  const lastSelectedDay = sorted[sorted.length - 1];
  const checkOutDay = getNextDay(lastSelectedDay);

  return createCheckInOutResult(checkInDay, checkOutDay);
}

/**
 * Check if any selected days are unavailable
 * @pure
 */
const hasUnavailableDays = (selectedDays, unavailableDayNames) => {
  if (!hasElements(unavailableDayNames)) return false;
  return selectedDays.some(day => unavailableDayNames.includes(DAY_NAMES[day]));
}

/**
 * Validate schedule selection against listing requirements
 * Returns validation result with errors/warnings
 * @pure
 * @param {number[]} selectedDays - Selected day indices
 * @param {object} listing - Listing object with availability data
 * @returns {object} Validation result
 */
export function validateScheduleSelection(selectedDays, listing) {
  const errors = [];
  const warnings = [];

  // Check if days are selected
  if (!hasElements(selectedDays)) {
    return createValidationResult({
      valid: false,
      errors: [ERROR_MESSAGES.NO_DAYS_SELECTED],
      nightsCount: 0
    });
  }

  // Check contiguous requirement (CRITICAL)
  const isContiguous = isContiguousSelection(selectedDays);
  if (!isContiguous) {
    return createValidationResult({
      valid: false,
      errors: [ERROR_MESSAGES.NOT_CONTIGUOUS],
      showTutorial: true,
      nightsCount: selectedDays.length
    });
  }

  // Check against minimum nights
  if (listing['Minimum Nights'] && selectedDays.length < listing['Minimum Nights']) {
    warnings.push(`Host prefers at least ${listing['Minimum Nights']} nights per week`);
  }

  // Check against maximum nights
  if (listing['Maximum Nights'] && selectedDays.length > listing['Maximum Nights']) {
    warnings.push(`Host prefers at most ${listing['Maximum Nights']} nights per week`);
  }

  // Check against Days Not Available
  if (hasUnavailableDays(selectedDays, listing['Days Not Available'])) {
    errors.push(ERROR_MESSAGES.DAYS_UNAVAILABLE);
  }

  return createValidationResult({
    valid: errors.length === 0,
    errors,
    warnings,
    nightsCount: selectedDays.length,
    isContiguous: true
  });
}

/**
 * Extract date string from ISO date (YYYY-MM-DD format)
 * @pure
 */
const toDateString = (date) =>
  date.toISOString().split('T')[0]

/**
 * Normalize date to midnight
 * @pure
 */
const normalizeToMidnight = (date) => {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

/**
 * Check if a specific date is blocked
 * @pure
 * @param {Date} date - Date to check
 * @param {Array} blockedDates - Array of blocked date strings
 * @returns {boolean} True if date is blocked
 */
export function isDateBlocked(date, blockedDates) {
  if (!date || !hasElements(blockedDates)) return false;

  const dateStr = toDateString(date);

  return blockedDates.some(blocked =>
    typeof blocked === 'string' && blocked.split('T')[0] === dateStr
  );
}

/**
 * Check if a date is within available range
 * @pure
 * @param {Date} date - Date to check
 * @param {string} firstAvailable - First available date string
 * @param {string} lastAvailable - Last available date string
 * @returns {boolean} True if date is within range
 */
export function isDateInRange(date, firstAvailable, lastAvailable) {
  if (!date) return false;

  const checkDate = normalizeToMidnight(date);

  if (firstAvailable) {
    const firstDate = normalizeToMidnight(new Date(firstAvailable));
    if (checkDate < firstDate) return false;
  }

  if (lastAvailable) {
    const lastDate = normalizeToMidnight(new Date(lastAvailable));
    if (checkDate > lastDate) return false;
  }

  return true;
}

/**
 * Create move-in validation result
 * @pure
 */
const createMoveInResult = (valid, errors = []) =>
  Object.freeze({ valid, errors })

/**
 * Check if date is in the past
 * @pure
 */
const isDateInPast = (date) => {
  const today = normalizeToMidnight(new Date());
  return date < today;
}

/**
 * Validate move-in date against listing availability
 * @pure
 * @param {Date} moveInDate - Proposed move-in date
 * @param {object} listing - Listing object
 * @param {number[]} selectedDays - Selected days of week
 * @returns {object} Validation result
 */
export function validateMoveInDate(moveInDate, listing, selectedDays) {
  if (!moveInDate) {
    return createMoveInResult(false, [ERROR_MESSAGES.NO_MOVE_IN_DATE]);
  }

  // Check if date is in the past
  if (isDateInPast(moveInDate)) {
    return createMoveInResult(false, [ERROR_MESSAGES.PAST_DATE]);
  }

  // Check if date is within available range
  if (!isDateInRange(moveInDate, listing['First Available'], listing['Last Available'])) {
    return createMoveInResult(false, [ERROR_MESSAGES.OUTSIDE_RANGE]);
  }

  // Check if date is blocked
  if (isDateBlocked(moveInDate, listing['Dates - Blocked'])) {
    return createMoveInResult(false, [ERROR_MESSAGES.DATE_BLOCKED]);
  }

  // Check if move-in date's day of week matches selected schedule
  if (hasElements(selectedDays)) {
    const { checkInDay } = calculateCheckInOutDays(selectedDays);
    const moveInDayOfWeek = moveInDate.getDay();

    if (checkInDay !== null && moveInDayOfWeek !== checkInDay) {
      return createMoveInResult(
        false,
        [`Move-in date must be on a ${DAY_NAMES[checkInDay]} based on your selected schedule`]
      );
    }
  }

  return createMoveInResult(true);
}

/**
 * Date format options for display
 */
const DATE_FORMAT_OPTIONS = Object.freeze({
  month: 'short',
  day: 'numeric',
  year: 'numeric'
})

const DEFAULT_DATE_LIMIT = 5

/**
 * Format date for display
 * @pure
 */
const formatDateForDisplay = (dateStr) =>
  new Date(dateStr).toLocaleDateString('en-US', DATE_FORMAT_OPTIONS)

/**
 * Get list of blocked dates in readable format
 * @pure
 * @param {Array} blockedDates - Array of blocked date strings
 * @param {number} limit - Maximum number to return (default: 5)
 * @returns {string[]} Array of formatted date strings
 */
export function getBlockedDatesList(blockedDates, limit = DEFAULT_DATE_LIMIT) {
  if (!hasElements(blockedDates)) return [];

  return blockedDates
    .slice(0, limit)
    .map(formatDateForDisplay);
}

/**
 * Calculate number of nights from selected days
 * Nights = Days selected (continuous selection)
 * @pure
 * @param {number[]} selectedDays - Selected day indices
 * @returns {number} Number of nights
 */
export function calculateNightsFromDays(selectedDays) {
  if (!hasElements(selectedDays)) return 0;
  return selectedDays.length; // In split lease, nights = days selected
}

// ─────────────────────────────────────────────────────────────
// Exported Constants (for testing)
// ─────────────────────────────────────────────────────────────
export {
  WEEK_BOUNDS,
  ALL_DAYS,
  ERROR_MESSAGES,
  LOG_PREFIX,
  DEFAULT_DATE_LIMIT
}
