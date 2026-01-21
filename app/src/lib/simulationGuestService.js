/**
 * simulationGuestService
 *
 * Frontend API client for guest simulation Edge Function.
 * All functions follow the action-based pattern used throughout Split Lease.
 *
 * @module lib/simulationGuestService
 */

import { supabase } from './supabase.js';

const FUNCTION_NAME = 'simulation-guest';

/**
 * Initialize simulation for a guest user
 * Creates or loads test proposals and simulation context.
 *
 * @param {Object} params
 * @param {string} params.guestId - The guest's user ID
 * @returns {Promise<Object>} - { simulationId, proposals }
 */
export async function initializeSimulation({ guestId }) {
  const { data, error } = await supabase.functions.invoke(FUNCTION_NAME, {
    body: {
      action: 'initialize',
      payload: { guestId }
    }
  });

  if (error) throw new Error(error.message);
  if (!data.success) throw new Error(data.error || 'Failed to initialize simulation');
  return data.data;
}

/**
 * Step A: Simulate lease document signing
 * Creates a lease from a selected proposal.
 *
 * @param {Object} params
 * @param {string} params.simulationId - The active simulation ID
 * @param {string} params.proposalId - The proposal to sign
 * @returns {Promise<Object>} - { lease }
 */
export async function stepALeaseDocuments({ simulationId, proposalId }) {
  const { data, error } = await supabase.functions.invoke(FUNCTION_NAME, {
    body: {
      action: 'step_a_lease_documents',
      payload: { simulationId, proposalId }
    }
  });

  if (error) throw new Error(error.message);
  if (!data.success) throw new Error(data.error || 'Failed to complete Step A');
  return data.data;
}

/**
 * Step B: Grant house manual access
 * Simulates receiving the house manual from the host.
 *
 * @param {Object} params
 * @param {string} params.simulationId - The active simulation ID
 * @param {string} params.leaseId - The active lease ID
 * @returns {Promise<Object>} - { houseManual }
 */
export async function stepBHouseManual({ simulationId, leaseId }) {
  const { data, error } = await supabase.functions.invoke(FUNCTION_NAME, {
    body: {
      action: 'step_b_house_manual',
      payload: { simulationId, leaseId }
    }
  });

  if (error) throw new Error(error.message);
  if (!data.success) throw new Error(data.error || 'Failed to complete Step B');
  return data.data;
}

/**
 * Step C: Simulate host-led date change
 * Creates a date change request from the host that guest must respond to.
 *
 * @param {Object} params
 * @param {string} params.simulationId - The active simulation ID
 * @param {string} params.leaseId - The active lease ID
 * @returns {Promise<Object>} - { dateChangeRequest }
 */
export async function stepCDateChange({ simulationId, leaseId }) {
  const { data, error } = await supabase.functions.invoke(FUNCTION_NAME, {
    body: {
      action: 'step_c_date_change',
      payload: { simulationId, leaseId }
    }
  });

  if (error) throw new Error(error.message);
  if (!data.success) throw new Error(data.error || 'Failed to complete Step C');
  return data.data;
}

/**
 * Step D: Simulate lease reaching end
 * Updates the lease to show it's approaching its end date.
 *
 * @param {Object} params
 * @param {string} params.simulationId - The active simulation ID
 * @param {string} params.leaseId - The active lease ID
 * @returns {Promise<Object>}
 */
export async function stepDLeaseEnding({ simulationId, leaseId }) {
  const { data, error } = await supabase.functions.invoke(FUNCTION_NAME, {
    body: {
      action: 'step_d_lease_ending',
      payload: { simulationId, leaseId }
    }
  });

  if (error) throw new Error(error.message);
  if (!data.success) throw new Error(data.error || 'Failed to complete Step D');
  return data.data;
}

/**
 * Step E: Simulate host SMS notification
 * Simulates receiving an SMS from the host.
 *
 * @param {Object} params
 * @param {string} params.simulationId - The active simulation ID
 * @returns {Promise<Object>}
 */
export async function stepEHostSms({ simulationId }) {
  const { data, error } = await supabase.functions.invoke(FUNCTION_NAME, {
    body: {
      action: 'step_e_host_sms',
      payload: { simulationId }
    }
  });

  if (error) throw new Error(error.message);
  if (!data.success) throw new Error(data.error || 'Failed to complete Step E');
  return data.data;
}

/**
 * Step F: Complete simulation
 * Marks the simulation as finished and shows completion stats.
 *
 * @param {Object} params
 * @param {string} params.simulationId - The active simulation ID
 * @returns {Promise<Object>}
 */
export async function stepFComplete({ simulationId }) {
  const { data, error } = await supabase.functions.invoke(FUNCTION_NAME, {
    body: {
      action: 'step_f_complete',
      payload: { simulationId }
    }
  });

  if (error) throw new Error(error.message);
  if (!data.success) throw new Error(data.error || 'Failed to complete simulation');
  return data.data;
}

/**
 * Cleanup simulation data
 * Removes all test data created during the simulation.
 *
 * @param {Object} params
 * @param {string} params.simulationId - The simulation ID to clean up
 * @returns {Promise<Object>}
 */
export async function cleanup({ simulationId }) {
  const { data, error } = await supabase.functions.invoke(FUNCTION_NAME, {
    body: {
      action: 'cleanup',
      payload: { simulationId }
    }
  });

  if (error) throw new Error(error.message);
  if (!data.success) throw new Error(data.error || 'Failed to cleanup simulation');
  return data.data;
}
