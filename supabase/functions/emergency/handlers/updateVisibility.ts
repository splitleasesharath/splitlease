/**
 * Update Visibility Handler
 * Split Lease - Emergency Edge Function
 *
 * Hides or shows an emergency report
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

interface UpdateVisibilityPayload {
  emergencyId: string;
  isHidden: boolean;
}

interface AdminUser {
  id: string;
  email: string;
  userId: string;
}

export async function handleUpdateVisibility(
  payload: UpdateVisibilityPayload,
  _user: AdminUser,
  supabase: SupabaseClient
): Promise<unknown> {
  console.log('[emergency:updateVisibility] Updating visibility:', payload.emergencyId, '->', payload.isHidden);

  const { emergencyId, isHidden } = payload;

  if (!emergencyId) {
    throw new Error('Emergency ID is required');
  }

  if (typeof isHidden !== 'boolean') {
    throw new Error('isHidden must be a boolean');
  }

  // Update emergency
  const { data, error } = await supabase
    .from('emergency_report')
    .update({ is_hidden: isHidden })
    .eq('id', emergencyId)
    .select()
    .single();

  if (error) {
    console.error('[emergency:updateVisibility] Update error:', error);
    throw new Error(`Failed to update visibility: ${error.message}`);
  }

  console.log('[emergency:updateVisibility] Visibility updated successfully');

  return data;
}
