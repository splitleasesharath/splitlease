/**
 * ListingCardForMap - Listing info card that appears above map pins
 * Adapted from SL16/components/listing-card-for-map
 *
 * Features:
 * - Compact card design optimized for map overlay
 * - Photo gallery with navigation
 * - Pricing and property details
 * - Message and View Details actions
 * - Pointer arrow pointing to pin below
 */

import { useState } from 'react';
import { X, MapPin, ChevronLeft, ChevronRight, Bed, Bath, Square } from 'lucide-react';
import FavoriteButton from '../FavoriteButton';
import './ListingCardForMap.css';

/**
 * ListingCardForMap Component
 * @param {Object} props
 * @param {Object} props.listing - Listing data from search page format
 * @param {Function} props.onClose - Close card callback
 * @param {boolean} props.isVisible - Visibility state
 * @param {Object} props.position - Position {x, y} relative to map container
 * @param {Function} props.onMessageClick - Callback when message button is clicked
 * @param {boolean} props.isLoggedIn - Whether user is logged in (for showing favorite button)
 * @param {boolean} props.isFavorited - Whether the listing is favorited by the user
 * @param {Function} props.onToggleFavorite - Callback when favorite state changes: (listingId, listingTitle, newState) => void
 * @param {string} props.userId - Current user ID for favorite API calls
 * @param {Function} props.onRequireAuth - Callback to show login modal if not authenticated
 */
export default function ListingCardForMap({
  listing,
  onClose,
  isVisible,
  position = { x: 0, y: 0 },
  onMessageClick,
  isLoggedIn = false,
  isFavorited = false,
  onToggleFavorite,
  userId = null,
  onRequireAuth = null
}) {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  if (!isVisible || !listing) return null;

  const handlePrevPhoto = (e) => {
    e.stopPropagation();
    setCurrentPhotoIndex((prev) =>
      prev === 0 ? listing.images.length - 1 : prev - 1
    );
  };

  const handleNextPhoto = (e) => {
    e.stopPropagation();
    setCurrentPhotoIndex((prev) =>
      (prev + 1) % listing.images.length
    );
  };

  // Get listing ID for FavoriteButton
  const favoriteListingId = listing.id || listing._id;

  const handleViewDetails = () => {
    const listingId = listing.id || listing._id;
    if (!listingId) {
      console.error('[ListingCardForMap] No listing ID found', { listing });
      return;
    }
    console.log('[ListingCardForMap] Opening listing:', listingId);
    window.open(`/view-split-lease/${listingId}`, '_blank');
  };

  const handleMessage = (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('[ListingCardForMap] Message button clicked', {
      listingId: listing.id,
      listingTitle: listing.title,
      hasCallback: !!onMessageClick
    });
    if (onMessageClick) {
      onMessageClick(listing);
    } else {
      console.warn('[ListingCardForMap] No onMessageClick callback provided');
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const currentPhoto = listing.images?.[currentPhotoIndex];

  const nightlyPrice = listing.price?.starting || listing['Starting nightly price'] || 0;
  const bedrooms = listing.bedrooms || 0;
  const bathrooms = listing.bathrooms || 0;
  const sqft = listing.squareFeet || 0;

  return (
    <div
      className="listing-card-for-map-wrapper"
      style={{
        position: 'absolute',
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translate(-50%, 0)',
        zIndex: 1000,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="listing-card-for-map-container">
        {/* Close Button */}
        <button
          className="listing-card-close-btn"
          onClick={onClose}
          aria-label="Close listing information"
        >
          <X size={16} color="#4D4D4D" />
        </button>

        {/* Favorite Button - Uses shared FavoriteButton component */}
        <FavoriteButton
          listingId={favoriteListingId}
          userId={userId}
          initialFavorited={isFavorited}
          onToggle={(newState, listingId) => {
            if (onToggleFavorite) {
              onToggleFavorite(listingId, listing.title, newState);
            }
          }}
          onRequireAuth={onRequireAuth}
          size="small"
        />

        {/* Image Section */}
        <div className="listing-card-image-container">
          {listing.isNew && <span className="listing-card-new-badge">NEW</span>}

          <img
            src={currentPhoto}
            alt={`Photo of ${listing.title}`}
            className="listing-card-image"
            onClick={handleViewDetails}
          />

          {listing.images && listing.images.length > 1 && (
            <div className="listing-card-gallery-controls">
              <button
                className="listing-card-gallery-btn"
                onClick={handlePrevPhoto}
                aria-label="Previous photo"
              >
                <ChevronLeft size={20} />
              </button>

              <button
                className="listing-card-gallery-btn"
                onClick={handleNextPhoto}
                aria-label="Next photo"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="listing-card-content">
          <div className="listing-card-header-row">
            <h3
              className="listing-card-title"
              onClick={handleViewDetails}
            >
              {listing.title}
            </h3>
            <div className="listing-card-price-section">
              <div className="listing-card-price-highlight">
                {formatPrice(nightlyPrice)}
              </div>
              <div className="listing-card-price-subtext">per night</div>
            </div>
          </div>

          <div
            className="listing-card-location"
            onClick={handleViewDetails}
          >
            <MapPin size={12} />
            {listing.location}
          </div>

          <div className="listing-card-features-row">
            {bedrooms > 0 && (
              <span className="listing-card-feature-item">
                <Bed size={12} />
                {bedrooms} bd
              </span>
            )}
            {bathrooms > 0 && (
              <span className="listing-card-feature-item">
                <Bath size={12} />
                {bathrooms} ba
              </span>
            )}
            {sqft > 0 && (
              <span className="listing-card-feature-item">
                <Square size={12} />
                {sqft.toLocaleString()} sqft
              </span>
            )}
          </div>

          <div className="listing-card-divider"></div>

          <div className="listing-card-action-row">
            <button
              className="listing-card-view-details-btn"
              onClick={handleViewDetails}
            >
              View Details
            </button>
            <button
              className="listing-card-send-message-btn"
              onClick={handleMessage}
            >
              Message
            </button>
          </div>
        </div>
      </div>

      {/* Pointer Arrow */}
      <div className="listing-card-arrow"></div>
      <div className="listing-card-arrow-border"></div>
    </div>
  );
}
