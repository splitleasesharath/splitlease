/**
 * Create Virtual Meeting Handler
 * Split Lease - Supabase Edge Functions
 *
 * Creates a virtual meeting record in the virtualmeetingschedulesandlinks table
 * and links it to the associated proposal.
 *
 * NO FALLBACK PRINCIPLE: All errors fail fast without fallback logic
 *
 * FP PATTERN: Separates pure data builders from effectful database operations
 * All data transformations are pure with @pure annotations
 * All database operations are explicit with @effectful annotations
 *
 * @module virtual-meeting/handlers/create
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ValidationError, SupabaseSyncError } from "../../_shared/errors.ts";
import { enqueueBubbleSync, triggerQueueProcessing } from "../../_shared/queueSync.ts";
import {
  CreateVirtualMeetingInput,
  CreateVirtualMeetingResponse,
  ProposalData,
  UserData,
  UserContext,
} from "../lib/types.ts";
import { validateCreateVirtualMeetingInput } from "../lib/validators.ts";

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const LOG_PREFIX = '[virtual-meeting:create]'
const DEFAULT_MEETING_DURATION = 45

// ─────────────────────────────────────────────────────────────
// Pure Data Builders
// ─────────────────────────────────────────────────────────────

/**
 * Get display name from user data
 * @pure
 */
const getUserDisplayName = (userData: UserData): string | null =>
  userData["Name - Full"] || userData["Name - First"] || null

/**
 * Determine if requester is the host
 * @pure
 */
const isRequesterHost = (requestedById: string, hostUserId: string): boolean =>
  requestedById === hostUserId

/**
 * Get request virtual meeting value based on requester role
 * @pure
 */
const getRequestVirtualMeetingValue = (isHost: boolean): 'host' | 'guest' =>
  isHost ? 'host' : 'guest'

/**
 * Build virtual meeting record data
 * @pure
 */
const buildVirtualMeetingData = (
  virtualMeetingId: string,
  input: CreateVirtualMeetingInput,
  proposalData: ProposalData,
  hostUserData: UserData,
  guestUserData: UserData,
  now: string
): Record<string, unknown> =>
  Object.freeze({
    _id: virtualMeetingId,

    // Relationships
    host: hostUserData._id,
    guest: proposalData.Guest,
    proposal: input.proposalId,
    "requested by": input.requestedById,
    "Listing (for Co-Host feature)": proposalData.Listing,

    // Meeting metadata
    "meeting duration": DEFAULT_MEETING_DURATION,
    "suggested dates and times": input.timesSelected,

    // Status fields - all false/null initially
    "booked date": null,
    confirmedBySplitLease: false,
    "meeting declined": false,
    "meeting link": null,
    "end of meeting": null,
    pending: false,

    // Participant info
    "guest email": guestUserData.email,
    "guest name": getUserDisplayName(guestUserData),
    "host email": hostUserData.email,
    "host name": getUserDisplayName(hostUserData),

    // Invitation tracking
    "invitation sent to guest?": false,
    "invitation sent to host?": false,

    // Audit fields
    "Created By": input.requestedById,
    "Created Date": now,
    "Modified Date": now,
  })

/**
 * Build success response
 * @pure
 */
const buildSuccessResponse = (
  virtualMeetingId: string,
  proposalId: string,
  requestedById: string,
  createdAt: string
): CreateVirtualMeetingResponse =>
  Object.freeze({
    virtualMeetingId,
    proposalId,
    requestedById,
    createdAt,
  })

// ─────────────────────────────────────────────────────────────
// Database Query Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Fetch proposal by ID
 * @effectful - Database read operation
 */
const fetchProposal = async (
  supabase: SupabaseClient,
  proposalId: string
): Promise<ProposalData> => {
  const { data: proposal, error } = await supabase
    .from("proposal")
    .select(`_id, Guest, Listing, "Host User"`)
    .eq("_id", proposalId)
    .single();

  if (error || !proposal) {
    console.error(`${LOG_PREFIX} Proposal fetch failed:`, error);
    throw new ValidationError(`Proposal not found: ${proposalId}`);
  }

  return proposal as unknown as ProposalData;
}

/**
 * Fetch user by ID
 * @effectful - Database read operation
 */
const fetchUser = async (
  supabase: SupabaseClient,
  userId: string,
  userType: 'host' | 'guest'
): Promise<UserData> => {
  const { data: user, error } = await supabase
    .from("user")
    .select(`_id, email, "Name - First", "Name - Full"`)
    .eq("_id", userId)
    .single();

  if (error || !user) {
    console.error(`${LOG_PREFIX} ${userType} user fetch failed:`, error);
    throw new ValidationError(`${userType} user not found: ${userId}`);
  }

  return user as unknown as UserData;
}

/**
 * Fetch host user ID from listing
 * @effectful - Database read operation
 */
const fetchHostUserIdFromListing = async (
  supabase: SupabaseClient,
  listingId: string
): Promise<string> => {
  const { data: listing, error } = await supabase
    .from("listing")
    .select(`"Host User"`)
    .eq("_id", listingId)
    .single();

  if (error || !listing) {
    console.error(`${LOG_PREFIX} Listing fetch failed:`, error);
    throw new ValidationError(`Cannot determine host: listing not found ${listingId}`);
  }

  return listing["Host User"];
}

/**
 * Generate unique Bubble-compatible ID
 * @effectful - Database RPC call
 */
const generateBubbleId = async (supabase: SupabaseClient): Promise<string> => {
  const { data: id, error } = await supabase.rpc('generate_bubble_id');

  if (error || !id) {
    console.error(`${LOG_PREFIX} ID generation failed:`, error);
    throw new SupabaseSyncError('Failed to generate virtual meeting ID');
  }

  return id;
}

/**
 * Insert virtual meeting record
 * @effectful - Database write operation
 */
const insertVirtualMeeting = async (
  supabase: SupabaseClient,
  vmData: Record<string, unknown>
): Promise<void> => {
  const { error } = await supabase
    .from("virtualmeetingschedulesandlinks")
    .insert(vmData);

  if (error) {
    console.error(`${LOG_PREFIX} Insert failed:`, error);
    throw new SupabaseSyncError(`Failed to create virtual meeting: ${error.message}`);
  }
}

/**
 * Update proposal with virtual meeting link
 * @effectful - Database write operation
 */
const updateProposalWithVirtualMeeting = async (
  supabase: SupabaseClient,
  proposalId: string,
  virtualMeetingId: string,
  requestValue: 'host' | 'guest',
  now: string
): Promise<void> => {
  const { error } = await supabase
    .from("proposal")
    .update({
      "request virtual meeting": requestValue,
      "virtual meeting": virtualMeetingId,
      "Modified Date": now,
    })
    .eq("_id", proposalId);

  if (error) {
    console.error(`${LOG_PREFIX} Proposal update failed:`, error);
    // Non-blocking - VM was created successfully
  } else {
    console.log(`${LOG_PREFIX} Proposal updated with VM link and request status`);
  }
}

// ─────────────────────────────────────────────────────────────
// Main Handler
// ─────────────────────────────────────────────────────────────

/**
 * Handle create virtual meeting request
 * @effectful - Orchestrates database and sync operations
 *
 * Steps:
 * 1. Validate input (proposalId, timesSelected, requestedById)
 * 2. Fetch proposal to get Guest, Host, Listing relationships
 * 3. Fetch host user data via account_host -> user
 * 4. Fetch guest user data
 * 5. Generate unique _id via generate_bubble_id RPC
 * 6. Insert record into virtualmeetingschedulesandlinks
 * 7. Update proposal.virtual meeting field to link the new VM
 * 8. Enqueue Bubble sync for the created record
 * 9. Return the created VM ID
 */
export async function handleCreate(
  payload: Record<string, unknown>,
  user: UserContext | null,
  supabase: SupabaseClient
): Promise<CreateVirtualMeetingResponse> {
  console.log(`${LOG_PREFIX} Starting create for user: ${user?.email || 'public'}`);

  // ================================================
  // VALIDATION
  // ================================================

  const input = payload as unknown as CreateVirtualMeetingInput;
  validateCreateVirtualMeetingInput(input);

  console.log(`${LOG_PREFIX} Validated input for proposal: ${input.proposalId}`);

  // ================================================
  // FETCH RELATED DATA
  // ================================================

  const proposalData = await fetchProposal(supabase, input.proposalId);
  console.log(`${LOG_PREFIX} Found proposal, guest: ${proposalData.Guest}, listing: ${proposalData.Listing}, hostUser: ${proposalData["Host User"]}`);

  // Fetch Host User - try proposal's "Host User" first, fallback to listing's "Host User"
  let hostUserId = proposalData["Host User"];

  if (!hostUserId && proposalData.Listing) {
    console.log(`${LOG_PREFIX} Proposal has no Host User, fetching from listing: ${proposalData.Listing}`);
    hostUserId = await fetchHostUserIdFromListing(supabase, proposalData.Listing);
    console.log(`${LOG_PREFIX} Got host from listing: ${hostUserId}`);
  }

  if (!hostUserId) {
    throw new ValidationError(`Cannot determine host user for proposal ${input.proposalId}`);
  }

  const hostUserData = await fetchUser(supabase, hostUserId, 'host');
  console.log(`${LOG_PREFIX} Found host user: ${hostUserData.email}`);

  const guestUserData = await fetchUser(supabase, proposalData.Guest, 'guest');
  console.log(`${LOG_PREFIX} Found guest user: ${guestUserData.email}`);

  // ================================================
  // GENERATE ID
  // ================================================

  const virtualMeetingId = await generateBubbleId(supabase);
  console.log(`${LOG_PREFIX} Generated VM ID: ${virtualMeetingId}`);

  // ================================================
  // CREATE VIRTUAL MEETING RECORD
  // ================================================

  const now = new Date().toISOString();

  const vmData = buildVirtualMeetingData(
    virtualMeetingId,
    input,
    proposalData,
    hostUserData,
    guestUserData,
    now
  );

  console.log(`${LOG_PREFIX} Inserting virtual meeting: ${virtualMeetingId}`);
  await insertVirtualMeeting(supabase, vmData);
  console.log(`${LOG_PREFIX} Virtual meeting created successfully`);

  // ================================================
  // UPDATE PROPOSAL WITH VIRTUAL MEETING LINK
  // ================================================

  const requesterIsHostFlag = isRequesterHost(input.requestedById, hostUserData._id);
  const requestVirtualMeetingValue = getRequestVirtualMeetingValue(requesterIsHostFlag);

  console.log(`${LOG_PREFIX} Requester: ${input.requestedById}, Host: ${hostUserData._id}, Value: ${requestVirtualMeetingValue}`);

  await updateProposalWithVirtualMeeting(
    supabase,
    input.proposalId,
    virtualMeetingId,
    requestVirtualMeetingValue,
    now
  );

  // ================================================
  // ENQUEUE BUBBLE SYNC
  // ================================================

  try {
    await enqueueBubbleSync(supabase, {
      correlationId: virtualMeetingId,
      items: [
        {
          sequence: 1,
          table: 'virtualmeetingschedulesandlinks',
          recordId: virtualMeetingId,
          operation: 'INSERT',
          payload: vmData,
        },
      ],
    });

    console.log(`${LOG_PREFIX} Bubble sync enqueued (correlation: ${virtualMeetingId})`);

    // Trigger queue processing (fire and forget)
    triggerQueueProcessing();

  } catch (syncError) {
    // Log but don't fail - items can be manually requeued if needed
    console.error(`${LOG_PREFIX} Failed to enqueue Bubble sync (non-blocking):`, syncError);
  }

  // ================================================
  // RETURN RESPONSE
  // ================================================

  console.log(`${LOG_PREFIX} Complete, returning response`);

  return buildSuccessResponse(
    virtualMeetingId,
    input.proposalId,
    input.requestedById,
    now
  );
}

// ─────────────────────────────────────────────────────────────
// Exported Test Constants
// ─────────────────────────────────────────────────────────────

/**
 * Exported for testing purposes
 * @test
 */
export const __test__ = Object.freeze({
  // Constants
  LOG_PREFIX,
  DEFAULT_MEETING_DURATION,

  // Pure Data Builders
  getUserDisplayName,
  isRequesterHost,
  getRequestVirtualMeetingValue,
  buildVirtualMeetingData,
  buildSuccessResponse,

  // Database Query Helpers
  fetchProposal,
  fetchUser,
  fetchHostUserIdFromListing,
  generateBubbleId,
  insertVirtualMeeting,
  updateProposalWithVirtualMeeting,

  // Main Handler
  handleCreate,
})
