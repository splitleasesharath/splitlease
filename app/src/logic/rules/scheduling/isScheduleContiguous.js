// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────
const MIN_DAY_INDEX = 0
const MAX_DAY_INDEX = 6
const DAYS_IN_WEEK = 7
const MIN_DAYS_FOR_GUARANTEED_CONTIGUOUS = 6

const ALL_DAYS = Object.freeze([0, 1, 2, 3, 4, 5, 6])

// ─────────────────────────────────────────────────────────────
// Validation Predicates (Pure Functions)
// ─────────────────────────────────────────────────────────────
const isValidNumber = (value) => typeof value === 'number' && !isNaN(value)
const isInRange = (value, min, max) => value >= min && value <= max
const isValidDayIndex = (day) => isValidNumber(day) && isInRange(day, MIN_DAY_INDEX, MAX_DAY_INDEX)

// ─────────────────────────────────────────────────────────────
// Array Helpers (Pure Functions)
// ─────────────────────────────────────────────────────────────

/**
 * Sort days ascending (immutable)
 * @pure
 */
const sortDays = (days) => [...days].sort((a, b) => a - b)

/**
 * Find first invalid day in array
 * @pure
 */
const findInvalidDay = (days) => days.find((day) => !isValidDayIndex(day))

/**
 * Check if sorted array is consecutive (each element is previous + 1)
 * @pure
 */
const isConsecutiveSequence = (sortedDays) =>
  sortedDays.every((day, i) => i === 0 || day === sortedDays[i - 1] + 1)

/**
 * Check if selection wraps around week boundary (has both 0 and 6)
 * @pure
 */
const hasWeekWrap = (sortedDays) =>
  sortedDays.includes(MIN_DAY_INDEX) && sortedDays.includes(MAX_DAY_INDEX)

/**
 * Get days NOT in the selection
 * @pure
 */
const getUnselectedDays = (sortedSelectedDays) =>
  ALL_DAYS.filter((d) => !sortedSelectedDays.includes(d))

/**
 * Generate range of integers from min to max (inclusive)
 * @pure
 */
const range = (min, max) =>
  Array.from({ length: max - min + 1 }, (_, i) => min + i)

/**
 * Check if array equals expected contiguous range
 * @pure
 */
const isContiguousRange = (days) => {
  if (days.length === 0) return true
  const expected = range(Math.min(...days), Math.max(...days))
  return days.length === expected.length &&
    days.every((day, index) => day === expected[index])
}

/**
 * Check if selected days form a contiguous (consecutive) block.
 *
 * @intent Enforce the business rule that split lease stays must be consecutive nights.
 * @rule Days must be consecutive (Mon-Fri ✓, Mon+Wed ✗).
 * @rule Handles week wrap-around cases (Fri-Sun ✓, Sat-Tue ✓).
 * @rule For wrap-around, uses inverse logic: if unselected days are contiguous, selected days wrap around properly.
 * @rule 6 or more days is always contiguous (only 1 gap maximum).
 * @pure Yes - deterministic, no side effects
 *
 * This function consolidates the contiguous validation logic that previously existed in:
 * - availabilityValidation.js (isContiguousSelection)
 * - scheduleSelector/validators.js (isContiguous)
 *
 * @param {object} params - Named parameters.
 * @param {number[]} params.selectedDayIndices - Array of day indices (0=Sunday, 1=Monday, ..., 6=Saturday).
 * @returns {boolean} True if days are contiguous, false otherwise.
 *
 * @throws {Error} If selectedDayIndices is not an array.
 * @throws {Error} If any day index is invalid (not 0-6).
 *
 * @example
 * isScheduleContiguous({ selectedDayIndices: [1, 2, 3, 4, 5] }) // => true (Mon-Fri)
 * isScheduleContiguous({ selectedDayIndices: [1, 3, 5] }) // => false (Mon, Wed, Fri - not contiguous)
 * isScheduleContiguous({ selectedDayIndices: [5, 6, 0] }) // => true (Fri-Sun, wraps around week)
 * isScheduleContiguous({ selectedDayIndices: [6, 0, 1, 2] }) // => true (Sat-Tue, wraps around week)
 */
export function isScheduleContiguous({ selectedDayIndices }) {
  // Validation: Array type
  if (!Array.isArray(selectedDayIndices)) {
    throw new Error(
      `isScheduleContiguous: selectedDayIndices must be an array, got ${typeof selectedDayIndices}`
    )
  }

  // Edge case: Empty selection is not contiguous
  if (selectedDayIndices.length === 0) {
    return false
  }

  // Edge case: Single day is always contiguous
  if (selectedDayIndices.length === 1) {
    return true
  }

  // Validation: All day indices must be valid (declarative)
  const invalidDay = findInvalidDay(selectedDayIndices)
  if (invalidDay !== undefined) {
    throw new Error(
      `isScheduleContiguous: Invalid day index ${invalidDay}, must be ${MIN_DAY_INDEX}-${MAX_DAY_INDEX}`
    )
  }

  // Pure transformation: Sort days
  const sorted = sortDays(selectedDayIndices)

  // Optimization: 6+ days is always contiguous (at most 1 gap possible)
  if (sorted.length >= MIN_DAYS_FOR_GUARANTEED_CONTIGUOUS) {
    return true
  }

  // Check for standard contiguous sequence (no wrap around)
  if (isConsecutiveSequence(sorted)) {
    return true
  }

  // Check for week wrap-around case (Sat-Sun boundary)
  if (hasWeekWrap(sorted)) {
    // Use inverse logic: if unselected days form a contiguous block,
    // then selected days form a valid wrap-around selection
    const unselected = getUnselectedDays(sorted)

    // All days selected = contiguous
    if (unselected.length === 0) {
      return true
    }

    // If unselected days are contiguous, selected days wrap around properly
    return isContiguousRange(unselected)
  }

  return false
}

// ─────────────────────────────────────────────────────────────
// Exported Constants (for testing)
// ─────────────────────────────────────────────────────────────
export { MIN_DAY_INDEX, MAX_DAY_INDEX, DAYS_IN_WEEK }
