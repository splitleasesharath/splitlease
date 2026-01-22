/**
 * Handler: Create Jingle
 * Generates jingle audio using AI music generation
 */

import { HandlerContext } from "../index.ts";
import { ValidationError } from "../../_shared/errors.ts";

export async function handleCreateJingle(context: HandlerContext) {
  const { userId, supabaseClient, payload } = context;
  const { houseManualId, visitId, lyrics, melodyPreference, contentPreferences } = payload;

  if (!houseManualId) {
    throw new ValidationError("houseManualId is required");
  }
  if (!lyrics) {
    throw new ValidationError("lyrics is required");
  }
  if (!melodyPreference) {
    throw new ValidationError("melodyPreference is required");
  }

  console.log(`[ai-tools:create_jingle] Creating jingle for house manual: ${houseManualId}`);

  // Create jingle record in narration table (is_it_jingle = true)
  const { data: jingle, error: createError } = await supabaseClient
    .from("narration")
    .insert({
      House_Manual: houseManualId,
      Visit: visitId || null,
      Narration_Script: lyrics,
      is_it_narration: false,
      is_it_jingle: true,
      Melody_Preferences: melodyPreference,
      Content_preference: JSON.stringify(contentPreferences || []),
      "Created By": userId,
    })
    .select()
    .single();

  if (createError || !jingle) {
    console.error("[ai-tools:create_jingle] Failed to create jingle record:", createError);
    throw new Error("Failed to create jingle record");
  }

  console.log(`[ai-tools:create_jingle] Created jingle record: ${jingle._id}`);

  // Generate jingle audio using AI music generation service
  // NOTE: This would call a music generation API (e.g., Suno AI, Mubert, etc.)
  // For now, this is a placeholder that returns a mock URL

  console.log("[ai-tools:create_jingle] AI music generation integration pending");
  console.log("[ai-tools:create_jingle] Lyrics:", lyrics.substring(0, 100) + "...");

  // Mock audio URL for now (replace with real music generation API call)
  const mockAudioUrl = `https://mock-jingle-api.com/audio/${jingle._id}.mp3`;

  // Update jingle with audio URL
  const { error: updateError } = await supabaseClient
    .from("narration")
    .update({
      Narration_Audio: mockAudioUrl,
    })
    .eq("_id", jingle._id);

  if (updateError) {
    console.error("[ai-tools:create_jingle] Failed to update jingle audio URL:", updateError);
  }

  return {
    jingleId: jingle._id,
    audioUrl: mockAudioUrl,
    status: "completed",
    message: "Jingle created (AI music generation integration pending)",
  };
}
