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
 *
 * @param {object} params - Named parameters.
 * @param {number[]} params.selectedDayIndices - Array of selected day indices (0-6).
 * @param {object} [params.listing] - Optional listing object with constraints.
 * @param {number} [params.listing.minimumNights] - Minimum nights required.
 * @param {number} [params.listing.maximumNights] - Maximum nights allowed.
 * @param {string[]} [params.listing.daysNotAvailable] - Days not available (day names).
 * @returns {object} Validation result with valid flag, errorCode, and metadata.
 *
 * @throws {Error} If selectedDayIndices is not an array.
 *
 * @example
 * const result = validateScheduleWorkflow({
 *   selectedDayIndices: [1, 2, 3, 4, 5],
 *   listing: { minimumNights: 2, maximumNights: 7 }
 * })
 * // => { valid: true, errorCode: null, nightsCount: 5, isContiguous: true }
 *
 * const invalid = validateScheduleWorkflow({
 *   selectedDayIndices: [1, 3, 5],
 *   listing: {}
 * })
 * // => { valid: false, errorCode: 'NOT_CONTIGUOUS', nightsCount: 3, isContiguous: false }
 */
export function validateScheduleWorkflow({ selectedDayIndices, listing = {} }) {
  // No Fallback: Validate inputs
  if (!Array.isArray(selectedDayIndices)) {
    throw new Error(
      `validateScheduleWorkflow: selectedDayIndices must be an array, got ${typeof selectedDayIndices}`
    )
  }

  // Check if any days are selected
  if (selectedDayIndices.length === 0) {
    return {
      valid: false,
      errorCode: 'NO_DAYS_SELECTED',
      nightsCount: 0,
      isContiguous: false
    }
  }

  // Calculate nights (in split lease, nights = days selected)
  const nightsCount = selectedDayIndices.length

  // Check contiguous requirement (CRITICAL business rule)
  const isContiguous = isScheduleContiguous({ selectedDayIndices })

  if (!isContiguous) {
    return {
      valid: false,
      errorCode: 'NOT_CONTIGUOUS',
      nightsCount,
      isContiguous: false
    }
  }

  // Check against minimum nights (if specified)
  if (listing.minimumNights !== undefined && listing.minimumNights !== null) {
    const minNights = Number(listing.minimumNights)
    if (!isNaN(minNights) && nightsCount < minNights) {
      return {
        valid: false,
        errorCode: 'BELOW_MINIMUM_NIGHTS',
        nightsCount,
        isContiguous: true,
        minimumNights: minNights
      }
    }
  }

  // Check against maximum nights (if specified)
  if (listing.maximumNights !== undefined && listing.maximumNights !== null) {
    const maxNights = Number(listing.maximumNights)
    if (!isNaN(maxNights) && nightsCount > maxNights) {
      return {
        valid: false,
        errorCode: 'ABOVE_MAXIMUM_NIGHTS',
        nightsCount,
        isContiguous: true,
        maximumNights: maxNights
      }
    }
  }

  // Check against Days Not Available (if specified)
  if (listing.daysNotAvailable && Array.isArray(listing.daysNotAvailable)) {
    const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

    const unavailableSelected = selectedDayIndices.filter(dayIndex => {
      const dayName = DAY_NAMES[dayIndex]
      return listing.daysNotAvailable.includes(dayName)
    })

    if (unavailableSelected.length > 0) {
      return {
        valid: false,
        errorCode: 'DAYS_NOT_AVAILABLE',
        nightsCount,
        isContiguous: true,
        unavailableDays: unavailableSelected
      }
    }
  }

  // All validations passed
  return {
    valid: true,
    errorCode: null,
    nightsCount,
    isContiguous: true
  }
}
