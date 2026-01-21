/**
 * formatLeaseDisplay - Format lease data for display in UI
 *
 * Pure formatting functions - no business logic, just transforming
 * data into human-readable strings.
 *
 * @param {Object} lease - Adapted lease object
 * @returns {Object} Formatted display values
 */
export function formatLeaseDisplay(lease) {
  if (!lease) {
    return {
      truncatedId: 'N/A',
      statusLabel: 'Unknown',
      dateRange: 'No dates',
      totalRent: '$0.00',
      totalCompensation: '$0.00',
      paidToDate: '$0.00',
      paymentProgress: 0,
      maskedGuestEmail: 'Unknown',
      maskedHostEmail: 'Unknown',
      createdAt: 'Unknown',
      modifiedAt: 'Unknown',
    };
  }

  return {
    truncatedId: truncateId(lease.id),
    statusLabel: formatStatusLabel(lease.status),
    dateRange: formatDateRange(lease.startDate, lease.endDate),
    totalRent: formatCurrency(lease.totalRent),
    totalCompensation: formatCurrency(lease.totalCompensation),
    paidToDate: formatCurrency(lease.paidToDate),
    paymentProgress: calculatePaymentProgress(lease.paidToDate, lease.totalRent),
    maskedGuestEmail: maskEmail(lease.guest?.email),
    maskedHostEmail: maskEmail(lease.host?.email),
    createdAt: formatRelativeDate(lease.createdAt),
    modifiedAt: formatRelativeDate(lease.modifiedAt),
  };
}

/**
 * Truncate Bubble ID for display
 * @param {string} id - Full Bubble ID
 * @param {number} length - Characters to show (default 8)
 * @returns {string} Truncated ID with ellipsis
 */
export function truncateId(id, length = 8) {
  if (!id) return 'N/A';
  if (id.length <= length) return id;
  return `${id.slice(0, length)}...`;
}

/**
 * Format status string for display
 * @param {string} status - Normalized status
 * @returns {string} Display label
 */
export function formatStatusLabel(status) {
  const labels = {
    active: 'Active',
    completed: 'Completed',
    cancelled: 'Cancelled',
    pending: 'Pending',
    draft: 'Draft',
    unknown: 'Unknown',
  };

  return labels[status] || status || 'Unknown';
}

/**
 * Format date range for display
 * @param {Date|null} startDate
 * @param {Date|null} endDate
 * @returns {string} Formatted date range
 */
export function formatDateRange(startDate, endDate) {
  if (!startDate && !endDate) return 'No dates set';

  const options = { month: 'short', day: 'numeric', year: 'numeric' };

  const start = startDate
    ? startDate.toLocaleDateString('en-US', options)
    : 'TBD';

  const end = endDate
    ? endDate.toLocaleDateString('en-US', options)
    : 'TBD';

  return `${start} - ${end}`;
}

/**
 * Format currency value
 * @param {number} amount
 * @returns {string} Formatted currency string
 */
export function formatCurrency(amount) {
  if (amount == null || isNaN(amount)) return '$0.00';

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Calculate payment progress percentage
 * @param {number} paid - Amount paid
 * @param {number} total - Total amount due
 * @returns {number} Progress percentage (0-100)
 */
export function calculatePaymentProgress(paid, total) {
  if (!total || total === 0) return 0;
  if (!paid || paid === 0) return 0;

  const progress = (paid / total) * 100;
  return Math.min(100, Math.round(progress));
}

/**
 * Mask email for privacy in list views
 * @param {string} email
 * @returns {string} Masked email (e.g., "jo***@gmail.com")
 */
export function maskEmail(email) {
  if (!email || typeof email !== 'string') return 'Unknown';

  const [localPart, domain] = email.split('@');
  if (!domain) return email;

  if (localPart.length <= 2) {
    return `${localPart}***@${domain}`;
  }

  const visible = localPart.slice(0, 2);
  return `${visible}***@${domain}`;
}

/**
 * Format date as relative time or absolute date
 * @param {Date|null} date
 * @returns {string} Formatted date string
 */
export function formatRelativeDate(date) {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    return 'Unknown';
  }

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours === 0) {
      const diffMins = Math.floor(diffMs / (1000 * 60));
      if (diffMins < 1) return 'Just now';
      return `${diffMins}m ago`;
    }
    return `${diffHours}h ago`;
  }

  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;

  // Fall back to absolute date for older dates
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default formatLeaseDisplay;
