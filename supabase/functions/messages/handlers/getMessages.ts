/**
 * Get Messages Handler
 * Split Lease - Messages Edge Function
 *
 * Fetches messages for a specific thread
 * Filters by visibility based on user type (host/guest)
 * Marks messages as read by removing user from unread_users
 *
 * NO FALLBACK PRINCIPLE: Throws if database query fails
 *
 * FP PATTERN: Separates pure data builders from effectful database operations
 * All data transformations are pure with @pure annotations
 * All database operations are explicit with @effectful annotations
 *
 * @module messages/handlers/getMessages
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { User } from 'https://esm.sh/@supabase/supabase-js@2';
import { ValidationError } from '../../_shared/errors.ts';
import { validateRequiredFields } from '../../_shared/validation.ts';

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const LOG_PREFIX = '[messages:getMessages]'
const DEFAULT_LIMIT = 50
const DEFAULT_OFFSET = 0

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface Message {
  readonly _id: string;
  readonly message_body: string;
  readonly sender_name: string;
  readonly sender_avatar?: string;
  readonly sender_type: 'guest' | 'host' | 'splitbot';
  readonly is_outgoing: boolean;
  readonly timestamp: string;
  readonly call_to_action?: Readonly<{
    type: string;
    message: string;
    link?: string;
  }>;
  readonly split_bot_warning?: string;
}

interface ThreadInfo {
  readonly contact_name: string;
  readonly contact_avatar?: string;
  readonly property_name?: string;
  readonly status?: string;
  readonly status_type?: string;
}

interface GetMessagesPayload {
  readonly thread_id: string;
  readonly limit?: number;
  readonly offset?: number;
}

interface GetMessagesResult {
  readonly messages: readonly Message[];
  readonly has_more: boolean;
  readonly thread_info: ThreadInfo;
}

interface SenderInfo {
  readonly name: string;
  readonly avatar?: string;
}

interface RawMessage {
  readonly _id: string;
  readonly 'Message Body': string | null;
  readonly 'Created Date': string | null;
  readonly '-Originator User': string | null;
  readonly 'is Visible to Guest': boolean;
  readonly 'is Visible to Host': boolean;
  readonly 'is Split Bot': boolean;
  readonly 'Split Bot Warning': string | null;
  readonly 'Call to Action': string | null;
}

interface ThreadData {
  readonly _id: string;
  readonly '-Host User': string | null;
  readonly '-Guest User': string | null;
  readonly 'Listing': string | null;
  readonly 'Proposal': string | null;
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
 * Check if user is participant in thread
 * @pure
 */
const isThreadParticipant = (
  userBubbleId: string,
  threadHost: string | null,
  threadGuest: string | null
): boolean =>
  threadHost === userBubbleId || threadGuest === userBubbleId

/**
 * Check if user is host in thread
 * @pure
 */
const isHostInThread = (userBubbleId: string, threadHost: string | null): boolean =>
  threadHost === userBubbleId

// ─────────────────────────────────────────────────────────────
// Pure Data Transformations
// ─────────────────────────────────────────────────────────────

/**
 * Format timestamp for display
 * @pure
 */
const formatTimestamp = (dateStr: string | null): string => {
  const date = dateStr ? new Date(dateStr) : new Date()
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/**
 * Determine sender type from message context
 * @pure
 */
const determineSenderType = (
  isSplitBot: boolean,
  senderId: string | null,
  threadHost: string | null
): 'guest' | 'host' | 'splitbot' => {
  if (isSplitBot) return 'splitbot'
  if (senderId === threadHost) return 'host'
  return 'guest'
}

/**
 * Map proposal status to status type for styling
 * @pure
 */
const mapStatusToType = (status: string | null | undefined): string | undefined => {
  if (!status) return undefined
  if (status.includes('Declined') || status.includes('Cancelled')) return 'declined'
  if (status.includes('Accepted') || status.includes('Approved')) return 'accepted'
  if (status.includes('Pending')) return 'pending'
  return undefined
}

/**
 * Build sender map from sender data
 * @pure
 */
const buildSenderMap = (
  senders: readonly { _id: string; 'Name - First': string | null; 'Name - Last': string | null; 'Profile Photo': string | null }[]
): Readonly<Record<string, SenderInfo>> => {
  const map: Record<string, SenderInfo> = {}
  for (const sender of senders) {
    const firstName = sender['Name - First'] || ''
    const lastName = sender['Name - Last'] || ''
    map[sender._id] = Object.freeze({
      name: `${firstName} ${lastName}`.trim() || 'Unknown',
      avatar: sender['Profile Photo'] ?? undefined,
    })
  }
  return Object.freeze(map)
}

/**
 * Transform raw message to response format
 * @pure
 */
const transformMessage = (
  msg: RawMessage,
  senderMap: Readonly<Record<string, SenderInfo>>,
  userBubbleId: string,
  threadHost: string | null
): Message => {
  const senderId = msg['-Originator User']
  const sender = senderId ? senderMap[senderId] : null
  const isOutgoing = senderId === userBubbleId
  const isSplitBot = msg['is Split Bot'] === true

  const callToAction = msg['Call to Action']
    ? Object.freeze({
        type: msg['Call to Action'],
        message: 'View Details',
      })
    : undefined

  return Object.freeze({
    _id: msg._id,
    message_body: msg['Message Body'] || '',
    sender_name: isSplitBot ? 'Split Bot' : (sender?.name || 'Unknown'),
    sender_avatar: isSplitBot ? undefined : sender?.avatar,
    sender_type: determineSenderType(isSplitBot, senderId, threadHost),
    is_outgoing: isOutgoing,
    timestamp: formatTimestamp(msg['Created Date']),
    call_to_action: callToAction,
    split_bot_warning: msg['Split Bot Warning'] ?? undefined,
  })
}

/**
 * Build response object
 * @pure
 */
const buildResponse = (
  messages: readonly Message[],
  hasMore: boolean,
  threadInfo: ThreadInfo
): GetMessagesResult =>
  Object.freeze({
    messages,
    has_more: hasMore,
    thread_info: Object.freeze(threadInfo),
  })

// ─────────────────────────────────────────────────────────────
// Database Query Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Fetch user's Bubble ID by email
 * @effectful - Database read operation
 */
const fetchUserBubbleId = async (
  supabase: SupabaseClient,
  email: string
): Promise<{ bubbleId: string; userType: string }> => {
  const { data, error } = await supabase
    .from('user')
    .select('_id, "Type - User Current"')
    .ilike('email', email)
    .single()

  if (error || !data?._id) {
    console.error(`${LOG_PREFIX} User lookup failed:`, error?.message)
    throw new ValidationError('Could not find user profile. Please try logging in again.')
  }

  return {
    bubbleId: data._id,
    userType: data['Type - User Current'] || '',
  }
}

/**
 * Fetch thread data
 * @effectful - Database read operation
 */
const fetchThread = async (
  supabase: SupabaseClient,
  threadId: string
): Promise<ThreadData> => {
  const { data, error } = await supabase
    .from('thread')
    .select(`
      _id,
      "-Host User",
      "-Guest User",
      "Listing",
      "Proposal"
    `)
    .eq('_id', threadId)
    .single()

  if (error || !data) {
    console.error(`${LOG_PREFIX} Thread lookup failed:`, error)
    throw new ValidationError('Thread not found')
  }

  return data as ThreadData
}

/**
 * Fetch messages for thread with visibility filter
 * @effectful - Database read operation
 */
const fetchMessages = async (
  supabase: SupabaseClient,
  threadId: string,
  isHost: boolean,
  limit: number,
  offset: number
): Promise<readonly RawMessage[]> => {
  let query = supabase
    .from('_message')
    .select(`
      _id,
      "Message Body",
      "Created Date",
      "-Originator User",
      "is Visible to Guest",
      "is Visible to Host",
      "is Split Bot",
      "Split Bot Warning",
      "Call to Action"
    `)
    .eq('"Associated Thread/Conversation"', threadId)
    .order('"Created Date"', { ascending: true })

  // Apply visibility filter
  if (isHost) {
    query = query.eq('"is Visible to Host"', true)
  } else {
    query = query.eq('"is Visible to Guest"', true)
  }

  // Apply pagination
  query = query.range(offset, offset + limit)

  const { data, error } = await query

  if (error) {
    console.error(`${LOG_PREFIX} Messages query failed:`, error)
    throw new Error(`Failed to fetch messages: ${error.message}`)
  }

  return (data || []) as readonly RawMessage[]
}

/**
 * Fetch sender info for message senders
 * @effectful - Database read operation
 */
const fetchSenderInfo = async (
  supabase: SupabaseClient,
  senderIds: readonly string[]
): Promise<Readonly<Record<string, SenderInfo>>> => {
  if (senderIds.length === 0) return Object.freeze({})

  const { data, error } = await supabase
    .from('user')
    .select('_id, "Name - First", "Name - Last", "Profile Photo"')
    .in('_id', [...senderIds])

  if (error || !data) {
    console.warn(`${LOG_PREFIX} Sender lookup failed:`, error?.message)
    return Object.freeze({})
  }

  return buildSenderMap(data)
}

/**
 * Fetch contact info for thread header
 * @effectful - Database read operation
 */
const fetchContactInfo = async (
  supabase: SupabaseClient,
  contactId: string | null
): Promise<SenderInfo> => {
  if (!contactId) return Object.freeze({ name: 'Split Lease' })

  const { data, error } = await supabase
    .from('user')
    .select('"Name - First", "Name - Last", "Profile Photo"')
    .eq('_id', contactId)
    .single()

  if (error || !data) {
    return Object.freeze({ name: 'Unknown User' })
  }

  const firstName = data['Name - First'] || ''
  const lastName = data['Name - Last'] || ''

  return Object.freeze({
    name: `${firstName} ${lastName}`.trim() || 'Unknown User',
    avatar: data['Profile Photo'] ?? undefined,
  })
}

/**
 * Fetch listing name
 * @effectful - Database read operation
 */
const fetchListingName = async (
  supabase: SupabaseClient,
  listingId: string | null
): Promise<string | undefined> => {
  if (!listingId) return undefined

  const { data, error } = await supabase
    .from('listing')
    .select('Name')
    .eq('_id', listingId)
    .single()

  if (error || !data) return undefined
  return data.Name ?? undefined
}

/**
 * Fetch proposal status
 * @effectful - Database read operation
 */
const fetchProposalStatus = async (
  supabase: SupabaseClient,
  proposalId: string | null
): Promise<{ status?: string; statusType?: string }> => {
  if (!proposalId) return {}

  const { data, error } = await supabase
    .from('proposal')
    .select('"Proposal Status"')
    .eq('_id', proposalId)
    .single()

  if (error || !data) return {}

  const status = data['Proposal Status'] ?? undefined
  return {
    status,
    statusType: mapStatusToType(status),
  }
}

/**
 * Get total message count for thread
 * @effectful - Database read operation
 */
const fetchMessageCount = async (
  supabase: SupabaseClient,
  threadId: string
): Promise<number> => {
  const { count } = await supabase
    .from('_message')
    .select('*', { count: 'exact', head: true })
    .eq('"Associated Thread/Conversation"', threadId)

  return count ?? 0
}

/**
 * Mark messages as read by removing user from unread list
 * @effectful - Database write operation (fire-and-forget)
 */
const markMessagesAsRead = async (
  supabase: SupabaseClient,
  messageIds: readonly string[],
  userBubbleId: string
): Promise<void> => {
  if (messageIds.length === 0) return

  const { data: unreadMessages, error } = await supabase
    .from('_message')
    .select('_id, "Unread Users"')
    .in('_id', [...messageIds])

  if (error || !unreadMessages) return

  for (const msg of unreadMessages) {
    const unreadUsers = msg['Unread Users'] || []
    if (Array.isArray(unreadUsers) && unreadUsers.includes(userBubbleId)) {
      const updatedUnread = unreadUsers.filter((id: string) => id !== userBubbleId)
      await supabase
        .from('_message')
        .update({ "Unread Users": updatedUnread })
        .eq('_id', msg._id)
    }
  }
}

// ─────────────────────────────────────────────────────────────
// Main Handler
// ─────────────────────────────────────────────────────────────

/**
 * Handle get_messages action
 * Fetches messages for a specific thread and marks them as read
 * @effectful - Orchestrates database operations
 */
export async function handleGetMessages(
  supabaseAdmin: SupabaseClient,
  payload: Record<string, unknown>,
  user: User
): Promise<GetMessagesResult> {
  console.log(`${LOG_PREFIX} ========== GET MESSAGES ==========`)
  console.log(`${LOG_PREFIX} User:`, user.email)

  // ================================================
  // VALIDATION
  // ================================================

  const typedPayload = payload as unknown as GetMessagesPayload
  validateRequiredFields(typedPayload, ['thread_id'])

  const { thread_id, limit = DEFAULT_LIMIT, offset = DEFAULT_OFFSET } = typedPayload

  if (!hasValidEmail(user)) {
    console.error(`${LOG_PREFIX} No email in auth token`)
    throw new ValidationError('Could not find user profile. Please try logging in again.')
  }

  // ================================================
  // FETCH USER DATA
  // ================================================

  const { bubbleId: userBubbleId } = await fetchUserBubbleId(supabaseAdmin, user.email)
  console.log(`${LOG_PREFIX} Found user by email, Bubble ID: ${userBubbleId}`)

  // ================================================
  // FETCH THREAD
  // ================================================

  const thread = await fetchThread(supabaseAdmin, thread_id)
  const threadHost = thread['-Host User']
  const threadGuest = thread['-Guest User']

  // Verify user has access to this thread
  if (!isThreadParticipant(userBubbleId, threadHost, threadGuest)) {
    console.error(`${LOG_PREFIX} User not participant in thread`)
    throw new ValidationError('You do not have access to this conversation')
  }

  // Determine if user is host or guest in this thread
  const userIsHost = isHostInThread(userBubbleId, threadHost)
  const contactId = userIsHost ? threadGuest : threadHost

  // ================================================
  // FETCH MESSAGES
  // ================================================

  const messages = await fetchMessages(supabaseAdmin, thread_id, userIsHost, limit, offset)
  console.log(`${LOG_PREFIX} Found ${messages.length} messages`)

  // ================================================
  // FETCH RELATED DATA (parallel)
  // ================================================

  // Collect sender IDs
  const senderIds = [...new Set(
    messages
      .map(msg => msg['-Originator User'])
      .filter((id): id is string => id !== null)
  )]

  const [senderMap, contactInfo, propertyName, proposalData, totalCount] = await Promise.all([
    fetchSenderInfo(supabaseAdmin, senderIds),
    fetchContactInfo(supabaseAdmin, contactId),
    fetchListingName(supabaseAdmin, thread['Listing']),
    fetchProposalStatus(supabaseAdmin, thread['Proposal']),
    fetchMessageCount(supabaseAdmin, thread_id),
  ])

  // ================================================
  // TRANSFORM MESSAGES
  // ================================================

  const transformedMessages = messages.map(msg =>
    transformMessage(msg, senderMap, userBubbleId, threadHost)
  )

  // ================================================
  // MARK AS READ (fire-and-forget)
  // ================================================

  const messageIds = messages.map(m => m._id)
  markMessagesAsRead(supabaseAdmin, messageIds, userBubbleId)

  // ================================================
  // BUILD RESPONSE
  // ================================================

  const hasMore = (offset + limit) < totalCount

  console.log(`${LOG_PREFIX} Transformed ${transformedMessages.length} messages`)
  console.log(`${LOG_PREFIX} ========== GET MESSAGES COMPLETE ==========`)

  return buildResponse(
    transformedMessages,
    hasMore,
    {
      contact_name: contactInfo.name,
      contact_avatar: contactInfo.avatar,
      property_name: propertyName,
      status: proposalData.status,
      status_type: proposalData.statusType,
    }
  )
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
  DEFAULT_LIMIT,
  DEFAULT_OFFSET,

  // Validation Predicates
  hasValidEmail,
  isThreadParticipant,
  isHostInThread,

  // Pure Data Transformations
  formatTimestamp,
  determineSenderType,
  mapStatusToType,
  buildSenderMap,
  transformMessage,
  buildResponse,

  // Database Query Helpers
  fetchUserBubbleId,
  fetchThread,
  fetchMessages,
  fetchSenderInfo,
  fetchContactInfo,
  fetchListingName,
  fetchProposalStatus,
  fetchMessageCount,
  markMessagesAsRead,

  // Main Handler
  handleGetMessages,
})
