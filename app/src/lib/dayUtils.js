/**
 * Day Indexing Utilities
 *
 * All day indices use JavaScript's 0-based numbering (matching Date.getDay()):
 *   0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday
 *
 * NOTE: Bubble API conversion functions were removed after migrating the database
 * to use 0-indexed days natively. The database now stores days in JS format.
 */

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const DAY_INDEX_BOUNDS = Object.freeze({
  MIN: 0,
  MAX: 6
})

const UNKNOWN_DAY = 'Unknown'
const UNKNOWN_SHORT = '???'
const SHORT_NAME_LENGTH = 3

/**
 * Day names indexed by 0-based day number
 */
export const DAY_NAMES = Object.freeze([
  'Sunday',   // 0
  'Monday',   // 1
  'Tuesday',  // 2
  'Wednesday',// 3
  'Thursday', // 4
  'Friday',   // 5
  'Saturday'  // 6
])

// ─────────────────────────────────────────────────────────────
// Validation Predicates (Pure Functions)
// ─────────────────────────────────────────────────────────────

/**
 * Check if value is a number
 * @pure
 */
const isNumber = (value) =>
  typeof value === 'number'

/**
 * Check if day index is in valid range (0-6)
 * @pure
 */
const isDayIndexInRange = (dayIndex) =>
  dayIndex >= DAY_INDEX_BOUNDS.MIN && dayIndex <= DAY_INDEX_BOUNDS.MAX

/**
 * Check if day index is valid (number in range 0-6)
 * @pure
 */
const isValidDayIndex = (dayIndex) =>
  isNumber(dayIndex) && isDayIndexInRange(dayIndex)

// ─────────────────────────────────────────────────────────────
// Pure Functions
// ─────────────────────────────────────────────────────────────

/**
 * Validate that days array contains only valid 0-based indices
 * @pure
 * @param {number[]} days - Array of day indices to validate
 * @returns {boolean} True if all days are valid 0-based indices (0-6)
 */
export function isValidDaysArray(days) {
  if (!Array.isArray(days)) return false
  return days.every(isValidDayIndex)
}

/**
 * Get day name from 0-based index
 * @pure
 * @param {number} dayIndex - 0-based day index (0-6)
 * @returns {string} Day name or 'Unknown' if invalid
 */
export function getDayName(dayIndex) {
  if (!isValidDayIndex(dayIndex)) {
    return UNKNOWN_DAY
  }
  return DAY_NAMES[dayIndex]
}

/**
 * Get short day name from 0-based index
 * @pure
 * @param {number} dayIndex - 0-based day index (0-6)
 * @returns {string} Short day name (Sun, Mon, etc.) or '???' if invalid
 */
export function getShortDayName(dayIndex) {
  const name = getDayName(dayIndex)
  return name === UNKNOWN_DAY ? UNKNOWN_SHORT : name.slice(0, SHORT_NAME_LENGTH)
}

// ─────────────────────────────────────────────────────────────
// Exported Constants (for testing)
// ─────────────────────────────────────────────────────────────
export {
  DAY_INDEX_BOUNDS,
  UNKNOWN_DAY,
  UNKNOWN_SHORT,
  SHORT_NAME_LENGTH
}
