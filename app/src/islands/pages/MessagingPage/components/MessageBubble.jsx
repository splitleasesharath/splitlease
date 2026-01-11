/**
 * MessageBubble Component
 *
 * Individual message bubble with styling based on sender.
 * Incoming messages: light purple (#E8D5F7)
 * Outgoing messages: dark purple (#2D1B3D)
 *
 * CTA buttons are rendered dynamically based on CTA type and user role.
 */

/**
 * @param {object} props
 * @param {object} props.message - Message object with call_to_action
 * @param {function} props.onCTAClick - Handler for CTA button clicks (ctaDisplay, context) => void
 * @param {function} props.getCTAButtonConfig - Get button config (ctaDisplay) => { text, hidden, disabled }
 * @param {object} props.messageContext - Context for CTA routing (proposalId, listingId, etc.)
 */
export default function MessageBubble({ message, onCTAClick, getCTAButtonConfig, messageContext }) {
  const bubbleClass = message.is_outgoing
    ? 'message-bubble--outgoing'
    : 'message-bubble--incoming';

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

      {/* Timestamp */}
      <span className="message-bubble__timestamp">
        {message.sender_name && !message.is_outgoing && `${message.sender_name} - `}
        {message.timestamp || ''}
      </span>
    </div>
  );
}
