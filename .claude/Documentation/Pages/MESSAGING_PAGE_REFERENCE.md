# Messaging Page - Complete Reference

**GENERATED**: 2025-12-18
**PAGE_URL**: `/messages` or `/messages?thread={threadId}`
**ENTRY_POINT**: `app/src/messages.jsx`

---

## ### AUTHENTICATION ###

**IMPORTANT**: This page requires authenticated users (Host OR Guest).

### Access Control Matrix
| Condition | Action | Redirect Target |
|-----------|--------|-----------------|
| Not logged in | Redirect to home with login modal | `/?login=true` |
| Token invalid | Redirect to home with login modal | `/?login=true` |
| No valid session | Redirect to home with login modal | `/?login=true` |
| Logged in (any type) | Show messaging page | N/A |

### Auth State Object
```javascript
const [authState, setAuthState] = useState({
  isChecking: true,      // Currently validating auth
  shouldRedirect: false  // Redirect triggered
});
```

### Auth Check Flow (Gold Standard Pattern)
```
1. Page loads -> authState.isChecking = true
2. Step 1: Lightweight auth check (checkAuthStatus)
   |- Not authenticated -> redirect to /?login=true
   |- Authenticated -> continue to Step 2
3. Step 2: Validate token AND fetch user data (validateTokenAndFetchUser)
   |- Token invalid -> fallback to session metadata
   |- Valid -> set user state with bubbleId, firstName, etc.
4. Fetch threads after auth confirmed
5. Set authState.isChecking = false
```

### Key Auth Functions Used
```javascript
import { checkAuthStatus, validateTokenAndFetchUser, getFirstName, getAvatarUrl } from 'lib/auth.js';
import { getUserId } from 'lib/secureStorage.js';
import { supabase } from 'lib/supabase.js';

// Step 1: Lightweight check
const isAuthenticated = await checkAuthStatus();

// Step 2: Validate token AND fetch user data
const userData = await validateTokenAndFetchUser({ clearOnFailure: false });

// Fallback to session if profile fetch fails
const { data: { session } } = await supabase.auth.getSession();
```

---

## ### ARCHITECTURE_OVERVIEW ###

```
messages.jsx (Entry Point)
    |
    +-- MessagingPage.jsx (Hollow Component)
            |
            +-- useMessagingPageLogic.js (Business Logic Hook)
            |       +-- Gold standard auth (checkAuthStatus + validateTokenAndFetchUser)
            |       +-- User ID from session (bubbleId)
            |       +-- Thread fetching via direct Supabase query
            |       +-- Message fetching via Edge Function
            |       +-- Real-time subscription via postgres_changes
            |       +-- Typing indicators via Presence
            |       +-- Optimistic message sending
            |
            +-- UI Components
                +-- Header.jsx (Site navigation)
                +-- ThreadSidebar.jsx (Thread list)
                +-- MessageThread.jsx (Message display)
                |       +-- ThreadHeader.jsx (Contact info)
                |       +-- MessageBubble.jsx (Individual messages)
                |       +-- TypingIndicator.jsx (Typing status)
                +-- MessageInput.jsx (Compose message)
```

---

## ### FILE_INVENTORY ###

### Entry Point
| File | Purpose |
|------|---------|
| `app/src/messages.jsx` | Mounts MessagingPage to #root, imports CSS |

### Page Components
| File | Purpose |
|------|---------|
| `app/src/islands/pages/MessagingPage/MessagingPage.jsx` | Main hollow component with LoadingState, ErrorState, EmptyState |
| `app/src/islands/pages/MessagingPage/useMessagingPageLogic.js` | Core business logic hook with Realtime subscription |

### Sub-Components
| File | Purpose |
|------|---------|
| `app/src/islands/pages/MessagingPage/components/ThreadSidebar.jsx` | Thread list with contact info and preview |
| `app/src/islands/pages/MessagingPage/components/ThreadCard.jsx` | Individual thread card in sidebar |
| `app/src/islands/pages/MessagingPage/components/MessageThread.jsx` | Message display container with auto-scroll |
| `app/src/islands/pages/MessagingPage/components/MessageBubble.jsx` | Individual message bubble with sender info |
| `app/src/islands/pages/MessagingPage/components/MessageInput.jsx` | Message compose input with send button |
| `app/src/islands/pages/MessagingPage/components/ThreadHeader.jsx` | Thread header with contact info and back button |
| `app/src/islands/pages/MessagingPage/components/TypingIndicator.jsx` | Animated typing indicator |
| `app/src/islands/pages/MessagingPage/components/index.js` | Component exports |

### Edge Function
| File | Purpose |
|------|---------|
| `supabase/functions/messages/index.ts` | Main router for messaging actions |
| `supabase/functions/messages/handlers/sendMessage.ts` | Create message in thread (requires auth) |
| `supabase/functions/messages/handlers/getMessages.ts` | Fetch messages for thread (requires auth) |
| `supabase/functions/messages/handlers/sendGuestInquiry.ts` | Contact host without auth |
| `supabase/functions/messages/deno.json` | Deno configuration |

### Shared Utilities
| File | Purpose |
|------|---------|
| `supabase/functions/_shared/messagingHelpers.ts` | Native Supabase message/thread CRUD |

### Styles
| File | Purpose |
|------|---------|
| `app/src/styles/components/messaging.css` | Complete page styling |

---

## ### URL_ROUTING ###

```
/messages                    # All threads for logged-in user
/messages?thread={id}        # Pre-select specific thread
```

**Note**: User ID is NOT in URL. User is identified via authenticated session.

### URL Parameter Sync
The hook automatically syncs the selected thread to the URL:
```javascript
// On thread selection
const params = new URLSearchParams(window.location.search);
params.set('thread', thread._id);
window.history.replaceState({}, '', `?${params.toString()}`);
```

---

## ### REAL-TIME SYSTEM ###

### Architecture Overview
```
+------------------------------------------------------------------+
|                     REAL-TIME MESSAGE FLOW                        |
+------------------------------------------------------------------+
|                                                                   |
|  1. User sends message                                            |
|         ↓                                                         |
|  2. Edge Function: messages → send_message                        |
|         ↓                                                         |
|  3. messagingHelpers.createMessage() → INSERT into _message       |
|         ↓                                                         |
|  4. Database triggers fire:                                       |
|     - trigger_broadcast_new_message (legacy, not used)            |
|     - trigger_update_thread_on_message                            |
|     - trigger_populate_thread_message_junction                    |
|         ↓                                                         |
|  5. Supabase Realtime detects INSERT via postgres_changes         |
|         ↓                                                         |
|  6. Client subscription receives payload.new (the inserted row)   |
|         ↓                                                         |
|  7. Frontend transforms row and adds to messages state            |
|                                                                   |
+------------------------------------------------------------------+
```

### CRITICAL: Realtime Configuration Requirements

**The `_message` table MUST have Realtime enabled in Supabase Dashboard:**
1. Go to **Database → Replication**
2. Enable the `_message` table for Realtime

**Why**: The subscription uses `postgres_changes` which requires the table to be in the Realtime publication.

### Frontend Subscription (useMessagingPageLogic.js)
```javascript
// Subscribe to postgres_changes for INSERT events on _message table
const channel = supabase.channel(`messages-${selectedThread._id}`);

channel.on(
  'postgres_changes',
  {
    event: 'INSERT',
    schema: 'public',
    table: '_message'
    // NOTE: Filter removed - column name with special characters doesn't work
    // Client-side filtering is done instead
  },
  (payload) => {
    const newRow = payload.new;

    // Client-side filter for this thread
    if (newRow['Associated Thread/Conversation'] !== selectedThread._id) {
      return;
    }

    // Transform and add to state
    setMessages(prev => [...prev, transformedMessage]);
  }
);

channel.subscribe();
```

### Why postgres_changes Instead of broadcast

| Approach | Status | Reason |
|----------|--------|--------|
| `broadcast` via `realtime.send()` | ❌ Failed | Server-side `realtime.send()` wasn't reaching clients |
| `postgres_changes` | ✅ Works | Hooks directly into PostgreSQL logical replication |

The database has a `broadcast_new_message` trigger that calls `realtime.send()`, but this server-to-client broadcast wasn't working. The `postgres_changes` approach is more reliable as it uses Postgres's native replication.

### Filter Limitation

**IMPORTANT**: Supabase Realtime filters don't work well with column names containing special characters like `"Associated Thread/Conversation"`. The filter is applied client-side instead:

```javascript
// Server-side filter (DOESN'T WORK with special chars):
// filter: `"Associated Thread/Conversation"=eq.${threadId}`

// Client-side filter (WORKS):
if (newRow['Associated Thread/Conversation'] !== selectedThread._id) {
  console.log('[Realtime] Message is for different thread, ignoring');
  return;
}
```

### Typing Indicators (Presence)

```javascript
// Track typing state
channel.on('presence', { event: 'sync' }, () => {
  const state = channel.presenceState();
  const typingUsers = Object.values(state)
    .flat()
    .filter(u => u.typing && u.user_id !== user?.bubbleId);

  if (typingUsers.length > 0) {
    setIsOtherUserTyping(true);
    setTypingUserName(typingUsers[0].user_name);
  }
});

// Update typing status
await channel.track({
  user_id: user.bubbleId,
  user_name: user.firstName,
  typing: true,
  online_at: new Date().toISOString(),
});
```

---

## ### EDGE_FUNCTION_ACTIONS ###

### Request Format
```javascript
{
  action: 'send_message' | 'get_messages' | 'send_guest_inquiry',
  payload: { ... }
}
```

### Action: send_message (Requires Auth)
```javascript
// Request
{
  action: 'send_message',
  payload: {
    thread_id: string,           // Optional if creating new thread
    message_body: string,        // Required
    recipient_user_id?: string,  // Required if no thread_id
    listing_id?: string,         // Optional
    splitbot?: boolean,          // Optional
    call_to_action?: string,     // Optional
    split_bot_warning?: string   // Optional
  }
}

// Response
{
  success: true,
  data: {
    message_id: string,
    thread_id: string,
    is_new_thread: boolean,
    timestamp: string
  }
}
```

### Action: get_messages (Requires Auth)
```javascript
// Request
{
  action: 'get_messages',
  payload: {
    thread_id: string,  // Required
    limit?: number,     // Default: 50
    offset?: number     // Default: 0
  }
}

// Response
{
  success: true,
  data: {
    messages: Message[],
    has_more: boolean,
    thread_info: {
      contact_name: string,
      contact_avatar?: string,
      property_name?: string,
      status?: string,
      status_type?: string
    }
  }
}
```

### Action: send_guest_inquiry (No Auth Required)
```javascript
// Request
{
  action: 'send_guest_inquiry',
  payload: {
    sender_name: string,        // Required
    sender_email: string,       // Required
    message_body: string,       // Required
    recipient_user_id: string,  // Required (host's user._id)
    listing_id?: string         // Optional
  }
}

// Response
{
  success: true,
  data: {
    inquiry_id: string,
    timestamp: string
  }
}
```

---

## ### DATABASE_SCHEMA ###

### thread Table
```sql
CREATE TABLE public.thread (
  _id text PRIMARY KEY,
  "Participants" jsonb,
  "Listing" text REFERENCES listing(_id),
  "Created Date" timestamp with time zone,
  "Modified Date" timestamp with time zone,
  "Thread Subject" text,
  "Created By" text REFERENCES "user"(_id),
  "-Guest User" text,
  "-Host User" text,
  "~Last Message" text,
  "~Date Last Message" timestamp with time zone,
  "Proposal" text REFERENCES proposal(_id),
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
```

### _message Table
```sql
CREATE TABLE public._message (
  _id text PRIMARY KEY,
  "-Guest User" text REFERENCES "user"(_id),
  "-Host User" text REFERENCES "user"(_id),
  "-Originator User" text REFERENCES "user"(_id),
  "Associated Thread/Conversation" text REFERENCES thread(_id),
  "Call to Action" text,
  "Communication Mode" text,
  "Created By" text REFERENCES "user"(_id),
  "Created Date" timestamp with time zone NOT NULL,
  "Message Body" text,
  "Modified Date" timestamp with time zone NOT NULL,
  "Split Bot Warning" text,
  "Unread Users" jsonb,
  "is Forwarded" boolean NOT NULL,
  "is Split Bot" boolean NOT NULL,
  "is Visible to Guest" boolean,
  "is Visible to Host" boolean,
  "is deleted (is hidden)" boolean,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  pending boolean DEFAULT false,
  bubble_id text UNIQUE
);
```

### Database Triggers on _message
| Trigger | Function | Purpose |
|---------|----------|---------|
| `trigger_broadcast_new_message` | `broadcast_new_message()` | Legacy: Broadcasts via `realtime.send()` (not working) |
| `trigger_update_thread_on_message` | `update_thread_on_message()` | Updates thread's `~Last Message` and `~Date Last Message` |
| `trigger_populate_thread_message_junction` | `populate_thread_message_junction()` | Populates junction table |

### RLS Policies on _message
| Policy | Roles | Command | Logic |
|--------|-------|---------|-------|
| `service_role_full_access_message` | service_role | ALL | Full access |
| `users_create_messages` | authenticated | INSERT | User must be host or guest AND originator |
| `users_read_visible_messages` | authenticated | SELECT | Host sees if `is Visible to Host = true`, Guest sees if `is Visible to Guest = true` |
| `users_update_messages` | authenticated | UPDATE | User must be host or guest |

---

## ### DATA_FLOW ###

### Complete Data Flow
```
1. Auth Check (Gold Standard Pattern)
   |- checkAuthStatus() -> validateTokenAndFetchUser()
   |- Fallback to session metadata if profile fetch fails

2. Get User ID from Session
   |- getUserId() from secure storage
   |- Or from Supabase session metadata

3. Fetch Threads (Direct Supabase Query)
   |- SELECT from thread WHERE host or guest = user
   |- Batch fetch contacts from user table
   |- Batch fetch listings from listing table
   |- Transform to UI format

4. User Selects Thread
   |- Update URL with ?thread={id}
   |- Subscribe to Realtime channel
   |- Fetch messages via Edge Function

5. Fetch Messages (Edge Function)
   |- supabase.functions.invoke('messages', { action: 'get_messages' })
   |- Returns messages + thread_info

6. Real-time Updates
   |- postgres_changes subscription receives INSERTs
   |- Transform and add to messages state
   |- Auto-scroll to bottom
```

### Thread Fetch Query (Direct Supabase)
```javascript
const { data: threads } = await supabase
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
  .or(`"-Host User".eq.${bubbleId},"-Guest User".eq.${bubbleId}`)
  .order('"Modified Date"', { ascending: false });
```

### Message Transformation (postgres_changes)
```javascript
const transformedMessage = {
  _id: newRow._id,
  message_body: newRow['Message Body'],
  sender_name: newRow['is Split Bot'] ? 'Split Bot' :
    (isOwnMessage ? 'You' : selectedThread.contact_name),
  sender_avatar: isOwnMessage ? user?.profilePhoto : undefined,
  sender_type: newRow['is Split Bot'] ? 'splitbot' :
    (newRow['-Originator User'] === newRow['-Host User'] ? 'host' : 'guest'),
  is_outgoing: isOwnMessage,
  timestamp: new Date(newRow['Created Date']).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
  }),
  call_to_action: newRow['Call to Action'] ? {
    type: newRow['Call to Action'],
    message: 'View Details'
  } : undefined,
  split_bot_warning: newRow['Split Bot Warning'],
};
```

---

## ### MESSAGING_HELPERS ###

Located at: `supabase/functions/_shared/messagingHelpers.ts`

### ID Generation
```typescript
// Bubble-compatible ID format: {timestamp}x{random}
export async function generateBubbleId(supabase): Promise<string>
```

### User Lookup
```typescript
// Map email to Bubble ID
export async function getUserBubbleId(supabase, userEmail): Promise<string | null>

// Get user profile by Bubble ID
export async function getUserProfile(supabase, userId): Promise<UserProfile | null>
```

### Thread Operations
```typescript
// Create new thread
export async function createThread(supabase, params: CreateThreadParams): Promise<string>

// Find existing thread between users
export async function findExistingThread(supabase, hostUserId, guestUserId, listingId?): Promise<string | null>

// Get thread by ID
export async function getThread(supabase, threadId): Promise<Thread | null>
```

### Message Operations
```typescript
// Create new message (triggers Realtime broadcast)
export async function createMessage(supabase, params: CreateMessageParams): Promise<string>

// Mark messages as read
export async function markMessagesAsRead(supabase, messageIds, userId): Promise<void>

// Get unread count for user in thread
export async function getUnreadCount(supabase, threadId, userId): Promise<number>
```

---

## ### LAYOUT_STRUCTURE ###

### Desktop (> 900px)
```
+------------------------------------------------------------------+
| HEADER                                                            |
+------------------------------------------------------------------+
|                                                                   |
| +---------------+  +------------------------------------------+   |
| | THREAD        |  | MESSAGE CONTENT                          |   |
| | SIDEBAR       |  |                                          |   |
| | (30%)         |  | +--------------------------------------+ |   |
| |               |  | | THREAD HEADER                        | |   |
| | [Thread 1]    |  | | Contact Name | Property | Status     | |   |
| | [Thread 2]    |  | +--------------------------------------+ |   |
| | [Thread 3]    |  | |                                      | |   |
| | ...           |  | | MESSAGE BUBBLES                      | |   |
| |               |  | |   [Incoming message]                 | |   |
| |               |  | |              [Outgoing message]      | |   |
| |               |  | |   [Incoming message]                 | |   |
| |               |  | |   [Typing...]                        | |   |
| |               |  | |                                      | |   |
| |               |  | +--------------------------------------+ |   |
| |               |  | | MESSAGE INPUT                        | |   |
| |               |  | | [Type a message...      ] [Send]     | |   |
| +---------------+  +------------------------------------------+   |
|                                                                   |
+------------------------------------------------------------------+
```

### Mobile (≤ 900px) - Two Views

**List View:**
```
+---------------------------+
| HEADER                    |
+---------------------------+
| THREAD SIDEBAR            |
| (Full Width)              |
|                           |
| [Thread 1]                |
| [Thread 2]                |
| [Thread 3]                |
| ...                       |
+---------------------------+
```

**Conversation View:**
```
+---------------------------+
| HEADER                    |
+---------------------------+
| [←] THREAD HEADER         |
+---------------------------+
|                           |
| MESSAGE BUBBLES           |
|   [Incoming message]      |
|        [Outgoing message] |
|   [Typing...]             |
|                           |
+---------------------------+
| MESSAGE INPUT             |
| [Type...        ] [Send]  |
+---------------------------+
```

---

## ### HOOK_RETURN_VALUE ###

```javascript
const {
  // Auth state
  authState,  // { isChecking, shouldRedirect }
  user,       // { id, email, bubbleId, firstName, lastName, profilePhoto }

  // Thread data
  threads,         // Array of thread objects
  selectedThread,  // Currently selected thread
  messages,        // Array of message objects for selected thread
  threadInfo,      // { contact_name, contact_avatar, property_name, status, status_type }

  // UI state
  isLoading,          // Initial loading state
  isLoadingMessages,  // Loading messages for thread
  error,              // Error message or null
  messageInput,       // Current message input value
  isSending,          // Sending message in progress

  // Realtime state
  isOtherUserTyping,  // Boolean
  typingUserName,     // Name of typing user

  // Handlers
  handleThreadSelect,       // (thread) => void
  handleMessageInputChange, // (value) => void
  handleSendMessage,        // () => void
  handleRetry,              // () => void
} = useMessagingPageLogic();
```

---

## ### TROUBLESHOOTING ###

| Issue | Check |
|-------|-------|
| Messages not updating in real-time | Verify `_message` table has Realtime enabled in Supabase Dashboard |
| Subscription status: CHANNEL_ERROR | Check RLS policies allow SELECT for authenticated users |
| Subscription status: TIMED_OUT | Network issue or Supabase Realtime service down |
| `[Realtime] postgres_changes event received` not showing | Table not in Realtime publication |
| Typing indicator works but messages don't | Presence channel works; postgres_changes doesn't (enable Realtime on table) |
| Redirected to home | Check auth status, session validity |
| No threads showing | Verify bubbleId matches thread's host/guest |
| Messages not appearing for thread | Check RLS visibility policies |
| Can't send message | Verify auth token is valid, check Edge Function logs |
| Optimistic message duplicate | Deduplication by `_id` in setMessages |

### Console Logs to Look For
```
[Realtime] Subscribing to postgres_changes for thread: ...
[Realtime] Subscription status: SUBSCRIBED
[Realtime] Successfully subscribed to channel: messages-...
[Realtime] postgres_changes event received: {...}
[Realtime] Message is for this thread, processing...
```

### Realtime Debug Steps
1. Check browser console for subscription status
2. Verify `_message` table is in Realtime publication
3. Check RLS policies allow SELECT
4. Test with a simple INSERT in Supabase SQL Editor
5. Check Supabase Dashboard → Realtime → Active Connections

---

## ### RELATED_FILES ###

| Reference | Path |
|-----------|------|
| App CLAUDE.md | `app/CLAUDE.md` |
| Supabase CLAUDE.md | `supabase/CLAUDE.md` |
| Auth Guide | `.claude/Documentation/Auth/AUTH_GUIDE.md` |
| Realtime Analysis | `.claude/plans/Documents/20251218143000-realtime-messaging-not-updating-analysis.md` |

---

## ### KEY_IMPORTS ###

```javascript
// Authentication
import { checkAuthStatus, validateTokenAndFetchUser, getFirstName, getAvatarUrl } from 'lib/auth.js';
import { getUserId } from 'lib/secureStorage.js';
import { supabase } from 'lib/supabase.js';

// Page hook
import { useMessagingPageLogic } from './useMessagingPageLogic.js';

// Components
import ThreadSidebar from './components/ThreadSidebar.jsx';
import MessageThread from './components/MessageThread.jsx';
import MessageInput from './components/MessageInput.jsx';
import MessageBubble from './components/MessageBubble.jsx';
import ThreadHeader from './components/ThreadHeader.jsx';
import TypingIndicator from './components/TypingIndicator.jsx';

// Shared
import Header from '../../shared/Header.jsx';
```

---

**VERSION**: 1.0
**LAST_UPDATED**: 2025-12-18
**STATUS**: Real-time messaging working via postgres_changes (not broadcast)
**MAJOR_CHANGES**:
- Migrated from `broadcast` to `postgres_changes` for reliable real-time updates
- Client-side filtering due to special character column name limitations
- Gold standard auth pattern with fallback to session metadata
- Direct Supabase queries for threads, Edge Function for messages
- Typing indicators via Supabase Presence
- Optimistic message sending with deduplication
