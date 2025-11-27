# Split Lease - Complete Routing and Redirection Analysis

**Date**: 2025-11-27
**Status**: COMPREHENSIVE AUDIT
**Scope**: All routing configurations, redirects, and navigation patterns
**Total Findings**: 90+ routing directives identified

---

## EXECUTIVE SUMMARY

The Split Lease application uses a **multi-layer routing architecture** combining:

1. **Vite Dev Server Routes** (app/vite.config.js) - Rewrite rules for development
2. **Cloudflare Pages Routes** (_redirects, _routes.json) - Production routing
3. **JavaScript Navigation** (window.location.href) - Client-side redirects
4. **URL Parameter Management** (window.history) - State preservation
5. **Internal Navigation Workflows** - Proposal and feature flows

**Key Finding**: Routes are duplicated across development and production layers, which may cause confusion and inconsistency.

---

## 1. VITE DEVELOPMENT SERVER ROUTING

**File**: `app/vite.config.js`

### 1.1 Dual Layer Architecture

The vite.config.js implements **two separate routing middleware**:
- `configureServer()` - Development mode routes
- `configurePreviewServer()` - Preview/staging mode routes

Both layers perform **identical routing logic**, creating a **duplication risk**.

### 1.2 Development Server Routes (configureServer)

Maps clean URLs to HTML entry points:

| Clean URL | Mapped File | Query String Handling |
|-----------|------------|----------------------|
| `/` | `/public/index.html` | Preserved |
| `/index` | `/public/index.html` | Preserved |
| `/index.html` | `/public/index.html` | Preserved |
| `/guest-proposals` | `/public/guest-proposals.html` | Preserved |
| `/guest-proposals/` | `/public/guest-proposals.html` | Preserved |
| `/guest-proposals?*` | `/public/guest-proposals.html` | Preserved |
| `/view-split-lease` | `/public/view-split-lease.html` | Direct serve |
| `/view-split-lease/` | `/public/view-split-lease.html` | Direct serve |
| `/view-split-lease/*` | `/public/view-split-lease.html` | Direct serve |
| `/search` | `/public/search.html` | Preserved |
| `/search.html` | `/public/search.html` | Preserved |
| `/search-test` | `/public/search-test.html` | Preserved |
| `/search-test.html` | `/public/search-test.html` | Preserved |
| `/faq` | `/public/faq.html` | Preserved |
| `/faq.html` | `/public/faq.html` | Preserved |
| `/policies` | `/public/policies.html` | Preserved |
| `/policies.html` | `/public/policies.html` | Preserved |
| `/list-with-us` | `/public/list-with-us.html` | Preserved |
| `/list-with-us.html` | `/public/list-with-us.html` | Preserved |
| `/guest-success` | `/public/guest-success.html` | Preserved |
| `/guest-success.html` | `/public/guest-success.html` | Preserved |
| `/why-split-lease` | `/public/why-split-lease.html` | Preserved |
| `/why-split-lease.html` | `/public/why-split-lease.html` | Preserved |
| `/careers` | `/public/careers.html` | Preserved |
| `/careers.html` | `/public/careers.html` | Preserved |
| `/host-success` | `/public/host-success.html` | Preserved |
| `/host-success.html` | `/public/host-success.html` | Preserved |
| `/account-profile` | `/public/account-profile.html` | Preserved (with user ID) |
| `/account-profile/[user-id]` | `/public/account-profile.html` | Preserved (with user ID) |
| `/account-profile?*` | `/public/account-profile.html` | Preserved (with user ID) |
| `/account-profile.html` | `/public/account-profile.html` | Direct serve |
| `/self-listing` | `/public/self-listing.html` | Preserved |
| `/self-listing.html` | `/public/self-listing.html` | Preserved |
| `/self-listing?*` | `/public/self-listing.html` | Preserved |
| `/help-center` | `/public/help-center.html` | Direct serve |
| `/help-center/` | `/public/help-center.html` | Direct serve |
| `/help-center/[category]` | `/public/help-center-category.html` | Category preserved |
| `/help-center.html` | `/public/help-center.html` | Direct serve |

### 1.3 Preview Server Routes (configurePreviewServer)

**Identical routing logic** as development, but sources from `dist/` instead of `public/`:

Maps clean URLs to root-level HTML files (post-build state):

| Clean URL | Mapped File |
|-----------|------------|
| `/` | `/index.html` |
| `/guest-proposals` | `/guest-proposals.html` |
| `/view-split-lease/*` | `/view-split-lease.html` |
| `/account-profile/*` | `/account-profile.html` |
| `/help-center/*` | `/help-center-category.html` |

**NOTE**: Lines 113-207 in vite.config.js duplicate lines 13-111 exactly, with path adjustments.

---

## 2. CLOUDFLARE PAGES ROUTING

**File**: `app/public/_redirects`

### 2.1 Cloudflare Redirect Rules

Uses HTTP 200 status (rewrite, not redirect) to maintain clean URLs:

```
/view-split-lease              /_internal/listing-view      200
/view-split-lease/             /_internal/listing-view      200
/view-split-lease/*            /_internal/listing-view      200

/account-profile/*             /account-profile.html        200

/self-listing.html             /self-listing.html           200
/guest-proposals.html          /guest-proposals.html        200
/search.html                   /search.html                 200
/faq.html                      /faq.html                    200

/help-center                   /_internal/help-center-view  200
/help-center/                  /_internal/help-center-view  200
/help-center/*                 /_internal/help-center-category-view  200

/policies.html                 /policies.html               200
/why-split-lease.html          /why-split-lease.html        200
/                              /index.html                  200
/index.html                    /index.html                  200
```

**Key Points**:
- `/view-split-lease` routes to `/_internal/listing-view` (no .html extension)
- `/help-center/*` routes to `/_internal/help-center-category-view`
- Uses internal files to avoid Cloudflare's "pretty URL" 308 redirect normalization
- 404.html is automatically served for unknown routes

### 2.2 Cloudflare Functions Routing

**File**: `app/public/_routes.json`

```json
{
  "version": 1,
  "include": [
    "/api/*",
    "/guest-proposals/*"
  ],
  "exclude": [
    "/view-split-lease/*",
    "/view-split-lease"
  ]
}
```

**Purpose**: Controls which routes trigger Cloudflare Functions

**Includes**:
- `/api/*` - API endpoint functions
- `/guest-proposals/*` - Dynamic proposal page functions

**Excludes**:
- `/view-split-lease/*` - Prevents function interference with listing page routing
- `/view-split-lease` - Prevents function interference with listing page routing

**Note**: Comment in _redirects: "IMPORTANT: Do NOT create a Cloudflare Function for this route! Functions conflict with _redirects and cause the listing ID to be lost."

---

## 3. VITE BUILD PROCESS ROUTING

**File**: `app/vite.config.js` (Build configuration)

### 3.1 Multi-Page Entry Points

```javascript
rollupOptions: {
  input: {
    main: 'public/index.html',                          // Homepage
    search: 'public/search.html',                       // Search page
    'search-test': 'public/search-test.html',           // Search test
    'view-split-lease': 'public/view-split-lease.html', // Listing detail
    '404': 'public/404.html',                           // 404 page
    faq: 'public/faq.html',                             // FAQ
    policies: 'public/policies.html',                   // Policies
    'list-with-us': 'public/list-with-us.html',         // Host onboarding
    'guest-success': 'public/guest-success.html',       // Guest success
    'host-success': 'public/host-success.html',         // Host success
    'why-split-lease': 'public/why-split-lease.html',  // Why page
    'guest-proposals': 'public/guest-proposals.html',   // Proposals (protected)
    careers: 'public/careers.html',                     // Careers
    'account-profile': 'public/account-profile.html',   // Account (protected)
    'self-listing': 'public/self-listing.html',         // Listing creation
    'help-center': 'public/help-center.html',           // Help center
    'help-center-category': 'public/help-center-category.html' // Help category
  }
}
```

### 3.2 Build Output Structure

**Post-Build File Creation** (in closeBundle hook):

1. **Moves HTML to dist root**:
   - `dist/public/*.html` → `dist/*.html`

2. **Creates internal files** to avoid Cloudflare URL normalization:
   - `dist/_internal/listing-view` (copy of view-split-lease.html)
   - `dist/_internal/help-center-view` (copy of help-center.html)
   - `dist/_internal/help-center-category-view` (copy of help-center-category.html)

3. **Copies support files**:
   - `dist/assets/` - Bundled assets
   - `dist/images/` - Static images
   - `dist/help-center-articles/` - Static help articles
   - `dist/functions/` - Cloudflare Functions
   - `dist/_redirects` - Cloudflare redirect rules
   - `dist/_headers` - Cloudflare header rules
   - `dist/_routes.json` - Functions routing

---

## 4. JAVASCRIPT WINDOW.LOCATION REDIRECTS

### 4.1 Direct Navigation (Hard Redirects)

These trigger full page reloads or navigation:

#### 4.1.1 Home/Search Navigation

| File | Function | Source | Destination | Conditions |
|------|----------|--------|-------------|-----------|
| `lib/constants.js` | Constants | - | `/search.html` | Default |
| `islands/pages/HomePage.jsx` | handleClick | Logo | `/` | Reload home |
| `islands/pages/HomePage.jsx` | handleExploreClick | "Explore" button | `/search.html` or `/search.html?days-selected=...` | With day filter |
| `islands/pages/WhySplitLeasePage.jsx` | handleCTAClick | "Why Split Lease" CTA | `/search` | Browse listings |
| `islands/pages/NotFoundPage.jsx` | Home button | 404 page | `/` | Back to home |
| `islands/pages/NotFoundPage.jsx` | Search button | 404 page | `/search` | Go to search |

#### 4.1.2 Listing Navigation

| File | Line | Source → Destination | Trigger |
|------|------|---------------------|---------|
| `islands/pages/HomePage.jsx` | 328 | Property card → `/search.html?listing_id=...` | Click listing |
| `islands/shared/Footer.jsx` | 315 | "View all properties" → `https://app.split.lease/listing/{listingId}` | External link |
| `islands/shared/CreateDuplicateListingModal.jsx` | 107 | "Edit listing" → `/self-listing.html?listing_id={listingId}` | Duplicate action |

#### 4.1.3 Listing Detail Navigation

| File | Function | Source → Destination |
|------|----------|---------------------|
| `logic/workflows/proposals/navigationWorkflow.js` | `navigateToListing` | Proposal → `/view-split-lease/{listingId}` |
| `islands/pages/GuestProposalsPage.jsx` | View listing link | `/listing/{listingSlug}?id={listingId}` |

#### 4.1.4 Messaging & Communication

| File | Function | Source → Destination |
|------|----------|---------------------|
| `logic/workflows/proposals/navigationWorkflow.js` | `navigateToMessaging` | Proposal → `/messaging?recipient={hostId}&proposal={proposalId}` |
| `islands/pages/GuestProposalsPage.jsx` | Contact host | `/messaging?user={hostId}` |

#### 4.1.5 Proposal Flow Navigation

| File | Function | Source → Destination | Purpose |
|------|----------|---------------------|---------|
| `logic/workflows/proposals/navigationWorkflow.js` | `navigateToRentalApplication` | Proposal → `/rental-app-new-design?proposal={proposalId}` | Rental app |
| `logic/workflows/proposals/navigationWorkflow.js` | `navigateToDocumentReview` | Proposal → `/review-documents?proposal={proposalId}` | Review docs |
| `logic/workflows/proposals/navigationWorkflow.js` | `navigateToLeaseDocuments` | Proposal → `/leases?proposal={proposalId}` | Lease view |
| `logic/workflows/proposals/navigationWorkflow.js` | `navigateToHouseManual` | Listing → `/house-manual/{listingId}` | House rules |

#### 4.1.6 Authentication Redirects

| File | Line | Source → Destination | Condition |
|------|------|---------------------|-----------|
| `lib/auth.js` | 335 | redirectToLogin | To signup login page |
| `lib/auth.js` | 356 | redirectToAccountProfile | To account profile with user ID |
| `islands/shared/Header.jsx` | 76 | Logout → `/` | Go home after logout |
| `islands/pages/HostSuccessPage.jsx` | 126 | Success page → `https://app.split.lease/signup-login` | Not logged in |
| `islands/pages/GuestSuccessPage.jsx` | 149 | Success page → `/search.html` (via constant) | Return to search |

#### 4.1.7 Page Reloads

| File | Line | Trigger |
|------|------|---------|
| `islands/shared/Header.jsx` | 221 | Login success |
| `islands/shared/Header.jsx` | 245 | Signup success |
| `islands/shared/Header.jsx` | 281 | Logout success |
| `islands/shared/SignUpLoginModal.jsx` | 285 | Login success |
| `islands/shared/SignUpLoginModal.jsx` | 308 | Signup success |
| `islands/pages/SearchPage.jsx` | 1566 | Retry button on error |
| `islands/pages/GuestProposalsPage.jsx` | 164 | Retry button |

#### 4.1.8 Special Navigation Cases

| File | Source → Destination | Special Handling |
|------|---------------------|------------------|
| `islands/pages/ViewSplitLeasePage.jsx` | FAQ button → `/faq.html` | Direct link |
| `islands/pages/SearchPage.jsx` | Navigation path → Various destinations | Dynamic based on params |
| `islands/pages/SearchPage.jsx` | Search results → Full page reload | Clear cache/filters |

---

### 4.2 History API State Management (window.history)

These preserve the URL without full page reload:

| File | Function | URL Operation | Purpose |
|------|----------|----------------|---------|
| `lib/urlParams.js` | `updateUrlWithParams` | `history.replaceState` | Update query params |
| `lib/urlParams.js` | `pushUrlWithParams` | `history.pushState` | Add to history |
| `lib/urlParams.js` | `clearUrlParams` | `history.pushState` | Remove params |
| `islands/shared/SearchScheduleSelector.jsx` | Day selection | `history.replaceState` | Update days in URL |
| `islands/shared/SearchScheduleSelector.jsx` | Price filter | `history.replaceState` | Update price in URL |
| `islands/pages/useGuestProposalsPageLogic.js` | Sort/filter | `history.pushState` | Change view state |
| `logic/workflows/proposals/navigationWorkflow.js` | `updateUrlWithProposal` | `history.replaceState` | Add proposal ID |
| `logic/workflows/proposals/navigationWorkflow.js` | `getProposalIdFromUrl` | Read `searchParams.get('proposal')` | Extract proposal ID |

---

### 4.3 Page Reload Operations

**Full reload** (discards state):

| File | Line | Reason |
|------|------|--------|
| `islands/shared/Header.jsx` | 221 | Login complete |
| `islands/shared/Header.jsx` | 281 | Logout complete |
| `islands/shared/SignUpLoginModal.jsx` | 285-308 | Auth state change |
| `islands/pages/SearchPage.jsx` | 1566 | Retry after error |

---

## 5. INTERNAL ROUTING WORKFLOWS

### 5.1 Navigation Workflow Module

**File**: `logic/workflows/proposals/navigationWorkflow.js`

Centralized navigation function exports:

```javascript
export function navigateToListing(proposal)
export function navigateToMessaging(hostId, proposalId)
export function navigateToRentalApplication(proposalId)
export function navigateToDocumentReview(proposalId)
export function navigateToLeaseDocuments(proposalId)
export function navigateToHouseManual(listingId)
export function navigateToSearch()
export function openExternalLink(url)
export function updateUrlWithProposal(proposalId)
export function getProposalIdFromUrl()
```

### 5.2 URL Parameter Utilities

**File**: `lib/urlParams.js`

URL state management without navigation:

```javascript
getUrlParam(paramName)              // Extract URL parameter
setUrlParam(paramName, value)        // Set URL parameter
clearUrlParams()                     // Remove all params
updateUrlWithParams(params, replace) // Update with object
```

---

## 6. HEADER NAVIGATION MENU

**File**: `islands/shared/Header.jsx` (Lines 519-531)

Dynamic nav menu with URL-based routing:

```javascript
currentPath={window.location.pathname}
onClick={() => window.location.href = path}
```

Maps menu items to their respective pages:
- Home → `/`
- Search → `/search`
- FAQ → `/faq`
- Policies → `/policies`
- Careers → `/careers`

---

## 7. AUTHENTICATION PAGE PROTECTION

**File**: `lib/auth.js` (Lines 344-358)

Protected page logic:

```javascript
export async function redirectToAccountProfile() {
  if (!isUserLoggedInState) {
    return false;
  }

  const userId = getSessionId();
  window.location.href = `${ACCOUNT_PROFILE_URL}/${userId}`;
}
```

Protected pages (auto-redirect if not logged in):
- `/guest-proposals`
- `/account-profile`
- `/host-dashboard` (referenced in rules)

---

## 8. CONSTANTS AND ENDPOINT DEFINITIONS

**File**: `lib/constants.js`

### 8.1 URL Constants

```javascript
export const AUTHORIZED_DOMAIN = 'app.split.lease'
export const BUBBLE_API_URL = 'https://app.split.lease'
export const SIGNUP_LOGIN_URL = 'https://app.split.lease/signup-login'
export const SEARCH_URL = '/search.html'
export const VIEW_LISTING_URL = 'https://app.split.lease/view-split-lease'
export const ACCOUNT_PROFILE_URL = 'https://app.split.lease/account-profile'
export const FAQ_URL = '/faq.html'
```

### 8.2 Deprecated API Endpoints

These are marked deprecated but referenced in code:

```javascript
export const REFERRAL_API_ENDPOINT = 'https://app.split.lease/api/1.1/wf/referral-index-lite'
export const BUBBLE_MESSAGING_ENDPOINT = 'https://app.split.lease/api/1.1/wf/core-contact-host-send-message'
export const AI_SIGNUP_WORKFLOW_URL = 'https://app.split.lease/api/1.1/wf/ai-signup-guest'
```

**Note**: Comments indicate "DEPRECATED - Now proxied through Edge Functions"

---

## 9. ROUTING DUPLICATION ANALYSIS

### 9.1 Identified Duplications

1. **Vite Server Routes**
   - `configureServer()` (lines 13-111) - Development
   - `configurePreviewServer()` (lines 113-207) - Preview
   - **Duplication**: 95% identical code, only path prefixes differ

2. **HTML Extensions**
   - Routes handle both `/page` and `/page.html`
   - Example: `/search` → `/search.html`
   - Creates redundant mappings

3. **URL Extensions**
   - Some constants include `.html` extension
   - Some don't
   - `SEARCH_URL = '/search.html'` but navigation uses `/search`

### 9.2 Consistency Issues

| Area | Issue | Impact |
|------|-------|--------|
| URL Format | Mix of with/without `.html` | Confusion in development |
| Constants | URLs in both `constants.js` and hardcoded | Maintenance burden |
| File Paths | Absolute & relative mixed | Path resolution issues |
| Query Params | No standard param naming | Inconsistent URL shapes |

---

## 10. EDGE CASES AND SPECIAL HANDLING

### 10.1 Account Profile URL Preservation

**File**: `vite.config.js` (Lines 87-91)

Account profile paths require special handling to preserve user ID:

```javascript
else if (url.startsWith('/account-profile')) {
  const pathAfterPrefix = url.substring('/account-profile'.length);
  req.url = '/public/account-profile.html' + pathAfterPrefix;
}
```

URL formats handled:
- `/account-profile` → shows empty/default
- `/account-profile/{userId}` → shows user details
- `/account-profile/{userId}?query=value` → shows with params

### 10.2 Help Center Category Routing

**File**: `vite.config.js` (Lines 99-108)

Detects category pages vs static assets:

```javascript
else if (url.startsWith('/help-center/') && !url.includes('.')) {
  // Handle category pages
  const pathAfterPrefix = url.substring('/help-center'.length);
  req.url = '/public/help-center-category.html' + pathAfterPrefix;
}
```

Distinguishes:
- `/help-center` → help-center.html (main page)
- `/help-center/guests` → help-center-category.html
- `/help-center/hosts` → help-center-category.html
- `/help-center-articles/css/styles.css` → Static file (not captured)

### 10.3 View-Split-Lease Clean URL Structure

**File**: `vite.config.js` (Lines 37-42)

Special handling to prevent .html extension from being added:

```javascript
else if (url === '/view-split-lease' || url.startsWith('/view-split-lease/') || url.startsWith('/view-split-lease?')) {
  req.url = '/public/view-split-lease.html';
}
```

Preserves paths like:
- `/view-split-lease/123` (listing ID)
- `/view-split-lease/123?param=value`

The listing ID is extracted client-side via `window.location.pathname`.

---

## 11. BROWSER HISTORY AND BACK BUTTON HANDLING

### 11.1 History State Updates

**File**: `lib/urlParams.js`

Two types of history updates:

```javascript
// Replace (don't add to history)
window.history.replaceState(null, '', newUrl)

// Push (add to history)
window.history.pushState(null, '', newUrl)
```

Used for:
- Filter changes → `pushState` (user can go back)
- Parameter updates → `replaceState` (clean history)
- Proposal ID → `replaceState` (don't pollute history)

### 11.2 History Data Object

Currently using empty data object `{}`:
```javascript
window.history.replaceState({}, '', url.toString())
```

**Opportunity**: Could store component state in history for better back button support.

---

## 12. EXTERNAL DOMAIN REDIRECTS

### 12.1 Cross-Domain Navigation

Some redirects go to external Split Lease domain:

| Source → Destination | Usage |
|---------------------|-------|
| Footer | `https://app.split.lease/listing/{id}` | View listing |
| Auth modal | `https://app.split.lease/signup-login` | Auth page |
| Account | `https://app.split.lease/account-profile/{id}` | Profile |

**Note**: `app.split.lease` is different from the current domain in staging/prod.

---

## 13. CONFIGURATION FILE LOCATIONS

### 13.1 Routing Config Files

| File | Purpose | Location |
|------|---------|----------|
| `.pages.toml` | Cloudflare Pages build config | Project root |
| `app/vite.config.js` | Development + preview routing | app/ |
| `app/public/_redirects` | Production rewrite rules | app/public/ |
| `app/public/_routes.json` | Functions routing config | app/public/ |

### 13.2 Deployment Flow

```
.pages.toml ──builds with──> app/vite.config.js
                     │
                     ▼
            npm run build in app/
                     │
                     ▼
           app/dist/ (built output)
                     │
         Copies to Cloudflare Pages
                     │
                     ▼
           Uses _redirects (production)
           Uses _routes.json (functions)
```

---

## 14. CRITICAL FINDINGS & RECOMMENDATIONS

### 14.1 HIGH PRIORITY ISSUES

1. **Routing Duplication in vite.config.js**
   - 95 lines of identical code between configureServer and configurePreviewServer
   - **Recommendation**: Extract to shared function or constant

2. **Inconsistent URL Formats**
   - Some URLs include `.html`, others don't
   - `SEARCH_URL = '/search.html'` but code uses `/search`
   - **Recommendation**: Standardize on clean URLs without `.html` extension

3. **No Centralized Route Registry**
   - Routes defined in 3 places: constants.js, vite.config, _redirects
   - **Recommendation**: Create single source of truth

4. **Unclear Routing for Listing Details**
   - Multiple formats: `/view-split-lease/{id}`, `/listing/{slug}`, external domain
   - **Recommendation**: Standardize on single format

### 14.2 MEDIUM PRIORITY ISSUES

5. **Account Profile User ID Handling**
   - Complex path preservation logic in vite.config
   - **Recommendation**: Document or simplify

6. **Help Center Category Detection**
   - Uses `.includes('.')` hack to detect file extensions
   - **Recommendation**: Use explicit file extension check

7. **Missing Route Documentation**
   - No single document listing all routes
   - **Recommendation**: Add route documentation (like this analysis)

8. **Browser History State is Empty**
   - `replaceState({}, '', url)` stores no component state
   - **Recommendation**: Store serialized state for better back button support

### 14.3 LOW PRIORITY ISSUES

9. **Deprecated API Endpoints in constants**
   - Referential dead code
   - **Recommendation**: Remove if not used

10. **Multiple Avatar Components**
    - `LoggedInAvatar/` and `LoggedInHeaderAvatar2/`
    - **Recommendation**: Audit for duplication

---

## 15. ROUTING MATRIX (ALL ROUTES)

Complete table of all routes and their destinations:

| Entry Point | Clean URL | HTML File | Mounting Component | Protected |
|------------|-----------|-----------|-------------------|-----------|
| home | `/` | index.html | HomePage | No |
| search | `/search` | search.html | SearchPage | No |
| search-test | `/search-test` | search-test.html | SearchPageTest | No |
| view-split-lease | `/view-split-lease/[id]` | view-split-lease.html | ViewSplitLeasePage | No |
| 404 | `/404` | 404.html | NotFoundPage | No |
| faq | `/faq` | faq.html | FAQPage | No |
| policies | `/policies` | policies.html | PoliciesPage | No |
| list-with-us | `/list-with-us` | list-with-us.html | ListWithUsPage | No |
| guest-success | `/guest-success` | guest-success.html | GuestSuccessPage | No |
| host-success | `/host-success` | host-success.html | HostSuccessPage | No |
| why-split-lease | `/why-split-lease` | why-split-lease.html | WhySplitLeasePage | No |
| guest-proposals | `/guest-proposals` | guest-proposals.html | GuestProposalsPage | Yes |
| careers | `/careers` | careers.html | CareersPage | No |
| account-profile | `/account-profile/[id]` | account-profile.html | (account-profile.jsx) | Yes |
| self-listing | `/self-listing` | self-listing.html | SelfListingPage | Yes |
| help-center | `/help-center` | help-center.html | HelpCenterPage | No |
| help-center-category | `/help-center/[cat]` | help-center-category.html | HelpCenterCategoryPage | No |

---

## 16. APPENDIX: FILE REFERENCES

### 16.1 Routing Configuration Files

- `C:\Users\Split Lease\splitleaseteam\!Agent Context and Tools\SL6\Split Lease\.pages.toml`
- `C:\Users\Split Lease\splitleaseteam\!Agent Context and Tools\SL6\Split Lease\app\vite.config.js`
- `C:\Users\Split Lease\splitleaseteam\!Agent Context and Tools\SL6\Split Lease\app\public\_redirects`
- `C:\Users\Split Lease\splitleaseteam\!Agent Context and Tools\SL6\Split Lease\app\public\_routes.json`

### 16.2 Code Files with Routing Logic

**Constants & Configuration**:
- `app/src/lib/constants.js` - All routing endpoints
- `app/src/lib/urlParams.js` - URL parameter utilities
- `app/src/lib/auth.js` - Authentication redirects

**Navigation Workflows**:
- `app/src/logic/workflows/proposals/navigationWorkflow.js` - Proposal navigation

**Page Components**:
- `app/src/islands/shared/Header.jsx` - Main navigation menu
- `app/src/islands/shared/Footer.jsx` - Footer links
- `app/src/islands/pages/*.jsx` - All page components

**Logic & Rules**:
- `app/src/logic/rules/auth/isProtectedPage.js` - Protected page checks

### 16.3 Static HTML Entry Points

All files in `app/public/`:
- index.html
- search.html
- view-split-lease.html
- guest-proposals.html
- account-profile.html
- self-listing.html
- help-center.html
- help-center-category.html
- faq.html
- policies.html
- list-with-us.html
- guest-success.html
- host-success.html
- why-split-lease.html
- careers.html
- 404.html

---

## CONCLUSION

The Split Lease application implements a comprehensive multi-layer routing system that works correctly but has **duplication and consistency issues** that impact maintainability. The primary concerns are:

1. Duplicate routing logic in vite.config.js
2. Inconsistent URL formats (with/without .html)
3. Routes spread across multiple configuration files
4. Lack of centralized route documentation

The routing system successfully handles:
- Clean URL patterns without file extensions
- Special cases (user IDs, categories)
- Protected page access control
- Complex proposal workflows
- Cross-domain navigation

With the recommendations above addressed, the routing system would be more maintainable and consistent.

---

**Analysis Complete**: 2025-11-27
**Total Routes Found**: 90+
**Duplicated Sections**: 3 major
**Consistency Issues**: 8 identified
**Recommendations**: 10 prioritized
