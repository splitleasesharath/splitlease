/**
 * Handler: Get Deepfake URL
 * Retrieves the final video URL for a completed deepfake
 */

import { HandlerContext } from "../index.ts";
import { ValidationError } from "../../_shared/errors.ts";

export async function handleGetDeepfakeUrl(context: HandlerContext) {
  const { supabaseClient, payload } = context;
  const { deepfakeId } = payload;

  if (!deepfakeId) {
    throw new ValidationError("deepfakeId is required");
  }

  console.log(`[ai-tools:get_deepfake_url] Fetching URL for deepfake: ${deepfakeId}`);

  // Fetch deepfake record
  const { data, error } = await supabaseClient
    .from("heygen_deepfake")
    .select("id, video_url, status, error_message")
    .eq("id", deepfakeId)
    .single();

  if (error || !data) {
    throw new ValidationError("Deepfake not found");
  }

  if (data.status !== "completed") {
    throw new ValidationError(
      `Deepfake is not completed yet. Current status: ${data.status}`
    );
  }

  if (!data.video_url) {
    throw new Error("Deepfake is marked as completed but has no video URL");
  }

  console.log(`[ai-tools:get_deepfake_url] Video URL found`);

  return {
    videoUrl: data.video_url,
    deepfakeId: data.id,
    status: data.status,
  };
}
