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
      // Calculate max height (3 lines + padding)
      const lineHeight = 22.5; // 1.5 * 15px font-size
      const maxLines = 3;
      const maxHeight = lineHeight * maxLines + 24; // 24px for padding

      const newHeight = Math.min(textarea.scrollHeight, maxHeight);
      textarea.style.height = `${newHeight}px`;

      // Only show scrollbar when content exceeds max height
      textarea.style.overflowY = textarea.scrollHeight > maxHeight ? 'auto' : 'hidden';
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
          <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M2 21l21-9L2 3v7l15 2-15 2v7z" />
          </svg>
        )}
      </button>
    </div>
  );
}
