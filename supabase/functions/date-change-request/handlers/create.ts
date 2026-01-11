/**
 * Create Date Change Request Handler
 * Split Lease - Supabase Edge Functions
 *
 * Creates a new date change request in the datechangerequest table
 * and enqueues Bubble sync.
 *
 * NO FALLBACK PRINCIPLE: All errors fail fast without fallback logic
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ValidationError, SupabaseSyncError } from "../../_shared/errors.ts";
import { enqueueBubbleSync, triggerQueueProcessing } from "../../_shared/queueSync.ts";
import {
  CreateDateChangeRequestInput,
  CreateDateChangeRequestResponse,
  UserContext,
  HARD_BLOCK_THRESHOLD,
  THROTTLE_WINDOW_HOURS,
  EXPIRATION_HOURS,
} from "../lib/types.ts";
import { validateCreateInput } from "../lib/validators.ts";

/**
 * Handle create date change request
 *
 * Steps:
 * 1. Validate input
 * 2. Check throttle status
 * 3. Verify lease exists and user is participant
 * 4. Generate unique _id via generate_bubble_id RPC
 * 5. Insert record into datechangerequest
 * 6. Enqueue Bubble sync
 * 7. Return the created request ID
 */
export async function handleCreate(
  payload: Record<string, unknown>,
  user: UserContext | null,
  supabase: SupabaseClient
): Promise<CreateDateChangeRequestResponse> {
  console.log(`[date-change-request:create] Starting create for user: ${user?.email || 'public'}`);

  // ================================================
  // VALIDATION
  // ================================================

  const input = payload as unknown as CreateDateChangeRequestInput;
  validateCreateInput(input);

  console.log(`[date-change-request:create] Validated input for lease: ${input.leaseId}`);

  // ================================================
  // CHECK THROTTLE STATUS (Count PENDING requests only)
  // ================================================

  const windowStart = new Date();
  windowStart.setHours(windowStart.getHours() - THROTTLE_WINDOW_HOURS);

  // Count only pending (waiting_for_answer) requests for this lease
  const { count, error: countError } = await supabase
    .from('datechangerequest')
    .select('*', { count: 'exact', head: true })
    .eq('Requested by', input.requestedById)
    .eq('Lease', input.leaseId)
    .eq('request status', 'waiting_for_answer')
    .gte('Created Date', windowStart.toISOString());

  if (countError) {
    console.error(`[date-change-request:create] Throttle check failed:`, countError);
    throw new SupabaseSyncError(`Failed to check throttle status: ${countError.message}`);
  }

  const requestCount = count || 0;

  // Hard block at 10+ pending requests
  if (requestCount >= HARD_BLOCK_THRESHOLD) {
    console.log(`[date-change-request:create] Hard block threshold reached: ${requestCount}/${HARD_BLOCK_THRESHOLD}`);
    throw new ValidationError(`You have reached the maximum number of pending requests (${HARD_BLOCK_THRESHOLD}). Please wait for responses before creating more.`);
  }

  console.log(`[date-change-request:create] Throttle check passed: ${requestCount} pending requests`);

  // ================================================
  // VERIFY LEASE EXISTS AND CHECK THROTTLE ABILITY
  // ================================================

  const { data: lease, error: leaseError } = await supabase
    .from('bookings_leases')
    .select(`
      _id,
      "Guest",
      "Host",
      "Listing",
      "Lease Status",
      "Throttling - guest ability to create requests?",
      "Throttling - host ability to create requests?"
    `)
    .eq('_id', input.leaseId)
    .single();

  if (leaseError || !lease) {
    console.error(`[date-change-request:create] Lease fetch failed:`, leaseError);
    throw new ValidationError(`Lease not found: ${input.leaseId}`);
  }

  console.log(`[date-change-request:create] Found lease, guest: ${lease.Guest}, host: ${lease.Host}`);

  // Verify user is a participant
  const isHost = input.requestedById === lease.Host;
  const isGuest = input.requestedById === lease.Guest;
  if (!isHost && !isGuest) {
    throw new ValidationError('User is not a participant of this lease');
  }

  // Check if user's ability to create requests is blocked (hard block from 10+ requests)
  const abilityField = isHost
    ? 'Throttling - host ability to create requests?'
    : 'Throttling - guest ability to create requests?';

  // Note: null/undefined defaults to true (can create)
  if (lease[abilityField] === false) {
    console.log(`[date-change-request:create] User is hard blocked from creating requests`);
    throw new ValidationError('Your ability to create date change requests has been temporarily suspended. Please try again later.');
  }

  // ================================================
  // GENERATE ID
  // ================================================

  const { data: requestId, error: idError } = await supabase.rpc('generate_bubble_id');
  if (idError || !requestId) {
    console.error(`[date-change-request:create] ID generation failed:`, idError);
    throw new SupabaseSyncError('Failed to generate request ID');
  }

  console.log(`[date-change-request:create] Generated request ID: ${requestId}`);

  // ================================================
  // CREATE DATE CHANGE REQUEST RECORD
  // ================================================

  const now = new Date().toISOString();
  const expirationDate = new Date();
  expirationDate.setHours(expirationDate.getHours() + EXPIRATION_HOURS);

  const requestData = {
    _id: requestId,

    // Relationships
    'Lease': input.leaseId,
    'Requested by': input.requestedById,
    'Request receiver': input.receiverId,

    // Request details
    'type of request': input.typeOfRequest,
    'date added': input.dateAdded || null,
    'date removed': input.dateRemoved || null,
    'Message from Requested by': input.message || null,
    'Price/Rate of the night': input.priceRate || null,
    '%compared to regular nightly price': input.percentageOfRegular || null,

    // Status
    'request status': 'waiting_for_answer',
    'expiration date': expirationDate.toISOString(),
    'visible to the guest?': true,
    'visible to the host?': true,
    'pending': true,

    // Audit
    'Created By': input.requestedById,
    'Created Date': now,
    'Modified Date': now,
  };

  console.log(`[date-change-request:create] Inserting request: ${requestId}`);

  const { error: insertError } = await supabase
    .from('datechangerequest')
    .insert(requestData);

  if (insertError) {
    console.error(`[date-change-request:create] Insert failed:`, insertError);
    throw new SupabaseSyncError(`Failed to create date change request: ${insertError.message}`);
  }

  console.log(`[date-change-request:create] Request created successfully`);

  // ================================================
  // ENQUEUE BUBBLE SYNC
  // ================================================

  try {
    await enqueueBubbleSync(supabase, {
      correlationId: requestId,
      items: [
        {
          sequence: 1,
          table: 'datechangerequest',
          recordId: requestId,
          operation: 'INSERT',
          payload: requestData,
        },
      ],
    });

    console.log(`[date-change-request:create] Bubble sync enqueued (correlation: ${requestId})`);

    // Trigger queue processing (fire and forget)
    triggerQueueProcessing();

  } catch (syncError) {
    // Log but don't fail - items can be manually requeued if needed
    console.error(`[date-change-request:create] Failed to enqueue Bubble sync (non-blocking):`, syncError);
  }

  // ================================================
  // RETURN RESPONSE
  // ================================================

  console.log(`[date-change-request:create] Complete, returning response`);

  return {
    requestId: requestId,
    leaseId: input.leaseId,
    createdAt: now,
  };
}
