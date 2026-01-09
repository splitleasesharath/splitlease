/**
 * Date Change Request Edge Function
 * Split Lease - Supabase Edge Functions
 *
 * Main router for date change request operations:
 * - create: Create a new date change request
 * - get: Get date change requests for a lease
 * - accept: Accept a date change request
 * - decline: Decline a date change request
 * - cancel: Cancel own request
 * - get_throttle_status: Check if user is throttled
 *
 * NO FALLBACK PRINCIPLE: All errors fail fast without fallback logic
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
  AuthenticatedUser,
  extractAuthToken,
} from "../_shared/fp/orchestration.ts";
import { createErrorLog, addError, setUserId, setAction, ErrorLog } from "../_shared/fp/errorLog.ts";
import { reportErrorLog } from "../_shared/slack.ts";

import { handleCreate } from "./handlers/create.ts";
import { handleGet } from "./handlers/get.ts";
import { handleAccept } from "./handlers/accept.ts";
import { handleDecline } from "./handlers/decline.ts";
import { handleCancel } from "./handlers/cancel.ts";
import { handleGetThrottleStatus } from "./handlers/getThrottleStatus.ts";

// ─────────────────────────────────────────────────────────────
// Configuration (Immutable)
// ─────────────────────────────────────────────────────────────

const ALLOWED_ACTIONS = ["create", "get", "accept", "decline", "cancel", "get_throttle_status"] as const;

// NOTE: All actions are public until Supabase auth migration is complete
const PUBLIC_ACTIONS: ReadonlySet<string> = new Set([
  "create", "get", "accept", "decline", "cancel", "get_throttle_status"
]);

type Action = typeof ALLOWED_ACTIONS[number];

// Handler map (immutable record) - replaces switch statement
const handlers: Readonly<Record<Action, Function>> = {
  create: handleCreate,
  get: handleGet,
  accept: handleAccept,
  decline: handleDecline,
  cancel: handleCancel,
  get_throttle_status: handleGetThrottleStatus,
};

// ─────────────────────────────────────────────────────────────
// Pure Functions
// ─────────────────────────────────────────────────────────────

/**
 * Authenticate user from request headers
 * Returns Result with user or error
 */
const authenticateUser = async (
  headers: Headers,
  supabaseUrl: string,
  supabaseAnonKey: string,
  requireAuth: boolean
): Promise<Result<AuthenticatedUser | null, AuthenticationError>> => {
  if (!requireAuth) {
    return ok(null);
  }

  const tokenResult = extractAuthToken(headers);
  if (!tokenResult.ok) {
    return tokenResult;
  }

  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: tokenResult.value } },
  });

  const { data: { user: authUser }, error: authError } = await authClient.auth.getUser();

  if (authError || !authUser) {
    return err(new AuthenticationError("Invalid or expired token"));
  }

  return ok({ id: authUser.id, email: authUser.email ?? "" });
};

// ─────────────────────────────────────────────────────────────
// Effect Boundary (Side Effects Isolated Here)
// ─────────────────────────────────────────────────────────────

console.log("[date-change-request] Edge Function started (FP mode)");

Deno.serve(async (req: Request) => {
  const correlationId = crypto.randomUUID().slice(0, 8);
  let errorLog: ErrorLog = createErrorLog('date-change-request', 'unknown', correlationId);

  try {
    console.log(`[date-change-request] ========== REQUEST ==========`);
    console.log(`[date-change-request] Method: ${req.method}`);

    const parseResult = await parseRequest(req);

    if (!parseResult.ok) {
      if (parseResult.error instanceof CorsPreflightSignal) {
        return formatCorsResponse();
      }
      throw parseResult.error;
    }

    const { action, payload, headers } = parseResult.value;
    errorLog = setAction(errorLog, action);
    console.log(`[date-change-request] Action: ${action}`);
    console.log(`[date-change-request] Payload:`, JSON.stringify(payload, null, 2));

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
    const authResult = await authenticateUser(
      headers,
      config.supabaseUrl,
      config.supabaseAnonKey,
      requireAuth
    );

    if (!authResult.ok) {
      throw authResult.error;
    }

    const user = authResult.value;

    if (user) {
      errorLog = setUserId(errorLog, user.id);
      console.log(`[date-change-request] Authenticated: ${user.email}`);
    } else {
      console.log(`[date-change-request] Public action - skipping authentication`);
    }

    const serviceClient = createClient(config.supabaseUrl, config.supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const handlerResult = routeToHandler(handlers, action);
    if (!handlerResult.ok) {
      throw handlerResult.error;
    }

    const handler = handlerResult.value;
    const result = await handler(payload, user, serviceClient);

    console.log(`[date-change-request] ========== SUCCESS ==========`);

    return formatSuccessResponse(result);

  } catch (error) {
    console.error(`[date-change-request] ========== ERROR ==========`);
    console.error(`[date-change-request] Error name:`, (error as Error).name);
    console.error(`[date-change-request] Error message:`, (error as Error).message);
    console.error(`[date-change-request] Full error:`, error);

    errorLog = addError(errorLog, error as Error, 'Fatal error in main handler');
    reportErrorLog(errorLog);

    return formatErrorResponseHttp(error as Error);
  }
});
