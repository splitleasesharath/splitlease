/**
 * MessageBubble Component
 *
 * Individual message bubble with styling based on sender.
 * Incoming messages: light purple (#E8D5F7)
 * Outgoing messages: dark purple (#2D1B3D)
 */

export default function MessageBubble({ message }) {
  const bubbleClass = message.is_outgoing
    ? 'message-bubble--outgoing'
    : 'message-bubble--incoming';

  const isSplitBot = message.sender_type === 'splitbot';

  // Format timestamp for display
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';

    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className={`message-bubble ${bubbleClass} ${isSplitBot ? 'message-bubble--splitbot' : ''}`}>
      {/* Sender name for incoming messages */}
      {!message.is_outgoing && (
        <span className="message-bubble__sender">
          {isSplitBot ? 'Split Bot' : message.sender_name}
        </span>
      )}

      {/* Message Content */}
      <div className="message-bubble__content">
        <p className="message-bubble__text">{message.message_body}</p>

        {/* Call to Action Button */}
        {message.call_to_action && (
          <button
            className="message-bubble__cta"
            onClick={() => {
              if (message.call_to_action.link) {
                window.location.href = message.call_to_action.link;
              }
            }}
          >
            {message.call_to_action.message || 'View Details'}
          </button>
        )}

        {/* Split Bot Warning */}
        {message.split_bot_warning && (
          <div className="message-bubble__warning">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
            <span>{message.split_bot_warning}</span>
          </div>
        )}
      </div>

      {/* Timestamp */}
      <span className="message-bubble__timestamp">
        {message.sender_name && !message.is_outgoing && `${message.sender_name} - `}
        {formatTimestamp(message.timestamp)}
      </span>
    </div>
  );
}
