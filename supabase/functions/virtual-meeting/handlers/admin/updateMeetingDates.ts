/**
 * Admin Handler: Update Meeting Suggested Dates
 *
 * Allows admin to modify the suggested dates/times for a pending meeting request
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { AuthenticationError, ValidationError } from "../../../_shared/errors.ts";

interface UpdateDatesPayload {
  meetingId: string;
  suggestedDates: string[];
}

interface AuthenticatedUser {
  id: string;
  email: string;
}

export async function handleAdminUpdateMeetingDates(
  payload: UpdateDatesPayload,
  user: AuthenticatedUser | null,
  supabase: SupabaseClient
): Promise<unknown> {
  // Verify authentication
  if (!user) {
    throw new AuthenticationError("Authentication required for admin actions");
  }

  // Validate input
  if (!payload.meetingId) {
    throw new ValidationError("Meeting ID is required");
  }

  if (!Array.isArray(payload.suggestedDates) || payload.suggestedDates.length === 0) {
    throw new ValidationError("At least one suggested date is required");
  }

  console.log(`[admin_update_dates] Updating dates for meeting ${payload.meetingId} by admin: ${user.email}`);

  // Verify meeting exists and is still pending
  const { data: existing, error: checkError } = await supabase
    .from("virtualmeetingschedulesandlinks")
    .select("_id, booked_date, status")
    .eq("_id", payload.meetingId)
    .single();

  if (checkError || !existing) {
    throw new ValidationError("Meeting not found");
  }

  if (existing.booked_date) {
    throw new ValidationError("Cannot edit dates for a confirmed meeting");
  }

  // Update meeting dates
  const { data, error } = await supabase
    .from("virtualmeetingschedulesandlinks")
    .update({
      suggested_dates_and_times: payload.suggestedDates,
      modified_date: new Date().toISOString()
    })
    .eq("_id", payload.meetingId)
    .select(`
      *,
      guest:users!virtualmeetingschedulesandlinks_guest_fkey(
        id, _id, name_first, name_last, email, phone_number, profile_photo_url, timezone
      ),
      host:users!virtualmeetingschedulesandlinks_host_fkey(
        id, _id, name_first, name_last, email, phone_number, profile_photo_url, timezone
      )
    `)
    .single();

  if (error) {
    console.error("[admin_update_dates] Database error:", error);
    throw new ValidationError(`Failed to update meeting dates: ${error.message}`);
  }

  console.log(`[admin_update_dates] Successfully updated dates for meeting ${payload.meetingId}`);

  return data;
}
