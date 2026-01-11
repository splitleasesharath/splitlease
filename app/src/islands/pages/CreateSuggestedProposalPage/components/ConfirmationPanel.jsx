/**
 * ConfirmationPanel - Confirmation step before final submission
 */

export default function ConfirmationPanel({ onCancel }) {
  return (
    <div className="csp-confirmation-panel">
      <div className="csp-confirmation-header">
        <h3>Review Before Creating</h3>
      </div>
      <div className="csp-confirmation-ids">
        <p className="csp-confirmation-note">
          Please review all details above before confirming proposal creation.
        </p>
        <button
          className="csp-btn csp-btn-secondary csp-btn-small"
          onClick={onCancel}
        >
          Go Back to Edit
        </button>
      </div>
    </div>
  );
}
