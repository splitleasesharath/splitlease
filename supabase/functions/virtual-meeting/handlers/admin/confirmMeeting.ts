/**
 * Admin Handler: Confirm Virtual Meeting
 *
 * Confirms a pending meeting request by setting the booked date and meeting link
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { AuthenticationError, ValidationError } from "../../../_shared/errors.ts";

interface ConfirmPayload {
  meetingId: string;
  bookedDate: string;
  meetingLink?: string;
}

interface AuthenticatedUser {
  id: string;
  email: string;
}

export async function handleAdminConfirmMeeting(
  payload: ConfirmPayload,
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

  if (!payload.bookedDate) {
    throw new ValidationError("Booked date is required");
  }

  console.log(`[admin_confirm_meeting] Confirming meeting ${payload.meetingId} by admin: ${user.email}`);

  // Generate meeting link if not provided
  const meetingLink = payload.meetingLink || generateDefaultMeetingLink();

  // Update meeting in database
  const { data, error } = await supabase
    .from("virtualmeetingschedulesandlinks")
    .update({
      booked_date: payload.bookedDate,
      meeting_link: meetingLink,
      status: "confirmed",
      confirmed_by_splitlease: true,
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
    console.error("[admin_confirm_meeting] Database error:", error);
    throw new ValidationError(`Failed to confirm meeting: ${error.message}`);
  }

  if (!data) {
    throw new ValidationError("Meeting not found");
  }

  console.log(`[admin_confirm_meeting] Successfully confirmed meeting ${payload.meetingId}`);

  // TODO: Queue calendar invite and notifications in a future iteration
  // await enqueueBubbleSync(supabase, { ... })

  return data;
}

/**
 * Generate a default Zoom-style meeting link
 */
function generateDefaultMeetingLink(): string {
  const meetingId = crypto.randomUUID().replace(/-/g, "").substring(0, 11);
  return `https://zoom.us/j/${meetingId}`;
}
