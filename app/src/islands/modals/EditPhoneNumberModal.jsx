/**
 * Edit Phone Number Modal
 * Allows users to update their phone number from the account profile page
 *
 * Updated to follow POPUP_REPLICATION_PROTOCOL.md design system.
 * Features:
 * - Monochromatic purple color scheme (no green/yellow)
 * - Mobile bottom sheet behavior (< 480px)
 * - Feather icons (stroke-only)
 * - Pill-shaped buttons (100px radius)
 */

import { useState, useEffect } from 'react';
import { toast } from '../../lib/toastService.js';
import './EditPhoneNumberModal.css';

// Phone icon (Feather style)
function PhoneIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
    </svg>
  );
}

// Close icon (Feather style)
function CloseIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  );
}

export default function EditPhoneNumberModal({ isOpen, currentPhoneNumber, onSave, onClose }) {
  const [newPhoneNumber, setNewPhoneNumber] = useState('');
  const [saving, setSaving] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setNewPhoneNumber('');
    } else {
      setSaving(false);
    }
  }, [isOpen]);

  // Handle escape key
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

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleSave = async () => {
    if (!newPhoneNumber.trim()) {
      toast.warning('Please enter a new phone number');
      return;
    }

    setSaving(true);
    try {
      await onSave(newPhoneNumber.trim());
      onClose();
    } catch (error) {
      toast.error(`Error saving phone number: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="edit-phone-modal-overlay"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-phone-modal-title"
    >
      <div className="edit-phone-modal" onClick={(e) => e.stopPropagation()}>
        {/* Mobile grab handle - visible only on mobile */}
        <div className="edit-phone-modal-grab-handle" aria-hidden="true" />

        {/* Header */}
        <header className="edit-phone-modal-header">
          <div className="edit-phone-modal-header-content">
            <div className="edit-phone-modal-header-top">
              <span className="edit-phone-modal-icon" aria-hidden="true">
                <PhoneIcon />
              </span>
              <h2 id="edit-phone-modal-title" className="edit-phone-modal-title">
                Edit Phone Number
              </h2>
            </div>
            <p className="edit-phone-modal-subtitle">
              Update your contact phone number for booking communications.
            </p>
          </div>
          <button
            className="edit-phone-modal-close"
            onClick={onClose}
            aria-label="Close modal"
            type="button"
          >
            <CloseIcon />
          </button>
        </header>

        {/* Body */}
        <div className="edit-phone-modal-body">
          {/* Old Phone Number */}
          <div className="edit-phone-form-group">
            <label className="edit-phone-label" htmlFor="current-phone">
              Current Phone Number
            </label>
            <input
              id="current-phone"
              type="tel"
              className="edit-phone-input"
              value={currentPhoneNumber || ''}
              disabled
              inputMode="tel"
            />
          </div>

          {/* New Phone Number */}
          <div className="edit-phone-form-group">
            <label className="edit-phone-label" htmlFor="new-phone">
              New Phone Number
            </label>
            <input
              id="new-phone"
              type="tel"
              className="edit-phone-input"
              value={newPhoneNumber}
              onChange={(e) => setNewPhoneNumber(e.target.value)}
              placeholder="Enter your new phone number"
              inputMode="tel"
              autoFocus
            />
          </div>
        </div>

        {/* Footer */}
        <footer className="edit-phone-modal-footer">
          <button
            type="button"
            className="edit-phone-btn edit-phone-btn--secondary"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            className="edit-phone-btn edit-phone-btn--primary"
            onClick={handleSave}
            disabled={saving || !newPhoneNumber.trim()}
          >
            {saving ? (
              <>
                <span className="edit-phone-spinner" aria-hidden="true" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </footer>
      </div>
    </div>
  );
}
