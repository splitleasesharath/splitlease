/**
 * Notification Settings Modal
 * Creates/updates notification preferences
 * Workflow: T:Notifications is clicked (Workflow 49)
 */

import { useState, useEffect } from 'react';

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
    borderRadius: '10px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
    maxWidth: '500px',
    width: '100%',
    maxHeight: '90vh',
    overflow: 'auto',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 24px',
    borderBottom: '1px solid #e5e5e5',
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
  },
  body: {
    padding: '24px',
  },
  settingItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    marginBottom: '20px',
  },
  checkbox: {
    width: '20px',
    height: '20px',
    accentColor: '#6366f1',
    cursor: 'pointer',
    marginTop: '2px',
    flexShrink: 0,
  },
  settingLabel: {
    fontWeight: '600',
    fontSize: '14px',
    color: '#333333',
    cursor: 'pointer',
    marginBottom: '4px',
  },
  settingDescription: {
    fontSize: '13px',
    color: '#666666',
    margin: 0,
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    padding: '16px 24px',
    borderTop: '1px solid #e5e5e5',
    backgroundColor: '#f9fafb',
  },
  cancelButton: {
    padding: '10px 20px',
    backgroundColor: '#9B7FBF',
    color: '#ffffff',
    border: 'none',
    borderRadius: '25px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'background-color 0.2s',
  },
  saveButton: {
    padding: '10px 24px',
    backgroundColor: '#6366f1',
    color: '#ffffff',
    border: 'none',
    borderRadius: '25px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'background-color 0.2s',
  },
  saveButtonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
};

export default function NotificationSettingsModal({ isOpen, userId, onClose }) {
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [saving, setSaving] = useState(false);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSaving(false);
    }
  }, [isOpen]);

  const handleSave = async () => {
    setSaving(true);
    try {
      // TODO: Call core-notification-settings API
      console.log('Saving notification settings:', {
        userId,
        emailNotifications,
        smsNotifications
      });

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));

      if (window.showToast) {
        window.showToast('Notification settings saved!', 'success');
      } else {
        alert('Notification settings saved');
      }
      onClose();
    } catch (error) {
      if (window.showToast) {
        window.showToast('Error saving settings', 'error');
      } else {
        alert('Error saving settings');
      }
    } finally {
      setSaving(false);
    }
  };

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
          >
            &times;
          </button>
        </div>

        {/* Body */}
        <div style={styles.body}>
          {/* Email Notifications */}
          <div style={styles.settingItem}>
            <input
              id="email-notifications"
              type="checkbox"
              checked={emailNotifications}
              onChange={(e) => setEmailNotifications(e.target.checked)}
              style={styles.checkbox}
            />
            <div>
              <label htmlFor="email-notifications" style={styles.settingLabel}>
                Email Notifications
              </label>
              <p style={styles.settingDescription}>
                Receive updates about proposals and messages via email
              </p>
            </div>
          </div>

          {/* SMS Notifications */}
          <div style={{ ...styles.settingItem, marginBottom: 0 }}>
            <input
              id="sms-notifications"
              type="checkbox"
              checked={smsNotifications}
              onChange={(e) => setSmsNotifications(e.target.checked)}
              style={styles.checkbox}
            />
            <div>
              <label htmlFor="sms-notifications" style={styles.settingLabel}>
                SMS Notifications
              </label>
              <p style={styles.settingDescription}>
                Receive urgent updates via text message
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <button
            style={styles.cancelButton}
            onClick={onClose}
            onMouseOver={(e) => e.target.style.backgroundColor = '#8968A8'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#9B7FBF'}
          >
            Cancel
          </button>
          <button
            style={{
              ...styles.saveButton,
              ...(saving ? styles.saveButtonDisabled : {}),
            }}
            onClick={handleSave}
            disabled={saving}
            onMouseOver={(e) => !saving && (e.target.style.backgroundColor = '#5558e3')}
            onMouseOut={(e) => !saving && (e.target.style.backgroundColor = '#6366f1')}
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
