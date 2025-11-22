/**
 * Convert single 0-based day to 1-based Bubble format.
 * Anti-Corruption Layer for Bubble.io API integration.
 *
 * @intent Protect the application from Bubble's 1-based day numbering system.
 * @rule Internal: 0=Sunday, 1=Monday, ..., 6=Saturday.
 * @rule External (Bubble): 1=Sunday, 2=Monday, ..., 7=Saturday.
 *
 * @param {object} params - Named parameters.
 * @param {number} params.day - 0-based day index (0-6).
 * @returns {number} 1-based Bubble API day number (1-7).
 *
 * @throws {Error} If day is not a number.
 * @throws {Error} If day is outside valid range (0-6).
 *
 * @example
 * const bubbleDay = adaptDayToBubble({ day: 1 })
 * // => 2 (Monday in Bubble format)
 */
export function adaptDayToBubble({ day }) {
  // No Fallback: Strict validation
  if (typeof day !== 'number' || isNaN(day)) {
    throw new Error(
      `adaptDayToBubble: day must be a number, got ${typeof day}`
    )
  }

  if (day < 0 || day > 6) {
    throw new Error(
      `adaptDayToBubble: Invalid day index ${day}, must be 0-6`
    )
  }

  return day + 1
}
