/**
 * Virtual Meetings Workflow Module
 *
 * PILLAR IV: Workflow Orchestrators (The "Flow" Layer)
 *
 * Implements the 5 virtual meeting workflows from Bubble.io:
 * - crkdt5: VM empty, REQUEST (When virtual meeting is empty)
 * - crpWM2: REQUEST ALT (When virtual meeting meeting declined is yes)
 * - crpVt2: RESPOND to VM (When requested by host, no booked date)
 * - cuvLq5: RESPOND to VM (When booked date exists, confirmed)
 * - crkfZ5: Populate & Display respond-request-cancel-vm reusable element
 */

import { supabase } from '../../../lib/supabase.js';

/**
 * Create a new virtual meeting request
 * Implements workflow crkdt5: "B: Request Virtual Meeting new is clicked VM empty, REQUEST"
 *
 * @param {string} proposalId - Proposal ID
 * @param {string} guestId - Guest user ID who is requesting the meeting
 * @returns {Promise<Object>} Created virtual meeting object
 */
export async function requestVirtualMeeting(proposalId, guestId) {
  if (!proposalId || !guestId) {
    throw new Error('Proposal ID and Guest ID are required');
  }

  console.log('[virtualMeetingWorkflow] Requesting virtual meeting for proposal:', proposalId);

  // Generate unique ID for the meeting
  const uniqueId = `VM-${Date.now()}-${proposalId.slice(0, 8)}`;

  const vmData = {
    proposal: proposalId,
    'requested by': guestId,
    'booked date': null,
    'confirmedBySplitLease': false,
    'meeting declined': false,
    'meeting link': null,
    'unique_id': uniqueId,
    'Created Date': new Date().toISOString(),
    'Modified Date': new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('virtualmeetingschedulesandlinks')
    .insert(vmData)
    .select()
    .single();

  if (error) {
    console.error('[virtualMeetingWorkflow] Error requesting virtual meeting:', error);
    throw new Error(`Failed to request virtual meeting: ${error.message}`);
  }

  // Update proposal to link virtual meeting
  await supabase
    .from('proposal')
    .update({
      'virtual meeting': data._id,
      'Modified Date': new Date().toISOString()
    })
    .eq('_id', proposalId);

  console.log('[virtualMeetingWorkflow] Virtual meeting requested:', data._id);
  return data;
}

/**
 * Request alternative meeting after decline
 * Implements workflow crpWM2: "B: Request Virtual Meeting new is clicked REQUEST ALT"
 *
 * @param {string} existingVmId - ID of the declined virtual meeting
 * @param {string} proposalId - Proposal ID
 * @param {string} guestId - Guest user ID
 * @returns {Promise<Object>} New virtual meeting object
 */
export async function requestAlternativeMeeting(existingVmId, proposalId, guestId) {
  if (!existingVmId || !proposalId || !guestId) {
    throw new Error('Existing VM ID, Proposal ID, and Guest ID are required');
  }

  console.log('[virtualMeetingWorkflow] Requesting alternative meeting (previous declined)');

  // Mark old VM as superseded (keep declined flag)
  await supabase
    .from('virtualmeetingschedulesandlinks')
    .update({
      'meeting declined': true,
      'Modified Date': new Date().toISOString()
    })
    .eq('_id', existingVmId);

  // Create new VM request
  return await requestVirtualMeeting(proposalId, guestId);
}

/**
 * Respond to virtual meeting request by booking a date
 * Implements workflow crpVt2: "B: Request Virtual Meeting new is clicked RESPOND to VM"
 *
 * @param {string} vmId - Virtual meeting ID
 * @param {string} bookedDate - ISO timestamp of the booked date
 * @returns {Promise<Object>} Updated virtual meeting object
 */
export async function respondToVirtualMeeting(vmId, bookedDate) {
  if (!vmId || !bookedDate) {
    throw new Error('Virtual meeting ID and booked date are required');
  }

  console.log('[virtualMeetingWorkflow] Responding to virtual meeting:', vmId);

  const { data, error } = await supabase
    .from('virtualmeetingschedulesandlinks')
    .update({
      'booked date': bookedDate,
      'confirmedBySplitLease': false, // Needs admin confirmation after booking
      'Modified Date': new Date().toISOString()
    })
    .eq('_id', vmId)
    .select()
    .single();

  if (error) {
    console.error('[virtualMeetingWorkflow] Error responding to virtual meeting:', error);
    throw new Error(`Failed to respond to virtual meeting: ${error.message}`);
  }

  console.log('[virtualMeetingWorkflow] Virtual meeting date booked:', data._id);
  return data;
}

/**
 * Decline a virtual meeting request
 *
 * @param {string} vmId - Virtual meeting ID
 * @returns {Promise<Object>} Updated virtual meeting object
 */
export async function declineVirtualMeeting(vmId) {
  if (!vmId) {
    throw new Error('Virtual meeting ID is required');
  }

  console.log('[virtualMeetingWorkflow] Declining virtual meeting:', vmId);

  const { data, error } = await supabase
    .from('virtualmeetingschedulesandlinks')
    .update({
      'meeting declined': true,
      'Modified Date': new Date().toISOString()
    })
    .eq('_id', vmId)
    .select()
    .single();

  if (error) {
    console.error('[virtualMeetingWorkflow] Error declining virtual meeting:', error);
    throw new Error(`Failed to decline virtual meeting: ${error.message}`);
  }

  console.log('[virtualMeetingWorkflow] Virtual meeting declined:', data._id);
  return data;
}

/**
 * Cancel a virtual meeting request (guest-initiated cancellation)
 * Different from decline - used when guest wants to retract their own request
 *
 * @param {string} vmId - Virtual meeting ID
 * @returns {Promise<Object>} Updated virtual meeting object
 */
export async function cancelVirtualMeetingRequest(vmId) {
  if (!vmId) {
    throw new Error('Virtual meeting ID is required');
  }

  console.log('[virtualMeetingWorkflow] Cancelling virtual meeting request:', vmId);

  const { data, error } = await supabase
    .from('virtualmeetingschedulesandlinks')
    .update({
      'meeting declined': true,
      'Modified Date': new Date().toISOString()
    })
    .eq('_id', vmId)
    .select()
    .single();

  if (error) {
    console.error('[virtualMeetingWorkflow] Error cancelling virtual meeting:', error);
    throw new Error(`Failed to cancel virtual meeting: ${error.message}`);
  }

  console.log('[virtualMeetingWorkflow] Virtual meeting request cancelled:', data._id);
  return data;
}

/**
 * Fetch virtual meeting by proposal ID
 *
 * @param {string} proposalId - Proposal ID
 * @returns {Promise<Object|null>} Virtual meeting object or null
 */
export async function fetchVirtualMeetingByProposalId(proposalId) {
  if (!proposalId) {
    return null;
  }

  const { data, error } = await supabase
    .from('virtualmeetingschedulesandlinks')
    .select('*')
    .eq('proposal', proposalId)
    .order('"Created Date"', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[virtualMeetingWorkflow] Error fetching virtual meeting:', error);
    return null;
  }

  return data;
}
