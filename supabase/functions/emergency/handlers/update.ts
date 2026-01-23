/**
 * Update Emergency Handler
 * Split Lease - Emergency Edge Function
 *
 * Updates emergency fields (admin only)
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

interface UpdatePayload {
  id: string;
  emergency_type?: string;
  description?: string;
  photo1_url?: string;
  photo2_url?: string;
  guidance_instructions?: string;
}

interface AdminUser {
  id: string;
  email: string;
  userId: string;
}

export async function handleUpdate(
  payload: UpdatePayload,
  _user: AdminUser,
  supabase: SupabaseClient
): Promise<unknown> {
  console.log('[emergency:update] Updating emergency:', payload.id);

  const { id, ...updateFields } = payload;

  if (!id) {
    throw new Error('Emergency ID is required');
  }

  // Filter out undefined fields
  const fieldsToUpdate: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(updateFields)) {
    if (value !== undefined) {
      fieldsToUpdate[key] = value;
    }
  }

  if (Object.keys(fieldsToUpdate).length === 0) {
    throw new Error('No fields to update');
  }

  // Update emergency
  const { data, error } = await supabase
    .from('emergency_report')
    .update(fieldsToUpdate)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[emergency:update] Update error:', error);
    throw new Error(`Failed to update emergency: ${error.message}`);
  }

  console.log('[emergency:update] Emergency updated successfully');

  return data;
}
