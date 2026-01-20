import { useEffect } from 'react';
import './ConfirmDeleteModal.css';

/**
 * Feather Icons as inline SVG components
 * Following POPUP_REPLICATION_PROTOCOL.md: Monochromatic, stroke-width: 2, no fill
 */
const TrashIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </svg>
);

const XIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const AlertTriangleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

/**
 * ConfirmDeleteModal Component
 *
 * A confirmation modal for delete actions following POPUP_REPLICATION_PROTOCOL.md.
 *
 * Features:
 * - Monochromatic purple color scheme (no green/yellow)
 * - Danger variant with outlined red button (per protocol: red is OUTLINED ONLY)
 * - Mobile bottom sheet behavior (< 480px)
 * - Feather icons (stroke-only)
 * - Pill-shaped buttons (100px radius)
 * - Fixed header/footer with scrollable body
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Controls modal visibility
 * @param {Function} props.onClose - Close handler callback
 * @param {Function} props.onConfirm - Confirm delete handler callback
 * @param {string} props.title - Modal title (e.g., "Delete Listing")
 * @param {string} props.itemName - Name of item being deleted
 * @param {string} props.message - Custom message (optional)
 * @param {string} props.warning - Warning text for active leases etc. (optional)
 * @param {string} props.confirmText - Text for confirm button (default: "Delete")
 * @param {string} props.cancelText - Text for cancel button (default: "Cancel")
 * @param {boolean} props.isLoading - Loading state for confirm button
 */
const ConfirmDeleteModal = ({
  isOpen = false,
  onClose = () => {},
  onConfirm = () => {},
  title = 'Delete Item',
  itemName = '',
  message = '',
  warning = '',
  confirmText = 'Delete',
  cancelText = 'Cancel',
  isLoading = false
}) => {
  // Close modal on Escape key press
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  /**
   * Handles backdrop click to close modal
   */
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  /**
   * Handles confirm button click
   */
  const handleConfirm = () => {
    onConfirm();
  };

  // Don't render anything if modal is not open
  if (!isOpen) return null;

  // Default message if none provided
  const displayMessage = message || `Are you sure you want to delete "${itemName}"? This action cannot be undone.`;

  return (
    <div
      className="confirm-delete-modal-overlay"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-delete-modal-title"
    >
      {/* Modal container */}
      <div
        className="confirm-delete-modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile grab handle - visible only on mobile */}
        <div className="confirm-delete-modal-grab-handle" aria-hidden="true" />

        {/* Header Section */}
        <header className="confirm-delete-modal-header">
          <div className="confirm-delete-modal-header-content">
            {/* Trash Icon (Feather) */}
            <span className="confirm-delete-modal-icon confirm-delete-modal-icon--danger" aria-hidden="true">
              <TrashIcon />
            </span>

            {/* Title */}
            <h2 id="confirm-delete-modal-title" className="confirm-delete-modal-title">
              {title}
            </h2>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="confirm-delete-modal-close-btn"
            aria-label="Close modal"
            type="button"
          >
            <XIcon />
          </button>
        </header>

        {/* Scrollable Body */}
        <div className="confirm-delete-modal-body">
          {/* Item Preview (if name provided) */}
          {itemName && (
            <div className="confirm-delete-modal-item-preview">
              <div className="confirm-delete-modal-item-icon">
                <TrashIcon />
              </div>
              <div className="confirm-delete-modal-item-info">
                <span className="confirm-delete-modal-item-name">{itemName}</span>
                <span className="confirm-delete-modal-item-label">Will be permanently deleted</span>
              </div>
            </div>
          )}

          {/* Message */}
          <p className="confirm-delete-modal-message">
            {displayMessage}
          </p>

          {/* Warning Banner (if provided) */}
          {warning && (
            <div className="confirm-delete-modal-warning" role="alert">
              <div className="confirm-delete-modal-warning-icon">
                <AlertTriangleIcon />
              </div>
              <p className="confirm-delete-modal-warning-text">
                {warning}
              </p>
            </div>
          )}
        </div>

        {/* Footer with Action Buttons */}
        <footer className="confirm-delete-modal-footer">
          <button
            type="button"
            className="confirm-delete-modal-btn confirm-delete-modal-btn--secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelText}
          </button>
          <button
            type="button"
            disabled={isLoading}
            className="confirm-delete-modal-btn confirm-delete-modal-btn--danger"
            onClick={handleConfirm}
          >
            {isLoading ? (
              <>
                <span className="confirm-delete-modal-spinner" aria-hidden="true" />
                Deleting...
              </>
            ) : (
              confirmText
            )}
          </button>
        </footer>
      </div>
    </div>
  );
};

export default ConfirmDeleteModal;
