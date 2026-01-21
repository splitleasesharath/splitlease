/**
 * EmptyState Component
 * Enhanced design with illustrated icon, floating animations, and quick tips
 */

import './EmptyState.css';

const EmptyState = ({
  message,
  ctaText,
  ctaLink,
}) => {
  const handleCtaClick = () => {
    window.location.href = ctaLink || '/search';
  };

  return (
    <div className="favorites-empty">
      {/* Illustration with floating cards */}
      <div className="favorites-empty__illustration">
        <div className="favorites-empty__bg">
          <svg
            className="favorites-empty__heart"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </div>

        {/* Floating card 1 */}
        <div className="favorites-empty__float favorites-empty__float--1">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="M21 15l-5-5L5 21" />
          </svg>
        </div>

        {/* Floating card 2 */}
        <div className="favorites-empty__float favorites-empty__float--2">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </div>
      </div>

      {/* Title */}
      <h2 className="favorites-empty__title">No favorites yet</h2>

      {/* Message */}
      <p className="favorites-empty__text">
        {message || 'Save listings you love by tapping the heart icon. Build your collection and send proposals when you\'re ready.'}
      </p>

      {/* Actions */}
      <div className="favorites-empty__actions">
        <button className="favorites-empty__cta" onClick={handleCtaClick}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          {ctaText || 'Explore Rentals'}
        </button>

        <a href="/" className="favorites-empty__link">
          Learn how Split Lease works
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </a>
      </div>

      {/* Quick Tips */}
      <div className="favorites-empty__tips">
        <h3 className="favorites-empty__tips-title">Quick Tips</h3>
        <div className="favorites-empty__tips-list">
          <div className="favorites-empty__tip">
            <div className="favorites-empty__tip-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </div>
            <div className="favorites-empty__tip-content">
              <div className="favorites-empty__tip-title">Tap the heart to save</div>
              <div className="favorites-empty__tip-desc">Found a place you like? Hit the heart icon on any listing card.</div>
            </div>
          </div>

          <div className="favorites-empty__tip">
            <div className="favorites-empty__tip-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
            </div>
            <div className="favorites-empty__tip-content">
              <div className="favorites-empty__tip-title">Set your schedule first</div>
              <div className="favorites-empty__tip-desc">Select your preferred days to see matching availability and prices.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmptyState;
