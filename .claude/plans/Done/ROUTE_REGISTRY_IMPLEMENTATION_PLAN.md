# Route Registry Implementation Plan

**Created**: 2025-12-04
**Status**: COMPREHENSIVE IMPLEMENTATION PLAN
**Purpose**: Stop routing regressions by centralizing route configuration

---

## Executive Summary

### The Problem: "Route Drift"

Currently, adding or modifying a route requires updates in **4 different locations**:

1. `vite.config.js` - `configureServer` (Dev middleware, ~95 lines)
2. `vite.config.js` - `configurePreviewServer` (Preview middleware, ~95 lines duplicated)
3. `public/_redirects` (Cloudflare Production routing)
4. `public/_routes.json` (Cloudflare Functions routing control)

This has caused **11 routing-related bugs** between November 28 - December 4, 2025.

### The Solution: Route Registry

Create a **single source of truth** (`routes.config.js`) that generates all routing configurations automatically. This eliminates manual synchronization and prevents "works in dev, breaks in production" regressions.

---

## Feasibility Assessment

### Verdict: HIGHLY FEASIBLE with Moderate Risk

| Factor | Assessment | Notes |
|--------|------------|-------|
| **Technical Feasibility** | GREEN | Standard pattern, proven approach |
| **Complexity** | MEDIUM | Affects build process, requires careful migration |
| **Risk** | MODERATE | Critical path - routing issues break entire app |
| **Effort** | 2-3 hours | Mostly refactoring existing code |
| **Payoff** | HIGH | Prevents recurring regressions, easier maintenance |

### What Works Well in Current Architecture

1. **_internal/ directory pattern** - Already solving Cloudflare's 308 redirect issue
2. **Query string preservation** - Already implemented correctly
3. **Clean URL support** - `/view-split-lease/123` pattern already working
4. **Build-time copying** - `closeBundle` hook already copies required files

### What Needs Fixing

1. **95 lines of duplicated routing logic** between dev/preview servers
2. **Manual synchronization** between 4 configuration files
3. **No automated validation** that routes match across environments
4. **Hardcoded navigation strings** scattered in components

---

## Implementation Plan

### Phase 1: Create Route Registry (Foundation)

**File**: `app/src/routes.config.js`

```javascript
/**
 * Route Registry - Single Source of Truth for All Routes
 *
 * Each route defines:
 * - path: The clean URL pattern (supports :id params)
 * - file: The HTML file to serve
 * - protected: Whether auth is required
 * - cloudflareInternal: Use _internal/ directory to avoid 308 redirects
 * - functionHandler: Should this be handled by a Cloudflare Function?
 */

export const routes = [
  // ===== PUBLIC PAGES =====
  {
    path: '/',
    file: 'index.html',
    aliases: ['/index', '/index.html'],
    protected: false,
    cloudflareInternal: false,
    functionHandler: false
  },
  {
    path: '/search',
    file: 'search.html',
    aliases: ['/search.html'],
    protected: false,
    cloudflareInternal: false,
    functionHandler: false
  },
  {
    path: '/search-test',
    file: 'search-test.html',
    aliases: ['/search-test.html'],
    protected: false,
    cloudflareInternal: false,
    functionHandler: false
  },

  // ===== DYNAMIC ROUTES (WITH ID PARAMS) =====
  {
    path: '/view-split-lease/:id?',
    file: 'view-split-lease.html',
    aliases: ['/view-split-lease.html'],
    protected: false,
    cloudflareInternal: true, // Uses _internal/listing-view to avoid 308
    internalName: 'listing-view',
    functionHandler: false
  },
  {
    path: '/guest-proposals/:userId?',
    file: 'guest-proposals.html',
    aliases: ['/guest-proposals.html'],
    protected: true,
    cloudflareInternal: true,
    internalName: 'guest-proposals-view',
    functionHandler: false // Explicitly excluded in _routes.json
  },
  {
    path: '/account-profile/:userId?',
    file: 'account-profile.html',
    aliases: ['/account-profile.html'],
    protected: true,
    cloudflareInternal: false, // Direct file serve
    functionHandler: false
  },

  // ===== HELP CENTER (SPECIAL HANDLING) =====
  {
    path: '/help-center',
    file: 'help-center.html',
    aliases: ['/help-center.html', '/help-center/'],
    protected: false,
    cloudflareInternal: true,
    internalName: 'help-center-view',
    functionHandler: false
  },
  {
    path: '/help-center/:category',
    file: 'help-center-category.html',
    protected: false,
    cloudflareInternal: true,
    internalName: 'help-center-category-view',
    functionHandler: false,
    skipFileExtensionCheck: true // Special: /help-center/guests (not .html)
  },

  // ===== INFO PAGES =====
  {
    path: '/faq',
    file: 'faq.html',
    aliases: ['/faq.html'],
    protected: false,
    cloudflareInternal: false,
    functionHandler: false
  },
  {
    path: '/policies',
    file: 'policies.html',
    aliases: ['/policies.html'],
    protected: false,
    cloudflareInternal: false,
    functionHandler: false
  },
  {
    path: '/list-with-us',
    file: 'list-with-us.html',
    aliases: ['/list-with-us.html'],
    protected: false,
    cloudflareInternal: false,
    functionHandler: false
  },
  {
    path: '/why-split-lease',
    file: 'why-split-lease.html',
    aliases: ['/why-split-lease.html'],
    protected: false,
    cloudflareInternal: false,
    functionHandler: false
  },
  {
    path: '/careers',
    file: 'careers.html',
    aliases: ['/careers.html'],
    protected: false,
    cloudflareInternal: false,
    functionHandler: false
  },
  {
    path: '/about-us',
    file: 'about-us.html',
    aliases: ['/about-us.html'],
    protected: false,
    cloudflareInternal: false,
    functionHandler: false
  },

  // ===== SUCCESS PAGES =====
  {
    path: '/guest-success',
    file: 'guest-success.html',
    aliases: ['/guest-success.html'],
    protected: false,
    cloudflareInternal: false,
    functionHandler: false
  },
  {
    path: '/host-success',
    file: 'host-success.html',
    aliases: ['/host-success.html'],
    protected: false,
    cloudflareInternal: false,
    functionHandler: false
  },

  // ===== HOST/LISTING MANAGEMENT =====
  {
    path: '/self-listing',
    file: 'self-listing.html',
    aliases: ['/self-listing.html'],
    protected: true,
    cloudflareInternal: false,
    functionHandler: false
  },
  {
    path: '/listing-dashboard',
    file: 'listing-dashboard.html',
    aliases: ['/listing-dashboard.html'],
    protected: true,
    cloudflareInternal: false,
    functionHandler: false
  },
  {
    path: '/host-overview',
    file: 'host-overview.html',
    aliases: ['/host-overview.html'],
    protected: true,
    cloudflareInternal: false,
    functionHandler: false
  },

  // ===== OTHER PAGES =====
  {
    path: '/favorite-listings',
    file: 'favorite-listings.html',
    aliases: ['/favorite-listings.html'],
    protected: true,
    cloudflareInternal: false,
    functionHandler: false
  },
  {
    path: '/rental-application',
    file: 'rental-application.html',
    aliases: ['/rental-application.html'],
    protected: true,
    cloudflareInternal: false,
    functionHandler: false
  },

  // ===== ERROR PAGES =====
  {
    path: '/404',
    file: '404.html',
    aliases: ['/404.html'],
    protected: false,
    cloudflareInternal: false,
    functionHandler: false
  }
];

// API routes that should be handled by Cloudflare Functions
export const apiRoutes = [
  { path: '/api/*', functionHandler: true }
];

// Routes to explicitly exclude from Cloudflare Functions
export const excludedFromFunctions = [
  '/guest-proposals',
  '/guest-proposals/*'
];
```

---

### Phase 2: Refactor vite.config.js

**Goal**: Replace 190 lines of duplicated if/else with a single shared function.

```javascript
// app/vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import fs from 'fs';
import path from 'path';
import { routes } from './src/routes.config.js';

/**
 * Shared routing logic for both dev and preview servers
 * @param {Object} req - Request object
 * @param {string} publicPrefix - '/public' for dev, '' for preview
 */
function handleRouting(req, publicPrefix = '') {
  const url = req.url || '';
  const [urlPath, queryString] = url.split('?');
  const query = queryString ? `?${queryString}` : '';

  // Find matching route
  for (const route of routes) {
    // Check main path
    if (matchRoute(urlPath, route.path)) {
      req.url = `${publicPrefix}/${route.file}${query}`;
      return;
    }

    // Check aliases
    if (route.aliases) {
      for (const alias of route.aliases) {
        if (urlPath === alias || urlPath.startsWith(alias + '?')) {
          req.url = `${publicPrefix}/${route.file}${query}`;
          return;
        }
      }
    }
  }
}

/**
 * Match URL path against route pattern
 * Supports :param patterns and optional params with ?
 */
function matchRoute(urlPath, pattern) {
  // Exact match
  if (urlPath === pattern.replace('/:id?', '').replace('/:userId?', '').replace('/:category', '')) {
    return true;
  }

  // Pattern match (e.g., /view-split-lease/:id? matches /view-split-lease/123)
  const patternBase = pattern.split('/:')[0];
  if (urlPath === patternBase || urlPath.startsWith(patternBase + '/') || urlPath.startsWith(patternBase + '?')) {
    return true;
  }

  return false;
}

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'multi-page-routing',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          handleRouting(req, '/public');
          next();
        });
      },
      configurePreviewServer(server) {
        server.middlewares.use((req, res, next) => {
          handleRouting(req, '');
          next();
        });
      }
    },
    // ... rest of plugins unchanged
  ],
  // ... rest of config unchanged
});
```

**Lines Saved**: ~150 lines (from 190+ to ~40)

---

### Phase 3: Generate _redirects at Build Time

**File**: `app/scripts/generate-redirects.js`

```javascript
import fs from 'fs';
import path from 'path';
import { routes, excludedFromFunctions } from '../src/routes.config.js';

/**
 * Generates Cloudflare Pages _redirects file from Route Registry
 */
function generateRedirects() {
  const lines = [
    '# Cloudflare Pages redirects and rewrites',
    '# AUTO-GENERATED from routes.config.js - DO NOT EDIT MANUALLY',
    `# Generated: ${new Date().toISOString()}`,
    ''
  ];

  // Group routes by type for organized output
  const dynamicRoutes = routes.filter(r => r.path.includes(':'));
  const staticRoutes = routes.filter(r => !r.path.includes(':'));

  // Dynamic routes first (more specific)
  lines.push('# Dynamic routes (with parameters)');
  for (const route of dynamicRoutes) {
    if (route.cloudflareInternal) {
      const basePath = route.path.split('/:')[0];
      lines.push(`${basePath}  /_internal/${route.internalName}  200`);
      lines.push(`${basePath}/  /_internal/${route.internalName}  200`);
      lines.push(`${basePath}/*  /_internal/${route.internalName}  200`);
    } else {
      const basePath = route.path.split('/:')[0];
      lines.push(`${basePath}/*  /${route.file}  200`);
    }
    lines.push('');
  }

  // Static routes
  lines.push('# Static pages');
  for (const route of staticRoutes) {
    if (route.path === '/') {
      lines.push('/  /index.html  200');
      lines.push('/index.html  /index.html  200');
    } else if (route.cloudflareInternal) {
      lines.push(`${route.path}  /_internal/${route.internalName}  200`);
      lines.push(`${route.path}/  /_internal/${route.internalName}  200`);
    } else {
      // Only add .html version for explicit file serve
      if (route.aliases?.includes(`${route.path}.html`)) {
        lines.push(`${route.path}.html  /${route.file}  200`);
      }
    }
  }

  lines.push('');
  lines.push('# Note: Cloudflare Pages automatically serves /404.html for not found routes');

  const content = lines.join('\n');
  const outputPath = path.resolve(process.cwd(), 'public/_redirects');

  fs.writeFileSync(outputPath, content);
  console.log('Generated _redirects file');
}

/**
 * Generates Cloudflare Pages _routes.json from Route Registry
 */
function generateRoutesJson() {
  const routesJson = {
    version: 1,
    include: ['/api/*'],
    exclude: excludedFromFunctions
  };

  const content = JSON.stringify(routesJson, null, 2);
  const outputPath = path.resolve(process.cwd(), 'public/_routes.json');

  fs.writeFileSync(outputPath, content);
  console.log('Generated _routes.json file');
}

// Run both generators
generateRedirects();
generateRoutesJson();

export { generateRedirects, generateRoutesJson };
```

**Add to package.json**:

```json
{
  "scripts": {
    "generate-routes": "node scripts/generate-redirects.js",
    "prebuild": "npm run generate-routes",
    "build": "vite build"
  }
}
```

---

### Phase 4: Create Navigation Utilities

**File**: `app/src/lib/navigation.js`

```javascript
import { routes } from '../routes.config.js';

/**
 * Type-safe navigation utilities
 * Centralizes all navigation logic to prevent hardcoded URL strings
 */

// Build route lookup for O(1) access
const routeLookup = routes.reduce((acc, route) => {
  const key = route.path.split('/:')[0].replace('/', '') || 'home';
  acc[key] = route;
  return acc;
}, {});

/**
 * Navigate to a listing detail page
 * @param {string} listingId - The listing ID
 */
export function goToListing(listingId) {
  if (!listingId) {
    console.error('goToListing: listingId is required');
    return;
  }
  window.location.href = `/view-split-lease/${listingId}`;
}

/**
 * Navigate to guest proposals page
 * @param {string} userId - Optional user ID
 * @param {string} proposalId - Optional proposal ID to highlight
 */
export function goToProposals(userId, proposalId) {
  let url = '/guest-proposals';
  if (userId) url += `/${userId}`;
  if (proposalId) url += `?proposal=${proposalId}`;
  window.location.href = url;
}

/**
 * Navigate to search page with optional filters
 * @param {Object} filters - Optional search filters
 */
export function goToSearch(filters = {}) {
  const params = new URLSearchParams();

  if (filters.daysSelected) params.set('days-selected', filters.daysSelected.join(','));
  if (filters.borough) params.set('borough', filters.borough);
  if (filters.priceTier) params.set('pricetier', filters.priceTier);
  if (filters.sort) params.set('sort', filters.sort);

  const queryString = params.toString();
  window.location.href = `/search${queryString ? '?' + queryString : ''}`;
}

/**
 * Navigate to account profile
 * @param {string} userId - The user ID
 */
export function goToProfile(userId) {
  if (!userId) {
    console.error('goToProfile: userId is required');
    return;
  }
  window.location.href = `/account-profile/${userId}`;
}

/**
 * Navigate to self-listing (create/edit listing)
 * @param {string} listingId - Optional listing ID for editing
 */
export function goToSelfListing(listingId) {
  if (listingId) {
    window.location.href = `/self-listing?listing_id=${listingId}`;
  } else {
    window.location.href = '/self-listing';
  }
}

/**
 * Navigate to help center
 * @param {string} category - Optional category (guests, hosts, etc.)
 */
export function goToHelpCenter(category) {
  if (category) {
    window.location.href = `/help-center/${category}`;
  } else {
    window.location.href = '/help-center';
  }
}

/**
 * Navigate to listing dashboard
 * @param {string} listingId - Optional listing ID
 */
export function goToListingDashboard(listingId) {
  if (listingId) {
    window.location.href = `/listing-dashboard?listing_id=${listingId}`;
  } else {
    window.location.href = '/listing-dashboard';
  }
}

/**
 * Check if a route exists in the registry
 * @param {string} path - The path to check
 * @returns {boolean}
 */
export function routeExists(path) {
  const basePath = path.split('?')[0].split('/').slice(0, 2).join('/');
  return routes.some(r => r.path.startsWith(basePath) || r.aliases?.includes(basePath));
}

/**
 * Get route info by path
 * @param {string} path - The path to look up
 * @returns {Object|null} Route configuration or null
 */
export function getRouteInfo(path) {
  const basePath = path.split('?')[0];
  return routes.find(r => {
    const patternBase = r.path.split('/:')[0];
    return basePath === patternBase || basePath.startsWith(patternBase + '/');
  }) || null;
}
```

---

### Phase 5: Update Build Process for _internal Files

The existing `closeBundle` hook already creates `_internal/` files. We need to make it route-registry-aware:

```javascript
// In vite.config.js closeBundle hook
{
  name: 'move-html-to-root',
  closeBundle() {
    const distDir = path.resolve(__dirname, 'dist');
    const internalDir = path.join(distDir, '_internal');

    // Create _internal directory
    if (!fs.existsSync(internalDir)) {
      fs.mkdirSync(internalDir, { recursive: true });
    }

    // Generate internal files from route registry
    for (const route of routes) {
      if (route.cloudflareInternal && route.internalName) {
        const source = path.join(distDir, route.file);
        const dest = path.join(internalDir, route.internalName);

        if (fs.existsSync(source)) {
          fs.copyFileSync(source, dest);
          console.log(`Created _internal/${route.internalName}`);
        }
      }
    }

    // ... rest of existing closeBundle logic
  }
}
```

---

## Migration Strategy

### Step 1: Create Route Registry (Low Risk)
1. Create `app/src/routes.config.js` with all existing routes
2. Test by importing in a simple script - no production impact

### Step 2: Refactor Vite Config (Medium Risk)
1. Create backup of current `vite.config.js`
2. Add shared `handleRouting` function alongside existing code
3. Test dev server works with new function
4. Test preview server works with new function
5. Remove old duplicated code

### Step 3: Generate _redirects (Medium Risk)
1. Create `scripts/generate-redirects.js`
2. Generate output and compare to existing `_redirects`
3. Fix any discrepancies
4. Add `prebuild` script to package.json
5. Deploy and verify in production

### Step 4: Add Navigation Utilities (Low Risk)
1. Create `app/src/lib/navigation.js`
2. Migrate one component at a time
3. Use alongside existing `window.location.href` calls
4. Gradually replace hardcoded strings

---

## Rollback Plan

Each phase can be rolled back independently:

1. **Route Registry**: Delete the file, no impact
2. **Vite Config**: Restore from backup or git
3. **_redirects Generation**: Manually restore from git, remove prebuild script
4. **Navigation Utilities**: Keep old code, delete new file

---

## Testing Checklist

### Phase 1: Route Registry
- [ ] All 22 routes defined correctly
- [ ] Import works in Node.js and Vite

### Phase 2: Vite Config
- [ ] `npm run dev` serves all pages correctly
- [ ] Query strings preserved on all routes
- [ ] Dynamic routes work (e.g., `/view-split-lease/123`)
- [ ] Help center category routes work
- [ ] `npm run preview` works identically

### Phase 3: _redirects Generation
- [ ] Generated file matches expected output
- [ ] Build succeeds with prebuild script
- [ ] Production deployment works
- [ ] All dynamic routes preserve IDs
- [ ] 308 redirect issue doesn't return

### Phase 4: Navigation Utilities
- [ ] `goToListing('123')` navigates correctly
- [ ] `goToSearch({ borough: 'manhattan' })` builds correct URL
- [ ] All navigation functions work

---

## Success Metrics

| Metric | Before | After (Target) |
|--------|--------|----------------|
| Routing bugs per month | 11 | 0 |
| Lines of routing code | 190+ | ~50 |
| Files to update for new route | 4 | 1 |
| Time to add new page | 15+ min | 2 min |

---

## Important Files Reference

| File | Purpose |
|------|---------|
| `app/src/routes.config.js` | **NEW** - Single source of truth |
| `app/vite.config.js` | **MODIFY** - Use shared routing |
| `app/scripts/generate-redirects.js` | **NEW** - Build-time generation |
| `app/src/lib/navigation.js` | **NEW** - Type-safe navigation |
| `app/public/_redirects` | **GENERATED** - Don't edit manually |
| `app/public/_routes.json` | **GENERATED** - Don't edit manually |

---

## Conclusion

This plan directly addresses the "Route Drift" problem identified in the routing analysis. By implementing a Route Registry:

1. **Eliminates duplication** - One definition, multiple outputs
2. **Prevents regressions** - Can't forget to update one file
3. **Improves maintainability** - Clear, documented route configuration
4. **Enables automation** - Build-time verification possible

The implementation is low-risk due to its incremental nature - each phase can be tested and rolled back independently.

---

**Plan Author**: Claude Code
**Last Updated**: 2025-12-04
**Status**: Ready for Implementation
