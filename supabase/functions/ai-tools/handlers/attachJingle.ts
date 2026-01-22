/**
 * Handler: Attach Jingle
 * Attaches a completed jingle to a house manual
 */

import { HandlerContext } from "../index.ts";
import { ValidationError } from "../../_shared/errors.ts";

export async function handleAttachJingle(context: HandlerContext) {
  const { supabaseClient, payload } = context;
  const { jingleId, houseManualId } = payload;

  if (!jingleId) {
    throw new ValidationError("jingleId is required");
  }
  if (!houseManualId) {
    throw new ValidationError("houseManualId is required");
  }

  console.log(`[ai-tools:attach_jingle] Attaching jingle ${jingleId} to house manual ${houseManualId}`);

  // Verify jingle exists and has audio
  const { data: jingle, error: jingleError } = await supabaseClient
    .from("narration")
    .select("*")
    .eq("_id", jingleId)
    .eq("is_it_jingle", true)
    .single();

  if (jingleError || !jingle) {
    throw new ValidationError("Jingle not found");
  }

  if (!jingle.Narration_Audio) {
    throw new ValidationError("Jingle has no audio URL");
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

  // Update jingle to ensure it's linked to house manual
  const { error: updateError } = await supabaseClient
    .from("narration")
    .update({
      House_Manual: houseManualId,
    })
    .eq("_id", jingleId);

  if (updateError) {
    console.error("[ai-tools:attach_jingle] Failed to attach jingle:", updateError);
    throw new Error("Failed to attach jingle to house manual");
  }

  console.log(`[ai-tools:attach_jingle] Successfully attached jingle to house manual`);

  return {
    success: true,
    jingleId,
    houseManualId,
    audioUrl: jingle.Narration_Audio,
  };
}
