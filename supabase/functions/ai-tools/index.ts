/**
 * AI Tools Edge Function
 * Split Lease - HeyGen, ElevenLabs, and Jingle Generation
 *
 * Routes AI tool requests to appropriate handlers
 *
 * NO FALLBACK PRINCIPLE: All errors fail fast without fallback logic
 *
 * Supported Actions:
 *
 * DEEPFAKE (HeyGen):
 * - create_deepfake: Create a deepfake record
 * - generate_deepfake_script: Generate script using AI
 * - generate_deepfake_video: Generate video via HeyGen API
 * - check_deepfake_status: Poll HeyGen for video status
 * - get_deepfake_url: Get final video URL
 * - attach_deepfake: Attach to house manual
 *
 * NARRATION (ElevenLabs):
 * - generate_narration_script: Generate narration script using AI
 * - generate_narration: Generate audio via ElevenLabs API
 * - attach_narration: Attach to visit
 *
 * JINGLE:
 * - generate_jingle_lyrics: Generate lyrics using AI
 * - create_jingle: Create jingle audio
 * - attach_jingle: Attach to house manual
 *
 * DATA:
 * - get_house_manuals: Get user's house manuals
 * - get_deepfakes: Get deepfakes for a house manual
 * - get_narrations: Get narrations for a house manual
 * - get_jingles: Get jingles for a house manual
 * - get_narrators: Get available narrator voices
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import {
  ValidationError,
  AuthenticationError,
} from "../_shared/errors.ts";

// Import handlers
import { handleGetHouseManuals } from "./handlers/getHouseManuals.ts";
import { handleGetDeepfakes } from "./handlers/getDeepfakes.ts";
import { handleGetNarrations } from "./handlers/getNarrations.ts";
import { handleGetJingles } from "./handlers/getJingles.ts";
import { handleGetNarrators } from "./handlers/getNarrators.ts";
import { handleCreateDeepfake } from "./handlers/createDeepfake.ts";
import { handleGenerateDeepfakeScript } from "./handlers/generateDeepfakeScript.ts";
import { handleGenerateDeepfakeVideo } from "./handlers/generateDeepfakeVideo.ts";
import { handleCheckDeepfakeStatus } from "./handlers/checkDeepfakeStatus.ts";
import { handleGetDeepfakeUrl } from "./handlers/getDeepfakeUrl.ts";
import { handleAttachDeepfake } from "./handlers/attachDeepfake.ts";
import { handleGenerateNarrationScript } from "./handlers/generateNarrationScript.ts";
import { handleGenerateNarration } from "./handlers/generateNarration.ts";
import { handleAttachNarration } from "./handlers/attachNarration.ts";
import { handleGenerateJingleLyrics } from "./handlers/generateJingleLyrics.ts";
import { handleCreateJingle } from "./handlers/createJingle.ts";
import { handleAttachJingle } from "./handlers/attachJingle.ts";

// ─────────────────────────────────────────────────────────────
// Configuration (Immutable)
// ─────────────────────────────────────────────────────────────

const ALLOWED_ACTIONS = [
  // Data fetching
  "get_house_manuals",
  "get_deepfakes",
  "get_narrations",
  "get_jingles",
  "get_narrators",
  // Deepfake actions
  "create_deepfake",
  "generate_deepfake_script",
  "generate_deepfake_video",
  "check_deepfake_status",
  "get_deepfake_url",
  "attach_deepfake",
  // Narration actions
  "generate_narration_script",
  "generate_narration",
  "attach_narration",
  // Jingle actions
  "generate_jingle_lyrics",
  "create_jingle",
  "attach_jingle",
] as const;

type Action = typeof ALLOWED_ACTIONS[number];

// Admin email whitelist
const ADMIN_EMAILS = [
  "sharath@splitlease.io",
  "admin@splitlease.io",
  "test@splitlease.io",
];

// Handler map (immutable record)
const handlers: Readonly<Record<Action, Function>> = {
  // Data fetching
  get_house_manuals: handleGetHouseManuals,
  get_deepfakes: handleGetDeepfakes,
  get_narrations: handleGetNarrations,
  get_jingles: handleGetJingles,
  get_narrators: handleGetNarrators,
  // Deepfake actions
  create_deepfake: handleCreateDeepfake,
  generate_deepfake_script: handleGenerateDeepfakeScript,
  generate_deepfake_video: handleGenerateDeepfakeVideo,
  check_deepfake_status: handleCheckDeepfakeStatus,
  get_deepfake_url: handleGetDeepfakeUrl,
  attach_deepfake: handleAttachDeepfake,
  // Narration actions
  generate_narration_script: handleGenerateNarrationScript,
  generate_narration: handleGenerateNarration,
  attach_narration: handleAttachNarration,
  // Jingle actions
  generate_jingle_lyrics: handleGenerateJingleLyrics,
  create_jingle: handleCreateJingle,
  attach_jingle: handleAttachJingle,
};

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface AiToolsRequest {
  action: Action;
  payload: Record<string, unknown>;
}

export interface HandlerContext {
  userId: string;
  userEmail: string;
  supabaseClient: SupabaseClient;
  payload: Record<string, unknown>;
}

// ─────────────────────────────────────────────────────────────
// Pure Functions
// ─────────────────────────────────────────────────────────────

/**
 * Validate action is in allowed list
 */
const isValidAction = (action: string): action is Action =>
  ALLOWED_ACTIONS.includes(action as Action);

/**
 * Check if user email is in admin whitelist
 */
const isAdminUser = (email: string): boolean =>
  ADMIN_EMAILS.some(admin => admin.toLowerCase() === email.toLowerCase());

/**
 * Format success response
 */
const formatSuccessResponse = (data: unknown): Response =>
  new Response(
    JSON.stringify({ success: true, data }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );

/**
 * Format error response
 */
const formatErrorResponse = (error: Error, status = 400): Response => {
  const isValidationError = error instanceof ValidationError;
  const isAuthError = error instanceof AuthenticationError;

  return new Response(
    JSON.stringify({
      success: false,
      error: error.message,
      code: isValidationError ? "VALIDATION_ERROR" :
            isAuthError ? "AUTH_ERROR" : "INTERNAL_ERROR",
    }),
    {
      status: isAuthError ? 401 : isValidationError ? 400 : status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
};

// ─────────────────────────────────────────────────────────────
// Main Handler
// ─────────────────────────────────────────────────────────────

console.log("[ai-tools] Edge Function started");

Deno.serve(async (req: Request) => {
  const correlationId = crypto.randomUUID().slice(0, 8);
  console.log(`[ai-tools] ========== REQUEST [${correlationId}] ==========`);

  try {
    // ─────────────────────────────────────────────────────────────
    // Step 1: Handle CORS preflight
    // ─────────────────────────────────────────────────────────────

    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (req.method !== "POST") {
      throw new ValidationError("Method not allowed. Use POST.");
    }

    // ─────────────────────────────────────────────────────────────
    // Step 2: Parse and validate request
    // ─────────────────────────────────────────────────────────────

    const body: AiToolsRequest = await req.json();
    const { action, payload } = body;

    console.log(`[ai-tools] Action: ${action}`);

    if (!action) {
      throw new ValidationError("action is required");
    }

    if (!isValidAction(action)) {
      throw new ValidationError(
        `Invalid action: ${action}. Allowed: ${ALLOWED_ACTIONS.join(", ")}`
      );
    }

    if (!payload) {
      throw new ValidationError("payload is required");
    }

    // ─────────────────────────────────────────────────────────────
    // Step 3: Authenticate user
    // ─────────────────────────────────────────────────────────────

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new AuthenticationError("Missing Authorization header");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    // Verify token with Supabase Auth
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await authClient.auth.getUser();

    if (authError || !user) {
      throw new AuthenticationError("Invalid or expired token");
    }

    const userEmail = user.email || "";
    console.log(`[ai-tools] Authenticated: ${userEmail}`);

    // ─────────────────────────────────────────────────────────────
    // Step 4: Verify admin access
    // ─────────────────────────────────────────────────────────────

    if (!isAdminUser(userEmail)) {
      throw new AuthenticationError("Access denied. Admin privileges required.");
    }

    console.log(`[ai-tools] Admin verified: ${userEmail}`);

    // Create service client for database operations
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // ─────────────────────────────────────────────────────────────
    // Step 5: Route to handler
    // ─────────────────────────────────────────────────────────────

    const handler = handlers[action];
    const context: HandlerContext = {
      userId: user.id,
      userEmail,
      supabaseClient,
      payload,
    };

    console.log(`[ai-tools] Routing to handler: ${action}`);

    const result = await handler(context);

    console.log(`[ai-tools] Handler completed successfully`);

    return formatSuccessResponse(result);

  } catch (error) {
    console.error(`[ai-tools] ========== ERROR [${correlationId}] ==========`);
    console.error(`[ai-tools]`, error);

    if (error instanceof ValidationError || error instanceof AuthenticationError) {
      return formatErrorResponse(error);
    }

    return formatErrorResponse(error as Error, 500);
  }
});
