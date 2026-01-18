/**
 * Update Reminder Handler
 * Split Lease - Reminder House Manual Feature
 *
 * Updates an existing reminder
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { UpdateReminderPayload, UpdateReminderResult, Reminder } from "../lib/types.ts";

/**
 * Handle update reminder action
 */
export const handleUpdate = async (
  payload: UpdateReminderPayload,
  supabaseUrl: string,
  supabaseServiceKey: string
): Promise<UpdateReminderResult> => {
  console.log('[update] Updating reminder:', payload.reminderId);

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Build update object with only provided fields
  const updates: Record<string, unknown> = {
    'Modified Date': new Date().toISOString(),
  };

  if (payload.message !== undefined) {
    updates['message to send'] = payload.message;
  }

  if (payload.scheduledDateTime !== undefined) {
    updates['scheduled date and time'] = payload.scheduledDateTime;
  }

  if (payload.isEmailReminder !== undefined) {
    updates['is an email reminder?'] = payload.isEmailReminder;
  }

  if (payload.isSmsReminder !== undefined) {
    updates['is a phone reminder?'] = payload.isSmsReminder;
  }

  if (payload.fallbackPhone !== undefined) {
    updates['phone number (in case no guest attached)'] = payload.fallbackPhone;
  }

  if (payload.fallbackEmail !== undefined) {
    updates['fallback email'] = payload.fallbackEmail;
  }

  if (payload.reminderType !== undefined) {
    updates['type of reminders'] = payload.reminderType;
  }

  if (payload.status !== undefined) {
    updates['status'] = payload.status;
  }

  // Determine if rescheduled (scheduled time changed)
  const rescheduled = payload.scheduledDateTime !== undefined;

  console.log('[update] Applying updates:', Object.keys(updates));

  const { data, error } = await supabase
    .from('remindersfromhousemanual')
    .update(updates)
    .eq('_id', payload.reminderId)
    .select()
    .single();

  if (error) {
    console.error('[update] Update error:', error);
    throw new Error(`Failed to update reminder: ${error.message}`);
  }

  if (!data) {
    throw new Error(`Reminder not found: ${payload.reminderId}`);
  }

  console.log('[update] Reminder updated successfully');

  return {
    reminder: data as Reminder,
    rescheduled,
  };
};
