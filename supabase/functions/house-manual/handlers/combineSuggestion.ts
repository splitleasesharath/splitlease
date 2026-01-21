/**
 * Combine Suggestion Handler
 *
 * Accepts an AI suggestion with user-modified combined content.
 * Allows users to merge AI-generated text with existing content.
 *
 * @module house-manual/handlers/combineSuggestion
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ValidationError } from "../../_shared/errors.ts";

interface CombineSuggestionPayload {
  suggestionId: string;
  combinedContent: string;
}

interface HandlerContext {
  userId: string;
  supabaseClient: SupabaseClient;
  payload: CombineSuggestionPayload;
}

interface CombineSuggestionResult {
  success: boolean;
  suggestionId: string;
  appliedField: string;
  houseManualId: string;
}

/**
 * Combine an AI suggestion with edited content and apply to house manual
 *
 * Similar to accept, but allows user to provide modified content that
 * combines the AI suggestion with existing content.
 *
 * 1. Mark suggestion as processing
 * 2. Update suggestion with combined content
 * 3. Apply combined content to house manual field
 * 4. Queue for Bubble sync
 * 5. Mark suggestion as combined
 */
export async function handleCombineSuggestion(
  context: HandlerContext
): Promise<CombineSuggestionResult> {
  const { supabaseClient, payload, userId } = context;
  const { suggestionId, combinedContent } = payload;

  // Validate input
  if (!suggestionId || typeof suggestionId !== "string") {
    throw new ValidationError("suggestionId is required and must be a string");
  }

  if (!combinedContent || typeof combinedContent !== "string") {
    throw new ValidationError("combinedContent is required and must be a string");
  }

  if (combinedContent.trim().length === 0) {
    throw new ValidationError("combinedContent cannot be empty");
  }

  console.log(`[combineSuggestion] Processing suggestion: ${suggestionId}`);

  // Step 1: Mark suggestion as processing
  const { error: updateError1 } = await supabaseClient
    .from("zat_aisuggestions")
    .update({
      "being processed?": true,
      "Modified Date": new Date().toISOString(),
    })
    .eq("_id", suggestionId);

  if (updateError1) {
    console.error(`[combineSuggestion] Failed to mark as processing:`, updateError1);
    throw new Error(`Failed to mark suggestion as processing: ${updateError1.message}`);
  }

  // Step 2: Fetch suggestion details and update with combined content
  const { data: suggestion, error: fetchError } = await supabaseClient
    .from("zat_aisuggestions")
    .select("*")
    .eq("_id", suggestionId)
    .single();

  if (fetchError || !suggestion) {
    console.error(`[combineSuggestion] Suggestion not found:`, fetchError);
    throw new ValidationError(`Suggestion not found: ${suggestionId}`);
  }

  const fieldName = suggestion["Field suggested house manual"];
  const houseManualId = suggestion["House Manual"];

  if (!fieldName || !houseManualId) {
    throw new ValidationError("Suggestion is missing required fields");
  }

  // Update suggestion with combined content
  const { error: contentUpdateError } = await supabaseClient
    .from("zat_aisuggestions")
    .update({
      Content: combinedContent,
      "Modified Date": new Date().toISOString(),
    })
    .eq("_id", suggestionId);

  if (contentUpdateError) {
    console.error(`[combineSuggestion] Failed to update content:`, contentUpdateError);
    // Reset processing flag
    await supabaseClient
      .from("zat_aisuggestions")
      .update({ "being processed?": false })
      .eq("_id", suggestionId);
    throw new Error(`Failed to update suggestion content: ${contentUpdateError.message}`);
  }

  console.log(`[combineSuggestion] Applying combined content to field "${fieldName}"`);

  // Step 3: Apply combined content to house manual field
  const { error: applyError } = await supabaseClient
    .from("housemanual")
    .update({
      [fieldName]: combinedContent,
      "Modified Date": new Date().toISOString(),
    })
    .eq("_id", houseManualId);

  if (applyError) {
    console.error(`[combineSuggestion] Failed to apply content:`, applyError);
    // Reset processing flag on failure
    await supabaseClient
      .from("zat_aisuggestions")
      .update({ "being processed?": false })
      .eq("_id", suggestionId);
    throw new Error(`Failed to apply combined content: ${applyError.message}`);
  }

  // Step 4: Queue for Bubble sync
  const { error: syncError } = await supabaseClient
    .from("sync_queue")
    .insert({
      table_name: "housemanual",
      record_id: houseManualId,
      operation: "UPDATE",
      payload: { [fieldName]: combinedContent },
      created_by: userId,
    });

  if (syncError) {
    console.warn(`[combineSuggestion] Sync queue insert failed (non-blocking):`, syncError);
  }

  // Step 5: Mark suggestion as combined and complete
  const { error: updateError2 } = await supabaseClient
    .from("zat_aisuggestions")
    .update({
      decision: "combined",
      "being processed?": false,
      "Modified Date": new Date().toISOString(),
    })
    .eq("_id", suggestionId);

  if (updateError2) {
    console.error(`[combineSuggestion] Failed to mark as combined:`, updateError2);
  }

  console.log(`[combineSuggestion] Successfully applied combined content for ${suggestionId}`);

  return {
    success: true,
    suggestionId,
    appliedField: fieldName,
    houseManualId,
  };
}

export default handleCombineSuggestion;
