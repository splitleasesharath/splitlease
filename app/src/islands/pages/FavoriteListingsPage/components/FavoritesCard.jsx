/**
 * FavoritesCard Component
 *
 * A polished vertical card design for the favorites page.
 * Features:
 * - Vertical layout (image on top, content below)
 * - Status badges (Proposal Sent, New)
 * - Photo dots navigation
 * - Host info with verified badge
 * - Single action button (Create/View Proposal)
 */

import { useState, useCallback } from 'react';
import FavoriteButton from '../../../shared/FavoriteButton/FavoriteButton.jsx';
import './FavoritesCard.css';

const FavoritesCard = ({
  listing,
  onToggleFavorite,
  onOpenContactModal,
  onOpenCreateProposalModal,
  onPhotoClick,
  proposalForListing,
  userId,
  isLoggedIn,
}) => {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [imageError, setImageError] = useState(false);

  const photos = listing.images || [];
  const hasMultiplePhotos = photos.length > 1;
  const hasProposal = !!proposalForListing;
  const isNewListing = listing.isNew;

  // Photo navigation
  const handlePrevPhoto = useCallback((e) => {
    e.stopPropagation();
    setCurrentPhotoIndex(prev => (prev > 0 ? prev - 1 : photos.length - 1));
  }, [photos.length]);

  const handleNextPhoto = useCallback((e) => {
    e.stopPropagation();
    setCurrentPhotoIndex(prev => (prev < photos.length - 1 ? prev + 1 : 0));
  }, [photos.length]);

  const handleDotClick = useCallback((e, index) => {
    e.stopPropagation();
    setCurrentPhotoIndex(index);
  }, []);

  // Card click - open photo gallery
  const handleCardClick = () => {
    if (onPhotoClick && photos.length > 0) {
      onPhotoClick(listing, currentPhotoIndex);
    }
  };

  // Action button handlers
  const handleCreateProposal = (e) => {
    e.stopPropagation();
    if (onOpenCreateProposalModal) {
      onOpenCreateProposalModal(listing);
    }
  };

  const handleViewProposal = (e) => {
    e.stopPropagation();
    if (proposalForListing?._id) {
      window.location.href = `/proposal?id=${proposalForListing._id}`;
    }
  };

  const handleFavoriteToggle = (newState, listingId) => {
    if (onToggleFavorite) {
      onToggleFavorite(listingId, listing.title, newState);
    }
  };

  // Format details string
  const formatDetails = () => {
    const parts = [];

    if (listing.bedrooms === 0) {
      parts.push('Studio');
    } else if (listing.bedrooms) {
      parts.push(`${listing.bedrooms} bed`);
    }

    if (listing.bathrooms) {
      parts.push(`${listing.bathrooms} bath`);
    }

    if (listing.maxGuests) {
      parts.push(`${listing.maxGuests} guests`);
    }

    return parts.join(' • ');
  };

  // Get host initial for avatar
  const getHostInitial = () => {
    const name = listing.host?.name || 'H';
    return name.charAt(0).toUpperCase();
  };

  // Current photo URL
  const currentPhotoUrl = photos[currentPhotoIndex] || '';

  return (
    <article className="favorites-card" onClick={handleCardClick}>
      {/* Photo Section */}
      <div className="favorites-card__photo">
        {!imageError && currentPhotoUrl ? (
          <img
            src={currentPhotoUrl}
            alt={listing.title || 'Listing photo'}
            className="favorites-card__image"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="favorites-card__placeholder">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
          </div>
        )}

        {/* Status Badge */}
        {hasProposal && (
          <div className="favorites-card__badge favorites-card__badge--proposal">
            Proposal Sent
          </div>
        )}
        {!hasProposal && isNewListing && (
          <div className="favorites-card__badge favorites-card__badge--new">
            New
          </div>
        )}

        {/* Favorite Button */}
        <div className="favorites-card__favorite">
          <FavoriteButton
            listingId={listing.id}
            userId={userId}
            initialFavorited={true}
            onToggle={handleFavoriteToggle}
            size="medium"
            variant="overlay"
          />
        </div>

        {/* Photo Navigation Arrows (on hover) */}
        {hasMultiplePhotos && (
          <div className="favorites-card__nav">
            <button
              className="favorites-card__nav-btn favorites-card__nav-btn--prev"
              onClick={handlePrevPhoto}
              aria-label="Previous photo"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <button
              className="favorites-card__nav-btn favorites-card__nav-btn--next"
              onClick={handleNextPhoto}
              aria-label="Next photo"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>
        )}

        {/* Photo Dots */}
        {hasMultiplePhotos && (
          <div className="favorites-card__dots">
            {photos.slice(0, 5).map((_, index) => (
              <button
                key={index}
                className={`favorites-card__dot ${index === currentPhotoIndex ? 'favorites-card__dot--active' : ''}`}
                onClick={(e) => handleDotClick(e, index)}
                aria-label={`Go to photo ${index + 1}`}
              />
            ))}
            {photos.length > 5 && (
              <span className="favorites-card__dot-more">+{photos.length - 5}</span>
            )}
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="favorites-card__content">
        {/* Location */}
        <div className="favorites-card__location">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <span>{listing.location || listing.neighborhood || 'New York, NY'}</span>
        </div>

        {/* Title */}
        <h3 className="favorites-card__title">{listing.title || 'Unnamed Listing'}</h3>

        {/* Host Info */}
        <div className="favorites-card__host">
          {listing.host?.image ? (
            <img
              src={listing.host.image}
              alt={listing.host.name || 'Host'}
              className="favorites-card__host-avatar"
            />
          ) : (
            <div className="favorites-card__host-avatar favorites-card__host-avatar--placeholder">
              {getHostInitial()}
            </div>
          )}
          <span className="favorites-card__host-name">
            Hosted by <strong>{listing.host?.name || 'Host'}</strong>
          </span>
          {listing.host?.verified && (
            <span className="favorites-card__verified">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
              </svg>
              Verified
            </span>
          )}
        </div>

        {/* Details */}
        <div className="favorites-card__details">
          {formatDetails()}
        </div>

        {/* Pricing with inline action button (mockup spec) */}
        <div className="favorites-card__pricing">
          <div className="favorites-card__price-wrapper">
            <span className="favorites-card__price-label">Starting at</span>
            <span className="favorites-card__price">
              ${listing.price?.starting || listing['Starting nightly price'] || 0}
              <span className="favorites-card__price-period"> / night</span>
            </span>
          </div>
          {hasProposal ? (
            <button
              className="favorites-card__btn favorites-card__btn--secondary"
              onClick={handleViewProposal}
            >
              View Proposal
            </button>
          ) : (
            <button
              className="favorites-card__btn favorites-card__btn--primary"
              onClick={handleCreateProposal}
            >
              Create Proposal
            </button>
          )}
        </div>
      </div>
    </article>
  );
};

export default FavoritesCard;
