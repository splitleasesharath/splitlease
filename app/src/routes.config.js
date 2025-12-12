/**
 * Route Registry - Single Source of Truth for All Routes
 *
 * This file is the ONLY place where routes are defined. All routing configurations
 * (Vite dev server, Vite preview, Cloudflare _redirects, Cloudflare _routes.json)
 * are generated from this single source.
 *
 * Each route defines:
 * - path: The clean URL pattern (supports :param syntax for dynamic segments)
 * - file: The HTML file to serve
 * - protected: Whether authentication is required
 * - cloudflareInternal: Use _internal/ directory to avoid Cloudflare's 308 redirects
 * - internalName: Name for the _internal/ file (no .html extension)
 * - aliases: Additional URL patterns that map to the same file
 * - hasDynamicSegment: Whether the path has a dynamic segment (e.g., :id, :userId)
 *
 * @see docs/ROUTE_REGISTRY_IMPLEMENTATION_PLAN.md for full documentation
 */

export const routes = [
  // ===== HOMEPAGE =====
  {
    path: '/',
    file: 'index.html',
    aliases: ['/index', '/index.html'],
    protected: false,
    cloudflareInternal: false,
    hasDynamicSegment: false
  },

  // ===== INDEX DEV (development only) =====
  {
    path: '/index-dev',
    file: 'index-dev.html',
    aliases: ['/index-dev.html'],
    protected: false,
    cloudflareInternal: false,
    hasDynamicSegment: false,
    devOnly: true
  },

  // ===== SEARCH PAGES =====
  {
    path: '/search',
    file: 'search.html',
    aliases: ['/search.html'],
    protected: false,
    cloudflareInternal: true,
    internalName: 'search-view',
    hasDynamicSegment: false
  },
  {
    path: '/search-test',
    file: 'search-test.html',
    aliases: ['/search-test.html'],
    protected: false,
    cloudflareInternal: false,
    hasDynamicSegment: false
  },

  // ===== DYNAMIC ROUTES (WITH ID PARAMS) =====
  {
    path: '/view-split-lease',
    file: 'view-split-lease.html',
    aliases: ['/view-split-lease.html'],
    protected: false,
    cloudflareInternal: true,
    internalName: 'listing-view',
    hasDynamicSegment: true,
    dynamicPattern: '/view-split-lease/:id'
  },
  {
    path: '/preview-split-lease',
    file: 'preview-split-lease.html',
    aliases: ['/preview-split-lease.html'],
    protected: true,
    cloudflareInternal: true,
    internalName: 'preview-listing-view',
    hasDynamicSegment: true,
    dynamicPattern: '/preview-split-lease/:id'
  },
  {
    path: '/guest-proposals',
    file: 'guest-proposals.html',
    aliases: ['/guest-proposals.html'],
    protected: true,
    cloudflareInternal: true,
    internalName: 'guest-proposals-view',
    hasDynamicSegment: true,
    dynamicPattern: '/guest-proposals/:userId',
    excludeFromFunctions: true // Explicitly excluded in _routes.json
  },
  {
    path: '/account-profile',
    file: 'account-profile.html',
    aliases: ['/account-profile.html'],
    protected: true,
    cloudflareInternal: false,
    hasDynamicSegment: true,
    dynamicPattern: '/account-profile/:userId'
  },

  // ===== HELP CENTER (SPECIAL HANDLING) =====
  {
    path: '/help-center',
    file: 'help-center.html',
    aliases: ['/help-center.html'],
    protected: false,
    cloudflareInternal: true,
    internalName: 'help-center-view',
    hasDynamicSegment: false
  },
  {
    path: '/help-center/:category',
    file: 'help-center-category.html',
    protected: false,
    cloudflareInternal: true,
    internalName: 'help-center-category-view',
    hasDynamicSegment: true,
    skipFileExtensionCheck: true // Special: /help-center/guests (not .html)
  },

  // ===== INFO PAGES =====
  {
    path: '/faq',
    file: 'faq.html',
    aliases: ['/faq.html'],
    protected: false,
    cloudflareInternal: true,
    internalName: 'faq-view',
    hasDynamicSegment: false
  },
  {
    path: '/policies',
    file: 'policies.html',
    aliases: ['/policies.html'],
    protected: false,
    cloudflareInternal: true,
    internalName: 'policies-view',
    hasDynamicSegment: false
  },
  {
    path: '/list-with-us',
    file: 'list-with-us.html',
    aliases: ['/list-with-us.html'],
    protected: false,
    cloudflareInternal: true,
    internalName: 'list-with-us-view',
    hasDynamicSegment: false
  },
  {
    path: '/why-split-lease',
    file: 'why-split-lease.html',
    aliases: ['/why-split-lease.html'],
    protected: false,
    cloudflareInternal: true,
    internalName: 'why-split-lease-view',
    hasDynamicSegment: false
  },
  {
    path: '/careers',
    file: 'careers.html',
    aliases: ['/careers.html'],
    protected: false,
    cloudflareInternal: true,
    internalName: 'careers-view',
    hasDynamicSegment: false
  },
  {
    path: '/about-us',
    file: 'about-us.html',
    aliases: ['/about-us.html'],
    protected: false,
    cloudflareInternal: true,
    internalName: 'about-us-view',
    hasDynamicSegment: false
  },

  // ===== SUCCESS PAGES =====
  {
    path: '/guest-success',
    file: 'guest-success.html',
    aliases: ['/guest-success.html'],
    protected: false,
    cloudflareInternal: true,
    internalName: 'guest-success-view',
    hasDynamicSegment: false
  },
  {
    path: '/host-success',
    file: 'host-success.html',
    aliases: ['/host-success.html'],
    protected: false,
    cloudflareInternal: true,
    internalName: 'host-success-view',
    hasDynamicSegment: false
  },

  // ===== HOST/LISTING MANAGEMENT =====
  {
    path: '/host-proposals',
    file: 'host-proposals.html',
    aliases: ['/host-proposals.html'],
    protected: true,
    cloudflareInternal: true,
    internalName: 'host-proposals-view',
    hasDynamicSegment: true,
    dynamicPattern: '/host-proposals/:userId',
    excludeFromFunctions: true
  },
  {
    path: '/self-listing',
    file: 'self-listing.html',
    aliases: ['/self-listing.html'],
    protected: true,
    cloudflareInternal: false,
    hasDynamicSegment: false
  },
  {
    path: '/self-listing-v2',
    file: 'self-listing-v2.html',
    aliases: ['/self-listing-v2.html'],
    protected: false,
    cloudflareInternal: true,
    internalName: 'self-listing-v2-view',
    hasDynamicSegment: false
  },
  {
    path: '/listing-dashboard',
    file: 'listing-dashboard.html',
    aliases: ['/listing-dashboard.html'],
    protected: true,
    cloudflareInternal: true,
    internalName: 'listing-dashboard-view',
    hasDynamicSegment: false
  },
  {
    path: '/host-overview',
    file: 'host-overview.html',
    aliases: ['/host-overview.html'],
    protected: true,
    cloudflareInternal: true,
    internalName: 'host-overview-view',
    hasDynamicSegment: false
  },

  // ===== OTHER PROTECTED PAGES =====
  {
    path: '/favorite-listings',
    file: 'favorite-listings.html',
    aliases: ['/favorite-listings.html'],
    protected: true,
    cloudflareInternal: true,
    internalName: 'favorite-listings-view',
    hasDynamicSegment: false
  },
  {
    path: '/rental-application',
    file: 'rental-application.html',
    aliases: ['/rental-application.html'],
    protected: true,
    cloudflareInternal: false,
    hasDynamicSegment: false
  },

  // ===== AUTH PAGES =====
  {
    path: '/reset-password',
    file: 'reset-password.html',
    aliases: ['/reset-password.html'],
    protected: false,
    cloudflareInternal: true,  // IMPORTANT: Prevents 308 redirects that strip query params/hash
    internalName: 'reset-password-view',
    hasDynamicSegment: false
  },

  // ===== ERROR PAGES =====
  {
    path: '/404',
    file: '404.html',
    aliases: ['/404.html'],
    protected: false,
    cloudflareInternal: false,
    hasDynamicSegment: false
  },

  // ===== INTERNAL/DEV PAGES =====
  {
    path: '/_internal-test',
    file: '_internal-test.html',
    aliases: ['/_internal-test.html'],
    protected: false,
    cloudflareInternal: false,
    hasDynamicSegment: false
  }
];

// API routes that should be handled by Cloudflare Functions
export const apiRoutes = [
  { path: '/api/*', functionHandler: true }
];

// Routes to explicitly exclude from Cloudflare Functions
export const excludedFromFunctions = routes
  .filter(r => r.excludeFromFunctions)
  .map(r => [r.path, `${r.path}/*`])
  .flat();

// Add default exclusions
excludedFromFunctions.push('/guest-proposals', '/guest-proposals/*');

/**
 * Get all routes that require _internal/ directory handling
 */
export function getInternalRoutes() {
  return routes.filter(r => r.cloudflareInternal && r.internalName);
}

/**
 * Get the base path without dynamic segments
 */
export function getBasePath(route) {
  return route.path.split('/:')[0];
}

/**
 * Check if a URL matches a route pattern
 * @param {string} url - The URL to check
 * @param {Object} route - The route configuration
 * @returns {boolean}
 */
export function matchRoute(url, route) {
  const [urlPath] = url.split('?');
  const basePath = getBasePath(route);

  // Exact match on base path
  if (urlPath === basePath) {
    return true;
  }

  // Check if URL starts with base path + / (for dynamic segments)
  if (route.hasDynamicSegment && urlPath.startsWith(basePath + '/')) {
    return true;
  }

  // Check aliases
  if (route.aliases) {
    for (const alias of route.aliases) {
      if (urlPath === alias) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Find the matching route for a URL
 * @param {string} url - The URL to match
 * @returns {Object|null} The matching route or null
 */
export function findRouteForUrl(url) {
  const [urlPath] = url.split('?');

  // Special handling for help-center category routes
  if (urlPath.startsWith('/help-center/') && !urlPath.includes('.')) {
    return routes.find(r => r.path === '/help-center/:category');
  }

  for (const route of routes) {
    if (matchRoute(url, route)) {
      return route;
    }
  }

  return null;
}

/**
 * Build Rollup input configuration from routes
 * Used by vite.config.js for multi-page builds
 */
export function buildRollupInputs(publicDir) {
  const inputs = {};

  for (const route of routes) {
    if (route.devOnly) continue; // Skip dev-only routes in production build

    const name = route.file.replace('.html', '');
    inputs[name] = `${publicDir}/${route.file}`;
  }

  return inputs;
}

export default routes;
