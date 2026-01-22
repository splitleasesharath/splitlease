/**
 * Handler: Attach Deepfake
 * Attaches a completed deepfake video to a house manual
 */

import { HandlerContext } from "../index.ts";
import { ValidationError } from "../../_shared/errors.ts";

export async function handleAttachDeepfake(context: HandlerContext) {
  const { supabaseClient, payload } = context;
  const { deepfakeId, houseManualId } = payload;

  if (!deepfakeId) {
    throw new ValidationError("deepfakeId is required");
  }
  if (!houseManualId) {
    throw new ValidationError("houseManualId is required");
  }

  console.log(`[ai-tools:attach_deepfake] Attaching deepfake ${deepfakeId} to house manual ${houseManualId}`);

  // Verify deepfake exists and is completed
  const { data: deepfake, error: deepfakeError } = await supabaseClient
    .from("heygen_deepfake")
    .select("*")
    .eq("id", deepfakeId)
    .single();

  if (deepfakeError || !deepfake) {
    throw new ValidationError("Deepfake not found");
  }

  if (deepfake.status !== "completed") {
    throw new ValidationError(
      `Cannot attach incomplete deepfake. Status: ${deepfake.status}`
    );
  }

  if (!deepfake.video_url) {
    throw new Error("Deepfake has no video URL");
  }

  // Verify house manual exists
  const { data: manual, error: manualError } = await supabaseClient
    .from("housemanual")
    .select("id")
    .eq("id", houseManualId)
    .single();

  if (manualError || !manual) {
    throw new ValidationError("House manual not found");
  }

  // Update deepfake to mark as attached
  const { error: updateError } = await supabaseClient
    .from("heygen_deepfake")
    .update({
      attached_to_manual: true,
    })
    .eq("id", deepfakeId);

  if (updateError) {
    console.error("[ai-tools:attach_deepfake] Failed to update deepfake:", updateError);
    throw new Error("Failed to update deepfake attachment status");
  }

  // TODO: Update house manual with deepfake reference if needed
  // This depends on how you want to store the relationship
  // Option 1: Add a deepfake_video_url field to housemanual
  // Option 2: Keep relationship via FK in heygen_deepfake table (current approach)

  console.log(`[ai-tools:attach_deepfake] Successfully attached deepfake to house manual`);

  return {
    success: true,
    deepfakeId,
    houseManualId,
    videoUrl: deepfake.video_url,
  };
}
