/**
 * Type definitions for send-sms Edge Function
 * Split Lease
 *
 * Direct Twilio proxy - no templates, just forward to/from/body
 */

// Request payload for send action
export interface SendSmsPayload {
  to: string;     // Recipient phone in E.164 format (+15551234567)
  from: string;   // Sender phone in E.164 format
  body: string;   // SMS message content
}

// Twilio API response wrapper
export interface TwilioResponse {
  statusCode: number;
  body?: TwilioMessageResponse | TwilioErrorResponse | string;
}

// Successful Twilio message response
export interface TwilioMessageResponse {
  sid: string;                    // Message SID (unique identifier)
  date_created: string;
  date_updated: string;
  date_sent: string | null;
  account_sid: string;
  to: string;
  from: string;
  messaging_service_sid: string | null;
  body: string;
  status: TwilioMessageStatus;
  num_segments: string;
  num_media: string;
  direction: string;
  api_version: string;
  price: string | null;
  price_unit: string;
  error_code: string | null;
  error_message: string | null;
  uri: string;
}

// Twilio error response
export interface TwilioErrorResponse {
  code: number;
  message: string;
  more_info: string;
  status: number;
}

// Twilio message status values
export type TwilioMessageStatus =
  | 'queued'
  | 'sending'
  | 'sent'
  | 'delivered'
  | 'undelivered'
  | 'failed';

// Result from send action
export interface SendSmsResult {
  message_sid?: string;
  to: string;
  from: string;
  status: 'queued' | 'failed';
  sent_at: string;
}
