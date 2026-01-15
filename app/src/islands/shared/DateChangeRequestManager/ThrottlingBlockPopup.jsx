/**
 * Throttling Block Popup Component (Hard Block - Warning 2)
 *
 * Displayed when user has 10+ pending requests in 24 hours.
 * Blocks request creation for 24 hours - no option to continue.
 */

/**
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the popup is visible
 * @param {Function} props.onClose - Called when user clicks "Ok"
 * @param {string} props.otherParticipantName - Name of the other party
 */
export default function ThrottlingBlockPopup({
  isOpen,
  onClose,
  otherParticipantName = 'the other party',
}) {
  if (!isOpen) return null;

  return (
    <div className="dcr-throttle-popup-overlay" onClick={onClose}>
      <div
        className="dcr-throttle-popup dcr-throttle-popup-block"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dcr-throttle-popup-icon dcr-throttle-icon-block">
          🚫
        </div>

        <h3 className="dcr-throttle-popup-title">
          We put on hold your ability to create requests
        </h3>

        <p className="dcr-throttle-popup-message">
          You created 10 or more requests in 24 hours and {otherParticipantName} hasn't
          responded yet. To keep the integrity of the platform and not overwhelm{' '}
          {otherParticipantName}, we put on hold your ability to create requests for 24 hours!
        </p>

        <a
          href="/help-center/policies"
          target="_blank"
          rel="noopener noreferrer"
          className="dcr-throttle-guideline-link"
        >
          See comments guideline
        </a>

        <div className="dcr-throttle-popup-buttons dcr-throttle-buttons-center">
          <button
            className="dcr-button-primary"
            onClick={onClose}
            type="button"
          >
            Ok
          </button>
        </div>
      </div>
    </div>
  );
}
