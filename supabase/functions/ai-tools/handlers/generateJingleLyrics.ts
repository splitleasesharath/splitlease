/**
 * Handler: Generate Jingle Lyrics
 * Uses AI Gateway to generate jingle lyrics
 */

import { HandlerContext } from "../index.ts";
import { ValidationError } from "../../_shared/errors.ts";

export async function handleGenerateJingleLyrics(context: HandlerContext) {
  const { supabaseClient, payload } = context;
  const { houseManualId, visitId, melodyPreference, contentPreferences } = payload;

  if (!houseManualId) {
    throw new ValidationError("houseManualId is required");
  }
  if (!melodyPreference) {
    throw new ValidationError("melodyPreference is required");
  }
  if (!contentPreferences || !Array.isArray(contentPreferences)) {
    throw new ValidationError("contentPreferences array is required");
  }

  console.log(`[ai-tools:generate_jingle_lyrics] Generating jingle lyrics for house manual: ${houseManualId}`);

  // Fetch house manual data
  const { data: manual, error: manualError } = await supabaseClient
    .from("housemanual")
    .select("*")
    .eq("id", houseManualId)
    .single();

  if (manualError || !manual) {
    throw new ValidationError("House manual not found");
  }

  // Fetch visit data if provided
  let visit = null;
  if (visitId) {
    const { data: visitData, error: visitError } = await supabaseClient
      .from("visit")
      .select("*")
      .eq("_id", visitId)
      .single();

    if (!visitError && visitData) {
      visit = visitData;
    }
  }

  // Call AI Gateway to generate jingle lyrics
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  const aiGatewayResponse = await fetch(
    `${supabaseUrl}/functions/v1/ai-gateway`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        action: "generate_prompt",
        payload: {
          promptName: "jingle-lyrics",
          variables: {
            houseManual: manual,
            visit: visit || {},
            melodyPreference,
            contentPreferences: contentPreferences.join(", "),
          },
        },
      }),
    }
  );

  if (!aiGatewayResponse.ok) {
    const error = await aiGatewayResponse.text();
    console.error("[ai-tools:generate_jingle_lyrics] AI Gateway error:", error);
    throw new Error("Failed to generate jingle lyrics via AI Gateway");
  }

  const aiResult = await aiGatewayResponse.json();
  const lyrics = aiResult.data?.completion || aiResult.data?.text || "";

  if (!lyrics) {
    throw new Error("AI Gateway returned empty lyrics");
  }

  console.log(`[ai-tools:generate_jingle_lyrics] Generated lyrics (${lyrics.length} chars)`);

  return {
    lyrics,
    characterCount: lyrics.length,
    melodyPreference,
    contentPreferences,
  };
}
