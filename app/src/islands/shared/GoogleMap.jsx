/**
 * GoogleMap Island Component
 * Displays an interactive Google Map with listing markers
 *
 * Features:
 * - Green markers for all active listings
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
 *     onMarkerClick={(listing) => console.log('Clicked:', listing)}
 *   />
 */

import { useEffect, useRef, useState, forwardRef, useImperativeHandle, useCallback } from 'react';
import { DEFAULTS, COLORS, getBoroughMapConfig } from '../../lib/constants.js';
import ListingCardForMap from './ListingCard/ListingCardForMap.jsx';
import { supabase } from '../../lib/supabase.js';
import { fetchPhotoUrls, extractPhotos } from '../../lib/supabaseUtils.js';

const GoogleMap = forwardRef(({
  listings = [],           // All listings to show as green markers
  filteredListings = [],   // Filtered subset to show as purple markers
  selectedListing = null,  // Currently selected/highlighted listing
  onMarkerClick = null,    // Callback when marker clicked: (listing) => void
  selectedBorough = null,  // Current borough filter for map centering
  simpleMode = false,      // If true, show simple marker without price/card (for view-split-lease page)
  initialZoom = null,      // Optional initial zoom level (defaults to auto-fit)
  disableAutoZoom = false, // If true, don't auto-fit bounds or restrict zoom
  onAIResearchClick = null // Callback when AI research button is clicked
}, ref) => {
  console.log('🗺️ GoogleMap: Component rendered with props:', {
    listingsCount: listings.length,
    filteredListingsCount: filteredListings.length,
    selectedBorough,
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

  // Listing card state
  const [selectedListingForCard, setSelectedListingForCard] = useState(null);
  const [cardVisible, setCardVisible] = useState(false);
  const [cardPosition, setCardPosition] = useState({ x: 0, y: 0 });
  const [isLoadingListingDetails, setIsLoadingListingDetails] = useState(false);

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    zoomToListing(listingId) {
      if (!googleMapRef.current || !mapLoaded) {
        console.error('Map not initialized yet');
        return;
      }

      // Find the listing in either filtered or all listings
      const listing = filteredListings.find(l => l.id === listingId) ||
                     listings.find(l => l.id === listingId);

      if (!listing) {
        console.error('Listing not found:', listingId);
        return;
      }

      const coords = listing.coordinates;
      if (!coords || !coords.lat || !coords.lng) {
        console.error('Invalid coordinates for listing:', listingId);
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
    console.log('🔍 fetchDetailedListingData: Starting fetch for listing:', listingId);
    setIsLoadingListingDetails(true);

    try {
      console.log('📊 fetchDetailedListingData: Querying Supabase...');
      const { data: listingData, error: listingError } = await supabase
        .from('listing')
        .select('*')
        .eq('_id', listingId)
        .single();

      if (listingError) {
        console.error('❌ fetchDetailedListingData: Supabase error:', listingError);
        throw listingError;
      }

      console.log('✅ fetchDetailedListingData: Listing data received:', {
        id: listingData._id,
        name: listingData.Name,
        borough: listingData['Location - Borough']
      });

      console.log('📸 fetchDetailedListingData: Fetching photos...');
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
          console.error('📸 fetchDetailedListingData: Failed to parse photos field:', e);
        }
      }

      console.log('📸 fetchDetailedListingData: Extracted photo IDs:', photoIds);

      // Fetch URLs for the photo IDs
      const photoMap = await fetchPhotoUrls(photoIds);

      // Convert photo IDs to URLs using extractPhotos
      const images = extractPhotos(photosField, photoMap, listingId);
      console.log('📸 fetchDetailedListingData: Photos received:', images.length, 'images');

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

      console.log('✅ fetchDetailedListingData: Detailed listing built:', detailedListing);
      return detailedListing;
    } catch (error) {
      console.error('❌ fetchDetailedListingData: Failed to fetch listing details:', error);
      return null;
    } finally {
      setIsLoadingListingDetails(false);
      console.log('🏁 fetchDetailedListingData: Loading state set to false');
    }
  };

  /**
   * React callback to handle pin clicks properly within React's state management
   * This ensures state updates trigger re-renders correctly
   */
  const handlePinClick = useCallback(async (listing, priceTag) => {
    console.log('🖱️ handlePinClick (React callback): Pin clicked:', {
      listingId: listing.id,
      listingTitle: listing.title
    });

    // Calculate card position relative to map container
    const mapContainer = mapRef.current;
    if (!mapContainer) {
      console.error('❌ handlePinClick: Map container ref not available');
      return;
    }

    const mapRect = mapContainer.getBoundingClientRect();
    const priceTagRect = priceTag.getBoundingClientRect();

    // Calculate position relative to map container
    const pinCenterX = priceTagRect.left - mapRect.left + (priceTagRect.width / 2);
    const pinTop = priceTagRect.top - mapRect.top;

    // Card dimensions (matching ListingCardForMap)
    const cardWidth = 340;
    const cardHeight = 340; // Approximate height
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

    // Keep card within map bounds vertically
    if (cardTop < margin) {
      // If card would go above map, position it below the pin instead
      cardTop = pinTop + priceTagRect.height + arrowHeight + gapFromPin;
    }

    console.log('📍 handlePinClick: Card position calculated:', { x: cardLeft, y: cardTop });

    // Set position first
    setCardPosition({ x: cardLeft, y: cardTop });
    console.log('✅ handlePinClick: Card position state updated');

    // Show card immediately
    setCardVisible(true);
    console.log('✅ handlePinClick: Card visibility state set to true');

    // Check if listing already has images (e.g., from filteredListings)
    // If so, use it directly instead of fetching from database
    let detailedListing;
    if (listing.images && listing.images.length > 0) {
      console.log('✅ handlePinClick: Listing already has images, using existing data:', {
        id: listing.id,
        imageCount: listing.images.length
      });
      detailedListing = listing;
    } else {
      console.log('🔍 handlePinClick: Listing has no images, fetching from database...');
      detailedListing = await fetchDetailedListingData(listing.id);
    }

    if (detailedListing && detailedListing.images && detailedListing.images.length > 0) {
      console.log('✅ handlePinClick: Setting detailed listing to card:', detailedListing);
      setSelectedListingForCard(detailedListing);
    } else {
      console.error('❌ handlePinClick: Failed to get listing details or no images available, not showing card');
      setCardVisible(false);
    }
    console.log('✅ handlePinClick: Selected listing state updated');

    // Call parent callback
    if (onMarkerClick) {
      onMarkerClick(listing);
    }
  }, [onMarkerClick]);

  // Initialize Google Map when API is loaded
  useEffect(() => {
    const initMap = () => {
      console.log('🗺️ GoogleMap: Initializing map...', {
        mapRefExists: !!mapRef.current,
        googleMapsLoaded: !!(window.google && window.google.maps),
        simpleMode,
        hasFilteredListings: filteredListings.length > 0,
        hasListings: listings.length > 0
      });

      if (!mapRef.current || !window.google) {
        console.warn('⚠️ GoogleMap: Cannot initialize - missing mapRef or Google Maps API');
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
          console.log('🗺️ GoogleMap: Using listing coordinates for initial center:', initialCenter);
        }
      }

      // Fallback to default
      if (!initialCenter) {
        const defaultMapConfig = getBoroughMapConfig('default');
        initialCenter = defaultMapConfig.center;
        initialZoomLevel = defaultMapConfig.zoom;
        console.log('🗺️ GoogleMap: Using default center');
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
      setMapLoaded(true);
      console.log('✅ GoogleMap: Map initialized successfully with zoom controls enabled');
    };

    // Wait for Google Maps API to load
    if (window.google && window.google.maps) {
      console.log('✅ GoogleMap: Google Maps API already loaded, initializing...');
      initMap();
    } else {
      console.log('⏳ GoogleMap: Waiting for Google Maps API to load...');
      window.addEventListener('google-maps-loaded', initMap);
      return () => window.removeEventListener('google-maps-loaded', initMap);
    }
  }, [filteredListings, listings, simpleMode, initialZoom]);

  // Update markers when listings change
  useEffect(() => {
    if (!mapLoaded || !googleMapRef.current) {
      if (import.meta.env.DEV) {
        console.warn('⚠️ GoogleMap: Skipping marker update - map not ready');
      }
      return;
    }

    // Performance optimization: Prevent duplicate marker updates
    const markerSignature = `${listings.map(l => l.id).join(',')}-${filteredListings.map(l => l.id).join(',')}-${showAllListings}`;
    if (lastMarkersUpdateRef.current === markerSignature) {
      if (import.meta.env.DEV) {
        console.log('⏭️ GoogleMap: Skipping duplicate marker update - same listings');
      }
      return;
    }

    lastMarkersUpdateRef.current = markerSignature;

    // Defer marker creation to next frame to prevent blocking render
    function createMarkers() {
      if (import.meta.env.DEV) {
        console.log('🗺️ GoogleMap: Markers update triggered', {
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
      console.log('🗺️ GoogleMap: Cleared existing markers');

      const map = googleMapRef.current;
      const bounds = new window.google.maps.LatLngBounds();
      let hasValidMarkers = false;

      // Create markers for filtered listings (simple or purple depending on mode)
      if (filteredListings && filteredListings.length > 0) {
        console.log(`🗺️ GoogleMap: Starting ${simpleMode ? 'simple' : 'purple'} marker creation for filtered listings:`, filteredListings.length);
        console.log('🗺️ GoogleMap: First 3 filtered listings:', filteredListings.slice(0, 3).map(l => ({
          id: l.id,
          title: l.title,
          coordinates: l.coordinates,
          hasCoordinates: !!(l.coordinates?.lat && l.coordinates?.lng)
        })));

        let markersCreated = 0;
        let skippedNoCoordinates = 0;
        let skippedInvalidCoordinates = [];

        filteredListings.forEach((listing, index) => {
          console.log(`🗺️ GoogleMap: [${index + 1}/${filteredListings.length}] Processing filtered listing:`, {
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
            console.error(`❌ GoogleMap: Skipping filtered listing ${listing.id} - Missing or invalid coordinates:`, {
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

          console.log(`✅ GoogleMap: Creating ${simpleMode ? 'simple' : 'purple'} marker for listing ${listing.id}:`, {
            position,
            price: listing.price?.starting || listing['Starting nightly price'],
            title: listing.title,
            simpleMode
          });

          // Create marker based on mode
          const marker = simpleMode
            ? createSimpleMarker(map, position, listing)
            : createPriceMarker(
                map,
                position,
                listing.price?.starting || listing['Starting nightly price'] || 0,
                COLORS.SECONDARY, // Purple
                listing
              );

          markersRef.current.push(marker);
          bounds.extend(position);
          hasValidMarkers = true;
          markersCreated++;

          console.log(`✅ GoogleMap: ${simpleMode ? 'Simple' : 'Purple'} marker created successfully for ${listing.id}, total markers so far: ${markersRef.current.length}`);
        });

        console.log(`📊 GoogleMap: ${simpleMode ? 'Simple' : 'Purple'} marker creation summary:`, {
          totalFiltered: filteredListings.length,
          markersCreated: markersCreated,
          skippedNoCoordinates,
          skippedInvalidCoordinates: skippedInvalidCoordinates.length,
          invalidListings: skippedInvalidCoordinates
        });
      } else {
        console.log('⚠️ GoogleMap: No filtered listings to create purple markers for');
      }

      // Create markers for all listings (green) - background context
      if (showAllListings && listings && listings.length > 0) {
        console.log('🗺️ GoogleMap: Starting green marker creation for all listings (background layer):', listings.length);
        console.log('🗺️ GoogleMap: First 3 all listings:', listings.slice(0, 3).map(l => ({
          id: l.id,
          title: l.title,
          coordinates: l.coordinates,
          hasCoordinates: !!(l.coordinates?.lat && l.coordinates?.lng)
        })));

        let greenMarkersCreated = 0;
        let skippedAlreadyFiltered = 0;
        let skippedNoCoordinates = 0;
        let skippedInvalidCoordinates = [];

        listings.forEach((listing, index) => {
          // Skip if already shown as filtered listing
          const isFiltered = filteredListings?.some(fl => fl.id === listing.id);
          if (isFiltered) {
            console.log(`⏭️ GoogleMap: [${index + 1}/${listings.length}] Skipping ${listing.id} - Already shown as purple marker`);
            skippedAlreadyFiltered++;
            return;
          }

          console.log(`🗺️ GoogleMap: [${index + 1}/${listings.length}] Processing all listing:`, {
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
            console.error(`❌ GoogleMap: Skipping all listing ${listing.id} - Missing or invalid coordinates:`, {
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

          console.log(`✅ GoogleMap: Creating green marker for listing ${listing.id}:`, {
            position,
            price: listing.price?.starting || listing['Starting nightly price'],
            title: listing.title
          });

          // Create green marker for all listings
          const marker = createPriceMarker(
            map,
            position,
            listing.price?.starting || listing['Starting nightly price'] || 0,
            COLORS.SUCCESS, // Green
            listing
          );

          markersRef.current.push(marker);
          bounds.extend(position);
          hasValidMarkers = true;
          greenMarkersCreated++;

          console.log(`✅ GoogleMap: Green marker created successfully for ${listing.id}, total markers so far: ${markersRef.current.length}`);
        });

        console.log('📊 GoogleMap: Green marker creation summary:', {
          totalAllListings: listings.length,
          markersCreated: greenMarkersCreated,
          skippedAlreadyFiltered,
          skippedNoCoordinates,
          skippedInvalidCoordinates: skippedInvalidCoordinates.length,
          invalidListings: skippedInvalidCoordinates
        });
      } else {
        console.log('⚠️ GoogleMap: No all listings to create green markers for (showAllListings:', showAllListings, ', listings.length:', listings?.length, ')');
      }

      // Fit map to show all markers
      if (hasValidMarkers) {
        if (import.meta.env.DEV) {
          console.log('✅ GoogleMap: Fitting bounds to markers', {
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
          console.log('🗺️ GoogleMap: Simple mode - Skipping auto-center, parent will call zoomToListing');
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
        console.warn('⚠️ GoogleMap: No valid markers to display');
      }
    }

    // Render markers immediately without lazy loading
    createMarkers();
  }, [listings, filteredListings, mapLoaded, showAllListings]);

  // Recenter map when borough changes
  useEffect(() => {
    if (!mapLoaded || !googleMapRef.current || !selectedBorough) return;

    console.log('🗺️ GoogleMap: Borough changed, recentering map:', selectedBorough);

    const boroughConfig = getBoroughMapConfig(selectedBorough);
    const map = googleMapRef.current;

    // Smoothly pan to new borough center
    map.panTo(boroughConfig.center);
    map.setZoom(boroughConfig.zoom);

    console.log(`✅ GoogleMap: Map recentered to ${boroughConfig.name}`);
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

    console.log('✅ GoogleMap: Simple marker created successfully for listing:', {
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
        z-index: ${color === '#31135D' ? '1002' : '1001'};
        will-change: transform;
        pointer-events: auto;
      `;

      // HOVER EFFECTS TEMPORARILY REMOVED TO ISOLATE BUNCHING BUG
      // TODO: Re-implement hover effects after fixing positioning bug
      // Previous implementation was overwriting transform position from draw()

      // Use React callback for proper state management
      priceTag.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent event from bubbling to map container
        handlePinClick(listing, priceTag);
      });

      this.div = priceTag;
      const panes = this.getPanes();
      // Use overlayMouseTarget pane for clickable overlays (sits above map tiles)
      panes.overlayMouseTarget.appendChild(priceTag);
    };

    markerOverlay.draw = function() {
      if (!this.div) return;

      // Immediate rendering without RAF - no lazy loading
      const projection = this.getProjection();
      if (!projection) return;

      const position = projection.fromLatLngToDivPixel(
        new window.google.maps.LatLng(coordinates.lat, coordinates.lng)
      );

      if (this.div) {
        // Use transform3d for GPU acceleration
        this.div.style.transform = `translate3d(${position.x}px, ${position.y}px, 0) translate(-50%, -50%)`;
      }
    };

    markerOverlay.onRemove = function() {
      if (this.div) {
        this.div.parentNode.removeChild(this.div);
        this.div = null;
      }
    };

    markerOverlay.setMap(map);
    markerOverlay.listingId = listing.id;

    return markerOverlay;
  };

  /**
   * MapLegend - Shows marker color meanings and toggle
   */
  const MapLegend = () => (
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
            style={{ backgroundColor: COLORS.SUCCESS }}
          ></span>
          <span>All Active Listings</span>
        </div>
      </div>
      <label className="legend-toggle">
        <input
          type="checkbox"
          checked={showAllListings}
          onChange={(e) => setShowAllListings(e.target.checked)}
        />
        <span>Show all listings</span>
      </label>
    </div>
  );

  /**
   * AIResearchButton - Button to trigger AI Research Report signup
   */
  const AIResearchButton = () => {
    if (simpleMode || !onAIResearchClick) return null;

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
          fill="currentColor"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
        </svg>
        <span>Generate Market Report</span>
      </button>
    );
  };

  // Close card when clicking on map
  const handleMapClick = () => {
    console.log('🗺️ handleMapClick: Map clicked, closing card');
    setCardVisible(false);
    setSelectedListingForCard(null);
  };

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
      {mapLoaded && !simpleMode && <MapLegend />}
      {mapLoaded && !simpleMode && <AIResearchButton />}
      {!mapLoaded && (
        <div className="map-loading">
          <div className="spinner"></div>
          <p>Loading map...</p>
        </div>
      )}

      {/* Listing Card Overlay - Only in normal mode, not in simple mode */}
      {(() => {
        console.log('🎨 Rendering card overlay - State check:', {
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
          {!isLoadingListingDetails && selectedListingForCard && (
            <ListingCardForMap
              listing={selectedListingForCard}
              onClose={() => {
                setCardVisible(false);
                setSelectedListingForCard(null);
              }}
              isVisible={cardVisible}
              position={cardPosition}
            />
          )}
        </>
      )}
    </div>
  );
});

GoogleMap.displayName = 'GoogleMap';

export default GoogleMap;
