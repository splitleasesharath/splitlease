/**
 * Decline Virtual Meeting Handler
 * Split Lease - Supabase Edge Functions
 *
 * Marks the virtual meeting as declined without deleting it.
 * The meeting record remains for history/audit purposes.
 *
 * Steps:
 * 1. Validate input
 * 2. Fetch proposal to get virtual meeting ID
 * 3. Update virtual meeting: set meeting declined = true
 * 4. Update proposal: clear request_virtual_meeting
 * 5. Enqueue Bubble sync for UPDATE operation
 * 6. Return response
 *
 * NO FALLBACK PRINCIPLE: All errors fail fast without fallback logic
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ValidationError, SupabaseSyncError } from "../../_shared/errors.ts";
import { enqueueBubbleSync, triggerQueueProcessing } from "../../_shared/queueSync.ts";
import {
  DeclineVirtualMeetingInput,
  DeclineVirtualMeetingResponse,
  UserContext,
} from "../lib/types.ts";
import { validateDeclineVirtualMeetingInput } from "../lib/validators.ts";

/**
 * Handle decline virtual meeting request
 */
export async function handleDecline(
  payload: Record<string, unknown>,
  user: UserContext | null,
  supabase: SupabaseClient
): Promise<DeclineVirtualMeetingResponse> {
  console.log(`[virtual-meeting:decline] Starting decline for user: ${user?.email || 'public'}`);

  // ================================================
  // VALIDATION
  // ================================================

  const input = payload as unknown as DeclineVirtualMeetingInput;
  validateDeclineVirtualMeetingInput(input);

  console.log(`[virtual-meeting:decline] Validated input for proposal: ${input.proposalId}`);

  // ================================================
  // FETCH PROPOSAL TO GET VIRTUAL MEETING ID
  // ================================================

  const { data: proposal, error: proposalError } = await supabase
    .from("proposal")
    .select(`_id, "virtual meeting"`)
    .eq("_id", input.proposalId)
    .single();

  if (proposalError || !proposal) {
    console.error(`[virtual-meeting:decline] Proposal fetch failed:`, proposalError);
    throw new ValidationError(`Proposal not found: ${input.proposalId}`);
  }

  const virtualMeetingId = proposal["virtual meeting"];
  if (!virtualMeetingId) {
    throw new ValidationError(`No virtual meeting associated with proposal: ${input.proposalId}`);
  }

  console.log(`[virtual-meeting:decline] Found virtual meeting: ${virtualMeetingId}`);

  // ================================================
  // VERIFY VIRTUAL MEETING EXISTS
  // ================================================

  const { data: existingVM, error: vmFetchError } = await supabase
    .from("virtualmeetingschedulesandlinks")
    .select("_id, \"meeting declined\"")
    .eq("_id", virtualMeetingId)
    .single();

  if (vmFetchError || !existingVM) {
    console.error(`[virtual-meeting:decline] VM not found:`, vmFetchError);
    throw new ValidationError(`Virtual meeting not found: ${virtualMeetingId}`);
  }

  // Check if already declined
  if (existingVM["meeting declined"]) {
    console.log(`[virtual-meeting:decline] VM already declined, returning success`);
    return {
      success: true,
      proposalId: input.proposalId,
      declinedAt: new Date().toISOString(),
    };
  }

  // ================================================
  // UPDATE VIRTUAL MEETING
  // ================================================

  const now = new Date().toISOString();

  const vmUpdateData = {
    "meeting declined": true,
    "Modified Date": now,
  };

  const { error: vmUpdateError } = await supabase
    .from("virtualmeetingschedulesandlinks")
    .update(vmUpdateData)
    .eq("_id", virtualMeetingId);

  if (vmUpdateError) {
    console.error(`[virtual-meeting:decline] VM update failed:`, vmUpdateError);
    throw new SupabaseSyncError(`Failed to update virtual meeting: ${vmUpdateError.message}`);
  }

  console.log(`[virtual-meeting:decline] Virtual meeting marked as declined`);

  // ================================================
  // UPDATE PROPOSAL
  // ================================================

  const { error: proposalUpdateError } = await supabase
    .from("proposal")
    .update({
      "request virtual meeting": null,
      "Modified Date": now,
    })
    .eq("_id", input.proposalId);

  if (proposalUpdateError) {
    console.error(`[virtual-meeting:decline] Proposal update failed:`, proposalUpdateError);
    // Non-blocking - VM was updated successfully
  } else {
    console.log(`[virtual-meeting:decline] Proposal updated - cleared virtual meeting request`);
  }

  // ================================================
  // ENQUEUE BUBBLE SYNC
  // ================================================

  try {
    await enqueueBubbleSync(supabase, {
      correlationId: `decline-vm:${virtualMeetingId}`,
      items: [
        {
          sequence: 1,
          table: 'virtualmeetingschedulesandlinks',
          recordId: virtualMeetingId,
          operation: 'UPDATE',
          bubbleId: virtualMeetingId,
          payload: {
            _id: virtualMeetingId,
            "meeting declined": true,
            "Modified Date": now,
          },
        },
      ],
    });

    console.log(`[virtual-meeting:decline] Bubble sync enqueued (correlation: decline-vm:${virtualMeetingId})`);

    // Trigger queue processing (fire and forget)
    triggerQueueProcessing();

  } catch (syncError) {
    // Log but don't fail - items can be manually requeued if needed
    console.error(`[virtual-meeting:decline] Failed to enqueue Bubble sync (non-blocking):`, syncError);
  }

  // ================================================
  // RETURN RESPONSE
  // ================================================

  console.log(`[virtual-meeting:decline] Complete, returning response`);

  return {
    success: true,
    proposalId: input.proposalId,
    declinedAt: now,
  };
}
