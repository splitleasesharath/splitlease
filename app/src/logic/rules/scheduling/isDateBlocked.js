// ─────────────────────────────────────────────────────────────
// Validation Predicates (Pure Functions)
// ─────────────────────────────────────────────────────────────
const isValidDate = (date) => date instanceof Date && !isNaN(date.getTime())
const isString = (value) => typeof value === 'string'

// ─────────────────────────────────────────────────────────────
// Date Helpers (Pure Functions)
// ─────────────────────────────────────────────────────────────

/**
 * Extract date portion as YYYY-MM-DD from ISO string
 * @pure
 */
const extractDatePart = (isoString) => isoString.split('T')[0]

/**
 * Format Date object as YYYY-MM-DD string
 * @pure
 */
const formatDateISO = (date) => extractDatePart(date.toISOString())

/**
 * Normalize any date input (string or Date) to YYYY-MM-DD string
 * Returns null for invalid inputs
 * @pure
 */
const normalizeDateInput = (input) => {
  if (isString(input)) {
    return extractDatePart(input)
  }
  if (isValidDate(input)) {
    return formatDateISO(input)
  }
  return null
}

/**
 * Check if a specific date is blocked.
 *
 * @intent Determine if a date is unavailable due to blocking.
 * @rule Compares dates in YYYY-MM-DD format (ignoring time).
 * @pure Yes - deterministic, no side effects
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
  // Validation: Date must be valid
  if (!isValidDate(date)) {
    throw new Error(
      'isDateBlocked: date must be a valid Date object'
    )
  }

  // Validation: Array type
  if (!Array.isArray(blockedDates)) {
    throw new Error(
      `isDateBlocked: blockedDates must be an array, got ${typeof blockedDates}`
    )
  }

  // Early return for empty blocked dates array
  if (blockedDates.length === 0) {
    return false
  }

  // Normalize check date to YYYY-MM-DD (pure transformation)
  const dateStr = formatDateISO(date)

  // Declarative check using array method with pure normalizer
  return blockedDates.some((blocked) => {
    const normalizedBlocked = normalizeDateInput(blocked)
    // Skip invalid entries (they don't block anything)
    return normalizedBlocked !== null && normalizedBlocked === dateStr
  })
}
