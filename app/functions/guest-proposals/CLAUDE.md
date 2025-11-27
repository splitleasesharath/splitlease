# Guest Proposals Functions - Cloudflare Pages Functions

**GENERATED**: 2025-11-27
**PARENT**: app/functions/

---

## DIRECTORY_INTENT

[PURPOSE]: Dynamic routing for guest proposals pages
[RUNTIME]: Cloudflare Workers (V8 isolate)
[PATTERN]: File-based routing with dynamic segments

---

## FILE_INVENTORY

### [id].js
[INTENT]: Handle dynamic guest proposal routes
[PATTERN]: Catches `/guest-proposals/[any-user-id]` requests
[FUNCTION]: Serves guest-proposals.html while preserving URL for client-side parsing

---

## FUNCTION_DETAILS

### [id].js

**Route Pattern:**
- `/guest-proposals/abc123` -> Serves guest-proposals.html
- `/guest-proposals/xyz789` -> Serves guest-proposals.html

**How It Works:**
1. Extracts `userId` from `params.id`
2. Rewrites request to fetch `/guest-proposals.html` from static assets
3. Returns HTML with no-cache headers
4. Client-side JavaScript parses URL to get the user ID

**Headers Set:**
```javascript
'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0'
'Pragma': 'no-cache'
'Expires': '0'
```

---

## CLOUDFLARE_PAGES_ROUTING

File-based routing with dynamic segments:
- `[id].js` matches any single path segment
- `[[path]].js` would match any path (catch-all)

```javascript
export async function onRequest(context) {
  const { request, env, params } = context;
  const userId = params.id; // From URL

  // Fetch static HTML asset
  const response = await env.ASSETS.fetch(url);
  return response;
}
```

---

## CLIENT_SIDE_USAGE

The React app parses the URL to extract the user ID:
```javascript
const pathParts = window.location.pathname.split('/');
const userId = pathParts[pathParts.length - 1];
```

---

**FILE_COUNT**: 1
