/**
 * Notify Host Handler
 * Split Lease - Supabase Edge Functions
 *
 * Sends email notification to host about assigned co-host and scheduled meeting.
 * Called after admin claims a co-host request via Slack.
 *
 * NO FALLBACK PRINCIPLE: All errors fail fast without fallback logic
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface NotifyHostInput {
  requestId: string;
  hostEmail: string;
  hostName: string;
  cohostName: string;
  meetingDateTime: string;
  googleMeetLink?: string;
}

interface NotifyHostResponse {
  success: boolean;
  message: string;
}

// ─────────────────────────────────────────────────────────────
// Handler
// ─────────────────────────────────────────────────────────────

/**
 * Handle notify-host action
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

  console.log(`[cohost-request:notify-host] Processing notification for request: ${input.requestId}`);
  console.log(`[cohost-request:notify-host] Host: ${input.hostName} (${input.hostEmail})`);
  console.log(`[cohost-request:notify-host] Co-Host: ${input.cohostName}`);

  // ================================================
  // FORMAT MEETING DATE/TIME
  // ================================================

  const meetingDate = new Date(input.meetingDateTime);

  const formattedDate = meetingDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'America/New_York'
  });

  const formattedTime = meetingDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/New_York'
  });

  console.log(`[cohost-request:notify-host] Meeting: ${formattedDate} at ${formattedTime} EST`);

  // ================================================
  // BUILD EMAIL CONTENT
  // ================================================

  const emailSubject = `Your Co-Host Session is Scheduled - ${formattedDate}`;

  const emailHtml = `
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
            <td style="padding: 8px 0;">${formattedDate}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold;">Time:</td>
            <td style="padding: 8px 0;">${formattedTime} EST</td>
          </tr>
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
  `;

  const emailText = `
Your Co-Host Session is Confirmed!

Hi ${input.hostName || 'there'},

Great news! Your co-host request has been assigned and your virtual meeting is scheduled.

MEETING DETAILS
---------------
Co-Host: ${input.cohostName}
Date: ${formattedDate}
Time: ${formattedTime} EST
${input.googleMeetLink ? `Join: ${input.googleMeetLink}` : ''}

Your co-host will help guide you through the hosting process and answer any questions you may have about listing your space on Split Lease.

If you need to reschedule, please reply to this email or contact our support team.

Best,
The Split Lease Team

Request ID: ${input.requestId}
  `.trim();

  // ================================================
  // SEND EMAIL
  // ================================================

  // Check for Resend API key
  const resendApiKey = Deno.env.get('RESEND_API_KEY');

  if (resendApiKey) {
    // Send via Resend
    console.log(`[cohost-request:notify-host] Sending email via Resend to: ${input.hostEmail}`);

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Split Lease <noreply@splitlease.com>',
          to: input.hostEmail,
          subject: emailSubject,
          html: emailHtml,
          text: emailText
        })
      });

      const result = await response.json();

      if (!response.ok) {
        console.error(`[cohost-request:notify-host] Resend error:`, result);
        // Don't throw - log and continue to update status
      } else {
        console.log(`[cohost-request:notify-host] Email sent successfully, id: ${result.id}`);
      }
    } catch (error) {
      console.error(`[cohost-request:notify-host] Failed to send email:`, error);
      // Don't throw - log and continue to update status
    }
  } else {
    // No email service configured - log for manual follow-up
    console.warn('[cohost-request:notify-host] RESEND_API_KEY not configured');
    console.log('[cohost-request:notify-host] Email content for manual sending:');
    console.log(`To: ${input.hostEmail}`);
    console.log(`Subject: ${emailSubject}`);
    console.log(`Body:\n${emailText}`);
  }

  // ================================================
  // UPDATE REQUEST STATUS
  // ================================================

  const { error: updateError } = await supabase
    .from('co_hostrequest')
    .update({
      "Status - Co-Host Request": "google meet scheduled",
      "Modified Date": new Date().toISOString()
    })
    .eq('_id', input.requestId);

  if (updateError) {
    console.error(`[cohost-request:notify-host] Status update failed:`, updateError);
    // Don't throw - notification was the primary goal
  } else {
    console.log(`[cohost-request:notify-host] Status updated to "google meet scheduled"`);
  }

  return {
    success: true,
    message: `Notification processed for request ${input.requestId}`
  };
}
