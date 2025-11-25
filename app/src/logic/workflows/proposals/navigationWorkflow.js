/**
 * Navigation Workflow Module
 *
 * PILLAR IV: Workflow Orchestrators (The "Flow" Layer)
 *
 * Handles navigation actions for the guest proposals page.
 * Maps to Bubble.io navigation workflows.
 */

/**
 * Navigate to view listing page
 *
 * @param {Object} proposal - Proposal object
 */
export function navigateToListing(proposal) {
  if (!proposal?.listing?.id && !proposal?.listingId && !proposal?.Listing) {
    console.error('[navigationWorkflow] No listing ID found for navigation');
    return;
  }

  const listingId = proposal.listing?.id || proposal.listingId || proposal.Listing;
  const url = `/view-split-lease/${listingId}`;

  console.log('[navigationWorkflow] Navigating to listing:', url);
  window.location.href = url;
}

/**
 * Navigate to messaging page with host
 *
 * @param {string} hostId - Host user ID
 * @param {string} proposalId - Proposal ID for context
 */
export function navigateToMessaging(hostId, proposalId) {
  if (!hostId) {
    console.error('[navigationWorkflow] No host ID found for messaging');
    return;
  }

  // Build messaging URL with context
  let url = `/messaging`;
  const params = new URLSearchParams();

  if (hostId) {
    params.append('recipient', hostId);
  }
  if (proposalId) {
    params.append('proposal', proposalId);
  }

  if (params.toString()) {
    url += `?${params.toString()}`;
  }

  console.log('[navigationWorkflow] Navigating to messaging:', url);
  window.location.href = url;
}

/**
 * Navigate to rental application page
 *
 * @param {string} proposalId - Proposal ID
 */
export function navigateToRentalApplication(proposalId) {
  if (!proposalId) {
    console.error('[navigationWorkflow] No proposal ID found for rental application');
    return;
  }

  const url = `/rental-app-new-design?proposal=${proposalId}`;

  console.log('[navigationWorkflow] Navigating to rental application:', url);
  window.location.href = url;
}

/**
 * Navigate to document review page
 *
 * @param {string} proposalId - Proposal ID
 */
export function navigateToDocumentReview(proposalId) {
  if (!proposalId) {
    console.error('[navigationWorkflow] No proposal ID found for document review');
    return;
  }

  const url = `/review-documents?proposal=${proposalId}`;

  console.log('[navigationWorkflow] Navigating to document review:', url);
  window.location.href = url;
}

/**
 * Navigate to lease documents page
 *
 * @param {string} proposalId - Proposal ID
 */
export function navigateToLeaseDocuments(proposalId) {
  if (!proposalId) {
    console.error('[navigationWorkflow] No proposal ID found for lease documents');
    return;
  }

  const url = `/leases?proposal=${proposalId}`;

  console.log('[navigationWorkflow] Navigating to lease documents:', url);
  window.location.href = url;
}

/**
 * Navigate to house manual page
 *
 * @param {string} listingId - Listing ID
 */
export function navigateToHouseManual(listingId) {
  if (!listingId) {
    console.error('[navigationWorkflow] No listing ID found for house manual');
    return;
  }

  const url = `/house-manual/${listingId}`;

  console.log('[navigationWorkflow] Navigating to house manual:', url);
  window.location.href = url;
}

/**
 * Navigate to search page
 */
export function navigateToSearch() {
  const url = '/search';
  console.log('[navigationWorkflow] Navigating to search:', url);
  window.location.href = url;
}

/**
 * Open external link in new tab
 *
 * @param {string} url - URL to open
 */
export function openExternalLink(url) {
  if (!url) {
    console.error('[navigationWorkflow] No URL provided for external link');
    return;
  }

  console.log('[navigationWorkflow] Opening external link:', url);
  window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * Update URL with proposal ID without page reload
 *
 * @param {string} proposalId - Proposal ID to add to URL
 */
export function updateUrlWithProposal(proposalId) {
  if (!proposalId) {
    return;
  }

  const url = new URL(window.location.href);
  url.searchParams.set('proposal', proposalId);

  window.history.replaceState({}, '', url.toString());
  console.log('[navigationWorkflow] URL updated with proposal:', proposalId);
}

/**
 * Get proposal ID from URL query parameter
 *
 * @returns {string|null} Proposal ID or null
 */
export function getProposalIdFromUrl() {
  const url = new URL(window.location.href);
  return url.searchParams.get('proposal');
}
