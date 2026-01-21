/**
 * FavoritesPageV2 Component
 *
 * A completely redesigned favorites page with isolated styles.
 * All CSS is inline to avoid conflicts with other stylesheets.
 *
 * Based on the mockup at: Design/2026/Ongoing Projects/favorit listing/favorites-redesign-mockup.html
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import Header from '../../../shared/Header/Header.jsx';
import { getCurrentUser } from '../../../../lib/auth.js';
import supabase from '../../../../lib/supabase.js';
import FavoriteButton from '../../../shared/FavoriteButton/FavoriteButton.jsx';
import PhotoGalleryModal from '../../../shared/PhotoGalleryModal/PhotoGalleryModal.jsx';
import CreateProposalModal from '../../../shared/CreateProposalModal/CreateProposalModal.jsx';
import GoogleMapsWrapper from '../../../shared/GoogleMapsWrapper.jsx';
import FavoritesMap from '../FavoriteListingsPage/components/FavoritesMap.jsx';

// ============================================
// STYLES - All inline to avoid CSS conflicts
// ============================================
const styles = {
  // Page container
  page: {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    background: '#FAFBFC',
    color: '#1a1a2e',
    lineHeight: 1.5,
    minHeight: '100vh',
  },

  // Page header section
  pageHeader: {
    background: 'white',
    borderBottom: '1px solid #E8ECF0',
    padding: '24px',
  },
  pageHeaderInner: {
    maxWidth: '1400px',
    margin: '0 auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pageTitleSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  pageTitle: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#1a1a2e',
    margin: 0,
  },
  favoritesCount: {
    background: '#F0EBFF',
    color: '#6B4EE6',
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '14px',
    fontWeight: 600,
  },

  // Main content layout
  mainContent: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '24px',
    display: 'grid',
    gridTemplateColumns: '1fr 400px',
    gap: '24px',
    minHeight: 'calc(100vh - 160px)',
  },
  mainContentNoMap: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '24px',
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '24px',
  },

  // Listings section
  listingsSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  listingsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '20px',
  },

  // Listing card
  card: {
    background: 'white',
    borderRadius: '16px',
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    transition: 'all 0.3s ease',
    cursor: 'pointer',
  },
  cardHover: {
    boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
    transform: 'translateY(-4px)',
  },

  // Card image section
  cardImageSection: {
    position: 'relative',
    height: '200px',
    overflow: 'hidden',
    background: '#f3f4f6',
  },
  cardImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transition: 'transform 0.3s ease',
  },
  cardImageHover: {
    transform: 'scale(1.03)',
  },

  // Favorite button
  favoriteBtn: {
    position: 'absolute',
    top: '12px',
    right: '12px',
    zIndex: 2,
  },

  // Photo dots
  photoDots: {
    position: 'absolute',
    bottom: '12px',
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
    cursor: 'pointer',
    transition: 'all 0.2s',
    border: 'none',
    padding: 0,
  },
  photoDotActive: {
    background: 'white',
    width: '18px',
    borderRadius: '3px',
  },

  // Status badge
  statusBadge: {
    position: 'absolute',
    top: '12px',
    left: '12px',
    padding: '6px 10px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  statusBadgeProposal: {
    background: 'linear-gradient(135deg, #6B4EE6 0%, #8B6CF5 100%)',
    color: 'white',
  },
  statusBadgeNew: {
    background: '#10B981',
    color: 'white',
  },

  // Card content
  cardContent: {
    padding: '16px',
  },
  cardLocation: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
    color: '#6B4EE6',
    fontWeight: 500,
    marginBottom: '6px',
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#1a1a2e',
    marginBottom: '8px',
    lineHeight: 1.3,
    margin: '0 0 8px 0',
  },
  cardDetails: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '13px',
    color: '#64748B',
    marginBottom: '12px',
  },
  detailDivider: {
    width: '3px',
    height: '3px',
    borderRadius: '50%',
    background: '#CBD5E1',
  },

  // Host badge
  hostBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px',
  },
  hostAvatarSmall: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #6B4EE6 0%, #8B6CF5 100%)',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '11px',
    fontWeight: 600,
  },
  hostNameSmall: {
    fontSize: '13px',
    color: '#64748B',
  },
  hostNameStrong: {
    color: '#1a1a2e',
    fontWeight: 500,
  },
  verifiedBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '11px',
    color: '#10B981',
    fontWeight: 500,
  },

  // Pricing section
  cardPricing: {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingTop: '12px',
    borderTop: '1px solid #F1F5F9',
  },
  priceLabel: {
    fontSize: '12px',
    color: '#64748B',
    marginBottom: '2px',
  },
  priceValue: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#1a1a2e',
  },
  pricePeriod: {
    fontSize: '13px',
    fontWeight: 400,
    color: '#64748B',
  },
  cardAction: {
    padding: '10px 18px',
    borderRadius: '10px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
    border: 'none',
  },
  cardActionPrimary: {
    background: '#6B4EE6',
    color: 'white',
  },
  cardActionSecondary: {
    background: '#F0EBFF',
    color: '#6B4EE6',
  },

  // Map section
  mapSection: {
    position: 'sticky',
    top: '88px',
    height: 'calc(100vh - 112px)',
    background: 'white',
    borderRadius: '16px',
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  },

  // Empty state
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 40px',
    textAlign: 'center',
    background: 'white',
    borderRadius: '16px',
    minHeight: '400px',
  },
  emptyStateIcon: {
    width: '80px',
    height: '80px',
    background: '#F0EBFF',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '24px',
  },
  emptyStateTitle: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#1a1a2e',
    marginBottom: '8px',
  },
  emptyStateText: {
    fontSize: '15px',
    color: '#64748B',
    maxWidth: '320px',
    marginBottom: '24px',
    lineHeight: 1.6,
  },
  emptyStateCta: {
    padding: '12px 28px',
    background: '#6B4EE6',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
  },

  // Loading skeleton
  skeletonCard: {
    background: 'white',
    borderRadius: '16px',
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  },
  skeletonImage: {
    height: '200px',
    background: 'linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s infinite',
  },
  skeletonContent: {
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  skeletonLine: {
    height: '12px',
    background: 'linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s infinite',
    borderRadius: '4px',
  },

  // Toast notification
  toast: {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    padding: '14px 20px',
    background: '#1a1a2e',
    color: 'white',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: 500,
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
    zIndex: 1000,
    transform: 'translateY(20px)',
    opacity: 0,
    transition: 'all 0.3s ease',
  },
  toastShow: {
    transform: 'translateY(0)',
    opacity: 1,
  },
  toastSuccess: {
    background: '#10B981',
  },
  toastInfo: {
    background: '#6B4EE6',
  },

  // Mobile map toggle
  mobileMapToggle: {
    display: 'none',
    position: 'fixed',
    bottom: '24px',
    left: '50%',
    transform: 'translateX(-50%)',
    padding: '12px 24px',
    background: '#1a1a2e',
    color: 'white',
    border: 'none',
    borderRadius: '24px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    zIndex: 100,
    boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
    alignItems: 'center',
    gap: '8px',
  },

  // Photo navigation arrows
  photoNav: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 8px',
    opacity: 0,
    transition: 'opacity 0.2s',
    pointerEvents: 'none',
  },
  photoNavVisible: {
    opacity: 1,
    pointerEvents: 'auto',
  },
  photoNavBtn: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.9)',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#374151',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    transition: 'all 0.2s',
  },

  // Image placeholder
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#9ca3af',
    background: '#f3f4f6',
  },
};

// ============================================
// LISTING CARD COMPONENT
// ============================================
const ListingCard = ({
  listing,
  proposalForListing,
  userId,
  onToggleFavorite,
  onPhotoClick,
  onCreateProposal,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [imageError, setImageError] = useState(false);

  const photos = listing.images || [];
  const hasMultiplePhotos = photos.length > 1;
  const hasProposal = !!proposalForListing;
  const isNewListing = listing.isNew;
  const currentPhotoUrl = photos[currentPhotoIndex] || '';

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

  const handleCardClick = () => {
    if (onPhotoClick && photos.length > 0) {
      onPhotoClick(listing, currentPhotoIndex);
    }
  };

  const handleCreateProposal = (e) => {
    e.stopPropagation();
    if (onCreateProposal) {
      onCreateProposal(listing);
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
    return parts;
  };

  const getHostInitial = () => {
    const name = listing.host?.name || 'H';
    return name.charAt(0).toUpperCase();
  };

  const cardStyle = {
    ...styles.card,
    ...(isHovered ? styles.cardHover : {}),
  };

  const imageStyle = {
    ...styles.cardImage,
    ...(isHovered ? styles.cardImageHover : {}),
  };

  return (
    <article
      style={cardStyle}
      onClick={handleCardClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Photo Section */}
      <div style={styles.cardImageSection}>
        {!imageError && currentPhotoUrl ? (
          <img
            src={currentPhotoUrl}
            alt={listing.title || 'Listing photo'}
            style={imageStyle}
            onError={() => setImageError(true)}
          />
        ) : (
          <div style={styles.imagePlaceholder}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
          </div>
        )}

        {/* Status Badge */}
        {hasProposal && (
          <div style={{ ...styles.statusBadge, ...styles.statusBadgeProposal }}>
            Proposal Sent
          </div>
        )}
        {!hasProposal && isNewListing && (
          <div style={{ ...styles.statusBadge, ...styles.statusBadgeNew }}>
            New
          </div>
        )}

        {/* Favorite Button */}
        <div style={styles.favoriteBtn}>
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
          <div style={{ ...styles.photoNav, ...(isHovered ? styles.photoNavVisible : {}) }}>
            <button
              style={styles.photoNavBtn}
              onClick={handlePrevPhoto}
              aria-label="Previous photo"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <button
              style={styles.photoNavBtn}
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
          <div style={styles.photoDots}>
            {photos.slice(0, 5).map((_, index) => (
              <button
                key={index}
                style={index === currentPhotoIndex ? { ...styles.photoDot, ...styles.photoDotActive } : styles.photoDot}
                onClick={(e) => handleDotClick(e, index)}
                aria-label={`Go to photo ${index + 1}`}
              />
            ))}
            {photos.length > 5 && (
              <span style={{ fontSize: '10px', color: 'white' }}>+{photos.length - 5}</span>
            )}
          </div>
        )}
      </div>

      {/* Content Section */}
      <div style={styles.cardContent}>
        {/* Location */}
        <div style={styles.cardLocation}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <span>{listing.location || listing.neighborhood || 'New York, NY'}</span>
        </div>

        {/* Title */}
        <h3 style={styles.cardTitle}>{listing.title || 'Unnamed Listing'}</h3>

        {/* Host Info */}
        <div style={styles.hostBadge}>
          {listing.host?.image ? (
            <img
              src={listing.host.image}
              alt={listing.host.name || 'Host'}
              style={{ ...styles.hostAvatarSmall, background: 'transparent' }}
            />
          ) : (
            <div style={styles.hostAvatarSmall}>
              {getHostInitial()}
            </div>
          )}
          <span style={styles.hostNameSmall}>
            Hosted by <strong style={styles.hostNameStrong}>{listing.host?.name || 'Host'}</strong>
          </span>
          {listing.host?.verified && (
            <span style={styles.verifiedBadge}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
              </svg>
              Verified
            </span>
          )}
        </div>

        {/* Details */}
        <div style={styles.cardDetails}>
          {formatDetails().map((detail, index) => (
            <span key={index}>
              {index > 0 && <span style={styles.detailDivider}></span>}
              {detail}
            </span>
          ))}
        </div>

        {/* Pricing */}
        <div style={styles.cardPricing}>
          <div>
            <div style={styles.priceLabel}>Starting at</div>
            <div style={styles.priceValue}>
              ${listing.price?.starting || listing['Starting nightly price'] || 0}
              <span style={styles.pricePeriod}> / night</span>
            </div>
          </div>
          {hasProposal ? (
            <button
              style={{ ...styles.cardAction, ...styles.cardActionSecondary }}
              onClick={handleViewProposal}
            >
              View Proposal
            </button>
          ) : (
            <button
              style={{ ...styles.cardAction, ...styles.cardActionPrimary }}
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

// ============================================
// LOADING SKELETON COMPONENT
// ============================================
const LoadingSkeleton = () => (
  <div style={styles.listingsGrid}>
    {[1, 2, 3, 4].map((i) => (
      <div key={i} style={styles.skeletonCard}>
        <div style={styles.skeletonImage} />
        <div style={styles.skeletonContent}>
          <div style={{ ...styles.skeletonLine, width: '40%' }} />
          <div style={{ ...styles.skeletonLine, width: '80%', height: '14px' }} />
          <div style={{ ...styles.skeletonLine, width: '60%' }} />
          <div style={{ ...styles.skeletonLine, width: '30%', height: '16px', marginTop: '4px' }} />
        </div>
      </div>
    ))}
    <style>{`
      @keyframes shimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }
    `}</style>
  </div>
);

// ============================================
// EMPTY STATE COMPONENT
// ============================================
const EmptyState = () => (
  <div style={styles.emptyState}>
    <div style={styles.emptyStateIcon}>
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#6B4EE6" strokeWidth="2">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    </div>
    <h3 style={styles.emptyStateTitle}>No favorites yet</h3>
    <p style={styles.emptyStateText}>
      Start exploring and save your favorite listings to see them here.
    </p>
    <a href="/search" style={styles.emptyStateCta}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8" />
        <path d="M21 21l-4.35-4.35" />
      </svg>
      Explore Rentals
    </a>
  </div>
);

// ============================================
// TOAST COMPONENT
// ============================================
const Toast = ({ message, type = 'info', show }) => {
  const toastStyle = {
    ...styles.toast,
    ...(show ? styles.toastShow : {}),
    ...(type === 'success' ? styles.toastSuccess : {}),
    ...(type === 'info' ? styles.toastInfo : {}),
  };

  return (
    <div style={toastStyle}>
      {type === 'success' && (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      )}
      {message}
    </div>
  );
};

// ============================================
// MAIN PAGE COMPONENT
// ============================================
const FavoritesPageV2 = () => {
  // State
  const [user, setUser] = useState(null);
  const [listings, setListings] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'info' });
  const [showMobileMap, setShowMobileMap] = useState(false);
  const [selectedListing, setSelectedListing] = useState(null);
  const [galleryModal, setGalleryModal] = useState({ isOpen: false, listing: null, startIndex: 0 });
  const [proposalModal, setProposalModal] = useState({ isOpen: false, listing: null });
  const [isMobile, setIsMobile] = useState(false);

  // Check for mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fetch user and data on mount
  useEffect(() => {
    const initPage = async () => {
      try {
        const currentUser = await getCurrentUser();
        if (!currentUser) {
          window.location.href = '/search?login=true&redirect=/favorite-listings-v2';
          return;
        }
        setUser(currentUser);
        await fetchFavorites(currentUser.id);
      } catch (err) {
        console.error('Error initializing page:', err);
        setError('Failed to load favorites');
        setIsLoading(false);
      }
    };
    initPage();
  }, []);

  // Fetch favorites from Supabase
  const fetchFavorites = async (userId) => {
    try {
      setIsLoading(true);

      // Fetch favorites with listing data
      const { data: favorites, error: favError } = await supabase
        .from('favorites')
        .select('listing_id')
        .eq('user_id', userId);

      if (favError) throw favError;

      if (!favorites || favorites.length === 0) {
        setListings([]);
        setIsLoading(false);
        return;
      }

      const listingIds = favorites.map(f => f.listing_id);

      // Fetch listing details from Bubble proxy
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bubble-proxy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'getListings',
          payload: { ids: listingIds }
        })
      });

      if (!response.ok) throw new Error('Failed to fetch listings');

      const listingsData = await response.json();
      setListings(listingsData.listings || []);

      // Fetch user's proposals
      const { data: proposalsData, error: propError } = await supabase
        .from('proposal')
        .select('*')
        .eq('guest_id', userId);

      if (!propError && proposalsData) {
        setProposals(proposalsData);
      }
    } catch (err) {
      console.error('Error fetching favorites:', err);
      setError('Failed to load favorites');
    } finally {
      setIsLoading(false);
    }
  };

  // Get proposal for a specific listing
  const getProposalForListing = useCallback((listingId) => {
    return proposals.find(p => p.listing_id === listingId);
  }, [proposals]);

  // Handle favorite toggle
  const handleToggleFavorite = useCallback(async (listingId, listingTitle, newState) => {
    if (!newState) {
      // Remove from favorites
      setListings(prev => prev.filter(l => l.id !== listingId));
      showToast(`Removed "${listingTitle}" from favorites`, 'success');

      // Update in database
      try {
        await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('listing_id', listingId);
      } catch (err) {
        console.error('Error removing favorite:', err);
      }
    }
  }, [user]);

  // Show toast notification
  const showToast = (message, type = 'info') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'info' }), 3000);
  };

  // Handle photo click - open gallery
  const handlePhotoClick = (listing, startIndex) => {
    setGalleryModal({ isOpen: true, listing, startIndex });
  };

  // Handle create proposal
  const handleCreateProposal = (listing) => {
    setProposalModal({ isOpen: true, listing });
  };

  // Handle listing hover (for map)
  const handleListingHover = (listing) => {
    setSelectedListing(listing);
  };

  // Memoized content style based on mobile state
  const contentStyle = useMemo(() => {
    return isMobile ? styles.mainContentNoMap : styles.mainContent;
  }, [isMobile]);

  return (
    <div style={styles.page}>
      {/* Header */}
      <Header />

      {/* Page Header */}
      <div style={styles.pageHeader}>
        <div style={styles.pageHeaderInner}>
          <div style={styles.pageTitleSection}>
            <h1 style={styles.pageTitle}>My Favorites</h1>
            <span style={styles.favoritesCount}>
              {listings.length} saved
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main style={contentStyle}>
        {/* Listings Section */}
        <section style={styles.listingsSection}>
          {isLoading ? (
            <LoadingSkeleton />
          ) : error ? (
            <div style={styles.emptyState}>
              <h3 style={styles.emptyStateTitle}>Something went wrong</h3>
              <p style={styles.emptyStateText}>{error}</p>
              <button
                style={styles.emptyStateCta}
                onClick={() => user && fetchFavorites(user.id)}
              >
                Try Again
              </button>
            </div>
          ) : listings.length === 0 ? (
            <EmptyState />
          ) : (
            <div style={styles.listingsGrid}>
              {listings.map((listing) => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  proposalForListing={getProposalForListing(listing.id)}
                  userId={user?.id}
                  onToggleFavorite={handleToggleFavorite}
                  onPhotoClick={handlePhotoClick}
                  onCreateProposal={handleCreateProposal}
                />
              ))}
            </div>
          )}
        </section>

        {/* Map Section (desktop only) */}
        {!isMobile && (
          <aside style={styles.mapSection}>
            <GoogleMapsWrapper>
              <FavoritesMap
                listings={listings}
                selectedListing={selectedListing}
                onMarkerClick={(listing) => handlePhotoClick(listing, 0)}
              />
            </GoogleMapsWrapper>
          </aside>
        )}
      </main>

      {/* Mobile Map Toggle */}
      {isMobile && listings.length > 0 && (
        <button
          style={{ ...styles.mobileMapToggle, display: 'flex' }}
          onClick={() => setShowMobileMap(true)}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M9 3v18M15 3v18M3 9h18M3 15h18" />
          </svg>
          Show Map
        </button>
      )}

      {/* Mobile Map Modal */}
      {showMobileMap && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 3000,
          background: 'white',
          display: 'flex',
          flexDirection: 'column',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            padding: '16px',
            borderBottom: '1px solid #E8ECF0',
          }}>
            <button
              onClick={() => setShowMobileMap(false)}
              style={{
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#f3f4f6',
                border: 'none',
                borderRadius: '50%',
                cursor: 'pointer',
                marginRight: '12px',
              }}
            >
              ←
            </button>
            <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>
              {listings.length} Favorites
            </h2>
          </div>
          <div style={{ flex: 1, position: 'relative' }}>
            <GoogleMapsWrapper>
              <FavoritesMap
                listings={listings}
                selectedListing={selectedListing}
                onMarkerClick={(listing) => {
                  setShowMobileMap(false);
                  handlePhotoClick(listing, 0);
                }}
              />
            </GoogleMapsWrapper>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      <Toast message={toast.message} type={toast.type} show={toast.show} />

      {/* Photo Gallery Modal */}
      {galleryModal.isOpen && (
        <PhotoGalleryModal
          isOpen={galleryModal.isOpen}
          onClose={() => setGalleryModal({ isOpen: false, listing: null, startIndex: 0 })}
          listing={galleryModal.listing}
          startIndex={galleryModal.startIndex}
        />
      )}

      {/* Create Proposal Modal */}
      {proposalModal.isOpen && (
        <CreateProposalModal
          isOpen={proposalModal.isOpen}
          onClose={() => setProposalModal({ isOpen: false, listing: null })}
          listing={proposalModal.listing}
          userId={user?.id}
          onSuccess={(proposal) => {
            setProposals(prev => [...prev, proposal]);
            showToast('Proposal created successfully!', 'success');
            setProposalModal({ isOpen: false, listing: null });
          }}
        />
      )}
    </div>
  );
};

export default FavoritesPageV2;
