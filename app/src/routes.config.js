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
    path: '/quick-match',
    file: 'quick-match.html',
    aliases: ['/quick-match.html'],
    protected: false,
    cloudflareInternal: true,
    internalName: 'quick-match-view',
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
    cloudflareInternal: true,
    internalName: 'account-profile-view',
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
    path: '/list-with-us-v2',
    file: 'list-with-us-v2.html',
    aliases: ['/list-with-us-v2.html'],
    protected: false,
    cloudflareInternal: true,
    internalName: 'list-with-us-v2-view',
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
  {
    path: '/host-guarantee',
    file: 'host-guarantee.html',
    aliases: ['/host-guarantee.html'],
    protected: false,
    cloudflareInternal: true,
    internalName: 'host-guarantee-view',
    hasDynamicSegment: false
  },
  {
    path: '/referral',
    file: 'referral.html',
    aliases: ['/referral.html', '/ref'],
    protected: false,
    cloudflareInternal: true,
    internalName: 'referral-view',
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
    cloudflareInternal: true,
    internalName: 'self-listing-view',
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
    path: '/favorite-listings-v2',
    file: 'favorite-listings-v2.html',
    aliases: ['/favorite-listings-v2.html'],
    protected: true,
    cloudflareInternal: true,
    internalName: 'favorite-listings-v2-view',
    hasDynamicSegment: false
  },
  {
    path: '/rental-application',
    file: 'rental-application.html',
    aliases: ['/rental-application.html'],
    protected: true,
    cloudflareInternal: true,
    internalName: 'rental-application-view',
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
  {
    path: '/auth/verify',
    file: 'auth-verify.html',
    aliases: ['/auth/verify.html'],
    protected: false,
    cloudflareInternal: true,  // IMPORTANT: Prevents 308 redirects that strip query params
    internalName: 'auth-verify-view',
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

  // ===== MESSAGING =====
  {
    path: '/messages',
    file: 'messages.html',
    aliases: ['/messages.html', '/messaging-app'],
    protected: true,
    cloudflareInternal: true,
    internalName: 'messages-view',
    hasDynamicSegment: false
  },

  // ===== HOUSE MANUAL =====
  {
    path: '/house-manual',
    file: 'house-manual.html',
    aliases: ['/house-manual.html'],
    protected: true,
    cloudflareInternal: true,
    internalName: 'house-manual-view',
    hasDynamicSegment: false
  },

  // ===== VISIT MANUAL (GUEST-FACING) =====
  {
    path: '/visit-manual',
    file: 'visit-manual.html',
    aliases: ['/visit-manual.html'],
    protected: false,
    cloudflareInternal: true,
    internalName: 'visit-manual-view',
    hasDynamicSegment: false
  },

  // ===== TRIAL HOST SIGNUP =====
  {
    path: '/signup-trial-host',
    file: 'signup-trial-host.html',
    aliases: ['/signup-trial-host.html'],
    protected: false,
    cloudflareInternal: true,
    internalName: 'signup-trial-host-view',
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
  },
  {
    path: '/_internal/create-suggested-proposal',
    file: 'create-suggested-proposal.html',
    aliases: ['/_internal/create-suggested-proposal.html'],
    protected: false,
    cloudflareInternal: false,
    hasDynamicSegment: false
  },
  {
    path: '/_internal/leases-overview',
    file: 'leases-overview.html',
    aliases: ['/_internal/leases-overview.html'],
    protected: true,
    adminOnly: true,
    cloudflareInternal: false,
    internalName: 'leases-overview-view',
    hasDynamicSegment: false
  },
  {
    path: '/_email-sms-unit',
    file: '_email-sms-unit.html',
    aliases: ['/_email-sms-unit.html'],
    protected: false,
    cloudflareInternal: false,
    hasDynamicSegment: false
  },

  // ===== DEMO/PROTOTYPE PAGES =====
  {
    path: '/referral-demo',
    file: 'referral-demo.html',
    aliases: ['/referral-demo.html'],
    protected: false,
    cloudflareInternal: false,
    hasDynamicSegment: false,
    devOnly: true
  },

  // ===== SIMULATION PAGES =====
  {
    path: '/_internal/guest-simulation',
    file: 'guest-simulation.html',
    aliases: ['/_internal/guest-simulation.html', '/simulation-guest-proposals-mobile-day1'],
    protected: false,  // Auth handled in-page for usability testing
    cloudflareInternal: false,
    hasDynamicSegment: false
  },
  {
    path: '/simulation-guest-mobile',
    file: 'simulation-guest-mobile.html',
    aliases: ['/simulation-guest-mobile.html', '/simulation-guest-proposals-mobile-day2'],
    protected: true,
    cloudflareInternal: true,
    internalName: 'simulation-guest-mobile-view',
    hasDynamicSegment: false
  },
  {
    path: '/simulation-guestside-demo',
    file: 'simulation-guestside-demo.html',
    aliases: ['/simulation-guestside-demo.html', '/usability-test'],
    protected: true,
    cloudflareInternal: true,
    internalName: 'simulation-guestside-demo-view',
    hasDynamicSegment: false
  },
  {
    path: '/simulation-hostside-demo',
    file: 'simulation-hostside-demo.html',
    aliases: ['/simulation-hostside-demo.html', '/host-usability-test'],
    protected: true,
    cloudflareInternal: true,
    internalName: 'simulation-hostside-demo-view',
    hasDynamicSegment: false
  },
  {
    path: '/simulation-host-mobile',
    file: 'simulation-host-mobile.html',
    aliases: ['/simulation-host-mobile.html', '/host-simulation'],
    protected: true,
    cloudflareInternal: true,
    internalName: 'simulation-host-mobile-view',
    hasDynamicSegment: false
  },

  // ===== CORPORATE INTERNAL TOOLS =====
  {
    path: '/_internal/guest-relationships',
    file: 'guest-relationships.html',
    aliases: ['/_internal/guest-relationships.html', '/guest-relationships'],
    protected: true,
    adminOnly: true,
    cloudflareInternal: false,
    internalName: 'guest-relationships-view',
    hasDynamicSegment: false
  },
  {
    path: '/_internal/manage-virtual-meetings',
    file: 'manage-virtual-meetings.html',
    aliases: ['/_internal/manage-virtual-meetings.html', '/manage-virtual-meetings'],
    protected: true,
    adminOnly: true,
    cloudflareInternal: false,
    internalName: 'manage-virtual-meetings-view',
    hasDynamicSegment: false
  },
  {
    path: '/_internal/manage-informational-texts',
    file: 'manage-informational-texts.html',
    aliases: ['/_internal/manage-informational-texts.html', '/manage-informational-texts'],
    protected: true,
    adminOnly: true,
    cloudflareInternal: false,
    internalName: 'manage-informational-texts-view',
    hasDynamicSegment: false
  },
  {
    path: '/_internal/quick-price',
    file: 'quick-price.html',
    aliases: ['/_internal/quick-price.html', '/quick-price'],
    protected: true,
    adminOnly: true,
    cloudflareInternal: false,
    internalName: 'quick-price-view',
    hasDynamicSegment: false
  },
  {
    path: '/_internal/verify-users',
    file: 'verify-users.html',
    aliases: ['/_internal/verify-users.html', '/verify-users'],
    protected: true,
    adminOnly: true,
    cloudflareInternal: false,
    internalName: 'verify-users-view',
    hasDynamicSegment: false
  },
  {
    path: '/_internal/co-host-requests',
    file: 'co-host-requests.html',
    aliases: ['/_internal/co-host-requests.html', '/co-host-requests'],
    protected: true,
    adminOnly: true,
    cloudflareInternal: false,
    internalName: 'co-host-requests-view',
    hasDynamicSegment: false
  },
  {
    path: '/_internal/simulation-admin',
    file: 'simulation-admin.html',
    aliases: ['/_internal/simulation-admin.html', '/simulation-admin'],
    protected: true,
    adminOnly: true,
    cloudflareInternal: false,
    internalName: 'simulation-admin-view',
    hasDynamicSegment: false
  },
  {
    path: '/_internal/send-magic-login-links',
    file: 'send-magic-login-links.html',
    aliases: ['/_internal/send-magic-login-links.html', '/send-magic-login-links'],
    protected: true,
    adminOnly: true,
    cloudflareInternal: false,
    internalName: 'send-magic-login-links-view',
    hasDynamicSegment: false
  },
  {
    path: '/_internal/modify-listings',
    file: 'modify-listings.html',
    aliases: ['/_internal/modify-listings.html', '/modify-listings'],
    protected: true,
    adminOnly: true,
    cloudflareInternal: false,
    internalName: 'modify-listings-view',
    hasDynamicSegment: false
  },
  {
    path: '/_internal/message-curation',
    file: 'message-curation.html',
    aliases: ['/_internal/message-curation.html', '/message-curation'],
    protected: true,
    adminOnly: true,
    cloudflareInternal: false,
    internalName: 'message-curation-view',
    hasDynamicSegment: false
  },
  {
    path: '/_internal/usability-data-management',
    file: 'usability-data-management.html',
    aliases: ['/_internal/usability-data-management.html', '/usability-data-management'],
    protected: true,
    adminOnly: true,
    cloudflareInternal: false,
    internalName: 'usability-data-management-view',
    hasDynamicSegment: false
  },

  // ===== AI TOOLS (ADMIN INTERNAL) =====
  {
    path: '/_internal/ai-tools',
    file: 'ai-tools.html',
    aliases: ['/_internal/ai-tools.html', '/ai-tools'],
    protected: true,
    adminOnly: true,
    cloudflareInternal: false,
    internalName: 'ai-tools-view',
    hasDynamicSegment: false
  },

  // ===== EMERGENCY MANAGEMENT (ADMIN INTERNAL) =====
  {
    path: '/_internal/emergency',
    file: 'internal-emergency.html',
    aliases: ['/_internal/emergency.html', '/internal-emergency'],
    protected: true,
    adminOnly: true,
    cloudflareInternal: false,
    internalName: 'internal-emergency-view',
    hasDynamicSegment: false
  },

  // ===== ADMIN THREADS MANAGEMENT =====
  {
    path: '/_internal/admin-threads',
    file: 'admin-threads.html',
    aliases: ['/_internal/admin-threads.html', '/admin-threads'],
    protected: true,
    adminOnly: true,
    cloudflareInternal: false,
    internalName: 'admin-threads-view',
    hasDynamicSegment: false
  },

  // ===== MANAGE RENTAL APPLICATIONS (ADMIN INTERNAL) =====
  {
    path: '/_internal/manage-rental-applications',
    file: 'manage-rental-applications.html',
    aliases: ['/_internal/manage-rental-applications.html', '/manage-rental-applications'],
    protected: true,
    adminOnly: true,
    cloudflareInternal: false,
    internalName: 'manage-rental-applications-view',
    hasDynamicSegment: true,
    dynamicPattern: '/_internal/manage-rental-applications/:id'
  },

  // ===== CREATE DOCUMENT (ADMIN INTERNAL) =====
  {
    path: '/_internal/create-document',
    file: 'create-document.html',
    aliases: ['/_internal/create-document.html', '/create-document'],
    protected: true,
    adminOnly: true,
    cloudflareInternal: false,
    internalName: 'create-document-view',
    hasDynamicSegment: false
  },

  // ===== PROPOSAL MANAGEMENT (ADMIN INTERNAL) =====
  {
    path: '/_internal/proposal-manage',
    file: 'proposal-manage.html',
    aliases: ['/_internal/proposal-manage.html', '/proposal-manage'],
    protected: true,
    adminOnly: true,
    cloudflareInternal: false,
    internalName: 'proposal-manage-view',
    hasDynamicSegment: false
  },

  // ===== LISTINGS OVERVIEW (ADMIN INTERNAL) =====
  {
    path: '/_internal/listings-overview',
    file: 'listings-overview.html',
    aliases: ['/_internal/listings-overview.html', '/listings-overview'],
    protected: true,
    adminOnly: true,
    cloudflareInternal: false,
    internalName: 'listings-overview-view',
    hasDynamicSegment: false
  },

  // ===== EXPERIENCE RESPONSES (ADMIN INTERNAL) =====
  {
    path: '/_internal/experience-responses',
    file: 'experience-responses.html',
    aliases: ['/_internal/experience-responses.html', '/experience-responses'],
    protected: true,
    adminOnly: true,
    cloudflareInternal: false,
    internalName: 'experience-responses-view',
    hasDynamicSegment: false
  },

  // ===== GUEST EMERGENCY SUBMISSION (PUBLIC) =====
  {
    path: '/report-emergency',
    file: 'report-emergency.html',
    aliases: ['/report-emergency.html', '/emergency-form'],
    protected: false,
    cloudflareInternal: true,
    internalName: 'report-emergency-view',
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
