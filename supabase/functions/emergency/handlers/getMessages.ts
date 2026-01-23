/**
 * Get Messages Handler
 * Split Lease - Emergency Edge Function
 *
 * Fetches SMS message history for an emergency
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

interface GetMessagesPayload {
  emergencyId: string;
  limit?: number;
  offset?: number;
}

export async function handleGetMessages(
  payload: GetMessagesPayload,
  supabase: SupabaseClient
): Promise<unknown[]> {
  console.log('[emergency:getMessages] Fetching messages for emergency:', payload.emergencyId);

  const { emergencyId, limit = 50, offset = 0 } = payload;

  if (!emergencyId) {
    throw new Error('Emergency ID is required');
  }

  const { data, error } = await supabase
    .from('emergency_message')
    .select('*')
    .eq('emergency_report_id', emergencyId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('[emergency:getMessages] Query error:', error);
    throw new Error(`Failed to fetch messages: ${error.message}`);
  }

  console.log('[emergency:getMessages] Found', data?.length || 0, 'messages');

  return data || [];
}
