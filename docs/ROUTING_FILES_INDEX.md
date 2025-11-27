# Routing and Redirection Files Index

**Complete file listing of all routing-related configurations in Split Lease project**

---

## Configuration Files

### Build & Deployment Configuration

| File | Purpose | Lines | Key Content |
|------|---------|-------|-------------|
| `.pages.toml` | Cloudflare Pages deployment config | 15 | Build command, output directory, Node version |
| `app/vite.config.js` | Vite build and dev server config | 443 | Multi-page routing, HTML bundling, asset copying |
| `app/public/_redirects` | Cloudflare Pages redirect rules | 59 | HTTP 200 rewrites for clean URLs |
| `app/public/_routes.json` | Cloudflare Functions routing | 11 | Include/exclude patterns for Functions |

---

## Core Routing Logic

### Constants & Configuration

| File | Purpose | Lines | Key Exports |
|------|---------|-------|-------------|
| `app/src/lib/constants.js` | Central constants file | 442 | SEARCH_URL, FAQ_URL, ACCOUNT_PROFILE_URL, VIEW_LISTING_URL |
| `app/src/lib/urlParams.js` | URL parameter utilities | ~80 | getUrlParam, setUrlParam, updateUrlWithParams, clearUrlParams |
| `app/src/lib/auth.js` | Authentication redirects | 400+ | redirectToLogin, redirectToAccountProfile, isProtectedPage |

### Workflow & Navigation

| File | Purpose | Lines | Key Functions |
|------|---------|-------|----------------|
| `app/src/logic/workflows/proposals/navigationWorkflow.js` | Proposal navigation | 177 | navigateToListing, navigateToMessaging, navigateToRentalApplication, etc |
| `app/src/logic/rules/auth/isProtectedPage.js` | Page protection logic | ~20 | Returns true if page requires authentication |

---

## Component Files with Routing

### Page Entry Points (mounted by vite.config.js)

| File | Maps To | Component | Protected |
|------|---------|-----------|-----------|
| `app/src/main.jsx` | index.html | HomePage | No |
| `app/src/search.jsx` | search.html | SearchPage | No |
| `app/src/search-test.jsx` | search-test.html | SearchPageTest | No |
| `app/src/view-split-lease.jsx` | view-split-lease.html | ViewSplitLeasePage | No |
| `app/src/404.jsx` | 404.html | NotFoundPage | No |
| `app/src/faq.jsx` | faq.html | FAQPage | No |
| `app/src/policies.jsx` | policies.html | PoliciesPage | No |
| `app/src/list-with-us.jsx` | list-with-us.html | ListWithUsPage | No |
| `app/src/guest-success.jsx` | guest-success.html | GuestSuccessPage | No |
| `app/src/host-success.jsx` | host-success.html | HostSuccessPage | No |
| `app/src/why-split-lease.jsx` | why-split-lease.html | WhySplitLeasePage | No |
| `app/src/guest-proposals.jsx` | guest-proposals.html | GuestProposalsPage | Yes |
| `app/src/careers.jsx` | careers.html | CareersPage | No |
| `app/src/account-profile.jsx` | account-profile.html | AccountProfilePage | Yes |
| `app/src/self-listing.jsx` | self-listing.html | SelfListingPage | Yes |
| `app/src/help-center.jsx` | help-center.html | HelpCenterPage | No |
| `app/src/help-center-category.jsx` | help-center-category.html | HelpCenterCategoryPage | No |

---

## Statistics

### File Counts
- Configuration files: 4
- Core routing files: 3
- Entry point JSX files: 17
- Page components: 12
- Modal components: 6
- Shared components: 5+
- Logic layer files: 25+
- HTML files: 17

### Route Counts
- Total routes: 90+
- Page routes: 17
- Protected routes: 3
- Navigation functions: 8
- Dynamic redirects: 60+
- URL parameter updates: 12+

---

## Files to Update When Adding a Route

1. `app/vite.config.js` - Add to BOTH configureServer() AND configurePreviewServer()
2. `app/public/_redirects` - Add Cloudflare mapping
3. `app/public/_routes.json` - Update if using Functions
4. `app/src/lib/constants.js` - Add URL constant
5. `app/public/[page].html` - Create HTML entry point
6. `app/src/[page].jsx` - Create React entry point
7. `app/src/islands/pages/[PageName].jsx` - Create page component

---

## Key Files by Category

### Routing Configuration
- `app/vite.config.js` - Development routing
- `app/public/_redirects` - Production routing
- `app/public/_routes.json` - Function routing

### URL & Navigation
- `app/src/lib/constants.js` - URL constants
- `app/src/lib/urlParams.js` - URL utilities
- `app/src/lib/auth.js` - Auth redirects

### Navigation Workflows
- `app/src/logic/workflows/proposals/navigationWorkflow.js` - Navigation functions

### Page Navigation
- `app/src/islands/shared/Header.jsx` - Main navigation
- `app/src/islands/shared/Footer.jsx` - Footer links

---

**Index Generated**: 2025-11-27
**Total Files Referenced**: 60+
**Total Routing Points**: 90+
