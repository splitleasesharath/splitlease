/**
 * AI Gateway Edge Function
 * Split Lease - Supabase Edge Functions
 *
 * Routes AI requests to appropriate handlers
 * Supports dynamic prompts with variable interpolation
 *
 * NO FALLBACK PRINCIPLE: All errors fail fast without fallback logic
 *
 * Supported Actions:
 * - complete: Non-streaming completion
 * - stream: SSE streaming completion
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { AIGatewayRequest } from "../_shared/aiTypes.ts";
import {
  ValidationError,
  formatErrorResponse,
  getStatusCodeFromError,
} from "../_shared/errors.ts";
import { validateRequired, validateAction } from "../_shared/validation.ts";
import { createErrorCollector, ErrorCollector } from "../_shared/slack.ts";

import { handleComplete } from "./handlers/complete.ts";
import { handleStream } from "./handlers/stream.ts";

// Import prompt registry to register all prompts
import "./prompts/_registry.ts";

// ─────────────────────────────────────────────────────────────
// Allowed actions
// ─────────────────────────────────────────────────────────────

const ALLOWED_ACTIONS = ["complete", "stream"];

// Prompts that don't require authentication (public prompts)
const PUBLIC_PROMPTS = ["listing-description", "listing-title", "echo-test"];

// ─────────────────────────────────────────────────────────────
// Main Handler
// ─────────────────────────────────────────────────────────────

console.log("[ai-gateway] Edge Function started");

Deno.serve(async (req: Request) => {
  console.log(`[ai-gateway] ========== REQUEST ==========`);
  console.log(`[ai-gateway] Method: ${req.method}`);

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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // ─────────────────────────────────────────────────────────
    // 1. Parse and validate request first (need prompt_key for auth decision)
    // ─────────────────────────────────────────────────────────

    const body: AIGatewayRequest = await req.json();

    validateRequired(body.action, "action");
    validateRequired(body.payload, "payload");
    validateRequired(body.payload.prompt_key, "payload.prompt_key");
    validateAction(body.action, ALLOWED_ACTIONS);

    console.log(`[ai-gateway] Action: ${body.action}`);
    console.log(`[ai-gateway] Prompt: ${body.payload.prompt_key}`);

    // Create error collector after we know the action
    collector = createErrorCollector('ai-gateway', `${body.action}:${body.payload.prompt_key}`);

    const isPublicPrompt = PUBLIC_PROMPTS.includes(body.payload.prompt_key);

    // ─────────────────────────────────────────────────────────
    // 2. Authenticate user (skip for public prompts)
    // ─────────────────────────────────────────────────────────

    let user = null;

    if (!isPublicPrompt) {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        throw new ValidationError("Missing Authorization header");
      }

      // Client for auth validation
      const authClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });

      const {
        data: { user: authUser },
        error: authError,
      } = await authClient.auth.getUser();

      if (authError || !authUser) {
        console.error(`[ai-gateway] Auth failed:`, authError?.message);
        throw new ValidationError("Invalid or expired token");
      }

      user = authUser;
      console.log(`[ai-gateway] Authenticated: ${user.email}`);
      collector.setContext({ userId: user.id });
    } else {
      console.log(`[ai-gateway] Public prompt - skipping authentication`);
    }

    // Service client for data operations (bypasses RLS)
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // ─────────────────────────────────────────────────────────
    // 3. Route to handler
    // ─────────────────────────────────────────────────────────

    const context = {
      user,
      serviceClient,
      request: body,
    };

    switch (body.action) {
      case "complete":
        return await handleComplete(context);

      case "stream":
        return await handleStream(context);

      default:
        throw new ValidationError(`Unhandled action: ${body.action}`);
    }
  } catch (error) {
    console.error(`[ai-gateway] ========== ERROR ==========`);
    console.error(`[ai-gateway]`, error);

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
