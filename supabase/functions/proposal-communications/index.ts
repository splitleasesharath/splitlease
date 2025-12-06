/**
 * Proposal Communications Edge Function - PLACEHOLDER
 * Split Lease - Supabase Edge Functions
 *
 * This is a placeholder for the async communications workflow.
 *
 * When implemented, this function will handle:
 * - Thread management (create/update conversation threads)
 * - CTA assignment based on rental application status
 * - Email/SMS notifications to host and guest
 *
 * Mirrors Bubble workflow Steps 8-11, 19
 *
 * STATUS: PENDING IMPLEMENTATION
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { ValidationError, formatErrorResponse, getStatusCodeFromError } from "../_shared/errors.ts";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface CommunicationsPayload {
  proposal_id: string;
  guest_id: string;
  host_id: string;
  listing_id: string;
  status: string;
  has_rental_app: boolean;
  rental_app_submitted?: boolean;
}

// ─────────────────────────────────────────────────────────────
// Main Handler
// ─────────────────────────────────────────────────────────────

console.log("[proposal-communications] Edge Function started (PLACEHOLDER)");

Deno.serve(async (req: Request) => {
  console.log(`[proposal-communications] ========== REQUEST ==========`);
  console.log(`[proposal-communications] Method: ${req.method}`);

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

    console.log(`[proposal-communications] Action: ${action}`);

    if (!action || !payload) {
      throw new ValidationError("action and payload are required");
    }

    // ─────────────────────────────────────────────────────────
    // PLACEHOLDER: Log what would be done
    // ─────────────────────────────────────────────────────────

    const communicationsPayload = payload as CommunicationsPayload;

    console.log(`[proposal-communications] PLACEHOLDER - Would process:`);
    console.log(`  - Proposal ID: ${communicationsPayload.proposal_id}`);
    console.log(`  - Guest ID: ${communicationsPayload.guest_id}`);
    console.log(`  - Host ID: ${communicationsPayload.host_id}`);
    console.log(`  - Has Rental App: ${communicationsPayload.has_rental_app}`);
    console.log(`  - Rental App Submitted: ${communicationsPayload.rental_app_submitted}`);

    // Determine what CTA would be used
    let cta: string;
    if (communicationsPayload.has_rental_app && communicationsPayload.rental_app_submitted) {
      cta = "see_proposal";
      console.log(`  - CTA: "See Proposal" (rental app submitted)`);
    } else {
      cta = "fill_application";
      console.log(`  - CTA: "Fill Application" (rental app not submitted)`);
    }

    // Determine thread action
    // In the actual implementation:
    // - Check if thread exists between guest and host
    // - If exists: update thread with CTA
    // - If not exists: create new thread with CTA

    console.log(`[proposal-communications] PLACEHOLDER - Thread management:`);
    console.log(`  - Would check for existing thread between guest and host`);
    console.log(`  - Would create/update thread with CTA: ${cta}`);

    console.log(`[proposal-communications] PLACEHOLDER - Notifications:`);
    console.log(`  - Would send notification to host about new proposal`);
    console.log(`  - Would send confirmation to guest`);

    // Return placeholder success
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          message: "PLACEHOLDER: Communications workflow not yet implemented",
          proposal_id: communicationsPayload.proposal_id,
          cta_determined: cta,
          todo: [
            "Implement thread lookup/creation",
            "Implement CTA assignment",
            "Implement email notifications",
            "Implement SMS notifications",
          ],
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error(`[proposal-communications] ========== ERROR ==========`);
    console.error(`[proposal-communications]`, error);

    const statusCode = getStatusCodeFromError(error as Error);
    const errorResponse = formatErrorResponse(error as Error);

    return new Response(JSON.stringify(errorResponse), {
      status: statusCode,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
