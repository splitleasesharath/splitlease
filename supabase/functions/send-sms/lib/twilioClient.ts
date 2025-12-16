/**
 * Twilio API Client
 * Split Lease - send-sms Edge Function
 *
 * Handles Twilio API communication for sending SMS messages
 *
 * IMPORTANT: Twilio uses form-urlencoded POST, not JSON
 */

import type { TwilioResponse, TwilioMessageResponse } from './types.ts';

/**
 * Build the Twilio API endpoint URL
 */
export function buildTwilioEndpoint(accountSid: string): string {
  return `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
}

/**
 * Build Twilio SMS request body (form-urlencoded)
 */
export function buildTwilioRequestBody(params: {
  toPhone: string;
  fromPhone: string;
  body: string;
  statusCallback?: string;
}): URLSearchParams {
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
 * Send SMS via Twilio API
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
  console.log('[twilioClient] Sending SMS via Twilio...');
  console.log('[twilioClient] To:', requestBody.get('To'));
  console.log('[twilioClient] Body length:', requestBody.get('Body')?.length || 0);

  const endpoint = buildTwilioEndpoint(accountSid);

  // Twilio uses HTTP Basic Auth
  const credentials = btoa(`${accountSid}:${authToken}`);

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: requestBody.toString(),
  });

  const result: TwilioResponse = {
    statusCode: response.status,
  };

  // Parse response body
  try {
    result.body = await response.json();
  } catch {
    result.body = await response.text();
  }

  if (!response.ok) {
    console.error('[twilioClient] Twilio API error:', result.statusCode, result.body);
  } else {
    const messageResponse = result.body as TwilioMessageResponse;
    console.log('[twilioClient] SMS queued successfully, SID:', messageResponse.sid);
    console.log('[twilioClient] Status:', messageResponse.status);
  }

  return result;
}

/**
 * Check if Twilio response indicates success
 * Twilio returns 201 Created for successful message creation
 */
export function isSuccessResponse(response: TwilioResponse): boolean {
  return response.statusCode === 201;
}

/**
 * Extract message SID from successful response
 */
export function getMessageSid(response: TwilioResponse): string | undefined {
  if (isSuccessResponse(response) && response.body && typeof response.body === 'object') {
    return (response.body as TwilioMessageResponse).sid;
  }
  return undefined;
}
