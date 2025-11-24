/**
 * Contact Host Messaging Handler
 * Priority: HIGH
 *
 * Handles sending messages from guests to hosts
 * NO SYNC REQUIRED: This workflow only sends notifications/emails
 */

import { BubbleSyncService } from '../../_shared/bubbleSync.ts';
import { validateRequiredFields, validateEmail } from '../../_shared/validation.ts';
import { User } from '../../_shared/types.ts';

/**
 * Handle sending message to host
 * NO SYNC: This workflow doesn't create persistent data
 */
export async function handleSendMessage(
  syncService: BubbleSyncService,
  payload: Record<string, any>,
  user: User
): Promise<any> {
  console.log('[Messaging Handler] ========== SEND MESSAGE ==========');
  console.log('[Messaging Handler] User:', user.email);
  console.log('[Messaging Handler] Payload:', JSON.stringify(payload, null, 2));

  // Validate required fields
  validateRequiredFields(payload, [
    'listing_unique_id',
    'sender_name',
    'sender_email',
    'message_body',
  ]);

  const { listing_unique_id, sender_name, sender_email, message_body } = payload;

  // Validate email format
  validateEmail(sender_email);

  // Validate message is not empty
  if (!message_body.trim()) {
    throw new Error('Message body cannot be empty');
  }

  console.log('[Messaging Handler] Listing ID:', listing_unique_id);
  console.log('[Messaging Handler] Sender:', sender_name, `<${sender_email}>`);
  console.log('[Messaging Handler] Message length:', message_body.length);

  try {
    // Trigger workflow without sync (notification/email only)
    const result = await syncService.triggerWorkflowOnly(
      'core-contact-host-send-message',
      {
        listing_unique_id,
        sender_name,
        sender_email,
        message_body,
      }
    );

    console.log('[Messaging Handler] ✅ Message sent successfully');
    console.log('[Messaging Handler] ========== SUCCESS ==========');

    return {
      success: true,
      message: 'Message sent to host',
      listing_unique_id,
    };
  } catch (error) {
    console.error('[Messaging Handler] ========== ERROR ==========');
    console.error('[Messaging Handler] Failed to send message:', error);
    throw error;
  }
}
