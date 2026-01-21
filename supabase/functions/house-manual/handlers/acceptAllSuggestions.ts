/**
 * Accept All Suggestions Handler
 *
 * Batch accepts all pending AI suggestions for a house manual.
 * Applies each suggestion to its target field in sequence.
 *
 * @module house-manual/handlers/acceptAllSuggestions
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ValidationError } from "../../_shared/errors.ts";

interface AcceptAllSuggestionsPayload {
  houseManualId: string;
}

interface HandlerContext {
  userId: string;
  supabaseClient: SupabaseClient;
  payload: AcceptAllSuggestionsPayload;
}

interface AcceptResult {
  suggestionId: string;
  field: string;
  success: boolean;
  error?: string;
}

interface AcceptAllSuggestionsResult {
  success: boolean;
  houseManualId: string;
  totalProcessed: number;
  successCount: number;
  failedCount: number;
  results: AcceptResult[];
}

/**
 * Accept all pending AI suggestions for a house manual
 *
 * 1. Fetch all pending suggestions
 * 2. Process each suggestion in sequence
 * 3. Return summary of results
 */
export async function handleAcceptAllSuggestions(
  context: HandlerContext
): Promise<AcceptAllSuggestionsResult> {
  const { supabaseClient, payload, userId } = context;
  const { houseManualId } = payload;

  // Validate input
  if (!houseManualId || typeof houseManualId !== "string") {
    throw new ValidationError("houseManualId is required and must be a string");
  }

  console.log(`[acceptAllSuggestions] Processing all suggestions for: ${houseManualId}`);

  // Fetch all pending suggestions
  const { data: suggestions, error: fetchError } = await supabaseClient
    .from("zat_aisuggestions")
    .select("*")
    .eq("House Manual", houseManualId)
    .eq("decision", "pending")
    .eq("being processed?", false)
    .order("Created Date", { ascending: true });

  if (fetchError) {
    console.error(`[acceptAllSuggestions] Failed to fetch suggestions:`, fetchError);
    throw new Error(`Failed to fetch suggestions: ${fetchError.message}`);
  }

  if (!suggestions || suggestions.length === 0) {
    console.log(`[acceptAllSuggestions] No pending suggestions found`);
    return {
      success: true,
      houseManualId,
      totalProcessed: 0,
      successCount: 0,
      failedCount: 0,
      results: [],
    };
  }

  console.log(`[acceptAllSuggestions] Found ${suggestions.length} pending suggestions`);

  // Collect all field updates for batch application
  const fieldUpdates: Record<string, string> = {};
  const results: AcceptResult[] = [];

  // Process each suggestion
  for (const suggestion of suggestions) {
    const suggestionId = suggestion._id;
    const fieldName = suggestion["Field suggested house manual"];
    const content = suggestion.Content;

    if (!fieldName || !content) {
      results.push({
        suggestionId,
        field: fieldName || "unknown",
        success: false,
        error: "Missing field name or content",
      });
      continue;
    }

    // Mark as processing
    const { error: processingError } = await supabaseClient
      .from("zat_aisuggestions")
      .update({
        "being processed?": true,
        "Modified Date": new Date().toISOString(),
      })
      .eq("_id", suggestionId);

    if (processingError) {
      results.push({
        suggestionId,
        field: fieldName,
        success: false,
        error: `Failed to mark as processing: ${processingError.message}`,
      });
      continue;
    }

    // Accumulate field updates (later suggestions for same field win)
    fieldUpdates[fieldName] = content;

    // Mark as accepted
    const { error: acceptError } = await supabaseClient
      .from("zat_aisuggestions")
      .update({
        decision: "accepted",
        "being processed?": false,
        "Modified Date": new Date().toISOString(),
      })
      .eq("_id", suggestionId);

    if (acceptError) {
      results.push({
        suggestionId,
        field: fieldName,
        success: false,
        error: `Failed to mark as accepted: ${acceptError.message}`,
      });
    } else {
      results.push({
        suggestionId,
        field: fieldName,
        success: true,
      });
    }
  }

  // Apply all field updates to house manual in one operation
  if (Object.keys(fieldUpdates).length > 0) {
    const { error: applyError } = await supabaseClient
      .from("housemanual")
      .update({
        ...fieldUpdates,
        "Modified Date": new Date().toISOString(),
      })
      .eq("_id", houseManualId);

    if (applyError) {
      console.error(`[acceptAllSuggestions] Failed to apply updates:`, applyError);
      // Mark all as failed
      return {
        success: false,
        houseManualId,
        totalProcessed: suggestions.length,
        successCount: 0,
        failedCount: suggestions.length,
        results: results.map(r => ({
          ...r,
          success: false,
          error: r.error || `Batch apply failed: ${applyError.message}`,
        })),
      };
    }

    // Queue for Bubble sync
    const { error: syncError } = await supabaseClient
      .from("sync_queue")
      .insert({
        table_name: "housemanual",
        record_id: houseManualId,
        operation: "UPDATE",
        payload: fieldUpdates,
        created_by: userId,
      });

    if (syncError) {
      console.warn(`[acceptAllSuggestions] Sync queue insert failed (non-blocking):`, syncError);
    }
  }

  const successCount = results.filter(r => r.success).length;
  const failedCount = results.filter(r => !r.success).length;

  console.log(`[acceptAllSuggestions] Completed: ${successCount} success, ${failedCount} failed`);

  return {
    success: failedCount === 0,
    houseManualId,
    totalProcessed: suggestions.length,
    successCount,
    failedCount,
    results,
  };
}

export default handleAcceptAllSuggestions;
