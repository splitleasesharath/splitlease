/**
 * Calculate check-in and check-out days from selected day indices.
 * Handles wrap-around scenarios (e.g., Fri-Mon selection).
 *
 * NOTE: checkOut is the LAST SELECTED day, not the day AFTER.
 * For checkout as the day after the last stay, use calculateCheckInOutDays.js
 *
 * @param {number[]} selectedDays - Array of day indices (0=Sun, 6=Sat)
 * @returns {{ checkIn: number, checkOut: number }}
 * @throws {Error} If selectedDays is null/undefined or has less than 2 days
 *
 * @see calculateCheckInOutDays for a version that returns checkout as day AFTER last selected
 */
export function calculateCheckInOutFromDays(selectedDays) {
  if (!selectedDays || selectedDays.length < 2) {
    throw new Error('calculateCheckInOutFromDays: selectedDays must contain at least 2 days');
  }

  const sortedDays = [...selectedDays].sort((a, b) => a - b);
  const hasSaturday = sortedDays.includes(6);
  const hasSunday = sortedDays.includes(0);
  const isWrapAround = hasSaturday && hasSunday && sortedDays.length < 7;

  if (isWrapAround) {
    // Find the gap to determine actual boundaries
    let gapIndex = -1;
    for (let i = 1; i < sortedDays.length; i++) {
      if (sortedDays[i] - sortedDays[i - 1] > 1) {
        gapIndex = i;
        break;
      }
    }

    if (gapIndex !== -1) {
      return {
        checkIn: sortedDays[gapIndex],
        checkOut: sortedDays[gapIndex - 1]
      };
    }
  }

  return {
    checkIn: sortedDays[0],
    checkOut: sortedDays[sortedDays.length - 1]
  };
}
