/**
 * AmenityIcons
 *
 * Displays property amenities: bedrooms, bathrooms, beds, guests, space type.
 * Uses native Supabase field names.
 */

/**
 * Map space type ID to display label
 * 'Features - Type of Space' stores FK IDs to reference_table.zat_features_listingtype
 */
const SPACE_TYPE_ID_TO_LABEL = {
  '1569530159044x216130979074711000': 'Private Room',
  '1569530331984x152755544104023800': 'Entire Place',
  '1585742011301x719941865479153400': 'Shared Room',
  '1588063597111x228486447854442800': 'All Spaces',
};

/**
 * @param {Object} props
 * @param {Object} props.listing - Listing object with amenity fields
 */
export default function AmenityIcons({ listing = {} }) {
  const bedrooms = listing['Features - Qty Bedrooms'] || 0;
  const bathrooms = listing['Features - Qty Bathrooms'] || 0;
  const beds = listing['Features - Qty Beds'] || 0;
  const guests = listing['Features - Qty Guests'] || 0;

  // Resolve space type ID to display label
  // IDs look like '1569530331984x152755544104023800' - if we can't map it, use a generic fallback
  const spaceTypeId = listing['Features - Type of Space'];
  const isValidSpaceTypeLabel = spaceTypeId && !spaceTypeId.includes('x') && spaceTypeId.length < 20;
  const spaceType = SPACE_TYPE_ID_TO_LABEL[spaceTypeId]
    || (isValidSpaceTypeLabel ? spaceTypeId : null)
    || 'Space';

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
