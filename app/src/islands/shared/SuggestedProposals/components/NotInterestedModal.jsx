/**
 * NotInterestedModal
 *
 * Modal for collecting optional feedback when a user is not interested
 * in a suggested proposal. Follows the Hollow Component pattern.
 *
 * Uses inline styles (like CancelProposalModal) to ensure proper
 * rendering when portaled to document.body.
 */

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

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
  const listing = proposal?._listing || {};
  const listingName = listing['Name'] || 'this property';

  // Inline styles for portal rendering
  const overlayStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10001, // Above the SuggestedProposalPopup (z-index 1000)
    animation: 'fadeIn 0.2s ease'
  };

  const modalStyle = {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    width: '100%',
    maxWidth: '440px',
    margin: '0 20px',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    animation: 'slideUp 0.25s ease'
  };

  const headerStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 24px',
    borderBottom: '1px solid #DFDFF6'
  };

  const headerLeftStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  };

  const iconContainerStyle = {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: '#FEF3C7',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  };

  const titleStyle = {
    fontSize: '18px',
    fontWeight: '600',
    color: '#111827',
    margin: 0
  };

  const closeButtonStyle = {
    color: '#9CA3AF',
    fontSize: '24px',
    lineHeight: 1,
    padding: '4px',
    background: 'none',
    border: 'none',
    cursor: isProcessing ? 'not-allowed' : 'pointer',
    opacity: isProcessing ? 0.5 : 1
  };

  const bodyStyle = {
    padding: '24px'
  };

  const messageStyle = {
    fontSize: '15px',
    color: '#4B5563',
    marginBottom: '16px',
    lineHeight: 1.5
  };

  const labelStyle = {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '8px'
  };

  const textareaContainerStyle = {
    position: 'relative'
  };

  const textareaStyle = {
    width: '100%',
    minHeight: '100px',
    padding: '12px',
    fontSize: '15px',
    border: '1px solid #D1D5DB',
    borderRadius: '8px',
    resize: 'vertical',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    lineHeight: 1.5,
    transition: 'border-color 0.15s ease'
  };

  const charCountStyle = {
    position: 'absolute',
    bottom: '8px',
    right: '12px',
    fontSize: '12px',
    color: feedback.length > MAX_CHARS * 0.9 ? '#EF4444' : '#9CA3AF'
  };

  const footerStyle = {
    display: 'flex',
    gap: '12px',
    padding: '16px 24px',
    borderTop: '1px solid #DFDFF6'
  };

  const cancelButtonStyle = {
    flex: 1,
    padding: '12px 20px',
    backgroundColor: '#F3F4F6',
    color: '#374151',
    borderRadius: '20px',
    border: 'none',
    fontSize: '15px',
    fontWeight: '600',
    cursor: isProcessing ? 'not-allowed' : 'pointer',
    opacity: isProcessing ? 0.5 : 1,
    transition: 'background-color 0.15s ease'
  };

  const confirmButtonStyle = {
    flex: 1,
    padding: '12px 20px',
    backgroundColor: '#6B7280',
    color: '#FFFFFF',
    borderRadius: '20px',
    border: 'none',
    fontSize: '15px',
    fontWeight: '600',
    cursor: isProcessing ? 'not-allowed' : 'pointer',
    opacity: isProcessing ? 0.7 : 1,
    transition: 'background-color 0.15s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px'
  };

  const spinnerStyle = {
    width: '16px',
    height: '16px',
    border: '2px solid currentColor',
    borderTopColor: 'transparent',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite'
  };

  const modalContent = (
    <div style={overlayStyle} onClick={handleBackdropClick}>
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes slideUp {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}
      </style>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={headerStyle}>
          <div style={headerLeftStyle}>
            <div style={iconContainerStyle}>
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#F59E0B"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M8 15s1.5-2 4-2 4 2 4 2" />
                <line x1="9" y1="9" x2="9.01" y2="9" />
                <line x1="15" y1="9" x2="15.01" y2="9" />
              </svg>
            </div>
            <h2 style={titleStyle}>Not Interested?</h2>
          </div>
          <button
            style={closeButtonStyle}
            onClick={handleClose}
            disabled={isProcessing}
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        {/* Body */}
        <div style={bodyStyle}>
          <p style={messageStyle}>
            We'll remove <strong>{listingName}</strong> from your suggestions.
            If you'd like, let us know why it wasn't a good fit:
          </p>

          <label style={labelStyle}>
            Feedback <span style={{ color: '#9CA3AF', fontWeight: 400 }}>(optional)</span>
          </label>
          <div style={textareaContainerStyle}>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value.slice(0, MAX_CHARS))}
              placeholder="e.g., Too far from my workplace, price is outside my budget, looking for a different neighborhood..."
              style={textareaStyle}
              disabled={isProcessing}
              aria-label="Feedback about why this suggestion doesn't work"
            />
            <span style={charCountStyle}>
              {feedback.length}/{MAX_CHARS}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div style={footerStyle}>
          <button
            style={cancelButtonStyle}
            onClick={handleClose}
            disabled={isProcessing}
          >
            Cancel
          </button>
          <button
            style={confirmButtonStyle}
            onClick={handleConfirm}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <span style={spinnerStyle} />
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
