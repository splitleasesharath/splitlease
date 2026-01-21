/**
 * NegotiationSummarySection
 *
 * Displays AI-generated negotiation summary in an expandable section.
 * Shows a clickable header that expands to reveal the full summary text.
 * Supports markdown bold syntax (**text**) for emphasis.
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
 * NegotiationSummarySection Component
 *
 * @param {Object} props
 * @param {Array} props.summaries - Array of negotiation summary objects
 * @returns {JSX.Element|null}
 */
export default function NegotiationSummarySection({ summaries }) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Get the most recent summary (first in array since sorted by date desc)
  const summary = summaries?.[0];
  if (!summary) return null;

  // Check multiple possible field names for the summary text
  // Note: 'Summary' is the Bubble.io column name (capital S)
  const summaryText = summary['Summary'] || summary['Guest Summary'] || summary['Host Summary'] || summary.summary || '';
  if (!summaryText) return null;

  return (
    <div className="negotiation-summary-section">
      <button
        className="negotiation-summary-toggle"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
      >
        <span className="negotiation-summary-icon">💡</span>
        <span className="negotiation-summary-label">
          Why This Proposal?
        </span>
        <span className={`negotiation-summary-chevron ${isExpanded ? 'expanded' : ''}`}>
          ▼
        </span>
      </button>

      {isExpanded && (
        <div className="negotiation-summary-content">
          <p>{parseMarkdownBold(summaryText)}</p>
        </div>
      )}
    </div>
  );
}
