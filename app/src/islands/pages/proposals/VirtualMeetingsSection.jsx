/**
 * Virtual Meetings Section Component
 *
 * Displays a list of proposals with active virtual meetings on the Guest Proposals page.
 * Shows below the proposal card wrapper when there are proposals with virtual meetings.
 *
 * Visibility Logic (from Bubble):
 * - Visible when: filtered proposals count > 0
 * - Filter conditions:
 *   - virtual meeting isn't empty
 *   - Status <> Proposal Cancelled by Guest
 *   - Status <> Proposal Rejected by Host
 *   - booked date > current OR suggested dates last item > current
 *   - meeting declined is no
 *   - Status <> Proposal Cancelled by Split Lease
 *
 * State-Aware Behavior:
 * - Uses virtualMeetingRules.js for state determination
 * - Dynamically shows appropriate buttons and messages based on VM state
 */

import { useState, useMemo } from 'react';
import VirtualMeetingManager from '../../shared/VirtualMeetingManager/VirtualMeetingManager.jsx';
import {
  getVirtualMeetingState,
  getVMStateInfo,
  VM_STATES,
  areAllDatesExpired
} from '../../../logic/rules/proposals/virtualMeetingRules.js';

// Calendar icon SVG (inline to match Bubble's design)
const CalendarIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
    <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2"/>
    <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

// Chevron icon for expand/collapse
const ChevronIcon = ({ isExpanded }) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`vm-compact-chevron ${isExpanded ? 'vm-compact-chevron--expanded' : ''}`}
  >
    <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// Default profile icon (compact size for summary row)
const DefaultProfileIcon = () => (
  <svg width="32" height="32" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="24" cy="24" r="24" fill="#E8E8E8"/>
    <circle cx="24" cy="18" r="8" fill="#6B4EFF"/>
    <path d="M8 42c0-8.837 7.163-16 16-16s16 7.163 16 16" fill="#6B4EFF"/>
  </svg>
);

/**
 * Format a short date for proposal identification
 * Shows just month and day, e.g., "Dec 12"
 */
function formatShortDate(dateStr) {
  if (!dateStr) return '';

  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  } catch (e) {
    return '';
  }
}

/**
 * Format a date/time string for display
 * Expected format from Bubble: ISO datetime or readable string
 */
function formatDateTime(dateTimeStr) {
  if (!dateTimeStr) return '';

  try {
    const date = new Date(dateTimeStr);
    if (isNaN(date.getTime())) {
      // If not a valid date, return as-is (might already be formatted)
      return dateTimeStr;
    }

    // Format: "Dec 3, 2025 1:00 pm"
    const options = {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    };

    return date.toLocaleString('en-US', options).replace(',', '');
  } catch (e) {
    return dateTimeStr;
  }
}

/**
 * Check if a date/time is in the future
 */
function isFutureDateTime(dateTimeStr) {
  if (!dateTimeStr) return false;

  try {
    const date = new Date(dateTimeStr);
    return date.getTime() > Date.now();
  } catch (e) {
    return false;
  }
}

/**
 * Parse suggested dates - handles both array and JSON string formats
 */
function parseSuggestedDates(suggestedDates) {
  if (!suggestedDates) return [];

  // If already an array, return as-is
  if (Array.isArray(suggestedDates)) return suggestedDates;

  // If it's a string, try to parse it as JSON
  if (typeof suggestedDates === 'string') {
    try {
      const parsed = JSON.parse(suggestedDates);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  return [];
}

/**
 * Get the last item from an array of dates
 */
function getLastSuggestedDate(suggestedDates) {
  const dates = parseSuggestedDates(suggestedDates);
  if (dates.length === 0) return null;
  return dates[dates.length - 1];
}

/**
 * Check if ANY suggested date is in the future
 */
function hasAnyFutureSuggestedDate(suggestedDates) {
  const dates = parseSuggestedDates(suggestedDates);
  return dates.some(dateStr => isFutureDateTime(dateStr));
}

/**
 * Normalize VM object field names from Bubble format to camelCase
 * Bubble uses: 'meeting declined', 'booked date', 'confirmed by splitlease'
 * Rules expect: meetingDeclined, bookedDate, confirmedBySplitlease
 */
function normalizeVMObject(vm) {
  if (!vm) return null;

  return {
    // Original object preserved for any other fields
    ...vm,
    // Normalized fields for virtualMeetingRules.js
    meetingDeclined: vm['meeting declined'] ?? vm.meetingDeclined ?? false,
    bookedDate: vm['booked date'] ?? vm.bookedDate ?? null,
    confirmedBySplitlease: vm['confirmedBySplitLease'] ?? vm.confirmedBySplitlease ?? false,
    requestedBy: vm['requested by'] ?? vm.requestedBy ?? null,
    meetingLink: vm['meeting link'] ?? vm.meetingLink ?? null,
    suggestedDates: vm['suggested dates and times'] ?? vm.suggestedDates ?? []
  };
}

/**
 * Determine which modal view to open based on VM state
 */
function getModalViewForState(vmState) {
  switch (vmState) {
    case VM_STATES.REQUESTED_BY_OTHER:
      return 'respond';
    case VM_STATES.BOOKED_AWAITING_CONFIRMATION:
    case VM_STATES.CONFIRMED:
      return 'details';
    case VM_STATES.EXPIRED:
      return 'request'; // Open request form to submit new times
    case VM_STATES.REQUESTED_BY_ME:
    case VM_STATES.NO_MEETING:
    case VM_STATES.DECLINED:
    default:
      return 'cancel';
  }
}

/**
 * Get the context message to display based on VM state
 * Note: On guest proposals page, "other party" = host
 */
function getCardMessage(vmState, hostName) {
  switch (vmState) {
    case VM_STATES.REQUESTED_BY_OTHER:
      // Other party (host) requested, guest should respond
      return `${hostName} has suggested times for a virtual meeting:`;
    case VM_STATES.REQUESTED_BY_ME:
      // Current user (guest) requested, waiting for host
      return `You've requested a virtual meeting. Waiting for ${hostName}'s response.`;
    case VM_STATES.BOOKED_AWAITING_CONFIRMATION:
      return `Your meeting is scheduled. Waiting for Split Lease confirmation.`;
    case VM_STATES.CONFIRMED:
      return `Your virtual meeting is confirmed!`;
    case VM_STATES.EXPIRED:
      return `Your meeting request expired without a response. You can request new times.`;
    default:
      return `A virtual meeting with ${hostName} has been suggested:`;
  }
}

/**
 * Get badge configuration based on VM state
 * Returns { text, className } or null if no badge needed
 */
function getStateBadge(vmState) {
  switch (vmState) {
    case VM_STATES.REQUESTED_BY_ME:
      return { text: 'Awaiting Response', className: 'vm-section-badge-waiting' };
    case VM_STATES.BOOKED_AWAITING_CONFIRMATION:
      return { text: 'Pending Confirmation', className: 'vm-section-badge-pending' };
    case VM_STATES.CONFIRMED:
      return { text: 'Confirmed', className: 'vm-section-badge-confirmed' };
    case VM_STATES.EXPIRED:
      return { text: 'Expired', className: 'vm-section-badge-expired' };
    default:
      return null;
  }
}

/**
 * Get primary button configuration based on VM state
 * Returns { text, className, disabled, view }
 */
function getPrimaryButtonConfig(vmStateInfo, vmState) {
  switch (vmState) {
    case VM_STATES.REQUESTED_BY_OTHER:
      return {
        text: 'Respond to Virtual Meeting',
        className: 'vm-section-primary-btn vm-section-primary-btn--respond',
        disabled: false,
        view: 'respond'
      };
    case VM_STATES.REQUESTED_BY_ME:
      // No primary button when guest requested - only show "Cancel Request" secondary button
      return null;
    case VM_STATES.BOOKED_AWAITING_CONFIRMATION:
      return {
        text: 'View Meeting Details',
        className: 'vm-section-primary-btn vm-section-primary-btn--details',
        disabled: false,
        view: 'details'
      };
    case VM_STATES.CONFIRMED:
      return {
        text: 'Join Virtual Meeting',
        className: 'vm-section-primary-btn vm-section-primary-btn--join',
        disabled: false,
        view: 'details'
      };
    case VM_STATES.EXPIRED:
      return {
        text: 'Request New Times',
        className: 'vm-section-primary-btn vm-section-primary-btn--expired',
        disabled: false,
        view: 'request'
      };
    default:
      return null;
  }
}

/**
 * Filter proposals to only those with virtual meetings (active OR expired)
 *
 * Based on Bubble's List filter conditions with modification:
 * - virtual meeting isn't empty
 * - Status <> Proposal Cancelled by Guest
 * - Status <> Proposal Rejected by Host
 * - Status <> Proposal Cancelled by Split Lease
 * - meeting declined is no
 *
 * NOTE: We now INCLUDE expired VMs (where all dates are in the past)
 * so users can see expired requests and create new ones.
 */
function filterProposalsWithActiveVM(proposals) {
  if (!proposals || !Array.isArray(proposals)) return [];

  const excludedStatuses = [
    'Proposal Cancelled by Guest',
    'Proposal Rejected by Host',
    'Proposal Cancelled by Split Lease'
  ];

  return proposals.filter(proposal => {
    const vm = proposal.virtualMeeting;

    // Must have a virtual meeting
    if (!vm) {
      return false;
    }

    // Status must not be in excluded list
    const status = proposal.Status?.trim();
    if (excludedStatuses.includes(status)) {
      return false;
    }

    // Meeting must not be declined
    if (vm['meeting declined'] === true) {
      return false;
    }

    // Include ALL VMs that aren't declined (including expired ones)
    // This allows users to see expired requests and create new ones
    return true;
  });
}

/**
 * Get compact action button text (shorter for inline display)
 */
function getCompactButtonText(vmState) {
  switch (vmState) {
    case VM_STATES.REQUESTED_BY_OTHER:
      return 'Respond';
    case VM_STATES.BOOKED_AWAITING_CONFIRMATION:
      return 'View Details';
    case VM_STATES.CONFIRMED:
      return 'Join Meeting';
    case VM_STATES.EXPIRED:
      return 'Request New';
    case VM_STATES.REQUESTED_BY_ME:
      return 'Cancel';
    default:
      return 'View';
  }
}

/**
 * Get the count label for suggested dates
 */
function getTimesLabel(count, vmState) {
  if (vmState === VM_STATES.CONFIRMED || vmState === VM_STATES.BOOKED_AWAITING_CONFIRMATION) {
    return 'Scheduled';
  }
  if (count === 1) return '1 time';
  return `${count} times`;
}

/**
 * Single Virtual Meeting Card - Compact Expandable Version
 * Shows a single-line summary that expands to reveal date details
 */
function VirtualMeetingCard({ proposal, currentUserId, onOpenVMModal, isExpanded, onToggleExpand }) {
  const listing = proposal.listing;
  const host = listing?.host;
  const vm = proposal.virtualMeeting;

  // Normalize VM object for rules compatibility
  const normalizedVM = normalizeVMObject(vm);

  // Get VM state using business rules
  const vmState = getVirtualMeetingState(normalizedVM, currentUserId);
  const vmStateInfo = getVMStateInfo(normalizedVM, currentUserId);

  // Get host name for display (just first name for compact view)
  const hostName = host?.['Name - First'] || host?.['Name - Full']?.split(' ')[0] || 'Host';
  const listingName = listing?.Name || 'Listing';

  // Get suggested dates/times
  const suggestedDates = parseSuggestedDates(vm?.['suggested dates and times']);
  const bookedDate = normalizedVM?.bookedDate;

  // Calculate times count
  const timesCount = bookedDate ? 1 : suggestedDates.length;

  // Get state-specific configurations
  const badge = getStateBadge(vmState);
  const primaryButton = getPrimaryButtonConfig(vmStateInfo, vmState);
  const compactButtonText = getCompactButtonText(vmState);
  const timesLabel = getTimesLabel(timesCount, vmState);

  // Determine button action view
  const buttonView = primaryButton?.view || (vmState === VM_STATES.REQUESTED_BY_ME ? 'cancel' : 'details');

  // Has expandable content?
  const hasExpandableContent = bookedDate || suggestedDates.length > 0;

  return (
    <div className={`vm-compact-card ${isExpanded ? 'vm-compact-card--expanded' : ''}`}>
      {/* Collapsed summary row */}
      <div className="vm-compact-row">
        {/* Left: Avatar + Name */}
        <div className="vm-compact-identity">
          <div className="vm-compact-avatar">
            {host?.['Profile Photo'] ? (
              <img
                src={host['Profile Photo']}
                alt={hostName}
                className="vm-compact-avatar-img"
              />
            ) : (
              <DefaultProfileIcon />
            )}
          </div>
          <span className="vm-compact-name">{hostName}</span>
        </div>

        {/* Center: Badge + Times count */}
        <div className="vm-compact-status">
          {badge && (
            <span className={`vm-compact-badge ${badge.className}`}>
              {badge.text}
            </span>
          )}
          {timesCount > 0 && (
            <span className="vm-compact-times">
              <CalendarIcon />
              {timesLabel}
            </span>
          )}
        </div>

        {/* Right: Action button + Expand chevron */}
        <div className="vm-compact-actions">
          <button
            className="vm-compact-btn"
            onClick={(e) => {
              e.stopPropagation();
              onOpenVMModal(proposal, buttonView);
            }}
          >
            {compactButtonText}
          </button>
          {hasExpandableContent && (
            <button
              className="vm-compact-expand-btn"
              onClick={onToggleExpand}
              aria-expanded={isExpanded}
              aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
            >
              <ChevronIcon isExpanded={isExpanded} />
            </button>
          )}
        </div>
      </div>

      {/* Expanded content: Date pills */}
      {isExpanded && hasExpandableContent && (
        <div className="vm-compact-details">
          {bookedDate ? (
            <div className="vm-compact-date-pill vm-compact-date-pill--booked">
              {formatDateTime(bookedDate)}
            </div>
          ) : (
            suggestedDates.map((dateTime, index) => {
              const isDateExpired = !isFutureDateTime(dateTime);
              return (
                <div
                  key={index}
                  className={`vm-compact-date-pill ${isDateExpired ? 'vm-compact-date-pill--expired' : ''}`}
                >
                  {formatDateTime(dateTime)}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Virtual Meetings Section - Compact Version
 * Shows collapsible summary rows for each virtual meeting
 */
export default function VirtualMeetingsSection({ proposals, currentUserId }) {
  const [showVMModal, setShowVMModal] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [vmInitialView, setVmInitialView] = useState('');
  const [expandedCardId, setExpandedCardId] = useState(null);

  // Filter to only proposals with active virtual meetings
  const proposalsWithActiveVM = useMemo(() => {
    return filterProposalsWithActiveVM(proposals);
  }, [proposals]);

  // Don't render if no proposals with active VMs
  if (proposalsWithActiveVM.length === 0) {
    return null;
  }

  // Handler for opening VM modal
  const handleOpenVMModal = (proposal, view) => {
    setSelectedProposal(proposal);
    setVmInitialView(view);
    setShowVMModal(true);
  };

  // Handler for closing VM modal
  const handleCloseVMModal = () => {
    setShowVMModal(false);
    setSelectedProposal(null);
    setVmInitialView('');
  };

  // Handler for VM action success
  const handleVMSuccess = () => {
    // Reload page to get fresh data
    window.location.reload();
  };

  // Handler for toggling card expansion
  const handleToggleExpand = (proposalId) => {
    setExpandedCardId(prev => prev === proposalId ? null : proposalId);
  };

  // Construct current user object for VirtualMeetingManager
  const currentUser = {
    _id: currentUserId,
    typeUserSignup: 'guest'
  };

  return (
    <div className="vm-compact-wrapper">
      {/* Section Title */}
      <h2 className="vm-compact-heading">Virtual Meetings</h2>

      {/* Compact Virtual Meeting Cards */}
      <div className="vm-compact-list">
        {proposalsWithActiveVM.map((proposal) => (
          <VirtualMeetingCard
            key={proposal._id}
            proposal={proposal}
            currentUserId={currentUserId}
            onOpenVMModal={handleOpenVMModal}
            isExpanded={expandedCardId === proposal._id}
            onToggleExpand={() => handleToggleExpand(proposal._id)}
          />
        ))}
      </div>

      {/* Virtual Meeting Manager Modal */}
      {showVMModal && selectedProposal && (
        <VirtualMeetingManager
          proposal={selectedProposal}
          initialView={vmInitialView}
          currentUser={currentUser}
          onClose={handleCloseVMModal}
          onSuccess={handleVMSuccess}
        />
      )}
    </div>
  );
}
