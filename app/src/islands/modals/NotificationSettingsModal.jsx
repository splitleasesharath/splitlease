/**
 * Notification Settings Modal
 * Modal wrapper for NotificationSettingsIsland
 * Workflow: T:Notifications is clicked (Workflow 49)
 *
 * Updated to follow POPUP_REPLICATION_PROTOCOL.md design system.
 * Features:
 * - Monochromatic purple color scheme (no green/yellow)
 * - Mobile bottom sheet behavior (< 480px)
 * - Feather icons (stroke-only)
 * - Pill-shaped buttons (100px radius)
 */

import { useEffect } from 'react';
import NotificationSettingsIsland from '../shared/NotificationSettingsIsland/NotificationSettingsIsland.jsx';
import './NotificationSettingsModal.css';

// Bell icon (Feather style)
function BellIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
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

export default function NotificationSettingsModal({ isOpen, userId, onClose }) {
  // Handle backdrop click
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

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

  if (!isOpen) return null;

  return (
    <div
      className="notification-modal-overlay"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="notification-modal-title"
    >
      <div className="notification-modal" onClick={(e) => e.stopPropagation()}>
        {/* Mobile grab handle - visible only on mobile */}
        <div className="notification-modal-grab-handle" aria-hidden="true" />

        {/* Header */}
        <header className="notification-modal-header">
          <div className="notification-modal-header-content">
            <div className="notification-modal-header-top">
              <span className="notification-modal-icon" aria-hidden="true">
                <BellIcon />
              </span>
              <h2 id="notification-modal-title" className="notification-modal-title">
                Notification Settings
              </h2>
            </div>
            <p className="notification-modal-subtitle">
              Manage how you receive updates about your listings and bookings.
            </p>
          </div>
          <button
            className="notification-modal-close"
            onClick={onClose}
            aria-label="Close modal"
            type="button"
          >
            <CloseIcon />
          </button>
        </header>

        {/* Body - Shared Island Component */}
        <div className="notification-modal-body">
          <NotificationSettingsIsland userId={userId} />
        </div>
      </div>
    </div>
  );
}
