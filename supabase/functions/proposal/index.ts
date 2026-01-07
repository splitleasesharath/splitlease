/**
 * Proposal Edge Function
 * Split Lease - Supabase Edge Functions
 *
 * Main router for proposal operations:
 * - create: Create a new proposal
 * - update: Update an existing proposal
 * - get: Get proposal details
 * - suggest: Find and create suggestion proposals (weekly match, same address)
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
import { corsHeaders } from "../_shared/cors.ts";
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

// Handlers
import { handleCreate } from "./actions/create.ts";
import { handleUpdate } from "./actions/update.ts";
import { handleGet } from "./actions/get.ts";
import { handleSuggest } from "./actions/suggest.ts";

// ─────────────────────────────────────────────────────────────
// Configuration (Immutable)
// ─────────────────────────────────────────────────────────────

const ALLOWED_ACTIONS = ["create", "update", "get", "suggest"] as const;

// NOTE: 'create' is temporarily public until Supabase auth migration is complete
// TODO: Remove 'create' from PUBLIC_ACTIONS once auth migration is done
const PUBLIC_ACTIONS: ReadonlySet<string> = new Set(["get", "create"]);

type Action = typeof ALLOWED_ACTIONS[number];

// Handler map (immutable record) - replaces switch statement
const handlers: Readonly<Record<Action, Function>> = {
  create: handleCreate,
  update: handleUpdate,
  get: handleGet,
  suggest: handleSuggest,
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
  // Public actions don't require auth
  if (!requireAuth) {
    return ok(null);
  }

  // Extract auth token
  const tokenResult = extractAuthToken(headers);
  if (!tokenResult.ok) {
    return tokenResult;
  }

  // Validate token with Supabase Auth
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

console.log("[proposal] Edge Function started (FP mode)");

Deno.serve(async (req: Request) => {
  // Initialize immutable error log with correlation ID
  const correlationId = crypto.randomUUID().slice(0, 8);
  let errorLog: ErrorLog = createErrorLog('proposal', 'unknown', correlationId);

  try {
    console.log(`[proposal] ========== REQUEST ==========`);
    console.log(`[proposal] Method: ${req.method}`);

    // ─────────────────────────────────────────────────────────
    // Step 1: Parse request (side effect boundary for req.json())
    // ─────────────────────────────────────────────────────────

    const parseResult = await parseRequest(req);

    if (!parseResult.ok) {
      // Handle CORS preflight (not an error, just control flow)
      if (parseResult.error instanceof CorsPreflightSignal) {
        return formatCorsResponse();
      }
      throw parseResult.error;
    }

    const { action, payload, headers } = parseResult.value;

    // Update error log with action (immutable transformation)
    errorLog = setAction(errorLog, action);
    console.log(`[proposal] Action: ${action}`);

    // ─────────────────────────────────────────────────────────
    // Step 2: Validate action (pure)
    // ─────────────────────────────────────────────────────────

    const actionResult = validateAction(ALLOWED_ACTIONS, action);
    if (!actionResult.ok) {
      throw actionResult.error;
    }

    // ─────────────────────────────────────────────────────────
    // Step 3: Get configuration (pure with env read)
    // ─────────────────────────────────────────────────────────

    const configResult = getSupabaseConfig();
    if (!configResult.ok) {
      throw configResult.error;
    }
    const config = configResult.value;

    // ─────────────────────────────────────────────────────────
    // Step 4: Authenticate user (side effect boundary)
    // ─────────────────────────────────────────────────────────

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
      console.log(`[proposal] Authenticated: ${user.email}`);
    } else {
      console.log(`[proposal] Public action - skipping authentication`);
    }

    // ─────────────────────────────────────────────────────────
    // Step 5: Create service client (side effect - client creation)
    // ─────────────────────────────────────────────────────────

    const serviceClient = createClient(config.supabaseUrl, config.supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // ─────────────────────────────────────────────────────────
    // Step 6: Route to handler (pure lookup + execution)
    // ─────────────────────────────────────────────────────────

    const handlerResult = routeToHandler(handlers, action);
    if (!handlerResult.ok) {
      throw handlerResult.error;
    }

    // Execute handler - the only remaining side effect
    const handler = handlerResult.value;
    const result = await executeHandler(handler, action as Action, payload, user, serviceClient);

    console.log(`[proposal] ========== SUCCESS ==========`);

    return formatSuccessResponse(result);

  } catch (error) {
    console.error(`[proposal] ========== ERROR ==========`);
    console.error(`[proposal]`, error);

    // Add error to log (immutable)
    errorLog = addError(errorLog, error as Error, 'Fatal error in main handler');

    // Report to Slack (side effect at boundary)
    reportErrorLog(errorLog);

    return formatErrorResponseHttp(error as Error);
  }
});

// ─────────────────────────────────────────────────────────────
// Handler Execution (Encapsulates action-specific logic)
// ─────────────────────────────────────────────────────────────

/**
 * Execute the appropriate handler with correct parameters
 * This function handles the different signatures of each handler
 */
async function executeHandler(
  handler: Function,
  action: Action,
  payload: Record<string, unknown>,
  user: AuthenticatedUser | null,
  serviceClient: ReturnType<typeof createClient>
): Promise<unknown> {
  switch (action) {
    case "create":
      // NOTE: 'create' is temporarily public until Supabase auth migration is complete
      // The handler validates guestId from payload instead of requiring auth
      return handler(payload, user, serviceClient);

    case "update":
      if (!user) {
        throw new AuthenticationError("Authentication required for update");
      }
      return handler(payload, user, serviceClient);

    case "get":
      return handler(payload, serviceClient);

    case "suggest":
      if (!user) {
        throw new AuthenticationError("Authentication required for suggest");
      }
      return handler(payload, user, serviceClient);

    default: {
      // Exhaustive check - TypeScript ensures all cases are handled
      const _exhaustive: never = action;
      throw new ValidationError(`Unhandled action: ${action}`);
    }
  }
}
