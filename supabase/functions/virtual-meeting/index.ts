/**
 * Virtual Meeting Edge Function
 * Split Lease - Supabase Edge Functions
 *
 * Main router for virtual meeting operations:
 * - create: Create a new virtual meeting request
 *
 * NO FALLBACK PRINCIPLE: All errors fail fast without fallback logic
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import {
  ValidationError,
  AuthenticationError,
  formatErrorResponse,
  getStatusCodeFromError,
} from "../_shared/errors.ts";
import { validateRequired, validateAction } from "../_shared/validation.ts";
import { createErrorCollector, ErrorCollector } from "../_shared/slack.ts";

import { handleCreate } from "./handlers/create.ts";
import { handleDelete } from "./handlers/delete.ts";

// ─────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────

const ALLOWED_ACTIONS = ["create", "delete"] as const;
// NOTE: 'create' and 'delete' are public until Supabase auth migration is complete
const PUBLIC_ACTIONS = ["create", "delete"] as const;

type Action = (typeof ALLOWED_ACTIONS)[number];

interface RequestBody {
  action: Action;
  payload: Record<string, unknown>;
}

// ─────────────────────────────────────────────────────────────
// Main Handler
// ─────────────────────────────────────────────────────────────

console.log("[virtual-meeting] Edge Function started");

Deno.serve(async (req: Request) => {
  console.log(`[virtual-meeting] ========== REQUEST ==========`);
  console.log(`[virtual-meeting] Method: ${req.method}`);

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
    validateRequired(body.payload, "payload");
    validateAction(body.action, [...ALLOWED_ACTIONS]);

    console.log(`[virtual-meeting] Action: ${body.action}`);

    // Create error collector after we know the action
    collector = createErrorCollector('virtual-meeting', body.action);

    const isPublicAction = PUBLIC_ACTIONS.includes(
      body.action as (typeof PUBLIC_ACTIONS)[number]
    );

    // ─────────────────────────────────────────────────────────
    // 2. Get environment variables
    // ─────────────────────────────────────────────────────────

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing required environment variables");
    }

    // ─────────────────────────────────────────────────────────
    // 3. Authenticate user (skip for public actions)
    // ─────────────────────────────────────────────────────────

    let user: { id: string; email: string } | null = null;

    if (!isPublicAction) {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        throw new AuthenticationError("Missing Authorization header");
      }

      // Client for auth validation
      const authClient = createClient(supabaseUrl, supabaseAnonKey!, {
        global: { headers: { Authorization: authHeader } },
      });

      const {
        data: { user: authUser },
        error: authError,
      } = await authClient.auth.getUser();

      if (authError || !authUser) {
        console.error(`[virtual-meeting] Auth failed:`, authError?.message);
        throw new AuthenticationError("Invalid or expired token");
      }

      user = { id: authUser.id, email: authUser.email || "" };
      console.log(`[virtual-meeting] Authenticated: ${user.email}`);
      collector.setContext({ userId: user.id });
    } else {
      console.log(`[virtual-meeting] Public action - skipping authentication`);
    }

    // Service client for data operations (bypasses RLS)
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // ─────────────────────────────────────────────────────────
    // 4. Route to handler
    // ─────────────────────────────────────────────────────────

    let result;

    switch (body.action) {
      case "create":
        result = await handleCreate(body.payload, user, serviceClient);
        break;

      case "delete":
        result = await handleDelete(body.payload, user, serviceClient);
        break;

      default:
        throw new ValidationError(`Unhandled action: ${body.action}`);
    }

    console.log(`[virtual-meeting] ========== SUCCESS ==========`);

    return new Response(JSON.stringify({ success: true, data: result }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(`[virtual-meeting] ========== ERROR ==========`);
    console.error(`[virtual-meeting]`, error);

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
