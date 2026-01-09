/**
 * Apply Hard Block Handler
 * Split Lease - Supabase Edge Functions
 *
 * Sets the user's throttling ability to false when they hit 10+ pending requests.
 * This blocks them from creating new requests for 24 hours.
 *
 * NO FALLBACK PRINCIPLE: All errors fail fast without fallback logic
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SupabaseSyncError, ValidationError } from "../../_shared/errors.ts";
import {
  ApplyHardBlockInput,
  ApplyHardBlockResponse,
  UserContext,
} from "../lib/types.ts";

/**
 * Handle apply hard block
 *
 * Steps:
 * 1. Validate input
 * 2. Fetch lease to determine user role
 * 3. Update the appropriate throttling ability field to false
 * 4. Return success response
 */
export async function handleApplyHardBlock(
  payload: Record<string, unknown>,
  user: UserContext | null,
  supabase: SupabaseClient
): Promise<ApplyHardBlockResponse> {
  console.log(`[date-change-request:apply_hard_block] Starting for user: ${user?.email || 'public'}`);

  // ================================================
  // VALIDATION
  // ================================================

  const input = payload as unknown as ApplyHardBlockInput;

  if (!input.leaseId) {
    throw new ValidationError('leaseId is required');
  }
  if (!input.userId) {
    throw new ValidationError('userId is required');
  }

  const { leaseId, userId } = input;
  console.log(`[date-change-request:apply_hard_block] Blocking user ${userId} on lease ${leaseId}`);

  // ================================================
  // FETCH LEASE TO DETERMINE ROLE
  // ================================================

  const { data: lease, error: leaseError } = await supabase
    .from('bookings_leases')
    .select('_id, "Guest", "Host"')
    .eq('_id', leaseId)
    .single();

  if (leaseError) {
    console.error(`[date-change-request:apply_hard_block] Lease fetch failed:`, leaseError);
    throw new SupabaseSyncError(`Failed to fetch lease: ${leaseError.message}`);
  }

  if (!lease) {
    throw new ValidationError(`Lease not found: ${leaseId}`);
  }

  // ================================================
  // DETERMINE ROLE AND UPDATE FIELD
  // ================================================

  const isHost = userId === lease.Host;
  const isGuest = userId === lease.Guest;

  if (!isHost && !isGuest) {
    throw new ValidationError('User is not a participant in this lease');
  }

  const abilityField = isHost
    ? 'Throttling - host ability to create requests?'
    : 'Throttling - guest ability to create requests?';

  const blockedAt = new Date().toISOString();

  const { error: updateError } = await supabase
    .from('bookings_leases')
    .update({ [abilityField]: false })
    .eq('_id', leaseId);

  if (updateError) {
    console.error(`[date-change-request:apply_hard_block] Update failed:`, updateError);
    throw new SupabaseSyncError(`Failed to apply hard block: ${updateError.message}`);
  }

  console.log(`[date-change-request:apply_hard_block] Successfully blocked ${isHost ? 'host' : 'guest'} on lease ${leaseId}`);

  // ================================================
  // RETURN RESPONSE
  // ================================================

  return {
    success: true,
    blockedAt,
  };
}
