/**
 * ReminderModal - Modal for sending reminders to host/guest
 */

import { useState } from 'react';
import { X, Mail, MessageSquare, Send } from 'lucide-react';

export default function ReminderModal({
  isOpen,
  thread,
  onSend,
  onClose,
  isSending,
}) {
  const [recipientType, setRecipientType] = useState('both');
  const [method, setMethod] = useState('email');

  if (!isOpen || !thread) return null;

  const handleSend = () => {
    onSend({
      threadId: thread.id,
      recipientType,
      method,
    });
  };

  const canSendToHost = thread.host?.email || thread.host?.phone;
  const canSendToGuest = thread.guest?.email || thread.guest?.phone;

  return (
    <div className="reminder-modal__overlay" onClick={onClose}>
      <div
        className="reminder-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="reminder-modal__header">
          <h3 className="reminder-modal__title">Send Reminder</h3>
          <button
            className="reminder-modal__close"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="reminder-modal__body">
          {/* Thread Info */}
          <div className="reminder-modal__thread-info">
            <p><strong>Thread:</strong> {thread.subject}</p>
            <p><strong>Host:</strong> {thread.host?.name || 'Unknown'} ({thread.host?.email || 'No email'})</p>
            <p><strong>Guest:</strong> {thread.guest?.name || thread.maskedEmail || 'Unknown'} ({thread.guest?.email || 'No email'})</p>
          </div>

          {/* Recipient Selection */}
          <div className="reminder-modal__field">
            <label className="reminder-modal__label">Send to:</label>
            <div className="reminder-modal__options">
              <label className="reminder-modal__option">
                <input
                  type="radio"
                  name="recipient"
                  value="host"
                  checked={recipientType === 'host'}
                  onChange={(e) => setRecipientType(e.target.value)}
                  disabled={!canSendToHost}
                />
                <span>Host only</span>
              </label>
              <label className="reminder-modal__option">
                <input
                  type="radio"
                  name="recipient"
                  value="guest"
                  checked={recipientType === 'guest'}
                  onChange={(e) => setRecipientType(e.target.value)}
                  disabled={!canSendToGuest}
                />
                <span>Guest only</span>
              </label>
              <label className="reminder-modal__option">
                <input
                  type="radio"
                  name="recipient"
                  value="both"
                  checked={recipientType === 'both'}
                  onChange={(e) => setRecipientType(e.target.value)}
                  disabled={!canSendToHost || !canSendToGuest}
                />
                <span>Both</span>
              </label>
            </div>
          </div>

          {/* Method Selection */}
          <div className="reminder-modal__field">
            <label className="reminder-modal__label">Method:</label>
            <div className="reminder-modal__options">
              <label className="reminder-modal__option">
                <input
                  type="radio"
                  name="method"
                  value="email"
                  checked={method === 'email'}
                  onChange={(e) => setMethod(e.target.value)}
                />
                <Mail size={16} />
                <span>Email</span>
              </label>
              <label className="reminder-modal__option">
                <input
                  type="radio"
                  name="method"
                  value="sms"
                  checked={method === 'sms'}
                  onChange={(e) => setMethod(e.target.value)}
                />
                <MessageSquare size={16} />
                <span>SMS</span>
              </label>
              <label className="reminder-modal__option">
                <input
                  type="radio"
                  name="method"
                  value="both"
                  checked={method === 'both'}
                  onChange={(e) => setMethod(e.target.value)}
                />
                <span>Both</span>
              </label>
            </div>
          </div>
        </div>

        <div className="reminder-modal__footer">
          <button
            className="reminder-modal__btn reminder-modal__btn--cancel"
            onClick={onClose}
            disabled={isSending}
          >
            Cancel
          </button>
          <button
            className="reminder-modal__btn reminder-modal__btn--send"
            onClick={handleSend}
            disabled={isSending}
          >
            {isSending ? (
              <>Sending...</>
            ) : (
              <>
                <Send size={16} />
                Send Reminder
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
