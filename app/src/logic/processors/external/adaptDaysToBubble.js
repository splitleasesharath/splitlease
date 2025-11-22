/**
 * Convert 0-based day indices to 1-based Bubble API format.
 * Anti-Corruption Layer for Bubble.io API integration.
 *
 * @intent Protect the application from Bubble's 1-based day numbering system.
 * @rule Internal: 0=Sunday, 1=Monday, ..., 6=Saturday (JavaScript Date.getDay()).
 * @rule External (Bubble): 1=Sunday, 2=Monday, ..., 7=Saturday.
 * @rule Transformation: bubbleDay = jsDay + 1.
 *
 * @param {object} params - Named parameters.
 * @param {number[]} params.zeroBasedDays - Array of 0-based day indices (0-6).
 * @returns {number[]} Array of 1-based Bubble API day numbers (1-7).
 *
 * @throws {Error} If zeroBasedDays is not an array.
 * @throws {Error} If any day index is invalid (not 0-6).
 *
 * @example
 * const bubbleDays = adaptDaysToBubble({ zeroBasedDays: [1, 2, 3, 4, 5] })
 * // => [2, 3, 4, 5, 6] (Monday-Friday in Bubble format)
 */
export function adaptDaysToBubble({ zeroBasedDays }) {
  // No Fallback: Strict validation
  if (!Array.isArray(zeroBasedDays)) {
    throw new Error(
      `adaptDaysToBubble: zeroBasedDays must be an array, got ${typeof zeroBasedDays}`
    )
  }

  const bubbleDays = []

  for (const day of zeroBasedDays) {
    if (typeof day !== 'number' || isNaN(day)) {
      throw new Error(
        `adaptDaysToBubble: Invalid day value ${day}, must be a number`
      )
    }

    if (day < 0 || day > 6) {
      throw new Error(
        `adaptDaysToBubble: Invalid day index ${day}, must be 0-6`
      )
    }

    bubbleDays.push(day + 1)
  }

  return bubbleDays
}
