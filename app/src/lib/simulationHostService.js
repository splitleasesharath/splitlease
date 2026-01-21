/**
 * Simulation Host Service
 *
 * Frontend API client for the simulation-host Edge Function.
 * Provides functions to call all simulation actions with proper error handling.
 */

import { supabase } from './supabase.js';

const SIMULATION_FUNCTION = 'simulation-host';

/**
 * Generic function caller with error handling
 * @param {string} action - The action to invoke
 * @param {Object} payload - The action payload
 * @returns {Promise<Object>} The response data
 */
async function invokeSimulationAction(action, payload = {}) {
  console.log(`[simulationHostService] Invoking action: ${action}`);

  const { data, error } = await supabase.functions.invoke(SIMULATION_FUNCTION, {
    body: { action, payload }
  });

  if (error) {
    console.error(`[simulationHostService] ${action} failed:`, error);
    throw new Error(error.message || `Failed to execute ${action}`);
  }

  if (!data?.success) {
    throw new Error(data?.error || `Action ${action} was not successful`);
  }

  return data.data;
}

/**
 * Initialize a new simulation session
 * @returns {Promise<{simulationId: string, hostId: string, createdAt: string}>}
 */
export async function initSimulation() {
  return invokeSimulationAction('init_simulation', {});
}

/**
 * Mark the current user as a usability tester
 * @param {string} simulationId - The simulation session ID
 * @returns {Promise<{success: boolean, userId: string, isUsabilityTester: boolean}>}
 */
export async function markAsTester(simulationId) {
  return invokeSimulationAction('mark_tester', { simulationId });
}

/**
 * Create a test guest user for the simulation
 * @param {string} simulationId - The simulation session ID
 * @returns {Promise<{guestId: string, guestEmail: string, guestName: string, simulationId: string}>}
 */
export async function createTestGuest(simulationId) {
  return invokeSimulationAction('create_test_guest', { simulationId });
}

/**
 * Create test proposals from the test guest
 * @param {string} simulationId - The simulation session ID
 * @param {string} guestId - The test guest's ID
 * @param {string} listingId - The host's listing ID to use
 * @param {string} hostId - The host's user ID
 * @param {'weekly'|'monthly'|'nightly'} rentalType - The primary rental type
 * @returns {Promise<{proposals: Array<{proposalId: string, rentalType: string, status: string}>, simulationId: string}>}
 */
export async function createTestProposals(simulationId, guestId, listingId, hostId, rentalType = 'weekly') {
  return invokeSimulationAction('create_test_proposals', {
    simulationId,
    guestId,
    listingId,
    hostId,
    rentalType
  });
}

/**
 * Send a counteroffer from the host (guest will automatically reject)
 * @param {string} simulationId - The simulation session ID
 * @param {string} proposalId - The proposal to counteroffer
 * @param {Object} [counterofferData] - Optional counteroffer details
 * @returns {Promise<{proposalId: string, status: string, counterofferSent: boolean, guestRejected: boolean, simulationId: string}>}
 */
export async function sendCounteroffer(simulationId, proposalId, counterofferData = {}) {
  return invokeSimulationAction('send_counteroffer', {
    simulationId,
    proposalId,
    counterofferData
  });
}

/**
 * Accept a proposal and create a lease
 * @param {string} simulationId - The simulation session ID
 * @param {string} proposalId - The proposal to accept
 * @returns {Promise<{proposalId: string, leaseId: string|null, status: string, simulationId: string}>}
 */
export async function acceptProposal(simulationId, proposalId) {
  return invokeSimulationAction('accept_proposal', {
    simulationId,
    proposalId
  });
}

/**
 * Handle a guest request (submit and respond)
 * @param {string} simulationId - The simulation session ID
 * @param {string} leaseId - The lease ID
 * @param {'early_checkin'|'late_checkout'|'amenity_request'|'maintenance'} [requestType] - Type of request
 * @param {'approve'|'deny'} [hostResponse] - Host's response
 * @returns {Promise<{requestCreated: boolean, requestType: string, hostResponse: string, simulationId: string}>}
 */
export async function handleGuestRequest(simulationId, leaseId, requestType = 'early_checkin', hostResponse = 'approve') {
  return invokeSimulationAction('handle_guest_request', {
    simulationId,
    leaseId,
    requestType,
    hostResponse
  });
}

/**
 * Complete the stay and generate reviews
 * @param {string} simulationId - The simulation session ID
 * @param {string} leaseId - The lease ID
 * @param {string} proposalId - The proposal ID
 * @returns {Promise<{leaseCompleted: boolean, reviews: Array<{reviewId: string, reviewerType: string, rating: number}>, simulationId: string}>}
 */
export async function completeStay(simulationId, leaseId, proposalId) {
  return invokeSimulationAction('complete_stay', {
    simulationId,
    leaseId,
    proposalId
  });
}

/**
 * Clean up all test data from the simulation
 * @param {string} simulationId - The simulation session ID
 * @returns {Promise<{deletedCounts: Object, simulationId: string, success: boolean}>}
 */
export async function cleanupSimulation(simulationId) {
  return invokeSimulationAction('cleanup', { simulationId });
}

export default {
  initSimulation,
  markAsTester,
  createTestGuest,
  createTestProposals,
  sendCounteroffer,
  acceptProposal,
  handleGuestRequest,
  completeStay,
  cleanupSimulation
};
