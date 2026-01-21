/**
 * SuggestionCard Component
 *
 * Individual suggestion item with comparison view and action buttons.
 *
 * @module AISuggestions/SuggestionCard
 */

import { FIELD_LABELS, getSourceIcon, getSourceLabel } from './constants';

/**
 * Spinner icon for processing state
 */
const SpinnerIcon = () => (
  <svg
    className="ai-suggestions-spinner"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

/**
 * SuggestionCard - Displays a single AI suggestion with actions
 *
 * @param {Object} props
 * @param {Object} props.suggestion - The suggestion object
 * @param {Function} props.onAccept - Accept handler
 * @param {Function} props.onIgnore - Ignore handler
 * @param {Function} props.onCombine - Combine handler
 * @param {boolean} [props.isProcessing] - Processing state
 */
export default function SuggestionCard({
  suggestion,
  onAccept,
  onIgnore,
  onCombine,
  isProcessing = false,
}) {
  const fieldName = suggestion['Field suggested house manual'] || 'Unknown Field';
  const content = suggestion['Content'] || '';
  const previousContent = suggestion['Previous Content'];
  const isBeingProcessed = suggestion['being processed?'] || isProcessing;

  // Get source info
  const sourceIcon = getSourceIcon(suggestion);
  const sourceLabel = getSourceLabel(suggestion);

  // Pre-fill combine content (previous + new)
  const combineContent = previousContent
    ? `${previousContent}\n\n---\n\n${content}`
    : content;

  // Handle accept click
  const handleAccept = () => {
    if (!isBeingProcessed) {
      onAccept(suggestion._id);
    }
  };

  // Handle ignore click
  const handleIgnore = () => {
    if (!isBeingProcessed) {
      onIgnore(suggestion._id);
    }
  };

  // Handle combine click
  const handleCombine = () => {
    if (!isBeingProcessed) {
      onCombine(suggestion._id, combineContent);
    }
  };

  return (
    <div
      className={`suggestion-card ${isBeingProcessed ? 'suggestion-card--processing' : ''}`}
    >
      {/* Header */}
      <div className="suggestion-card-header">
        <span className="suggestion-card-source" title={sourceLabel}>
          {sourceIcon}
        </span>
        <span className="suggestion-card-field">
          {FIELD_LABELS[fieldName] || fieldName}
        </span>
        {isBeingProcessed && (
          <span className="suggestion-card-processing-badge">
            <SpinnerIcon /> Processing...
          </span>
        )}
      </div>

      {/* Previous content (if exists) */}
      {previousContent && (
        <div className="suggestion-card-previous">
          <span className="suggestion-card-previous-label">
            Previously recorded:
          </span>
          <p className="suggestion-card-previous-text">{previousContent}</p>
        </div>
      )}

      {/* AI suggestion content */}
      <div className="suggestion-card-content">
        <span className="suggestion-card-content-label">AI Suggestion:</span>
        <div className="suggestion-card-text">{content}</div>
      </div>

      {/* Action buttons */}
      <div className="suggestion-card-actions">
        <button
          type="button"
          className="suggestion-card-btn suggestion-card-btn--ignore"
          onClick={handleIgnore}
          disabled={isBeingProcessed}
        >
          Ignore
        </button>

        {previousContent && (
          <button
            type="button"
            className="suggestion-card-btn suggestion-card-btn--combine"
            onClick={handleCombine}
            disabled={isBeingProcessed}
          >
            Combine
          </button>
        )}

        <button
          type="button"
          className="suggestion-card-btn suggestion-card-btn--accept"
          onClick={handleAccept}
          disabled={isBeingProcessed}
        >
          Accept
        </button>
      </div>
    </div>
  );
}
