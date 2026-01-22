/**
 * Admin Handler: Delete Virtual Meeting
 *
 * Deletes a virtual meeting request (only for non-confirmed meetings)
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { AuthenticationError, ValidationError } from "../../../_shared/errors.ts";

interface DeletePayload {
  meetingId: string;
}

interface AuthenticatedUser {
  id: string;
  email: string;
}

export async function handleAdminDeleteMeeting(
  payload: DeletePayload,
  user: AuthenticatedUser | null,
  supabase: SupabaseClient
): Promise<{ deleted: boolean; meetingId: string }> {
  // Verify authentication
  if (!user) {
    throw new AuthenticationError("Authentication required for admin actions");
  }

  // Validate input
  if (!payload.meetingId) {
    throw new ValidationError("Meeting ID is required");
  }

  console.log(`[admin_delete_meeting] Deleting meeting ${payload.meetingId} by admin: ${user.email}`);

  // Verify meeting exists and can be deleted
  const { data: existing, error: checkError } = await supabase
    .from("virtualmeetingschedulesandlinks")
    .select("_id, status, booked_date")
    .eq("_id", payload.meetingId)
    .single();

  if (checkError || !existing) {
    throw new ValidationError("Meeting not found");
  }

  // Don't allow deletion of confirmed or completed meetings
  if (existing.status === "confirmed" || existing.status === "completed") {
    throw new ValidationError("Cannot delete a confirmed or completed meeting");
  }

  // Delete the meeting
  const { error: deleteError } = await supabase
    .from("virtualmeetingschedulesandlinks")
    .delete()
    .eq("_id", payload.meetingId);

  if (deleteError) {
    console.error("[admin_delete_meeting] Database error:", deleteError);
    throw new ValidationError(`Failed to delete meeting: ${deleteError.message}`);
  }

  console.log(`[admin_delete_meeting] Successfully deleted meeting ${payload.meetingId}`);

  return {
    deleted: true,
    meetingId: payload.meetingId
  };
}
