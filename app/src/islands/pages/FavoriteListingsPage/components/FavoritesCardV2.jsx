/**
 * FavoritesCardV2 Component
 *
 * A completely fresh card with isolated CSS using unique class prefix.
 * Same functionality as FavoritesCard but with clean, conflict-free styles.
 */

import { useState, useCallback } from 'react';
import FavoriteButton from '../../../shared/FavoriteButton/FavoriteButton.jsx';

const FavoritesCardV2 = ({
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

  // All styles defined inline - completely isolated from external CSS
  const styles = {
    card: {
      background: '#fff',
      borderRadius: '12px',
      overflow: 'hidden',
      border: '1px solid #e5e7eb',
      cursor: 'pointer',
      transition: 'box-shadow 0.2s, transform 0.2s',
    },
    photo: {
      position: 'relative',
      height: '180px',
      background: '#f3f4f6',
    },
    image: {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
    },
    placeholder: {
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#9ca3af',
    },
    badge: {
      position: 'absolute',
      top: '8px',
      left: '8px',
      padding: '4px 8px',
      borderRadius: '4px',
      fontSize: '11px',
      fontWeight: '600',
      textTransform: 'uppercase',
      color: '#fff',
    },
    badgeProposal: {
      background: 'linear-gradient(135deg, #6B4EE6, #8B6CF5)',
    },
    badgeNew: {
      background: '#10B981',
    },
    favorite: {
      position: 'absolute',
      top: '8px',
      right: '8px',
    },
    nav: {
      position: 'absolute',
      top: '0',
      left: '0',
      right: '0',
      bottom: '0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 6px',
      opacity: '0',
      transition: 'opacity 0.2s',
      pointerEvents: 'none',
    },
    navBtn: {
      width: '28px',
      height: '28px',
      borderRadius: '50%',
      background: 'rgba(255,255,255,0.9)',
      border: 'none',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#374151',
    },
    dots: {
      position: 'absolute',
      bottom: '8px',
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      gap: '4px',
    },
    dot: {
      width: '6px',
      height: '6px',
      borderRadius: '50%',
      background: 'rgba(255,255,255,0.5)',
      border: 'none',
      padding: '0',
      cursor: 'pointer',
    },
    dotActive: {
      background: '#fff',
      width: '16px',
      borderRadius: '3px',
    },
    dotMore: {
      fontSize: '10px',
      color: '#fff',
    },
    content: {
      padding: '6px 8px 8px',
    },
    location: {
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      fontSize: '12px',
      fontWeight: '500',
      color: '#6B4EE6',
      margin: '0',
    },
    title: {
      margin: '2px 0',
      fontSize: '14px',
      fontWeight: '600',
      color: '#1f2937',
      lineHeight: '1.2',
      overflow: 'hidden',
      display: '-webkit-box',
      WebkitLineClamp: '2',
      WebkitBoxOrient: 'vertical',
    },
    host: {
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      margin: '2px 0',
    },
    hostAvatar: {
      width: '18px',
      height: '18px',
      borderRadius: '50%',
      objectFit: 'cover',
    },
    hostAvatarPlaceholder: {
      width: '18px',
      height: '18px',
      borderRadius: '50%',
      background: 'linear-gradient(135deg, #6B4EE6, #8B6CF5)',
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '9px',
      fontWeight: '600',
    },
    hostName: {
      fontSize: '12px',
      color: '#6b7280',
    },
    hostNameStrong: {
      color: '#1f2937',
      fontWeight: '500',
    },
    verified: {
      display: 'flex',
      alignItems: 'center',
      gap: '2px',
      fontSize: '10px',
      color: '#10B981',
      fontWeight: '500',
    },
    details: {
      fontSize: '11px',
      color: '#6b7280',
      margin: '2px 0',
    },
    pricing: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: '4px',
    },
    priceWrapper: {
      display: 'flex',
      flexDirection: 'column',
    },
    priceLabel: {
      fontSize: '10px',
      color: '#6b7280',
    },
    price: {
      fontSize: '16px',
      fontWeight: '700',
      color: '#1f2937',
    },
    pricePeriod: {
      fontSize: '12px',
      fontWeight: '400',
      color: '#6b7280',
    },
    btn: {
      padding: '6px 12px',
      borderRadius: '6px',
      fontSize: '12px',
      fontWeight: '600',
      cursor: 'pointer',
      border: 'none',
      transition: 'all 0.2s',
    },
    btnPrimary: {
      background: '#6B4EE6',
      color: '#fff',
    },
    btnSecondary: {
      background: '#f0ebff',
      color: '#6B4EE6',
    },
  };

  return (
    <article style={styles.card} onClick={handleCardClick}>
      {/* Photo Section */}
      <div style={styles.photo}>
        {!imageError && currentPhotoUrl ? (
          <img
            src={currentPhotoUrl}
            alt={listing.title || 'Listing photo'}
            style={styles.image}
            onError={() => setImageError(true)}
          />
        ) : (
          <div style={styles.placeholder}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
          </div>
        )}

        {/* Status Badge */}
        {hasProposal && (
          <div style={{ ...styles.badge, ...styles.badgeProposal }}>
            Proposal Sent
          </div>
        )}
        {!hasProposal && isNewListing && (
          <div style={{ ...styles.badge, ...styles.badgeNew }}>
            New
          </div>
        )}

        {/* Favorite Button */}
        <div style={styles.favorite}>
          <FavoriteButton
            listingId={listing.id}
            userId={userId}
            initialFavorited={true}
            onToggle={handleFavoriteToggle}
            size="medium"
            variant="overlay"
          />
        </div>

        {/* Photo Navigation Arrows */}
        {hasMultiplePhotos && (
          <div style={styles.nav} className="fcv2-nav">
            <button
              style={styles.navBtn}
              onClick={handlePrevPhoto}
              aria-label="Previous photo"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <button
              style={styles.navBtn}
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
          <div style={styles.dots}>
            {photos.slice(0, 5).map((_, index) => (
              <button
                key={index}
                style={index === currentPhotoIndex ? { ...styles.dot, ...styles.dotActive } : styles.dot}
                onClick={(e) => handleDotClick(e, index)}
                aria-label={`Go to photo ${index + 1}`}
              />
            ))}
            {photos.length > 5 && (
              <span style={styles.dotMore}>+{photos.length - 5}</span>
            )}
          </div>
        )}
      </div>

      {/* Content Section */}
      <div style={styles.content}>
        {/* Location */}
        <div style={styles.location}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <span>{listing.location || listing.neighborhood || 'New York, NY'}</span>
        </div>

        {/* Title */}
        <h3 style={styles.title}>{listing.title || 'Unnamed Listing'}</h3>

        {/* Host Info */}
        <div style={styles.host}>
          {listing.host?.image ? (
            <img
              src={listing.host.image}
              alt={listing.host.name || 'Host'}
              style={styles.hostAvatar}
            />
          ) : (
            <div style={styles.hostAvatarPlaceholder}>
              {getHostInitial()}
            </div>
          )}
          <span style={styles.hostName}>
            Hosted by <strong style={styles.hostNameStrong}>{listing.host?.name || 'Host'}</strong>
          </span>
          {listing.host?.verified && (
            <span style={styles.verified}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
              </svg>
              Verified
            </span>
          )}
        </div>

        {/* Details */}
        <div style={styles.details}>
          {formatDetails()}
        </div>

        {/* Pricing with action button */}
        <div style={styles.pricing}>
          <div style={styles.priceWrapper}>
            <span style={styles.priceLabel}>Starting at</span>
            <span style={styles.price}>
              ${listing.price?.starting || listing['Starting nightly price'] || 0}
              <span style={styles.pricePeriod}> / night</span>
            </span>
          </div>
          {hasProposal ? (
            <button
              style={{ ...styles.btn, ...styles.btnSecondary }}
              onClick={handleViewProposal}
            >
              View Proposal
            </button>
          ) : (
            <button
              style={{ ...styles.btn, ...styles.btnPrimary }}
              onClick={handleCreateProposal}
            >
              Create Proposal
            </button>
          )}
        </div>
      </div>

      {/* Minimal CSS for hover states - injected once */}
      <style>{`
        .fcv2-nav { opacity: 0 !important; }
        article:hover .fcv2-nav { opacity: 1 !important; pointer-events: auto !important; }
      `}</style>
    </article>
  );
};

export default FavoritesCardV2;
