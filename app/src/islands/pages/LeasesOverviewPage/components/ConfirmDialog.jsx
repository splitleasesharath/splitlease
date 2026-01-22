/**
 * ConfirmDialog - Modal for confirming destructive actions
 *
 * Features:
 * - Single or double confirmation (for dangerous operations)
 * - Different styling for warning vs danger actions
 */

import { useState, useEffect, useRef } from 'react';

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel,
  confirmType = 'warning', // 'warning' | 'danger'
  onConfirm,
  onCancel,
  requiresDoubleConfirm = false,
}) {
  const [isFirstConfirmDone, setIsFirstConfirmDone] = useState(false);
  const [confirmInput, setConfirmInput] = useState('');
  const dialogRef = useRef(null);

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setIsFirstConfirmDone(false);
      setConfirmInput('');
    }
  }, [isOpen]);

  // Focus trap and close on Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const handleFirstConfirm = () => {
    if (requiresDoubleConfirm) {
      setIsFirstConfirmDone(true);
    } else {
      onConfirm();
    }
  };

  const handleFinalConfirm = () => {
    if (confirmInput === 'DELETE') {
      onConfirm();
    }
  };

  const confirmBtnClass = confirmType === 'danger'
    ? 'confirm-dialog__btn--danger'
    : 'confirm-dialog__btn--warning';

  return (
    <div className="confirm-dialog__overlay" onClick={onCancel}>
      <div
        className="confirm-dialog"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon */}
        <div className={`confirm-dialog__icon confirm-dialog__icon--${confirmType}`}>
          {confirmType === 'danger' ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          )}
        </div>

        {/* Title */}
        <h2 id="confirm-dialog-title" className="confirm-dialog__title">
          {title}
        </h2>

        {/* Message */}
        <p className="confirm-dialog__message">{message}</p>

        {/* Double Confirmation Input */}
        {requiresDoubleConfirm && isFirstConfirmDone && (
          <div className="confirm-dialog__double-confirm">
            <label className="confirm-dialog__input-label">
              Type <strong>DELETE</strong> to confirm:
            </label>
            <input
              type="text"
              className="confirm-dialog__input"
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value.toUpperCase())}
              placeholder="DELETE"
              autoFocus
            />
          </div>
        )}

        {/* Actions */}
        <div className="confirm-dialog__actions">
          <button
            className="confirm-dialog__btn confirm-dialog__btn--cancel"
            onClick={onCancel}
          >
            Cancel
          </button>

          {requiresDoubleConfirm && isFirstConfirmDone ? (
            <button
              className={`confirm-dialog__btn ${confirmBtnClass}`}
              onClick={handleFinalConfirm}
              disabled={confirmInput !== 'DELETE'}
            >
              {confirmLabel}
            </button>
          ) : (
            <button
              className={`confirm-dialog__btn ${confirmBtnClass}`}
              onClick={handleFirstConfirm}
            >
              {requiresDoubleConfirm ? 'Continue' : confirmLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
