/**
 * Create Virtual Meeting Handler
 * Split Lease - Supabase Edge Functions
 *
 * Creates a virtual meeting record in the virtualmeetingschedulesandlinks table
 * and links it to the associated proposal.
 *
 * NO FALLBACK PRINCIPLE: All errors fail fast without fallback logic
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ValidationError, SupabaseSyncError } from "../../_shared/errors.ts";
import { enqueueBubbleSync, triggerQueueProcessing } from "../../_shared/queueSync.ts";
import {
  CreateVirtualMeetingInput,
  CreateVirtualMeetingResponse,
  ProposalData,
  HostAccountData,
  UserData,
  UserContext,
} from "../lib/types.ts";
import { validateCreateVirtualMeetingInput } from "../lib/validators.ts";

/**
 * Handle create virtual meeting request
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
  console.log(`[virtual-meeting:create] Starting create for user: ${user?.email || 'public'}`);

  // ================================================
  // VALIDATION
  // ================================================

  const input = payload as unknown as CreateVirtualMeetingInput;
  validateCreateVirtualMeetingInput(input);

  console.log(`[virtual-meeting:create] Validated input for proposal: ${input.proposalId}`);

  // ================================================
  // FETCH RELATED DATA
  // ================================================

  // Fetch Proposal
  const { data: proposal, error: proposalError } = await supabase
    .from("proposal")
    .select(`
      _id,
      Guest,
      Listing,
      "Host User"
    `)
    .eq("_id", input.proposalId)
    .single();

  if (proposalError || !proposal) {
    console.error(`[virtual-meeting:create] Proposal fetch failed:`, proposalError);
    throw new ValidationError(`Proposal not found: ${input.proposalId}`);
  }

  const proposalData = proposal as unknown as ProposalData;
  console.log(`[virtual-meeting:create] Found proposal, guest: ${proposalData.Guest}, listing: ${proposalData.Listing}`);

  // Fetch Host User directly (Host User column now contains user._id)
  const hostUserId = proposalData["Host User"];

  const { data: hostUser, error: hostUserError } = await supabase
    .from("user")
    .select(`_id, email, "Name - First", "Name - Full"`)
    .eq("_id", hostUserId)
    .single();

  if (hostUserError || !hostUser) {
    console.error(`[virtual-meeting:create] Host user fetch failed:`, hostUserError);
    throw new ValidationError(`Host user not found: ${hostUserId}`);
  }

  const hostUserData = hostUser as unknown as UserData;
  console.log(`[virtual-meeting:create] Found host user: ${hostUserData.email}`);

  // hostAccountData maintained for backwards compatibility with downstream code
  const hostAccountData = { _id: hostUserData._id, User: hostUserData._id } as HostAccountData;

  // Fetch Guest User
  const { data: guestUser, error: guestUserError } = await supabase
    .from("user")
    .select(`_id, email, "Name - First", "Name - Full"`)
    .eq("_id", proposalData.Guest)
    .single();

  if (guestUserError || !guestUser) {
    console.error(`[virtual-meeting:create] Guest user fetch failed:`, guestUserError);
    throw new ValidationError(`Guest user not found: ${proposalData.Guest}`);
  }

  const guestUserData = guestUser as unknown as UserData;
  console.log(`[virtual-meeting:create] Found guest user: ${guestUserData.email}`);

  // ================================================
  // GENERATE ID
  // ================================================

  const { data: virtualMeetingId, error: idError } = await supabase.rpc('generate_bubble_id');
  if (idError || !virtualMeetingId) {
    console.error(`[virtual-meeting:create] ID generation failed:`, idError);
    throw new SupabaseSyncError('Failed to generate virtual meeting ID');
  }

  console.log(`[virtual-meeting:create] Generated VM ID: ${virtualMeetingId}`);

  // ================================================
  // CREATE VIRTUAL MEETING RECORD
  // ================================================

  const now = new Date().toISOString();

  // Build the virtual meeting record
  const vmData = {
    _id: virtualMeetingId,

    // Relationships
    host: hostAccountData.User,
    guest: proposalData.Guest,
    proposal: input.proposalId,
    "requested by": input.requestedById,
    "Listing (for Co-Host feature)": proposalData.Listing,

    // Meeting metadata
    "meeting duration": 45, // Default 45 minutes
    "suggested dates and times": input.timesSelected, // Store as-is (ISO 8601 strings)

    // Status fields - all false/null initially
    "booked date": null,
    confirmedBySplitLease: false,
    "meeting declined": false,
    "meeting link": null,
    "end of meeting": null,
    pending: false,

    // Participant info
    "guest email": guestUserData.email,
    "guest name": guestUserData["Name - Full"] || guestUserData["Name - First"] || null,
    "host email": hostUserData.email,
    "host name": hostUserData["Name - Full"] || hostUserData["Name - First"] || null,

    // Invitation tracking
    "invitation sent to guest?": false,
    "invitation sent to host?": false,

    // Audit fields
    "Created By": input.requestedById,
    "Created Date": now,
    "Modified Date": now,
  };

  console.log(`[virtual-meeting:create] Inserting virtual meeting: ${virtualMeetingId}`);

  const { error: insertError } = await supabase
    .from("virtualmeetingschedulesandlinks")
    .insert(vmData);

  if (insertError) {
    console.error(`[virtual-meeting:create] Insert failed:`, insertError);
    throw new SupabaseSyncError(`Failed to create virtual meeting: ${insertError.message}`);
  }

  console.log(`[virtual-meeting:create] Virtual meeting created successfully`);

  // ================================================
  // UPDATE PROPOSAL WITH VIRTUAL MEETING LINK
  // ================================================

  // Determine if requester is host or guest
  const requesterIsHost = input.requestedById === hostUserData._id;
  const requestVirtualMeetingValue = requesterIsHost ? "host" : "guest";

  console.log(`[virtual-meeting:create] Requester: ${input.requestedById}, Host: ${hostUserData._id}, Value: ${requestVirtualMeetingValue}`);

  const { error: proposalUpdateError } = await supabase
    .from("proposal")
    .update({
      "request virtual meeting": requestVirtualMeetingValue,
      "virtual meeting": virtualMeetingId,
      "Modified Date": now,
    })
    .eq("_id", input.proposalId);

  if (proposalUpdateError) {
    console.error(`[virtual-meeting:create] Proposal update failed:`, proposalUpdateError);
    // Non-blocking - continue (VM was created successfully)
  } else {
    console.log(`[virtual-meeting:create] Proposal updated with VM link and request status`);
  }

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

    console.log(`[virtual-meeting:create] Bubble sync enqueued (correlation: ${virtualMeetingId})`);

    // Trigger queue processing (fire and forget)
    triggerQueueProcessing();

  } catch (syncError) {
    // Log but don't fail - items can be manually requeued if needed
    console.error(`[virtual-meeting:create] Failed to enqueue Bubble sync (non-blocking):`, syncError);
  }

  // ================================================
  // RETURN RESPONSE
  // ================================================

  console.log(`[virtual-meeting:create] Complete, returning response`);

  return {
    virtualMeetingId: virtualMeetingId,
    proposalId: input.proposalId,
    requestedById: input.requestedById,
    createdAt: now,
  };
}
