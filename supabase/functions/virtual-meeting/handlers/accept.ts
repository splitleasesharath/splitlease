/**
 * Accept Virtual Meeting Handler
 * Split Lease - Supabase Edge Functions
 *
 * Updates the virtual meeting record with the selected booked date.
 * This confirms the meeting and sets the scheduled time.
 *
 * Steps:
 * 1. Validate input
 * 2. Fetch proposal to get virtual meeting ID
 * 3. Update virtual meeting: set booked date, confirm status
 * 4. Update proposal: set request_virtual_meeting status
 * 5. Enqueue Bubble sync for UPDATE operation
 * 6. Return response
 *
 * NO FALLBACK PRINCIPLE: All errors fail fast without fallback logic
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ValidationError, SupabaseSyncError } from "../../_shared/errors.ts";
import { enqueueBubbleSync, triggerQueueProcessing } from "../../_shared/queueSync.ts";
import {
  AcceptVirtualMeetingInput,
  AcceptVirtualMeetingResponse,
  UserContext,
} from "../lib/types.ts";
import { validateAcceptVirtualMeetingInput } from "../lib/validators.ts";

/**
 * Handle accept virtual meeting request
 */
export async function handleAccept(
  payload: Record<string, unknown>,
  user: UserContext | null,
  supabase: SupabaseClient
): Promise<AcceptVirtualMeetingResponse> {
  console.log(`[virtual-meeting:accept] Starting accept for user: ${user?.email || 'public'}`);

  // ================================================
  // VALIDATION
  // ================================================

  const input = payload as unknown as AcceptVirtualMeetingInput;
  validateAcceptVirtualMeetingInput(input);

  console.log(`[virtual-meeting:accept] Validated input for proposal: ${input.proposalId}`);

  // ================================================
  // FETCH PROPOSAL TO GET VIRTUAL MEETING ID
  // ================================================

  const { data: proposal, error: proposalError } = await supabase
    .from("proposal")
    .select(`_id, "virtual meeting"`)
    .eq("_id", input.proposalId)
    .single();

  if (proposalError || !proposal) {
    console.error(`[virtual-meeting:accept] Proposal fetch failed:`, proposalError);
    throw new ValidationError(`Proposal not found: ${input.proposalId}`);
  }

  const virtualMeetingId = proposal["virtual meeting"];
  if (!virtualMeetingId) {
    throw new ValidationError(`No virtual meeting associated with proposal: ${input.proposalId}`);
  }

  console.log(`[virtual-meeting:accept] Found virtual meeting: ${virtualMeetingId}`);

  // ================================================
  // VERIFY VIRTUAL MEETING EXISTS
  // ================================================

  const { data: existingVM, error: vmFetchError } = await supabase
    .from("virtualmeetingschedulesandlinks")
    .select("_id, \"meeting declined\", \"booked date\"")
    .eq("_id", virtualMeetingId)
    .single();

  if (vmFetchError || !existingVM) {
    console.error(`[virtual-meeting:accept] VM not found:`, vmFetchError);
    throw new ValidationError(`Virtual meeting not found: ${virtualMeetingId}`);
  }

  // Check if already declined
  if (existingVM["meeting declined"]) {
    throw new ValidationError(`Virtual meeting has already been declined`);
  }

  // Check if already booked
  if (existingVM["booked date"]) {
    throw new ValidationError(`Virtual meeting already has a booked date`);
  }

  // ================================================
  // UPDATE VIRTUAL MEETING
  // ================================================

  const now = new Date().toISOString();

  const vmUpdateData = {
    "booked date": input.bookedDate,
    "confirmedBySplitLease": true,
    "pending": false,
    "Modified Date": now,
  };

  const { error: vmUpdateError } = await supabase
    .from("virtualmeetingschedulesandlinks")
    .update(vmUpdateData)
    .eq("_id", virtualMeetingId);

  if (vmUpdateError) {
    console.error(`[virtual-meeting:accept] VM update failed:`, vmUpdateError);
    throw new SupabaseSyncError(`Failed to update virtual meeting: ${vmUpdateError.message}`);
  }

  console.log(`[virtual-meeting:accept] Virtual meeting updated with booked date: ${input.bookedDate}`);

  // ================================================
  // UPDATE PROPOSAL
  // ================================================

  const { error: proposalUpdateError } = await supabase
    .from("proposal")
    .update({
      "request virtual meeting": "confirmed",
      "Modified Date": now,
    })
    .eq("_id", input.proposalId);

  if (proposalUpdateError) {
    console.error(`[virtual-meeting:accept] Proposal update failed:`, proposalUpdateError);
    // Non-blocking - VM was updated successfully
  } else {
    console.log(`[virtual-meeting:accept] Proposal updated with confirmed status`);
  }

  // ================================================
  // ENQUEUE BUBBLE SYNC
  // ================================================

  try {
    await enqueueBubbleSync(supabase, {
      correlationId: `accept-vm:${virtualMeetingId}`,
      items: [
        {
          sequence: 1,
          table: 'virtualmeetingschedulesandlinks',
          recordId: virtualMeetingId,
          operation: 'UPDATE',
          bubbleId: virtualMeetingId,
          payload: {
            _id: virtualMeetingId,
            "booked date": input.bookedDate,
            "confirmedBySplitLease": true,
            "Modified Date": now,
          },
        },
      ],
    });

    console.log(`[virtual-meeting:accept] Bubble sync enqueued (correlation: accept-vm:${virtualMeetingId})`);

    // Trigger queue processing (fire and forget)
    triggerQueueProcessing();

  } catch (syncError) {
    // Log but don't fail - items can be manually requeued if needed
    console.error(`[virtual-meeting:accept] Failed to enqueue Bubble sync (non-blocking):`, syncError);
  }

  // ================================================
  // RETURN RESPONSE
  // ================================================

  console.log(`[virtual-meeting:accept] Complete, returning response`);

  return {
    success: true,
    virtualMeetingId: virtualMeetingId,
    proposalId: input.proposalId,
    bookedDate: input.bookedDate,
    updatedAt: now,
  };
}
