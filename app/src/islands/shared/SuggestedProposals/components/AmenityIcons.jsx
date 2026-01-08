/**
 * AmenityIcons
 *
 * Displays property amenities: bedrooms, bathrooms, beds, guests, space type.
 * Uses native Supabase field names.
 */

/**
 * @param {Object} props
 * @param {Object} props.listing - Listing object with amenity fields
 */
export default function AmenityIcons({ listing = {} }) {
  const bedrooms = listing['Qty Bedrooms'] || 0;
  const bathrooms = listing['Qty Bathrooms'] || 0;
  const beds = listing['Qty Beds'] || 0;
  const guests = listing['Qty Guests'] || 0;
  const spaceType = listing['Type of Space'] || 'Space';

  return (
    <div className="sp-amenities">
      {/* Space type */}
      <div className="sp-amenity" title={spaceType}>
        <span className="sp-amenity-icon">🏠</span>
        <span className="sp-amenity-text">{spaceType}</span>
      </div>

      {/* Bedrooms */}
      {bedrooms > 0 && (
        <div className="sp-amenity" title={`${bedrooms} bedroom${bedrooms !== 1 ? 's' : ''}`}>
          <span className="sp-amenity-icon">🛏️</span>
          <span className="sp-amenity-text">{bedrooms} bed{bedrooms !== 1 ? 's' : ''}</span>
        </div>
      )}

      {/* Bathrooms */}
      {bathrooms > 0 && (
        <div className="sp-amenity" title={`${bathrooms} bathroom${bathrooms !== 1 ? 's' : ''}`}>
          <span className="sp-amenity-icon">🚿</span>
          <span className="sp-amenity-text">{bathrooms} bath{bathrooms !== 1 ? 's' : ''}</span>
        </div>
      )}

      {/* Max guests */}
      {guests > 0 && (
        <div className="sp-amenity" title={`Up to ${guests} guest${guests !== 1 ? 's' : ''}`}>
          <span className="sp-amenity-icon">👥</span>
          <span className="sp-amenity-text">{guests} guest{guests !== 1 ? 's' : ''}</span>
        </div>
      )}
    </div>
  );
}
