import { useState, useRef } from 'react';
import InformationalText from '../../../shared/InformationalText';
import { useListingDashboard } from '../context/ListingDashboardContext';

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
    width="14"
    height="14"
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

/**
 * Determine the appropriate status message based on listing state
 * @param {Object} listing - The listing object with isOnline, isApproved, isComplete
 * @returns {Object} { title, content, expandedContent } for the InformationalText component
 */
function getStatusInfo(listing) {
  const { isOnline, isApproved, isComplete } = listing;

  // Listing is live and visible
  if (isOnline && isApproved && isComplete) {
    return {
      title: 'Listing is Live',
      content: 'Your listing is approved and visible to guests. People can now find and book your space on Split Lease.',
      expandedContent: null
    };
  }

  // Under review - submitted but not yet approved
  if (!isApproved && isComplete && !isOnline) {
    return {
      title: 'Under Review',
      content: 'Your listing is being reviewed by the Split Lease team. This typically takes 24-48 hours.',
      expandedContent: 'Our team reviews each listing to ensure quality and safety standards are met. You\'ll receive an email notification once your listing is approved and ready to go live. If we need any additional information, we\'ll reach out via email.'
    };
  }

  // Incomplete draft - not all required fields filled
  if (!isComplete) {
    return {
      title: 'Listing Incomplete',
      content: 'Your listing is missing required information. Complete all sections to submit for review.',
      expandedContent: 'To make your listing visible to guests, please fill out all required fields including photos, pricing, availability, and property details. Once complete, your listing will be submitted for review.'
    };
  }

  // Approved but offline - host deactivated
  if (isApproved && !isOnline) {
    return {
      title: 'Listing Paused',
      content: 'Your listing has been approved but is currently offline. You can reactivate it anytime to make it visible to guests again.',
      expandedContent: null
    };
  }

  // Fallback for any other state
  return {
    title: 'Listing Status',
    content: 'Your listing is currently offline. Contact support if you need help getting your listing approved.',
    expandedContent: null
  };
}

// Simple date formatter
function formatDate(date) {
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return new Date(date).toLocaleDateString('en-US', options);
}

export default function PropertyInfoSection() {
  const { listing, counts, handleImportReviews, handleEditSection } = useListingDashboard();
  const [showStatusInfo, setShowStatusInfo] = useState(false);
  const statusTriggerRef = useRef(null);

  const statusInfo = getStatusInfo(listing);

  return (
    <div id="property-info" className="listing-dashboard-property">
      {/* Section Header with Edit Button */}
      <div className="listing-dashboard-property__header">
        <h2 className="listing-dashboard-property__listing-name">
          {listing.title || 'Untitled Listing'}
        </h2>
        <button className="listing-dashboard-section__edit" onClick={() => handleEditSection('name')}>
          edit
        </button>
      </div>

      {/* Import Reviews Link */}
      <button className="listing-dashboard-property__import-btn" onClick={handleImportReviews}>
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
          {listing.isOnline ? (
            <span className="listing-dashboard-property__status-value listing-dashboard-property__status-value--online">
              Listing is online
            </span>
          ) : (
            <button
              ref={statusTriggerRef}
              className="listing-dashboard-property__status-trigger"
              onClick={() => setShowStatusInfo(true)}
              type="button"
            >
              <span className="listing-dashboard-property__status-value listing-dashboard-property__status-value--offline">
                Listing is offline
              </span>
              <QuestionMarkIcon />
            </button>
          )}
        </p>

        <p className="listing-dashboard-property__active-since">
          Listing has been active since{' '}
          <span className="listing-dashboard-property__date">
            {formatDate(listing.activeSince)}
          </span>
        </p>
      </div>

      {/* Review Section - Only show when reviews exist */}
      {counts.reviews > 0 && (
        <div className="listing-dashboard-property__reviews">
          <button
            className="listing-dashboard-property__reviews-btn"
            onClick={onImportReviews}
          >
            <StarIcon />
            <span>Show my reviews ({counts.reviews})</span>
          </button>
        </div>
      )}

      {/* Status Information Tooltip - uses shared InformationalText component */}
      <InformationalText
        isOpen={showStatusInfo}
        onClose={() => setShowStatusInfo(false)}
        triggerRef={statusTriggerRef}
        title={statusInfo.title}
        content={statusInfo.content}
        expandedContent={statusInfo.expandedContent}
        showMoreAvailable={!!statusInfo.expandedContent}
      />
    </div>
  );
}
