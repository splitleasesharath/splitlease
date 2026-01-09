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
  thread_id?: string;
  message_body: string;
  recipient_user_id?: string;
  listing_id?: string;
  splitbot?: boolean;
  call_to_action?: string;
  split_bot_warning?: string;
  send_welcome_messages?: boolean;
}

interface SendMessageResult {
  success: boolean;
  message_id: string;
  thread_id: string;
  is_new_thread: boolean;
  timestamp: string;
  welcome_messages_sent?: boolean;
}

async function sendInquiryWelcomeMessages(
  supabase: SupabaseClient,
  threadId: string,
  guestId: string,
  hostId: string,
  listingId?: string
): Promise<void> {
  console.log('[sendMessage] Sending welcome messages for new inquiry thread');

  const [guestProfile, hostProfile, listingName] = await Promise.all([
    getUserProfile(supabase, guestId),
    getUserProfile(supabase, hostId),
    listingId ? getListingName(supabase, listingId) : Promise.resolve(null),
  ]);

  const templateContext = buildTemplateContext(
    hostProfile?.firstName,
    guestProfile?.firstName,
    listingName || undefined
  );

  const [guestCTA, hostCTA] = await Promise.all([
    getCTAByName(supabase, 'new_inquiry_guest_view'),
    getCTAByName(supabase, 'new_inquiry_host_view'),
  ]);

  if (guestCTA?.message) {
    const guestVisibility = getVisibilityForRole('guest');
    const renderedMessage = renderTemplate(guestCTA.message, templateContext);
    await createSplitBotMessage(supabase, {
      threadId,
      messageBody: renderedMessage,
      callToAction: guestCTA.display,
      visibleToHost: guestVisibility.visibleToHost,
      visibleToGuest: guestVisibility.visibleToGuest,
      recipientUserId: guestId,
    });
    console.log('[sendMessage] Sent guest welcome message');
  }

  if (hostCTA?.message) {
    const hostVisibility = getVisibilityForRole('host');
    const renderedMessage = renderTemplate(hostCTA.message, templateContext);
    await createSplitBotMessage(supabase, {
      threadId,
      messageBody: renderedMessage,
      callToAction: hostCTA.display,
      visibleToHost: hostVisibility.visibleToHost,
      visibleToGuest: hostVisibility.visibleToGuest,
      recipientUserId: hostId,
    });
    console.log('[sendMessage] Sent host welcome message');
  }

  const lastMessagePreview = guestCTA?.message
    ? renderTemplate(guestCTA.message, templateContext)
    : 'New conversation started';
  await updateThreadLastMessage(supabase, threadId, lastMessagePreview);
}

export async function handleSendMessage(
  supabaseAdmin: SupabaseClient,
  payload: Record<string, unknown>,
  user: User
): Promise<SendMessageResult> {
  console.log('[sendMessage] ========== SEND MESSAGE (NATIVE) ===========');
  console.log('[sendMessage] User:', user.email);

  const typedPayload = payload as unknown as SendMessagePayload;
  validateRequiredFields(typedPayload, ['message_body']);

  if (!typedPayload.message_body.trim()) {
    throw new ValidationError('Message body cannot be empty');
  }

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
  let recipientId: string | undefined;

  if (!threadId) {
    if (!typedPayload.recipient_user_id) {
      throw new ValidationError('Either thread_id or recipient_user_id is required');
    }

    recipientId = typedPayload.recipient_user_id;
    console.log('[sendMessage] Looking for existing thread with recipient:', recipientId);

    threadId = await findExistingThread(
      supabaseAdmin,
      recipientId,
      senderBubbleId,
      typedPayload.listing_id
    );

    if (!threadId) {
      threadId = await findExistingThread(
        supabaseAdmin,
        senderBubbleId,
        recipientId,
        typedPayload.listing_id
      );
    }

    if (!threadId) {
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

  let welcomeMessagesSent = false;
  if (isNewThread && typedPayload.send_welcome_messages && recipientId) {
    try {
      await sendInquiryWelcomeMessages(
        supabaseAdmin,
        threadId,
        senderBubbleId,
        recipientId,
        typedPayload.listing_id
      );
      welcomeMessagesSent = true;
    } catch (welcomeError) {
      console.warn('[sendMessage] Welcome messages failed (non-blocking):', welcomeError);
    }
  }

  console.log('[sendMessage] ========== SEND COMPLETE (NATIVE) ===========');

  return {
    success: true,
    message_id: messageId,
    thread_id: threadId,
    is_new_thread: isNewThread,
    timestamp: new Date().toISOString(),
    welcome_messages_sent: welcomeMessagesSent,
  };
}
