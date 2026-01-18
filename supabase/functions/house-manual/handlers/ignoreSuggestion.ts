/**
 * Ignore Suggestion Handler
 *
 * Marks an AI suggestion as ignored. The suggestion will no longer
 * appear in the pending suggestions list.
 *
 * @module house-manual/handlers/ignoreSuggestion
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ValidationError } from "../../_shared/errors.ts";

interface IgnoreSuggestionPayload {
  suggestionId: string;
}

interface HandlerContext {
  userId: string;
  supabaseClient: SupabaseClient;
  payload: IgnoreSuggestionPayload;
}

interface IgnoreSuggestionResult {
  success: boolean;
  suggestionId: string;
}

/**
 * Ignore an AI suggestion
 *
 * Simply marks the suggestion as ignored. Does not delete the record
 * so it can be recovered if needed.
 */
export async function handleIgnoreSuggestion(
  context: HandlerContext
): Promise<IgnoreSuggestionResult> {
  const { supabaseClient, payload } = context;
  const { suggestionId } = payload;

  // Validate input
  if (!suggestionId || typeof suggestionId !== "string") {
    throw new ValidationError("suggestionId is required and must be a string");
  }

  console.log(`[ignoreSuggestion] Ignoring suggestion: ${suggestionId}`);

  // Update suggestion decision to ignored
  const { data, error } = await supabaseClient
    .from("zat_aisuggestions")
    .update({
      decision: "ignored",
      "Modified Date": new Date().toISOString(),
    })
    .eq("_id", suggestionId)
    .select()
    .single();

  if (error) {
    console.error(`[ignoreSuggestion] Update failed:`, error);
    throw new Error(`Failed to ignore suggestion: ${error.message}`);
  }

  if (!data) {
    throw new ValidationError(`Suggestion not found: ${suggestionId}`);
  }

  console.log(`[ignoreSuggestion] Successfully ignored suggestion ${suggestionId}`);

  return {
    success: true,
    suggestionId,
  };
}

export default handleIgnoreSuggestion;
