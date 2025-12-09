/**
 * Listing Edge Function
 * Split Lease - Supabase Edge Functions
 *
 * Main router for listing operations:
 * - create: Create a new listing
 * - get: Get listing details
 * - submit: Full listing submission with all form data
 *
 * NO FALLBACK PRINCIPLE: All errors fail fast without fallback logic
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders } from "../_shared/cors.ts";
import {
  ValidationError,
  AuthenticationError,
  formatErrorResponse,
  getStatusCodeFromError,
} from "../_shared/errors.ts";
import { validateRequired, validateAction } from "../_shared/validation.ts";

import { handleCreate } from "./handlers/create.ts";
import { handleGet } from "./handlers/get.ts";
import { handleSubmit } from "./handlers/submit.ts";

// ─────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────

const ALLOWED_ACTIONS = ["create", "get", "submit"] as const;
// All listing actions are public (auth handled by Bubble workflow)
const PUBLIC_ACTIONS = ["create", "get"] as const;

type Action = (typeof ALLOWED_ACTIONS)[number];

interface RequestBody {
  action: Action;
  payload: Record<string, unknown>;
}

// ─────────────────────────────────────────────────────────────
// Main Handler
// ─────────────────────────────────────────────────────────────

console.log("[listing] Edge Function started");

Deno.serve(async (req: Request) => {
  console.log(`[listing] ========== REQUEST ==========`);
  console.log(`[listing] Method: ${req.method}`);

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
    // ─────────────────────────────────────────────────────────
    // 1. Parse and validate request
    // ─────────────────────────────────────────────────────────

    const body: RequestBody = await req.json();

    validateRequired(body.action, "action");
    validateRequired(body.payload, "payload");
    validateAction(body.action, [...ALLOWED_ACTIONS]);

    console.log(`[listing] Action: ${body.action}`);

    const isPublicAction = PUBLIC_ACTIONS.includes(
      body.action as (typeof PUBLIC_ACTIONS)[number]
    );

    // ─────────────────────────────────────────────────────────
    // 2. Check environment variables
    // ─────────────────────────────────────────────────────────

    const bubbleBaseUrl = Deno.env.get("BUBBLE_API_BASE_URL");
    const bubbleApiKey = Deno.env.get("BUBBLE_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!bubbleBaseUrl || !bubbleApiKey || !supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing required environment variables");
    }

    // ─────────────────────────────────────────────────────────
    // 3. Authenticate user for protected actions
    // ─────────────────────────────────────────────────────────

    if (!isPublicAction) {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        throw new AuthenticationError("Missing Authorization header");
      }

      // For now, we trust the auth header is valid
      // The submit action validates user via the payload (user_email)
      console.log(`[listing] Auth header present for protected action`);
    } else {
      console.log(`[listing] Public action - skipping authentication`);
    }

    // ─────────────────────────────────────────────────────────
    // 4. Route to handler
    // ─────────────────────────────────────────────────────────

    let result;

    switch (body.action) {
      case "create":
        result = await handleCreate(body.payload);
        break;

      case "get":
        result = await handleGet(body.payload);
        break;

      case "submit":
        result = await handleSubmit(body.payload);
        break;

      default:
        throw new ValidationError(`Unhandled action: ${body.action}`);
    }

    console.log(`[listing] ========== SUCCESS ==========`);

    return new Response(JSON.stringify({ success: true, data: result }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(`[listing] ========== ERROR ==========`);
    console.error(`[listing]`, error);

    const statusCode = getStatusCodeFromError(error as Error);
    const errorResponse = formatErrorResponse(error as Error);

    return new Response(JSON.stringify(errorResponse), {
      status: statusCode,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
