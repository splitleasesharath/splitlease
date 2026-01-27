/**
 * Book Virtual Meeting Component
 * Allows users to request a new meeting or suggest 3 alternative time slots
 */

import { useState } from 'react';
import BookTimeSlot from './BookTimeSlot.jsx';
import './VirtualMeetingManager.css';

/**
 * @param {Object} props
 * @param {Object} props.proposal - Proposal object with participant info
 * @param {boolean} props.isSuggesting - Whether user is suggesting alternative times
 * @param {Function} props.onSubmit - Callback when user submits (slots: Date[], isSuggesting: boolean)
 * @param {Function} props.onBack - Callback when user wants to go back
 * @param {Object} props.currentUser - Current user object with typeUserSignup
 */
export default function BookVirtualMeeting({
  proposal,
  isSuggesting,
  onSubmit,
  onBack,
  currentUser,
}) {
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSelectionChange = (slots) => {
    setSelectedSlots(slots);
  };

  const handleSubmit = async () => {
    if (selectedSlots.length !== 3) {
      setError('Please select exactly 3 time slots');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await onSubmit(selectedSlots, isSuggesting);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit request');
      setIsLoading(false);
    }
  };

  // Get the other participant's name
  const getOtherParticipantName = () => {
    if (isSuggesting) {
      // When suggesting, always showing to the host
      return proposal.host?.name || proposal.host?.firstName || 'the host';
    }

    // For new requests, show the other party's name
    const isHost = currentUser?.typeUserSignup === 'host';
    if (isHost) {
      return proposal.guest?.firstName || proposal.guest?.name || 'the guest';
    }
    return proposal.host?.name || proposal.host?.firstName || 'the host';
  };

  return (
    <div className="vm-book-container">
      <div className="vm-header">
        {isSuggesting && (
          <button
            className="vm-back-btn"
            onClick={onBack}
            disabled={isLoading}
            aria-label="Go back"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              style={{ width: 24, height: 24, minWidth: 24, minHeight: 24, flexShrink: 0 }}
            >
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </button>
        )}
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
          <h2 className="vm-title">
            {isSuggesting ? 'Suggest Alternative Times' : 'Request Virtual Meeting'}
          </h2>
        </div>
      </div>

      {error && <div className="vm-error">{error}</div>}

      <p className="vm-description">
        {isSuggesting
          ? `Propose 3 alternative time slots for ${getOtherParticipantName()} to choose from.`
          : `Select 3 time slots when you're available to meet with ${getOtherParticipantName()}.`}
      </p>

      {/* Calendar Component */}
      <BookTimeSlot
        maxSelections={3}
        onSelectionChange={handleSelectionChange}
        selectedSlots={selectedSlots}
        initialStartTime={8}
        initialEndTime={20}
        interval={30}
      />

      {/* Submit Section */}
      <div className="vm-submit-section">
        <p className="vm-slots-count">
          Select 3 time slots to meet (EST). You have selected {selectedSlots.length}/3
          slots.
        </p>
        <button
          className="vm-button-success"
          onClick={handleSubmit}
          disabled={selectedSlots.length !== 3 || isLoading}
        >
          {isLoading
            ? 'Submitting...'
            : isSuggesting
            ? 'Submit Alternative Times'
            : 'Submit Request'}
        </button>
      </div>
    </div>
  );
}
