/**
 * Type definitions for send-email Edge Function
 * Split Lease
 */

// Request payload for send action
export interface SendEmailPayload {
  template_id: string;           // ID of template in reference_table.zat_email_html_template_eg_sendbasicemailwf_
  to_email: string;              // Recipient email address
  to_name?: string;              // Recipient name (optional)
  from_email?: string;           // Sender email (optional, uses default)
  from_name?: string;            // Sender name (optional, uses default)
  subject?: string;              // Email subject (optional, may come from template)
  variables: Record<string, string>;  // Key-value pairs for placeholder replacement
  cc_emails?: string[];          // CC recipients (optional)
  bcc_emails?: string[];         // BCC recipients (optional)
}

// Email template from database (reference_table.zat_email_html_template_eg_sendbasicemailwf_)
// Schema columns: _id, "Created By", "Created Date", "Description", "Email Reference",
//                 "Email Template JSON", "Logo", "Modified Date", "Name", "Placeholder"
export interface EmailTemplate {
  _id: string;
  Name?: string;
  'Email Template JSON': string;  // The HTML template with {{ placeholders }}
  Description?: string;           // Template description
  'Email Reference'?: string;     // Reference identifier
  Logo?: string;                  // Logo URL
  Placeholder?: string[];         // Array of placeholder names
}

// SendGrid request body structure
export interface SendGridMailRequest {
  personalizations: Array<{
    to: Array<{ email: string; name?: string }>;
    subject?: string;
  }>;
  from: {
    email: string;
    name?: string;
  };
  content: Array<{
    type: 'text/html' | 'text/plain';
    value: string;
  }>;
  reply_to?: {
    email: string;
    name?: string;
  };
}

// SendGrid API response
export interface SendGridResponse {
  statusCode: number;
  body?: unknown;
  headers?: Record<string, string>;
}

// Result from send action
export interface SendEmailResult {
  message_id?: string;
  template_id: string;
  to_email: string;
  status: 'sent' | 'failed';
  sent_at: string;
}
