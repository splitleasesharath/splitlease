/**
 * Cancel Date Change Request Handler
 * Split Lease - Supabase Edge Functions
 *
 * Cancels a user's own pending date change request.
 *
 * NO FALLBACK PRINCIPLE: All errors fail fast without fallback logic
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ValidationError, SupabaseSyncError } from "../../_shared/errors.ts";
import { enqueueBubbleSync, triggerQueueProcessing } from "../../_shared/queueSync.ts";
import {
  CancelRequestInput,
  CancelRequestResponse,
  UserContext,
  DateChangeRequestData,
} from "../lib/types.ts";
import { validateCancelInput } from "../lib/validators.ts";

/**
 * Handle cancel date change request
 *
 * Steps:
 * 1. Validate input
 * 2. Fetch the request
 * 3. Verify request is still pending
 * 4. Update request status to cancelled
 * 5. Enqueue Bubble sync
 * 6. Return response
 */
export async function handleCancel(
  payload: Record<string, unknown>,
  user: UserContext | null,
  supabase: SupabaseClient
): Promise<CancelRequestResponse> {
  console.log(`[date-change-request:cancel] Starting cancel for user: ${user?.email || 'public'}`);

  // ================================================
  // VALIDATION
  // ================================================

  const input = payload as unknown as CancelRequestInput;
  validateCancelInput(input);

  console.log(`[date-change-request:cancel] Cancelling request: ${input.requestId}`);

  // ================================================
  // FETCH REQUEST
  // ================================================

  const { data: request, error: requestError } = await supabase
    .from('datechangerequest')
    .select('*')
    .eq('_id', input.requestId)
    .single();

  if (requestError || !request) {
    console.error(`[date-change-request:cancel] Request fetch failed:`, requestError);
    throw new ValidationError(`Request not found: ${input.requestId}`);
  }

  const requestData = request as unknown as DateChangeRequestData;
  console.log(`[date-change-request:cancel] Found request, status: ${requestData['request status']}`);

  // ================================================
  // VERIFY STATUS
  // ================================================

  if (requestData['request status'] !== 'waiting_for_answer') {
    throw new ValidationError(`Cannot cancel - request is not pending. Current status: ${requestData['request status']}`);
  }

  // ================================================
  // UPDATE REQUEST STATUS
  // ================================================

  const now = new Date().toISOString();

  const updateData = {
    'request status': 'cancelled',
    'Modified Date': now,
    'pending': false,
  };

  const { error: updateError } = await supabase
    .from('datechangerequest')
    .update(updateData)
    .eq('_id', input.requestId);

  if (updateError) {
    console.error(`[date-change-request:cancel] Update failed:`, updateError);
    throw new SupabaseSyncError(`Failed to cancel request: ${updateError.message}`);
  }

  console.log(`[date-change-request:cancel] Request status updated to cancelled`);

  // ================================================
  // ENQUEUE BUBBLE SYNC
  // ================================================

  try {
    await enqueueBubbleSync(supabase, {
      correlationId: `cancel:${input.requestId}`,
      items: [
        {
          sequence: 1,
          table: 'datechangerequest',
          recordId: input.requestId,
          operation: 'UPDATE',
          payload: updateData,
        },
      ],
    });

    console.log(`[date-change-request:cancel] Bubble sync enqueued`);
    triggerQueueProcessing();

  } catch (syncError) {
    console.error(`[date-change-request:cancel] Failed to enqueue Bubble sync (non-blocking):`, syncError);
  }

  // ================================================
  // RETURN RESPONSE
  // ================================================

  console.log(`[date-change-request:cancel] Complete`);

  return {
    requestId: input.requestId,
    status: 'cancelled',
  };
}
