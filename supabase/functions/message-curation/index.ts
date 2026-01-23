/**
 * message-curation Edge Function
 * Admin tool for viewing, moderating, and managing message threads
 *
 * Actions:
 * - getThreads: Search and list threads with pagination
 * - getThreadMessages: Get all messages for a thread
 * - getMessage: Get single message with relations
 * - deleteMessage: Soft delete a message
 * - deleteThread: Soft delete all messages in thread
 * - forwardMessage: Forward message to support email (placeholder)
 * - sendSplitBotMessage: Send Split Bot message in thread
 *
 * Database tables: thread, _message, user, listing
 * Auth: Admin or Corporate user required
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

// Valid actions for this function
const VALID_ACTIONS = [
  'getThreads',
  'getThreadMessages',
  'getMessage',
  'deleteMessage',
  'deleteThread',
  'forwardMessage',
  'sendSplitBotMessage'
] as const;

type Action = typeof VALID_ACTIONS[number];

console.log("[message-curation] Edge Function initializing...");

Deno.serve(async (req: Request) => {
  try {
    console.log(`[message-curation] Request: ${req.method}`);

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 200, headers: corsHeaders });
    }

    // Parse request
    const body = await req.json();
    const action = body.action || 'unknown';
    const payload = body.payload || {};

    console.log(`[message-curation] Action: ${action}`);

    // Validate action
    if (!VALID_ACTIONS.includes(action as Action)) {
      return errorResponse(`Invalid action: ${action}. Valid actions: ${VALID_ACTIONS.join(', ')}`, 400);
    }

    // Get Supabase config
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      throw new Error('Missing Supabase configuration');
    }

    // Authenticate user
    const user = await authenticateFromHeaders(req.headers, supabaseUrl, supabaseAnonKey);
    if (!user) {
      return errorResponse('Authentication required', 401);
    }

    // Create service client for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify user is admin or corporate user
    const isAuthorized = await checkAdminOrCorporateStatus(supabase, user.email);
    if (!isAuthorized) {
      return errorResponse('Admin or corporate access required', 403);
    }

    let result: unknown;

    switch (action as Action) {
      case 'getThreads':
        result = await handleGetThreads(payload, supabase);
        break;

      case 'getThreadMessages':
        result = await handleGetThreadMessages(payload, supabase);
        break;

      case 'getMessage':
        result = await handleGetMessage(payload, supabase);
        break;

      case 'deleteMessage':
        result = await handleDeleteMessage(payload, supabase);
        break;

      case 'deleteThread':
        result = await handleDeleteThread(payload, supabase);
        break;

      case 'forwardMessage':
        result = await handleForwardMessage(payload, supabase);
        break;

      case 'sendSplitBotMessage':
        result = await handleSendSplitBotMessage(payload, supabase);
        break;

      default:
        throw new Error(`Unhandled action: ${action}`);
    }

    console.log('[message-curation] Action completed successfully');

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[message-curation] Error:', error);
    return errorResponse((error as Error).message, 500);
  }
});

// ===== HELPER FUNCTIONS =====

function errorResponse(message: string, status: number) {
  return new Response(
    JSON.stringify({ success: false, error: message }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function authenticateFromHeaders(
  headers: Headers,
  supabaseUrl: string,
  supabaseAnonKey: string
): Promise<{ id: string; email: string } | null> {
  const authHeader = headers.get('Authorization');
  if (!authHeader) return null;

  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error } = await authClient.auth.getUser();
  if (error || !user) return null;

  return { id: user.id, email: user.email ?? '' };
}

async function checkAdminOrCorporateStatus(
  supabase: SupabaseClient,
  email: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('user')
    .select('"Toggle - Is Admin", "Toggle - Is Corporate User"')
    .eq('email', email)
    .single();

  if (error || !data) {
    console.error('[message-curation] Admin/corporate check failed:', error);
    return false;
  }

  return data['Toggle - Is Admin'] === true || data['Toggle - Is Corporate User'] === true;
}

// ===== ACTION HANDLERS =====

/**
 * Get threads with search and pagination
 * Search matches on listing name, guest email, or host email
 */
async function handleGetThreads(
  payload: { search?: string; limit?: number; offset?: number },
  supabase: SupabaseClient
) {
  const { search = '', limit = 50, offset = 0 } = payload;

  // Build query with related data
  let query = supabase
    .from('thread')
    .select(`
      _id,
      "Created Date",
      "Modified Date",
      "-Host User",
      "-Guest User",
      "Listing",
      host:"-Host User" (
        _id,
        email,
        "Name - First",
        "Name - Last",
        "Profile Photo"
      ),
      guest:"-Guest User" (
        _id,
        email,
        "Name - First",
        "Name - Last",
        "Profile Photo"
      ),
      listing:"Listing" (
        _id,
        "Name"
      )
    `, { count: 'exact' })
    .order('"Modified Date"', { ascending: false });

  // Apply search filter if provided
  if (search) {
    // We need to search across related tables, which requires different approach
    // For now, we'll filter client-side after fetching, or use a stored procedure
    // This is a simplification - in production, use a proper full-text search
    console.log('[message-curation] Search term:', search);
  }

  // Apply pagination
  const { data, error, count } = await query.range(offset, offset + limit - 1);

  if (error) {
    console.error('[message-curation] getThreads error:', error);
    throw new Error(`Failed to fetch threads: ${error.message}`);
  }

  // Filter results if search term provided
  let filteredData = data || [];
  if (search) {
    const searchLower = search.toLowerCase();
    filteredData = filteredData.filter((thread: Record<string, unknown>) => {
      const listing = thread.listing as Record<string, unknown> | null;
      const guest = thread.guest as Record<string, unknown> | null;
      const host = thread.host as Record<string, unknown> | null;

      const listingName = (listing?.['Name'] as string || '').toLowerCase();
      const guestEmail = (guest?.email as string || '').toLowerCase();
      const guestFirstName = (guest?.['Name - First'] as string || '').toLowerCase();
      const guestLastName = (guest?.['Name - Last'] as string || '').toLowerCase();
      const hostEmail = (host?.email as string || '').toLowerCase();
      const hostFirstName = (host?.['Name - First'] as string || '').toLowerCase();
      const hostLastName = (host?.['Name - Last'] as string || '').toLowerCase();

      return listingName.includes(searchLower) ||
             guestEmail.includes(searchLower) ||
             guestFirstName.includes(searchLower) ||
             guestLastName.includes(searchLower) ||
             hostEmail.includes(searchLower) ||
             hostFirstName.includes(searchLower) ||
             hostLastName.includes(searchLower);
    });
  }

  // Format threads for response
  const threads = filteredData.map(formatThread);

  return {
    threads,
    total: search ? filteredData.length : (count || 0),
    limit,
    offset,
  };
}

/**
 * Get all messages for a specific thread
 */
async function handleGetThreadMessages(
  payload: { threadId: string },
  supabase: SupabaseClient
) {
  const { threadId } = payload;

  if (!threadId) {
    throw new Error('threadId is required');
  }

  // Fetch thread info first
  const { data: threadData, error: threadError } = await supabase
    .from('thread')
    .select(`
      _id,
      "-Host User",
      "-Guest User",
      "Listing",
      host:"-Host User" (
        _id,
        email,
        "Name - First",
        "Name - Last",
        "Profile Photo"
      ),
      guest:"-Guest User" (
        _id,
        email,
        "Name - First",
        "Name - Last",
        "Profile Photo"
      ),
      listing:"Listing" (
        _id,
        "Name"
      )
    `)
    .eq('_id', threadId)
    .single();

  if (threadError) {
    if (threadError.code === 'PGRST116') {
      throw new Error('Thread not found');
    }
    throw new Error(`Failed to fetch thread: ${threadError.message}`);
  }

  // Fetch messages for this thread
  const { data: messagesData, error: messagesError } = await supabase
    .from('_message')
    .select(`
      _id,
      "Message Body",
      "Split Bot Warning",
      "Created Date",
      "Modified Date",
      "-Originator User",
      "-Thread",
      "Toggle - Is Forwarded",
      deleted_at,
      originator:"-Originator User" (
        _id,
        email,
        "Name - First",
        "Name - Last",
        "Profile Photo"
      )
    `)
    .eq('"-Thread"', threadId)
    .is('deleted_at', null)
    .order('"Created Date"', { ascending: true });

  if (messagesError) {
    console.error('[message-curation] getThreadMessages error:', messagesError);
    throw new Error(`Failed to fetch messages: ${messagesError.message}`);
  }

  // Format messages
  const messages = (messagesData || []).map((msg: Record<string, unknown>) => formatMessage(msg, threadData));

  return {
    thread: formatThread(threadData),
    messages,
    messageCount: messages.length,
  };
}

/**
 * Get single message with full details
 */
async function handleGetMessage(
  payload: { messageId: string },
  supabase: SupabaseClient
) {
  const { messageId } = payload;

  if (!messageId) {
    throw new Error('messageId is required');
  }

  const { data, error } = await supabase
    .from('_message')
    .select(`
      _id,
      "Message Body",
      "Split Bot Warning",
      "Created Date",
      "Modified Date",
      "-Originator User",
      "-Thread",
      "Toggle - Is Forwarded",
      deleted_at,
      originator:"-Originator User" (
        _id,
        email,
        "Name - First",
        "Name - Last",
        "Profile Photo"
      ),
      thread:"-Thread" (
        _id,
        "-Host User",
        "-Guest User",
        "Listing",
        host:"-Host User" (
          _id,
          email,
          "Name - First",
          "Name - Last",
          "Profile Photo"
        ),
        guest:"-Guest User" (
          _id,
          email,
          "Name - First",
          "Name - Last",
          "Profile Photo"
        ),
        listing:"Listing" (
          _id,
          "Name"
        )
      )
    `)
    .eq('_id', messageId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw new Error('Message not found');
    }
    console.error('[message-curation] getMessage error:', error);
    throw new Error(`Failed to fetch message: ${error.message}`);
  }

  const thread = data.thread as Record<string, unknown>;

  return {
    message: formatMessage(data, thread),
    thread: formatThread(thread),
  };
}

/**
 * Soft delete a single message
 */
async function handleDeleteMessage(
  payload: { messageId: string },
  supabase: SupabaseClient
) {
  const { messageId } = payload;

  if (!messageId) {
    throw new Error('messageId is required');
  }

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('_message')
    .update({
      deleted_at: now,
      'Modified Date': now,
    })
    .eq('_id', messageId)
    .select('_id')
    .single();

  if (error) {
    console.error('[message-curation] deleteMessage error:', error);
    throw new Error(`Failed to delete message: ${error.message}`);
  }

  console.log('[message-curation] Message soft deleted:', { messageId, timestamp: now });

  return {
    deleted: true,
    messageId: data._id,
    deletedAt: now,
  };
}

/**
 * Soft delete all messages in a thread
 */
async function handleDeleteThread(
  payload: { threadId: string },
  supabase: SupabaseClient
) {
  const { threadId } = payload;

  if (!threadId) {
    throw new Error('threadId is required');
  }

  const now = new Date().toISOString();

  // Soft delete all messages in the thread
  const { data, error } = await supabase
    .from('_message')
    .update({
      deleted_at: now,
      'Modified Date': now,
    })
    .eq('"-Thread"', threadId)
    .is('deleted_at', null)
    .select('_id');

  if (error) {
    console.error('[message-curation] deleteThread error:', error);
    throw new Error(`Failed to delete thread messages: ${error.message}`);
  }

  const deletedCount = (data || []).length;
  console.log('[message-curation] Thread messages soft deleted:', { threadId, count: deletedCount, timestamp: now });

  return {
    deleted: true,
    threadId,
    deletedCount,
    deletedAt: now,
  };
}

/**
 * Forward message to support email (placeholder implementation)
 * TODO: Integrate with email service when available
 */
async function handleForwardMessage(
  payload: { messageId: string; recipientEmail?: string },
  supabase: SupabaseClient
) {
  const { messageId, recipientEmail = 'support@splitlease.com' } = payload;

  if (!messageId) {
    throw new Error('messageId is required');
  }

  // Fetch the message
  const { data: messageData, error: messageError } = await supabase
    .from('_message')
    .select(`
      _id,
      "Message Body",
      "Created Date",
      "-Originator User",
      "-Thread",
      originator:"-Originator User" (
        _id,
        email,
        "Name - First",
        "Name - Last"
      ),
      thread:"-Thread" (
        _id,
        "-Host User",
        "-Guest User",
        "Listing",
        host:"-Host User" ( email, "Name - First", "Name - Last" ),
        guest:"-Guest User" ( email, "Name - First", "Name - Last" ),
        listing:"Listing" ( "Name" )
      )
    `)
    .eq('_id', messageId)
    .single();

  if (messageError) {
    throw new Error(`Failed to fetch message: ${messageError.message}`);
  }

  // Mark as forwarded
  const now = new Date().toISOString();
  const { error: updateError } = await supabase
    .from('_message')
    .update({
      'Toggle - Is Forwarded': true,
      'Modified Date': now,
    })
    .eq('_id', messageId);

  if (updateError) {
    console.error('[message-curation] forwardMessage update error:', updateError);
  }

  // TODO: Actually send email via send-email Edge Function
  // For now, just log and return success
  console.log('[message-curation] Message forwarded (placeholder):', {
    messageId,
    recipientEmail,
    timestamp: now,
  });

  return {
    forwarded: true,
    messageId,
    recipientEmail,
    timestamp: now,
    note: 'Email forwarding not yet implemented - message marked as forwarded',
  };
}

/**
 * Send a Split Bot message in a thread
 */
async function handleSendSplitBotMessage(
  payload: { threadId: string; messageBody: string; recipientType: 'guest' | 'host' },
  supabase: SupabaseClient
) {
  const { threadId, messageBody, recipientType } = payload;

  if (!threadId) {
    throw new Error('threadId is required');
  }
  if (!messageBody || !messageBody.trim()) {
    throw new Error('messageBody is required');
  }
  if (!recipientType || !['guest', 'host'].includes(recipientType)) {
    throw new Error('recipientType must be "guest" or "host"');
  }

  // First, find the Split Bot user
  const { data: splitBotUser, error: splitBotError } = await supabase
    .from('user')
    .select('_id')
    .eq('is Split Bot', true)
    .single();

  if (splitBotError || !splitBotUser) {
    console.error('[message-curation] Split Bot user not found:', splitBotError);
    throw new Error('Split Bot user not configured in database');
  }

  // Fetch thread to get host and guest
  const { data: threadData, error: threadError } = await supabase
    .from('thread')
    .select('_id, "-Host User", "-Guest User"')
    .eq('_id', threadId)
    .single();

  if (threadError) {
    throw new Error(`Thread not found: ${threadError.message}`);
  }

  // Generate a unique message ID (Bubble-style format)
  const { data: newIdData, error: idError } = await supabase.rpc('generate_bubble_id');
  if (idError || !newIdData) {
    throw new Error('Failed to generate message ID');
  }

  const now = new Date().toISOString();

  // Create the message
  const { data: newMessage, error: createError } = await supabase
    .from('_message')
    .insert({
      _id: newIdData,
      'Message Body': messageBody.trim(),
      '-Thread': threadId,
      '-Originator User': splitBotUser._id,
      'Created Date': now,
      'Modified Date': now,
      'Split Bot Warning': true,
    })
    .select('_id, "Message Body", "Created Date"')
    .single();

  if (createError) {
    console.error('[message-curation] sendSplitBotMessage create error:', createError);
    throw new Error(`Failed to create Split Bot message: ${createError.message}`);
  }

  console.log('[message-curation] Split Bot message created:', {
    messageId: newMessage._id,
    threadId,
    recipientType,
    timestamp: now,
  });

  return {
    success: true,
    message: {
      id: newMessage._id,
      body: newMessage['Message Body'],
      createdAt: newMessage['Created Date'],
    },
    threadId,
    recipientType,
  };
}

// ===== FORMAT HELPERS =====

/**
 * Format thread for API response
 */
function formatThread(thread: Record<string, unknown>) {
  const guest = thread.guest as Record<string, unknown> | null;
  const host = thread.host as Record<string, unknown> | null;
  const listing = thread.listing as Record<string, unknown> | null;

  return {
    id: thread._id,
    createdAt: thread['Created Date'],
    modifiedAt: thread['Modified Date'],
    hostUserId: thread['-Host User'],
    guestUserId: thread['-Guest User'],
    listingId: thread['Listing'],
    guest: guest ? {
      id: guest._id,
      email: guest.email || '',
      firstName: guest['Name - First'] || '',
      lastName: guest['Name - Last'] || '',
      profilePhoto: guest['Profile Photo'] || null,
    } : null,
    host: host ? {
      id: host._id,
      email: host.email || '',
      firstName: host['Name - First'] || '',
      lastName: host['Name - Last'] || '',
      profilePhoto: host['Profile Photo'] || null,
    } : null,
    listing: listing ? {
      id: listing._id,
      name: listing['Name'] || 'Unnamed Listing',
    } : null,
  };
}

/**
 * Format message for API response
 */
function formatMessage(message: Record<string, unknown>, thread: Record<string, unknown>) {
  const originator = message.originator as Record<string, unknown> | null;
  const guest = thread.guest as Record<string, unknown> | null;
  const host = thread.host as Record<string, unknown> | null;

  // Determine sender type
  let senderType: 'guest' | 'host' | 'splitbot' | 'unknown' = 'unknown';
  const originatorId = message['-Originator User'];
  const isSplitBotWarning = message['Split Bot Warning'];

  if (isSplitBotWarning) {
    senderType = 'splitbot';
  } else if (originatorId === thread['-Guest User']) {
    senderType = 'guest';
  } else if (originatorId === thread['-Host User']) {
    senderType = 'host';
  }

  return {
    id: message._id,
    body: message['Message Body'] || '',
    createdAt: message['Created Date'],
    modifiedAt: message['Modified Date'],
    originatorUserId: originatorId,
    threadId: message['-Thread'],
    isSplitBotWarning: !!isSplitBotWarning,
    isForwarded: !!message['Toggle - Is Forwarded'],
    isDeleted: !!message.deleted_at,
    deletedAt: message.deleted_at,
    senderType,
    originator: originator ? {
      id: originator._id,
      email: originator.email || '',
      firstName: originator['Name - First'] || '',
      lastName: originator['Name - Last'] || '',
      profilePhoto: originator['Profile Photo'] || null,
    } : null,
  };
}

console.log("[message-curation] Edge Function ready");
