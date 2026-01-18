/**
 * Process Pending Reminders Handler
 * Split Lease - Reminder House Manual Feature
 *
 * Called by cron job to process reminders that are due
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { ProcessPendingResult, ProcessedReminder } from "../lib/types.ts";
import {
  queryPendingReminders,
  processReminder,
  updateReminderStatus,
  fetchGuestContactInfo,
  determineDeliveryStatus,
} from "../lib/scheduler.ts";

/**
 * Handle process-pending action (cron job)
 */
export const handleProcessPending = async (
  batchSize: number,
  supabaseUrl: string,
  supabaseServiceKey: string
): Promise<ProcessPendingResult> => {
  console.log('[process-pending] Starting batch processing, size:', batchSize);

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Query pending reminders that are due
  const pendingReminders = await queryPendingReminders(supabase, batchSize);

  if (pendingReminders.length === 0) {
    console.log('[process-pending] No pending reminders to process');
    return {
      processed: 0,
      failed: 0,
      results: [],
    };
  }

  console.log('[process-pending] Processing', pendingReminders.length, 'reminders');

  const results: ProcessedReminder[] = [];
  let processed = 0;
  let failed = 0;

  // Process each reminder
  for (const reminder of pendingReminders) {
    try {
      // Fetch guest contact info if guest is attached
      let guestEmail: string | undefined;
      let guestPhone: string | undefined;
      let guestName: string | undefined;

      if (reminder.guest) {
        const guestInfo = await fetchGuestContactInfo(supabase, reminder.guest);
        guestEmail = guestInfo.email;
        guestPhone = guestInfo.phone;
        guestName = guestInfo.name;
      }

      // Process the reminder (send notifications)
      const result = await processReminder(
        supabase,
        reminder,
        guestEmail,
        guestPhone,
        guestName
      );

      // Determine delivery status
      const deliveryStatus = determineDeliveryStatus(
        result.emailSent,
        result.smsSent,
        reminder['is an email reminder?'],
        reminder['is a phone reminder?']
      );

      // Update reminder status
      await updateReminderStatus(supabase, reminder._id, {
        status: deliveryStatus === 'failed' ? 'pending' : 'sent',
        delivery_status: deliveryStatus,
        sendgrid_message_id: result.sendgridMessageId,
        twilio_message_sid: result.twilioMessageSid,
      });

      if (deliveryStatus === 'failed') {
        failed++;
      } else {
        processed++;
      }

      results.push({
        reminderId: reminder._id,
        emailSent: result.emailSent,
        smsSent: result.smsSent,
        error: result.error,
      });

    } catch (err) {
      console.error('[process-pending] Error processing reminder:', reminder._id, err);
      failed++;

      results.push({
        reminderId: reminder._id,
        emailSent: false,
        smsSent: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  console.log('[process-pending] Completed - processed:', processed, 'failed:', failed);

  return {
    processed,
    failed,
    results,
  };
};
