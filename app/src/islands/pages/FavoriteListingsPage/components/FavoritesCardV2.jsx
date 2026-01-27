/**
 * FavoritesCardV2 Component
 *
 * Matches the exact visual style of the mockup (Image 2).
 * Refined heart button, host section, and button styles.
 */

import { useState, useRef, useEffect, memo } from 'react';
import { useDeviceDetection } from '../../../../hooks/useDeviceDetection.js';

/**
 * FavoriteButtonWithConfirm - Favorite button with confirmation popup
 * Shows "Are you sure?" popup before removing from favorites
 */
const FavoriteButtonWithConfirm = ({ listingId, userId, onConfirmRemove }) => {
  const [showConfirm, setShowConfirm] = useState(false);
  const popupRef = useRef(null);
  const buttonRef = useRef(null);

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showConfirm && popupRef.current && !popupRef.current.contains(e.target) && !buttonRef.current.contains(e.target)) {
        setShowConfirm(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showConfirm]);

  const handleButtonClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowConfirm(true);
  };

  const handleConfirm = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowConfirm(false);
    if (onConfirmRemove) {
      onConfirmRemove();
    }
  };

  const handleCancel = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowConfirm(false);
  };

  const styles = {
    container: {
      position: 'absolute',
      top: '16px',
      right: '16px',
      zIndex: 10,
    },
    button: {
      all: 'unset', // Reset ALL inherited/global styles
      width: '40px',
      height: '40px',
      borderRadius: '50%',
      background: 'white',
      border: 'none',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '0', // Explicitly override global button padding
      boxSizing: 'border-box',
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      transition: 'transform 0.2s',
    },
    popup: {
      position: 'absolute',
      top: '48px',
      right: '0',
      background: 'white',
      borderRadius: '12px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
      padding: '16px',
      minWidth: '200px',
      zIndex: 100,
    },
    popupText: {
      fontSize: '14px',
      fontWeight: 600,
      color: '#1E293B',
      marginBottom: '12px',
      textAlign: 'center',
    },
    popupButtons: {
      display: 'flex',
      gap: '8px',
    },
    cancelBtn: {
      flex: 1,
      padding: '10px 12px',
      minHeight: '44px',
      borderRadius: '8px',
      border: '1px solid #E2E8F0',
      background: 'white',
      color: '#64748B',
      fontSize: '13px',
      fontWeight: 600,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    removeBtn: {
      flex: 1,
      padding: '10px 12px',
      minHeight: '44px',
      borderRadius: '8px',
      border: 'none',
      background: '#EF4444',
      color: 'white',
      fontSize: '13px',
      fontWeight: 600,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
  };

  return (
    <div style={styles.container}>
      <button
        ref={buttonRef}
        style={styles.button}
        onClick={handleButtonClick}
        aria-label="Remove from favorites"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#EF4444" stroke="#EF4444" strokeWidth="2">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      </button>

      {showConfirm && (
        <div ref={popupRef} style={styles.popup}>
          <div style={styles.popupText}>Remove from favorites?</div>
          <div style={styles.popupButtons}>
            <button style={styles.cancelBtn} onClick={handleCancel}>Cancel</button>
            <button style={styles.removeBtn} onClick={handleConfirm}>Remove</button>
          </div>
        </div>
      )}
    </div>
  );
};

const FavoritesCardV2 = ({
  listing,
  onToggleFavorite,
  onOpenCreateProposalModal,
  onPhotoClick,
  proposalForListing,
  viewMode = 'grid',
  userId
}) => {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [imageError, setImageError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const isGrid = viewMode === 'grid';
  const photos = listing.images || [];
  const hasMultiplePhotos = photos.length > 1;
  const hasProposal = !!proposalForListing;
  const isNewListing = listing.isNew;

  // Responsive design hook
  const { isMobile, isSmallMobile, isTouchDevice } = useDeviceDetection();

  const handleCardClick = () => {
    if (onPhotoClick && photos.length > 0) {
      onPhotoClick(listing, currentPhotoIndex);
    }
  };

  const handleCreateProposal = (e) => {
    e.stopPropagation();
    if (onOpenCreateProposalModal) onOpenCreateProposalModal(listing);
  };

  const handleViewProposal = (e) => {
    e.stopPropagation();
    if (proposalForListing?._id) {
      window.location.href = `/proposal?id=${proposalForListing._id}`;
    }
  };


  const getHostInitial = () => {
    const name = listing.host?.name || 'H';
    return name.charAt(0).toUpperCase();
  };

  const currentPhotoUrl = photos[currentPhotoIndex] || '';

  // STYLES TO MATCH IMAGE 2
  const styles = {
    card: {
      all: 'unset', // RESET EVERYTHING
      display: isGrid ? 'block' : 'flex',
      background: 'white',
      borderRadius: isSmallMobile ? '16px' : isMobile ? '20px' : '24px',
      overflow: 'hidden',
      boxShadow: (isHovered && !isTouchDevice)
        ? '0 20px 40px rgba(0,0,0,0.08)'
        : '0 4px 12px rgba(0,0,0,0.03)',
      transition: isTouchDevice ? 'none' : 'all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1)',
      cursor: 'pointer',
      flexDirection: isGrid ? 'column' : 'row',
      transform: (isHovered && !isTouchDevice) ? 'translateY(-8px)' : 'none',
      fontFamily: "'Inter', sans-serif",
      border: '1px solid #D1D5DB',
      padding: 0,
      margin: 0,
      boxSizing: 'border-box',
    },
    imageSection: {
      position: 'relative',
      height: isGrid
        ? (isSmallMobile ? '160px' : isMobile ? '180px' : '240px')
        : 'auto',
      width: isGrid ? '100%' : (isMobile ? '200px' : '280px'),
      minWidth: isGrid ? 'auto' : (isMobile ? '200px' : '280px'),
      overflow: 'hidden',
    },
    image: {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
    },
    statusBadge: {
      position: 'absolute',
      top: '16px',
      left: '16px',
      padding: '6px 12px',
      borderRadius: '8px',
      fontSize: '11px',
      fontWeight: 700,
      textTransform: 'uppercase',
      zIndex: 1,
    },
    badgeProposal: {
      background: '#8B5CF6',
      color: 'white',
    },
    badgeNew: {
      background: '#10B981',
      color: 'white',
    },
    photoDots: {
      position: 'absolute',
      bottom: '16px',
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      gap: '6px',
    },
    photoDot: {
      width: '6px',
      height: '6px',
      borderRadius: '50%',
      background: 'rgba(255,255,255,0.5)',
    },
    photoDotActive: {
      background: 'white',
      width: '16px',
      borderRadius: '4px',
    },
    cardContent: {
      padding: isSmallMobile ? '12px' : isMobile ? '16px' : '24px',
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      gap: isSmallMobile ? '8px' : isMobile ? '10px' : '12px',
    },
    cardLocation: {
      display: 'flex',
      alignItems: 'center',
      gap: isMobile ? '4px' : '6px',
      fontSize: isSmallMobile ? '11px' : isMobile ? '12px' : '13px',
      color: '#6366F1',
      fontWeight: 600,
    },
    cardTitle: {
      fontSize: isSmallMobile ? '15px' : isMobile ? '16px' : '18px',
      fontWeight: 700,
      color: '#0F172A',
      margin: 0,
      lineHeight: 1.4,
    },
    hostBadge: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      margin: '4px 0',
    },
    hostAvatar: {
      width: isSmallMobile ? '28px' : '32px',
      height: isSmallMobile ? '28px' : '32px',
      borderRadius: '50%',
      background: '#6366F1',
      color: 'white',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: isSmallMobile ? '10px' : '12px',
      fontWeight: 700,
    },
    hostName: {
      fontSize: '14px',
      color: '#64748B',
    },
    hostNameStrong: {
      color: '#1E293B',
      fontWeight: 600,
    },
    verifiedBadge: {
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      fontSize: '12px',
      color: '#10B981',
      fontWeight: 600,
      marginLeft: '4px',
    },
    cardDetails: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      fontSize: '14px',
      color: '#94A3B8',
      fontWeight: 500,
    },
    detailDivider: {
      width: '4px',
      height: '4px',
      borderRadius: '50%',
      background: '#CBD5E1',
    },
    pricingFooter: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: '20px',
      marginTop: 'auto',
      borderTop: '1px solid #D1D5DB',
    },
    priceLabel: {
      fontSize: '12px',
      color: '#94A3B8',
      fontWeight: 500,
    },
    priceValue: {
      fontSize: isSmallMobile ? '18px' : isMobile ? '20px' : '22px',
      fontWeight: 800,
      color: '#0F172A',
    },
    pricePeriod: {
      fontSize: '14px',
      fontWeight: 400,
      color: '#64748B',
    },
    actionBtn: {
      padding: isSmallMobile ? '12px 20px' : isMobile ? '14px 24px' : '14px 28px',
      minHeight: '44px', // Touch target accessibility
      borderRadius: isSmallMobile ? '10px' : '12px',
      fontSize: isSmallMobile ? '13px' : '14px',
      fontWeight: 700,
      cursor: 'pointer',
      transition: isTouchDevice ? 'none' : 'all 0.2s ease',
      border: 'none',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionBtnPrimary: {
      background: '#6366F1',
      color: 'white',
      boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)',
    },
    actionBtnSecondary: {
      background: '#EEF2FF',
      color: '#6366F1',
    },
  };

  return (
    <div
      className="favorites-card-wrapper"
      style={styles.card}
      onClick={handleCardClick}
      onMouseEnter={() => !isTouchDevice && setIsHovered(true)}
      onMouseLeave={() => !isTouchDevice && setIsHovered(false)}
    >
      <div style={styles.imageSection}>
        <img
          src={imageError ? 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800' : currentPhotoUrl}
          alt={listing.title}
          style={styles.image}
          onError={() => setImageError(true)}
        />
        
        {hasProposal && <div style={{ ...styles.statusBadge, ...styles.badgeProposal }}>Proposal Sent</div>}
        {!hasProposal && isNewListing && <div style={{ ...styles.statusBadge, ...styles.badgeNew }}>New</div>}

        <FavoriteButtonWithConfirm
          listingId={listing.id}
          userId={userId}
          onConfirmRemove={() => {
            if (onToggleFavorite) {
              onToggleFavorite(listing.id, listing.title, false);
            }
          }}
        />

        {hasMultiplePhotos && (
          <div style={styles.photoDots}>
            {photos.slice(0, 4).map((_, i) => (
              <span key={i} style={{ ...styles.photoDot, ...(i === currentPhotoIndex ? styles.photoDotActive : {}) }} />
            ))}
          </div>
        )}
      </div>

      <div style={styles.cardContent}>
        <div style={styles.cardLocation}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
          </svg>
          {listing.location || 'New York, NY'}
        </div>

        <h3 style={styles.cardTitle}>{listing.title}</h3>

        <div style={styles.hostBadge}>
          <div style={styles.hostAvatar}>
            {listing.host?.image ? <img src={listing.host.image} style={{ width: '100%', height: '100%', borderRadius: '50%' }} /> : getHostInitial()}
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={styles.hostName}>Hosted by <strong style={styles.hostNameStrong}>{listing.host?.name || 'Host'}</strong></span>
            {listing.host?.verified && (
              <div style={styles.verifiedBadge}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" /></svg>
                Verified
              </div>
            )}
          </div>
        </div>

        <div style={styles.cardDetails}>
          <span>{listing.bedrooms === 0 ? 'Studio' : `${listing.bedrooms} bed`}</span>
          <span style={styles.detailDivider}></span>
          <span>{listing.bathrooms} bath</span>
          <span style={styles.detailDivider}></span>
          <span>{listing.maxGuests} guests</span>
        </div>

        <div style={styles.pricingFooter}>
          <div>
            <div style={styles.priceLabel}>Starting at</div>
            <div style={styles.priceValue}>
              ${listing.price?.starting || listing['Starting nightly price'] || 0} <span style={styles.pricePeriod}>/ night</span>
            </div>
          </div>
          
          <button
            style={{ ...styles.actionBtn, ...(hasProposal ? styles.actionBtnSecondary : styles.actionBtnPrimary) }}
            onClick={hasProposal ? handleViewProposal : handleCreateProposal}
          >
            {hasProposal ? 'View Proposal' : 'Create Proposal'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default memo(FavoritesCardV2, (prevProps, nextProps) => {
  // Custom comparison - only re-render if these props change
  return (
    prevProps.listing?.id === nextProps.listing?.id &&
    prevProps.proposalForListing?._id === nextProps.proposalForListing?._id &&
    prevProps.viewMode === nextProps.viewMode &&
    prevProps.userId === nextProps.userId
  );
});
