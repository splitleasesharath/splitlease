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
      {/* Header with Close Button */}
      <div className="vm-header">
        <div className="vm-header-title">
          <h2 className="vm-title">Virtual Meeting Details</h2>
        </div>
        <button className="vm-close-btn" onClick={onClose}>
          &times;
        </button>
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
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM5 8V6h14v2H5z"
            fill="currentColor"
          />
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
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M15 12c0 1.657-1.343 3-3 3s-3-1.343-3-3c0-1.657 1.343-3 3-3s3 1.343 3 3zm9-.449s-4.252 8.449-11.985 8.449c-7.18 0-12.015-8.449-12.015-8.449s4.446-7.551 12.015-7.551c7.694 0 11.985 7.551 11.985 7.551zm-7 .449c0-2.757-2.243-5-5-5s-5 2.243-5 5 2.243 5 5 5 5-2.243 5-5z" />
          </svg>
          Google Meet Link
        </a>
      )}
    </div>
  );
}
