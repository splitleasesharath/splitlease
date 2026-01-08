/**
 * Send Message Handler - NATIVE SUPABASE
 * Split Lease - Messages Edge Function
 *
 * Creates messages directly in Supabase (NO BUBBLE).
 * The database trigger handles:
 * - Broadcasting to Realtime channel
 * - Updating thread's last message
 *
 * NO FALLBACK PRINCIPLE: Throws if message creation fails
 *
 * FP PATTERN: Separates pure data builders from effectful database operations
 * All data transformations are pure with @pure annotations
 * All database operations are explicit with @effectful annotations
 *
 * @module messages/handlers/sendMessage
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { User } from 'https://esm.sh/@supabase/supabase-js@2';
import { ValidationError } from '../../_shared/errors.ts';
import { validateRequiredFields } from '../../_shared/validation.ts';
import {
  getUserBubbleId,
  createMessage,
  createThread,
  findExistingThread
} from '../../_shared/messagingHelpers.ts';

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const LOG_PREFIX = '[messages:sendMessage]'

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface SendMessagePayload {
  readonly thread_id?: string;          // Optional if creating new thread
  readonly message_body: string;        // Required: Message content
  // For new thread creation:
  readonly recipient_user_id?: string;  // Required if no thread_id
  readonly listing_id?: string;         // Optional: Associated listing
  // Message options:
  readonly splitbot?: boolean;          // Optional: Is Split Bot message
  readonly call_to_action?: string;     // Optional: CTA type
  readonly split_bot_warning?: string;  // Optional: Warning text
}

interface SendMessageResult {
  readonly success: boolean;
  readonly message_id: string;
  readonly thread_id: string;
  readonly is_new_thread: boolean;
  readonly timestamp: string;
}

// ─────────────────────────────────────────────────────────────
// Validation Predicates
// ─────────────────────────────────────────────────────────────

/**
 * Check if user has valid email
 * @pure
 */
const hasValidEmail = (user: User): user is User & { email: string } =>
  typeof user.email === 'string' && user.email.length > 0

/**
 * Check if message body is valid
 * @pure
 */
const isValidMessageBody = (body: string): boolean =>
  body.trim().length > 0

/**
 * Check if payload has thread context
 * @pure
 */
const hasThreadContext = (payload: SendMessagePayload): boolean =>
  typeof payload.thread_id === 'string' || typeof payload.recipient_user_id === 'string'

// ─────────────────────────────────────────────────────────────
// Pure Data Builders
// ─────────────────────────────────────────────────────────────

/**
 * Build success response
 * @pure
 */
const buildResponse = (
  messageId: string,
  threadId: string,
  isNewThread: boolean
): SendMessageResult =>
  Object.freeze({
    success: true,
    message_id: messageId,
    thread_id: threadId,
    is_new_thread: isNewThread,
    timestamp: new Date().toISOString(),
  })

// ─────────────────────────────────────────────────────────────
// Thread Resolution Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Find or create thread for message
 * @effectful - Database operations
 */
const resolveThread = async (
  supabase: SupabaseClient,
  senderBubbleId: string,
  recipientId: string,
  listingId?: string
): Promise<{ threadId: string; isNewThread: boolean }> => {
  console.log(`${LOG_PREFIX} Looking for existing thread with recipient: ${recipientId}`)

  // Check for existing thread (sender as guest, recipient as host)
  let threadId = await findExistingThread(
    supabase,
    recipientId,  // host
    senderBubbleId,  // guest
    listingId
  )

  if (!threadId) {
    // Also check reverse (sender as host, recipient as guest)
    threadId = await findExistingThread(
      supabase,
      senderBubbleId,  // host
      recipientId,  // guest
      listingId
    )
  }

  if (!threadId) {
    // Create new thread (assume recipient is host, sender is guest)
    console.log(`${LOG_PREFIX} Creating new thread...`)
    threadId = await createThread(supabase, {
      hostUserId: recipientId,
      guestUserId: senderBubbleId,
      listingId,
      createdBy: senderBubbleId,
    })
    console.log(`${LOG_PREFIX} Created new thread: ${threadId}`)
    return { threadId, isNewThread: true }
  }

  console.log(`${LOG_PREFIX} Found existing thread: ${threadId}`)
  return { threadId, isNewThread: false }
}

// ─────────────────────────────────────────────────────────────
// Main Handler
// ─────────────────────────────────────────────────────────────

/**
 * Handle send_message action - NATIVE SUPABASE
 * No longer calls Bubble workflows - all operations are Supabase-native
 * @effectful - Orchestrates database operations
 */
export async function handleSendMessage(
  supabaseAdmin: SupabaseClient,
  payload: Record<string, unknown>,
  user: User
): Promise<SendMessageResult> {
  console.log(`${LOG_PREFIX} ========== SEND MESSAGE (NATIVE) ==========`)
  console.log(`${LOG_PREFIX} User:`, user.email)

  // ================================================
  // VALIDATION
  // ================================================

  const typedPayload = payload as unknown as SendMessagePayload
  validateRequiredFields(typedPayload, ['message_body'])

  if (!isValidMessageBody(typedPayload.message_body)) {
    throw new ValidationError('Message body cannot be empty')
  }

  if (!hasValidEmail(user)) {
    throw new ValidationError('Could not find user profile. Please try logging in again.')
  }

  // ================================================
  // FETCH SENDER
  // ================================================

  const senderBubbleId = await getUserBubbleId(supabaseAdmin, user.email)
  if (!senderBubbleId) {
    throw new ValidationError('Could not find user profile. Please try logging in again.')
  }

  console.log(`${LOG_PREFIX} Sender Bubble ID: ${senderBubbleId}`)

  // ================================================
  // RESOLVE THREAD
  // ================================================

  let threadId = typedPayload.thread_id
  let isNewThread = false

  if (!threadId) {
    if (!typedPayload.recipient_user_id) {
      throw new ValidationError('Either thread_id or recipient_user_id is required')
    }

    const resolved = await resolveThread(
      supabaseAdmin,
      senderBubbleId,
      typedPayload.recipient_user_id,
      typedPayload.listing_id
    )
    threadId = resolved.threadId
    isNewThread = resolved.isNewThread
  }

  // ================================================
  // CREATE MESSAGE
  // ================================================

  console.log(`${LOG_PREFIX} Creating message in thread: ${threadId}`)

  const messageId = await createMessage(supabaseAdmin, {
    threadId,
    messageBody: typedPayload.message_body.trim(),
    senderUserId: senderBubbleId,
    isSplitBot: typedPayload.splitbot || false,
    callToAction: typedPayload.call_to_action,
    splitBotWarning: typedPayload.split_bot_warning,
  })

  console.log(`${LOG_PREFIX} Message created: ${messageId}`)
  console.log(`${LOG_PREFIX} ========== SEND COMPLETE (NATIVE) ==========`)

  return buildResponse(messageId, threadId, isNewThread)
}

// ─────────────────────────────────────────────────────────────
// Exported Test Constants
// ─────────────────────────────────────────────────────────────

/**
 * Exported for testing purposes
 * @test
 */
export const __test__ = Object.freeze({
  // Constants
  LOG_PREFIX,

  // Validation Predicates
  hasValidEmail,
  isValidMessageBody,
  hasThreadContext,

  // Pure Data Builders
  buildResponse,

  // Thread Resolution Helpers
  resolveThread,

  // Main Handler
  handleSendMessage,
})
