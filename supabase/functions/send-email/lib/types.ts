/**
 * Type definitions for send-email Edge Function
 * Split Lease
 *
 * FP PATTERN: All interfaces use readonly modifiers for immutability
 *
 * @module send-email/lib/types
 */

// ─────────────────────────────────────────────────────────────
// Request Types
// ─────────────────────────────────────────────────────────────

/**
 * Request payload for send action
 */
export interface SendEmailPayload {
  readonly template_id: string;           // ID of template in reference_table.zat_email_html_template_eg_sendbasicemailwf_
  readonly to_email: string;              // Recipient email address
  readonly to_name?: string;              // Recipient name (optional)
  readonly from_email?: string;           // Sender email (optional, uses default)
  readonly from_name?: string;            // Sender name (optional, uses default)
  readonly subject?: string;              // Email subject (optional, may come from template)
  readonly variables: Readonly<Record<string, string>>;  // Key-value pairs for placeholder replacement
  readonly cc_emails?: readonly string[];          // CC recipients (optional)
  readonly bcc_emails?: readonly string[];         // BCC recipients (optional)
}

// ─────────────────────────────────────────────────────────────
// Database Types
// ─────────────────────────────────────────────────────────────

/**
 * Email template from database (reference_table.zat_email_html_template_eg_sendbasicemailwf_)
 * Schema columns: _id, "Created By", "Created Date", "Description", "Email Reference",
 *                 "Email Template JSON", "Logo", "Modified Date", "Name", "Placeholder"
 */
export interface EmailTemplate {
  readonly _id: string;
  readonly Name?: string;
  readonly 'Email Template JSON': string;  // The HTML template with {{ placeholders }}
  readonly Description?: string;           // Template description
  readonly 'Email Reference'?: string;     // Reference identifier
  readonly Logo?: string;                  // Logo URL
  readonly Placeholder?: readonly string[];         // Array of placeholder names
}

// ─────────────────────────────────────────────────────────────
// SendGrid API Types
// ─────────────────────────────────────────────────────────────

/**
 * SendGrid recipient
 */
export interface SendGridRecipient {
  readonly email: string;
  readonly name?: string;
}

/**
 * SendGrid personalization
 */
export interface SendGridPersonalization {
  readonly to: readonly SendGridRecipient[];
  readonly subject?: string;
  readonly cc?: readonly SendGridRecipient[];
  readonly bcc?: readonly SendGridRecipient[];
}

/**
 * SendGrid content block
 */
export interface SendGridContent {
  readonly type: 'text/html' | 'text/plain';
  readonly value: string;
}

/**
 * SendGrid request body structure
 */
export interface SendGridMailRequest {
  readonly personalizations: readonly SendGridPersonalization[];
  readonly from: SendGridRecipient;
  readonly content: readonly SendGridContent[];
  readonly reply_to?: SendGridRecipient;
}

/**
 * SendGrid API response
 */
export interface SendGridResponse {
  readonly statusCode: number;
  readonly body?: unknown;
  readonly headers?: Readonly<Record<string, string>>;
}

// ─────────────────────────────────────────────────────────────
// Response Types
// ─────────────────────────────────────────────────────────────

/**
 * Result from send action
 */
export interface SendEmailResult {
  readonly message_id?: string;
  readonly template_id: string;
  readonly to_email: string;
  readonly status: 'sent' | 'failed';
  readonly sent_at: string;
}
