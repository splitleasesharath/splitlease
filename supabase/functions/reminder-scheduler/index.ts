/**
 * Reminder Scheduler Edge Function
 * Split Lease - Reminder House Manual Feature
 *
 * Main router for reminder operations:
 * - create: Create a new reminder
 * - update: Update an existing reminder
 * - get: Get reminders by house manual or visit
 * - get-by-visit: Get reminders for a visit (guest read-only view)
 * - delete: Cancel a reminder
 * - process-pending: Process due reminders (cron job)
 * - webhook-sendgrid: Handle SendGrid delivery webhooks
 * - webhook-twilio: Handle Twilio delivery webhooks
 * - health: Check function health
 *
 * NO FALLBACK PRINCIPLE: All errors fail fast without fallback logic
 *
 * FP ARCHITECTURE:
 * - Pure functions for validation, routing, and response formatting
 * - Immutable data structures
 * - Side effects isolated to boundaries
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  ValidationError,
  AuthenticationError,
} from "../_shared/errors.ts";

// FP Utilities
import {
  parseRequest,
  validateAction,
  routeToHandler,
  formatSuccessResponse,
  formatErrorResponseHttp,
  formatCorsResponse,
  CorsPreflightSignal,
  extractAuthToken,
} from "../_shared/functional/orchestration.ts";
import { createErrorLog, addError, setAction, ErrorLog } from "../_shared/functional/errorLog.ts";
import { reportErrorLog } from "../_shared/slack.ts";

// Validators
import {
  validateCreatePayload,
  validateUpdatePayload,
  validateGetPayload,
  validateGetByVisitPayload,
  validateDeletePayload,
  validateBatchSize,
} from "./lib/validators.ts";

// Handlers
import { handleCreate } from "./handlers/create.ts";
import { handleUpdate } from "./handlers/update.ts";
import { handleGet, handleGetByVisit } from "./handlers/get.ts";
import { handleDelete } from "./handlers/delete.ts";
import { handleProcessPending } from "./handlers/processPending.ts";
import { handleSendGridWebhook, handleTwilioWebhook } from "./handlers/webhook.ts";

// ─────────────────────────────────────────────────────────────
// Configuration (Immutable)
// ─────────────────────────────────────────────────────────────

const ALLOWED_ACTIONS = [
  "create",
  "update",
  "get",
  "get-by-visit",
  "delete",
  "process-pending",
  "webhook-sendgrid",
  "webhook-twilio",
  "health",
] as const;

// Actions that don't require authentication
const PUBLIC_ACTIONS: ReadonlySet<string> = new Set([
  "get-by-visit",     // Guest read-only view
  "process-pending",  // Cron job
  "webhook-sendgrid", // SendGrid webhooks
  "webhook-twilio",   // Twilio webhooks
  "health",
]);

type Action = typeof ALLOWED_ACTIONS[number];

// ─────────────────────────────────────────────────────────────
// Pure Functions
// ─────────────────────────────────────────────────────────────

/**
 * Health check handler
 */
const handleHealth = (): { status: string; timestamp: string; actions: readonly string[] } => {
  const supabaseUrl = !!Deno.env.get('SUPABASE_URL');
  const supabaseKey = !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const allConfigured = supabaseUrl && supabaseKey;

  return {
    status: allConfigured ? 'healthy' : 'unhealthy (missing secrets)',
    timestamp: new Date().toISOString(),
    actions: ALLOWED_ACTIONS,
  };
};

// ─────────────────────────────────────────────────────────────
// Effect Boundary (Side Effects Isolated Here)
// ─────────────────────────────────────────────────────────────

console.log("[reminder-scheduler] Edge Function started");

Deno.serve(async (req: Request) => {
  const correlationId = crypto.randomUUID().slice(0, 8);
  let errorLog: ErrorLog = createErrorLog('reminder-scheduler', 'unknown', correlationId);

  try {
    console.log(`[reminder-scheduler] ========== REQUEST ==========`);
    console.log(`[reminder-scheduler] Method: ${req.method}`);

    const parseResult = await parseRequest(req);

    if (!parseResult.ok) {
      if (parseResult.error instanceof CorsPreflightSignal) {
        return formatCorsResponse();
      }
      throw parseResult.error;
    }

    const { action, payload, headers } = parseResult.value;
    errorLog = setAction(errorLog, action);
    console.log(`[reminder-scheduler] Action: ${action}`);

    const actionResult = validateAction(ALLOWED_ACTIONS, action);
    if (!actionResult.ok) {
      throw actionResult.error;
    }

    // Check authorization for protected actions
    if (!PUBLIC_ACTIONS.has(action)) {
      const tokenResult = extractAuthToken(headers);
      if (!tokenResult.ok) {
        throw new AuthenticationError("Missing or invalid Authorization header. Use Bearer token.");
      }

      const token = tokenResult.value.replace("Bearer ", "");
      if (!token) {
        throw new AuthenticationError("Empty Bearer token");
      }

      console.log(`[reminder-scheduler] Authorization header present`);
    }

    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    // Route to handler
    let result: unknown;

    switch (action as Action) {
      case 'health':
        result = handleHealth();
        break;

      case 'create': {
        const validatedPayload = validateCreatePayload(payload);
        result = await handleCreate(validatedPayload, supabaseUrl, supabaseServiceKey);
        break;
      }

      case 'update': {
        const validatedPayload = validateUpdatePayload(payload);
        result = await handleUpdate(validatedPayload, supabaseUrl, supabaseServiceKey);
        break;
      }

      case 'get': {
        const validatedPayload = validateGetPayload(payload);
        result = await handleGet(validatedPayload, supabaseUrl, supabaseServiceKey);
        break;
      }

      case 'get-by-visit': {
        const validatedPayload = validateGetByVisitPayload(payload);
        result = await handleGetByVisit(validatedPayload, supabaseUrl, supabaseServiceKey);
        break;
      }

      case 'delete': {
        const validatedPayload = validateDeletePayload(payload);
        result = await handleDelete(validatedPayload, supabaseUrl, supabaseServiceKey);
        break;
      }

      case 'process-pending': {
        const batchSize = validateBatchSize(payload?.batchSize);
        result = await handleProcessPending(batchSize, supabaseUrl, supabaseServiceKey);
        break;
      }

      case 'webhook-sendgrid': {
        result = await handleSendGridWebhook(
          {
            messageId: payload?.messageId as string,
            event: payload?.event as string,
            timestamp: payload?.timestamp as string,
          },
          supabaseUrl,
          supabaseServiceKey
        );
        break;
      }

      case 'webhook-twilio': {
        result = await handleTwilioWebhook(
          {
            messageSid: payload?.messageSid as string,
            event: payload?.event as string,
            timestamp: payload?.timestamp as string,
          },
          supabaseUrl,
          supabaseServiceKey
        );
        break;
      }

      default:
        throw new ValidationError(`Unknown action: ${action}`);
    }

    console.log(`[reminder-scheduler] ========== SUCCESS ==========`);

    return formatSuccessResponse(result);

  } catch (error) {
    console.error(`[reminder-scheduler] ========== ERROR ==========`);
    console.error(`[reminder-scheduler]`, error);

    errorLog = addError(errorLog, error as Error, 'Fatal error in main handler');
    reportErrorLog(errorLog);

    return formatErrorResponseHttp(error as Error);
  }
});
