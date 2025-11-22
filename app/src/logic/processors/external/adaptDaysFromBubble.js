/**
 * Convert 1-based Bubble API day numbers to 0-based indices.
 * Anti-Corruption Layer for Bubble.io API integration.
 *
 * @intent Protect the application from Bubble's 1-based day numbering system.
 * @rule External (Bubble): 1=Sunday, 2=Monday, ..., 7=Saturday.
 * @rule Internal: 0=Sunday, 1=Monday, ..., 6=Saturday (JavaScript Date.getDay()).
 * @rule Transformation: jsDay = bubbleDay - 1.
 *
 * @param {object} params - Named parameters.
 * @param {number[]} params.bubbleDays - Array of 1-based Bubble API day numbers (1-7).
 * @returns {number[]} Array of 0-based day indices (0-6).
 *
 * @throws {Error} If bubbleDays is not an array.
 * @throws {Error} If any Bubble day number is invalid (not 1-7).
 *
 * @example
 * const zeroBasedDays = adaptDaysFromBubble({ bubbleDays: [2, 3, 4, 5, 6] })
 * // => [1, 2, 3, 4, 5] (Monday-Friday in 0-based format)
 */
export function adaptDaysFromBubble({ bubbleDays }) {
  // No Fallback: Strict validation
  if (!Array.isArray(bubbleDays)) {
    throw new Error(
      `adaptDaysFromBubble: bubbleDays must be an array, got ${typeof bubbleDays}`
    )
  }

  const zeroBasedDays = []

  for (const day of bubbleDays) {
    if (typeof day !== 'number' || isNaN(day)) {
      throw new Error(
        `adaptDaysFromBubble: Invalid day value ${day}, must be a number`
      )
    }

    if (day < 1 || day > 7) {
      throw new Error(
        `adaptDaysFromBubble: Invalid Bubble day number ${day}, must be 1-7`
      )
    }

    zeroBasedDays.push(day - 1)
  }

  return zeroBasedDays
}
