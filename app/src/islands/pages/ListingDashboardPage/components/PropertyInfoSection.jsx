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
