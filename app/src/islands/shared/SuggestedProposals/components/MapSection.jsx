/**
 * MapSection
 *
 * Displays property location using Google Maps Static API.
 * Automatically retrieves API key from window.ENV (set by config.js).
 * Falls back to styled Carto tile if no API key available.
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
  // Get Google Maps API key from window.ENV (set by config.js)
  const googleMapsApiKey = typeof window !== 'undefined'
    ? window.ENV?.GOOGLE_MAPS_API_KEY
    : null;

  // Check if we have valid coordinates
  const hasCoordinates = geoPoint && typeof geoPoint.lat === 'number' && typeof geoPoint.lng === 'number';

  // Generate static map URL using Google Maps Static API
  const getMapUrl = () => {
    if (!hasCoordinates || !googleMapsApiKey) return null;

    const { lat, lng } = geoPoint;
    const params = new URLSearchParams({
      center: `${lat},${lng}`,
      zoom: '15',
      size: '400x200',
      scale: '2',
      maptype: 'roadmap',
      markers: `color:purple|${lat},${lng}`,
      key: googleMapsApiKey
    });

    return `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;
  };

  // Generate Carto Positron tile URL as fallback (no API key needed, modern styled tiles)
  const getCartoTileUrl = () => {
    if (!hasCoordinates) return null;
    const { lat, lng } = geoPoint;
    const zoom = 15;
    // Calculate tile coordinates from lat/lng at zoom level 15
    const n = Math.pow(2, zoom);
    const x = Math.floor((lng + 180) / 360 * n);
    const latRad = lat * Math.PI / 180;
    const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n);
    // Carto Positron - clean, modern light tiles (similar to Mapbox light style)
    return `https://a.basemaps.cartocdn.com/light_all/${zoom}/${x}/${y}@2x.png`;
  };

  const mapUrl = getMapUrl();
  const cartoTileUrl = getCartoTileUrl();

  return (
    <div className="sp-map-section">
      <h3 className="sp-map-title">Location</h3>

      <div className="sp-map-container">
        {mapUrl ? (
          <img
            src={mapUrl}
            alt={`Map showing ${address}`}
            className="sp-map-image"
          />
        ) : hasCoordinates ? (
          // Fallback to Carto Positron tiles when no Google API key
          // These are modern, clean styled tiles similar to Mapbox light
          <div className="sp-map-carto-wrapper">
            <img
              src={cartoTileUrl}
              alt={`Map showing ${address}`}
              className="sp-map-image"
            />
            {/* Marker overlay */}
            <div className="sp-map-marker">
              <svg width="24" height="36" viewBox="0 0 24 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 24 12 24s12-15 12-24c0-6.627-5.373-12-12-12z" fill="#5B21B6"/>
                <circle cx="12" cy="12" r="5" fill="white"/>
              </svg>
            </div>
          </div>
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
