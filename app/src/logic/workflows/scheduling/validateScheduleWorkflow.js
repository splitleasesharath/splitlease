import { isScheduleContiguous } from '../../rules/scheduling/isScheduleContiguous.js'

/**
 * Validate a schedule selection against listing requirements.
 * Orchestrates multiple validation rules to determine if a schedule is acceptable.
 *
 * @intent Enforce all business rules for schedule selection in one workflow.
 * @rule Days must be contiguous (consecutive).
 * @rule Must have at least one day selected.
 * @rule May optionally check against minimum/maximum nights from listing.
 * @rule Returns error codes (not UI messages) - presentation layer maps to messages.
 * @pure Yes - deterministic, no side effects
 */

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const DAY_NAMES = Object.freeze([
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
])

const ERROR_CODES = Object.freeze({
  NO_DAYS_SELECTED: 'NO_DAYS_SELECTED',
  NOT_CONTIGUOUS: 'NOT_CONTIGUOUS',
  BELOW_MINIMUM_NIGHTS: 'BELOW_MINIMUM_NIGHTS',
  ABOVE_MAXIMUM_NIGHTS: 'ABOVE_MAXIMUM_NIGHTS',
  DAYS_NOT_AVAILABLE: 'DAYS_NOT_AVAILABLE'
})

const ERROR_MESSAGES = Object.freeze({
  INVALID_DAYS: 'validateScheduleWorkflow: selectedDayIndices must be an array'
})

// ─────────────────────────────────────────────────────────────
// Validation Predicates (Pure Functions)
// ─────────────────────────────────────────────────────────────

/**
 * Check if value is defined (not null or undefined)
 * @pure
 */
const isDefined = (value) => value !== undefined && value !== null

/**
 * Check if array is non-empty
 * @pure
 */
const hasElements = (arr) => Array.isArray(arr) && arr.length > 0

/**
 * Check if value is a valid number
 * @pure
 */
const isValidNumber = (value) => !isNaN(Number(value))

/**
 * Parse value to number safely
 * @pure
 */
const toNumber = (value) => Number(value)

// ─────────────────────────────────────────────────────────────
// Pure Transformation Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Convert day index to day name
 * @pure
 */
const getDayName = (dayIndex) => DAY_NAMES[dayIndex]

/**
 * Find unavailable days from selected days
 * @pure
 */
const findUnavailableDays = (selectedDayIndices, daysNotAvailable) =>
  selectedDayIndices.filter(dayIndex =>
    daysNotAvailable.includes(getDayName(dayIndex))
  )

// ─────────────────────────────────────────────────────────────
// Result Builders (Pure Functions)
// ─────────────────────────────────────────────────────────────

/**
 * Build successful validation result
 * @pure
 */
const buildValidResult = (nightsCount) =>
  Object.freeze({
    valid: true,
    errorCode: null,
    nightsCount,
    isContiguous: true
  })

/**
 * Build no days selected error result
 * @pure
 */
const buildNoDaysSelectedError = () =>
  Object.freeze({
    valid: false,
    errorCode: ERROR_CODES.NO_DAYS_SELECTED,
    nightsCount: 0,
    isContiguous: false
  })

/**
 * Build not contiguous error result
 * @pure
 */
const buildNotContiguousError = (nightsCount) =>
  Object.freeze({
    valid: false,
    errorCode: ERROR_CODES.NOT_CONTIGUOUS,
    nightsCount,
    isContiguous: false
  })

/**
 * Build below minimum nights error result
 * @pure
 */
const buildBelowMinimumError = (nightsCount, minimumNights) =>
  Object.freeze({
    valid: false,
    errorCode: ERROR_CODES.BELOW_MINIMUM_NIGHTS,
    nightsCount,
    isContiguous: true,
    minimumNights
  })

/**
 * Build above maximum nights error result
 * @pure
 */
const buildAboveMaximumError = (nightsCount, maximumNights) =>
  Object.freeze({
    valid: false,
    errorCode: ERROR_CODES.ABOVE_MAXIMUM_NIGHTS,
    nightsCount,
    isContiguous: true,
    maximumNights
  })

/**
 * Build days not available error result
 * @pure
 */
const buildDaysNotAvailableError = (nightsCount, unavailableDays) =>
  Object.freeze({
    valid: false,
    errorCode: ERROR_CODES.DAYS_NOT_AVAILABLE,
    nightsCount,
    isContiguous: true,
    unavailableDays
  })

// ─────────────────────────────────────────────────────────────
// Main Workflow
// ─────────────────────────────────────────────────────────────

/**
 * Validate a schedule selection
 * @pure
 *
 * @param {object} params - Named parameters.
 * @param {number[]} params.selectedDayIndices - Array of selected day indices (0-6).
 * @param {object} [params.listing] - Optional listing object with constraints.
 * @param {number} [params.listing.minimumNights] - Minimum nights required.
 * @param {number} [params.listing.maximumNights] - Maximum nights allowed.
 * @param {string[]} [params.listing.daysNotAvailable] - Days not available (day names).
 * @returns {object} Validation result with valid flag, errorCode, and metadata (frozen).
 *
 * @throws {Error} If selectedDayIndices is not an array.
 *
 * @example
 * const result = validateScheduleWorkflow({
 *   selectedDayIndices: [1, 2, 3, 4, 5],
 *   listing: { minimumNights: 2, maximumNights: 7 }
 * })
 * // => { valid: true, errorCode: null, nightsCount: 5, isContiguous: true }
 */
export function validateScheduleWorkflow({ selectedDayIndices, listing = {} }) {
  // Validation
  if (!Array.isArray(selectedDayIndices)) {
    throw new Error(
      `${ERROR_MESSAGES.INVALID_DAYS}, got ${typeof selectedDayIndices}`
    )
  }

  // Check: Any days selected
  if (!hasElements(selectedDayIndices)) {
    return buildNoDaysSelectedError()
  }

  // Calculate nights (in split lease, nights = days selected)
  const nightsCount = selectedDayIndices.length

  // Check: Contiguous requirement
  const contiguous = isScheduleContiguous({ selectedDayIndices })

  if (!contiguous) {
    return buildNotContiguousError(nightsCount)
  }

  // Check: Minimum nights
  if (isDefined(listing.minimumNights)) {
    const minNights = toNumber(listing.minimumNights)
    if (isValidNumber(listing.minimumNights) && nightsCount < minNights) {
      return buildBelowMinimumError(nightsCount, minNights)
    }
  }

  // Check: Maximum nights
  if (isDefined(listing.maximumNights)) {
    const maxNights = toNumber(listing.maximumNights)
    if (isValidNumber(listing.maximumNights) && nightsCount > maxNights) {
      return buildAboveMaximumError(nightsCount, maxNights)
    }
  }

  // Check: Days not available
  if (hasElements(listing.daysNotAvailable)) {
    const unavailableDays = findUnavailableDays(selectedDayIndices, listing.daysNotAvailable)

    if (hasElements(unavailableDays)) {
      return buildDaysNotAvailableError(nightsCount, unavailableDays)
    }
  }

  return buildValidResult(nightsCount)
}

// ─────────────────────────────────────────────────────────────
// Exported Constants (for testing)
// ─────────────────────────────────────────────────────────────
export { DAY_NAMES, ERROR_CODES, ERROR_MESSAGES }
