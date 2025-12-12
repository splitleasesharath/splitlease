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
import { getStatusConfig, getActionsForStatus, isTerminalStatus, isCompletedStatus, isSuggestedProposal, shouldShowStatusBanner, getUsualOrder } from '../../../logic/constants/proposalStatuses.js';
import { shouldHideVirtualMeetingButton } from '../../../lib/proposals/statusButtonConfig.js';
import { navigateToMessaging } from '../../../logic/workflows/proposals/navigationWorkflow.js';
import HostProfileModal from '../../modals/HostProfileModal.jsx';
import GuestEditingProposalModal from '../../modals/GuestEditingProposalModal.jsx';
import CancelProposalModal from '../../modals/CancelProposalModal.jsx';
import VirtualMeetingManager from '../../shared/VirtualMeetingManager/VirtualMeetingManager.jsx';
import MapModal from '../../modals/MapModal.jsx';

// Day abbreviations for schedule display (single letter like Bubble)
const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Convert a day value to a day name
 * Handles multiple formats:
 * - String day names: "Monday", "Friday", etc. (returned as-is)
 * - Numeric strings from Supabase: "2", "6" (Bubble 1-indexed, where 1=Sunday, 2=Monday, etc.)
 * - Numeric values: 2, 6 (Bubble 1-indexed)
 *
 * @param {string|number} dayValue - The day value to convert
 * @returns {string} The day name or empty string if invalid
 */
function convertDayValueToName(dayValue) {
  if (dayValue === null || dayValue === undefined) return '';

  // If it's a number, convert from Bubble 1-indexed to day name
  if (typeof dayValue === 'number') {
    return DAY_NAMES[dayValue - 1] || '';
  }

  // If it's a string, check if it's a numeric string or a day name
  if (typeof dayValue === 'string') {
    const trimmed = dayValue.trim();

    // Check if it's a numeric string (e.g., "2", "6")
    const numericValue = parseInt(trimmed, 10);
    if (!isNaN(numericValue) && String(numericValue) === trimmed) {
      // It's a numeric string, convert from Bubble 1-indexed to day name
      return DAY_NAMES[numericValue - 1] || '';
    }

    // It's already a day name string (e.g., "Monday")
    return trimmed;
  }

  return '';
}

function getCheckInOutRange(proposal) {
  const checkInDay = proposal['check in day'];
  const checkOutDay = proposal['check out day'];

  if (!checkInDay || !checkOutDay) return null;

  // Convert both values to day names using unified conversion function
  const checkInName = convertDayValueToName(checkInDay);
  const checkOutName = convertDayValueToName(checkOutDay);

  if (!checkInName || !checkOutName) return null;

  return `${checkInName} to ${checkOutName}`;
}

/**
 * Get all days with selection status
 * Handles both text day names (from Supabase) and numeric indices (legacy Bubble format)
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
    // Numeric format: Bubble 1-indexed [2, 3, 4, 5, 6] for Mon-Fri
    const selectedSet = new Set(days);
    return DAY_LETTERS.map((letter, index) => ({
      index,
      letter,
      selected: selectedSet.has(index + 1) // Convert to Bubble 1-indexed
    }));
  }
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
    text: '💡 Suggested Proposal\nThis proposal was suggested by a Split Lease Agent on your behalf.',
    bgColor: '#F3E8FF',
    borderColor: '#4B0082',
    textColor: '#4B0082'
  },
  'Proposal Submitted for guest by Split Lease - Pending Confirmation': {
    type: 'suggested',
    text: '💡 Suggested Proposal\nThis proposal was suggested by a Split Lease Agent on your behalf.',
    bgColor: '#F3E8FF',
    borderColor: '#4B0082',
    textColor: '#4B0082'
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

  let displayText = config.text;

  // Handle different banner types
  switch (config.type) {
    case 'cancelled':
      // Hide banner entirely if no reason is provided for Split Lease cancellation
      if (!cancelReason) return null;
      displayText = `Proposal Cancelled by Split Lease\nReason: ${cancelReason}`;
      break;
    case 'cancelled_by_guest':
      displayText = cancelReason
        ? `Proposal Cancelled!\nReason: ${cancelReason}`
        : 'You cancelled this proposal.';
      break;
    case 'rejected':
      displayText = cancelReason
        ? `Proposal Cancelled!\nReason: ${cancelReason}`
        : 'This proposal was declined by the host.';
      break;
    case 'accepted':
      // Show different text based on whether counteroffer happened
      displayText = isCounteroffer
        ? 'Host terms Accepted!\nLease Documents being prepared.'
        : config.text;
      break;
    default:
      // Use the default text from config
      break;
  }

  return (
    <div
      className="status-banner"
      style={{
        background: config.bgColor,
        border: `1px solid ${config.borderColor}`,
        color: config.textColor,
        borderRadius: '10px',
        padding: '15px 20px',
        textAlign: 'center',
        fontWeight: 'bold',
        marginBottom: '15px',
        fontSize: '12px',
        lineHeight: '1.5',
        whiteSpace: 'pre-line'
      }}
    >
      {displayText}
    </div>
  );
}

// ============================================================================
// PROGRESS TRACKER (inline version matching Bubble's horizontal timeline)
// ============================================================================

/**
 * Get dynamic stage labels based on status
 * Labels change to reflect completion (e.g., "Host Review" -> "Host Review Complete")
 */
function getStageLabels(status) {
  const baseLabels = [
    'Proposal Submitted',
    'Rental App Submitted',
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
    // Green when awaiting rental app
    if (!hasRentalApp ||
        normalizedStatus === 'Proposal Submitted by guest - Awaiting Rental Application' ||
        normalizedStatus === 'Proposal Submitted for guest by Split Lease - Awaiting Rental Application' ||
        normalizedStatus === 'Proposal Submitted for guest by Split Lease - Pending Confirmation') {
      return PROGRESS_COLORS.green;
    }
    // Purple when past this stage
    if (usualOrder >= 1) {
      return PROGRESS_COLORS.purple;
    }
    return PROGRESS_COLORS.gray;
  }

  // Stage 3: Host Review
  if (stageIndex === 2) {
    // Green when in host review with rental app submitted
    if (normalizedStatus === 'Host Review' && hasRentalApp) {
      return PROGRESS_COLORS.green;
    }
    // Green when counteroffer awaiting review
    if (normalizedStatus === 'Host Counteroffer Submitted / Awaiting Guest Review') {
      return PROGRESS_COLORS.green;
    }
    // Purple when past this stage
    if (usualOrder >= 3) {
      return PROGRESS_COLORS.purple;
    }
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
    if (normalizedStatus === 'Initial Payment Submitted / Lease activated') {
      return PROGRESS_COLORS.purple;
    }
    return PROGRESS_COLORS.gray;
  }

  return PROGRESS_COLORS.gray;
}

function InlineProgressTracker({ status, usualOrder = 0, isTerminal = false, stageLabels = null, proposal = {} }) {
  const labels = stageLabels || PROGRESS_STAGES.map(s => s.label);

  return (
    <div className="inline-progress-tracker">
      <div className="progress-line-container">
        {PROGRESS_STAGES.map((stage, index) => {
          const stageColor = getStageColor(index, status, usualOrder, isTerminal, proposal);
          const prevStageColor = index > 0 ? getStageColor(index - 1, status, usualOrder, isTerminal, proposal) : null;

          // Connector color: use the color of the stage it leads to if completed, otherwise gray
          const connectorColor = stageColor !== PROGRESS_COLORS.gray ? stageColor : PROGRESS_COLORS.gray;

          return (
            <div key={stage.id} className="progress-node-wrapper">
              {/* Connector line before node (except first) */}
              {index > 0 && (
                <div
                  className="progress-connector"
                  style={{ backgroundColor: connectorColor }}
                />
              )}
              {/* Node circle */}
              <div
                className="progress-node"
                style={{ backgroundColor: stageColor }}
              />
            </div>
          );
        })}
      </div>
      <div className="progress-labels">
        {PROGRESS_STAGES.map((stage, index) => {
          const stageColor = getStageColor(index, status, usualOrder, isTerminal, proposal);
          const labelColor = stageColor !== PROGRESS_COLORS.gray ? stageColor : PROGRESS_COLORS.labelGray;

          return (
            <div
              key={stage.id}
              className="progress-label"
              style={{ color: labelColor }}
            >
              {labels[index] || stage.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ProposalCard({ proposal, transformedProposal, statusConfig, buttonConfig }) {
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

  const mapAddress = getListingAddress();

  // Extract data
  const listingName = listing?.Name || 'Listing';
  const location = [listing?.hoodName, listing?.boroughName]
    .filter(Boolean)
    .join(', ') || 'New York';

  const photoUrl = listing?.featuredPhotoUrl ||
    (listing?.['Features - Photos']?.[0]) ||
    null;

  const hostName = host?.['Name - First'] || host?.['Name - Full'] || 'Host';
  const hostPhoto = host?.['Profile Photo'];

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
  const damageDeposit = proposal['damage deposit'] || 0;

  // Move-in/move-out dates
  const moveInStart = proposal['Move in range start'];
  const moveInEnd = proposal['Move in range end'];
  const anticipatedMoveIn = formatDate(moveInStart);
  const anticipatedMoveOut = formatDate(moveInEnd);

  // Check-in/out times
  const checkInTime = listing?.['Check in time'] || '2:00 pm';
  const checkOutTime = listing?.['Check Out time'] || '11:00 am';

  // House rules - use resolved names from query layer (stored on proposal, not listing)
  const houseRules = proposal.houseRules || [];
  const hasHouseRules = Array.isArray(houseRules) && houseRules.length > 0;

  // House rules toggle state
  const [showHouseRules, setShowHouseRules] = useState(false);

  // Host profile modal state
  const [showHostProfileModal, setShowHostProfileModal] = useState(false);

  // Proposal details modal state (GuestEditingProposalModal)
  const [showProposalDetailsModal, setShowProposalDetailsModal] = useState(false);
  // Initial view for the proposal details modal ('general' | 'editing' | 'cancel')
  const [proposalDetailsModalInitialView, setProposalDetailsModalInitialView] = useState('general');

  // Virtual Meeting Manager modal state
  const [showVMModal, setShowVMModal] = useState(false);
  const [vmInitialView, setVmInitialView] = useState('');

  // Map modal state
  const [showMapModal, setShowMapModal] = useState(false);

  // Cancel proposal modal state
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Status and progress - derive dynamically from statusConfig
  const status = proposal.Status;
  const currentStatusConfig = statusConfig || getStatusConfig(status);
  const currentStageIndex = (currentStatusConfig?.stage || 1) - 1; // Convert 1-indexed to 0-indexed
  const statusColor = currentStatusConfig?.color || 'blue';
  const isTerminal = isTerminalStatus(status);
  const isCompleted = isCompletedStatus(status);
  const stageLabels = getStageLabels(status);

  // Warning: some nights unavailable
  const someNightsUnavailable = proposal['some nights unavailable'];

  // Cancel reason (for cancelled proposals)
  const cancelReason = proposal['Cancelled Reason'] || proposal['reason for cancellation'];

  // Virtual meeting status - use virtualMeeting object from the fetched data
  const virtualMeeting = proposal.virtualMeeting;
  const vmBookedDate = virtualMeeting?.['booked date'];
  const vmConfirmedBySL = virtualMeeting?.['confirmedBySplitLease'];
  const vmDeclined = virtualMeeting?.['meeting declined'];
  const vmRequestedBy = virtualMeeting?.['requested by'];

  // Current user ID (for comparing who requested the VM)
  const currentUserId = proposal.Guest;

  // Get available actions for this status
  const availableActions = getActionsForStatus(status);

  // Construct current user object for VirtualMeetingManager
  const currentUser = {
    _id: currentUserId,
    typeUserSignup: 'guest'
  };

  // ============================================================================
  // VM BUTTON CONFIGURATION (implements 8 Bubble conditionals)
  // ============================================================================
  /**
   * Determine VM button state based on the full virtual meeting lifecycle
   * Maps Bubble's 8 conditionals to React state:
   * 1. Other party requested -> "Respond to Virtual Meeting Request" (view: respond)
   * 2. Current user requested -> "Virtual Meeting Requested" (disabled)
   * 3. Button pressed -> visual feedback (handled by CSS)
   * 4. Booked but not confirmed -> "Virtual Meeting Accepted" (disabled)
   * 5. Booked and confirmed -> "Meeting confirmed" (view: details)
   * 6. Meeting declined -> "Virtual Meeting Declined" (view: request, red style)
   * 7-8. Hidden for rejected/cancelled/activated/SL-suggested statuses
   */
  const vmConfig = useMemo(() => {
    // Conditional 7-8: Check status-based hiding first
    if (shouldHideVirtualMeetingButton(status)) {
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
        view: 'request', // Opens request view in "suggesting alternatives" mode
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
        view: 'details', // Can view details but meeting not yet confirmed
        disabled: true,
        label: 'Virtual Meeting Accepted',
        className: 'btn-vm-accepted'
      };
    }

    // Conditional 2: Current user requested - waiting for response
    if (virtualMeeting['requested by'] === currentUserId) {
      return {
        visible: true,
        view: null, // No action available
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

  // Handler for opening proposal details modal
  const openProposalModal = () => {
    setShowProposalDetailsModal(true);
  };

  // Handler for closing proposal details modal
  const closeProposalModal = () => {
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

  return (
    <div className="proposal-card-wrapper">
      {/* Status Banner - shows for accepted/counteroffer/cancelled states */}
      <StatusBanner status={status} cancelReason={cancelReason} isCounteroffer={isCounteroffer} />

      <div className="proposal-card-v2">
        {/* Main two-column content */}
        <div className="proposal-content-row">
          {/* Left column - Listing details */}
          <div className="proposal-left-column">
            <h3 className="listing-title-v2">{listingName}</h3>
            <p className="listing-location-v2">{location}</p>

            {/* Action buttons row */}
            <div className="listing-actions-row">
              <a
                href={`/view-split-lease/${listing?._id}`}
                className="btn-action btn-primary-v2"
                target="_blank"
                rel="noopener noreferrer"
              >
                View Listing
              </a>
              <button
                className="btn-action btn-map"
                onClick={() => setShowMapModal(true)}
              >
                View Map
              </button>
            </div>

            {/* Schedule info */}
            <div className="schedule-info-block">
              {checkInOutRange && (
                <div className="schedule-text primary">{checkInOutRange}</div>
              )}
              <div className="schedule-text">
                <span className="label">Duration</span> {reservationWeeks} Weeks
              </div>
            </div>

            {/* Day selector badges with warning icon */}
            <div className="day-badges-row">
              {allDays.map((day) => (
                <div
                  key={day.index}
                  className={`day-badge-v2 ${day.selected ? 'selected' : ''}`}
                >
                  {day.letter}
                </div>
              ))}
              {/* Warning icon when some nights are unavailable */}
              {someNightsUnavailable && (
                <span
                  className="nights-unavailable-warning"
                  title="Some selected nights are no longer available"
                  style={{
                    color: '#4B47CE',
                    fontSize: '20px',
                    marginLeft: '8px',
                    cursor: 'pointer'
                  }}
                >
                  ⚠
                </span>
              )}
            </div>

            {/* Check-in/out times */}
            <div className="checkin-times">
              Check-in {checkInTime} Check-out {checkOutTime}
            </div>

            {/* Move-in and Move-out dates */}
            <div className="movein-date">
              <span className="label">Move-in</span> {anticipatedMoveIn || 'TBD'}
              {anticipatedMoveOut && (
                <>
                  &nbsp;&nbsp;&nbsp;
                  <span className="label">Move-out</span> {anticipatedMoveOut}
                </>
              )}
            </div>

          {/* House rules section - only show if listing has rules */}
          {hasHouseRules && (
            <div className="house-rules-section">
              <button
                type="button"
                className="house-rules-toggle"
                onClick={() => setShowHouseRules(!showHouseRules)}
              >
                {showHouseRules ? 'Hide House Rules' : 'See House Rules'}
              </button>

              {showHouseRules && (
                <div className="house-rules-grid">
                  {houseRules.map((rule, index) => (
                    <div key={index} className="house-rule-badge">
                      {rule}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right column - Photo with host overlay */}
        <div className="proposal-right-column">
          <div
            className="listing-photo-container"
            style={{ backgroundImage: photoUrl ? `url(${photoUrl})` : 'none' }}
          >
            {/* Host overlay */}
            <div className="host-overlay">
              {hostPhoto ? (
                <img src={hostPhoto} alt={hostName} className="host-avatar" />
              ) : (
                <div className="host-avatar host-avatar-placeholder">
                  {hostName.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="host-name-badge">{hostName}</div>
              <button
                className="btn-host btn-host-profile"
                onClick={() => setShowHostProfileModal(true)}
              >
                Host Profile
              </button>
              <button
                className="btn-host btn-host-message"
                onClick={() => navigateToMessaging(host?._id, proposal._id)}
              >Send a Message</button>
            </div>
          </div>
        </div>
      </div>

        {/* Pricing bar with dynamic action buttons */}
        <div className="pricing-bar">
          <div className="pricing-details">
            {/* Show original price with strikethrough when counteroffer happened */}
            {originalTotalPrice && (
              <span className="pricing-original">
                <s>Total {formatPrice(originalTotalPrice)}</s>
              </span>
            )}
            <span className="pricing-total">Total {formatPrice(totalPrice)}</span>
            <span className="pricing-fee">{cleaningFee > 0 ? `Maintenance fee ${formatPrice(cleaningFee)}` : 'No maintenance fee'}</span>
            <span className="pricing-deposit">Damage deposit {formatPrice(damageDeposit)}</span>
          </div>
          <div className="pricing-nightly">
            {formatPrice(nightlyPrice)} / night
          </div>

          {/* Dynamic action buttons based on status - uses buttonConfig from os_proposal_status */}
          <div className="action-buttons">
            {/* Fallback: Show basic buttons if buttonConfig not yet loaded */}
            {!buttonConfig && !isTerminal && !isCompleted && (
              <>
                {/* VM Button (Fallback) */}
                {vmConfig.visible && (
                  <button
                    className={`btn-action-bar ${vmConfig.className}`}
                    disabled={vmConfig.disabled}
                    style={vmConfig.style || undefined}
                    onClick={handleVMButtonClick}
                  >
                    {vmConfig.label}
                  </button>
                )}
                <button
                  className="btn-action-bar btn-modify-proposal"
                  onClick={() => {
                    setProposalDetailsModalInitialView('general');
                    setShowProposalDetailsModal(true);
                  }}
                >
                  Modify Proposal
                </button>
                <button
                  className="btn-action-bar btn-cancel-proposal"
                  onClick={() => {
                    setProposalDetailsModalInitialView('cancel');
                    setShowProposalDetailsModal(true);
                  }}
                >
                  Cancel Proposal
                </button>
              </>
            )}

            {/* Button 1: Virtual Meeting - visibility based on vmConfig (implements 8 Bubble conditionals) */}
            {buttonConfig && vmConfig.visible && (
              <button
                className={`btn-action-bar ${vmConfig.className}`}
                disabled={vmConfig.disabled}
                style={vmConfig.style || undefined}
                onClick={handleVMButtonClick}
              >
                {vmConfig.label}
              </button>
            )}

            {/* Button 2: Guest Action 1 - dynamic label from os_proposal_status.guest_action_1 */}
            {buttonConfig?.guestAction1?.visible && (
              buttonConfig.guestAction1.action === 'go_to_leases' ? (
                <a
                  href="/my-leases"
                  className="btn-action-bar btn-go-to-leases"
                  style={buttonConfig.guestAction1.style || undefined}
                >
                  {buttonConfig.guestAction1.label}
                </a>
              ) : (
                <button
                  className={`btn-action-bar ${
                    buttonConfig.guestAction1.action === 'delete_proposal' ? 'btn-delete-proposal' :
                    buttonConfig.guestAction1.action === 'remind_sl' ? 'btn-remind' :
                    buttonConfig.guestAction1.action === 'modify_proposal' ? 'btn-modify-proposal' :
                    buttonConfig.guestAction1.action === 'accept_counteroffer' ? 'btn-accept-counteroffer' :
                    buttonConfig.guestAction1.action === 'confirm_interest' ? 'btn-interested' :
                    'btn-primary-action'
                  }`}
                  style={buttonConfig.guestAction1.style || undefined}
                  onClick={() => {
                    // Handle different actions
                    if (buttonConfig.guestAction1.action === 'modify_proposal') {
                      setProposalDetailsModalInitialView('general');
                      setShowProposalDetailsModal(true);
                    }
                    // TODO: Add handlers for other actions (remind_sl, accept_counteroffer, etc.)
                  }}
                >
                  {buttonConfig.guestAction1.label}
                </button>
              )
            )}

            {/* Button 3: Guest Action 2 - dynamic label from os_proposal_status.guest_action_2 */}
            {buttonConfig?.guestAction2?.visible && (
              <button
                className={`btn-action-bar ${
                  buttonConfig.guestAction2.action === 'reject_suggestion' ? 'btn-not-interested' :
                  buttonConfig.guestAction2.action === 'review_counteroffer' ? 'btn-review-terms' :
                  buttonConfig.guestAction2.action === 'see_details' ? 'btn-see-details' :
                  buttonConfig.guestAction2.action === 'verify_identity' ? 'btn-verify-identity' :
                  'btn-secondary-action'
                }`}
                style={buttonConfig.guestAction2.style || undefined}
                onClick={() => {
                  // Handle different actions
                  if (buttonConfig.guestAction2.action === 'see_details') {
                    setProposalDetailsModalInitialView('general');
                    setShowProposalDetailsModal(true);
                  }
                  // TODO: Add handlers for other actions (reject_suggestion, review_counteroffer, verify_identity)
                }}
              >
                {buttonConfig.guestAction2.label}
              </button>
            )}

            {/* Button 4: Cancel/Delete/Reject button - dynamic based on status */}
            {buttonConfig?.cancelButton?.visible && (
              <button
                className={`btn-action-bar ${
                  buttonConfig.cancelButton.action === 'delete_proposal' ? 'btn-delete-proposal' :
                  buttonConfig.cancelButton.action === 'see_house_manual' ? 'btn-house-manual' :
                  buttonConfig.cancelButton.action === 'reject_counteroffer' ? 'btn-reject-terms' :
                  buttonConfig.cancelButton.action === 'reject_proposal' ? 'btn-reject-proposal' :
                  'btn-cancel-proposal'
                }`}
                style={buttonConfig.cancelButton.style || undefined}
                disabled={buttonConfig.cancelButton.disabled}
                onClick={() => {
                  // Handle different actions
                  if (buttonConfig.cancelButton.action === 'see_house_manual') {
                    // Navigate to house manual or open modal
                    // TODO: Implement house manual navigation
                  } else if (
                    buttonConfig.cancelButton.action === 'cancel_proposal' ||
                    buttonConfig.cancelButton.action === 'delete_proposal' ||
                    buttonConfig.cancelButton.action === 'reject_counteroffer' ||
                    buttonConfig.cancelButton.action === 'reject_proposal'
                  ) {
                    // Open GuestEditingProposalModal in cancel view
                    setProposalDetailsModalInitialView('cancel');
                    setShowProposalDetailsModal(true);
                  }
                }}
              >
                {buttonConfig.cancelButton.label}
              </button>
            )}
          </div>
        </div>

        {/* Progress tracker with dynamic stage, colors, and labels */}
        <InlineProgressTracker
          status={status}
          usualOrder={currentStatusConfig?.usualOrder || 0}
          stageLabels={stageLabels}
          isTerminal={isTerminal}
          proposal={proposal}
        />
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
            setProposalDetailsModalInitialView('general'); // Reset for next open
          }}
          onProposalCancel={(reason) => {
            // Handle cancellation - reload page to show updated status
            console.log('Proposal cancelled with reason:', reason);
            setShowProposalDetailsModal(false);
            setProposalDetailsModalInitialView('general');
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

      {/* Map Modal */}
      {showMapModal && (
        <MapModal
          listing={listing}
          address={mapAddress}
          onClose={() => setShowMapModal(false)}
        />
      )}
    </div>
  );
}
