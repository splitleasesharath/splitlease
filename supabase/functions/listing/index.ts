/**
 * Listing Edge Function
 * Split Lease - Supabase Edge Functions
 *
 * Main router for listing operations:
 * - create: Create a new listing
 * - get: Get listing details
 * - submit: Full listing submission with all form data
 * - createMockupProposal: Create mockup proposal for a listing
 * - delete: Delete a listing
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
  getBubbleConfig,
  formatSuccessResponse,
  formatErrorResponseHttp,
  formatCorsResponse,
  CorsPreflightSignal,
  extractAuthToken,
} from "../_shared/fp/orchestration.ts";
import { createErrorLog, addError, setAction, ErrorLog } from "../_shared/fp/errorLog.ts";
import { reportErrorLog } from "../_shared/slack.ts";

// Handlers
import { handleCreate } from "./handlers/create.ts";
import { handleGet } from "./handlers/get.ts";
import { handleSubmit } from "./handlers/submit.ts";
import { handleCreateMockupProposal } from "./handlers/createMockupProposal.ts";
import { handleDelete } from "./handlers/delete.ts";

// ─────────────────────────────────────────────────────────────
// Configuration (Immutable)
// ─────────────────────────────────────────────────────────────

const ALLOWED_ACTIONS = ["create", "get", "submit", "createMockupProposal", "delete"] as const;

// All listing actions are public (auth handled by Bubble workflow)
const PUBLIC_ACTIONS: ReadonlySet<string> = new Set(["create", "get", "createMockupProposal", "delete"]);

type Action = typeof ALLOWED_ACTIONS[number];

// Handler map (immutable record) - replaces switch statement
const handlers: Readonly<Record<Action, Function>> = {
  create: handleCreate,
  get: handleGet,
  submit: handleSubmit,
  createMockupProposal: handleCreateMockupProposal,
  delete: handleDelete,
};

// ─────────────────────────────────────────────────────────────
// Pure Functions
// ─────────────────────────────────────────────────────────────

/**
 * Config for actions that need both Supabase and Bubble
 */
interface FullListingConfig {
  readonly supabaseUrl: string;
  readonly supabaseServiceKey: string;
  readonly bubbleBaseUrl: string;
  readonly bubbleApiKey: string;
}

/**
 * Config for actions that only need Supabase (no Bubble dependency)
 */
interface SupabaseOnlyConfig {
  readonly supabaseUrl: string;
  readonly supabaseServiceKey: string;
}

// Actions that only need Supabase config (no Bubble API calls)
const SUPABASE_ONLY_ACTIONS: ReadonlySet<string> = new Set(["createMockupProposal", "delete"]);

/**
 * Get configuration based on action requirements
 * - createMockupProposal: Only needs Supabase
 * - All others: Need both Supabase and Bubble
 */
const getConfigForAction = (action: string): Result<FullListingConfig | SupabaseOnlyConfig, Error> => {
  const supabaseResult = getSupabaseConfig();
  if (!supabaseResult.ok) {
    return supabaseResult;
  }

  // For Supabase-only actions, skip Bubble config requirement
  if (SUPABASE_ONLY_ACTIONS.has(action)) {
    console.log(`[listing] Action '${action}' only requires Supabase config`);
    return ok({
      supabaseUrl: supabaseResult.value.supabaseUrl,
      supabaseServiceKey: supabaseResult.value.supabaseServiceKey,
    });
  }

  // For other actions, require both Supabase and Bubble
  const bubbleResult = getBubbleConfig();
  if (!bubbleResult.ok) {
    return bubbleResult;
  }

  return ok({
    supabaseUrl: supabaseResult.value.supabaseUrl,
    supabaseServiceKey: supabaseResult.value.supabaseServiceKey,
    bubbleBaseUrl: bubbleResult.value.bubbleBaseUrl,
    bubbleApiKey: bubbleResult.value.bubbleApiKey,
  });
};

// ─────────────────────────────────────────────────────────────
// Effect Boundary (Side Effects Isolated Here)
// ─────────────────────────────────────────────────────────────

console.log("[listing] Edge Function started (FP mode)");

Deno.serve(async (req: Request) => {
  // Initialize immutable error log with correlation ID
  const correlationId = crypto.randomUUID().slice(0, 8);
  let errorLog: ErrorLog = createErrorLog('listing', 'unknown', correlationId);

  try {
    console.log(`[listing] ========== REQUEST ==========`);
    console.log(`[listing] Method: ${req.method}`);

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
    console.log(`[listing] Action: ${action}`);

    // ─────────────────────────────────────────────────────────
    // Step 2: Validate action (pure)
    // ─────────────────────────────────────────────────────────

    const actionResult = validateAction(ALLOWED_ACTIONS, action);
    if (!actionResult.ok) {
      throw actionResult.error;
    }

    // ─────────────────────────────────────────────────────────
    // Step 3: Get configuration based on action requirements
    // ─────────────────────────────────────────────────────────

    const configResult = getConfigForAction(action);
    if (!configResult.ok) {
      throw configResult.error;
    }
    const config = configResult.value;

    // ─────────────────────────────────────────────────────────
    // Step 4: Authenticate for protected actions
    // ─────────────────────────────────────────────────────────

    const requireAuth = !isPublicAction(PUBLIC_ACTIONS, action);
    if (requireAuth) {
      const tokenResult = extractAuthToken(headers);
      if (!tokenResult.ok) {
        throw tokenResult.error;
      }
      // For now, we trust the auth header is valid
      // The submit action validates user via the payload (user_email)
      console.log(`[listing] Auth header present for protected action`);
    } else {
      console.log(`[listing] Public action - skipping authentication`);
    }

    // ─────────────────────────────────────────────────────────
    // Step 5: Route to handler (pure lookup + execution)
    // ─────────────────────────────────────────────────────────

    const handlerResult = routeToHandler(handlers, action);
    if (!handlerResult.ok) {
      throw handlerResult.error;
    }

    // Execute handler - the only remaining side effect
    const handler = handlerResult.value;
    const result = await executeHandler(handler, action as Action, payload, config);

    console.log(`[listing] ========== SUCCESS ==========`);

    return formatSuccessResponse(result);

  } catch (error) {
    console.error(`[listing] ========== ERROR ==========`);
    console.error(`[listing]`, error);

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
  config: FullListingConfig | SupabaseOnlyConfig
): Promise<unknown> {
  switch (action) {
    case "create":
      return handler(payload);

    case "get":
      return handler(payload);

    case "submit":
      return handler(payload);

    case "createMockupProposal": {
      // Create Supabase client for mockup proposal handler
      const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);
      await handler(supabase, payload as {
        listingId: string;
        hostUserId: string;
        hostEmail: string;
      });
      return { success: true, message: "Mockup proposal creation initiated" };
    }

    case "delete":
      return handler(payload);

    default: {
      // Exhaustive check - TypeScript ensures all cases are handled
      const _exhaustive: never = action;
      throw new ValidationError(`Unhandled action: ${action}`);
    }
  }
}
