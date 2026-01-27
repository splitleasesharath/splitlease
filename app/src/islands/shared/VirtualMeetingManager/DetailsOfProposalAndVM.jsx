/**
 * Details of Proposal and VM Component
 * Displays confirmed meeting details with Google Calendar integration
 */

import { formatTimeEST, generateGoogleCalendarUrl } from './dateUtils.js';
import './VirtualMeetingManager.css';

/**
 * @param {Object} props
 * @param {Object} props.proposal - Proposal object with guest, listing info
 * @param {Object} props.meeting - Virtual meeting object with bookedDate, googleMeetLink
 * @param {Function} props.onClose - Callback when user closes the modal
 */
export default function DetailsOfProposalAndVM({
  proposal,
  meeting,
  onClose,
}) {
  const handleAddToCalendar = () => {
    const url = generateGoogleCalendarUrl(meeting, proposal);
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  // Get guest info
  const getGuestName = () => {
    const firstName = proposal.guest?.firstName || proposal.guest?.['firstName'];
    const lastName = proposal.guest?.name || proposal.guest?.lastName || '';
    return `${firstName || 'Guest'} ${lastName}`.trim();
  };

  const getGuestProfilePhoto = () => {
    return proposal.guest?.profilePhoto || proposal.guest?.['profile photo'];
  };

  // Get listing name
  const getListingName = () => {
    return proposal.listing?.name || proposal._listing?.name || 'Property';
  };

  // Get booked date
  const getBookedDate = () => {
    const dateValue = meeting.bookedDate || meeting['booked date'] || meeting.booked_date;
    if (!dateValue) return null;
    return dateValue instanceof Date ? dateValue : new Date(dateValue);
  };

  // Get meeting link
  const getMeetingLink = () => {
    return meeting.googleMeetLink || meeting['meeting link'] || meeting.meetingLink;
  };

  // Get nights/schedule
  const getNights = () => {
    return proposal.nights || proposal.Nights || [];
  };

  // Get reservation span
  const getReservationSpan = () => {
    return proposal.reservationSpan || proposal['reservation span'] || proposal.reservationspan;
  };

  const bookedDate = getBookedDate();
  const meetingLink = getMeetingLink();
  const profilePhoto = getGuestProfilePhoto();
  const nights = getNights();
  const reservationSpan = getReservationSpan();

  return (
    <div className="vm-details-container">
      {/* Header - Close button is in parent VirtualMeetingManager */}
      <div className="vm-header">
        <div className="vm-header-title">
          <svg
            className="vm-icon"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#31135D"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            style={{ width: 24, height: 24, minWidth: 24, minHeight: 24, flexShrink: 0 }}
          >
            <path d="M15.6 11.6L22 7v10l-6.4-4.6a1 1 0 0 1 0-1.8z" />
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
          </svg>
          <h2 className="vm-title">Virtual Meeting Details</h2>
        </div>
      </div>

      {/* Guest Profile Photo */}
      {profilePhoto && (
        <div className="vm-profile-section">
          <img
            src={profilePhoto}
            alt={getGuestName()}
            className="vm-profile-photo"
          />
        </div>
      )}

      {/* Booked Date Section */}
      <div className="vm-booked-section">
        <h2 className="vm-booked-label">Booked for:</h2>
        {bookedDate && (
          <h1 className="vm-booked-date">
            {formatTimeEST(bookedDate, 'EEEE, MMMM d, yyyy')}
            <br />
            {formatTimeEST(bookedDate, 'h:mm a')}
          </h1>
        )}
      </div>

      {/* Meeting Details List */}
      <dl className="vm-details-list">
        <dt className="vm-detail-label">Guest:</dt>
        <dd className="vm-detail-value">{getGuestName()}</dd>

        <dt className="vm-detail-label">Listing:</dt>
        <dd className="vm-detail-value">{getListingName()}</dd>

        {nights && nights.length > 0 && (
          <>
            <dt className="vm-detail-label">Weekly Schedule:</dt>
            <dd className="vm-detail-value">{nights.join(', ')}</dd>
          </>
        )}

        {reservationSpan && (
          <>
            <dt className="vm-detail-label">Reservation Span:</dt>
            <dd className="vm-detail-value">
              {reservationSpan} week{reservationSpan !== 1 ? 's' : ''}
            </dd>
          </>
        )}
      </dl>

      {/* Google Calendar Button */}
      <button onClick={handleAddToCalendar} className="vm-calendar-button">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          style={{ width: 20, height: 20, minWidth: 20, minHeight: 20, flexShrink: 0 }}
        >
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        Click to add this meeting to your calendar
      </button>

      {/* Google Meet Link */}
      {meetingLink && (
        <a
          href={meetingLink}
          target="_blank"
          rel="noopener noreferrer"
          className="vm-meeting-link"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            style={{ width: 18, height: 18, minWidth: 18, minHeight: 18, flexShrink: 0 }}
          >
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
          Google Meet Link
        </a>
      )}
    </div>
  );
}
