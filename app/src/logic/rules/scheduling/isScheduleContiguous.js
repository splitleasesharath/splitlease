/**
 * Schedule contiguity rules
 *
 * Validates that selected days form consecutive nights for split lease stays.
 */

/**
 * All valid day indices (0=Sunday through 6=Saturday)
 * @type {number[]}
 */
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

/**
 * Validate that a day index is valid (0-6)
 *
 * @param {*} day - Value to validate
 * @returns {boolean} Whether the day is a valid index
 */
const isValidDayIndex = (day) =>
  typeof day === 'number' && !isNaN(day) && day >= 0 && day <= 6;

/**
 * Check if an array of sorted days is contiguous (no gaps)
 *
 * @param {number[]} sortedDays - Sorted array of day indices
 * @returns {boolean} Whether days are consecutive
 */
const isConsecutive = (sortedDays) =>
  sortedDays.every((day, index) =>
    index === 0 || day === sortedDays[index - 1] + 1
  );

/**
 * Check if unselected days form a contiguous block
 * (if they do, the selected days properly wrap around the week)
 *
 * @param {number[]} sortedSelectedDays - Sorted array of selected day indices
 * @returns {boolean} Whether unselected days are contiguous
 */
const areUnselectedDaysContiguous = (sortedSelectedDays) => {
  const selectedSet = new Set(sortedSelectedDays);
  const unselectedDays = ALL_DAYS.filter((d) => !selectedSet.has(d));

  // If all days selected, wrap-around is trivially true
  if (unselectedDays.length === 0) {
    return true;
  }

  // Check if unselected days are consecutive
  return isConsecutive(unselectedDays);
};

/**
 * Check if selected days form a contiguous (consecutive) block.
 *
 * @intent Enforce the business rule that split lease stays must be consecutive nights.
 * @rule Days must be consecutive (Mon-Fri OK, Mon+Wed NOT OK).
 * @rule Handles week wrap-around cases (Fri-Sun OK, Sat-Tue OK).
 * @rule For wrap-around, uses inverse logic: if unselected days are contiguous, selected days wrap properly.
 * @rule 6 or more days is always contiguous (only 1 gap maximum possible).
 *
 * @param {object} params - Named parameters.
 * @param {number[]} params.selectedDayIndices - Array of day indices (0=Sunday through 6=Saturday).
 * @returns {boolean} True if days are contiguous, false otherwise.
 *
 * @throws {Error} If selectedDayIndices is not an array.
 * @throws {Error} If any day index is invalid (not 0-6).
 *
 * @example
 * isScheduleContiguous({ selectedDayIndices: [1, 2, 3, 4, 5] }) // true (Mon-Fri)
 * isScheduleContiguous({ selectedDayIndices: [1, 3, 5] }) // false (Mon, Wed, Fri - gaps)
 * isScheduleContiguous({ selectedDayIndices: [5, 6, 0] }) // true (Fri-Sun, wraps)
 * isScheduleContiguous({ selectedDayIndices: [6, 0, 1, 2] }) // true (Sat-Tue, wraps)
 */
export function isScheduleContiguous({ selectedDayIndices }) {
  // No Fallback: Validate input type
  if (!Array.isArray(selectedDayIndices)) {
    throw new Error(
      `isScheduleContiguous: selectedDayIndices must be an array, got ${typeof selectedDayIndices}`
    );
  }

  // Empty selection is not contiguous
  if (selectedDayIndices.length === 0) {
    return false;
  }

  // Single day is contiguous
  if (selectedDayIndices.length === 1) {
    return true;
  }

  // Validate all day indices (using functional check)
  const invalidDay = selectedDayIndices.find((day) => !isValidDayIndex(day));
  if (invalidDay !== undefined) {
    throw new Error(
      `isScheduleContiguous: Invalid day index ${invalidDay}, must be 0-6`
    );
  }

  const sorted = [...selectedDayIndices].sort((a, b) => a - b);

  // If 6 or more days selected, it's contiguous (at most 1 gap)
  if (sorted.length >= 6) {
    return true;
  }

  // Check for standard contiguous sequence (no wrap-around)
  if (isConsecutive(sorted)) {
    return true;
  }

  // Check for wrap-around case (selection includes both Sunday=0 and Saturday=6)
  const hasZero = sorted[0] === 0;
  const hasSix = sorted[sorted.length - 1] === 6;

  if (hasZero && hasSix) {
    // Week wrap-around: check if unselected days are contiguous
    return areUnselectedDaysContiguous(sorted);
  }

  return false;
}
