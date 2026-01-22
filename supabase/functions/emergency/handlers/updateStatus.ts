/**
 * Update Status Handler
 * Split Lease - Emergency Edge Function
 *
 * Updates emergency status with appropriate timestamps
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

interface UpdateStatusPayload {
  emergencyId: string;
  status: string;
}

interface AdminUser {
  id: string;
  email: string;
  userId: string;
}

const VALID_STATUSES = ['REPORTED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

export async function handleUpdateStatus(
  payload: UpdateStatusPayload,
  _user: AdminUser,
  supabase: SupabaseClient
): Promise<unknown> {
  console.log('[emergency:updateStatus] Updating status:', payload.emergencyId, '->', payload.status);

  const { emergencyId, status } = payload;

  if (!emergencyId) {
    throw new Error('Emergency ID is required');
  }

  if (!status) {
    throw new Error('Status is required');
  }

  if (!VALID_STATUSES.includes(status)) {
    throw new Error(`Invalid status: ${status}. Valid statuses: ${VALID_STATUSES.join(', ')}`);
  }

  // Build update data
  const updateData: Record<string, unknown> = {
    status,
  };

  // Set resolved_at if status is RESOLVED or CLOSED
  if (status === 'RESOLVED' || status === 'CLOSED') {
    updateData.resolved_at = new Date().toISOString();
  }

  // Update emergency
  const { data, error } = await supabase
    .from('emergency_report')
    .update(updateData)
    .eq('id', emergencyId)
    .select()
    .single();

  if (error) {
    console.error('[emergency:updateStatus] Update error:', error);
    throw new Error(`Failed to update status: ${error.message}`);
  }

  console.log('[emergency:updateStatus] Status updated successfully');

  return data;
}
