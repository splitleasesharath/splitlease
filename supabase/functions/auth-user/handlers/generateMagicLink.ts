/**
 * Generate Magic Link Handler - Generate magic link without sending email
 * Split Lease - auth-user
 *
 * Flow:
 * 1. Validate email in payload
 * 2. Call Supabase Auth admin.generateLink() with type 'magiclink'
 * 3. Return action_link and token data (NO email sent)
 *
 * Use Case: Custom email delivery - caller handles sending the link
 *
 * @param supabaseUrl - Supabase project URL
 * @param supabaseServiceKey - Supabase service role key for admin operations
 * @param payload - Request payload {email, redirectTo?}
 * @returns {action_link, hashed_token, redirect_to, verification_type, user_id?}
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { BubbleApiError } from '../../_shared/errors.ts';
import { validateRequiredFields, validateEmail } from '../../_shared/validation.ts';

export async function handleGenerateMagicLink(
  supabaseUrl: string,
  supabaseServiceKey: string,
  payload: any
): Promise<any> {
  console.log('[generate-magic-link] ========== GENERATE MAGIC LINK ==========');

  // Validate required fields
  validateRequiredFields(payload, ['email']);
  const { email, redirectTo } = payload;

  // Validate email format
  validateEmail(email);

  const emailLower = email.toLowerCase().trim();
  console.log(`[generate-magic-link] Generating magic link for: ${emailLower}`);

  // Initialize Supabase admin client
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    // Generate magic link WITHOUT sending email
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: emailLower,
      options: {
        redirectTo: redirectTo || undefined
      }
    });

    if (error) {
      console.error('[generate-magic-link] Error generating link:', error.message);
      throw new BubbleApiError(
        `Failed to generate magic link: ${error.message}`,
        error.status || 500
      );
    }

    if (!data?.properties?.action_link) {
      console.error('[generate-magic-link] No action_link in response');
      throw new BubbleApiError('Magic link generation failed - no link returned', 500);
    }

    console.log('[generate-magic-link] Magic link generated successfully');
    console.log('[generate-magic-link] User ID:', data.user?.id);

    // Return the link and token data
    return {
      action_link: data.properties.action_link,
      hashed_token: data.properties.hashed_token,
      redirect_to: data.properties.redirect_to,
      verification_type: data.properties.verification_type,
      user_id: data.user?.id,
      email: emailLower
    };

  } catch (error: any) {
    if (error instanceof BubbleApiError) {
      throw error;
    }

    console.error('[generate-magic-link] ========== ERROR ==========');
    console.error('[generate-magic-link] Error:', error);

    throw new BubbleApiError(
      `Failed to generate magic link: ${error.message}`,
      500,
      error
    );
  }
}
