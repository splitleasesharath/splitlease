/**
 * Throttling Warning Popup Component (Soft Warning - Warning 1)
 *
 * Displayed when user has 5+ pending requests in 24 hours.
 * Allows user to continue or cancel, with "Don't show again" option.
 */

import { useState } from 'react';

/**
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the popup is visible
 * @param {Function} props.onClose - Called when user cancels
 * @param {Function} props.onContinue - Called when user clicks "Continue still"
 * @param {string} props.otherParticipantName - Name of the other party
 * @param {Function} props.onDontShowAgainChange - Called with boolean when checkbox changes
 */
export default function ThrottlingWarningPopup({
  isOpen,
  onClose,
  onContinue,
  otherParticipantName = 'the other party',
  onDontShowAgainChange,
}) {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  if (!isOpen) return null;

  const handleCheckboxChange = (e) => {
    const checked = e.target.checked;
    setDontShowAgain(checked);
    if (onDontShowAgainChange) {
      onDontShowAgainChange(checked);
    }
  };

  const handleContinue = () => {
    onContinue(dontShowAgain);
  };

  return (
    <div className="dcr-throttle-popup-overlay" onClick={onClose}>
      <div className="dcr-throttle-popup" onClick={(e) => e.stopPropagation()}>
        <div className="dcr-throttle-popup-icon dcr-throttle-icon-warning">
          ⚠️
        </div>

        <h3 className="dcr-throttle-popup-title">
          Avoid creating too many requests
        </h3>

        <p className="dcr-throttle-popup-message">
          You created 5 or more requests in 24 hours and {otherParticipantName} hasn't
          responded yet. We advise you to hold on creation until {otherParticipantName} responds
          to your initial requests.
        </p>

        <label className="dcr-throttle-checkbox">
          <input
            type="checkbox"
            checked={dontShowAgain}
            onChange={handleCheckboxChange}
          />
          <span>Don't show me this again</span>
        </label>

        <div className="dcr-throttle-popup-buttons">
          <button
            className="dcr-button-secondary"
            onClick={onClose}
            type="button"
          >
            Cancel request
          </button>
          <button
            className="dcr-button-primary"
            onClick={handleContinue}
            type="button"
          >
            Continue still
          </button>
        </div>
      </div>
    </div>
  );
}
