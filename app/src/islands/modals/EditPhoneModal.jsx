/**
 * Edit Phone Modal
 * Allows phone editing and triggers SMS verification
 * Workflow: T:Verify Phone is clicked (3 steps)
 * - Creates magic link with verified-phone=true parameter
 * - Sends via Twilio SMS
 */

import { useState } from 'react';

export default function EditPhoneModal({ currentPhone, onClose, onVerificationSent }) {
  const [phone, setPhone] = useState(currentPhone || '');
  const [sending, setSending] = useState(false);

  const handleSendVerification = async () => {
    if (!phone || phone.length < 10) {
      alert('Please enter a valid phone number');
      return;
    }

    setSending(true);
    try {
      // TODO: Implement Twilio SMS sending via backend
      console.log('Sending SMS verification to:', phone);

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      onVerificationSent();
      alert('Verification SMS sent! Click the link in the text message to verify your phone.');
      onClose();
    } catch (error) {
      alert('Error sending verification SMS');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Update Phone Number</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label htmlFor="phone" className="form-label">Phone Number</label>
            <input
              id="phone"
              type="tel"
              className="form-input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(555) 123-4567"
            />
          </div>

          <p className="modal-hint">
            We'll send you an SMS with a verification link. Standard message rates may apply.
          </p>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn-primary"
            onClick={handleSendVerification}
            disabled={sending || !phone}
          >
            {sending ? 'Sending...' : 'Send SMS Verification'}
          </button>
        </div>
      </div>
    </div>
  );
}
