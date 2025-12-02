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
            &larr;
          </button>
        )}
        <div className="vm-header-title">
          <span className="vm-icon">&#128197;</span>
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
