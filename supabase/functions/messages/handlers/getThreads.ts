/**
 * Get Threads Handler
 * Split Lease - Messages Edge Function
 *
 * Fetches all message threads for the authenticated user
 * Uses service role key to bypass RLS (supports legacy auth users)
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
  '-Host User': string;
  '-Guest User': string;
}

interface GetThreadsResult {
  threads: Thread[];
}

/**
 * Handle get_threads action
 * Fetches all threads for the authenticated user
 */
export async function handleGetThreads(
  supabaseAdmin: SupabaseClient,
  payload: Record<string, unknown>,
  user: User
): Promise<GetThreadsResult> {
  console.log('[getThreads] ========== GET THREADS ==========');
  console.log('[getThreads] User:', user.email);

  // Get user's Bubble ID from public.user table by email
  if (!user.email) {
    console.error('[getThreads] No email in auth token');
    throw new ValidationError('Could not find user profile. Please try logging in again.');
  }

  const { data: userData, error: userError } = await supabaseAdmin
    .from('user')
    .select('_id, "Type - User Current"')
    .ilike('email', user.email)
    .single();

  if (userError || !userData?._id) {
    console.error('[getThreads] User lookup failed:', userError?.message);
    throw new ValidationError('Could not find user profile. Please try logging in again.');
  }

  const userBubbleId = userData._id;
  console.log('[getThreads] User Bubble ID:', userBubbleId);

  // Step 1: Query threads where user is host or guest
  const { data: threads, error: threadsError } = await supabaseAdmin
    .from('thread')
    .select(`
      _id,
      "Modified Date",
      "-Host User",
      "-Guest User",
      "Listing",
      "~Last Message",
      "Thread Subject"
    `)
    .or(`"-Host User".eq.${userBubbleId},"-Guest User".eq.${userBubbleId}`)
    .order('"Modified Date"', { ascending: false });

  console.log('[getThreads] Query result:', {
    threadCount: threads?.length || 0,
    error: threadsError?.message
  });

  if (threadsError) {
    console.error('[getThreads] Threads query failed:', threadsError);
    throw new Error(`Failed to fetch threads: ${threadsError.message}`);
  }

  if (!threads || threads.length === 0) {
    console.log('[getThreads] No threads found');
    return { threads: [] };
  }

  console.log('[getThreads] Found', threads.length, 'threads');

  // Step 2: Collect contact IDs and listing IDs for batch lookup
  const contactIds = new Set<string>();
  const listingIds = new Set<string>();

  threads.forEach(thread => {
    const hostId = thread['-Host User'];
    const guestId = thread['-Guest User'];
    const contactId = hostId === userBubbleId ? guestId : hostId;
    if (contactId) contactIds.add(contactId);
    if (thread['Listing']) listingIds.add(thread['Listing']);
  });

  // Step 3: Batch fetch contact user data
  let contactMap: Record<string, { name: string; avatar?: string }> = {};
  if (contactIds.size > 0) {
    const { data: contacts } = await supabaseAdmin
      .from('user')
      .select('_id, "Name - First", "Name - Last", "Profile Photo"')
      .in('_id', Array.from(contactIds));

    if (contacts) {
      contactMap = contacts.reduce((acc, contact) => {
        acc[contact._id] = {
          name: `${contact['Name - First'] || ''} ${contact['Name - Last'] || ''}`.trim() || 'Unknown User',
          avatar: contact['Profile Photo'],
        };
        return acc;
      }, {} as Record<string, { name: string; avatar?: string }>);
    }
  }

  // Step 4: Batch fetch listing data
  let listingMap: Record<string, string> = {};
  if (listingIds.size > 0) {
    const { data: listings } = await supabaseAdmin
      .from('listing')
      .select('_id, Name')
      .in('_id', Array.from(listingIds));

    if (listings) {
      listingMap = listings.reduce((acc, listing) => {
        acc[listing._id] = listing.Name || 'Unnamed Property';
        return acc;
      }, {} as Record<string, string>);
    }
  }

  // Step 5: Fetch unread message counts per thread
  const threadIds = threads.map(t => t._id);
  let unreadCountMap: Record<string, number> = {};
  if (threadIds.length > 0) {
    const { data: unreadData, error: unreadError } = await supabaseAdmin
      .from('_message')
      .select('"Associated Thread/Conversation"')
      .in('"Associated Thread/Conversation"', threadIds)
      .contains('"Unread Users"', JSON.stringify([userBubbleId]));

    if (!unreadError && unreadData) {
      // Count messages per thread
      unreadCountMap = unreadData.reduce((acc, msg) => {
        const threadId = msg['Associated Thread/Conversation'];
        acc[threadId] = (acc[threadId] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
    }
  }

  // Step 6: Transform threads to UI format
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
      '-Host User': hostId,
      '-Guest User': guestId,
      contact_name: contact?.name || 'Split Lease',
      contact_avatar: contact?.avatar,
      property_name: thread['Listing'] ? listingMap[thread['Listing']] : undefined,
      last_message_preview: thread['~Last Message'] || 'No messages yet',
      last_message_time: lastMessageTime,
      unread_count: unreadCountMap[thread._id] || 0,
      is_with_splitbot: false,
    };
  });

  console.log('[getThreads] Returning', transformedThreads.length, 'threads');
  console.log('[getThreads] ========== GET THREADS COMPLETE ==========');

  return { threads: transformedThreads };
}
