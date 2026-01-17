/**
 * Create Reminder Handler
 * Split Lease - Reminder House Manual Feature
 *
 * Creates a new reminder in the database
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { CreateReminderPayload, CreateReminderResult, Reminder } from "../lib/types.ts";

/**
 * Generate a unique Bubble-compatible ID
 */
const generateReminderId = (): string => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 17; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Handle create reminder action
 */
export const handleCreate = async (
  payload: CreateReminderPayload,
  supabaseUrl: string,
  supabaseServiceKey: string
): Promise<CreateReminderResult> => {
  console.log('[create] Creating reminder for house manual:', payload.houseManualId);

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Generate unique ID
  const reminderId = generateReminderId();
  const now = new Date().toISOString();

  // Build the reminder record
  const reminderRecord = {
    _id: reminderId,
    'house manual': payload.houseManualId,
    'Created By': payload.creatorId,
    'message to send': payload.message,
    'scheduled date and time': payload.scheduledDateTime,
    'is an email reminder?': payload.isEmailReminder,
    'is a phone reminder?': payload.isSmsReminder,
    guest: payload.guestId || null,
    visit: payload.visitId || null,
    'phone number (in case no guest attached)': payload.fallbackPhone || null,
    'fallback email': payload.fallbackEmail || null,
    'type of reminders': payload.reminderType || 'custom',
    status: 'pending',
    delivery_status: 'pending',
    'Created Date': now,
    'Modified Date': now,
  };

  console.log('[create] Inserting reminder record');

  const { data, error } = await supabase
    .from('remindersfromhousemanual')
    .insert(reminderRecord)
    .select()
    .single();

  if (error) {
    console.error('[create] Insert error:', error);
    throw new Error(`Failed to create reminder: ${error.message}`);
  }

  console.log('[create] Reminder created successfully:', reminderId);

  return {
    reminder: data as Reminder,
    scheduled: true,
  };
};
