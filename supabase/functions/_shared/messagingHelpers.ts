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
 *
 * @module _shared/messagingHelpers
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const LOG_PREFIX = '[messagingHelpers]'
const RANDOM_ID_LENGTH = 17
const RANDOM_ID_MAX = 1e17

/**
 * Database tables
 * @immutable
 */
const TABLES = Object.freeze({
  USER: 'user',
  THREAD: 'thread',
  MESSAGE: '_message',
} as const)

/**
 * Thread field names (Bubble schema)
 * @immutable
 */
const THREAD_FIELDS = Object.freeze({
  ID: '_id',
  HOST_USER: '-Host User',
  GUEST_USER: '-Guest User',
  LISTING: 'Listing',
  PROPOSAL: 'Proposal',
  SUBJECT: 'Thread Subject',
  CREATED_BY: 'Created By',
  CREATED_DATE: 'Created Date',
  MODIFIED_DATE: 'Modified Date',
  PARTICIPANTS: 'Participants',
  FROM_LOGGED_OUT: 'from logged out user?',
} as const)

/**
 * Message field names (Bubble schema)
 * @immutable
 */
const MESSAGE_FIELDS = Object.freeze({
  ID: '_id',
  THREAD: 'Associated Thread/Conversation',
  BODY: 'Message Body',
  ORIGINATOR: '-Originator User',
  HOST_USER: '-Host User',
  GUEST_USER: '-Guest User',
  IS_SPLIT_BOT: 'is Split Bot',
  VISIBLE_TO_HOST: 'is Visible to Host',
  VISIBLE_TO_GUEST: 'is Visible to Guest',
  IS_FORWARDED: 'is Forwarded',
  IS_DELETED: 'is deleted (is hidden)',
  CALL_TO_ACTION: 'Call to Action',
  SPLIT_BOT_WARNING: 'Split Bot Warning',
  UNREAD_USERS: 'Unread Users',
  CREATED_DATE: 'Created Date',
  MODIFIED_DATE: 'Modified Date',
  CREATED_BY: 'Created By',
} as const)

/**
 * User field names (Bubble schema)
 * @immutable
 */
const USER_FIELDS = Object.freeze({
  ID: '_id',
  EMAIL: 'email',
  FIRST_NAME: 'First Name',
  LAST_NAME: 'Last Name',
  PROFILE_PHOTO: 'Profile Photo',
} as const)

// ─────────────────────────────────────────────────────────────
// Validation Predicates
// ─────────────────────────────────────────────────────────────

/**
 * Check if error occurred
 * @pure
 */
const hasError = (error: unknown): boolean =>
  error !== null && error !== undefined

/**
 * Check if data exists
 * @pure
 */
const hasData = <T>(data: T | null | undefined): data is T =>
  data !== null && data !== undefined

/**
 * Check if array has items
 * @pure
 */
const hasItems = <T>(arr: ReadonlyArray<T> | null | undefined): arr is ReadonlyArray<T> =>
  arr !== null && arr !== undefined && arr.length > 0

// ─────────────────────────────────────────────────────────────
// ID Generation Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Generate fallback client-side ID (same format as Bubble)
 * @pure (uses Math.random but that's acceptable for ID generation)
 */
const generateFallbackId = (): string => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * RANDOM_ID_MAX).toString().padStart(RANDOM_ID_LENGTH, '0');
  return `${timestamp}x${random}`;
}

// ─────────────────────────────────────────────────────────────
// Result Builders
// ─────────────────────────────────────────────────────────────

/**
 * Build user profile result
 * @pure
 */
const buildUserProfileResult = (
  id: string,
  firstName: string,
  lastName: string,
  avatar?: string
): Readonly<{ _id: string; firstName: string; lastName: string; avatar?: string }> =>
  Object.freeze({ _id: id, firstName, lastName, ...(avatar ? { avatar } : {}) })

/**
 * Build thread result
 * @pure
 */
const buildThreadResult = (
  id: string,
  hostUser: string,
  guestUser: string,
  listing?: string
): Readonly<{ _id: string; hostUser: string; guestUser: string; listing?: string }> =>
  Object.freeze({ _id: id, hostUser, guestUser, ...(listing ? { listing } : {}) })

/**
 * Filter unread users (exclude sender)
 * @pure
 */
const filterUnreadUsers = (users: ReadonlyArray<string>, senderUserId: string): ReadonlyArray<string> =>
  users.filter(id => hasData(id) && id !== senderUserId)

// ============================================
// ID GENERATION
// ============================================

/**
 * Generate a Bubble-compatible ID using the database function
 * Format: {13-digit-timestamp}x{17-digit-random}
 * Example: 1765872300914x25497779776179264
 * @effectful (database I/O, console logging)
 */
export async function generateBubbleId(supabase: SupabaseClient): Promise<string> {
  const { data, error } = await supabase.rpc('generate_bubble_id');

  if (hasError(error)) {
    console.error(`${LOG_PREFIX} Failed to generate ID:`, error);
    // Fallback: generate client-side (same format)
    return generateFallbackId();
  }

  return data;
}

// ============================================
// USER LOOKUP
// ============================================

/**
 * Get user's Bubble ID from email
 * Maps auth.users.email -> public.user._id
 * @effectful (database I/O, console logging)
 */
export async function getUserBubbleId(
  supabase: SupabaseClient,
  userEmail: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from(TABLES.USER)
    .select(USER_FIELDS.ID)
    .ilike(USER_FIELDS.EMAIL, userEmail)
    .single();

  if (hasError(error) || !hasData(data)) {
    console.error(`${LOG_PREFIX} User lookup failed:`, error?.message);
    return null;
  }

  return data._id;
}

/**
 * Get user profile by Bubble ID
 * @effectful (database I/O)
 */
export async function getUserProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<Readonly<{ _id: string; firstName: string; lastName: string; avatar?: string }> | null> {
  const { data, error } = await supabase
    .from(TABLES.USER)
    .select(`${USER_FIELDS.ID}, "${USER_FIELDS.FIRST_NAME}", "${USER_FIELDS.LAST_NAME}", "${USER_FIELDS.PROFILE_PHOTO}"`)
    .eq(USER_FIELDS.ID, userId)
    .single();

  if (hasError(error) || !hasData(data)) {
    return null;
  }

  return buildUserProfileResult(
    data._id,
    data[USER_FIELDS.FIRST_NAME] || '',
    data[USER_FIELDS.LAST_NAME] || '',
    data[USER_FIELDS.PROFILE_PHOTO]
  );
}

// ============================================
// THREAD OPERATIONS
// ============================================

export interface CreateThreadParams {
  readonly hostUserId: string;
  readonly guestUserId: string;
  readonly listingId?: string;
  readonly proposalId?: string;
  readonly subject?: string;
  readonly createdBy: string;
}

/**
 * Create a new thread (native Supabase)
 * Returns the new thread ID
 * @effectful (database I/O, console logging)
 */
export async function createThread(
  supabase: SupabaseClient,
  params: CreateThreadParams
): Promise<string> {
  const threadId = await generateBubbleId(supabase);
  const now = new Date().toISOString();

  const { error } = await supabase
    .from(TABLES.THREAD)
    .insert({
      [THREAD_FIELDS.ID]: threadId,
      [THREAD_FIELDS.HOST_USER]: params.hostUserId,
      [THREAD_FIELDS.GUEST_USER]: params.guestUserId,
      [THREAD_FIELDS.LISTING]: params.listingId || null,
      [THREAD_FIELDS.PROPOSAL]: params.proposalId || null,
      [THREAD_FIELDS.SUBJECT]: params.subject || null,
      [THREAD_FIELDS.CREATED_BY]: params.createdBy,
      [THREAD_FIELDS.CREATED_DATE]: now,
      [THREAD_FIELDS.MODIFIED_DATE]: now,
      [THREAD_FIELDS.PARTICIPANTS]: [params.hostUserId, params.guestUserId],
      [THREAD_FIELDS.FROM_LOGGED_OUT]: false,
      created_at: now,
      updated_at: now,
    });

  if (hasError(error)) {
    console.error(`${LOG_PREFIX} Failed to create thread:`, error);
    throw new Error(`Failed to create thread: ${error.message}`);
  }

  // Junction tables (thread_participant) are now auto-populated by database trigger
  // trigger_populate_thread_participant_junction handles this automatically on thread INSERT

  console.log(`${LOG_PREFIX} Created thread:`, threadId);
  return threadId;
}

/**
 * Find existing thread between two users for a listing
 * Returns thread ID if found, null otherwise
 * @effectful (database I/O, console logging)
 */
export async function findExistingThread(
  supabase: SupabaseClient,
  hostUserId: string,
  guestUserId: string,
  listingId?: string
): Promise<string | null> {
  let query = supabase
    .from(TABLES.THREAD)
    .select(THREAD_FIELDS.ID)
    .eq(`"${THREAD_FIELDS.HOST_USER}"`, hostUserId)
    .eq(`"${THREAD_FIELDS.GUEST_USER}"`, guestUserId);

  if (hasData(listingId)) {
    query = query.eq(`"${THREAD_FIELDS.LISTING}"`, listingId);
  }

  const { data, error } = await query.limit(1).maybeSingle();

  if (hasError(error)) {
    console.error(`${LOG_PREFIX} Thread lookup error:`, error);
    return null;
  }

  return data?._id || null;
}

/**
 * Get thread by ID with participant info
 * @effectful (database I/O)
 */
export async function getThread(
  supabase: SupabaseClient,
  threadId: string
): Promise<Readonly<{ _id: string; hostUser: string; guestUser: string; listing?: string }> | null> {
  const { data, error } = await supabase
    .from(TABLES.THREAD)
    .select(`${THREAD_FIELDS.ID}, "${THREAD_FIELDS.HOST_USER}", "${THREAD_FIELDS.GUEST_USER}", "${THREAD_FIELDS.LISTING}"`)
    .eq(THREAD_FIELDS.ID, threadId)
    .single();

  if (hasError(error) || !hasData(data)) {
    return null;
  }

  return buildThreadResult(
    data._id,
    data[THREAD_FIELDS.HOST_USER],
    data[THREAD_FIELDS.GUEST_USER],
    data[THREAD_FIELDS.LISTING]
  );
}

// ============================================
// MESSAGE OPERATIONS
// ============================================

export interface CreateMessageParams {
  readonly threadId: string;
  readonly messageBody: string;
  readonly senderUserId: string;
  readonly isSplitBot?: boolean;
  readonly callToAction?: string;
  readonly splitBotWarning?: string;
  readonly visibleToHost?: boolean;
  readonly visibleToGuest?: boolean;
}

/**
 * Create a new message (native Supabase)
 * The database trigger will automatically:
 * 1. Broadcast to Realtime channel
 * 2. Update thread's last message
 *
 * Returns the new message ID
 * @effectful (database I/O, console logging)
 */
export async function createMessage(
  supabase: SupabaseClient,
  params: CreateMessageParams
): Promise<string> {
  const messageId = await generateBubbleId(supabase);
  const now = new Date().toISOString();

  // Get thread info to determine host/guest
  const thread = await getThread(supabase, params.threadId);

  if (!hasData(thread)) {
    throw new Error('Thread not found');
  }

  // Determine unread users (everyone except sender)
  const unreadUsers = filterUnreadUsers(
    [thread.hostUser, thread.guestUser],
    params.senderUserId
  );

  const { error } = await supabase
    .from(TABLES.MESSAGE)
    .insert({
      [MESSAGE_FIELDS.ID]: messageId,
      [MESSAGE_FIELDS.THREAD]: params.threadId,
      [MESSAGE_FIELDS.BODY]: params.messageBody,
      [MESSAGE_FIELDS.ORIGINATOR]: params.senderUserId,
      [MESSAGE_FIELDS.HOST_USER]: thread.hostUser,
      [MESSAGE_FIELDS.GUEST_USER]: thread.guestUser,
      [MESSAGE_FIELDS.IS_SPLIT_BOT]: params.isSplitBot || false,
      [MESSAGE_FIELDS.VISIBLE_TO_HOST]: params.visibleToHost ?? true,
      [MESSAGE_FIELDS.VISIBLE_TO_GUEST]: params.visibleToGuest ?? true,
      [MESSAGE_FIELDS.IS_FORWARDED]: false,
      [MESSAGE_FIELDS.IS_DELETED]: false,
      [MESSAGE_FIELDS.CALL_TO_ACTION]: params.callToAction || null,
      [MESSAGE_FIELDS.SPLIT_BOT_WARNING]: params.splitBotWarning || null,
      [MESSAGE_FIELDS.UNREAD_USERS]: unreadUsers,
      [MESSAGE_FIELDS.CREATED_DATE]: now,
      [MESSAGE_FIELDS.MODIFIED_DATE]: now,
      [MESSAGE_FIELDS.CREATED_BY]: params.senderUserId,
      created_at: now,
      updated_at: now,
      pending: false,
    });

  if (hasError(error)) {
    console.error(`${LOG_PREFIX} Failed to create message:`, error);
    throw new Error(`Failed to create message: ${error.message}`);
  }

  console.log(`${LOG_PREFIX} Created message:`, messageId);
  return messageId;
}

/**
 * Mark messages as read by removing user from Unread Users
 * @effectful (database I/O)
 */
export async function markMessagesAsRead(
  supabase: SupabaseClient,
  messageIds: ReadonlyArray<string>,
  userId: string
): Promise<void> {
  for (const messageId of messageIds) {
    const { data: message } = await supabase
      .from(TABLES.MESSAGE)
      .select(`"${MESSAGE_FIELDS.UNREAD_USERS}"`)
      .eq(MESSAGE_FIELDS.ID, messageId)
      .single();

    if (hasData(message) && Array.isArray(message[MESSAGE_FIELDS.UNREAD_USERS])) {
      const updatedUnread = message[MESSAGE_FIELDS.UNREAD_USERS].filter((id: string) => id !== userId);

      await supabase
        .from(TABLES.MESSAGE)
        .update({ [MESSAGE_FIELDS.UNREAD_USERS]: updatedUnread })
        .eq(MESSAGE_FIELDS.ID, messageId);
    }
  }
}

/**
 * Get unread message count for a user in a thread
 * @effectful (database I/O, console logging)
 */
export async function getUnreadCount(
  supabase: SupabaseClient,
  threadId: string,
  userId: string
): Promise<number> {
  const { count, error } = await supabase
    .from(TABLES.MESSAGE)
    .select('*', { count: 'exact', head: true })
    .eq(`"${MESSAGE_FIELDS.THREAD}"`, threadId)
    .contains(`"${MESSAGE_FIELDS.UNREAD_USERS}"`, [userId]);

  if (hasError(error)) {
    console.error(`${LOG_PREFIX} Failed to get unread count:`, error);
    return 0;
  }

  return count || 0;
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
  RANDOM_ID_LENGTH,
  RANDOM_ID_MAX,
  TABLES,
  THREAD_FIELDS,
  MESSAGE_FIELDS,
  USER_FIELDS,

  // Validation predicates
  hasError,
  hasData,
  hasItems,

  // ID generation helpers
  generateFallbackId,

  // Result builders
  buildUserProfileResult,
  buildThreadResult,
  filterUnreadUsers,
})
