# slack Edge Function

**ENDPOINT**: `POST /functions/v1/slack`
**AUTH_REQUIRED**: No
**SOURCE**: `supabase/functions/slack/`

---

## Purpose

Slack integration for FAQ inquiries and notifications. Sends messages to designated Slack channels.

---

## Actions

| Action | Description |
|--------|-------------|
| `faq_inquiry` | Send FAQ inquiry to Slack channel |

---

## Request Format

### faq_inquiry

```json
{
  "action": "faq_inquiry",
  "payload": {
    "name": "John Doe",
    "email": "john@example.com",
    "question": "How does the booking process work?",
    "page_url": "https://split.lease/faq"
  }
}
```

---

## Response Format

```json
{
  "success": true,
  "data": {
    "message": "Inquiry sent successfully"
  }
}
```

---

## Slack Message Format

```
📬 FAQ Inquiry

*Name:* John Doe
*Email:* john@example.com
*Page:* https://split.lease/faq

*Question:*
How does the booking process work?
```

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `SLACK_WEBHOOK_GENERAL` | Webhook URL for general channel |

---

## Dependencies

- `_shared/cors.ts`
- `_shared/slack.ts` (optional, for centralized webhook handling)

---

**LAST_UPDATED**: 2025-12-11
