# Co-Host Request Edge Function

**GENERATED**: 2026-01-20
**VERSION**: 1.0
**LOCATION**: `supabase/functions/cohost-request/index.ts`
**ENDPOINT**: `POST /functions/v1/cohost-request`

---

## Overview

Handles co-host request lifecycle including request creation, rating submissions, and host notifications. Integrates with Slack for admin workflow.

---

## Actions

| Action | Purpose | Auth Required |
|--------|---------|---------------|
| `create` | Create a new co-host request | Public* |
| `rate` | Submit rating for a completed session | Public* |
| `notify-host` | Send notification after admin claims request | No |

> **Note**: "Public*" indicates actions are temporarily public during Supabase auth migration.

---

## Request Flow

```
Host requests co-host → Slack notification to admins
         ↓
Admin claims via Slack button → Modal opens
         ↓
Admin selects co-host + meeting time
         ↓
notify-host action triggered → Host receives email
         ↓
Meeting occurs
         ↓
Host submits rating via rate action
```

---

## Request Format

### Create Co-Host Request

```json
{
  "action": "create",
  "payload": {
    "host_user_id": "uuid",
    "listing_id": "uuid",
    "preferred_times": [
      "Monday, January 27 at 2:00 PM EST",
      "Tuesday, January 28 at 10:00 AM EST",
      "Wednesday, January 29 at 3:00 PM EST"
    ],
    "topics": ["listing_optimization", "pricing_strategy", "guest_screening"],
    "notes": "Looking for help with my first listing"
  }
}
```

### Rate Session

```json
{
  "action": "rate",
  "payload": {
    "request_id": "uuid",
    "rating": 5,
    "feedback": "Very helpful session!",
    "would_recommend": true
  }
}
```

### Notify Host (Internal)

```json
{
  "action": "notify-host",
  "payload": {
    "requestId": "uuid",
    "hostEmail": "host@example.com",
    "hostName": "John",
    "cohostName": "Sharath",
    "cohostEmail": "cohost@splitlease.com",
    "meetingDateTime": "Monday, January 27 at 2:00 PM EST",
    "googleMeetLink": "https://meet.google.com/xxx-xxxx-xxx"
  }
}
```

---

## Response Format

### Create Response

```json
{
  "success": true,
  "data": {
    "request_id": "uuid",
    "status": "Co-Host Requested",
    "slack_notification_sent": true
  }
}
```

### Rate Response

```json
{
  "success": true,
  "data": {
    "request_id": "uuid",
    "rating_submitted": true
  }
}
```

---

## Status Flow

```
Co-Host Requested → Co-Host Selected → Session Completed → Rated
        ↓
    Cancelled
```

| Status | Description |
|--------|-------------|
| `Co-Host Requested` | Initial request created |
| `Co-Host Selected` | Admin assigned a co-host |
| `Session Completed` | Meeting has taken place |
| `Rated` | Host submitted rating |
| `Cancelled` | Request was cancelled |

---

## Slack Integration

When a request is created, a Slack notification is sent to the acquisition channel:

```
┌─────────────────────────────────────────┐
│ 🆕 New Co-Host Request                  │
├─────────────────────────────────────────┤
│ Host: John Doe                          │
│ Email: john@example.com                 │
│ Listing: Cozy Brooklyn Apartment        │
│                                         │
│ Preferred Times:                        │
│ • Monday, Jan 27 at 2:00 PM EST        │
│ • Tuesday, Jan 28 at 10:00 AM EST      │
│                                         │
│ Topics: listing optimization, pricing   │
│                                         │
│ [Claim This Request]                    │
└─────────────────────────────────────────┘
```

Clicking "Claim This Request" triggers `cohost-request-slack-callback`.

---

## FP Architecture

```typescript
const ALLOWED_ACTIONS = ["create", "rate", "notify-host"] as const;

const PUBLIC_ACTIONS: ReadonlySet<string> = new Set(["create", "rate", "notify-host"]);

const handlers: Readonly<Record<Action, Function>> = {
  create: handleCreate,
  rate: handleRate,
  "notify-host": handleNotifyHost,
};
```

---

## Related Tables

| Table | Purpose |
|-------|---------|
| `co_hostrequest` | Request records |
| `reference_table.os_cohost_admins` | Available co-hosts |

---

## Related Functions

- [COHOST_REQUEST_SLACK_CALLBACK.md](./COHOST_REQUEST_SLACK_CALLBACK.md) - Slack interactive callback

---

## Related Files

- Handler: `cohost-request/handlers/create.ts`
- Handler: `cohost-request/handlers/rate.ts`
- Handler: `cohost-request/handlers/notify-host.ts`

---

**LAST_UPDATED**: 2026-01-20
