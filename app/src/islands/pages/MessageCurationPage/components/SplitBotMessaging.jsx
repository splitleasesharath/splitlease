/**
 * SplitBotMessaging - Send automated Split Bot messages
 *
 * Features:
 * - Textarea for message body
 * - Radio buttons for recipient selection (Guest/Host)
 * - Template buttons for common messages
 * - Send button with loading state
 */

export default function SplitBotMessaging({
  threadId,
  messageText,
  recipientType,
  isProcessing,
  onMessageTextChange,
  onRecipientTypeChange,
  onSendMessage,
  onApplyTemplate,
}) {
  const canSend = threadId && messageText.trim() && !isProcessing;

  return (
    <div className="splitbot-messaging">
      <h3 className="splitbot-messaging__title">
        <SplitBotIcon />
        Split Bot Messaging
      </h3>

      {/* Recipient Selection */}
      <div className="splitbot-messaging__recipient">
        <label className="splitbot-messaging__label">Send to:</label>
        <div className="splitbot-messaging__radio-group">
          <label className="splitbot-messaging__radio">
            <input
              type="radio"
              name="recipientType"
              value="guest"
              checked={recipientType === 'guest'}
              onChange={() => onRecipientTypeChange('guest')}
              disabled={isProcessing}
            />
            <span className="splitbot-messaging__radio-label">Guest</span>
          </label>
          <label className="splitbot-messaging__radio">
            <input
              type="radio"
              name="recipientType"
              value="host"
              checked={recipientType === 'host'}
              onChange={() => onRecipientTypeChange('host')}
              disabled={isProcessing}
            />
            <span className="splitbot-messaging__radio-label">Host</span>
          </label>
        </div>
      </div>

      {/* Template Buttons */}
      <div className="splitbot-messaging__templates">
        <label className="splitbot-messaging__label">Quick Templates:</label>
        <div className="splitbot-messaging__template-buttons">
          <button
            onClick={() => onApplyTemplate('redacted_contact_info')}
            className="splitbot-messaging__template-button"
            disabled={isProcessing}
            title="Contact info redacted warning"
          >
            Contact Redacted
          </button>
          <button
            onClick={() => onApplyTemplate('limit_messages')}
            className="splitbot-messaging__template-button"
            disabled={isProcessing}
            title="Please limit messages"
          >
            Limit Messages
          </button>
          <button
            onClick={() => onApplyTemplate('lease_documents_signed')}
            className="splitbot-messaging__template-button"
            disabled={isProcessing}
            title="Lease documents signed notification"
          >
            Lease Signed
          </button>
        </div>
      </div>

      {/* Message Input */}
      <div className="splitbot-messaging__input">
        <label className="splitbot-messaging__label">Message:</label>
        <textarea
          value={messageText}
          onChange={(e) => onMessageTextChange(e.target.value)}
          placeholder="Enter Split Bot message..."
          rows={4}
          disabled={isProcessing}
          className="splitbot-messaging__textarea"
        />
      </div>

      {/* Send Button */}
      <button
        onClick={onSendMessage}
        disabled={!canSend}
        className="splitbot-messaging__send-button"
      >
        {isProcessing ? (
          <>
            <span className="splitbot-messaging__spinner" />
            Sending...
          </>
        ) : (
          <>
            <SendIcon />
            Send Split Bot Message
          </>
        )}
      </button>

      {/* Helper Text */}
      <p className="splitbot-messaging__helper">
        Messages sent via Split Bot will appear as system messages to the {recipientType}.
      </p>
    </div>
  );
}

// ===== ICONS =====

function SplitBotIcon() {
  return (
    <svg
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      width="18"
      height="18"
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

function SendIcon() {
  return (
    <svg
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      width="18"
      height="18"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
      />
    </svg>
  );
}
