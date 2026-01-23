/**
 * Handler: Create Deepfake
 * Creates a new deepfake record in pending status
 */

import { HandlerContext } from "../index.ts";
import { ValidationError } from "../../_shared/errors.ts";

export async function handleCreateDeepfake(context: HandlerContext) {
  const { userId, supabaseClient, payload } = context;
  const { houseManualId } = payload;

  if (!houseManualId) {
    throw new ValidationError("houseManualId is required");
  }

  console.log(`[ai-tools:create_deepfake] Creating deepfake for house manual: ${houseManualId}`);

  // Verify house manual exists
  const { data: manual, error: manualError } = await supabaseClient
    .from("housemanual")
    .select("id")
    .eq("id", houseManualId)
    .single();

  if (manualError || !manual) {
    throw new ValidationError("House manual not found");
  }

  // Create new deepfake record
  const { data, error } = await supabaseClient
    .from("heygen_deepfake")
    .insert({
      house_manual_id: houseManualId,
      created_by: userId,
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    console.error("[ai-tools:create_deepfake] Database error:", error);
    throw new Error(`Failed to create deepfake: ${error.message}`);
  }

  console.log(`[ai-tools:create_deepfake] Created deepfake: ${data.id}`);

  return {
    deepfake: data,
  };
}
