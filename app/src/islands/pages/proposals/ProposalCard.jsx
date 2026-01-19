/**
 * Proposal Card Component
 *
 * Displays detailed information about a selected proposal in a two-column layout:
 * - Left column: Listing details, schedule, duration, move-in info
 * - Right column: Listing photo with host overlay
 * - Bottom: Pricing bar and progress tracker
 *
 * Design matches Bubble's MyProposals page layout.
 *
 * Dynamic UI Features:
 * - Status banner for accepted/counteroffer/cancelled states
 * - Dynamic progress tracker stage and colors based on status
 * - Action buttons change based on proposal status
 * - Warning icon when some nights become unavailable
 */

import { useState, useMemo } from 'react';
import { formatPrice, formatDate } from '../../../lib/proposals/dataTransformers.js';
import { getStatusConfig, isTerminalStatus, isCompletedStatus, shouldShowStatusBanner, getUsualOrder } from '../../../logic/constants/proposalStatuses.js';
import { shouldHideVirtualMeetingButton } from '../../../lib/proposals/statusButtonConfig.js';
import { navigateToMessaging } from '../../../logic/workflows/proposals/navigationWorkflow.js';
import { executeDeleteProposal } from '../../../logic/workflows/proposals/cancelProposalWorkflow.js';
import { goToRentalApplication, getListingUrlWithProposalContext } from '../../../lib/navigation.js';
import HostProfileModal from '../../modals/HostProfileModal.jsx';
import GuestEditingProposalModal from '../../modals/GuestEditingProposalModal.jsx';
import CancelProposalModal from '../../modals/CancelProposalModal.jsx';
import NotInterestedModal from '../../shared/SuggestedProposals/components/NotInterestedModal.jsx';
import VirtualMeetingManager from '../../shared/VirtualMeetingManager/VirtualMeetingManager.jsx';
import FullscreenProposalMapModal from '../../modals/FullscreenProposalMapModal.jsx';
import { showToast } from '../../shared/Toast.jsx';
import { supabase } from '../../../lib/supabase.js';
import { canConfirmSuggestedProposal, getNextStatusAfterConfirmation } from '../../../logic/rules/proposals/proposalRules.js';
import { dismissProposal } from '../../shared/SuggestedProposals/suggestedProposalService.js';

// Day abbreviations for schedule display (single letter like Bubble)
const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Convert a day value to a day name
 * Handles multiple formats:
 * - String day names: "Monday", "Friday", etc. (returned as-is)
 * - Numeric strings from Supabase: "0", "3" (0-indexed, where 0=Sunday, 1=Monday, etc.)
 * - Numeric values: 0, 3 (0-indexed)
 *
 * Note: Database now stores 0-indexed days natively (0=Sunday through 6=Saturday)
 *
 * @param {string|number} dayValue - The day value to convert
 * @returns {string} The day name or empty string if invalid
 */
function _convertDayValueToName(dayValue) {
  if (dayValue === null || dayValue === undefined) return '';

  // If it's a number, convert from 0-indexed to day name
  if (typeof dayValue === 'number') {
    return DAY_NAMES[dayValue] || '';
  }

  // If it's a string, check if it's a numeric string or a day name
  if (typeof dayValue === 'string') {
    const trimmed = dayValue.trim();

    // Check if it's a numeric string (e.g., "0", "3")
    const numericValue = parseInt(trimmed, 10);
    if (!isNaN(numericValue) && String(numericValue) === trimmed) {
      // It's a numeric string, convert from 0-indexed to day name
      return DAY_NAMES[numericValue] || '';
    }

    // It's already a day name string (e.g., "Monday")
    return trimmed;
  }

  return '';
}

/**
 * Get the check-in to checkout day range from proposal
 *
 * Priority order:
 * 1. Use explicit check in/out day fields if available (most reliable)
 * 2. Fall back to deriving from Days Selected array
 *
 * Days Selected represents the range from check-in to checkout (inclusive).
 * Check-in = first day, Checkout = last day in the selection.
 *
 * @param {Object} proposal - Proposal object
 * @returns {string|null} "Monday to Friday" format (check-in day to checkout day) or null if unavailable
 */
function getCheckInOutRange(proposal) {
  // Priority 1: Use explicit check-in/check-out day fields if available
  const checkInDay = proposal['check in day'] || proposal['hc check in day'];
  const checkOutDay = proposal['check out day'] || proposal['hc check out day'];

  if (checkInDay != null && checkOutDay != null) {
    const checkInIndex = typeof checkInDay === 'number' ? checkInDay : parseInt(checkInDay, 10);
    const checkOutIndex = typeof checkOutDay === 'number' ? checkOutDay : parseInt(checkOutDay, 10);

    if (!isNaN(checkInIndex) && !isNaN(checkOutIndex) &&
        checkInIndex >= 0 && checkInIndex <= 6 &&
        checkOutIndex >= 0 && checkOutIndex <= 6) {
      return `${DAY_NAMES[checkInIndex]} to ${DAY_NAMES[checkOutIndex]}`;
    }
  }

  // Priority 2: Derive from Days Selected array
  let daysSelected = proposal['Days Selected'] || proposal.hcDaysSelected || [];

  // Parse if it's a JSON string
  if (typeof daysSelected === 'string') {
    try {
      daysSelected = JSON.parse(daysSelected);
    } catch (e) {
      daysSelected = [];
    }
  }

  if (!Array.isArray(daysSelected) || daysSelected.length === 0) {
    return null;
  }

  // Convert to day indices (0-indexed: 0=Sunday through 6=Saturday)
  const dayIndices = daysSelected.map(day => {
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

  if (dayIndices.length === 0) {
    return null;
  }

  const sorted = [...dayIndices].sort((a, b) => a - b);

  // Handle wrap-around case (e.g., Fri, Sat, Sun, Mon = [5, 6, 0, 1])
  const hasLowNumbers = sorted.some(d => d <= 2); // Sun, Mon, Tue
  const hasHighNumbers = sorted.some(d => d >= 4); // Thu, Fri, Sat

  if (hasLowNumbers && hasHighNumbers && sorted.length < 7) {
    // Find gap to determine actual start/end
    let gapIndex = -1;
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] - sorted[i - 1] > 1) {
        gapIndex = i;
        break;
      }
    }

    if (gapIndex !== -1) {
      // Wrapped selection: check-in is after the gap, checkout is before the gap
      const checkInDayIndex = sorted[gapIndex];
      const checkOutDayIndex = sorted[gapIndex - 1];

      return `${DAY_NAMES[checkInDayIndex]} to ${DAY_NAMES[checkOutDayIndex]}`;
    }
  }

  // Standard case (no wrap-around): check-in is first day, checkout is last day
  const checkInDayIndex = sorted[0];
  const checkOutDayIndex = sorted[sorted.length - 1];

  return `${DAY_NAMES[checkInDayIndex]} to ${DAY_NAMES[checkOutDayIndex]}`;
}

/**
 * Get all days with selection status
 * Handles both text day names (from Supabase) and numeric indices (0-indexed format)
 * Note: Database now stores 0-indexed days natively (0=Sunday through 6=Saturday)
 */
function getAllDaysWithSelection(daysSelected) {
  const days = daysSelected || [];

  // Determine if we're dealing with text day names or numeric indices
  const isTextFormat = days.length > 0 && typeof days[0] === 'string';

  if (isTextFormat) {
    // Text format: ["Monday", "Tuesday", "Wednesday", etc.]
    const selectedSet = new Set(days);
    return DAY_LETTERS.map((letter, index) => ({
      index,
      letter,
      selected: selectedSet.has(DAY_NAMES[index])
    }));
  } else {
    // Numeric format: 0-indexed [0, 3, 4, 5, 6] for Sun, Wed-Sat
    const selectedSet = new Set(days);
    return DAY_LETTERS.map((letter, index) => ({
      index,
      letter,
      selected: selectedSet.has(index) // 0-indexed (0=Sunday, 6=Saturday)
    }));
  }
}

/**
 * Parse days selected from proposal for URL context
 * Handles both array and JSON string formats
 * Returns 0-indexed day numbers (0=Sunday through 6=Saturday)
 *
 * @param {Object} proposal - Proposal object
 * @returns {number[]} Array of 0-indexed day numbers
 */
function parseDaysSelectedForContext(proposal) {
  let days = proposal['Days Selected'] || proposal.hcDaysSelected || [];

  // Parse if JSON string
  if (typeof days === 'string') {
    try {
      days = JSON.parse(days);
    } catch (e) {
      return [];
    }
  }

  if (!Array.isArray(days) || days.length === 0) return [];

  // Convert to numbers if needed (days stored as 0-indexed)
  return days.map(d => {
    if (typeof d === 'number') return d;
    if (typeof d === 'string') {
      const trimmed = d.trim();
      const numericValue = parseInt(trimmed, 10);
      // Check if it's a numeric string
      if (!isNaN(numericValue) && String(numericValue) === trimmed) {
        return numericValue;
      }
      // It's a day name - find its 0-indexed position
      const dayIndex = DAY_NAMES.indexOf(trimmed);
      return dayIndex >= 0 ? dayIndex : -1;
    }
    return -1;
  }).filter(d => d >= 0 && d <= 6);
}

/**
 * Get effective reservation span, accounting for counteroffers
 *
 * @param {Object} proposal - Proposal object
 * @returns {number|null} Reservation span in weeks or null if not available
 */
function getEffectiveReservationSpan(proposal) {
  const isCounteroffer = proposal['counter offer happened'];
  return isCounteroffer
    ? proposal['hc reservation span (weeks)']
    : proposal['Reservation Span (Weeks)'];
}

// ============================================================================
// STATUS BANNER - Shows status-specific messages above the card
// ============================================================================

/**
 * Status banner configurations for different proposal states
 * Banner is shown when usualOrder >= 3 OR status is "Proposal Submitted by guest - Awaiting Rental Application"
 *
 * Cascading Override Pattern: If a status matches multiple configs, the more specific one wins.
 * Order of checks: specific status key lookup → usualOrder-based defaults
 *
 * Based on Bubble documentation: Guest Proposals page Proposal Status Bar Conditionals
 */
const STATUS_BANNERS = {
  // Specific status configurations (highest priority)
  'Proposal Submitted by guest - Awaiting Rental Application': {
    text: 'Please complete your rental application.\nThe host will be able to act on your proposal only after your application is submitted.',
    bgColor: '#FBECEC',
    borderColor: '#CC0000',
    textColor: '#CC0000'
  },
  // Suggested proposals by Split Lease agent
  'Proposal Submitted for guest by Split Lease - Awaiting Rental Application': {
    type: 'suggested',
    text: '💡 Suggested Proposal — Complete Your Application\nYou confirmed this suggestion. Please submit your rental application to proceed.',
    bgColor: '#F3E8FF',
    borderColor: '#4B0082',
    textColor: '#4B0082'
  },
  'Proposal Submitted for guest by Split Lease - Pending Confirmation': {
    type: 'suggested',
    text: '⚡ Pending Your Acceptance\nA Split Lease Agent suggested this listing for you. Review and confirm to proceed.',
    bgColor: '#FEF3C7',
    borderColor: '#D97706',
    textColor: '#92400E'
  },
  'Rental Application Submitted': {
    text: 'Application Submitted!\nAwaiting host review.',
    bgColor: '#EBF5FF',
    borderColor: '#3B82F6',
    textColor: '#1D4ED8'
  },
  'Host Counteroffer Submitted / Awaiting Guest Review': {
    text: 'Host has submitted a counteroffer.\nReview the new terms below.',
    bgColor: '#FEF3C7',
    borderColor: '#F59E0B',
    textColor: '#92400E'
  },
  // usualOrder >= 3: Accepted states - text varies based on counteroffer
  'Proposal or Counteroffer Accepted / Drafting Lease Documents': {
    type: 'accepted',
    text: 'Proposal Accepted!\nSplit Lease is Drafting Lease Documents',
    // Alternative text when counteroffer: 'Host terms Accepted!\nLease Documents being prepared.'
    bgColor: '#E1FFE1',
    borderColor: '#1E561A',
    textColor: '#1BA54E'
  },
  'Reviewing Documents': {
    text: 'Documents Ready for Review',
    bgColor: '#EBF5FF',
    borderColor: '#3B82F6',
    textColor: '#1D4ED8'
  },
  'Lease Documents Sent for Review': {
    text: 'Lease Documents Draft prepared.\nPlease review and comment.',
    bgColor: '#E1FFE1',
    borderColor: '#1E561A',
    textColor: '#1BA54E'
  },
  'Lease Documents Sent for Signatures': {
    text: 'Check your email for legally submitted documents.',
    bgColor: '#E1FFE1',
    borderColor: '#1E561A',
    textColor: '#1BA54E'
  },
  'Lease Documents Signed / Awaiting Initial payment': {
    text: 'Lease Documents signed.\nSubmit payment to activate your lease.',
    bgColor: '#E1FFE1',
    borderColor: '#1E561A',
    textColor: '#1BA54E'
  },
  // Legacy key format
  'Lease Signed / Awaiting Initial Payment': {
    text: 'Lease Signed!\nSubmit initial payment to activate.',
    bgColor: '#E1FFE1',
    borderColor: '#1E561A',
    textColor: '#1BA54E'
  },
  'Initial Payment Submitted / Lease activated': {
    text: 'Your lease agreement is now officially signed.\nFor details, please visit the lease section of your account.',
    bgColor: '#E1FFE1',
    borderColor: '#1E561A',
    textColor: '#1BA54E'
  },
  // Terminal states
  'Proposal Cancelled by Split Lease': {
    type: 'cancelled',
    bgColor: '#FBECEC',
    borderColor: '#D34337',
    textColor: '#CC0000'
  },
  'Proposal Cancelled by Guest': {
    type: 'cancelled_by_guest',
    bgColor: '#F3F4F6',
    borderColor: '#9CA3AF',
    textColor: '#6B7280'
  },
  'Proposal Rejected by Host': {
    type: 'rejected',
    bgColor: '#FBECEC',
    borderColor: '#D34337',
    textColor: '#CC0000'
  },
  'Expired': {
    text: 'This proposal has expired.',
    bgColor: '#F3F4F6',
    borderColor: '#9CA3AF',
    textColor: '#6B7280'
  }
};

/**
 * Default banner config based on usualOrder (fallback when no specific config)
 */
function getDefaultBannerConfig(status, usualOrder) {
  // Default blue banner for active statuses with usualOrder >= 3
  if (usualOrder >= 3 && usualOrder < 99) {
    return {
      text: status,
      bgColor: '#EBF5FF',
      borderColor: '#3B82F6',
      textColor: '#1D4ED8'
    };
  }
  return null;
}

/**
 * Get status icon for the banner
 */
function getStatusIcon(config) {
  if (config.type === 'cancelled' || config.type === 'rejected' || config.type === 'cancelled_by_guest') {
    return '✕';
  }
  if (config.type === 'accepted') {
    return '✓';
  }
  if (config.type === 'suggested') {
    return '💡';
  }
  // Default icons based on color
  if (config.bgColor === '#FBECEC' || config.borderColor === '#CC0000') {
    return '!';
  }
  if (config.bgColor === '#ecfdf5' || config.bgColor?.includes('ecfdf5')) {
    return '✓';
  }
  return 'i';
}

/**
 * Get banner variant class
 */
function getBannerVariant(config) {
  if (config.type === 'cancelled' || config.type === 'rejected' || config.type === 'cancelled_by_guest') {
    return 'cancelled';
  }
  if (config.type === 'accepted' || config.bgColor === '#ecfdf5') {
    return 'success';
  }
  if (config.bgColor === '#fef3c7') {
    return 'attention';
  }
  return '';
}

function StatusBanner({ status, cancelReason, isCounteroffer }) {
  // Normalize status for lookup (handle trailing spaces from Bubble)
  const normalizedStatus = typeof status === 'string' ? status.trim() : status;

  // Check if banner should be shown based on usualOrder >= 3 OR specific status
  if (!shouldShowStatusBanner(normalizedStatus)) return null;

  // Get specific config or fall back to default
  let config = STATUS_BANNERS[normalizedStatus];
  if (!config) {
    const usualOrder = getUsualOrder(normalizedStatus);
    config = getDefaultBannerConfig(normalizedStatus, usualOrder);
  }

  if (!config) return null;

  const displayText = config.text;
  let strongText = '';
  let detailText = '';

  // Handle different banner types
  switch (config.type) {
    case 'cancelled':
      // Hide banner entirely if no reason is provided for Split Lease cancellation
      if (!cancelReason) return null;
      strongText = 'Proposal Cancelled by Split Lease';
      detailText = `Reason: ${cancelReason}`;
      break;
    case 'cancelled_by_guest':
      strongText = 'Proposal Cancelled';
      detailText = cancelReason ? `Reason: ${cancelReason}` : 'You cancelled this proposal.';
      break;
    case 'rejected':
      strongText = 'Proposal Declined';
      detailText = cancelReason ? `Reason: ${cancelReason}` : 'This proposal was declined by the host.';
      break;
    case 'accepted':
      strongText = isCounteroffer ? 'Host terms Accepted' : 'Proposal Accepted';
      detailText = 'Lease Documents being prepared.';
      break;
    case 'suggested':
      strongText = 'Suggested Proposal';
      detailText = 'This proposal was suggested by a Split Lease Agent on your behalf.';
      break;
    default:
      // Parse text for strong/detail parts
      if (displayText && displayText.includes('\n')) {
        const parts = displayText.split('\n');
        strongText = parts[0];
        detailText = parts.slice(1).join(' ');
      } else {
        strongText = displayText || '';
      }
      break;
  }

  const icon = getStatusIcon(config);
  const variant = getBannerVariant(config);

  return (
    <div className={`status-banner ${variant}`}>
      <span className="status-icon">{icon}</span>
      <div className="status-text">
        <strong>{strongText}</strong>
        {detailText && ` — ${detailText}`}
      </div>
    </div>
  );
}

// ============================================================================
// PROGRESS TRACKER (inline version matching Bubble's horizontal timeline)
// ============================================================================

/**
 * Get dynamic stage labels based on status and rental app submission state
 * Labels change to reflect completion (e.g., "Host Review" -> "Host Review Complete")
 * Stage 2 shows "Submit Rental Application" when rental app not submitted
 *
 * @param {string} status - Proposal status
 * @param {Object} proposal - Proposal object to check rental application status
 */
function getStageLabels(status, proposal = {}) {
  // Check if rental application is submitted by checking the proposal and user
  const hasRentalApp = proposal['rental application'] || proposal?.user?.['rental application'];

  const baseLabels = [
    'Proposal Submitted',
    hasRentalApp ? 'Rental App Submitted' : 'Submit Rental Application',
    'Host Review',
    'Review Documents',
    'Lease Documents',
    'Initial Payment'
  ];

  if (!status) return baseLabels;

  // Normalize status for comparison
  const normalizedStatus = typeof status === 'string' ? status.trim() : status;

  // Customize based on status
  if (normalizedStatus.includes('Accepted') || normalizedStatus.includes('Drafting')) {
    baseLabels[2] = 'Host Review Complete';
    baseLabels[3] = 'Drafting Lease Docs';
  }

  if (normalizedStatus.includes('Counteroffer')) {
    baseLabels[2] = 'Counteroffer Pending';
  }

  if (normalizedStatus.includes('Lease Documents Sent')) {
    baseLabels[2] = 'Host Review Complete';
    baseLabels[3] = 'Docs Reviewed';
  }

  if (normalizedStatus.includes('Payment Submitted') || normalizedStatus.includes('activated')) {
    baseLabels[2] = 'Host Review Complete';
    baseLabels[3] = 'Docs Reviewed';
    baseLabels[4] = 'Lease Signed';
  }

  return baseLabels;
}

const PROGRESS_STAGES = [
  { id: 1, label: 'Proposal Submitted' },
  { id: 2, label: 'Rental App Submitted' },
  { id: 3, label: 'Host Review' },
  { id: 4, label: 'Review Documents' },
  { id: 5, label: 'Lease Documents' },
  { id: 6, label: 'Initial Payment' }
];

/**
 * Color constants for progress tracker
 * Based on Bubble documentation: Guest Proposals page Progress Bar Status Conditionals
 */
const PROGRESS_COLORS = {
  purple: '#6D31C2',    // Completed stage
  green: '#1F8E16',     // Current/Active stage (action needed)
  red: '#DB2E2E',       // Cancelled/Rejected
  lightPurple: '#B6B7E9', // Pending/Waiting state
  gray: '#DEDEDE',      // Inactive/Future stage
  labelGray: '#9CA3AF'  // Inactive label color
};

/**
 * Per-stage color calculation based on Bubble documentation
 * Each stage has specific conditions for being green (active), purple (completed), or red (terminal)
 *
 * @param {number} stageIndex - 0-indexed stage number
 * @param {string} status - Proposal status
 * @param {number} usualOrder - The usual order from status config
 * @param {boolean} isTerminal - Whether proposal is cancelled/rejected
 * @param {Object} proposal - Full proposal object for additional field checks
 * @returns {string} Hex color for the stage
 */
function getStageColor(stageIndex, status, usualOrder, isTerminal, proposal = {}) {
  // Terminal statuses: ALL stages turn red
  if (isTerminal) {
    return PROGRESS_COLORS.red;
  }

  const normalizedStatus = typeof status === 'string' ? status.trim() : status;
  const hasRentalApp = proposal['rental application'];
  const guestDocsFinalized = proposal['guest documents review finalized?'];

  // Stage 1: Proposal Submitted - Always purple (completed) once proposal exists
  if (stageIndex === 0) {
    return PROGRESS_COLORS.purple;
  }

  // Stage 2: Rental App Submitted
  if (stageIndex === 1) {
    // Green when awaiting rental app - these statuses mean rental app is NOT yet submitted
    if (normalizedStatus === 'Proposal Submitted by guest - Awaiting Rental Application' ||
        normalizedStatus === 'Proposal Submitted for guest by Split Lease - Awaiting Rental Application' ||
        normalizedStatus === 'Proposal Submitted for guest by Split Lease - Pending Confirmation' ||
        normalizedStatus === 'Pending' ||
        normalizedStatus === 'Pending Confirmation') {
      return PROGRESS_COLORS.green;
    }
    // Purple when rental app has been submitted (status moved past awaiting rental app)
    if (hasRentalApp ||
        normalizedStatus === 'Rental Application Submitted' ||
        normalizedStatus === 'Host Review' ||
        normalizedStatus.includes('Counteroffer') ||
        normalizedStatus.includes('Accepted') ||
        normalizedStatus.includes('Lease Documents') ||
        normalizedStatus.includes('Payment') ||
        normalizedStatus.includes('activated')) {
      return PROGRESS_COLORS.purple;
    }
    return PROGRESS_COLORS.gray;
  }

  // Stage 3: Host Review
  if (stageIndex === 2) {
    // Green when actively in host review with rental app submitted
    if (normalizedStatus === 'Host Review' && hasRentalApp) {
      return PROGRESS_COLORS.green;
    }
    // Green when counteroffer awaiting review
    if (normalizedStatus === 'Host Counteroffer Submitted / Awaiting Guest Review') {
      return PROGRESS_COLORS.green;
    }
    // Purple when host review is complete (proposal accepted or further along)
    if (normalizedStatus.includes('Accepted') ||
        normalizedStatus.includes('Drafting') ||
        normalizedStatus.includes('Lease Documents') ||
        normalizedStatus.includes('Payment') ||
        normalizedStatus.includes('activated')) {
      return PROGRESS_COLORS.purple;
    }
    // Gray for all other cases (including awaiting rental app)
    return PROGRESS_COLORS.gray;
  }

  // Stage 4: Review Documents
  if (stageIndex === 3) {
    // Green when lease documents sent for review
    if (normalizedStatus === 'Lease Documents Sent for Review') {
      return PROGRESS_COLORS.green;
    }
    // Light purple when guest documents review finalized (waiting state)
    if (guestDocsFinalized) {
      return PROGRESS_COLORS.lightPurple;
    }
    // Purple when past this stage
    if (usualOrder >= 5) {
      return PROGRESS_COLORS.purple;
    }
    return PROGRESS_COLORS.gray;
  }

  // Stage 5: Lease Documents
  if (stageIndex === 4) {
    // Green when sent for signatures
    if (normalizedStatus === 'Lease Documents Sent for Signatures') {
      return PROGRESS_COLORS.green;
    }
    // Purple when past this stage
    if (usualOrder >= 6) {
      return PROGRESS_COLORS.purple;
    }
    return PROGRESS_COLORS.gray;
  }

  // Stage 6: Initial Payment
  if (stageIndex === 5) {
    // Green when awaiting initial payment
    if (normalizedStatus === 'Lease Documents Signed / Awaiting Initial payment' ||
        normalizedStatus === 'Lease Signed / Awaiting Initial Payment') {
      return PROGRESS_COLORS.green;
    }
    // Purple when lease activated
    if (isCompletedStatus(normalizedStatus)) {
      return PROGRESS_COLORS.purple;
    }
    return PROGRESS_COLORS.gray;
  }

  return PROGRESS_COLORS.gray;
}

function InlineProgressTracker({ status, usualOrder = 0, isTerminal = false, stageLabels = null, proposal = {} }) {
  const labels = stageLabels || PROGRESS_STAGES.map(s => s.label);

  return (
    <div className="progress-row">
      {PROGRESS_STAGES.map((stage, index) => {
        const stageColor = getStageColor(index, status, usualOrder, isTerminal, proposal);
        const prevStageColor = index > 0 ? getStageColor(index - 1, status, usualOrder, isTerminal, proposal) : null;
        const isCurrent = stageColor === PROGRESS_COLORS.current;
        const isCompleted = stageColor === PROGRESS_COLORS.completed;
        const isCancelled = stageColor === PROGRESS_COLORS.cancelled;

        // Connector color: completed (primary purple) ONLY if previous dot is completed
        const _connectorColor = prevStageColor === PROGRESS_COLORS.completed
          ? PROGRESS_COLORS.completed
          : prevStageColor === PROGRESS_COLORS.cancelled
            ? PROGRESS_COLORS.cancelled
            : PROGRESS_COLORS.future;

        // Determine step state class
        let stepClass = 'progress-step';
        if (isCompleted) stepClass += ' completed';
        if (isCurrent) stepClass += ' current';
        if (isCancelled) stepClass += ' cancelled';

        const labelColor = stageColor !== PROGRESS_COLORS.future ? stageColor : PROGRESS_COLORS.labelGray;

        return (
          <div key={stage.id} className={stepClass}>
            <div
              className="progress-dot"
              style={{
                backgroundColor: stageColor,
                ...(isCurrent && { boxShadow: '0 0 0 4px rgba(109, 49, 194, 0.15)' })
              }}
            />
            <span className="progress-label" style={{ color: labelColor }}>
              {labels[index] || stage.label}
            </span>
            {/* Connector line after label (except last) */}
            {index < PROGRESS_STAGES.length - 1 && (
              <div
                className="progress-line"
                style={{ backgroundColor: isCompleted ? PROGRESS_COLORS.completed : PROGRESS_COLORS.future }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ProposalCard({ proposal, statusConfig, buttonConfig, allProposals = [], onProposalSelect, onProposalDeleted }) {
  // ============================================================================
  // ALL HOOKS MUST BE DECLARED FIRST (React Rules of Hooks)
  // ============================================================================

  // House rules toggle state
  const [showHouseRules, setShowHouseRules] = useState(false);
  // Host profile modal state
  const [showHostProfileModal, setShowHostProfileModal] = useState(false);
  // Proposal details modal state (GuestEditingProposalModal)
  const [showProposalDetailsModal, setShowProposalDetailsModal] = useState(false);
  // Initial view for the proposal details modal ('pristine' | 'editing' | 'general' | 'cancel')
  const [proposalDetailsModalInitialView, setProposalDetailsModalInitialView] = useState('pristine');
  // Virtual Meeting Manager modal state
  const [showVMModal, setShowVMModal] = useState(false);
  const [vmInitialView, setVmInitialView] = useState('');
  // Map modal state
  const [showMapModal, setShowMapModal] = useState(false);
  // Cancel proposal modal state
  const [showCancelModal, setShowCancelModal] = useState(false);
  // Not Interested modal state (for SL-suggested proposals)
  const [showNotInterestedModal, setShowNotInterestedModal] = useState(false);
  const [isNotInterestedProcessing, setIsNotInterestedProcessing] = useState(false);
  // Delete proposal loading state
  const [isDeleting, setIsDeleting] = useState(false);
  // Confirm proposal loading state (for SL-suggested proposals)
  const [isConfirming, setIsConfirming] = useState(false);

  // VM button configuration - memoized based on virtualMeeting state
  const virtualMeeting = proposal?.virtualMeeting;
  const currentUserId = proposal?.Guest;
  const status = proposal?.Status;

  const vmConfig = useMemo(() => {
    // Conditional 7-8: Check status-based hiding first
    if (!status || shouldHideVirtualMeetingButton(status)) {
      return { visible: false };
    }

    // No VM exists - request new meeting
    if (!virtualMeeting) {
      return {
        visible: true,
        view: 'request',
        disabled: false,
        label: 'Request Virtual Meeting',
        className: 'btn-vm-request'
      };
    }

    // Conditional 6: VM declined - can request alternative times
    if (virtualMeeting['meeting declined'] === true) {
      return {
        visible: true,
        view: 'request',
        disabled: false,
        label: 'Virtual Meeting Declined',
        className: 'btn-vm-declined',
        style: { color: '#DB2E2E', fontWeight: 'bold' }
      };
    }

    // Conditional 5: Meeting confirmed by Split Lease - show details
    if (virtualMeeting['booked date'] && virtualMeeting['confirmedBySplitLease'] === true) {
      return {
        visible: true,
        view: 'details',
        disabled: false,
        label: 'Meeting confirmed',
        className: 'btn-vm-confirmed'
      };
    }

    // Conditional 4: Meeting accepted but awaiting SL confirmation
    if (virtualMeeting['booked date'] && !virtualMeeting['confirmedBySplitLease']) {
      return {
        visible: true,
        view: 'details',
        disabled: true,
        label: 'Virtual Meeting Accepted',
        className: 'btn-vm-accepted'
      };
    }

    // Conditional 2: Current user requested - waiting for response
    if (virtualMeeting['requested by'] === currentUserId) {
      return {
        visible: true,
        view: null,
        disabled: true,
        label: 'Virtual Meeting Requested',
        className: 'btn-vm-requested'
      };
    }

    // Conditional 1: Other party requested - respond
    if (virtualMeeting['requested by'] && virtualMeeting['requested by'] !== currentUserId) {
      return {
        visible: true,
        view: 'respond',
        disabled: false,
        label: 'Respond to Virtual Meeting Request',
        className: 'btn-vm-respond'
      };
    }

    // Default fallback - can request new meeting
    return {
      visible: true,
      view: 'request',
      disabled: false,
      label: 'Request Virtual Meeting',
      className: 'btn-vm-request'
    };
  }, [virtualMeeting, currentUserId, status]);

  // ============================================================================
  // EARLY RETURN (after all hooks)
  // ============================================================================
  if (!proposal) {
    return null;
  }

  const listing = proposal.listing;
  const host = listing?.host;

  // Extract location for map modal
  // Priority: 'Location - slightly different address' (privacy) → 'Location - Address' (fallback)
  const getListingAddress = () => {
    if (!listing) return null;

    // Try 'Location - slightly different address' first (privacy-adjusted)
    let locationData = listing['Location - slightly different address'];
    if (!locationData) {
      // Fallback to main address
      locationData = listing['Location - Address'];
    }

    if (!locationData) return null;

    // Parse if it's a JSON string
    if (typeof locationData === 'string') {
      try {
        locationData = JSON.parse(locationData);
      } catch (e) {
        console.warn('ProposalCard: Failed to parse location data:', e);
        return null;
      }
    }

    // Return the address string from the JSONB object
    return locationData?.address || null;
  };

  const _mapAddress = getListingAddress();

  // Extract data
  const listingName = listing?.Name || 'Listing';
  const location = [listing?.hoodName, listing?.boroughName]
    .filter(Boolean)
    .join(', ') || 'New York';

  const photoUrl = listing?.featuredPhotoUrl ||
    (listing?.['Features - Photos']?.[0]) ||
    null;

  const hostName = host?.['Name - First'] || host?.['Name - Full'] || 'Host';
  const _hostPhoto = host?.['Profile Photo'];

  // Schedule info
  // Handle double-encoded JSONB: "Days Selected" may come as a JSON string that needs parsing
  let daysSelected = proposal['Days Selected'] || proposal.hcDaysSelected || [];
  if (typeof daysSelected === 'string') {
    try {
      daysSelected = JSON.parse(daysSelected);
    } catch (e) {
      console.warn('ProposalCard: Failed to parse Days Selected:', e);
      daysSelected = [];
    }
  }
  const allDays = getAllDaysWithSelection(daysSelected);
  const nightsPerWeek = proposal['nights per week (num)'] || daysSelected.length;
  const reservationWeeks = proposal['Reservation Span (Weeks)'] || proposal['hc reservation span (weeks)'] || 4;
  const checkInOutRange = getCheckInOutRange(proposal);

  // Pricing
  const isCounteroffer = proposal['counter offer happened'];
  const nightlyPrice = isCounteroffer
    ? proposal['hc nightly price']
    : proposal['proposal nightly price'];
  const totalPrice = isCounteroffer
    ? proposal['hc total price']
    : proposal['Total Price for Reservation (guest)'];
  // Original price (before counteroffer) for strikethrough display
  const originalTotalPrice = isCounteroffer
    ? proposal['Total Price for Reservation (guest)']
    : null;
  const cleaningFee = proposal['cleaning fee'] || 0;
  const _damageDeposit = proposal['damage deposit'] || 0;

  // Move-in/move-out dates
  const moveInStart = proposal['Move in range start'];
  const moveInEnd = proposal['Move in range end'];
  const anticipatedMoveIn = formatDate(moveInStart);
  const _anticipatedMoveOut = formatDate(moveInEnd);

  // Check-in/out times
  const checkInTime = listing?.['Check in time'] || '2:00 pm';
  const checkOutTime = listing?.['Check Out time'] || '11:00 am';

  // House rules - use resolved names from query layer (stored on proposal, not listing)
  const houseRules = proposal.houseRules || [];
  const hasHouseRules = Array.isArray(houseRules) && houseRules.length > 0;

  // Status and progress - derive dynamically from statusConfig
  const currentStatusConfig = statusConfig || getStatusConfig(status);
  const _currentStageIndex = (currentStatusConfig?.stage || 1) - 1; // Convert 1-indexed to 0-indexed
  const _statusColor = currentStatusConfig?.color || 'blue';
  const isTerminal = isTerminalStatus(status);
  const isCompleted = isCompletedStatus(status);
  const stageLabels = getStageLabels(status, proposal);

  // Warning: some nights unavailable
  const someNightsUnavailable = proposal['some nights unavailable'];

  // Cancel reason (for cancelled proposals)
  const cancelReason = proposal['Cancelled Reason'] || proposal['reason for cancellation'];

  // Construct current user object for VirtualMeetingManager
  const currentUser = {
    _id: currentUserId,
    typeUserSignup: 'guest'
  };

  // Handler for opening proposal details modal
  const _openProposalModal = () => {
    setShowProposalDetailsModal(true);
  };

  // Handler for closing proposal details modal
  const _closeProposalModal = () => {
    setShowProposalDetailsModal(false);
  };

  // Handler for opening cancel proposal modal
  const openCancelModal = () => {
    setShowCancelModal(true);
  };

  // Handler for closing cancel proposal modal
  const closeCancelModal = () => {
    setShowCancelModal(false);
  };

  // Handler for confirming proposal cancellation
  const handleCancelConfirm = async (reason) => {
    console.log('[ProposalCard] Cancel confirmed with reason:', reason);
    // TODO: Implement actual cancel API call here
    closeCancelModal();
  };

  // Handler for opening Not Interested modal
  const openNotInterestedModal = () => {
    setShowNotInterestedModal(true);
  };

  // Handler for closing Not Interested modal
  const closeNotInterestedModal = () => {
    if (!isNotInterestedProcessing) {
      setShowNotInterestedModal(false);
    }
  };

  // Handler for confirming Not Interested (marks proposal as deleted with optional feedback)
  const handleNotInterestedConfirm = async (feedback) => {
    if (!proposal?._id || isNotInterestedProcessing) return;

    setIsNotInterestedProcessing(true);
    try {
      await dismissProposal(proposal._id, feedback);
      console.log('[ProposalCard] Proposal marked as not interested');
      showToast({ title: 'Proposal dismissed', type: 'info' });

      // Close modal first
      setShowNotInterestedModal(false);

      // Update UI state without page reload
      if (onProposalDeleted) {
        onProposalDeleted(proposal._id);
      }
    } catch (error) {
      console.error('[ProposalCard] Error dismissing proposal:', error);
      showToast({ title: 'Failed to dismiss proposal', content: error.message, type: 'error' });
    } finally {
      setIsNotInterestedProcessing(false);
    }
  };

  // Handler for confirm proposal (SL-suggested proposals)
  const handleConfirmProposal = async () => {
    if (!proposal?._id || isConfirming) return;

    if (!canConfirmSuggestedProposal(proposal)) {
      showToast({ title: 'Cannot confirm this proposal', type: 'error' });
      return;
    }

    setIsConfirming(true);
    try {
      const nextStatus = getNextStatusAfterConfirmation(proposal);

      const { error } = await supabase
        .from('proposal')
        .update({
          Status: nextStatus,
          'Modified Date': new Date().toISOString()
        })
        .eq('_id', proposal._id);

      if (error) {
        console.error('[ProposalCard] Error confirming proposal:', error);
        throw new Error(error.message || 'Failed to confirm proposal');
      }

      console.log('[ProposalCard] Proposal confirmed, new status:', nextStatus);
      showToast({ title: 'Proposal confirmed!', type: 'success' });

      // Reload page to show updated status and CTAs
      window.location.reload();
    } catch (error) {
      console.error('[ProposalCard] Error confirming proposal:', error);
      showToast({ title: 'Failed to confirm proposal', content: error.message, type: 'error' });
      setIsConfirming(false);
    }
  };

  // Handler for delete proposal (soft-delete for already-cancelled proposals)
  const handleDeleteProposal = async () => {
    if (!proposal?._id || isDeleting) return;

    setIsDeleting(true);
    try {
      await executeDeleteProposal(proposal._id);
      console.log('[ProposalCard] Proposal deleted successfully');
      // Show toast notification (info type for neutral confirmation)
      showToast({ title: 'Proposal deleted', type: 'info' });

      // Update UI state without page reload
      if (onProposalDeleted) {
        onProposalDeleted(proposal._id);
      }
    } catch (error) {
      console.error('[ProposalCard] Error deleting proposal:', error);
      showToast({ title: 'Failed to delete proposal', content: error.message, type: 'error' });
      setIsDeleting(false);
    }
  };

  // Handler for VM button click
  const handleVMButtonClick = () => {
    if (vmConfig.view && !vmConfig.disabled) {
      setVmInitialView(vmConfig.view);
      setShowVMModal(true);
    }
  };

  // Handler for VM modal close
  const handleVMModalClose = () => {
    setShowVMModal(false);
    setVmInitialView('');
  };

  // Handler for successful VM action
  const handleVMSuccess = () => {
    // Reload page to get fresh VM data
    window.location.reload();
  };

  // Calculate days summary for display
  const selectedDaysCount = daysSelected.length;

  return (
    <div className="proposal-card-wrapper">
      {/* Detail Section Container */}
      <div className="detail-section">
        {/* Status Banner - shows for accepted/counteroffer/cancelled states */}
        <StatusBanner status={status} cancelReason={cancelReason} isCounteroffer={isCounteroffer} />

        {/* Detail Header */}
        <div className="detail-header">
          {photoUrl ? (
            <img src={photoUrl} className="detail-image" alt="" />
          ) : (
            <div className="detail-image" style={{ backgroundColor: 'var(--gp-border-light)' }} />
          )}
          <div className="detail-title-area">
            <div className="detail-title">{listingName}</div>
            <div className="detail-location">{location}</div>
          </div>
          <div className="detail-host">
            <div className="host-name">{hostName}</div>
            <div className="host-label">Host</div>
          </div>
        </div>

        {/* Quick Links Row */}
        <div className="links-row">
          <a
            href={getListingUrlWithProposalContext(listing?._id, {
              daysSelected: parseDaysSelectedForContext(proposal),
              reservationSpan: getEffectiveReservationSpan(proposal),
              moveInDate: proposal['Move in range start']
            })}
            className="link-item"
            target="_blank"
            rel="noopener noreferrer"
          >
            View Listing
          </a>
          <button
            className="link-item"
            onClick={() => setShowMapModal(true)}
          >
            Map
          </button>
          <button
            className="link-item"
            onClick={() => navigateToMessaging(host?._id, proposal._id)}
          >
            Message Host
          </button>
          <button
            className="link-item"
            onClick={() => setShowHostProfileModal(true)}
          >
            Host Profile
          </button>
          {hasHouseRules && (
            <button
              className="link-item"
              onClick={() => setShowHouseRules(!showHouseRules)}
            >
              {showHouseRules ? 'Hide Rules' : 'House Rules'}
            </button>
          )}
        </div>

        {/* House Rules Grid - conditionally shown */}
        {showHouseRules && hasHouseRules && (
          <div className="house-rules-grid" style={{ padding: '16px 24px', borderBottom: '1px solid var(--gp-border-light)' }}>
            {houseRules.map((rule, index) => (
              <div key={index} className="house-rule-badge">
                {rule}
              </div>
            ))}
          </div>
        )}

        {/* Info Grid */}
        <div className="info-grid">
          <div className="info-item">
            <div className="info-label">Ideal Move-in</div>
            <div className="info-value">{anticipatedMoveIn || 'TBD'}</div>
          </div>
          <div className="info-item">
            <div className="info-label">Duration</div>
            <div className="info-value">{reservationWeeks} weeks</div>
          </div>
          <div className="info-item">
            <div className="info-label">Schedule</div>
            <div className="info-value">{checkInOutRange || 'Flexible'}</div>
          </div>
          <div className="info-item">
            <div className="info-label">Nights/week</div>
            <div className="info-value">{nightsPerWeek} nights</div>
          </div>
        </div>

        {/* Days Row */}
        <div className="days-row">
          <span className="days-label">Schedule</span>
          <div className="days-pills">
            {allDays.map((day) => (
              <div
                key={day.index}
                className={`day-pill ${day.selected ? 'selected' : ''}`}
              >
                {day.letter}
              </div>
            ))}
          </div>
          <div className="days-info">
            <div className="days-count">
              {selectedDaysCount} days, {nightsPerWeek} nights Selected
              {someNightsUnavailable && (
                <span
                  className="nights-unavailable-warning"
                  title="Some selected nights are no longer available"
                  style={{ color: 'var(--gp-danger)', marginLeft: '8px' }}
                >
                  ⚠
                </span>
              )}
            </div>
            <div className="days-range">Check-in {checkInTime}, Check-out {checkOutTime}</div>
          </div>
        </div>

        {/* Pricing Row */}
        <div className="pricing-row">
          <div className="pricing-breakdown">
            <span>{formatPrice(nightlyPrice)}/night</span>
            <span>×</span>
            <span>{nightsPerWeek} nights</span>
            <span>×</span>
            <span>{reservationWeeks} weeks</span>
            {cleaningFee > 0 && (
              <>
                <span>+</span>
                <span>{formatPrice(cleaningFee)} fee</span>
              </>
            )}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="pricing-total-label">
              Reservation Estimated Total
              {originalTotalPrice && (
                <span style={{ marginLeft: '8px', color: 'var(--gp-text-muted)', textDecoration: 'line-through' }}>
                  {formatPrice(originalTotalPrice)}
                </span>
              )}
            </div>
            <div className="pricing-total">{formatPrice(totalPrice)}</div>
          </div>
        </div>

        {/* Progress Tracker */}
        <InlineProgressTracker
          status={status}
          usualOrder={currentStatusConfig?.usualOrder || 0}
          stageLabels={stageLabels}
          isTerminal={isTerminal}
          proposal={proposal}
        />

        {/* Actions Row */}
        <div className="actions-row">
          {/* VM status as text label (for waiting/requested states) */}
          {vmConfig.visible && vmConfig.disabled && (
            <span className={`btn-vm-text ${vmConfig.className === 'btn-vm-requested' ? 'waiting' : ''}`}>
              {vmConfig.label}
            </span>
          )}

          {/* Primary action button (Guest Action 1) */}
          {buttonConfig?.guestAction1?.visible && (
            buttonConfig.guestAction1.action === 'go_to_leases' ? (
              <a href="/my-leases" className="btn btn-primary">
                {buttonConfig.guestAction1.label}
              </a>
            ) : (
              <button
                className={`btn ${
                  buttonConfig.guestAction1.action === 'delete_proposal' ? 'btn-danger' :
                  'btn-primary'
                }`}
                disabled={buttonConfig.guestAction1.action === 'confirm_proposal' && isConfirming}
                onClick={() => {
                  if (buttonConfig.guestAction1.action === 'modify_proposal') {
                    setProposalDetailsModalInitialView('pristine');
                    setShowProposalDetailsModal(true);
                  } else if (buttonConfig.guestAction1.action === 'submit_rental_app') {
                    goToRentalApplication(proposal._id);
                  } else if (buttonConfig.guestAction1.action === 'delete_proposal') {
                    handleDeleteProposal();
                  } else if (buttonConfig.guestAction1.action === 'confirm_proposal') {
                    handleConfirmProposal();
                  }
                }}
              >
                {buttonConfig.guestAction1.label}
              </button>
            )
          )}

          {/* VM action button (only when actionable, not disabled) */}
          {vmConfig.visible && !vmConfig.disabled && (
            <button
              className="btn btn-outline"
              onClick={handleVMButtonClick}
            >
              {vmConfig.view === 'request' ? 'Schedule Meeting' : vmConfig.label}
            </button>
          )}

          {/* Guest Action 2 (secondary action) */}
          {buttonConfig?.guestAction2?.visible && (
            <button
              className={`btn ${buttonConfig.guestAction2.action === 'reject_suggestion' ? 'btn-not-interested' : 'btn-outline'}`}
              onClick={() => {
                if (buttonConfig.guestAction2.action === 'see_details') {
                  setProposalDetailsModalInitialView('pristine');
                  setShowProposalDetailsModal(true);
                } else if (buttonConfig.guestAction2.action === 'submit_rental_app') {
                  goToRentalApplication(proposal._id);
                } else if (buttonConfig.guestAction2.action === 'reject_suggestion') {
                  openNotInterestedModal();
                }
              }}
            >
              {buttonConfig.guestAction2.label}
            </button>
          )}

          {/* Edit button (always show if not terminal/completed) */}
          {!isTerminal && !isCompleted && (
            <button
              className="btn btn-ghost"
              onClick={() => {
                setProposalDetailsModalInitialView('pristine');
                setShowProposalDetailsModal(true);
              }}
            >
              Edit
            </button>
          )}

          {/* Cancel/Delete button */}
          {buttonConfig?.cancelButton?.visible && (
            <button
              className={`btn ${
                buttonConfig.cancelButton.action === 'delete_proposal' ? 'btn-danger' :
                buttonConfig.cancelButton.action === 'see_house_manual' ? 'btn-ghost' :
                'btn-danger'
              }`}
              disabled={buttonConfig.cancelButton.disabled}
              onClick={() => {
                if (buttonConfig.cancelButton.action === 'delete_proposal') {
                  handleDeleteProposal();
                } else if (
                  buttonConfig.cancelButton.action === 'cancel_proposal' ||
                  buttonConfig.cancelButton.action === 'reject_counteroffer' ||
                  buttonConfig.cancelButton.action === 'reject_proposal'
                ) {
                  openCancelModal();
                }
              }}
            >
              {buttonConfig.cancelButton.label}
            </button>
          )}

          {/* Fallback cancel button if no buttonConfig */}
          {!buttonConfig && !isTerminal && !isCompleted && (
            <button className="btn btn-danger" onClick={openCancelModal}>
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Host Profile Modal */}
      {showHostProfileModal && (
        <HostProfileModal
          host={host}
          listing={listing}
          onClose={() => setShowHostProfileModal(false)}
        />
      )}

      {/* Proposal Details Modal (GuestEditingProposalModal) */}
      {showProposalDetailsModal && (
        <GuestEditingProposalModal
          proposal={proposal}
          listing={listing}
          user={{ type: 'guest' }}
          initialView={proposalDetailsModalInitialView}
          isVisible={showProposalDetailsModal}
          onClose={() => {
            setShowProposalDetailsModal(false);
            setProposalDetailsModalInitialView('pristine'); // Reset for next open
          }}
          onProposalCancel={(reason) => {
            // Handle cancellation - reload page to show updated status
            console.log('Proposal cancelled with reason:', reason);
            setShowProposalDetailsModal(false);
            setProposalDetailsModalInitialView('pristine');
            window.location.reload();
          }}
          pricePerNight={nightlyPrice}
          totalPriceForReservation={totalPrice}
          priceRentPer4Weeks={proposal['Price Rent per 4 weeks'] || (nightlyPrice * nightsPerWeek * 4)}
        />
      )}

      {/* Cancel Proposal Modal */}
      <CancelProposalModal
        isOpen={showCancelModal}
        proposal={proposal}
        buttonText="Cancel Proposal"
        onClose={closeCancelModal}
        onConfirm={handleCancelConfirm}
      />

      {/* Not Interested Modal (for SL-suggested proposals) */}
      <NotInterestedModal
        isOpen={showNotInterestedModal}
        proposal={proposal}
        onClose={closeNotInterestedModal}
        onConfirm={handleNotInterestedConfirm}
        isProcessing={isNotInterestedProcessing}
      />

      {/* Virtual Meeting Manager Modal */}
      {showVMModal && (
        <VirtualMeetingManager
          proposal={proposal}
          initialView={vmInitialView}
          currentUser={currentUser}
          onClose={handleVMModalClose}
          onSuccess={handleVMSuccess}
        />
      )}

      {/* Fullscreen Proposal Map Modal */}
      <FullscreenProposalMapModal
        isOpen={showMapModal}
        onClose={() => setShowMapModal(false)}
        proposals={allProposals}
        currentProposalId={proposal._id}
        onProposalSelect={onProposalSelect}
      />
    </div>
  );
}
