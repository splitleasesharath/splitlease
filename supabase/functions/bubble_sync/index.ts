/**
 * bubble_sync Edge Function
 *
 * Processes the sync_queue and pushes data FROM Supabase TO Bubble.
 * This is the reverse direction of the bubble_to_supabase_sync.py script.
 *
 * Supports TWO modes:
 * 1. Workflow API (/wf/) - For complex operations requiring Bubble-side logic
 * 2. Data API (/obj/) - For direct CRUD operations (recommended)
 *
 * Actions:
 * - process_queue: Process pending items using Workflow API
 * - process_queue_data_api: Process pending items using Data API (recommended)
 * - sync_single: Manually sync a single record
 * - retry_failed: Retry failed items
 * - get_status: Get queue statistics
 * - cleanup: Clean up old completed items
 * - build_request: Preview API request without executing (debugging)
 * - sync_signup_atomic: Atomic signup sync (user + accounts)
 *
 * NO FALLBACK PRINCIPLE:
 * - Real data or nothing
 * - No fallback mechanisms
 * - Errors propagate, not hidden
 *
 * FP ARCHITECTURE:
 * - Pure functions for validation, routing, and response formatting
 * - Immutable data structures (no let reassignment in orchestration)
 * - Side effects isolated to boundaries (entry/exit of handler)
 * - Result type for error propagation (exceptions only at outer boundary)
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { ValidationError } from '../_shared/errors.ts';

// FP Utilities
import { Result, ok, err } from "../_shared/fp/result.ts";
import {
  parseRequest,
  validateAction,
  routeToHandler,
  getSupabaseConfig,
  getBubbleConfig,
  formatSuccessResponse,
  formatErrorResponseHttp,
  formatCorsResponse,
  CorsPreflightSignal,
} from "../_shared/fp/orchestration.ts";
import { createErrorLog, addError, setAction, ErrorLog } from "../_shared/fp/errorLog.ts";
import { reportErrorLog } from "../_shared/slack.ts";

import { handleProcessQueue } from './handlers/processQueue.ts';
import { handleProcessQueueDataApi } from './handlers/processQueueDataApi.ts';
import { handleSyncSingle } from './handlers/syncSingle.ts';
import { handleRetryFailed } from './handlers/retryFailed.ts';
import { handleGetStatus } from './handlers/getStatus.ts';
import { handleCleanup } from './handlers/cleanup.ts';
import { handleBuildRequest } from './handlers/buildRequest.ts';
import { handleSyncSignupAtomic } from './handlers/syncSignupAtomic.ts';

// ─────────────────────────────────────────────────────────────
// Configuration (Immutable)
// ─────────────────────────────────────────────────────────────

const ALLOWED_ACTIONS = [
  'process_queue',
  'process_queue_data_api',
  'sync_single',
  'retry_failed',
  'get_status',
  'cleanup',
  'build_request',
  'sync_signup_atomic',
] as const;

type Action = typeof ALLOWED_ACTIONS[number];

// Handler map (immutable record) - replaces switch statement
const handlers: Readonly<Record<Action, Function>> = {
  process_queue: handleProcessQueue,
  process_queue_data_api: handleProcessQueueDataApi,
  sync_single: handleSyncSingle,
  retry_failed: handleRetryFailed,
  get_status: handleGetStatus,
  cleanup: handleCleanup,
  build_request: handleBuildRequest,
  sync_signup_atomic: handleSyncSignupAtomic,
};

// ─────────────────────────────────────────────────────────────
// Pure Functions
// ─────────────────────────────────────────────────────────────

/**
 * Get combined configuration for bubble sync operations
 */
interface BubbleSyncConfig {
  readonly supabaseUrl: string;
  readonly supabaseServiceKey: string;
  readonly bubbleBaseUrl: string;
  readonly bubbleApiKey: string;
}

const getBubbleSyncConfig = (): Result<BubbleSyncConfig, Error> => {
  const supabaseResult = getSupabaseConfig();
  if (!supabaseResult.ok) {
    return supabaseResult;
  }

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

console.log('[bubble_sync] Edge Function started (FP mode)');

Deno.serve(async (req: Request) => {
  // Initialize immutable error log with correlation ID
  const correlationId = crypto.randomUUID().slice(0, 8);
  let errorLog: ErrorLog = createErrorLog('bubble_sync', 'unknown', correlationId);

  try {
    console.log('[bubble_sync] ========== REQUEST RECEIVED ==========');
    console.log('[bubble_sync] Method:', req.method);
    console.log('[bubble_sync] URL:', req.url);

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

    const { action, payload } = parseResult.value;

    // Update error log with action (immutable transformation)
    errorLog = setAction(errorLog, action);
    console.log('[bubble_sync] Action:', action);
    console.log('[bubble_sync] Payload:', JSON.stringify(payload, null, 2));

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

    const configResult = getBubbleSyncConfig();
    if (!configResult.ok) {
      throw configResult.error;
    }
    const config = configResult.value;

    // ─────────────────────────────────────────────────────────
    // Step 4: Create Supabase client (side effect - client creation)
    // ─────────────────────────────────────────────────────────

    const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Build config objects for handlers
    const bubbleConfig = {
      bubbleBaseUrl: config.bubbleBaseUrl,
      bubbleApiKey: config.bubbleApiKey,
    };

    const dataApiConfig = {
      baseUrl: config.bubbleBaseUrl,
      apiKey: config.bubbleApiKey,
    };

    // ─────────────────────────────────────────────────────────
    // Step 5: Route to handler (pure lookup + execution)
    // ─────────────────────────────────────────────────────────

    const handlerResult = routeToHandler(handlers, action);
    if (!handlerResult.ok) {
      throw handlerResult.error;
    }

    // Execute handler - the only remaining side effect
    const handler = handlerResult.value;
    const result = await executeHandler(handler, action as Action, payload, supabase, bubbleConfig, dataApiConfig);

    console.log('[bubble_sync] ========== REQUEST SUCCESS ==========');

    return formatSuccessResponse(result);

  } catch (error) {
    console.error('[bubble_sync] ========== REQUEST ERROR ==========');
    console.error('[bubble_sync] Error:', error);

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

interface BubbleConfigParam {
  bubbleBaseUrl: string;
  bubbleApiKey: string;
}

interface DataApiConfigParam {
  baseUrl: string;
  apiKey: string;
}

/**
 * Execute the appropriate handler with correct parameters
 * This function handles the different signatures of each handler
 */
async function executeHandler(
  handler: Function,
  action: Action,
  payload: Record<string, unknown>,
  supabase: ReturnType<typeof createClient>,
  bubbleConfig: BubbleConfigParam,
  dataApiConfig: DataApiConfigParam
): Promise<unknown> {
  switch (action) {
    case 'process_queue':
      // Workflow API mode (original)
      return handler(supabase, bubbleConfig, payload);

    case 'process_queue_data_api':
      // Data API mode (recommended)
      return handler(supabase, dataApiConfig, payload);

    case 'sync_single':
      return handler(supabase, bubbleConfig, payload);

    case 'retry_failed':
      return handler(supabase, bubbleConfig, payload);

    case 'get_status':
      return handler(supabase, payload);

    case 'cleanup':
      return handler(supabase, payload);

    case 'build_request':
      // Preview request without executing
      return handler(dataApiConfig, payload);

    case 'sync_signup_atomic':
      // Atomic signup sync handler
      return handler(supabase, dataApiConfig, payload);

    default: {
      // Exhaustive check - TypeScript ensures all cases are handled
      const _exhaustive: never = action;
      throw new ValidationError(`Unhandled action: ${action}`);
    }
  }
}
