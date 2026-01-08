/**
 * Type definitions for send-sms Edge Function
 * Split Lease
 *
 * Direct Twilio proxy - no templates, just forward to/from/body
 *
 * FP PATTERN: All interfaces use readonly modifiers for immutability
 *
 * @module send-sms/lib/types
 */

// ─────────────────────────────────────────────────────────────
// Request Types
// ─────────────────────────────────────────────────────────────

/**
 * Request payload for send action
 */
export interface SendSmsPayload {
  readonly to: string;     // Recipient phone in E.164 format (+15551234567)
  readonly from: string;   // Sender phone in E.164 format
  readonly body: string;   // SMS message content
}

// ─────────────────────────────────────────────────────────────
// Twilio API Types
// ─────────────────────────────────────────────────────────────

/**
 * Twilio API response wrapper
 */
export interface TwilioResponse {
  readonly statusCode: number;
  readonly body?: TwilioMessageResponse | TwilioErrorResponse | string;
}

/**
 * Successful Twilio message response
 */
export interface TwilioMessageResponse {
  readonly sid: string;                    // Message SID (unique identifier)
  readonly date_created: string;
  readonly date_updated: string;
  readonly date_sent: string | null;
  readonly account_sid: string;
  readonly to: string;
  readonly from: string;
  readonly messaging_service_sid: string | null;
  readonly body: string;
  readonly status: TwilioMessageStatus;
  readonly num_segments: string;
  readonly num_media: string;
  readonly direction: string;
  readonly api_version: string;
  readonly price: string | null;
  readonly price_unit: string;
  readonly error_code: string | null;
  readonly error_message: string | null;
  readonly uri: string;
}

/**
 * Twilio error response
 */
export interface TwilioErrorResponse {
  readonly code: number;
  readonly message: string;
  readonly more_info: string;
  readonly status: number;
}

/**
 * Twilio message status values
 */
export type TwilioMessageStatus =
  | 'queued'
  | 'sending'
  | 'sent'
  | 'delivered'
  | 'undelivered'
  | 'failed';

// ─────────────────────────────────────────────────────────────
// Response Types
// ─────────────────────────────────────────────────────────────

/**
 * Result from send action
 */
export interface SendSmsResult {
  readonly message_sid?: string;
  readonly to: string;
  readonly from: string;
  readonly status: 'queued' | 'failed';
  readonly sent_at: string;
}
