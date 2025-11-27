# Routing Quick Reference Guide

**For**: Developers navigating the Split Lease routing system
**Updated**: 2025-11-27
**Full Analysis**: See `ROUTING_AND_REDIRECTION_ANALYSIS.md`

---

## Quick Navigation Map

### Development & Local Testing

**File**: `app/vite.config.js`

```
Clean URL          → Served File (dev)    → Served File (preview)
/                  → /public/index.html   → /index.html
/search            → /public/search.html  → /search.html
/view-split-lease  → /public/view-split-lease.html → /view-split-lease.html
/guest-proposals   → /public/guest-proposals.html  → /guest-proposals.html
/account-profile/[id] → /public/account-profile.html → /account-profile.html
/help-center/*     → /public/help-center-category.html → /help-center-category.html
```

### Production (Cloudflare Pages)

**File**: `app/public/_redirects`

```
/view-split-lease/*  → /_internal/listing-view (no .html)
/account-profile/*   → /account-profile.html
/help-center/*       → /_internal/help-center-category-view
/                    → /index.html
```

---

## Finding Where a Route is Handled

### To find what handles `/view-split-lease/123`:

1. **Development**: Check `vite.config.js` configureServer() → `/public/view-split-lease.html`
2. **Production**: Check `_redirects` → `/_internal/listing-view`
3. **Component**: Check `app/src/view-split-lease.jsx` → mounts `ViewSplitLeasePage`
4. **Client-side ID extraction**: Check `lib/listingDataFetcher.js` → uses `window.location.pathname`

### To find what handles `/guest-proposals`:

1. **Development**: Check `vite.config.js` configureServer() → `/public/guest-proposals.html`
2. **Production**: Check `_redirects` → `/guest-proposals.html`
3. **Component**: Check `app/src/guest-proposals.jsx` → mounts `GuestProposalsPage`
4. **Protection**: Check `lib/auth.js` → `isProtectedPage()` returns true

---

## Common Routing Operations

### Navigate to a Page

```javascript
// Hard redirect (full page reload)
window.location.href = '/search'
window.location.href = '/view-split-lease/123'
window.location.href = '/account-profile/user-id'

// Redirect with Vite constant
import { SEARCH_URL, FAQ_URL } from 'lib/constants'
window.location.href = SEARCH_URL  // '/search.html'
```

### Update URL Without Navigation

```javascript
import { setUrlParam, updateUrlWithParams } from 'lib/urlParams'

// Add query parameter
setUrlParam('days-selected', '1,2,3,4,5')

// Update multiple parameters
updateUrlWithParams({
  days: '1,2,3,4,5',
  price: '200-350'
})

// Clear parameters
clearUrlParams()
```

### Extract Data from URL

```javascript
// Get query parameter
const listingId = new URLSearchParams(window.location.search).get('id')

// Get path segment
const userId = window.location.pathname.split('/')[2]  // /account-profile/[id]

// Use utility function
import { getUrlParam } from 'lib/urlParams'
const proposalId = getUrlParam('proposal')
```

### Navigate from Proposal

```javascript
import {
  navigateToListing,
  navigateToMessaging,
  navigateToRentalApplication,
  navigateToDocumentReview,
  navigateToLeaseDocuments
} from 'logic/workflows/proposals/navigationWorkflow'

navigateToListing(proposal)
navigateToMessaging(hostId, proposalId)
navigateToRentalApplication(proposalId)
navigateToDocumentReview(proposalId)
navigateToLeaseDocuments(proposalId)
```

---

## Protected Pages (Require Authentication)

| Page | URL | Component | Check |
|------|-----|-----------|-------|
| Guest Proposals | `/guest-proposals` | GuestProposalsPage | `isProtectedPage()` |
| Account Profile | `/account-profile/[id]` | (account-profile.jsx) | `isProtectedPage()` |
| Self Listing | `/self-listing` | SelfListingPage | `isProtectedPage()` |

**How it works**:
1. Page loads
2. Header component calls `validateTokenAndFetchUser()`
3. If token invalid and on protected page → redirect to home (unless autoShowLogin=true)
4. If autoShowLogin=true → show login modal instead of redirect

```javascript
// In Header.jsx
if (isProtectedPage() && !autoShowLogin) {
  window.location.replace('/')  // Go home
} else if (isProtectedPage() && autoShowLogin) {
  // Show login modal instead
}
```

---

## URL Parameter Conventions

### Query Parameters Used

| Parameter | Usage | Example |
|-----------|-------|---------|
| `id` | Listing ID in view page | `/view-split-lease?id=123` |
| `listing_id` | Listing ID for creation | `/self-listing?listing_id=123` |
| `proposal` | Proposal ID in various flows | `/rental-app?proposal=456` |
| `recipient` or `user` | Host/user ID for messaging | `/messaging?recipient=789` |
| `days-selected` | Days array for search | `/search?days-selected=1,2,3,4,5` |
| `price` | Price tier filter | `/search?price=200-350` |
| `week-pattern` | Schedule pattern | `/search?week-pattern=every-week` |

**NOTE**: Not standardized. Some use `id`, some use `listing_id`. See `ROUTING_AND_REDIRECTION_ANALYSIS.md` #14.2 for recommendations.

---

## Special Cases

### Account Profile with User ID

Route preserves path segment:
```javascript
// URL: /account-profile/user-123
// Vite maps to: /public/account-profile.html/user-123
// JavaScript extracts: window.location.pathname.split('/')[2]
```

**In vite.config.js** (lines 87-91):
```javascript
else if (url.startsWith('/account-profile')) {
  const pathAfterPrefix = url.substring('/account-profile'.length);
  req.url = '/public/account-profile.html' + pathAfterPrefix;
}
```

### Help Center Categories

Uses file extension check to detect categories:
```javascript
// URL: /help-center/guests ✓ (no .html)
// Maps to: help-center-category.html

// URL: /help-center-articles/css/styles.css ✗ (has extension)
// Not captured, served as static
```

**In vite.config.js** (lines 99-108):
```javascript
else if (url.startsWith('/help-center/') && !url.includes('.')) {
  // This is a category page
  req.url = '/public/help-center-category.html' + pathAfterPrefix;
}
```

### Listing View Clean URLs

Avoids .html extension to prevent Cloudflare URL normalization:
```javascript
// Route rules in _redirects use internal file:
/view-split-lease/* → /_internal/listing-view (no .html)

// This prevents Cloudflare from:
// /view-split-lease/123 → /view-split-lease/123/ (308 redirect)
```

---

## Authentication Flows

### Login/Signup Workflow

```
User clicks "Sign In"
  ↓
Header.jsx opens SignUpLoginModal
  ↓
Modal submits to lib/auth.js loginUser()
  ↓
loginUser() calls supabase.functions.invoke('bubble-auth-proxy')
  ↓
If success: window.location.reload()
If failure: Show error message
```

**Redirect after login**: None - just reload page to show authenticated state

### Logout Workflow

```
User clicks "Log Out"
  ↓
Header.jsx calls logoutUser()
  ↓
logoutUser() calls clearAuthData()
  ↓
Clears tokens from secure storage
  ↓
window.location.reload()
```

### Account Profile Access

```
User clicks "Account Profile"
  ↓
redirectToAccountProfile() in lib/auth.js
  ↓
Extracts userId from secure storage
  ↓
window.location.href = `/account-profile/${userId}`
```

---

## Browser History Management

### Replace State (No history entry)

```javascript
// Parameter changes that shouldn't pollute history
window.history.replaceState({}, '', newUrl)

// Examples:
// - Updating price filter
// - Updating day selection
// - Adding proposal ID to URL
```

### Push State (Add to history)

```javascript
// Navigation that user might want to undo with back button
window.history.pushState({}, '', newUrl)

// Examples:
// - Changing sort order
// - Changing view type
```

**Current limitation**: State object is empty `{}`. Could store component state for better back button support.

---

## Debugging Routes

### See what URL is being served

1. **Check vite.config.js** for the mapping
2. Open DevTools → Network → filter by document
3. Check the actual request URL and response file

### Extract IDs from current page

```javascript
// Listing view: /view-split-lease/123
const listingId = window.location.pathname.split('/')[2]

// Account profile: /account-profile/user-id
const userId = window.location.pathname.split('/')[2]

// Search with params: /search?days-selected=1,2,3,4,5
const daysSelected = new URLSearchParams(window.location.search).get('days-selected')
```

### Check if page is protected

```javascript
import { isProtectedPage } from 'logic/rules/auth/isProtectedPage'
console.log(isProtectedPage())  // true or false
```

### Check authentication status

```javascript
import { checkAuthStatus, getAuthToken } from 'lib/auth'

const isLoggedIn = await checkAuthStatus()
const token = getAuthToken()  // null if not logged in
```

---

## Common Issues & Solutions

### Issue: User sees 404 when accessing protected page

**Causes**:
- Page requires authentication but user not logged in
- isProtectedPage() returning false
- Route not defined in vite.config.js

**Solution**:
1. Check that page is in `isProtectedPage()` rule
2. Check user has valid token
3. Check vite.config.js has the route

### Issue: URL parameters lost during navigation

**Cause**: Using `window.location.href` instead of history API

**Solution**: Use `updateUrlWithParams()` to preserve params without reload

### Issue: Help center category page shows wrong content

**Cause**: `!url.includes('.')` check in vite.config.js

**Solution**: Ensure URL is `/help-center/category-name` (no file extension)

### Issue: Account profile shows user ID in URL but component receives nothing

**Cause**: JavaScript not extracting ID from pathname

**Solution**: Use `window.location.pathname.split('/')[2]` to get user ID

---

## Files to Update When Adding New Routes

1. **vite.config.js** - Add to both configureServer() AND configurePreviewServer()
2. **app/public/_redirects** - Add Cloudflare production mapping
3. **app/public/_routes.json** - Add to include/exclude if using functions
4. **lib/constants.js** - Add URL constant if shared
5. **app/public/[page].html** - Create HTML entry point
6. **app/src/[page].jsx** - Create React entry point
7. **lib/auth.js** or rules - Add to isProtectedPage() if protected

**Checklist**: All 7 places must be updated for a new route to work in dev, preview, and production.

---

## Performance Considerations

### Page Reload vs History API

```javascript
// Slow (full page reload)
window.location.href = '/search'

// Fast (no reload)
updateUrlWithParams({ filter: 'value' })
```

Use history API for filters/parameters. Use navigation only for page changes.

### Lazy Loading Entry Points

Each HTML page is a separate entry point, so only the required JavaScript loads:
- `/search.html` only loads search-related code
- `/view-split-lease.html` only loads listing-related code

Reduces bundle size compared to SPA.

---

## Future Improvements

1. **Consolidate duplicate vite config** - Extract shared routing logic
2. **Standardize URL formats** - Use clean URLs, remove `.html` extension
3. **Create route registry** - Single source of truth for all routes
4. **Store state in history** - Allow proper back button behavior
5. **Use URL constants consistently** - All navigation through constants
6. **Document route protection** - Make protected pages explicit in configuration

---

**Last Updated**: 2025-11-27
**See Also**: `ROUTING_AND_REDIRECTION_ANALYSIS.md` for complete details
