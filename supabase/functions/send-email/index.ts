/**
 * Send Email Edge Function
 * Split Lease - Supabase Edge Functions
 *
 * Main router for email operations:
 * - send: Send templated email via SendGrid
 * - health: Check function health and secrets configuration
 *
 * Authorization: Bearer token in Authorization header
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
  formatSuccessResponse,
  formatErrorResponseHttp,
  formatCorsResponse,
  CorsPreflightSignal,
  extractAuthToken,
} from "../_shared/fp/orchestration.ts";
import { createErrorLog, addError, setAction, ErrorLog } from "../_shared/fp/errorLog.ts";
import { reportErrorLog } from "../_shared/slack.ts";

import { handleSend } from "./handlers/send.ts";

// ─────────────────────────────────────────────────────────────
// Configuration (Immutable)
// ─────────────────────────────────────────────────────────────

const ALLOWED_ACTIONS = ["send", "health"] as const;

// Templates that can be sent without user authentication
const PUBLIC_TEMPLATES: ReadonlySet<string> = new Set([
  '1757433099447x202755280527849400', // Security 2 - Magic Login Link
  '1560447575939x331870423481483500', // Basic - Welcome emails, internal notifications
]);

type Action = typeof ALLOWED_ACTIONS[number];

// ─────────────────────────────────────────────────────────────
// Pure Functions
// ─────────────────────────────────────────────────────────────

/**
 * Health check handler
 */
const handleHealth = (): { status: string; timestamp: string; actions: readonly string[]; secrets: Record<string, boolean> } => {
  const sendgridApiKeyConfigured = !!Deno.env.get('SENDGRID_API_KEY');
  const sendgridEndpointConfigured = !!Deno.env.get('SENDGRID_EMAIL_ENDPOINT');
  const allConfigured = sendgridApiKeyConfigured && sendgridEndpointConfigured;

  return {
    status: allConfigured ? 'healthy' : 'unhealthy (missing secrets)',
    timestamp: new Date().toISOString(),
    actions: ALLOWED_ACTIONS,
    secrets: {
      SENDGRID_API_KEY: sendgridApiKeyConfigured,
      SENDGRID_EMAIL_ENDPOINT: sendgridEndpointConfigured,
    },
  };
};

// Handler map (immutable record)
const handlers: Readonly<Record<Action, Function>> = {
  send: handleSend,
  health: handleHealth,
};

/**
 * Check if template is public (doesn't require auth)
 */
const isPublicTemplate = (templateId: string | undefined): boolean =>
  templateId !== undefined && PUBLIC_TEMPLATES.has(templateId);

// ─────────────────────────────────────────────────────────────
// Effect Boundary (Side Effects Isolated Here)
// ─────────────────────────────────────────────────────────────

console.log("[send-email] Edge Function started (FP mode)");

Deno.serve(async (req: Request) => {
  const correlationId = crypto.randomUUID().slice(0, 8);
  let errorLog: ErrorLog = createErrorLog('send-email', 'unknown', correlationId);

  try {
    console.log(`[send-email] ========== REQUEST ==========`);
    console.log(`[send-email] Method: ${req.method}`);

    const parseResult = await parseRequest(req);

    if (!parseResult.ok) {
      if (parseResult.error instanceof CorsPreflightSignal) {
        return formatCorsResponse();
      }
      throw parseResult.error;
    }

    const { action, payload, headers } = parseResult.value;
    errorLog = setAction(errorLog, action);
    console.log(`[send-email] Action: ${action}`);

    const actionResult = validateAction(ALLOWED_ACTIONS, action);
    if (!actionResult.ok) {
      throw actionResult.error;
    }

    // Check authorization for send action
    if (action === 'send') {
      const templateId = payload?.template_id as string | undefined;
      const isPublic = isPublicTemplate(templateId);

      if (!isPublic) {
        const tokenResult = extractAuthToken(headers);
        if (!tokenResult.ok) {
          throw new AuthenticationError("Missing or invalid Authorization header. Use Bearer token.");
        }

        const token = tokenResult.value.replace("Bearer ", "");
        if (!token) {
          throw new AuthenticationError("Empty Bearer token");
        }
      }

      console.log(`[send-email] Authorization: ${isPublic ? 'Public template (anon allowed)' : 'Bearer token present'}`);
    }

    const handlerResult = routeToHandler(handlers, action);
    if (!handlerResult.ok) {
      throw handlerResult.error;
    }

    const handler = handlerResult.value;
    const result = action === 'health' ? handler() : await handler(payload);

    console.log(`[send-email] ========== SUCCESS ==========`);

    return formatSuccessResponse(result);

  } catch (error) {
    console.error(`[send-email] ========== ERROR ==========`);
    console.error(`[send-email]`, error);

    errorLog = addError(errorLog, error as Error, 'Fatal error in main handler');
    reportErrorLog(errorLog);

    return formatErrorResponseHttp(error as Error);
  }
});
