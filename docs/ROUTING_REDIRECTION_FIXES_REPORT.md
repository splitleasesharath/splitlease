# Routing & Redirection Fixes Report

**Generated**: 2025-12-04
**Repository**: splitleasesharath/splitlease
**Branch**: main
**Purpose**: Comprehensive documentation of all routing, redirection, and URL-related bug fixes

---

## Executive Summary

This report documents **11 routing/redirection fixes** made to the Split Lease application between November 28 - December 4, 2025. The fixes addressed issues across three main areas:

1. **Vite Dev Server Routing** - Missing route handlers causing 404 errors in development
2. **Cloudflare Pages Deployment** - `_redirects` and `_routes.json` configuration issues
3. **URL Migration from Bubble.io** - Converting external Bubble URLs to internal relative paths

---

## Table of Contents

1. [Fix #1: Why-Split-Lease 404 Error](#fix-1-why-split-lease-404-error)
2. [Fix #2: Favorite Listings Auth Redirect](#fix-2-favorite-listings-auth-redirect)
3. [Fix #3: View Listing Clean URL Format](#fix-3-view-listing-clean-url-format)
4. [Fix #4: Self-Listing Dashboard Redirect](#fix-4-self-listing-dashboard-redirect)
5. [Fix #5: FAQ Inquiry 404 in Development](#fix-5-faq-inquiry-404-in-development)
6. [Fix #6: Footer About Team External URL](#fix-6-footer-about-team-external-url)
7. [Fix #7: Why-Split-Lease View Stories URL](#fix-7-why-split-lease-view-stories-url)
8. [Fix #8: FAQ Inquiry 405 Error Production](#fix-8-faq-inquiry-405-error-production)
9. [Fix #9: Self-Listing Redirect Without ID](#fix-9-self-listing-redirect-without-id)
10. [Fix #10: Guest Proposals Page Routing](#fix-10-guest-proposals-page-routing)
11. [Fix #11: FAQ Inquiry CORS Preflight](#fix-11-faq-inquiry-cors-preflight)

---

## Fix #1: Why-Split-Lease 404 Error

### Commit Information
| Field | Value |
|-------|-------|
| **Commit** | [`64d90a6`](https://github.com/splitleasesharath/splitlease/commit/64d90a64873b5a5341d93a091209a16b8ac89921) |
| **Date** | December 3, 2025 |
| **Author** | Claude Code |

### Bug Description
Users navigating to `/why-split-lease` received a 404 error in both development and preview servers. Additionally, clicking on listings from the search page navigated to an external Bubble.io URL instead of the internal React page.

### Root Cause Analysis
1. **Missing Route Handler**: The Vite dev server middleware in `vite.config.js` did not have a route handler for `/why-split-lease`, causing the server to not serve the correct HTML file.
2. **External URL Reference**: The `VIEW_LISTING_URL` constant pointed to `https://app.split.lease/view-split-lease` (Bubble.io) instead of the relative `/view-split-lease` path.

### Fix Implementation

**File: `app/vite.config.js`**
```javascript
// ADDED: Route handler for /why-split-lease in configureServer middleware
else if (url === '/why-split-lease' || url.startsWith('/why-split-lease?')) {
  const queryStart = url.indexOf('?');
  const queryString = queryStart !== -1 ? url.substring(queryStart) : '';
  req.url = '/public/why-split-lease.html' + queryString;
}

// ADDED: Same handler in configurePreviewServer middleware
else if (url === '/why-split-lease' || url.startsWith('/why-split-lease?')) {
  const queryStart = url.indexOf('?');
  const queryString = queryStart !== -1 ? url.substring(queryStart) : '';
  req.url = '/why-split-lease.html' + queryString;
}
```

**File: `app/src/lib/constants.js`**
```javascript
// BEFORE:
export const VIEW_LISTING_URL = 'https://app.split.lease/view-split-lease';

// AFTER:
export const VIEW_LISTING_URL = '/view-split-lease';
```

### Files Affected
- `app/vite.config.js` (+8 lines)
- `app/src/lib/constants.js` (+1/-1 lines)

### Impact
- Fixed 404 error on `/why-split-lease` page
- Listing clicks now stay within the React app instead of redirecting to Bubble.io

---

## Fix #2: Favorite Listings Auth Redirect

### Commit Information
| Field | Value |
|-------|-------|
| **Commit** | [`0e0ceb7`](https://github.com/splitleasesharath/splitlease/commit/0e0ceb7a98a9d6c5b5b01852154f34823a203744) |
| **Date** | December 3, 2025 |
| **Author** | Claude Code |

### Bug Description
When unauthenticated users accessed the `/favorite-listings` page, they were abruptly redirected to the login page without explanation.

### Root Cause Analysis
The component performed a hard redirect (`window.location.href = '/login'`) when authentication check failed, providing poor user experience with no context about why the redirect occurred.

### Fix Implementation

**File: `app/src/islands/pages/FavoriteListingsPage/FavoriteListingsPage.jsx`**
```jsx
// BEFORE: Hard redirect
if (!isAuthenticated) {
  window.location.href = '/login';
  return null;
}

// AFTER: Friendly error message
if (!isAuthenticated) {
  return (
    <div className="auth-required-message">
      <h2>Please log in to view your favorites</h2>
      <p>You need to be logged in to access your favorite listings.</p>
      <button onClick={() => setShowLoginModal(true)}>Log In</button>
    </div>
  );
}
```

### Files Affected
- `app/src/islands/pages/FavoriteListingsPage/FavoriteListingsPage.jsx` (+4/-3 lines)
- `app/vite.config.js` (+18/-1 lines) - Added about-us route handlers
- New files: `about-us.html`, `AboutUsPage.jsx`, `AboutUsPage.css`

### Impact
- Improved UX by showing a friendly message instead of abrupt redirect
- Users understand why they need to log in before being prompted

---

## Fix #3: View Listing Clean URL Format

### Commit Information
| Field | Value |
|-------|-------|
| **Commit** | [`5b1b9dd`](https://github.com/splitleasesharath/splitlease/commit/5b1b9ddb18b82e645404af61259f6513229a7acb) |
| **Date** | November 30, 2025 |
| **Author** | splitleasesharath |

### Bug Description
Listing URLs used query parameters (`/view-split-lease?listingId=123`) instead of clean URL paths (`/view-split-lease/123`).

### Root Cause Analysis
The `ProposalCard` component constructed the View Listing link using query parameters instead of path segments, inconsistent with the routing configuration expecting clean URLs.

### Fix Implementation

**File: `app/src/islands/pages/proposals/ProposalCard.jsx`**
```jsx
// BEFORE:
const viewListingUrl = `/view-split-lease?listingId=${listing._id}`;

// AFTER:
const viewListingUrl = `/view-split-lease/${listing._id}`;
```

### Files Affected
- `app/src/islands/pages/proposals/ProposalCard.jsx` (+1/-1 lines)

### Impact
- URLs are now cleaner and more SEO-friendly
- Consistent with `_redirects` configuration for Cloudflare Pages

---

## Fix #4: Self-Listing Dashboard Redirect

### Commit Information
| Field | Value |
|-------|-------|
| **Commit** | [`612fb31`](https://github.com/splitleasesharath/splitlease/commit/612fb31da77773997a4cd3ceeb720eb769766da2) |
| **Date** | December 3, 2025 |
| **Author** | Claude Code |

### Bug Description
After successfully creating a listing, users were redirected to an incorrect URL, and the header didn't refresh to show the logged-in state.

### Root Cause Analysis
1. **Wrong Redirect URL**: The redirect pointed to an incorrect path without proper query parameters
2. **Race Condition**: Header refresh triggered before auth token was stored in localStorage

### Fix Implementation

**File: `app/src/islands/pages/SelfListingPage/SelfListingPage.tsx`**
```typescript
// BEFORE:
window.location.href = '/listing-dashboard';

// AFTER:
window.location.href = `/listing-dashboard.html?listing_id=${listingId}`;

// BEFORE: Immediate header refresh
refreshHeaderKey();

// AFTER: Delayed refresh to ensure token storage
setTimeout(() => {
  refreshHeaderKey();
}, 100);

// BEFORE: Short toast duration
showToast('Success!', 2000);

// AFTER: Longer toast duration for visibility
showToast('Success!', 4000);
```

### Files Affected
- `app/src/islands/pages/SelfListingPage/SelfListingPage.tsx` (+9/-7 lines)

### Impact
- Users land on the correct dashboard page with listing context
- Header properly shows logged-in state after signup during listing flow

---

## Fix #5: FAQ Inquiry 404 in Development

### Commit Information
| Field | Value |
|-------|-------|
| **Commit** | [`232139e`](https://github.com/splitleasesharath/splitlease/commit/232139e017d9691dbbe040d047bc6a09222933b4) |
| **Date** | December 2, 2025 |
| **Author** | Claude Code |

### Bug Description
FAQ form submissions showed "Unexpected end of JSON input" error during local development. The `/api/faq-inquiry` endpoint returned 404 because Cloudflare Pages Functions only run in production or with wrangler.

### Root Cause Analysis
1. **Missing Dev Proxy**: Vite dev server had no proxy configuration for `/api` routes
2. **Poor Error Handling**: Frontend didn't handle non-JSON error responses gracefully
3. **Missing Route Handlers**: Clean URLs for `/faq`, `/policies`, `/list-with-us` weren't configured

### Fix Implementation

**File: `app/vite.config.js`**
```javascript
// ADDED: API proxy configuration
server: {
  proxy: {
    '/api': {
      target: 'http://127.0.0.1:8788', // wrangler pages dev port
      changeOrigin: true,
      secure: false,
      configure: (proxy, options) => {
        proxy.on('error', (err, req, res) => {
          // Mock response when wrangler isn't running
          if (req.url === '/api/faq-inquiry' && req.method === 'POST') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: true,
              message: 'Inquiry sent successfully (dev mode)'
            }));
          }
        });
      }
    }
  }
}
```

**File: `app/src/islands/pages/FAQPage.jsx`**
```jsx
// BEFORE: Assumed JSON response
const data = await response.json();

// AFTER: Graceful error handling
let data;
try {
  data = await response.json();
} catch (e) {
  // Handle non-JSON responses (like 404 HTML pages)
  throw new Error('Server returned an invalid response');
}
```

### Files Affected
- `app/vite.config.js` (+100 lines) - Proxy config + route handlers
- `app/src/islands/pages/FAQPage.jsx` (+14/-3 lines)

### Impact
- FAQ form works in development without wrangler
- Better error messages when API fails
- Clean URL routing for FAQ, policies, and list-with-us pages

---

## Fix #6: Footer About Team External URL

### Commit Information
| Field | Value |
|-------|-------|
| **Commit** | [`7bf8815`](https://github.com/splitleasesharath/splitlease/commit/7bf8815c86d78fdbf208785aaa43cd5c5be67063) |
| **Date** | December 3, 2025 |
| **Author** | Claude Code |

### Bug Description
The "About the Team" link in the footer pointed to the external Bubble.io URL (`https://app.split.lease/team`) instead of the new internal React page.

### Root Cause Analysis
During migration from Bubble.io to React, the footer link was not updated to point to the new internal `/about-us` page.

### Fix Implementation

**File: `app/src/islands/shared/Footer.jsx`**
```jsx
// BEFORE:
<a href="https://app.split.lease/team">About the Team</a>

// AFTER:
<a href="/about-us">About the Team</a>
```

### Files Affected
- `app/src/islands/shared/Footer.jsx` (+1/-1 lines)

### Impact
- Users stay within the React app when clicking About the Team
- Consistent navigation experience without external redirects

---

## Fix #7: Why-Split-Lease View Stories URL

### Commit Information
| Field | Value |
|-------|-------|
| **Commit** | [`8a230cc`](https://github.com/splitleasesharath/splitlease/commit/8a230cc396c0c5703a6e3e18217326c23cfaa64e) |
| **Date** | November 28, 2025 |
| **Author** | Claude Code |

### Bug Description
The "View Stories" link on the Why Split Lease page pointed to an external Bubble.io URL instead of the internal guest success stories page.

### Root Cause Analysis
Legacy link from Bubble.io migration was not updated when the guest success page was implemented in React.

### Fix Implementation

**File: `app/src/islands/pages/WhySplitLeasePage.jsx`**
```jsx
// BEFORE:
<a href="https://app.split.lease/guest-success">View Stories</a>

// AFTER:
<a href="/guest-success">View Stories</a>
```

### Files Affected
- `app/src/islands/pages/WhySplitLeasePage.jsx` (+107/-235 lines)
  - Also replaced custom day selector with SearchScheduleSelector component
  - Simplified featured listings to static cards

### Impact
- Users stay within the React app when viewing guest success stories
- Improved code reuse with shared SearchScheduleSelector component

---

## Fix #8: FAQ Inquiry 405 Error Production

### Commit Information
| Field | Value |
|-------|-------|
| **Commit** | [`39365c4`](https://github.com/splitleasesharath/splitlease/commit/39365c4182a54a7dbb42fc6f55145ff6af8a59bc) |
| **Date** | December 3, 2025 |
| **Author** | Claude Code |

### Bug Description
FAQ form submissions in production returned 405 Method Not Allowed errors. The Cloudflare Pages Function wasn't being invoked.

### Root Cause Analysis
The `_routes.json` file had conflicting exclude patterns that prevented the `/api/*` functions from being invoked:

```json
// PROBLEMATIC CONFIGURATION:
{
  "version": 1,
  "include": ["/api/*"],
  "exclude": [
    "/assets/*",
    "/*.html",
    "/*.js",
    "/*.css",
    "/images/*"
  ]
}
```

The `exclude` patterns were overly broad and conflicted with the API function routing.

### Fix Implementation

**File: `app/public/_routes.json`**
```json
// BEFORE (with conflicts):
{
  "version": 1,
  "include": ["/api/*"],
  "exclude": [
    "/assets/*",
    "/*.html",
    "/*.js",
    "/*.css",
    "/images/*"
  ]
}

// AFTER (simplified):
{
  "version": 1,
  "include": ["/api/*"],
  "exclude": []
}
```

### Files Affected
- `app/public/_routes.json` (+1/-6 lines)

### Impact
- API functions properly invoke in production
- FAQ inquiry form submissions work correctly

---

## Fix #9: Self-Listing Redirect Without ID

### Commit Information
| Field | Value |
|-------|-------|
| **Commit** | [`4f65b7e`](https://github.com/splitleasesharath/splitlease/commit/4f65b7ef192142f1aad8e5aec0db0eb3cceb159e) |
| **Date** | November 28, 2025 |
| **Author** | Claude Code |

### Bug Description
The CreateDuplicateListingModal was redirecting to `/self-listing.html?listing_id=undefined` when creating a new listing, causing issues with form initialization.

### Root Cause Analysis
The modal was trying to pass a listing ID that didn't exist yet for new listings. The self-listing page should load from localStorage draft instead of requiring a URL parameter.

### Fix Implementation

**File: `app/src/islands/shared/CreateDuplicateListingModal/CreateDuplicateListingModal.jsx`**
```jsx
// BEFORE:
window.location.href = `/self-listing.html?listing_id=${listing._id}`;

// AFTER:
// Store listing name in localStorage for new listings
localStorage.setItem('pendingListingName', listingName);
window.location.href = '/self-listing.html';
```

**File: `app/src/islands/pages/SelfListingPage/SelfListingPage.tsx`**
```typescript
// BEFORE: Required listing_id URL param
const listingId = new URLSearchParams(location.search).get('listing_id');
if (listingId) {
  await loadListingFromAPI(listingId);
}

// AFTER: Load from localStorage draft only
useEffect(() => {
  const draft = localStorage.getItem('selfListingDraft');
  if (draft) {
    loadFromDraft(JSON.parse(draft));
  }
}, []);
```

### Files Affected
- `app/src/islands/pages/SelfListingPage/SelfListingPage.tsx` (+14/-51 lines)
- `app/src/islands/shared/CreateDuplicateListingModal/CreateDuplicateListingModal.jsx` (+3/-3 lines)

### Impact
- New listings flow works without requiring pre-existing listing ID
- Form properly loads from localStorage draft

---

## Fix #10: Guest Proposals Page Routing

### Commit Information
| Field | Value |
|-------|-------|
| **Commit** | [`d57811d`](https://github.com/splitleasesharath/splitlease/commit/d57811d51d32e0e91ea97736a26f881e1318e2c1) |
| **Date** | November 29, 2025 |
| **Author** | splitleasesharath |

### Bug Description
New guest-proposals page was not accessible - needed routing configuration for both development and production.

### Root Cause Analysis
New page required configuration in multiple routing layers:
1. Vite dev server middleware
2. Vite preview server middleware
3. Cloudflare Pages `_redirects`
4. Cloudflare Pages `_routes.json`
5. Build entry points

### Fix Implementation

**File: `app/vite.config.js`**
```javascript
// ADDED to configureServer middleware:
else if (url === '/guest-proposals' || url.startsWith('/guest-proposals?')) {
  req.url = '/public/guest-proposals.html' + queryString;
}
else if (url.startsWith('/guest-proposals.html')) {
  req.url = '/public/guest-proposals.html' + ...;
}

// ADDED to build.rollupOptions.input:
'guest-proposals': resolve(__dirname, 'public/guest-proposals.html'),
```

**File: `app/public/_redirects`**
```
# ADDED:
/guest-proposals  /_internal/guest-proposals-view  200
/guest-proposals/  /_internal/guest-proposals-view  200
/guest-proposals/*  /_internal/guest-proposals-view  200
```

**File: `app/public/_routes.json`**
```json
// ADDED to include array:
"/guest-proposals/*"
```

### Files Affected
- `app/vite.config.js` (+26/-1 lines)
- `app/public/_redirects` (+6 lines)
- `app/public/_routes.json` (+3/-1 lines)
- New files: `guest-proposals.html`, `guest-proposals.jsx`, page components

### Impact
- Guest proposals page accessible in development and production
- Clean URL routing (`/guest-proposals` instead of `/guest-proposals.html`)
- Support for dynamic proposal IDs in URL

---

## Fix #11: FAQ Inquiry CORS Preflight

### Commit Information
| Field | Value |
|-------|-------|
| **Commit** | [`59b1b25`](https://github.com/splitleasesharath/splitlease/commit/59b1b25a88c2efdf0e90667770caea00ed464919) |
| **Date** | December 2, 2025 |
| **Author** | Claude Code |

### Bug Description
FAQ form submissions in production failed with 405 error. Browser CORS preflight OPTIONS request was being rejected.

### Root Cause Analysis
Cloudflare Pages Functions require separate handler exports for each HTTP method. The function only exported `onRequestPost` but browsers send an OPTIONS request first for CORS preflight, which wasn't handled.

### Fix Implementation

**File: `app/functions/api/faq-inquiry.js`**
```javascript
// BEFORE: Only POST handler
export async function onRequestPost(context) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    // ...
  };
  // ... handle POST
}

// AFTER: Separate OPTIONS and POST handlers with shared CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

// Handle CORS preflight
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders
  });
}

// Handle actual POST request
export async function onRequestPost(context) {
  // ... POST logic with corsHeaders
}
```

### Files Affected
- `app/functions/api/faq-inquiry.js` (+17/-16 lines)

### Impact
- FAQ form submissions work correctly with CORS
- Browser preflight requests properly handled

---

## Summary Statistics

| Metric | Value |
|--------|-------|
| **Total Fixes** | 11 |
| **Date Range** | Nov 28 - Dec 4, 2025 |
| **Files Modified** | 15+ unique files |
| **Lines Changed** | ~500+ |

### Fix Categories

| Category | Count |
|----------|-------|
| Vite Dev Server Routing | 4 |
| Cloudflare Pages Config | 3 |
| External URL Migration | 3 |
| CORS/API Issues | 2 |

### Key Files Modified

| File | Modifications |
|------|---------------|
| `app/vite.config.js` | 5 commits |
| `app/public/_routes.json` | 2 commits |
| `app/public/_redirects` | 2 commits |
| `app/src/lib/constants.js` | 1 commit |
| `app/functions/api/faq-inquiry.js` | 2 commits |

---

## Lessons Learned

### 1. Multi-Layer Routing Architecture
The app has four routing layers that must stay synchronized:
- Vite dev server (`configureServer`)
- Vite preview server (`configurePreviewServer`)
- Cloudflare Pages `_redirects`
- Cloudflare Pages `_routes.json`

### 2. Clean URLs Require Special Handling
Cloudflare's "pretty URL" normalization causes 308 redirects. Solution: Use `_internal/` directory with extension-less files.

### 3. API Function CORS
Always export both `onRequestOptions` and `onRequestPost` for Cloudflare Pages Functions that handle POST requests.

### 4. External URL Migration
When migrating from Bubble.io, systematically audit all URLs in:
- Constants files
- Component links
- Footer/header navigation
- Redirect configurations

---

**Report Generated By**: Claude Code
**Last Updated**: December 4, 2025
