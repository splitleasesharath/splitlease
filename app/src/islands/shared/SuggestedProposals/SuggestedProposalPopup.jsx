/**
 * SuggestedProposalPopup
 *
 * Main popup component displaying a suggested proposal with:
 * - Photo gallery
 * - Property details (amenities, pricing)
 * - Location map
 * - AI-generated "Why this proposal?" summary
 * - Action buttons (Interested / Not Interested)
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
import NotInterestedModal from './components/NotInterestedModal.jsx';
import './SuggestedProposalPopup.css';

/**
 * Borough FK ID to display name mapping
 * 'Location - Borough' stores FK IDs to reference_table.zat_geo_borough_toplevel
 */
const BOROUGH_ID_TO_LABEL = {
  '1607041299637x913970439175620100': 'Brooklyn',
  '1607041299687x679479834266385900': 'Manhattan',
  '1607041299715x741251947580746200': 'Bronx',
  '1607041299828x406969561802059650': 'Queens',
  '1686599616073x348655546878883200': 'Weehawken, NJ',
  '1686674905048x436838997624262400': 'Newark, NJ',
  '1607041299795x174606299553766500': 'Staten Island',
};

/**
 * Check if a value looks like a Bubble FK ID (not a display name)
 * @param {string} value - The value to check
 * @returns {boolean} True if it looks like an ID
 */
const isBubbleFkId = (value) => {
  if (!value || typeof value !== 'string') return false;
  // Bubble IDs are long numeric strings with 'x' separator
  return value.includes('x') && value.length > 20;
};

/**
 * @param {Object} props
 * @param {Object} props.proposal - Enriched proposal object with _listing, _host, etc.
 * @param {number} props.currentIndex - Current proposal index (0-based)
 * @param {number} props.totalCount - Total number of proposals
 * @param {function} props.onInterested - Handler for "Interested" action
 * @param {function} props.onRemove - Handler for "Not Interested" action (opens modal)
 * @param {function} props.onNext - Navigate to next proposal
 * @param {function} props.onPrevious - Navigate to previous proposal
 * @param {function} props.onClose - Close the popup
 * @param {boolean} props.isVisible - Whether popup is shown
 * @param {boolean} props.isProcessing - Whether an action is in progress
 * @param {string} [props.googleMapsApiKey] - Google Maps API key for map display
 * @param {boolean} props.isNotInterestedModalOpen - Whether the Not Interested modal is open
 * @param {function} props.onCloseNotInterestedModal - Handler to close Not Interested modal
 * @param {function} props.onConfirmNotInterested - Handler to confirm Not Interested with feedback
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
  googleMapsApiKey,
  isNotInterestedModalOpen = false,
  onCloseNotInterestedModal,
  onConfirmNotInterested
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
  const photos = listing['Features - Photos'] || [];
  const listingName = listing['Name'] || 'Unnamed Listing';

  // Location - Address is JSONB: { address: string, lat: number, lng: number }
  // May also be stored as a string that needs parsing
  const rawAddressData = listing['Location - Address'];
  const addressData = typeof rawAddressData === 'string'
    ? (() => { try { return JSON.parse(rawAddressData); } catch { return null; } })()
    : rawAddressData;

  // Extract display address (just the street address, not the full JSONB)
  const address = addressData?.address || '';

  // Extract coordinates from Location - Address (they're embedded in the JSONB)
  // Fall back to Location - Coordinates if available
  const geoPoint = (addressData?.lat && addressData?.lng)
    ? { lat: addressData.lat, lng: addressData.lng }
    : listing['Location - Coordinates'] || null;

  // Get neighborhood/borough for location display (more useful than full address)
  // Resolve borough FK ID to display label
  const rawBorough = listing['Location - Borough'] || '';
  const borough = BOROUGH_ID_TO_LABEL[rawBorough] || (isBubbleFkId(rawBorough) ? '' : rawBorough);

  // For neighborhood, skip if it's an unresolved FK ID (no static mapping available)
  const rawNeighborhood = listing['Location - Hood'] || listing['neighborhood (manual input by user)'] || '';
  const neighborhood = isBubbleFkId(rawNeighborhood) ? '' : rawNeighborhood;

  // Negotiation summary (AI explanation)
  // Column name is 'Summary' (capital S) - Bubble.io naming convention
  const summaries = proposal._negotiationSummaries || [];
  const latestSummary = summaries[0]?.Summary || null;

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
          {/* Mobile grab handle - visible only on mobile via CSS */}
          <div className="sp-popup-grab-handle" aria-hidden="true" />

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
                    {/* Feather: chevron-left */}
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <polyline points="15 18 9 12 15 6" />
                    </svg>
                  </button>
                  <button
                    className="sp-popup-nav-btn"
                    onClick={onNext}
                    aria-label="Next proposal"
                    type="button"
                  >
                    {/* Feather: chevron-right */}
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <polyline points="9 18 15 12 9 6" />
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
                {/* Feather: x - explicit size for visibility */}
                <svg
                  className="sp-popup-close-icon"
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
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

              <p className="sp-popup-address">
                {neighborhood && borough ? `${neighborhood}, ${borough}` :
                 neighborhood || borough || address || 'Location not available'}
              </p>

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
                nightlyPrice={proposal['proposal nightly price']}
                totalPrice={proposal['Total Price for Reservation (guest)']}
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

      {/* Not Interested Modal */}
      <NotInterestedModal
        isOpen={isNotInterestedModalOpen}
        proposal={proposal}
        onClose={onCloseNotInterestedModal}
        onConfirm={onConfirmNotInterested}
        isProcessing={isProcessing}
      />
    </>
  );
}
