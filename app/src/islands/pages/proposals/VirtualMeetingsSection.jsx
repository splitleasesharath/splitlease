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
 */

import { useState, useMemo } from 'react';
import VirtualMeetingManager from '../../shared/VirtualMeetingManager/VirtualMeetingManager.jsx';

// Calendar icon SVG (inline to match Bubble's design)
const CalendarIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="4" width="18" height="18" rx="2" stroke="#6B4EFF" strokeWidth="2"/>
    <line x1="3" y1="10" x2="21" y2="10" stroke="#6B4EFF" strokeWidth="2"/>
    <line x1="8" y1="2" x2="8" y2="6" stroke="#6B4EFF" strokeWidth="2" strokeLinecap="round"/>
    <line x1="16" y1="2" x2="16" y2="6" stroke="#6B4EFF" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

// Default profile icon (matching Bubble's COLOR-1.svg)
const DefaultProfileIcon = () => (
  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="24" cy="24" r="24" fill="#E8E8E8"/>
    <circle cx="24" cy="18" r="8" fill="#6B4EFF"/>
    <path d="M8 42c0-8.837 7.163-16 16-16s16 7.163 16 16" fill="#6B4EFF"/>
  </svg>
);

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
 * Get the last item from an array of dates
 */
function getLastSuggestedDate(suggestedDates) {
  if (!suggestedDates || !Array.isArray(suggestedDates) || suggestedDates.length === 0) {
    return null;
  }
  return suggestedDates[suggestedDates.length - 1];
}

/**
 * Filter proposals to only those with active virtual meetings
 *
 * Based on Bubble's List filter conditions:
 * - virtual meeting isn't empty
 * - Status <> Proposal Cancelled by Guest
 * - Status <> Proposal Rejected by Host
 * - Status <> Proposal Cancelled by Split Lease
 * - booked date > current OR suggested dates last item > current
 * - meeting declined is no
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
    if (!vm) return false;

    // Status must not be in excluded list
    const status = proposal.Status?.trim();
    if (excludedStatuses.includes(status)) return false;

    // Meeting must not be declined
    if (vm['meeting declined'] === true) return false;

    // Either booked date is in future OR last suggested date is in future
    const bookedDate = vm['booked date'];
    const suggestedDates = vm['suggested dates and times'];
    const lastSuggestedDate = getLastSuggestedDate(suggestedDates);

    const hasFutureBookedDate = isFutureDateTime(bookedDate);
    const hasFutureSuggestedDate = isFutureDateTime(lastSuggestedDate);

    if (!hasFutureBookedDate && !hasFutureSuggestedDate) return false;

    return true;
  });
}

/**
 * Single Virtual Meeting Card
 */
function VirtualMeetingCard({ proposal, currentUserId, onOpenVMModal }) {
  const listing = proposal.listing;
  const host = listing?.host;
  const vm = proposal.virtualMeeting;

  // Get host name and listing name for display
  const hostName = host?.['Name - First'] || host?.['Name - Full'] || 'Host';
  const listingName = listing?.Name || 'Listing';
  const displayTitle = `${hostName} - ${listingName}`;

  // Get guest name for the message
  const guestName = proposal.guest?.['Name - First'] || proposal.guest?.['Name - Full'] || 'Guest';

  // Get suggested dates/times
  let suggestedDates = vm?.['suggested dates and times'] || [];
  if (typeof suggestedDates === 'string') {
    try {
      suggestedDates = JSON.parse(suggestedDates);
    } catch (e) {
      suggestedDates = [];
    }
  }

  // Build the message text
  const messageText = `A virtual meeting with ${hostName} has been suggested for the times:`;

  return (
    <div className="vm-section-card">
      <div className="vm-section-card-content">
        {/* Header row with icon and text */}
        <div className="vm-section-header-row">
          {/* Profile icon/image */}
          <div className="vm-section-profile-icon">
            {host?.['Profile Photo'] ? (
              <img
                src={host['Profile Photo']}
                alt={hostName}
                className="vm-section-profile-img"
              />
            ) : (
              <DefaultProfileIcon />
            )}
          </div>

          {/* Text content */}
          <div className="vm-section-text-content">
            <div className="vm-section-title">{displayTitle}</div>
            <div className="vm-section-message-row">
              <CalendarIcon />
              <span className="vm-section-message">{messageText}</span>
            </div>
          </div>
        </div>

        {/* Date/time pills */}
        <div className="vm-section-dates-row">
          {suggestedDates.map((dateTime, index) => (
            <div key={index} className="vm-section-date-pill">
              {formatDateTime(dateTime)}
            </div>
          ))}
        </div>
      </div>

      {/* Action bar */}
      <div className="vm-section-action-bar">
        <button
          className="vm-section-cancel-btn"
          onClick={() => onOpenVMModal(proposal, 'cancel')}
        >
          Cancel Virtual Meeting
        </button>
      </div>
    </div>
  );
}

/**
 * Virtual Meetings Section
 * Main exported component
 */
export default function VirtualMeetingsSection({ proposals, currentUserId }) {
  const [showVMModal, setShowVMModal] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [vmInitialView, setVmInitialView] = useState('');

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

  // Construct current user object for VirtualMeetingManager
  const currentUser = {
    _id: currentUserId,
    typeUserSignup: 'guest'
  };

  return (
    <div className="vm-section-wrapper">
      {/* Section Title */}
      <h2 className="vm-section-heading">Virtual Meetings</h2>

      {/* Virtual Meeting Cards */}
      <div className="vm-section-list">
        {proposalsWithActiveVM.map((proposal) => (
          <VirtualMeetingCard
            key={proposal._id}
            proposal={proposal}
            currentUserId={currentUserId}
            onOpenVMModal={handleOpenVMModal}
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
