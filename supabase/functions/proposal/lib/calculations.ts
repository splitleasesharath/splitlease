/**
 * Calculation utilities for Proposal Edge Function
 * Split Lease - Supabase Edge Functions
 *
 * Implements compensation and pricing calculations from Bubble Steps 13-18
 *
 * FP PATTERN: All calculation functions are pure with @pure annotations
 * Each function depends only on its inputs and produces deterministic outputs
 *
 * @module proposal/lib/calculations
 */

import {
  CompensationResult,
  RentalType,
  ReservationSpan,
} from "./types.ts";

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const LOG_PREFIX = '[proposal:calculations]'

// ─────────────────────────────────────────────────────────────
// Internal Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Round number to two decimal places
 * Prevents floating point precision issues
 * @pure
 */
const roundToTwoDecimals = (value: number): number =>
  Math.round(value * 100) / 100

// ─────────────────────────────────────────────────────────────
// Validation Predicates
// ─────────────────────────────────────────────────────────────

/**
 * Check if value is a valid array
 * @pure
 */
const isValidArray = <T>(arr: T[] | undefined | null): arr is T[] =>
  Array.isArray(arr)

// ─────────────────────────────────────────────────────────────
// Compensation Calculators (Internal)
// ─────────────────────────────────────────────────────────────

/**
 * Calculate nightly compensation
 * @pure
 */
const calculateNightlyCompensation = (
  hostNightlyRate: number,
  nightsPerWeek: number,
  weeks: number
): Omit<CompensationResult, 'host_compensation_per_night'> =>
  Object.freeze({
    total_compensation: roundToTwoDecimals(hostNightlyRate * nightsPerWeek * weeks),
    duration_months: roundToTwoDecimals(weeks / 4),
    four_week_rent: roundToTwoDecimals(hostNightlyRate * nightsPerWeek * 4),
    four_week_compensation: roundToTwoDecimals(hostNightlyRate * nightsPerWeek * 4),
  })

/**
 * Calculate weekly compensation
 * @pure
 */
const calculateWeeklyCompensation = (
  weeklyRate: number,
  weeks: number
): Omit<CompensationResult, 'host_compensation_per_night'> =>
  Object.freeze({
    total_compensation: roundToTwoDecimals(weeklyRate * weeks),
    duration_months: roundToTwoDecimals(weeks / 4),
    four_week_rent: roundToTwoDecimals(weeklyRate * 4),
    four_week_compensation: roundToTwoDecimals(weeklyRate * 4),
  })

/**
 * Calculate monthly compensation
 * @pure
 */
const calculateMonthlyCompensation = (
  monthlyRate: number,
  weeklyRate: number,
  weeks: number
): Omit<CompensationResult, 'host_compensation_per_night'> => {
  const effectiveMonthlyRate = monthlyRate || (weeklyRate * 4)
  const durationMonths = weeks / 4
  return Object.freeze({
    total_compensation: roundToTwoDecimals(effectiveMonthlyRate * durationMonths),
    duration_months: roundToTwoDecimals(durationMonths),
    four_week_rent: roundToTwoDecimals(effectiveMonthlyRate),
    four_week_compensation: roundToTwoDecimals(effectiveMonthlyRate),
  })
}

// ─────────────────────────────────────────────────────────────
// Compensation Calculators (Exported)
// ─────────────────────────────────────────────────────────────

/**
 * Calculate compensation based on rental type and duration
 * Mirrors Bubble workflow CORE-create_proposal-NEW Steps 13-18
 * @pure
 *
 * IMPORTANT: host_compensation in Bubble is the HOST's per-night rate (from listing's
 * pricing tiers like "💰Nightly Host Rate for X nights"), NOT the guest-facing price.
 * The Total Compensation is then calculated as:
 *   - Nightly: host_nightly_rate * nights_per_week * total_weeks
 *   - Weekly: weekly_rate * total_weeks
 *   - Monthly: monthly_rate * months
 */
export const calculateCompensation = (
  rentalType: RentalType,
  _reservationSpan: ReservationSpan, // Prefixed - preserved for API compatibility
  nightsPerWeek: number,
  weeklyRate: number,
  hostNightlyRate: number,
  weeks: number,
  monthlyRate?: number
): CompensationResult => {
  const hostCompensationPerNight = roundToTwoDecimals(hostNightlyRate)

  let baseCompensation: Omit<CompensationResult, 'host_compensation_per_night'>

  switch (rentalType) {
    case "nightly":
      baseCompensation = calculateNightlyCompensation(hostNightlyRate, nightsPerWeek, weeks)
      break

    case "weekly":
      baseCompensation = calculateWeeklyCompensation(weeklyRate, weeks)
      break

    case "monthly":
      baseCompensation = calculateMonthlyCompensation(monthlyRate || 0, weeklyRate, weeks)
      break

    default:
      console.warn(`${LOG_PREFIX} Unknown rental type "${rentalType}", defaulting to nightly`)
      baseCompensation = calculateNightlyCompensation(hostNightlyRate, nightsPerWeek, weeks)
  }

  return Object.freeze({
    ...baseCompensation,
    host_compensation_per_night: hostCompensationPerNight,
  })
}

// ─────────────────────────────────────────────────────────────
// Date Calculators
// ─────────────────────────────────────────────────────────────

/**
 * Calculate move-out date based on move-in and duration
 * Formula from Bubble Step 1:
 * Move-out = move_in_start + days: (reservation_span_weeks - 1) * 7 + nights_count
 * @pure
 */
export const calculateMoveOutDate = (
  moveInStart: Date,
  reservationSpanWeeks: number,
  nightsCount: number
): Date => {
  const daysToAdd = (reservationSpanWeeks - 1) * 7 + nightsCount
  const moveOut = new Date(moveInStart)
  moveOut.setDate(moveOut.getDate() + daysToAdd)
  return moveOut
}

/**
 * Calculate actual weeks between two dates
 * Useful for verifying reservation span
 * @pure
 */
export const calculateWeeksBetweenDates = (
  startDate: Date,
  endDate: Date
): number => {
  const diffMs = endDate.getTime() - startDate.getTime()
  const diffDays = diffMs / (1000 * 60 * 60 * 24)
  return roundToTwoDecimals(diffDays / 7)
}

// ─────────────────────────────────────────────────────────────
// Complementary Day/Night Calculators
// ─────────────────────────────────────────────────────────────

/**
 * Calculate complementary nights (nights available but not selected)
 * Mirrors Bubble Step 4
 * @pure
 */
export const calculateComplementaryNights = (
  availableNights: number[],
  selectedNights: number[]
): readonly number[] => {
  if (!isValidArray(availableNights)) return Object.freeze([])
  if (!isValidArray(selectedNights)) return Object.freeze([...availableNights])

  return Object.freeze(availableNights.filter((night) => !selectedNights.includes(night)))
}

/**
 * Calculate complementary days (days available but not selected)
 * @pure
 */
export const calculateComplementaryDays = (
  availableDays: number[],
  selectedDays: number[]
): readonly number[] => {
  if (!isValidArray(availableDays)) return Object.freeze([])
  if (!isValidArray(selectedDays)) return Object.freeze([...availableDays])

  return Object.freeze(availableDays.filter((day) => !selectedDays.includes(day)))
}

// ─────────────────────────────────────────────────────────────
// Order Ranking Calculator
// ─────────────────────────────────────────────────────────────

/**
 * Calculate order ranking for new proposal
 * Order ranking = existing proposals count + 1
 * @pure
 */
export const calculateOrderRanking = (existingProposalsCount: number): number =>
  (existingProposalsCount || 0) + 1

// ─────────────────────────────────────────────────────────────
// Price Calculators
// ─────────────────────────────────────────────────────────────

/**
 * Calculate total guest price including fees
 * @pure
 */
export const calculateTotalGuestPrice = (
  basePrice: number,
  cleaningFee: number,
  _damageDeposit: number // Prefixed - tracked separately as refundable
): number =>
  roundToTwoDecimals(basePrice + (cleaningFee || 0))

/**
 * Listing pricing tiers interface for getNightlyRateForNights
 */
interface ListingPricingTiers {
  readonly "💰Nightly Host Rate for 2 nights"?: number;
  readonly "💰Nightly Host Rate for 3 nights"?: number;
  readonly "💰Nightly Host Rate for 4 nights"?: number;
  readonly "💰Nightly Host Rate for 5 nights"?: number;
  readonly "💰Nightly Host Rate for 7 nights"?: number;
  readonly "💰Weekly Host Rate"?: number;
}

/**
 * Get nightly rate based on number of nights
 * Listings have different rates for different night counts
 * @pure
 */
export const getNightlyRateForNights = (
  listing: ListingPricingTiers,
  nightsPerWeek: number
): number => {
  // Map nights to the appropriate rate field
  const rateMap: Readonly<Record<number, number | undefined>> = Object.freeze({
    2: listing["💰Nightly Host Rate for 2 nights"],
    3: listing["💰Nightly Host Rate for 3 nights"],
    4: listing["💰Nightly Host Rate for 4 nights"],
    5: listing["💰Nightly Host Rate for 5 nights"],
    7: listing["💰Nightly Host Rate for 7 nights"],
  })

  // Try exact match first
  if (rateMap[nightsPerWeek] !== undefined) {
    return rateMap[nightsPerWeek]!
  }

  // For 6 nights, interpolate or use 7-night rate
  if (nightsPerWeek === 6 && rateMap[7]) {
    return rateMap[7]!
  }

  // Fallback to weekly rate divided by nights, or 0
  if (listing["💰Weekly Host Rate"] && nightsPerWeek > 0) {
    return roundToTwoDecimals(listing["💰Weekly Host Rate"] / nightsPerWeek)
  }

  return 0
}

// ─────────────────────────────────────────────────────────────
// Formatters
// ─────────────────────────────────────────────────────────────

/**
 * Format price for display (e.g., $1,029)
 * @pure
 */
export const formatPriceForDisplay = (price: number): string =>
  `$${Math.round(price).toLocaleString("en-US")}`

/**
 * Format price range for display (e.g., "$75 - $100")
 * @pure
 */
export const formatPriceRangeForDisplay = (
  minPrice: number,
  maxPrice: number
): string =>
  minPrice === maxPrice
    ? formatPriceForDisplay(minPrice)
    : `${formatPriceForDisplay(minPrice)} - ${formatPriceForDisplay(maxPrice)}`

// ─────────────────────────────────────────────────────────────
// Exported Test Constants
// ─────────────────────────────────────────────────────────────

/**
 * Exported for testing purposes
 * @test
 */
export const __test__ = Object.freeze({
  // Constants
  LOG_PREFIX,

  // Internal Helpers
  roundToTwoDecimals,
  isValidArray,

  // Internal Compensation Calculators
  calculateNightlyCompensation,
  calculateWeeklyCompensation,
  calculateMonthlyCompensation,

  // Exported Compensation Calculators
  calculateCompensation,

  // Date Calculators
  calculateMoveOutDate,
  calculateWeeksBetweenDates,

  // Complementary Day/Night Calculators
  calculateComplementaryNights,
  calculateComplementaryDays,

  // Order Ranking Calculator
  calculateOrderRanking,

  // Price Calculators
  calculateTotalGuestPrice,
  getNightlyRateForNights,

  // Formatters
  formatPriceForDisplay,
  formatPriceRangeForDisplay,
})
