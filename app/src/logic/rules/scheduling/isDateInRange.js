/**
 * Check if a date is within the available range.
 *
 * @intent Validate that a date falls within the listing's availability window.
 * @rule Date must be >= firstAvailable (if specified).
 * @rule Date must be <= lastAvailable (if specified).
 * @rule Null/undefined bounds are treated as unbounded (no restriction).
 *
 * @param {object} params - Named parameters.
 * @param {Date} params.date - Date to check.
 * @param {string|Date|null} params.firstAvailable - First available date (inclusive).
 * @param {string|Date|null} params.lastAvailable - Last available date (inclusive).
 * @returns {boolean} True if date is within range, false otherwise.
 *
 * @throws {Error} If date is not a valid Date object.
 *
 * @example
 * const inRange = isDateInRange({
 *   date: new Date('2025-12-15'),
 *   firstAvailable: '2025-12-01',
 *   lastAvailable: '2026-01-31'
 * })
 * // => true
 */
export function isDateInRange({ date, firstAvailable, lastAvailable }) {
  // No Fallback: Validate date
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    throw new Error(
      'isDateInRange: date must be a valid Date object'
    )
  }

  // Normalize check date (ignore time component)
  const checkDate = new Date(date)
  checkDate.setHours(0, 0, 0, 0)

  // Check first available bound
  if (firstAvailable !== null && firstAvailable !== undefined) {
    const firstDate = new Date(firstAvailable)
    if (isNaN(firstDate.getTime())) {
      throw new Error(
        `isDateInRange: firstAvailable is not a valid date: ${firstAvailable}`
      )
    }
    firstDate.setHours(0, 0, 0, 0)
    if (checkDate < firstDate) {
      return false
    }
  }

  // Check last available bound
  if (lastAvailable !== null && lastAvailable !== undefined) {
    const lastDate = new Date(lastAvailable)
    if (isNaN(lastDate.getTime())) {
      throw new Error(
        `isDateInRange: lastAvailable is not a valid date: ${lastAvailable}`
      )
    }
    lastDate.setHours(0, 0, 0, 0)
    if (checkDate > lastDate) {
      return false
    }
  }

  return true
}
