# Implementation Plan: Message Curation Admin Page Migration

## Overview

Migrate the external message curation admin page from the `_message-curation` repository into Split Lease's codebase. This involves converting a Next.js 14 application with Prisma ORM to Split Lease's Islands architecture with Supabase Edge Functions, following the hollow component pattern and four-layer logic structure.

## Success Criteria

- [ ] Message curation admin page accessible at `/_internal/message-curation`
- [ ] Admin authentication via existing Supabase Auth (admin/corporate user check)
- [ ] Thread search and selection functionality works with existing `thread` and `_message` tables
- [ ] Message viewing, deletion (soft), and forwarding works
- [ ] Split Bot messaging functionality integrates with existing message infrastructure
- [ ] Audit logging for all moderation actions
- [ ] Page follows hollow component pattern with `useMessageCurationPageLogic.js`
- [ ] Edge Function follows action-based request pattern
- [ ] No Prisma dependency - uses Supabase client directly

## Context & References

### Source Repository Analysis

| Component | External Path | Purpose |
|-----------|---------------|---------|
| Main Page | `src/app/message-curation/page.tsx` | Page component with state management |
| ThreadSelector | `src/components/ThreadSelector.tsx` | Search/filter threads, dropdown selection |
| ConversationHistory | `src/components/ConversationHistory.tsx` | Display messages in thread |
| MessageDisplay | `src/components/MessageDisplay.tsx` | Detailed message view with user info |
| ModerationActions | `src/components/ModerationActions.tsx` | Delete message, delete thread, forward message |
| SplitBotMessaging | `src/components/SplitBotMessaging.tsx` | Send automated Split Bot messages |
| API Routes | `src/app/api/admin/*` | Backend logic for threads/messages |
| Prisma Schema | `prisma/schema.prisma` | Database models (User, Thread, Message, etc.) |

### Split Lease Target Patterns

| Pattern | Reference File | Purpose |
|---------|----------------|---------|
| Islands Architecture | `app/src/routes.config.js` | Route registry pattern |
| Hollow Component | `app/src/islands/pages/SimulationAdminPage/SimulationAdminPage.jsx` | UI-only component |
| Logic Hook | `app/src/islands/pages/SimulationAdminPage/useSimulationAdminPageLogic.js` | All business logic |
| Edge Function | `supabase/functions/simulation-admin/index.ts` | Action-based API |
| Messages Edge Function | `supabase/functions/messages/index.ts` | Existing messaging patterns |
| Admin Auth Pattern | `supabase/functions/simulation-admin/index.ts` | Admin/corporate user check |

### Database Schema Mapping

The external Prisma schema maps to existing Supabase tables:

| Prisma Model | Supabase Table | Key Fields |
|--------------|----------------|------------|
| User | `user` | `_id`, `email`, `"Name - First"`, `"Name - Last"`, `"Profile Photo"` |
| Listing | `listing` | `_id`, `Name` |
| Thread | `thread` | `_id`, `"-Host User"`, `"-Guest User"`, `"Listing"` |
| Message | `_message` | `_id`, `"Message Body"`, `"Split Bot Warning"`, `"-Originator User"` |
| Proposal | `proposal` | `_id`, `"Proposal Status"` |

**Note**: The external schema uses Prisma's generated UUID IDs. Split Lease uses Bubble-style IDs (`_id` column, format: `1234567890x1234567`).

### Existing Patterns to Follow

1. **Action-Based Edge Functions**: All requests use `{ action, payload }` pattern
2. **Admin Authentication**: Check `"Toggle - Is Admin"` or `"Toggle - Is Corporate User"` on user table
3. **Service Role Client**: Use `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS
4. **CORS Headers**: Standard CORS headers for all responses
5. **Error Response Format**: `{ success: false, error: "message" }`
6. **Success Response Format**: `{ success: true, data: {...} }`

## Implementation Steps

### Step 1: Add Route to Registry

**Files:** `app/src/routes.config.js`
**Purpose:** Register the new admin page route

**Details:**
- Add new route entry for message curation page
- Use `/_internal/message-curation` path (follows admin tool convention)
- Set `protected: true` and `adminOnly: true`
- Add appropriate aliases

**Validation:** Run `bun run generate-routes` and verify `_redirects` is updated

```javascript
// Add to routes array after other corporate internal tools
{
  path: '/_internal/message-curation',
  file: 'message-curation.html',
  aliases: ['/_internal/message-curation.html', '/message-curation'],
  protected: true,
  adminOnly: true,
  cloudflareInternal: false,
  internalName: 'message-curation-view',
  hasDynamicSegment: false
}
```

---

### Step 2: Create HTML Entry File

**Files:** `app/public/message-curation.html`
**Purpose:** HTML shell for the React island

**Details:**
- Create standard HTML template following existing patterns
- Include root div and script reference to JSX entry point
- Add appropriate meta tags and title

**Validation:** File exists and references correct JSX entry

---

### Step 3: Create JSX Entry Point

**Files:** `app/src/message-curation.jsx`
**Purpose:** Mount React component to DOM

**Details:**
- Follow pattern from `simulation-admin.jsx`
- Import and render `MessageCurationPage` component
- Wrap with `ToastProvider` for notifications

**Validation:** Entry point follows Islands architecture pattern

---

### Step 4: Create Edge Function - message-curation

**Files:** `supabase/functions/message-curation/index.ts`
**Purpose:** Backend API for message curation operations

**Details:**
- Implement action-based routing pattern
- Actions: `getThreads`, `getThreadMessages`, `getMessage`, `deleteMessage`, `deleteThread`, `forwardMessage`, `sendSplitBotMessage`
- Authenticate admin/corporate users using existing pattern
- Use service role client for database operations

**Actions to implement:**

| Action | Description | Payload |
|--------|-------------|---------|
| `getThreads` | Search and list threads with pagination | `{ search?, limit?, offset? }` |
| `getThreadMessages` | Get all messages for a thread | `{ threadId }` |
| `getMessage` | Get single message with relations | `{ messageId }` |
| `deleteMessage` | Soft delete a message | `{ messageId }` |
| `deleteThread` | Soft delete all messages in thread | `{ threadId }` |
| `forwardMessage` | Forward message to support email | `{ messageId, recipientEmail? }` |
| `sendSplitBotMessage` | Send Split Bot message in thread | `{ threadId, messageBody, recipientType }` |

**Validation:**
- Test each action via Supabase CLI
- Verify admin authentication works
- Check response format matches standard

---

### Step 5: Create Page Component Directory Structure

**Files:** Create directory `app/src/islands/pages/MessageCurationPage/`
**Purpose:** Organize page components following existing patterns

**Directory structure:**
```
MessageCurationPage/
  index.jsx                     # Re-export
  MessageCurationPage.jsx       # Hollow component (UI only)
  MessageCurationPage.css       # Styles
  useMessageCurationPageLogic.js # All business logic
  components/
    ThreadSelector.jsx          # Thread search and dropdown
    ConversationHistory.jsx     # Message list in thread
    MessageDisplay.jsx          # Selected message details
    ModerationActions.jsx       # Delete/forward actions
    SplitBotMessaging.jsx       # Split Bot message sender
    ConfirmationModal.jsx       # Delete confirmation modal
```

**Validation:** Directory structure matches SimulationAdminPage pattern

---

### Step 6: Implement useMessageCurationPageLogic.js

**Files:** `app/src/islands/pages/MessageCurationPage/useMessageCurationPageLogic.js`
**Purpose:** All business logic for the message curation page

**Details:**
- State management for threads, messages, selection
- API calls to message-curation Edge Function
- Event handlers for user interactions
- URL parameter support (`?thread=id&message=id`)
- Toast notifications for success/error feedback

**State to manage:**
```javascript
// Thread state
const [threads, setThreads] = useState([]);
const [totalThreadCount, setTotalThreadCount] = useState(0);
const [selectedThreadId, setSelectedThreadId] = useState(null);
const [searchText, setSearchText] = useState('');
const [isLoadingThreads, setIsLoadingThreads] = useState(false);

// Message state
const [messages, setMessages] = useState([]);
const [selectedMessage, setSelectedMessage] = useState(null);
const [isLoadingMessages, setIsLoadingMessages] = useState(false);

// Modal state
const [isDeleteMessageModalOpen, setIsDeleteMessageModalOpen] = useState(false);
const [isDeleteThreadModalOpen, setIsDeleteThreadModalOpen] = useState(false);

// Processing state
const [isProcessing, setIsProcessing] = useState(false);
const [error, setError] = useState(null);
```

**Functions to implement:**
- `fetchThreads()` - Load threads with search/pagination
- `fetchThreadMessages(threadId)` - Load messages for selected thread
- `handleThreadSelect(threadId)` - Select thread and load messages
- `handleMessageClick(message)` - Select message for details
- `handleDeleteMessage()` - Soft delete selected message
- `handleDeleteThread()` - Soft delete all messages in thread
- `handleForwardMessage()` - Forward message to support
- `handleSendSplitBotMessage(messageBody, recipientType)` - Send Split Bot message

**Validation:** Hook returns all necessary state and handlers

---

### Step 7: Implement MessageCurationPage.jsx (Hollow Component)

**Files:** `app/src/islands/pages/MessageCurationPage/MessageCurationPage.jsx`
**Purpose:** UI-only component following hollow pattern

**Details:**
- Import and use `useMessageCurationPageLogic` hook
- Three-column layout: Thread Selection | Conversation History | Message Details
- No business logic in component - only JSX rendering
- Import sub-components for each section

**Layout structure:**
```
+-------------------------------------------------------+
|                    Corporate Header                    |
+-------------------------------------------------------+
| Thread Selector | Conversation History | Message       |
| (search, list)  | (message list)       | Details &    |
|                 |                      | Actions      |
|                 |                      |              |
|                 |                      | Split Bot    |
|                 |                      | Messaging    |
+-------------------------------------------------------+
```

**Validation:** Component renders correctly with mock data

---

### Step 8: Implement ThreadSelector Component

**Files:** `app/src/islands/pages/MessageCurationPage/components/ThreadSelector.jsx`
**Purpose:** Search and select threads

**Details:**
- Search input with magnifying glass icon
- Thread count display
- Dropdown select for threads
- "Show More" pagination button
- Display format: `{listing.name} - {guestUser.email}`

**Props:**
```javascript
{
  threads: Array,
  selectedThreadId: string | null,
  searchText: string,
  totalCount: number,
  isLoading: boolean,
  onThreadSelect: (threadId) => void,
  onSearchChange: (text) => void,
  onShowMore: () => void
}
```

**Validation:** Search updates list, selection triggers callback

---

### Step 9: Implement ConversationHistory Component

**Files:** `app/src/islands/pages/MessageCurationPage/components/ConversationHistory.jsx`
**Purpose:** Display all messages in selected thread

**Details:**
- Scrollable message list
- Visual indicators for sender type (guest=blue, host=green, splitbot=purple)
- Warning icon for messages with `splitBotWarning`
- Check icon for forwarded messages
- Click to select message
- Highlight selected message

**Props:**
```javascript
{
  messages: Array,
  selectedMessageId: string | null,
  onMessageClick: (message) => void
}
```

**Validation:** Messages display correctly, click selects message

---

### Step 10: Implement MessageDisplay Component

**Files:** `app/src/islands/pages/MessageCurationPage/components/MessageDisplay.jsx`
**Purpose:** Show detailed message information

**Details:**
- Guest info section with avatar and email
- Host info section with avatar and email
- Listing name display
- Originator indicator
- Message ID with copy-to-clipboard
- Message body in read-only textarea
- Forwarded status badge if applicable

**Props:**
```javascript
{
  message: Object | null
}
```

**Validation:** All message details display correctly

---

### Step 11: Implement ModerationActions Component

**Files:** `app/src/islands/pages/MessageCurationPage/components/ModerationActions.jsx`
**Purpose:** Moderation action buttons

**Details:**
- Forward message button (purple)
- Delete message button (red)
- Delete conversation button (red, with warning styling)
- Confirmation modals for destructive actions
- Loading states during operations

**Props:**
```javascript
{
  messageId: string,
  threadId: string,
  isProcessing: boolean,
  onDeleteMessage: () => void,
  onDeleteThread: () => void,
  onForwardMessage: () => void,
  onOpenDeleteMessageModal: () => void,
  onOpenDeleteThreadModal: () => void
}
```

**Validation:** Buttons trigger appropriate callbacks, modals appear

---

### Step 12: Implement SplitBotMessaging Component

**Files:** `app/src/islands/pages/MessageCurationPage/components/SplitBotMessaging.jsx`
**Purpose:** Send automated Split Bot messages

**Details:**
- Textarea for message body
- Radio buttons for recipient selection (Guest/Host)
- Template buttons for common messages:
  - "Contact info redacted"
  - "Please limit messages"
  - "Lease documents signed"
- Send button with loading state
- Error display

**Props:**
```javascript
{
  threadId: string,
  isProcessing: boolean,
  onSendMessage: (messageBody, recipientType) => void
}
```

**Templates:**
```javascript
const TEMPLATES = {
  redacted_contact_info: "We noticed your message contained contact information. For your safety and security, we've removed it. Please use Split Lease messaging for all communications.",
  limit_messages: "We noticed a high volume of messages in this conversation. Please consolidate your messages to help keep the conversation organized.",
  lease_documents_signed: "Great news! Your lease documents have been signed and processed. You can now proceed with your move-in arrangements."
};
```

**Validation:** Messages send successfully, templates load correctly

---

### Step 13: Implement ConfirmationModal Component

**Files:** `app/src/islands/pages/MessageCurationPage/components/ConfirmationModal.jsx`
**Purpose:** Reusable confirmation modal for destructive actions

**Details:**
- Title and message props
- Confirm and Cancel buttons
- Configurable confirm button variant (warning/danger)
- Loading state during operation
- Click outside to close

**Props:**
```javascript
{
  isOpen: boolean,
  title: string,
  message: string,
  confirmLabel: string,
  confirmVariant: 'warning' | 'danger' | 'primary',
  isProcessing: boolean,
  onConfirm: () => void,
  onCancel: () => void
}
```

**Validation:** Modal appears/closes correctly, callbacks fire

---

### Step 14: Create CSS Styles

**Files:** `app/src/islands/pages/MessageCurationPage/MessageCurationPage.css`
**Purpose:** Page-specific styles

**Details:**
- Three-column responsive layout
- Card styling for sections
- Button variants (primary, secondary, danger, purple)
- Avatar/initials styling
- Message bubble styling
- Modal styling
- Loading and error states

**Validation:** Page renders correctly on desktop and mobile

---

### Step 15: Create Edge Function deno.json

**Files:** `supabase/functions/message-curation/deno.json`
**Purpose:** Deno configuration and import map

**Details:**
- Follow pattern from existing Edge Functions
- Import shared utilities

```json
{
  "imports": {
    "@supabase/supabase-js": "https://esm.sh/@supabase/supabase-js@2"
  }
}
```

**Validation:** Edge Function deploys without import errors

---

### Step 16: Update Supabase config.toml

**Files:** `supabase/config.toml`
**Purpose:** Register new Edge Function

**Details:**
- Add `message-curation` function entry
- Set verify_jwt to false (function handles own auth)

**Validation:** Function appears in `supabase functions list`

---

### Step 17: Integration Testing

**Files:** Various
**Purpose:** End-to-end testing of functionality

**Test scenarios:**
1. Page loads and authenticates admin user
2. Thread search returns matching results
3. Thread selection loads messages
4. Message selection shows details
5. Delete message soft-deletes correctly
6. Delete thread soft-deletes all messages
7. Forward message sends email (mock in dev)
8. Split Bot message creates new message in thread
9. Non-admin users are denied access

**Validation:** All test scenarios pass

---

## Edge Cases & Error Handling

| Edge Case | How to Handle |
|-----------|---------------|
| Thread has no messages | Show "No messages in this thread" placeholder |
| Message already deleted | Skip in display, don't allow double-delete |
| User is not admin/corporate | Return 403, redirect to unauthorized page |
| Thread not found | Return 404, show error message |
| Database operation fails | Log to Slack, return 500 with generic message |
| Empty search results | Show "No threads found" with clear search option |
| Split Bot user not found | Return 500 with clear error (critical config issue) |

## Testing Considerations

### Unit Tests
- Logic hook functions with mocked API responses
- Component rendering with various states (loading, error, empty, populated)

### Integration Tests
- Edge Function actions with test database
- Authentication flow for admin/non-admin users

### Manual Testing Checklist
- [ ] Login as admin, verify page access
- [ ] Search for threads by listing name
- [ ] Search for threads by user email
- [ ] Select thread, view messages
- [ ] Select message, view details
- [ ] Delete message, verify soft delete
- [ ] Delete thread, verify all messages soft deleted
- [ ] Forward message, verify email sent
- [ ] Send Split Bot message to guest
- [ ] Send Split Bot message to host
- [ ] Use template buttons
- [ ] Login as non-admin, verify access denied

## Rollback Strategy

1. Remove route from `routes.config.js`
2. Run `bun run generate-routes`
3. Delete `app/public/message-curation.html`
4. Delete `app/src/message-curation.jsx`
5. Delete `app/src/islands/pages/MessageCurationPage/` directory
6. Delete `supabase/functions/message-curation/` directory
7. Remove function from `config.toml`

## Dependencies & Blockers

| Dependency | Status | Notes |
|------------|--------|-------|
| Supabase `_message` table | EXISTS | Existing messaging infrastructure |
| Supabase `thread` table | EXISTS | Existing thread infrastructure |
| Supabase `user` table | EXISTS | For admin check and user info |
| Split Bot user record | VERIFY | Need user with `is Split Bot = true` |
| Slack webhook for forwarding | OPTIONAL | Can skip email forwarding initially |
| Toast component | EXISTS | `app/src/islands/shared/Toast` |

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Schema mismatch between Prisma and Supabase | Medium | High | Verify column names before implementation |
| Split Bot user not configured | Low | High | Document as prerequisite, add check |
| Performance with large thread lists | Low | Medium | Implement pagination from start |
| Email forwarding complexity | Medium | Low | Can defer to future enhancement |

## Architecture Decisions

### Decision 1: Separate Edge Function vs. Extend Existing Messages Function

**Decision:** Create new `message-curation` Edge Function

**Rationale:**
- Admin operations are distinct from user messaging
- Cleaner separation of concerns
- Admin auth pattern differs from user auth
- Easier to audit admin actions separately

### Decision 2: Soft Delete vs. Hard Delete

**Decision:** Use soft delete (set `deletedAt` timestamp or flag)

**Rationale:**
- Audit trail preservation
- Follows existing Split Lease patterns
- Recovery possible if needed
- Compliant with data retention requirements

### Decision 3: Component Structure

**Decision:** Flat component structure under `MessageCurationPage/components/`

**Rationale:**
- Follows existing admin page patterns (SimulationAdminPage)
- Components are page-specific, not shared
- Simpler than deep nesting

---

## File Reference Summary

### Files to Create

| File | Purpose |
|------|---------|
| `app/public/message-curation.html` | HTML entry |
| `app/src/message-curation.jsx` | JSX entry point |
| `app/src/islands/pages/MessageCurationPage/index.jsx` | Component re-export |
| `app/src/islands/pages/MessageCurationPage/MessageCurationPage.jsx` | Page component |
| `app/src/islands/pages/MessageCurationPage/MessageCurationPage.css` | Styles |
| `app/src/islands/pages/MessageCurationPage/useMessageCurationPageLogic.js` | Logic hook |
| `app/src/islands/pages/MessageCurationPage/components/ThreadSelector.jsx` | Thread selector |
| `app/src/islands/pages/MessageCurationPage/components/ConversationHistory.jsx` | Message list |
| `app/src/islands/pages/MessageCurationPage/components/MessageDisplay.jsx` | Message details |
| `app/src/islands/pages/MessageCurationPage/components/ModerationActions.jsx` | Action buttons |
| `app/src/islands/pages/MessageCurationPage/components/SplitBotMessaging.jsx` | Split Bot form |
| `app/src/islands/pages/MessageCurationPage/components/ConfirmationModal.jsx` | Confirm modal |
| `supabase/functions/message-curation/index.ts` | Edge Function |
| `supabase/functions/message-curation/deno.json` | Deno config |

### Files to Modify

| File | Change |
|------|--------|
| `app/src/routes.config.js` | Add message-curation route |
| `supabase/config.toml` | Register message-curation function |

### Reference Files (Read Only)

| File | Purpose |
|------|---------|
| `app/src/islands/pages/SimulationAdminPage/SimulationAdminPage.jsx` | Hollow component pattern |
| `app/src/islands/pages/SimulationAdminPage/useSimulationAdminPageLogic.js` | Logic hook pattern |
| `supabase/functions/simulation-admin/index.ts` | Admin Edge Function pattern |
| `supabase/functions/messages/index.ts` | Messaging patterns |
| `supabase/functions/messages/handlers/getThreads.ts` | Thread query pattern |
| `supabase/functions/messages/handlers/getMessages.ts` | Message query pattern |

---

**PLAN VERSION**: 1.0
**CREATED**: 2026-01-21
**AUTHOR**: Claude Code (Implementation Planner)
