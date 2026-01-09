/**
 * Send Message Handler - NATIVE SUPABASE
 * Split Lease - Messages Edge Function
 *
 * Creates messages directly in Supabase (NO BUBBLE).
 * The database trigger handles:
 * - Broadcasting to Realtime channel
 * - Updating thread's last message
 *
 * Optional: When send_welcome_messages=true and a new thread is created,
 * sends SplitBot welcome messages to both guest and host.
 *
 * NO FALLBACK PRINCIPLE: Throws if message creation fails
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { User } from 'https://esm.sh/@supabase/supabase-js@2';
import { ValidationError } from '../../_shared/errors.ts';
import { validateRequiredFields } from '../../_shared/validation.ts';
import {
  getUserBubbleId,
  getUserProfile,
  getListingName,
  createMessage,
  createThread,
  createSplitBotMessage,
  findExistingThread,
  updateThreadLastMessage,
} from '../../_shared/messagingHelpers.ts';
import {
  getCTAByName,
  renderTemplate,
  getVisibilityForRole,
  buildTemplateContext,
} from '../../_shared/ctaHelpers.ts';

interface SendMessagePayload {
  thread_id?: string;          // Optional if creating new thread
  message_body: string;        // Required: Message content
  // For new thread creation:
  recipient_user_id?: string;  // Required if no thread_id
  listing_id?: string;         // Optional: Associated listing
  // Message options:
  splitbot?: boolean;          // Optional: Is Split Bot message
  call_to_action?: string;     // Optional: CTA type
  split_bot_warning?: string;  // Optional: Warning text
  send_welcome_messages?: boolean;  // Optional: Send SplitBot welcome when creating new thread
}

interface SendMessageResult {
  success: boolean;
  message_id: string;
  thread_id: string;
  is_new_thread: boolean;
  timestamp: string;
  welcome_messages_sent?: boolean;
}

/**
 * Handle send_message action - NATIVE SUPABASE
 * No longer calls Bubble workflows - all operations are Supabase-native
 */
export async function handleSendMessage(
  supabaseAdmin: SupabaseClient,
  payload: Record<string, unknown>,
  user: User
): Promise<SendMessageResult> {
  console.log('[sendMessage] ========== SEND MESSAGE (NATIVE) ==========');
  console.log('[sendMessage] User:', user.email);

  // Validate required fields
  const typedPayload = payload as unknown as SendMessagePayload;
  validateRequiredFields(typedPayload, ['message_body']);

  // Validate message body is not empty
  if (!typedPayload.message_body.trim()) {
    throw new ValidationError('Message body cannot be empty');
  }

  // Get sender's Bubble ID
  if (!user.email) {
    throw new ValidationError('Could not find user profile. Please try logging in again.');
  }

  const senderBubbleId = await getUserBubbleId(supabaseAdmin, user.email);
  if (!senderBubbleId) {
    throw new ValidationError('Could not find user profile. Please try logging in again.');
  }

  console.log('[sendMessage] Sender Bubble ID:', senderBubbleId);

  let threadId = typedPayload.thread_id;
  let isNewThread = false;

  // If no thread_id, we need to create or find a thread
  if (!threadId) {
    if (!typedPayload.recipient_user_id) {
      throw new ValidationError('Either thread_id or recipient_user_id is required');
    }

    const recipientId = typedPayload.recipient_user_id;
    console.log('[sendMessage] Looking for existing thread with recipient:', recipientId);

    // Check for existing thread (sender as guest, recipient as host)
    threadId = await findExistingThread(
      supabaseAdmin,
      recipientId,  // host
      senderBubbleId,  // guest
      typedPayload.listing_id
    );

    if (!threadId) {
      // Also check reverse (sender as host, recipient as guest)
      threadId = await findExistingThread(
        supabaseAdmin,
        senderBubbleId,  // host
        recipientId,  // guest
        typedPayload.listing_id
      );
    }

    if (!threadId) {
      // Create new thread (assume recipient is host, sender is guest)
      console.log('[sendMessage] Creating new thread...');
      threadId = await createThread(supabaseAdmin, {
        hostUserId: recipientId,
        guestUserId: senderBubbleId,
        listingId: typedPayload.listing_id,
        createdBy: senderBubbleId,
      });
      isNewThread = true;
      console.log('[sendMessage] Created new thread:', threadId);
    } else {
      console.log('[sendMessage] Found existing thread:', threadId);
    }
  }

  // Create the message (triggers broadcast automatically via database trigger)
  console.log('[sendMessage] Creating message in thread:', threadId);
  const messageId = await createMessage(supabaseAdmin, {
    threadId,
    messageBody: typedPayload.message_body.trim(),
    senderUserId: senderBubbleId,
    isSplitBot: typedPayload.splitbot || false,
    callToAction: typedPayload.call_to_action,
    splitBotWarning: typedPayload.split_bot_warning,
  });

  console.log('[sendMessage] Message created:', messageId);
  console.log('[sendMessage] ========== SEND COMPLETE (NATIVE) ==========');

  return {
    success: true,
    message_id: messageId,
    thread_id: threadId,
    is_new_thread: isNewThread,
    timestamp: new Date().toISOString(),
  };
}
