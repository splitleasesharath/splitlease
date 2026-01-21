/**
 * FavoritesCardV2 Component
 *
 * Matches the exact visual style of the mockup (Image 2).
 * Refined heart button, host section, and button styles.
 */

import { useState } from 'react';
import FavoriteButton from '../../../shared/FavoriteButton/FavoriteButton.jsx';

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
      borderRadius: '24px',
      overflow: 'hidden',
      boxShadow: isHovered ? '0 20px 40px rgba(0,0,0,0.08)' : '0 4px 12px rgba(0,0,0,0.03)',
      transition: 'all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1)',
      cursor: 'pointer',
      flexDirection: isGrid ? 'column' : 'row',
      transform: isHovered ? 'translateY(-8px)' : 'none',
      fontFamily: "'Inter', sans-serif",
      border: '1px solid #F1F5F9',
      padding: 0,
      margin: 0,
      boxSizing: 'border-box',
    },
    imageSection: {
      position: 'relative',
      height: isGrid ? '240px' : 'auto',
      width: isGrid ? '100%' : '280px',
      minWidth: isGrid ? 'auto' : '280px',
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
      padding: '24px',
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
    },
    cardLocation: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      fontSize: '13px',
      color: '#6366F1',
      fontWeight: 600,
    },
    cardTitle: {
      fontSize: '18px',
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
      width: '32px',
      height: '32px',
      borderRadius: '50%',
      background: '#6366F1',
      color: 'white',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '12px',
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
      borderTop: '1px solid #F1F5F9',
    },
    priceLabel: {
      fontSize: '12px',
      color: '#94A3B8',
      fontWeight: 500,
    },
    priceValue: {
      fontSize: '22px',
      fontWeight: 800,
      color: '#0F172A',
    },
    pricePeriod: {
      fontSize: '14px',
      fontWeight: 400,
      color: '#64748B',
    },
    actionBtn: {
      padding: '12px 24px',
      borderRadius: '12px',
      fontSize: '14px',
      fontWeight: 700,
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      border: 'none',
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
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
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

        <FavoriteButton
          listingId={listing.id}
          userId={userId}
          initialFavorited={true}
          onToggle={(newState) => {
            if (onToggleFavorite) {
              onToggleFavorite(listing.id, listing.title, newState);
            }
          }}
          size="medium"
          variant="overlay"
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

export default FavoritesCardV2;
