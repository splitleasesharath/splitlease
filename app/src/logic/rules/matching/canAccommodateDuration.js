/**
 * Check if listing can accommodate proposal's duration requirements.
 *
 * @intent Determine if listing's minimum nights constraint allows proposal booking.
 * @rule Listing minimum nights must be <= proposal nights.
 * @rule Tolerance parameter allows for close-enough matches.
 * @rule Missing minimum nights treated as no constraint (passes).
 *
 * @param {object} params - Named parameters.
 * @param {object} params.listing - Listing object with minimum nights.
 * @param {object} params.proposal - Proposal object with nights per week.
 * @param {number} [params.tolerance=1] - Allowed difference in nights.
 * @returns {boolean} True if duration can be accommodated.
 *
 * @example
 * canAccommodateDuration({
 *   listing: { 'Minimum Nights': 3 },
 *   proposal: { nightsPerWeek: 4 }
 * })
 * // => true (proposal nights > listing minimum)
 *
 * canAccommodateDuration({
 *   listing: { 'Minimum Nights': 5 },
 *   proposal: { nightsPerWeek: 3 }
 * })
 * // => false (proposal nights < listing minimum)
 */
export function canAccommodateDuration({ listing, proposal, tolerance = 1 }) {
  if (!listing || !proposal) {
    return false;
  }

  const listingMinNights = listing['Minimum Nights'];
  const proposalNights =
    proposal.nightsPerWeek ||
    proposal.daysSelected?.length ||
    0;

  // If listing has no minimum nights constraint, it can accommodate any duration
  if (listingMinNights === null || listingMinNights === undefined) {
    return true;
  }

  if (typeof listingMinNights !== 'number' || listingMinNights < 0) {
    return true; // Invalid minimum nights treated as no constraint
  }

  if (proposalNights === 0) {
    return false;
  }

  // Proposal nights must meet or exceed listing minimum (with tolerance)
  return proposalNights >= listingMinNights - tolerance;
}
