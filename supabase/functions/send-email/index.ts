/**
 * Send Email Edge Function
 * Split Lease - Supabase Edge Functions
 *
 * Main router for email operations:
 * - send: Send templated email via SendGrid
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
  const sendgridApiKeyConfigured = !!Deno.env.get('SENDGRID_API_KEY');
  const sendgridEndpointConfigured = !!Deno.env.get('SENDGRID_EMAIL_ENDPOINT');
  const allConfigured = sendgridApiKeyConfigured && sendgridEndpointConfigured;

  return {
    status: allConfigured ? 'healthy' : 'unhealthy (missing secrets)',
    timestamp: new Date().toISOString(),
    actions: [...ALLOWED_ACTIONS],
    secrets: {
      SENDGRID_API_KEY: sendgridApiKeyConfigured,
      SENDGRID_EMAIL_ENDPOINT: sendgridEndpointConfigured,
    },
  };
}

// ─────────────────────────────────────────────────────────────
// Main Handler
// ─────────────────────────────────────────────────────────────

console.log("[send-email] Edge Function started");

Deno.serve(async (req: Request) => {
  console.log(`[send-email] ========== REQUEST ==========`);
  console.log(`[send-email] Method: ${req.method}`);

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

    console.log(`[send-email] Action: ${body.action}`);

    // Create error collector after we know the action
    collector = createErrorCollector('send-email', body.action);

    // ─────────────────────────────────────────────────────────
    // 2. Check authorization for send action
    // ─────────────────────────────────────────────────────────

    if (body.action === 'send') {
      const authHeader = req.headers.get("Authorization");

      // Templates that can be sent without user authentication
      // (anon key is still required via Supabase client - this only bypasses user auth check)
      const PUBLIC_TEMPLATES = [
        '1757433099447x202755280527849400', // Security 2 - Magic Login Link
      ];

      const templateId = body.payload?.template_id;
      const isPublicTemplate = PUBLIC_TEMPLATES.includes(templateId);

      if (!isPublicTemplate) {
        // Require authenticated user for non-public templates
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
          throw new AuthenticationError("Missing or invalid Authorization header. Use Bearer token.");
        }

        const token = authHeader.replace("Bearer ", "");
        if (!token) {
          throw new AuthenticationError("Empty Bearer token");
        }
      }

      console.log(`[send-email] Authorization: ${isPublicTemplate ? 'Public template (anon allowed)' : 'Bearer token present'}`);
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

    console.log(`[send-email] ========== SUCCESS ==========`);

    return new Response(JSON.stringify({ success: true, data: result }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(`[send-email] ========== ERROR ==========`);
    console.error(`[send-email]`, error);

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
