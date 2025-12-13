# Implementation Plan: Messaging App Feature

## Overview

This plan implements a complete messaging feature for Split Lease, including a new Edge Function to handle messaging operations (send_message, get_threads, get_messages) and a visually identical messaging UI following the Islands Architecture pattern. The implementation replicates Bubble's CORE-send-new-message workflow while building a modern two-column messaging interface.

## Success Criteria

- [ ] Edge Function "messages" deployed with actions: send_message, get_threads, get_messages
- [ ] Messaging UI renders with two-column layout (30% sidebar + 70% content)
- [ ] Thread list displays contacts with avatars, names, properties, and message previews
- [ ] Message display shows incoming (light purple) and outgoing (dark purple) bubbles
- [ ] Message input with send button functional
- [ ] All interactive states implemented (hover, active, focus)
- [ ] Responsive design at 900px breakpoint
- [ ] Route /messages with ?thread=THREAD_ID parameter support
- [ ] Authentication required for messaging page

---

## Context & References

### Relevant Files

| File | Purpose | Changes Needed |
|------|---------|----------------|
| `supabase/functions/messages/index.ts` | NEW: Edge Function router | Create with action routing |
| `supabase/functions/messages/handlers/sendMessage.ts` | NEW: Send message handler | Create - replicates Bubble workflow |
| `supabase/functions/messages/handlers/getThreads.ts` | NEW: Get threads handler | Create - fetch user threads |
| `supabase/functions/messages/handlers/getMessages.ts` | NEW: Get messages handler | Create - fetch thread messages |
| `app/public/messages.html` | NEW: HTML entry point | Create with root div |
| `app/src/messages.jsx` | NEW: React entry point | Create - mounts MessagingPage |
| `app/src/islands/pages/MessagingPage/MessagingPage.jsx` | NEW: Page component | Create - hollow component |
| `app/src/islands/pages/MessagingPage/useMessagingPageLogic.js` | NEW: Page logic hook | Create - all business logic |
| `app/src/islands/pages/MessagingPage/components/` | NEW: UI components | Create sidebar, thread, message components |
| `app/src/styles/components/messaging.css` | NEW: Messaging styles | Create with color scheme |
| `app/src/routes.config.js` | Route registry | Add /messages route |
| `app/vite.config.js` | Vite build inputs | Add messages entry |
| `app/public/_headers` | Cloudflare headers | Add Content-Type for /messages |
| `supabase/config.toml` | Edge function config | Add messages function |

### Related Documentation

- [Bubble Workflow](../../../input/messaging/IDE/Backend/Core%20Create%20new%20Message%20bubble%20backend.md) - Source of truth for message creation logic
- [UI Documentation](../../../input/messaging/MESSAGING_APP_DOCUMENTATION.md) - Complete UI structure reference
- [Interactive States](../../../input/messaging/MESSAGING_APP_INTERACTIVE_STATES.md) - Hover, focus, active states
- [Quick Reference](../../../input/messaging/QUICK_REFERENCE.md) - Colors, typography, spacing
- [Routing Guide](../.claude/Documentation/Routing/ROUTING_GUIDE.md) - Route configuration patterns

### Existing Patterns to Follow

1. **Action-Based Routing** (from `bubble-proxy/index.ts`)
   - `{ action, payload }` request pattern
   - Error collector for consolidated Slack reporting
   - Optional auth with PUBLIC_ACTIONS list

2. **Atomic Sync Pattern** (from `_shared/bubbleSync.ts`)
   - Write-Read-Write for Bubble operations
   - BubbleSyncService for workflow triggers

3. **Hollow Component Pattern** (from `GuestProposalsPage.jsx`)
   - Page delegates ALL logic to `useMessagingPageLogic` hook
   - Hook returns state, handlers, and derived data

4. **Islands Architecture** (from existing pages)
   - Independent React root per page
   - Entry point mounts single page component

---

## Implementation Steps

### Step 1: Create Edge Function Router

**Files:** `supabase/functions/messages/index.ts`, `supabase/functions/messages/deno.json`

**Purpose:** Set up the main Edge Function with action-based routing

**Details:**
- Create `/functions/messages/` directory
- Implement router following `bubble-proxy/index.ts` pattern
- Support actions: `send_message`, `get_threads`, `get_messages`
- Authentication required for all actions
- Error collection via `createErrorCollector`

**deno.json:**
```json
{
  "imports": {
    "@supabase/supabase-js": "https://esm.sh/@supabase/supabase-js@2"
  }
}
```

**index.ts structure:**
```typescript
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from '@supabase/supabase-js';
import { corsHeaders } from '../_shared/cors.ts';
import { createErrorCollector } from '../_shared/slack.ts';
import { validateAction, validateRequiredFields } from '../_shared/validation.ts';
import { handleSendMessage } from './handlers/sendMessage.ts';
import { handleGetThreads } from './handlers/getThreads.ts';
import { handleGetMessages } from './handlers/getMessages.ts';

// All actions require auth
const allowedActions = ['send_message', 'get_threads', 'get_messages'];

Deno.serve(async (req) => {
  // CORS, Auth, Action routing...
});
```

**Validation:** Deploy function, test with curl for OPTIONS response

---

### Step 2: Create Send Message Handler

**Files:** `supabase/functions/messages/handlers/sendMessage.ts`

**Purpose:** Replicate Bubble's CORE-send-new-message workflow

**Details:**
- Receive payload: `thread_id`, `message_body`, `sender_id`, `to_guest?`, `splitbot?`, `call_to_action?`
- Trigger Bubble workflow `send-new-message` via `BubbleSyncService.triggerWorkflowOnly`
- Map parameters to Bubble workflow expectations
- Handle Split Bot messages vs user messages
- Return success with message metadata

**Payload Schema:**
```typescript
interface SendMessagePayload {
  thread_id: string;           // Required: Thread/Conversation ID
  message_body: string;        // Required: Message content
  sender_id?: string;          // Optional: Sender user ID (defaults to authenticated user)
  to_guest?: boolean;          // Optional: Is message to guest (default: false)
  splitbot?: boolean;          // Optional: Is Split Bot message (default: false)
  call_to_action?: string;     // Optional: CTA type for system messages
  proposal_id?: string;        // Optional: Associated proposal
  date_change_req_id?: string; // Optional: Associated date change request
  review_id?: string;          // Optional: Associated review
}
```

**Validation:** Test send_message action with valid thread

---

### Step 3: Create Get Threads Handler

**Files:** `supabase/functions/messages/handlers/getThreads.ts`

**Purpose:** Fetch all message threads for authenticated user

**Details:**
- Query Supabase `thread_conversation` table (or equivalent)
- Filter by user ID (as host or guest)
- Include last message preview
- Include unread count
- Sort by most recent activity
- Return thread list with contact info

**Response Schema:**
```typescript
interface ThreadListResponse {
  threads: Array<{
    _id: string;
    contact_name: string;
    contact_avatar?: string;
    property_name?: string;
    last_message_preview: string;
    last_message_time: string;
    unread_count: number;
    is_with_splitbot: boolean;
  }>;
}
```

**Validation:** Test get_threads action, verify thread list returned

---

### Step 4: Create Get Messages Handler

**Files:** `supabase/functions/messages/handlers/getMessages.ts`

**Purpose:** Fetch messages for a specific thread

**Details:**
- Receive payload: `thread_id`, `limit?`, `offset?`
- Query Supabase `message` table for thread
- Filter by visibility (is_visible_to_guest or is_visible_to_host based on user type)
- Include sender info, timestamps, CTAs
- Mark messages as read (remove user from unread_users)
- Return paginated message list

**Response Schema:**
```typescript
interface MessagesResponse {
  messages: Array<{
    _id: string;
    message_body: string;
    sender_name: string;
    sender_avatar?: string;
    sender_type: 'guest' | 'host' | 'splitbot';
    is_outgoing: boolean;       // Relative to authenticated user
    timestamp: string;
    call_to_action?: {
      type: string;
      message: string;
      link?: string;
    };
    split_bot_warning?: string;
  }>;
  has_more: boolean;
  thread_info: {
    contact_name: string;
    property_name?: string;
    status?: string;            // e.g., "Virtual Meeting Declined"
  };
}
```

**Validation:** Test get_messages action with valid thread_id

---

### Step 5: Update Supabase Config

**Files:** `supabase/config.toml`

**Purpose:** Register new Edge Function

**Details:**
- Add `[functions.messages]` section
- Set verify_jwt = false (function handles auth)

```toml
[functions.messages]
verify_jwt = false
```

**Validation:** `supabase functions serve` starts without errors

---

### Step 6: Create Frontend Route Configuration

**Files:** `app/src/routes.config.js`, `app/public/_headers`

**Purpose:** Register /messages route

**Details:**

Add to routes array in `routes.config.js`:
```javascript
{
  path: '/messages',
  file: 'messages.html',
  aliases: ['/messages.html', '/messaging-app'],
  protected: true,
  cloudflareInternal: true,
  internalName: 'messages-view',
  hasDynamicSegment: false
}
```

Add to `_headers`:
```
/messages
  Content-Type: text/html; charset=utf-8
/messages/*
  Content-Type: text/html; charset=utf-8
```

**Validation:** Run `bun run generate-routes`, verify _redirects updated

---

### Step 7: Create HTML Entry Point

**Files:** `app/public/messages.html`

**Purpose:** HTML shell for messaging page

**Details:**
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Messages | Split Lease</title>
  <link rel="icon" type="image/svg+xml" href="/assets/images/favicon.svg" />
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/messages.jsx"></script>
</body>
</html>
```

**Validation:** File exists at correct path

---

### Step 8: Create React Entry Point

**Files:** `app/src/messages.jsx`

**Purpose:** Mount MessagingPage to DOM

**Details:**
```jsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import MessagingPage from './islands/pages/MessagingPage/MessagingPage.jsx';
import './styles/main.css';
import './styles/components/messaging.css';

const root = createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <MessagingPage />
  </React.StrictMode>
);
```

**Validation:** No import errors in development

---

### Step 9: Update Vite Build Configuration

**Files:** `app/vite.config.js`

**Purpose:** Include messages.html in build

**Details:**
Add to `rollupOptions.input`:
```javascript
messages: resolve(__dirname, 'public/messages.html')
```

**Validation:** `bun run build` includes messages.html in dist/

---

### Step 10: Create Messaging Styles

**Files:** `app/src/styles/components/messaging.css`

**Purpose:** Complete styling for messaging UI

**Details:**
- CSS custom properties for colors:
  ```css
  :root {
    --color-message-incoming-bg: #E8D5F7;
    --color-message-outgoing-bg: #2D1B3D;
    --color-message-incoming-text: #1A1A1A;
    --color-message-outgoing-text: #FFFFFF;
    --color-primary-purple: #6B4FA1;
    --color-primary-light: #7C5AC2;
    --color-hover-bg: #F0E6FF;
    --color-alert: #E53E3E;
    --color-border: #CCCCCC;
    --color-text-secondary: #999999;
  }
  ```
- Two-column layout (30% sidebar, 70% content)
- Message bubble styles (incoming/outgoing)
- Thread card hover states
- Input field with send button
- Responsive breakpoint at 900px (stack on mobile)
- All interactive states per INTERACTIVE_STATES.md

**Validation:** Visual inspection matches reference screenshots

---

### Step 11: Create Page Component (Hollow)

**Files:** `app/src/islands/pages/MessagingPage/MessagingPage.jsx`

**Purpose:** Hollow component delegating to logic hook

**Details:**
```jsx
/**
 * Messaging Page
 *
 * Follows Hollow Component Pattern:
 * - This component contains ONLY JSX rendering
 * - ALL business logic is in useMessagingPageLogic hook
 */

import Header from '../../shared/Header.jsx';
import Footer from '../../shared/Footer.jsx';
import { useMessagingPageLogic } from './useMessagingPageLogic.js';
import ThreadSidebar from './components/ThreadSidebar.jsx';
import MessageThread from './components/MessageThread.jsx';
import MessageInput from './components/MessageInput.jsx';

function LoadingState() { /* ... */ }
function ErrorState({ error, onRetry }) { /* ... */ }
function EmptyState() { /* ... */ }

export default function MessagingPage() {
  const {
    // Auth state
    authState,
    user,

    // Thread data
    threads,
    selectedThread,
    messages,
    threadInfo,

    // UI state
    isLoading,
    isLoadingMessages,
    error,
    messageInput,

    // Handlers
    handleThreadSelect,
    handleMessageInputChange,
    handleSendMessage,
    handleRetry,
  } = useMessagingPageLogic();

  // Auth redirect handling
  if (authState.shouldRedirect) {
    return (/* Loading while redirecting */);
  }

  return (
    <>
      <Header />
      <main className="messaging-page">
        {isLoading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState error={error} onRetry={handleRetry} />
        ) : threads.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="messaging-layout">
            <ThreadSidebar
              threads={threads}
              selectedThreadId={selectedThread?._id}
              onThreadSelect={handleThreadSelect}
            />
            <div className="message-content">
              {selectedThread && (
                <>
                  <MessageThread
                    messages={messages}
                    threadInfo={threadInfo}
                    isLoading={isLoadingMessages}
                  />
                  <MessageInput
                    value={messageInput}
                    onChange={handleMessageInputChange}
                    onSend={handleSendMessage}
                    disabled={!selectedThread}
                  />
                </>
              )}
            </div>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
```

**Validation:** Component renders without errors

---

### Step 12: Create Page Logic Hook

**Files:** `app/src/islands/pages/MessagingPage/useMessagingPageLogic.js`

**Purpose:** All business logic for messaging page

**Details:**
- Authentication check (redirect if not logged in)
- Fetch threads on mount via Edge Function
- URL parameter sync (?thread=THREAD_ID)
- Fetch messages when thread selected
- Message sending handler
- Real-time state management

```javascript
import { useState, useEffect, useCallback } from 'react';
import { checkAuthStatus } from '../../../lib/auth.js';
import { supabase } from '../../../lib/supabase.js';

const EDGE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/messages`;

export function useMessagingPageLogic() {
  // Auth state
  const [authState, setAuthState] = useState({ isChecking: true, shouldRedirect: false });
  const [user, setUser] = useState(null);

  // Data state
  const [threads, setThreads] = useState([]);
  const [selectedThread, setSelectedThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [threadInfo, setThreadInfo] = useState(null);

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [error, setError] = useState(null);
  const [messageInput, setMessageInput] = useState('');

  // Auth check on mount
  useEffect(() => {
    async function init() {
      const authResult = await checkAuthStatus();
      if (!authResult.isAuthenticated) {
        setAuthState({ isChecking: false, shouldRedirect: true });
        window.location.href = '/';
        return;
      }
      setUser(authResult.user);
      setAuthState({ isChecking: false, shouldRedirect: false });
      await fetchThreads();
    }
    init();
  }, []);

  // URL param sync for thread selection
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const threadId = params.get('thread');
    if (threadId && threads.length > 0) {
      const thread = threads.find(t => t._id === threadId);
      if (thread) handleThreadSelect(thread);
    }
  }, [threads]);

  // Fetch threads
  async function fetchThreads() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ action: 'get_threads', payload: {} }),
      });
      const result = await response.json();
      if (result.success) {
        setThreads(result.data.threads);
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  // Fetch messages for thread
  async function fetchMessages(threadId) {
    setIsLoadingMessages(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          action: 'get_messages',
          payload: { thread_id: threadId }
        }),
      });
      const result = await response.json();
      if (result.success) {
        setMessages(result.data.messages);
        setThreadInfo(result.data.thread_info);
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoadingMessages(false);
    }
  }

  // Handlers
  const handleThreadSelect = useCallback((thread) => {
    setSelectedThread(thread);
    // Update URL
    const params = new URLSearchParams(window.location.search);
    params.set('thread', thread._id);
    window.history.replaceState({}, '', `?${params.toString()}`);
    // Fetch messages
    fetchMessages(thread._id);
  }, []);

  const handleMessageInputChange = useCallback((value) => {
    setMessageInput(value);
  }, []);

  const handleSendMessage = useCallback(async () => {
    if (!messageInput.trim() || !selectedThread) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          action: 'send_message',
          payload: {
            thread_id: selectedThread._id,
            message_body: messageInput,
          },
        }),
      });
      const result = await response.json();
      if (result.success) {
        setMessageInput('');
        // Refresh messages
        await fetchMessages(selectedThread._id);
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      setError(err.message);
    }
  }, [messageInput, selectedThread]);

  const handleRetry = useCallback(() => {
    setError(null);
    setIsLoading(true);
    fetchThreads();
  }, []);

  return {
    authState,
    user,
    threads,
    selectedThread,
    messages,
    threadInfo,
    isLoading,
    isLoadingMessages,
    error,
    messageInput,
    handleThreadSelect,
    handleMessageInputChange,
    handleSendMessage,
    handleRetry,
  };
}
```

**Validation:** Hook returns all expected values

---

### Step 13: Create Thread Sidebar Component

**Files:** `app/src/islands/pages/MessagingPage/components/ThreadSidebar.jsx`

**Purpose:** Left sidebar with thread list

**Details:**
```jsx
import ThreadCard from './ThreadCard.jsx';

export default function ThreadSidebar({ threads, selectedThreadId, onThreadSelect }) {
  return (
    <aside className="thread-sidebar">
      <h2 className="sidebar-title">Messages</h2>
      <div className="thread-list">
        {threads.map(thread => (
          <ThreadCard
            key={thread._id}
            thread={thread}
            isSelected={thread._id === selectedThreadId}
            onClick={() => onThreadSelect(thread)}
          />
        ))}
      </div>
    </aside>
  );
}
```

**Validation:** Sidebar renders thread list

---

### Step 14: Create Thread Card Component

**Files:** `app/src/islands/pages/MessagingPage/components/ThreadCard.jsx`

**Purpose:** Individual thread card in sidebar

**Details:**
```jsx
export default function ThreadCard({ thread, isSelected, onClick }) {
  return (
    <div
      className={`thread-card ${isSelected ? 'thread-card--selected' : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
    >
      <img
        src={thread.contact_avatar || '/assets/images/default-avatar.svg'}
        alt={thread.contact_name}
        className="thread-card__avatar"
      />
      <div className="thread-card__content">
        <span className="thread-card__name">{thread.contact_name}</span>
        <span className="thread-card__property">{thread.property_name}</span>
        <p className="thread-card__preview">{thread.last_message_preview}</p>
      </div>
      <div className="thread-card__meta">
        <span className="thread-card__time">{thread.last_message_time}</span>
        {thread.unread_count > 0 && (
          <span className="thread-card__unread">{thread.unread_count}</span>
        )}
      </div>
    </div>
  );
}
```

**Validation:** Cards show correct data, hover states work

---

### Step 15: Create Message Thread Component

**Files:** `app/src/islands/pages/MessagingPage/components/MessageThread.jsx`

**Purpose:** Message display area with thread header and messages

**Details:**
```jsx
import MessageBubble from './MessageBubble.jsx';
import ThreadHeader from './ThreadHeader.jsx';

export default function MessageThread({ messages, threadInfo, isLoading }) {
  return (
    <div className="message-thread">
      {threadInfo && <ThreadHeader info={threadInfo} />}

      <div className="message-thread__messages">
        {isLoading ? (
          <div className="message-thread__loading">Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="message-thread__empty">No messages yet</div>
        ) : (
          messages.map(message => (
            <MessageBubble key={message._id} message={message} />
          ))
        )}
      </div>
    </div>
  );
}
```

**Validation:** Messages render correctly, scroll works

---

### Step 16: Create Thread Header Component

**Files:** `app/src/islands/pages/MessagingPage/components/ThreadHeader.jsx`

**Purpose:** Header above messages with contact info and status

**Details:**
```jsx
export default function ThreadHeader({ info }) {
  return (
    <div className="thread-header">
      <img
        src={info.contact_avatar || '/assets/images/default-avatar.svg'}
        alt={info.contact_name}
        className="thread-header__avatar"
      />
      <div className="thread-header__info">
        <h3 className="thread-header__name">{info.contact_name}</h3>
        {info.property_name && (
          <span className="thread-header__property">{info.property_name}</span>
        )}
      </div>
      {info.status && (
        <span className={`thread-header__status thread-header__status--${info.status_type || 'default'}`}>
          {info.status}
        </span>
      )}
    </div>
  );
}
```

**Validation:** Header displays contact and status correctly

---

### Step 17: Create Message Bubble Component

**Files:** `app/src/islands/pages/MessagingPage/components/MessageBubble.jsx`

**Purpose:** Individual message bubble with styling based on sender

**Details:**
```jsx
export default function MessageBubble({ message }) {
  const bubbleClass = message.is_outgoing
    ? 'message-bubble--outgoing'
    : 'message-bubble--incoming';

  const isSplitBot = message.sender_type === 'splitbot';

  return (
    <div className={`message-bubble ${bubbleClass} ${isSplitBot ? 'message-bubble--splitbot' : ''}`}>
      {!message.is_outgoing && (
        <span className="message-bubble__sender">
          {isSplitBot ? 'Split Bot:' : message.sender_name}
        </span>
      )}

      <div className="message-bubble__content">
        <p className="message-bubble__text">{message.message_body}</p>

        {message.call_to_action && (
          <button
            className="message-bubble__cta"
            onClick={() => window.location.href = message.call_to_action.link}
          >
            {message.call_to_action.message}
          </button>
        )}

        {message.split_bot_warning && (
          <span className="message-bubble__warning">{message.split_bot_warning}</span>
        )}
      </div>

      <span className="message-bubble__timestamp">
        {message.sender_name} - {message.timestamp}
      </span>
    </div>
  );
}
```

**Validation:** Incoming/outgoing styles correct, CTAs render

---

### Step 18: Create Message Input Component

**Files:** `app/src/islands/pages/MessagingPage/components/MessageInput.jsx`

**Purpose:** Message input field with send button

**Details:**
```jsx
import { useState } from 'react';

export default function MessageInput({ value, onChange, onSend, disabled }) {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="message-input">
      <input
        type="text"
        className="message-input__field"
        placeholder="Type a message"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
      />
      <button
        className="message-input__send"
        onClick={onSend}
        disabled={disabled || !value.trim()}
        aria-label="Send message"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
        </svg>
      </button>
    </div>
  );
}
```

**Validation:** Input accepts text, send button triggers handler

---

### Step 19: Create Component Index

**Files:** `app/src/islands/pages/MessagingPage/components/index.js`

**Purpose:** Barrel export for all components

**Details:**
```javascript
export { default as ThreadSidebar } from './ThreadSidebar.jsx';
export { default as ThreadCard } from './ThreadCard.jsx';
export { default as ThreadHeader } from './ThreadHeader.jsx';
export { default as MessageThread } from './MessageThread.jsx';
export { default as MessageBubble } from './MessageBubble.jsx';
export { default as MessageInput } from './MessageInput.jsx';
```

**Validation:** All imports work correctly

---

### Step 20: Add Navigation Link

**Files:** `app/src/islands/shared/Header.jsx` (if user dropdown exists)

**Purpose:** Add link to Messages in user menu

**Details:**
- Add "Messages" link to logged-in user dropdown
- Include unread count badge (optional, requires additional API)

**Validation:** Link appears in dropdown, navigates correctly

---

## Edge Cases & Error Handling

| Edge Case | Handling |
|-----------|----------|
| No threads for user | Show EmptyState with "No conversations yet" |
| Thread not found from URL | Clear URL param, show first thread or empty |
| Message send fails | Show error toast, keep input text |
| Network error | Show ErrorState with retry button |
| User not authenticated | Redirect to home page |
| Empty message body | Disable send button |
| Very long messages | Add character limit (1000 chars) |
| Split Bot messages | Different styling, hide reply |

---

## Testing Considerations

### Unit Tests
- `useMessagingPageLogic` hook: auth check, thread selection, message sending
- `MessageBubble` component: renders incoming/outgoing correctly
- `ThreadCard` component: displays all data fields

### Integration Tests
- Edge Function `send_message`: creates message in Bubble
- Edge Function `get_threads`: returns user's threads
- Edge Function `get_messages`: returns thread messages, marks as read

### E2E Tests
- Full flow: login -> select thread -> send message -> see message appear
- URL navigation: direct link to thread works
- Responsive: sidebar collapses on mobile

---

## Rollback Strategy

1. **Edge Function**: Delete `supabase/functions/messages/` directory, redeploy
2. **Frontend**: Remove route from `routes.config.js`, regenerate routes
3. **Database**: No database changes required (using existing Bubble tables)

---

## Dependencies & Blockers

| Dependency | Status | Notes |
|------------|--------|-------|
| Bubble API access | Required | Need workflow endpoint `send-new-message` |
| Supabase Edge Functions | Available | Already deployed and working |
| Thread/Message tables | Check | Verify Supabase has synced tables |
| Authentication | Available | Using existing auth system |

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Bubble workflow changes | Low | High | Document current workflow, add tests |
| Missing database tables | Medium | High | Verify tables exist before starting |
| Performance with many messages | Medium | Medium | Add pagination, lazy loading |
| Real-time sync issues | Medium | Medium | Add polling or websocket later |

---

## File References Summary

### New Files to Create

**Backend (Edge Functions):**
- `supabase/functions/messages/index.ts` - Main router
- `supabase/functions/messages/deno.json` - Deno config
- `supabase/functions/messages/handlers/sendMessage.ts` - Send handler
- `supabase/functions/messages/handlers/getThreads.ts` - Threads handler
- `supabase/functions/messages/handlers/getMessages.ts` - Messages handler

**Frontend:**
- `app/public/messages.html` - HTML entry point
- `app/src/messages.jsx` - React entry point
- `app/src/islands/pages/MessagingPage/MessagingPage.jsx` - Page component
- `app/src/islands/pages/MessagingPage/useMessagingPageLogic.js` - Logic hook
- `app/src/islands/pages/MessagingPage/components/ThreadSidebar.jsx`
- `app/src/islands/pages/MessagingPage/components/ThreadCard.jsx`
- `app/src/islands/pages/MessagingPage/components/ThreadHeader.jsx`
- `app/src/islands/pages/MessagingPage/components/MessageThread.jsx`
- `app/src/islands/pages/MessagingPage/components/MessageBubble.jsx`
- `app/src/islands/pages/MessagingPage/components/MessageInput.jsx`
- `app/src/islands/pages/MessagingPage/components/index.js`
- `app/src/styles/components/messaging.css` - Styles

### Files to Modify

- `app/src/routes.config.js` - Add /messages route
- `app/vite.config.js` - Add messages entry to build
- `app/public/_headers` - Add Content-Type for /messages
- `supabase/config.toml` - Add messages function config
- `app/src/islands/shared/Header.jsx` - Add Messages link (optional)

---

**PLAN VERSION**: 1.0
**CREATED**: 2025-12-13
**ESTIMATED EFFORT**: 2-3 days
**PRIORITY**: High
