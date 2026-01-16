/**
 * Display Utilities for Proposal Cards
 *
 * Pure functions for formatting proposal data for display.
 * Extracted from ProposalCard to enable reuse in ExpandableProposalCard.
 *
 * Day indices use JavaScript 0-based standard (0=Sun, 1=Mon, ..., 6=Sat)
 */

/**
 * Day abbreviations (0-indexed: 0=Sun, 1=Mon, ..., 6=Sat)
 */
export const DAY_ABBREVS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Format currency for display
 * @param {number|string} amount - Amount to format
 * @param {boolean} [showCents=false] - Whether to show cents
 * @returns {string} Formatted currency string
 */
export function formatCurrency(amount, showCents = false) {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num) || num === null || num === undefined) return '$0';

  if (showCents) {
    return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `$${Math.round(num).toLocaleString('en-US')}`;
}

/**
 * Format date for display
 * @param {string|Date} dateValue - Date to format
 * @returns {string} Formatted date string (e.g., "Jan 15, 2025")
 */
export function formatDate(dateValue) {
  if (!dateValue) return 'TBD';

  const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
  if (isNaN(date.getTime())) return 'TBD';

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

/**
 * Get short status label for collapsed card display
 * @param {string} status - Raw status string
 * @returns {string} Short status label
 */
export function getShortStatusLabel(status) {
  if (!status) return 'Pending';

  const normalizedStatus = status.trim();

  // Suggested proposals: distinguish guest action vs host action
  if (normalizedStatus.includes('Split Lease - Pending Confirmation')) return 'SL Suggestion';
  if (normalizedStatus.includes('Split Lease - Awaiting Rental Application')) return 'Confirm + Apply';

  if (normalizedStatus.includes('Counteroffer')) return 'Review Offer';
  if (normalizedStatus.includes('Accepted') || normalizedStatus.includes('Drafting')) return 'Accepted';
  if (normalizedStatus.includes('activated')) return 'Active';
  if (normalizedStatus.includes('Signed')) return 'Signed';
  if (normalizedStatus.includes('Awaiting Rental Application')) return 'Apply Now';
  if (normalizedStatus.includes('Rental Application Submitted')) return 'Under Review';
  if (normalizedStatus.includes('Host Review')) return 'Host Review';
  if (normalizedStatus.includes('Lease Documents Sent for Review')) return 'Review Docs';
  if (normalizedStatus.includes('Lease Documents Sent for Signatures')) return 'Sign Lease';
  if (normalizedStatus.includes('Cancelled')) return 'Cancelled';
  if (normalizedStatus.includes('Rejected')) return 'Declined';

  return 'Pending';
}

/**
 * Get status badge CSS class
 * @param {string} status - Raw status string
 * @returns {string} CSS class name
 */
export function getStatusBadgeClass(status) {
  if (!status) return '';

  const normalizedStatus = status.trim();

  // Action required: Suggested proposals pending guest confirmation
  if (normalizedStatus.includes('Split Lease - Pending Confirmation')) {
    return 'action-required';
  }

  // Success states (accepted, completed)
  if (normalizedStatus.includes('Accepted') ||
      normalizedStatus.includes('activated') ||
      normalizedStatus.includes('Signed')) {
    return 'success';
  }

  // Attention states (counteroffer, awaiting action)
  if (normalizedStatus.includes('Counteroffer') ||
      normalizedStatus.includes('Awaiting') ||
      normalizedStatus.includes('Review')) {
    return 'attention';
  }

  return '';
}

/**
 * Check if proposal is SL-suggested
 * @param {string} status - Raw status string
 * @returns {boolean}
 */
export function isSLSuggested(status) {
  if (!status) return false;
  const normalizedStatus = status.trim();
  return normalizedStatus.includes('Submitted for guest by Split Lease');
}

/**
 * Check if proposal is pending confirmation (not yet confirmed by guest)
 * @param {string} status - Raw status string
 * @returns {boolean}
 */
export function isPendingConfirmation(status) {
  if (!status) return false;
  const normalizedStatus = status.trim();
  return normalizedStatus.includes('Pending Confirmation');
}

/**
 * Check if proposal is cancelled or rejected
 * @param {string} status - Raw status string
 * @returns {boolean}
 */
export function isTerminalStatus(status) {
  if (!status) return false;
  const normalizedStatus = status.trim();
  return normalizedStatus.includes('Cancelled') || normalizedStatus.includes('Rejected');
}

/**
 * Extract listing photo URL with fallback
 * @param {Object} listing - Listing object
 * @returns {string|null} Photo URL or null
 */
export function getListingPhoto(listing) {
  if (!listing) return null;

  return listing.featuredPhotoUrl ||
    listing['Features - Photos']?.[0] ||
    null;
}

/**
 * Get host display name
 * @param {Object} host - Host object
 * @returns {string} Display name
 */
export function getHostDisplayName(host) {
  if (!host) return 'Host';

  return host.firstName ||
    host['First Name'] ||
    host.name ||
    'Host';
}

/**
 * Build meta text for collapsed card (e.g., "5 days · 12 weeks")
 * @param {Array} daysSelected - Array of selected day indices
 * @param {string|number} weeks - Number of weeks
 * @returns {string} Meta text
 */
export function buildMetaText(daysSelected, weeks) {
  const daysCount = Array.isArray(daysSelected) ? daysSelected.length : 0;
  if (weeks) {
    return `${daysCount} day${daysCount !== 1 ? 's' : ''} · ${weeks} weeks`;
  }
  return `${daysCount} day${daysCount !== 1 ? 's' : ''}`;
}

/**
 * Format weekly price display
 * @param {number} nightlyPrice - Price per night
 * @param {number} daysCount - Number of days per week
 * @returns {string} Formatted weekly price
 */
export function formatWeeklyPrice(nightlyPrice, daysCount) {
  if (!nightlyPrice || !daysCount) return '$0/wk';
  const weekly = nightlyPrice * daysCount;
  return `${formatCurrency(weekly)}/wk`;
}

/**
 * Get progress stage number from status
 * @param {string} status - Raw status string
 * @returns {number} Stage 1-6 or 0 if unknown
 */
export function getProgressStage(status) {
  if (!status) return 0;

  const normalizedStatus = status.trim();

  // Stage 1: Initial/Submitted
  if (normalizedStatus.includes('Awaiting Rental Application') ||
      normalizedStatus.includes('Pending') ||
      normalizedStatus.includes('Split Lease - Pending Confirmation')) {
    return 1;
  }

  // Stage 2: Application submitted
  if (normalizedStatus.includes('Rental Application Submitted')) {
    return 2;
  }

  // Stage 3: Under review / counteroffer
  if (normalizedStatus.includes('Host Review') ||
      normalizedStatus.includes('Counteroffer')) {
    return 3;
  }

  // Stage 4: Accepted / Documents
  if (normalizedStatus.includes('Accepted') ||
      normalizedStatus.includes('Drafting') ||
      normalizedStatus.includes('Documents Sent for Review') ||
      normalizedStatus.includes('Reviewing')) {
    return 4;
  }

  // Stage 5: Signing
  if (normalizedStatus.includes('Signatures')) {
    return 5;
  }

  // Stage 6: Payment / Activated
  if (normalizedStatus.includes('Payment') ||
      normalizedStatus.includes('activated')) {
    return 6;
  }

  return 0;
}

/**
 * Get progress stage labels for display
 * @returns {Array<string>} Array of stage labels
 */
export function getProgressStageLabels() {
  return [
    'Submitted',
    'Application',
    'Review',
    'Accepted',
    'Signing',
    'Active'
  ];
}
