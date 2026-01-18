/**
 * Helper utilities for Mockup Proposal Creation
 * Split Lease - Supabase Edge Functions
 *
 * Provides configuration and utility functions for creating mockup proposals
 * when a host submits their first listing.
 */

import { parseJsonArray } from "../../_shared/jsonUtils.ts";

// ============================================
// TYPES
// ============================================

export interface MockupDayNightConfig {
  /** Days selected (0-indexed, JS format: Sun=0) */
  daysSelected: number[];
  /** Nights selected (0-indexed, JS format: Sun=0) */
  nightsSelected: number[];
  /** Check-in day (0-indexed) */
  checkIn: number;
  /** Check-out day (0-indexed) */
  checkOut: number;
  /** Number of nights per week */
  nightsPerWeek: number;
  /** Total weeks for reservation */
  reservationSpanWeeks: number;
  /** Reservation span category for os_stay_periods */
  reservationSpan: string;
}

export interface ListingDataForMockup {
  "rental type"?: string;
  "Days Available (List of Days)"?: number[];
  "Nights Available (List of Nights) "?: number[];
}

// ============================================
// MOCK GUEST CONFIGURATION
// ============================================

/** Mock guest email for demonstration proposals */
export const MOCK_GUEST_EMAIL = "splitleasefrederick@gmail.com";

// ============================================
// DAY/NIGHT CONFIGURATION
// ============================================

/**
 * Get day/night configuration based on rental type for mockup proposals
 *
 * All values use JavaScript's 0-indexed format (Sun=0, Mon=1, ... Sat=6)
 * to match the database standard.
 *
 * @param rentalType - The listing's rental type (monthly, weekly, nightly)
 * @param listing - Listing data with available days/nights
 * @returns Configuration for the mockup proposal
 */
export function getMockupDayNightConfig(
  rentalType: string,
  listing: ListingDataForMockup
): MockupDayNightConfig {
  const rentalTypeLower = (rentalType || "nightly").toLowerCase();

  // Parse available nights from listing
  const availableNights = parseJsonArray<number>(
    listing["Nights Available (List of Nights) "],
    "Nights Available"
  );

  switch (rentalTypeLower) {
    case "monthly":
      // Monthly: Mon-Fri days, Mon-Thu nights, Check-in Mon, Check-out Fri
      // JS format: Sun=0, Mon=1, Tue=2, Wed=3, Thu=4, Fri=5, Sat=6
      return {
        daysSelected: [1, 2, 3, 4, 5], // Mon-Fri
        nightsSelected: [1, 2, 3, 4], // Mon-Thu nights
        checkIn: 1, // Monday
        checkOut: 5, // Friday
        nightsPerWeek: 4,
        reservationSpanWeeks: 13, // ~3 months
        reservationSpan: "3_months",
      };

    case "weekly":
      // Weekly: Mon-Fri days, Mon-Fri nights, Check-in Mon, Check-out Sat
      return {
        daysSelected: [1, 2, 3, 4, 5], // Mon-Fri
        nightsSelected: [1, 2, 3, 4, 5], // Mon-Fri nights
        checkIn: 1, // Monday
        checkOut: 6, // Saturday (check out morning)
        nightsPerWeek: 5,
        reservationSpanWeeks: 4, // 1 month
        reservationSpan: "1_month",
      };

    case "nightly":
    default:
      // Check if >5 nights available (full or near-full availability)
      if (availableNights.length > 5) {
        // Full availability: Use weekday pattern (Mon-Fri checkout = 4 nights staying)
        return {
          daysSelected: [1, 2, 3, 4, 5], // Mon-Fri
          nightsSelected: [1, 2, 3, 4], // Mon-Thu nights (4 staying nights)
          checkIn: 1, // Monday
          checkOut: 5, // Friday
          nightsPerWeek: 4,
          reservationSpanWeeks: 13, // Minimum 13 weeks
          reservationSpan: "3_months",
        };
      } else {
        // Limited availability: Use available nights minus one for flexibility
        const nightsCount = Math.max(1, availableNights.length - 1);
        const sortedNights =
          availableNights.length > 0
            ? [...availableNights].sort((a, b) => a - b).slice(0, nightsCount)
            : [1, 2, 3, 4]; // Default Mon-Thu

        // Days = nights + checkout day
        const lastNight = sortedNights[sortedNights.length - 1];
        let checkOutDay = lastNight + 1;
        if (checkOutDay > 6) checkOutDay = 0; // Wrap to Sunday

        const sortedDays = [...sortedNights, checkOutDay].sort((a, b) => a - b);
        const checkInDay = sortedDays[0];

        return {
          daysSelected: sortedDays,
          nightsSelected: sortedNights,
          checkIn: checkInDay,
          checkOut: checkOutDay,
          nightsPerWeek: nightsCount,
          reservationSpanWeeks: 13, // Minimum 13 weeks
          reservationSpan: "3_months",
        };
      }
  }
}

// ============================================
// DATE CALCULATIONS
// ============================================

/**
 * Calculate move-in date adjusted for the check-in day
 * Move-in should be 14-20 days in future, landing on the correct check-in day
 *
 * @param checkInDay - Check-in day of week (0-indexed, JS format)
 * @returns Move-in start and end dates
 */
export function calculateMockupMoveInDates(checkInDay: number): {
  moveInStart: Date;
  moveInEnd: Date;
} {
  const today = new Date();
  const moveInStart = new Date(today);

  // Start 14 days from now
  moveInStart.setDate(today.getDate() + 14);

  // Adjust to the correct check-in day
  const currentDayJS = moveInStart.getDay();
  const daysUntilCheckIn = (checkInDay - currentDayJS + 7) % 7;

  if (daysUntilCheckIn !== 0) {
    moveInStart.setDate(moveInStart.getDate() + daysUntilCheckIn);
  }

  // Move-in end is 6 days after start (gives a 7-day window)
  const moveInEnd = new Date(moveInStart);
  moveInEnd.setDate(moveInStart.getDate() + 6);

  return { moveInStart, moveInEnd };
}

/**
 * Generate the history entry message for mockup proposals
 */
export function generateMockupHistoryEntry(): string {
  return `Mockup proposal created on ${new Date().toLocaleString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })} - This is a demonstration proposal to help you understand the proposal review process.`;
}

/**
 * Generate the default comment for mockup proposals
 *
 * @param guestComment - The mock guest's "About - reasons to host me" field
 * @returns Comment string for the proposal
 */
export function generateMockupComment(guestComment?: string): string {
  return (
    guestComment ||
    "This is a demonstration proposal to show you how the proposal review process works. " +
      "When real guests apply, their information will appear here. You can approve, negotiate, or decline proposals."
  );
}
