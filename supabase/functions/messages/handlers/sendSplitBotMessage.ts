/**
 * Send SplitBot Message Handler
 * Split Lease - Messages Edge Function
 *
 * Sends an automated SplitBot message with a CTA to an existing thread.
 * This is the reusable unit for sending automated messages in various contexts.
 *
 * Mirrors Bubble workflow: CORE-send-new-message (in app only) - SplitBot path
 *
 * Use cases:
 * - Status change notifications
 * - Reminder messages
 * - System notifications
 * - CTA-driven user guidance
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { ValidationError } from '../../_shared/errors.ts';
import {
  createSplitBotMessage,
  updateThreadLastMessage,
  getThread,
  getUserProfile,
  getListingName,
} from '../../_shared/messagingHelpers.ts';
import {
  getCTAByName,
  renderTemplate,
  buildTemplateContext,
  getVisibilityForRole,
  TemplateContext,
} from '../../_shared/ctaHelpers.ts';

// ============================================
// TYPES
// ============================================

export interface SendSplitBotMessagePayload {
  threadId: string;
  ctaName: string; // CTA name from os_messaging_cta.name
  recipientRole: 'guest' | 'host' | 'both';
  // Optional: override the CTA template message
  customMessageBody?: string;
  // Optional: warning message for SplitBot
  splitBotWarning?: string;
  // Optional: template context (if not provided, will be fetched from thread)
  hostName?: string;
  guestName?: string;
  listingName?: string;
}

export interface SendSplitBotMessageResponse {
  messageIds: string[];
  threadId: string;
}

// ============================================
// VALIDATION
// ============================================

function validatePayload(payload: Record<string, unknown>): SendSplitBotMessagePayload {
  const { threadId, ctaName, recipientRole } = payload;

  if (!threadId || typeof threadId !== 'string') {
    throw new ValidationError('threadId is required');
  }
  if (!ctaName || typeof ctaName !== 'string') {
    throw new ValidationError('ctaName is required');
  }
  if (!recipientRole || !['guest', 'host', 'both'].includes(recipientRole as string)) {
    throw new ValidationError('recipientRole must be "guest", "host", or "both"');
  }

  return {
    threadId,
    ctaName,
    recipientRole: recipientRole as 'guest' | 'host' | 'both',
    customMessageBody: payload.customMessageBody as string | undefined,
    splitBotWarning: payload.splitBotWarning as string | undefined,
    hostName: payload.hostName as string | undefined,
    guestName: payload.guestName as string | undefined,
    listingName: payload.listingName as string | undefined,
  };
}

// ============================================
// HANDLER
// ============================================

/**
 * Handle send_splitbot_message action
 *
 * Sends automated message(s) to specified recipient(s) in a thread
 */
export async function handleSendSplitBotMessage(
  supabase: SupabaseClient,
  payload: Record<string, unknown>
): Promise<SendSplitBotMessageResponse> {
  console.log('[sendSplitBotMessage] Starting...');

  // Validate input
  const input = validatePayload(payload);
  console.log('[sendSplitBotMessage] Validated input:', {
    threadId: input.threadId,
    ctaName: input.ctaName,
    recipientRole: input.recipientRole,
  });

  // ─────────────────────────────────────────────────────────
  // Step 1: Get thread info
  // ─────────────────────────────────────────────────────────

  const thread = await getThread(supabase, input.threadId);
  if (!thread) {
    throw new ValidationError(`Thread not found: ${input.threadId}`);
  }

  console.log('[sendSplitBotMessage] Thread found:', {
    hostUser: thread.hostUser,
    guestUser: thread.guestUser,
    listing: thread.listing,
  });

  // ─────────────────────────────────────────────────────────
  // Step 2: Get CTA from reference table
  // ─────────────────────────────────────────────────────────

  const cta = await getCTAByName(supabase, input.ctaName);
  if (!cta) {
    throw new ValidationError(`CTA not found: ${input.ctaName}`);
  }

  console.log('[sendSplitBotMessage] CTA found:', cta.display);

  // ─────────────────────────────────────────────────────────
  // Step 3: Build template context
  // ─────────────────────────────────────────────────────────

  let templateContext: TemplateContext;

  if (input.hostName && input.guestName && input.listingName) {
    // Use provided context
    templateContext = buildTemplateContext(input.hostName, input.guestName, input.listingName);
  } else {
    // Fetch context from database
    const [hostProfile, guestProfile, listingName] = await Promise.all([
      getUserProfile(supabase, thread.hostUser),
      getUserProfile(supabase, thread.guestUser),
      thread.listing ? getListingName(supabase, thread.listing) : Promise.resolve(null),
    ]);

    templateContext = buildTemplateContext(
      input.hostName || hostProfile?.firstName,
      input.guestName || guestProfile?.firstName,
      input.listingName || listingName || undefined
    );
  }

  // ─────────────────────────────────────────────────────────
  // Step 4: Render message body
  // ─────────────────────────────────────────────────────────

  const messageBody = input.customMessageBody ||
    renderTemplate(cta.message || '', templateContext) ||
    `Update for ${templateContext.listingName}`;

  console.log('[sendSplitBotMessage] Message body:', messageBody.substring(0, 50) + '...');

  // ─────────────────────────────────────────────────────────
  // Step 5: Create message(s) based on recipientRole
  // ─────────────────────────────────────────────────────────

  const messageIds: string[] = [];

  if (input.recipientRole === 'guest' || input.recipientRole === 'both') {
    const guestVisibility = getVisibilityForRole('guest');

    const guestMessageId = await createSplitBotMessage(supabase, {
      threadId: input.threadId,
      messageBody,
      callToAction: cta.display,
      visibleToHost: guestVisibility.visibleToHost,
      visibleToGuest: guestVisibility.visibleToGuest,
      splitBotWarning: input.splitBotWarning,
      recipientUserId: thread.guestUser,
    });

    messageIds.push(guestMessageId);
    console.log('[sendSplitBotMessage] Created guest message:', guestMessageId);
  }

  if (input.recipientRole === 'host' || input.recipientRole === 'both') {
    const hostVisibility = getVisibilityForRole('host');

    const hostMessageId = await createSplitBotMessage(supabase, {
      threadId: input.threadId,
      messageBody,
      callToAction: cta.display,
      visibleToHost: hostVisibility.visibleToHost,
      visibleToGuest: hostVisibility.visibleToGuest,
      splitBotWarning: input.splitBotWarning,
      recipientUserId: thread.hostUser,
    });

    messageIds.push(hostMessageId);
    console.log('[sendSplitBotMessage] Created host message:', hostMessageId);
  }

  // ─────────────────────────────────────────────────────────
  // Step 6: Update thread's last message (non-blocking)
  // ─────────────────────────────────────────────────────────

  await updateThreadLastMessage(supabase, input.threadId, messageBody);

  // ─────────────────────────────────────────────────────────
  // Return response
  // ─────────────────────────────────────────────────────────

  console.log('[sendSplitBotMessage] Complete, created', messageIds.length, 'message(s)');

  return {
    messageIds,
    threadId: input.threadId,
  };
}
