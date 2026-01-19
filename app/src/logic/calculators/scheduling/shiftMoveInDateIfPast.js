import { daysUntilDayOfWeek } from '../../../lib/dayUtils.js'

/**
 * Shift a move-in date forward if it has passed.
 * Preserves the day-of-week from the original date.
 *
 * @intent When pre-filling move-in date from a user's previous proposal, ensure the date
 *         is still valid (>= minimum allowed date). If the date has passed, shift it
 *         forward to the next occurrence of the same day-of-week.
 *
 * @rule If previousMoveInDate is null/undefined, return null.
 * @rule If previousMoveInDate is >= minDate, return it as-is.
 * @rule If previousMoveInDate is in the past, find the next occurrence of the same day-of-week.
 * @rule Day-of-week uses JavaScript's 0-indexed format (0=Sunday through 6=Saturday).
 *
 * @param {object} params - Named parameters
 * @param {string} params.previousMoveInDate - Original move-in date (YYYY-MM-DD format)
 * @param {Date|string} params.minDate - Minimum allowed date (typically 2 weeks from today)
 * @returns {string|null} Valid move-in date (YYYY-MM-DD) or null if no previous date provided
 *
 * @example
 * // Previous date is still valid (in the future)
 * shiftMoveInDateIfPast({
 *   previousMoveInDate: '2025-12-25',  // Wednesday
 *   minDate: '2025-12-20'
 * })
 * // => '2025-12-25' (unchanged)
 *
 * @example
 * // Previous date has passed - shift to next occurrence of same day-of-week
 * shiftMoveInDateIfPast({
 *   previousMoveInDate: '2025-01-06',  // Monday
 *   minDate: '2025-12-31'              // Wednesday
 * })
 * // => '2026-01-05' (next Monday after minDate)
 */
export function shiftMoveInDateIfPast({ previousMoveInDate, minDate }) {
  if (!previousMoveInDate) {
    return null;
  }

  const previousDate = new Date(previousMoveInDate);
  const minDateObj = new Date(minDate);

  // Reset time components for date-only comparison
  previousDate.setHours(0, 0, 0, 0);
  minDateObj.setHours(0, 0, 0, 0);

  // If previous date is still valid (>= minDate), use it
  if (previousDate >= minDateObj) {
    return previousMoveInDate.split('T')[0];
  }

  // Date has passed - find next occurrence of same day-of-week
  const targetDayOfWeek = previousDate.getDay();
  const minDayOfWeek = minDateObj.getDay();

  const daysToAdd = daysUntilDayOfWeek(minDayOfWeek, targetDayOfWeek);
  if (daysToAdd === 0) {
    // Already on the right day
    return minDateObj.toISOString().split('T')[0];
  }

  const shiftedDate = new Date(minDateObj);
  shiftedDate.setDate(minDateObj.getDate() + daysToAdd);

  return shiftedDate.toISOString().split('T')[0];
}
