/**
 * CounterofferSummarySection
 *
 * Displays AI-generated counteroffer summary explaining what changed
 * when a host submits a counteroffer. Shows in an expandable section
 * similar to NegotiationSummarySection.
 *
 * The summary is fetched from SplitBot messages in the _message table
 * with "Call to Action" = "Respond to Counter Offer".
 */

import { useState } from 'react';

/**
 * Parse markdown bold syntax (**text**) and return React elements
 * @param {string} text - Text potentially containing **bold** markers
 * @returns {Array|string} - Array of React elements or original text
 */
function parseMarkdownBold(text) {
  if (!text) return text;
  const parts = text.split(/\*\*([^*]+)\*\*/g);
  return parts.map((part, index) => {
    if (index % 2 === 1) {
      return <strong key={index}>{part}</strong>;
    }
    return part;
  });
}

/**
 * CounterofferSummarySection Component
 *
 * @param {Object} props
 * @param {string} props.summary - AI-generated counteroffer summary text
 * @returns {JSX.Element|null}
 */
export default function CounterofferSummarySection({ summary }) {
  const [isExpanded, setIsExpanded] = useState(true); // Default expanded for counteroffers

  if (!summary) return null;

  return (
    <div className="counteroffer-summary-section">
      <button
        className="counteroffer-summary-toggle"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
      >
        <span className="counteroffer-summary-icon">📋</span>
        <span className="counteroffer-summary-label">
          Counteroffer Summary
        </span>
        <span className={`counteroffer-summary-chevron ${isExpanded ? 'expanded' : ''}`}>
          ▼
        </span>
      </button>

      {isExpanded && (
        <div className="counteroffer-summary-content">
          <p>{parseMarkdownBold(summary)}</p>
        </div>
      )}
    </div>
  );
}
