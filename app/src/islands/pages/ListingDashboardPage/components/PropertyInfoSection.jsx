import { useState, useRef, useEffect } from 'react';

// Icon components (inline SVGs)
const DownloadIcon = () => (
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
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" x2="12" y1="15" y2="3" />
  </svg>
);

const QuestionMarkIcon = () => (
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
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
    <path d="M12 17h.01" />
  </svg>
);

/**
 * Determine the appropriate status message based on listing state
 * @param {Object} listing - The listing object with isOnline, isApproved, isComplete
 * @returns {Object} { title, message } for the tooltip
 */
function getStatusInfo(listing) {
  const { isOnline, isApproved, isComplete } = listing;

  // Listing is live and visible
  if (isOnline && isApproved && isComplete) {
    return {
      title: 'Listing is Live',
      message: 'Your listing is approved and visible to guests. People can now find and book your space on Split Lease.'
    };
  }

  // Under review - submitted but not yet approved
  if (!isApproved && isComplete && !isOnline) {
    return {
      title: 'Under Review',
      message: 'Your listing is being reviewed by the Split Lease team. This typically takes 24-48 hours. We\'ll notify you by email once your listing is approved and ready to go live.'
    };
  }

  // Incomplete draft - not all required fields filled
  if (!isComplete) {
    return {
      title: 'Listing Incomplete',
      message: 'Your listing is missing required information. Complete all sections to submit for review and make your space visible to guests.'
    };
  }

  // Approved but offline - host deactivated
  if (isApproved && !isOnline) {
    return {
      title: 'Listing Paused',
      message: 'Your listing has been approved but is currently offline. You can reactivate it anytime to make it visible to guests again.'
    };
  }

  // Fallback for any other state
  return {
    title: 'Listing Status',
    message: 'Your listing is currently offline. Contact support if you need help getting your listing approved.'
  };
}

const StarIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

// Simple date formatter
function formatDate(date) {
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return new Date(date).toLocaleDateString('en-US', options);
}

export default function PropertyInfoSection({ listing, onImportReviews, onEdit }) {
  const [showStatusTooltip, setShowStatusTooltip] = useState(false);
  const tooltipRef = useRef(null);
  const buttonRef = useRef(null);

  // Close tooltip when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        tooltipRef.current &&
        !tooltipRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        setShowStatusTooltip(false);
      }
    }

    if (showStatusTooltip) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showStatusTooltip]);

  const statusInfo = getStatusInfo(listing);

  return (
    <div id="property-info" className="listing-dashboard-property">
      {/* Section Header with Edit Button */}
      <div className="listing-dashboard-property__header">
        <h2 className="listing-dashboard-property__listing-name">
          {listing.title || 'Untitled Listing'}
        </h2>
        <button className="listing-dashboard-section__edit" onClick={onEdit}>
          edit
        </button>
      </div>

      {/* Import Reviews Link */}
      <button className="listing-dashboard-property__import-btn" onClick={onImportReviews}>
        <DownloadIcon />
        <span>Import reviews from other sites</span>
      </button>

      {/* Listing Details */}
      <div className="listing-dashboard-property__details">
        <p className="listing-dashboard-property__address">
          <span className="listing-dashboard-property__address-text">
            {listing.location.address}
          </span>
          {' - '}
          <span className="listing-dashboard-property__hood">
            {listing.location.hoodsDisplay}
          </span>
        </p>

        <p className="listing-dashboard-property__status">
          <span className="listing-dashboard-property__status-label">Status:</span>
          <span
            className={`listing-dashboard-property__status-value ${
              listing.isOnline
                ? 'listing-dashboard-property__status-value--online'
                : 'listing-dashboard-property__status-value--offline'
            }`}
          >
            Listing is {listing.isOnline ? 'online' : 'offline'}
          </span>
          {/* Question mark icon - only show when offline */}
          {!listing.isOnline && (
            <span className="listing-dashboard-property__status-info">
              <button
                ref={buttonRef}
                className="listing-dashboard-property__status-info-btn"
                onClick={() => setShowStatusTooltip(!showStatusTooltip)}
                aria-label="More information about listing status"
                type="button"
              >
                <QuestionMarkIcon />
              </button>
              {showStatusTooltip && (
                <div ref={tooltipRef} className="listing-dashboard-property__status-tooltip">
                  <div className="listing-dashboard-property__status-tooltip-header">
                    {statusInfo.title}
                  </div>
                  <p className="listing-dashboard-property__status-tooltip-message">
                    {statusInfo.message}
                  </p>
                </div>
              )}
            </span>
          )}
        </p>

        <p className="listing-dashboard-property__active-since">
          Listing has been active since{' '}
          <span className="listing-dashboard-property__date">
            {formatDate(listing.activeSince)}
          </span>
        </p>
      </div>

      {/* Review Section */}
      <div className="listing-dashboard-property__reviews">
        <button className="listing-dashboard-property__reviews-btn">
          <StarIcon />
          <span>Show my reviews</span>
        </button>
      </div>
    </div>
  );
}
