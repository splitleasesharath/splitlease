/**
 * SuggestedProposalTrigger
 *
 * Floating button that shows when suggested proposals are available.
 * Displays a lightbulb icon with a count badge and animated label.
 */

import { useState, useEffect } from 'react';
import './SuggestedProposalTrigger.css';

/**
 * @param {Object} props
 * @param {function} props.onClick - Handler when trigger is clicked
 * @param {boolean} props.isActive - Whether popup is currently open
 * @param {number} props.proposalCount - Number of available suggestions
 * @param {boolean} [props.showLabelOnMount=true] - Show animated label on mount
 * @param {number} [props.labelDelay=3000] - Delay before showing label (ms)
 * @param {number} [props.labelDuration=5000] - How long to show label (ms)
 */
export default function SuggestedProposalTrigger({
  onClick,
  isActive = false,
  proposalCount = 0,
  showLabelOnMount = true,
  labelDelay = 3000,
  labelDuration = 5000
}) {
  const [showLabel, setShowLabel] = useState(false);

  // Auto-show label after delay
  useEffect(() => {
    if (!showLabelOnMount || proposalCount === 0) return;

    const showTimer = setTimeout(() => {
      setShowLabel(true);
    }, labelDelay);

    const hideTimer = setTimeout(() => {
      setShowLabel(false);
    }, labelDelay + labelDuration);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [showLabelOnMount, labelDelay, labelDuration, proposalCount]);

  // Don't render if no proposals
  if (proposalCount === 0) return null;

  return (
    <div className="sp-trigger-container">
      {/* Animated label */}
      <div className={`sp-trigger-label ${showLabel ? 'sp-trigger-label--visible' : ''}`}>
        {proposalCount === 1
          ? 'You have a suggested listing!'
          : `You have ${proposalCount} suggested listings!`}
      </div>

      {/* Main button */}
      <button
        className={`sp-trigger-btn ${isActive ? 'sp-trigger-btn--active' : ''}`}
        onClick={onClick}
        aria-label={`View ${proposalCount} suggested proposal${proposalCount !== 1 ? 's' : ''}`}
        type="button"
      >
        {/* Lightbulb Icon */}
        <svg
          className="sp-trigger-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9 18h6" />
          <path d="M10 22h4" />
          <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
        </svg>

        {/* Count badge */}
        <span className="sp-trigger-badge" aria-hidden="true">
          {proposalCount > 9 ? '9+' : proposalCount}
        </span>
      </button>
    </div>
  );
}
