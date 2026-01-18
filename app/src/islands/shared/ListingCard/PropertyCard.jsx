/**
 * PropertyCard - Unified listing card component
 * Used by SearchPage and FavoriteListingsPage
 * Displays listing image carousel, details, pricing, and action buttons
 */
import { useRef, useMemo } from 'react';
import { useImageCarousel } from '../../../hooks/useImageCarousel.js';
import { formatHostName } from '../../../logic/processors/display/formatHostName.js';
import { calculatePrice } from '../../../lib/scheduleSelector/priceCalculations.js';
import { logger } from '../../../lib/logger.js';
import FavoriteButton from '../FavoriteButton/FavoriteButton.jsx';

export default function PropertyCard({
  listing,
  onLocationClick,
  onCardHover,
  onCardLeave,
  onOpenContactModal,
  onOpenInfoModal,
  isLoggedIn,
  isFavorited,
  userId,
  onToggleFavorite,
  onRequireAuth,
  showCreateProposalButton = false,
  onOpenCreateProposalModal,
  proposalForListing,
  selectedNightsCount = 5, // Default to 5 nights if not provided
  onPhotoClick,
  variant = 'search' // 'search' | 'favorites'
}) {
  const {
    currentImageIndex,
    hasImages,
    hasMultipleImages,
    handlePrevImage,
    handleNextImage
  } = useImageCarousel(listing.images);

  const priceInfoTriggerRef = useRef(null);
  const mobilePriceInfoTriggerRef = useRef(null);

  const favoriteListingId = listing.id || listing._id;

  // Get availability message (SearchPage only)
  const getAvailabilityMessage = () => {
    const id = listing.id || listing._id || '';
    // Use a simple hash of the listing ID to deterministically assign messages
    const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const messageIndex = hash % 4;

    const messages = [
      { text: 'Available in 1 week', className: 'availability-soon' },
      { text: 'Available in 2 weeks', className: 'availability-soon' },
      { text: 'Available in 3 weeks', className: 'availability-later' },
      { text: 'Message Split Lease\nfor Availability', className: '' },
    ];

    return messages[messageIndex];
  };

  const availabilityInfo = variant === 'search' ? getAvailabilityMessage() : null;

  // Calculate dynamic price
  const dynamicPrice = useMemo(() => {
    const nightsCount = selectedNightsCount;

    // If 0 nights, show starting price
    if (nightsCount < 1) {
      return listing['Starting nightly price'] || listing.price?.starting || 0;
    }

    try {
      // Create a mock nights array with the correct length
      const mockNightsArray = Array(nightsCount).fill({ nightNumber: 0 });

      // Use the same pricing calculation as View Split Lease page
      const priceBreakdown = calculatePrice(mockNightsArray, listing, 13, null);

      if (variant === 'search') {
        logger.debug(`[PropertyCard] Dynamic price for ${listing.title}:`, {
          nightsCount,
          rentalType: listing.rentalType,
          hostRate: listing[`💰Nightly Host Rate for ${nightsCount} nights`],
          pricePerNight: priceBreakdown.pricePerNight,
          valid: priceBreakdown.valid
        });
      }

      return priceBreakdown.pricePerNight || listing['Starting nightly price'] || listing.price?.starting || 0;
    } catch (error) {
      if (variant === 'search') {
        logger.warn(`[PropertyCard] Price calculation failed for listing ${listing.id}:`, error.message);
      }
      return listing['Starting nightly price'] || listing.price?.starting || 0;
    }
  }, [selectedNightsCount, listing._id, listing['Starting nightly price'], variant]);

  const startingPrice = listing['Starting nightly price'] || listing.price?.starting || 0;

  // Render amenity icons (SearchPage only)
  const renderAmenityIcons = () => {
    if (!listing.amenities || listing.amenities.length === 0) return null;

    const maxVisible = 6;
    const visibleAmenities = listing.amenities.slice(0, maxVisible);
    const hiddenCount = Math.max(0, listing.amenities.length - maxVisible);

    return (
      <div className="listing-amenities">
        {visibleAmenities.map((amenity, idx) => (
          <span key={idx} className="amenity-icon" data-tooltip={amenity.name}>
            {amenity.icon}
          </span>
        ))}
        {hiddenCount > 0 && (
          <span className="amenity-more-count" title="Show all amenities">
            +{hiddenCount} more
          </span>
        )}
      </div>
    );
  };

  const listingId = listing.id || listing._id;

  // Handle card click - pass days-selected parameter
  const handleCardClick = (e) => {
    if (!listingId) {
      e.preventDefault();
      if (variant === 'search') {
        logger.error('[PropertyCard] No listing ID found', { listing });
      } else {
        console.error('[PropertyCard] No listing ID found', { listing });
      }
      return;
    }

    // Prevent default link behavior
    e.preventDefault();

    // Get days-selected from URL at click time
    const urlParams = new URLSearchParams(window.location.search);
    const daysSelected = urlParams.get('days-selected');

    const url = daysSelected
      ? `/view-split-lease/${listingId}?days-selected=${daysSelected}`
      : `/view-split-lease/${listingId}`;

    if (variant === 'search') {
      logger.debug('📅 PropertyCard: Opening listing with URL:', url);
    } else {
      console.log('📅 PropertyCard: Opening listing with URL:', url);
    }

    // Detect mobile viewport
    const isMobile = window.innerWidth <= 768;

    if (isMobile || variant === 'favorites') {
      // On mobile or favorites page, navigate in same tab
      window.location.href = url;
    } else {
      // On desktop SearchPage, open in new tab
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  // Photo click handler (FavoriteListingsPage only)
  const handleImageClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onPhotoClick) {
      onPhotoClick(listing, currentImageIndex);
    }
  };

  return (
    <a
      className="listing-card"
      data-listing-id={listingId}
      href={listingId ? `/view-split-lease/${listingId}` : '#'}
      target="_blank"
      rel="noopener noreferrer"
      style={{ textDecoration: 'none', color: 'inherit' }}
      onClick={handleCardClick}
      onMouseEnter={() => {
        if (onCardHover) {
          onCardHover(listing);
        }
      }}
      onMouseLeave={() => {
        if (onCardLeave) {
          onCardLeave();
        }
      }}
    >
      {/* Image Section */}
      {hasImages && (
        <div className="listing-images">
          <img
            src={listing.images[currentImageIndex]}
            alt={listing.title}
            onClick={onPhotoClick ? handleImageClick : undefined}
            style={{ cursor: onPhotoClick ? 'pointer' : 'default' }}
          />
          {hasMultipleImages && (
            <>
              <button className="image-nav prev-btn" onClick={handlePrevImage}>
                ‹
              </button>
              <button className="image-nav next-btn" onClick={handleNextImage}>
                ›
              </button>
              <div className="image-counter">
                <span className="current-image">{currentImageIndex + 1}</span> /{' '}
                <span className="total-images">{listing.images.length}</span>
              </div>
            </>
          )}
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
            size="medium"
          />
          {listing.isNew && <span className="new-badge">New Listing</span>}
          {listing.type === 'Entire Place' && (
            <span className="family-friendly-tag" aria-label="Family Friendly - Entire place listing suitable for families">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              Family Friendly
            </span>
          )}
        </div>
      )}

      {/* Content Section */}
      <div className="listing-content">
        {/* Main Info - Left Side */}
        <div className="listing-main-info">
          <div className="listing-info-top">
            <button
              type="button"
              className="listing-location-pill"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (onLocationClick) {
                  onLocationClick(listing);
                }
              }}
            >
              <svg className="location-pin-icon" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
              </svg>
              <span className="location-text">{listing.location}</span>
              <svg className="location-arrow-icon" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
            <h3 className="listing-title">{listing.title}</h3>
          </div>

          {/* Meta Section */}
          <div className="listing-meta">
            <span className="meta-item"><strong>{listing.type || 'Entire Place'}</strong></span>
            <span className="meta-item"><strong>{listing.maxGuests}</strong> guests</span>
            <span className="meta-item">
              <strong>{listing.bedrooms === 0 ? 'Studio' : `${listing.bedrooms} bedroom${listing.bedrooms > 1 ? 's' : ''}`}</strong>
            </span>
            <span className="meta-item"><strong>{listing.bathrooms}</strong> bath</span>
          </div>

          {/* Host Section */}
          {variant === 'search' ? (
            <div className="listing-host-section">
              {/* Inline Price Display */}
              <div className="inline-price">
                <span className="price-current">${dynamicPrice.toFixed(2)}</span>
                <span className="price-period">/ night</span>
                {startingPrice > 0 && startingPrice !== dynamicPrice && (
                  <span
                    ref={mobilePriceInfoTriggerRef}
                    className="price-min-trigger"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onOpenInfoModal(listing, mobilePriceInfoTriggerRef);
                    }}
                  >
                    from ${parseFloat(startingPrice).toFixed(2)}/night
                    <span className="price-info-icon">?</span>
                  </span>
                )}
              </div>
              {/* Action Buttons */}
              <div className="action-buttons">
                <button
                  className="action-button secondary"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onOpenContactModal(listing);
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                  </svg>
                  Message
                </button>
                {showCreateProposalButton && (
                  proposalForListing ? (
                    <button
                      className="view-proposal-btn"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        window.location.href = `/guest-proposals?proposal=${proposalForListing._id}`;
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                        <polyline points="10 9 9 9 8 9" />
                      </svg>
                      View Proposal
                    </button>
                  ) : (
                    <button
                      className="create-proposal-btn"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onOpenCreateProposalModal(listing);
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                      Create Proposal
                    </button>
                  )
                )}
              </div>
              {/* Host Profile */}
              <div className="host-profile">
                {listing.host?.image ? (
                  <img src={listing.host.image} alt={listing.host.name} className="host-avatar" />
                ) : (
                  <div className="host-avatar-placeholder">?</div>
                )}
                <span className="host-name">
                  Hosted by {formatHostName({ fullName: listing.host?.name || 'Host' })}
                  {listing.host?.verified && <span className="verified-badge" title="Verified">✓</span>}
                </span>
              </div>
            </div>
          ) : (
            /* FavoriteListingsPage Host Row */
            <div className="listing-host-row">
              <div className="host">
                {listing.host?.image ? (
                  <img src={listing.host.image} alt={listing.host.name} className="host-avatar" />
                ) : (
                  <div className="host-avatar-placeholder">?</div>
                )}
                <span className="host-name">
                  {formatHostName({ fullName: listing.host?.name || 'Host' })}
                  {listing.host?.verified && <span className="verified-badge" title="Verified">✓</span>}
                </span>
              </div>
              <div className="listing-cta-buttons">
                <button
                  className="message-btn"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onOpenContactModal(listing);
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                  </svg>
                  Message
                </button>
                {proposalForListing ? (
                  <button
                    className="view-proposal-btn"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      window.location.href = `/guest-proposals?proposal=${proposalForListing._id}`;
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                      <polyline points="10 9 9 9 8 9" />
                    </svg>
                    View Proposal
                  </button>
                ) : (
                  <button
                    className="create-proposal-btn"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (onOpenCreateProposalModal) {
                        onOpenCreateProposalModal(listing);
                      }
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Create Proposal
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Price Sidebar - Right Side */}
        <div
          className="listing-price-sidebar"
          ref={priceInfoTriggerRef}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onOpenInfoModal(listing, priceInfoTriggerRef);
          }}
        >
          <div className="price-main">${dynamicPrice.toFixed(2)}</div>
          <div className="price-period">/night</div>
          <div className="price-divider"></div>
          {variant === 'search' ? (
            selectedNightsCount >= 1 ? (
              <div className="price-context">for {selectedNightsCount} night{selectedNightsCount !== 1 ? 's' : ''}/week</div>
            ) : (
              <div className="price-starting">Starting at<span>${parseFloat(startingPrice).toFixed(2)}/night</span></div>
            )
          ) : (
            <div className="price-starting">Starting at<span>${parseFloat(startingPrice).toFixed(2)}/night</span></div>
          )}
          {variant === 'search' && availabilityInfo ? (
            <div className={`availability-note ${availabilityInfo.className}`}>
              {availabilityInfo.text.split('\n').map((line, i) => i === 0 ? line : <><br key={i}/>{line}</>)}
            </div>
          ) : (
            <div className="availability-note">Message Split Lease<br/>for Availability</div>
          )}
        </div>
      </div>
    </a>
  );
}
