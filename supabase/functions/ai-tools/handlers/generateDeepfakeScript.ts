/**
 * Handler: Generate Deepfake Script
 * Uses AI Gateway to generate a welcome video script from house manual data
 */

import { HandlerContext } from "../index.ts";
import { ValidationError } from "../../_shared/errors.ts";

export async function handleGenerateDeepfakeScript(context: HandlerContext) {
  const { supabaseClient, payload } = context;
  const { houseManualId, deepfakeId } = payload;

  if (!houseManualId) {
    throw new ValidationError("houseManualId is required");
  }

  console.log(`[ai-tools:generate_deepfake_script] Generating script for house manual: ${houseManualId}`);

  // Fetch house manual data
  const { data: manual, error: manualError } = await supabaseClient
    .from("housemanual")
    .select("*")
    .eq("id", houseManualId)
    .single();

  if (manualError || !manual) {
    throw new ValidationError("House manual not found");
  }

  // Call AI Gateway to generate script
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
          promptName: "deepfake-script",
          variables: {
            houseManual: manual,
          },
        },
      }),
    }
  );

  if (!aiGatewayResponse.ok) {
    const error = await aiGatewayResponse.text();
    console.error("[ai-tools:generate_deepfake_script] AI Gateway error:", error);
    throw new Error("Failed to generate script via AI Gateway");
  }

  const aiResult = await aiGatewayResponse.json();
  const script = aiResult.data?.completion || aiResult.data?.text || "";

  if (!script) {
    throw new Error("AI Gateway returned empty script");
  }

  // Update deepfake record if deepfakeId provided
  if (deepfakeId) {
    const { error: updateError } = await supabaseClient
      .from("heygen_deepfake")
      .update({ script })
      .eq("id", deepfakeId);

    if (updateError) {
      console.error("[ai-tools:generate_deepfake_script] Failed to update deepfake:", updateError);
    }
  }

  console.log(`[ai-tools:generate_deepfake_script] Generated script (${script.length} chars)`);

  return {
    script,
    characterCount: script.length,
  };
}
