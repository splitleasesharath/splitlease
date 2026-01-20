# Routing & Redirection Guide

**Created**: 2026-01-20
**Status**: AUTHORITATIVE REFERENCE
**Scope**: All routing changes in Split Lease application
**Keywords**: routing, redirects, pages, navigation, cloudflare, vite, _internal, 308, clean URLs

---

## TL;DR - The Golden Rule

**ONE FILE controls ALL routing**: `app/src/routes.config.js`

Never manually edit:
- `app/public/_redirects` (auto-generated)
- `app/public/_routes.json` (auto-generated)
- Routing logic in `app/vite.config.js` (reads from registry)

---

## Quick Reference Table

| Task | Action |
|------|--------|
| Add new page | Add entry to `routes.config.js` → Create HTML file → Create React entry |
| Add dynamic route | Set `hasDynamicSegment: true` in route config |
| Add protected route | Set `protected: true` in route config |
| Avoid 308 redirects | Set `cloudflareInternal: true` + `internalName` |
| Regenerate routing files | Run `npm run generate-routes` in app/ |
| Test routing | Run `npm run dev` and `npm run build && npm run preview` |

---

## Route Registry Architecture

### How Routes Flow

```
routes.config.js (Single Source of Truth)
        │
        ├──────────────────────────────────────────┐
        │                                          │
        ▼                                          ▼
  vite.config.js                        generate-redirects.js
  (Dev & Preview Server)                   (Build Script)
        │                                          │
        │                               ┌──────────┴──────────┐
        │                               │                     │
        ▼                               ▼                     ▼
  Vite Middleware                 _redirects            _routes.json
  (handleRouting)              (Cloudflare Pages)    (Cloudflare Functions)
        │                               │                     │
        │                               └──────────┬──────────┘
        │                                          │
        ▼                                          ▼
   Development                               Production
   localhost:8000                      Cloudflare Pages Domain
```

### File Purposes

| File | Purpose | Edit Manually? |
|------|---------|----------------|
| `app/src/routes.config.js` | Route definitions | YES - Primary file |
| `app/vite.config.js` | Dev/preview routing | NO - Reads registry |
| `app/public/_redirects` | Cloudflare routing | NO - Auto-generated |
| `app/public/_routes.json` | Cloudflare Functions | NO - Auto-generated |
| `app/scripts/generate-redirects.js` | Build script | RARELY - Only for bugs |
| `app/src/lib/navigation.js` | Navigation utilities | YES - Add new helpers |

---

## Route Configuration Schema

### Full Route Object

```javascript
{
  path: '/example',              // REQUIRED: Clean URL path
  file: 'example.html',          // REQUIRED: HTML file to serve
  aliases: ['/example.html'],    // OPTIONAL: Alternative URL patterns
  protected: false,              // OPTIONAL: Requires authentication
  cloudflareInternal: false,     // OPTIONAL: Use _internal/ directory
  internalName: 'example-view',  // REQUIRED if cloudflareInternal: true
  hasDynamicSegment: false,      // OPTIONAL: Has URL parameters
  dynamicPattern: '/example/:id', // OPTIONAL: For documentation
  excludeFromFunctions: false,   // OPTIONAL: Exclude from CF Functions
  devOnly: false,                // OPTIONAL: Skip in production builds
  skipFileExtensionCheck: false  // OPTIONAL: Special routing behavior
}
```

### Minimal Route Object

```javascript
{
  path: '/about',
  file: 'about.html',
  aliases: ['/about.html'],
  protected: false,
  cloudflareInternal: false,
  hasDynamicSegment: false
}
```

---

## How To: Add a New Static Page

### Step 1: Add Route to Registry

Edit `app/src/routes.config.js`:

```javascript
// In the routes array, add:
{
  path: '/new-page',
  file: 'new-page.html',
  aliases: ['/new-page.html'],
  protected: false,
  cloudflareInternal: false,
  hasDynamicSegment: false
}
```

### Step 2: Create HTML File

Create `app/public/new-page.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>New Page - Split Lease</title>
  <link rel="icon" type="image/svg+xml" href="/assets/images/favicon.svg" />
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/new-page.jsx"></script>
</body>
</html>
```

### Step 3: Create React Entry Point

Create `app/src/new-page.jsx`:

```javascript
import React from 'react';
import ReactDOM from 'react-dom/client';
import NewPage from './islands/NewPage/NewPage';
import './styles/main.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <NewPage />
  </React.StrictMode>
);
```

### Step 4: Add to Vite Build Inputs

Edit `app/vite.config.js` in the `rollupOptions.input` section:

```javascript
input: {
  // ... existing entries
  'new-page': resolve(__dirname, 'public/new-page.html')
}
```

### Step 5: Regenerate and Test

```bash
cd app
npm run generate-routes  # Regenerate _redirects and _routes.json
npm run dev              # Test in development
npm run build            # Build for production
npm run preview          # Test production build
```

---

## How To: Add a Dynamic Route

Dynamic routes have URL parameters like `/view-split-lease/LISTING_ID`.

### Step 1: Add Route with Dynamic Configuration

```javascript
{
  path: '/product',
  file: 'product.html',
  aliases: ['/product.html'],
  protected: false,
  cloudflareInternal: true,        // IMPORTANT: Prevents 308 redirects
  internalName: 'product-view',    // REQUIRED when cloudflareInternal: true
  hasDynamicSegment: true,         // IMPORTANT: Enables /product/:id matching
  dynamicPattern: '/product/:id'   // Documentation only
}
```

### Step 2: Extract ID in Component

In your React component/hook:

```javascript
function useProductId() {
  const pathParts = window.location.pathname.split('/');
  const productId = pathParts[2] || null; // /product/ID
  return productId;
}
```

### Why cloudflareInternal?

Cloudflare Pages has "pretty URL" normalization that causes 308 redirects:
- `/view-split-lease/123` → 308 redirect → `/view-split-lease/123/`
- This breaks URL parameter extraction

Using `cloudflareInternal: true`:
- Creates `_internal/product-view` (no .html extension)
- Cloudflare serves this file directly without normalization
- No 308 redirects, URL parameters preserved

### CRITICAL: Content-Type Headers for cloudflareInternal Routes

**Routes using `cloudflareInternal: true` MUST have explicit Content-Type headers in `app/public/_headers`**, otherwise Cloudflare will serve the `_internal/*` files as binary downloads instead of HTML pages.

For every route with `cloudflareInternal: true`, add to `app/public/_headers`:

```
# [Route Name] - serve as HTML (uses _internal pattern)
/your-route
  Content-Type: text/html; charset=utf-8
/your-route/*
  Content-Type: text/html; charset=utf-8
```

**Why this happens**: Files in `_internal/` have no `.html` extension. Without explicit Content-Type headers, Cloudflare cannot determine the MIME type and defaults to binary/octet-stream, causing browsers to download the file instead of rendering it.

**Symptoms of missing Content-Type header**:
- Browser downloads a file instead of showing the page
- Downloaded file has no extension (e.g., "reset-password" instead of HTML)
- Works in development but fails in production

**Existing routes with required headers** (in `_headers`):
- `/view-split-lease`, `/preview-split-lease`
- `/guest-proposals`, `/host-proposals`
- `/search`, `/help-center`
- `/reset-password`, `/self-listing-v2`
- `/faq`, `/policies`, `/list-with-us`, `/why-split-lease`
- `/careers`, `/about-us`, `/guest-success`, `/host-success`
- `/_internal/*` (catch-all, but explicit routes are more reliable)

---

## How To: Add a Protected Route

Protected routes require user authentication.

### Step 1: Mark Route as Protected

```javascript
{
  path: '/dashboard',
  file: 'dashboard.html',
  aliases: ['/dashboard.html'],
  protected: true,  // IMPORTANT: Marks as requiring auth
  cloudflareInternal: false,
  hasDynamicSegment: false
}
```

### Step 2: Use Auth Check in Component

```javascript
import { checkAuthStatus } from '../lib/auth';
import { isProtectedPage } from '../lib/navigation';

function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      if (isProtectedPage()) {
        const authed = await checkAuthStatus();
        if (!authed) {
          window.location.href = '/';
          return;
        }
        setIsAuthed(true);
      }
      setLoading(false);
    }
    checkAuth();
  }, []);

  if (loading) return <LoadingSpinner />;
  if (!isAuthed) return null;

  return <Dashboard />;
}
```

---

## How To: Use Navigation Utilities

Import from `app/src/lib/navigation.js`:

```javascript
import {
  goToListing,
  goToSearch,
  goToProfile,
  goToProposals,
  goToHelpCenter,
  getListingUrl,
  getSearchUrl,
  routeExists,
  isProtectedPage
} from '../lib/navigation';

// Navigate to listing
goToListing('abc123');

// Navigate with new tab
goToListing('abc123', { newTab: true });

// Navigate to search with filters
goToSearch({
  borough: 'manhattan',
  daysSelected: [1, 2, 3, 4, 5]
});

// Get URL without navigating
const url = getListingUrl('abc123');  // '/view-split-lease/abc123'

// Check if route exists
if (routeExists('/some-page')) { ... }

// Check if current page is protected
if (isProtectedPage()) { ... }
```

---

## Testing Checklist

### Before Committing Route Changes

- [ ] Route added to `routes.config.js`
- [ ] HTML file exists in `app/public/`
- [ ] React entry point exists in `app/src/`
- [ ] Route added to `vite.config.js` rollupOptions.input
- [ ] `npm run generate-routes` succeeds
- [ ] `npm run dev` serves the page correctly
- [ ] Query strings are preserved (e.g., `/page?param=value`)
- [ ] `npm run build` completes without errors
- [ ] `npm run preview` serves the page correctly
- [ ] Dynamic routes preserve URL parameters
- [ ] Protected routes redirect when not authenticated

### Route Testing Commands

```bash
# Test specific routes
curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/your-route

# Expected: 200 for valid routes, 404 for invalid
```

---

## Common Patterns

### Pattern: Help Center with Categories

```javascript
// Base help center page
{
  path: '/help-center',
  file: 'help-center.html',
  aliases: ['/help-center.html'],
  protected: false,
  cloudflareInternal: true,
  internalName: 'help-center-view',
  hasDynamicSegment: false
},
// Category pages (e.g., /help-center/guests)
{
  path: '/help-center/:category',
  file: 'help-center-category.html',
  protected: false,
  cloudflareInternal: true,
  internalName: 'help-center-category-view',
  hasDynamicSegment: true,
  skipFileExtensionCheck: true
}
```

### Pattern: User Profile with ID

```javascript
{
  path: '/account-profile',
  file: 'account-profile.html',
  aliases: ['/account-profile.html'],
  protected: true,
  cloudflareInternal: false,  // Direct file serve works here
  hasDynamicSegment: true,
  dynamicPattern: '/account-profile/:userId'
}
```

### Pattern: Excluding from Cloudflare Functions

```javascript
{
  path: '/guest-proposals',
  file: 'guest-proposals.html',
  aliases: ['/guest-proposals.html'],
  protected: true,
  cloudflareInternal: true,
  internalName: 'guest-proposals-view',
  hasDynamicSegment: true,
  excludeFromFunctions: true  // Won't be handled by CF Functions
}
```

---

## Troubleshooting

### Problem: Page Downloads as File Instead of Rendering

**Symptom**: Browser downloads a file (e.g., "reset-password") instead of showing the page

**Cause**: Missing Content-Type header for `cloudflareInternal` route

**Solution**:
1. Add Content-Type header to `app/public/_headers`:
   ```
   /your-route
     Content-Type: text/html; charset=utf-8
   /your-route/*
     Content-Type: text/html; charset=utf-8
   ```
2. Rebuild and redeploy: `npm run build` then deploy

**Why**: Files in `_internal/` have no `.html` extension, so Cloudflare can't determine the MIME type without explicit headers.

### Problem: 308 Redirect Loop

**Symptom**: Page redirects infinitely or loses URL parameters

**Cause**: Cloudflare's "pretty URL" normalization

**Solution**:
1. Set `cloudflareInternal: true` in route config
2. Add `internalName: 'your-page-view'`
3. Add Content-Type header to `app/public/_headers` (see above)
4. Regenerate routes: `npm run generate-routes`
5. Rebuild: `npm run build`

### Problem: Route Works in Dev, 404 in Production

**Symptom**: Page loads locally but returns 404 on Cloudflare

**Cause**: Route not in `_redirects` or not in rollupOptions.input

**Solution**:
1. Check route is in `routes.config.js`
2. Check HTML file added to `vite.config.js` rollupOptions.input
3. Run `npm run generate-routes`
4. Check `app/public/_redirects` includes your route
5. Rebuild and redeploy

### Problem: Query String Lost

**Symptom**: `/page?param=value` becomes `/page` after navigation

**Cause**: Routing not preserving query string

**Solution**: The `handleRouting` function in vite.config.js should preserve query strings automatically. If not working:
1. Check the route's `hasDynamicSegment` setting
2. Test with `curl -v "http://localhost:8000/page?param=value"`

### Problem: Dynamic ID Not Available

**Symptom**: `window.location.pathname` doesn't contain expected ID

**Cause**: Cloudflare rewrote URL before serving

**Solution**:
1. Set `cloudflareInternal: true` for the route
2. Add `internalName` to prevent URL rewriting
3. Regenerate and rebuild

---

## File Locations Reference

```
app/
├── src/
│   ├── routes.config.js      # EDIT: Route definitions
│   ├── lib/
│   │   └── navigation.js     # EDIT: Navigation utilities
│   └── [page].jsx            # CREATE: React entry points
├── public/
│   ├── [page].html           # CREATE: HTML files
│   ├── _redirects            # GENERATED: Cloudflare redirects
│   └── _routes.json          # GENERATED: Cloudflare Functions config
├── scripts/
│   └── generate-redirects.js # BUILD: Route generator
├── vite.config.js            # EDIT: Add to rollupOptions.input
└── dist/
    └── _internal/            # GENERATED: Internal route files
        ├── listing-view
        ├── guest-proposals-view
        ├── help-center-view
        └── help-center-category-view
```

---

## Build Scripts Reference

| Script | Command | Purpose |
|--------|---------|---------|
| generate-routes | `npm run generate-routes` | Regenerate _redirects and _routes.json |
| prebuild | `npm run prebuild` | Runs generate-routes before build |
| build | `npm run build` | Full production build |
| dev | `npm run dev` | Start development server |
| preview | `npm run preview` | Preview production build |

---

## Migration Notes

### From Manual Routing (Pre-December 2025)

Before Route Registry, routes were defined in 4 places:
1. `vite.config.js` configureServer (dev)
2. `vite.config.js` configurePreviewServer (preview)
3. `public/_redirects` (production)
4. `public/_routes.json` (Cloudflare Functions)

**Now**: Only `routes.config.js` needs editing. All other files are generated or read from the registry.

### Deprecated Patterns

**DON'T** manually edit `_redirects`:
```
# OLD WAY - DON'T DO THIS
/new-page  /new-page.html  200
```

**DO** add to routes.config.js:
```javascript
// NEW WAY - DO THIS
{
  path: '/new-page',
  file: 'new-page.html',
  // ...
}
```

---

## Keywords for Search

routing, routes, redirects, _redirects, _routes.json, cloudflare, pages, functions, vite, middleware, 308, redirect loop, clean URLs, dynamic routes, URL parameters, query string, navigation, protected routes, authentication, _internal, listing-view, help-center, guest-proposals, route registry, single source of truth, generate-routes, prebuild, handleRouting, Content-Type, _headers, binary download, file download, MIME type, text/html, cloudflareInternal

---

**Document Version**: 1.0
**Last Updated**: 2026-01-20
**Maintainer**: Development Team
