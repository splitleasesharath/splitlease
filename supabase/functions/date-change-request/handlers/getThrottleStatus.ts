/**
 * Get Throttle Status Handler
 * Split Lease - Supabase Edge Functions
 *
 * Checks if a user has hit their date change request limits.
 *
 * NO FALLBACK PRINCIPLE: All errors fail fast without fallback logic
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SupabaseSyncError } from "../../_shared/errors.ts";
import {
  GetThrottleStatusInput,
  ThrottleStatusResponse,
  UserContext,
  THROTTLE_LIMIT,
  THROTTLE_WINDOW_HOURS,
} from "../lib/types.ts";
import { validateThrottleStatusInput } from "../lib/validators.ts";

/**
 * Handle get throttle status
 *
 * Steps:
 * 1. Validate input
 * 2. Count requests made in the last 24 hours
 * 3. Return throttle status
 */
export async function handleGetThrottleStatus(
  payload: Record<string, unknown>,
  user: UserContext | null,
  supabase: SupabaseClient
): Promise<ThrottleStatusResponse> {
  console.log(`[date-change-request:get_throttle_status] Starting for user: ${user?.email || 'public'}`);

  // ================================================
  // VALIDATION
  // ================================================

  const input = payload as unknown as GetThrottleStatusInput;
  validateThrottleStatusInput(input);

  console.log(`[date-change-request:get_throttle_status] Checking throttle for user: ${input.userId}`);

  // ================================================
  // COUNT RECENT REQUESTS
  // ================================================

  const windowStart = new Date();
  windowStart.setHours(windowStart.getHours() - THROTTLE_WINDOW_HOURS);

  const { count, error: countError } = await supabase
    .from('datechangerequest')
    .select('*', { count: 'exact', head: true })
    .eq('Requested by', input.userId)
    .gte('Created Date', windowStart.toISOString());

  if (countError) {
    console.error(`[date-change-request:get_throttle_status] Count failed:`, countError);
    throw new SupabaseSyncError(`Failed to check throttle status: ${countError.message}`);
  }

  const requestCount = count || 0;
  const isThrottled = requestCount >= THROTTLE_LIMIT;

  console.log(`[date-change-request:get_throttle_status] Count: ${requestCount}/${THROTTLE_LIMIT}, Throttled: ${isThrottled}`);

  // ================================================
  // RETURN RESPONSE
  // ================================================

  return {
    requestCount,
    limit: THROTTLE_LIMIT,
    isThrottled,
    windowResetTime: windowStart.toISOString(),
  };
}
