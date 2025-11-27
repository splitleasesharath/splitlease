# API Functions - Cloudflare Pages Functions

**GENERATED**: 2025-11-27
**PARENT**: app/functions/

---

## DIRECTORY_INTENT

[PURPOSE]: Cloudflare Pages Functions for API endpoints
[RUNTIME]: Cloudflare Workers (V8 isolate)
[PATTERN]: Export `onRequest*` handlers for HTTP methods

---

## FILE_INVENTORY

### faq-inquiry.js
[INTENT]: Handle FAQ inquiry form submissions
[ENDPOINT]: POST /api/faq-inquiry
[FUNCTION]: Sends inquiries to Slack channels via webhooks

---

## FUNCTION_DETAILS

### faq-inquiry.js

**Request Body:**
```json
{
  "name": "string",
  "email": "string",
  "inquiry": "string"
}
```

**Environment Variables Required:**
- `SLACK_WEBHOOK_ACQUISITION` - Slack webhook for acquisition channel
- `SLACK_WEBHOOK_GENERAL` - Slack webhook for general channel

**Response:**
- 200: `{ success: true, message: "Inquiry sent successfully" }`
- 400: Validation errors (missing fields, invalid email)
- 500: Server/Slack errors

**Features:**
- CORS headers for cross-origin requests
- Input validation (required fields, email format)
- Sends to multiple Slack channels in parallel
- Graceful error handling

---

## CLOUDFLARE_PAGES_PATTERN

```javascript
// Export named function for HTTP method
export async function onRequestPost(context) {
  const { request, env } = context;
  // Handle POST request
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' }
  });
}
```

---

## ENVIRONMENT_VARIABLES

Set in Cloudflare Pages Dashboard > Settings > Environment Variables:
- `SLACK_WEBHOOK_ACQUISITION`
- `SLACK_WEBHOOK_GENERAL`

---

**FILE_COUNT**: 1
