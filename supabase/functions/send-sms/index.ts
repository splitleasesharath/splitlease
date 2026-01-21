/**
 * Send SMS Edge Function
 * Split Lease - Supabase Edge Functions
 *
 * Direct Twilio proxy - forwards SMS requests to Twilio API
 *
 * Request: { action: "send", payload: { to, from, body } }
 * Twilio: POST form-urlencoded with HTTP Basic Auth
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
import { Result, ok, err } from "../_shared/functional/result.ts";
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
import { validateRequired } from "../_shared/validation.ts";

import {
  buildTwilioRequestBody,
  sendSms,
  isSuccessResponse,
  getMessageSid,
} from "./lib/twilioClient.ts";
import type { SendSmsPayload, SendSmsResult } from "./lib/types.ts";

// ─────────────────────────────────────────────────────────────
// Configuration (Immutable)
// ─────────────────────────────────────────────────────────────

const ALLOWED_ACTIONS = ["send", "health"] as const;
type Action = typeof ALLOWED_ACTIONS[number];

// Phone numbers that can send SMS without user authentication
const PUBLIC_FROM_NUMBERS: ReadonlySet<string> = new Set([
  '+14155692985',  // Magic link SMS
]);

// E.164 phone format validation
const E164_REGEX = /^\+[1-9]\d{1,14}$/;

// ─────────────────────────────────────────────────────────────
// Pure Functions
// ─────────────────────────────────────────────────────────────

const validatePhoneNumber = (phone: string, fieldName: string): void => {
  if (!E164_REGEX.test(phone)) {
    throw new ValidationError(
      `${fieldName} must be in E.164 format (e.g., +15551234567). Got: ${phone}`
    );
  }
};

/**
 * Health check handler
 */
const handleHealth = (): { status: string; timestamp: string; actions: readonly string[]; secrets: Record<string, boolean> } => {
  const twilioAccountSidConfigured = !!Deno.env.get('TWILIO_ACCOUNT_SID');
  const twilioAuthTokenConfigured = !!Deno.env.get('TWILIO_AUTH_TOKEN');
  const allConfigured = twilioAccountSidConfigured && twilioAuthTokenConfigured;

  return {
    status: allConfigured ? 'healthy' : 'unhealthy (missing secrets)',
    timestamp: new Date().toISOString(),
    actions: ALLOWED_ACTIONS,
    secrets: {
      TWILIO_ACCOUNT_SID: twilioAccountSidConfigured,
      TWILIO_AUTH_TOKEN: twilioAuthTokenConfigured,
    },
  };
};

/**
 * Send SMS handler
 */
const handleSend = async (payload: SendSmsPayload): Promise<SendSmsResult> => {
  console.log('[send-sms] Processing send request...');

  // Validate required fields
  validateRequired(payload.to, 'payload.to');
  validateRequired(payload.from, 'payload.from');
  validateRequired(payload.body, 'payload.body');

  // Validate phone formats
  validatePhoneNumber(payload.to, 'payload.to');
  validatePhoneNumber(payload.from, 'payload.from');

  console.log('[send-sms] To:', payload.to);
  console.log('[send-sms] From:', payload.from);
  console.log('[send-sms] Body length:', payload.body.length);

  // Get Twilio credentials
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');

  if (!accountSid || !authToken) {
    throw new Error('Missing Twilio credentials (TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN)');
  }

  // Build request body (URL-encoded)
  const requestBody = buildTwilioRequestBody({
    toPhone: payload.to,
    fromPhone: payload.from,
    body: payload.body,
  });

  // Send to Twilio
  const response = await sendSms(accountSid, authToken, requestBody);

  if (!isSuccessResponse(response)) {
    console.error('[send-sms] Twilio API failed:', response.body);
    throw new Error(`Twilio API error: ${JSON.stringify(response.body)}`);
  }

  const messageSid = getMessageSid(response);
  console.log('[send-sms] SMS sent successfully, SID:', messageSid);

  return {
    message_sid: messageSid,
    to: payload.to,
    from: payload.from,
    status: 'queued',
    sent_at: new Date().toISOString(),
  };
};

// Handler map (immutable record)
const handlers: Readonly<Record<Action, Function>> = {
  send: handleSend,
  health: handleHealth,
};

/**
 * Check if from number is public (doesn't require auth)
 */
const isPublicFromNumber = (fromNumber: string | undefined): boolean =>
  fromNumber !== undefined && PUBLIC_FROM_NUMBERS.has(fromNumber);

// ─────────────────────────────────────────────────────────────
// Effect Boundary (Side Effects Isolated Here)
// ─────────────────────────────────────────────────────────────

console.log("[send-sms] Edge Function started (FP mode)");

Deno.serve(async (req: Request) => {
  const correlationId = crypto.randomUUID().slice(0, 8);
  let errorLog: ErrorLog = createErrorLog('send-sms', 'unknown', correlationId);

  try {
    console.log(`[send-sms] ========== REQUEST ==========`);
    console.log(`[send-sms] Method: ${req.method}`);

    const parseResult = await parseRequest(req);

    if (!parseResult.ok) {
      if (parseResult.error instanceof CorsPreflightSignal) {
        return formatCorsResponse();
      }
      throw parseResult.error;
    }

    const { action, payload, headers } = parseResult.value;
    errorLog = setAction(errorLog, action);
    console.log(`[send-sms] Action: ${action}`);

    const actionResult = validateAction(ALLOWED_ACTIONS, action);
    if (!actionResult.ok) {
      throw actionResult.error;
    }

    // Check authorization for send action
    if (action === 'send') {
      const fromNumber = payload?.from as string | undefined;
      const isPublic = isPublicFromNumber(fromNumber);

      if (isPublic) {
        console.log(`[send-sms] Public SMS from ${fromNumber} - bypassing user auth`);
      } else {
        const tokenResult = extractAuthToken(headers);
        if (!tokenResult.ok) {
          throw new AuthenticationError("Missing or invalid Authorization header. Use Bearer token.");
        }

        const token = tokenResult.value.replace("Bearer ", "");
        if (!token) {
          throw new AuthenticationError("Empty Bearer token");
        }

        console.log(`[send-sms] Authorization header present`);
      }
    }

    const handlerResult = routeToHandler(handlers, action);
    if (!handlerResult.ok) {
      throw handlerResult.error;
    }

    const handler = handlerResult.value;
    const result = action === 'health' ? handler() : await handler(payload as SendSmsPayload);

    console.log(`[send-sms] ========== SUCCESS ==========`);

    return formatSuccessResponse(result);

  } catch (error) {
    console.error(`[send-sms] ========== ERROR ==========`);
    console.error(`[send-sms]`, error);

    errorLog = addError(errorLog, error as Error, 'Fatal error in main handler');
    reportErrorLog(errorLog);

    return formatErrorResponseHttp(error as Error);
  }
});
