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
 * Parse BBCode formatting tags and return React elements
 * Supports: [b][/b] for bold, [color=#XXXXXX][/color] for colored text
 * @param {string} text - Text potentially containing BBCode markers
 * @returns {Array|string} - Array of React elements or original text
 */
function parseBBCode(text) {
  if (!text) return text;

  const elements = [];
  let remaining = text;
  let keyIndex = 0;

  // Regex to match [b]...[/b] and [color=#XXXXXX]...[/color]
  const bbcodeRegex = /\[b\](.*?)\[\/b\]|\[color=(#[0-9a-fA-F]{6})\](.*?)\[\/color\]/g;

  let lastIndex = 0;
  let match;

  while ((match = bbcodeRegex.exec(text)) !== null) {
    // Add text before this match
    if (match.index > lastIndex) {
      elements.push(text.slice(lastIndex, match.index));
    }

    if (match[1] !== undefined) {
      // Bold tag: [b]text[/b]
      elements.push(<strong key={keyIndex++}>{match[1]}</strong>);
    } else if (match[2] !== undefined && match[3] !== undefined) {
      // Color tag: [color=#XXXXXX]text[/color]
      elements.push(
        <span key={keyIndex++} style={{ color: match[2] }}>
          {match[3]}
        </span>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text after last match
  if (lastIndex < text.length) {
    elements.push(text.slice(lastIndex));
  }

  return elements.length > 0 ? elements : text;
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
          <p>{parseBBCode(summary)}</p>
        </div>
      )}
    </div>
  );
}
