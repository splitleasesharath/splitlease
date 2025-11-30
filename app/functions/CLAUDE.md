# Functions Directory - Cloudflare Pages Functions

**GENERATED**: 2025-11-27
**SCOPE**: Cloudflare Pages Functions root directory
**OPTIMIZATION**: Semantic Searchability + Digestibility

---

## QUICK_STATS

[TOTAL_SUBDIRECTORIES]: 3
[RUNTIME]: Cloudflare Workers (V8 isolate)
[PATTERN]: File-based routing with exported handlers
[PRIMARY_LANGUAGE]: JavaScript

---

## DIRECTORY_INTENT

[PURPOSE]: Root directory for Cloudflare Pages Functions that handle server-side logic
[EXECUTION]: Runs on Cloudflare edge network as serverless functions
[ROUTING]: File paths map to URL paths (e.g., `api/faq-inquiry.js` -> `/api/faq-inquiry`)

---

## SUBDIRECTORY_INVENTORY

### api/
[INTENT]: API endpoints for form submissions and backend services
[CONTENTS]: faq-inquiry.js - Slack webhook integration for FAQ inquiries
[ENDPOINT]: `/api/*`

### view-split-lease/
[INTENT]: Dynamic routing for split lease detail pages
[ENDPOINT]: `/view-split-lease/[id]`
[STATUS]: Empty - may use static routing instead

---

## CLOUDFLARE_PAGES_FUNCTION_PATTERN

```javascript
// For specific HTTP methods
export async function onRequestPost(context) {
  const { request, env } = context;
  return new Response(JSON.stringify(data));
}

// For all HTTP methods
export async function onRequest(context) {
  const { request, env, params } = context;
  return new Response(body);
}
```

---

## CONTEXT_OBJECT_PROPERTIES

| Property | Description |
|----------|-------------|
| `request` | Incoming Request object |
| `env` | Environment variables and bindings |
| `params` | Dynamic route parameters |
| `env.ASSETS` | Static asset binding for serving HTML |

---

## ENVIRONMENT_VARIABLES

Set in Cloudflare Pages Dashboard:
- `SLACK_WEBHOOK_ACQUISITION` - Slack channel for acquisitions
- `SLACK_WEBHOOK_GENERAL` - Slack general channel

---

## ROUTING_RULES

| File | URL Pattern |
|------|-------------|
| `api/faq-inquiry.js` | `/api/faq-inquiry` |
| `view-split-lease/[id].js` | `/view-split-lease/*` |

---

## RELATIONSHIP_TO_APP

[SERVES]: Static HTML files from app build output
[INTEGRATES]: React apps parse URLs client-side after function serves HTML
[PATTERN]: Functions handle routing, apps handle rendering

---

**SUBDIRECTORY_COUNT**: 3
