/**
 * Convert single 1-based Bubble day to 0-based.
 * Anti-Corruption Layer for Bubble.io API integration.
 *
 * @intent Protect the application from Bubble's 1-based day numbering system.
 * @rule External (Bubble): 1=Sunday, 2=Monday, ..., 7=Saturday.
 * @rule Internal: 0=Sunday, 1=Monday, ..., 6=Saturday.
 *
 * @param {object} params - Named parameters.
 * @param {number} params.bubbleDay - 1-based Bubble API day number (1-7).
 * @returns {number} 0-based day index (0-6).
 *
 * @throws {Error} If bubbleDay is not a number.
 * @throws {Error} If bubbleDay is outside valid range (1-7).
 *
 * @example
 * const day = adaptDayFromBubble({ bubbleDay: 2 })
 * // => 1 (Monday in 0-based format)
 */
export function adaptDayFromBubble({ bubbleDay }) {
  // No Fallback: Strict validation
  if (typeof bubbleDay !== 'number' || isNaN(bubbleDay)) {
    throw new Error(
      `adaptDayFromBubble: bubbleDay must be a number, got ${typeof bubbleDay}`
    )
  }

  if (bubbleDay < 1 || bubbleDay > 7) {
    throw new Error(
      `adaptDayFromBubble: Invalid Bubble day number ${bubbleDay}, must be 1-7`
    )
  }

  return bubbleDay - 1
}
