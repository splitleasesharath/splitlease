/**
 * Co-Host Request Edge Function
 * Split Lease - Supabase Edge Functions
 *
 * Main router for co-host request operations:
 * - create: Create a new co-host request with virtual meeting
 * - rate: Submit rating for a completed session
 * - notify-host: Send email notification after admin claims request
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
import { Result, ok, err } from "../_shared/functional/result.ts";
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
} from "../_shared/functional/orchestration.ts";
import { createErrorLog, addError, setUserId, setAction, ErrorLog } from "../_shared/functional/errorLog.ts";
import { reportErrorLog } from "../_shared/slack.ts";

import { handleCreate } from "./handlers/create.ts";
import { handleRate } from "./handlers/rate.ts";
import { handleNotifyHost } from "./handlers/notify-host.ts";

// ─────────────────────────────────────────────────────────────
// Configuration (Immutable)
// ─────────────────────────────────────────────────────────────

const ALLOWED_ACTIONS = ["create", "rate", "notify-host"] as const;

// NOTE: All actions are public until Supabase auth migration is complete
const PUBLIC_ACTIONS: ReadonlySet<string> = new Set(["create", "rate", "notify-host"]);

type Action = typeof ALLOWED_ACTIONS[number];

// Handler map (immutable record) - replaces switch statement
const handlers: Readonly<Record<Action, Function>> = {
  create: handleCreate,
  rate: handleRate,
  "notify-host": handleNotifyHost,
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

console.log("[cohost-request] Edge Function started (FP mode)");

Deno.serve(async (req: Request) => {
  const correlationId = crypto.randomUUID().slice(0, 8);
  let errorLog: ErrorLog = createErrorLog('cohost-request', 'unknown', correlationId);

  try {
    console.log(`[cohost-request] ========== REQUEST ==========`);
    console.log(`[cohost-request] Method: ${req.method}`);

    const parseResult = await parseRequest(req);

    if (!parseResult.ok) {
      if (parseResult.error instanceof CorsPreflightSignal) {
        return formatCorsResponse();
      }
      throw parseResult.error;
    }

    const { action, payload, headers } = parseResult.value;
    errorLog = setAction(errorLog, action);
    console.log(`[cohost-request] Action: ${action}`);

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
      console.log(`[cohost-request] Authenticated: ${user.email}`);
    } else {
      console.log(`[cohost-request] Public action - skipping authentication`);
    }

    const serviceClient = createClient(config.supabaseUrl, config.supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const handlerResult = routeToHandler(handlers, action);
    if (!handlerResult.ok) {
      throw handlerResult.error;
    }

    const handler = handlerResult.value;
    const result = await executeHandler(handler, action as Action, payload, user, serviceClient);

    console.log(`[cohost-request] ========== SUCCESS ==========`);

    return formatSuccessResponse(result);

  } catch (error) {
    console.error(`[cohost-request] ========== ERROR ==========`);
    console.error(`[cohost-request]`, error);

    errorLog = addError(errorLog, error as Error, 'Fatal error in main handler');
    reportErrorLog(errorLog);

    return formatErrorResponseHttp(error as Error);
  }
});

// ─────────────────────────────────────────────────────────────
// Handler Execution (Encapsulates action-specific logic)
// ─────────────────────────────────────────────────────────────

async function executeHandler(
  handler: Function,
  action: Action,
  payload: Record<string, unknown>,
  user: AuthenticatedUser | null,
  serviceClient: ReturnType<typeof createClient>
): Promise<unknown> {
  switch (action) {
    case "create":
      return handler(payload, user, serviceClient);

    case "rate":
      return handler(payload, user, serviceClient);

    case "notify-host":
      return handler(payload, serviceClient);

    default: {
      const _exhaustive: never = action;
      throw new ValidationError(`Unhandled action: ${action}`);
    }
  }
}
