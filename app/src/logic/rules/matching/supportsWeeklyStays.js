/**
 * Check if listing supports weekly (7-night) stays.
 *
 * @intent Determine if listing can accommodate full-week bookings.
 * @rule Listing must have minimum nights <= 7 (or unset).
 * @rule Listing must have all 7 days available in schedule.
 * @rule Used as proxy for weekly stay support (no max_nights field available).
 *
 * @param {object} params - Named parameters.
 * @param {object} params.listing - Listing object with schedule and minimum nights data.
 * @returns {boolean} True if weekly stays are supported, false otherwise.
 *
 * @example
 * supportsWeeklyStays({
 *   listing: {
 *     'Schedule days available': [0, 1, 2, 3, 4, 5, 6],
 *     'Minimum Nights': 3
 *   }
 * })
 * // => true (7 days available, min nights <= 7)
 *
 * supportsWeeklyStays({
 *   listing: {
 *     'Schedule days available': [1, 2, 3, 4, 5],
 *     'Minimum Nights': 2
 *   }
 * })
 * // => false (only 5 days available)
 */
export function supportsWeeklyStays({ listing }) {
  if (!listing) {
    return false;
  }

  const minimumNights = listing['Minimum Nights'];
  const availableDays = listing['Schedule days available'];

  // Check minimum nights constraint
  // If unset (null/undefined) or <= 7, it passes
  const minNightsOk =
    minimumNights === null ||
    minimumNights === undefined ||
    minimumNights <= 7;

  if (!minNightsOk) {
    return false;
  }

  // Check if all 7 days are available
  if (!Array.isArray(availableDays)) {
    return false;
  }

  const hasFullWeek = availableDays.length === 7;

  return hasFullWeek;
}
