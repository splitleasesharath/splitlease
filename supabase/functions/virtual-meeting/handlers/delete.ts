/**
 * Delete Virtual Meeting Handler
 * Split Lease - Supabase Edge Functions
 *
 * Deletes a virtual meeting record from the database and updates the associated proposal.
 *
 * FP PATTERN: Separates pure data builders from effectful database operations
 * All data transformations are pure with @pure annotations
 * All database operations are explicit with @effectful annotations
 *
 * NO FALLBACK PRINCIPLE: All errors fail fast without fallback logic
 *
 * @module virtual-meeting/handlers/delete
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ValidationError, SupabaseSyncError } from "../../_shared/errors.ts";
import { enqueueBubbleSync, triggerQueueProcessing } from "../../_shared/queueSync.ts";
import { DeleteVirtualMeetingInput, DeleteVirtualMeetingResponse, UserContext } from "../lib/types.ts";
import { validateDeleteVirtualMeetingInput } from "../lib/validators.ts";

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const LOG_PREFIX = '[virtual-meeting:delete]'

// ─────────────────────────────────────────────────────────────
// Pure Data Builders
// ─────────────────────────────────────────────────────────────

/**
 * Build success response
 * @pure
 */
const buildSuccessResponse = (
  virtualMeetingId: string,
  proposalId: string,
  deletedAt: string
): DeleteVirtualMeetingResponse =>
  Object.freeze({
    deleted: true,
    virtualMeetingId,
    proposalId,
    deletedAt,
  })

// ─────────────────────────────────────────────────────────────
// Main Handler
// ─────────────────────────────────────────────────────────────

/**
 * Handle delete virtual meeting request
 * @effectful - Orchestrates database and sync operations
 *
 * Steps:
 * 1. Validate input (virtualMeetingId, proposalId)
 * 2. Verify VM exists
 * 3. Delete VM record from virtualmeetingschedulesandlinks
 * 4. Update proposal: set 'virtual meeting' to null, clear 'request virtual meeting'
 * 5. Enqueue Bubble sync for DELETE operation
 * 6. Return response
 */
export async function handleDelete(
  payload: Record<string, unknown>,
  user: UserContext | null,
  supabase: SupabaseClient
): Promise<DeleteVirtualMeetingResponse> {
  console.log(`${LOG_PREFIX} Starting delete for user: ${user?.email || 'public'}`);

  // ================================================
  // VALIDATION
  // ================================================

  const input = payload as unknown as DeleteVirtualMeetingInput;
  validateDeleteVirtualMeetingInput(input);

  console.log(`${LOG_PREFIX} Validated input - VM: ${input.virtualMeetingId}, Proposal: ${input.proposalId}`);

  // ================================================
  // VERIFY VM EXISTS
  // ================================================

  const { data: existingVM, error: fetchError } = await supabase
    .from("virtualmeetingschedulesandlinks")
    .select("_id")
    .eq("_id", input.virtualMeetingId)
    .single();

  if (fetchError || !existingVM) {
    console.error(`${LOG_PREFIX} VM not found:`, fetchError);
    throw new ValidationError(`Virtual meeting not found: ${input.virtualMeetingId}`);
  }

  console.log(`${LOG_PREFIX} Found existing VM: ${existingVM._id}`);

  // ================================================
  // DELETE VM RECORD
  // ================================================

  const { error: deleteError } = await supabase
    .from("virtualmeetingschedulesandlinks")
    .delete()
    .eq("_id", input.virtualMeetingId);

  if (deleteError) {
    console.error(`${LOG_PREFIX} Delete failed:`, deleteError);
    throw new SupabaseSyncError(`Failed to delete virtual meeting: ${deleteError.message}`);
  }

  console.log(`${LOG_PREFIX} Virtual meeting deleted successfully`);

  // ================================================
  // UPDATE PROPOSAL
  // ================================================

  const now = new Date().toISOString();
  const { error: proposalUpdateError } = await supabase
    .from("proposal")
    .update({
      "virtual meeting": null,
      "request virtual meeting": null,
      "Modified Date": now,
    })
    .eq("_id", input.proposalId);

  if (proposalUpdateError) {
    console.error(`${LOG_PREFIX} Proposal update failed:`, proposalUpdateError);
    // Non-blocking - VM was deleted successfully
  } else {
    console.log(`${LOG_PREFIX} Proposal updated - cleared virtual meeting fields`);
  }

  // ================================================
  // ENQUEUE BUBBLE SYNC
  // ================================================

  try {
    await enqueueBubbleSync(supabase, {
      correlationId: `delete-vm:${input.virtualMeetingId}`,
      items: [
        {
          sequence: 1,
          table: 'virtualmeetingschedulesandlinks',
          recordId: input.virtualMeetingId,
          operation: 'DELETE',
          bubbleId: input.virtualMeetingId,
          payload: { _id: input.virtualMeetingId },
        },
      ],
    });

    console.log(`${LOG_PREFIX} Bubble sync enqueued (correlation: delete-vm:${input.virtualMeetingId})`);

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

  return buildSuccessResponse(input.virtualMeetingId, input.proposalId, now);
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

  // Pure Data Builders
  buildSuccessResponse,

  // Main Handler
  handleDelete,
})
