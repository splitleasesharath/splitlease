/**
 * Cancel Virtual Meeting Component
 * Confirmation dialog for canceling an existing meeting
 */

import { useState } from 'react';
import { formatTimeEST } from './dateUtils.js';
import './VirtualMeetingManager.css';

/**
 * @param {Object} props
 * @param {Object} props.meeting - Virtual meeting object with bookedDate, googleMeetLink, etc.
 * @param {string} props.participantName - Name of the other participant
 * @param {string} props.listingName - Name of the listing
 * @param {Function} props.onCancel - Callback when user confirms cancellation
 * @param {Function} props.onClose - Callback when user dismisses the dialog
 */
export default function CancelVirtualMeetings({
  meeting,
  participantName,
  listingName,
  onCancel,
  onClose,
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleCancel = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await onCancel();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel meeting');
      setIsLoading(false);
    }
  };

  // Get the booked date from meeting object - handle different field names
  const getBookedDate = () => {
    const dateValue = meeting.bookedDate || meeting['booked date'] || meeting.booked_date;
    if (!dateValue) return null;
    return dateValue instanceof Date ? dateValue : new Date(dateValue);
  };

  // Get the meeting link
  const getMeetingLink = () => {
    return meeting.googleMeetLink || meeting['meeting link'] || meeting.meetingLink;
  };

  const bookedDate = getBookedDate();
  const meetingLink = getMeetingLink();

  return (
    <div className="vm-cancel-container">
      <div className="vm-header">
        <div className="vm-header-title">
          <span className="vm-icon">&#128465;</span>
          <h2 className="vm-title">Cancel Virtual Meeting?</h2>
        </div>
      </div>

      {error && <div className="vm-error">{error}</div>}

      <p className="vm-warning-text">This action cannot be undone</p>

      {/* Meeting Info Card */}
      <div className="vm-meeting-info-card">
        <div className="vm-meeting-info-content">
          <span className="vm-meeting-info-icon">&#128197;</span>
          <div className="vm-meeting-info-details">
            <h3 className="vm-meeting-info-title">
              Meeting with {participantName}
            </h3>
            <p className="vm-meeting-info-listing">
              {listingName}
            </p>
            {bookedDate && (
              <p className="vm-meeting-info-date">
                {formatTimeEST(bookedDate)}
              </p>
            )}
            {meetingLink && (
              <a
                href={meetingLink}
                target="_blank"
                rel="noopener noreferrer"
                className="vm-meeting-info-link"
              >
                View Meeting Link
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="vm-button-group">
        <button
          className="vm-button-outline"
          onClick={onClose}
          disabled={isLoading}
        >
          No
        </button>
        <button
          className="vm-button-danger"
          onClick={handleCancel}
          disabled={isLoading}
        >
          {isLoading ? 'Canceling...' : 'Cancel Meeting'}
        </button>
      </div>
    </div>
  );
}
