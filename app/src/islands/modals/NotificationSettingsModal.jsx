/**
 * Notification Settings Modal
 * Modal wrapper for NotificationSettingsIsland
 * Workflow: T:Notifications is clicked (Workflow 49)
 */

import { useEffect } from 'react';
import { NotificationSettingsIsland } from '../shared/NotificationSettingsIsland/index.js';

// Inline styles for modal (compatible with pages not using Tailwind CSS)
const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
  },
  modal: {
    backgroundColor: '#ffffff',
    borderRadius: '15px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
    maxWidth: '450px',
    width: '100%',
    maxHeight: '728px',
    overflow: 'auto',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 24px',
    borderBottom: '1px solid #e5e5e5',
    position: 'sticky',
    top: 0,
    backgroundColor: '#ffffff',
    zIndex: 1,
  },
  title: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#333333',
    margin: 0,
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#999999',
    padding: '0',
    lineHeight: 1,
    transition: 'color 0.2s',
  },
  body: {
    padding: '16px 24px 24px',
  },
};

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

  if (!isOpen) return null;

  return (
    <div style={styles.overlay} onClick={handleOverlayClick}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <h3 style={styles.title}>Notification Settings</h3>
          <button
            style={styles.closeButton}
            onClick={onClose}
            aria-label="Close modal"
            onMouseOver={(e) => e.target.style.color = '#666666'}
            onMouseOut={(e) => e.target.style.color = '#999999'}
          >
            &times;
          </button>
        </div>

        {/* Body - Shared Island Component */}
        <div style={styles.body}>
          <NotificationSettingsIsland userId={userId} />
        </div>
      </div>
    </div>
  );
}
