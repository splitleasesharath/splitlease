// ─────────────────────────────────────────────────────────────
// Validation Predicates (Pure Functions)
// ─────────────────────────────────────────────────────────────
const isValidDate = (date) => date instanceof Date && !isNaN(date.getTime())
const isNullish = (value) => value === null || value === undefined

// ─────────────────────────────────────────────────────────────
// Date Helpers (Pure Functions)
// ─────────────────────────────────────────────────────────────

/**
 * Normalize date to midnight (returns new Date, immutable)
 * @pure
 */
const normalizeToMidnight = (date) => {
  const normalized = new Date(date)
  normalized.setHours(0, 0, 0, 0)
  return normalized
}

/**
 * Parse and validate a date bound value
 * Returns normalized Date or null for invalid
 * @pure
 */
const parseDateBound = (bound, boundName) => {
  if (isNullish(bound)) {
    return null
  }
  const parsed = new Date(bound)
  if (!isValidDate(parsed)) {
    throw new Error(
      `isDateInRange: ${boundName} is not a valid date: ${bound}`
    )
  }
  return normalizeToMidnight(parsed)
}

/**
 * Check if a date is within the available range.
 *
 * @intent Validate that a date falls within the listing's availability window.
 * @rule Date must be >= firstAvailable (if specified).
 * @rule Date must be <= lastAvailable (if specified).
 * @rule Null/undefined bounds are treated as unbounded (no restriction).
 * @pure Yes - deterministic, no side effects
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
  // Validation: Date must be valid
  if (!isValidDate(date)) {
    throw new Error(
      'isDateInRange: date must be a valid Date object'
    )
  }

  // Pure transformation: Normalize dates to midnight
  const checkDate = normalizeToMidnight(date)
  const minDate = parseDateBound(firstAvailable, 'firstAvailable')
  const maxDate = parseDateBound(lastAvailable, 'lastAvailable')

  // Check lower bound (if specified)
  if (minDate !== null && checkDate < minDate) {
    return false
  }

  // Check upper bound (if specified)
  if (maxDate !== null && checkDate > maxDate) {
    return false
  }

  return true
}
