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
      {/* Lightbulb emoji as fallback-proof icon */}
      <span className="header-sp-trigger__icon" role="img" aria-hidden="true">
        💡
      </span>

      {/* Count badge */}
      <span className="header-sp-trigger__badge" aria-hidden="true">
        {proposalCount > 9 ? '9+' : proposalCount}
      </span>
    </button>
  );
}
