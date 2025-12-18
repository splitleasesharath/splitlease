# Native Supabase Realtime Messaging - Implementation Plan

**Created**: 2025-12-16 19:00:00
**Status**: READY FOR IMPLEMENTATION
**Type**: BUILD - Major Feature
**Scope**: Complete native messaging system bypassing Bubble

---

## Executive Summary

This plan implements a **fully native Supabase messaging system** with real-time capabilities, completely bypassing Bubble for message creation. The implementation is **user-centric**, meaning all operations start from the authenticated user and flow through proper authorization.

### What We're Building

| Feature | Description |
|---------|-------------|
| **Native Message Creation** | Insert messages directly into `_message` table |
| **Native Thread Creation** | Create new threads without Bubble |
| **Real-time Delivery** | Instant message delivery via Supabase Broadcast |
| **Typing Indicators** | See when others are composing messages |
| **Online Status** | Know when users are available |
| **Unread Tracking** | Track and display unread message counts |
| **RLS Security** | Row-level security for all messaging tables |

### Key Architecture Decisions

1. **Bypass Bubble entirely** - No more `BubbleSyncService.triggerWorkflowOnly()`
2. **Use Supabase Broadcast** (not Postgres Changes) for scalability
3. **Use `generate_bubble_id()`** for ID generation (maintains compatibility)
4. **User-centric design** - All operations anchor on the authenticated user

---

## Current State Analysis

### Database Tables

| Table | Rows | RLS Enabled | In Realtime Publication |
|-------|------|-------------|------------------------|
| `thread` | 806 | **NO** | **NO** |
| `_message` | 6,244 | **NO** | **NO** |
| `multimessage` | ? | **NO** | **NO** |
| `junctions.user_thread` | ~1,600 | YES | NO |
| `junctions.thread_participant` | ~1,600 | YES | NO |

### Auth Mapping Pattern

```
auth.uid() (UUID) → auth.users.email → public.user.email → public.user._id (Bubble ID)
```

### ID Generation

- Function: `generate_bubble_id()`
- Format: `{13-digit-timestamp}x{17-digit-random}`
- Example: `1765872300914x25497779776179264`

---

## Database Schema Changes

### Phase 1: Enable RLS on Messaging Tables

```sql
-- Migration: 001_enable_messaging_rls.sql

-- Enable RLS on thread table
ALTER TABLE public.thread ENABLE ROW LEVEL SECURITY;

-- Enable RLS on _message table
ALTER TABLE public._message ENABLE ROW LEVEL SECURITY;

-- Enable RLS on multimessage table
ALTER TABLE public.multimessage ENABLE ROW LEVEL SECURITY;
```

### Phase 2: Create RLS Policies

```sql
-- Migration: 002_messaging_rls_policies.sql

-- ============================================
-- HELPER FUNCTION: Get current user's Bubble ID
-- ============================================
CREATE OR REPLACE FUNCTION auth.get_user_bubble_id()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT u._id
  FROM public."user" u
  WHERE u.email = (SELECT email FROM auth.users WHERE id = auth.uid())
  LIMIT 1;
$$;

COMMENT ON FUNCTION auth.get_user_bubble_id() IS
  'Returns the Bubble _id for the currently authenticated user based on email match';

-- ============================================
-- THREAD TABLE POLICIES
-- ============================================

-- Service role has full access (for Edge Functions)
CREATE POLICY "service_role_full_access_thread" ON public.thread
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Users can read threads where they are host or guest
CREATE POLICY "users_read_own_threads" ON public.thread
  FOR SELECT TO authenticated
  USING (
    "-Host User" = auth.get_user_bubble_id()
    OR "-Guest User" = auth.get_user_bubble_id()
  );

-- Users can create threads (must be participant)
CREATE POLICY "users_create_threads" ON public.thread
  FOR INSERT TO authenticated
  WITH CHECK (
    "-Host User" = auth.get_user_bubble_id()
    OR "-Guest User" = auth.get_user_bubble_id()
    OR "Created By" = auth.get_user_bubble_id()
  );

-- Users can update threads they participate in (limited fields)
CREATE POLICY "users_update_own_threads" ON public.thread
  FOR UPDATE TO authenticated
  USING (
    "-Host User" = auth.get_user_bubble_id()
    OR "-Guest User" = auth.get_user_bubble_id()
  )
  WITH CHECK (
    "-Host User" = auth.get_user_bubble_id()
    OR "-Guest User" = auth.get_user_bubble_id()
  );

-- ============================================
-- MESSAGE TABLE POLICIES
-- ============================================

-- Service role has full access
CREATE POLICY "service_role_full_access_message" ON public._message
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Users can read messages in their threads (with visibility check)
CREATE POLICY "users_read_visible_messages" ON public._message
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.thread t
      WHERE t._id = _message."Associated Thread/Conversation"
      AND (
        (t."-Host User" = auth.get_user_bubble_id() AND _message."is Visible to Host" = true)
        OR (t."-Guest User" = auth.get_user_bubble_id() AND _message."is Visible to Guest" = true)
      )
    )
  );

-- Users can create messages in threads they participate in
CREATE POLICY "users_create_messages" ON public._message
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.thread t
      WHERE t._id = "Associated Thread/Conversation"
      AND (t."-Host User" = auth.get_user_bubble_id() OR t."-Guest User" = auth.get_user_bubble_id())
    )
    AND "-Originator User" = auth.get_user_bubble_id()
  );

-- Users can update messages they sent (for read receipts)
CREATE POLICY "users_update_own_messages" ON public._message
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.thread t
      WHERE t._id = "Associated Thread/Conversation"
      AND (t."-Host User" = auth.get_user_bubble_id() OR t."-Guest User" = auth.get_user_bubble_id())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.thread t
      WHERE t._id = "Associated Thread/Conversation"
      AND (t."-Host User" = auth.get_user_bubble_id() OR t."-Guest User" = auth.get_user_bubble_id())
    )
  );
```

### Phase 3: Realtime Broadcast Trigger

```sql
-- Migration: 003_realtime_message_broadcast.sql

-- ============================================
-- BROADCAST TRIGGER FOR NEW MESSAGES
-- ============================================

CREATE OR REPLACE FUNCTION public.broadcast_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  thread_record RECORD;
  sender_record RECORD;
BEGIN
  -- Get thread info for channel name
  SELECT _id, "-Host User", "-Guest User", "Listing"
  INTO thread_record
  FROM public.thread
  WHERE _id = NEW."Associated Thread/Conversation";

  -- Get sender info
  SELECT _id, "First Name", "Last Name", "Profile Photo"
  INTO sender_record
  FROM public."user"
  WHERE _id = NEW."-Originator User";

  -- Broadcast to thread-specific channel
  PERFORM realtime.send(
    jsonb_build_object(
      'type', 'new_message',
      'message', jsonb_build_object(
        '_id', NEW._id,
        'thread_id', NEW."Associated Thread/Conversation",
        'message_body', NEW."Message Body",
        'sender_id', NEW."-Originator User",
        'sender_name', COALESCE(sender_record."First Name", '') || ' ' || COALESCE(sender_record."Last Name", ''),
        'sender_avatar', sender_record."Profile Photo",
        'is_split_bot', NEW."is Split Bot",
        'created_at', NEW."Created Date",
        'call_to_action', NEW."Call to Action",
        'split_bot_warning', NEW."Split Bot Warning"
      ),
      'host_user', thread_record."-Host User",
      'guest_user', thread_record."-Guest User"
    ),
    'new_message',                                    -- event name
    'thread-' || NEW."Associated Thread/Conversation", -- channel/topic
    true                                              -- private channel
  );

  RETURN NEW;
END;
$$;

-- Create trigger on message insert
CREATE TRIGGER trigger_broadcast_new_message
  AFTER INSERT ON public._message
  FOR EACH ROW
  EXECUTE FUNCTION public.broadcast_new_message();

COMMENT ON FUNCTION public.broadcast_new_message() IS
  'Broadcasts new messages to Realtime channel for instant delivery';
```

### Phase 4: Thread Update Trigger (for last message)

```sql
-- Migration: 004_thread_update_trigger.sql

-- ============================================
-- AUTO-UPDATE THREAD ON NEW MESSAGE
-- ============================================

CREATE OR REPLACE FUNCTION public.update_thread_on_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update thread's last message info
  UPDATE public.thread
  SET
    "~Last Message" = LEFT(NEW."Message Body", 100),
    "~Date Last Message" = NEW."Created Date",
    "Modified Date" = NOW(),
    updated_at = NOW()
  WHERE _id = NEW."Associated Thread/Conversation";

  RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER trigger_update_thread_on_message
  AFTER INSERT ON public._message
  FOR EACH ROW
  EXECUTE FUNCTION public.update_thread_on_message();
```

### Phase 5: Junction Table Helpers

```sql
-- Migration: 005_messaging_junction_helpers.sql

-- ============================================
-- ADD USER TO THREAD (Junction)
-- ============================================

CREATE OR REPLACE FUNCTION junctions.add_user_to_thread(
  p_user_id TEXT,
  p_thread_id TEXT,
  p_role TEXT DEFAULT 'participant'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert into user_thread junction
  INSERT INTO junctions.user_thread (user_id, thread_id, role, joined_at)
  VALUES (p_user_id, p_thread_id, p_role, NOW())
  ON CONFLICT (user_id, thread_id) DO NOTHING;

  -- Insert into thread_participant junction
  INSERT INTO junctions.thread_participant (thread_id, user_id, role, joined_at)
  VALUES (p_thread_id, p_user_id, p_role, NOW())
  ON CONFLICT (thread_id, user_id) DO NOTHING;
END;
$$;
```

---

## Edge Function Changes

### New File: `supabase/functions/_shared/messagingHelpers.ts`

```typescript
/**
 * Messaging Helpers
 * Split Lease - Native Supabase Messaging
 *
 * Helper functions for native message and thread creation.
 * NO BUBBLE DEPENDENCY - All operations are Supabase-native.
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============================================
// ID GENERATION
// ============================================

/**
 * Generate a Bubble-compatible ID using the database function
 */
export async function generateBubbleId(supabase: SupabaseClient): Promise<string> {
  const { data, error } = await supabase
    .rpc('generate_bubble_id');

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
 * Get user's Bubble ID from Supabase auth
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
      "Participants": JSON.stringify([params.hostUserId, params.guestUserId]),
      "from logged out user?": false,
      created_at: now,
      updated_at: now,
    });

  if (error) {
    console.error('[messagingHelpers] Failed to create thread:', error);
    throw new Error(`Failed to create thread: ${error.message}`);
  }

  // Add to junction tables
  await supabase.rpc('add_user_to_thread', {
    p_user_id: params.hostUserId,
    p_thread_id: threadId,
    p_role: 'host'
  });
  await supabase.rpc('add_user_to_thread', {
    p_user_id: params.guestUserId,
    p_thread_id: threadId,
    p_role: 'guest'
  });

  console.log('[messagingHelpers] Created thread:', threadId);
  return threadId;
}

/**
 * Find existing thread between two users for a listing
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
 */
export async function createMessage(
  supabase: SupabaseClient,
  params: CreateMessageParams
): Promise<string> {
  const messageId = await generateBubbleId(supabase);
  const now = new Date().toISOString();

  // Get thread info to determine host/guest
  const { data: thread } = await supabase
    .from('thread')
    .select('"-Host User", "-Guest User"')
    .eq('_id', params.threadId)
    .single();

  if (!thread) {
    throw new Error('Thread not found');
  }

  // Determine unread users (everyone except sender)
  const unreadUsers = [thread['-Host User'], thread['-Guest User']]
    .filter(id => id && id !== params.senderUserId);

  const { error } = await supabase
    .from('_message')
    .insert({
      _id: messageId,
      "Associated Thread/Conversation": params.threadId,
      "Message Body": params.messageBody,
      "-Originator User": params.senderUserId,
      "-Host User": thread['-Host User'],
      "-Guest User": thread['-Guest User'],
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
 * Mark messages as read by removing user from unread_users
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
```

### Updated: `supabase/functions/messages/handlers/sendMessage.ts`

```typescript
/**
 * Send Message Handler - NATIVE SUPABASE
 * Split Lease - Messages Edge Function
 *
 * Creates messages directly in Supabase (NO BUBBLE).
 * The database trigger handles:
 * - Broadcasting to Realtime channel
 * - Updating thread's last message
 *
 * NO FALLBACK PRINCIPLE: Throws if message creation fails
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { User } from 'https://esm.sh/@supabase/supabase-js@2';
import { ValidationError } from '../../_shared/errors.ts';
import { validateRequiredFields } from '../../_shared/validation.ts';
import {
  getUserBubbleId,
  createMessage,
  createThread,
  findExistingThread
} from '../../_shared/messagingHelpers.ts';

interface SendMessagePayload {
  thread_id?: string;          // Optional if creating new thread
  message_body: string;        // Required: Message content
  // For new thread creation:
  recipient_user_id?: string;  // Required if no thread_id
  listing_id?: string;         // Optional: Associated listing
  // Message options:
  splitbot?: boolean;          // Optional: Is Split Bot message
  call_to_action?: string;     // Optional: CTA type
  split_bot_warning?: string;  // Optional: Warning text
}

interface SendMessageResult {
  success: boolean;
  message_id: string;
  thread_id: string;
  is_new_thread: boolean;
  timestamp: string;
}

/**
 * Handle send_message action - NATIVE SUPABASE
 */
export async function handleSendMessage(
  supabaseAdmin: SupabaseClient,
  payload: Record<string, unknown>,
  user: User
): Promise<SendMessageResult> {
  console.log('[sendMessage] ========== SEND MESSAGE (NATIVE) ==========');
  console.log('[sendMessage] User:', user.email);

  // Validate required fields
  const typedPayload = payload as unknown as SendMessagePayload;
  validateRequiredFields(typedPayload, ['message_body']);

  // Validate message body is not empty
  if (!typedPayload.message_body.trim()) {
    throw new ValidationError('Message body cannot be empty');
  }

  // Get sender's Bubble ID
  if (!user.email) {
    throw new ValidationError('Could not find user profile. Please try logging in again.');
  }

  const senderBubbleId = await getUserBubbleId(supabaseAdmin, user.email);
  if (!senderBubbleId) {
    throw new ValidationError('Could not find user profile. Please try logging in again.');
  }

  console.log('[sendMessage] Sender Bubble ID:', senderBubbleId);

  let threadId = typedPayload.thread_id;
  let isNewThread = false;

  // If no thread_id, we need to create or find a thread
  if (!threadId) {
    if (!typedPayload.recipient_user_id) {
      throw new ValidationError('Either thread_id or recipient_user_id is required');
    }

    // Get thread info to determine if sender is host or guest
    // For new threads initiated by guest messaging a host's listing
    const recipientId = typedPayload.recipient_user_id;

    // Check for existing thread
    threadId = await findExistingThread(
      supabaseAdmin,
      recipientId,  // Assume recipient is host
      senderBubbleId,
      typedPayload.listing_id
    );

    if (!threadId) {
      // Also check reverse (sender might be host)
      threadId = await findExistingThread(
        supabaseAdmin,
        senderBubbleId,
        recipientId,
        typedPayload.listing_id
      );
    }

    if (!threadId) {
      // Create new thread
      threadId = await createThread(supabaseAdmin, {
        hostUserId: recipientId,  // Assume recipient is host for now
        guestUserId: senderBubbleId,
        listingId: typedPayload.listing_id,
        createdBy: senderBubbleId,
      });
      isNewThread = true;
      console.log('[sendMessage] Created new thread:', threadId);
    }
  }

  // Create the message (triggers broadcast automatically)
  const messageId = await createMessage(supabaseAdmin, {
    threadId,
    messageBody: typedPayload.message_body.trim(),
    senderUserId: senderBubbleId,
    isSplitBot: typedPayload.splitbot || false,
    callToAction: typedPayload.call_to_action,
    splitBotWarning: typedPayload.split_bot_warning,
  });

  console.log('[sendMessage] Message created:', messageId);
  console.log('[sendMessage] ========== SEND COMPLETE (NATIVE) ==========');

  return {
    success: true,
    message_id: messageId,
    thread_id: threadId,
    is_new_thread: isNewThread,
    timestamp: new Date().toISOString(),
  };
}
```

---

## Frontend Changes

### Updated: `app/src/islands/pages/MessagingPage/useMessagingPageLogic.js`

```javascript
/**
 * useMessagingPageLogic - WITH SUPABASE REALTIME
 *
 * Adds real-time subscriptions for:
 * - New message broadcasts
 * - Typing indicators via Presence
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { checkAuthStatus } from '../../../lib/auth.js';
import { supabase } from '../../../lib/supabase.js';

const EDGE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/messages`;

export function useMessagingPageLogic() {
  // ... existing state ...

  // NEW: Realtime state
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const [typingUserName, setTypingUserName] = useState(null);
  const channelRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // ... existing auth and data fetching code ...

  // ============================================
  // REALTIME SUBSCRIPTION
  // ============================================

  /**
   * Subscribe to thread channel for real-time updates
   */
  useEffect(() => {
    if (!selectedThread || authState.isChecking) return;

    const channelName = `thread-${selectedThread._id}`;
    console.log('[Realtime] Subscribing to channel:', channelName);

    const channel = supabase.channel(channelName, {
      config: { private: true }
    });

    // Listen for new messages
    channel.on('broadcast', { event: 'new_message' }, (payload) => {
      console.log('[Realtime] New message received:', payload);

      const message = payload.payload?.message;
      if (message && message.thread_id === selectedThread._id) {
        // Add message to state (avoid duplicates)
        setMessages(prev => {
          if (prev.some(m => m._id === message._id)) return prev;

          // Transform to UI format
          const transformedMessage = {
            _id: message._id,
            message_body: message.message_body,
            sender_name: message.is_split_bot ? 'Split Bot' : message.sender_name,
            sender_avatar: message.sender_avatar,
            sender_type: message.is_split_bot ? 'splitbot' :
              (message.sender_id === payload.payload?.host_user ? 'host' : 'guest'),
            is_outgoing: message.sender_id === user?.bubbleId,
            timestamp: new Date(message.created_at).toLocaleString('en-US', {
              month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
            }),
            call_to_action: message.call_to_action ? {
              type: message.call_to_action,
              message: 'View Details'
            } : undefined,
            split_bot_warning: message.split_bot_warning,
          };

          return [...prev, transformedMessage];
        });
      }
    });

    // Listen for typing indicators
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const typingUsers = Object.values(state)
        .flat()
        .filter(u => u.typing && u.user_id !== user?.bubbleId);

      if (typingUsers.length > 0) {
        setIsOtherUserTyping(true);
        setTypingUserName(typingUsers[0].user_name);
      } else {
        setIsOtherUserTyping(false);
        setTypingUserName(null);
      }
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        console.log('[Realtime] Subscribed to channel:', channelName);
      }
    });

    channelRef.current = channel;

    // Cleanup
    return () => {
      console.log('[Realtime] Unsubscribing from channel:', channelName);
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [selectedThread?._id, authState.isChecking, user?.bubbleId]);

  // ============================================
  // TYPING INDICATOR
  // ============================================

  /**
   * Track typing state via Presence
   */
  const trackTyping = useCallback(async (isTyping) => {
    if (!channelRef.current || !user) return;

    try {
      await channelRef.current.track({
        user_id: user.bubbleId,
        user_name: user.firstName || 'User',
        typing: isTyping,
        typing_at: isTyping ? new Date().toISOString() : null,
      });
    } catch (err) {
      console.error('[Realtime] Failed to track typing:', err);
    }
  }, [user]);

  /**
   * Handle message input change with typing indicator
   */
  const handleMessageInputChange = useCallback((value) => {
    if (value.length <= 1000) {
      setMessageInput(value);

      // Track typing
      trackTyping(true);

      // Clear typing after 2 seconds of no input
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        trackTyping(false);
      }, 2000);
    }
  }, [trackTyping]);

  /**
   * Send message - clears typing indicator
   */
  const handleSendMessage = useCallback(async () => {
    if (!messageInput.trim() || !selectedThread || isSending) return;

    // Clear typing indicator
    trackTyping(false);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // ... existing send logic ...
    // Note: No need to refetch - Realtime will deliver the message
  }, [messageInput, selectedThread, isSending, trackTyping]);

  // ============================================
  // RETURN HOOK API (extended)
  // ============================================
  return {
    // ... existing returns ...

    // NEW: Realtime state
    isOtherUserTyping,
    typingUserName,
  };
}
```

### New Component: `app/src/islands/pages/MessagingPage/components/TypingIndicator.jsx`

```jsx
/**
 * TypingIndicator
 * Shows when another user is typing in the thread
 */

export function TypingIndicator({ userName }) {
  if (!userName) return null;

  return (
    <div className="typing-indicator">
      <span className="typing-dots">
        <span></span>
        <span></span>
        <span></span>
      </span>
      <span className="typing-text">{userName} is typing...</span>
    </div>
  );
}
```

### CSS Addition: `app/src/styles/components/messaging.css`

```css
/* Typing Indicator */
.typing-indicator {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  color: var(--color-text-secondary);
  font-size: 0.875rem;
}

.typing-dots {
  display: inline-flex;
  gap: 4px;
  margin-right: 8px;
}

.typing-dots span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: var(--color-primary-purple);
  animation: typingBounce 1.4s infinite ease-in-out both;
}

.typing-dots span:nth-child(1) { animation-delay: -0.32s; }
.typing-dots span:nth-child(2) { animation-delay: -0.16s; }

@keyframes typingBounce {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
}
```

---

## Implementation Phases

### Phase 1: Database Setup (Day 1)

| Task | Description | Time |
|------|-------------|------|
| 1.1 | Create RLS helper function `auth.get_user_bubble_id()` | 15 min |
| 1.2 | Enable RLS on `thread`, `_message`, `multimessage` | 15 min |
| 1.3 | Create RLS policies for thread table | 30 min |
| 1.4 | Create RLS policies for message table | 30 min |
| 1.5 | Create broadcast trigger for new messages | 30 min |
| 1.6 | Create thread update trigger | 15 min |
| 1.7 | Create junction helper function | 15 min |
| 1.8 | Test migrations | 30 min |

**Estimated**: 3 hours

### Phase 2: Edge Function Updates (Day 1-2)

| Task | Description | Time |
|------|-------------|------|
| 2.1 | Create `messagingHelpers.ts` shared module | 1 hour |
| 2.2 | Update `sendMessage.ts` to use native creation | 1 hour |
| 2.3 | Update `getThreads.ts` (if needed) | 30 min |
| 2.4 | Update `getMessages.ts` (if needed) | 30 min |
| 2.5 | Add new action: `create_thread` | 1 hour |
| 2.6 | Test Edge Functions locally | 1 hour |
| 2.7 | Deploy Edge Functions | 30 min |

**Estimated**: 5.5 hours

### Phase 3: Frontend Realtime Integration (Day 2)

| Task | Description | Time |
|------|-------------|------|
| 3.1 | Add Realtime subscription to `useMessagingPageLogic.js` | 1 hour |
| 3.2 | Add typing indicator via Presence | 1 hour |
| 3.3 | Create `TypingIndicator` component | 30 min |
| 3.4 | Add CSS for typing indicator | 15 min |
| 3.5 | Update `MessageThread` to show typing | 30 min |
| 3.6 | Test real-time message delivery | 1 hour |
| 3.7 | Test typing indicators | 30 min |

**Estimated**: 5 hours

### Phase 4: Testing & Verification (Day 3)

| Task | Description | Time |
|------|-------------|------|
| 4.1 | Test RLS policies with different users | 1 hour |
| 4.2 | Test message creation flow end-to-end | 1 hour |
| 4.3 | Test thread creation flow | 30 min |
| 4.4 | Test real-time delivery between users | 1 hour |
| 4.5 | Test typing indicators between users | 30 min |
| 4.6 | Test error scenarios | 30 min |
| 4.7 | Performance testing | 30 min |

**Estimated**: 5 hours

---

## Migration Strategy

### Backward Compatibility

The implementation maintains backward compatibility:

1. **Existing threads remain accessible** - No schema changes to existing data
2. **Existing messages remain accessible** - RLS policies allow reading
3. **Bubble sync can continue** - If Bubble creates messages, they'll work
4. **Gradual rollout** - Can feature-flag native vs Bubble creation

### Rollback Plan

If issues arise:

1. **Disable triggers** (keeps messages working, just no real-time)
   ```sql
   DROP TRIGGER IF EXISTS trigger_broadcast_new_message ON public._message;
   DROP TRIGGER IF EXISTS trigger_update_thread_on_message ON public._message;
   ```

2. **Revert sendMessage.ts** to use `BubbleSyncService.triggerWorkflowOnly()`

3. **Disable RLS** (last resort)
   ```sql
   ALTER TABLE public.thread DISABLE ROW LEVEL SECURITY;
   ALTER TABLE public._message DISABLE ROW LEVEL SECURITY;
   ```

---

## Security Considerations

### RLS Policy Summary

| Operation | Thread | Message |
|-----------|--------|---------|
| SELECT | User is host OR guest | User is participant AND message is visible |
| INSERT | User is host, guest, OR creator | User is participant AND is sender |
| UPDATE | User is host OR guest | User is participant |
| DELETE | Not allowed | Not allowed |

### Authorization Flow

```
1. User authenticates → auth.uid() (UUID)
2. auth.get_user_bubble_id() → Looks up user._id by email
3. RLS policy → Checks user._id against thread/message ownership
4. Realtime channel → Private channel requires RLS pass
```

---

## File References

### Files to Create

| File | Purpose |
|------|---------|
| `supabase/functions/_shared/messagingHelpers.ts` | Native messaging helper functions |
| `app/src/islands/pages/MessagingPage/components/TypingIndicator.jsx` | Typing indicator component |

### Files to Modify

| File | Changes |
|------|---------|
| [supabase/functions/messages/handlers/sendMessage.ts](../../../supabase/functions/messages/handlers/sendMessage.ts) | Replace Bubble workflow with native creation |
| [app/src/islands/pages/MessagingPage/useMessagingPageLogic.js](../../../app/src/islands/pages/MessagingPage/useMessagingPageLogic.js) | Add Realtime subscriptions |
| [app/src/islands/pages/MessagingPage/components/MessageThread.jsx](../../../app/src/islands/pages/MessagingPage/components/MessageThread.jsx) | Add typing indicator display |
| [app/src/styles/components/messaging.css](../../../app/src/styles/components/messaging.css) | Add typing indicator styles |

### Database Migrations

| Migration | Purpose |
|-----------|---------|
| `001_enable_messaging_rls.sql` | Enable RLS on tables |
| `002_messaging_rls_policies.sql` | Create RLS policies |
| `003_realtime_message_broadcast.sql` | Create broadcast trigger |
| `004_thread_update_trigger.sql` | Create thread update trigger |
| `005_messaging_junction_helpers.sql` | Create helper functions |

---

## Acceptance Criteria

### Must Have
- [ ] Messages created directly in Supabase (no Bubble)
- [ ] Real-time message delivery via Broadcast
- [ ] RLS policies secure messaging tables
- [ ] Existing threads/messages remain accessible
- [ ] User can only see their own threads/messages

### Should Have
- [ ] Typing indicators working
- [ ] Thread auto-updates with last message
- [ ] Junction tables updated on thread creation
- [ ] Error handling for all failure modes

### Nice to Have
- [ ] Online/offline status
- [ ] Message read receipts in real-time
- [ ] New thread creation from frontend

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| RLS policies too restrictive | Medium | High | Test thoroughly with multiple users |
| Broadcast trigger fails | Low | Medium | Messages still created, just no real-time |
| Email-based auth mapping fails | Low | High | Validate email matching in tests |
| Performance degradation | Low | Medium | Use service_role for Edge Functions |

---

## Estimated Total Effort

| Phase | Time |
|-------|------|
| Phase 1: Database Setup | 3 hours |
| Phase 2: Edge Functions | 5.5 hours |
| Phase 3: Frontend | 5 hours |
| Phase 4: Testing | 5 hours |
| **Total** | **~18.5 hours (3 days)** |

---

**Plan Status**: READY FOR IMPLEMENTATION
**Next Action**: Execute Phase 1 - Database Setup
