/**
 * Messaging Helpers
 * Split Lease - Native Supabase Messaging
 *
 * Helper functions for native message and thread creation.
 * NO BUBBLE DEPENDENCY - All operations are Supabase-native.
 *
 * The database triggers handle:
 * - Broadcasting new messages to Realtime channels
 * - Updating thread's last message preview
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============================================
// ID GENERATION
// ============================================

/**
 * Generate a Bubble-compatible ID using the database function
 * Format: {13-digit-timestamp}x{17-digit-random}
 * Example: 1765872300914x25497779776179264
 */
export async function generateBubbleId(supabase: SupabaseClient): Promise<string> {
  const { data, error } = await supabase.rpc('generate_bubble_id');

  if (error) {
    console.error('[messagingHelpers] Failed to generate ID:', error);
    // Fallback: generate client-side (same format)
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1e17).toString().padStart(17, '0');
    return `${timestamp}x${random}`;
  }

  return data;
}

// ============================================
// USER LOOKUP
// ============================================

/**
 * Get user's Bubble ID from email
 * Maps auth.users.email -> public.user._id
 */
export async function getUserBubbleId(
  supabase: SupabaseClient,
  userEmail: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('user')
    .select('_id')
    .ilike('email', userEmail)
    .single();

  if (error || !data) {
    console.error('[messagingHelpers] User lookup failed:', error?.message);
    return null;
  }

  return data._id;
}

/**
 * Get user profile by Bubble ID
 */
export async function getUserProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<{ _id: string; firstName: string; lastName: string; avatar?: string } | null> {
  const { data, error } = await supabase
    .from('user')
    .select('_id, "First Name", "Last Name", "Profile Photo"')
    .eq('_id', userId)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    _id: data._id,
    firstName: data['First Name'] || '',
    lastName: data['Last Name'] || '',
    avatar: data['Profile Photo'],
  };
}

// ============================================
// THREAD OPERATIONS
// ============================================

export interface CreateThreadParams {
  hostUserId: string;
  guestUserId: string;
  listingId?: string;
  proposalId?: string;
  subject?: string;
  createdBy: string;
}

/**
 * Create a new thread (native Supabase)
 * Returns the new thread ID
 */
export async function createThread(
  supabase: SupabaseClient,
  params: CreateThreadParams
): Promise<string> {
  const threadId = await generateBubbleId(supabase);
  const now = new Date().toISOString();

  const { error } = await supabase
    .from('thread')
    .insert({
      _id: threadId,
      "-Host User": params.hostUserId,
      "-Guest User": params.guestUserId,
      "Listing": params.listingId || null,
      "Proposal": params.proposalId || null,
      "Thread Subject": params.subject || null,
      "Created By": params.createdBy,
      "Created Date": now,
      "Modified Date": now,
      "Participants": [params.hostUserId, params.guestUserId],
      "from logged out user?": false,
      created_at: now,
      updated_at: now,
    });

  if (error) {
    console.error('[messagingHelpers] Failed to create thread:', error);
    throw new Error(`Failed to create thread: ${error.message}`);
  }

  // Junction tables (thread_participant) are now auto-populated by database trigger
  // trigger_populate_thread_participant_junction handles this automatically on thread INSERT

  console.log('[messagingHelpers] Created thread:', threadId);
  return threadId;
}

/**
 * Find existing thread between two users for a listing
 * Returns thread ID if found, null otherwise
 */
export async function findExistingThread(
  supabase: SupabaseClient,
  hostUserId: string,
  guestUserId: string,
  listingId?: string
): Promise<string | null> {
  let query = supabase
    .from('thread')
    .select('_id')
    .eq('"-Host User"', hostUserId)
    .eq('"-Guest User"', guestUserId);

  if (listingId) {
    query = query.eq('"Listing"', listingId);
  }

  const { data, error } = await query.limit(1).maybeSingle();

  if (error) {
    console.error('[messagingHelpers] Thread lookup error:', error);
    return null;
  }

  return data?._id || null;
}

/**
 * Get thread by ID with participant info
 */
export async function getThread(
  supabase: SupabaseClient,
  threadId: string
): Promise<{ _id: string; hostUser: string; guestUser: string; listing?: string } | null> {
  const { data, error } = await supabase
    .from('thread')
    .select('_id, "-Host User", "-Guest User", "Listing"')
    .eq('_id', threadId)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    _id: data._id,
    hostUser: data['-Host User'],
    guestUser: data['-Guest User'],
    listing: data['Listing'],
  };
}

// ============================================
// MESSAGE OPERATIONS
// ============================================

export interface CreateMessageParams {
  threadId: string;
  messageBody: string;
  senderUserId: string;
  isSplitBot?: boolean;
  callToAction?: string;
  splitBotWarning?: string;
  visibleToHost?: boolean;
  visibleToGuest?: boolean;
}

/**
 * Create a new message (native Supabase)
 * The database trigger will automatically:
 * 1. Broadcast to Realtime channel
 * 2. Update thread's last message
 *
 * Returns the new message ID
 */
export async function createMessage(
  supabase: SupabaseClient,
  params: CreateMessageParams
): Promise<string> {
  const messageId = await generateBubbleId(supabase);
  const now = new Date().toISOString();

  // Get thread info to determine host/guest
  const thread = await getThread(supabase, params.threadId);

  if (!thread) {
    throw new Error('Thread not found');
  }

  // Determine unread users (everyone except sender)
  const unreadUsers = [thread.hostUser, thread.guestUser]
    .filter(id => id && id !== params.senderUserId);

  const { error } = await supabase
    .from('_message')
    .insert({
      _id: messageId,
      "Associated Thread/Conversation": params.threadId,
      "Message Body": params.messageBody,
      "-Originator User": params.senderUserId,
      "-Host User": thread.hostUser,
      "-Guest User": thread.guestUser,
      "is Split Bot": params.isSplitBot || false,
      "is Visible to Host": params.visibleToHost ?? true,
      "is Visible to Guest": params.visibleToGuest ?? true,
      "is Forwarded": false,
      "is deleted (is hidden)": false,
      "Call to Action": params.callToAction || null,
      "Split Bot Warning": params.splitBotWarning || null,
      "Unread Users": unreadUsers,
      "Created Date": now,
      "Modified Date": now,
      "Created By": params.senderUserId,
      created_at: now,
      updated_at: now,
      pending: false,
    });

  if (error) {
    console.error('[messagingHelpers] Failed to create message:', error);
    throw new Error(`Failed to create message: ${error.message}`);
  }

  console.log('[messagingHelpers] Created message:', messageId);
  return messageId;
}

/**
 * Mark messages as read by removing user from Unread Users
 */
export async function markMessagesAsRead(
  supabase: SupabaseClient,
  messageIds: string[],
  userId: string
): Promise<void> {
  for (const messageId of messageIds) {
    const { data: message } = await supabase
      .from('_message')
      .select('"Unread Users"')
      .eq('_id', messageId)
      .single();

    if (message && Array.isArray(message['Unread Users'])) {
      const updatedUnread = message['Unread Users'].filter((id: string) => id !== userId);

      await supabase
        .from('_message')
        .update({ "Unread Users": updatedUnread })
        .eq('_id', messageId);
    }
  }
}

/**
 * Get unread message count for a user in a thread
 */
export async function getUnreadCount(
  supabase: SupabaseClient,
  threadId: string,
  userId: string
): Promise<number> {
  const { count, error } = await supabase
    .from('_message')
    .select('*', { count: 'exact', head: true })
    .eq('"Associated Thread/Conversation"', threadId)
    .contains('"Unread Users"', [userId]);

  if (error) {
    console.error('[messagingHelpers] Failed to get unread count:', error);
    return 0;
  }

  return count || 0;
}
