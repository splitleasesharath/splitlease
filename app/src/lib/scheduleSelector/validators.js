/**
 * Schedule validation utilities
 *
 * Validates day selections for schedule selectors including:
 * - Day selection/removal validation
 * - Contiguity checks (handles week wrap-around)
 * - Minimum/maximum nights constraints
 *
 * @module lib/scheduleSelector/validators
 */

import { sortDays } from './dayHelpers.js';

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const MAX_DAYS = 7
const CONTIGUOUS_THRESHOLD = 6
const ALL_DAYS = Object.freeze([0, 1, 2, 3, 4, 5, 6])

// ─────────────────────────────────────────────────────────────
// Validation Predicates
// ─────────────────────────────────────────────────────────────

/**
 * Check if day is already selected
 * @pure
 */
const isDayAlreadySelected = (day, selectedDays) =>
  selectedDays.some(d => d.dayOfWeek === day.dayOfWeek)

/**
 * Check if maximum days reached
 * @pure
 */
const isAtMaxDays = (selectedDays) =>
  selectedDays.length >= MAX_DAYS

/**
 * Check if day is in listing availability
 * @pure
 */
const isDayInListingAvailability = (day, listing) =>
  listing.daysAvailable.includes(day.dayOfWeek)

/**
 * Check if day is marked available
 * @pure
 */
const isDayMarkedAvailable = (day) =>
  day.isAvailable === true

/**
 * Check if at maximum nights for listing
 * @pure
 */
const isAtMaxNights = (selectedDays, listing) =>
  listing.maximumNights && selectedDays.length >= listing.maximumNights

/**
 * Check if removal would violate minimum nights
 * @pure
 */
const wouldViolateMinNights = (remainingDays, minimumNights) =>
  (remainingDays.length - 1) < minimumNights

/**
 * Check if days include both Sunday (0) and Saturday (6)
 * @pure
 */
const hasWeekWrapAround = (dayNumbers) =>
  dayNumbers.includes(0) && dayNumbers.includes(6)

/**
 * Check if all days are selected
 * @pure
 */
const hasAllDays = (dayNumbers) =>
  dayNumbers.length === MAX_DAYS

/**
 * Check if selection is large enough to be contiguous
 * @pure
 */
const isContiguousBySize = (dayNumbers) =>
  dayNumbers.length >= CONTIGUOUS_THRESHOLD

// ─────────────────────────────────────────────────────────────
// Result Builders
// ─────────────────────────────────────────────────────────────

/**
 * Build valid result
 * @pure
 */
const buildValidResult = () =>
  Object.freeze({ isValid: true })

/**
 * Build invalid result with error
 * @pure
 */
const buildInvalidResult = (error) =>
  Object.freeze({ isValid: false, error })

// ─────────────────────────────────────────────────────────────
// Pure Helper Functions
// ─────────────────────────────────────────────────────────────

/**
 * Get not-selected days from day numbers
 * @pure
 */
const getNotSelectedDays = (dayNumbers) =>
  ALL_DAYS.filter(d => !dayNumbers.includes(d))

/**
 * Generate contiguous range from min to max
 * @pure
 */
const generateRange = (min, max) => {
  const range = []
  for (let i = min; i <= max; i++) {
    range.push(i)
  }
  return range
}

/**
 * Check if array matches expected contiguous range
 * @pure
 */
const matchesContiguousRange = (days) => {
  if (days.length === 0) return true
  const min = Math.min(...days)
  const max = Math.max(...days)
  const expected = generateRange(min, max)
  return days.length === expected.length &&
    days.every((day, index) => day === expected[index])
}

/**
 * Check if days are normally contiguous (no gaps)
 * @pure
 */
const areNormallyContiguous = (dayNumbers) => {
  for (let i = 0; i < dayNumbers.length - 1; i++) {
    if (dayNumbers[i + 1] - dayNumbers[i] !== 1) {
      return false
    }
  }
  return true
}

// ─────────────────────────────────────────────────────────────
// Pure Functions
// ─────────────────────────────────────────────────────────────

/**
 * Validate if a day can be selected
 * @pure
 */
export const validateDaySelection = (day, selectedDays, listing) => {
  // Check if already selected
  if (isDayAlreadySelected(day, selectedDays)) {
    return buildInvalidResult('Day already selected')
  }

  // Check maximum (7 days max)
  if (isAtMaxDays(selectedDays)) {
    return buildInvalidResult('Maximum 7 days can be selected')
  }

  // Check if day is in listing's available days
  if (!isDayInListingAvailability(day, listing)) {
    return buildInvalidResult('Day not available for this listing')
  }

  // Check if day is marked as available
  if (!isDayMarkedAvailable(day)) {
    return buildInvalidResult('This day is not available')
  }

  // Check contiguity after adding
  const testSelection = sortDays([...selectedDays, day])
  if (testSelection.length > 1 && !isContiguous(testSelection)) {
    return buildInvalidResult('Days must be consecutive')
  }

  // Check maximum nights constraint
  if (isAtMaxNights(selectedDays, listing)) {
    return buildInvalidResult(`Maximum ${listing.maximumNights} days allowed by host`)
  }

  return buildValidResult()
}

/**
 * Validate if a day can be removed
 * @pure
 */
export const validateDayRemoval = (day, selectedDays, minimumNights) => {
  const remainingDays = selectedDays.filter(d => d.dayOfWeek !== day.dayOfWeek)

  // Check minimum nights (nights = days - 1)
  if (wouldViolateMinNights(remainingDays, minimumNights)) {
    return buildInvalidResult(`Minimum ${minimumNights + 1} days required`)
  }

  // Check contiguity after removal
  if (remainingDays.length > 1 && !isContiguous(remainingDays)) {
    return buildInvalidResult('Removal would create non-consecutive selection')
  }

  return buildValidResult()
}

/**
 * Check if days are contiguous (consecutive)
 * Based on Bubble implementation that handles week wrap-around cases
 * @pure
 */
export const isContiguous = (days) => {
  if (days.length <= 1) return true

  const sorted = sortDays(days)
  const dayNumbers = sorted.map(d => d.dayOfWeek)

  // If 6 or more days selected, it's contiguous by definition
  if (isContiguousBySize(dayNumbers)) return true

  // Check for week wrap-around case (Sat + Sun)
  if (hasWeekWrapAround(dayNumbers)) {
    // Use inverse logic: if NOT selected days are contiguous,
    // then selected days wrap around properly
    const notSelectedDays = getNotSelectedDays(dayNumbers)

    // All days selected = contiguous
    if (hasAllDays(dayNumbers)) return true

    // Check if not-selected days form a contiguous block
    return matchesContiguousRange(notSelectedDays)
  }

  // Normal case: no wrap-around, check standard contiguity
  return areNormallyContiguous(dayNumbers)
}

/**
 * Validate schedule meets all requirements
 * @pure
 */
export const validateSchedule = (selectedDays, listing) => {
  const nightsCount = Math.max(0, selectedDays.length - 1)

  // Check minimum nights
  if (nightsCount < listing.minimumNights) {
    return buildInvalidResult(`Minimum ${listing.minimumNights + 1} days required`)
  }

  // Check maximum nights
  if (listing.maximumNights && nightsCount > listing.maximumNights) {
    return buildInvalidResult(`Maximum ${listing.maximumNights + 1} days allowed`)
  }

  // Check contiguity
  if (!isContiguous(selectedDays)) {
    return buildInvalidResult('Days must be consecutive')
  }

  return buildValidResult()
}

// ─────────────────────────────────────────────────────────────
// Exported Test Constants
// ─────────────────────────────────────────────────────────────

/**
 * Exported for testing purposes
 * @test
 */
export const __test__ = Object.freeze({
  // Constants
  MAX_DAYS,
  CONTIGUOUS_THRESHOLD,
  ALL_DAYS,

  // Predicates
  isDayAlreadySelected,
  isAtMaxDays,
  isDayInListingAvailability,
  isDayMarkedAvailable,
  isAtMaxNights,
  wouldViolateMinNights,
  hasWeekWrapAround,
  hasAllDays,
  isContiguousBySize,

  // Result Builders
  buildValidResult,
  buildInvalidResult,

  // Helpers
  getNotSelectedDays,
  generateRange,
  matchesContiguousRange,
  areNormallyContiguous
})
