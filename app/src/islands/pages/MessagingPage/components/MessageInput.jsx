/**
 * MessageInput Component
 *
 * Message input field with send button.
 * Supports Enter key to send (Shift+Enter for new line in future textarea version).
 * Has character limit of 1000 characters.
 */

export default function MessageInput({ value, onChange, onSend, disabled, isSending }) {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && value.trim()) {
        onSend();
      }
    }
  };

  const characterCount = value.length;
  const maxCharacters = 1000;
  const isNearLimit = characterCount > maxCharacters * 0.9;

  return (
    <div className="message-input">
      <div className="message-input__container">
        <input
          type="text"
          className="message-input__field"
          placeholder={disabled ? 'Select a conversation to send a message' : 'Type a message...'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          maxLength={maxCharacters}
          aria-label="Message input"
        />

        {/* Character count indicator (shows when near limit) */}
        {isNearLimit && (
          <span className={`message-input__count ${characterCount >= maxCharacters ? 'message-input__count--limit' : ''}`}>
            {characterCount}/{maxCharacters}
          </span>
        )}
      </div>

      <button
        className="message-input__send"
        onClick={onSend}
        disabled={disabled || !value.trim() || isSending}
        aria-label="Send message"
      >
        {isSending ? (
          <div className="message-input__sending-spinner"></div>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
          </svg>
        )}
      </button>
    </div>
  );
}
