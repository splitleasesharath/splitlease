/**
 * Host Overview Modals
 *
 * Modal components for:
 * - General purpose modal
 * - Confirm/delete modal
 *
 * Features:
 * - Backdrop click to close
 * - ESC key to close
 * - Multiple sizes
 * - Accessible (ARIA labels, focus management)
 */

import React, { useEffect } from 'react';

export function Modal({ isOpen, onClose, title, children, size = 'medium' }) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="host-modal-backdrop" onClick={onClose}>
      <div
        className={`host-modal host-modal--${size}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="host-modal__header">
          <h2 id="modal-title" className="host-modal__title">{title}</h2>
          <button
            className="host-modal__close"
            onClick={onClose}
            aria-label="Close modal"
          >
            &times;
          </button>
        </div>
        <div className="host-modal__content">
          {children}
        </div>
      </div>
    </div>
  );
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Yes',
  cancelText = 'No',
  variant = 'danger'
}) {
  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="small">
      <p className="host-confirm-modal__message">{message}</p>
      <div className="host-confirm-modal__actions">
        <button
          className={`btn btn--${variant}`}
          onClick={() => {
            onConfirm();
          }}
        >
          {confirmText}
        </button>
        <button
          className="btn btn--secondary"
          onClick={onClose}
        >
          {cancelText}
        </button>
      </div>
    </Modal>
  );
}
