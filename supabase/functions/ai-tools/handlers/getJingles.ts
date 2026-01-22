/**
 * Handler: Get Jingles
 * Returns all jingles (narrations with is_it_jingle=true) for a house manual
 */

import { HandlerContext } from "../index.ts";
import { ValidationError } from "../../_shared/errors.ts";

export async function handleGetJingles(context: HandlerContext) {
  const { supabaseClient, payload } = context;
  const { houseManualId } = payload;

  if (!houseManualId) {
    throw new ValidationError("houseManualId is required");
  }

  console.log(`[ai-tools:get_jingles] Fetching jingles for house manual: ${houseManualId}`);

  // Query narration table for jingles (is_it_jingle = true)
  const { data, error } = await supabaseClient
    .from("narration")
    .select("*")
    .eq("House_Manual", houseManualId)
    .eq("is_it_jingle", true)
    .order("Created Date", { ascending: false });

  if (error) {
    console.error("[ai-tools:get_jingles] Database error:", error);
    throw new Error(`Failed to fetch jingles: ${error.message}`);
  }

  console.log(`[ai-tools:get_jingles] Found ${data.length} jingles`);

  return {
    jingles: data || [],
    count: data?.length || 0,
  };
}
