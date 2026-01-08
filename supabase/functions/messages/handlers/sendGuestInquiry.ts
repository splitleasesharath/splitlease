/**
 * Send Guest Inquiry Handler - NO AUTH REQUIRED
 * Split Lease - Messages Edge Function
 *
 * Allows unauthenticated users to contact hosts by providing name and email.
 * Creates a guest inquiry record that the host can respond to.
 *
 * This handler does NOT require authentication - it's designed for the
 * Contact Host modal when users are not logged in.
 *
 * NO FALLBACK PRINCIPLE: Throws if inquiry creation fails
 *
 * FP PATTERN: Separates pure data builders from effectful database operations
 * All data transformations are pure with @pure annotations
 * All database operations are explicit with @effectful annotations
 *
 * @module messages/handlers/sendGuestInquiry
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { ValidationError } from '../../_shared/errors.ts';
import { validateRequiredFields, validateEmail } from '../../_shared/validation.ts';
import { sendToSlack } from '../../_shared/slack.ts';

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const LOG_PREFIX = '[messages:sendGuestInquiry]'

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface SendGuestInquiryPayload {
  readonly sender_name: string;           // Required: Guest's name
  readonly sender_email: string;          // Required: Guest's email
  readonly message_body: string;          // Required: Message content
  readonly recipient_user_id: string;     // Required: Host's user._id (Bubble ID)
  readonly listing_id?: string;           // Optional: Associated listing
}

interface SendGuestInquiryResult {
  readonly success: boolean;
  readonly inquiry_id: string;
  readonly timestamp: string;
}

interface InquiryInsertData {
  readonly sender_name: string;
  readonly sender_email: string;
  readonly message_body: string;
  readonly recipient_user_id: string;
  readonly listing_id: string | null;
  readonly status: 'pending';
}

// ─────────────────────────────────────────────────────────────
// Validation Predicates
// ─────────────────────────────────────────────────────────────

/**
 * Check if name is valid
 * @pure
 */
const isValidName = (name: string): boolean =>
  name.trim().length > 0

/**
 * Check if message body is valid
 * @pure
 */
const isValidMessageBody = (body: string): boolean =>
  body.trim().length > 0

// ─────────────────────────────────────────────────────────────
// Pure Data Builders
// ─────────────────────────────────────────────────────────────

/**
 * Build inquiry insert data
 * @pure
 */
const buildInquiryData = (payload: SendGuestInquiryPayload): InquiryInsertData =>
  Object.freeze({
    sender_name: payload.sender_name.trim(),
    sender_email: payload.sender_email.trim().toLowerCase(),
    message_body: payload.message_body.trim(),
    recipient_user_id: payload.recipient_user_id,
    listing_id: payload.listing_id || null,
    status: 'pending' as const,
  })

/**
 * Build Slack notification message
 * @pure
 */
const buildSlackMessage = (payload: SendGuestInquiryPayload): string => {
  const listingInfo = payload.listing_id
    ? `\n*Listing:* ${payload.listing_id}`
    : ''

  const escapedMessage = payload.message_body.trim().replace(/\n/g, '\n>')

  return `🏠 *New Guest Inquiry*\n\n*From:* ${payload.sender_name.trim()}\n*Email:* ${payload.sender_email.trim().toLowerCase()}${listingInfo}\n\n*Message:*\n>${escapedMessage}`
}

/**
 * Build success response
 * @pure
 */
const buildResponse = (inquiryId: string): SendGuestInquiryResult =>
  Object.freeze({
    success: true,
    inquiry_id: inquiryId,
    timestamp: new Date().toISOString(),
  })

// ─────────────────────────────────────────────────────────────
// Database Query Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Insert guest inquiry into database
 * @effectful - Database write operation
 */
const insertInquiry = async (
  supabase: SupabaseClient,
  data: InquiryInsertData
): Promise<string> => {
  const { data: inquiry, error } = await supabase
    .from('guest_inquiry')
    .insert(data)
    .select('id')
    .single()

  if (error) {
    console.error(`${LOG_PREFIX} Insert error:`, error)
    throw new Error(`Failed to save inquiry: ${error.message}`)
  }

  return inquiry.id
}

// ─────────────────────────────────────────────────────────────
// Main Handler
// ─────────────────────────────────────────────────────────────

/**
 * Handle send_guest_inquiry action - NO AUTH REQUIRED
 * Creates a guest inquiry that hosts can see and respond to
 * @effectful - Orchestrates database operations
 */
export async function handleSendGuestInquiry(
  supabaseAdmin: SupabaseClient,
  payload: Record<string, unknown>
): Promise<SendGuestInquiryResult> {
  console.log(`${LOG_PREFIX} ========== GUEST INQUIRY ==========`)

  // ================================================
  // VALIDATION
  // ================================================

  const typedPayload = payload as unknown as SendGuestInquiryPayload
  validateRequiredFields(typedPayload, ['sender_name', 'sender_email', 'message_body', 'recipient_user_id'])

  validateEmail(typedPayload.sender_email)

  if (!isValidMessageBody(typedPayload.message_body)) {
    throw new ValidationError('Message body cannot be empty')
  }

  if (!isValidName(typedPayload.sender_name)) {
    throw new ValidationError('Name cannot be empty')
  }

  console.log(`${LOG_PREFIX} Guest: ${typedPayload.sender_name} ${typedPayload.sender_email}`)
  console.log(`${LOG_PREFIX} Recipient: ${typedPayload.recipient_user_id}`)
  console.log(`${LOG_PREFIX} Listing: ${typedPayload.listing_id || 'none'}`)

  // ================================================
  // INSERT INQUIRY
  // ================================================

  const inquiryData = buildInquiryData(typedPayload)
  const inquiryId = await insertInquiry(supabaseAdmin, inquiryData)

  console.log(`${LOG_PREFIX} Inquiry created: ${inquiryId}`)

  // ================================================
  // SLACK NOTIFICATION (fire-and-forget)
  // ================================================

  sendToSlack('acquisition', {
    text: buildSlackMessage(typedPayload)
  })

  console.log(`${LOG_PREFIX} Slack notification queued`)
  console.log(`${LOG_PREFIX} ========== GUEST INQUIRY COMPLETE ==========`)

  return buildResponse(inquiryId)
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
  isValidName,
  isValidMessageBody,

  // Pure Data Builders
  buildInquiryData,
  buildSlackMessage,
  buildResponse,

  // Database Query Helpers
  insertInquiry,

  // Main Handler
  handleSendGuestInquiry,
})
