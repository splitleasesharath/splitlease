import { DAY_NAMES } from '../../../lib/constants.js'

/**
 * Calculate check-in and check-out days from selected days.
 * Check-in is the first selected day, check-out is the day AFTER the last selected day.
 *
 * @intent Determine the boundary days for a weekly split lease schedule.
 * @rule Check-in is the first selected day in the sequence.
 * @rule Check-out is the day AFTER the last selected day (handles wrap-around).
 * @rule For wrap-around cases (e.g., Fri-Mon), identify the gap to determine boundaries.
 *
 * @param {object} params - Named parameters.
 * @param {number[]} params.selectedDays - Array of day indices (0-6, where 0=Sunday).
 * @returns {object} Check-in/check-out details with day indices and names.
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
  // No Fallback: Validate input
  if (!Array.isArray(selectedDays)) {
    throw new Error(
      `calculateCheckInOutDays: selectedDays must be an array, got ${typeof selectedDays}`
    )
  }

  if (selectedDays.length === 0) {
    throw new Error(
      'calculateCheckInOutDays: selectedDays cannot be empty'
    )
  }

  // Validate all day indices
  for (const day of selectedDays) {
    if (typeof day !== 'number' || isNaN(day) || day < 0 || day > 6) {
      throw new Error(
        `calculateCheckInOutDays: Invalid day index ${day}, must be 0-6`
      )
    }
  }

  const sorted = [...selectedDays].sort((a, b) => a - b)

  // Handle wrap-around case (selection includes both Sunday=0 and Saturday=6)
  const hasZero = sorted.includes(0)
  const hasSix = sorted.includes(6)

  if (hasZero && hasSix) {
    // Find gap to determine actual start/end
    let gapIndex = -1
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] !== sorted[i - 1] + 1) {
        gapIndex = i
        break
      }
    }

    if (gapIndex !== -1) {
      // Wrapped selection: check-in is after the gap
      const checkInDay = sorted[gapIndex] // First day after gap
      const lastSelectedDay = sorted[gapIndex - 1] // Last day before gap

      // Check-out is the day AFTER the last selected day
      const checkOutDay = (lastSelectedDay + 1) % 7

      return {
        checkInDay,
        checkOutDay,
        checkInName: DAY_NAMES[checkInDay],
        checkOutName: DAY_NAMES[checkOutDay]
      }
    }
  }

  // Standard case: first selected day to day after last selected day
  const checkInDay = sorted[0]
  const lastSelectedDay = sorted[sorted.length - 1]

  // Check-out is the day AFTER the last selected day (wraps around week if needed)
  const checkOutDay = (lastSelectedDay + 1) % 7

  return {
    checkInDay,
    checkOutDay,
    checkInName: DAY_NAMES[checkInDay],
    checkOutName: DAY_NAMES[checkOutDay]
  }
}
