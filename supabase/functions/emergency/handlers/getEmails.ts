/**
 * Get Emails Handler
 * Split Lease - Emergency Edge Function
 *
 * Fetches email history for an emergency
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

interface GetEmailsPayload {
  emergencyId: string;
  limit?: number;
  offset?: number;
}

export async function handleGetEmails(
  payload: GetEmailsPayload,
  supabase: SupabaseClient
): Promise<unknown[]> {
  console.log('[emergency:getEmails] Fetching emails for emergency:', payload.emergencyId);

  const { emergencyId, limit = 50, offset = 0 } = payload;

  if (!emergencyId) {
    throw new Error('Emergency ID is required');
  }

  const { data, error } = await supabase
    .from('emergency_email_log')
    .select('*')
    .eq('emergency_report_id', emergencyId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('[emergency:getEmails] Query error:', error);
    throw new Error(`Failed to fetch emails: ${error.message}`);
  }

  console.log('[emergency:getEmails] Found', data?.length || 0, 'emails');

  return data || [];
}
