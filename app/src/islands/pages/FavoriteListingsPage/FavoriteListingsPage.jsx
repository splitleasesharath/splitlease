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
import CreateProposalFlowV2, { clearProposalDraft } from '../../shared/CreateProposalFlowV2.jsx';
import ProposalSuccessModal from '../../modals/ProposalSuccessModal.jsx';
import SignUpLoginModal from '../../shared/SignUpLoginModal.jsx';
import EmptyState from './components/EmptyState';
import { getFavoritedListingIds, removeFromFavorites } from './favoritesApi';
import { checkAuthStatus, getSessionId, validateTokenAndFetchUser, getUserId, logoutUser, getFirstName } from '../../../lib/auth';
import { fetchProposalsByGuest, fetchLastProposalDefaults } from '../../../lib/proposalDataFetcher.js';
import { fetchZatPriceConfiguration } from '../../../lib/listingDataFetcher.js';
import { supabase } from '../../../lib/supabase.js';
import { getNeighborhoodName, getBoroughName, getPropertyTypeLabel, initializeLookups, isInitialized } from '../../../lib/dataLookups.js';
import { fetchPhotoUrls, extractPhotos, fetchHostData, parseAmenities } from '../../../lib/supabaseUtils.js';
// NOTE: adaptDaysToBubble removed - database now uses 0-indexed days natively
import { createDay } from '../../../lib/scheduleSelector/dayHelpers.js';
import { calculateNextAvailableCheckIn } from '../../../logic/calculators/scheduling/calculateNextAvailableCheckIn.js';
import { shiftMoveInDateIfPast } from '../../../logic/calculators/scheduling/shiftMoveInDateIfPast.js';
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
function PropertyCard({ listing, onLocationClick, onOpenContactModal, onOpenInfoModal, isLoggedIn, isFavorited, onToggleFavorite, userId, proposalForListing, onCreateProposal, onPhotoClick }) {
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
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (onPhotoClick) {
                onPhotoClick(listing, currentImageIndex);
              }
            }}
            style={{ cursor: 'pointer' }}
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
 * @param {Function} onPhotoClick - Handler to open fullscreen photo gallery
 */
function ListingsGrid({ listings, onOpenContactModal, onOpenInfoModal, mapRef, isLoggedIn, onToggleFavorite, userId, proposalsByListingId, onCreateProposal, onPhotoClick }) {
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
            onPhotoClick={onPhotoClick}
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
  const [lastProposalDefaults, setLastProposalDefaults] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successProposalId, setSuccessProposalId] = useState(null);
  const [isSubmittingProposal, setIsSubmittingProposal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Photo gallery modal state
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [selectedListingPhotos, setSelectedListingPhotos] = useState([]);
  const [selectedListingName, setSelectedListingName] = useState('');

  // Close photo modal on ESC key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && showPhotoModal) {
        setShowPhotoModal(false);
      }
    };

    if (showPhotoModal) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showPhotoModal]);

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
      isNew: false,

      // Original pricing fields for CreateProposalFlowV2 / DaysSelectionSection
      '💰Nightly Host Rate for 2 nights': dbListing['💰Nightly Host Rate for 2 nights'],
      '💰Nightly Host Rate for 3 nights': dbListing['💰Nightly Host Rate for 3 nights'],
      '💰Nightly Host Rate for 4 nights': dbListing['💰Nightly Host Rate for 4 nights'],
      '💰Nightly Host Rate for 5 nights': dbListing['💰Nightly Host Rate for 5 nights'],
      '💰Nightly Host Rate for 7 nights': dbListing['💰Nightly Host Rate for 7 nights'],
      '💰Weekly Host Rate': dbListing['💰Weekly Host Rate'],
      '💰Monthly Host Rate': dbListing['💰Monthly Host Rate'],
      '💰Price Override': dbListing['💰Price Override'],
      '💰Cleaning Cost / Maintenance Fee': dbListing['💰Cleaning Cost / Maintenance Fee'],
      '💰Damage Deposit': dbListing['💰Damage Deposit'],
      '💰Unit Markup': dbListing['💰Unit Markup'],
      'rental type': dbListing['rental type'],
      'Weeks offered': dbListing['Weeks offered'],

      // Availability fields for schedule selector
      ' First Available': dbListing[' First Available'],
      'Last Available': dbListing['Last Available'],
      '# of nights available': dbListing['# of nights available'],
      'Active': dbListing['Active'],
      'Approved': dbListing['Approved'],
      'Dates - Blocked': dbListing['Dates - Blocked'],
      'Complete': dbListing['Complete'],
      'confirmedAvailability': dbListing['confirmedAvailability'],
      'NEW Date Check-in Time': dbListing['NEW Date Check-in Time'],
      'NEW Date Check-out Time': dbListing['NEW Date Check-out Time'],
      'Nights Available (numbers)': dbListing['Nights Available (numbers)'],
      'Minimum Nights': dbListing['Minimum Nights'],
      'Maximum Nights': dbListing['Maximum Nights'],
      'Days Available (List of Days)': dbListing['Days Available (List of Days)']
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

        // ========================================================================
        // GOLD STANDARD AUTH PATTERN - Step 2: Deep validation with clearOnFailure: false
        // ========================================================================
        const userData = await validateTokenAndFetchUser({ clearOnFailure: false });
        let sessionId = getSessionId();
        let finalUserId = sessionId;

        if (userData) {
          // Success path: Use validated user data
          finalUserId = sessionId || userData.userId || userData._id;
          setUserId(finalUserId);
          setCurrentUser({
            id: finalUserId,
            name: userData.fullName || userData.firstName || '',
            email: userData.email || '',
            userType: userData.userType || 'GUEST',
            avatarUrl: userData.profilePhoto || null
          });
          console.log('[FavoriteListingsPage] User data loaded:', userData.firstName);

          // Fetch user profile + counts from junction tables (Phase 5b migration)
          try {
            const [profileResult, countsResult] = await Promise.all([
              supabase
                .from('user')
                .select('"About Me / Bio", "need for Space", "special needs"')
                .eq('_id', finalUserId)
                .single(),
              supabase.rpc('get_user_junction_counts', { p_user_id: finalUserId })
            ]);

            if (!profileResult.error && profileResult.data) {
              const junctionCounts = countsResult.data?.[0] || {};
              const proposalCount = Number(junctionCounts.proposals_count) || 0;
              setLoggedInUserData({
                aboutMe: profileResult.data['About Me / Bio'] || '',
                needForSpace: profileResult.data['need for Space'] || '',
                specialNeeds: profileResult.data['special needs'] || '',
                proposalCount: proposalCount
              });

              // Fetch last proposal defaults for pre-population
              const proposalDefaults = await fetchLastProposalDefaults(finalUserId);
              if (proposalDefaults) {
                setLastProposalDefaults(proposalDefaults);
                console.log('[FavoriteListingsPage] Loaded last proposal defaults:', proposalDefaults);
              }
            }
          } catch (e) {
            console.warn('Failed to fetch user proposal data:', e);
          }
        } else {
          // ========================================================================
          // GOLD STANDARD AUTH PATTERN - Step 3: Fallback to Supabase session metadata
          // ========================================================================
          const { data: { session } } = await supabase.auth.getSession();

          if (session?.user) {
            // Session valid but profile fetch failed - use session metadata
            finalUserId = session.user.user_metadata?.user_id || getUserId() || session.user.id;
            setUserId(finalUserId);
            setCurrentUser({
              id: finalUserId,
              name: session.user.user_metadata?.full_name || session.user.user_metadata?.first_name || getFirstName() || session.user.email?.split('@')[0] || 'User',
              email: session.user.email || '',
              userType: session.user.user_metadata?.user_type || 'GUEST',
              avatarUrl: session.user.user_metadata?.avatar_url || null
            });
            console.log('[FavoriteListingsPage] Using fallback session data, userId:', finalUserId);
          } else {
            // No valid session - show error
            console.log('[FavoriteListingsPage] No valid session');
            setError('Please log in to view your favorites.');
            setIsLoading(false);
            return;
          }
        }

        if (!finalUserId) {
          setError('Please log in to view your favorites.');
          setIsLoading(false);
          return;
        }

        // Use finalUserId for remaining operations
        sessionId = finalUserId;

        // Fetch user's favorited listing IDs from user table
        let favoritedIds = [];
        try {
          favoritedIds = await getFavoritedListingIds(sessionId);
        } catch (favError) {
          console.error('Error fetching favorites:', favError);
          setError('Failed to load your favorites. Please try again.');
          setIsLoading(false);
          return;
        }

        // Ensure we have an array
        favoritedIds = Array.isArray(favoritedIds) ? favoritedIds : [];

        // Filter to valid Bubble listing IDs
        favoritedIds = favoritedIds.filter(id => typeof id === 'string' && /^\d+x\d+$/.test(id));
        setFavoritedListingIds(new Set(favoritedIds));

        if (favoritedIds.length === 0) {
          setListings([]);
          setIsLoading(false);
          return;
        }

        // Fetch listings data from Supabase (all favorited listings, regardless of Active status, but exclude soft-deleted)
        const { data: listingsData, error: listingsError } = await supabase
          .from('listing')
          .select('*')
          .in('_id', favoritedIds)
          .eq('Deleted', false);

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
          if (listing['Host User']) {
            hostIds.add(listing['Host User']);
          }
        });

        const hostMap = await fetchHostData(Array.from(hostIds));

        // Transform listings
        const transformedListings = listingsData
          .map(listing => {
            const hostId = listing['Host User'];
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

    // Calculate minimum move-in date (2 weeks from today)
    const today = new Date();
    const twoWeeksFromNow = new Date(today);
    twoWeeksFromNow.setDate(today.getDate() + 14);
    const minMoveInDate = twoWeeksFromNow.toISOString().split('T')[0];

    // Determine move-in date: prefer last proposal's date (shifted if needed), fallback to smart calculation
    let smartMoveInDate = minMoveInDate;

    if (lastProposalDefaults?.moveInDate) {
      // Use previous proposal's move-in date, shifted forward if necessary
      smartMoveInDate = shiftMoveInDateIfPast({
        previousMoveInDate: lastProposalDefaults.moveInDate,
        minDate: minMoveInDate
      }) || minMoveInDate;
      console.log('[FavoriteListingsPage] Pre-filling move-in from last proposal:', lastProposalDefaults.moveInDate, '->', smartMoveInDate);
    } else if (initialDays.length > 0) {
      // Fallback: calculate based on selected days
      try {
        const selectedDayIndices = initialDays.map(d => d.dayOfWeek);
        smartMoveInDate = calculateNextAvailableCheckIn({
          selectedDayIndices,
          minDate: minMoveInDate
        });
      } catch (err) {
        console.error('Error calculating smart move-in date:', err);
        smartMoveInDate = minMoveInDate;
      }
    }

    // Determine reservation span: prefer last proposal's span, fallback to default
    const prefillReservationSpan = lastProposalDefaults?.reservationSpanWeeks || 13;

    setSelectedListingForProposal(listing);
    setSelectedDayObjects(initialDays);
    setMoveInDate(smartMoveInDate);
    setReservationSpan(prefillReservationSpan);
    setPriceBreakdown(null); // Will be calculated by ListingScheduleSelector
    setIsProposalModalOpen(true);
  };

  // Handler to open fullscreen photo gallery
  const handlePhotoGalleryOpen = (listing, photoIndex = 0) => {
    if (!listing.images || listing.images.length === 0) return;
    setSelectedListingPhotos(listing.images);
    setSelectedListingName(listing.title || 'Listing');
    setCurrentPhotoIndex(photoIndex);
    setShowPhotoModal(true);
  };

  // Submit proposal to backend
  const submitProposal = async (proposalData) => {
    setIsSubmittingProposal(true);

    try {
      const guestId = getSessionId();
      if (!guestId) {
        throw new Error('User session not found');
      }

      // Days are already in JS format (0-6) - database now uses 0-indexed natively
      const daysInJsFormat = proposalData.daysSelectedObjects?.map(d => d.dayOfWeek) || [];

      // Sort days in JS format first to detect wrap-around (Saturday/Sunday spanning)
      const sortedJsDays = [...daysInJsFormat].sort((a, b) => a - b);

      // Check for wrap-around case (both Saturday=6 and Sunday=0 present, but not all 7 days)
      const hasSaturday = sortedJsDays.includes(6);
      const hasSunday = sortedJsDays.includes(0);
      const isWrapAround = hasSaturday && hasSunday && daysInJsFormat.length < 7;

      let checkInDay, checkOutDay, nightsSelected;

      if (isWrapAround) {
        // Find the gap in the sorted selection to determine wrap-around point
        let gapIndex = -1;
        for (let i = 0; i < sortedJsDays.length - 1; i++) {
          if (sortedJsDays[i + 1] - sortedJsDays[i] > 1) {
            gapIndex = i + 1;
            break;
          }
        }

        if (gapIndex !== -1) {
          // Wrap-around: check-in is the first day after the gap, check-out is the last day before gap
          checkInDay = sortedJsDays[gapIndex];
          checkOutDay = sortedJsDays[gapIndex - 1];

          // Reorder days to be in actual sequence (check-in to check-out)
          const reorderedDays = [...sortedJsDays.slice(gapIndex), ...sortedJsDays.slice(0, gapIndex)];

          // Nights = all days except the last one (checkout day)
          nightsSelected = reorderedDays.slice(0, -1);
        } else {
          // No gap found, use standard logic
          checkInDay = sortedJsDays[0];
          checkOutDay = sortedJsDays[sortedJsDays.length - 1];
          nightsSelected = sortedJsDays.slice(0, -1);
        }
      } else {
        // Standard case: check-in = first day, check-out = last day
        checkInDay = sortedJsDays[0];
        checkOutDay = sortedJsDays[sortedJsDays.length - 1];
        // Nights = all days except the last one (checkout day)
        nightsSelected = sortedJsDays.slice(0, -1);
      }

      // Format reservation span text
      const reservationSpanWeeks = proposalData.reservationSpan || 13;
      const reservationSpanText = reservationSpanWeeks === 13
        ? '13 weeks (3 months)'
        : reservationSpanWeeks === 20
          ? '20 weeks (approx. 5 months)'
          : `${reservationSpanWeeks} weeks`;

      // Build payload (using 0-indexed days)
      const payload = {
        guestId: guestId,
        listingId: selectedListingForProposal._id || selectedListingForProposal.id,
        moveInStartRange: proposalData.moveInDate,
        moveInEndRange: proposalData.moveInDate, // Same as start if no flexibility
        daysSelected: daysInJsFormat,
        nightsSelected: nightsSelected,
        reservationSpan: reservationSpanText,
        reservationSpanWeeks: reservationSpanWeeks,
        checkIn: checkInDay,
        checkOut: checkOutDay,
        proposalPrice: proposalData.pricePerNight,
        fourWeekRent: proposalData.pricePerFourWeeks,
        hostCompensation: proposalData.pricePerFourWeeks, // Same as 4-week rent for now
        needForSpace: proposalData.needForSpace || '',
        aboutMe: proposalData.aboutYourself || '',
        estimatedBookingTotal: proposalData.totalPrice,
        // Optional fields
        specialNeeds: proposalData.hasUniqueRequirements ? proposalData.uniqueRequirements : '',
        moveInRangeText: proposalData.moveInRange || '',
        flexibleMoveIn: !!proposalData.moveInRange,
        fourWeekCompensation: proposalData.pricePerFourWeeks
      };

      console.log('📋 Submitting proposal:', payload);

      const { data, error } = await supabase.functions.invoke('proposal', {
        body: {
          action: 'create',
          payload
        }
      });

      if (error) {
        console.error('❌ Edge Function error:', error);
        throw new Error(error.message || 'Failed to submit proposal');
      }

      if (!data?.success) {
        console.error('❌ Proposal submission failed:', data?.error);
        throw new Error(data?.error || 'Failed to submit proposal');
      }

      console.log('✅ Proposal submitted successfully:', data);
      console.log('   Proposal ID:', data.data?.proposalId);

      // Clear the localStorage draft on successful submission
      clearProposalDraft(proposalData.listingId);

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
      console.error('❌ Error submitting proposal:', error);
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
    // CRITICAL: Use clearOnFailure: false to preserve session if Edge Function fails
    try {
      const userData = await validateTokenAndFetchUser({ clearOnFailure: false });
      const sessionId = getSessionId();

      if (userData) {
        setCurrentUser({
          id: sessionId,
          name: userData.fullName || userData.firstName || '',
          email: userData.email || '',
          userType: userData.userType || 'GUEST',
          avatarUrl: userData.profilePhoto || null
        });

        // Fetch user profile + proposal count from junction tables (Phase 5b migration)
        const [profileResult, countsResult] = await Promise.all([
          supabase
            .from('user')
            .select('"About Me / Bio", "need for Space", "special needs"')
            .eq('_id', sessionId)
            .single(),
          supabase.rpc('get_user_junction_counts', { p_user_id: sessionId })
        ]);

        if (profileResult.data) {
          const junctionCounts = countsResult.data?.[0] || {};
          const proposalCount = Number(junctionCounts.proposals_count) || 0;
          setLoggedInUserData({
            aboutMe: profileResult.data['About Me / Bio'] || '',
            needForSpace: profileResult.data['need for Space'] || '',
            specialNeeds: profileResult.data['special needs'] || '',
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
          {/* ROW 1: Mobile Header - Logo, Explore Rentals, Avatar */}
          <div className="mobile-filter-bar mobile-header-row">
            <a href="/" className="mobile-logo-link" aria-label="Go to homepage">
              <img
                src="/assets/images/split-lease-purple-circle.png"
                alt="Split Lease Logo"
                className="mobile-logo-icon"
                width="28"
                height="28"
              />
            </a>
            <a href="/search" className="filter-toggle-btn explore-rentals-btn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="11" cy="11" r="8" strokeWidth="2" />
                <path d="M21 21l-4.35-4.35" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <span>Explore Rentals</span>
            </a>

            {/* Mobile Header Actions - Auth-aware elements */}
            <div className="mobile-header-actions">
              {isLoggedIn && currentUser ? (
                <>
                  {/* Favorites Heart - Active state since we're on favorites page */}
                  <a href="/favorite-listings" className="mobile-favorites-link active" aria-label="My Favorite Listings">
                    <svg
                      width="22"
                      height="22"
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
                      <span className="mobile-favorites-badge">{listings.length}</span>
                    )}
                  </a>

                  {/* Logged In Avatar */}
                  <LoggedInAvatar
                    user={currentUser}
                    currentPath="/favorite-listings"
                    onNavigate={handleNavigate}
                    onLogout={handleLogout}
                    size="small"
                  />
                </>
              ) : (
                /* Hamburger menu for logged out users */
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

          {/* ROW 2: Map Button Row */}
          <div className="mobile-map-row">
            <button className="map-toggle-btn" onClick={() => setMobileMapVisible(true)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="2" />
                <path d="M9 3v18M15 3v18M3 9h18M3 15h18" strokeWidth="2" />
              </svg>
              <span>Map</span>
            </button>
          </div>

          {/* ROW 3: Mobile Schedule Selector with Check-in/Check-out */}
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
                onPhotoClick={handlePhotoGalleryOpen}
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
        onLoginRequired={() => {
          handleCloseContactModal();
          setShowAuthModal(true);
        }}
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
          isSubmitting={isSubmittingProposal}
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
          hasSubmittedRentalApp={loggedInUserData?.hasSubmittedRentalApp ?? false}
          onClose={() => {
            setShowSuccessModal(false);
            setSuccessProposalId(null);
            setSelectedListingForProposal(null);
          }}
        />
      )}

      {/* Fullscreen Photo Gallery Modal */}
      {showPhotoModal && selectedListingPhotos.length > 0 && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.9)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
          }}
          onClick={() => setShowPhotoModal(false)}
        >
          {/* Close X Button - Top Right */}
          <button
            onClick={() => setShowPhotoModal(false)}
            style={{
              position: 'absolute',
              top: '1rem',
              right: '1rem',
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: 'white',
              fontSize: '2rem',
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1002
            }}
          >
            ×
          </button>

          {/* Main Image */}
          <img
            src={selectedListingPhotos[currentPhotoIndex]}
            alt={`${selectedListingName} - photo ${currentPhotoIndex + 1}`}
            style={{
              maxWidth: '95vw',
              maxHeight: '75vh',
              objectFit: 'contain',
              marginBottom: '5rem'
            }}
            onClick={(e) => e.stopPropagation()}
          />

          {/* Navigation Controls */}
          <div style={{
            position: 'absolute',
            bottom: '4rem',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: '0.5rem',
            alignItems: 'center',
            zIndex: 1001
          }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setCurrentPhotoIndex(prev => (prev > 0 ? prev - 1 : selectedListingPhotos.length - 1));
              }}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                color: 'white',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '0.875rem'
              }}
            >
              ← Previous
            </button>

            <span style={{
              color: 'white',
              fontSize: '0.75rem',
              minWidth: '60px',
              textAlign: 'center'
            }}>
              {currentPhotoIndex + 1} / {selectedListingPhotos.length}
            </span>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setCurrentPhotoIndex(prev => (prev < selectedListingPhotos.length - 1 ? prev + 1 : 0));
              }}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                color: 'white',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '0.875rem'
              }}
            >
              Next →
            </button>
          </div>

          {/* Close Button - Bottom Center */}
          <button
            onClick={() => setShowPhotoModal(false)}
            style={{
              position: 'absolute',
              bottom: '1rem',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'white',
              border: 'none',
              color: '#1f2937',
              padding: '0.5rem 2rem',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '0.875rem',
              zIndex: 1001
            }}
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
};

export default FavoriteListingsPage;
