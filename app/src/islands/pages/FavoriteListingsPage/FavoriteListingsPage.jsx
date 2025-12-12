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
import FavoriteButton from '../../shared/FavoriteButton/FavoriteButton.jsx';
import CreateProposalFlowV2 from '../../shared/CreateProposalFlowV2.jsx';
import ProposalSuccessModal from '../../modals/ProposalSuccessModal.jsx';
import SignUpLoginModal from '../../shared/SignUpLoginModal.jsx';
import EmptyState from './components/EmptyState';
import { getFavoritedListings, removeFromFavorites } from './favoritesApi';
import { checkAuthStatus, getSessionId, validateTokenAndFetchUser, getUserId, logoutUser } from '../../../lib/auth';
import { fetchProposalsByGuest } from '../../../lib/proposalDataFetcher.js';
import { fetchZatPriceConfiguration } from '../../../lib/listingDataFetcher.js';
import { supabase } from '../../../lib/supabase.js';
import { getNeighborhoodName, getBoroughName, getPropertyTypeLabel, initializeLookups, isInitialized } from '../../../lib/dataLookups.js';
import { fetchPhotoUrls, extractPhotos, fetchHostData, parseAmenities } from '../../../lib/supabaseUtils.js';
import { adaptDaysToBubble } from '../../../logic/processors/external/adaptDaysToBubble.js';
import { createDay } from '../../../lib/scheduleSelector/dayHelpers.js';
import './FavoriteListingsPage.css';
import '../../../styles/create-proposal-flow-v2.css';

/**
 * Fetch informational texts from Supabase
 */
async function fetchInformationalTexts() {
  try {
    const { data, error } = await supabase
      .from('informationaltexts')
      .select('_id, "Information Tag-Title", "Desktop copy", "Mobile copy", "Desktop+ copy", "show more available?"');

    if (error) throw error;

    // Transform data into a map keyed by tag title
    const textsMap = {};
    data.forEach(item => {
      textsMap[item['Information Tag-Title']] = {
        desktop: item['Desktop copy'],
        mobile: item['Mobile copy'],
        desktopPlus: item['Desktop+ copy'],
        showMore: item['show more available?']
      };
    });

    return textsMap;
  } catch (error) {
    console.error('Failed to fetch informational texts:', error);
    return {};
  }
}

/**
 * PropertyCard - Individual listing card (matches SearchPage PropertyCard exactly)
 * @param {Object} proposalForListing - The user's existing proposal for this listing (if any)
 */
function PropertyCard({ listing, onLocationClick, onOpenContactModal, onOpenInfoModal, isLoggedIn, isFavorited, onToggleFavorite, userId, proposalForListing, onCreateProposal }) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const priceInfoTriggerRef = useRef(null);

  const hasImages = listing.images && listing.images.length > 0;
  const hasMultipleImages = listing.images && listing.images.length > 1;

  // Get listing ID for FavoriteButton
  const favoriteListingId = listing.id || listing._id;

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

  // Calculate dynamic price using default 5 nights (Monday-Friday pattern)
  // Uses the same formula as priceCalculations.js for Nightly rental type
  const calculateDynamicPrice = () => {
    const nightsCount = 5; // Default to 5 nights (Mon-Fri)

    const priceFieldMap = {
      2: 'Price 2 nights selected',
      3: 'Price 3 nights selected',
      4: 'Price 4 nights selected',
      5: 'Price 5 nights selected',
      6: 'Price 6 nights selected',
      7: 'Price 7 nights selected'
    };

    // Get the host compensation rate for the selected nights
    let nightlyHostRate = 0;
    if (nightsCount >= 2 && nightsCount <= 7) {
      const fieldName = priceFieldMap[nightsCount];
      nightlyHostRate = listing[fieldName] || 0;
    }

    // Fallback to starting price if no specific rate found
    if (!nightlyHostRate || nightlyHostRate === 0) {
      nightlyHostRate = listing['Starting nightly price'] || listing.price?.starting || 0;
    }

    // Apply the same markup calculation as priceCalculations.js
    // Step 1: Calculate base price (host rate × nights)
    const basePrice = nightlyHostRate * nightsCount;

    // Step 2: Apply full-time discount (only for 7 nights, 13% discount)
    const fullTimeDiscount = nightsCount === 7 ? basePrice * 0.13 : 0;

    // Step 3: Price after discounts
    const priceAfterDiscounts = basePrice - fullTimeDiscount;

    // Step 4: Apply site markup (17%)
    const siteMarkup = priceAfterDiscounts * 0.17;

    // Step 5: Calculate total price
    const totalPrice = basePrice - fullTimeDiscount + siteMarkup;

    // Step 6: Calculate price per night (guest-facing price)
    const pricePerNight = totalPrice / nightsCount;

    return pricePerNight;
  };

  const dynamicPrice = calculateDynamicPrice();
  const startingPrice = listing['Starting nightly price'] || listing.price?.starting || 0;

  const listingId = listing.id || listing._id;

  // Handle click to pass days-selected parameter at click time (not render time)
  // This ensures we get the current URL parameter after SearchScheduleSelector has updated it
  const handleCardClick = (e) => {
    if (!listingId) {
      e.preventDefault();
      console.error('[PropertyCard] No listing ID found', { listing });
      return;
    }

    // Prevent default link behavior - we'll handle navigation manually
    e.preventDefault();

    // Get days-selected from URL at click time (after SearchScheduleSelector has updated it)
    const urlParams = new URLSearchParams(window.location.search);
    const daysSelected = urlParams.get('days-selected');

    const url = daysSelected
      ? `/view-split-lease/${listingId}?days-selected=${daysSelected}`
      : `/view-split-lease/${listingId}`;

    console.log('📅 PropertyCard: Opening listing with URL:', url);
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
      {/* Image Section */}
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
          <FavoriteButton
            listingId={favoriteListingId}
            userId={userId}
            initialFavorited={isFavorited}
            onToggle={(newState, listingId) => {
              if (onToggleFavorite) {
                onToggleFavorite(listingId, listing.title, newState);
              }
            }}
            size="medium"
          />
          {listing.isNew && <span className="new-badge">New Listing</span>}
        </div>
      )}

      {/* Content Section - F7b Layout */}
      <div className="listing-content">
        {/* Main Info - Left Side */}
        <div className="listing-main-info">
          <div className="listing-info-top">
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
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span className="location-text">{listing.location}</span>
            </div>
            <h3 className="listing-title">{listing.title}</h3>
          </div>

          {/* Meta Section - Info Dense Style */}
          <div className="listing-meta">
            <span className="meta-item"><strong>{listing.type || 'Entire Place'}</strong></span>
            <span className="meta-item"><strong>{listing.maxGuests}</strong> guests</span>
            <span className="meta-item"><strong>{listing.bedrooms === 0 ? 'Studio' : `${listing.bedrooms} bed`}</strong></span>
            <span className="meta-item"><strong>{listing.bathrooms}</strong> bath</span>
          </div>

          {/* Host Row - Bottom Left */}
          <div className="listing-host-row">
            <div className="host">
              {listing.host?.image ? (
                <img src={listing.host.image} alt={listing.host.name} className="host-avatar" />
              ) : (
                <div className="host-avatar-placeholder">?</div>
              )}
              <span className="host-name">
                {formatHostName(listing.host?.name)}
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
              {/* Proposal CTAs - Show Create or View based on existing proposal */}
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
                    // Open inline proposal modal instead of navigating
                    if (onCreateProposal) {
                      onCreateProposal(listing);
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
          <div className="price-starting">Starting at<span>${parseFloat(startingPrice).toFixed(2)}/night</span></div>
          <div className="availability-note">Message Split Lease<br/>for Availability</div>
        </div>
      </div>
    </a>
  );
}

/**
 * ListingsGrid - Grid of property cards
 * Note: On favorites page, all listings are favorited by definition
 * @param {Map} proposalsByListingId - Map of listing ID to proposal object
 * @param {Function} onCreateProposal - Handler to open inline proposal creation modal
 */
function ListingsGrid({ listings, onOpenContactModal, onOpenInfoModal, mapRef, isLoggedIn, onToggleFavorite, userId, proposalsByListingId, onCreateProposal }) {
  return (
    <div className="listings-container">
      {listings.map((listing) => {
        const proposalForListing = proposalsByListingId?.get(listing.id) || null;
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
            userId={userId}
            proposalForListing={proposalForListing}
            onCreateProposal={onCreateProposal}
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

  // Proposals state - Map of listing ID to proposal object
  const [proposalsByListingId, setProposalsByListingId] = useState(new Map());

  // Modal state
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [selectedListing, setSelectedListing] = useState(null);
  const [infoModalTriggerRef, setInfoModalTriggerRef] = useState(null);

  // Proposal modal state
  const [isProposalModalOpen, setIsProposalModalOpen] = useState(false);
  const [selectedListingForProposal, setSelectedListingForProposal] = useState(null);
  const [zatConfig, setZatConfig] = useState(null);
  const [moveInDate, setMoveInDate] = useState(null);
  const [selectedDayObjects, setSelectedDayObjects] = useState([]);
  const [reservationSpan, setReservationSpan] = useState(13);
  const [priceBreakdown, setPriceBreakdown] = useState(null);
  const [pendingProposalData, setPendingProposalData] = useState(null);
  const [loggedInUserData, setLoggedInUserData] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successProposalId, setSuccessProposalId] = useState(null);
  const [isSubmittingProposal, setIsSubmittingProposal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Toast notification state
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // Informational texts
  const [informationalTexts, setInformationalTexts] = useState({});

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

  // Fetch informational texts on mount
  useEffect(() => {
    const loadInformationalTexts = async () => {
      const texts = await fetchInformationalTexts();
      setInformationalTexts(texts);
    };
    loadInformationalTexts();
  }, []);

  // Fetch ZAT price configuration on mount
  useEffect(() => {
    const loadZatConfig = async () => {
      try {
        const config = await fetchZatPriceConfiguration();
        setZatConfig(config);
      } catch (error) {
        console.warn('Failed to load ZAT config:', error);
      }
    };
    loadZatConfig();
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

          // Also fetch user's proposal count and profile info for prefilling
          try {
            const { data: userProposalData, error: propError } = await supabase
              .from('user')
              .select('"About Me / Bio", "need for Space", "special needs", "Proposals List"')
              .eq('_id', sessionId)
              .single();

            if (!propError && userProposalData) {
              const proposalsList = userProposalData['Proposals List'];
              const proposalCount = Array.isArray(proposalsList) ? proposalsList.length : 0;
              setLoggedInUserData({
                aboutMe: userProposalData['About Me / Bio'] || '',
                needForSpace: userProposalData['need for Space'] || '',
                specialNeeds: userProposalData['special needs'] || '',
                proposalCount: proposalCount
              });
            }
          } catch (e) {
            console.warn('Failed to fetch user proposal data:', e);
          }
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

        // Fetch listings data from Supabase (all favorited listings, regardless of Active status)
        const { data: listingsData, error: listingsError } = await supabase
          .from('listing')
          .select('*')
          .in('_id', favoritedIds);

        if (listingsError) {
          console.error('Error fetching listings:', listingsError);
          setError('Failed to load listings. Please try again.');
          setIsLoading(false);
          return;
        }

        // Collect legacy photo IDs (strings) for batch fetch
        // New format has embedded objects with URLs, no fetch needed
        const legacyPhotoIds = new Set();
        listingsData.forEach(listing => {
          const photosField = listing['Features - Photos'];
          let photos = [];

          if (Array.isArray(photosField)) {
            photos = photosField;
          } else if (typeof photosField === 'string') {
            try {
              photos = JSON.parse(photosField);
            } catch { /* ignore */ }
          }

          // Only collect string IDs (legacy format), not objects (new format)
          if (Array.isArray(photos)) {
            photos.forEach(photo => {
              if (typeof photo === 'string') {
                legacyPhotoIds.add(photo);
              }
            });
          }
        });

        // Only fetch from listing_photo table if there are legacy photo IDs
        const photoMap = legacyPhotoIds.size > 0
          ? await fetchPhotoUrls(Array.from(legacyPhotoIds))
          : {};

        // Extract photos per listing (handles both embedded objects and legacy IDs)
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

        // Fetch user's proposals to check if any exist for these listings
        try {
          const proposals = await fetchProposalsByGuest(sessionId);
          console.log(`📋 Loaded ${proposals.length} proposals for user`);

          // Create a map of listing ID to proposal (only include non-terminal proposals)
          const proposalsMap = new Map();
          proposals.forEach(proposal => {
            const listingId = proposal.Listing;
            if (listingId) {
              // If multiple proposals exist for same listing, keep the most recent one
              // (proposals are already sorted by Created Date descending)
              if (!proposalsMap.has(listingId)) {
                proposalsMap.set(listingId, proposal);
              }
            }
          });

          setProposalsByListingId(proposalsMap);
          console.log(`📋 Mapped ${proposalsMap.size} listings with proposals`);
        } catch (proposalErr) {
          console.warn('Failed to fetch proposals (non-critical):', proposalErr);
          // Don't fail the page if proposals can't be loaded - just show Create Proposal for all
        }
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

  // Toggle favorite - called after FavoriteButton handles the API call
  const handleToggleFavorite = (listingId, listingTitle, newState) => {
    const displayName = listingTitle || 'Listing';

    // If unfavorited (newState = false), remove from listings display
    if (!newState) {
      setListings(prev => prev.filter(l => l.id !== listingId));
      showToast(`${displayName} removed from favorites`, 'info');
    } else {
      showToast(`${displayName} added to favorites`, 'success');
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

  // Handler to open proposal creation modal for a specific listing
  const handleOpenProposalModal = async (listing) => {
    // Get default schedule from URL params or use default weekdays
    const urlParams = new URLSearchParams(window.location.search);
    const daysParam = urlParams.get('days-selected');

    let initialDays = [];
    if (daysParam) {
      try {
        const oneBased = daysParam.split(',').map(d => parseInt(d.trim(), 10));
        initialDays = oneBased
          .filter(d => d >= 1 && d <= 7)
          .map(d => d - 1)
          .map(dayIndex => createDay(dayIndex, true));
      } catch (e) {
        console.warn('Failed to parse days from URL:', e);
      }
    }

    // Default to weekdays (Mon-Fri) if no URL selection
    if (initialDays.length === 0) {
      initialDays = [1, 2, 3, 4, 5].map(dayIndex => createDay(dayIndex, true));
    }

    // Calculate default move-in date (2 weeks from now on the first selected day)
    const today = new Date();
    const twoWeeksFromNow = new Date(today);
    twoWeeksFromNow.setDate(today.getDate() + 14);

    // Find the next occurrence of the first selected day after 2 weeks
    const firstSelectedDay = initialDays[0]?.dayOfWeek ?? 1;
    while (twoWeeksFromNow.getDay() !== firstSelectedDay) {
      twoWeeksFromNow.setDate(twoWeeksFromNow.getDate() + 1);
    }

    setSelectedListingForProposal(listing);
    setSelectedDayObjects(initialDays);
    setMoveInDate(twoWeeksFromNow.toISOString().split('T')[0]);
    setReservationSpan(13);
    setPriceBreakdown(null); // Will be calculated by ListingScheduleSelector
    setIsProposalModalOpen(true);
  };

  // Submit proposal to backend
  const submitProposal = async (proposalData) => {
    setIsSubmittingProposal(true);

    try {
      const guestId = getSessionId();
      if (!guestId) {
        throw new Error('User session not found');
      }

      // Convert days to Bubble format (1-7)
      const bubbleDays = adaptDaysToBubble({
        zeroBasedDays: proposalData.daysSelectedObjects.map(d => d.dayOfWeek)
      });

      // Build payload
      const payload = {
        listingId: selectedListingForProposal._id || selectedListingForProposal.id,
        guestId: guestId,
        moveInDate: proposalData.moveInDate,
        checkInDay: proposalData.checkInDay,
        checkOutDay: proposalData.checkOutDay,
        daysSelected: bubbleDays,
        reservationSpan: proposalData.reservationSpan,
        pricePerNight: proposalData.pricePerNight,
        totalPrice: proposalData.totalPrice,
        needForSpace: proposalData.needForSpace,
        aboutYourself: proposalData.aboutYourself,
        hasUniqueRequirements: proposalData.hasUniqueRequirements,
        uniqueRequirements: proposalData.uniqueRequirements || '',
        moveInRange: proposalData.moveInRange || ''
      };

      console.log('Submitting proposal:', payload);

      const { data, error } = await supabase.functions.invoke('proposal', {
        body: {
          action: 'create',
          payload
        }
      });

      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || 'Failed to submit proposal');
      }

      console.log('Proposal submitted successfully:', data);

      setIsProposalModalOpen(false);
      setPendingProposalData(null);
      setSuccessProposalId(data.data?.proposalId);
      setShowSuccessModal(true);

      // Update proposals map to show "View Proposal" instead of "Create Proposal"
      if (data.data?.proposalId && selectedListingForProposal) {
        setProposalsByListingId(prev => {
          const newMap = new Map(prev);
          newMap.set(selectedListingForProposal.id, { _id: data.data.proposalId });
          return newMap;
        });
      }

      showToast('Proposal submitted successfully!', 'success');

    } catch (error) {
      console.error('Error submitting proposal:', error);
      showToast(error.message || 'Failed to submit proposal. Please try again.', 'error');
    } finally {
      setIsSubmittingProposal(false);
    }
  };

  // Handle proposal submission - checks auth first
  const handleProposalSubmit = async (proposalData) => {
    console.log('Proposal submission initiated:', proposalData);

    const isAuthenticated = await checkAuthStatus();

    if (!isAuthenticated) {
      console.log('User not logged in, showing auth modal');
      setPendingProposalData(proposalData);
      setIsProposalModalOpen(false);
      setShowAuthModal(true);
      return;
    }

    await submitProposal(proposalData);
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

  // Handle auth completion - submit pending proposal if exists
  const handleAuthSuccess = async (authResult) => {
    console.log('Auth completed:', authResult);
    setShowAuthModal(false);
    setIsLoggedIn(true);

    // Update user data after successful auth
    try {
      const userData = await validateTokenAndFetchUser();
      const sessionId = getSessionId();

      if (userData) {
        setCurrentUser({
          id: sessionId,
          name: userData.fullName || userData.firstName || '',
          email: userData.email || '',
          userType: userData.userType || 'GUEST',
          avatarUrl: userData.profilePhoto || null
        });

        // Also fetch user's proposal data for future proposals
        const { data: userProposalData } = await supabase
          .from('user')
          .select('"About Me / Bio", "need for Space", "special needs", "Proposals List"')
          .eq('_id', sessionId)
          .single();

        if (userProposalData) {
          const proposalsList = userProposalData['Proposals List'];
          const proposalCount = Array.isArray(proposalsList) ? proposalsList.length : 0;
          setLoggedInUserData({
            aboutMe: userProposalData['About Me / Bio'] || '',
            needForSpace: userProposalData['need for Space'] || '',
            specialNeeds: userProposalData['special needs'] || '',
            proposalCount: proposalCount
          });
        }
      }
    } catch (e) {
      console.warn('Failed to update user data after auth:', e);
    }

    // If there's a pending proposal, submit it now
    if (pendingProposalData) {
      console.log('Submitting pending proposal after auth...');
      await submitProposal(pendingProposalData);
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
                userId={userId}
                proposalsByListingId={proposalsByListingId}
                onCreateProposal={handleOpenProposalModal}
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
        content={informationalTexts['Price Starts']?.desktop || ''}
        expandedContent={informationalTexts['Price Starts']?.desktopPlus}
        showMoreAvailable={informationalTexts['Price Starts']?.showMore}
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

      {/* Create Proposal Modal - V2 */}
      {isProposalModalOpen && selectedListingForProposal && (
        <CreateProposalFlowV2
          listing={{
            ...selectedListingForProposal,
            _id: selectedListingForProposal.id || selectedListingForProposal._id,
            Name: selectedListingForProposal.title || selectedListingForProposal.Name,
            host: selectedListingForProposal.host || null
          }}
          moveInDate={moveInDate}
          daysSelected={selectedDayObjects}
          nightsSelected={selectedDayObjects.length > 0 ? selectedDayObjects.length - 1 : 0}
          reservationSpan={reservationSpan}
          pricingBreakdown={priceBreakdown}
          zatConfig={zatConfig}
          isFirstProposal={!loggedInUserData || loggedInUserData.proposalCount === 0}
          useFullFlow={true}
          existingUserData={loggedInUserData ? {
            needForSpace: loggedInUserData.needForSpace || '',
            aboutYourself: loggedInUserData.aboutMe || '',
            hasUniqueRequirements: !!loggedInUserData.specialNeeds,
            uniqueRequirements: loggedInUserData.specialNeeds || ''
          } : null}
          onClose={() => {
            setIsProposalModalOpen(false);
            setSelectedListingForProposal(null);
          }}
          onSubmit={handleProposalSubmit}
        />
      )}

      {/* Auth Modal for Proposal Submission */}
      {showAuthModal && (
        <SignUpLoginModal
          isOpen={showAuthModal}
          onClose={() => {
            setShowAuthModal(false);
            setPendingProposalData(null);
          }}
          initialView="signup-step1"
          onAuthSuccess={handleAuthSuccess}
          defaultUserType="guest"
          skipReload={true}
        />
      )}

      {/* Proposal Success Modal */}
      {showSuccessModal && (
        <ProposalSuccessModal
          proposalId={successProposalId}
          listingName={selectedListingForProposal?.title || selectedListingForProposal?.Name}
          onClose={() => {
            setShowSuccessModal(false);
            setSuccessProposalId(null);
            setSelectedListingForProposal(null);
          }}
        />
      )}
    </div>
  );
};

export default FavoriteListingsPage;
