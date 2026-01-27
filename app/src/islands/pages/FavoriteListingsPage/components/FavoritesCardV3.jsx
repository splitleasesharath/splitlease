/**
 * FavoritesCardV3 Component
 *
 * Horizontal compact card with mini-map for favorites.
 * Minimal Premium aesthetic with Apple-like elegance.
 *
 * Layout: Image (left) | Details (center) | Mini Map (right)
 * Mobile: Vertical stack, map hidden
 *
 * To switch back to V2, change USE_CARD_V3 to false in FavoriteListingsPage.jsx
 */

import { useState, useRef, useEffect, memo } from 'react';
import { useDeviceDetection } from '../../../../hooks/useDeviceDetection.js';

/**
 * Builds a Google Static Maps URL for mini-map display
 * Uses window.ENV.GOOGLE_MAPS_API_KEY (runtime config pattern)
 */
const buildStaticMapUrl = ({ lat, lng, width = 280, height = 320, zoom = 14 }) => {
  // Access API key from runtime config (window.ENV) set by config.js
  const apiKey = typeof window !== 'undefined' ? window.ENV?.GOOGLE_MAPS_API_KEY : null;
  if (!apiKey || !lat || !lng) return null;

  const markerColor = '6366F1'; // Purple without #

  return `https://maps.googleapis.com/maps/api/staticmap?`
    + `center=${lat},${lng}`
    + `&zoom=${zoom}`
    + `&size=${width}x${height}`
    + `&scale=2`
    + `&maptype=roadmap`
    + `&markers=color:0x${markerColor}|${lat},${lng}`
    + `&style=feature:poi|visibility:off`
    + `&style=feature:transit|visibility:off`
    + `&key=${apiKey}`;
};

/**
 * FavoriteButton with confirmation popup
 */
const FavoriteButton = ({ onConfirmRemove }) => {
  const [showConfirm, setShowConfirm] = useState(false);
  const popupRef = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showConfirm && popupRef.current && !popupRef.current.contains(e.target) && !buttonRef.current?.contains(e.target)) {
        setShowConfirm(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showConfirm]);

  const styles = {
    container: {
      position: 'absolute',
      top: '10px',
      right: '10px',
      zIndex: 10,
    },
    button: {
      all: 'unset',
      width: '32px',
      height: '32px',
      borderRadius: '50%',
      background: 'rgba(255,255,255,0.95)',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
      transition: 'all 0.2s ease',
    },
    popup: {
      position: 'absolute',
      top: '40px',
      right: '0',
      background: 'white',
      borderRadius: '12px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
      padding: '14px',
      minWidth: '180px',
      zIndex: 100,
    },
    popupText: {
      fontSize: '13px',
      fontWeight: 600,
      color: '#1E293B',
      marginBottom: '10px',
      textAlign: 'center',
    },
    popupButtons: {
      display: 'flex',
      gap: '8px',
    },
    cancelBtn: {
      flex: 1,
      padding: '8px 12px',
      minHeight: '40px',
      borderRadius: '8px',
      border: '1px solid #E2E8F0',
      background: 'white',
      color: '#64748B',
      fontSize: '12px',
      fontWeight: 600,
      cursor: 'pointer',
    },
    removeBtn: {
      flex: 1,
      padding: '8px 12px',
      minHeight: '40px',
      borderRadius: '8px',
      border: 'none',
      background: '#EF4444',
      color: 'white',
      fontSize: '12px',
      fontWeight: 600,
      cursor: 'pointer',
    },
  };

  return (
    <div style={styles.container}>
      <button
        ref={buttonRef}
        style={styles.button}
        onClick={(e) => { e.stopPropagation(); setShowConfirm(true); }}
        aria-label="Remove from favorites"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="#EF4444" stroke="#EF4444" strokeWidth="2">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      </button>

      {showConfirm && (
        <div ref={popupRef} style={styles.popup}>
          <div style={styles.popupText}>Remove from favorites?</div>
          <div style={styles.popupButtons}>
            <button style={styles.cancelBtn} onClick={(e) => { e.stopPropagation(); setShowConfirm(false); }}>Cancel</button>
            <button style={styles.removeBtn} onClick={(e) => { e.stopPropagation(); setShowConfirm(false); onConfirmRemove?.(); }}>Remove</button>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * FavoritesCardV3 - Horizontal compact card with mini-map
 */
const FavoritesCardV3 = ({
  listing,
  onToggleFavorite,
  onOpenCreateProposalModal,
  proposalForListing,
  onMapClick,
  userId
}) => {
  const [imageError, setImageError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [configLoaded, setConfigLoaded] = useState(!!window.ENV?.GOOGLE_MAPS_API_KEY);

  const { isMobile, isSmallMobile, isTouchDevice, isTablet } = useDeviceDetection();

  // Re-render when config.js loads window.ENV
  useEffect(() => {
    if (configLoaded) return;

    const handleConfigLoad = () => setConfigLoaded(true);
    window.addEventListener('env-config-loaded', handleConfigLoad);

    // Check if already loaded
    if (window.ENV?.GOOGLE_MAPS_API_KEY) {
      setConfigLoaded(true);
    }

    return () => window.removeEventListener('env-config-loaded', handleConfigLoad);
  }, [configLoaded]);

  const photos = listing.images || [];
  const hasProposal = !!proposalForListing;
  const coordinates = listing.coordinates;
  const hasCoordinates = coordinates?.lat && coordinates?.lng;

  // Navigate to listing page on card click
  const handleCardClick = () => {
    window.location.href = `/listing?id=${listing.id}`;
  };

  const handleCreateProposal = (e) => {
    e.stopPropagation();
    onOpenCreateProposalModal?.(listing);
  };

  const handleViewProposal = (e) => {
    e.stopPropagation();
    if (proposalForListing?._id) {
      window.location.href = `/proposal?id=${proposalForListing._id}`;
    }
  };

  const handleMapClick = (e) => {
    e.stopPropagation();
    onMapClick?.(listing);
  };

  const currentPhotoUrl = photos[0] || '';
  const mapUrl = hasCoordinates ? buildStaticMapUrl({
    lat: coordinates.lat,
    lng: coordinates.lng,
    width: 280,
    height: 320,
    zoom: 14
  }) : null;

  // Debug: Log map URL status (remove after debugging)
  useEffect(() => {
    console.log('🗺️ FavoritesCardV3 Map Debug:', {
      listingId: listing.id,
      hasCoordinates,
      coordinates,
      apiKeyExists: !!window.ENV?.GOOGLE_MAPS_API_KEY,
      configLoaded,
      mapUrl: mapUrl ? mapUrl.substring(0, 100) + '...' : null
    });
  }, [listing.id, hasCoordinates, configLoaded, mapUrl]);

  // Responsive values
  const isDesktop = !isMobile && !isTablet;
  const showMap = isDesktop || isTablet;

  const styles = {
    card: {
      all: 'unset',
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      background: '#FFFFFF',
      borderRadius: isSmallMobile ? '12px' : isMobile ? '14px' : '16px',
      border: '1px solid #E2E8F0',
      overflow: 'hidden',
      boxShadow: (isHovered && !isTouchDevice)
        ? '0 8px 24px rgba(0,0,0,0.08)'
        : '0 1px 3px rgba(0,0,0,0.04)',
      transition: isTouchDevice ? 'none' : 'all 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)',
      transform: (isHovered && !isTouchDevice) ? 'translateY(-2px)' : 'none',
      cursor: 'pointer',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      boxSizing: 'border-box',
    },

    // IMAGE SECTION (Left)
    imageSection: {
      position: 'relative',
      width: isMobile ? '100%' : isTablet ? '130px' : '140px',
      minWidth: isMobile ? '100%' : isTablet ? '130px' : '140px',
      height: isMobile ? '180px' : isTablet ? '130px' : '140px',
      overflow: 'hidden',
      flexShrink: 0,
    },
    image: {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
    },
    statusBadge: {
      position: 'absolute',
      top: '10px',
      left: '10px',
      padding: '4px 8px',
      borderRadius: '4px',
      fontSize: '10px',
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      background: '#8B5CF6',
      color: 'white',
      zIndex: 5,
    },

    // DETAILS SECTION (Center)
    detailsSection: {
      flex: 1,
      padding: isSmallMobile ? '12px' : isMobile ? '14px' : isTablet ? '14px 16px' : '16px 20px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      gap: isMobile ? '8px' : '6px',
      minWidth: 0, // Allow text truncation
    },
    location: {
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      fontSize: '11px',
      fontWeight: 600,
      color: '#6366F1',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      lineHeight: 1.2,
    },
    title: {
      fontSize: isMobile ? '14px' : '15px',
      fontWeight: 700,
      color: '#0F172A',
      lineHeight: 1.3,
      margin: 0,
      display: '-webkit-box',
      WebkitLineClamp: 2,
      WebkitBoxOrient: 'vertical',
      overflow: 'hidden',
    },
    amenities: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: '12px',
      fontWeight: 500,
      color: '#64748B',
    },
    amenityDot: {
      width: '3px',
      height: '3px',
      borderRadius: '50%',
      background: '#CBD5E1',
    },
    priceRow: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 'auto',
      gap: '12px',
    },
    price: {
      fontSize: isMobile ? '16px' : '18px',
      fontWeight: 800,
      color: '#0F172A',
    },
    pricePeriod: {
      fontSize: '12px',
      fontWeight: 400,
      color: '#64748B',
    },
    ctaButton: {
      padding: isSmallMobile ? '8px 14px' : '10px 16px',
      minHeight: '44px',
      borderRadius: '10px',
      fontSize: '13px',
      fontWeight: 700,
      cursor: 'pointer',
      border: 'none',
      transition: isTouchDevice ? 'none' : 'all 0.2s ease',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      whiteSpace: 'nowrap',
    },
    ctaPrimary: {
      background: '#6366F1',
      color: 'white',
      boxShadow: '0 2px 8px rgba(99,102,241,0.2)',
    },
    ctaSecondary: {
      background: '#EEF2FF',
      color: '#6366F1',
    },

    // MAP SECTION (Right)
    mapSection: {
      display: showMap ? 'block' : 'none',
      width: isTablet ? '120px' : '140px',
      minWidth: isTablet ? '120px' : '140px',
      height: '100%',
      position: 'relative',
      overflow: 'hidden',
      cursor: 'pointer',
      flexShrink: 0,
    },
    mapImage: {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
    },
    mapPlaceholder: {
      width: '100%',
      height: '100%',
      background: '#F1F5F9',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '4px',
    },
    mapPlaceholderText: {
      fontSize: '10px',
      color: '#94A3B8',
    },
  };

  return (
    <div
      style={styles.card}
      onClick={handleCardClick}
      onMouseEnter={() => !isTouchDevice && setIsHovered(true)}
      onMouseLeave={() => !isTouchDevice && setIsHovered(false)}
      role="article"
      aria-label={`Listing card for ${listing.title}`}
    >
      {/* IMAGE SECTION */}
      <div style={styles.imageSection}>
        <img
          src={imageError ? 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400' : currentPhotoUrl}
          alt={listing.title}
          style={styles.image}
          onError={() => setImageError(true)}
        />

        {hasProposal && <div style={styles.statusBadge}>Proposal Sent</div>}

        <FavoriteButton
          onConfirmRemove={() => onToggleFavorite?.(listing.id, listing.title, false)}
        />
      </div>

      {/* DETAILS SECTION */}
      <div style={styles.detailsSection}>
        <div>
          <div style={styles.location}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            {listing.location || 'New York, NY'}
          </div>

          <h3 style={styles.title}>{listing.title}</h3>

          <div style={styles.amenities}>
            <span>{listing.bedrooms === 0 ? 'Studio' : `${listing.bedrooms} bed`}</span>
            <span style={styles.amenityDot}></span>
            <span>{listing.bathrooms} bath</span>
            <span style={styles.amenityDot}></span>
            <span>{listing.maxGuests} guests</span>
          </div>
        </div>

        <div style={styles.priceRow}>
          <div>
            <span style={styles.price}>
              ${listing.price?.starting || listing['Starting nightly price'] || 0}
            </span>
            <span style={styles.pricePeriod}> /night</span>
          </div>

          <button
            style={{
              ...styles.ctaButton,
              ...(hasProposal ? styles.ctaSecondary : styles.ctaPrimary)
            }}
            onClick={hasProposal ? handleViewProposal : handleCreateProposal}
          >
            {hasProposal ? 'View Proposal' : 'Create Proposal'}
          </button>
        </div>
      </div>

      {/* MAP SECTION */}
      {showMap && (
        <div style={styles.mapSection} onClick={handleMapClick}>
          {mapUrl ? (
            <img
              src={mapUrl}
              alt={`Map showing location of ${listing.title}`}
              style={styles.mapImage}
              loading="lazy"
            />
          ) : (
            <div style={styles.mapPlaceholder}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span style={styles.mapPlaceholderText}>Map unavailable</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default memo(FavoritesCardV3, (prevProps, nextProps) => {
  return (
    prevProps.listing?.id === nextProps.listing?.id &&
    prevProps.proposalForListing?._id === nextProps.proposalForListing?._id &&
    prevProps.userId === nextProps.userId
  );
});
