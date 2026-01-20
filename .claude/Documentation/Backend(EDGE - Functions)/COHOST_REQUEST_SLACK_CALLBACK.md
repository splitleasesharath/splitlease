# Co-Host Request Slack Callback Edge Function

**GENERATED**: 2026-01-20
**VERSION**: 1.0
**LOCATION**: `supabase/functions/cohost-request-slack-callback/index.ts`
**ENDPOINT**: `POST /functions/v1/cohost-request-slack-callback`

---

## Overview

Handles Slack interactive elements for co-host request processing:

1. **Button clicks** (`claim_cohost_request`) - Opens modal form
2. **Modal submissions** (`cohost_assignment_modal`) - Updates database, notifies host

**CRITICAL**: Must respond within **3 seconds** or Slack times out.

---

## Payload Types

| Type | Trigger | Action |
|------|---------|--------|
| `block_actions` | Button click | Open assignment modal |
| `view_submission` | Modal submit | Process assignment |

---

## Button Click Handler

When admin clicks "Claim This Request":

1. Parse request metadata from button value
2. Fetch available co-hosts from `os_cohost_admins`
3. Build modal with:
   - Co-host dropdown
   - Preferred times as radio buttons
   - Custom date/time pickers
   - Google Meet link input
   - Internal notes
4. Open modal via Slack API

```typescript
// Modal view structure
const modalView = {
  type: "modal",
  callback_id: "cohost_assignment_modal",
  private_metadata: JSON.stringify({...requestData, adminSlackId, channelId, messageTs}),
  title: { type: "plain_text", text: "Assign Co-Host" },
  submit: { type: "plain_text", text: "Confirm Assignment" },
  blocks: [...]
};
```

---

## Modal Submission Handler

When admin submits the modal:

1. Extract form values:
   - Selected co-host
   - Meeting time (preferred or custom)
   - Google Meet link (optional)
   - Internal notes (optional)

2. Update `co_hostrequest` table:
   ```json
   {
     "Co-Host selected (OS)": "Sharath",
     "Status - Co-Host Request": "Co-Host Selected",
     "Meeting Date Time": "Monday, January 27 at 2:00 PM EST",
     "Google Meet Link": "https://meet.google.com/xxx-xxxx-xxx",
     "Admin Notes": "...",
     "Modified Date": "2026-01-20T..."
   }
   ```

3. Update original Slack message to show assignment complete

4. Trigger host notification (fire-and-forget):
   ```typescript
   fetch(`${supabaseUrl}/functions/v1/cohost-request`, {
     body: JSON.stringify({
       action: 'notify-host',
       payload: {...}
     })
   });
   ```

---

## Request Metadata

Passed through button value and modal private_metadata:

```typescript
interface RequestMetadata {
  requestId: string;
  hostUserId: string;
  hostEmail: string;
  hostName: string;
  listingId?: string;
  preferredTimes: string[];
  adminSlackId?: string;
  adminSlackName?: string;
  channelId?: string;
  messageTs?: string;
}
```

---

## Modal Fields

### Co-Host Selection

Dropdown populated from `reference_table.os_cohost_admins`:

```json
{
  "type": "input",
  "block_id": "cohost_select_block",
  "element": {
    "type": "static_select",
    "action_id": "cohost_select",
    "options": [
      {
        "text": { "type": "plain_text", "text": "Sharath" },
        "value": "{\"name\":\"sharath\",\"display\":\"Sharath\",\"email\":\"...\"}"
      }
    ]
  }
}
```

### Preferred Time Selection

Radio buttons from request's preferred times:

```json
{
  "type": "input",
  "block_id": "preferred_time_block",
  "element": {
    "type": "radio_buttons",
    "action_id": "preferred_time_select",
    "options": [
      {
        "text": { "type": "plain_text", "text": "Monday, January 27 at 2:00 PM EST" },
        "value": "time_0_Monday, January 27 at 2:00 PM EST"
      }
    ]
  }
}
```

### Custom Date/Time (Optional)

```json
{
  "type": "input",
  "block_id": "meeting_date_block",
  "optional": true,
  "element": { "type": "datepicker", "action_id": "meeting_date" }
},
{
  "type": "input",
  "block_id": "meeting_time_block",
  "optional": true,
  "element": { "type": "timepicker", "action_id": "meeting_time" }
}
```

---

## Updated Slack Message

After successful assignment:

```
┌─────────────────────────────────────────┐
│ ✅ Co-Host Request Assigned             │
├─────────────────────────────────────────┤
│ Host: John Doe                          │
│ Assigned Co-Host: Sharath               │
│                                         │
│ Request ID: abc-123                     │
│ Meeting: Monday, January 27 at 2:00 PM  │
│                                         │
│ Google Meet: Join Meeting               │
│                                         │
│ Processed by @admin                     │
│ Host notification will be sent          │
└─────────────────────────────────────────┘
```

---

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `SLACK_BOT_TOKEN` | Bot token for Slack API calls |
| `SUPABASE_URL` | For triggering notify-host |
| `SUPABASE_ANON_KEY` | Auth for notify-host call |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin database operations |

---

## Error Handling

Modal validation errors are returned to Slack:

```json
{
  "response_action": "errors",
  "errors": {
    "cohost_select_block": "Please select a co-host",
    "preferred_time_block": "Please select a preferred time or enter a custom date/time"
  }
}
```

---

## Related Functions

- [COHOST_REQUEST.md](./COHOST_REQUEST.md) - Main co-host request function

---

**LAST_UPDATED**: 2026-01-20
