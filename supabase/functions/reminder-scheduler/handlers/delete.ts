/**
 * Delete Reminder Handler
 * Split Lease - Reminder House Manual Feature
 *
 * Deletes (cancels) a reminder
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { DeleteReminderPayload, DeleteReminderResult } from "../lib/types.ts";

/**
 * Handle delete reminder action
 * Instead of hard delete, we mark as cancelled to maintain audit trail
 */
export const handleDelete = async (
  payload: DeleteReminderPayload,
  supabaseUrl: string,
  supabaseServiceKey: string
): Promise<DeleteReminderResult> => {
  console.log('[delete] Cancelling reminder:', payload.reminderId);

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Soft delete - mark as cancelled
  const { data, error } = await supabase
    .from('remindersfromhousemanual')
    .update({
      status: 'cancelled',
      'Modified Date': new Date().toISOString(),
    })
    .eq('_id', payload.reminderId)
    .select('_id')
    .single();

  if (error) {
    console.error('[delete] Update error:', error);
    throw new Error(`Failed to cancel reminder: ${error.message}`);
  }

  if (!data) {
    throw new Error(`Reminder not found: ${payload.reminderId}`);
  }

  console.log('[delete] Reminder cancelled successfully');

  return {
    deleted: true,
    reminderId: payload.reminderId,
  };
};
