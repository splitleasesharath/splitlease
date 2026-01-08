/**
 * MapSection
 *
 * Displays property location using Google Maps Static API.
 * Falls back to a placeholder if no API key or coordinates.
 */

/**
 * @param {Object} props
 * @param {Object} props.geoPoint - { lat, lng } coordinates
 * @param {string} props.address - Address string for display
 * @param {string} [props.googleMapsApiKey] - Google Maps API key
 */
export default function MapSection({
  geoPoint,
  address,
  googleMapsApiKey
}) {
  // Check if we have valid coordinates
  const hasCoordinates = geoPoint && typeof geoPoint.lat === 'number' && typeof geoPoint.lng === 'number';

  // Generate static map URL
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

  const mapUrl = getMapUrl();

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
