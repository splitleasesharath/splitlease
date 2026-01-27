/**
 * Respond to VM Request Component
 * Allows users to respond to meeting requests by selecting a proposed time or declining
 */

import { useState } from 'react';
import { formatTimeEST } from './dateUtils.js';
import './VirtualMeetingManager.css';

/**
 * @param {Object} props
 * @param {Object} props.proposal - Proposal object with availableTimes and participant info
 * @param {Function} props.onConfirm - Callback when user confirms a time slot
 * @param {Function} props.onDecline - Callback when user declines the meeting
 * @param {Function} props.onSuggestAlt - Callback when user wants to suggest alternative times
 */
export default function RespondToVMRequest({
  proposal,
  onConfirm,
  onDecline,
  onSuggestAlt,
}) {
  const [selectedTime, setSelectedTime] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleTimeSelection = (time) => {
    setSelectedTime(time);
    setShowConfirmation(true);
  };

  const handleConfirmSelection = async () => {
    if (!selectedTime) return;

    setIsLoading(true);
    setError(null);

    try {
      await onConfirm(selectedTime);
      setShowConfirmation(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to confirm meeting');
      setIsLoading(false);
    }
  };

  const handleDecline = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await onDecline();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to decline meeting');
      setIsLoading(false);
    }
  };

  // Get host name for display
  const getHostName = () => {
    if (proposal.host?.name) return proposal.host.name;
    if (proposal.host?.firstName) return proposal.host.firstName;
    return 'the host';
  };

  // Get guest name for display
  const getGuestName = () => {
    if (proposal.guest?.firstName) return proposal.guest.firstName;
    if (proposal.guest?.name) return proposal.guest.name;
    return 'you';
  };

  // Parse available times - handle both Date objects and strings
  const parseAvailableTimes = () => {
    if (!proposal.availableTimes) return [];
    return proposal.availableTimes.map(time =>
      time instanceof Date ? time : new Date(time)
    ).filter(date => !isNaN(date.getTime()));
  };

  const availableTimes = parseAvailableTimes();

  return (
    <div className="vm-respond-container">
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
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <h2 className="vm-title">Virtual Meeting Response</h2>
        </div>
      </div>

      {error && <div className="vm-error">{error}</div>}

      <p className="vm-description">
        Select one of the available dates proposed by {getHostName()} for{' '}
        {getGuestName()} below. All times are in EST timezone.
      </p>

      <div className="vm-time-slots">
        {availableTimes && availableTimes.length > 0 ? (
          availableTimes.map((time, index) => (
            <label key={index} className="vm-time-slot-option">
              <input
                type="radio"
                name="timeSlot"
                value={time.toString()}
                checked={selectedTime?.getTime() === time.getTime()}
                onChange={() => handleTimeSelection(time)}
                disabled={isLoading}
              />
              <span>{formatTimeEST(time)}</span>
            </label>
          ))
        ) : (
          <p className="vm-description">
            No time slots available. Please suggest alternative times.
          </p>
        )}
      </div>

      <div className="vm-alternative-section">
        <div className="vm-info-box-with-buttons">
          <p className="vm-info-text">
            If none of the times work for you, you may submit alternative times for
            the host to choose from.
          </p>

          <div className="vm-button-group">
            <button
              className="vm-button-decline"
              onClick={handleDecline}
              disabled={isLoading}
            >
              Decline
            </button>
            <button
              className="vm-button-primary"
              onClick={onSuggestAlt}
              disabled={isLoading}
            >
              Suggest Alternative Times
            </button>
          </div>
        </div>
      </div>

      {/* Inline Confirmation Section */}
      {showConfirmation && selectedTime && (
        <div className="vm-confirm-section">
          <p className="vm-confirm-message">
            Are you sure you want this time slot:
          </p>
          <p className="vm-confirm-time-slot">{formatTimeEST(selectedTime)}</p>

          <div className="vm-button-group">
            <button
              className="vm-button-outline"
              onClick={() => setShowConfirmation(false)}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              className="vm-button-primary"
              onClick={handleConfirmSelection}
              disabled={isLoading}
            >
              {isLoading ? 'Confirming...' : 'Yes'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
