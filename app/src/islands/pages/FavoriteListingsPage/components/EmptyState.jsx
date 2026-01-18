/**
 * EmptyState Component
 * Displays when user has no favorite listings
 * Shows message and CTA button to explore rentals
 */

import './EmptyState.css';

const EmptyState = ({
  message,
  ctaText,
  ctaLink,
}) => {
  const handleCtaClick = () => {
    if (ctaLink.startsWith('http')) {
      // External link
      window.location.href = ctaLink;
    } else {
      // Internal navigation
      window.location.href = ctaLink;
    }
  };

  return (
    <div className="empty-state">
      <div className="empty-state-content">
        <svg
          className="empty-state-icon"
          width="64"
          height="64"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
        </svg>

        <p className="empty-state-message">
          {message}
        </p>

        <button
          className="empty-state-cta"
          onClick={handleCtaClick}
        >
          {ctaText}
        </button>
      </div>
    </div>
  );
};

export default EmptyState;
