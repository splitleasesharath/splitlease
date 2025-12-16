/**
 * Update Proposal Action
 * Split Lease - Supabase Edge Functions
 *
 * Handles proposal updates including:
 * - Field updates (pricing, dates, days/nights)
 * - Status transitions
 * - Host counteroffers
 * - Cancellations
 *
 * NO FALLBACK PRINCIPLE: All errors fail fast without fallback logic
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  ValidationError,
  SupabaseSyncError,
  AuthenticationError,
} from "../../_shared/errors.ts";
import { parseJsonArray } from "../../_shared/jsonUtils.ts";
import { enqueueBubbleSync, triggerQueueProcessing, filterBubbleIncompatibleFields } from "../../_shared/queueSync.ts";
import {
  UpdateProposalInput,
  UpdateProposalResponse,
  ProposalData,
  UserContext,
  ProposalStatusName,
} from "../lib/types.ts";
import { validateUpdateProposalInput, hasUpdateFields } from "../lib/validators.ts";
import { calculateComplementaryNights } from "../lib/calculations.ts";
import {
  isValidStatusTransition,
  isTerminalStatus,
  createStatusHistoryEntry,
  isValidStatus,
} from "../lib/status.ts";

/**
 * Handle update proposal request
 */
export async function handleUpdate(
  payload: Record<string, unknown>,
  user: UserContext,
  supabase: SupabaseClient
): Promise<UpdateProposalResponse> {
  console.log(`[proposal:update] Starting update for user: ${user.email}`);

  // ================================================
  // VALIDATION
  // ================================================

  const input = payload as unknown as UpdateProposalInput;
  validateUpdateProposalInput(input);

  if (!hasUpdateFields(input)) {
    throw new ValidationError("No valid fields to update");
  }

  console.log(`[proposal:update] Validated input for proposal: ${input.proposal_id}`);

  // ================================================
  // FETCH EXISTING PROPOSAL
  // ================================================

  const { data: proposal, error: fetchError } = await supabase
    .from("proposal")
    .select("*")
    .eq("_id", input.proposal_id)
    .single();

  if (fetchError || !proposal) {
    console.error(`[proposal:update] Proposal fetch failed:`, fetchError);
    throw new ValidationError(`Proposal not found: ${input.proposal_id}`);
  }

  const proposalData = proposal as unknown as ProposalData;
  console.log(`[proposal:update] Found proposal with status: ${proposalData.Status}`);

  // ================================================
  // AUTHORIZATION CHECK
  // ================================================

  const isGuest = proposalData.Guest === user.id;
  const isHost = await checkIsHost(supabase, proposalData["Host User"], user.id);
  const isAdmin = await checkIsAdmin(supabase, user.id);

  if (!isGuest && !isHost && !isAdmin) {
    console.error(`[proposal:update] Unauthorized: user ${user.id} is not guest, host, or admin`);
    throw new AuthenticationError("You do not have permission to update this proposal");
  }

  console.log(`[proposal:update] Authorized as: ${isAdmin ? "admin" : isHost ? "host" : "guest"}`);

  // ================================================
  // CHECK TERMINAL STATUS
  // ================================================

  if (isTerminalStatus(proposalData.Status as ProposalStatusName)) {
    throw new ValidationError(
      `Cannot update proposal in terminal status: ${proposalData.Status}`
    );
  }

  // ================================================
  // BUILD UPDATE OBJECT
  // ================================================

  const updates: Record<string, unknown> = {};
  const updatedFields: string[] = [];
  const now = new Date().toISOString();

  // Status transition
  if (input.status !== undefined && input.status !== proposalData.Status) {
    if (!isValidStatus(input.status)) {
      throw new ValidationError(`Invalid status: ${input.status}`);
    }

    if (!isValidStatusTransition(
      proposalData.Status as ProposalStatusName,
      input.status as ProposalStatusName
    )) {
      throw new ValidationError(
        `Invalid status transition: ${proposalData.Status} → ${input.status}`
      );
    }

    updates.Status = input.status;
    updatedFields.push("status");

    // Add to history
    const historyEntry = createStatusHistoryEntry(
      input.status as ProposalStatusName,
      isHost ? "host" : isGuest ? "guest" : "admin"
    );
    // CRITICAL: Parse JSONB array - Supabase can return as stringified JSON
    const currentHistory = parseJsonArray<string>(
      (proposalData as unknown as { History: unknown }).History,
      "History"
    );
    updates.History = [...currentHistory, historyEntry];
  }

  // Pricing updates
  if (input.proposal_price !== undefined) {
    updates["proposal nightly price"] = input.proposal_price;
    updatedFields.push("proposal_price");
  }

  // Date updates
  if (input.move_in_start_range !== undefined) {
    updates["Move in range start"] = input.move_in_start_range;
    updatedFields.push("move_in_start_range");
  }
  if (input.move_in_end_range !== undefined) {
    updates["Move in range end"] = input.move_in_end_range;
    updatedFields.push("move_in_end_range");
  }

  // Day/Night selection updates
  if (input.days_selected !== undefined) {
    updates["Days Selected"] = input.days_selected;
    updatedFields.push("days_selected");
  }
  if (input.nights_selected !== undefined) {
    updates["Nights Selected (Nights list)"] = input.nights_selected;
    updates["nights per week (num)"] = input.nights_selected.length;
    updatedFields.push("nights_selected");

    // Recalculate complementary nights
    const availableNights = (proposalData as unknown as { "Days Available": number[] })["Days Available"] || [];
    updates["Complementary Nights"] = calculateComplementaryNights(
      availableNights,
      input.nights_selected
    );
  }

  // Duration updates
  if (input.reservation_span_weeks !== undefined) {
    updates["Reservation Span (Weeks)"] = input.reservation_span_weeks;
    updatedFields.push("reservation_span_weeks");
  }

  // Comment updates
  if (input.comment !== undefined) {
    updates.Comment = input.comment;
    updatedFields.push("comment");
  }

  // ================================================
  // HOST COUNTEROFFER FIELDS
  // ================================================

  if (input.hc_nightly_price !== undefined) {
    updates["hc nightly price"] = input.hc_nightly_price;
    updates["counter offer happened"] = true;
    updatedFields.push("hc_nightly_price");
  }
  if (input.hc_days_selected !== undefined) {
    updates["hc days selected"] = input.hc_days_selected;
    updatedFields.push("hc_days_selected");
  }
  if (input.hc_nights_selected !== undefined) {
    updates["hc nights selected"] = input.hc_nights_selected;
    updates["hc nights per week"] = input.hc_nights_selected.length;
    updatedFields.push("hc_nights_selected");
  }
  if (input.hc_move_in_date !== undefined) {
    updates["hc move in date"] = input.hc_move_in_date;
    updatedFields.push("hc_move_in_date");
  }
  if (input.hc_reservation_span_weeks !== undefined) {
    updates["hc reservation span (weeks)"] = input.hc_reservation_span_weeks;
    updatedFields.push("hc_reservation_span_weeks");
  }
  if (input.hc_cleaning_fee !== undefined) {
    updates["hc cleaning fee"] = input.hc_cleaning_fee;
    updatedFields.push("hc_cleaning_fee");
  }
  if (input.hc_damage_deposit !== undefined) {
    updates["hc damage deposit"] = input.hc_damage_deposit;
    updatedFields.push("hc_damage_deposit");
  }
  if (input.hc_total_price !== undefined) {
    updates["hc total price"] = input.hc_total_price;
    updatedFields.push("hc_total_price");
  }
  if (input.hc_four_week_rent !== undefined) {
    updates["hc 4 week rent"] = input.hc_four_week_rent;
    updatedFields.push("hc_four_week_rent");
  }
  if (input.hc_check_in !== undefined) {
    updates["hc check in day"] = input.hc_check_in;
    updatedFields.push("hc_check_in");
  }
  if (input.hc_check_out !== undefined) {
    updates["hc check out day"] = input.hc_check_out;
    updatedFields.push("hc_check_out");
  }

  // Cancellation reason
  if (input.reason_for_cancellation !== undefined) {
    updates["reason for cancellation"] = input.reason_for_cancellation;
    updatedFields.push("reason_for_cancellation");
  }

  // ================================================
  // VERIFY WE HAVE UPDATES
  // ================================================

  if (updatedFields.length === 0) {
    throw new ValidationError("No valid fields to update");
  }

  // ================================================
  // APPLY UPDATE
  // ================================================

  updates["Modified Date"] = now;

  console.log(`[proposal:update] Updating fields: ${updatedFields.join(", ")}`);

  const { error: updateError } = await supabase
    .from("proposal")
    .update(updates)
    .eq("_id", input.proposal_id);

  if (updateError) {
    console.error(`[proposal:update] Update failed:`, updateError);
    throw new SupabaseSyncError(`Failed to update proposal: ${updateError.message}`);
  }

  console.log(`[proposal:update] Update successful`);

  // ================================================
  // TRIGGER STATUS-SPECIFIC WORKFLOWS
  // ================================================

  if (input.status) {
    console.log(`[proposal:update] [ASYNC] Status changed, would trigger notifications:`, {
      proposal_id: input.proposal_id,
      old_status: proposalData.Status,
      new_status: input.status,
    });
  }

  // ================================================
  // ENQUEUE BUBBLE SYNC
  // ================================================

  // Queue the proposal update for Bubble sync
  // The proposal's _id IS the bubble_id (same ID in both systems)
  try {
    // Filter out internal fields before syncing
    const cleanUpdates = filterBubbleIncompatibleFields(updates);

    await enqueueBubbleSync(supabase, {
      correlationId: `proposal_update:${input.proposal_id}:${Date.now()}`,
      items: [{
        sequence: 1,
        table: 'proposal',
        recordId: input.proposal_id,
        operation: 'UPDATE',
        bubbleId: proposalData._id,  // Use existing Bubble ID
        payload: cleanUpdates,
      }]
    });

    console.log(`[proposal:update] Bubble sync queued for proposal: ${input.proposal_id}`);

    // Trigger queue processing (fire-and-forget)
    // pg_cron will also process the queue as a fallback
    triggerQueueProcessing();
  } catch (syncError) {
    // Log but don't fail the update - sync can be retried
    console.error(`[proposal:update] Failed to queue Bubble sync (non-blocking):`, syncError);
  }

  // ================================================
  // RETURN RESPONSE
  // ================================================

  return {
    proposal_id: input.proposal_id,
    status: (input.status || proposalData.Status) as string,
    updated_fields: updatedFields,
    updated_at: now,
  };
}

/**
 * Check if user is the host of the proposal's listing
 * Host User now directly contains user._id - simple equality check
 */
async function checkIsHost(
  supabase: SupabaseClient,
  hostUserId: string,
  userId: string
): Promise<boolean> {
  if (!hostUserId) return false;

  // Host User column now contains user._id directly - just compare
  return hostUserId === userId;
}

/**
 * Check if user is an admin
 */
async function checkIsAdmin(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("user")
    .select(`"Toggle - Is Admin"`)
    .eq("_id", userId)
    .single();

  return data?.["Toggle - Is Admin"] === true;
}
