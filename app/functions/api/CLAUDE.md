# API Functions - LLM Reference

**GENERATED**: 2025-12-11
**SCOPE**: Cloudflare Pages Functions for API endpoints

---

## QUICK_STATS

[TOTAL_FILES]: 2
[FILE_TYPES]: JavaScript
[RUNTIME]: Cloudflare Workers (V8 isolate)
[URL_PATH]: `/api/*`

---

## DIRECTORY_INTENT

[PURPOSE]: Cloudflare Pages Functions for serverless API endpoints
[RUNTIME]: Cloudflare Workers V8 isolate environment
[PATTERN]: Export `onRequest*` handlers for HTTP methods
[BENEFIT]: Serverless edge functions with zero cold starts

---

## FILES

### faq-inquiry.js
[INTENT]: Handle FAQ inquiry form submissions
[ENDPOINT]: POST /api/faq-inquiry
[FUNCTION]: Sends user inquiries to Slack channels via webhooks
[METHODS]: POST

### import-listing.js
[INTENT]: Handle listing import requests from external platforms
[ENDPOINT]: POST /api/import-listing
[FUNCTION]: Sends listing import requests to Slack channels via webhooks
[METHODS]: POST

---

## FUNCTION_DETAILS

### faq-inquiry.js

#### Request
[METHOD]: POST
[CONTENT_TYPE]: application/json
[BODY_SCHEMA]:
```json
{
  "name": "string (required)",
  "email": "string (required, valid email)",
  "inquiry": "string (required)"
}
```

#### Environment Variables
[REQUIRED_SECRETS]:
- `SLACK_WEBHOOK_ACQUISITION` - Slack webhook for acquisition channel
- `SLACK_WEBHOOK_GENERAL` - Slack webhook for general channel

#### Response Codes
[200]: `{ success: true, message: "Inquiry sent successfully" }`
[400]: Validation errors (missing fields, invalid email format)
[500]: Server errors or Slack webhook failures

#### Features
[CORS]: Cross-origin request support
[VALIDATION]: Required field checking, email format validation
[PARALLEL_DELIVERY]: Sends to multiple Slack channels concurrently
[ERROR_HANDLING]: Graceful error responses with descriptive messages

### import-listing.js

#### Request
[METHOD]: POST
[CONTENT_TYPE]: application/json
[BODY_SCHEMA]:
```json
{
  "listingUrl": "string (required)",
  "emailAddress": "string (required, valid email)"
}
```

#### Environment Variables
[REQUIRED_SECRETS]:
- `SLACK_WEBHOOK_ADDINGLISTINGS` - Slack webhook for adding listings channel
- `SLACK_WEBHOOK_GENERAL` - Slack webhook for general channel

#### Response Codes
[200]: `{ success: true, message: "Import request submitted successfully" }`
[400]: Validation errors (missing fields, invalid email format)
[500]: Server errors or Slack webhook failures

#### Features
[CORS]: Cross-origin request support
[VALIDATION]: Required field checking, email format validation
[PARALLEL_DELIVERY]: Sends to both Slack channels concurrently
[ERROR_HANDLING]: Graceful error responses with descriptive messages

---

## CLOUDFLARE_PAGES_PATTERN

```javascript
// Export named function for HTTP method
export async function onRequestPost(context) {
  const { request, env } = context;

  // Access request body
  const body = await request.json();

  // Access environment variables
  const secret = env.SECRET_KEY;

  // Return response
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}
```

---

## HTTP_METHOD_HANDLERS

[onRequestGet]: Handle GET requests
[onRequestPost]: Handle POST requests
[onRequestPut]: Handle PUT requests
[onRequestPatch]: Handle PATCH requests
[onRequestDelete]: Handle DELETE requests
[onRequest]: Handle all HTTP methods

---

## ENVIRONMENT_CONFIGURATION

[LOCATION]: Cloudflare Pages Dashboard > Settings > Environment Variables
[SECRETS]:
- SLACK_WEBHOOK_ACQUISITION
- SLACK_WEBHOOK_ADDINGLISTINGS
- SLACK_WEBHOOK_GENERAL

[SCOPE]: Production and Preview environments
[ACCESS]: Available via `context.env` in function handlers

---

## URL_ROUTING

[PATTERN]: `/api/{filename}` maps to `/functions/api/{filename}.js`
[EXAMPLE]: `/api/faq-inquiry` → `/functions/api/faq-inquiry.js`
[METHOD]: Determined by exported handler (onRequestPost, etc.)

---

## DEVELOPMENT_NOTES

[LOCAL_TESTING]: Use `wrangler pages dev` for local development
[SECRETS_LOCAL]: Create `.dev.vars` file for local environment variables
[DEPLOYMENT]: Automatic deployment on git push to connected branch
[LOGS]: View logs in Cloudflare Dashboard > Pages > Functions

---

## COMPARISON_WITH_EDGE_FUNCTIONS

[CLOUDFLARE_FUNCTIONS]: This directory - Cloudflare Pages Functions
[SUPABASE_EDGE_FUNCTIONS]: `supabase/functions/` - Supabase Edge Functions (Deno)
[USE_CLOUDFLARE_FOR]: Simple API endpoints, webhooks, form handlers
[USE_SUPABASE_FOR]: Database operations, Bubble API proxy, authentication
