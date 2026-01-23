/**
 * Get Preset Messages Handler
 * Split Lease - Emergency Edge Function
 *
 * Fetches preset SMS message templates
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

interface GetPresetMessagesPayload {
  category?: string;
  activeOnly?: boolean;
}

export async function handleGetPresetMessages(
  payload: GetPresetMessagesPayload,
  supabase: SupabaseClient
): Promise<unknown[]> {
  console.log('[emergency:getPresetMessages] Fetching preset messages');

  const { category, activeOnly = true } = payload;

  let query = supabase
    .from('emergency_preset_message')
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
    console.error('[emergency:getPresetMessages] Query error:', error);
    throw new Error(`Failed to fetch preset messages: ${error.message}`);
  }

  console.log('[emergency:getPresetMessages] Found', data?.length || 0, 'preset messages');

  return data || [];
}
