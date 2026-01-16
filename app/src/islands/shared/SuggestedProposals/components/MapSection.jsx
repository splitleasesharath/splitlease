/**
 * MapSection
 *
 * Displays property location using Google Maps Static API.
 * Falls back to a placeholder if no API key or coordinates.
 */

/**
 * @param {Object} props
 * @param {Object} props.geoPoint - { lat, lng } coordinates
 * @param {string} props.address - Address string for display (already extracted, not raw JSONB)
 * @param {string} [props.googleMapsApiKey] - Google Maps API key
 */
export default function MapSection({
  geoPoint,
  address,
  googleMapsApiKey
}) {
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

  // Generate OpenStreetMap embed URL as fallback (no API key needed)
  const getOsmEmbedUrl = () => {
    if (!hasCoordinates) return null;
    const { lat, lng } = geoPoint;
    // Use OpenStreetMap embed with marker
    return `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.01},${lat - 0.01},${lng + 0.01},${lat + 0.01}&layer=mapnik&marker=${lat},${lng}`;
  };

  const mapUrl = getMapUrl();
  const osmUrl = getOsmEmbedUrl();

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
          // Fallback to OpenStreetMap iframe when no Google API key
          <iframe
            title="Property location map"
            src={osmUrl}
            className="sp-map-iframe"
            style={{ border: 0, width: '100%', height: '200px', borderRadius: '8px' }}
          />
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
