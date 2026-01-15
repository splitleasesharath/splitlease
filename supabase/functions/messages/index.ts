/**
 * Messages Edge Function - Main Router
 * Split Lease - Edge Function
 *
 * Routes client requests to appropriate messaging handlers
 *
 * Supported Actions:
 * - send_message: Send a message in a thread (requires auth)
 * - get_messages: Get messages for a specific thread (requires auth)
 * - send_guest_inquiry: Contact host without auth (name/email required)
 *
 * NOTE: get_threads was removed - frontend now queries Supabase directly
 *
 * FP ARCHITECTURE:
 * - Pure functions for validation, routing, and response formatting
 * - Immutable data structures (no let reassignment in orchestration)
 * - Side effects isolated to boundaries (entry/exit of handler)
 * - Result type for error propagation (exceptions only at outer boundary)
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { AuthenticationError } from '../_shared/errors.ts';

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

// Import handlers
import { handleSendMessage } from './handlers/sendMessage.ts';
import { handleGetMessages } from './handlers/getMessages.ts';
import { handleSendGuestInquiry } from './handlers/sendGuestInquiry.ts';
import { handleCreateProposalThread } from './handlers/createProposalThread.ts';

// ─────────────────────────────────────────────────────────────
// Configuration (Immutable)
// ─────────────────────────────────────────────────────────────

const ALLOWED_ACTIONS = ['send_message', 'get_messages', 'send_guest_inquiry', 'create_proposal_thread'] as const;

// Actions that don't require authentication
// - send_guest_inquiry: Public form submission
// - create_proposal_thread: Internal service-to-service call
const PUBLIC_ACTIONS: ReadonlySet<string> = new Set(['send_guest_inquiry', 'create_proposal_thread']);

type Action = typeof ALLOWED_ACTIONS[number];

// Handler map (immutable record) - replaces switch statement
const handlers: Readonly<Record<Action, Function>> = {
  send_message: handleSendMessage,
  get_messages: handleGetMessages,
  send_guest_inquiry: handleSendGuestInquiry,
  create_proposal_thread: handleCreateProposalThread,
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
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: tokenResult.value } },
    auth: { persistSession: false },
  });

  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return err(new AuthenticationError("Invalid or expired authentication token"));
  }

  return ok({ id: authUser.id, email: authUser.email ?? "" });
};

// ─────────────────────────────────────────────────────────────
// Effect Boundary (Side Effects Isolated Here)
// ─────────────────────────────────────────────────────────────

console.log('[messages] Edge Function started (FP mode)');

Deno.serve(async (req) => {
  // Initialize immutable error log with correlation ID
  const correlationId = crypto.randomUUID().slice(0, 8);
  let errorLog: ErrorLog = createErrorLog('messages', 'unknown', correlationId);

  try {
    console.log(`[messages] ========== NEW REQUEST ==========`);
    console.log(`[messages] Method: ${req.method}`);
    console.log(`[messages] URL: ${req.url}`);

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
    console.log(`[messages] Request body:`, JSON.stringify({ action, payload }, null, 2));

    // ─────────────────────────────────────────────────────────
    // Step 2: Validate action (pure)
    // ─────────────────────────────────────────────────────────

    const actionResult = validateAction(ALLOWED_ACTIONS, action);
    if (!actionResult.ok) {
      throw actionResult.error;
    }

    console.log(`[messages] Action: ${action}`);

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
      console.log(`[messages] Authenticated user: ${user.email} (${user.id})`);
    } else {
      console.log(`[messages] No-auth action: ${action}`);
    }

    // ─────────────────────────────────────────────────────────
    // Step 5: Create admin client (side effect - client creation)
    // ─────────────────────────────────────────────────────────

    const supabaseAdmin = createClient(config.supabaseUrl, config.supabaseServiceKey, {
      auth: { persistSession: false },
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
    const result = await executeHandler(handler, action as Action, payload, user, supabaseAdmin);

    console.log(`[messages] Handler completed successfully`);
    console.log(`[messages] ========== REQUEST COMPLETE ==========`);

    return formatSuccessResponse(result);

  } catch (error) {
    console.error('[messages] ========== ERROR ==========');
    console.error('[messages] Error:', error);
    console.error('[messages] Error stack:', (error as Error).stack);

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
  supabaseAdmin: ReturnType<typeof createClient>
): Promise<unknown> {
  switch (action) {
    case 'send_message':
      // User is guaranteed non-null for auth-required actions
      return handler(supabaseAdmin, payload, user!);

    case 'get_messages':
      // User is guaranteed non-null for auth-required actions
      return handler(supabaseAdmin, payload, user!);

    case 'send_guest_inquiry':
      return handler(supabaseAdmin, payload);

    case 'create_proposal_thread':
      // Internal action - no user auth needed (service-level call)
      return handler(supabaseAdmin, payload);

    default: {
      // Exhaustive check - TypeScript ensures all cases are handled
      const _exhaustive: never = action;
      throw new Error(`Unknown action: ${action}`);
    }
  }
}
