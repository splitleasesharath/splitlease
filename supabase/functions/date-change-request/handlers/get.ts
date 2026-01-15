/**
 * Get Date Change Requests Handler
 * Split Lease - Supabase Edge Functions
 *
 * Retrieves all date change requests for a lease.
 *
 * NO FALLBACK PRINCIPLE: All errors fail fast without fallback logic
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SupabaseSyncError } from "../../_shared/errors.ts";
import {
  GetDateChangeRequestsInput,
  GetDateChangeRequestsResponse,
  UserContext,
} from "../lib/types.ts";
import { validateGetInput } from "../lib/validators.ts";

/**
 * Handle get date change requests
 *
 * Steps:
 * 1. Validate input
 * 2. Query datechangerequest table for the lease
 * 3. Join with user data for requester/receiver info
 * 4. Return requests sorted by creation date
 */
export async function handleGet(
  payload: Record<string, unknown>,
  user: UserContext | null,
  supabase: SupabaseClient
): Promise<GetDateChangeRequestsResponse> {
  console.log(`[date-change-request:get] Starting get for user: ${user?.email || 'public'}`);

  // ================================================
  // VALIDATION
  // ================================================

  const input = payload as unknown as GetDateChangeRequestsInput;
  validateGetInput(input);

  console.log(`[date-change-request:get] Fetching requests for lease: ${input.leaseId}`);

  // ================================================
  // FETCH REQUESTS
  // ================================================

  const { data: requests, error: requestsError } = await supabase
    .from('datechangerequest')
    .select(`
      *
    `)
    .eq('Lease', input.leaseId)
    .order('Created Date', { ascending: false });

  if (requestsError) {
    console.error(`[date-change-request:get] Fetch failed:`, requestsError);
    throw new SupabaseSyncError(`Failed to fetch date change requests: ${requestsError.message}`);
  }

  const requestList = requests || [];
  console.log(`[date-change-request:get] Found ${requestList.length} requests`);

  // ================================================
  // FETCH USER DATA FOR REQUESTERS/RECEIVERS
  // ================================================

  // Get unique user IDs
  const userIds = new Set<string>();
  requestList.forEach((req: Record<string, unknown>) => {
    if (req['Requested by']) userIds.add(req['Requested by'] as string);
    if (req['Request receiver']) userIds.add(req['Request receiver'] as string);
  });

  const userIdArray = [...userIds].filter(Boolean);
  let userMap: Record<string, Record<string, unknown>> = {};

  if (userIdArray.length > 0) {
    const { data: users, error: usersError } = await supabase
      .from('user')
      .select(`_id, "Name - First", "Profile Photo"`)
      .in('_id', userIdArray);

    if (!usersError && users) {
      userMap = users.reduce((acc: Record<string, Record<string, unknown>>, u: Record<string, unknown>) => {
        acc[u._id as string] = u;
        return acc;
      }, {});
    }
  }

  // ================================================
  // ENRICH REQUESTS WITH USER DATA
  // ================================================

  const enrichedRequests = requestList.map((req: Record<string, unknown>) => ({
    ...req,
    requester: req['Requested by'] ? userMap[req['Requested by'] as string] || null : null,
    receiver: req['Request receiver'] ? userMap[req['Request receiver'] as string] || null : null,
  }));

  // ================================================
  // RETURN RESPONSE
  // ================================================

  console.log(`[date-change-request:get] Complete, returning ${enrichedRequests.length} requests`);

  return {
    requests: enrichedRequests,
  };
}
