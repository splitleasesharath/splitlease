/**
 * Get Narrations Handler
 * AI Tools Edge Function
 */

import { HandlerContext } from "../index.ts";
import { ValidationError } from "../../_shared/errors.ts";

export async function handleGetNarrations(context: HandlerContext) {
  const { supabaseClient, payload } = context;
  const houseManualId = payload.houseManualId as string;

  if (!houseManualId) {
    throw new ValidationError("houseManualId is required");
  }

  const { data, error } = await supabaseClient
    .from("narration")
    .select("*")
    .eq("House Manual", houseManualId)
    .eq("is it narration?", true)
    .order("Created Date", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch narrations: ${error.message}`);
  }

  return data || [];
}
