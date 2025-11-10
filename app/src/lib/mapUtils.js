/**
 * Map Utility Functions
 * Helper functions for Google Maps integration
 *
 * Usage:
 *   import { fitBoundsToMarkers, calculateMapCenter } from './mapUtils.js';
 */

import { DEFAULTS } from './constants.js';

/**
 * Fit map bounds to show all markers
 * @param {google.maps.Map} map - The map instance
 * @param {Array<google.maps.Marker>} markers - Array of markers
 */
export function fitBoundsToMarkers(map, markers) {
  if (!map || !markers || markers.length === 0) return;

  const bounds = new window.google.maps.LatLngBounds();
  let hasValidMarkers = false;

  markers.forEach(marker => {
    if (marker.getPosition()) {
      bounds.extend(marker.getPosition());
      hasValidMarkers = true;
    }
  });

  if (hasValidMarkers) {
    map.fitBounds(bounds);

    // Prevent over-zooming on single marker
    const listener = window.google.maps.event.addListener(map, 'idle', () => {
      if (map.getZoom() > 16) map.setZoom(16);
      window.google.maps.event.removeListener(listener);
    });
  }
}

/**
 * Calculate center point from array of listings
 * @param {Array<object>} listings - Array of listings with coordinates
 * @returns {object} {lat, lng} center point
 */
export function calculateMapCenter(listings) {
  if (!listings || listings.length === 0) {
    return {
      lat: DEFAULTS.NYC_CENTER_LAT,
      lng: DEFAULTS.NYC_CENTER_LNG
    };
  }

  const validListings = listings.filter(l =>
    l.coordinates && l.coordinates.lat && l.coordinates.lng
  );

  if (validListings.length === 0) {
    return {
      lat: DEFAULTS.NYC_CENTER_LAT,
      lng: DEFAULTS.NYC_CENTER_LNG
    };
  }

  const sum = validListings.reduce(
    (acc, listing) => ({
      lat: acc.lat + listing.coordinates.lat,
      lng: acc.lng + listing.coordinates.lng
    }),
    { lat: 0, lng: 0 }
  );

  return {
    lat: sum.lat / validListings.length,
    lng: sum.lng / validListings.length
  };
}

/**
 * Create custom map marker icon
 * @param {string} color - Hex color for marker
 * @param {number} scale - Size scale (default 10)
 * @returns {object} Google Maps icon configuration
 */
export function createMarkerIcon(color, scale = 10) {
  return {
    path: window.google.maps.SymbolPath.CIRCLE,
    fillColor: color,
    fillOpacity: 0.8,
    strokeColor: '#ffffff',
    strokeWeight: 2,
    scale: scale
  };
}

/**
 * Create price label for marker
 * @param {number} price - Price to display
 * @returns {object} Google Maps label configuration
 */
export function createPriceLabel(price) {
  return {
    text: `$${Math.round(price)}`,
    color: '#ffffff',
    fontSize: '12px',
    fontWeight: 'bold'
  };
}

/**
 * Validate coordinates
 * @param {object} coordinates - {lat, lng} object
 * @returns {boolean} True if valid
 */
export function isValidCoordinates(coordinates) {
  if (!coordinates) return false;

  const { lat, lng } = coordinates;

  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    !isNaN(lat) &&
    !isNaN(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/**
 * Check if Google Maps API is loaded
 * @returns {boolean} True if loaded
 */
export function isGoogleMapsLoaded() {
  return typeof window !== 'undefined' &&
         typeof window.google !== 'undefined' &&
         typeof window.google.maps !== 'undefined';
}

/**
 * Wait for Google Maps API to load
 * @param {number} timeout - Timeout in milliseconds (default 10000)
 * @returns {Promise<boolean>} Resolves true when loaded, false on timeout
 */
export function waitForGoogleMaps(timeout = 10000) {
  return new Promise((resolve) => {
    if (isGoogleMapsLoaded()) {
      resolve(true);
      return;
    }

    let timeoutId;

    const handleLoad = () => {
      clearTimeout(timeoutId);
      window.removeEventListener('google-maps-loaded', handleLoad);
      resolve(true);
    };

    window.addEventListener('google-maps-loaded', handleLoad);

    timeoutId = setTimeout(() => {
      window.removeEventListener('google-maps-loaded', handleLoad);
      resolve(false);
    }, timeout);
  });
}
