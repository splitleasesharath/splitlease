/**
 * Calculate number of nights from selected days.
 *
 * @intent Determine the number of nights in a split lease stay.
 * @rule In split lease, nights = days selected (continuous selection).
 * @rule A stay from Monday to Friday (5 days) = 5 nights.
 *
 * @param {object} params - Named parameters.
 * @param {number[]} params.selectedDays - Array of day indices (0-6).
 * @returns {number} Number of nights in the stay.
 *
 * @throws {Error} If selectedDays is not an array.
 * @throws {Error} If selectedDays contains invalid values.
 *
 * @example
 * const nights = calculateNightsFromDays({ selectedDays: [1, 2, 3, 4, 5] })
 * // => 5
 */
export function calculateNightsFromDays({ selectedDays }) {
  // No Fallback: Validate input
  if (!Array.isArray(selectedDays)) {
    throw new Error(
      `calculateNightsFromDays: selectedDays must be an array, got ${typeof selectedDays}`
    )
  }

  // Validate all entries are numbers in valid range
  for (const day of selectedDays) {
    if (typeof day !== 'number' || isNaN(day) || day < 0 || day > 6) {
      throw new Error(
        `calculateNightsFromDays: Invalid day index ${day}, must be 0-6`
      )
    }
  }

  // In split lease, nights = days selected
  return selectedDays.length
}
