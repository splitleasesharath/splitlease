/**
 * ConfirmationModal - Generic confirmation dialog for destructive actions
 *
 * Features:
 * - Title and message
 * - Confirm and Cancel buttons
 * - Loading state during processing
 * - Variant-based button styling (primary, warning, danger)
 * - Click outside to close
 * - ESC key to close
 */

export default function ConfirmationModal({
  title,
  message,
  confirmLabel,
  confirmVariant = 'primary', // 'primary' | 'warning' | 'danger'
  onConfirm,
  onCancel,
  isProcessing,
}) {
  // Close on backdrop click
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !isProcessing) {
      onCancel();
    }
  };

  // Close on Escape key
  const handleKeyDown = (e) => {
    if (e.key === 'Escape' && !isProcessing) {
      onCancel();
    }
  };

  return (
    <div
      className="confirmation-modal__backdrop"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirmation-modal-title"
    >
      <div className="confirmation-modal">
        {/* Header */}
        <div className="confirmation-modal__header">
          <h3 id="confirmation-modal-title" className="confirmation-modal__title">
            {title}
          </h3>
          <button
            onClick={onCancel}
            disabled={isProcessing}
            className="confirmation-modal__close"
            aria-label="Close"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Body */}
        <div className="confirmation-modal__body">
          <p className="confirmation-modal__message">{message}</p>
        </div>

        {/* Footer */}
        <div className="confirmation-modal__footer">
          <button
            onClick={onCancel}
            disabled={isProcessing}
            className="confirmation-modal__button confirmation-modal__button--cancel"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isProcessing}
            className={`confirmation-modal__button confirmation-modal__button--confirm confirmation-modal__button--${confirmVariant}`}
          >
            {isProcessing ? (
              <>
                <span className="confirmation-modal__spinner" />
                Processing...
              </>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== ICONS =====

function CloseIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" width="20" height="20">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}
