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
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders } from "../_shared/cors.ts";
import {
  ValidationError,
  AuthenticationError,
  formatErrorResponse,
  getStatusCodeFromError,
} from "../_shared/errors.ts";
import { validateRequired, validateAction } from "../_shared/validation.ts";
import { createErrorCollector, ErrorCollector } from "../_shared/slack.ts";

import {
  buildTwilioEndpoint,
  buildTwilioRequestBody,
  sendSms,
  isSuccessResponse,
  getMessageSid,
} from "./lib/twilioClient.ts";
import type { SendSmsPayload, SendSmsResult } from "./lib/types.ts";

// ─────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────

const ALLOWED_ACTIONS = ["send", "health"] as const;
type Action = (typeof ALLOWED_ACTIONS)[number];

// Phone numbers that can send SMS without user authentication
// Used for magic link SMS sent to unauthenticated users
const PUBLIC_FROM_NUMBERS = [
  '+14155692985',  // Magic link SMS
] as const;

interface RequestBody {
  action: Action;
  payload: SendSmsPayload;
}

// E.164 phone format validation
const E164_REGEX = /^\+[1-9]\d{1,14}$/;

function validatePhoneNumber(phone: string, fieldName: string): void {
  if (!E164_REGEX.test(phone)) {
    throw new ValidationError(
      `${fieldName} must be in E.164 format (e.g., +15551234567). Got: ${phone}`
    );
  }
}

// ─────────────────────────────────────────────────────────────
// Health Check Handler
// ─────────────────────────────────────────────────────────────

function handleHealth(): { status: string; timestamp: string; actions: string[]; secrets: Record<string, boolean> } {
  const twilioAccountSidConfigured = !!Deno.env.get('TWILIO_ACCOUNT_SID');
  const twilioAuthTokenConfigured = !!Deno.env.get('TWILIO_AUTH_TOKEN');
  const allConfigured = twilioAccountSidConfigured && twilioAuthTokenConfigured;

  return {
    status: allConfigured ? 'healthy' : 'unhealthy (missing secrets)',
    timestamp: new Date().toISOString(),
    actions: [...ALLOWED_ACTIONS],
    secrets: {
      TWILIO_ACCOUNT_SID: twilioAccountSidConfigured,
      TWILIO_AUTH_TOKEN: twilioAuthTokenConfigured,
    },
  };
}

// ─────────────────────────────────────────────────────────────
// Send Handler - Direct Twilio Proxy
// ─────────────────────────────────────────────────────────────

async function handleSend(payload: SendSmsPayload): Promise<SendSmsResult> {
  console.log('[send-sms] Processing send request...');

  // 1. Validate required fields
  validateRequired(payload.to, 'payload.to');
  validateRequired(payload.from, 'payload.from');
  validateRequired(payload.body, 'payload.body');

  // 2. Validate phone formats
  validatePhoneNumber(payload.to, 'payload.to');
  validatePhoneNumber(payload.from, 'payload.from');

  console.log('[send-sms] To:', payload.to);
  console.log('[send-sms] From:', payload.from);
  console.log('[send-sms] Body length:', payload.body.length);

  // 3. Get Twilio credentials
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');

  if (!accountSid || !authToken) {
    throw new Error('Missing Twilio credentials (TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN)');
  }

  // 4. Build request body (URL-encoded)
  const requestBody = buildTwilioRequestBody({
    toPhone: payload.to,
    fromPhone: payload.from,
    body: payload.body,
  });

  // 5. Send to Twilio
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
}

// ─────────────────────────────────────────────────────────────
// Main Handler
// ─────────────────────────────────────────────────────────────

console.log("[send-sms] Edge Function started");

Deno.serve(async (req: Request) => {
  console.log(`[send-sms] ========== REQUEST ==========`);
  console.log(`[send-sms] Method: ${req.method}`);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  // Only POST allowed
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ success: false, error: "Method not allowed" }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // Error collector for consolidated error reporting
  let collector: ErrorCollector | null = null;

  try {
    // 1. Parse and validate request
    const body: RequestBody = await req.json();

    validateRequired(body.action, "action");
    validateAction(body.action, [...ALLOWED_ACTIONS]);

    console.log(`[send-sms] Action: ${body.action}`);

    // Create error collector after we know the action
    collector = createErrorCollector('send-sms', body.action);

    // 2. Check authorization for send action
    if (body.action === 'send') {
      // Check if this is a public SMS (magic link from known number)
      const fromNumber = body.payload?.from;
      const isPublicSms = fromNumber && PUBLIC_FROM_NUMBERS.includes(fromNumber as typeof PUBLIC_FROM_NUMBERS[number]);

      if (isPublicSms) {
        console.log(`[send-sms] Public SMS from ${fromNumber} - bypassing user auth`);
      } else {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
          throw new AuthenticationError("Missing or invalid Authorization header. Use Bearer token.");
        }

        const token = authHeader.replace("Bearer ", "");
        if (!token) {
          throw new AuthenticationError("Empty Bearer token");
        }

        console.log(`[send-sms] Authorization header present`);
      }
    }

    // 3. Route to handler
    let result;

    switch (body.action) {
      case "send":
        validateRequired(body.payload, "payload");
        result = await handleSend(body.payload);
        break;

      case "health":
        result = handleHealth();
        break;

      default:
        throw new ValidationError(`Unhandled action: ${body.action}`);
    }

    console.log(`[send-sms] ========== SUCCESS ==========`);

    return new Response(JSON.stringify({ success: true, data: result }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(`[send-sms] ========== ERROR ==========`);
    console.error(`[send-sms]`, error);

    // Report to Slack (fire-and-forget)
    if (collector) {
      collector.add(error as Error, 'Fatal error in main handler');
      collector.reportToSlack();
    }

    const statusCode = getStatusCodeFromError(error as Error);
    const errorResponse = formatErrorResponse(error as Error);

    return new Response(JSON.stringify(errorResponse), {
      status: statusCode,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
