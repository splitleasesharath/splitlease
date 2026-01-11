/**
 * Check if selected days form a contiguous (consecutive) block.
 *
 * @intent Enforce the business rule that split lease stays must be consecutive nights.
 * @rule Days must be consecutive (Mon-Fri ✓, Mon+Wed ✗).
 * @rule Handles week wrap-around cases (Fri-Sun ✓, Sat-Tue ✓).
 * @rule For wrap-around, uses inverse logic: if unselected days are contiguous, selected days wrap around properly.
 * @rule 6 or more days is always contiguous (only 1 gap maximum).
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
  // No Fallback: Validate input
  if (!Array.isArray(selectedDayIndices)) {
    throw new Error(
      `isScheduleContiguous: selectedDayIndices must be an array, got ${typeof selectedDayIndices}`
    )
  }

  // Empty selection is not contiguous
  if (selectedDayIndices.length === 0) {
    return false
  }

  // Single day is contiguous
  if (selectedDayIndices.length === 1) {
    return true
  }

  // Validate all day indices
  for (const day of selectedDayIndices) {
    if (typeof day !== 'number' || isNaN(day) || day < 0 || day > 6) {
      throw new Error(
        `isScheduleContiguous: Invalid day index ${day}, must be 0-6`
      )
    }
  }

  // Sort the selected days (immutable)
  const sorted = selectedDayIndices.toSorted((a, b) => a - b)

  // If 6 or more days selected, it's contiguous (only 1 gap or no gaps)
  if (sorted.length >= 6) {
    return true
  }

  // Check for standard contiguous sequence (no wrap around)
  let isStandardContiguous = true
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] !== sorted[i - 1] + 1) {
      isStandardContiguous = false
      break
    }
  }

  if (isStandardContiguous) {
    return true
  }

  // Check if selection includes both Sunday (0) and Saturday (6) - wrap-around case
  const hasZero = sorted.includes(0)
  const hasSix = sorted.includes(6)

  if (hasZero && hasSix) {
    // Week wrap-around case: use inverse logic (check not-selected days)
    // If the NOT selected days are contiguous, then selected days wrap around and are contiguous
    const allDays = [0, 1, 2, 3, 4, 5, 6]
    const notSelectedDays = allDays.filter(d => !sorted.includes(d))

    if (notSelectedDays.length === 0) {
      return true // All days selected
    }

    // Check if not-selected days form a contiguous block
    const minNotSelected = Math.min(...notSelectedDays)
    const maxNotSelected = Math.max(...notSelectedDays)

    // Generate expected contiguous range for not-selected days
    const expectedNotSelected = []
    for (let i = minNotSelected; i <= maxNotSelected; i++) {
      expectedNotSelected.push(i)
    }

    // If not-selected days are contiguous, then selected days wrap around properly
    const notSelectedContiguous = notSelectedDays.length === expectedNotSelected.length &&
      notSelectedDays.every((day, index) => day === expectedNotSelected[index])

    return notSelectedContiguous
  }

  return false
}
