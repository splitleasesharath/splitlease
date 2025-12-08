/**
 * Host Proposals Page Types
 *
 * Type definitions for the host proposals page and its components.
 * Based on the Bubble.io proposal schema with adaptations for the frontend.
 */

/**
 * Proposal status types
 * @typedef {'proposal_submitted' | 'host_review' | 'host_counteroffer' | 'accepted' | 'lease_documents_sent' | 'lease_signed' | 'payment_submitted' | 'cancelled_by_guest' | 'rejected_by_host' | 'cancelled_by_splitlease'} ProposalStatusType
 */

/**
 * Days of the week
 * @typedef {'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday'} DayOfWeek
 */

/**
 * Proposal status configuration
 * @typedef {Object} ProposalStatus
 * @property {ProposalStatusType} id - Status identifier
 * @property {string} displayText - Human-readable status text
 * @property {number} visualOrder - Order for progress display (1-11)
 * @property {string} hostAction1 - Primary action for host
 * @property {string} hostAction2 - Secondary action for host
 * @property {string} guestAction1 - Primary action for guest
 * @property {string} guestAction2 - Secondary action for guest
 */

/**
 * Status tag display information
 * @typedef {Object} StatusTagInfo
 * @property {string} text - Display text
 * @property {string} backgroundColor - Background color
 * @property {string} textColor - Text color
 * @property {'clock' | 'check' | 'x'} [icon] - Optional icon
 */

/**
 * Proposal status definitions with visual order and actions
 */
export const PROPOSAL_STATUSES = {
  proposal_submitted: {
    id: 'proposal_submitted',
    displayText: 'Proposal Submitted',
    visualOrder: 1,
    hostAction1: 'See Details',
    hostAction2: 'Request Rental App',
    guestAction1: 'View Status',
    guestAction2: 'Edit Proposal'
  },
  host_review: {
    id: 'host_review',
    displayText: 'Host Review',
    visualOrder: 2,
    hostAction1: 'Review / Modify',
    hostAction2: 'Accept Proposal',
    guestAction1: 'View Status',
    guestAction2: ''
  },
  host_counteroffer: {
    id: 'host_counteroffer',
    displayText: 'Host Counteroffer Submitted',
    visualOrder: 4,
    hostAction1: 'Remind Guest',
    hostAction2: 'See Details',
    guestAction1: 'Review Counteroffer',
    guestAction2: 'Reject'
  },
  accepted: {
    id: 'accepted',
    displayText: 'Accepted',
    visualOrder: 5,
    hostAction1: 'Remind Split Lease',
    hostAction2: 'See Details',
    guestAction1: 'View Status',
    guestAction2: ''
  },
  lease_documents_sent: {
    id: 'lease_documents_sent',
    displayText: 'Lease Documents Sent',
    visualOrder: 6,
    hostAction1: 'Review Documents',
    hostAction2: 'Verify Identity',
    guestAction1: 'Sign Documents',
    guestAction2: ''
  },
  lease_signed: {
    id: 'lease_signed',
    displayText: 'Lease Signed',
    visualOrder: 7,
    hostAction1: 'Resend Documents',
    hostAction2: '',
    guestAction1: 'View Documents',
    guestAction2: ''
  },
  payment_submitted: {
    id: 'payment_submitted',
    displayText: 'Payment Submitted',
    visualOrder: 8,
    hostAction1: 'Go to Leases',
    hostAction2: '',
    guestAction1: 'View Lease',
    guestAction2: ''
  },
  cancelled_by_guest: {
    id: 'cancelled_by_guest',
    displayText: 'Cancelled by Guest',
    visualOrder: 9,
    hostAction1: 'Delete Proposal',
    hostAction2: '',
    guestAction1: '',
    guestAction2: ''
  },
  rejected_by_host: {
    id: 'rejected_by_host',
    displayText: 'Rejected by Host',
    visualOrder: 10,
    hostAction1: 'Delete Proposal',
    hostAction2: '',
    guestAction1: '',
    guestAction2: ''
  },
  cancelled_by_splitlease: {
    id: 'cancelled_by_splitlease',
    displayText: 'Cancelled by Split Lease',
    visualOrder: 11,
    hostAction1: 'Delete Proposal',
    hostAction2: '',
    guestAction1: '',
    guestAction2: ''
  }
};

/**
 * Get status tag info for display
 * @param {ProposalStatus} status - The proposal status
 * @returns {StatusTagInfo} Status tag display information
 */
export function getStatusTagInfo(status) {
  const statusId = status?.id || status;
  const visualOrder = status?.visualOrder || PROPOSAL_STATUSES[statusId]?.visualOrder || 0;

  // Cancelled statuses
  if (statusId === 'cancelled_by_guest' || statusId === 'cancelled_by_splitlease' || statusId === 'rejected_by_host') {
    return {
      text: 'Cancelled!',
      backgroundColor: '#FEE2E2',
      textColor: '#991B1B',
      icon: 'x'
    };
  }

  // Host counteroffer - awaiting guest review
  if (statusId === 'host_counteroffer') {
    return {
      text: 'Guest Reviewing Counteroffer',
      backgroundColor: '#FEF3C7',
      textColor: '#924026',
      icon: 'clock'
    };
  }

  // Pending review (visual order < 3)
  if (visualOrder < 3) {
    return {
      text: 'Pending Review',
      backgroundColor: '#FEF3C7',
      textColor: '#924026',
      icon: 'clock'
    };
  }

  // Default - Accepted
  return {
    text: 'Accepted!',
    backgroundColor: '#D1FAE5',
    textColor: '#065F46',
    icon: 'check'
  };
}

/**
 * Days array for iteration
 */
export const DAYS = [
  { short: 'S', full: 'Sunday' },
  { short: 'M', full: 'Monday' },
  { short: 'T', full: 'Tuesday' },
  { short: 'W', full: 'Wednesday' },
  { short: 'T', full: 'Thursday' },
  { short: 'F', full: 'Friday' },
  { short: 'S', full: 'Saturday' }
];

/**
 * Get active days between check-in and check-out
 * @param {DayOfWeek} checkInDay - Check-in day
 * @param {DayOfWeek} checkOutDay - Check-out day
 * @returns {DayOfWeek[]} Array of active days
 */
export function getActiveDays(checkInDay, checkOutDay) {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const checkInIndex = dayNames.indexOf(checkInDay);
  const checkOutIndex = dayNames.indexOf(checkOutDay);

  if (checkInIndex === -1 || checkOutIndex === -1) return [];

  const activeDays = [];
  let current = checkInIndex;

  // Handle wrapping around the week
  while (current !== checkOutIndex) {
    activeDays.push(dayNames[current]);
    current = (current + 1) % 7;
  }

  return activeDays;
}
