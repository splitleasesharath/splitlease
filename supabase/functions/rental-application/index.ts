/**
 * Rental Application Edge Function
 * Split Lease - Supabase Edge Functions
 *
 * Main router for rental application operations:
 * - submit: Submit rental application form data
 *
 * NO FALLBACK PRINCIPLE: All errors fail fast without fallback logic
 * SUPABASE ONLY: This function does NOT sync to Bubble
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

import { handleSubmit } from "./handlers/submit.ts";
import { handleGet } from "./handlers/get.ts";
import { handleUpload } from "./handlers/upload.ts";

// ─────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────

const ALLOWED_ACTIONS = ["submit", "get", "upload"] as const;
// Submit, get, and upload are public to support legacy Bubble token users (user_id comes from payload)
const PUBLIC_ACTIONS: string[] = ["submit", "get", "upload"];

type Action = (typeof ALLOWED_ACTIONS)[number];

interface RequestBody {
  action: Action;
  payload: Record<string, unknown>;
}

// ─────────────────────────────────────────────────────────────
// Main Handler
// ─────────────────────────────────────────────────────────────

console.log("[rental-application] Edge Function started");

Deno.serve(async (req: Request) => {
  console.log(`[rental-application] ========== REQUEST ==========`);
  console.log(`[rental-application] Method: ${req.method}`);

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

    console.log(`[rental-application] Action: ${body.action}`);

    // Create error collector after we know the action
    collector = createErrorCollector('rental-application', body.action);

    const isPublicAction = PUBLIC_ACTIONS.includes(body.action);

    // ─────────────────────────────────────────────────────────
    // 2. Check environment variables
    // ─────────────────────────────────────────────────────────

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing required environment variables");
    }

    // ─────────────────────────────────────────────────────────
    // 3. Authenticate user for protected actions
    // ─────────────────────────────────────────────────────────

    let userId: string | null = null;

    if (!isPublicAction) {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        throw new AuthenticationError("Missing Authorization header");
      }

      // Create Supabase client with user's token to get their ID
      const supabaseClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") || "", {
        global: {
          headers: { Authorization: authHeader },
        },
      });

      const { data: { user }, error: authError } = await supabaseClient.auth.getUser();

      if (authError || !user) {
        console.error(`[rental-application] Auth error:`, authError);
        throw new AuthenticationError("Invalid or expired token");
      }

      userId = user.id;
      console.log(`[rental-application] Authenticated user: ${userId}`);
    } else {
      console.log(`[rental-application] Public action - skipping authentication`);
    }

    // Create admin client for database operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
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
      case "submit":
        // For public action, get user_id from payload (supports legacy Bubble token users)
        const submitUserId = userId || (body.payload.user_id as string);
        if (!submitUserId) {
          throw new AuthenticationError("User ID required for submit action (provide in payload or via JWT)");
        }
        console.log(`[rental-application] Using user_id: ${submitUserId} (from ${userId ? 'JWT' : 'payload'})`);
        result = await handleSubmit(body.payload, supabaseAdmin, submitUserId);
        break;

      case "get":
        // For public action, get user_id from payload (supports legacy Bubble token users)
        const getUserId = userId || (body.payload.user_id as string);
        if (!getUserId) {
          throw new AuthenticationError("User ID required for get action (provide in payload or via JWT)");
        }
        console.log(`[rental-application] Using user_id: ${getUserId} (from ${userId ? 'JWT' : 'payload'})`);
        result = await handleGet(body.payload, supabaseAdmin, getUserId);
        break;

      case "upload":
        // For public action, get user_id from payload (supports legacy Bubble token users)
        const uploadUserId = userId || (body.payload.user_id as string);
        if (!uploadUserId) {
          throw new AuthenticationError("User ID required for upload action (provide in payload or via JWT)");
        }
        console.log(`[rental-application] Using user_id: ${uploadUserId} (from ${userId ? 'JWT' : 'payload'})`);
        result = await handleUpload(body.payload, supabaseAdmin, uploadUserId);
        break;

      default:
        throw new ValidationError(`Unhandled action: ${body.action}`);
    }

    console.log(`[rental-application] ========== SUCCESS ==========`);

    return new Response(JSON.stringify({ success: true, data: result }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(`[rental-application] ========== ERROR ==========`);
    console.error(`[rental-application]`, error);

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
