/**
 * ProposalDetailsModal Component
 *
 * Slide-in modal showing full proposal details with actions.
 */

import { useState } from 'react';
import DayIndicator from './DayIndicator.jsx';
import { getStatusTagInfo, getNightsAsDayNames, getCheckInOutFromNights, PROGRESS_THRESHOLDS } from './types.js';
import { formatCurrency, formatDate, formatDateTime } from './formatters.js';
import { getStatusConfig, getUsualOrder, isTerminalStatus } from '../../../logic/constants/proposalStatuses.js';

/**
 * Get host-appropriate status message based on proposal status
 * Maps guest-facing labels to host-appropriate action messages
 *
 * @param {Object} statusConfig - Status configuration from getStatusConfig()
 * @param {boolean} rentalAppSubmitted - Whether rental application has been submitted
 * @returns {string} Host-facing status message
 */
function getHostStatusMessage(statusConfig, rentalAppSubmitted) {
  const { key, usualOrder } = statusConfig;

  // Map status keys to host-appropriate messages
  const hostMessages = {
    // Pre-acceptance states
    'Proposal Submitted by guest - Awaiting Rental Application': 'Request Rental App Submission',
    'Proposal Submitted for guest by Split Lease - Awaiting Rental Application': 'Request Rental App Submission',
    'Proposal Submitted for guest by Split Lease - Pending Confirmation': 'Awaiting Guest Confirmation',
    'Pending': 'Proposal Pending',
    'Pending Confirmation': 'Awaiting Guest Confirmation',
    'Host Review': rentalAppSubmitted ? 'Rental App Received - Review & Decide' : 'Under Your Review',
    'Rental Application Submitted': 'Rental App Received - Review & Decide',

    // Counteroffer states
    'Host Counteroffer Submitted / Awaiting Guest Review': 'Counteroffer Sent - Awaiting Guest Response',

    // Post-acceptance states
    'Proposal or Counteroffer Accepted / Drafting Lease Documents': 'Accepted - Drafting Lease Documents',
    'Reviewing Documents': 'Documents Under Review',
    'Lease Documents Sent for Review': 'Lease Documents Sent to Guest',
    'Lease Documents Sent for Signatures': 'Awaiting Signatures',
    'Lease Documents Signed / Awaiting Initial payment': 'Awaiting Initial Payment',
    'Lease Signed / Awaiting Initial Payment': 'Awaiting Initial Payment',
    'Initial Payment Submitted / Lease activated ': 'Lease Activated!',
  };

  // Return mapped message or fallback to status label
  return hostMessages[key] || statusConfig.label || 'Review Proposal';
}

/**
 * @param {Object} props
 * @param {Object|null} props.proposal - Proposal data
 * @param {boolean} props.isOpen - Whether modal is open
 * @param {Function} props.onClose - Close callback
 * @param {Function} [props.onAccept] - Accept proposal callback
 * @param {Function} [props.onReject] - Reject proposal callback
 * @param {Function} [props.onModify] - Modify proposal callback
 * @param {Function} [props.onSendMessage] - Send message callback
 * @param {Function} [props.onRemindSplitLease] - Remind Split Lease callback
 * @param {Function} [props.onChooseVirtualMeeting] - Choose virtual meeting callback
 */
export default function ProposalDetailsModal({
  proposal,
  isOpen,
  onClose,
  onAccept,
  onReject,
  onModify,
  onSendMessage,
  onRemindSplitLease,
  onChooseVirtualMeeting
}) {
  const [guestDetailsExpanded, setGuestDetailsExpanded] = useState(true);
  const [statusExpanded, setStatusExpanded] = useState(true);
  const [virtualMeetingsExpanded, setVirtualMeetingsExpanded] = useState(false);

  if (!proposal || !isOpen) return null;

  // Get status info - use unified status system for proper matching
  // Database stores full Bubble status strings like "Proposal Submitted by guest - Awaiting Rental Application"
  const statusRaw = proposal.Status || proposal.status || '';
  const statusKey = typeof statusRaw === 'string' ? statusRaw : (statusRaw?.id || statusRaw?._id || '');
  const statusConfig = getStatusConfig(statusKey);
  const statusInfo = getStatusTagInfo(statusRaw);
  const usualOrder = statusConfig.usualOrder ?? 0;

  // Terminal states detection using the unified system
  const isCancelled = isTerminalStatus(statusKey);
  const isPending = usualOrder < 5 && !isCancelled; // usualOrder < 5 means not yet accepted (unified system uses 5 for accepted)
  const isAccepted = usualOrder >= 5 && !isCancelled; // Accepted or beyond (usualOrder 5+ in unified system)

  // Special state: Awaiting rental app submission - show in green as positive action
  const isAwaitingRentalApp = statusConfig.key === 'Proposal Submitted by guest - Awaiting Rental Application' ||
                              statusConfig.key === 'Proposal Submitted for guest by Split Lease - Awaiting Rental Application';

  // Check if rental application has been submitted (for "current" state on Host Review)
  const rentalApplication = proposal.rentalApplication || proposal['rental application'] || proposal['Rental Application'];
  const rentalAppSubmitted = rentalApplication?.submitted === 'yes' || rentalApplication?.submitted === true;

  // Get guest info
  const guest = proposal.guest || proposal.Guest || proposal['Created By'] || {};
  const guestName = guest.firstName || guest['Name - First'] || guest['First Name'] || guest.first_name || 'Guest';
  const guestLastName = guest.lastName || guest['Name - Last'] || guest['Last Name'] || guest.last_name || '';
  const guestBio = guest.bio || guest.Bio || '';
  const guestAvatar = guest.avatar || guest.Avatar || guest['Profile Photo'] || guest['Profile Picture'];
  const avatarUrl = guestAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(guestName)}&background=random&size=60`;

  // Verification statuses
  const linkedinVerified = guest.linkedinVerified || guest['Linkedin Verified'] || false;
  const phoneVerified = guest.phoneVerified || guest['Phone Verified'] || false;
  const emailVerified = guest.emailVerified || guest['Email Verified'] || false;
  const identityVerified = guest.identityVerified || guest['Identity Verified'] || false;

  // Get schedule info - use Nights Selected for hosts (they care about nights, not days)
  // Check for host counteroffer nights first, fall back to original proposal nights
  const nightsSelectedRaw = proposal['hc nights selected'] || proposal['Nights Selected (Nights list)'] || proposal.nightsSelected || proposal['Nights Selected'];

  // Get check-in/check-out from nights selected (more accurate than stored check-in/out days)
  const { checkInDay, checkOutDay } = getCheckInOutFromNights(nightsSelectedRaw);
  const checkInTime = proposal.checkInTime || proposal['Check In Time'] || '2:00 pm';
  const checkOutTime = proposal.checkOutTime || proposal['Check Out Time'] || '11:00 am';
  const moveInRangeStart = proposal.moveInRangeStart || proposal['Move in range start'] || proposal['Move In Range Start'];
  const moveInRangeEnd = proposal.moveInRangeEnd || proposal['Move in range end'] || proposal['Move In Range End'];
  const reservationSpanWeeks = proposal.reservationSpanWeeks || proposal['Reservation Span (Weeks)'] || proposal['Reservation Span (weeks)'] || 0;

  // Get pricing info
  // "host compensation" is the per-night HOST rate (from listing pricing tiers)
  // "Total Compensation (proposal - host)" is the total = per-night rate * nights * weeks
  const hostCompensation = proposal.hostCompensation || proposal['host compensation'] || proposal['Host Compensation'] || 0;
  const totalCompensation = proposal.totalCompensation || proposal['Total Compensation (proposal - host)'] || proposal['Total Compensation'] || 0;
  // Use hostCompensation for per-night display - this is the HOST's rate
  // NOTE: "proposal nightly price" is the GUEST-facing rate, not host compensation
  const compensationPerNight = hostCompensation;
  const maintenanceFee = proposal.maintenanceFee || proposal['cleaning fee'] || proposal['Maintenance Fee'] || 0;
  const damageDeposit = proposal.damageDeposit || proposal['damage deposit'] || proposal['Damage Deposit'] || 0;
  const counterOfferHappened = proposal.counterOfferHappened || proposal['Counter Offer Happened'] || false;
  const reasonForCancellation = proposal.reasonForCancellation || proposal['Reason For Cancellation'] || '';

  // Virtual meeting
  const virtualMeeting = proposal.virtualMeeting || proposal['Virtual Meeting'];

  // Get active nights for the day indicator (hosts see nights, not days)
  const activeDays = getNightsAsDayNames(nightsSelectedRaw);

  /**
   * Get progress steps based on usualOrder thresholds from Bubble's "Status - Proposal" option set
   *
   * Step states:
   * - 'completed': usualOrder >= threshold (purple #31135D)
   * - 'current': actively in progress (gray #BFBFBF) - only for Host Review when rental app submitted
   * - 'incomplete': not yet reached (light gray #EDEAF6)
   * - 'cancelled'/'rejected': proposal was cancelled/rejected (red #DB2E2E)
   *
   * Unified system usualOrder values:
   * - 1-3: Pre-acceptance (Pending, Host Review, Proposal Submitted Awaiting Rental App)
   * - 4: Host Counteroffer
   * - 5: Accepted / Drafting Docs
   * - 6: Lease Documents
   * - 7: Payment Submitted / Lease Activated
   */
  const getProgressSteps = () => {
    // Special case: Host Review is "current" (gray) when status is Host Review AND rental app is submitted
    const isHostReviewCurrent = statusConfig.key === 'Host Review' && rentalAppSubmitted;

    // Unified system thresholds (different from legacy types.js):
    // - Rental App completed: usualOrder >= 3 (proposal submitted, awaiting or submitted rental app)
    // - Host Review completed: usualOrder >= 5 (Accepted)
    // - Lease Docs completed: usualOrder >= 6
    // - Initial Payment completed: usualOrder >= 7
    return {
      proposalSubmitted: {
        completed: true, // Always completed once proposal exists
        current: false
      },
      rentalApp: {
        completed: usualOrder >= 3, // Rental app step is done once past "Proposal Submitted Awaiting Rental App" (usualOrder 3)
        current: false
      },
      hostReview: {
        completed: usualOrder >= 5, // Host Review completed when Accepted (usualOrder 5)
        current: isHostReviewCurrent // Gray when in Host Review status with rental app submitted
      },
      leaseDocs: {
        completed: usualOrder >= 6, // Lease docs sent
        current: false
      },
      initialPayment: {
        completed: usualOrder >= 7, // Payment submitted / Lease activated
        current: false
      }
    };
  };

  const progress = getProgressSteps();

  /**
   * Get CSS class for a progress step
   * Priority: cancelled > completed > current > (default incomplete)
   */
  const getStepClass = (step) => {
    if (isCancelled) return 'cancelled';
    if (step.completed) return 'completed';
    if (step.current) return 'current';
    return '';
  };

  /**
   * Get CSS class for a progress line (between two steps)
   * Line is completed if BOTH adjacent steps are completed
   */
  const getLineClass = (prevStep, nextStep) => {
    if (isCancelled) return 'cancelled';
    if (prevStep.completed && nextStep.completed) return 'completed';
    return '';
  };

  /**
   * Render action buttons based on current proposal status
   * Different statuses require different host actions
   */
  const renderActionButtons = () => {
    const { key } = statusConfig;

    // Awaiting rental application - host can request VM or remind guest
    if (key === 'Proposal Submitted by guest - Awaiting Rental Application' ||
        key === 'Proposal Submitted for guest by Split Lease - Awaiting Rental Application') {
      return (
        <>
          <button
            className="action-btn secondary"
            onClick={() => onChooseVirtualMeeting?.(proposal, null)}
          >
            Request Virtual Meeting
          </button>
          <button
            className="action-btn modify"
            onClick={() => onModify?.(proposal)}
          >
            Review / Modify
          </button>
        </>
      );
    }

    // Host counteroffer sent - waiting for guest
    if (key === 'Host Counteroffer Submitted / Awaiting Guest Review') {
      return (
        <>
          <button
            className="action-btn secondary"
            onClick={() => onSendMessage?.(proposal)}
          >
            Send Message
          </button>
          <button
            className="action-btn modify"
            onClick={() => onModify?.(proposal)}
          >
            See Details
          </button>
        </>
      );
    }

    // Post-acceptance states
    if (isAccepted) {
      return (
        <>
          <button
            className="action-btn secondary"
            onClick={() => onModify?.(proposal)}
          >
            See Details
          </button>
          <button
            className="action-btn primary"
            onClick={() => onRemindSplitLease?.(proposal)}
          >
            Remind Split Lease
          </button>
        </>
      );
    }

    // Default pending state (Host Review, Rental App Submitted, etc.)
    // Host can accept, reject, or modify
    return (
      <>
        <button
          className="action-btn accept"
          onClick={() => onAccept?.(proposal)}
        >
          Accept Proposal
        </button>
        <button
          className="action-btn modify"
          onClick={() => onModify?.(proposal)}
        >
          Review / Modify
        </button>
      </>
    );
  };

  return (
    <>
      <div className={`modal-backdrop ${isOpen ? 'active' : ''}`} onClick={onClose} />
      <div className={`proposal-modal ${isOpen ? 'open' : ''}`}>
        {/* Close Button */}
        <button className="modal-close" onClick={onClose}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {/* Modal Content */}
        <div className="modal-content">
          {/* Header */}
          <div className="modal-header">
            <h2 className="modal-title">{guestName}'s Proposal</h2>
            <div className="modal-schedule">
              <span className="schedule-text">
                {checkInDay} to {checkOutDay} (check-out)
                {counterOfferHappened && ' · Proposed by You'}
              </span>
              <DayIndicator activeDays={activeDays} size="medium" />
            </div>
          </div>

          {/* Proposal Details */}
          <div className="proposal-details">
            <div className="detail-row">
              <span className="detail-label">Duration</span>
              <span className="detail-value">{reservationSpanWeeks} weeks</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Move-in Range</span>
              <span className="detail-value">
                {formatDate(moveInRangeStart)} {formatDate(moveInRangeEnd)}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Check-in / Check-out</span>
              <span className="detail-value">{checkInTime} / {checkOutTime}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Compensation per Night</span>
              <span className="detail-value">
                {counterOfferHappened && (
                  <span className="original-value">${hostCompensation}</span>
                )}
                ${formatCurrency(compensationPerNight)}/night
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Maintenance Fee</span>
              <span className="detail-value">
                <span className="bullet">*</span> ${formatCurrency(maintenanceFee)}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Damage deposit</span>
              <span className="detail-value">
                <span className="bullet">*</span> ${formatCurrency(damageDeposit)}
              </span>
            </div>
            <div className="detail-row total-row">
              <span className="detail-value total">
                {counterOfferHappened && (
                  <span className="original-value">${formatCurrency(hostCompensation * reservationSpanWeeks * 7)}</span>
                )}
                ${formatCurrency(totalCompensation)} Total
              </span>
            </div>
          </div>

          {/* Guest Details Section */}
          <div className="collapsible-section">
            <button
              className="section-header"
              onClick={() => setGuestDetailsExpanded(!guestDetailsExpanded)}
            >
              <span>Guest details</span>
              <svg
                className={`chevron ${guestDetailsExpanded ? 'open' : ''}`}
                width="20"
                height="20"
                viewBox="0 0 20 20"
              >
                <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              </svg>
            </button>
            {guestDetailsExpanded && (
              <div className="section-content guest-details-content">
                <div className="guest-profile">
                  <img
                    src={avatarUrl}
                    alt={guestName}
                    className="guest-avatar-large"
                  />
                  <div className="guest-info">
                    <h4 className="guest-name">{guestName} {guestLastName}</h4>
                    <button
                      className="send-message-btn"
                      onClick={() => onSendMessage?.(proposal)}
                    >
                      Send a Message
                    </button>
                  </div>
                </div>
                {guestBio && (
                  <p className="guest-bio">{guestBio}</p>
                )}
                <div className="verification-badges">
                  <div className={`verification-item ${linkedinVerified ? 'verified' : ''}`}>
                    <span className="verification-label">LinkedIn</span>
                    <span className="verification-status">
                      {linkedinVerified ? 'Verified' : 'Unverified'}
                    </span>
                  </div>
                  <div className={`verification-item ${phoneVerified ? 'verified' : ''}`}>
                    <span className="verification-label">Number</span>
                    <span className="verification-status">
                      {phoneVerified ? 'Verified' : 'Unverified'}
                    </span>
                  </div>
                  <div className={`verification-item ${emailVerified ? 'verified' : ''}`}>
                    <span className="verification-label">Email</span>
                    <span className="verification-status">
                      {emailVerified ? 'Verified' : 'Unverified'}
                    </span>
                  </div>
                  <div className={`verification-item ${identityVerified ? 'verified' : ''}`}>
                    <span className="verification-label">Identity</span>
                    <span className="verification-status">
                      {identityVerified ? 'Verified' : 'Unverified'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Proposal Status Section */}
          <div className="collapsible-section">
            <button
              className="section-header"
              onClick={() => setStatusExpanded(!statusExpanded)}
            >
              <span>Proposal Status</span>
              <svg
                className={`chevron ${statusExpanded ? 'open' : ''}`}
                width="20"
                height="20"
                viewBox="0 0 20 20"
              >
                <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              </svg>
            </button>
            {statusExpanded && (
              <div className="section-content status-content">
                {/* Progress Tracker - Order: Proposal Submitted → Rental App → Host Review → Lease Docs → Initial Payment */}
                {/* Matches guest proposals page design: fully connected dots and lines */}
                <div className="progress-tracker">
                  {/* Row 1: Circles and connecting lines (no gaps) */}
                  <div className="progress-tracker-line">
                    {/* Step 1: Proposal Submitted - Green when awaiting rental app */}
                    <div className={`progress-step ${getStepClass(progress.proposalSubmitted)}`}>
                      <div
                        className="step-circle"
                        style={isAwaitingRentalApp ? { backgroundColor: '#065F46' } : undefined}
                      ></div>
                    </div>
                    <div className={`progress-line ${getLineClass(progress.proposalSubmitted, progress.rentalApp)}`}></div>

                    {/* Step 2: Rental Application */}
                    <div className={`progress-step ${getStepClass(progress.rentalApp)}`}>
                      <div className="step-circle"></div>
                    </div>
                    <div className={`progress-line ${getLineClass(progress.rentalApp, progress.hostReview)}`}></div>

                    {/* Step 3: Host Review */}
                    <div className={`progress-step ${getStepClass(progress.hostReview)}`}>
                      <div className="step-circle"></div>
                    </div>
                    <div className={`progress-line ${getLineClass(progress.hostReview, progress.leaseDocs)}`}></div>

                    {/* Step 4: Lease Documents */}
                    <div className={`progress-step ${getStepClass(progress.leaseDocs)}`}>
                      <div className="step-circle"></div>
                    </div>
                    <div className={`progress-line ${getLineClass(progress.leaseDocs, progress.initialPayment)}`}></div>

                    {/* Step 5: Initial Payment */}
                    <div className={`progress-step ${getStepClass(progress.initialPayment)}`}>
                      <div className="step-circle"></div>
                    </div>
                  </div>

                  {/* Row 2: Labels below the line - mirrors dots/lines structure exactly */}
                  <div className="progress-tracker-labels">
                    <div className="progress-label-wrapper">
                      <span className="step-label">Proposal Submitted</span>
                    </div>
                    <div className="progress-label-spacer"></div>
                    <div className="progress-label-wrapper">
                      <span className="step-label">{progress.rentalApp.completed ? 'Rental App Submitted' : 'Rental Application'}</span>
                    </div>
                    <div className="progress-label-spacer"></div>
                    <div className="progress-label-wrapper">
                      <span className="step-label">Host Review</span>
                    </div>
                    <div className="progress-label-spacer"></div>
                    <div className="progress-label-wrapper">
                      <span className="step-label">{progress.leaseDocs.completed ? 'Lease Documents' : 'Lease Docs'}</span>
                    </div>
                    <div className="progress-label-spacer"></div>
                    <div className="progress-label-wrapper">
                      <span className="step-label">Initial Payment</span>
                    </div>
                  </div>
                </div>

                {/* Status Box - Shows host-appropriate status message */}
                {/* Green for: accepted OR awaiting rental app (positive action state) */}
                {/* Yellow for: other pending states */}
                {/* Red for: cancelled/rejected */}
                <div
                  className="status-box"
                  style={{
                    backgroundColor: isCancelled ? '#FEE2E2' : ((isAccepted || isAwaitingRentalApp) ? '#D1FAE5' : '#FEF3C7'),
                    borderColor: isCancelled ? '#991B1B' : ((isAccepted || isAwaitingRentalApp) ? '#065F46' : '#924026')
                  }}
                >
                  {isCancelled ? (
                    <>
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="#991B1B">
                        <path d="M10 0C4.48 0 0 4.48 0 10C0 15.52 4.48 20 10 20C15.52 20 20 15.52 20 10C20 4.48 15.52 0 10 0ZM14.12 13.12L12.71 14.53L10 11.82L7.29 14.53L5.88 13.12L8.59 10.41L5.88 7.7L7.29 6.29L10 9L12.71 6.29L14.12 7.7L11.41 10.41L14.12 13.12Z"/>
                      </svg>
                      <span>Proposal Rejected Reason: {reasonForCancellation || 'Cancelled'}</span>
                    </>
                  ) : isAccepted ? (
                    <>
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="#065F46">
                        <path d="M10 0C4.48 0 0 4.48 0 10C0 15.52 4.48 20 10 20C15.52 20 20 15.52 20 10C20 4.48 15.52 0 10 0ZM8 15L3 10L4.41 8.59L8 12.17L15.59 4.58L17 6L8 15Z"/>
                      </svg>
                      <span>Status: {statusConfig.label || 'Accepted'} - Lease Documents will be sent via HelloSign</span>
                    </>
                  ) : isAwaitingRentalApp ? (
                    <>
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="#065F46">
                        <path d="M10 0C4.48 0 0 4.48 0 10C0 15.52 4.48 20 10 20C15.52 20 20 15.52 20 10C20 4.48 15.52 0 10 0ZM8 15L3 10L4.41 8.59L8 12.17L15.59 4.58L17 6L8 15Z"/>
                      </svg>
                      <span>Status: {getHostStatusMessage(statusConfig, rentalAppSubmitted)}</span>
                    </>
                  ) : (
                    <>
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="#924026">
                        <path d="M10 0C4.48 0 0 4.48 0 10C0 15.52 4.48 20 10 20C15.52 20 20 15.52 20 10C20 4.48 15.52 0 10 0ZM11 15H9V13H11V15ZM11 11H9V5H11V11Z"/>
                      </svg>
                      <span>Status: {getHostStatusMessage(statusConfig, rentalAppSubmitted)}</span>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Virtual Meetings Section */}
          {virtualMeeting && (
            <div className="collapsible-section">
              <button
                className="section-header"
                onClick={() => setVirtualMeetingsExpanded(!virtualMeetingsExpanded)}
              >
                <span>Virtual meetings</span>
                <svg
                  className={`chevron ${virtualMeetingsExpanded ? 'open' : ''}`}
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                >
                  <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                </svg>
              </button>
              {virtualMeetingsExpanded && (
                <div className="section-content virtual-meeting-content">
                  <div className="virtual-meeting-header">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
                      <path d="M16 2V6M8 2V6M3 10H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    <span>A virtual meeting with {guestName} has been suggested for the times:</span>
                  </div>
                  <div className="time-slots">
                    {(virtualMeeting.suggestedTimes || []).map((time, index) => (
                      <button
                        key={index}
                        className="time-slot"
                        onClick={() => onChooseVirtualMeeting?.(proposal, new Date(time))}
                      >
                        {formatDateTime(time)}
                      </button>
                    ))}
                  </div>
                  <button
                    className="choose-meeting-btn"
                    onClick={() => onChooseVirtualMeeting?.(proposal, virtualMeeting.suggestedTimes?.[0])}
                  >
                    Choose Virtual Meeting Time
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons - Dynamic based on status */}
        {!isCancelled && (
          <div className="modal-actions">
            <button
              className="action-btn reject"
              onClick={() => onReject?.(proposal)}
            >
              Reject Proposal
            </button>
            {renderActionButtons()}
          </div>
        )}
      </div>
    </>
  );
}
