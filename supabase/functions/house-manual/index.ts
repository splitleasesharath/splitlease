/**
 * House Manual Edge Function
 * Split Lease - AI-Powered House Manual Creation
 *
 * Routes AI requests to appropriate handlers for house manual content extraction
 * and AI suggestions management.
 *
 * NO FALLBACK PRINCIPLE: All errors fail fast without fallback logic
 *
 * Supported Actions:
 *
 * CONTENT EXTRACTION:
 * - parse_text: Parse freeform text to structured house manual format
 * - transcribe_audio: Transcribe audio via Whisper API
 * - extract_wifi: Extract WiFi credentials from image via Vision API
 * - parse_document: Parse PDF files for house manual content
 * - parse_google_doc: Parse Google Doc URLs
 * - initiate_call: Start AI phone call for information gathering (Twilio)
 *
 * AI SUGGESTIONS:
 * - get_suggestions: Fetch pending AI suggestions for a house manual
 * - accept_suggestion: Accept and apply a single suggestion
 * - ignore_suggestion: Mark a suggestion as ignored
 * - combine_suggestion: Accept with user-edited combined content
 * - accept_all_suggestions: Batch accept all pending suggestions
 * - reuse_previous: Copy suggestions from a previous house manual
 *
 * GUEST VIEWER (Visit Reviewer House Manual):
 * - get_visit_manual: Fetch house manual for guest viewing (requires auth)
 * - validate_access_token: Validate magic link access token
 * - track_engagement: Track guest engagement (link_saw, map_saw, narration_heard)
 * - submit_review: Submit guest review with structured ratings
 *
 * FP ARCHITECTURE:
 * - Pure functions for validation, routing, and response formatting
 * - Immutable data structures
 * - Side effects isolated to boundaries
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import {
  ValidationError,
  AuthenticationError,
} from "../_shared/errors.ts";

// Import handlers
import { handleParseText } from "./handlers/parseText.ts";
import { handleTranscribeAudio } from "./handlers/transcribeAudio.ts";
import { handleExtractWifi } from "./handlers/extractWifi.ts";
import { handleParseDocument } from "./handlers/parseDocument.ts";
import { handleParseGoogleDoc } from "./handlers/parseGoogleDoc.ts";
import { handleInitiateCall } from "./handlers/initiateCall.ts";
// AI Suggestions handlers
import { handleGetSuggestions } from "./handlers/getSuggestions.ts";
import { handleAcceptSuggestion } from "./handlers/acceptSuggestion.ts";
import { handleIgnoreSuggestion } from "./handlers/ignoreSuggestion.ts";
import { handleCombineSuggestion } from "./handlers/combineSuggestion.ts";
import { handleAcceptAllSuggestions } from "./handlers/acceptAllSuggestions.ts";
import { handleReusePrevious } from "./handlers/reusePrevious.ts";
// Guest Viewer (Visit Reviewer) handlers
import { handleGetVisitManual } from "./handlers/getVisitManual.ts";
import { handleValidateAccessToken } from "./handlers/validateAccessToken.ts";
import { handleTrackEngagement } from "./handlers/trackEngagement.ts";
import { handleSubmitReview } from "./handlers/submitReview.ts";

// ─────────────────────────────────────────────────────────────
// Configuration (Immutable)
// ─────────────────────────────────────────────────────────────

const ALLOWED_ACTIONS = [
  // Content extraction actions
  "parse_text",
  "transcribe_audio",
  "extract_wifi",
  "parse_document",
  "parse_google_doc",
  "initiate_call",
  // AI Suggestions actions
  "get_suggestions",
  "accept_suggestion",
  "ignore_suggestion",
  "combine_suggestion",
  "accept_all_suggestions",
  "reuse_previous",
  // Guest Viewer (Visit Reviewer) actions
  "get_visit_manual",
  "validate_access_token",
  "track_engagement",
  "submit_review",
] as const;

type Action = typeof ALLOWED_ACTIONS[number];

// Handler map (immutable record)
const handlers: Readonly<Record<Action, Function>> = {
  // Content extraction handlers
  parse_text: handleParseText,
  transcribe_audio: handleTranscribeAudio,
  extract_wifi: handleExtractWifi,
  parse_document: handleParseDocument,
  parse_google_doc: handleParseGoogleDoc,
  initiate_call: handleInitiateCall,
  // AI Suggestions handlers
  get_suggestions: handleGetSuggestions,
  accept_suggestion: handleAcceptSuggestion,
  ignore_suggestion: handleIgnoreSuggestion,
  combine_suggestion: handleCombineSuggestion,
  accept_all_suggestions: handleAcceptAllSuggestions,
  reuse_previous: handleReusePrevious,
  // Guest Viewer (Visit Reviewer) handlers
  get_visit_manual: handleGetVisitManual,
  validate_access_token: handleValidateAccessToken,
  track_engagement: handleTrackEngagement,
  submit_review: handleSubmitReview,
};

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface HouseManualRequest {
  action: Action;
  payload: Record<string, unknown>;
}

interface HandlerContext {
  userId: string;
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

console.log("[house-manual] Edge Function started");

Deno.serve(async (req: Request) => {
  const correlationId = crypto.randomUUID().slice(0, 8);
  console.log(`[house-manual] ========== REQUEST [${correlationId}] ==========`);

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

    const body: HouseManualRequest = await req.json();
    const { action, payload } = body;

    console.log(`[house-manual] Action: ${action}`);

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

    console.log(`[house-manual] Authenticated: ${user.email}`);

    // Create service client for database operations
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // ─────────────────────────────────────────────────────────────
    // Step 4: Route to handler
    // ─────────────────────────────────────────────────────────────

    const handler = handlers[action];
    const context: HandlerContext = {
      userId: user.id,
      supabaseClient,
      payload,
    };

    console.log(`[house-manual] Routing to handler: ${action}`);

    const result = await handler(context);

    console.log(`[house-manual] Handler completed successfully`);

    return formatSuccessResponse(result);

  } catch (error) {
    console.error(`[house-manual] ========== ERROR [${correlationId}] ==========`);
    console.error(`[house-manual]`, error);

    if (error instanceof ValidationError || error instanceof AuthenticationError) {
      return formatErrorResponse(error);
    }

    return formatErrorResponse(error as Error, 500);
  }
});
