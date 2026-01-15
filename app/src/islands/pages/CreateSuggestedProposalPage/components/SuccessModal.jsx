/**
 * SuccessModal - Success feedback after proposal creation
 */

export default function SuccessModal({ proposalId, threadId, onCreateAnother, onClose }) {
  return (
    <div className="csp-modal">
      <div className="csp-modal-content">
        <div className="csp-modal-icon csp-success">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="16 8 10 14 8 12"></polyline>
          </svg>
        </div>
        <h2>Proposal Created Successfully!</h2>

        <div className="csp-created-ids">
          <p>Recently Created Proposal ID: <span className="csp-id-value">{proposalId || 'N/A'}</span></p>
          <p>Recently Created Thread ID: <span className="csp-id-value">{threadId || 'N/A'}</span></p>
        </div>

        <div className="csp-modal-actions">
          <button
            className="csp-btn csp-btn-primary"
            onClick={onCreateAnother}
          >
            Go To Create Another Proposal
          </button>
          <button
            className="csp-btn csp-btn-secondary"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
