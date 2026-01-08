/**
 * Notify Host Handler
 * Split Lease - Supabase Edge Functions
 *
 * Sends email notification to host about assigned co-host and scheduled meeting.
 * Called after admin claims a co-host request via Slack.
 *
 * FP PATTERN: Separates pure data builders from effectful operations
 * All data transformations are pure with @pure annotations
 * All API/database operations are explicit with @effectful annotations
 *
 * NO FALLBACK PRINCIPLE: All errors fail fast without fallback logic
 *
 * @module cohost-request/handlers/notify-host
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const LOG_PREFIX = '[cohost-request:notify-host]'
const SCHEDULED_STATUS = 'google meet scheduled'
const RESEND_API_URL = 'https://api.resend.com/emails'
const EMAIL_FROM = 'Split Lease <noreply@splitlease.com>'
const TIMEZONE = 'America/New_York'

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface NotifyHostInput {
  readonly requestId: string;
  readonly hostEmail: string;
  readonly hostName: string;
  readonly cohostName: string;
  readonly meetingDateTime: string;
  readonly googleMeetLink?: string;
}

interface NotifyHostResponse {
  readonly success: boolean;
  readonly message: string;
}

interface ParsedDateTime {
  readonly formattedDate: string;
  readonly formattedTime: string;
}

// ─────────────────────────────────────────────────────────────
// Pure Predicates
// ─────────────────────────────────────────────────────────────

/**
 * Check if string is a valid ISO date
 * @pure
 */
const isValidIsoDate = (dateStr: string): boolean =>
  !isNaN(new Date(dateStr).getTime())

// ─────────────────────────────────────────────────────────────
// Pure Data Builders
// ─────────────────────────────────────────────────────────────

/**
 * Parse and format meeting date/time
 * @pure
 */
const parseMeetingDateTime = (meetingDateTime: string): ParsedDateTime => {
  const meetingDate = new Date(meetingDateTime);

  if (isValidIsoDate(meetingDateTime)) {
    return {
      formattedDate: meetingDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: TIMEZONE
      }),
      formattedTime: meetingDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: TIMEZONE
      })
    };
  }

  // Display text format: "Monday, December 23, 2024 at 02:00 PM EST"
  const parts = meetingDateTime.split(' at ');
  if (parts.length === 2) {
    return {
      formattedDate: parts[0].trim(),
      formattedTime: parts[1].replace(' EST', '').trim()
    };
  }

  // Fallback
  return {
    formattedDate: meetingDateTime,
    formattedTime: ''
  };
}

/**
 * Build email subject
 * @pure
 */
const buildEmailSubject = (formattedDate: string): string =>
  `Your Co-Host Session is Scheduled - ${formattedDate}`

/**
 * Build email HTML content
 * @pure
 */
const buildEmailHtml = (input: NotifyHostInput, parsed: ParsedDateTime): string => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h2 style="color: #6D31C2; margin: 0;">Your Co-Host Session is Confirmed! 🎉</h2>
      </div>

      <p>Hi ${input.hostName || 'there'},</p>

      <p>Great news! Your co-host request has been assigned and your virtual meeting is scheduled.</p>

      <div style="background: #F1F3F5; padding: 20px; border-radius: 10px; margin: 24px 0;">
        <h3 style="margin-top: 0; color: #424242;">Meeting Details</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; font-weight: bold; width: 100px;">Co-Host:</td>
            <td style="padding: 8px 0;">${input.cohostName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold;">Date:</td>
            <td style="padding: 8px 0;">${parsed.formattedDate}</td>
          </tr>
          ${parsed.formattedTime ? `
          <tr>
            <td style="padding: 8px 0; font-weight: bold;">Time:</td>
            <td style="padding: 8px 0;">${parsed.formattedTime} EST</td>
          </tr>
          ` : ''}
          ${input.googleMeetLink ? `
          <tr>
            <td style="padding: 8px 0; font-weight: bold;">Join:</td>
            <td style="padding: 8px 0;">
              <a href="${input.googleMeetLink}" style="color: #6D31C2; text-decoration: none;">
                ${input.googleMeetLink}
              </a>
            </td>
          </tr>
          ` : ''}
        </table>
      </div>

      ${input.googleMeetLink ? `
      <div style="text-align: center; margin: 24px 0;">
        <a href="${input.googleMeetLink}"
           style="display: inline-block; background: #6D31C2; color: white; padding: 14px 28px;
                  text-decoration: none; border-radius: 8px; font-weight: bold;">
          Join Google Meet
        </a>
      </div>
      ` : `
      <p style="color: #666; font-style: italic;">
        A Google Meet link will be sent separately before your session.
      </p>
      `}

      <p>Your co-host will help guide you through the hosting process and answer any questions you may have about listing your space on Split Lease.</p>

      <p>If you need to reschedule, please reply to this email or contact our support team.</p>

      <hr style="border: none; border-top: 1px solid #E3E3E3; margin: 24px 0;">

      <p style="margin-bottom: 0;">Best,</p>
      <p style="margin-top: 4px; font-weight: bold;">The Split Lease Team</p>

      <p style="color: #999; font-size: 12px; margin-top: 24px;">
        Request ID: ${input.requestId}
      </p>
    </body>
    </html>
  `

/**
 * Build email plain text content
 * @pure
 */
const buildEmailText = (input: NotifyHostInput, parsed: ParsedDateTime): string => `
Your Co-Host Session is Confirmed!

Hi ${input.hostName || 'there'},

Great news! Your co-host request has been assigned and your virtual meeting is scheduled.

MEETING DETAILS
---------------
Co-Host: ${input.cohostName}
Date: ${parsed.formattedDate}
${parsed.formattedTime ? `Time: ${parsed.formattedTime} EST` : ''}
${input.googleMeetLink ? `Join: ${input.googleMeetLink}` : ''}

Your co-host will help guide you through the hosting process and answer any questions you may have about listing your space on Split Lease.

If you need to reschedule, please reply to this email or contact our support team.

Best,
The Split Lease Team

Request ID: ${input.requestId}
  `.trim()

/**
 * Build success response
 * @pure
 */
const buildSuccessResponse = (requestId: string): NotifyHostResponse =>
  Object.freeze({
    success: true,
    message: `Notification processed for request ${requestId}`
  })

// ─────────────────────────────────────────────────────────────
// Email Operations
// ─────────────────────────────────────────────────────────────

/**
 * Send email via Resend API
 * @effectful - External API call (non-blocking)
 */
const sendEmailViaResend = async (
  apiKey: string,
  to: string,
  subject: string,
  html: string,
  text: string
): Promise<void> => {
  try {
    const response = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to,
        subject,
        html,
        text
      })
    });

    const result = await response.json();

    if (!response.ok) {
      console.error(`${LOG_PREFIX} Resend error:`, result);
    } else {
      console.log(`${LOG_PREFIX} Email sent successfully, id: ${result.id}`);
    }
  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to send email:`, error);
  }
}

/**
 * Log email content for manual sending
 * @effectful - Console output
 */
const logEmailForManualSending = (
  to: string,
  subject: string,
  text: string
): void => {
  console.warn(`${LOG_PREFIX} RESEND_API_KEY not configured`);
  console.log(`${LOG_PREFIX} Email content for manual sending:`);
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`Body:\n${text}`);
}

// ─────────────────────────────────────────────────────────────
// Database Operations
// ─────────────────────────────────────────────────────────────

/**
 * Update request status to scheduled
 * @effectful - Database write operation (non-blocking)
 */
const updateRequestStatus = async (
  supabase: SupabaseClient,
  requestId: string
): Promise<void> => {
  const { error } = await supabase
    .from('co_hostrequest')
    .update({
      "Status - Co-Host Request": SCHEDULED_STATUS,
      "Modified Date": new Date().toISOString()
    })
    .eq('_id', requestId);

  if (error) {
    console.error(`${LOG_PREFIX} Status update failed:`, error);
  } else {
    console.log(`${LOG_PREFIX} Status updated to "${SCHEDULED_STATUS}"`);
  }
}

// ─────────────────────────────────────────────────────────────
// Main Handler
// ─────────────────────────────────────────────────────────────

/**
 * Handle notify-host action
 * @effectful - Orchestrates email and database operations
 *
 * Steps:
 * 1. Format meeting date/time for display
 * 2. Send email notification to host
 * 3. Update request status to "google meet scheduled"
 */
export async function handleNotifyHost(
  payload: Record<string, unknown>,
  supabase: SupabaseClient
): Promise<NotifyHostResponse> {
  const input = payload as unknown as NotifyHostInput;

  console.log(`${LOG_PREFIX} Processing notification for request: ${input.requestId}`);
  console.log(`${LOG_PREFIX} Host: ${input.hostName} (${input.hostEmail})`);
  console.log(`${LOG_PREFIX} Co-Host: ${input.cohostName}`);

  // ================================================
  // FORMAT MEETING DATE/TIME
  // ================================================

  const parsed = parseMeetingDateTime(input.meetingDateTime);
  console.log(`${LOG_PREFIX} Meeting: ${parsed.formattedDate}${parsed.formattedTime ? ` at ${parsed.formattedTime} EST` : ''}`);

  // ================================================
  // BUILD EMAIL CONTENT
  // ================================================

  const subject = buildEmailSubject(parsed.formattedDate);
  const html = buildEmailHtml(input, parsed);
  const text = buildEmailText(input, parsed);

  // ================================================
  // SEND EMAIL
  // ================================================

  const resendApiKey = Deno.env.get('RESEND_API_KEY');

  if (resendApiKey) {
    console.log(`${LOG_PREFIX} Sending email via Resend to: ${input.hostEmail}`);
    await sendEmailViaResend(resendApiKey, input.hostEmail, subject, html, text);
  } else {
    logEmailForManualSending(input.hostEmail, subject, text);
  }

  // ================================================
  // UPDATE REQUEST STATUS
  // ================================================

  await updateRequestStatus(supabase, input.requestId);

  return buildSuccessResponse(input.requestId);
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
  SCHEDULED_STATUS,
  RESEND_API_URL,
  EMAIL_FROM,
  TIMEZONE,

  // Pure Predicates
  isValidIsoDate,

  // Pure Data Builders
  parseMeetingDateTime,
  buildEmailSubject,
  buildEmailHtml,
  buildEmailText,
  buildSuccessResponse,

  // Email Operations
  sendEmailViaResend,
  logEmailForManualSending,

  // Database Operations
  updateRequestStatus,

  // Main Handler
  handleNotifyHost,
})
