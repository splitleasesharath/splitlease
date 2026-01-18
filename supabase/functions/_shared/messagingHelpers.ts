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

// ============================================
// PROPOSAL THREAD OPERATIONS
// ============================================

/**
 * Find existing thread for a proposal
 * Returns thread ID if found, null otherwise
 */
export async function findThreadByProposal(
  supabase: SupabaseClient,
  proposalId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('thread')
    .select('_id')
    .eq('"Proposal"', proposalId)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[messagingHelpers] Thread lookup by proposal error:', error);
    return null;
  }

  return data?._id || null;
}

/**
 * Get listing name by ID
 */
export async function getListingName(
  supabase: SupabaseClient,
  listingId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('listing')
    .select('"Name"')
    .eq('_id', listingId)
    .single();

  if (error || !data) {
    console.error('[messagingHelpers] Listing lookup error:', error);
    return null;
  }

  return data['Name'] || null;
}

export interface CreateProposalThreadParams {
  proposalId: string;
  hostUserId: string;
  guestUserId: string;
  listingId: string;
  listingName: string;
}

/**
 * Create a new thread for a proposal
 * Uses listing name as thread subject
 * Returns the new thread ID
 */
export async function createProposalThread(
  supabase: SupabaseClient,
  params: CreateProposalThreadParams
): Promise<string> {
  const threadId = await createThread(supabase, {
    hostUserId: params.hostUserId,
    guestUserId: params.guestUserId,
    listingId: params.listingId,
    proposalId: params.proposalId,
    subject: params.listingName,
    createdBy: params.guestUserId, // Proposals are initiated by guests
  });

  console.log('[messagingHelpers] Created proposal thread:', threadId, 'for proposal:', params.proposalId);
  return threadId;
}

/**
 * Find or create a thread for a proposal
 * Returns { threadId, isNew }
 *
 * Logic:
 * 1. First check if thread already exists for this proposal
 * 2. If not, check if thread exists for same listing+guest (from ContactHost)
 * 3. If found, update that thread with the proposal ID
 * 4. If nothing found, create a new thread
 */
export async function findOrCreateProposalThread(
  supabase: SupabaseClient,
  params: CreateProposalThreadParams
): Promise<{ threadId: string; isNew: boolean }> {
  // First, check if thread already exists for this proposal
  const existingThreadByProposal = await findThreadByProposal(supabase, params.proposalId);

  if (existingThreadByProposal) {
    console.log('[messagingHelpers] Found existing thread for proposal:', existingThreadByProposal);
    return { threadId: existingThreadByProposal, isNew: false };
  }

  // Second, check if thread exists for the same listing+guest (from ContactHost flow)
  const existingThreadByListing = await findExistingThread(
    supabase,
    params.hostUserId,
    params.guestUserId,
    params.listingId
  );

  if (existingThreadByListing) {
    console.log('[messagingHelpers] Found existing thread for listing+guest, updating with proposal:', existingThreadByListing);

    // Update the existing thread to link it to this proposal
    const { error: updateError } = await supabase
      .from('thread')
      .update({
        "Proposal": params.proposalId,
        "Modified Date": new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('_id', existingThreadByListing);

    if (updateError) {
      console.error('[messagingHelpers] Failed to update thread with proposal:', updateError);
      // Continue anyway - thread exists, just won't be linked
    }

    return { threadId: existingThreadByListing, isNew: false };
  }

  // Create new thread
  const newThreadId = await createProposalThread(supabase, params);
  return { threadId: newThreadId, isNew: true };
}

// ============================================
// SPLITBOT MESSAGE OPERATIONS
// ============================================

export interface CreateSplitBotMessageParams {
  threadId: string;
  messageBody: string;
  callToAction: string; // CTA display name (FK to os_messaging_cta.display)
  visibleToHost: boolean;
  visibleToGuest: boolean;
  splitBotWarning?: string;
  recipientUserId: string; // The user who should see this as unread
}

/**
 * SplitBot user ID - constant for automated messages
 */
export const SPLITBOT_USER_ID = '1634177189464x117577733821174320';

/**
 * Create a SplitBot automated message
 * Sets is_split_bot = true and is_forwarded = true (per Bubble pattern)
 */
export async function createSplitBotMessage(
  supabase: SupabaseClient,
  params: CreateSplitBotMessageParams
): Promise<string> {
  const messageId = await generateBubbleId(supabase);
  const now = new Date().toISOString();

  // Get thread info for host/guest IDs
  const thread = await getThread(supabase, params.threadId);
  if (!thread) {
    throw new Error('Thread not found');
  }

  const { error } = await supabase
    .from('_message')
    .insert({
      _id: messageId,
      "Associated Thread/Conversation": params.threadId,
      "Message Body": params.messageBody,
      "-Originator User": SPLITBOT_USER_ID,
      "-Host User": thread.hostUser,
      "-Guest User": thread.guestUser,
      "is Split Bot": true,
      "is Forwarded": true, // SplitBot messages are marked as forwarded per Bubble pattern
      "is Visible to Host": params.visibleToHost,
      "is Visible to Guest": params.visibleToGuest,
      "is deleted (is hidden)": false,
      "Call to Action": params.callToAction,
      "Split Bot Warning": params.splitBotWarning || null,
      "Unread Users": [params.recipientUserId],
      "Created Date": now,
      "Modified Date": now,
      "Created By": SPLITBOT_USER_ID,
      created_at: now,
      updated_at: now,
      pending: false,
    });

  if (error) {
    console.error('[messagingHelpers] Failed to create SplitBot message:', error);
    throw new Error(`Failed to create SplitBot message: ${error.message}`);
  }

  console.log('[messagingHelpers] Created SplitBot message:', messageId);
  return messageId;
}

/**
 * Update thread's last message info after sending a message
 */
export async function updateThreadLastMessage(
  supabase: SupabaseClient,
  threadId: string,
  messageBody: string
): Promise<void> {
  const now = new Date().toISOString();

  const { error } = await supabase
    .from('thread')
    .update({
      "~Last Message": messageBody.substring(0, 100), // Truncate for preview
      "~Date Last Message": now,
      "Modified Date": now,
      updated_at: now,
    })
    .eq('_id', threadId);

  if (error) {
    console.error('[messagingHelpers] Failed to update thread last message:', error);
    // Non-blocking - don't throw
  }
}
