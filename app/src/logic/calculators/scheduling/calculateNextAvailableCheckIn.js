/**
 * Calculate the next available check-in date based on selected day-of-week and minimum date.
 * Smart default calculation for move-in dates.
 *
 * @intent Determine the soonest check-in date that matches the user's selected weekly schedule.
 * @rule Check-in must be on the first day of the selected weekly pattern.
 * @rule Check-in must be on or after the minimum allowed date (e.g., 2 weeks from today).
 * @rule If minDate already falls on the correct day-of-week, use that date.
 * @rule Otherwise, find the next occurrence of the target day-of-week.
 *
 * @param {object} params - Named parameters.
 * @param {number[]} params.selectedDayIndices - Array of selected day indices (0-6, sorted).
 * @param {Date|string} params.minDate - Minimum allowed check-in date.
 * @returns {string} ISO date string (YYYY-MM-DD) for the next available check-in.
 *
 * @throws {Error} If selectedDayIndices is empty or invalid.
 * @throws {Error} If minDate is not a valid date.
 *
 * @example
 * // User selects Wed-Sat (days 3,4,5,6), minimum is 2 weeks from today
 * const checkIn = calculateNextAvailableCheckIn({
 *   selectedDayIndices: [3, 4, 5, 6],
 *   minDate: '2025-12-01' // Monday
 * })
 * // => '2025-12-03' (next Wednesday)
 */
export function calculateNextAvailableCheckIn({ selectedDayIndices, minDate }) {
  // No Fallback: Validate inputs
  if (!Array.isArray(selectedDayIndices) || selectedDayIndices.length === 0) {
    throw new Error(
      'calculateNextAvailableCheckIn: selectedDayIndices must be a non-empty array'
    )
  }

  // Validate all day indices
  for (const day of selectedDayIndices) {
    if (typeof day !== 'number' || isNaN(day) || day < 0 || day > 6) {
      throw new Error(
        `calculateNextAvailableCheckIn: Invalid day index ${day}, must be 0-6`
      )
    }
  }

  // Parse and validate minDate
  const minDateObj = new Date(minDate)
  if (isNaN(minDateObj.getTime())) {
    throw new Error(
      `calculateNextAvailableCheckIn: minDate is not a valid date: ${minDate}`
    )
  }

  // Get the first selected day (check-in day of week)
  // Days should already be sorted, but sort to be safe
  const sortedDays = [...selectedDayIndices].sort((a, b) => a - b)
  const firstDayOfWeek = sortedDays[0]

  // Get the day of week for the minimum date
  const minDayOfWeek = minDateObj.getDay()

  // Calculate days to add to get to the next occurrence of the first selected day
  let daysToAdd = (firstDayOfWeek - minDayOfWeek + 7) % 7

  // If daysToAdd is 0, we're already on the right day
  if (daysToAdd === 0) {
    return minDateObj.toISOString().split('T')[0]
  }

  // Add the days to get to the next occurrence of the selected day
  const nextCheckInDate = new Date(minDateObj)
  nextCheckInDate.setDate(minDateObj.getDate() + daysToAdd)

  return nextCheckInDate.toISOString().split('T')[0]
}
