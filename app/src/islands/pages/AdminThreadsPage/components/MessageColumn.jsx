/**
 * MessageColumn - Display messages of a specific sender type
 */

import { format } from 'date-fns';

export default function MessageColumn({ title, messages, variant }) {
  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      return format(new Date(dateString), 'MMM d, h:mm a');
    } catch {
      return '';
    }
  };

  return (
    <div className={`message-column message-column--${variant}`}>
      <h4 className="message-column__title">
        {title}
        <span className="message-column__count">({messages.length})</span>
      </h4>

      <div className="message-column__messages">
        {messages.length === 0 ? (
          <p className="message-column__empty">No messages</p>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`message-column__message ${message.isDeleted ? 'message-column__message--deleted' : ''}`}
            >
              <div className="message-column__message-header">
                <span className="message-column__message-date">
                  {formatDate(message.createdDate)}
                </span>
                {message.isDeleted && (
                  <span className="message-column__message-deleted-badge">Deleted</span>
                )}
              </div>
              <p className="message-column__message-body">
                {message.body || <em>Empty message</em>}
              </p>
              {message.notLoggedInName && (
                <p className="message-column__message-sender">
                  From: {message.notLoggedInName} ({message.notLoggedInEmail})
                </p>
              )}
              {message.callToAction && (
                <p className="message-column__message-cta">
                  CTA: {message.callToAction}
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
