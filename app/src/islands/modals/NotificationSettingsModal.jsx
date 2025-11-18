/**
 * Notification Settings Modal
 * Creates/updates notification preferences
 * Workflow: T:Notifications is clicked (Workflow 49)
 */

import { useState } from 'react';

export default function NotificationSettingsModal({ userId, onClose }) {
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [saving, setSaving] = useState(false);

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

      alert('Notification settings saved');
      onClose();
    } catch (error) {
      alert('Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Notification Settings</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="notification-option">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={emailNotifications}
                onChange={(e) => setEmailNotifications(e.target.checked)}
              />
              <div>
                <strong>Email Notifications</strong>
                <p className="option-description">Receive updates about proposals and messages via email</p>
              </div>
            </label>
          </div>

          <div className="notification-option">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={smsNotifications}
                onChange={(e) => setSmsNotifications(e.target.checked)}
              />
              <div>
                <strong>SMS Notifications</strong>
                <p className="option-description">Receive urgent updates via text message</p>
              </div>
            </label>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn-primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
