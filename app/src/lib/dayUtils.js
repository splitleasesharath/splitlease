/**
 * Day Indexing Utilities
 *
 * All day indices use JavaScript's 0-based numbering (matching Date.getDay()):
 *   0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday
 *
 * NOTE: Bubble API conversion functions were removed after migrating the database
 * to use 0-indexed days natively. The database now stores days in JS format.
 */

// Import and re-export DAY_NAMES from canonical source
import { DAY_NAMES as CANONICAL_DAY_NAMES } from './constants.js';

/**
 * Validate that days array contains only valid 0-based indices
 * @param {number[]} days - Array of day indices to validate
 * @returns {boolean} True if all days are valid 0-based indices (0-6)
 */
export function isValidDaysArray(days) {
  if (!Array.isArray(days)) return false;
  return days.every(day => typeof day === 'number' && day >= 0 && day <= 6);
}

/**
 * Day names indexed by 0-based day number
 * Re-exported from lib/constants.js for backward compatibility
 */
export const DAY_NAMES = CANONICAL_DAY_NAMES;

/**
 * Get day name from 0-based index
 * @param {number} dayIndex - 0-based day index (0-6)
 * @returns {string} Day name or 'Unknown' if invalid
 */
export function getDayName(dayIndex) {
  if (typeof dayIndex !== 'number' || dayIndex < 0 || dayIndex > 6) {
    return 'Unknown';
  }
  return CANONICAL_DAY_NAMES[dayIndex];
}

/**
 * Get short day name from 0-based index
 * @param {number} dayIndex - 0-based day index (0-6)
 * @returns {string} Short day name (Sun, Mon, etc.) or '???' if invalid
 */
export function getShortDayName(dayIndex) {
  const name = getDayName(dayIndex);
  return name === 'Unknown' ? '???' : name.slice(0, 3);
}

/**
 * Calculate days until target day of week
 * @param {number} fromDay - Current day (0-6)
 * @param {number} toDay - Target day (0-6)
 * @returns {number} Days until target (0-6)
 */
export function daysUntilDayOfWeek(fromDay, toDay) {
  return (toDay - fromDay + 7) % 7
}
