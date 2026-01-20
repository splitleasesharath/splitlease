# Reminder Scheduler Edge Function

**GENERATED**: 2026-01-20
**VERSION**: 1.0
**LOCATION**: `supabase/functions/reminder-scheduler/index.ts`
**ENDPOINT**: `POST /functions/v1/reminder-scheduler`

---

## Overview

Automated reminder system for house manuals. Sends scheduled reminders to guests via email and SMS, with webhook support for delivery status tracking.

---

## Actions

| Action | Purpose | Auth Required |
|--------|---------|---------------|
| `create` | Create a new reminder | Public* |
| `update` | Update existing reminder | Public* |
| `get` | Get reminder details | Public* |
| `get-by-visit` | Get reminders for a specific visit | Public* |
| `delete` | Delete a reminder | Public* |
| `process-pending` | Process all pending reminders (cron) | No |
| `webhook-sendgrid` | Handle SendGrid delivery webhooks | No |
| `webhook-twilio` | Handle Twilio delivery webhooks | No |
| `health` | Health check endpoint | No |

> **Note**: "Public*" indicates actions are temporarily public during Supabase auth migration.

---

## FP Architecture

Follows functional programming patterns:

```typescript
// Result type for error propagation
import { Result, ok, err } from "../_shared/fp/result.ts";
import {
  parseRequest,
  validateAction,
  routeToHandler,
  isPublicAction,
  getSupabaseConfig,
  formatSuccessResponse,
  formatErrorResponseHttp,
  formatCorsResponse,
  CorsPreflightSignal,
} from "../_shared/fp/orchestration.ts";
```

---

## Request/Response Format

### Create Reminder

```json
// Request
{
  "action": "create",
  "payload": {
    "visit_id": "uuid",
    "guest_user_id": "uuid",
    "reminder_type": "house_manual",
    "scheduled_at": "2026-01-25T10:00:00Z",
    "delivery_channels": ["email", "sms"],
    "message_template": "Don't forget to review the house manual!"
  }
}

// Response
{
  "success": true,
  "data": {
    "reminder_id": "uuid",
    "status": "pending",
    "scheduled_at": "2026-01-25T10:00:00Z"
  }
}
```

### Get Reminders by Visit

```json
// Request
{
  "action": "get-by-visit",
  "payload": {
    "visit_id": "uuid"
  }
}

// Response
{
  "success": true,
  "data": {
    "reminders": [
      {
        "id": "uuid",
        "reminder_type": "house_manual",
        "status": "pending",
        "scheduled_at": "2026-01-25T10:00:00Z",
        "delivery_channels": ["email", "sms"]
      }
    ]
  }
}
```

### Process Pending (Cron Job)

```json
// Request (triggered by cron)
{
  "action": "process-pending",
  "payload": {}
}

// Response
{
  "success": true,
  "data": {
    "processed": 5,
    "sent": 5,
    "failed": 0
  }
}
```

---

## Webhook Integration

### SendGrid Webhook

Handles email delivery status updates:

```json
// Incoming webhook from SendGrid
{
  "action": "webhook-sendgrid",
  "payload": {
    "event": "delivered",
    "email": "guest@example.com",
    "sg_message_id": "...",
    "timestamp": 1737374400
  }
}
```

### Twilio Webhook

Handles SMS delivery status updates:

```json
// Incoming webhook from Twilio
{
  "action": "webhook-twilio",
  "payload": {
    "MessageSid": "SM...",
    "MessageStatus": "delivered",
    "To": "+1234567890"
  }
}
```

---

## Cron Job Configuration

The `process-pending` action is triggered by a cron job:

```sql
-- pg_cron configuration
SELECT cron.schedule(
  'process-reminder-scheduler',
  '*/5 * * * *',  -- Every 5 minutes
  $$SELECT net.http_post(
    'https://your-project.supabase.co/functions/v1/reminder-scheduler',
    '{"action": "process-pending", "payload": {}}'::jsonb
  )$$
);
```

---

## Related Tables

| Table | Purpose |
|-------|---------|
| `reminder_*` | Reminder records and schedules |
| `visit` | Visit/stay information |
| `user` | Guest contact information |

---

## Notification Channels

| Channel | Provider | Status |
|---------|----------|--------|
| Email | SendGrid | Active |
| SMS | Twilio | Active |
| Push | — | Future |

---

## Related Files

- Handler: `reminder-scheduler/handlers/create.ts`
- Handler: `reminder-scheduler/handlers/update.ts`
- Handler: `reminder-scheduler/handlers/get.ts`
- Handler: `reminder-scheduler/handlers/delete.ts`
- Handler: `reminder-scheduler/handlers/processPending.ts`
- Handler: `reminder-scheduler/handlers/webhookSendgrid.ts`
- Handler: `reminder-scheduler/handlers/webhookTwilio.ts`

---

**LAST_UPDATED**: 2026-01-20
