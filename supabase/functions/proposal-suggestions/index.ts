/**
 * Proposal Suggestions Edge Function - PLACEHOLDER
 * Split Lease - Supabase Edge Functions
 *
 * This is a placeholder for the async suggestions workflow.
 *
 * When implemented, this function will handle:
 * - Perfect weekly match suggestions (finding complementary schedules)
 * - Same address suggestions (other listings at the same address)
 *
 * Mirrors Bubble workflow Steps 25-26
 *
 * STATUS: PENDING IMPLEMENTATION
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { ValidationError, formatErrorResponse, getStatusCodeFromError } from "../_shared/errors.ts";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface SuggestionsPayload {
  proposal_id: string;
  listing_id: string;
  guest_id: string;
  days_selected: number[];
  nights_selected: number[];
  move_in_start_range: string;
  move_in_end_range: string;
}

// ─────────────────────────────────────────────────────────────
// Main Handler
// ─────────────────────────────────────────────────────────────

console.log("[proposal-suggestions] Edge Function started (PLACEHOLDER)");

Deno.serve(async (req: Request) => {
  console.log(`[proposal-suggestions] ========== REQUEST ==========`);
  console.log(`[proposal-suggestions] Method: ${req.method}`);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  // Only POST allowed
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ success: false, error: "Method not allowed" }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  try {
    const body = await req.json();
    const { action, payload } = body;

    console.log(`[proposal-suggestions] Action: ${action}`);

    if (!action || !payload) {
      throw new ValidationError("action and payload are required");
    }

    // ─────────────────────────────────────────────────────────
    // PLACEHOLDER: Log what would be done
    // ─────────────────────────────────────────────────────────

    const suggestionsPayload = payload as SuggestionsPayload;

    console.log(`[proposal-suggestions] PLACEHOLDER - Would process:`);
    console.log(`  - Proposal ID: ${suggestionsPayload.proposal_id}`);
    console.log(`  - Listing ID: ${suggestionsPayload.listing_id}`);
    console.log(`  - Guest ID: ${suggestionsPayload.guest_id}`);
    console.log(`  - Days Selected: ${suggestionsPayload.days_selected?.join(", ")}`);
    console.log(`  - Nights Selected: ${suggestionsPayload.nights_selected?.join(", ")}`);

    // Calculate complementary nights (nights NOT selected by guest)
    const allNights = [1, 2, 3, 4, 5, 6, 7];
    const complementaryNights = allNights.filter(
      (n) => !suggestionsPayload.nights_selected?.includes(n)
    );

    console.log(`[proposal-suggestions] PLACEHOLDER - Weekly Match Suggestions:`);
    console.log(`  - Would search for listings with nights: ${complementaryNights.join(", ")}`);
    console.log(`  - Would filter by same location/borough`);
    console.log(`  - Would create suggestion proposals for matches`);

    console.log(`[proposal-suggestions] PLACEHOLDER - Same Address Suggestions:`);
    console.log(`  - Would search for other listings at same address`);
    console.log(`  - Would filter by availability matching guest's dates`);
    console.log(`  - Would create suggestion proposals for matches`);

    // Return placeholder success
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          message: "PLACEHOLDER: Suggestions workflow not yet implemented",
          proposal_id: suggestionsPayload.proposal_id,
          complementary_nights: complementaryNights,
          todo: [
            "Implement weekly match query",
            "Implement same address query",
            "Create suggestion proposals with origin_proposal_id link",
            "Trigger communications for suggestions",
          ],
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error(`[proposal-suggestions] ========== ERROR ==========`);
    console.error(`[proposal-suggestions]`, error);

    const statusCode = getStatusCodeFromError(error as Error);
    const errorResponse = formatErrorResponse(error as Error);

    return new Response(JSON.stringify(errorResponse), {
      status: statusCode,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
