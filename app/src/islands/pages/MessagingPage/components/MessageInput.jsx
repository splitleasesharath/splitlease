/**
 * MessageInput Component
 *
 * Auto-growing textarea with send button.
 * - Grows vertically up to 3 lines, then shows scrollbar
 * - Enter sends message, Shift+Enter adds new line
 * - Has character limit of 1000 characters
 */

import { useRef, useEffect } from 'react';

export default function MessageInput({ value, onChange, onSend, disabled, isSending }) {
  const textareaRef = useRef(null);

  // Auto-resize textarea based on content (up to 3 lines)
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      // Reset height to auto to get the correct scrollHeight
      textarea.style.height = 'auto';
      // Calculate line height (approximately 1.5 * font-size of 15px = 22.5px)
      const lineHeight = 22.5;
      const maxLines = 3;
      const maxHeight = lineHeight * maxLines + 24; // 24px for padding (12px top + 12px bottom)
      // Set the height to the smaller of scrollHeight or maxHeight
      textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
    }
  }, [value]);

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
        <textarea
          ref={textareaRef}
          className="message-input__field"
          placeholder={disabled ? 'Select a conversation to send a message' : 'Type a message...'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          maxLength={maxCharacters}
          aria-label="Message input"
          rows={1}
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
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M22 2L11 13"/>
            <path d="M22 2L15 22L11 13L2 9L22 2Z"/>
          </svg>
        )}
      </button>
    </div>
  );
}
