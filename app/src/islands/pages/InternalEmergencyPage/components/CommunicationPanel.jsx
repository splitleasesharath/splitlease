/**
 * Communication Panel Component
 * Split Lease - Internal Emergency Dashboard
 *
 * Handles SMS and email communication with guests
 */

import React, { useState } from 'react';

export default function CommunicationPanel({
  emergency,
  presetMessages,
  presetEmails,
  onSendSMS,
  onSendEmail,
  onRefresh,
  onAlert,
}) {
  // Tab state
  const [activeTab, setActiveTab] = useState('sms');

  // SMS form state
  const [smsRecipient, setSmsRecipient] = useState(
    emergency.guest?.phone || emergency.reportedBy?.phone || ''
  );
  const [smsBody, setSmsBody] = useState('');
  const [sendingSms, setSendingSms] = useState(false);

  // Email form state
  const [emailRecipient, setEmailRecipient] = useState(
    emergency.guest?.email || emergency.reportedBy?.email || ''
  );
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBodyHtml, setEmailBodyHtml] = useState('');
  const [emailBodyText, setEmailBodyText] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);

  // ============================================================================
  // SMS Handlers
  // ============================================================================

  const handleSelectPresetMessage = (preset) => {
    // Replace placeholders with actual values
    let content = preset.content;
    const guestName = (emergency.guest || emergency.reportedBy)?.firstName || 'Guest';
    const staffName = emergency.assignedTo?.firstName || 'Team Member';

    content = content.replace(/\{\{guest_name\}\}/g, guestName);
    content = content.replace(/\{\{staff_name\}\}/g, staffName);
    content = content.replace(/\{\{status_message\}\}/g, emergency.status);
    content = content.replace(/\{\{date_time\}\}/g, new Date().toLocaleString());

    setSmsBody(content);
  };

  const handleSendSms = async (e) => {
    e.preventDefault();

    if (!smsRecipient) {
      onAlert('Please enter a phone number', 'error');
      return;
    }

    if (!smsBody) {
      onAlert('Please enter a message', 'error');
      return;
    }

    setSendingSms(true);
    try {
      await onSendSMS(emergency.id, smsRecipient, smsBody);
      setSmsBody(''); // Clear after successful send
    } finally {
      setSendingSms(false);
    }
  };

  // ============================================================================
  // Email Handlers
  // ============================================================================

  const handleSelectPresetEmail = (preset) => {
    // Replace placeholders with actual values
    let subject = preset.subject;
    let bodyHtml = preset.body_html;
    let bodyText = preset.body_text;

    const guestName = (emergency.guest || emergency.reportedBy)?.firstName || 'Guest';
    const staffName = emergency.assignedTo?.firstName || 'Team Member';
    const reportId = emergency.id.substring(0, 8);

    const replacePlaceholders = (text) => {
      return text
        .replace(/\{\{guest_name\}\}/g, guestName)
        .replace(/\{\{staff_name\}\}/g, staffName)
        .replace(/\{\{emergency_type\}\}/g, emergency.emergency_type)
        .replace(/\{\{report_id\}\}/g, reportId)
        .replace(/\{\{status\}\}/g, emergency.status)
        .replace(/\{\{update_message\}\}/g, '')
        .replace(/\{\{date_time\}\}/g, new Date().toLocaleString())
        .replace(/\{\{maintenance_details\}\}/g, '');
    };

    setEmailSubject(replacePlaceholders(subject));
    setEmailBodyHtml(replacePlaceholders(bodyHtml));
    setEmailBodyText(replacePlaceholders(bodyText));
  };

  const handleSendEmail = async (e) => {
    e.preventDefault();

    if (!emailRecipient) {
      onAlert('Please enter an email address', 'error');
      return;
    }

    if (!emailSubject) {
      onAlert('Please enter a subject', 'error');
      return;
    }

    if (!emailBodyHtml && !emailBodyText) {
      onAlert('Please enter a message body', 'error');
      return;
    }

    setSendingEmail(true);
    try {
      await onSendEmail(emergency.id, {
        recipientEmail: emailRecipient,
        subject: emailSubject,
        bodyHtml: emailBodyHtml,
        bodyText: emailBodyText || stripHtml(emailBodyHtml),
      });
      // Clear after successful send
      setEmailSubject('');
      setEmailBodyHtml('');
      setEmailBodyText('');
    } finally {
      setSendingEmail(false);
    }
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="communication-panel">
      <h2 className="communication-panel__title">Communication</h2>

      {/* Tabs */}
      <div className="communication-tabs">
        <button
          className={`tab-button ${activeTab === 'sms' ? 'tab-button--active' : ''}`}
          onClick={() => setActiveTab('sms')}
        >
          SMS ({emergency.messages?.length || 0})
        </button>
        <button
          className={`tab-button ${activeTab === 'email' ? 'tab-button--active' : ''}`}
          onClick={() => setActiveTab('email')}
        >
          Email ({emergency.emails?.length || 0})
        </button>
        <button
          className={`tab-button ${activeTab === 'history' ? 'tab-button--active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          History
        </button>
      </div>

      {/* SMS Tab */}
      {activeTab === 'sms' && (
        <div className="tab-content">
          <form onSubmit={handleSendSms} className="communication-form">
            {/* Preset Messages */}
            {presetMessages.length > 0 && (
              <div className="form-group">
                <label>Quick Templates</label>
                <div className="preset-buttons">
                  {presetMessages.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      className="preset-button"
                      onClick={() => handleSelectPresetMessage(preset)}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="sms-recipient">Recipient Phone</label>
              <input
                type="tel"
                id="sms-recipient"
                value={smsRecipient}
                onChange={(e) => setSmsRecipient(e.target.value)}
                placeholder="+1234567890"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="sms-body">Message</label>
              <textarea
                id="sms-body"
                value={smsBody}
                onChange={(e) => setSmsBody(e.target.value)}
                placeholder="Type your message..."
                rows={4}
                className="form-textarea"
              />
              <span className="char-count">{smsBody.length}/160</span>
            </div>

            <button
              type="submit"
              className="btn btn--primary"
              disabled={sendingSms || !smsRecipient || !smsBody}
            >
              {sendingSms ? 'Sending...' : 'Send SMS'}
            </button>
          </form>
        </div>
      )}

      {/* Email Tab */}
      {activeTab === 'email' && (
        <div className="tab-content">
          <form onSubmit={handleSendEmail} className="communication-form">
            {/* Preset Emails */}
            {presetEmails.length > 0 && (
              <div className="form-group">
                <label>Quick Templates</label>
                <div className="preset-buttons">
                  {presetEmails.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      className="preset-button"
                      onClick={() => handleSelectPresetEmail(preset)}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="email-recipient">Recipient Email</label>
              <input
                type="email"
                id="email-recipient"
                value={emailRecipient}
                onChange={(e) => setEmailRecipient(e.target.value)}
                placeholder="guest@example.com"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="email-subject">Subject</label>
              <input
                type="text"
                id="email-subject"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                placeholder="Email subject..."
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="email-body">Message (HTML)</label>
              <textarea
                id="email-body"
                value={emailBodyHtml}
                onChange={(e) => setEmailBodyHtml(e.target.value)}
                placeholder="<p>Type your message...</p>"
                rows={6}
                className="form-textarea"
              />
            </div>

            <button
              type="submit"
              className="btn btn--primary"
              disabled={sendingEmail || !emailRecipient || !emailSubject || (!emailBodyHtml && !emailBodyText)}
            >
              {sendingEmail ? 'Sending...' : 'Send Email'}
            </button>
          </form>
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="tab-content">
          <div className="communication-history">
            <h3>SMS History</h3>
            {emergency.messages?.length > 0 ? (
              <ul className="history-list">
                {emergency.messages.map((msg) => (
                  <li key={msg.id} className={`history-item history-item--${msg.status.toLowerCase()}`}>
                    <div className="history-item__header">
                      <span className="history-item__direction">{msg.direction}</span>
                      <span className={`history-item__status status--${msg.status.toLowerCase()}`}>
                        {msg.status}
                      </span>
                      <span className="history-item__time">
                        {formatDateTime(msg.created_at)}
                      </span>
                    </div>
                    <div className="history-item__recipient">
                      To: {msg.recipient_phone}
                    </div>
                    <p className="history-item__body">{msg.message_body}</p>
                    {msg.error_message && (
                      <p className="history-item__error">Error: {msg.error_message}</p>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted">No SMS messages sent yet.</p>
            )}

            <h3>Email History</h3>
            {emergency.emails?.length > 0 ? (
              <ul className="history-list">
                {emergency.emails.map((email) => (
                  <li key={email.id} className={`history-item history-item--${email.status.toLowerCase()}`}>
                    <div className="history-item__header">
                      <span className={`history-item__status status--${email.status.toLowerCase()}`}>
                        {email.status}
                      </span>
                      <span className="history-item__time">
                        {formatDateTime(email.created_at)}
                      </span>
                    </div>
                    <div className="history-item__recipient">
                      To: {email.recipient_email}
                    </div>
                    <div className="history-item__subject">
                      Subject: {email.subject}
                    </div>
                    {email.error_message && (
                      <p className="history-item__error">Error: {email.error_message}</p>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted">No emails sent yet.</p>
            )}

            <button onClick={onRefresh} className="btn btn--secondary btn--small">
              Refresh History
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Strip HTML tags from string
 */
function stripHtml(html) {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
}

/**
 * Format date-time string
 */
function formatDateTime(dateString) {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
