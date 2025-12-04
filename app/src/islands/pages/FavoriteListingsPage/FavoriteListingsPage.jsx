/**
 * FavoriteListingsPage Component
 * Displays user's favorited listings with same layout/style as SearchPage
 * Includes Google Map with pins and AuthAwareSearchScheduleSelector
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import GoogleMap from '../../shared/GoogleMap.jsx';
import AuthAwareSearchScheduleSelector from '../../shared/AuthAwareSearchScheduleSelector.jsx';
import ContactHostMessaging from '../../shared/ContactHostMessaging.jsx';
import InformationalText from '../../shared/InformationalText.jsx';
import LoggedInAvatar from '../../shared/LoggedInAvatar/LoggedInAvatar.jsx';
import EmptyState from './components/EmptyState';
import { getFavoritedListings, removeFromFavorites } from './favoritesApi';
import { checkAuthStatus, getSessionId, validateTokenAndFetchUser, getUserId, logoutUser } from '../../../lib/auth';
import { supabase } from '../../../lib/supabase.js';
import { getNeighborhoodName, getBoroughName, getPropertyTypeLabel, initializeLookups, isInitialized } from '../../../lib/dataLookups.js';
import { fetchPhotoUrls, extractPhotos, fetchHostData, parseAmenities } from '../../../lib/supabaseUtils.js';
import './FavoriteListingsPage.css';

/**
 * PropertyCard - Individual listing card (matches SearchPage PropertyCard)
 */
function PropertyCard({ listing, onLocationClick, onOpenContactModal, onOpenInfoModal, isLoggedIn, isFavorited, onToggleFavorite }) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const priceInfoTriggerRef = useRef(null);

  const hasImages = listing.images && listing.images.length > 0;
  const hasMultipleImages = listing.images && listing.images.length > 1;

  // Format host name to show "FirstName L."
  const formatHostName = (fullName) => {
    if (!fullName || fullName === 'Host') return 'Host';

    const nameParts = fullName.trim().split(/\s+/);
    if (nameParts.length === 1) return nameParts[0];

    const firstName = nameParts[0];
    const lastInitial = nameParts[nameParts.length - 1].charAt(0).toUpperCase();

    return `${firstName} ${lastInitial}.`;
  };

  const handlePrevImage = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!hasMultipleImages) return;
    setCurrentImageIndex((prev) =>
      prev === 0 ? listing.images.length - 1 : prev - 1
    );
  };

  const handleNextImage = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!hasMultipleImages) return;
    setCurrentImageIndex((prev) =>
      prev === listing.images.length - 1 ? 0 : prev + 1
    );
  };

  const handleFavoriteClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onToggleFavorite) {
      const listingId = listing.id || listing._id;
      onToggleFavorite(listingId, listing.title);
    }
  };

  // Calculate dynamic price using default 5 nights (Monday-Friday pattern)
  const calculateDynamicPrice = () => {
    const nightsCount = 5;
    const priceFieldMap = {
      2: 'Price 2 nights selected',
      3: 'Price 3 nights selected',
      4: 'Price 4 nights selected',
      5: 'Price 5 nights selected',
      6: 'Price 6 nights selected',
      7: 'Price 7 nights selected'
    };

    let nightlyHostRate = 0;
    if (nightsCount >= 2 && nightsCount <= 7) {
      const fieldName = priceFieldMap[nightsCount];
      nightlyHostRate = listing[fieldName] || 0;
    }

    if (!nightlyHostRate || nightlyHostRate === 0) {
      nightlyHostRate = listing['Starting nightly price'] || listing.price?.starting || 0;
    }

    const basePrice = nightlyHostRate * nightsCount;
    const fullTimeDiscount = nightsCount === 7 ? basePrice * 0.13 : 0;
    const priceAfterDiscounts = basePrice - fullTimeDiscount;
    const siteMarkup = priceAfterDiscounts * 0.17;
    const totalPrice = basePrice - fullTimeDiscount + siteMarkup;
    const pricePerNight = totalPrice / nightsCount;

    return pricePerNight;
  };

  const dynamicPrice = calculateDynamicPrice();
  const startingPrice = listing['Starting nightly price'] || listing.price?.starting || 0;

  // Render amenity icons
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

  const handleCardClick = (e) => {
    if (!listingId) {
      e.preventDefault();
      return;
    }
    e.preventDefault();
    const urlParams = new URLSearchParams(window.location.search);
    const daysSelected = urlParams.get('days-selected');
    const url = daysSelected
      ? `/view-split-lease/${listingId}?days-selected=${daysSelected}`
      : `/view-split-lease/${listingId}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <a
      className="listing-card"
      href={listingId ? `/view-split-lease/${listingId}` : '#'}
      target="_blank"
      rel="noopener noreferrer"
      style={{ textDecoration: 'none', color: 'inherit' }}
      onClick={handleCardClick}
    >
      {hasImages && (
        <div className="listing-images">
          <img
            src={listing.images[currentImageIndex]}
            alt={listing.title}
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
          <button
            type="button"
            className={`favorite-btn ${isFavorited ? 'favorited' : ''}`}
            onClick={handleFavoriteClick}
            aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill={isFavorited ? '#FF6B35' : 'none'}
              stroke={isFavorited ? '#FF6B35' : 'currentColor'}
              strokeWidth="2"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>
          {listing.isNew && <span className="new-badge">New Listing</span>}
        </div>
      )}

      <div className="listing-content">
        <div className="listing-info">
          <div
            className="listing-location"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (onLocationClick) {
                onLocationClick(listing);
              }
            }}
            style={{ cursor: onLocationClick ? 'pointer' : 'default' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span className="location-text">{listing.location}</span>
          </div>
          <h3 className="listing-title">{listing.title}</h3>
          <p className="listing-type">
            {listing.type}
            {listing.squareFeet ? ` (${listing.squareFeet} SQFT)` : ''} - {listing.maxGuests} guests max
          </p>
          {renderAmenityIcons()}
          <p className="listing-details">{listing.description}</p>
        </div>

        <div className="listing-footer">
          <div className="host-info">
            {listing.host?.image && (
              <img src={listing.host.image} alt={listing.host.name} className="host-avatar" />
            )}
            {!listing.host?.image && (
              <div className="host-avatar-placeholder">?</div>
            )}
            <div className="host-details">
              <span className="host-name">
                {formatHostName(listing.host?.name)}
                {listing.host?.verified && <span className="verified-badge" title="Verified">✓</span>}
              </span>
              <button
                className="message-btn"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onOpenContactModal(listing);
                }}
              >
                Message
              </button>
            </div>
          </div>

          <div className="pricing-info">
            <div
              ref={priceInfoTriggerRef}
              className="starting-price"
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onOpenInfoModal(listing, priceInfoTriggerRef);
              }}
            >
              <span>Starting at ${parseFloat(startingPrice).toFixed(2)}/night</span>
              <svg
                viewBox="0 0 24 24"
                width="14"
                height="14"
                style={{ color: '#3b82f6', fill: 'currentColor', cursor: 'pointer' }}
              >
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
              </svg>
            </div>
            <div className="full-price">${dynamicPrice.toFixed(2)}/night</div>
            <div className="availability-text">Message Split Lease for Availability</div>
          </div>
        </div>
      </div>
    </a>
  );
}

/**
 * ListingsGrid - Grid of property cards
 * Note: On favorites page, all listings are favorited by definition
 */
function ListingsGrid({ listings, onOpenContactModal, onOpenInfoModal, mapRef, isLoggedIn, onToggleFavorite }) {
  return (
    <div className="listings-container">
      {listings.map((listing) => {
        return (
          <PropertyCard
            key={listing.id}
            listing={listing}
            onLocationClick={(listing) => {
              if (mapRef.current) {
                mapRef.current.zoomToListing(listing.id);
              }
            }}
            onOpenContactModal={onOpenContactModal}
            onOpenInfoModal={onOpenInfoModal}
            isLoggedIn={isLoggedIn}
            isFavorited={true}
            onToggleFavorite={onToggleFavorite}
          />
        );
      })}
    </div>
  );
}

/**
 * LoadingState - Loading spinner
 */
function LoadingState() {
  return (
    <div className="loading-skeleton active">
      {[1, 2].map(i => (
        <div key={i} className="skeleton-card">
          <div className="skeleton-image"></div>
          <div className="skeleton-content">
            <div className="skeleton-line" style={{ width: '60%' }}></div>
            <div className="skeleton-line" style={{ width: '80%' }}></div>
            <div className="skeleton-line" style={{ width: '40%' }}></div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * ErrorState - Error message component
 */
function ErrorState({ message, onRetry }) {
  return (
    <div className="error-message">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4M12 16h.01" />
      </svg>
      <h3>Unable to Load Favorites</h3>
      <p>{message || 'Failed to load your favorite listings. Please try again.'}</p>
      {onRetry && (
        <button className="retry-btn" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}

const FavoriteListingsPage = () => {
  // State management
  const [listings, setListings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userId, setUserId] = useState(null);

  // Auth state
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [favoritedListingIds, setFavoritedListingIds] = useState(new Set());

  // Modal state
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [selectedListing, setSelectedListing] = useState(null);
  const [infoModalTriggerRef, setInfoModalTriggerRef] = useState(null);

  // Toast notification state
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // Mobile map visibility
  const [mobileMapVisible, setMobileMapVisible] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Refs
  const mapRef = useRef(null);

  // Transform raw listing data to match SearchPage format
  const transformListing = useCallback((dbListing, images, hostData) => {
    const neighborhoodName = getNeighborhoodName(dbListing['Location - Hood']);
    const boroughName = getBoroughName(dbListing['Location - Borough']);
    const propertyType = getPropertyTypeLabel(dbListing['Features - Type of Space']);

    const locationParts = [];
    if (neighborhoodName) locationParts.push(neighborhoodName);
    if (boroughName) locationParts.push(boroughName);
    const location = locationParts.join(', ') || 'New York, NY';

    // Extract coordinates
    let locationAddress = dbListing['Location - Address'];
    let locationSlightlyDifferent = dbListing['Location - slightly different address'];

    if (typeof locationSlightlyDifferent === 'string') {
      try {
        locationSlightlyDifferent = JSON.parse(locationSlightlyDifferent);
      } catch { locationSlightlyDifferent = null; }
    }

    if (typeof locationAddress === 'string') {
      try {
        locationAddress = JSON.parse(locationAddress);
      } catch { locationAddress = null; }
    }

    let coordinates = null;
    if (locationSlightlyDifferent?.lat && locationSlightlyDifferent?.lng) {
      coordinates = { lat: locationSlightlyDifferent.lat, lng: locationSlightlyDifferent.lng };
    } else if (locationAddress?.lat && locationAddress?.lng) {
      coordinates = { lat: locationAddress.lat, lng: locationAddress.lng };
    }

    return {
      id: dbListing._id,
      title: dbListing.Name || 'Unnamed Listing',
      location: location,
      neighborhood: neighborhoodName || '',
      borough: boroughName || '',
      coordinates,
      price: {
        starting: dbListing['Standarized Minimum Nightly Price (Filter)'] || 0,
        full: dbListing['💰Nightly Host Rate for 7 nights'] || 0
      },
      'Starting nightly price': dbListing['Standarized Minimum Nightly Price (Filter)'] || 0,
      'Price 2 nights selected': dbListing['💰Nightly Host Rate for 2 nights'] || null,
      'Price 3 nights selected': dbListing['💰Nightly Host Rate for 3 nights'] || null,
      'Price 4 nights selected': dbListing['💰Nightly Host Rate for 4 nights'] || null,
      'Price 5 nights selected': dbListing['💰Nightly Host Rate for 5 nights'] || null,
      'Price 6 nights selected': null,
      'Price 7 nights selected': dbListing['💰Nightly Host Rate for 7 nights'] || null,
      type: propertyType,
      squareFeet: dbListing['Features - SQFT Area'] || null,
      maxGuests: dbListing['Features - Qty Guests'] || 1,
      bedrooms: dbListing['Features - Qty Bedrooms'] || 0,
      bathrooms: dbListing['Features - Qty Bathrooms'] || 0,
      amenities: parseAmenities(dbListing),
      host: hostData || { name: null, image: null, verified: false },
      images: images || [],
      description: `${(dbListing['Features - Qty Bedrooms'] || 0) === 0 ? 'Studio' : `${dbListing['Features - Qty Bedrooms']} bedroom`} • ${dbListing['Features - Qty Bathrooms'] || 0} bathroom`,
      weeks_offered: dbListing['Weeks offered'] || 'Every week',
      isNew: false
    };
  }, []);

  // Initialize data lookups on mount
  useEffect(() => {
    const init = async () => {
      if (!isInitialized()) {
        await initializeLookups();
      }
    };
    init();
  }, []);

  // Check auth and fetch favorites
  useEffect(() => {
    const initializePage = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Check auth status
        const isAuthenticated = await checkAuthStatus();
        setIsLoggedIn(isAuthenticated);

        if (!isAuthenticated) {
          setError('Please log in to view your favorite listings.');
          setIsLoading(false);
          return;
        }

        // Get user data
        const userData = await validateTokenAndFetchUser();
        const sessionId = getSessionId();
        setUserId(sessionId);

        if (userData) {
          setCurrentUser({
            id: sessionId,
            name: userData.fullName || userData.firstName || '',
            email: userData.email || '',
            userType: userData.userType || 'GUEST',
            avatarUrl: userData.profilePhoto || null
          });
        }

        if (!sessionId) {
          setError('Please log in to view your favorites.');
          setIsLoading(false);
          return;
        }

        // Fetch user's favorited listing IDs
        const { data: userFavorites, error: favError } = await supabase
          .from('user')
          .select('"Favorited Listings"')
          .eq('_id', sessionId)
          .single();

        if (favError) {
          console.error('Error fetching favorites:', favError);
          setError('Failed to load your favorites. Please try again.');
          setIsLoading(false);
          return;
        }

        const favorites = userFavorites?.['Favorited Listings'];
        let favoritedIds = [];

        if (favorites) {
          if (typeof favorites === 'string') {
            try {
              favoritedIds = JSON.parse(favorites);
            } catch { favoritedIds = []; }
          } else if (Array.isArray(favorites)) {
            favoritedIds = favorites;
          }
        }

        // Filter to valid Bubble listing IDs
        favoritedIds = favoritedIds.filter(id => typeof id === 'string' && /^\d+x\d+$/.test(id));
        setFavoritedListingIds(new Set(favoritedIds));

        if (favoritedIds.length === 0) {
          setListings([]);
          setIsLoading(false);
          return;
        }

        // Fetch listings data from Supabase
        const { data: listingsData, error: listingsError } = await supabase
          .from('listing')
          .select('*')
          .in('_id', favoritedIds)
          .eq('Active', true);

        if (listingsError) {
          console.error('Error fetching listings:', listingsError);
          setError('Failed to load listings. Please try again.');
          setIsLoading(false);
          return;
        }

        // Batch fetch photos
        const allPhotoIds = new Set();
        listingsData.forEach(listing => {
          const photosField = listing['Features - Photos'];
          if (Array.isArray(photosField)) {
            photosField.forEach(id => allPhotoIds.add(id));
          } else if (typeof photosField === 'string') {
            try {
              const parsed = JSON.parse(photosField);
              if (Array.isArray(parsed)) {
                parsed.forEach(id => allPhotoIds.add(id));
              }
            } catch { /* ignore */ }
          }
        });

        const photoMap = await fetchPhotoUrls(Array.from(allPhotoIds));

        // Extract photos per listing
        const resolvedPhotos = {};
        listingsData.forEach(listing => {
          resolvedPhotos[listing._id] = extractPhotos(
            listing['Features - Photos'],
            photoMap,
            listing._id
          );
        });

        // Batch fetch host data
        const hostIds = new Set();
        listingsData.forEach(listing => {
          if (listing['Host / Landlord']) {
            hostIds.add(listing['Host / Landlord']);
          }
        });

        const hostMap = await fetchHostData(Array.from(hostIds));

        // Transform listings
        const transformedListings = listingsData
          .map(listing => {
            const hostId = listing['Host / Landlord'];
            return transformListing(listing, resolvedPhotos[listing._id], hostMap[hostId] || null);
          })
          .filter(listing => listing.coordinates && listing.coordinates.lat && listing.coordinates.lng)
          .filter(listing => listing.images && listing.images.length > 0);

        setListings(transformedListings);
        console.log(`Loaded ${transformedListings.length} favorite listings`);
      } catch (err) {
        console.error('❌ Error initializing page:', err);
        setError(`Failed to load your favorite listings: ${err?.message || 'Unknown error'}. Please try again.`);
      } finally {
        setIsLoading(false);
      }
    };

    initializePage();
  }, [transformListing]);

  // Show toast notification
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 3000);
  };

  // Toggle favorite
  const handleToggleFavorite = async (listingId, listingTitle) => {
    if (!isLoggedIn || !currentUser?.id) return;

    const isFavorited = favoritedListingIds.has(listingId);

    // Optimistic update
    const newFavoritedIds = new Set(favoritedListingIds);
    if (isFavorited) {
      newFavoritedIds.delete(listingId);
      // Also remove from listings display
      setListings(prev => prev.filter(l => l.id !== listingId));
    } else {
      newFavoritedIds.add(listingId);
    }
    setFavoritedListingIds(newFavoritedIds);

    try {
      const { data, error } = await supabase.functions.invoke('bubble-proxy', {
        body: {
          action: 'toggle_favorite',
          payload: {
            userId: currentUser.id,
            listingId,
            action: isFavorited ? 'remove' : 'add',
          },
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error?.message || 'Failed to update favorites');

      const displayName = listingTitle || 'Listing';
      if (isFavorited) {
        showToast(`${displayName} removed from favorites`, 'info');
      } else {
        showToast(`${displayName} added to favorites`, 'success');
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      // Revert optimistic update
      setFavoritedListingIds(favoritedListingIds);
      showToast('Failed to update favorites. Please try again.', 'error');
    }
  };

  // Modal handlers
  const handleOpenContactModal = (listing) => {
    setSelectedListing(listing);
    setIsContactModalOpen(true);
  };

  const handleCloseContactModal = () => {
    setIsContactModalOpen(false);
    setSelectedListing(null);
  };

  const handleOpenInfoModal = (listing, triggerRef) => {
    setSelectedListing(listing);
    setInfoModalTriggerRef(triggerRef);
    setIsInfoModalOpen(true);
  };

  const handleCloseInfoModal = () => {
    setIsInfoModalOpen(false);
    setSelectedListing(null);
    setInfoModalTriggerRef(null);
  };

  // Auth handlers
  const handleNavigate = (path) => {
    window.location.href = path;
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      setIsLoggedIn(false);
      setCurrentUser(null);
      window.location.href = '/search';
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Mount AuthAwareSearchScheduleSelector in mount points
  useEffect(() => {
    const mountPointDesktop = document.getElementById('schedule-selector-mount-point');
    const mountPointMobile = document.getElementById('schedule-selector-mount-point-mobile');
    const roots = [];

    const selectorProps = {
      onSelectionChange: (days) => {
        console.log('Schedule selector changed:', days);
      },
      onError: (error) => console.error('AuthAwareSearchScheduleSelector error:', error)
    };

    if (mountPointDesktop) {
      const rootDesktop = createRoot(mountPointDesktop);
      rootDesktop.render(<AuthAwareSearchScheduleSelector {...selectorProps} />);
      roots.push(rootDesktop);
    }

    if (mountPointMobile) {
      const rootMobile = createRoot(mountPointMobile);
      rootMobile.render(<AuthAwareSearchScheduleSelector {...selectorProps} />);
      roots.push(rootMobile);
    }

    return () => {
      roots.forEach(root => root.unmount());
    };
  }, []);

  // Render
  return (
    <div className="favorites-page">
      {/* Toast Notification */}
      {toast.show && (
        <div className={`toast toast-${toast.type} show`}>
          <span className="toast-icon">
            {toast.type === 'success' && (
              <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            )}
            {toast.type === 'info' && (
              <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
              </svg>
            )}
            {toast.type === 'error' && (
              <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
              </svg>
            )}
          </span>
          <span className="toast-message">{toast.message}</span>
        </div>
      )}

      {/* Two-column layout: Listings (left) + Map (right) */}
      <main className="two-column-layout">
        {/* LEFT COLUMN: Listings */}
        <section className="listings-column">
          {/* Mobile Filter Bar */}
          <div className="mobile-filter-bar">
            <button className="map-toggle-btn" onClick={() => setMobileMapVisible(true)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="2" />
                <path d="M9 3v18M15 3v18M3 9h18M3 15h18" strokeWidth="2" />
              </svg>
              <span>Map</span>
            </button>
          </div>

          {/* Mobile Schedule Selector */}
          <div className="mobile-schedule-selector">
            <div className="filter-group schedule-selector-group" id="schedule-selector-mount-point-mobile">
              {/* AuthAwareSearchScheduleSelector will be mounted here on mobile */}
            </div>
          </div>

          {/* Desktop Schedule Selector */}
          <div className="inline-filters">
            <div className="filter-group schedule-selector-group" id="schedule-selector-mount-point">
              {/* AuthAwareSearchScheduleSelector will be mounted here on desktop */}
            </div>
          </div>

          {/* Listings count */}
          <div className="listings-count">
            <strong>{listings.length} favorite{listings.length !== 1 ? 's' : ''}</strong>
          </div>

          {/* Listings content */}
          <div className="listings-content">
            {isLoading && <LoadingState />}

            {!isLoading && error && (
              <ErrorState message={error} onRetry={() => window.location.reload()} />
            )}

            {!isLoading && !error && listings.length === 0 && (
              <EmptyState
                message="You don't have any favorite listings yet. We invite you to search listings and submit proposals with the weekly schedule you have in mind"
                ctaText="Explore Rentals"
                ctaLink="/search"
              />
            )}

            {!isLoading && !error && listings.length > 0 && (
              <ListingsGrid
                listings={listings}
                onOpenContactModal={handleOpenContactModal}
                onOpenInfoModal={handleOpenInfoModal}
                mapRef={mapRef}
                isLoggedIn={isLoggedIn}
                onToggleFavorite={handleToggleFavorite}
              />
            )}
          </div>
        </section>

        {/* RIGHT COLUMN: Map with integrated header */}
        <section className="map-column">
          {/* Integrated Logo and Menu */}
          <div className="map-header">
            <a href="/" className="map-logo">
              <img
                src="/assets/images/split-lease-purple-circle.png"
                alt="Split Lease Logo"
                className="logo-icon"
                width="36"
                height="36"
              />
              <span className="logo-text">Split Lease</span>
            </a>

            {/* Right side: Auth state */}
            <div className="map-header-actions">
              {isLoggedIn && currentUser ? (
                <>
                  {/* Favorites Heart with Count */}
                  <a href="/favorite-listings" className="favorites-link active" aria-label="My Favorite Listings">
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="#FF6B35"
                      stroke="#FF6B35"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                    {listings.length > 0 && (
                      <span className="favorites-badge">{listings.length}</span>
                    )}
                  </a>

                  {/* Logged In Avatar */}
                  <LoggedInAvatar
                    user={currentUser}
                    currentPath="/favorite-listings"
                    onNavigate={handleNavigate}
                    onLogout={handleLogout}
                  />
                </>
              ) : (
                <button
                  className="hamburger-menu"
                  onClick={() => setMenuOpen(!menuOpen)}
                  aria-label="Toggle menu"
                >
                  <span>Menu</span>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="3" y1="12" x2="21" y2="12" />
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="3" y1="18" x2="21" y2="18" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          <GoogleMap
            ref={mapRef}
            listings={[]} // No background listings on favorites page
            filteredListings={listings}
            selectedListing={null}
            selectedBorough={null}
            onMarkerClick={(listing) => {
              console.log('Marker clicked:', listing.title);
            }}
            onMessageClick={(listing) => {
              handleOpenContactModal(listing);
            }}
            isLoggedIn={isLoggedIn}
            favoritedListingIds={favoritedListingIds}
            onToggleFavorite={handleToggleFavorite}
          />
        </section>
      </main>

      {/* Modals */}
      <ContactHostMessaging
        isOpen={isContactModalOpen}
        onClose={handleCloseContactModal}
        listing={selectedListing}
        userEmail={currentUser?.email || ''}
        userName={currentUser?.name || ''}
      />
      <InformationalText
        isOpen={isInfoModalOpen}
        onClose={handleCloseInfoModal}
        listing={selectedListing}
        triggerRef={infoModalTriggerRef}
        title="Pricing Information"
        content=""
      />

      {/* Mobile Map Modal */}
      {mobileMapVisible && (
        <div className="mobile-map-modal">
          <div className="mobile-map-header">
            <button
              className="mobile-map-close-btn"
              onClick={() => setMobileMapVisible(false)}
              aria-label="Close map"
            >
              ✕
            </button>
            <h2>Map View</h2>
          </div>
          <div className="mobile-map-content">
            <GoogleMap
              ref={mapRef}
              listings={[]}
              filteredListings={listings}
              selectedListing={null}
              selectedBorough={null}
              onMarkerClick={(listing) => {
                console.log('Marker clicked:', listing.title);
              }}
              onMessageClick={(listing) => {
                handleOpenContactModal(listing);
              }}
              isLoggedIn={isLoggedIn}
              favoritedListingIds={favoritedListingIds}
              onToggleFavorite={handleToggleFavorite}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default FavoriteListingsPage;
