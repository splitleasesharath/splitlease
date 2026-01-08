/**
 * URL Parser Utilities for Guest Proposals Page
 *
 * The guest-proposals page uses authenticated session to identify user.
 * User ID is NOT extracted from URL - it comes from secure storage.
 *
 * Supported patterns:
 * - /guest-proposals
 * - /guest-proposals?proposal={PROPOSAL_ID}
 *
 * Legacy patterns (redirected to clean URL):
 * - /guest-proposals/{USER_ID} → /guest-proposals
 * - /guest-proposals?user={USER_ID} → /guest-proposals
 *
 * @module lib/proposals/urlParser
 */

import { getSessionId } from '../secureStorage.js';

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const LOG_PREFIX = '[urlParser]'

const PATHS = Object.freeze({
  GUEST_PROPOSALS: '/guest-proposals',
  GUEST_PROPOSALS_HTML: 'guest-proposals.html'
})

const QUERY_PARAMS = Object.freeze({
  PROPOSAL: 'proposal',
  USER: 'user'
})

// ─────────────────────────────────────────────────────────────
// Validation Predicates (Pure Functions)
// ─────────────────────────────────────────────────────────────

/**
 * Check if segment matches guest-proposals page
 * @pure
 */
const isGuestProposalsSegment = (segment) =>
  segment === 'guest-proposals' || segment === PATHS.GUEST_PROPOSALS_HTML

/**
 * Check if value is a non-empty string
 * @pure
 */
const isNonEmptyString = (value) =>
  typeof value === 'string' && value.length > 0

// ─────────────────────────────────────────────────────────────
// Pure URL Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Get path segments from pathname
 * @pure
 */
const getPathSegments = (pathname) =>
  pathname.split('/').filter(Boolean)

/**
 * Find index of guest-proposals segment
 * @pure
 */
const findPageIndex = (segments) =>
  segments.findIndex(isGuestProposalsSegment)

/**
 * Check if path has user ID after page segment
 * @pure
 */
const hasUserIdInPath = (segments, pageIndex) =>
  pageIndex !== -1 && isNonEmptyString(segments[pageIndex + 1])

/**
 * Build clean URL with optional proposal param
 * @pure
 */
const buildCleanUrl = (proposalId) => {
  if (proposalId) {
    return `${PATHS.GUEST_PROPOSALS}?${QUERY_PARAMS.PROPOSAL}=${proposalId}`
  }
  return PATHS.GUEST_PROPOSALS
}

// ─────────────────────────────────────────────────────────────
// Logging Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Log info message
 * @effectful
 */
const logInfo = (message, data) => {
  if (data !== undefined) {
    console.log(`${LOG_PREFIX} ${message}:`, data)
  } else {
    console.log(`${LOG_PREFIX} ${message}`)
  }
}

// ─────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────

/**
 * Check if URL contains legacy user ID patterns and clean them
 * Redirects to clean URL if legacy patterns detected
 * @effectful
 * @returns {boolean} True if redirect was triggered, false otherwise
 */
export function cleanLegacyUserIdFromUrl() {
  const pathSegments = getPathSegments(window.location.pathname)
  const urlParams = new URLSearchParams(window.location.search)

  const pageIndex = findPageIndex(pathSegments)

  let needsRedirect = false

  // Check for user ID in path (legacy pattern)
  if (hasUserIdInPath(pathSegments, pageIndex)) {
    logInfo('Found legacy user ID in path, will redirect')
    needsRedirect = true
  }

  // Check for user query param (legacy pattern)
  if (urlParams.has(QUERY_PARAMS.USER)) {
    logInfo('Found legacy user query param, will redirect')
    needsRedirect = true
  }

  // Redirect if legacy patterns detected
  if (needsRedirect) {
    const proposalId = urlParams.get(QUERY_PARAMS.PROPOSAL)
    const cleanUrl = buildCleanUrl(proposalId)
    logInfo('Redirecting to clean URL', cleanUrl)
    window.history.replaceState({}, '', cleanUrl)
    return true
  }

  return false
}

/**
 * Get user ID from authenticated session
 * User ID comes from secure storage, NOT from URL
 * @effectful (reads from storage)
 * @returns {string|null} User ID from session or null if not authenticated
 */
export function getUserIdFromSession() {
  const userId = getSessionId()

  if (userId) {
    logInfo('Got user ID from session')
    return userId
  }

  logInfo('No user ID in session (not authenticated)')
  return null
}

/**
 * Extract preselected proposal ID from query params
 * @effectful (reads from window.location)
 * @returns {string|null} Proposal ID or null if not found
 */
export function getProposalIdFromQuery() {
  const urlParams = new URLSearchParams(window.location.search)
  const proposalId = urlParams.get(QUERY_PARAMS.PROPOSAL)

  if (proposalId) {
    logInfo('Extracted proposal ID from query', proposalId)
  }

  return proposalId
}

/**
 * Update URL with selected proposal (without page reload)
 * Uses History API to update URL without triggering navigation
 * User ID is NOT included in URL - only proposal ID as query param
 * @effectful
 * @param {string} proposalId - The selected proposal ID
 */
export function updateUrlWithProposal(proposalId) {
  const newUrl = buildCleanUrl(proposalId)
  window.history.pushState({}, '', newUrl)
  logInfo('Updated URL to', newUrl)
}

/**
 * Parse complete URL parameters for proposal page
 * User ID comes from session, NOT from URL
 * @effectful
 * @returns {{userId: string|null, proposalId: string|null}} Object with userId (from session) and proposalId (from URL)
 */
export function parseProposalPageUrl() {
  // Clean legacy URL patterns first
  cleanLegacyUserIdFromUrl()

  return Object.freeze({
    userId: getUserIdFromSession(),
    proposalId: getProposalIdFromQuery()
  })
}

// ─────────────────────────────────────────────────────────────
// Exported Constants (for testing)
// ─────────────────────────────────────────────────────────────
export {
  LOG_PREFIX,
  PATHS,
  QUERY_PARAMS
}
