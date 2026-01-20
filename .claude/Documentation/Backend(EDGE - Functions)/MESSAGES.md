# Messages Edge Function

**GENERATED**: 2026-01-20
**VERSION**: 1.0
**LOCATION**: `supabase/functions/messages/index.ts`
**ENDPOINT**: `POST /functions/v1/messages`

---

## Overview

Real-time messaging system with SplitBot integration. Handles message threads between hosts and guests, including guest inquiries and proposal-related communications.

---

## Actions

| Action | Purpose | Auth Required |
|--------|---------|---------------|
| `send_message` | Send a message to a thread | Mixed* |
| `get_messages` | Retrieve messages from a thread | Mixed* |
| `get_threads` | Get user's message threads | Mixed* |
| `send_guest_inquiry` | Send guest inquiry to host | Mixed* |
| `create_proposal_thread` | Create thread for proposal communications | Mixed* |

> **Note**: "Mixed*" means JWT auth preferred, but legacy auth (user_id in payload) is supported.

---

## Authentication

Supports dual authentication:

1. **JWT Authentication**: Standard Supabase JWT token in Authorization header
2. **Legacy Auth**: `user_id` passed in payload (for Bubble.io compatibility)

```typescript
// JWT Auth (preferred)
const tokenResult = extractAuthToken(headers);

// Legacy Auth fallback
const payloadUserId = payload.user_id as string | undefined;
```

---

## Request/Response Format

### Send Message

```json
// Request
{
  "action": "send_message",
  "payload": {
    "thread_id": "uuid",
    "message": "Hello!",
    "user_id": "uuid"  // Optional if JWT auth
  }
}

// Response
{
  "success": true,
  "data": {
    "message_id": "uuid",
    "thread_id": "uuid",
    "created_at": "2026-01-20T..."
  }
}
```

### Get Threads

```json
// Request
{
  "action": "get_threads",
  "payload": {
    "user_id": "uuid"  // Optional if JWT auth
  }
}

// Response
{
  "success": true,
  "data": {
    "threads": [
      {
        "thread_id": "uuid",
        "last_message": "...",
        "unread_count": 2,
        "participants": [...]
      }
    ]
  }
}
```

### Send Guest Inquiry

```json
// Request
{
  "action": "send_guest_inquiry",
  "payload": {
    "listing_id": "uuid",
    "message": "I'm interested in your listing...",
    "user_id": "uuid"  // Optional if JWT auth
  }
}

// Response
{
  "success": true,
  "data": {
    "thread_id": "uuid",
    "message_id": "uuid"
  }
}
```

---

## Architecture

### FP Architecture Pattern

```typescript
// Result type for error propagation
import { Result, ok, err } from "../_shared/fp/result.ts";

// Pure function for user ID extraction
const getUserId = async (
  headers: Headers,
  payload: Record<string, unknown>,
  supabaseUrl: string,
  supabaseAnonKey: string,
  requireAuth: boolean
): Promise<Result<string, AuthenticationError>> => {
  // Try JWT first, fall back to payload.user_id
};
```

### Error Handling

Uses the functional ErrorLog pattern:

```typescript
import { createErrorLog, addError, setAction, ErrorLog } from "../_shared/fp/errorLog.ts";
import { reportErrorLog } from "../_shared/slack.ts";

// Consolidated error reporting to Slack
errorLog = addError(errorLog, error as Error, 'Fatal error in main handler');
reportErrorLog(errorLog);
```

---

## Related Tables

| Table | Purpose |
|-------|---------|
| `thread` | Message thread metadata |
| `message` | Individual messages |
| `user` | User references |

---

## SplitBot Integration

The messaging system includes SplitBot for automated responses and notifications:

- Welcome messages on thread creation
- Automated inquiry acknowledgments
- System notifications

---

## Related Files

- Handler: `messages/handlers/sendMessage.ts`
- Handler: `messages/handlers/getMessages.ts`
- Handler: `messages/handlers/getThreads.ts`
- Handler: `messages/handlers/sendGuestInquiry.ts`
- Handler: `messages/handlers/createProposalThread.ts`

---

**LAST_UPDATED**: 2026-01-20
