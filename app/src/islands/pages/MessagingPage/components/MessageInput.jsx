/**
 * MessageInput Component
 *
 * Simple auto-growing textarea with send button.
 * - Grows vertically up to ~5 lines, then shows scrollbar
 * - Enter sends message, Shift+Enter adds new line
 * - Has character limit of 1000 characters
 */

import { useRef, useEffect } from 'react';

export default function MessageInput({ value, onChange, onSend, disabled, isSending }) {
  const textareaRef = useRef(null);
  const maxCharacters = 1000;

  // Auto-resize textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const lineHeight = 21;
      const maxLines = 5;
      const padding = 24;
      const maxHeight = lineHeight * maxLines + padding;

      const newHeight = Math.min(textarea.scrollHeight, maxHeight);
      textarea.style.height = `${newHeight}px`;
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

  return (
    <div className="message-input">
      <div className="message-input__wrapper">
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
        </div>

        <button
          className="message-input__send"
          onClick={onSend}
          disabled={disabled || !value.trim() || isSending}
          aria-label={isSending ? 'Sending message...' : 'Send message'}
          aria-busy={isSending}
        >
          {isSending ? (
            <div className="message-input__sending-spinner" role="status" aria-label="Sending"></div>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M2 21l21-9L2 3v7l15 2-15 2v7z" fill="currentColor" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
