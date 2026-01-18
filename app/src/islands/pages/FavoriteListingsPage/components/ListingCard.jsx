/**
 * ListingCard Component (Enhanced)
 * Displays a single listing card matching Bubble.io design
 * Includes: Photo carousel, Proposal badge, Host profile, Action buttons
 */

import { useState } from 'react';
import FavoriteButton from './FavoriteButton';
import {
  formatBedroomBathroom,
  formatPrice,
  formatLocation,
  getProcessedImageUrl,
} from '../formatters';
import './ListingCard.css';

const ListingCard = ({
  listing,
  onToggleFavorite,
  onNavigateToDetail,
}) => {
  const [imageIndex, setImageIndex] = useState(0);
  const [imageError, setImageError] = useState(false);

  const photos = listing.features?.photos || [];
  const hasMultiplePhotos = photos.length > 1;

  const handlePreviousPhoto = (e) => {
    e.stopPropagation();
    if (imageIndex > 0) {
      setImageIndex(imageIndex - 1);
    }
  };

  const handleNextPhoto = (e) => {
    e.stopPropagation();
    if (imageIndex < photos.length - 1) {
      setImageIndex(imageIndex + 1);
    }
  };

  const handleCardClick = () => {
    onNavigateToDetail(listing.id);
  };

  const handleImageError = () => {
    setImageError(true);
  };

  // Get formatted text using the 4 conditional rules
  const bedroomBathroomText = formatBedroomBathroom(
    listing.features?.qtyBedrooms || 0,
    listing.features?.qtyBathrooms || 0,
    listing.kitchenType
  );

  const locationText = formatLocation(
    listing.location?.borough,
    listing.location?.hood,
    listing.location?.city
  );

  const priceText = formatPrice(listing.pricingList?.startingNightlyPrice || listing.listerPriceDisplay || 0);

  // Get main photo URL
  const mainPhotoUrl = photos.length > 0
    ? getProcessedImageUrl(photos[imageIndex]?.url, 400, 300)
    : '';

  // Mock data for host and proposal (in production, this would come from the listing data)
  const hasProposal = listing.id?.includes('1'); // Mock logic
  const hostName = 'Charlie S';
  const hostInitial = hostName.charAt(0);
  const isHostVerified = true;
  const guestCapacity = listing.features?.maxGuests || listing.features?.qtyGuests || 2;
  const originalPrice = Math.floor((listing.listerPriceDisplay || 100) * 1.4); // Mock original price

  const handleSendMessage = (e) => {
    e.stopPropagation();
    console.log('Send message to host');
    // In production: Open message modal
  };

  const handleViewProposal = (e) => {
    e.stopPropagation();
    console.log('View proposal');
    // In production: Navigate to proposal page
  };

  return (
    <div className="listing-card-enhanced">
      {/* Photo Section */}
      <div className="listing-photo-container-enhanced">
        {!imageError && mainPhotoUrl ? (
          <img
            src={mainPhotoUrl}
            alt={listing.name}
            className="listing-photo"
            onError={handleImageError}
          />
        ) : (
          <div className="listing-photo-placeholder">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <circle cx="8.5" cy="8.5" r="1.5"></circle>
              <polyline points="21 15 16 10 5 21"></polyline>
            </svg>
          </div>
        )}

        {/* Proposal Badge (Top Left) */}
        {hasProposal && (
          <div className="proposal-badge">
            <div className="proposal-ribbon"></div>
            <div className="proposal-text">Proposal</div>
          </div>
        )}

        {/* New Listing Badge */}
        <div className="new-listing-badge">New Listing</div>

        {/* Photo Navigation Arrows */}
        {hasMultiplePhotos && (
          <div className="photo-navigation">
            <button
              className={`photo-nav-button prev ${imageIndex === 0 ? 'disabled' : ''}`}
              onClick={handlePreviousPhoto}
              disabled={imageIndex === 0}
              aria-label="Previous photo"
            >
              ‹
            </button>
            <button
              className={`photo-nav-button next ${imageIndex === photos.length - 1 ? 'disabled' : ''}`}
              onClick={handleNextPhoto}
              disabled={imageIndex === photos.length - 1}
              aria-label="Next photo"
            >
              ›
            </button>
          </div>
        )}

        {/* Photo Counter */}
        {hasMultiplePhotos && (
          <div className="photo-counter">
            {imageIndex + 1} / {photos.length}
          </div>
        )}

        {/* Favorite Button (Top Right) */}
        <div className="favorite-button-container-enhanced">
          <FavoriteButton
            listingId={listing.id}
            isFavorited={listing.isFavorited}
            onToggle={onToggleFavorite}
          />
        </div>
      </div>

      {/* Details Section */}
      <div className="listing-details-enhanced">
        {/* Location */}
        <div className="listing-location-row">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
          <span>{locationText}</span>
        </div>

        {/* Listing Name */}
        <h3 className="listing-name-enhanced" onClick={handleCardClick}>
          {listing.name}
        </h3>

        {/* Guest Capacity */}
        <div className="listing-capacity">
          {listing.features?.typeOfSpace || 'Entire Place'} - {guestCapacity} guests max
        </div>

        {/* Features */}
        {bedroomBathroomText && (
          <div className="listing-features-enhanced">
            {bedroomBathroomText}
          </div>
        )}

        {/* Pricing and Actions Section */}
        <div className="listing-footer">
          {/* Pricing */}
          <div className="pricing-section">
            <div className="starting-price">
              <span>Starting at {priceText}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
            </div>
            <div className="current-price">{formatPrice(originalPrice)}</div>
            <div className="availability-message">Message Split Lease for Availability</div>
          </div>

          {/* Action Buttons */}
          <div className="action-buttons">
            <button className="action-button secondary" onClick={handleSendMessage}>
              Send Message
            </button>
            <button className="action-button primary" onClick={handleViewProposal}>
              View Proposal
            </button>
          </div>

          {/* Host Profile */}
          <div className="host-profile">
            <div className="host-avatar">
              {hostInitial}
            </div>
            <div className="host-info">
              <span className="host-name">
                Hosted by {hostName}
                {isHostVerified && (
                  <svg className="verified-icon" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"></path>
                  </svg>
                )}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ListingCard;
