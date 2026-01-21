/**
 * CombineModal
 *
 * Nested modal for editing combined content when user wants to
 * merge AI suggestion with existing content.
 *
 * @module AISuggestions/CombineModal
 */

import { useEffect, useRef } from 'react';

/**
 * Edit icon
 */
const EditIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

/**
 * Combine Modal Component
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Modal visibility
 * @param {string} props.content - The content being edited
 * @param {Function} props.onContentChange - Content change handler
 * @param {Function} props.onConfirm - Confirm button handler
 * @param {Function} props.onClose - Close handler
 */
export default function CombineModal({
  isOpen = false,
  content = '',
  onContentChange = () => {},
  onConfirm = () => {},
  onClose = () => {},
}) {
  const textareaRef = useRef(null);

  // Focus textarea when opening
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
      // Move cursor to end
      textareaRef.current.setSelectionRange(content.length, content.length);
    }
  }, [isOpen, content.length]);

  // ESC key handler
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Handle confirm with keyboard
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      onConfirm();
    }
  };

  if (!isOpen) return null;

  const hasContent = content && content.trim().length > 0;

  return (
    <div
      className="combine-modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="combine-modal-title"
    >
      <div className="combine-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <header className="combine-modal-header">
          <div className="combine-modal-header-left">
            <EditIcon />
            <h3 id="combine-modal-title" className="combine-modal-title">
              Edit Combined Content
            </h3>
          </div>

          <button
            type="button"
            className="combine-modal-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            &times;
          </button>
        </header>

        {/* Content */}
        <div className="combine-modal-content">
          <p className="combine-modal-hint">
            Edit the combined content below. The existing and AI-suggested content have been merged.
          </p>

          <textarea
            ref={textareaRef}
            className="combine-modal-textarea"
            value={content}
            onChange={(e) => onContentChange(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={10}
            placeholder="Enter your content here..."
          />

          <p className="combine-modal-shortcut">
            Press <kbd>Ctrl</kbd> + <kbd>Enter</kbd> to save
          </p>
        </div>

        {/* Footer */}
        <footer className="combine-modal-footer">
          <button
            type="button"
            className="combine-modal-btn combine-modal-btn--cancel"
            onClick={onClose}
          >
            Cancel
          </button>

          <button
            type="button"
            className="combine-modal-btn combine-modal-btn--confirm"
            onClick={onConfirm}
            disabled={!hasContent}
          >
            Save Combined
          </button>
        </footer>
      </div>
    </div>
  );
}
