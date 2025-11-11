import { useState, useEffect, useRef, useCallback } from 'react';
import Header from '../shared/Header.jsx';
import DaySelector from '../shared/DaySelector.jsx';
import GoogleMap from '../shared/GoogleMap.jsx';
import InformationalText from '../shared/InformationalText.jsx';
import ContactHostMessaging from '../shared/ContactHostMessaging.jsx';
import AISignupModal from '../shared/AISignupModal.jsx';
import { supabase } from '../../lib/supabase.js';
import { PRICE_TIERS, SORT_OPTIONS, WEEK_PATTERNS, LISTING_CONFIG, VIEW_LISTING_URL } from '../../lib/constants.js';
import { initializeLookups, getNeighborhoodName, getBoroughName, getPropertyTypeLabel, isInitialized } from '../../lib/dataLookups.js';
import { parseUrlToFilters, updateUrlParams, watchUrlChanges, hasUrlFilters } from '../../lib/urlParams.js';
import { fetchPhotoUrls, fetchHostData, extractPhotos, parseAmenities, parseJsonArray } from '../../lib/supabaseUtils.js';
import { sanitizeNeighborhoodSearch, sanitizeSearchQuery } from '../../lib/sanitize.js';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert day number (1-7) to day name
 */
function getDayName(dayNumber) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayNumber] || '';
}

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
          {/* Day Selector */}
          <div className="filter-group compact day-selector-group">
            <DaySelector
              selected={selectedDays}
              onChange={onDaysChange}
              label="Select Days"
            />
          </div>

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

  const hasImages = listing.images && listing.images.length > 0;
  const hasMultipleImages = listing.images && listing.images.length > 1;

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

    if (nightsCount >= 2 && nightsCount <= 7) {
      const fieldName = priceFieldMap[nightsCount];
      if (fieldName && listing[fieldName]) {
        return listing[fieldName];
      }
    }

    return listing['Starting nightly price'] || listing.price?.starting || 0;
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
                {listing.host?.name || 'Host'}
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
            <div className="starting-price" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>Starting at ${parseFloat(startingPrice).toFixed(2)}/night</span>
              <svg
                viewBox="0 0 24 24"
                width="14"
                height="14"
                style={{ color: '#3b82f6', fill: 'currentColor', cursor: 'pointer' }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onOpenInfoModal(listing);
                }}
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
 * AiSignupCard - AI signup promotional card
 */
function AiSignupCard() {
  const handleClick = () => {
    console.log('Open AI Signup Modal');
    // In production, this would open the AI signup modal
  };

  return (
    <div className="ai-research-card">
      <div className="ai-icon">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v8M8 12h8" />
        </svg>
      </div>
      <h3 className="ai-title">Free, AI Deep Research</h3>
      <p className="ai-subtitle">Save time & money with Insights from 100+ sources</p>
      <button className="ai-btn" onClick={() => setShowAiSignup(true)}>
        Your unique logistics
      </button>
    </div>
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
      {listings.map((listing, index) => {
        const cards = [
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
        ];

        // Insert AI signup cards at specific positions (after 4th and 8th listings)
        // PORTED FROM: input/search/js/app.js lines 237-240
        if (index === 3 || index === 7) {
          cards.push(<AiSignupCard key={`ai-${index}`} />);
        }

        return cards;
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
  const [allListings, setAllListings] = useState([]);
  const [displayedListings, setDisplayedListings] = useState([]);
  const [loadedCount, setLoadedCount] = useState(0);

  // Modal state management
  const [showAiSignup, setShowAiSignup] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [selectedListing, setSelectedListing] = useState(null);

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

  // Sync filter state to URL parameters
  useEffect(() => {
    // Skip URL update on initial mount (URL already parsed)
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    // Update URL with current filter state
    const filters = {
      selectedDays,
      selectedBorough,
      weekPattern,
      priceTier,
      sortBy,
      selectedNeighborhoods
    };

    updateUrlParams(filters, false); // false = push new history entry
  }, [selectedDays, selectedBorough, weekPattern, priceTier, sortBy, selectedNeighborhoods]);

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

  // Fetch listings with filters
  const fetchListings = useCallback(async () => {
    if (boroughs.length === 0 || !selectedBorough) return;

    // Performance optimization: Prevent duplicate fetches
    const fetchParams = `${selectedBorough}-${selectedNeighborhoods.join(',')}-${weekPattern}-${priceTier}-${sortBy}-${selectedDays.join(',')}`;

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
      let query = supabase
        .from('listing')
        .select('*')
        .eq('Active', true)
        .eq('isForUsability', false)
        .eq('"Location - Borough"', borough.id);

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
      const transformedListings = data.map(listing =>
        transformListing(listing, resolvedPhotos[listing._id], resolvedHosts[listing._id])
      );

      // Apply day filter client-side
      let filteredListings = transformedListings;
      if (selectedDays.length > 0) {
        if (import.meta.env.DEV) {
          const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          const selectedDayNames = selectedDays.map(idx => dayNames[idx]);
          console.log('📅 Applying schedule filter (client-side):', selectedDayNames);
          console.log(`   → Required days: ${selectedDayNames.join(', ')}`);
          console.log(`   → Logic: Show listings where listing days ⊇ selected days (superset or equal)`);
          console.log(`   → Empty/null days = available ALL days = SHOW`);
        }

        filteredListings = transformedListings.filter(listing => {
          if (selectedDays.length === 0) return true;

        const listingDays = Array.isArray(listing.days_available) ? listing.days_available : [];

        // Empty/null days = available ALL days = ALWAYS SHOW
        if (listingDays.length === 0) {
          if (import.meta.env.DEV) {
            console.log(`  ✅ PASS: "${listing.title}" - Empty days array (available ALL days)`);
          }
          return true;
        }

        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const selectedDayNames = selectedDays.map(idx => dayNames[idx]);

        // Normalize listing days for case-insensitive comparison
        const normalizedListingDays = listingDays
          .filter(d => d && typeof d === 'string')
          .map(d => d.toLowerCase().trim());

        // SUPERSET CHECK: Listing must contain ALL required days
        const missingDays = selectedDayNames.filter(requiredDay =>
          !normalizedListingDays.some(listingDay => listingDay === requiredDay.toLowerCase())
        );

        const isMatch = missingDays.length === 0;

        // Enhanced debugging in development mode
        if (import.meta.env.DEV) {
          if (isMatch) {
            const extraDays = normalizedListingDays.filter(d =>
              !selectedDayNames.some(sd => sd.toLowerCase() === d)
            );
            const reason = extraDays.length > 0
              ? `Has ALL required days + ${extraDays.length} extra: [${extraDays.join(', ')}]`
              : 'Has EXACTLY the required days';
            console.log(`  ✅ PASS: "${listing.title}" - ${reason}`);
          } else {
            console.log(`  ❌ REJECT: "${listing.title}" - Missing ${missingDays.length} required day(s): [${missingDays.join(', ')}]`);
            console.log(`     → Listing has: [${normalizedListingDays.join(', ')}]`);
            console.log(`     → Required: [${selectedDayNames.map(d => d.toLowerCase()).join(', ')}]`);
          }
        }

        return isMatch;
        });

        // Log summary in development mode
        if (import.meta.env.DEV) {
          const beforeCount = transformedListings.length;
          const afterCount = filteredListings.length;
          const rejectedCount = beforeCount - afterCount;
          console.log(`📊 Schedule filter results: ${afterCount}/${beforeCount} listings match`);
          if (rejectedCount > 0) {
            console.log(`   ❌ Rejected ${rejectedCount} listings`);
          }
          console.log(`✅ Schedule filter complete: ${afterCount} listings pass filter`);
        }
      }

      setAllListings(filteredListings);
      setLoadedCount(0);
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
          priceTier,
          selectedDays
        }
      });

      // Show user-friendly error message (NO FALLBACK - acknowledge the real problem)
      setError('We had trouble loading listings. Please try refreshing the page or adjusting your filters.');
    } finally {
      setIsLoading(false);
      fetchInProgressRef.current = false;
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

    return {
      id: dbListing._id,
      title: dbListing.Name || 'Unnamed Listing',
      location: location,
      neighborhood: neighborhoodName || '',
      borough: boroughName || '',
      coordinates: {
        lat: dbListing.listing_address_latitude || 40.7580,
        lng: dbListing.listing_address_longitude || -73.9855
      },
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
      description: `${dbListing['Features - Qty Bedrooms'] || 0} bedroom • ${dbListing['Features - Qty Bathrooms'] || 0} bathroom`,
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
  const handleOpenAIModal = () => {
    setShowAiSignup(true);
  };

  const handleCloseAIModal = () => {
    setShowAiSignup(false);
  };

  const handleOpenContactModal = (listing) => {
    setSelectedListing(listing);
    setIsContactModalOpen(true);
  };

  const handleCloseContactModal = () => {
    setIsContactModalOpen(false);
    setSelectedListing(null);
  };

  const handleOpenInfoModal = (listing) => {
    setSelectedListing(listing);
    setIsInfoModalOpen(true);
  };

  const handleCloseInfoModal = () => {
    setIsInfoModalOpen(false);
    setSelectedListing(null);
  };

  // Render
  return (
    <div className="search-page">
      <Header />

      <MobileFilterBar
        onFilterClick={() => setFilterPanelActive(!filterPanelActive)}
        onMapClick={() => setMapSectionActive(!mapSectionActive)}
      />

      <FilterPanel
        isActive={filterPanelActive}
        selectedDays={selectedDays}
        onDaysChange={setSelectedDays}
        boroughs={boroughs}
        selectedBorough={selectedBorough}
        onBoroughChange={setSelectedBorough}
        neighborhoods={neighborhoods}
        selectedNeighborhoods={selectedNeighborhoods}
        onNeighborhoodsChange={setSelectedNeighborhoods}
        weekPattern={weekPattern}
        onWeekPatternChange={setWeekPattern}
        priceTier={priceTier}
        onPriceTierChange={setPriceTier}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        neighborhoodSearch={neighborhoodSearch}
        onNeighborhoodSearchChange={setNeighborhoodSearch}
      />

      <main className="main-content">
        <section className="listings-section">
          <div className="listings-header">
            <div className="header-top">
              <h1 className="search-title">Available Split Leases</h1>
            </div>
            <div className="header-info">
              <span className="results-count">{allListings.length} listings found</span>
              <span className="location-tag">
                in <strong>{boroughs.find(b => b.value === selectedBorough)?.name || 'NYC'}</strong>
              </span>
            </div>
          </div>

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
        </section>

        <section className={`map-section ${mapSectionActive ? 'mobile-active' : ''}`}>
          <GoogleMap
            ref={mapRef}
            listings={allListings}
            filteredListings={displayedListings}
            selectedListing={null}
            selectedBorough={selectedBorough}
            onMarkerClick={(listing) => {
              console.log('Marker clicked:', listing.title);
              // Could open listing in new tab or show details
            }}
          />

          {/* Deep Research Floating Button - PORTED FROM ORIGINAL */}
          <button
            className="deep-research-floating-btn"
            onClick={() => setShowAiSignup(true)}
          >
            <div className="atom-animation" id="atomAnimation">
              {/* Lottie animation will be loaded here via script */}
              <svg width="31" height="31" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="3" fill="currentColor" />
                <line x1="12" y1="2" x2="12" y2="6" />
                <line x1="12" y1="18" x2="12" y2="22" />
                <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
                <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
                <line x1="2" y1="12" x2="6" y2="12" />
                <line x1="18" y1="12" x2="22" y2="12" />
                <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
                <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
              </svg>
            </div>
            <span>Generate Market Report</span>
          </button>
        </section>
      </main>

      {/* Chat Widget - PORTED FROM ORIGINAL */}
      <button
        className="chat-widget"
        onClick={() => setShowAiSignup(true)}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
        </svg>
        <span className="chat-label">Get Market Research</span>
      </button>

      {/* AI Signup Modal */}
      <AISignupModal
        isOpen={showAiSignup}
        onClose={handleCloseAIModal}
      />

      {/* Contact Host Messaging Modal */}
      <ContactHostMessaging
        isOpen={isContactModalOpen}
        onClose={handleCloseContactModal}
        listing={selectedListing}
        userEmail={null}
      />

      {/* Informational Text Modal */}
      <InformationalText
        isOpen={isInfoModalOpen}
        onClose={handleCloseInfoModal}
        listing={selectedListing}
        selectedDaysCount={selectedDays.length}
      />
    </div>
  );
}
