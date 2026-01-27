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
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <line x1="10" y1="11" x2="10" y2="17" />
            <line x1="14" y1="11" x2="14" y2="17" />
          </svg>
          <h2 className="vm-title">Cancel Virtual Meeting?</h2>
        </div>
      </div>

      {error && <div className="vm-error">{error}</div>}

      <p className="vm-warning-text">This action cannot be undone</p>

      {/* Meeting Info Card */}
      <div className="vm-meeting-info-card">
        <div className="vm-meeting-info-content">
          <svg
            className="vm-meeting-info-icon"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#6D31C2"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            style={{ width: 24, height: 24, minWidth: 24, minHeight: 24, flexShrink: 0 }}
          >
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
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
