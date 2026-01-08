/**
 * Map Utility Functions
 * Helper functions for Google Maps integration
 *
 * Usage:
 *   import { fitBoundsToMarkers, calculateMapCenter } from './mapUtils.js';
 */

import { getBoroughMapConfig } from './constants.js';

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const MAP_DEFAULTS = Object.freeze({
  MAX_ZOOM: 16,
  GOOGLE_MAPS_LOAD_TIMEOUT_MS: 10000,
  MARKER_SCALE: 10,
  MARKER_FILL_OPACITY: 0.8,
  MARKER_STROKE_COLOR: '#ffffff',
  MARKER_STROKE_WEIGHT: 2
})

const COORDINATE_LIMITS = Object.freeze({
  LAT_MIN: -90,
  LAT_MAX: 90,
  LNG_MIN: -180,
  LNG_MAX: 180
})

const LABEL_DEFAULTS = Object.freeze({
  COLOR: '#ffffff',
  FONT_SIZE: '12px',
  FONT_WEIGHT: 'bold'
})

const GOOGLE_MAPS_LOADED_EVENT = 'google-maps-loaded'

// ─────────────────────────────────────────────────────────────
// Validation Predicates (Pure Functions)
// ─────────────────────────────────────────────────────────────

/**
 * Check if value is truthy
 * @pure
 */
const isTruthy = (value) => Boolean(value)

/**
 * Check if array is non-empty
 * @pure
 */
const hasElements = (arr) => Array.isArray(arr) && arr.length > 0

/**
 * Check if number is valid (not NaN)
 * @pure
 */
const isValidNumber = (value) =>
  typeof value === 'number' && !isNaN(value)

/**
 * Check if latitude is in valid range
 * @pure
 */
const isLatitudeInRange = (lat) =>
  lat >= COORDINATE_LIMITS.LAT_MIN && lat <= COORDINATE_LIMITS.LAT_MAX

/**
 * Check if longitude is in valid range
 * @pure
 */
const isLongitudeInRange = (lng) =>
  lng >= COORDINATE_LIMITS.LNG_MIN && lng <= COORDINATE_LIMITS.LNG_MAX

// ─────────────────────────────────────────────────────────────
// Pure Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Extract listings with valid coordinates
 * @pure
 */
const filterValidCoordinateListings = (listings) =>
  listings.filter(l =>
    l.coordinates && l.coordinates.lat && l.coordinates.lng
  )

/**
 * Calculate sum of coordinates
 * @pure
 */
const sumCoordinates = (listings) =>
  listings.reduce(
    (acc, listing) => ({
      lat: acc.lat + listing.coordinates.lat,
      lng: acc.lng + listing.coordinates.lng
    }),
    { lat: 0, lng: 0 }
  )

/**
 * Calculate average coordinates
 * @pure
 */
const averageCoordinates = (sum, count) =>
  Object.freeze({
    lat: sum.lat / count,
    lng: sum.lng / count
  })

// ─────────────────────────────────────────────────────────────
// Map Functions
// ─────────────────────────────────────────────────────────────

/**
 * Fit map bounds to show all markers
 * @effectful - modifies map state
 * @param {google.maps.Map} map - The map instance
 * @param {Array<google.maps.Marker>} markers - Array of markers
 */
export function fitBoundsToMarkers(map, markers) {
  if (!isTruthy(map) || !hasElements(markers)) return

  const bounds = new window.google.maps.LatLngBounds()
  let hasValidMarkers = false

  markers.forEach(marker => {
    if (marker.getPosition()) {
      bounds.extend(marker.getPosition())
      hasValidMarkers = true
    }
  })

  if (hasValidMarkers) {
    map.fitBounds(bounds)

    // Prevent over-zooming on single marker
    const listener = window.google.maps.event.addListener(map, 'idle', () => {
      if (map.getZoom() > MAP_DEFAULTS.MAX_ZOOM) map.setZoom(MAP_DEFAULTS.MAX_ZOOM)
      window.google.maps.event.removeListener(listener)
    })
  }
}

/**
 * Calculate center point from array of listings
 * NO FALLBACK - Returns null if no valid coordinates found
 * @pure
 * @param {Array<object>} listings - Array of listings with coordinates
 * @returns {object|null} {lat, lng} center point or null if no valid listings
 */
export function calculateMapCenter(listings) {
  if (!hasElements(listings)) {
    return null
  }

  const validListings = filterValidCoordinateListings(listings)

  if (validListings.length === 0) {
    return null
  }

  const sum = sumCoordinates(validListings)
  return averageCoordinates(sum, validListings.length)
}

/**
 * Create custom map marker icon
 * @pure
 * @param {string} color - Hex color for marker
 * @param {number} scale - Size scale (default 10)
 * @returns {object} Google Maps icon configuration
 */
export function createMarkerIcon(color, scale = MAP_DEFAULTS.MARKER_SCALE) {
  return Object.freeze({
    path: window.google.maps.SymbolPath.CIRCLE,
    fillColor: color,
    fillOpacity: MAP_DEFAULTS.MARKER_FILL_OPACITY,
    strokeColor: MAP_DEFAULTS.MARKER_STROKE_COLOR,
    strokeWeight: MAP_DEFAULTS.MARKER_STROKE_WEIGHT,
    scale: scale
  })
}

/**
 * Create price label for marker
 * @pure
 * @param {number} price - Price to display
 * @returns {object} Google Maps label configuration
 */
export function createPriceLabel(price) {
  return Object.freeze({
    text: `$${Math.round(price)}`,
    color: LABEL_DEFAULTS.COLOR,
    fontSize: LABEL_DEFAULTS.FONT_SIZE,
    fontWeight: LABEL_DEFAULTS.FONT_WEIGHT
  })
}

/**
 * Validate coordinates
 * @pure
 * @param {object} coordinates - {lat, lng} object
 * @returns {boolean} True if valid
 */
export function isValidCoordinates(coordinates) {
  if (!isTruthy(coordinates)) return false

  const { lat, lng } = coordinates

  return (
    isValidNumber(lat) &&
    isValidNumber(lng) &&
    isLatitudeInRange(lat) &&
    isLongitudeInRange(lng)
  )
}

/**
 * Check if Google Maps API is loaded
 * @pure (reads global state but doesn't modify it)
 * @returns {boolean} True if loaded
 */
export function isGoogleMapsLoaded() {
  return typeof window !== 'undefined' &&
         typeof window.google !== 'undefined' &&
         typeof window.google.maps !== 'undefined'
}

/**
 * Wait for Google Maps API to load
 * @effectful - uses timers and event listeners
 * @param {number} timeout - Timeout in milliseconds (default 10000)
 * @returns {Promise<boolean>} Resolves true when loaded, false on timeout
 */
export function waitForGoogleMaps(timeout = MAP_DEFAULTS.GOOGLE_MAPS_LOAD_TIMEOUT_MS) {
  return new Promise((resolve) => {
    if (isGoogleMapsLoaded()) {
      resolve(true)
      return
    }

    let timeoutId

    const handleLoad = () => {
      clearTimeout(timeoutId)
      window.removeEventListener(GOOGLE_MAPS_LOADED_EVENT, handleLoad)
      resolve(true)
    }

    window.addEventListener(GOOGLE_MAPS_LOADED_EVENT, handleLoad)

    timeoutId = setTimeout(() => {
      window.removeEventListener(GOOGLE_MAPS_LOADED_EVENT, handleLoad)
      resolve(false)
    }, timeout)
  })
}

// ─────────────────────────────────────────────────────────────
// Exported Constants (for testing)
// ─────────────────────────────────────────────────────────────
export {
  MAP_DEFAULTS,
  COORDINATE_LIMITS,
  LABEL_DEFAULTS,
  GOOGLE_MAPS_LOADED_EVENT
}
