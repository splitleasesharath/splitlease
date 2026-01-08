// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────
const MIN_DAY_INDEX = 0
const MAX_DAY_INDEX = 6
const DAYS_IN_WEEK = 7

// ─────────────────────────────────────────────────────────────
// Validation Helpers (Pure Predicates)
// ─────────────────────────────────────────────────────────────
const isValidDayIndex = (day) =>
  typeof day === 'number' &&
  !isNaN(day) &&
  day >= MIN_DAY_INDEX &&
  day <= MAX_DAY_INDEX

const isValidDate = (date) => !isNaN(new Date(date).getTime())

const findInvalidDay = (days) => days.find((day) => !isValidDayIndex(day)) ?? null

// ─────────────────────────────────────────────────────────────
// Calculation Helpers (Pure Functions)
// ─────────────────────────────────────────────────────────────

/**
 * Sort days and return first day (immutable)
 * @pure
 */
const getFirstSelectedDay = (days) =>
  [...days].sort((a, b) => a - b)[0]

/**
 * Calculate days to add to reach target day-of-week
 * @pure
 */
const calculateDaysUntilTargetDay = (currentDayOfWeek, targetDayOfWeek) =>
  (targetDayOfWeek - currentDayOfWeek + DAYS_IN_WEEK) % DAYS_IN_WEEK

/**
 * Format date as ISO date string (YYYY-MM-DD)
 * @pure
 */
const formatDateISO = (date) => date.toISOString().split('T')[0]

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
 * Calculate the next available check-in date based on selected day-of-week and minimum date.
 * Smart default calculation for move-in dates.
 *
 * @intent Determine the soonest check-in date that matches the user's selected weekly schedule.
 * @rule Check-in must be on the first day of the selected weekly pattern.
 * @rule Check-in must be on or after the minimum allowed date (e.g., 2 weeks from today).
 * @rule If minDate already falls on the correct day-of-week, use that date.
 * @rule Otherwise, find the next occurrence of the target day-of-week.
 * @pure Yes - deterministic, no side effects
 *
 * @param {object} params - Named parameters.
 * @param {number[]} params.selectedDayIndices - Array of selected day indices (0-6, sorted).
 * @param {Date|string} params.minDate - Minimum allowed check-in date.
 * @returns {string} ISO date string (YYYY-MM-DD) for the next available check-in.
 *
 * @throws {Error} If selectedDayIndices is empty or invalid.
 * @throws {Error} If minDate is not a valid date.
 *
 * @example
 * // User selects Wed-Sat (days 3,4,5,6), minimum is 2 weeks from today
 * const checkIn = calculateNextAvailableCheckIn({
 *   selectedDayIndices: [3, 4, 5, 6],
 *   minDate: '2025-12-01' // Monday
 * })
 * // => '2025-12-03' (next Wednesday)
 */
export function calculateNextAvailableCheckIn({ selectedDayIndices, minDate }) {
  // Validation: Array type and non-empty
  if (!Array.isArray(selectedDayIndices) || selectedDayIndices.length === 0) {
    throw new Error(
      'calculateNextAvailableCheckIn: selectedDayIndices must be a non-empty array'
    )
  }

  // Validation: All valid day indices (declarative)
  const invalidDay = findInvalidDay(selectedDayIndices)
  if (invalidDay !== null) {
    throw new Error(
      `calculateNextAvailableCheckIn: Invalid day index ${invalidDay}, must be ${MIN_DAY_INDEX}-${MAX_DAY_INDEX}`
    )
  }

  // Validation: Valid date
  if (!isValidDate(minDate)) {
    throw new Error(
      `calculateNextAvailableCheckIn: minDate is not a valid date: ${minDate}`
    )
  }

  // Parse minDate
  const minDateObj = new Date(minDate)

  // Get target day-of-week (first selected day)
  const targetDayOfWeek = getFirstSelectedDay(selectedDayIndices)

  // Get current day-of-week from minDate
  const currentDayOfWeek = minDateObj.getDay()

  // Calculate days to add
  const daysToAdd = calculateDaysUntilTargetDay(currentDayOfWeek, targetDayOfWeek)

  // If daysToAdd is 0, we're already on the right day
  if (daysToAdd === 0) {
    return formatDateISO(minDateObj)
  }

  // Calculate next check-in date (immutable - creates new Date)
  const nextCheckInDate = addDays(minDateObj, daysToAdd)

  return formatDateISO(nextCheckInDate)
}
