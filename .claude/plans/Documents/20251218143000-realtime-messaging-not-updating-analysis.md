# Real-Time Messaging Not Updating - Root Cause Analysis

**Date**: 2025-12-18
**Status**: Analysis Complete
**Symptom**: Messages land correctly in database but don't appear in UI until page refresh

---

## Executive Summary

The messaging system uses Supabase Realtime with a **server-to-client broadcast pattern** via database triggers. The issue is that `realtime.send()` from the `broadcast_new_message` trigger is either:
1. Not properly configured in the Supabase project
2. Failing silently due to the error handling
3. Not reaching subscribed clients due to channel authorization issues

---

## Architecture

### Components Involved

| Component | Location | Purpose |
|-----------|----------|---------|
| Messages Edge Function | `supabase/functions/messages/` | Handles message CRUD operations |
| sendMessage handler | `supabase/functions/messages/handlers/sendMessage.ts` | Creates messages in `_message` table |
| messagingHelpers | `supabase/functions/_shared/messagingHelpers.ts` | Native Supabase message/thread creation |
| broadcast_new_message | Database trigger function | Broadcasts new messages to Realtime channels |
| MessagingPage | `app/src/islands/pages/MessagingPage/` | React UI for messaging |
| useMessagingPageLogic | `app/src/islands/pages/MessagingPage/useMessagingPageLogic.js` | Hollow component hook with Realtime subscription |

### Message Flow

```
1. User types message → MessageInput.jsx
         ↓
2. handleSendMessage() → useMessagingPageLogic.js:464-528
         ↓
3. supabase.functions.invoke('messages', { action: 'send_message' })
         ↓
4. handleSendMessage() → sendMessage.ts:48-144
         ↓
5. createMessage() → messagingHelpers.ts:221-271
         ↓
6. INSERT into _message table
         ↓
7. Database trigger: trigger_broadcast_new_message
         ↓
8. broadcast_new_message() PostgreSQL function
         ↓
9. realtime.send(payload, 'new_message', 'thread-{id}', false)
         ↓
[DISCONNECT POINT]
         ↓
10. Client: supabase.channel('thread-{id}').on('broadcast', ...)
         ↓
11. setMessages(prev => [...prev, newMessage])
```

---

## Database Trigger Analysis

### trigger_broadcast_new_message

```sql
CREATE TRIGGER trigger_broadcast_new_message
AFTER INSERT ON _message
FOR EACH ROW
EXECUTE FUNCTION broadcast_new_message();
```

### broadcast_new_message() Function

```sql
CREATE OR REPLACE FUNCTION public.broadcast_new_message()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  thread_record RECORD;
  sender_record RECORD;
  channel_name TEXT;
  broadcast_payload JSONB;
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

  -- Build channel name
  channel_name := 'thread-' || NEW."Associated Thread/Conversation";

  -- Build broadcast payload
  broadcast_payload := jsonb_build_object(
    'type', 'new_message',
    'message', jsonb_build_object(
      '_id', NEW._id,
      'thread_id', NEW."Associated Thread/Conversation",
      'message_body', NEW."Message Body",
      'sender_id', NEW."-Originator User",
      'sender_name', COALESCE(sender_record."First Name", '') || ' ' || COALESCE(sender_record."Last Name", ''),
      'sender_avatar', sender_record."Profile Photo",
      'is_split_bot', COALESCE(NEW."is Split Bot", false),
      'created_at', NEW."Created Date",
      'call_to_action', NEW."Call to Action",
      'split_bot_warning', NEW."Split Bot Warning"
    ),
    'host_user', thread_record."-Host User",
    'guest_user', thread_record."-Guest User"
  );

  -- Broadcast to thread-specific channel using realtime.send
  PERFORM realtime.send(
    broadcast_payload,
    'new_message',
    channel_name,
    false  -- private = false (public channel)
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the insert
    RAISE WARNING 'broadcast_new_message failed: %', SQLERRM;
    RETURN NEW;
END;
$function$
```

**Critical Observation**: The EXCEPTION block silently swallows errors. If `realtime.send()` fails, the message INSERT succeeds but no broadcast occurs.

---

## Frontend Subscription Analysis

### Location: useMessagingPageLogic.js:162-245

```javascript
useEffect(() => {
  if (!selectedThread || authState.isChecking || !user?.bubbleId) return;

  const channelName = `thread-${selectedThread._id}`;
  console.log('[Realtime] Subscribing to channel:', channelName);

  const channel = supabase.channel(channelName);

  // Listen for new messages via broadcast
  channel.on('broadcast', { event: 'new_message' }, (payload) => {
    console.log('[Realtime] New message received:', payload);

    const messageData = payload.payload?.message;
    if (messageData && messageData.thread_id === selectedThread._id) {
      setMessages(prev => {
        if (prev.some(m => m._id === messageData._id)) return prev;
        // ... transform and add message
        return [...prev, transformedMessage];
      });
    }
  });

  // Subscribe
  channel.subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      console.log('[Realtime] Subscribed to channel:', channelName);
      // Track presence
      await channel.track({...});
    }
  });

  channelRef.current = channel;

  return () => {
    channel.unsubscribe();
  };
}, [selectedThread?._id, authState.isChecking, user?.bubbleId]);
```

**Issues Identified**:
1. No error handling for subscription failures (`'TIMED_OUT'`, `'CHANNEL_ERROR'`)
2. No retry logic if subscription fails
3. Depends on `realtime.send()` working correctly on server side

---

## Potential Root Causes

### Cause #1: `realtime.send()` Not Configured (MOST LIKELY)

The `realtime.send()` function is a Supabase-specific extension for server-to-client broadcasts. Requirements:
- Realtime extension must be enabled
- The `realtime` schema must have the `send()` function
- Supabase project settings must allow database-triggered broadcasts

**Diagnosis**: Check Postgres logs for `WARNING: broadcast_new_message failed:` messages.

### Cause #2: Channel Authorization Mismatch

The 4th parameter `false` means the channel is public. However:
- Client channels might have different authorization requirements
- RLS policies on the messaging tables might affect channel access

### Cause #3: Subscription Timing Issue

The subscription might not be fully established before messages arrive:
1. User selects thread
2. `useEffect` triggers subscription
3. Message sent before `'SUBSCRIBED'` status received
4. Broadcast arrives but channel not ready

### Cause #4: Payload Structure Mismatch

Client expects:
```javascript
payload.payload?.message
```

Server sends:
```javascript
{
  'type': 'new_message',
  'message': {...},
  'host_user': '...',
  'guest_user': '...'
}
```

This looks correct, but the nesting should be verified.

---

## Diagnostic Steps

### Step 1: Check Browser Console

When user B sends a message, user A's console should show:
```
[Realtime] Subscribed to channel: thread-{id}
[Realtime] New message received: {...}
```

If `[Realtime] New message received:` never appears, the broadcast isn't reaching clients.

### Step 2: Check Supabase Logs

In Supabase Dashboard → Logs → Postgres Logs, search for:
```
broadcast_new_message failed
```

### Step 3: Verify realtime.send() Function Exists

```sql
SELECT proname, prosrc
FROM pg_proc
WHERE pronamespace = 'realtime'::regnamespace
AND proname = 'send';
```

### Step 4: Test Channel Subscription Manually

In browser console on messaging page:
```javascript
const testChannel = supabase.channel('thread-TEST');
testChannel.on('broadcast', { event: 'test' }, (p) => console.log('GOT:', p));
testChannel.subscribe((status) => {
  console.log('Status:', status);
  if (status === 'SUBSCRIBED') {
    testChannel.send({ type: 'broadcast', event: 'test', payload: { foo: 'bar' }});
  }
});
```

If this works, client-to-client broadcast is functional.

### Step 5: Test Server-Side Broadcast

In Supabase SQL Editor:
```sql
SELECT realtime.send(
  '{"test": "hello"}'::jsonb,
  'test_event',
  'test_channel',
  false
);
```

Check if any client subscribed to `test_channel` receives the message.

---

## Recommended Fixes

### Option A: Fix `realtime.send()` Configuration (Preferred)

1. Verify `realtime.send()` function exists and is accessible
2. Check Supabase project Realtime settings
3. Enable database-triggered broadcasts if disabled
4. Add logging to trace broadcast success

### Option B: Use Postgres LISTEN/NOTIFY + Edge Function

Replace database trigger with:
1. `NOTIFY` in trigger
2. Edge Function listens via `pg_listen`
3. Edge Function broadcasts to Realtime channel

### Option C: Client-Side Polling Fallback

Add a polling mechanism as backup:
```javascript
const pollInterval = setInterval(() => {
  if (!document.hidden) {
    fetchMessages(selectedThread._id);
  }
}, 30000); // Every 30 seconds
```

### Option D: Use Postgres Changes Instead of Broadcast

Subscribe to INSERT events on `_message` table:
```javascript
supabase
  .channel('messages-changes')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: '_message',
    filter: `"Associated Thread/Conversation"=eq.${threadId}`
  }, (payload) => {
    // Handle new message
  })
  .subscribe();
```

This requires adding `_message` to Realtime publication.

---

## Files Referenced

- `supabase/functions/messages/index.ts` - Edge function router
- `supabase/functions/messages/handlers/sendMessage.ts` - Message creation
- `supabase/functions/_shared/messagingHelpers.ts` - Database operations
- `app/src/islands/pages/MessagingPage/useMessagingPageLogic.js` - Frontend Realtime subscription
- `app/src/islands/pages/MessagingPage/MessagingPage.jsx` - UI component
- Database function: `broadcast_new_message()`

---

## Next Steps

1. **Immediate**: Run diagnostic steps 1-5 to identify exact failure point
2. **If `realtime.send()` is broken**: Implement Option D (Postgres Changes)
3. **Add error handling**: Update subscription callback to handle failures
4. **Add logging**: Temporarily log `realtime.send()` results to Slack or Supabase logs

---

## Schema Context

### _message Table Triggers
```sql
trigger_broadcast_new_message -- Broadcasts to Realtime
trigger_populate_thread_message_junction -- Populates junction table
trigger_update_thread_on_message -- Updates thread's last message
```

### RLS Policies on _message
- `service_role_full_access_message` - Full access for service role
- `users_create_messages` - Authenticated users can create if host/guest
- `users_read_visible_messages` - Visibility controlled by host/guest flags
- `users_update_messages` - Authenticated users can update if host/guest
