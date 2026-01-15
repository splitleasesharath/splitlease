# Implementation Plan: Messaging Header Panel Component

## Overview

This plan outlines the implementation of a header-integrated messaging panel component for Split Lease, converting the Bubble.io messaging reusable element design into a React island component. The panel will appear in the header for authenticated users with active message threads, supporting real-time messaging, thread navigation, and CTA handling.

## Success Criteria

- [ ] Messaging icon appears in header only for authenticated users with at least one message thread
- [ ] Desktop (>=900px): Clicking icon opens a dropdown messaging panel (425px width)
- [ ] Mobile (<900px): Clicking icon navigates to /messages full-page view
- [ ] Panel displays thread list with latest message preview and unread badges
- [ ] Selecting a thread shows message history with auto-scroll to latest
- [ ] Reply composer supports message sending with real-time delivery
- [ ] Messages with CTAs display actionable buttons that navigate appropriately
- [ ] Real-time message updates via Supabase Realtime subscriptions
- [ ] Typing indicators shown when other participant is composing
- [ ] Unread message count badge updates in real-time
- [ ] Panel closes when clicking outside or pressing Escape
- [ ] Matches Bubble design specifications (colors, typography, layout)

---

## Context & References

### Existing Files (Critical to Review Before Implementation)

| File | Purpose | Relevance |
|------|---------|-----------|
| `app/src/islands/shared/Header.jsx` | Main header component | Integration point for messaging icon/panel |
| `app/src/islands/shared/LoggedInAvatar/LoggedInAvatar.jsx` | User avatar dropdown | Contains messaging icon pattern to extend |
| `app/src/islands/shared/LoggedInAvatar/useLoggedInAvatarData.js` | Fetches user data including `threadsCount` | Already queries thread count |
| `app/src/islands/pages/MessagingPage/MessagingPage.jsx` | Full-page messaging view | UI components to potentially reuse |
| `app/src/islands/pages/MessagingPage/useMessagingPageLogic.js` | Messaging business logic | Contains real-time subscription patterns |
| `app/src/islands/pages/MessagingPage/components/ThreadSidebar.jsx` | Thread list component | Can be adapted for panel |
| `app/src/islands/pages/MessagingPage/components/ThreadCard.jsx` | Individual thread card | Reusable in panel |
| `app/src/islands/pages/MessagingPage/components/MessageThread.jsx` | Message display area | Can be adapted for panel |
| `app/src/islands/pages/MessagingPage/components/MessageBubble.jsx` | Message bubble with CTA | Reusable in panel |
| `app/src/islands/pages/MessagingPage/components/MessageInput.jsx` | Reply composer | Reusable in panel |
| `app/src/islands/pages/MessagingPage/components/TypingIndicator.jsx` | Typing indicator | Reusable in panel |
| `app/src/styles/components/messaging.css` | Messaging styles | Adapt for panel context |
| `app/src/lib/ctaConfig.js` | CTA routes configuration | For CTA button handling |
| `supabase/functions/messages/index.ts` | Messages edge function | API for send/get messages |
| `supabase/functions/messages/handlers/sendMessage.ts` | Send message handler | Understand message creation |
| `supabase/functions/messages/handlers/getMessages.ts` | Get messages handler | Understand message retrieval |
| `supabase/functions/_shared/messagingHelpers.ts` | Messaging utility functions | Database schema reference |

### Database Tables (from existing implementation)

| Table | Key Fields | Purpose |
|-------|------------|---------|
| `thread` | `_id`, `-Host User`, `-Guest User`, `Listing`, `Proposal`, `~Last Message`, `~Date Last Message`, `Thread Subject` | Conversation threads |
| `_message` | `_id`, `Message Body`, `-Originator User`, `Associated Thread/Conversation`, `is Visible to Guest`, `is Visible to Host`, `is Split Bot`, `Call to Action`, `Unread Users` | Individual messages |
| `user` | `_id`, `Name - First`, `Name - Last`, `Profile Photo` | User profiles for display |
| `reference_table.os_messaging_cta` | `name`, `display`, `message`, `button_text`, `visible_to_guest_only`, `visible_to_host_only` | CTA configuration |

### Existing Patterns to Follow

1. **Hollow Component Pattern**: Page/complex components delegate logic to `useXxxLogic` hooks
2. **Supabase Realtime**: Subscribe to `postgres_changes` for `INSERT` on `_message` table, client-side filter by thread
3. **Presence for Typing**: Use Supabase Realtime Presence to track typing status
4. **CTA Handling**: Use `ctaConfig.js` to resolve CTA routes, support `navigate`, `modal`, `external`, `none` action types
5. **Authentication Pattern**: Use `validateTokenAndFetchUser` for user data, `getUserId` for Bubble ID

### Design Specifications (from Bubble)

```
Panel Container:
- Background: #FFFFFF (white)
- Border: 1px solid #CCCCCC
- Border Radius: 12px
- Shadow: 0px 10px 20px rgba(0,0,0,0.1)
- Width: 425px (fixed)
- Min Height: 250px
- Max Height: 3500px (but practical limit ~80vh)

Typography:
- Font: DM Sans / Inter (project standard)
- Heading: 21px, weight 500
- Text Color: #222222

Thread List:
- Min Height: 125px
- Max Height: 425px with scroll
- Background: #F8F7F6 (sidebar)

Messages Area:
- Min Height: 200px
- Max Height: 1000px with scroll
- Background: #FFFFFF

Message Colors:
- Incoming: #E8D5F7 (light purple)
- Outgoing: #2D1B3D (dark purple)
- SplitBot: #F0F0F0 (light gray)
- Primary accent: #6B4FA1 (purple)
- Alert/Unread: #E53E3E (red)

View States:
- view = 0: Show single thread messages
- view != 0: Show thread list
```

---

## Implementation Steps

### Step 1: Create Header Messaging Panel Component Structure

**Files to Create:**
- `app/src/islands/shared/HeaderMessagingPanel/HeaderMessagingPanel.jsx`
- `app/src/islands/shared/HeaderMessagingPanel/useHeaderMessagingPanelLogic.js`
- `app/src/islands/shared/HeaderMessagingPanel/HeaderMessagingPanel.css`
- `app/src/islands/shared/HeaderMessagingPanel/index.js`

**Purpose:** Create the foundational component structure following Hollow Component Pattern.

**Details:**
- Create component shell with panel container, thread list section, and message section
- Implement `useHeaderMessagingPanelLogic` hook to manage:
  - Thread fetching and selection
  - Message fetching for selected thread
  - Message sending
  - Real-time subscriptions
  - Panel visibility state
  - View state (thread list vs single thread)
- CSS should adapt messaging.css styles for panel context

**Component Structure:**
```jsx
<HeaderMessagingPanel isOpen={isOpen} onClose={onClose} userBubbleId={userBubbleId}>
  {/* Panel Container */}
  <div className="header-messaging-panel">
    {/* Header with title and close button */}
    <div className="panel-header">
      <h2>Messages</h2>
      <button onClick={onClose}>X</button>
    </div>

    {viewState === 'list' ? (
      /* Thread List View */
      <ThreadList threads={threads} onSelect={handleThreadSelect} />
    ) : (
      /* Single Thread View */
      <>
        <ThreadHeader thread={selectedThread} onBack={handleBackToList} />
        <MessageList messages={messages} />
        <MessageComposer onSend={handleSend} />
      </>
    )}
  </div>
</HeaderMessagingPanel>
```

**Validation:** Component renders without errors, can be imported.

---

### Step 2: Implement Thread List Sub-Component

**Files to Modify:**
- `app/src/islands/shared/HeaderMessagingPanel/HeaderMessagingPanel.jsx`

**Files to Create (or reuse):**
- Consider reusing `ThreadCard.jsx` from MessagingPage

**Purpose:** Display scrollable list of message threads with unread indicators.

**Details:**
- Adapt `ThreadSidebar` and `ThreadCard` patterns for panel context
- Show:
  - Contact avatar and name
  - Property name (if linked to listing)
  - Last message preview (truncated)
  - Time since last message
  - Unread count badge (red)
- Apply panel-specific max-height and scroll behavior
- Implement click handler to select thread and switch to message view

**UI Elements:**
```
[Avatar] Contact Name          [Time]
         Property Name         [Unread Badge]
         Last message preview...
```

**Validation:** Thread list renders with mock data, clicking switches to message view.

---

### Step 3: Implement Message Display Sub-Component

**Files to Modify:**
- `app/src/islands/shared/HeaderMessagingPanel/HeaderMessagingPanel.jsx`

**Purpose:** Display messages for selected thread with proper styling.

**Details:**
- Reuse `MessageBubble` component for individual messages
- Implement thread header showing:
  - Back button (to return to thread list)
  - Contact name and avatar
  - Property name (if applicable)
  - Proposal status badge (if applicable)
- Auto-scroll to bottom on new messages
- Adapt max-height for panel context
- Support CTA buttons in messages (from `call_to_action` field)

**CTA Handling:**
```javascript
// When CTA button clicked
const handleCTAClick = async (cta, messageContext) => {
  const config = await getCTAConfig(cta.type);
  if (!config) return;

  switch (config.actionType) {
    case 'navigate':
      const url = buildCTADestination(config.destination, {
        proposal_id: messageContext.proposalId,
        listing_id: messageContext.listingId,
        lease_id: messageContext.leaseId
      });
      onClose(); // Close panel
      window.location.href = url;
      break;
    case 'modal':
      // Emit event for parent to handle modal
      onCTAModal(config.destination, messageContext);
      break;
    case 'external':
      // Handle external (e.g., Crisp chat)
      break;
    case 'none':
      // No action, button is just informational
      break;
  }
};
```

**Validation:** Messages display correctly with proper alignment, CTAs are clickable.

---

### Step 4: Implement Reply Composer Sub-Component

**Files to Modify:**
- `app/src/islands/shared/HeaderMessagingPanel/HeaderMessagingPanel.jsx`

**Purpose:** Text input with send button for composing replies.

**Details:**
- Reuse or adapt `MessageInput` from MessagingPage
- Features:
  - Auto-expanding textarea (up to 3 lines)
  - Character count (limit 1000)
  - Send button (disabled when empty)
  - Loading state while sending
  - Focus management
- Connect to `handleSendMessage` in logic hook

**Validation:** Can type message and send, input clears after send.

---

### Step 5: Implement Logic Hook with Data Fetching

**Files to Modify:**
- `app/src/islands/shared/HeaderMessagingPanel/useHeaderMessagingPanelLogic.js`

**Purpose:** All business logic for the messaging panel.

**Details:**
- State management:
  ```javascript
  const [threads, setThreads] = useState([]);
  const [selectedThread, setSelectedThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [viewState, setViewState] = useState('list'); // 'list' | 'thread'
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  ```

- Data fetching (adapt from `useMessagingPageLogic`):
  - `fetchThreads()` - Direct Supabase query with joins
  - `fetchMessages(threadId)` - Via `supabase.functions.invoke('messages')`
  - `sendMessage()` - Via `supabase.functions.invoke('messages')`

- Export:
  ```javascript
  return {
    threads,
    selectedThread,
    messages,
    viewState,
    isLoading,
    isLoadingMessages,
    messageInput,
    isSending,
    handleThreadSelect,
    handleBackToList,
    handleMessageInputChange,
    handleSendMessage,
  };
  ```

**Validation:** Data loads from Supabase, messages display for selected thread.

---

### Step 6: Implement Real-Time Subscriptions

**Files to Modify:**
- `app/src/islands/shared/HeaderMessagingPanel/useHeaderMessagingPanelLogic.js`

**Purpose:** Real-time message updates and typing indicators.

**Details:**
- Subscribe to Postgres Changes on `_message` table:
  ```javascript
  useEffect(() => {
    if (!selectedThread || !userBubbleId) return;

    const channel = supabase.channel(`panel-messages-${selectedThread._id}`);

    channel.on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: '_message'
    }, (payload) => {
      // Client-side filter for this thread
      if (payload.new['Associated Thread/Conversation'] !== selectedThread._id) return;

      // Transform and add message
      // Dedupe against optimistic updates
    });

    // Presence for typing indicators
    channel.on('presence', { event: 'sync' }, () => {
      // Update typing state
    });

    channel.subscribe();

    return () => channel.unsubscribe();
  }, [selectedThread?._id, userBubbleId]);
  ```

- Track typing via Presence:
  ```javascript
  const trackTyping = async (isTyping) => {
    await channelRef.current?.track({
      user_id: userBubbleId,
      user_name: userName,
      typing: isTyping
    });
  };
  ```

**Validation:** New messages appear without refresh, typing indicator shows.

---

### Step 7: Integrate with Header Component

**Files to Modify:**
- `app/src/islands/shared/Header.jsx`
- `app/src/islands/shared/LoggedInAvatar/LoggedInAvatar.jsx`

**Purpose:** Add messaging panel trigger to header.

**Details:**
- **Option A**: Extend `LoggedInAvatar` (current messaging icon location)
  - The icon already exists in LoggedInAvatar for users with `threadsCount > 0`
  - Currently navigates to `/messages` on click
  - Modify to:
    - Desktop: Show panel dropdown instead of navigation
    - Mobile: Keep navigation to /messages

- **Option B**: Create separate header messaging icon component
  - Add next to LoggedInAvatar
  - Independent state management

**Recommended: Option A** - Extend existing pattern

```jsx
// In LoggedInAvatar.jsx
const [showMessagingPanel, setShowMessagingPanel] = useState(false);
const isMobile = window.innerWidth < 900;

// Modify the messaging icon click handler
const handleMessagesClick = (e) => {
  e.preventDefault();
  e.stopPropagation();

  if (isMobile) {
    // Mobile: Navigate to full page
    onNavigate('/messages');
  } else {
    // Desktop: Toggle panel
    setShowMessagingPanel(!showMessagingPanel);
  }
};

// In render, add panel:
{effectiveThreadsCount > 0 && (
  <>
    <button className="header-messages-icon" onClick={handleMessagesClick}>
      {/* Icon SVG */}
      {effectiveUnreadMessagesCount > 0 && (
        <span className="messages-badge">{effectiveUnreadMessagesCount}</span>
      )}
    </button>

    {showMessagingPanel && !isMobile && (
      <HeaderMessagingPanel
        isOpen={showMessagingPanel}
        onClose={() => setShowMessagingPanel(false)}
        userBubbleId={user.id}
      />
    )}
  </>
)}
```

**Validation:** Icon click opens panel on desktop, navigates on mobile.

---

### Step 8: Implement Panel Positioning and Styling

**Files to Modify:**
- `app/src/islands/shared/HeaderMessagingPanel/HeaderMessagingPanel.css`
- `app/src/islands/shared/LoggedInAvatar/LoggedInAvatar.css`

**Purpose:** Position panel correctly relative to header icon.

**Details:**
- Panel positioning:
  ```css
  .header-messaging-panel {
    position: absolute;
    top: 100%; /* Below header */
    right: 0;
    width: 425px;
    max-height: calc(100vh - 100px);
    background: #FFFFFF;
    border: 1px solid #CCCCCC;
    border-radius: 12px;
    box-shadow: 0px 10px 20px rgba(0, 0, 0, 0.1);
    z-index: 10001; /* Above header but below modals */
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  ```

- Click outside to close:
  ```javascript
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      if (!panelRef.current?.contains(e.target)) {
        onClose();
      }
    };

    // Delay to avoid closing from the click that opened it
    requestAnimationFrame(() => {
      document.addEventListener('click', handleClickOutside);
    });

    return () => document.removeEventListener('click', handleClickOutside);
  }, [isOpen, onClose]);
  ```

- Escape key to close:
  ```javascript
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);
  ```

**Validation:** Panel appears below icon, closes on outside click or Escape.

---

### Step 9: Implement CTA Button Handling

**Files to Modify:**
- `app/src/islands/shared/HeaderMessagingPanel/useHeaderMessagingPanelLogic.js`
- `app/src/islands/shared/HeaderMessagingPanel/HeaderMessagingPanel.jsx`

**Purpose:** Make CTA buttons in messages functional.

**Details:**
- Fetch CTA config from `reference_table.os_messaging_cta`
- Build destination URLs with template variable substitution
- Handle different action types:
  - `navigate`: Close panel, navigate to URL
  - `modal`: Emit event for parent component
  - `external`: Open Crisp chat or external link
  - `none`: No action (informational only)

```javascript
// In logic hook
const handleCTAClick = useCallback(async (ctaType, context) => {
  const config = await getCTAConfig(ctaType);
  if (!config) return;

  switch (config.actionType) {
    case 'navigate':
      const url = buildCTADestination(config.destination, context);
      onClose?.();
      if (url) window.location.href = url;
      break;
    case 'modal':
      // Could emit custom event or call callback
      window.dispatchEvent(new CustomEvent('open-modal', {
        detail: { modal: config.destination, context }
      }));
      break;
    case 'external':
      if (config.destination === 'crisp_chat') {
        window.$crisp?.push(['do', 'chat:open']);
      }
      break;
  }
}, [onClose]);
```

**Validation:** CTA buttons navigate to correct pages.

---

### Step 10: Implement Unread Count Badge Updates

**Files to Modify:**
- `app/src/islands/shared/HeaderMessagingPanel/useHeaderMessagingPanelLogic.js`
- `app/src/islands/shared/LoggedInAvatar/useLoggedInAvatarData.js`

**Purpose:** Real-time unread message count in header.

**Details:**
- When messages are read (user views thread), call mark-as-read logic
- Subscribe to message inserts globally (not just selected thread) to update badge
- Update `effectiveUnreadMessagesCount` in LoggedInAvatar

**Mark Messages as Read:**
```javascript
// When thread is selected and messages are fetched
// The Edge Function already handles this in getMessages handler
// Just need to re-fetch unread count after viewing
```

**Global Subscription for Badge:**
```javascript
// In useLoggedInAvatarData or separate hook
useEffect(() => {
  if (!userId) return;

  const channel = supabase.channel(`unread-badge-${userId}`);

  channel.on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: '_message'
  }, (payload) => {
    // Check if user is in Unread Users
    const unreadUsers = payload.new['Unread Users'] || [];
    if (unreadUsers.includes(userId)) {
      // Increment unread count
      refetch(); // Or optimistically increment
    }
  });

  channel.subscribe();
  return () => channel.unsubscribe();
}, [userId]);
```

**Validation:** Badge count updates when new message arrives, decrements when messages read.

---

### Step 11: Add Mobile Navigation Handling

**Files to Modify:**
- `app/src/islands/shared/LoggedInAvatar/LoggedInAvatar.jsx`

**Purpose:** Ensure mobile users navigate to full-page messaging.

**Details:**
- Use media query or window.innerWidth check
- Consider resize handler for orientation changes
- Maintain existing `/messages` route for mobile experience

```javascript
const [isMobile, setIsMobile] = useState(window.innerWidth < 900);

useEffect(() => {
  const handleResize = () => {
    const mobile = window.innerWidth < 900;
    setIsMobile(mobile);
    // Close panel if transitioning to mobile while open
    if (mobile && showMessagingPanel) {
      setShowMessagingPanel(false);
    }
  };

  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, [showMessagingPanel]);
```

**Validation:** Icon navigates on mobile, shows panel on desktop.

---

### Step 12: Polish and Accessibility

**Files to Modify:**
- `app/src/islands/shared/HeaderMessagingPanel/HeaderMessagingPanel.jsx`
- `app/src/islands/shared/HeaderMessagingPanel/HeaderMessagingPanel.css`

**Purpose:** Ensure polished UX and accessibility compliance.

**Details:**
- Focus management:
  - Focus first thread when panel opens
  - Return focus to icon when panel closes
- Keyboard navigation:
  - Arrow keys to navigate threads
  - Enter to select thread
  - Tab to navigate within panel
- ARIA attributes:
  - `aria-expanded` on trigger button
  - `aria-labelledby` on panel
  - `role="dialog"` on panel
- Loading states:
  - Skeleton loaders for threads
  - Spinner for messages
- Error states:
  - Retry button for failed loads
- Empty states:
  - "No messages yet" when no threads
  - "Start the conversation" when thread has no messages

**Validation:** Panel is keyboard navigable, screen reader announces correctly.

---

## Edge Cases & Error Handling

| Edge Case | Handling |
|-----------|----------|
| User has no threads | Don't show messaging icon in header |
| Network error fetching threads | Show error state with retry button |
| Network error fetching messages | Show error in message area, keep thread list |
| Network error sending message | Show toast error, keep message in input |
| User signs out while panel open | Panel closes, icon disappears |
| Thread deleted while viewing | Show "Thread not found", return to list |
| CTA config not found | Log warning, no button action |
| Realtime subscription fails | Fall back to polling or manual refresh |
| Very long message body | Truncate with "See more" in preview |
| Many unread messages (100+) | Show "99+" badge |

---

## Testing Considerations

### Unit Tests
- `useHeaderMessagingPanelLogic` hook data transformations
- CTA URL building with template variables
- Thread sorting (most recent first)

### Integration Tests
- Thread list fetch and display
- Message fetch for selected thread
- Message sending flow
- Real-time message arrival
- CTA button navigation

### E2E Tests (Playwright)
- Desktop: Click icon -> panel opens -> select thread -> view messages -> send reply
- Mobile: Click icon -> navigate to /messages page
- Unread badge appears when new message arrives
- Panel closes on outside click
- Panel closes on Escape key
- CTA button navigates correctly

---

## Rollback Strategy

1. Feature flag: Add `ENABLE_HEADER_MESSAGING_PANEL` environment variable
2. If disabled, revert to current behavior (icon navigates to /messages)
3. Keep MessagingPage fully functional as fallback
4. Can disable via:
   ```javascript
   const enablePanel = import.meta.env.VITE_ENABLE_HEADER_MESSAGING_PANEL === 'true';
   ```

---

## Dependencies & Blockers

| Dependency | Status | Notes |
|------------|--------|-------|
| Supabase Realtime RLS | Ready | Must allow SELECT on `_message` for authenticated users |
| Messages Edge Function | Ready | Existing `get_messages` and `send_message` actions work |
| CTA Reference Table | Ready | `reference_table.os_messaging_cta` populated |
| Thread/Message tables | Ready | Already in use by MessagingPage |

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Realtime subscription unreliable | Medium | Medium | Implement reconnection logic, fall back to polling |
| Panel blocks other header dropdowns | Low | Medium | Proper z-index management, close on other dropdown open |
| Performance with many threads | Low | Medium | Pagination/virtual scrolling if >50 threads |
| Mobile resize issues | Low | Low | Test orientation changes, close panel on resize to mobile |
| Memory leak from subscriptions | Medium | Medium | Proper cleanup in useEffect returns |

---

## File References Summary

### Files to Create
- `app/src/islands/shared/HeaderMessagingPanel/HeaderMessagingPanel.jsx`
- `app/src/islands/shared/HeaderMessagingPanel/useHeaderMessagingPanelLogic.js`
- `app/src/islands/shared/HeaderMessagingPanel/HeaderMessagingPanel.css`
- `app/src/islands/shared/HeaderMessagingPanel/index.js`

### Files to Modify
- `app/src/islands/shared/LoggedInAvatar/LoggedInAvatar.jsx` - Add panel toggle
- `app/src/islands/shared/LoggedInAvatar/LoggedInAvatar.css` - Panel positioning
- `app/src/islands/shared/LoggedInAvatar/useLoggedInAvatarData.js` - Real-time badge updates (optional)

### Files to Reference (Read-Only)
- `app/src/islands/pages/MessagingPage/useMessagingPageLogic.js` - Realtime patterns
- `app/src/islands/pages/MessagingPage/components/MessageBubble.jsx` - Message rendering
- `app/src/islands/pages/MessagingPage/components/ThreadCard.jsx` - Thread rendering
- `app/src/lib/ctaConfig.js` - CTA routing
- `supabase/functions/messages/handlers/getMessages.ts` - API contract
- `supabase/functions/messages/handlers/sendMessage.ts` - API contract
- `app/src/styles/components/messaging.css` - Existing styles to adapt

---

## Estimated Implementation Time

| Step | Time Estimate |
|------|---------------|
| Step 1: Component structure | 1 hour |
| Step 2: Thread list | 1 hour |
| Step 3: Message display | 1.5 hours |
| Step 4: Reply composer | 1 hour |
| Step 5: Data fetching | 1.5 hours |
| Step 6: Realtime subscriptions | 1.5 hours |
| Step 7: Header integration | 1 hour |
| Step 8: Positioning/styling | 1.5 hours |
| Step 9: CTA handling | 1 hour |
| Step 10: Unread badge | 1 hour |
| Step 11: Mobile handling | 0.5 hours |
| Step 12: Polish/accessibility | 1.5 hours |
| **Total** | **~14 hours** |

---

**VERSION**: 1.0
**CREATED**: 2026-01-09
**AUTHOR**: Implementation Planning Architect
