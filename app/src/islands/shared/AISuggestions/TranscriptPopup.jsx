/**
 * TranscriptPopup Component
 *
 * Read-only overlay showing the AI phone call transcript.
 *
 * @module AISuggestions/TranscriptPopup
 */

import { useEffect } from 'react';

/**
 * TranscriptPopup - Modal overlay for viewing call transcripts
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Popup visibility
 * @param {string} [props.transcript] - The transcript text
 * @param {string} [props.source] - The transcript source (call, audio, etc.)
 * @param {Function} props.onClose - Close handler
 */
export default function TranscriptPopup({
  isOpen,
  transcript,
  source = 'call',
  onClose,
}) {
  // ESC key handler
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Format transcript with line breaks
  const formattedTranscript = transcript
    ? transcript.split('\n').map((line, i) => (
        <p key={i} className="transcript-line">
          {line || <br />}
        </p>
      ))
    : null;

  // Get title based on source
  const getTitle = () => {
    switch (source) {
      case 'call':
        return 'Phone Call Transcript';
      case 'audio':
        return 'Audio Recording Transcript';
      default:
        return 'Transcript';
    }
  };

  return (
    <div
      className="transcript-popup-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="transcript-title"
    >
      <div
        className="transcript-popup"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="transcript-popup-header">
          <h3 id="transcript-title" className="transcript-popup-title">
            📞 {getTitle()}
          </h3>
          <button
            type="button"
            className="transcript-popup-close"
            onClick={onClose}
            aria-label="Close transcript"
          >
            &times;
          </button>
        </div>

        {/* Content */}
        <div className="transcript-popup-content">
          {transcript ? (
            <div className="transcript-text">
              {formattedTranscript}
            </div>
          ) : (
            <p className="transcript-empty">
              No transcript available.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="transcript-popup-footer">
          <button
            type="button"
            className="transcript-popup-btn"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
