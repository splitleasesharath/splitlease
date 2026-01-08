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

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const ERROR_MESSAGES = Object.freeze({
  MISSING_PROPOSAL_GUEST: 'Proposal ID and Guest ID are required',
  MISSING_VM_PROPOSAL_GUEST: 'Existing VM ID, Proposal ID, and Guest ID are required',
  MISSING_VM_DATE: 'Virtual meeting ID and booked date are required',
  MISSING_VM_ID: 'Virtual meeting ID is required',
  REQUEST_FAILED: 'Failed to request virtual meeting',
  RESPOND_FAILED: 'Failed to respond to virtual meeting',
  DECLINE_FAILED: 'Failed to decline virtual meeting',
  CANCEL_FAILED: 'Failed to cancel virtual meeting',
  FETCH_FAILED: 'Error fetching virtual meeting'
})

const DB_FIELD_NAMES = Object.freeze({
  ID: '_id',
  PROPOSAL: 'proposal',
  REQUESTED_BY: 'requested by',
  BOOKED_DATE: 'booked date',
  CONFIRMED: 'confirmedBySplitLease',
  DECLINED: 'meeting declined',
  MEETING_LINK: 'meeting link',
  UNIQUE_ID: 'unique_id',
  CREATED_DATE: 'Created Date',
  MODIFIED_DATE: 'Modified Date',
  VIRTUAL_MEETING: 'virtual meeting'
})

const TABLE_NAMES = Object.freeze({
  VIRTUAL_MEETING: 'virtualmeetingschedulesandlinks',
  PROPOSAL: 'proposal'
})

const VM_PREFIX = 'VM'
const UNIQUE_ID_SLICE_LENGTH = 8

const LOG_PREFIX = '[virtualMeetingWorkflow]'

// ─────────────────────────────────────────────────────────────
// Validation Predicates (Pure Functions)
// ─────────────────────────────────────────────────────────────

/**
 * Check if value is a non-empty string
 * @pure
 */
const isNonEmptyString = (value) =>
  typeof value === 'string' && value.length > 0

/**
 * Check if value is truthy
 * @pure
 */
const isTruthy = (value) => Boolean(value)

// ─────────────────────────────────────────────────────────────
// Pure Data Builders
// ─────────────────────────────────────────────────────────────

/**
 * Generate unique ID for virtual meeting
 * @pure (for given timestamp)
 */
const generateUniqueId = (proposalId, timestamp) =>
  `${VM_PREFIX}-${timestamp}-${proposalId.slice(0, UNIQUE_ID_SLICE_LENGTH)}`

/**
 * Build new virtual meeting data
 * @pure
 */
const buildNewVmData = (proposalId, guestId, timestamp) =>
  Object.freeze({
    [DB_FIELD_NAMES.PROPOSAL]: proposalId,
    [DB_FIELD_NAMES.REQUESTED_BY]: guestId,
    [DB_FIELD_NAMES.BOOKED_DATE]: null,
    [DB_FIELD_NAMES.CONFIRMED]: false,
    [DB_FIELD_NAMES.DECLINED]: false,
    [DB_FIELD_NAMES.MEETING_LINK]: null,
    [DB_FIELD_NAMES.UNIQUE_ID]: generateUniqueId(proposalId, timestamp),
    [DB_FIELD_NAMES.CREATED_DATE]: new Date(timestamp).toISOString(),
    [DB_FIELD_NAMES.MODIFIED_DATE]: new Date(timestamp).toISOString()
  })

/**
 * Build proposal update payload for linking VM
 * @pure
 */
const buildProposalVmLinkPayload = (vmId, timestamp) =>
  Object.freeze({
    [DB_FIELD_NAMES.VIRTUAL_MEETING]: vmId,
    [DB_FIELD_NAMES.MODIFIED_DATE]: timestamp
  })

/**
 * Build VM declined update payload
 * @pure
 */
const buildDeclinedPayload = (timestamp) =>
  Object.freeze({
    [DB_FIELD_NAMES.DECLINED]: true,
    [DB_FIELD_NAMES.MODIFIED_DATE]: timestamp
  })

/**
 * Build VM response (booked date) update payload
 * @pure
 */
const buildRespondPayload = (bookedDate, timestamp) =>
  Object.freeze({
    [DB_FIELD_NAMES.BOOKED_DATE]: bookedDate,
    [DB_FIELD_NAMES.CONFIRMED]: false,
    [DB_FIELD_NAMES.MODIFIED_DATE]: timestamp
  })

// ─────────────────────────────────────────────────────────────
// Execution Functions
// ─────────────────────────────────────────────────────────────

/**
 * Create a new virtual meeting request
 * Implements workflow crkdt5: "B: Request Virtual Meeting new is clicked VM empty, REQUEST"
 *
 * @param {string} proposalId - Proposal ID
 * @param {string} guestId - Guest user ID who is requesting the meeting
 * @returns {Promise<Object>} Created virtual meeting object
 *
 * @throws {Error} If proposalId or guestId is missing
 * @throws {Error} If insert fails
 */
export async function requestVirtualMeeting(proposalId, guestId) {
  if (!isNonEmptyString(proposalId) || !isNonEmptyString(guestId)) {
    throw new Error(ERROR_MESSAGES.MISSING_PROPOSAL_GUEST)
  }

  console.log(`${LOG_PREFIX} Requesting virtual meeting for proposal:`, proposalId)

  const timestamp = Date.now()
  const vmData = buildNewVmData(proposalId, guestId, timestamp)

  const { data, error } = await supabase
    .from(TABLE_NAMES.VIRTUAL_MEETING)
    .insert(vmData)
    .select()
    .single()

  if (error) {
    console.error(`${LOG_PREFIX} Error requesting virtual meeting:`, error)
    throw new Error(`${ERROR_MESSAGES.REQUEST_FAILED}: ${error.message}`)
  }

  // Update proposal to link virtual meeting
  const proposalUpdatePayload = buildProposalVmLinkPayload(data._id, new Date().toISOString())
  await supabase
    .from(TABLE_NAMES.PROPOSAL)
    .update(proposalUpdatePayload)
    .eq(DB_FIELD_NAMES.ID, proposalId)

  console.log(`${LOG_PREFIX} Virtual meeting requested:`, data._id)
  return data
}

/**
 * Request alternative meeting after decline
 * Implements workflow crpWM2: "B: Request Virtual Meeting new is clicked REQUEST ALT"
 *
 * @param {string} existingVmId - ID of the declined virtual meeting
 * @param {string} proposalId - Proposal ID
 * @param {string} guestId - Guest user ID
 * @returns {Promise<Object>} New virtual meeting object
 *
 * @throws {Error} If any required parameter is missing
 */
export async function requestAlternativeMeeting(existingVmId, proposalId, guestId) {
  if (!isNonEmptyString(existingVmId) || !isNonEmptyString(proposalId) || !isNonEmptyString(guestId)) {
    throw new Error(ERROR_MESSAGES.MISSING_VM_PROPOSAL_GUEST)
  }

  console.log(`${LOG_PREFIX} Requesting alternative meeting (previous declined)`)

  // Mark old VM as superseded
  const declinedPayload = buildDeclinedPayload(new Date().toISOString())
  await supabase
    .from(TABLE_NAMES.VIRTUAL_MEETING)
    .update(declinedPayload)
    .eq(DB_FIELD_NAMES.ID, existingVmId)

  // Create new VM request
  return await requestVirtualMeeting(proposalId, guestId)
}

/**
 * Respond to virtual meeting request by booking a date
 * Implements workflow crpVt2: "B: Request Virtual Meeting new is clicked RESPOND to VM"
 *
 * @param {string} vmId - Virtual meeting ID
 * @param {string} bookedDate - ISO timestamp of the booked date
 * @returns {Promise<Object>} Updated virtual meeting object
 *
 * @throws {Error} If vmId or bookedDate is missing
 * @throws {Error} If update fails
 */
export async function respondToVirtualMeeting(vmId, bookedDate) {
  if (!isNonEmptyString(vmId) || !isNonEmptyString(bookedDate)) {
    throw new Error(ERROR_MESSAGES.MISSING_VM_DATE)
  }

  console.log(`${LOG_PREFIX} Responding to virtual meeting:`, vmId)

  const timestamp = new Date().toISOString()
  const updatePayload = buildRespondPayload(bookedDate, timestamp)

  const { data, error } = await supabase
    .from(TABLE_NAMES.VIRTUAL_MEETING)
    .update(updatePayload)
    .eq(DB_FIELD_NAMES.ID, vmId)
    .select()
    .single()

  if (error) {
    console.error(`${LOG_PREFIX} Error responding to virtual meeting:`, error)
    throw new Error(`${ERROR_MESSAGES.RESPOND_FAILED}: ${error.message}`)
  }

  console.log(`${LOG_PREFIX} Virtual meeting date booked:`, data._id)
  return data
}

/**
 * Decline a virtual meeting request
 *
 * @param {string} vmId - Virtual meeting ID
 * @returns {Promise<Object>} Updated virtual meeting object
 *
 * @throws {Error} If vmId is missing
 * @throws {Error} If update fails
 */
export async function declineVirtualMeeting(vmId) {
  if (!isNonEmptyString(vmId)) {
    throw new Error(ERROR_MESSAGES.MISSING_VM_ID)
  }

  console.log(`${LOG_PREFIX} Declining virtual meeting:`, vmId)

  const updatePayload = buildDeclinedPayload(new Date().toISOString())

  const { data, error } = await supabase
    .from(TABLE_NAMES.VIRTUAL_MEETING)
    .update(updatePayload)
    .eq(DB_FIELD_NAMES.ID, vmId)
    .select()
    .single()

  if (error) {
    console.error(`${LOG_PREFIX} Error declining virtual meeting:`, error)
    throw new Error(`${ERROR_MESSAGES.DECLINE_FAILED}: ${error.message}`)
  }

  console.log(`${LOG_PREFIX} Virtual meeting declined:`, data._id)
  return data
}

/**
 * Cancel a virtual meeting request (guest-initiated cancellation)
 * Different from decline - used when guest wants to retract their own request
 *
 * @param {string} vmId - Virtual meeting ID
 * @returns {Promise<Object>} Updated virtual meeting object
 *
 * @throws {Error} If vmId is missing
 * @throws {Error} If update fails
 */
export async function cancelVirtualMeetingRequest(vmId) {
  if (!isNonEmptyString(vmId)) {
    throw new Error(ERROR_MESSAGES.MISSING_VM_ID)
  }

  console.log(`${LOG_PREFIX} Cancelling virtual meeting request:`, vmId)

  const updatePayload = buildDeclinedPayload(new Date().toISOString())

  const { data, error } = await supabase
    .from(TABLE_NAMES.VIRTUAL_MEETING)
    .update(updatePayload)
    .eq(DB_FIELD_NAMES.ID, vmId)
    .select()
    .single()

  if (error) {
    console.error(`${LOG_PREFIX} Error cancelling virtual meeting:`, error)
    throw new Error(`${ERROR_MESSAGES.CANCEL_FAILED}: ${error.message}`)
  }

  console.log(`${LOG_PREFIX} Virtual meeting request cancelled:`, data._id)
  return data
}

/**
 * Fetch virtual meeting by proposal ID
 *
 * @param {string} proposalId - Proposal ID
 * @returns {Promise<Object|null>} Virtual meeting object or null
 */
export async function fetchVirtualMeetingByProposalId(proposalId) {
  if (!isNonEmptyString(proposalId)) {
    return null
  }

  const { data, error } = await supabase
    .from(TABLE_NAMES.VIRTUAL_MEETING)
    .select('*')
    .eq(DB_FIELD_NAMES.PROPOSAL, proposalId)
    .order(`"${DB_FIELD_NAMES.CREATED_DATE}"`, { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error(`${LOG_PREFIX} ${ERROR_MESSAGES.FETCH_FAILED}:`, error)
    return null
  }

  return data
}

// ─────────────────────────────────────────────────────────────
// Exported Constants (for testing)
// ─────────────────────────────────────────────────────────────
export {
  ERROR_MESSAGES,
  DB_FIELD_NAMES,
  TABLE_NAMES,
  VM_PREFIX,
  LOG_PREFIX
}
