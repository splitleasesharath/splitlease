/**
 * Get Preset Emails Handler
 * Split Lease - Emergency Edge Function
 *
 * Fetches preset email templates
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

interface GetPresetEmailsPayload {
  category?: string;
  activeOnly?: boolean;
}

export async function handleGetPresetEmails(
  payload: GetPresetEmailsPayload,
  supabase: SupabaseClient
): Promise<unknown[]> {
  console.log('[emergency:getPresetEmails] Fetching preset emails');

  const { category, activeOnly = true } = payload;

  let query = supabase
    .from('emergency_preset_email')
    .select('*')
    .order('category', { ascending: true })
    .order('label', { ascending: true });

  if (category) {
    query = query.eq('category', category);
  }

  if (activeOnly) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[emergency:getPresetEmails] Query error:', error);
    throw new Error(`Failed to fetch preset emails: ${error.message}`);
  }

  console.log('[emergency:getPresetEmails] Found', data?.length || 0, 'preset emails');

  return data || [];
}
