/**
 * Magic Links Handler for Lease Edge Function
 * Split Lease - Supabase Edge Functions
 *
 * Generates magic login links for host and guest.
 * These links allow users to access their lease details directly.
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { MagicLinksResult } from '../lib/types.ts';

/**
 * Generate magic login links for host and guest
 *
 * Uses the auth-user Edge Function to generate Supabase Auth magic links.
 * Links are audited in the magic_link_audit table for tracking.
 *
 * @param supabase - Supabase client
 * @param guestId - ID of the guest
 * @param hostId - ID of the host
 * @param leaseId - ID of the lease
 * @returns Object with host and guest magic links
 */
export async function generateMagicLinks(
  supabase: SupabaseClient,
  guestId: string,
  hostId: string,
  leaseId: string
): Promise<MagicLinksResult> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    console.warn('[lease:magicLinks] Missing environment variables');
    return { host: '', guest: '' };
  }

  // Fetch user emails
  const { data: users, error: usersError } = await supabase
    .from('user')
    .select('_id, email')
    .in('_id', [guestId, hostId]);

  if (usersError || !users) {
    console.warn('[lease:magicLinks] Could not fetch users:', usersError?.message);
    return { host: '', guest: '' };
  }

  const guest = users.find((u) => u._id === guestId);
  const host = users.find((u) => u._id === hostId);

  let guestLink = '';
  let hostLink = '';

  // Generate guest magic link
  if (guest?.email) {
    guestLink = await generateSingleMagicLink(
      supabaseUrl,
      serviceRoleKey,
      supabase,
      guest.email,
      guestId,
      `/guest-proposals/${guestId}?lease=${leaseId}`,
      'guest-proposals',
      { leaseId }
    );
  }

  // Generate host magic link
  if (host?.email) {
    hostLink = await generateSingleMagicLink(
      supabaseUrl,
      serviceRoleKey,
      supabase,
      host.email,
      hostId,
      `/host-proposals/${hostId}?lease=${leaseId}`,
      'host-proposals',
      { leaseId }
    );
  }

  return {
    host: hostLink,
    guest: guestLink,
  };
}

/**
 * Generate a single magic link and audit it
 *
 * @param supabaseUrl - Supabase URL
 * @param serviceRoleKey - Service role key
 * @param supabase - Supabase client
 * @param email - User email
 * @param userId - User ID
 * @param redirectTo - Redirect URL after login
 * @param destinationPage - Page name for audit
 * @param attachedData - Additional data for audit
 * @returns Magic link URL or empty string on failure
 */
async function generateSingleMagicLink(
  supabaseUrl: string,
  serviceRoleKey: string,
  supabase: SupabaseClient,
  email: string,
  userId: string,
  redirectTo: string,
  destinationPage: string,
  attachedData: Record<string, unknown>
): Promise<string> {
  try {
    console.log('[lease:magicLinks] Generating link for:', email);

    const response = await fetch(`${supabaseUrl}/functions/v1/auth-user`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'generate_magic_link',
        payload: {
          email,
          redirectTo,
        },
      }),
    });

    const result = await response.json();

    if (result.success && result.data?.action_link) {
      const link = result.data.action_link;

      // Audit the magic link
      await auditMagicLink(supabase, userId, destinationPage, attachedData);

      console.log('[lease:magicLinks] Link generated successfully for:', email);
      return link;
    }

    console.warn(
      '[lease:magicLinks] Link generation failed for:',
      email,
      result.error
    );
    return '';
  } catch (error) {
    console.warn(
      '[lease:magicLinks] Exception generating link for:',
      email,
      (error as Error).message
    );
    return '';
  }
}

/**
 * Audit a magic link creation
 *
 * Records the magic link generation in the audit table for tracking
 * and security purposes.
 *
 * @param supabase - Supabase client
 * @param userId - User ID
 * @param destinationPage - Destination page name
 * @param attachedData - Additional context data
 */
async function auditMagicLink(
  supabase: SupabaseClient,
  userId: string,
  destinationPage: string,
  attachedData: Record<string, unknown>
): Promise<void> {
  try {
    const { error } = await supabase.from('magic_link_audit').insert({
      user_id: userId,
      destination_page: destinationPage,
      attached_data: attachedData,
      link_generated_at: new Date().toISOString(),
      created_by: 'lease-edge-function',
      sent_via: 'email',
    });

    if (error) {
      console.warn('[lease:magicLinks] Audit insert failed:', error.message);
    }
  } catch (error) {
    console.warn(
      '[lease:magicLinks] Audit exception:',
      (error as Error).message
    );
  }
}
