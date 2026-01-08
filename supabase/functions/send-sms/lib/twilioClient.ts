/**
 * Twilio API Client
 * Split Lease - send-sms Edge Function
 *
 * Handles Twilio API communication for sending SMS messages
 *
 * IMPORTANT: Twilio uses form-urlencoded POST, not JSON
 *
 * FP PATTERN: Separates pure data builders from effectful API operations
 * All data transformations are pure with @pure annotations
 * All API operations are explicit with @effectful annotations
 *
 * @module send-sms/lib/twilioClient
 */

import type { TwilioResponse, TwilioMessageResponse } from './types.ts';

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const LOG_PREFIX = '[send-sms:twilioClient]'
const TWILIO_API_BASE = 'https://api.twilio.com/2010-04-01/Accounts'

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface TwilioRequestParams {
  readonly toPhone: string;
  readonly fromPhone: string;
  readonly body: string;
  readonly statusCallback?: string;
}

// ─────────────────────────────────────────────────────────────
// Pure Data Builders
// ─────────────────────────────────────────────────────────────

/**
 * Build the Twilio API endpoint URL
 * @pure
 */
export function buildTwilioEndpoint(accountSid: string): string {
  return `${TWILIO_API_BASE}/${accountSid}/Messages.json`;
}

/**
 * Build Twilio SMS request body (form-urlencoded)
 * @pure
 */
export function buildTwilioRequestBody(params: TwilioRequestParams): URLSearchParams {
  const { toPhone, fromPhone, body, statusCallback } = params;

  const formData = new URLSearchParams();
  formData.append('To', toPhone);
  formData.append('From', fromPhone);
  formData.append('Body', body);

  if (statusCallback) {
    formData.append('StatusCallback', statusCallback);
  }

  return formData;
}

/**
 * Build Basic Auth header value
 * @pure
 */
const buildBasicAuthHeader = (accountSid: string, authToken: string): string =>
  `Basic ${btoa(`${accountSid}:${authToken}`)}`

/**
 * Build response object from API response
 * @pure
 */
const buildResponse = (
  statusCode: number,
  body?: TwilioMessageResponse | unknown | string
): TwilioResponse =>
  Object.freeze({
    statusCode,
    body,
  })

// ─────────────────────────────────────────────────────────────
// Validation Predicates
// ─────────────────────────────────────────────────────────────

/**
 * Check if Twilio response indicates success
 * Twilio returns 201 Created for successful message creation
 * @pure
 */
export function isSuccessResponse(response: TwilioResponse): boolean {
  return response.statusCode === 201;
}

/**
 * Check if response body is a message response
 * @pure
 */
const isMessageResponse = (body: unknown): body is TwilioMessageResponse =>
  body !== null &&
  typeof body === 'object' &&
  'sid' in (body as Record<string, unknown>)

// ─────────────────────────────────────────────────────────────
// Pure Data Extractors
// ─────────────────────────────────────────────────────────────

/**
 * Extract message SID from successful response
 * @pure
 */
export function getMessageSid(response: TwilioResponse): string | undefined {
  if (isSuccessResponse(response) && isMessageResponse(response.body)) {
    return response.body.sid;
  }
  return undefined;
}

// ─────────────────────────────────────────────────────────────
// API Operations
// ─────────────────────────────────────────────────────────────

/**
 * Send SMS via Twilio API
 * @effectful - HTTP API operation
 *
 * @param accountSid - Twilio Account SID
 * @param authToken - Twilio Auth Token
 * @param requestBody - URL-encoded form data
 * @returns Twilio response
 */
export async function sendSms(
  accountSid: string,
  authToken: string,
  requestBody: URLSearchParams
): Promise<TwilioResponse> {
  console.log(`${LOG_PREFIX} Sending SMS via Twilio...`);
  console.log(`${LOG_PREFIX} To:`, requestBody.get('To'));
  console.log(`${LOG_PREFIX} Body length:`, requestBody.get('Body')?.length || 0);

  const endpoint = buildTwilioEndpoint(accountSid);
  const authHeader = buildBasicAuthHeader(accountSid, authToken);

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: Object.freeze({
      'Authorization': authHeader,
      'Content-Type': 'application/x-www-form-urlencoded',
    }),
    body: requestBody.toString(),
  });

  // Parse response body
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = await response.text();
  }

  if (!response.ok) {
    console.error(`${LOG_PREFIX} Twilio API error:`, response.status, body);
    return buildResponse(response.status, body);
  }

  const messageResponse = body as TwilioMessageResponse;
  console.log(`${LOG_PREFIX} SMS queued successfully, SID:`, messageResponse.sid);
  console.log(`${LOG_PREFIX} Status:`, messageResponse.status);

  return buildResponse(response.status, body);
}

// ─────────────────────────────────────────────────────────────
// Exported Test Constants
// ─────────────────────────────────────────────────────────────

/**
 * Exported for testing purposes
 * @test
 */
export const __test__ = Object.freeze({
  // Constants
  LOG_PREFIX,
  TWILIO_API_BASE,

  // Pure Data Builders
  buildTwilioEndpoint,
  buildTwilioRequestBody,
  buildBasicAuthHeader,
  buildResponse,

  // Validation Predicates
  isSuccessResponse,
  isMessageResponse,

  // Pure Data Extractors
  getMessageSid,

  // API Operations
  sendSms,
})
