/**
 * Host Proposals Page Types
 *
 * Type definitions for the host proposals page and its components.
 * Based on the Bubble.io proposal schema with adaptations for the frontend.
 */

import { getStatusConfig, isTerminalStatus } from '../../../logic/constants/proposalStatuses.js';

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
 *
 * usualOrder values (from Bubble "Status - Proposal" option set):
 *   0 = Proposal Submitted (awaiting rental app)
 *   1 = Host Review
 *   2 = Host Counteroffer Submitted / Awaiting Guest Review
 *   3 = Proposal or Counteroffer Accepted / Drafting Docs
 *   4 = Lease Documents Sent for Review
 *   5 = Lease Documents Sent for Signatures
 *   6 = Lease Documents Signed
 *   7 = Initial Payment Submitted / Lease activated
 *   -1 = Cancelled/Rejected (special states)
 */
export const PROPOSAL_STATUSES = {
  proposal_submitted: {
    id: 'proposal_submitted',
    displayText: 'Proposal Submitted',
    usualOrder: 0, // Awaiting rental application
    hostAction1: 'See Details',
    hostAction2: 'Request Rental App',
    guestAction1: 'View Status',
    guestAction2: 'Edit Proposal'
  },
  host_review: {
    id: 'host_review',
    displayText: 'Host Review',
    usualOrder: 1,
    hostAction1: 'Review / Modify',
    hostAction2: 'Accept Proposal',
    guestAction1: 'View Status',
    guestAction2: ''
  },
  host_counteroffer: {
    id: 'host_counteroffer',
    displayText: 'Host Counteroffer Submitted',
    usualOrder: 2,
    hostAction1: 'Remind Guest',
    hostAction2: 'See Details',
    guestAction1: 'Review Counteroffer',
    guestAction2: 'Reject'
  },
  accepted: {
    id: 'accepted',
    displayText: 'Accepted / Drafting Docs',
    usualOrder: 3,
    hostAction1: 'Remind Split Lease',
    hostAction2: 'See Details',
    guestAction1: 'View Status',
    guestAction2: ''
  },
  lease_documents_sent: {
    id: 'lease_documents_sent',
    displayText: 'Lease Documents Sent for Review',
    usualOrder: 4,
    hostAction1: 'Review Documents',
    hostAction2: 'Verify Identity',
    guestAction1: 'Sign Documents',
    guestAction2: ''
  },
  lease_documents_signatures: {
    id: 'lease_documents_signatures',
    displayText: 'Lease Documents Sent for Signatures',
    usualOrder: 5,
    hostAction1: 'Resend Documents',
    hostAction2: '',
    guestAction1: 'Sign Documents',
    guestAction2: ''
  },
  lease_signed: {
    id: 'lease_signed',
    displayText: 'Lease Documents Signed',
    usualOrder: 6,
    hostAction1: 'Resend Documents',
    hostAction2: '',
    guestAction1: 'View Documents',
    guestAction2: ''
  },
  payment_submitted: {
    id: 'payment_submitted',
    displayText: 'Initial Payment Submitted',
    usualOrder: 7,
    hostAction1: 'Go to Leases',
    hostAction2: '',
    guestAction1: 'View Lease',
    guestAction2: ''
  },
  cancelled_by_guest: {
    id: 'cancelled_by_guest',
    displayText: 'Cancelled by Guest',
    usualOrder: -1, // Special cancelled state
    hostAction1: 'Delete Proposal',
    hostAction2: '',
    guestAction1: '',
    guestAction2: ''
  },
  rejected_by_host: {
    id: 'rejected_by_host',
    displayText: 'Rejected by Host',
    usualOrder: -1, // Special cancelled state
    hostAction1: 'Delete Proposal',
    hostAction2: '',
    guestAction1: '',
    guestAction2: ''
  },
  cancelled_by_splitlease: {
    id: 'cancelled_by_splitlease',
    displayText: 'Cancelled by Split Lease',
    usualOrder: -1, // Special cancelled state
    hostAction1: 'Delete Proposal',
    hostAction2: '',
    guestAction1: '',
    guestAction2: ''
  }
};

/**
 * Progress bar step thresholds (usualOrder values required to complete each step)
 * Based on Bubble "Status - Proposal" option set Usual Order values
 */
export const PROGRESS_THRESHOLDS = {
  proposalSubmitted: 0,  // Always completed once proposal exists
  rentalApp: 1,          // Completed when usualOrder >= 1 (Host Review)
  hostReview: 3,         // Completed when usualOrder >= 3 (Accepted)
  leaseDocs: 4,          // Completed when usualOrder >= 4 (Lease docs sent)
  initialPayment: 7      // Completed when usualOrder >= 7 (Payment submitted)
};

/**
 * Get status tag info for display
 * Uses the unified status system from proposalStatuses.js for proper matching
 *
 * @param {string|Object} status - The proposal status (string or object with id)
 * @returns {StatusTagInfo} Status tag display information
 */
export function getStatusTagInfo(status) {
  // Extract status key - handles both string and object formats
  const statusKey = typeof status === 'string' ? status : (status?.id || status?._id || '');

  // Use unified status system for proper matching
  const statusConfig = getStatusConfig(statusKey);
  const usualOrder = statusConfig.usualOrder ?? 0;

  // Check for terminal (cancelled/rejected) states
  if (isTerminalStatus(statusKey)) {
    return {
      text: 'Cancelled!',
      backgroundColor: '#FEE2E2',
      textColor: '#991B1B',
      icon: 'x'
    };
  }

  // Host counteroffer - awaiting guest review
  if (statusConfig.key === 'Host Counteroffer Submitted / Awaiting Guest Review') {
    return {
      text: 'Guest Reviewing Counteroffer',
      backgroundColor: '#FEF3C7',
      textColor: '#924026',
      icon: 'clock'
    };
  }

  // Accepted states (usualOrder >= 3 per reference table sort_order)
  if (usualOrder >= 3) {
    return {
      text: 'Accepted!',
      backgroundColor: '#D1FAE5',
      textColor: '#065F46',
      icon: 'check'
    };
  }

  // Pending review (usualOrder < 3 means not yet accepted)
  return {
    text: 'Pending Review',
    backgroundColor: '#FEF3C7',
    textColor: '#924026',
    icon: 'clock'
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

/**
 * Convert night indices to day names for highlighting
 * Database uses 0-based indexing: 0=Sunday, 1=Monday, ..., 6=Saturday
 *
 * @param {number[]|string} nightsSelected - Array of 0-based day indices [4,5,6] or JSON string
 * @returns {DayOfWeek[]} Array of day names ['Thursday', 'Friday', 'Saturday']
 */
export function getNightsAsDayNames(nightsSelected) {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  if (!nightsSelected) return [];

  // Parse if it's a JSON string
  let nights = nightsSelected;
  if (typeof nightsSelected === 'string') {
    try {
      nights = JSON.parse(nightsSelected);
    } catch (e) {
      return [];
    }
  }

  if (!Array.isArray(nights)) return [];

  // Convert 0-based indices to day names
  return nights
    .map(index => {
      const idx = typeof index === 'string' ? parseInt(index, 10) : index;
      return dayNames[idx] || '';
    })
    .filter(Boolean);
}

/**
 * Get check-in and check-out days from nights selected
 * Check-in is the first night's day, check-out is the day after the last night
 * Database uses 0-based indexing: 0=Sunday, 1=Monday, ..., 6=Saturday
 *
 * @param {number[]|string} nightsSelected - Array of 0-based day indices or JSON string
 * @returns {{ checkInDay: string, checkOutDay: string }} Check-in and check-out day names
 */
export function getCheckInOutFromNights(nightsSelected) {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  if (!nightsSelected) return { checkInDay: '', checkOutDay: '' };

  // Parse if it's a JSON string
  let nights = nightsSelected;
  if (typeof nightsSelected === 'string') {
    try {
      nights = JSON.parse(nightsSelected);
    } catch (e) {
      return { checkInDay: '', checkOutDay: '' };
    }
  }

  if (!Array.isArray(nights) || nights.length === 0) return { checkInDay: '', checkOutDay: '' };

  // Convert to numbers and sort to find first and last night
  const sortedNights = nights
    .map(n => typeof n === 'string' ? parseInt(n, 10) : n)
    .filter(n => !isNaN(n) && n >= 0 && n <= 6)
    .sort((a, b) => a - b);

  if (sortedNights.length === 0) return { checkInDay: '', checkOutDay: '' };

  const firstNight = sortedNights[0]; // Check-in day (0-based)
  const lastNight = sortedNights[sortedNights.length - 1]; // Last night stayed

  // Check-out is the day AFTER the last night (with wrap-around: Saturday night -> Sunday checkout)
  const checkOutIndex = (lastNight + 1) % 7;

  return {
    checkInDay: dayNames[firstNight] || '',
    checkOutDay: dayNames[checkOutIndex] || ''
  };
}
