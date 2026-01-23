/**
 * Send Email Handler
 * Split Lease - Emergency Edge Function
 *
 * Sends email via SendGrid and logs to database
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

interface SendEmailPayload {
  emergencyId: string;
  recipientEmail: string;
  ccEmails?: string[];
  bccEmails?: string[];
  subject: string;
  bodyHtml: string;
  bodyText: string;
}

interface AdminUser {
  id: string;
  email: string;
  userId: string;
}

export async function handleSendEmail(
  payload: SendEmailPayload,
  _user: AdminUser,
  supabase: SupabaseClient
): Promise<unknown> {
  console.log('[emergency:sendEmail] Sending email for emergency:', payload.emergencyId);

  const {
    emergencyId,
    recipientEmail,
    ccEmails = [],
    bccEmails = [],
    subject,
    bodyHtml,
    bodyText,
  } = payload;

  if (!emergencyId) {
    throw new Error('Emergency ID is required');
  }

  if (!recipientEmail) {
    throw new Error('Recipient email is required');
  }

  if (!subject) {
    throw new Error('Subject is required');
  }

  if (!bodyHtml && !bodyText) {
    throw new Error('Either body HTML or body text is required');
  }

  // Verify emergency exists
  const { data: emergency, error: emergencyError } = await supabase
    .from('emergency_report')
    .select('id')
    .eq('id', emergencyId)
    .single();

  if (emergencyError || !emergency) {
    throw new Error(`Emergency not found: ${emergencyId}`);
  }

  // Get SendGrid credentials
  const sendgridApiKey = Deno.env.get('SENDGRID_API_KEY');
  const fromEmail = Deno.env.get('FROM_EMAIL') || 'noreply@splitlease.com';

  if (!sendgridApiKey) {
    throw new Error('Missing SendGrid API key');
  }

  // Create email log entry (pending)
  const { data: emailLog, error: logError } = await supabase
    .from('emergency_email_log')
    .insert({
      emergency_report_id: emergencyId,
      recipient_email: recipientEmail,
      cc_emails: ccEmails,
      bcc_emails: bccEmails,
      subject,
      body_html: bodyHtml || '',
      body_text: bodyText || '',
      status: 'PENDING',
    })
    .select()
    .single();

  if (logError) {
    console.error('[emergency:sendEmail] Log insert error:', logError);
    throw new Error(`Failed to create email log: ${logError.message}`);
  }

  // Send email via SendGrid
  try {
    await sendSendGridEmail({
      apiKey: sendgridApiKey,
      from: fromEmail,
      to: recipientEmail,
      cc: ccEmails,
      bcc: bccEmails,
      subject,
      htmlBody: bodyHtml,
      textBody: bodyText,
    });

    // Update log with success
    await supabase
      .from('emergency_email_log')
      .update({
        status: 'SENT',
        sent_at: new Date().toISOString(),
      })
      .eq('id', emailLog.id);

    console.log('[emergency:sendEmail] Email sent successfully');

    return {
      ...emailLog,
      status: 'SENT',
      sent_at: new Date().toISOString(),
    };

  } catch (sendgridError) {
    // Update log with failure
    await supabase
      .from('emergency_email_log')
      .update({
        status: 'FAILED',
        error_message: (sendgridError as Error).message,
      })
      .eq('id', emailLog.id);

    console.error('[emergency:sendEmail] SendGrid error:', sendgridError);
    throw new Error(`Failed to send email: ${(sendgridError as Error).message}`);
  }
}

/**
 * Send email via SendGrid API
 */
async function sendSendGridEmail(params: {
  apiKey: string;
  from: string;
  to: string;
  cc?: string[];
  bcc?: string[];
  subject: string;
  htmlBody?: string;
  textBody?: string;
}): Promise<void> {
  const { apiKey, from, to, cc = [], bcc = [], subject, htmlBody, textBody } = params;

  const personalizations: Record<string, unknown>[] = [{
    to: [{ email: to }],
  }];

  // Add CC recipients
  if (cc.length > 0) {
    personalizations[0].cc = cc.filter(e => e).map(email => ({ email }));
  }

  // Add BCC recipients
  if (bcc.length > 0) {
    personalizations[0].bcc = bcc.filter(e => e).map(email => ({ email }));
  }

  // Build content array
  const content: Array<{ type: string; value: string }> = [];
  if (textBody) {
    content.push({ type: 'text/plain', value: textBody });
  }
  if (htmlBody) {
    content.push({ type: 'text/html', value: htmlBody });
  }

  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations,
      from: { email: from, name: 'Split Lease' },
      subject,
      content,
    }),
  });

  if (!response.ok) {
    let errorMessage = `SendGrid API error: ${response.status}`;
    try {
      const errorBody = await response.json();
      if (errorBody.errors && errorBody.errors.length > 0) {
        errorMessage = errorBody.errors.map((e: { message: string }) => e.message).join(', ');
      }
    } catch {
      // Ignore JSON parse errors
    }
    throw new Error(errorMessage);
  }
}
