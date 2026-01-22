/**
 * Admin Handler: Fetch New Virtual Meeting Requests
 *
 * Fetches all pending meeting requests (status = 'new_request', no booked date)
 * with related guest, host, and listing data
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { AuthenticationError, ValidationError } from "../../../_shared/errors.ts";

interface FetchFilters {
  proposalId?: string;
}

interface AuthenticatedUser {
  id: string;
  email: string;
}

export async function handleAdminFetchNewRequests(
  payload: FetchFilters,
  user: AuthenticatedUser | null,
  supabase: SupabaseClient
): Promise<unknown[]> {
  // Verify authentication (admin check can be added once roles are implemented)
  if (!user) {
    throw new AuthenticationError("Authentication required for admin actions");
  }

  console.log(`[admin_fetch_new_requests] Fetching new requests for admin: ${user.email}`);

  // Build query for pending requests
  let query = supabase
    .from("virtualmeetingschedulesandlinks")
    .select(`
      *,
      guest:users!virtualmeetingschedulesandlinks_guest_fkey(
        id, _id, name_first, name_last, email, phone_number, profile_photo_url, timezone
      ),
      host:users!virtualmeetingschedulesandlinks_host_fkey(
        id, _id, name_first, name_last, email, phone_number, profile_photo_url, timezone
      ),
      listing:listing(
        _id, title, street_address, unit_apt, neighborhood_1
      )
    `)
    .is("booked_date", null)
    .order("created_at", { ascending: false });

  // Apply optional proposal filter
  if (payload.proposalId) {
    query = query.ilike("proposal_unique_id", `%${payload.proposalId}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[admin_fetch_new_requests] Database error:", error);
    throw new ValidationError(`Failed to fetch new requests: ${error.message}`);
  }

  console.log(`[admin_fetch_new_requests] Found ${data?.length || 0} pending requests`);

  return data || [];
}
