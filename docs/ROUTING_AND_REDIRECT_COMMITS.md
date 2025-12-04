# Routing, Redirect, and URL Path Fix Commits

**Generated**: 2025-12-04
**Total Commits**: ~120+ routing-related commits
**Repository**: Split Lease

---

## Overview

This document catalogs all commits related to routing, redirects, URL paths, and related fixes in the Split Lease codebase. These commits represent significant debugging efforts around Cloudflare Pages deployment, clean URLs, redirect loops, and URL parameter handling.

---

## Cloudflare 308 Redirect & Listing ID Preservation (Critical Issues)

These were among the most critical issues - Cloudflare's automatic redirects were stripping listing IDs from URLs, breaking the view-split-lease page.

| Commit | Description |
|--------|-------------|
| `8a2152a` | fix: resolve Cloudflare 308 redirect stripping listing IDs |
| `91d58cc` | fix: remove conflicting Cloudflare Function that strips listing ID from URL |
| `b2280f2` | fix: Preserve listing ID in URL for view-split-lease page |
| `dd10a39` | fix: Add defensive listing ID handling for view-split-lease links |
| `641dc0f` | Fix Cloudflare redirect to preserve listing ID in URL path |
| `bf5956a` | Fix redirect to preserve listing ID by serving HTML file correctly |
| `6883218` | Fix _redirects to use named parameter instead of splat |
| `a11f913` | fix: DELETE view-split-lease function - DO NOT RECREATE |
| `c4d9ccb` | docs: add warning comment to _redirects about view-split-lease |

**Root Cause**: Cloudflare Pages Functions were intercepting requests and stripping dynamic path segments.

**Solution**: Removed conflicting Cloudflare Functions and used `_redirects` with proper named parameters.

---

## Redirect Loop Fixes

Multiple pages experienced redirect loops due to conflicting redirect rules, cookie issues, and header redirects.

| Commit | Description |
|--------|-------------|
| `37215ad` | fix: resolve help-center redirect loop with internal files and proper headers |
| `5ea5037` | fix: copy images directory to dist and fix help-center redirect loop |
| `68fd2c1` | fix: Resolve self-listing redirect loop |
| `3a56270` | fix: Resolve redirect loop for self-listing page |
| `3e7c11d` | fix: Resolve guest-proposals redirect loop by fixing clean URL path matching |
| `61b3ddc` | fix: Remove catch-all 404 redirect rule causing redirect loops |
| `c6e0343` | fix: Remove guest-proposals Cloudflare Function causing 308 redirect loop |
| `2a54730` | fix: Resolve guest-proposals redirect loop with cross-domain cookie clearing |
| `af200f4` | fix: Remove Header redirect on protected pages to prevent infinite loop |
| `5f47de5` | fix: Clear cookies in clearAuthData to prevent redirect loop |

**Common Causes**:
- Catch-all redirect rules conflicting with specific routes
- Cloudflare Functions intercepting requests meant for static files
- Authentication redirects creating infinite loops
- Cross-domain cookie issues

---

## Clean URL & Path Formatting

Migrating from `.html` extensions to clean URLs for better SEO and user experience.

| Commit | Description |
|--------|-------------|
| `64d90a6` | fix(routing): add clean URL route for why-split-lease and update listing URL |
| `5b1b9dd` | fix: update View Listing URL to use clean path format |
| `82e25bb` | fix: correct Knowledge Base breadcrumb links to use clean URLs |
| `4f2fbb1` | fix: Update listing URL format to clean URLs without .html extension |
| `62d723e` | Fix listing page routing: Use clean URLs without .html extension |
| `1a342d5` | debug: Add verification token to FAQ page and clean URL redirect |

**Pattern**: `/view-split-lease/listing-id` instead of `/view-split-lease.html?id=listing-id`

---

## Cloudflare Pages Configuration

Configuration and fixes for `_redirects`, `_routes.json`, and caching headers.

| Commit | Description |
|--------|-------------|
| `39365c4` | fix(api): simplify _routes.json to fix 405 error on /api/faq-inquiry |
| `df872b4` | Revert "fix(routing): Add _routes.json for Cloudflare Pages Functions routing" |
| `cf49b6d` | fix(routing): Add _routes.json for Cloudflare Pages Functions routing |
| `229e133` | Fix Cloudflare Pages build configuration and _redirects |
| `776049f` | Fix routing issue: Add Cloudflare Pages _redirects configuration |
| `a641d62` | Use force flag (!) in _redirects to prevent Cloudflare auto-redirects |
| `37295d4` | fix: Remove invalid force flags from _redirects and fix gallery button aspect ratio |
| `eee9342` | fix: Completely disable HTTP caching across all routes |
| `9abc4d7` | chore: Optimize Cloudflare Pages caching headers |
| `e1f9e15` | fix: Add Cloudflare Pages cache headers to prevent stale asset serving |
| `ec07135` | fix: Add account-profile redirect rule for Cloudflare Pages |
| `e692841` | Implement Cloudflare Pages Function for dynamic listing routes |
| `12206c7` | Add root-level build configuration for Cloudflare Pages |
| `6f2bd95` | Add Cloudflare Pages build configuration file |
| `a118f3c` | Fix Cloudflare Pages deployment: Move HTML files to dist root |

**Key Files**:
- `app/_redirects` - Cloudflare redirect rules
- `app/_routes.json` - API route configuration
- `.pages.toml` - Cloudflare Pages build config

---

## Vite Dev Server Routing

Fixes to ensure the local development server handles routes correctly.

| Commit | Description |
|--------|-------------|
| `7f8419f` | fix(vite): serve HTML file directly for dynamic view-split-lease routes |
| `8877618` | fix(vite): handle exact /view-split-lease path in dev server routing |
| `3393e47` | fix(dev): correct npm scripts syntax and add /index route handling |
| `3ee2bd6` | Fix navigation from HomePage to SearchPage with multi-page dev server routing |

**Configuration**: Custom middleware in `vite.config.js` to handle SPA-like routing in a multi-page app.

---

## URL Parameter Handling

Fixes for preserving and passing URL parameters between pages.

| Commit | Description |
|--------|-------------|
| `df36abe` | fix(search): compute days-selected URL at click time, not render time |
| `d2f5b2e` | fix(search): pass schedule selection from search page to listing view |
| `4f65b7e` | fix(listing): redirect to self-listing page without listing_id param |
| `2de8808` | feat: Preload listing name from URL parameter in self-listing page |
| `29c68d2` | fix: Preserve user ID in account-profile URL during redirects |
| `dd3b103` | fix: Prevent SearchScheduleSelector from removing user ID in account-profile URL |
| `ba9df4a` | fix: Improve URL parsing for account-profile page |
| `e08d59c` | fix: Prevent policies page from overriding URL hash on load |
| `7388f9c` | feat: Add URL parameter support to FAQ page for dynamic section and question navigation |
| `c8ba527` | feat: Add URL parameter sync to SearchScheduleSelector with Monday-Friday default |
| `e1e4013` | feat: Reposition SearchScheduleSelector and implement URL parameter handling |

**Key Pattern**: Schedule selection days are passed via URL params like `?days=1,2,3,4,5`

---

## Navigation Link Fixes

Updates to internal links to use correct paths and avoid external redirects.

| Commit | Description |
|--------|-------------|
| `7bf8815` | fix(footer): update About the Team link to new /about-us page |
| `8a230cc` | fix(why-split-lease): restore SearchScheduleSelector and fix View Stories URL |
| `bbdb80d` | fix: update guest category link to use full URL with travelers section |
| `94b1d60` | feat: redirect Help Center guest/host categories to FAQ page |
| `4a99090` | fix(why-split-lease): redirect View all Stories to /guest-success |
| `449178e` | fix: Update Header and Footer success stories links to local routes |
| `762e728` | fix: Update footer careers link to redirect to local careers page |
| `80a1967` | fix: Update all navigation links to use native search page with day selection support |
| `658c4cc` | fix: Replace hardcoded domain URLs with relative paths in navigation |
| `c03b768` | fix: update Privacy Policy link to split.lease/policies |
| `3e13c82` | fix: update Terms of Use link to split.lease/policies#terms-of-use |
| `419a3dd` | fix(header): Update Why Split Lease link to local page |
| `ce3a526` | fix(nav): Update Host/Trial Host "My Proposals" link to /guest-proposals |
| `396f995` | fix(nav): Update Guest "My Proposals" link to /guest-proposals |
| `4726dce` | fix: Update Footer blog link to point to knowledge base |
| `ee8768a` | fix: Update cancellation policy link to correct anchor |
| `db35fa0` | fix: Update 'About Periodic Tenancy' link to open specific FAQ in travelers section |

**Best Practice**: Use relative paths (`/page`) instead of absolute URLs (`https://split.lease/page`)

---

## 404 Page & Error Handling

Implementation of custom 404 page and error routing.

| Commit | Description |
|--------|-------------|
| `68d246d` | config: Add catch-all redirect rule for 404 page |
| `17cfaed` | build: Add 404 page to Vite build pipeline |
| `59c9098` | feat: Add 404 Not Found page with React island |

**File**: `app/404.html` - Custom 404 page served by Cloudflare Pages

---

## Authentication Redirects

Changes to how authentication state affects page redirects.

| Commit | Description |
|--------|-------------|
| `0e0ceb7` | fix(favorite-listings): show auth message instead of redirect |
| `7cdbd18` | fix: Remove auto-redirects from account-profile page, show auth modal instead |
| `e945e8f` | feat: Show signin popup on guest-proposals instead of redirecting to app.split.lease |
| `0a4721f` | feat: Header Sign Up links now open modal instead of redirect |
| `f94786f` | fix: Replace hardcoded production URL with relative path in Header redirect |

**Pattern Change**: Show modal for authentication instead of redirecting to external Bubble.io pages

---

## Documentation (Routing Analysis)

Documentation created to understand and document routing behavior.

| Commit | Description |
|--------|-------------|
| `501b9c1` | docs: add routing analysis master readme and navigation guide |
| `46d932a` | docs: add routing files index and reference guide |
| `45d251c` | docs: add routing analysis executive summary |
| `fc8c301` | docs: add routing quick reference guide for developers |
| `f954c55` | docs: add comprehensive routing and redirection analysis |
| `ec533c5` | docs: Document functions directory structure and guest-proposals routing |

**Location**: `docs/` directory contains routing analysis documents

---

## Import Path Fixes (Related)

While not strictly routing, these import path fixes were often discovered during routing debugging.

| Commit | Description |
|--------|-------------|
| `76bac19` | fix: correct import paths in bubble-auth-proxy signup handler |
| `d74ca79` | fix: Correct import paths for supabase in utility services |
| `ba2b30e` | fix: Correct import path for SelfListingPage component |
| `c5e31e7` | fix: Correct import paths in CreateDuplicateListingModal |

---

## Summary Statistics

| Category | Count |
|----------|-------|
| Cloudflare 308/listing ID issues | 9 |
| Redirect loop fixes | 10 |
| Clean URL formatting | 6 |
| Cloudflare Pages config | 15 |
| Vite dev server routing | 4 |
| URL parameter handling | 11 |
| Navigation link fixes | 17 |
| 404 page & error handling | 3 |
| Authentication redirects | 5 |
| Documentation | 6 |
| Import path fixes | 4 |
| **Total** | **~90 unique commits** |

---

## Lessons Learned

### 1. Cloudflare Pages Functions Can Conflict with Static Routing
- Functions in the `functions/` directory intercept requests before `_redirects`
- Solution: Only use Functions for API endpoints, not page routing

### 2. Clean URLs Require Proper Server Configuration
- Both Vite dev server and Cloudflare Pages need custom config for clean URLs
- The `_redirects` file must handle dynamic segments properly

### 3. Redirect Loops Often Have Multiple Causes
- Check: `_redirects`, Cloudflare Functions, JavaScript redirects, cookie-based redirects
- Always test redirect changes in incognito to avoid cookie issues

### 4. URL Parameters Must Be Explicitly Preserved
- React components can inadvertently strip URL parameters on re-render
- Compute URLs at action time, not render time

### 5. Use Relative Paths for Internal Navigation
- Hardcoded domains cause issues when moving between environments
- `/page` works everywhere, `https://domain.com/page` requires environment awareness

---

## Quick Reference Commands

```bash
# View routing-related commits
git log --oneline | grep -iE "(redirect|routing|route|path|url)"

# Check current _redirects file
cat app/_redirects

# Check _routes.json
cat app/_routes.json

# View Cloudflare Pages config
cat .pages.toml
```

---

**Document Version**: 1.0
**Last Updated**: 2025-12-04
