/**
 * Get Threads Handler
 * Split Lease - Messages Edge Function
 *
 * Fetches all message threads for the authenticated user
 * Returns threads where user is either host or guest
 *
 * NO FALLBACK PRINCIPLE: Throws if database query fails
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { User } from 'https://esm.sh/@supabase/supabase-js@2';
import { ValidationError } from '../../_shared/errors.ts';

interface Thread {
  _id: string;
  contact_name: string;
  contact_avatar?: string;
  property_name?: string;
  last_message_preview: string;
  last_message_time: string;
  unread_count: number;
  is_with_splitbot: boolean;
}

interface GetThreadsResult {
  threads: Thread[];
  total_count: number;
}

/**
 * Handle get_threads action
 * Fetches all conversation threads for authenticated user
 */
export async function handleGetThreads(
  supabaseAdmin: SupabaseClient,
  payload: Record<string, unknown>,
  user: User
): Promise<GetThreadsResult> {
  console.log('[getThreads] ========== GET THREADS ==========');
  console.log('[getThreads] User:', user.email);

  // Get user's Bubble ID from JWT metadata (set during login via auth-user Edge Function)
  // This avoids querying public.user table which may not have the user yet
  const userBubbleId = user.user_metadata?.user_id;

  if (!userBubbleId) {
    console.error('[getThreads] No Bubble user_id in JWT metadata');
    console.error('[getThreads] user_metadata:', JSON.stringify(user.user_metadata));
    throw new ValidationError('Could not find user profile. Please try logging in again.');
  }

  console.log('[getThreads] User Bubble ID (from JWT):', userBubbleId);

  // Step 1: Query junction table to get user's thread IDs
  const { data: userThreadLinks, error: junctionError } = await supabaseAdmin
    .from('user_thread')
    .select('thread_id, role')
    .eq('user_id', userBubbleId);

  if (junctionError) {
    console.error('[getThreads] Junction query failed:', junctionError);
    throw new Error(`Failed to fetch user threads: ${junctionError.message}`);
  }

  if (!userThreadLinks || userThreadLinks.length === 0) {
    console.log('[getThreads] No threads found for user in junction table');
    return {
      threads: [],
      total_count: 0,
    };
  }

  const threadIds = userThreadLinks.map(link => link.thread_id);
  console.log('[getThreads] Found', threadIds.length, 'thread links in junction table');

  // Step 2: Fetch full thread details using the thread IDs
  const { data: threads, error: threadsError } = await supabaseAdmin
    .from('thread_conversation')
    .select(`
      _id,
      "Modified Date",
      host,
      guest,
      proposal,
      listing,
      "last message",
      "split bot only"
    `)
    .in('_id', threadIds)
    .order('"Modified Date"', { ascending: false });

  if (threadsError) {
    console.error('[getThreads] Threads query failed:', threadsError);
    throw new Error(`Failed to fetch threads: ${threadsError.message}`);
  }

  if (!threads || threads.length === 0) {
    console.log('[getThreads] No thread details found (threads may have been deleted)');
    return {
      threads: [],
      total_count: 0,
    };
  }

  console.log('[getThreads] Found', threads.length, 'threads with details');

  // Collect all unique user IDs and listing IDs for batch lookup
  const contactIds = new Set<string>();
  const listingIds = new Set<string>();

  threads.forEach(thread => {
    // Contact is the other person in the thread
    const contactId = thread.host === userBubbleId ? thread.guest : thread.host;
    if (contactId) contactIds.add(contactId);
    if (thread.listing) listingIds.add(thread.listing);
  });

  // Batch fetch contact user data
  let contactMap: Record<string, { name: string; avatar?: string }> = {};
  if (contactIds.size > 0) {
    const { data: contacts, error: contactsError } = await supabaseAdmin
      .from('user')
      .select('_id, "First Name", "Last Name", "Profile Photo"')
      .in('_id', Array.from(contactIds));

    if (!contactsError && contacts) {
      contactMap = contacts.reduce((acc, contact) => {
        acc[contact._id] = {
          name: `${contact['First Name'] || ''} ${contact['Last Name'] || ''}`.trim() || 'Unknown User',
          avatar: contact['Profile Photo'],
        };
        return acc;
      }, {} as Record<string, { name: string; avatar?: string }>);
    }
  }

  // Batch fetch listing data
  let listingMap: Record<string, string> = {};
  if (listingIds.size > 0) {
    const { data: listings, error: listingsError } = await supabaseAdmin
      .from('listing')
      .select('_id, Name')
      .in('_id', Array.from(listingIds));

    if (!listingsError && listings) {
      listingMap = listings.reduce((acc, listing) => {
        acc[listing._id] = listing.Name || 'Unnamed Property';
        return acc;
      }, {} as Record<string, string>);
    }
  }

  // Fetch unread message counts per thread
  const threadIds = threads.map(t => t._id);
  let unreadMap: Record<string, number> = {};

  // Query messages where user is in unread_users list
  const { data: unreadMessages, error: unreadError } = await supabaseAdmin
    .from('message')
    .select('thread_conversation, unread_users')
    .in('thread_conversation', threadIds);

  if (!unreadError && unreadMessages) {
    unreadMessages.forEach(msg => {
      // unread_users is an array of user IDs who haven't read this message
      const unreadUsers = msg.unread_users || [];
      if (Array.isArray(unreadUsers) && unreadUsers.includes(userBubbleId)) {
        const threadId = msg.thread_conversation;
        unreadMap[threadId] = (unreadMap[threadId] || 0) + 1;
      }
    });
  }

  // Transform threads to response format
  const transformedThreads: Thread[] = threads.map(thread => {
    const contactId = thread.host === userBubbleId ? thread.guest : thread.host;
    const contact = contactId ? contactMap[contactId] : null;

    // Format the last modified time
    const modifiedDate = thread['Modified Date'] ? new Date(thread['Modified Date']) : new Date();
    const now = new Date();
    const diffMs = now.getTime() - modifiedDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    let lastMessageTime: string;
    if (diffDays === 0) {
      lastMessageTime = modifiedDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    } else if (diffDays === 1) {
      lastMessageTime = 'Yesterday';
    } else if (diffDays < 7) {
      lastMessageTime = modifiedDate.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      lastMessageTime = modifiedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    return {
      _id: thread._id,
      contact_name: contact?.name || 'Split Lease',
      contact_avatar: contact?.avatar,
      property_name: thread.listing ? listingMap[thread.listing] : undefined,
      last_message_preview: thread['last message'] || 'No messages yet',
      last_message_time: lastMessageTime,
      unread_count: unreadMap[thread._id] || 0,
      is_with_splitbot: thread['split bot only'] === true,
    };
  });

  console.log('[getThreads] Transformed', transformedThreads.length, 'threads');
  console.log('[getThreads] ========== GET THREADS COMPLETE ==========');

  return {
    threads: transformedThreads,
    total_count: transformedThreads.length,
  };
}
