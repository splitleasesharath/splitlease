/**
 * Get Throttle Status Handler
 * Split Lease - Supabase Edge Functions
 *
 * Enhanced throttle status check with two-tier warning system:
 * - Soft warning at 5+ pending requests (shows popup, allows continue)
 * - Hard block at 10+ pending requests (prevents creation for 24h)
 *
 * NO FALLBACK PRINCIPLE: All errors fail fast without fallback logic
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SupabaseSyncError } from "../../_shared/errors.ts";
import {
  GetThrottleStatusInput,
  EnhancedThrottleStatusResponse,
  ThrottleStatusResponse,
  UserContext,
  ThrottleLevel,
  SOFT_WARNING_THRESHOLD,
  HARD_BLOCK_THRESHOLD,
  THROTTLE_WINDOW_HOURS,
  THROTTLE_LIMIT,
} from "../lib/types.ts";
import { validateThrottleStatusInput } from "../lib/validators.ts";

/**
 * Determine throttle level based on pending request count
 */
const determineThrottleLevel = (count: number, isBlocked: boolean): ThrottleLevel => {
  if (isBlocked || count >= HARD_BLOCK_THRESHOLD) {
    return 'hard_block';
  }
  if (count >= SOFT_WARNING_THRESHOLD) {
    return 'soft_warning';
  }
  return 'none';
};

/**
 * Handle get throttle status
 *
 * When leaseId is provided: Returns enhanced status with lease throttle fields
 * When leaseId is omitted: Returns basic status (backward compatible)
 *
 * Enhanced filtering:
 * - Only counts requests with status = 'waiting_for_answer' (pending)
 * - Only counts requests for the specific lease
 * - Only counts requests created by the user
 */
export async function handleGetThrottleStatus(
  payload: Record<string, unknown>,
  user: UserContext | null,
  supabase: SupabaseClient
): Promise<EnhancedThrottleStatusResponse | ThrottleStatusResponse> {
  console.log(`[date-change-request:get_throttle_status] Starting for user: ${user?.email || 'public'}`);

  // ================================================
  // VALIDATION
  // ================================================

  const input = payload as unknown as GetThrottleStatusInput;
  validateThrottleStatusInput(input);

  const { userId, leaseId } = input;
  console.log(`[date-change-request:get_throttle_status] Checking throttle for user: ${userId}, lease: ${leaseId || 'not specified'}`);

  // ================================================
  // CALCULATE TIME WINDOW
  // ================================================

  const windowStart = new Date();
  windowStart.setHours(windowStart.getHours() - THROTTLE_WINDOW_HOURS);

  // ================================================
  // ENHANCED MODE (with leaseId)
  // ================================================

  if (leaseId) {
    // 1. Fetch lease with throttling fields and participant info
    const { data: lease, error: leaseError } = await supabase
      .from('bookings_leases')
      .select(`
        _id, "Guest", "Host",
        "Throttling - guest ability to create requests?",
        "Throttling - host ability to create requests?",
        "Throttling - guest NOT show warning popup",
        "Throttling - host NOT show warning popup"
      `)
      .eq('_id', leaseId)
      .single();

    if (leaseError) {
      console.error(`[date-change-request:get_throttle_status] Lease fetch failed:`, leaseError);
      throw new SupabaseSyncError(`Failed to fetch lease: ${leaseError.message}`);
    }

    if (!lease) {
      throw new SupabaseSyncError(`Lease not found: ${leaseId}`);
    }

    // 2. Determine user role
    const isHost = userId === lease.Host;
    const otherParticipantId = isHost ? lease.Guest : lease.Host;

    // 3. Fetch other participant name
    let otherParticipantName = 'the other party';
    if (otherParticipantId) {
      const { data: otherUser } = await supabase
        .from('user')
        .select('"Name - First"')
        .eq('_id', otherParticipantId)
        .single();

      if (otherUser?.['Name - First']) {
        otherParticipantName = otherUser['Name - First'];
      }
    }

    // 4. Count PENDING requests in last 24 hours for THIS LEASE by THIS USER
    const { count, error: countError } = await supabase
      .from('datechangerequest')
      .select('*', { count: 'exact', head: true })
      .eq('Requested by', userId)
      .eq('Lease', leaseId)
      .eq('request status', 'waiting_for_answer')
      .gte('Created Date', windowStart.toISOString());

    if (countError) {
      console.error(`[date-change-request:get_throttle_status] Count failed:`, countError);
      throw new SupabaseSyncError(`Failed to check throttle status: ${countError.message}`);
    }

    const pendingRequestCount = count || 0;

    // 5. Get throttle fields based on role
    const abilityField = isHost
      ? 'Throttling - host ability to create requests?'
      : 'Throttling - guest ability to create requests?';
    const dontShowField = isHost
      ? 'Throttling - host NOT show warning popup'
      : 'Throttling - guest NOT show warning popup';

    // Check if blocked (ability field is false)
    // Note: null/undefined defaults to true (can create)
    const isBlocked = lease[abilityField] === false;
    const dontShowWarning = lease[dontShowField] === true;

    // 6. Determine throttle level
    const throttleLevel = determineThrottleLevel(pendingRequestCount, isBlocked);

    console.log(`[date-change-request:get_throttle_status] Enhanced: count=${pendingRequestCount}, level=${throttleLevel}, blocked=${isBlocked}, dontShow=${dontShowWarning}`);

    // 7. Return enhanced response
    return {
      pendingRequestCount,
      throttleLevel,
      isBlocked,
      showWarning: throttleLevel === 'soft_warning' && !dontShowWarning,
      otherParticipantName,
      blockedUntil: null, // Would need blocked_at timestamp to calculate
      // Legacy fields for backward compatibility
      requestCount: pendingRequestCount,
      limit: SOFT_WARNING_THRESHOLD,
      isThrottled: throttleLevel === 'hard_block',
      windowResetTime: windowStart.toISOString(),
    };
  }

  // ================================================
  // BASIC MODE (backward compatible, no leaseId)
  // ================================================

  const { count, error: countError } = await supabase
    .from('datechangerequest')
    .select('*', { count: 'exact', head: true })
    .eq('Requested by', userId)
    .gte('Created Date', windowStart.toISOString());

  if (countError) {
    console.error(`[date-change-request:get_throttle_status] Count failed:`, countError);
    throw new SupabaseSyncError(`Failed to check throttle status: ${countError.message}`);
  }

  const requestCount = count || 0;
  const isThrottled = requestCount >= THROTTLE_LIMIT;

  console.log(`[date-change-request:get_throttle_status] Basic: count=${requestCount}/${THROTTLE_LIMIT}, throttled=${isThrottled}`);

  return {
    requestCount,
    limit: THROTTLE_LIMIT,
    isThrottled,
    windowResetTime: windowStart.toISOString(),
  };
}
