# Date Change Request Edge Function

**GENERATED**: 2026-01-20
**VERSION**: 1.0
**LOCATION**: `supabase/functions/date-change-request/index.ts`
**ENDPOINT**: `POST /functions/v1/date-change-request`

---

## Overview

Two-tier throttling date change system for lease reservations. Implements a graduated restriction system that first warns users, then hard-blocks excessive date change requests.

---

## Actions

| Action | Purpose | Auth Required |
|--------|---------|---------------|
| `create` | Create a new date change request | Public* |
| `get` | Get date change request details | Public* |
| `accept` | Accept a date change request | Public* |
| `decline` | Decline a date change request | Public* |
| `cancel` | Cancel a pending request | Public* |
| `get_throttle_status` | Check user's throttle status | Public* |
| `apply_hard_block` | Apply hard block to user | Public* |
| `update_warning_preference` | Update warning display preference | Public* |

> **Note**: "Public*" indicates actions are temporarily public during Supabase auth migration.

---

## Two-Tier Throttling System

### Tier 1: Warning Level

After a configurable number of date changes, users receive a warning:

```json
{
  "throttle_status": "warning",
  "changes_made": 3,
  "changes_allowed": 5,
  "message": "You've made 3 date changes. After 5 changes, you'll be blocked from making further requests."
}
```

### Tier 2: Hard Block

After exceeding the threshold, users are blocked:

```json
{
  "throttle_status": "hard_block",
  "changes_made": 6,
  "changes_allowed": 5,
  "message": "You've exceeded the maximum number of date change requests."
}
```

---

## Request/Response Format

### Create Date Change Request

```json
// Request
{
  "action": "create",
  "payload": {
    "lease_id": "uuid",
    "user_id": "uuid",
    "original_start_date": "2026-02-01",
    "original_end_date": "2026-02-28",
    "requested_start_date": "2026-02-08",
    "requested_end_date": "2026-03-07",
    "reason": "Work schedule changed"
  }
}

// Success Response
{
  "success": true,
  "data": {
    "request_id": "uuid",
    "status": "pending",
    "throttle_status": "ok"
  }
}

// Warning Response
{
  "success": true,
  "data": {
    "request_id": "uuid",
    "status": "pending",
    "throttle_status": "warning",
    "warning_message": "You've made 3 date changes..."
  }
}

// Hard Block Response
{
  "success": false,
  "error": "Date change request blocked: You've exceeded the maximum number of date change requests."
}
```

### Get Throttle Status

```json
// Request
{
  "action": "get_throttle_status",
  "payload": {
    "user_id": "uuid"
  }
}

// Response
{
  "success": true,
  "data": {
    "throttle_status": "warning",
    "changes_made": 4,
    "changes_allowed": 5,
    "next_reset_date": "2026-02-01"
  }
}
```

### Accept/Decline Request

```json
// Accept Request
{
  "action": "accept",
  "payload": {
    "request_id": "uuid",
    "host_user_id": "uuid"
  }
}

// Decline Request
{
  "action": "decline",
  "payload": {
    "request_id": "uuid",
    "host_user_id": "uuid",
    "decline_reason": "Cannot accommodate new dates"
  }
}
```

---

## Request Status Flow

```
pending → accepted → applied
    ↓         ↓
declined   cancelled
```

| Status | Description |
|--------|-------------|
| `pending` | Request awaiting host response |
| `accepted` | Host accepted, dates being updated |
| `applied` | Dates successfully changed |
| `declined` | Host declined the request |
| `cancelled` | Guest cancelled before host response |

---

## FP Architecture

```typescript
const ALLOWED_ACTIONS = [
  "create", "get", "accept", "decline", "cancel",
  "get_throttle_status", "apply_hard_block", "update_warning_preference"
] as const;

// Handler map (immutable record)
const handlers: Readonly<Record<Action, Function>> = {
  create: handleCreate,
  get: handleGet,
  accept: handleAccept,
  decline: handleDecline,
  cancel: handleCancel,
  get_throttle_status: handleGetThrottleStatus,
  apply_hard_block: handleApplyHardBlock,
  update_warning_preference: handleUpdateWarningPreference,
};
```

---

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `WARNING_THRESHOLD` | 3 | Number of changes before warning |
| `HARD_BLOCK_THRESHOLD` | 5 | Number of changes before hard block |
| `RESET_PERIOD_DAYS` | 30 | Days until throttle counter resets |

---

## Related Tables

| Table | Purpose |
|-------|---------|
| `date_change_request` | Request records and history |
| `lease` | Original and new lease dates |
| `user` | User throttle tracking |

---

## Related Files

- Handler: `date-change-request/handlers/create.ts`
- Handler: `date-change-request/handlers/get.ts`
- Handler: `date-change-request/handlers/accept.ts`
- Handler: `date-change-request/handlers/decline.ts`
- Handler: `date-change-request/handlers/cancel.ts`
- Handler: `date-change-request/handlers/getThrottleStatus.ts`
- Handler: `date-change-request/handlers/applyHardBlock.ts`
- Handler: `date-change-request/handlers/updateWarningPreference.ts`

---

**LAST_UPDATED**: 2026-01-20
