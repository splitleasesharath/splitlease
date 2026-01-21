/**
 * Check if selected days form a contiguous block.
 *
 * DEPRECATED: This file is a duplicate of isScheduleContiguous in rules/scheduling/.
 * Re-exports from the canonical location for backward compatibility.
 *
 * @see {import('../../rules/scheduling/isScheduleContiguous.js')}
 */

import { isScheduleContiguous } from '../../rules/scheduling/isScheduleContiguous.js';

/**
 * Check if selected days form a contiguous block.
 * Handles week wrap-around cases (e.g., Fri-Mon).
 *
 * @deprecated Use isScheduleContiguous from rules/scheduling/ instead
 * @param {number[]} selectedDays - Array of day indices (0-6).
 * @returns {boolean} True if days are contiguous.
 *
 * @example
 * isContiguousSelection([1, 2, 3, 4, 5]) // true (Mon-Fri)
 * isContiguousSelection([5, 6, 0]) // true (Fri-Sun, wraps)
 */
export function isContiguousSelection(selectedDays) {
  // Delegate to the canonical implementation
  // Handle the parameter difference (array vs object with selectedDayIndices)
  return isScheduleContiguous({ selectedDayIndices: selectedDays });
}