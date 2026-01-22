/**
 * Handler: Generate Narration
 * Calls ElevenLabs API to generate narration audio
 */

import { HandlerContext } from "../index.ts";
import { ValidationError } from "../../_shared/errors.ts";

export async function handleGenerateNarration(context: HandlerContext) {
  const { userId, supabaseClient, payload } = context;
  const { houseManualId, visitId, narratorId, script } = payload;

  if (!houseManualId) {
    throw new ValidationError("houseManualId is required");
  }
  if (!narratorId) {
    throw new ValidationError("narratorId (ElevenLabs voice ID) is required");
  }
  if (!script) {
    throw new ValidationError("script is required");
  }

  console.log(`[ai-tools:generate_narration] Generating narration for house manual: ${houseManualId}`);

  // Get ElevenLabs API key
  const elevenlabsApiKey = Deno.env.get("ELEVENLABS_API_KEY");
  if (!elevenlabsApiKey) {
    throw new Error("ELEVENLABS_API_KEY not configured");
  }

  // Create narration record in database
  const { data: narration, error: createError } = await supabaseClient
    .from("narration")
    .insert({
      House_Manual: houseManualId,
      Visit: visitId || null,
      Narration_Script: script,
      Narrator_data: narratorId,
      is_it_narration: true,
      is_it_jingle: false,
      "Created By": userId,
    })
    .select()
    .single();

  if (createError || !narration) {
    console.error("[ai-tools:generate_narration] Failed to create narration record:", createError);
    throw new Error("Failed to create narration record");
  }

  console.log(`[ai-tools:generate_narration] Created narration record: ${narration._id}`);

  // Call ElevenLabs API to generate audio
  // NOTE: ElevenLabs API endpoint and request format would go here
  // For now, this is a placeholder that returns a mock URL
  // Real implementation would call:
  // POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}

  console.log("[ai-tools:generate_narration] ElevenLabs API integration pending");
  console.log("[ai-tools:generate_narration] Script:", script.substring(0, 100) + "...");

  // Mock audio URL for now (replace with real ElevenLabs API call)
  const mockAudioUrl = `https://mock-elevenlabs.com/audio/${narration._id}.mp3`;

  // Update narration with audio URL
  const { error: updateError } = await supabaseClient
    .from("narration")
    .update({
      Narration_Audio: mockAudioUrl,
    })
    .eq("_id", narration._id);

  if (updateError) {
    console.error("[ai-tools:generate_narration] Failed to update narration audio URL:", updateError);
  }

  return {
    narrationId: narration._id,
    audioUrl: mockAudioUrl,
    status: "completed",
    message: "Narration generated (ElevenLabs API integration pending)",
  };
}
