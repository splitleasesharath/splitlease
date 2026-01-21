/**
 * Adapt a proposal record for the matching algorithm.
 *
 * @intent Transform proposal data into normalized structure for matching.
 * @rule Extracts schedule, pricing, and listing context fields.
 * @rule Handles both raw Supabase and processed proposal formats.
 *
 * @param {object} rawProposal - Raw or processed proposal object.
 * @returns {object} Adapted proposal object for matching.
 *
 * @throws {Error} If rawProposal is null or undefined.
 *
 * @example
 * adaptProposalForMatching({
 *   _id: 'prop123',
 *   'Days Selected': [1, 2, 3, 4],
 *   'nights per week (num)': 4,
 *   'proposal nightly price': 100,
 *   listing: { boroughName: 'Manhattan' }
 * })
 * // => {
 * //   id: 'prop123',
 * //   daysSelected: [1, 2, 3, 4],
 * //   nightsPerWeek: 4,
 * //   nightlyPrice: 100,
 * //   listing: { boroughName: 'Manhattan', borough: null }
 * // }
 */
export function adaptProposalForMatching(rawProposal) {
  if (!rawProposal) {
    throw new Error('adaptProposalForMatching: rawProposal is required');
  }

  // Handle both raw (Bubble field names) and processed (camelCase) formats
  const daysSelected =
    rawProposal.daysSelected ||
    rawProposal['Days Selected'] ||
    [];

  const nightsPerWeek =
    rawProposal.nightsPerWeek ||
    rawProposal['nights per week (num)'] ||
    daysSelected.length ||
    0;

  const nightlyPrice =
    rawProposal.nightlyPrice ||
    rawProposal['proposal nightly price'] ||
    0;

  // Extract listing info (may be nested or at top level)
  const listingData = rawProposal.listing || {};
  const listingBorough =
    listingData.boroughName ||
    listingData.borough ||
    listingData['Location - Borough'] ||
    rawProposal['listing_borough'] ||
    null;

  return {
    // Core identifier
    id: rawProposal._id || rawProposal.id,
    _id: rawProposal._id || rawProposal.id,

    // Schedule
    daysSelected,
    nightsSelected: rawProposal.nightsSelected || rawProposal['Nights Selected (Nights list)'] || [],
    nightsPerWeek,
    checkInDay: rawProposal.checkInDay || rawProposal['check in day'] || null,
    checkOutDay: rawProposal.checkOutDay || rawProposal['check out day'] || null,
    reservationWeeks: rawProposal.reservationWeeks || rawProposal['Reservation Span (Weeks)'] || 0,

    // Move-in range
    moveInStart: rawProposal.moveInStart || rawProposal['Move in range start'] || null,
    moveInEnd: rawProposal.moveInEnd || rawProposal['Move in range end'] || null,

    // Pricing
    nightlyPrice,
    totalPrice: rawProposal.totalPrice || rawProposal['Total Price for Reservation (guest)'] || 0,
    cleaningFee: rawProposal.cleaningFee || rawProposal['cleaning fee'] || 0,
    damageDeposit: rawProposal.damageDeposit || rawProposal['damage deposit'] || 0,

    // Listing context (for borough matching)
    listing: {
      id: listingData.id || listingData._id || rawProposal.Listing || null,
      boroughName: listingBorough,
      borough: listingBorough,
      'Location - Borough': listingBorough,
      hoodName: listingData.hoodName || listingData.hood || null,
      name: listingData.name || listingData.Name || null
    },

    // Guest info
    guestId: rawProposal.guestId || rawProposal.Guest || null
  };
}
