/**
 * Host Proposals Page Types
 *
 * Type definitions for the host proposals page and its components.
 * Based on the Bubble.io proposal schema with adaptations for the frontend.
 */

import { getStatusConfig, isTerminalStatus } from '../../../logic/constants/proposalStatuses.js';
import { DAY_NAMES } from '../../../lib/dayUtils.js';

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
  const checkInIndex = DAY_NAMES.indexOf(checkInDay);
  const checkOutIndex = DAY_NAMES.indexOf(checkOutDay);

  if (checkInIndex === -1 || checkOutIndex === -1) return [];

  const activeDays = [];
  let current = checkInIndex;

  // Handle wrapping around the week
  while (current !== checkOutIndex) {
    activeDays.push(DAY_NAMES[current]);
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
      return DAY_NAMES[idx] || '';
    })
    .filter(Boolean);
}

/**
 * Get check-in and check-out days from Days Selected
 * Derives directly from Days Selected to ensure consistency with displayed day badges
 * Uses wrap-around logic for schedules spanning Saturday-Sunday boundary
 *
 * Days Selected = days the guest will be PRESENT (includes checkout day)
 * e.g., Thu, Fri, Sat, Sun (4 days) for 3 nights Thu-Fri-Sat
 *
 * Database uses 0-based indexing: 0=Sunday, 1=Monday, ..., 6=Saturday
 *
 * @param {number[]|string} daysSelected - Array of 0-based day indices or JSON string
 * @returns {{ checkInDay: string, checkOutDay: string }} Check-in and check-out day names
 */
export function getCheckInOutFromDays(daysSelected) {

  if (!daysSelected) return { checkInDay: '', checkOutDay: '' };

  // Parse if it's a JSON string
  let days = daysSelected;
  if (typeof daysSelected === 'string') {
    try {
      days = JSON.parse(daysSelected);
    } catch (e) {
      return { checkInDay: '', checkOutDay: '' };
    }
  }

  if (!Array.isArray(days) || days.length === 0) return { checkInDay: '', checkOutDay: '' };

  // Convert to day indices (0-indexed: 0=Sunday through 6=Saturday)
  const dayIndices = days.map(day => {
    if (typeof day === 'number') return day;
    if (typeof day === 'string') {
      const trimmed = day.trim();
      const numericValue = parseInt(trimmed, 10);
      if (!isNaN(numericValue) && String(numericValue) === trimmed) {
        return numericValue; // 0-indexed
      }
      // It's a day name - find its 0-indexed position
      const jsIndex = DAY_NAMES.indexOf(trimmed);
      return jsIndex >= 0 ? jsIndex : -1;
    }
    return -1;
  }).filter(idx => idx >= 0 && idx <= 6);

  if (dayIndices.length === 0) return { checkInDay: '', checkOutDay: '' };

  const sorted = [...dayIndices].sort((a, b) => a - b);

  // Handle wrap-around case (e.g., Fri, Sat, Sun, Mon = [0, 1, 5, 6])
  const hasZero = sorted.includes(0);
  const hasSix = sorted.includes(6);

  if (hasZero && hasSix) {
    // Find gap to determine actual start/end
    let gapIndex = -1;
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] !== sorted[i - 1] + 1) {
        gapIndex = i;
        break;
      }
    }

    if (gapIndex !== -1) {
      // Wrapped selection: first day is after the gap, last day is before the gap
      const firstDayIndex = sorted[gapIndex]; // First day after gap (e.g., Friday = 5)
      const lastDayIndex = sorted[gapIndex - 1]; // Last day before gap (e.g., Monday = 1)

      return {
        checkInDay: DAY_NAMES[firstDayIndex] || '',
        checkOutDay: DAY_NAMES[lastDayIndex] || ''
      };
    }
  }

  // Standard case: first selected day to last selected day
  const firstDayIndex = sorted[0];
  const lastDayIndex = sorted[sorted.length - 1];

  return {
    checkInDay: DAY_NAMES[firstDayIndex] || '',
    checkOutDay: DAY_NAMES[lastDayIndex] || ''
  };
}

/**
 * Get check-in and check-out days from nights selected
 * Check-in is the first night's day, check-out is the day after the last night
 * Database uses 0-based indexing: 0=Sunday, 1=Monday, ..., 6=Saturday
 *
 * @deprecated Use getCheckInOutFromDays() instead for consistency with guest-facing display
 *
 * @param {number[]|string} nightsSelected - Array of 0-based day indices or JSON string
 * @returns {{ checkInDay: string, checkOutDay: string }} Check-in and check-out day names
 */
export function getCheckInOutFromNights(nightsSelected) {

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

  // Handle wrap-around case (e.g., Fri, Sat, Sun, Mon = [0, 1, 5, 6])
  // Check if schedule wraps around Saturday-Sunday boundary
  const hasZero = sortedNights.includes(0);
  const hasSix = sortedNights.includes(6);

  if (hasZero && hasSix) {
    // Find the gap to determine actual start/end
    let gapIndex = -1;
    for (let i = 1; i < sortedNights.length; i++) {
      if (sortedNights[i] !== sortedNights[i - 1] + 1) {
        gapIndex = i;
        break;
      }
    }

    if (gapIndex !== -1) {
      // Wrapped selection: check-in is first day after gap, check-out is day after last day before gap
      const firstNight = sortedNights[gapIndex]; // First night after gap (e.g., 5 = Friday)
      const lastNight = sortedNights[gapIndex - 1]; // Last night before gap (e.g., 1 = Monday)
      const checkOutIndex = (lastNight + 1) % 7; // Day after last night

      return {
        checkInDay: DAY_NAMES[firstNight] || '',
        checkOutDay: DAY_NAMES[checkOutIndex] || ''
      };
    }
  }

  // Standard case: first selected night to day after last selected night
  const firstNight = sortedNights[0]; // Check-in day (0-based)
  const lastNight = sortedNights[sortedNights.length - 1]; // Last night stayed

  // Check-out is the day AFTER the last night (with wrap-around: Saturday night -> Sunday checkout)
  const checkOutIndex = (lastNight + 1) % 7;

  return {
    checkInDay: DAY_NAMES[firstNight] || '',
    checkOutDay: DAY_NAMES[checkOutIndex] || ''
  };
}
