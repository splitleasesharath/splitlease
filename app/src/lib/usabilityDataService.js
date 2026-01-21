/**
 * Usability Data Service
 * API client for the usability-data-admin Edge Function
 *
 * All functions call the usability-data-admin Edge Function
 * via the Supabase functions.invoke method.
 */

import { supabase } from './supabase.js';

/**
 * Call the usability-data-admin Edge Function
 * @param {string} action - The action to perform
 * @param {Object} payload - The payload for the action
 * @returns {Promise<Object>} - The response data
 */
async function callUsabilityDataAdmin(action, payload = {}) {
  const { data, error } = await supabase.functions.invoke('usability-data-admin', {
    body: { action, payload },
  });

  if (error) {
    console.error(`[usabilityDataService] ${action} error:`, error);
    throw new Error(error.message || `Failed to execute ${action}`);
  }

  if (!data.success) {
    throw new Error(data.error || `${action} failed`);
  }

  return data.data;
}

// ============================================================================
// Host Operations
// ============================================================================

/**
 * List all usability tester hosts
 * @param {Object} options - Query options
 * @param {string} options.search - Search term for name/email
 * @param {number} options.limit - Max results to return (default: 50)
 * @param {number} options.offset - Offset for pagination (default: 0)
 * @returns {Promise<Object>} - { users, total, limit, offset }
 */
export async function listHosts({ search = '', limit = 50, offset = 0 } = {}) {
  return callUsabilityDataAdmin('listHosts', { search, limit, offset });
}

/**
 * Delete all threads, proposals, and data for a host
 * @param {string} hostId - The host's user ID
 * @returns {Promise<Object>} - { success, message, deletedCounts, timestamp }
 */
export async function clearHostData(hostId) {
  return callUsabilityDataAdmin('deleteHostData', { hostId });
}

/**
 * Delete all listings for a host
 * @param {string} hostId - The host's user ID
 * @returns {Promise<Object>} - { success, message, deletedCounts, timestamp }
 */
export async function deleteHostListings(hostId) {
  return callUsabilityDataAdmin('deleteHostListings', { hostId });
}

/**
 * Reset usability test status for a host
 * @param {string} hostId - The host's user ID
 * @returns {Promise<Object>} - { success, message, user, timestamp }
 */
export async function deleteHostTestStatus(hostId) {
  return callUsabilityDataAdmin('deleteHostTestStatus', { hostId });
}

// ============================================================================
// Guest Operations
// ============================================================================

/**
 * List all usability tester guests
 * @param {Object} options - Query options
 * @param {string} options.search - Search term for name/email
 * @param {number} options.limit - Max results to return (default: 50)
 * @param {number} options.offset - Offset for pagination (default: 0)
 * @returns {Promise<Object>} - { users, total, limit, offset }
 */
export async function listGuests({ search = '', limit = 50, offset = 0 } = {}) {
  return callUsabilityDataAdmin('listGuests', { search, limit, offset });
}

/**
 * Delete all threads, proposals, and data for a guest
 * @param {string} guestId - The guest's user ID
 * @returns {Promise<Object>} - { success, message, deletedCounts, timestamp }
 */
export async function clearGuestData(guestId) {
  return callUsabilityDataAdmin('deleteGuestData', { guestId });
}

/**
 * Reset usability test status for a guest
 * @param {string} guestId - The guest's user ID
 * @returns {Promise<Object>} - { success, message, user, timestamp }
 */
export async function deleteGuestTestStatus(guestId) {
  return callUsabilityDataAdmin('deleteGuestTestStatus', { guestId });
}

// ============================================================================
// Listing Operations
// ============================================================================

/**
 * Fetch listing by ID
 * @param {string} listingId - The listing ID (supports _id or Unique ID)
 * @returns {Promise<Object>} - { listing: { id, uniqueId, name, nightlyPrice, photos, hostId } }
 */
export async function fetchListing(listingId) {
  return callUsabilityDataAdmin('fetchListing', { listingId });
}

// ============================================================================
// Proposal Operations
// ============================================================================

/**
 * Create a quick proposal for usability testing
 * @param {Object} proposalData - The proposal data
 * @param {string} proposalData.listingId - The listing ID
 * @param {string} proposalData.guestId - The guest's user ID
 * @param {string} proposalData.moveInDate - The move-in date (YYYY-MM-DD)
 * @param {number[]} proposalData.selectedDayIndices - 0-indexed day indices (0=Sun, 6=Sat)
 * @param {number} proposalData.reservationWeeks - Number of weeks
 * @param {number} proposalData.totalPrice - Total reservation price
 * @param {number} proposalData.fourWeeksRent - 4 weeks rent amount
 * @param {number} proposalData.nightlyPrice - Nightly rate
 * @param {string} proposalData.notes - Optional notes
 * @returns {Promise<Object>} - { success, proposalId, threadId, proposal, timestamp }
 */
export async function createQuickProposal({
  listingId,
  guestId,
  moveInDate,
  selectedDayIndices,
  reservationWeeks,
  totalPrice,
  fourWeeksRent,
  nightlyPrice,
  notes = '',
}) {
  return callUsabilityDataAdmin('createQuickProposal', {
    listingId,
    guestId,
    moveInDate,
    selectedDayIndices,
    reservationWeeks,
    totalPrice,
    fourWeeksRent,
    nightlyPrice,
    notes,
  });
}

/**
 * Delete a proposal by ID
 * @param {string} proposalId - The proposal ID (supports _id or Unique ID)
 * @param {boolean} deleteThread - Whether to also delete the associated thread (default: true)
 * @returns {Promise<Object>} - { success, message, proposalId, threadId, threadDeleted, timestamp }
 */
export async function deleteProposal(proposalId, deleteThread = true) {
  return callUsabilityDataAdmin('deleteProposal', { proposalId, deleteThread });
}
