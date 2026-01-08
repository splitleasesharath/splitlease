/**
 * Rental Application Edge Function
 * Split Lease - Supabase Edge Functions
 *
 * Main router for rental application operations:
 * - submit: Submit rental application form data
 * - get: Get existing application data
 * - upload: Upload supporting documents
 *
 * NO FALLBACK PRINCIPLE: All errors fail fast without fallback logic
 * SUPABASE ONLY: This function does NOT sync to Bubble
 *
 * FP ARCHITECTURE:
 * - Pure functions for validation, routing, and response formatting
 * - Immutable data structures (no let reassignment in orchestration)
 * - Side effects isolated to boundaries (entry/exit of handler)
 * - Result type for error propagation (exceptions only at outer boundary)
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  ValidationError,
  AuthenticationError,
} from "../_shared/errors.ts";

// FP Utilities
import { Result, ok, err } from "../_shared/fp/result.ts";
import {
  parseRequest,
  validateAction,
  routeToHandler,
  isPublicAction,
  getSupabaseConfig,
  formatSuccessResponse,
  formatErrorResponseHttp,
  formatCorsResponse,
  CorsPreflightSignal,
  extractAuthToken,
} from "../_shared/fp/orchestration.ts";
import { createErrorLog, addError, setAction, ErrorLog } from "../_shared/fp/errorLog.ts";
import { reportErrorLog } from "../_shared/slack.ts";

import { handleSubmit } from "./handlers/submit.ts";
import { handleGet } from "./handlers/get.ts";
import { handleUpload } from "./handlers/upload.ts";

// ─────────────────────────────────────────────────────────────
// Configuration (Immutable)
// ─────────────────────────────────────────────────────────────

const ALLOWED_ACTIONS = ["submit", "get", "upload"] as const;

// Submit, get, and upload are public to support legacy Bubble token users (user_id comes from payload)
const PUBLIC_ACTIONS: ReadonlySet<string> = new Set(["submit", "get", "upload"]);

type Action = typeof ALLOWED_ACTIONS[number];

// Handler map (immutable record) - replaces switch statement
const handlers: Readonly<Record<Action, Function>> = {
  submit: handleSubmit,
  get: handleGet,
  upload: handleUpload,
};

// ─────────────────────────────────────────────────────────────
// Pure Functions
// ─────────────────────────────────────────────────────────────

/**
 * Get user ID from JWT or payload
 * Public actions allow user_id from payload for legacy support
 */
const getUserId = async (
  headers: Headers,
  payload: Record<string, unknown>,
  supabaseUrl: string,
  supabaseAnonKey: string,
  requireAuth: boolean
): Promise<Result<string, AuthenticationError>> => {
  // For public actions, try payload first
  if (!requireAuth) {
    const payloadUserId = payload.user_id as string | undefined;
    if (payloadUserId) {
      return ok(payloadUserId);
    }
  }

  // Try JWT authentication
  const tokenResult = extractAuthToken(headers);
  if (!tokenResult.ok) {
    // For public actions, user_id in payload is acceptable
    if (!requireAuth) {
      return err(new AuthenticationError("User ID required (provide in payload or via JWT)"));
    }
    return tokenResult;
  }

  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: tokenResult.value } },
  });

  const { data: { user: authUser }, error: authError } = await authClient.auth.getUser();

  if (authError || !authUser) {
    // For public actions, fall back to payload user_id
    if (!requireAuth) {
      const payloadUserId = payload.user_id as string | undefined;
      if (payloadUserId) {
        return ok(payloadUserId);
      }
    }
    return err(new AuthenticationError("Invalid or expired token"));
  }

  return ok(authUser.id);
};

// ─────────────────────────────────────────────────────────────
// Effect Boundary (Side Effects Isolated Here)
// ─────────────────────────────────────────────────────────────

console.log("[rental-application] Edge Function started (FP mode)");

Deno.serve(async (req: Request) => {
  const correlationId = crypto.randomUUID().slice(0, 8);
  let errorLog: ErrorLog = createErrorLog('rental-application', 'unknown', correlationId);

  try {
    console.log(`[rental-application] ========== REQUEST ==========`);
    console.log(`[rental-application] Method: ${req.method}`);

    const parseResult = await parseRequest(req);

    if (!parseResult.ok) {
      if (parseResult.error instanceof CorsPreflightSignal) {
        return formatCorsResponse();
      }
      throw parseResult.error;
    }

    const { action, payload, headers } = parseResult.value;
    errorLog = setAction(errorLog, action);
    console.log(`[rental-application] Action: ${action}`);

    const actionResult = validateAction(ALLOWED_ACTIONS, action);
    if (!actionResult.ok) {
      throw actionResult.error;
    }

    const configResult = getSupabaseConfig();
    if (!configResult.ok) {
      throw configResult.error;
    }
    const config = configResult.value;

    const requireAuth = !isPublicAction(PUBLIC_ACTIONS, action);
    const userIdResult = await getUserId(
      headers,
      payload,
      config.supabaseUrl,
      config.supabaseAnonKey,
      requireAuth
    );

    if (!userIdResult.ok) {
      throw userIdResult.error;
    }

    const userId = userIdResult.value;
    console.log(`[rental-application] Using user_id: ${userId}`);

    const supabaseAdmin = createClient(config.supabaseUrl, config.supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const handlerResult = routeToHandler(handlers, action);
    if (!handlerResult.ok) {
      throw handlerResult.error;
    }

    const handler = handlerResult.value;
    const result = await handler(payload, supabaseAdmin, userId);

    console.log(`[rental-application] ========== SUCCESS ==========`);

    return formatSuccessResponse(result);

  } catch (error) {
    console.error(`[rental-application] ========== ERROR ==========`);
    console.error(`[rental-application]`, error);

    errorLog = addError(errorLog, error as Error, 'Fatal error in main handler');
    reportErrorLog(errorLog);

    return formatErrorResponseHttp(error as Error);
  }
});

// ─────────────────────────────────────────────────────────────
// Exported Test Constants
// ─────────────────────────────────────────────────────────────

/**
 * Exported for testing purposes
 * @test
 */
export const __test__ = Object.freeze({
  // Configuration
  ALLOWED_ACTIONS,
  PUBLIC_ACTIONS,
  handlers,

  // Pure Functions
  getUserId,
});
