/**
 * Accept Suggestion Handler
 *
 * Accepts an AI suggestion and applies its content to the house manual field.
 * Handles the following:
 * 1. Marks suggestion as processing
 * 2. Applies content to target field on house manual
 * 3. Queues for Bubble sync
 * 4. Marks suggestion as accepted
 *
 * @module house-manual/handlers/acceptSuggestion
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ValidationError } from "../../_shared/errors.ts";

interface AcceptSuggestionPayload {
  suggestionId: string;
}

interface HandlerContext {
  userId: string;
  supabaseClient: SupabaseClient;
  payload: AcceptSuggestionPayload;
}

interface AcceptSuggestionResult {
  success: boolean;
  suggestionId: string;
  appliedField: string;
  appliedContent: string;
}

/**
 * Accept an AI suggestion and apply to house manual
 */
export async function handleAcceptSuggestion(
  context: HandlerContext
): Promise<AcceptSuggestionResult> {
  const { supabaseClient, payload } = context;
  const { suggestionId } = payload;

  // Validate input
  if (!suggestionId || typeof suggestionId !== "string") {
    throw new ValidationError("suggestionId is required");
  }

  console.log(`[acceptSuggestion] Processing suggestion: ${suggestionId}`);

  // Step 1: Mark suggestion as processing and get its data
  const { data: suggestion, error: fetchError } = await supabaseClient
    .from("zat_aisuggestions")
    .select("*")
    .eq("_id", suggestionId)
    .single();

  if (fetchError || !suggestion) {
    console.error(`[acceptSuggestion] Suggestion not found:`, fetchError);
    throw new ValidationError(`Suggestion not found: ${suggestionId}`);
  }

  // Check if already processed
  if (suggestion.decision !== "pending") {
    throw new ValidationError(
      `Suggestion already processed with decision: ${suggestion.decision}`
    );
  }

  const fieldName = suggestion["Field suggested house manual"];
  const content = suggestion["Content"];
  const houseManualId = suggestion["House Manual"];

  if (!fieldName || !houseManualId) {
    throw new ValidationError("Suggestion missing required field or house manual reference");
  }

  console.log(`[acceptSuggestion] Applying to field "${fieldName}" on manual ${houseManualId}`);

  // Step 2: Mark suggestion as processing
  const { error: processingError } = await supabaseClient
    .from("zat_aisuggestions")
    .update({
      "being processed?": true,
      "Modified Date": new Date().toISOString(),
    })
    .eq("_id", suggestionId);

  if (processingError) {
    console.error(`[acceptSuggestion] Failed to mark as processing:`, processingError);
    throw new Error("Failed to start processing suggestion");
  }

  try {
    // Step 3: Apply content to house manual field
    const updatePayload: Record<string, unknown> = {
      [fieldName]: content,
      "Modified Date": new Date().toISOString(),
    };

    const { error: updateError } = await supabaseClient
      .from("housemanual")
      .update(updatePayload)
      .eq("_id", houseManualId);

    if (updateError) {
      console.error(`[acceptSuggestion] Failed to update house manual:`, updateError);
      // Rollback processing state
      await supabaseClient
        .from("zat_aisuggestions")
        .update({ "being processed?": false })
        .eq("_id", suggestionId);
      throw new Error(`Failed to apply suggestion: ${updateError.message}`);
    }

    // Step 4: Queue for Bubble sync
    const { error: syncError } = await supabaseClient
      .from("sync_queue")
      .insert({
        table_name: "housemanual",
        record_id: houseManualId,
        operation: "UPDATE",
        payload: { [fieldName]: content },
        status: "pending",
        created_at: new Date().toISOString(),
      });

    if (syncError) {
      // Log but don't fail - sync is non-critical
      console.error(`[acceptSuggestion] Failed to queue sync:`, syncError);
    }

    // Step 5: Mark suggestion as accepted
    const { error: completeError } = await supabaseClient
      .from("zat_aisuggestions")
      .update({
        decision: "accepted",
        "being processed?": false,
        "Modified Date": new Date().toISOString(),
      })
      .eq("_id", suggestionId);

    if (completeError) {
      console.error(`[acceptSuggestion] Failed to mark as accepted:`, completeError);
      // Non-critical - content was already applied
    }

    console.log(`[acceptSuggestion] Successfully applied suggestion to ${fieldName}`);

    return {
      success: true,
      suggestionId,
      appliedField: fieldName,
      appliedContent: content,
    };
  } catch (error) {
    // Ensure processing flag is cleared on any error
    await supabaseClient
      .from("zat_aisuggestions")
      .update({ "being processed?": false })
      .eq("_id", suggestionId);
    throw error;
  }
}

export default handleAcceptSuggestion;
