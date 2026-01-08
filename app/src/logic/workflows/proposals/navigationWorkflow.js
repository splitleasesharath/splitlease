/**
 * Navigation Workflow Module
 *
 * PILLAR IV: Workflow Orchestrators (The "Flow" Layer)
 *
 * Handles navigation actions for the guest proposals page.
 * Maps to Bubble.io navigation workflows.
 *
 * Note: Navigation functions are effectful by nature (modify browser state).
 * URL building helpers are pure.
 */

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const ROUTES = Object.freeze({
  VIEW_LISTING: '/view-split-lease',
  MESSAGES: '/messages',
  RENTAL_APPLICATION: '/rental-app-new-design',
  DOCUMENT_REVIEW: '/review-documents',
  LEASE_DOCUMENTS: '/leases',
  HOUSE_MANUAL: '/house-manual',
  SEARCH: '/search'
})

const QUERY_PARAMS = Object.freeze({
  PROPOSAL: 'proposal',
  RECIPIENT: 'recipient'
})

const LOG_PREFIX = '[navigationWorkflow]'

const EXTERNAL_LINK_OPTIONS = 'noopener,noreferrer'
const EXTERNAL_LINK_TARGET = '_blank'

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
 * Check if value is truthy
 * @pure
 */
const isTruthy = (value) => Boolean(value)

// ─────────────────────────────────────────────────────────────
// URL Building Helpers (Pure Functions)
// ─────────────────────────────────────────────────────────────

/**
 * Extract listing ID from proposal
 * @pure
 */
const extractListingId = (proposal) =>
  proposal?.listing?.id || proposal?.listingId || proposal?.Listing || null

/**
 * Build URL with path parameter
 * @pure
 */
const buildPathUrl = (basePath, pathParam) =>
  `${basePath}/${pathParam}`

/**
 * Build URL with query parameter
 * @pure
 */
const buildQueryUrl = (basePath, queryKey, queryValue) =>
  `${basePath}?${queryKey}=${queryValue}`

/**
 * Build messaging URL with optional parameters
 * @pure
 */
const buildMessagingUrl = (hostId, proposalId) => {
  const params = new URLSearchParams()

  if (isNonEmptyString(hostId)) {
    params.append(QUERY_PARAMS.RECIPIENT, hostId)
  }
  if (isNonEmptyString(proposalId)) {
    params.append(QUERY_PARAMS.PROPOSAL, proposalId)
  }

  const queryString = params.toString()
  return queryString
    ? `${ROUTES.MESSAGES}?${queryString}`
    : ROUTES.MESSAGES
}

// ─────────────────────────────────────────────────────────────
// Navigation Functions (Effectful - modify browser state)
// ─────────────────────────────────────────────────────────────

/**
 * Navigate to view listing page
 * @effectful - modifies browser location
 *
 * @param {Object} proposal - Proposal object
 */
export function navigateToListing(proposal) {
  const listingId = extractListingId(proposal)

  if (!isNonEmptyString(listingId)) {
    console.error(`${LOG_PREFIX} No listing ID found for navigation`)
    return
  }

  const url = buildPathUrl(ROUTES.VIEW_LISTING, listingId)
  console.log(`${LOG_PREFIX} Navigating to listing:`, url)
  window.location.href = url
}

/**
 * Navigate to messaging page with host
 * @effectful - modifies browser location
 *
 * @param {string} hostId - Host user ID
 * @param {string} proposalId - Proposal ID for context
 */
export function navigateToMessaging(hostId, proposalId) {
  if (!isNonEmptyString(hostId)) {
    console.error(`${LOG_PREFIX} No host ID found for messaging`)
    return
  }

  const url = buildMessagingUrl(hostId, proposalId)
  console.log(`${LOG_PREFIX} Navigating to messaging:`, url)
  window.location.href = url
}

/**
 * Navigate to rental application page
 * @effectful - modifies browser location
 *
 * @param {string} proposalId - Proposal ID
 */
export function navigateToRentalApplication(proposalId) {
  if (!isNonEmptyString(proposalId)) {
    console.error(`${LOG_PREFIX} No proposal ID found for rental application`)
    return
  }

  const url = buildQueryUrl(ROUTES.RENTAL_APPLICATION, QUERY_PARAMS.PROPOSAL, proposalId)
  console.log(`${LOG_PREFIX} Navigating to rental application:`, url)
  window.location.href = url
}

/**
 * Navigate to document review page
 * @effectful - modifies browser location
 *
 * @param {string} proposalId - Proposal ID
 */
export function navigateToDocumentReview(proposalId) {
  if (!isNonEmptyString(proposalId)) {
    console.error(`${LOG_PREFIX} No proposal ID found for document review`)
    return
  }

  const url = buildQueryUrl(ROUTES.DOCUMENT_REVIEW, QUERY_PARAMS.PROPOSAL, proposalId)
  console.log(`${LOG_PREFIX} Navigating to document review:`, url)
  window.location.href = url
}

/**
 * Navigate to lease documents page
 * @effectful - modifies browser location
 *
 * @param {string} proposalId - Proposal ID
 */
export function navigateToLeaseDocuments(proposalId) {
  if (!isNonEmptyString(proposalId)) {
    console.error(`${LOG_PREFIX} No proposal ID found for lease documents`)
    return
  }

  const url = buildQueryUrl(ROUTES.LEASE_DOCUMENTS, QUERY_PARAMS.PROPOSAL, proposalId)
  console.log(`${LOG_PREFIX} Navigating to lease documents:`, url)
  window.location.href = url
}

/**
 * Navigate to house manual page
 * @effectful - modifies browser location
 *
 * @param {string} listingId - Listing ID
 */
export function navigateToHouseManual(listingId) {
  if (!isNonEmptyString(listingId)) {
    console.error(`${LOG_PREFIX} No listing ID found for house manual`)
    return
  }

  const url = buildPathUrl(ROUTES.HOUSE_MANUAL, listingId)
  console.log(`${LOG_PREFIX} Navigating to house manual:`, url)
  window.location.href = url
}

/**
 * Navigate to search page
 * @effectful - modifies browser location
 */
export function navigateToSearch() {
  console.log(`${LOG_PREFIX} Navigating to search:`, ROUTES.SEARCH)
  window.location.href = ROUTES.SEARCH
}

/**
 * Open external link in new tab
 * @effectful - opens new browser window
 *
 * @param {string} url - URL to open
 */
export function openExternalLink(url) {
  if (!isNonEmptyString(url)) {
    console.error(`${LOG_PREFIX} No URL provided for external link`)
    return
  }

  console.log(`${LOG_PREFIX} Opening external link:`, url)
  window.open(url, EXTERNAL_LINK_TARGET, EXTERNAL_LINK_OPTIONS)
}

/**
 * Update URL with proposal ID without page reload
 * @effectful - modifies browser history
 *
 * @param {string} proposalId - Proposal ID to add to URL
 */
export function updateUrlWithProposal(proposalId) {
  if (!isNonEmptyString(proposalId)) {
    return
  }

  const url = new URL(window.location.href)
  url.searchParams.set(QUERY_PARAMS.PROPOSAL, proposalId)

  window.history.replaceState({}, '', url.toString())
  console.log(`${LOG_PREFIX} URL updated with proposal:`, proposalId)
}

/**
 * Get proposal ID from URL query parameter
 * @effectful - reads browser location
 *
 * @returns {string|null} Proposal ID or null
 */
export function getProposalIdFromUrl() {
  const url = new URL(window.location.href)
  return url.searchParams.get(QUERY_PARAMS.PROPOSAL)
}

// ─────────────────────────────────────────────────────────────
// Exported Constants (for testing)
// ─────────────────────────────────────────────────────────────
export { ROUTES, QUERY_PARAMS, LOG_PREFIX }
