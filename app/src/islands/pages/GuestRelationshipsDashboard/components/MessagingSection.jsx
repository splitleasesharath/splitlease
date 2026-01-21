/**
 * Messaging Section Component
 *
 * Send emails and SMS to guests.
 * Converted from TypeScript to JavaScript following Split Lease patterns.
 */

import { useState } from 'react';
import { Mail, MessageSquare, Send, User as UserIcon, Phone, ChevronDown } from 'lucide-react';

const PRESET_EMAILS = [
  { id: '1', name: 'Welcome New Guest', subject: 'Welcome to Split Lease!' },
  { id: '2', name: 'Proposal Reminder', subject: 'Your Proposal is Waiting' },
  { id: '3', name: 'Check-In Instructions', subject: 'Your Check-In Details' },
  { id: '4', name: 'Review Request', subject: 'How was your stay?' }
];

export default function MessagingSection({
  selectedGuest,
  messageTypes,
  messageType,
  emailSubject,
  emailBody,
  smsBody,
  messageHistory,
  isLoading,
  onMessageTypeChange,
  onEmailSubjectChange,
  onEmailBodyChange,
  onSmsBodyChange,
  onSendEmail,
  onSendSMS,
  formatPhoneNumber
}) {
  const [showPresetDropdown, setShowPresetDropdown] = useState(false);

  function handlePresetSelect(preset) {
    onEmailSubjectChange(preset.subject);
    setShowPresetDropdown(false);
  }

  return (
    <div className="grd-section">
      {/* Header */}
      <div className="grd-messaging-header">
        <h2 className="grd-section-title">
          <Mail size={20} />
          Send Messages
        </h2>
        <div className="grd-message-type-selector">
          <select
            className="grd-form-select"
            value={messageType}
            onChange={(e) => onMessageTypeChange(e.target.value)}
          >
            <option value="">Choose an option...</option>
            {messageTypes.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Guest Contact Info */}
      {selectedGuest && (
        <div className="grd-guest-contact-info">
          <div className="grd-contact-avatar">
            {selectedGuest.profilePhoto ? (
              <img src={selectedGuest.profilePhoto} alt="" />
            ) : (
              <UserIcon size={24} />
            )}
          </div>
          <div className="grd-contact-details">
            <span className="grd-contact-name">{selectedGuest.firstName} {selectedGuest.lastName}</span>
            <span className="grd-contact-phone">
              <Phone size={14} />
              {formatPhoneNumber(selectedGuest.phoneNumber)}
            </span>
          </div>
        </div>
      )}

      {/* Custom Email Section */}
      <div className="grd-email-section">
        <h3 className="grd-subsection-title">Custom Email</h3>
        <div className="grd-email-form">
          <div className="grd-form-field">
            <label className="grd-form-label">Subject Line</label>
            <input
              type="text"
              className="grd-form-input"
              placeholder="Enter email subject..."
              value={emailSubject}
              onChange={(e) => onEmailSubjectChange(e.target.value)}
            />
          </div>
          <div className="grd-form-field">
            <label className="grd-form-label">Email Body</label>
            <textarea
              className="grd-form-input grd-form-textarea"
              placeholder="Enter email body..."
              rows={6}
              value={emailBody}
              onChange={(e) => onEmailBodyChange(e.target.value)}
            />
          </div>
          <button
            className="grd-btn grd-btn-primary grd-send-btn"
            onClick={onSendEmail}
            disabled={!selectedGuest || !emailSubject || !emailBody || isLoading}
          >
            <Send size={16} />
            Send
          </button>
        </div>
      </div>

      {/* Preset Emails Section */}
      <div className="grd-preset-emails-section">
        <h3 className="grd-subsection-title">
          Preset Emails
          <span className="grd-subtitle-note">(templates for common emails)</span>
        </h3>
        <a
          href="mailto:Robert@leasesplit.com"
          className="grd-email-link"
          target="_blank"
          rel="noopener noreferrer"
        >
          Link to Email (be sure to be signed into Robert@leasesplit.com)
        </a>
        <div className="grd-preset-dropdown-wrapper">
          <button
            className="grd-preset-dropdown-trigger"
            onClick={() => setShowPresetDropdown(!showPresetDropdown)}
          >
            Select a preset email
            <ChevronDown size={16} />
          </button>
          {showPresetDropdown && (
            <div className="grd-preset-dropdown-menu">
              {PRESET_EMAILS.map(preset => (
                <button
                  key={preset.id}
                  className="grd-preset-option"
                  onClick={() => handlePresetSelect(preset)}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Text Guest Section */}
      <div className="grd-sms-section">
        <h3 className="grd-subsection-title">
          <MessageSquare size={18} />
          Text Guest
        </h3>
        <div className="grd-sms-form">
          <textarea
            className="grd-form-input grd-form-textarea"
            placeholder="Type here message body..."
            rows={4}
            value={smsBody}
            onChange={(e) => onSmsBodyChange(e.target.value)}
          />
          <button
            className="grd-btn grd-btn-primary grd-send-btn"
            onClick={onSendSMS}
            disabled={!selectedGuest || !smsBody || isLoading}
          >
            <Send size={16} />
            Send
          </button>
        </div>
      </div>

      {/* Message History */}
      {messageHistory.length > 0 && (
        <div className="grd-message-history">
          <h3 className="grd-subsection-title">Message History</h3>
          <div className="grd-messages-list">
            {messageHistory.map(message => (
              <div key={message.id} className="grd-message-item">
                <div className="grd-message-meta">
                  <span className={`grd-message-type-badge grd-message-type-${message.messageType}`}>
                    {message.messageType === 'email' ? <Mail size={12} /> : <MessageSquare size={12} />}
                    {message.messageType}
                  </span>
                  <span className="grd-message-time">
                    {new Date(message.timestamp).toLocaleString()}
                  </span>
                </div>
                <p className="grd-message-body">{message.messageBody}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
