// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────
const MIN_DAY_INDEX = 0
const MAX_DAY_INDEX = 6

// ─────────────────────────────────────────────────────────────
// Validation Helpers (Pure Predicates)
// ─────────────────────────────────────────────────────────────
const isValidDayIndex = (day) =>
  typeof day === 'number' &&
  !isNaN(day) &&
  day >= MIN_DAY_INDEX &&
  day <= MAX_DAY_INDEX

/**
 * Validate all days in array, returning first invalid day or null
 * @pure
 * @param {number[]} days - Array of day indices
 * @returns {number | null} First invalid day or null if all valid
 */
const findInvalidDay = (days) => days.find((day) => !isValidDayIndex(day)) ?? null

/**
 * Calculate number of nights from selected days.
 *
 * @intent Determine the number of nights in a split lease stay.
 * @rule In split lease, nights = days selected (continuous selection).
 * @rule A stay from Monday to Friday (5 days) = 5 nights.
 * @pure Yes - deterministic, no side effects
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
  // Validation: Array type
  if (!Array.isArray(selectedDays)) {
    throw new Error(
      `calculateNightsFromDays: selectedDays must be an array, got ${typeof selectedDays}`
    )
  }

  // Validation: All entries are valid day indices (declarative)
  const invalidDay = findInvalidDay(selectedDays)
  if (invalidDay !== null) {
    throw new Error(
      `calculateNightsFromDays: Invalid day index ${invalidDay}, must be ${MIN_DAY_INDEX}-${MAX_DAY_INDEX}`
    )
  }

  // Pure calculation: In split lease, nights = days selected
  return selectedDays.length
}
