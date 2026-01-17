import { isDateInRange } from '../../rules/scheduling/isDateInRange.js';
import { isDateBlocked } from '../../rules/scheduling/isDateBlocked.js';
import { calculateCheckInOutDays } from '../../calculators/scheduling/calculateCheckInOutDays.js';
import { DAY_NAMES } from '../../../lib/dayUtils.js';

/**
 * Validate a proposed move-in date against listing availability and schedule.
 * Orchestrates multiple validation rules.
 *
 * @intent Enforce all business rules for move-in date selection.
 * @rule Move-in date cannot be in the past.
 * @rule Move-in date must be within listing's available date range.
 * @rule Move-in date cannot be on a blocked date.
 * @rule Move-in date's day-of-week must match the selected schedule's check-in day.
 *
 * @param {object} params - Named parameters.
 * @param {Date} params.moveInDate - Proposed move-in date.
 * @param {object} params.listing - Listing object with availability data.
 * @param {string|Date} [params.listing.firstAvailable] - First available date.
 * @param {string|Date} [params.listing.lastAvailable] - Last available date.
 * @param {Array} [params.listing.blockedDates] - Array of blocked dates.
 * @param {number[]} params.selectedDayIndices - Selected days of week (0-6).
 * @returns {object} Validation result with valid flag, errorCode, and details.
 *
 * @throws {Error} If moveInDate is not a valid Date.
 * @throws {Error} If listing is not provided.
 * @throws {Error} If selectedDayIndices is invalid.
 *
 * @example
 * const result = validateMoveInDateWorkflow({
 *   moveInDate: new Date('2025-12-15'),
 *   listing: { firstAvailable: '2025-12-01', lastAvailable: '2026-01-31', blockedDates: [] },
 *   selectedDayIndices: [1, 2, 3, 4, 5] // Mon-Fri
 * })
 * // => { valid: true, errorCode: null } (Dec 15 is a Monday)
 */
export function validateMoveInDateWorkflow({ moveInDate, listing, selectedDayIndices }) {
  // No Fallback: Validate inputs
  if (!(moveInDate instanceof Date) || isNaN(moveInDate.getTime())) {
    throw new Error(
      'validateMoveInDateWorkflow: moveInDate must be a valid Date object'
    )
  }

  if (!listing || typeof listing !== 'object') {
    throw new Error(
      'validateMoveInDateWorkflow: listing is required'
    )
  }

  if (!Array.isArray(selectedDayIndices)) {
    throw new Error(
      'validateMoveInDateWorkflow: selectedDayIndices must be an array'
    )
  }

  // Check if date is in the past
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const checkDate = new Date(moveInDate)
  checkDate.setHours(0, 0, 0, 0)

  if (checkDate < today) {
    return {
      valid: false,
      errorCode: 'MOVE_IN_DATE_IN_PAST'
    }
  }

  // Check if date is within available range
  const inRange = isDateInRange({
    date: moveInDate,
    firstAvailable: listing.firstAvailable || listing['First Available'],
    lastAvailable: listing.lastAvailable || listing['Last Available']
  })

  if (!inRange) {
    return {
      valid: false,
      errorCode: 'MOVE_IN_DATE_OUTSIDE_RANGE',
      firstAvailable: listing.firstAvailable || listing['First Available'],
      lastAvailable: listing.lastAvailable || listing['Last Available']
    }
  }

  // Check if date is blocked
  const blockedDates = listing.blockedDates || listing['Dates - Blocked'] || []
  const isBlocked = isDateBlocked({
    date: moveInDate,
    blockedDates
  })

  if (isBlocked) {
    return {
      valid: false,
      errorCode: 'MOVE_IN_DATE_BLOCKED'
    }
  }

  // Check if move-in date's day-of-week matches selected schedule
  if (selectedDayIndices.length > 0) {
    const { checkInDay } = calculateCheckInOutDays({ selectedDays: selectedDayIndices })
    const moveInDayOfWeek = moveInDate.getDay()

    if (checkInDay !== moveInDayOfWeek) {
      return {
        valid: false,
        errorCode: 'MOVE_IN_DAY_MISMATCH',
        expectedDayOfWeek: checkInDay,
        expectedDayName: DAY_NAMES[checkInDay],
        actualDayOfWeek: moveInDayOfWeek,
        actualDayName: DAY_NAMES[moveInDayOfWeek]
      }
    }
  }

  // All validations passed
  return {
    valid: true,
    errorCode: null
  }
}
