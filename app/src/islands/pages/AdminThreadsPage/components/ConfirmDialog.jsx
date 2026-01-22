/**
 * ConfirmDialog - Confirmation modal for destructive actions
 */

import { AlertTriangle, X } from 'lucide-react';

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel,
  confirmType = 'danger', // 'danger' | 'warning'
  onConfirm,
  onCancel,
}) {
  if (!isOpen) return null;

  return (
    <div className="confirm-dialog__overlay" onClick={onCancel}>
      <div
        className="confirm-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="confirm-dialog__header">
          <AlertTriangle
            size={24}
            className={`confirm-dialog__icon confirm-dialog__icon--${confirmType}`}
          />
          <h3 className="confirm-dialog__title">{title}</h3>
          <button
            className="confirm-dialog__close"
            onClick={onCancel}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="confirm-dialog__body">
          <p className="confirm-dialog__message">{message}</p>
        </div>

        <div className="confirm-dialog__footer">
          <button
            className="confirm-dialog__btn confirm-dialog__btn--cancel"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className={`confirm-dialog__btn confirm-dialog__btn--${confirmType}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
