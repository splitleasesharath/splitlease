import { useState, useEffect, useRef, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import GoogleMap from '../shared/GoogleMap.jsx';
import InformationalText from '../shared/InformationalText.jsx';
import ContactHostMessaging from '../shared/ContactHostMessaging.jsx';
import AiSignupMarketReport from '../shared/AiSignupMarketReport';
import AuthAwareSearchScheduleSelector from '../shared/AuthAwareSearchScheduleSelector.jsx';
import SignUpLoginModal from '../shared/SignUpLoginModal.jsx';
import LoggedInAvatar from '../shared/LoggedInAvatar/LoggedInAvatar.jsx';
import FavoriteButton from '../shared/FavoriteButton';
import { supabase } from '../../lib/supabase.js';
import { checkAuthStatus, validateTokenAndFetchUser, getUserId, logoutUser } from '../../lib/auth.js';
import { PRICE_TIERS, SORT_OPTIONS, WEEK_PATTERNS, LISTING_CONFIG, VIEW_LISTING_URL, SEARCH_URL } from '../../lib/constants.js';
import { initializeLookups, getNeighborhoodName, getBoroughName, getPropertyTypeLabel, isInitialized } from '../../lib/dataLookups.js';
import { parseUrlToFilters, updateUrlParams, watchUrlChanges, hasUrlFilters } from '../../lib/urlParams.js';
import { fetchPhotoUrls, fetchHostData, extractPhotos, parseAmenities, parseJsonArray } from '../../lib/supabaseUtils.js';
import { sanitizeNeighborhoodSearch, sanitizeSearchQuery } from '../../lib/sanitize.js';

// ============================================================================
// Utility Functions
// ============================================================================

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

// ============================================================================
// Internal Components
// ============================================================================

/**
 * MobileFilterBar - Sticky filter button for mobile
 */
function MobileFilterBar({ onFilterClick, onMapClick, isMapVisible }) {
  return (
    <div className="mobile-filter-bar">
      <button className="filter-toggle-btn" onClick={onFilterClick}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M4 6h16M4 12h16M4 18h16" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <span>Filters</span>
      </button>
      <button className="map-toggle-btn" onClick={onMapClick}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="2" />
          <path d="M9 3v18M15 3v18M3 9h18M3 15h18" strokeWidth="2" />
        </svg>
        <span>{isMapVisible ? 'Show Listings' : 'Map'}</span>
      </button>
    </div>
  );
}

/**
 * NeighborhoodCheckboxList - Simple scrollable list with checkboxes
 */
function NeighborhoodCheckboxList({
  neighborhoods,
  selectedNeighborhoods,
  onNeighborhoodsChange,
  id
}) {
  // Toggle neighborhood selection
  const handleToggleNeighborhood = (neighborhoodId) => {
    if (selectedNeighborhoods.includes(neighborhoodId)) {
      onNeighborhoodsChange(selectedNeighborhoods.filter(nId => nId !== neighborhoodId));
    } else {
      onNeighborhoodsChange([...selectedNeighborhoods, neighborhoodId]);
    }
  };

  return (
    <div className="filter-group compact neighborhood-checkbox-list-group">
      <label>Refine Neighborhood(s)</label>

      {/* Scrollable list with checkboxes */}
      <div className="neighborhood-checkbox-list" id={id}>
        {neighborhoods.length === 0 ? (
          <div className="neighborhood-list-empty">Loading neighborhoods...</div>
        ) : (
          neighborhoods.map(neighborhood => (
            <label key={neighborhood.id} className="neighborhood-checkbox-item">
              <input
                type="checkbox"
                checked={selectedNeighborhoods.includes(neighborhood.id)}
                onChange={() => handleToggleNeighborhood(neighborhood.id)}
              />
              <span>{neighborhood.name}</span>
            </label>
          ))
        )}
      </div>

      {selectedNeighborhoods.length > 0 && (
        <div className="neighborhood-selection-count">
          {selectedNeighborhoods.length} selected
        </div>
      )}
    </div>
  );
}

function NeighborhoodDropdownFilter({
  neighborhoods,
  selectedNeighborhoods,
  onNeighborhoodsChange,
  neighborhoodSearch,
  onNeighborhoodSearchChange,
  searchInputId
}) {
  const inputId = searchInputId || 'neighborhoodSearch';

  const handleNeighborhoodToggle = (neighborhoodId) => {
    const isSelected = selectedNeighborhoods.includes(neighborhoodId);
    if (isSelected) {
      onNeighborhoodsChange(selectedNeighborhoods.filter(id => id !== neighborhoodId));
    } else {
      onNeighborhoodsChange([...selectedNeighborhoods, neighborhoodId]);
    }
  };

  const handleRemoveNeighborhood = (neighborhoodId) => {
    onNeighborhoodsChange(selectedNeighborhoods.filter(id => id !== neighborhoodId));
  };

  const sanitizedSearch = sanitizeNeighborhoodSearch(neighborhoodSearch || '');

  const filteredNeighborhoods = neighborhoods.filter((n) => {
    if (!sanitizedSearch) {
      return true;
    }
    return n.name.toLowerCase().includes(sanitizedSearch.toLowerCase());
  });

  const inputRef = useRef(null);

  const handleContainerClick = (e) => {
    // Focus the input when clicking on the container
    if (inputRef.current && e.target.closest('.neighborhood-dropdown-container')) {
      inputRef.current.focus();
    }
  };

  return (
    <div className="filter-group compact neighborhoods-group">
      <label htmlFor={inputId}>Refine Neighborhood(s)</label>
      <div
        className="neighborhood-dropdown-container"
        onClick={handleContainerClick}
      >
        {selectedNeighborhoods.length > 0 && (
          <div className="selected-neighborhoods-chips">
            {selectedNeighborhoods.map(id => {
              const neighborhood = neighborhoods.find(n => n.id === id);
              if (!neighborhood) return null;

              return (
                <div key={id} className="neighborhood-chip">
                  <span>{neighborhood.name}</span>
                  <button
                    type="button"
                    className="neighborhood-chip-remove"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveNeighborhood(id);
                    }}
                    aria-label={`Remove ${neighborhood.name}`}
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        )}
        <input
          ref={inputRef}
          type="text"
          id={inputId}
          placeholder={selectedNeighborhoods.length > 0 ? "" : "Search neighborhoods..."}
          className="neighborhood-search"
          value={neighborhoodSearch}
          onChange={(e) => onNeighborhoodSearchChange(e.target.value)}
        />
      </div>

      <div className="neighborhood-list">
        {filteredNeighborhoods.length === 0 ? (
          <div style={{ padding: '10px', color: '#666' }}>
            {neighborhoods.length === 0 ? 'Loading neighborhoods...' : 'No neighborhoods found'}
          </div>
        ) : (
          filteredNeighborhoods.map(neighborhood => (
            <label key={neighborhood.id}>
              <input
                type="checkbox"
                value={neighborhood.id}
                checked={selectedNeighborhoods.includes(neighborhood.id)}
                onChange={() => handleNeighborhoodToggle(neighborhood.id)}
              />
              {neighborhood.name}
            </label>
          ))
        )}
      </div>
    </div>
  );
}

/**
 * FilterPanel - Left sidebar with filters
 */
function FilterPanel({
  isActive,
  selectedDays,
  onDaysChange,
  boroughs,
  selectedBorough,
  onBoroughChange,
  neighborhoods,
  selectedNeighborhoods,
  onNeighborhoodsChange,
  weekPattern,
  onWeekPatternChange,
  priceTier,
  onPriceTierChange,
  sortBy,
  onSortByChange
}) {
  return (
    <div className={`filter-panel ${isActive ? 'active' : ''}`}>
      <div className="filter-container">
        {/* Single Horizontal Filter Row - All filters inline */}
        <div className="horizontal-filters">
          {/* Borough Select */}
          <div className="filter-group compact">
            <label htmlFor="boroughSelect">Select Borough</label>
            <select
              id="boroughSelect"
              className="filter-select"
              value={selectedBorough}
              onChange={(e) => onBoroughChange(e.target.value)}
            >
              {boroughs.length === 0 ? (
                <option value="">Loading boroughs...</option>
              ) : (
                boroughs.map(borough => (
                  <option key={borough.id} value={borough.value}>
                    {borough.name}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Week Pattern */}
          <div className="filter-group compact">
            <label htmlFor="weekPattern">Select Week Pattern</label>
            <select
              id="weekPattern"
              className="filter-select"
              value={weekPattern}
              onChange={(e) => onWeekPatternChange(e.target.value)}
              aria-label="Filter by week pattern"
            >
              <option value="every-week">Every week</option>
              <option value="one-on-off">One week on, one week off</option>
              <option value="two-on-off">Two weeks on, two weeks off</option>
              <option value="one-three-off">One week on, three weeks off</option>
            </select>
          </div>

          {/* Price Tier */}
          <div className="filter-group compact">
            <label htmlFor="priceTier">Select Price Tier</label>
            <select
              id="priceTier"
              className="filter-select"
              value={priceTier}
              onChange={(e) => onPriceTierChange(e.target.value)}
              aria-label="Filter by price range"
            >
              <option value="under-200">&lt; $200/night</option>
              <option value="200-350">$200-$350/night</option>
              <option value="350-500">$350-$500/night</option>
              <option value="500-plus">$500+/night</option>
              <option value="all">All Prices</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="filter-group compact">
            <label htmlFor="sortBy">Sort By</label>
            <select
              id="sortBy"
              className="filter-select"
              value={sortBy}
              onChange={(e) => onSortByChange(e.target.value)}
              aria-label="Sort listings by"
            >
              <option value="recommended">Our Recommendations</option>
              <option value="price-low">Price-Lowest to Highest</option>
              <option value="most-viewed">Most Viewed</option>
              <option value="recent">Recently Added</option>
            </select>
          </div>

          {/* Neighborhood Dropdown */}
          <div className="filter-group compact">
            <label htmlFor="neighborhoodSelectMobile">Neighborhood</label>
            <select
              id="neighborhoodSelectMobile"
              className="filter-select"
              value={selectedNeighborhoods[0] || ''}
              onChange={(e) => {
                const value = e.target.value;
                onNeighborhoodsChange(value ? [value] : []);
              }}
            >
              <option value="">All Neighborhoods</option>
              {neighborhoods.map(neighborhood => (
                <option key={neighborhood.id} value={neighborhood.id}>
                  {neighborhood.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * PropertyCard - Individual listing card
 */
function PropertyCard({ listing, onLocationClick, onOpenContactModal, onOpenInfoModal, isLoggedIn, isFavorited, userId, onToggleFavorite, onRequireAuth }) {
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

  // Get listing ID for FavoriteButton
  const favoriteListingId = listing.id || listing._id;

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
            onRequireAuth={onRequireAuth}
            size="medium"
          />
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
                {listing.host.verified && <span className="verified-badge" title="Verified">✓</span>}
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
 * ListingsGrid - Grid of property cards with lazy loading
 */
function ListingsGrid({ listings, onLoadMore, hasMore, isLoading, onOpenContactModal, onOpenInfoModal, mapRef, isLoggedIn, userId, favoritedListingIds, onToggleFavorite, onRequireAuth }) {

  const sentinelRef = useRef(null);

  useEffect(() => {
    if (!sentinelRef.current || !hasMore || isLoading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onLoadMore();
        }
      },
      {
        root: null,
        rootMargin: '100px',
        threshold: 0.1
      }
    );

    observer.observe(sentinelRef.current);

    return () => {
      if (sentinelRef.current) {
        observer.unobserve(sentinelRef.current);
      }
    };
  }, [hasMore, isLoading, onLoadMore]);

  return (
    <div className="listings-container">
      {listings.map((listing, index) => {
        const listingId = listing.id || listing._id;
        const isFavorited = favoritedListingIds?.has(listingId);
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
            isFavorited={isFavorited}
            userId={userId}
            onToggleFavorite={onToggleFavorite}
            onRequireAuth={onRequireAuth}
          />
        );
      })}

      {hasMore && (
        <div ref={sentinelRef} className="lazy-load-sentinel">
          <div className="loading-more">
            <div className="spinner"></div>
            <span>Loading more listings...</span>
          </div>
        </div>
      )}
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
      <h3>Unable to Load Listings</h3>
      <p>{message || 'Failed to load listings. Please try again.'}</p>
      {onRetry && (
        <button className="retry-btn" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}

/**
 * EmptyState - No results found message
 */
function EmptyState({ onResetFilters }) {
  return (
    <div className="no-results-notice">
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </svg>
      <h3>No Listings Found</h3>
      <p>No listings match your current filters. Try adjusting your selection.</p>
      <button className="reset-filters-btn" onClick={onResetFilters}>
        Reset Filters
      </button>
    </div>
  );
}

// ============================================================================
// Main SearchPage Component
// ============================================================================

export default function SearchPage() {
  // State management
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [allActiveListings, setAllActiveListings] = useState([]); // ALL active listings (green pins, no filters)
  const [allListings, setAllListings] = useState([]); // Filtered listings (purple pins)
  const [displayedListings, setDisplayedListings] = useState([]); // Lazy-loaded subset for cards
  const [loadedCount, setLoadedCount] = useState(0);
  const [fallbackListings, setFallbackListings] = useState([]); // All listings shown when filtered results are empty
  const [fallbackDisplayedListings, setFallbackDisplayedListings] = useState([]); // Lazy-loaded subset for fallback
  const [fallbackLoadedCount, setFallbackLoadedCount] = useState(0);
  const [isFallbackLoading, setIsFallbackLoading] = useState(false);

  // Modal state management
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [isAIResearchModalOpen, setIsAIResearchModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalView, setAuthModalView] = useState('login');
  const [selectedListing, setSelectedListing] = useState(null);
  const [infoModalTriggerRef, setInfoModalTriggerRef] = useState(null);
  const [informationalTexts, setInformationalTexts] = useState({});

  // Refs
  const mapRef = useRef(null);
  const fetchInProgressRef = useRef(false); // Track if fetch is already in progress
  const lastFetchParamsRef = useRef(null); // Track last fetch parameters to prevent duplicates

  // Parse URL parameters for initial filter state
  const urlFilters = parseUrlToFilters();

  // Filter state (initialized from URL if available)
  const [boroughs, setBoroughs] = useState([]);
  const [selectedBorough, setSelectedBorough] = useState(urlFilters.selectedBorough);
  const [neighborhoods, setNeighborhoods] = useState([]);
  const [selectedNeighborhoods, setSelectedNeighborhoods] = useState(urlFilters.selectedNeighborhoods);
  const [weekPattern, setWeekPattern] = useState(urlFilters.weekPattern);
  const [priceTier, setPriceTier] = useState(urlFilters.priceTier);
  const [sortBy, setSortBy] = useState(urlFilters.sortBy);
  const [neighborhoodSearch, setNeighborhoodSearch] = useState('');

  // UI state
  const [filterPanelActive, setFilterPanelActive] = useState(false);
  const [mapSectionActive, setMapSectionActive] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileMapVisible, setMobileMapVisible] = useState(false);

  // Auth state
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [favoritedListingIds, setFavoritedListingIds] = useState(new Set());

  // Toast notification state
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // Flag to prevent URL update on initial load
  const isInitialMount = useRef(true);

  // Initialize data lookups on mount
  useEffect(() => {
    const init = async () => {
      if (!isInitialized()) {
        console.log('Initializing data lookups...');
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

  // Check authentication status and fetch user data
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const authenticated = await checkAuthStatus();
        setIsLoggedIn(authenticated);

        if (authenticated) {
          // Validate token and get user data
          const userData = await validateTokenAndFetchUser();
          if (userData) {
            const userId = getUserId();
            setCurrentUser({
              id: userId,
              name: userData.fullName || userData.firstName || '',
              email: userData.email || '',
              userType: userData.userType || 'GUEST',
              avatarUrl: userData.profilePhoto || null
            });

            // Fetch favorites from Supabase - only count ACTIVE listings
            if (userId) {
              const { data: userFavorites, error } = await supabase
                .from('user')
                .select('"Favorited Listings"')
                .eq('_id', userId)
                .single();

              if (!error && userFavorites) {
                const favorites = userFavorites['Favorited Listings'];
                if (Array.isArray(favorites)) {
                  // Filter to only valid Bubble listing IDs (pattern: digits + 'x' + digits)
                  const validFavorites = favorites.filter(id =>
                    typeof id === 'string' && /^\d+x\d+$/.test(id)
                  );

                  // Store all favorited IDs for heart icon state (includes inactive)
                  setFavoritedListingIds(new Set(validFavorites));

                  // Count only ACTIVE favorites for the header badge
                  if (validFavorites.length > 0) {
                    const { data: activeListings, error: activeError } = await supabase
                      .from('listing')
                      .select('_id')
                      .in('_id', validFavorites)
                      .eq('Active', true);

                    if (!activeError && activeListings) {
                      setFavoritesCount(activeListings.length);
                      console.log('[SearchPage] Active favorites count:', activeListings.length, 'of', validFavorites.length, 'total');
                    } else {
                      setFavoritesCount(validFavorites.length);
                    }
                  } else {
                    setFavoritesCount(0);
                  }
                } else {
                  setFavoritesCount(0);
                  setFavoritedListingIds(new Set());
                }
              }
            }
          }
        }
      } catch (error) {
        console.error('[SearchPage] Auth check error:', error);
        setIsLoggedIn(false);
        setCurrentUser(null);
      }
    };

    checkAuth();
  }, []);

  // Fetch ALL active listings for green markers (NO FILTERS - runs once on mount)
  useEffect(() => {
    const fetchAllActiveListings = async () => {
      console.log('🌍 Fetching ALL active listings for map background (green pins)...');

      try {
        const { data, error } = await supabase
          .from('listing')
          .select('*')
          .eq('Active', true)
          .eq('isForUsability', false)
          .or('"Location - Address".not.is.null,"Location - slightly different address".not.is.null');

        if (error) throw error;

        console.log('📊 fetchAllActiveListings: Supabase returned', data.length, 'active listings');

        // Batch fetch photos for all listings
        const allPhotoIds = new Set();
        data.forEach(listing => {
          const photosField = listing['Features - Photos'];
          if (Array.isArray(photosField)) {
            photosField.forEach(id => allPhotoIds.add(id));
          } else if (typeof photosField === 'string') {
            try {
              const parsed = JSON.parse(photosField);
              if (Array.isArray(parsed)) {
                parsed.forEach(id => allPhotoIds.add(id));
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        });

        const photoMap = await fetchPhotoUrls(Array.from(allPhotoIds));

        // Extract photos per listing
        const resolvedPhotos = {};
        data.forEach(listing => {
          resolvedPhotos[listing._id] = extractPhotos(
            listing['Features - Photos'],
            photoMap,
            listing._id
          );
        });

        // Batch fetch host data
        const hostIds = new Set();
        data.forEach(listing => {
          if (listing['Host / Landlord']) {
            hostIds.add(listing['Host / Landlord']);
          }
        });

        const hostMap = await fetchHostData(Array.from(hostIds));

        // Map host data to listings
        const resolvedHosts = {};
        data.forEach(listing => {
          const hostId = listing['Host / Landlord'];
          resolvedHosts[listing._id] = hostMap[hostId] || null;
        });

        // Transform listings
        const transformedListings = data.map(listing =>
          transformListing(listing, resolvedPhotos[listing._id], resolvedHosts[listing._id])
        );

        // Filter to only listings with valid coordinates (NO FALLBACK)
        const listingsWithCoordinates = transformedListings.filter(listing => {
          const hasValidCoords = listing.coordinates && listing.coordinates.lat && listing.coordinates.lng;
          if (!hasValidCoords) {
            console.warn('⚠️ fetchAllActiveListings: Excluding listing without coordinates:', {
              id: listing.id,
              title: listing.title
            });
          }
          return hasValidCoords;
        });

        console.log(`✅ Fetched ${listingsWithCoordinates.length} active listings with coordinates for green markers`);
        setAllActiveListings(listingsWithCoordinates);
      } catch (error) {
        console.error('❌ Failed to fetch all active listings:', error);
        // Don't set error state - this shouldn't block the page, filtered results will still work
      }
    };

    fetchAllActiveListings();
  }, []); // Run once on mount

  // Sync filter state to URL parameters
  useEffect(() => {
    // Skip URL update on initial mount (URL already parsed)
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    // Update URL with current filter state
    const filters = {
      selectedBorough,
      weekPattern,
      priceTier,
      sortBy,
      selectedNeighborhoods
    };

    updateUrlParams(filters, false); // false = push new history entry
  }, [selectedBorough, weekPattern, priceTier, sortBy, selectedNeighborhoods]);

  // Watch for browser back/forward navigation
  useEffect(() => {
    const cleanup = watchUrlChanges((newFilters) => {
      console.log('URL changed via browser navigation, updating filters:', newFilters);

      // Update all filter states from URL
      setSelectedBorough(newFilters.selectedBorough);
      setWeekPattern(newFilters.weekPattern);
      setPriceTier(newFilters.priceTier);
      setSortBy(newFilters.sortBy);
      setSelectedNeighborhoods(newFilters.selectedNeighborhoods);
    });

    return cleanup;
  }, []);

  // Load boroughs on mount
  useEffect(() => {
    const loadBoroughs = async () => {
      try {
        console.log('[DEBUG] Loading boroughs from zat_geo_borough_toplevel...');
        const { data, error } = await supabase
          .from('zat_geo_borough_toplevel')
          .select('_id, "Display Borough"')
          .order('"Display Borough"', { ascending: true });

        if (error) throw error;

        console.log('[DEBUG] Raw borough data from Supabase:', data);

        const boroughList = data
          .filter(b => b['Display Borough'] && b['Display Borough'].trim())
          .map(b => ({
            id: b._id,
            name: b['Display Borough'].trim(),
            value: b['Display Borough'].trim().toLowerCase()
              .replace(/\s+county\s+nj/i, '')
              .replace(/\s+/g, '-')
          }));

        console.log('[DEBUG] Processed borough list:', boroughList.map(b => ({
          id: b.id,
          name: b.name,
          value: b.value
        })));

        setBoroughs(boroughList);

        // Only set default borough if not already set from URL
        if (!selectedBorough) {
          const manhattan = boroughList.find(b => b.value === 'manhattan');
          if (manhattan) {
            setSelectedBorough(manhattan.value);
          }
        } else {
          // Validate borough from URL exists in list
          const boroughExists = boroughList.find(b => b.value === selectedBorough);
          if (!boroughExists) {
            console.warn(`Borough "${selectedBorough}" from URL not found, defaulting to Manhattan`);
            const manhattan = boroughList.find(b => b.value === 'manhattan');
            if (manhattan) {
              setSelectedBorough(manhattan.value);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load boroughs:', err);
      }
    };

    loadBoroughs();
  }, []);

  // Load neighborhoods when borough changes
  useEffect(() => {
    const loadNeighborhoods = async () => {
      console.log('[DEBUG] loadNeighborhoods called - selectedBorough:', selectedBorough, 'boroughs.length:', boroughs.length);

      if (!selectedBorough || boroughs.length === 0) {
        console.log('[DEBUG] Skipping neighborhood load - missing selectedBorough or boroughs');
        return;
      }

      const borough = boroughs.find(b => b.value === selectedBorough);
      if (!borough) {
        console.warn('[DEBUG] Borough not found for value:', selectedBorough);
        console.log('[DEBUG] Available borough values:', boroughs.map(b => b.value));
        return;
      }

      console.log('[DEBUG] Loading neighborhoods for borough:', {
        boroughName: borough.name,
        boroughId: borough.id,
        boroughIdType: typeof borough.id,
        boroughValue: borough.value
      });

      try {
        // First, let's see what neighborhoods exist without filtering
        const { data: allNeighborhoods, error: allError } = await supabase
          .from('zat_geo_hood_mediumlevel')
          .select('_id, Display, "Geo-Borough"')
          .limit(5);

        console.log('[DEBUG] Sample neighborhoods (first 5):', allNeighborhoods?.map(n => ({
          id: n._id,
          name: n.Display,
          geoBoroughValue: n['Geo-Borough'],
          geoBoroughType: typeof n['Geo-Borough']
        })));

        // Now query with the filter
        const { data, error } = await supabase
          .from('zat_geo_hood_mediumlevel')
          .select('_id, Display, "Geo-Borough"')
          .eq('"Geo-Borough"', borough.id)
          .order('Display', { ascending: true });

        if (error) throw error;

        console.log(`[DEBUG] Found ${data.length} neighborhoods for ${borough.name}:`,
          data.slice(0, 5).map(n => ({ id: n._id, name: n.Display, boroughRef: n['Geo-Borough'] }))
        );

        // Debug: Check if borough.id matches any Geo-Borough values
        if (data.length === 0 && allNeighborhoods && allNeighborhoods.length > 0) {
          console.warn('[DEBUG] No neighborhoods found! Comparing IDs:');
          console.log('[DEBUG] Looking for borough.id:', borough.id);
          console.log('[DEBUG] Sample Geo-Borough values:', allNeighborhoods.map(n => n['Geo-Borough']));
          console.log('[DEBUG] ID match check:', allNeighborhoods.some(n => n['Geo-Borough'] === borough.id));
        }

        const neighborhoodList = data
          .filter(n => n.Display && n.Display.trim())
          .map(n => ({
            id: n._id,
            name: n.Display.trim(),
            boroughId: n['Geo-Borough']
          }));

        setNeighborhoods(neighborhoodList);
        setSelectedNeighborhoods([]); // Clear selections when borough changes
      } catch (err) {
        console.error('Failed to load neighborhoods:', err);
      }
    };

    loadNeighborhoods();
  }, [selectedBorough, boroughs]);

  // Fetch listings with filters
  const fetchListings = useCallback(async () => {
    if (boroughs.length === 0 || !selectedBorough) return;

    // Performance optimization: Prevent duplicate fetches
    const fetchParams = `${selectedBorough}-${selectedNeighborhoods.join(',')}-${weekPattern}-${priceTier}-${sortBy}`;

    // Skip if same parameters are already being fetched or were just fetched
    if (fetchInProgressRef.current) {
      if (import.meta.env.DEV) {
        console.log('⏭️ Skipping duplicate fetch - already in progress');
      }
      return;
    }

    if (lastFetchParamsRef.current === fetchParams) {
      if (import.meta.env.DEV) {
        console.log('⏭️ Skipping duplicate fetch - same parameters as last fetch');
      }
      return;
    }

    fetchInProgressRef.current = true;
    lastFetchParamsRef.current = fetchParams;

    if (import.meta.env.DEV) {
      console.log('🔍 Starting fetch:', fetchParams);
    }

    setIsLoading(true);
    setError(null);

    try {
      const borough = boroughs.find(b => b.value === selectedBorough);
      if (!borough) throw new Error('Borough not found');

      // Build query
      // CRITICAL FIX: Use Complete=true instead of Active=true to match Bubble's filter logic
      // Bubble shows listings where Complete=true AND (Active=true OR Active IS NULL)
      // Note: The column name "Active" needs quotes in the .or() syntax
      // PHOTO CONSTRAINT: Listings without photos cannot appear in search results
      let query = supabase
        .from('listing')
        .select('*')
        .eq('"Complete"', true)
        .or('"Active".eq.true,"Active".is.null')
        .eq('"Location - Borough"', borough.id)
        .or('"Location - Address".not.is.null,"Location - slightly different address".not.is.null')
        .not('"Features - Photos"', 'is', null);

      // Apply week pattern filter
      if (weekPattern !== 'every-week') {
        const weekPatternText = WEEK_PATTERNS[weekPattern];
        if (weekPatternText) {
          query = query.eq('"Weeks offered"', weekPatternText);
        }
      }

      // Apply price filter
      if (priceTier !== 'all') {
        const priceRange = PRICE_TIERS[priceTier];
        if (priceRange) {
          query = query
            .gte('"Standarized Minimum Nightly Price (Filter)"', priceRange.min)
            .lte('"Standarized Minimum Nightly Price (Filter)"', priceRange.max);
        }
      }

      // Apply neighborhood filter
      if (selectedNeighborhoods.length > 0) {
        query = query.in('"Location - Hood"', selectedNeighborhoods);
      }

      // Apply sorting
      const sortConfig = SORT_OPTIONS[sortBy] || SORT_OPTIONS.recommended;
      query = query.order(sortConfig.field, { ascending: sortConfig.ascending });

      const { data, error } = await query;

      if (error) throw error;

      console.log('📊 SearchPage: Supabase query returned', data.length, 'listings');
      console.log('📍 SearchPage: First 3 raw listings from DB:', data.slice(0, 3).map(l => ({
        id: l._id,
        name: l.Name,
        locationAddress: l['Location - Address'],
        lat: l['Location - Address']?.lat,
        lng: l['Location - Address']?.lng,
        hasLat: !!l['Location - Address']?.lat,
        hasLng: !!l['Location - Address']?.lng
      })));

      // Check coordinate coverage
      const listingsWithCoords = data.filter(l => l['Location - Address']?.lat && l['Location - Address']?.lng);
      const listingsWithoutCoords = data.filter(l => !l['Location - Address']?.lat || !l['Location - Address']?.lng);
      console.log('📍 SearchPage: Coordinate coverage:', {
        total: data.length,
        withCoordinates: listingsWithCoords.length,
        withoutCoordinates: listingsWithoutCoords.length,
        percentageWithCoords: ((listingsWithCoords.length / data.length) * 100).toFixed(1) + '%'
      });

      if (listingsWithoutCoords.length > 0) {
        console.error('❌ SearchPage: Listings WITHOUT coordinates:', listingsWithoutCoords.map(l => ({
          id: l._id,
          name: l.Name,
          locationAddress: l['Location - Address'],
          lat: l['Location - Address']?.lat,
          lng: l['Location - Address']?.lng
        })));
      }

      // Batch fetch photos for all listings
      const allPhotoIds = new Set();
      data.forEach(listing => {
        const photosField = listing['Features - Photos'];
        if (Array.isArray(photosField)) {
          photosField.forEach(id => allPhotoIds.add(id));
        } else if (typeof photosField === 'string') {
          try {
            const parsed = JSON.parse(photosField);
            if (Array.isArray(parsed)) {
              parsed.forEach(id => allPhotoIds.add(id));
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
      });

      const photoMap = await fetchPhotoUrls(Array.from(allPhotoIds));

      // Extract photos per listing
      const resolvedPhotos = {};
      data.forEach(listing => {
        resolvedPhotos[listing._id] = extractPhotos(
          listing['Features - Photos'],
          photoMap,
          listing._id
        );
      });

      // Batch fetch host data for all listings
      const hostIds = new Set();
      data.forEach(listing => {
        if (listing['Host / Landlord']) {
          hostIds.add(listing['Host / Landlord']);
        }
      });

      const hostMap = await fetchHostData(Array.from(hostIds));

      // Map host data to listings
      const resolvedHosts = {};
      data.forEach(listing => {
        const hostId = listing['Host / Landlord'];
        resolvedHosts[listing._id] = hostMap[hostId] || null;
      });

      // Transform and filter data
      console.log('🔄 SearchPage: Starting transformation of', data.length, 'listings');
      const transformedListings = data.map(listing =>
        transformListing(listing, resolvedPhotos[listing._id], resolvedHosts[listing._id])
      );
      console.log('✅ SearchPage: Transformation complete. Transformed', transformedListings.length, 'listings');
      console.log('📍 SearchPage: First 3 transformed listings:', transformedListings.slice(0, 3).map(l => ({
        id: l.id,
        title: l.title,
        coordinates: l.coordinates,
        hasValidCoords: !!(l.coordinates?.lat && l.coordinates?.lng)
      })));

      // Filter out listings without valid coordinates (NO FALLBACK - coordinates are required)
      const listingsWithCoordinates = transformedListings.filter(listing => {
        const hasValidCoords = listing.coordinates && listing.coordinates.lat && listing.coordinates.lng;
        if (!hasValidCoords) {
          console.warn('⚠️ SearchPage: Excluding listing without valid coordinates:', {
            id: listing.id,
            title: listing.title,
            coordinates: listing.coordinates
          });
        }
        return hasValidCoords;
      });

      console.log('📍 SearchPage: Coordinate filter results:', {
        before: transformedListings.length,
        after: listingsWithCoordinates.length,
        excluded: transformedListings.length - listingsWithCoordinates.length
      });

      // PHOTO CONSTRAINT: Filter out listings without photos
      const listingsWithPhotos = listingsWithCoordinates.filter(listing => {
        const hasPhotos = listing.images && listing.images.length > 0;
        if (!hasPhotos) {
          console.warn('⚠️ SearchPage: Excluding listing without photos:', {
            id: listing.id,
            title: listing.title,
            imageCount: listing.images?.length || 0
          });
        }
        return hasPhotos;
      });

      console.log('📸 SearchPage: Photo filter results:', {
        before: listingsWithCoordinates.length,
        after: listingsWithPhotos.length,
        excluded: listingsWithCoordinates.length - listingsWithPhotos.length
      });

      // No day filtering applied - show all listings with valid coordinates and photos
      const filteredListings = listingsWithPhotos;

      console.log('📊 SearchPage: Final filtered listings being set to state:', {
        count: filteredListings.length,
        firstThree: filteredListings.slice(0, 3).map(l => ({
          id: l.id,
          title: l.title,
          coordinates: l.coordinates,
          hasValidCoords: !!(l.coordinates?.lat && l.coordinates?.lng)
        }))
      });

      setAllListings(filteredListings);
      setLoadedCount(0);

      console.log('✅ SearchPage: State updated with', filteredListings.length, 'filtered listings');
    } catch (err) {
      // Log technical details for debugging
      console.error('Failed to fetch listings:', {
        message: err.message,
        stack: err.stack,
        timestamp: new Date().toISOString(),
        filters: {
          borough: selectedBorough,
          neighborhoods: selectedNeighborhoods,
          weekPattern,
          priceTier
        }
      });

      // Show user-friendly error message (NO FALLBACK - acknowledge the real problem)
      setError('We had trouble loading listings. Please try refreshing the page or adjusting your filters.');
    } finally {
      setIsLoading(false);
      fetchInProgressRef.current = false;
    }
  }, [boroughs, selectedBorough, selectedNeighborhoods, weekPattern, priceTier, sortBy]);

  // Fetch all listings with basic constraints only (for fallback display when filtered results are empty)
  const fetchAllListings = useCallback(async () => {
    setIsFallbackLoading(true);

    try {
      // Build query with ONLY basic constraints - no borough, neighborhood, price, or week pattern filters
      const query = supabase
        .from('listing')
        .select('*')
        .eq('"Complete"', true)
        .or('"Active".eq.true,"Active".is.null')
        .or('"Location - Address".not.is.null,"Location - slightly different address".not.is.null')
        .not('"Features - Photos"', 'is', null)
        .order('"Modified Date"', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      console.log('📊 SearchPage: Fallback query returned', data.length, 'listings');

      // Batch fetch photos for all listings
      const allPhotoIds = new Set();
      data.forEach(listing => {
        const photosField = listing['Features - Photos'];
        if (Array.isArray(photosField)) {
          photosField.forEach(id => allPhotoIds.add(id));
        } else if (typeof photosField === 'string') {
          try {
            const parsed = JSON.parse(photosField);
            if (Array.isArray(parsed)) {
              parsed.forEach(id => allPhotoIds.add(id));
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
      });

      const photoMap = await fetchPhotoUrls(Array.from(allPhotoIds));

      // Extract photos per listing
      const resolvedPhotos = {};
      data.forEach(listing => {
        resolvedPhotos[listing._id] = extractPhotos(
          listing['Features - Photos'],
          photoMap,
          listing._id
        );
      });

      // Batch fetch host data for all listings
      const hostIds = new Set();
      data.forEach(listing => {
        if (listing['Host / Landlord']) {
          hostIds.add(listing['Host / Landlord']);
        }
      });

      const hostMap = await fetchHostData(Array.from(hostIds));

      // Map host data to listings
      const resolvedHosts = {};
      data.forEach(listing => {
        const hostId = listing['Host / Landlord'];
        resolvedHosts[listing._id] = hostMap[hostId] || null;
      });

      // Transform listings
      const transformedListings = data.map(listing =>
        transformListing(listing, resolvedPhotos[listing._id], resolvedHosts[listing._id])
      );

      // Filter out listings without valid coordinates
      const listingsWithCoordinates = transformedListings.filter(listing => {
        return listing.coordinates && listing.coordinates.lat && listing.coordinates.lng;
      });

      // Filter out listings without photos
      const listingsWithPhotos = listingsWithCoordinates.filter(listing => {
        return listing.images && listing.images.length > 0;
      });

      console.log('📊 SearchPage: Fallback listings ready:', listingsWithPhotos.length);

      setFallbackListings(listingsWithPhotos);
      setFallbackLoadedCount(0);
    } catch (err) {
      console.error('Failed to fetch fallback listings:', err);
      // Don't set error state - this is a fallback, so we just show nothing
      setFallbackListings([]);
    } finally {
      setIsFallbackLoading(false);
    }
  }, []);

  // Transform raw listing data
  const transformListing = (dbListing, images, hostData) => {
    // Resolve human-readable names from database IDs
    const neighborhoodName = getNeighborhoodName(dbListing['Location - Hood']);
    const boroughName = getBoroughName(dbListing['Location - Borough']);
    const propertyType = getPropertyTypeLabel(dbListing['Features - Type of Space']);

    // Build location string with proper formatting
    const locationParts = [];
    if (neighborhoodName) locationParts.push(neighborhoodName);
    if (boroughName) locationParts.push(boroughName);
    const location = locationParts.join(', ') || 'New York, NY';

    // Extract coordinates from JSONB fields
    // Priority: "Location - slightly different address" (for privacy/pin separation)
    // Fallback: "Location - Address" (main address)
    // Format: { address: "...", lat: number, lng: number }
    let locationSlightlyDifferent = dbListing['Location - slightly different address'];
    let locationAddress = dbListing['Location - Address'];

    // Parse if they're strings (Supabase may return JSONB as strings)
    if (typeof locationSlightlyDifferent === 'string') {
      try {
        locationSlightlyDifferent = JSON.parse(locationSlightlyDifferent);
      } catch (error) {
        console.error('❌ SearchPage: Failed to parse Location - slightly different address:', {
          id: dbListing._id,
          name: dbListing.Name,
          rawValue: locationSlightlyDifferent,
          error: error.message
        });
        locationSlightlyDifferent = null;
      }
    }

    if (typeof locationAddress === 'string') {
      try {
        locationAddress = JSON.parse(locationAddress);
      } catch (error) {
        console.error('❌ SearchPage: Failed to parse Location - Address:', {
          id: dbListing._id,
          name: dbListing.Name,
          rawValue: locationAddress,
          error: error.message
        });
        locationAddress = null;
      }
    }

    // Use slightly different address if available, otherwise fallback to main address
    let coordinates = null;
    let coordinateSource = null;

    if (locationSlightlyDifferent?.lat && locationSlightlyDifferent?.lng) {
      coordinates = {
        lat: locationSlightlyDifferent.lat,
        lng: locationSlightlyDifferent.lng
      };
      coordinateSource = 'slightly-different-address';
    } else if (locationAddress?.lat && locationAddress?.lng) {
      coordinates = {
        lat: locationAddress.lat,
        lng: locationAddress.lng
      };
      coordinateSource = 'main-address';
    }

    console.log('🔄 SearchPage: Transforming listing:', {
      id: dbListing._id,
      name: dbListing.Name,
      hasSlightlyDifferentAddress: !!locationSlightlyDifferent,
      hasMainAddress: !!locationAddress,
      coordinateSource: coordinateSource,
      coordinates: coordinates,
      hasValidCoords: !!coordinates
    });

    if (!coordinates) {
      console.error('❌ SearchPage: Missing coordinates for listing - will be filtered out:', {
        id: dbListing._id,
        name: dbListing.Name,
        locationSlightlyDifferent: locationSlightlyDifferent,
        locationAddress: locationAddress
      });
    } else {
      console.log('✅ SearchPage: Valid coordinates found from', coordinateSource, ':', {
        id: dbListing._id,
        name: dbListing.Name,
        lat: coordinates.lat,
        lng: coordinates.lng
      });
    }

    console.log('📍 SearchPage: Final coordinates for listing:', {
      id: dbListing._id,
      coordinates,
      hasValidCoordinates: !!coordinates
    });

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
      host: hostData || {
        name: null,
        image: null,
        verified: false
      },
      // Photos loaded via batch fetch BEFORE transformation
      images: images || [],
      description: `${(dbListing['Features - Qty Bedrooms'] || 0) === 0 ? 'Studio' : `${dbListing['Features - Qty Bedrooms']} bedroom`} • ${dbListing['Features - Qty Bathrooms'] || 0} bathroom`,
      weeks_offered: dbListing['Weeks offered'] || 'Every week',
      // Parse JSONB field that may be stringified JSON or native array
      days_available: parseJsonArray(dbListing['Days Available (List of Days)']),
      isNew: false
    };
  };

  // Fetch listings when filters change
  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  // Lazy load listings
  useEffect(() => {
    if (allListings.length === 0) {
      setDisplayedListings([]);
      return;
    }

    const initialCount = LISTING_CONFIG.INITIAL_LOAD_COUNT;
    setDisplayedListings(allListings.slice(0, initialCount));
    setLoadedCount(initialCount);
  }, [allListings]);

  const handleLoadMore = useCallback(() => {
    const batchSize = LISTING_CONFIG.LOAD_BATCH_SIZE;
    const nextCount = Math.min(loadedCount + batchSize, allListings.length);
    setDisplayedListings(allListings.slice(0, nextCount));
    setLoadedCount(nextCount);
  }, [loadedCount, allListings]);

  const hasMore = loadedCount < allListings.length;

  // Fetch fallback listings when filtered results are empty
  useEffect(() => {
    if (!isLoading && allListings.length === 0 && fallbackListings.length === 0 && !isFallbackLoading) {
      fetchAllListings();
    }
  }, [isLoading, allListings.length, fallbackListings.length, isFallbackLoading, fetchAllListings]);

  // Clear fallback listings when filtered results are found
  useEffect(() => {
    if (allListings.length > 0 && fallbackListings.length > 0) {
      setFallbackListings([]);
      setFallbackDisplayedListings([]);
      setFallbackLoadedCount(0);
    }
  }, [allListings.length, fallbackListings.length]);

  // Lazy load fallback listings
  useEffect(() => {
    if (fallbackListings.length === 0) {
      setFallbackDisplayedListings([]);
      return;
    }

    const initialCount = LISTING_CONFIG.INITIAL_LOAD_COUNT;
    setFallbackDisplayedListings(fallbackListings.slice(0, initialCount));
    setFallbackLoadedCount(initialCount);
  }, [fallbackListings]);

  const handleFallbackLoadMore = useCallback(() => {
    const batchSize = LISTING_CONFIG.LOAD_BATCH_SIZE;
    const nextCount = Math.min(fallbackLoadedCount + batchSize, fallbackListings.length);
    setFallbackDisplayedListings(fallbackListings.slice(0, nextCount));
    setFallbackLoadedCount(nextCount);
  }, [fallbackLoadedCount, fallbackListings]);

  const hasFallbackMore = fallbackLoadedCount < fallbackListings.length;

  // Reset all filters
  const handleResetFilters = () => {
    const manhattan = boroughs.find(b => b.value === 'manhattan');
    if (manhattan) {
      setSelectedBorough(manhattan.value);
    }
    setSelectedNeighborhoods([]);
    setWeekPattern('every-week');
    setPriceTier('all');
    setSortBy('recommended');
    setNeighborhoodSearch('');
  };

  // Modal handler functions
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

  const handleOpenAIResearchModal = () => {
    setIsAIResearchModalOpen(true);
  };

  const handleCloseAIResearchModal = () => {
    setIsAIResearchModalOpen(false);
  };

  // Show toast notification
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 3000);
  };

  // Update favorites count and show toast (API call handled by FavoriteButton component)
  const handleToggleFavorite = (listingId, listingTitle, newState) => {
    console.log('[SearchPage] handleToggleFavorite called:', {
      listingId,
      listingTitle,
      newState,
      currentFavoritesCount: favoritesCount,
      currentFavoritedIdsSize: favoritedListingIds.size
    });

    // Update the local set to keep heart icon state in sync
    const newFavoritedIds = new Set(favoritedListingIds);
    if (newState) {
      newFavoritedIds.add(listingId);
    } else {
      newFavoritedIds.delete(listingId);
    }
    setFavoritedListingIds(newFavoritedIds);

    // Only update favoritesCount if the listing is ACTIVE
    // This keeps the header badge count consistent with what shows on the favorites page
    const isActiveListing = allActiveListings.some(listing => listing.id === listingId);
    if (isActiveListing) {
      if (newState) {
        setFavoritesCount(prev => prev + 1);
      } else {
        setFavoritesCount(prev => Math.max(0, prev - 1));
      }
      console.log('[SearchPage] Active listing toggled, updating favoritesCount');
    } else {
      console.log('[SearchPage] Inactive listing toggled, favoritesCount unchanged');
    }

    // Show toast notification
    const displayName = listingTitle || 'Listing';
    if (newState) {
      showToast(`${displayName} added to favorites`, 'success');
    } else {
      showToast(`${displayName} removed from favorites`, 'info');
    }
  };

  // Auth navigation handlers
  const handleNavigate = (path) => {
    window.location.href = path;
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      setIsLoggedIn(false);
      setCurrentUser(null);
      setFavoritesCount(0);
      // Optionally redirect to home or refresh the page
      window.location.reload();
    } catch (error) {
      console.error('[SearchPage] Logout error:', error);
    }
  };

  // Mount SearchScheduleSelector component in both mobile and desktop locations
  // Note: Schedule selector is now display-only and does not affect filtering
  useEffect(() => {
    const mountPointDesktop = document.getElementById('schedule-selector-mount-point');
    const mountPointMobile = document.getElementById('schedule-selector-mount-point-mobile');
    const roots = [];

    const selectorProps = {
      onSelectionChange: (days) => {
        console.log('Schedule selector changed (display only, not used for filtering):', days);
        // No state update - schedule selection is for display purposes only
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
    <div className="search-page">
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
        {/* LEFT COLUMN: Listings with filters */}
        <section className="listings-column">
          {/* Mobile Filter Bar - Sticky at top on mobile */}
          <MobileFilterBar
            onFilterClick={() => setFilterPanelActive(!filterPanelActive)}
            onMapClick={() => setMobileMapVisible(true)}
            isMapVisible={mobileMapVisible}
          />

          {/* Mobile Schedule Selector - Always visible on mobile */}
          <div className="mobile-schedule-selector">
            <div className="filter-group schedule-selector-group" id="schedule-selector-mount-point-mobile">
              {/* AuthAwareSearchScheduleSelector will be mounted here on mobile */}
            </div>
          </div>

          {/* All filters in single horizontal flexbox container */}
          <div className={`inline-filters ${filterPanelActive ? 'active' : ''}`}>
            {/* Close button for mobile filter panel */}
            {filterPanelActive && (
              <button
                className="mobile-filter-close-btn"
                onClick={() => setFilterPanelActive(false)}
              >
                ✕ Close Filters
              </button>
            )}

            {/* Schedule Selector - First item on left (desktop only) */}
            <div className="filter-group schedule-selector-group" id="schedule-selector-mount-point">
              {/* AuthAwareSearchScheduleSelector will be mounted here on desktop */}
            </div>

            {/* Neighborhood Multi-Select - Checkbox list */}
            <NeighborhoodDropdownFilter
              neighborhoods={neighborhoods}
              selectedNeighborhoods={selectedNeighborhoods}
              onNeighborhoodsChange={setSelectedNeighborhoods}
              neighborhoodSearch={neighborhoodSearch}
              onNeighborhoodSearchChange={setNeighborhoodSearch}
              searchInputId="neighborhoodSearchInline"
            />

            {/* Borough Select */}
            <div className="filter-group compact">
              <label htmlFor="boroughSelect">Borough</label>
              <select
                id="boroughSelect"
                className="filter-select"
                value={selectedBorough}
                onChange={(e) => setSelectedBorough(e.target.value)}
              >
                {boroughs.length === 0 ? (
                  <option value="">Loading...</option>
                ) : (
                  boroughs.map(borough => (
                    <option key={borough.id} value={borough.value}>
                      {borough.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Week Pattern */}
            <div className="filter-group compact">
              <label htmlFor="weekPattern">Week Pattern</label>
              <select
                id="weekPattern"
                className="filter-select"
                value={weekPattern}
                onChange={(e) => setWeekPattern(e.target.value)}
              >
                <option value="every-week">Every week</option>
                <option value="one-on-off">One on, one off</option>
                <option value="two-on-off">Two on, two off</option>
                <option value="one-three-off">One on, three off</option>
              </select>
            </div>

            {/* Price Tier */}
            <div className="filter-group compact">
              <label htmlFor="priceTier">Price</label>
              <select
                id="priceTier"
                className="filter-select"
                value={priceTier}
                onChange={(e) => setPriceTier(e.target.value)}
              >
                <option value="under-200">&lt; $200/night</option>
                <option value="200-350">$200-$350/night</option>
                <option value="350-500">$350-$500/night</option>
                <option value="500-plus">$500+/night</option>
                <option value="all">All Prices</option>
              </select>
            </div>

            {/* Sort By */}
            <div className="filter-group compact">
              <label htmlFor="sortBy">Sort By</label>
              <select
                id="sortBy"
                className="filter-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="recommended">Recommended</option>
                <option value="price-low">Price: Low to High</option>
                <option value="most-viewed">Most Viewed</option>
                <option value="recent">Recently Added</option>
              </select>
            </div>
          </div>

          {/* Listings count */}
          <div className="listings-count">
            <strong>{allListings.length} listings found</strong> in {boroughs.find(b => b.value === selectedBorough)?.name || 'NYC'}
          </div>

          {/* Listings content */}
          <div className="listings-content">
            {isLoading && <LoadingState />}

            {!isLoading && error && (
              <ErrorState message={error} onRetry={fetchListings} />
            )}

            {!isLoading && !error && allListings.length === 0 && (
              <>
                <EmptyState onResetFilters={handleResetFilters} />

                {/* Fallback: Show all available listings */}
                {isFallbackLoading && (
                  <div className="fallback-loading">
                    <p>Loading all available listings...</p>
                  </div>
                )}

                {!isFallbackLoading && fallbackListings.length > 0 && (
                  <div className="fallback-listings-section">
                    <div className="fallback-header">
                      <h3>Browse All Available Listings</h3>
                      <p>Showing {fallbackListings.length} listings across all NYC boroughs</p>
                    </div>
                    <ListingsGrid
                      listings={fallbackDisplayedListings}
                      onLoadMore={handleFallbackLoadMore}
                      hasMore={hasFallbackMore}
                      isLoading={false}
                      onOpenContactModal={handleOpenContactModal}
                      onOpenInfoModal={handleOpenInfoModal}
                      mapRef={mapRef}
                      isLoggedIn={isLoggedIn}
                      userId={currentUser?.id}
                      favoritedListingIds={favoritedListingIds}
                      onToggleFavorite={handleToggleFavorite}
                      onRequireAuth={() => {
                        setAuthModalView('signup');
                        setIsAuthModalOpen(true);
                      }}
                    />
                  </div>
                )}
              </>
            )}

            {!isLoading && !error && allListings.length > 0 && (
              <ListingsGrid
                listings={displayedListings}
                onLoadMore={handleLoadMore}
                hasMore={hasMore}
                isLoading={isLoading}
                onOpenContactModal={handleOpenContactModal}
                onOpenInfoModal={handleOpenInfoModal}
                mapRef={mapRef}
                isLoggedIn={isLoggedIn}
                userId={currentUser?.id}
                favoritedListingIds={favoritedListingIds}
                onToggleFavorite={handleToggleFavorite}
                onRequireAuth={() => {
                  setAuthModalView('signup');
                  setIsAuthModalOpen(true);
                }}
              />
            )}
          </div>
        </section>

        {/* RIGHT COLUMN: Map with integrated header */}
        <section className="map-column">
          {/* Integrated Logo and Hamburger Menu */}
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

            {/* Right side: conditional based on auth state */}
            <div className="map-header-actions">
              {isLoggedIn && currentUser ? (
                <>
                  {/* Favorites Heart with Count */}
                  <a href="/favorite-listings" className="favorites-link" aria-label="My Favorite Listings">
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                    {favoritesCount > 0 && (
                      <span className="favorites-badge">{favoritesCount}</span>
                    )}
                  </a>

                  {/* Logged In Avatar */}
                  <LoggedInAvatar
                    user={currentUser}
                    currentPath="/search"
                    onNavigate={handleNavigate}
                    onLogout={handleLogout}
                  />
                </>
              ) : (
                <>
                  {/* Hamburger Menu - Only for logged out users */}
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

                  {/* Dropdown Menu */}
                  {menuOpen && (
                    <div className="header-dropdown">
                      <a href="/guest-success">Success Stories</a>
                      <a
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          setMenuOpen(false);
                          setAuthModalView('login');
                          setIsAuthModalOpen(true);
                        }}
                      >
                        Sign In / Sign Up
                      </a>
                      <a href="/why-split-lease">Understand Split Lease</a>
                      <a href="/faq">Explore FAQs</a>
                      <a href="/help-center">Support Centre</a>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <GoogleMap
            ref={mapRef}
            listings={allActiveListings}
            filteredListings={allListings}
            selectedListing={null}
            selectedBorough={selectedBorough}
            onMarkerClick={(listing) => {
              console.log('Marker clicked:', listing.title);
            }}
            onMessageClick={(listing) => {
              console.log('[SearchPage] Map card message clicked for:', listing?.id);
              handleOpenContactModal(listing);
            }}
            onAIResearchClick={handleOpenAIResearchModal}
            isLoggedIn={isLoggedIn}
            favoritedListingIds={favoritedListingIds}
            onToggleFavorite={handleToggleFavorite}
            userId={currentUser?.id}
            onRequireAuth={() => {
              setAuthModalView('signup');
              setIsAuthModalOpen(true);
            }}
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
      <AiSignupMarketReport
        isOpen={isAIResearchModalOpen}
        onClose={handleCloseAIResearchModal}
      />
      <SignUpLoginModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialView={authModalView}
        onAuthSuccess={() => {
          console.log('Auth successful from SearchPage');
        }}
      />

      {/* Mobile Map Modal - Fullscreen map view for mobile devices */}
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
              listings={allActiveListings}
              filteredListings={allListings}
              selectedListing={null}
              selectedBorough={selectedBorough}
              onMarkerClick={(listing) => {
                console.log('Marker clicked:', listing.title);
              }}
              onMessageClick={(listing) => {
                console.log('[SearchPage] Mobile map card message clicked for:', listing?.id);
                handleOpenContactModal(listing);
              }}
              onAIResearchClick={handleOpenAIResearchModal}
              isLoggedIn={isLoggedIn}
              favoritedListingIds={favoritedListingIds}
              onToggleFavorite={handleToggleFavorite}
              userId={currentUser?.id}
              onRequireAuth={() => {
                setAuthModalView('signup');
                setIsAuthModalOpen(true);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
