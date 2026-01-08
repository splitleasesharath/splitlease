// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────
const DAYS_IN_WEEK = 7

// ─────────────────────────────────────────────────────────────
// Predicates (Pure Functions)
// ─────────────────────────────────────────────────────────────
const isNullish = (value) => value === null || value === undefined
const isDateOnOrAfter = (date, minDate) => date >= minDate

// ─────────────────────────────────────────────────────────────
// Date Helpers (Pure Functions)
// ─────────────────────────────────────────────────────────────

/**
 * Parse date string and reset time to midnight (immutable)
 * @pure
 */
const parseDateAtMidnight = (dateInput) => {
  const date = new Date(dateInput)
  date.setHours(0, 0, 0, 0)
  return date
}

/**
 * Format date as ISO date string (YYYY-MM-DD)
 * @pure
 */
const formatDateISO = (date) => date.toISOString().split('T')[0]

/**
 * Calculate days to add to reach target day-of-week
 * @pure
 */
const calculateDaysUntilTargetDay = (currentDayOfWeek, targetDayOfWeek) =>
  (targetDayOfWeek - currentDayOfWeek + DAYS_IN_WEEK) % DAYS_IN_WEEK

/**
 * Add days to a date (returns new Date, immutable)
 * @pure
 */
const addDays = (date, days) => {
  const result = new Date(date)
  result.setDate(date.getDate() + days)
  return result
}

/**
 * Extract date part from ISO string (handle potential timestamp)
 * @pure
 */
const extractDatePart = (dateString) => dateString.split('T')[0]

/**
 * Shift a move-in date forward if it has passed.
 * Preserves the day-of-week from the original date.
 *
 * @intent When pre-filling move-in date from a user's previous proposal, ensure the date
 *         is still valid (>= minimum allowed date). If the date has passed, shift it
 *         forward to the next occurrence of the same day-of-week.
 * @pure Yes - deterministic, no side effects
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
  // Early return for null/undefined input
  if (isNullish(previousMoveInDate)) {
    return null
  }

  // Parse dates at midnight for date-only comparison (immutable)
  const previousDate = parseDateAtMidnight(previousMoveInDate)
  const minDateObj = parseDateAtMidnight(minDate)

  // If previous date is still valid (>= minDate), use it
  if (isDateOnOrAfter(previousDate, minDateObj)) {
    return extractDatePart(previousMoveInDate)
  }

  // Date has passed - calculate shift to next occurrence of same day-of-week
  const targetDayOfWeek = previousDate.getDay()
  const currentDayOfWeek = minDateObj.getDay()
  const daysToAdd = calculateDaysUntilTargetDay(currentDayOfWeek, targetDayOfWeek)

  // If already on correct day-of-week, return minDate
  if (daysToAdd === 0) {
    return formatDateISO(minDateObj)
  }

  // Calculate shifted date (immutable operation)
  const shiftedDate = addDays(minDateObj, daysToAdd)

  return formatDateISO(shiftedDate)
}
