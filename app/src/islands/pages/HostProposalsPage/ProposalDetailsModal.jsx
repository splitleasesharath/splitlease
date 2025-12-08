/**
 * ProposalDetailsModal Component
 *
 * Slide-in modal showing full proposal details with actions.
 */

import { useState } from 'react';
import DayIndicator from './DayIndicator.jsx';
import { getStatusTagInfo, getActiveDays, PROPOSAL_STATUSES } from './types.js';
import { formatCurrency, formatDate, formatDateTime } from './formatters.js';

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

  // Get status info
  const status = proposal.status || proposal.Status || {};
  const statusId = status.id || status._id || status;
  const statusConfig = PROPOSAL_STATUSES[statusId] || {};
  const statusInfo = getStatusTagInfo(status);
  const visualOrder = statusConfig.visualOrder || 0;

  const isCancelled = ['cancelled_by_guest', 'cancelled_by_splitlease', 'rejected_by_host'].includes(statusId);
  const isPending = visualOrder < 3;
  const isAccepted = statusId === 'accepted';

  // Get guest info
  const guest = proposal.guest || proposal.Guest || proposal['Created By'] || {};
  const guestName = guest.firstName || guest['First Name'] || guest.first_name || 'Guest';
  const guestLastName = guest.lastName || guest['Last Name'] || guest.last_name || '';
  const guestBio = guest.bio || guest.Bio || '';
  const guestAvatar = guest.avatar || guest.Avatar || guest['Profile Picture'];
  const avatarUrl = guestAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(guestName)}&background=random&size=60`;

  // Verification statuses
  const linkedinVerified = guest.linkedinVerified || guest['Linkedin Verified'] || false;
  const phoneVerified = guest.phoneVerified || guest['Phone Verified'] || false;
  const emailVerified = guest.emailVerified || guest['Email Verified'] || false;
  const identityVerified = guest.identityVerified || guest['Identity Verified'] || false;

  // Get schedule info
  const checkInDay = proposal.checkInDay || proposal['Check In Day'] || 'Monday';
  const checkOutDay = proposal.checkOutDay || proposal['Check Out Day'] || 'Friday';
  const checkInTime = proposal.checkInTime || proposal['Check In Time'] || '2:00 pm';
  const checkOutTime = proposal.checkOutTime || proposal['Check Out Time'] || '11:00 am';
  const moveInRangeStart = proposal.moveInRangeStart || proposal['Move In Range Start'];
  const moveInRangeEnd = proposal.moveInRangeEnd || proposal['Move In Range End'];
  const reservationSpanWeeks = proposal.reservationSpanWeeks || proposal['Reservation Span (weeks)'] || 0;

  // Get pricing info
  const hostCompensation = proposal.hostCompensation || proposal['Host Compensation'] || 0;
  const totalCompensation = proposal.totalCompensation || proposal['Total Compensation'] || 0;
  const compensationPerNight = proposal.compensationPerNight || proposal['Compensation Per Night'] || 0;
  const maintenanceFee = proposal.maintenanceFee || proposal['Maintenance Fee'] || 0;
  const damageDeposit = proposal.damageDeposit || proposal['Damage Deposit'] || 0;
  const counterOfferHappened = proposal.counterOfferHappened || proposal['Counter Offer Happened'] || false;
  const reasonForCancellation = proposal.reasonForCancellation || proposal['Reason For Cancellation'] || '';

  // Virtual meeting
  const virtualMeeting = proposal.virtualMeeting || proposal['Virtual Meeting'];

  // Get active days
  const activeDays = getActiveDays(checkInDay, checkOutDay);

  // Get progress steps
  const getProgressSteps = () => {
    return {
      rentalApp: visualOrder >= 1,
      reviewDocs: visualOrder >= 6,
      initialPayment: visualOrder >= 8,
      proposalSubmitted: true,
      hostReview: visualOrder >= 2,
      leaseDocs: visualOrder >= 6
    };
  };

  const progress = getProgressSteps();

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
                {checkInDay} thru {checkOutDay} (last night)
                {counterOfferHappened && ' (Proposed by You)'}
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
                {/* Progress Tracker */}
                <div className="progress-tracker">
                  <div className="progress-row top-row">
                    <div className={`progress-step ${progress.rentalApp ? 'completed' : ''} ${isCancelled ? 'cancelled' : ''}`}>
                      <div className="step-circle"></div>
                      <span className="step-label">{progress.rentalApp ? 'Rental App Submitted' : 'Submit Rental App'}</span>
                    </div>
                    <div className="progress-line"></div>
                    <div className={`progress-step ${progress.reviewDocs ? 'completed' : ''} ${isCancelled ? 'cancelled' : ''}`}>
                      <div className="step-circle"></div>
                      <span className="step-label">{progress.reviewDocs ? 'Review Documents' : 'Drafting Lease Docs'}</span>
                    </div>
                    <div className="progress-line"></div>
                    <div className={`progress-step ${progress.initialPayment ? 'completed' : ''} ${isCancelled ? 'cancelled' : ''}`}>
                      <div className="step-circle"></div>
                      <span className="step-label">Initial Payment</span>
                    </div>
                  </div>
                  <div className="progress-row bottom-row">
                    <div className={`progress-step ${progress.proposalSubmitted ? 'completed' : ''} ${isCancelled ? 'cancelled' : ''}`}>
                      <div className="step-circle"></div>
                      <span className="step-label">Proposal submitted</span>
                    </div>
                    <div className="progress-line"></div>
                    <div className={`progress-step ${progress.hostReview ? 'completed' : ''} ${isCancelled ? 'cancelled' : ''}`}>
                      <div className="step-circle"></div>
                      <span className="step-label">{progress.hostReview ? 'Edit/Review Proposal' : 'Host Review'}</span>
                    </div>
                    <div className="progress-line"></div>
                    <div className={`progress-step ${progress.leaseDocs ? 'completed' : ''} ${isCancelled ? 'cancelled' : ''}`}>
                      <div className="step-circle"></div>
                      <span className="step-label">Lease Documents</span>
                    </div>
                  </div>
                </div>

                {/* Status Box */}
                <div
                  className="status-box"
                  style={{
                    backgroundColor: isCancelled ? '#FEE2E2' : (isAccepted ? '#D1FAE5' : '#FEF3C7'),
                    borderColor: isCancelled ? '#991B1B' : (isAccepted ? '#065F46' : '#924026')
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
                      <span>Status: Alternative terms Accepted! Lease Documents will be sent to you via HelloSign</span>
                    </>
                  ) : (
                    <>
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="#924026">
                        <path d="M10 0C4.48 0 0 4.48 0 10C0 15.52 4.48 20 10 20C15.52 20 20 15.52 20 10C20 4.48 15.52 0 10 0ZM11 15H9V13H11V15ZM11 11H9V5H11V11Z"/>
                      </svg>
                      <span>Status: Review the Proposal</span>
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

        {/* Action Buttons */}
        {!isCancelled && (
          <div className="modal-actions">
            <button
              className="action-btn reject"
              onClick={() => onReject?.(proposal)}
            >
              Reject Proposal
            </button>
            {isPending ? (
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
            ) : isAccepted ? (
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
            ) : null}
          </div>
        )}
      </div>
    </>
  );
}
