/**
 * ConversationHistory - Display all messages in a thread
 *
 * Features:
 * - Scrollable message list
 * - Visual indicators for sender type (guest=blue, host=green, splitbot=purple)
 * - Warning icon for Split Bot messages
 * - Check icon for forwarded messages
 * - Click to select message
 * - Highlight selected message
 */

export default function ConversationHistory({
  messages,
  selectedMessageId,
  isLoading,
  currentThread,
  onMessageClick,
  getUserDisplayName,
  formatDate,
  getSenderColorClass,
}) {
  if (isLoading) {
    return (
      <div className="conversation-history conversation-history--loading">
        <div className="conversation-history__spinner" />
        <span>Loading messages...</span>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="conversation-history conversation-history--empty">
        <EmptyIcon />
        <p>No messages in this thread</p>
      </div>
    );
  }

  return (
    <div className="conversation-history">
      {/* Thread Info Banner */}
      {currentThread && (
        <div className="conversation-history__thread-info">
          <div className="thread-info__listing">
            <strong>Listing:</strong> {currentThread.listing?.name || 'No Listing'}
          </div>
          <div className="thread-info__users">
            <span className="thread-info__guest">
              <GuestIcon />
              {currentThread.guest?.email || 'No Guest'}
            </span>
            <span className="thread-info__arrow">↔</span>
            <span className="thread-info__host">
              <HostIcon />
              {currentThread.host?.email || 'No Host'}
            </span>
          </div>
        </div>
      )}

      {/* Messages List */}
      <div className="conversation-history__messages">
        {messages.map((message) => {
          const senderColorClass = getSenderColorClass(message.senderType);
          const isSelected = message.id === selectedMessageId;

          return (
            <button
              key={message.id}
              onClick={() => onMessageClick(message)}
              className={`message-bubble ${senderColorClass} ${isSelected ? 'message-bubble--selected' : ''}`}
            >
              <div className="message-bubble__header">
                <span className="message-bubble__sender">
                  {message.senderType === 'splitbot' ? (
                    <>
                      <SplitBotIcon />
                      Split Bot
                    </>
                  ) : message.senderType === 'guest' ? (
                    <>
                      <GuestIcon />
                      {getUserDisplayName(message.originator) || 'Guest'}
                    </>
                  ) : (
                    <>
                      <HostIcon />
                      {getUserDisplayName(message.originator) || 'Host'}
                    </>
                  )}
                </span>
                <span className="message-bubble__time">
                  {formatDate(message.createdAt)}
                </span>
              </div>

              <div className="message-bubble__body">
                {message.body}
              </div>

              <div className="message-bubble__indicators">
                {message.isSplitBotWarning && (
                  <span className="message-indicator message-indicator--warning" title="Split Bot Warning">
                    <WarningIcon />
                  </span>
                )}
                {message.isForwarded && (
                  <span className="message-indicator message-indicator--forwarded" title="Forwarded">
                    <ForwardedIcon />
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Message Count */}
      <div className="conversation-history__count">
        {messages.length} message{messages.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}

// ===== ICONS =====

function EmptyIcon() {
  return (
    <svg
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      width="48"
      height="48"
      className="empty-icon"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
      />
    </svg>
  );
}

function GuestIcon() {
  return (
    <svg
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      width="14"
      height="14"
      className="sender-icon sender-icon--guest"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
      />
    </svg>
  );
}

function HostIcon() {
  return (
    <svg
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      width="14"
      height="14"
      className="sender-icon sender-icon--host"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
      />
    </svg>
  );
}

function SplitBotIcon() {
  return (
    <svg
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      width="14"
      height="14"
      className="sender-icon sender-icon--splitbot"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      width="14"
      height="14"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  );
}

function ForwardedIcon() {
  return (
    <svg
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      width="14"
      height="14"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}
