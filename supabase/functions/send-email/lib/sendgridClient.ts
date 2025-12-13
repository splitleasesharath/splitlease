/**
 * SendGrid API Client
 * Split Lease - send-email Edge Function
 *
 * Handles SendGrid API communication for sending emails
 */

import type { SendGridMailRequest, SendGridResponse } from './types.ts';

/**
 * Build SendGrid mail request body
 */
export function buildSendGridRequestBody(params: {
  toEmail: string;
  toName?: string;
  fromEmail: string;
  fromName?: string;
  subject: string;
  htmlContent: string;
}): SendGridMailRequest {
  const { toEmail, toName, fromEmail, fromName, subject, htmlContent } = params;

  return {
    personalizations: [
      {
        to: [
          {
            email: toEmail,
            ...(toName && { name: toName }),
          },
        ],
        subject: subject,
      },
    ],
    from: {
      email: fromEmail,
      ...(fromName && { name: fromName }),
    },
    content: [
      {
        type: 'text/html',
        value: htmlContent,
      },
    ],
  };
}

/**
 * Send email via SendGrid API
 *
 * @param apiKey - SendGrid API key
 * @param requestBody - SendGrid mail request body
 * @returns SendGrid response
 */
export async function sendEmail(
  apiKey: string,
  emailEndpoint: string,
  requestBody: SendGridMailRequest
): Promise<SendGridResponse> {
  console.log('[sendgridClient] Sending email via SendGrid...');
  console.log('[sendgridClient] To:', requestBody.personalizations[0].to[0].email);
  console.log('[sendgridClient] Subject:', requestBody.personalizations[0].subject);

  const response = await fetch(emailEndpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  // SendGrid returns 202 Accepted for successful sends
  const result: SendGridResponse = {
    statusCode: response.status,
    headers: Object.fromEntries(response.headers.entries()),
  };

  // Try to parse body if present
  if (!response.ok) {
    try {
      result.body = await response.json();
    } catch {
      result.body = await response.text();
    }
    console.error('[sendgridClient] SendGrid API error:', result.statusCode, result.body);
  } else {
    console.log('[sendgridClient] Email sent successfully, status:', result.statusCode);
    // Get message ID from headers if available
    const messageId = response.headers.get('x-message-id');
    if (messageId) {
      result.body = { messageId };
    }
  }

  return result;
}

/**
 * Check if SendGrid response indicates success
 * SendGrid returns 202 Accepted for successful email sends
 */
export function isSuccessResponse(response: SendGridResponse): boolean {
  return response.statusCode === 202 || response.statusCode === 200;
}
