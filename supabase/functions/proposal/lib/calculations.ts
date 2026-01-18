/**
 * Calculation utilities for Proposal Edge Function
 * Split Lease - Supabase Edge Functions
 *
 * Implements compensation and pricing calculations from Bubble Steps 13-18
 */

import {
  CompensationResult,
  RentalType,
  ReservationSpan,
} from "./types.ts";

/**
 * Calculate compensation based on rental type and duration
 * Mirrors Bubble workflow CORE-create_proposal-NEW Steps 13-18
 *
 * IMPORTANT: host_compensation in Bubble is the HOST'S per-night rate (from listing's
 * pricing tiers like "💰Nightly Host Rate for X nights"), NOT the guest-facing price.
 * The Total Compensation is then calculated as:
 *   - Nightly: host_nightly_rate * nights_per_week * total_weeks
 *   - Weekly: weekly_rate * total_weeks
 *   - Monthly: monthly_rate * months
 *
 * @param rentalType - Type of rental (nightly, weekly, monthly)
 * @param reservationSpan - Duration category (1_week, 1_month, etc.)
 * @param nightsPerWeek - Number of nights per week
 * @param weeklyRate - Host's weekly rate from listing (💰Weekly Host Rate)
 * @param hostNightlyRate - Host's per-night rate from listing pricing tiers
 * @param weeks - Total number of weeks for reservation
 * @param monthlyRate - Host's monthly rate from listing (💰Monthly Host Rate), optional
 * @returns Compensation calculation result
 */
export function calculateCompensation(
  rentalType: RentalType,
  reservationSpan: ReservationSpan,
  nightsPerWeek: number,
  weeklyRate: number,
  hostNightlyRate: number,
  weeks: number,
  monthlyRate?: number
): CompensationResult {
  let totalCompensation = 0;
  let durationMonths = 0;
  let fourWeekRent = 0;
  let fourWeekCompensation = 0;

  // Host compensation per period - the value depends on rental type:
  // - nightly: per-night rate from listing pricing tiers
  // - weekly: weekly rate from listing
  // - monthly: monthly rate from listing
  // This is stored in the "host compensation" field in the proposal
  let hostCompensationPerPeriod = hostNightlyRate;

  switch (rentalType) {
    case "nightly":
      // Step 13: Nightly calculation
      // Total = host_nightly_rate * nights_per_week * total_weeks
      // This matches Bubble: "host compensation * nights selected:count * actual weeks"
      hostCompensationPerPeriod = hostNightlyRate;
      totalCompensation = hostNightlyRate * nightsPerWeek * weeks;
      fourWeekRent = hostNightlyRate * nightsPerWeek * 4;
      fourWeekCompensation = fourWeekRent;
      durationMonths = weeks / 4;
      break;

    case "weekly":
      // Step 14: Weekly calculation
      // Total = weekly_rate * total_weeks
      // Host compensation is the per-week rate
      hostCompensationPerPeriod = weeklyRate;
      totalCompensation = weeklyRate * weeks;
      fourWeekRent = weeklyRate * 4;
      fourWeekCompensation = fourWeekRent;
      durationMonths = weeks / 4;
      break;

    case "monthly": {
      // Monthly uses the monthly rate directly
      // Host compensation is the per-month rate
      const effectiveMonthlyRate = monthlyRate || (weeklyRate * 4);
      hostCompensationPerPeriod = effectiveMonthlyRate;
      if (reservationSpan !== "other") {
        // Step 15: Monthly (standard span)
        // Duration in months = weeks / 4
        // Total = monthly_rate * months
        durationMonths = weeks / 4;
        totalCompensation = effectiveMonthlyRate * durationMonths;
        fourWeekRent = effectiveMonthlyRate;
        fourWeekCompensation = fourWeekRent;
      } else {
        // Step 16: Monthly (custom/other span)
        // Proportional calculation for non-standard durations
        durationMonths = weeks / 4;
        totalCompensation = effectiveMonthlyRate * durationMonths;
        fourWeekRent = effectiveMonthlyRate;
        fourWeekCompensation = fourWeekRent;
      }
      break;
    }

    default:
      // Default to nightly if unknown type
      console.warn(
        `[calculations] Unknown rental type "${rentalType}", defaulting to nightly`
      );
      hostCompensationPerPeriod = hostNightlyRate;
      totalCompensation = hostNightlyRate * nightsPerWeek * weeks;
      fourWeekRent = hostNightlyRate * nightsPerWeek * 4;
      fourWeekCompensation = fourWeekRent;
      durationMonths = weeks / 4;
  }

  return {
    total_compensation: roundToTwoDecimals(totalCompensation),
    duration_months: roundToTwoDecimals(durationMonths),
    four_week_rent: roundToTwoDecimals(fourWeekRent),
    four_week_compensation: roundToTwoDecimals(fourWeekCompensation),
    host_compensation_per_night: roundToTwoDecimals(hostCompensationPerPeriod),
  };
}

/**
 * Calculate move-out date based on move-in and duration
 * Formula from Bubble Step 1:
 * Move-out = move_in_start + days: (reservation_span_weeks - 1) * 7 + nights_count
 *
 * @param moveInStart - Move-in start date
 * @param reservationSpanWeeks - Number of weeks
 * @param nightsCount - Number of nights per week
 * @returns Calculated move-out date
 */
export function calculateMoveOutDate(
  moveInStart: Date,
  reservationSpanWeeks: number,
  nightsCount: number
): Date {
  const daysToAdd = (reservationSpanWeeks - 1) * 7 + nightsCount;
  const moveOut = new Date(moveInStart);
  moveOut.setDate(moveOut.getDate() + daysToAdd);
  return moveOut;
}

/**
 * Calculate complementary nights (nights available but not selected)
 * Mirrors Bubble Step 4
 *
 * @param availableNights - All nights available on the listing
 * @param selectedNights - Nights selected by the guest
 * @returns Array of complementary night indices
 */
export function calculateComplementaryNights(
  availableNights: number[],
  selectedNights: number[]
): number[] {
  if (!availableNights || !Array.isArray(availableNights)) return [];
  if (!selectedNights || !Array.isArray(selectedNights)) return availableNights;

  return availableNights.filter((night) => !selectedNights.includes(night));
}

/**
 * Calculate complementary days (days available but not selected)
 *
 * @param availableDays - All days available on the listing
 * @param selectedDays - Days selected by the guest
 * @returns Array of complementary day indices
 */
export function calculateComplementaryDays(
  availableDays: number[],
  selectedDays: number[]
): number[] {
  if (!availableDays || !Array.isArray(availableDays)) return [];
  if (!selectedDays || !Array.isArray(selectedDays)) return availableDays;

  return availableDays.filter((day) => !selectedDays.includes(day));
}

/**
 * Calculate order ranking for new proposal
 * Order ranking = existing proposals count + 1
 *
 * @param existingProposalsCount - Current number of proposals for the guest
 * @returns Order ranking for the new proposal
 */
export function calculateOrderRanking(existingProposalsCount: number): number {
  return (existingProposalsCount || 0) + 1;
}

/**
 * Calculate total guest price including fees
 *
 * @param basePrice - Base price (total compensation)
 * @param cleaningFee - Cleaning/maintenance fee
 * @param damageDeposit - Damage deposit (optional, may be separate)
 * @returns Total price for guest
 */
export function calculateTotalGuestPrice(
  basePrice: number,
  cleaningFee: number,
  _damageDeposit: number // Prefixed with _ to indicate intentionally unused
): number {
  // Note: Damage deposit is typically tracked separately and refundable
  // It may or may not be included in "total price" depending on context
  return roundToTwoDecimals(basePrice + (cleaningFee || 0));
}

/**
 * Get nightly rate based on number of nights
 * Listings have different rates for different night counts
 *
 * @param listing - Listing data with pricing tiers
 * @param nightsPerWeek - Number of nights per week
 * @returns Appropriate nightly rate
 */
export function getNightlyRateForNights(
  listing: {
    "💰Nightly Host Rate for 2 nights"?: number;
    "💰Nightly Host Rate for 3 nights"?: number;
    "💰Nightly Host Rate for 4 nights"?: number;
    "💰Nightly Host Rate for 5 nights"?: number;
    "💰Nightly Host Rate for 6 nights"?: number;
    "💰Nightly Host Rate for 7 nights"?: number;
    "💰Weekly Host Rate"?: number;
  },
  nightsPerWeek: number
): number {
  // Map nights to the appropriate rate field
  const rateMap: Record<number, number | undefined> = {
    2: listing["💰Nightly Host Rate for 2 nights"],
    3: listing["💰Nightly Host Rate for 3 nights"],
    4: listing["💰Nightly Host Rate for 4 nights"],
    5: listing["💰Nightly Host Rate for 5 nights"],
    6: listing["💰Nightly Host Rate for 6 nights"],
    7: listing["💰Nightly Host Rate for 7 nights"],
  };

  // Try exact match first
  if (rateMap[nightsPerWeek] !== undefined) {
    return rateMap[nightsPerWeek]!;
  }

  // For 6 nights without explicit rate, fall back to 7-night rate
  if (nightsPerWeek === 6 && rateMap[7]) {
    return rateMap[7]!;
  }

  // Fallback to weekly rate divided by nights, or 0
  if (listing["💰Weekly Host Rate"] && nightsPerWeek > 0) {
    return roundToTwoDecimals(listing["💰Weekly Host Rate"] / nightsPerWeek);
  }

  return 0;
}

/**
 * Format price for display (e.g., $1,029)
 *
 * @param price - Price value
 * @returns Formatted price string
 */
export function formatPriceForDisplay(price: number): string {
  return `$${Math.round(price).toLocaleString("en-US")}`;
}

/**
 * Format price range for display (e.g., "$75 - $100")
 *
 * @param minPrice - Minimum price
 * @param maxPrice - Maximum price
 * @returns Formatted price range string
 */
export function formatPriceRangeForDisplay(
  minPrice: number,
  maxPrice: number
): string {
  if (minPrice === maxPrice) {
    return formatPriceForDisplay(minPrice);
  }
  return `${formatPriceForDisplay(minPrice)} - ${formatPriceForDisplay(maxPrice)}`;
}

/**
 * Round number to two decimal places
 * Prevents floating point precision issues
 */
function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Calculate actual weeks between two dates
 * Useful for verifying reservation span
 *
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Number of weeks (can be fractional)
 */
export function calculateWeeksBetweenDates(
  startDate: Date,
  endDate: Date
): number {
  const diffMs = endDate.getTime() - startDate.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return roundToTwoDecimals(diffDays / 7);
}
