/**
 * MessageInput Component
 *
 * Auto-growing textarea with send button and optional toolbar.
 * - Grows vertically up to ~5 lines, then shows scrollbar
 * - Enter sends message, Shift+Enter adds new line
 * - Has character limit of 1000 characters
 * - Upwork-style design with toolbar buttons (desktop only)
 */

import { useRef, useEffect } from 'react';

export default function MessageInput({ value, onChange, onSend, disabled, isSending }) {
  const textareaRef = useRef(null);

  // Auto-resize textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      // Reset height to auto to get the correct scrollHeight
      textarea.style.height = 'auto';
      // Calculate max height (~5 lines + padding)
      const lineHeight = 21; // 1.5 * 14px font-size
      const maxLines = 5;
      const padding = 24; // 12px top + 12px bottom
      const maxHeight = lineHeight * maxLines + padding;

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
      <div className="message-input__wrapper">
        {/* Input box with textarea + toolbar */}
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

          {/* Toolbar with formatting buttons (hidden on mobile via CSS) */}
          <div className="message-input__toolbar">
            <button
              type="button"
              className="message-input__toolbar-btn"
              aria-label="Format text"
              title="Format text"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
            <button
              type="button"
              className="message-input__toolbar-btn"
              aria-label="Attach file"
              title="Attach file"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
              </svg>
            </button>
            <button
              type="button"
              className="message-input__toolbar-btn"
              aria-label="Add image"
              title="Add image"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </button>
            <div className="message-input__toolbar-divider" />
            <button
              type="button"
              className="message-input__toolbar-btn"
              aria-label="Add emoji"
              title="Add emoji"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                <line x1="9" y1="9" x2="9.01" y2="9" />
                <line x1="15" y1="9" x2="15.01" y2="9" />
              </svg>
            </button>
            <div className="message-input__toolbar-spacer" />
            {/* Character count in toolbar when near limit */}
            {isNearLimit && (
              <span className={`message-input__count ${characterCount >= maxCharacters ? 'message-input__count--limit' : ''}`}>
                {characterCount}/{maxCharacters}
              </span>
            )}
          </div>
        </div>

        {/* Send button */}
        <button
          className="message-input__send"
          onClick={onSend}
          disabled={disabled || !value.trim() || isSending}
          aria-label="Send message"
        >
          {isSending ? (
            <div className="message-input__sending-spinner"></div>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M2 21l21-9L2 3v7l15 2-15 2v7z" fill="currentColor" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
