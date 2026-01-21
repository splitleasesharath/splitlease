/**
 * Admin Handler: Fetch Confirmed Virtual Meetings
 *
 * Fetches all confirmed meetings (those with a booked date)
 * with related guest, host, and listing data
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { AuthenticationError, ValidationError } from "../../../_shared/errors.ts";

interface FetchFilters {
  proposalId?: string;
  status?: string;
}

interface AuthenticatedUser {
  id: string;
  email: string;
}

export async function handleAdminFetchConfirmed(
  payload: FetchFilters,
  user: AuthenticatedUser | null,
  supabase: SupabaseClient
): Promise<unknown[]> {
  // Verify authentication
  if (!user) {
    throw new AuthenticationError("Authentication required for admin actions");
  }

  console.log(`[admin_fetch_confirmed] Fetching confirmed meetings for admin: ${user.email}`);

  // Build query for confirmed meetings
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
    .not("booked_date", "is", null)
    .order("booked_date", { ascending: true });

  // Apply optional filters
  if (payload.proposalId) {
    query = query.ilike("proposal_unique_id", `%${payload.proposalId}%`);
  }

  if (payload.status) {
    query = query.eq("status", payload.status);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[admin_fetch_confirmed] Database error:", error);
    throw new ValidationError(`Failed to fetch confirmed meetings: ${error.message}`);
  }

  console.log(`[admin_fetch_confirmed] Found ${data?.length || 0} confirmed meetings`);

  return data || [];
}
