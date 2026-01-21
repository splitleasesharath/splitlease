/**
 * AISuggestionsModal
 *
 * Modal for reviewing and acting on AI-generated suggestions
 * for house manual content. Follows the AIImportAssistantModal pattern.
 *
 * @module AISuggestions/AISuggestionsModal
 */

import { useEffect } from 'react';
import SuggestionCard from './SuggestionCard';
import TranscriptPopup from './TranscriptPopup';
import CombineModal from './CombineModal';
import { useAISuggestionsState } from './useAISuggestionsState';
import { PROGRESS_STAGES } from './constants';
import './ai-suggestions.css';

/**
 * Sparkles icon for header
 */
const SparklesIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    <path d="M5 3v4" />
    <path d="M19 17v4" />
    <path d="M3 5h4" />
    <path d="M17 19h4" />
  </svg>
);

/**
 * Loading spinner icon
 */
const SpinnerIcon = () => (
  <svg className="ai-suggestions-spinner" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

/**
 * Empty state icon
 */
const EmptyIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M9 12h6" />
    <circle cx="12" cy="12" r="10" />
  </svg>
);

/**
 * AI Suggestions Modal Component
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Controls modal visibility
 * @param {Function} props.onClose - Close handler callback
 * @param {string} props.houseManualId - House manual ID to load suggestions for
 * @param {Function} [props.onComplete] - Called when user finishes reviewing suggestions
 */
export default function AISuggestionsModal({
  isOpen = false,
  onClose = () => {},
  houseManualId,
  onComplete = () => {},
}) {
  const { state, actions, computed } = useAISuggestionsState(houseManualId);

  // Auto-open when isOpen prop changes
  useEffect(() => {
    if (isOpen && !state.isOpen) {
      actions.openModal();
    }
  }, [isOpen, state.isOpen, actions]);

  // ESC key handler
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen && !state.isLoading && !state.combineModalActive) {
        onClose();
        actions.closeModal();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, state.isLoading, state.combineModalActive, onClose, actions]);

  // Body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Handle close
  const handleClose = () => {
    onComplete({ processedCount: state.suggestions.length });
    onClose();
    actions.closeModal();
  };

  // Backdrop click handler
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !state.isLoading) {
      handleClose();
    }
  };

  // Handle combine button click
  const handleCombine = (suggestion) => {
    const previousContent = suggestion['Previous Content'] || '';
    const newContent = suggestion['Content'] || '';
    const combinedContent = previousContent
      ? `${previousContent}\n\n${newContent}`
      : newContent;
    actions.openCombineModal(suggestion._id, combinedContent);
  };

  // Handle accept all
  const handleAcceptAll = async () => {
    await actions.acceptAll();
    if (computed.isEmpty) {
      handleClose();
    }
  };

  // Don't render if not open
  if (!isOpen) return null;

  const { houseManual, suggestions, error, showTranscript } = state;
  const { pendingCount, isEmpty, hasTranscript, progressStage, isProcessing } = computed;

  // Show progress indicator if still processing
  const showProgress = progressStage !== 'ready' && progressStage !== 'complete' && progressStage !== 'idle';

  return (
    <>
      <div
        className="ai-suggestions-overlay"
        onClick={handleBackdropClick}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-suggestions-title"
      >
        <div className="ai-suggestions-modal" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <header className="ai-suggestions-header">
            <div className="ai-suggestions-header-left">
              <span className="ai-suggestions-icon">
                <SparklesIcon />
              </span>
              <h2 id="ai-suggestions-title" className="ai-suggestions-title">
                AI Suggestions
              </h2>
              {pendingCount > 0 && (
                <span className="ai-suggestions-badge">{pendingCount} pending</span>
              )}
            </div>

            <div className="ai-suggestions-header-right">
              {hasTranscript && (
                <button
                  type="button"
                  className="ai-suggestions-transcript-btn"
                  onClick={actions.toggleTranscript}
                >
                  View Transcript
                </button>
              )}

              {!isProcessing && (
                <button
                  type="button"
                  className="ai-suggestions-close-btn"
                  onClick={handleClose}
                  aria-label="Close"
                >
                  &times;
                </button>
              )}
            </div>
          </header>

          {/* Progress indicator */}
          {showProgress && (
            <div className="ai-suggestions-progress">
              <SpinnerIcon />
              <span>{PROGRESS_STAGES[progressStage]}</span>
            </div>
          )}

          {/* Content */}
          <div className="ai-suggestions-content">
            {isProcessing ? (
              <div className="ai-suggestions-loading">
                <SpinnerIcon />
                <p>Loading suggestions...</p>
              </div>
            ) : error ? (
              <div className="ai-suggestions-error">
                <p className="ai-suggestions-error-text">{error}</p>
                <button
                  type="button"
                  className="ai-suggestions-btn-secondary"
                  onClick={() => actions.openModal()}
                >
                  Retry
                </button>
              </div>
            ) : isEmpty ? (
              <div className="ai-suggestions-empty">
                <EmptyIcon />
                <p>No suggestions to review</p>
                <p className="ai-suggestions-empty-hint">
                  Use AI tools to generate suggestions for your house manual content.
                </p>
              </div>
            ) : (
              <div className="ai-suggestions-list">
                {suggestions.map((suggestion) => (
                  <SuggestionCard
                    key={suggestion._id}
                    suggestion={suggestion}
                    onAccept={() => actions.acceptSuggestion(suggestion._id)}
                    onIgnore={() => actions.ignoreSuggestion(suggestion._id)}
                    onCombine={() => handleCombine(suggestion)}
                    isProcessing={suggestion['being processed?']}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <footer className="ai-suggestions-footer">
            <button
              type="button"
              className="ai-suggestions-btn-secondary"
              onClick={handleClose}
              disabled={isProcessing}
            >
              Close
            </button>

            {!isEmpty && pendingCount > 0 && (
              <button
                type="button"
                className="ai-suggestions-btn-primary"
                onClick={handleAcceptAll}
                disabled={isProcessing}
              >
                Accept All ({pendingCount})
              </button>
            )}
          </footer>
        </div>
      </div>

      {/* Transcript Popup */}
      <TranscriptPopup
        isOpen={showTranscript}
        transcript={houseManual?.transcript}
        source={houseManual?.transcript_source}
        onClose={actions.toggleTranscript}
      />

      {/* Combine Modal */}
      <CombineModal
        isOpen={state.combineModalActive}
        content={state.editedContent}
        onContentChange={actions.setEditedContent}
        onConfirm={actions.confirmCombine}
        onClose={actions.closeCombineModal}
      />
    </>
  );
}
