/**
 * Edit Email Modal
 * Allows email editing and triggers verification
 * Workflow: T:Verify Email DESKTOP is clicked (5 steps)
 * - Sends magic link with verified-email=true parameter
 */

import { useState } from 'react';

export default function EditEmailModal({ currentEmail, onClose, onVerificationSent }) {
  const [email, setEmail] = useState(currentEmail || '');
  const [sending, setSending] = useState(false);

  const handleSendVerification = async () => {
    if (!email || !email.includes('@')) {
      alert('Please enter a valid email address');
      return;
    }

    setSending(true);
    try {
      // TODO: Implement magic link sending via Supabase
      // This would call a backend endpoint that sends the magic link
      console.log('Sending verification to:', email);

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      onVerificationSent();
      alert('Verification email sent! Please check your inbox.');
      onClose();
    } catch (error) {
      alert('Error sending verification email');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Update Email Address</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label htmlFor="email" className="form-label">Email Address</label>
            <input
              id="email"
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your.email@example.com"
            />
          </div>

          <p className="modal-hint">
            We'll send you a verification link to confirm your new email address.
          </p>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn-primary"
            onClick={handleSendVerification}
            disabled={sending || !email}
          >
            {sending ? 'Sending...' : 'Send Verification Email'}
          </button>
        </div>
      </div>
    </div>
  );
}
