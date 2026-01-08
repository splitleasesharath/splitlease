/**
 * Navigation Utilities - Type-safe navigation functions
 *
 * Centralizes all navigation logic to prevent hardcoded URL strings scattered
 * throughout the codebase. Uses the Route Registry as the source of truth.
 *
 * @see ../routes.config.js for route definitions
 */

import { routes, getBasePath, findRouteForUrl } from '../routes.config.js';

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

/**
 * Route path templates
 */
const ROUTE_PATHS = Object.freeze({
  HOME: '/',
  SEARCH: '/search',
  VIEW_LISTING: '/view-split-lease',
  PREVIEW_LISTING: '/preview-split-lease',
  GUEST_PROPOSALS: '/guest-proposals',
  HOST_PROPOSALS: '/host-proposals',
  ACCOUNT_PROFILE: '/account-profile',
  SELF_LISTING: '/self-listing',
  LISTING_DASHBOARD: '/listing-dashboard',
  HOST_OVERVIEW: '/host-overview',
  FAVORITES: '/favorite-listings',
  RENTAL_APPLICATION: '/rental-application',
  HELP_CENTER: '/help-center',
  FAQ: '/faq',
  POLICIES: '/policies',
  LIST_WITH_US: '/list-with-us',
  ABOUT_US: '/about-us',
  CAREERS: '/careers',
  WHY_SPLIT_LEASE: '/why-split-lease',
  GUEST_SUCCESS: '/guest-success',
  HOST_SUCCESS: '/host-success'
})

/**
 * URL parameter names
 */
const URL_PARAMS = Object.freeze({
  DAYS_SELECTED: 'days-selected',
  RESERVATION_SPAN: 'reservation-span',
  MOVE_IN: 'move-in',
  PROPOSAL: 'proposal',
  BOROUGH: 'borough',
  PRICE_TIER: 'pricetier',
  SORT: 'sort',
  NEIGHBORHOODS: 'neighborhoods',
  LISTING_ID: 'listing_id'
})

const LOG_PREFIX = '[navigation]'

// ─────────────────────────────────────────────────────────────
// Validation Predicates (Pure Functions)
// ─────────────────────────────────────────────────────────────

/**
 * Check if value is a non-empty string
 * @pure
 */
const isNonEmptyString = (value) =>
  typeof value === 'string' && value.length > 0

/**
 * Check if array has elements
 * @pure
 */
const hasElements = (arr) =>
  Array.isArray(arr) && arr.length > 0

/**
 * Check if running in browser environment
 * @pure
 */
const isBrowserEnvironment = () =>
  typeof window !== 'undefined'

// ─────────────────────────────────────────────────────────────
// Pure URL Building Functions
// ─────────────────────────────────────────────────────────────

/**
 * Build URL with optional path segment
 * @pure
 */
const buildPathWithId = (basePath, id) =>
  id ? `${basePath}/${id}` : basePath

/**
 * Build URL with query string
 * @pure
 */
const buildUrlWithQuery = (path, queryString) =>
  queryString ? `${path}?${queryString}` : path

/**
 * Convert 0-indexed days to 1-indexed for URL
 * @pure
 */
const convertDaysToOneIndexed = (days) =>
  days.map(d => d + 1)

/**
 * Build search params from filters
 * @pure
 */
const buildSearchParams = (filters) => {
  const params = new URLSearchParams()

  if (hasElements(filters.daysSelected)) {
    params.set(URL_PARAMS.DAYS_SELECTED, filters.daysSelected.join(','))
  }
  if (filters.borough) params.set(URL_PARAMS.BOROUGH, filters.borough)
  if (filters.priceTier) params.set(URL_PARAMS.PRICE_TIER, filters.priceTier)
  if (filters.sort) params.set(URL_PARAMS.SORT, filters.sort)
  if (hasElements(filters.neighborhoods)) {
    params.set(URL_PARAMS.NEIGHBORHOODS, filters.neighborhoods.join(','))
  }

  return params.toString()
}

// ─────────────────────────────────────────────────────────────
// Navigation Functions (Effectful)
// ─────────────────────────────────────────────────────────────

/**
 * Navigate to a listing detail page
 * @effectful - modifies browser location
 * @param {string} listingId - The listing ID
 * @param {Object} options - Optional parameters
 * @param {boolean} options.newTab - Open in new tab
 */
export function goToListing(listingId, options = {}) {
  if (!isNonEmptyString(listingId)) {
    console.error(`${LOG_PREFIX} goToListing: listingId is required`);
    return;
  }

  const url = buildPathWithId(ROUTE_PATHS.VIEW_LISTING, listingId);

  if (options.newTab) {
    window.open(url, '_blank');
  } else {
    window.location.href = url;
  }
}

/**
 * Get the URL for a listing (without navigating)
 * @pure
 * @param {string} listingId - The listing ID
 * @returns {string} The listing URL
 */
export function getListingUrl(listingId) {
  return buildPathWithId(ROUTE_PATHS.VIEW_LISTING, listingId);
}

/**
 * Build proposal context params
 * @pure
 */
const buildProposalContextParams = (proposalContext) => {
  const params = new URLSearchParams()

  if (hasElements(proposalContext.daysSelected)) {
    const oneBasedDays = convertDaysToOneIndexed(proposalContext.daysSelected)
    params.set(URL_PARAMS.DAYS_SELECTED, oneBasedDays.join(','))
  }

  if (proposalContext.reservationSpan) {
    params.set(URL_PARAMS.RESERVATION_SPAN, proposalContext.reservationSpan.toString())
  }

  if (proposalContext.moveInDate) {
    params.set(URL_PARAMS.MOVE_IN, proposalContext.moveInDate)
  }

  return params.toString()
}

/**
 * Get the URL for a listing with proposal context preserved
 * Used when navigating from proposals page to view the listing with the same scheduling context.
 * @pure
 * @param {string} listingId - The listing ID
 * @param {Object} proposalContext - Proposal scheduling context
 * @param {number[]} proposalContext.daysSelected - Selected days (0-indexed, 0=Sunday through 6=Saturday)
 * @param {number} proposalContext.reservationSpan - Reservation span in weeks
 * @param {string} [proposalContext.moveInDate] - Move-in date (YYYY-MM-DD format)
 * @returns {string} The listing URL with context parameters
 */
export function getListingUrlWithProposalContext(listingId, proposalContext = {}) {
  if (!isNonEmptyString(listingId)) return ROUTE_PATHS.VIEW_LISTING;

  const basePath = buildPathWithId(ROUTE_PATHS.VIEW_LISTING, listingId)
  const queryString = buildProposalContextParams(proposalContext)

  return buildUrlWithQuery(basePath, queryString)
}

/**
 * Navigate to guest proposals page
 * @effectful - modifies browser location
 * @param {string} userId - Optional user ID
 * @param {string} proposalId - Optional proposal ID to highlight
 */
export function goToProposals(userId, proposalId) {
  const basePath = buildPathWithId(ROUTE_PATHS.GUEST_PROPOSALS, userId)
  const url = proposalId
    ? buildUrlWithQuery(basePath, `${URL_PARAMS.PROPOSAL}=${proposalId}`)
    : basePath
  window.location.href = url;
}

/**
 * Navigate to search page with optional filters
 * @effectful - modifies browser location
 * @param {Object} filters - Optional search filters
 * @param {number[]} filters.daysSelected - Selected days (0-based)
 * @param {string} filters.borough - Borough filter
 * @param {string} filters.priceTier - Price tier filter
 * @param {string} filters.sort - Sort option
 * @param {string[]} filters.neighborhoods - Neighborhood IDs
 */
export function goToSearch(filters = {}) {
  const queryString = buildSearchParams(filters)
  window.location.href = buildUrlWithQuery(ROUTE_PATHS.SEARCH, queryString);
}

/**
 * Get the search URL with filters (without navigating)
 * @pure
 * @param {Object} filters - Search filters
 * @returns {string} The search URL
 */
export function getSearchUrl(filters = {}) {
  const queryString = buildSearchParams(filters)
  return buildUrlWithQuery(ROUTE_PATHS.SEARCH, queryString)
}

/**
 * Navigate to account profile
 * @effectful - modifies browser location
 * @param {string} userId - The user ID
 */
export function goToProfile(userId) {
  if (!isNonEmptyString(userId)) {
    console.error(`${LOG_PREFIX} goToProfile: userId is required`);
    return;
  }
  window.location.href = buildPathWithId(ROUTE_PATHS.ACCOUNT_PROFILE, userId);
}

/**
 * Navigate to self-listing (create/edit listing)
 * @effectful - modifies browser location
 * @param {string} listingId - Optional listing ID for editing
 */
export function goToSelfListing(listingId) {
  const url = listingId
    ? buildUrlWithQuery(ROUTE_PATHS.SELF_LISTING, `${URL_PARAMS.LISTING_ID}=${listingId}`)
    : ROUTE_PATHS.SELF_LISTING
  window.location.href = url;
}

/**
 * Navigate to help center
 * @effectful - modifies browser location
 * @param {string} category - Optional category (guests, hosts, etc.)
 */
export function goToHelpCenter(category) {
  window.location.href = buildPathWithId(ROUTE_PATHS.HELP_CENTER, category);
}

/**
 * Navigate to listing dashboard
 * @effectful - modifies browser location
 * @param {string} listingId - Optional listing ID
 */
export function goToListingDashboard(listingId) {
  const url = listingId
    ? buildUrlWithQuery(ROUTE_PATHS.LISTING_DASHBOARD, `${URL_PARAMS.LISTING_ID}=${listingId}`)
    : ROUTE_PATHS.LISTING_DASHBOARD
  window.location.href = url;
}

/**
 * Navigate to host overview
 * @effectful - modifies browser location
 */
export function goToHostOverview() {
  window.location.href = ROUTE_PATHS.HOST_OVERVIEW;
}

/**
 * Navigate to favorite listings
 * @effectful - modifies browser location
 */
export function goToFavorites() {
  window.location.href = ROUTE_PATHS.FAVORITES;
}

/**
 * Navigate to rental application
 * @effectful - modifies browser location
 * @param {string} proposalId - Optional proposal ID
 */
export function goToRentalApplication(proposalId) {
  const url = proposalId
    ? buildUrlWithQuery(ROUTE_PATHS.RENTAL_APPLICATION, `${URL_PARAMS.PROPOSAL}=${proposalId}`)
    : ROUTE_PATHS.RENTAL_APPLICATION
  window.location.href = url;
}

/**
 * Navigate to FAQ page
 * @effectful - modifies browser location
 */
export function goToFaq() {
  window.location.href = ROUTE_PATHS.FAQ;
}

/**
 * Navigate to policies page
 * @effectful - modifies browser location
 */
export function goToPolicies() {
  window.location.href = ROUTE_PATHS.POLICIES;
}

/**
 * Navigate to list with us page
 * @effectful - modifies browser location
 */
export function goToListWithUs() {
  window.location.href = ROUTE_PATHS.LIST_WITH_US;
}

/**
 * Navigate to about us page
 * @effectful - modifies browser location
 */
export function goToAboutUs() {
  window.location.href = ROUTE_PATHS.ABOUT_US;
}

/**
 * Navigate to careers page
 * @effectful - modifies browser location
 */
export function goToCareers() {
  window.location.href = ROUTE_PATHS.CAREERS;
}

/**
 * Navigate to why split lease page
 * @effectful - modifies browser location
 */
export function goToWhySplitLease() {
  window.location.href = ROUTE_PATHS.WHY_SPLIT_LEASE;
}

/**
 * Navigate to homepage
 * @effectful - modifies browser location
 */
export function goToHome() {
  window.location.href = ROUTE_PATHS.HOME;
}

/**
 * Navigate to guest success page
 * @effectful - modifies browser location
 */
export function goToGuestSuccess() {
  window.location.href = ROUTE_PATHS.GUEST_SUCCESS;
}

/**
 * Navigate to host success page
 * @effectful - modifies browser location
 */
export function goToHostSuccess() {
  window.location.href = ROUTE_PATHS.HOST_SUCCESS;
}

// ─────────────────────────────────────────────────────────────
// Route Query Functions
// ─────────────────────────────────────────────────────────────

/**
 * Check if a route exists in the registry
 * @pure
 * @param {string} path - The path to check
 * @returns {boolean}
 */
export function routeExists(path) {
  return findRouteForUrl(path) !== null;
}

/**
 * Get route info by path
 * @pure
 * @param {string} path - The path to look up
 * @returns {Object|null} Route configuration or null
 */
export function getRouteInfo(path) {
  return findRouteForUrl(path);
}

/**
 * Check if current page requires authentication
 * @effectful - reads window.location
 * @returns {boolean}
 */
export function isProtectedPage() {
  if (!isBrowserEnvironment()) return false;
  const route = findRouteForUrl(window.location.pathname);
  return route ? route.protected : false;
}

/**
 * Get all protected routes
 * @pure
 * @returns {Object[]} Array of protected route configurations
 */
export function getProtectedRoutes() {
  return routes.filter(r => r.protected);
}

/**
 * Get all public routes
 * @pure
 * @returns {Object[]} Array of public route configurations
 */
export function getPublicRoutes() {
  return routes.filter(r => !r.protected);
}

// ─────────────────────────────────────────────────────────────
// Exported Constants (for testing)
// ─────────────────────────────────────────────────────────────
export {
  ROUTE_PATHS,
  URL_PARAMS,
  LOG_PREFIX
}

// Export route registry for direct access if needed
export { routes, getBasePath, findRouteForUrl };
