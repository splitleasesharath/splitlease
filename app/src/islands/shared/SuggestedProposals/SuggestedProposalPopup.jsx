/**
 * SuggestedProposalPopup
 *
 * Main popup component displaying a suggested proposal with:
 * - Photo gallery
 * - Property details (amenities, pricing)
 * - Location map
 * - AI-generated "Why this proposal?" summary
 * - Action buttons (Interested / Remove)
 *
 * Uses native Supabase field names.
 */

import { useCallback } from 'react';
import ImageGallery from './components/ImageGallery.jsx';
import AmenityIcons from './components/AmenityIcons.jsx';
import PriceDisplay from './components/PriceDisplay.jsx';
import ActionButtons from './components/ActionButtons.jsx';
import MapSection from './components/MapSection.jsx';
import WhyThisProposal from './components/WhyThisProposal.jsx';
import './SuggestedProposalPopup.css';

/**
 * @param {Object} props
 * @param {Object} props.proposal - Enriched proposal object with _listing, _host, etc.
 * @param {number} props.currentIndex - Current proposal index (0-based)
 * @param {number} props.totalCount - Total number of proposals
 * @param {function} props.onInterested - Handler for "Interested" action
 * @param {function} props.onRemove - Handler for "Remove" action
 * @param {function} props.onNext - Navigate to next proposal
 * @param {function} props.onPrevious - Navigate to previous proposal
 * @param {function} props.onClose - Close the popup
 * @param {boolean} props.isVisible - Whether popup is shown
 * @param {boolean} props.isProcessing - Whether an action is in progress
 * @param {string} [props.googleMapsApiKey] - Google Maps API key for map display
 */
export default function SuggestedProposalPopup({
  proposal,
  currentIndex,
  totalCount,
  onInterested,
  onRemove,
  onNext,
  onPrevious,
  onClose,
  isVisible,
  isProcessing = false,
  googleMapsApiKey
}) {
  // Handle backdrop click
  const handleBackdropClick = useCallback((e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  // Don't render if not visible or no proposal
  if (!isVisible || !proposal) return null;

  // Extract data using native Supabase field names
  const listing = proposal._listing || {};
  const photos = listing['Photos - Features'] || [];
  const listingName = listing['Listing Name'] || 'Unnamed Listing';
  const address = listing['Address - Full'] || '';
  const geoPoint = listing.geo_point || null;

  // Negotiation summary (AI explanation)
  const summaries = proposal._negotiationSummaries || [];
  const latestSummary = summaries[0]?.summary || null;

  // Format dates
  const startDate = proposal['Move in range start']
    ? new Date(proposal['Move in range start']).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    : 'TBD';

  const durationWeeks = proposal['Reservation Span (Weeks)'] || 0;
  const durationMonths = Math.round(durationWeeks / 4);

  return (
    <>
      {/* Backdrop */}
      <div
        className="sp-popup-backdrop"
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      {/* Popup */}
      <div
        className="sp-popup-overlay"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sp-popup-title"
      >
        <div className="sp-popup-card">
          {/* Header */}
          <div className="sp-popup-header">
            <div className="sp-popup-header-left">
              <span className="sp-popup-badge">Suggested for You</span>
              <span className="sp-popup-counter">
                {currentIndex + 1} of {totalCount}
              </span>
            </div>

            {/* Navigation & Close */}
            <div className="sp-popup-header-right">
              {totalCount > 1 && (
                <div className="sp-popup-nav">
                  <button
                    className="sp-popup-nav-btn"
                    onClick={onPrevious}
                    aria-label="Previous proposal"
                    type="button"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M15 18l-6-6 6-6" />
                    </svg>
                  </button>
                  <button
                    className="sp-popup-nav-btn"
                    onClick={onNext}
                    aria-label="Next proposal"
                    type="button"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </button>
                </div>
              )}

              <button
                className="sp-popup-close-btn"
                onClick={onClose}
                aria-label="Close popup"
                type="button"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="sp-popup-content">
            {/* Left Column - Photos, Details, Actions */}
            <div className="sp-popup-left">
              <ImageGallery photos={photos} listingName={listingName} />

              <h2 id="sp-popup-title" className="sp-popup-title">
                {listingName}
              </h2>

              <p className="sp-popup-address">{address}</p>

              <div className="sp-popup-dates">
                <span className="sp-popup-date-label">Move-in:</span>
                <span className="sp-popup-date-value">{startDate}</span>
                <span className="sp-popup-date-separator">·</span>
                <span className="sp-popup-date-label">Duration:</span>
                <span className="sp-popup-date-value">
                  {durationMonths} month{durationMonths !== 1 ? 's' : ''}
                </span>
              </div>

              <AmenityIcons listing={listing} />

              <PriceDisplay
                nightlyPrice={proposal['Nightly Price']}
                totalPrice={proposal['Total Price']}
              />

              <ActionButtons
                onInterested={onInterested}
                onRemove={onRemove}
                isProcessing={isProcessing}
              />
            </div>

            {/* Right Column - Map, Why This Proposal */}
            <div className="sp-popup-right">
              <MapSection
                geoPoint={geoPoint}
                address={address}
                googleMapsApiKey={googleMapsApiKey}
              />

              <WhyThisProposal summary={latestSummary} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
