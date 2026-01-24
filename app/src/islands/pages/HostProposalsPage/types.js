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
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

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
      const jsIndex = dayNames.indexOf(trimmed);
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
        checkInDay: dayNames[firstDayIndex] || '',
        checkOutDay: dayNames[lastDayIndex] || ''
      };
    }
  }

  // Standard case: first selected day to last selected day
  const firstDayIndex = sorted[0];
  const lastDayIndex = sorted[sorted.length - 1];

  return {
    checkInDay: dayNames[firstDayIndex] || '',
    checkOutDay: dayNames[lastDayIndex] || ''
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
        checkInDay: dayNames[firstNight] || '',
        checkOutDay: dayNames[checkOutIndex] || ''
      };
    }
  }

  // Standard case: first selected night to day after last selected night
  const firstNight = sortedNights[0]; // Check-in day (0-based)
  const lastNight = sortedNights[sortedNights.length - 1]; // Last night stayed

  // Check-out is the day AFTER the last night (with wrap-around: Saturday night -> Sunday checkout)
  const checkOutIndex = (lastNight + 1) % 7;

  return {
    checkInDay: dayNames[firstNight] || '',
    checkOutDay: dayNames[checkOutIndex] || ''
  };
}

/* ========================================
   V7 SECTION GROUPING FUNCTIONS
   ======================================== */

/**
 * Section identifiers for V7 proposal grouping
 * @typedef {'actionNeeded' | 'inProgress' | 'closed'} ProposalSectionKey
 */

/**
 * Statuses that require host action
 * New proposals, host review, or guest counteroffers
 */
const ACTION_NEEDED_STATUSES = [
  'proposal_submitted',
  'host_review'
];

/**
 * Statuses that indicate in-progress negotiations/lease process
 */
const IN_PROGRESS_STATUSES = [
  'accepted',
  'host_counteroffer',
  'lease_documents_sent',
  'lease_documents_signatures',
  'lease_signed'
];

/**
 * Statuses that indicate closed/terminal proposals
 */
const CLOSED_STATUSES = [
  'cancelled_by_guest',
  'rejected_by_host',
  'cancelled_by_splitlease',
  'payment_submitted'
];

/**
 * Get the status key from a proposal's status field
 * Handles both string and object status formats
 *
 * @param {Object} proposal - The proposal object
 * @returns {string} The status key
 */
function getProposalStatusKey(proposal) {
  const status = proposal?.status;
  if (!status) return '';
  if (typeof status === 'string') return status;
  return status.id || status._id || status.key || '';
}

/**
 * Check if a proposal has a guest counteroffer
 * This is determined by having a guest_counteroffer field or
 * the most recent counteroffer being from the guest
 *
 * @param {Object} proposal - The proposal object
 * @returns {boolean} True if guest has counteroffered
 */
function hasGuestCounteroffer(proposal) {
  // Check for explicit guest counteroffer flag or field
  if (proposal?.has_guest_counteroffer) return true;
  if (proposal?.guest_counteroffer) return true;

  // Check if last_modified_by is 'guest' and status is still negotiation phase
  const statusKey = getProposalStatusKey(proposal);
  if (
    proposal?.last_modified_by === 'guest' &&
    (statusKey === 'host_review' || statusKey === 'proposal_submitted')
  ) {
    return true;
  }

  return false;
}

/**
 * Group proposals into V7 sections: Action Needed, In Progress, Closed
 *
 * @param {Array} proposals - Array of proposal objects
 * @returns {{ actionNeeded: Array, inProgress: Array, closed: Array }} Grouped proposals
 */
export function groupProposalsBySection(proposals) {
  const result = {
    actionNeeded: [],
    inProgress: [],
    closed: []
  };

  if (!Array.isArray(proposals)) return result;

  for (const proposal of proposals) {
    const statusKey = getProposalStatusKey(proposal);

    // Guest counteroffers always go to Action Needed
    if (hasGuestCounteroffer(proposal)) {
      result.actionNeeded.push(proposal);
      continue;
    }

    // Check status categories
    if (ACTION_NEEDED_STATUSES.includes(statusKey)) {
      result.actionNeeded.push(proposal);
    } else if (IN_PROGRESS_STATUSES.includes(statusKey)) {
      result.inProgress.push(proposal);
    } else if (CLOSED_STATUSES.includes(statusKey)) {
      result.closed.push(proposal);
    } else {
      // Unknown status - default to in progress
      result.inProgress.push(proposal);
    }
  }

  return result;
}

/**
 * Get the card styling variant based on proposal status
 * Used for CSS class selection
 *
 * @param {Object} proposal - The proposal object
 * @returns {'action-needed' | 'accepted' | 'counteroffer' | 'declined' | 'default'} Card variant
 */
export function getCardVariant(proposal) {
  const statusKey = getProposalStatusKey(proposal);

  // Guest counteroffer - yellow/warning
  if (hasGuestCounteroffer(proposal)) {
    return 'counteroffer';
  }

  // Action needed statuses - purple
  if (ACTION_NEEDED_STATUSES.includes(statusKey)) {
    return 'action-needed';
  }

  // Accepted/in-progress - green
  if (statusKey === 'accepted' || statusKey.startsWith('lease_')) {
    return 'accepted';
  }

  // Host counteroffer - default (waiting on guest)
  if (statusKey === 'host_counteroffer') {
    return 'default';
  }

  // Declined/cancelled - red
  if (CLOSED_STATUSES.includes(statusKey) && statusKey !== 'payment_submitted') {
    return 'declined';
  }

  return 'default';
}

/**
 * Get the status tag configuration for display in card header
 *
 * @param {Object} proposal - The proposal object
 * @returns {{ text: string, variant: string }} Status tag config
 */
export function getStatusTagConfig(proposal) {
  const statusKey = getProposalStatusKey(proposal);

  // Guest counteroffer
  if (hasGuestCounteroffer(proposal)) {
    return { text: 'Guest Counter', variant: 'counteroffer' };
  }

  // Check for "Awaiting Rental Application" states (full Bubble status strings)
  if (statusKey === 'Proposal Submitted by guest - Awaiting Rental Application' ||
      statusKey === 'Proposal Submitted for guest by Split Lease - Awaiting Rental Application') {
    return { text: 'Awaiting Rental App', variant: 'default' };
  }

  // Check for pending confirmation state
  if (statusKey === 'Proposal Submitted for guest by Split Lease - Pending Confirmation' ||
      statusKey === 'Pending Confirmation') {
    return { text: 'Pending Confirmation', variant: 'default' };
  }

  // Map status to display config (normalized keys)
  const statusMap = {
    proposal_submitted: { text: 'Review', variant: 'attention' },
    host_review: { text: 'Review', variant: 'attention' },
    host_counteroffer: { text: 'Your Counter', variant: 'default' },
    accepted: { text: 'Accepted', variant: 'success' },
    lease_documents_sent: { text: 'Lease Sent', variant: 'success' },
    lease_documents_signatures: { text: 'Awaiting Signatures', variant: 'success' },
    lease_signed: { text: 'Lease Signed', variant: 'success' },
    payment_submitted: { text: 'Active', variant: 'success' },
    cancelled_by_guest: { text: 'Cancelled', variant: 'declined' },
    rejected_by_host: { text: 'Declined', variant: 'declined' },
    cancelled_by_splitlease: { text: 'Cancelled', variant: 'declined' }
  };

  return statusMap[statusKey] || { text: 'Pending', variant: 'default' };
}

/**
 * Check if a proposal is new (submitted recently)
 * Used to show "New" badge
 *
 * @param {Object} proposal - The proposal object
 * @param {number} hoursThreshold - Hours to consider as "new" (default: 48)
 * @returns {boolean} True if proposal is new
 */
export function isNewProposal(proposal, hoursThreshold = 48) {
  const createdAt = proposal?.created_at || proposal?.Created_Date || proposal?.createdAt;
  if (!createdAt) return false;

  const createdDate = new Date(createdAt);
  const now = new Date();
  const hoursDiff = (now - createdDate) / (1000 * 60 * 60);

  return hoursDiff <= hoursThreshold;
}
