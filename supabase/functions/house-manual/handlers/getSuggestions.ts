/**
 * Get Suggestions Handler
 *
 * Fetches pending AI suggestions for a house manual along with the manual's
 * current state (progress, transcript availability).
 *
 * @module house-manual/handlers/getSuggestions
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ValidationError } from "../../_shared/errors.ts";

interface GetSuggestionsPayload {
  houseManualId: string;
}

interface HandlerContext {
  userId: string;
  supabaseClient: SupabaseClient;
  payload: GetSuggestionsPayload;
}

interface AISuggestion {
  _id: string;
  Content: string;
  "Previous Content": string | null;
  "Field suggested house manual": string;
  "Field suggested listing": string | null;
  "being processed?": boolean;
  decision: "pending" | "accepted" | "ignored" | "combined";
  "from call?": boolean;
  "from audio?": boolean;
  "from PDF?": boolean;
  "from google doc?": boolean;
  "from listing?": boolean;
  "from free text form?": boolean;
  "House Manual": string;
  "Created Date": string;
  "Modified Date": string;
}

interface HouseManual {
  _id: string;
  progress_stage: string;
  transcript: string | null;
  transcript_source: string | null;
  "AI suggestions creation ended?": boolean;
}

interface GetSuggestionsResult {
  houseManual: HouseManual | null;
  suggestions: AISuggestion[];
  pendingCount: number;
}

/**
 * Fetch pending AI suggestions for a house manual
 *
 * Returns:
 * - houseManual: Current state of the house manual (progress, transcript)
 * - suggestions: Array of non-ignored suggestions sorted by creation date
 * - pendingCount: Number of pending suggestions
 */
export async function handleGetSuggestions(
  context: HandlerContext
): Promise<GetSuggestionsResult> {
  const { supabaseClient, payload } = context;
  const { houseManualId } = payload;

  // Validate input
  if (!houseManualId || typeof houseManualId !== "string") {
    throw new ValidationError("houseManualId is required");
  }

  console.log(`[getSuggestions] Fetching suggestions for manual: ${houseManualId}`);

  // Fetch house manual with progress info
  const { data: houseManual, error: hmError } = await supabaseClient
    .from("housemanual")
    .select("_id, progress_stage, transcript, transcript_source, \"AI suggestions creation ended?\"")
    .eq("_id", houseManualId)
    .single();

  if (hmError) {
    console.error(`[getSuggestions] Error fetching house manual:`, hmError);
    throw new ValidationError(`House manual not found: ${houseManualId}`);
  }

  // Fetch non-ignored suggestions for this house manual
  // Ordered by creation date (oldest first for review workflow)
  const { data: suggestions, error: sugError } = await supabaseClient
    .from("zat_aisuggestions")
    .select("*")
    .eq("House Manual", houseManualId)
    .neq("decision", "ignored")
    .eq("being processed?", false)
    .order("Created Date", { ascending: true });

  if (sugError) {
    console.error(`[getSuggestions] Error fetching suggestions:`, sugError);
    throw new Error(`Failed to fetch suggestions: ${sugError.message}`);
  }

  const pendingCount = (suggestions || []).filter(
    (s: AISuggestion) => s.decision === "pending"
  ).length;

  console.log(
    `[getSuggestions] Found ${suggestions?.length || 0} suggestions (${pendingCount} pending)`
  );

  return {
    houseManual,
    suggestions: suggestions || [],
    pendingCount,
  };
}

export default handleGetSuggestions;
