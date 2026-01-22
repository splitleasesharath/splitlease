/**
 * Quick Match Edge Function
 * Split Lease - Supabase Edge Functions
 *
 * Provides proposal-to-listing matching functionality for the Quick Match tool.
 *
 * Actions:
 * - get_proposal: Fetch proposal with guest and listing details
 * - search_candidates: Find and score candidate listings
 * - save_choice: Record operator's match selection
 *
 * NO FALLBACK PRINCIPLE: All errors fail fast without fallback logic
 *
 * FP ARCHITECTURE:
 * - Pure functions for validation, routing, and response formatting
 * - Immutable data structures
 * - Side effects isolated to boundaries
 */

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Shared utilities
import { ValidationError } from '../_shared/errors.ts';
import { Result, ok, err } from '../_shared/functional/result.ts';
import {
  parseRequest,
  validateAction,
  formatSuccessResponse,
  formatErrorResponseHttp,
  formatCorsResponse,
  CorsPreflightSignal,
  getSupabaseConfig,
} from '../_shared/functional/orchestration.ts';
import { createErrorLog, addError, setAction, ErrorLog } from '../_shared/functional/errorLog.ts';
import { reportErrorLog } from '../_shared/slack.ts';

// Action handlers
import { handleGetProposal } from './actions/get_proposal.ts';
import { handleSearchCandidates } from './actions/search_candidates.ts';
import { handleSaveChoice } from './actions/save_choice.ts';

// ─────────────────────────────────────────────────────────────
// Configuration (Immutable)
// ─────────────────────────────────────────────────────────────

const ALLOWED_ACTIONS = ['get_proposal', 'search_candidates', 'save_choice'] as const;

// All actions are public (internal tool, no user auth required)
const PUBLIC_ACTIONS: ReadonlySet<string> = new Set(ALLOWED_ACTIONS);

type Action = typeof ALLOWED_ACTIONS[number];

// Handler map (immutable record)
const handlers: Readonly<Record<Action, Function>> = {
  get_proposal: handleGetProposal,
  search_candidates: handleSearchCandidates,
  save_choice: handleSaveChoice,
};

// ─────────────────────────────────────────────────────────────
// Effect Boundary (Side Effects Isolated Here)
// ─────────────────────────────────────────────────────────────

console.log('[quick-match] Edge Function started');

Deno.serve(async (req: Request) => {
  // Initialize immutable error log with correlation ID
  const correlationId = crypto.randomUUID().slice(0, 8);
  let errorLog: ErrorLog = createErrorLog('quick-match', 'unknown', correlationId);

  try {
    console.log('[quick-match] ========== REQUEST ==========');
    console.log(`[quick-match] Method: ${req.method}`);

    // ─────────────────────────────────────────────────────────
    // Step 1: Parse request
    // ─────────────────────────────────────────────────────────

    const parseResult = await parseRequest(req);

    if (!parseResult.ok) {
      // Handle CORS preflight
      if (parseResult.error instanceof CorsPreflightSignal) {
        return formatCorsResponse();
      }
      throw parseResult.error;
    }

    const { action, payload } = parseResult.value;

    // Update error log with action
    errorLog = setAction(errorLog, action);
    console.log(`[quick-match] Action: ${action}`);

    // ─────────────────────────────────────────────────────────
    // Step 2: Validate action
    // ─────────────────────────────────────────────────────────

    const actionResult = validateAction(ALLOWED_ACTIONS, action);
    if (!actionResult.ok) {
      throw actionResult.error;
    }

    // ─────────────────────────────────────────────────────────
    // Step 3: Get configuration
    // ─────────────────────────────────────────────────────────

    const configResult = getSupabaseConfig();
    if (!configResult.ok) {
      throw configResult.error;
    }

    const { supabaseUrl, supabaseServiceKey } = configResult.value;

    // Create Supabase client with service role (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // ─────────────────────────────────────────────────────────
    // Step 4: Route to handler
    // ─────────────────────────────────────────────────────────

    const handler = handlers[action as Action];
    if (!handler) {
      throw new ValidationError(`No handler for action: ${action}`);
    }

    // Execute handler
    const result = await handler(payload, supabase);

    console.log('[quick-match] ========== SUCCESS ==========');

    return formatSuccessResponse(result);

  } catch (error) {
    console.error('[quick-match] ========== ERROR ==========');
    console.error('[quick-match]', error);

    // Add error to log (immutable)
    errorLog = addError(errorLog, error as Error, 'Fatal error in main handler');

    // Report to Slack (side effect at boundary)
    reportErrorLog(errorLog);

    return formatErrorResponseHttp(error as Error);
  }
});

console.log('[quick-match] Edge Function ready');
