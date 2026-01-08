/**
 * Accept Virtual Meeting Handler
 * Split Lease - Supabase Edge Functions
 *
 * Updates the virtual meeting record with the selected booked date.
 * This confirms the meeting and sets the scheduled time.
 *
 * FP PATTERN: Separates pure data builders from effectful database operations
 * All data transformations are pure with @pure annotations
 * All database operations are explicit with @effectful annotations
 *
 * NO FALLBACK PRINCIPLE: All errors fail fast without fallback logic
 *
 * @module virtual-meeting/handlers/accept
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

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const LOG_PREFIX = '[virtual-meeting:accept]'

// ─────────────────────────────────────────────────────────────
// Pure Data Builders
// ─────────────────────────────────────────────────────────────

/**
 * Build VM update data
 * @pure
 */
const buildVmUpdateData = (bookedDate: string, now: string): Record<string, unknown> =>
  Object.freeze({
    "booked date": bookedDate,
    "confirmedBySplitLease": true,
    "pending": false,
    "Modified Date": now,
  })

/**
 * Build success response
 * @pure
 */
const buildSuccessResponse = (
  virtualMeetingId: string,
  proposalId: string,
  bookedDate: string,
  updatedAt: string
): AcceptVirtualMeetingResponse =>
  Object.freeze({
    success: true,
    virtualMeetingId,
    proposalId,
    bookedDate,
    updatedAt,
  })

// ─────────────────────────────────────────────────────────────
// Validation Predicates
// ─────────────────────────────────────────────────────────────

/**
 * Check if meeting is already declined
 * @pure
 */
const isMeetingDeclined = (vm: { 'meeting declined': boolean }): boolean =>
  vm['meeting declined'] === true

/**
 * Check if meeting already has a booked date
 * @pure
 */
const hasBookedDate = (vm: { 'booked date': string | null }): boolean =>
  vm['booked date'] !== null

// ─────────────────────────────────────────────────────────────
// Main Handler
// ─────────────────────────────────────────────────────────────

/**
 * Handle accept virtual meeting request
 * @effectful - Orchestrates database and sync operations
 */
export async function handleAccept(
  payload: Record<string, unknown>,
  user: UserContext | null,
  supabase: SupabaseClient
): Promise<AcceptVirtualMeetingResponse> {
  console.log(`${LOG_PREFIX} Starting accept for user: ${user?.email || 'public'}`);

  // ================================================
  // VALIDATION
  // ================================================

  const input = payload as unknown as AcceptVirtualMeetingInput;
  validateAcceptVirtualMeetingInput(input);

  console.log(`${LOG_PREFIX} Validated input for proposal: ${input.proposalId}`);

  // ================================================
  // FETCH PROPOSAL TO GET VIRTUAL MEETING ID
  // ================================================

  const { data: proposal, error: proposalError } = await supabase
    .from("proposal")
    .select(`_id, "virtual meeting"`)
    .eq("_id", input.proposalId)
    .single();

  if (proposalError || !proposal) {
    console.error(`${LOG_PREFIX} Proposal fetch failed:`, proposalError);
    throw new ValidationError(`Proposal not found: ${input.proposalId}`);
  }

  const virtualMeetingId = proposal["virtual meeting"];
  if (!virtualMeetingId) {
    throw new ValidationError(`No virtual meeting associated with proposal: ${input.proposalId}`);
  }

  console.log(`${LOG_PREFIX} Found virtual meeting: ${virtualMeetingId}`);

  // ================================================
  // VERIFY VIRTUAL MEETING EXISTS
  // ================================================

  const { data: existingVM, error: vmFetchError } = await supabase
    .from("virtualmeetingschedulesandlinks")
    .select("_id, \"meeting declined\", \"booked date\"")
    .eq("_id", virtualMeetingId)
    .single();

  if (vmFetchError || !existingVM) {
    console.error(`${LOG_PREFIX} VM not found:`, vmFetchError);
    throw new ValidationError(`Virtual meeting not found: ${virtualMeetingId}`);
  }

  // Check if already declined
  if (isMeetingDeclined(existingVM)) {
    throw new ValidationError(`Virtual meeting has already been declined`);
  }

  // Check if already booked
  if (hasBookedDate(existingVM)) {
    throw new ValidationError(`Virtual meeting already has a booked date`);
  }

  // ================================================
  // UPDATE VIRTUAL MEETING
  // ================================================

  const now = new Date().toISOString();
  const vmUpdateData = buildVmUpdateData(input.bookedDate, now);

  const { error: vmUpdateError } = await supabase
    .from("virtualmeetingschedulesandlinks")
    .update(vmUpdateData)
    .eq("_id", virtualMeetingId);

  if (vmUpdateError) {
    console.error(`${LOG_PREFIX} VM update failed:`, vmUpdateError);
    throw new SupabaseSyncError(`Failed to update virtual meeting: ${vmUpdateError.message}`);
  }

  console.log(`${LOG_PREFIX} Virtual meeting updated with booked date: ${input.bookedDate}`);

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
    console.error(`${LOG_PREFIX} Proposal update failed:`, proposalUpdateError);
    // Non-blocking - VM was updated successfully
  } else {
    console.log(`${LOG_PREFIX} Proposal updated with confirmed status`);
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

    console.log(`${LOG_PREFIX} Bubble sync enqueued (correlation: accept-vm:${virtualMeetingId})`);

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
    input.bookedDate,
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

  // Pure Data Builders
  buildVmUpdateData,
  buildSuccessResponse,

  // Validation Predicates
  isMeetingDeclined,
  hasBookedDate,

  // Main Handler
  handleAccept,
})
