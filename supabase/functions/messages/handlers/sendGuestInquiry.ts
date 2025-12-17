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
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { ValidationError } from '../../_shared/errors.ts';
import { validateRequiredFields, validateEmail } from '../../_shared/validation.ts';

interface SendGuestInquiryPayload {
  sender_name: string;           // Required: Guest's name
  sender_email: string;          // Required: Guest's email
  message_body: string;          // Required: Message content
  recipient_user_id: string;     // Required: Host's user._id (Bubble ID)
  listing_id?: string;           // Optional: Associated listing
}

interface SendGuestInquiryResult {
  success: boolean;
  inquiry_id: string;
  timestamp: string;
}

/**
 * Handle send_guest_inquiry action - NO AUTH REQUIRED
 * Creates a guest inquiry that hosts can see and respond to
 */
export async function handleSendGuestInquiry(
  supabaseAdmin: SupabaseClient,
  payload: Record<string, unknown>
): Promise<SendGuestInquiryResult> {
  console.log('[sendGuestInquiry] ========== GUEST INQUIRY ==========');

  // Validate required fields
  const typedPayload = payload as unknown as SendGuestInquiryPayload;
  validateRequiredFields(typedPayload, ['sender_name', 'sender_email', 'message_body', 'recipient_user_id']);

  // Validate email format
  validateEmail(typedPayload.sender_email);

  // Validate message body is not empty
  if (!typedPayload.message_body.trim()) {
    throw new ValidationError('Message body cannot be empty');
  }

  // Validate name is not empty
  if (!typedPayload.sender_name.trim()) {
    throw new ValidationError('Name cannot be empty');
  }

  console.log('[sendGuestInquiry] Guest:', typedPayload.sender_name, typedPayload.sender_email);
  console.log('[sendGuestInquiry] Recipient:', typedPayload.recipient_user_id);
  console.log('[sendGuestInquiry] Listing:', typedPayload.listing_id || 'none');

  // Insert into guest_inquiry table
  const { data: inquiry, error } = await supabaseAdmin
    .from('guest_inquiry')
    .insert({
      sender_name: typedPayload.sender_name.trim(),
      sender_email: typedPayload.sender_email.trim().toLowerCase(),
      message_body: typedPayload.message_body.trim(),
      recipient_user_id: typedPayload.recipient_user_id,
      listing_id: typedPayload.listing_id || null,
      status: 'pending',
    })
    .select('id')
    .single();

  if (error) {
    console.error('[sendGuestInquiry] Insert error:', error);
    throw new Error(`Failed to save inquiry: ${error.message}`);
  }

  console.log('[sendGuestInquiry] Inquiry created:', inquiry.id);
  console.log('[sendGuestInquiry] ========== GUEST INQUIRY COMPLETE ==========');

  return {
    success: true,
    inquiry_id: inquiry.id,
    timestamp: new Date().toISOString(),
  };
}
