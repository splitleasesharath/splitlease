/**
 * Track Engagement Handler
 *
 * Tracks guest engagement with the house manual.
 * Updates visit fields to record what the guest has seen/heard.
 *
 * Tracked engagements:
 * - link_saw: Guest viewed the house manual link
 * - map_saw: Guest viewed the map
 * - narration_heard: Guest listened to audio narration
 *
 * @module house-manual/handlers/trackEngagement
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ValidationError, AuthenticationError } from "../../_shared/errors.ts";

interface TrackEngagementPayload {
  visitId: string;
  engagementType: "link_saw" | "map_saw" | "narration_heard";
}

interface HandlerContext {
  userId: string;
  supabaseClient: SupabaseClient;
  payload: TrackEngagementPayload;
}

interface TrackEngagementResult {
  success: boolean;
  visitId: string;
  engagementType: string;
  previousValue: boolean;
  newValue: boolean;
}

// Map engagement types to database column names
const ENGAGEMENT_FIELD_MAP: Record<string, string> = {
  link_saw: "link saw?",
  map_saw: "map saw?",
  narration_heard: "narration heard?",
};

/**
 * Track guest engagement with house manual
 *
 * SECURITY: Only the guest of the visit can track engagement.
 * Verifies the authenticated user matches the visit's guest.
 */
export async function handleTrackEngagement(
  context: HandlerContext
): Promise<TrackEngagementResult> {
  const { userId, supabaseClient, payload } = context;
  const { visitId, engagementType } = payload;

  // Validate input
  if (!visitId || typeof visitId !== "string") {
    throw new ValidationError("visitId is required");
  }

  if (!engagementType || !ENGAGEMENT_FIELD_MAP[engagementType]) {
    throw new ValidationError(
      `Invalid engagementType. Must be one of: ${Object.keys(ENGAGEMENT_FIELD_MAP).join(", ")}`
    );
  }

  console.log(`[trackEngagement] Tracking ${engagementType} for visit: ${visitId}`);

  // Step 1: Fetch the visit and verify guest ownership
  const { data: visit, error: visitError } = await supabaseClient
    .from("visit")
    .select(`
      _id,
      "User shared with (guest)",
      "link saw?",
      "map saw?",
      "narration heard?"
    `)
    .eq("_id", visitId)
    .single();

  if (visitError || !visit) {
    console.error(`[trackEngagement] Visit not found:`, visitError);
    throw new ValidationError(`Visit not found: ${visitId}`);
  }

  // Step 2: Verify the authenticated user is the guest of this visit
  const { data: userData, error: userError } = await supabaseClient
    .from("user")
    .select("_id, supabase_user_id")
    .eq("supabase_user_id", userId)
    .single();

  if (userError || !userData) {
    console.error(`[trackEngagement] User not found for supabase ID:`, userError);
    throw new AuthenticationError("User not found");
  }

  const guestId = visit["User shared with (guest)"];

  if (userData._id !== guestId) {
    console.error(`[trackEngagement] Access denied. User ${userData._id} is not guest ${guestId}`);
    throw new AuthenticationError("You are not authorized to track engagement for this visit");
  }

  // Step 3: Get current value and update if not already true
  const fieldName = ENGAGEMENT_FIELD_MAP[engagementType];
  const previousValue = Boolean(visit[fieldName as keyof typeof visit]);

  // Only update if not already true (idempotent)
  if (!previousValue) {
    const updatePayload: Record<string, unknown> = {
      [fieldName]: true,
      "Modified Date": new Date().toISOString(),
    };

    // Also track first login time if this is link_saw
    if (engagementType === "link_saw" && !visit["time guest logged in"]) {
      updatePayload["time guest logged in"] = new Date().toISOString();
    }

    const { error: updateError } = await supabaseClient
      .from("visit")
      .update(updatePayload)
      .eq("_id", visitId);

    if (updateError) {
      console.error(`[trackEngagement] Failed to update visit:`, updateError);
      throw new Error(`Failed to track engagement: ${updateError.message}`);
    }

    console.log(`[trackEngagement] Updated ${fieldName} to true for visit ${visitId}`);
  } else {
    console.log(`[trackEngagement] ${fieldName} already true for visit ${visitId}, skipping update`);
  }

  return {
    success: true,
    visitId,
    engagementType,
    previousValue,
    newValue: true,
  };
}

export default handleTrackEngagement;
