/**
 * Send Magic Link via SMS Handler
 * Split Lease - auth-user
 *
 * Atomic operation that:
 * 1. Generates a magic link via Supabase Auth
 * 2. Sends the link via SMS using Twilio
 *
 * This ensures both operations succeed or fail together,
 * preventing partial failures (link generated but SMS failed).
 *
 * Use Case: Usability testing - prompt desktop users to continue on mobile
 *
 * @param supabaseUrl - Supabase project URL
 * @param supabaseServiceKey - Supabase service role key for admin operations
 * @param payload - Request payload {email, phoneNumber, redirectTo?}
 * @returns {success, message_sid, sent_at} or throws on error
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { BubbleApiError } from '../../_shared/errors.ts';
import { validateRequiredFields, validateEmail } from '../../_shared/validation.ts';

// E.164 phone format validation (matches send-sms)
const E164_REGEX = /^\+[1-9]\d{1,14}$/;

// Twilio configuration - uses same credentials as send-sms
const TWILIO_FROM_NUMBER = '+14155692985'; // Magic link SMS number (public, no auth required)

interface SendMagicLinkSmsPayload {
  email: string;
  phoneNumber: string;
  redirectTo?: string;
}

interface SendMagicLinkSmsResult {
  success: boolean;
  message_sid: string;
  sent_at: string;
  redirect_to: string;
}

/**
 * Validate phone number is in E.164 format
 */
const validatePhoneNumber = (phone: string): void => {
  if (!E164_REGEX.test(phone)) {
    throw new BubbleApiError(
      `Phone number must be in E.164 format (e.g., +15551234567). Got: ${phone}`,
      400
    );
  }
};

/**
 * Build the SMS message body with the magic link
 */
const buildSmsMessage = (magicLink: string): string => {
  return `Split Lease: Continue your session on mobile. Tap to login:\n\n${magicLink}\n\nThis link expires in 15 minutes.`;
};

/**
 * Send SMS via Twilio API (direct call, not through send-sms Edge Function)
 * This is an internal function that replicates send-sms behavior for atomicity
 */
async function sendSmsViaTwilio(
  toPhone: string,
  body: string
): Promise<{ message_sid: string; sent_at: string }> {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');

  if (!accountSid || !authToken) {
    throw new BubbleApiError('SMS service not configured (missing Twilio credentials)', 500);
  }

  console.log('[sendMagicLinkSms] Sending SMS via Twilio...');
  console.log('[sendMagicLinkSms] To:', toPhone);
  console.log('[sendMagicLinkSms] Body length:', body.length);

  const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const credentials = btoa(`${accountSid}:${authToken}`);

  const formData = new URLSearchParams();
  formData.append('To', toPhone);
  formData.append('From', TWILIO_FROM_NUMBER);
  formData.append('Body', body);

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
  });

  const result = await response.json();

  if (!response.ok) {
    console.error('[sendMagicLinkSms] Twilio error:', response.status, result);
    const errorMessage = result?.message || 'SMS delivery failed';
    throw new BubbleApiError(`SMS delivery failed: ${errorMessage}`, response.status);
  }

  console.log('[sendMagicLinkSms] SMS sent successfully, SID:', result.sid);

  return {
    message_sid: result.sid,
    sent_at: new Date().toISOString(),
  };
}

export async function handleSendMagicLinkSms(
  supabaseUrl: string,
  supabaseServiceKey: string,
  payload: SendMagicLinkSmsPayload
): Promise<SendMagicLinkSmsResult> {
  console.log('[sendMagicLinkSms] ========== SEND MAGIC LINK VIA SMS ==========');

  // Validate required fields
  validateRequiredFields(payload, ['email', 'phoneNumber']);
  const { email, phoneNumber, redirectTo } = payload;

  // Validate email format
  validateEmail(email);

  // Validate phone format
  validatePhoneNumber(phoneNumber);

  const emailLower = email.toLowerCase().trim();
  console.log(`[sendMagicLinkSms] Generating magic link for: ${emailLower}`);
  console.log(`[sendMagicLinkSms] SMS will be sent to: ${phoneNumber}`);

  // Initialize Supabase admin client
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    // Step 1: Generate magic link WITHOUT sending email
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: emailLower,
      options: {
        redirectTo: redirectTo || undefined
      }
    });

    if (linkError) {
      console.error('[sendMagicLinkSms] Error generating magic link:', linkError.message);
      throw new BubbleApiError(
        `Failed to generate magic link: ${linkError.message}`,
        linkError.status || 500
      );
    }

    if (!linkData?.properties?.action_link) {
      console.error('[sendMagicLinkSms] No action_link in response');
      throw new BubbleApiError('Magic link generation failed - no link returned', 500);
    }

    const magicLink = linkData.properties.action_link;
    console.log('[sendMagicLinkSms] Magic link generated successfully');

    // Step 2: Send SMS with the magic link
    const smsMessage = buildSmsMessage(magicLink);
    const smsResult = await sendSmsViaTwilio(phoneNumber, smsMessage);

    console.log('[sendMagicLinkSms] ========== SUCCESS ==========');

    return {
      success: true,
      message_sid: smsResult.message_sid,
      sent_at: smsResult.sent_at,
      redirect_to: redirectTo || '',
    };

  } catch (error: unknown) {
    if (error instanceof BubbleApiError) {
      throw error;
    }

    console.error('[sendMagicLinkSms] ========== ERROR ==========');
    console.error('[sendMagicLinkSms] Error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new BubbleApiError(
      `Failed to send magic link via SMS: ${errorMessage}`,
      500,
      error
    );
  }
}
