/**
 * Expandable Proposal Card Component (V7 Design)
 *
 * Unified component that combines collapsed row view with expandable detail panel.
 * Features:
 * - Collapsed: Thumbnail, listing name, status badge, chevron
 * - Expanded: Full proposal details (schedule, pricing, actions, progress)
 * - Accordion animation for expand/collapse
 * - Match reason card for SL-suggested proposals
 *
 * This component replaces the separate ProposalSelector + ProposalCard pattern
 * from previous versions.
 */

import { useState, useMemo, useRef, useEffect } from 'react';
import MatchReasonCard from './MatchReasonCard.jsx';
import NegotiationSummarySection from './NegotiationSummarySection.jsx';
import CounterofferSummarySection from './CounterofferSummarySection.jsx';
import {
  DAY_ABBREVS,
  DAY_NAMES,
  formatDate,
  getShortStatusLabel,
  getStatusBadgeClass,
  isSLSuggested,
  isPendingConfirmation,
  isTerminalStatus,
  getListingPhoto,
  getHostDisplayName,
  getHostProfilePhoto,
  buildMetaText,
  getProgressStageLabels
} from './displayUtils.js';
import { formatPrice } from '../../../lib/proposals/dataTransformers.js';
import { getStatusConfig, isCompletedStatus, shouldShowStatusBanner } from '../../../logic/constants/proposalStatuses.js';
import { shouldHideVirtualMeetingButton, getButtonConfigForProposal } from '../../../lib/proposals/statusButtonConfig.js';
import { navigateToMessaging } from '../../../logic/workflows/proposals/navigationWorkflow.js';
import { executeDeleteProposal } from '../../../logic/workflows/proposals/cancelProposalWorkflow.js';
import { goToRentalApplication, getListingUrlWithProposalContext } from '../../../lib/navigation.js';
import HostProfileModal from '../../modals/HostProfileModal.jsx';
import GuestEditingProposalModal from '../../modals/GuestEditingProposalModal.jsx';
import CancelProposalModal from '../../modals/CancelProposalModal.jsx';
import CompareTermsModal from '../../modals/CompareTermsModal.jsx';
import NotInterestedModal from '../../shared/SuggestedProposals/components/NotInterestedModal.jsx';
import VirtualMeetingManager from '../../shared/VirtualMeetingManager/VirtualMeetingManager.jsx';
import FullscreenProposalMapModal from '../../modals/FullscreenProposalMapModal.jsx';
import { showToast } from '../../shared/Toast.jsx';
import { supabase } from '../../../lib/supabase.js';
import { canConfirmSuggestedProposal, getNextStatusAfterConfirmation } from '../../../logic/rules/proposals/proposalRules.js';
import { dismissProposal } from '../../shared/SuggestedProposals/suggestedProposalService.js';

/**
 * Chevron icon for expand/collapse
 */
const ChevronIcon = ({ isExpanded }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`expand-chevron ${isExpanded ? 'expanded' : ''}`}
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

/**
 * Get all days with selection status for display
 */
function getAllDaysWithSelection(daysSelected) {
  const days = daysSelected || [];
  const isTextFormat = days.length > 0 && typeof days[0] === 'string' && isNaN(parseInt(days[0], 10));

  if (isTextFormat) {
    const selectedSet = new Set(days);
    return DAY_ABBREVS.map((letter, index) => ({
      index,
      letter,
      selected: selectedSet.has(DAY_NAMES[index])
    }));
  } else {
    const selectedSet = new Set(days.map(d => typeof d === 'number' ? d : parseInt(d, 10)));
    return DAY_ABBREVS.map((letter, index) => ({
      index,
      letter,
      selected: selectedSet.has(index)
    }));
  }
}

/**
 * Get check-in to checkout day range string
 *
 * Priority order:
 * 1. For counteroffers: Use HC (host counteroffer) fields first
 * 2. Use explicit check in/out day fields if available
 * 3. Fall back to deriving from Days Selected array
 *
 * Days Selected represents the range from check-in to checkout (inclusive).
 * Check-in = first day, Checkout = last day in the selection.
 */
function getCheckInOutRange(proposal) {
  const isCounteroffer = proposal['counter offer happened'];

  // Priority 1: For counteroffers, prefer HC fields
  // Priority 2: Use explicit check-in/check-out day fields
  const checkInDay = isCounteroffer
    ? (proposal['hc check in day'] ?? proposal['check in day'])
    : (proposal['check in day'] ?? proposal['hc check in day']);
  const checkOutDay = isCounteroffer
    ? (proposal['hc check out day'] ?? proposal['check out day'])
    : (proposal['check out day'] ?? proposal['hc check out day']);

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
  if (typeof daysSelected === 'string') {
    try {
      daysSelected = JSON.parse(daysSelected);
    } catch (e) {
      daysSelected = [];
    }
  }

  if (!Array.isArray(daysSelected) || daysSelected.length === 0) return null;

  const dayIndices = daysSelected.map(day => {
    if (typeof day === 'number') return day;
    if (typeof day === 'string') {
      const trimmed = day.trim();
      const numericValue = parseInt(trimmed, 10);
      if (!isNaN(numericValue) && String(numericValue) === trimmed) {
        return numericValue;
      }
      const jsIndex = DAY_NAMES.indexOf(trimmed);
      return jsIndex >= 0 ? jsIndex : -1;
    }
    return -1;
  }).filter(idx => idx >= 0 && idx <= 6);

  if (dayIndices.length === 0) return null;

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
 * Get the ORIGINAL check-in to checkout day range string (before any counteroffer)
 * Used for strikethrough comparison when a counteroffer changes the schedule
 */
function getOriginalCheckInOutRange(proposal) {
  // Use original check-in/check-out day fields (not HC fields)
  const checkInDay = proposal['check in day'];
  const checkOutDay = proposal['check out day'];

  if (checkInDay != null && checkOutDay != null) {
    const checkInIndex = typeof checkInDay === 'number' ? checkInDay : parseInt(checkInDay, 10);
    const checkOutIndex = typeof checkOutDay === 'number' ? checkOutDay : parseInt(checkOutDay, 10);

    if (!isNaN(checkInIndex) && !isNaN(checkOutIndex) &&
        checkInIndex >= 0 && checkInIndex <= 6 &&
        checkOutIndex >= 0 && checkOutIndex <= 6) {
      return `${DAY_NAMES[checkInIndex]} to ${DAY_NAMES[checkOutIndex]}`;
    }
  }

  // Fall back to original Days Selected array
  let daysSelected = proposal['Days Selected'] || [];
  if (typeof daysSelected === 'string') {
    try {
      daysSelected = JSON.parse(daysSelected);
    } catch (e) {
      daysSelected = [];
    }
  }

  if (!Array.isArray(daysSelected) || daysSelected.length === 0) return null;

  const dayIndices = daysSelected.map(day => {
    if (typeof day === 'number') return day;
    if (typeof day === 'string') {
      const trimmed = day.trim();
      const numericValue = parseInt(trimmed, 10);
      if (!isNaN(numericValue) && String(numericValue) === trimmed) {
        return numericValue;
      }
      const jsIndex = DAY_NAMES.indexOf(trimmed);
      return jsIndex >= 0 ? jsIndex : -1;
    }
    return -1;
  }).filter(idx => idx >= 0 && idx <= 6);

  if (dayIndices.length === 0) return null;

  const sorted = [...dayIndices].sort((a, b) => a - b);

  // Handle wrap-around case
  const hasLowNumbers = sorted.some(d => d <= 2);
  const hasHighNumbers = sorted.some(d => d >= 4);

  if (hasLowNumbers && hasHighNumbers && sorted.length < 7) {
    let gapIndex = -1;
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] - sorted[i - 1] > 1) {
        gapIndex = i;
        break;
      }
    }

    if (gapIndex !== -1) {
      const checkInDayIndex = sorted[gapIndex];
      const checkOutDayIndex = sorted[gapIndex - 1];
      return `${DAY_NAMES[checkInDayIndex]} to ${DAY_NAMES[checkOutDayIndex]}`;
    }
  }

  const checkInDayIndex = sorted[0];
  const checkOutDayIndex = sorted[sorted.length - 1];

  return `${DAY_NAMES[checkInDayIndex]} to ${DAY_NAMES[checkOutDayIndex]}`;
}

/**
 * Parse days selected for URL context
 */
function parseDaysSelectedForContext(proposal) {
  let days = proposal['Days Selected'] || proposal.hcDaysSelected || [];
  if (typeof days === 'string') {
    try {
      days = JSON.parse(days);
    } catch (e) {
      return [];
    }
  }
  if (!Array.isArray(days) || days.length === 0) return [];

  return days.map(d => {
    if (typeof d === 'number') return d;
    if (typeof d === 'string') {
      const trimmed = d.trim();
      const numericValue = parseInt(trimmed, 10);
      if (!isNaN(numericValue) && String(numericValue) === trimmed) {
        return numericValue;
      }
      const dayIndex = DAY_NAMES.indexOf(trimmed);
      return dayIndex >= 0 ? dayIndex : -1;
    }
    return -1;
  }).filter(d => d >= 0 && d <= 6);
}

/**
 * Get effective reservation span
 */
function getEffectiveReservationSpan(proposal) {
  const isCounteroffer = proposal['counter offer happened'];
  return isCounteroffer
    ? proposal['hc reservation span (weeks)']
    : proposal['Reservation Span (Weeks)'];
}

/**
 * Progress bar stage colors
 */
const PROGRESS_COLORS = {
  purple: '#6D31C2',
  green: '#1F8E16',
  red: '#DB2E2E',
  lightPurple: '#B6B7E9',
  gray: '#DEDEDE',
  labelGray: '#9CA3AF'
};

/**
 * Calculate stage color based on status
 */
function getStageColor(stageIndex, status, usualOrder, isTerminal, proposal = {}) {
  if (isTerminal) return PROGRESS_COLORS.red;

  const normalizedStatus = typeof status === 'string' ? status.trim() : status;
  const hasRentalApp = proposal['rental application'];

  // Stage 1: Always purple (completed)
  if (stageIndex === 0) return PROGRESS_COLORS.purple;

  // Stage 2: Rental App
  if (stageIndex === 1) {
    if (normalizedStatus?.includes('Awaiting Rental Application') ||
        normalizedStatus?.includes('Pending')) {
      return PROGRESS_COLORS.green;
    }
    if (hasRentalApp || usualOrder >= 1) {
      return PROGRESS_COLORS.purple;
    }
    return PROGRESS_COLORS.gray;
  }

  // Stage 3: Host Review
  if (stageIndex === 2) {
    if (normalizedStatus === 'Host Review' || normalizedStatus?.includes('Counteroffer')) {
      return PROGRESS_COLORS.green;
    }
    if (usualOrder >= 3) return PROGRESS_COLORS.purple;
    return PROGRESS_COLORS.gray;
  }

  // Stage 4: Documents
  if (stageIndex === 3) {
    if (normalizedStatus?.includes('Documents Sent for Review')) {
      return PROGRESS_COLORS.green;
    }
    if (usualOrder >= 4) return PROGRESS_COLORS.purple;
    return PROGRESS_COLORS.gray;
  }

  // Stage 5: Signing
  if (stageIndex === 4) {
    if (normalizedStatus?.includes('Signatures')) {
      return PROGRESS_COLORS.green;
    }
    if (usualOrder >= 5) return PROGRESS_COLORS.purple;
    return PROGRESS_COLORS.gray;
  }

  // Stage 6: Payment/Active
  if (stageIndex === 5) {
    if (normalizedStatus?.includes('Awaiting Initial payment') || normalizedStatus?.includes('Awaiting Initial Payment')) {
      return PROGRESS_COLORS.green;
    }
    if (isCompletedStatus(normalizedStatus)) return PROGRESS_COLORS.purple;
    return PROGRESS_COLORS.gray;
  }

  return PROGRESS_COLORS.gray;
}

/**
 * Inline Progress Tracker
 */
function InlineProgressTracker({ status, usualOrder = 0, isTerminal = false, proposal = {} }) {
  const stages = getProgressStageLabels();
  // Calculate current step for screen readers (1-indexed)
  const currentStep = Math.min(usualOrder + 1, stages.length);

  return (
    <div
      className="epc-progress-row"
      role="progressbar"
      aria-label="Proposal progress"
      aria-valuenow={currentStep}
      aria-valuemin={1}
      aria-valuemax={stages.length}
      aria-valuetext={`Step ${currentStep} of ${stages.length}: ${stages[currentStep - 1] || stages[0]}`}
    >
      {stages.map((label, index) => {
        const stageColor = getStageColor(index, status, usualOrder, isTerminal, proposal);
        const isLast = index === stages.length - 1;
        const isCompleted = index < usualOrder;
        const isCurrent = index === usualOrder;

        return (
          <div key={index} className="epc-progress-step">
            <div
              className="epc-progress-dot"
              style={{ backgroundColor: stageColor }}
              aria-hidden="true"
            />
            <span
              className="epc-progress-label"
              style={{ color: stageColor !== PROGRESS_COLORS.gray ? stageColor : PROGRESS_COLORS.labelGray }}
              aria-label={`${label}${isCompleted ? ', completed' : isCurrent ? ', current step' : ''}`}
            >
              {label}
            </span>
            {!isLast && (
              <div
                className="epc-progress-line"
                style={{ backgroundColor: stageColor === PROGRESS_COLORS.purple ? PROGRESS_COLORS.purple : PROGRESS_COLORS.gray }}
                aria-hidden="true"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Status Banner for expanded view
 */
function StatusBanner({ status, cancelReason, isCounteroffer }) {
  const normalizedStatus = typeof status === 'string' ? status.trim() : status;
  if (!shouldShowStatusBanner(normalizedStatus)) return null;

  let variant = '';
  let icon = 'i';
  let strongText = '';
  let detailText = '';

  if (normalizedStatus?.includes('Cancelled')) {
    variant = 'cancelled';
    icon = '✕';
    strongText = 'Proposal Cancelled';
    detailText = cancelReason ? `Reason: ${cancelReason}` : 'This proposal has been cancelled.';
  } else if (normalizedStatus?.includes('Rejected')) {
    variant = 'cancelled';
    icon = '✕';
    strongText = 'Proposal Declined';
    detailText = cancelReason ? `Reason: ${cancelReason}` : 'This proposal was declined by the host.';
  } else if (normalizedStatus?.includes('Accepted') || normalizedStatus?.includes('Drafting')) {
    variant = 'success';
    icon = '✓';
    strongText = isCounteroffer ? 'Host Terms Accepted' : 'Proposal Accepted';
    detailText = 'Lease Documents being prepared.';
  } else if (normalizedStatus?.includes('Counteroffer')) {
    variant = 'attention';
    icon = '!';
    strongText = 'Host Counteroffer';
    detailText = 'Review the new terms below.';
  } else if (normalizedStatus?.includes('activated')) {
    variant = 'success';
    icon = '✓';
    strongText = 'Lease Activated';
    detailText = 'Visit My Leases for details.';
  } else if (normalizedStatus?.includes('Awaiting Rental Application')) {
    variant = 'attention';
    icon = '!';
    strongText = 'Action Required';
    detailText = 'Please complete your rental application.';
  } else {
    strongText = getStatusConfig(normalizedStatus)?.label || normalizedStatus;
  }

  // Use role="alert" for attention-required statuses, role="status" for informational
  const isUrgent = variant === 'attention' || variant === 'cancelled';

  return (
    <div
      className={`epc-status-banner ${variant}`}
      role={isUrgent ? 'alert' : 'status'}
      aria-live={isUrgent ? 'assertive' : 'polite'}
    >
      <span className="epc-status-icon" aria-hidden="true">{icon}</span>
      <div className="epc-status-text">
        <strong>{strongText}</strong>
        {detailText && ` — ${detailText}`}
      </div>
    </div>
  );
}

/**
 * Main Expandable Proposal Card Component
 */
export default function ExpandableProposalCard({
  proposal,
  isExpanded,
  onToggle,
  allProposals = [],
  onProposalSelect,
  onProposalDeleted
}) {
  // Content panel ref for height animation
  const contentRef = useRef(null);
  const [contentHeight, setContentHeight] = useState(0);

  // UI state
  const [showHouseRules, setShowHouseRules] = useState(false);
  const [showHostProfileModal, setShowHostProfileModal] = useState(false);
  const [showProposalDetailsModal, setShowProposalDetailsModal] = useState(false);
  const [proposalDetailsModalInitialView, setProposalDetailsModalInitialView] = useState('pristine');
  const [showVMModal, setShowVMModal] = useState(false);
  const [vmInitialView, setVmInitialView] = useState('');
  const [showMapModal, setShowMapModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showNotInterestedModal, setShowNotInterestedModal] = useState(false);
  const [showCompareTermsModal, setShowCompareTermsModal] = useState(false);
  const [isNotInterestedProcessing, setIsNotInterestedProcessing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  // Calculate content height for animation
  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(isExpanded ? contentRef.current.scrollHeight : 0);
    }
  }, [isExpanded, proposal]);

  // Extract data
  const listing = proposal?.listing;
  const host = listing?.host;
  const status = proposal?.Status;
  const statusConfig = getStatusConfig(status);
  const buttonConfig = getButtonConfigForProposal(proposal);

  // Photo and name
  const photoUrl = getListingPhoto(listing);
  const listingName = listing?.Name || 'Listing';
  const location = [listing?.hoodName, listing?.boroughName].filter(Boolean).join(', ') || 'New York';
  const hostName = getHostDisplayName(host);
  const hostPhoto = getHostProfilePhoto(host);

  // Counteroffer flag
  const isCounteroffer = proposal?.['counter offer happened'];

  // Original values (guest's proposal)
  let originalDaysSelected = proposal?.['Days Selected'] || [];
  if (typeof originalDaysSelected === 'string') {
    try { originalDaysSelected = JSON.parse(originalDaysSelected); } catch (e) { originalDaysSelected = []; }
  }
  const originalNightsPerWeek = proposal?.['nights per week (num)'] || originalDaysSelected.length;
  const originalReservationWeeks = proposal?.['Reservation Span (Weeks)'] || 4;
  const originalNightlyPrice = proposal?.['proposal nightly price'] || 0;
  const originalTotalPrice = proposal?.['Total Price for Reservation (guest)'] || 0;
  const originalMoveInStart = proposal?.['Move in range start'];

  // HC values (host counteroffer) - only if counteroffer happened
  let hcDaysSelected = proposal?.['hc days selected'] || [];
  if (typeof hcDaysSelected === 'string') {
    try { hcDaysSelected = JSON.parse(hcDaysSelected); } catch (e) { hcDaysSelected = []; }
  }
  const hcNightsPerWeek = proposal?.['hc nights per week'] || hcDaysSelected.length;
  const hcReservationWeeks = proposal?.['hc reservation span (weeks)'];
  const hcNightlyPrice = proposal?.['hc nightly price'];
  const hcTotalPrice = proposal?.['hc total price'];
  const hcMoveInDate = proposal?.['hc move in date'];

  // Active values (what to display as current - prefer HC if counteroffer)
  const daysSelected = isCounteroffer && hcDaysSelected.length > 0 ? hcDaysSelected : originalDaysSelected;
  const allDays = getAllDaysWithSelection(daysSelected);
  const nightsPerWeek = isCounteroffer && hcNightsPerWeek ? hcNightsPerWeek : originalNightsPerWeek;
  const reservationWeeks = isCounteroffer && hcReservationWeeks ? hcReservationWeeks : originalReservationWeeks;
  const nightlyPrice = isCounteroffer && hcNightlyPrice != null ? hcNightlyPrice : originalNightlyPrice;
  const totalPrice = isCounteroffer && hcTotalPrice != null ? hcTotalPrice : originalTotalPrice;
  const checkInOutRange = getCheckInOutRange(proposal);
  const originalCheckInOutRange = getOriginalCheckInOutRange(proposal);
  const cleaningFee = proposal?.['cleaning fee'] || 0;

  // Comparison flags - detect which values changed
  const durationChanged = isCounteroffer && hcReservationWeeks != null && hcReservationWeeks !== originalReservationWeeks;
  const nightlyPriceChanged = isCounteroffer && hcNightlyPrice != null && hcNightlyPrice !== originalNightlyPrice;
  const totalPriceChanged = isCounteroffer && hcTotalPrice != null && hcTotalPrice !== originalTotalPrice;
  const moveInChanged = isCounteroffer && hcMoveInDate && hcMoveInDate !== originalMoveInStart;
  const daysChanged = isCounteroffer && hcDaysSelected.length > 0 &&
    JSON.stringify([...hcDaysSelected].sort()) !== JSON.stringify([...originalDaysSelected].sort());
  const scheduleChanged = daysChanged && originalCheckInOutRange && checkInOutRange !== originalCheckInOutRange;

  // Dates
  const moveInStart = isCounteroffer && hcMoveInDate ? hcMoveInDate : originalMoveInStart;
  const anticipatedMoveIn = formatDate(moveInStart);
  const originalMoveInDisplay = moveInChanged ? formatDate(originalMoveInStart) : null;
  const checkInTime = listing?.['Check in time'] || '2:00 pm';
  const checkOutTime = listing?.['Check Out time'] || '11:00 am';

  // House rules
  const houseRules = proposal?.houseRules || [];
  const hasHouseRules = Array.isArray(houseRules) && houseRules.length > 0;

  // Negotiation summaries
  const negotiationSummaries = proposal?.negotiationSummaries || [];

  // Counteroffer summary (SplitBot message explaining what changed)
  const counterofferSummary = proposal?.counterofferSummary || null;

  // Status flags
  const isSuggested = isSLSuggested(status);
  const isPending = isPendingConfirmation(status);
  const isTerminal = isTerminalStatus(status);
  const isCompleted = isCompletedStatus(status);
  const cancelReason = proposal?.['Cancelled Reason'] || proposal?.['reason for cancellation'];
  const someNightsUnavailable = proposal?.['some nights unavailable'];

  // VM configuration
  const virtualMeeting = proposal?.virtualMeeting;
  const currentUserId = proposal?.Guest;

  const vmConfig = useMemo(() => {
    if (!status || shouldHideVirtualMeetingButton(status)) {
      return { visible: false };
    }
    if (!virtualMeeting) {
      return { visible: true, view: 'request', disabled: false, label: 'Request Virtual Meeting', className: 'btn-vm-request' };
    }
    if (virtualMeeting['meeting declined'] === true) {
      return { visible: true, view: 'request', disabled: false, label: 'VM Declined', className: 'btn-vm-declined' };
    }
    if (virtualMeeting['booked date'] && virtualMeeting['confirmedBySplitLease'] === true) {
      return { visible: true, view: 'details', disabled: false, label: 'Meeting Confirmed', className: 'btn-vm-confirmed' };
    }
    if (virtualMeeting['booked date'] && !virtualMeeting['confirmedBySplitLease']) {
      return { visible: true, view: 'details', disabled: true, label: 'VM Accepted', className: 'btn-vm-accepted' };
    }
    if (virtualMeeting['requested by'] === currentUserId) {
      return { visible: true, view: null, disabled: true, label: 'VM Requested', className: 'btn-vm-requested' };
    }
    if (virtualMeeting['requested by'] && virtualMeeting['requested by'] !== currentUserId) {
      return { visible: true, view: 'respond', disabled: false, label: 'Respond to VM', className: 'btn-vm-respond' };
    }
    return { visible: true, view: 'request', disabled: false, label: 'Request VM', className: 'btn-vm-request' };
  }, [virtualMeeting, currentUserId, status]);

  // Event handlers
  const handleVMButtonClick = () => {
    if (vmConfig.view && !vmConfig.disabled) {
      setVmInitialView(vmConfig.view);
      setShowVMModal(true);
    }
  };

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
        .update({ Status: nextStatus, 'Modified Date': new Date().toISOString() })
        .eq('_id', proposal._id);
      if (error) throw new Error(error.message);
      showToast({ title: 'Proposal confirmed!', type: 'success' });
      window.location.reload();
    } catch (error) {
      showToast({ title: 'Failed to confirm proposal', content: error.message, type: 'error' });
      setIsConfirming(false);
    }
  };

  const handleDeleteProposal = async () => {
    if (!proposal?._id || isDeleting) return;
    setIsDeleting(true);
    try {
      await executeDeleteProposal(proposal._id);
      showToast({ title: 'Proposal deleted', type: 'info' });
      if (onProposalDeleted) onProposalDeleted(proposal._id);
    } catch (error) {
      showToast({ title: 'Failed to delete proposal', content: error.message, type: 'error' });
      setIsDeleting(false);
    }
  };

  const handleNotInterestedConfirm = async (feedback) => {
    if (!proposal?._id || isNotInterestedProcessing) return;
    setIsNotInterestedProcessing(true);
    try {
      await dismissProposal(proposal._id, feedback);
      showToast({ title: 'Proposal dismissed', type: 'info' });
      setShowNotInterestedModal(false);
      if (onProposalDeleted) onProposalDeleted(proposal._id);
    } catch (error) {
      showToast({ title: 'Failed to dismiss proposal', content: error.message, type: 'error' });
    } finally {
      setIsNotInterestedProcessing(false);
    }
  };

  if (!proposal) return null;

  const shortStatusLabel = getShortStatusLabel(status);
  const statusBadgeClass = getStatusBadgeClass(status);
  const metaText = buildMetaText(daysSelected, reservationWeeks);
  const currentUser = { _id: currentUserId, typeUserSignup: 'guest' };

  // Generate unique ID for ARIA relationships
  const contentId = `proposal-content-${proposal._id}`;

  return (
    <div
      className={`epc-card ${isExpanded ? 'expanded' : ''} ${isSuggested ? 'suggested' : ''}`}
      role="listitem"
    >
      {/* Collapsed Header Row - Accessible Accordion Trigger */}
      <div
        className="epc-header"
        onClick={onToggle}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        aria-controls={contentId}
        aria-label={`${listingName}, ${shortStatusLabel}. ${isExpanded ? 'Collapse' : 'Expand'} to ${isExpanded ? 'hide' : 'view'} details`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggle();
          }
        }}
      >
        {photoUrl ? (
          <img src={photoUrl} alt="" className="epc-thumb" aria-hidden="true" />
        ) : (
          <div className="epc-thumb epc-thumb--placeholder" aria-hidden="true" />
        )}

        <div className="epc-info">
          <div className="epc-name">{listingName}</div>
          <div className="epc-meta">{metaText}</div>
        </div>

        <div className={`epc-status ${statusBadgeClass}`} aria-label={`Status: ${shortStatusLabel}`}>
          {shortStatusLabel}
        </div>

        <ChevronIcon isExpanded={isExpanded} />
      </div>

      {/* Expandable Content Panel */}
      <div
        id={contentId}
        className="epc-content-wrapper"
        style={{ height: contentHeight }}
        role="region"
        aria-labelledby={`proposal-header-${proposal._id}`}
        hidden={!isExpanded && contentHeight === 0}
      >
        <div ref={contentRef} className="epc-content">
          {/* Match Reason Card for SL-suggested proposals */}
          {isSuggested && <MatchReasonCard proposal={proposal} />}

          {/* Negotiation Summary Section - for all proposals with summaries */}
          {negotiationSummaries.length > 0 && (
            <NegotiationSummarySection summaries={negotiationSummaries} />
          )}

          {/* Counteroffer Summary Section - for proposals with host counteroffer */}
          {isCounteroffer && counterofferSummary && (
            <CounterofferSummarySection summary={counterofferSummary} />
          )}

          {/* Status Banner */}
          <StatusBanner status={status} cancelReason={cancelReason} isCounteroffer={isCounteroffer} />

          {/* Detail Header */}
          <div className="epc-detail-header">
            <div className="epc-detail-title-area">
              <div className="epc-detail-title">{listingName}</div>
              <div className="epc-detail-location">{location}</div>
            </div>
            <div className="epc-detail-host">
              {hostPhoto ? (
                <img src={hostPhoto} alt={hostName} className="epc-host-photo" />
              ) : (
                <div className="epc-host-photo-placeholder">
                  {hostName.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="epc-host-name">{hostName}</div>
              <div className="epc-host-label">Host</div>
            </div>
          </div>

          {/* Quick Links Row */}
          <div className="epc-links-row">
            <a
              href={getListingUrlWithProposalContext(listing?._id, {
                daysSelected: parseDaysSelectedForContext(proposal),
                reservationSpan: getEffectiveReservationSpan(proposal),
                moveInDate: proposal['Move in range start']
              })}
              className="epc-link-item"
              target="_blank"
              rel="noopener noreferrer"
            >
              View Listing
            </a>
            <button className="epc-link-item" onClick={() => setShowMapModal(true)}>
              Map
            </button>
            <button className="epc-link-item" onClick={() => navigateToMessaging(host?._id, proposal._id)}>
              Message Host
            </button>
            <button className="epc-link-item" onClick={() => setShowHostProfileModal(true)}>
              Host Profile
            </button>
            {hasHouseRules && (
              <button className="epc-link-item" onClick={() => setShowHouseRules(!showHouseRules)}>
                {showHouseRules ? 'Hide Rules' : 'House Rules'}
              </button>
            )}
          </div>

          {/* House Rules Grid */}
          {showHouseRules && hasHouseRules && (
            <div className="epc-house-rules-grid">
              {houseRules.map((rule, index) => (
                <div key={index} className="epc-house-rule-badge">{rule}</div>
              ))}
            </div>
          )}

          {/* Info Grid */}
          <div className="epc-info-grid">
            <div className="epc-info-item">
              <div className="epc-info-label">Ideal Move-in</div>
              <div className="epc-info-value">
                {moveInChanged && originalMoveInDisplay && (
                  <span className="epc-strikethrough">{originalMoveInDisplay}</span>
                )}
                <span className={moveInChanged ? 'epc-changed-value' : ''}>
                  {anticipatedMoveIn || 'TBD'}
                </span>
              </div>
            </div>
            <div className="epc-info-item">
              <div className="epc-info-label">Duration</div>
              <div className="epc-info-value">
                {durationChanged && (
                  <span className="epc-strikethrough">{originalReservationWeeks} weeks</span>
                )}
                <span className={durationChanged ? 'epc-changed-value' : ''}>
                  {reservationWeeks} weeks
                </span>
              </div>
            </div>
            <div className="epc-info-item">
              <div className="epc-info-label">Schedule</div>
              <div className="epc-info-value">
                {scheduleChanged && (
                  <span className="epc-strikethrough">{originalCheckInOutRange}</span>
                )}
                <span className={scheduleChanged ? 'epc-changed-value' : ''}>
                  {checkInOutRange || 'Flexible'}
                </span>
              </div>
            </div>
            <div className="epc-info-item">
              <div className="epc-info-label">Nights/week</div>
              <div className="epc-info-value">
                {daysChanged && (
                  <span className="epc-strikethrough">{originalNightsPerWeek} nights</span>
                )}
                <span className={daysChanged ? 'epc-changed-value' : ''}>
                  {nightsPerWeek} nights
                </span>
              </div>
            </div>
          </div>

          {/* Days Row */}
          <div className="epc-days-row">
            <span className="epc-days-label" id={`days-label-${proposal._id}`}>Schedule</span>
            <div
              className="epc-days-pills"
              role="group"
              aria-labelledby={`days-label-${proposal._id}`}
              aria-label="Selected days of the week"
            >
              {allDays.map((day) => (
                <div
                  key={day.index}
                  className={`epc-day-pill ${day.selected ? 'selected' : ''}`}
                  aria-label={`${DAY_NAMES[day.index]}${day.selected ? ', selected' : ''}`}
                  aria-pressed={day.selected}
                >
                  {day.letter}
                </div>
              ))}
            </div>
            <div className="epc-days-info">
              <div className="epc-days-count">
                {nightsPerWeek + 1} days, {nightsPerWeek} nights
                {someNightsUnavailable && (
                  <span className="epc-nights-warning" title="Some nights unavailable">⚠</span>
                )}
              </div>
              <div className="epc-days-range">Check-in {checkInTime}, Check-out {checkOutTime}</div>
            </div>
          </div>

          {/* Pricing Row */}
          <div className="epc-pricing-row">
            <div className="epc-pricing-breakdown">
              <span>
                {nightlyPriceChanged && (
                  <span className="epc-strikethrough">{formatPrice(originalNightlyPrice)}</span>
                )}
                <span className={nightlyPriceChanged ? 'epc-changed-value' : ''}>
                  {formatPrice(nightlyPrice)}
                </span>
                /night
              </span>
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
            <div className="epc-pricing-total-area">
              <div className="epc-pricing-total-label">
                Estimated Total
                {totalPriceChanged && (
                  <span className="epc-pricing-original">{formatPrice(originalTotalPrice)}</span>
                )}
              </div>
              <div className={`epc-pricing-total ${totalPriceChanged ? 'epc-changed-value' : ''}`}>
                {formatPrice(totalPrice)}
              </div>
            </div>
          </div>

          {/* Progress Tracker */}
          <InlineProgressTracker
            status={status}
            usualOrder={statusConfig?.usualOrder || 0}
            isTerminal={isTerminal}
            proposal={proposal}
          />

          {/* Actions Row */}
          <div className="epc-actions-row">
            {/* VM status text (for disabled states) */}
            {vmConfig.visible && vmConfig.disabled && (
              <span className={`epc-vm-text ${vmConfig.className === 'btn-vm-requested' ? 'waiting' : ''}`}>
                {vmConfig.label}
              </span>
            )}

            {/* Primary action (Guest Action 1) */}
            {buttonConfig?.guestAction1?.visible && (
              buttonConfig.guestAction1.action === 'go_to_leases' ? (
                <a href="/my-leases" className="epc-btn epc-btn--primary">
                  {buttonConfig.guestAction1.label}
                </a>
              ) : (
                <button
                  className={`epc-btn ${buttonConfig.guestAction1.action === 'delete_proposal' ? 'epc-btn--danger' : 'epc-btn--primary'}`}
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

            {/* VM action button */}
            {vmConfig.visible && !vmConfig.disabled && (
              <button className="epc-btn epc-btn--outline" onClick={handleVMButtonClick}>
                {vmConfig.view === 'request' ? 'Schedule Meeting' : vmConfig.label}
              </button>
            )}

            {/* Guest Action 2 */}
            {buttonConfig?.guestAction2?.visible && (
              <button
                className={`epc-btn ${
                  buttonConfig.guestAction2.action === 'reject_suggestion' ? 'epc-btn--not-interested' :
                  buttonConfig.guestAction2.action === 'review_counteroffer' ? 'epc-btn--attention' :
                  'epc-btn--outline'
                }`}
                onClick={() => {
                  if (buttonConfig.guestAction2.action === 'see_details') {
                    setProposalDetailsModalInitialView('pristine');
                    setShowProposalDetailsModal(true);
                  } else if (buttonConfig.guestAction2.action === 'submit_rental_app') {
                    goToRentalApplication(proposal._id);
                  } else if (buttonConfig.guestAction2.action === 'reject_suggestion') {
                    setShowNotInterestedModal(true);
                  } else if (buttonConfig.guestAction2.action === 'review_counteroffer') {
                    setShowCompareTermsModal(true);
                  }
                }}
              >
                {buttonConfig.guestAction2.label}
              </button>
            )}

            {/* Edit button */}
            {!isTerminal && !isCompleted && (
              <button
                className="epc-btn epc-btn--ghost"
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
                className={`epc-btn ${
                  buttonConfig.cancelButton.action === 'delete_proposal' ? 'epc-btn--danger' :
                  buttonConfig.cancelButton.action === 'see_house_manual' ? 'epc-btn--ghost' :
                  'epc-btn--danger'
                }`}
                disabled={buttonConfig.cancelButton.disabled}
                onClick={() => {
                  if (buttonConfig.cancelButton.action === 'delete_proposal') {
                    handleDeleteProposal();
                  } else if (['cancel_proposal', 'reject_counteroffer', 'reject_proposal'].includes(buttonConfig.cancelButton.action)) {
                    setShowCancelModal(true);
                  }
                }}
              >
                {buttonConfig.cancelButton.label}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showHostProfileModal && (
        <HostProfileModal
          host={host}
          listing={listing}
          onClose={() => setShowHostProfileModal(false)}
        />
      )}

      {showProposalDetailsModal && (
        <GuestEditingProposalModal
          proposal={proposal}
          listing={listing}
          user={{ type: 'guest' }}
          initialView={proposalDetailsModalInitialView}
          isVisible={showProposalDetailsModal}
          onClose={() => {
            setShowProposalDetailsModal(false);
            setProposalDetailsModalInitialView('pristine');
          }}
          onProposalCancel={() => {
            setShowProposalDetailsModal(false);
            window.location.reload();
          }}
          pricePerNight={nightlyPrice}
          totalPriceForReservation={totalPrice}
          priceRentPer4Weeks={proposal['Price Rent per 4 weeks'] || (nightlyPrice * nightsPerWeek * 4)}
        />
      )}

      <CancelProposalModal
        isOpen={showCancelModal}
        proposal={proposal}
        buttonText="Cancel Proposal"
        onClose={() => setShowCancelModal(false)}
        onConfirm={() => setShowCancelModal(false)}
      />

      <NotInterestedModal
        isOpen={showNotInterestedModal}
        proposal={proposal}
        onClose={() => !isNotInterestedProcessing && setShowNotInterestedModal(false)}
        onConfirm={handleNotInterestedConfirm}
        isProcessing={isNotInterestedProcessing}
      />

      {showVMModal && (
        <VirtualMeetingManager
          proposal={proposal}
          initialView={vmInitialView}
          currentUser={currentUser}
          onClose={() => { setShowVMModal(false); setVmInitialView(''); }}
          onSuccess={() => window.location.reload()}
        />
      )}

      <FullscreenProposalMapModal
        isOpen={showMapModal}
        onClose={() => setShowMapModal(false)}
        proposals={allProposals}
        currentProposalId={proposal._id}
        onProposalSelect={onProposalSelect}
      />

      {/* Compare Terms Modal - for proposals with counteroffer */}
      {showCompareTermsModal && isCounteroffer && (
        <CompareTermsModal
          proposal={proposal}
          onClose={() => setShowCompareTermsModal(false)}
          onAcceptCounteroffer={() => {
            setShowCompareTermsModal(false);
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}
