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
 */

import { getSessionId } from '../secureStorage.js';

/**
 * Check if URL contains legacy user ID patterns and clean them
 * Redirects to clean URL if legacy patterns detected
 *
 * @returns {boolean} True if redirect was triggered, false otherwise
 */
export function cleanLegacyUserIdFromUrl() {
  const pathSegments = window.location.pathname.split('/').filter(Boolean);
  const urlParams = new URLSearchParams(window.location.search);

  // Find 'guest-proposals' segment index
  const pageIndex = pathSegments.findIndex(seg =>
    seg === 'guest-proposals' || seg === 'guest-proposals.html'
  );

  let needsRedirect = false;
  let cleanPath = '/guest-proposals';
  const cleanParams = new URLSearchParams();

  // Check for user ID in path (legacy pattern)
  if (pageIndex !== -1 && pathSegments[pageIndex + 1]) {
    console.log('cleanLegacyUserIdFromUrl: Found legacy user ID in path, will redirect');
    needsRedirect = true;
  }

  // Check for user query param (legacy pattern)
  if (urlParams.has('user')) {
    console.log('cleanLegacyUserIdFromUrl: Found legacy user query param, will redirect');
    needsRedirect = true;
  }

  // Preserve proposal query param if present
  const proposalId = urlParams.get('proposal');
  if (proposalId) {
    cleanParams.set('proposal', proposalId);
  }

  // Redirect if legacy patterns detected
  if (needsRedirect) {
    const cleanUrl = cleanParams.toString()
      ? `${cleanPath}?${cleanParams.toString()}`
      : cleanPath;
    console.log('cleanLegacyUserIdFromUrl: Redirecting to clean URL:', cleanUrl);
    window.history.replaceState({}, '', cleanUrl);
    return true;
  }

  return false;
}

/**
 * Get user ID from authenticated session
 * User ID comes from secure storage, NOT from URL
 *
 * @returns {string|null} User ID from session or null if not authenticated
 */
export function getUserIdFromSession() {
  const userId = getSessionId();

  if (userId) {
    console.log('getUserIdFromSession: Got user ID from session');
    return userId;
  }

  console.log('getUserIdFromSession: No user ID in session (not authenticated)');
  return null;
}

/**
 * Extract preselected proposal ID from query params
 *
 * @returns {string|null} Proposal ID or null if not found
 */
export function getProposalIdFromQuery() {
  const urlParams = new URLSearchParams(window.location.search);
  const proposalId = urlParams.get('proposal');

  if (proposalId) {
    console.log('getProposalIdFromQuery: Extracted proposal ID from query:', proposalId);
  }

  return proposalId;
}

/**
 * Update URL with selected proposal (without page reload)
 * Uses History API to update URL without triggering navigation
 * User ID is NOT included in URL - only proposal ID as query param
 *
 * @param {string} proposalId - The selected proposal ID
 */
export function updateUrlWithProposal(proposalId) {
  const newUrl = `/guest-proposals?proposal=${proposalId}`;
  window.history.pushState({}, '', newUrl);
  console.log('updateUrlWithProposal: Updated URL to:', newUrl);
}

/**
 * Parse complete URL parameters for proposal page
 * User ID comes from session, NOT from URL
 *
 * @returns {{userId: string|null, proposalId: string|null}} Object with userId (from session) and proposalId (from URL)
 */
export function parseProposalPageUrl() {
  // Clean legacy URL patterns first
  cleanLegacyUserIdFromUrl();

  return {
    userId: getUserIdFromSession(),
    proposalId: getProposalIdFromQuery()
  };
}
