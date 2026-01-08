import { DAY_NAMES } from '../../../lib/constants.js'

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────
const MIN_DAY_INDEX = 0
const MAX_DAY_INDEX = 6
const DAYS_IN_WEEK = 7
const SUNDAY = 0
const SATURDAY = 6

// ─────────────────────────────────────────────────────────────
// Validation Helpers (Pure Predicates)
// ─────────────────────────────────────────────────────────────
const isValidDayIndex = (day) =>
  typeof day === 'number' &&
  !isNaN(day) &&
  day >= MIN_DAY_INDEX &&
  day <= MAX_DAY_INDEX

const findInvalidDay = (days) => days.find((day) => !isValidDayIndex(day)) ?? null

// ─────────────────────────────────────────────────────────────
// Calculation Helpers (Pure Functions)
// ─────────────────────────────────────────────────────────────

/**
 * Sort days and return new array (immutable)
 * @pure
 */
const sortDays = (days) => [...days].sort((a, b) => a - b)

/**
 * Check if selection wraps around the week (includes both Sunday and Saturday)
 * @pure
 */
const hasWeekWrap = (sortedDays) =>
  sortedDays.includes(SUNDAY) && sortedDays.includes(SATURDAY)

/**
 * Find index of gap in sorted days (where consecutive days break)
 * @pure
 * @returns {number} Gap index or -1 if no gap
 */
const findGapIndex = (sortedDays) => {
  const gapPosition = sortedDays.findIndex(
    (day, i) => i > 0 && day !== sortedDays[i - 1] + 1
  )
  return gapPosition
}

/**
 * Calculate the next day (wraps around week)
 * @pure
 */
const nextDay = (day) => (day + 1) % DAYS_IN_WEEK

/**
 * Build immutable result object
 * @pure
 */
const buildResult = (checkInDay, checkOutDay) => Object.freeze({
  checkInDay,
  checkOutDay,
  checkInName: DAY_NAMES[checkInDay],
  checkOutName: DAY_NAMES[checkOutDay]
})

/**
 * Calculate check-in/out for wrapped selection (spans Sat-Sun boundary)
 * @pure
 */
const calculateWrappedCheckInOut = (sortedDays, gapIndex) => {
  const checkInDay = sortedDays[gapIndex]
  const lastSelectedDay = sortedDays[gapIndex - 1]
  const checkOutDay = nextDay(lastSelectedDay)
  return buildResult(checkInDay, checkOutDay)
}

/**
 * Calculate check-in/out for standard (non-wrapped) selection
 * @pure
 */
const calculateStandardCheckInOut = (sortedDays) => {
  const checkInDay = sortedDays[0]
  const lastSelectedDay = sortedDays[sortedDays.length - 1]
  const checkOutDay = nextDay(lastSelectedDay)
  return buildResult(checkInDay, checkOutDay)
}

/**
 * Calculate check-in and check-out days from selected days.
 * Check-in is the first selected day, check-out is the day AFTER the last selected day.
 *
 * @intent Determine the boundary days for a weekly split lease schedule.
 * @rule Check-in is the first selected day in the sequence.
 * @rule Check-out is the day AFTER the last selected day (handles wrap-around).
 * @rule For wrap-around cases (e.g., Fri-Mon), identify the gap to determine boundaries.
 * @pure Yes - deterministic, no side effects
 *
 * @param {object} params - Named parameters.
 * @param {number[]} params.selectedDays - Array of day indices (0-6, where 0=Sunday).
 * @returns {object} Check-in/check-out details with day indices and names (frozen).
 *
 * @throws {Error} If selectedDays is not an array.
 * @throws {Error} If selectedDays contains invalid day indices.
 * @throws {Error} If selectedDays is empty.
 *
 * @example
 * const result = calculateCheckInOutDays({ selectedDays: [1, 2, 3, 4, 5] })
 * // => { checkInDay: 1, checkOutDay: 6, checkInName: 'Monday', checkOutName: 'Saturday' }
 *
 * const wrapped = calculateCheckInOutDays({ selectedDays: [5, 6, 0, 1] })
 * // => { checkInDay: 5, checkOutDay: 2, checkInName: 'Friday', checkOutName: 'Tuesday' }
 */
export function calculateCheckInOutDays({ selectedDays }) {
  // Validation: Array type
  if (!Array.isArray(selectedDays)) {
    throw new Error(
      `calculateCheckInOutDays: selectedDays must be an array, got ${typeof selectedDays}`
    )
  }

  // Validation: Non-empty
  if (selectedDays.length === 0) {
    throw new Error(
      'calculateCheckInOutDays: selectedDays cannot be empty'
    )
  }

  // Validation: All valid day indices (declarative)
  const invalidDay = findInvalidDay(selectedDays)
  if (invalidDay !== null) {
    throw new Error(
      `calculateCheckInOutDays: Invalid day index ${invalidDay}, must be ${MIN_DAY_INDEX}-${MAX_DAY_INDEX}`
    )
  }

  // Create sorted copy (immutable operation)
  const sorted = sortDays(selectedDays)

  // Handle wrap-around case (selection includes both Sunday=0 and Saturday=6)
  if (hasWeekWrap(sorted)) {
    const gapIndex = findGapIndex(sorted)
    if (gapIndex !== -1) {
      return calculateWrappedCheckInOut(sorted, gapIndex)
    }
  }

  // Standard case
  return calculateStandardCheckInOut(sorted)
}
