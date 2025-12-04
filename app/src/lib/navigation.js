/**
 * Navigation Utilities - Type-safe navigation functions
 *
 * Centralizes all navigation logic to prevent hardcoded URL strings scattered
 * throughout the codebase. Uses the Route Registry as the source of truth.
 *
 * @see ../routes.config.js for route definitions
 */

import { routes, getBasePath, findRouteForUrl } from '../routes.config.js';

/**
 * Navigate to a listing detail page
 * @param {string} listingId - The listing ID
 * @param {Object} options - Optional parameters
 * @param {boolean} options.newTab - Open in new tab
 */
export function goToListing(listingId, options = {}) {
  if (!listingId) {
    console.error('goToListing: listingId is required');
    return;
  }

  const url = `/view-split-lease/${listingId}`;

  if (options.newTab) {
    window.open(url, '_blank');
  } else {
    window.location.href = url;
  }
}

/**
 * Get the URL for a listing (without navigating)
 * @param {string} listingId - The listing ID
 * @returns {string} The listing URL
 */
export function getListingUrl(listingId) {
  if (!listingId) return '/view-split-lease';
  return `/view-split-lease/${listingId}`;
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
 * @param {number[]} filters.daysSelected - Selected days (0-based)
 * @param {string} filters.borough - Borough filter
 * @param {string} filters.priceTier - Price tier filter
 * @param {string} filters.sort - Sort option
 * @param {string[]} filters.neighborhoods - Neighborhood IDs
 */
export function goToSearch(filters = {}) {
  const params = new URLSearchParams();

  if (filters.daysSelected && filters.daysSelected.length > 0) {
    params.set('days-selected', filters.daysSelected.join(','));
  }
  if (filters.borough) params.set('borough', filters.borough);
  if (filters.priceTier) params.set('pricetier', filters.priceTier);
  if (filters.sort) params.set('sort', filters.sort);
  if (filters.neighborhoods && filters.neighborhoods.length > 0) {
    params.set('neighborhoods', filters.neighborhoods.join(','));
  }

  const queryString = params.toString();
  window.location.href = `/search${queryString ? '?' + queryString : ''}`;
}

/**
 * Get the search URL with filters (without navigating)
 * @param {Object} filters - Search filters
 * @returns {string} The search URL
 */
export function getSearchUrl(filters = {}) {
  const params = new URLSearchParams();

  if (filters.daysSelected && filters.daysSelected.length > 0) {
    params.set('days-selected', filters.daysSelected.join(','));
  }
  if (filters.borough) params.set('borough', filters.borough);
  if (filters.priceTier) params.set('pricetier', filters.priceTier);
  if (filters.sort) params.set('sort', filters.sort);

  const queryString = params.toString();
  return `/search${queryString ? '?' + queryString : ''}`;
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
 * Navigate to host overview
 */
export function goToHostOverview() {
  window.location.href = '/host-overview';
}

/**
 * Navigate to favorite listings
 */
export function goToFavorites() {
  window.location.href = '/favorite-listings';
}

/**
 * Navigate to rental application
 * @param {string} proposalId - Optional proposal ID
 */
export function goToRentalApplication(proposalId) {
  if (proposalId) {
    window.location.href = `/rental-application?proposal=${proposalId}`;
  } else {
    window.location.href = '/rental-application';
  }
}

/**
 * Navigate to FAQ page
 */
export function goToFaq() {
  window.location.href = '/faq';
}

/**
 * Navigate to policies page
 */
export function goToPolicies() {
  window.location.href = '/policies';
}

/**
 * Navigate to list with us page
 */
export function goToListWithUs() {
  window.location.href = '/list-with-us';
}

/**
 * Navigate to about us page
 */
export function goToAboutUs() {
  window.location.href = '/about-us';
}

/**
 * Navigate to careers page
 */
export function goToCareers() {
  window.location.href = '/careers';
}

/**
 * Navigate to why split lease page
 */
export function goToWhySplitLease() {
  window.location.href = '/why-split-lease';
}

/**
 * Navigate to homepage
 */
export function goToHome() {
  window.location.href = '/';
}

/**
 * Navigate to guest success page
 */
export function goToGuestSuccess() {
  window.location.href = '/guest-success';
}

/**
 * Navigate to host success page
 */
export function goToHostSuccess() {
  window.location.href = '/host-success';
}

/**
 * Check if a route exists in the registry
 * @param {string} path - The path to check
 * @returns {boolean}
 */
export function routeExists(path) {
  return findRouteForUrl(path) !== null;
}

/**
 * Get route info by path
 * @param {string} path - The path to look up
 * @returns {Object|null} Route configuration or null
 */
export function getRouteInfo(path) {
  return findRouteForUrl(path);
}

/**
 * Check if current page requires authentication
 * @returns {boolean}
 */
export function isProtectedPage() {
  const route = findRouteForUrl(window.location.pathname);
  return route ? route.protected : false;
}

/**
 * Get all protected routes
 * @returns {Object[]} Array of protected route configurations
 */
export function getProtectedRoutes() {
  return routes.filter(r => r.protected);
}

/**
 * Get all public routes
 * @returns {Object[]} Array of public route configurations
 */
export function getPublicRoutes() {
  return routes.filter(r => !r.protected);
}

// Export route registry for direct access if needed
export { routes, getBasePath, findRouteForUrl };
