# Virtual Meeting Edge Function

**GENERATED**: 2026-01-20
**VERSION**: 1.0
**LOCATION**: `supabase/functions/virtual-meeting/index.ts`
**ENDPOINT**: `POST /functions/v1/virtual-meeting`

---

## Overview

Virtual meeting scheduling and management system. Handles meeting requests, acceptance, decline, and notification flows between hosts and guests.

---

## Actions

| Action | Purpose | Auth Required |
|--------|---------|---------------|
| `create` | Create a new virtual meeting request | Public* |
| `delete` | Delete/cancel a virtual meeting | Public* |
| `accept` | Accept a meeting with booked date | Public* |
| `decline` | Decline a meeting request | Public* |
| `send_calendar_invite` | Trigger Google Calendar invite via Zapier | Public* |
| `notify_participants` | Send SMS/Email notifications | Public* |

> **Note**: "Public*" indicates actions are temporarily public during Supabase auth migration.

---

## FP Architecture

Follows functional programming patterns with immutable data:

```typescript
// Configuration (Immutable)
const ALLOWED_ACTIONS = [
  "create", "delete", "accept", "decline",
  "send_calendar_invite", "notify_participants"
] as const;

const PUBLIC_ACTIONS: ReadonlySet<string> = new Set([
  "create", "delete", "accept", "decline",
  "send_calendar_invite", "notify_participants"
]);

// Handler map (immutable record)
const handlers: Readonly<Record<Action, Function>> = {
  create: handleCreate,
  delete: handleDelete,
  accept: handleAccept,
  decline: handleDecline,
  send_calendar_invite: handleSendCalendarInvite,
  notify_participants: handleNotifyParticipants,
};
```

---

## Request/Response Format

### Create Meeting Request

```json
// Request
{
  "action": "create",
  "payload": {
    "host_user_id": "uuid",
    "guest_user_id": "uuid",
    "listing_id": "uuid",
    "proposed_times": [
      "2026-01-25T10:00:00Z",
      "2026-01-25T14:00:00Z",
      "2026-01-26T10:00:00Z"
    ],
    "message": "I'd like to schedule a virtual tour"
  }
}

// Response
{
  "success": true,
  "data": {
    "meeting_id": "uuid",
    "status": "pending",
    "created_at": "2026-01-20T..."
  }
}
```

### Accept Meeting

```json
// Request
{
  "action": "accept",
  "payload": {
    "meeting_id": "uuid",
    "selected_time": "2026-01-25T10:00:00Z",
    "google_meet_link": "https://meet.google.com/xxx-xxxx-xxx"
  }
}

// Response
{
  "success": true,
  "data": {
    "meeting_id": "uuid",
    "status": "confirmed",
    "scheduled_at": "2026-01-25T10:00:00Z",
    "google_meet_link": "https://meet.google.com/xxx-xxxx-xxx"
  }
}
```

### Send Calendar Invite

```json
// Request
{
  "action": "send_calendar_invite",
  "payload": {
    "meeting_id": "uuid"
  }
}

// Response
{
  "success": true,
  "data": {
    "calendar_invite_sent": true,
    "recipients": ["host@example.com", "guest@example.com"]
  }
}
```

### Notify Participants

```json
// Request
{
  "action": "notify_participants",
  "payload": {
    "meeting_id": "uuid",
    "notification_type": "reminder",
    "channels": ["email", "sms"]
  }
}

// Response
{
  "success": true,
  "data": {
    "notifications_sent": {
      "email": 2,
      "sms": 2
    }
  }
}
```

---

## Meeting Status Flow

```
pending → confirmed → completed
    ↓         ↓
declined   cancelled
```

| Status | Description |
|--------|-------------|
| `pending` | Meeting requested, awaiting host response |
| `confirmed` | Meeting accepted with scheduled time |
| `declined` | Meeting request declined by host |
| `cancelled` | Meeting cancelled after confirmation |
| `completed` | Meeting has taken place |

---

## Integration Points

| Integration | Purpose |
|-------------|---------|
| Zapier | Google Calendar invite creation |
| SendGrid | Email notifications |
| Twilio | SMS notifications |

---

## Related Tables

| Table | Purpose |
|-------|---------|
| `virtualmeetingschedulesandlinks` | Meeting records and schedules |
| `user` | Participant contact information |
| `listing` | Listing context for the meeting |

---

## Related Files

- Handler: `virtual-meeting/handlers/create.ts`
- Handler: `virtual-meeting/handlers/delete.ts`
- Handler: `virtual-meeting/handlers/accept.ts`
- Handler: `virtual-meeting/handlers/decline.ts`
- Handler: `virtual-meeting/handlers/sendCalendarInvite.ts`
- Handler: `virtual-meeting/handlers/notifyParticipants.ts`

---

**LAST_UPDATED**: 2026-01-20
