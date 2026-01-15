/**
 * Update Warning Preference Handler
 * Split Lease - Supabase Edge Functions
 *
 * Updates the "don't show warning popup again" preference for a user on a lease.
 * This is triggered when user checks the "Don't show me this again" checkbox.
 *
 * NO FALLBACK PRINCIPLE: All errors fail fast without fallback logic
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SupabaseSyncError, ValidationError } from "../../_shared/errors.ts";
import {
  UpdateWarningPreferenceInput,
  UpdateWarningPreferenceResponse,
  UserContext,
} from "../lib/types.ts";

/**
 * Handle update warning preference
 *
 * Steps:
 * 1. Validate input
 * 2. Fetch lease to determine user role
 * 3. Update the appropriate "NOT show warning" field
 * 4. Return success response
 */
export async function handleUpdateWarningPreference(
  payload: Record<string, unknown>,
  user: UserContext | null,
  supabase: SupabaseClient
): Promise<UpdateWarningPreferenceResponse> {
  console.log(`[date-change-request:update_warning_preference] Starting for user: ${user?.email || 'public'}`);

  // ================================================
  // VALIDATION
  // ================================================

  const input = payload as unknown as UpdateWarningPreferenceInput;

  if (!input.leaseId) {
    throw new ValidationError('leaseId is required');
  }
  if (!input.userId) {
    throw new ValidationError('userId is required');
  }
  if (typeof input.dontShowAgain !== 'boolean') {
    throw new ValidationError('dontShowAgain must be a boolean');
  }

  const { leaseId, userId, dontShowAgain } = input;
  console.log(`[date-change-request:update_warning_preference] Setting dontShowAgain=${dontShowAgain} for user ${userId} on lease ${leaseId}`);

  // ================================================
  // FETCH LEASE TO DETERMINE ROLE
  // ================================================

  const { data: lease, error: leaseError } = await supabase
    .from('bookings_leases')
    .select('_id, "Guest", "Host"')
    .eq('_id', leaseId)
    .single();

  if (leaseError) {
    console.error(`[date-change-request:update_warning_preference] Lease fetch failed:`, leaseError);
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

  const preferenceField = isHost
    ? 'Throttling - host NOT show warning popup'
    : 'Throttling - guest NOT show warning popup';

  const { error: updateError } = await supabase
    .from('bookings_leases')
    .update({ [preferenceField]: dontShowAgain })
    .eq('_id', leaseId);

  if (updateError) {
    console.error(`[date-change-request:update_warning_preference] Update failed:`, updateError);
    throw new SupabaseSyncError(`Failed to update preference: ${updateError.message}`);
  }

  console.log(`[date-change-request:update_warning_preference] Successfully updated preference for ${isHost ? 'host' : 'guest'}`);

  // ================================================
  // RETURN RESPONSE
  // ================================================

  return {
    success: true,
  };
}
