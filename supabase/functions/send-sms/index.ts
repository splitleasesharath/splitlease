/**
 * Send SMS Edge Function
 * Split Lease - Supabase Edge Functions
 *
 * Main router for SMS operations:
 * - send: Send templated SMS via Twilio
 *
 * Authorization: Bearer token in Authorization header
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
import { createErrorCollector, ErrorCollector } from "../_shared/slack.ts";

import { handleSend } from "./handlers/send.ts";

// ─────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────

const ALLOWED_ACTIONS = ["send", "health"] as const;

type Action = (typeof ALLOWED_ACTIONS)[number];

interface RequestBody {
  action: Action;
  payload: Record<string, unknown>;
}

// ─────────────────────────────────────────────────────────────
// Health Check Handler
// ─────────────────────────────────────────────────────────────

function handleHealth(): { status: string; timestamp: string; actions: string[]; secrets: Record<string, boolean> } {
  const twilioAccountSidConfigured = !!Deno.env.get('TWILIO_ACCOUNT_SID');
  const twilioAuthTokenConfigured = !!Deno.env.get('TWILIO_AUTH_TOKEN');
  const twilioFromPhoneConfigured = !!Deno.env.get('TWILIO_FROM_PHONE');
  const allConfigured = twilioAccountSidConfigured && twilioAuthTokenConfigured;

  return {
    status: allConfigured ? 'healthy' : 'unhealthy (missing secrets)',
    timestamp: new Date().toISOString(),
    actions: [...ALLOWED_ACTIONS],
    secrets: {
      TWILIO_ACCOUNT_SID: twilioAccountSidConfigured,
      TWILIO_AUTH_TOKEN: twilioAuthTokenConfigured,
      TWILIO_FROM_PHONE: twilioFromPhoneConfigured,
    },
  };
}

// ─────────────────────────────────────────────────────────────
// Main Handler
// ─────────────────────────────────────────────────────────────

console.log("[send-sms] Edge Function started");

Deno.serve(async (req: Request) => {
  console.log(`[send-sms] ========== REQUEST ==========`);
  console.log(`[send-sms] Method: ${req.method}`);

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

  // Error collector for consolidated error reporting (ONE RUN = ONE LOG)
  let collector: ErrorCollector | null = null;

  try {
    // ─────────────────────────────────────────────────────────
    // 1. Parse and validate request
    // ─────────────────────────────────────────────────────────

    const body: RequestBody = await req.json();

    validateRequired(body.action, "action");
    validateAction(body.action, [...ALLOWED_ACTIONS]);

    console.log(`[send-sms] Action: ${body.action}`);

    // Create error collector after we know the action
    collector = createErrorCollector('send-sms', body.action);

    // ─────────────────────────────────────────────────────────
    // 2. Check authorization for send action
    // ─────────────────────────────────────────────────────────

    if (body.action === 'send') {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        throw new AuthenticationError("Missing or invalid Authorization header. Use Bearer token.");
      }

      // For now, we validate that a token is present
      // Future: Validate token against Supabase Auth or API key whitelist
      const token = authHeader.replace("Bearer ", "");
      if (!token) {
        throw new AuthenticationError("Empty Bearer token");
      }

      console.log(`[send-sms] Authorization header present`);
    }

    // ─────────────────────────────────────────────────────────
    // 3. Route to handler
    // ─────────────────────────────────────────────────────────

    let result;

    switch (body.action) {
      case "send":
        validateRequired(body.payload, "payload");
        result = await handleSend(body.payload);
        break;

      case "health":
        result = handleHealth();
        break;

      default:
        throw new ValidationError(`Unhandled action: ${body.action}`);
    }

    console.log(`[send-sms] ========== SUCCESS ==========`);

    return new Response(JSON.stringify({ success: true, data: result }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(`[send-sms] ========== ERROR ==========`);
    console.error(`[send-sms]`, error);

    // Report to Slack (ONE RUN = ONE LOG, fire-and-forget)
    if (collector) {
      collector.add(error as Error, 'Fatal error in main handler');
      collector.reportToSlack();
    }

    const statusCode = getStatusCodeFromError(error as Error);
    const errorResponse = formatErrorResponse(error as Error);

    return new Response(JSON.stringify(errorResponse), {
      status: statusCode,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
