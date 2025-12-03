import { useState } from 'react';

// Icon components (inline SVGs)
const InfoIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4" />
    <path d="M12 8h.01" />
  </svg>
);

const CloseIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);

export default function AlertBanner() {
  const [isVisible, setIsVisible] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  if (!isVisible) return null;

  return (
    <div className="listing-dashboard-alert">
      {/* Info Icon */}
      <div className="listing-dashboard-alert__icon">
        <InfoIcon />
      </div>

      {/* Content */}
      <div className="listing-dashboard-alert__content">
        <p className="listing-dashboard-alert__text">
          Need help setting up? Ask a Specialist Co-host!
        </p>
        {isExpanded && (
          <div className="listing-dashboard-alert__expanded">
            <p>
              Our specialists can help you optimize your listing and attract
              more quality tenants.
            </p>
          </div>
        )}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="listing-dashboard-alert__toggle"
        >
          {isExpanded ? 'show less' : 'show more'}
        </button>
      </div>

      {/* Close Button */}
      <button
        onClick={() => setIsVisible(false)}
        className="listing-dashboard-alert__close"
      >
        <CloseIcon />
      </button>
    </div>
  );
}
