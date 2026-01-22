/**
 * Generate Simulated Proposals
 *
 * Creates mock proposal data for the host-side usability simulation.
 * These proposals are generated from the 3 simulated guests and assigned
 * to either the host's actual listing or a simulated listing.
 *
 * @module logic/simulators/generateSimulatedProposals
 */

import { generateSimulatedGuests } from './generateSimulatedGuests.js';

/**
 * Adds a specified number of days to a date.
 *
 * @param {Date} date - The base date
 * @param {number} days - Number of days to add
 * @returns {Date} New date with days added
 */
function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Formats a date as YYYY-MM-DD string.
 *
 * @param {Date} date - The date to format
 * @returns {string} Formatted date string
 */
function formatDateString(date) {
  return date.toISOString().split('T')[0];
}

/**
 * Generates a simulated listing for cases where the host doesn't have one.
 *
 * @returns {Object} Simulated listing object
 */
export function generateSimulatedListing() {
  return {
    id: 'sim-listing-default',
    _id: 'sim-listing-default',
    name: 'Simulated Brooklyn Apartment',
    neighborhood: 'Williamsburg',
    address: '123 Bedford Ave, Brooklyn, NY 11249',
    monthlyRate: 2800,
    nightlyRate: 140,
    bedrooms: 2,
    bathrooms: 1,
    coverPhoto: null,
    isSimulated: true
  };
}

/**
 * Generates 3 simulated proposals for the host-side usability simulation.
 * Each proposal comes from a different simulated guest with slightly
 * different terms to provide variety during testing.
 *
 * @param {Object} options - Configuration options
 * @param {Object} [options.listing] - The host's listing (or null for simulated listing)
 * @param {string} options.hostId - The host user's ID
 * @returns {Array<Object>} Array of 3 simulated proposal objects
 */
export function generateSimulatedProposals({ listing, hostId }) {
  const guests = generateSimulatedGuests();
  const baseDate = new Date();
  const hostListing = listing || generateSimulatedListing();

  return guests.map((guest, index) => {
    // Vary the proposal parameters for each guest
    const proposalVariations = [
      // Jacques - Weekday professional, 4 nights/week
      {
        nightsPerWeek: 4,
        checkInDay: 0, // Sunday
        checkOutDay: 4, // Thursday
        selectedDays: [0, 1, 2, 3], // Sun, Mon, Tue, Wed
        nightlyPrice: 135,
        moveInOffset: 14,
        moveOutOffset: 120
      },
      // Mariska - Flexible schedule, 3 nights/week
      {
        nightsPerWeek: 3,
        checkInDay: 1, // Monday
        checkOutDay: 4, // Thursday
        selectedDays: [1, 2, 3], // Mon, Tue, Wed
        nightlyPrice: 145,
        moveInOffset: 21,
        moveOutOffset: 150
      },
      // Lukas - Weekend focused, 3 nights/week
      {
        nightsPerWeek: 3,
        checkInDay: 4, // Thursday
        checkOutDay: 0, // Sunday
        selectedDays: [4, 5, 6], // Thu, Fri, Sat
        nightlyPrice: 155,
        moveInOffset: 7,
        moveOutOffset: 90
      }
    ];

    const variation = proposalVariations[index];
    const moveInDate = addDays(baseDate, variation.moveInOffset);
    const moveOutDate = addDays(baseDate, variation.moveOutOffset);

    return {
      id: `sim-proposal-${index + 1}`,
      _id: `sim-proposal-${index + 1}`,
      proposalNumber: index + 1,

      // Guest info
      guest,
      guestId: guest.id,
      guestName: guest.fullName,
      guestEmail: guest.email,

      // Host info
      hostId,

      // Listing info
      listing: hostListing,
      listingId: hostListing.id || hostListing._id,
      listingName: hostListing.name || hostListing.Name,

      // Dates
      moveInDate: formatDateString(moveInDate),
      moveOutDate: formatDateString(moveOutDate),
      moveInStart: formatDateString(moveInDate),
      moveInEnd: formatDateString(addDays(moveInDate, 7)),

      // Schedule details
      nightsPerWeek: variation.nightsPerWeek,
      checkInDay: variation.checkInDay,
      checkOutDay: variation.checkOutDay,
      selectedDays: variation.selectedDays,

      // Pricing
      nightlyPrice: variation.nightlyPrice,
      monthlyEstimate: Math.round(variation.nightlyPrice * variation.nightsPerWeek * 4.33),

      // Status tracking (for simulation steps)
      status: 'pending',
      vmStatus: null,
      vmInviteSentAt: null,
      vmAcceptedAt: null,
      leaseStatus: null,
      leaseDraftedAt: null,
      hasIncomingVmInvite: false,
      vmInviteReceivedAt: null,

      // Metadata
      createdAt: new Date().toISOString(),
      isSimulated: true
    };
  });
}

/**
 * Updates a specific proposal's status in an array of proposals.
 *
 * @param {Array<Object>} proposals - Current proposals array
 * @param {string} proposalId - ID of proposal to update
 * @param {Object} updates - Fields to update
 * @returns {Array<Object>} New array with updated proposal
 */
export function updateSimulatedProposal(proposals, proposalId, updates) {
  return proposals.map(proposal =>
    proposal.id === proposalId
      ? { ...proposal, ...updates }
      : proposal
  );
}

/**
 * Updates a proposal by guest name.
 *
 * @param {Array<Object>} proposals - Current proposals array
 * @param {string} guestFirstName - First name of the guest (e.g., 'Mariska')
 * @param {Object} updates - Fields to update
 * @returns {Array<Object>} New array with updated proposal
 */
export function updateSimulatedProposalByGuest(proposals, guestFirstName, updates) {
  return proposals.map(proposal =>
    proposal.guest.firstName.toLowerCase() === guestFirstName.toLowerCase()
      ? { ...proposal, ...updates }
      : proposal
  );
}

export default generateSimulatedProposals;
