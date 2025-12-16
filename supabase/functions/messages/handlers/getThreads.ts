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

  // Query thread table directly - user can be either host or guest
  // Note: Column names with special chars need quoting in .or() filter
  const { data: threads, error: threadsError } = await supabaseAdmin
    .from('thread')
    .select(`
      _id,
      "Modified Date",
      "-Host User",
      "-Guest User",
      "Proposal",
      "Listing",
      "~Last Message",
      "Thread Subject"
    `)
    .or(`"-Host User".eq.${userBubbleId},"-Guest User".eq.${userBubbleId}`)
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
    const hostId = thread['-Host User'];
    const guestId = thread['-Guest User'];
    const contactId = hostId === userBubbleId ? guestId : hostId;
    if (contactId) contactIds.add(contactId);
    if (thread['Listing']) listingIds.add(thread['Listing']);
  });

  // Batch fetch contact user data
  // Note: User table uses "Name - First" and "Name - Last" column names
  let contactMap: Record<string, { name: string; avatar?: string }> = {};
  if (contactIds.size > 0) {
    const { data: contacts, error: contactsError } = await supabaseAdmin
      .from('user')
      .select('_id, "Name - First", "Name - Last", "Profile Photo"')
      .in('_id', Array.from(contactIds));

    if (!contactsError && contacts) {
      contactMap = contacts.reduce((acc, contact) => {
        acc[contact._id] = {
          name: `${contact['Name - First'] || ''} ${contact['Name - Last'] || ''}`.trim() || 'Unknown User',
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
  const threadIdsForUnread = threads.map(t => t._id);
  let unreadMap: Record<string, number> = {};

  // Query messages where user is in unread_users list
  const { data: unreadMessages, error: unreadError } = await supabaseAdmin
    .from('message')
    .select('thread_conversation, unread_users')
    .in('thread_conversation', threadIdsForUnread);

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
    const hostId = thread['-Host User'];
    const guestId = thread['-Guest User'];
    const contactId = hostId === userBubbleId ? guestId : hostId;
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
      property_name: thread['Listing'] ? listingMap[thread['Listing']] : undefined,
      last_message_preview: thread['~Last Message'] || 'No messages yet',
      last_message_time: lastMessageTime,
      unread_count: unreadMap[thread._id] || 0,
      is_with_splitbot: false, // No longer tracking split bot only
    };
  });

  console.log('[getThreads] Transformed', transformedThreads.length, 'threads');
  console.log('[getThreads] ========== GET THREADS COMPLETE ==========');

  return {
    threads: transformedThreads,
    total_count: transformedThreads.length,
  };
}
