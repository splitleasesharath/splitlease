/**
 * GoogleMap Island Component
 * Displays an interactive Google Map with listing markers
 *
 * Features:
 * - Grey markers for all active listings
 * - Purple markers for filtered search results
 * - Price labels on markers
 * - Clickable markers with listing info
 * - Auto-zoom to fit all markers
 * - Map legend with toggle
 *
 * Usage:
 *   import GoogleMap from '../shared/GoogleMap.jsx';
 *   <GoogleMap
 *     listings={allListings}
 *     filteredListings={filteredListings}
 *     selectedListing={selectedListing}
 *     onMarkerClick={(listing) => logger.debug('Clicked:', listing)}
 *   />
 */

import { useEffect, useRef, useState, forwardRef, useImperativeHandle, useCallback, memo } from 'react';
import { DEFAULTS, COLORS, getBoroughMapConfig } from '../../lib/constants.js';
import ListingCardForMap from './ListingCard/ListingCardForMap.jsx';
import { supabase } from '../../lib/supabase.js';
import { logger } from '../../lib/logger.js';
import { fetchPhotoUrls, extractPhotos } from '../../lib/supabaseUtils.js';
import { calculatePrice } from '../../lib/scheduleSelector/priceCalculations.js';

/**
 * MapLegend - Shows marker color meanings and toggle
 * Memoized to prevent unnecessary re-renders
 */
const MapLegend = memo(({ showAllListings, onToggle }) => (
  <div className="map-legend">
    <div className="legend-header">
      <h4>Map Legend</h4>
    </div>
    <div className="legend-items">
      <div className="legend-item">
        <span
          className="legend-marker"
          style={{ backgroundColor: COLORS.SECONDARY }}
        ></span>
        <span>Search Results</span>
      </div>
      <div className="legend-item">
        <span
          className="legend-marker"
          style={{ backgroundColor: COLORS.MUTED }}
        ></span>
        <span>All Active Listings</span>
      </div>
    </div>
    <label className="legend-toggle">
      <input
        type="checkbox"
        checked={showAllListings}
        onChange={(e) => onToggle(e.target.checked)}
      />
      <span>Show all listings</span>
    </label>
  </div>
));

MapLegend.displayName = 'MapLegend';

/**
 * AIResearchButton - Button to trigger AI Research Report signup
 * Memoized to prevent unnecessary re-renders
 */
const AIResearchButton = memo(({ onAIResearchClick }) => {
  if (!onAIResearchClick) return null;

  return (
    <button
      className="ai-research-button"
      onClick={(e) => {
        e.stopPropagation();
        onAIResearchClick();
      }}
      aria-label="Generate Market Report"
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M12 3v18M3 12h18" />
        <path d="M5.6 5.6l12.8 12.8M18.4 5.6L5.6 18.4" />
        <circle cx="12" cy="12" r="2" fill="currentColor" />
      </svg>
      <span>Generate Market Report</span>
    </button>
  );
});

AIResearchButton.displayName = 'AIResearchButton';

const GoogleMap = forwardRef(({
  listings = [],           // All listings to show as grey markers
  filteredListings = [],   // Filtered subset to show as purple markers
  selectedListing = null,  // Currently selected/highlighted listing
  onMarkerClick = null,    // Callback when marker clicked: (listing) => void
  selectedBorough = null,  // Current borough filter for map centering
  simpleMode = false,      // If true, show simple marker without price/card (for view-split-lease page)
  initialZoom = null,      // Optional initial zoom level (defaults to auto-fit)
  disableAutoZoom = false, // If true, don't auto-fit bounds or restrict zoom
  onAIResearchClick = null, // Callback when AI research button is clicked
  onMessageClick = null,   // Callback when message button is clicked on map card
  isLoggedIn = false,      // Whether user is logged in (for showing favorite button)
  favoritedListingIds = new Set(), // Set of favorited listing IDs
  onToggleFavorite = null, // Callback when favorite button is clicked: (listingId, listingTitle, newState) => void
  userId = null,           // Current user ID for favorite button API calls
  onRequireAuth = null,    // Callback to show login modal if not authenticated
  selectedNightsCount = 0  // Number of nights selected for dynamic price calculation
}, ref) => {
  logger.debug('🗺️ GoogleMap: Component rendered with props:', {
    listingsCount: listings.length,
    filteredListingsCount: filteredListings.length,
    selectedBorough,
    hasMessageCallback: !!onMessageClick,
    messageCallbackType: typeof onMessageClick,
    listingsSample: listings.slice(0, 2).map(l => ({
      id: l.id,
      title: l.title,
      coordinates: l.coordinates,
      hasValidCoords: !!(l.coordinates?.lat && l.coordinates?.lng)
    })),
    filteredListingsSample: filteredListings.slice(0, 2).map(l => ({
      id: l.id,
      title: l.title,
      coordinates: l.coordinates,
      hasValidCoords: !!(l.coordinates?.lat && l.coordinates?.lng)
    }))
  });

  const mapRef = useRef(null);
  const googleMapRef = useRef(null);
  const markersRef = useRef([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [showAllListings, setShowAllListings] = useState(true);
  const lastMarkersUpdateRef = useRef(null); // Track last marker update to prevent duplicates
  const handlePinClickRef = useRef(null); // Ref to always have latest handlePinClick

  /**
   * Calculate dynamic price for a listing based on selected nights count
   * Uses the same calculation as PropertyCard in SearchPage
   * Falls back to starting price if no nights selected or calculation fails
   */
  const getDisplayPrice = useCallback((listing) => {
    // If no nights selected, show starting price
    if (selectedNightsCount < 1) {
      return listing.price?.starting || listing['Starting nightly price'] || 0;
    }

    try {
      // Create mock nights array (calculatePrice only uses .length)
      const mockNightsArray = Array(selectedNightsCount).fill({ nightNumber: 0 });
      const priceBreakdown = calculatePrice(mockNightsArray, listing, 13, null);
      return priceBreakdown.pricePerNight || listing.price?.starting || listing['Starting nightly price'] || 0;
    } catch (error) {
      // Fallback to starting price on error
      return listing.price?.starting || listing['Starting nightly price'] || 0;
    }
  }, [selectedNightsCount]);

  // Listing card state
  const [selectedListingForCard, setSelectedListingForCard] = useState(null);
  const [cardVisible, setCardVisible] = useState(false);
  const [cardPosition, setCardPosition] = useState({ x: 0, y: 0 });
  const [isLoadingListingDetails, setIsLoadingListingDetails] = useState(false);

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    // Highlight marker: pan to center on it (no zoom change), pulse, and show card
    highlightListing(listingId) {
      if (!googleMapRef.current || !mapLoaded) {
        logger.error('Map not initialized yet');
        return;
      }

      // Find the listing in either filtered or all listings
      const listing = filteredListings.find(l => l.id === listingId) ||
                     listings.find(l => l.id === listingId);

      if (!listing) {
        logger.error('Listing not found:', listingId);
        return;
      }

      const coords = listing.coordinates;
      if (!coords || !coords.lat || !coords.lng) {
        logger.error('Invalid coordinates for listing:', listingId);
        return;
      }

      const map = googleMapRef.current;

      // Pan to center on the listing (without changing zoom)
      map.panTo({ lat: coords.lat, lng: coords.lng });

      const marker = markersRef.current.find(m => m.listingId === listingId);
      if (marker && marker.div) {
        // Remove pulse from all other markers first
        markersRef.current.forEach(m => {
          if (m.div) m.div.classList.remove('pulse');
        });
        // Add pulse animation to this marker (continues until hover ends)
        marker.div.classList.add('pulse');

        // If a map card is already visible, update it to show the hovered listing
        if (cardVisible && selectedListingForCard) {
          // Calculate card position for the new marker
          const mapContainer = mapRef.current;
          if (mapContainer && marker.div) {
            const mapRect = mapContainer.getBoundingClientRect();
            const markerRect = marker.div.getBoundingClientRect();

            // Card dimensions (matching ListingCardForMap)
            const cardHeight = 300; // Approximate card height
            const arrowHeight = 10;
            const gapFromPin = 5;

            const x = markerRect.left - mapRect.left + markerRect.width / 2;
            // Position card so its bottom (including arrow) is above the marker
            const y = markerRect.top - mapRect.top - cardHeight - arrowHeight - gapFromPin;
            setCardPosition({ x, y });
          }
          setSelectedListingForCard(listing);
        }
      }
    },
    // Stop pulsing all markers (called when hover ends)
    stopPulse() {
      markersRef.current.forEach(m => {
        if (m.div) m.div.classList.remove('pulse');
      });
    },
    zoomToListing(listingId) {
      if (!googleMapRef.current || !mapLoaded) {
        logger.error('Map not initialized yet');
        return;
      }

      // Find the listing in either filtered or all listings
      const listing = filteredListings.find(l => l.id === listingId) ||
                     listings.find(l => l.id === listingId);

      if (!listing) {
        logger.error('Listing not found:', listingId);
        return;
      }

      const coords = listing.coordinates;
      if (!coords || !coords.lat || !coords.lng) {
        logger.error('Invalid coordinates for listing:', listingId);
        return;
      }

      const map = googleMapRef.current;

      // Determine zoom level based on borough
      let zoomLevel = 16;
      if (listing.borough === 'Manhattan') {
        zoomLevel = 17;
      } else if (listing.borough === 'Staten Island' || listing.borough === 'Queens') {
        zoomLevel = 15;
      }

      // Create a LatLngBounds and extend it with the listing coordinates
      const bounds = new window.google.maps.LatLngBounds();
      bounds.extend({ lat: coords.lat, lng: coords.lng });

      // Get the map container's height to calculate appropriate padding
      const mapContainer = mapRef.current;
      const containerHeight = mapContainer ? mapContainer.offsetHeight : 400;

      // Calculate padding to center the pin in the VISIBLE viewport
      // When scrolling to the map, the header (80px) + padding (20px) = ~100px overlap
      // This means the top ~100px of the map container is hidden by the fixed header
      //
      // Visible area: from 100px to 400px (300px tall)
      // To center the pin in the visible 300px area, it should be at 250px from container top
      //
      // With fitBounds padding:
      // - top: 150px (header offset 100px + centering adjustment 50px)
      // - bottom: 50px (balances to center pin at 250px)
      // This centers the pin at: 150px + (200px / 2) = 250px, which is the midpoint of 100-400px
      const topPadding = 150; // Accounts for header overlap + centering
      const bottomPadding = 50; // Balances for proper centering

      // Smooth pan and zoom with bounds that account for container dimensions and header offset
      map.fitBounds(bounds, {
        top: topPadding,
        bottom: bottomPadding,
        left: 50,
        right: 50
      });

      // Set zoom level after fitBounds completes
      window.google.maps.event.addListenerOnce(map, 'bounds_changed', () => {
        map.setZoom(zoomLevel);
      });

      // Find and highlight the marker
      const marker = markersRef.current.find(m => m.listingId === listingId);
      if (marker && marker.div) {
        // Add pulse animation class
        marker.div.classList.add('pulse');
        setTimeout(() => {
          marker.div.classList.remove('pulse');
        }, 3000);

        // Show listing card after pan completes
        setTimeout(() => {
          handlePinClick(listing, marker.div);
        }, 600);
      }
    }
  }));

  /**
   * Fetch detailed listing data from Supabase when a pin is clicked
   */
  const fetchDetailedListingData = async (listingId) => {
    logger.debug('🔍 fetchDetailedListingData: Starting fetch for listing:', listingId);
    setIsLoadingListingDetails(true);

    try {
      logger.debug('📊 fetchDetailedListingData: Querying Supabase...');
      const { data: listingData, error: listingError } = await supabase
        .from('listing')
        .select('*')
        .eq('_id', listingId)
        .single();

      if (listingError) {
        logger.error('❌ fetchDetailedListingData: Supabase error:', listingError);
        throw listingError;
      }

      logger.debug('✅ fetchDetailedListingData: Listing data received:', {
        id: listingData._id,
        name: listingData.Name,
        borough: listingData['Location - Borough']
      });

      logger.debug('📸 fetchDetailedListingData: Fetching photos...');
      // Extract photo IDs from the Features - Photos field
      const photosField = listingData['Features - Photos'];
      const photoIds = [];

      if (Array.isArray(photosField)) {
        photoIds.push(...photosField);
      } else if (typeof photosField === 'string') {
        try {
          const parsed = JSON.parse(photosField);
          if (Array.isArray(parsed)) {
            photoIds.push(...parsed);
          }
        } catch (e) {
          logger.error('📸 fetchDetailedListingData: Failed to parse photos field:', e);
        }
      }

      logger.debug('📸 fetchDetailedListingData: Extracted photo IDs:', photoIds);

      // Fetch URLs for the photo IDs
      const photoMap = await fetchPhotoUrls(photoIds);

      // Convert photo IDs to URLs using extractPhotos
      const images = extractPhotos(photosField, photoMap, listingId);
      logger.debug('📸 fetchDetailedListingData: Photos received:', images.length, 'images');

      const detailedListing = {
        id: listingData._id,
        title: listingData.Name,
        images,
        location: listingData['Location - Borough'],
        bedrooms: listingData['Features - Qty Bedrooms'] || 0,
        bathrooms: listingData['Features - Qty Bathrooms'] || 0,
        squareFeet: listingData['Features - SQFT Area'] || 0,
        price: {
          starting: listingData['Standarized Minimum Nightly Price (Filter)'] || 0
        },
        isNew: false,
        isAvailable: listingData.Active || false
      };

      logger.debug('✅ fetchDetailedListingData: Detailed listing built:', detailedListing);
      return detailedListing;
    } catch (error) {
      logger.error('❌ fetchDetailedListingData: Failed to fetch listing details:', error);
      return null;
    } finally {
      setIsLoadingListingDetails(false);
      logger.debug('🏁 fetchDetailedListingData: Loading state set to false');
    }
  };

  /**
   * React callback to handle pin clicks properly within React's state management
   * This ensures state updates trigger re-renders correctly
   * @param {Object} listing - The listing data
   * @param {HTMLElement} priceTag - The price tag DOM element
   * @param {Object} options - Optional settings
   * @param {boolean} options.skipParentCallback - If true, don't call onMarkerClick (used for hover highlights)
   */
  const handlePinClick = useCallback(async (listing, priceTag, options = {}) => {
    const { skipParentCallback = false } = options;
    logger.debug('🖱️ handlePinClick (React callback): Pin clicked:', {
      listingId: listing.id,
      listingTitle: listing.title,
      skipParentCallback
    });

    // Call parent callback FIRST (before any async operations) so scroll/highlight happens immediately
    if (onMarkerClick && !skipParentCallback) {
      logger.debug('📜 handlePinClick: Calling onMarkerClick to scroll to listing card');
      onMarkerClick(listing);
    }

    // Calculate card position relative to map container
    const mapContainer = mapRef.current;
    if (!mapContainer) {
      logger.error('❌ handlePinClick: Map container ref not available');
      return;
    }

    const map = googleMapRef.current;
    const mapRect = mapContainer.getBoundingClientRect();
    const priceTagRect = priceTag.getBoundingClientRect();

    // Calculate position relative to map container
    const pinCenterX = priceTagRect.left - mapRect.left + (priceTagRect.width / 2);
    const pinTop = priceTagRect.top - mapRect.top;

    // Card dimensions (matching ListingCardForMap - updated for compact layout)
    const cardWidth = 300;
    const cardHeight = 300; // Approximate height after compact layout updates
    const arrowHeight = 10;
    const gapFromPin = 5;
    const margin = 20;

    // Calculate card position - center on pin, above it
    let cardLeft = pinCenterX;
    let cardTop = pinTop - cardHeight - arrowHeight - gapFromPin;

    // Keep card within map bounds horizontally
    const minLeft = margin + (cardWidth / 2);
    const maxLeft = mapRect.width - margin - (cardWidth / 2);
    cardLeft = Math.max(minLeft, Math.min(maxLeft, cardLeft));

    // Check if card would go above map (marker is in upper portion)
    // If so, pan the map down to create space for the card above the marker
    if (cardTop < margin && map && listing.coordinates) {
      logger.debug('📍 handlePinClick: Marker in upper portion, panning map down to create space');

      // Calculate how much vertical space we need (card height + gap + margin)
      const spaceNeeded = cardHeight + arrowHeight + gapFromPin + margin;

      // Calculate how far above the center the pin currently is
      const mapCenterY = mapRect.height / 2;
      const pinDistanceAboveCenter = mapCenterY - pinTop;

      // We need to pan the map so the pin moves down by at least spaceNeeded pixels
      // This means panning north (decreasing latitude)
      const projection = map.getProjection();
      if (projection) {
        const currentCenter = map.getCenter();
        const scale = Math.pow(2, map.getZoom());
        const worldCoordinateCenter = projection.fromLatLngToPoint(currentCenter);

        // Calculate pixel offset needed - pan down by the space needed for the card
        // Adding some extra padding (50px) for visual comfort
        const pixelOffset = spaceNeeded - pinTop + 50;

        // Convert pixel offset to world coordinates
        // Negative Y means moving the map content up, which moves the pin down visually
        const newWorldCoordinate = new window.google.maps.Point(
          worldCoordinateCenter.x,
          worldCoordinateCenter.y - (pixelOffset / scale)
        );

        const newCenter = projection.fromPointToLatLng(newWorldCoordinate);

        // Smoothly pan to the new center
        map.panTo(newCenter);

        // Wait for pan to complete, then recalculate card position
        await new Promise(resolve => setTimeout(resolve, 350));

        // Recalculate position after pan
        const newPriceTagRect = priceTag.getBoundingClientRect();
        const newPinTop = newPriceTagRect.top - mapRect.top;
        cardTop = newPinTop - cardHeight - arrowHeight - gapFromPin;

        // Update horizontal position as well in case it shifted
        const newPinCenterX = newPriceTagRect.left - mapRect.left + (newPriceTagRect.width / 2);
        cardLeft = Math.max(minLeft, Math.min(maxLeft, newPinCenterX));

        logger.debug('📍 handlePinClick: Recalculated card position after pan:', { x: cardLeft, y: cardTop });
      }
    }

    logger.debug('📍 handlePinClick: Card position calculated:', { x: cardLeft, y: cardTop });

    // Set position first
    setCardPosition({ x: cardLeft, y: cardTop });
    logger.debug('✅ handlePinClick: Card position state updated');

    // Show card immediately
    setCardVisible(true);
    logger.debug('✅ handlePinClick: Card visibility state set to true');

    // Check if listing already has images (e.g., from filteredListings)
    // If so, use it directly instead of fetching from database
    let detailedListing;
    if (listing.images && listing.images.length > 0) {
      logger.debug('✅ handlePinClick: Listing already has images, using existing data:', {
        id: listing.id,
        imageCount: listing.images.length
      });
      detailedListing = listing;
    } else {
      logger.debug('🔍 handlePinClick: Listing has no images, fetching from database...');
      detailedListing = await fetchDetailedListingData(listing.id);
    }

    if (detailedListing && detailedListing.images && detailedListing.images.length > 0) {
      logger.debug('✅ handlePinClick: Setting detailed listing to card:', detailedListing);
      setSelectedListingForCard(detailedListing);
    } else {
      logger.error('❌ handlePinClick: Failed to get listing details or no images available, not showing card');
      setCardVisible(false);
    }
    logger.debug('✅ handlePinClick: Selected listing state updated');
  }, [onMarkerClick]);

  // Keep ref updated with latest handlePinClick so event listeners always use current version
  handlePinClickRef.current = handlePinClick;

  // Initialize Google Map when API is loaded
  useEffect(() => {
    const initMap = () => {
      logger.debug('🗺️ GoogleMap: Initializing map...', {
        mapRefExists: !!mapRef.current,
        googleMapsLoaded: !!(window.google && window.google.maps),
        simpleMode,
        hasFilteredListings: filteredListings.length > 0,
        hasListings: listings.length > 0,
        mapAlreadyExists: !!googleMapRef.current
      });

      if (!mapRef.current || !window.google) {
        logger.warn('⚠️ GoogleMap: Cannot initialize - missing mapRef or Google Maps API');
        return;
      }

      // Don't recreate map if it already exists
      if (googleMapRef.current) {
        logger.debug('⏭️ GoogleMap: Map already exists, skipping re-initialization');
        return;
      }

      // Determine initial center and zoom based on mode and available data
      let initialCenter;
      let initialZoomLevel;

      // For simple mode with a single listing, use that listing's coordinates
      if (simpleMode && (filteredListings.length === 1 || listings.length === 1)) {
        const listing = filteredListings[0] || listings[0];
        if (listing?.coordinates?.lat && listing?.coordinates?.lng) {
          initialCenter = { lat: listing.coordinates.lat, lng: listing.coordinates.lng };
          initialZoomLevel = initialZoom || 17;
          logger.debug('🗺️ GoogleMap: Using listing coordinates for initial center:', initialCenter);
        }
      }

      // Fallback to default
      if (!initialCenter) {
        const defaultMapConfig = getBoroughMapConfig('default');
        initialCenter = defaultMapConfig.center;
        initialZoomLevel = defaultMapConfig.zoom;
        logger.debug('🗺️ GoogleMap: Using default center');
      }

      // Create map instance
      const map = new window.google.maps.Map(mapRef.current, {
        center: initialCenter,
        zoom: initialZoomLevel,
        mapTypeControl: true,
        streetViewControl: true,
        fullscreenControl: true,
        zoomControl: true,
        zoomControlOptions: {
          position: window.google.maps.ControlPosition.RIGHT_CENTER
        },
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          }
        ]
      });

      googleMapRef.current = map;
      // Reset marker signature so markers are recreated on new map instance
      lastMarkersUpdateRef.current = null;
      setMapLoaded(true);
      logger.debug('✅ GoogleMap: Map initialized successfully with zoom controls enabled');
    };

    // Wait for Google Maps API to fully load
    // Check that both google.maps exists AND ControlPosition is available (indicates full load)
    if (window.google && window.google.maps && window.google.maps.ControlPosition) {
      logger.debug('✅ GoogleMap: Google Maps API already loaded, initializing...');
      initMap();
    } else {
      logger.debug('⏳ GoogleMap: Waiting for Google Maps API to load...');
      window.addEventListener('google-maps-loaded', initMap);
      return () => window.removeEventListener('google-maps-loaded', initMap);
    }
  }, [filteredListings, listings, simpleMode, initialZoom]);

  // Update markers when listings change
  useEffect(() => {
    if (!mapLoaded || !googleMapRef.current) {
      if (import.meta.env.DEV) {
        logger.warn('⚠️ GoogleMap: Skipping marker update - map not ready');
      }
      return;
    }

    // Performance optimization: Prevent duplicate marker updates
    const markerSignature = `${listings.map(l => l.id).join(',')}-${filteredListings.map(l => l.id).join(',')}-${showAllListings}`;
    if (lastMarkersUpdateRef.current === markerSignature) {
      if (import.meta.env.DEV) {
        logger.debug('⏭️ GoogleMap: Skipping duplicate marker update - same listings');
      }
      return;
    }

    lastMarkersUpdateRef.current = markerSignature;

    // Defer marker creation to next frame to prevent blocking render
    function createMarkers() {
      if (import.meta.env.DEV) {
        logger.debug('🗺️ GoogleMap: Markers update triggered', {
          mapLoaded,
          googleMapExists: !!googleMapRef.current,
          totalListings: listings.length,
          filteredListings: filteredListings.length,
          showAllListings,
          allListingsPassedCorrectly: listings.length > 0,
          backgroundLayerEnabled: showAllListings
        });
      }

      // Clear existing markers
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current = [];
      logger.debug('🗺️ GoogleMap: Cleared existing markers');

      const map = googleMapRef.current;
      const bounds = new window.google.maps.LatLngBounds();
      let hasValidMarkers = false;

      // Create markers for filtered listings (simple or purple depending on mode)
      if (filteredListings && filteredListings.length > 0) {
        logger.debug(`🗺️ GoogleMap: Starting ${simpleMode ? 'simple' : 'purple'} marker creation for filtered listings:`, filteredListings.length);
        logger.debug('🗺️ GoogleMap: First 3 filtered listings:', filteredListings.slice(0, 3).map(l => ({
          id: l.id,
          title: l.title,
          coordinates: l.coordinates,
          hasCoordinates: !!(l.coordinates?.lat && l.coordinates?.lng)
        })));

        let markersCreated = 0;
        let skippedNoCoordinates = 0;
        const skippedInvalidCoordinates = [];

        filteredListings.forEach((listing, index) => {
          logger.debug(`🗺️ GoogleMap: [${index + 1}/${filteredListings.length}] Processing filtered listing:`, {
            id: listing.id,
            title: listing.title,
            coordinates: listing.coordinates,
            hasCoordinatesObject: !!listing.coordinates,
            hasLat: listing.coordinates?.lat !== undefined,
            hasLng: listing.coordinates?.lng !== undefined,
            lat: listing.coordinates?.lat,
            lng: listing.coordinates?.lng
          });

          if (!listing.coordinates || !listing.coordinates.lat || !listing.coordinates.lng) {
            logger.error(`❌ GoogleMap: Skipping filtered listing ${listing.id} - Missing or invalid coordinates:`, {
              coordinates: listing.coordinates,
              hasCoordinates: !!listing.coordinates,
              lat: listing.coordinates?.lat,
              lng: listing.coordinates?.lng
            });
            skippedNoCoordinates++;
            skippedInvalidCoordinates.push({
              id: listing.id,
              title: listing.title,
              coordinates: listing.coordinates
            });
            return;
          }

          const position = {
            lat: listing.coordinates.lat,
            lng: listing.coordinates.lng
          };

          // Calculate dynamic price based on selected nights
          const displayPrice = getDisplayPrice(listing);

          logger.debug(`✅ GoogleMap: Creating ${simpleMode ? 'simple' : 'purple'} marker for listing ${listing.id}:`, {
            position,
            displayPrice,
            startingPrice: listing.price?.starting || listing['Starting nightly price'],
            selectedNightsCount,
            title: listing.title,
            simpleMode
          });

          // Create marker based on mode
          const marker = simpleMode
            ? createSimpleMarker(map, position, listing)
            : createPriceMarker(
                map,
                position,
                displayPrice,
                COLORS.SECONDARY, // Purple - search results
                listing
              );

          markersRef.current.push(marker);
          bounds.extend(position);
          hasValidMarkers = true;
          markersCreated++;

          logger.debug(`✅ GoogleMap: ${simpleMode ? 'Simple' : 'Purple'} marker created successfully for ${listing.id}, total markers so far: ${markersRef.current.length}`);
        });

        logger.debug(`📊 GoogleMap: ${simpleMode ? 'Simple' : 'Purple'} marker creation summary:`, {
          totalFiltered: filteredListings.length,
          markersCreated: markersCreated,
          skippedNoCoordinates,
          skippedInvalidCoordinates: skippedInvalidCoordinates.length,
          invalidListings: skippedInvalidCoordinates
        });
      } else {
        logger.debug('⚠️ GoogleMap: No filtered listings to create purple markers for');
      }

      // Create markers for all listings (grey) - background context
      if (showAllListings && listings && listings.length > 0) {
        logger.debug('🗺️ GoogleMap: Starting grey marker creation for all listings (background layer):', listings.length);
        logger.debug('🗺️ GoogleMap: First 3 all listings:', listings.slice(0, 3).map(l => ({
          id: l.id,
          title: l.title,
          coordinates: l.coordinates,
          hasCoordinates: !!(l.coordinates?.lat && l.coordinates?.lng)
        })));

        let greenMarkersCreated = 0;
        let skippedAlreadyFiltered = 0;
        let skippedNoCoordinates = 0;
        const skippedInvalidCoordinates = [];

        listings.forEach((listing, index) => {
          // Skip if already shown as filtered listing
          const isFiltered = filteredListings?.some(fl => fl.id === listing.id);
          if (isFiltered) {
            logger.debug(`⏭️ GoogleMap: [${index + 1}/${listings.length}] Skipping ${listing.id} - Already shown as purple marker`);
            skippedAlreadyFiltered++;
            return;
          }

          logger.debug(`🗺️ GoogleMap: [${index + 1}/${listings.length}] Processing all listing:`, {
            id: listing.id,
            title: listing.title,
            coordinates: listing.coordinates,
            hasCoordinatesObject: !!listing.coordinates,
            hasLat: listing.coordinates?.lat !== undefined,
            hasLng: listing.coordinates?.lng !== undefined,
            lat: listing.coordinates?.lat,
            lng: listing.coordinates?.lng
          });

          if (!listing.coordinates || !listing.coordinates.lat || !listing.coordinates.lng) {
            logger.error(`❌ GoogleMap: Skipping all listing ${listing.id} - Missing or invalid coordinates:`, {
              coordinates: listing.coordinates,
              hasCoordinates: !!listing.coordinates,
              lat: listing.coordinates?.lat,
              lng: listing.coordinates?.lng
            });
            skippedNoCoordinates++;
            skippedInvalidCoordinates.push({
              id: listing.id,
              title: listing.title,
              coordinates: listing.coordinates
            });
            return;
          }

          const position = {
            lat: listing.coordinates.lat,
            lng: listing.coordinates.lng
          };

          // Calculate dynamic price based on selected nights
          const displayPrice = getDisplayPrice(listing);

          logger.debug(`✅ GoogleMap: Creating grey marker for listing ${listing.id}:`, {
            position,
            displayPrice,
            startingPrice: listing.price?.starting || listing['Starting nightly price'],
            selectedNightsCount,
            title: listing.title
          });

          // Create grey marker for all listings
          const marker = createPriceMarker(
            map,
            position,
            displayPrice,
            COLORS.MUTED, // Grey - all active listings
            listing
          );

          markersRef.current.push(marker);
          bounds.extend(position);
          hasValidMarkers = true;
          greenMarkersCreated++;

          logger.debug(`✅ GoogleMap: Grey marker created successfully for ${listing.id}, total markers so far: ${markersRef.current.length}`);
        });

        logger.debug('📊 GoogleMap: Grey marker creation summary:', {
          totalAllListings: listings.length,
          markersCreated: greenMarkersCreated,
          skippedAlreadyFiltered,
          skippedNoCoordinates,
          skippedInvalidCoordinates: skippedInvalidCoordinates.length,
          invalidListings: skippedInvalidCoordinates
        });
      } else {
        logger.debug('⚠️ GoogleMap: No all listings to create grey markers for (showAllListings:', showAllListings, ', listings.length:', listings?.length, ')');
      }

      // Fit map to show all markers
      if (hasValidMarkers) {
        if (import.meta.env.DEV) {
          logger.debug('✅ GoogleMap: Fitting bounds to markers', {
            markerCount: markersRef.current.length,
            bounds: bounds.toString(),
            disableAutoZoom,
            initialZoom,
            simpleMode
          });
        }

        // In simple mode, skip auto-centering here because parent will call zoomToListing explicitly
        // This prevents double-zooming and ensures exact same behavior as clicking "Located in" link
        if (simpleMode && markersRef.current.length === 1) {
          logger.debug('🗺️ GoogleMap: Simple mode - Skipping auto-center, parent will call zoomToListing');
          // Do nothing - parent component will call zoomToListing to center the map
        } else if (!disableAutoZoom) {
          // Normal auto-fit behavior
          map.fitBounds(bounds);

          // Prevent over-zooming on single marker (unless initial zoom is specified)
          if (!initialZoom) {
            const listener = window.google.maps.event.addListener(map, 'idle', () => {
              if (map.getZoom() > 16) map.setZoom(16);
              window.google.maps.event.removeListener(listener);
            });
          }
        }
      } else {
        logger.warn('⚠️ GoogleMap: No valid markers to display');
      }
    }

    // Render markers immediately without lazy loading
    createMarkers();
  }, [listings, filteredListings, mapLoaded, showAllListings, selectedNightsCount, getDisplayPrice]);

  // Recenter map when borough changes
  useEffect(() => {
    if (!mapLoaded || !googleMapRef.current || !selectedBorough) return;

    logger.debug('🗺️ GoogleMap: Borough changed, recentering map:', selectedBorough);

    const boroughConfig = getBoroughMapConfig(selectedBorough);
    const map = googleMapRef.current;

    // Smoothly pan to new borough center
    map.panTo(boroughConfig.center);
    map.setZoom(boroughConfig.zoom);

    logger.debug(`✅ GoogleMap: Map recentered to ${boroughConfig.name}`);
  }, [selectedBorough, mapLoaded]);

  // Highlight selected listing marker
  useEffect(() => {
    if (!selectedListing || !mapLoaded) return;

    // Find and highlight the selected marker
    // This could pulse the marker or change its appearance
    // Implementation depends on requirements
  }, [selectedListing, mapLoaded]);

  /**
   * Create a simple standard Google Maps marker (for view-split-lease page)
   * No label or info window - just the pin
   * @param {google.maps.Map} map - The map instance
   * @param {object} coordinates - {lat, lng} coordinates
   * @param {object} listing - Full listing data
   * @returns {google.maps.Marker} The created marker
   */
  const createSimpleMarker = (map, coordinates, listing) => {
    const marker = new window.google.maps.Marker({
      position: { lat: coordinates.lat, lng: coordinates.lng },
      map: map,
      title: '', // Remove title to prevent label on hover
      animation: window.google.maps.Animation.DROP,
      // Use default red marker (no icon property = default marker)
    });

    // Store listing ID for reference
    marker.listingId = listing.id;

    logger.debug('✅ GoogleMap: Simple marker created successfully for listing:', {
      id: listing.id,
      title: listing.title,
      position: { lat: coordinates.lat, lng: coordinates.lng }
    });

    return marker;
  };

  /**
   * Create a custom price label marker using OverlayView
   * NO LAZY LOADING: Immediate rendering for all price pins
   * @param {google.maps.Map} map - The map instance
   * @param {object} coordinates - {lat, lng} coordinates
   * @param {number} price - Price to display
   * @param {string} color - Marker color (hex: #00C851 green or #31135D purple)
   * @param {object} listing - Full listing data
   * @returns {google.maps.OverlayView} The created overlay marker
   */
  const createPriceMarker = (map, coordinates, price, color, listing) => {
    const markerOverlay = new window.google.maps.OverlayView();

    markerOverlay.onAdd = function() {
      const priceTag = document.createElement('div');
      priceTag.innerHTML = `$${parseFloat(price).toFixed(2)}`;
      priceTag.className = 'map-price-marker';
      priceTag.dataset.color = color;
      priceTag.style.cssText = `
        position: absolute;
        left: 0;
        top: 0;
        background: ${color};
        color: white;
        padding: 6px 12px;
        border-radius: 20px;
        font-weight: 600;
        font-size: 14px;
        font-family: 'Inter', sans-serif;
        white-space: nowrap;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
        cursor: pointer;
        transition: background-color 0.2s ease;
        transform: translate(-50%, -50%);
        z-index: ${color === '#5B21B6' ? '1002' : '1001'};
        will-change: transform;
        pointer-events: auto;
        display: block;
        visibility: visible;
        opacity: 1;
        min-width: 50px;
        text-align: center;
      `;

      // HOVER EFFECTS TEMPORARILY REMOVED TO ISOLATE BUNCHING BUG
      // TODO: Re-implement hover effects after fixing positioning bug
      // Previous implementation was overwriting transform position from draw()

      // Use ref to always call latest handlePinClick (avoids stale closure issue)
      priceTag.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent event from bubbling to map container
        if (handlePinClickRef.current) {
          handlePinClickRef.current(listing, priceTag);
        }
      });

      this.div = priceTag;
      const panes = this.getPanes();
      // Use overlayMouseTarget pane for clickable overlays (sits above map tiles)
      panes.overlayMouseTarget.appendChild(priceTag);
      logger.debug('📍 MarkerOverlay.onAdd: marker appended to DOM', {
        listingId: listing.id,
        price: price,
        innerHTML: priceTag.innerHTML,
        paneType: 'overlayMouseTarget',
        divExists: !!this.div
      });
    };

    markerOverlay.draw = function() {
      if (!this.div) {
        logger.warn('📍 MarkerOverlay.draw: div not found for listing:', listing.id);
        return;
      }

      // Immediate rendering without RAF - no lazy loading
      const projection = this.getProjection();
      if (!projection) {
        logger.warn('📍 MarkerOverlay.draw: projection not available for listing:', listing.id);
        return;
      }

      const position = projection.fromLatLngToDivPixel(
        new window.google.maps.LatLng(coordinates.lat, coordinates.lng)
      );

      logger.debug('📍 MarkerOverlay.draw: positioning marker', {
        listingId: listing.id,
        coordinates: { lat: coordinates.lat, lng: coordinates.lng },
        pixelPosition: position ? { x: position.x, y: position.y } : null
      });

      if (this.div && position) {
        // Use transform3d for GPU acceleration
        this.div.style.transform = `translate3d(${position.x}px, ${position.y}px, 0) translate(-50%, -50%)`;
        // Also set left/top as fallback
        this.div.style.left = '0px';
        this.div.style.top = '0px';
      }
    };

    markerOverlay.onRemove = function() {
      if (this.div) {
        this.div.parentNode.removeChild(this.div);
        this.div = null;
      }
    };

    try {
      markerOverlay.setMap(map);
      markerOverlay.listingId = listing.id;
      logger.debug('📍 createPriceMarker: marker set on map', {
        listingId: listing.id,
        hasDiv: !!markerOverlay.div,
        mapSet: markerOverlay.getMap() === map
      });
    } catch (error) {
      logger.error('📍 createPriceMarker: error setting map', {
        listingId: listing.id,
        error: error.message
      });
    }

    return markerOverlay;
  };

  // Close card when clicking on map
  const handleMapClick = () => {
    logger.debug('🗺️ handleMapClick: Map clicked, closing card');
    setCardVisible(false);
    setSelectedListingForCard(null);
  };

  // Memoized callback for legend toggle to prevent re-renders
  const handleLegendToggle = useCallback((checked) => {
    setShowAllListings(checked);
  }, []);

  return (
    <div className="google-map-container">
      <div
        ref={mapRef}
        className="google-map"
        style={{
          width: '100%',
          height: '100%',
          minHeight: '500px',
          borderRadius: '12px'
        }}
        onClick={handleMapClick}
      />
      {mapLoaded && !simpleMode && (
        <MapLegend
          showAllListings={showAllListings}
          onToggle={handleLegendToggle}
        />
      )}
      {mapLoaded && !simpleMode && (
        <AIResearchButton onAIResearchClick={onAIResearchClick} />
      )}
      {!mapLoaded && (
        <div className="map-loading">
          <div className="spinner"></div>
          <p>Loading map...</p>
        </div>
      )}

      {/* Listing Card Overlay - Only in normal mode, not in simple mode */}
      {(() => {
        logger.debug('🎨 Rendering card overlay - State check:', {
          mapLoaded,
          cardVisible,
          isLoadingListingDetails,
          hasSelectedListing: !!selectedListingForCard,
          selectedListing: selectedListingForCard,
          cardPosition,
          simpleMode
        });
        return null;
      })()}
      {mapLoaded && cardVisible && !simpleMode && (
        <>
          {isLoadingListingDetails && (
            <div
              style={{
                position: 'absolute',
                left: `${cardPosition.x}px`,
                top: `${cardPosition.y}px`,
                transform: 'translate(-50%, 0)',
                background: 'white',
                padding: '20px',
                borderRadius: '12px',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
                zIndex: 1000,
              }}
            >
              <div className="spinner" style={{ margin: '0 auto' }}></div>
              <p style={{ margin: '10px 0 0 0', textAlign: 'center' }}>Loading listing details...</p>
            </div>
          )}
          {!isLoadingListingDetails && selectedListingForCard && (() => {
            const listingId = selectedListingForCard.id || selectedListingForCard._id;
            logger.debug('[GoogleMap] Rendering ListingCardForMap', {
              listingId,
              hasMessageCallback: !!onMessageClick
            });
            return (
              <ListingCardForMap
                listing={selectedListingForCard}
                onClose={() => {
                  setCardVisible(false);
                  setSelectedListingForCard(null);
                }}
                isVisible={cardVisible}
                position={cardPosition}
                onMessageClick={onMessageClick}
                isLoggedIn={isLoggedIn}
                isFavorited={favoritedListingIds?.has(listingId)}
                onToggleFavorite={onToggleFavorite}
                userId={userId}
                onRequireAuth={onRequireAuth}
              />
            );
          })()}
        </>
      )}
    </div>
  );
});

GoogleMap.displayName = 'GoogleMap';

export default GoogleMap;
