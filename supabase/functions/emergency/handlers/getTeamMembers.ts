/**
 * Get Team Members Handler
 * Split Lease - Emergency Edge Function
 *
 * Fetches staff users (admin = true) for assignment dropdown
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

interface GetTeamMembersPayload {
  activeOnly?: boolean;
}

export async function handleGetTeamMembers(
  payload: GetTeamMembersPayload,
  supabase: SupabaseClient
): Promise<unknown[]> {
  console.log('[emergency:getTeamMembers] Fetching team members');

  const { activeOnly = true } = payload;

  // Query users with admin = true
  let query = supabase
    .from('user')
    .select('_id, email, "First name", "Last name", "Phone number", admin')
    .eq('admin', true)
    .order('"First name"', { ascending: true });

  // If activeOnly, we could filter by some active status field if it exists
  // For now, we just return all admins
  void activeOnly; // Suppress unused warning

  const { data, error } = await query;

  if (error) {
    console.error('[emergency:getTeamMembers] Query error:', error);
    throw new Error(`Failed to fetch team members: ${error.message}`);
  }

  console.log('[emergency:getTeamMembers] Found', data?.length || 0, 'team members');

  // Transform to cleaner format
  return (data || []).map(user => ({
    _id: user._id,
    email: user.email,
    firstName: user['First name'],
    lastName: user['Last name'],
    phone: user['Phone number'],
    fullName: `${user['First name'] || ''} ${user['Last name'] || ''}`.trim() || user.email,
  }));
}
