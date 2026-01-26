/**
 * NotInterestedModal - v2.0 PROTOCOL REDESIGN
 *
 * Modal for collecting optional feedback when a user is not interested
 * in a suggested proposal. Follows the Hollow Component pattern.
 *
 * Design: POPUP_REPLICATION_PROTOCOL - Monochromatic purple, pill buttons, mobile bottom sheet
 */

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Frown } from 'lucide-react';

/**
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {Object} props.proposal - The proposal being dismissed
 * @param {function} props.onClose - Handler for closing modal
 * @param {function} props.onConfirm - Handler for confirming with optional feedback
 * @param {boolean} props.isProcessing - Whether confirmation is in progress
 */
export default function NotInterestedModal({
  isOpen,
  proposal,
  onClose,
  onConfirm,
  isProcessing = false
}) {
  const [feedback, setFeedback] = useState('');
  const MAX_CHARS = 500;

  // Reset feedback when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setFeedback('');
    }
  }, [isOpen]);

  // Handle ESC key to close
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isProcessing) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isProcessing, onClose]);

  const handleConfirm = useCallback(async () => {
    if (isProcessing) return;
    await onConfirm(feedback.trim() || null);
  }, [feedback, isProcessing, onConfirm]);

  const handleClose = useCallback(() => {
    if (isProcessing) return;
    onClose();
  }, [isProcessing, onClose]);

  const handleBackdropClick = useCallback((e) => {
    if (e.target === e.currentTarget && !isProcessing) {
      onClose();
    }
  }, [isProcessing, onClose]);

  if (!isOpen) {
    return null;
  }

  // Extract listing name for display
  const listing = proposal?._listing || proposal?.listing || {};
  const listingName = listing['Name'] || listing?.Name || 'this property';

  const modalContent = (
    <div className="protocol-overlay" onClick={handleBackdropClick}>
      <div className="protocol-modal not-interested-modal" onClick={(e) => e.stopPropagation()}>
        {/* Mobile Grab Handle */}
        <div className="protocol-grab-handle" />

        {/* Header */}
        <div className="protocol-header">
          <div className="protocol-header-left">
            <div className="not-interested-icon-container">
              <Frown
                size={20}
                strokeWidth={2}
                color="var(--protocol-secondary)"
                aria-hidden="true"
              />
            </div>
            <h2 className="protocol-title">Not Interested?</h2>
          </div>
          <button
            className="protocol-close-btn"
            onClick={handleClose}
            disabled={isProcessing}
            aria-label="Close"
            style={{ opacity: isProcessing ? 0.5 : 1, cursor: isProcessing ? 'not-allowed' : 'pointer' }}
          >
            <X size={24} strokeWidth={2} />
          </button>
        </div>

        {/* Body */}
        <div className="protocol-body">
          <p className="not-interested-message">
            We'll remove <strong>{listingName}</strong> from your suggestions.
            If you'd like, let us know why it wasn't a good fit:
          </p>

          <label className="not-interested-label">
            Feedback <span className="not-interested-optional">(optional)</span>
          </label>
          <div className="not-interested-textarea-container">
            <textarea
              className="not-interested-textarea"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value.slice(0, MAX_CHARS))}
              placeholder="e.g., Too far from my workplace, price is outside my budget, looking for a different neighborhood..."
              disabled={isProcessing}
              aria-label="Feedback about why this suggestion doesn't work"
            />
            <span className={`not-interested-char-count ${feedback.length > MAX_CHARS * 0.9 ? 'warning' : ''}`}>
              {feedback.length}/{MAX_CHARS}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="protocol-footer">
          <button
            className="protocol-btn protocol-btn-secondary"
            onClick={handleClose}
            disabled={isProcessing}
            style={{ opacity: isProcessing ? 0.5 : 1 }}
          >
            Cancel
          </button>
          <button
            className="protocol-btn protocol-btn-primary"
            onClick={handleConfirm}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <span className="not-interested-spinner" />
                Processing...
              </>
            ) : (
              'Confirm'
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
