/**
 * Check if a specific date is blocked.
 *
 * @intent Determine if a date is unavailable due to blocking.
 * @rule Compares dates in YYYY-MM-DD format (ignoring time).
 *
 * @param {object} params - Named parameters.
 * @param {Date} params.date - Date to check.
 * @param {Array} params.blockedDates - Array of blocked date strings or Date objects.
 * @returns {boolean} True if date is blocked, false otherwise.
 *
 * @throws {Error} If date is not a valid Date object.
 * @throws {Error} If blockedDates is not an array.
 *
 * @example
 * const blocked = isDateBlocked({
 *   date: new Date('2025-12-25'),
 *   blockedDates: ['2025-12-25', '2025-12-26']
 * })
 * // => true
 */
export function isDateBlocked({ date, blockedDates }) {
  // No Fallback: Validate inputs
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    throw new Error(
      'isDateBlocked: date must be a valid Date object'
    )
  }

  if (!Array.isArray(blockedDates)) {
    throw new Error(
      `isDateBlocked: blockedDates must be an array, got ${typeof blockedDates}`
    )
  }

  // Empty blockedDates array means nothing is blocked
  if (blockedDates.length === 0) {
    return false
  }

  // Format the check date as YYYY-MM-DD
  const dateStr = date.toISOString().split('T')[0]

  // Check if any blocked date matches
  return blockedDates.some(blocked => {
    if (typeof blocked === 'string') {
      // Extract date portion (YYYY-MM-DD) from string
      const blockedDateStr = blocked.split('T')[0]
      return blockedDateStr === dateStr
    }
    if (blocked instanceof Date) {
      const blockedDateStr = blocked.toISOString().split('T')[0]
      return blockedDateStr === dateStr
    }
    // Skip invalid entries silently (they don't block anything)
    return false
  })
}
