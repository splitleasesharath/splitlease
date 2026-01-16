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
      {/* Lightbulb Icon - Filled version for better visibility */}
      <svg
        className="header-sp-trigger__icon"
        viewBox="0 0 24 24"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M12 2C8.13 2 5 5.13 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.87-3.13-7-7-7zm2 15H10v-1h4v1zm0-2H10v-1h4v1zm1.31-3.26L15 12v2H9v-2l-.31-.26C7.34 11.03 6 10.05 6 9c0-3.31 2.69-6 6-6s6 2.69 6 6c0 1.05-1.34 2.03-2.69 2.74z"/>
        <path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1z"/>
      </svg>

      {/* Count badge */}
      <span className="header-sp-trigger__badge" aria-hidden="true">
        {proposalCount > 9 ? '9+' : proposalCount}
      </span>
    </button>
  );
}
