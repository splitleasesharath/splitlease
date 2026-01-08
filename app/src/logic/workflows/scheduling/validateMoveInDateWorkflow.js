import { isDateInRange } from '../../rules/scheduling/isDateInRange.js'
import { isDateBlocked } from '../../rules/scheduling/isDateBlocked.js'
import { calculateCheckInOutDays } from '../../calculators/scheduling/calculateCheckInOutDays.js'

/**
 * Validate a proposed move-in date against listing availability and schedule.
 * Orchestrates multiple validation rules.
 *
 * @intent Enforce all business rules for move-in date selection.
 * @rule Move-in date cannot be in the past.
 * @rule Move-in date must be within listing's available date range.
 * @rule Move-in date cannot be on a blocked date.
 * @rule Move-in date's day-of-week must match the selected schedule's check-in day.
 * @pure Yes - deterministic, no side effects
 */

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const DAY_NAMES = Object.freeze([
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
])

const ERROR_CODES = Object.freeze({
  IN_PAST: 'MOVE_IN_DATE_IN_PAST',
  OUTSIDE_RANGE: 'MOVE_IN_DATE_OUTSIDE_RANGE',
  BLOCKED: 'MOVE_IN_DATE_BLOCKED',
  DAY_MISMATCH: 'MOVE_IN_DAY_MISMATCH'
})

const ERROR_MESSAGES = Object.freeze({
  INVALID_DATE: 'validateMoveInDateWorkflow: moveInDate must be a valid Date object',
  MISSING_LISTING: 'validateMoveInDateWorkflow: listing is required',
  INVALID_DAYS: 'validateMoveInDateWorkflow: selectedDayIndices must be an array'
})

const LISTING_FIELD_NAMES = Object.freeze({
  FIRST_AVAILABLE: 'First Available',
  LAST_AVAILABLE: 'Last Available',
  BLOCKED_DATES: 'Dates - Blocked'
})

// ─────────────────────────────────────────────────────────────
// Validation Predicates (Pure Functions)
// ─────────────────────────────────────────────────────────────

/**
 * Check if value is a valid Date object
 * @pure
 */
const isValidDate = (value) =>
  value instanceof Date && !isNaN(value.getTime())

/**
 * Check if value is a non-null object
 * @pure
 */
const isObject = (value) => typeof value === 'object' && value !== null

/**
 * Check if date is in the past (before today)
 * @pure
 */
const isDateInPast = (date, today) => date < today

/**
 * Check if array has elements
 * @pure
 */
const hasElements = (arr) => Array.isArray(arr) && arr.length > 0

// ─────────────────────────────────────────────────────────────
// Pure Transformation Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Normalize date to midnight
 * @pure
 */
const normalizeToMidnight = (date) => {
  const normalized = new Date(date)
  normalized.setHours(0, 0, 0, 0)
  return normalized
}

/**
 * Get today's date at midnight
 * @pure (for a given execution)
 */
const getTodayAtMidnight = () => normalizeToMidnight(new Date())

/**
 * Extract first available date from listing
 * @pure
 */
const extractFirstAvailable = (listing) =>
  listing.firstAvailable || listing[LISTING_FIELD_NAMES.FIRST_AVAILABLE]

/**
 * Extract last available date from listing
 * @pure
 */
const extractLastAvailable = (listing) =>
  listing.lastAvailable || listing[LISTING_FIELD_NAMES.LAST_AVAILABLE]

/**
 * Extract blocked dates from listing
 * @pure
 */
const extractBlockedDates = (listing) =>
  listing.blockedDates || listing[LISTING_FIELD_NAMES.BLOCKED_DATES] || []

// ─────────────────────────────────────────────────────────────
// Result Builders (Pure Functions)
// ─────────────────────────────────────────────────────────────

/**
 * Build successful validation result
 * @pure
 */
const buildValidResult = () =>
  Object.freeze({ valid: true, errorCode: null })

/**
 * Build past date error result
 * @pure
 */
const buildPastDateError = () =>
  Object.freeze({ valid: false, errorCode: ERROR_CODES.IN_PAST })

/**
 * Build outside range error result
 * @pure
 */
const buildOutsideRangeError = (firstAvailable, lastAvailable) =>
  Object.freeze({
    valid: false,
    errorCode: ERROR_CODES.OUTSIDE_RANGE,
    firstAvailable,
    lastAvailable
  })

/**
 * Build blocked date error result
 * @pure
 */
const buildBlockedDateError = () =>
  Object.freeze({ valid: false, errorCode: ERROR_CODES.BLOCKED })

/**
 * Build day mismatch error result
 * @pure
 */
const buildDayMismatchError = (expectedDay, actualDay) =>
  Object.freeze({
    valid: false,
    errorCode: ERROR_CODES.DAY_MISMATCH,
    expectedDayOfWeek: expectedDay,
    expectedDayName: DAY_NAMES[expectedDay],
    actualDayOfWeek: actualDay,
    actualDayName: DAY_NAMES[actualDay]
  })

// ─────────────────────────────────────────────────────────────
// Main Workflow
// ─────────────────────────────────────────────────────────────

/**
 * Validate a proposed move-in date
 * @pure
 *
 * @param {object} params - Named parameters.
 * @param {Date} params.moveInDate - Proposed move-in date.
 * @param {object} params.listing - Listing object with availability data.
 * @param {number[]} params.selectedDayIndices - Selected days of week (0-6).
 * @returns {object} Validation result with valid flag and errorCode (frozen).
 *
 * @throws {Error} If moveInDate is not a valid Date.
 * @throws {Error} If listing is not provided.
 * @throws {Error} If selectedDayIndices is not an array.
 */
export function validateMoveInDateWorkflow({ moveInDate, listing, selectedDayIndices }) {
  // Validation
  if (!isValidDate(moveInDate)) {
    throw new Error(ERROR_MESSAGES.INVALID_DATE)
  }

  if (!isObject(listing)) {
    throw new Error(ERROR_MESSAGES.MISSING_LISTING)
  }

  if (!Array.isArray(selectedDayIndices)) {
    throw new Error(ERROR_MESSAGES.INVALID_DAYS)
  }

  // Check: Date in past
  const today = getTodayAtMidnight()
  const checkDate = normalizeToMidnight(moveInDate)

  if (isDateInPast(checkDate, today)) {
    return buildPastDateError()
  }

  // Check: Date in available range
  const firstAvailable = extractFirstAvailable(listing)
  const lastAvailable = extractLastAvailable(listing)

  const inRange = isDateInRange({
    date: moveInDate,
    firstAvailable,
    lastAvailable
  })

  if (!inRange) {
    return buildOutsideRangeError(firstAvailable, lastAvailable)
  }

  // Check: Date not blocked
  const blockedDates = extractBlockedDates(listing)
  const blocked = isDateBlocked({ date: moveInDate, blockedDates })

  if (blocked) {
    return buildBlockedDateError()
  }

  // Check: Day-of-week matches schedule
  if (hasElements(selectedDayIndices)) {
    const { checkInDay } = calculateCheckInOutDays({ selectedDays: selectedDayIndices })
    const moveInDayOfWeek = moveInDate.getDay()

    if (checkInDay !== moveInDayOfWeek) {
      return buildDayMismatchError(checkInDay, moveInDayOfWeek)
    }
  }

  return buildValidResult()
}

// ─────────────────────────────────────────────────────────────
// Exported Constants (for testing)
// ─────────────────────────────────────────────────────────────
export { DAY_NAMES, ERROR_CODES, ERROR_MESSAGES, LISTING_FIELD_NAMES }
