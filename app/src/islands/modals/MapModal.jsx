/**
 * MapModal Component - COMPLETE IMPLEMENTATION
 *
 * Shows Google Map with listing location marker
 * Based on: DESIGN-FINAL-ASSIMILATION.md lines 221-278
 *
 * Features:
 * - Google Maps integration with marker
 * - Zoom controls and street view
 * - Error handling for API failures
 * - Loading state during map initialization
 * - Responsive design
 * - "Open in Google Maps" link
 */

import { useState, useCallback } from 'react';
import { GoogleMap, Marker, useLoadScript } from '@react-google-maps/api';

const mapContainerStyle = {
  width: '100%',
  height: '500px'
};

const defaultCenter = {
  lat: 40.7128, // NYC default
  lng: -74.0060
};

const mapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: true,
  mapTypeControl: false,
  fullscreenControl: true,
  styles: [
    // Optional: Custom map styling for brand consistency
    {
      featureType: 'poi',
      elementType: 'labels',
      stylers: [{ visibility: 'off' }]
    }
  ]
};

export default function MapModal({ listing, address, onClose }) {
  const [map, setMap] = useState(null);

  // Load Google Maps script
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: ['places'] // For future address autocomplete
  });

  // Parse address to coordinates
  // In production, listing should have coordinates stored
  const center = listing?.['Location - Coordinates']
    ? {
        lat: listing['Location - Coordinates'].lat,
        lng: listing['Location - Coordinates'].lng
      }
    : defaultCenter;

  const onLoad = useCallback((map) => {
    setMap(map);
    // Auto-center on marker
    const bounds = new window.google.maps.LatLngBounds();
    bounds.extend(center);
    map.fitBounds(bounds);
    map.setZoom(15); // Optimal zoom for neighborhood view
  }, [center]);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  // Error handling
  if (loadError) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto" onClick={onClose}>
        <div className="flex items-center justify-center min-h-screen px-4">
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75" />
          <div className="bg-white rounded-lg p-6 max-w-md relative z-10" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-red-600 mb-3">
              Map Failed to Load
            </h3>
            <p className="text-gray-600 mb-4">
              Unable to load Google Maps. Please check your internet connection or try again later.
            </p>
            <div className="bg-gray-100 p-3 rounded text-sm text-gray-700">
              <strong>Address:</strong><br />
              {address || listing?.['Location - Address']}
            </div>
            <button
              onClick={onClose}
              className="mt-4 w-full px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (!isLoaded) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto" onClick={onClose}>
        <div className="flex items-center justify-center min-h-screen px-4">
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75" />
          <div className="bg-white rounded-lg p-6 max-w-3xl w-full relative z-10" onClick={(e) => e.stopPropagation()}>
            <div className="h-[500px] bg-gray-100 rounded flex items-center justify-center">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-4 border-purple-600 mb-3"></div>
                <p className="text-gray-600">Loading map...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" onClick={onClose}>
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />

        <div
          className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-white px-4 pt-5 pb-3 border-b border-gray-200">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {listing?.Name || 'Listing Location'}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {listing?.['Location - Hood']}, {listing?.['Location - Borough']}
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Map */}
          <div className="bg-white px-4 pb-4">
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={center}
              zoom={15}
              options={mapOptions}
              onLoad={onLoad}
              onUnmount={onUnmount}
            >
              {/* Marker for listing location */}
              <Marker
                position={center}
                title={listing?.Name}
                animation={window.google?.maps?.Animation?.DROP}
              />
            </GoogleMap>

            {/* Address Display */}
            <div className="mt-3 p-3 bg-gray-50 rounded text-sm text-gray-700">
              <strong>Full Address:</strong><br />
              {address || listing?.['Location - Address'] || 'Address not available'}
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              onClick={onClose}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-purple-600 text-base font-medium text-white hover:bg-purple-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm"
            >
              Close
            </button>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address || listing?.['Location - Address'] || '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:w-auto sm:text-sm"
            >
              Open in Google Maps
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
