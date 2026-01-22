/**
 * Get Deepfakes Handler
 * AI Tools Edge Function
 */

import { HandlerContext } from "../index.ts";
import { ValidationError } from "../../_shared/errors.ts";

export async function handleGetDeepfakes(context: HandlerContext) {
  const { supabaseClient, payload } = context;
  const houseManualId = payload.houseManualId as string;

  if (!houseManualId) {
    throw new ValidationError("houseManualId is required");
  }

  const { data, error } = await supabaseClient
    .from("heygen_deepfake")
    .select("*")
    .eq("house_manual_id", houseManualId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch deepfakes: ${error.message}`);
  }

  return data || [];
}
