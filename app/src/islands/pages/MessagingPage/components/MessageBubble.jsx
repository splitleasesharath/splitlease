/**
 * MessageBubble Component
 *
 * Individual message bubble with avatar-based layout (Upwork style).
 * - Uses message-row container with avatar on the side
 * - Incoming messages: white background with border (left-aligned)
 * - Outgoing messages: dark purple background (right-aligned)
 *
 * CTA buttons are rendered dynamically based on CTA type and user role.
 */

/**
 * Get initials from a name string
 */
function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * @param {object} props
 * @param {object} props.message - Message object with call_to_action
 * @param {function} props.onCTAClick - Handler for CTA button clicks (ctaDisplay, context) => void
 * @param {function} props.getCTAButtonConfig - Get button config (ctaDisplay) => { text, hidden, disabled }
 * @param {object} props.messageContext - Context for CTA routing (proposalId, listingId, etc.)
 */
export default function MessageBubble({ message, onCTAClick, getCTAButtonConfig, messageContext }) {
  const isOutgoing = message.is_outgoing;
  const isSplitBot = message.sender_type === 'splitbot';

  // Get CTA button configuration if message has a CTA
  const ctaType = message.call_to_action?.type;
  const ctaConfig = ctaType && getCTAButtonConfig ? getCTAButtonConfig(ctaType) : null;

  // Handle CTA button click
  const handleCTAClick = () => {
    if (onCTAClick && ctaType) {
      // Build context from message data
      const context = {
        ...messageContext,
        dateChangeRequestId: message.date_change_request_id,
        reviewId: message.review_id,
      };
      onCTAClick(ctaType, context);
    }
  };

  // Determine if CTA should be shown
  const showCTA = message.call_to_action && ctaConfig && !ctaConfig.hidden;

  // Get sender display name
  const senderName = isSplitBot ? 'Split Bot' : (message.sender_name || 'Unknown');

  return (
    <div className={`message-row ${isOutgoing ? 'outgoing' : ''} ${isSplitBot ? 'message-row--splitbot' : ''}`}>
      {/* Avatar */}
      <div className="msg-avatar">
        <div className={`msg-avatar-placeholder ${isOutgoing ? 'me' : ''}`}>
          {isSplitBot ? (
            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          ) : (
            getInitials(senderName)
          )}
        </div>
      </div>

      {/* Message Content */}
      <div className="msg-content">
        {/* Header with name and time */}
        <div className="msg-header">
          <span className="msg-sender">{isOutgoing ? 'You' : senderName}</span>
          <span className="msg-time">{message.timestamp || ''}</span>
        </div>

        {/* Message Bubble */}
        <div className="msg-bubble">
          <p className="msg-text">{message.message_body}</p>

          {/* Dynamic CTA Button */}
          {showCTA && (
            <button
              className={`message-bubble__cta ${ctaConfig.disabled ? 'message-bubble__cta--disabled' : ''}`}
              onClick={handleCTAClick}
              disabled={ctaConfig.disabled}
            >
              {ctaConfig.text}
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
      </div>
    </div>
  );
}
