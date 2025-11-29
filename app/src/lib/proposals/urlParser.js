/**
 * URL Parser Utilities for Guest Proposals Page
 * Handles URL-based routing for user-centric proposal flow
 *
 * Supported patterns:
 * - /guest-proposals/{USER_ID}
 * - /guest-proposals/{USER_ID}?proposal={PROPOSAL_ID}
 */

/**
 * Extract user ID from URL path
 * Supports: /guest-proposals/{userId}
 *
 * @returns {string|null} User ID or null if not found
 */
export function getUserIdFromPath() {
  const pathSegments = window.location.pathname.split('/').filter(Boolean);

  // Find 'guest-proposals' segment index
  const pageIndex = pathSegments.findIndex(seg =>
    seg === 'guest-proposals' || seg === 'guest-proposals.html'
  );

  // Next segment should be user ID
  if (pageIndex !== -1 && pathSegments[pageIndex + 1]) {
    const userId = pathSegments[pageIndex + 1];
    console.log('getUserIdFromPath: Extracted user ID from path:', userId);
    return userId;
  }

  // Fallback: Check query parameter
  const urlParams = new URLSearchParams(window.location.search);
  const userParam = urlParams.get('user');

  if (userParam) {
    console.log('getUserIdFromPath: Extracted user ID from query param:', userParam);
    return userParam;
  }

  console.error('getUserIdFromPath: No user ID found in URL');
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
 *
 * @param {string} userId - The current user ID
 * @param {string} proposalId - The selected proposal ID
 */
export function updateUrlWithProposal(userId, proposalId) {
  const newUrl = `/guest-proposals/${userId}?proposal=${proposalId}`;
  window.history.pushState({}, '', newUrl);
  console.log('updateUrlWithProposal: Updated URL to:', newUrl);
}

/**
 * Parse complete URL parameters for proposal page
 *
 * @returns {{userId: string|null, proposalId: string|null}} Object with userId and proposalId
 */
export function parseProposalPageUrl() {
  return {
    userId: getUserIdFromPath(),
    proposalId: getProposalIdFromQuery()
  };
}
