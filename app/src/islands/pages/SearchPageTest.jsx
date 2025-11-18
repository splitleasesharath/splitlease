import { useState, useEffect, useRef, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import GoogleMap from '../shared/GoogleMap.jsx';
import InformationalText from '../shared/InformationalText.jsx';
import ContactHostMessaging from '../shared/ContactHostMessaging.jsx';
import AIResearchSignupModal from '../shared/AIResearchSignupModal.jsx';
import SearchScheduleSelector from '../shared/SearchScheduleSelector.jsx';
import { supabase } from '../../lib/supabase.js';
import { PRICE_TIERS, SORT_OPTIONS, WEEK_PATTERNS, LISTING_CONFIG, VIEW_LISTING_URL, SIGNUP_LOGIN_URL, SEARCH_URL } from '../../lib/constants.js';
import { initializeLookups, getNeighborhoodName, getBoroughName, getPropertyTypeLabel, isInitialized } from '../../lib/dataLookups.js';
import { parseUrlToFilters, updateUrlParams, watchUrlChanges, hasUrlFilters } from '../../lib/urlParams.js';
import { fetchPhotoUrls, fetchHostData, extractPhotos, parseAmenities, parseJsonArray } from '../../lib/supabaseUtils.js';
import { sanitizeNeighborhoodSearch, sanitizeSearchQuery } from '../../lib/sanitize.js';

// ============================================================================
// Internal Components
// ============================================================================

/**
 * MobileFilterBar - Sticky filter button for mobile
 */
function MobileFilterBar({ onFilterClick, onMapClick }) {
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
        <span>Map</span>
      </button>
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
  onSortByChange,
  neighborhoodSearch,
  onNeighborhoodSearchChange
}) {
  const filteredNeighborhoods = neighborhoods.filter(n => {
    const sanitizedSearch = sanitizeNeighborhoodSearch(neighborhoodSearch);
    return n.name.toLowerCase().includes(sanitizedSearch.toLowerCase());
  });

  const handleNeighborhoodToggle = (neighborhoodId) => {
    const isSelected = selectedNeighborhoods.includes(neighborhoodId);
    let newSelected;

    if (isSelected) {
      newSelected = selectedNeighborhoods.filter(id => id !== neighborhoodId);
    } else {
      newSelected = [...selectedNeighborhoods, neighborhoodId];
    }

    onNeighborhoodsChange(newSelected);
  };

  const handleRemoveNeighborhood = (neighborhoodId) => {
    onNeighborhoodsChange(selectedNeighborhoods.filter(id => id !== neighborhoodId));
  };

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

          {/* Neighborhood Multi-Select */}
          <div className="filter-group compact neighborhoods-group">
            <label htmlFor="neighborhoodSearch">Refine Neighborhood(s)</label>
            <input
              type="text"
              id="neighborhoodSearch"
              placeholder="Search neighborhoods..."
              className="neighborhood-search"
              value={neighborhoodSearch}
              onChange={(e) => onNeighborhoodSearchChange(e.target.value)}
            />

            {/* Selected neighborhood chips */}
            <div className="selected-neighborhoods-chips">
              {selectedNeighborhoods.map(id => {
                const neighborhood = neighborhoods.find(n => n.id === id);
                if (!neighborhood) return null;

                return (
                  <div key={id} className="neighborhood-chip">
                    <span>{neighborhood.name}</span>
                    <button
                      className="neighborhood-chip-remove"
                      onClick={() => handleRemoveNeighborhood(id)}
                      aria-label={`Remove ${neighborhood.name}`}
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Neighborhood list */}
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
        </div>
      </div>
    </div>
  );
}

/**
 * PropertyCard - Individual listing card
 */
function PropertyCard({ listing, selectedDaysCount, onLocationClick, onOpenContactModal, onOpenInfoModal }) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
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
    setIsFavorite(!isFavorite);
  };

  // Calculate dynamic price based on selected days
  // Uses the same formula as priceCalculations.js for Nightly rental type
  const calculateDynamicPrice = () => {
    const nightsCount = Math.max(selectedDaysCount - 1, 1);

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

  return (
    <a
      className="listing-card"
      href={`/view-split-lease/${listing.id}`}
      target="_blank"
      rel="noopener noreferrer"
      style={{ textDecoration: 'none', color: 'inherit' }}
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
          <button className="favorite-btn" onClick={handleFavoriteClick}>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill={isFavorite ? 'red' : 'none'}
              stroke="currentColor"
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
function ListingsGrid({ listings, selectedDaysCount, onLoadMore, hasMore, isLoading, onOpenContactModal, onOpenInfoModal, mapRef }) {
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
      {listings.map((listing, index) => (
        <PropertyCard
          key={listing.id}
          listing={listing}
          selectedDaysCount={selectedDaysCount}
          onLocationClick={(listing) => {
            if (mapRef.current) {
              mapRef.current.zoomToListing(listing.id);
            }
          }}
          onOpenContactModal={onOpenContactModal}
          onOpenInfoModal={onOpenInfoModal}
        />
      ))}

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

  // Cascading filter layers (implementing the 4-layer architecture from markdown)
  const [primaryFilteredListings, setPrimaryFilteredListings] = useState([]); // Layer 1: Borough + Week + Sort
  const [secondaryFilteredListings, setSecondaryFilteredListings] = useState([]); // Layer 2: + Neighborhoods
  const [tertiaryFilteredListings, setTertiaryFilteredListings] = useState([]); // Layer 3: + Price
  // Layer 4 (Display) routes to one of the above based on active filters

  // Modal state management
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [isAIResearchModalOpen, setIsAIResearchModalOpen] = useState(false);
  const [selectedListing, setSelectedListing] = useState(null);
  const [infoModalTriggerRef, setInfoModalTriggerRef] = useState(null);

  // Refs
  const mapRef = useRef(null);
  const fetchInProgressRef = useRef(false); // Track if fetch is already in progress
  const lastFetchParamsRef = useRef(null); // Track last fetch parameters to prevent duplicates

  // Parse URL parameters for initial filter state
  const urlFilters = parseUrlToFilters();

  // Filter state (initialized from URL if available)
  const [selectedDays, setSelectedDays] = useState(urlFilters.selectedDays);
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
          .not('"Location - Address"', 'is', null);

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
  // NOTE: selectedDays is managed by SearchScheduleSelector component internally
  useEffect(() => {
    // Skip URL update on initial mount (URL already parsed)
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    // Update URL with current filter state (excluding selectedDays which is managed by component)
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
      setSelectedDays(newFilters.selectedDays);
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
        const { data, error } = await supabase
          .from('zat_geo_borough_toplevel')
          .select('_id, "Display Borough"')
          .order('"Display Borough"', { ascending: true });

        if (error) throw error;

        const boroughList = data
          .filter(b => b['Display Borough'] && b['Display Borough'].trim())
          .map(b => ({
            id: b._id,
            name: b['Display Borough'].trim(),
            value: b['Display Borough'].trim().toLowerCase()
              .replace(/\s+county\s+nj/i, '')
              .replace(/\s+/g, '-')
          }));

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
      if (!selectedBorough || boroughs.length === 0) return;

      const borough = boroughs.find(b => b.value === selectedBorough);
      if (!borough) return;

      try {
        const { data, error } = await supabase
          .from('zat_geo_hood_mediumlevel')
          .select('_id, Display, "Geo-Borough"')
          .eq('"Geo-Borough"', borough.id)
          .order('Display', { ascending: true });

        if (error) throw error;

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

  // Fetch listings with 4-layer cascading filter architecture
  const fetchListings = useCallback(async () => {
    if (boroughs.length === 0 || !selectedBorough) return;

    setIsLoading(true);
    setError(null);

    try {
      const borough = boroughs.find(b => b.value === selectedBorough);
      if (!borough) throw new Error('Borough not found');

      console.log('\n🔍 ===== STARTING 4-LAYER CASCADE =====');
      console.log('Filters:', { borough: borough.name, weekPattern, selectedNeighborhoods: selectedNeighborhoods.length, priceTier, selectedDays: selectedDays.length });

      // ========================================================================
      // LAYER 1 (PRIMARY): Borough + Week Pattern + Sorting ONLY
      // ========================================================================
      console.log('\n🔵 LAYER 1 (PRIMARY): Fetching listings with Borough + Week + Sort');

      let query = supabase
        .from('listing')
        .select('*')
        .eq('"Complete"', true)
        .or('"Active".eq.true,"Active".is.null')
        .eq('"Location - Borough"', borough.id)
        .filter('"Location - Address"', 'not.is', null);

      // Apply week pattern filter (part of Layer 1)
      if (weekPattern !== 'every-week') {
        const weekPatternText = WEEK_PATTERNS[weekPattern];
        if (weekPatternText) {
          query = query.eq('"Weeks offered"', weekPatternText);
          console.log('   Applying week pattern:', weekPatternText);
        }
      }

      // Apply sorting (part of Layer 1)
      const sortConfig = SORT_OPTIONS[sortBy] || SORT_OPTIONS.recommended;
      query = query.order(sortConfig.field, { ascending: sortConfig.ascending });

      const { data, error } = await query;
      if (error) throw error;

      console.log('   Supabase returned:', data.length, 'raw listings');

      // Batch fetch photos
      const allPhotoIds = new Set();
      data.forEach(listing => {
        const photosField = listing['Features - Photos'];
        if (Array.isArray(photosField)) {
          photosField.forEach(id => allPhotoIds.add(id));
        } else if (typeof photosField === 'string') {
          try {
            const parsed = JSON.parse(photosField);
            if (Array.isArray(parsed)) parsed.forEach(id => allPhotoIds.add(id));
          } catch (e) {}
        }
      });
      const photoMap = await fetchPhotoUrls(Array.from(allPhotoIds));

      const resolvedPhotos = {};
      data.forEach(listing => {
        resolvedPhotos[listing._id] = extractPhotos(listing['Features - Photos'], photoMap, listing._id);
      });

      // Batch fetch host data
      const hostIds = new Set();
      data.forEach(listing => {
        if (listing['Host / Landlord']) hostIds.add(listing['Host / Landlord']);
      });
      const hostMap = await fetchHostData(Array.from(hostIds));

      const resolvedHosts = {};
      data.forEach(listing => {
        const hostId = listing['Host / Landlord'];
        resolvedHosts[listing._id] = hostMap[hostId] || null;
      });

      // Transform listings
      const transformedListings = data.map(listing =>
        transformListing(listing, resolvedPhotos[listing._id], resolvedHosts[listing._id])
      );

      // Filter out listings without coordinates (required for map)
      const layer1Results = transformedListings.filter(listing => {
        return listing.coordinates && listing.coordinates.lat && listing.coordinates.lng;
      });

      setPrimaryFilteredListings(layer1Results);
      console.log('✅ LAYER 1 COMPLETE:', layer1Results.length, 'listings');

      // ========================================================================
      // LAYER 2 (SECONDARY): + Neighborhoods
      // ========================================================================
      console.log('\n🟢 LAYER 2 (SECONDARY): Filtering by neighborhoods');

      let layer2Results = layer1Results;
      if (selectedNeighborhoods.length > 0) {
        layer2Results = layer1Results.filter(listing => {
          return selectedNeighborhoods.includes(listing.neighborhoodId);
        });
        console.log('   Filtered to', selectedNeighborhoods.length, 'neighborhoods');
      } else {
        console.log('   No neighborhood filter - passing through');
      }

      setSecondaryFilteredListings(layer2Results);
      console.log('✅ LAYER 2 COMPLETE:', layer2Results.length, 'listings');

      // ========================================================================
      // LAYER 3 (TERTIARY): + Price
      // ========================================================================
      console.log('\n🟡 LAYER 3 (TERTIARY): Filtering by price');

      let layer3Results = layer2Results;
      if (priceTier !== 'all') {
        const priceRange = PRICE_TIERS[priceTier];
        if (priceRange) {
          layer3Results = layer2Results.filter(listing => {
            const price = listing.price?.starting || listing['Starting nightly price'] || 0;
            return price >= priceRange.min && price <= priceRange.max;
          });
          console.log('   Filtered to price range:', `$${priceRange.min}-$${priceRange.max}`);
        }
      } else {
        console.log('   No price filter - passing through');
      }

      setTertiaryFilteredListings(layer3Results);
      console.log('✅ LAYER 3 COMPLETE:', layer3Results.length, 'listings');

      // ========================================================================
      // LAYER 4 (DISPLAY): Conditional Routing
      // ========================================================================
      console.log('\n🟣 LAYER 4 (DISPLAY): Determining which layer to display');

      const hasNeighborhoods = selectedNeighborhoods.length > 0;
      const hasPrice = priceTier !== 'all';

      let displaySource;
      let displayListings;

      if (hasNeighborhoods && hasPrice) {
        displaySource = 'TERTIARY (Neighborhoods + Price)';
        displayListings = layer3Results;
      } else if (hasPrice && !hasNeighborhoods) {
        displaySource = 'TERTIARY (Price only)';
        displayListings = layer3Results;
      } else if (hasNeighborhoods && !hasPrice) {
        displaySource = 'SECONDARY (Neighborhoods only)';
        displayListings = layer2Results;
      } else {
        displaySource = 'PRIMARY (No optional filters)';
        displayListings = layer1Results;
      }

      console.log('   Using:', displaySource, '→', displayListings.length, 'listings');

      // ========================================================================
      // FINAL FILTER: Schedule/Days (applied AFTER all 4 layers)
      // ========================================================================
      let finalListings = displayListings;
      if (selectedDays.length > 0) {
        console.log('\n📅 FINAL FILTER: Applying schedule/days filter');
        console.log('   Selected day indices:', selectedDays);

        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const selectedDayNames = selectedDays.map(idx => dayNames[idx]);
        console.log('   Selected day names:', selectedDayNames);

        let passCount = 0;
        let failCount = 0;

        finalListings = displayListings.filter(listing => {
          const listingDays = Array.isArray(listing.days_available) ? listing.days_available : [];

          // Debug log for first 3 listings
          if (passCount + failCount < 3) {
            console.log(`\n   📋 Listing: "${listing.title}"`);
            console.log(`      Raw days_available:`, listing.days_available);
            console.log(`      Is array:`, Array.isArray(listing.days_available));
            console.log(`      Parsed days:`, listingDays);
          }

          // Empty/null days = available ALL days
          if (listingDays.length === 0) {
            if (passCount + failCount < 3) {
              console.log(`      ✅ PASS (empty = all days available)`);
            }
            passCount++;
            return true;
          }

          const normalizedListingDays = listingDays.filter(d => d && typeof d === 'string').map(d => d.toLowerCase().trim());

          if (passCount + failCount < 3) {
            console.log(`      Normalized listing days:`, normalizedListingDays);
            console.log(`      Required days (lowercase):`, selectedDayNames.map(d => d.toLowerCase()));
          }

          const missingDays = selectedDayNames.filter(requiredDay =>
            !normalizedListingDays.some(listingDay => listingDay === requiredDay.toLowerCase())
          );

          const passes = missingDays.length === 0;

          if (passCount + failCount < 3) {
            console.log(`      Missing days:`, missingDays);
            console.log(`      ${passes ? '✅ PASS' : '❌ FAIL'}`);
          }

          if (passes) passCount++;
          else failCount++;

          return passes;
        });
        console.log(`   Filter results: ${passCount} passed, ${failCount} failed`);
        console.log('   After days filter:', finalListings.length, 'listings');
      }

      console.log('\n📊 ===== CASCADE SUMMARY =====');
      console.log('🔵 Layer 1 (Primary):', layer1Results.length);
      console.log('🟢 Layer 2 (Secondary):', layer2Results.length);
      console.log('🟡 Layer 3 (Tertiary):', layer3Results.length);
      console.log('🟣 Layer 4 (Display):', displayListings.length);
      console.log('📅 Final (After days):', finalListings.length);
      console.log('✅ Displaying source:', displaySource);
      console.log('================================\n');

      setAllListings(finalListings);
      setLoadedCount(0);

    } catch (err) {
      console.error('❌ Failed to fetch listings:', err);
      setError('We had trouble loading listings. Please try refreshing the page or adjusting your filters.');
    } finally {
      setIsLoading(false);
    }
  }, [boroughs, selectedBorough, selectedNeighborhoods, weekPattern, priceTier, sortBy, selectedDays]);

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

    // Extract coordinates from JSONB field "Location - Address"
    // Note: Supabase returns JSONB as a string, so we need to parse it
    // Format: { address: "...", lat: number, lng: number }
    let locationAddress = dbListing['Location - Address'];

    // Parse if it's a string
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

    const lat = locationAddress?.lat;
    const lng = locationAddress?.lng;

    console.log('🔄 SearchPage: Transforming listing:', {
      id: dbListing._id,
      name: dbListing.Name,
      hasLocationAddress: !!locationAddress,
      locationAddress: locationAddress,
      extractedLat: lat,
      extractedLng: lng,
      hasValidCoords: !!(lat && lng)
    });

    if (!lat || !lng) {
      console.error('❌ SearchPage: Missing coordinates for listing - will be filtered out:', {
        id: dbListing._id,
        name: dbListing.Name,
        locationAddress: locationAddress
      });
    } else {
      console.log('✅ SearchPage: Valid coordinates found:', {
        id: dbListing._id,
        name: dbListing.Name,
        lat,
        lng
      });
    }

    const coordinates = (lat && lng) ? { lat, lng } : null;

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
      neighborhoodId: dbListing['Location - Hood'], // Store neighborhood ID for filtering
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

  // Reset all filters
  const handleResetFilters = () => {
    setSelectedDays([1, 2, 3, 4, 5]);
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

  // Mount SearchScheduleSelector component in both mobile and desktop locations
  useEffect(() => {
    const mountPointDesktop = document.getElementById('schedule-selector-mount-point');
    const mountPointMobile = document.getElementById('schedule-selector-mount-point-mobile');
    const roots = [];

    const selectorProps = {
      onSelectionChange: (days) => {
        console.log('Selected days:', days);
        // Convert day objects to indices
        const dayIndices = days.map(d => d.index);
        setSelectedDays(dayIndices);
      },
      onError: (error) => console.error('SearchScheduleSelector error:', error)
      // NOTE: Not passing initialSelection - component will read from URL internally
    };

    if (mountPointDesktop) {
      const rootDesktop = createRoot(mountPointDesktop);
      rootDesktop.render(<SearchScheduleSelector {...selectorProps} />);
      roots.push(rootDesktop);
    }

    if (mountPointMobile) {
      const rootMobile = createRoot(mountPointMobile);
      rootMobile.render(<SearchScheduleSelector {...selectorProps} />);
      roots.push(rootMobile);
    }

    return () => {
      roots.forEach(root => root.unmount());
    };
  }, []);

  // Re-render SearchScheduleSelector when selectedDays changes (e.g., from URL)
  useEffect(() => {
    const mountPoint = document.getElementById('search-schedule-selector-mount');
    if (mountPoint && mountPoint._reactRoot) {
      // Component will re-render via key change or we can use a state update
      // For now, we'll let the initialSelection prop handle it via component internal state
    }
  }, [selectedDays]);

  // Render
  return (
    <div className="search-page">
      {/* Two-column layout: Listings (left) + Map (right) */}
      <main className="two-column-layout">
        {/* LEFT COLUMN: Listings with filters */}
        <section className="listings-column">
          {/* Mobile Filter Bar - Sticky at top on mobile */}
          <MobileFilterBar
            onFilterClick={() => setFilterPanelActive(!filterPanelActive)}
            onMapClick={() => setMapSectionActive(!mapSectionActive)}
          />

          {/* Mobile Schedule Selector - Always visible on mobile */}
          <div className="mobile-schedule-selector">
            <div className="filter-group schedule-selector-group" id="schedule-selector-mount-point-mobile">
              {/* SearchScheduleSelector will be mounted here on mobile */}
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
              {/* SearchScheduleSelector will be mounted here on desktop */}
            </div>

            {/* Neighborhood Multi-Select - Second item, beside schedule selector */}
            <div className="filter-group compact neighborhoods-group">
              <label htmlFor="neighborhoodSearch">Refine Neighborhood(s)</label>
              <input
                type="text"
                id="neighborhoodSearch"
                placeholder="Search neighborhoods..."
                className="neighborhood-search"
                value={neighborhoodSearch}
                onChange={(e) => setNeighborhoodSearch(e.target.value)}
              />

              {/* Selected neighborhood chips */}
              {selectedNeighborhoods.length > 0 && (
                <div className="selected-neighborhoods-chips">
                  {selectedNeighborhoods.map(id => {
                    const neighborhood = neighborhoods.find(n => n.id === id);
                    if (!neighborhood) return null;

                    return (
                      <div key={id} className="neighborhood-chip">
                        <span>{neighborhood.name}</span>
                        <button
                          className="neighborhood-chip-remove"
                          onClick={() => {
                            setSelectedNeighborhoods(selectedNeighborhoods.filter(nId => nId !== id));
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

              {/* Neighborhood list */}
              <div className="neighborhood-list">
                {(() => {
                  const filteredNeighborhoods = neighborhoods.filter(n => {
                    const sanitizedSearch = sanitizeNeighborhoodSearch(neighborhoodSearch);
                    return n.name.toLowerCase().includes(sanitizedSearch.toLowerCase());
                  });

                  if (filteredNeighborhoods.length === 0) {
                    return (
                      <div style={{ padding: '10px', color: '#666' }}>
                        {neighborhoods.length === 0 ? 'Loading neighborhoods...' : 'No neighborhoods found'}
                      </div>
                    );
                  }

                  return filteredNeighborhoods.map(neighborhood => (
                    <label key={neighborhood.id}>
                      <input
                        type="checkbox"
                        value={neighborhood.id}
                        checked={selectedNeighborhoods.includes(neighborhood.id)}
                        onChange={() => {
                          const isSelected = selectedNeighborhoods.includes(neighborhood.id);
                          if (isSelected) {
                            setSelectedNeighborhoods(selectedNeighborhoods.filter(id => id !== neighborhood.id));
                          } else {
                            setSelectedNeighborhoods([...selectedNeighborhoods, neighborhood.id]);
                          }
                        }}
                      />
                      {neighborhood.name}
                    </label>
                  ));
                })()}
              </div>
            </div>

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
              <EmptyState onResetFilters={handleResetFilters} />
            )}

            {!isLoading && !error && allListings.length > 0 && (
              <ListingsGrid
                listings={displayedListings}
                selectedDaysCount={selectedDays.length}
                onLoadMore={handleLoadMore}
                hasMore={hasMore}
                isLoading={isLoading}
                onOpenContactModal={handleOpenContactModal}
                onOpenInfoModal={handleOpenInfoModal}
                mapRef={mapRef}
              />
            )}
          </div>
        </section>

        {/* RIGHT COLUMN: Map with integrated header */}
        <section className="map-column">
          {/* Integrated Logo and Hamburger Menu */}
          <div className="map-header">
            <a href="https://splitlease.app" className="map-logo">
              <img
                src="/assets/images/split-lease-purple-circle.png"
                alt="Split Lease Logo"
                className="logo-icon"
                width="36"
                height="36"
              />
              <span className="logo-text">Split Lease</span>
            </a>

            {/* Hamburger Menu */}
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
                <a href="https://splitlease.app/how-it-works">3 Easy Steps To Book</a>
                <a href="/guest-success">Success Stories</a>
                <a href={SIGNUP_LOGIN_URL}>Sign In / Sign Up</a>
                <a href="https://splitlease.app/why-split-lease">Understand Split Lease</a>
                <a href="https://splitlease.app/faq">Explore FAQs</a>
              </div>
            )}
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
            onAIResearchClick={handleOpenAIResearchModal}
            onMessageClick={handleOpenContactModal}
          />
        </section>
      </main>

      {/* Modals */}
      <ContactHostMessaging
        isOpen={isContactModalOpen}
        onClose={handleCloseContactModal}
        listing={selectedListing}
        userEmail={null}
      />
      <InformationalText
        isOpen={isInfoModalOpen}
        onClose={handleCloseInfoModal}
        listing={selectedListing}
        selectedDaysCount={selectedDays.length}
        triggerRef={infoModalTriggerRef}
      />
      <AIResearchSignupModal
        isOpen={isAIResearchModalOpen}
        onClose={handleCloseAIResearchModal}
      />
    </div>
  );
}
