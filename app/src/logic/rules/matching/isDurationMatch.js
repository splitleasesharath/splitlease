/**
 * Check if listing's minimum nights closely matches proposal duration.
 *
 * @intent Determine if listing and proposal have compatible duration expectations.
 * @rule Match if difference between minimum nights and proposal nights <= tolerance.
 * @rule Used for scoring, not hard filtering.
 * @rule Missing minimum nights treated as match (flexible listing).
 *
 * @param {object} params - Named parameters.
 * @param {object} params.listing - Listing object with minimum nights.
 * @param {object} params.proposal - Proposal object with nights per week.
 * @param {number} [params.tolerance=1] - Maximum allowed difference in nights.
 * @returns {boolean} True if durations match within tolerance.
 *
 * @example
 * isDurationMatch({
 *   listing: { 'Minimum Nights': 4 },
 *   proposal: { nightsPerWeek: 4 }
 * })
 * // => true (exact match)
 *
 * isDurationMatch({
 *   listing: { 'Minimum Nights': 4 },
 *   proposal: { nightsPerWeek: 5 }
 * })
 * // => true (within tolerance of 1)
 *
 * isDurationMatch({
 *   listing: { 'Minimum Nights': 3 },
 *   proposal: { nightsPerWeek: 6 }
 * })
 * // => false (difference of 3 exceeds tolerance)
 */
export function isDurationMatch({ listing, proposal, tolerance = 1 }) {
  if (!listing || !proposal) {
    return false;
  }

  const listingMinNights = listing['Minimum Nights'];
  const proposalNights =
    proposal.nightsPerWeek ||
    proposal.daysSelected?.length ||
    0;

  // If listing has no minimum nights, consider it a flexible match
  if (listingMinNights === null || listingMinNights === undefined) {
    return true;
  }

  if (typeof listingMinNights !== 'number') {
    return true; // Invalid data treated as flexible
  }

  if (proposalNights === 0) {
    return false;
  }

  // Check if difference is within tolerance
  const difference = Math.abs(listingMinNights - proposalNights);

  return difference <= tolerance;
}
