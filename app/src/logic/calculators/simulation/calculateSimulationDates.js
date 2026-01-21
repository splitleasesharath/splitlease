/**
 * calculateSimulationDates
 *
 * Pure date calculations for simulation scenarios.
 * Replaces JS2Bubble date calculation logic from the original Bubble page.
 *
 * @module logic/calculators/simulation/calculateSimulationDates
 */

/**
 * Calculate proposal dates offset by weeks from a base date
 * Used to simulate proposals starting at different points in the future.
 *
 * @param {Date} baseDate - Starting date
 * @param {number} weeksOffset - Number of weeks to offset (0, 1, 2, or 3)
 * @returns {Object} - { startDate, endDate } as ISO date strings (YYYY-MM-DD)
 */
export function calculateProposalDatesWithOffset(baseDate, weeksOffset) {
  const start = new Date(baseDate);
  start.setDate(start.getDate() + (weeksOffset * 7));

  const end = new Date(start);
  end.setDate(end.getDate() + 28); // 4-week lease duration

  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0]
  };
}

/**
 * Calculate nightly proposal dates (immediate/next-day start)
 * Used for short-term nightly reservations in the simulation.
 *
 * @param {Date} baseDate - Starting date (typically today)
 * @returns {Object} - { startDate, endDate } as ISO date strings
 */
export function calculateNightlyProposalDates(baseDate) {
  const start = new Date(baseDate);
  start.setDate(start.getDate() + 1); // Tomorrow

  const end = new Date(start);
  end.setDate(end.getDate() + 7); // 1-week stay

  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0]
  };
}

/**
 * Calculate a simulated lease end date that's "approaching"
 * Used in Step D to show a lease that's nearing its end.
 *
 * @param {Date} baseDate - Reference date
 * @param {number} daysUntilEnd - Days until the lease ends (default: 5)
 * @returns {string} - ISO date string (YYYY-MM-DD)
 */
export function calculateApproachingLeaseEndDate(baseDate, daysUntilEnd = 5) {
  const endDate = new Date(baseDate);
  endDate.setDate(endDate.getDate() + daysUntilEnd);
  return endDate.toISOString().split('T')[0];
}

/**
 * Calculate a date change window for simulation
 * Returns the new proposed dates when a host requests a date change.
 *
 * @param {string} currentStartDate - Current lease start date (ISO string)
 * @param {string} currentEndDate - Current lease end date (ISO string)
 * @param {number} shiftDays - Number of days to shift (positive = later, negative = earlier)
 * @returns {Object} - { newStartDate, newEndDate } as ISO date strings
 */
export function calculateDateChangeWindow(currentStartDate, currentEndDate, shiftDays) {
  const newStart = new Date(currentStartDate);
  newStart.setDate(newStart.getDate() + shiftDays);

  const newEnd = new Date(currentEndDate);
  newEnd.setDate(newEnd.getDate() + shiftDays);

  return {
    newStartDate: newStart.toISOString().split('T')[0],
    newEndDate: newEnd.toISOString().split('T')[0]
  };
}
