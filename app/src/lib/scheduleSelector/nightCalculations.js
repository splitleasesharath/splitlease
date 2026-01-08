/**
 * Night calculation utilities for schedule selectors
 *
 * Handles complex night counting logic including:
 * - Nights from selected days (days - 1)
 * - Check-in/check-out calculations
 * - Week wrap-around cases (Sat-Sun transitions)
 *
 * @module lib/scheduleSelector/nightCalculations
 */

import { sortDays, createNight } from './dayHelpers.js';

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const SATURDAY = 6
const SUNDAY = 0
const FULL_WEEK = 7

// ─────────────────────────────────────────────────────────────
// Validation Predicates
// ─────────────────────────────────────────────────────────────

/**
 * Check if days array is empty
 * @pure
 */
const isEmptyDays = (days) => days.length === 0

/**
 * Check if days array has insufficient nights
 * @pure
 */
const hasInsufficientDays = (days) => days.length < 2

/**
 * Check if selection includes wrap-around (Sat + Sun)
 * @pure
 */
const hasWrapAround = (dayNumbers) =>
  dayNumbers.includes(SATURDAY) && dayNumbers.includes(SUNDAY)

/**
 * Check if selection is not a full week
 * @pure
 */
const isPartialWeek = (days) => days.length < FULL_WEEK

// ─────────────────────────────────────────────────────────────
// Pure Helper Functions
// ─────────────────────────────────────────────────────────────

/**
 * Find gap index in sorted day numbers
 * @pure
 */
const findGapIndex = (dayNumbers) => {
  for (let i = 0; i < dayNumbers.length - 1; i++) {
    if (dayNumbers[i + 1] - dayNumbers[i] > 1) {
      return i + 1
    }
  }
  return -1
}

/**
 * Build empty check-in/check-out result
 * @pure
 */
const buildEmptyCheckInOut = () =>
  Object.freeze({ checkIn: null, checkOut: null })

/**
 * Build check-in/check-out result from days
 * @pure
 */
const buildCheckInOut = (checkIn, checkOut) =>
  Object.freeze({ checkIn, checkOut })

/**
 * Build empty night numbers result
 * @pure
 */
const buildEmptyNightNumbers = () =>
  Object.freeze({ startNightNumber: null, endNightNumber: null })

/**
 * Build night numbers result
 * @pure
 */
const buildNightNumbers = (startNightNumber, endNightNumber) =>
  Object.freeze({ startNightNumber, endNightNumber })

// ─────────────────────────────────────────────────────────────
// Pure Functions
// ─────────────────────────────────────────────────────────────

/**
 * Calculate nights from selected days
 * @pure
 */
export const calculateNightsFromDays = (days) => {
  if (hasInsufficientDays(days)) return []

  const sorted = sortDays(days)

  // Nights are the periods between consecutive days
  // For example: Mon, Tue, Wed selected = Mon night, Tue night (2 nights)
  return sorted.slice(0, -1).map(day => createNight(day.dayOfWeek))
}

/**
 * Calculate check-in and check-out days
 * Handles wrap-around cases (e.g., Sat-Sun-Mon-Tue-Wed)
 *
 * For wrap-around selections with both Saturday (6) and Sunday (0):
 * - Find the gap in the selection
 * - Check-in is the first day AFTER the gap
 * - Check-out is the last day BEFORE the gap
 *
 * @pure
 * @example
 * Sat(6), Sun(0), Mon(1), Tue(2), Wed(3) -> Check-in: Sat, Check-out: Wed
 * Mon(1), Tue(2), Wed(3), Thu(4), Fri(5) -> Check-in: Mon, Check-out: Fri
 */
export const calculateCheckInCheckOut = (days) => {
  if (isEmptyDays(days)) {
    return buildEmptyCheckInOut()
  }

  const sorted = sortDays(days)
  const dayNumbers = sorted.map(d => d.dayOfWeek)

  // Check for wrap-around case (Sat + Sun, partial week)
  if (hasWrapAround(dayNumbers) && isPartialWeek(days)) {
    const gapIndex = findGapIndex(dayNumbers)

    if (gapIndex !== -1) {
      // The selection wraps around
      // Check-in is the first day after the gap (e.g., Saturday)
      // Check-out is the last day before the gap (e.g., Wednesday)
      return buildCheckInOut(sorted[gapIndex], sorted[gapIndex - 1])
    }
  }

  // Standard case: no wrap-around
  return buildCheckInOut(sorted[0], sorted[sorted.length - 1])
}

/**
 * Handle Sunday corner case for check-in/check-out
 * @pure
 */
export const handleSundayTransition = (days) => {
  const sorted = sortDays(days)
  const checkInDay = sorted[0]
  const checkOutDay = sorted[sorted.length - 1]

  // Start night is the first selected day's night
  const startNight = checkInDay.dayOfWeek

  // End night is the last night before checkout
  const endNight = checkOutDay.dayOfWeek

  return Object.freeze({
    checkInDay,
    checkOutDay,
    startNight,
    endNight
  })
}

/**
 * Calculate unused nights based on available nights
 * @pure
 */
export const calculateUnusedNights = (availableNights, selectedNights) =>
  Math.max(0, availableNights - selectedNights.length)

/**
 * Calculate start and end night numbers
 * @pure
 */
export const calculateStartEndNightNumbers = (days) => {
  if (isEmptyDays(days)) {
    return buildEmptyNightNumbers()
  }

  const sorted = sortDays(days)
  return buildNightNumbers(sorted[0].dayOfWeek, sorted[sorted.length - 1].dayOfWeek)
}

/**
 * Calculate days as numbers array
 * @pure
 */
export const calculateDaysAsNumbers = (days) =>
  sortDays(days).map(day => day.dayOfWeek)

/**
 * Calculate selected nights as numbers
 * @pure
 */
export const calculateSelectedNightsAsNumbers = (nights) =>
  nights.map(night => night.nightNumber)

/**
 * Count number of selected nights
 * @pure
 */
export const countSelectedNights = (days) =>
  // Nights = Days - 1 (because nights are between check-in and check-out)
  Math.max(0, days.length - 1)

// ─────────────────────────────────────────────────────────────
// Exported Test Constants
// ─────────────────────────────────────────────────────────────

/**
 * Exported for testing purposes
 * @test
 */
export const __test__ = Object.freeze({
  // Constants
  SATURDAY,
  SUNDAY,
  FULL_WEEK,

  // Predicates
  isEmptyDays,
  hasInsufficientDays,
  hasWrapAround,
  isPartialWeek,

  // Helpers
  findGapIndex,
  buildEmptyCheckInOut,
  buildCheckInOut,
  buildEmptyNightNumbers,
  buildNightNumbers
})
