/**
 * Send Magic Link Handler - Generate and send magic login link to user
 * Split Lease - magic-login-links
 *
 * Flow:
 * 1. Look up user by ID to get email
 * 2. Build redirect URL with attached data as query params
 * 3. Generate magic link (reuses handleGenerateMagicLink from auth-user)
 * 4. Send via SMS if phone provided (reuses handleSendMagicLinkSms from auth-user)
 * 5. Log audit record in magic_link_audit table
 *
 * @param supabaseUrl - Supabase project URL
 * @param supabaseServiceKey - Supabase service role key for admin operations
 * @param payload - Request payload {userId, destinationPage, phoneOverride?, attachedData?, adminUserId}
 * @returns {success, link, sentViaSms}
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { BubbleApiError } from '../../_shared/errors.ts';
import { validateRequiredFields } from '../../_shared/validation.ts';

// Import existing handlers from auth-user
import { handleGenerateMagicLink } from '../../auth-user/handlers/generateMagicLink.ts';
import { handleSendMagicLinkSms } from '../../auth-user/handlers/sendMagicLinkSms.ts';

interface SendMagicLinkPayload {
  userId: string;
  destinationPage: string;
  phoneOverride?: string;
  attachedData?: Record<string, string>;
  adminUserId: string;
}

interface SendMagicLinkResponse {
  success: boolean;
  link: string;
  sentViaSms: boolean;
  sentViaEmail: boolean;
}

/**
 * Build redirect URL with attached data as query parameters
 */
function buildRedirectUrl(destinationPage: string, attachedData?: Record<string, string>): string {
  const baseUrl = `https://splitlease.com${destinationPage}`;

  if (!attachedData || Object.keys(attachedData).length === 0) {
    return baseUrl;
  }

  const params = new URLSearchParams(attachedData);
  return `${baseUrl}?${params.toString()}`;
}

/**
 * Log magic link generation to audit table
 */
async function logAudit(
  supabaseAdmin: any,
  userId: string,
  destinationPage: string,
  attachedData: Record<string, string> | undefined,
  phoneOverride: string | undefined,
  sentVia: string,
  adminUserId: string,
  link: string
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('magic_link_audit')
    .insert({
      user_id: userId,
      destination_page: destinationPage,
      attached_data: attachedData || null,
      phone_override: phoneOverride || null,
      sent_via: sentVia,
      created_by: adminUserId,
    });

  if (error) {
    console.error('[send-magic-link] Audit log error:', error.message);
    // Don't throw - audit logging failure shouldn't block the main operation
  } else {
    console.log('[send-magic-link] Audit record created');
  }
}

export async function handleSendMagicLink(
  supabaseUrl: string,
  supabaseServiceKey: string,
  payload: SendMagicLinkPayload
): Promise<SendMagicLinkResponse> {
  console.log('[send-magic-link] ========== SEND MAGIC LINK ==========');

  // Validate required fields
  validateRequiredFields(payload, ['userId', 'destinationPage', 'adminUserId']);
  const { userId, destinationPage, phoneOverride, attachedData, adminUserId } = payload;

  console.log(`[send-magic-link] User ID: ${userId}`);
  console.log(`[send-magic-link] Destination: ${destinationPage}`);
  console.log(`[send-magic-link] Phone override: ${phoneOverride || '(none)'}`);
  console.log(`[send-magic-link] Attached data: ${JSON.stringify(attachedData || {})}`);

  // Initialize Supabase admin client
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    // Step 1: Look up user to get email and phone
    const { data: userData, error: userError } = await supabaseAdmin
      .from('user')
      .select('_id, "email as text", "Phone Number (as text)"')
      .eq('_id', userId)
      .single();

    if (userError || !userData) {
      throw new BubbleApiError(`User not found: ${userId}`, 404);
    }

    const userEmail = userData['email as text'];
    const userPhone = userData['Phone Number (as text)'];

    if (!userEmail) {
      throw new BubbleApiError(`User ${userId} has no email address`, 400);
    }

    console.log(`[send-magic-link] User email: ${userEmail}`);

    // Step 2: Build redirect URL with attached data
    const redirectUrl = buildRedirectUrl(destinationPage, attachedData);
    console.log(`[send-magic-link] Redirect URL: ${redirectUrl}`);

    // Step 3: Generate magic link (reuse existing handler)
    const magicLinkResult = await handleGenerateMagicLink(
      supabaseUrl,
      supabaseServiceKey,
      {
        email: userEmail,
        redirectTo: redirectUrl
      }
    );

    const magicLink = magicLinkResult.action_link;
    console.log(`[send-magic-link] Magic link generated successfully`);

    // Step 4: Send via SMS if phone provided
    let sentViaSms = false;
    const targetPhone = phoneOverride || userPhone;

    if (targetPhone) {
      try {
        await handleSendMagicLinkSms(
          supabaseUrl,
          supabaseServiceKey,
          {
            email: userEmail,
            phoneNumber: targetPhone,
            redirectTo: redirectUrl
          }
        );
        sentViaSms = true;
        console.log(`[send-magic-link] SMS sent to: ${targetPhone}`);
      } catch (smsError: any) {
        console.error('[send-magic-link] SMS delivery failed:', smsError.message);
        // Don't throw - continue with link generation even if SMS fails
      }
    }

    // Step 5: Log audit record
    const sentVia = sentViaSms ? 'sms' : 'display_only';
    await logAudit(
      supabaseAdmin,
      userId,
      destinationPage,
      attachedData,
      phoneOverride,
      sentVia,
      adminUserId,
      magicLink
    );

    console.log('[send-magic-link] ========== SUCCESS ==========');

    return {
      success: true,
      link: magicLink,
      sentViaSms,
      sentViaEmail: false, // We're not sending email in this flow
    };

  } catch (error: any) {
    if (error instanceof BubbleApiError) {
      throw error;
    }

    console.error('[send-magic-link] ========== ERROR ==========');
    console.error('[send-magic-link] Error:', error);

    throw new BubbleApiError(
      `Failed to send magic link: ${error.message}`,
      500,
      error
    );
  }
}
