/**
 * Get Messages Handler
 * Split Lease - Messages Edge Function
 *
 * Fetches messages for a specific thread
 * Filters by visibility based on user type (host/guest)
 * Marks messages as read by removing user from unread_users
 *
 * NO FALLBACK PRINCIPLE: Throws if database query fails
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { User } from 'https://esm.sh/@supabase/supabase-js@2';
import { ValidationError } from '../../_shared/errors.ts';
import { validateRequiredFields } from '../../_shared/validation.ts';

interface Message {
  _id: string;
  message_body: string;
  sender_name: string;
  sender_avatar?: string;
  sender_type: 'guest' | 'host' | 'splitbot';
  is_outgoing: boolean;
  timestamp: string;
  call_to_action?: {
    type: string;
    message: string;
    link?: string;
  };
  split_bot_warning?: string;
}

interface ThreadInfo {
  contact_name: string;
  contact_avatar?: string;
  property_name?: string;
  status?: string;
  status_type?: string;
}

interface GetMessagesPayload {
  thread_id: string;
  limit?: number;
  offset?: number;
}

interface GetMessagesResult {
  messages: Message[];
  has_more: boolean;
  thread_info: ThreadInfo;
}

/**
 * Handle get_messages action
 * Fetches messages for a specific thread and marks them as read
 */
export async function handleGetMessages(
  supabaseAdmin: SupabaseClient,
  payload: Record<string, unknown>,
  user: User
): Promise<GetMessagesResult> {
  console.log('[getMessages] ========== GET MESSAGES ==========');
  console.log('[getMessages] User:', user.email);
  console.log('[getMessages] Payload:', JSON.stringify(payload, null, 2));

  // Validate required fields
  const typedPayload = payload as unknown as GetMessagesPayload;
  validateRequiredFields(typedPayload, ['thread_id']);

  const { thread_id, limit = 50, offset = 0 } = typedPayload;

  // Get user's Bubble ID from public.user table by email
  // Email is the common identifier between auth.users and public.user
  if (!user.email) {
    console.error('[getMessages] No email in auth token');
    throw new ValidationError('Could not find user profile. Please try logging in again.');
  }

  const { data: userData, error: userError } = await supabaseAdmin
    .from('user')
    .select('_id, "User Type"')
    .ilike('email', user.email)
    .single();

  if (userError || !userData?._id) {
    console.error('[getMessages] User lookup failed:', userError?.message);
    throw new ValidationError('Could not find user profile. Please try logging in again.');
  }
  console.log('[getMessages] Found user by email');

  const userBubbleId = userData._id;
  const userType = userData['User Type'] || '';
  const isHost = userType.includes('Host');
  console.log('[getMessages] User Bubble ID:', userBubbleId);
  console.log('[getMessages] Is Host:', isHost);

  // Verify user has access to this thread
  const { data: thread, error: threadError } = await supabaseAdmin
    .from('thread_conversation')
    .select(`
      _id,
      host,
      guest,
      listing,
      proposal
    `)
    .eq('_id', thread_id)
    .single();

  if (threadError || !thread) {
    console.error('[getMessages] Thread lookup failed:', threadError);
    throw new ValidationError('Thread not found');
  }

  // Check user is participant in thread
  if (thread.host !== userBubbleId && thread.guest !== userBubbleId) {
    console.error('[getMessages] User not participant in thread');
    throw new ValidationError('You do not have access to this conversation');
  }

  // Determine if user is host or guest in this thread
  const isHostInThread = thread.host === userBubbleId;
  const contactId = isHostInThread ? thread.guest : thread.host;

  // Fetch messages for this thread
  // Filter by visibility based on user role in thread
  let query = supabaseAdmin
    .from('message')
    .select(`
      _id,
      "Message body",
      "Created Date",
      sender,
      "is visible to guest",
      "is visible to host",
      "Sender type",
      "Split bot warning",
      "call to action",
      "call to action message",
      "call to action link"
    `)
    .eq('thread_conversation', thread_id)
    .order('"Created Date"', { ascending: true });

  // Apply visibility filter
  if (isHostInThread) {
    query = query.eq('"is visible to host"', true);
  } else {
    query = query.eq('"is visible to guest"', true);
  }

  // Apply pagination
  query = query.range(offset, offset + limit);

  const { data: messages, error: messagesError } = await query;

  if (messagesError) {
    console.error('[getMessages] Messages query failed:', messagesError);
    throw new Error(`Failed to fetch messages: ${messagesError.message}`);
  }

  console.log('[getMessages] Found', messages?.length || 0, 'messages');

  // Collect all sender IDs for batch lookup
  const senderIds = new Set<string>();
  messages?.forEach(msg => {
    if (msg.sender) senderIds.add(msg.sender);
  });

  // Batch fetch sender user data
  let senderMap: Record<string, { name: string; avatar?: string }> = {};
  if (senderIds.size > 0) {
    const { data: senders, error: sendersError } = await supabaseAdmin
      .from('user')
      .select('_id, "First Name", "Last Name", "Profile Photo"')
      .in('_id', Array.from(senderIds));

    if (!sendersError && senders) {
      senderMap = senders.reduce((acc, sender) => {
        acc[sender._id] = {
          name: `${sender['First Name'] || ''} ${sender['Last Name'] || ''}`.trim() || 'Unknown',
          avatar: sender['Profile Photo'],
        };
        return acc;
      }, {} as Record<string, { name: string; avatar?: string }>);
    }
  }

  // Fetch contact info for thread header
  let contactInfo: { name: string; avatar?: string } = { name: 'Split Lease' };
  if (contactId) {
    const { data: contact, error: contactError } = await supabaseAdmin
      .from('user')
      .select('"First Name", "Last Name", "Profile Photo"')
      .eq('_id', contactId)
      .single();

    if (!contactError && contact) {
      contactInfo = {
        name: `${contact['First Name'] || ''} ${contact['Last Name'] || ''}`.trim() || 'Unknown User',
        avatar: contact['Profile Photo'],
      };
    }
  }

  // Fetch listing name if present
  let propertyName: string | undefined;
  if (thread.listing) {
    const { data: listing, error: listingError } = await supabaseAdmin
      .from('listing')
      .select('Name')
      .eq('_id', thread.listing)
      .single();

    if (!listingError && listing) {
      propertyName = listing.Name;
    }
  }

  // Fetch proposal status if present
  let proposalStatus: string | undefined;
  let statusType: string | undefined;
  if (thread.proposal) {
    const { data: proposal, error: proposalError } = await supabaseAdmin
      .from('proposal')
      .select('"Proposal Status"')
      .eq('_id', thread.proposal)
      .single();

    if (!proposalError && proposal) {
      proposalStatus = proposal['Proposal Status'];
      // Map status to type for styling
      if (proposalStatus?.includes('Declined') || proposalStatus?.includes('Cancelled')) {
        statusType = 'declined';
      } else if (proposalStatus?.includes('Accepted') || proposalStatus?.includes('Approved')) {
        statusType = 'accepted';
      } else if (proposalStatus?.includes('Pending')) {
        statusType = 'pending';
      }
    }
  }

  // Transform messages to response format
  const transformedMessages: Message[] = (messages || []).map(msg => {
    const sender = msg.sender ? senderMap[msg.sender] : null;
    const isOutgoing = msg.sender === userBubbleId;
    const isSplitBot = msg['Sender type'] === 'splitbot' || msg['Sender type'] === 'Split Bot';

    // Determine sender type
    let senderType: 'guest' | 'host' | 'splitbot';
    if (isSplitBot) {
      senderType = 'splitbot';
    } else if (msg.sender === thread.host) {
      senderType = 'host';
    } else {
      senderType = 'guest';
    }

    // Format timestamp
    const createdDate = msg['Created Date'] ? new Date(msg['Created Date']) : new Date();
    const timestamp = createdDate.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });

    // Build call to action if present
    let callToAction: Message['call_to_action'];
    if (msg['call to action'] || msg['call to action message']) {
      callToAction = {
        type: msg['call to action'] || 'action',
        message: msg['call to action message'] || 'View Details',
        link: msg['call to action link'],
      };
    }

    return {
      _id: msg._id,
      message_body: msg['Message body'] || '',
      sender_name: isSplitBot ? 'Split Bot' : (sender?.name || 'Unknown'),
      sender_avatar: isSplitBot ? undefined : sender?.avatar,
      sender_type: senderType,
      is_outgoing: isOutgoing,
      timestamp,
      call_to_action: callToAction,
      split_bot_warning: msg['Split bot warning'],
    };
  });

  // Mark messages as read by removing user from unread_users
  // This is a fire-and-forget operation
  if (messages && messages.length > 0) {
    const messageIds = messages.map(m => m._id);

    // Get messages with unread_users containing this user
    const { data: unreadMessages, error: unreadError } = await supabaseAdmin
      .from('message')
      .select('_id, unread_users')
      .in('_id', messageIds);

    if (!unreadError && unreadMessages) {
      for (const msg of unreadMessages) {
        const unreadUsers = msg.unread_users || [];
        if (Array.isArray(unreadUsers) && unreadUsers.includes(userBubbleId)) {
          // Remove user from unread list
          const updatedUnread = unreadUsers.filter((id: string) => id !== userBubbleId);
          await supabaseAdmin
            .from('message')
            .update({ unread_users: updatedUnread })
            .eq('_id', msg._id);
        }
      }
    }
  }

  // Check if there are more messages
  const { count: totalCount } = await supabaseAdmin
    .from('message')
    .select('*', { count: 'exact', head: true })
    .eq('thread_conversation', thread_id);

  const hasMore = totalCount ? (offset + limit) < totalCount : false;

  console.log('[getMessages] Transformed', transformedMessages.length, 'messages');
  console.log('[getMessages] ========== GET MESSAGES COMPLETE ==========');

  return {
    messages: transformedMessages,
    has_more: hasMore,
    thread_info: {
      contact_name: contactInfo.name,
      contact_avatar: contactInfo.avatar,
      property_name: propertyName,
      status: proposalStatus,
      status_type: statusType,
    },
  };
}
