/**
 * Email & SMS Utilities for Signup Flow
 * Split Lease - Shared Utilities
 *
 * Provides functions to send welcome emails, internal notifications,
 * and welcome SMS messages during user signup.
 *
 * Matches Bubble's l2-signup-user-emails-sending workflow:
 * - Welcome email to user (with verification link)
 * - Internal notification to team (BCC to Slack channels)
 * - Welcome SMS to Guests with phone numbers
 *
 * FP PRINCIPLES:
 * - Pure functions with explicit dependencies
 * - No side effects except at boundaries (fetch calls)
 * - Immutable data structures
 */

// ─────────────────────────────────────────────────────────────
// Configuration (Immutable)
// ─────────────────────────────────────────────────────────────

/**
 * Template IDs from reference_table.zat_email_html_template_eg_sendbasicemailwf_
 * MAGIC_LOGIN_LINK: Public template (no auth required)
 * BASIC_EMAIL: Requires auth, used for welcome/notifications
 */
export const EMAIL_TEMPLATES = {
  MAGIC_LOGIN_LINK: '1757433099447x202755280527849400',
  BASIC_EMAIL: '1560447575939x331870423481483500',
} as const;

/**
 * BCC recipients for internal notifications
 * These Slack channel email addresses pipe directly into Slack
 * Matches Bubble's l2-signup-user-emails-sending BCC list
 */
export const INTERNAL_BCC_EMAILS: readonly string[] = [
  'activation-aaaacxk3rf2od4tbjuf2hpquii@splitlease.slack.com',
  'emails-for-review-aaaagbdra6rjlq6q3pqevmxgym@splitlease.slack.com',
  'noisybubble-aaaaffhc4jdfays3fjqjcdatmi@splitlease.slack.com',
  'splitleasesteam@gmail.com',
  'tech@leasesplit.com',
];

/**
 * SMS configuration
 * FROM_NUMBER: Split Lease's Twilio phone number
 */
export const SMS_CONFIG = {
  FROM_NUMBER: '+14155692985',
} as const;

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface SendEmailParams {
  readonly templateId: string;
  readonly toEmail: string;
  readonly toName?: string;
  readonly fromEmail?: string;
  readonly fromName?: string;
  readonly subject: string;
  readonly variables: Readonly<Record<string, string>>;
  readonly bccEmails?: readonly string[];
}

interface SendSmsParams {
  readonly to: string;
  readonly body: string;
}

interface EmailResult {
  readonly success: boolean;
  readonly error?: string;
}

// ─────────────────────────────────────────────────────────────
// Core Email Function
// ─────────────────────────────────────────────────────────────

/**
 * Send an email via the send-email Edge Function
 * This is the core function - all other email functions delegate to this
 */
export async function sendEmail(params: SendEmailParams): Promise<EmailResult> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[emailUtils] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    return { success: false, error: 'Missing environment configuration' };
  }

  const sendEmailUrl = `${supabaseUrl}/functions/v1/send-email`;

  try {
    console.log(`[emailUtils] Sending email to ${params.toEmail} with template ${params.templateId}`);

    const response = await fetch(sendEmailUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        action: 'send',
        payload: {
          template_id: params.templateId,
          to_email: params.toEmail,
          to_name: params.toName,
          from_email: params.fromEmail ?? 'no-reply@split.lease',
          from_name: params.fromName ?? 'Split Lease',
          subject: params.subject,
          variables: params.variables,
          bcc_emails: params.bccEmails ? [...params.bccEmails] : undefined,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[emailUtils] Email send failed: ${response.status} - ${errorText}`);
      return { success: false, error: errorText };
    }

    console.log(`[emailUtils] Email sent successfully to ${params.toEmail}`);
    return { success: true };
  } catch (error) {
    console.error('[emailUtils] Email send error:', error);
    return { success: false, error: (error as Error).message };
  }
}

// ─────────────────────────────────────────────────────────────
// Welcome Email Functions
// ─────────────────────────────────────────────────────────────

/**
 * Send welcome email to new user with verification link
 * Matches Bubble's l2-signup-user-emails-sending Step 5 (Guest) / Step 7 (Host)
 */
export async function sendWelcomeEmail(
  userType: 'Host' | 'Guest',
  email: string,
  firstName: string,
  verificationLink: string
): Promise<EmailResult> {
  const subject = userType === 'Guest'
    ? 'Welcome to Split Lease! Verify your email'
    : 'Welcome to Split Lease! Start hosting today';

  const bodyIntro = userType === 'Guest'
    ? 'Thanks for joining Split Lease! Click below to verify your email and start finding flexible rentals.'
    : 'Thanks for joining Split Lease as a host! Click below to verify your email and start listing your space.';

  return sendEmail({
    templateId: EMAIL_TEMPLATES.BASIC_EMAIL,
    toEmail: email,
    toName: firstName,
    subject,
    variables: {
      first_name: firstName || 'there',
      user_type: userType,
      verification_link: verificationLink,
      login_url: 'https://split.lease/login',
      body_intro: bodyIntro,
      button_text: 'Verify Email',
      button_url: verificationLink,
    },
  });
}

// ─────────────────────────────────────────────────────────────
// Internal Notification Function
// ─────────────────────────────────────────────────────────────

/**
 * Send internal notification when a new user signs up
 * Matches Bubble's l2-signup-user-emails-sending Step 1
 * BCCs all Slack channels + team emails for visibility
 */
export async function sendInternalSignupNotification(
  userId: string,
  email: string,
  firstName: string,
  lastName: string,
  userType: 'Host' | 'Guest'
): Promise<EmailResult> {
  const fullName = [firstName, lastName].filter(Boolean).join(' ') || 'Unknown';
  const timestamp = new Date().toISOString();

  return sendEmail({
    templateId: EMAIL_TEMPLATES.BASIC_EMAIL,
    toEmail: 'tech@leasesplit.com', // Primary recipient
    fromEmail: 'no-reply@split.lease',
    fromName: 'Split Lease System',
    subject: `New ${userType} Signup: ${fullName}`,
    variables: {
      first_name: 'Team',
      body_intro: `A new ${userType.toLowerCase()} has signed up for Split Lease.`,
      user_id: userId,
      user_email: email,
      user_name: fullName,
      user_type: userType,
      signup_timestamp: timestamp,
      button_text: 'View in Dashboard',
      button_url: 'https://split.lease/admin',
    },
    bccEmails: INTERNAL_BCC_EMAILS,
  });
}

// ─────────────────────────────────────────────────────────────
// Login Notification Function
// ─────────────────────────────────────────────────────────────

/**
 * Send login notification email to user
 * Uses Security 2 template (same as password reset) but without action button
 * Provides security awareness - user knows when their account is accessed
 */
export async function sendLoginNotificationEmail(
  email: string,
  firstName: string,
  loginTimestamp: string
): Promise<EmailResult> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[emailUtils] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    return { success: false, error: 'Missing environment configuration' };
  }

  const sendEmailUrl = `${supabaseUrl}/functions/v1/send-email`;

  // Format timestamp for display
  const loginDate = new Date(loginTimestamp);
  const formattedDate = loginDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const formattedTime = loginDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });

  // Security 2 template variables (informational, no button)
  const templateVariables: Record<string, string> = {
    toemail: email,
    fromemail: 'security@splitlease.com',
    fromname: 'Split Lease Security',
    subject: 'New Sign-In to Your Account',
    preheadertext: 'We noticed a new sign-in to your Split Lease account.',
    title: 'New Sign-In Detected',
    bodytext: firstName
      ? `Hi ${firstName}, we detected a new sign-in to your Split Lease account on ${formattedDate} at ${formattedTime}. If this was you, no action is needed.`
      : `We detected a new sign-in to your Split Lease account on ${formattedDate} at ${formattedTime}. If this was you, no action is needed.`,
    bannertext1: 'SIGN-IN DETAILS',
    bannertext2: `Date: ${formattedDate}`,
    bannertext3: `Time: ${formattedTime}`,
    // No button - informational only
    buttontext: '',
    buttonurl: '',
    footermessage: 'If you didn\'t sign in, please reset your password immediately at https://split.lease/login or contact support.',
  };

  try {
    console.log(`[emailUtils] Sending login notification to ${email}`);

    const response = await fetch(sendEmailUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        action: 'send',
        payload: {
          template_id: EMAIL_TEMPLATES.MAGIC_LOGIN_LINK, // Security 2 template
          to_email: email,
          variables: templateVariables,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[emailUtils] Login notification failed: ${response.status} - ${errorText}`);
      return { success: false, error: errorText };
    }

    console.log(`[emailUtils] Login notification sent successfully to ${email}`);
    return { success: true };
  } catch (error) {
    console.error('[emailUtils] Login notification error:', error);
    return { success: false, error: (error as Error).message };
  }
}

// ─────────────────────────────────────────────────────────────
// SMS Function
// ─────────────────────────────────────────────────────────────

/**
 * Send welcome SMS to new Guest users
 * Matches Bubble's l2-signup-user-emails-sending Step 6
 * Only sent to Guests who provide a phone number
 */
export async function sendWelcomeSms(
  phoneNumber: string,
  firstName: string
): Promise<EmailResult> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[emailUtils] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    return { success: false, error: 'Missing environment configuration' };
  }

  const sendSmsUrl = `${supabaseUrl}/functions/v1/send-sms`;

  // Format phone number to E.164 if not already
  const formattedPhone = formatPhoneToE164(phoneNumber);
  if (!formattedPhone) {
    console.error('[emailUtils] Invalid phone number format:', phoneNumber);
    return { success: false, error: 'Invalid phone number format' };
  }

  const smsBody = `Hi ${firstName || 'there'}! Welcome to Split Lease. Complete your profile to start finding flexible rentals: https://split.lease/account`;

  try {
    console.log(`[emailUtils] Sending welcome SMS to ${formattedPhone}`);

    const response = await fetch(sendSmsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        action: 'send',
        payload: {
          to: formattedPhone,
          from: SMS_CONFIG.FROM_NUMBER,
          body: smsBody,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[emailUtils] SMS send failed: ${response.status} - ${errorText}`);
      return { success: false, error: errorText };
    }

    console.log(`[emailUtils] SMS sent successfully to ${formattedPhone}`);
    return { success: true };
  } catch (error) {
    console.error('[emailUtils] SMS send error:', error);
    return { success: false, error: (error as Error).message };
  }
}

// ─────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────

/**
 * Format phone number to E.164 format (+15551234567)
 * Handles US numbers with or without country code
 */
function formatPhoneToE164(phone: string): string | null {
  if (!phone) return null;

  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');

  // Handle US numbers
  if (digits.length === 10) {
    return `+1${digits}`;
  }

  // Already has country code
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }

  // International format
  if (digits.length > 10) {
    return `+${digits}`;
  }

  // Invalid format
  return null;
}
