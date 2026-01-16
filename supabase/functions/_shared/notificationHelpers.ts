/**
 * Notification Helpers
 * Split Lease - Edge Functions
 *
 * Shared utilities for checking notification preferences and sending notifications.
 * Used by proposal and other workflow functions.
 *
 * DESIGN PRINCIPLES:
 * - Privacy-first: Default to NOT sending if preferences don't exist
 * - Fire-and-forget: Notification failures don't block main workflows
 * - Pure functions for preference checks
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

export interface NotificationPreferences {
  user_id: string;
  proposal_updates_sms: boolean;
  proposal_updates_email: boolean;
  message_forwarding_sms: boolean;
  message_forwarding_email: boolean;
  // ... other categories exist but proposal_updates is what we need
}

export type NotificationCategory =
  | 'proposal_updates'
  | 'message_forwarding'
  | 'payment_reminders'
  | 'reservation_updates'
  | 'lease_requests'
  | 'checkin_checkout'
  | 'reviews'
  | 'tips_insights'
  | 'account_assistance'
  | 'virtual_meetings';

export interface SendEmailParams {
  templateId: string;
  toEmail: string;
  toName?: string;
  variables: Record<string, string>;
}

export interface SendSmsParams {
  to: string;
  body: string;
}

// ─────────────────────────────────────────────────────────────
// NOTIFICATION PREFERENCES
// ─────────────────────────────────────────────────────────────

/**
 * Fetch notification preferences for a user
 * Returns null if no preferences exist (privacy-first default)
 */
export async function getNotificationPreferences(
  supabase: SupabaseClient,
  userId: string
): Promise<NotificationPreferences | null> {
  const { data, error } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    console.log(`[notificationHelpers] No preferences for user ${userId.slice(0, 8)}... (privacy-first default)`);
    return null;
  }

  return data as NotificationPreferences;
}

/**
 * Check if user should receive email for a category
 * Returns false if preferences don't exist (privacy-first)
 */
export function shouldSendEmail(
  prefs: NotificationPreferences | null,
  category: NotificationCategory
): boolean {
  if (!prefs) return false;
  const key = `${category}_email` as keyof NotificationPreferences;
  return prefs[key] === true;
}

/**
 * Check if user should receive SMS for a category
 * Returns false if preferences don't exist (privacy-first)
 */
export function shouldSendSms(
  prefs: NotificationPreferences | null,
  category: NotificationCategory
): boolean {
  if (!prefs) return false;
  const key = `${category}_sms` as keyof NotificationPreferences;
  return prefs[key] === true;
}

// ─────────────────────────────────────────────────────────────
// EMAIL SENDING (Internal Edge Function Call)
// ─────────────────────────────────────────────────────────────

/**
 * Send email via internal Edge Function call
 * Fire-and-forget - logs errors but doesn't throw
 */
export async function sendProposalEmail(
  params: SendEmailParams
): Promise<void> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');

  if (!supabaseUrl) {
    console.error('[notificationHelpers] SUPABASE_URL not configured');
    return;
  }

  const emailEndpoint = `${supabaseUrl}/functions/v1/send-email`;

  try {
    console.log(`[notificationHelpers] Sending email to ${params.toEmail} (template: ${params.templateId})`);

    // Fire-and-forget - we don't await the full response
    fetch(emailEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // No auth header needed for internal calls with service role
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      },
      body: JSON.stringify({
        action: 'send',
        payload: {
          template_id: params.templateId,
          to_email: params.toEmail,
          to_name: params.toName,
          variables: params.variables,
        },
      }),
    })
      .then((response) => {
        if (!response.ok) {
          console.error(`[notificationHelpers] Email send failed: ${response.status}`);
        } else {
          console.log(`[notificationHelpers] Email queued successfully`);
        }
      })
      .catch((e) => {
        console.error(`[notificationHelpers] Email send error:`, e.message);
      });
  } catch (error) {
    console.error('[notificationHelpers] Email send error:', (error as Error).message);
  }
}

// ─────────────────────────────────────────────────────────────
// SMS SENDING (Internal Edge Function Call)
// ─────────────────────────────────────────────────────────────

// Split Lease SMS number
const SPLIT_LEASE_SMS_NUMBER = '+14155692985';

/**
 * Send SMS via internal Edge Function call
 * Fire-and-forget - logs errors but doesn't throw
 */
export async function sendProposalSms(
  params: SendSmsParams
): Promise<void> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');

  if (!supabaseUrl) {
    console.error('[notificationHelpers] SUPABASE_URL not configured');
    return;
  }

  const smsEndpoint = `${supabaseUrl}/functions/v1/send-sms`;

  try {
    console.log(`[notificationHelpers] Sending SMS to ${params.to.slice(0, 6)}...`);

    // Fire-and-forget - we don't await the full response
    fetch(smsEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      },
      body: JSON.stringify({
        action: 'send',
        payload: {
          to: params.to,
          from: SPLIT_LEASE_SMS_NUMBER,
          body: params.body,
        },
      }),
    })
      .then((response) => {
        if (!response.ok) {
          console.error(`[notificationHelpers] SMS send failed: ${response.status}`);
        } else {
          console.log(`[notificationHelpers] SMS queued successfully`);
        }
      })
      .catch((e) => {
        console.error(`[notificationHelpers] SMS send error:`, e.message);
      });
  } catch (error) {
    console.error('[notificationHelpers] SMS send error:', (error as Error).message);
  }
}

// ─────────────────────────────────────────────────────────────
// EMAIL TEMPLATES
// ─────────────────────────────────────────────────────────────

/**
 * Email template IDs from reference_table.zat_email_html_template_eg_sendbasicemailwf_
 *
 * Note: These template IDs need to be verified against the actual database.
 * If templates don't exist, the email will fail gracefully (fire-and-forget).
 */
export const EMAIL_TEMPLATES = {
  // Guest proposal confirmation (celebratory)
  GUEST_PROPOSAL_SUBMITTED: '1757429600000x000000000000000001',

  // Host proposal notifications by rental type
  HOST_PROPOSAL_NIGHTLY: '1757429600000x000000000000000002',
  HOST_PROPOSAL_WEEKLY: '1757429600000x000000000000000003',
  HOST_PROPOSAL_MONTHLY: '1757429600000x000000000000000004',
} as const;

/**
 * Get host email template based on rental type
 */
export function getHostEmailTemplate(rentalType: string | null | undefined): string {
  const type = (rentalType || 'nightly').toLowerCase();

  switch (type) {
    case 'weekly':
      return EMAIL_TEMPLATES.HOST_PROPOSAL_WEEKLY;
    case 'monthly':
      return EMAIL_TEMPLATES.HOST_PROPOSAL_MONTHLY;
    default:
      return EMAIL_TEMPLATES.HOST_PROPOSAL_NIGHTLY;
  }
}
