/**
 * Handler: Generate Narration Script
 * Uses AI Gateway to generate narration script for a visit
 */

import { HandlerContext } from "../index.ts";
import { ValidationError } from "../../_shared/errors.ts";

export async function handleGenerateNarrationScript(context: HandlerContext) {
  const { supabaseClient, payload } = context;
  const { houseManualId, visitId, narratorId } = payload;

  if (!houseManualId) {
    throw new ValidationError("houseManualId is required");
  }

  console.log(`[ai-tools:generate_narration_script] Generating narration script for house manual: ${houseManualId}`);

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

  // Call AI Gateway to generate narration script
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
          promptName: "narration-script",
          variables: {
            houseManual: manual,
            visit: visit || {},
            narratorId: narratorId || "david-attenborough",
          },
        },
      }),
    }
  );

  if (!aiGatewayResponse.ok) {
    const error = await aiGatewayResponse.text();
    console.error("[ai-tools:generate_narration_script] AI Gateway error:", error);
    throw new Error("Failed to generate narration script via AI Gateway");
  }

  const aiResult = await aiGatewayResponse.json();
  const script = aiResult.data?.completion || aiResult.data?.text || "";

  if (!script) {
    throw new Error("AI Gateway returned empty script");
  }

  console.log(`[ai-tools:generate_narration_script] Generated script (${script.length} chars)`);

  return {
    script,
    characterCount: script.length,
  };
}
