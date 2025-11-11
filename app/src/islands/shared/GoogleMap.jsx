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

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { DEFAULTS, COLORS, getBoroughMapConfig } from '../../lib/constants.js';

const GoogleMap = forwardRef(({
  listings = [],           // All listings to show as green markers
  filteredListings = [],   // Filtered subset to show as purple markers
  selectedListing = null,  // Currently selected/highlighted listing
  onMarkerClick = null,    // Callback when marker clicked: (listing) => void
  selectedBorough = null   // Current borough filter for map centering
}, ref) => {
  const mapRef = useRef(null);
  const googleMapRef = useRef(null);
  const markersRef = useRef([]);
  const infoWindowRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [showAllListings, setShowAllListings] = useState(true);
  const lastMarkersUpdateRef = useRef(null); // Track last marker update to prevent duplicates

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

      // Smooth pan and zoom
      map.setZoom(zoomLevel);
      map.panTo({ lat: coords.lat, lng: coords.lng });

      // Find and highlight the marker
      const marker = markersRef.current.find(m => m.listingId === listingId);
      if (marker && marker.div) {
        // Add pulse animation class
        marker.div.classList.add('pulse');
        setTimeout(() => {
          marker.div.classList.remove('pulse');
        }, 3000);
      }

      // Show info window after pan completes
      setTimeout(() => {
        if (!infoWindowRef.current) {
          infoWindowRef.current = new window.google.maps.InfoWindow();
        }

        infoWindowRef.current.setContent(createInfoWindowContent(listing));
        infoWindowRef.current.setPosition({ lat: coords.lat, lng: coords.lng });
        infoWindowRef.current.open(map);
      }, 600);
    }
  }));

  // Initialize Google Map when API is loaded
  useEffect(() => {
    const initMap = () => {
      console.log('🗺️ GoogleMap: Initializing map...', {
        mapRefExists: !!mapRef.current,
        googleMapsLoaded: !!(window.google && window.google.maps)
      });

      if (!mapRef.current || !window.google) {
        console.warn('⚠️ GoogleMap: Cannot initialize - missing mapRef or Google Maps API');
        return;
      }

      // Create map instance
      const map = new window.google.maps.Map(mapRef.current, {
        center: {
          lat: DEFAULTS.NYC_CENTER_LAT,
          lng: DEFAULTS.NYC_CENTER_LNG
        },
        zoom: DEFAULTS.MAP_DEFAULT_ZOOM,
        mapTypeControl: true,
        streetViewControl: true,
        fullscreenControl: true,
        zoomControl: true,
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
      console.log('✅ GoogleMap: Map initialized successfully');
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
  }, []);

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

    // Create markers for filtered listings (purple) - these are primary
    if (filteredListings && filteredListings.length > 0) {
      if (import.meta.env.DEV) {
        console.log('🗺️ GoogleMap: Creating purple markers for filtered listings:', filteredListings.length);
      }
      filteredListings.forEach(listing => {
        if (!listing.coordinates || !listing.coordinates.lat || !listing.coordinates.lng) {
          return;
        }

        const position = {
          lat: listing.coordinates.lat,
          lng: listing.coordinates.lng
        };

        // Create purple marker for filtered listings
        const marker = createPriceMarker(
          map,
          position,
          listing.price?.starting || listing['Starting nightly price'] || 0,
          COLORS.SECONDARY, // Purple
          listing
        );

        markersRef.current.push(marker);
        bounds.extend(position);
        hasValidMarkers = true;
      });
    }

    // Create markers for all listings (green) - background context
    if (showAllListings && listings && listings.length > 0) {
      if (import.meta.env.DEV) {
        console.log('🗺️ GoogleMap: Creating green markers for all listings (background layer):', listings.length);
      }
      let greenMarkersCreated = 0;
      listings.forEach(listing => {
        // Skip if already shown as filtered listing
        const isFiltered = filteredListings?.some(fl => fl.id === listing.id);
        if (isFiltered) return;

        if (!listing.coordinates || !listing.coordinates.lat || !listing.coordinates.lng) {
          return;
        }

        const position = {
          lat: listing.coordinates.lat,
          lng: listing.coordinates.lng
        };

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
      });

      if (import.meta.env.DEV) {
        console.log(`✅ GoogleMap: Created ${greenMarkersCreated} green markers (skipped ${listings.length - greenMarkersCreated} already shown as purple)`);
      }
    }

    // Fit map to show all markers
    if (hasValidMarkers) {
      if (import.meta.env.DEV) {
        console.log('✅ GoogleMap: Fitting bounds to markers', {
          markerCount: markersRef.current.length,
          bounds: bounds.toString()
        });
      }
      map.fitBounds(bounds);

      // Prevent over-zooming on single marker
      const listener = window.google.maps.event.addListener(map, 'idle', () => {
        if (map.getZoom() > 16) map.setZoom(16);
        window.google.maps.event.removeListener(listener);
      });
    } else {
      console.warn('⚠️ GoogleMap: No valid markers to display');
    }
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
   * Create a custom price label marker using OverlayView
   * PORTED FROM: input/search/js/app.js lines 1538-1635
   * @param {google.maps.Map} map - The map instance
   * @param {object} coordinates - {lat, lng} coordinates
   * @param {number} price - Price to display
   * @param {string} color - Marker color (hex: #00C851 green or #31135D purple)
   * @param {object} listing - Full listing data
   * @returns {google.maps.OverlayView} The created overlay marker
   */
  const createPriceMarker = (map, coordinates, price, color, listing) => {
    const hoverColor = color === '#00C851' ? '#00A040' : '#522580';

    const markerOverlay = new window.google.maps.OverlayView();

    markerOverlay.onAdd = function() {
      const priceTag = document.createElement('div');
      priceTag.innerHTML = `$${parseFloat(price).toFixed(2)}`;
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
        z-index: ${color === '#31135D' ? '2' : '1'};
      `;

      priceTag.addEventListener('mouseenter', () => {
        priceTag.style.background = hoverColor;
        priceTag.style.transition = 'background-color 0.2s ease, transform 0.2s ease';
        priceTag.style.transform = 'translate(-50%, -50%) scale(1.1)';
        priceTag.style.zIndex = '10';
      });

      priceTag.addEventListener('mouseleave', () => {
        priceTag.style.background = color;
        priceTag.style.transform = 'translate(-50%, -50%) scale(1)';
        priceTag.style.zIndex = color === '#31135D' ? '2' : '1';
        setTimeout(() => {
          priceTag.style.transition = 'background-color 0.2s ease';
        }, 200);
      });

      const infoWindow = new window.google.maps.InfoWindow({
        content: createInfoWindowContent(listing)
      });

      priceTag.addEventListener('click', () => {
        // Close all other info windows
        markersRef.current.forEach(m => {
          if (m.infoWindow) m.infoWindow.close();
        });

        infoWindow.open(map);
        infoWindow.setPosition(coordinates);

        // Call parent callback
        if (onMarkerClick) {
          onMarkerClick(listing);
        }
      });

      // Store info window reference
      markerOverlay.infoWindow = infoWindow;

      this.div = priceTag;
      const panes = this.getPanes();
      panes.overlayLayer.appendChild(priceTag);
    };

    markerOverlay.draw = function() {
      const projection = this.getProjection();
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
   * Create HTML content for info window
   * @param {object} listing - Listing data
   * @returns {string} HTML string
   */
  const createInfoWindowContent = (listing) => {
    const price = listing.price?.starting || listing['Starting nightly price'] || 0;
    const firstImage = listing.images && listing.images.length > 0
      ? listing.images[0]
      : null; // No image available

    const imageHTML = firstImage
      ? `<img
          src="${firstImage}"
          alt="${listing.title}"
          style="width: 100%; height: 150px; object-fit: cover; border-radius: 8px; margin-bottom: 8px;"
        />`
      : `<div style="width: 100%; height: 150px; background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%); border-radius: 8px; margin-bottom: 8px; display: flex; align-items: center; justify-content: center; color: #9ca3af; font-size: 14px; font-weight: 500;">
          No Photo Available
        </div>`;

    return `
      <div style="max-width: 250px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
        ${imageHTML}
        <h3 style="margin: 0 0 4px 0; font-size: 16px; font-weight: 600; color: #1a202c;">
          ${listing.title}
        </h3>
        <p style="margin: 0 0 8px 0; font-size: 14px; color: #718096;">
          ${listing.location}
        </p>
        <p style="margin: 0 0 8px 0; font-size: 14px; color: #4a5568;">
          ${listing.type} • ${listing.bedrooms} bed • ${listing.bathrooms} bath
        </p>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 12px;">
          <div>
            <div style="font-size: 12px; color: #718096;">Starting at</div>
            <div style="font-size: 18px; font-weight: 700; color: ${COLORS.PRIMARY};">
              $${price.toFixed(2)}/night
            </div>
          </div>
          <a
            href="/view-split-lease/${listing.id}"
            target="_blank"
            style="padding: 8px 16px; background: ${COLORS.PRIMARY}; color: white; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 600;"
          >
            View Details
          </a>
        </div>
      </div>
    `;
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

  return (
    <div className="google-map-container">
      <div
        ref={mapRef}
        className="google-map"
        style={{
          width: '100%',
          height: '100%',
          minHeight: '500px',
          borderRadius: '12px',
          overflow: 'hidden'
        }}
      />
      {mapLoaded && <MapLegend />}
      {!mapLoaded && (
        <div className="map-loading">
          <div className="spinner"></div>
          <p>Loading map...</p>
        </div>
      )}
    </div>
  );
});

GoogleMap.displayName = 'GoogleMap';

export default GoogleMap;
