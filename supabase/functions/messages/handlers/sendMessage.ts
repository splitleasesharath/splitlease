/**
 * Send Message Handler
 * Split Lease - Messages Edge Function
 *
 * Replicates Bubble's CORE-send-new-message workflow
 * Triggers the Bubble workflow to create a new message in a thread
 *
 * NO FALLBACK PRINCIPLE: Throws if message creation fails
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { User } from 'https://esm.sh/@supabase/supabase-js@2';
import { ValidationError, BubbleApiError } from '../../_shared/errors.ts';
import { validateRequiredFields } from '../../_shared/validation.ts';
import { BubbleSyncService } from '../../_shared/bubbleSync.ts';

interface SendMessagePayload {
  thread_id: string;           // Required: Thread/Conversation ID
  message_body: string;        // Required: Message content
  sender_id?: string;          // Optional: Sender user ID (defaults to authenticated user)
  to_guest?: boolean;          // Optional: Is message to guest (default: false)
  splitbot?: boolean;          // Optional: Is Split Bot message (default: false)
  call_to_action?: string;     // Optional: CTA type for system messages
  proposal_id?: string;        // Optional: Associated proposal
  date_change_req_id?: string; // Optional: Associated date change request
  review_id?: string;          // Optional: Associated review
}

interface SendMessageResult {
  success: boolean;
  message_id?: string;
  thread_id: string;
  timestamp: string;
}

/**
 * Handle send_message action
 * Triggers Bubble workflow to create message
 */
export async function handleSendMessage(
  supabaseAdmin: SupabaseClient,
  payload: Record<string, unknown>,
  user: User
): Promise<SendMessageResult> {
  console.log('[sendMessage] ========== SEND MESSAGE ==========');
  console.log('[sendMessage] User:', user.email);
  console.log('[sendMessage] Payload:', JSON.stringify(payload, null, 2));

  // Validate required fields
  const typedPayload = payload as unknown as SendMessagePayload;
  validateRequiredFields(typedPayload, ['thread_id', 'message_body']);

  // Validate message body is not empty
  if (!typedPayload.message_body.trim()) {
    throw new ValidationError('Message body cannot be empty');
  }

  // Get user's Bubble ID from public.user table
  const { data: userData, error: userError } = await supabaseAdmin
    .from('user')
    .select('_id')
    .eq('supabase_user_id', user.id)
    .single();

  if (userError || !userData?._id) {
    console.error('[sendMessage] User lookup failed:', userError);
    throw new ValidationError('Could not find user profile. Please try logging in again.');
  }

  const senderBubbleId = typedPayload.sender_id || userData._id;
  console.log('[sendMessage] Sender Bubble ID:', senderBubbleId);

  // Initialize Bubble sync service
  const bubbleBaseUrl = Deno.env.get('BUBBLE_API_BASE_URL');
  const bubbleApiKey = Deno.env.get('BUBBLE_API_KEY');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!bubbleBaseUrl || !bubbleApiKey || !supabaseUrl || !supabaseServiceKey) {
    throw new Error('Bubble or Supabase configuration missing');
  }

  const syncService = new BubbleSyncService(
    bubbleBaseUrl,
    bubbleApiKey,
    supabaseUrl,
    supabaseServiceKey
  );

  // Build workflow parameters based on Bubble's CORE-send-new-message workflow
  const workflowParams: Record<string, unknown> = {
    thread_conversation: typedPayload.thread_id,
    message_body: typedPayload.message_body,
    sender: senderBubbleId,
    to_guest: typedPayload.to_guest ?? false,
    splitbot: typedPayload.splitbot ?? false,
  };

  // Add optional parameters if provided
  if (typedPayload.call_to_action) {
    workflowParams.call_to_action = typedPayload.call_to_action;
  }
  if (typedPayload.proposal_id) {
    workflowParams.proposal = typedPayload.proposal_id;
  }
  if (typedPayload.date_change_req_id) {
    workflowParams.date_change_req = typedPayload.date_change_req_id;
  }
  if (typedPayload.review_id) {
    workflowParams.review = typedPayload.review_id;
  }

  console.log('[sendMessage] Triggering Bubble workflow: send-new-message');
  console.log('[sendMessage] Workflow params:', JSON.stringify(workflowParams, null, 2));

  try {
    // Trigger the Bubble workflow to create the message
    // This workflow handles all the business logic in Bubble
    const result = await syncService.triggerWorkflowOnly('send-new-message', workflowParams);

    console.log('[sendMessage] Workflow result:', JSON.stringify(result, null, 2));

    // Extract message ID if returned
    const messageId = result?.response?.message || result?.message || result?.id;

    console.log('[sendMessage] Message sent successfully');
    console.log('[sendMessage] ========== SEND COMPLETE ==========');

    return {
      success: true,
      message_id: messageId,
      thread_id: typedPayload.thread_id,
      timestamp: new Date().toISOString(),
    };

  } catch (error) {
    console.error('[sendMessage] Failed to send message:', error);

    if (error instanceof BubbleApiError) {
      throw error;
    }

    throw new BubbleApiError(
      `Failed to send message: ${(error as Error).message}`,
      500,
      error
    );
  }
}
