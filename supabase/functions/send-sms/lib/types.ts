/**
 * Type definitions for send-sms Edge Function
 * Split Lease
 */

// Request payload for send action
export interface SendSmsPayload {
  template_id: string;           // ID of SMS template in database
  to_phone: string;              // Recipient phone in E.164 format (+15551234567)
  from_phone?: string;           // Sender phone (optional, uses default Twilio number)
  variables: Record<string, string>;  // Key-value pairs for placeholder replacement
}

// SMS template from database (table: zat_sms_template)
export interface SmsTemplate {
  _id: string;
  Name?: string;
  'Message Content'?: string;    // The SMS template with {{ placeholders }}
  'From Phone'?: string;         // Default from phone number
}

// Twilio API request body (form-urlencoded, not JSON)
export interface TwilioSmsRequest {
  To: string;
  From: string;
  Body: string;
  StatusCallback?: string;
}

// Twilio API response
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
  template_id: string;
  to_phone: string;
  status: 'queued' | 'failed';
  sent_at: string;
}
