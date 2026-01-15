/**
 * HeaderSuggestedProposalTrigger
 *
 * Inline trigger for the header navigation bar.
 * Displays a compact lightbulb button with count badge.
 * Designed to fit seamlessly in the header's nav-right section.
 */

import './HeaderSuggestedProposalTrigger.css';

/**
 * @param {Object} props
 * @param {function} props.onClick - Handler when trigger is clicked
 * @param {boolean} props.isActive - Whether popup is currently open
 * @param {number} props.proposalCount - Number of available suggestions
 */
export default function HeaderSuggestedProposalTrigger({
  onClick,
  isActive = false,
  proposalCount = 0
}) {
  // Don't render if no proposals
  if (proposalCount === 0) return null;

  return (
    <button
      className={`header-sp-trigger ${isActive ? 'header-sp-trigger--active' : ''}`}
      onClick={onClick}
      aria-label={`View ${proposalCount} suggested proposal${proposalCount !== 1 ? 's' : ''}`}
      type="button"
      title="You have suggested listings waiting for your review"
    >
      {/* Lightbulb Icon */}
      <svg
        className="header-sp-trigger__icon"
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
      <span className="header-sp-trigger__badge" aria-hidden="true">
        {proposalCount > 9 ? '9+' : proposalCount}
      </span>
    </button>
  );
}
