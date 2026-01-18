import { useEffect, useRef, useState } from 'react';

/**
 * MapSection
 *
 * Displays property location using an interactive Google Map.
 * Features zoom controls, pan, and a purple marker at the property location.
 * Waits for Google Maps JavaScript API to load via the global event system.
 */

/**
 * @param {Object} props
 * @param {Object} props.geoPoint - { lat, lng } coordinates
 * @param {string} props.address - Address string for display (already extracted, not raw JSONB)
 */
export default function MapSection({
  geoPoint,
  address
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);

  // Check if we have valid coordinates
  const hasCoordinates = geoPoint && typeof geoPoint.lat === 'number' && typeof geoPoint.lng === 'number';

  // Initialize interactive Google Map
  useEffect(() => {
    if (!hasCoordinates || !mapContainerRef.current) return;

    const initMap = () => {
      // Don't reinitialize if map already exists
      if (mapInstanceRef.current) return;

      try {
        const { lat, lng } = geoPoint;

        // Create the map instance
        const map = new window.google.maps.Map(mapContainerRef.current, {
          center: { lat, lng },
          zoom: 15,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          zoomControl: true,
          zoomControlOptions: {
            position: window.google.maps.ControlPosition.RIGHT_CENTER
          },
          gestureHandling: 'cooperative', // Prevents accidental zooms, requires Ctrl+scroll
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }]
            }
          ]
        });

        // Create purple marker at property location
        const marker = new window.google.maps.Marker({
          position: { lat, lng },
          map: map,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            fillColor: '#5B21B6',
            fillOpacity: 1,
            strokeColor: '#FFFFFF',
            strokeWeight: 3,
            scale: 10
          },
          title: address || 'Property Location'
        });

        mapInstanceRef.current = map;
        markerRef.current = marker;
        setMapLoaded(true);
      } catch (error) {
        console.error('MapSection: Failed to initialize Google Map:', error);
        setMapError(true);
      }
    };

    // Check if Google Maps API is already loaded
    if (window.google && window.google.maps && window.google.maps.ControlPosition) {
      initMap();
    } else {
      // Wait for the google-maps-loaded event
      const handleMapsLoaded = () => {
        initMap();
      };
      window.addEventListener('google-maps-loaded', handleMapsLoaded);

      return () => {
        window.removeEventListener('google-maps-loaded', handleMapsLoaded);
      };
    }
  }, [hasCoordinates, geoPoint, address]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (markerRef.current) {
        markerRef.current.setMap(null);
        markerRef.current = null;
      }
      mapInstanceRef.current = null;
    };
  }, []);

  return (
    <div className="sp-map-section">
      <h3 className="sp-map-title">Location</h3>

      <div className="sp-map-container">
        {hasCoordinates && !mapError ? (
          <>
            <div
              ref={mapContainerRef}
              className="sp-map-interactive"
              style={{ width: '100%', height: '100%' }}
            />
            {!mapLoaded && (
              <div className="sp-map-loading">
                <div className="sp-map-spinner"></div>
              </div>
            )}
          </>
        ) : (
          <div className="sp-map-placeholder">
            <span className="sp-map-placeholder-icon">📍</span>
            <span className="sp-map-placeholder-text">
              {address || 'Location not available'}
            </span>
          </div>
        )}
      </div>

      {address && (
        <p className="sp-map-address">{address}</p>
      )}
    </div>
  );
}
