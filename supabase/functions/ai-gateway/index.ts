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
 *
 * FP ARCHITECTURE:
 * - Pure functions for validation, routing, and response formatting
 * - Immutable data structures (no let reassignment in orchestration)
 * - Side effects isolated to boundaries (entry/exit of handler)
 * - Result type for error propagation (exceptions only at outer boundary)
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { AIGatewayRequest } from "../_shared/aiTypes.ts";
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
  getSupabaseConfig,
  formatErrorResponseHttp,
  formatCorsResponse,
  CorsPreflightSignal,
  AuthenticatedUser,
  extractAuthToken,
} from "../_shared/fp/orchestration.ts";
import { createErrorLog, addError, setUserId, setAction, ErrorLog } from "../_shared/fp/errorLog.ts";
import { reportErrorLog } from "../_shared/slack.ts";

import { handleComplete } from "./handlers/complete.ts";
import { handleStream } from "./handlers/stream.ts";

// Import prompt registry first (initializes the prompts Map)
import "./prompts/_registry.ts";
// Import prompt files AFTER registry to avoid circular dependency
// (ES Module import hoisting would cause TDZ error if imported from _registry.ts)
import "./prompts/listing-description.ts";
import "./prompts/listing-title.ts";
import "./prompts/neighborhood-description.ts";

// ─────────────────────────────────────────────────────────────
// Configuration (Immutable)
// ─────────────────────────────────────────────────────────────

const ALLOWED_ACTIONS = ["complete", "stream"] as const;
const PUBLIC_PROMPTS: ReadonlySet<string> = new Set([
  "listing-description",
  "listing-title",
  "neighborhood-description",
  "echo-test",
]);

type Action = typeof ALLOWED_ACTIONS[number];

// Handler map (immutable record) - replaces switch statement
const handlers: Readonly<Record<Action, Function>> = {
  complete: handleComplete,
  stream: handleStream,
};

// ─────────────────────────────────────────────────────────────
// Pure Functions
// ─────────────────────────────────────────────────────────────

/**
 * Parse AI Gateway request body with validation
 * Returns validated request data
 */
const parseAIGatewayRequest = async (req: Request): Promise<Result<AIGatewayRequest & { headers: Headers }, Error>> => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return err(new CorsPreflightSignal());
  }

  // Validate HTTP method
  if (req.method !== 'POST') {
    return err(new ValidationError('Method not allowed. Use POST.'));
  }

  try {
    const body: AIGatewayRequest = await req.json();

    if (!body.action) {
      return err(new ValidationError('action is required'));
    }

    if (!body.payload) {
      return err(new ValidationError('payload is required'));
    }

    if (!body.payload.prompt_key) {
      return err(new ValidationError('payload.prompt_key is required'));
    }

    return ok({
      ...body,
      headers: req.headers,
    });
  } catch (_e) {
    return err(new ValidationError('Invalid JSON body'));
  }
};

/**
 * Check if prompt is public (doesn't require auth)
 */
const isPublicPrompt = (promptKey: string): boolean =>
  PUBLIC_PROMPTS.has(promptKey);

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
  // Public prompts don't require auth
  if (!requireAuth) {
    return ok(null);
  }

  // Extract auth token
  const tokenResult = extractAuthToken(headers);
  if (!tokenResult.ok) {
    return err(new ValidationError("Missing Authorization header") as unknown as AuthenticationError);
  }

  // Validate token with Supabase Auth
  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: tokenResult.value } },
  });

  const { data: { user: authUser }, error: authError } = await authClient.auth.getUser();

  if (authError || !authUser) {
    return err(new ValidationError("Invalid or expired token") as unknown as AuthenticationError);
  }

  return ok({ id: authUser.id, email: authUser.email ?? "" });
};

// ─────────────────────────────────────────────────────────────
// Effect Boundary (Side Effects Isolated Here)
// ─────────────────────────────────────────────────────────────

console.log("[ai-gateway] Edge Function started (FP mode)");

Deno.serve(async (req: Request) => {
  // Initialize immutable error log with correlation ID
  const correlationId = crypto.randomUUID().slice(0, 8);
  let errorLog: ErrorLog = createErrorLog('ai-gateway', 'unknown', correlationId);

  try {
    console.log(`[ai-gateway] ========== REQUEST ==========`);
    console.log(`[ai-gateway] Method: ${req.method}`);

    // ─────────────────────────────────────────────────────────
    // Step 1: Parse request (side effect boundary for req.json())
    // ─────────────────────────────────────────────────────────

    const parseResult = await parseAIGatewayRequest(req);

    if (!parseResult.ok) {
      // Handle CORS preflight (not an error, just control flow)
      if (parseResult.error instanceof CorsPreflightSignal) {
        return formatCorsResponse();
      }
      throw parseResult.error;
    }

    const { action, payload, headers } = parseResult.value;
    const promptKey = payload.prompt_key;

    // Update error log with action (immutable transformation)
    errorLog = setAction(errorLog, action);
    console.log(`[ai-gateway] Action: ${action}`);
    console.log(`[ai-gateway] Prompt: ${promptKey}`);

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

    const requireAuth = !isPublicPrompt(promptKey);
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
      console.log(`[ai-gateway] Authenticated: ${user.email}`);
    } else {
      console.log(`[ai-gateway] Public prompt - skipping authentication`);
    }

    // ─────────────────────────────────────────────────────────
    // Step 5: Create service client (side effect - client creation)
    // ─────────────────────────────────────────────────────────

    const serviceClient = createClient(config.supabaseUrl, config.supabaseServiceKey);

    // Build context object for handlers
    const context = {
      user,
      serviceClient,
      request: parseResult.value,
    };

    // ─────────────────────────────────────────────────────────
    // Step 6: Route to handler (pure lookup + execution)
    // ─────────────────────────────────────────────────────────

    const handlerResult = routeToHandler(handlers, action);
    if (!handlerResult.ok) {
      throw handlerResult.error;
    }

    // Execute handler and return response directly
    // (handlers return Response objects, not data to wrap)
    const handler = handlerResult.value;
    return await handler(context);

  } catch (error) {
    console.error(`[ai-gateway] ========== ERROR ==========`);
    console.error(`[ai-gateway]`, error);

    // Add error to log (immutable)
    errorLog = addError(errorLog, error as Error, 'Fatal error in main handler');

    // Report to Slack (side effect at boundary)
    reportErrorLog(errorLog);

    return formatErrorResponseHttp(error as Error);
  }
});
