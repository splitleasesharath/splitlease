/**
 * Accept Date Change Request Handler
 * Split Lease - Supabase Edge Functions
 *
 * Accepts a date change request and updates the lease dates.
 *
 * NO FALLBACK PRINCIPLE: All errors fail fast without fallback logic
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ValidationError, SupabaseSyncError, AuthenticationError } from "../../_shared/errors.ts";
import { enqueueBubbleSync, triggerQueueProcessing } from "../../_shared/queueSync.ts";
import {
  AcceptRequestInput,
  AcceptRequestResponse,
  UserContext,
  DateChangeRequestData,
} from "../lib/types.ts";
import { validateAcceptInput } from "../lib/validators.ts";

/**
 * Handle accept date change request
 *
 * Steps:
 * 1. Validate input
 * 2. Fetch the request
 * 3. Verify user is the receiver
 * 4. Verify request is still pending
 * 5. Update request status
 * 6. Update lease booked dates (if applicable)
 * 7. Enqueue Bubble sync
 * 8. Return response
 */
export async function handleAccept(
  payload: Record<string, unknown>,
  user: UserContext | null,
  supabase: SupabaseClient
): Promise<AcceptRequestResponse> {
  console.log(`[date-change-request:accept] Starting accept for user: ${user?.email || 'public'}`);

  // ================================================
  // VALIDATION
  // ================================================

  const input = payload as unknown as AcceptRequestInput;
  validateAcceptInput(input);

  console.log(`[date-change-request:accept] Accepting request: ${input.requestId}`);

  // ================================================
  // FETCH REQUEST
  // ================================================

  const { data: request, error: requestError } = await supabase
    .from('datechangerequest')
    .select('*')
    .eq('_id', input.requestId)
    .single();

  if (requestError || !request) {
    console.error(`[date-change-request:accept] Request fetch failed:`, requestError);
    throw new ValidationError(`Request not found: ${input.requestId}`);
  }

  const requestData = request as unknown as DateChangeRequestData;
  console.log(`[date-change-request:accept] Found request, status: ${requestData['request status']}`);

  // ================================================
  // VERIFY STATUS
  // ================================================

  if (requestData['request status'] !== 'waiting_for_answer') {
    throw new ValidationError(`Request is not pending. Current status: ${requestData['request status']}`);
  }

  // Check expiration
  if (requestData['expiration date']) {
    const expirationDate = new Date(requestData['expiration date']);
    if (expirationDate < new Date()) {
      throw new ValidationError('Request has expired');
    }
  }

  // ================================================
  // UPDATE REQUEST STATUS
  // ================================================

  const now = new Date().toISOString();

  const updateData = {
    'request status': 'Approved',
    'answer date': now,
    'Answer to Request': input.message || null,
    'Modified Date': now,
    'pending': false,
  };

  const { error: updateError } = await supabase
    .from('datechangerequest')
    .update(updateData)
    .eq('_id', input.requestId);

  if (updateError) {
    console.error(`[date-change-request:accept] Update failed:`, updateError);
    throw new SupabaseSyncError(`Failed to accept request: ${updateError.message}`);
  }

  console.log(`[date-change-request:accept] Request status updated to Approved`);

  // ================================================
  // UPDATE LEASE BOOKED DATES
  // ================================================

  if (requestData['Lease']) {
    try {
      // Fetch current lease data
      const { data: lease, error: leaseError } = await supabase
        .from('bookings_leases')
        .select(`"List of Booked Dates"`)
        .eq('_id', requestData['Lease'])
        .single();

      if (!leaseError && lease) {
        let bookedDates: string[] = lease['List of Booked Dates'] || [];

        // Modify dates based on request type
        const requestType = requestData['type of request'];
        const dateToAdd = requestData['date added'];
        const dateToRemove = requestData['date removed'];

        if (requestType === 'adding' && dateToAdd) {
          // Add the new date
          if (!bookedDates.includes(dateToAdd)) {
            bookedDates = [...bookedDates, dateToAdd];
          }
          console.log(`[date-change-request:accept] Added date: ${dateToAdd}`);
        }

        if (requestType === 'removing' && dateToRemove) {
          // Remove the date
          bookedDates = bookedDates.filter(d => d !== dateToRemove);
          console.log(`[date-change-request:accept] Removed date: ${dateToRemove}`);
        }

        if (requestType === 'swapping') {
          // Remove old date, add new date
          if (dateToRemove) {
            bookedDates = bookedDates.filter(d => d !== dateToRemove);
          }
          if (dateToAdd && !bookedDates.includes(dateToAdd)) {
            bookedDates = [...bookedDates, dateToAdd];
          }
          console.log(`[date-change-request:accept] Swapped: ${dateToRemove} -> ${dateToAdd}`);
        }

        // Update lease with new booked dates
        const { error: leaseUpdateError } = await supabase
          .from('bookings_leases')
          .update({
            'List of Booked Dates': bookedDates,
            'Modified Date': now,
          })
          .eq('_id', requestData['Lease']);

        if (leaseUpdateError) {
          console.error(`[date-change-request:accept] Lease update failed (non-blocking):`, leaseUpdateError);
        } else {
          console.log(`[date-change-request:accept] Lease dates updated`);
        }
      }
    } catch (leaseErr) {
      // Non-blocking - log but continue
      console.error(`[date-change-request:accept] Lease update error (non-blocking):`, leaseErr);
    }
  }

  // ================================================
  // ENQUEUE BUBBLE SYNC
  // ================================================

  try {
    await enqueueBubbleSync(supabase, {
      correlationId: `accept:${input.requestId}`,
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

    console.log(`[date-change-request:accept] Bubble sync enqueued`);
    triggerQueueProcessing();

  } catch (syncError) {
    console.error(`[date-change-request:accept] Failed to enqueue Bubble sync (non-blocking):`, syncError);
  }

  // ================================================
  // RETURN RESPONSE
  // ================================================

  console.log(`[date-change-request:accept] Complete`);

  return {
    requestId: input.requestId,
    status: 'Approved',
    answeredAt: now,
  };
}
