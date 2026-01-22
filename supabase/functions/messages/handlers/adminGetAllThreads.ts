/**
 * Admin Get All Threads Handler
 * Split Lease - Messages Edge Function
 *
 * Fetches ALL message threads across the platform (admin only)
 * Includes host/guest user data and optionally thread messages
 *
 * NO FALLBACK PRINCIPLE: Throws if database query fails
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { AuthenticationError, ValidationError } from '../../_shared/errors.ts';

interface AdminThread {
  _id: string;
  'Thread Subject': string;
  'Created Date': string;
  'Modified Date': string;
  '~Date Last Message': string;
  'Call to Action': string;
  'Proposal': string;
  'Listing': string;
  'Masked Email': string;
  'from logged out user?': boolean;
  '-Host User': string;
  '-Guest User': string;
  hostUser: {
    _id: string;
    'Name - Full': string;
    email: string;
    'Phone Number (as text)': string;
    'Profile Photo': string;
  } | null;
  guestUser: {
    _id: string;
    'Name - Full': string;
    email: string;
    'Phone Number (as text)': string;
    'Profile Photo': string;
  } | null;
  threadMessages?: Array<{
    _id: string;
    'Message Body': string;
    'Created Date': string;
    'is Split Bot': boolean;
    'is Visible to Host': boolean;
    'is Visible to Guest': boolean;
    'is deleted (is hidden)': boolean;
    '-Originator User': string;
    'Call to Action': string;
    'Not Logged In Name': string;
    'Not Logged In Email': string;
  }>;
}

interface AdminGetAllThreadsPayload {
  limit?: number;
  offset?: number;
  includeMessages?: boolean;
}

interface AdminGetAllThreadsResult {
  data: AdminThread[];
  total: number;
}

/**
 * Verify that the current user is an admin
 */
async function verifyAdminRole(
  supabaseAdmin: SupabaseClient,
  user: { id: string; email: string }
): Promise<boolean> {
  console.log('[adminGetAllThreads] Verifying admin role for:', user.email);

  // Look up user by email to check admin flag
  const { data: userData, error } = await supabaseAdmin
    .from('user')
    .select('_id, "Toggle - Is Admin"')
    .ilike('email', user.email)
    .maybeSingle();

  if (error) {
    console.error('[adminGetAllThreads] Admin check query failed:', error.message);
    return false;
  }

  const isAdmin = userData?.['Toggle - Is Admin'] === true;
  console.log('[adminGetAllThreads] Admin check result:', isAdmin);

  return isAdmin;
}

/**
 * Handle admin_get_all_threads action
 * Fetches ALL threads across the platform (admin only)
 */
export async function handleAdminGetAllThreads(
  supabaseAdmin: SupabaseClient,
  payload: AdminGetAllThreadsPayload,
  user: { id: string; email: string }
): Promise<AdminGetAllThreadsResult> {
  console.log('[adminGetAllThreads] ========== ADMIN GET ALL THREADS ==========');
  console.log('[adminGetAllThreads] User:', user.email);
  console.log('[adminGetAllThreads] Payload:', JSON.stringify(payload));

  // Step 1: Verify admin role
  const isAdmin = await verifyAdminRole(supabaseAdmin, user);
  if (!isAdmin) {
    console.error('[adminGetAllThreads] User is not an admin');
    throw new AuthenticationError('You do not have permission to access this resource.');
  }

  const limit = Math.min(payload.limit || 100, 500);
  const offset = payload.offset || 0;
  const includeMessages = payload.includeMessages ?? false;

  // Step 2: Get total count
  const { count, error: countError } = await supabaseAdmin
    .from('thread')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.error('[adminGetAllThreads] Count query failed:', countError.message);
    throw new Error(`Failed to count threads: ${countError.message}`);
  }

  // Step 3: Query all threads with user data
  let query = supabaseAdmin
    .from('thread')
    .select(`
      _id,
      "Thread Subject",
      "Created Date",
      "Modified Date",
      "~Date Last Message",
      "Call to Action",
      "Proposal",
      "Listing",
      "Masked Email",
      "from logged out user?",
      "-Host User",
      "-Guest User"
    `)
    .order('"Modified Date"', { ascending: false })
    .range(offset, offset + limit - 1);

  const { data: threads, error: threadsError } = await query;

  if (threadsError) {
    console.error('[adminGetAllThreads] Threads query failed:', threadsError.message);
    throw new Error(`Failed to fetch threads: ${threadsError.message}`);
  }

  if (!threads || threads.length === 0) {
    console.log('[adminGetAllThreads] No threads found');
    return { data: [], total: count || 0 };
  }

  console.log('[adminGetAllThreads] Found', threads.length, 'threads');

  // Step 4: Collect all user IDs for batch lookup
  const userIds = new Set<string>();
  threads.forEach(thread => {
    if (thread['-Host User']) userIds.add(thread['-Host User']);
    if (thread['-Guest User']) userIds.add(thread['-Guest User']);
  });

  // Step 5: Batch fetch user data
  let userMap: Record<string, AdminThread['hostUser']> = {};
  if (userIds.size > 0) {
    const { data: users, error: usersError } = await supabaseAdmin
      .from('user')
      .select('_id, "Name - Full", email, "Phone Number (as text)", "Profile Photo"')
      .in('_id', Array.from(userIds));

    if (usersError) {
      console.error('[adminGetAllThreads] Users query failed:', usersError.message);
      // Don't throw - continue with partial data
    } else if (users) {
      userMap = users.reduce((acc, user) => {
        acc[user._id] = user as AdminThread['hostUser'];
        return acc;
      }, {} as Record<string, AdminThread['hostUser']>);
    }
  }

  // Step 6: Optionally fetch messages for each thread
  let messagesMap: Record<string, AdminThread['threadMessages']> = {};
  if (includeMessages) {
    const threadIds = threads.map(t => t._id);

    const { data: messages, error: messagesError } = await supabaseAdmin
      .from('_message')
      .select(`
        _id,
        "Associated Thread/Conversation",
        "Message Body",
        "Created Date",
        "is Split Bot",
        "is Visible to Host",
        "is Visible to Guest",
        "is deleted (is hidden)",
        "-Originator User",
        "Call to Action",
        "Not Logged In Name",
        "Not Logged In Email"
      `)
      .in('"Associated Thread/Conversation"', threadIds)
      .order('"Created Date"', { ascending: true });

    if (messagesError) {
      console.error('[adminGetAllThreads] Messages query failed:', messagesError.message);
      // Don't throw - continue without messages
    } else if (messages) {
      // Group messages by thread
      messagesMap = messages.reduce((acc, msg) => {
        const threadId = msg['Associated Thread/Conversation'];
        if (!acc[threadId]) acc[threadId] = [];
        acc[threadId].push(msg as AdminThread['threadMessages'][0]);
        return acc;
      }, {} as Record<string, AdminThread['threadMessages']>);
    }
  }

  // Step 7: Assemble final result
  const result: AdminThread[] = threads.map(thread => ({
    ...thread,
    hostUser: thread['-Host User'] ? userMap[thread['-Host User']] || null : null,
    guestUser: thread['-Guest User'] ? userMap[thread['-Guest User']] || null : null,
    threadMessages: includeMessages ? messagesMap[thread._id] || [] : undefined,
  }));

  console.log('[adminGetAllThreads] Returning', result.length, 'threads');
  console.log('[adminGetAllThreads] ========== ADMIN GET ALL THREADS COMPLETE ==========');

  return { data: result, total: count || 0 };
}
